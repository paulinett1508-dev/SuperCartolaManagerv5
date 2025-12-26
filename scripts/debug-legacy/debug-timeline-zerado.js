/**
 * Debug do participante com Timeline zerado
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function debug() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;

        // Buscar o participante zerado
        const extrato = await db.collection('extratofinanceirocaches').findOne({ time_id: 3300583 });

        console.log('=== PARTICIPANTE COM TIMELINE ZERADO ===');
        console.log('time_id:', extrato.time_id);
        console.log('liga_id:', extrato.liga_id);

        const hist = extrato.historico_transacoes || [];
        console.log('Total de rodadas:', hist.length);
        console.log('Primeira rodada:', hist[0]?.rodada);
        console.log('Última rodada:', hist[hist.length - 1]?.rodada);

        console.log('\n=== TODAS AS RODADAS E SEUS VALORES ===');
        hist.forEach(h => {
            const rod = String(h.rodada).padStart(2);
            const bo = String(h.bonusOnus || 0).padStart(4);
            const pc = String(h.pontosCorridos || 0).padStart(3);
            const mm = String(h.mataMata || 0).padStart(3);
            const t10 = String(h.top10 || 0).padStart(3);
            const tipo = h.tipo || '-';
            const valor = h.valor || 0;

            console.log(`Rod ${rod} | bonusOnus: ${bo} | PC: ${pc} | MM: ${mm} | T10: ${t10} | tipo: ${tipo} | valor: ${valor}`);
        });

        // Verificar se há dados no formato legado que deveriam ser convertidos
        const temLegado = hist.some(h => h.tipo && h.valor);
        console.log('\n=== DIAGNÓSTICO ===');
        console.log('Tem dados em formato legado (tipo/valor)?', temLegado);

        // Somar valores legados para ver se deveriam estar no bonusOnus
        let somaBonusLegado = 0;
        let somaPCLegado = 0;
        hist.forEach(h => {
            if (h.tipo && h.valor) {
                if (h.tipo === 'BONUS' || h.tipo === 'ONUS' || h.tipo === 'G' || h.tipo === 'Z') {
                    somaBonusLegado += h.valor;
                } else if (h.tipo === 'PONTOS_CORRIDOS') {
                    somaPCLegado += h.valor;
                }
            }
        });

        console.log('Soma de valores legados que deveriam ir para bonusOnus:', somaBonusLegado);
        console.log('Soma de valores legados que deveriam ir para pontosCorridos:', somaPCLegado);

        // Ver se foi um problema de migração
        const time = await db.collection('times').findOne({ id: 3300583 });
        console.log('\n=== DADOS DO TIME ===');
        console.log('Time existe na collection times?', time ? 'SIM' : 'NÃO');
        if (time) {
            console.log('Nome:', time.nome_time);
            console.log('Ativo:', time.ativo);
            console.log('Rodada desistência:', time.rodada_desistencia);
        }

        // Verificar se outros participantes da mesma liga têm o mesmo problema
        const ligaId = extrato.liga_id;
        const outrosExtratos = await db.collection('extratofinanceirocaches')
            .find({ liga_id: ligaId })
            .toArray();

        console.log('\n=== COMPARAÇÃO COM OUTROS DA MESMA LIGA ===');
        outrosExtratos.forEach(e => {
            const hist = e.historico_transacoes || [];
            const temLegado = hist.some(h => h.tipo && h.valor);
            const totalBonusOnus = hist.reduce((sum, h) => sum + (h.bonusOnus || 0), 0);
            const status = totalBonusOnus === 0 ? '⚠️ ZERADO' : '✅';
            console.log(`${status} time_id: ${e.time_id} | bonusOnus total: ${totalBonusOnus} | formato legado: ${temLegado}`);
        });

        await mongoose.disconnect();
        console.log('\nDesconectado.');

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

debug();

/**
 * Verificar configuração da liga e consolidação
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        // Buscar a liga
        const ligaId = '684cb1c8af923da7c7df51de';
        const liga = await db.collection('ligas').findOne({
            _id: new mongoose.Types.ObjectId(ligaId)
        });

        console.log('=== CONFIGURAÇÃO DA LIGA ===');
        console.log('Nome:', liga?.nome);
        console.log('Módulos ativos:', JSON.stringify(liga?.modulos_ativos, null, 2));
        console.log('Banco habilitado?', liga?.modulos_ativos?.banco !== false ? 'SIM' : 'NÃO');

        // Verificar consolidacao (fonte dos G/Z)
        const consolidacoes = await db.collection('consolidacoes')
            .find({ liga_id: new mongoose.Types.ObjectId(ligaId) })
            .sort({ rodada_atual: -1 })
            .limit(1)
            .toArray();

        const consolidacao = consolidacoes[0];
        console.log('\n=== CONSOLIDAÇÃO DA LIGA ===');
        console.log('Existe?', consolidacao ? 'SIM' : 'NÃO');

        if (consolidacao) {
            console.log('Rodada atual:', consolidacao.rodada_atual);
            const ranking = consolidacao.ranking_consolidado || [];
            console.log('Total no ranking:', ranking.length);

            // Verificar se FIASCO VET FC está no ranking
            const fiasco = ranking.find(r => r.time_id === 3300583);
            console.log('\nFIASCO VET FC no ranking?', fiasco ? 'SIM' : 'NÃO');
            if (fiasco) {
                console.log('  Posição:', fiasco.posicao);
                console.log('  G (ganhos):', fiasco.g);
                console.log('  Z (zonas):', fiasco.z);
                console.log('  Pontos:', fiasco.pontos);
            }

            // Mostrar últimos 5 do ranking para comparar
            console.log('\n=== ÚLTIMOS 5 DO RANKING ===');
            ranking.slice(-5).forEach(r => {
                console.log(`  ${r.posicao}º ${(r.nome_time || 'Sem nome').substring(0, 20).padEnd(21)} | G: ${r.g || 0} | Z: ${r.z || 0}`);
            });
        }

        // Verificar o extrato do FIASCO para ver quando foi criado
        const extrato = await db.collection('extratofinanceirocaches').findOne({ time_id: 3300583 });
        console.log('\n=== EXTRATO FIASCO VET FC ===');
        console.log('Criado em:', extrato?.createdAt || extrato?.criado_em || 'N/A');
        console.log('Atualizado em:', extrato?.updatedAt || extrato?.atualizado_em || 'N/A');

        await mongoose.disconnect();
        console.log('\nDesconectado.');

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

check();

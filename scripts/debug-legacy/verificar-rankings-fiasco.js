/**
 * Verificar rankings do FIASCO VET FC nas rodadas
 * Para entender se tem dados de posição para calcular bonusOnus
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const TIME_ID = 3300583; // FIASCO VET FC
const LIGA_ID = '684cb1c8af923da7c7df51de';

async function verificar() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;

        // 1. Verificar o time na collection times
        const time = await db.collection('times').findOne({ id: TIME_ID });
        console.log('=== DADOS DO TIME ===');
        console.log('Nome:', time?.nome_time);
        console.log('Liga:', time?.liga);
        console.log('Ativo:', time?.ativo);
        console.log('Rodada entrada:', time?.rodada_entrada || time?.rodada_inscricao || 'N/A');
        console.log('Rodada desistência:', time?.rodada_desistencia || 'N/A');

        // 2. Verificar snapshots de rodadas
        console.log('\n=== POSIÇÕES NOS SNAPSHOTS ===');

        const snapshots = await db.collection('rodadasnapshots')
            .find({ liga_id: new mongoose.Types.ObjectId(LIGA_ID) })
            .sort({ rodada: 1 })
            .toArray();

        console.log(`Total de snapshots: ${snapshots.length}\n`);

        for (const snap of snapshots) {
            const ranking = snap.ranking_consolidado || [];
            const participante = ranking.find(r => r.time_id === TIME_ID);

            if (participante) {
                console.log(`R${String(snap.rodada).padStart(2)}: Pos ${String(participante.posicao).padStart(2)} | G: ${participante.g || 0} | Z: ${participante.z || 0} | Pontos: ${participante.pontos?.toFixed(2) || 'N/A'}`);
            } else {
                console.log(`R${String(snap.rodada).padStart(2)}: NÃO ENCONTRADO no ranking`);
            }
        }

        // 3. Verificar consolidação mais recente
        console.log('\n=== CONSOLIDAÇÃO ATUAL ===');

        const consolidacao = await db.collection('consolidacoes')
            .findOne({ liga_id: new mongoose.Types.ObjectId(LIGA_ID) });

        if (consolidacao) {
            const ranking = consolidacao.ranking_consolidado || [];
            const participante = ranking.find(r => r.time_id === TIME_ID);

            if (participante) {
                console.log('Posição atual:', participante.posicao);
                console.log('G (total):', participante.g);
                console.log('Z (total):', participante.z);
            }
        }

        // 4. Verificar o extrato cache atual
        console.log('\n=== EXTRATO CACHE ATUAL ===');

        const extratoCache = await db.collection('extratofinanceirocaches')
            .findOne({ time_id: TIME_ID });

        if (extratoCache) {
            const hist = extratoCache.historico_transacoes || [];
            console.log('Total de rodadas no cache:', hist.length);
            console.log('Primeira rodada:', hist[0]?.rodada);
            console.log('Última rodada:', hist[hist.length - 1]?.rodada);

            // Mostrar as primeiras 5 rodadas
            console.log('\nPrimeiras 5 rodadas do cache:');
            hist.slice(0, 5).forEach(h => {
                console.log(`  R${h.rodada}: bonusOnus=${h.bonusOnus} | pos=${h.posicao} | tipo=${h.tipo || 'N/A'} | valor=${h.valor || 'N/A'}`);
            });
        }

        // 5. Verificar a configuração do banco (valores de G/Z) da liga
        console.log('\n=== CONFIGURAÇÃO DO BANCO (G/Z) DA LIGA ===');

        const liga = await db.collection('ligas').findOne({
            _id: new mongoose.Types.ObjectId(LIGA_ID)
        });

        if (liga?.configuracoes?.ranking_rodada) {
            console.log('Ranking por rodada:', JSON.stringify(liga.configuracoes.ranking_rodada.valores, null, 2));
        } else if (liga?.modulos_ativos) {
            console.log('Módulos ativos:', JSON.stringify(liga.modulos_ativos, null, 2));
        }

        await mongoose.disconnect();
        console.log('\nDesconectado.');

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

verificar();

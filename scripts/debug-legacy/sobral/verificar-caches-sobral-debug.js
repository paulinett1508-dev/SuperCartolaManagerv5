/**
 * Debug: Verificar caches da Liga Sobral
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Liga Sobral ObjectId
    const ligaId = new mongoose.Types.ObjectId('684d821cf1a7ae16d1f89572');

    console.log('Buscando caches da Liga Sobral (ObjectId)...\n');

    // Buscar caches desta liga
    const caches = await db.collection('extratofinanceirocaches').find({ liga_id: ligaId }).toArray();

    console.log('Total caches encontrados:', caches.length);

    if (caches.length === 0) {
        // Tentar buscar com String
        console.log('\nTentando buscar com liga_id como String...');
        const cachesStr = await db.collection('extratofinanceirocaches').find({ liga_id: '684d821cf1a7ae16d1f89572' }).toArray();
        console.log('Com String:', cachesStr.length, 'caches');

        // Mostrar amostra de liga_ids existentes
        console.log('\nAmostra de liga_ids na collection:');
        const amostra = await db.collection('extratofinanceirocaches').find({}).limit(5).toArray();
        amostra.forEach(c => {
            console.log(`  time_id=${c.time_id} | liga_id=${c.liga_id} (type: ${typeof c.liga_id})`);
        });
    } else {
        console.log('\n=== ANÁLISE DOS CACHES ===\n');

        for (const cache of caches) {
            const hist = cache.historico_transacoes || [];
            const totalBonusOnus = hist.reduce((sum, h) => sum + (parseFloat(h.bonusOnus) || 0), 0);
            const temPosicoes = hist.some(h => h.posicao !== null && h.posicao !== undefined);

            const status = (totalBonusOnus === 0 && hist.length > 5 && !temPosicoes) ? '⚠️ ZERADO' : '✅ OK';

            console.log(`${status} Time ${cache.time_id}: bonusOnus=${totalBonusOnus.toFixed(2)} | posicoes=${temPosicoes ? 'SIM' : 'NAO'} | rodadas=${hist.length}`);

            // Se zerado, mostrar primeiras rodadas
            if (totalBonusOnus === 0 && hist.length > 0) {
                console.log('   Primeiras 3 rodadas:');
                hist.slice(0, 3).forEach(r => {
                    console.log(`     R${r.rodada}: bonusOnus=${r.bonusOnus} posicao=${r.posicao} saldo=${r.saldo}`);
                });
            }
        }
    }

    await mongoose.disconnect();
}

main().catch(console.error);

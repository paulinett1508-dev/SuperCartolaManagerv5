/**
 * RECALCULAR EXTRATOS - Liga Cartoleiros do Sobral
 *
 * Script que chama o controller de fluxo financeiro para recalcular
 * todos os extratos da liga usando os dados reais do sistema.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Liga from '../models/Liga.js';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';
import { getFluxoFinanceiroLiga } from '../controllers/fluxoFinanceiroController.js';

dotenv.config();

const LIGA_SOBRAL_ID = '684d821cf1a7ae16d1f89572';

async function recalcular() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);

    console.log('=== RECALCULAR EXTRATOS - Liga Cartoleiros do Sobral ===\n');

    try {
        // 1. Buscar liga
        const liga = await Liga.findById(LIGA_SOBRAL_ID).lean();
        if (!liga) {
            console.log('Liga não encontrada!');
            return;
        }
        console.log(`Liga: ${liga.nome}`);
        console.log(`Participantes: ${liga.participantes.length}`);

        // 2. Limpar caches antigos
        const ligaIdObj = new mongoose.Types.ObjectId(LIGA_SOBRAL_ID);
        const deletados = await ExtratoFinanceiroCache.deleteMany({
            $or: [
                { liga_id: LIGA_SOBRAL_ID },
                { liga_id: ligaIdObj }
            ]
        });
        console.log(`Caches antigos removidos: ${deletados.deletedCount}\n`);

        // 3. Chamar função de consolidação que recalcula todos os extratos
        console.log('Recalculando extratos até rodada 38...');
        const resultados = await getFluxoFinanceiroLiga(LIGA_SOBRAL_ID, 38);

        console.log('\n=== RESULTADOS ===');
        resultados.forEach(r => {
            console.log(`${r.nome_time}: R$ ${r.saldo_total.toFixed(2)} (${r.transacoes} transações)`);
        });

        // 4. Verificar caches criados
        const caches = await ExtratoFinanceiroCache.find({ liga_id: ligaIdObj }).lean();
        console.log(`\nCaches criados: ${caches.length}`);

        caches.forEach(c => {
            console.log(`  Time ${c.time_id}: ${c.historico_transacoes.length} transações, saldo R$ ${c.saldo_consolidado}`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await mongoose.disconnect();
    }
}

recalcular();

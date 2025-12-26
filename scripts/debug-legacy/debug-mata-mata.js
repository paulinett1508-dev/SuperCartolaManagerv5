/**
 * Script para debugar o cálculo do Mata-Mata na tesouraria
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';
import {
    calcularResumoDeRodadas,
    transformarTransacoesEmRodadas,
} from '../controllers/extratoFinanceiroCacheController.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function debugMataMata() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 DEBUG MATA-MATA - Tesouraria');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        // Buscar cache do Randerson (time_id: 1039496)
        const ligaId = '684cb1c8af923da7c7df51de';
        const timeId = 1039496;

        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            time_id: timeId,
        }).lean();

        if (!cache) {
            console.log('❌ Cache não encontrado');
            return;
        }

        console.log(`📋 Cache encontrado para time ${timeId}`);
        console.log(`   Rodadas no histórico: ${cache.historico_transacoes?.length}`);

        // Verificar dados de Mata-Mata no histórico original
        const historicoOriginal = cache.historico_transacoes || [];
        let mataMataOriginal = 0;
        const rodadasComMataMata = [];

        historicoOriginal.forEach(r => {
            if (r.mataMata && r.mataMata !== 0) {
                mataMataOriginal += r.mataMata;
                rodadasComMataMata.push({ rodada: r.rodada, mataMata: r.mataMata });
            }
        });

        console.log(`\n📊 MATA-MATA NO HISTÓRICO ORIGINAL:`);
        console.log(`   Total: R$ ${mataMataOriginal}`);
        console.log(`   Rodadas com Mata-Mata:`, rodadasComMataMata);

        // Processar com transformarTransacoesEmRodadas
        const rodadasProcessadas = transformarTransacoesEmRodadas(historicoOriginal, ligaId);

        // Calcular resumo
        const resumo = calcularResumoDeRodadas(rodadasProcessadas, []);

        console.log(`\n📊 RESULTADO DO calcularResumoDeRodadas:`);
        console.log(`   bonus: ${resumo.bonus}`);
        console.log(`   onus: ${resumo.onus}`);
        console.log(`   pontosCorridos: ${resumo.pontosCorridos}`);
        console.log(`   mataMata: ${resumo.mataMata}`);  // <-- Este é o valor que vai para o breakdown
        console.log(`   top10: ${resumo.top10}`);
        console.log(`   saldo: ${resumo.saldo}`);

        console.log(`\n📊 BREAKDOWN QUE SERIA MONTADO:`);
        const breakdown = {
            banco: resumo.bonus + resumo.onus,
            pontosCorridos: resumo.pontosCorridos,
            mataMata: resumo.mataMata,
            top10: resumo.top10,
        };
        console.log(breakdown);

        // Verificar se mataMata está correto
        if (resumo.mataMata === mataMataOriginal) {
            console.log(`\n✅ MATA-MATA CALCULADO CORRETAMENTE!`);
        } else {
            console.log(`\n❌ DISCREPÂNCIA NO MATA-MATA!`);
            console.log(`   Original: ${mataMataOriginal}`);
            console.log(`   Calculado: ${resumo.mataMata}`);
        }

        console.log('\n═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

debugMataMata();

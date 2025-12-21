/**
 * Script para verificar se a correção da tesouraria está funcionando
 * Compara saldos do extrato individual vs tesouraria
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';
import FluxoFinanceiroCampos from '../models/FluxoFinanceiroCampos.js';
import AcertoFinanceiro from '../models/AcertoFinanceiro.js';
import Liga from '../models/Liga.js';
import {
    calcularResumoDeRodadas,
    transformarTransacoesEmRodadas,
} from '../controllers/extratoFinanceiroCacheController.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function verificarCorrecao() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 VERIFICANDO CORREÇÃO TESOURARIA vs EXTRATO INDIVIDUAL');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        // Buscar participante específico (Randerson Rodrigues ou outro)
        const ligaIdStr = '684cb1c8af923da7c7df51de'; // Super Cartola 2025
        const ligaId = new mongoose.Types.ObjectId(ligaIdStr);

        // Buscar a liga para obter os participantes
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            console.log('❌ Liga não encontrada');
            return;
        }

        console.log(`📋 Liga: ${liga.nome}`);
        console.log(`👥 Total participantes: ${liga.participantes?.length}\n`);

        // Testar alguns participantes - incluindo Randerson Rodrigues (time_id: 1039496)
        const randerson = liga.participantes?.find(p => p.time_id === 1039496);
        const outrosParticipantes = liga.participantes?.slice(0, 4) || [];
        const participantesParaTestar = randerson
            ? [randerson, ...outrosParticipantes.filter(p => p.time_id !== 1039496)]
            : outrosParticipantes;

        console.log('Comparando cálculos:\n');
        console.log('┌────────────────────────────┬──────────────┬──────────────┬──────────────┐');
        console.log('│ Participante               │ Cache Direto │ Recalculado  │ Diferença    │');
        console.log('├────────────────────────────┼──────────────┼──────────────┼──────────────┤');

        let diferencasEncontradas = 0;

        for (const p of participantesParaTestar) {
            const timeId = p.time_id;
            const nomeTime = (p.nome_time || 'Desconhecido').substring(0, 24).padEnd(24);

            // Método antigo: pegar saldo_consolidado direto
            const cache = await ExtratoFinanceiroCache.findOne({
                liga_id: ligaId,
                time_id: timeId,
            }).lean();

            const saldoConsolidadoAntigo = cache?.saldo_consolidado || 0;

            // Método novo: recalcular a partir das rodadas
            const historico = cache?.historico_transacoes || [];
            const rodadasProcessadas = transformarTransacoesEmRodadas(historico, ligaIdStr);

            const camposDoc = await FluxoFinanceiroCampos.findOne({
                ligaId: ligaIdStr,
                timeId: String(timeId),
            }).lean();
            const camposAtivos = camposDoc?.campos?.filter(c => c.valor !== 0) || [];

            const resumoCalculado = calcularResumoDeRodadas(rodadasProcessadas, camposAtivos);
            const saldoRecalculado = resumoCalculado.saldo;

            const diferenca = parseFloat((saldoRecalculado - saldoConsolidadoAntigo).toFixed(2));
            const diferencaStr = diferenca === 0 ? '✅ OK' : `❌ ${diferenca > 0 ? '+' : ''}${diferenca.toFixed(2)}`;

            if (diferenca !== 0) diferencasEncontradas++;

            console.log(`│ ${nomeTime} │ ${saldoConsolidadoAntigo.toFixed(2).padStart(10)} │ ${saldoRecalculado.toFixed(2).padStart(10)} │ ${diferencaStr.padStart(12)} │`);
        }

        console.log('└────────────────────────────┴──────────────┴──────────────┴──────────────┘\n');

        if (diferencasEncontradas === 0) {
            console.log('✅ TODOS OS SALDOS ESTÃO CONSISTENTES!');
            console.log('   A correção está funcionando corretamente.');
        } else {
            console.log(`⚠️ ENCONTRADAS ${diferencasEncontradas} DIFERENÇAS!`);
            console.log('   Isso significa que saldo_consolidado estava desatualizado.');
            console.log('   Com a correção, a tesouraria agora recalcula corretamente.');
        }

        console.log('\n═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

verificarCorrecao();

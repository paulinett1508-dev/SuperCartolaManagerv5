/**
 * AUDITORIA: Divergência de Saldo Financeiro
 * Compara saldos entre:
 * 1. Cache do Extrato Financeiro (extratofinanceirocaches)
 * 2. API do Hall da Fama (/api/extrato-cache/:ligaId/times/:timeId/cache)
 * 3. API do Fluxo Financeiro (/api/fluxo-financeiro/:ligaId/extrato/:timeId)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// IDs da liga SuperCartola (ajustar conforme necessário)
const LIGA_ID = '684d821cf1a7ae16d1f89572';
const LIGA_ID_OBJ = new mongoose.Types.ObjectId(LIGA_ID);
const TEMPORADA = 2025;

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     AUDITORIA: DIVERGÊNCIA DE SALDO FINANCEIRO                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // 1. Buscar dados da liga
    const liga = await db.collection('ligas').findOne({ _id: LIGA_ID_OBJ });
    console.log(`📋 Liga: ${liga?.nome || 'Não encontrada'}`);
    console.log(`📊 Temporada: ${TEMPORADA}`);
    console.log(`👥 Participantes: ${liga?.participantes?.length || 0}\n`);

    // 2. Buscar caches de extrato financeiro
    const caches = await db.collection('extratofinanceirocaches')
        .find({ 
            liga_id: LIGA_ID_OBJ,
            temporada: TEMPORADA 
        })
        .toArray();

    console.log(`💾 Caches encontrados: ${caches.length}`);
    
    // 3. Buscar acertos financeiros (pagamentos/recebimentos)
    const acertos = await db.collection('acertosfinanceiros')
        .find({ 
            ligaId: LIGA_ID,
            temporada: TEMPORADA,
            ativo: true 
        })
        .toArray();
    
    console.log(`💰 Acertos financeiros: ${acertos.length}\n`);

    // 4. Analisar cada participante
    console.log('=' .repeat(90));
    console.log('| Time ID  | Nome                     | Cache Saldo | Hist Trans | Acertos | Diferença |');
    console.log('|' + '-'.repeat(10) + '|' + '-'.repeat(26) + '|' + '-'.repeat(13) + '|' + '-'.repeat(12) + '|' + '-'.repeat(9) + '|' + '-'.repeat(11) + '|');

    let divergencias = [];

    for (const cache of caches) {
        const timeId = cache.time_id;
        const participante = liga?.participantes?.find(p => p.time_id === timeId);
        const nomeTime = (participante?.nome_time || 'N/D').substring(0, 24).padEnd(24);

        // Saldo do campo saldo_consolidado
        const saldoConsolidado = cache.saldo_consolidado || 0;

        // Calcular saldo a partir do historico_transacoes
        let saldoHistorico = 0;
        if (cache.historico_transacoes && Array.isArray(cache.historico_transacoes)) {
            cache.historico_transacoes.forEach(t => {
                // Formato novo
                if (t.saldo !== undefined) {
                    saldoHistorico += parseFloat(t.saldo) || 0;
                } else if (t.bonusOnus !== undefined || t.pontosCorridos !== undefined) {
                    saldoHistorico += (parseFloat(t.bonusOnus) || 0) +
                                      (parseFloat(t.pontosCorridos) || 0) +
                                      (parseFloat(t.mataMata) || 0) +
                                      (parseFloat(t.top10) || 0);
                }
                // Formato legado
                else if (t.valor !== undefined) {
                    saldoHistorico += parseFloat(t.valor) || 0;
                }
            });
        }

        // Acertos para este time
        const acertosTime = acertos.filter(a => a.timeId === String(timeId));
        let saldoAcertos = 0;
        acertosTime.forEach(a => {
            if (a.tipo === 'pagamento') saldoAcertos += parseFloat(a.valor) || 0;
            else if (a.tipo === 'recebimento') saldoAcertos -= parseFloat(a.valor) || 0;
        });

        // Calcular diferença
        const diferenca = saldoHistorico - saldoConsolidado;
        
        const linha = `| ${String(timeId).padStart(8)} | ${nomeTime} | ${String(saldoConsolidado.toFixed(0)).padStart(11)} | ${String(saldoHistorico.toFixed(0)).padStart(10)} | ${String(saldoAcertos.toFixed(0)).padStart(7)} | ${String(diferenca.toFixed(0)).padStart(9)} |`;
        console.log(linha);

        if (Math.abs(diferenca) > 1) {
            divergencias.push({
                timeId,
                nomeTime: participante?.nome_time || 'N/D',
                saldoConsolidado,
                saldoHistorico,
                saldoAcertos,
                diferenca
            });
        }
    }

    console.log('=' .repeat(90));

    // 5. Resumo de divergências
    console.log(`\n📊 DIVERGÊNCIAS ENCONTRADAS: ${divergencias.length}`);
    
    if (divergencias.length > 0) {
        console.log('\n🔴 TIMES COM DIVERGÊNCIA:');
        divergencias.forEach(d => {
            console.log(`   ⚠️  ${d.nomeTime} (ID: ${d.timeId})`);
            console.log(`       Cache saldo_consolidado: R$ ${d.saldoConsolidado.toFixed(2)}`);
            console.log(`       Soma historico_transacoes: R$ ${d.saldoHistorico.toFixed(2)}`);
            console.log(`       Acertos financeiros: R$ ${d.saldoAcertos.toFixed(2)}`);
            console.log(`       DIFERENÇA: R$ ${d.diferenca.toFixed(2)}`);
            console.log('');
        });
    }

    // 6. Análise de estrutura dos dados
    console.log('\n📋 ANÁLISE DE ESTRUTURA DO CACHE:');
    if (caches.length > 0) {
        const amostra = caches[0];
        console.log(`   Campos principais: ${Object.keys(amostra).join(', ')}`);
        
        if (amostra.historico_transacoes && amostra.historico_transacoes.length > 0) {
            const primeiraTrans = amostra.historico_transacoes[0];
            console.log(`   Estrutura transação: ${Object.keys(primeiraTrans).join(', ')}`);
            console.log(`   Exemplo rodada ${primeiraTrans.rodada}:`, JSON.stringify(primeiraTrans, null, 2).substring(0, 300));
        }
    }

    // 7. Verificar campos que podem estar causando divergência
    console.log('\n🔍 DIAGNÓSTICO DE FONTES DE DADOS:');
    console.log(`   1. Hall da Fama: usa /api/extrato-cache/:ligaId/times/:timeId/cache`);
    console.log(`      → Busca resumo.saldo ou resumo.saldo_final`);
    console.log(`   2. Módulo Extrato: usa /api/extrato-cache/ primeiro, fallback para /api/fluxo-financeiro/`);
    console.log(`      → Calcula saldo a partir de rodadas.reduce()`);
    console.log(`   3. Boas-Vindas: usa extratoData?.saldo_atual ?? extratoData?.resumo?.saldo_final`);

    await mongoose.disconnect();
    console.log('\n✅ Auditoria concluída!');
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});

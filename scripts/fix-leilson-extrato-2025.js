/**
 * Script para reconstruir o extrato do Leilson 2025
 *
 * CONTEXTO:
 * - O cache de extrato 2025 foi APAGADO pelo "Botão da Morte" (Limpar Cache)
 * - Os dados de rodadas individuais NÃO existem na collection `rodadas`
 * - PORÉM, temos:
 *   - fluxofinanceirocampos: Saldo 2024 = R$ 0,54
 *   - acertofinanceiros: Pagamento R$ 204 (quitação total)
 *   - Observação do acerto: "Dívida: R$ 203,46"
 *
 * SOLUÇÃO:
 * - Criar cache com os dados que temos
 * - Marcar como QUITADO (pois pagou a dívida)
 * - O saldo final de 2025 é: 0,54 - 203,46 + 204 = R$ 1,08
 *
 * Uso:
 *   node scripts/fix-leilson-extrato-2025.js --dry-run  # Simula
 *   node scripts/fix-leilson-extrato-2025.js --force    # Executa
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

if (!isDryRun && !isForce) {
    console.log('❌ Uso: node scripts/fix-leilson-extrato-2025.js [--dry-run | --force]');
    process.exit(1);
}

const LEILSON = {
    timeId: 3300583,
    ligaId: '684cb1c8af923da7c7df51de',
    nome: 'Leilson Bezerra',
    nomeTime: 'FIASCO VET FC',
    temporada: 2025,
    // Dados conhecidos
    saldo2024: 0.54,           // Do fluxofinanceirocampos
    dividaRodadas: -203.46,    // Da observação do acerto
    pagamento: 204.00,         // Do acertofinanceiros
    posicaoFinal: 20,          // Do rankinggeralcaches
    pontosTotais: 3172.07      // Do rankinggeralcaches
};

async function main() {
    console.log('🔧 Reconstrução Extrato Leilson 2025');
    console.log(`   Modo: ${isDryRun ? 'DRY-RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;

    // 1. Verificar dados existentes
    console.log('📊 DADOS CONHECIDOS:');
    console.log(`   Time ID: ${LEILSON.timeId}`);
    console.log(`   Nome: ${LEILSON.nome} (${LEILSON.nomeTime})`);
    console.log(`   Temporada: ${LEILSON.temporada}`);
    console.log(`   Posição final: ${LEILSON.posicaoFinal}º`);
    console.log(`   Pontos totais: ${LEILSON.pontosTotais}`);
    console.log('');
    console.log('   💰 FINANCEIRO:');
    console.log(`   Saldo 2024 (crédito):     R$ ${LEILSON.saldo2024.toFixed(2)}`);
    console.log(`   Dívida das rodadas:       R$ ${LEILSON.dividaRodadas.toFixed(2)}`);
    console.log(`   Pagamento (quitação):     R$ ${LEILSON.pagamento.toFixed(2)}`);

    const saldoFinal = LEILSON.saldo2024 + LEILSON.dividaRodadas + LEILSON.pagamento;
    console.log(`   ─────────────────────────────────`);
    console.log(`   SALDO FINAL:              R$ ${saldoFinal.toFixed(2)}`);
    console.log('');

    // 2. Verificar cache atual
    const extratoCache = db.collection('extratofinanceirocaches');
    const cacheAtual = await extratoCache.findOne({
        liga_id: LEILSON.ligaId,
        time_id: LEILSON.timeId,
        temporada: LEILSON.temporada
    });

    if (cacheAtual) {
        console.log('⚠️  Cache existente encontrado:');
        console.log(`   ID: ${cacheAtual._id}`);
        console.log(`   Rodadas: ${cacheAtual.historico_transacoes?.length || 0}`);
        console.log(`   Saldo consolidado: ${cacheAtual.saldo_consolidado}`);
        console.log(`   Quitado: ${cacheAtual.quitacao?.quitado || false}`);
        console.log('');
    }

    // 3. Criar/atualizar cache
    const novoCache = {
        liga_id: LEILSON.ligaId,
        time_id: LEILSON.timeId,
        temporada: LEILSON.temporada,
        ultima_rodada_consolidada: 38,
        cache_permanente: true,  // 2025 é histórico
        versao_calculo: '4.0.0',

        // Transações: criar entrada única representando toda temporada
        historico_transacoes: [{
            rodada: 38,
            posicao: LEILSON.posicaoFinal,
            bonusOnus: LEILSON.dividaRodadas,  // Saldo das rodadas
            pontosCorridos: 0,
            mataMata: 0,
            top10: 0,
            saldo: LEILSON.dividaRodadas,
            saldoAcumulado: LEILSON.dividaRodadas,
            isMito: false,
            isMico: false,
            top10Status: null,
            top10Posicao: null,
            _nota: 'Dados reconstruídos - rodadas individuais perdidas'
        }],

        // Saldo consolidado (antes dos acertos)
        saldo_consolidado: LEILSON.dividaRodadas,
        ganhos_consolidados: 0,
        perdas_consolidadas: LEILSON.dividaRodadas,

        // Quitação
        quitacao: {
            quitado: true,
            tipo: 'integral',
            saldo_no_momento: LEILSON.dividaRodadas + LEILSON.saldo2024,
            valor_legado: saldoFinal,
            data_quitacao: new Date('2025-12-16T00:00:00Z'),
            admin_responsavel: 'sistema',
            observacao: 'Reconstruído após perda de dados - Dívida original R$ 203,46 quitada com pagamento R$ 204'
        },

        // Metadados
        metadados: {
            versaoCalculo: '3.4.0',
            timestampCalculo: new Date(),
            motivoRecalculo: 'reconstrucao_apos_perda_dados',
            nota: 'Cache reconstruído - dados de rodadas individuais foram perdidos pelo botão Limpar Cache',
            dados_conhecidos: {
                saldo_2024: LEILSON.saldo2024,
                divida_rodadas: LEILSON.dividaRodadas,
                pagamento_quitacao: LEILSON.pagamento,
                posicao_final: LEILSON.posicaoFinal,
                pontos_totais: LEILSON.pontosTotais
            }
        },

        rodadas_imutaveis: [38],
        data_ultima_atualizacao: new Date(),
        updatedAt: new Date()
    };

    console.log('📝 Cache a ser criado/atualizado:');
    console.log(`   Rodadas: ${novoCache.historico_transacoes.length}`);
    console.log(`   Saldo consolidado: R$ ${novoCache.saldo_consolidado.toFixed(2)}`);
    console.log(`   Quitado: ${novoCache.quitacao.quitado}`);
    console.log(`   Valor legado: R$ ${novoCache.quitacao.valor_legado.toFixed(2)}`);
    console.log('');

    if (!isDryRun) {
        if (cacheAtual) {
            // Atualizar existente
            await extratoCache.updateOne(
                { _id: cacheAtual._id },
                { $set: novoCache }
            );
            console.log('✅ Cache atualizado!');
        } else {
            // Criar novo
            novoCache.createdAt = new Date();
            await extratoCache.insertOne(novoCache);
            console.log('✅ Cache criado!');
        }

        // Verificar resultado
        const verificacao = await extratoCache.findOne({
            liga_id: LEILSON.ligaId,
            time_id: LEILSON.timeId,
            temporada: LEILSON.temporada
        });

        console.log('\n📊 Verificação final:');
        console.log(`   Rodadas: ${verificacao.historico_transacoes?.length}`);
        console.log(`   Saldo: R$ ${verificacao.saldo_consolidado?.toFixed(2)}`);
        console.log(`   Quitado: ${verificacao.quitacao?.quitado}`);
    } else {
        console.log('[DRY-RUN] Nenhuma alteração realizada');
    }

    await mongoose.disconnect();
    console.log('\n✅ Concluído!');

    console.log('\n⚠️  IMPORTANTE:');
    console.log('   Os dados de rodadas individuais do Leilson 2025 foram PERDIDOS.');
    console.log('   Este script reconstruiu o cache com os dados agregados disponíveis.');
    console.log('   O saldo final e quitação estão corretos, mas o detalhamento por rodada não.');
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});

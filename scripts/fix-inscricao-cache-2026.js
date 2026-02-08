/**
 * FIX: Inserir INSCRICAO_TEMPORADA no historico_transacoes do cache 2026
 *
 * PROBLEMA:
 *   A função criarTransacoesIniciais() nunca inseriu a transação INSCRICAO_TEMPORADA
 *   no historico_transacoes do extratofinanceirocaches para NENHUM participante.
 *   35/35 participantes afetados.
 *
 * SOLUÇÃO:
 *   Para cada participante com pagou_inscricao=false:
 *   1. Inserir {tipo: 'INSCRICAO_TEMPORADA', rodada: 0, valor: -180} no historico_transacoes
 *   2. Decrementar saldo_consolidado em 180 (para saldo-calculator funcionar)
 *
 *   Para pagou_inscricao=true: NÃO inserir (sem débito, saldo-calculator já lida corretamente)
 *
 * USO:
 *   node scripts/fix-inscricao-cache-2026.js --dry-run    # Simular
 *   node scripts/fix-inscricao-cache-2026.js --force      # Executar
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function fixInscricaoCache() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔧 FIX: Inserir INSCRICAO_TEMPORADA no cache 2026');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`Modo: ${isDryRun ? '🔍 DRY-RUN' : isForce ? '⚡ FORCE (executando!)' : '⚠️  Sem flag (use --dry-run ou --force)'}`);
    console.log('');

    if (!isDryRun && !isForce) {
        console.log('⚠️  Use --dry-run para simular ou --force para executar');
        process.exit(0);
    }

    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        const ligaId = '684cb1c8af923da7c7df51de';
        const ligaObjId = new mongoose.Types.ObjectId(ligaId);

        // 1. Buscar todas inscrições 2026
        const inscricoes = await db.collection('inscricoestemporada').find({
            liga_id: ligaObjId,
            temporada: 2026
        }).toArray();

        console.log(`📊 Total inscrições 2026: ${inscricoes.length}\n`);

        // 2. Buscar todos caches 2026
        const caches = await db.collection('extratofinanceirocaches').find({
            liga_id: ligaId,
            temporada: 2026
        }).toArray();

        console.log(`📊 Total caches 2026: ${caches.length}\n`);

        // 3. Buscar liga para nomes
        const liga = await db.collection('ligas').findOne({ _id: ligaObjId });
        const nomesMap = {};
        (liga.participantes || []).forEach(p => {
            nomesMap[p.time_id] = p.nome_cartola;
        });

        // 4. Processar cada inscrição
        const resultados = {
            corrigidos: [],
            jaNoCache: [],
            pagouInscricao: [],
            semCache: [],
            semTaxa: [],
            naoParticipa: [],
            erros: []
        };

        for (const inscricao of inscricoes) {
            const timeId = inscricao.time_id;
            const nome = nomesMap[timeId] || `ID:${timeId}`;

            // Pular quem não participa
            if (inscricao.status === 'nao_participa') {
                resultados.naoParticipa.push({ timeId, nome });
                continue;
            }

            // Buscar cache
            const cache = caches.find(c => c.time_id === timeId);

            if (!cache) {
                resultados.semCache.push({ timeId, nome, status: inscricao.status });
                continue;
            }

            // Verificar se já tem INSCRICAO no cache
            const transacoes = cache.historico_transacoes || [];
            const temInscricao = transacoes.some(t => t.tipo === 'INSCRICAO_TEMPORADA');

            if (temInscricao) {
                resultados.jaNoCache.push({ timeId, nome });
                continue;
            }

            // Verificar se pagou inscrição
            const pagouInscricao = inscricao.pagou_inscricao === true;
            const taxaInscricao = inscricao.taxa_inscricao || 0;

            if (pagouInscricao) {
                resultados.pagouInscricao.push({
                    timeId,
                    nome,
                    taxa: taxaInscricao,
                    saldoAtual: cache.saldo_consolidado
                });
                continue;
            }

            if (taxaInscricao <= 0) {
                resultados.semTaxa.push({ timeId, nome, taxa: taxaInscricao });
                continue;
            }

            // ══════════════════════════════════════════════════════
            // APLICAR CORREÇÃO: Inserir INSCRICAO_TEMPORADA
            // ══════════════════════════════════════════════════════

            const transacaoInscricao = {
                rodada: 0,
                tipo: 'INSCRICAO_TEMPORADA',
                valor: -taxaInscricao,
                descricao: `Inscrição temporada 2026 - R$ ${taxaInscricao.toFixed(2)}`,
                data: inscricao.data_processamento || inscricao.criado_em || new Date(),
                _id: new mongoose.Types.ObjectId(),
                // Campos de breakdown zerados (transação especial, não é rodada)
                posicao: null,
                bonusOnus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,
                saldo: 0,
                saldoAcumulado: 0,
                isMito: false,
                isMico: false,
                top10Status: null,
                top10Posicao: null
            };

            // Verificar saldo transferido e dívida anterior
            const saldoTransferido = inscricao.saldo_transferido || 0;
            const dividaAnterior = inscricao.divida_anterior || 0;
            const transacoesExtras = [];

            if (saldoTransferido !== 0) {
                transacoesExtras.push({
                    rodada: 0,
                    tipo: 'SALDO_TEMPORADA_ANTERIOR',
                    valor: saldoTransferido,
                    descricao: `Saldo transferido temporada anterior`,
                    data: inscricao.data_processamento || inscricao.criado_em || new Date(),
                    _id: new mongoose.Types.ObjectId(),
                    posicao: null,
                    bonusOnus: 0,
                    pontosCorridos: 0,
                    mataMata: 0,
                    top10: 0,
                    saldo: 0,
                    saldoAcumulado: 0,
                    isMito: false,
                    isMico: false,
                    top10Status: null,
                    top10Posicao: null
                });
            }

            const todasTransacoes = [transacaoInscricao, ...transacoesExtras];
            const totalValor = todasTransacoes.reduce((acc, t) => acc + t.valor, 0);

            const saldoCache = cache.saldo_consolidado || 0;
            // Saldo real = cache (rodadas) + inscrição + saldo_transferido
            // Nota: divida_anterior é aplicada pelo saldo-calculator em tempo de leitura
            const saldoRealEstimado = saldoCache + totalValor;

            console.log(`📝 ${nome} (${timeId}):`);
            console.log(`   Taxa: R$ ${taxaInscricao.toFixed(2)} | pagou: ${pagouInscricao}`);
            console.log(`   Saldo transferido: R$ ${saldoTransferido} | Dívida anterior: R$ ${dividaAnterior}`);
            console.log(`   Transações a inserir: ${todasTransacoes.length}`);
            console.log(`   Saldo cache (rodadas): R$ ${saldoCache.toFixed(2)}`);
            console.log(`   Saldo estimado c/ inscrição: R$ ${saldoRealEstimado.toFixed(2)}${dividaAnterior > 0 ? ' (- dívida R$ ' + dividaAnterior.toFixed(2) + ' aplicada em leitura)' : ''}`);
            console.log(`   Variação: R$ ${totalValor.toFixed(2)}`);

            if (!isDryRun) {
                try {
                    // Inserir transação(ões) no início do array
                    // NÃO usar $inc em saldo_consolidado:
                    // - getExtratoCache() recalcula do historico_transacoes (inclui rodada=0)
                    // - saldo-calculator.js v2.1.0 aplica valores do cache ao saldo
                    // - $inc causaria double-counting quando saldo-calculator processa
                    const resultado = await db.collection('extratofinanceirocaches').updateOne(
                        {
                            liga_id: ligaId,
                            time_id: timeId,
                            temporada: 2026
                        },
                        {
                            $push: {
                                historico_transacoes: {
                                    $each: todasTransacoes,
                                    $position: 0 // Inserir no início
                                }
                            }
                        }
                    );

                    if (resultado.modifiedCount > 0) {
                        console.log(`   ✅ CORRIGIDO`);
                        resultados.corrigidos.push({
                            timeId,
                            nome,
                            taxa: taxaInscricao,
                            saldoCache,
                            saldoRealEstimado,
                            dividaAnterior,
                            transacoesInseridas: todasTransacoes.length
                        });
                    } else {
                        console.log(`   ❌ Nenhum documento modificado`);
                        resultados.erros.push({ timeId, nome, erro: 'modifiedCount=0' });
                    }
                } catch (err) {
                    console.log(`   ❌ Erro: ${err.message}`);
                    resultados.erros.push({ timeId, nome, erro: err.message });
                }
            } else {
                console.log(`   [DRY-RUN] Seria inserido`);
                resultados.corrigidos.push({
                    timeId,
                    nome,
                    taxa: taxaInscricao,
                    saldoCache,
                    saldoRealEstimado,
                    dividaAnterior,
                    transacoesInseridas: todasTransacoes.length
                });
            }
            console.log('');
        }

        // ══════════════════════════════════════════════════════
        // RELATÓRIO FINAL
        // ══════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('📊 RELATÓRIO FINAL');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        console.log(`✅ CORRIGIDOS: ${resultados.corrigidos.length}`);
        resultados.corrigidos.forEach(p => {
            const divInfo = p.dividaAnterior > 0 ? ` (dívida: -R$ ${p.dividaAnterior.toFixed(2)})` : '';
            console.log(`   ${p.nome} (${p.timeId}) | cache: R$ ${p.saldoCache.toFixed(2)} → estimado: R$ ${p.saldoRealEstimado.toFixed(2)}${divInfo}`);
        });
        console.log('');

        console.log(`💰 PAGOU INSCRIÇÃO (sem ação): ${resultados.pagouInscricao.length}`);
        resultados.pagouInscricao.forEach(p => {
            console.log(`   ${p.nome} (${p.timeId}) | pagou R$ ${p.taxa} | saldo: R$ ${p.saldoAtual}`);
        });
        console.log('');

        console.log(`🚫 NÃO PARTICIPA: ${resultados.naoParticipa.length}`);
        resultados.naoParticipa.forEach(p => {
            console.log(`   ${p.nome} (${p.timeId})`);
        });
        console.log('');

        if (resultados.semCache.length > 0) {
            console.log(`⚠️  SEM CACHE: ${resultados.semCache.length}`);
            resultados.semCache.forEach(p => {
                console.log(`   ${p.nome} (${p.timeId}) status=${p.status}`);
            });
            console.log('');
        }

        if (resultados.semTaxa.length > 0) {
            console.log(`⚠️  SEM TAXA: ${resultados.semTaxa.length}`);
            resultados.semTaxa.forEach(p => {
                console.log(`   ${p.nome} (${p.timeId}) taxa=${p.taxa}`);
            });
            console.log('');
        }

        if (resultados.erros.length > 0) {
            console.log(`❌ ERROS: ${resultados.erros.length}`);
            resultados.erros.forEach(p => {
                console.log(`   ${p.nome} (${p.timeId}): ${p.erro}`);
            });
            console.log('');
        }

        // Verificação de integridade pós-fix
        if (!isDryRun && resultados.corrigidos.length > 0) {
            console.log('═══════════════════════════════════════════════════════════════════');
            console.log('🔍 VERIFICAÇÃO PÓS-CORREÇÃO');
            console.log('═══════════════════════════════════════════════════════════════════\n');

            for (const p of resultados.corrigidos) {
                const cacheAtualizado = await db.collection('extratofinanceirocaches').findOne({
                    liga_id: ligaId,
                    time_id: p.timeId,
                    temporada: 2026
                });

                const transacoes = cacheAtualizado.historico_transacoes || [];
                const temInscricao = transacoes.some(t => t.tipo === 'INSCRICAO_TEMPORADA');
                const temSaldoAnterior = transacoes.some(t => t.tipo === 'SALDO_TEMPORADA_ANTERIOR');
                const saldoCache = cacheAtualizado.saldo_consolidado;

                // saldo_consolidado NÃO foi alterado ($inc removido)
                // Apenas verificar se as transações foram inseridas
                console.log(`${temInscricao ? '✅' : '❌'} ${p.nome} (${p.timeId}): INSCRICAO=${temInscricao}${temSaldoAnterior ? ' SALDO_ANTERIOR=✅' : ''} saldo_cache=${saldoCache}`);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro fatal:', error.message, error.stack);
    } finally {
        await mongoose.disconnect();
    }
}

fixInscricaoCache();

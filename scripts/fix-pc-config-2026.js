/**
 * FIX: Configurar Pontos Corridos para 2026 e inserir transações faltantes
 *
 * PROBLEMA:
 *   1. liga.configuracoes.pontos_corridos tem habilitado=false, configurado=false, sem rodadaInicial
 *   2. ModuleConfig para PC 2026 tem configurado=false
 *   3. Nenhum participante tem transação PONTOS_CORRIDOS no cache
 *   4. calcularConfrontoPontosCorridos() usa fallback rodadaInicial=7,
 *      então R1 e R2 retornam null (rodadaLiga < 1)
 *
 * SOLUÇÃO:
 *   1. Atualizar liga.configuracoes.pontos_corridos = { habilitado: true, configurado: true, rodadaInicial: 2 }
 *   2. Atualizar ModuleConfig.configurado = true
 *   3. Calcular confrontos PC para R2 (R1 não tem PC com rodadaInicial=2)
 *   4. Inserir transações PONTOS_CORRIDOS no historico_transacoes do cache
 *
 * USO:
 *   node scripts/fix-pc-config-2026.js --dry-run    # Simular
 *   node scripts/fix-pc-config-2026.js --force      # Executar
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function fixPCConfig() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔧 FIX: Configurar Pontos Corridos 2026 + Inserir transações');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`Modo: ${isDryRun ? '🔍 DRY-RUN' : isForce ? '⚡ FORCE' : '⚠️  Sem flag'}`);
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
        const RODADA_INICIAL = 2;

        // ══════════════════════════════════════════════════════
        // PARTE 1: Atualizar configurações
        // ══════════════════════════════════════════════════════
        console.log('▓▓▓ PARTE 1: ATUALIZAR CONFIGURAÇÕES ▓▓▓\n');

        // 1a. Liga.configuracoes.pontos_corridos
        const liga = await db.collection('ligas').findOne({ _id: ligaObjId });
        const pcConfigAtual = liga.configuracoes?.pontos_corridos || {};
        console.log('📋 Config atual liga.configuracoes.pontos_corridos:', JSON.stringify(pcConfigAtual));

        const novaConfigPC = {
            habilitado: true,
            configurado: true,
            rodadaInicial: RODADA_INICIAL
        };
        console.log('📋 Nova config:', JSON.stringify(novaConfigPC));

        if (!isDryRun) {
            await db.collection('ligas').updateOne(
                { _id: ligaObjId },
                { $set: { 'configuracoes.pontos_corridos': novaConfigPC } }
            );
            console.log('✅ Liga.configuracoes.pontos_corridos atualizado\n');
        } else {
            console.log('[DRY-RUN] Seria atualizado\n');
        }

        // 1b. ModuleConfig.configurado = true
        const moduleConfig = await db.collection('moduleconfigs').findOne({
            liga_id: ligaObjId,
            modulo: 'pontos_corridos',
            temporada: 2026
        });

        if (moduleConfig) {
            console.log(`📋 ModuleConfig PC 2026: configurado=${moduleConfig.configurado}`);
            if (!isDryRun) {
                await db.collection('moduleconfigs').updateOne(
                    { _id: moduleConfig._id },
                    { $set: { configurado: true, atualizado_em: new Date() } }
                );
                console.log('✅ ModuleConfig.configurado = true\n');
            } else {
                console.log('[DRY-RUN] Seria atualizado\n');
            }
        } else {
            console.log('⚠️  ModuleConfig PC 2026 não encontrado\n');
        }

        // 1c. Temporada 2026 config
        const tempConfig = liga.configuracoes?.temporada_2026;
        if (tempConfig && tempConfig.status === 'aguardando_config') {
            console.log('📋 temporada_2026.status: aguardando_config → ativa');
            if (!isDryRun) {
                await db.collection('ligas').updateOne(
                    { _id: ligaObjId },
                    { $set: {
                        'configuracoes.temporada_2026.status': 'ativa',
                        'configuracoes.temporada_2026.rodada_inicial': RODADA_INICIAL
                    }}
                );
                console.log('✅ temporada_2026 atualizada\n');
            } else {
                console.log('[DRY-RUN] Seria atualizado\n');
            }
        }

        // ══════════════════════════════════════════════════════
        // PARTE 2: Calcular confrontos PC para rodadas existentes
        // ══════════════════════════════════════════════════════
        console.log('▓▓▓ PARTE 2: CALCULAR CONFRONTOS PC ▓▓▓\n');

        // Buscar participantes ativos, ordenados por nome_cartola
        const participantesAtivos = (liga.participantes || [])
            .filter(p => p.ativo !== false)
            .sort((a, b) => a.nome_cartola.localeCompare(b.nome_cartola));

        console.log(`📊 Participantes ativos: ${participantesAtivos.length}`);
        participantesAtivos.forEach((p, i) => {
            console.log(`   [${i}] ${p.nome_cartola} (${p.time_id})`);
        });
        console.log('');

        const totalTimes = participantesAtivos.length;

        // Buscar caches 2026
        const caches = await db.collection('extratofinanceirocaches').find({
            liga_id: ligaId,
            temporada: 2026
        }).toArray();

        console.log(`📊 Caches 2026: ${caches.length}\n`);

        // Determinar rodadas que precisam de PC
        // Com rodadaInicial=2, PC começa na rodada 2 do Brasileirão
        // rodadaLiga = rodadaCartola - (rodadaInicial - 1)
        // Para R2: rodadaLiga = 2 - 1 = 1 (primeira rodada do PC)
        // Para R1: rodadaLiga = 1 - 1 = 0 (sem PC)

        // Verificar quais rodadas existem nos caches
        const rodadasExistentes = new Set();
        for (const cache of caches) {
            (cache.historico_transacoes || []).forEach(t => {
                if (t.rodada && t.rodada > 0) {
                    rodadasExistentes.add(t.rodada);
                }
            });
        }

        const rodadasOrdenadas = [...rodadasExistentes].sort((a, b) => a - b);
        console.log(`📊 Rodadas existentes nos caches: ${rodadasOrdenadas.join(', ')}`);

        // Filtrar rodadas que devem ter PC (rodadaCartola >= rodadaInicial)
        const rodadasComPC = rodadasOrdenadas.filter(r => r >= RODADA_INICIAL);
        console.log(`📊 Rodadas que devem ter PC (>= ${RODADA_INICIAL}): ${rodadasComPC.join(', ')}\n`);

        // Para cada rodada que deve ter PC, buscar pontuações
        const resultados = { inseridos: 0, jaExiste: 0, semDados: 0, erros: 0 };

        for (const rodadaCartola of rodadasComPC) {
            const rodadaLiga = rodadaCartola - (RODADA_INICIAL - 1);
            console.log(`\n═══ RODADA ${rodadaCartola} (rodadaLiga=${rodadaLiga}) ═══\n`);

            // Buscar pontuações desta rodada da collection "rodadas"
            const dadosRodada = await db.collection('rodadas').find({
                ligaId: ligaObjId,
                rodada: rodadaCartola,
                temporada: 2026
            }).toArray();

            if (dadosRodada.length === 0) {
                console.log(`⚠️  Sem dados na collection rodadas para R${rodadaCartola}`);
                resultados.semDados++;
                continue;
            }

            console.log(`📊 Dados de pontuação: ${dadosRodada.length} times`);

            // Mapear pontuações por time_id
            const pontuacaoMap = {};
            dadosRodada.forEach(d => {
                const tid = d.timeId || d.time_id;
                pontuacaoMap[tid] = d.pontos || 0;
            });

            // Calcular confrontos usando o algoritmo round-robin
            for (const cache of caches) {
                const timeId = cache.time_id;
                const transacoes = cache.historico_transacoes || [];

                // Verificar se já tem PC para esta rodada
                const jaTemPC = transacoes.some(
                    t => t.tipo === 'PONTOS_CORRIDOS' && t.rodada === rodadaCartola
                );

                if (jaTemPC) {
                    resultados.jaExiste++;
                    continue;
                }

                // Encontrar índice do participante
                const meuIndex = participantesAtivos.findIndex(
                    p => String(p.time_id) === String(timeId)
                );

                if (meuIndex === -1) {
                    // Participante não está na lista de ativos (pode ter sido removido)
                    continue;
                }

                // Calcular oponente pelo round-robin
                const oponenteIndex = (meuIndex + rodadaLiga) % totalTimes;
                if (oponenteIndex === meuIndex) continue;

                const oponente = participantesAtivos[oponenteIndex];
                const meusPontos = pontuacaoMap[timeId];
                const pontosOponente = pontuacaoMap[oponente.time_id];

                if (meusPontos === undefined || pontosOponente === undefined) {
                    continue;
                }

                const nome = participantesAtivos[meuIndex].nome_cartola;
                const diferenca = Math.abs(meusPontos - pontosOponente);

                let valor = 0;
                let descricao = '';

                // Empate: diferença <= 0.3
                if (diferenca <= 0.3) {
                    valor = 3.0;
                    descricao = `Empate PC vs ${oponente.nome_time || oponente.nome_cartola}`;
                }
                // Vitória
                else if (meusPontos > pontosOponente) {
                    if (diferenca >= 50) {
                        valor = 7.0; // 5 + 2 (bônus goleada)
                        descricao = `Vitória Goleada PC vs ${oponente.nome_time || oponente.nome_cartola}`;
                    } else {
                        valor = 5.0;
                        descricao = `Vitória PC vs ${oponente.nome_time || oponente.nome_cartola}`;
                    }
                }
                // Derrota
                else {
                    if (diferenca >= 50) {
                        valor = -7.0; // -5 - 2 (penalidade goleada)
                        descricao = `Derrota Goleada PC vs ${oponente.nome_time || oponente.nome_cartola}`;
                    } else {
                        valor = -5.0;
                        descricao = `Derrota PC vs ${oponente.nome_time || oponente.nome_cartola}`;
                    }
                }

                console.log(`  ${nome} (${timeId}): ${meusPontos.toFixed(2)} vs ${pontosOponente.toFixed(2)} ${oponente.nome_cartola} → ${valor > 0 ? '+' : ''}${valor} (${descricao})`);

                if (!isDryRun) {
                    try {
                        const transacaoPC = {
                            rodada: rodadaCartola,
                            tipo: 'PONTOS_CORRIDOS',
                            descricao: descricao,
                            valor: valor,
                            data: new Date(),
                            _id: new mongoose.Types.ObjectId(),
                            posicao: null,
                            bonusOnus: 0,
                            pontosCorridos: valor,
                            mataMata: 0,
                            top10: 0,
                            saldo: 0,
                            saldoAcumulado: 0,
                            isMito: false,
                            isMico: false,
                            top10Status: null,
                            top10Posicao: null
                        };

                        // Inserir na posição correta (após transações da mesma rodada)
                        // Encontrar o índice da última transação desta rodada
                        const cacheAtual = await db.collection('extratofinanceirocaches').findOne({
                            liga_id: ligaId,
                            time_id: timeId,
                            temporada: 2026
                        });

                        const transacoesAtuais = cacheAtual.historico_transacoes || [];
                        let insertIndex = transacoesAtuais.length; // default: final

                        // Encontrar posição após última transação desta rodada
                        for (let i = 0; i < transacoesAtuais.length; i++) {
                            if (transacoesAtuais[i].rodada === rodadaCartola) {
                                insertIndex = i + 1;
                            }
                            if (transacoesAtuais[i].rodada > rodadaCartola) {
                                insertIndex = i;
                                break;
                            }
                        }

                        const resultado = await db.collection('extratofinanceirocaches').updateOne(
                            {
                                liga_id: ligaId,
                                time_id: timeId,
                                temporada: 2026
                            },
                            {
                                $push: {
                                    historico_transacoes: {
                                        $each: [transacaoPC],
                                        $position: insertIndex
                                    }
                                }
                            }
                        );

                        if (resultado.modifiedCount > 0) {
                            resultados.inseridos++;
                        } else {
                            resultados.erros++;
                        }
                    } catch (err) {
                        console.error(`  ❌ Erro: ${err.message}`);
                        resultados.erros++;
                    }
                } else {
                    resultados.inseridos++;
                }
            }
        }

        // ══════════════════════════════════════════════════════
        // RELATÓRIO FINAL
        // ══════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('📊 RELATÓRIO FINAL');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        console.log(`✅ Transações PC inseridas: ${resultados.inseridos}`);
        console.log(`⏭️  Já existiam: ${resultados.jaExiste}`);
        console.log(`⚠️  Sem dados de rodada: ${resultados.semDados}`);
        console.log(`❌ Erros: ${resultados.erros}`);
        console.log('');

        // Verificação pós-fix: Antonio Luis
        if (!isDryRun) {
            console.log('═══════════════════════════════════════════════════════════════════');
            console.log('🔍 VERIFICAÇÃO PÓS-FIX: Antonio Luis (645089)');
            console.log('═══════════════════════════════════════════════════════════════════\n');

            const cacheAntonio = await db.collection('extratofinanceirocaches').findOne({
                liga_id: ligaId,
                time_id: 645089,
                temporada: 2026
            });

            if (cacheAntonio) {
                const trans = cacheAntonio.historico_transacoes || [];
                console.log('Transações:');
                trans.forEach((t, i) => {
                    console.log(`  [${i}] R${t.rodada} ${t.tipo} valor=${t.valor} ${t.descricao || ''}`);
                });
                console.log(`\nSaldo consolidado (cache): ${cacheAntonio.saldo_consolidado}`);

                // Calcular saldo esperado
                const somaTransacoes = trans.reduce((acc, t) => acc + (t.valor || 0), 0);
                console.log(`Soma de todas transações: ${somaTransacoes}`);
                console.log(`Esperado com acerto de R$60: ${somaTransacoes + 60}`);
            }

            // Verificar liga.configuracoes atualizada
            const ligaAtualizada = await db.collection('ligas').findOne({ _id: ligaObjId });
            console.log('\nConfig PC atualizada:', JSON.stringify(ligaAtualizada.configuracoes?.pontos_corridos));
        }

        console.log('\n═══════════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro fatal:', error.message, error.stack);
    } finally {
        await mongoose.disconnect();
    }
}

fixPCConfig();

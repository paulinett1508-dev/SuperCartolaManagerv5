/**
 * FIX-AUDITORIA-EXTRATOS-2026 v1.0
 *
 * Script de correção baseado na auditoria completa de extratos financeiros 2026.
 *
 * Problemas corrigidos:
 * 1. Documentos DUPLICADOS em extratofinanceirocaches (liga_id String vs ObjectId)
 * 2. Extratos FALTANTES para participantes inscritos
 * 3. Entradas R0 (INSCRICAO_TEMPORADA, SALDO_TEMPORADA_ANTERIOR) perdidas
 *    durante auto-healing do controller
 * 4. saldo_consolidado incorreto (sem R0)
 *
 * Uso:
 *   node scripts/fix-auditoria-extratos-2026.js --dry-run   (simular)
 *   node scripts/fix-auditoria-extratos-2026.js --force      (executar)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const TEMPORADA = 2026;
const VERSAO_FIX = "auditoria-extratos-2026-v1";

// Tipos de transação R0
const TIPOS_R0 = ["INSCRICAO_TEMPORADA", "SALDO_TEMPORADA_ANTERIOR", "LEGADO_ANTERIOR", "TRANSFERENCIA_SALDO"];

async function fixAuditoriaExtratos2026() {
    const isDryRun = process.argv.includes("--dry-run");
    const isForced = process.argv.includes("--force");

    if (!isDryRun && !isForced) {
        console.error("Uso: node scripts/fix-auditoria-extratos-2026.js --dry-run ou --force");
        process.exit(1);
    }

    console.log("=".repeat(80));
    console.log("FIX AUDITORIA EXTRATOS FINANCEIROS " + TEMPORADA);
    console.log("Modo: " + (isDryRun ? "🔍 SIMULAÇÃO (dry-run)" : "⚡ EXECUÇÃO REAL"));
    console.log("=".repeat(80) + "\n");

    const relatorio = {
        duplicatasRemovidas: 0,
        extratosCriados: 0,
        r0Corrigidos: 0,
        saldoRecalculados: 0,
        semAlteracao: 0,
        detalhes: [],
    };

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Conectado ao MongoDB\n");

        const db = mongoose.connection.db;

        // =====================================================================
        // FASE 1: Buscar dados de referência
        // =====================================================================
        console.log("📋 FASE 1: Carregando dados de referência...\n");

        const inscricoes = await db.collection("inscricoestemporada").find({
            temporada: TEMPORADA,
            processado: true,
            status: { $in: ["renovado", "novo"] },
        }).toArray();

        console.log(`   Inscrições 2026 (renovado/novo): ${inscricoes.length}`);

        const todosExtratos = await db.collection("extratofinanceirocaches").find({
            temporada: TEMPORADA,
        }).toArray();

        console.log(`   Extratos 2026 encontrados: ${todosExtratos.length}`);

        // =====================================================================
        // FASE 2: Normalizar liga_id + Remover duplicatas
        // =====================================================================
        console.log("\n" + "=".repeat(80));
        console.log("🔄 FASE 2: Normalizar liga_id e remover duplicatas");
        console.log("=".repeat(80) + "\n");

        // 2a. Normalizar liga_id ObjectId → String
        const extratosComObjectId = await db.collection("extratofinanceirocaches").find({
            temporada: TEMPORADA,
            liga_id: { $type: "objectId" },
        }).toArray();

        if (extratosComObjectId.length > 0) {
            console.log(`   📌 ${extratosComObjectId.length} extratos com liga_id como ObjectId\n`);

            for (const ext of extratosComObjectId) {
                const novoLigaId = String(ext.liga_id);

                // Verificar se já existe um com String para a mesma chave
                const existeString = todosExtratos.find(e =>
                    e._id.toString() !== ext._id.toString() &&
                    String(e.liga_id) === novoLigaId &&
                    typeof e.liga_id === "string" &&
                    Number(e.time_id) === Number(ext.time_id)
                );

                if (existeString) {
                    // Duplicata real: mesmo liga (String vs ObjectId), mesmo time
                    // Mergear dados: manter o com mais game entries, transferir R0
                    const gameExt = (ext.historico_transacoes || []).filter(t => t.rodada > 0 && !TIPOS_R0.includes(t.tipo));
                    const gameStr = (existeString.historico_transacoes || []).filter(t => t.rodada > 0 && !TIPOS_R0.includes(t.tipo));
                    const r0Ext = (ext.historico_transacoes || []).filter(t => t.rodada === 0 || TIPOS_R0.includes(t.tipo));
                    const r0Str = (existeString.historico_transacoes || []).filter(t => t.rodada === 0 || TIPOS_R0.includes(t.tipo));

                    // Manter o que tem mais game data; se empate, manter String
                    const manterString = gameStr.length >= gameExt.length;
                    const docManter = manterString ? existeString : ext;
                    const docRemover = manterString ? ext : existeString;
                    const r0Melhor = r0Ext.length >= r0Str.length ? r0Ext : r0Str;
                    const gameMelhor = gameStr.length >= gameExt.length ? gameStr : gameExt;

                    const insc = inscricoes.find(i => Number(i.time_id) === Number(ext.time_id) && String(i.liga_id) === novoLigaId);
                    const nome = insc?.dados_participante?.nome_cartoleiro || `ID:${ext.time_id}`;

                    console.log(`   🗑️ Duplicata: ${nome} (time_id=${ext.time_id})`);
                    console.log(`      Manter: _id=${docManter._id} (${gameMelhor.length} game + ${r0Melhor.length} R0)`);
                    console.log(`      Remover: _id=${docRemover._id} (${(docRemover === ext ? gameExt : gameStr).length} game + ${(docRemover === ext ? r0Ext : r0Str).length} R0)`);

                    if (!isDryRun) {
                        // Mergear: R0 do melhor + game do melhor
                        const mergedHistorico = [...r0Melhor, ...gameMelhor];
                        const saldoR0 = r0Melhor.reduce((acc, t) => acc + (t.valor || 0), 0);
                        const saldoGame = gameMelhor.reduce((acc, t) => acc + (t.saldo || t.valor || 0), 0);

                        await db.collection("extratofinanceirocaches").updateOne(
                            { _id: docManter._id },
                            {
                                $set: {
                                    liga_id: novoLigaId,
                                    historico_transacoes: mergedHistorico,
                                    saldo_consolidado: saldoR0 + saldoGame,
                                    ultima_rodada_consolidada: Math.max(
                                        docManter.ultima_rodada_consolidada || 0,
                                        docRemover.ultima_rodada_consolidada || 0
                                    ),
                                    versao_calculo: VERSAO_FIX,
                                    data_ultima_atualizacao: new Date(),
                                },
                            }
                        );
                        await db.collection("extratofinanceirocaches").deleteOne({ _id: docRemover._id });
                    }

                    relatorio.duplicatasRemovidas++;
                } else {
                    // Sem duplicata, apenas normalizar
                    console.log(`   🔗 Normalizar: time_id=${ext.time_id} liga_id ObjectId → String`);

                    if (!isDryRun) {
                        await db.collection("extratofinanceirocaches").updateOne(
                            { _id: ext._id },
                            { $set: { liga_id: novoLigaId } }
                        );
                    }
                }
            }
        } else {
            console.log("   ✅ Todos os liga_ids já são String, sem duplicatas");
        }

        // =====================================================================
        // FASE 3: Processar cada inscrição - Criar/Corrigir extratos
        // =====================================================================
        console.log("\n" + "=".repeat(80));
        console.log("📊 FASE 3: Processamento individual dos extratos");
        console.log("=".repeat(80) + "\n");

        // Recarregar extratos após normalização/remoção de duplicatas
        const extratosAtuais = isDryRun
            ? todosExtratos
            : await db.collection("extratofinanceirocaches").find({ temporada: TEMPORADA }).toArray();

        for (const insc of inscricoes) {
            const timeId = Number(insc.time_id);
            const ligaId = insc.liga_id;
            const ligaIdStr = String(ligaId);
            const nome = insc.dados_participante?.nome_cartoleiro || `ID:${timeId}`;
            const nomeTime = insc.dados_participante?.nome_time || "";

            console.log(`\n   ─── ${nome} (${nomeTime}) [time_id=${timeId}] liga=${ligaIdStr.substring(0,8)}... ───`);

            // Buscar cache existente (normalizado por liga_id)
            // Encontrar TODOS os caches deste time nesta liga (pode haver String + ObjectId)
            const cachesDoTime = extratosAtuais.filter(e =>
                Number(e.time_id) === timeId &&
                String(e.liga_id) === ligaIdStr
            );

            // Se não encontrou, o merge da Fase 2 já tratou (ou nunca existiu)
            let cache = cachesDoTime.length > 0 ? cachesDoTime[0] : null;

            // Se há múltiplos (dry-run sem merge), pegar o com mais game data
            if (cachesDoTime.length > 1) {
                cachesDoTime.sort((a, b) => {
                    const gA = (a.historico_transacoes || []).filter(t => t.rodada > 0).length;
                    const gB = (b.historico_transacoes || []).filter(t => t.rodada > 0).length;
                    return gB - gA;
                });
                cache = cachesDoTime[0];
            }

            const detalhe = {
                timeId,
                nome,
                nomeTime,
                ligaId: ligaIdStr,
                acao: "",
                antes: {},
                depois: {},
            };

            // ----- R0 entries esperadas (da inscrição) -----
            const r0Esperadas = (insc.transacoes_criadas || []).map(t => ({
                rodada: 0,
                tipo: t.tipo,
                descricao: t.tipo === "INSCRICAO_TEMPORADA"
                    ? `Taxa de Inscrição ${TEMPORADA}`
                    : t.tipo === "SALDO_TEMPORADA_ANTERIOR"
                    ? `Saldo Transferido de ${TEMPORADA - 1}`
                    : t.tipo,
                valor: t.valor,
                isTransacaoEspecial: true,
                data: insc.data_processamento || insc.criado_em,
            }));

            const saldoR0Esperado = r0Esperadas.reduce((acc, t) => acc + t.valor, 0);

            console.log(`      Inscrição: taxa=${insc.taxa_inscricao} | pagou=${insc.pagou_inscricao} | divida=${insc.divida_anterior} | saldo_transf=${insc.saldo_transferido}`);
            console.log(`      R0 esperadas: ${r0Esperadas.length} entradas (saldo R0: R$ ${saldoR0Esperado.toFixed(2)})`);
            for (const r0 of r0Esperadas) {
                console.log(`         ${r0.tipo}: R$ ${r0.valor}`);
            }

            // ===== CASO 1: Cache não existe =====
            if (!cache) {
                console.log(`      ⚠️ EXTRATO NÃO ENCONTRADO - Criando novo`);

                detalhe.acao = "CRIADO";
                detalhe.antes = { existe: false };
                detalhe.depois = {
                    existe: true,
                    saldo_consolidado: saldoR0Esperado,
                    historico_transacoes: r0Esperadas.length,
                    ultima_rodada_consolidada: 0,
                };

                if (!isDryRun) {
                    await db.collection("extratofinanceirocaches").insertOne({
                        liga_id: ligaIdStr,
                        time_id: timeId,
                        temporada: TEMPORADA,
                        historico_transacoes: r0Esperadas,
                        saldo_consolidado: saldoR0Esperado,
                        ganhos_consolidados: r0Esperadas.filter(t => t.valor > 0).reduce((acc, t) => acc + t.valor, 0),
                        perdas_consolidadas: r0Esperadas.filter(t => t.valor < 0).reduce((acc, t) => acc + t.valor, 0),
                        ultima_rodada_consolidada: 0,
                        versao_calculo: VERSAO_FIX,
                        data_ultima_atualizacao: new Date(),
                        createdAt: new Date(),
                        metadados: {
                            versaoCalculo: VERSAO_FIX,
                            timestampCalculo: new Date(),
                            motivoRecalculo: "fix-auditoria: extrato faltante",
                            origem: "script-auditoria",
                        },
                    });
                }

                relatorio.extratosCriados++;
                relatorio.detalhes.push(detalhe);

                console.log(`      ✅ Extrato criado com saldo R$ ${saldoR0Esperado.toFixed(2)}`);
                continue;
            }

            // ===== CASO 2: Cache existe - verificar R0 =====
            const historicoAtual = cache.historico_transacoes || [];
            const saldoAtual = cache.saldo_consolidado || 0;
            const rodadaConsolidada = cache.ultima_rodada_consolidada || 0;

            // Separar entradas existentes: R0 vs Game
            const r0Existentes = historicoAtual.filter(t =>
                t.rodada === 0 || TIPOS_R0.includes(t.tipo)
            );
            const gameEntries = historicoAtual.filter(t =>
                t.rodada !== 0 && !TIPOS_R0.includes(t.tipo)
            );

            const saldoR0Existente = r0Existentes.reduce((acc, t) => acc + (t.valor || 0), 0);
            const saldoGame = saldoAtual - saldoR0Existente;

            console.log(`      Cache atual: R${rodadaConsolidada} | saldo=${saldoAtual.toFixed(2)} | ${historicoAtual.length} transações`);
            console.log(`      R0 existentes: ${r0Existentes.length} (saldo R0: R$ ${saldoR0Existente.toFixed(2)})`);
            console.log(`      Game entries: ${gameEntries.length} (saldo game: R$ ${saldoGame.toFixed(2)})`);

            // Verificar se R0 está correto
            const r0NeedsFix = !arraysR0Iguais(r0Existentes, r0Esperadas);

            if (!r0NeedsFix) {
                console.log(`      ✅ R0 entries corretas - sem alteração`);
                detalhe.acao = "SEM_ALTERACAO";
                relatorio.semAlteracao++;
                relatorio.detalhes.push(detalhe);
                continue;
            }

            // ===== CORRIGIR: Substituir R0 e recalcular saldo =====
            const novoHistorico = [...r0Esperadas, ...gameEntries];
            const novoSaldo = saldoR0Esperado + saldoGame;
            const novosGanhos = novoHistorico.filter(t => (t.valor || t.saldo || 0) > 0)
                .reduce((acc, t) => acc + (t.valor || t.saldo || 0), 0);
            const novasPerdas = novoHistorico.filter(t => (t.valor || t.saldo || 0) < 0)
                .reduce((acc, t) => acc + (t.valor || t.saldo || 0), 0);

            detalhe.acao = "R0_CORRIGIDO";
            detalhe.antes = {
                saldo_consolidado: saldoAtual,
                r0_count: r0Existentes.length,
                r0_saldo: saldoR0Existente,
                total_transacoes: historicoAtual.length,
            };
            detalhe.depois = {
                saldo_consolidado: novoSaldo,
                r0_count: r0Esperadas.length,
                r0_saldo: saldoR0Esperado,
                total_transacoes: novoHistorico.length,
            };

            const diffSaldo = novoSaldo - saldoAtual;
            console.log(`      🔧 CORRIGINDO R0:`);
            console.log(`         R0 antes: ${r0Existentes.length} entries (R$ ${saldoR0Existente.toFixed(2)})`);
            console.log(`         R0 depois: ${r0Esperadas.length} entries (R$ ${saldoR0Esperado.toFixed(2)})`);
            console.log(`         Saldo: ${saldoAtual.toFixed(2)} → ${novoSaldo.toFixed(2)} (diff: ${diffSaldo >= 0 ? "+" : ""}${diffSaldo.toFixed(2)})`);

            if (!isDryRun) {
                await db.collection("extratofinanceirocaches").updateOne(
                    { _id: cache._id },
                    {
                        $set: {
                            historico_transacoes: novoHistorico,
                            saldo_consolidado: novoSaldo,
                            ganhos_consolidados: novosGanhos,
                            perdas_consolidadas: novasPerdas,
                            versao_calculo: VERSAO_FIX,
                            data_ultima_atualizacao: new Date(),
                            "metadados.versaoCalculo": VERSAO_FIX,
                            "metadados.timestampCalculo": new Date(),
                            "metadados.motivoRecalculo": "fix-auditoria: R0 corrigido",
                            "metadados.origem": "script-auditoria",
                        },
                    }
                );
            }

            relatorio.r0Corrigidos++;
            relatorio.saldoRecalculados++;
            relatorio.detalhes.push(detalhe);

            console.log(`      ✅ Corrigido!`);
        }

        // =====================================================================
        // RELATÓRIO FINAL
        // =====================================================================
        console.log("\n" + "=".repeat(80));
        console.log("📊 RELATÓRIO FINAL");
        console.log("=".repeat(80) + "\n");

        console.log(`   Duplicatas removidas:    ${relatorio.duplicatasRemovidas}`);
        console.log(`   Extratos criados:        ${relatorio.extratosCriados}`);
        console.log(`   R0 corrigidos:           ${relatorio.r0Corrigidos}`);
        console.log(`   Saldos recalculados:     ${relatorio.saldoRecalculados}`);
        console.log(`   Sem alteração:           ${relatorio.semAlteracao}`);

        // Sumário por ação
        const detalhesCorrigidos = relatorio.detalhes.filter(d => d.acao === "R0_CORRIGIDO");
        if (detalhesCorrigidos.length > 0) {
            console.log("\n   📋 Detalhes das correções de saldo:");
            console.log("   " + "-".repeat(76));
            console.log("   " + padRight("Participante", 30) + padRight("Antes", 15) + padRight("Depois", 15) + "Diff");
            console.log("   " + "-".repeat(76));

            for (const d of detalhesCorrigidos) {
                const antes = d.antes.saldo_consolidado?.toFixed(2) || "0.00";
                const depois = d.depois.saldo_consolidado?.toFixed(2) || "0.00";
                const diff = (d.depois.saldo_consolidado - d.antes.saldo_consolidado);
                const diffStr = (diff >= 0 ? "+" : "") + diff.toFixed(2);
                console.log("   " + padRight(d.nome.substring(0, 28), 30) + padRight("R$ " + antes, 15) + padRight("R$ " + depois, 15) + "R$ " + diffStr);
            }
        }

        const detalhesCriados = relatorio.detalhes.filter(d => d.acao === "CRIADO");
        if (detalhesCriados.length > 0) {
            console.log("\n   📋 Extratos criados:");
            for (const d of detalhesCriados) {
                console.log(`   + ${d.nome} (time_id=${d.timeId}) → saldo R$ ${d.depois.saldo_consolidado?.toFixed(2)}`);
            }
        }

        console.log("\n" + (isDryRun
            ? "🔍 SIMULAÇÃO CONCLUÍDA - Nenhuma alteração foi feita. Use --force para executar."
            : "⚡ EXECUÇÃO CONCLUÍDA - Alterações aplicadas ao banco."));

    } catch (error) {
        console.error("\n❌ Erro:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("\n✅ Desconectado do MongoDB");
    }
}

// ============================================================================
// UTILS
// ============================================================================

/**
 * Verifica se dois arrays de R0 entries são equivalentes
 */
function arraysR0Iguais(existentes, esperadas) {
    if (existentes.length !== esperadas.length) return false;

    for (const esp of esperadas) {
        const encontrada = existentes.find(e =>
            e.tipo === esp.tipo &&
            Math.abs((e.valor || 0) - (esp.valor || 0)) < 0.01
        );
        if (!encontrada) return false;
    }
    return true;
}

/**
 * Pad string à direita
 */
function padRight(str, len) {
    return String(str).padEnd(len);
}

// ============================================================================
// EXECUÇÃO
// ============================================================================
fixAuditoriaExtratos2026();

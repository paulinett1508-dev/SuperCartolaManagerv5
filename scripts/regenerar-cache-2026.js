/**
 * REGENERAR CACHE 2026
 * Cria/atualiza caches de 2026 com transacoes especiais das inscricoes.
 * Uso: node scripts/regenerar-cache-2026.js [--dry-run|--force]
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const TEMPORADA = 2026;

async function regenerarCache2026() {
    const isDryRun = process.argv.includes("--dry-run");
    const isForced = process.argv.includes("--force");

    if (!isDryRun && !isForced) {
        console.error("Uso: node scripts/regenerar-cache-2026.js --dry-run ou --force");
        process.exit(1);
    }

    console.log("REGENERAR CACHE EXTRATO " + TEMPORADA);
    console.log("Modo: " + (isDryRun ? "SIMULACAO" : "EXECUCAO REAL") + "\n");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Conectado ao MongoDB\n");

        const db = mongoose.connection.db;

        const inscricoes = await db.collection("inscricoestemporada").find({
            temporada: TEMPORADA,
            processado: true
        }).toArray();

        console.log("Inscricoes 2026 encontradas: " + inscricoes.length + "\n");

        for (const insc of inscricoes) {
            const timeId = insc.time_id;
            const ligaId = insc.liga_id;
            const nome = insc.dados_participante?.nome_cartoleiro || "ID:" + timeId;

            console.log("\nProcessando: " + nome + " (" + timeId + ")");

            const transacoes = [];

            if (insc.transacoes_criadas?.length > 0) {
                for (const t of insc.transacoes_criadas) {
                    transacoes.push({
                        rodada: 0,
                        tipo: t.tipo,
                        descricao: t.tipo === "INSCRICAO_TEMPORADA" 
                            ? "Taxa de Inscricao 2026" 
                            : "Credito Transferido de 2025",
                        valor: t.valor,
                        isTransacaoEspecial: true,
                        data: insc.data_processamento || insc.criado_em
                    });
                    console.log("   + " + t.tipo + ": R$ " + t.valor);
                }
            }

            const saldo = insc.saldo_inicial_temporada || 0;
            console.log("   = Saldo inicial: R$ " + saldo);

            const cacheExistente = await db.collection("extratofinanceirocaches").findOne({
                liga_id: typeof ligaId === "string" ? ligaId : ligaId.toString(),
                time_id: Number(timeId),
                temporada: TEMPORADA
            });

            if (!isDryRun) {
                if (cacheExistente) {
                    await db.collection("extratofinanceirocaches").updateOne(
                        { _id: cacheExistente._id },
                        {
                            $set: {
                                historico_transacoes: transacoes,
                                saldo_consolidado: saldo,
                                ganhos_consolidados: transacoes.filter(t => t.valor > 0).reduce((acc, t) => acc + t.valor, 0),
                                perdas_consolidadas: transacoes.filter(t => t.valor < 0).reduce((acc, t) => acc + t.valor, 0),
                                ultima_rodada_consolidada: 0,
                                versao_calculo: "8.5.0-inscricao",
                                data_ultima_atualizacao: new Date()
                            }
                        }
                    );
                    console.log("   -> Cache ATUALIZADO");
                } else {
                    await db.collection("extratofinanceirocaches").insertOne({
                        liga_id: typeof ligaId === "string" ? ligaId : ligaId.toString(),
                        time_id: Number(timeId),
                        temporada: TEMPORADA,
                        historico_transacoes: transacoes,
                        saldo_consolidado: saldo,
                        ganhos_consolidados: transacoes.filter(t => t.valor > 0).reduce((acc, t) => acc + t.valor, 0),
                        perdas_consolidadas: transacoes.filter(t => t.valor < 0).reduce((acc, t) => acc + t.valor, 0),
                        ultima_rodada_consolidada: 0,
                        versao_calculo: "8.5.0-inscricao",
                        data_ultima_atualizacao: new Date(),
                        createdAt: new Date()
                    });
                    console.log("   -> Cache CRIADO");
                }
            } else {
                console.log("   [DRY-RUN] Nenhuma alteracao");
            }
        }

        console.log("\nConcluido!");

    } catch (error) {
        console.error("Erro:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

regenerarCache2026();

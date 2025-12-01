// controllers/rodadaController.js - VERSÃO CORRIGIDA
// ✅ Proteção contra duplicatas usando upsert
// ✅ Verificação por timeId individual
// ✅ Índice único recomendado

import Rodada from "../models/Rodada.js";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import fetch from "node-fetch";
import mongoose from "mongoose";

// Constantes de configuração
const BATCH_SIZE = 3;
const REQUEST_DELAY = 1000;
const MAX_RETRIES = 5;
const TIMEOUT_MS = 15000;
const MAX_ERROS_CONSECUTIVOS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// === RETRY COM BACKOFF ===
async function retryRequest(fn, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) {
                console.error(
                    `Todas as ${retries} tentativas falharam:`,
                    error.message,
                );
                throw error;
            }
            const baseDelay = 1000 * Math.pow(2, i);
            const jitter = Math.random() * 1000;
            const delay = Math.min(baseDelay + jitter, 10000);
            console.warn(
                `Tentativa ${i + 1}/${retries} falhou: ${error.message}. Aguardando ${Math.round(delay)}ms...`,
            );
            await sleep(delay);
        }
    }
}

// === BUSCAR RODADAS ===
export async function buscarRodadas(req, res) {
    const { ligaId } = req.params;
    const { inicio, fim } = req.query;

    try {
        const inicioNum = parseInt(inicio);
        const fimNum = parseInt(fim);

        if (isNaN(inicioNum) || isNaN(fimNum)) {
            return res.status(400).json({
                error: "Parâmetros inicio e fim devem ser números válidos",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(ligaId)) {
            return res.status(400).json({ error: "ID de liga inválido" });
        }

        const ligaObjectId = new mongoose.Types.ObjectId(ligaId);

        const queryMongo = {
            ligaId: ligaObjectId,
            rodada:
                inicioNum === fimNum
                    ? inicioNum
                    : { $gte: inicioNum, $lte: fimNum },
        };

        const rodadas = await Rodada.find(queryMongo).lean();
        console.log(
            `Encontradas ${rodadas.length} rodadas para liga ${ligaId}`,
        );

        return res.status(200).json(rodadas);
    } catch (err) {
        console.error("Erro ao buscar rodadas:", err.message);
        return res.status(500).json({ error: "Erro ao buscar rodadas" });
    }
}

// === BUSCAR PONTOS COM TIMEOUT E RETRY ===
async function buscarPontosRodada(timeId, rodada) {
    return await retryRequest(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const res = await fetch(
                `https://api.cartola.globo.com/time/id/${timeId}/${rodada}`,
                {
                    signal: controller.signal,
                    headers: {
                        "User-Agent": "Super-Cartola-Manager/1.0.0",
                        Accept: "application/json",
                    },
                },
            );

            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status === 404) {
                    console.debug(
                        `Time ${timeId} não jogou na rodada ${rodada}`,
                    );
                    return 0;
                }
                if (res.status === 429) {
                    throw new Error(`Rate limit excedido`);
                }
                if (res.status >= 500) {
                    throw new Error(
                        `Erro interno da API Cartola (${res.status})`,
                    );
                }
                throw new Error(`API retornou status ${res.status}`);
            }

            const data = await res.json();
            return data.pontos || 0;
        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === "AbortError") {
                throw new Error(`Timeout na requisição para time ${timeId}`);
            }

            if (
                err.code === "ECONNRESET" ||
                err.code === "ENOTFOUND" ||
                err.code === "ECONNREFUSED"
            ) {
                throw new Error(`Erro de conexão com API Cartola: ${err.code}`);
            }

            throw err;
        }
    });
}

// === PROCESSAR TIMES EM LOTES ===
async function processarTimesEmLotes(times, rodada, ligaId) {
    const resultados = [];
    let errosConsecutivos = 0;

    for (let i = 0; i < times.length; i += BATCH_SIZE) {
        const lote = times.slice(i, i + BATCH_SIZE);
        console.log(
            `Processando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(times.length / BATCH_SIZE)} da rodada ${rodada}`,
        );

        try {
            const resultadosLote = [];
            for (const time of lote) {
                try {
                    const pontos = await buscarPontosRodada(time.id, rodada);
                    resultadosLote.push({
                        ligaId,
                        rodada,
                        timeId: time.id,
                        nome_cartola: time.nome_cartoleiro || "N/D",
                        nome_time: time.nome_time || "N/D",
                        escudo: time.url_escudo_png || "",
                        clube_id: time.clube_id || 0,
                        escudo_time_do_coracao: "",
                        pontos,
                        rodadaNaoJogada: false,
                    });

                    errosConsecutivos = 0;
                    await sleep(200);
                } catch (timeError) {
                    console.warn(
                        `Erro ao buscar time ${time.id}: ${timeError.message}`,
                    );
                    errosConsecutivos++;

                    resultadosLote.push({
                        ligaId,
                        rodada,
                        timeId: time.id,
                        nome_cartola: time.nome_cartoleiro || "N/D",
                        nome_time: time.nome_time || "N/D",
                        escudo: time.url_escudo_png || "",
                        clube_id: time.clube_id || 0,
                        escudo_time_do_coracao: "",
                        pontos: 0,
                        rodadaNaoJogada: true,
                        erro: timeError.message.substring(0, 100),
                    });

                    if (errosConsecutivos >= MAX_ERROS_CONSECUTIVOS) {
                        throw new Error(
                            `Muitos erros consecutivos (${errosConsecutivos}). API indisponível.`,
                        );
                    }
                }
            }

            resultados.push(...resultadosLote);

            const delayFinal =
                errosConsecutivos > 0 ? REQUEST_DELAY * 2 : REQUEST_DELAY;
            if (i + BATCH_SIZE < times.length) {
                await sleep(delayFinal);
            }
        } catch (loteError) {
            console.error(`Erro no lote: ${loteError.message}`);
            throw loteError;
        }
    }

    return resultados;
}

// =====================================================================
// POPULAR RODADAS - VERSÃO CORRIGIDA COM PROTEÇÃO CONTRA DUPLICATAS
// =====================================================================
export async function popularRodadas(req, res) {
    const { ligaId } = req.params;
    const { inicio, fim, repopular } = req.body;
    const repopularBool = String(repopular) === "true";

    const session = await mongoose.startSession();

    try {
        console.log(
            `[popularRodadas] Liga: ${ligaId}, Rodadas: ${inicio}-${fim}, Repopular: ${repopularBool}`,
        );

        const inicioNum = parseInt(inicio);
        const fimNum = parseInt(fim);

        if (
            isNaN(inicioNum) ||
            isNaN(fimNum) ||
            inicioNum < 1 ||
            fimNum > 38 ||
            inicioNum > fimNum
        ) {
            return res.status(400).json({
                error: "Parâmetros inválidos. Use valores entre 1 e 38, com início <= fim",
            });
        }

        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({ error: "Liga não encontrada" });
        }

        if (!liga.times || liga.times.length === 0) {
            return res
                .status(400)
                .json({ error: "Liga não possui times cadastrados" });
        }

        console.log(
            `Liga "${liga.nome}" tem ${liga.times.length} times cadastrados`,
        );

        const times = await Time.find({ id: { $in: liga.times } }).lean();
        const timesEncontradosIds = times.map((t) => t.id);
        const timesFaltantes = liga.times.filter(
            (id) => !timesEncontradosIds.includes(id),
        );

        if (timesFaltantes.length > 0) {
            return res.status(400).json({
                error: `${timesFaltantes.length} times não estão cadastrados no sistema`,
                timesFaltantes,
                solucao:
                    "Cadastre todos os times primeiro usando a busca de times",
            });
        }

        let rodadaAtual = 38;
        try {
            const statusRes = await fetch(
                "https://api.cartola.globo.com/mercado/status",
            );
            if (statusRes.ok) {
                const statusData = await statusRes.json();
                rodadaAtual = statusData.rodada_atual || 38;
            }
        } catch (err) {
            console.warn("Erro ao buscar status do mercado:", err.message);
        }

        const estatisticas = {
            rodadasProcessadas: 0,
            rodadasPuladas: 0,
            registrosInseridos: 0,
            registrosAtualizados: 0,
            timesEncontrados: times.length,
            timesCadastrados: liga.times.length,
        };

        // ✅ USAR TRANSAÇÃO PARA GARANTIR ATOMICIDADE
        await session.withTransaction(async () => {
            for (let rodada = inicioNum; rodada <= fimNum; rodada++) {
                console.log(`\n=== Processando Rodada ${rodada}/${fimNum} ===`);

                // ✅ VERIFICAÇÃO MAIS RIGOROSA: Contar registros existentes
                const registrosExistentes = await Rodada.countDocuments({
                    ligaId,
                    rodada,
                }).session(session);

                // Se não é para repopular e já existem registros COMPLETOS
                if (!repopularBool && registrosExistentes >= times.length) {
                    console.log(
                        `Rodada ${rodada} já completa (${registrosExistentes} registros) - pulando`,
                    );
                    estatisticas.rodadasPuladas++;
                    continue;
                }

                // Se repopular, deletar TODOS os registros da rodada primeiro
                if (repopularBool) {
                    const deletados = await Rodada.deleteMany({
                        ligaId,
                        rodada,
                    }).session(session);
                    console.log(
                        `Removidos ${deletados.deletedCount} registros existentes da rodada ${rodada}`,
                    );
                }

                estatisticas.rodadasProcessadas++;

                let rodadasData = [];

                if (rodada > rodadaAtual) {
                    console.log(
                        `Rodada ${rodada} é futura - inserindo placeholders`,
                    );
                    rodadasData = times.map((time) => ({
                        ligaId,
                        rodada,
                        timeId: time.id,
                        nome_cartola: time.nome_cartoleiro || "N/D",
                        nome_time: time.nome_time || "N/D",
                        escudo: time.url_escudo_png || "",
                        clube_id: time.clube_id || 0,
                        escudo_time_do_coracao: "",
                        pontos: 0,
                        rodadaNaoJogada: true,
                    }));
                } else {
                    console.log(
                        `Buscando pontos reais da rodada ${rodada} para ${times.length} times`,
                    );
                    try {
                        rodadasData = await processarTimesEmLotes(
                            times,
                            rodada,
                            ligaId,
                        );
                    } catch (error) {
                        console.error(
                            `Erro ao buscar pontos da rodada ${rodada}:`,
                            error.message,
                        );
                        rodadasData = times.map((time) => ({
                            ligaId,
                            rodada,
                            timeId: time.id,
                            nome_cartola: time.nome_cartoleiro || "N/D",
                            nome_time: time.nome_time || "N/D",
                            escudo: time.url_escudo_png || "",
                            clube_id: time.clube_id || 0,
                            escudo_time_do_coracao: "",
                            pontos: 0,
                            rodadaNaoJogada: true,
                            erro: error.message.substring(0, 100),
                        }));
                    }
                }

                // ✅ USAR UPSERT PARA EVITAR DUPLICATAS
                // Ao invés de insertMany, usar bulkWrite com upsert
                if (rodadasData.length > 0) {
                    const bulkOps = rodadasData.map((data) => ({
                        updateOne: {
                            filter: {
                                ligaId: data.ligaId,
                                rodada: data.rodada,
                                timeId: data.timeId,
                            },
                            update: { $set: data },
                            upsert: true,
                        },
                    }));

                    const resultado = await Rodada.bulkWrite(bulkOps, {
                        session,
                    });

                    estatisticas.registrosInseridos +=
                        resultado.upsertedCount || 0;
                    estatisticas.registrosAtualizados +=
                        resultado.modifiedCount || 0;

                    console.log(
                        `✓ Rodada ${rodada}: ${resultado.upsertedCount || 0} inseridos, ${resultado.modifiedCount || 0} atualizados`,
                    );
                }
            }
        });

        console.log("\n=== Processo Concluído ===");
        console.log(estatisticas);

        res.status(200).json({
            message: `Rodadas ${inicioNum} a ${fimNum} ${repopularBool ? "repopuladas" : "populadas"} com sucesso`,
            estatisticas,
        });
    } catch (err) {
        console.error("Erro ao popular rodadas:", err.message);

        let errorMessage = "Erro ao popular rodadas";
        if (err.message.includes("buffering timed out")) {
            errorMessage = "Timeout na conexão com o banco de dados";
        } else if (err.message.includes("ENOTFOUND")) {
            errorMessage = "Erro ao conectar com a API do Cartola";
        }

        res.status(500).json({
            error: errorMessage,
            details: err.message,
        });
    } finally {
        await session.endSession();
    }
}

// =====================================================================
// CRIAR ÍNDICE ÚNICO (EXECUTAR UMA VEZ)
// =====================================================================
export async function criarIndiceUnico(req, res) {
    try {
        // Índice único que previne duplicatas
        await Rodada.collection.createIndex(
            { ligaId: 1, rodada: 1, timeId: 1 },
            { unique: true, background: true },
        );

        console.log("✅ Índice único criado: ligaId + rodada + timeId");

        res.json({
            success: true,
            message:
                "Índice único criado com sucesso. Duplicatas agora são impossíveis.",
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({
                error: "Existem duplicatas no banco. Execute a limpeza primeiro.",
                solucao: "node limpar-duplicatas-rodadas.js",
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
}

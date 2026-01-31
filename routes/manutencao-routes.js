// =====================================================================
// manutencao-routes.js - Modo Manutenção do App Participante v1.0
// =====================================================================
// Permite ao admin ativar/desativar um aviso amigável no app
// que bloqueia o uso normal mas permite ver ranking e rodada
// =====================================================================

import express from "express";
import { verificarAdmin } from "../middleware/auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import Liga from "../models/Liga.js";
import Rodada from "../models/Rodada.js";
import { CURRENT_SEASON } from "../config/seasons.js";
import { consolidarRankingTurno } from "../services/rankingTurnoService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "..", "config", "manutencao.json");

const CARTOLA_API = "https://api.cartola.globo.com";
const CARTOLA_HEADERS = { "User-Agent": "Super-Cartola-Manager/1.0.0", "Accept": "application/json" };

const router = express.Router();

/**
 * Lê o estado atual do modo manutenção
 */
function lerEstado() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    } catch {
        return { ativo: false };
    }
}

/**
 * Salva o estado do modo manutenção
 */
function salvarEstado(estado) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(estado, null, 2), "utf-8");
}

// GET /api/admin/manutencao - Status atual
router.get("/manutencao", (req, res) => {
    const estado = lerEstado();
    res.json(estado);
});

// POST /api/admin/manutencao/ativar - Ativa modo manutenção
router.post("/manutencao/ativar", verificarAdmin, (req, res) => {
    try {
        const estadoAtual = lerEstado();
        const estado = {
            ...estadoAtual,
            ativo: true,
            ativadoEm: new Date().toISOString(),
        };
        // Permitir atualizar whitelist e mensagem via body
        if (req.body.whitelist_timeIds) {
            estado.whitelist_timeIds = req.body.whitelist_timeIds;
        }
        if (req.body.mensagem) {
            estado.mensagem = req.body.mensagem;
        }
        salvarEstado(estado);
        console.log("[MANUTENCAO] Modo manutenção ATIVADO", {
            whitelist: estado.whitelist_timeIds || [],
        });
        res.json({ ok: true, ...estado });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao ativar:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// POST /api/admin/manutencao/desativar - Desativa modo manutenção
router.post("/manutencao/desativar", verificarAdmin, (req, res) => {
    try {
        const estadoAtual = lerEstado();
        const estado = {
            ...estadoAtual,
            ativo: false,
        };
        salvarEstado(estado);
        console.log("[MANUTENCAO] Modo manutenção DESATIVADO");
        res.json({ ok: true, ...estado });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao desativar:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// POST /api/admin/consolidar-rodada - Consolida última rodada para todas as ligas ativas
router.post("/consolidar-rodada", verificarAdmin, async (req, res) => {
    const LOG = "[CONSOLIDAR-RODADA]";
    try {
        // 1. Buscar status do mercado
        const statusRes = await axios.get(`${CARTOLA_API}/mercado/status`, {
            timeout: 10000, headers: CARTOLA_HEADERS
        });
        const mercado = statusRes.data;
        const rodadaAtual = mercado.rodada_atual;
        const statusMercado = mercado.status_mercado;

        // Determinar qual rodada consolidar
        let rodadaConsolidar;
        if (mercado.mercado_pos_rodada && statusMercado === 1) {
            // Mercado aberto pós-rodada: consolidar rodada anterior
            rodadaConsolidar = rodadaAtual - 1;
        } else if (statusMercado >= 2) {
            // Mercado fechado ou rodada em andamento/encerrada
            rodadaConsolidar = rodadaAtual;
        } else {
            // Mercado aberto sem pós-rodada (pré-temporada?)
            rodadaConsolidar = req.body.rodada || rodadaAtual - 1;
        }

        if (rodadaConsolidar < 1) {
            return res.json({ ok: false, message: "Nenhuma rodada para consolidar", mercado: { rodadaAtual, statusMercado } });
        }

        console.log(`${LOG} Mercado: status=${statusMercado}, rodada_atual=${rodadaAtual}, consolidando rodada ${rodadaConsolidar}`);

        // 2. Buscar ligas ativas da temporada atual
        const ligas = await Liga.find({ ativa: true, temporada: CURRENT_SEASON }).lean();
        console.log(`${LOG} ${ligas.length} ligas ativas encontradas`);

        const resultados = [];

        for (const liga of ligas) {
            const ligaId = liga._id;
            const ligaNome = liga.nome;
            const times = liga.participantes || [];
            const timesAtivos = times.filter(t => t.ativo !== false);

            // 3. Verificar se rodada já foi populada para esta temporada
            const jaPopulada = await Rodada.findOne({
                ligaId, rodada: rodadaConsolidar, temporada: CURRENT_SEASON
            }).lean();

            let populada = false;
            let totalInseridos = 0;

            if (!jaPopulada) {
                console.log(`${LOG} [${ligaNome}] Populando rodada ${rodadaConsolidar}...`);

                // Buscar dados de cada time via API Cartola
                const BATCH_SIZE = 5;
                const dadosTimes = [];

                for (let i = 0; i < timesAtivos.length; i += BATCH_SIZE) {
                    const batch = timesAtivos.slice(i, i + BATCH_SIZE);
                    const promessas = batch.map(async (time) => {
                        try {
                            const r = await axios.get(
                                `${CARTOLA_API}/time/id/${time.time_id}/${rodadaConsolidar}`,
                                { timeout: 10000, headers: CARTOLA_HEADERS }
                            );
                            const data = r.data;
                            return {
                                timeId: time.time_id,
                                nome_cartola: data.time?.nome_cartola || time.nome_cartola,
                                nome_time: data.time?.nome || time.nome_time,
                                escudo: data.time?.url_escudo_png || time.foto_time || "",
                                clube_id: data.time?.clube_id || time.clube_id,
                                pontos: data.pontos ?? 0,
                                rodadaNaoJogada: false,
                                atletas: (data.atletas || []).map(a => ({
                                    atleta_id: a.atleta_id,
                                    apelido: a.apelido,
                                    posicao_id: a.posicao_id,
                                    clube_id: a.clube_id,
                                    pontos_num: a.pontos_num ?? 0,
                                    status_id: a.status_id,
                                })),
                                capitao_id: data.capitao_id || null,
                                ativo: time.ativo !== false,
                            };
                        } catch (err) {
                            console.warn(`${LOG} [${ligaNome}] Erro time ${time.time_id}:`, err.message);
                            return {
                                timeId: time.time_id,
                                nome_cartola: time.nome_cartola,
                                nome_time: time.nome_time,
                                escudo: time.foto_time || "",
                                clube_id: time.clube_id,
                                pontos: 0,
                                rodadaNaoJogada: true,
                                ativo: time.ativo !== false,
                            };
                        }
                    });
                    dadosTimes.push(...await Promise.all(promessas));
                    if (i + BATCH_SIZE < timesAtivos.length) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                }

                // Ordenar por pontos e atribuir posições
                dadosTimes.sort((a, b) => b.pontos - a.pontos);
                dadosTimes.forEach((t, idx) => { t.posicao = idx + 1; });

                // Salvar no banco
                for (const time of dadosTimes) {
                    try {
                        await Rodada.findOneAndUpdate(
                            { ligaId, rodada: rodadaConsolidar, timeId: time.timeId, temporada: CURRENT_SEASON },
                            {
                                ligaId,
                                rodada: rodadaConsolidar,
                                timeId: time.timeId,
                                temporada: CURRENT_SEASON,
                                nome_cartola: time.nome_cartola,
                                nome_time: time.nome_time,
                                escudo: time.escudo,
                                clube_id: time.clube_id,
                                pontos: time.pontos,
                                posicao: time.posicao,
                                valorFinanceiro: 0,
                                totalParticipantesAtivos: dadosTimes.filter(t => t.ativo).length,
                                rodadaNaoJogada: time.rodadaNaoJogada || false,
                                atletas: time.atletas || [],
                                capitao_id: time.capitao_id || null,
                            },
                            { upsert: true, new: true, setDefaultsOnInsert: true }
                        );
                        totalInseridos++;
                    } catch (saveErr) {
                        console.error(`${LOG} Erro salvar time ${time.timeId}:`, saveErr.message);
                    }
                }

                populada = true;
                console.log(`${LOG} [${ligaNome}] ${totalInseridos} times salvos para rodada ${rodadaConsolidar}`);
            } else {
                console.log(`${LOG} [${ligaNome}] Rodada ${rodadaConsolidar} já populada`);
            }

            // 4. Consolidar ranking
            let rankingConsolidado = false;
            try {
                await consolidarRankingTurno(ligaId, "geral", rodadaConsolidar, CURRENT_SEASON);
                await consolidarRankingTurno(ligaId, "1", rodadaConsolidar, CURRENT_SEASON);
                rankingConsolidado = true;
                console.log(`${LOG} [${ligaNome}] Ranking consolidado`);
            } catch (rankErr) {
                console.error(`${LOG} [${ligaNome}] Erro ao consolidar ranking:`, rankErr.message);
            }

            resultados.push({
                liga: ligaNome,
                ligaId: String(ligaId),
                times: timesAtivos.length,
                rodada: rodadaConsolidar,
                populada,
                totalInseridos,
                jaExistia: !populada,
                rankingConsolidado,
            });
        }

        console.log(`${LOG} Consolidação concluída: ${resultados.length} ligas processadas`);

        res.json({
            ok: true,
            mercado: { rodadaAtual, statusMercado, mercadoPosRodada: mercado.mercado_pos_rodada },
            rodadaConsolidada: rodadaConsolidar,
            temporada: CURRENT_SEASON,
            resultados,
        });
    } catch (error) {
        console.error(`${LOG} Erro:`, error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

export default router;

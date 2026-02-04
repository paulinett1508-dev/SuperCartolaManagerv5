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
import crypto from "crypto";
import Liga from "../models/Liga.js";
import Rodada from "../models/Rodada.js";
import { CURRENT_SEASON } from "../config/seasons.js";
import { consolidarRankingTurno } from "../services/rankingTurnoService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "..", "config", "manutencao.json");
const TEMPLATES_PATH = path.join(__dirname, "..", "config", "manutencao-templates.json");
const UPLOADS_DIR = path.join(__dirname, "..", "public", "uploads", "manutencao");

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

/**
 * Lê os templates disponíveis
 */
function lerTemplates() {
    try {
        const raw = fs.readFileSync(TEMPLATES_PATH, "utf-8");
        return JSON.parse(raw);
    } catch {
        return { templates: [] };
    }
}

/**
 * Salva os templates
 */
function salvarTemplates(data) {
    fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/admin/manutencao - Status atual
// FIX SEC-001: Proteger endpoint com verificarAdmin
router.get("/manutencao", verificarAdmin, (req, res) => {
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
            desativadoEm: new Date().toISOString(),
        };
        salvarEstado(estado);
        console.log("[MANUTENCAO] Modo manutenção DESATIVADO");
        res.json({ ok: true, ...estado });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao desativar:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// POST /api/admin/manutencao/configurar - Configuração completa do modo manutenção
router.post("/manutencao/configurar", verificarAdmin, (req, res) => {
    try {
        const {
            ativo,
            modo,
            template_id,
            customizacao,
            controle_acesso,
            modulos_bloqueados
        } = req.body;

        const estadoAtual = lerEstado();

        // Aplicar template se informado
        let novaConfig = { ...estadoAtual };

        if (template_id) {
            const templatesData = lerTemplates();
            const template = templatesData.templates.find(t => t.id === template_id);
            if (template) {
                novaConfig.template_id = template_id;
                novaConfig.customizacao = {
                    titulo: template.titulo,
                    mensagem: template.mensagem,
                    emoji: template.emoji,
                    imagem_url: template.imagem_url,
                    cor_primaria: template.cor_primaria,
                    cor_secundaria: template.cor_secundaria,
                    gradiente: template.gradiente,
                    mostrar_ranking: template.mostrar_ranking,
                    mostrar_noticias: template.mostrar_noticias,
                    mostrar_ultima_rodada: template.mostrar_ultima_rodada,
                    icone_tipo: template.icone_tipo || "emoji"
                };
            }
        }

        // Sobrescrever com customizações específicas
        if (customizacao) {
            novaConfig.customizacao = {
                ...novaConfig.customizacao,
                ...customizacao
            };
        }

        // Atualizar modo e estado
        if (typeof ativo === 'boolean') {
            novaConfig.ativo = ativo;
            if (ativo) {
                novaConfig.ativadoEm = new Date().toISOString();
            } else {
                novaConfig.desativadoEm = new Date().toISOString();
            }
        }

        if (modo) {
            novaConfig.modo = modo;
        }

        if (controle_acesso) {
            novaConfig.controle_acesso = {
                ...novaConfig.controle_acesso,
                ...controle_acesso
            };
        }

        if (modulos_bloqueados !== undefined) {
            novaConfig.modulos_bloqueados = modulos_bloqueados;
        }

        salvarEstado(novaConfig);

        console.log("[MANUTENCAO] Configuração atualizada:", {
            ativo: novaConfig.ativo,
            modo: novaConfig.modo,
            template_id: novaConfig.template_id,
            modulos_bloqueados: novaConfig.modulos_bloqueados,
            controle_acesso: novaConfig.controle_acesso.modo_lista
        });

        res.json({ ok: true, ...novaConfig });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao configurar:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// GET /api/admin/manutencao/templates - Lista templates disponíveis
// FIX SEC-002: Proteger endpoint com verificarAdmin
router.get("/manutencao/templates", verificarAdmin, (req, res) => {
    try {
        const data = lerTemplates();
        res.json({ ok: true, templates: data.templates || [] });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao listar templates:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// POST /api/admin/manutencao/templates/custom - Cria template customizado
router.post("/manutencao/templates/custom", verificarAdmin, (req, res) => {
    try {
        const novoTemplate = req.body;

        // Validação básica
        if (!novoTemplate.id || !novoTemplate.nome) {
            return res.status(400).json({
                ok: false,
                error: "Template precisa ter 'id' e 'nome'"
            });
        }

        const data = lerTemplates();

        // Verificar se ID já existe
        const existe = data.templates.find(t => t.id === novoTemplate.id);
        if (existe) {
            return res.status(400).json({
                ok: false,
                error: "Template com este ID já existe. Use PUT para atualizar."
            });
        }

        // Adicionar template
        data.templates.push({
            id: novoTemplate.id,
            nome: novoTemplate.nome,
            emoji: novoTemplate.emoji || "⚙️",
            titulo: novoTemplate.titulo || "Modo Manutenção",
            mensagem: novoTemplate.mensagem || "O app está temporariamente indisponível.",
            cor_primaria: novoTemplate.cor_primaria || "#6b7280",
            cor_secundaria: novoTemplate.cor_secundaria || "#4b5563",
            gradiente: novoTemplate.gradiente || `linear-gradient(135deg, ${novoTemplate.cor_primaria || "#6b7280"} 0%, ${novoTemplate.cor_secundaria || "#4b5563"} 100%)`,
            mostrar_ranking: novoTemplate.mostrar_ranking !== false,
            mostrar_noticias: novoTemplate.mostrar_noticias !== false,
            mostrar_ultima_rodada: novoTemplate.mostrar_ultima_rodada !== false,
            imagem_url: novoTemplate.imagem_url || null,
            icone_tipo: novoTemplate.icone_tipo || "emoji"
        });

        salvarTemplates(data);

        console.log("[MANUTENCAO] Template customizado criado:", novoTemplate.id);
        res.json({ ok: true, template: data.templates[data.templates.length - 1] });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao criar template:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// PUT /api/admin/manutencao/templates/:id - Atualiza template existente
router.put("/manutencao/templates/:id", verificarAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const atualizacao = req.body;

        const data = lerTemplates();
        const index = data.templates.findIndex(t => t.id === id);

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error: "Template não encontrado"
            });
        }

        // Atualizar template mantendo campos não informados
        data.templates[index] = {
            ...data.templates[index],
            ...atualizacao,
            id // Garantir que ID não muda
        };

        // Atualizar gradiente se cores foram alteradas
        if (atualizacao.cor_primaria || atualizacao.cor_secundaria) {
            const cor1 = atualizacao.cor_primaria || data.templates[index].cor_primaria;
            const cor2 = atualizacao.cor_secundaria || data.templates[index].cor_secundaria;
            data.templates[index].gradiente = `linear-gradient(135deg, ${cor1} 0%, ${cor2} 100%)`;
        }

        salvarTemplates(data);

        console.log("[MANUTENCAO] Template atualizado:", id);
        res.json({ ok: true, template: data.templates[index] });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao atualizar template:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// POST /api/admin/manutencao/upload-imagem - Upload de imagem customizada
router.post("/manutencao/upload-imagem", verificarAdmin, (req, res) => {
    try {
        const { imagem, nome } = req.body;

        if (!imagem) {
            return res.status(400).json({
                ok: false,
                error: "Campo 'imagem' é obrigatório (base64)"
            });
        }

        // Criar diretório se não existir
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }

        // Extrair dados da imagem base64
        const matches = imagem.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({
                ok: false,
                error: "Formato de imagem inválido. Use base64 com data:image/..."
            });
        }

        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // FIX SEC-003: Validar magic bytes (não confiar no header)
        const magicBytes = buffer.slice(0, 8).toString('hex');
        const validFormats = {
            '89504e47': { ext: 'png', name: 'PNG' },           // PNG: 89 50 4E 47
            'ffd8ffe0': { ext: 'jpg', name: 'JPEG' },         // JPEG/JFIF
            'ffd8ffe1': { ext: 'jpg', name: 'JPEG' },         // JPEG/Exif
            'ffd8ffe2': { ext: 'jpg', name: 'JPEG' },         // JPEG/Canon
            'ffd8ffe3': { ext: 'jpg', name: 'JPEG' },         // JPEG/Samsung
            'ffd8ffe8': { ext: 'jpg', name: 'JPEG' },         // JPEG/SPIFF
            'ffd8ffdb': { ext: 'jpg', name: 'JPEG' }          // JPEG
        };

        const fileType = validFormats[magicBytes.slice(0, 8)];
        if (!fileType) {
            console.warn(`[MANUTENCAO] [SEC] Upload rejeitado - magic bytes inválidos: ${magicBytes.slice(0, 8)}`);
            return res.status(400).json({
                ok: false,
                error: "Formato de arquivo inválido. Apenas PNG e JPEG são permitidos."
            });
        }

        const ext = fileType.ext;
        console.log(`[MANUTENCAO] [SEC] Upload validado: ${fileType.name} (magic bytes: ${magicBytes.slice(0, 8)})`);

        // Validar tamanho (max 2MB)
        if (buffer.length > 2 * 1024 * 1024) {
            return res.status(400).json({
                ok: false,
                error: "Imagem muito grande. Máximo: 2MB"
            });
        }

        // Gerar nome único
        const hash = crypto.randomBytes(8).toString('hex');
        const nomeArquivo = nome
            ? `${nome.replace(/[^a-z0-9]/gi, '-')}-${hash}.${ext}`
            : `manutencao-${hash}.${ext}`;

        const caminhoCompleto = path.join(UPLOADS_DIR, nomeArquivo);

        // Salvar arquivo
        fs.writeFileSync(caminhoCompleto, buffer);

        const url = `/uploads/manutencao/${nomeArquivo}`;

        console.log("[MANUTENCAO] Imagem enviada:", url);
        res.json({
            ok: true,
            url,
            tamanho: buffer.length,
            tipo: ext
        });
    } catch (error) {
        console.error("[MANUTENCAO] Erro ao fazer upload:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// GET /api/admin/rodadas/consolidadas - Lista rodadas que já foram consolidadas
router.get("/rodadas/consolidadas", verificarAdmin, async (req, res) => {
    try {
        // Buscar rodadas distintas que existem na collection rodadas (para a temporada atual)
        const rodadasDistintas = await Rodada.distinct("rodada", { temporada: CURRENT_SEASON });
        const resultado = rodadasDistintas
            .sort((a, b) => a - b)
            .map(r => ({ rodada: r }));
        res.json(resultado);
    } catch (error) {
        console.error("[RODADAS-CONSOLIDADAS] Erro:", error.message);
        res.status(500).json([]);
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

import express from "express";
import session from "express-session";
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import { getGloboOidcConfig } from "../config/globo-oauth.js";
import cartolaProService from "../services/cartolaProService.js";

const router = express.Router();

// Middleware de autenticação Replit (Legado/Admin)
function verificarAutenticacao(req, res, next) {
    if (req.headers["x-replit-user-id"]) {
        req.user = {
            id: req.headers["x-replit-user-id"],
            name: req.headers["x-replit-user-name"],
            roles: req.headers["x-replit-user-roles"],
        };
        return next();
    }
    res.status(401).json({ erro: "Não autenticado" });
}

// Middleware para verificar sessão de participante ativo
function verificarSessaoParticipante(req, res, next) {
    if (!req.session || !req.session.participante) {
        return res.status(401).json({
            error: "Sessão expirada ou inválida",
            needsLogin: true,
        });
    }
    next();
}

// =====================================================================
// GET /check-assinante/:timeId - Verifica se time e assinante
// =====================================================================
router.get("/check-assinante/:timeId", async (req, res) => {
    try {
        const { timeId } = req.params;

        if (!timeId || isNaN(parseInt(timeId))) {
            return res.status(400).json({ assinante: false, error: "ID invalido" });
        }

        const { default: Time } = await import("../models/Time.js");
        const time = await Time.findOne({ id: parseInt(timeId) }).select("assinante nome_cartola");

        res.json({
            assinante: time?.assinante === true,
            nomeCartola: time?.nome_cartola || null
        });

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro ao verificar assinante:", error);
        res.json({ assinante: false });
    }
});

// =====================================================================
// REGISTRY DE STRATEGIES PARA LOGIN UNIFICADO
// =====================================================================
const registeredUnifiedStrategies = new Set();

// Função de verify compartilhada
const globoVerifyCallback = async (tokens, done) => {
    try {
        const claims = tokens.claims();
        const user = {
            globo_id: claims.globo_id || claims.sub,
            glbid: claims.glbid || claims.fs_id,
            email: claims.email,
            nome: claims.name || claims.preferred_username,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: claims.exp
        };
        done(null, user);
    } catch (error) {
        done(error);
    }
};

function ensureUnifiedGloboStrategy(domain, config, isPopup = false) {
    const suffix = isPopup ? ':popup' : '';
    const strategyName = `globo-unified:${domain}${suffix}`;
    const callbackPath = isPopup
        ? '/api/participante/auth/globo/popup/callback'
        : '/api/participante/auth/globo/callback';

    if (!registeredUnifiedStrategies.has(strategyName)) {
        console.log("[PARTICIPANTE-AUTH] Criando strategy para:", strategyName);

        const strategy = new Strategy(
            {
                name: strategyName,
                config,
                scope: "openid email profile",
                callbackURL: `https://${domain}${callbackPath}`
            },
            globoVerifyCallback
        );

        passport.use(strategy);
        registeredUnifiedStrategies.add(strategyName);
    }

    return strategyName;
}

// =====================================================================
// GET /globo/login - Inicia fluxo OAuth para login unificado
// =====================================================================
router.get("/globo/login", async (req, res, next) => {
    console.log("[PARTICIPANTE-AUTH] Iniciando OAuth unificado...");

    try {
        const config = await getGloboOidcConfig();
        const strategyName = ensureUnifiedGloboStrategy(req.hostname, config);

        passport.authenticate(strategyName, {
            prompt: "login consent",
            scope: ["openid", "email", "profile"]
        })(req, res, next);

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro ao iniciar OAuth:", error);
        res.redirect("/participante-login.html?error=oauth_init_failed");
    }
});

// =====================================================================
// GET /globo/callback - Processa retorno OAuth e cria sessao unificada
// =====================================================================
router.get("/globo/callback", async (req, res, next) => {
    console.log("[PARTICIPANTE-AUTH] Callback OAuth unificado recebido");

    if (req.query.error) {
        console.error("[PARTICIPANTE-AUTH] Erro retornado pela Globo:", req.query.error);
        return res.redirect(`/participante-login.html?error=${req.query.error}`);
    }

    try {
        const config = await getGloboOidcConfig();
        const strategyName = ensureUnifiedGloboStrategy(req.hostname, config);

        passport.authenticate(strategyName, {
            failureRedirect: "/participante-login.html?error=oauth_failed"
        })(req, res, async (err) => {
            if (err || !req.user) {
                console.error("[PARTICIPANTE-AUTH] Erro no callback:", err?.message);
                return res.redirect("/participante-login.html?error=oauth_callback_error");
            }

            try {
                // 1. Obter token para API Globo
                const glbToken = req.user.glbid || req.user.access_token;

                if (!glbToken) {
                    return res.redirect("/participante-login.html?error=no_token");
                }

                // 2. Buscar time_id via API Globo /auth/time
                const timeResult = await cartolaProService.buscarMeuTime(glbToken);

                if (!timeResult.success || !timeResult.time?.timeId) {
                    console.error("[PARTICIPANTE-AUTH] Nao foi possivel obter time_id da Globo");
                    return res.redirect("/participante-login.html?error=no_time_globo");
                }

                const timeIdGlobo = timeResult.time.timeId;
                console.log("[PARTICIPANTE-AUTH] Time ID obtido da Globo:", timeIdGlobo);

                // 3. Verificar se time e assinante
                const { default: Time } = await import("../models/Time.js");
                // ✅ v2.3: Incluir nome_cartoleiro para fallback
                const timeData = await Time.findOne({ id: timeIdGlobo }).select("assinante nome_cartola nome_cartoleiro nome_time clube_id url_escudo_png");

                if (!timeData || !timeData.assinante) {
                    console.warn("[PARTICIPANTE-AUTH] Time nao e assinante:", timeIdGlobo);
                    return res.redirect("/participante-login.html?error=not_subscriber");
                }

                // 4. Buscar liga do participante
                const { default: Liga } = await import("../models/Liga.js");
                const ligaEncontrada = await Liga.findOne({
                    "participantes.time_id": timeIdGlobo
                });

                if (!ligaEncontrada) {
                    console.warn("[PARTICIPANTE-AUTH] Time nao encontrado em nenhuma liga:", timeIdGlobo);
                    return res.redirect("/participante-login.html?error=no_league");
                }

                // 5. Extrair dados do participante
                const participanteEncontrado = ligaEncontrada.participantes.find(
                    (p) => String(p.time_id) === String(timeIdGlobo)
                );

                // 6. Montar dados reais do time
                // ✅ v2.3: Incluir fallback para nome_cartoleiro
                const dadosReais = {
                    nome_cartola: timeData.nome_cartola || timeData.nome_cartoleiro || participanteEncontrado?.nome_cartola || "Cartoleiro",
                    nome_time: timeData.nome_time || participanteEncontrado?.nome_time || "Meu Time",
                    foto_perfil: participanteEncontrado?.foto_perfil || "",
                    foto_time: timeData.url_escudo_png || "",
                    clube_id: timeData.clube_id || participanteEncontrado?.clube_id || null
                };

                // 7. Configurar sessao longa (365 dias para login Globo)
                const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
                req.session.cookie.maxAge = ONE_YEAR;

                // 8. CRIAR SESSAO UNIFICADA
                // Sessao participante (navegacao do app)
                req.session.participante = {
                    timeId: String(timeIdGlobo),
                    ligaId: ligaEncontrada._id.toString(),
                    participante: dadosReais
                };

                // Sessao Cartola PRO (funcionalidades premium)
                req.session.cartolaProAuth = {
                    globo_id: req.user.globo_id,
                    glbid: glbToken,
                    email: req.user.email,
                    nome: req.user.nome,
                    access_token: req.user.access_token,
                    refresh_token: req.user.refresh_token,
                    expires_at: req.user.expires_at,
                    authenticated_at: Date.now(),
                    method: "unified_oauth"
                };

                // 9. Salvar sessao
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error("[PARTICIPANTE-AUTH] Erro ao salvar sessao unificada:", saveErr);
                        return res.redirect("/participante-login.html?error=session_save_error");
                    }

                    console.log("[PARTICIPANTE-AUTH] Sessao unificada criada com sucesso:", {
                        timeId: timeIdGlobo,
                        email: req.user.email
                    });

                    // Redirecionar para app do participante
                    res.redirect("/participante/");
                });

            } catch (innerError) {
                console.error("[PARTICIPANTE-AUTH] Erro ao criar sessao unificada:", innerError);
                res.redirect("/participante-login.html?error=session_error");
            }
        });

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro no callback (catch):", error);
        res.redirect("/participante-login.html?error=oauth_exception");
    }
});

// =====================================================================
// POST /globo/direct - Login direto Globo (email/senha) para dominios customizados
// =====================================================================
router.post("/globo/direct", async (req, res) => {
    console.log("[PARTICIPANTE-AUTH] Login direto Globo...");

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email e senha sao obrigatorios"
            });
        }

        // 1. Autenticar na Globo
        const authResult = await cartolaProService.autenticar(email, password);

        if (!authResult.success) {
            return res.status(401).json({
                success: false,
                error: authResult.error || "Credenciais invalidas"
            });
        }

        const glbToken = authResult.glbId;

        // 2. Buscar time_id via API Globo /auth/time
        const timeResult = await cartolaProService.buscarMeuTime(glbToken);

        if (!timeResult.success || !timeResult.time?.timeId) {
            return res.status(400).json({
                success: false,
                error: "Nao foi possivel obter seu time da conta Globo"
            });
        }

        const timeIdGlobo = timeResult.time.timeId;
        console.log("[PARTICIPANTE-AUTH] Time ID obtido via login direto:", timeIdGlobo);

        // 3. Verificar se time e assinante
        const { default: Time } = await import("../models/Time.js");
        // ✅ v2.3: Incluir nome_cartoleiro para fallback
        const timeData = await Time.findOne({ id: timeIdGlobo }).select("assinante nome_cartola nome_cartoleiro nome_time clube_id url_escudo_png");

        if (!timeData || !timeData.assinante) {
            return res.status(403).json({
                success: false,
                error: "Esta conta nao e assinante PRO"
            });
        }

        // 4. Buscar liga do participante
        const { default: Liga } = await import("../models/Liga.js");
        const ligaEncontrada = await Liga.findOne({
            "participantes.time_id": timeIdGlobo
        });

        if (!ligaEncontrada) {
            return res.status(404).json({
                success: false,
                error: "Time nao encontrado em nenhuma liga cadastrada"
            });
        }

        // 5. Extrair dados do participante
        const participanteEncontrado = ligaEncontrada.participantes.find(
            (p) => String(p.time_id) === String(timeIdGlobo)
        );

        // 6. Montar dados reais
        // ✅ v2.3: Incluir fallback para nome_cartoleiro
        const dadosReais = {
            nome_cartola: timeData.nome_cartola || timeData.nome_cartoleiro || participanteEncontrado?.nome_cartola || "Cartoleiro",
            nome_time: timeData.nome_time || participanteEncontrado?.nome_time || "Meu Time",
            foto_perfil: participanteEncontrado?.foto_perfil || "",
            foto_time: timeData.url_escudo_png || "",
            clube_id: timeData.clube_id || participanteEncontrado?.clube_id || null
        };

        // 7. Configurar sessao longa
        const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
        req.session.cookie.maxAge = ONE_YEAR;

        // 8. CRIAR SESSAO UNIFICADA
        req.session.participante = {
            timeId: String(timeIdGlobo),
            ligaId: ligaEncontrada._id.toString(),
            participante: dadosReais
        };

        req.session.cartolaProAuth = {
            glbid: glbToken,
            email: email,
            authenticated_at: Date.now(),
            method: "unified_direct"
        };

        // 9. Salvar sessao
        req.session.save((saveErr) => {
            if (saveErr) {
                console.error("[PARTICIPANTE-AUTH] Erro ao salvar sessao:", saveErr);
                return res.status(500).json({
                    success: false,
                    error: "Erro ao criar sessao"
                });
            }

            console.log("[PARTICIPANTE-AUTH] Sessao unificada (direct) criada:", timeIdGlobo);

            res.json({
                success: true,
                participante: {
                    nome: dadosReais.nome_cartola,
                    time: dadosReais.nome_time
                }
            });
        });

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro no login direto:", error);
        res.status(500).json({
            success: false,
            error: "Erro interno ao processar login"
        });
    }
});

// LOGIN OTIMIZADO - Busca Direta no MongoDB (Sem carregar tudo na memória)
router.post("/login", async (req, res) => {
    try {
        const { timeId, senha, lembrar } = req.body;

        console.log('[PARTICIPANTE-AUTH] 🔐 Tentativa de login:', { timeId, lembrar });

        if (!timeId || !senha) {
            return res.status(400).json({
                error: "ID do time e senha são obrigatórios",
            });
        }

        const { default: Liga } = await import("../models/Liga.js");

        // ⚡ OTIMIZAÇÃO: Busca apenas a liga que contém este participante
        // Procura em qualquer liga onde 'participantes.time_id' seja igual ao timeId fornecido
        const ligaEncontrada = await Liga.findOne({
            "participantes.time_id": parseInt(timeId),
        });

        if (!ligaEncontrada) {
            console.log('[PARTICIPANTE-AUTH] ❌ Time não encontrado em nenhuma liga');
            return res.status(404).json({
                error: "Time não encontrado em nenhuma liga cadastrada",
            });
        }

        // Extrair o participante do array da liga
        const participanteEncontrado = ligaEncontrada.participantes.find(
            (p) => String(p.time_id) === String(timeId),
        );

        if (!participanteEncontrado) {
            // Caso raro onde o índice achou mas o find não (segurança extra)
            console.log('[PARTICIPANTE-AUTH] ❌ Erro ao localizar participante no array');
            return res
                .status(404)
                .json({ error: "Erro ao localizar dados do participante" });
        }

        // Validar senha
        // Nota: Idealmente usaríamos bcrypt, mas mantendo compatibilidade com texto simples atual
        if (participanteEncontrado.senha_acesso !== senha) {
            console.log('[PARTICIPANTE-AUTH] ❌ Senha incorreta');
            return res.status(401).json({
                error: "Senha incorreta",
            });
        }

        // ✅ BUSCAR DADOS REAIS DO TIME DA API CARTOLA
        // ✅ v2.3: Incluir fallback para nome_cartoleiro (campo alternativo no schema)
        let dadosReais = {
            nome_cartola: participanteEncontrado.nome_cartola || participanteEncontrado.nome_cartoleiro || 'Cartoleiro',
            nome_time: participanteEncontrado.nome_time || 'Meu Time',
            foto_perfil: participanteEncontrado.foto_perfil || '',
            foto_time: participanteEncontrado.foto_time || '',
            clube_id: participanteEncontrado.clube_id || null
        };

        try {
            const { default: Time } = await import("../models/Time.js");
            // ✅ v2.3: Corrigido - campo correto é 'id', não 'time_id'
            const timeReal = await Time.findOne({ id: parseInt(timeId) }).lean();

            if (timeReal) {
                dadosReais = {
                    nome_cartola: timeReal.nome_cartola || timeReal.nome_cartoleiro || participanteEncontrado.nome_cartola || 'Cartoleiro',
                    nome_time: timeReal.nome_time || timeReal.nome || participanteEncontrado.nome_time || 'Meu Time',
                    foto_perfil: timeReal.foto_perfil || participanteEncontrado.foto_perfil || '',
                    foto_time: timeReal.url_escudo_png || timeReal.foto_time || participanteEncontrado.foto_time || '',
                    clube_id: timeReal.clube_id || participanteEncontrado.clube_id || null
                };
                console.log('[PARTICIPANTE-AUTH] ✅ Dados reais encontrados:', dadosReais);
            } else {
                console.warn('[PARTICIPANTE-AUTH] ⚠️ Time não encontrado no banco, usando dados da liga');
            }
        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] ❌ Erro ao buscar dados do time:', error);
        }

        // 🔐 LÓGICA DE SESSÃO DINÂMICA (Manter Conectado)
        // Se o usuário marcou "Manter conectado": 365 dias
        // Se não marcou: 24 horas (padrão de segurança)
        const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
        const ONE_DAY = 1000 * 60 * 60 * 24;

        req.session.cookie.maxAge = lembrar ? ONE_YEAR : ONE_DAY;

        console.log('[PARTICIPANTE-AUTH] ⏰ Cookie maxAge definido:', lembrar ? '365 dias' : '24 horas');

        // Criar sessão com dados reais
        req.session.participante = {
            timeId: timeId,
            ligaId: ligaEncontrada._id.toString(),
            participante: dadosReais,
        };

        console.log('[PARTICIPANTE-AUTH] 💾 Sessão criada para:', { timeId, ligaId: ligaEncontrada._id.toString() });

        // Forçar salvamento da sessão
        req.session.save((err) => {
            if (err) {
                console.error("[PARTICIPANTE-AUTH] ❌ Erro ao salvar sessão:", err);
                return res.status(500).json({ error: "Erro ao criar sessão" });
            }

            console.log('[PARTICIPANTE-AUTH] ✅ Sessão salva com sucesso');
            console.log('[PARTICIPANTE-AUTH] Session ID:', req.sessionID);

            // ✅ Adicionar headers de cache-control
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            res.json({
                success: true,
                message: "Login realizado com sucesso",
                participante: {
                    // ✅ v2.3: Usar dadosReais que já tem fallbacks corretos
                    nome: dadosReais.nome_cartola,
                    time: dadosReais.nome_time,
                },
            });
        });
    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] ❌ Erro no login:", error);
        res.status(500).json({ error: "Erro interno ao processar login" });
    }
});

// GET - Verificar sessão (Mais robusto)
router.get("/session", async (req, res) => {
    try {
        console.log('[PARTICIPANTE-AUTH] Verificando sessão:');
        console.log('  - Session ID:', req.sessionID);
        console.log('  - Session participante:', req.session?.participante ? '✅ EXISTE' : '❌ NÃO EXISTE');
        console.log('  - Session data:', JSON.stringify(req.session?.participante || {}));

        if (!req.session || !req.session.participante) {
            console.log('[PARTICIPANTE-AUTH] ❌ Sessão inválida/expirada');
            return res.status(401).json({
                authenticated: false,
                message: "Não autenticado",
            });
        }

        // Buscar dados atualizados do time (opcional, mas bom para UX)
        const { default: Time } = await import("../models/Time.js");
        const timeId = req.session.participante.timeId;

        let timeData = null;
        if (timeId) {
            // ✅ v2.4: Converter timeId para Number explicitamente (campo id no schema é Number)
            const timeIdNum = Number(timeId);
            console.log('[PARTICIPANTE-AUTH] Buscando time no banco:', { timeId, timeIdNum, isNaN: isNaN(timeIdNum) });

            if (!isNaN(timeIdNum)) {
                timeData = await Time.findOne({ id: timeIdNum }).select(
                    "nome nome_time nome_cartola nome_cartoleiro clube_id url_escudo_png assinante",
                );
                console.log('[PARTICIPANTE-AUTH] Time encontrado:', timeData ? '✅ SIM' : '❌ NÃO', timeData ? { nome_time: timeData.nome_time, nome_cartola: timeData.nome_cartola, nome_cartoleiro: timeData.nome_cartoleiro } : null);
            }
        }

        // ✅ Adicionar headers de cache-control para evitar cache agressivo
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        // ✅ v2.4: Construir dados com fallbacks robustos
        const sessionData = req.session.participante;
        const dadosParticipante = sessionData.participante || {};

        // ✅ v2.4: Log detalhado para debug
        console.log('[PARTICIPANTE-AUTH] 📊 Dados para composição:', {
            timeId,
            timeDataEncontrado: !!timeData,
            timeData_nome_time: timeData?.nome_time,
            timeData_nome_cartola: timeData?.nome_cartola,
            timeData_nome_cartoleiro: timeData?.nome_cartoleiro,
            sessao_nome_time: dadosParticipante.nome_time,
            sessao_nome_cartola: dadosParticipante.nome_cartola
        });

        // Priorizar dados do banco (frescos) sobre dados da sessão (podem estar desatualizados)
        const nomeCartola = timeData?.nome_cartola || timeData?.nome_cartoleiro ||
                            dadosParticipante.nome_cartola || dadosParticipante.nome_cartoleiro || "Cartoleiro";
        const nomeTime = timeData?.nome_time || timeData?.nome ||
                         dadosParticipante.nome_time || dadosParticipante.nome || "Meu Time";

        console.log('[PARTICIPANTE-AUTH] ✅ Sessão válida - retornando:', { timeId, nomeTime, nomeCartola });
        const clubeId = timeData?.clube_id || dadosParticipante.clube_id || null;

        res.json({
            authenticated: true,
            participante: {
                ...sessionData,
                // ✅ v2.3: Sobrescrever dados do participante com valores atualizados
                participante: {
                    ...dadosParticipante,
                    nome_cartola: nomeCartola,
                    nome_time: nomeTime,
                    clube_id: clubeId,
                    foto_time: timeData?.url_escudo_png || dadosParticipante.foto_time || ""
                },
                assinante: timeData?.assinante || false,
                time: timeData
                    ? {
                          nome: nomeTime,
                          nome_cartola: nomeCartola,
                          nome_time: nomeTime,
                          clube_id: clubeId,
                          url_escudo_png: timeData.url_escudo_png,
                      }
                    : null,
            },
        });
    } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        // Não retornar 500 aqui para não quebrar o frontend, apenas deslogar
        res.status(401).json({
            authenticated: false,
            error: "Sessão inválida",
        });
    }
});

// Buscar todas as ligas que o participante faz parte
router.get("/minhas-ligas", verificarSessaoParticipante, async (req, res) => {
    try {
        const { timeId } = req.session.participante;

        if (!timeId) {
            return res
                .status(400)
                .json({ error: "Time ID não encontrado na sessão" });
        }

        const { default: Liga } = await import("../models/Liga.js");

        // Busca otimizada: Retorna apenas ID, nome e descrição
        const ligas = await Liga.find({
            "participantes.time_id": parseInt(timeId),
        })
            .select("_id nome descricao status ativa logo")
            .lean();

        res.json({
            success: true,
            ligas: ligas.map((liga) => ({
                id: liga._id.toString(),
                nome: liga.nome,
                descricao: liga.descricao || "",
                status: liga.status || (liga.ativa !== false ? 'ativa' : 'aposentada'),
                ativa: liga.ativa !== false,
                logo: liga.logo || null,
            })),
        });
    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro ao buscar ligas:", error);
        res.status(500).json({ error: "Erro ao buscar ligas" });
    }
});

// Trocar de liga (atualizar sessão)
router.post("/trocar-liga", verificarSessaoParticipante, async (req, res) => {
    try {
        const { ligaId } = req.body;
        const { timeId } = req.session.participante;

        if (!ligaId)
            return res.status(400).json({ error: "Liga ID não fornecido" });

        const { default: Liga } = await import("../models/Liga.js");
        const liga = await Liga.findById(ligaId);

        if (!liga)
            return res.status(404).json({ error: "Liga não encontrada" });

        const participante = liga.participantes.find(
            (p) => String(p.time_id) === String(timeId),
        );

        if (!participante) {
            return res
                .status(403)
                .json({ error: "Você não participa desta liga" });
        }

        // Atualizar sessão
        req.session.participante.ligaId = ligaId;

        req.session.save((err) => {
            if (err)
                return res
                    .status(500)
                    .json({ error: "Erro ao salvar troca de liga" });

            res.json({
                success: true,
                message: "Liga alterada com sucesso",
                ligaNome: liga.nome,
            });
        });
    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro ao trocar liga:", error);
        res.status(500).json({ error: "Erro ao trocar liga" });
    }
});

// Rota para verificar status (Simplified Check)
router.get("/check", (req, res) => {
    if (req.session && req.session.participante) {
        res.json({
            authenticated: true,
            participante: {
                timeId: req.session.participante.timeId,
                nome: req.session.participante.participante.nome_cartola,
                time: req.session.participante.participante.nome_time,
            },
        });
    } else {
        res.json({ authenticated: false, needsLogin: true });
    }
});

// Logout Otimizado
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Erro ao destruir sessão:", err);
            return res.status(500).json({ error: "Erro ao fazer logout" });
        }
        res.clearCookie("connect.sid"); // Limpar cookie no navegador
        res.json({ success: true, message: "Logout realizado com sucesso" });
    });
});

// Rota de extrato do participante (Proxy interno)
router.get(
    "/extrato/:timeId/:ligaId",
    verificarAutenticacao,
    async (req, res) => {
        try {
            const { timeId, ligaId } = req.params;
            // ... (Mantido código original de proxy interno) ...
            const extratoUrl = `/api/extrato-cache/${ligaId}/times/${timeId}/cache`;

            // Importar axios dinamicamente se necessário ou usar o global
            const axios = (await import("axios")).default;

            const baseURL =
                process.env.BASE_URL ||
                `http://localhost:${process.env.PORT || 3000}`;
            const response = await axios.get(`${baseURL}${extratoUrl}`, {
                params: req.query,
            });

            res.json(response.data);
        } catch (error) {
            console.error(
                "[PARTICIPANTE-AUTH] Erro ao buscar extrato:",
                error.message,
            );
            res.status(error.response?.status || 500).json({
                success: false,
                message: "Erro ao buscar extrato",
            });
        }
    },
);

// =====================================================================
// POPUP OAUTH - Para domínios customizados (cross-origin)
// Fluxo: Popup abre no Replit -> OAuth Globo -> Retorna token -> Janela pai cria sessão local
// =====================================================================

// GET /globo/popup - Inicia OAuth em modo popup
router.get("/globo/popup", async (req, res, next) => {
    console.log("[PARTICIPANTE-AUTH] Iniciando OAuth via popup...");

    // Salvar origem do request para usar no callback
    const origin = req.query.origin || req.headers.referer || '';
    req.session.popupOrigin = origin;

    try {
        const config = await getGloboOidcConfig();
        // Usar strategy com callback de popup
        const strategyName = ensureUnifiedGloboStrategy(req.hostname, config, true);

        passport.authenticate(strategyName, {
            prompt: "login consent",
            scope: ["openid", "email", "profile"]
        })(req, res, next);

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro ao iniciar OAuth popup:", error);
        res.send(gerarHtmlPopupErro('oauth_init_failed', 'Erro ao iniciar conexão com Globo'));
    }
});

// GET /globo/popup/callback - Callback do OAuth que envia resultado via postMessage
router.get("/globo/popup/callback", async (req, res) => {
    console.log("[PARTICIPANTE-AUTH] Callback OAuth popup recebido");

    if (req.query.error) {
        console.error("[PARTICIPANTE-AUTH] Erro retornado pela Globo:", req.query.error);
        return res.send(gerarHtmlPopupErro(req.query.error, 'Erro na autenticação Globo'));
    }

    try {
        const config = await getGloboOidcConfig();
        // Usar strategy com callback de popup
        const strategyName = ensureUnifiedGloboStrategy(req.hostname, config, true);

        passport.authenticate(strategyName, {
            failureRedirect: "/api/participante/auth/globo/popup/error"
        })(req, res, async (err) => {
            if (err || !req.user) {
                console.error("[PARTICIPANTE-AUTH] Erro no callback popup:", err?.message);
                return res.send(gerarHtmlPopupErro('oauth_callback_error', 'Erro ao processar autenticação'));
            }

            try {
                // Obter token GLB
                const glbToken = req.user.glbid || req.user.access_token;

                if (!glbToken) {
                    return res.send(gerarHtmlPopupErro('no_token', 'Token não recebido'));
                }

                // Buscar time_id via API Globo
                const timeResult = await cartolaProService.buscarMeuTime(glbToken);

                if (!timeResult.success || !timeResult.time?.timeId) {
                    return res.send(gerarHtmlPopupErro('no_time_globo', 'Não foi possível obter seu time'));
                }

                const timeIdGlobo = timeResult.time.timeId;

                // Verificar se é assinante
                const { default: Time } = await import("../models/Time.js");
                // ✅ v2.3: Incluir nome_cartoleiro para fallback
                const timeData = await Time.findOne({ id: timeIdGlobo }).select("assinante nome_cartola nome_cartoleiro nome_time clube_id");

                if (!timeData || !timeData.assinante) {
                    return res.send(gerarHtmlPopupErro('not_subscriber', 'Esta conta não é assinante PRO'));
                }

                console.log("[PARTICIPANTE-AUTH] OAuth popup bem-sucedido para time:", timeIdGlobo);

                // Enviar glbToken e dados para janela pai via postMessage
                // A janela pai criará a sessão localmente chamando /globo/create-session
                res.send(gerarHtmlPopupSucesso(glbToken, timeIdGlobo, timeData));

            } catch (innerError) {
                console.error("[PARTICIPANTE-AUTH] Erro ao processar popup callback:", innerError);
                res.send(gerarHtmlPopupErro('session_error', 'Erro interno'));
            }
        });

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro no callback popup (catch):", error);
        res.send(gerarHtmlPopupErro('oauth_exception', 'Erro inesperado'));
    }
});

// POST /globo/create-session - Cria sessão a partir do token GLB (para domínios customizados)
// Este endpoint recebe o glbToken obtido via popup e cria a sessão LOCAL
router.post("/globo/create-session", async (req, res) => {
    console.log("[PARTICIPANTE-AUTH] Criando sessão via glbToken...");

    const { glbToken, timeId } = req.body;

    if (!glbToken || !timeId) {
        return res.status(400).json({
            success: false,
            error: "Token e timeId são obrigatórios"
        });
    }

    try {
        // 1. Validar token chamando API Globo
        const timeResult = await cartolaProService.buscarMeuTime(glbToken);

        if (!timeResult.success) {
            return res.status(401).json({
                success: false,
                error: timeResult.error || "Token inválido ou expirado"
            });
        }

        // 2. Verificar se timeId corresponde
        if (String(timeResult.time?.timeId) !== String(timeId)) {
            return res.status(401).json({
                success: false,
                error: "TimeId não corresponde ao token"
            });
        }

        const timeIdGlobo = timeResult.time.timeId;

        // 3. Verificar se é assinante
        const { default: Time } = await import("../models/Time.js");
        // ✅ v2.3: Incluir nome_cartoleiro para fallback
        const timeData = await Time.findOne({ id: timeIdGlobo }).select("assinante nome_cartola nome_cartoleiro nome_time clube_id url_escudo_png");

        if (!timeData || !timeData.assinante) {
            return res.status(403).json({
                success: false,
                error: "Esta conta não é assinante PRO"
            });
        }

        // 4. Buscar liga do participante
        const { default: Liga } = await import("../models/Liga.js");
        const ligaEncontrada = await Liga.findOne({
            "participantes.time_id": timeIdGlobo
        });

        if (!ligaEncontrada) {
            return res.status(404).json({
                success: false,
                error: "Time não encontrado em nenhuma liga cadastrada"
            });
        }

        // 5. Extrair dados do participante
        const participanteEncontrado = ligaEncontrada.participantes.find(
            (p) => String(p.time_id) === String(timeIdGlobo)
        );

        // ✅ v2.3: Incluir fallback para nome_cartoleiro
        const dadosReais = {
            nome_cartola: timeData.nome_cartola || timeData.nome_cartoleiro || participanteEncontrado?.nome_cartola || "Cartoleiro",
            nome_time: timeData.nome_time || participanteEncontrado?.nome_time || "Meu Time",
            foto_perfil: participanteEncontrado?.foto_perfil || "",
            foto_time: timeData.url_escudo_png || "",
            clube_id: timeData.clube_id || participanteEncontrado?.clube_id || null
        };

        // 6. Configurar sessão longa (365 dias)
        const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
        req.session.cookie.maxAge = ONE_YEAR;

        // 7. CRIAR SESSÃO UNIFICADA
        req.session.participante = {
            timeId: String(timeIdGlobo),
            ligaId: ligaEncontrada._id.toString(),
            participante: dadosReais
        };

        req.session.cartolaProAuth = {
            glbid: glbToken,
            authenticated_at: Date.now(),
            method: "popup_create_session"
        };

        req.session.save((saveErr) => {
            if (saveErr) {
                console.error("[PARTICIPANTE-AUTH] Erro ao salvar sessão:", saveErr);
                return res.status(500).json({
                    success: false,
                    error: "Erro ao criar sessão"
                });
            }

            console.log("[PARTICIPANTE-AUTH] Sessão criada via create-session:", timeIdGlobo);

            res.json({
                success: true,
                participante: {
                    nome: dadosReais.nome_cartola,
                    time: dadosReais.nome_time,
                    timeId: timeIdGlobo
                }
            });
        });

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro no create-session:", error);
        res.status(500).json({
            success: false,
            error: "Erro interno ao criar sessão"
        });
    }
});

// =====================================================================
// HELPERS - Gerar HTML para popup
// =====================================================================

function gerarHtmlPopupSucesso(glbToken, timeId, timeData) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Autenticação Concluída</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container {
            padding: 32px;
            max-width: 400px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 8px;
            color: #4ade80;
        }
        p {
            color: rgba(255,255,255,0.6);
            margin-bottom: 24px;
        }
        .info {
            background: rgba(255,255,255,0.1);
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 24px;
        }
        .info-label {
            font-size: 12px;
            color: rgba(255,255,255,0.4);
        }
        .info-value {
            font-size: 18px;
            font-weight: 600;
            color: #ff4500;
        }
        .close-msg {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>Autenticação Concluída!</h1>
        <p>Sua conta Globo foi conectada com sucesso.</p>
        <div class="info">
            <div class="info-label">TIME</div>
            <div class="info-value">${timeData.nome_time || 'Meu Time'}</div>
        </div>
        <p class="close-msg">Esta janela será fechada automaticamente...</p>
    </div>
    <script>
        (function() {
            const resultado = {
                success: true,
                glbToken: '${glbToken}',
                timeId: '${timeId}',
                nome: '${(timeData.nome_cartola || '').replace(/'/g, "\\'")}',
                time: '${(timeData.nome_time || '').replace(/'/g, "\\'")}'
            };

            // Enviar para janela pai
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GLOBO_AUTH_SUCCESS',
                    data: resultado
                }, '*');

                // Fechar popup após 2 segundos
                setTimeout(() => window.close(), 2000);
            } else {
                // Se não tiver opener, mostrar mensagem
                document.querySelector('.close-msg').innerHTML =
                    'Feche esta janela e volte ao app.';
            }
        })();
    </script>
</body>
</html>`;
}

function gerarHtmlPopupErro(codigo, mensagem) {
    const mensagens = {
        'oauth_init_failed': 'Erro ao iniciar conexão com Globo',
        'oauth_failed': 'Falha na autenticação Globo',
        'oauth_callback_error': 'Erro ao processar retorno da Globo',
        'no_token': 'Token de autenticação não recebido',
        'no_time_globo': 'Não foi possível obter seu time da conta Globo',
        'not_subscriber': 'Esta conta não é assinante Cartola PRO',
        'session_error': 'Erro interno ao processar sessão'
    };

    const msg = mensagens[codigo] || mensagem || 'Erro desconhecido';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Erro na Autenticação</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container {
            padding: 32px;
            max-width: 400px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 8px;
            color: #ef4444;
        }
        p {
            color: rgba(255,255,255,0.6);
            margin-bottom: 24px;
        }
        button {
            background: #ef4444;
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        }
        button:hover {
            background: #dc2626;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">❌</div>
        <h1>Erro na Autenticação</h1>
        <p>${msg}</p>
        <button onclick="window.close()">Fechar</button>
    </div>
    <script>
        (function() {
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GLOBO_AUTH_ERROR',
                    data: {
                        success: false,
                        error: '${codigo}',
                        message: '${msg.replace(/'/g, "\\'")}'
                    }
                }, '*');
            }
        })();
    </script>
</body>
</html>`;
}

export { verificarSessaoParticipante };
export default router;

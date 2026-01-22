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

function ensureUnifiedGloboStrategy(domain, config) {
    const strategyName = `globo-unified:${domain}`;

    if (!registeredUnifiedStrategies.has(strategyName)) {
        console.log("[PARTICIPANTE-AUTH] Criando strategy unificada para:", domain);

        const strategy = new Strategy(
            {
                name: strategyName,
                config,
                scope: "openid email profile",
                callbackURL: `https://${domain}/api/participante/auth/globo/callback`
            },
            async (tokens, done) => {
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
            }
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
                const timeData = await Time.findOne({ id: timeIdGlobo }).select("assinante nome_cartola nome_time clube_id url_escudo_png");

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
                const dadosReais = {
                    nome_cartola: timeData.nome_cartola || participanteEncontrado?.nome_cartola || "Cartoleiro",
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
        const timeData = await Time.findOne({ id: timeIdGlobo }).select("assinante nome_cartola nome_time clube_id url_escudo_png");

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
        const dadosReais = {
            nome_cartola: timeData.nome_cartola || participanteEncontrado?.nome_cartola || "Cartoleiro",
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
        let dadosReais = {
            nome_cartola: participanteEncontrado.nome_cartola || 'N/D',
            nome_time: participanteEncontrado.nome_time || 'N/D',
            foto_perfil: participanteEncontrado.foto_perfil || '',
            foto_time: participanteEncontrado.foto_time || '',
            clube_id: participanteEncontrado.clube_id || null
        };

        try {
            const { default: Time } = await import("../models/Time.js");
            const timeReal = await Time.findOne({ time_id: parseInt(timeId) }).lean();

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
                    nome: participanteEncontrado.nome_cartola,
                    time: participanteEncontrado.nome_time,
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
            timeData = await Time.findOne({ id: timeId }).select(
                "nome nome_cartola clube_id url_escudo_png assinante",
            );
        }

        console.log('[PARTICIPANTE-AUTH] ✅ Sessão válida retornada:', timeId);

        // ✅ Adicionar headers de cache-control para evitar cache agressivo
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        res.json({
            authenticated: true,
            participante: {
                ...req.session.participante,
                assinante: timeData?.assinante || false, // Flag premium para Cartola PRO
                time: timeData
                    ? {
                          nome: timeData.nome, // Compatibilidade com schema antigo/novo
                          nome_cartola: timeData.nome_cartola,
                          clube_id: timeData.clube_id,
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
            .select("_id nome descricao")
            .lean();

        res.json({
            success: true,
            ligas: ligas.map((liga) => ({
                id: liga._id.toString(),
                nome: liga.nome,
                descricao: liga.descricao || "",
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
                `http://localhost:${process.env.PORT || 5000}`;
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

export { verificarSessaoParticipante };
export default router;

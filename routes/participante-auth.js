import express from "express";
import session from "express-session";

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

// LOGIN OTIMIZADO - Busca Direta no MongoDB (Sem carregar tudo na memória)
router.post("/login", async (req, res) => {
    try {
        const { timeId, senha } = req.body;

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
            return res
                .status(404)
                .json({ error: "Erro ao localizar dados do participante" });
        }

        // Validar senha
        // Nota: Idealmente usaríamos bcrypt, mas mantendo compatibilidade com texto simples atual
        if (participanteEncontrado.senha_acesso !== senha) {
            return res.status(401).json({
                error: "Senha incorreta",
            });
        }

        // Criar sessão (Agora persistente no MongoDB graças ao index.js)
        req.session.participante = {
            timeId: timeId,
            ligaId: ligaEncontrada._id.toString(),
            participante: {
                nome_cartola: participanteEncontrado.nome_cartola,
                nome_time: participanteEncontrado.nome_time,
                foto_perfil: participanteEncontrado.foto_perfil,
                foto_time: participanteEncontrado.foto_time,
            },
        };

        // Forçar salvamento da sessão
        req.session.save((err) => {
            if (err) {
                console.error("Erro ao salvar sessão:", err);
                return res.status(500).json({ error: "Erro ao criar sessão" });
            }

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
        console.error("[PARTICIPANTE-AUTH] Erro no login:", error);
        res.status(500).json({ error: "Erro interno ao processar login" });
    }
});

// GET - Verificar sessão (Mais robusto)
router.get("/session", async (req, res) => {
    try {
        if (!req.session || !req.session.participante) {
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
            timeData = await Time.findOne({ time_id: timeId }).select(
                "nome nome_cartola clube_id url_escudo_png",
            );
        }

        res.json({
            authenticated: true,
            participante: {
                ...req.session.participante,
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

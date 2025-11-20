const express = require("express");
const router = express.Router();
const axios = require("axios");

const CARTOLA_API_BASE = "https://api.cartola.globo.com";

// Middleware para CORS
router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );

    if (req.method === "OPTIONS") {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Proxy para liga específica
router.get("/liga/:ligaId", async (req, res) => {
    try {
        const { ligaId } = req.params;
        console.log(`🔄 Buscando liga: ${ligaId}`);

        const response = await axios.get(`${CARTOLA_API_BASE}/liga/${ligaId}`, {
            timeout: 10000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });

        console.log(`✅ Liga encontrada: ${response.data.nome}`);
        res.json(response.data);
    } catch (error) {
        console.error(
            `❌ Erro ao buscar liga ${req.params.ligaId}:`,
            error.message,
        );
        res.status(error.response?.status || 500).json({
            error: "Erro ao buscar liga",
            details: error.message,
        });
    }
});

// Rota: Status do mercado
router.get('/mercado/status', async (req, res) => {
    try {
        const response = await axios.get('https://api.cartola.globo.com/mercado/status', {
            timeout: 10000
        });

        res.json(response.data);
    } catch (error) {
        console.error('[CARTOLA-PROXY] Erro ao buscar status do mercado:', error.message);

        // Retornar dados padrão em caso de erro
        res.json({
            rodada_atual: 1,
            mercado_fechado: false,
            times_escalados: 0
        });
    }
});


// Proxy para atletas
router.get("/atletas/mercado", async (req, res) => {
    try {
        console.log("🔄 Buscando atletas do mercado...");

        const response = await axios.get(
            `${CARTOLA_API_BASE}/atletas/mercado`,
            {
                timeout: 15000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            },
        );

        console.log("✅ Atletas do mercado obtidos");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar atletas:", error.message);
        res.status(error.response?.status || 500).json({
            error: "Erro ao buscar atletas",
            details: error.message,
        });
    }
});

module.exports = router;
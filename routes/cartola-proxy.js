
import express from "express";
import axios from "axios";

const router = express.Router();
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

// Rota: Status do mercado (corrigida e sem duplicação)
router.get('/mercado/status', async (req, res) => {
    try {
        console.log('🔄 [CARTOLA-PROXY] Buscando status do mercado...');
        
        const response = await axios.get('https://api.cartola.globo.com/mercado/status', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log('✅ [CARTOLA-PROXY] Status do mercado obtido:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('❌ [CARTOLA-PROXY] Erro ao buscar status do mercado:', error.message);
        
        // Retornar dados de fallback em caso de erro
        res.json({
            rodada_atual: 1,
            status_mercado: 2, // Mercado fechado (permite visualizar rodadas)
            mes: 11,
            ano: 2025,
            aviso: 'Dados de fallback - API indisponível'
        });
    }
});

// Endpoint: Atletas pontuados (para cálculo de parciais)
router.get('/atletas/pontuados', async (req, res) => {
    try {
        const response = await axios.get('https://api.cartola.globo.com/atletas/pontuados', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar atletas pontuados:', error.message);
        
        // Retornar objeto vazio em caso de erro (mercado pode estar fechado)
        res.json({
            atletas: {},
            rodada: 1
        });
    }
});

// Endpoint: Escalação de um time em uma rodada específica
router.get('/time/id/:timeId/:rodada', async (req, res) => {
    try {
        const { timeId, rodada } = req.params;
        console.log(`🔄 [CARTOLA-PROXY] Buscando escalação do time ${timeId} na rodada ${rodada}...`);
        
        const response = await axios.get(`https://api.cartola.globo.com/time/id/${timeId}/${rodada}`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        console.log(`✅ [CARTOLA-PROXY] Escalação obtida para time ${timeId}`);
        res.json(response.data);
    } catch (error) {
        console.error(`❌ [CARTOLA-PROXY] Erro ao buscar escalação do time ${req.params.timeId}:`, error.message);
        
        // Retornar 404 se time não jogou na rodada
        if (error.response?.status === 404) {
            res.status(404).json({
                error: 'Time não jogou nesta rodada',
                timeId: req.params.timeId,
                rodada: req.params.rodada
            });
        } else {
            res.status(error.response?.status || 500).json({
                error: 'Erro ao buscar escalação',
                details: error.message
            });
        }
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

export default router;

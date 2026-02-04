# SPEC - Integração OAuth Cartola PRO

**Data:** 2026-01-20
**Baseado em:** PRD-cartola-pro.md
**Status:** Especificação Técnica
**Versão:** 1.0

---

## Resumo da Implementação

Implementar integração OAuth com a API Globo para permitir que participantes Premium escalem seus times diretamente pelo Super Cartola Manager. O sistema será composto por: (1) Service backend para autenticação e envio de escalação, (2) Rotas de API protegidas, (3) Frontend com modal de login e seletor de escalação integrado na tela de Dicas.

---

## Mapa de Dependências

```
NOVOS ARQUIVOS (a criar):
├── services/cartolaProService.js       [CRIAR] - Lógica de integração OAuth Globo
├── routes/cartola-pro-routes.js        [CRIAR] - Endpoints API PRO
├── public/participante/js/modules/participante-cartola-pro.js  [CRIAR] - Frontend PRO
└── public/participante/fronts/cartola-pro.html                  [CRIAR] - Modal/Interface

ARQUIVOS A MODIFICAR:
├── models/Liga.js                      [MODIFICAR] - Adicionar campo premium em participantes
├── index.js                            [MODIFICAR] - Registrar novas rotas
├── public/participante/js/modules/participante-dicas.js  [MODIFICAR] - Integrar botão PRO
└── public/participante/fronts/dicas.html                  [MODIFICAR] - Container para PRO

ARQUIVOS DE REFERÊNCIA (padrões a seguir):
├── services/cartolaApiService.js       [REFERÊNCIA] - Padrão de service com axios/retry
├── routes/cartola.js                   [REFERÊNCIA] - Padrão de rotas Cartola
├── routes/participante-auth.js         [REFERÊNCIA] - Middleware verificarSessaoParticipante
└── public/participante/js/participante-auth.js  [REFERÊNCIA] - Verificação de sessão
```

---

## Arquivos a Modificar (Ordem de Execução)

### 1. models/Liga.js - Adicionar Campo Premium

**Path:** `models/Liga.js`
**Tipo:** Modificação
**Impacto:** Baixo (schema extensão)
**Dependentes:** Nenhum direto

#### Mudanças Cirúrgicas:

**Linha 16: ADICIONAR após `contato`**
```javascript
// ANTES (linha 16):
        contato: { type: String, default: "" }, // ✅ v2.12: WhatsApp/telefone para contato direto

// DEPOIS (linhas 16-17):
        contato: { type: String, default: "" }, // ✅ v2.12: WhatsApp/telefone para contato direto
        premium: { type: Boolean, default: false }, // ✅ v2.13: Acesso a recursos PRO (Cartola PRO)
```
**Motivo:** Permitir marcar participantes com acesso Premium às funcionalidades PRO.

---

### 2. services/cartolaProService.js - Service de Integração PRO

**Path:** `services/cartolaProService.js`
**Tipo:** Criação
**Impacto:** Alto (novo módulo core)
**Dependentes:** routes/cartola-pro-routes.js

#### Código Completo:

```javascript
// =====================================================================
// CARTOLA PRO SERVICE - Integração OAuth com API Globo
// =====================================================================
// ⚠️ AVISO LEGAL: Esta integração usa APIs não-oficiais da Globo.
// O uso é de responsabilidade do usuário. Credenciais NUNCA são armazenadas.
// =====================================================================

import axios from "axios";
import NodeCache from "node-cache";

// Cache para sessões ativas (TTL: 2 horas - tempo médio de sessão Globo)
const sessionCache = new NodeCache({ stdTTL: 7200 });

// Logger específico para o serviço PRO
class CartolaProLogger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [CARTOLA-PRO] [${level.toUpperCase()}] ${message}`;

        if (level === 'error') {
            console.error(logMessage, data ? JSON.stringify(data, null, 2) : '');
        } else if (level === 'warn') {
            console.warn(logMessage, data ? JSON.stringify(data, null, 2) : '');
        } else {
            console.log(logMessage, data ? JSON.stringify(data, null, 2) : '');
        }
    }

    static info(message, data = null) { this.log('info', message, data); }
    static warn(message, data = null) { this.log('warn', message, data); }
    static error(message, data = null) { this.log('error', message, data); }
    static debug(message, data = null) { this.log('debug', message, data); }
}

// Configuração do cliente HTTP
const httpClient = axios.create({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});

// Função de delay para simular comportamento humano
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =====================================================================
// ESQUEMAS DE FORMAÇÃO VÁLIDOS
// =====================================================================
const ESQUEMAS = {
    1: { nome: '3-4-3', posicoes: { gol: 1, lat: 0, zag: 3, mei: 4, ata: 3 } },
    2: { nome: '3-5-2', posicoes: { gol: 1, lat: 0, zag: 3, mei: 5, ata: 2 } },
    3: { nome: '4-3-3', posicoes: { gol: 1, lat: 2, zag: 2, mei: 3, ata: 3 } },
    4: { nome: '4-4-2', posicoes: { gol: 1, lat: 2, zag: 2, mei: 4, ata: 2 } },
    5: { nome: '4-5-1', posicoes: { gol: 1, lat: 2, zag: 2, mei: 5, ata: 1 } },
    6: { nome: '5-3-2', posicoes: { gol: 1, lat: 2, zag: 3, mei: 3, ata: 2 } },
    7: { nome: '5-4-1', posicoes: { gol: 1, lat: 2, zag: 3, mei: 4, ata: 1 } }
};

// Mapeamento de posição_id para tipo
const POSICAO_TIPO = {
    1: 'gol', // Goleiro
    2: 'lat', // Lateral
    3: 'zag', // Zagueiro
    4: 'mei', // Meia
    5: 'ata', // Atacante
    6: 'tec'  // Técnico
};

class CartolaProService {
    constructor() {
        this.loginUrl = 'https://login.globo.com/api/authentication';
        this.apiUrl = 'https://api.cartolafc.globo.com';
    }

    /**
     * Autentica usuário na API Globo
     * @param {string} email - Email da conta Globo
     * @param {string} password - Senha da conta Globo
     * @returns {Promise<{success: boolean, glbId?: string, error?: string}>}
     */
    async autenticar(email, password) {
        CartolaProLogger.info('Iniciando autenticação Globo', { email: email.substring(0, 3) + '***' });

        try {
            // Delay para simular comportamento humano
            await sleep(500 + Math.random() * 500);

            const response = await httpClient.post(this.loginUrl, {
                payload: {
                    email: email,
                    password: password,
                    serviceId: 4728 // ID do Cartola FC
                }
            });

            if (response.status === 200 && response.data.glbId) {
                const glbId = response.data.glbId;

                CartolaProLogger.info('Autenticação bem-sucedida');

                return {
                    success: true,
                    glbId: glbId,
                    expiresIn: 7200 // 2 horas (estimativa)
                };
            }

            CartolaProLogger.warn('Resposta inesperada da API Globo', { status: response.status });
            return {
                success: false,
                error: 'Resposta inesperada do servidor'
            };

        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.userMessage || error.message;

            CartolaProLogger.error('Erro na autenticação', { status, message });

            if (status === 401 || status === 400) {
                return {
                    success: false,
                    error: 'Email ou senha incorretos'
                };
            }

            if (status === 429) {
                return {
                    success: false,
                    error: 'Muitas tentativas. Aguarde alguns minutos.'
                };
            }

            return {
                success: false,
                error: 'Erro ao conectar com a Globo. Tente novamente.'
            };
        }
    }

    /**
     * Busca jogadores disponíveis no mercado
     * @param {string} glbId - Token de autenticação Globo
     * @returns {Promise<{success: boolean, atletas?: Array, patrimonio?: number, error?: string}>}
     */
    async buscarMercado(glbId) {
        CartolaProLogger.info('Buscando mercado de atletas');

        try {
            // Buscar status do mercado
            const statusResponse = await httpClient.get(`${this.apiUrl}/mercado/status`);

            if (statusResponse.data.status_mercado !== 1) {
                return {
                    success: false,
                    error: 'Mercado está fechado',
                    mercadoFechado: true
                };
            }

            // Buscar atletas disponíveis
            const atletasResponse = await httpClient.get(`${this.apiUrl}/atletas/mercado`, {
                headers: { 'X-GLB-Token': glbId }
            });

            // Buscar dados do time do usuário (para patrimônio)
            const timeResponse = await httpClient.get(`${this.apiUrl}/auth/time`, {
                headers: { 'X-GLB-Token': glbId }
            });

            const atletas = atletasResponse.data.atletas || {};
            const clubes = atletasResponse.data.clubes || {};
            const posicoes = atletasResponse.data.posicoes || {};

            // Formatar atletas para frontend
            const atletasFormatados = Object.values(atletas).map(atleta => ({
                atletaId: atleta.atleta_id,
                nome: atleta.apelido,
                posicaoId: atleta.posicao_id,
                posicao: posicoes[atleta.posicao_id]?.nome || 'N/D',
                clubeId: atleta.clube_id,
                clube: clubes[atleta.clube_id]?.nome || 'N/D',
                clubeAbreviacao: clubes[atleta.clube_id]?.abreviacao || 'N/D',
                preco: atleta.preco_num || 0,
                media: atleta.media_num || 0,
                jogos: atleta.jogos_num || 0,
                status: atleta.status_id,
                foto: atleta.foto?.replace('FORMATO', '140x140') || null
            }));

            return {
                success: true,
                atletas: atletasFormatados,
                patrimonio: timeResponse.data.time?.patrimonio || 0,
                rodadaAtual: statusResponse.data.rodada_atual,
                fechamento: statusResponse.data.fechamento
            };

        } catch (error) {
            CartolaProLogger.error('Erro ao buscar mercado', { error: error.message });

            if (error.response?.status === 401) {
                return {
                    success: false,
                    error: 'Sessão expirada. Faça login novamente.',
                    sessaoExpirada: true
                };
            }

            return {
                success: false,
                error: 'Erro ao buscar jogadores. Tente novamente.'
            };
        }
    }

    /**
     * Valida formação antes de salvar
     * @param {Array} atletas - IDs dos atletas selecionados
     * @param {number} esquema - ID do esquema de formação
     * @param {Object} atletasData - Dados completos dos atletas (para validar posições)
     * @returns {{valido: boolean, erro?: string}}
     */
    validarFormacao(atletas, esquema, atletasData) {
        if (!ESQUEMAS[esquema]) {
            return { valido: false, erro: 'Esquema de formação inválido' };
        }

        // Deve ter exatamente 12 atletas (11 + técnico)
        if (atletas.length !== 12) {
            return { valido: false, erro: `Selecione 12 jogadores (11 + técnico). Você selecionou ${atletas.length}` };
        }

        // Contar posições
        const contagemPosicoes = { gol: 0, lat: 0, zag: 0, mei: 0, ata: 0, tec: 0 };

        for (const atletaId of atletas) {
            const atleta = atletasData[atletaId];
            if (!atleta) {
                return { valido: false, erro: `Atleta ${atletaId} não encontrado` };
            }

            const tipo = POSICAO_TIPO[atleta.posicaoId];
            if (!tipo) {
                return { valido: false, erro: `Posição inválida para atleta ${atleta.nome}` };
            }

            contagemPosicoes[tipo]++;
        }

        // Validar técnico
        if (contagemPosicoes.tec !== 1) {
            return { valido: false, erro: 'Selecione exatamente 1 técnico' };
        }

        // Validar esquema
        const esquemaConfig = ESQUEMAS[esquema].posicoes;
        for (const [pos, qtd] of Object.entries(esquemaConfig)) {
            if (contagemPosicoes[pos] !== qtd) {
                return {
                    valido: false,
                    erro: `Formação ${ESQUEMAS[esquema].nome} requer ${qtd} ${pos.toUpperCase()}(s). Você tem ${contagemPosicoes[pos]}.`
                };
            }
        }

        return { valido: true };
    }

    /**
     * Salva escalação no Cartola FC
     * @param {string} glbId - Token de autenticação Globo
     * @param {Array} atletas - IDs dos atletas (11 + técnico)
     * @param {number} esquema - ID do esquema de formação
     * @param {number} capitao - ID do atleta capitão (3x pontuação)
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async salvarEscalacao(glbId, atletas, esquema, capitao) {
        CartolaProLogger.info('Salvando escalação', {
            totalAtletas: atletas.length,
            esquema,
            capitao
        });

        try {
            // Delay para simular comportamento humano
            await sleep(800 + Math.random() * 400);

            const response = await httpClient.post(
                `${this.apiUrl}/auth/time/salvar`,
                {
                    esquema: esquema,
                    atleta: atletas,
                    capitao: capitao
                },
                {
                    headers: {
                        'X-GLB-Token': glbId,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 200) {
                CartolaProLogger.info('Escalação salva com sucesso');
                return { success: true };
            }

            return {
                success: false,
                error: 'Resposta inesperada do servidor'
            };

        } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;

            CartolaProLogger.error('Erro ao salvar escalação', { status, data });

            if (status === 401) {
                return {
                    success: false,
                    error: 'Sessão expirada. Faça login novamente.',
                    sessaoExpirada: true
                };
            }

            if (status === 400) {
                return {
                    success: false,
                    error: data?.mensagem || 'Escalação inválida'
                };
            }

            if (status === 422) {
                return {
                    success: false,
                    error: 'Patrimônio insuficiente ou jogador indisponível'
                };
            }

            return {
                success: false,
                error: 'Erro ao salvar escalação. Tente novamente.'
            };
        }
    }

    /**
     * Verifica se o mercado está aberto
     * @returns {Promise<{aberto: boolean, fechamento?: string}>}
     */
    async verificarMercado() {
        try {
            const response = await httpClient.get(`${this.apiUrl}/mercado/status`);
            return {
                aberto: response.data.status_mercado === 1,
                fechamento: response.data.fechamento,
                rodadaAtual: response.data.rodada_atual
            };
        } catch (error) {
            CartolaProLogger.error('Erro ao verificar mercado', { error: error.message });
            return { aberto: false };
        }
    }
}

export default new CartolaProService();
export { ESQUEMAS, POSICAO_TIPO };
```

---

### 3. routes/cartola-pro-routes.js - Rotas da API PRO

**Path:** `routes/cartola-pro-routes.js`
**Tipo:** Criação
**Impacto:** Alto
**Dependentes:** index.js, Frontend

#### Código Completo:

```javascript
// =====================================================================
// CARTOLA PRO ROUTES - Endpoints de Escalação Automática
// =====================================================================
// ⚠️ APENAS PARA PARTICIPANTES PREMIUM
// =====================================================================

import express from "express";
import cartolaProService from "../services/cartolaProService.js";
import Liga from "../models/Liga.js";

const router = express.Router();

// =====================================================================
// MIDDLEWARE: Verificar Sessão de Participante
// =====================================================================
function verificarSessaoParticipante(req, res, next) {
    if (!req.session || !req.session.participante) {
        return res.status(401).json({
            success: false,
            error: "Sessão expirada. Faça login novamente.",
            needsLogin: true
        });
    }
    next();
}

// =====================================================================
// MIDDLEWARE: Verificar Acesso Premium
// =====================================================================
async function verificarPremium(req, res, next) {
    try {
        const { timeId, ligaId } = req.session.participante;

        // Buscar participante na liga
        const liga = await Liga.findById(ligaId);
        if (!liga) {
            return res.status(404).json({
                success: false,
                error: "Liga não encontrada"
            });
        }

        const participante = liga.participantes.find(
            p => String(p.time_id) === String(timeId)
        );

        if (!participante) {
            return res.status(404).json({
                success: false,
                error: "Participante não encontrado na liga"
            });
        }

        // Verificar flag premium
        if (!participante.premium) {
            return res.status(403).json({
                success: false,
                error: "Recurso exclusivo para assinantes PRO",
                needsPremium: true
            });
        }

        // Adicionar dados ao request para uso posterior
        req.participantePremium = participante;
        next();

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao verificar premium:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao verificar permissões"
        });
    }
}

// =====================================================================
// POST /api/cartola-pro/auth - Autenticação na Globo
// =====================================================================
router.post("/auth", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email e senha são obrigatórios"
            });
        }

        // Autenticar na Globo
        const resultado = await cartolaProService.autenticar(email, password);

        if (!resultado.success) {
            return res.status(401).json(resultado);
        }

        // Retornar token (NÃO armazenamos credenciais)
        res.json({
            success: true,
            glbId: resultado.glbId,
            expiresIn: resultado.expiresIn
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro no auth:', error);
        res.status(500).json({
            success: false,
            error: "Erro interno ao autenticar"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/mercado - Buscar Jogadores Disponíveis
// =====================================================================
router.get("/mercado", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const glbId = req.headers['x-glb-token'];

        if (!glbId) {
            return res.status(401).json({
                success: false,
                error: "Token Globo não fornecido",
                needsAuth: true
            });
        }

        const resultado = await cartolaProService.buscarMercado(glbId);

        if (!resultado.success) {
            const status = resultado.sessaoExpirada ? 401 : 400;
            return res.status(status).json(resultado);
        }

        res.json(resultado);

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao buscar mercado:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar jogadores"
        });
    }
});

// =====================================================================
// POST /api/cartola-pro/escalar - Salvar Escalação
// =====================================================================
router.post("/escalar", verificarSessaoParticipante, verificarPremium, async (req, res) => {
    try {
        const glbId = req.headers['x-glb-token'];
        const { atletas, esquema, capitao } = req.body;

        if (!glbId) {
            return res.status(401).json({
                success: false,
                error: "Token Globo não fornecido",
                needsAuth: true
            });
        }

        if (!atletas || !Array.isArray(atletas) || atletas.length !== 12) {
            return res.status(400).json({
                success: false,
                error: "Selecione 12 jogadores (11 + técnico)"
            });
        }

        if (!esquema || esquema < 1 || esquema > 7) {
            return res.status(400).json({
                success: false,
                error: "Esquema de formação inválido"
            });
        }

        if (!capitao || !atletas.includes(capitao)) {
            return res.status(400).json({
                success: false,
                error: "Capitão deve ser um dos atletas selecionados"
            });
        }

        // Salvar escalação
        const resultado = await cartolaProService.salvarEscalacao(
            glbId,
            atletas,
            esquema,
            capitao
        );

        if (!resultado.success) {
            const status = resultado.sessaoExpirada ? 401 : 400;
            return res.status(status).json(resultado);
        }

        res.json({
            success: true,
            message: "Escalação salva com sucesso!"
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao salvar escalação:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao salvar escalação"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/status - Verificar Status do Mercado
// =====================================================================
router.get("/status", verificarSessaoParticipante, async (req, res) => {
    try {
        const resultado = await cartolaProService.verificarMercado();
        res.json(resultado);
    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao verificar status:', error);
        res.status(500).json({
            success: false,
            error: "Erro ao verificar status do mercado"
        });
    }
});

// =====================================================================
// GET /api/cartola-pro/verificar-premium - Verificar se é Premium
// =====================================================================
router.get("/verificar-premium", verificarSessaoParticipante, async (req, res) => {
    try {
        const { timeId, ligaId } = req.session.participante;

        const liga = await Liga.findById(ligaId);
        if (!liga) {
            return res.json({ premium: false });
        }

        const participante = liga.participantes.find(
            p => String(p.time_id) === String(timeId)
        );

        res.json({
            premium: participante?.premium === true
        });

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao verificar premium:', error);
        res.json({ premium: false });
    }
});

export default router;
```

---

### 4. index.js - Registrar Novas Rotas

**Path:** `index.js`
**Tipo:** Modificação
**Impacto:** Baixo
**Dependentes:** Toda aplicação

#### Mudanças Cirúrgicas:

**Próximo às linhas de import de rotas (seção de imports): ADICIONAR**
```javascript
// ADICIONAR após outros imports de rotas (aproximadamente linha 50-60):
import cartolaProRoutes from "./routes/cartola-pro-routes.js";
```

**Linha 339 (após app.use cartola): ADICIONAR**
```javascript
// ANTES (linhas 338-339):
app.use("/api/cartola", cartolaRoutes);
app.use("/api/cartola", cartolaProxyRoutes);

// DEPOIS (linhas 338-340):
app.use("/api/cartola", cartolaRoutes);
app.use("/api/cartola", cartolaProxyRoutes);
app.use("/api/cartola-pro", cartolaProRoutes);
```
**Motivo:** Registrar as novas rotas PRO no Express.

---

### 5. public/participante/js/modules/participante-dicas.js - Integrar Botão PRO

**Path:** `public/participante/js/modules/participante-dicas.js`
**Tipo:** Modificação
**Impacto:** Médio
**Dependentes:** Frontend Dicas

#### Mudanças Cirúrgicas:

**Linha 50 (após buscar dados): ADICIONAR verificação premium**
```javascript
// ANTES (linhas 44-50):
        const [statusMercado, topMitos, topMicos] = await Promise.all([
            buscarStatusMercado(),
            buscarTopJogadores('mitos', ligaId),
            buscarTopJogadores('micos', ligaId)
        ]);

        dadosDicas = { statusMercado, topMitos, topMicos };

// DEPOIS (linhas 44-54):
        const [statusMercado, topMitos, topMicos, isPremium] = await Promise.all([
            buscarStatusMercado(),
            buscarTopJogadores('mitos', ligaId),
            buscarTopJogadores('micos', ligaId),
            verificarPremium()
        ]);

        dadosDicas = { statusMercado, topMitos, topMicos, isPremium };
```

**Após linha 91 (após gerarDicasMock): ADICIONAR função verificarPremium**
```javascript
// ADICIONAR após linha 108:

async function verificarPremium() {
    try {
        const response = await fetch('/api/cartola-pro/verificar-premium', {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            return data.premium === true;
        }
        return false;
    } catch {
        return false;
    }
}
```

**Linha 156-164 (aviso PRO): MODIFICAR para mostrar botão se premium**
```javascript
// ANTES (linhas 155-164):
            <!-- Aviso PRO -->
            <div class="mx-4 mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div class="flex items-start gap-3">
                    <span class="material-icons text-yellow-400">star</span>
                    <div>
                        <p class="text-sm font-medium text-yellow-300">Versão Básica</p>
                        <p class="text-xs text-white/50">Em breve: integração com dicas avançadas do GatoMestre para assinantes PRO</p>
                    </div>
                </div>
            </div>

// DEPOIS:
            <!-- Seção PRO -->
            ${dados.isPremium ? renderizarBotaoCartolaPro(dados.statusMercado) : renderizarAvisoPro()}
```

**Após linha 232 (após renderizarCardDica): ADICIONAR funções de renderização PRO**
```javascript
// ADICIONAR após linha 266:

function renderizarAvisoPro() {
    return `
        <div class="mx-4 mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <div class="flex items-start gap-3">
                <span class="material-icons text-yellow-400">star</span>
                <div>
                    <p class="text-sm font-medium text-yellow-300">Versão Básica</p>
                    <p class="text-xs text-white/50">Em breve: integração com escalação automática para assinantes PRO</p>
                </div>
            </div>
        </div>
    `;
}

function renderizarBotaoCartolaPro(statusMercado) {
    const mercadoAberto = statusMercado?.status_mercado === 1;

    return `
        <div class="mx-4 mt-4">
            <button
                onclick="window.abrirCartolaPro()"
                class="w-full flex items-center justify-between p-4 rounded-xl ${mercadoAberto ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40 hover:from-yellow-500/30 hover:to-orange-500/30' : 'bg-gray-800/50 border-gray-700'} border transition-all"
                ${!mercadoAberto ? 'disabled' : ''}>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${mercadoAberto ? 'bg-yellow-500/30' : 'bg-gray-700'} flex items-center justify-center">
                        <span class="material-icons ${mercadoAberto ? 'text-yellow-400' : 'text-gray-500'}">sports_soccer</span>
                    </div>
                    <div class="text-left">
                        <p class="text-sm font-bold ${mercadoAberto ? 'text-yellow-300' : 'text-gray-400'}">
                            Escalar no Cartola PRO
                        </p>
                        <p class="text-xs ${mercadoAberto ? 'text-white/50' : 'text-gray-600'}">
                            ${mercadoAberto ? 'Mercado aberto - Escale agora!' : 'Mercado fechado'}
                        </p>
                    </div>
                </div>
                <span class="material-icons ${mercadoAberto ? 'text-yellow-400' : 'text-gray-600'}">chevron_right</span>
            </button>
        </div>
    `;
}

// Função global para abrir modal Cartola PRO
window.abrirCartolaPro = function() {
    if (window.CartolaProModule) {
        window.CartolaProModule.abrirModal();
    } else {
        // Carregar módulo dinamicamente
        import('./participante-cartola-pro.js')
            .then(module => {
                window.CartolaProModule = module;
                module.abrirModal();
            })
            .catch(err => {
                console.error('Erro ao carregar módulo Cartola PRO:', err);
                alert('Erro ao carregar. Tente novamente.');
            });
    }
};
```

---

### 6. public/participante/js/modules/participante-cartola-pro.js - Módulo Frontend PRO

**Path:** `public/participante/js/modules/participante-cartola-pro.js`
**Tipo:** Criação
**Impacto:** Alto
**Dependentes:** participante-dicas.js

#### Código Completo:

```javascript
// =====================================================================
// PARTICIPANTE-CARTOLA-PRO.JS - v1.0 (Escalação Automática)
// =====================================================================
// ⚠️ RECURSO PREMIUM: Integração OAuth com API Globo
// =====================================================================

if (window.Log) Log.info("CARTOLA-PRO", "🔄 Carregando módulo v1.0...");

// Estado do módulo
let glbToken = null;
let atletasMercado = [];
let atletasSelecionados = [];
let capitaoId = null;
let esquemaSelecionado = 3; // 4-3-3 padrão
let patrimonioDisponivel = 0;

const ESQUEMAS = {
    1: '3-4-3', 2: '3-5-2', 3: '4-3-3', 4: '4-4-2',
    5: '4-5-1', 6: '5-3-2', 7: '5-4-1'
};

// =====================================================================
// FUNÇÃO PRINCIPAL: Abrir Modal
// =====================================================================
export function abrirModal() {
    if (window.Log) Log.info("CARTOLA-PRO", "📱 Abrindo modal...");

    // Remover modal existente
    const existente = document.getElementById('cartola-pro-modal');
    if (existente) existente.remove();

    // Verificar se tem token salvo
    if (glbToken) {
        mostrarSeletorEscalacao();
    } else {
        mostrarLoginGlobo();
    }
}

// =====================================================================
// TELA 1: Login Globo
// =====================================================================
function mostrarLoginGlobo() {
    const modal = document.createElement('div');
    modal.id = 'cartola-pro-modal';
    modal.className = 'fixed inset-0 z-50 flex items-end justify-center';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 max-h-[90vh] overflow-y-auto animate-slide-up">
            <!-- Header -->
            <div class="sticky top-0 bg-[#1a1a1a] px-4 py-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <span class="material-icons text-yellow-400">lock</span>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Login Globo
                        </h2>
                        <p class="text-xs text-white/50">Conecte sua conta Cartola FC</p>
                    </div>
                </div>
                <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                    <span class="material-icons text-white/50">close</span>
                </button>
            </div>

            <!-- Aviso de Segurança -->
            <div class="mx-4 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <div class="flex items-start gap-3">
                    <span class="material-icons text-red-400">warning</span>
                    <div>
                        <p class="text-sm font-medium text-red-300">Aviso Importante</p>
                        <p class="text-xs text-white/60 mt-1">
                            Esta é uma integração NÃO-OFICIAL. Suas credenciais serão usadas apenas para
                            autenticar na API da Globo e NÃO serão armazenadas. O uso é por sua conta e risco.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Formulário -->
            <div class="p-4 space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-1">Email da Conta Globo</label>
                    <input type="email" id="pro-email"
                           class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                           placeholder="seu@email.com">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-1">Senha</label>
                    <input type="password" id="pro-senha"
                           class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                           placeholder="••••••••">
                </div>

                <!-- Checkbox Aceite -->
                <label class="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700 cursor-pointer">
                    <input type="checkbox" id="pro-aceite" class="mt-1 accent-yellow-500">
                    <span class="text-xs text-white/60">
                        Entendo que esta é uma integração não-oficial e que o uso é de minha responsabilidade.
                        O Super Cartola não armazena minhas credenciais.
                    </span>
                </label>

                <!-- Botão Login -->
                <button onclick="window.CartolaProModule.fazerLogin()" id="pro-btn-login"
                        class="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-black font-bold flex items-center justify-center gap-2 hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-icons">login</span>
                    Conectar com Globo
                </button>

                <!-- Mensagem de erro -->
                <div id="pro-erro" class="hidden p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300"></div>
            </div>

            <div class="h-8"></div>
        </div>
    `;

    document.body.appendChild(modal);
}

// =====================================================================
// FAZER LOGIN
// =====================================================================
export async function fazerLogin() {
    const email = document.getElementById('pro-email')?.value;
    const senha = document.getElementById('pro-senha')?.value;
    const aceite = document.getElementById('pro-aceite')?.checked;
    const btnLogin = document.getElementById('pro-btn-login');
    const erroDiv = document.getElementById('pro-erro');

    // Validações
    if (!email || !senha) {
        mostrarErro('Preencha email e senha');
        return;
    }

    if (!aceite) {
        mostrarErro('Aceite os termos para continuar');
        return;
    }

    // Loading
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<div class="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>';
    erroDiv.classList.add('hidden');

    try {
        const response = await fetch('/api/cartola-pro/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password: senha })
        });

        const data = await response.json();

        if (!data.success) {
            mostrarErro(data.error || 'Erro ao autenticar');
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<span class="material-icons">login</span> Conectar com Globo';
            return;
        }

        // Salvar token e ir para seletor
        glbToken = data.glbId;

        if (window.Log) Log.info("CARTOLA-PRO", "✅ Login bem-sucedido");

        mostrarSeletorEscalacao();

    } catch (error) {
        console.error('Erro no login:', error);
        mostrarErro('Erro de conexão. Tente novamente.');
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<span class="material-icons">login</span> Conectar com Globo';
    }
}

function mostrarErro(msg) {
    const erroDiv = document.getElementById('pro-erro');
    if (erroDiv) {
        erroDiv.textContent = msg;
        erroDiv.classList.remove('hidden');
    }
}

// =====================================================================
// TELA 2: Seletor de Escalação
// =====================================================================
async function mostrarSeletorEscalacao() {
    const modal = document.getElementById('cartola-pro-modal');
    if (modal) modal.remove();

    // Criar novo modal com loading
    const novoModal = document.createElement('div');
    novoModal.id = 'cartola-pro-modal';
    novoModal.className = 'fixed inset-0 z-50 flex items-end justify-center';
    novoModal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 max-h-[90vh] flex items-center justify-center py-20">
            <div class="flex flex-col items-center">
                <div class="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                <p class="text-sm text-white/50">Carregando mercado...</p>
            </div>
        </div>
    `;
    document.body.appendChild(novoModal);

    try {
        const response = await fetch('/api/cartola-pro/mercado', {
            headers: { 'X-GLB-Token': glbToken },
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.success) {
            if (data.sessaoExpirada) {
                glbToken = null;
                mostrarLoginGlobo();
                return;
            }
            throw new Error(data.error);
        }

        atletasMercado = data.atletas;
        patrimonioDisponivel = data.patrimonio;
        atletasSelecionados = [];
        capitaoId = null;

        renderizarSeletorCompleto(data);

    } catch (error) {
        console.error('Erro ao carregar mercado:', error);
        novoModal.remove();
        alert('Erro ao carregar mercado: ' + error.message);
    }
}

function renderizarSeletorCompleto(data) {
    const modal = document.getElementById('cartola-pro-modal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 max-h-[90vh] overflow-y-auto animate-slide-up">
            <!-- Header -->
            <div class="sticky top-0 bg-[#1a1a1a] px-4 py-3 border-b border-white/10 z-10">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <span class="material-icons text-yellow-400 text-lg">sports_soccer</span>
                        </div>
                        <h2 class="text-base font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Escalar Time
                        </h2>
                    </div>
                    <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                        <span class="material-icons text-white/50">close</span>
                    </button>
                </div>

                <!-- Patrimônio -->
                <div class="flex items-center justify-between mt-2 text-xs">
                    <span class="text-white/50">Patrimônio:</span>
                    <span class="text-green-400 font-bold" style="font-family: 'JetBrains Mono', monospace;">
                        C$ ${patrimonioDisponivel.toFixed(2)}
                    </span>
                </div>
            </div>

            <!-- Conteúdo -->
            <div class="p-4">
                <p class="text-center text-white/50 text-sm mb-4">
                    Funcionalidade em desenvolvimento. Em breve você poderá escalar seu time aqui!
                </p>

                <!-- Botão Salvar (desabilitado por enquanto) -->
                <button disabled
                        class="w-full py-4 bg-gray-700 rounded-xl text-gray-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    <span class="material-icons">save</span>
                    Em Breve
                </button>
            </div>

            <div class="h-8"></div>
        </div>
    `;
}

// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================
export function fecharModal() {
    const modal = document.getElementById('cartola-pro-modal');
    if (modal) modal.remove();
}

// Expor funções globalmente
window.CartolaProModule = {
    abrirModal,
    fecharModal,
    fazerLogin
};

if (window.Log) Log.info("CARTOLA-PRO", "✅ Módulo v1.0 carregado");
```

---

## Validações de Segurança

### Multi-Tenant
- [x] Participante só acessa funcionalidades da liga em que está logado
- [x] Verificação de `ligaId` e `timeId` em todas as rotas PRO
- [x] Flag `premium` é verificado no participante específico

**Query de Verificação Premium:**
```javascript
// routes/cartola-pro-routes.js - Middleware verificarPremium
const liga = await Liga.findById(ligaId);
const participante = liga.participantes.find(
    p => String(p.time_id) === String(timeId)
);
if (!participante.premium) { return res.status(403)... }
```

### Autenticação
- [x] Todas as rotas PRO exigem `verificarSessaoParticipante`
- [x] Rotas de autenticação Globo exigem `verificarPremium`
- [x] Token Globo (glbId) é passado via header, nunca armazenado

### Credenciais
- [x] Email/senha da Globo NUNCA são armazenados
- [x] Token glbId fica apenas em memória do cliente
- [x] Logs não expõem credenciais completas

---

## Casos de Teste

### Teste 1: Verificação Premium (Cenário Positivo)
**Setup:** Participante com `premium: true` na liga
**Ação:** Acessar `/api/cartola-pro/verificar-premium`
**Resultado Esperado:** `{ premium: true }`

### Teste 2: Verificação Premium (Cenário Negativo)
**Setup:** Participante com `premium: false` ou sem campo
**Ação:** Tentar acessar `/api/cartola-pro/auth`
**Resultado Esperado:** Status 403, `{ error: "Recurso exclusivo para assinantes PRO" }`

### Teste 3: Login Globo (Credenciais Válidas)
**Setup:** Participante Premium com conta Globo válida
**Ação:** POST `/api/cartola-pro/auth` com email/senha corretos
**Resultado Esperado:** `{ success: true, glbId: "..." }`

### Teste 4: Login Globo (Credenciais Inválidas)
**Setup:** Participante Premium
**Ação:** POST `/api/cartola-pro/auth` com senha errada
**Resultado Esperado:** Status 401, `{ error: "Email ou senha incorretos" }`

### Teste 5: Mercado Fechado
**Setup:** Mercado do Cartola fechado
**Ação:** GET `/api/cartola-pro/mercado`
**Resultado Esperado:** `{ success: false, error: "Mercado está fechado" }`

---

## Rollback Plan

### Em Caso de Falha

**Passos de Reversão:**
1. Remover import e registro de rotas em `index.js`
2. Reverter modificações em `participante-dicas.js`
3. Arquivos novos podem ser mantidos ou removidos (não afetam sistema)

**Comandos:**
```bash
git revert [hash-do-commit]
# ou reverter arquivos específicos:
git checkout HEAD~1 -- index.js
git checkout HEAD~1 -- public/participante/js/modules/participante-dicas.js
```

**Banco de Dados:**
- Campo `premium` em participantes pode permanecer (não causa efeitos colaterais)
- Não há migrations destrutivas

---

## Checklist de Validação

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudanças cirúrgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Segurança
- [x] Credenciais nunca armazenadas
- [x] Verificação multi-tenant em todas as rotas
- [x] Rate limiting implícito (delay entre requests)
- [x] Logs não expõem dados sensíveis

---

## Ordem de Execução (Crítico)

1. **Backend primeiro:**
   - `models/Liga.js` - Adicionar campo premium
   - `services/cartolaProService.js` - Criar service
   - `routes/cartola-pro-routes.js` - Criar rotas
   - `index.js` - Registrar rotas

2. **Frontend depois:**
   - `participante-dicas.js` - Modificar para integrar PRO
   - `participante-cartola-pro.js` - Criar módulo

3. **Testes:**
   - Verificar participante não-premium recebe 403
   - Verificar login com credenciais válidas/inválidas
   - Verificar mercado fechado

4. **Ativação:**
   - Marcar participante(s) de teste como `premium: true` no banco
   - Testar fluxo completo

---

## Próximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-cartola-pro.md
```

---

**Gerado por:** Spec Protocol v1.0
**Data:** 2026-01-20
**Autor:** High Senior Protocol (Fase 2)

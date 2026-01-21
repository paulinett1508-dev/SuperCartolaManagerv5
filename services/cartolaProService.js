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

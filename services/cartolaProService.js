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

    /**
     * Gera time sugerido com base em algoritmo próprio
     * @param {number} esquema - ID do esquema de formação (1-7)
     * @param {number} patrimonio - Patrimônio disponível para montar o time
     * @returns {Promise<{success: boolean, atletas?: Array, totalPreco?: number, error?: string}>}
     */
    async gerarTimeSugerido(esquema = 3, patrimonio = 100) {
        CartolaProLogger.info('Gerando time sugerido', { esquema, patrimonio });

        try {
            // Buscar atletas do mercado (público, sem token)
            const atletasResponse = await httpClient.get(`${this.apiUrl}/atletas/mercado`);
            const atletas = atletasResponse.data.atletas || {};
            const clubes = atletasResponse.data.clubes || {};
            const posicoes = atletasResponse.data.posicoes || {};

            // Converter para array e adicionar dados formatados
            const atletasArray = Object.values(atletas).map(a => ({
                atletaId: a.atleta_id,
                nome: a.apelido,
                posicaoId: a.posicao_id,
                posicao: posicoes[a.posicao_id]?.nome || 'N/D',
                posicaoAbreviacao: posicoes[a.posicao_id]?.abreviacao || 'N/D',
                clubeId: a.clube_id,
                clube: clubes[a.clube_id]?.nome || 'N/D',
                clubeAbreviacao: clubes[a.clube_id]?.abreviacao || 'N/D',
                preco: a.preco_num || 0,
                media: a.media_num || 0,
                jogos: a.jogos_num || 0,
                status: a.status_id, // 7 = provável, 2 = dúvida, etc.
                foto: a.foto?.replace('FORMATO', '140x140') || null,
                // Custo-benefício: média / preço (evita divisão por zero)
                custoBeneficio: a.preco_num > 0 ? (a.media_num / a.preco_num) : 0
            }));

            // Filtrar apenas jogadores prováveis (status 7)
            const atletasProvaveis = atletasArray.filter(a => a.status === 7 || a.jogos >= 3);

            // Obter configuração do esquema
            const esquemaConfig = ESQUEMAS[esquema];
            if (!esquemaConfig) {
                return { success: false, error: 'Esquema de formação inválido' };
            }

            // Selecionar atletas por posição com melhor custo-benefício
            const timeSugerido = [];
            let precoTotal = 0;
            const patrimonioRestante = patrimonio;

            // Função para selecionar melhores atletas de uma posição
            const selecionarAtletas = (posicaoId, quantidade, orcamento) => {
                const candidatos = atletasProvaveis
                    .filter(a => a.posicaoId === posicaoId && a.preco <= orcamento)
                    .sort((a, b) => b.custoBeneficio - a.custoBeneficio);

                return candidatos.slice(0, quantidade);
            };

            // Mapear posição para ID
            const posicaoParaId = { gol: 1, lat: 2, zag: 3, mei: 4, ata: 5, tec: 6 };

            // Calcular orçamento por posição (proporcional)
            const totalJogadores = Object.values(esquemaConfig.posicoes).reduce((a, b) => a + b, 0) + 1; // +1 técnico
            const orcamentoPorJogador = patrimonioRestante / totalJogadores;

            // Selecionar para cada posição
            for (const [pos, qtd] of Object.entries(esquemaConfig.posicoes)) {
                const posId = posicaoParaId[pos];
                const selecionados = selecionarAtletas(posId, qtd, orcamentoPorJogador * qtd * 1.5);

                if (selecionados.length < qtd) {
                    // Não tem jogadores suficientes disponíveis
                    CartolaProLogger.warn(`Faltam jogadores para posição ${pos}`, {
                        necessario: qtd,
                        disponivel: selecionados.length
                    });
                }

                timeSugerido.push(...selecionados);
                precoTotal += selecionados.reduce((sum, a) => sum + a.preco, 0);
            }

            // Selecionar técnico
            const tecnicos = selecionarAtletas(6, 1, orcamentoPorJogador * 2);
            if (tecnicos.length > 0) {
                timeSugerido.push(tecnicos[0]);
                precoTotal += tecnicos[0].preco;
            }

            // Sugerir capitão (maior média entre meias e atacantes)
            const capitaoCandidatos = timeSugerido
                .filter(a => a.posicaoId === 4 || a.posicaoId === 5)
                .sort((a, b) => b.media - a.media);

            const capitaoSugerido = capitaoCandidatos[0]?.atletaId || timeSugerido[0]?.atletaId;

            CartolaProLogger.info('Time sugerido gerado', {
                totalAtletas: timeSugerido.length,
                precoTotal,
                capitaoSugerido
            });

            return {
                success: true,
                atletas: timeSugerido,
                totalPreco: precoTotal,
                patrimonioRestante: patrimonio - precoTotal,
                esquema: esquemaConfig.nome,
                capitaoSugerido,
                algoritmo: 'custo-beneficio-v1' // Futuramente: integrar GatoMestre
            };

        } catch (error) {
            CartolaProLogger.error('Erro ao gerar time sugerido', { error: error.message });
            return {
                success: false,
                error: 'Erro ao gerar sugestão de time. Tente novamente.'
            };
        }
    }

    /**
     * Busca time atual do usuário autenticado
     * @param {string} glbToken - Token de autenticação Globo (OAuth ou glbid)
     * @returns {Promise<{success: boolean, time?: Object, atletas?: Array, error?: string}>}
     */
    async buscarMeuTime(glbToken) {
        CartolaProLogger.info('Buscando time do usuário');

        try {
            // Buscar dados do time autenticado
            const timeResponse = await httpClient.get(`${this.apiUrl}/auth/time`, {
                headers: { 'X-GLB-Token': glbToken }
            });

            if (!timeResponse.data || !timeResponse.data.time) {
                return {
                    success: false,
                    error: 'Não foi possível obter dados do seu time'
                };
            }

            const timeData = timeResponse.data;
            const atletas = timeData.atletas || [];
            const clubes = timeData.clubes || {};
            const posicoes = timeData.posicoes || {};

            // Formatar atletas escalados
            const atletasFormatados = atletas.map(a => ({
                atletaId: a.atleta_id,
                nome: a.apelido,
                posicaoId: a.posicao_id,
                posicao: posicoes[a.posicao_id]?.nome || 'N/D',
                clubeId: a.clube_id,
                clube: clubes[a.clube_id]?.nome || 'N/D',
                clubeAbreviacao: clubes[a.clube_id]?.abreviacao || 'N/D',
                preco: a.preco_num || 0,
                pontosRodada: a.pontos_num || 0,
                media: a.media_num || 0,
                status: a.status_id,
                foto: a.foto?.replace('FORMATO', '140x140') || null,
                capitao: a.atleta_id === timeData.capitao_id
            }));

            // Calcular parcial
            const pontosAtletas = atletasFormatados.reduce((sum, a) => {
                const pontos = a.pontosRodada || 0;
                return sum + (a.capitao ? pontos * 1.5 : pontos); // Capitão 1.5x
            }, 0);

            return {
                success: true,
                time: {
                    timeId: timeData.time.time_id,
                    nome: timeData.time.nome,
                    nomeCartola: timeData.time.nome_cartola,
                    patrimonio: timeData.time.patrimonio,
                    rodadaAtual: timeData.time.rodada_atual,
                    esquemaId: timeData.esquema_id,
                    capitaoId: timeData.capitao_id
                },
                atletas: atletasFormatados,
                pontosRodada: timeData.pontos || 0,
                pontosParciais: pontosAtletas,
                variacao: timeData.variacao_pontuacao || 0
            };

        } catch (error) {
            CartolaProLogger.error('Erro ao buscar meu time', { error: error.message });

            if (error.response?.status === 401) {
                return {
                    success: false,
                    error: 'Sessão expirada. Conecte sua conta Globo novamente.',
                    sessaoExpirada: true
                };
            }

            return {
                success: false,
                error: 'Erro ao buscar seu time. Tente novamente.'
            };
        }
    }
}

export default new CartolaProService();
export { ESQUEMAS, POSICAO_TIPO };

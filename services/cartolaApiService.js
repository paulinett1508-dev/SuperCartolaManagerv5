

import axios from "axios";
import NodeCache from "node-cache";
import { SEASON_CONFIG } from "../config/seasons.js";

// Cache para otimizar requisições (TTL: 5 minutos)
const cache = new NodeCache({ stdTTL: 300 });

// Logger personalizado para o serviço
class CartolaLogger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CARTOLA-API] [${level.toUpperCase()}] ${message}`;
    
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

// Configuração do cliente HTTP com retry e timeout
const createHttpClient = () => {
  return axios.create({
    timeout: 15000, // 15 segundos
    headers: {
      'User-Agent': 'Super-Cartola-Manager/1.0.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    validateStatus: (status) => status < 500 // Aceita códigos 4xx como válidos
  });
};

// Função para delay entre requisições
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função de retry com backoff exponencial
async function retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await requestFn();
      return result;
    } catch (error) {
      CartolaLogger.warn(`Tentativa ${attempt}/${maxRetries} falhou`, {
        error: error.message,
        status: error.response?.status,
        url: error.config?.url
      });

      if (attempt === maxRetries) {
        throw error;
      }

      // Backoff exponencial: 1s, 2s, 4s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      CartolaLogger.info(`Aguardando ${delay}ms antes da próxima tentativa...`);
      await sleep(delay);
    }
  }
}

// Validador de dados de scout
function validateScoutData(scout) {
  if (!scout || typeof scout !== 'object') {
    return { gols: 0, golsContra: 0, isValid: false };
  }

  const gols = parseInt(scout.G) || 0;
  const golsContra = parseInt(scout.GC) || 0;

  // Validações de sanidade
  if (gols < 0 || gols > 10) {
    CartolaLogger.warn('Valor de gols suspeito detectado', { gols, scout });
    return { gols: 0, golsContra, isValid: false };
  }

  if (golsContra < 0 || golsContra > 5) {
    CartolaLogger.warn('Valor de gols contra suspeito detectado', { golsContra, scout });
    return { gols, golsContra: 0, isValid: false };
  }

  return { gols, golsContra, isValid: true };
}

// BEGIN dynamic-round fix
// Função para detectar dinamicamente a última rodada com dados reais
async function detectarUltimaRodadaComDados() {
  const cacheKey = 'ultima_rodada_com_dados';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    CartolaLogger.debug('Última rodada com dados obtida do cache', { rodada: cached });
    return cached;
  }

  try {
    CartolaLogger.info('Detectando dinamicamente a última rodada com dados...');
    
    // Estratégia 1: Tentar obter da API de mercado primeiro
    let rodadaAtualAPI = 1;
    try {
      const statusResponse = await retryRequest(async () => {
        return await axios.get('https://api.cartola.globo.com/mercado/status', {
          timeout: 10000,
          headers: {
            'User-Agent': 'Super-Cartola-Manager/1.0.0',
            'Accept': 'application/json'
          }
        });
      });
      
      if (statusResponse.status === 200 && statusResponse.data.rodada_atual) {
        rodadaAtualAPI = statusResponse.data.rodada_atual;
        CartolaLogger.info(`Rodada atual da API Cartola: ${rodadaAtualAPI}`);
      }
    } catch (apiError) {
      CartolaLogger.warn('Erro ao obter rodada da API Cartola, continuando com detecção baseada em dados', {
        error: apiError.message
      });
    }

    // Estratégia 2: Verificar rodadas com dados reais (de trás para frente)
    let ultimaRodadaComDados = 1;
    const maxRodadasParaVerificar = Math.min(rodadaAtualAPI + 2, 38); // Verificar até 2 rodadas à frente da API
    
    for (let rodada = maxRodadasParaVerificar; rodada >= 1; rodada--) {
      try {
        CartolaLogger.debug(`Verificando se rodada ${rodada} tem dados...`);
        
        // Tentar buscar dados de atletas pontuados da rodada
        const atletasResponse = await retryRequest(async () => {
          return await axios.get(`https://api.cartola.globo.com/atletas/pontuados/${rodada}`, {
            timeout: 8000,
            headers: {
              'User-Agent': 'Super-Cartola-Manager/1.0.0',
              'Accept': 'application/json'
            }
          });
        });

        if (atletasResponse.status === 200 && atletasResponse.data && atletasResponse.data.atletas) {
          const atletas = atletasResponse.data.atletas;
          const numAtletas = Object.keys(atletas).length;
          
          if (numAtletas > 50) { // Se tem mais de 50 atletas, provavelmente a rodada aconteceu
            ultimaRodadaComDados = rodada;
            CartolaLogger.info(`Rodada ${rodada} confirmada com dados (${numAtletas} atletas)`);
            break;
          } else {
            CartolaLogger.debug(`Rodada ${rodada} tem poucos dados (${numAtletas} atletas), continuando...`);
          }
        }
      } catch (rodadaError) {
        CartolaLogger.debug(`Rodada ${rodada} não tem dados ou erro: ${rodadaError.message}`);
        // Continuar verificando rodadas anteriores
      }
      
      // Pequeno delay para não sobrecarregar a API
      await sleep(200);
    }

    // Estratégia 3: Fallback baseado na data atual (estimativa)
    if (ultimaRodadaComDados === 1) {
      const agora = new Date();
      const inicioTemporada = SEASON_CONFIG.dataInicio || new Date('2026-01-28');
      const diasDesdeInicio = Math.floor((agora - inicioTemporada) / (1000 * 60 * 60 * 24));
      const rodadaEstimada = Math.max(1, Math.min(Math.floor(diasDesdeInicio / 7) + 1, 38));
      
      ultimaRodadaComDados = rodadaEstimada;
      CartolaLogger.warn(`Usando estimativa baseada em data: rodada ${ultimaRodadaComDados}`, {
        diasDesdeInicio,
        rodadaEstimada
      });
    }

    // Cache por 30 minutos (dados podem mudar durante o fim de semana)
    cache.set(cacheKey, ultimaRodadaComDados, 1800);
    
    CartolaLogger.info(`Última rodada com dados detectada: ${ultimaRodadaComDados}`);
    return ultimaRodadaComDados;
    
  } catch (error) {
    CartolaLogger.error('Erro ao detectar última rodada com dados', {
      error: error.message
    });
    
    // Fallback final: estimativa baseada na data atual
    const agora = new Date();
    const inicioTemporada = SEASON_CONFIG.dataInicio || new Date('2026-01-28');
    const diasDesdeInicio = Math.floor((agora - inicioTemporada) / (1000 * 60 * 60 * 24));
    const rodadaEstimada = Math.max(1, Math.min(Math.floor(diasDesdeInicio / 7) + 1, 38));
    
    CartolaLogger.warn(`Usando fallback baseado em data: rodada ${rodadaEstimada}`, {
      inicioTemporada: inicioTemporada.toISOString(),
      diasDesdeInicio,
      rodadaEstimada
    });
    return rodadaEstimada;
  }
}

// Função para obter o total de rodadas do campeonato (dinâmico)
function obterTotalRodadasCampeonato() {
  // Por enquanto mantém 38, mas pode ser expandido para detectar dinamicamente
  // baseado em configurações da temporada ou API
  return 38;
}
// END dynamic-round fix

// Serviço principal da API do Cartola
class CartolaApiService {
  constructor() {
    this.httpClient = createHttpClient();
    this.baseUrl = 'https://api.cartola.globo.com';
  }

  // BEGIN dynamic-round fix
  // Obter rodada atual real (detecção dinâmica)
  async obterRodadaAtualReal() {
    return await detectarUltimaRodadaComDados();
  }

  // Obter total de rodadas do campeonato
  obterTotalRodadas() {
    return obterTotalRodadasCampeonato();
  }
  // END dynamic-round fix

  // Obter status do mercado e rodada atual
  async obterStatusMercado() {
    const cacheKey = 'mercado_status';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      CartolaLogger.debug('Status do mercado obtido do cache');
      return cached;
    }

    try {
      CartolaLogger.info('Buscando status do mercado na API Cartola...');
      
      const response = await retryRequest(async () => {
        return await this.httpClient.get(`${this.baseUrl}/mercado/status`);
      });

      if (response.status !== 200) {
        throw new Error(`API retornou status ${response.status}`);
      }

      // BEGIN dynamic-round fix
      // Usar detecção dinâmica em vez de fallback hardcoded
      const rodadaAtualReal = await this.obterRodadaAtualReal();
      // END dynamic-round fix

      const data = {
        rodadaAtual: response.data.rodada_atual || rodadaAtualReal, // BEGIN dynamic-round fix
        mercadoAberto: response.data.mercado_aberto || false,
        fechamento: response.data.fechamento || null,
        temporadaId: response.data.temporada_id || null
      };

      cache.set(cacheKey, data);
      CartolaLogger.info('Status do mercado obtido com sucesso', data);
      
      return data;
    } catch (error) {
      CartolaLogger.error('Erro ao obter status do mercado', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // BEGIN dynamic-round fix
      // Usar detecção dinâmica em vez de fallback hardcoded
      const rodadaAtualReal = await this.obterRodadaAtualReal();
      // END dynamic-round fix
      
      // Fallback para valores padrão
      return {
        rodadaAtual: rodadaAtualReal, // BEGIN dynamic-round fix
        mercadoAberto: false,
        fechamento: null,
        temporadaId: null
      };
    }
  }

  // Obter times de uma liga
  async obterTimesLiga(ligaId) {
    if (!ligaId) {
      throw new Error('Liga ID é obrigatório');
    }

    const cacheKey = `liga_times_${ligaId}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      CartolaLogger.debug(`Times da liga ${ligaId} obtidos do cache`);
      return cached;
    }

    try {
      CartolaLogger.info(`Buscando times da liga ${ligaId}...`);
      
      const response = await retryRequest(async () => {
        return await this.httpClient.get(`${this.baseUrl}/liga/${ligaId}`);
      });

      if (response.status === 404) {
        throw new Error(`Liga ${ligaId} não encontrada`);
      }

      if (response.status !== 200) {
        throw new Error(`API retornou status ${response.status}`);
      }

      if (!response.data || !response.data.times) {
        throw new Error('Resposta da API não contém dados de times');
      }

      const timesIds = response.data.times.map(time => {
        if (!time.time_id) {
          CartolaLogger.warn('Time sem ID encontrado', time);
          return null;
        }
        return parseInt(time.time_id);
      }).filter(id => id !== null);

      if (timesIds.length === 0) {
        throw new Error('Nenhum time válido encontrado na liga');
      }

      cache.set(cacheKey, timesIds, 600); // Cache por 10 minutos
      CartolaLogger.info(`${timesIds.length} times encontrados na liga ${ligaId}`);
      
      return timesIds;
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      CartolaLogger.error(`Erro ao obter times da liga ${ligaId}`, {
        error: error.message,
        status: status,
        data: data
      });

      // Tratar erros específicos da API do Cartola
      if (status === 500) {
        if (data?.mensagem === "Não foi possível obter liga") {
          throw new Error(`Liga ${ligaId} não existe, está privada ou inacessível`);
        }
        throw new Error(`Erro interno da API do Cartola para a liga ${ligaId}`);
      }
      
      if (status === 404) {
        throw new Error(`Liga ${ligaId} não encontrada`);
      }
      
      if (status === 403) {
        throw new Error(`Liga ${ligaId} é privada ou acesso negado`);
      }
      
      throw error;
    }
  }

  // Obter dados de um time em uma rodada específica
  async obterDadosTimeRodada(timeId, rodada) {
    if (!timeId || !rodada) {
      throw new Error('Time ID e rodada são obrigatórios');
    }

    const cacheKey = `time_${timeId}_rodada_${rodada}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      CartolaLogger.debug(`Dados do time ${timeId} rodada ${rodada} obtidos do cache`);
      return cached;
    }

    try {
      CartolaLogger.debug(`Buscando dados do time ${timeId} na rodada ${rodada}...`);
      
      const response = await retryRequest(async () => {
        return await this.httpClient.get(`${this.baseUrl}/time/id/${timeId}/${rodada}`);
      });

      if (response.status === 404) {
        CartolaLogger.debug(`Time ${timeId} não jogou na rodada ${rodada}`);
        return null;
      }

      if (response.status !== 200) {
        throw new Error(`API retornou status ${response.status}`);
      }

      if (!response.data) {
        throw new Error('Resposta da API vazia');
      }

      // Validar estrutura dos dados
      const dadosTime = {
        timeId: parseInt(timeId),
        rodada: parseInt(rodada),
        atletas: [],
        pontos: response.data.pontos || 0,
        patrimonio: response.data.patrimonio || 0
      };

      if (response.data.atletas && Array.isArray(response.data.atletas)) {
        dadosTime.atletas = response.data.atletas.map(atleta => {
          const scoutValidado = validateScoutData(atleta.scout);
          
          return {
            atletaId: parseInt(atleta.atleta_id) || 0,
            nome: (atleta.apelido || 'Desconhecido').trim(),
            posicaoId: parseInt(atleta.posicao_id) || 0,
            clubeId: parseInt(atleta.clube_id) || 0,
            pontos: parseFloat(atleta.pontos_num) || 0,
            gols: scoutValidado.gols,
            golsContra: scoutValidado.golsContra,
            scout: atleta.scout || {},
            scoutValido: scoutValidado.isValid
          };
        });
      }

      cache.set(cacheKey, dadosTime, 3600); // Cache por 1 hora
      CartolaLogger.debug(`Dados do time ${timeId} rodada ${rodada} processados: ${dadosTime.atletas.length} atletas`);
      
      return dadosTime;
    } catch (error) {
      CartolaLogger.error(`Erro ao obter dados do time ${timeId} rodada ${rodada}`, {
        error: error.message,
        status: error.response?.status,
        timeId,
        rodada
      });
      
      if (error.response?.status === 404) {
        return null; // Time não jogou nesta rodada
      }
      
      throw error;
    }
  }

  // Coletar gols de uma rodada específica usando API de atletas pontuados
  async coletarGolsRodadaDireta(ligaId, rodada) {
    CartolaLogger.info(`Coletando gols da rodada ${rodada} usando API de atletas pontuados`);

    try {
      const response = await retryRequest(async () => {
        return await this.httpClient.get(`${this.baseUrl}/atletas/pontuados/${rodada}`);
      });

      if (!response.data || !response.data.atletas) {
        throw new Error(`Dados de atletas não encontrados para a rodada ${rodada}`);
      }

      const atletas = response.data.atletas;
      const dadosGols = [];

      // Processar cada atleta
      for (const [atletaId, dadosAtleta] of Object.entries(atletas)) {
        const gols = dadosAtleta.scout?.G || 0; // G = gols no scout
        
        if (gols > 0 || true) { // Incluir todos os atletas para estatísticas completas
          dadosGols.push({
            ligaId: ligaId,
            rodada: parseInt(rodada),
            atletaId: parseInt(atletaId),
            nome: dadosAtleta.apelido || 'N/D',
            timeId: dadosAtleta.clube_id || 0, // timeId é obrigatório no modelo
            clube: dadosAtleta.clube_id || 0,
            posicao: dadosAtleta.posicao_id || 0,
            gols: gols,
            pontos: dadosAtleta.pontuacao || 0,
            golsContra: dadosAtleta.scout?.GC || 0, // GC = gols contra
            scoutValido: true,
            dataColeta: new Date()
          });
        }
      }

      CartolaLogger.info(`Processados ${dadosGols.length} atletas da rodada ${rodada}`, {
        atletasComGols: dadosGols.filter(a => a.gols > 0).length,
        totalAtletas: dadosGols.length
      });

      return {
        [`rodada_${rodada}`]: dadosGols,
        ligaId,
        rodadasProcessadas: 1,
        totalRegistros: dadosGols.length
      };

    } catch (error) {
      CartolaLogger.error(`Erro ao coletar gols da rodada ${rodada}`, {
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  // Coletar dados de gols para uma liga
  async coletarGolsLiga(ligaId, rodadaEspecifica = null) {
    CartolaLogger.info(`Iniciando coleta de gols para liga ${ligaId}`, {
      ligaId,
      rodadaEspecifica
    });

    try {
      // Para rodada específica, usar API de atletas pontuados diretamente
      if (rodadaEspecifica) {
        return await this.coletarGolsRodadaDireta(ligaId, rodadaEspecifica);
      }

      // Para múltiplas rodadas, tentar obter times da liga
      const timesIds = await this.obterTimesLiga(ligaId);
      
      if (timesIds.length === 0) {
        throw new Error('Nenhum time encontrado na liga');
      }

      // BEGIN dynamic-round fix
      // Usar detecção dinâmica em vez de obter do status do mercado
      const rodadaAtual = await this.obterRodadaAtualReal();
      // END dynamic-round fix

      // Definir rodadas a processar
      const rodadas = rodadaEspecifica 
        ? [rodadaEspecifica] 
        : Array.from({ length: rodadaAtual }, (_, i) => i + 1);

      CartolaLogger.info(`Processando ${rodadas.length} rodadas para ${timesIds.length} times`);

      const resultados = {
        ligaId,
        rodadasProcessadas: 0,
        totalRegistros: 0,
        timesProcessados: timesIds.length,
        erros: [],
        detalhes: []
      };

      // Processar cada rodada
      for (const rodada of rodadas) {
        try {
          CartolaLogger.info(`Processando rodada ${rodada}...`);
          
          const golsRodada = [];
          let timesComDados = 0;
          let atletasProcessados = 0;

          // Processar cada time da rodada
          for (const timeId of timesIds) {
            try {
              const dadosTime = await this.obterDadosTimeRodada(timeId, rodada);
              
              if (dadosTime && dadosTime.atletas) {
                timesComDados++;
                
                dadosTime.atletas.forEach(atleta => {
                  atletasProcessados++;
                  
                  // Criar registro mesmo se não tiver gols (para controle)
                  const registro = {
                    ligaId: ligaId,
                    rodada: rodada,
                    atletaId: atleta.atletaId,
                    nome: atleta.nome,
                    timeId: timeId,
                    gols: atleta.gols,
                    golsContra: atleta.golsContra,
                    golsLiquidos: atleta.gols - atleta.golsContra,
                    pontos: atleta.pontos,
                    posicao: atleta.posicaoId,
                    clube: atleta.clubeId,
                    scoutValido: atleta.scoutValido,
                    dataColeta: new Date()
                  };

                  golsRodada.push(registro);
                });
              }

              // Delay para não sobrecarregar a API
              await sleep(200);
            } catch (timeError) {
              CartolaLogger.warn(`Erro ao processar time ${timeId} na rodada ${rodada}`, {
                error: timeError.message,
                timeId,
                rodada
              });
              
              resultados.erros.push({
                tipo: 'time',
                timeId,
                rodada,
                erro: timeError.message
              });
            }
          }

          resultados.detalhes.push({
            rodada,
            registrosColetados: golsRodada.length,
            timesComDados,
            atletasProcessados
          });

          resultados.totalRegistros += golsRodada.length;
          resultados.rodadasProcessadas++;

          CartolaLogger.info(`Rodada ${rodada} processada`, {
            registros: golsRodada.length,
            timesComDados,
            atletasProcessados
          });

          // Retornar dados da rodada para serem salvos pelo controller
          if (golsRodada.length > 0) {
            resultados[`rodada_${rodada}`] = golsRodada;
          }

        } catch (rodadaError) {
          CartolaLogger.error(`Erro ao processar rodada ${rodada}`, {
            error: rodadaError.message,
            rodada
          });
          
          resultados.erros.push({
            tipo: 'rodada',
            rodada,
            erro: rodadaError.message
          });
        }
      }

      CartolaLogger.info('Coleta de gols concluída', {
        rodadasProcessadas: resultados.rodadasProcessadas,
        totalRegistros: resultados.totalRegistros,
        totalErros: resultados.erros.length
      });

      return resultados;
    } catch (error) {
      CartolaLogger.error('Erro geral na coleta de gols', {
        error: error.message,
        ligaId,
        rodadaEspecifica
      });
      throw error;
    }
  }

  // =========================================================================
  // BUSCA DE TIME POR NOME
  // Usado para cadastrar novos participantes na renovação de temporada
  // =========================================================================

  /**
   * Busca times por nome na API do Cartola
   * @param {string} query - Nome ou parte do nome do time/cartoleiro
   * @param {number} limit - Máximo de resultados (default: 20)
   * @returns {Promise<Array>} Lista de times encontrados
   */
  async buscarTimePorNome(query, limit = 20) {
    if (!query || query.trim().length < 3) {
      throw new Error('A busca requer pelo menos 3 caracteres');
    }

    const queryNormalizada = query.trim();
    const cacheKey = `busca_time_${queryNormalizada.toLowerCase()}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      CartolaLogger.debug(`Busca por "${queryNormalizada}" obtida do cache`);
      return cached;
    }

    try {
      CartolaLogger.info(`Buscando times com query: "${queryNormalizada}"`);

      const response = await retryRequest(async () => {
        return await this.httpClient.get(`${this.baseUrl}/times`, {
          params: { q: queryNormalizada }
        });
      });

      if (response.status !== 200) {
        throw new Error(`API retornou status ${response.status}`);
      }

      // A API retorna um array de times ou vazio
      let times = response.data || [];

      // Normalizar e limitar resultados
      const timesNormalizados = times.slice(0, limit).map(time => ({
        time_id: parseInt(time.time_id),
        nome_time: time.nome || '',
        nome_cartoleiro: time.nome_cartola || '',
        escudo: time.url_escudo_png || time.url_escudo_svg || '',
        assinante: time.assinante || false,
        slug: time.slug || ''
      }));

      // Cache por 5 minutos (busca é relativamente estável)
      cache.set(cacheKey, timesNormalizados, 300);

      CartolaLogger.info(`Busca "${queryNormalizada}" retornou ${timesNormalizados.length} times`);
      return timesNormalizados;

    } catch (error) {
      CartolaLogger.error(`Erro ao buscar times por nome "${queryNormalizada}"`, {
        error: error.message,
        status: error.response?.status
      });

      // Se 404 ou similar, retornar lista vazia em vez de erro
      if (error.response?.status === 404) {
        return [];
      }

      throw error;
    }
  }

  /**
   * Busca dados completos de um time específico pelo ID
   * @param {number} timeId - ID oficial do time no Cartola
   * @returns {Promise<Object|null>} Dados do time ou null se não encontrado
   */
  async buscarTimePorId(timeId) {
    if (!timeId) {
      throw new Error('Time ID é obrigatório');
    }

    const cacheKey = `time_completo_${timeId}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      CartolaLogger.debug(`Dados do time ${timeId} obtidos do cache`);
      return cached;
    }

    try {
      CartolaLogger.info(`Buscando dados completos do time ${timeId}`);

      const response = await retryRequest(async () => {
        return await this.httpClient.get(`${this.baseUrl}/time/id/${timeId}`);
      });

      if (response.status === 404) {
        CartolaLogger.warn(`Time ${timeId} não encontrado`);
        return null;
      }

      if (response.status !== 200) {
        throw new Error(`API retornou status ${response.status}`);
      }

      const time = response.data.time || response.data;

      const dadosNormalizados = {
        time_id: parseInt(time.time_id),
        nome_time: time.nome || '',
        nome_cartoleiro: time.nome_cartola || '',
        escudo: time.url_escudo_png || time.url_escudo_svg || '',
        assinante: time.assinante || false,
        slug: time.slug || '',
        patrimonio: time.patrimonio || 0,
        pontos_campeonato: time.pontos_campeonato || 0,
        rodada_time_id: time.rodada_time_id || null,
        // ✅ v1.1: Incluir clube_id (time do coração do participante)
        clube_id: time.clube_id || null,
        // ✅ v1.2: Incluir foto_perfil do cartoleiro (como Paulinett Miranda)
        foto_perfil: time.foto_perfil || time.url_foto_perfil || ''
      };

      // Cache por 1 hora (dados de time mudam pouco)
      cache.set(cacheKey, dadosNormalizados, 3600);

      CartolaLogger.info(`Dados do time ${timeId} obtidos com sucesso`);
      return dadosNormalizados;

    } catch (error) {
      CartolaLogger.error(`Erro ao buscar time ${timeId}`, {
        error: error.message,
        status: error.response?.status
      });

      if (error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Busca dados COMPLETOS de um time por ID (sem normalização)
   * Retorna todos os campos da API Cartola para exibição ao admin
   * @param {number} timeId - ID do time
   * @returns {Object|null} Dados completos do time ou null se não encontrado
   */
  async buscarTimePorIdCompleto(timeId) {
    if (!timeId) {
      throw new Error('Time ID é obrigatório');
    }

    const cacheKey = `time_raw_${timeId}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      CartolaLogger.debug(`Dados RAW do time ${timeId} obtidos do cache`);
      return cached;
    }

    try {
      CartolaLogger.info(`Buscando dados COMPLETOS (raw) do time ${timeId}`);

      const response = await retryRequest(async () => {
        return await this.httpClient.get(`${this.baseUrl}/time/id/${timeId}`);
      });

      if (response.status === 404) {
        CartolaLogger.warn(`Time ${timeId} não encontrado (busca completa)`);
        return null;
      }

      if (response.status !== 200) {
        throw new Error(`API retornou status ${response.status}`);
      }

      // Retornar dados COMPLETOS sem normalização
      const dadosCompletos = response.data;

      // Cache por 30 minutos (dados completos)
      cache.set(cacheKey, dadosCompletos, 1800);

      CartolaLogger.info(`Dados COMPLETOS do time ${timeId} obtidos com sucesso`);
      return dadosCompletos;

    } catch (error) {
      CartolaLogger.error(`Erro ao buscar dados completos do time ${timeId}`, {
        error: error.message,
        status: error.response?.status
      });

      if (error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Obtém status de uma rodada específica
   * @param {number} rodada - Número da rodada (1-38)
   * @returns {Promise<string>} 'futura' | 'em_andamento' | 'parciais' | 'consolidada' | 'encerrada'
   */
  async getRodadaStatus(rodada) {
    try {
      const statusMercado = await this.obterStatusMercado();
      const rodadaAtual = statusMercado.rodada_atual;
      const statusCode = statusMercado.status_mercado;

      // Lógica centralizada de estados
      if (rodada > rodadaAtual) {
        return 'futura';
      } else if (rodada === rodadaAtual && statusCode === 1) {
        return 'em_andamento'; // Mercado aberto
      } else if (rodada === rodadaAtual && statusCode === 2) {
        return 'parciais'; // Mercado fechado, jogos rolando
      } else if (rodada < rodadaAtual) {
        return 'consolidada'; // Rodada anterior
      } else if (statusCode === 6) {
        return 'encerrada'; // Temporada encerrada
      } else {
        return 'consolidada'; // Default seguro
      }
    } catch (error) {
      CartolaLogger.error(`Erro ao obter status da rodada ${rodada}`, { error: error.message });
      // Fallback seguro
      return 'consolidada';
    }
  }

  // Limpar cache
  limparCache() {
    cache.flushAll();
    CartolaLogger.info('Cache limpo com sucesso');
  }

  // Obter estatísticas do cache
  obterEstatisticasCache() {
    const stats = cache.getStats();
    CartolaLogger.info('Estatísticas do cache', stats);
    return stats;
  }
}

export default new CartolaApiService();

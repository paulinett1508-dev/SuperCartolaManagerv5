/**
 * LLM Service v1.0
 * Service genérico para integração com APIs de LLM (Claude, Grok, Gemini)
 *
 * Responsabilidades:
 * - Comunicação com API Claude (Anthropic)
 * - Cache inteligente de respostas
 * - Rate limiting e retry logic
 * - Sanitização de dados sensíveis
 * - Logging e monitoramento de custos
 */

import Anthropic from '@anthropic-ai/sdk';
import NodeCache from 'node-cache';
import crypto from 'crypto';

// Cache para respostas de análises (TTL: 1 hora)
const cache = new NodeCache({ stdTTL: 3600 });

// Logger personalizado
class LLMLogger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [LLM-SERVICE] [${level.toUpperCase()}] ${message}`;

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

// Cliente Anthropic (lazy initialization)
let anthropicClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada no .env');
    }

    anthropicClient = new Anthropic({ apiKey });
    LLMLogger.info('Cliente Anthropic inicializado');
  }

  return anthropicClient;
}

// Função para sanitizar dados sensíveis
function sanitizarDados(texto) {
  if (typeof texto !== 'string') {
    texto = JSON.stringify(texto);
  }

  // Remover padrões sensíveis
  const patterns = [
    // Senhas
    { regex: /"senha":\s*"[^"]*"/gi, replacement: '"senha": "[REDACTED]"' },
    { regex: /"password":\s*"[^"]*"/gi, replacement: '"password": "[REDACTED]"' },

    // API Keys
    { regex: /sk-ant-[a-zA-Z0-9-_]{95}/g, replacement: 'sk-ant-[REDACTED]' },
    { regex: /sk-[a-zA-Z0-9]{48}/g, replacement: 'sk-[REDACTED]' },

    // CPF
    { regex: /\d{3}\.\d{3}\.\d{3}-\d{2}/g, replacement: 'XXX.XXX.XXX-XX' },
    { regex: /"cpf":\s*"\d{11}"/gi, replacement: '"cpf": "[REDACTED]"' },

    // Email (parcial - manter domínio)
    { regex: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      replacement: (match, user, domain) => `${user.charAt(0)}***@${domain}` },
  ];

  let textoSanitizado = texto;
  patterns.forEach(({ regex, replacement }) => {
    textoSanitizado = textoSanitizado.replace(regex, replacement);
  });

  return textoSanitizado;
}

// Gerar hash MD5 para cache key
function gerarCacheKey(tipo, contexto) {
  const hash = crypto.createHash('md5')
    .update(`${tipo}:${JSON.stringify(contexto)}`)
    .digest('hex');
  return `llm_${hash}`;
}

// Prompts especializados por tipo de análise
const PROMPTS_ESPECIALIZADOS = {
  'financeiro-auditoria': {
    systemPrompt: `Você é um auditor financeiro especializado em análise de dados de ligas de fantasy football.
Analise os dados fornecidos buscando:
- Inconsistências em saldos e transações
- Padrões anormais de movimentação financeira
- Possíveis bugs ou duplicações
- Recomendações de ajustes

Formato de resposta: Markdown estruturado com seções claras.`,

    userPromptTemplate: (contexto) => `Analise os seguintes dados financeiros:

${JSON.stringify(contexto.dados, null, 2)}

Foque em: ${contexto.foco || 'análise geral de inconsistências'}`
  },

  'performance-participante': {
    systemPrompt: `Você é um analista de dados de fantasy football especializado em performance de participantes.
Analise padrões de:
- Escalações (capitães, reservas, posições)
- Pontuação ao longo das rodadas
- Ranking e posicionamento
- Comparação com média da liga

Formato de resposta: Insights acionáveis em Markdown.`,

    userPromptTemplate: (contexto) => `Analise a performance do participante:

Time ID: ${contexto.timeId}
Nome: ${contexto.nomeTime || 'N/A'}
Dados: ${JSON.stringify(contexto.dados, null, 2)}

Período: ${contexto.periodo || 'toda temporada'}`
  },

  'comportamento-liga': {
    systemPrompt: `Você é um especialista em análise de comportamento de usuários em plataformas gamificadas.
Analise métricas de engajamento:
- Frequência de acesso
- Módulos mais utilizados
- Taxa de churn (participantes inativos)
- Padrões temporais (horários de pico)

Formato de resposta: Relatório executivo em Markdown.`,

    userPromptTemplate: (contexto) => `Analise o comportamento da liga:

Liga ID: ${contexto.ligaId}
Nome: ${contexto.nomeLiga || 'N/A'}
Dados de atividade: ${JSON.stringify(contexto.dados, null, 2)}

Período: ${contexto.periodo || 'última semana'}`
  },

  'diagnostico-sistema': {
    systemPrompt: `Você é um engenheiro de software especializado em debugging e análise de logs.
Analise logs e erros buscando:
- Padrões de falhas recorrentes
- Gargalos de performance
- Problemas de integração com APIs externas
- Sugestões de otimização

Formato de resposta: Lista priorizada de ações em Markdown.`,

    userPromptTemplate: (contexto) => `Diagnostique os seguintes logs/erros:

${contexto.logs || 'N/A'}

Contexto adicional: ${contexto.contextoAdicional || 'Nenhum'}`
  },

  'generico': {
    systemPrompt: `Você é um assistente inteligente especializado em análise de dados do Super Cartola Manager.
Forneça análises claras, objetivas e acionáveis.`,

    userPromptTemplate: (contexto) => `${contexto.prompt}

Dados: ${JSON.stringify(contexto.dados, null, 2)}`
  }
};

// Retry logic com backoff exponencial
async function retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      // Não retenta erros de validação (4xx exceto 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      if (isLastAttempt) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      LLMLogger.warn(`Tentativa ${attempt} falhou, retry em ${delay}ms`, {
        error: error.message,
        status: error.status
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Solicita análise usando Claude (Anthropic)
 * @param {Object} params
 * @param {string} params.tipo - Tipo de análise (financeiro-auditoria, performance-participante, etc)
 * @param {Object} params.contexto - Contexto da análise (dados, período, foco, etc)
 * @param {boolean} params.useCache - Usar cache (padrão: true)
 * @param {string} params.model - Modelo Claude (padrão: claude-3-5-sonnet-20241022)
 * @returns {Promise<Object>} { resposta, tokensUsados, custoEstimado, fromCache }
 */
export async function solicitarAnalise({ tipo, contexto, useCache = true, model = 'claude-3-5-sonnet-20241022' }) {
  const startTime = Date.now();

  try {
    // Validação
    if (!tipo) {
      throw new Error('Tipo de análise é obrigatório');
    }

    if (!contexto) {
      throw new Error('Contexto é obrigatório');
    }

    // Verificar cache
    if (useCache) {
      const cacheKey = gerarCacheKey(tipo, contexto);
      const cached = cache.get(cacheKey);

      if (cached) {
        LLMLogger.info('Resposta retornada do cache', { tipo, cacheKey });
        return {
          ...cached,
          fromCache: true,
          tempoResposta: Date.now() - startTime
        };
      }
    }

    // Sanitizar dados
    const contextoSanitizado = JSON.parse(sanitizarDados(JSON.stringify(contexto)));

    // Obter prompt especializado
    const promptConfig = PROMPTS_ESPECIALIZADOS[tipo] || PROMPTS_ESPECIALIZADOS['generico'];
    const systemPrompt = promptConfig.systemPrompt;
    const userPrompt = promptConfig.userPromptTemplate(contextoSanitizado);

    // Fazer request para API Claude
    const client = getAnthropicClient();

    const requestFn = async () => {
      return await client.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.3, // Baixa para respostas mais determinísticas
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });
    };

    LLMLogger.info('Solicitando análise à API Claude', { tipo, model });
    const response = await retryRequest(requestFn);

    // Extrair resposta
    const resposta = response.content[0].text;
    const tokensUsados = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens
    };

    // Calcular custo estimado (Claude 3.5 Sonnet - Preços de jan/2025)
    // Input: $3/1M tokens, Output: $15/1M tokens
    const custoEstimado = (
      (tokensUsados.input * 3 / 1000000) +
      (tokensUsados.output * 15 / 1000000)
    ).toFixed(4);

    const resultado = {
      resposta,
      tokensUsados,
      custoEstimado: parseFloat(custoEstimado),
      fromCache: false,
      tempoResposta: Date.now() - startTime,
      model,
      tipo
    };

    // Salvar no cache
    if (useCache) {
      const cacheKey = gerarCacheKey(tipo, contexto);
      cache.set(cacheKey, resultado);
      LLMLogger.info('Resposta salva no cache', { tipo, cacheKey });
    }

    LLMLogger.info('Análise concluída com sucesso', {
      tipo,
      tokensUsados: tokensUsados.total,
      custoEstimado,
      tempoResposta: resultado.tempoResposta
    });

    return resultado;

  } catch (error) {
    LLMLogger.error('Erro ao solicitar análise', {
      tipo,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

/**
 * Limpa cache de análises
 * @param {string} tipo - Tipo específico ou null para limpar tudo
 */
export function limparCache(tipo = null) {
  if (tipo) {
    const keys = cache.keys().filter(key => key.includes(tipo));
    cache.del(keys);
    LLMLogger.info(`Cache limpo para tipo: ${tipo}`, { keysRemovidas: keys.length });
  } else {
    cache.flushAll();
    LLMLogger.info('Cache completamente limpo');
  }
}

/**
 * Retorna estatísticas do cache
 */
export function estatisticasCache() {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    hitRate: cache.getStats().hits / (cache.getStats().hits + cache.getStats().misses) || 0
  };
}

export default {
  solicitarAnalise,
  limparCache,
  estatisticasCache
};

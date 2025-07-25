// ✅ CORREÇÃO CRÍTICA: Imports corrigidos para estrutura de pastas
import { calcularFinanceiroConfronto } from "../pontos-corridos-utils.js";
import { getLigaId } from "../pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
import {
    valoresRodadaPadrao,
    valoresRodadaCartoleirosSobral,
    RODADA_INICIAL_PONTOS_CORRIDOS,
    ID_SUPERCARTOLA_2025,
    ID_CARTOLEIROS_SOBRAL,
    normalizarTimeId,
} from "./fluxo-financeiro-utils.js";

// ==============================
// LÓGICA PRINCIPAL DE CÁLCULO
// ==============================

export class FluxoFinanceiroCore {
    constructor(cache) {
        this.cache = cache;
    }

    /**
     * Método estático para criar instância
     * @param {FluxoFinanceiroCache} cache - Instância do cache
     * @returns {FluxoFinanceiroCore} - Nova instância
     */
    static criarInstancia(cache) {
        return new FluxoFinanceiroCore(cache);
    }

    /**
     * Método estático para buscar participante
     * @param {string} timeId - ID do time
     * @returns {Promise<Object|null>} - Participante ou null
     */
    static async buscarParticipante(timeId) {
        // Tentar buscar da instância global se disponível
        if (window.fluxoFinanceiroCore) {
            return await window.fluxoFinanceiroCore.buscarParticipante(timeId);
        }
        
        console.warn('[FLUXO-CORE] Instância global não encontrada');
        return null;
    }

    /**
     * Calcula extrato financeiro completo para um time
     * ✅ CORREÇÃO: Inclui TODAS as funcionalidades (melhor mês, etc.)
     * @param {string} timeId - ID do time
     * @param {number} ultimaRodadaCompleta - Última rodada completa
     * @returns {Object} - Extrato financeiro completo
     */
    calcularExtratoFinanceiro(timeId, ultimaRodadaCompleta) {
        const ligaId = getLigaId();
        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
        const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;
        const camposEditaveis =
            FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);

        const extrato = {
            rodadas: [],
            resumo: {
                bonus: 0,
                onus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                melhorMes: 0, // ✅ CORREÇÃO: Campo que estava faltando
                campo1: camposEditaveis.campo1.valor,
                campo2: camposEditaveis.campo2.valor,
                campo3: camposEditaveis.campo3.valor,
                campo4: camposEditaveis.campo4.valor,
                vezesMito: 0,
                vezesMico: 0,
                saldo: 0,
            },
            totalTimes: 0,
            camposEditaveis: camposEditaveis,
        };

        // Processar cada rodada
        for (let rodada = 1; rodada <= ultimaRodadaCompleta; rodada++) {
            const rodadaData = this._processarRodada(
                timeId,
                rodada,
                isSuperCartola2025,
                isCartoleirosSobral,
            );

            if (rodadaData) {
                extrato.rodadas.push(rodadaData);
                extrato.totalTimes = Math.max(
                    extrato.totalTimes,
                    rodadaData.totalTimes,
                );

                // Acumular valores no resumo
                this._acumularValores(
                    extrato.resumo,
                    rodadaData,
                    isSuperCartola2025,
                );
            }
        }

        // Calcular saldo acumulado por rodada
        this._calcularSaldoAcumulado(extrato.rodadas);

        // Calcular saldo final
        extrato.resumo.saldo = this._calcularSaldoFinal(extrato.resumo);

        return extrato;
    }

    /**
     * Processa uma rodada específica
     * @param {string} timeId - ID do time
     * @param {number} rodada - Número da rodada
     * @param {boolean} isSuperCartola2025 - Se é SuperCartola 2025
     * @param {boolean} isCartoleirosSobral - Se é Cartoleiros Sobral
     * @returns {Object|null} - Dados da rodada ou null se não encontrada
     * @private
     */
    _processarRodada(timeId, rodada, isSuperCartola2025, isCartoleirosSobral) {
        const ranking = this.cache.getRankingRodada(rodada);
        if (!ranking || !ranking.length) {
            return null;
        }

        const posicao = ranking.findIndex((r) => {
            const rTimeId = normalizarTimeId(r.timeId || r.time_id || r.id);
            return rTimeId === normalizarTimeId(timeId);
        });

        if (posicao === -1) {
            return null;
        }

        const totalTimes = ranking.length;
        const posicaoReal = posicao + 1;
        const isMito = posicaoReal === 1;
        const isMico = posicaoReal === totalTimes;

        // Calcular bônus/ônus
        const bonusOnus = this._calcularBonusOnus(
            posicaoReal,
            isCartoleirosSobral,
        );

        // Calcular pontos corridos (apenas para SuperCartola 2025)
        const pontosCorridos = isSuperCartola2025
            ? this.calcularPontosCorridosParaRodada(timeId, rodada)
            : null;

        // Calcular mata-mata (apenas para SuperCartola 2025)
        const mataMata = isSuperCartola2025
            ? this._calcularMataMata(timeId, rodada)
            : null;

        // ✅ CORREÇÃO: Calcular melhor mês
        const melhorMes = this._calcularMelhorMes(timeId, rodada);

        return {
            rodada,
            posicao: posicaoReal,
            totalTimes,
            bonusOnus,
            pontosCorridos,
            mataMata,
            melhorMes, // ✅ CORREÇÃO: Campo que estava faltando
            isMito,
            isMico,
        };
    }

    /**
     * Calcula bônus/ônus baseado na posição
     * @param {number} posicao - Posição do time
     * @param {boolean} isCartoleirosSobral - Se é liga Cartoleiros Sobral
     * @returns {number} - Valor do bônus/ônus
     * @private
     */
    _calcularBonusOnus(posicao, isCartoleirosSobral) {
        const valoresRodadaAtual = isCartoleirosSobral
            ? valoresRodadaCartoleirosSobral
            : valoresRodadaPadrao;

        return valoresRodadaAtual[posicao] || 0;
    }

    /**
     * ✅ CORREÇÃO: Calcula pontos corridos usando função corrigida
     * @param {string} timeId - ID do time
     * @param {number} rodada - Número da rodada
     * @returns {number|null} - Valor dos pontos corridos ou null
     */
    calcularPontosCorridosParaRodada(timeId, rodada) {
        // Verifica se a rodada está dentro do período dos pontos corridos
        if (rodada < RODADA_INICIAL_PONTOS_CORRIDOS) {
            return null; // Pontos corridos só começam na rodada 7
        }

        const idxRodada = rodada - RODADA_INICIAL_PONTOS_CORRIDOS;
        const confrontos = this.cache.getConfrontosPontosCorridos();

        // Verifica se existe confronto para esta rodada
        if (!confrontos || idxRodada >= confrontos.length) {
            return null;
        }

        const jogos = confrontos[idxRodada];
        if (!jogos || !Array.isArray(jogos)) {
            return null;
        }

        // Busca o confronto que envolve este time
        const confronto = jogos.find((jogo) => {
            const timeA_id = normalizarTimeId(
                jogo.timeA?.id || jogo.timeA?.time_id || jogo.timeA?.timeId,
            );
            const timeB_id = normalizarTimeId(
                jogo.timeB?.id || jogo.timeB?.time_id || jogo.timeB?.timeId,
            );
            return (
                timeA_id === normalizarTimeId(timeId) ||
                timeB_id === normalizarTimeId(timeId)
            );
        });

        if (!confronto) {
            return null; // Time não tem confronto nesta rodada
        }

        // Busca as pontuações dos times no ranking da rodada
        const ranking = this.cache.getRankingRodada(rodada);
        if (!ranking || !Array.isArray(ranking)) {
            return null;
        }

        const timeA_id = normalizarTimeId(
            confronto.timeA?.id ||
                confronto.timeA?.time_id ||
                confronto.timeA?.timeId,
        );
        const timeB_id = normalizarTimeId(
            confronto.timeB?.id ||
                confronto.timeB?.time_id ||
                confronto.timeB?.timeId,
        );

        const dadosTimeA = ranking.find(
            (r) => normalizarTimeId(r.timeId || r.time_id || r.id) === timeA_id,
        );
        const dadosTimeB = ranking.find(
            (r) => normalizarTimeId(r.timeId || r.time_id || r.id) === timeB_id,
        );

        if (!dadosTimeA || !dadosTimeB) {
            return null; // Não conseguiu encontrar pontuações
        }

        const pontosTimeA = parseFloat(dadosTimeA.pontos);
        const pontosTimeB = parseFloat(dadosTimeB.pontos);

        if (isNaN(pontosTimeA) || isNaN(pontosTimeB)) {
            return null; // Pontuações inválidas
        }

        // ✅ CORREÇÃO CRÍTICA: Usar função corrigida importada
        const resultado = calcularFinanceiroConfronto(pontosTimeA, pontosTimeB);

        // Determinar qual time é o atual e retornar seu valor
        const isTimeA = timeA_id === normalizarTimeId(timeId);
        const valorFinanceiro = isTimeA
            ? resultado.financeiroA
            : resultado.financeiroB;

        console.log(
            `[FluxoFinanceiroCore] ✅ Time ${timeId} - Rodada ${rodada} - ${isTimeA ? "TimeA" : "TimeB"} - PontosCorridos: ${isTimeA ? pontosTimeA : pontosTimeB} vs ${isTimeA ? pontosTimeB : pontosTimeA} = R$ ${valorFinanceiro}`,
        );

        return valorFinanceiro;
    }

    /**
     * Calcula valor do mata-mata para uma rodada
     * @param {string} timeId - ID do time
     * @param {number} rodada - Número da rodada
     * @returns {number|null} - Valor do mata-mata ou null
     * @private
     */
    _calcularMataMata(timeId, rodada) {
        const resultados = this.cache.getResultadosMataMata();
        if (!resultados || resultados.length === 0) {
            return null;
        }

        const resultado = resultados.find(
            (r) =>
                r.rodadaPontos === rodada &&
                normalizarTimeId(r.timeId) === normalizarTimeId(timeId),
        );

        if (resultado) {
            console.log(
                `[FluxoFinanceiroCore] ✅ Time ${timeId} - Rodada ${rodada} - Fase ${resultado.fase} - MataMata: R$ ${resultado.valor}`,
            );
            return resultado.valor;
        }

        return null;
    }

    /**
     * Calcula valor do melhor mês para uma rodada
     * ✅ CORREÇÃO: Funcionalidade que estava faltando
     * @param {string} timeId - ID do time
     * @param {number} rodada - Número da rodada
     * @returns {number|null} - Valor do melhor mês ou null
     * @private
     */
    _calcularMelhorMes(timeId, rodada) {
        const resultados = this.cache.getResultadosMelhorMes();
        if (!resultados || resultados.length === 0) {
            return null;
        }

        // Buscar resultado do melhor mês para este time e rodada
        const resultado = resultados.find(
            (r) =>
                normalizarTimeId(r.timeId) === normalizarTimeId(timeId) &&
                r.rodada === rodada,
        );

        if (resultado) {
            console.log(
                `[FluxoFinanceiroCore] ✅ Time ${timeId} - Rodada ${rodada} - MelhorMes: R$ ${resultado.valor}`,
            );
            return resultado.valor;
        }

        return null;
    }

    /**
     * Acumula valores no resumo
     * ✅ CORREÇÃO: Inclui melhor mês na acumulação
     * @param {Object} resumo - Objeto de resumo
     * @param {Object} rodadaData - Dados da rodada
     * @param {boolean} isSuperCartola2025 - Se é SuperCartola 2025
     * @private
     */
    _acumularValores(resumo, rodadaData, isSuperCartola2025) {
        if (rodadaData.bonusOnus > 0) resumo.bonus += rodadaData.bonusOnus;
        if (rodadaData.bonusOnus < 0) resumo.onus += rodadaData.bonusOnus;

        if (rodadaData.isMito) resumo.vezesMito++;
        if (rodadaData.isMico) resumo.vezesMico++;

        if (isSuperCartola2025) {
            if (typeof rodadaData.pontosCorridos === "number") {
                resumo.pontosCorridos += rodadaData.pontosCorridos;
            }
            if (typeof rodadaData.mataMata === "number") {
                resumo.mataMata += rodadaData.mataMata;
            }
        }

        // ✅ CORREÇÃO: Acumular melhor mês
        if (typeof rodadaData.melhorMes === "number") {
            resumo.melhorMes += rodadaData.melhorMes;
        }
    }

    /**
     * Calcula saldo acumulado por rodada
     * ✅ CORREÇÃO: Inclui melhor mês no cálculo
     * @param {Array} rodadas - Array de rodadas
     * @private
     */
    _calcularSaldoAcumulado(rodadas) {
        let saldoAcumulado = 0;
        rodadas.forEach((rodada) => {
            const valorRodada =
                (rodada.bonusOnus || 0) +
                (rodada.pontosCorridos || 0) +
                (rodada.mataMata || 0) +
                (rodada.melhorMes || 0); // ✅ CORREÇÃO: Incluir melhor mês
            saldoAcumulado += valorRodada;
            rodada.saldo = saldoAcumulado;
        });
    }

    /**
     * Calcula saldo final
     * ✅ CORREÇÃO: Inclui melhor mês no saldo final
     * @param {Object} resumo - Objeto de resumo
     * @returns {number} - Saldo final
     * @private
     */
    _calcularSaldoFinal(resumo) {
        return (
            resumo.bonus +
            resumo.onus +
            resumo.pontosCorridos +
            resumo.mataMata +
            resumo.melhorMes + // ✅ CORREÇÃO: Incluir melhor mês
            resumo.campo1 +
            resumo.campo2 +
            resumo.campo3 +
            resumo.campo4
        );
    }

    /**
     * Carrega participantes da liga
     * @returns {Promise<Array>} - Array de participantes
     */
    async carregarParticipantes() {
        return await this.cache.carregarParticipantes();
    }

    /**
     * Carrega dados financeiros de um participante
     * @param {string} timeId - ID do time
     * @returns {Promise<Object>} - Dados financeiros
     */
    async carregarDadosFinanceiros(timeId) {
        // Por enquanto retorna um objeto básico
        // Pode ser expandido conforme necessário
        return {
            timeId: timeId,
            carregado: true,
            timestamp: Date.now()
        };
    }

    // Buscar participante específico
  async buscarParticipante(timeId) {
    const chaveCache = `participante_${timeId}`;

    return await this.cache.obterComCache(chaveCache, async () => {
      console.log(`🔍 [FLUXO-CORE] Buscando participante ${timeId}...`);

      // Primeiro, tentar buscar da lista de participantes da liga
      const participantes = await this.carregarParticipantes();
      console.log(`🔍 [FLUXO-CORE] Verificando ${participantes.length} participantes...`);

      const participante = participantes.find(p => {
        const match = String(p.time_id) === String(timeId) || 
                     String(p.id) === String(timeId) ||
                     String(p.timeId) === String(timeId);

        if (match) {
          console.log(`✅ [FLUXO-CORE] Match encontrado:`, p);
        }

        return match;
      });

      if (participante) {
        console.log(`✅ [FLUXO-CORE] Participante ${timeId} encontrado na lista`);
        return {
          ...participante,
          time_id: participante.time_id || participante.id || timeId,
          id: participante.id || participante.time_id || timeId
        };
      }

      // Se não encontrou, buscar diretamente da API
      console.log(`🔍 [FLUXO-CORE] Buscando participante ${timeId} na API...`);

      try {
        const response = await fetch(`/api/time/${timeId}`);
        if (!response.ok) {
          console.warn(`⚠️ [FLUXO-CORE] API retornou ${response.status} para time ${timeId}`);
          return null;
        }

        const dados = await response.json();
        console.log(`✅ [FLUXO-CORE] Dados da API para ${timeId}:`, dados);

        const participanteFormatado = {
          time_id: timeId,
          id: timeId,
          nome_cartoleiro: dados.nome_cartoleiro || dados.nome_cartola || 'N/D',
          nome_time: dados.nome_time || dados.nome || 'N/D',
          url_escudo_png: dados.url_escudo_png || dados.escudo_url || '',
          clube_id: dados.clube_id || null
        };

        console.log(`✅ [FLUXO-CORE] Participante formatado:`, participanteFormatado);
        return participanteFormatado;

      } catch (error) {
        console.error(`❌ [FLUXO-CORE] Erro ao buscar participante ${timeId}:`, error);
        return null;
      }
    }, 5 * 60 * 1000); // Cache por 5 minutos
  }
}
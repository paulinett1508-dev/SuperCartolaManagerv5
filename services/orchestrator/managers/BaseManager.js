/**
 * BASE MANAGER v1.0.0
 *
 * Classe base para todos os gerentes de módulo do Round-Market Orchestrator.
 * Cada módulo (Artilheiro, Luva de Ouro, Ranking, etc.) implementa um gerente
 * que herda desta classe e define seus hooks de ciclo de vida.
 *
 * Hooks disponíveis:
 * - onMarketOpen()     → Mercado abriu (rodada anterior finalizou)
 * - onMarketClose()    → Mercado fechou (nova rodada começou)
 * - onLiveUpdate()     → Atualização durante rodada ativa (parciais)
 * - onRoundFinalize()  → Rodada finalizou, hora de consolidar
 * - onPreSeason()      → Pré-temporada detectada
 */

import OrchestratorState from '../../../models/OrchestratorState.js';

export default class BaseManager {
    /**
     * @param {Object} config
     * @param {string} config.id - Identificador único (ex: "artilheiro", "ranking_geral")
     * @param {string} config.nome - Nome legível (ex: "Artilheiro Campeão")
     * @param {string} config.moduloKey - Chave em liga.modulos_ativos (ex: "artilheiro")
     * @param {boolean} config.sempreAtivo - Se true, ignora modulos_ativos (base modules)
     * @param {string[]} config.dependencias - IDs de managers que devem executar antes
     * @param {number} config.prioridade - Ordem de execução (menor = primeiro)
     * @param {boolean} config.temColeta - Se coleta dados da API durante rodada
     * @param {boolean} config.temFinanceiro - Se gera lançamentos financeiros
     */
    constructor(config = {}) {
        this.id = config.id || 'base';
        this.nome = config.nome || 'Base Manager';
        this.moduloKey = config.moduloKey || null;
        this.sempreAtivo = config.sempreAtivo || false;
        this.dependencias = config.dependencias || [];
        this.prioridade = config.prioridade || 50;
        this.temColeta = config.temColeta || false;
        this.temFinanceiro = config.temFinanceiro || false;

        // Estado interno
        this._status = 'idle';
        this._ultimoErro = null;
        this._ultimaExecucao = null;
    }

    // =========================================================================
    // HOOKS DE CICLO DE VIDA (override nas subclasses)
    // =========================================================================

    /**
     * Mercado ABRIU → rodada anterior finalizou
     * Use para: limpar estados temporários, preparar para próxima rodada
     */
    async onMarketOpen(contexto) {
        // Override na subclasse
    }

    /**
     * Mercado FECHOU → nova rodada começou
     * Use para: iniciar coleta de dados, ativar polling
     */
    async onMarketClose(contexto) {
        // Override na subclasse
    }

    /**
     * Atualização LIVE durante rodada ativa
     * Use para: atualizar parciais, gols, defesas
     * Chamado a cada ciclo de polling (2-5 min)
     */
    async onLiveUpdate(contexto) {
        // Override na subclasse
    }

    /**
     * Rodada FINALIZOU → hora de processar resultados
     * Use para: calcular rankings, determinar vencedores
     */
    async onRoundFinalize(contexto) {
        // Override na subclasse
    }

    /**
     * Consolidação da rodada
     * Use para: gerar lançamentos financeiros, salvar snapshots
     * Executado APÓS onRoundFinalize de todos os managers
     */
    async onConsolidate(contexto) {
        // Override na subclasse
    }

    /**
     * Pré-temporada detectada
     * Use para: resetar estados, preparar nova temporada
     */
    async onPreSeason(contexto) {
        // Override na subclasse
    }

    // =========================================================================
    // VERIFICAÇÃO DE ATIVAÇÃO
    // =========================================================================

    /**
     * Verifica se este manager deve executar para uma liga específica
     */
    isEnabled(liga) {
        if (this.sempreAtivo) return true;
        if (!this.moduloKey) return false;

        // Verificar em configuracoes.{modulo}.habilitado primeiro
        const configModulo = liga?.configuracoes?.[this.moduloKey];
        if (configModulo?.habilitado !== undefined) {
            return configModulo.habilitado;
        }

        // Fallback para modulos_ativos
        const modulos = liga?.modulos_ativos || {};
        if (modulos[this.moduloKey] !== undefined) {
            return modulos[this.moduloKey];
        }

        // Tentar camelCase
        const camelKey = this.moduloKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (modulos[camelKey] !== undefined) {
            return modulos[camelKey];
        }

        return false;
    }

    // =========================================================================
    // EXECUÇÃO SEGURA (com try/catch e logging)
    // =========================================================================

    /**
     * Executa um hook de forma segura, com logging e atualização de estado
     */
    async executarHook(hookName, contexto) {
        const hookFn = this[hookName];
        if (!hookFn || typeof hookFn !== 'function') return null;

        const inicio = Date.now();
        this._status = hookName === 'onLiveUpdate' ? 'coletando' :
                       hookName === 'onConsolidate' ? 'consolidando' : 'processando';

        try {
            await this._atualizarStatusDB(this._status);

            const resultado = await hookFn.call(this, contexto);

            this._status = 'concluido';
            this._ultimaExecucao = new Date();
            this._ultimoErro = null;

            const duracao = Date.now() - inicio;
            console.log(`[ORCHESTRATOR] [${this.id}] ${hookName} concluído em ${duracao}ms`);

            await this._atualizarStatusDB('concluido');
            return resultado;
        } catch (error) {
            this._status = 'erro';
            this._ultimoErro = error.message;

            console.error(`[ORCHESTRATOR] [${this.id}] ${hookName} ERRO:`, error.message);

            await this._atualizarStatusDB('erro', error.message);
            return null;
        }
    }

    /**
     * Atualiza status deste manager no MongoDB
     */
    async _atualizarStatusDB(status, erro = null) {
        try {
            await OrchestratorState.atualizarManager(this.id, {
                status,
                ultimaExecucao: status === 'concluido' ? new Date() : undefined,
                ultimoErro: erro,
            });
        } catch (e) {
            // Silencioso - não interromper fluxo por erro de persistência
        }
    }

    // =========================================================================
    // SERIALIZAÇÃO
    // =========================================================================

    toJSON() {
        return {
            id: this.id,
            nome: this.nome,
            moduloKey: this.moduloKey,
            sempreAtivo: this.sempreAtivo,
            dependencias: this.dependencias,
            prioridade: this.prioridade,
            temColeta: this.temColeta,
            temFinanceiro: this.temFinanceiro,
            status: this._status,
            ultimoErro: this._ultimoErro,
            ultimaExecucao: this._ultimaExecucao,
        };
    }
}

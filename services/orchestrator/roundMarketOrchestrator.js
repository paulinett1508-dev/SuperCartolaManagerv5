/**
 * ROUND-MARKET ORCHESTRATOR v1.0.0
 *
 * Máquina de estados central que detecta transições do mercado Cartola FC
 * e orquestra o ciclo de vida completo de cada rodada.
 *
 * Substitui o consolidacaoScheduler.js (v4.0) com:
 * - Máquina de estados formal (não apenas if/else)
 * - EventEmitter para desacoplamento
 * - Registry de managers por módulo
 * - Persistência completa no MongoDB
 * - Suporte a multi-liga (itera por todas as ligas ativas)
 *
 * Estados do Mercado Cartola:
 * 1 = ABERTO (mercado liberado para escalação)
 * 2 = FECHADO (rodada em andamento)
 * 4 = ENCERRADO (rodada finalizou, aguardando mercado abrir)
 * 6 = TEMPORADA_ENCERRADA
 *
 * Ciclo normal: ABERTO(1) → FECHADO(2) → ABERTO(1) [próxima rodada]
 *               (às vezes: FECHADO(2) → ENCERRADO(4) → ABERTO(1))
 */

import { EventEmitter } from 'events';
import marketGate from '../../utils/marketGate.js';
import OrchestratorState from '../../models/OrchestratorState.js';
import Liga from '../../models/Liga.js';
import { CURRENT_SEASON } from '../../config/seasons.js';
import { criarManagers, criarManagersMap } from './managers/index.js';

// ============================================================================
// CONSTANTES
// ============================================================================

const MARKET_STATUS = {
    ABERTO: 1,
    FECHADO: 2,
    DESBLOQUEADO: 3,
    ENCERRADO: 4,
    FUTURO: 5,
    TEMPORADA_ENCERRADA: 6,
};

const MARKET_LABEL = {
    1: 'ABERTO',
    2: 'FECHADO',
    3: 'DESBLOQUEADO',
    4: 'ENCERRADO',
    5: 'FUTURO',
    6: 'TEMPORADA_ENCERRADA',
};

const FASE_RODADA = {
    AGUARDANDO: 'aguardando',
    COLETANDO: 'coletando_dados',
    LIVE: 'atualizando_live',
    FINALIZANDO: 'finalizando',
    CONSOLIDANDO: 'consolidando',
    CONCLUIDA: 'concluida',
    ERRO: 'erro',
};

// Intervalos de polling (ms)
const POLL_MERCADO_ABERTO = 5 * 60 * 1000;    // 5 min (mercado aberto = menos urgente)
const POLL_RODADA_ATIVA = 2 * 60 * 1000;       // 2 min (rodada em andamento)
const POLL_LIVE_UPDATE = 3 * 60 * 1000;        // 3 min (parciais)

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

class RoundMarketOrchestrator extends EventEmitter {
    constructor() {
        super();

        // Estado
        this._statusMercado = null;
        this._statusAnterior = null;
        this._rodadaAtual = null;
        this._temporada = CURRENT_SEASON;
        this._faseRodada = FASE_RODADA.AGUARDANDO;

        // Managers
        this._managers = criarManagers();
        this._managersMap = criarManagersMap();

        // Polling
        this._pollInterval = null;
        this._liveInterval = null;
        this._ativo = false;

        // Controle
        this._inicializado = false;
        this._consolidandoAgora = false;

        // Event handlers são configurados externamente via .on()
    }

    // ========================================================================
    // INICIALIZAÇÃO
    // ========================================================================

    async iniciar() {
        if (this._ativo) {
            console.log('[ORCHESTRATOR] Já está ativo, ignorando');
            return;
        }

        console.log('[ORCHESTRATOR] ═══════════════════════════════════════════');
        console.log('[ORCHESTRATOR] 🚀 Round-Market Orchestrator v1.0.0');
        console.log(`[ORCHESTRATOR] 📅 Temporada: ${this._temporada}`);
        console.log(`[ORCHESTRATOR] 🔧 Managers registrados: ${this._managers.length}`);
        this._managers.forEach(m => {
            console.log(`[ORCHESTRATOR]    → ${m.id} (prioridade: ${m.prioridade}, sempre: ${m.sempreAtivo})`);
        });
        console.log('[ORCHESTRATOR] ═══════════════════════════════════════════');

        // Restaurar estado persistido
        await this._restaurarEstado();

        // Primeira verificação imediata
        await this._verificarMercado();

        // Iniciar polling
        this._iniciarPolling();

        this._ativo = true;
        this._inicializado = true;

        await OrchestratorState.salvar({
            polling_ativo: true,
            uptime_inicio: new Date(),
        });

        console.log('[ORCHESTRATOR] ✅ Orchestrator ativo e monitorando mercado');
    }

    async parar() {
        console.log('[ORCHESTRATOR] 🛑 Parando orchestrator...');

        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
        if (this._liveInterval) {
            clearInterval(this._liveInterval);
            this._liveInterval = null;
        }

        this._ativo = false;

        await OrchestratorState.salvar({ polling_ativo: false });
        console.log('[ORCHESTRATOR] Orchestrator parado');
    }

    // ========================================================================
    // POLLING & DETECÇÃO DE TRANSIÇÕES
    // ========================================================================

    _iniciarPolling() {
        const intervalo = this._statusMercado === MARKET_STATUS.FECHADO
            ? POLL_RODADA_ATIVA
            : POLL_MERCADO_ABERTO;

        if (this._pollInterval) clearInterval(this._pollInterval);

        this._pollInterval = setInterval(() => this._verificarMercado(), intervalo);
        console.log(`[ORCHESTRATOR] ⏰ Polling configurado: ${intervalo / 1000}s`);
    }

    async _verificarMercado() {
        try {
            const status = await marketGate.fetchStatus();
            if (!status || status._fallback) {
                console.warn('[ORCHESTRATOR] ⚠️ Status mercado indisponível');
                return;
            }

            const novoStatus = status.status_mercado;
            const novaRodada = status.rodada_atual;

            // Detectar transições
            if (this._statusMercado !== null && novoStatus !== this._statusMercado) {
                await this._processarTransicao(this._statusMercado, novoStatus, novaRodada);
            }

            // Atualizar estado interno
            this._statusAnterior = this._statusMercado;
            this._statusMercado = novoStatus;
            this._rodadaAtual = novaRodada;

            // Persistir
            await OrchestratorState.salvar({
                status_mercado: novoStatus,
                status_mercado_anterior: this._statusAnterior,
                rodada_atual: novaRodada,
                temporada: this._temporada,
                fase_rodada: this._faseRodada,
                ultimo_poll: new Date(),
            });

            // Se rodada ativa, disparar live updates
            if (novoStatus === MARKET_STATUS.FECHADO && !this._liveInterval) {
                this._iniciarLiveUpdates();
            }

        } catch (error) {
            console.error('[ORCHESTRATOR] ❌ Erro ao verificar mercado:', error.message);
            await OrchestratorState.registrarEvento({
                tipo: 'erro_poll',
                detalhes: { erro: error.message },
            });
        }
    }

    // ========================================================================
    // MÁQUINA DE ESTADOS - TRANSIÇÕES
    // ========================================================================

    async _processarTransicao(de, para, rodada) {
        const labelDe = MARKET_LABEL[de] || de;
        const labelPara = MARKET_LABEL[para] || para;

        console.log(`[ORCHESTRATOR] ═══════════════════════════════════════════`);
        console.log(`[ORCHESTRATOR] 🔔 TRANSIÇÃO: ${labelDe} → ${labelPara} (R${rodada})`);
        console.log(`[ORCHESTRATOR] ═══════════════════════════════════════════`);

        await OrchestratorState.registrarEvento({
            tipo: 'transicao_mercado',
            de,
            para,
            rodada,
            detalhes: { temporada: this._temporada },
        });

        await OrchestratorState.salvar({
            total_transicoes: (await this._getContadorTransicoes()) + 1,
        });

        // Ajustar polling para novo estado
        this._iniciarPolling();

        // Despachar para handlers específicos
        if (de === MARKET_STATUS.ABERTO && para === MARKET_STATUS.FECHADO) {
            await this._onMercadoFechou(rodada);
        }
        else if (de === MARKET_STATUS.FECHADO && para === MARKET_STATUS.ABERTO) {
            await this._onMercadoAbriu(rodada);
        }
        else if (de === MARKET_STATUS.FECHADO && para === MARKET_STATUS.ENCERRADO) {
            await this._onRodadaEncerrada(rodada);
        }
        else if (de === MARKET_STATUS.ENCERRADO && para === MARKET_STATUS.ABERTO) {
            await this._onMercadoAbriu(rodada);
        }
        else if (para === MARKET_STATUS.TEMPORADA_ENCERRADA) {
            await this._onTemporadaEncerrada();
        }
        else {
            console.log(`[ORCHESTRATOR] Transição não-mapeada: ${labelDe} → ${labelPara}`);
        }
    }

    // ========================================================================
    // HANDLERS DE TRANSIÇÃO
    // ========================================================================

    /**
     * MERCADO FECHOU → Nova rodada começou
     * Ativa coleta de dados para todos os managers com temColeta
     */
    async _onMercadoFechou(rodada) {
        console.log(`[ORCHESTRATOR] 🔒 Mercado FECHOU - R${rodada} em andamento`);
        this._faseRodada = FASE_RODADA.COLETANDO;

        const contexto = this._criarContexto(rodada);
        const ligas = await this._getligasAtivas();

        for (const liga of ligas) {
            const ctx = { ...contexto, liga, ligaId: liga._id.toString() };

            for (const manager of this._managers) {
                if (manager.isEnabled(liga) && manager.temColeta) {
                    await manager.executarHook('onMarketClose', ctx);
                }
            }
        }

        this._faseRodada = FASE_RODADA.LIVE;
        this.emit('mercado:fechou', { rodada, temporada: this._temporada });
    }

    /**
     * MERCADO ABRIU → Rodada anterior finalizou
     * Dispara finalização + consolidação
     */
    async _onMercadoAbriu(rodada) {
        const rodadaFinalizada = rodada - 1;
        console.log(`[ORCHESTRATOR] 🔓 Mercado ABRIU - R${rodadaFinalizada} finalizada`);

        // Parar live updates
        this._pararLiveUpdates();

        // Fase: finalizando
        this._faseRodada = FASE_RODADA.FINALIZANDO;

        const contexto = this._criarContexto(rodadaFinalizada);
        const ligas = await this._getligasAtivas();

        // 1. Notificar managers que mercado abriu
        for (const liga of ligas) {
            const ctx = { ...contexto, liga, ligaId: liga._id.toString() };

            for (const manager of this._managers) {
                if (manager.isEnabled(liga)) {
                    await manager.executarHook('onMarketOpen', ctx);
                }
            }
        }

        // 2. Disparar finalização de rodada
        await this._finalizarRodada(rodadaFinalizada, ligas);

        // 3. Disparar consolidação
        await this._consolidarRodada(rodadaFinalizada, ligas);

        this._faseRodada = FASE_RODADA.AGUARDANDO;
        this.emit('mercado:abriu', { rodada, rodadaFinalizada, temporada: this._temporada });
    }

    /**
     * RODADA ENCERRADA (status 4) → Intermediário antes de abrir mercado
     */
    async _onRodadaEncerrada(rodada) {
        console.log(`[ORCHESTRATOR] ⏹️ Rodada ${rodada} ENCERRADA (aguardando mercado abrir)`);
        this._pararLiveUpdates();

        await OrchestratorState.registrarEvento({
            tipo: 'rodada_encerrada',
            rodada,
        });
    }

    /**
     * TEMPORADA ENCERRADA
     */
    async _onTemporadaEncerrada() {
        console.log('[ORCHESTRATOR] 🏁 TEMPORADA ENCERRADA');

        const contexto = this._criarContexto(this._rodadaAtual);
        const ligas = await this._getligasAtivas();

        for (const liga of ligas) {
            const ctx = { ...contexto, liga, ligaId: liga._id.toString() };
            for (const manager of this._managers) {
                await manager.executarHook('onPreSeason', ctx);
            }
        }

        this._pararLiveUpdates();
        this._faseRodada = FASE_RODADA.CONCLUIDA;
    }

    // ========================================================================
    // LIVE UPDATES (durante rodada ativa)
    // ========================================================================

    _iniciarLiveUpdates() {
        if (this._liveInterval) return;

        console.log(`[ORCHESTRATOR] 📡 Live updates ativados (cada ${POLL_LIVE_UPDATE / 1000}s)`);

        this._liveInterval = setInterval(async () => {
            await this._executarLiveUpdate();
        }, POLL_LIVE_UPDATE);
    }

    _pararLiveUpdates() {
        if (this._liveInterval) {
            clearInterval(this._liveInterval);
            this._liveInterval = null;
            console.log('[ORCHESTRATOR] 📡 Live updates desativados');
        }
    }

    async _executarLiveUpdate() {
        if (this._statusMercado !== MARKET_STATUS.FECHADO) return;

        const contexto = this._criarContexto(this._rodadaAtual);
        const ligas = await this._getligasAtivas();

        for (const liga of ligas) {
            const ctx = { ...contexto, liga, ligaId: liga._id.toString() };

            for (const manager of this._managers) {
                if (manager.isEnabled(liga) && manager.temColeta) {
                    await manager.executarHook('onLiveUpdate', ctx);
                }
            }
        }
    }

    // ========================================================================
    // FINALIZAÇÃO & CONSOLIDAÇÃO DE RODADA
    // ========================================================================

    async _finalizarRodada(rodada, ligas) {
        console.log(`[ORCHESTRATOR] 🏭 Finalizando R${rodada} para ${ligas.length} ligas...`);

        const contexto = this._criarContexto(rodada);

        for (const liga of ligas) {
            const ctx = { ...contexto, liga, ligaId: liga._id.toString() };

            // Executar por prioridade (managers já estão ordenados)
            for (const manager of this._managers) {
                if (manager.isEnabled(liga)) {
                    await manager.executarHook('onRoundFinalize', ctx);
                }
            }
        }

        console.log(`[ORCHESTRATOR] ✅ Finalização R${rodada} completa`);
    }

    async _consolidarRodada(rodada, ligas) {
        if (this._consolidandoAgora) {
            console.warn('[ORCHESTRATOR] ⚠️ Consolidação já em andamento, ignorando');
            return;
        }

        this._consolidandoAgora = true;
        this._faseRodada = FASE_RODADA.CONSOLIDANDO;

        console.log(`[ORCHESTRATOR] 📊 Consolidando R${rodada} para ${ligas.length} ligas...`);

        const contexto = this._criarContexto(rodada);
        const PORT = process.env.PORT || 3000;
        const BASE_URL = `http://localhost:${PORT}`;

        try {
            for (const liga of ligas) {
                const ligaId = liga._id.toString();
                const ctx = { ...contexto, liga, ligaId };

                // 1. Popular rodada (buscar dados da API Cartola)
                try {
                    console.log(`[ORCHESTRATOR] 📥 Populando R${rodada} para ${liga.nome}...`);
                    const popResponse = await fetch(`${BASE_URL}/api/rodadas/${ligaId}/rodadas`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rodada }),
                    });
                    const popResult = await popResponse.json();
                    if (popResult.success) {
                        console.log(`[ORCHESTRATOR] ✅ ${liga.nome} R${rodada} populada`);
                    }
                } catch (e) {
                    console.error(`[ORCHESTRATOR] ❌ Erro ao popular ${liga.nome}:`, e.message);
                }

                // Delay entre ligas (respeitar rate limit Cartola)
                await new Promise(r => setTimeout(r, 2000));

                // 2. Consolidar via endpoint existente
                try {
                    console.log(`[ORCHESTRATOR] 🔒 Consolidando ${liga.nome} R${rodada}...`);
                    const consResponse = await fetch(
                        `${BASE_URL}/api/consolidacao/ligas/${ligaId}/rodadas/${rodada}/consolidar`,
                        { method: 'POST' }
                    );
                    const consResult = await consResponse.json();

                    if (consResult.success) {
                        console.log(`[ORCHESTRATOR] ✅ ${liga.nome} R${rodada} consolidada`);
                    } else if (consResult.jaConsolidada) {
                        console.log(`[ORCHESTRATOR] ⏭️ ${liga.nome} R${rodada} já consolidada`);
                    }
                } catch (e) {
                    console.error(`[ORCHESTRATOR] ❌ Erro ao consolidar ${liga.nome}:`, e.message);
                }

                // 3. Notificar managers de consolidação
                for (const manager of this._managers) {
                    if (manager.isEnabled(liga) && manager.temFinanceiro) {
                        await manager.executarHook('onConsolidate', ctx);
                    }
                }

                await new Promise(r => setTimeout(r, 1000));
            }

            // Registrar sucesso
            await OrchestratorState.salvar({
                ultima_consolidacao: new Date(),
                consolidacao_em_andamento: false,
                total_consolidacoes: (await this._getContadorConsolidacoes()) + 1,
            });

            await OrchestratorState.registrarEvento({
                tipo: 'consolidacao_completa',
                rodada,
                detalhes: { ligas: ligas.length },
            });

            this._faseRodada = FASE_RODADA.CONCLUIDA;
            console.log(`[ORCHESTRATOR] ✅ Consolidação R${rodada} completa!`);

        } catch (error) {
            console.error(`[ORCHESTRATOR] ❌ Erro na consolidação R${rodada}:`, error.message);
            this._faseRodada = FASE_RODADA.ERRO;

            await OrchestratorState.salvar({
                consolidacao_em_andamento: false,
                total_erros: (await this._getContadorErros()) + 1,
            });

            await OrchestratorState.registrarEvento({
                tipo: 'erro_consolidacao',
                rodada,
                detalhes: { erro: error.message },
            });
        } finally {
            this._consolidandoAgora = false;
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    _criarContexto(rodada) {
        return {
            rodada,
            temporada: this._temporada,
            statusMercado: this._statusMercado,
            faseRodada: this._faseRodada,
            timestamp: new Date(),
        };
    }

    async _getligasAtivas() {
        return Liga.find({ ativa: { $ne: false } }).lean();
    }

    async _restaurarEstado() {
        try {
            const estado = await OrchestratorState.carregar();
            if (estado) {
                this._statusMercado = estado.status_mercado;
                this._statusAnterior = estado.status_mercado_anterior;
                this._rodadaAtual = estado.rodada_atual;
                this._faseRodada = estado.fase_rodada || FASE_RODADA.AGUARDANDO;

                console.log(`[ORCHESTRATOR] 📂 Estado restaurado: mercado=${MARKET_LABEL[this._statusMercado]}, R${this._rodadaAtual}, fase=${this._faseRodada}`);
            } else {
                console.log('[ORCHESTRATOR] 📂 Nenhum estado anterior (primeira execução)');
            }
        } catch (e) {
            console.warn('[ORCHESTRATOR] ⚠️ Falha ao restaurar estado:', e.message);
        }
    }

    async _getContadorTransicoes() {
        const estado = await OrchestratorState.carregar();
        return estado?.total_transicoes || 0;
    }

    async _getContadorConsolidacoes() {
        const estado = await OrchestratorState.carregar();
        return estado?.total_consolidacoes || 0;
    }

    async _getContadorErros() {
        const estado = await OrchestratorState.carregar();
        return estado?.total_erros || 0;
    }

    // ========================================================================
    // API PÚBLICA (para rotas e dashboard)
    // ========================================================================

    getStatus() {
        return {
            ativo: this._ativo,
            statusMercado: this._statusMercado,
            statusMercadoLabel: MARKET_LABEL[this._statusMercado] || 'DESCONHECIDO',
            rodadaAtual: this._rodadaAtual,
            temporada: this._temporada,
            faseRodada: this._faseRodada,
            consolidandoAgora: this._consolidandoAgora,
            managers: this._managers.map(m => m.toJSON()),
            liveUpdatesAtivos: !!this._liveInterval,
        };
    }

    getManager(id) {
        return this._managersMap.get(id);
    }

    getManagers() {
        return this._managers;
    }

    /**
     * Força consolidação manual (botão do admin dashboard)
     */
    async forcarConsolidacao(rodada) {
        console.log(`[ORCHESTRATOR] ⚡ Consolidação FORÇADA R${rodada}`);
        const ligas = await this._getligasAtivas();
        await this._consolidarRodada(rodada, ligas);
    }

    /**
     * Força verificação do mercado (refresh manual)
     */
    async forcarVerificacao() {
        marketGate.clearCache();
        await this._verificarMercado();
    }
}

// ============================================================================
// EXPORTAR CONSTANTES E SINGLETON
// ============================================================================

export { MARKET_STATUS, MARKET_LABEL, FASE_RODADA };

// Singleton
const orchestrator = new RoundMarketOrchestrator();
export default orchestrator;

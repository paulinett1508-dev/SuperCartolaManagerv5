/**
 * WIDGET COORDINATOR v1.0
 * ========================
 * Coordena exibição de widgets flutuantes baseado em estado do mercado
 * Garante que apenas um widget esteja visível por vez
 *
 * Widgets gerenciados:
 * - WhatsHappening (🔥 foguinho): rodada em andamento
 * - RoundXray (⚽ bola): rodada consolidada
 */

if (window.Log) Log.info("[WIDGET-COORD] Coordenador v1.0 carregando...");

class WidgetCoordinator {
    constructor() {
        this.mercadoStatus = null;
        this.participante = null;
        this.checkInterval = null;
        this.CHECK_INTERVAL_MS = 60000; // 60 segundos
    }

    /**
     * Inicializa o coordenador
     */
    init(participante) {
        this.participante = participante;

        if (window.Log) Log.info("[WIDGET-COORD] Inicializando coordenador...");

        // Verificar estado imediatamente
        this.verificarEstadoMercado();

        // Iniciar monitoramento periódico
        this.iniciarMonitoramento();
    }

    /**
     * Inicia monitoramento periódico do estado do mercado
     */
    iniciarMonitoramento() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(() => {
            this.verificarEstadoMercado();
        }, this.CHECK_INTERVAL_MS);

        if (window.Log) Log.info("[WIDGET-COORD] Monitoramento iniciado (60s)");
    }

    /**
     * Para o monitoramento
     */
    pararMonitoramento() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            if (window.Log) Log.info("[WIDGET-COORD] Monitoramento parado");
        }
    }

    /**
     * Verifica estado atual do mercado e atualiza widgets
     */
    async verificarEstadoMercado() {
        if (!this.participante || !this.participante.ligaId) {
            return;
        }

        try {
            const response = await fetch(`/api/status-mercado/${this.participante.ligaId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.mercadoStatus = await response.json();
            this.atualizarWidgets();

        } catch (error) {
            console.error("[WIDGET-COORD] Erro ao buscar status:", error);
        }
    }

    /**
     * Atualiza widgets baseado no estado do mercado
     */
    atualizarWidgets() {
        if (!this.mercadoStatus) return;

        const { status_mercado, rodada_em_andamento, rodada_atual } = this.mercadoStatus;

        // Decisão: qual widget mostrar?
        if (this.deveExibirRaioX()) {
            // Rodada consolidada + mercado aberto
            this.exibirRaioX();
            this.esconderWhatsHappening();
        } else if (this.deveExibirWhatsHappening()) {
            // Mercado fechado + rodada em andamento
            this.exibirWhatsHappening();
            this.esconderRaioX();
        } else {
            // Nenhum widget (pré-temporada ou outro estado)
            this.esconderAmbos();
        }
    }

    /**
     * Determina se deve exibir Raio-X
     */
    deveExibirRaioX() {
        if (!this.mercadoStatus) return false;

        // Verificar se módulo está ativo na liga
        if (!window.participanteNavigation?.verificarModuloAtivo?.('raioX')) return false;

        // Rodada consolidada (não em andamento)
        const rodadaConsolidada = this.mercadoStatus.rodada_atual > 0
            && !this.mercadoStatus.rodada_em_andamento;

        // Mercado aberto (aguardando próxima rodada)
        const mercadoAberto = this.mercadoStatus.status_mercado === 1; // ABERTO

        return rodadaConsolidada && mercadoAberto;
    }

    /**
     * Determina se deve exibir WhatsHappening
     */
    deveExibirWhatsHappening() {
        if (!this.mercadoStatus) return false;

        // Mercado fechado + rodada em andamento
        return this.mercadoStatus.status_mercado === 2 // FECHADO
            && this.mercadoStatus.rodada_em_andamento;
    }

    /**
     * Exibe widget Raio-X
     */
    exibirRaioX() {
        if (window.RaioXWidget && window.RaioXWidget.shouldShow(this.mercadoStatus)) {
            window.RaioXWidget.show(this.participante, this.mercadoStatus);
        }
    }

    /**
     * Exibe widget WhatsHappening
     */
    exibirWhatsHappening() {
        // WhatsHappening gerencia seu próprio estado
        // Apenas garantir que está visível (ele tem lógica interna)
    }

    /**
     * Esconde widget Raio-X
     */
    esconderRaioX() {
        if (window.RaioXWidget) {
            window.RaioXWidget.hide();
        }
    }

    /**
     * Esconde widget WhatsHappening
     */
    esconderWhatsHappening() {
        // WhatsHappening gerencia seu próprio estado
        // Não forçar hide aqui para não interferir com lógica interna
    }

    /**
     * Esconde ambos os widgets
     */
    esconderAmbos() {
        this.esconderRaioX();
        // WhatsHappening se esconde sozinho quando não há dados
    }
}

// Singleton global
window.widgetCoordinator = new WidgetCoordinator();

export default window.widgetCoordinator;

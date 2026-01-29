// MatchdayService.js - Gerenciador de estado global Matchday
class MatchdayService {
  constructor() {
    this.isActive = false;
    this.pollingInterval = null;
    this.statusCheckInterval = null;
    this.listeners = new Map(); // Event emitter

    this.POLL_INTERVAL = 60000; // 60s
    this.STATUS_CHECK_INTERVAL = 300000; // 5min

    this.currentData = {
      rodada_atual: null,
      mercado_aberto: null,
      status_mercado: null,
      parciais: null
    };
  }

  /**
   * Inicializar service (chamar no app-init.js)
   */
  async init(ligaId) {
    this.ligaId = ligaId;
    await this.checkStatus();
    this.startStatusChecker();
  }

  /**
   * Verificar status do matchday
   */
  async checkStatus() {
    try {
      const response = await fetch('/api/matchday/status');
      const data = await response.json();

      this.currentData.rodada_atual = data.rodada_atual;
      this.currentData.mercado_aberto = data.mercado_aberto;
      this.currentData.status_mercado = data.status_mercado;

      const wasActive = this.isActive;
      this.isActive = data.matchday_ativo;

      // Transição de estado
      if (this.isActive && !wasActive) {
        this.onMatchdayStart();
      } else if (!this.isActive && wasActive) {
        this.onMatchdayStop();
      }

      this.emit('status:changed', { isActive: this.isActive, ...data });
    } catch (error) {
      console.error('[MATCHDAY-SERVICE] Erro checkStatus:', error);
    }
  }

  /**
   * Iniciar matchday (polling de parciais)
   */
  onMatchdayStart() {
    console.log('[MATCHDAY-SERVICE] 🟢 MATCHDAY INICIADO');
    this.emit('matchday:start');
    this.startPolling();
  }

  /**
   * Parar matchday
   */
  onMatchdayStop() {
    console.log('[MATCHDAY-SERVICE] 🔴 MATCHDAY ENCERRADO');
    this.stopPolling();
    this.emit('matchday:stop');
  }

  /**
   * Iniciar polling de parciais
   */
  startPolling() {
    if (this.pollingInterval) return; // Já ativo

    this.fetchParciais(); // Buscar imediatamente

    this.pollingInterval = setInterval(() => {
      this.fetchParciais();
    }, this.POLL_INTERVAL);
  }

  /**
   * Parar polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Buscar parciais da API
   */
  async fetchParciais() {
    if (!this.ligaId) return;

    try {
      const response = await fetch(`/api/matchday/parciais/${this.ligaId}?_t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await response.json();

      if (data.disponivel) {
        this.currentData.parciais = data;
        this.emit('data:parciais', data);
      }
    } catch (error) {
      console.error('[MATCHDAY-SERVICE] Erro fetchParciais:', error);
    }
  }

  /**
   * Verificar status periodicamente
   */
  startStatusChecker() {
    this.statusCheckInterval = setInterval(() => {
      this.checkStatus();
    }, this.STATUS_CHECK_INTERVAL);
  }

  /**
   * Event emitter simples
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(cb => cb(data));
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopPolling();
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    this.listeners.clear();
  }
}

// Singleton
window.MatchdayService = window.MatchdayService || new MatchdayService();
export default window.MatchdayService;

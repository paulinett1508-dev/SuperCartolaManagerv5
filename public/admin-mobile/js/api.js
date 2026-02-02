/**
 * API Module - Wrapper para chamadas de API
 */

import { getToken, logout } from './auth.js';

const API_BASE = '/api/admin/mobile';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1s

class API {
  constructor() {
    this.token = getToken();
  }

  /**
   * Requisição genérica
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token || getToken()}`,
        ...options.headers
      }
    };

    let lastError;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const response = await fetch(url, config);

        // Token expirado - redireciona para login
        if (response.status === 401) {
          console.error('Token expirado, redirecionando para login');
          logout();
          throw new Error('Token expirado');
        }

        // Erro HTTP
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `HTTP ${response.status}`);
        }

        // Sucesso
        return await response.json();
      } catch (error) {
        lastError = error;
        console.error(`Tentativa ${i + 1}/${MAX_RETRIES} falhou:`, error.message);

        // Se não for erro de rede, não retenta
        if (error.message === 'Token expirado' || error.message.startsWith('HTTP')) {
          throw error;
        }

        // Retry com backoff exponencial
        if (i < MAX_RETRIES - 1) {
          await this.sleep(RETRY_DELAY * (i + 1));
        }
      }
    }

    throw lastError;
  }

  /**
   * Helper para delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ========== ENDPOINTS ESPECÍFICOS ========== //

  /**
   * Dashboard
   */
  async getDashboard() {
    return this.get('/dashboard');
  }

  /**
   * Ligas
   */
  async getLigas(params = {}) {
    return this.get('/ligas', params);
  }

  async getLiga(ligaId) {
    return this.get(`/ligas/${ligaId}`);
  }

  /**
   * Consolidação
   */
  async consolidarRodada(ligaId, rodada) {
    return this.post('/consolidacao', { ligaId, rodada });
  }

  async getConsolidacaoStatus(jobId) {
    return this.get(`/consolidacao/status/${jobId}`);
  }

  async getConsolidacaoHistorico(ligaId, params = {}) {
    return this.get(`/consolidacao/historico/${ligaId}`, params);
  }

  /**
   * Acertos Financeiros
   */
  async getAcertos(ligaId, params = {}) {
    return this.get(`/acertos/${ligaId}`, params);
  }

  async registrarAcerto(data) {
    return this.post('/acertos', data);
  }

  async getQuitacoesPendentes() {
    return this.get('/quitacoes/pendentes');
  }

  async aprovarQuitacao(id, observacao) {
    return this.put(`/quitacoes/${id}/aprovar`, { observacao });
  }

  async recusarQuitacao(id, motivo) {
    return this.put(`/quitacoes/${id}/recusar`, { motivo });
  }

  /**
   * Dashboard de Saúde
   */
  async getHealth() {
    return this.get('/health');
  }

  /**
   * Notificações Push
   */
  async subscribeNotifications(subscription, preferences) {
    return this.post('/notifications/subscribe', {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      preferences
    });
  }

  async unsubscribeNotifications() {
    return this.delete('/notifications/unsubscribe');
  }

  async getNotificationPreferences() {
    return this.get('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences) {
    return this.put('/notifications/preferences', preferences);
  }
}

// Exporta instância única
export default new API();

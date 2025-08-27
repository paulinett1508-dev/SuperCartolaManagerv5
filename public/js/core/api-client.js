/**
 * API CLIENT
 * Padroniza todas as chamadas de API do sistema
 * Elimina inconsistências de endpoints entre páginas
 */

export class ApiClient {
    constructor(baseURL = "") {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            "Content-Type": "application/json",
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options,
        };

        try {
            const response = await fetch(url, config);

            // Log para debug - remover em produção
            console.log(
                `API ${config.method || "GET"} ${endpoint}:`,
                response.status,
            );

            if (!response.ok) {
                const errorData = await this._extractError(response);
                throw new ApiError(
                    errorData.message || "Request failed",
                    response.status,
                    errorData,
                );
            }

            return await response.json();
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            console.error(`API Error ${endpoint}:`, error);
            throw new ApiError("Network error", 0, {
                originalError: error.message,
            });
        }
    }

    async _extractError(response) {
        try {
            return await response.json();
        } catch {
            return {
                message: `HTTP ${response.status}: ${response.statusText}`,
            };
        }
    }

    // Métodos padronizados
    async get(endpoint) {
        return this.request(endpoint, { method: "GET" });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: "DELETE" });
    }

    // Métodos específicos do sistema - padronização dos endpoints inconsistentes
    async buscarTime(timeId) {
        // Unifica os 3 endpoints diferentes usados no sistema atual
        return this.get(`/api/times/${timeId}`);
    }

    async buscarTimeCartola(timeId) {
        return this.get(`/api/cartola/time/${timeId}`);
    }

    async criarLiga(dadosLiga) {
        return this.post("/api/ligas", dadosLiga);
    }

    async listarLigas() {
        return this.get("/api/ligas");
    }

    async obterLiga(ligaId) {
        return this.get(`/api/ligas/${ligaId}`);
    }

    async atualizarTimesLiga(ligaId, times) {
        return this.put(`/api/ligas/${ligaId}/times`, { times });
    }

    async removerTimeLiga(ligaId, timeId) {
        return this.delete(`/api/ligas/${ligaId}/times/${timeId}`);
    }

    async deletarLiga(ligaId) {
        return this.delete(`/api/ligas/${ligaId}`);
    }

    async obterClubes() {
        return this.get("/api/cartola/clubes");
    }
}

// Classe de erro personalizada para APIs
export class ApiError extends Error {
    constructor(message, status = 0, details = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }

    get isNetworkError() {
        return this.status === 0;
    }

    get isClientError() {
        return this.status >= 400 && this.status < 500;
    }

    get isServerError() {
        return this.status >= 500;
    }
}

/**
 * PARCIAIS MANAGER v1.0.0
 * Módulo LIVE - Scores em tempo real durante rodada
 */
import BaseManager from './BaseManager.js';

export default class ParciaisManager extends BaseManager {
    constructor() {
        super({
            id: 'parciais',
            nome: 'Parciais (Live)',
            moduloKey: null,
            sempreAtivo: true,
            dependencias: [],
            prioridade: 5,
            temColeta: true,
            temFinanceiro: false,
        });

        this._pollingAtivo = false;
    }

    async onMarketClose(ctx) {
        console.log(`[PARCIAIS] Mercado fechou - ativando polling de parciais R${ctx.rodada}`);
        this._pollingAtivo = true;
        return { pollingAtivado: true };
    }

    async onLiveUpdate(ctx) {
        if (!this._pollingAtivo) return null;
        console.log(`[PARCIAIS] Distribuindo scores live R${ctx.rodada}`);
        return { distribuindo: true };
    }

    async onMarketOpen(ctx) {
        this._pollingAtivo = false;
        console.log(`[PARCIAIS] Desativando polling - mercado abriu`);
        return { pollingDesativado: true };
    }

    async onRoundFinalize(ctx) {
        this._pollingAtivo = false;
        console.log(`[PARCIAIS] Polling encerrado R${ctx.rodada}`);
        return { encerrado: true };
    }
}

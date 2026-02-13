/**
 * CAPITAO MANAGER v1.0.0
 * Módulo OPCIONAL - Capitão de Luxo
 */
import BaseManager from './BaseManager.js';

export default class CapitaoManager extends BaseManager {
    constructor() {
        super({
            id: 'capitao',
            nome: 'Capitão de Luxo',
            moduloKey: 'capitao_luxo',
            sempreAtivo: false,
            dependencias: ['rodada'],
            prioridade: 40,
            temColeta: true,
            temFinanceiro: true,
        });

        this._coletaAtiva = false;
    }

    async onMarketClose(ctx) {
        console.log(`[CAPITAO] Mercado fechou - coletando capitães R${ctx.rodada}`);
        this._coletaAtiva = true;
        return { coletaIniciada: true };
    }

    async onLiveUpdate(ctx) {
        if (!this._coletaAtiva) return null;
        console.log(`[CAPITAO] Atualizando pontuação capitães R${ctx.rodada}`);
        return { coletando: true };
    }

    async onMarketOpen(ctx) {
        this._coletaAtiva = false;
        return { coletaEncerrada: true };
    }

    async onRoundFinalize(ctx) {
        this._coletaAtiva = false;
        console.log(`[CAPITAO] Finalizando capitão R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[CAPITAO] Consolidando ranking capitão R${ctx.rodada}`);
        return { consolidado: true };
    }
}

/**
 * RESTA UM MANAGER v1.0.0
 * Módulo PLANEJADO 2026 - Eliminação progressiva por menor pontuação
 */
import BaseManager from './BaseManager.js';

export default class RestaUmManager extends BaseManager {
    constructor() {
        super({
            id: 'resta_um',
            nome: 'Resta Um',
            moduloKey: 'resta_um',
            sempreAtivo: false,
            dependencias: ['rodada', 'ranking_geral'],
            prioridade: 72,
            temColeta: false,
            temFinanceiro: true,
        });
    }

    async onRoundFinalize(ctx) {
        console.log(`[RESTA-UM] Identificando eliminado da R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[RESTA-UM] Consolidando eliminação R${ctx.rodada}`);
        return { consolidado: true };
    }
}

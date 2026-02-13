/**
 * TOP 10 MANAGER v1.0.0
 * Módulo OPCIONAL - Mito/Mico da rodada
 */
import BaseManager from './BaseManager.js';

export default class Top10Manager extends BaseManager {
    constructor() {
        super({
            id: 'top10',
            nome: 'Top 10 (Mito/Mico)',
            moduloKey: 'top10',
            sempreAtivo: false,
            dependencias: ['rodada'],
            prioridade: 55,
            temColeta: false,
            temFinanceiro: true,
        });
    }

    async onRoundFinalize(ctx) {
        console.log(`[TOP10] Calculando mito/mico R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[TOP10] Consolidando premiações mito/mico R${ctx.rodada}`);
        return { consolidado: true };
    }
}

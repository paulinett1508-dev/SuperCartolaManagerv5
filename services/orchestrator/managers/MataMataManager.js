/**
 * MATA-MATA MANAGER v1.0.0
 * Módulo OPCIONAL - Confrontos eliminatórios
 */
import BaseManager from './BaseManager.js';

export default class MataMataManager extends BaseManager {
    constructor() {
        super({
            id: 'mata_mata',
            nome: 'Mata-Mata',
            moduloKey: 'mataMata',
            sempreAtivo: false,
            dependencias: ['rodada'],
            prioridade: 45,
            temColeta: false,
            temFinanceiro: false,
        });
    }

    async onRoundFinalize(ctx) {
        console.log(`[MATA-MATA] Calculando confrontos R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[MATA-MATA] Consolidando confrontos R${ctx.rodada}`);
        return { consolidado: true };
    }
}

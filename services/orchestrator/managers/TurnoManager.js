/**
 * TURNO MANAGER v1.0.0
 * Módulo OPCIONAL - Turno/Returno
 */
import BaseManager from './BaseManager.js';

export default class TurnoManager extends BaseManager {
    constructor() {
        super({
            id: 'turno',
            nome: 'Turno/Returno',
            moduloKey: 'turno_returno',
            sempreAtivo: false,
            dependencias: ['rodada'],
            prioridade: 65,
            temColeta: false,
            temFinanceiro: false,
        });
    }

    async onRoundFinalize(ctx) {
        console.log(`[TURNO] Atualizando turno/returno R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[TURNO] Consolidando turno/returno R${ctx.rodada}`);
        return { consolidado: true };
    }
}

/**
 * HISTORICO MANAGER v1.0.0
 * Módulo BASE (sempre ativo) - Hall da Fama
 */
import BaseManager from './BaseManager.js';

export default class HistoricoManager extends BaseManager {
    constructor() {
        super({
            id: 'historico',
            nome: 'Hall da Fama',
            moduloKey: 'historico',
            sempreAtivo: true,
            dependencias: ['ranking_geral'],
            prioridade: 90,
            temColeta: false,
            temFinanceiro: false,
        });
    }

    async onRoundFinalize(ctx) {
        console.log(`[HISTORICO] Verificando novos recordes após R${ctx.rodada}`);
        return { verificado: true };
    }

    async onConsolidate(ctx) {
        console.log(`[HISTORICO] Atualizando Hall da Fama R${ctx.rodada}`);
        return { consolidado: true };
    }
}

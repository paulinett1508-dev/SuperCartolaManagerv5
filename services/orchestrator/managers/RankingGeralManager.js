/**
 * RANKING GERAL MANAGER v1.0.0
 * Módulo BASE (sempre ativo) - Ranking acumulado por temporada
 */
import BaseManager from './BaseManager.js';

export default class RankingGeralManager extends BaseManager {
    constructor() {
        super({
            id: 'ranking_geral',
            nome: 'Ranking Geral',
            moduloKey: 'ranking',
            sempreAtivo: true,
            dependencias: ['rodada'],
            prioridade: 20,
            temColeta: false,
            temFinanceiro: false,
        });
    }

    async onRoundFinalize(ctx) {
        console.log(`[RANKING-GERAL] Recalculando ranking acumulado R${ctx.rodada}...`);
        // O cálculo real é feito pelo consolidacaoController
        // Este manager sinaliza que está pronto para consolidação
        return { pronto: true, rodada: ctx.rodada };
    }

    async onConsolidate(ctx) {
        console.log(`[RANKING-GERAL] Consolidação R${ctx.rodada} delegada ao consolidacaoController`);
        return { consolidado: true };
    }
}

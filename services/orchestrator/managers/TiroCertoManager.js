/**
 * TIRO CERTO MANAGER v1.0.0
 * Módulo PLANEJADO 2026 - Sobrevivência (acertar vencedor)
 * Precisa de resultados REAIS do Brasileirão (API-Football, não Cartola)
 */
import BaseManager from './BaseManager.js';

export default class TiroCertoManager extends BaseManager {
    constructor() {
        super({
            id: 'tiro_certo',
            nome: 'Tiro Certo',
            moduloKey: 'tiro_certo',
            sempreAtivo: false,
            dependencias: ['rodada'],
            prioridade: 70,
            temColeta: true,
            temFinanceiro: true,
        });
    }

    async onMarketClose(ctx) {
        console.log(`[TIRO-CERTO] Coletando palpites para R${ctx.rodada}`);
        return { palpitesColetados: true };
    }

    async onLiveUpdate(ctx) {
        console.log(`[TIRO-CERTO] Atualizando resultados reais R${ctx.rodada}`);
        // Usa API-Football para resultados reais do Brasileirão
        return { atualizando: true };
    }

    async onRoundFinalize(ctx) {
        console.log(`[TIRO-CERTO] Eliminando perdedores R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[TIRO-CERTO] Consolidando eliminações R${ctx.rodada}`);
        return { consolidado: true };
    }
}

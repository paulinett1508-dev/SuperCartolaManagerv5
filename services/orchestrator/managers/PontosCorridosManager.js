/**
 * PONTOS CORRIDOS MANAGER v1.0.0
 * Módulo OPCIONAL - Liga em formato pontos corridos
 */
import BaseManager from './BaseManager.js';

export default class PontosCorridosManager extends BaseManager {
    constructor() {
        super({
            id: 'pontos_corridos',
            nome: 'Pontos Corridos',
            moduloKey: 'pontosCorridos',
            sempreAtivo: false,
            dependencias: ['rodada'],
            prioridade: 50,
            temColeta: false,
            temFinanceiro: false,
        });
    }

    async onRoundFinalize(ctx) {
        console.log(`[PONTOS-CORRIDOS] Atualizando tabela R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[PONTOS-CORRIDOS] Consolidando tabela R${ctx.rodada}`);
        return { consolidado: true };
    }
}

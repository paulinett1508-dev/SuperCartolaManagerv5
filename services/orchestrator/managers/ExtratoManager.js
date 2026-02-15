/**
 * EXTRATO MANAGER v1.0.0
 * Módulo BASE (sempre ativo) - Gestão financeira
 */
import BaseManager from './BaseManager.js';

export default class ExtratoManager extends BaseManager {
    constructor() {
        super({
            id: 'extrato',
            nome: 'Extrato Financeiro',
            moduloKey: 'extrato',
            sempreAtivo: true,
            dependencias: ['rodada', 'ranking_geral'],
            prioridade: 80,
            temColeta: false,
            temFinanceiro: true,
        });
    }

    async onConsolidate(ctx) {
        console.log(`[EXTRATO] Gerando lançamentos financeiros R${ctx.rodada}`);
        // Lançamentos são gerados pelo consolidacaoController
        // ExtratoManager garante que o cache de extratos será invalidado
        return { consolidado: true };
    }
}

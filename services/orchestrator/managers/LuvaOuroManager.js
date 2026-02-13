/**
 * LUVA DE OURO MANAGER v1.0.0
 * Módulo OPCIONAL - Luva de Ouro (coleta defesas de goleiros)
 */
import BaseManager from './BaseManager.js';

export default class LuvaOuroManager extends BaseManager {
    constructor() {
        super({
            id: 'luva_ouro',
            nome: 'Luva de Ouro',
            moduloKey: 'luvaOuro',
            sempreAtivo: false,
            dependencias: ['rodada'],
            prioridade: 35,
            temColeta: true,
            temFinanceiro: true,
        });

        this._coletaAtiva = false;
    }

    async onMarketClose(ctx) {
        console.log(`[LUVA-OURO] Mercado fechou - iniciando coleta de SG R${ctx.rodada}`);
        this._coletaAtiva = true;
        return { coletaIniciada: true, rodada: ctx.rodada };
    }

    async onLiveUpdate(ctx) {
        if (!this._coletaAtiva) return null;

        console.log(`[LUVA-OURO] Coletando saldos de gols em tempo real R${ctx.rodada}`);
        return { coletando: true };
    }

    async onMarketOpen(ctx) {
        this._coletaAtiva = false;
        console.log(`[LUVA-OURO] Coleta encerrada - mercado abriu`);
        return { coletaEncerrada: true };
    }

    async onRoundFinalize(ctx) {
        this._coletaAtiva = false;
        console.log(`[LUVA-OURO] Finalizando luva de ouro R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[LUVA-OURO] Consolidando ranking goleiros R${ctx.rodada}`);
        return { consolidado: true };
    }
}

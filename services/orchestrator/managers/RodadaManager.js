/**
 * RODADA MANAGER v1.0.0
 * Módulo BASE (sempre ativo) - Coleta e processa dados da rodada
 */
import BaseManager from './BaseManager.js';

export default class RodadaManager extends BaseManager {
    constructor() {
        super({
            id: 'rodada',
            nome: 'Rodadas / Ranking da Rodada',
            moduloKey: 'banco',
            sempreAtivo: true,
            dependencias: [],
            prioridade: 10,
            temColeta: true,
            temFinanceiro: true,
        });
    }

    async onMarketClose(ctx) {
        console.log(`[RODADA] Mercado fechou - R${ctx.rodada} iniciada`);
        return { rodadaIniciada: ctx.rodada };
    }

    async onLiveUpdate(ctx) {
        // Parciais são coletadas pelo ParciaisManager
        // RodadaManager apenas registra que a rodada está ativa
        return { rodadaAtiva: ctx.rodada };
    }

    async onRoundFinalize(ctx) {
        console.log(`[RODADA] R${ctx.rodada} finalizada - populando dados para todas as ligas`);
        // A população real é feita via HTTP call ao endpoint existente
        // pelo consolidacaoScheduler (que agora é orquestrado por nós)
        return { pronto: true, rodada: ctx.rodada };
    }

    async onConsolidate(ctx) {
        console.log(`[RODADA] Consolidando bônus/ônus da R${ctx.rodada}`);
        return { consolidado: true };
    }
}

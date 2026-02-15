/**
 * ARTILHEIRO MANAGER v1.0.0
 * Módulo OPCIONAL - Artilheiro Campeão (coleta gols da API Cartola)
 */
import BaseManager from './BaseManager.js';

export default class ArtilheiroManager extends BaseManager {
    constructor() {
        super({
            id: 'artilheiro',
            nome: 'Artilheiro Campeão',
            moduloKey: 'artilheiro',
            sempreAtivo: false,
            dependencias: ['rodada'],
            prioridade: 30,
            temColeta: true,
            temFinanceiro: true,
        });

        this._coletaAtiva = false;
    }

    async onMarketClose(ctx) {
        console.log(`[ARTILHEIRO] Mercado fechou - iniciando coleta de gols R${ctx.rodada}`);
        this._coletaAtiva = true;
        return { coletaIniciada: true, rodada: ctx.rodada };
    }

    async onLiveUpdate(ctx) {
        if (!this._coletaAtiva) return null;

        console.log(`[ARTILHEIRO] Coletando gols em tempo real R${ctx.rodada}`);
        // A coleta real será delegada ao artilheiroCampeaoController
        // via endpoint interno: POST /api/artilheiro/:ligaId/coletar-gols
        return { coletando: true };
    }

    async onMarketOpen(ctx) {
        this._coletaAtiva = false;
        console.log(`[ARTILHEIRO] Coleta encerrada - mercado abriu`);
        return { coletaEncerrada: true };
    }

    async onRoundFinalize(ctx) {
        this._coletaAtiva = false;
        console.log(`[ARTILHEIRO] Finalizando artilheiro R${ctx.rodada}`);
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[ARTILHEIRO] Consolidando ranking de gols R${ctx.rodada}`);
        return { consolidado: true };
    }
}

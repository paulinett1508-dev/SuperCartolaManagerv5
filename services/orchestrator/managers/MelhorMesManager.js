/**
 * MELHOR MES MANAGER v1.0.0
 * Módulo OPCIONAL - Prêmio melhor do mês
 */
import BaseManager from './BaseManager.js';

export default class MelhorMesManager extends BaseManager {
    constructor() {
        super({
            id: 'melhor_mes',
            nome: 'Melhor do Mês',
            moduloKey: 'melhorMes',
            sempreAtivo: false,
            dependencias: ['ranking_geral'],
            prioridade: 60,
            temColeta: false,
            temFinanceiro: true,
        });
    }

    async onRoundFinalize(ctx) {
        // Só processa se for última rodada do mês
        const agora = new Date();
        const proximaRodadaMes = this._estimarProximaRodadaMes(agora);

        if (proximaRodadaMes) {
            console.log(`[MELHOR-MES] Verificando se R${ctx.rodada} é última do mês`);
        }
        return { pronto: true };
    }

    async onConsolidate(ctx) {
        console.log(`[MELHOR-MES] Consolidando melhor do mês R${ctx.rodada}`);
        return { consolidado: true };
    }

    _estimarProximaRodadaMes(data) {
        const diaDoMes = data.getDate();
        const diasNoMes = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
        // Se estamos nos últimos 5 dias do mês, pode ser última rodada
        return diaDoMes >= diasNoMes - 5;
    }
}

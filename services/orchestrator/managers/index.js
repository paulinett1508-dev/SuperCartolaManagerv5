/**
 * MODULE MANAGER REGISTRY v1.0.0
 *
 * Registra e exporta todos os gerentes de módulo disponíveis.
 * Novos módulos são adicionados aqui para serem reconhecidos pelo orquestrador.
 */

import RodadaManager from './RodadaManager.js';
import RankingGeralManager from './RankingGeralManager.js';
import ExtratoManager from './ExtratoManager.js';
import HistoricoManager from './HistoricoManager.js';
import ArtilheiroManager from './ArtilheiroManager.js';
import LuvaOuroManager from './LuvaOuroManager.js';
import CapitaoManager from './CapitaoManager.js';
import ParciaisManager from './ParciaisManager.js';
import MataMataManager from './MataMataManager.js';
import PontosCorridosManager from './PontosCorridosManager.js';
import Top10Manager from './Top10Manager.js';
import MelhorMesManager from './MelhorMesManager.js';
import TurnoManager from './TurnoManager.js';
import TiroCertoManager from './TiroCertoManager.js';
import RestaUmManager from './RestaUmManager.js';

/**
 * Cria e retorna todas as instâncias de managers
 * Ordenados por prioridade (menor = executa primeiro)
 */
export function criarManagers() {
    const managers = [
        new ParciaisManager(),      // 5  - Live scoring (primeiro)
        new RodadaManager(),        // 10 - Base: dados da rodada
        new RankingGeralManager(),  // 20 - Base: ranking acumulado
        new ArtilheiroManager(),    // 30 - Coleta gols
        new LuvaOuroManager(),     // 35 - Coleta defesas
        new CapitaoManager(),       // 40 - Coleta capitães
        new MataMataManager(),      // 45 - Confrontos
        new PontosCorridosManager(),// 50 - Tabela
        new Top10Manager(),         // 55 - Mito/Mico
        new MelhorMesManager(),     // 60 - Prêmio mensal
        new TurnoManager(),         // 65 - Turno/Returno
        new TiroCertoManager(),     // 70 - Sobrevivência (2026)
        new RestaUmManager(),       // 72 - Eliminação (2026)
        new ExtratoManager(),       // 80 - Financeiro (quase último)
        new HistoricoManager(),     // 90 - Hall da Fama (último)
    ];

    // Ordenar por prioridade
    managers.sort((a, b) => a.prioridade - b.prioridade);

    return managers;
}

/**
 * Retorna mapa id -> manager para acesso rápido
 */
export function criarManagersMap() {
    const managers = criarManagers();
    const map = new Map();
    for (const mgr of managers) {
        map.set(mgr.id, mgr);
    }
    return map;
}

export default { criarManagers, criarManagersMap };

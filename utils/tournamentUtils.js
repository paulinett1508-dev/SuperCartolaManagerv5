/**
 * utils/tournamentUtils.js
 *
 * Funções utilitárias para lógicas de torneios.
 */

/**
 * Calcula o tamanho ideal para um torneio de mata-mata (eliminação direta)
 * baseado no número de participantes.
 *
 * A função encontra a maior potência de 2 que é menor ou igual ao número
 * de participantes, garantindo um chaveamento perfeito sem a necessidade de byes.
 * O número mínimo de participantes para um torneio é 8.
 *
 * @param {number} totalParticipantes - O número total de participantes ativos na liga.
 * @returns {number} O número de times para o torneio (e.g., 8, 16, 32) ou 0 se for insuficiente.
 *
 * @example
 * calcularTamanhoIdealMataMata(7);   // Retorna 0
 * calcularTamanhoIdealMataMata(8);   // Retorna 8
 * calcularTamanhoIdealMataMata(29);  // Retorna 16
 * calcularTamanhoIdealMataMata(45);  // Retorna 32
 * calcularTamanhoIdealMataMata(64);  // Retorna 64
 */
export function calcularTamanhoIdealMataMata(totalParticipantes) {
    if (totalParticipantes < 8) {
        return 0;
    }

    // Começa com a maior potência de 2 possível e vai diminuindo
    let potenciaDeDois = Math.pow(2, Math.floor(Math.log2(totalParticipantes)));

    // Garante que o resultado seja pelo menos 8
    return potenciaDeDois >= 8 ? potenciaDeDois : 0;
}

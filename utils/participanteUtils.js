
/**
 * Filtra participantes ativos em uma rodada específica
 */
export function filtrarParticipantesAtivosNaRodada(participantes, rodada) {
    if (!Array.isArray(participantes)) return [];
    
    return participantes.filter(p => {
        // Se está ativo, incluir
        if (p.ativo !== false) return true;
        
        // Se inativo, verificar se a rodada é anterior à desistência
        if (p.rodada_desistencia && rodada < p.rodada_desistencia) {
            return true;
        }
        
        return false;
    });
}

/**
 * Filtra apenas participantes ativos atualmente
 */
export function filtrarParticipantesAtivos(participantes) {
    if (!Array.isArray(participantes)) return [];
    return participantes.filter(p => p.ativo !== false);
}

/**
 * Filtra apenas participantes inativos
 */
export function filtrarParticipantesInativos(participantes) {
    if (!Array.isArray(participantes)) return [];
    return participantes.filter(p => p.ativo === false);
}

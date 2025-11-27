
import RodadaSnapshot from '../models/RodadaSnapshot.js';

export const obterDadosRodada = async (ligaId, rodadaSolicitada, funcaoCalculoAoVivo) => {
    // Busca status do mercado sem calcular nada
    const statusMercado = await getStatusMercadoRapido();
    const rodadaAtual = statusMercado?.rodada_atual || 38;

    // 🛑 PASSADO: Busca snapshot estático
    if (rodadaSolicitada < rodadaAtual) {
        console.log(`[SMART-FETCH] 📦 Buscando snapshot R${rodadaSolicitada} (passado)`);
        
        const snapshot = await RodadaSnapshot.findOne({ 
            liga_id: ligaId, 
            rodada: rodadaSolicitada 
        });
        
        if (snapshot) {
            console.log(`[SMART-FETCH] ✅ Snapshot encontrado (${snapshot.criado_em})`);
            return {
                ...snapshot.dados_consolidados,
                _isSnapshot: true,
                _rodada: rodadaSolicitada
            };
        }
        
        console.warn(`[SMART-FETCH] ⚠️ Snapshot R${rodadaSolicitada} ausente - calculando (ÚLTIMA VEZ)`);
    }

    // 🟢 PRESENTE/FUTURO: Calcula ao vivo
    console.log(`[SMART-FETCH] ⚡ Calculando dinâmico R${rodadaSolicitada}`);
    return await funcaoCalculoAoVivo(ligaId, rodadaSolicitada);
};

// Função auxiliar leve para status
async function getStatusMercadoRapido() {
    try {
        const response = await fetch('https://api.cartolafc.globo.com/mercado/status');
        return await response.json();
    } catch (error) {
        console.error('[SMART-FETCH] Erro ao buscar status:', error);
        return { rodada_atual: 38 }; // Fallback conservador
    }
}

export { getStatusMercadoRapido };

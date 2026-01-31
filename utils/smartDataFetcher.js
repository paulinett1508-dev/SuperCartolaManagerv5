import RodadaSnapshot from "../models/RodadaSnapshot.js";
import marketGate from "./marketGate.js";

export const obterDadosRodada = async (
    ligaId,
    rodadaSolicitada,
    funcaoCalculoAoVivo,
) => {
    // v2.0: Busca status via MarketGate (centralizado)
    const statusMercado = await marketGate.fetchStatus();
    const rodadaAtual = statusMercado?.rodada_atual || 38;

    // 🛑 VERIFICAR SE JÁ ESTÁ CONSOLIDADA (PRIORIDADE MÁXIMA)
    const snapshotConsolidado = await RodadaSnapshot.findOne({
        liga_id: ligaId,
        rodada: rodadaSolicitada,
        status: "consolidada", // ✅ NOVO: Só busca se consolidada
    }).lean();

    if (snapshotConsolidado) {
        console.log(
            `[SMART-FETCH] 🔒 Rodada ${rodadaSolicitada} CONSOLIDADA - dados imutáveis`,
        );
        return {
            ...snapshotConsolidado.dados_consolidados,
            _isSnapshot: true,
            _isConsolidada: true,
            _rodada: rodadaSolicitada,
        };
    }

    // 🛑 PASSADO NÃO CONSOLIDADO: Busca snapshot existente (para migração)
    if (rodadaSolicitada < rodadaAtual) {
        console.log(
            `[SMART-FETCH] 📦 Buscando snapshot R${rodadaSolicitada} (passado)`,
        );

        const snapshot = await RodadaSnapshot.findOne({
            liga_id: ligaId,
            rodada: rodadaSolicitada,
        }).lean();

        if (snapshot) {
            console.log(
                `[SMART-FETCH] ✅ Snapshot encontrado (${snapshot.criado_em})`,
            );
            return {
                ...snapshot.dados_consolidados,
                _isSnapshot: true,
                _isConsolidada: false,
                _rodada: rodadaSolicitada,
            };
        }

        console.warn(
            `[SMART-FETCH] ⚠️ Snapshot R${rodadaSolicitada} ausente - calculando (ÚLTIMA VEZ)`,
        );
    }

    // 🟢 PRESENTE/FUTURO: Calcula ao vivo
    console.log(`[SMART-FETCH] ⚡ Calculando dinâmico R${rodadaSolicitada}`);
    return await funcaoCalculoAoVivo(ligaId, rodadaSolicitada);
};

// ✅ NOVA FUNÇÃO: Verificar se rodada está consolidada (para validação em controllers)
export const isRodadaConsolidada = async (ligaId, rodada) => {
    const snapshot = await RodadaSnapshot.findOne({
        liga_id: ligaId,
        rodada: rodada,
        status: "consolidada",
    })
        .select("status")
        .lean();

    return !!snapshot;
};

// Função auxiliar leve para status (LEGADO - usar MarketGate diretamente)
// v2.0: Migrado para usar MarketGate centralizado
async function getStatusMercadoRapido() {
    try {
        return await marketGate.fetchStatus();
    } catch (error) {
        console.error("[SMART-FETCH] Erro ao buscar status:", error);
        return { rodada_atual: 38 }; // Fallback conservador
    }
}

export { getStatusMercadoRapido };

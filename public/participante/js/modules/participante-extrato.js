// MÓDULO: EXTRATO PARTICIPANTE
// Usa o core do admin para cálculos, mas renderiza com UI própria

console.log('[EXTRATO-PARTICIPANTE] 🔄 Carregando módulo...');
console.log('[EXTRATO-PARTICIPANTE] ⏱️ Timestamp:', new Date().toISOString());

// Variável global para armazenar IDs, caso necessário para outros fluxos
const PARTICIPANTE_IDS = { ligaId: null, timeId: null };

export async function inicializarExtratoParticipante({ participante, ligaId, timeId }) {
    console.log('[EXTRATO-PARTICIPANTE] 🔄 Inicializando para:', { participante, ligaId, timeId });

    if (!ligaId || !timeId) {
        console.error('[EXTRATO-PARTICIPANTE] ❌ Parâmetros inválidos:', { ligaId, timeId });
        mostrarErro('Dados inválidos para carregar extrato');
        return;
    }

    try {
        // Armazenar IDs
        PARTICIPANTE_IDS.ligaId = ligaId;
        PARTICIPANTE_IDS.timeId = timeId;

        console.log('[EXTRATO-PARTICIPANTE] 📦 Importando módulos...');

        // Importar módulos necessários
        const { renderizarExtratoParticipante } = await import('./participante-extrato-ui.js');
        await import('../../../js/core/cache-manager.js');
        await import('../../../js/fluxo-financeiro/fluxo-financeiro-participante.js');

        console.log('[EXTRATO-PARTICIPANTE] ⚙️ Inicializando core...');

        // Inicializar fluxo financeiro do participante
        const { fluxoFinanceiroParticipante } = await import('../../../js/fluxo-financeiro/fluxo-financeiro-participante.js');
        await fluxoFinanceiroParticipante.inicializar({
            timeId,
            ligaId,
            participante
        });

        console.log('[EXTRATO-PARTICIPANTE] 🔄 Buscando rodada atual...');

        // Buscar rodada atual SEMPRE antes de carregar o extrato
        let rodadaAtual = 1;
        let mercadoAberto = false;
        try {
            const resRodada = await fetch('/api/cartola/mercado/status');
            if (resRodada.ok) {
                const statusData = await resRodada.json();
                rodadaAtual = statusData.rodada_atual || 1;
                mercadoAberto = statusData.mercado_aberto || false;
                console.log(`[EXTRATO-PARTICIPANTE] ✅ Rodada atual: ${rodadaAtual} | Mercado: ${mercadoAberto ? 'ABERTO' : 'FECHADO'}`);
            } else {
                console.warn('[EXTRATO-PARTICIPANTE] ⚠️ Erro ao buscar rodada, usando fallback');
            }
        } catch (error) {
            console.warn('[EXTRATO-PARTICIPANTE] ⚠️ Falha na busca de rodada, usando fallback:', error.message);
        }

        // ✅ SE MERCADO ABERTO, USAR RODADA ANTERIOR (a última completa)
        const ultimaRodadaCompleta = mercadoAberto ? Math.max(1, rodadaAtual - 1) : rodadaAtual;
        console.log(`[EXTRATO-PARTICIPANTE] 📊 Última rodada completa para cálculo: ${ultimaRodadaCompleta}`);

        console.log('[EXTRATO-PARTICIPANTE] 💰 Carregando dados...');

        // Buscar extrato calculado com última rodada completa
        const extratoData = await fluxoFinanceiroParticipante.buscarExtratoCalculado(ligaId, timeId, ultimaRodadaCompleta);

        console.log('[EXTRATO-PARTICIPANTE] 🎨 Renderizando UI personalizada...');

        // Renderizar extrato
        renderizarExtratoParticipante(extratoData, timeId);

        console.log('[EXTRATO-PARTICIPANTE] ✅ Extrato carregado com sucesso');

    } catch (error) {
        console.error('[EXTRATO-PARTICIPANTE] ❌ Erro:', error);
        mostrarErro(`Erro ao carregar extrato: ${error.message}`);
    }
}

function mostrarErro(mensagem) {
    const container = document.getElementById('fluxoFinanceiroContent') || 
                     document.getElementById('moduleContainer');

    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1); 
                        border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar Extrato</h3>
                <p style="color: #e0e0e0; margin-bottom: 20px;">${mensagem}</p>
                <button onclick="window.location.reload()" 
                        style="padding: 12px 24px; background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%); 
                               color: white; border: none; border-radius: 8px; cursor: pointer; 
                               font-weight: 600; font-size: 14px;">
                    🔄 Recarregar Página
                </button>
            </div>
        `;
    }
}

// ===== EXPORTAR FUNÇÕES GLOBAIS =====
export function initExtratoParticipante() {
    console.log('[PARTICIPANTE-EXTRATO] Módulo carregado');
}

// ===== FUNÇÃO DE REFRESH FORÇADO =====
window.forcarRefreshExtratoParticipante = async function() {
    console.log('[EXTRATO-PARTICIPANTE] 🔄 Forçando atualização dos dados...');
    
    if (!PARTICIPANTE_IDS.ligaId || !PARTICIPANTE_IDS.timeId) {
        console.error('[EXTRATO-PARTICIPANTE] ❌ IDs não disponíveis:', { ligaId: PARTICIPANTE_IDS.ligaId, timeId: PARTICIPANTE_IDS.timeId });
        mostrarErro('Dados de identificação não disponíveis. Recarregue a página.');
        return;
    }

    console.log('[EXTRATO-PARTICIPANTE] 🔍 Usando IDs:', { ligaId: PARTICIPANTE_IDS.ligaId, timeId: PARTICIPANTE_IDS.timeId });

    try {
        // Mostrar loading
        if (window.mostrarLoadingExtrato) {
            window.mostrarLoadingExtrato();
        }

        // Invalidar cache via API
        console.log('[EXTRATO-PARTICIPANTE] 🗑️ Invalidando cache...');
        const response = await fetch(
            `/api/extrato-cache/${PARTICIPANTE_IDS.ligaId}/times/${PARTICIPANTE_IDS.timeId}/cache`,
            { method: 'DELETE' }
        );

        if (response.ok) {
            console.log('[EXTRATO-PARTICIPANTE] ✅ Cache invalidado');
        } else {
            console.warn('[EXTRATO-PARTICIPANTE] ⚠️ Erro ao invalidar cache:', response.status);
        }

        // Recarregar extrato
        const { fluxoFinanceiroParticipante } = await import('../../../js/fluxo-financeiro/fluxo-financeiro-participante.js');
        const { renderizarExtratoParticipante } = await import('./participante-extrato-ui.js');

        // Buscar rodada atual
        console.log('[EXTRATO-PARTICIPANTE] 📅 Buscando rodada atual...');
        const resRodada = await fetch('/api/cartola/mercado/status');
        const statusData = await resRodada.json();
        const rodadaAtual = statusData.rodada_atual || 1;
        const mercadoAberto = statusData.mercado_aberto || false;
        const ultimaRodadaCompleta = mercadoAberto ? Math.max(1, rodadaAtual - 1) : rodadaAtual;

        console.log(`[EXTRATO-PARTICIPANTE] 📊 Recalculando até rodada ${ultimaRodadaCompleta} (ligaId: ${PARTICIPANTE_IDS.ligaId})`);

        // Forçar recálculo com forceRefresh = true
        const extratoData = await fluxoFinanceiroParticipante.buscarExtratoCalculado(
            PARTICIPANTE_IDS.ligaId, 
            PARTICIPANTE_IDS.timeId, 
            ultimaRodadaCompleta,
            true // forçar recálculo
        );

        // Renderizar
        renderizarExtratoParticipante(extratoData, PARTICIPANTE_IDS.timeId);

        console.log('[EXTRATO-PARTICIPANTE] ✅ Dados atualizados com sucesso');

    } catch (error) {
        console.error('[EXTRATO-PARTICIPANTE] ❌ Erro ao atualizar:', error);
        mostrarErro(`Erro ao atualizar: ${error.message}`);
    }
};

// ===== EXPOR GLOBALMENTE PARA COMPATIBILIDADE COM NAVEGAÇÃO =====
window.inicializarExtratoParticipante = inicializarExtratoParticipante;

console.log('[EXTRATO-PARTICIPANTE] ✅ Função exportada (ES6 + window) com sucesso');
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
        try {
            const resRodada = await fetch('/api/cartola/mercado/status');
            if (resRodada.ok) {
                const statusData = await resRodada.json();
                rodadaAtual = statusData.rodada_atual || 1;
                console.log(`[EXTRATO-PARTICIPANTE] ✅ Rodada atual: ${rodadaAtual}`);
            } else {
                console.warn('[EXTRATO-PARTICIPANTE] ⚠️ Erro ao buscar rodada, usando fallback');
            }
        } catch (error) {
            console.warn('[EXTRATO-PARTICIPANTE] ⚠️ Falha na busca de rodada, usando fallback:', error.message);
        }

        console.log('[EXTRATO-PARTICIPANTE] 💰 Carregando dados...');

        // Buscar extrato calculado com rodada atual
        const { fluxoFinanceiroParticipante } = await import('../../../js/fluxo-financeiro/fluxo-financeiro-participante.js');
        const extratoData = await fluxoFinanceiroParticipante.buscarExtratoCalculado(ligaId, timeId, rodadaAtual);

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

// ===== EXPOR GLOBALMENTE PARA COMPATIBILIDADE COM NAVEGAÇÃO =====
window.inicializarExtratoParticipante = inicializarExtratoParticipante;

console.log('[EXTRATO-PARTICIPANTE] ✅ Função exportada (ES6 + window) com sucesso');
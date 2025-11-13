// MÓDULO: EXTRATO PARTICIPANTE
// Usa o core do admin para cálculos, mas renderiza com UI própria

console.log('[EXTRATO-PARTICIPANTE] 🔄 Carregando módulo...');
console.log('[EXTRATO-PARTICIPANTE] ⏱️ Timestamp:', new Date().toISOString());

export async function inicializarExtratoParticipante(participanteData) {
    console.log('[EXTRATO-PARTICIPANTE] 🔄 Inicializando para:', participanteData);

    // ✅ VERIFICAR DADOS OBRIGATÓRIOS
    if (!participanteData || !participanteData.timeId || !participanteData.ligaId) {
        console.error('[EXTRATO-PARTICIPANTE] ❌ Dados do participante incompletos:', participanteData);
        mostrarErro('Dados do participante incompletos');
        return;
    }

    try {
        // ✅ GARANTIR QUE O CONTAINER EXISTE
        const container = document.getElementById('extratoFinanceiro');

        if (!container) {
            console.error('[EXTRATO-PARTICIPANTE] ❌ Container #extratoFinanceiro não encontrado no DOM');
            throw new Error('Container #extratoFinanceiro não encontrado');
        }

        console.log('[EXTRATO-PARTICIPANTE] 📦 Importando módulos...');

        // Importar módulo de cálculo (core do admin) e UI própria
        const [coreModule, uiModule] = await Promise.all([
            import('/js/fluxo-financeiro/fluxo-financeiro-participante.js'),
            import('./participante-extrato-ui.js')
        ]);

        const fluxoCore = coreModule.fluxoFinanceiroParticipante;
        const { renderizarExtratoParticipante, mostrarLoading } = uiModule;

        console.log('[EXTRATO-PARTICIPANTE] ⚙️ Inicializando core...');

        // Inicializar core de cálculo
        await fluxoCore.inicializar({
            timeId: participanteData.timeId,
            ligaId: participanteData.ligaId,
            participante: participanteData
        });

        console.log('[EXTRATO-PARTICIPANTE] 💰 Carregando dados...');

        // Mostrar loading
        mostrarLoading();

        // Buscar dados calculados (sem renderizar)
        const extrato = await fluxoCore.buscarExtratoCalculado();

        console.log('[EXTRATO-PARTICIPANTE] 🎨 Renderizando UI personalizada...');

        // Renderizar com UI própria do participante
        renderizarExtratoParticipante(extrato, participanteData);

        console.log('[EXTRATO-PARTICIPANTE] ✅ Extrato carregado com sucesso');

    } catch (error) {
        console.error('[EXTRATO-PARTICIPANTE] ❌ Erro detalhado:', {
            message: error.message,
            stack: error.stack,
            participanteData: participanteData
        });

        mostrarErro(error.message);
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
// MÓDULO: EXTRATO PARTICIPANTE
// Integra com fluxo-financeiro-participante.js

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
            console.log('[EXTRATO-PARTICIPANTE] Containers disponíveis:', 
                Array.from(document.querySelectorAll('[id]')).map(el => el.id)
            );
            
            throw new Error('Container #extratoFinanceiro não encontrado. Verifique se extrato.html foi carregado corretamente.');
        }

        console.log('[EXTRATO-PARTICIPANTE] 📦 Importando módulo de fluxo financeiro...');
        
        // Importar módulo de extrato financeiro
        const { fluxoFinanceiroParticipante } = await import('/js/fluxo-financeiro/fluxo-financeiro-participante.js');

        console.log('[EXTRATO-PARTICIPANTE] ⚙️ Inicializando módulo...');
        
        // Inicializar com dados do participante
        await fluxoFinanceiroParticipante.inicializar({
            timeId: participanteData.timeId,
            ligaId: participanteData.ligaId,
            participante: participanteData
        });

        console.log('[EXTRATO-PARTICIPANTE] 💰 Carregando extrato...');
        
        // ✅ CRIAR ADAPTER: Mapear IDs do participante para IDs esperados pelo módulo UI
        criarAdapterDeIDs();
        
        // Carregar extrato
        await fluxoFinanceiroParticipante.carregarExtrato();

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

function criarAdapterDeIDs() {
    // ✅ Criar um container wrapper que o módulo UI espera
    const extratoContainer = document.getElementById('extratoFinanceiro');
    if (!extratoContainer) return;

    // Criar container interno com ID que o módulo UI espera
    const wrapperContent = document.createElement('div');
    wrapperContent.id = 'fluxoFinanceiroContent';
    wrapperContent.style.padding = '0';
    
    // Mover todo o conteúdo atual para dentro do wrapper
    while (extratoContainer.firstChild) {
        wrapperContent.appendChild(extratoContainer.firstChild);
    }
    
    extratoContainer.appendChild(wrapperContent);
    
    console.log('[EXTRATO-PARTICIPANTE] ✅ Adapter de IDs criado (#fluxoFinanceiroContent injetado)');
}

function mostrarErro(mensagem) {
    const container = document.getElementById('extratoFinanceiro') || 
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
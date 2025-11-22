
// MÓDULO: PONTOS CORRIDOS PARTICIPANTE
// Exibe tabela completa da liga (mesma do admin)

console.log('[PONTOS-CORRIDOS-PARTICIPANTE] 🔄 Carregando módulo...');

export async function inicializarPontosCorridosParticipante({ participante, ligaId, timeId }) {
    console.log('[PONTOS-CORRIDOS-PARTICIPANTE] Inicializando para:', { participante, ligaId, timeId });

    if (!ligaId) {
        console.error('[PONTOS-CORRIDOS-PARTICIPANTE] Liga ID não fornecido');
        mostrarErro('Dados da liga não encontrados');
        return;
    }

    try {
        // Importar orquestrador do admin (mesma lógica)
        const { inicializarPontosCorridos } = await import('../../../js/pontos-corridos/pontos-corridos-orquestrador.js');

        console.log('[PONTOS-CORRIDOS-PARTICIPANTE] Carregando classificação geral...');

        // Inicializar com mesma lógica do admin
        await inicializarPontosCorridos(ligaId);

        console.log('[PONTOS-CORRIDOS-PARTICIPANTE] ✅ Pontos Corridos inicializado com sucesso');

        // Destacar meu time na tabela
        destacarMeuTime(timeId);

    } catch (error) {
        console.error('[PONTOS-CORRIDOS-PARTICIPANTE] Erro ao inicializar:', error);
        mostrarErro(error.message || 'Erro ao carregar Pontos Corridos');
    }
}

function destacarMeuTime(timeId) {
    if (!timeId) return;

    // Aguardar renderização da tabela
    setTimeout(() => {
        const rows = document.querySelectorAll('.tabela-pontos-corridos tbody tr, .ranking-row');
        
        rows.forEach(row => {
            const timeIdElement = row.querySelector('[data-time-id]');
            
            if (timeIdElement && timeIdElement.dataset.timeId === String(timeId)) {
                row.style.background = 'rgba(16, 185, 129, 0.15)';
                row.style.borderLeft = '4px solid #10b981';
                row.style.fontWeight = '600';
                console.log('[PONTOS-CORRIDOS-PARTICIPANTE] Meu time destacado:', timeId);
            }
        });
    }, 500);
}

function mostrarErro(mensagem) {
    const container = document.getElementById('moduleContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <h3>❌ Erro ao carregar Pontos Corridos</h3>
                <p>${mensagem}</p>
                <button onclick="window.location.reload()" 
                        style="margin-top: 20px; padding: 10px 20px; background: #ff4500; 
                               color: white; border: none; border-radius: 8px; cursor: pointer;">
                    🔄 Recarregar
                </button>
            </div>
        `;
    }
}

console.log('[PONTOS-CORRIDOS-PARTICIPANTE] ✅ Módulo carregado');

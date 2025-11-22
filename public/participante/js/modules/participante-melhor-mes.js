// MÓDULO: MELHOR DO MÊS PARTICIPANTE
// Exibe ranking mensal completo (mesma do admin)

console.log('[MELHOR-MES-PARTICIPANTE] 🔄 Carregando módulo...');

export async function inicializarMelhorMesParticipante({ participante, ligaId, timeId }) {
    console.log('[MELHOR-MES-PARTICIPANTE] Inicializando para:', { participante, ligaId, timeId });

    if (!ligaId) {
        console.error('[MELHOR-MES-PARTICIPANTE] Liga ID não fornecido');
        mostrarErro('Dados da liga não encontrados');
        return;
    }

    try {
        // Importar orquestrador do admin (mesma lógica)
        const { inicializarMelhorMes } = await import('../../../js/melhor-mes/melhor-mes-orquestrador.js');

        console.log('[MELHOR-MES-PARTICIPANTE] Carregando rankings mensais...');

        // Inicializar com mesma lógica do admin
        await inicializarMelhorMes(ligaId);

        console.log('[MELHOR-MES-PARTICIPANTE] ✅ Melhor do Mês inicializado com sucesso');

        // Destacar meu time nos rankings
        destacarMeuTime(timeId);

    } catch (error) {
        console.error('[MELHOR-MES-PARTICIPANTE] Erro ao inicializar:', error);
        mostrarErro(error.message || 'Erro ao carregar Melhor do Mês');
    }
}

function destacarMeuTime(timeId) {
    if (!timeId) return;

    // Aguardar renderização
    setTimeout(() => {
        const rows = document.querySelectorAll('.ranking-mensal tbody tr, .mes-ranking-row');

        rows.forEach(row => {
            const timeIdElement = row.querySelector('[data-time-id]');

            if (timeIdElement && timeIdElement.dataset.timeId === String(timeId)) {
                row.style.background = 'rgba(16, 185, 129, 0.1)';
                row.style.borderLeft = '4px solid #10b981';
                console.log('[MELHOR-MES-PARTICIPANTE] Meu time destacado');
            }
        });
    }, 500);
}

function mostrarErro(mensagem) {
    const container = document.getElementById('moduleContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <h3>❌ Erro ao carregar Melhor do Mês</h3>
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

console.log('[MELHOR-MES-PARTICIPANTE] ✅ Módulo carregado');
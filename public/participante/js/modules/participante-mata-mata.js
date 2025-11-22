// MÓDULO: MATA-MATA PARTICIPANTE
// Exibe visão completa dos confrontos da liga (mesma do admin)

console.log('[MATA-MATA-PARTICIPANTE] 🔄 Carregando módulo...');

export async function inicializarMataMataParticipante({ participante, ligaId, timeId }) {
    console.log('[MATA-MATA-PARTICIPANTE] Inicializando para:', { participante, ligaId, timeId });

    if (!ligaId) {
        console.error('[MATA-MATA-PARTICIPANTE] Liga ID não fornecido');
        mostrarErro('Dados da liga não encontrados');
        return;
    }

    try {
        // Importar orquestrador do admin (mesma lógica)
        const { inicializarMataMata } = await import('../../../js/mata-mata/mata-mata-orquestrador.js');

        console.log('[MATA-MATA-PARTICIPANTE] Carregando dados gerais da liga...');

        // Inicializar com mesma lógica do admin
        await inicializarMataMata(ligaId);

        console.log('[MATA-MATA-PARTICIPANTE] ✅ Mata-Mata inicializado com sucesso');

        // Destacar meu time visualmente (opcional)
        destacarMeuTime(timeId);

    } catch (error) {
        console.error('[MATA-MATA-PARTICIPANTE] Erro ao inicializar:', error);
        mostrarErro(error.message || 'Erro ao carregar Mata-Mata');
    }
}

function destacarMeuTime(timeId) {
    if (!timeId) return;

    // Aguardar renderização
    setTimeout(() => {
        const rows = document.querySelectorAll('.confronto-item, .tabela-confrontos tbody tr');

        rows.forEach(row => {
            const timeElements = row.querySelectorAll('[data-time-id]');

            timeElements.forEach(el => {
                if (el.dataset.timeId === String(timeId)) {
                    row.style.background = 'rgba(16, 185, 129, 0.1)';
                    row.style.borderLeft = '4px solid #10b981';
                    console.log('[MATA-MATA-PARTICIPANTE] Meu time destacado na linha');
                }
            });
        });
    }, 500);
}

function mostrarErro(mensagem) {
    const container = document.getElementById('moduleContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <h3>❌ Erro ao carregar Mata-Mata</h3>
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

console.log('[MATA-MATA-PARTICIPANTE] ✅ Módulo carregado');
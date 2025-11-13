// MÓDULO: EXTRATO PARTICIPANTE
// Integra com fluxo-financeiro-participante.js

export async function inicializarExtratoParticipante(participanteData) {
    console.log('[EXTRATO-PARTICIPANTE] Inicializando para:', participanteData);

    try {
        // Importar módulo de extrato financeiro
        const { fluxoFinanceiroParticipante } = await import('/js/fluxo-financeiro/fluxo-financeiro-participante.js');

        // Inicializar com dados do participante
        await fluxoFinanceiroParticipante.inicializar({
            timeId: participanteData.timeId,
            ligaId: participanteData.ligaId,
            participante: participanteData
        });

        // Carregar extrato
        await fluxoFinanceiroParticipante.carregarExtrato();

        console.log('[EXTRATO-PARTICIPANTE] ✅ Extrato carregado com sucesso');
    } catch (error) {
        console.error('[EXTRATO-PARTICIPANTE] ❌ Erro:', error);

        const container = document.querySelector('.extrato-participante-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1); border-radius: 12px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="color: #ef4444;">Erro ao Carregar Extrato</h3>
                    <p style="color: #e0e0e0;">${error.message}</p>
                </div>
            `;
        }
    }
}
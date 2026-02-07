// =====================================================================
// PARTICIPANTE-COPA-SC.JS - v1.0 (TEASER MVP)
// =====================================================================
// v1.0: Tela teaser para Copa de Times Super Cartola
//       Status: MVP - Apenas visualização do anúncio
//       Próximas versões: Backend, grupos, mata-mata, pontuação
// =====================================================================

if (window.Log) Log.info("PARTICIPANTE-COPA-SC", "Carregando módulo v1.0 (Teaser)...");

// Estado do módulo
let estadoCopaSC = {
    carregando: false,
    rodadaAtual: null,
    segundoTurnoIniciado: false
};

// =====================================================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// =====================================================================
export async function inicializarCopaTimesSC(params) {
    if (window.Log) Log.debug("PARTICIPANTE-COPA-SC", "Inicializando tela teaser...");

    const container = document.getElementById('copa-times-sc-container');
    if (!container) {
        if (window.Log) Log.error("PARTICIPANTE-COPA-SC", "Container não encontrado!");
        return;
    }

    // Loading overlay sobre o teaser (não substitui conteúdo)
    container.style.position = 'relative';
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'copa-sc-loading';
    loadingOverlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.7);z-index:10;';
    loadingOverlay.innerHTML = '<div class="copa-spinner"></div>';
    container.appendChild(loadingOverlay);

    try {
        // Buscar informações da rodada atual
        await carregarInformacoesRodada();

        // Verificar se estamos no segundo turno
        verificarSegundoTurno();

        // Adicionar listeners se necessário
        setupEventListeners();

        // Remover loading
        document.getElementById('copa-sc-loading')?.remove();

        if (window.Log) Log.info("PARTICIPANTE-COPA-SC", "✅ Tela teaser carregada com sucesso!");

    } catch (erro) {
        document.getElementById('copa-sc-loading')?.remove();
        if (window.Log) Log.error("PARTICIPANTE-COPA-SC", "Erro ao inicializar:", erro);
        mostrarErro("Não foi possível carregar as informações da Copa de Times SC.");
    }
}

// =====================================================================
// CARREGAR INFORMAÇÕES DA RODADA ATUAL
// =====================================================================
async function carregarInformacoesRodada() {
    try {
        const response = await fetch('/api/cartola/mercado/status');
        if (!response.ok) throw new Error('Erro ao buscar status do mercado');

        const data = await response.json();
        estadoCopaSC.rodadaAtual = data.rodada_atual;

        if (window.Log) Log.debug("PARTICIPANTE-COPA-SC", `Rodada atual: ${estadoCopaSC.rodadaAtual}`);

    } catch (erro) {
        if (window.Log) Log.warn("PARTICIPANTE-COPA-SC", "Não foi possível buscar rodada atual:", erro);
    }
}

// =====================================================================
// VERIFICAR SE ESTAMOS NO SEGUNDO TURNO
// =====================================================================
function verificarSegundoTurno() {
    // Brasileirão tem 38 rodadas, segundo turno começa na rodada 20
    if (estadoCopaSC.rodadaAtual && estadoCopaSC.rodadaAtual >= 20) {
        estadoCopaSC.segundoTurnoIniciado = true;
        if (window.Log) Log.info("PARTICIPANTE-COPA-SC", "Segundo turno iniciado! Competição pode começar.");
    } else {
        estadoCopaSC.segundoTurnoIniciado = false;
        if (window.Log) Log.info("PARTICIPANTE-COPA-SC", "Primeiro turno - aguardando rodada 20 para início.");
    }
}

// =====================================================================
// SETUP DE EVENT LISTENERS
// =====================================================================
function setupEventListeners() {
    // Placeholder para futuros event listeners
    // Exemplo: botões de inscrição, visualização de grupos, etc.
    if (window.Log) Log.debug("PARTICIPANTE-COPA-SC", "Event listeners configurados (nenhum no MVP).");
}

// =====================================================================
// MOSTRAR ERRO
// =====================================================================
function mostrarErro(mensagem) {
    const container = document.getElementById('copa-times-sc-container');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 px-4">
            <div class="text-center max-w-md">
                <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <h2 class="text-xl font-bold text-white mb-2">Erro ao Carregar</h2>
                <p class="text-gray-400">${mensagem}</p>
                <button
                    onclick="window.location.reload()"
                    class="mt-6 px-6 py-2 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                >
                    Tentar Novamente
                </button>
            </div>
        </div>
    `;
}

// =====================================================================
// EXPORTAR ESTADO (para debug/inspeção)
// =====================================================================
export function getEstadoCopaSC() {
    return estadoCopaSC;
}

// =====================================================================
// TODO: FUNÇÕES FUTURAS (PRÓXIMAS FASES)
// =====================================================================
// - buscarGrupos() - FASE 3
// - buscarClassificacao() - FASE 3
// - buscarProximosJogos() - FASE 3
// - renderizarBracket() - FASE 4
// - inscreverParticipante() - FASE 3
// - notificarAvancoDeFase() - FASE 5

if (window.Log) Log.info("PARTICIPANTE-COPA-SC", "✅ Módulo v1.0 (Teaser) carregado!");

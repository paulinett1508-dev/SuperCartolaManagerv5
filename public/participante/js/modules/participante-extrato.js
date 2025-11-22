// MÓDULO: EXTRATO PARTICIPANTE
// Usa o core do admin para cálculos, mas renderiza com UI própria

console.log('[EXTRATO-PARTICIPANTE] 🔄 Carregando módulo...');
console.log('[EXTRATO-PARTICIPANTE] ⏱️ Timestamp:', new Date().toISOString());

// Variável global para armazenar IDs, caso necessário para outros fluxos
const PARTICIPANTE_IDS = { ligaId: null, timeId: null };

export async function inicializarExtratoParticipante({ participante, ligaId, timeId }) {
    console.log('[EXTRATO-PARTICIPANTE] 🔄 Inicializando para:', { participante, ligaId, timeId });
    console.log('[EXTRATO-PARTICIPANTE] 📊 Tipo dos parâmetros:', {
        participante: typeof participante,
        ligaId: typeof ligaId,
        timeId: typeof timeId
    });

    if (!ligaId || !timeId) {
        console.error('[EXTRATO-PARTICIPANTE] ❌ Parâmetros inválidos:', { ligaId, timeId });
        mostrarErro('Dados inválidos para carregar extrato');
        return;
    }

    try {
        // Verificar se container existe antes de continuar
        const container = document.getElementById('fluxoFinanceiroContent');
        if (!container) {
            console.error('[EXTRATO-PARTICIPANTE] ❌ Container "fluxoFinanceiroContent" não encontrado no início!');
            mostrarErro('Container de extrato não encontrado. Recarregue a página.');
            return;
        }
        console.log('[EXTRATO-PARTICIPANTE] ✅ Container verificado no início');

        // Armazenar IDs
        PARTICIPANTE_IDS.ligaId = ligaId;
        PARTICIPANTE_IDS.timeId = timeId;

        // ✅ EXPOR DADOS GLOBALMENTE para módulos que dependem
        window.participanteData = {
            ligaId: ligaId,
            timeId: timeId,
            participante: participante
        };

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

        // ✅ VALIDAR INTEGRIDADE DO CACHE - VERIFICAR SE TEM DADOS DE RODADAS FUTURAS DO MATA-MATA
        console.log('[EXTRATO-PARTICIPANTE] 🔍 Validando integridade do cache...');
        let precisaInvalidar = false;

        try {
            const cacheResponse = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${ultimaRodadaCompleta}`);

            if (cacheResponse.ok) {
                const cacheData = await cacheResponse.json();

                if (cacheData && cacheData.cached && cacheData.data && cacheData.data.rodadas) {
                    // Verificar se há valores de Mata-Mata em rodadas futuras (bug antigo)
                    const rodadasComMataMataFuturo = cacheData.data.rodadas.filter(r => 
                        r.rodada > ultimaRodadaCompleta && r.mataMata !== 0
                    );

                    if (rodadasComMataMataFuturo.length > 0) {
                        console.warn(`[EXTRATO-PARTICIPANTE] ⚠️ Cache corrompido detectado: ${rodadasComMataMataFuturo.length} rodadas futuras com valores de Mata-Mata`);
                        precisaInvalidar = true;
                    }

                    // Verificar se a rodada 34 existe mas não tem valor de Mata-Mata (quando deveria ter)
                    const rodada34 = cacheData.data.rodadas.find(r => r.rodada === 34);
                    if (rodada34 && rodada34.mataMata === 0 && ultimaRodadaCompleta >= 34) {
                        console.warn('[EXTRATO-PARTICIPANTE] ⚠️ Rodada 34 sem valores de Mata-Mata - cache desatualizado');
                        precisaInvalidar = true;
                    }
                }
            }
        } catch (error) {
            console.warn('[EXTRATO-PARTICIPANTE] ⚠️ Erro ao validar cache:', error.message);
            precisaInvalidar = true;
        }

        // ✅ INVALIDAR CACHE SE NECESSÁRIO
        if (precisaInvalidar) {
            console.log('[EXTRATO-PARTICIPANTE] 🗑️ Invalidando cache corrompido/desatualizado...');
            try {
                await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`, { method: 'DELETE' });
                console.log('[EXTRATO-PARTICIPANTE] ✅ Cache invalidado com sucesso');
            } catch (error) {
                console.warn('[EXTRATO-PARTICIPANTE] ⚠️ Erro ao invalidar cache:', error.message);
            }
        } else {
            console.log('[EXTRATO-PARTICIPANTE] ✅ Cache validado - dados íntegros');
        }

        // Validar ligaId antes de buscar extrato
        if (!ligaId || ligaId === 'null' || ligaId === 'undefined') {
            console.error('[EXTRATO-PARTICIPANTE] ❌ ligaId inválida:', ligaId);
            mostrarErro('ID da liga inválido. Tente fazer login novamente.');
            return;
        }

        console.log('[EXTRATO-PARTICIPANTE] 🔑 Usando ligaId:', ligaId);
        console.log('[EXTRATO-PARTICIPANTE] 👤 Usando timeId:', timeId);

        // Buscar extrato calculado com última rodada completa (forçando recálculo)
        const extratoData = await fluxoFinanceiroParticipante.buscarExtratoCalculado(ligaId, timeId, ultimaRodadaCompleta, true);

        console.log('[EXTRATO-PARTICIPANTE] 🎨 Renderizando UI personalizada...');
        console.log(`[EXTRATO-PARTICIPANTE] 📊 Dados do extrato:`, extratoData);
        console.log(`[EXTRATO-PARTICIPANTE] 📊 Estrutura do extrato:`, {
            temRodadas: !!extratoData?.rodadas,
            qtdRodadas: extratoData?.rodadas?.length || 0,
            temResumo: !!extratoData?.resumo,
            saldo: extratoData?.resumo?.saldo
        });

        // Verificar se container ainda existe (já foi verificado no início)
        if (!container) {
            console.error('[EXTRATO-PARTICIPANTE] ❌ Container "fluxoFinanceiroContent" não encontrado!');
            mostrarErro('Container de extrato não encontrado. Recarregue a página.');
            return;
        }

        console.log('[EXTRATO-PARTICIPANTE] ✅ Container encontrado, renderizando...');

        // Validar dados do extrato antes de renderizar
        if (!extratoData || !extratoData.rodadas || !Array.isArray(extratoData.rodadas)) {
            console.error('[EXTRATO-PARTICIPANTE] ❌ Dados do extrato inválidos ou incompletos');
            mostrarErro('Dados do extrato incompletos. Tente atualizar.');
            return;
        }

        console.log('[EXTRATO-PARTICIPANTE] 📋 Rodadas a renderizar:', extratoData.rodadas.length);

        // Renderizar extrato
        try {
            renderizarExtratoParticipante(extratoData, timeId);
            console.log('[EXTRATO-PARTICIPANTE] ✅ Extrato renderizado com sucesso');
        } catch (renderError) {
            console.error('[EXTRATO-PARTICIPANTE] ❌ Erro ao renderizar:', renderError);
            mostrarErro(`Erro ao renderizar extrato: ${renderError.message}`);
            return;
        }

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
        console.error('[EXTRATO-PARTICIPANTE] IDs não disponíveis para refresh');
        return;
    }

    try {
        // Mostrar loading
        if (window.mostrarLoadingExtrato) {
            window.mostrarLoadingExtrato();
        }

        // Invalidar cache via API
        const response = await fetch(
            `/api/extrato-cache/${PARTICIPANTE_IDS.ligaId}/times/${PARTICIPANTE_IDS.timeId}/cache`,
            { method: 'DELETE' }
        );

        if (response.ok) {
            console.log('[EXTRATO-PARTICIPANTE] ✅ Cache invalidado');
        }

        // Recarregar extrato
        const { fluxoFinanceiroParticipante } = await import('../../../js/fluxo-financeiro/fluxo-financeiro-participante.js');
        const { renderizarExtratoParticipante } = await import('./participante-extrato-ui.js');

        // Buscar rodada atual
        const resRodada = await fetch('/api/cartola/mercado/status');
        const statusData = await resRodada.json();
        const rodadaAtual = statusData.rodada_atual || 1;
        const mercadoAberto = statusData.mercado_aberto || false;
        const ultimaRodadaCompleta = mercadoAberto ? Math.max(1, rodadaAtual - 1) : rodadaAtual;

        console.log(`[EXTRATO-PARTICIPANTE] 📊 Recalculando até rodada ${ultimaRodadaCompleta}`);

        // Forçar recálculo
        const extratoData = await fluxoFinanceiroParticipante.buscarExtratoCalculado(
            PARTICIPANTE_IDS.ligaId, 
            PARTICIPANTE_IDS.timeId, 
            ultimaRodadaCompleta
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
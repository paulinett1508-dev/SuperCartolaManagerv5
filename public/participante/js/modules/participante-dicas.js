// =====================================================================
// PARTICIPANTE-DICAS.JS - v1.0 (DICAS DE ESCALACAO)
// =====================================================================
// ✅ v1.0: Dicas de Escalação baseadas em análise de dados
//          - Jogadores em alta (mitos recentes)
//          - Jogadores a evitar (micos recentes)
//          - Análise por posição
// NOTA: Fase 1 (somente leitura) - sem integração com Cartola PRO
// =====================================================================

if (window.Log) Log.info("PARTICIPANTE-DICAS", "🔄 Carregando módulo v1.0...");

// Estado do módulo
let dadosDicas = null;

// =====================================================================
// FUNCAO PRINCIPAL DE INICIALIZACAO
// =====================================================================
export async function inicializarDicasParticipante(params) {
    let ligaId, timeId, participante;

    if (typeof params === "object" && params !== null) {
        ligaId = params.ligaId;
        timeId = params.timeId;
        participante = params.participante;
    } else {
        ligaId = params;
        timeId = arguments[1];
    }

    if (window.Log) Log.debug("PARTICIPANTE-DICAS", "🚀 Inicializando...", { ligaId, timeId });

    const container = document.getElementById("dicas-container");
    if (!container) {
        if (window.Log) Log.error("PARTICIPANTE-DICAS", "❌ Container não encontrado");
        return;
    }

    // Mostrar loading
    container.innerHTML = renderizarLoading();

    try {
        // Buscar dados de mercado e análise
        const [statusMercado, topMitos, topMicos] = await Promise.all([
            buscarStatusMercado(),
            buscarTopJogadores('mitos', ligaId),
            buscarTopJogadores('micos', ligaId)
        ]);

        dadosDicas = { statusMercado, topMitos, topMicos };

        // Renderizar tela de dicas
        container.innerHTML = renderizarDicasCompleto(dadosDicas);

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-DICAS", "❌ Erro:", error);
        container.innerHTML = renderizarErro(error.message);
    }
}

// =====================================================================
// FUNCOES DE BUSCA DE DADOS
// =====================================================================
async function buscarStatusMercado() {
    try {
        const response = await fetch('/api/cartola/mercado/status');
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch {
        return null;
    }
}

async function buscarTopJogadores(tipo, ligaId) {
    try {
        // Buscar histórico de pontuações da liga
        const response = await fetch(`/api/rodadas/${ligaId}/estatisticas/jogadores?tipo=${tipo}&limite=10`);
        if (response.ok) {
            const data = await response.json();
            return data.jogadores || [];
        }

        // Fallback: buscar de endpoint alternativo ou gerar dados mock
        return gerarDicasMock(tipo);
    } catch (error) {
        if (window.Log) Log.debug("PARTICIPANTE-DICAS", `Usando dicas mock para ${tipo}`);
        return gerarDicasMock(tipo);
    }
}

function gerarDicasMock(tipo) {
    // Dicas genéricas quando não há dados disponíveis
    if (tipo === 'mitos') {
        return [
            { nome: 'Jogadores em alta', dica: 'Verifique jogadores que pontuaram bem nas últimas 3 rodadas', icon: 'trending_up' },
            { nome: 'Partidas em casa', dica: 'Times jogando em casa têm vantagem estatística', icon: 'home' },
            { nome: 'Artilheiros', dica: 'Atacantes em boa fase costumam manter sequência', icon: 'sports_soccer' },
        ];
    } else {
        return [
            { nome: 'Jogadores lesionados', dica: 'Sempre verifique o status médico antes de escalar', icon: 'personal_injury' },
            { nome: 'Sequência difícil', dica: 'Evite jogadores de times com sequência de jogos difíceis', icon: 'warning' },
            { nome: 'Suspensos', dica: 'Verifique cartões e suspensões automáticas', icon: 'gpp_bad' },
        ];
    }
}

// =====================================================================
// FUNCOES DE RENDERIZACAO
// =====================================================================
function renderizarLoading() {
    return `
        <div class="flex flex-col items-center justify-center min-h-[400px] py-16">
            <div class="w-12 h-12 border-4 border-zinc-700 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
            <p class="text-sm text-gray-400">Analisando dados...</p>
        </div>
    `;
}

function renderizarErro(mensagem) {
    return `
        <div class="text-center py-16 px-5">
            <span class="material-icons text-5xl text-red-500 mb-4">error</span>
            <p class="text-white/70">${mensagem || 'Erro ao carregar dicas'}</p>
        </div>
    `;
}

function renderizarDicasCompleto(dados) {
    const { statusMercado, topMitos, topMicos } = dados;
    const mercadoAberto = statusMercado?.status_mercado === 1;
    const rodada = statusMercado?.rodada_atual || '--';

    return `
        <div class="pb-28">
            <!-- Header -->
            <div class="px-4 py-3 border-b border-white/10">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Dicas de Escalação
                        </h2>
                        <p class="text-xs text-white/50">Rodada ${rodada}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${mercadoAberto ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                            ${mercadoAberto ? 'Mercado Aberto' : 'Mercado Fechado'}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Aviso PRO -->
            <div class="mx-4 mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div class="flex items-start gap-3">
                    <span class="material-icons text-yellow-400">star</span>
                    <div>
                        <p class="text-sm font-medium text-yellow-300">Versão Básica</p>
                        <p class="text-xs text-white/50">Em breve: integração com dicas avançadas do GatoMestre para assinantes PRO</p>
                    </div>
                </div>
            </div>

            <!-- Seção: Jogadores em Alta -->
            <div class="px-4 py-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-icons text-green-400">trending_up</span>
                    <h3 class="text-sm font-bold text-white">Dicas: Jogadores em Alta</h3>
                </div>
                <div class="space-y-2">
                    ${topMitos.map(item => renderizarCardDica(item, 'green')).join('')}
                </div>
            </div>

            <!-- Seção: Jogadores a Evitar -->
            <div class="px-4 py-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-icons text-red-400">trending_down</span>
                    <h3 class="text-sm font-bold text-white">Dicas: Evitar</h3>
                </div>
                <div class="space-y-2">
                    ${topMicos.map(item => renderizarCardDica(item, 'red')).join('')}
                </div>
            </div>

            <!-- Seção: Dicas Gerais -->
            <div class="px-4 py-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-icons text-primary">lightbulb</span>
                    <h3 class="text-sm font-bold text-white">Dicas Gerais</h3>
                </div>
                <div class="space-y-2">
                    <div class="p-3 rounded-xl bg-surface-dark border border-white/10">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="material-icons text-blue-400 text-lg">sports</span>
                            <span class="text-sm font-medium text-white">Analise os Confrontos</span>
                        </div>
                        <p class="text-xs text-white/50 ml-7">Times jogando contra lanternas ou times em má fase têm maior chance de pontuar bem.</p>
                    </div>
                    <div class="p-3 rounded-xl bg-surface-dark border border-white/10">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="material-icons text-purple-400 text-lg">psychology</span>
                            <span class="text-sm font-medium text-white">Diversifique</span>
                        </div>
                        <p class="text-xs text-white/50 ml-7">Evite concentrar muitos jogadores do mesmo time. Distribua o risco.</p>
                    </div>
                    <div class="p-3 rounded-xl bg-surface-dark border border-white/10">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="material-icons text-cyan-400 text-lg">schedule</span>
                            <span class="text-sm font-medium text-white">Escalação de Última Hora</span>
                        </div>
                        <p class="text-xs text-white/50 ml-7">Aguarde o máximo possível para confirmar titulares e evitar surpresas.</p>
                    </div>
                </div>
            </div>

            <!-- Link para Análise Completa -->
            <div class="px-4 pb-4">
                <button onclick="window.participanteNav?.navegarPara('ranking')"
                        class="w-full flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors">
                    <div class="flex items-center gap-3">
                        <span class="material-icons text-primary">analytics</span>
                        <span class="text-sm text-white">Ver Ranking Geral</span>
                    </div>
                    <span class="material-icons text-white/30">chevron_right</span>
                </button>
            </div>
        </div>
    `;
}

function renderizarCardDica(item, cor) {
    const bgCor = cor === 'green' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
    const textCor = cor === 'green' ? 'text-green-400' : 'text-red-400';

    // Se tem dados reais de jogador
    if (item.atletaId) {
        return `
            <div class="p-3 rounded-xl ${bgCor} border flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    ${item.clubeId ? `<img src="/escudos/${item.clubeId}.png" onerror="this.src='/escudos/default.png'" class="w-6 h-6" alt="">` : `<span class="material-icons text-white/50">person</span>`}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-white">${item.nome || 'Jogador'}</p>
                    <p class="text-xs text-white/50">${item.posicao || ''}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-bold ${textCor}">${(item.media || 0).toFixed(1)}</p>
                    <p class="text-[10px] text-white/40">média</p>
                </div>
            </div>
        `;
    }

    // Dica genérica
    return `
        <div class="p-3 rounded-xl bg-surface-dark border border-white/10">
            <div class="flex items-center gap-2 mb-1">
                <span class="material-icons ${textCor} text-lg">${item.icon || 'info'}</span>
                <span class="text-sm font-medium text-white">${item.nome}</span>
            </div>
            <p class="text-xs text-white/50 ml-7">${item.dica}</p>
        </div>
    `;
}

// Expor globalmente
window.inicializarDicasParticipante = inicializarDicasParticipante;

if (window.Log) Log.info("PARTICIPANTE-DICAS", "✅ Módulo v1.0 carregado");

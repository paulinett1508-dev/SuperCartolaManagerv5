// =====================================================================
// PARTICIPANTE-DICAS.JS - v2.0 (DICAS PREMIUM)
// =====================================================================
// v2.0: Dicas Premium com filtros, MPV e confrontos
//       ACESSO: Exclusivo para participantes Premium
// v1.1: Versao basica com dicas genericas
// =====================================================================

if (window.Log) Log.info("PARTICIPANTE-DICAS", "Carregando modulo v2.0...");

// Estado do modulo
let estadoDicas = {
    tabAtual: 'sugestao',
    jogadores: [],
    confrontos: [],
    sugestao: null,
    filtros: {
        posicao: 'todos',
        ordem: 'media'
    },
    rodada: null,
    carregando: false,
    isPremium: false
};

const POSICOES = [
    { id: 'todos', nome: 'Todos', abrev: 'TODOS' },
    { id: 1, nome: 'Goleiro', abrev: 'GOL' },
    { id: 2, nome: 'Lateral', abrev: 'LAT' },
    { id: 3, nome: 'Zagueiro', abrev: 'ZAG' },
    { id: 4, nome: 'Meia', abrev: 'MEI' },
    { id: 5, nome: 'Atacante', abrev: 'ATA' },
    { id: 6, nome: 'Tecnico', abrev: 'TEC' }
];

// =====================================================================
// FUNCAO PRINCIPAL DE INICIALIZACAO
// =====================================================================
export async function inicializarDicasParticipante(params) {
    if (window.Log) Log.debug("PARTICIPANTE-DICAS", "Inicializando v2.0...");

    // Verificar acesso premium
    const acessoOk = await verificarAcessoPremium();

    if (!acessoOk) {
        renderizarTelaBloqueio();
        return;
    }

    // Mostrar tabs
    const tabsContainer = document.getElementById('dicas-tabs-container');
    if (tabsContainer) tabsContainer.classList.remove('hidden');

    // Configurar tabs
    configurarTabs();

    // Carregar tab inicial (Sugestao)
    await carregarTab('sugestao');
}

// =====================================================================
// VERIFICACAO DE ACESSO PREMIUM
// =====================================================================
async function verificarAcessoPremium() {
    try {
        // Tentar carregar jogadores - a API vai verificar o premium
        const resp = await fetch('/api/dicas-premium/jogadores?limit=1');
        const data = await resp.json();

        if (data.premium === false) {
            estadoDicas.isPremium = false;
            return false;
        }

        if (data.sucesso) {
            estadoDicas.isPremium = true;
            return true;
        }

        // Qualquer outro erro
        if (resp.status === 403) {
            estadoDicas.isPremium = false;
            return false;
        }

        // Erro generico - permitir acesso para ver o erro na UI
        return true;

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-DICAS", "Erro ao verificar premium:", error);
        // Em caso de erro de rede, mostrar erro generico
        return true;
    }
}

function renderizarTelaBloqueio() {
    const content = document.getElementById('dicas-content');
    const rodadaInfo = document.getElementById('dicas-rodada-info');

    if (rodadaInfo) rodadaInfo.textContent = 'Acesso restrito';

    content.innerHTML = `
        <div class="premium-bloqueio">
            <div class="premium-bloqueio-icon">
                <span class="material-icons">workspace_premium</span>
            </div>

            <div class="premium-badge">
                <span class="material-icons" style="font-size: 14px;">star</span>
                Premium
            </div>

            <h3 style="color: white; font-size: 20px; font-weight: 700; margin-bottom: 12px;">
                Conteudo Exclusivo
            </h3>

            <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6; max-width: 280px; margin: 0 auto 24px;">
                As <strong style="color: #ff5500;">Dicas Premium</strong> oferecem analises avancadas,
                estatisticas detalhadas e calculadoras de valorizacao para montar o time campeao.
            </p>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 12px;">Recursos inclusos:</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="font-size: 16px; color: #22c55e;">check_circle</span>
                        <span style="font-size: 13px; color: rgba(255,255,255,0.7);">Filtros avancados por posicao</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="font-size: 16px; color: #22c55e;">check_circle</span>
                        <span style="font-size: 13px; color: rgba(255,255,255,0.7);">Calculo de MPV (valorizacao)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="font-size: 16px; color: #22c55e;">check_circle</span>
                        <span style="font-size: 13px; color: rgba(255,255,255,0.7);">Defesas vulneraveis</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="font-size: 16px; color: #22c55e;">check_circle</span>
                        <span style="font-size: 13px; color: rgba(255,255,255,0.7);">Dados em tempo real da API</span>
                    </div>
                </div>
            </div>

            <p style="color: rgba(255,255,255,0.4); font-size: 12px;">
                Fale com o administrador da sua liga para ativar o acesso Premium.
            </p>
        </div>
    `;
}

// =====================================================================
// NAVEGACAO POR TABS
// =====================================================================
function configurarTabs() {
    const tabs = document.getElementById('dicas-tabs');
    if (!tabs) return;

    tabs.addEventListener('click', async (e) => {
        const btn = e.target.closest('.dicas-tab');
        if (!btn) return;

        const tab = btn.dataset.tab;
        if (tab === estadoDicas.tabAtual) return;

        // Atualizar visual
        tabs.querySelectorAll('.dicas-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        // Carregar tab
        await carregarTab(tab);
    });
}

async function carregarTab(tab) {
    estadoDicas.tabAtual = tab;

    if (tab === 'sugestao') {
        renderizarFormSugestao();
    } else if (tab === 'jogadores') {
        await carregarJogadores();
    } else if (tab === 'confrontos') {
        await carregarConfrontos();
    } else if (tab === 'calculadora') {
        renderizarCalculadora();
    }
}

// =====================================================================
// TAB: JOGADORES
// =====================================================================
async function carregarJogadores() {
    const content = document.getElementById('dicas-content');
    content.innerHTML = renderizarLoading('Buscando jogadores...');

    try {
        const params = new URLSearchParams({
            posicao: estadoDicas.filtros.posicao !== 'todos' ? estadoDicas.filtros.posicao : '',
            ordem: estadoDicas.filtros.ordem,
            limit: 30
        });

        const resp = await fetch(`/api/dicas-premium/jogadores?${params}`);
        const data = await resp.json();

        if (!data.sucesso) {
            if (data.premium === false) {
                renderizarTelaBloqueio();
                return;
            }
            throw new Error(data.erro);
        }

        estadoDicas.jogadores = data.jogadores;
        estadoDicas.rodada = data.rodada;

        // Atualizar info da rodada
        const rodadaInfo = document.getElementById('dicas-rodada-info');
        if (rodadaInfo) rodadaInfo.textContent = `Rodada ${data.rodada}`;

        renderizarTabJogadores();

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-DICAS", "Erro:", error);
        content.innerHTML = renderizarErro(error.message);
    }
}

function renderizarTabJogadores() {
    const content = document.getElementById('dicas-content');

    content.innerHTML = `
        <!-- Filtros -->
        <div class="px-4 py-3 border-b border-white/10">
            <div class="flex gap-2 overflow-x-auto pb-1" id="filtros-posicao">
                ${POSICOES.map(p => `
                    <button class="dicas-filtro-btn ${estadoDicas.filtros.posicao == p.id ? 'active' : ''}"
                            data-posicao="${p.id}">
                        ${p.abrev}
                    </button>
                `).join('')}
            </div>
        </div>

        <!-- Ordenacao -->
        <div class="px-4 py-2 flex items-center justify-between">
            <span class="text-xs text-white/40">${estadoDicas.jogadores.length} jogadores</span>
            <select id="ordem-select" class="bg-transparent text-xs text-white/60 border-none outline-none">
                <option value="media" ${estadoDicas.filtros.ordem === 'media' ? 'selected' : ''}>Ordenar: Media</option>
                <option value="preco" ${estadoDicas.filtros.ordem === 'preco' ? 'selected' : ''}>Ordenar: Preco</option>
                <option value="mpv" ${estadoDicas.filtros.ordem === 'mpv' ? 'selected' : ''}>Ordenar: MPV</option>
                <option value="variacao" ${estadoDicas.filtros.ordem === 'variacao' ? 'selected' : ''}>Ordenar: Variacao</option>
            </select>
        </div>

        <!-- Lista de Jogadores -->
        <div class="px-4 space-y-2" id="lista-jogadores">
            ${estadoDicas.jogadores.length > 0
                ? estadoDicas.jogadores.map(j => renderizarCardJogador(j)).join('')
                : renderizarVazio('Nenhum jogador encontrado para os filtros selecionados')
            }
        </div>
    `;

    // Event listeners
    document.getElementById('filtros-posicao')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.dicas-filtro-btn');
        if (!btn) return;

        estadoDicas.filtros.posicao = btn.dataset.posicao;
        await carregarJogadores();
    });

    document.getElementById('ordem-select')?.addEventListener('change', async (e) => {
        estadoDicas.filtros.ordem = e.target.value;
        await carregarJogadores();
    });
}

function renderizarCardJogador(j) {
    const variacaoCor = j.variacao >= 0 ? 'text-green-400' : 'text-red-400';
    const variacaoIcon = j.variacao >= 0 ? 'trending_up' : 'trending_down';

    return `
        <div class="dicas-jogador-card" onclick="window.abrirDetalheJogador(${j.atletaId})">
            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <img src="/escudos/${j.clubeId}.png" onerror="this.src='/escudos/default.png'" class="w-6 h-6" alt="">
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-white truncate">${j.nome}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">${j.posicao}</span>
                </div>
                <div class="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                    <span>C$ ${j.preco.toFixed(2)}</span>
                    <span class="flex items-center gap-0.5 ${variacaoCor}">
                        <span class="material-icons text-xs">${variacaoIcon}</span>
                        ${j.variacao > 0 ? '+' : ''}${j.variacao.toFixed(2)}
                    </span>
                </div>
            </div>
            <div class="text-right">
                <div class="text-lg font-bold text-primary" style="font-family: 'JetBrains Mono', monospace;">
                    ${j.media.toFixed(1)}
                </div>
                <div class="text-[10px] text-white/40">MPV ${j.mpv}</div>
            </div>
        </div>
    `;
}

// =====================================================================
// TAB: CONFRONTOS
// =====================================================================
async function carregarConfrontos() {
    const content = document.getElementById('dicas-content');
    content.innerHTML = renderizarLoading('Analisando confrontos...');

    try {
        const resp = await fetch('/api/dicas-premium/confrontos?posicao=5&periodo=5');
        const data = await resp.json();

        if (!data.sucesso) {
            if (data.premium === false) {
                renderizarTelaBloqueio();
                return;
            }
            throw new Error(data.erro);
        }

        estadoDicas.confrontos = data.confrontos;
        renderizarTabConfrontos();

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-DICAS", "Erro confrontos:", error);
        content.innerHTML = renderizarErro(error.message);
    }
}

function renderizarTabConfrontos() {
    const content = document.getElementById('dicas-content');

    content.innerHTML = `
        <div class="px-4 py-3">
            <div class="flex items-center gap-2 mb-3">
                <span class="material-icons text-red-400">gpp_bad</span>
                <h3 class="text-sm font-bold text-white">Defesas Vulneraveis</h3>
            </div>
            <p class="text-xs text-white/50 mb-4">
                Times que mais cedem pontos para atacantes nas ultimas 5 rodadas
            </p>

            <div class="space-y-2">
                ${estadoDicas.confrontos.map((c, i) => `
                    <div class="dicas-confronto-card">
                        <div class="flex items-center gap-3">
                            <span class="w-6 text-center text-xs font-bold ${i < 3 ? 'text-red-400' : 'text-white/40'}">${i + 1}</span>
                            <img src="/escudos/${c.clubeId}.png" onerror="this.src='/escudos/default.png'" class="w-8 h-8" alt="">
                            <span class="text-sm text-white">${c.clubeNome}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-lg font-bold text-red-400" style="font-family: 'JetBrains Mono', monospace;">
                                ${c.mediaCedida}
                            </span>
                            <span class="text-xs text-white/40 block">pts/jogo</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${estadoDicas.confrontos.length === 0 ? renderizarVazio('Dados insuficientes para analise. Aguarde mais rodadas serem disputadas.') : ''}
        </div>
    `;
}

// =====================================================================
// TAB: CALCULADORA MPV
// =====================================================================
function renderizarCalculadora() {
    const content = document.getElementById('dicas-content');

    content.innerHTML = `
        <div class="px-4 py-4">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-icons text-primary">calculate</span>
                <h3 class="text-sm font-bold text-white">Calculadora de Valorizacao</h3>
            </div>

            <p class="text-xs text-white/50 mb-4">
                Descubra quantos pontos um jogador precisa fazer para valorizar ou desvalorizar.
            </p>

            <div class="mb-4">
                <label class="text-xs text-white/50 block mb-2">Preco do Jogador (Cartoletas)</label>
                <input type="number" id="mpv-input" class="dicas-input" placeholder="Ex: 12.50" step="0.01" min="0">
            </div>

            <button id="calcular-mpv-btn" class="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm">
                Calcular MPV
            </button>

            <div id="mpv-resultado" class="mt-4 hidden">
                <!-- Resultado sera inserido aqui -->
            </div>
        </div>
    `;

    document.getElementById('calcular-mpv-btn')?.addEventListener('click', calcularMPV);
    document.getElementById('mpv-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') calcularMPV();
    });
}

async function calcularMPV() {
    const input = document.getElementById('mpv-input');
    const resultado = document.getElementById('mpv-resultado');
    const preco = parseFloat(input?.value);

    if (!preco || preco <= 0) {
        resultado.innerHTML = `
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                Digite um preco valido
            </div>
        `;
        resultado.classList.remove('hidden');
        return;
    }

    resultado.innerHTML = renderizarLoading('Calculando...');
    resultado.classList.remove('hidden');

    try {
        const resp = await fetch(`/api/dicas-premium/calculadora-mpv?preco=${preco}`);
        const data = await resp.json();

        if (!data.sucesso) {
            if (data.premium === false) {
                renderizarTelaBloqueio();
                return;
            }
            throw new Error(data.erro);
        }

        resultado.innerHTML = `
            <div class="p-4 rounded-xl bg-white/5 border border-white/10">
                <div class="text-center mb-4">
                    <div class="text-sm text-white/50">Minimo para Valorizar</div>
                    <div class="text-3xl font-bold text-primary" style="font-family: 'JetBrains Mono', monospace;">
                        ${data.mpv} pts
                    </div>
                </div>

                <div class="text-xs text-white/50 mb-2">Simulacao de Pontuacao:</div>
                <div class="bg-black/20 rounded-lg overflow-hidden">
                    ${data.tabela.map(t => `
                        <div class="mpv-tabela-row">
                            <span class="text-white/60">${t.pontos} pts</span>
                            <span class="${t.variacao >= 0 ? 'text-green-400' : 'text-red-400'}">
                                ${t.variacao > 0 ? '+' : ''}C$ ${t.variacao.toFixed(2)}
                            </span>
                            <span class="text-white/40">C$ ${t.novoPreco.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

    } catch (error) {
        resultado.innerHTML = `
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                ${error.message}
            </div>
        `;
    }
}

// =====================================================================
// TAB: SUGESTAO DE ESCALACAO
// =====================================================================
function renderizarFormSugestao() {
    const content = document.getElementById('dicas-content');

    content.innerHTML = `
        <div class="px-4 py-4">
            <div class="flex items-center gap-2 mb-2">
                <span class="material-icons text-primary">auto_awesome</span>
                <h3 class="text-sm font-bold text-white">Sugestao de Escalacao</h3>
            </div>
            <p class="text-xs text-white/50 mb-4">
                Informe seu patrimonio e objetivo para receber um time otimizado.
            </p>

            <!-- Patrimonio -->
            <div class="mb-4">
                <label class="text-xs text-white/50 block mb-2">Patrimonio Disponivel (C$)</label>
                <input type="number" id="sugestao-patrimonio" class="dicas-input"
                       placeholder="Ex: 120.00" step="0.01" min="50" value="100">
            </div>

            <!-- Slider de Objetivo -->
            <div class="mb-6">
                <label class="text-xs text-white/50 block mb-2">Objetivo da Escalacao</label>
                <div class="slider-container">
                    <input type="range" id="sugestao-peso" min="0" max="100" value="50">
                    <div class="slider-labels">
                        <span>Mitar (pontos)</span>
                        <span>Valorizar (C$)</span>
                    </div>
                </div>
                <div class="text-center mt-2">
                    <span id="peso-valor" class="text-xs text-white/60">Equilibrado (50%)</span>
                </div>
            </div>

            <button id="gerar-sugestao-btn" class="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2">
                <span class="material-icons text-lg">auto_awesome</span>
                Gerar Time
            </button>

            <div id="sugestao-resultado" class="mt-4">
                <!-- Resultado sera inserido aqui -->
            </div>
        </div>
    `;

    // Event listeners
    const slider = document.getElementById('sugestao-peso');
    const pesoValor = document.getElementById('peso-valor');

    slider?.addEventListener('input', (e) => {
        const valor = parseInt(e.target.value);
        let texto;
        if (valor <= 20) texto = `Foco em Mitar (${valor}%)`;
        else if (valor <= 40) texto = `Mitar + Valorizar (${valor}%)`;
        else if (valor <= 60) texto = `Equilibrado (${valor}%)`;
        else if (valor <= 80) texto = `Valorizar + Mitar (${valor}%)`;
        else texto = `Foco em Valorizar (${valor}%)`;
        pesoValor.textContent = texto;
    });

    document.getElementById('gerar-sugestao-btn')?.addEventListener('click', gerarSugestaoEscalacao);
}

async function gerarSugestaoEscalacao() {
    const patrimonio = parseFloat(document.getElementById('sugestao-patrimonio')?.value);
    const pesoValorizacao = parseInt(document.getElementById('sugestao-peso')?.value) || 50;
    const resultado = document.getElementById('sugestao-resultado');

    if (!patrimonio || patrimonio < 50) {
        resultado.innerHTML = `
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                Patrimonio minimo de C$ 50.00
            </div>
        `;
        return;
    }

    resultado.innerHTML = renderizarLoading('Montando time ideal...');

    try {
        const resp = await fetch('/api/dicas-premium/sugestao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patrimonio, pesoValorizacao })
        });

        const data = await resp.json();

        if (!data.sucesso) {
            if (data.premium === false) {
                renderizarTelaBloqueio();
                return;
            }
            throw new Error(data.erro);
        }

        estadoDicas.sugestao = data;
        estadoDicas.rodada = data.rodada;

        // Atualizar info da rodada
        const rodadaInfo = document.getElementById('dicas-rodada-info');
        if (rodadaInfo) rodadaInfo.textContent = `Rodada ${data.rodada}`;

        renderizarResultadoSugestao(data);

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-DICAS", "Erro sugestao:", error);
        resultado.innerHTML = `
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                ${error.message}
            </div>
        `;
    }
}

function renderizarResultadoSugestao(data) {
    const resultado = document.getElementById('sugestao-resultado');
    const { escalacao, gastoTotal, sobra, pontuacaoEsperada, formacao } = data;

    // Agrupar por posicao para exibicao
    const porPosicao = {
        1: escalacao.filter(j => j.posicaoId === 1), // GOL
        3: escalacao.filter(j => j.posicaoId === 3), // ZAG
        2: escalacao.filter(j => j.posicaoId === 2), // LAT
        4: escalacao.filter(j => j.posicaoId === 4), // MEI
        5: escalacao.filter(j => j.posicaoId === 5), // ATA
        6: escalacao.filter(j => j.posicaoId === 6), // TEC
    };

    const posicaoClasses = {
        1: 'gol', 2: 'lat', 3: 'zag', 4: 'mei', 5: 'ata', 6: 'tec'
    };

    resultado.innerHTML = `
        <!-- Resumo -->
        <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="resumo-card">
                <span class="text-xs text-white/40">Gasto</span>
                <span class="text-lg font-bold text-white" style="font-family: 'JetBrains Mono', monospace;">
                    C$ ${gastoTotal.toFixed(2)}
                </span>
            </div>
            <div class="resumo-card">
                <span class="text-xs text-white/40">Sobra</span>
                <span class="text-lg font-bold text-green-400" style="font-family: 'JetBrains Mono', monospace;">
                    C$ ${sobra.toFixed(2)}
                </span>
            </div>
            <div class="resumo-card">
                <span class="text-xs text-white/40">Esperado</span>
                <span class="text-lg font-bold text-primary" style="font-family: 'JetBrains Mono', monospace;">
                    ~${pontuacaoEsperada.media}
                </span>
                <span class="text-[10px] text-white/30">${pontuacaoEsperada.min}-${pontuacaoEsperada.max}</span>
            </div>
        </div>

        <!-- Formacao -->
        <div class="text-center mb-3">
            <span class="text-xs text-white/40">Formacao: </span>
            <span class="text-xs text-white font-bold">${formacao}</span>
        </div>

        <!-- Escalacao -->
        <div class="space-y-2">
            ${Object.entries(porPosicao).map(([posId, jogadores]) =>
                jogadores.map(j => `
                    <div class="sugestao-jogador ${j.capitao ? 'capitao' : ''}">
                        <span class="sugestao-posicao-badge ${posicaoClasses[j.posicaoId]}">${j.posicao}</span>
                        <img src="/escudos/${j.clubeId}.png" onerror="this.src='/escudos/default.png'"
                             class="w-7 h-7" alt="">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-sm text-white truncate">${j.nome}</span>
                                ${j.capitao ? '<span class="capitao-badge"><span class="material-icons" style="font-size:10px">star</span>C</span>' : ''}
                            </div>
                            <span class="text-[10px] text-white/40">${j.clubeAbrev}</span>
                        </div>
                        <div class="text-right">
                            <div class="text-sm font-bold text-white" style="font-family: 'JetBrains Mono', monospace;">
                                ${j.media.toFixed(1)}
                            </div>
                            <div class="text-[10px] text-white/40">C$ ${j.preco.toFixed(2)}</div>
                        </div>
                    </div>
                `).join('')
            ).join('')}
        </div>

        <!-- Aviso -->
        <div class="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div class="flex items-start gap-2">
                <span class="material-icons text-yellow-500 text-lg">info</span>
                <p class="text-xs text-white/60">
                    Esta e uma sugestao baseada em estatisticas. Analise os confrontos e
                    noticias antes de escalar. O capitao sugerido e o jogador com maior media.
                </p>
            </div>
        </div>

        <!-- Botao Nova Sugestao -->
        <button onclick="window.gerarNovaSugestao()"
                class="w-full mt-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm">
            Gerar Nova Sugestao
        </button>
    `;
}

// Funcao global para gerar nova sugestao
window.gerarNovaSugestao = function() {
    renderizarFormSugestao();
};

// =====================================================================
// FUNCOES AUXILIARES
// =====================================================================
function renderizarLoading(texto = 'Carregando...') {
    return `
        <div class="flex flex-col items-center justify-center min-h-[300px] py-16">
            <div class="w-10 h-10 border-4 border-zinc-700 border-t-primary rounded-full animate-spin mb-3"></div>
            <p class="text-sm text-gray-400">${texto}</p>
        </div>
    `;
}

function renderizarErro(mensagem) {
    return `
        <div class="text-center py-16 px-5">
            <span class="material-icons text-5xl text-red-500 mb-4 block">error</span>
            <p class="text-white/70">${mensagem || 'Erro ao carregar dados'}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-white/10 rounded-lg text-white text-sm">
                Tentar novamente
            </button>
        </div>
    `;
}

function renderizarVazio(mensagem = 'Nenhum dado disponivel') {
    return `
        <div class="text-center py-16 px-5">
            <span class="material-icons text-5xl mb-4 block" style="color:rgba(255,255,255,0.2);">inbox</span>
            <p class="text-sm" style="color:rgba(255,255,255,0.5);">${mensagem}</p>
        </div>
    `;
}

// Modal de detalhes (simplificado para MVP)
window.abrirDetalheJogador = async function(atletaId) {
    // MVP: apenas log - implementar modal na fase 2
    if (window.Log) Log.info("PARTICIPANTE-DICAS", `Detalhe jogador: ${atletaId}`);
};

// Expor globalmente
window.inicializarDicasParticipante = inicializarDicasParticipante;

if (window.Log) Log.info("PARTICIPANTE-DICAS", "Modulo v2.0 carregado (Dicas Premium)");

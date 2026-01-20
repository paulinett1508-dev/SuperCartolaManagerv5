// =====================================================================
// PARTICIPANTE-CAMPINHO.JS - v1.0 (CAMPINHO VIRTUAL)
// =====================================================================
// ✅ v1.0: Exibe escalacao do participante em formato de campo
//          - Mostra jogadores posicionados por formacao
//          - Integra com confrontos (Pontos Corridos, Mata-mata)
//          - Comparativo lado-a-lado com adversario
// =====================================================================

if (window.Log) Log.info("PARTICIPANTE-CAMPINHO", "🔄 Carregando módulo v1.0...");

// Mapeamento de posicoes do Cartola
const POSICOES = {
    1: { nome: 'Goleiro', abrev: 'GOL', linha: 0 },
    2: { nome: 'Lateral', abrev: 'LAT', linha: 1 },
    3: { nome: 'Zagueiro', abrev: 'ZAG', linha: 1 },
    4: { nome: 'Meia', abrev: 'MEI', linha: 2 },
    5: { nome: 'Atacante', abrev: 'ATA', linha: 3 },
    6: { nome: 'Técnico', abrev: 'TEC', linha: 4 }
};

// Estado do modulo
let dadosEscalacao = null;
let dadosAdversario = null;
let confrontoAtual = null;

// =====================================================================
// FUNCAO PRINCIPAL DE INICIALIZACAO
// =====================================================================
export async function inicializarCampinhoParticipante(params) {
    let ligaId, timeId, participante;

    if (typeof params === "object" && params !== null) {
        ligaId = params.ligaId;
        timeId = params.timeId;
        participante = params.participante;
    } else {
        ligaId = params;
        timeId = arguments[1];
    }

    if (window.Log) Log.debug("PARTICIPANTE-CAMPINHO", "🚀 Inicializando...", { ligaId, timeId });

    const container = document.getElementById("campinho-container");
    if (!container) {
        if (window.Log) Log.error("PARTICIPANTE-CAMPINHO", "❌ Container não encontrado");
        return;
    }

    // Mostrar loading
    container.innerHTML = renderizarLoading();

    try {
        // Buscar dados necessarios
        const [escalacao, confrontos, statusMercado] = await Promise.all([
            buscarEscalacao(ligaId, timeId),
            buscarConfrontos(ligaId, timeId),
            buscarStatusMercado()
        ]);

        dadosEscalacao = escalacao;
        confrontoAtual = confrontos;

        // Verificar se mercado esta fechado (mostra escalacao)
        const mercadoFechado = statusMercado?.status_mercado !== 1;

        if (!mercadoFechado) {
            // Mercado aberto - mostrar aviso
            container.innerHTML = renderizarAvisoMercadoAberto(statusMercado);
            return;
        }

        if (!escalacao || !escalacao.atletas || escalacao.atletas.length === 0) {
            container.innerHTML = renderizarSemEscalacao();
            return;
        }

        // Buscar dados do adversario se tiver confronto
        if (confrontos?.adversario?.timeId) {
            dadosAdversario = await buscarEscalacao(ligaId, confrontos.adversario.timeId);
        }

        // Renderizar campinho completo
        container.innerHTML = renderizarCampinhoCompleto(escalacao, dadosAdversario, confrontos);

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-CAMPINHO", "❌ Erro:", error);
        container.innerHTML = renderizarErro(error.message);
    }
}

// =====================================================================
// FUNCOES DE BUSCA DE DADOS
// =====================================================================
async function buscarEscalacao(ligaId, timeId) {
    try {
        // Primeiro, pegar rodada atual
        const statusRes = await fetch('/api/cartola/mercado/status');
        const status = await statusRes.json();
        const rodada = status.rodada_atual || 1;

        // Buscar escalacao do time na rodada
        const response = await fetch(`/api/rodadas/${ligaId}/rodadas?inicio=${rodada}&fim=${rodada}`);
        if (!response.ok) return null;

        const rodadas = await response.json();
        const rodadaTime = rodadas.find(r =>
            Number(r.timeId) === Number(timeId) || Number(r.time_id) === Number(timeId)
        );

        if (!rodadaTime) return null;

        // Se tiver atletas no registro, usar
        if (rodadaTime.atletas && rodadaTime.atletas.length > 0) {
            return {
                timeId,
                rodada,
                atletas: rodadaTime.atletas,
                pontos: rodadaTime.pontos,
                patrimonio: rodadaTime.patrimonio
            };
        }

        // Fallback: buscar da API Cartola diretamente
        const cartolaRes = await fetch(`/api/cartola/time/${timeId}/rodada/${rodada}`);
        if (cartolaRes.ok) {
            return await cartolaRes.json();
        }

        return null;
    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-CAMPINHO", "Erro ao buscar escalação:", error);
        return null;
    }
}

async function buscarConfrontos(ligaId, timeId) {
    try {
        // Buscar confronto de Pontos Corridos
        const pcRes = await fetch(`/api/pontos-corridos/${ligaId}/confronto/${timeId}`);
        let pontosCorridos = null;
        if (pcRes.ok) {
            pontosCorridos = await pcRes.json();
        }

        // Buscar confronto de Mata-mata
        const mmRes = await fetch(`/api/mata-mata/${ligaId}/confronto/${timeId}`);
        let mataMata = null;
        if (mmRes.ok) {
            mataMata = await mmRes.json();
        }

        // Retornar o confronto mais relevante
        if (mataMata?.ativo) {
            return {
                tipo: 'mata-mata',
                adversario: mataMata.adversario,
                placar: mataMata.placar,
                fase: mataMata.fase
            };
        }

        if (pontosCorridos?.adversario) {
            return {
                tipo: 'pontos-corridos',
                adversario: pontosCorridos.adversario,
                placar: pontosCorridos.placar,
                posicao: pontosCorridos.posicao
            };
        }

        return null;
    } catch (error) {
        if (window.Log) Log.debug("PARTICIPANTE-CAMPINHO", "Sem confrontos ativos");
        return null;
    }
}

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

// =====================================================================
// FUNCOES DE RENDERIZACAO
// =====================================================================
function renderizarLoading() {
    return `
        <div class="flex flex-col items-center justify-center min-h-[400px] py-16">
            <div class="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin mb-4"></div>
            <p class="text-sm text-gray-400">Carregando escalação...</p>
        </div>
    `;
}

function renderizarErro(mensagem) {
    return `
        <div class="text-center py-16 px-5">
            <span class="material-icons text-5xl text-red-500 mb-4">error</span>
            <p class="text-white/70">${mensagem || 'Erro ao carregar dados'}</p>
        </div>
    `;
}

function renderizarSemEscalacao() {
    return `
        <div class="text-center py-16 px-5">
            <span class="material-icons text-5xl text-yellow-500 mb-4">sports_soccer</span>
            <p class="text-white text-lg font-medium mb-2">Sem escalação</p>
            <p class="text-white/50 text-sm">Você ainda não escalou nesta rodada</p>
        </div>
    `;
}

function renderizarAvisoMercadoAberto(status) {
    return `
        <div class="text-center py-16 px-5">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <span class="material-icons text-4xl text-green-400">storefront</span>
            </div>
            <p class="text-white text-lg font-medium mb-2">Mercado Aberto</p>
            <p class="text-white/50 text-sm mb-4">A escalação será exibida após o fechamento do mercado</p>
            ${status?.rodada_atual ? `<p class="text-xs text-white/30">Rodada ${status.rodada_atual}</p>` : ''}
        </div>
    `;
}

function renderizarCampinhoCompleto(escalacao, adversario, confronto) {
    const temAdversario = adversario && adversario.atletas && adversario.atletas.length > 0;

    return `
        <div class="pb-28">
            <!-- Header com info da rodada -->
            <div class="px-4 py-3 border-b border-white/10">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Sua Escalação
                        </h2>
                        <p class="text-xs text-white/50">Rodada ${escalacao.rodada || '--'}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold text-primary" style="font-family: 'JetBrains Mono', monospace;">
                            ${(escalacao.pontos || 0).toFixed(2)}
                        </p>
                        <p class="text-[10px] text-white/50 uppercase">Pontos</p>
                    </div>
                </div>
            </div>

            <!-- Campinho Principal -->
            <div class="px-4 py-4">
                ${renderizarCampinho(escalacao.atletas, 'meu-time')}
            </div>

            ${confronto ? `
                <!-- Card de Confronto -->
                <div class="mx-4 mb-4 p-4 rounded-xl bg-surface-dark border border-white/10">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="material-icons text-primary">${confronto.tipo === 'mata-mata' ? 'sports_kabaddi' : 'leaderboard'}</span>
                        <span class="text-sm font-medium text-white">
                            ${confronto.tipo === 'mata-mata' ? `Mata-Mata - ${confronto.fase || ''}` : 'Pontos Corridos'}
                        </span>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="text-center flex-1">
                            <p class="text-xs text-white/50">Você</p>
                            <p class="text-xl font-bold text-white">${confronto.placar?.meu || 0}</p>
                        </div>
                        <div class="px-4">
                            <span class="text-white/30 text-lg">vs</span>
                        </div>
                        <div class="text-center flex-1">
                            <p class="text-xs text-white/50">${confronto.adversario?.nome || 'Adversário'}</p>
                            <p class="text-xl font-bold text-white">${confronto.placar?.adversario || 0}</p>
                        </div>
                    </div>
                </div>

                ${temAdversario ? `
                    <!-- Campinho do Adversario -->
                    <div class="px-4 py-2">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="material-icons text-red-400">person</span>
                            <span class="text-sm font-medium text-white">${confronto.adversario?.nome || 'Adversário'}</span>
                            <span class="text-lg font-bold text-red-400 ml-auto">${(adversario.pontos || 0).toFixed(2)} pts</span>
                        </div>
                        ${renderizarCampinho(adversario.atletas, 'adversario', true)}
                    </div>
                ` : ''}
            ` : ''}
        </div>
    `;
}

function renderizarCampinho(atletas, id, isAdversario = false) {
    if (!atletas || atletas.length === 0) {
        return '<div class="text-center py-8 text-white/30">Sem dados de escalação</div>';
    }

    // Organizar atletas por posicao
    const goleiros = atletas.filter(a => a.posicaoId === 1 || a.posicao === 1);
    const defensores = atletas.filter(a => a.posicaoId === 2 || a.posicaoId === 3 || a.posicao === 2 || a.posicao === 3);
    const meias = atletas.filter(a => a.posicaoId === 4 || a.posicao === 4);
    const atacantes = atletas.filter(a => a.posicaoId === 5 || a.posicao === 5);
    const tecnicos = atletas.filter(a => a.posicaoId === 6 || a.posicao === 6);

    const corBorda = isAdversario ? 'border-red-500/30' : 'border-green-500/30';
    const corFundo = isAdversario ? 'bg-red-500/5' : 'bg-green-500/5';

    return `
        <div id="campinho-${id}" class="campinho-field rounded-2xl p-4 ${corFundo} border ${corBorda}" style="background-image: linear-gradient(to bottom, transparent 24%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.05) 26%, transparent 27%, transparent 49%, rgba(255,255,255,0.1) 50%, transparent 51%, transparent 74%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.05) 76%, transparent 77%);">

            <!-- Tecnico (embaixo) -->
            <div class="campinho-linha justify-center mb-2">
                ${tecnicos.map(a => renderizarJogador(a, isAdversario)).join('')}
            </div>

            <!-- Atacantes -->
            <div class="campinho-linha justify-center mb-3">
                ${atacantes.map(a => renderizarJogador(a, isAdversario)).join('')}
            </div>

            <!-- Meias -->
            <div class="campinho-linha justify-center mb-3">
                ${meias.map(a => renderizarJogador(a, isAdversario)).join('')}
            </div>

            <!-- Defensores -->
            <div class="campinho-linha justify-center mb-3">
                ${defensores.map(a => renderizarJogador(a, isAdversario)).join('')}
            </div>

            <!-- Goleiro (topo) -->
            <div class="campinho-linha justify-center">
                ${goleiros.map(a => renderizarJogador(a, isAdversario)).join('')}
            </div>
        </div>
    `;
}

function renderizarJogador(atleta, isAdversario = false) {
    const nome = atleta.nome || atleta.apelido || 'Jogador';
    const nomeAbrev = nome.length > 8 ? nome.substring(0, 7) + '.' : nome;
    const pontos = (atleta.pontos || 0).toFixed(1);
    const posicao = POSICOES[atleta.posicaoId || atleta.posicao] || { abrev: '?' };
    const clubeId = atleta.clubeId || atleta.clube_id || 0;

    const corPontos = atleta.pontos > 0 ? 'text-green-400' : atleta.pontos < 0 ? 'text-red-400' : 'text-white/50';
    const bgJogador = isAdversario ? 'bg-red-500/20' : 'bg-green-500/20';

    return `
        <div class="campinho-jogador flex flex-col items-center mx-1">
            <div class="w-10 h-10 rounded-full ${bgJogador} flex items-center justify-center mb-1 relative">
                ${clubeId ? `<img src="/escudos/${clubeId}.png" onerror="this.src='/escudos/default.png'" class="w-6 h-6 rounded-full" alt="">` : `<span class="material-icons text-white/70 text-lg">person</span>`}
                <span class="absolute -bottom-1 -right-1 px-1 py-0.5 text-[8px] font-bold ${corPontos} bg-black/80 rounded">${pontos}</span>
            </div>
            <span class="text-[9px] text-white/80 font-medium text-center leading-tight max-w-[50px] truncate">${nomeAbrev}</span>
            <span class="text-[8px] text-white/40">${posicao.abrev}</span>
        </div>
    `;
}

// Expor globalmente
window.inicializarCampinhoParticipante = inicializarCampinhoParticipante;

if (window.Log) Log.info("PARTICIPANTE-CAMPINHO", "✅ Módulo v1.0 carregado");

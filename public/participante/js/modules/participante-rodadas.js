// =====================================================================
// PARTICIPANTE-RODADAS.JS - v5.0 EXPANDABLE NAVIGATION
// ✅ v5.1: Grid único de rodadas + Card Destaque
// ✅ v4.6: FIX - Double RAF para garantir container no DOM após refresh
// ✅ v4.5: Removido LIGAS_CONFIG hardcoded - configs vêm do servidor
// ✅ v4.4: CACHE-FIRST - Carregamento instantâneo do IndexedDB
// =====================================================================

if (window.Log) Log.info("[PARTICIPANTE-RODADAS] 📄 Carregando módulo v5.0 EXPANDABLE...");

// Importar módulo de parciais
import * as ParciaisModule from "./participante-rodada-parcial.js";
// Importar módulo de polling inteligente
import * as PollingInteligenteModule from "./participante-rodadas-polling.js";

// Estado do módulo
let todasRodadasCache = [];
let meuTimeId = null;
let ligaId = null;
let rodadaSelecionada = null;
let rodadaAtualCartola = 38;
let parciaisInfo = null;
const TEMPORADA_ATUAL = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarRodadasParticipante({
    participante,
    ligaId: ligaIdParam,
    timeId,
}) {
    if (window.Log)
        Log.info("[PARTICIPANTE-RODADAS] 🚀 Inicializando v5.0 (EXPANDABLE)...", {
            ligaIdParam,
            timeId,
        });

    ligaId = ligaIdParam;
    meuTimeId = timeId;

    // Aguardar DOM estar renderizado (double RAF)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const cache = window.ParticipanteCache;
    let usouCache = false;

    // =========================================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    // =========================================================================
    if (cache) {
        const rodadasCache = await (cache.getRodadasAsync
            ? cache.getRodadasAsync(ligaId, null, null, TEMPORADA_ATUAL)
            : cache.getRodadas(ligaId, TEMPORADA_ATUAL));

        if (rodadasCache && Array.isArray(rodadasCache) && rodadasCache.length > 0) {
            usouCache = true;
            if (window.Log) Log.info("[PARTICIPANTE-RODADAS] ⚡ INSTANT LOAD - dados do cache!");

            const rodadasAgrupadas = agruparRodadasPorNumero(rodadasCache);
            todasRodadasCache = rodadasAgrupadas;

            mostrarLoading(false);
            renderizarInterface(rodadasAgrupadas);
        }
    }

    if (!usouCache) {
        mostrarLoading(true);
    }

    // =========================================================================
    // FASE 2: ATUALIZAÇÃO EM BACKGROUND (Fetch API)
    // =========================================================================
    try {
        // 1. Buscar rodada atual e verificar parciais
        await buscarRodadaAtual();

        // 2. Inicializar módulo de parciais
        parciaisInfo = await ParciaisModule.inicializarParciais(ligaId, timeId);
        if (window.Log)
            Log.info("[PARTICIPANTE-RODADAS] 📊 Parciais:", parciaisInfo);

        // 3. Buscar rodadas consolidadas
        const response = await fetch(
            `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38&temporada=${TEMPORADA_ATUAL}`,
        );
        if (!response.ok) {
            if (!usouCache) throw new Error(`Erro HTTP ${response.status}`);
            return;
        }

        const rodadas = await response.json();
        if (window.Log)
            Log.info(
                `[PARTICIPANTE-RODADAS] 📊 ${rodadas.length} registros recebidos`,
            );

        // 4. Atualizar cache com dados frescos
        if (cache) {
            cache.setRodadas(ligaId, rodadas, TEMPORADA_ATUAL);
        }

        // 5. Agrupar rodadas
        const rodadasAgrupadas = agruparRodadasPorNumero(rodadas);
        todasRodadasCache = rodadasAgrupadas;

        mostrarLoading(false);

        if (rodadasAgrupadas.length === 0 && !parciaisInfo?.disponivel) {
            if (!usouCache) mostrarEstadoVazio(true);
            return;
        }

        // 6. Renderizar interface completa
        renderizarInterface(rodadasAgrupadas);
    } catch (error) {
        if (window.Log) Log.error("[PARTICIPANTE-RODADAS] ❌ Erro:", error);
        if (!usouCache) {
            mostrarLoading(false);
            mostrarErro(error.message);
        }
    }
}

window.inicializarRodadasParticipante = inicializarRodadasParticipante;

// =====================================================================
// BUSCAR RODADA ATUAL
// =====================================================================
async function buscarRodadaAtual() {
    try {
        const response = await fetch("/api/cartola/mercado/status");
        if (response.ok) {
            const data = await response.json();
            rodadaAtualCartola = data.rodada_atual || 38;
            if (window.Log)
                Log.info(
                    `[PARTICIPANTE-RODADAS] 📅 Rodada atual: ${rodadaAtualCartola}`,
                );
        }
    } catch (e) {
        if (window.Log)
            Log.warn(
                "[PARTICIPANTE-RODADAS] ⚠️ Não foi possível obter rodada atual",
            );
    }
}

// =====================================================================
// AGRUPAMENTO
// =====================================================================
function agruparRodadasPorNumero(rodadas) {
    const rodadasMap = new Map();

    rodadas.forEach((r) => {
        const rodadaNum = r.rodada;
        if (!rodadasMap.has(rodadaNum)) {
            rodadasMap.set(rodadaNum, {
                numero: rodadaNum,
                participantes: [],
                meusPontos: null,
                jogou: false,
                posicaoFinanceira: null,
                valorFinanceiro: null,
            });
        }

        const rodadaData = rodadasMap.get(rodadaNum);
        rodadaData.participantes.push({ ...r });
        if (!rodadaData.totalParticipantesAtivos && r.totalParticipantesAtivos) {
            rodadaData.totalParticipantesAtivos = r.totalParticipantesAtivos;
        }

        const timeId = r.timeId || r.time_id;
        if (String(timeId) === String(meuTimeId)) {
            rodadaData.meusPontos = r.pontos || 0;
            rodadaData.jogou = !r.rodadaNaoJogada;
            rodadaData.posicaoFinanceira = r.posicao;
            rodadaData.valorFinanceiro = r.valorFinanceiro;
        }
    });

    return Array.from(rodadasMap.values()).sort((a, b) => a.numero - b.numero);
}

function getTotalParticipantesAtivos(rodada) {
    if (!rodada) return 0;
    if (rodada.totalParticipantesAtivos) return rodada.totalParticipantesAtivos;
    if (!Array.isArray(rodada.participantes)) return 0;
    const ativos = rodada.participantes.filter((p) => p.rodadaNaoJogada !== true);
    return ativos.length || rodada.participantes.length;
}

// =====================================================================
// RENDERIZAR INTERFACE COMPLETA
// =====================================================================
function renderizarInterface(rodadas) {
    // 1. Renderizar Grid de Rodadas
    renderizarGrupos(rodadas);

    // 2. Renderizar Card de Desempenho
    renderizarCardDesempenho(rodadas);

    // 3. Mostrar container
    const container = document.getElementById('rodadasGruposContainer');
    if (container) container.style.display = 'flex';
}

// =====================================================================
// GRID DE RODADAS
// =====================================================================
function renderizarGrupos(rodadas) {
    const container = document.getElementById('rodadasGruposContainer');
    if (!container) return;

    const rodadasMap = new Map();
    rodadas.forEach(r => rodadasMap.set(r.numero, r));

    container.innerHTML = `
        <div class="rodadas-mini-grid" id="grid-todas">
            ${renderizarMiniCards(1, 38, rodadasMap)}
        </div>
        <div class="rodadas-legenda">
            <span class="legenda-item"><span class="legenda-cor saldo-positivo"></span>Ganhou</span>
            <span class="legenda-item"><span class="legenda-cor saldo-negativo"></span>Perdeu</span>
            <span class="legenda-item"><span class="legenda-cor mito"></span>Mito</span>
            <span class="legenda-item"><span class="legenda-cor mico"></span>Mico</span>
            <span class="legenda-item"><span class="legenda-cor futuro"></span>Futuro</span>
        </div>
    `;
}

function renderizarMiniCards(inicio, fim, rodadasMap) {
    let html = '';

    for (let i = inicio; i <= fim; i++) {
        const rodada = rodadasMap.get(i);
        const isParcial = parciaisInfo?.disponivel && i === parciaisInfo.rodada;
        const isFuturo = i > rodadaAtualCartola;
        const temDados = rodada && rodada.participantes.length > 0;
        const jogou = rodada?.jogou || false;
        const pontos = rodada?.meusPontos;
        const valorFinanceiro = rodada?.valorFinanceiro;

        let classes = ['rodada-mini-card'];
        let tipoDestaque = null;

            if (isParcial) {
                classes.push('parcial');
            } else if (isFuturo || (!temDados && !isParcial)) {
                classes.push('futuro');
            } else if (jogou) {
                // Cores por saldo
                if (valorFinanceiro > 0) classes.push('saldo-positivo');
                else if (valorFinanceiro < 0) classes.push('saldo-negativo');

                const destaqueRodada = obterMitoMicoDaRodada(rodada);
                const isMito = destaqueRodada && compararTimeIds(destaqueRodada.mito?.timeId, meuTimeId);
                const isMico = destaqueRodada && compararTimeIds(destaqueRodada.mico?.timeId, meuTimeId);

                if (isMito) {
                    classes.push('mito');
                    tipoDestaque = 'mito';
                } else if (isMico) {
                    classes.push('mico');
                    tipoDestaque = 'mico';
                }
            }

        // Formatar pontos
        let pontosTexto = '';
        if (isParcial) pontosTexto = '⏳';
        else if (temDados && jogou && pontos > 0) pontosTexto = pontos.toFixed(0);
        else if (temDados && !jogou) pontosTexto = 'N/J';

        // Formatar valor financeiro
        let financeiroTexto = '';
        if (jogou && valorFinanceiro != null && valorFinanceiro !== 0) {
            const abs = Math.abs(valorFinanceiro);
            financeiroTexto = valorFinanceiro > 0 ? `+${abs.toFixed(0)}` : `-${abs.toFixed(0)}`;
        }

        const badgeAoVivo = isParcial ? '<span class="badge-mini-ao-vivo">●</span>' : '';
        let badgeDestaque = '';
        if (tipoDestaque === 'mito') {
            badgeDestaque = '<span class="badge-mini-destaque"><span class="material-symbols-outlined">emoji_events</span></span>';
        } else if (tipoDestaque === 'mico') {
            badgeDestaque = '<span class="badge-mini-destaque"><span class="material-symbols-outlined">thumb_down</span></span>';
        }

        html += `
            <div class="${classes.join(' ')}" data-rodada="${i}" onclick="window.selecionarRodadaMini(${i}, ${isParcial})">
                ${badgeAoVivo}
                ${badgeDestaque}
                <span class="mini-card-numero">${i}</span>
                ${pontosTexto ? `<span class="mini-card-pontos">${pontosTexto}</span>` : ''}
                ${financeiroTexto ? `<span class="mini-card-financeiro ${valorFinanceiro > 0 ? 'positivo' : 'negativo'}">${financeiroTexto}</span>` : ''}
            </div>
        `;
    }

    return html;
}

window.selecionarRodadaMini = function(numero, isParcial) {
    const card = document.querySelector(`.rodada-mini-card[data-rodada="${numero}"]`);
    if (card && !card.classList.contains('futuro')) {
        // Atualizar seleção visual
        document.querySelectorAll('.rodada-mini-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        selecionarRodada(numero, isParcial);
    }
};


// =====================================================================
// CARD DE DESEMPENHO MITOS/MICOS
// =====================================================================
function renderizarCardDesempenho(rodadas) {
    const card = document.getElementById("cardDesempenhoMitosMicos");
    if (!card) return;

    let totalMitos = 0;
    let totalMicos = 0;
    let ultimoMito = null;
    let ultimoMico = null;
    let rodadasJogadas = 0;

    rodadas.forEach((rodada) => {
        if (!rodada.jogou || !rodada.participantes?.length) return;

        rodadasJogadas++;

        const destaqueRodada = obterMitoMicoDaRodada(rodada);
        if (destaqueRodada) {
            const numeroRodada = obterNumeroRodada(rodada);
            if (compararTimeIds(destaqueRodada.mito?.timeId, meuTimeId)) {
                totalMitos++;
                ultimoMito = numeroRodada;
            }
            if (compararTimeIds(destaqueRodada.mico?.timeId, meuTimeId)) {
                totalMicos++;
                ultimoMico = numeroRodada;
            }
        }
    });

    const totalOcorrencias = totalMitos + totalMicos;
    const percentMito = totalOcorrencias > 0 ? Math.round((totalMitos / totalOcorrencias) * 100) : 0;
    const percentMico = totalOcorrencias > 0 ? Math.round((totalMicos / totalOcorrencias) * 100) : 0;

    document.getElementById("desempBadgeRodadas").textContent = `${rodadasJogadas} RODADAS`;
    document.getElementById("desempMitosCount").textContent = totalMitos;
    document.getElementById("desempMicosCount").textContent = totalMicos;
    document.getElementById("desempMitoPercent").textContent = `${percentMito}%`;
    document.getElementById("desempMicoPercent").textContent = `${percentMico}%`;
    document.getElementById("progressMito").style.width = `${percentMito}%`;
    document.getElementById("progressMico").style.width = `${percentMico}%`;
    document.getElementById("desempUltimoMito").textContent = ultimoMito ? `Rodada ${ultimoMito}` : "Nenhum";
    document.getElementById("desempUltimoMico").textContent = ultimoMico ? `Rodada ${ultimoMico}` : "Nenhum";

    card.style.display = "block";
}

function obterNumeroRodada(rodada) {
    return rodada?.numero ?? rodada?.rodada ?? rodada?.rodadaNumero ?? null;
}

function compararTimeIds(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
}

function obterMitoMicoDaRodada(rodada) {
    if (!rodada || !Array.isArray(rodada.participantes) || rodada.participantes.length === 0) {
        return null;
    }

    const participantesAtivos = rodada.participantes.filter((p) => p.ativo !== false);
    if (participantesAtivos.length === 0) {
        return null;
    }

    const ordenados = [...participantesAtivos].sort((a, b) => {
        const pontosA = parseFloat(a.pontos || 0);
        const pontosB = parseFloat(b.pontos || 0);
        if (pontosB === pontosA) {
            const idA = String(a.timeId ?? a.time_id ?? a.id ?? "");
            const idB = String(b.timeId ?? b.time_id ?? b.id ?? "");
            return idA.localeCompare(idB);
        }
        return pontosB - pontosA;
    });

    const primeiro = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];

    return {
        mito: {
            timeId: primeiro?.timeId ?? primeiro?.time_id,
            pontos: parseFloat(primeiro?.pontos || 0)
        },
        mico: {
            timeId: ultimo?.timeId ?? ultimo?.time_id,
            pontos: parseFloat(ultimo?.pontos || 0)
        }
    };
}

// =====================================================================
// SELEÇÃO DE RODADA
// =====================================================================
async function selecionarRodada(numeroRodada, isParcial = false) {
    if (window.Log)
        Log.info(`[PARTICIPANTE-RODADAS] 📌 Selecionando rodada ${numeroRodada} (parcial: ${isParcial})`);

    rodadaSelecionada = numeroRodada;
    ParciaisModule.pararAutoRefresh?.();
    PollingInteligenteModule.pararPollingInteligente?.();
    atualizarIndicadorAutoRefresh({ ativo: false });

    const detalhamento = document.getElementById("rodadaDetalhamento");
    if (detalhamento) {
        detalhamento.style.display = "block";
    }

    const rankingContainer = document.getElementById("rankingListPro");
    if (rankingContainer) {
        rankingContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner-rodadas"></div>
                <p style="color: #9ca3af; margin-top: 16px;">Carregando...</p>
            </div>
        `;
    }

    const isRodadaParcial = parciaisInfo?.disponivel && numeroRodada === parciaisInfo.rodada;

    if (isRodadaParcial) {
        await carregarERenderizarParciais(numeroRodada);

        // ✅ FEAT-026: Usar Polling Inteligente baseado em calendário
        PollingInteligenteModule.inicializarPollingInteligente({
            temporada: TEMPORADA_ATUAL,
            rodada: numeroRodada,
            ligaId: ligaId,
            timeId: meuTimeId,
            onUpdate: (dados) => {
                if (rodadaSelecionada !== numeroRodada) return;
                renderizarParciaisDados(numeroRodada, dados);
            },
            onStatus: atualizarIndicadorAutoRefresh
        });
    } else {
        const rodadaData = todasRodadasCache.find((r) => r.numero === numeroRodada);
        if (!rodadaData || rodadaData.participantes.length === 0) {
            if (rankingContainer) {
                rankingContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">inbox</span>
                        <p>Dados desta rodada não disponíveis</p>
                    </div>
                `;
            }
            return;
        }

        renderizarDetalhamentoRodada(rodadaData, false);
    }

    setTimeout(() => {
        detalhamento?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
}

window.selecionarRodada = selecionarRodada;

// =====================================================================
// CARREGAR E RENDERIZAR PARCIAIS
// =====================================================================
async function carregarERenderizarParciais(numeroRodada) {
    const titulo = document.getElementById("rodadaTitulo");
    if (titulo) {
        titulo.innerHTML = `Rodada ${numeroRodada} <span class="badge-parcial">EM ANDAMENTO</span>`;
    }

    const resumo = document.getElementById("rodadaResumo");
    if (resumo) {
        resumo.textContent = "Carregando pontuações parciais...";
    }

    try {
        const dados = await ParciaisModule.carregarParciais();
        renderizarParciaisDados(numeroRodada, dados);
    } catch (error) {
        if (window.Log)
            Log.error("[PARTICIPANTE-RODADAS] Erro ao carregar parciais:", error);
        const rankingContainer = document.getElementById("rankingListPro");
        if (rankingContainer) {
            rankingContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">error_outline</span>
                    <p>Erro ao carregar parciais</p>
                    <button onclick="selecionarRodada(${numeroRodada}, true)"
                            style="margin-top: 16px; padding: 10px 20px; background: #E65100; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

function renderizarParciaisDados(numeroRodada, dados) {
    const titulo = document.getElementById("rodadaTitulo");
    if (titulo) {
        titulo.innerHTML = `Rodada ${numeroRodada} <span class="badge-parcial">EM ANDAMENTO</span>`;
    }

    const resumo = document.getElementById("rodadaResumo");
    const rankingContainer = document.getElementById("rankingListPro");
    const participantes = dados?.participantes || [];
    const inativos = dados?.inativos || [];

    const minhaPosicao = ParciaisModule.obterMinhaPosicaoParcial();

    if (!dados || !Array.isArray(participantes) || participantes.length === 0) {
        if (rankingContainer) {
            let html = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">hourglass_empty</span>
                    <p>Aguardando pontuações...</p>
                    <p style="font-size: 12px; margin-top: 8px;">Os dados aparecerão quando os jogos começarem</p>
                </div>
            `;
            if (inativos.length > 0) {
                html += renderizarSecaoInativos(inativos, numeroRodada);
            }
            rankingContainer.innerHTML = html;
        }

        if (resumo) {
            const infoInativos = inativos.length > 0 ? ` • ${inativos.length} inativo${inativos.length > 1 ? "s" : ""}` : "";
            resumo.innerHTML = `0 participantes • Sua posição: ${minhaPosicao?.posicao || "-"}º${infoInativos}`;
        }

        return;
    }

    const rodadaData = {
        numero: numeroRodada,
        participantes: participantes,
        isParcial: true,
        atualizadoEm: dados?.atualizadoEm,
    };

    if (minhaPosicao) {
        rodadaData.posicaoFinanceira = minhaPosicao.posicao;
        rodadaData.meusPontos = minhaPosicao.pontos;
    }

    renderizarDetalhamentoRodada(rodadaData, true, inativos);

    if (resumo) {
        const horaAtualizacao = dados?.atualizadoEm
            ? new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            : "--:--";
        const infoInativos = inativos.length > 0 ? ` • ${inativos.length} inativo${inativos.length > 1 ? "s" : ""}` : "";
        resumo.innerHTML = `${dados?.totalTimes || participantes.length} participantes • Sua posição: ${minhaPosicao?.posicao || "-"}º${infoInativos}
            <span style="color: #6b7280; font-size: 11px;"> • Atualizado às ${horaAtualizacao}</span>`;
    }
}

// =====================================================================
// DETALHAMENTO DA RODADA
// =====================================================================
function renderizarDetalhamentoRodada(rodadaData, isParcial = false, inativos = []) {
    const titulo = document.getElementById("rodadaTitulo");
    if (titulo) {
        if (isParcial) {
            titulo.innerHTML = `Rodada ${rodadaData.numero} <span class="badge-parcial">EM ANDAMENTO</span>`;
        } else {
            titulo.textContent = `Rodada ${rodadaData.numero}`;
        }
    }

    const todosParticipantes = rodadaData.participantes || [];
    let participantesAtivos = [];
    let participantesInativos = inativos.length > 0 ? inativos : [];
    const rodadaNum = rodadaData.numero;

    if (inativos.length === 0) {
        todosParticipantes.forEach((p) => {
            if (p.ativo === false && p.rodada_desistencia) {
                if (rodadaNum < p.rodada_desistencia) {
                    participantesAtivos.push(p);
                } else {
                    participantesInativos.push(p);
                }
            } else if (p.ativo === false && !p.rodada_desistencia) {
                participantesInativos.push(p);
            } else {
                participantesAtivos.push(p);
            }
        });
    } else {
        participantesAtivos = todosParticipantes;
    }

    const resumo = document.getElementById("rodadaResumo");
    if (resumo && !isParcial) {
        const totalAtivos = participantesAtivos.length;

        let minhaPosicao = rodadaData.posicaoFinanceira;
        if (minhaPosicao == null) {
            const ordenados = [...participantesAtivos].sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
            const meuIndex = ordenados.findIndex((p) => String(p.timeId || p.time_id) === String(meuTimeId));
            minhaPosicao = meuIndex >= 0 ? meuIndex + 1 : "-";
        }

        const infoInativos = participantesInativos.length > 0 ? ` • ${participantesInativos.length} inativo${participantesInativos.length > 1 ? "s" : ""}` : "";
        resumo.textContent = `${totalAtivos} participantes • Sua posição: ${minhaPosicao}º${infoInativos}`;
    }

    const participantesOrdenados = [...participantesAtivos].sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
    const totalParticipantes = participantesOrdenados.length;
    const container = document.getElementById("rankingListPro");

    if (!container) return;

    let html = participantesOrdenados.map((participante, index) => {
        const timeId = participante.timeId || participante.time_id;
        const isMeuTime = String(timeId) === String(meuTimeId);
        const posicao = participante.posicao || index + 1;
        const valorFinanceiro = participante.valorFinanceiro || 0;

        const valorFormatado = Math.abs(valorFinanceiro).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        const financeiroTexto = valorFinanceiro > 0 ? `+R$ ${valorFormatado}` : valorFinanceiro < 0 ? `-R$ ${valorFormatado}` : "R$ 0,00";
        const financeiroClass = valorFinanceiro > 0 ? "positivo" : valorFinanceiro < 0 ? "negativo" : "neutro";

        let posicaoClass = "pos-default";
        if (posicao === 1) posicaoClass = "pos-1";
        else if (posicao === 2) posicaoClass = "pos-2";
        else if (posicao === 3) posicaoClass = "pos-3";
        else if (posicao > totalParticipantes - 3) posicaoClass = "pos-danger";

        const pontosFormatados = Number(participante.pontos || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        const nomeTime = participante.nome || participante.nome_time || "N/D";
        const naoJogouBadge = participante.rodadaNaoJogada ? '<span class="badge-nao-jogou">N/E</span>' : "";

        return `
            <div class="ranking-item-pro ${isMeuTime ? "meu-time" : ""}">
                <div class="posicao-badge-pro ${posicaoClass}">${posicao}º</div>
                <div class="ranking-info-pro">
                    <div class="ranking-nome-time">${nomeTime} ${naoJogouBadge}</div>
                    <div class="ranking-nome-cartola">${participante.nome_cartola || "N/D"}</div>
                </div>
                <div class="ranking-stats-pro">
                    <div class="ranking-pontos-pro">${pontosFormatados}</div>
                    <div class="ranking-financeiro-pro ${financeiroClass}">${financeiroTexto}</div>
                </div>
            </div>
        `;
    }).join("");

    if (participantesInativos.length > 0) {
        html += renderizarSecaoInativos(participantesInativos, rodadaData.numero);
    }

    container.innerHTML = html || '<div style="text-align: center; padding: 40px; color: #6b7280;">Nenhum dado disponível</div>';

    if (isParcial) {
        container.insertAdjacentHTML("beforeend", `
            <div style="text-align: center; padding: 20px;">
                <button onclick="selecionarRodada(${rodadaData.numero}, true)" class="btn-atualizar-parciais">
                    <span class="material-icons">refresh</span>
                    Atualizar Parciais
                </button>
            </div>
        `);
    }
}

// =====================================================================
// RENDERIZAR SEÇÃO DE INATIVOS
// =====================================================================
function renderizarSecaoInativos(inativos, rodadaNum) {
    if (!inativos || inativos.length === 0) return "";

    const inativosOrdenados = [...inativos].sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

    const items = inativosOrdenados.map((p) => {
        const nomeTime = p.nome || p.nome_time || "N/D";
        const nomeCartola = p.nome_cartola || "N/D";
        const rodadaDesist = p.rodada_desistencia;
        const rodadaInfo = rodadaDesist ? `Saiu na R${rodadaDesist}` : "Inativo";

        const pontosFormatados = Number(p.pontos || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        return `
            <div class="ranking-item-pro inativo">
                <div class="posicao-badge-pro pos-inativo">
                    <span class="material-icons" style="font-size: 14px;">person_off</span>
                </div>
                <div class="ranking-info-pro">
                    <div class="ranking-nome-time">${nomeTime}</div>
                    <div class="ranking-nome-cartola">${nomeCartola}</div>
                </div>
                <div class="ranking-stats-pro">
                    <div class="ranking-pontos-pro" style="color: #6b7280;">${pontosFormatados}</div>
                    <div class="ranking-inativo-info">${rodadaInfo}</div>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="secao-inativos">
            <div class="secao-inativos-header">
                <span class="material-icons">person_off</span>
                <span>Participantes Inativos (${inativos.length})</span>
            </div>
            ${items}
        </div>
    `;
}

// =====================================================================
// VOLTAR
// =====================================================================
window.voltarParaCards = function () {
    ParciaisModule.pararAutoRefresh?.();
    PollingInteligenteModule.pararPollingInteligente?.();
    atualizarIndicadorAutoRefresh({ ativo: false });

    const detalhamento = document.getElementById("rodadaDetalhamento");
    if (detalhamento) {
        detalhamento.style.display = "none";
    }

    // Limpar seleções
    document.querySelectorAll(".rodada-mini-card").forEach((card) => {
        card.classList.remove("selected");
    });

    rodadaSelecionada = null;

    // Scroll para o grid
    const grid = document.getElementById('rodadasGruposContainer');
    if (grid) {
        grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};

// =====================================================================
// INDICADOR DE AUTO-REFRESH
// =====================================================================
function atualizarIndicadorAutoRefresh(status) {
    const indicador = document.getElementById("autoRefreshIndicator");
    const texto = document.getElementById("autoRefreshText");
    if (!indicador || !texto) return;

    if (!status?.ativo) {
        indicador.style.display = "none";
        return;
    }

    const intervaloSeg = Math.max(1, Math.round((status.intervalMs || 0) / 1000));
    const nextAt = status.nextAt || (Date.now() + (status.intervalMs || 0));
    const restanteSeg = Math.max(0, Math.round((nextAt - Date.now()) / 1000));

    texto.textContent = `Auto-refresh ativo • ${intervaloSeg}s (próx. ${restanteSeg}s)`;
    indicador.style.display = "inline-flex";
}

// =====================================================================
// TOAST
// =====================================================================
window.mostrarEmDesenvolvimento = function (funcionalidade) {
    mostrarToast(`${funcionalidade} em desenvolvimento`);
};

function mostrarToast(msg) {
    const toast = document.getElementById("toastDesenvolvimento");
    const mensagem = document.getElementById("toastMensagem");

    if (toast && mensagem) {
        mensagem.textContent = msg;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
}

// =====================================================================
// ESTADOS
// =====================================================================
function mostrarLoading(show) {
    const loading = document.getElementById("rodadasLoading");
    const grupos = document.getElementById("rodadasGruposContainer");

    if (loading) loading.style.display = show ? "flex" : "none";
    if (grupos) grupos.style.display = show ? "none" : "flex";
}

function mostrarEstadoVazio(show) {
    const empty = document.getElementById("rodadasEmpty");
    const grupos = document.getElementById("rodadasGruposContainer");

    if (empty) empty.style.display = show ? "flex" : "none";
    if (grupos) grupos.style.display = show ? "none" : "flex";
}

function mostrarErro(mensagem) {
    const container = document.getElementById("rodadasGruposContainer");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">error_outline</span>
                <h3 style="margin-bottom: 8px;">Erro ao Carregar</h3>
                <p style="color: #9ca3af;">${mensagem}</p>
            </div>
        `;
        container.style.display = "flex";
    }
}

if (window.Log)
    Log.info("[PARTICIPANTE-RODADAS] ✅ Módulo v5.0 carregado (EXPANDABLE NAVIGATION)");

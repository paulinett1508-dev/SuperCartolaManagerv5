// =====================================================================
// PARTICIPANTE-RODADAS.JS - v4.6 SaaS DYNAMIC
// ✅ v4.6: FIX - Double RAF para garantir container no DOM após refresh
// ✅ v4.5: Removido LIGAS_CONFIG hardcoded - configs vêm do servidor
// ✅ v4.4: CACHE-FIRST - Carregamento instantâneo do IndexedDB
// ✅ v4.3: Cards coloridos por saldo financeiro
//    - VERDE: valorFinanceiro > 0 (ganhou na rodada)
//    - VERMELHO: valorFinanceiro < 0 (perdeu na rodada)
//    - NEUTRO: valorFinanceiro = 0 (não ganhou nem perdeu)
//    - MITO: Verde intenso com brilho (1º lugar)
//    - MICO: Vermelho intenso com brilho (último lugar)
// ✅ v4.0: Todos os cálculos movidos para o backend
// =====================================================================

if (window.Log) Log.info("[PARTICIPANTE-RODADAS] 📄 Carregando módulo v4.6 SaaS DYNAMIC...");

// Importar módulo de parciais
import * as ParciaisModule from "./participante-rodada-parcial.js";

// ✅ v4.0: Valores movidos para o backend - frontend apenas exibe
// Estado do módulo
let todasRodadasCache = [];
let meuTimeId = null;
let ligaId = null;
let rodadaSelecionada = null;
let rodadaAtualCartola = 38;
let parciaisInfo = null;

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION (v4.4 CACHE-FIRST)
// =====================================================================
export async function inicializarRodadasParticipante({
    participante,
    ligaId: ligaIdParam,
    timeId,
}) {
    if (window.Log)
        Log.info("[PARTICIPANTE-RODADAS] 🚀 Inicializando v4.6 (CACHE-FIRST)...", {
            ligaIdParam,
            timeId,
        });

    ligaId = ligaIdParam;
    meuTimeId = timeId;

    // ✅ v4.6: Aguardar DOM estar renderizado (double RAF)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const cache = window.ParticipanteCache;
    let usouCache = false;

    // =========================================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    // =========================================================================
    if (cache) {
        const rodadasCache = await (cache.getRodadasAsync ? cache.getRodadasAsync(ligaId) : cache.getRodadas(ligaId));

        if (rodadasCache && Array.isArray(rodadasCache) && rodadasCache.length > 0) {
            usouCache = true;
            if (window.Log) Log.info("[PARTICIPANTE-RODADAS] ⚡ INSTANT LOAD - dados do cache!");

            // Agrupar e renderizar IMEDIATAMENTE
            const rodadasAgrupadas = agruparRodadasPorNumero(rodadasCache);
            todasRodadasCache = rodadasAgrupadas;

            mostrarLoading(false);
            renderizarGridCompacto(rodadasAgrupadas);
        }
    }

    // Se não tem cache, mostrar loading
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

        // 3. Buscar rodadas consolidadas (JÁ COM CÁLCULOS DO BACKEND)
        const response = await fetch(
            `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`,
        );
        if (!response.ok) {
            if (!usouCache) throw new Error(`Erro HTTP ${response.status}`);
            return; // Se já usou cache, não mostrar erro
        }

        const rodadas = await response.json();
        if (window.Log)
            Log.info(
                `[PARTICIPANTE-RODADAS] 📊 ${rodadas.length} registros recebidos (backend calculado)`,
            );

        // 4. Atualizar cache com dados frescos
        if (cache) {
            cache.setRodadas(ligaId, rodadas);
        }

        // 5. Agrupar rodadas por número (SEM recalcular - dados vêm do backend)
        const rodadasAgrupadas = agruparRodadasPorNumero(rodadas);
        todasRodadasCache = rodadasAgrupadas;

        mostrarLoading(false);

        if (rodadasAgrupadas.length === 0 && !parciaisInfo?.disponivel) {
            if (!usouCache) mostrarEstadoVazio(true);
            return;
        }

        // 6. Só re-renderizar se não usou cache (ou pode re-renderizar sempre para garantir dados frescos)
        if (!usouCache) {
            renderizarGridCompacto(rodadasAgrupadas);
        }

        // 7. Se parciais disponíveis, destacar rodada atual
        if (parciaisInfo?.disponivel) {
            destacarRodadaEmAndamento(parciaisInfo.rodada);
        }
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
// AGRUPAMENTO - SIMPLIFICADO (Backend faz os cálculos)
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

        // Adicionar participante (já enriquecido pelo backend)
        rodadaData.participantes.push({
            ...r,
            // Backend já calculou: posicao, valorFinanceiro, totalParticipantesAtivos
        });

        // Se é o meu time, guardar informações
        const timeId = r.timeId || r.time_id;
        if (String(timeId) === String(meuTimeId)) {
            rodadaData.meusPontos = r.pontos || 0;
            rodadaData.jogou = !r.rodadaNaoJogada;
            rodadaData.posicaoFinanceira = r.posicao; // ✅ Vem do backend
            rodadaData.valorFinanceiro = r.valorFinanceiro; // ✅ Vem do backend
        }
    });

    return Array.from(rodadasMap.values()).sort((a, b) => a.numero - b.numero);
}

// =====================================================================
// RENDERIZAÇÃO DO GRID COMPACTO
// =====================================================================
function renderizarGridCompacto(rodadas) {
    const container = document.getElementById("rodadasCardsGrid");
    if (!container) {
        if (window.Log)
            Log.error("[PARTICIPANTE-RODADAS] ❌ Container não encontrado");
        return;
    }

    const rodadasMap = new Map();
    rodadas.forEach((r) => rodadasMap.set(r.numero, r));

    let html = "";
    for (let i = 1; i <= 38; i++) {
        const rodada = rodadasMap.get(i);
        const isParcial = parciaisInfo?.disponivel && i === parciaisInfo.rodada;
        html += criarCardCompacto(i, rodada, isParcial);
    }

    container.innerHTML = html;

    const btnContainer = document.getElementById("btnVerJogadores");
    if (btnContainer) {
        btnContainer.style.display = "block";
    }

    // Renderizar card de desempenho MITOS/MICOS
    renderizarCardDesempenho(rodadas);

    // Event listeners
    container
        .querySelectorAll(".rodada-card-compacto:not(.futuro)")
        .forEach((card) => {
            card.addEventListener("click", () => {
                const rodadaNum = parseInt(card.dataset.rodada);
                const isParcial = card.classList.contains("parcial");
                selecionarRodada(rodadaNum, isParcial);
            });
        });
}

function criarCardCompacto(numero, rodada, isParcial = false) {
    const isFuturo = numero > rodadaAtualCartola;
    const temDados = rodada && rodada.participantes.length > 0;
    const jogou = rodada?.jogou || false;
    const pontos = rodada?.meusPontos;

    // ✅ v4.3: Pegar valorFinanceiro corretamente (pode ser null/undefined)
    const valorFinanceiro = rodada?.valorFinanceiro;
    const temValorFinanceiro = valorFinanceiro !== null && valorFinanceiro !== undefined;

    let classes = ["rodada-card-compacto"];
    let tipoDestaque = null; // 'mito' ou 'mico'

    if (isParcial) {
        classes.push("parcial", "em-andamento");
    } else if (isFuturo) {
        classes.push("futuro");
    } else if (!temDados && !isParcial) {
        classes.push("futuro");
    } else if (jogou) {
        classes.push("jogou");

        // ✅ v4.3: Cores baseadas no saldo financeiro
        // Verde = ganhou (valor > 0), Vermelho = perdeu (valor < 0), Neutro = empate/zero
        if (temValorFinanceiro) {
            if (valorFinanceiro > 0) {
                classes.push("saldo-positivo");
            } else if (valorFinanceiro < 0) {
                classes.push("saldo-negativo");
            } else {
                classes.push("saldo-neutro");
            }
        } else {
            classes.push("saldo-neutro");
        }

        // ✅ v4.1: Corrigir lógica de MITO/MICO
        // Usar posicaoFinanceira do meu time + total de participantes ATIVOS
        if (rodada.posicaoFinanceira) {
            // Calcular total de participantes ativos na rodada
            // Prioridade: campo totalParticipantesAtivos > contagem de participantes
            const totalParticipantes =
                rodada.participantes[0]?.totalParticipantesAtivos ||
                rodada.participantes.filter(p => p.ativo !== false).length ||
                rodada.participantes.length;

            // MITO = posição 1
            if (rodada.posicaoFinanceira === 1) {
                classes.push("mito");
                tipoDestaque = "mito";
            }
            // MICO = última posição (apenas se houver mais de 1 participante)
            else if (
                rodada.posicaoFinanceira === totalParticipantes &&
                totalParticipantes > 1
            ) {
                classes.push("mico");
                tipoDestaque = "mico";
            }
        }
    } else {
        classes.push("nao-jogou");
    }

    // Formatar pontos
    let pontosTexto = "";
    if (isParcial) {
        pontosTexto = "⏳";
    } else if (temDados && jogou && pontos !== null && pontos > 0) {
        pontosTexto = pontos.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    } else if (temDados && !jogou) {
        pontosTexto = "N/J";
    }

    const badgeAoVivo = isParcial ? '<span class="badge-ao-vivo">●</span>' : "";

    // Badge de destaque MITO/MICO com Material Icon
    let badgeDestaque = "";
    if (tipoDestaque === "mito") {
        badgeDestaque =
            '<span class="badge-destaque"><span class="material-symbols-outlined">emoji_events</span></span>';
    } else if (tipoDestaque === "mico") {
        badgeDestaque =
            '<span class="badge-destaque"><span class="material-symbols-outlined">thumb_down</span></span>';
    }

    return `
        <div class="${classes.join(" ")}" data-rodada="${numero}">
            ${badgeAoVivo}
            ${badgeDestaque}
            <span class="card-numero">${numero}</span>
            ${pontosTexto ? `<span class="card-pontos">${pontosTexto}</span>` : ""}
        </div>
    `;
}

// =====================================================================
// CARD DE DESEMPENHO MITOS/MICOS
// =====================================================================
function renderizarCardDesempenho(rodadas) {
    const card = document.getElementById("cardDesempenhoMitosMicos");
    if (!card) return;

    // Calcular estatísticas usando dados do backend
    let totalMitos = 0;
    let totalMicos = 0;
    let ultimoMito = null;
    let ultimoMico = null;
    let rodadasJogadas = 0;

    rodadas.forEach((rodada) => {
        if (!rodada.jogou || !rodada.participantes?.length) return;

        rodadasJogadas++;

        // ✅ v4.0: Usar totalParticipantesAtivos do backend
        const totalParticipantes =
            rodada.participantes[0]?.totalParticipantesAtivos ||
            rodada.participantes.length;

        if (rodada.posicaoFinanceira === 1) {
            totalMitos++;
            ultimoMito = rodada.numero;
        } else if (
            rodada.posicaoFinanceira === totalParticipantes &&
            totalParticipantes > 1
        ) {
            totalMicos++;
            ultimoMico = rodada.numero;
        }
    });

    // Calcular percentuais
    const totalOcorrencias = totalMitos + totalMicos;
    const percentMito =
        totalOcorrencias > 0
            ? Math.round((totalMitos / totalOcorrencias) * 100)
            : 0;
    const percentMico =
        totalOcorrencias > 0
            ? Math.round((totalMicos / totalOcorrencias) * 100)
            : 0;

    // Atualizar DOM
    document.getElementById("desempBadgeRodadas").textContent =
        `${rodadasJogadas} RODADAS`;
    document.getElementById("desempMitosCount").textContent = totalMitos;
    document.getElementById("desempMicosCount").textContent = totalMicos;
    document.getElementById("desempMitoPercent").textContent =
        `${percentMito}%`;
    document.getElementById("desempMicoPercent").textContent =
        `${percentMico}%`;
    document.getElementById("progressMito").style.width = `${percentMito}%`;
    document.getElementById("progressMico").style.width = `${percentMico}%`;
    document.getElementById("desempUltimoMito").textContent = ultimoMito
        ? `Rodada ${ultimoMito}`
        : "Nenhum";
    document.getElementById("desempUltimoMico").textContent = ultimoMico
        ? `Rodada ${ultimoMico}`
        : "Nenhum";

    // Mostrar card
    card.style.display = "block";

    if (window.Log)
        Log.info(
            `[PARTICIPANTE-RODADAS] 📊 Desempenho: ${totalMitos} MITOS, ${totalMicos} MICOS em ${rodadasJogadas} rodadas`,
        );
}

// =====================================================================
// DESTACAR RODADA EM ANDAMENTO
// =====================================================================
function destacarRodadaEmAndamento(rodada) {
    const card = document.querySelector(
        `.rodada-card-compacto[data-rodada="${rodada}"]`,
    );
    if (card) {
        card.classList.add("parcial", "em-andamento");

        if (!card.querySelector(".badge-ao-vivo")) {
            const badge = document.createElement("span");
            badge.className = "badge-ao-vivo";
            badge.textContent = "●";
            card.prepend(badge);
        }

        const pontosEl = card.querySelector(".card-pontos");
        if (pontosEl) {
            pontosEl.textContent = "⏳";
        } else {
            const span = document.createElement("span");
            span.className = "card-pontos";
            span.textContent = "⏳";
            card.appendChild(span);
        }
    }
}

// =====================================================================
// SELEÇÃO DE RODADA
// =====================================================================
async function selecionarRodada(numeroRodada, isParcial = false) {
    if (window.Log)
        Log.info(
            `[PARTICIPANTE-RODADAS] 📌 Selecionando rodada ${numeroRodada} (parcial: ${isParcial})`,
        );

    rodadaSelecionada = numeroRodada;
    ParciaisModule.pararAutoRefresh?.();
    atualizarIndicadorAutoRefresh({ ativo: false });

    document.querySelectorAll(".rodada-card-compacto").forEach((card) => {
        card.classList.remove("selected");
    });

    const cardSelecionado = document.querySelector(
        `.rodada-card-compacto[data-rodada="${numeroRodada}"]`,
    );
    if (cardSelecionado) {
        cardSelecionado.classList.add("selected");
    }

    const btnTexto = document.getElementById("btnJogadoresTexto");
    if (btnTexto) {
        btnTexto.textContent = `Ver Meus Jogadores da Rodada ${numeroRodada}`;
    }

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

    const isRodadaParcial =
        parciaisInfo?.disponivel && numeroRodada === parciaisInfo.rodada;

    if (isRodadaParcial) {
        await carregarERenderizarParciais(numeroRodada);
        ParciaisModule.iniciarAutoRefresh?.((dados) => {
            if (rodadaSelecionada !== numeroRodada) return;
            renderizarParciaisDados(numeroRodada, dados);
        }, atualizarIndicadorAutoRefresh);
    } else {
        const rodadaData = todasRodadasCache.find(
            (r) => r.numero === numeroRodada,
        );
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
            Log.error(
                "[PARTICIPANTE-RODADAS] Erro ao carregar parciais:",
                error,
            );
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
            const infoInativos =
                inativos.length > 0
                    ? ` • ${inativos.length} inativo${inativos.length > 1 ? "s" : ""}`
                    : "";
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
            ? new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : "--:--";
        const infoInativos =
            inativos.length > 0
                ? ` • ${inativos.length} inativo${inativos.length > 1 ? "s" : ""}`
                : "";
        resumo.innerHTML = `${dados?.totalTimes || participantes.length} participantes • Sua posição: ${minhaPosicao?.posicao || "-"}º${infoInativos}
            <span style="color: #6b7280; font-size: 11px;"> • Atualizado às ${horaAtualizacao}</span>`;
    }
}

// =====================================================================
// DETALHAMENTO DA RODADA
// =====================================================================
function renderizarDetalhamentoRodada(
    rodadaData,
    isParcial = false,
    inativos = [],
) {
    const titulo = document.getElementById("rodadaTitulo");
    if (titulo) {
        if (isParcial) {
            titulo.innerHTML = `Rodada ${rodadaData.numero} <span class="badge-parcial">EM ANDAMENTO</span>`;
        } else {
            titulo.textContent = `Rodada ${rodadaData.numero}`;
        }
    }

    const todosParticipantes = rodadaData.participantes || [];

    // ✅ v3.6: Separar ativos de inativos CONSIDERANDO A RODADA SELECIONADA
    // Regra: Se rodada < rodada_desistencia, participante era ATIVO nessa rodada
    let participantesAtivos = [];
    let participantesInativos = inativos.length > 0 ? inativos : [];
    const rodadaNum = rodadaData.numero;

    if (inativos.length === 0) {
        // Separar baseado no campo ativo E na rodada
        todosParticipantes.forEach((p) => {
            if (p.ativo === false && p.rodada_desistencia) {
                // Inativo atualmente, mas verifica se era ativo NESTA rodada
                if (rodadaNum < p.rodada_desistencia) {
                    // Era ativo nessa rodada (antes de desistir)
                    participantesAtivos.push(p);
                } else {
                    // Já era inativo nessa rodada
                    participantesInativos.push(p);
                }
            } else if (p.ativo === false && !p.rodada_desistencia) {
                // Inativo sem rodada definida (fallback)
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
            const ordenados = [...participantesAtivos].sort(
                (a, b) => (b.pontos || 0) - (a.pontos || 0),
            );
            const meuIndex = ordenados.findIndex(
                (p) => String(p.timeId || p.time_id) === String(meuTimeId),
            );
            minhaPosicao = meuIndex >= 0 ? meuIndex + 1 : "-";
        }

        const infoInativos =
            participantesInativos.length > 0
                ? ` • ${participantesInativos.length} inativo${participantesInativos.length > 1 ? "s" : ""}`
                : "";
        resumo.textContent = `${totalAtivos} participantes • Sua posição: ${minhaPosicao}º${infoInativos}`;
    }

    // Ordenar participantes ativos por pontuação
    const participantesOrdenados = [...participantesAtivos].sort(
        (a, b) => (b.pontos || 0) - (a.pontos || 0),
    );

    const totalParticipantes = participantesOrdenados.length;
    const container = document.getElementById("rankingListPro");

    if (!container) return;

    // Renderizar ranking de ATIVOS
    let html = participantesOrdenados
        .map((participante, index) => {
            const timeId = participante.timeId || participante.time_id;
            const isMeuTime = String(timeId) === String(meuTimeId);

            // ✅ v4.0: Usar posição e valorFinanceiro do backend
            const posicao = participante.posicao || index + 1;
            const valorFinanceiro = participante.valorFinanceiro || 0;

            const valorFormatado = Math.abs(valorFinanceiro).toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                },
            );

            const financeiroTexto =
                valorFinanceiro > 0
                    ? `+R$ ${valorFormatado}`
                    : valorFinanceiro < 0
                      ? `-R$ ${valorFormatado}`
                      : "R$ 0,00";

            const financeiroClass =
                valorFinanceiro > 0
                    ? "positivo"
                    : valorFinanceiro < 0
                      ? "negativo"
                      : "neutro";

            let posicaoClass = "pos-default";
            if (posicao === 1) posicaoClass = "pos-1";
            else if (posicao === 2) posicaoClass = "pos-2";
            else if (posicao === 3) posicaoClass = "pos-3";
            else if (posicao > totalParticipantes - 3)
                posicaoClass = "pos-danger";

            const pontosFormatados = Number(
                participante.pontos || 0,
            ).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

            const nomeTime =
                participante.nome || participante.nome_time || "N/D";

            const naoJogouBadge = participante.rodadaNaoJogada
                ? '<span class="badge-nao-jogou">N/E</span>'
                : "";

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
        })
        .join("");

    // ✅ v3.6: Adicionar seção de INATIVOS (só para rodadas >= rodada_desistencia)
    if (participantesInativos.length > 0) {
        html += renderizarSecaoInativos(
            participantesInativos,
            rodadaData.numero,
        );
    }

    container.innerHTML =
        html ||
        '<div style="text-align: center; padding: 40px; color: #6b7280;">Nenhum dado disponível</div>';

    // Botão de atualizar para parciais
    if (isParcial) {
        container.insertAdjacentHTML(
            "beforeend",
            `
            <div style="text-align: center; padding: 20px;">
                <button onclick="selecionarRodada(${rodadaData.numero}, true)" 
                        class="btn-atualizar-parciais">
                    <span class="material-icons">refresh</span>
                    Atualizar Parciais
                </button>
            </div>
        `,
        );
    }
}

// =====================================================================
// RENDERIZAR SEÇÃO DE INATIVOS (Escala de cinza)
// =====================================================================
function renderizarSecaoInativos(inativos, rodadaNum) {
    if (!inativos || inativos.length === 0) return "";

    // Ordenar por pontos (decrescente)
    const inativosOrdenados = [...inativos].sort(
        (a, b) => (b.pontos || 0) - (a.pontos || 0),
    );

    const items = inativosOrdenados
        .map((p) => {
            const nomeTime = p.nome || p.nome_time || "N/D";
            const nomeCartola = p.nome_cartola || "N/D";
            const rodadaDesist = p.rodada_desistencia;
            const rodadaInfo = rodadaDesist
                ? `Saiu na R${rodadaDesist}`
                : "Inativo";

            const pontosFormatados = Number(p.pontos || 0).toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                },
            );

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
        })
        .join("");

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
    atualizarIndicadorAutoRefresh({ ativo: false });
    const detalhamento = document.getElementById("rodadaDetalhamento");
    if (detalhamento) {
        detalhamento.style.display = "none";
    }

    document.querySelectorAll(".rodada-card-compacto").forEach((card) => {
        card.classList.remove("selected");
    });

    rodadaSelecionada = null;

    const gridContainer = document.querySelector(".rodadas-grid-container");
    if (gridContainer) {
        gridContainer.scrollIntoView({ behavior: "smooth", block: "start" });
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
    const grid = document.querySelector(".rodadas-grid-container");

    if (loading) loading.style.display = show ? "flex" : "none";
    if (grid) grid.style.display = show ? "none" : "block";
}

function mostrarEstadoVazio(show) {
    const empty = document.getElementById("rodadasEmpty");
    const grid = document.querySelector(".rodadas-grid-container");

    if (empty) empty.style.display = show ? "flex" : "none";
    if (grid) grid.style.display = show ? "none" : "block";
}

function mostrarErro(mensagem) {
    const container = document.getElementById("rodadasCardsGrid");
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444;">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">error_outline</span>
                <h3 style="margin-bottom: 8px;">Erro ao Carregar</h3>
                <p style="color: #9ca3af;">${mensagem}</p>
            </div>
        `;
    }

    const grid = document.querySelector(".rodadas-grid-container");
    if (grid) grid.style.display = "block";
}

if (window.Log)
    Log.info(
        "[PARTICIPANTE-RODADAS] ✅ Módulo v4.4 carregado (CACHE-FIRST + Cores por Saldo)",
    );

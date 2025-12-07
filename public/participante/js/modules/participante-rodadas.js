// =====================================================================
// PARTICIPANTE-RODADAS.JS - v3.6 (Inativos contextuais por rodada)
// ✅ v3.6: Inativos aparecem como ATIVOS nas rodadas anteriores à desistência
//         Visual de inativo SÓ aparece nas rodadas >= rodada_desistencia
// =====================================================================

console.log("[PARTICIPANTE-RODADAS] 📄 Carregando módulo v3.6...");

// Importar módulo de parciais
import * as ParciaisModule from "./participante-rodada-parcial.js";

// Configuração de valores por posição
const LIGAS_CONFIG = {
    SUPERCARTOLA: "684cb1c8af923da7c7df51de",
    CARTOLEIROS_SOBRAL: "684d821cf1a7ae16d1f89572",
};

const valoresBancoPadrao = {
    1: 20.0,
    2: 19.0,
    3: 18.0,
    4: 17.0,
    5: 16.0,
    6: 15.0,
    7: 14.0,
    8: 13.0,
    9: 12.0,
    10: 11.0,
    11: 10.0,
    12: 0.0,
    13: 0.0,
    14: 0.0,
    15: 0.0,
    16: 0.0,
    17: 0.0,
    18: 0.0,
    19: 0.0,
    20: 0.0,
    21: 0.0,
    22: -10.0,
    23: -11.0,
    24: -12.0,
    25: -13.0,
    26: -14.0,
    27: -15.0,
    28: -16.0,
    29: -17.0,
    30: -18.0,
    31: -19.0,
    32: -20.0,
};

const valoresBancoCartoleirosSobral = {
    1: 7.0,
    2: 4.0,
    3: 0.0,
    4: -2.0,
    5: -5.0,
    6: -10.0,
};

function getBancoPorLiga(ligaIdParam) {
    return ligaIdParam === LIGAS_CONFIG.CARTOLEIROS_SOBRAL
        ? valoresBancoCartoleirosSobral
        : valoresBancoPadrao;
}

// Estado do módulo
let todasRodadasCache = [];
let meuTimeId = null;
let ligaId = null;
let rodadaSelecionada = null;
let rodadaAtualCartola = 38;
let parciaisInfo = null;

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarRodadasParticipante({
    participante,
    ligaId: ligaIdParam,
    timeId,
}) {
    console.log("[PARTICIPANTE-RODADAS] 🚀 Inicializando v3.6...", {
        ligaIdParam,
        timeId,
    });

    ligaId = ligaIdParam;
    meuTimeId = timeId;

    mostrarLoading(true);

    try {
        // 1. Buscar rodada atual e verificar parciais
        await buscarRodadaAtual();

        // 2. Inicializar módulo de parciais
        parciaisInfo = await ParciaisModule.inicializarParciais(ligaId, timeId);
        console.log("[PARTICIPANTE-RODADAS] 📊 Parciais:", parciaisInfo);

        // 3. Buscar status de ativo/inativo dos times
        const timesStatus = await buscarTimesStatus(ligaId);
        console.log(
            `[PARTICIPANTE-RODADAS] 👥 ${Object.keys(timesStatus).length} times com status`,
        );

        // 4. Buscar rodadas consolidadas
        const response = await fetch(
            `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`,
        );
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }

        const rodadas = await response.json();
        console.log(
            `[PARTICIPANTE-RODADAS] 📊 ${rodadas.length} registros recebidos`,
        );

        // 5. Agrupar rodadas por número (com status de inativos)
        const rodadasAgrupadas = agruparRodadasPorNumero(rodadas, timesStatus);
        todasRodadasCache = rodadasAgrupadas;

        mostrarLoading(false);

        if (rodadasAgrupadas.length === 0 && !parciaisInfo?.disponivel) {
            mostrarEstadoVazio(true);
            return;
        }

        // 6. Renderizar grid compacto
        renderizarGridCompacto(rodadasAgrupadas);

        // 7. Se parciais disponíveis, destacar rodada atual
        if (parciaisInfo?.disponivel) {
            destacarRodadaEmAndamento(parciaisInfo.rodada);
        }
    } catch (error) {
        console.error("[PARTICIPANTE-RODADAS] ❌ Erro:", error);
        mostrarLoading(false);
        mostrarErro(error.message);
    }
}

window.inicializarRodadasParticipante = inicializarRodadasParticipante;

// =====================================================================
// BUSCAR STATUS DOS TIMES (ativo/inativo)
// =====================================================================
async function buscarTimesStatus(ligaId) {
    try {
        const response = await fetch(`/api/ligas/${ligaId}/times`);
        if (!response.ok) return {};

        const times = await response.json();
        const statusMap = {};

        (Array.isArray(times) ? times : []).forEach((time) => {
            const id = time.id || time.time_id;
            if (id) {
                statusMap[id] = {
                    ativo: time.ativo !== false,
                    rodada_desistencia: time.rodada_desistencia || null,
                    nome_time: time.nome_time || time.nome,
                    nome_cartola: time.nome_cartola,
                };
            }
        });

        return statusMap;
    } catch (error) {
        console.warn(
            "[PARTICIPANTE-RODADAS] ⚠️ Erro ao buscar status dos times:",
            error,
        );
        return {};
    }
}

// =====================================================================
// BUSCAR RODADA ATUAL
// =====================================================================
async function buscarRodadaAtual() {
    try {
        const response = await fetch("/api/cartola/mercado/status");
        if (response.ok) {
            const data = await response.json();
            rodadaAtualCartola = data.rodada_atual || 38;
            console.log(
                `[PARTICIPANTE-RODADAS] 📅 Rodada atual: ${rodadaAtualCartola}`,
            );
        }
    } catch (e) {
        console.warn(
            "[PARTICIPANTE-RODADAS] ⚠️ Não foi possível obter rodada atual",
        );
    }
}

// =====================================================================
// AGRUPAMENTO
// =====================================================================
function agruparRodadasPorNumero(rodadas, timesStatus = {}) {
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
            });
        }

        const rodadaData = rodadasMap.get(rodadaNum);

        // Enriquecer com status de ativo/inativo
        const timeId = r.timeId || r.time_id;
        const status = timesStatus[timeId];
        const participanteEnriquecido = {
            ...r,
            ativo: status ? status.ativo : true,
            rodada_desistencia: status ? status.rodada_desistencia : null,
        };

        rodadaData.participantes.push(participanteEnriquecido);

        if (String(timeId) === String(meuTimeId)) {
            rodadaData.meusPontos = r.pontos || 0;
            rodadaData.jogou = !r.rodadaNaoJogada;
            rodadaData.posicaoFinanceira = r.posicaoFinanceira;
        }
    });

    // ✅ v3.6: Calcular posição financeira considerando ATIVOS NAQUELA RODADA
    rodadasMap.forEach((rodadaData, rodadaNum) => {
        if (rodadaData.posicaoFinanceira == null && rodadaData.jogou) {
            // Filtrar participantes que eram ATIVOS nessa rodada específica
            const participantesAtivos = rodadaData.participantes.filter((p) => {
                if (p.ativo === false && p.rodada_desistencia) {
                    // Era ativo se rodada < rodada_desistencia
                    return rodadaNum < p.rodada_desistencia;
                }
                return p.ativo !== false;
            });

            // Ordenar por pontos (decrescente)
            const ordenados = [...participantesAtivos].sort(
                (a, b) => (b.pontos || 0) - (a.pontos || 0),
            );

            // Encontrar minha posição
            const meuIndex = ordenados.findIndex(
                (p) => String(p.timeId || p.time_id) === String(meuTimeId),
            );

            if (meuIndex >= 0) {
                rodadaData.posicaoFinanceira = meuIndex + 1;
                console.log(
                    `[PARTICIPANTE-RODADAS] 📊 Rodada ${rodadaNum}: posição calculada = ${meuIndex + 1}º (${participantesAtivos.length} ativos)`,
                );
            }
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
        console.error("[PARTICIPANTE-RODADAS] ❌ Container não encontrado");
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

    let classes = ["rodada-card-compacto"];

    if (isParcial) {
        classes.push("parcial", "em-andamento");
    } else if (isFuturo) {
        classes.push("futuro");
    } else if (!temDados && !isParcial) {
        classes.push("futuro");
    } else if (jogou) {
        classes.push("jogou");
        if (rodada.posicaoFinanceira) {
            const totalParticipantes = rodada.participantes.filter(
                (p) => p.ativo !== false,
            ).length;
            if (rodada.posicaoFinanceira === 1) {
                classes.push("mito");
            } else if (rodada.posicaoFinanceira === totalParticipantes) {
                classes.push("mico");
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

    return `
        <div class="${classes.join(" ")}" data-rodada="${numero}">
            ${badgeAoVivo}
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

    // Calcular estatísticas
    let totalMitos = 0;
    let totalMicos = 0;
    let ultimoMito = null;
    let ultimoMico = null;
    let rodadasJogadas = 0;

    rodadas.forEach((rodada) => {
        if (!rodada.jogou || !rodada.participantes?.length) return;

        rodadasJogadas++;

        // Filtrar participantes ativos na rodada
        const participantesAtivos = rodada.participantes.filter((p) => {
            if (p.ativo === false && p.rodada_desistencia) {
                return rodada.numero < p.rodada_desistencia;
            }
            return p.ativo !== false;
        });

        const totalParticipantes = participantesAtivos.length;

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

    console.log(
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
    console.log(
        `[PARTICIPANTE-RODADAS] 📌 Selecionando rodada ${numeroRodada} (parcial: ${isParcial})`,
    );

    rodadaSelecionada = numeroRodada;

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

        if (
            !dados ||
            !dados.participantes ||
            dados.participantes.length === 0
        ) {
            const rankingContainer = document.getElementById("rankingListPro");
            if (rankingContainer) {
                rankingContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">hourglass_empty</span>
                        <p>Aguardando pontuações...</p>
                        <p style="font-size: 12px; margin-top: 8px;">Os dados aparecerão quando os jogos começarem</p>
                    </div>
                `;
            }
            return;
        }

        const rodadaData = {
            numero: numeroRodada,
            participantes: dados.participantes,
            isParcial: true,
            atualizadoEm: dados.atualizadoEm,
        };

        const minhaPosicao = ParciaisModule.obterMinhaPosicaoParcial();
        if (minhaPosicao) {
            rodadaData.posicaoFinanceira = minhaPosicao.posicao;
            rodadaData.meusPontos = minhaPosicao.pontos;
        }

        // ✅ v3.5: Passar TODOS os inativos
        const inativos = dados.inativos || [];
        renderizarDetalhamentoRodada(rodadaData, true, inativos);

        if (resumo) {
            const horaAtualizacao = dados.atualizadoEm
                ? new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : "--:--";
            const infoInativos =
                inativos.length > 0
                    ? ` • ${inativos.length} inativo${inativos.length > 1 ? "s" : ""}`
                    : "";
            resumo.innerHTML = `${dados.totalTimes} participantes • Sua posição: ${minhaPosicao?.posicao || "-"}º${infoInativos}
                <span style="color: #6b7280; font-size: 11px;"> • Atualizado às ${horaAtualizacao}</span>`;
        }
    } catch (error) {
        console.error(
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
            const posicao = participante.posicao || index + 1;

            const valoresBanco = getBancoPorLiga(ligaId);
            const bonusOnus = valoresBanco[posicao] || 0;

            const bonusOnusAbs = Math.abs(bonusOnus);
            const valorFormatado = bonusOnusAbs.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

            const financeiroTexto =
                bonusOnus > 0
                    ? `+R$ ${valorFormatado}`
                    : bonusOnus < 0
                      ? `-R$ ${valorFormatado}`
                      : "R$ 0,00";

            const financeiroClass =
                bonusOnus > 0
                    ? "positivo"
                    : bonusOnus < 0
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

console.log(
    "[PARTICIPANTE-RODADAS] ✅ Módulo v3.6 carregado (inativos contextuais por rodada)",
);

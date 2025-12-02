// =====================================================================
// PARTICIPANTE-RODADAS.JS - v3.0 (Design Compacto)
// =====================================================================

console.log("[PARTICIPANTE-RODADAS] 📄 Carregando módulo v3.0...");

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
let rodadaAtualCartola = 38; // Será atualizado dinamicamente

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarRodadasParticipante({
    participante,
    ligaId: ligaIdParam,
    timeId,
}) {
    console.log("[PARTICIPANTE-RODADAS] 🚀 Inicializando v3.0...", {
        ligaIdParam,
        timeId,
    });

    ligaId = ligaIdParam;
    meuTimeId = timeId;

    // Mostrar loading
    mostrarLoading(true);

    try {
        // Buscar rodada atual do Cartola
        await buscarRodadaAtual();

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

        // Agrupar rodadas por número
        const rodadasAgrupadas = agruparRodadasPorNumero(rodadas);
        todasRodadasCache = rodadasAgrupadas;

        // Esconder loading
        mostrarLoading(false);

        // Verificar se tem dados
        if (rodadasAgrupadas.length === 0) {
            mostrarEstadoVazio(true);
            return;
        }

        // Renderizar grid compacto
        renderizarGridCompacto(rodadasAgrupadas);
    } catch (error) {
        console.error("[PARTICIPANTE-RODADAS] ❌ Erro:", error);
        mostrarLoading(false);
        mostrarErro(error.message);
    }
}

// Também expor no window para compatibilidade
window.inicializarRodadasParticipante = inicializarRodadasParticipante;

// =====================================================================
// BUSCAR RODADA ATUAL
// =====================================================================
async function buscarRodadaAtual() {
    try {
        const response = await fetch("/api/cartola/mercado-status");
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
            });
        }

        const rodadaData = rodadasMap.get(rodadaNum);
        rodadaData.participantes.push(r);

        // Se for minha rodada
        if (String(r.timeId) === String(meuTimeId)) {
            rodadaData.meusPontos = r.pontos || 0;
            rodadaData.jogou = !r.rodadaNaoJogada;
            rodadaData.posicaoFinanceira = r.posicaoFinanceira;
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

    // Mapear rodadas existentes por número
    const rodadasMap = new Map();
    rodadas.forEach((r) => rodadasMap.set(r.numero, r));

    // Gerar cards para todas as 38 rodadas
    let html = "";
    for (let i = 1; i <= 38; i++) {
        const rodada = rodadasMap.get(i);
        html += criarCardCompacto(i, rodada);
    }

    container.innerHTML = html;

    // Mostrar botão de jogadores
    const btnContainer = document.getElementById("btnVerJogadores");
    if (btnContainer) {
        btnContainer.style.display = "block";
    }

    // Adicionar event listeners
    container
        .querySelectorAll(".rodada-card-compacto:not(.futuro)")
        .forEach((card) => {
            card.addEventListener("click", () => {
                const rodadaNum = parseInt(card.dataset.rodada);
                selecionarRodada(rodadaNum);
            });
        });
}

function criarCardCompacto(numero, rodada) {
    const isFuturo = numero > rodadaAtualCartola;
    const temDados = rodada && rodada.participantes.length > 0;
    const jogou = rodada?.jogou || false;
    const pontos = rodada?.meusPontos;

    // Determinar classes
    let classes = ["rodada-card-compacto"];

    if (isFuturo) {
        classes.push("futuro");
    } else if (!temDados) {
        classes.push("futuro"); // Rodada passada sem dados = tratar como indisponível
    } else if (jogou) {
        classes.push("jogou");

        // Verificar se é mito ou mico
        if (rodada.posicaoFinanceira) {
            const totalParticipantes = rodada.participantes.length;
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
    if (temDados && jogou && pontos !== null && pontos > 0) {
        pontosTexto = pontos.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    } else if (temDados && !jogou) {
        pontosTexto = "N/J";
    }

    return `
        <div class="${classes.join(" ")}" data-rodada="${numero}">
            <span class="card-numero">${numero}</span>
            ${pontosTexto ? `<span class="card-pontos">${pontosTexto}</span>` : ""}
        </div>
    `;
}

// =====================================================================
// SELEÇÃO DE RODADA
// =====================================================================
function selecionarRodada(numeroRodada) {
    console.log(
        `[PARTICIPANTE-RODADAS] 📌 Selecionando rodada ${numeroRodada}`,
    );

    rodadaSelecionada = numeroRodada;

    // Atualizar visual dos cards
    document.querySelectorAll(".rodada-card-compacto").forEach((card) => {
        card.classList.remove("selected");
    });

    const cardSelecionado = document.querySelector(
        `.rodada-card-compacto[data-rodada="${numeroRodada}"]`,
    );
    if (cardSelecionado) {
        cardSelecionado.classList.add("selected");
    }

    // Atualizar botão de jogadores
    const btnTexto = document.getElementById("btnJogadoresTexto");
    if (btnTexto) {
        btnTexto.textContent = `Ver Meus Jogadores da Rodada ${numeroRodada}`;
    }

    // Buscar dados da rodada
    const rodadaData = todasRodadasCache.find((r) => r.numero === numeroRodada);
    if (!rodadaData || rodadaData.participantes.length === 0) {
        mostrarToast("Dados desta rodada não disponíveis");
        return;
    }

    // Renderizar detalhamento
    renderizarDetalhamentoRodada(rodadaData);

    // Mostrar seção de detalhamento
    const detalhamento = document.getElementById("rodadaDetalhamento");
    if (detalhamento) {
        detalhamento.style.display = "block";
        setTimeout(() => {
            detalhamento.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    }
}

window.selecionarRodada = selecionarRodada;

// =====================================================================
// DETALHAMENTO DA RODADA
// =====================================================================
function renderizarDetalhamentoRodada(rodadaData) {
    const titulo = document.getElementById("rodadaTitulo");
    if (titulo) {
        titulo.textContent = `Rodada ${rodadaData.numero}`;
    }

    // Resumo
    const resumo = document.getElementById("rodadaResumo");
    if (resumo) {
        const total = rodadaData.participantes.length;
        const minhaPosicao = rodadaData.posicaoFinanceira || "-";
        resumo.textContent = `${total} participantes • Sua posição: ${minhaPosicao}º`;
    }

    // Ordenar participantes por pontuação
    const participantesOrdenados = [...rodadaData.participantes].sort(
        (a, b) => (b.pontos || 0) - (a.pontos || 0),
    );

    const totalParticipantes = participantesOrdenados.length;
    const container = document.getElementById("rankingListPro");

    if (!container) return;

    const html = participantesOrdenados
        .map((participante, index) => {
            const isMeuTime = String(participante.timeId) === String(meuTimeId);
            const posicao = index + 1;

            // Calcular financeiro
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

            // Classe da posição
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

            return `
                <div class="ranking-item-pro ${isMeuTime ? "meu-time" : ""}">
                    <div class="posicao-badge-pro ${posicaoClass}">${posicao}º</div>
                    <div class="ranking-info-pro">
                        <div class="ranking-nome-time">${nomeTime}</div>
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

    container.innerHTML =
        html ||
        '<div style="text-align: center; padding: 40px; color: #6b7280;">Nenhum dado disponível</div>';
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
// TOAST - FUNCIONALIDADE EM DESENVOLVIMENTO
// =====================================================================
window.mostrarEmDesenvolvimento = function (funcionalidade) {
    const toast = document.getElementById("toastDesenvolvimento");
    const mensagem = document.getElementById("toastMensagem");

    if (toast && mensagem) {
        mensagem.textContent = `${funcionalidade} em desenvolvimento`;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
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

console.log("[PARTICIPANTE-RODADAS] ✅ Módulo v3.0 carregado");

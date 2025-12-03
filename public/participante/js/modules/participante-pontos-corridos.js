// PARTICIPANTE PONTOS CORRIDOS - v4.0
// Apenas lógica - templates em /participante/html/pontos-corridos.html

const estadoPC = {
    ligaId: null,
    timeId: null,
    rodadaAtual: 1,
    rodadaSelecionada: 1,
    totalRodadas: 31,
    dados: [],
    viewMode: "confrontos",
};

// ============================================
// INICIALIZAÇÃO
// ============================================

export async function inicializarPontosCorridosParticipante(params = {}) {
    console.log("[PONTOS-CORRIDOS] 🚀 Inicializando...", params);

    const participante = params.participante || window.participanteData || {};
    estadoPC.ligaId = params.ligaId || participante.ligaId;
    estadoPC.timeId = params.timeId || participante.timeId;

    mostrarLoading();

    try {
        const dados = await carregarDados();
        estadoPC.dados = dados;

        if (dados.length > 0) {
            const rodadasComConfrontos = dados.filter(
                (r) => r.confrontos?.length > 0,
            );
            estadoPC.totalRodadas = dados.length;
            estadoPC.rodadaAtual =
                rodadasComConfrontos.length > 0
                    ? Math.max(...rodadasComConfrontos.map((r) => r.rodada))
                    : 1;
            estadoPC.rodadaSelecionada = estadoPC.rodadaAtual;
        }

        console.log(`[PONTOS-CORRIDOS] ✅ ${dados.length} rodadas carregadas`);
        renderizarInterface();
    } catch (error) {
        console.error("[PONTOS-CORRIDOS] ❌ Erro:", error);
        mostrarErro(error.message);
    }
}

async function carregarDados() {
    const response = await fetch(`/api/pontos-corridos/${estadoPC.ligaId}`);
    if (!response.ok) throw new Error("Falha ao carregar dados");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

// ============================================
// CONTROLE DE ESTADOS
// ============================================

function mostrarLoading() {
    toggleElemento("pc-loading", true);
    toggleElemento("pc-error", false);
    toggleElemento("pc-content", false);
}

function mostrarErro(msg) {
    toggleElemento("pc-loading", false);
    toggleElemento("pc-error", true);
    toggleElemento("pc-content", false);
    setTexto("pc-error-msg", msg);
}

function mostrarConteudo() {
    toggleElemento("pc-loading", false);
    toggleElemento("pc-error", false);
    toggleElemento("pc-content", true);
}

function toggleElemento(id, mostrar) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !mostrar);
}

function setTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarInterface() {
    mostrarConteudo();
    atualizarHeader();
    atualizarSeletorRodadas();
    atualizarProgresso();
    atualizarToggle();
    renderizarView();
    scrollParaRodadaSelecionada();
}

function atualizarHeader() {
    const { dados, timeId } = estadoPC;
    let posicao = "-";

    const ultimaRodada = dados.filter((r) => r.classificacao?.length > 0).pop();
    if (ultimaRodada?.classificacao) {
        const meuTime = ultimaRodada.classificacao.find(
            (t) => (t.timeId || t.time_id || t.id) == timeId,
        );
        if (meuTime) {
            posicao =
                meuTime.posicao ||
                ultimaRodada.classificacao.indexOf(meuTime) + 1;
        }
    }

    setTexto("pc-posicao-badge", `${posicao}º`);
}

function atualizarSeletorRodadas() {
    const { dados, rodadaSelecionada, rodadaAtual, totalRodadas } = estadoPC;
    const container = document.getElementById("pc-seletor-rodadas");
    if (!container) return;

    const rodadasDisputadas = dados.filter(
        (r) => r.confrontos?.length > 0,
    ).length;
    setTexto(
        "pc-rodadas-info",
        `${rodadasDisputadas} de ${totalRodadas} rodadas disputadas`,
    );

    container.innerHTML = "";

    for (let i = 1; i <= totalRodadas; i++) {
        const rodadaData = dados.find((r) => r.rodada === i);
        const temDados = rodadaData?.confrontos?.length > 0;
        const isAtual = i === rodadaAtual;
        const isSelecionada = i === rodadaSelecionada;

        const btn = document.createElement("button");
        btn.className = buildClassesBotaoRodada(
            isSelecionada,
            isAtual,
            temDados,
        );
        btn.disabled = !temDados;
        btn.onclick = () => selecionarRodada(i);

        btn.innerHTML = `
            <span class="font-bold text-sm ${isSelecionada ? "text-white" : isAtual ? "text-green-400" : "text-white"}">${i}</span>
            <span class="${isSelecionada ? "text-white/80" : isAtual ? "text-green-400/80" : "text-white/50"}">RODADA</span>
            ${isAtual && !isSelecionada ? '<span class="w-1.5 h-1.5 bg-green-500 rounded-full mt-1 animate-pulse"></span>' : ""}
        `;

        container.appendChild(btn);
    }
}

function buildClassesBotaoRodada(selecionada, atual, temDados) {
    let classes =
        "flex flex-col items-center justify-center rounded-lg px-4 py-2 text-[10px] flex-shrink-0 cursor-pointer transition-all ";

    if (selecionada) {
        classes += "bg-primary border border-primary/70 scale-105";
    } else if (atual) {
        classes += "bg-green-500/20 border border-green-500";
    } else if (temDados) {
        classes +=
            "bg-surface-dark border border-zinc-700 hover:border-zinc-500";
    } else {
        classes +=
            "bg-surface-dark/50 border border-zinc-800 opacity-50 cursor-not-allowed";
    }

    return classes;
}

function atualizarProgresso() {
    const { dados, totalRodadas } = estadoPC;
    const disputadas = dados.filter((r) => r.confrontos?.length > 0).length;
    const progresso = totalRodadas > 0 ? (disputadas / totalRodadas) * 100 : 0;

    const bar = document.getElementById("pc-progress-bar");
    if (bar) bar.style.width = `${progresso.toFixed(1)}%`;
}

function atualizarToggle() {
    const { viewMode } = estadoPC;
    const btnConfrontos = document.getElementById("pc-btn-confrontos");
    const btnClassificacao = document.getElementById("pc-btn-classificacao");

    if (btnConfrontos) {
        btnConfrontos.className = `flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${viewMode === "confrontos" ? "bg-primary text-white" : "text-white/70 hover:bg-zinc-800"}`;
    }
    if (btnClassificacao) {
        btnClassificacao.className = `flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${viewMode === "classificacao" ? "bg-primary text-white" : "text-white/70 hover:bg-zinc-800"}`;
    }
}

function renderizarView() {
    const { viewMode } = estadoPC;

    toggleElemento("pc-view-confrontos", viewMode === "confrontos");
    toggleElemento("pc-view-classificacao", viewMode === "classificacao");
    toggleElemento("pc-sem-dados", false);

    if (viewMode === "confrontos") {
        renderizarConfrontos();
    } else {
        renderizarClassificacao();
    }
}

// ============================================
// CONFRONTOS
// ============================================

function renderizarConfrontos() {
    const { dados, rodadaSelecionada, rodadaAtual, timeId } = estadoPC;
    const container = document.getElementById("pc-lista-confrontos");
    if (!container) return;

    const rodadaData = dados.find((r) => r.rodada === rodadaSelecionada);
    if (!rodadaData) {
        mostrarSemDados("Rodada não encontrada");
        return;
    }

    const confrontos = processarConfrontos(rodadaData);
    if (confrontos.length === 0) {
        mostrarSemDados("Nenhum confronto disponível");
        return;
    }

    // Atualizar header da rodada
    const rodadaBrasileirao = rodadaSelecionada + 6;
    const isEmAndamento = rodadaSelecionada === rodadaAtual;

    setTexto("pc-rodada-titulo", `${rodadaSelecionada}ª Rodada da Liga`);
    setTexto(
        "pc-rodada-subtitulo",
        `${rodadaBrasileirao}ª Rodada do Brasileirão`,
    );

    const statusEl = document.getElementById("pc-rodada-status");
    if (statusEl) {
        statusEl.className = `flex items-center space-x-1.5 ${isEmAndamento ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"} px-2.5 py-1.5 rounded-full text-[10px] font-semibold`;
        statusEl.innerHTML = `
            <span class="w-1.5 h-1.5 ${isEmAndamento ? "bg-yellow-500 animate-pulse" : "bg-green-500"} rounded-full"></span>
            <span>${isEmAndamento ? "EM ANDAMENTO" : "FINALIZADA"}</span>
        `;
    }

    // Renderizar confrontos
    container.innerHTML = confrontos
        .map((c) => buildLinhaConfronto(c, timeId))
        .join("");
}

function processarConfrontos(rodadaData) {
    let confrontos = [];

    if (
        Array.isArray(rodadaData.confrontos) &&
        rodadaData.confrontos.length > 0
    ) {
        const primeiro = rodadaData.confrontos[0];
        if (primeiro?.jogos) {
            confrontos = rodadaData.confrontos.flatMap((r) => r.jogos || []);
        } else if (primeiro?.time1 || primeiro?.timeA) {
            confrontos = rodadaData.confrontos.map((c) => ({
                time1: c.time1 || c.timeA,
                time2: c.time2 || c.timeB,
                diferenca:
                    c.diferenca ??
                    (c.pontos1 != null && c.pontos2 != null
                        ? Math.abs(c.pontos1 - c.pontos2)
                        : null),
                valor: c.valor || 0,
            }));
        }
    }

    return confrontos.filter((c) => c?.time1 && c?.time2);
}

function buildLinhaConfronto(confronto, meuTimeId) {
    const { time1, time2, diferenca, valor, tipo } = confronto;

    const t1Id = time1.id || time1.timeId || time1.time_id;
    const t2Id = time2.id || time2.timeId || time2.time_id;
    const isMeu1 = t1Id == meuTimeId;
    const isMeu2 = t2Id == meuTimeId;

    const p1 = time1.pontos ?? null;
    const p2 = time2.pontos ?? null;

    // Determinar vencedor: 0=empate, 1=time1 venceu, 2=time2 venceu
    let vencedor = 0;
    let tipoResultado = "empate";
    if (p1 !== null && p2 !== null) {
        const diff = Math.abs(p1 - p2);
        if (diff <= 0.3) {
            vencedor = 0;
            tipoResultado = "empate";
        } else if (diff >= 50) {
            vencedor = p1 > p2 ? 1 : 2;
            tipoResultado = "goleada";
        } else {
            vencedor = p1 > p2 ? 1 : 2;
            tipoResultado = "vitoria";
        }
    }

    // Calcular valor financeiro
    const valorFinanceiro =
        tipoResultado === "goleada" ? 7 : tipoResultado === "vitoria" ? 5 : 3;

    const nome1 =
        time1.nome || time1.nome_time || time1.nome_cartola || "Time 1";
    const nome2 =
        time2.nome || time2.nome_time || time2.nome_cartola || "Time 2";
    const esc1 =
        time1.escudo ||
        time1.url_escudo_png ||
        time1.foto_time ||
        "/assets/escudo-placeholder.png";
    const esc2 =
        time2.escudo ||
        time2.url_escudo_png ||
        time2.foto_time ||
        "/assets/escudo-placeholder.png";

    const cor1 =
        vencedor === 1
            ? "text-green-500"
            : vencedor === 2
              ? "text-red-500"
              : "text-yellow-500";
    const cor2 =
        vencedor === 2
            ? "text-green-500"
            : vencedor === 1
              ? "text-red-500"
              : "text-yellow-500";
    const bg = isMeu1 || isMeu2 ? "bg-primary/5" : "";

    // Labels para o modal
    const label1 =
        vencedor === 1 ? "Crédito" : vencedor === 2 ? "Débito" : "Empate";
    const label2 =
        vencedor === 2 ? "Crédito" : vencedor === 1 ? "Débito" : "Empate";
    const sinal1 = vencedor === 1 ? "+" : vencedor === 2 ? "-" : "";
    const sinal2 = vencedor === 2 ? "+" : vencedor === 1 ? "-" : "";

    // Mini-modal time 1
    const modal1 =
        p1 !== null
            ? `
        <div class="group relative inline-flex">
            <button class="material-symbols-outlined text-base ${cor1}/80" style="font-size:16px">monetization_on</button>
            <div class="modal hidden opacity-0 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-primary text-white text-xs font-bold px-2.5 py-1.5 rounded-md shadow-lg z-20">
                <span class="font-normal">${label1}:</span> ${sinal1}R$ ${valorFinanceiro.toFixed(2)}
                <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-primary"></div>
            </div>
        </div>
    `
            : "";

    // Mini-modal time 2
    const modal2 =
        p2 !== null
            ? `
        <div class="group relative inline-flex">
            <button class="material-symbols-outlined text-base ${cor2}/80" style="font-size:16px">monetization_on</button>
            <div class="modal hidden opacity-0 transition-opacity absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-max bg-primary text-white text-xs font-bold px-2.5 py-1.5 rounded-md shadow-lg z-20">
                <span class="font-normal">${label2}:</span> ${sinal2}R$ ${valorFinanceiro.toFixed(2)}
                <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-primary"></div>
            </div>
        </div>
    `
            : "";

    return `
        <div class="py-3 px-3 flex items-center justify-between ${bg}">
            <div class="flex items-center min-w-0 flex-1 ${vencedor === 2 ? "opacity-60" : ""}">
                <img src="${esc1}" class="w-8 h-8 rounded-full mr-2.5 shrink-0 bg-zinc-700 object-cover" onerror="this.src='/assets/escudo-placeholder.png'">
                <div class="min-w-0">
                    <p class="font-semibold text-sm truncate ${isMeu1 ? "text-primary" : "text-white"}">${nome1}</p>
                    <div class="flex items-center space-x-1.5">
                        <p class="text-sm font-bold ${cor1}">${p1 !== null ? p1.toFixed(1) : "-"}</p>
                        ${modal1}
                    </div>
                </div>
            </div>
            <span class="text-sm text-white/30 mx-3 shrink-0">x</span>
            <div class="flex items-center min-w-0 flex-1 justify-end ${vencedor === 1 ? "opacity-60" : ""}">
                <div class="min-w-0 text-right">
                    <p class="font-semibold text-sm truncate ${isMeu2 ? "text-primary" : "text-white"}">${nome2}</p>
                    <div class="flex items-center justify-end space-x-1.5">
                        <p class="text-sm font-bold ${cor2}">${p2 !== null ? p2.toFixed(1) : "-"}</p>
                        ${modal2}
                    </div>
                </div>
                <img src="${esc2}" class="w-8 h-8 rounded-full ml-2.5 shrink-0 bg-zinc-700 object-cover" onerror="this.src='/assets/escudo-placeholder.png'">
            </div>
            <div class="w-16 text-right ml-3 shrink-0">
                <p class="font-bold text-sm text-white">${diferenca != null ? diferenca.toFixed(1) : "-"}</p>
            </div>
        </div>
    `;
}

// ============================================
// CLASSIFICAÇÃO
// ============================================

function renderizarClassificacao() {
    const { dados, timeId } = estadoPC;
    const container = document.getElementById("pc-lista-classificacao");
    if (!container) return;

    const ultimaRodada = dados.filter((r) => r.classificacao?.length > 0).pop();
    if (!ultimaRodada?.classificacao?.length) {
        mostrarSemDados("Classificação não disponível");
        return;
    }

    setTexto(
        "pc-classificacao-info",
        `Atualizada até a ${ultimaRodada.rodada}ª rodada`,
    );

    const total = ultimaRodada.classificacao.length;
    container.innerHTML = ultimaRodada.classificacao
        .map((t, i) => buildLinhaClassificacao(t, i + 1, total, timeId))
        .join("");
}

function buildLinhaClassificacao(time, pos, total, meuTimeId) {
    const tId = time.timeId || time.time_id || time.id;
    const isMeu = tId == meuTimeId;
    const zona = getZona(pos, total);

    const nome = time.nome || time.nome_time || "Time";
    const esc =
        time.escudo ||
        time.url_escudo_png ||
        time.foto_time ||
        "/assets/escudo-placeholder.png";
    const sg = time.saldo_gols ?? time.saldoGols ?? 0;

    return `
        <div class="flex items-center px-3 py-2.5 ${isMeu ? "bg-primary/10" : ""}">
            <div class="w-8 flex items-center justify-center">
                ${
                    zona.badge
                        ? `<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${zona.bg}">${pos}</div>`
                        : `<span class="text-xs font-bold text-white/70">${pos}</span>`
                }
            </div>
            <div class="flex-1 flex items-center gap-2 pl-2 min-w-0">
                <img src="${esc}" class="w-6 h-6 rounded-full bg-zinc-700 object-cover shrink-0" onerror="this.src='/assets/escudo-placeholder.png'">
                <span class="text-xs font-medium truncate ${isMeu ? "text-primary font-bold" : "text-white"}">${nome}</span>
            </div>
            <div class="w-7 text-center text-white/60 text-xs">${time.jogos || 0}</div>
            <div class="w-7 text-center text-green-400 text-xs">${time.vitorias || 0}</div>
            <div class="w-7 text-center text-yellow-400 text-xs">${time.empates || 0}</div>
            <div class="w-7 text-center text-red-400 text-xs">${time.derrotas || 0}</div>
            <div class="w-9 text-center text-white/60 text-xs">${Math.round(sg)}</div>
            <div class="w-10 text-center text-white font-bold text-sm">${time.pontos || 0}</div>
        </div>
    `;
}

function getZona(pos, total) {
    if (pos === 1) return { badge: true, bg: "bg-yellow-500" };
    if (pos === 2) return { badge: true, bg: "bg-gray-400" };
    if (pos === 3) return { badge: true, bg: "bg-amber-600" };
    if (pos <= Math.ceil(total * 0.25))
        return { badge: true, bg: "bg-green-500" };
    if (pos > Math.floor(total * 0.85))
        return { badge: true, bg: "bg-red-500" };
    return { badge: false };
}

// ============================================
// UTILITÁRIOS
// ============================================

function mostrarSemDados(msg) {
    toggleElemento("pc-view-confrontos", false);
    toggleElemento("pc-view-classificacao", false);
    toggleElemento("pc-sem-dados", true);
    setTexto("pc-sem-dados-msg", msg);
}

function scrollParaRodadaSelecionada() {
    setTimeout(() => {
        const container = document.querySelector(
            "#pc-seletor-rodadas",
        )?.parentElement;
        const selecionado = document.querySelector(
            "#pc-seletor-rodadas .scale-105",
        );
        if (container && selecionado) {
            const cRect = container.getBoundingClientRect();
            const sRect = selecionado.getBoundingClientRect();
            container.scrollBy({
                left:
                    sRect.left - cRect.left - cRect.width / 2 + sRect.width / 2,
                behavior: "smooth",
            });
        }
    }, 100);
}

function selecionarRodada(rodada) {
    estadoPC.rodadaSelecionada = rodada;
    estadoPC.viewMode = "confrontos";
    renderizarInterface();
}

// ============================================
// FUNÇÕES GLOBAIS
// ============================================

window.trocarViewPontosCorridos = function (view) {
    estadoPC.viewMode = view;
    atualizarToggle();
    renderizarView();
};

window.selecionarRodadaPontosCorridos = selecionarRodada;

window.recarregarPontosCorridos = function () {
    inicializarPontosCorridosParticipante({
        ligaId: estadoPC.ligaId,
        timeId: estadoPC.timeId,
    });
};

window.inicializarPontosCorridosParticipante =
    inicializarPontosCorridosParticipante;

console.log("[PONTOS-CORRIDOS] Módulo v4.0 carregado (estrutura limpa)");

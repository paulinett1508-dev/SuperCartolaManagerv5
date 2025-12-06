// PARTICIPANTE PONTOS CORRIDOS - v4.3
// ✅ v4.1: Correção do status EM ANDAMENTO/FINALIZADA
// ✅ v4.2: Visualização melhorada (nome time + cartoleiro como no Ranking)
// ✅ v4.3: Celebração do campeão quando liga encerra

const estadoPC = {
    ligaId: null,
    timeId: null,
    rodadaAtual: 1,
    rodadaSelecionada: 1,
    totalRodadas: 31,
    dados: [],
    viewMode: "confrontos",
    mercadoRodada: 1,
    mercadoAberto: true,
    ligaEncerrou: false, // ✅ v4.3
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
        await buscarStatusMercado();

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

            // ✅ v4.3: Detectar se liga encerrou
            const ultimaRodadaPossivel = estadoPC.totalRodadas;
            const ultimaRodadaDisputada = dados.find(
                (r) => r.rodada === ultimaRodadaPossivel,
            );
            estadoPC.ligaEncerrou =
                ultimaRodadaDisputada?.confrontos?.length > 0 &&
                ultimaRodadaDisputada?.classificacao?.length > 0;
        }

        console.log(`[PONTOS-CORRIDOS] ✅ ${dados.length} rodadas carregadas`);
        console.log(
            `[PONTOS-CORRIDOS] 📊 Mercado: rodada ${estadoPC.mercadoRodada}, aberto: ${estadoPC.mercadoAberto}`,
        );
        console.log(
            `[PONTOS-CORRIDOS] 🏆 Liga encerrou: ${estadoPC.ligaEncerrou}`,
        );
        renderizarInterface();
    } catch (error) {
        console.error("[PONTOS-CORRIDOS] ❌ Erro:", error);
        mostrarErro(error.message);
    }
}

async function buscarStatusMercado() {
    try {
        const response = await fetch("/api/cartola/mercado/status");
        if (response.ok) {
            const status = await response.json();
            estadoPC.mercadoRodada = status.rodada_atual || 1;
            estadoPC.mercadoAberto = status.status_mercado === 1;
            console.log("[PONTOS-CORRIDOS] 📡 Status mercado:", {
                rodada: estadoPC.mercadoRodada,
                aberto: estadoPC.mercadoAberto,
            });
        }
    } catch (e) {
        console.warn("[PONTOS-CORRIDOS] ⚠️ Falha ao buscar status do mercado");
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
    renderizarBannerCampeao(); // ✅ v4.3
    atualizarHeader();
    atualizarSeletorRodadas();
    atualizarProgresso();
    atualizarToggle();
    renderizarView();
    scrollParaRodadaSelecionada();
}

// ✅ v4.3: Banner de celebração do campeão
function renderizarBannerCampeao() {
    const container = document.getElementById("pc-banner-campeao");

    if (!estadoPC.ligaEncerrou) {
        if (container) container.innerHTML = "";
        return;
    }

    // Buscar campeão (1º da classificação da última rodada)
    const ultimaRodada = estadoPC.dados.find(
        (r) => r.rodada === estadoPC.totalRodadas,
    );
    if (!ultimaRodada?.classificacao?.length) {
        if (container) container.innerHTML = "";
        return;
    }

    const campeao = ultimaRodada.classificacao[0];
    const nomeCampeao = campeao.nome || campeao.nome_time || "Campeão";
    const escudoCampeao =
        campeao.escudo ||
        campeao.url_escudo_png ||
        campeao.foto_time ||
        "/assets/escudo-placeholder.png";
    const pontosCampeao = campeao.pontos || 0;
    const vitoriasCampeao = campeao.vitorias || 0;
    const meuTimeId = estadoPC.timeId;
    const campeaoId = campeao.timeId || campeao.time_id || campeao.id;
    const souCampeao = String(campeaoId) === String(meuTimeId);

    // Se não tiver container, criar um antes do seletor
    if (!container) {
        const seletorContainer = document
            .getElementById("pc-seletor-rodadas")
            ?.closest(".overflow-x-auto")?.parentElement;
        if (seletorContainer) {
            const bannerDiv = document.createElement("div");
            bannerDiv.id = "pc-banner-campeao";
            seletorContainer.parentElement.insertBefore(
                bannerDiv,
                seletorContainer,
            );
        }
    }

    const bannerEl = document.getElementById("pc-banner-campeao");
    if (!bannerEl) return;

    bannerEl.innerHTML = `
        <div class="campeao-banner mx-4 mb-4 rounded-2xl overflow-hidden relative">
            <!-- Background animado -->
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-600/20 via-yellow-500/30 to-yellow-600/20"></div>
            <div class="confetti-bg absolute inset-0 opacity-30"></div>

            <!-- Conteúdo -->
            <div class="relative z-10 p-4">
                <!-- Header -->
                <div class="text-center mb-3">
                    <div class="text-3xl mb-1 animate-bounce-slow">🏆</div>
                    <h3 class="text-yellow-400 font-bold text-sm tracking-wider">CAMPEÃO DA LIGA!</h3>
                    <p class="text-white/50 text-[10px]">Pontos Corridos 2025</p>
                </div>

                <!-- Card do campeão -->
                <div class="flex items-center justify-center gap-4 bg-black/30 rounded-xl p-3">
                    <div class="relative">
                        <img src="${escudoCampeao}" class="w-16 h-16 rounded-full border-2 border-yellow-500 shadow-lg shadow-yellow-500/30" onerror="this.src='/assets/escudo-placeholder.png'">
                        <span class="absolute -bottom-1 -right-1 text-xl">🥇</span>
                    </div>
                    <div class="text-left">
                        <p class="font-bold text-white text-base ${souCampeao ? "text-yellow-400" : ""}">${nomeCampeao}</p>
                        ${souCampeao ? '<p class="text-yellow-400 text-xs font-semibold">🎉 Você é o campeão!</p>' : ""}
                        <div class="flex gap-3 mt-1">
                            <div class="text-center">
                                <span class="text-yellow-400 font-bold text-lg">${pontosCampeao}</span>
                                <span class="text-white/50 text-[9px] block">PTS</span>
                            </div>
                            <div class="text-center">
                                <span class="text-green-400 font-bold text-lg">${vitoriasCampeao}</span>
                                <span class="text-white/50 text-[9px] block">V</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${
                    souCampeao
                        ? `
                <div class="text-center mt-3">
                    <p class="text-white/80 text-xs">🎉 Parabéns pela conquista! 🎉</p>
                </div>
                `
                        : ""
                }
            </div>
        </div>

        <style>
            .campeao-banner {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                border: 1px solid rgba(255, 215, 0, 0.3);
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.15);
            }
            .confetti-bg {
                background-image: 
                    radial-gradient(circle at 10% 20%, #ffd700 1px, transparent 1px),
                    radial-gradient(circle at 90% 30%, #ff6b6b 1px, transparent 1px),
                    radial-gradient(circle at 30% 80%, #4ecdc4 1px, transparent 1px),
                    radial-gradient(circle at 70% 60%, #fff 1px, transparent 1px),
                    radial-gradient(circle at 50% 40%, #ffd700 1px, transparent 1px);
                background-size: 80px 80px;
                animation: confettiMove 4s ease-in-out infinite;
            }
            @keyframes confettiMove {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            @keyframes bounce-slow {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
            }
            .animate-bounce-slow {
                animation: bounce-slow 2s ease-in-out infinite;
            }
        </style>
    `;
}

function atualizarHeader() {
    const { dados, timeId, ligaEncerrou } = estadoPC;
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

    // ✅ v4.3: Badge especial se for campeão
    const badgeEl = document.getElementById("pc-posicao-badge");
    if (badgeEl) {
        if (ligaEncerrou && posicao === 1) {
            badgeEl.textContent = "🏆";
            badgeEl.classList.add("text-yellow-400");
        } else {
            badgeEl.textContent = `${posicao}º`;
            badgeEl.classList.remove("text-yellow-400");
        }
    }
}

function atualizarSeletorRodadas() {
    const {
        dados,
        rodadaSelecionada,
        rodadaAtual,
        totalRodadas,
        ligaEncerrou,
    } = estadoPC;
    const container = document.getElementById("pc-seletor-rodadas");
    if (!container) return;

    const rodadasDisputadas = dados.filter(
        (r) => r.confrontos?.length > 0,
    ).length;

    // ✅ v4.3: Texto especial se encerrou
    const infoEl = document.getElementById("pc-rodadas-info");
    if (infoEl) {
        if (ligaEncerrou) {
            infoEl.innerHTML = `<span class="text-yellow-400">🏆 Liga Encerrada!</span> ${rodadasDisputadas} rodadas`;
        } else {
            infoEl.textContent = `${rodadasDisputadas} de ${totalRodadas} rodadas disputadas`;
        }
    }

    container.innerHTML = "";

    for (let i = 1; i <= totalRodadas; i++) {
        const rodadaData = dados.find((r) => r.rodada === i);
        const temDados = rodadaData?.confrontos?.length > 0;
        const isAtual = i === rodadaAtual;
        const isSelecionada = i === rodadaSelecionada;
        const isUltima = i === totalRodadas && ligaEncerrou;

        const btn = document.createElement("button");
        btn.className = buildClassesBotaoRodada(
            isSelecionada,
            isAtual,
            temDados,
            isUltima,
        );
        btn.disabled = !temDados;
        btn.onclick = () => selecionarRodada(i);

        btn.innerHTML = `
            <span class="font-bold text-sm ${isSelecionada ? "text-white" : isAtual ? "text-green-400" : isUltima ? "text-yellow-400" : "text-white"}">${i}</span>
            <span class="${isSelecionada ? "text-white/80" : isAtual ? "text-green-400/80" : isUltima ? "text-yellow-400/80" : "text-white/50"}">${isUltima ? "FINAL" : "RODADA"}</span>
            ${isAtual && !isSelecionada && !ligaEncerrou ? '<span class="w-1.5 h-1.5 bg-green-500 rounded-full mt-1 animate-pulse"></span>' : ""}
            ${isUltima ? '<span class="text-[8px] mt-0.5">🏆</span>' : ""}
        `;

        container.appendChild(btn);
    }
}

function buildClassesBotaoRodada(
    selecionada,
    atual,
    temDados,
    isUltima = false,
) {
    let classes =
        "flex flex-col items-center justify-center rounded-lg px-4 py-2 text-[10px] flex-shrink-0 cursor-pointer transition-all ";

    if (selecionada) {
        classes += "bg-primary border border-primary/70 scale-105";
    } else if (isUltima && temDados) {
        classes += "bg-yellow-500/20 border border-yellow-500";
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
    const { dados, totalRodadas, ligaEncerrou } = estadoPC;
    const disputadas = dados.filter((r) => r.confrontos?.length > 0).length;
    const progresso = totalRodadas > 0 ? (disputadas / totalRodadas) * 100 : 0;

    const bar = document.getElementById("pc-progress-bar");
    if (bar) {
        bar.style.width = `${progresso.toFixed(1)}%`;
        // ✅ v4.3: Cor dourada se encerrou
        if (ligaEncerrou) {
            bar.classList.add(
                "bg-gradient-to-r",
                "from-yellow-500",
                "to-yellow-400",
            );
            bar.classList.remove("bg-primary");
        }
    }
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
    const {
        dados,
        rodadaSelecionada,
        timeId,
        mercadoRodada,
        mercadoAberto,
        ligaEncerrou,
        totalRodadas,
    } = estadoPC;
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

    // Header da rodada
    const rodadaBrasileirao = rodadaSelecionada + 6;
    const rodadaBrasileiraoSelecionada = rodadaSelecionada + 6;

    // ✅ v4.3: Se é a última rodada e liga encerrou, mostrar FINALIZADA
    let isEmAndamento = false;
    if (ligaEncerrou) {
        isEmAndamento = false;
    } else if (mercadoAberto) {
        isEmAndamento = rodadaBrasileiraoSelecionada >= mercadoRodada;
    } else {
        isEmAndamento = rodadaBrasileiraoSelecionada >= mercadoRodada;
    }

    const isRodadaFinal = rodadaSelecionada === totalRodadas && ligaEncerrou;

    console.log(
        `[PONTOS-CORRIDOS] 📊 Rodada ${rodadaSelecionada} PC (${rodadaBrasileiraoSelecionada} BR) | Mercado: ${mercadoRodada} | Em andamento: ${isEmAndamento} | Final: ${isRodadaFinal}`,
    );

    // ✅ v4.3: Título especial para rodada final
    setTexto(
        "pc-rodada-titulo",
        isRodadaFinal
            ? `🏆 Rodada Final da Liga`
            : `${rodadaSelecionada}ª Rodada da Liga`,
    );
    setTexto(
        "pc-rodada-subtitulo",
        `${rodadaBrasileirao}ª Rodada do Brasileirão`,
    );

    const statusEl = document.getElementById("pc-rodada-status");
    if (statusEl) {
        if (isRodadaFinal) {
            statusEl.className =
                "flex items-center space-x-1.5 bg-yellow-500/20 text-yellow-400 px-2.5 py-1.5 rounded-full text-[10px] font-semibold";
            statusEl.innerHTML = `
                <span class="text-sm">🏆</span>
                <span>ENCERRADA</span>
            `;
        } else {
            statusEl.className = `flex items-center space-x-1.5 ${isEmAndamento ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"} px-2.5 py-1.5 rounded-full text-[10px] font-semibold`;
            statusEl.innerHTML = `
                <span class="w-1.5 h-1.5 ${isEmAndamento ? "bg-yellow-500 animate-pulse" : "bg-green-500"} rounded-full"></span>
                <span>${isEmAndamento ? "EM ANDAMENTO" : "FINALIZADA"}</span>
            `;
        }
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

// ✅ v4.2: Confronto com nome do time + cartoleiro
function buildLinhaConfronto(confronto, meuTimeId) {
    const { time1, time2, diferenca } = confronto;

    const t1Id = time1.id || time1.timeId || time1.time_id;
    const t2Id = time2.id || time2.timeId || time2.time_id;
    const isMeu1 = t1Id == meuTimeId;
    const isMeu2 = t2Id == meuTimeId;

    const p1 = time1.pontos ?? null;
    const p2 = time2.pontos ?? null;

    // Determinar vencedor
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

    const valorFinanceiro =
        tipoResultado === "goleada" ? 7 : tipoResultado === "vitoria" ? 5 : 3;

    // ✅ v4.3: Nome do time (principal) + nome do cartoleiro (secundário)
    // Dados vêm do core com: nome (time), nome_cartola (cartoleiro)
    const nome1 = time1.nome || time1.nome_time || "Time 1";
    const cartoleiro1 = time1.nome_cartola || "";
    const nome2 = time2.nome || time2.nome_time || "Time 2";
    const cartoleiro2 = time2.nome_cartola || "";

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

    const label1 =
        vencedor === 1 ? "Crédito" : vencedor === 2 ? "Débito" : "Empate";
    const label2 =
        vencedor === 2 ? "Crédito" : vencedor === 1 ? "Débito" : "Empate";
    const sinal1 = vencedor === 1 ? "+" : vencedor === 2 ? "-" : "";
    const sinal2 = vencedor === 2 ? "+" : vencedor === 1 ? "-" : "";

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

    // ✅ v4.2: Layout melhorado com nome do time + cartoleiro
    return `
        <div class="py-3 px-3 flex items-center justify-between ${bg}">
            <div class="flex items-center min-w-0 flex-1 ${vencedor === 2 ? "opacity-60" : ""}">
                <img src="${esc1}" class="w-10 h-10 rounded-full mr-3 shrink-0 bg-zinc-700 object-cover" onerror="this.src='/assets/escudo-placeholder.png'">
                <div class="min-w-0 flex-1">
                    <p class="font-semibold text-sm truncate ${isMeu1 ? "text-primary" : "text-white"}">${nome1}</p>
                    <p class="text-[10px] text-gray-500 truncate">${cartoleiro1}</p>
                    <div class="flex items-center space-x-1.5 mt-0.5">
                        <p class="text-sm font-bold ${cor1}">${p1 !== null ? p1.toFixed(1) : "-"}</p>
                        ${modal1}
                    </div>
                </div>
            </div>
            <span class="text-sm text-white/30 mx-2 shrink-0">x</span>
            <div class="flex items-center min-w-0 flex-1 justify-end ${vencedor === 1 ? "opacity-60" : ""}">
                <div class="min-w-0 flex-1 text-right">
                    <p class="font-semibold text-sm truncate ${isMeu2 ? "text-primary" : "text-white"}">${nome2}</p>
                    <p class="text-[10px] text-gray-500 truncate">${cartoleiro2}</p>
                    <div class="flex items-center justify-end space-x-1.5 mt-0.5">
                        <p class="text-sm font-bold ${cor2}">${p2 !== null ? p2.toFixed(1) : "-"}</p>
                        ${modal2}
                    </div>
                </div>
                <img src="${esc2}" class="w-10 h-10 rounded-full ml-3 shrink-0 bg-zinc-700 object-cover" onerror="this.src='/assets/escudo-placeholder.png'">
            </div>
            <div class="w-14 text-right ml-2 shrink-0">
                <p class="font-bold text-sm text-white">${diferenca != null ? diferenca.toFixed(1) : "-"}</p>
            </div>
        </div>
    `;
}

// ============================================
// CLASSIFICAÇÃO
// ============================================

function renderizarClassificacao() {
    const { dados, timeId, ligaEncerrou } = estadoPC;
    const container = document.getElementById("pc-lista-classificacao");
    if (!container) return;

    const ultimaRodada = dados.filter((r) => r.classificacao?.length > 0).pop();
    if (!ultimaRodada?.classificacao?.length) {
        mostrarSemDados("Classificação não disponível");
        return;
    }

    // ✅ v4.3: Info especial se encerrou
    const infoEl = document.getElementById("pc-classificacao-info");
    if (infoEl) {
        if (ligaEncerrou) {
            infoEl.innerHTML = `<span class="text-yellow-400">🏆 Classificação Final</span>`;
        } else {
            infoEl.textContent = `Atualizada até a ${ultimaRodada.rodada}ª rodada`;
        }
    }

    const total = ultimaRodada.classificacao.length;
    container.innerHTML = ultimaRodada.classificacao
        .map((t, i) =>
            buildLinhaClassificacao(t, i + 1, total, timeId, ligaEncerrou),
        )
        .join("");
}

// ✅ v4.3: Classificação com destaque do campeão
function buildLinhaClassificacao(
    time,
    pos,
    total,
    meuTimeId,
    ligaEncerrou = false,
) {
    const tId = time.timeId || time.time_id || time.id;
    const isMeu = tId == meuTimeId;
    const zona = getZona(pos, total);
    const isCampeao = pos === 1 && ligaEncerrou;

    // ✅ v4.3: Nome do time (principal) + nome do cartoleiro (secundário)
    // Dados vêm do core com: nome (time), nome_cartola (cartoleiro)
    const nome = time.nome || time.nome_time || "Time";
    const cartoleiro = time.nome_cartola || "";
    const esc =
        time.escudo ||
        time.url_escudo_png ||
        time.foto_time ||
        "/assets/escudo-placeholder.png";
    const sg = time.saldo_gols ?? time.saldoGols ?? 0;

    // ✅ v4.3: Estilo especial para campeão
    const bgClass = isCampeao
        ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-l-2 border-yellow-500"
        : isMeu
          ? "bg-primary/10"
          : "";

    return `
        <div class="flex items-center px-3 py-2.5 ${bgClass}">
            <div class="w-8 flex items-center justify-center shrink-0">
                ${
                    isCampeao
                        ? `<div class="text-xl">🏆</div>`
                        : zona.badge
                          ? `<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${zona.bg}">${pos}</div>`
                          : `<span class="text-xs font-bold text-white/70">${pos}</span>`
                }
            </div>
            <div class="flex items-center gap-2.5 pl-2 min-w-0 flex-1">
                <img src="${esc}" class="w-8 h-8 rounded-full bg-zinc-700 object-cover shrink-0 ${isCampeao ? "ring-2 ring-yellow-500" : ""}" onerror="this.src='/assets/escudo-placeholder.png'">
                <div class="min-w-0 flex-1">
                    <span class="text-xs font-medium truncate block ${isCampeao ? "text-yellow-400 font-bold" : isMeu ? "text-primary font-bold" : "text-white"}">${nome}${isCampeao ? " 🎉" : ""}</span>
                    <span class="text-[10px] text-gray-500 truncate block">${cartoleiro}</span>
                </div>
            </div>
            <div class="w-6 text-center text-white/60 text-[10px]">${time.jogos || 0}</div>
            <div class="w-6 text-center text-green-400 text-[10px]">${time.vitorias || 0}</div>
            <div class="w-6 text-center text-yellow-400 text-[10px]">${time.empates || 0}</div>
            <div class="w-6 text-center text-red-400 text-[10px]">${time.derrotas || 0}</div>
            <div class="w-8 text-center text-white/60 text-[10px]">${Math.round(sg)}</div>
            <div class="w-8 text-center text-white font-bold text-xs ${isCampeao ? "text-yellow-400" : ""}">${time.pontos || 0}</div>
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

console.log("[PONTOS-CORRIDOS] Módulo v4.3 carregado (celebração do campeão)");

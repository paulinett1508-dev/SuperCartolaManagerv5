// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v6.2 FAIXAS CONTEXTUAIS
// =====================================================
// ✅ v6.2: Faixas contextuais por rodada
//    - Cartoleiros Sobral: Rodadas 1-29 (6 times) vs 30+ (4 times)
//    - Cores baseadas na posição dentro das faixas DA RODADA
// =====================================================

console.log("[EXTRATO-UI] 🎨 Módulo de UI v6.2 Faixas Contextuais por Rodada");

// ===== CONFIGURAÇÃO DE FAIXAS POR LIGA (COM SUPORTE TEMPORAL) =====
const FAIXAS_PREMIACAO = {
    // SuperCartola - 32 times (fixo)
    "684cb1c8af923da7c7df51de": {
        nome: "SuperCartola",
        temporal: false,
        totalTimes: 32,
        credito: { inicio: 1, fim: 11 },
        neutro: { inicio: 12, fim: 21 },
        debito: { inicio: 22, fim: 32 },
    },
    // Cartoleiros Sobral - CONFIGURAÇÃO TEMPORAL
    "684d821cf1a7ae16d1f89572": {
        nome: "Cartoleiros Sobral",
        temporal: true,
        rodadaTransicao: 30,

        // Fase 1: Rodadas 1-29 (6 times)
        fase1: {
            totalTimes: 6,
            credito: { inicio: 1, fim: 2 }, // 1º=+7, 2º=+4
            neutro: { inicio: 3, fim: 3 }, // 3º=0
            debito: { inicio: 4, fim: 6 }, // 4º=-2, 5º=-5, 6º=-10
        },

        // Fase 2: Rodadas 30+ (4 times)
        fase2: {
            totalTimes: 4,
            credito: { inicio: 1, fim: 1 }, // 1º=+5 (MITO)
            neutro: { inicio: 2, fim: 3 }, // 2º=0, 3º=0
            debito: { inicio: 4, fim: 4 }, // 4º=-5 (MICO)
        },
    },
};

// Obter faixas corretas para liga E rodada
function getFaixasParaRodada(ligaId, rodada) {
    const config = FAIXAS_PREMIACAO[ligaId];

    if (!config) {
        // Fallback genérico
        return detectarFaixasPorTotal(32);
    }

    // Liga com configuração temporal
    if (config.temporal) {
        const fase = rodada < config.rodadaTransicao ? "fase1" : "fase2";
        return {
            nome: config.nome,
            ...config[fase],
        };
    }

    // Liga com configuração fixa
    return config;
}

// Fallback: detectar faixas pelo totalTimes
function detectarFaixasPorTotal(totalTimes) {
    if (totalTimes <= 6) {
        return {
            totalTimes,
            credito: { inicio: 1, fim: 2 },
            neutro: { inicio: 3, fim: Math.floor(totalTimes / 2) },
            debito: { inicio: Math.floor(totalTimes / 2) + 1, fim: totalTimes },
        };
    }
    const terco = Math.floor(totalTimes / 3);
    return {
        totalTimes,
        credito: { inicio: 1, fim: terco },
        neutro: { inicio: terco + 1, fim: totalTimes - terco },
        debito: { inicio: totalTimes - terco + 1, fim: totalTimes },
    };
}

// Obter faixas da liga (para uso geral - pega config base)
function getFaixasLiga(ligaId, totalTimes) {
    const config = FAIXAS_PREMIACAO[ligaId];
    if (config) {
        // Se temporal, retorna fase2 como padrão
        if (config.temporal) {
            return { nome: config.nome, ...config.fase2 };
        }
        return config;
    }
    return {
        nome: "Liga",
        totalTimes: totalTimes || 32,
        ...detectarFaixasPorTotal(totalTimes || 32),
    };
}

// Classificar posição na faixa
function classificarPosicao(posicao, faixas) {
    if (!posicao) return "neutro";
    if (posicao >= faixas.credito.inicio && posicao <= faixas.credito.fim)
        return "credito";
    if (posicao >= faixas.debito.inicio && posicao <= faixas.debito.fim)
        return "debito";
    return "neutro";
}

// ===== EXPORTAR FUNÇÃO PRINCIPAL =====
export function renderizarExtratoParticipante(extrato, participanteId) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) {
        console.error("[EXTRATO-UI] ❌ Container não encontrado!");
        return;
    }

    if (!extrato || !extrato.rodadas || !Array.isArray(extrato.rodadas)) {
        container.innerHTML = renderizarErro();
        return;
    }

    window.extratoAtual = extrato;

    renderizarConteudoCompleto(container, extrato);

    setTimeout(() => {
        renderizarGraficoEvolucao(extrato.rodadas);
        configurarFiltrosGrafico(extrato.rodadas);
        configurarBotaoRefresh();
    }, 100);
}

// ===== RENDERIZAR CONTEÚDO COMPLETO =====
function renderizarConteudoCompleto(container, extrato) {
    const resumo = extrato.resumo || {
        saldo: 0,
        totalGanhos: 0,
        totalPerdas: 0,
    };
    const saldo = resumo.saldo_final || resumo.saldo || 0;
    const totalGanhos = resumo.totalGanhos || 0;
    const totalPerdas = Math.abs(resumo.totalPerdas || 0);

    const saldoPositivo = saldo >= 0;
    const saldoFormatado = `R$ ${Math.abs(saldo).toFixed(2).replace(".", ",")}`;
    const statusTexto = saldoPositivo ? "A RECEBER" : "A PAGAR";

    // Detectar liga
    const ligaId =
        extrato.liga_id ||
        extrato.ligaId ||
        window.PARTICIPANTE_IDS?.ligaId ||
        "";

    // Salvar para uso global
    window.ligaIdAtual = ligaId;

    // Ordenar rodadas decrescente (mais recente primeiro)
    const rodadasOrdenadas = [...extrato.rodadas].sort(
        (a, b) => b.rodada - a.rodada,
    );

    container.innerHTML = `
        <!-- Header do Extrato -->
        <div class="bg-gradient-to-br from-orange-900/40 to-orange-900/10 p-3 rounded-lg border border-orange-800/50 mb-4">
            <div class="flex justify-between items-center">
                <div class="flex flex-col">
                    <div class="flex items-center space-x-2">
                        <span class="material-icons text-orange-400 text-lg">monetization_on</span>
                        <h2 class="text-xs font-bold text-orange-400 uppercase tracking-wide">EXTRATO</h2>
                    </div>
                    <span class="${saldoPositivo ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 w-fit">${statusTexto}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-2xl font-bold ${saldoPositivo ? "text-green-400" : "text-red-400"} whitespace-nowrap">${saldoPositivo ? "+" : "-"}${saldoFormatado}</span>
                    <button id="btnRefreshExtrato" class="bg-orange-600/50 p-1.5 rounded-full text-white hover:bg-orange-600/70 active:scale-95 transition-all">
                        <span class="material-icons text-lg">sync</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Cards Ganhos/Perdas -->
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div onclick="window.mostrarDetalhamentoGanhos()" class="bg-zinc-800 p-2.5 rounded-lg flex items-center justify-between border border-zinc-700/50 cursor-pointer hover:bg-zinc-700/50 active:scale-[0.98] transition-all">
                <div class="flex items-center space-x-1.5">
                    <span class="material-icons text-green-400 text-sm">arrow_upward</span>
                    <p class="text-[10px] text-gray-300 uppercase">CRÉDITOS</p>
                </div>
                <span class="text-sm font-bold text-green-400">+R$ ${totalGanhos.toFixed(2).replace(".", ",")}</span>
            </div>
            <div onclick="window.mostrarDetalhamentoPerdas()" class="bg-zinc-800 p-2.5 rounded-lg flex items-center justify-between border border-zinc-700/50 cursor-pointer hover:bg-zinc-700/50 active:scale-[0.98] transition-all">
                <div class="flex items-center space-x-1.5">
                    <span class="material-icons text-red-500 text-sm">arrow_downward</span>
                    <p class="text-[10px] text-gray-300 uppercase">DÉBITOS</p>
                </div>
                <span class="text-sm font-bold text-red-400">-R$ ${totalPerdas.toFixed(2).replace(".", ",")}</span>
            </div>
        </div>

        <!-- Gráfico de Evolução -->
        <div class="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50 mb-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-sm font-bold text-white">Evolução Financeira</h3>
                <div class="flex items-center space-x-1 bg-zinc-700/50 p-1 rounded-md text-xs">
                    <button class="filtro-btn px-2 py-1 rounded-md bg-orange-600/80 text-white font-semibold" data-range="all">Tudo</button>
                    <button class="filtro-btn px-2 py-1 rounded-md text-gray-400 hover:text-white transition-colors" data-range="10">10R</button>
                    <button class="filtro-btn px-2 py-1 rounded-md text-gray-400 hover:text-white transition-colors" data-range="5">5R</button>
                </div>
            </div>
            <div class="relative h-40">
                <svg id="graficoSVG" class="absolute inset-0 w-full h-full" viewBox="0 0 300 160" preserveAspectRatio="none" fill="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="#F97316" stop-opacity="0.3"></stop>
                            <stop offset="100%" stop-color="#F97316" stop-opacity="0"></stop>
                        </linearGradient>
                    </defs>
                    <line class="stroke-zinc-700/60" stroke-dasharray="2 2" x1="0" x2="300" y1="40" y2="40"></line>
                    <line class="stroke-zinc-700/60" stroke-dasharray="2 2" x1="0" x2="300" y1="80" y2="80"></line>
                    <line class="stroke-zinc-700/60" stroke-dasharray="2 2" x1="0" x2="300" y1="120" y2="120"></line>
                    <path id="graficoArea" fill="url(#chartGradient)" d=""></path>
                    <path id="graficoPath" fill="none" stroke="#F97316" stroke-width="2" d=""></path>
                </svg>
                <div id="graficoLabels" class="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-gray-500 px-1"></div>
            </div>
        </div>

        <!-- Histórico por Rodada -->
        <div class="mb-4">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-sm font-bold text-white">Histórico por Rodada</h3>
                <span class="text-xs text-gray-500">${rodadasOrdenadas.length} rodadas</span>
            </div>
            <div class="space-y-1.5">
                ${renderizarCardsRodadas(rodadasOrdenadas, ligaId)}
            </div>
        </div>

        <!-- Modal TOP10 Info -->
        <div id="modalTop10Info" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/70 backdrop-blur-sm p-4" onclick="this.classList.add('hidden'); this.classList.remove('flex');">
            <div onclick="event.stopPropagation()" class="bg-zinc-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-700">
                <div class="p-4 border-b border-zinc-700 bg-gradient-to-br from-yellow-900/30 to-yellow-900/10">
                    <div class="flex justify-between items-center">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <span class="material-icons text-yellow-400">emoji_events</span>
                            Detalhe TOP 10
                        </h3>
                        <button class="text-gray-400 hover:text-white" onclick="document.getElementById('modalTop10Info').classList.add('hidden'); document.getElementById('modalTop10Info').classList.remove('flex');">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                </div>
                <div id="modalTop10Body" class="p-4"></div>
            </div>
        </div>
    `;
}

// ===== RENDERIZAR CARDS DAS RODADAS =====
function renderizarCardsRodadas(rodadasArray, ligaId) {
    if (!rodadasArray || rodadasArray.length === 0) {
        return `
            <div class="text-center py-8 text-gray-500">
                <span class="material-icons block mb-2 text-3xl">inbox</span>
                Sem dados de rodadas
            </div>
        `;
    }

    return rodadasArray
        .map((r) => {
            const saldo = r.saldo || 0;
            const posicao = r.posicao;
            const rodadaNum = r.rodada;

            // ✅ OBTER FAIXAS CORRETAS PARA ESTA RODADA ESPECÍFICA
            const faixas = getFaixasParaRodada(ligaId, rodadaNum);

            // Classificar pela POSIÇÃO na faixa da rodada
            const classificacao = classificarPosicao(posicao, faixas);

            // Cores do card baseadas na faixa
            let bgClass, borderClass, posicaoBgClass;
            switch (classificacao) {
                case "credito":
                    bgClass =
                        "bg-gradient-to-r from-green-900/25 to-zinc-800/80";
                    borderClass =
                        "border-l-4 border-l-green-500 border-y border-r border-zinc-700/30";
                    posicaoBgClass = "bg-green-500 text-white";
                    break;
                case "debito":
                    bgClass = "bg-gradient-to-r from-red-900/25 to-zinc-800/80";
                    borderClass =
                        "border-l-4 border-l-red-500 border-y border-r border-zinc-700/30";
                    posicaoBgClass = "bg-red-500 text-white";
                    break;
                default: // neutro
                    bgClass = "bg-zinc-800/60";
                    borderClass =
                        "border-l-4 border-l-zinc-500 border-y border-r border-zinc-700/30";
                    posicaoBgClass = "bg-zinc-500 text-white";
            }

            // Badges MITO/MICO (baseado na faixa contextual)
            const badgesHtml = renderizarBadges(r, faixas);

            // Detalhamento dos valores
            const detalhamentoHtml = renderizarDetalhamento(r);

            // Saldo formatado
            const saldoFormatado = formatarSaldo(saldo);
            const saldoClass = saldo >= 0 ? "text-green-400" : "text-red-400";

            return `
            <div class="${bgClass} ${borderClass} rounded-lg px-3 py-2">
                <!-- Linha 1: Rodada + Posição + Badges + Saldo -->
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="text-white font-bold text-base">${rodadaNum}</span>
                        ${posicao ? `<span class="${posicaoBgClass} text-[10px] font-bold px-1.5 py-0.5 rounded">${posicao}º</span>` : ""}
                        ${badgesHtml}
                    </div>
                    <span class="${saldoClass} font-bold text-base">${saldoFormatado}</span>
                </div>
                <!-- Linha 2: Detalhamento (se houver) -->
                ${detalhamentoHtml ? `<div class="flex flex-wrap gap-1.5 mt-1.5">${detalhamentoHtml}</div>` : ""}
            </div>
        `;
        })
        .join("");
}

// ===== RENDERIZAR BADGES (MITO/MICO) =====
function renderizarBadges(r, faixas) {
    const badges = [];
    const totalTimes = faixas?.totalTimes || 32;

    // MITO (1º lugar ou top10 positivo)
    if (r.isMito || r.posicao === 1 || (r.top10 && r.top10 > 0)) {
        badges.push(`
            <span class="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <span class="material-icons" style="font-size:12px">military_tech</span>MITO
            </span>
        `);
    }

    // MICO (último lugar ou top10 negativo)
    if (r.isMico || r.posicao === totalTimes || (r.top10 && r.top10 < 0)) {
        badges.push(`
            <span class="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <span class="material-icons" style="font-size:12px">sentiment_very_dissatisfied</span>MICO
            </span>
        `);
    }

    return badges.join("");
}

// ===== RENDERIZAR DETALHAMENTO =====
function renderizarDetalhamento(r) {
    const items = [];

    // Crédito/Débito (antigo Bônus/Ônus)
    if (r.bonusOnus && r.bonusOnus !== 0) {
        if (r.bonusOnus > 0) {
            items.push(criarTagCredito("Crédito", r.bonusOnus, "add_circle"));
        } else {
            items.push(
                criarTagDebito(
                    "Débito",
                    Math.abs(r.bonusOnus),
                    "remove_circle",
                ),
            );
        }
    }

    // Pontos Corridos
    if (r.pontosCorridos && r.pontosCorridos !== 0) {
        if (r.pontosCorridos > 0) {
            items.push(
                criarTagCredito(
                    "Pontos Corridos",
                    r.pontosCorridos,
                    "sports_soccer",
                ),
            );
        } else {
            items.push(
                criarTagDebito(
                    "Pontos Corridos",
                    Math.abs(r.pontosCorridos),
                    "sports_soccer",
                ),
            );
        }
    }

    // Mata-Mata
    if (r.mataMata && r.mataMata !== 0) {
        if (r.mataMata > 0) {
            items.push(
                criarTagCredito("Mata-Mata", r.mataMata, "emoji_events"),
            );
        } else {
            items.push(
                criarTagDebito(
                    "Mata-Mata",
                    Math.abs(r.mataMata),
                    "emoji_events",
                ),
            );
        }
    }

    // Top 10
    if (r.top10 && r.top10 !== 0) {
        if (r.top10 > 0) {
            items.push(criarTagCredito("Top 10", r.top10, "star"));
        } else {
            items.push(
                criarTagDebito("Top 10", Math.abs(r.top10), "star_border"),
            );
        }
    }

    // Se não tem movimentação
    if (items.length === 0) {
        return `<span class="text-gray-500 text-[10px] italic">Sem movimentação</span>`;
    }

    return items.join("");
}

// ===== TAGS DE CRÉDITO (VERDE) =====
function criarTagCredito(nome, valor, icone) {
    const valorFormatado = valor.toFixed(0);
    return `
        <span class="inline-flex items-center gap-1 bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-medium px-1.5 py-0.5 rounded">
            <span class="material-icons" style="font-size:11px">${icone}</span>
            <span>${nome}:</span>
            <span class="font-bold">+${valorFormatado}</span>
        </span>
    `;
}

// ===== TAGS DE DÉBITO (VERMELHO) =====
function criarTagDebito(nome, valor, icone) {
    const valorFormatado = valor.toFixed(0);
    return `
        <span class="inline-flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-medium px-1.5 py-0.5 rounded">
            <span class="material-icons" style="font-size:11px">${icone}</span>
            <span>${nome}:</span>
            <span class="font-bold">-${valorFormatado}</span>
        </span>
    `;
}

// ===== FORMATAR SALDO =====
function formatarSaldo(valor) {
    if (valor === null || valor === undefined) return "R$ 0,00";
    const abs = Math.abs(valor).toFixed(2).replace(".", ",");
    return valor >= 0 ? `+R$ ${abs}` : `-R$ ${abs}`;
}

// ===== ERRO =====
function renderizarErro() {
    return `
        <div class="text-center py-8 text-gray-500">
            <span class="material-icons block mb-2 text-4xl">error_outline</span>
            <p>Erro ao carregar extrato</p>
        </div>
    `;
}

// ===== GRÁFICO DE EVOLUÇÃO =====
function renderizarGraficoEvolucao(rodadas, range = "all") {
    if (!rodadas || rodadas.length === 0) return;

    let dadosFiltrados = [...rodadas].sort((a, b) => a.rodada - b.rodada);
    if (range === "10") dadosFiltrados = dadosFiltrados.slice(-10);
    else if (range === "5") dadosFiltrados = dadosFiltrados.slice(-5);

    const saldos = dadosFiltrados.map((r) => r.saldoAcumulado || r.saldo || 0);
    const maxSaldo = Math.max(...saldos, 1);
    const minSaldo = Math.min(...saldos, 0);
    const rangeVal = maxSaldo - minSaldo || 1;

    const pontos = saldos.map((s, i) => {
        const x = (i / (saldos.length - 1 || 1)) * 300;
        const y = 150 - ((s - minSaldo) / rangeVal) * 140;
        return { x, y };
    });

    const pathD = pontos
        .map(
            (p, i) =>
                `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
        )
        .join(" ");
    const areaD = `${pathD} L 300 160 L 0 160 Z`;

    const pathEl = document.getElementById("graficoPath");
    const areaEl = document.getElementById("graficoArea");
    const labelsEl = document.getElementById("graficoLabels");

    if (pathEl) pathEl.setAttribute("d", pathD);
    if (areaEl) areaEl.setAttribute("d", areaD);

    if (labelsEl) {
        const primeiraRodada = dadosFiltrados[0]?.rodada || 1;
        const ultimaRodada =
            dadosFiltrados[dadosFiltrados.length - 1]?.rodada || 1;
        const meioRodada = Math.round((primeiraRodada + ultimaRodada) / 2);
        labelsEl.innerHTML = `
            <span>${primeiraRodada}ª</span>
            <span>${meioRodada}ª</span>
            <span>${ultimaRodada}ª</span>
        `;
    }
}

function configurarFiltrosGrafico(rodadas) {
    document.querySelectorAll(".filtro-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filtro-btn").forEach((b) => {
                b.classList.remove(
                    "bg-orange-600/80",
                    "text-white",
                    "font-semibold",
                );
                b.classList.add("text-gray-400");
            });
            btn.classList.add(
                "bg-orange-600/80",
                "text-white",
                "font-semibold",
            );
            btn.classList.remove("text-gray-400");

            const range = btn.dataset.range;
            renderizarGraficoEvolucao(rodadas, range);
        });
    });
}

function configurarBotaoRefresh() {
    const btn = document.getElementById("btnRefreshExtrato");
    if (btn) {
        btn.addEventListener("click", () => {
            if (window.forcarRefreshExtratoParticipante) {
                window.forcarRefreshExtratoParticipante();
            }
        });
    }
}

// ===== MODAL TOP10 INFO =====
window.abrirModalTop10Info = function (rodada, valor, posicaoTop) {
    const modal = document.getElementById("modalTop10Info");
    const body = document.getElementById("modalTop10Body");

    if (!modal || !body) return;

    const isPositivo = valor > 0;
    const valorAbs = Math.abs(valor).toFixed(2).replace(".", ",");
    const tipo = isPositivo ? "MITO" : "MICO";
    const tipoLabel = isPositivo ? "Crédito Recebido" : "Débito Aplicado";
    const tipoIcon = isPositivo
        ? "emoji_events"
        : "sentiment_very_dissatisfied";
    const tipoBgClass = isPositivo
        ? "from-green-900/20 to-green-900/10 border-green-500/30"
        : "from-red-900/20 to-red-900/10 border-red-500/30";
    const tipoTextClass = isPositivo ? "text-green-400" : "text-red-400";
    const sinal = isPositivo ? "+" : "-";

    body.innerHTML = `
        <div class="space-y-4">
            <div class="bg-zinc-800 rounded-lg p-4 text-center">
                <p class="text-gray-400 text-xs mb-1">Rodada</p>
                <p class="text-2xl font-bold text-white">${rodada}ª</p>
            </div>
            <div class="bg-gradient-to-br ${tipoBgClass} border rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="material-icons ${tipoTextClass}">${tipoIcon}</span>
                        <span class="text-sm text-gray-300">TOP 10 ${tipo}</span>
                    </div>
                </div>
            </div>
            <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-300">${tipoLabel}</span>
                    <span class="text-xl font-bold ${tipoTextClass}">${sinal}R$ ${valorAbs}</span>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove("hidden");
    modal.classList.add("flex");
};

// ===== DETALHAMENTO GANHOS/PERDAS =====
window.mostrarDetalhamentoGanhos = function () {
    mostrarDetalhamento(true);
};

window.mostrarDetalhamentoPerdas = function () {
    mostrarDetalhamento(false);
};

function mostrarDetalhamento(isGanhos) {
    const extrato = window.extratoAtual;
    if (!extrato || !extrato.rodadas) return;

    const titulo = isGanhos
        ? "Detalhamento de Créditos"
        : "Detalhamento de Débitos";
    const icon = isGanhos ? "arrow_upward" : "arrow_downward";
    const ligaId = window.ligaIdAtual || "";

    const categorias = {};
    let somaGanhos = 0,
        somaPerdas = 0;
    let rodadasComGanho = 0,
        rodadasComPerda = 0;
    let totalMito = 0,
        totalMico = 0,
        totalZonaCredito = 0,
        totalZonaDebito = 0;

    extrato.rodadas.forEach((r) => {
        const saldo =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);
        if (saldo > 0) {
            somaGanhos += saldo;
            rodadasComGanho++;
        }
        if (saldo < 0) {
            somaPerdas += Math.abs(saldo);
            rodadasComPerda++;
        }

        // ✅ Usar faixas contextuais por rodada
        const faixas = getFaixasParaRodada(ligaId, r.rodada);

        if (r.top10 > 0) totalMito++;
        if (r.top10 < 0) totalMico++;
        if (r.posicao && r.posicao <= faixas.credito.fim) totalZonaCredito++;
        if (r.posicao && r.posicao >= faixas.debito.inicio) totalZonaDebito++;

        if (isGanhos) {
            if (r.bonusOnus > 0)
                addCategoria(
                    categorias,
                    "Crédito Posição",
                    r.bonusOnus,
                    r.rodada,
                    "add_circle",
                );
            if (r.pontosCorridos > 0)
                addCategoria(
                    categorias,
                    "Pontos Corridos",
                    r.pontosCorridos,
                    r.rodada,
                    "sports_soccer",
                );
            if (r.mataMata > 0)
                addCategoria(
                    categorias,
                    "Mata-Mata",
                    r.mataMata,
                    r.rodada,
                    "emoji_events",
                );
            if (r.top10 > 0)
                addCategoria(
                    categorias,
                    "Top 10 (MITO)",
                    r.top10,
                    r.rodada,
                    "star",
                );
        } else {
            if (r.bonusOnus < 0)
                addCategoria(
                    categorias,
                    "Débito Posição",
                    Math.abs(r.bonusOnus),
                    r.rodada,
                    "remove_circle",
                );
            if (r.pontosCorridos < 0)
                addCategoria(
                    categorias,
                    "Pontos Corridos",
                    Math.abs(r.pontosCorridos),
                    r.rodada,
                    "sports_soccer",
                );
            if (r.mataMata < 0)
                addCategoria(
                    categorias,
                    "Mata-Mata",
                    Math.abs(r.mataMata),
                    r.rodada,
                    "sports_mma",
                );
            if (r.top10 < 0)
                addCategoria(
                    categorias,
                    "Top 10 (MICO)",
                    Math.abs(r.top10),
                    r.rodada,
                    "sentiment_very_dissatisfied",
                );
        }
    });

    const total = isGanhos ? somaGanhos : somaPerdas;
    const mediaGanho = rodadasComGanho > 0 ? somaGanhos / rodadasComGanho : 0;
    const mediaPerda = rodadasComPerda > 0 ? somaPerdas / rodadasComPerda : 0;

    const categoriasArray = Object.values(categorias)
        .map((cat) => ({
            ...cat,
            percentual: total > 0 ? (cat.valor / total) * 100 : 0,
        }))
        .sort((a, b) => b.valor - a.valor);

    document.getElementById("popupDetalhamento")?.remove();

    const html = `
        <div id="popupDetalhamento" onclick="this.remove()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div onclick="event.stopPropagation()" class="bg-zinc-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl border border-zinc-700">
                <div class="p-4 border-b border-zinc-700 bg-gradient-to-br ${isGanhos ? "from-green-900/30 to-green-900/10" : "from-red-900/30 to-red-900/10"}">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <span class="material-icons ${isGanhos ? "text-green-400" : "text-red-400"}">${icon}</span>
                            ${titulo}
                        </h3>
                        <button class="text-gray-400 hover:text-white transition-colors" onclick="document.getElementById('popupDetalhamento').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                        <div class="text-center">
                            <p class="text-[10px] text-gray-400">Rodadas</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? rodadasComGanho : rodadasComPerda}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-gray-400">Média</p>
                            <p class="text-lg font-bold text-white">R$ ${(isGanhos ? mediaGanho : mediaPerda).toFixed(0)}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-gray-400">${isGanhos ? "Mitos" : "Micos"}</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? totalMito : totalMico}x</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-gray-400">${isGanhos ? "Zona +" : "Zona -"}</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? totalZonaCredito : totalZonaDebito}x</p>
                        </div>
                    </div>
                </div>
                <div class="p-4 overflow-y-auto max-h-[50vh] space-y-3">
                    ${
                        categoriasArray.length === 0
                            ? `
                        <div class="text-center py-8 text-gray-500">
                            <span class="material-icons text-4xl mb-2 block">inbox</span>
                            Nenhum registro encontrado
                        </div>
                    `
                            : categoriasArray
                                  .map(
                                      (cat) => `
                        <div class="bg-zinc-800 rounded-lg p-3">
                            <div class="flex justify-between items-center mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center ${isGanhos ? "bg-green-500/20" : "bg-red-500/20"}">
                                        <span class="material-icons text-sm ${isGanhos ? "text-green-400" : "text-red-400"}">${cat.icon}</span>
                                    </div>
                                    <span class="text-sm font-medium text-white">${cat.nome}</span>
                                </div>
                                <span class="text-base font-bold ${isGanhos ? "text-green-400" : "text-red-400"}">R$ ${cat.valor.toFixed(2).replace(".", ",")}</span>
                            </div>
                            <div class="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-1">
                                <div class="h-full rounded-full ${isGanhos ? "bg-green-500" : "bg-red-500"}" style="width: ${cat.percentual}%;"></div>
                            </div>
                            <div class="flex justify-between text-[10px] text-gray-500">
                                <span>${cat.rodadas.length} rodada(s)</span>
                                <span>${cat.percentual.toFixed(1)}%</span>
                            </div>
                        </div>
                    `,
                                  )
                                  .join("")
                    }
                    <div class="rounded-xl p-4 border ${isGanhos ? "bg-gradient-to-br from-green-900/20 to-green-900/10 border-green-500/50" : "bg-gradient-to-br from-red-900/20 to-red-900/10 border-red-500/50"}">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center gap-2 text-sm font-bold text-white">
                                <span class="material-icons ${isGanhos ? "text-green-400" : "text-red-400"}">account_balance_wallet</span>
                                TOTAL ${isGanhos ? "CRÉDITOS" : "DÉBITOS"}
                            </span>
                            <span class="text-xl font-extrabold ${isGanhos ? "text-green-400" : "text-red-400"}">R$ ${total.toFixed(2).replace(".", ",")}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
}

function addCategoria(obj, nome, valor, rodada, icon) {
    if (!obj[nome]) {
        obj[nome] = { nome, valor: 0, rodadas: [], icon };
    }
    obj[nome].valor += valor;
    obj[nome].rodadas.push(rodada);
}

console.log("[EXTRATO-UI] ✅ Módulo v6.2 Faixas Contextuais pronto");

// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v5.0 TAILWIND
// =====================================================

console.log("[EXTRATO-UI] 🎨 Módulo de UI v5.0 Tailwind carregado");

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
            <div onclick="window.mostrarDetalhamentoGanhos()" class="bg-zinc-800 p-2.5 rounded-lg flex items-center justify-between border border-zinc-700/50 cursor-pointer hover:bg-zinc-700/50 active:scale-[0.98] transition-all relative group">
                <div class="flex items-center space-x-1.5">
                    <span class="material-icons text-green-400 text-sm">arrow_upward</span>
                    <p class="text-[10px] text-gray-300 uppercase">TUDO QUE GANHOU</p>
                </div>
                <span class="material-icons text-gray-500 text-base">info_outline</span>
                <div class="absolute top-full mt-1 right-0 w-40 bg-zinc-900 border border-green-500/50 rounded-lg p-2 shadow-lg z-10 hidden group-hover:block">
                    <p class="text-xs text-gray-400">Total de ganhos</p>
                    <p class="text-lg font-bold text-green-400">+R$ ${totalGanhos.toFixed(2).replace(".", ",")}</p>
                </div>
            </div>
            <div onclick="window.mostrarDetalhamentoPerdas()" class="bg-zinc-800 p-2.5 rounded-lg flex items-center justify-between border border-zinc-700/50 cursor-pointer hover:bg-zinc-700/50 active:scale-[0.98] transition-all relative group">
                <div class="flex items-center space-x-1.5">
                    <span class="material-icons text-red-500 text-sm">arrow_downward</span>
                    <p class="text-[10px] text-gray-300 uppercase">TUDO QUE PERDEU</p>
                </div>
                <span class="material-icons text-gray-500 text-base">info_outline</span>
                <div class="absolute top-full mt-1 right-0 w-40 bg-zinc-900 border border-red-500/50 rounded-lg p-2 shadow-lg z-10 hidden group-hover:block">
                    <p class="text-xs text-gray-400">Total de perdas</p>
                    <p class="text-lg font-bold text-red-500">-R$ ${totalPerdas.toFixed(2).replace(".", ",")}</p>
                </div>
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
                    <line class="stroke-zinc-700/60" stroke-dasharray="2 2" x1="0" x2="300" y1="160" y2="160"></line>
                    <path id="graficoArea" fill="url(#chartGradient)" d=""></path>
                    <path id="graficoPath" fill="none" stroke="#F97316" stroke-width="2" d=""></path>
                </svg>
                <div id="graficoLabels" class="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-gray-500 px-1">
                    <span>1ª</span>
                    <span>10ª</span>
                    <span>20ª</span>
                </div>
            </div>
        </div>

        <!-- Tabela de Rodadas -->
        <div class="overflow-x-auto -mx-2 px-2">
            <table class="w-full text-xs text-center min-w-[500px]">
                <thead class="text-orange-400 font-semibold">
                    <tr>
                        <th class="py-2 px-1 font-medium">ROD</th>
                        <th class="py-2 px-1 font-medium">POS</th>
                        <th class="py-2 px-1 font-medium">BÔNUS/ÔNUS</th>
                        <th class="py-2 px-1 font-medium">P.C</th>
                        <th class="py-2 px-1 font-medium">M-M</th>
                        <th class="py-2 px-1 font-medium">TOP10</th>
                        <th class="py-2 px-1 font-medium">SALDO</th>
                    </tr>
                </thead>
                <tbody class="text-gray-400 text-sm">
                    ${renderizarLinhasRodadas(extrato.rodadas)}
                </tbody>
            </table>
        </div>
    `;
}

// ===== RENDERIZAR LINHAS DA TABELA =====
function renderizarLinhasRodadas(rodadas) {
    if (!rodadas || rodadas.length === 0) {
        return `<tr><td colspan="7" class="py-8 text-center text-gray-500">
            <span class="material-icons block mb-2 text-3xl">inbox</span>
            Sem dados de rodadas
        </td></tr>`;
    }

    return rodadas
        .map((r) => {
            const saldoClass = r.saldo >= 0 ? "text-green-500" : "text-red-500";

            return `
            <tr class="border-b border-zinc-700/50">
                <td class="py-3 px-1">${r.rodada}ª</td>
                <td class="py-3 px-1">${formatarPosicao(r)}</td>
                <td class="py-3 px-1 ${getCorValor(r.bonusOnus)} font-semibold">${formatarValor(r.bonusOnus)}</td>
                <td class="py-3 px-1 ${getCorValor(r.pontosCorridos)} font-semibold">${formatarValor(r.pontosCorridos)}</td>
                <td class="py-3 px-1 ${getCorValor(r.mataMata)} font-semibold">${formatarValor(r.mataMata)}</td>
                <td class="py-3 px-1">${formatarTop10(r)}</td>
                <td class="py-3 px-1 ${saldoClass} font-bold">${formatarValorSaldo(r.saldo)}</td>
            </tr>
        `;
        })
        .join("");
}

// ===== FORMATADORES =====
function formatarPosicao(rodada) {
    if (!rodada.posicao) {
        return '<span class="bg-zinc-700 text-gray-400 text-xs px-2 py-0.5 rounded">-</span>';
    }

    // MITO (1º lugar)
    if (rodada.posicao === 1 || rodada.isMito) {
        return `
            <span class="bg-green-500 text-white font-bold text-xs px-2 py-1 rounded inline-flex items-center justify-center gap-1">
                <span class="material-icons text-sm">military_tech</span>MITO
            </span>
        `;
    }

    // MICO (último lugar)
    if (rodada.posicao === rodada.totalTimes || rodada.isMico) {
        return `
            <span class="bg-red-600 text-white font-bold text-xs px-2 py-1 rounded inline-flex items-center justify-center gap-1">
                <span class="material-icons text-sm">sentiment_very_dissatisfied</span>MICO
            </span>
        `;
    }

    // Top posições (verde)
    if (rodada.posicao <= 3) {
        return `<span class="bg-green-500 text-white font-bold text-xs px-2 py-0.5 rounded">${rodada.posicao}º</span>`;
    }

    // Posições médias
    return `<span class="bg-zinc-600 text-white font-bold text-xs px-2 py-0.5 rounded">${rodada.posicao}º</span>`;
}

function formatarTop10(rodada) {
    if (!rodada.top10 || rodada.top10 === 0) return "-";

    const posTop = rodada.posicaoTop10 || "";
    return `
        <div class="text-yellow-400 text-center text-[10px] leading-tight">
            <span class="material-icons text-xs">emoji_events</span>
            ${posTop ? `<p>${posTop}º MAIOR</p>` : ""}
            <p class="font-semibold">+${rodada.top10.toFixed(2).replace(".", ",")}</p>
        </div>
    `;
}

function formatarValor(valor) {
    if (valor === null || valor === undefined || valor === 0) return "-";
    const abs = Math.abs(valor).toFixed(2).replace(".", ",");
    return valor > 0 ? `+${abs}` : abs;
}

function formatarValorSaldo(valor) {
    if (valor === null || valor === undefined) return "-";
    const abs = Math.abs(valor).toFixed(2).replace(".", ",");
    return valor >= 0 ? `+${abs}` : `-${abs}`;
}

function getCorValor(valor) {
    if (!valor || valor === 0) return "text-gray-500";
    return valor > 0 ? "text-green-500" : "text-red-500";
}

// ===== GRÁFICO DE EVOLUÇÃO =====
function renderizarGraficoEvolucao(rodadas, range = "all") {
    if (!rodadas || rodadas.length === 0) return;

    let dadosFiltrados = [...rodadas];
    if (range === "10") dadosFiltrados = rodadas.slice(-10);
    else if (range === "5") dadosFiltrados = rodadas.slice(-5);

    const pathEl = document.getElementById("graficoPath");
    const areaEl = document.getElementById("graficoArea");
    const labelsEl = document.getElementById("graficoLabels");

    if (!pathEl || !areaEl) return;

    const saldos = dadosFiltrados.map((r) => parseFloat(r.saldo) || 0);
    if (saldos.length === 0) return;

    const minSaldo = Math.min(...saldos, 0);
    const maxSaldo = Math.max(...saldos, 0);
    const range_val = Math.max(maxSaldo - minSaldo, 1);

    const width = 300;
    const height = 140;
    const padding = 10;

    const pontos = saldos.map((saldo, i) => {
        const x =
            (i / Math.max(saldos.length - 1, 1)) * (width - padding * 2) +
            padding;
        const y =
            height -
            padding -
            ((saldo - minSaldo) / range_val) * (height - padding * 2);
        return { x, y };
    });

    let pathD = `M${pontos[0].x} ${pontos[0].y}`;
    for (let i = 1; i < pontos.length; i++) {
        pathD += ` L${pontos[i].x} ${pontos[i].y}`;
    }

    let areaD =
        pathD +
        ` L${pontos[pontos.length - 1].x} ${height} L${pontos[0].x} ${height} Z`;

    pathEl.setAttribute("d", pathD);
    areaEl.setAttribute("d", areaD);

    // Atualizar labels
    if (labelsEl && dadosFiltrados.length > 0) {
        const first = dadosFiltrados[0]?.rodada || 1;
        const mid =
            dadosFiltrados[Math.floor(dadosFiltrados.length / 2)]?.rodada || "";
        const last = dadosFiltrados[dadosFiltrados.length - 1]?.rodada || "";

        labelsEl.innerHTML = `
            <span>${first}ª</span>
            <span>${mid}ª</span>
            <span>${last}ª</span>
        `;
    }
}

function configurarFiltrosGrafico(rodadas) {
    const filtros = document.querySelectorAll(".filtro-btn");

    filtros.forEach((btn) => {
        btn.addEventListener("click", () => {
            filtros.forEach((b) => {
                b.classList.remove(
                    "bg-orange-600/80",
                    "text-white",
                    "font-semibold",
                );
                b.classList.add("text-gray-400");
            });
            btn.classList.remove("text-gray-400");
            btn.classList.add(
                "bg-orange-600/80",
                "text-white",
                "font-semibold",
            );

            renderizarGraficoEvolucao(rodadas, btn.dataset.range);
        });
    });
}

function configurarBotaoRefresh() {
    const btn = document.getElementById("btnRefreshExtrato");
    if (btn) {
        btn.addEventListener("click", () => {
            const icon = btn.querySelector(".material-icons");
            if (icon) icon.classList.add("animate-spin");
            window.forcarRefreshExtratoParticipante?.();
        });
    }
}

function renderizarErro() {
    return `
        <div class="text-center py-10 px-5 bg-red-500/10 rounded-xl border border-red-500/30">
            <span class="material-icons text-5xl text-red-500 mb-4 block">error_outline</span>
            <h3 class="text-red-400 mb-3 font-bold">Dados Inválidos</h3>
            <p class="text-gray-400 mb-5 text-sm">A estrutura do extrato está incompleta.</p>
            <button onclick="window.forcarRefreshExtratoParticipante()" 
                    class="px-6 py-3 bg-primary text-white rounded-lg font-semibold inline-flex items-center gap-2 hover:bg-orange-600 active:scale-95 transition-all">
                <span class="material-icons">sync</span>
                Tentar Novamente
            </button>
        </div>
    `;
}

// ===== FUNÇÕES GLOBAIS PARA POPUPS =====
window.mostrarDetalhamentoGanhos = function () {
    if (!window.extratoAtual) return;
    mostrarPopupDetalhamento(window.extratoAtual, true);
};

window.mostrarDetalhamentoPerdas = function () {
    if (!window.extratoAtual) return;
    mostrarPopupDetalhamento(window.extratoAtual, false);
};

function mostrarPopupDetalhamento(extrato, isGanhos) {
    const rodadas = extrato.rodadas || [];
    const cor = isGanhos ? "green" : "red";
    const titulo = isGanhos
        ? "Detalhamento de Ganhos"
        : "Detalhamento de Perdas";
    const icon = isGanhos ? "emoji_events" : "sentiment_very_dissatisfied";

    // Calcular estatísticas
    let totalMito = 0,
        totalMico = 0,
        totalTop11 = 0,
        totalZ4 = 0;
    let rodadasComGanho = 0,
        rodadasComPerda = 0;
    let somaGanhos = 0,
        somaPerdas = 0;

    const categorias = {};

    rodadas.forEach((r) => {
        const saldoRodada =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);

        if (saldoRodada > 0) {
            rodadasComGanho++;
            somaGanhos += saldoRodada;
        } else if (saldoRodada < 0) {
            rodadasComPerda++;
            somaPerdas += Math.abs(saldoRodada);
        }

        if (r.posicao === 1 || r.isMito) totalMito++;
        if (r.posicao === r.totalTimes || r.isMico) totalMico++;
        if (r.posicao >= 2 && r.posicao <= 11) totalTop11++;
        if (
            r.totalTimes &&
            r.posicao >= r.totalTimes - 3 &&
            r.posicao !== r.totalTimes
        )
            totalZ4++;

        // Agrupar por categoria
        if (isGanhos) {
            if (r.bonusOnus > 0)
                addCategoria(
                    categorias,
                    "Bônus",
                    r.bonusOnus,
                    r.rodada,
                    "card_giftcard",
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
                    "Top 10",
                    r.top10,
                    r.rodada,
                    "military_tech",
                );
        } else {
            if (r.bonusOnus < 0)
                addCategoria(
                    categorias,
                    "Ônus",
                    Math.abs(r.bonusOnus),
                    r.rodada,
                    "money_off",
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

    // Remover popup anterior se existir
    document.getElementById("popupDetalhamento")?.remove();

    const html = `
        <div id="popupDetalhamento" onclick="this.remove()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div onclick="event.stopPropagation()" class="bg-zinc-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl border border-zinc-700">

                <!-- Header -->
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
                            <p class="text-[10px] text-gray-400">${isGanhos ? "Top 11" : "Z4"}</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? totalTop11 : totalZ4}x</p>
                        </div>
                    </div>
                </div>

                <!-- Body -->
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

                    <!-- Total -->
                    <div class="rounded-xl p-4 border ${isGanhos ? "bg-gradient-to-br from-green-900/20 to-green-900/10 border-green-500/50" : "bg-gradient-to-br from-red-900/20 to-red-900/10 border-red-500/50"}">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center gap-2 text-sm font-bold text-white">
                                <span class="material-icons ${isGanhos ? "text-green-400" : "text-red-400"}">account_balance_wallet</span>
                                TOTAL ${isGanhos ? "GANHO" : "PERDIDO"}
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

console.log("[EXTRATO-UI] ✅ Módulo v5.0 Tailwind pronto");

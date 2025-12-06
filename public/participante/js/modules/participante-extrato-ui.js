// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v5.3 TAILWIND
// =====================================================
// ✅ v5.3: Banner visual para extrato travado (inativos)
// =====================================================

console.log("[EXTRATO-UI] 🎨 Módulo de UI v5.3 Tailwind carregado");

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

    // ✅ v5.3: Informações de inativo
    const isInativo = extrato.inativo === true;
    const extratoTravado = extrato.extratoTravado === true;
    const rodadaTravada = extrato.rodadaTravada;
    const rodadaDesistencia = extrato.rodadaDesistencia;

    // Campos manuais
    const camposManuais = extrato.camposManuais || [];
    const temCamposManuais = camposManuais.length > 0;
    const totalCamposManuais = camposManuais.reduce(
        (acc, c) => acc + (c.valor || 0),
        0,
    );

    const saldoPositivo = saldo >= 0;
    const saldoFormatado = `R$ ${Math.abs(saldo).toFixed(2).replace(".", ",")}`;

    // ✅ v5.3: Status diferenciado para travado
    let statusTexto = saldoPositivo ? "A RECEBER" : "A PAGAR";
    if (extratoTravado) {
        statusTexto = "TRAVADO";
    }

    // ✅ v5.3: Banner de extrato travado
    const bannerTravadoHTML = extratoTravado
        ? `
        <div class="bg-gradient-to-r from-amber-900/50 to-amber-800/30 p-3 rounded-lg border border-amber-500/50 mb-4">
            <div class="flex items-center gap-3">
                <div class="bg-amber-500/30 p-2 rounded-lg">
                    <span class="material-icons text-amber-400 text-xl">lock</span>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-bold text-amber-300">Extrato Travado na Rodada ${rodadaTravada}</p>
                    <p class="text-xs text-amber-200/70">Participante inativo desde a R${rodadaDesistencia}. Valores financeiros não acumulam mais.</p>
                </div>
            </div>
        </div>
    `
        : "";

    // Mini card de ajustes
    const ajustesPositivo = totalCamposManuais >= 0;
    const ajustesFormatado = `R$ ${Math.abs(totalCamposManuais).toFixed(2).replace(".", ",")}`;
    const miniCardAjustesHTML = temCamposManuais
        ? `
        <div onclick="window.mostrarModalAjustes()" 
             class="bg-gradient-to-r from-purple-900/40 to-purple-800/20 p-2.5 rounded-lg border border-purple-500/40 mb-4 cursor-pointer hover:border-purple-400/60 active:scale-[0.99] transition-all">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <div class="bg-purple-500/30 p-1.5 rounded-lg">
                        <span class="material-icons text-purple-400 text-base">account_balance_wallet</span>
                    </div>
                    <div>
                        <p class="text-[10px] text-purple-300/80 uppercase font-medium">Ajustes Manuais</p>
                        <p class="text-[10px] text-gray-500">${camposManuais.length} ${camposManuais.length === 1 ? "lançamento" : "lançamentos"}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-lg font-bold ${ajustesPositivo ? "text-green-400" : "text-red-400"}">${ajustesPositivo ? "+" : "-"}${ajustesFormatado}</span>
                    <span class="material-icons text-purple-400/60 text-base">chevron_right</span>
                </div>
            </div>
        </div>
    `
        : "";

    // ✅ v5.3: Classes diferenciadas para travado
    const headerGradient = extratoTravado
        ? "from-amber-900/40 to-amber-900/10 border-amber-800/50"
        : "from-orange-900/40 to-orange-900/10 border-orange-800/50";

    const headerIconColor = extratoTravado
        ? "text-amber-400"
        : "text-orange-400";
    const headerTitleColor = extratoTravado
        ? "text-amber-400"
        : "text-orange-400";

    const badgeClass = extratoTravado
        ? "bg-amber-500/20 text-amber-400"
        : saldoPositivo
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400";

    const saldoColor = extratoTravado
        ? "text-amber-400"
        : saldoPositivo
          ? "text-green-400"
          : "text-red-400";

    container.innerHTML = `
        ${bannerTravadoHTML}

        <!-- Header do Extrato -->
        <div class="bg-gradient-to-br ${headerGradient} p-3 rounded-lg border mb-4">
            <div class="flex justify-between items-center">
                <div class="flex flex-col">
                    <div class="flex items-center space-x-2">
                        <span class="material-icons ${headerIconColor} text-lg">${extratoTravado ? "lock" : "monetization_on"}</span>
                        <h2 class="text-xs font-bold ${headerTitleColor} uppercase tracking-wide">EXTRATO${extratoTravado ? " TRAVADO" : ""}</h2>
                    </div>
                    <span class="${badgeClass} text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 w-fit">${statusTexto}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-2xl font-bold ${saldoColor} whitespace-nowrap">${saldoPositivo ? "+" : "-"}${saldoFormatado}</span>
                    <button id="btnRefreshExtrato" class="bg-orange-600/50 p-1.5 rounded-full text-white hover:bg-orange-600/70 active:scale-95 transition-all">
                        <span class="material-icons text-lg">sync</span>
                    </button>
                </div>
            </div>
        </div>

        ${miniCardAjustesHTML}

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
                <h3 class="text-sm font-bold text-white">Evolução Financeira${extratoTravado ? " (Travado)" : ""}</h3>
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
                            <stop offset="0%" stop-color="${extratoTravado ? "#F59E0B" : "#F97316"}" stop-opacity="0.3"></stop>
                            <stop offset="100%" stop-color="${extratoTravado ? "#F59E0B" : "#F97316"}" stop-opacity="0"></stop>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>

        <!-- Lista de Rodadas -->
        <div class="space-y-2">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-sm font-bold text-white">Histórico por Rodada</h3>
                <span class="text-xs text-gray-500">${extrato.rodadas.length} rodadas</span>
            </div>
            ${renderizarListaRodadas(extrato.rodadas, extratoTravado)}
        </div>
    `;
}

// ===== RENDERIZAR LISTA DE RODADAS =====
function renderizarListaRodadas(rodadas, extratoTravado = false) {
    if (!rodadas || rodadas.length === 0) {
        return '<p class="text-center text-gray-500 py-4">Nenhuma rodada disponível</p>';
    }

    const rodadasOrdenadas = [...rodadas].sort((a, b) => b.rodada - a.rodada);

    return rodadasOrdenadas
        .map((r) => {
            const saldoRodada =
                (r.bonusOnus || 0) +
                (r.pontosCorridos || 0) +
                (r.mataMata || 0) +
                (r.top10 || 0);
            const saldoPositivo = saldoRodada >= 0;
            const saldoFormatado = `R$ ${Math.abs(saldoRodada).toFixed(2).replace(".", ",")}`;

            let badgeHTML = "";
            if (r.isMito) {
                badgeHTML =
                    '<span class="bg-yellow-500/20 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">MITO</span>';
            } else if (r.isMico) {
                badgeHTML =
                    '<span class="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">MICO</span>';
            }

            // Componentes
            const componentes = [];
            if (r.bonusOnus !== 0 && r.bonusOnus)
                componentes.push(
                    `B/Ô: ${r.bonusOnus > 0 ? "+" : ""}${r.bonusOnus.toFixed(0)}`,
                );
            if (r.pontosCorridos && r.pontosCorridos !== 0)
                componentes.push(
                    `PC: ${r.pontosCorridos > 0 ? "+" : ""}${r.pontosCorridos.toFixed(0)}`,
                );
            if (r.mataMata && r.mataMata !== 0)
                componentes.push(
                    `MM: ${r.mataMata > 0 ? "+" : ""}${r.mataMata.toFixed(0)}`,
                );
            if (r.top10 && r.top10 !== 0)
                componentes.push(
                    `T10: ${r.top10 > 0 ? "+" : ""}${r.top10.toFixed(0)}`,
                );

            return `
            <div class="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/30 hover:bg-zinc-800 transition-colors">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <div class="bg-zinc-700 w-8 h-8 rounded-lg flex items-center justify-center">
                            <span class="text-xs font-bold text-white">${r.rodada}</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs text-gray-300">${r.posicao ? `${r.posicao}º lugar` : "N/E"}</span>
                                ${badgeHTML}
                            </div>
                            <p class="text-[10px] text-gray-500">${componentes.join(" • ") || "Sem movimentação"}</p>
                        </div>
                    </div>
                    <span class="text-sm font-bold ${saldoPositivo ? "text-green-400" : "text-red-400"}">${saldoPositivo ? "+" : "-"}${saldoFormatado}</span>
                </div>
            </div>
        `;
        })
        .join("");
}

// ===== GRÁFICO DE EVOLUÇÃO =====
function renderizarGraficoEvolucao(rodadas, range = "all") {
    const svg = document.getElementById("graficoSVG");
    if (!svg || !rodadas || rodadas.length === 0) return;

    let dadosParaGrafico = [...rodadas].sort((a, b) => a.rodada - b.rodada);

    if (range !== "all") {
        const limite = parseInt(range);
        dadosParaGrafico = dadosParaGrafico.slice(-limite);
    }

    if (dadosParaGrafico.length === 0) return;

    // Calcular saldo acumulado
    let saldoAcumulado = 0;
    const pontosGrafico = dadosParaGrafico.map((r) => {
        saldoAcumulado +=
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);
        return { rodada: r.rodada, saldo: saldoAcumulado };
    });

    const valores = pontosGrafico.map((p) => p.saldo);
    const maxVal = Math.max(...valores, 0);
    const minVal = Math.min(...valores, 0);
    const range_val = maxVal - minVal || 1;

    const width = 300;
    const height = 140;
    const padding = 10;

    const pontos = pontosGrafico.map((p, i) => {
        const x =
            padding +
            (i / (pontosGrafico.length - 1 || 1)) * (width - 2 * padding);
        const y =
            height -
            padding -
            ((p.saldo - minVal) / range_val) * (height - 2 * padding);
        return { x, y, ...p };
    });

    // Linha do path
    const linhaPath = pontos
        .map(
            (p, i) =>
                `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
        )
        .join(" ");

    // Área preenchida
    const areaPath = `${linhaPath} L ${pontos[pontos.length - 1].x.toFixed(1)} ${height - padding} L ${pontos[0].x.toFixed(1)} ${height - padding} Z`;

    // Linha zero
    const yZero =
        height - padding - ((0 - minVal) / range_val) * (height - 2 * padding);

    svg.innerHTML = `
        <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#F97316" stop-opacity="0.3"></stop>
                <stop offset="100%" stop-color="#F97316" stop-opacity="0"></stop>
            </linearGradient>
        </defs>
        <line x1="${padding}" y1="${yZero.toFixed(1)}" x2="${width - padding}" y2="${yZero.toFixed(1)}" stroke="#4b5563" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>
        <path d="${areaPath}" fill="url(#chartGradient)"/>
        <path d="${linhaPath}" fill="none" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${pontos.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#F97316" stroke="#1f2937" stroke-width="1.5"/>`).join("")}
    `;
}

// ===== FILTROS DO GRÁFICO =====
function configurarFiltrosGrafico(rodadas) {
    const filtros = document.querySelectorAll(".filtro-btn");
    filtros.forEach((btn) => {
        btn.addEventListener("click", () => {
            filtros.forEach((b) =>
                b.classList.remove(
                    "bg-orange-600/80",
                    "text-white",
                    "font-semibold",
                ),
            );
            filtros.forEach((b) => b.classList.add("text-gray-400"));
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

// ===== CONFIGURAR BOTÃO REFRESH =====
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

// ===== DETALHAMENTO GANHOS/PERDAS =====
window.mostrarDetalhamentoGanhos = function () {
    mostrarPopupDetalhamento(true);
};

window.mostrarDetalhamentoPerdas = function () {
    mostrarPopupDetalhamento(false);
};

function mostrarPopupDetalhamento(isGanhos) {
    const extrato = window.extratoAtual;
    if (!extrato || !extrato.rodadas) return;

    const titulo = isGanhos
        ? "Detalhamento de Ganhos"
        : "Detalhamento de Perdas";
    const icon = isGanhos ? "trending_up" : "trending_down";

    const categorias = {};
    let somaGanhos = 0,
        somaPerdas = 0;
    let rodadasComGanho = 0,
        rodadasComPerda = 0;
    let totalMito = 0,
        totalMico = 0,
        totalTop11 = 0,
        totalZ4 = 0;

    extrato.rodadas.forEach((r) => {
        const saldoRodada =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);

        if (saldoRodada > 0) {
            somaGanhos += saldoRodada;
            rodadasComGanho++;
        } else if (saldoRodada < 0) {
            somaPerdas += Math.abs(saldoRodada);
            rodadasComPerda++;
        }

        if (r.isMito) totalMito++;
        if (r.isMico) totalMico++;
        if (r.posicao && r.posicao <= 11) totalTop11++;
        if (r.posicao && r.totalTimes && r.posicao > r.totalTimes - 4)
            totalZ4++;

        if (isGanhos) {
            if (r.bonusOnus > 0)
                addCategoria(
                    categorias,
                    "Bônus/Ônus",
                    r.bonusOnus,
                    r.rodada,
                    "emoji_events",
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
                    "sports_mma",
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
                    "Bônus/Ônus",
                    Math.abs(r.bonusOnus),
                    r.rodada,
                    "emoji_events",
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

    // Campos manuais
    const camposManuais = extrato.camposManuais || [];
    camposManuais.forEach((campo) => {
        const valor = campo.valor || 0;
        if (isGanhos && valor > 0)
            addCategoria(categorias, campo.nome, valor, "Ajuste", "tune");
        else if (!isGanhos && valor < 0)
            addCategoria(
                categorias,
                campo.nome,
                Math.abs(valor),
                "Ajuste",
                "tune",
            );
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
                        <div class="text-center"><p class="text-[10px] text-gray-400">Rodadas</p><p class="text-lg font-bold text-white">${isGanhos ? rodadasComGanho : rodadasComPerda}</p></div>
                        <div class="text-center"><p class="text-[10px] text-gray-400">Média</p><p class="text-lg font-bold text-white">R$ ${(isGanhos ? mediaGanho : mediaPerda).toFixed(0)}</p></div>
                        <div class="text-center"><p class="text-[10px] text-gray-400">${isGanhos ? "Mitos" : "Micos"}</p><p class="text-lg font-bold text-white">${isGanhos ? totalMito : totalMico}x</p></div>
                        <div class="text-center"><p class="text-[10px] text-gray-400">${isGanhos ? "Top 11" : "Z4"}</p><p class="text-lg font-bold text-white">${isGanhos ? totalTop11 : totalZ4}x</p></div>
                    </div>
                </div>
                <div class="p-4 overflow-y-auto max-h-[50vh] space-y-3">
                    ${
                        categoriasArray.length === 0
                            ? `<div class="text-center py-8 text-gray-500"><span class="material-icons text-4xl mb-2 block">inbox</span>Nenhum registro encontrado</div>`
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
    if (!obj[nome]) obj[nome] = { nome, valor: 0, rodadas: [], icon };
    obj[nome].valor += valor;
    obj[nome].rodadas.push(rodada);
}

// ===== MODAL AJUSTES MANUAIS =====
window.mostrarModalAjustes = function () {
    const extrato = window.extratoAtual;
    if (!extrato || !extrato.camposManuais) return;

    const camposManuais = extrato.camposManuais;
    const total = camposManuais.reduce((acc, c) => acc + (c.valor || 0), 0);

    document.getElementById("popupAjustes")?.remove();

    const html = `
        <div id="popupAjustes" onclick="this.remove()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div onclick="event.stopPropagation()" class="bg-zinc-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl border border-zinc-700">
                <div class="p-4 border-b border-zinc-700 bg-gradient-to-br from-purple-900/30 to-purple-900/10">
                    <div class="flex justify-between items-start">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <span class="material-icons text-purple-400">account_balance_wallet</span>
                            Ajustes Manuais
                        </h3>
                        <button class="text-gray-400 hover:text-white transition-colors" onclick="document.getElementById('popupAjustes').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                </div>
                <div class="p-4 space-y-3">
                    ${camposManuais
                        .map(
                            (c) => `
                        <div class="bg-zinc-800 rounded-lg p-3 flex justify-between items-center">
                            <span class="text-sm text-white">${c.nome}</span>
                            <span class="text-base font-bold ${c.valor >= 0 ? "text-green-400" : "text-red-400"}">${c.valor >= 0 ? "+" : ""}R$ ${Math.abs(c.valor).toFixed(2).replace(".", ",")}</span>
                        </div>
                    `,
                        )
                        .join("")}
                    <div class="rounded-xl p-4 border bg-gradient-to-br from-purple-900/20 to-purple-900/10 border-purple-500/50">
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-bold text-white">TOTAL AJUSTES</span>
                            <span class="text-xl font-extrabold ${total >= 0 ? "text-green-400" : "text-red-400"}">${total >= 0 ? "+" : ""}R$ ${Math.abs(total).toFixed(2).replace(".", ",")}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
};

function renderizarErro() {
    return `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h3 style="margin-bottom: 8px;">Erro ao carregar extrato</h3>
            <p style="color: #9ca3af;">Tente novamente mais tarde</p>
        </div>
    `;
}

console.log("[EXTRATO-UI] ✅ Módulo v5.3 Tailwind pronto (suporte a inativos)");

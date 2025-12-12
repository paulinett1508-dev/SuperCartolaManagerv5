// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v8.8 VISUAL MELHORADO
// =====================================================
// ✅ v8.8: Melhorias visuais no Histórico por Rodada
//    - Cards com padding aumentado (p-4)
//    - Textos e badges maiores para legibilidade
//    - Ícones proporcionais (w-10 h-10)
// ✅ v8.7: CORREÇÃO CRÍTICA - Campos manuais não duplicados
//    - Backend já soma campos em resumo.saldo
//    - Frontend NÃO soma novamente (estava duplicando!)
// ✅ v8.4: Sistema de zonas G1-G11 (ganho) e Z10-Z1 (perda)
// ✅ v8.3: Casas decimais, cores nas legendas, nomes completos
// ✅ v8.2: Valores detalhados por componente em cada rodada

if (window.Log) Log.info("[EXTRATO-UI] 🎨 Módulo de UI v8.8 VISUAL MELHORADO");

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
        fase1: {
            totalTimes: 6,
            credito: { inicio: 1, fim: 2 },
            neutro: { inicio: 3, fim: 3 },
            debito: { inicio: 4, fim: 6 },
        },
        fase2: {
            totalTimes: 4,
            credito: { inicio: 1, fim: 1 },
            neutro: { inicio: 2, fim: 3 },
            debito: { inicio: 4, fim: 4 },
        },
    },
};

// Obter faixas corretas para liga E rodada
function getFaixasParaRodada(ligaId, rodada) {
    const config = FAIXAS_PREMIACAO[ligaId];
    if (!config) return detectarFaixasPorTotal(32);
    if (config.temporal) {
        const fase = rodada < config.rodadaTransicao ? "fase1" : "fase2";
        return { nome: config.nome, ...config[fase] };
    }
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

// Classificar posição na faixa
function classificarPosicao(posicao, faixas) {
    if (!posicao) return "neutro";
    if (posicao >= faixas.credito.inicio && posicao <= faixas.credito.fim)
        return "credito";
    if (posicao >= faixas.debito.inicio && posicao <= faixas.debito.fim)
        return "debito";
    return "neutro";
}

// ✅ v8.4: Converter posição para label de zona (G1-G11 ou Z10-Z1)
function getPosicaoZonaLabel(posicao, faixas) {
    if (!posicao) return { label: null, tipo: "neutro" };

    // Zona de Ganho: G1, G2, G3...
    if (posicao >= faixas.credito.inicio && posicao <= faixas.credito.fim) {
        return { label: `G${posicao}`, tipo: "ganho" };
    }

    // Zona de Perda: Z10 (22º) até Z1 (32º) - inversão elegante
    if (posicao >= faixas.debito.inicio && posicao <= faixas.debito.fim) {
        const totalZona = faixas.debito.fim - faixas.debito.inicio + 1;
        const zNum = faixas.debito.fim - posicao + 1;
        return { label: `Z${zNum}`, tipo: "perda" };
    }

    // Zona Neutra: sem label
    return { label: null, tipo: "neutro" };
}

// ===== v8.8: PREENCHER TODAS AS 38 RODADAS =====
// Garante que todas as rodadas apareçam no histórico, mesmo as neutras
function preencherTodasRodadas(rodadasExistentes, totalRodadas = 38) {
    const rodadasMap = new Map();

    // Indexar rodadas existentes
    rodadasExistentes.forEach(r => {
        rodadasMap.set(r.rodada, r);
    });

    // Criar array completo (1 a totalRodadas)
    const todasRodadas = [];
    for (let i = 1; i <= totalRodadas; i++) {
        if (rodadasMap.has(i)) {
            todasRodadas.push(rodadasMap.get(i));
        } else {
            // Rodada neutra sem movimentação
            todasRodadas.push({
                rodada: i,
                posicao: null,
                bonusOnus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,
                _preenchida: true // Flag para identificar
            });
        }
    }

    return todasRodadas;
}

// ===== EXPORTAR FUNÇÃO PRINCIPAL =====
export function renderizarExtratoParticipante(extrato, participanteId) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) {
        if (window.Log) Log.error("[EXTRATO-UI] ❌ Container não encontrado!");
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
    const resumoBase = extrato.resumo || {
        saldo: 0,
        totalGanhos: 0,
        totalPerdas: 0,
    };
    const camposManuais =
        extrato.camposManuais || extrato.camposEditaveis || [];

    // ✅ v8.7: CORREÇÃO CRÍTICA - Backend já inclui campos manuais no resumo!
    // NÃO somar campos manuais novamente (estava causando duplicação)
    let totalCamposManuaisPositivos = 0;
    let totalCamposManuaisNegativos = 0;

    // Calcular totais apenas para exibição separada (se necessário)
    if (Array.isArray(camposManuais)) {
        camposManuais.forEach((campo) => {
            const valor = parseFloat(campo.valor) || 0;
            if (valor > 0) totalCamposManuaisPositivos += valor;
            if (valor < 0) totalCamposManuaisNegativos += valor;
        });
    }

    // ✅ v8.7: resumo.saldo/totalGanhos/totalPerdas JÁ incluem campos manuais
    // Não duplicar somando novamente!
    const totalGanhos = resumoBase.totalGanhos || 0;
    const totalPerdas = Math.abs(resumoBase.totalPerdas || 0);
    const saldo = resumoBase.saldo_final || resumoBase.saldo || 0;

    const saldoPositivo = saldo >= 0;
    const saldoFormatado = `R$ ${Math.abs(saldo).toFixed(2).replace(".", ",")}`;
    const statusTexto = saldoPositivo ? "A RECEBER" : "A PAGAR";

    const ligaId =
        extrato.liga_id ||
        extrato.ligaId ||
        window.PARTICIPANTE_IDS?.ligaId ||
        window.participanteData?.ligaId ||
        "";

    if (window.Log)
        Log.info(
            "[EXTRATO-UI] 🔍 LigaId:",
            ligaId,
            "| Campos manuais:",
            camposManuais.length,
        );

    window.ligaIdAtual = ligaId;

    // v8.8: Preencher todas as 38 rodadas (mesmo neutras) e ordenar decrescente
    const rodadasCompletas = preencherTodasRodadas(extrato.rodadas, 38);
    const rodadasOrdenadas = rodadasCompletas.sort(
        (a, b) => b.rodada - a.rodada,
    );

    container.innerHTML = `
        <!-- Card Saldo Principal -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-3xl ${saldoPositivo ? "text-emerald-400" : "text-rose-400"}">account_balance_wallet</span>
                    <div>
                        <p class="text-xs font-medium uppercase text-white/70">Saldo Financeiro</p>
                        <p class="text-2xl font-bold ${saldoPositivo ? "text-emerald-400" : "text-rose-400"}">${saldoPositivo ? "+" : "-"}${saldoFormatado}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="${saldoPositivo ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"} text-[10px] font-semibold px-2 py-1 rounded-full">${statusTexto}</span>
                    <button id="btnRefreshExtrato" class="p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-lg">sync</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Cards Ganhos/Perdas -->
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div onclick="window.mostrarDetalhamentoGanhos(event)" class="bg-surface-dark p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-icons text-emerald-400 text-base flex-shrink-0">arrow_upward</span>
                    <p class="text-xs text-white/70 uppercase truncate">Créditos</p>
                </div>
                <span class="text-sm font-bold text-emerald-400 whitespace-nowrap ml-1">+${totalGanhos.toFixed(2).replace(".", ",")}</span>
            </div>
            <div onclick="window.mostrarDetalhamentoPerdas(event)" class="bg-surface-dark p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-icons text-rose-400 text-base flex-shrink-0">arrow_downward</span>
                    <p class="text-xs text-white/70 uppercase truncate">Débitos</p>
                </div>
                <span class="text-sm font-bold text-rose-400 whitespace-nowrap ml-1">-${totalPerdas.toFixed(2).replace(".", ",")}</span>
            </div>
        </div>

        <!-- Gráfico de Evolução -->
        <div class="bg-surface-dark p-4 rounded-xl mb-4 border border-white/5">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">show_chart</span>
                    <h3 class="text-sm font-bold text-white">Evolução Financeira</h3>
                </div>
                <div class="flex items-center gap-1 bg-white/5 p-1 rounded-lg text-xs">
                    <button class="filtro-btn px-2 py-1 rounded-md bg-primary/80 text-white font-semibold" data-range="all">Tudo</button>
                    <button class="filtro-btn px-2 py-1 rounded-md text-white/50 hover:text-white transition-colors" data-range="10">10R</button>
                    <button class="filtro-btn px-2 py-1 rounded-md text-white/50 hover:text-white transition-colors" data-range="5">5R</button>
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

        <!-- Histórico por Rodada - v8.8: Espaçamento melhorado -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-primary text-xl">history</span>
                <h3 class="text-base font-bold text-white">Histórico por Rodada</h3>
                <span class="text-xs text-white/50 ml-auto">${rodadasOrdenadas.length} rodadas</span>
            </div>
            <div class="space-y-3">
                ${renderizarCardsRodadas(rodadasOrdenadas, ligaId)}
            </div>
        </div>

        <!-- Card Seu Desempenho -->
        ${renderizarCardDesempenho(rodadasOrdenadas, ligaId)}

        <!-- Modal TOP10 Info -->
        <div id="modalTop10Info" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/70 backdrop-blur-sm p-4" onclick="this.classList.add('hidden'); this.classList.remove('flex');">
            <div onclick="event.stopPropagation()" class="bg-surface-dark rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div class="p-4 border-b border-white/10">
                    <div class="flex justify-between items-center">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <span class="material-icons text-yellow-400">emoji_events</span>
                            Detalhe TOP 10
                        </h3>
                        <button class="text-white/50 hover:text-white" onclick="document.getElementById('modalTop10Info').classList.add('hidden'); document.getElementById('modalTop10Info').classList.remove('flex');">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                </div>
                <div id="modalTop10Body" class="p-4"></div>
            </div>
        </div>
    `;
}

// ===== v8.4: CARDS DE RODADAS COM ZONAS G/Z =====
function renderizarCardsRodadas(rodadas, ligaId) {
    if (!rodadas || rodadas.length === 0) {
        return `
            <div class="text-center py-4 text-white/50">
                <span class="material-icons text-3xl mb-2 block">inbox</span>
                Nenhuma rodada registrada
            </div>
        `;
    }

    return rodadas
        .map((r) => {
            const faixas = getFaixasParaRodada(ligaId, r.rodada);
            const { label: zonaLabel, tipo: tipoZona } = getPosicaoZonaLabel(
                r.posicao,
                faixas,
            );

            const bonusOnus = r.bonusOnus || 0;
            const pontosCorridos = r.pontosCorridos || 0;
            const mataMata = r.mataMata || 0;
            const top10 = r.top10 || 0;

            const saldo = bonusOnus + pontosCorridos + mataMata + top10;
            const saldoFormatado = saldo.toFixed(2).replace(".", ",");
            const positivo = saldo >= 0;

            // Cores do card baseado na zona
            let bgColor = "bg-zinc-800/30";
            let borderColor = "border-zinc-700/20";
            let faixaIcon = "remove";
            let faixaColor = "text-zinc-500";

            if (tipoZona === "ganho") {
                bgColor = "bg-emerald-950/40";
                borderColor = "border-emerald-500/20";
                faixaIcon = "arrow_upward";
                faixaColor = "text-emerald-400";
            } else if (tipoZona === "perda") {
                bgColor = "bg-rose-950/40";
                borderColor = "border-rose-500/20";
                faixaIcon = "arrow_downward";
                faixaColor = "text-rose-400";
            }

            // v8.8: Badge MITO/MICO da rodada (1º e último lugar)
            // Ícones iguais ao módulo Rodadas: emoji_events (MITO) e pest_control (MICO)
            const ultimaPosicao = faixas.debito?.fim || faixas.totalTimes;
            let badgePosicaoDestaque = "";

            if (r.posicao === 1) {
                // 1º lugar = MITO da rodada
                badgePosicaoDestaque = `<span class="inline-flex items-center gap-1 text-[11px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                    <span class="material-symbols-outlined text-sm" style="color: #ffd700;">emoji_events</span>MITO
                </span>`;
            } else if (r.posicao === ultimaPosicao) {
                // Último lugar = MICO da rodada
                badgePosicaoDestaque = `<span class="inline-flex items-center gap-1 text-[11px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">
                    <span class="material-symbols-outlined text-sm" style="color: #ef4444;">pest_control</span>MICO
                </span>`;
            }

            // Badge TOP10 histórico (separado do MITO/MICO de rodada)
            let badgeTop10 = "";
            if (top10 > 0) {
                badgeTop10 = `<span class="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">TOP10</span>`;
            } else if (top10 < 0) {
                badgeTop10 = `<span class="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-semibold">BTM10</span>`;
            }

            // Badge da zona (G2-G11 ou Z2-Z10) - não mostrar se já tem MITO/MICO
            let badgeZona = "";
            if (zonaLabel && !badgePosicaoDestaque) {
                const corBadge =
                    tipoZona === "ganho"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400";
                badgeZona = `<span class="text-[11px] font-bold px-2 py-0.5 rounded ${corBadge}">${zonaLabel}</span>`;
            }

            // Gerar breakdown com zonas G/Z
            const breakdownItems = [];

            // Posição com label de zona (só se não for neutro)
            if (bonusOnus !== 0 && zonaLabel) {
                const corValor =
                    bonusOnus > 0 ? "text-emerald-400" : "text-rose-400";
                const corLabel =
                    tipoZona === "ganho" ? "text-emerald-300" : "text-rose-300";
                const sinal = bonusOnus > 0 ? "+" : "";
                breakdownItems.push(
                    `<span class="${corValor}">${sinal}${bonusOnus.toFixed(2).replace(".", ",")} <span class="${corLabel} font-semibold">${zonaLabel}</span></span>`,
                );
            }

            // Pontos Corridos - legenda amarela
            if (pontosCorridos !== 0) {
                const corValor =
                    pontosCorridos > 0 ? "text-emerald-400" : "text-rose-400";
                const sinal = pontosCorridos > 0 ? "+" : "";
                breakdownItems.push(
                    `<span class="${corValor}">${sinal}${pontosCorridos.toFixed(2).replace(".", ",")} <span class="text-amber-400">Pontos Corridos</span></span>`,
                );
            }

            // Mata-Mata - legenda azul
            if (mataMata !== 0) {
                const corValor =
                    mataMata > 0 ? "text-emerald-400" : "text-rose-400";
                const sinal = mataMata > 0 ? "+" : "";
                breakdownItems.push(
                    `<span class="${corValor}">${sinal}${mataMata.toFixed(2).replace(".", ",")} <span class="text-sky-400">Mata-Mata</span></span>`,
                );
            }

            // Top 10 - legenda laranja
            if (top10 !== 0) {
                const corValor =
                    top10 > 0 ? "text-emerald-400" : "text-rose-400";
                const sinal = top10 > 0 ? "+" : "";
                breakdownItems.push(
                    `<span class="${corValor}">${sinal}${top10.toFixed(2).replace(".", ",")} <span class="text-orange-400">Top 10</span></span>`,
                );
            }

            // v8.8: Espaçamento vertical aumentado entre itens do breakdown
            const breakdownHTML =
                breakdownItems.length > 0
                    ? `<div class="flex flex-col gap-1 text-xs font-medium mt-2">${breakdownItems.join("")}</div>`
                    : `<p class="text-[11px] text-white/40 mt-2">Sem movimentação</p>`;

            return `
            <div class="${bgColor} ${borderColor} border rounded-xl p-4 transition-all">
                <div class="flex items-start justify-between">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            tipoZona === "ganho"
                                ? "bg-emerald-500/20"
                                : tipoZona === "perda"
                                  ? "bg-rose-500/20"
                                  : "bg-zinc-700/50"
                        }">
                            <span class="material-icons ${faixaColor} text-lg">${faixaIcon}</span>
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-base font-bold text-white">R${r.rodada}</span>
                                ${r.posicao ? `<span class="text-[11px] text-white/50">${r.posicao}º lugar</span>` : ""}
                                ${badgePosicaoDestaque}
                                ${badgeZona}
                                ${badgeTop10}
                            </div>
                            ${breakdownHTML}
                        </div>
                    </div>
                    <span class="text-base font-bold ${saldo === 0 ? "text-white/40" : positivo ? "text-emerald-400" : "text-rose-400"} whitespace-nowrap ml-3">${saldo > 0 ? "+" : ""}${saldoFormatado}</span>
                </div>
            </div>
        `;
        })
        .join("");
}

// ===== CARD DE DESEMPENHO =====
function renderizarCardDesempenho(rodadas, ligaId) {
    if (!rodadas || rodadas.length === 0) return "";

    let totalMito = 0,
        totalMico = 0;
    let zonaCredito = 0,
        zonaDebito = 0;
    let melhorRodada = { rodada: 0, saldo: -Infinity };
    let piorRodada = { rodada: 0, saldo: Infinity };

    rodadas.forEach((r) => {
        const faixas = getFaixasParaRodada(ligaId, r.rodada);
        const saldo =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);

        if (r.top10 > 0) totalMito++;
        if (r.top10 < 0) totalMico++;

        if (r.posicao && r.posicao <= faixas.credito.fim) zonaCredito++;
        if (r.posicao && r.posicao >= faixas.debito.inicio) zonaDebito++;

        if (saldo > melhorRodada.saldo)
            melhorRodada = { rodada: r.rodada, saldo };
        if (saldo < piorRodada.saldo) piorRodada = { rodada: r.rodada, saldo };
    });

    return `
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-primary">analytics</span>
                <h3 class="text-sm font-bold text-white">Seu Desempenho</h3>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-amber-400 text-lg">star</span>
                    <p class="text-lg font-bold text-white">${totalMito}</p>
                    <p class="text-[10px] text-white/50">Mitos</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-rose-400 text-lg">sentiment_very_dissatisfied</span>
                    <p class="text-lg font-bold text-white">${totalMico}</p>
                    <p class="text-[10px] text-white/50">Micos</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-emerald-400 text-lg">trending_up</span>
                    <p class="text-lg font-bold text-white">${zonaCredito}</p>
                    <p class="text-[10px] text-white/50">Zona Ganho</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-rose-400 text-lg">trending_down</span>
                    <p class="text-lg font-bold text-white">${zonaDebito}</p>
                    <p class="text-[10px] text-white/50">Zona Perda</p>
                </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3">
                <div class="bg-emerald-500/10 rounded-lg p-2 text-center">
                    <p class="text-[10px] text-white/50">Melhor Rodada</p>
                    <p class="text-sm font-bold text-emerald-400">R${melhorRodada.rodada} (+${melhorRodada.saldo.toFixed(2).replace(".", ",")})</p>
                </div>
                <div class="bg-rose-500/10 rounded-lg p-2 text-center">
                    <p class="text-[10px] text-white/50">Pior Rodada</p>
                    <p class="text-sm font-bold text-rose-400">R${piorRodada.rodada} (${piorRodada.saldo.toFixed(2).replace(".", ",")})</p>
                </div>
            </div>
        </div>
    `;
}

// ===== GRÁFICO DE EVOLUÇÃO =====
function renderizarGraficoEvolucao(rodadas, range = "all") {
    const svg = document.getElementById("graficoSVG");
    const path = document.getElementById("graficoPath");
    const area = document.getElementById("graficoArea");
    const labels = document.getElementById("graficoLabels");

    if (!svg || !path || !area || !labels) return;

    let dadosOrdenados = [...rodadas].sort((a, b) => a.rodada - b.rodada);

    if (range !== "all") {
        const n = parseInt(range);
        dadosOrdenados = dadosOrdenados.slice(-n);
    }

    if (dadosOrdenados.length === 0) {
        path.setAttribute("d", "");
        area.setAttribute("d", "");
        labels.innerHTML = "";
        return;
    }

    let saldoAcumulado = 0;
    const pontos = dadosOrdenados.map((r) => {
        const saldo =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);
        saldoAcumulado += saldo;
        return { rodada: r.rodada, saldo: saldoAcumulado };
    });

    const valores = pontos.map((p) => p.saldo);
    const min = Math.min(...valores, 0);
    const max = Math.max(...valores, 0);
    const range2 = Math.max(Math.abs(max), Math.abs(min)) || 1;

    const width = 300;
    const height = 140;
    const paddingY = 10;

    const mapY = (val) => {
        const normalized = (val - min) / (range2 * 2 || 1);
        return height - paddingY - normalized * (height - paddingY * 2);
    };

    let pathD = "";
    let areaD = "";

    pontos.forEach((p, i) => {
        const x = (i / (pontos.length - 1 || 1)) * width;
        const y = mapY(p.saldo);

        if (i === 0) {
            pathD = `M ${x} ${y}`;
            areaD = `M ${x} ${height - paddingY}`;
        }
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
    });

    if (pontos.length > 0) {
        const lastX = width;
        areaD += ` L ${lastX} ${height - paddingY} Z`;
    }

    path.setAttribute("d", pathD);
    area.setAttribute("d", areaD);

    const step = Math.ceil(pontos.length / 6);
    labels.innerHTML = pontos
        .filter((_, i) => i % step === 0 || i === pontos.length - 1)
        .map((p) => `<span>R${p.rodada}</span>`)
        .join("");
}

// ===== CONFIGURAR FILTROS DO GRÁFICO =====
function configurarFiltrosGrafico(rodadas) {
    const btns = document.querySelectorAll(".filtro-btn");
    btns.forEach((btn) => {
        btn.addEventListener("click", () => {
            btns.forEach((b) => {
                b.classList.remove("bg-primary/80", "font-semibold");
                b.classList.add("text-white/50");
            });
            btn.classList.add("bg-primary/80", "font-semibold");
            btn.classList.remove("text-white/50");
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

// ===== RENDERIZAR ERRO =====
function renderizarErro() {
    return `
        <div class="text-center py-8 text-white/50">
            <span class="material-icons text-4xl mb-2 block">error_outline</span>
            <p>Erro ao carregar extrato</p>
            <button onclick="window.forcarRefreshExtratoParticipante()" class="mt-4 px-4 py-2 bg-primary rounded-lg text-white text-sm">
                Tentar Novamente
            </button>
        </div>
    `;
}

// ===== DETALHAMENTO DE GANHOS/PERDAS =====
// ✅ v8.6: Prevenção de propagação de eventos + feedback visual
window.mostrarDetalhamentoGanhos = function (event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    try {
        mostrarPopupDetalhamento(true);
    } catch (error) {
        if (window.Log) Log.error('[EXTRATO-UI] ❌ Erro ao mostrar créditos:', error);
        mostrarToastErro('Erro ao carregar detalhamento');
    }
};

window.mostrarDetalhamentoPerdas = function (event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    try {
        mostrarPopupDetalhamento(false);
    } catch (error) {
        if (window.Log) Log.error('[EXTRATO-UI] ❌ Erro ao mostrar débitos:', error);
        mostrarToastErro('Erro ao carregar detalhamento');
    }
};

// ✅ v8.6: Toast de feedback para erros
function mostrarToastErro(mensagem) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-medium z-[9999] animate-fade-in';
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function mostrarPopupDetalhamento(isGanhos) {
    const extrato = window.extratoAtual;

    // ✅ v8.6: Log de debug e feedback visual melhorado
    if (window.Log) Log.debug('[EXTRATO-UI] 📊 Abrindo popup:', { isGanhos, temExtrato: !!extrato, temRodadas: extrato?.rodadas?.length });

    if (!extrato || !extrato.rodadas) {
        if (window.Log) Log.warn('[EXTRATO-UI] ⚠️ Extrato não disponível para detalhamento');
        mostrarToastErro('Aguarde o carregamento do extrato');
        return;
    }

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
        totalMico = 0;
    let totalZonaCredito = 0,
        totalZonaDebito = 0;

    extrato.rodadas.forEach((r) => {
        const faixas = getFaixasParaRodada(ligaId, r.rodada);
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

        if (r.top10 > 0) totalMito++;
        if (r.top10 < 0) totalMico++;
        if (r.posicao && r.posicao <= faixas.credito.fim) totalZonaCredito++;
        if (r.posicao && r.posicao >= faixas.debito.inicio) totalZonaDebito++;

        if (isGanhos) {
            if (r.bonusOnus > 0)
                addCategoria(
                    categorias,
                    "Zona de Ganho",
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
                    "Zona de Perda",
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

    // Campos manuais
    const camposManuais =
        extrato.camposManuais || extrato.camposEditaveis || [];
    if (Array.isArray(camposManuais) && camposManuais.length > 0) {
        camposManuais.forEach((campo) => {
            const valor = parseFloat(campo.valor) || 0;
            const nome = campo.nome || "Campo Manual";
            if (isGanhos && valor > 0) {
                somaGanhos += valor;
                addCategoria(categorias, nome, valor, "Manual", "edit");
            } else if (!isGanhos && valor < 0) {
                somaPerdas += Math.abs(valor);
                addCategoria(
                    categorias,
                    nome,
                    Math.abs(valor),
                    "Manual",
                    "edit",
                );
            }
        });
    }

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
            <div onclick="event.stopPropagation()" class="bg-surface-dark rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl">
                <div class="p-4 border-b border-white/10">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <span class="material-icons ${isGanhos ? "text-emerald-400" : "text-rose-400"}">${icon}</span>
                            ${titulo}
                        </h3>
                        <button class="text-white/50 hover:text-white transition-colors" onclick="document.getElementById('popupDetalhamento').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                        <div class="text-center">
                            <p class="text-[10px] text-white/50">Rodadas</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? rodadasComGanho : rodadasComPerda}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-white/50">Média</p>
                            <p class="text-lg font-bold text-white">${(isGanhos ? mediaGanho : mediaPerda).toFixed(2).replace(".", ",")}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-white/50">${isGanhos ? "Mitos" : "Micos"}</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? totalMito : totalMico}x</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-white/50">${isGanhos ? "Zona G" : "Zona Z"}</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? totalZonaCredito : totalZonaDebito}x</p>
                        </div>
                    </div>
                </div>
                <div class="p-4 overflow-y-auto max-h-[50vh] space-y-3">
                    ${
                        categoriasArray.length === 0
                            ? `
                        <div class="text-center py-8 text-white/50">
                            <span class="material-icons text-4xl mb-2 block">inbox</span>
                            Nenhum registro encontrado
                        </div>
                    `
                            : categoriasArray
                                  .map(
                                      (cat) => `
                        <div class="bg-white/5 rounded-xl p-3">
                            <div class="flex justify-between items-center mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center ${isGanhos ? "bg-emerald-500/20" : "bg-rose-500/20"}">
                                        <span class="material-icons text-sm ${isGanhos ? "text-emerald-400" : "text-rose-400"}">${cat.icon}</span>
                                    </div>
                                    <span class="text-sm font-medium text-white">${cat.nome}</span>
                                </div>
                                <span class="text-base font-bold ${isGanhos ? "text-emerald-400" : "text-rose-400"}">R$ ${cat.valor.toFixed(2).replace(".", ",")}</span>
                            </div>
                            <div class="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                                <div class="h-full rounded-full ${isGanhos ? "bg-emerald-500" : "bg-rose-500"}" style="width: ${cat.percentual}%;"></div>
                            </div>
                            <div class="flex justify-between text-[10px] text-white/40">
                                <span>${Array.isArray(cat.rodadas) ? cat.rodadas.length + " rodada(s)" : cat.rodadas}</span>
                                <span>${cat.percentual.toFixed(1)}%</span>
                            </div>
                        </div>
                    `,
                                  )
                                  .join("")
                    }
                    <div class="rounded-xl p-4 ${isGanhos ? "bg-emerald-500/10" : "bg-rose-500/10"}">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center gap-2 text-sm font-bold text-white">
                                <span class="material-icons ${isGanhos ? "text-emerald-400" : "text-rose-400"}">account_balance_wallet</span>
                                TOTAL ${isGanhos ? "CRÉDITOS" : "DÉBITOS"}
                            </span>
                            <span class="text-xl font-extrabold ${isGanhos ? "text-emerald-400" : "text-rose-400"}">R$ ${total.toFixed(2).replace(".", ",")}</span>
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
    if (rodada !== "Manual") {
        obj[nome].rodadas.push(rodada);
    } else {
        obj[nome].rodadas = "Ajuste manual";
    }
}

if (window.Log) Log.info("[EXTRATO-UI] ✅ Módulo v8.5 (tratamento de erros melhorado)");

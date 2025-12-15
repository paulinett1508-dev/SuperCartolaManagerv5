// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v10.1 ACERTOS FINANCEIROS
// =====================================================
// ✅ v10.1: ACERTOS FINANCEIROS - Exibe pagamentos/recebimentos
//    - Nova seção "Acertos Financeiros" após histórico de rodadas
//    - Mostra saldo separado: temporada vs acertos
//    - Indicadores visuais de pagamentos e recebimentos
// ✅ v10.0: Novo design visual baseado em referência
//    - Cards com cores de fundo distintas: #0D1F18 (ganho), #1F0D0D (perda), #1c1c1e (neutro)
//    - Barra lateral esquerda como indicador visual (verde/vermelho)
//    - Badges com novo estilo: MITO (amarelo), MICO (vermelho), G/Z
//    - Layout em 2 linhas quando tem Top10
//    - Saldo com cores: text-green-400 / text-red-400 / text-zinc-500
// ✅ v9.1: Layout horizontal e nomes completos
// ✅ v9.0: Redesign - Badge BANCO unificado com valor
// ✅ v8.7: CORREÇÃO CRÍTICA - Campos manuais não duplicados

if (window.Log) Log.info("[EXTRATO-UI] 🎨 Módulo de UI v10.1 ACERTOS FINANCEIROS");

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

// ===== v8.8: CALCULAR POSIÇÃO NO TOP10 PELO VALOR =====
// Deriva a posição no ranking histórico baseado no valor financeiro
function calcularPosicaoTop10(valor, ligaId) {
    const absValor = Math.abs(valor);

    // SuperCartola: 30, 28, 26, 24, 22, 20, 18, 16, 14, 12
    const LIGA_SUPERCARTOLA = "684cb1c8af923da7c7df51de";
    // Sobral: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
    const LIGA_SOBRAL = "684d821cf1a7ae16d1f89572";

    if (ligaId === LIGA_SUPERCARTOLA) {
        // SuperCartola: valor = 30 - (pos-1)*2 → pos = (30 - valor)/2 + 1
        const pos = Math.round((30 - absValor) / 2) + 1;
        return Math.min(Math.max(pos, 1), 10);
    } else {
        // Sobral: valor = 11 - pos → pos = 11 - valor
        const pos = 11 - absValor;
        return Math.min(Math.max(pos, 1), 10);
    }
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

    // ✅ v10.1: Separar saldo da temporada e saldo de acertos
    const saldoTemporada = resumoBase.saldo_temporada || resumoBase.saldo_final || resumoBase.saldo || 0;
    const saldoAcertos = resumoBase.saldo_acertos || 0;
    const saldo = saldoTemporada + saldoAcertos;

    // ✅ v10.1: Extrair acertos financeiros
    const acertos = extrato.acertos || { lista: [], resumo: {} };
    const listaAcertos = acertos.lista || [];
    const resumoAcertos = acertos.resumo || {};

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

        <!-- ✅ v10.1: Acertos Financeiros -->
        ${renderizarSecaoAcertos(listaAcertos, resumoAcertos, saldoTemporada, saldoAcertos)}

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

// ===== v10.0: CARDS DE RODADAS - NOVO DESIGN COM BARRA LATERAL =====
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

            // ===== v10.0: CORES DO CARD E BARRA LATERAL =====
            const ultimaPosicao = faixas.debito?.fim || faixas.totalTimes;
            const isMito = r.posicao === 1;
            const isMico = r.posicao === ultimaPosicao;

            // Cores de fundo e borda baseadas no tipo
            let cardBg, cardBorder, barraLateral;

            if (tipoZona === "ganho" || saldo > 0) {
                // Card positivo - fundo verde escuro
                cardBg = "bg-[#0D1F18]";
                cardBorder = "border-green-900/30";
                // Barra: sólida para MITO, semi-transparente para G2+
                barraLateral = isMito ? "bg-green-500" : "bg-green-500/50";
            } else if (tipoZona === "perda" || saldo < 0) {
                // Card negativo - fundo vermelho escuro
                cardBg = "bg-[#1F0D0D]";
                cardBorder = "border-red-900/30";
                // Barra: sólida para MICO, semi-transparente para Z2+
                barraLateral = isMico ? "bg-red-600" : "bg-red-800/50";
            } else {
                // Card neutro
                cardBg = "bg-[#1c1c1e]";
                cardBorder = "border-zinc-800";
                barraLateral = null; // Sem barra
            }

            // ===== v10.0: BADGES COM NOVO ESTILO =====
            const bonusFormatado = Math.abs(bonusOnus).toFixed(2).replace(".", ",");
            const sinalBonus = bonusOnus > 0 ? "+" : "-";

            // Badge BANCO: MITO/MICO ou G/Z
            let badgeBanco = "";
            if (isMito && bonusOnus !== 0) {
                // MITO - amarelo/dourado
                badgeBanco = `<span class="inline-flex items-center gap-1 text-[10px] bg-yellow-900/40 text-yellow-400 border border-yellow-700/30 px-2 py-1 rounded font-bold">
                    <span class="material-symbols-outlined text-[12px]">emoji_events</span>
                    MITO ${sinalBonus}${bonusFormatado}
                </span>`;
            } else if (isMico && bonusOnus !== 0) {
                // MICO - vermelho
                badgeBanco = `<span class="inline-flex items-center gap-1 text-[10px] bg-red-900/40 text-red-400 border border-red-700/30 px-2 py-1 rounded font-bold">
                    <span class="material-symbols-outlined text-[12px]">thumb_down</span>
                    MICO ${sinalBonus}${bonusFormatado}
                </span>`;
            } else if (zonaLabel && bonusOnus !== 0) {
                // Zona G/Z
                if (tipoZona === "ganho") {
                    badgeBanco = `<span class="inline-flex items-center text-[10px] bg-green-900/40 text-green-400 border border-green-700/30 px-2 py-1 rounded font-bold">
                        ${zonaLabel} ${sinalBonus}${bonusFormatado}
                    </span>`;
                } else {
                    badgeBanco = `<span class="inline-flex items-center text-[10px] bg-red-900/30 text-red-300 border border-red-800/30 px-2 py-1 rounded font-bold">
                        ${zonaLabel} ${sinalBonus}${bonusFormatado}
                    </span>`;
                }
            }

            // Badge TOP10 histórico - "Xº MELHOR MITO" ou "Xº PIOR MICO"
            let badgeTop10 = "";
            if (top10 !== 0) {
                const posTop10 = calcularPosicaoTop10(top10, ligaId);
                const valorTop10 = Math.abs(top10).toFixed(2).replace(".", ",");
                if (top10 > 0) {
                    badgeTop10 = `<span class="inline-flex items-center gap-1 text-[10px] bg-yellow-900/20 text-yellow-500 border border-yellow-800/20 px-2 py-0.5 rounded font-medium">
                        <span class="material-symbols-outlined text-[12px]">military_tech</span>
                        ${posTop10}º MELHOR MITO +${valorTop10}
                    </span>`;
                } else {
                    badgeTop10 = `<span class="inline-flex items-center gap-1 text-[10px] bg-rose-900/20 text-rose-400 border border-rose-800/20 px-2 py-0.5 rounded font-medium">
                        <span class="material-symbols-outlined text-[12px]">sentiment_sad</span>
                        ${posTop10}º PIOR MICO -${valorTop10}
                    </span>`;
                }
            }

            // Itens extras inline (Pontos Corridos e Mata-Mata)
            const extrasInline = [];

            if (pontosCorridos !== 0) {
                const corPC = pontosCorridos > 0 ? "text-green-400" : "text-red-400";
                const sinalPC = pontosCorridos > 0 ? "+" : "";
                extrasInline.push(
                    `<span class="inline-flex items-center gap-1 text-[10px] ${corPC}">
                        <span class="w-1 h-1 rounded-full bg-amber-400"></span>
                        <span class="text-amber-300">Pontos Corridos</span> ${sinalPC}${pontosCorridos.toFixed(2).replace(".", ",")}
                    </span>`
                );
            }

            if (mataMata !== 0) {
                const corMM = mataMata > 0 ? "text-green-400" : "text-red-400";
                const sinalMM = mataMata > 0 ? "+" : "";
                extrasInline.push(
                    `<span class="inline-flex items-center gap-1 text-[10px] ${corMM}">
                        <span class="w-1 h-1 rounded-full bg-sky-400"></span>
                        <span class="text-sky-300">Mata-Mata</span> ${sinalMM}${mataMata.toFixed(2).replace(".", ",")}
                    </span>`
                );
            }

            // Texto "Sem movimentação" para rodadas neutras
            const semMovimentacao = (saldo === 0 && !badgeBanco && !badgeTop10 && extrasInline.length === 0)
                ? `<span class="text-xs text-zinc-500">Sem movimentação</span>` : "";

            // ===== v10.0: LAYOUT COM BARRA LATERAL =====
            // Se tem Top10, usar layout em 2 linhas
            const temTop10 = badgeTop10 !== "";

            if (temTop10) {
                // Layout 2 linhas para cards com Top10
                return `
                <div class="${cardBg} rounded-xl border ${cardBorder} p-4 relative overflow-hidden">
                    ${barraLateral ? `<div class="absolute left-0 top-0 bottom-0 w-1 ${barraLateral}"></div>` : ""}
                    <div class="flex justify-between items-start">
                        <div class="flex flex-col space-y-2">
                            <div class="flex items-center space-x-3">
                                <span class="text-white font-bold text-sm w-8">R${r.rodada}</span>
                                ${badgeBanco}
                            </div>
                            <div class="ml-11">
                                ${badgeTop10}
                            </div>
                            ${extrasInline.length > 0 ? `<div class="flex items-center gap-2 ml-11 flex-wrap">${extrasInline.join("")}</div>` : ""}
                        </div>
                        <span class="text-lg font-bold ${saldo === 0 ? "text-zinc-500" : positivo ? "text-green-400" : "text-red-400"}">${saldo > 0 ? "+" : ""}${saldoFormatado}</span>
                    </div>
                </div>
            `;
            } else {
                // Layout 1 linha para cards simples
                return `
                <div class="${cardBg} rounded-xl border ${cardBorder} p-4 relative overflow-hidden">
                    ${barraLateral ? `<div class="absolute left-0 top-0 bottom-0 w-1 ${barraLateral}"></div>` : ""}
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-3 flex-wrap gap-y-1">
                            <span class="text-white font-bold text-sm w-8">R${r.rodada}</span>
                            ${badgeBanco}
                            ${semMovimentacao}
                            ${extrasInline.join("")}
                        </div>
                        <span class="text-lg font-bold ${saldo === 0 ? "text-zinc-500" : positivo ? "text-green-400" : "text-red-400"}">${saldo > 0 ? "+" : ""}${saldoFormatado}</span>
                    </div>
                </div>
            `;
            }
        })
        .join("");
}

// ===== v10.1: SEÇÃO DE ACERTOS FINANCEIROS =====
function renderizarSecaoAcertos(listaAcertos, resumoAcertos, saldoTemporada, saldoAcertos) {
    // Se não tem acertos, não mostrar seção
    if (!listaAcertos || listaAcertos.length === 0) {
        // Mostrar só se tiver saldo de temporada diferente de zero
        if (saldoTemporada === 0) return "";

        // Card resumo simples quando não há acertos
        return `
            <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-symbols-outlined text-amber-400 text-xl">payments</span>
                    <h3 class="text-base font-bold text-white">Situação Financeira</h3>
                </div>
                <div class="bg-white/5 rounded-lg p-3">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-white/70">Saldo da Temporada</span>
                        <span class="text-lg font-bold ${saldoTemporada >= 0 ? "text-emerald-400" : "text-rose-400"}">
                            ${saldoTemporada >= 0 ? "+" : ""}R$ ${Math.abs(saldoTemporada).toFixed(2).replace(".", ",")}
                        </span>
                    </div>
                    <p class="text-xs text-white/40 mt-2">
                        ${saldoTemporada > 0
                            ? "Você tem crédito para receber"
                            : saldoTemporada < 0
                                ? "Você tem débito a pagar"
                                : "Você está quitado"}
                    </p>
                </div>
            </div>
        `;
    }

    const totalPago = resumoAcertos.totalPago || 0;
    const totalRecebido = resumoAcertos.totalRecebido || 0;
    const saldoFinal = saldoTemporada + saldoAcertos;
    const quitado = Math.abs(saldoFinal) < 0.01;

    // Ordenar acertos por data (mais recente primeiro)
    const acertosOrdenados = [...listaAcertos].sort((a, b) =>
        new Date(b.data || 0) - new Date(a.data || 0)
    );

    return `
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-amber-400 text-xl">payments</span>
                <h3 class="text-base font-bold text-white">Acertos Financeiros</h3>
                <span class="text-xs text-white/50 ml-auto">${listaAcertos.length} acerto(s)</span>
            </div>

            <!-- Resumo -->
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-rose-400 text-lg">arrow_downward</span>
                    <p class="text-sm font-bold text-rose-400">-R$ ${totalPago.toFixed(2).replace(".", ",")}</p>
                    <p class="text-[10px] text-white/50">Pago</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-emerald-400 text-lg">arrow_upward</span>
                    <p class="text-sm font-bold text-emerald-400">+R$ ${totalRecebido.toFixed(2).replace(".", ",")}</p>
                    <p class="text-[10px] text-white/50">Recebido</p>
                </div>
            </div>

            <!-- Lista de acertos -->
            <div class="space-y-2 mb-4">
                ${acertosOrdenados.map(acerto => {
                    const isPagamento = acerto.tipo === "pagamento";
                    const valor = Math.abs(acerto.valor || 0);
                    const dataFormatada = acerto.data
                        ? new Date(acerto.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                        : "--/--";

                    // Ícone do método de pagamento
                    const iconMetodo = {
                        pix: "qr_code_2",
                        transferencia: "account_balance",
                        dinheiro: "payments",
                        outro: "receipt"
                    }[acerto.metodoPagamento] || "receipt";

                    return `
                        <div class="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center ${isPagamento ? "bg-rose-500/20" : "bg-emerald-500/20"}">
                                    <span class="material-symbols-outlined text-sm ${isPagamento ? "text-rose-400" : "text-emerald-400"}">
                                        ${isPagamento ? "arrow_downward" : "arrow_upward"}
                                    </span>
                                </div>
                                <div>
                                    <p class="text-sm text-white font-medium">${acerto.descricao || (isPagamento ? "Pagamento" : "Recebimento")}</p>
                                    <p class="text-[10px] text-white/40 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[10px]">${iconMetodo}</span>
                                        ${dataFormatada}
                                    </p>
                                </div>
                            </div>
                            <span class="text-sm font-bold ${isPagamento ? "text-rose-400" : "text-emerald-400"}">
                                ${isPagamento ? "-" : "+"}R$ ${valor.toFixed(2).replace(".", ",")}
                            </span>
                        </div>
                    `;
                }).join("")}
            </div>

            <!-- Card Saldo Final -->
            <div class="${quitado ? "bg-emerald-500/10 border-emerald-500/30" : saldoFinal >= 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-rose-500/10 border-rose-500/30"} rounded-xl p-4 border">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-white/50">Saldo Temporada</span>
                    <span class="text-sm ${saldoTemporada >= 0 ? "text-emerald-400" : "text-rose-400"}">
                        ${saldoTemporada >= 0 ? "+" : ""}R$ ${Math.abs(saldoTemporada).toFixed(2).replace(".", ",")}
                    </span>
                </div>
                <div class="flex justify-between items-center mb-3">
                    <span class="text-xs text-white/50">Acertos</span>
                    <span class="text-sm ${saldoAcertos >= 0 ? "text-emerald-400" : "text-rose-400"}">
                        ${saldoAcertos >= 0 ? "+" : ""}R$ ${Math.abs(saldoAcertos).toFixed(2).replace(".", ",")}
                    </span>
                </div>
                <div class="border-t border-white/10 pt-3">
                    <div class="flex justify-between items-center">
                        <span class="flex items-center gap-2 text-sm font-bold text-white">
                            <span class="material-icons ${quitado ? "text-emerald-400" : saldoFinal >= 0 ? "text-amber-400" : "text-rose-400"}">
                                ${quitado ? "check_circle" : "account_balance_wallet"}
                            </span>
                            ${quitado ? "QUITADO" : saldoFinal >= 0 ? "A RECEBER" : "A PAGAR"}
                        </span>
                        <span class="text-xl font-extrabold ${quitado ? "text-emerald-400" : saldoFinal >= 0 ? "text-amber-400" : "text-rose-400"}">
                            R$ ${Math.abs(saldoFinal).toFixed(2).replace(".", ",")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
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

if (window.Log) Log.info("[EXTRATO-UI] ✅ Módulo v10.1 carregado com sucesso (ACERTOS)");

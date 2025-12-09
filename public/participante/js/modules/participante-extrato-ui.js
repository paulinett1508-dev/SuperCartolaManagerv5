// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v8.1 CAMPOS MANUAIS
// =====================================================
// ✅ v8.1: Campos manuais incluídos no detalhamento CRÉDITOS/DÉBITOS
//    - camposEditaveis integrados no popup de detalhamento
//    - Cards compactos sem quebra de linha
//    - Cálculo do resumo inclui campos manuais
// ✅ v8.0: Design system consistente com boas-vindas
//    - Fundo escuro uniforme (bg-surface-dark)
//    - Cores neutras (white/XX ao invés de zinc/gray)
//    - Primary color (text-primary ao invés de text-orange-XXX)
//    - Cards arredondados (rounded-xl)
//    - Sem bordas e gradientes excessivos
// ✅ v7.1: Card "Seu Desempenho" com métricas completas

if (window.Log) Log.info("[EXTRATO-UI] 🎨 Módulo de UI v8.1 Campos Manuais");

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
    // ✅ v8.1: Calcular resumo incluindo campos manuais
    const resumoBase = extrato.resumo || {
        saldo: 0,
        totalGanhos: 0,
        totalPerdas: 0,
    };

    // Processar campos manuais (podem vir como camposManuais ou camposEditaveis)
    const camposManuais =
        extrato.camposManuais || extrato.camposEditaveis || [];
    let totalCamposManuaisPositivos = 0;
    let totalCamposManuaisNegativos = 0;

    if (Array.isArray(camposManuais)) {
        camposManuais.forEach((campo) => {
            const valor = parseFloat(campo.valor) || 0;
            if (valor > 0) totalCamposManuaisPositivos += valor;
            if (valor < 0) totalCamposManuaisNegativos += valor;
        });
    }

    // Calcular totais incluindo campos manuais
    const totalGanhos =
        (resumoBase.totalGanhos || 0) + totalCamposManuaisPositivos;
    const totalPerdas =
        Math.abs(resumoBase.totalPerdas || 0) +
        Math.abs(totalCamposManuaisNegativos);
    const saldo =
        (resumoBase.saldo_final || resumoBase.saldo || 0) +
        totalCamposManuaisPositivos +
        totalCamposManuaisNegativos;

    const saldoPositivo = saldo >= 0;
    const saldoFormatado = `R$ ${Math.abs(saldo).toFixed(2).replace(".", ",")}`;
    const statusTexto = saldoPositivo ? "A RECEBER" : "A PAGAR";

    // Detectar liga - múltiplas fontes
    const ligaId =
        extrato.liga_id ||
        extrato.ligaId ||
        window.PARTICIPANTE_IDS?.ligaId ||
        window.participanteData?.ligaId ||
        "";

    // Debug: verificar se ligaId está chegando
    if (window.Log) Log.info(
        "[EXTRATO-UI] 🔍 LigaId detectado:",
        ligaId,
        "| Config existe:",
        !!FAIXAS_PREMIACAO[ligaId],
        "| Campos manuais:",
        camposManuais.length,
    );

    // Salvar para uso global
    window.ligaIdAtual = ligaId;

    // Ordenar rodadas decrescente (mais recente primeiro)
    const rodadasOrdenadas = [...extrato.rodadas].sort(
        (a, b) => b.rodada - a.rodada,
    );

    container.innerHTML = `
        <!-- Card Saldo Principal -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-3xl ${saldoPositivo ? "text-green-400" : "text-red-400"}">account_balance_wallet</span>
                    <div>
                        <p class="text-xs font-medium uppercase text-white/70">Saldo Financeiro</p>
                        <p class="text-2xl font-bold ${saldoPositivo ? "text-green-400" : "text-red-400"}">${saldoPositivo ? "+" : "-"}${saldoFormatado}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="${saldoPositivo ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} text-[10px] font-semibold px-2 py-1 rounded-full">${statusTexto}</span>
                    <button id="btnRefreshExtrato" class="p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-lg">sync</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Cards Ganhos/Perdas - v8.1: Layout compacto sem quebra -->
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div onclick="window.mostrarDetalhamentoGanhos()" class="bg-surface-dark p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-icons text-green-400 text-base flex-shrink-0">arrow_upward</span>
                    <p class="text-xs text-white/70 uppercase truncate">Créditos</p>
                </div>
                <span class="text-sm font-bold text-green-400 whitespace-nowrap ml-1">+${totalGanhos.toFixed(2).replace(".", ",")}</span>
            </div>
            <div onclick="window.mostrarDetalhamentoPerdas()" class="bg-surface-dark p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-icons text-red-400 text-base flex-shrink-0">arrow_downward</span>
                    <p class="text-xs text-white/70 uppercase truncate">Débitos</p>
                </div>
                <span class="text-sm font-bold text-red-400 whitespace-nowrap ml-1">-${totalPerdas.toFixed(2).replace(".", ",")}</span>
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

        <!-- Histórico por Rodada -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-primary">history</span>
                <h3 class="text-sm font-bold text-white">Histórico por Rodada</h3>
                <span class="text-xs text-white/50 ml-auto">${rodadasOrdenadas.length} rodadas</span>
            </div>
            <div class="space-y-2">
                ${renderizarCardsRodadas(rodadasOrdenadas, ligaId)}
            </div>
        </div>

        <!-- Card Seu Desempenho (após rodadas) -->
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

// ===== CARDS DE RODADAS =====
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
            const tipoFaixa = classificarPosicao(r.posicao, faixas);

            const saldo =
                (r.bonusOnus || 0) +
                (r.pontosCorridos || 0) +
                (r.mataMata || 0) +
                (r.top10 || 0);
            const saldoFormatado = saldo.toFixed(2).replace(".", ",");
            const positivo = saldo >= 0;

            // Ícone e cor por faixa
            let faixaIcon = "remove";
            let faixaColor = "text-white/40";
            let bgColor = "bg-white/5";

            if (tipoFaixa === "credito") {
                faixaIcon = "arrow_upward";
                faixaColor = "text-green-400";
                bgColor = "bg-green-500/10";
            } else if (tipoFaixa === "debito") {
                faixaIcon = "arrow_downward";
                faixaColor = "text-red-400";
                bgColor = "bg-red-500/10";
            }

            // Badge TOP10
            let badgeTop10 = "";
            if (r.top10 > 0) {
                badgeTop10 = `<span class="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-semibold">MITO</span>`;
            } else if (r.top10 < 0) {
                badgeTop10 = `<span class="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-semibold">MICO</span>`;
            }

            return `
                <div class="${bgColor} rounded-lg p-3 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
                            <span class="material-icons ${faixaColor} text-sm">${faixaIcon}</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-semibold text-white">R${r.rodada}</span>
                                ${r.posicao ? `<span class="text-[10px] text-white/50">${r.posicao}º</span>` : ""}
                                ${badgeTop10}
                            </div>
                            <p class="text-[10px] text-white/40">${formatarDetalhesRodada(r)}</p>
                        </div>
                    </div>
                    <span class="text-sm font-bold ${positivo ? "text-green-400" : "text-red-400"}">${positivo ? "+" : ""}${saldoFormatado}</span>
                </div>
            `;
        })
        .join("");
}

function formatarDetalhesRodada(r) {
    const partes = [];
    if (r.bonusOnus && r.bonusOnus !== 0) partes.push("Posição");
    if (r.pontosCorridos && r.pontosCorridos !== 0) partes.push("PC");
    if (r.mataMata && r.mataMata !== 0) partes.push("MM");
    if (r.top10 && r.top10 !== 0) partes.push("TOP10");
    return partes.length > 0 ? partes.join(" · ") : "Sem movimentação";
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
                    <span class="material-icons text-yellow-400 text-lg">star</span>
                    <p class="text-lg font-bold text-white">${totalMito}</p>
                    <p class="text-[10px] text-white/50">Mitos</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-red-400 text-lg">sentiment_very_dissatisfied</span>
                    <p class="text-lg font-bold text-white">${totalMico}</p>
                    <p class="text-[10px] text-white/50">Micos</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-green-400 text-lg">trending_up</span>
                    <p class="text-lg font-bold text-white">${zonaCredito}</p>
                    <p class="text-[10px] text-white/50">Zona Crédito</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-red-400 text-lg">trending_down</span>
                    <p class="text-lg font-bold text-white">${zonaDebito}</p>
                    <p class="text-[10px] text-white/50">Zona Débito</p>
                </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3">
                <div class="bg-green-500/10 rounded-lg p-2 text-center">
                    <p class="text-[10px] text-white/50">Melhor Rodada</p>
                    <p class="text-sm font-bold text-green-400">R${melhorRodada.rodada} (+${melhorRodada.saldo.toFixed(2).replace(".", ",")})</p>
                </div>
                <div class="bg-red-500/10 rounded-lg p-2 text-center">
                    <p class="text-[10px] text-white/50">Pior Rodada</p>
                    <p class="text-sm font-bold text-red-400">R${piorRodada.rodada} (${piorRodada.saldo.toFixed(2).replace(".", ",")})</p>
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

    // Ordenar por rodada (crescente para o gráfico)
    let dadosOrdenados = [...rodadas].sort((a, b) => a.rodada - b.rodada);

    // Aplicar filtro de range
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

    // Calcular saldo acumulado
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

    // Calcular escala
    const valores = pontos.map((p) => p.saldo);
    const minVal = Math.min(...valores, 0);
    const maxVal = Math.max(...valores, 0);
    const range_val = maxVal - minVal || 1;

    const width = 300;
    const height = 140;
    const padding = 10;

    // Gerar path
    const pathPoints = pontos.map((p, i) => {
        const x =
            padding +
            (i / Math.max(pontos.length - 1, 1)) * (width - 2 * padding);
        const y =
            height -
            padding -
            ((p.saldo - minVal) / range_val) * (height - 2 * padding);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    path.setAttribute("d", pathPoints.join(" "));

    // Área preenchida
    if (pontos.length > 0) {
        const firstX = padding;
        const lastX =
            padding +
            ((pontos.length - 1) / Math.max(pontos.length - 1, 1)) *
                (width - 2 * padding);
        area.setAttribute(
            "d",
            `${pathPoints.join(" ")} L ${lastX.toFixed(1)} ${height - padding} L ${firstX.toFixed(1)} ${height - padding} Z`,
        );
    }

    // Labels
    const labelRodadas = [
        pontos[0],
        pontos[Math.floor(pontos.length / 2)],
        pontos[pontos.length - 1],
    ].filter((p, i, arr) => arr.indexOf(p) === i);

    labels.innerHTML = labelRodadas
        .map((p) => `<span>R${p.rodada}</span>`)
        .join("");
}

function configurarFiltrosGrafico(rodadas) {
    document.querySelectorAll(".filtro-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filtro-btn").forEach((b) => {
                b.classList.remove("bg-primary/80", "font-semibold");
                b.classList.add("text-white/50");
            });
            btn.classList.add("bg-primary/80", "font-semibold");
            btn.classList.remove("text-white/50");

            renderizarGraficoEvolucao(rodadas, btn.dataset.range);
        });
    });
}

function configurarBotaoRefresh() {
    const btn = document.getElementById("btnRefreshExtrato");
    if (btn) {
        btn.addEventListener("click", () => {
            if (typeof window.forcarRefreshExtratoParticipante === "function") {
                window.forcarRefreshExtratoParticipante();
            }
        });
    }
}

// ===== ERRO =====
function renderizarErro() {
    return `
        <div class="text-center py-8">
            <span class="material-icons text-4xl text-red-400 mb-2 block">error_outline</span>
            <p class="text-white/70">Erro ao carregar extrato</p>
            <button onclick="window.forcarRefreshExtratoParticipante()" class="mt-4 px-4 py-2 bg-primary rounded-lg text-white text-sm">
                Tentar novamente
            </button>
        </div>
    `;
}

// ===== DETALHAMENTO (CRÉDITOS/DÉBITOS) =====
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

    // ✅ v8.1: Incluir campos manuais no detalhamento
    const camposManuais =
        extrato.camposManuais || extrato.camposEditaveis || [];

    if (Array.isArray(camposManuais) && camposManuais.length > 0) {
        camposManuais.forEach((campo) => {
            const valor = parseFloat(campo.valor) || 0;
            const nome = campo.nome || "Campo Manual";

            if (isGanhos && valor > 0) {
                // Adicionar ao total de ganhos
                somaGanhos += valor;
                addCategoria(categorias, nome, valor, "Manual", "edit");
            } else if (!isGanhos && valor < 0) {
                // Adicionar ao total de perdas
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
                            <span class="material-icons ${isGanhos ? "text-green-400" : "text-red-400"}">${icon}</span>
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
                            <p class="text-[10px] text-white/50">${isGanhos ? "Zona +" : "Zona -"}</p>
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
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center ${isGanhos ? "bg-green-500/20" : "bg-red-500/20"}">
                                        <span class="material-icons text-sm ${isGanhos ? "text-green-400" : "text-red-400"}">${cat.icon}</span>
                                    </div>
                                    <span class="text-sm font-medium text-white">${cat.nome}</span>
                                </div>
                                <span class="text-base font-bold ${isGanhos ? "text-green-400" : "text-red-400"}">R$ ${cat.valor.toFixed(2).replace(".", ",")}</span>
                            </div>
                            <div class="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                                <div class="h-full rounded-full ${isGanhos ? "bg-green-500" : "bg-red-500"}" style="width: ${cat.percentual}%;"></div>
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
                    <div class="rounded-xl p-4 ${isGanhos ? "bg-green-500/10" : "bg-red-500/10"}">
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

    // Se rodada for "Manual", não adiciona ao array
    if (rodada !== "Manual") {
        obj[nome].rodadas.push(rodada);
    } else {
        // Para campos manuais, usar label especial
        obj[nome].rodadas = "Ajuste manual";
    }
}

if (window.Log) Log.info("[EXTRATO-UI] ✅ Módulo v8.1 Campos Manuais pronto");

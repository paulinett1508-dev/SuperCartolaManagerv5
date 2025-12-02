// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v2.0 PRO
// Design profissional com Material Icons
// =====================================================

console.log("[EXTRATO-UI] 🎨 Módulo de UI v2.0 PRO carregado");

// ===== CONSTANTES DE DESIGN =====
const COLORS = {
    primary: "#ff5c00",
    primaryLight: "rgba(255, 92, 0, 0.15)",
    primaryBorder: "rgba(255, 92, 0, 0.4)",
    green: "#22c55e",
    greenBg: "rgba(34, 197, 94, 0.15)",
    greenBorder: "rgba(34, 197, 94, 0.4)",
    red: "#ef4444",
    redBg: "rgba(239, 68, 68, 0.15)",
    redBorder: "rgba(239, 68, 68, 0.4)",
    yellow: "#eab308",
    text: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    textMuted: "rgba(255, 255, 255, 0.5)",
    surface: "#1c1c1c",
    surfaceLight: "#2a2a2a",
    border: "rgba(255, 255, 255, 0.1)",
};

export function renderizarExtratoParticipante(extrato, participanteId) {
    const validacao = {
        extratoValido: !!extrato,
        temRodadas: !!extrato?.rodadas,
        qtdRodadas: extrato?.rodadas?.length || 0,
        temResumo: !!extrato?.resumo,
    };

    if (!validacao.extratoValido || validacao.qtdRodadas === 0) {
        console.warn("[EXTRATO-UI] ⚠️ Problema na validação:", validacao);
    }

    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) {
        console.error("[EXTRATO-UI] ❌ Container não encontrado!");
        return;
    }

    if (!extrato || !extrato.rodadas || !Array.isArray(extrato.rodadas)) {
        container.innerHTML = renderizarErro();
        return;
    }

    // Armazenar globalmente para popups
    window.extratoAtual = extrato;

    // Configurar botão de refresh
    setTimeout(() => configurarBotaoRefresh(), 100);

    // Renderizar tabela profissional
    container.innerHTML = renderizarTabelaPro(extrato);

    // Atualizar cards do header
    atualizarCardsHeader(extrato.resumo);

    // Renderizar gráfico de evolução
    renderizarGraficoEvolucao(extrato.rodadas);
    configurarFiltrosGrafico(extrato.rodadas);
}

// ===== GRÁFICO DE EVOLUÇÃO FINANCEIRA =====
function renderizarGraficoEvolucao(rodadas, range = "all") {
    if (!rodadas || rodadas.length === 0) return;

    // Filtrar rodadas pelo range
    let dadosFiltrados = [...rodadas];
    if (range === "10") {
        dadosFiltrados = rodadas.slice(-10);
    } else if (range === "5") {
        dadosFiltrados = rodadas.slice(-5);
    }

    const pathEl = document.getElementById("graficoPath");
    const areaEl = document.getElementById("graficoArea");
    const labelsEl = document.getElementById("graficoLabels");

    if (!pathEl || !areaEl) return;

    // Extrair saldos
    const saldos = dadosFiltrados.map((r) => parseFloat(r.saldo) || 0);

    if (saldos.length === 0) return;

    // Calcular limites
    const minSaldo = Math.min(...saldos, 0);
    const maxSaldo = Math.max(...saldos, 0);
    const range_val = Math.max(maxSaldo - minSaldo, 1);

    // Dimensões do SVG
    const width = 300;
    const height = 140;
    const padding = 10;

    // Gerar pontos
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

    // Criar path da linha
    let pathD = `M${pontos[0].x} ${pontos[0].y}`;
    for (let i = 1; i < pontos.length; i++) {
        pathD += ` L${pontos[i].x} ${pontos[i].y}`;
    }

    // Criar path da área (com fechamento embaixo)
    let areaD =
        pathD +
        ` L${pontos[pontos.length - 1].x} ${height} L${pontos[0].x} ${height} Z`;

    pathEl.setAttribute("d", pathD);
    areaEl.setAttribute("d", areaD);

    // Atualizar labels
    if (labelsEl) {
        const numLabels = Math.min(5, dadosFiltrados.length);
        const step = Math.floor(dadosFiltrados.length / numLabels);

        let labelsHTML = "";
        for (let i = 0; i < numLabels; i++) {
            const idx = Math.min(i * step, dadosFiltrados.length - 1);
            labelsHTML += `<span>${dadosFiltrados[idx].rodada}ª</span>`;
        }
        // Adicionar última rodada se não estiver incluída
        if (numLabels > 1) {
            labelsHTML = "";
            const indices = [
                0,
                Math.floor(dadosFiltrados.length * 0.25),
                Math.floor(dadosFiltrados.length * 0.5),
                Math.floor(dadosFiltrados.length * 0.75),
                dadosFiltrados.length - 1,
            ];
            indices.forEach((idx) => {
                if (dadosFiltrados[idx]) {
                    labelsHTML += `<span>${dadosFiltrados[idx].rodada}ª</span>`;
                }
            });
        }
        labelsEl.innerHTML = labelsHTML;
    }
}

function configurarFiltrosGrafico(rodadas) {
    const filtros = document.querySelectorAll(".filtro-btn");

    filtros.forEach((btn) => {
        btn.addEventListener("click", () => {
            // Atualizar estado ativo
            filtros.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            // Re-renderizar gráfico
            const range = btn.dataset.range;
            renderizarGraficoEvolucao(rodadas, range);
        });
    });
}

function renderizarErro() {
    return `
        <div style="text-align: center; padding: 40px 20px; background: ${COLORS.redBg}; 
                    border-radius: 16px; border: 1px solid ${COLORS.redBorder};">
            <span class="material-icons" style="font-size: 48px; color: ${COLORS.red}; margin-bottom: 16px;">error_outline</span>
            <h3 style="color: ${COLORS.red}; margin-bottom: 12px; font-size: 16px;">Dados Inválidos</h3>
            <p style="color: ${COLORS.textSecondary}; margin-bottom: 20px; font-size: 13px;">A estrutura do extrato está incompleta.</p>
            <button onclick="window.forcarRefreshExtratoParticipante()" 
                    style="padding: 12px 24px; background: ${COLORS.primary}; 
                           color: white; border: none; border-radius: 8px; cursor: pointer; 
                           font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 8px;">
                <span class="material-icons" style="font-size: 18px;">sync</span>
                Tentar Novamente
            </button>
        </div>
    `;
}

function renderizarTabelaPro(extrato) {
    return `
        <div class="extrato-table-pro">
            <table class="tabela-extrato-pro">
                <thead>
                    <tr>
                        <th>ROD</th>
                        <th>POS</th>
                        <th>BÔNUS/ÔNUS</th>
                        <th>P.C</th>
                        <th>M-M</th>
                        <th>TOP10</th>
                        <th>SALDO</th>
                    </tr>
                </thead>
                <tbody>
                    ${renderizarLinhasRodadas(extrato.rodadas)}
                    ${renderizarLinhaTotal(extrato.resumo)}
                </tbody>
            </table>
        </div>

        <style>
        /* ===== TABELA PROFISSIONAL ===== */
        .extrato-table-pro {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .tabela-extrato-pro {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            font-family: 'Roboto', sans-serif;
        }

        .tabela-extrato-pro thead {
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .tabela-extrato-pro th {
            padding: 10px 6px;
            text-align: center;
            color: ${COLORS.primary};
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            background: ${COLORS.surface};
            border-bottom: 2px solid ${COLORS.primaryBorder};
        }

        .tabela-extrato-pro td {
            padding: 12px 6px;
            text-align: center;
            border-bottom: 1px solid ${COLORS.border};
            color: ${COLORS.textSecondary};
            font-size: 12px;
            vertical-align: middle;
        }

        .tabela-extrato-pro tbody tr:nth-child(even) {
            background: rgba(255, 255, 255, 0.02);
        }

        .tabela-extrato-pro tbody tr:active {
            background: ${COLORS.primaryLight};
        }

        /* ===== BADGES DE POSIÇÃO ===== */
        .badge-pos-pro {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 11px;
            white-space: nowrap;
        }

        .badge-pos-pro .material-icons {
            font-size: 14px;
        }

        .badge-mito {
            background: ${COLORS.green};
            color: white;
        }

        .badge-mico {
            background: ${COLORS.red};
            color: white;
        }

        .badge-top {
            background: ${COLORS.greenBg};
            color: ${COLORS.green};
            border: 1px solid ${COLORS.greenBorder};
        }

        .badge-z4 {
            background: ${COLORS.redBg};
            color: ${COLORS.red};
            border: 1px solid ${COLORS.redBorder};
        }

        .badge-normal {
            background: ${COLORS.greenBg};
            color: ${COLORS.green};
            border: 1px solid ${COLORS.greenBorder};
        }

        .badge-neutro {
            background: rgba(255, 255, 255, 0.1);
            color: ${COLORS.textMuted};
        }

        /* ===== VALORES ===== */
        .valor-positivo {
            color: ${COLORS.green};
            font-weight: 600;
        }

        .valor-negativo {
            color: ${COLORS.red};
            font-weight: 600;
        }

        .valor-zero {
            color: ${COLORS.textMuted};
        }

        /* ===== TOP10 CELL ===== */
        .top10-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        }

        .top10-label {
            display: flex;
            align-items: center;
            gap: 2px;
            font-size: 9px;
            font-weight: 600;
            line-height: 1;
        }

        .top10-label .material-icons {
            font-size: 12px;
        }

        /* ===== CÉLULA DE SALDO ===== */
        .saldo-cell-positivo {
            background: ${COLORS.greenBg};
        }

        .saldo-cell-negativo {
            background: ${COLORS.redBg};
        }

        /* ===== LINHA DE TOTAL ===== */
        .linha-total-pro {
            background: linear-gradient(135deg, ${COLORS.primaryLight} 0%, rgba(255, 92, 0, 0.05) 100%);
            border-top: 2px solid ${COLORS.primary};
        }

        .linha-total-pro td {
            font-weight: 700;
            color: ${COLORS.text};
            padding: 14px 6px;
        }

        .total-label {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .total-label .material-icons {
            font-size: 16px;
            color: ${COLORS.primary};
        }

        /* ===== RESPONSIVO ===== */
        @media (max-width: 400px) {
            .tabela-extrato-pro th,
            .tabela-extrato-pro td {
                padding: 8px 4px;
                font-size: 10px;
            }

            .badge-pos-pro {
                padding: 3px 6px;
                font-size: 10px;
            }

            .badge-pos-pro .material-icons {
                font-size: 12px;
            }
        }

        @media (min-width: 768px) {
            .tabela-extrato-pro th {
                font-size: 12px;
                padding: 14px 10px;
            }

            .tabela-extrato-pro td {
                padding: 16px 10px;
                font-size: 14px;
            }

            .badge-pos-pro {
                padding: 6px 12px;
                font-size: 12px;
            }
        }
        </style>
    `;
}

function renderizarLinhasRodadas(rodadas) {
    if (!rodadas || rodadas.length === 0) {
        return `<tr><td colspan="7" style="text-align: center; padding: 30px; color: ${COLORS.textMuted};">
            <span class="material-icons" style="font-size: 32px; margin-bottom: 8px; display: block;">inbox</span>
            Sem dados de rodadas
        </td></tr>`;
    }

    return rodadas
        .map((r) => {
            const saldoClass =
                r.saldo >= 0 ? "saldo-cell-positivo" : "saldo-cell-negativo";

            return `
            <tr>
                <td>${r.rodada}ª</td>
                <td>${formatarPosicaoPro(r)}</td>
                <td>${formatarValor(r.bonusOnus)}</td>
                <td>${formatarValor(r.pontosCorridos)}</td>
                <td>${formatarValor(r.mataMata)}</td>
                <td>${formatarTop10Pro(r)}</td>
                <td class="${saldoClass}">${formatarValor(r.saldo)}</td>
            </tr>
        `;
        })
        .join("");
}

function renderizarLinhaTotal(resumo) {
    if (!resumo) return "";

    return `
        <tr class="linha-total-pro">
            <td colspan="2">
                <div class="total-label">
                    <span class="material-icons">analytics</span>
                    TOTAIS
                </div>
            </td>
            <td>${formatarValor(resumo.bonus + resumo.onus)}</td>
            <td>${formatarValor(resumo.pontosCorridos)}</td>
            <td>${formatarValor(resumo.mataMata)}</td>
            <td>${formatarValor(resumo.top10 || 0)}</td>
            <td>-</td>
        </tr>
    `;
}

function formatarPosicaoPro(rodada) {
    if (!rodada.posicao) {
        return '<span class="badge-pos-pro badge-neutro">-</span>';
    }

    // MITO (1º lugar)
    if (rodada.posicao === 1 || rodada.isMito) {
        return `
            <span class="badge-pos-pro badge-mito">
                <span class="material-icons">military_tech</span>
                MITO
            </span>
        `;
    }

    // MICO (último lugar)
    if (rodada.posicao === rodada.totalTimes || rodada.isMico) {
        return `
            <span class="badge-pos-pro badge-mico">
                <span class="material-icons">sentiment_very_dissatisfied</span>
                MICO
            </span>
        `;
    }

    // Top 11 (posições 2-11)
    if (rodada.posicao >= 2 && rodada.posicao <= 11) {
        return `<span class="badge-pos-pro badge-top">${rodada.posicao}º</span>`;
    }

    // Z4 (posições ruins)
    if (rodada.totalTimes && rodada.posicao >= rodada.totalTimes - 3) {
        return `<span class="badge-pos-pro badge-z4">${rodada.posicao}º</span>`;
    }

    // Normal
    return `<span class="badge-pos-pro badge-normal">${rodada.posicao}º</span>`;
}

function formatarValor(valor) {
    const num = parseFloat(valor) || 0;

    if (num === 0) {
        return '<span class="valor-zero">-</span>';
    }

    const classe = num > 0 ? "valor-positivo" : "valor-negativo";
    const sinal = num > 0 ? "+" : "";
    const formatado = Math.abs(num).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return `<span class="${classe}">${sinal}${formatado}</span>`;
}

function formatarTop10Pro(rodada) {
    if (!rodada.top10 || rodada.top10 === 0) {
        return '<span class="valor-zero">-</span>';
    }

    const isMito = rodada.top10 > 0;
    const posicao = rodada.top10Posicao || 1;
    const cor = isMito ? COLORS.yellow : COLORS.red;
    const icon = isMito ? "emoji_events" : "sentiment_very_dissatisfied";
    const label = isMito ? "MAIOR" : "PIOR";

    return `
        <div class="top10-cell">
            <div class="top10-label" style="color: ${cor};">
                <span class="material-icons">${icon}</span>
                ${posicao}º ${label}
            </div>
            ${formatarValor(rodada.top10)}
        </div>
    `;
}

function atualizarCardsHeader(resumo) {
    if (!resumo) return;

    // Saldo Total
    const saldoEl = document.getElementById("saldoTotalHeader");
    const statusBadgeEl = document.getElementById("saldoStatusBadge");

    if (saldoEl) {
        const saldo = parseFloat(resumo.saldo) || 0;

        saldoEl.textContent = `R$ ${Math.abs(saldo).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

        if (statusBadgeEl) {
            const textEl = statusBadgeEl.querySelector(".status-text");

            if (saldo > 0) {
                saldoEl.style.color = COLORS.green;
                statusBadgeEl.style.borderColor = COLORS.greenBorder;
                statusBadgeEl.style.background = COLORS.greenBg;
                if (textEl) {
                    textEl.textContent = "A RECEBER";
                    textEl.style.color = COLORS.green;
                }
            } else if (saldo < 0) {
                saldoEl.style.color = COLORS.red;
                statusBadgeEl.style.borderColor = COLORS.redBorder;
                statusBadgeEl.style.background = COLORS.redBg;
                if (textEl) {
                    textEl.textContent = "A PAGAR";
                    textEl.style.color = COLORS.red;
                }
            } else {
                saldoEl.style.color = COLORS.textMuted;
                statusBadgeEl.style.borderColor = "rgba(160, 160, 160, 0.3)";
                statusBadgeEl.style.background = "rgba(160, 160, 160, 0.1)";
                if (textEl) {
                    textEl.textContent = "QUITADO";
                    textEl.style.color = COLORS.textMuted;
                }
            }
        }
    }

    // Card Ganhou
    const ganhosEl = document.getElementById("totalGanhosHeader");
    if (ganhosEl && resumo.totalGanhos !== undefined) {
        ganhosEl.textContent = `+R$ ${resumo.totalGanhos.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        )}`;
    }

    // Card Perdeu
    const perdeuEl = document.getElementById("totalPerdeuHeader");
    if (perdeuEl && resumo.totalPerdas !== undefined) {
        perdeuEl.textContent = `R$ ${Math.abs(
            resumo.totalPerdas,
        ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }
}

function configurarBotaoRefresh() {
    const btnRefresh = document.getElementById("btnRefreshExtrato");
    if (btnRefresh) {
        btnRefresh.onclick = async () => {
            if (btnRefresh.classList.contains("loading")) return;

            btnRefresh.classList.add("loading");

            try {
                await window.forcarRefreshExtratoParticipante();
            } catch (error) {
                console.error("[EXTRATO-UI] Erro ao atualizar:", error);
            } finally {
                btnRefresh.classList.remove("loading");
            }
        };
    }
}

export function mostrarLoading() {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando extrato...</p>
            </div>
        `;
    }
}

window.mostrarLoadingExtrato = mostrarLoading;

// ===== FUNÇÕES DE DETALHAMENTO (POPUPS) =====
window.mostrarDetalhamentoGanhos = function () {
    const extrato = window.extratoAtual;
    if (!extrato) return;

    const detalhes = calcularDetalhamentoGanhos(extrato);
    mostrarPopupDetalhamentoPro(
        "Detalhamento de Ganhos",
        detalhes,
        COLORS.green,
        "ganhos",
    );
};

window.mostrarDetalhamentoPerdas = function () {
    const extrato = window.extratoAtual;
    if (!extrato) return;

    const detalhes = calcularDetalhamentoPerdas(extrato);
    mostrarPopupDetalhamentoPro(
        "Detalhamento de Perdas",
        detalhes,
        COLORS.red,
        "perdas",
    );
};

function calcularDetalhamentoGanhos(extrato) {
    const detalhes = {
        bonusOnus: 0,
        pontosCorridos: 0,
        mataMata: 0,
        top10: 0,
        melhorMes: 0,
        camposEditaveis: 0,
        rodadas: {
            bonusOnus: [],
            pontosCorridos: [],
            mataMata: [],
            top10: [],
            melhorMes: [],
            camposEditaveis: [],
        },
        estatisticas: {
            totalRodadasComGanho: 0,
            mediaGanhoPorRodada: 0,
            rodadasMito: 0,
            rodadasTop11: 0,
        },
    };

    extrato.rodadas.forEach((r) => {
        // Bônus/Ônus positivo
        if (r.bonusOnus > 0) {
            detalhes.bonusOnus += r.bonusOnus;
            detalhes.rodadas.bonusOnus.push({
                rodada: r.rodada,
                valor: r.bonusOnus,
                posicao: r.posicao,
            });
        }

        // Pontos Corridos positivo
        if (r.pontosCorridos > 0) {
            detalhes.pontosCorridos += r.pontosCorridos;
            detalhes.rodadas.pontosCorridos.push({
                rodada: r.rodada,
                valor: r.pontosCorridos,
            });
        }

        // Mata-Mata positivo
        if (r.mataMata > 0) {
            detalhes.mataMata += r.mataMata;
            detalhes.rodadas.mataMata.push({
                rodada: r.rodada,
                valor: r.mataMata,
            });
        }

        // Top 10 positivo
        if (r.top10 > 0) {
            detalhes.top10 += r.top10;
            detalhes.rodadas.top10.push({
                rodada: r.rodada,
                valor: r.top10,
                posicao: r.top10Posicao,
            });
        }

        // Estatísticas
        if (r.posicao === 1 || r.isMito) detalhes.estatisticas.rodadasMito++;
        if (r.posicao >= 1 && r.posicao <= 11)
            detalhes.estatisticas.rodadasTop11++;
    });

    // Campos editáveis do resumo
    if (extrato.resumo.melhorMes > 0) {
        detalhes.melhorMes = extrato.resumo.melhorMes;
    }

    // Calcular estatísticas finais
    const totalGanho =
        detalhes.bonusOnus +
        detalhes.pontosCorridos +
        detalhes.mataMata +
        detalhes.top10 +
        detalhes.melhorMes;
    const rodadasComGanho = new Set([
        ...detalhes.rodadas.bonusOnus.map((r) => r.rodada),
        ...detalhes.rodadas.pontosCorridos.map((r) => r.rodada),
        ...detalhes.rodadas.mataMata.map((r) => r.rodada),
        ...detalhes.rodadas.top10.map((r) => r.rodada),
    ]).size;

    detalhes.estatisticas.totalRodadasComGanho = rodadasComGanho;
    detalhes.estatisticas.mediaGanhoPorRodada =
        rodadasComGanho > 0 ? totalGanho / rodadasComGanho : 0;

    return detalhes;
}

function calcularDetalhamentoPerdas(extrato) {
    const detalhes = {
        bonusOnus: 0,
        pontosCorridos: 0,
        mataMata: 0,
        top10: 0,
        rodadas: {
            bonusOnus: [],
            pontosCorridos: [],
            mataMata: [],
            top10: [],
        },
        estatisticas: {
            totalRodadasComPerda: 0,
            mediaPerdaPorRodada: 0,
            rodadasMico: 0,
            rodadasZ4: 0,
        },
    };

    extrato.rodadas.forEach((r) => {
        // Bônus/Ônus negativo (ou seja, ônus)
        if (r.bonusOnus < 0) {
            detalhes.bonusOnus += Math.abs(r.bonusOnus);
            detalhes.rodadas.bonusOnus.push({
                rodada: r.rodada,
                valor: r.bonusOnus,
                posicao: r.posicao,
            });
        }

        // Pontos Corridos negativo
        if (r.pontosCorridos < 0) {
            detalhes.pontosCorridos += Math.abs(r.pontosCorridos);
            detalhes.rodadas.pontosCorridos.push({
                rodada: r.rodada,
                valor: r.pontosCorridos,
            });
        }

        // Mata-Mata negativo
        if (r.mataMata < 0) {
            detalhes.mataMata += Math.abs(r.mataMata);
            detalhes.rodadas.mataMata.push({
                rodada: r.rodada,
                valor: r.mataMata,
            });
        }

        // Top 10 negativo
        if (r.top10 < 0) {
            detalhes.top10 += Math.abs(r.top10);
            detalhes.rodadas.top10.push({
                rodada: r.rodada,
                valor: r.top10,
                posicao: r.top10Posicao,
            });
        }

        // Estatísticas
        if (r.posicao === r.totalTimes || r.isMico)
            detalhes.estatisticas.rodadasMico++;
        if (r.totalTimes && r.posicao >= r.totalTimes - 3)
            detalhes.estatisticas.rodadasZ4++;
    });

    // Calcular estatísticas finais
    const totalPerda =
        detalhes.bonusOnus +
        detalhes.pontosCorridos +
        detalhes.mataMata +
        detalhes.top10;
    const rodadasComPerda = new Set([
        ...detalhes.rodadas.bonusOnus.map((r) => r.rodada),
        ...detalhes.rodadas.pontosCorridos.map((r) => r.rodada),
        ...detalhes.rodadas.mataMata.map((r) => r.rodada),
        ...detalhes.rodadas.top10.map((r) => r.rodada),
    ]).size;

    detalhes.estatisticas.totalRodadasComPerda = rodadasComPerda;
    detalhes.estatisticas.mediaPerdaPorRodada =
        rodadasComPerda > 0 ? totalPerda / rodadasComPerda : 0;

    return detalhes;
}

function mostrarPopupDetalhamentoPro(titulo, detalhes, cor, tipo) {
    // Remover popup existente
    const existente = document.getElementById("popupDetalhamento");
    if (existente) existente.remove();

    const isGanhos = tipo === "ganhos";
    const icon = isGanhos ? "emoji_events" : "sentiment_very_dissatisfied";

    // Montar categorias
    const categorias = [];
    const total = isGanhos
        ? detalhes.bonusOnus +
          detalhes.pontosCorridos +
          detalhes.mataMata +
          detalhes.top10 +
          (detalhes.melhorMes || 0)
        : detalhes.bonusOnus +
          detalhes.pontosCorridos +
          detalhes.mataMata +
          detalhes.top10;

    if (detalhes.bonusOnus > 0) {
        categorias.push({
            nome: isGanhos ? "Bônus por Posição" : "Ônus por Posição",
            valor: detalhes.bonusOnus,
            icon: isGanhos ? "military_tech" : "sentiment_very_dissatisfied",
            rodadas: detalhes.rodadas.bonusOnus,
            percentual: (detalhes.bonusOnus / total) * 100,
        });
    }

    if (detalhes.pontosCorridos > 0) {
        categorias.push({
            nome: "Pontos Corridos",
            valor: detalhes.pontosCorridos,
            icon: "sports_soccer",
            rodadas: detalhes.rodadas.pontosCorridos,
            percentual: (detalhes.pontosCorridos / total) * 100,
        });
    }

    if (detalhes.mataMata > 0) {
        categorias.push({
            nome: "Mata-Mata",
            valor: detalhes.mataMata,
            icon: "emoji_events",
            rodadas: detalhes.rodadas.mataMata,
            percentual: (detalhes.mataMata / total) * 100,
        });
    }

    if (detalhes.top10 > 0) {
        categorias.push({
            nome: "Top 10 da Rodada",
            valor: detalhes.top10,
            icon: "leaderboard",
            rodadas: detalhes.rodadas.top10,
            percentual: (detalhes.top10 / total) * 100,
        });
    }

    if (isGanhos && detalhes.melhorMes > 0) {
        categorias.push({
            nome: "Melhor do Mês",
            valor: detalhes.melhorMes,
            icon: "star",
            rodadas: [],
            percentual: (detalhes.melhorMes / total) * 100,
        });
    }

    const formatarMoeda = (val) =>
        Math.abs(val).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const html = `
        <style>
            #popupDetalhamento {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                animation: fadeIn 0.2s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            #popupDetalhamento .modal-content {
                background: ${COLORS.surface};
                border-radius: 20px;
                max-width: 420px;
                width: 100%;
                max-height: 85vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                border: 1px solid ${cor}40;
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            #popupDetalhamento .modal-header {
                background: linear-gradient(135deg, ${cor}30 0%, ${cor}10 100%);
                padding: 20px;
                border-bottom: 1px solid ${cor}30;
            }

            #popupDetalhamento .modal-header-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            #popupDetalhamento .modal-header h3 {
                display: flex;
                align-items: center;
                gap: 10px;
                color: ${COLORS.text};
                font-size: 18px;
                font-weight: 700;
                margin: 0;
            }

            #popupDetalhamento .modal-header h3 .material-icons {
                color: ${cor};
                font-size: 24px;
            }

            #popupDetalhamento .btn-close {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: none;
                background: rgba(255, 255, 255, 0.1);
                color: ${COLORS.text};
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #popupDetalhamento .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
            }

            #popupDetalhamento .stat-item {
                text-align: center;
                padding: 8px 4px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
            }

            #popupDetalhamento .stat-label {
                font-size: 9px;
                color: ${COLORS.textMuted};
                text-transform: uppercase;
                display: block;
                margin-bottom: 4px;
            }

            #popupDetalhamento .stat-value {
                font-size: 14px;
                font-weight: 700;
                color: ${COLORS.text};
            }

            #popupDetalhamento .modal-body {
                padding: 16px;
                overflow-y: auto;
                flex: 1;
            }

            #popupDetalhamento .categoria-item {
                background: ${COLORS.surfaceLight};
                border-radius: 12px;
                padding: 14px;
                margin-bottom: 10px;
                border-left: 3px solid ${cor};
            }

            #popupDetalhamento .categoria-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            #popupDetalhamento .categoria-info {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            #popupDetalhamento .categoria-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                background: ${cor}25;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #popupDetalhamento .categoria-icon .material-icons {
                font-size: 20px;
                color: ${cor};
            }

            #popupDetalhamento .categoria-nome {
                font-size: 13px;
                font-weight: 600;
                color: ${COLORS.text};
            }

            #popupDetalhamento .categoria-valor {
                font-size: 16px;
                font-weight: 700;
                color: ${cor};
            }

            #popupDetalhamento .barra-container {
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            #popupDetalhamento .barra-progresso {
                height: 100%;
                background: ${cor};
                border-radius: 3px;
                transition: width 0.5s ease;
            }

            #popupDetalhamento .categoria-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #popupDetalhamento .rodadas-count {
                font-size: 11px;
                color: ${COLORS.textMuted};
            }

            #popupDetalhamento .percentual-badge {
                font-size: 10px;
                font-weight: 600;
                color: ${cor};
                background: ${cor}15;
                padding: 3px 8px;
                border-radius: 4px;
            }

            #popupDetalhamento .total-section {
                background: linear-gradient(135deg, ${cor}30 0%, ${cor}15 100%);
                padding: 16px;
                border-radius: 12px;
                border: 1px solid ${cor}50;
                margin-top: 8px;
            }

            #popupDetalhamento .total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #popupDetalhamento .total-label {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 700;
                color: ${COLORS.text};
            }

            #popupDetalhamento .total-label .material-icons {
                color: ${cor};
            }

            #popupDetalhamento .total-value {
                font-size: 22px;
                font-weight: 800;
                color: ${cor};
            }

            @media (max-width: 400px) {
                #popupDetalhamento .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }

                #popupDetalhamento .modal-header h3 {
                    font-size: 15px;
                }

                #popupDetalhamento .total-value {
                    font-size: 18px;
                }
            }
        </style>

        <div id="popupDetalhamento" onclick="this.remove()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3>
                            <span class="material-icons">${icon}</span>
                            ${titulo}
                        </h3>
                        <button class="btn-close" onclick="document.getElementById('popupDetalhamento').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Rodadas</span>
                            <span class="stat-value">${isGanhos ? detalhes.estatisticas.totalRodadasComGanho : detalhes.estatisticas.totalRodadasComPerda}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Média</span>
                            <span class="stat-value">R$ ${formatarMoeda(isGanhos ? detalhes.estatisticas.mediaGanhoPorRodada : detalhes.estatisticas.mediaPerdaPorRodada)}</span>
                        </div>
                        ${
                            isGanhos
                                ? `
                            <div class="stat-item">
                                <span class="stat-label">Mitos</span>
                                <span class="stat-value">${detalhes.estatisticas.rodadasMito}x</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Top 11</span>
                                <span class="stat-value">${detalhes.estatisticas.rodadasTop11}x</span>
                            </div>
                        `
                                : `
                            <div class="stat-item">
                                <span class="stat-label">Micos</span>
                                <span class="stat-value">${detalhes.estatisticas.rodadasMico}x</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Z4</span>
                                <span class="stat-value">${detalhes.estatisticas.rodadasZ4}x</span>
                            </div>
                        `
                        }
                    </div>
                </div>

                <div class="modal-body">
                    ${
                        categorias.length === 0
                            ? `
                        <div style="text-align: center; padding: 40px 20px; color: ${COLORS.textMuted};">
                            <span class="material-icons" style="font-size: 48px; margin-bottom: 12px; display: block;">inbox</span>
                            Nenhum registro encontrado
                        </div>
                    `
                            : categorias
                                  .map(
                                      (cat) => `
                        <div class="categoria-item">
                            <div class="categoria-header">
                                <div class="categoria-info">
                                    <div class="categoria-icon">
                                        <span class="material-icons">${cat.icon}</span>
                                    </div>
                                    <span class="categoria-nome">${cat.nome}</span>
                                </div>
                                <span class="categoria-valor">R$ ${formatarMoeda(cat.valor)}</span>
                            </div>
                            <div class="barra-container">
                                <div class="barra-progresso" style="width: ${cat.percentual}%;"></div>
                            </div>
                            <div class="categoria-footer">
                                <span class="rodadas-count">${cat.rodadas.length} rodada(s)</span>
                                <span class="percentual-badge">${cat.percentual.toFixed(1)}%</span>
                            </div>
                        </div>
                    `,
                                  )
                                  .join("")
                    }

                    <div class="total-section">
                        <div class="total-row">
                            <span class="total-label">
                                <span class="material-icons">account_balance_wallet</span>
                                TOTAL ${isGanhos ? "GANHO" : "PERDIDO"}
                            </span>
                            <span class="total-value">R$ ${formatarMoeda(total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
}

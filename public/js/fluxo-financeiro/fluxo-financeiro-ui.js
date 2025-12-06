import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";

/**
 * FLUXO-FINANCEIRO-UI.JS - v4.1 (MITO/MICO Contextual)
 * ✅ v4.1: MICO mostra badge para último lugar da fase (4º na fase2, 6º na fase1)
 * Objetivo: Renderização Pura + Classes CSS
 */
export class FluxoFinanceiroUI {
    constructor() {
        this.containerId = "fluxoFinanceiroContent";
        this.buttonsContainerId = "fluxoFinanceiroButtons";
    }

    renderizarBotoesParticipantes(participantes) {
        const container = document.getElementById(this.buttonsContainerId);
        if (!container) return;

        // Nota: Mantivemos classes inline mínimas aqui pois é um grid flexível que pode variar,
        // mas o ideal seria mover .participante-card para o CSS também.
        container.innerHTML = `
            <div class="fluxo-controls">
                <button onclick="window.gerarRelatorioFinanceiro()" class="btn-modern btn-primary-gradient">
                    <span>📊</span> Relatório Consolidado
                </button>
                <div class="search-wrapper">
                    <input type="text" id="searchParticipante" placeholder="🔍 Pesquisar participante..."
                           class="input-modern"
                           onkeyup="window.filtrarParticipantes(this.value)">
                </div>
            </div>
            <div id="resultadosCount" class="text-muted text-right text-small">
                ${participantes.length} participantes
            </div>
            <div class="participantes-grid" id="participantesGrid">
                ${participantes
                    .map(
                        (p) => `
                    <button onclick="window.selecionarParticipante('${p.time_id || p.id}')"
                            class="participante-card"
                            data-nome="${(p.nome_cartola || "").toLowerCase()}"
                            data-time="${(p.nome_time || "").toLowerCase()}">
                        <div class="participante-header">
                            <div class="participante-avatar">
                                ${
                                    p.url_escudo_png
                                        ? `<img src="${p.url_escudo_png}" alt="${p.nome_cartola}">`
                                        : `<div class="avatar-placeholder">⚽</div>`
                                }
                            </div>
                            <div class="participante-info">
                                <p class="participante-nome">${p.nome_cartola}</p>
                                <p class="participante-time">${p.nome_time}</p>
                            </div>
                        </div>
                    </button>
                `,
                    )
                    .join("")}
            </div>
        `;
        window.totalParticipantes = participantes.length;
    }

    renderizarMensagemInicial() {
        const container = document.getElementById(this.containerId);
        if (container)
            container.innerHTML = `
            <div class="estado-inicial">
                <div class="estado-inicial-icon">💰</div>
                <h2 class="estado-inicial-titulo">Extrato Financeiro</h2>
                <p class="estado-inicial-subtitulo">Selecione um participante para visualizar.</p>
            </div>`;
    }

    renderizarLoading(mensagem = "Carregando...") {
        const container = document.getElementById(this.containerId);
        if (container)
            container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>${mensagem}</p>
            </div>`;
    }

    // --- HELPERS VISUAIS ---

    formatarMoeda(valor) {
        const valorNum = parseFloat(valor) || 0;
        if (valorNum === 0) return `<span class="text-muted">-</span>`;

        const classeCor = valorNum > 0 ? "text-success" : "text-danger";
        const sinal = valorNum > 0 ? "+" : "";
        return `<span class="${classeCor} font-semibold">${sinal}R$ ${valorNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>`;
    }

    formatarTop10Cell(rodada) {
        if (!rodada.top10 || rodada.top10 === 0)
            return `<span class="text-muted">-</span>`;

        const valor = parseFloat(rodada.top10);
        const status = rodada.top10Status || (valor > 0 ? "MITO" : "MICO");
        const posicao = parseInt(rodada.top10Posicao) || 1;
        const isMito = status === "MITO";

        // Classes CSS
        const classeContainer = isMito
            ? "cell-top10 is-mito"
            : "cell-top10 is-mico";
        const classeTexto = isMito ? "text-success" : "text-danger";
        const icone = isMito ? "🏆" : "🐵";

        let ordinal = `${posicao}º`;
        if (posicao <= 3) ordinal = `${posicao}${isMito ? "º" : "ª"}`;

        return `
            <div class="${classeContainer}">
                <span class="${classeTexto} font-bold" style="font-size: 8px;">${icone} ${ordinal} ${isMito ? "MAIOR" : "PIOR"}</span>
                <span class="${classeTexto} font-semibold" style="font-size: 10px;">${valor > 0 ? "+" : ""}R$ ${Math.abs(valor).toFixed(2)}</span>
            </div>
        `;
    }

    formatarPosicao(rodada) {
        // ✅ v4.1: MITO/MICO contextual por rodada
        const ligaId = window.obterLigaId?.() || null;
        const isCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";

        // Determinar total de times da fase
        let totalTimesFase = 32; // SuperCartola padrão
        if (isCartoleirosSobral) {
            totalTimesFase = rodada.rodada >= 30 ? 4 : 6;
        }

        // MITO: 1º lugar
        if (rodada.isMito || rodada.posicao === 1)
            return `<span class="badge-status status-mito">🎩 MITO</span>`;

        // MICO: último lugar (contextual)
        if (rodada.isMico || rodada.posicao === totalTimesFase)
            return `<span class="badge-status status-mico">🐵 MICO</span>`;

        if (rodada.posicao) {
            let classe = "status-neutro";

            if (isCartoleirosSobral && rodada.rodada >= 30) {
                // Fase 2: 4 times (1º=crédito, 2º-3º=neutro, 4º=MICO já tratado acima)
                if (rodada.posicao === 1) classe = "status-g4";
                else if (rodada.posicao >= 2 && rodada.posicao <= 3)
                    classe = "status-neutro";
            } else if (isCartoleirosSobral) {
                // Fase 1: 6 times (1º-2º=crédito, 3º=neutro, 4º-5º=débito, 6º=MICO já tratado)
                if (rodada.posicao >= 1 && rodada.posicao <= 2)
                    classe = "status-g4";
                else if (rodada.posicao === 3) classe = "status-neutro";
                else if (rodada.posicao >= 4 && rodada.posicao <= 5)
                    classe = "status-z4";
            } else {
                // SuperCartola 2025 (32 times)
                classe =
                    rodada.posicao <= 11
                        ? "status-g4"
                        : rodada.posicao >= 22
                          ? "status-z4"
                          : "status-neutro";
            }

            return `<span class="badge-status ${classe}">${rodada.posicao}º</span>`;
        }
        return `<span class="text-muted">-</span>`;
    }

    // --- RENDER PRINCIPAL ---

    async renderizarExtratoFinanceiro(extrato, participante = null) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // ✅ DEBUG: Verificar estrutura do extrato
        console.log(`[FLUXO-UI] 📊 Renderizando extrato:`, {
            temRodadas: Array.isArray(extrato?.rodadas),
            qtdRodadas: extrato?.rodadas?.length || 0,
            primeiraRodada: extrato?.rodadas?.[0],
            resumo: extrato?.resumo,
        });

        // ✅ VALIDAÇÃO: Garantir que rodadas existe e é array
        if (!extrato || !Array.isArray(extrato.rodadas)) {
            console.error(
                `[FLUXO-UI] ❌ Extrato inválido - rodadas não é array`,
            );
            container.innerHTML = `
                <div class="estado-inicial">
                    <div class="estado-inicial-icon">⚠️</div>
                    <h2 class="estado-inicial-titulo">Erro ao carregar extrato</h2>
                    <p class="estado-inicial-subtitulo">Dados corrompidos. Tente atualizar.</p>
                    <button onclick="window.forcarRefreshExtrato('${participante?.time_id || participante?.id}')" class="btn-modern btn-primary-gradient">
                        🔄 Forçar Atualização
                    </button>
                </div>`;
            return;
        }

        window.extratoAtual = extrato;
        const camposEditaveisHTML = await this.renderizarCamposEditaveis(
            participante.time_id || participante.id,
        );

        const saldoFinal = parseFloat(extrato.resumo.saldo) || 0;
        const classeSaldo = saldoFinal >= 0 ? "text-success" : "text-danger";
        const labelSaldo =
            saldoFinal >= 0
                ? "💰 Saldo a Receber"
                : saldoFinal < 0
                  ? "💸 Saldo a Pagar"
                  : "✅ Saldo Quitado";

        let html = `
        <div class="extrato-container fadeIn">
            <div class="extrato-header-card">
                <div style="position: absolute; top: 16px; left: 16px;">
                    ${
                        participante.url_escudo_png
                            ? `<img src="${participante.url_escudo_png}" class="avatar-lg">`
                            : `<div class="avatar-placeholder-lg">⚽</div>`
                    }
                </div>

                <div style="position: absolute; top: 16px; right: 16px;">
                    <button onclick="window.forcarRefreshExtrato('${participante.time_id || participante.id}')" class="btn-modern btn-secondary-gradient">
                        🔄 Atualizar
                    </button>
                </div>

                <div style="padding: 20px 0;">
                    <div class="text-muted font-bold text-uppercase" style="font-size: 11px;">${labelSaldo}</div>
                    <div class="saldo-display ${classeSaldo}">
                        R$ ${Math.abs(saldoFinal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>

                    ${extrato.updatedAt ? `<div class="text-muted" style="font-size: 9px; margin-top: 8px;">Atualizado: ${new Date(extrato.updatedAt).toLocaleString()}</div>` : ""}

                    <div style="display: flex; justify-content: center; gap: 12px; margin-top: 16px;">
                        <button onclick="window.mostrarDetalhamentoGanhos()" class="btn-modern btn-success-gradient">💰 GANHOS</button>
                        <button onclick="window.mostrarDetalhamentoPerdas()" class="btn-modern btn-danger-gradient">💸 PERDAS</button>
                    </div>
                </div>
            </div>

            ${camposEditaveisHTML}

            <div class="card-padrao">
                <h3 class="card-titulo">📋 Detalhamento</h3>
                <div class="table-responsive">
                    <table class="table-modern">
                        <thead>
                            <tr>
                                <th>Rod</th>
                                <th>Pos</th>
                                <th class="text-center">Bônus/Ônus</th>
                                <th class="text-center">P.C</th>
                                <th class="text-center">M-M</th>
                                <th class="text-center">TOP10</th>
                                <th class="text-center">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${extrato.rodadas
                                .map(
                                    (r, i) => `
                                <tr class="${i % 2 === 0 ? "bg-zebra" : ""}">
                                    <td class="font-semibold">${r.rodada}ª</td>
                                    <td>${this.formatarPosicao(r)}</td>
                                    <td class="text-center">${this.formatarMoeda(r.bonusOnus)}</td>
                                    <td class="text-center">${this.formatarMoeda(r.pontosCorridos)}</td>
                                    <td class="text-center">${this.formatarMoeda(r.mataMata)}</td>
                                    <td>${this.formatarTop10Cell(r)}</td>
                                    <td class="cell-saldo ${r.saldo >= 0 ? "bg-positive-light text-success" : "bg-negative-light text-danger"}">
                                        ${this.formatarMoeda(r.saldo)}
                                    </td>
                                </tr>
                            `,
                                )
                                .join("")}

                            <tr class="row-total">
                                <td colspan="2" class="text-right font-bold">TOTAIS:</td>
                                <td class="text-center">${this.formatarMoeda(extrato.resumo.bonus + extrato.resumo.onus)}</td>
                                <td class="text-center">${this.formatarMoeda(extrato.resumo.pontosCorridos)}</td>
                                <td class="text-center">${this.formatarMoeda(extrato.resumo.mataMata)}</td>
                                <td class="text-center">${this.formatarMoeda(extrato.resumo.top10)}</td>
                                <td class="text-center text-muted">-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        container.innerHTML = html;
    }

    async renderizarCamposEditaveis(timeId) {
        const campos =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);
        const lista = [
            {
                id: "campo1",
                nome: campos.campo1?.nome || "Campo 1",
                valor: campos.campo1?.valor || 0,
            },
            {
                id: "campo2",
                nome: campos.campo2?.nome || "Campo 2",
                valor: campos.campo2?.valor || 0,
            },
            {
                id: "campo3",
                nome: campos.campo3?.nome || "Campo 3",
                valor: campos.campo3?.valor || 0,
            },
            {
                id: "campo4",
                nome: campos.campo4?.nome || "Campo 4",
                valor: campos.campo4?.valor || 0,
            },
        ];

        if (!lista.some((c) => c.valor !== 0)) return "";

        return `
            <div class="card-padrao mb-20">
                <div class="grid-responsive">
                    ${lista
                        .map(
                            (c) => `
                        <div class="campo-item">
                            <label class="campo-label-permanente">${c.nome}</label>
                            <input type="number" step="0.01" value="${c.valor}" 
                                   class="input-modern ${c.valor >= 0 ? "text-success" : "text-danger"}"
                                   onchange="window.salvarCampoEditavel('${timeId}', '${c.id}', this.value)"
                                   placeholder="R$ 0,00">
                            <button class="btn-editar-nome" onclick="window.editarNomeCampo('${timeId}', '${c.id}')" title="Renomear campo">
                                ✏️
                            </button>
                        </div>
                    `,
                        )
                        .join("")}
                </div>
                <div class="text-right mt-16">
                    <button onclick="window.calcularEExibirExtrato('${timeId}')" class="btn-modern btn-primary-gradient">🔄 Recalcular</button>
                </div>
            </div>
        `;
    }

    renderizarRelatorioConsolidado(relatorio, ultimaRodada) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!relatorio || relatorio.length === 0) {
            container.innerHTML = `
                <div class="estado-inicial">
                    <div class="estado-inicial-icon">⚠️</div>
                    <h2 class="estado-inicial-titulo">Sem dados</h2>
                    <p class="estado-inicial-subtitulo">Nenhum participante encontrado para o relatório.</p>
                </div>`;
            return;
        }

        const html = `
            <div class="card-padrao">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 class="card-titulo" style="margin: 0;">📊 Relatório Consolidado - Rodada ${ultimaRodada}</h3>
                    <button onclick="window.exportarRelatorioCSV()" class="btn-modern btn-success-gradient">
                        📥 Exportar CSV
                    </button>
                </div>

                <div class="table-responsive">
                    <table class="table-modern">
                        <thead>
                            <tr>
                                <th style="width: 40px;">#</th>
                                <th>Participante</th>
                                <th class="text-center">Bônus</th>
                                <th class="text-center">Ônus</th>
                                <th class="text-center">P.C</th>
                                <th class="text-center">M-M</th>
                                <th class="text-center">Melhor Mês</th>
                                <th class="text-center">Ajustes</th>
                                <th class="text-center">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorio
                                .map(
                                    (p, i) => `
                                <tr class="${i % 2 === 0 ? "bg-zebra" : ""}">
                                    <td class="font-bold text-center">${i + 1}º</td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            ${
                                                p.escudo
                                                    ? `<img src="${p.escudo}" alt="" style="width: 28px; height: 28px; border-radius: 50%;">`
                                                    : `<div style="width: 28px; height: 28px; border-radius: 50%; background: #333; display: flex; align-items: center; justify-content: center;">⚽</div>`
                                            }
                                            <div>
                                                <div class="font-semibold">${p.nome}</div>
                                                <div class="text-muted" style="font-size: 11px;">${p.time}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="text-center">${this.formatarMoeda(p.bonus)}</td>
                                    <td class="text-center">${this.formatarMoeda(p.onus)}</td>
                                    <td class="text-center">${this.formatarMoeda(p.pontosCorridos)}</td>
                                    <td class="text-center">${this.formatarMoeda(p.mataMata)}</td>
                                    <td class="text-center">${this.formatarMoeda(p.melhorMes)}</td>
                                    <td class="text-center">${this.formatarMoeda(p.ajustes)}</td>
                                    <td class="text-center font-bold ${p.saldoFinal >= 0 ? "text-success" : "text-danger"}">
                                        ${p.saldoFinal >= 0 ? "+" : ""}R$ ${p.saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            `,
                                )
                                .join("")}
                        </tbody>
                        <tfoot>
                            <tr class="row-total">
                                <td colspan="2" class="text-right font-bold">TOTAIS:</td>
                                <td class="text-center">${this.formatarMoeda(relatorio.reduce((s, p) => s + (p.bonus || 0), 0))}</td>
                                <td class="text-center">${this.formatarMoeda(relatorio.reduce((s, p) => s + (p.onus || 0), 0))}</td>
                                <td class="text-center">${this.formatarMoeda(relatorio.reduce((s, p) => s + (p.pontosCorridos || 0), 0))}</td>
                                <td class="text-center">${this.formatarMoeda(relatorio.reduce((s, p) => s + (p.mataMata || 0), 0))}</td>
                                <td class="text-center">${this.formatarMoeda(relatorio.reduce((s, p) => s + (p.melhorMes || 0), 0))}</td>
                                <td class="text-center">${this.formatarMoeda(relatorio.reduce((s, p) => s + (p.ajustes || 0), 0))}</td>
                                <td class="text-center font-bold">
                                    R$ ${relatorio.reduce((s, p) => s + (p.saldoFinal || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }
}

// =========================================================================
// FUNÇÕES GLOBAIS (Mantidas para compatibilidade com onclick)
// =========================================================================

window.salvarCampoEditavel = async function (timeId, nomeCampo, valor) {
    try {
        await FluxoFinanceiroCampos.salvarValorCampo(
            timeId,
            nomeCampo,
            parseFloat(valor) || 0,
        );
        console.log(`[UI] Campo salvo: ${nomeCampo}`);
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar campo.");
    }
};

window.editarNomeCampo = async function (timeId, nomeCampo) {
    const nomeAtual = await FluxoFinanceiroCampos.obterNomeCampo(
        timeId,
        nomeCampo,
    );
    const novoNome = prompt("Novo nome:", nomeAtual);
    if (novoNome && novoNome.trim()) {
        await FluxoFinanceiroCampos.salvarNomeCampo(
            timeId,
            nomeCampo,
            novoNome.trim(),
        );
        window.calcularEExibirExtrato(timeId);
    }
};

window.mostrarDetalhamentoGanhos = function () {
    if (!window.extratoAtual) return;
    alert(
        `Total de Ganhos: R$ ${(window.extratoAtual.resumo.totalGanhos || 0).toFixed(2)}`,
    );
};

window.mostrarDetalhamentoPerdas = function () {
    if (!window.extratoAtual) return;
    alert(
        `Total de Perdas: R$ ${(window.extratoAtual.resumo.totalPerdas || 0).toFixed(2)}`,
    );
};

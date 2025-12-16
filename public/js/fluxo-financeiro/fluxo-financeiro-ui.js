import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
import {
    FluxoFinanceiroAuditoria,
    injetarEstilosAuditoria,
} from "./fluxo-financeiro-auditoria.js";

/**
 * FLUXO-FINANCEIRO-UI.JS - v5.3 (Botão Registrar Acerto)
 * ✅ v5.3: Botão "Acerto" para registrar pagamentos/recebimentos
 * ✅ v5.1: Função renderizarRelatorioConsolidado + botão Voltar
 * ✅ v5.0: PDF multi-página com quebra automática e TOP 10 detalhado
 * ✅ v4.9: Nomes completos: RANKING DE RODADAS, PONTOS CORRIDOS, MATA-MATA
 * ✅ v4.8: PDF compacto 1 página com linha a linha por módulo
 * ✅ v4.7: Botão "Exportar PDF" do extrato individual
 * ✅ v4.6: Títulos dos campos editáveis agora são editáveis em modo Admin
 * ✅ v4.5: Botão "Limpar Cache" + "Recalcular Todos" + auto-popular ao visualizar
 * ✅ v4.4.2: Botão só limpa cache, sem chamar recálculo do backend
 * ✅ v4.4.1: Botão "Limpar Cache" + removido botão duplicado dos campos
 * ✅ v4.4: Botão para limpar cache MongoDB do participante
 * ✅ v4.3: Campos editáveis SEMPRE visíveis para admin + Material Icons
 * ✅ v4.2: Botão "Auditar" para cada participante
 * ✅ v4.1: MICO mostra badge para último lugar da fase
 * Objetivo: Renderização Pura + Classes CSS
 */

export class FluxoFinanceiroUI {
    constructor() {
        this.containerId = "fluxoFinanceiroContent";
        this.buttonsContainerId = "fluxoFinanceiroButtons";
        this.auditoria = null;
        injetarEstilosAuditoria();

        // ✅ v4.3: Detectar modo admin
        this.detectarModoAdmin();
    }

    detectarModoAdmin() {
        const isAdminPage = window.location.pathname.includes("detalhe-liga");
        const hasAdminSession =
            document.cookie.includes("adminSession") ||
            document.cookie.includes("connect.sid");
        window.adminLogado = isAdminPage || hasAdminSession;
        window.isAdminMode = window.adminLogado;
        console.log(
            "[FLUXO-UI] Modo Admin:",
            window.adminLogado ? "ATIVO" : "INATIVO",
        );
    }

    setAuditoria(auditoria) {
        this.auditoria = auditoria;
    }

    renderizarBotoesParticipantes(participantes) {
        const container = document.getElementById(this.buttonsContainerId);
        if (!container) return;

        // Nota: Mantivemos classes inline mínimas aqui pois é um grid flexível que pode variar,
        // mas o ideal seria mover .participante-card para o CSS também.
        container.innerHTML = `
            <div class="fluxo-controls-header">
                <div class="fluxo-controls-row">
                    <button onclick="window.gerarRelatorioFinanceiro()" class="btn-fluxo btn-relatorio">
                        <span class="material-icons">assessment</span>
                        <span>Relatório</span>
                    </button>
                    <button onclick="window.limparCacheLiga()" class="btn-fluxo btn-limpar" title="Limpar cache de todos os participantes">
                        <span class="material-icons">delete_sweep</span>
                        <span>Limpar Cache</span>
                    </button>
                    <button onclick="window.recalcularTodosCache()" class="btn-fluxo btn-recalcular" title="Recalcular cache de todos os participantes">
                        <span class="material-icons">sync</span>
                        <span>Recalcular</span>
                    </button>
                </div>
                <div class="fluxo-search-row">
                    <div class="search-container">
                        <span class="material-icons search-icon">search</span>
                        <input type="text" id="searchParticipante" placeholder="Pesquisar participante..."
                               class="input-search"
                               onkeyup="window.filtrarParticipantes(this.value)">
                    </div>
                    <span class="participantes-count">${participantes.length} participantes</span>
                </div>
            </div>
            <div class="participantes-grid" id="participantesGrid">
                ${participantes
                    .map(
                        (p) => `
                    <div class="participante-card-wrapper">
                        <button onclick="window.selecionarParticipante('${p.time_id || p.id}')"
                                class="participante-card"
                                data-nome="${(p.nome_cartola || "").toLowerCase()}"
                                data-time="${(p.nome_time || "").toLowerCase()}">
                            <div class="participante-header">
                                <div class="participante-avatar">
                                    ${
                                        p.url_escudo_png
                                            ? `<img src="${p.url_escudo_png}" alt="${p.nome_cartola}">`
                                            : `<div class="avatar-placeholder"><span class="material-icons" style="font-size: 24px; color: #666;">sports_soccer</span></div>`
                                    }
                                </div>
                                <div class="participante-info">
                                    <p class="participante-nome">${p.nome_cartola}</p>
                                    <p class="participante-time">${p.nome_time}</p>
                                </div>
                            </div>
                        </button>
                        <button onclick="window.abrirAuditoria('${p.time_id || p.id}')" 
                                class="btn-auditar" title="Auditar financeiro">
                            <span class="material-icons" style="font-size: 14px;">search</span> Auditar
                        </button>
                    </div>
                `,
                    )
                    .join("")}
            </div>
        `;
        window.totalParticipantes = participantes.length;

        // Injetar estilos extras para wrapper
        this._injetarEstilosWrapper();
    }

    _injetarEstilosWrapper() {
        if (document.getElementById("participante-wrapper-styles")) return;

        const style = document.createElement("style");
        style.id = "participante-wrapper-styles";
        style.textContent = `
            /* ✅ v4.5: Layout profissional do header */
            .fluxo-controls-header {
                background: linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(25, 25, 30, 0.98) 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .fluxo-controls-row {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .fluxo-search-row {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .search-container {
                flex: 1;
                min-width: 200px;
                position: relative;
                display: flex;
                align-items: center;
            }
            .search-container .search-icon {
                position: absolute;
                left: 12px;
                color: #888;
                font-size: 18px;
                pointer-events: none;
            }
            .input-search {
                width: 100%;
                padding: 10px 12px 10px 40px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                transition: all 0.2s ease;
            }
            .input-search:focus {
                outline: none;
                border-color: var(--laranja, #ff6b35);
                background: rgba(255, 255, 255, 0.08);
            }
            .input-search::placeholder {
                color: #666;
            }
            .participantes-count {
                color: #888;
                font-size: 13px;
                white-space: nowrap;
            }

            /* ✅ v4.5: Botões profissionais */
            .btn-fluxo {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            .btn-fluxo .material-icons {
                font-size: 18px;
            }
            .btn-fluxo:hover {
                transform: translateY(-2px);
            }
            .btn-fluxo:active {
                transform: translateY(0);
            }
            .btn-fluxo:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
            }
            .btn-fluxo.loading .material-icons {
                animation: spin 1s linear infinite;
            }

            /* Cores dos botões */
            .btn-relatorio {
                background: linear-gradient(135deg, #ff6b35 0%, #f54d00 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
            }
            .btn-relatorio:hover {
                box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
            }

            .btn-limpar {
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
            }
            .btn-limpar:hover {
                box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4);
            }

            .btn-recalcular {
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
            }
            .btn-recalcular:hover {
                box-shadow: 0 4px 16px rgba(5, 150, 105, 0.4);
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Responsivo */
            @media (max-width: 600px) {
                .fluxo-controls-row {
                    flex-direction: column;
                }
                .btn-fluxo {
                    width: 100%;
                    justify-content: center;
                }
                .fluxo-search-row {
                    flex-direction: column;
                    align-items: stretch;
                }
                .participantes-count {
                    text-align: center;
                }
            }

            /* Cards de participante */
            .participante-card-wrapper {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .participante-card-wrapper .btn-auditar {
                width: 100%;
                justify-content: center;
            }

            /* Botão limpar cache individual */
            .btn-recalc-cache {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s ease;
            }
            .btn-recalc-cache:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            }
            .btn-recalc-cache:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            .btn-recalc-cache.loading .material-icons {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    renderizarMensagemInicial() {
        const container = document.getElementById(this.containerId);
        if (container)
            container.innerHTML = `
            <div class="estado-inicial">
                <div class="estado-inicial-icon"><span class="material-icons" style="font-size: 48px; color: #ffd700;">account_balance_wallet</span></div>
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
        const icone = isMito
            ? '<span class="material-icons" style="font-size: 10px;">emoji_events</span>'
            : '<span class="material-icons" style="font-size: 10px;">sentiment_very_dissatisfied</span>';

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
            totalTimesFase = rodada.rodada >= 29 ? 4 : 6; // FASE2 a partir R29
        }

        // MITO: 1º lugar
        if (rodada.isMito || rodada.posicao === 1)
            return `<span class="badge-status status-mito"><span class="material-icons" style="font-size: 10px;">emoji_events</span> MITO</span>`;

        // MICO: último lugar (contextual)
        if (rodada.isMico || rodada.posicao === totalTimesFase)
            return `<span class="badge-status status-mico"><span class="material-icons" style="font-size: 10px;">sentiment_very_dissatisfied</span> MICO</span>`;

        if (rodada.posicao) {
            let classe = "status-neutro";

            if (isCartoleirosSobral && rodada.rodada >= 29) {
                // Fase 2 (R29+): 4 times (1º=crédito, 2º-3º=neutro, 4º=MICO já tratado acima)
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
                    <div class="estado-inicial-icon"><span class="material-icons" style="font-size: 48px; color: #f59e0b;">warning</span></div>
                    <h2 class="estado-inicial-titulo">Erro ao carregar extrato</h2>
                    <p class="estado-inicial-subtitulo">Dados corrompidos. Tente atualizar.</p>
                    <button onclick="window.forcarRefreshExtrato('${participante?.time_id || participante?.id}')" class="btn-modern btn-primary-gradient">
                        <span class="material-icons" style="font-size: 14px;">refresh</span> Forçar Atualização
                    </button>
                </div>`;
            return;
        }

        window.extratoAtual = extrato;
        const camposEditaveisHTML = await this.renderizarCamposEditaveis(
            participante.time_id || participante.id,
        );

        // ✅ v4.5: Popular cache no backend quando admin visualiza (silencioso)
        const timeId = participante.time_id || participante.id;
        this.popularCacheBackend(timeId, extrato);

        const saldoFinal = parseFloat(extrato.resumo.saldo) || 0;
        const classeSaldo = saldoFinal >= 0 ? "text-success" : "text-danger";
        const labelSaldo =
            saldoFinal >= 0
                ? '<span class="material-icons" style="font-size: 16px; vertical-align: middle;">savings</span> Saldo a Receber'
                : saldoFinal < 0
                  ? '<span class="material-icons" style="font-size: 16px; vertical-align: middle;">payments</span> Saldo a Pagar'
                  : '<span class="material-icons" style="font-size: 16px; vertical-align: middle;">check_circle</span> Saldo Quitado';

        // ✅ v5.3: Nome escapado para uso no onclick
        const nomeParticipante = (participante.nome || participante.nomeTime || 'Participante').replace(/'/g, "\\'");

        let html = `
        <div class="extrato-container fadeIn">
            <div class="extrato-header-card">
                <div style="position: absolute; top: 16px; left: 16px;">
                    ${
                        participante.url_escudo_png
                            ? `<img src="${participante.url_escudo_png}" class="avatar-lg">`
                            : `<div class="avatar-placeholder-lg"><span class="material-icons" style="font-size: 32px; color: #666;">sports_soccer</span></div>`
                    }
                </div>

                <!-- ✅ v5.3: Botões Atualizar + Limpar Cache + Exportar PDF + Registrar Acerto -->
                <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                    <button onclick="window.abrirModalAcerto('${timeId}', '${nomeParticipante}')" class="btn-modern btn-acerto-gradient" title="Registrar pagamento ou recebimento">
                        <span class="material-icons" style="font-size: 14px;">payments</span> Acerto
                    </button>
                    <button onclick="window.exportarExtratoPDF('${timeId}')" class="btn-modern btn-pdf-gradient" title="Exportar extrato em PDF">
                        <span class="material-icons" style="font-size: 14px;">picture_as_pdf</span> PDF
                    </button>
                    <button onclick="window.forcarRefreshExtrato('${timeId}')" class="btn-modern btn-secondary-gradient" title="Atualizar dados">
                        <span class="material-icons" style="font-size: 14px;">refresh</span> Atualizar
                    </button>
                    <button id="btnRecalcCache-${timeId}" onclick="window.recalcularCacheParticipante('${timeId}')" class="btn-recalc-cache" title="Limpar cache MongoDB e recalcular do zero">
                        <span class="material-icons" style="font-size: 14px;">delete_sweep</span> Limpar Cache
                    </button>
                </div>

                <div style="padding: 20px 0;">
                    <div class="text-muted font-bold text-uppercase" style="font-size: 11px;">${labelSaldo}</div>
                    <div class="saldo-display ${classeSaldo}">
                        R$ ${Math.abs(saldoFinal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>

                    ${extrato.updatedAt ? `<div class="text-muted" style="font-size: 9px; margin-top: 8px;">Atualizado: ${new Date(extrato.updatedAt).toLocaleString()}</div>` : ""}

                    <div style="display: flex; justify-content: center; gap: 12px; margin-top: 16px;">
                        <button onclick="window.mostrarDetalhamentoGanhos()" class="btn-modern btn-success-gradient"><span class="material-icons" style="font-size: 14px;">trending_up</span> GANHOS</button>
                        <button onclick="window.mostrarDetalhamentoPerdas()" class="btn-modern btn-danger-gradient"><span class="material-icons" style="font-size: 14px;">trending_down</span> PERDAS</button>
                    </div>
                </div>
            </div>

            ${camposEditaveisHTML}

            <div class="card-padrao">
                <h3 class="card-titulo"><span class="material-icons" style="font-size: 16px;">receipt_long</span> Detalhamento</h3>
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

        // ✅ v4.3: VERIFICAR SE É ADMIN para mostrar campos editáveis
        const isAdmin =
            window.adminLogado === true ||
            window.isAdminMode === true ||
            document.querySelector('[data-admin-mode="true"]') !== null;

        const temValorPreenchido = lista.some((c) => c.valor !== 0);

        // Se não é admin E não tem valor preenchido, não mostrar seção
        if (!isAdmin && !temValorPreenchido) return "";

        // Se é participante (não admin), mostrar apenas visualização
        const readOnly = !isAdmin;

        return `
            <div class="card-padrao mb-20">
                <h4 class="card-titulo" style="font-size: 13px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span class="material-icons" style="font-size: 16px; color: var(--laranja);">tune</span>
                    Lançamentos Manuais
                    ${readOnly ? '<span class="badge-readonly" style="font-size: 9px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #888;">SOMENTE LEITURA</span>' : ""}
                </h4>
                <div class="grid-responsive">
                    ${lista
                        .map(
                            (c) => `
                        <div class="campo-item">
                            ${
                                readOnly
                                    ? `<label class="campo-label-permanente">${c.nome}</label>`
                                    : `<input type="text" value="${c.nome}"
                                           class="input-titulo-campo"
                                           data-campo="${c.id}"
                                           data-time-id="${timeId}"
                                           onchange="window.salvarNomeCampoEditavel(this)"
                                           onclick="this.select()"
                                           placeholder="Nome do campo">`
                            }
                            ${
                                readOnly
                                    ? `
                                <div class="input-modern ${c.valor >= 0 ? "text-success" : "text-danger"}"
                                     style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; text-align: center;">
                                    ${c.valor !== 0 ? `R$ ${c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                                </div>
                            `
                                    : `
                                <input type="number" step="0.01" value="${c.valor}"
                                       class="input-modern input-campo-editavel ${c.valor > 0 ? "campo-positivo" : c.valor < 0 ? "campo-negativo" : ""}"
                                       data-campo="${c.id}"
                                       data-time-id="${timeId}"
                                       onchange="window.salvarCampoEditavel(this)"
                                       onclick="this.select()">
                            `
                            }
                        </div>
                    `,
                        )
                        .join("")}
                </div>

            </div>
        `;
    }

    // =========================================================================
    // ✅ v4.5: Popular cache no backend quando admin visualiza extrato
    // =========================================================================
    async popularCacheBackend(timeId, extrato) {
        try {
            const ligaId = window.obterLigaId?.();
            if (!ligaId || !timeId || !extrato) return;

            console.log(
                `[FLUXO-UI] 📤 Populando cache backend para time ${timeId}...`,
            );

            // Enviar extrato calculado pelo frontend para o cache do backend
            const response = await fetch(
                `/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        extrato: extrato,
                        origem: "admin-frontend",
                        versao: "4.5",
                    }),
                },
            );

            if (response.ok) {
                console.log(`[FLUXO-UI] ✅ Cache populado para time ${timeId}`);
            } else {
                console.warn(
                    `[FLUXO-UI] ⚠️ Falha ao popular cache: ${response.status}`,
                );
            }
        } catch (error) {
            // Silencioso - não bloqueia o admin
            console.warn(`[FLUXO-UI] ⚠️ Erro ao popular cache:`, error.message);
        }
    }

    // =========================================================================
    // ✅ v5.1: RENDERIZAR RELATÓRIO CONSOLIDADO (TODOS OS PARTICIPANTES)
    // =========================================================================
    renderizarRelatorioConsolidado(relatorio, rodadaAtual) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const totalBonus = relatorio.reduce((sum, p) => sum + (p.bonus || 0), 0);
        const totalOnus = relatorio.reduce((sum, p) => sum + (p.onus || 0), 0);
        const totalPC = relatorio.reduce((sum, p) => sum + (p.pontosCorridos || 0), 0);
        const totalMM = relatorio.reduce((sum, p) => sum + (p.mataMata || 0), 0);
        const totalMelhorMes = relatorio.reduce((sum, p) => sum + (p.melhorMes || 0), 0);
        const totalAjustes = relatorio.reduce((sum, p) => sum + (p.ajustes || 0), 0);
        const totalSaldo = relatorio.reduce((sum, p) => sum + (p.saldoFinal || 0), 0);

        container.innerHTML = `
            <div class="relatorio-consolidado">
                <div class="relatorio-header">
                    <h3>
                        <span class="material-icons">assessment</span>
                        Relatorio Financeiro Consolidado
                    </h3>
                    <span class="relatorio-info">Rodada ${rodadaAtual} | ${relatorio.length} participantes</span>
                </div>

                <div class="relatorio-resumo">
                    <div class="resumo-item positivo">
                        <span class="resumo-label">Total Bonus</span>
                        <span class="resumo-valor">R$ ${totalBonus.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="resumo-item negativo">
                        <span class="resumo-label">Total Onus</span>
                        <span class="resumo-valor">R$ ${totalOnus.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-label">Pontos Corridos</span>
                        <span class="resumo-valor">R$ ${totalPC.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-label">Mata-Mata</span>
                        <span class="resumo-valor">R$ ${totalMM.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>

                <div class="relatorio-acoes">
                    <button onclick="window.exportarRelatorioCSV()" class="btn-fluxo btn-exportar">
                        <span class="material-icons">download</span>
                        Exportar CSV
                    </button>
                    <button onclick="window.voltarParaLista()" class="btn-fluxo btn-voltar">
                        <span class="material-icons">arrow_back</span>
                        Voltar
                    </button>
                </div>

                <div class="relatorio-tabela-container">
                    <table class="relatorio-tabela">
                        <thead>
                            <tr>
                                <th class="col-pos">#</th>
                                <th class="col-participante">Participante</th>
                                <th class="col-valor">Bonus</th>
                                <th class="col-valor">Onus</th>
                                <th class="col-valor">PC</th>
                                <th class="col-valor">MM</th>
                                <th class="col-valor">Mes</th>
                                <th class="col-valor">Ajustes</th>
                                <th class="col-saldo">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorio.map((p, i) => `
                                <tr class="${p.saldoFinal >= 0 ? 'positivo' : 'negativo'}">
                                    <td class="col-pos">${i + 1}º</td>
                                    <td class="col-participante">
                                        <div class="participante-cell">
                                            ${p.escudo
                                                ? `<img src="${p.escudo}" alt="" class="escudo-mini" onerror="this.style.display='none'" />`
                                                : '<span class="material-icons escudo-placeholder">person</span>'
                                            }
                                            <div class="participante-info">
                                                <span class="nome-time">${p.time || 'Time'}</span>
                                                <span class="nome-cartola">${p.nome || ''}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="col-valor positivo">+${(p.bonus || 0).toFixed(0)}</td>
                                    <td class="col-valor negativo">${(p.onus || 0).toFixed(0)}</td>
                                    <td class="col-valor">${(p.pontosCorridos || 0).toFixed(0)}</td>
                                    <td class="col-valor">${(p.mataMata || 0).toFixed(0)}</td>
                                    <td class="col-valor">${(p.melhorMes || 0).toFixed(0)}</td>
                                    <td class="col-valor">${(p.ajustes || 0).toFixed(0)}</td>
                                    <td class="col-saldo ${p.saldoFinal >= 0 ? 'positivo' : 'negativo'}">
                                        R$ ${p.saldoFinal.toFixed(2).replace('.', ',')}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="totais">
                                <td colspan="2"><strong>TOTAIS</strong></td>
                                <td class="col-valor positivo"><strong>+${totalBonus.toFixed(0)}</strong></td>
                                <td class="col-valor negativo"><strong>${totalOnus.toFixed(0)}</strong></td>
                                <td class="col-valor"><strong>${totalPC.toFixed(0)}</strong></td>
                                <td class="col-valor"><strong>${totalMM.toFixed(0)}</strong></td>
                                <td class="col-valor"><strong>${totalMelhorMes.toFixed(0)}</strong></td>
                                <td class="col-valor"><strong>${totalAjustes.toFixed(0)}</strong></td>
                                <td class="col-saldo"><strong>R$ ${totalSaldo.toFixed(2).replace('.', ',')}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <style>
                .relatorio-consolidado {
                    background: #1a1a1a;
                    border-radius: 12px;
                    padding: 24px;
                    border: 1px solid rgba(255, 69, 0, 0.2);
                }

                .relatorio-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #333;
                }

                .relatorio-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #fff;
                    margin: 0;
                    font-size: 1.25rem;
                }

                .relatorio-header h3 .material-icons {
                    color: #ff4500;
                }

                .relatorio-info {
                    color: #9ca3af;
                    font-size: 0.875rem;
                }

                .relatorio-resumo {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .resumo-item {
                    background: #252525;
                    padding: 16px;
                    border-radius: 8px;
                    text-align: center;
                }

                .resumo-item.positivo {
                    border-left: 3px solid #10b981;
                }

                .resumo-item.negativo {
                    border-left: 3px solid #ef4444;
                }

                .resumo-label {
                    display: block;
                    color: #9ca3af;
                    font-size: 0.75rem;
                    margin-bottom: 4px;
                }

                .resumo-valor {
                    display: block;
                    color: #fff;
                    font-size: 1.125rem;
                    font-weight: 600;
                }

                .relatorio-acoes {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .btn-exportar {
                    background: linear-gradient(135deg, #10b981, #059669) !important;
                }

                .btn-voltar {
                    background: #333 !important;
                }

                .relatorio-tabela-container {
                    overflow-x: auto;
                }

                .relatorio-tabela {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }

                .relatorio-tabela th,
                .relatorio-tabela td {
                    padding: 12px 8px;
                    text-align: center;
                    border-bottom: 1px solid #333;
                }

                .relatorio-tabela th {
                    background: #252525;
                    color: #9ca3af;
                    font-weight: 500;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                }

                .relatorio-tabela tbody tr:hover {
                    background: rgba(255, 69, 0, 0.05);
                }

                .col-pos {
                    width: 50px;
                    color: #6b7280;
                }

                .col-participante {
                    text-align: left !important;
                    min-width: 200px;
                }

                .participante-cell {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .escudo-mini {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .escudo-placeholder {
                    width: 32px;
                    height: 32px;
                    background: #333;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    color: #6b7280;
                }

                .participante-info {
                    display: flex;
                    flex-direction: column;
                }

                .nome-time {
                    color: #fff;
                    font-weight: 500;
                }

                .nome-cartola {
                    color: #6b7280;
                    font-size: 0.75rem;
                }

                .col-valor {
                    width: 70px;
                    color: #9ca3af;
                }

                .col-valor.positivo {
                    color: #10b981;
                }

                .col-valor.negativo {
                    color: #ef4444;
                }

                .col-saldo {
                    width: 100px;
                    font-weight: 600;
                }

                .col-saldo.positivo {
                    color: #10b981;
                }

                .col-saldo.negativo {
                    color: #ef4444;
                }

                .relatorio-tabela tfoot tr {
                    background: #252525;
                }

                .relatorio-tabela tfoot td {
                    border-top: 2px solid #ff4500;
                    color: #fff;
                }

                @media (max-width: 768px) {
                    .relatorio-consolidado {
                        padding: 16px;
                    }

                    .relatorio-header {
                        flex-direction: column;
                        gap: 10px;
                        align-items: flex-start;
                    }

                    .relatorio-tabela {
                        font-size: 0.75rem;
                    }

                    .col-participante {
                        min-width: 150px;
                    }

                    .escudo-mini {
                        width: 24px;
                        height: 24px;
                    }
                }
            </style>
        `;

        console.log(`[FLUXO-UI] ✅ Relatório consolidado renderizado (${relatorio.length} participantes)`);
    }
}

// =========================================================================
// ✅ v5.1: FUNÇÃO GLOBAL PARA VOLTAR À LISTA DE PARTICIPANTES
// =========================================================================
window.voltarParaLista = function() {
    if (window.inicializarFluxoFinanceiro) {
        window.inicializarFluxoFinanceiro();
    } else {
        location.reload();
    }
};

// =========================================================================
// ✅ v4.4.2: FUNÇÃO GLOBAL PARA LIMPAR CACHE DO PARTICIPANTE
// =========================================================================
window.recalcularCacheParticipante = async function (timeId) {
    const btn = document.getElementById(`btnRecalcCache-${timeId}`);
    const ligaId = window.obterLigaId?.();

    if (!ligaId) {
        alert("Liga não identificada. Recarregue a página.");
        return;
    }

    // Confirmar ação
    const confirmacao = confirm(
        `Limpar Cache\n\nIsso irá limpar o cache MongoDB do participante.\nNa próxima vez que ele acessar, os dados serão recalculados.\n\nContinuar?`,
    );

    if (!confirmacao) return;

    // UI: Loading
    if (btn) {
        btn.classList.add("loading");
        btn.disabled = true;
        btn.innerHTML = `<span class="material-icons" style="font-size: 14px;">sync</span> Aguarde...`;
    }

    try {
        console.log(`[FLUXO-UI] 🗑️ Limpando cache do time ${timeId}...`);

        // APENAS limpar cache no MongoDB - NÃO chamar endpoint de recálculo
        // O recálculo acontecerá quando o participante acessar
        const urlLimpeza = `/api/extrato-cache/${ligaId}/times/${timeId}/limpar`;
        const resLimpeza = await fetch(urlLimpeza, { method: "DELETE" });

        if (!resLimpeza.ok) {
            throw new Error(`Falha ao limpar cache: ${resLimpeza.status}`);
        }

        const resultadoLimpeza = await resLimpeza.json();
        console.log(`[FLUXO-UI] ✅ Cache limpo:`, resultadoLimpeza);

        // Feedback simples
        alert(
            `Cache limpo!\n\nO participante verá dados atualizados na próxima vez que acessar.`,
        );

        // NÃO recarregar - admin continua vendo os dados calculados pelo frontend
    } catch (error) {
        console.error(`[FLUXO-UI] ❌ Erro ao limpar cache:`, error);
        alert(`Erro ao limpar cache:\n${error.message}`);
    } finally {
        // UI: Restaurar botão
        if (btn) {
            btn.classList.remove("loading");
            btn.disabled = false;
            btn.innerHTML = `<span class="material-icons" style="font-size: 14px;">delete_sweep</span> Limpar Cache`;
        }
    }
};

// =========================================================================
// ✅ v4.5: FUNÇÃO GLOBAL PARA LIMPAR CACHE DE TODA A LIGA
// =========================================================================
window.limparCacheLiga = async function () {
    const ligaId = window.obterLigaId?.();

    if (!ligaId) {
        alert("Liga não identificada. Recarregue a página.");
        return;
    }

    // Confirmação com aviso forte
    const confirmacao = confirm(
        `LIMPAR CACHE DA LIGA\n\nIsso irá apagar o cache de TODOS os participantes.\nTodos terão os dados recalculados no próximo acesso.\n\nEssa ação é recomendada após atualizações nas regras de cálculo.\n\nContinuar?`,
    );

    if (!confirmacao) return;

    // Buscar botão e colocar em loading
    const btn = document.querySelector(".btn-limpar");
    if (btn) {
        btn.classList.add("loading");
        btn.disabled = true;
        btn.innerHTML = `<span class="material-icons">sync</span><span>Limpando...</span>`;
    }

    try {
        console.log(`[FLUXO-UI] 🗑️ Limpando cache de toda a liga ${ligaId}...`);

        const urlLimpeza = `/api/extrato-cache/${ligaId}/limpar`;
        const resLimpeza = await fetch(urlLimpeza, { method: "DELETE" });

        if (!resLimpeza.ok) {
            throw new Error(`Falha ao limpar cache: ${resLimpeza.status}`);
        }

        const resultado = await resLimpeza.json();
        console.log(`[FLUXO-UI] ✅ Cache da liga limpo:`, resultado);

        alert(
            `Cache da Liga Limpo!\n\n${resultado.deletedCount || 0} registros removidos.\n\nTodos os participantes terão dados recalculados no próximo acesso.`,
        );
    } catch (error) {
        console.error(`[FLUXO-UI] ❌ Erro ao limpar cache da liga:`, error);
        alert(`Erro ao limpar cache:\n${error.message}`);
    } finally {
        // Restaurar botão
        if (btn) {
            btn.classList.remove("loading");
            btn.disabled = false;
            btn.innerHTML = `<span class="material-icons">delete_sweep</span><span>Limpar Cache</span>`;
        }
    }
};

// =========================================================================
// ✅ v4.5: FUNÇÃO GLOBAL PARA RECALCULAR CACHE DE TODOS OS PARTICIPANTES
// =========================================================================
window.recalcularTodosCache = async function () {
    const ligaId = window.obterLigaId?.();

    if (!ligaId) {
        alert("Liga não identificada. Recarregue a página.");
        return;
    }

    // Verificar se core está disponível
    if (!window.fluxoFinanceiroCore) {
        alert("Módulo de cálculo não carregado. Recarregue a página.");
        return;
    }

    const core = window.fluxoFinanceiroCore;
    const cache = window.fluxoFinanceiroCache;

    // Obter lista de participantes
    const participantes = cache?.participantes || [];
    if (participantes.length === 0) {
        alert("Nenhum participante encontrado. Recarregue a página.");
        return;
    }

    const confirmacao = confirm(
        `RECALCULAR TODOS OS CACHES\n\nIsso irá recalcular o extrato de ${participantes.length} participantes e salvar no cache.\n\nPode demorar alguns segundos.\n\nContinuar?`,
    );

    if (!confirmacao) return;

    // Buscar botão e colocar em loading
    const btn = document.querySelector(".btn-recalcular");
    if (btn) {
        btn.classList.add("loading");
        btn.disabled = true;
    }

    const rodadaAtual = cache?.ultimaRodadaCompleta || 38;
    let sucesso = 0;
    let falha = 0;

    try {
        console.log(
            `[FLUXO-UI] 🔄 Recalculando cache de ${participantes.length} participantes...`,
        );

        for (let i = 0; i < participantes.length; i++) {
            const p = participantes[i];
            const timeId = p.time_id || p.id;

            // Atualizar botão com progresso
            if (btn) {
                btn.innerHTML = `<span class="material-icons">sync</span><span>${i + 1}/${participantes.length}</span>`;
            }

            try {
                // Calcular extrato usando o core do frontend
                const extrato = await core.calcularExtratoFinanceiro(
                    timeId,
                    rodadaAtual,
                );

                if (extrato && extrato.rodadas) {
                    // Enviar para o cache do backend
                    const response = await fetch(
                        `/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                extrato: extrato,
                                origem: "admin-recalculo-todos",
                                versao: "4.5",
                            }),
                        },
                    );

                    if (response.ok) {
                        sucesso++;
                        console.log(
                            `[FLUXO-UI] ✅ ${i + 1}/${participantes.length} - ${p.nome_cartola}`,
                        );
                    } else {
                        falha++;
                        console.warn(
                            `[FLUXO-UI] ⚠️ Falha ao salvar cache de ${p.nome_cartola}`,
                        );
                    }
                } else {
                    falha++;
                    console.warn(
                        `[FLUXO-UI] ⚠️ Extrato inválido para ${p.nome_cartola}`,
                    );
                }
            } catch (err) {
                falha++;
                console.error(
                    `[FLUXO-UI] ❌ Erro em ${p.nome_cartola}:`,
                    err.message,
                );
            }

            // Pequena pausa para não sobrecarregar
            await new Promise((r) => setTimeout(r, 100));
        }

        console.log(
            `[FLUXO-UI] ✅ Recálculo concluído: ${sucesso} ok, ${falha} falhas`,
        );
        alert(
            `Recálculo Concluído!\n\n${sucesso} caches atualizados\n${falha} falhas\n\nTodos os participantes verão dados atualizados.`,
        );
    } catch (error) {
        console.error(`[FLUXO-UI] ❌ Erro ao recalcular:`, error);
        alert(`Erro ao recalcular:\n${error.message}`);
    } finally {
        // Restaurar botão
        if (btn) {
            btn.classList.remove("loading");
            btn.disabled = false;
            btn.innerHTML = `<span class="material-icons">sync</span><span>Recalcular</span>`;
        }
    }
};

// =========================================================================
// FUNÇÃO GLOBAL PARA SALVAR CAMPO EDITÁVEL (VALOR)
// =========================================================================
window.salvarCampoEditavel = async function (input) {
    const campo = input.dataset.campo;
    const timeId = input.dataset.timeId;
    const valor = parseFloat(input.value) || 0;

    // Atualizar classe visual
    input.classList.remove("campo-positivo", "campo-negativo");
    if (valor > 0) input.classList.add("campo-positivo");
    else if (valor < 0) input.classList.add("campo-negativo");

    // Salvar no backend
    await FluxoFinanceiroCampos.salvarValorCampo(timeId, campo, valor);
};

// =========================================================================
// ✅ v4.6: FUNÇÃO GLOBAL PARA SALVAR NOME DO CAMPO EDITÁVEL (TÍTULO)
// =========================================================================
window.salvarNomeCampoEditavel = async function (input) {
    const campo = input.dataset.campo;
    const timeId = input.dataset.timeId;
    const nome = input.value.trim();

    if (!nome) {
        input.value = `Campo ${campo.replace("campo", "")}`;
        return;
    }

    try {
        // Feedback visual durante salvamento
        input.style.opacity = "0.7";
        input.disabled = true;

        await FluxoFinanceiroCampos.salvarNomeCampo(timeId, campo, nome);

        console.log(`[FLUXO-UI] ✅ Nome do campo salvo: ${campo} = "${nome}"`);

        // Feedback de sucesso
        input.style.borderColor = "#22c55e";
        setTimeout(() => {
            input.style.borderColor = "";
        }, 1500);
    } catch (error) {
        console.error(`[FLUXO-UI] ❌ Erro ao salvar nome do campo:`, error);
        alert(`Erro ao salvar nome do campo: ${error.message}`);
    } finally {
        input.style.opacity = "1";
        input.disabled = false;
    }
};

// =========================================================================
// FUNÇÃO GLOBAL PARA MOSTRAR DETALHAMENTO DE GANHOS
// =========================================================================
window.mostrarDetalhamentoGanhos = function () {
    if (!window.extratoAtual) return;

    const resumo = window.extratoAtual.resumo;
    const campos = window.extratoAtual.camposEditaveis || {};

    // Coletar todos os ganhos (valores positivos)
    const itens = [];

    if (resumo.bonus > 0)
        itens.push({ nome: "Bônus MITO", valor: resumo.bonus });
    if (resumo.pontosCorridos > 0)
        itens.push({ nome: "Pontos Corridos", valor: resumo.pontosCorridos });
    if (resumo.mataMata > 0)
        itens.push({ nome: "Mata-Mata", valor: resumo.mataMata });
    if (resumo.top10 > 0) itens.push({ nome: "TOP 10", valor: resumo.top10 });
    if (resumo.melhorMes > 0)
        itens.push({ nome: "Melhor do Mês", valor: resumo.melhorMes });

    // Campos manuais positivos
    if (campos.campo1?.valor > 0)
        itens.push({
            nome: campos.campo1.nome || "Campo 1",
            valor: campos.campo1.valor,
        });
    if (campos.campo2?.valor > 0)
        itens.push({
            nome: campos.campo2.nome || "Campo 2",
            valor: campos.campo2.valor,
        });
    if (campos.campo3?.valor > 0)
        itens.push({
            nome: campos.campo3.nome || "Campo 3",
            valor: campos.campo3.valor,
        });
    if (campos.campo4?.valor > 0)
        itens.push({
            nome: campos.campo4.nome || "Campo 4",
            valor: campos.campo4.valor,
        });

    const total = itens.reduce((acc, item) => acc + item.valor, 0);

    // Remover modal existente
    document.getElementById("modal-detalhamento")?.remove();

    const modal = document.createElement("div");
    modal.id = "modal-detalhamento";
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 24px; max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto; border: 1px solid rgba(34,197,94,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #22c55e; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons">trending_up</span> TUDO QUE GANHOU
                    </h3>
                    <button onclick="document.getElementById('modal-detalhamento').remove()" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 24px;">&times;</button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${
                        itens.length > 0
                            ? itens
                                  .map(
                                      (item) => `
                        <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(34,197,94,0.1); border-radius: 8px; border-left: 3px solid #22c55e;">
                            <span style="color: #e2e8f0;">${item.nome}</span>
                            <span style="color: #22c55e; font-weight: 600;">+R$ ${item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                    `,
                                  )
                                  .join("")
                            : '<p style="color: #94a3b8; text-align: center;">Nenhum ganho registrado</p>'
                    }
                </div>

                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8; font-weight: 600;">TOTAL GANHOS:</span>
                    <span style="color: #22c55e; font-weight: 700; font-size: 18px;">+R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.mostrarDetalhamentoPerdas = function () {
    if (!window.extratoAtual) return;

    const resumo = window.extratoAtual.resumo;
    const campos = window.extratoAtual.camposEditaveis || {};

    // Coletar todas as perdas (valores negativos)
    const itens = [];

    if (resumo.onus < 0)
        itens.push({ nome: "Ônus MICO", valor: Math.abs(resumo.onus) });
    if (resumo.pontosCorridos < 0)
        itens.push({
            nome: "Pontos Corridos",
            valor: Math.abs(resumo.pontosCorridos),
        });
    if (resumo.mataMata < 0)
        itens.push({ nome: "Mata-Mata", valor: Math.abs(resumo.mataMata) });
    if (resumo.top10 < 0)
        itens.push({ nome: "TOP 10", valor: Math.abs(resumo.top10) });
    if (resumo.melhorMes < 0)
        itens.push({
            nome: "Melhor do Mês",
            valor: Math.abs(resumo.melhorMes),
        });

    // Campos manuais negativos
    if (campos.campo1?.valor < 0)
        itens.push({
            nome: campos.campo1.nome || "Campo 1",
            valor: Math.abs(campos.campo1.valor),
        });
    if (campos.campo2?.valor < 0)
        itens.push({
            nome: campos.campo2.nome || "Campo 2",
            valor: Math.abs(campos.campo2.valor),
        });
    if (campos.campo3?.valor < 0)
        itens.push({
            nome: campos.campo3.nome || "Campo 3",
            valor: Math.abs(campos.campo3.valor),
        });
    if (campos.campo4?.valor < 0)
        itens.push({
            nome: campos.campo4.nome || "Campo 4",
            valor: Math.abs(campos.campo4.valor),
        });

    const total = itens.reduce((acc, item) => acc + item.valor, 0);

    // Remover modal existente
    document.getElementById("modal-detalhamento")?.remove();

    const modal = document.createElement("div");
    modal.id = "modal-detalhamento";
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 24px; max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto; border: 1px solid rgba(239,68,68,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #ef4444; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons">trending_down</span> TUDO QUE PERDEU
                    </h3>
                    <button onclick="document.getElementById('modal-detalhamento').remove()" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 24px;">&times;</button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${
                        itens.length > 0
                            ? itens
                                  .map(
                                      (item) => `
                        <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(239,68,68,0.1); border-radius: 8px; border-left: 3px solid #ef4444;">
                            <span style="color: #e2e8f0;">${item.nome}</span>
                            <span style="color: #ef4444; font-weight: 600;">-R$ ${item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                    `,
                                  )
                                  .join("")
                            : '<p style="color: #94a3b8; text-align: center;">Nenhuma perda registrada</p>'
                    }
                </div>

                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8; font-weight: 600;">TOTAL PERDAS:</span>
                    <span style="color: #ef4444; font-weight: 700; font-size: 18px;">-R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// =========================================================================
// FUNÇÃO GLOBAL PARA ABRIR AUDITORIA
// =========================================================================
window.abrirAuditoria = async function (timeId) {
    try {
        // Verificar se existe instância global
        if (!window.fluxoFinanceiroUI || !window.fluxoFinanceiroUI.auditoria) {
            console.warn("[UI] Instância de auditoria não disponível");
            alert("Sistema de auditoria não inicializado. Atualize a página.");
            return;
        }

        const auditoria = window.fluxoFinanceiroUI.auditoria;
        const core = window.fluxoFinanceiroCore;
        const cache = window.fluxoFinanceiroCache;

        // Mostrar loading
        const loadingDiv = document.createElement("div");
        loadingDiv.id = "auditoria-loading";
        loadingDiv.innerHTML = `
            <div class="modal-auditoria-overlay">
                <div style="text-align: center; color: #fff;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 16px;">Gerando auditoria...</p>
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);

        // Buscar extrato do participante
        const extrato = await core.calcularExtratoFinanceiro(
            timeId,
            cache.ultimaRodadaCompleta || 38,
        );

        // Buscar dados do participante
        const participante = await core.buscarParticipante(timeId);

        if (!participante) {
            document.getElementById("auditoria-loading")?.remove();
            alert("Participante não encontrado.");
            return;
        }

        // Gerar relatório completo (nível 3 = todos os detalhes)
        const relatorio = await auditoria.gerarRelatorioCompleto(
            timeId,
            extrato,
            3,
        );

        // Remover loading
        document.getElementById("auditoria-loading")?.remove();

        // Renderizar modal
        auditoria.renderizarModal(participante, relatorio);

        console.log(
            "[UI] ✅ Auditoria aberta para:",
            participante.nome_cartola,
        );
    } catch (error) {
        document.getElementById("auditoria-loading")?.remove();
        console.error("[UI] Erro ao abrir auditoria:", error);
        alert("Erro ao gerar auditoria: " + error.message);
    }
};

// =========================================================================
// ✅ v5.0: FUNÇÃO GLOBAL PARA EXPORTAR EXTRATO EM PDF (Multi-página)
// =========================================================================
window.exportarExtratoPDF = async function (timeId) {
    try {
        if (typeof window.jspdf === "undefined") {
            alert("Biblioteca jsPDF não carregada. Atualize a página.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const extrato = window.extratoAtual;
        const cache = window.fluxoFinanceiroCache;

        if (!extrato || !extrato.rodadas) {
            alert("Extrato não carregado. Selecione um participante primeiro.");
            return;
        }

        const participante = cache?.participantes?.find(
            (p) => p.time_id === timeId || p.id === timeId,
        ) || {};

        const nomeCartola = participante.nome_cartola || "Participante";
        const nomeTime = participante.nome_time || "Time";

        console.log(`[FLUXO-UI] 📄 Gerando PDF para ${nomeCartola}...`);

        // ===== PROCESSAR DADOS LINHA A LINHA =====
        const ganhos = [];
        const perdas = [];

        // Processar cada rodada
        extrato.rodadas.forEach((r) => {
            const rod = `R${r.rodada}`;
            const pts = r.pontos ? ` (${r.pontos.toFixed(2)} pts)` : "";

            // RANKING DE RODADAS (Bônus/Ônus)
            if (r.bonusOnus > 0) {
                const pos = r.posicao === 1 ? "MITO" : `${r.posicao}º lugar`;
                ganhos.push({ modulo: "RANKING DE RODADAS", desc: `${rod} - ${pos}${pts}`, valor: r.bonusOnus });
            } else if (r.bonusOnus < 0) {
                const pos = r.isMico ? "MICO" : `${r.posicao}º lugar`;
                perdas.push({ modulo: "RANKING DE RODADAS", desc: `${rod} - ${pos}${pts}`, valor: r.bonusOnus });
            }

            // Pontos Corridos
            if (r.pontosCorridos > 0) {
                ganhos.push({ modulo: "PONTOS CORRIDOS", desc: `${rod} - Vitória no confronto`, valor: r.pontosCorridos });
            } else if (r.pontosCorridos < 0) {
                perdas.push({ modulo: "PONTOS CORRIDOS", desc: `${rod} - Derrota no confronto`, valor: r.pontosCorridos });
            }

            // Mata-Mata
            if (r.mataMata > 0) {
                ganhos.push({ modulo: "MATA-MATA", desc: `${rod} - Vitória na fase`, valor: r.mataMata });
            } else if (r.mataMata < 0) {
                perdas.push({ modulo: "MATA-MATA", desc: `${rod} - Derrota na fase`, valor: r.mataMata });
            }

            // TOP 10 - Detalhamento completo
            if (r.top10 > 0) {
                const pos = r.top10Posicao || "?";
                const ptsTop = r.pontos ? ` com ${r.pontos.toFixed(2)} pts` : "";
                ganhos.push({ modulo: "TOP 10 MITOS", desc: `${pos}º melhor pontuação do campeonato${ptsTop}`, valor: r.top10 });
            } else if (r.top10 < 0) {
                const pos = r.top10Posicao || "?";
                const ptsTop = r.pontos ? ` com ${r.pontos.toFixed(2)} pts` : "";
                perdas.push({ modulo: "TOP 10 MICOS", desc: `${pos}º pior pontuação do campeonato${ptsTop}`, valor: r.top10 });
            }
        });

        // Campos manuais - usar o nome exato do campo
        const campos = extrato.camposEditaveis || {};
        ["campo1", "campo2", "campo3", "campo4"].forEach((key) => {
            const c = campos[key];
            if (c && c.valor !== 0) {
                const nomeCampo = c.nome || `Campo ${key.replace("campo", "")}`;
                if (c.valor > 0) {
                    ganhos.push({ modulo: nomeCampo.toUpperCase(), desc: "Lançamento manual", valor: c.valor });
                } else {
                    perdas.push({ modulo: nomeCampo.toUpperCase(), desc: "Lançamento manual", valor: c.valor });
                }
            }
        });

        // Totais
        const totalGanhos = ganhos.reduce((s, g) => s + g.valor, 0);
        const totalPerdas = perdas.reduce((s, p) => s + p.valor, 0);
        const saldo = parseFloat(extrato.resumo.saldo) || 0;

        // ===== CRIAR PDF =====
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const m = 10;
        const lineH = 4.5;
        const footerHeight = 45; // Espaço reservado para resumo + rodapé
        let paginaAtual = 1;

        // ===== FUNÇÃO PARA DESENHAR HEADER =====
        const desenharHeader = (isContinuacao = false) => {
            doc.setFillColor(26, 26, 26);
            doc.rect(0, 0, pw, 28, "F");
            doc.setFillColor(255, 69, 0);
            doc.rect(0, 0, pw, 3, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            const titulo = isContinuacao ? "EXTRATO FINANCEIRO (CONTINUAÇÃO)" : "EXTRATO FINANCEIRO";
            doc.text(titulo, pw / 2, 12, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${nomeCartola} - ${nomeTime}`, pw / 2, 20, { align: "center" });

            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            const pagina = isContinuacao ? ` | Página ${paginaAtual}` : "";
            doc.text(new Date().toLocaleString("pt-BR") + pagina, pw / 2, 26, { align: "center" });

            return 33; // Retorna Y após o header
        };

        // ===== FUNÇÃO PARA DESENHAR RODAPÉ E RESUMO =====
        const desenharRodape = () => {
            const resumoY = ph - 35;

            doc.setFillColor(40, 40, 45);
            doc.roundedRect(m, resumoY, pw - 2 * m, 18, 2, 2, "F");

            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 165, 0);
            doc.text("RESUMO POR MÓDULO", m + 3, resumoY + 5);

            const res = extrato.resumo;
            const modulos = [
                { nome: "RANKING", valor: res.bonus + res.onus },
                { nome: "PONTOS C.", valor: res.pontosCorridos },
                { nome: "MATA-MATA", valor: res.mataMata },
                { nome: "TOP 10", valor: res.top10 },
            ];

            const rw = (pw - 2 * m - 6) / 4;
            modulos.forEach((mod, i) => {
                const mx = m + 3 + i * rw;
                doc.setFontSize(6);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(150, 150, 150);
                doc.text(mod.nome, mx, resumoY + 10);

                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                const cor = mod.valor > 0 ? [34, 197, 94] : mod.valor < 0 ? [239, 68, 68] : [150, 150, 150];
                doc.setTextColor(...cor);
                const sinal = mod.valor > 0 ? "+" : "";
                doc.text(`${sinal}R$ ${mod.valor.toFixed(2)}`, mx, resumoY + 15);
            });

            doc.setDrawColor(255, 69, 0);
            doc.setLineWidth(0.3);
            doc.line(m, ph - 12, pw - m, ph - 12);

            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            doc.setFont("helvetica", "normal");
            doc.text("Super Cartola Manager - Documento para conferência", m, ph - 7);
            doc.text(`Página ${paginaAtual} | v5.0`, pw - m, ph - 7, { align: "right" });
        };

        // ===== PÁGINA 1 - HEADER + SALDO =====
        let y = desenharHeader(false);

        // Saldo central
        const corSaldo = saldo >= 0 ? [34, 197, 94] : [239, 68, 68];
        const txtSaldo = saldo >= 0 ? "SALDO A RECEBER" : "SALDO A PAGAR";

        doc.setFillColor(30, 30, 35);
        doc.roundedRect(m, y, pw - 2 * m, 18, 2, 2, "F");

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(txtSaldo, pw / 2, y + 6, { align: "center" });

        doc.setFontSize(16);
        doc.setTextColor(...corSaldo);
        doc.setFont("helvetica", "bold");
        doc.text(`R$ ${Math.abs(saldo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, pw / 2, y + 14, { align: "center" });

        y += 22;

        // ===== PREPARAR COLUNAS =====
        const colW = (pw - 3 * m) / 2;
        const colGanhosX = m;
        const colPerdasX = m + colW + m;

        // Títulos das colunas
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");

        doc.setFillColor(34, 197, 94);
        doc.roundedRect(colGanhosX, y, colW, 8, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(`GANHOS (+R$ ${totalGanhos.toFixed(2)})`, colGanhosX + colW / 2, y + 5.5, { align: "center" });

        doc.setFillColor(239, 68, 68);
        doc.roundedRect(colPerdasX, y, colW, 8, 1, 1, "F");
        doc.text(`PERDAS (-R$ ${Math.abs(totalPerdas).toFixed(2)})`, colPerdasX + colW / 2, y + 5.5, { align: "center" });

        y += 10;
        const startY = y;

        // ===== AGRUPAR ITENS POR MÓDULO =====
        const agrupar = (lista) => {
            const grupos = {};
            lista.forEach((item) => {
                if (!grupos[item.modulo]) grupos[item.modulo] = [];
                grupos[item.modulo].push(item);
            });
            return grupos;
        };

        const gruposGanhos = agrupar(ganhos);
        const gruposPerdas = agrupar(perdas);

        // Converter para lista linear com headers
        const linearizar = (grupos) => {
            const items = [];
            Object.keys(grupos).forEach((modulo) => {
                items.push({ tipo: "header", modulo });
                grupos[modulo].forEach((item) => {
                    items.push({ tipo: "item", ...item });
                });
            });
            return items;
        };

        const listaGanhos = linearizar(gruposGanhos);
        const listaPerdas = linearizar(gruposPerdas);

        // ===== DESENHAR LISTAS COM PAGINAÇÃO =====
        let lyGanhos = startY;
        let lyPerdas = startY;
        let idxGanhos = 0;
        let idxPerdas = 0;
        const maxY = ph - footerHeight;

        const desenharItem = (item, x, ly, isGanho) => {
            const cor = isGanho ? [34, 197, 94] : [239, 68, 68];

            if (item.tipo === "header") {
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(255, 165, 0);
                doc.text(item.modulo, x + 2, ly + 3);
            } else {
                doc.setFontSize(6.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0);

                // Truncar descrição se muito longa
                let desc = item.desc;
                if (desc.length > 35) desc = desc.substring(0, 32) + "...";
                doc.text(desc, x + 4, ly + 3);

                doc.setFont("helvetica", "bold");
                doc.setTextColor(...cor);
                const sinal = item.valor > 0 ? "+" : "";
                doc.text(`${sinal}${item.valor.toFixed(2)}`, x + colW - 3, ly + 3, { align: "right" });
            }
        };

        // Loop principal de desenho
        while (idxGanhos < listaGanhos.length || idxPerdas < listaPerdas.length) {
            // Verificar se precisa nova página
            if (lyGanhos >= maxY || lyPerdas >= maxY) {
                paginaAtual++;
                doc.addPage();
                y = desenharHeader(true);

                // Redesenhar títulos das colunas
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");

                doc.setFillColor(34, 197, 94);
                doc.roundedRect(colGanhosX, y, colW, 8, 1, 1, "F");
                doc.setTextColor(255, 255, 255);
                doc.text(`GANHOS (cont.)`, colGanhosX + colW / 2, y + 5.5, { align: "center" });

                doc.setFillColor(239, 68, 68);
                doc.roundedRect(colPerdasX, y, colW, 8, 1, 1, "F");
                doc.text(`PERDAS (cont.)`, colPerdasX + colW / 2, y + 5.5, { align: "center" });

                y += 10;
                lyGanhos = y;
                lyPerdas = y;
            }

            // Desenhar próximo item de ganhos
            if (idxGanhos < listaGanhos.length && lyGanhos < maxY) {
                desenharItem(listaGanhos[idxGanhos], colGanhosX, lyGanhos, true);
                lyGanhos += lineH;
                if (listaGanhos[idxGanhos].tipo === "header") lyGanhos += 0.5;
                idxGanhos++;
            }

            // Desenhar próximo item de perdas
            if (idxPerdas < listaPerdas.length && lyPerdas < maxY) {
                desenharItem(listaPerdas[idxPerdas], colPerdasX, lyPerdas, false);
                lyPerdas += lineH;
                if (listaPerdas[idxPerdas].tipo === "header") lyPerdas += 0.5;
                idxPerdas++;
            }
        }

        // ===== DESENHAR RODAPÉ NA ÚLTIMA PÁGINA =====
        desenharRodape();

        // ===== SALVAR =====
        const nomeArquivo = `extrato_${nomeCartola.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
        doc.save(nomeArquivo);

        console.log(`[FLUXO-UI] ✅ PDF gerado (${paginaAtual} página(s)): ${nomeArquivo}`);
    } catch (error) {
        console.error("[FLUXO-UI] ❌ Erro ao gerar PDF:", error);
        alert(`Erro ao gerar PDF: ${error.message}`);
    }
};

console.log("[FLUXO-UI] ✅ v5.1 carregado (Relatório Consolidado)");

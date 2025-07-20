import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
import { getLigaId } from "../pontos-corridos-utils.js";
import {
    ID_SUPERCARTOLA_2025,
    ID_CARTOLEIROS_SOBRAL,
    formatarMoeda,
} from "./fluxo-financeiro-utils.js";

// ==============================
// INTERFACE E RENDERIZAÇÃO
// ==============================

export class FluxoFinanceiroUI {
    constructor() {
        this.estilosAdicionados = false;
    }

    /**
     * Renderiza botões dos participantes
     * @param {Array} participantes - Array de participantes
     * @param {Function} onParticipanteClick - Callback quando um participante é clicado
     */
    renderizarBotoesParticipantes(participantes, onParticipanteClick) {
        const container = document.getElementById("fluxoFinanceiroButtons");
        if (!container) return;

        container.style.cssText = "";
        container.className = "participantes-buttons-container";

        if (participantes.length === 0) {
            container.innerHTML = `
                <div class="empty-buttons" style="text-align:center; padding:20px; background:#f8f9fa; border-radius:8px;">
                    <p style="color:#666;">Nenhum participante encontrado.</p>
                </div>
            `;
            return;
        }

        const buttonsHTML = `
            <div class="cards-grid">
                ${participantes
                    .map(
                        (p) => `
                    <div class="participante-card" data-time-id="${p.time_id}">
                        <div class="card-content">
                            ${p.clube_id ? `<img src="/escudos/${p.clube_id}.png" class="card-escudo" onerror="this.style.display='none'">` : ""}
                            <div class="card-info">
                                <div class="card-nome">${p.nome_cartola}</div>
                                <div class="card-time">${p.nome_time}</div>
                            </div>
                        </div>
                    </div>
                `,
                    )
                    .join("")}
            </div>
        `;

        container.innerHTML = buttonsHTML;
        this._adicionarEstilosBotoes();

        // Adicionar eventos
        container.querySelectorAll(".participante-card").forEach((card) => {
            card.addEventListener("click", async () => {
                const timeId = card.dataset.timeId;
                container
                    .querySelectorAll(".participante-card")
                    .forEach((btn) => btn.classList.remove("active"));
                card.classList.add("active");

                if (onParticipanteClick) {
                    await onParticipanteClick(timeId);
                }
            });
        });
    }

    /**
     * Renderiza extrato financeiro completo
     * @param {Object} extrato - Extrato financeiro
     * @param {Object} participante - Dados do participante
     * @param {Function} onCampoChange - Callback quando um campo é alterado
     */
    renderizarExtratoFinanceiro(extrato, participante, onCampoChange) {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        const ligaId = getLigaId();
        const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;

        if (!extrato.rodadas || extrato.rodadas.length === 0) {
            container.innerHTML = `
                <div class="error-message" style="text-align:center; padding:20px; background:#fff3f3; border-radius:8px;">
                    <p style="color:#d32f2f;">Nenhuma rodada encontrada para este participante.</p>
                    <p style="color:#666; margin-top:10px;">Tente recarregar a página ou selecione outro participante.</p>
                </div>
            `;
            return;
        }

        const headerHTML = this._gerarHeaderHTML(extrato, participante);
        const resumoHTML = this._gerarResumoHTML(
            extrato,
            participante,
            isSuperCartola2025,
        );
        const tabelaHTML = this._gerarTabelaHTML(extrato, isSuperCartola2025);

        container.innerHTML = headerHTML + resumoHTML + tabelaHTML;

        // Adicionar eventos aos campos editáveis
        FluxoFinanceiroCampos.adicionarEventosCamposEditaveis(
            participante.time_id,
            onCampoChange,
        );

        // Adicionar estilos
        this._adicionarEstilosExtrato();
    }

    /**
     * Renderiza loading
     * @param {string} mensagem - Mensagem de loading
     * @param {string} submensagem - Submensagem opcional
     */
    renderizarLoading(mensagem, submensagem = "") {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container" style="text-align:center; padding:40px 20px; background:#f8f9fa; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin:20px auto; max-width:700px;">
                <div class="loading-spinner" style="margin:0 auto 20px auto; width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #3949ab; border-radius:50%; animation:spin 1s linear infinite;"></div>
                <p style="font-size:16px; margin-bottom:10px;">${mensagem}</p>
                ${submensagem ? `<p style="font-size:14px; color:#6c757d;">${submensagem}</p>` : ""}
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    /**
     * Renderiza loading com barra de progresso
     * @param {string} mensagem - Mensagem de loading
     * @param {string} submensagem - Submensagem opcional
     */
    renderizarLoadingComProgresso(mensagem, submensagem = "") {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container" style="text-align:center; padding:40px 20px; background:#f8f9fa; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin:20px auto; max-width:700px;">
                <div class="loading-spinner" style="margin:0 auto 20px auto; width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #3949ab; border-radius:50%; animation:spin 1s linear infinite;"></div>
                <p style="font-size:16px; margin-bottom:10px;">${mensagem}</p>
                <p style="font-size:14px; color:#6c757d;">${submensagem}</p>
                <div style="width:100%; max-width:300px; margin:15px auto; background:#e9ecef; height:10px; border-radius:5px;">
                    <div id="loading-progress-bar" style="width:5%; background:#3949ab; height:10px; border-radius:5px;"></div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza botão de exportação
     * @param {Function} onExportClick - Callback quando o botão é clicado
     */
    renderizarBotaoExportacao(onExportClick) {
        const exportBtnContainer = document.getElementById(
            "fluxoFinanceiroExportBtnContainer",
        );
        if (!exportBtnContainer) return;

        const exportBtn = document.createElement("button");
        exportBtn.className = "btn-exportar-extrato";
        exportBtn.textContent = "Exportar Imagem";
        exportBtn.style.cssText = `
            padding: 6px 12px;
            background: #3949ab;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: background 0.2s;
        `;

        exportBtn.onmouseover = () => (exportBtn.style.background = "#303f9f");
        exportBtn.onmouseout = () => (exportBtn.style.background = "#3949ab");

        exportBtn.onclick = () => {
            exportBtn.disabled = true;
            exportBtn.textContent = "Exportando...";
            exportBtn.style.background = "#666";

            setTimeout(async () => {
                try {
                    await onExportClick();
                } catch (error) {
                    console.error("Erro na exportação:", error);
                    alert(
                        "Erro ao exportar extrato. Verifique o console para mais detalhes.",
                    );
                } finally {
                    exportBtn.disabled = false;
                    exportBtn.textContent = "Exportar Imagem";
                    exportBtn.style.background = "#3949ab";
                }
            }, 100);
        };

        exportBtnContainer.innerHTML = "";
        exportBtnContainer.appendChild(exportBtn);
    }

    /**
     * Limpa containers
     */
    limparContainers() {
        const containers = [
            "fluxoFinanceiroContent",
            "fluxoFinanceiroButtons",
            "fluxoFinanceiroExportBtnContainer",
        ];

        containers.forEach((id) => {
            const container = document.getElementById(id);
            if (container) container.innerHTML = "";
        });
    }

    /**
     * Gera HTML do header
     * @param {Object} extrato - Extrato financeiro
     * @param {Object} participante - Dados do participante
     * @returns {string} - HTML do header
     * @private
     */
    _gerarHeaderHTML(extrato, participante) {
        const saldoFormatado = formatarMoeda(extrato.resumo.saldo);

        return `
            <div class="extrato-header">
                <div class="participante-info">
                    ${participante.clube_id ? `<img src="/escudos/${participante.clube_id}.png" class="participante-escudo" onerror="this.style.display='none'" alt="Escudo ${participante.nome_time}">` : ""}
                    <div>
                        <h3 class="participante-nome">${participante.nome_cartola}</h3>
                        <p class="participante-time">${participante.nome_time}</p>
                    </div>
                </div>
                <div class="saldo-container ${extrato.resumo.saldo >= 0 ? "saldo-positivo" : "saldo-negativo"}">
                    <div class="saldo-label">Saldo Final</div>
                    <div class="saldo-valor">${saldoFormatado}</div>
                </div>
            </div>
        `;
    }

    /**
     * ✅ AJUSTE: Gera HTML do resumo SEM a coluna MELHOR MÊS
     * @param {Object} extrato - Extrato financeiro
     * @param {Object} participante - Dados do participante
     * @param {boolean} isSuperCartola2025 - Se é SuperCartola 2025
     * @returns {string} - HTML do resumo
     * @private
     */
    _gerarResumoHTML(extrato, participante, isSuperCartola2025) {
        const cardsBasicos = `
            <div class="resumo-card">
                <div class="card-label">Bônus</div>
                <div class="card-valor positivo">${formatarMoeda(extrato.resumo.bonus)}</div>
            </div>
            <div class="resumo-card">
                <div class="card-label">Ônus</div>
                <div class="card-valor negativo">${formatarMoeda(extrato.resumo.onus)}</div>
            </div>
        `;

        // ✅ REMOÇÃO: Card "Melhor Mês" removido da renderização
        const cardsSuper = isSuperCartola2025
            ? `
            <div class="resumo-card">
                <div class="card-label">Pontos Corridos</div>
                <div class="card-valor ${extrato.resumo.pontosCorridos >= 0 ? "positivo" : "negativo"}">${formatarMoeda(extrato.resumo.pontosCorridos)}</div>
            </div>
            <div class="resumo-card">
                <div class="card-label">Mata-Mata</div>
                <div class="card-valor ${extrato.resumo.mataMata >= 0 ? "positivo" : "negativo"}">${formatarMoeda(extrato.resumo.mataMata)}</div>
            </div>
        `
            : "";

        const camposEditaveis = ["campo1", "campo2", "campo3", "campo4"]
            .map((campo) =>
                FluxoFinanceiroCampos.gerarHtmlCampoEditavel(
                    participante.time_id,
                    campo,
                    extrato.camposEditaveis[campo],
                ),
            )
            .join("");

        const cardsEstatisticas = `
            <div class="resumo-card estatistica">
                <div class="card-label">Vezes como MITO</div>
                <div class="card-valor mito-destaque">${extrato.resumo.vezesMito}</div>
            </div>
            <div class="resumo-card estatistica">
                <div class="card-label">Vezes como MICO</div>
                <div class="card-valor mico-destaque">${extrato.resumo.vezesMico}</div>
            </div>
        `;

        return `
            <div class="resumo-container">
                <h4 class="resumo-titulo">Resumo Financeiro</h4>
                <div class="resumo-cards">
                    ${cardsBasicos}
                    ${cardsSuper}
                    ${camposEditaveis}
                    ${cardsEstatisticas}
                </div>
            </div>
        `;
    }

    /**
     * ✅ AJUSTE: Gera HTML da tabela SEM a coluna MELHOR MÊS
     * @param {Object} extrato - Extrato financeiro
     * @param {boolean} isSuperCartola2025 - Se é SuperCartola 2025
     * @returns {string} - HTML da tabela
     * @private
     */
    _gerarTabelaHTML(extrato, isSuperCartola2025) {
        // ✅ REMOÇÃO: Coluna "Melhor Mês" removida do cabeçalho
        const colunas = isSuperCartola2025
            ? "<th>Pontos Corridos</th><th>Mata-Mata</th>"
            : "";

        let tabelaHTML = `
            <div class="detalhamento-container">
                <h4 class="detalhamento-titulo">Detalhamento por Rodada</h4>
                <div class="tabela-container">
                    <table class="tabela-extrato">
                        <thead>
                            <tr>
                                <th>Rodada</th>
                                <th>Posição</th>
                                <th>Bônus/Ônus</th>
                                ${colunas}
                                <th>Total Acumulado</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        const rodadasOrdenadas = [...extrato.rodadas].sort(
            (a, b) => a.rodada - b.rodada,
        );

        rodadasOrdenadas.forEach((rodada) => {
            const { posicaoClasse, posicaoTexto } = this._obterClassePosicao(
                rodada,
                extrato.totalTimes,
            );

            // ✅ REMOÇÃO: Coluna "Melhor Mês" removida das linhas da tabela
            const colunasSuper = isSuperCartola2025
                ? `
                <td class="${this._obterClasseValor(rodada.pontosCorridos)}">
                    ${this._formatarValorTabela(rodada.pontosCorridos)}
                </td>
                <td class="${this._obterClasseValor(rodada.mataMata)}">
                    ${this._formatarValorTabela(rodada.mataMata)}
                </td>
            `
                : "";

            tabelaHTML += `
                <tr class="rodada-row">
                    <td class="rodada-numero">${rodada.rodada}</td>
                    <td class="${posicaoClasse}">${posicaoTexto}</td>
                    <td class="${this._obterClasseValor(rodada.bonusOnus)} ${rodada.bonusOnus > 0 ? "bonus-destaque" : rodada.bonusOnus < 0 ? "onus-destaque" : ""}">${this._formatarValorTabela(rodada.bonusOnus)}</td>
                    ${colunasSuper}
                    <td class="${this._obterClasseValor(rodada.saldo)} saldo-acumulado">${this._formatarValorTabela(rodada.saldo)}</td>
                </tr>
            `;
        });

        tabelaHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        return tabelaHTML;
    }

    /**
     * Obtém classe CSS para posição
     * @param {Object} rodada - Dados da rodada
     * @param {number} totalTimes - Total de times
     * @returns {Object} - Classe e texto da posição
     * @private
     */
    _obterClassePosicao(rodada, totalTimes) {
        const isMito = rodada.posicao === 1;
        const isMico = rodada.posicao === totalTimes;
        const isTop11 = rodada.posicao >= 1 && rodada.posicao <= 11;
        const isZ22_32 = rodada.posicao >= 22 && rodada.posicao <= 32;

        if (isMito)
            return { posicaoClasse: "mito-posicao", posicaoTexto: "MITO" };
        if (isMico)
            return { posicaoClasse: "mico-posicao", posicaoTexto: "MICO" };
        if (isTop11)
            return {
                posicaoClasse: "top11-posicao",
                posicaoTexto: `${rodada.posicao}°`,
            };
        if (isZ22_32)
            return {
                posicaoClasse: "z22-32-posicao",
                posicaoTexto: `${rodada.posicao}°`,
            };

        return { posicaoClasse: "", posicaoTexto: `${rodada.posicao}°` };
    }

    /**
     * Obtém classe CSS para valor
     * @param {number} valor - Valor a ser classificado
     * @returns {string} - Classe CSS
     * @private
     */
    _obterClasseValor(valor) {
        if (valor > 0) return "positivo";
        if (valor < 0) return "negativo";
        return "";
    }

    /**
     * Formata valor para tabela
     * @param {number} valor - Valor a ser formatado
     * @returns {string} - Valor formatado
     * @private
     */
    _formatarValorTabela(valor) {
        if (typeof valor !== "number" || valor === 0) return "-";
        return formatarMoeda(valor);
    }

    /**
     * Adiciona estilos dos botões
     * @private
     */
    _adicionarEstilosBotoes() {
        if (document.getElementById("fluxo-financeiro-botoes-style")) return;

        const style = document.createElement("style");
        style.id = "fluxo-financeiro-botoes-style";
        style.textContent = `
            .participantes-buttons-container {
                max-width: 1200px;
                margin: 0 auto 20px auto;
            }
            .cards-grid {
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                gap: 8px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            @media (max-width: 1200px) {
                .cards-grid { grid-template-columns: repeat(6, 1fr); }
            }
            @media (max-width: 900px) {
                .cards-grid { grid-template-columns: repeat(4, 1fr); }
            }
            @media (max-width: 600px) {
                .cards-grid { grid-template-columns: repeat(2, 1fr); }
            }
            .participante-card {
                background: #fff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .participante-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 3px 8px rgba(0,0,0,0.15);
                border-color: #bbdefb;
            }
            .participante-card.active {
                background: #e3f2fd;
                border-color: #2196f3;
                box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3);
                transform: translateY(-1px);
            }
            .card-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .card-escudo {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #fff;
                border: 1px solid #eee;
                flex-shrink: 0;
                object-fit: cover;
            }
            .card-info {
                overflow: hidden;
                flex: 1;
            }
            .card-nome {
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: #333;
            }
            .card-time {
                font-size: 11px;
                color: #666;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Adiciona estilos do extrato
     * @private
     */
    _adicionarEstilosExtrato() {
        if (document.getElementById("fluxo-financeiro-extrato-style")) return;

        const style = document.createElement("style");
        style.id = "fluxo-financeiro-extrato-style";
        style.textContent = `
            #fluxoFinanceiroContent {
                max-width: 900px;
                margin: 0 auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .extrato-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 24px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border: 1px solid #dee2e6;
            }
            .participante-info {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            .participante-escudo {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #fff;
                border: 2px solid #dee2e6;
                object-fit: cover;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .participante-nome {
                font-size: 20px;
                font-weight: 700;
                margin: 0 0 4px 0;
                color: #212529;
            }
            .participante-time {
                font-size: 14px;
                margin: 0;
                color: #6c757d;
                font-weight: 500;
            }
            .saldo-container {
                text-align: right;
                padding: 15px 20px;
                border-radius: 8px;
                min-width: 140px;
            }
            .saldo-positivo {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .saldo-negativo {
                background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            .saldo-label {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
                opacity: 0.8;
            }
            .saldo-valor {
                font-size: 24px;
                font-weight: 800;
                line-height: 1;
            }
            .resumo-container {
                background: #fff;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 24px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                border: 1px solid #e9ecef;
            }
            .resumo-titulo {
                font-size: 18px;
                font-weight: 700;
                margin: 0 0 20px 0;
                color: #212529;
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 10px;
            }
            .resumo-cards {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 15px;
            }
            .resumo-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                border: 1px solid #e9ecef;
                transition: all 0.2s ease;
            }
            .resumo-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .campo-editavel {
                background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
                border: 2px solid #ffb74d;
            }
            .estatistica {
                background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
                border: 1px solid #81c784;
            }
            .card-label {
                font-size: 12px;
                font-weight: 600;
                color: #495057;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .card-valor {
                font-size: 18px;
                font-weight: 700;
                color: #212529;
            }
            .card-valor-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .campo-nome, .campo-valor {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                text-align: center;
                background: #fff;
                transition: border-color 0.2s ease;
            }
            .campo-nome:focus, .campo-valor:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
            }
            .positivo { color: #28a745; font-weight: 600; }
            .negativo { color: #dc3545; font-weight: 600; }
            .mito-destaque { color: #155724; font-weight: 800; }
            .mico-destaque { color: #721c24; font-weight: 800; }
            .bonus-destaque {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%) !important;
                font-weight: 700 !important;
                border: 1px solid #b8daff !important;
            }
            .onus-destaque {
                background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%) !important;
                font-weight: 700 !important;
                border: 1px solid #f5c6cb !important;
            }
            .detalhamento-container {
                background: #fff;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                border: 1px solid #e9ecef;
            }
            .detalhamento-titulo {
                font-size: 18px;
                font-weight: 700;
                margin: 0 0 20px 0;
                color: #212529;
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 10px;
            }
            .tabela-container {
                overflow-x: auto;
                border-radius: 8px;
                border: 1px solid #dee2e6;
            }
            .tabela-extrato {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
                background: #fff;
            }
            .tabela-extrato th {
                background: linear-gradient(135deg, #495057 0%, #343a40 100%);
                color: #fff;
                padding: 12px 8px;
                text-align: center;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 2px solid #dee2e6;
                position: sticky;
                top: 0;
                z-index: 10;
            }
            .tabela-extrato td {
                padding: 10px 8px;
                text-align: center;
                border-bottom: 1px solid #e9ecef;
                font-weight: 500;
            }
            .rodada-row:hover {
                background-color: #f8f9fa;
            }
            .rodada-numero {
                font-weight: 700;
                color: #495057;
                background-color: #f8f9fa;
            }
            .saldo-acumulado {
                font-weight: 700;
                background-color: #f8f9fa;
                border-left: 3px solid #007bff;
            }
            .top11-posicao {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%) !important;
                color: #155724 !important;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #b8daff;
            }
            .mito-posicao {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
                color: #fff !important;
                font-weight: 800;
                border-radius: 6px;
                letter-spacing: 1px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                border: 2px solid #20c997;
            }
            .z22-32-posicao {
                background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%) !important;
                color: #721c24 !important;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #f5c6cb;
            }
            .mico-posicao {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
                color: #fff !important;
                font-weight: 800;
                border-radius: 6px;
                letter-spacing: 1px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                border: 2px solid #c82333;
            }

            /* Responsividade para tabela */
            @media (max-width: 768px) {
                .tabela-extrato {
                    font-size: 12px;
                }
                .tabela-extrato th,
                .tabela-extrato td {
                    padding: 8px 4px;
                }
                .resumo-cards {
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 10px;
                }
                .extrato-header {
                    flex-direction: column;
                    text-align: center;
                    gap: 15px;
                }
                .saldo-container {
                    min-width: auto;
                }
            }

            /* Animações */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .resumo-card,
            .detalhamento-container {
                animation: fadeIn 0.3s ease-out;
            }

            /* Melhorias de acessibilidade */
            .tabela-extrato th {
                user-select: none;
            }

            .participante-card:focus {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }

            /* Indicadores visuais especiais */
            .valor-destaque-positivo {
                background: linear-gradient(45deg, #28a745, #20c997);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-weight: 800;
            }

            .valor-destaque-negativo {
                background: linear-gradient(45deg, #dc3545, #e74c3c);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-weight: 800;
            }
        `;
        document.head.appendChild(style);
    }
}

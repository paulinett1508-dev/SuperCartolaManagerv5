// FLUXO-FINANCEIRO-UI.JS - Interface com padrão do sistema
import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";

export class FluxoFinanceiroUI {
    constructor() {
        this.containerId = "fluxoFinanceiroContent";
        this.buttonsContainerId = "fluxoFinanceiroButtons";
    }

    renderizarBotoesParticipantes(participantes) {
        const container = document.getElementById(this.buttonsContainerId);
        if (!container) return;

        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <input type="text" 
                       id="searchParticipante" 
                       placeholder="🔍 Pesquisar participante por nome ou time..."
                       style="width: 100%; padding: 12px 16px; border: 2px solid #ddd; border-radius: 8px; 
                              font-size: 15px; transition: all 0.3s ease;"
                       onkeyup="window.filtrarParticipantes(this.value)"
                       onfocus="this.style.borderColor='var(--laranja)'"
                       onblur="this.style.borderColor='#ddd'">
                <div id="resultadosCount" style="margin-top: 8px; font-size: 13px; color: #666; text-align: right;">
                    ${participantes.length} participantes
                </div>
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
                            ${
                                p.url_escudo_png
                                    ? `<div class="participante-avatar">
                                       <img src="${p.url_escudo_png}" alt="${p.nome_cartola}">
                                       </div>`
                                    : `<div class="participante-avatar">
                                       <div class="avatar-placeholder">⚽</div>
                                       </div>`
                            }
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

        // Armazenar participantes globalmente para filtro
        window.totalParticipantes = participantes.length;
    }

    renderizarMensagemInicial() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="estado-inicial">
                <div class="estado-inicial-icon">💰</div>
                <h2 class="estado-inicial-titulo">Extrato Financeiro</h2>
                <p class="estado-inicial-subtitulo">
                    Selecione um participante acima para visualizar o extrato detalhado
                </p>
            </div>
        `;
    }

    renderizarLoading(mensagem = "Carregando...") {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>${mensagem}</p>
            </div>
        `;
    }

    renderizarExtratoFinanceiro(extrato, participante, callback) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const formatarValorComCor = (valor) => {
            const valorNum = parseFloat(valor) || 0;
            const classe = valorNum >= 0 ? "valor-positivo" : "valor-negativo";
            const sinal = valorNum > 0 ? "+" : "";
            const valorFormatado = Math.abs(valorNum).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            return `<span class="${classe}">${sinal}${valorNum < 0 ? "-" : ""}${valorFormatado}</span>`;
        };

        const corFundoSaldo = (valor) => {
            const valorNum = parseFloat(valor) || 0;
            return valorNum >= 0
                ? "rgba(46, 204, 113, 0.1)"
                : "rgba(231, 76, 60, 0.1)";
        };

        let html = `
        <div class="extrato-container">
            <!-- Cabeçalho -->
            <div class="extrato-header" style="background: linear-gradient(135deg, ${(() => {
                const saldo = parseFloat(extrato.resumo.saldo) || 0;
                return saldo >= 0 ? "#2E8B57, #228B22" : "#dc3545, #c82333";
            })()} 100%);">
                <div class="extrato-participante-info">
                    ${
                        participante.url_escudo_png
                            ? `<div class="extrato-avatar">
                               <img src="${participante.url_escudo_png}" alt="${participante.nome_cartola}">
                               </div>`
                            : `<div class="extrato-avatar">
                               <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; 
                                           background: white; border-radius: 50%; font-size: 24px;">⚽</div>
                               </div>`
                    }
                    <div class="extrato-dados">
                        <h2 class="extrato-titulo">${participante.nome_cartola}</h2>
                        <p class="extrato-participante">${participante.nome_time}</p>
                    </div>
                    <div style="text-align: right; padding: 12px 20px; background: rgba(255,255,255,0.2); 
                                border-radius: 8px; backdrop-filter: blur(10px);">
                        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">
                            ${parseFloat(extrato.resumo.saldo) >= 0 ? "SALDO A RECEBER" : "SALDO A PAGAR"}
                        </div>
                        <div style="font-size: 28px; font-weight: 700;">
                            R$ ${(() => {
                                const valorNum =
                                    parseFloat(extrato.resumo.saldo) || 0;
                                const sinal = valorNum > 0 ? "+" : "";
                                const valorFormatado = Math.abs(
                                    valorNum,
                                ).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                });
                                return `${sinal}${valorNum < 0 ? "-" : ""}${valorFormatado}`;
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cards de Resumo -->
            <div class="resumo-grid">
                <div class="resumo-card bonus">
                    <div class="resumo-titulo">BÔNUS DE RODADAS</div>
                    <div class="resumo-valor">R$ ${formatarValorComCor(extrato.resumo.bonus)}</div>
                </div>

                <div class="resumo-card onus">
                    <div class="resumo-titulo">ÔNUS DE RODADAS</div>
                    <div class="resumo-valor">R$ ${formatarValorComCor(extrato.resumo.onus)}</div>
                </div>

                <div class="resumo-card pontos-corridos">
                    <div class="resumo-titulo">PONTOS CORRIDOS</div>
                    <div class="resumo-valor">R$ ${formatarValorComCor(extrato.resumo.pontosCorridos)}</div>
                </div>

                <div class="resumo-card mata-mata">
                    <div class="resumo-titulo">MATA-MATA</div>
                    <div class="resumo-valor">R$ ${formatarValorComCor(extrato.resumo.mataMata)}</div>
                </div>
            </div>

            <!-- Campos Editáveis -->
            <div class="resumo-container" style="background: #fff3cd; border: 1px solid #ffc107;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #856404; display: flex; 
                           align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">⚙️</span> AJUSTES MANUAIS (Admin)
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    ${this._renderizarCampoEditavel(participante.time_id || participante.id, "campo1", extrato.camposEditaveis.campo1)}
                    ${this._renderizarCampoEditavel(participante.time_id || participante.id, "campo2", extrato.camposEditaveis.campo2)}
                    ${this._renderizarCampoEditavel(participante.time_id || participante.id, "campo3", extrato.camposEditaveis.campo3)}
                    ${this._renderizarCampoEditavel(participante.time_id || participante.id, "campo4", extrato.camposEditaveis.campo4)}
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ffc107; 
                            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div style="font-size: 14px; color: #856404;">
                        <strong>Total Ajustes:</strong> 
                        R$ ${formatarValorComCor(
                            (extrato.resumo.campo1 || 0) +
                                (extrato.resumo.campo2 || 0) +
                                (extrato.resumo.campo3 || 0) +
                                (extrato.resumo.campo4 || 0),
                        )}
                    </div>
                    <button onclick="window.calcularEExibirExtrato('${participante.time_id || participante.id}')" 
                            style="background: #ffc107; color: #856404; border: none; padding: 8px 16px; 
                                   border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        🔄 Recalcular
                    </button>
                </div>
            </div>

            <!-- Tabela de Rodadas -->
            <div class="detalhamento-container">
                <div class="detalhamento-header">
                    <h3 class="detalhamento-titulo">Detalhamento por Rodada</h3>
                </div>
                <div class="tabela-wrapper">
                    <table class="detalhamento-tabela">
                        <thead>
                            <tr>
                                <th>RODADA</th>
                                <th>POSIÇÃO</th>
                                <th>BÔNUS/ÔNUS</th>
                                <th>P. CORRIDOS</th>
                                <th>MATA-MATA</th>
                                <th class="saldo-col">SALDO</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${extrato.rodadas
                                .map(
                                    (rodada, index) => `
                                <tr>
                                    <td class="rodada-col">
                                        Rodada ${rodada.rodada}
                                    </td>
                                    <td class="posicao-col">
                                        ${(() => {
                                            if (rodada.posicao === null) {
                                                return '<span class="pos-neutro">N/D</span>';
                                            }

                                            const isPrimeiro =
                                                rodada.posicao === 1;
                                            const isUltimo =
                                                rodada.posicao ===
                                                rodada.totalTimes;

                                            if (isPrimeiro) {
                                                return '<span class="pos-mito">MITO 🎩</span>';
                                            } else if (isUltimo) {
                                                return '<span class="pos-mico">MICO 🐵</span>';
                                            } else if (rodada.isMito) {
                                                return `<span class="pos-mito">${rodada.posicao}° 👑</span>`;
                                            } else if (rodada.isMico) {
                                                return `<span class="pos-mico">${rodada.posicao}° 💀</span>`;
                                            } else {
                                                return `<span class="pos-normal">${rodada.posicao}°</span>`;
                                            }
                                        })()}
                                    </td>
                                    <td class="valor-col">R$ ${formatarValorComCor(rodada.bonusOnus || 0)}</td>
                                    <td class="valor-col">
                                        ${
                                            rodada.pontosCorridos !== null
                                                ? `R$ ${formatarValorComCor(rodada.pontosCorridos)}`
                                                : '<span class="valor-neutro">—</span>'
                                        }
                                    </td>
                                    <td class="valor-col">
                                        ${
                                            rodada.mataMata !== 0
                                                ? `R$ ${formatarValorComCor(rodada.mataMata)}`
                                                : '<span class="valor-neutro">—</span>'
                                        }
                                    </td>
                                    <td class="saldo-col" style="background: ${corFundoSaldo(rodada.saldo)};">
                                        R$ ${formatarValorComCor(rodada.saldo)}
                                    </td>
                                </tr>
                            `,
                                )
                                .join("")}
                        </tbody>
                        <tfoot>
                            <tr style="background: var(--bg-secondary); border-top: 3px solid var(--border-color);">
                                <td colspan="5" style="padding: 16px; text-align: right; font-weight: 700; font-size: 16px;">
                                    SALDO FINAL:
                                </td>
                                <td class="saldo-col" style="padding: 16px; font-size: 20px; font-weight: 700; 
                                           background: ${corFundoSaldo(extrato.resumo.saldo)};">
                                    R$ ${formatarValorComCor(extrato.resumo.saldo)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>`;

        container.innerHTML = html;
    }

    _renderizarCampoEditavel(timeId, nomeCampo, campoData) {
        const valor = campoData?.valor || 0;
        const nome = campoData?.nome || `Campo ${nomeCampo.slice(-1)}`;

        return `
        <div style="background: white; border-radius: 6px; padding: 12px; border: 1px solid #ffc107;">
            <label style="display: block; font-size: 12px; color: #856404; margin-bottom: 6px; font-weight: 600;">
                ${nome}
            </label>
            <input type="number" 
                   step="0.01" 
                   value="${valor}"
                   onchange="window.salvarCampoEditavel('${timeId}', '${nomeCampo}', this.value)"
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; 
                          font-size: 14px; font-weight: 600; text-align: right;">
            <button onclick="window.editarNomeCampo('${timeId}', '${nomeCampo}')" 
                    style="margin-top: 6px; background: transparent; border: 1px solid #ffc107; 
                           color: #856404; padding: 4px 8px; border-radius: 4px; cursor: pointer; 
                           font-size: 11px; width: 100%;">
                ✏️ Renomear
            </button>
        </div>`;
    }

    renderizarBotaoExportacao(callback) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const botaoContainer = document.createElement("div");
        botaoContainer.className = "fluxo-financeiro-export";
        botaoContainer.innerHTML = `
            <button onclick="this.disabled=true; this.textContent='Gerando...'; 
                           window.exportarExtratoAtual();" 
                    class="btn-export">
                <span class="export-icon">📸</span>
                Exportar como Imagem
            </button>
        `;

        window.exportarExtratoAtual = callback;
        container.appendChild(botaoContainer);
    }
}

// Funções globais para campos editáveis
window.salvarCampoEditavel = async function (timeId, nomeCampo, valor) {
    try {
        const valorNum = parseFloat(valor) || 0;
        await FluxoFinanceiroCampos.salvarValorCampo(
            timeId,
            nomeCampo,
            valorNum,
        );
        console.log(`Campo ${nomeCampo} salvo: R$ ${valorNum}`);
    } catch (error) {
        console.error("Erro ao salvar campo:", error);
        alert("Erro ao salvar campo. Tente novamente.");
    }
};

window.editarNomeCampo = async function (timeId, nomeCampo) {
    try {
        const nomeAtual = await FluxoFinanceiroCampos.obterNomeCampo(
            timeId,
            nomeCampo,
        );
        const novoNome = prompt(
            `Renomear campo:\n\nNome atual: ${nomeAtual}\n\nNovo nome:`,
            nomeAtual,
        );

        if (novoNome && novoNome.trim()) {
            await FluxoFinanceiroCampos.salvarNomeCampo(
                timeId,
                nomeCampo,
                novoNome.trim(),
            );
            window.calcularEExibirExtrato(timeId);
        }
    } catch (error) {
        console.error("Erro ao renomear campo:", error);
        alert("Erro ao renomear campo. Tente novamente.");
    }
};

window.desfazerCampo = async function (timeId, nomeCampo) {
    await FluxoFinanceiroCampos.desfazerCampo(timeId, nomeCampo);
};

// Função de filtro de participantes
window.filtrarParticipantes = function (termoBusca) {
    const termo = termoBusca.toLowerCase().trim();
    const cards = document.querySelectorAll(".participante-card");
    let visiveis = 0;

    cards.forEach((card) => {
        const nome = card.getAttribute("data-nome") || "";
        const time = card.getAttribute("data-time") || "";

        if (nome.includes(termo) || time.includes(termo)) {
            card.style.display = "";
            visiveis++;
        } else {
            card.style.display = "none";
        }
    });

    // Atualizar contador
    const contador = document.getElementById("resultadosCount");
    if (contador) {
        if (termo) {
            contador.textContent = `${visiveis} de ${window.totalParticipantes} participantes`;
            contador.style.color = visiveis > 0 ? "#2ecc71" : "#e74c3c";
        } else {
            contador.textContent = `${window.totalParticipantes} participantes`;
            contador.style.color = "#666";
        }
    }
};

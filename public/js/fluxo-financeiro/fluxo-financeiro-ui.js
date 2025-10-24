// FLUXO-FINANCEIRO-UI.JS - Interface com botão de relatório
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
            <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                <button onclick="window.gerarRelatorioFinanceiro()" 
                        style="background: var(--gradient-primary); 
                               color: white; border: none; padding: 10px 16px; border-radius: 6px; 
                               cursor: pointer; font-weight: 600; font-size: 12px; display: flex; 
                               align-items: center; gap: 6px; transition: all 0.3s ease;
                               box-shadow: var(--shadow-orange);"
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(255, 69, 0, 0.5)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-orange)'">
                    <span style="font-size: 16px;">📊</span>
                    <span>Relatório Consolidado</span>
                </button>
                <div style="flex: 1; min-width: 300px;">
                    <input type="text" 
                           id="searchParticipante" 
                           placeholder="🔍 Pesquisar participante por nome ou time..."
                           style="width: 100%; padding: 10px 16px; border: 2px solid var(--border-primary); border-radius: 6px; 
                                  font-size: 13px; transition: all 0.3s ease; background: var(--bg-card); color: var(--text-primary);"
                           onkeyup="window.filtrarParticipantes(this.value)"
                           onfocus="this.style.borderColor='var(--laranja)'"
                           onblur="this.style.borderColor='var(--border-primary)'">
                </div>
            </div>
            <div id="resultadosCount" style="margin-bottom: 8px; font-size: 11px; color: var(--text-muted); text-align: right;">
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

    async renderizarExtratoFinanceiro(extrato, participante) {
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

        const formatarPosicao = (rodada) => {
            // Sem posição
            if (!rodada.posicao && !rodada.isMito && !rodada.isMico) {
                return `<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; 
                    background: var(--bg-secondary); color: var(--text-muted); font-size: 11px; font-weight: 600;">
                    -
                </span>`;
            }

            // MITO (1º lugar)
            if (rodada.posicao === 1 || rodada.isMito) {
                return `<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; 
                    background: linear-gradient(135deg, #2ecc71, #27ae60); 
                    color: white; font-size: 11px; font-weight: 700; border: 2px solid #f1c40f;
                    box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3); text-transform: uppercase; letter-spacing: 0.5px;">
                    🎩 MITO
                </span>`;
            }

            // MICO (último lugar)
            if (rodada.posicao === rodada.totalTimes || rodada.isMico) {
                return `<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; 
                    background: linear-gradient(135deg, #e74c3c, #c0392b); 
                    color: white; font-size: 11px; font-weight: 700; border: 2px solid #943126;
                    box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3); text-transform: uppercase; letter-spacing: 0.5px;">
                    🐵 MICO
                </span>`;
            }

            // Top 11 (2º ao 11º)
            const isTop11 = rodada.posicao >= 2 && rodada.posicao <= 11;
            if (isTop11) {
                return `<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; 
                    background: rgba(46, 204, 113, 0.15); color: #2ecc71; 
                    font-size: 11px; font-weight: 700; border: 1px solid #2ecc71;">
                    ${rodada.posicao}º
                </span>`;
            }

            // Z4 (22º ao 31º)
            const isZ22_31 = rodada.posicao >= 22 && rodada.posicao <= 31;
            if (isZ22_31) {
                return `<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; 
                    background: rgba(231, 76, 60, 0.15); color: #e74c3c; 
                    font-size: 11px; font-weight: 700; border: 1px solid #e74c3c;">
                    ${rodada.posicao}º
                </span>`;
            }

            // Meio de tabela (12º ao 21º e 32º)
            return `<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; 
                background: var(--bg-secondary); color: var(--text-secondary); 
                font-size: 11px; font-weight: 600; border: 1px solid var(--border-primary);">
                ${rodada.posicao}º
            </span>`;
        };

        // CARREGAR CAMPOS EDITÁVEIS ANTES DE MONTAR O HTML
        const camposEditaveisHTML = await this.renderizarCamposEditaveis(
            participante.time_id || participante.id,
        );

        let html = `
        <div class="extrato-container">
            <!-- CABEÇALHO PROFISSIONAL -->
            <div class="extrato-header" style="background: var(--bg-card); padding: 20px; border-radius: 8px; 
                 margin-bottom: 20px; box-shadow: var(--shadow-md); border: 1px solid var(--border-primary);">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    ${
                        participante.url_escudo_png
                            ? `<div style="width: 56px; height: 56px; border-radius: 50%; overflow: hidden; 
                                   border: 2px solid var(--border-primary); flex-shrink: 0;">
                                   <img src="${participante.url_escudo_png}" alt="${participante.nome_cartola}" 
                                        style="width: 100%; height: 100%; object-fit: cover;">
                               </div>`
                            : `<div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-secondary); 
                                   border: 2px solid var(--border-primary); display: flex; align-items: center; 
                                   justify-content: center; font-size: 24px; flex-shrink: 0;">⚽</div>`
                    }
                    <div style="flex: 1; min-width: 0;">
                        <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: var(--text-primary); 
                             white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${participante.nome_cartola}
                        </h2>
                        <p style="margin: 0; font-size: 13px; color: var(--text-muted); font-weight: 500; 
                             white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${participante.nome_time}
                        </p>
                    </div>
                    <div style="text-align: right; display: flex; flex-direction: column; gap: 8px;">
                        <button onclick="window.recarregarExtratoAtual()" 
                                style="background: var(--gradient-secondary); color: white; border: none; 
                                       padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; 
                                       font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; 
                                       gap: 4px; align-self: flex-end;"
                                onmouseover="this.style.transform='translateY(-1px)'"
                                onmouseout="this.style.transform='translateY(0)'">
                            <span style="font-size: 14px;">🔄</span>
                            <span>Atualizar</span>
                        </button>
                        <div>
                            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; 
                                 letter-spacing: 0.5px; margin-bottom: 4px;">Saldo Total</div>
                            <div id="saldoTotalDisplay" style="font-size: 24px; font-weight: 700; color: ${
                                parseFloat(extrato.resumo.saldo) >= 0
                                    ? "#2ecc71"
                                    : "#e74c3c"
                            };">
                                R$ ${parseFloat(
                                    extrato.resumo.saldo,
                                ).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CARDS RESUMO COMPACTOS -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px;">
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-secondary);">
                        <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; 
                             letter-spacing: 0.5px; margin-bottom: 6px;">🎁 Bônus</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
                            ${formatarValorComCor(extrato.resumo.bonus)}
                        </div>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-secondary);">
                        <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; 
                             letter-spacing: 0.5px; margin-bottom: 6px;">⚠️ Ônus</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
                            ${formatarValorComCor(extrato.resumo.onus)}
                        </div>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-secondary);">
                        <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; 
                             letter-spacing: 0.5px; margin-bottom: 6px;">🏆 P. Corridos</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
                            ${formatarValorComCor(extrato.resumo.pontosCorridos)}
                        </div>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-secondary);">
                        <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; 
                             letter-spacing: 0.5px; margin-bottom: 6px;">⚔️ Mata-Mata</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
                            ${formatarValorComCor(extrato.resumo.mataMata)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Campos Editáveis -->
            ${camposEditaveisHTML}

            <!-- Histórico Rodadas -->
            <div style="background: var(--bg-card); border-radius: 8px; padding: 20px; 
                 box-shadow: var(--shadow-md); border: 1px solid var(--border-primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--text-primary); 
                         display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 18px;">📋</span>
                        Histórico de Rodadas
                    </h3>
                    <button id="btnExportarExtrato"
                            style="background: var(--gradient-primary); color: white; border: none; padding: 8px 16px; 
                                   border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; 
                                   display: flex; align-items: center; gap: 6px; transition: all 0.3s ease; 
                                   box-shadow: var(--shadow-orange);"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(255, 69, 0, 0.5)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-orange)'">
                        <span style="font-size: 16px;">📸</span>
                        <span>Exportar Extrato</span>
                    </button>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: var(--gradient-primary);">
                                <th style="padding: 10px 8px; text-align: left; color: white; font-weight: 600; 
                                     font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Rodada</th>
                                <th style="padding: 10px 8px; text-align: left; color: white; font-weight: 600; 
                                     font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Posição</th>
                                <th style="padding: 10px 8px; text-align: center; color: white; font-weight: 600; 
                                     font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Bônus/Ônus</th>
                                <th style="padding: 10px 8px; text-align: center; color: white; font-weight: 600; 
                                     font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">P. Corridos</th>
                                <th style="padding: 10px 8px; text-align: center; color: white; font-weight: 600; 
                                     font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Mata-Mata</th>
                                <th style="padding: 10px 8px; text-align: center; color: white; font-weight: 600; 
                                     font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; background: rgba(0,0,0,0.2);">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${extrato.rodadas
                                .map((r, index) => {
                                    // Definir cor da borda lateral
                                    let bordaLateral = "";
                                    if (r.posicao === 1 || r.isMito) {
                                        bordaLateral =
                                            "border-left: 4px solid #2ecc71;";
                                    } else if (
                                        r.posicao === r.totalTimes ||
                                        r.isMico
                                    ) {
                                        bordaLateral =
                                            "border-left: 4px solid #e74c3c;";
                                    }

                                    return `
                                <tr style="border-bottom: 1px solid var(--border-secondary); transition: all 0.2s ease; 
                                     ${bordaLateral}
                                     ${index % 2 === 0 ? "background: rgba(255,255,255,0.02);" : ""}" 
                                     onmouseover="this.style.background='var(--table-row-hover)'" 
                                     onmouseout="this.style.background='${index % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"}'">
                                    <td style="padding: 10px 8px; font-weight: 600; color: var(--text-primary);">
                                        ${r.rodada}ª
                                    </td>
                                    <td style="padding: 10px 8px;">
                                        ${formatarPosicao(r)}
                                    </td>
                                    <td style="padding: 10px 8px; text-align: center;">
                                        ${formatarValorComCor(r.bonusOnus)}
                                    </td>
                                    <td style="padding: 10px 8px; text-align: center;">
                                        ${formatarValorComCor(r.pontosCorridos)}
                                    </td>
                                    <td style="padding: 10px 8px; text-align: center;">
                                        ${formatarValorComCor(r.mataMata)}
                                    </td>
                                    <td style="padding: 10px 8px; text-align: center; font-weight: 700; 
                                         background: ${corFundoSaldo(r.saldo)};">
                                        ${formatarValorComCor(r.saldo)}
                                    </td>
                                </tr>
                            `;
                                })
                                .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        container.innerHTML = html;

        // ✅ Adicionar event listener para botão de exportação
        setTimeout(() => {
            const btnExportar = document.getElementById('btnExportarExtrato');
            if (btnExportar) {
                btnExportar.onclick = async () => {
                    // Preparar dados do extrato no formato esperado
                    const dadosMovimentacoes = [];

                    extrato.rodadas.forEach((rodada) => {
                        if (rodada.bonusOnus !== 0) {
                            let descricao = `${rodada.rodada}ª Rodada`;
                            if (rodada.isMito) descricao += ' - MITO';
                            if (rodada.isMico) descricao += ' - MICO';
                            if (rodada.posicao) descricao += ` (${rodada.posicao}°)`;

                            dadosMovimentacoes.push({
                                data: `R${rodada.rodada}`,
                                descricao,
                                valor: rodada.bonusOnus,
                                tipo: 'bonus_onus',
                            });
                        }

                        if (rodada.pontosCorridos !== null && rodada.pontosCorridos !== 0) {
                            dadosMovimentacoes.push({
                                data: `R${rodada.rodada}`,
                                descricao: `${rodada.rodada}ª Rodada - Pontos Corridos`,
                                valor: rodada.pontosCorridos,
                                tipo: 'pontos_corridos',
                            });
                        }

                        if (rodada.mataMata !== 0) {
                            dadosMovimentacoes.push({
                                data: `R${rodada.rodada}`,
                                descricao: `${rodada.rodada}ª Rodada - Mata-Mata`,
                                valor: rodada.mataMata,
                                tipo: 'mata_mata',
                            });
                        }
                    });

                    // Adicionar campos editáveis se houver
                    ['campo1', 'campo2', 'campo3', 'campo4'].forEach((campo) => {
                        const valorCampo = extrato.resumo[campo];
                        if (valorCampo && valorCampo !== 0) {
                            const campoEditavel = extrato.camposEditaveis?.[campo];
                            dadosMovimentacoes.push({
                                data: 'Manual',
                                descricao: campoEditavel?.nome || `Campo ${campo.slice(-1)}`,
                                valor: valorCampo,
                                tipo: 'campo_editavel',
                            });
                        }
                    });

                    // Chamar função de exportação
                    if (window.exportarExtratoComoImagem) {
                        try {
                            const rodadaAtual = extrato.rodadas.length > 0 
                                ? extrato.rodadas[extrato.rodadas.length - 1].rodada 
                                : 0;

                            await window.exportarExtratoComoImagem(
                                dadosMovimentacoes,
                                participante,
                                rodadaAtual
                            );
                        } catch (error) {
                            console.error('[FLUXO-UI] Erro ao exportar extrato:', error);
                            alert('Erro ao exportar extrato: ' + error.message);
                        }
                    } else {
                        alert('Função de exportação não disponível');
                    }
                };
            }
        }, 100);
    }

    async renderizarCamposEditaveis(timeId) {
        const campos =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId);

        const camposArray = [
            {
                nomeCampo: "campo1",
                label: campos.campo1?.nome || "Campo 1",
                valorAtual: campos.campo1?.valor || 0,
            },
            {
                nomeCampo: "campo2",
                label: campos.campo2?.nome || "Campo 2",
                valorAtual: campos.campo2?.valor || 0,
            },
            {
                nomeCampo: "campo3",
                label: campos.campo3?.nome || "Campo 3",
                valorAtual: campos.campo3?.valor || 0,
            },
            {
                nomeCampo: "campo4",
                label: campos.campo4?.nome || "Campo 4",
                valorAtual: campos.campo4?.valor || 0,
            },
        ];

        return `
            <div style="background: var(--bg-card); border-radius: 8px; padding: 20px; margin-bottom: 20px; 
                 box-shadow: var(--shadow-md); border: 1px solid var(--border-primary);">
                <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: var(--text-primary); 
                     display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">⚙️</span>
                    Campos Personalizados
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    ${camposArray
                        .map(
                            (campo) => `
                        <div style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-secondary);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; 
                                     text-transform: uppercase; letter-spacing: 0.5px; flex: 1; cursor: pointer;"
                                     onclick="window.editarNomeCampo('${timeId}', '${campo.nomeCampo}')">
                                    ${campo.label}
                                </div>
                                ${
                                    campo.valorAtual !== 0
                                        ? `<button onclick="window.desfazerCampo('${timeId}', '${campo.nomeCampo}')" 
                                               style="background: none; border: none; color: var(--text-muted); 
                                                      cursor: pointer; padding: 0; font-size: 14px; line-height: 1;"
                                               title="Desfazer">↩️</button>`
                                        : ""
                                }
                            </div>
                            <input type="text" 
                                   id="input_${campo.nomeCampo}"
                                   value="${campo.valorAtual >= 0 ? '+' : ''}R$ ${Math.abs(campo.valorAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}" 
                                   onfocus="this.value = '${campo.valorAtual}'; this.type='number'; this.step='0.01'"
                                   onblur="this.type='text'; const val = parseFloat(this.value) || 0; this.value = (val >= 0 ? '+R$ ' : '-R$ ') + Math.abs(val).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}); this.style.color = val >= 0 ? '#2ecc71' : '#e74c3c';"
                                   onchange="window.salvarCampoEditavelComRecalculo('${timeId}', '${campo.nomeCampo}', this.value)"
                                   style="width: 100%; padding: 8px; border: 1px solid var(--border-primary); 
                                          border-radius: 4px; font-size: 14px; font-weight: 600; 
                                          background: var(--bg-card); color: ${campo.valorAtual >= 0 ? "#2ecc71" : "#e74c3c"}; transition: all 0.3s ease;">
                        </div>
                    `,
                        )
                        .join("")}
                </div>
            </div>
        `;
    }

    renderizarRelatorioConsolidado(relatorio) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const formatarValor = (valor) => {
            const num = parseFloat(valor) || 0;
            const sinal = num > 0 ? "+" : "";
            return `<span style="color: ${num >= 0 ? "#2ecc71" : "#e74c3c"}; font-weight: 700;">
                ${sinal}R$ ${Math.abs(num).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}
            </span>`;
        };

        let html = `
            <div style="background: var(--bg-card); border-radius: 8px; padding: 24px; 
                 box-shadow: var(--shadow-lg); border: 1px solid var(--border-primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div>
                        <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: var(--text-primary); 
                             display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">📊</span>
                            Relatório Consolidado
                        </h2>
                        <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                            Visão geral do fluxo financeiro de todos os participantes
                        </p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.exportarRelatorioCSV()" 
                                style="background: var(--gradient-secondary); color: white; border: none; padding: 10px 16px; 
                                       border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; 
                                       display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;"
                                onmouseover="this.style.transform='translateY(-1px)'"
                                onmouseout="this.style.transform='translateY(0)'">
                            <span style="font-size: 16px;">📥</span>
                            <span>Exportar CSV</span>
                        </button>
                        <button onclick="window.location.reload()" 
                                style="background: var(--gradient-primary); color: white; border: none; padding: 10px 16px; 
                                       border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; 
                                       display: flex; align-items: center; gap: 6px; transition: all 0.3s ease; 
                                       box-shadow: var(--shadow-orange);"
                                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(255, 69, 0, 0.5)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-orange)'">
                            <span style="font-size: 16px;">🔄</span>
                            <span>Voltar</span>
                        </button>
                    </div>
                </div>

                <!-- Tabela Compacta -->
                <div style="background: var(--bg-card); border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-md); border: 1px solid var(--border-primary);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background: var(--gradient-primary);">
                                <th style="padding: 8px 6px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">#</th>
                                <th style="padding: 8px 6px; text-align: left; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">Participante</th>
                                <th style="padding: 8px 6px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">Bônus</th>
                                <th style="padding: 8px 6px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">Ônus</th>
                                <th style="padding: 8px 6px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">P.Corridos</th>
                                <th style="padding: 8px 6px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">Mata-Mata</th>
                                <th style="padding: 8px 6px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">Ajustes</th>
                                <th style="padding: 8px 6px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; background: rgba(0,0,0,0.2);">Saldo Final</th>
                                <th style="padding: 8px 6px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorio
                                .map(
                                    (p, index) => `
                                <tr style="border-bottom: 1px solid var(--border-secondary); transition: all 0.2s ease; ${index % 2 === 0 ? "background: rgba(255,255,255,0.02);" : ""}" onmouseover="this.style.background='var(--table-row-hover)'" onmouseout="this.style.background='${index % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"}'">
                                    <td style="padding: 6px 4px; font-weight: 600; color: var(--text-muted);">${index + 1}º</td>
                                    <td style="padding: 6px 4px;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            ${
                                                p.escudo
                                                    ? `<img src="${p.escudo}" alt="${p.nome}" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border-primary);">`
                                                    : '<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--bg-secondary); border: 1px solid var(--border-primary); display: flex; align-items: center; justify-content: center; font-size: 12px;">⚽</div>'
                                            }
                                            <div style="min-width: 0;">
                                                <div style="font-weight: 600; color: var(--text-primary); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nome}</div>
                                                <div style="font-size: 9px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.time}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding: 6px 4px; text-align: center; color: var(--text-secondary);">${formatarValor(p.bonus)}</td>
                                    <td style="padding: 6px 4px; text-align: center; color: var(--text-secondary);">${formatarValor(p.onus)}</td>
                                    <td style="padding: 6px 4px; text-align: center; color: var(--text-secondary);">${formatarValor(p.pontosCorridos)}</td>
                                    <td style="padding: 6px 4px; text-align: center; color: var(--text-secondary);">${formatarValor(p.mataMata)}</td>
                                    <td style="padding: 6px 4px; text-align: center; color: var(--text-secondary);">${formatarValor(p.ajustes)}</td>
                                    <td style="padding: 6px 4px; text-align: center; font-weight: 700; background: rgba(255, 69, 0, 0.05); border-left: 2px solid var(--laranja);">${formatarValor(p.saldoFinal)}</td>
                                    <td style="padding: 6px 4px; text-align: center;">
                                        <button onclick="window.selecionarParticipante('${p.timeId}')" style="background: var(--gradient-primary); color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; transition: all 0.2s ease; font-weight: 600;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            `,
                                )
                                .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }
}
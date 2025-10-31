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

    formatarTop10Cell(rodada) {
        if (!rodada.top10 || rodada.top10 === 0) {
            return `<span style="color: var(--text-muted); font-weight: 400;">-</span>`;
        }

        const valor = parseFloat(rodada.top10) || 0;
        const status = rodada.top10Status || (valor > 0 ? "MITO" : "MICO");
        const posicao = parseInt(rodada.top10Posicao) || 1;

        const isMito = status === "MITO";
        const cor = isMito ? "#2ecc71" : "#e74c3c";
        const icone = isMito ? "🏆" : "🐵";
        const corFundo = isMito
            ? "linear-gradient(90deg, rgba(46,204,113,0.12), transparent)"
            : "linear-gradient(90deg, rgba(231,76,60,0.12), transparent)";

        const textoTipo = isMito ? "MAIOR" : "PIOR";
        const ordinal =
            posicao === 1
                ? isMito
                    ? "1º"
                    : "1ª"
                : posicao === 2
                  ? isMito
                      ? "2º"
                      : "2ª"
                  : posicao === 3
                    ? isMito
                        ? "3º"
                        : "3ª"
                    : `${posicao}º`;

        const sinal = valor > 0 ? "+" : "";
        const valorFormatado = Math.abs(valor).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        return `
            <div style="background: ${corFundo}; 
                 border-left: 2px solid ${cor};
                 padding: 3px 5px;
                 border-radius: 3px;
                 display: flex;
                 flex-direction: column;
                 gap: 1px;
                 text-align: center;
                 white-space: nowrap;">
                <span style="font-weight: 700; color: ${cor}; font-size: 8px; letter-spacing: 0.1px; line-height: 1.1;">
                    ${icone} ${ordinal} ${textoTipo}
                </span>
                <span style="color: ${cor}; font-weight: 600; font-size: 10px;">
                    ${sinal}R$ ${valorFormatado}
                </span>
            </div>
        `;
    }

    async renderizarExtratoFinanceiro(extrato, participante) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // ✅ TRANSFORMAR DADOS PARA FORMATO DE EXPORTAÇÃO
        const dadosParaExportacao = [];

        // ✅ ADICIONAR CAMPOS EDITÁVEIS AO ARRAY DE EXPORTAÇÃO
        if (extrato.camposEditaveis) {
            const campos = extrato.camposEditaveis;

            if (
                campos.campo1 &&
                (campos.campo1.nome || campos.campo1.valor !== 0)
            ) {
                dadosParaExportacao.push({
                    tipo: "campo_editavel",
                    data: "GERAL",
                    descricao: campos.campo1.nome || "Campo 1",
                    valor: parseFloat(campos.campo1.valor) || 0,
                });
            }

            if (
                campos.campo2 &&
                (campos.campo2.nome || campos.campo2.valor !== 0)
            ) {
                dadosParaExportacao.push({
                    tipo: "campo_editavel",
                    data: "GERAL",
                    descricao: campos.campo2.nome || "Campo 2",
                    valor: parseFloat(campos.campo2.valor) || 0,
                });
            }

            if (
                campos.campo3 &&
                (campos.campo3.nome || campos.campo3.valor !== 0)
            ) {
                dadosParaExportacao.push({
                    tipo: "campo_editavel",
                    data: "GERAL",
                    descricao: campos.campo3.nome || "Campo 3",
                    valor: parseFloat(campos.campo3.valor) || 0,
                });
            }

            if (
                campos.campo4 &&
                (campos.campo4.nome || campos.campo4.valor !== 0)
            ) {
                dadosParaExportacao.push({
                    tipo: "campo_editavel",
                    data: "GERAL",
                    descricao: campos.campo4.nome || "Campo 4",
                    valor: parseFloat(campos.campo4.valor) || 0,
                });
            }
        }

        if (extrato.rodadas && Array.isArray(extrato.rodadas)) {
            extrato.rodadas.forEach((rodada) => {
                const numeroRodada = `R${rodada.rodada}`;
                const posicaoTexto = rodada.posicao ? `${rodada.posicao}°` : "";

                // Bônus/Ônus
                if (rodada.bonusOnus && rodada.bonusOnus !== 0) {
                    const isMito = rodada.isMito || rodada.posicao === 1;
                    const isMico =
                        rodada.isMico || rodada.posicao === rodada.totalTimes;
                    let descricao = `${posicaoTexto} lugar`;
                    if (isMito) descricao += " 🎩 MITO";
                    if (isMico) descricao += " 🐵 MICO";

                    dadosParaExportacao.push({
                        tipo: "bonus_onus",
                        data: numeroRodada,
                        descricao: descricao,
                        valor: rodada.bonusOnus,
                    });
                }

                // Pontos Corridos
                if (rodada.pontosCorridos && rodada.pontosCorridos !== 0) {
                    dadosParaExportacao.push({
                        tipo: "pontos_corridos",
                        data: numeroRodada,
                        descricao: `Pontos Corridos ${posicaoTexto}`,
                        valor: rodada.pontosCorridos,
                    });
                }

                // Mata-Mata
                if (rodada.mataMata && rodada.mataMata !== 0) {
                    dadosParaExportacao.push({
                        tipo: "mata_mata",
                        data: numeroRodada,
                        descricao: `Mata-Mata ${posicaoTexto}`,
                        valor: rodada.mataMata,
                    });
                }

                // TOP 10
                if (rodada.top10 && rodada.top10 !== 0) {
                    const status =
                        rodada.top10Status ||
                        (rodada.top10 > 0 ? "MITO" : "MICO");
                    const posicaoTop10 = rodada.top10Posicao || 1;
                    const ordinal =
                        posicaoTop10 === 1
                            ? status === "MITO"
                                ? "1º"
                                : "1ª"
                            : posicaoTop10 === 2
                              ? status === "MITO"
                                  ? "2º"
                                  : "2ª"
                              : posicaoTop10 === 3
                                ? status === "MITO"
                                    ? "3º"
                                    : "3ª"
                                : `${posicaoTop10}º`;
                    const tipoTexto = status === "MITO" ? "MAIOR" : "PIOR";

                    dadosParaExportacao.push({
                        tipo: "top10",
                        data: numeroRodada,
                        descricao: `TOP 10: ${ordinal} ${tipoTexto}`,
                        valor: rodada.top10,
                        top10Status: status, // ✅ Adicionar status
                        top10Posicao: posicaoTop10, // ✅ Adicionar posição
                        top10Ordinal: ordinal, // ✅ Adicionar ordinal formatado
                        top10Tipo: tipoTexto, // ✅ Adicionar tipo (MAIOR/PIOR)
                    });
                }
            });
        }

        // ✅ ARMAZENAR DADOS GLOBALMENTE PARA EXPORTAÇÃO
        window.extratoAtual = {
            dadosExtrato: dadosParaExportacao,
            participante: participante,
            rodadaAtual: extrato.rodadas?.length || 0,
            rodadas: extrato.rodadas || [], // ✅ CORRIGIDO: incluir rodadas para detalhamento
            resumo: extrato.resumo || {} // ✅ CORRIGIDO: incluir resumo para detalhamento
        };

        const formatarValorComCor = (valor) => {
            const valorNum = parseFloat(valor) || 0;

            // ✅ VALORES ZERO = BRANCO/CINZA (sem cor)
            if (valorNum === 0) {
                return `<span style="color: var(--text-muted); font-weight: 400;">-</span>`;
            }

            const classe = valorNum > 0 ? "valor-positivo" : "valor-negativo";
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
                    <div style="text-align: right;">
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; 
                             letter-spacing: 0.5px; margin-bottom: 4px;">Saldo Total</div>
                        <div style="font-size: 24px; font-weight: 700; color: ${
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

                <!-- CARDS RESUMO SIMPLIFICADOS -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px;">
                    <div onclick="window.mostrarDetalhamentoGanhos()" 
                         style="background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(46, 204, 113, 0.05)); 
                                padding: 16px; border-radius: 8px; border: 2px solid rgba(46, 204, 113, 0.3);
                                cursor: pointer; transition: all 0.3s ease;"
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(46, 204, 113, 0.3)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <div style="font-size: 11px; color: rgba(46, 204, 113, 0.8); font-weight: 700; text-transform: uppercase; 
                             letter-spacing: 0.8px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 16px;">💰</span>
                            <span>Tudo que Ganhou</span>
                            <span style="font-size: 10px; margin-left: auto; opacity: 0.7;">🔍 clique</span>
                        </div>
                        <div style="font-size: 20px; font-weight: 700; color: #2ecc71;">
                            +R$ ${(
                                extrato.resumo.totalGanhos || 0
                            ).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>

                    <div onclick="window.mostrarDetalhamentoPerdas()" 
                         style="background: linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(231, 76, 60, 0.05)); 
                                padding: 16px; border-radius: 8px; border: 2px solid rgba(231, 76, 60, 0.3);
                                cursor: pointer; transition: all 0.3s ease;"
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(231, 76, 60, 0.3)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <div style="font-size: 11px; color: rgba(231, 76, 60, 0.8); font-weight: 700; text-transform: uppercase; 
                             letter-spacing: 0.8px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 16px;">💸</span>
                            <span>Tudo que Perdeu</span>
                            <span style="font-size: 10px; margin-left: auto; opacity: 0.7;">🔍 clique</span>
                        </div>
                        <div style="font-size: 20px; font-weight: 700; color: #e74c3c;">
                            R$ ${(
                                extrato.resumo.totalPerdas || 0
                            ).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>

                    <div style="background: linear-gradient(135deg, rgba(255, 69, 0, 0.1), rgba(255, 69, 0, 0.05)); 
                                padding: 16px; border-radius: 8px; border: 2px solid rgba(255, 69, 0, 0.4);">
                        <div style="font-size: 11px; color: rgba(255, 69, 0, 0.9); font-weight: 700; text-transform: uppercase; 
                             letter-spacing: 0.8px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 16px;">💵</span>
                            <span>${parseFloat(extrato.resumo.saldo) >= 0 ? "Saldo a Receber" : "Saldo a Pagar"}</span>
                        </div>
                        <div style="font-size: 20px; font-weight: 700; color: ${
                            parseFloat(extrato.resumo.saldo) >= 0
                                ? "#2ecc71"
                                : "#e74c3c"
                        };">
                            ${parseFloat(extrato.resumo.saldo) >= 0 ? "+" : ""}R$ ${Math.abs(
                                parseFloat(extrato.resumo.saldo),
                            ).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
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
                    <button onclick="window.exportarExtratoComoImagem(window.extratoAtual?.dadosExtrato, window.extratoAtual?.participante, window.extratoAtual?.rodadaAtual)" 
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
                                <th style="padding: 8px 4px; text-align: center; color: white; font-weight: 600; 
                                     font-size: 10px; text-transform: uppercase; letter-spacing: 0.2px;">
                                    TOP 10
                                    <button onclick="window.atualizarTop10('${participante.time_id || participante.id}')" 
                                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); 
                                                   color: white; padding: 1px 4px; border-radius: 3px; font-size: 9px; 
                                                   cursor: pointer; margin-left: 3px; transition: all 0.2s ease;"
                                            onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                                            onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                                        🔄
                                    </button>
                                </th>
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
                                    <td style="padding: 10px 8px;">
                                        ${this.formatarTop10Cell(r)}
                                    </td>
                                    <td style="padding: 10px 8px; text-align: center; font-weight: 700; 
                                         background: ${corFundoSaldo(r.saldo)};">
                                        ${formatarValorComCor(r.saldo)}
                                    </td>
                                </tr>
                            `;
                                })
                                .join("")}

                            <!-- LINHA DE TOTAIS -->
                            <tr style="background: linear-gradient(135deg, rgba(255, 69, 0, 0.1), rgba(255, 69, 0, 0.05)); 
                                 border-top: 2px solid var(--laranja); font-weight: 700;">
                                <td colspan="2" style="padding: 12px 8px; text-align: right; color: var(--text-primary); 
                                     text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px;">
                                    📊 TOTAIS:
                                </td>
                                <td style="padding: 12px 8px; text-align: center; font-size: 13px;">
                                    ${formatarValorComCor(extrato.resumo.bonus + extrato.resumo.onus)}
                                </td>
                                <td style="padding: 12px 8px; text-align: center; font-size: 13px;">
                                    ${formatarValorComCor(extrato.resumo.pontosCorridos)}
                                </td>
                                <td style="padding: 12px 8px; text-align: center; font-size: 13px;">
                                    ${formatarValorComCor(extrato.resumo.mataMata)}
                                </td>
                                <td style="padding: 12px 8px; text-align: center; font-size: 13px;">
                                    ${formatarValorComCor(extrato.resumo.top10 || 0)}
                                </td>
                                <td style="padding: 12px 8px; text-align: center; color: var(--text-muted); 
                                     font-style: italic; font-size: 11px;">
                                    -
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        container.innerHTML = html;

        // ✅ CORREÇÃO: Callback removido para evitar download automático
        // O callback estava causando exportação automática ao renderizar o extrato
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
                            </div>
                            <input type="number" 
                                   step="0.01"
                                   value="${campo.valorAtual}" 
                                   onchange="window.salvarCampoEditavel('${timeId}', '${campo.nomeCampo}', this.value)"
                                   style="width: 100%; padding: 8px; border: 1px solid var(--border-primary); 
                                          border-radius: 4px; font-size: 14px; font-weight: 600; 
                                          background: var(--bg-card); color: ${campo.valorAtual >= 0 ? "#2ecc71" : "#e74c3c"};">
                        </div>
                    `,
                        )
                        .join("")}
                </div>
                <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
                    <button onclick="window.calcularEExibirExtrato('${timeId}')" 
                            style="background: var(--gradient-primary); color: white; border: none; 
                                   padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; 
                                   font-size: 13px; display: flex; align-items: center; gap: 8px;
                                   box-shadow: var(--shadow-orange); transition: all 0.3s ease;"
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255, 69, 0, 0.5)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-orange)'">
                        <span style="font-size: 16px;">🔄</span>
                        <span>Recalcular</span>
                    </button>
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
                                <th style="padding: 8px 6px; text-align: center; color: white; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">TOP 10</th>
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
                                    <td style="padding: 6px 4px; text-align: center; color: var(--text-secondary);">${formatarValor(p.top10 || 0)}</td>
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

// ===== FUNÇÕES GLOBAIS PARA CAMPOS EDITÁVEIS =====

window.salvarCampoEditavel = async function (timeId, nomeCampo, valor) {
    try {
        const valorNum = parseFloat(valor) || 0;
        await FluxoFinanceiroCampos.salvarValorCampo(
            timeId,
            nomeCampo,
            valorNum,
        );
        console.log(`[UI] Campo ${nomeCampo} salvo: R$ ${valorNum}`);
    } catch (error) {
        console.error("[UI] Erro ao salvar campo:", error);
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
        console.error("[UI] Erro ao renomear campo:", error);
        alert("Erro ao renomear campo. Tente novamente.");
    }
};

// ===== FUNÇÕES DE DETALHAMENTO (POPUP) =====
window.mostrarDetalhamentoGanhos = function () {
    const extrato = window.extratoAtual;
    if (!extrato) return;

    const detalhes = calcularDetalhamentoGanhos(extrato);
    mostrarPopupDetalhamento(
        "Detalhamento: Tudo que Ganhou",
        detalhes,
        "#2ecc71",
    );
};

window.mostrarDetalhamentoPerdas = function () {
    const extrato = window.extratoAtual;
    if (!extrato) return;

    const detalhes = calcularDetalhamentoPerdas(extrato);
    mostrarPopupDetalhamento(
        "Detalhamento: Tudo que Perdeu",
        detalhes,
        "#e74c3c",
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
        },
    };

    // ✅ Validação defensiva com diagnóstico
    if (!extrato || !extrato.rodadas || !Array.isArray(extrato.rodadas)) {
        console.warn('[FLUXO-UI] Extrato inválido ou sem rodadas em calcularDetalhamentoGanhos');
        console.warn('[FLUXO-UI] DEBUG - Estrutura recebida:', {
            extratoExiste: !!extrato,
            temRodadas: extrato ? !!extrato.rodadas : false,
            tipoRodadas: extrato?.rodadas ? typeof extrato.rodadas : 'undefined',
            keysDoExtrato: extrato ? Object.keys(extrato) : []
        });
        return detalhes;
    }

    // Percorrer rodadas
    extrato.rodadas.forEach((rodada) => {
        if (rodada.bonusOnus > 0) {
            detalhes.bonusOnus += rodada.bonusOnus;
            detalhes.rodadas.bonusOnus.push({
                rodada: rodada.rodada,
                valor: rodada.bonusOnus,
            });
        }
        if (rodada.pontosCorridos > 0) {
            detalhes.pontosCorridos += rodada.pontosCorridos;
            detalhes.rodadas.pontosCorridos.push({
                rodada: rodada.rodada,
                valor: rodada.pontosCorridos,
            });
        }
        if (rodada.mataMata > 0) {
            detalhes.mataMata += rodada.mataMata;
            detalhes.rodadas.mataMata.push({
                rodada: rodada.rodada,
                valor: rodada.mataMata,
            });
        }
        if (rodada.top10 > 0) {
            detalhes.top10 += rodada.top10;
            detalhes.rodadas.top10.push({
                rodada: rodada.rodada,
                valor: rodada.top10,
                status: rodada.top10Status,
            });
        }
        if (rodada.melhorMes > 0) {
            detalhes.melhorMes += rodada.melhorMes;
            detalhes.rodadas.melhorMes.push({
                rodada: rodada.rodada,
                valor: rodada.melhorMes,
            });
        }
    });

    // Campos editáveis
    if (extrato.resumo.campo1 > 0)
        detalhes.camposEditaveis += extrato.resumo.campo1;
    if (extrato.resumo.campo2 > 0)
        detalhes.camposEditaveis += extrato.resumo.campo2;
    if (extrato.resumo.campo3 > 0)
        detalhes.camposEditaveis += extrato.resumo.campo3;
    if (extrato.resumo.campo4 > 0)
        detalhes.camposEditaveis += extrato.resumo.campo4;

    return detalhes;
}

function calcularDetalhamentoPerdas(extrato) {
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
        },
    };

    // ✅ Validação defensiva com diagnóstico
    if (!extrato || !extrato.rodadas || !Array.isArray(extrato.rodadas)) {
        console.warn('[FLUXO-UI] Extrato inválido ou sem rodadas em calcularDetalhamentoPerdas');
        console.warn('[FLUXO-UI] DEBUG - Estrutura recebida:', {
            extratoExiste: !!extrato,
            temRodadas: extrato ? !!extrato.rodadas : false,
            tipoRodadas: extrato?.rodadas ? typeof extrato.rodadas : 'undefined',
            keysDoExtrato: extrato ? Object.keys(extrato) : []
        });
        return detalhes;
    }

    // Percorrer rodadas
    extrato.rodadas.forEach((rodada) => {
        if (rodada.bonusOnus < 0) {
            detalhes.bonusOnus += rodada.bonusOnus;
            detalhes.rodadas.bonusOnus.push({
                rodada: rodada.rodada,
                valor: rodada.bonusOnus,
            });
        }
        if (rodada.pontosCorridos < 0) {
            detalhes.pontosCorridos += rodada.pontosCorridos;
            detalhes.rodadas.pontosCorridos.push({
                rodada: rodada.rodada,
                valor: rodada.pontosCorridos,
            });
        }
        if (rodada.mataMata < 0) {
            detalhes.mataMata += rodada.mataMata;
            detalhes.rodadas.mataMata.push({
                rodada: rodada.rodada,
                valor: rodada.mataMata,
            });
        }
        if (rodada.top10 < 0) {
            detalhes.top10 += rodada.top10;
            detalhes.rodadas.top10.push({
                rodada: rodada.rodada,
                valor: rodada.top10,
                status: rodada.top10Status,
            });
        }
        if (rodada.melhorMes < 0) {
            detalhes.melhorMes += rodada.melhorMes;
            detalhes.rodadas.melhorMes.push({
                rodada: rodada.rodada,
                valor: rodada.melhorMes,
            });
        }
    });

    // Campos editáveis
    if (extrato.resumo.campo1 < 0)
        detalhes.camposEditaveis += extrato.resumo.campo1;
    if (extrato.resumo.campo2 < 0)
        detalhes.camposEditaveis += extrato.resumo.campo2;
    if (extrato.resumo.campo3 < 0)
        detalhes.camposEditaveis += extrato.resumo.campo3;
    if (extrato.resumo.campo4 < 0)
        detalhes.camposEditaveis += extrato.resumo.campo4;

    return detalhes;
}

function mostrarPopupDetalhamento(titulo, detalhes, cor) {
    const formatarMoeda = (valor) => {
        return (valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatarRodadas = (rodadas) => {
        if (!rodadas || rodadas.length === 0) return "-";
        return rodadas
            .map((r) => `R${r.rodada}(${formatarMoeda(Math.abs(r.valor))})`)
            .join(", ");
    };

    const total =
        detalhes.bonusOnus +
        detalhes.pontosCorridos +
        detalhes.mataMata +
        detalhes.top10 +
        detalhes.melhorMes +
        detalhes.camposEditaveis;

    const html = `
        <div id="popupDetalhamento" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
             background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; 
             z-index: 10000; backdrop-filter: blur(4px);" onclick="this.remove()">
            <div style="background: var(--bg-card); border-radius: 12px; max-width: 600px; width: 90%; 
                 max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); 
                 border: 2px solid ${cor};" onclick="event.stopPropagation()">

                <!-- CABEÇALHO -->
                <div style="background: ${cor}; padding: 20px; border-radius: 10px 10px 0 0; 
                     display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: white; font-size: 18px; font-weight: 700;">${titulo}</h3>
                    <button onclick="document.getElementById('popupDetalhamento').remove()" 
                            style="background: rgba(255,255,255,0.2); border: none; color: white; 
                            width: 32px; height: 32px; border-radius: 50%; cursor: pointer; 
                            font-size: 20px; display: flex; align-items: center; justify-content: center;
                            transition: all 0.3s ease;"
                            onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                            onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
                </div>

                <!-- CONTEÚDO -->
                <div style="padding: 24px;">
                    <!-- Bônus/Ônus -->
                    ${
                        detalhes.bonusOnus !== 0
                            ? `
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-primary);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: 700; color: var(--text-primary); font-size: 14px;">💰 Bônus/Ônus</span>
                            <span style="font-weight: 700; font-size: 16px; color: ${cor};">
                                R$ ${formatarMoeda(detalhes.bonusOnus)}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">
                            ${detalhes.rodadas.bonusOnus.length} rodada(s): ${formatarRodadas(detalhes.rodadas.bonusOnus)}
                        </div>
                    </div>
                    `
                            : ""
                    }

                    <!-- Pontos Corridos -->
                    ${
                        detalhes.pontosCorridos !== 0
                            ? `
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-primary);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: 700; color: var(--text-primary); font-size: 14px;">⚽ Pontos Corridos</span>
                            <span style="font-weight: 700; font-size: 16px; color: ${cor};">
                                R$ ${formatarMoeda(detalhes.pontosCorridos)}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">
                            ${detalhes.rodadas.pontosCorridos.length} rodada(s): ${formatarRodadas(detalhes.rodadas.pontosCorridos)}
                        </div>
                    </div>
                    `
                            : ""
                    }

                    <!-- Mata-Mata -->
                    ${
                        detalhes.mataMata !== 0
                            ? `
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-primary);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: 700; color: var(--text-primary); font-size: 14px;">🏆 Mata-Mata</span>
                            <span style="font-weight: 700; font-size: 16px; color: ${cor};">
                                R$ ${formatarMoeda(detalhes.mataMata)}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">
                            ${detalhes.rodadas.mataMata.length} rodada(s): ${formatarRodadas(detalhes.rodadas.mataMata)}
                        </div>
                    </div>
                    `
                            : ""
                    }

                    <!-- TOP 10 -->
                    ${
                        detalhes.top10 !== 0
                            ? `
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-primary);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: 700; color: var(--text-primary); font-size: 14px;">🔝 TOP 10</span>
                            <span style="font-weight: 700; font-size: 16px; color: ${cor};">
                                R$ ${formatarMoeda(detalhes.top10)}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">
                            ${detalhes.rodadas.top10.length} rodada(s): ${formatarRodadas(detalhes.rodadas.top10)}
                        </div>
                    </div>
                    `
                            : ""
                    }

                    <!-- Melhor Mês -->
                    ${
                        detalhes.melhorMes !== 0
                            ? `
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-primary);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: 700; color: var(--text-primary); font-size: 14px;">📅 Melhor Mês</span>
                            <span style="font-weight: 700; font-size: 16px; color: ${cor};">
                                R$ ${formatarMoeda(detalhes.melhorMes)}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">
                            ${detalhes.rodadas.melhorMes.length} rodada(s): ${formatarRodadas(detalhes.rodadas.melhorMes)}
                        </div>
                    </div>
                    `
                            : ""
                    }

                    <!-- Campos Editáveis -->
                    ${
                        detalhes.camposEditaveis !== 0
                            ? `
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-primary);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: 700; color: var(--text-primary); font-size: 14px;">⚙️ Campos Personalizados</span>
                            <span style="font-weight: 700; font-size: 16px; color: ${cor};">
                                R$ ${formatarMoeda(detalhes.camposEditaveis)}
                            </span>
                        </div>
                    </div>
                    `
                            : ""
                    }

                    <!-- TOTAL -->
                    <div style="background: linear-gradient(135deg, ${cor}15, ${cor}05); 
                         padding: 16px; border-radius: 8px; border: 2px solid ${cor};">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; color: var(--text-primary); font-size: 16px;">
                                💵 TOTAL
                            </span>
                            <span style="font-weight: 700; font-size: 20px; color: ${cor};">
                                R$ ${formatarMoeda(total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
}

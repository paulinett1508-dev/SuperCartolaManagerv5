/**
 * FLUXO-FINANCEIRO-AUDITORIA.JS v2.0 (SaaS - Config Dinamica)
 * ✅ v2.0: Refatorado para SaaS - remove liga ID hardcoded
 * Sistema de Auditoria Financeira para validar cálculos
 * ✅ Resumo Executivo
 * ✅ Detalhamento por Categoria
 * ✅ Auditoria Linha a Linha
 * ✅ Export PDF/Excel
 */

import { obterLigaId } from "../pontos-corridos-utils.js";
import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
import {
    RODADA_INICIAL_PONTOS_CORRIDOS,
    normalizarTimeId,
} from "./fluxo-financeiro-utils.js";
import {
    getBancoPorRodadaAsync,
    fetchLigaConfig,
} from "../rodadas/rodadas-config.js";

export class FluxoFinanceiroAuditoria {
    constructor(cache, core) {
        this.cache = cache;
        this.core = core;
        this.ligaId = obterLigaId();
        this.ligaConfig = null; // v2.0: Cache de config dinamica
    }

    // v2.0: Carrega config da liga sob demanda
    async _carregarConfig() {
        if (!this.ligaConfig && this.ligaId) {
            this.ligaConfig = await fetchLigaConfig(this.ligaId);
        }
        return this.ligaConfig;
    }

    // =========================================================================
    // NÍVEL 1: RESUMO EXECUTIVO
    // =========================================================================
    async gerarResumoExecutivo(timeId, extrato) {
        // ✅ v6.10 FIX: Passar temporada correta para buscar campos da temporada selecionada
        const temporadaSelecionada = window.temporadaAtual || 2026;
        const camposEditaveis =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId, temporadaSelecionada);

        // Totais automáticos das rodadas
        let totaisAutomaticos = {
            bonusOnus: { positivo: 0, negativo: 0, total: 0 },
            pontosCorridos: { vitorias: 0, empates: 0, derrotas: 0, total: 0 },
            mataMata: { vitorias: 0, derrotas: 0, total: 0 },
            top10: { mitos: 0, micos: 0, total: 0 },
            subtotal: 0,
        };

        // Processar cada rodada
        (extrato.rodadas || []).forEach((r) => {
            // Banco de Rodada
            if (r.bonusOnus > 0)
                totaisAutomaticos.bonusOnus.positivo += r.bonusOnus;
            if (r.bonusOnus < 0)
                totaisAutomaticos.bonusOnus.negativo += r.bonusOnus;
            totaisAutomaticos.bonusOnus.total += r.bonusOnus || 0;

            // Pontos Corridos
            if (r.pontosCorridos > 0)
                totaisAutomaticos.pontosCorridos.vitorias++;
            else if (r.pontosCorridos < 0)
                totaisAutomaticos.pontosCorridos.derrotas++;
            else if (
                r.pontosCorridos === 0 &&
                r.rodada >= RODADA_INICIAL_PONTOS_CORRIDOS
            ) {
                totaisAutomaticos.pontosCorridos.empates++;
            }
            totaisAutomaticos.pontosCorridos.total += r.pontosCorridos || 0;

            // Mata-Mata
            if (r.mataMata > 0) totaisAutomaticos.mataMata.vitorias++;
            if (r.mataMata < 0) totaisAutomaticos.mataMata.derrotas++;
            totaisAutomaticos.mataMata.total += r.mataMata || 0;

            // TOP 10
            if (r.top10 > 0) totaisAutomaticos.top10.mitos++;
            if (r.top10 < 0) totaisAutomaticos.top10.micos++;
            totaisAutomaticos.top10.total += r.top10 || 0;
        });

        totaisAutomaticos.subtotal =
            totaisAutomaticos.bonusOnus.total +
            totaisAutomaticos.pontosCorridos.total +
            totaisAutomaticos.mataMata.total +
            totaisAutomaticos.top10.total;

        // Totais manuais (campos editáveis)
        const totaisManuais = {
            campo1: {
                nome: camposEditaveis.campo1?.nome || "Campo 1",
                valor: parseFloat(camposEditaveis.campo1?.valor) || 0,
            },
            campo2: {
                nome: camposEditaveis.campo2?.nome || "Campo 2",
                valor: parseFloat(camposEditaveis.campo2?.valor) || 0,
            },
            campo3: {
                nome: camposEditaveis.campo3?.nome || "Campo 3",
                valor: parseFloat(camposEditaveis.campo3?.valor) || 0,
            },
            campo4: {
                nome: camposEditaveis.campo4?.nome || "Campo 4",
                valor: parseFloat(camposEditaveis.campo4?.valor) || 0,
            },
            subtotal: 0,
        };
        totaisManuais.subtotal =
            totaisManuais.campo1.valor +
            totaisManuais.campo2.valor +
            totaisManuais.campo3.valor +
            totaisManuais.campo4.valor;

        // Saldo final
        const saldoFinal = totaisAutomaticos.subtotal + totaisManuais.subtotal;
        const saldoRegistrado = extrato.resumo?.saldo || 0;
        const divergencia = Math.abs(saldoFinal - saldoRegistrado) > 0.01;

        return {
            timeId,
            periodo: {
                inicio: extrato.rodadas?.[0]?.rodada || 1,
                fim: extrato.rodadas?.[extrato.rodadas.length - 1]?.rodada || 0,
                totalRodadas: extrato.rodadas?.length || 0,
            },
            automatico: totaisAutomaticos,
            manual: totaisManuais,
            saldoCalculado: saldoFinal,
            saldoRegistrado: saldoRegistrado,
            divergencia: divergencia,
            status: divergencia
                ? '<span class="material-icons" style="font-size: 12px;">warning</span> DIVERGÊNCIA'
                : '<span class="material-icons" style="font-size: 12px;">check_circle</span> OK',
        };
    }

    // =========================================================================
    // NÍVEL 2: DETALHAMENTO POR CATEGORIA
    // =========================================================================
    async gerarDetalhamentoCategoria(timeId, extrato, categoria) {
        const rodadas = extrato.rodadas || [];
        const detalhes = [];

        switch (categoria) {
            case "bonusOnus":
                rodadas.forEach((r) => {
                    if (r.bonusOnus !== 0) {
                        detalhes.push({
                            rodada: r.rodada,
                            posicao: r.posicao,
                            totalTimes: r.totalTimes || 32,
                            valor: r.bonusOnus,
                            tipo: r.bonusOnus > 0 ? "BÔNUS" : "ÔNUS",
                        });
                    }
                });
                break;

            case "pontosCorridos":
                rodadas
                    .filter((r) => r.rodada >= RODADA_INICIAL_PONTOS_CORRIDOS)
                    .forEach((r) => {
                        const confronto = this.cache?.getConfrontoRodada?.(
                            r.rodada,
                            timeId,
                        );
                        detalhes.push({
                            rodada: r.rodada,
                            oponente: confronto?.oponente || "N/D",
                            pontosTime: confronto?.pontosTime || 0,
                            pontosOponente: confronto?.pontosOponente || 0,
                            resultado:
                                r.pontosCorridos > 0
                                    ? "VITÓRIA"
                                    : r.pontosCorridos < 0
                                      ? "DERROTA"
                                      : "EMPATE",
                            valor: r.pontosCorridos || 0,
                        });
                    });
                break;

            case "mataMata":
                rodadas.forEach((r) => {
                    if (r.mataMata && r.mataMata !== 0) {
                        detalhes.push({
                            rodada: r.rodada,
                            edicao: r.mataMataEdicao || "N/D",
                            fase: r.mataMataFase || "N/D",
                            resultado: r.mataMata > 0 ? "VITÓRIA" : "DERROTA",
                            valor: r.mataMata,
                        });
                    }
                });
                break;

            case "top10":
                rodadas.forEach((r) => {
                    if (r.top10 && r.top10 !== 0) {
                        detalhes.push({
                            rodada: r.rodada,
                            posicao: r.top10Posicao || "N/D",
                            tipo: r.top10 > 0 ? "MITO" : "MICO",
                            valor: r.top10,
                        });
                    }
                });
                break;
        }

        return {
            categoria,
            totalRegistros: detalhes.length,
            totalValor: detalhes.reduce((s, d) => s + (d.valor || 0), 0),
            detalhes,
        };
    }

    // =========================================================================
    // NÍVEL 3: AUDITORIA LINHA A LINHA
    // =========================================================================
    async gerarAuditoriaLinhaALinha(timeId, extrato) {
        const rodadas = extrato.rodadas || [];
        const auditoria = [];
        let saldoAcumuladoCalculado = 0;

        // v2.0: Pre-carregar config para otimizar
        await this._carregarConfig();

        for (const r of rodadas) {
            // v2.0: Calcular valor esperado do Banco de Rodada via config dinamica
            const bancosConfig = await getBancoPorRodadaAsync(this.ligaId, r.rodada);
            const bonusOnusEsperado = bancosConfig[r.posicao] || bancosConfig[String(r.posicao)] || 0;

            // Calcular valor esperado do Mata-Mata
            let mataMataEsperado = 0;
            if (this.core?.mataMataMap) {
                const key = `${normalizarTimeId(timeId)}_${r.rodada}`;
                mataMataEsperado = this.core.mataMataMap.get(key) || 0;
            }

            // Calcular saldo da rodada
            const saldoRodadaCalculado =
                (r.bonusOnus || 0) +
                (r.pontosCorridos || 0) +
                (r.mataMata || 0) +
                (r.top10 || 0);

            saldoAcumuladoCalculado += saldoRodadaCalculado;

            // Verificar divergências
            const divergencias = [];

            if (Math.abs((r.bonusOnus || 0) - bonusOnusEsperado) > 0.01) {
                divergencias.push({
                    campo: "bonusOnus",
                    esperado: bonusOnusEsperado,
                    registrado: r.bonusOnus || 0,
                    diferenca: (r.bonusOnus || 0) - bonusOnusEsperado,
                });
            }

            if (
                mataMataEsperado !== 0 &&
                Math.abs((r.mataMata || 0) - mataMataEsperado) > 0.01
            ) {
                divergencias.push({
                    campo: "mataMata",
                    esperado: mataMataEsperado,
                    registrado: r.mataMata || 0,
                    diferenca: (r.mataMata || 0) - mataMataEsperado,
                });
            }

            if (Math.abs((r.saldo || 0) - saldoAcumuladoCalculado) > 0.01) {
                divergencias.push({
                    campo: "saldoAcumulado",
                    esperado: saldoAcumuladoCalculado,
                    registrado: r.saldo || 0,
                    diferenca: (r.saldo || 0) - saldoAcumuladoCalculado,
                });
            }

            auditoria.push({
                rodada: r.rodada,
                posicao: r.posicao,
                totalTimes: r.totalTimes || 32,
                valores: {
                    bonusOnus: {
                        registrado: r.bonusOnus || 0,
                        esperado: bonusOnusEsperado,
                    },
                    pontosCorridos: { registrado: r.pontosCorridos || 0 },
                    mataMata: {
                        registrado: r.mataMata || 0,
                        esperado: mataMataEsperado,
                    },
                    top10: { registrado: r.top10 || 0 },
                },
                saldoRodada: saldoRodadaCalculado,
                saldoAcumulado: {
                    calculado: saldoAcumuladoCalculado,
                    registrado: r.saldo || 0,
                },
                divergencias,
                status:
                    divergencias.length === 0
                        ? '<span class="material-icons" style="font-size: 12px;">check_circle</span>'
                        : '<span class="material-icons" style="font-size: 12px;">warning</span>',
            });
        }

        return {
            timeId,
            totalRodadas: auditoria.length,
            rodadasComDivergencia: auditoria.filter(
                (a) => a.divergencias.length > 0,
            ).length,
            auditoria,
        };
    }

    // =========================================================================
    // GERAR RELATÓRIO COMPLETO
    // =========================================================================
    async gerarRelatorioCompleto(timeId, extrato, nivel = 1) {
        const resumo = await this.gerarResumoExecutivo(timeId, extrato);

        const resultado = {
            nivel,
            geradoEm: new Date().toISOString(),
            resumo,
        };

        if (nivel >= 2) {
            resultado.detalhamento = {
                bonusOnus: await this.gerarDetalhamentoCategoria(
                    timeId,
                    extrato,
                    "bonusOnus",
                ),
                pontosCorridos: await this.gerarDetalhamentoCategoria(
                    timeId,
                    extrato,
                    "pontosCorridos",
                ),
                mataMata: await this.gerarDetalhamentoCategoria(
                    timeId,
                    extrato,
                    "mataMata",
                ),
                top10: await this.gerarDetalhamentoCategoria(
                    timeId,
                    extrato,
                    "top10",
                ),
            };
        }

        if (nivel >= 3) {
            resultado.linhaALinha = await this.gerarAuditoriaLinhaALinha(
                timeId,
                extrato,
            );
        }

        return resultado;
    }

    // =========================================================================
    // RENDERIZAR MODAL DE AUDITORIA
    // =========================================================================
    renderizarModal(participante, relatorio) {
        const resumo = relatorio.resumo;
        const modal = document.createElement("div");
        modal.id = "modalAuditoria";
        modal.className = "modal-auditoria-overlay";

        modal.innerHTML = `
            <div class="modal-auditoria-content">
                <div class="modal-auditoria-header">
                    <h2><span class="material-icons" style="font-size: 20px;">search</span> Auditoria Financeira</h2>
                    <button class="modal-close-btn" onclick="window.fecharModalAuditoria()">✕</button>
                </div>

                <div class="modal-auditoria-participante">
                    <div class="participante-info-audit">
                        ${
                            participante.url_escudo_png
                                ? `<img src="${participante.url_escudo_png}" alt="" class="audit-escudo">`
                                : '<div class="audit-escudo-placeholder"><span class="material-icons" style="font-size: 24px;">sports_soccer</span></div>'
                        }
                        <div>
                            <div class="audit-nome">${participante.nome_cartola}</div>
                            <div class="audit-time">${participante.nome_time}</div>
                        </div>
                    </div>
                    <div class="audit-periodo">
                        Rodadas ${resumo.periodo.inicio} - ${resumo.periodo.fim} 
                        <span class="audit-badge ${resumo.divergencia ? "badge-warning" : "badge-success"}">
                            ${resumo.status}
                        </span>
                    </div>
                </div>

                <div class="modal-auditoria-tabs">
                    <button class="audit-tab active" data-tab="resumo"><span class="material-icons" style="font-size: 14px;">assessment</span> Resumo</button>
                    <button class="audit-tab" data-tab="detalhado"><span class="material-icons" style="font-size: 14px;">list_alt</span> Detalhado</button>
                    <button class="audit-tab" data-tab="linhaAlinha">🔎 Linha a Linha</button>
                </div>

                <div class="modal-auditoria-body">
                    <!-- TAB RESUMO -->
                    <div class="audit-tab-content active" id="tab-resumo">
                        ${this._renderizarResumo(resumo)}
                    </div>

                    <!-- TAB DETALHADO -->
                    <div class="audit-tab-content" id="tab-detalhado">
                        ${relatorio.detalhamento ? this._renderizarDetalhamento(relatorio.detalhamento) : "<p>Carregando...</p>"}
                    </div>

                    <!-- TAB LINHA A LINHA -->
                    <div class="audit-tab-content" id="tab-linhaAlinha">
                        ${relatorio.linhaALinha ? this._renderizarLinhaALinha(relatorio.linhaALinha) : "<p>Carregando...</p>"}
                    </div>
                </div>

                <div class="modal-auditoria-footer">
                    <button onclick="window.exportarAuditoriaPDF('${participante.time_id}')" class="btn-modern btn-danger-gradient">
                        📄 Exportar PDF
                    </button>
                    <button onclick="window.exportarAuditoriaExcel('${participante.time_id}')" class="btn-modern btn-success-gradient">
                        <span class="material-icons" style="font-size: 14px;">file_download</span> Exportar Excel
                    </button>
                    <button onclick="window.fecharModalAuditoria()" class="btn-modern btn-secondary">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this._configurarTabs();
    }

    _renderizarResumo(resumo) {
        return `
            <div class="audit-section">
                <h3><span class="material-icons" style="font-size: 16px;">calculate</span> Valores Automáticos</h3>
                <table class="audit-table">
                    <thead>
                        <tr>
                            <th>Categoria</th>
                            <th class="text-center">Detalhes</th>
                            <th class="text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>🏦 Banco de Rodada</td>
                            <td class="text-center">
                                <span class="text-success">+R$ ${resumo.automatico.bonusOnus.positivo.toFixed(2)}</span> / 
                                <span class="text-danger">R$ ${resumo.automatico.bonusOnus.negativo.toFixed(2)}</span>
                            </td>
                            <td class="text-right ${resumo.automatico.bonusOnus.total >= 0 ? "text-success" : "text-danger"}">
                                R$ ${resumo.automatico.bonusOnus.total.toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td>⚔️ Pontos Corridos</td>
                            <td class="text-center">
                                ${resumo.automatico.pontosCorridos.vitorias}V / 
                                ${resumo.automatico.pontosCorridos.empates}E / 
                                ${resumo.automatico.pontosCorridos.derrotas}D
                            </td>
                            <td class="text-right ${resumo.automatico.pontosCorridos.total >= 0 ? "text-success" : "text-danger"}">
                                R$ ${resumo.automatico.pontosCorridos.total.toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td>🥊 Mata-Mata</td>
                            <td class="text-center">
                                ${resumo.automatico.mataMata.vitorias}V / ${resumo.automatico.mataMata.derrotas}D
                            </td>
                            <td class="text-right ${resumo.automatico.mataMata.total >= 0 ? "text-success" : "text-danger"}">
                                R$ ${resumo.automatico.mataMata.total.toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td><span class="material-icons" style="font-size: 14px;">emoji_events</span> TOP 10</td>
                            <td class="text-center">
                                ${resumo.automatico.top10.mitos} Mitos / ${resumo.automatico.top10.micos} Micos
                            </td>
                            <td class="text-right ${resumo.automatico.top10.total >= 0 ? "text-success" : "text-danger"}">
                                R$ ${resumo.automatico.top10.total.toFixed(2)}
                            </td>
                        </tr>
                        <tr class="row-subtotal">
                            <td colspan="2"><strong>Subtotal Automático</strong></td>
                            <td class="text-right ${resumo.automatico.subtotal >= 0 ? "text-success" : "text-danger"}">
                                <strong>R$ ${resumo.automatico.subtotal.toFixed(2)}</strong>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="audit-section">
                <h3><span class="material-icons" style="font-size: 16px;">edit</span> Ajustes Manuais</h3>
                <table class="audit-table">
                    <tbody>
                        ${["campo1", "campo2", "campo3", "campo4"]
                            .map(
                                (campo) => `
                            <tr ${resumo.manual[campo].valor === 0 ? 'class="text-muted"' : ""}>
                                <td>${resumo.manual[campo].nome}</td>
                                <td class="text-right ${resumo.manual[campo].valor >= 0 ? "text-success" : "text-danger"}">
                                    ${resumo.manual[campo].valor !== 0 ? `R$ ${resumo.manual[campo].valor.toFixed(2)}` : "-"}
                                </td>
                            </tr>
                        `,
                            )
                            .join("")}
                        <tr class="row-subtotal">
                            <td><strong>Subtotal Manual</strong></td>
                            <td class="text-right ${resumo.manual.subtotal >= 0 ? "text-success" : "text-danger"}">
                                <strong>R$ ${resumo.manual.subtotal.toFixed(2)}</strong>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="audit-section audit-totais">
                <div class="audit-total-row">
                    <span>Saldo Calculado:</span>
                    <span class="${resumo.saldoCalculado >= 0 ? "text-success" : "text-danger"}">
                        R$ ${resumo.saldoCalculado.toFixed(2)}
                    </span>
                </div>
                <div class="audit-total-row">
                    <span>Saldo Registrado:</span>
                    <span class="${resumo.saldoRegistrado >= 0 ? "text-success" : "text-danger"}">
                        R$ ${resumo.saldoRegistrado.toFixed(2)}
                    </span>
                </div>
                ${
                    resumo.divergencia
                        ? `
                    <div class="audit-divergencia">
                        <span class="material-icons" style="font-size: 14px; color: #f59e0b;">warning</span> Diferença: R$ ${Math.abs(resumo.saldoCalculado - resumo.saldoRegistrado).toFixed(2)}
                    </div>
                `
                        : `
                    <div class="audit-ok">
                        <span class="material-icons" style="font-size: 14px; color: #22c55e;">check_circle</span> Valores conferem!
                    </div>
                `
                }
            </div>
        `;
    }

    _renderizarDetalhamento(detalhamento) {
        const categorias = [
            {
                key: "bonusOnus",
                nome: "🏦 Banco de Rodada",
                cols: ["Rodada", "Posição", "Tipo", "Valor"],
            },
            {
                key: "pontosCorridos",
                nome: "⚔️ Pontos Corridos",
                cols: ["Rodada", "Oponente", "Resultado", "Valor"],
            },
            {
                key: "mataMata",
                nome: "🥊 Mata-Mata",
                cols: ["Rodada", "Edição", "Fase", "Resultado", "Valor"],
            },
            {
                key: "top10",
                nome: '<span class="material-icons" style="font-size: 14px;">emoji_events</span> TOP 10',
                cols: ["Rodada", "Posição", "Tipo", "Valor"],
            },
        ];

        return categorias
            .map((cat) => {
                const dados = detalhamento[cat.key];
                if (!dados || dados.detalhes.length === 0) return "";

                return `
                <div class="audit-section">
                    <h3>${cat.nome} <span class="badge-count">${dados.totalRegistros} registros</span></h3>
                    <div class="audit-table-scroll">
                        <table class="audit-table compact">
                            <thead>
                                <tr>${cat.cols.map((c) => `<th>${c}</th>`).join("")}</tr>
                            </thead>
                            <tbody>
                                ${this._renderizarLinhasDetalhamento(cat.key, dados.detalhes)}
                            </tbody>
                            <tfoot>
                                <tr class="row-total">
                                    <td colspan="${cat.cols.length - 1}"><strong>Total</strong></td>
                                    <td class="text-right ${dados.totalValor >= 0 ? "text-success" : "text-danger"}">
                                        <strong>R$ ${dados.totalValor.toFixed(2)}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    _renderizarLinhasDetalhamento(categoria, detalhes) {
        return detalhes
            .map((d) => {
                switch (categoria) {
                    case "bonusOnus":
                        return `<tr>
                        <td>R${d.rodada}</td>
                        <td>${d.posicao}º/${d.totalTimes}</td>
                        <td><span class="badge-${d.tipo === "BÔNUS" ? "success" : "danger"}">${d.tipo}</span></td>
                        <td class="text-right ${d.valor >= 0 ? "text-success" : "text-danger"}">R$ ${d.valor.toFixed(2)}</td>
                    </tr>`;
                    case "pontosCorridos":
                        return `<tr>
                        <td>R${d.rodada}</td>
                        <td>${d.oponente}</td>
                        <td><span class="badge-${d.resultado === "VITÓRIA" ? "success" : d.resultado === "DERROTA" ? "danger" : "neutral"}">${d.resultado}</span></td>
                        <td class="text-right ${d.valor >= 0 ? "text-success" : "text-danger"}">R$ ${d.valor.toFixed(2)}</td>
                    </tr>`;
                    case "mataMata":
                        return `<tr>
                        <td>R${d.rodada}</td>
                        <td>${d.edicao}</td>
                        <td>${d.fase}</td>
                        <td><span class="badge-${d.resultado === "VITÓRIA" ? "success" : "danger"}">${d.resultado}</span></td>
                        <td class="text-right ${d.valor >= 0 ? "text-success" : "text-danger"}">R$ ${d.valor.toFixed(2)}</td>
                    </tr>`;
                    case "top10":
                        return `<tr>
                        <td>R${d.rodada}</td>
                        <td>${d.posicao}º</td>
                        <td><span class="badge-${d.tipo === "MITO" ? "success" : "danger"}">${d.tipo}</span></td>
                        <td class="text-right ${d.valor >= 0 ? "text-success" : "text-danger"}">R$ ${d.valor.toFixed(2)}</td>
                    </tr>`;
                    default:
                        return "";
                }
            })
            .join("");
    }

    _renderizarLinhaALinha(linhaALinha) {
        if (!linhaALinha || !linhaALinha.auditoria) return "<p>Sem dados</p>";

        return `
            <div class="audit-section">
                <div class="audit-summary-bar">
                    <span><span class="material-icons" style="font-size: 14px;">assessment</span> ${linhaALinha.totalRodadas} rodadas auditadas</span>
                    ${
                        linhaALinha.rodadasComDivergencia > 0
                            ? `<span class="badge-warning"><span class="material-icons" style="font-size: 12px;">warning</span> ${linhaALinha.rodadasComDivergencia} com divergência</span>`
                            : '<span class="badge-success"><span class="material-icons" style="font-size: 12px;">check_circle</span> Sem divergências</span>'
                    }
                </div>
                <div class="audit-table-scroll" style="max-height: 400px;">
                    <table class="audit-table compact">
                        <thead>
                            <tr>
                                <th>Rod</th>
                                <th>Pos</th>
                                <th>Banco</th>
                                <th>P.C.</th>
                                <th>M-M</th>
                                <th>TOP10</th>
                                <th>Saldo Rod</th>
                                <th>Acumulado</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhaALinha.auditoria
                                .map(
                                    (r) => `
                                <tr class="${r.divergencias.length > 0 ? "row-divergencia" : ""}">
                                    <td class="text-center">${r.rodada}</td>
                                    <td class="text-center">${r.posicao}º</td>
                                    <td class="text-right ${r.valores.bonusOnus.registrado >= 0 ? "text-success" : "text-danger"}">
                                        ${r.valores.bonusOnus.registrado.toFixed(2)}
                                    </td>
                                    <td class="text-right ${(r.valores.pontosCorridos.registrado || 0) >= 0 ? "text-success" : "text-danger"}">
                                        ${(r.valores.pontosCorridos.registrado || 0).toFixed(2)}
                                    </td>
                                    <td class="text-right ${(r.valores.mataMata.registrado || 0) >= 0 ? "text-success" : "text-danger"}">
                                        ${(r.valores.mataMata.registrado || 0).toFixed(2)}
                                    </td>
                                    <td class="text-right ${(r.valores.top10.registrado || 0) >= 0 ? "text-success" : "text-danger"}">
                                        ${(r.valores.top10.registrado || 0).toFixed(2)}
                                    </td>
                                    <td class="text-right font-semibold ${r.saldoRodada >= 0 ? "text-success" : "text-danger"}">
                                        ${r.saldoRodada.toFixed(2)}
                                    </td>
                                    <td class="text-right font-bold ${r.saldoAcumulado.calculado >= 0 ? "text-success" : "text-danger"}">
                                        ${r.saldoAcumulado.calculado.toFixed(2)}
                                    </td>
                                    <td class="text-center">${r.status}</td>
                                </tr>
                                ${
                                    r.divergencias.length > 0
                                        ? `
                                    <tr class="row-divergencia-detail">
                                        <td colspan="9">
                                            ${r.divergencias
                                                .map(
                                                    (d) => `
                                                <span class="divergencia-item">
                                                    <span class="material-icons" style="font-size: 12px;">warning</span> ${d.campo}: esperado ${d.esperado.toFixed(2)}, 
                                                    registrado ${d.registrado.toFixed(2)} 
                                                    (dif: ${d.diferenca.toFixed(2)})
                                                </span>
                                            `,
                                                )
                                                .join(" | ")}
                                        </td>
                                    </tr>
                                `
                                        : ""
                                }
                            `,
                                )
                                .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _configurarTabs() {
        const tabs = document.querySelectorAll(".audit-tab");
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");

                document
                    .querySelectorAll(".audit-tab-content")
                    .forEach((c) => c.classList.remove("active"));
                document
                    .getElementById(`tab-${tab.dataset.tab}`)
                    .classList.add("active");
            });
        });
    }
}

// =========================================================================
// ESTILOS CSS DO MODAL
// =========================================================================
export function injetarEstilosAuditoria() {
    if (document.getElementById("auditoria-styles")) return;

    const style = document.createElement("style");
    style.id = "auditoria-styles";
    style.textContent = `
        .modal-auditoria-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }

        .modal-auditoria-content {
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            border-radius: 16px;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-auditoria-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.2);
        }

        .modal-auditoria-header h2 {
            margin: 0;
            color: #fff;
            font-size: 1.3rem;
        }

        .modal-close-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #fff;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            transition: all 0.2s;
        }

        .modal-close-btn:hover {
            background: rgba(239, 68, 68, 0.8);
        }

        .modal-auditoria-participante {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            background: rgba(0, 0, 0, 0.15);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .participante-info-audit {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .audit-escudo, .audit-escudo-placeholder {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: contain;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .audit-nome {
            font-weight: 600;
            color: #fff;
            font-size: 1.1rem;
        }

        .audit-time {
            color: #94a3b8;
            font-size: 0.85rem;
        }

        .audit-periodo {
            color: #94a3b8;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .audit-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .badge-success { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .badge-warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .badge-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .badge-neutral { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
        .badge-count { 
            background: rgba(59, 130, 246, 0.2); 
            color: #3b82f6; 
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.75rem;
            margin-left: 8px;
        }

        .modal-auditoria-tabs {
            display: flex;
            gap: 4px;
            padding: 12px 24px;
            background: rgba(0, 0, 0, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .audit-tab {
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
            font-size: 0.9rem;
        }

        .audit-tab:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
        }

        .audit-tab.active {
            background: linear-gradient(135deg, #ff5c00, #ff8c00);
            color: #fff;
            font-weight: 600;
        }

        .modal-auditoria-body {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        }

        .audit-tab-content {
            display: none;
        }

        .audit-tab-content.active {
            display: block;
        }

        .audit-section {
            margin-bottom: 24px;
        }

        .audit-section h3 {
            color: #fff;
            font-size: 1rem;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
        }

        .audit-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
        }

        .audit-table th {
            background: rgba(0, 0, 0, 0.3);
            color: #94a3b8;
            padding: 10px 12px;
            text-align: left;
            font-weight: 500;
            text-transform: uppercase;
            font-size: 0.7rem;
            letter-spacing: 0.5px;
        }

        .audit-table td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: #e2e8f0;
        }

        .audit-table.compact th,
        .audit-table.compact td {
            padding: 8px 10px;
            font-size: 0.8rem;
        }

        .audit-table-scroll {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .row-subtotal {
            background: rgba(59, 130, 246, 0.1);
        }

        .row-total {
            background: rgba(255, 92, 0, 0.15);
        }

        .row-divergencia {
            background: rgba(245, 158, 11, 0.1);
        }

        .row-divergencia-detail {
            background: rgba(245, 158, 11, 0.05);
        }

        .row-divergencia-detail td {
            font-size: 0.75rem;
            color: #f59e0b;
            padding: 6px 12px;
        }

        .divergencia-item {
            display: inline-block;
            margin-right: 12px;
        }

        .audit-totais {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            padding: 20px;
        }

        .audit-total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 1rem;
            color: #e2e8f0;
        }

        .audit-total-row span:last-child {
            font-weight: 700;
            font-size: 1.1rem;
        }

        .audit-divergencia {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
            margin-top: 12px;
        }

        .audit-ok {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
            margin-top: 12px;
        }

        .audit-summary-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            margin-bottom: 16px;
            color: #e2e8f0;
        }

        .modal-auditoria-footer {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            padding: 16px 24px;
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .text-success { color: #22c55e !important; }
        .text-danger { color: #ef4444 !important; }
        .text-muted { color: #64748b !important; }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .font-semibold { font-weight: 600 !important; }
        .font-bold { font-weight: 700 !important; }

        /* Botão de auditoria na lista - Paleta Cartola (Laranja/Verde) */
        .btn-auditar {
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            color: #fff;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.75rem;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }

        .btn-auditar:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        @media (max-width: 768px) {
            .modal-auditoria-content {
                max-height: 100vh;
                border-radius: 0;
            }

            .modal-auditoria-participante {
                flex-direction: column;
                gap: 12px;
                text-align: center;
            }

            .modal-auditoria-tabs {
                overflow-x: auto;
            }

            .modal-auditoria-footer {
                flex-wrap: wrap;
            }

            .modal-auditoria-footer button {
                flex: 1;
                min-width: 120px;
            }
        }
    `;
    document.head.appendChild(style);
}

// =========================================================================
// FUNÇÕES GLOBAIS
// =========================================================================
window.fecharModalAuditoria = function () {
    const modal = document.getElementById("modalAuditoria");
    if (modal) modal.remove();
};

window.exportarAuditoriaPDF = async function (timeId) {
    alert("Exportação PDF em desenvolvimento. TimeId: " + timeId);
    // TODO: Implementar com jsPDF ou similar
};

window.exportarAuditoriaExcel = async function (timeId) {
    alert("Exportação Excel em desenvolvimento. TimeId: " + timeId);
    // TODO: Implementar com SheetJS ou similar
};

console.log("[FLUXO-AUDITORIA] ✅ Módulo v2.0 SaaS carregado - config dinamica");

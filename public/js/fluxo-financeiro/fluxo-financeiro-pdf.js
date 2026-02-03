/**
 * FLUXO-FINANCEIRO-PDF.JS - v1.0
 *
 * Modulo extraido de fluxo-financeiro-ui.js para reduzir o tamanho do arquivo principal.
 * Contem funcoes de exportacao PDF e modal de Auditoria Financeira.
 *
 * HISTORICO:
 * v1.0 (2026-01-22): Extraido de fluxo-financeiro-ui.js (~500 linhas)
 *    - exportarExtratoPDF (window.exportarExtratoPDF)
 *    - Modal Auditoria Financeira (window.abrirAuditoriaFinanceira)
 *    - Funcoes auxiliares de PDF
 *
 * ROLLBACK: git checkout HEAD~1 -- public/js/fluxo-financeiro/fluxo-financeiro-ui.js
 */

import { injetarEstilosModalAuditoriaFinanceira } from "./fluxo-financeiro-styles.js";

// =============================================================================
// VARIAVEIS DE ESTADO
// =============================================================================
let auditoriaAtual = null;

// =============================================================================
// MODAL DE AUDITORIA FINANCEIRA
// =============================================================================

/**
 * Injeta modal de auditoria no DOM (apenas uma vez)
 */
function injetarModalAuditoria() {
    if (document.getElementById('modal-auditoria-financeira')) return;

    const modalHtml = `
        <div class="modal-auditoria-overlay" id="modal-auditoria-financeira">
            <div class="modal-auditoria-container">
                <div class="modal-auditoria-header">
                    <div class="header-info">
                        <span class="material-icons header-icon">fact_check</span>
                        <div>
                            <h3 id="auditoria-titulo">Auditoria Financeira</h3>
                            <span id="auditoria-subtitulo" class="header-sub">Carregando...</span>
                        </div>
                    </div>
                    <button class="modal-auditoria-close" onclick="window.fecharModalAuditoria()">
                        <span class="material-icons">close</span>
                    </button>
                </div>

                <div class="modal-auditoria-body" id="auditoria-body">
                    <div class="auditoria-loading">
                        <div class="loading-spinner-audit"></div>
                        <p>Carregando dados da auditoria...</p>
                    </div>
                </div>

                <div class="modal-auditoria-footer">
                    <button class="btn-audit-secondary" onclick="window.fecharModalAuditoria()">
                        <span class="material-icons">close</span> Fechar
                    </button>
                    <button class="btn-audit-pdf" onclick="window.exportarAuditoriaPDF()">
                        <span class="material-icons">picture_as_pdf</span> Exportar PDF
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    injetarEstilosModalAuditoriaFinanceira();
}

/**
 * Abre o modal de auditoria financeira
 */
export async function abrirAuditoriaFinanceira(timeId, ligaId, nomeParticipante) {
    injetarModalAuditoria();

    const modal = document.getElementById('modal-auditoria-financeira');
    const body = document.getElementById('auditoria-body');
    const titulo = document.getElementById('auditoria-titulo');
    const subtitulo = document.getElementById('auditoria-subtitulo');

    // Mostrar modal com loading
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    titulo.textContent = nomeParticipante || 'Auditoria Financeira';
    subtitulo.textContent = 'Carregando dados...';
    body.innerHTML = `
        <div class="auditoria-loading">
            <div class="loading-spinner-audit"></div>
            <p>Carregando dados da auditoria...</p>
        </div>
    `;

    try {
        const temporada = window.temporadaAtual || 2026;

        // Buscar dados via API de tesouraria
        const response = await fetch(`/api/tesouraria/participante/${ligaId}/${timeId}?temporada=${temporada}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        // Salvar para exportacao PDF
        auditoriaAtual = {
            participante: data.participante,
            financeiro: data.financeiro,
            acertos: data.acertos || [],
            dataGeracao: new Date()
        };

        // Renderizar conteudo
        renderizarConteudoAuditoria(data, body, subtitulo);

    } catch (error) {
        console.error('[AUDITORIA] Erro:', error);
        body.innerHTML = `
            <div class="auditoria-loading" style="color: #ef4444;">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">error_outline</span>
                <p>Erro ao carregar auditoria: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Renderiza o conteudo da auditoria no modal
 */
function renderizarConteudoAuditoria(data, container, subtitulo) {
    const { participante, financeiro, acertos } = data;

    // Atualizar subtitulo
    subtitulo.textContent = `${participante.ligaNome} • Temporada ${financeiro.temporada}`;

    // Determinar status
    let statusClass, statusIcon, statusText;
    if (financeiro.saldoFinal > 0.01) {
        statusClass = 'status-credor';
        statusIcon = 'arrow_upward';
        statusText = 'A RECEBER';
    } else if (financeiro.saldoFinal < -0.01) {
        statusClass = 'status-devedor';
        statusIcon = 'arrow_downward';
        statusText = 'DEVE';
    } else {
        statusClass = 'status-quitado';
        statusIcon = 'check_circle';
        statusText = 'QUITADO';
    }

    // Formatar valores
    const fmt = (v) => Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtClass = (v) => v > 0 ? 'val-positivo' : v < 0 ? 'val-negativo' : 'val-neutro';
    const fmtSinal = (v) => v > 0 ? '+' : v < 0 ? '-' : '';

    // Historico de acertos HTML
    let acertosHtml = '';
    if (acertos.length > 0) {
        acertosHtml = acertos.map(a => {
            const dataFormatada = new Date(a.dataAcerto).toLocaleDateString('pt-BR');
            const isPagamento = a.tipo === 'pagamento';
            return `
                <div class="audit-history-item">
                    <div class="history-left">
                        <div class="history-icon ${a.tipo}">
                            <span class="material-icons">${isPagamento ? 'arrow_downward' : 'arrow_upward'}</span>
                        </div>
                        <div class="history-info">
                            <span class="history-desc">${a.descricao || (isPagamento ? 'Pagamento' : 'Recebimento')}</span>
                            <span class="history-date">${dataFormatada} • ${a.metodoPagamento || 'N/D'}</span>
                        </div>
                    </div>
                    <span class="history-valor ${isPagamento ? 'val-positivo' : 'val-negativo'}">
                        ${isPagamento ? '+' : '-'}R$ ${fmt(a.valor)}
                    </span>
                </div>
            `;
        }).join('');
    } else {
        acertosHtml = '<div class="audit-empty">Nenhum acerto registrado</div>';
    }

    container.innerHTML = `
        <!-- Status Principal -->
        <div style="text-align: center; margin-bottom: 24px;">
            <div class="audit-status ${statusClass}">
                <span class="material-icons">${statusIcon}</span>
                ${statusText}
            </div>
            <div style="margin-top: 12px;">
                <span style="font-size: 2rem; font-weight: 700; font-family: 'JetBrains Mono', monospace;" class="${fmtClass(financeiro.saldoFinal)}">
                    ${fmtSinal(financeiro.saldoFinal)}R$ ${fmt(financeiro.saldoFinal)}
                </span>
            </div>
        </div>

        <!-- Resumo Financeiro -->
        <div class="audit-section">
            <div class="audit-section-header">
                <span class="material-icons">summarize</span>
                <h4>Resumo Financeiro</h4>
            </div>
            <div class="audit-section-body">
                <table class="audit-table">
                    <tr>
                        <td>Saldo das Rodadas (Banco)</td>
                        <td class="${fmtClass(financeiro.saldoConsolidado)}">${fmtSinal(financeiro.saldoConsolidado)}R$ ${fmt(financeiro.saldoConsolidado)}</td>
                    </tr>
                    <tr>
                        <td>Campos Manuais (Premios)</td>
                        <td class="${fmtClass(financeiro.saldoCampos)}">${fmtSinal(financeiro.saldoCampos)}R$ ${fmt(financeiro.saldoCampos)}</td>
                    </tr>
                    <tr class="separator-row"><td colspan="2"></td></tr>
                    <tr>
                        <td><strong>Credito/Debito Base</strong></td>
                        <td class="${fmtClass(financeiro.saldoTemporada)}"><strong>${fmtSinal(financeiro.saldoTemporada)}R$ ${fmt(financeiro.saldoTemporada)}</strong></td>
                    </tr>
                    <tr>
                        <td>Pagamentos (Participante -> Admin)</td>
                        <td class="val-positivo">+R$ ${fmt(financeiro.totalPago)}</td>
                    </tr>
                    <tr>
                        <td>Recebimentos (Admin -> Participante)</td>
                        <td class="val-negativo">-R$ ${fmt(financeiro.totalRecebido)}</td>
                    </tr>
                    <tr class="separator-row"><td colspan="2"></td></tr>
                    <tr class="total-row">
                        <td><strong>SALDO FINAL</strong></td>
                        <td class="${fmtClass(financeiro.saldoFinal)}"><strong>${fmtSinal(financeiro.saldoFinal)}R$ ${fmt(financeiro.saldoFinal)}</strong></td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Historico de Acertos -->
        <div class="audit-section">
            <div class="audit-section-header">
                <span class="material-icons">history</span>
                <h4>Historico de Acertos (${acertos.length})</h4>
            </div>
            <div class="audit-section-body">
                <div class="audit-history-list">
                    ${acertosHtml}
                </div>
            </div>
        </div>

        <!-- Legenda -->
        <div style="background: rgba(255, 255, 255, 0.02); border-radius: 8px; padding: 12px 16px; font-size: 0.75rem; color: #666;">
            <strong style="color: #888;">Logica dos Acertos:</strong><br>
            • <span class="val-positivo">Pagamento</span> = participante paga admin (abate divida) -> SOMA ao saldo<br>
            • <span class="val-negativo">Recebimento</span> = admin paga participante (abate credito) -> SUBTRAI do saldo
        </div>
    `;
}

/**
 * Fecha o modal de auditoria
 */
export function fecharModalAuditoria() {
    const modal = document.getElementById('modal-auditoria-financeira');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// =============================================================================
// EXPORTACAO PDF - EXTRATO
// =============================================================================

/**
 * Exporta extrato do participante para PDF (multi-pagina)
 */
export async function exportarExtratoPDF(timeId) {
    try {
        if (typeof window.jspdf === "undefined") {
            SuperModal.toast.info("Biblioteca jsPDF nao carregada. Atualize a pagina.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const extrato = window.extratoAtual;
        const cache = window.fluxoFinanceiroCache;

        if (!extrato || !extrato.rodadas) {
            SuperModal.toast.warning("Extrato nao carregado. Selecione um participante primeiro.");
            return;
        }

        const participante = cache?.participantes?.find(
            (p) => p.time_id === timeId || p.id === timeId,
        ) || {};

        const nomeCartola = participante.nome_cartola || "Participante";
        const nomeTime = participante.nome_time || "Time";

        console.log(`[FLUXO-PDF] Gerando PDF para ${nomeCartola}...`);

        // ===== PROCESSAR DADOS LINHA A LINHA =====
        const ganhos = [];
        const perdas = [];

        // Processar cada rodada
        extrato.rodadas.forEach((r) => {
            const rod = `R${r.rodada}`;
            const pts = r.pontos ? ` (${r.pontos.toFixed(2)} pts)` : "";

            // RANKING DE RODADAS (Bonus/Onus)
            if (r.bonusOnus > 0) {
                const pos = r.posicao === 1 ? "MITO" : `${r.posicao}o lugar`;
                ganhos.push({ modulo: "RANKING DE RODADAS", desc: `${rod} - ${pos}${pts}`, valor: r.bonusOnus });
            } else if (r.bonusOnus < 0) {
                const pos = r.isMico ? "MICO" : `${r.posicao}o lugar`;
                perdas.push({ modulo: "RANKING DE RODADAS", desc: `${rod} - ${pos}${pts}`, valor: r.bonusOnus });
            }

            // Pontos Corridos
            if (r.pontosCorridos > 0) {
                ganhos.push({ modulo: "PONTOS CORRIDOS", desc: `${rod} - Vitoria no confronto`, valor: r.pontosCorridos });
            } else if (r.pontosCorridos < 0) {
                perdas.push({ modulo: "PONTOS CORRIDOS", desc: `${rod} - Derrota no confronto`, valor: r.pontosCorridos });
            }

            // Mata-Mata
            if (r.mataMata > 0) {
                ganhos.push({ modulo: "MATA-MATA", desc: `${rod} - Vitoria na fase`, valor: r.mataMata });
            } else if (r.mataMata < 0) {
                perdas.push({ modulo: "MATA-MATA", desc: `${rod} - Derrota na fase`, valor: r.mataMata });
            }

            // TOP 10 - Detalhamento completo (posicao = posicao na rodada, nao global)
            if (r.top10 > 0) {
                const ptsTop = r.pontos ? ` com ${r.pontos.toFixed(2)} pts` : "";
                ganhos.push({ modulo: "TOP 10 MITOS", desc: `${rod} - Melhor da rodada${ptsTop}`, valor: r.top10 });
            } else if (r.top10 < 0) {
                const ptsTop = r.pontos ? ` com ${r.pontos.toFixed(2)} pts` : "";
                perdas.push({ modulo: "TOP 10 MICOS", desc: `${rod} - Pior da rodada${ptsTop}`, valor: r.top10 });
            }
        });

        // Campos manuais - usar o nome exato do campo
        const campos = extrato.camposEditaveis || {};
        ["campo1", "campo2", "campo3", "campo4"].forEach((key) => {
            const c = campos[key];
            if (c && c.valor !== 0) {
                const nomeCampo = c.nome || `Campo ${key.replace("campo", "")}`;
                if (c.valor > 0) {
                    ganhos.push({ modulo: nomeCampo.toUpperCase(), desc: "Lancamento manual", valor: c.valor });
                } else {
                    perdas.push({ modulo: nomeCampo.toUpperCase(), desc: "Lancamento manual", valor: c.valor });
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
        const footerHeight = 45; // Espaco reservado para resumo + rodape
        let paginaAtual = 1;

        // ===== FUNCAO PARA DESENHAR HEADER =====
        const desenharHeader = (isContinuacao = false) => {
            doc.setFillColor(26, 26, 26);
            doc.rect(0, 0, pw, 28, "F");
            doc.setFillColor(255, 69, 0);
            doc.rect(0, 0, pw, 3, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            const titulo = isContinuacao ? "EXTRATO FINANCEIRO (CONTINUACAO)" : "EXTRATO FINANCEIRO";
            doc.text(titulo, pw / 2, 12, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${nomeCartola} - ${nomeTime}`, pw / 2, 20, { align: "center" });

            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            const pagina = isContinuacao ? ` | Pagina ${paginaAtual}` : "";
            doc.text(new Date().toLocaleString("pt-BR") + pagina, pw / 2, 26, { align: "center" });

            return 33; // Retorna Y apos o header
        };

        // ===== FUNCAO PARA DESENHAR RODAPE E RESUMO =====
        const desenharRodape = () => {
            const resumoY = ph - 35;

            doc.setFillColor(40, 40, 45);
            doc.roundedRect(m, resumoY, pw - 2 * m, 18, 2, 2, "F");

            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 165, 0);
            doc.text("RESUMO POR MODULO", m + 3, resumoY + 5);

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
            doc.text("Super Cartola Manager - Documento para conferencia", m, ph - 7);
            doc.text(`Pagina ${paginaAtual} | v5.0`, pw - m, ph - 7, { align: "right" });
        };

        // ===== PAGINA 1 - HEADER + SALDO =====
        let y = desenharHeader(false);

        // Saldo central
        let corSaldo, txtSaldo;
        if (saldo === 0) {
            corSaldo = [150, 150, 150]; // cinza
            txtSaldo = "QUITADO";
        } else if (saldo > 0) {
            corSaldo = [34, 197, 94]; // verde
            txtSaldo = "A RECEBER";
        } else {
            corSaldo = [239, 68, 68]; // vermelho
            txtSaldo = "DEVE";
        }

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

        // Titulos das colunas
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

        // ===== AGRUPAR ITENS POR MODULO =====
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

        // ===== DESENHAR LISTAS COM PAGINACAO =====
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

                // Truncar descricao se muito longa
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
            // Verificar se precisa nova pagina
            if (lyGanhos >= maxY || lyPerdas >= maxY) {
                paginaAtual++;
                doc.addPage();
                y = desenharHeader(true);

                // Redesenhar titulos das colunas
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

            // Desenhar proximo item de ganhos
            if (idxGanhos < listaGanhos.length && lyGanhos < maxY) {
                desenharItem(listaGanhos[idxGanhos], colGanhosX, lyGanhos, true);
                lyGanhos += lineH;
                if (listaGanhos[idxGanhos].tipo === "header") lyGanhos += 0.5;
                idxGanhos++;
            }

            // Desenhar proximo item de perdas
            if (idxPerdas < listaPerdas.length && lyPerdas < maxY) {
                desenharItem(listaPerdas[idxPerdas], colPerdasX, lyPerdas, false);
                lyPerdas += lineH;
                if (listaPerdas[idxPerdas].tipo === "header") lyPerdas += 0.5;
                idxPerdas++;
            }
        }

        // ===== DESENHAR RODAPE NA ULTIMA PAGINA =====
        desenharRodape();

        // ===== SALVAR =====
        const nomeArquivo = `extrato_${nomeCartola.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
        doc.save(nomeArquivo);

        console.log(`[FLUXO-PDF] PDF gerado (${paginaAtual} pagina(s)): ${nomeArquivo}`);
    } catch (error) {
        console.error("[FLUXO-PDF] Erro ao gerar PDF:", error);
        SuperModal.toast.error(`Erro ao gerar PDF: ${error.message}`);
    }
}

// =============================================================================
// EXPORTACAO PDF - AUDITORIA
// =============================================================================

/**
 * Exporta a auditoria para PDF
 */
export async function exportarAuditoriaPDF() {
    if (!auditoriaAtual) {
        SuperModal.toast.info('Nenhuma auditoria carregada para exportar.');
        return;
    }

    // Verificar se jsPDF esta disponivel
    if (typeof window.jspdf === 'undefined') {
        // Carregar jsPDF dinamicamente
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => gerarPDFAuditoria();
        document.head.appendChild(script);
    } else {
        gerarPDFAuditoria();
    }
}

/**
 * Gera o PDF da auditoria
 */
function gerarPDFAuditoria() {
    const { jsPDF } = window.jspdf;
    const { participante, financeiro, acertos, dataGeracao } = auditoriaAtual;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Cores
    const laranja = [255, 85, 0];
    const cinza = [100, 100, 100];
    const verde = [16, 185, 129];
    const vermelho = [239, 68, 68];
    const azul = [59, 130, 246];

    // Helper para formatar valores
    const fmt = (v) => Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ========== CABECALHO ==========
    doc.setFillColor(...laranja);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('AUDITORIA FINANCEIRA', margin, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(participante.nomeTime || participante.nomeCartola || 'Participante', margin, 23);
    doc.text(`${participante.ligaNome} • Temporada ${financeiro.temporada}`, margin, 30);

    // Data no canto
    doc.setFontSize(9);
    doc.text(`Gerado em: ${dataGeracao.toLocaleDateString('pt-BR')}`, pageWidth - margin, 30, { align: 'right' });

    y = 45;

    // ========== STATUS ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');

    let statusText, statusColor;
    if (financeiro.saldoFinal > 0.01) {
        statusText = 'STATUS: A RECEBER';
        statusColor = azul;
    } else if (financeiro.saldoFinal < -0.01) {
        statusText = 'STATUS: DEVE';
        statusColor = vermelho;
    } else {
        statusText = 'STATUS: QUITADO';
        statusColor = verde;
    }

    doc.setTextColor(...statusColor);
    doc.text(statusText, pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(20);
    const sinal = financeiro.saldoFinal > 0 ? '+' : financeiro.saldoFinal < 0 ? '-' : '';
    doc.text(`${sinal}R$ ${fmt(financeiro.saldoFinal)}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // ========== RESUMO FINANCEIRO ==========
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO FINANCEIRO', margin + 2, y + 5.5);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const linhas = [
        ['Saldo das Rodadas (Banco)', financeiro.saldoConsolidado],
        ['Campos Manuais (Premios)', financeiro.saldoCampos],
        ['----------------------------', null],
        ['Credito/Debito Base', financeiro.saldoTemporada],
        ['Pagamentos (Participante > Admin)', financeiro.totalPago],
        ['Recebimentos (Admin > Participante)', -financeiro.totalRecebido],
        ['----------------------------', null],
        ['SALDO FINAL', financeiro.saldoFinal]
    ];

    linhas.forEach(([label, valor]) => {
        if (valor === null) {
            doc.setTextColor(...cinza);
            doc.text(label, margin, y);
        } else {
            doc.setTextColor(0, 0, 0);
            doc.text(label, margin, y);

            const valorStr = `${valor >= 0 ? '+' : '-'}R$ ${fmt(valor)}`;
            if (valor > 0) doc.setTextColor(...verde);
            else if (valor < 0) doc.setTextColor(...vermelho);
            else doc.setTextColor(...cinza);

            doc.text(valorStr, pageWidth - margin, y, { align: 'right' });
        }
        y += 6;
    });

    y += 5;

    // ========== HISTORICO DE ACERTOS ==========
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`HISTORICO DE ACERTOS (${acertos.length})`, margin + 2, y + 5.5);
    y += 12;

    if (acertos.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...cinza);
        doc.text('Nenhum acerto registrado', margin, y);
        y += 10;
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        acertos.forEach(a => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const dataFormatada = new Date(a.dataAcerto).toLocaleDateString('pt-BR');
            const isPagamento = a.tipo === 'pagamento';
            const tipoTexto = isPagamento ? 'PAGOU' : 'RECEBEU';

            doc.setTextColor(0, 0, 0);
            doc.text(`${dataFormatada} - ${tipoTexto}`, margin, y);
            doc.text(a.descricao || '-', margin + 45, y);

            const valorStr = `${isPagamento ? '+' : '-'}R$ ${fmt(a.valor)}`;
            doc.setTextColor(...(isPagamento ? verde : vermelho));
            doc.text(valorStr, pageWidth - margin, y, { align: 'right' });

            y += 5;
        });
    }

    y += 10;

    // ========== LEGENDA ==========
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, pageWidth - (margin * 2), 18, 'F');

    doc.setFontSize(8);
    doc.setTextColor(...cinza);
    doc.setFont('helvetica', 'bold');
    doc.text('Logica dos Acertos:', margin + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text('* Pagamento = participante paga admin (abate divida) > SOMA ao saldo', margin + 2, y + 10);
    doc.text('* Recebimento = admin paga participante (abate credito) > SUBTRAI do saldo', margin + 2, y + 15);

    // ========== RODAPE ==========
    doc.setFontSize(8);
    doc.setTextColor(...cinza);
    doc.text('Super Cartola Manager - Relatorio gerado automaticamente', pageWidth / 2, 290, { align: 'center' });

    // Salvar PDF
    const nomeArquivo = `auditoria_${(participante.nomeCartola || 'participante').replace(/\s+/g, '_')}_${financeiro.temporada}.pdf`;
    doc.save(nomeArquivo);
}

// =============================================================================
// INICIALIZACAO - REGISTRA FUNCOES GLOBAIS
// =============================================================================

/**
 * Registra todas as funcoes no objeto window para uso global
 */
export function inicializarPDF() {
    window.exportarExtratoPDF = exportarExtratoPDF;
    window.exportarAuditoriaPDF = exportarAuditoriaPDF;
    window.abrirAuditoriaFinanceira = abrirAuditoriaFinanceira;
    window.fecharModalAuditoria = fecharModalAuditoria;

    console.log("[FLUXO-PDF] v1.0 - Modulo de PDF/Auditoria inicializado");
}

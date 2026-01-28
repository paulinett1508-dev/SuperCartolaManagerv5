import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
import {
    FluxoFinanceiroAuditoria,
    injetarEstilosAuditoria,
} from "./fluxo-financeiro-auditoria.js";
import { formatarMoedaBR, parseMoedaBR } from "./fluxo-financeiro-utils.js";
import {
    injetarEstilosWrapper,
    injetarEstilosTabelaCompacta,
    injetarEstilosTabelaExpandida,
    injetarEstilosModal,
    injetarEstilosModalAuditoriaFinanceira
} from "./fluxo-financeiro-styles.js";
import { inicializarPDF } from "./fluxo-financeiro-pdf.js";

/**
 * FLUXO-FINANCEIRO-UI.JS - v8.9 (Seção Ajustes Financeiros Removida)
 * ✅ v8.9: Seção "Ajustes Financeiros" REMOVIDA para 2026+ (redundante com botão Acerto no footer)
 * ✅ v8.8.1: FIX - primeiraTemporada usa criadaEm (ano real de criação da liga)
 * ✅ v8.8: Tab 2025 oculta para ligas criadas em 2026 (usa primeiraTemporada da API)
 * ✅ v8.7: Label "Inscrição XXXX" substituído por "Saldo Inicial" + sub-linha informativa
 * ✅ v8.6: Removida seção "Lançamentos" do extrato (redundante com Acertos/Ajustes)
 * ✅ v8.5: PDF/Auditoria extraído para módulo separado
 * ✅ v8.4: Funções CSS extraídas para fluxo-financeiro-styles.js (~1.850 linhas)
 * ✅ v8.3 (Removido Botão da Morte)
 * ✅ v8.3: REMOVIDO botão "Limpar Cache" - causava perda de dados irrecuperáveis
 *   - Funções recalcularCacheParticipante e limparCacheLiga REMOVIDAS
 *   - Cache é invalidado automaticamente quando necessário
 * ✅ v8.2: Fix CRÍTICO - Passa temporada no fallback de campos legados
 * ✅ v8.1: Fallback para campos legados (fluxofinanceirocampos) se novo sistema vazio
 * ✅ v6.7: UI adaptada para pré-temporada 2026
 * ✅ v6.4: Seletor de temporadas (2025/2026) no modal de extrato individual
 * ✅ v6.3: Cards de resumo clicáveis para filtrar tabela
 * ✅ v6.2: Modal de Auditoria Financeira com exportação PDF
 * ✅ v5.6: Renomeado 'Ajustes' para 'Aj. Manuais' + nova coluna 'Acertos'
 * ✅ v5.5: FIX - Passar temporada em todas as requisições de API
 * ✅ v5.4: Remove liga ID hardcoded - usa config dinâmica para determinar fases
 * ✅ v5.3: Botão "Acerto" para registrar pagamentos/recebimentos
 * ✅ v5.0: PDF multi-página com quebra automática e TOP 10 detalhado
 * ✅ v4.7: Botão "Exportar PDF" do extrato individual
 * ✅ v4.6: Títulos dos campos editáveis agora são editáveis em modo Admin
 * ✅ v4.3: Campos editáveis SEMPRE visíveis para admin + Material Icons
 * Objetivo: Renderização Pura + Classes CSS
 */

export class FluxoFinanceiroUI {
    constructor() {
        this.containerId = "fluxoFinanceiroContent";
        this.buttonsContainerId = "fluxoFinanceiroButtons";
        this.auditoria = null;
        this.modalId = "modalExtratoFinanceiro";
        this.participanteAtual = null;
        this._extratoIntegracoes = [];
        this._extratoIntegracoesCarregadas = false;
        injetarEstilosAuditoria();

        // ✅ v4.3: Detectar modo admin
        this.detectarModoAdmin();

        // ✅ v6.0: Criar modal no DOM
        this.criarModalExtrato();

        // ✅ v8.5: Inicializar modulo PDF/Auditoria
        inicializarPDF();
    }

    /**
     * Cria a estrutura do modal no DOM (apenas uma vez)
     */
    criarModalExtrato() {
        // Se já existe, não criar novamente
        if (document.getElementById(this.modalId)) {
            console.log('[FLUXO-UI] Modal já existe no DOM');
            return;
        }

        // Aguardar DOM estar pronto
        if (!document.body) {
            console.log('[FLUXO-UI] DOM não pronto, agendando criação do modal');
            document.addEventListener('DOMContentLoaded', () => this.criarModalExtrato());
            return;
        }

        console.log('[FLUXO-UI] Criando modal de extrato...');
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'modal-extrato-overlay';
        modal.innerHTML = `
            <div class="modal-extrato-container">
                <div class="modal-extrato-header">
                    <div class="modal-extrato-header-left">
                        <img id="modalExtratoAvatar" class="modal-extrato-avatar" src="" alt="">
                        <div class="modal-extrato-info">
                            <h3 id="modalExtratoNome">-</h3>
                            <div class="modal-extrato-subtitulo-row">
                                <span id="modalExtratoSubtitulo">Extrato Financeiro</span>
                                <!-- ✅ v7.3: Removido seletor de temporada - extrato segue temporada da aba -->
                                <!-- Badge de Quitação -->
                                <span id="modalExtratoBadgeQuitacao" class="badge-quitacao-extrato" style="display: none;">
                                    <span class="material-icons">verified</span> QUITADO
                                </span>
                            </div>
                        </div>
                    </div>
                    <button class="modal-extrato-close" onclick="window.fecharModalExtrato()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-extrato-body" id="modalExtratoBody">
                    <!-- Conteúdo do extrato será injetado aqui -->
                </div>
                <div class="modal-extrato-footer">
                    <div class="modal-extrato-footer-left">
                        <button id="btnModalAcerto" class="btn-modern btn-acerto-gradient" onclick="window.abrirModalAcertoFromExtrato()">
                            <span class="material-icons" style="font-size: 14px;">payments</span> Acerto
                        </button>
                        <button id="btnModalPDF" class="btn-modern btn-pdf-gradient" onclick="window.exportarExtratoPDFFromModal()">
                            <span class="material-icons" style="font-size: 14px;">picture_as_pdf</span> PDF
                        </button>
                    </div>
                    <div class="modal-extrato-footer-right">
                        <button id="btnModalAtualizar" class="btn-modern btn-secondary-gradient" onclick="window.atualizarExtratoModal()">
                            <span class="material-icons" style="font-size: 14px;">refresh</span> Atualizar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.fecharModalExtrato();
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.fecharModalExtrato();
            }
        });

        // Expor funções globais para os botões do modal
        window.fecharModalExtrato = () => this.fecharModalExtrato();
        window.abrirModalAcertoFromExtrato = () => {
            if (this.participanteAtual) {
                const timeId = this.participanteAtual.time_id || this.participanteAtual.id;
                const nome = (this.participanteAtual.nome || this.participanteAtual.nomeTime || 'Participante').replace(/'/g, "\\'");
                const saldo = typeof this.participanteAtual.saldoFinalIntegrado === 'number'
                    ? this.participanteAtual.saldoFinalIntegrado
                    : (this.participanteAtual.saldoFinal || this.participanteAtual.saldo || 0);
                // ✅ FIX: Chamar função correta com saldo para habilitar botão "Zerar"
                if (window.abrirModalAcertoFluxo) {
                    window.abrirModalAcertoFluxo(timeId, nome, saldo);
                }
            }
        };
        window.exportarExtratoPDFFromModal = () => {
            if (this.participanteAtual && window.exportarExtratoPDF) {
                const timeId = this.participanteAtual.time_id || this.participanteAtual.id;
                window.exportarExtratoPDF(timeId);
            }
        };
        window.atualizarExtratoModal = async () => {
            if (this.participanteAtual && window.forcarRefreshExtrato) {
                const timeId = this.participanteAtual.time_id || this.participanteAtual.id;
                await window.forcarRefreshExtrato(timeId);
            }
        };

        // ✅ v7.3: Removido seletor de temporadas - extrato segue temporada da aba atual
        // A temporada do modal é sempre window.temporadaAtual (definida pela aba selecionada)

        console.log('[FLUXO-UI] Modal de extrato criado');
    }

    /**
     * Abre o modal do extrato
     */
    abrirModalExtrato(participante) {
        console.log('[FLUXO-UI] Abrindo modal para:', participante?.nome_cartola || participante?.nome_time || participante?.nome || 'Participante');
        const modal = document.getElementById(this.modalId);
        if (!modal) {
            console.error('[FLUXO-UI] Modal não encontrado no DOM!');
            return;
        }

        this.participanteAtual = participante;

        // Atualizar header do modal
        const avatar = document.getElementById('modalExtratoAvatar');
        const nome = document.getElementById('modalExtratoNome');

        if (avatar) {
            avatar.src = participante.url_escudo_png || '';
            avatar.onerror = () => { avatar.style.display = 'none'; };
            avatar.style.display = participante.url_escudo_png ? 'block' : 'none';
        }
        if (nome) {
            nome.textContent = participante.nome || participante.nomeTime || participante.nome_cartola || 'Participante';
        }

        // Abrir modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Fecha o modal do extrato
     */
    fecharModalExtrato() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * ✅ v6.4: Troca a temporada do extrato individual
     * @param {number} temporada - 2025 ou 2026
     */
    // ✅ v7.3: REMOVIDO - trocarTemporadaExtrato()
    // Extrato individual agora segue a temporada da aba selecionada (window.temporadaAtual)
    // Não há mais seletor de temporada dentro do modal de extrato

    /**
     * ✅ v6.4: Renderiza extrato de uma temporada específica
     */
    async renderizarExtratoTemporada(data, temporada) {
        const modalBody = document.getElementById('modalExtratoBody');
        if (!modalBody) return;

        // Formatar valores
        const formatarMoeda = (v) => {
            const valor = parseFloat(v) || 0;
            const formatted = 'R$ ' + Math.abs(valor).toFixed(2).replace('.', ',');
            return valor < 0 ? `-${formatted}` : formatted;
        };

        const getValorClass = (valor) => {
            const v = parseFloat(valor) || 0;
            if (v > 0.01) return 'positivo';
            if (v < -0.01) return 'negativo';
            return 'neutro';
        };

        // Verificar se é temporada quitada
        const isQuitado = data.quitacao?.quitado;
        const legadoInfo = data.legado_manual || data.quitacao || null;

        // Preparar resumo
        const resumo = data.resumo || {};
        // ✅ v6.6: RESULTADO DA TEMPORADA (histórico, imutável) - o que ganhou/perdeu
        // Usar saldo_temporada se disponível, senão fallback para saldo
        const resultadoTemporada = resumo.saldo_temporada ?? resumo.saldo ?? data.financeiro?.saldoFinal ?? 0;
        // ✅ v6.6: SALDO PENDENTE (operacional) - inclui acertos
        const saldoPendente = resumo.saldo ?? 0;

        // HTML do extrato
        let html = '';

        // Banner de Quitação (se aplicável)
        if (isQuitado) {
            const valorLegado = legadoInfo?.valor_legado ?? legadoInfo?.valor_definido ?? 0;
            const tipoQuitacao = data.quitacao?.tipo || legadoInfo?.tipo_quitacao || 'N/A';
            html += `
                <div class="extrato-quitado-banner">
                    <div class="extrato-quitado-banner-header">
                        <span class="material-icons">verified</span>
                        <h4>Temporada ${temporada} Quitada</h4>
                    </div>
                    <div class="extrato-quitado-banner-content">
                        <div class="extrato-quitado-item">
                            <label>Tipo</label>
                            <span>${tipoQuitacao === 'zerado' ? 'Zerado' : tipoQuitacao === 'integral' ? 'Integral' : 'Customizado'}</span>
                        </div>
                        <div class="extrato-quitado-item">
                            <label>Saldo Original</label>
                            <span class="${getValorClass(data.quitacao?.saldo_no_momento)}">${formatarMoeda(data.quitacao?.saldo_no_momento || 0)}</span>
                        </div>
                        <div class="extrato-quitado-item">
                            <label>Legado p/ ${temporada + 1}</label>
                            <span class="${valorLegado === 0 ? 'valor-zerado' : getValorClass(valorLegado)}">${formatarMoeda(valorLegado)}</span>
                        </div>
                        <div class="extrato-quitado-item">
                            <label>Data</label>
                            <span>${data.quitacao?.data_quitacao ? new Date(data.quitacao.data_quitacao).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                        ${data.quitacao?.observacao ? `
                            <div class="extrato-quitado-item" style="grid-column: span 2;">
                                <label>Observação</label>
                                <span style="font-size: 11px;">${data.quitacao.observacao}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // v7.1: Banner de Legado REMOVIDO do extrato 2026
        // Legado é sobre quitação de 2025, não deve aparecer no extrato da nova temporada
        // Histórico de 2025 fica preservado no extrato de 2025

        // ✅ v7.1: Definir rodadas ANTES dos cards para poder condicionar exibição
        const historicoRodadas = data.rodadas || data.historico || [];
        const transacoesEspeciais = historicoRodadas.filter(t => t.isTransacaoEspecial || t.tipo);
        const rodadasNormais = historicoRodadas.filter(t => !t.isTransacaoEspecial && !t.tipo);
        const temRodadas = rodadasNormais.length > 0;

        // Cards de Resumo - v7.1: Só mostra se TEM RODADAS (não é pré-temporada)
        if (temRodadas) {
            html += `
                <div class="extrato-resumo-cards">
                    <div class="extrato-resumo-card">
                        <span class="card-label">Bônus</span>
                        <span class="card-value ${getValorClass(resumo.bonus)}">${formatarMoeda(resumo.bonus || 0)}</span>
                    </div>
                    <div class="extrato-resumo-card">
                        <span class="card-label">Ônus</span>
                        <span class="card-value ${getValorClass(resumo.onus)}">${formatarMoeda(resumo.onus || 0)}</span>
                    </div>
                    <div class="extrato-resumo-card">
                        <span class="card-label">Pts Corridos</span>
                        <span class="card-value ${getValorClass(resumo.pontosCorridos)}">${formatarMoeda(resumo.pontosCorridos || 0)}</span>
                    </div>
                    <div class="extrato-resumo-card">
                        <span class="card-label">Mata-Mata</span>
                        <span class="card-value ${getValorClass(resumo.mataMata)}">${formatarMoeda(resumo.mataMata || 0)}</span>
                    </div>
                    <div class="extrato-resumo-card">
                        <span class="card-label">Top 10</span>
                        <span class="card-value ${getValorClass(resumo.top10)}">${formatarMoeda(resumo.top10 || 0)}</span>
                    </div>
                    <div class="extrato-resumo-card">
                        <span class="card-label">Manuais</span>
                        <span class="card-value ${getValorClass(resumo.camposManuais)}">${formatarMoeda(resumo.camposManuais || 0)}</span>
                    </div>
                </div>
            `;
        }

        // ✅ v6.6: Card de RESULTADO DA TEMPORADA (histórico, imutável)
        // Mostra o que o participante ganhou/perdeu, independente de ter quitado
        html += `
            <div class="saldo-final-card ${resultadoTemporada >= 0 ? 'saldo-final-positivo' : 'saldo-final-negativo'}">
                <div class="saldo-final-titulo">Resultado ${temporada}</div>
                <div class="saldo-final-valor">${formatarMoeda(resultadoTemporada)}</div>
                ${isQuitado ? '<span class="performance-badge excelente">QUITADO</span>' : saldoPendente === 0 && Math.abs(resultadoTemporada) > 0 ? '<span class="performance-badge excelente">QUITADO</span>' : ''}
            </div>
        `;

        // ✅ v8.6: Seção de "Lançamentos" (inscrição, legado) REMOVIDA
        // Motivo: Redundante com botão "Acerto" (footer) e seção "Ajustes Manuais" (Adicionar)
        // O admin pode registrar inscrição/legado via Acertos ou Ajustes Financeiros
        // Mantendo código comentado para referência:
        /*
        if (transacoesEspeciais.length > 0) {
            html += `
                <div class="extrato-transacoes-especiais" style="margin-top: 20px;">
                    <div class="detalhamento-header">
                        <h3 class="detalhamento-titulo">Lançamentos</h3>
                    </div>
                    <div class="transacoes-especiais-lista">
                        ${transacoesEspeciais.map(t => `
                            <div class="transacao-especial-item">
                                <div class="transacao-especial-desc">
                                    <span class="material-icons" style="color: ${t.valor < 0 ? 'var(--danger)' : 'var(--success)'};">
                                        ${t.tipo === 'INSCRICAO_TEMPORADA' ? 'receipt_long' : 'swap_horiz'}
                                    </span>
                                    <span>${t.descricao || t.tipo}</span>
                                </div>
                                <div class="transacao-especial-valor ${getValorClass(t.valor)}">
                                    ${formatarMoeda(t.valor || 0)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        */

        // Mostrar tabela de rodadas se existirem
        if (rodadasNormais.length > 0) {
            // ✅ v6.6: Mostrar TODAS as rodadas (não apenas últimas 10)
            // Ordenar da mais recente para mais antiga para melhor visualização
            const todasRodadas = [...rodadasNormais].sort((a, b) => b.rodada - a.rodada);
            html += `
                <div class="detalhamento-container" style="margin-top: 20px;">
                    <div class="detalhamento-header">
                        <h3 class="detalhamento-titulo">Histórico de Rodadas (${rodadasNormais.length})</h3>
                    </div>
                    <div class="tabela-wrapper" style="max-height: 400px; overflow-y: auto;">
                        <table class="detalhamento-tabela">
                            <thead>
                                <tr>
                                    <th>Rod</th>
                                    <th>Pos</th>
                                    <th>B/O</th>
                                    <th>PC</th>
                                    <th>MM</th>
                                    <th>Top10</th>
                                    <th>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${todasRodadas.map(t => `
                                    <tr class="${t.isMito ? 'row-mito' : ''} ${t.isMico ? 'row-mico' : ''}">
                                        <td class="rodada-col">${t.rodada}</td>
                                        <td>${t.posicao || '-'}</td>
                                        <td class="${getValorClass(t.bonusOnus)}">${formatarMoeda(t.bonusOnus || 0)}</td>
                                        <td class="${getValorClass(t.pontosCorridos)}">${t.pontosCorridos != null && t.pontosCorridos !== 0 ? formatarMoeda(t.pontosCorridos) : '-'}</td>
                                        <td class="${getValorClass(t.mataMata)}">${t.mataMata != null && t.mataMata !== 0 ? formatarMoeda(t.mataMata) : '-'}</td>
                                        <td class="${getValorClass(t.top10)}">${t.top10 && t.top10 !== 0 ? formatarMoeda(t.top10) : '-'}${t.top10Status ? ` <small>(${t.top10Status})</small>` : ''}</td>
                                        <td class="saldo-col ${getValorClass(t.saldoAcumulado)}">${formatarMoeda(t.saldoAcumulado || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else if (!isQuitado) {
            // ✅ v8.6: Simplificado - mostra "sem dados" se não tem rodadas e não está quitado
            // (removida condição transacoesEspeciais pois seção foi removida)
            html += `
                <div class="extrato-sem-dados-temporada">
                    <span class="material-icons">hourglass_empty</span>
                    <p>Nenhum dado de rodadas para ${temporada}</p>
                    <p class="hint">${temporada === 2026 ? 'A temporada 2026 ainda não começou. Use o botão "Acerto" no rodapé para registrar valores.' : 'Verifique se o cache foi gerado.'}</p>
                </div>
            `;
        }

        // Se tem inscrição 2026 (para temporada 2025), mostrar info
        if (temporada === 2025 && data.inscricao_proxima) {
            const insc = data.inscricao_proxima;
            html += `
                <div class="extrato-legado-banner" style="margin-top: 20px;">
                    <div class="extrato-legado-banner-header">
                        <span class="material-icons">update</span>
                        <h4>Renovação 2026</h4>
                    </div>
                    <div class="extrato-quitado-banner-content">
                        <div class="extrato-quitado-item">
                            <label>Status</label>
                            <span style="color: ${insc.status === 'renovado' ? '#10b981' : insc.status === 'pendente' ? '#f59e0b' : '#ef4444'};">
                                ${insc.status === 'renovado' ? '✓ Renovado' : insc.status === 'pendente' ? '⏳ Pendente' : '✗ Não Participa'}
                            </span>
                        </div>
                        <div class="extrato-quitado-item">
                            <label>Inscrição</label>
                            <span style="color: ${insc.pagou_inscricao ? '#10b981' : '#f59e0b'};">
                                ${insc.pagou_inscricao ? '✓ Pago' : '⏳ Pendente'}
                            </span>
                        </div>
                        ${insc.taxa_inscricao ? `
                            <div class="extrato-quitado-item">
                                <label>Taxa</label>
                                <span class="negativo">${formatarMoeda(insc.taxa_inscricao)}</span>
                            </div>
                        ` : ''}
                        ${insc.legado_manual?.origem ? `
                            <div class="extrato-quitado-item">
                                <label>Legado</label>
                                <span class="${getValorClass(insc.legado_manual.valor_definido)}">${formatarMoeda(insc.legado_manual.valor_definido)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // ✅ v8.9: Seção "Ajustes Manuais" REMOVIDA para temporada 2026+
        // Motivo: Redundante com botão "Acerto" no footer do modal
        // O admin usa o botão "Acerto" (payments) para registrar movimentações

        modalBody.innerHTML = html;
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

    /**
     * Renderiza tabela de participantes com dados financeiros completos
     * v6.0 - Integração com Tesouraria/Prestação de Contas
     */
    async renderizarBotoesParticipantes(participantes) {
        const container = document.getElementById(this.buttonsContainerId);
        if (!container) return;

        // Obter ligaId da URL
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");

        // Mostrar loading enquanto busca dados de saldo
        container.innerHTML = `
            <div class="module-toolbar">
                <div class="toolbar-left">
                    <h2 class="module-title">
                        <span class="material-icons">account_balance_wallet</span>
                        Financeiro
                    </h2>
                </div>
            </div>
            <div class="fluxo-loading-saldos">
                <div class="loading-spinner"></div>
                <p>Calculando saldos...</p>
            </div>
        `;

        // Buscar dados de saldo da API de tesouraria
        // ✅ v5.5 FIX: Passar temporada para sincronizar com outras telas
        let dadosSaldo = null;
        try {
            const temporada = window.temporadaAtual || 2026;
            const response = await fetch(`/api/tesouraria/liga/${ligaId}?temporada=${temporada}`);
            if (response.ok) {
                dadosSaldo = await response.json();
                // ✅ v8.8.1: Salvar primeira temporada da liga para condicionar tabs
                window.ligaPrimeiraTemporada = dadosSaldo.primeiraTemporada || 2025;
                console.log(`[FLUXO-UI] 📅 primeiraTemporada da API: ${dadosSaldo.primeiraTemporada} → ligaPrimeiraTemporada: ${window.ligaPrimeiraTemporada}`);
            }
        } catch (error) {
            console.warn("[FLUXO-UI] Erro ao buscar saldos:", error);
        }

        // ✅ v2.1: Defaults alinhados com config/modulos-defaults.js
        this._modulosAtivos = dadosSaldo?.modulosAtivos || {
            banco: true,            // Sempre ativo
            pontosCorridos: false,  // Precisa habilitar
            mataMata: false,        // Precisa habilitar
            top10: true,            // Sempre ativo
            melhorMes: false,       // Precisa habilitar
            artilheiro: false,      // Precisa habilitar
            luvaOuro: false,        // Precisa habilitar
        };
        await this._carregarIntegracoesExtrato(ligaId);

        // ✅ v6.5 FIX: Para temporadas >= 2026, usar lista da API de tesouraria (já filtrada por renovados)
        // Temporadas anteriores (2025) usam lista do cache (todos os participantes)
        const temporadaNum = window.temporadaAtual || 2026;
        const usarListaTesouraria = temporadaNum >= 2026 && dadosSaldo?.participantes?.length > 0;

        // Determinar lista base de participantes
        const listaBase = usarListaTesouraria
            ? dadosSaldo.participantes.map(s => ({
                time_id: s.timeId,
                id: s.timeId,
                nome_cartola: s.nomeCartola || s.nomeTime || 'Participante',
                nome_time: s.nomeTime || 'Time',
                clube_id: s.clube_id,
                url_escudo_png: s.escudo,
                contato: s.contato
            }))
            : participantes;

        if (usarListaTesouraria) {
            console.log(`[FLUXO-UI] Temporada ${temporadaNum}: Usando lista da API (${listaBase.length} renovados)`);
        }

        const totalParticipantesBase = listaBase.length;

        // Mesclar dados de participantes com dados de saldo
        const participantesComSaldo = listaBase.map(p => {
            const timeId = String(p.time_id || p.id);
            const saldoInfo = dadosSaldo?.participantes?.find(s => String(s.timeId) === timeId);
            return {
                ...p,
                saldoTemporada: saldoInfo?.saldoTemporada || 0,
                saldoAcertos: saldoInfo?.saldoAcertos || 0,
                saldoFinal: saldoInfo?.saldoFinal || 0,
                situacao: saldoInfo?.situacao || 'quitado',
                quantidadeAcertos: saldoInfo?.quantidadeAcertos || 0,
                // ✅ v2.0: Adicionar breakdown por módulo
                breakdown: saldoInfo?.breakdown || null,
                // ✅ v2.12: Contato para botão WhatsApp (vem da API ou do participante)
                contato: saldoInfo?.contato || p.contato || null,
                clube_id: saldoInfo?.clube_id || p.clube_id || p.time_coracao || null,
                // ✅ v2.13: Dados de quitação para exibir badge
                quitacao: saldoInfo?.quitacao || null,
            };
        });

        const { participantes: participantesIntegrados, totais: totaisIntegrados } =
            this._aplicarIntegracoesTabela(participantesComSaldo, totalParticipantesBase);

        // Ordenar por nome
        const participantesOrdenados = [...participantesIntegrados].sort((a, b) =>
            (a.nome_cartola || '').localeCompare(b.nome_cartola || '')
        );

        // Calcular totais
        const totais = totaisIntegrados || dadosSaldo?.totais || {
            totalParticipantes: totalParticipantesBase,
            quantidadeCredores: 0,
            quantidadeDevedores: 0,
            quantidadeQuitados: totalParticipantesBase,
            totalAReceber: 0,
            totalAPagar: 0,
        };

        // ✅ v8.8.1: Log para debug do seletor de temporada
        const mostrarTab2025 = (window.ligaPrimeiraTemporada || 2025) < 2026;
        console.log(`[FLUXO-UI] 📅 Renderizando tabs: ligaPrimeiraTemporada=${window.ligaPrimeiraTemporada}, mostrar2025=${mostrarTab2025}`);

        // Layout Dashboard com Cards de Resumo + Tabela Expandida
        container.innerHTML = `
            <div class="module-toolbar">
                <div class="toolbar-left">
                    <h2 class="module-title">
                        <span class="material-icons">account_balance_wallet</span>
                        Financeiro
                    </h2>
                    <!-- ✅ v8.8.1: Seletor de Temporada - oculta 2025 se liga foi criada em 2026 -->
                    <div id="temporada-tabs-fluxo" class="temporada-tabs-inline">
                        <button class="tab-btn-inline ${(window.temporadaAtual || 2026) === 2026 ? 'active' : ''}"
                                data-temporada="2026"
                                onclick="window.mudarTemporada(2026)">
                            2026
                        </button>
                        ${mostrarTab2025 ? `
                        <button class="tab-btn-inline ${(window.temporadaAtual || 2026) === 2025 ? 'active' : ''}"
                                data-temporada="2025"
                                onclick="window.mudarTemporada(2025)">
                            2025
                        </button>
                        ` : ''}
                    </div>
                    <div class="toolbar-stats">
                        <span class="stat-badge">
                            <span class="material-icons">people</span>
                            <span class="participantes-count">${totalParticipantesBase}</span>
                        </span>
                    </div>
                </div>
                <div class="toolbar-right">
                    <div class="search-inline">
                        <span class="material-icons">search</span>
                        <input type="text" id="searchParticipante" placeholder="Buscar..."
                               onkeyup="window.filtrarParticipantesTabela(this.value)">
                    </div>
                    <select id="filtroSituacao" onchange="window.filtrarPorDropdown(this.value)" class="toolbar-select">
                        <option value="">Todos</option>
                        <option value="devedor">Devedores</option>
                        <option value="credor">Credores</option>
                        <option value="quitado">Quitados</option>
                    </select>
                    <button onclick="window.gerarRelatorioFinanceiro()" class="toolbar-btn btn-primary" title="Gerar Relatório">
                        <span class="material-icons">assessment</span>
                        <span class="btn-text">Relatório</span>
                    </button>
                    <div class="toolbar-separator"></div>
                    <button id="btnConfig2026" onclick="window.abrirConfigRenovacao && window.abrirConfigRenovacao()" class="toolbar-btn btn-outline-warning" title="Configurar Renovação 2026">
                        <span class="material-icons">settings</span>
                        <span class="btn-text">2026</span>
                    </button>
                    <button id="btnNovoParticipante2026" onclick="window.abrirNovoParticipante && window.abrirNovoParticipante()" class="toolbar-btn btn-outline-info" title="Adicionar Participante 2026">
                        <span class="material-icons">person_add</span>
                    </button>
                    <button onclick="window.recarregarFluxoFinanceiro()" class="toolbar-btn" title="Atualizar">
                        <span class="material-icons">sync</span>
                    </button>
                </div>
            </div>

            <!-- Cards de Resumo Financeiro (Clicáveis) -->
            <!-- A Receber = Devedores (participantes com saldo negativo, devem à liga) -->
            <!-- A Pagar = Credores (participantes com saldo positivo, liga deve a eles) -->
            <div class="fluxo-resumo-cards">
                <div class="resumo-card card-areceber clickable" data-filter="devedor" onclick="window.filtrarPorCard('devedor')" title="Clique para ver devedores">
                    <div class="resumo-icon"><span class="material-icons">trending_up</span></div>
                    <div class="resumo-info">
                        <span class="resumo-valor">${formatarMoedaBR(totais.totalAReceber)}</span>
                        <span class="resumo-label">A Receber</span>
                    </div>
                    <span class="resumo-badge">${totais.quantidadeDevedores}</span>
                </div>
                <div class="resumo-card card-apagar clickable" data-filter="credor" onclick="window.filtrarPorCard('credor')" title="Clique para ver credores">
                    <div class="resumo-icon"><span class="material-icons">trending_down</span></div>
                    <div class="resumo-info">
                        <span class="resumo-valor">${formatarMoedaBR(totais.totalAPagar)}</span>
                        <span class="resumo-label">A Pagar</span>
                    </div>
                    <span class="resumo-badge">${totais.quantidadeCredores}</span>
                </div>
                <div class="resumo-card card-quitados clickable" data-filter="quitado" onclick="window.filtrarPorCard('quitado')" title="Clique para ver quitados">
                    <div class="resumo-icon"><span class="material-icons">check_circle</span></div>
                    <div class="resumo-info">
                        <span class="resumo-valor">${totais.quantidadeQuitados}</span>
                        <span class="resumo-label">Quitados</span>
                    </div>
                    <span class="resumo-badge">${totais.quantidadeQuitados}</span>
                </div>
            </div>

            <!-- Tabela Financeira v4.1 - Layout Condicional por Temporada + Sticky Header -->
            <div class="fluxo-tabela-container" style="max-height: calc(100vh - 300px); overflow-y: auto; overflow-x: auto; position: relative;">
                <table class="fluxo-participantes-tabela tabela-financeira" style="border-collapse: separate; border-spacing: 0;">
                    <thead style="position: sticky; top: 0; z-index: 100;">
                        ${temporadaNum >= 2026 ? `
                        <!-- Header Pré-Temporada 2026: Colunas simplificadas de inscrição -->
                        <tr>
                            <th class="col-num">#</th>
                            <th class="col-participante sortable" onclick="window.ordenarTabelaFinanceiro('nome')" data-sort="nome">
                                <span class="th-sort">Participante <span class="material-icons sort-icon">unfold_more</span></span>
                            </th>
                            <th class="col-time-coracao" title="Time do Coração">
                                <span class="material-icons" style="font-size: 16px;">favorite</span>
                            </th>
                            <th class="col-modulo" title="Crédito transferido de ${temporadaNum - 1}">Saldo ${temporadaNum - 1}</th>
                            <th class="col-modulo" title="Taxa de inscrição ${temporadaNum}">Taxa ${temporadaNum}</th>
                            <th class="col-modulo" title="Status da inscrição">Status</th>
                            <th class="col-saldo sortable" onclick="window.ordenarTabelaFinanceiro('saldo')" data-sort="saldo">
                                <span class="th-sort">Saldo Final <span class="material-icons sort-icon">unfold_more</span></span>
                            </th>
                            <th class="col-acoes">Ações</th>
                        </tr>
                        ` : `
                        <!-- Header Histórico 2025: Colunas de módulos -->
                        <tr>
                            <th class="col-num">#</th>
                            <th class="col-participante sortable" onclick="window.ordenarTabelaFinanceiro('nome')" data-sort="nome">
                                <span class="th-sort">Participante <span class="material-icons sort-icon">unfold_more</span></span>
                            </th>
                            <th class="col-time-coracao" title="Time do Coração">
                                <span class="material-icons" style="font-size: 16px;">favorite</span>
                            </th>
                            ${this._modulosAtivos?.banco !== false ? '<th class="col-modulo">Timeline</th>' : ''}
                            ${this._modulosAtivos?.pontosCorridos ? '<th class="col-modulo">P.Corridos</th>' : ''}
                            ${this._modulosAtivos?.mataMata ? '<th class="col-modulo">Mata-Mata</th>' : ''}
                            ${this._modulosAtivos?.top10 ? '<th class="col-modulo">Top 10</th>' : ''}
                            ${this._modulosAtivos?.melhorMes ? '<th class="col-modulo">Melhor Mês</th>' : ''}
                            ${this._modulosAtivos?.artilheiro ? '<th class="col-modulo">Artilheiro</th>' : ''}
                            ${this._modulosAtivos?.luvaOuro ? '<th class="col-modulo">Luva Ouro</th>' : ''}
                            <th class="col-modulo">Aj. Manuais</th>
                            <th class="col-modulo">Acertos</th>
                            <th class="col-saldo sortable" onclick="window.ordenarTabelaFinanceiro('saldo')" data-sort="saldo">
                                <span class="th-sort">Saldo <span class="material-icons sort-icon">unfold_more</span></span>
                            </th>
                            <th class="col-2026" title="Status Renovação 2026">2026</th>
                            <th class="col-acoes">Ações</th>
                        </tr>
                        `}
                    </thead>
                    <tbody id="participantesTableBody">
                        ${participantesOrdenados.length > 0
                            ? participantesOrdenados.map((p, idx) =>
                                temporadaNum >= 2026
                                    ? this._renderizarLinhaTabela2026(p, idx, ligaId, temporadaNum)
                                    : this._renderizarLinhaTabela(p, idx, ligaId)
                            ).join('')
                            : `<tr class="linha-vazia">
                                <td colspan="15" style="text-align: center; padding: 40px; color: var(--texto-secundario);">
                                    <span class="material-icons" style="font-size: 48px; color: var(--laranja); opacity: 0.5;">group_off</span>
                                    <p style="margin-top: 16px; font-size: 14px;">
                                        ${(window.temporadaAtual || 2026) >= 2026
                                            ? 'Nenhum participante renovado para ' + (window.temporadaAtual || 2026) + '.<br><small>Acesse a tela de Renovação para adicionar participantes.</small>'
                                            : 'Nenhum participante encontrado.'}
                                    </p>
                                </td>
                            </tr>`
                        }
                    </tbody>
                </table>
            </div>
        `;

        window.totalParticipantes = totalParticipantesBase;
        window.participantesFluxo = participantesIntegrados;

        // Injetar estilos (v8.4: importados de fluxo-financeiro-styles.js)
        injetarEstilosWrapper();
        injetarEstilosTabelaCompacta();
        injetarEstilosTabelaExpandida();
        this._injetarModalAcerto();

        // ✅ v5.1: Forçar CSS sticky nativo (sem workaround de clone)
        this._aplicarStickyHeader();
    }

    /**
     * v9.0: Header fixo via position: fixed no viewport
     *
     * Problema das versoes anteriores:
     * - CSS sticky nao funciona com transform em ancestrais (mesmo apos animacao)
     * - Clone de <thead> com position: absolute tem comportamento inconsistente
     *
     * Solucao v9.0:
     * - Criar wrapper <div> com position: fixed no viewport
     * - Dentro, criar <table> completa com apenas o <thead> clonado
     * - Posicionar no topo do container visivel
     * - Mostrar apenas quando usuario scrolla para baixo
     */
    _aplicarStickyHeader() {
        setTimeout(() => {
            const container = document.querySelector('.fluxo-tabela-container');
            const tabela = container?.querySelector('.fluxo-participantes-tabela, .tabela-financeira');
            const thead = tabela?.querySelector('thead');

            if (!container || !tabela || !thead) {
                console.log('[FluxoFinanceiroUI] Elementos nao encontrados para sticky header');
                return;
            }

            // Remover clone anterior se existir
            document.querySelector('.sticky-header-clone')?.remove();

            // Calcular altura do container
            const rect = container.getBoundingClientRect();
            const alturaDisponivel = window.innerHeight - rect.top - 40;
            const altura = Math.max(300, Math.min(alturaDisponivel, window.innerHeight * 0.7));

            // Configurar container com scroll interno
            container.style.cssText = `
                max-height: ${altura}px;
                overflow-y: auto;
                overflow-x: auto;
                position: relative;
            `;

            // Criar wrapper fixo no viewport
            const wrapper = document.createElement('div');
            wrapper.className = 'sticky-header-clone';
            wrapper.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                display: none;
                overflow: hidden;
                pointer-events: none;
            `;

            // Criar tabela clone (estrutura completa para renderizacao correta)
            const cloneTable = document.createElement('table');
            cloneTable.className = tabela.className;
            cloneTable.style.cssText = `
                margin: 0;
                width: ${tabela.offsetWidth}px;
                table-layout: fixed;
                border-collapse: separate;
                border-spacing: 0;
                background: #1a1a1a;
                box-shadow: 0 2px 8px rgba(0,0,0,0.8);
                pointer-events: auto;
            `;

            // Clonar thead
            const cloneThead = thead.cloneNode(true);
            cloneTable.appendChild(cloneThead);

            // Copiar larguras exatas das colunas
            const thsOriginal = thead.querySelectorAll('th');
            const thsClone = cloneThead.querySelectorAll('th');
            thsOriginal.forEach((th, i) => {
                if (thsClone[i]) {
                    const width = th.getBoundingClientRect().width;
                    thsClone[i].style.width = `${width}px`;
                    thsClone[i].style.minWidth = `${width}px`;
                    thsClone[i].style.maxWidth = `${width}px`;
                    thsClone[i].style.background = '#1a1a1a';
                    thsClone[i].style.borderBottom = '2px solid #FF5500';
                    thsClone[i].style.boxSizing = 'border-box';
                }
            });

            wrapper.appendChild(cloneTable);
            document.body.appendChild(wrapper);

            // Funcao para atualizar posicao do header clone
            const atualizarPosicao = () => {
                const containerRect = container.getBoundingClientRect();
                const scrollTop = container.scrollTop;
                const scrollLeft = container.scrollLeft;

                // Mostrar clone apenas quando thead original sair da view
                if (scrollTop > 5 && containerRect.top < window.innerHeight && containerRect.bottom > 0) {
                    wrapper.style.display = 'block';
                    wrapper.style.top = `${Math.max(0, containerRect.top)}px`;
                    wrapper.style.left = `${containerRect.left}px`;
                    wrapper.style.width = `${containerRect.width}px`;
                    cloneTable.style.transform = `translateX(-${scrollLeft}px)`;
                } else {
                    wrapper.style.display = 'none';
                }
            };

            // Listeners
            container.removeEventListener('scroll', this._scrollHandler);
            window.removeEventListener('scroll', this._windowScrollHandler);
            window.removeEventListener('resize', this._resizeHandler);

            this._scrollHandler = atualizarPosicao;
            this._windowScrollHandler = atualizarPosicao;
            this._resizeHandler = () => {
                // Recalcular larguras no resize
                const thsOrig = thead.querySelectorAll('th');
                const thsCloneNew = cloneThead.querySelectorAll('th');
                thsOrig.forEach((th, i) => {
                    if (thsCloneNew[i]) {
                        const width = th.getBoundingClientRect().width;
                        thsCloneNew[i].style.width = `${width}px`;
                        thsCloneNew[i].style.minWidth = `${width}px`;
                        thsCloneNew[i].style.maxWidth = `${width}px`;
                    }
                });
                cloneTable.style.width = `${tabela.offsetWidth}px`;
                atualizarPosicao();
            };

            container.addEventListener('scroll', this._scrollHandler);
            window.addEventListener('scroll', this._windowScrollHandler, { passive: true });
            window.addEventListener('resize', this._resizeHandler, { passive: true });

            console.log(`[FluxoFinanceiroUI] Sticky header v9.0 (fixed) - altura container: ${altura}px`);
        }, 200);
    }

    /**
     * Renderiza uma linha da tabela financeira
     * v3.1: Valores monetários + Layout expandido
     */
    _renderizarLinhaTabela(p, idx, ligaId) {
        const timeId = p.time_id || p.id;
        const saldoFinal = typeof p.saldoFinalIntegrado === 'number'
            ? p.saldoFinalIntegrado
            : (p.saldoFinal || 0);
        const situacao = p.situacaoIntegrada || p.situacao || 'quitado';
        const breakdown = this._ajustarBreakdownPorIntegracoes(p.breakdown || {});

        const classeSaldo = saldoFinal > 0 ? 'val-positivo' : saldoFinal < 0 ? 'val-negativo' : '';

        // Verificar se é novato (ID negativo = cadastro manual OU origem = novo_cadastro/cadastro_manual)
        const isNovato = timeId < 0 || p.origem === 'novo_cadastro' || p.origem === 'cadastro_manual' || p.novato === true;
        const badgeNovato = isNovato ? '<span class="badge-novato" title="Novo na liga">NOVATO</span>' : '';

        // ✅ v2.13: Verificar se temporada foi quitada (extrato fechado)
        const isQuitado = p.quitacao?.quitado === true;
        const badgeQuitado = isQuitado
            ? `<span class="badge-quitado" title="Temporada ${p.quitacao?.data_quitacao ? new Date(p.quitacao.data_quitacao).toLocaleDateString('pt-BR') : ''}: ${p.quitacao?.tipo || ''} por ${p.quitacao?.admin_responsavel || 'admin'}">QUITADO</span>`
            : '';

        // Time do coração - usar escudos locais
        const timeCoracaoId = p.time_coracao || p.clube_id;
        const escudoTimeCoracao = timeCoracaoId
            ? `<img src="/escudos/${timeCoracaoId}.png"
                   alt="" class="escudo-coracao"
                   onerror="this.src='/escudos/default.png'"
                   title="Time do Coração">`
            : '<span class="material-icons" style="font-size: 16px; color: #666;">favorite_border</span>';

        // Função helper para formatar valor monetário
        const fmtModulo = (val) => {
            if (!val || Math.abs(val) < 0.01) return '<span class="val-zero">-</span>';
            const cls = val > 0 ? 'val-positivo' : 'val-negativo';
            const sinal = val > 0 ? '+' : '';
            const formatted = Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `<span class="${cls}">${sinal}R$ ${formatted}</span>`;
        };

        // Colunas de módulos baseadas nos módulos ativos
        let modulosCols = '';
        if (this._modulosAtivos?.banco !== false) modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.banco)}</td>`;
        if (this._modulosAtivos?.pontosCorridos) modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.pontosCorridos)}</td>`;
        if (this._modulosAtivos?.mataMata) modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.mataMata)}</td>`;
        if (this._modulosAtivos?.top10) modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.top10)}</td>`;
        if (this._modulosAtivos?.melhorMes) modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.melhorMes)}</td>`;
        if (this._modulosAtivos?.artilheiro) modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.artilheiro)}</td>`;
        if (this._modulosAtivos?.luvaOuro) modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.luvaOuro)}</td>`;
        modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.campos)}</td>`;
        modulosCols += `<td class="col-modulo">${fmtModulo(breakdown.acertos)}</td>`;

        // Formatar saldo final
        const saldoFormatado = Math.abs(saldoFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const saldoSinal = saldoFinal > 0 ? '+' : saldoFinal < 0 ? '-' : '';

        return `
            <tr class="linha-participante ${situacao === 'devedor' ? 'row-devedor' : ''} ${isNovato ? 'row-novato' : ''}"
                data-nome="${(p.nome_cartola || '').toLowerCase()}"
                data-time="${(p.nome_time || '').toLowerCase()}"
                data-time-id="${timeId}"
                data-situacao="${situacao}"
                data-novato="${isNovato}">
                <td class="col-num">${idx + 1}</td>
                <td class="col-participante">
                    <div class="participante-cell" onclick="window.selecionarParticipante('${timeId}')">
                        <div class="avatar-mini">
                            ${p.url_escudo_png
                                ? `<img src="${p.url_escudo_png}" alt="" onerror="this.style.display='none'">`
                                : `<span class="material-icons">person</span>`
                            }
                        </div>
                        <div class="info-participante">
                            <span class="nome">${p.nome_cartola || 'N/D'} ${badgeNovato}</span>
                            <span class="time">${p.nome_time || '-'}</span>
                        </div>
                    </div>
                </td>
                <td class="col-time-coracao">${escudoTimeCoracao}</td>
                ${modulosCols}
                <td class="col-saldo ${isQuitado ? 'quitado' : classeSaldo}">
                    ${isQuitado
                        ? `<strong>R$ 0,00</strong> ${badgeQuitado}`
                        : `<strong>${saldoSinal}R$ ${saldoFormatado}</strong>`
                    }
                </td>
                <td class="col-2026">
                    ${this._renderizarBadge2026(timeId, p)}
                </td>
                <td class="col-acoes">
                    <div class="acoes-row">
                        <button onclick="window.selecionarParticipante('${timeId}')"
                                class="btn-acao btn-extrato" title="Ver Extrato">
                            <span class="material-icons">receipt_long</span>
                        </button>
                        <button onclick="window.abrirAuditoriaFinanceira('${timeId}', '${ligaId}', '${(p.nome_cartola || '').replace(/'/g, "\\'")}')"
                                class="btn-acao btn-auditoria" title="Auditoria Financeira">
                            <span class="material-icons">fact_check</span>
                        </button>
                        ${(() => {
                            // v2.14: Botao de quitar removido para temporada 2025+ (coberta pelo modal unificado de renovacao)
                            // Quitacao de 2025 e feita automaticamente no modal de decisao ao renovar para 2026
                            // Manter botao apenas para temporadas retroativas antigas (2024, etc)
                            const tempAtual = window.temporadaAtual || 2026;
                            const tempRenovacao = window.temporadaRenovacao || 2026;
                            const isTemporadaRenovacao = tempAtual >= (tempRenovacao - 1);
                            const mostrarBotaoQuitar = !isQuitado && Math.abs(saldoFinal) >= 0.01 && !isTemporadaRenovacao;
                            return mostrarBotaoQuitar ? `
                            <button onclick="window.abrirModalQuitacao('${ligaId}', '${timeId}', ${saldoFinal}, ${tempAtual}, '${(p.nome_cartola || '').replace(/'/g, "\\'")}')"
                                    class="btn-acao btn-quitar" title="Quitar ${tempAtual}">
                                <span class="material-icons">lock</span>
                            </button>
                            ` : '';
                        })()}
                        ${p.contato ? `
                        <button onclick="window.abrirWhatsApp('${p.contato.replace(/'/g, "\\'")}', '${(p.nome_cartola || '').replace(/'/g, "\\'")}')"
                                class="btn-acao btn-whatsapp" title="Enviar WhatsApp para ${p.nome_cartola || 'participante'}">
                            <span class="material-icons">chat</span>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Renderiza uma linha da tabela para pré-temporada 2026+
     * v4.0: Layout simplificado com dados de inscrição
     * Colunas: #, Participante, Escudo, Saldo Anterior, Taxa, Status, Saldo Final, Ações
     */
    _renderizarLinhaTabela2026(p, idx, ligaId, temporadaNum) {
        const timeId = p.time_id || p.id;

        // Buscar dados de inscrição do cache
        const inscricao = window.fluxoFinanceiroCache?.inscricoes2026?.get(String(timeId)) || {};

        // Dados financeiros de inscrição (com fallback seguro)
        const saldoAnterior = (typeof inscricao.saldo_transferido === 'number')
            ? inscricao.saldo_transferido
            : (typeof p.saldo_transferido === 'number' ? p.saldo_transferido : 0);
        const taxaInscricao = (typeof inscricao.taxa_inscricao === 'number')
            ? inscricao.taxa_inscricao
            : (typeof p.taxa_inscricao === 'number' ? p.taxa_inscricao : 180);
        const saldoInicial = (typeof inscricao.saldo_inicial_temporada === 'number')
            ? inscricao.saldo_inicial_temporada
            : null;
        const pagouFlag = inscricao.pagou_inscricao === true || p.pagou_inscricao === true;
        // ✅ v2.2.1: Se saldo_inicial_temporada não desconta a taxa, considerar pago
        const saldoIndicouPago = saldoInicial !== null && taxaInscricao > 0 && Math.abs(saldoInicial - saldoAnterior) < 0.01;
        const pagouDiretamente = pagouFlag || saldoIndicouPago;
        // ✅ v2.2 FIX: legado_manual.tipo_quitacao='zerado' é sobre SALDO 2025, não inscrição 2026
        const saldoCobriuTaxa = saldoAnterior >= taxaInscricao && taxaInscricao > 0;
        // ✅ v2.2.1: Se a API já trouxe saldo final, usar como fallback para quitar status
        const saldoFinalApi = (typeof p.saldoFinal === 'number') ? p.saldoFinal : null;
        const quitadoPorSaldoFinal = saldoFinalApi !== null && saldoFinalApi >= -0.01;
        const inscricaoQuitada = pagouDiretamente || saldoCobriuTaxa || quitadoPorSaldoFinal;

        // Calcular saldo final
        let saldoFinal = saldoFinalApi !== null ? saldoFinalApi : saldoInicial;
        if (saldoFinal === undefined || saldoFinal === null) {
            // Calcular: saldo anterior - taxa (se não pagou diretamente)
            saldoFinal = pagouDiretamente ? saldoAnterior : (saldoAnterior - taxaInscricao);
        }
        const deltaIntegracoes = typeof p.deltaIntegracoesExtrato === 'number'
            ? p.deltaIntegracoesExtrato
            : 0;
        const saldoFinalIntegrado = saldoFinal + deltaIntegracoes;

        // Status visual - v7.1: Simplificado (PAGO ou DEVE)
        // PAGO = pagou diretamente OU crédito cobriu a taxa OU saldo final já quitado na API
        // DEVE = não pagou e crédito não cobriu
        let statusText, statusClass;
        if (inscricaoQuitada) {
            statusText = 'Pago';
            statusClass = 'status-pago';
        } else {
            statusText = 'Deve';
            statusClass = 'status-deve';
        }

        // Time do coração
        const timeCoracaoId = p.time_coracao || p.clube_id;
        const escudoTimeCoracao = timeCoracaoId
            ? `<img src="/escudos/${timeCoracaoId}.png"
                   alt="" class="escudo-coracao"
                   onerror="this.src='/escudos/default.png'"
                   title="Time do Coração">`
            : '<span class="material-icons" style="font-size: 16px; color: #666;">favorite_border</span>';

        // Formatação de valores
        const fmtValor = (val) => {
            if (Math.abs(val) < 0.01) return '<span class="val-zero">R$ 0,00</span>';
            const cls = val > 0 ? 'val-positivo' : 'val-negativo';
            const sinal = val > 0 ? '+' : '';
            const formatted = Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `<span class="${cls}">${sinal}R$ ${formatted}</span>`;
        };

        // Classe da linha baseada no saldo
        const classeLinha = saldoFinalIntegrado > 0 ? '' : saldoFinalIntegrado < 0 ? 'row-devedor' : '';

        return `
            <tr class="linha-participante ${classeLinha}"
                data-nome="${(p.nome_cartola || '').toLowerCase()}"
                data-time="${(p.nome_time || '').toLowerCase()}"
                data-time-id="${timeId}"
                data-situacao="${statusClass}">
                <td class="col-num">${idx + 1}</td>
                <td class="col-participante">
                    <div class="participante-cell" onclick="window.selecionarParticipante('${timeId}')">
                        <div class="avatar-mini">
                            ${p.url_escudo_png
                                ? `<img src="${p.url_escudo_png}" alt="" onerror="this.style.display='none'">`
                                : `<span class="material-icons">person</span>`
                            }
                        </div>
                        <div class="info-participante">
                            <span class="nome">${p.nome_cartola || 'N/D'}</span>
                            <span class="time">${p.nome_time || '-'}</span>
                        </div>
                    </div>
                </td>
                <td class="col-time-coracao">${escudoTimeCoracao}</td>
                <td class="col-modulo">${fmtValor(saldoAnterior)}</td>
                <td class="col-modulo">
                    <span class="val-negativo">-R$ ${taxaInscricao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </td>
                <td class="col-modulo">
                    <span class="badge-status ${statusClass}">${statusText}</span>
                </td>
                <td class="col-saldo ${saldoFinalIntegrado > 0 ? 'val-positivo' : saldoFinalIntegrado < 0 ? 'val-negativo' : ''}">
                    <strong>${fmtValor(saldoFinalIntegrado)}</strong>
                </td>
                <td class="col-acoes">
                    <div class="acoes-row">
                        <button onclick="window.selecionarParticipante('${timeId}')"
                                class="btn-acao btn-extrato" title="Ver Extrato ${temporadaNum}">
                            <span class="material-icons">receipt_long</span>
                        </button>
                        <button onclick="window.abrirModalAcertoFinanceiro && window.abrirModalAcertoFinanceiro('${ligaId}', '${timeId}', '${(p.nome_cartola || '').replace(/'/g, "\\'")}', ${temporadaNum})"
                                class="btn-acao btn-acerto" title="Registrar Acerto">
                            <span class="material-icons">payments</span>
                        </button>
                        <button onclick="window.abrirAuditoriaFinanceira('${timeId}', '${ligaId}', '${(p.nome_cartola || '').replace(/'/g, "\\'")}')"
                                class="btn-acao btn-auditoria" title="Auditoria Financeira">
                            <span class="material-icons">fact_check</span>
                        </button>
                        ${p.contato ? `
                        <button onclick="window.abrirWhatsApp('${p.contato.replace(/'/g, "\\'")}', '${(p.nome_cartola || '').replace(/'/g, "\\'")}')"
                                class="btn-acao btn-whatsapp" title="Enviar WhatsApp para ${p.nome_cartola || 'participante'}">
                            <span class="material-icons">chat</span>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Renderiza o badge de status 2026 com base nos dados de inscrição
     * @param {string} timeId
     * @param {object} p - dados do participante
     */
    _renderizarBadge2026(timeId, p) {
        // Obter status da inscrição via função global exposta pelo cache
        const status = window.getStatusInscricao2026
            ? window.getStatusInscricao2026(timeId)
            : { status: 'pendente', badgeClass: 'badge-2026-pendente', badgeIcon: 'schedule', badgeText: 'Pendente' };

        // Tooltip dinâmico - usa inscricaoQuitada (considera pagamento direto OU abatimento de saldo)
        let tooltip = 'Clique para gerenciar renovação';
        if (status.status === 'renovado') {
            tooltip = status.inscricaoQuitada ? 'Renovado - Inscrição quitada' : 'Renovado - Deve inscrição';
        } else if (status.status === 'novo') {
            tooltip = status.inscricaoQuitada ? 'Novo participante - Inscrição quitada' : 'Novo participante - Deve inscrição';
        } else if (status.status === 'nao_participa') {
            tooltip = 'Não participa em 2026';
        }

        // Ícone de alerta para quem deve inscrição (usa inscricaoQuitada, não pagouInscricao)
        const alertaDevendo = (status.status === 'renovado' || status.status === 'novo') && status.inscricaoQuitada === false
            ? '<span class="material-icons" style="font-size: 12px; color: #ffc107; vertical-align: middle; margin-left: 2px;" title="Deve inscrição">warning</span>'
            : '';

        return `
            <span class="renovacao-badge ${status.badgeClass}"
                  data-time-id="${timeId}"
                  data-status="${status.status}"
                  onclick="window.abrirAcaoRenovacao && window.abrirAcaoRenovacao(${timeId}, '${(p.nome_time || '').replace(/'/g, "\\'")}', '${(p.nome_cartola || '').replace(/'/g, "\\'")}', '${p.url_escudo_png || ''}')"
                  style="cursor: pointer;"
                  title="${tooltip}">
                <span class="material-icons" style="font-size: 14px; vertical-align: middle;">${status.badgeIcon}</span>
                ${status.badgeText}${alertaDevendo}
            </span>
        `;
    }

    /**
     * Formata valor monetário compacto
     */
    _formatarValor(valor) {
        if (Math.abs(valor) < 0.01) return '-';
        const sinal = valor > 0 ? '+' : '';
        return `${sinal}${valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }

    /**
     * Formata saldo de forma compacta
     */
    _formatarSaldoCompacto(valor) {
        if (Math.abs(valor) < 0.01) return '<span class="saldo-zero">R$ 0</span>';
        const sinal = valor > 0 ? '+' : '';
        return `${sinal}${formatarMoedaBR(Math.abs(valor))}`;
    }



    /**
     * Injetar modal de acerto financeiro
     */
    _injetarModalAcerto() {
        if (document.getElementById("modal-acerto-fluxo")) return;

        const modalHtml = `
            <div class="modal-overlay-fluxo" id="modal-acerto-fluxo">
                <div class="modal-content-fluxo">
                    <div class="modal-header-fluxo">
                        <h3>
                            <span class="material-icons" style="color: #10b981;">payments</span>
                            Registrar Acerto
                        </h3>
                        <button class="modal-close-fluxo" onclick="window.fecharModalAcerto()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="modal-body-fluxo">
                        <div class="modal-participante-info-fluxo">
                            <div class="info">
                                <h4 id="acertoNomeParticipante">-</h4>
                                <span id="acertoSaldoAtual">Saldo: R$ 0,00</span>
                            </div>
                        </div>

                        <div class="form-group-fluxo">
                            <label>Tipo de Acerto</label>
                            <div class="tipo-acerto-btns">
                                <button type="button" class="tipo-btn pagamento active" onclick="window.selecionarTipoAcerto('pagamento')">
                                    <span class="material-icons">arrow_downward</span>
                                    Pagamento
                                </button>
                                <button type="button" class="tipo-btn recebimento" onclick="window.selecionarTipoAcerto('recebimento')">
                                    <span class="material-icons">arrow_upward</span>
                                    Recebimento
                                </button>
                            </div>
                        </div>

                        <button type="button" class="btn-zerar-saldo-fluxo" id="btnZerarSaldoFluxo" onclick="window.zerarSaldoFluxo()" style="display: none;">
                            <span class="material-icons">balance</span>
                            Preencher valor para zerar saldo
                        </button>

                        <div class="form-group-fluxo">
                            <label>Valor (R$)</label>
                            <input type="number" id="acertoValor" step="0.01" min="0.01" placeholder="0,00">
                        </div>

                        <div class="form-group-fluxo">
                            <label>Método</label>
                            <select id="acertoMetodo">
                                <option value="pix">PIX</option>
                                <option value="transferencia">Transferência</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>

                        <div class="form-group-fluxo">
                            <label>Descrição</label>
                            <input type="text" id="acertoDescricao" placeholder="Ex: Acerto mensalidade">
                        </div>
                    </div>
                    <div class="modal-footer-fluxo">
                        <button class="btn-cancelar-fluxo" onclick="window.fecharModalAcerto()">Cancelar</button>
                        <button class="btn-confirmar-fluxo" onclick="window.confirmarAcertoFluxo()">
                            <span class="material-icons">check</span>
                            Registrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        injetarEstilosModal(); // v8.4: importado de fluxo-financeiro-styles.js
        this._registrarFuncoesGlobaisAcerto();
    }


    /**
     * Registrar funções globais para o modal de acerto
     */
    _registrarFuncoesGlobaisAcerto() {
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get("id");

        let timeIdAtual = null;
        let saldoAtual = 0;
        let tipoAcertoAtual = 'pagamento';

        // Abrir modal
        // ✅ v6.4: Auto-seleção inteligente baseada no saldo
        window.abrirModalAcertoFluxo = (timeId, nome, saldo) => {
            timeIdAtual = timeId;
            saldoAtual = saldo;

            document.getElementById('acertoNomeParticipante').textContent = nome;

            const saldoTexto = saldo >= 0
                ? `Credor: +${formatarMoedaBR(saldo)}`
                : `Devedor: -${formatarMoedaBR(Math.abs(saldo))}`;
            document.getElementById('acertoSaldoAtual').textContent = saldoTexto;
            document.getElementById('acertoSaldoAtual').style.color = saldo >= 0 ? '#10b981' : '#ef4444';

            // Mostrar botão zerar se tiver saldo
            const btnZerar = document.getElementById('btnZerarSaldoFluxo');
            btnZerar.style.display = Math.abs(saldo) > 0.01 ? 'flex' : 'none';

            // ✅ v6.4: AUTO-PREENCHER baseado no saldo do participante
            document.getElementById('acertoMetodo').value = 'pix';

            if (Math.abs(saldo) > 0.01) {
                if (saldo < 0) {
                    // DEVEDOR: precisa PAGAR para quitar a dívida
                    window.selecionarTipoAcerto('pagamento');
                    document.getElementById('acertoValor').value = Math.abs(saldo).toFixed(2);
                    document.getElementById('acertoDescricao').value = 'Quitação de dívida';
                } else {
                    // CREDOR: precisa RECEBER o que tem de crédito
                    window.selecionarTipoAcerto('recebimento');
                    document.getElementById('acertoValor').value = saldo.toFixed(2);
                    document.getElementById('acertoDescricao').value = 'Resgate de crédito';
                }
            } else {
                // Saldo zerado: reset padrão
                document.getElementById('acertoValor').value = '';
                document.getElementById('acertoDescricao').value = '';
                window.selecionarTipoAcerto('pagamento');
            }

            document.getElementById('modal-acerto-fluxo').classList.add('active');
        };

        // Fechar modal
        window.fecharModalAcerto = () => {
            document.getElementById('modal-acerto-fluxo').classList.remove('active');
        };

        // Selecionar tipo
        window.selecionarTipoAcerto = (tipo) => {
            tipoAcertoAtual = tipo;
            document.querySelectorAll('.tipo-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.classList.contains(tipo)) {
                    btn.classList.add('active');
                }
            });
        };

        // Zerar saldo
        window.zerarSaldoFluxo = () => {
            if (Math.abs(saldoAtual) < 0.01) return;

            if (saldoAtual < 0) {
                // Devedor: precisa pagar
                window.selecionarTipoAcerto('pagamento');
                document.getElementById('acertoValor').value = Math.abs(saldoAtual).toFixed(2);
                document.getElementById('acertoDescricao').value = 'Quitação de dívida';
            } else {
                // Credor: precisa receber
                window.selecionarTipoAcerto('recebimento');
                document.getElementById('acertoValor').value = saldoAtual.toFixed(2);
                document.getElementById('acertoDescricao').value = 'Resgate de crédito';
            }
        };

        // ✅ Wrapper para compatibilidade com botão "Registrar Acerto" da tabela (linha 1167)
        // O botão chama abrirModalAcertoFinanceiro(ligaId, timeId, nome, temporada)
        // mas a função real é abrirModalAcertoFluxo(timeId, nome, saldo)
        window.abrirModalAcertoFinanceiro = (ligaId, timeId, nome, temporada) => {
            // Buscar saldo do participante na lista em memória
            const participantes = window.participantesFluxo || [];
            const participante = participantes.find(p =>
                String(p.time_id) === String(timeId) || String(p.id) === String(timeId)
            );
            const saldo = typeof participante?.saldoFinalIntegrado === 'number'
                ? participante.saldoFinalIntegrado
                : (participante?.saldoFinal || 0);

            // Chamar função real com os parâmetros corretos
            window.abrirModalAcertoFluxo(timeId, nome, saldo);
        };

        // Confirmar acerto
        window.confirmarAcertoFluxo = async () => {
            const valor = parseFloat(document.getElementById('acertoValor').value);
            const descricao = document.getElementById('acertoDescricao').value;
            const metodo = document.getElementById('acertoMetodo').value;

            if (!valor || isNaN(valor) || valor <= 0) {
                alert('Informe um valor válido');
                return;
            }

            try {
                const response = await fetch('/api/tesouraria/acerto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ligaId,
                        timeId: timeIdAtual,
                        tipo: tipoAcertoAtual,
                        valor,
                        descricao: descricao || `Acerto via Fluxo Financeiro - ${tipoAcertoAtual}`,
                        metodoPagamento: metodo,
                        temporada: window.temporadaAtual || 2026, // Temporada dinamica
                    })
                });

                const data = await response.json();

                if (!data.success) throw new Error(data.error);

                window.fecharModalAcerto();

                let msg = data.message;
                if (data.troco) {
                    msg += `\n\n${data.troco.mensagem}`;
                }
                // ✅ v6.2: Mostrar mensagem de auto-quitação
                if (data.autoQuitacao?.ativada) {
                    msg += `\n\n${data.autoQuitacao.mensagem}`;
                }
                alert(msg);

                // ✅ v6.1 FIX: INVALIDAR CACHE DO EXTRATO APÓS O ACERTO
                console.log(`[FLUXO-UI] 🔄 Invalidando cache de extrato para time ${timeIdAtual} após acerto.`);
                if (window.invalidarCacheTime) {
                    await window.invalidarCacheTime(ligaId, timeIdAtual);
                }

                // Recarregar módulo (agora com cache invalidado, forçará recálculo)
                if (window.recarregarFluxoFinanceiro) {
                    window.recarregarFluxoFinanceiro();
                }
            } catch (error) {
                alert('Erro: ' + error.message);
            }
        };

        // ✅ Filtro por situação usa função global (linha ~3865)
        // Removido: definição duplicada que sobrescrevia a correta

        // ✅ Estado de ordenação
        window._sortState = { coluna: 'nome', direcao: 'asc' };
        window._fluxoUI = this;
        window._fluxoLigaId = ligaId;

        // Ordenar tabela financeira
        window.ordenarTabelaFinanceiro = (coluna) => {
            const state = window._sortState;

            // Se clicou na mesma coluna, inverte direção
            if (state.coluna === coluna) {
                state.direcao = state.direcao === 'asc' ? 'desc' : 'asc';
            } else {
                state.coluna = coluna;
                state.direcao = 'asc';
            }

            // Ordenar participantes
            const participantes = window.participantesFluxo || [];
            const ordenados = [...participantes].sort((a, b) => {
                let valorA, valorB;

                switch (coluna) {
                    case 'nome':
                        valorA = (a.nome_cartola || '').toLowerCase();
                        valorB = (b.nome_cartola || '').toLowerCase();
                        return state.direcao === 'asc'
                            ? valorA.localeCompare(valorB)
                            : valorB.localeCompare(valorA);

                    case 'temporada':
                        valorA = typeof a.saldoTemporadaIntegrado === 'number'
                            ? a.saldoTemporadaIntegrado
                            : (a.saldoTemporada || 0);
                        valorB = typeof b.saldoTemporadaIntegrado === 'number'
                            ? b.saldoTemporadaIntegrado
                            : (b.saldoTemporada || 0);
                        break;

                    case 'acertos':
                        valorA = a.saldoAcertos || 0;
                        valorB = b.saldoAcertos || 0;
                        break;

                    case 'saldo':
                        valorA = typeof a.saldoFinalIntegrado === 'number'
                            ? a.saldoFinalIntegrado
                            : (a.saldoFinal || 0);
                        valorB = typeof b.saldoFinalIntegrado === 'number'
                            ? b.saldoFinalIntegrado
                            : (b.saldoFinal || 0);
                        break;

                    case 'situacao':
                        const ordem = { devedor: 1, credor: 2, quitado: 3 };
                        valorA = ordem[a.situacaoIntegrada || a.situacao] || 3;
                        valorB = ordem[b.situacaoIntegrada || b.situacao] || 3;
                        break;

                    default:
                        return 0;
                }

                // Ordenação numérica
                if (state.direcao === 'asc') {
                    return valorA - valorB;
                } else {
                    return valorB - valorA;
                }
            });

            // Re-renderizar tbody
            const tbody = document.getElementById('participantesTableBody');
            if (tbody && window._fluxoUI) {
                tbody.innerHTML = ordenados.map((p, idx) =>
                    window._fluxoUI._renderizarLinhaTabela(p, idx, window._fluxoLigaId)
                ).join('');
            }

            // Atualizar ícones dos cabeçalhos
            document.querySelectorAll('.sortable').forEach(th => {
                const icon = th.querySelector('.sort-icon');
                const sortCol = th.dataset.sort;

                if (sortCol === coluna) {
                    th.classList.add('sorted');
                    icon.textContent = state.direcao === 'asc' ? 'arrow_upward' : 'arrow_downward';
                } else {
                    th.classList.remove('sorted');
                    icon.textContent = 'unfold_more';
                }
            });

            // Reaplicar filtro de situação se ativo
            const filtroAtual = document.getElementById('filtroSituacao')?.value;
            if (filtroAtual) {
                window.filtrarPorSituacao(filtroAtual);
            }
        };

        // Histórico de acertos
        // ✅ v5.5 FIX: Passar temporada
        window.abrirHistoricoAcertos = async (timeId, ligaIdParam) => {
            try {
                const temporada = window.temporadaAtual || 2026;
                const response = await fetch(`/api/tesouraria/participante/${ligaIdParam}/${timeId}?temporada=${temporada}`);
                const data = await response.json();

                if (!data.success) throw new Error(data.error);

                const acertos = data.acertos || [];
                if (acertos.length === 0) {
                    alert('Nenhum acerto registrado para este participante.');
                    return;
                }

                let texto = `📋 HISTÓRICO DE ACERTOS\n${data.participante.nomeTime}\n\n`;
                acertos.forEach(a => {
                    const dataFormatada = new Date(a.dataAcerto).toLocaleDateString('pt-BR');
                    // ✅ v1.5 FIX: Mostrar tipo explícito em vez de sinal confuso
                    // PAGAMENTO = participante PAGOU à liga (quitou dívida)
                    // RECEBIMENTO = participante RECEBEU da liga (usou crédito)
                    const tipoTexto = a.tipo === 'pagamento' ? '💰 PAGOU' : '📥 RECEBEU';
                    texto += `${dataFormatada} | ${tipoTexto} R$ ${a.valor.toFixed(2)} | ${a.descricao}\n`;
                });

                alert(texto);
            } catch (error) {
                alert('Erro ao carregar histórico: ' + error.message);
            }
        };

        // Recarregar módulo
        window.recarregarFluxoFinanceiro = () => {
            if (window.fluxoFinanceiroOrquestrador?.recarregar) {
                window.fluxoFinanceiroOrquestrador.recarregar();
            } else {
                // Fallback: reload da página
                location.reload();
            }
        };

        // ✅ v8.1: Mudar temporada SEM reload - recarga dinâmica (com tabs)
        window.mudarTemporada = async (novaTemporada) => {
            const temporadaNum = parseInt(novaTemporada);
            const temporadaAnterior = window.temporadaAtual;

            if (temporadaNum === temporadaAnterior) {
                console.log('[FLUXO-UI] Temporada já selecionada:', temporadaNum);
                return;
            }

            // ✅ v8.1: Atualizar UI das abas imediatamente
            document.querySelectorAll('#temporada-tabs-fluxo .tab-btn-inline').forEach(btn => {
                const btnTemporada = parseInt(btn.dataset.temporada);
                btn.classList.toggle('active', btnTemporada === temporadaNum);
            });

            console.log(`[FLUXO-UI] 🔄 Mudando temporada: ${temporadaAnterior} → ${temporadaNum}`);

            // Mostrar loading visual na tabela
            const container = document.getElementById('fluxo-financeiro-container');
            if (container) {
                container.innerHTML = `
                    <div class="loading-container" style="padding: 60px; text-align: center;">
                        <div class="loading-spinner"></div>
                        <p style="margin-top: 16px; color: #a0a0a0;">Carregando dados de ${temporadaNum}...</p>
                    </div>`;
            }

            // Atualizar variável global ANTES de qualquer operação
            window.temporadaAtual = temporadaNum;

            // Salvar preferência no localStorage
            localStorage.setItem('temporadaSelecionada', temporadaNum);

            try {
                // Limpar cache atual (async)
                if (window.fluxoFinanceiroCache) {
                    await window.fluxoFinanceiroCache.limparCache();
                }

                // Recarregar dados usando o orquestrador (SEM reload da página)
                if (window.fluxoFinanceiroOrquestrador?.recarregar) {
                    console.log('[FLUXO-UI] ✅ Recarregando via orquestrador...');
                    await window.fluxoFinanceiroOrquestrador.recarregar();
                } else if (window.inicializarFluxoFinanceiro) {
                    console.log('[FLUXO-UI] ✅ Recarregando via inicializarFluxoFinanceiro...');
                    await window.inicializarFluxoFinanceiro();
                } else {
                    // Fallback: reload apenas se não houver alternativa
                    console.warn('[FLUXO-UI] ⚠️ Nenhum método de recarga disponível, fazendo reload...');
                    location.reload();
                    return;
                }

                console.log(`[FLUXO-UI] ✅ Temporada ${temporadaNum} carregada com sucesso`);
            } catch (error) {
                console.error('[FLUXO-UI] ❌ Erro ao trocar temporada:', error);
                // Em caso de erro, tentar reload como último recurso
                location.reload();
            }
        };
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
        return `<span class="${classeCor} font-semibold">${sinal}${formatarMoedaBR(Math.abs(valorNum))}</span>`;
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
                <span class="${classeTexto} font-semibold" style="font-size: 10px;">${valor > 0 ? "+" : "-"}${formatarMoedaBR(Math.abs(valor))}</span>
            </div>
        `;
    }

    formatarPosicao(rodada) {
        // ✅ v5.4: Usar config dinâmica em vez de liga ID hardcoded
        // O total de times vem da config da liga ou do cache do extrato
        let totalTimesFase = rodada.totalTimesFase || window.ligaConfig?.totalParticipantes || 32;

        // Se tiver config temporal no cache, usar as fases corretas
        const config = window.ligaConfigCache;
        if (config?.ranking_rodada?.temporal) {
            const rodadaTransicao = config.ranking_rodada.rodada_transicao || 30;
            const fase = rodada.rodada < rodadaTransicao ? 'fase1' : 'fase2';
            totalTimesFase = config.ranking_rodada[fase]?.total_participantes || totalTimesFase;
        }

        // MITO: 1º lugar
        if (rodada.isMito || rodada.posicao === 1)
            return `<span class="badge-status status-mito"><span class="material-icons" style="font-size: 10px;">emoji_events</span> MITO</span>`;

        // MICO: último lugar (contextual)
        if (rodada.isMico || rodada.posicao === totalTimesFase)
            return `<span class="badge-status status-mico"><span class="material-icons" style="font-size: 10px;">sentiment_very_dissatisfied</span> MICO</span>`;

        if (rodada.posicao) {
            let classe = "status-neutro";

            // v5.4: Determinar faixas baseado no total de participantes
            if (totalTimesFase <= 6) {
                // Liga pequena (ex: 4 ou 6 times)
                const faixaCredito = Math.ceil(totalTimesFase / 3);
                const faixaDebito = totalTimesFase - Math.floor(totalTimesFase / 3);

                if (rodada.posicao <= faixaCredito) classe = "status-g4";
                else if (rodada.posicao >= faixaDebito) classe = "status-z4";
                else classe = "status-neutro";
            } else {
                // Liga grande (32+ times) - padrão SuperCartola
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
        // ✅ v6.0: Garantir que o modal existe
        this.criarModalExtrato();

        // ✅ v6.0: Renderizar no MODAL em vez de inline
        const modalBody = document.getElementById('modalExtratoBody');
        console.log('[FLUXO-UI] modalExtratoBody encontrado:', !!modalBody);

        // Fallback para container inline se modal não existir
        const container = modalBody || document.getElementById(this.containerId);
        if (!container) {
            console.error('[FLUXO-UI] Nenhum container encontrado para renderizar extrato');
            return;
        }

        // ✅ DEBUG: Verificar estrutura do extrato
        console.log(`[FLUXO-UI] 📊 Renderizando extrato:`, {
            temRodadas: Array.isArray(extrato?.rodadas),
            qtdRodadas: extrato?.rodadas?.length || 0,
            primeiraRodada: extrato?.rodadas?.[0],
            resumo: extrato?.resumo,
            renderizandoEmModal: !!modalBody,
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

            // Abrir modal mesmo com erro
            if (modalBody && participante) {
                this.abrirModalExtrato(participante);
            }
            return;
        }

        extrato = this._ajustarExtratoPreTemporada(extrato);
        await this._carregarIntegracoesExtrato(window.obterLigaId?.());
        const modulosExtras = this._coletarModulosExtras(participante);
        if (modulosExtras && Object.keys(modulosExtras).length > 0) {
            extrato.modulosExtras = modulosExtras;
        }
        const camposEditaveisHTML = await this.renderizarCamposEditaveis(
            participante.time_id || participante.id,
        );

        // ✅ v4.5: Popular cache no backend quando admin visualiza (silencioso)
        const timeId = participante.time_id || participante.id;
        this.popularCacheBackend(timeId, extrato);

        // ✅ v8.9: Aplicar integrações do wizard apenas para visualização (sem backend)
        const extratoView = this._aplicarIntegracoesExtrato(
            this._clonarExtrato(extrato),
        );
        window.extratoAtual = extratoView;
        extrato = extratoView;

        const saldoFinal = parseFloat(extrato.resumo.saldo) || 0;

        // ✅ v6.3: Terminologia correta
        // DEVE = saldo negativo, participante ainda deve à liga
        // A RECEBER = saldo positivo, participante tem crédito (admin vai pagar)
        // QUITADO = saldo zero, tudo acertado
        let classeSaldo, labelSaldo;
        if (saldoFinal === 0) {
            classeSaldo = "text-muted";
            labelSaldo = '<span class="material-icons" style="font-size: 16px; vertical-align: middle;">check_circle</span> QUITADO';
        } else if (saldoFinal > 0) {
            classeSaldo = "text-success";
            labelSaldo = '<span class="material-icons" style="font-size: 16px; vertical-align: middle;">savings</span> A RECEBER';
        } else {
            classeSaldo = "text-danger";
            labelSaldo = '<span class="material-icons" style="font-size: 16px; vertical-align: middle;">payments</span> DEVE';
        }

        // ✅ v6.0: HTML simplificado para o modal (sem botões no header, agora no footer do modal)
        let html = `
        <div class="extrato-container fadeIn">
            <!-- Card de Saldo Principal -->
            <div class="extrato-header-card">
                <div class="extrato-saldo-label">${labelSaldo}</div>
                <div class="saldo-display ${classeSaldo}">
                    R$ ${Math.abs(saldoFinal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>

                ${extrato.updatedAt ? `<div class="extrato-saldo-atualizado">Atualizado: ${new Date(extrato.updatedAt).toLocaleString()}</div>` : ""}

                ${/* ✅ v6.7: Botões GANHOS/PERDAS só aparecem se tem rodadas (não pré-temporada) */
                  !extrato.preTemporada && extrato.rodadas && extrato.rodadas.length > 0 ? `
                <div style="display: flex; justify-content: center; gap: 12px; margin-top: 16px;">
                    <button onclick="window.mostrarDetalhamentoGanhos()" class="btn-modern btn-success-gradient"><span class="material-icons" style="font-size: 14px;">trending_up</span> GANHOS</button>
                    <button onclick="window.mostrarDetalhamentoPerdas()" class="btn-modern btn-danger-gradient"><span class="material-icons" style="font-size: 14px;">trending_down</span> PERDAS</button>
                </div>
                ` : ''}
            </div>

            ${this._renderizarIntegracoesExtrato(extrato)}

            ${/* ✅ v6.7: Campos editáveis (Ajustes Manuais) SEMPRE disponíveis - inclusive pré-temporada */
              camposEditaveisHTML}

            ${/* ✅ v6.7: Só mostrar tabela de rodadas se existirem (não pré-temporada) */
              extrato.rodadas && extrato.rodadas.length > 0 && !extrato.preTemporada ? `
            <div class="card-padrao">
                <h3 class="card-titulo"><span class="material-icons" style="font-size: 16px;">receipt_long</span> Detalhamento por Rodada</h3>
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
            ` : extrato.preTemporada ? `
            <div class="card-padrao extrato-pretemporada">
                <span class="material-icons extrato-pretemporada-icone">hourglass_empty</span>
                <h3 class="extrato-pretemporada-titulo">Pré-Temporada ${window.temporadaAtual || 2026}</h3>
                <p class="extrato-pretemporada-subtitulo">O campeonato ainda não começou. Apenas acertos financeiros estão disponíveis.</p>
            </div>
            ` : ''}

            ${this._renderizarSecaoAcertos(extrato)}
        </div>
        `;

        container.innerHTML = html;

        // ✅ v6.0: Abrir o modal automaticamente (verificar novamente após render)
        const modalAtivo = document.getElementById('modalExtratoBody');
        if (modalAtivo && participante) {
            console.log('[FLUXO-UI] Chamando abrirModalExtrato...');
            this.abrirModalExtrato(participante);
        } else {
            console.log('[FLUXO-UI] Modal não aberto:', { modalAtivo: !!modalAtivo, participante: !!participante });
        }
    }

    _clonarExtrato(extrato) {
        try {
            if (typeof structuredClone === 'function') {
                return structuredClone(extrato);
            }
        } catch (error) {
            console.warn('[FLUXO-UI] Falha ao usar structuredClone:', error);
        }

        try {
            return JSON.parse(JSON.stringify(extrato));
        } catch (error) {
            console.warn('[FLUXO-UI] Falha ao clonar extrato:', error);
            return extrato;
        }
    }

    _aplicarIntegracoesExtrato(extrato) {
        const integracoes = Array.isArray(this._extratoIntegracoes)
            ? this._extratoIntegracoes
            : [];
        if (!integracoes.length) return extrato;

        const resumo = extrato.resumo || {};
        const extras = extrato.modulosExtras || {};
        const integrados = {};
        const aplicadas = [];
        let deltaSaldo = 0;
        let ganhosExtras = 0;
        let perdasExtras = 0;

        integracoes.forEach((item) => {
            const valorBase = typeof extras[item.key] === 'number'
                ? extras[item.key]
                : typeof resumo[item.key] === 'number'
                    ? resumo[item.key]
                    : 0;

            if (!valorBase || Number.isNaN(valorBase)) return;

            const tipo = (item.tipo || 'misto').toLowerCase();
            let valorIntegrado = valorBase;
            if (tipo === 'credito') valorIntegrado = Math.abs(valorBase);
            else if (tipo === 'debito') valorIntegrado = -Math.abs(valorBase);

            if (!valorIntegrado || Number.isNaN(valorIntegrado)) return;

            integrados[item.key] = valorIntegrado;
            resumo[item.key] = valorIntegrado;
            deltaSaldo += valorIntegrado;

            if (valorIntegrado > 0) ganhosExtras += valorIntegrado;
            else if (valorIntegrado < 0) perdasExtras += Math.abs(valorIntegrado);

            aplicadas.push({
                ...item,
                valor: valorIntegrado,
            });
        });

        if (deltaSaldo !== 0) {
            const saldoTemporadaBase =
                typeof resumo.saldo_temporada === 'number' ? resumo.saldo_temporada : 0;
            const saldoPendenteBase =
                typeof resumo.saldo === 'number' ? resumo.saldo : 0;

            resumo.saldo_temporada = saldoTemporadaBase + deltaSaldo;
            resumo.saldo = saldoPendenteBase + deltaSaldo;

            if (typeof resumo.totalGanhos === 'number') {
                resumo.totalGanhos += ganhosExtras;
            }
            if (typeof resumo.totalPerdas === 'number') {
                resumo.totalPerdas += perdasExtras;
            }
        }

        extrato.resumo = resumo;
        extrato.modulosExtrasIntegrados = integrados;
        extrato.integracoesAplicadas = aplicadas;
        return extrato;
    }

    _renderizarIntegracoesExtrato(extrato) {
        const integracoes = Array.isArray(extrato.integracoesAplicadas)
            ? extrato.integracoesAplicadas
            : [];

        const regras = integracoes.filter(
            (item) => typeof item.regra === 'string' && item.regra.trim().length > 0,
        );

        if (!regras.length) return '';

        return `
            <div class="card-padrao extrato-integracoes">
                <div class="extrato-integracoes-header">
                    <span class="material-icons">extension</span>
                    <h4>Integrações no Extrato</h4>
                </div>
                <div class="extrato-integracoes-lista">
                    ${regras
                        .map(
                            (item) => `
                        <div class="extrato-integracoes-item">
                            <span class="extrato-integracoes-label">${item.label}</span>
                            <span class="extrato-integracoes-regra">${item.regra}</span>
                        </div>
                    `,
                        )
                        .join('')}
                </div>
            </div>
        `;
    }

    _normalizarValorIntegracao(valor, tipo) {
        if (typeof valor !== 'number' || Number.isNaN(valor)) return 0;
        const modo = (tipo || 'misto').toLowerCase();
        if (modo === 'credito') return Math.abs(valor);
        if (modo === 'debito') return -Math.abs(valor);
        return valor;
    }

    _ajustarBreakdownPorIntegracoes(breakdown) {
        if (!breakdown || typeof breakdown !== 'object') return breakdown;
        const integracoes = Array.isArray(this._extratoIntegracoes)
            ? this._extratoIntegracoes
            : [];
        if (!integracoes.length) return breakdown;

        const ajustado = { ...breakdown };
        integracoes.forEach((item) => {
            if (!item?.key) return;
            const valorBase = ajustado[item.key];
            if (typeof valorBase !== 'number') return;
            ajustado[item.key] = this._normalizarValorIntegracao(valorBase, item.tipo);
        });
        return ajustado;
    }

    _aplicarIntegracoesTabela(participantes, totalParticipantesBase) {
        const integracoes = Array.isArray(this._extratoIntegracoes)
            ? this._extratoIntegracoes
            : [];

        if (!integracoes.length) {
            return { participantes, totais: null };
        }

        const participantesIntegrados = participantes.map((p) => {
            const breakdown = p.breakdown || {};
            let deltaSaldo = 0;
            let ganhosExtras = 0;
            let perdasExtras = 0;
            const aplicadas = [];

            integracoes.forEach((item) => {
                if (!item?.key) return;
                const valorBase = breakdown[item.key];
                if (typeof valorBase !== 'number' || Number.isNaN(valorBase)) return;
                const valorIntegrado = this._normalizarValorIntegracao(valorBase, item.tipo);
                if (!valorIntegrado || Number.isNaN(valorIntegrado)) return;

                deltaSaldo += valorIntegrado;
                if (valorIntegrado > 0) ganhosExtras += valorIntegrado;
                else if (valorIntegrado < 0) perdasExtras += Math.abs(valorIntegrado);

                aplicadas.push({
                    ...item,
                    valor: valorIntegrado,
                });
            });

            const saldoTemporadaBase =
                typeof p.saldoTemporada === 'number' ? p.saldoTemporada : 0;
            const saldoFinalBase =
                typeof p.saldoFinal === 'number' ? p.saldoFinal : 0;

            const saldoTemporadaIntegrado = saldoTemporadaBase + deltaSaldo;
            const saldoFinalIntegrado = saldoFinalBase + deltaSaldo;
            const situacaoIntegrada =
                saldoFinalIntegrado > 0
                    ? 'credor'
                    : saldoFinalIntegrado < 0
                        ? 'devedor'
                        : 'quitado';

            return {
                ...p,
                saldoTemporadaIntegrado,
                saldoFinalIntegrado,
                situacaoIntegrada,
                deltaIntegracoesExtrato: deltaSaldo,
                integracoesAplicadas: aplicadas,
                totalGanhosExtras: ganhosExtras,
                totalPerdasExtras: perdasExtras,
            };
        });

        const totais = {
            totalParticipantes: totalParticipantesBase,
            quantidadeCredores: 0,
            quantidadeDevedores: 0,
            quantidadeQuitados: 0,
            totalAReceber: 0,
            totalAPagar: 0,
        };

        participantesIntegrados.forEach((p) => {
            const saldo = typeof p.saldoFinalIntegrado === 'number'
                ? p.saldoFinalIntegrado
                : 0;

            if (saldo > 0) {
                totais.quantidadeCredores += 1;
                totais.totalAPagar += saldo;
            } else if (saldo < 0) {
                totais.quantidadeDevedores += 1;
                totais.totalAReceber += Math.abs(saldo);
            } else {
                totais.quantidadeQuitados += 1;
            }
        });

        return { participantes: participantesIntegrados, totais };
    }

    async _carregarIntegracoesExtrato(ligaId) {
        if (this._extratoIntegracoesCarregadas) return;
        this._extratoIntegracoesCarregadas = true;
        this._extratoIntegracoes = [];

        const ligaIdFinal = ligaId || window.obterLigaId?.();
        if (!ligaIdFinal) return;

        const modulos = [
            { flag: 'melhorMes', backendId: 'melhor_mes', key: 'melhorMes', label: 'Melhor do Mês' },
            { flag: 'artilheiro', backendId: 'artilheiro', key: 'artilheiro', label: 'Artilheiro' },
            { flag: 'luvaOuro', backendId: 'luva_ouro', key: 'luvaOuro', label: 'Luva de Ouro' },
        ];

        const ativos = this._modulosAtivos || {};

        await Promise.all(
            modulos.map(async (modulo) => {
                if (!ativos?.[modulo.flag]) return;

                let integrar = true;
                let tipo = 'misto';
                let label = modulo.label;
                let regra = '';

                try {
                    const response = await fetch(`/api/liga/${ligaIdFinal}/modulos/${modulo.backendId}`);
                    if (response.ok) {
                        const data = await response.json();
                        const respostas =
                            data?.config?.wizard_respostas ||
                            data?.wizard_respostas ||
                            {};

                        if (respostas.integrar_extrato === false) integrar = false;
                        if (typeof respostas.extrato_tipo_impacto === 'string' && respostas.extrato_tipo_impacto) {
                            tipo = respostas.extrato_tipo_impacto;
                        }
                        if (typeof respostas.extrato_label === 'string' && respostas.extrato_label.trim()) {
                            label = respostas.extrato_label.trim();
                        }
                        if (typeof respostas.extrato_regra === 'string') {
                            regra = respostas.extrato_regra;
                        }
                    }
                } catch (error) {
                    console.warn('[FLUXO-UI] Falha ao carregar integração do extrato:', modulo.backendId, error);
                }

                if (!integrar) return;
                this._extratoIntegracoes.push({
                    key: modulo.key,
                    label,
                    tipo,
                    regra,
                    modulo: modulo.flag,
                });
            }),
        );

        const extrasGlobais = Array.isArray(window.EXTRATO_MODULOS_EXTRAS)
            ? window.EXTRATO_MODULOS_EXTRAS
            : [];

        extrasGlobais.forEach((extra) => {
            if (!extra || !extra.key) return;
            this._extratoIntegracoes.push({
                key: extra.key,
                label: extra.label || extra.key,
                tipo: extra.tipo || 'misto',
                regra: extra.regra || '',
                modulo: extra.modulo || 'custom',
            });
        });

        const dedupe = new Map();
        this._extratoIntegracoes.forEach((item) => {
            if (!item?.key || dedupe.has(item.key)) return;
            dedupe.set(item.key, item);
        });
        this._extratoIntegracoes = Array.from(dedupe.values());
    }

    _coletarModulosExtras(participante) {
        const breakdown = participante?.breakdown;
        if (!breakdown) return {};

        const extras = {};
        if (typeof breakdown.melhorMes === 'number') extras.melhorMes = breakdown.melhorMes;
        if (typeof breakdown.artilheiro === 'number') extras.artilheiro = breakdown.artilheiro;
        if (typeof breakdown.luvaOuro === 'number') extras.luvaOuro = breakdown.luvaOuro;

        return extras;
    }

    obterModulosExtrato() {
        const base = [
            { key: 'bonus', label: 'Bônus MITO', tipo: 'credito' },
            { key: 'onus', label: 'Ônus MICO', tipo: 'debito' },
            { key: 'pontosCorridos', label: 'Pontos Corridos', tipo: 'misto' },
            { key: 'mataMata', label: 'Mata-Mata', tipo: 'misto' },
            { key: 'top10', label: 'TOP 10', tipo: 'misto' },
        ];

        const extras = Array.isArray(this._extratoIntegracoes)
            ? this._extratoIntegracoes
            : [];

        const merged = new Map();
        [...base, ...extras].forEach((item) => {
            if (!item?.key || merged.has(item.key)) return;
            merged.set(item.key, item);
        });

        return Array.from(merged.values());
    }

    _isAcertoInscricao(acerto) {
        const descricao = (acerto?.descricao || '').toLowerCase();
        return descricao.includes('inscri') || descricao.includes('renova');
    }

    _ajustarExtratoPreTemporada(extrato) {
        if (!extrato || extrato.preTemporada !== true) return extrato;

        const pagouInscricao =
            extrato.resumo?.pagouInscricao === true ||
            extrato.inscricao?.pagouInscricao === true;

        if (!pagouInscricao) return extrato;

        const lista = extrato.acertos?.lista || [];
        if (!Array.isArray(lista) || lista.length === 0) return extrato;

        const listaFiltrada = lista.filter((a) => !this._isAcertoInscricao(a));
        if (listaFiltrada.length === lista.length) return extrato;

        let totalPago = 0;
        let totalRecebido = 0;
        listaFiltrada.forEach((a) => {
            const valor = Number(a.valor) || 0;
            if (a.tipo === 'pagamento') totalPago += valor;
            else if (a.tipo === 'recebimento') totalRecebido += valor;
        });

        const saldoAcertos = parseFloat((totalPago - totalRecebido).toFixed(2));
        const saldoTemporada = extrato.resumo?.saldo_temporada ?? 0;

        return {
            ...extrato,
            resumo: {
                ...extrato.resumo,
                saldo_acertos: saldoAcertos,
                saldo: saldoTemporada + saldoAcertos,
            },
            acertos: {
                ...(extrato.acertos || {}),
                lista: listaFiltrada,
                resumo: {
                    ...(extrato.acertos?.resumo || {}),
                    totalPago: parseFloat(totalPago.toFixed(2)),
                    totalRecebido: parseFloat(totalRecebido.toFixed(2)),
                    saldo: saldoAcertos,
                    saldoAcertos: saldoAcertos,
                    quantidadeAcertos: listaFiltrada.length,
                },
            },
        };
    }

    /**
     * ✅ v6.6: Renderiza seção de Acertos Financeiros no extrato
     * CONCEITO IMPORTANTE:
     * - RESULTADO TEMPORADA: histórico imutável (o que ganhou/perdeu)
     * - ACERTOS: pagamentos/recebimentos que quitam dívida
     * - SALDO PENDENTE: o que ainda deve/tem a receber
     * ✅ v6.7: Label dinâmico baseado na origem do saldo
     */
    _renderizarSecaoAcertos(extrato) {
        const acertos = extrato.acertos?.lista || [];
        // ✅ v6.6: saldo_temporada é o histórico (sem acertos)
        const saldoTemporada = extrato.resumo?.saldo_temporada ?? 0;
        const saldoAcertos = extrato.resumo?.saldo_acertos ?? 0;
        // ✅ v6.6: saldo é o pendente (com acertos)
        const saldoPendente = extrato.resumo?.saldo ?? 0;

        // ✅ v6.7: Determinar label e ícone baseado na origem do saldo
        // ✅ v6.8 FIX: Se pagou inscrição, label é "Saldo Inicial", não "Inscrição"
        const temporadaAtual = this.temporadaModalExtrato || window.temporadaAtual || 2026;
        const isPreTemporada = extrato.preTemporada === true;
        const pagouInscricao = extrato.resumo?.pagouInscricao === true || extrato.inscricao?.pagouInscricao === true;

        let labelSaldoTemporada = 'Resultado Temporada:';
        let iconeSaldoTemporada = 'history';

        // ✅ v8.7: Simplificado - sempre "Saldo Inicial" para pré-temporada
        // Removido label "Inscrição XXXX" que era redundante com botões Acerto/Ajustes
        if (isPreTemporada || (extrato.rodadas?.length === 0 && saldoTemporada !== 0)) {
            labelSaldoTemporada = 'Saldo Inicial:';
            iconeSaldoTemporada = 'account_balance';
        }

        const formatarValor = (v) => Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const corSaldoTemp = saldoTemporada >= 0 ? 'text-success' : 'text-danger';
        const corSaldoAcertos = saldoAcertos >= 0 ? 'text-success' : 'text-danger';
        const corSaldoPendente = saldoPendente >= 0 ? 'text-success' : 'text-danger';

        // Lista de acertos
        const acertosHTML = acertos.map(a => {
            const isPagamento = a.tipo === 'pagamento';
            const cor = isPagamento ? '#34d399' : '#f87171';
            const icone = isPagamento ? 'arrow_upward' : 'arrow_downward';
            const sinal = isPagamento ? '+' : '-';
            const tipoLabel = isPagamento ? 'PAGOU' : 'RECEBEU';
            const data = a.dataAcerto ? new Date(a.dataAcerto).toLocaleDateString('pt-BR') : '--';

            return `
                <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 3px solid ${cor}; margin-bottom: 6px;">
                    <span class="material-icons" style="font-size: 18px; color: ${cor};">${icone}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; color: #fff; font-weight: 500;">${a.descricao || 'Acerto'}</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5);">${data} • ${tipoLabel}</div>
                    </div>
                    <div style="font-size: 14px; font-weight: 700; color: ${cor};">${sinal}R$ ${formatarValor(a.valor)}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="card-padrao" style="margin-top: 16px;">
                <h3 class="card-titulo" style="display: flex; align-items: center; gap: 8px;">
                    <span class="material-icons" style="font-size: 16px; color: var(--laranja);">payments</span>
                    Acertos Financeiros
                </h3>

                <!-- Lista de acertos -->
                ${acertosHTML || '<div style="padding: 12px; text-align: center; color: rgba(255,255,255,0.4); font-size: 12px;">Nenhum acerto registrado</div>'}

                <!-- ✅ v8.7: Resumo simplificado - SALDO INICIAL + status inscrição em sub-linha -->
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <!-- SALDO INICIAL (valor inicial da temporada) -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px;">
                        <span style="color: rgba(255,255,255,0.9); font-weight: 600;">
                            <span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px; color: var(--laranja);">${iconeSaldoTemporada}</span>
                            ${labelSaldoTemporada}
                        </span>
                        <span class="${corSaldoTemp}" style="font-weight: 700; font-size: 15px;">${saldoTemporada >= 0 ? '+' : '-'}R$ ${formatarValor(saldoTemporada)}</span>
                    </div>
                    <!-- ✅ v9.1: Removidas linhas verbosas (inscrição pendente, acertos, quitado) -->
                </div>
            </div>
        `;
    }

    /**
     * ✅ v8.9: Renderiza campos editáveis - agora com lógica condicional por temporada
     * - Temporada <= 2025: Campos fixos (legado)
     * - Temporada >= 2026: Seção REMOVIDA (redundante com botão "Acerto" no footer)
     */
    async renderizarCamposEditaveis(timeId) {
        const temporada = this.temporadaModalExtrato || window.temporadaAtual || 2026;

        if (temporada >= 2026) {
            // ✅ v8.9: Seção "Ajustes Financeiros" REMOVIDA para temporada 2026+
            // Motivo: Redundante com botão "Acerto" no footer do modal
            // O admin usa o botão "Acerto" (payments) para registrar movimentações
            return "";
        } else {
            // ✅ v8.0: Sistema legado - 4 campos fixos (mantém compatibilidade 2025)
            return await this.renderizarCamposFixos(timeId);
        }
    }

    /**
     * ✅ v8.0: Renderiza campos fixos (sistema legado para temporada <= 2025)
     */
    async renderizarCamposFixos(timeId) {
        // ✅ v6.10 FIX: Passar temporada correta para buscar campos da temporada selecionada
        const temporadaSelecionada = window.temporadaAtual || 2025;
        const campos =
            await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId, temporadaSelecionada);
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

    /**
     * ✅ v8.0: Renderiza ajustes dinâmicos (novo sistema para temporada >= 2026)
     * ✅ v8.1: Fallback para campos legados (fluxofinanceirocampos) se novo sistema vazio
     * ✅ v8.2: Fix CRÍTICO - Passa temporada no fallback de campos legados
     */
    async renderizarAjustesDinamicos(timeId, temporada) {
        const ligaId = window.obterLigaId?.() || '';

        // Verificar se é admin
        const isAdmin =
            window.adminLogado === true ||
            window.isAdminMode === true ||
            document.querySelector('[data-admin-mode="true"]') !== null;

        // Buscar ajustes via API (novo sistema)
        let ajustes = [];
        let usandoLegado = false;
        try {
            if (window.FluxoFinanceiroAjustesAPI) {
                ajustes = await window.FluxoFinanceiroAjustesAPI.listarAjustes(ligaId, timeId, temporada);
            }
        } catch (error) {
            console.error('[FLUXO-UI] Erro ao carregar ajustes:', error);
        }

        // ✅ v8.2 FALLBACK: Se não tem ajustes no novo sistema, buscar campos legados (COM TEMPORADA)
        if (ajustes.length === 0) {
            try {
                // ✅ CRÍTICO: Passar temporada para buscar campos da temporada correta
                const camposLegados = await FluxoFinanceiroCampos.carregarTodosCamposEditaveis(timeId, temporada);

                // Converter campos legados para formato de ajustes
                const camposArray = ['campo1', 'campo2', 'campo3', 'campo4'];
                camposArray.forEach((key, index) => {
                    const campo = camposLegados[key];
                    if (campo && campo.valor !== 0) {
                        ajustes.push({
                            _id: `legado_${index}`,
                            descricao: campo.nome || `Campo ${index + 1}`,
                            valor: parseFloat(campo.valor) || 0,
                            criado_em: null,
                            legado: true // Flag para identificar que veio do sistema antigo
                        });
                    }
                });

                if (ajustes.length > 0) {
                    usandoLegado = true;
                    console.log(`[FLUXO-UI] ✅ Fallback: ${ajustes.length} campos legados carregados para time ${timeId} (temporada ${temporada})`);
                }
            } catch (error) {
                console.warn('[FLUXO-UI] Erro ao carregar campos legados:', error);
            }
        }

        // Calcular totais
        const totais = window.FluxoFinanceiroAjustesAPI?.calcularTotal(ajustes) || { total: 0, creditos: 0, debitos: 0 };
        const formatarValor = (v) => Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        // Se não é admin e não tem ajustes, não mostrar seção
        if (!isAdmin && ajustes.length === 0) return "";

        // Lista de ajustes HTML
        const ajustesHTML = ajustes.length > 0 ? ajustes.map(a => {
            const isLegado = a.legado === true;
            const isCredito = a.valor > 0;
            const cor = isCredito ? '#34d399' : '#f87171';
            const sinal = isCredito ? '+' : '-';

            return `
                <div class="ajuste-item" data-ajuste-id="${a._id}" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 3px solid ${cor}; margin-bottom: 6px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; color: #fff; font-weight: 500;">${a.descricao}</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5);">${a.criado_em ? new Date(a.criado_em).toLocaleDateString('pt-BR') : (isLegado ? 'Importado' : '')}</div>
                    </div>
                    <div style="font-size: 14px; font-weight: 700; color: ${cor};">${sinal}R$ ${formatarValor(a.valor)}</div>
                    ${isAdmin && !isLegado ? `
                    <div class="ajuste-actions" style="display: flex; gap: 4px;">
                        <button onclick="window.editarAjusteFinanceiro('${a._id}', '${a.descricao.replace(/'/g, "\\'")}', ${a.valor})" class="btn-ajuste-action" style="background: rgba(255,255,255,0.1); border: none; border-radius: 4px; padding: 4px; cursor: pointer;" title="Editar">
                            <span class="material-icons" style="font-size: 16px; color: #888;">edit</span>
                        </button>
                        <button onclick="window.removerAjusteFinanceiro('${a._id}', '${a.descricao.replace(/'/g, "\\'")}')" class="btn-ajuste-action" style="background: rgba(255,255,255,0.1); border: none; border-radius: 4px; padding: 4px; cursor: pointer;" title="Remover">
                            <span class="material-icons" style="font-size: 16px; color: #888;">delete</span>
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('') : `
            <div style="padding: 16px; text-align: center; color: rgba(255,255,255,0.4); font-size: 12px;">
                <span class="material-icons" style="font-size: 32px; display: block; margin-bottom: 8px;">receipt_long</span>
                Nenhum ajuste registrado
            </div>
        `;

        // Total
        const corTotal = totais.total >= 0 ? 'text-success' : 'text-danger';
        const sinalTotal = totais.total >= 0 ? '+' : '-';

        const timeIdSafe = String(timeId).replace(/'/g, "\\'");

        return `
            <div class="card-padrao mb-20 ajustes-section">
                <h4 class="card-titulo" style="font-size: 13px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="font-size: 16px; color: var(--laranja);">tune</span>
                        Ajustes Financeiros
                    </span>
                    ${isAdmin ? `
                    <button onclick="window.abrirModalNovoAjuste ? window.abrirModalNovoAjuste('${timeIdSafe}', ${temporada}) : window.abrirModalAjuste && window.abrirModalAjuste()" class="btn-add-ajuste" style="display: flex; align-items: center; gap: 4px; background: linear-gradient(135deg, var(--laranja) 0%, #ff6b00 100%); border: none; border-radius: 6px; padding: 6px 12px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer;">
                        <span class="material-icons" style="font-size: 14px;">add</span> Adicionar
                    </button>
                    ` : ''}
                </h4>

                <div class="ajustes-lista">
                    ${ajustesHTML}
                </div>

                ${ajustes.length > 0 ? `
                <div class="ajustes-total" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: rgba(255,255,255,0.7); font-weight: 600;">Total Ajustes:</span>
                    <span class="${corTotal}" style="font-weight: 700; font-size: 15px;">${sinalTotal}R$ ${formatarValor(totais.total)}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    // =========================================================================
    // ✅ v4.6: Popular cache no backend quando admin visualiza extrato
    // ✅ FIX: Não popular cache de 2026 durante pré-temporada (evita corrupção)
    // =========================================================================
    async popularCacheBackend(timeId, extrato) {
        try {
            const ligaId = window.obterLigaId?.();
            if (!ligaId || !timeId || !extrato) return;

            // ✅ v4.6 FIX: Obter temporada do modal
            const temporada = this.temporadaModalExtrato || window.temporadaAtual || 2026;

            // ✅ v4.6 FIX: NÃO popular cache de 2026 durante pré-temporada
            // O extrato 2026 só deve ter dados quando a temporada começar
            if (temporada === 2026) {
                console.log(`[FLUXO-UI] ⏸️ Skipping cache 2026 (pré-temporada)`);
                return;
            }

            console.log(
                `[FLUXO-UI] 📤 Populando cache backend para time ${timeId} (temp ${temporada})...`,
            );

            // Enviar extrato calculado pelo frontend para o cache do backend
            const response = await fetch(
                `/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        extrato: extrato,
                        temporada: temporada, // ✅ v4.6 FIX: Incluir temporada
                        origem: "admin-frontend",
                        versao: "4.6",
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
        const totalSaldo = relatorio.reduce((sum, p) => sum + (typeof p.saldoFinalIntegrado === 'number' ? p.saldoFinalIntegrado : (p.saldoFinal || 0)), 0);

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
                        <span class="resumo-valor">${formatarMoedaBR(totalBonus)}</span>
                    </div>
                    <div class="resumo-item negativo">
                        <span class="resumo-label">Total Onus</span>
                        <span class="resumo-valor">${formatarMoedaBR(totalOnus)}</span>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-label">Pontos Corridos</span>
                        <span class="resumo-valor">${formatarMoedaBR(totalPC)}</span>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-label">Mata-Mata</span>
                        <span class="resumo-valor">${formatarMoedaBR(totalMM)}</span>
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
                                <tr class="${(typeof p.saldoFinalIntegrado === 'number' ? p.saldoFinalIntegrado : p.saldoFinal) >= 0 ? 'positivo' : 'negativo'}">
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
                                    <td class="col-saldo ${(typeof p.saldoFinalIntegrado === 'number' ? p.saldoFinalIntegrado : p.saldoFinal) >= 0 ? 'positivo' : 'negativo'}">
                                        ${formatarMoedaBR(typeof p.saldoFinalIntegrado === 'number' ? p.saldoFinalIntegrado : p.saldoFinal)}
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
                                <td class="col-saldo"><strong>${formatarMoedaBR(totalSaldo)}</strong></td>
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
// ✅ v7.4: REMOVIDO - Funções limparCache (Botão da Morte)
// As funções recalcularCacheParticipante e limparCacheLiga foram REMOVIDAS
// por causar perda de dados irrecuperáveis em temporadas históricas.
// O cache é invalidado automaticamente quando necessário.
// =========================================================================

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
                    // Enviar para o cache do backend (estrutura correta)
                    const response = await fetch(
                        `/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                historico_transacoes: extrato.rodadas || [],
                                ultimaRodadaCalculada: rodadaAtual,
                                motivoRecalculo: "admin-recalculo-todos",
                                resumo: extrato.resumo || {},
                                saldo: extrato.resumo?.saldo || 0,
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

    // Salvar no backend com tratamento de erro
    try {
        await FluxoFinanceiroCampos.salvarValorCampo(timeId, campo, valor);
    } catch (error) {
        console.error(`[FLUXO-UI] ❌ Erro ao salvar campo:`, error);
        alert(`Erro ao salvar valor: ${error.message}`);
        // Reverter visual para indicar erro
        input.classList.add("campo-erro");
    }
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
    const extras = window.extratoAtual.modulosExtras || {};
    const extrasIntegrados = window.extratoAtual.modulosExtrasIntegrados || {};
    const modulosConfigurados =
        window.fluxoFinanceiroUI?.obterModulosExtrato?.() || [
            { key: 'bonus', label: 'Bônus MITO', tipo: 'credito' },
            { key: 'onus', label: 'Ônus MICO', tipo: 'debito' },
            { key: 'pontosCorridos', label: 'Pontos Corridos', tipo: 'misto' },
            { key: 'mataMata', label: 'Mata-Mata', tipo: 'misto' },
            { key: 'top10', label: 'TOP 10', tipo: 'misto' },
            { key: 'melhorMes', label: 'Melhor do Mês', tipo: 'misto' },
            { key: 'artilheiro', label: 'Artilheiro', tipo: 'misto' },
            { key: 'luvaOuro', label: 'Luva de Ouro', tipo: 'misto' },
        ];

    const obterValorModulo = (key) => {
        const valorExtraIntegrado = extrasIntegrados[key];
        const valorExtra = extras[key];
        const valorResumo = resumo?.[key];

        if (typeof valorExtraIntegrado === "number" && !Number.isNaN(valorExtraIntegrado)) {
            return valorExtraIntegrado;
        }

        if (typeof valorExtra === "number" && !Number.isNaN(valorExtra) && valorExtra !== 0) {
            return valorExtra;
        }

        if (typeof valorResumo === "number" && !Number.isNaN(valorResumo)) {
            return valorResumo;
        }

        return 0;
    };

    // Coletar todos os ganhos (valores positivos)
    const itens = [];

    modulosConfigurados.forEach((modulo) => {
        const tipo = (modulo.tipo || "misto").toLowerCase();
        if (tipo === "debito") return;
        const valor = obterValorModulo(modulo.key);
        if (valor > 0) itens.push({ nome: modulo.label, valor });
    });

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
                            <span style="color: #22c55e; font-weight: 600;">+${formatarMoedaBR(item.valor)}</span>
                        </div>
                    `,
                                  )
                                  .join("")
                            : '<p style="color: #94a3b8; text-align: center;">Nenhum ganho registrado</p>'
                    }
                </div>

                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8; font-weight: 600;">TOTAL GANHOS:</span>
                    <span style="color: #22c55e; font-weight: 700; font-size: 18px;">+${formatarMoedaBR(total)}</span>
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
    const extras = window.extratoAtual.modulosExtras || {};
    const extrasIntegrados = window.extratoAtual.modulosExtrasIntegrados || {};
    const modulosConfigurados =
        window.fluxoFinanceiroUI?.obterModulosExtrato?.() || [
            { key: 'bonus', label: 'Bônus MITO', tipo: 'credito' },
            { key: 'onus', label: 'Ônus MICO', tipo: 'debito' },
            { key: 'pontosCorridos', label: 'Pontos Corridos', tipo: 'misto' },
            { key: 'mataMata', label: 'Mata-Mata', tipo: 'misto' },
            { key: 'top10', label: 'TOP 10', tipo: 'misto' },
            { key: 'melhorMes', label: 'Melhor do Mês', tipo: 'misto' },
            { key: 'artilheiro', label: 'Artilheiro', tipo: 'misto' },
            { key: 'luvaOuro', label: 'Luva de Ouro', tipo: 'misto' },
        ];

    const obterValorModulo = (key) => {
        const valorExtraIntegrado = extrasIntegrados[key];
        const valorExtra = extras[key];
        const valorResumo = resumo?.[key];

        if (typeof valorExtraIntegrado === "number" && !Number.isNaN(valorExtraIntegrado)) {
            return valorExtraIntegrado;
        }

        if (typeof valorExtra === "number" && !Number.isNaN(valorExtra) && valorExtra !== 0) {
            return valorExtra;
        }

        if (typeof valorResumo === "number" && !Number.isNaN(valorResumo)) {
            return valorResumo;
        }

        return 0;
    };

    // Coletar todas as perdas (valores negativos)
    const itens = [];

    modulosConfigurados.forEach((modulo) => {
        const tipo = (modulo.tipo || "misto").toLowerCase();
        if (tipo === "credito") return;
        const valor = obterValorModulo(modulo.key);
        if (valor < 0) itens.push({ nome: modulo.label, valor: Math.abs(valor) });
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
                            <span style="color: #ef4444; font-weight: 600;">-${formatarMoedaBR(item.valor)}</span>
                        </div>
                    `,
                                  )
                                  .join("")
                            : '<p style="color: #94a3b8; text-align: center;">Nenhuma perda registrada</p>'
                    }
                </div>

                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8; font-weight: 600;">TOTAL PERDAS:</span>
                    <span style="color: #ef4444; font-weight: 700; font-size: 18px;">-${formatarMoedaBR(total)}</span>
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
// ✅ v6.1: FUNÇÃO GLOBAL PARA FILTRAR PARTICIPANTES (Tabela Compacta)
// =========================================================================
window.filtrarParticipantesTabela = function(termo) {
    const tbody = document.getElementById('participantesTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('.linha-participante');
    const termoLower = (termo || '').toLowerCase().trim();
    let visiveis = 0;

    rows.forEach(row => {
        const nome = row.dataset.nome || '';
        const time = row.dataset.time || '';

        if (!termoLower || nome.includes(termoLower) || time.includes(termoLower)) {
            row.style.display = '';
            visiveis++;
        } else {
            row.style.display = 'none';
        }
    });

    // Atualizar contador
    const contador = document.querySelector('.participantes-count');
    if (contador) {
        const total = window.totalParticipantes || rows.length;
        contador.textContent = termoLower ? `${visiveis}/${total}` : `${total}`;
    }
};

// ✅ v6.1: FILTRAR POR SITUAÇÃO
window.filtrarPorSituacao = function(situacao) {
    console.log('[FLUXO-UI] Filtrando por situação:', situacao);

    const tbody = document.getElementById('participantesTableBody');
    if (!tbody) {
        console.warn('[FLUXO-UI] tbody não encontrado!');
        return;
    }

    const rows = tbody.querySelectorAll('.linha-participante');
    console.log('[FLUXO-UI] Linhas encontradas:', rows.length);

    let visiveis = 0;

    rows.forEach(row => {
        const rowSituacao = row.dataset.situacao || '';

        if (!situacao || rowSituacao === situacao) {
            row.style.display = '';
            visiveis++;
        } else {
            row.style.display = 'none';
        }
    });

    console.log('[FLUXO-UI] Participantes visíveis após filtro:', visiveis);

    // Atualizar contador
    const contador = document.querySelector('.participantes-count');
    if (contador) {
        const total = window.totalParticipantes || rows.length;
        contador.textContent = situacao ? `${visiveis}/${total}` : `${total}`;
    }
};

// ✅ v6.3: FILTRAR POR CARD (clicável) e DROPDOWN sincronizados
window._cardFiltroAtivo = null;

// Filtrar via dropdown (sincroniza com cards)
window.filtrarPorDropdown = function(situacao) {
    window._cardFiltroAtivo = situacao || null;

    // Aplicar filtro na tabela
    window.filtrarPorSituacao(situacao);

    // Atualizar estado visual dos cards
    const cards = document.querySelectorAll('.resumo-card.clickable');
    cards.forEach(card => {
        const cardFilter = card.dataset.filter;
        if (situacao && cardFilter === situacao) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
};

// Filtrar via card (sincroniza com dropdown)
window.filtrarPorCard = function(situacao) {
    console.log('[FLUXO-UI] Card clicado:', situacao);

    // Se clicar no mesmo card, remove o filtro
    if (window._cardFiltroAtivo === situacao) {
        console.log('[FLUXO-UI] Removendo filtro (mesmo card)');
        window._cardFiltroAtivo = null;
        situacao = ''; // Limpa filtro
    } else {
        window._cardFiltroAtivo = situacao;
    }

    // Aplicar filtro na tabela
    window.filtrarPorSituacao(situacao);

    // Atualizar select dropdown para refletir o filtro
    const selectFiltro = document.getElementById('filtroSituacao');
    if (selectFiltro) {
        selectFiltro.value = situacao;
    }

    // Atualizar estado visual dos cards
    const cards = document.querySelectorAll('.resumo-card.clickable');
    cards.forEach(card => {
        const cardFilter = card.dataset.filter;
        if (situacao && cardFilter === situacao) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    // Feedback visual - scroll para tabela se filtrou
    if (situacao) {
        const tabela = document.querySelector('.fluxo-tabela-container');
        if (tabela) {
            tabela.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
};

// Manter compatibilidade
window.filtrarParticipantes = window.filtrarParticipantesTabela;

// ✅ v8.5: Modal de Auditoria e funcoes PDF movidas para fluxo-financeiro-pdf.js

console.log("[FLUXO-UI] v8.8.1 - Tab 2025 usa criadaEm (ano real de criação)");

// =============================================================================
// AJUSTES DINAMICOS (Temporada 2026+)
// =============================================================================

/**
 * Abre modal para adicionar novo ajuste
 */
window.abrirModalAjuste = function() {
    // Remover modal existente se houver
    const existente = document.getElementById('modalAjusteFinanceiro');
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.id = 'modalAjusteFinanceiro';
    modal.className = 'modal-ajuste-overlay';
    modal.innerHTML = `
        <div class="modal-ajuste-container">
            <div class="modal-ajuste-header">
                <h3>Novo Ajuste</h3>
                <button class="modal-ajuste-close" onclick="window.fecharModalAjuste()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-ajuste-body">
                <div class="form-group">
                    <label>Descricao</label>
                    <input type="text" id="ajusteDescricao" class="input-ajuste" placeholder="Ex: Bonus premiacao, Taxa extra..." maxlength="100">
                </div>
                <div class="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" id="ajusteValor" class="input-ajuste" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group tipo-ajuste">
                    <label>
                        <input type="radio" name="tipoAjuste" value="credito" checked>
                        <span class="tipo-label credito">Credito (+)</span>
                    </label>
                    <label>
                        <input type="radio" name="tipoAjuste" value="debito">
                        <span class="tipo-label debito">Debito (-)</span>
                    </label>
                </div>
            </div>
            <div class="modal-ajuste-footer">
                <button class="btn-cancelar" onclick="window.fecharModalAjuste()">Cancelar</button>
                <button class="btn-salvar" onclick="window.salvarAjuste()">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    document.getElementById('ajusteDescricao').focus();
};

/**
 * Abre modal de ajuste financeiro para um participante específico
 * v4.0: Usado na tabela 2026 para adicionar ajustes diretamente
 * @param {string} ligaId - ID da liga
 * @param {string} timeId - ID do time/participante
 * @param {string} nomeCartola - Nome do participante
 */
window.abrirModalAjusteFinanceiro = function(ligaId, timeId, nomeCartola) {
    // Remover modal existente se houver
    const existente = document.getElementById('modalAjusteFinanceiro');
    if (existente) existente.remove();

    const temporada = window.temporadaAtual || 2026;

    const modal = document.createElement('div');
    modal.id = 'modalAjusteFinanceiro';
    modal.className = 'modal-ajuste-overlay';
    modal.innerHTML = `
        <div class="modal-ajuste-container">
            <div class="modal-ajuste-header">
                <h3>
                    <span class="material-icons" style="vertical-align: middle; margin-right: 8px;">add_circle</span>
                    Novo Ajuste - ${nomeCartola || 'Participante'}
                </h3>
                <button class="modal-ajuste-close" onclick="window.fecharModalAjuste()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-ajuste-body">
                <div class="ajuste-info" style="background: #1a1a1a; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; color: #888;">
                    <span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">info</span>
                    Temporada ${temporada}
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <input type="text" id="ajusteDescricao" class="input-ajuste"
                           placeholder="Ex: Bônus premiação, Taxa extra, Correção..." maxlength="100">
                </div>
                <div class="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" id="ajusteValor" class="input-ajuste" placeholder="0.00" step="0.01" min="0.01">
                </div>
                <div class="form-group tipo-ajuste">
                    <label>
                        <input type="radio" name="tipoAjuste" value="credito">
                        <span class="tipo-label credito">Crédito (+)</span>
                    </label>
                    <label>
                        <input type="radio" name="tipoAjuste" value="debito" checked>
                        <span class="tipo-label debito">Débito (-)</span>
                    </label>
                </div>
            </div>
            <div class="modal-ajuste-footer">
                <button class="btn-cancelar" onclick="window.fecharModalAjuste()">Cancelar</button>
                <button class="btn-salvar" onclick="window.salvarAjusteFinanceiro('${ligaId}', '${timeId}', ${temporada})">
                    <span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">save</span>
                    Salvar Ajuste
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    document.getElementById('ajusteDescricao').focus();
};

/**
 * Salva ajuste financeiro para participante específico
 * v4.0: Usa os parâmetros passados ao invés de buscar do contexto
 */
window.salvarAjusteFinanceiro = async function(ligaId, timeId, temporada) {
    const descricao = document.getElementById('ajusteDescricao')?.value?.trim();
    const valorInput = parseFloat(document.getElementById('ajusteValor')?.value) || 0;
    const tipoAjuste = document.querySelector('input[name="tipoAjuste"]:checked')?.value || 'debito';

    // Validações
    if (!descricao) {
        alert('Descrição é obrigatória');
        return;
    }
    if (valorInput === 0) {
        alert('Valor não pode ser zero');
        return;
    }

    // Aplicar sinal baseado no tipo
    const valor = tipoAjuste === 'credito' ? Math.abs(valorInput) : -Math.abs(valorInput);

    try {
        console.log('[AJUSTE] Salvando:', { ligaId, timeId, temporada, descricao, valor, tipoAjuste });

        // ✅ v5.0: Usar rota de ajustes financeiros (collection ajustesfinanceiros)
        const response = await fetch(`/api/ajustes/${ligaId}/${timeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descricao: descricao,
                valor: valor,
                temporada: temporada
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || err.message || 'Erro ao salvar ajuste');
        }

        const resultado = await response.json();
        console.log('[AJUSTE] ✅ Salvo:', resultado);

        // Fechar modal e recarregar
        window.fecharModalAjuste();

        // Recarregar tabela
        if (window.recarregarFluxoFinanceiro) {
            window.recarregarFluxoFinanceiro();
        }

        // Feedback visual
        if (window.mostrarToast) {
            window.mostrarToast('Ajuste salvo com sucesso!', 'success');
        }

    } catch (error) {
        console.error('[AJUSTE] ❌ Erro:', error);
        alert('Erro ao salvar ajuste: ' + error.message);
    }
};

/**
 * Fecha modal de ajuste
 */
window.fecharModalAjuste = function() {
    const modal = document.getElementById('modalAjusteFinanceiro');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
};

/**
 * Salva novo ajuste
 */
window.salvarAjuste = async function() {
    const descricao = document.getElementById('ajusteDescricao')?.value?.trim();
    const valorInput = parseFloat(document.getElementById('ajusteValor')?.value) || 0;
    const tipoAjuste = document.querySelector('input[name="tipoAjuste"]:checked')?.value || 'debito';

    // Validacoes
    if (!descricao) {
        alert('Descricao e obrigatoria');
        return;
    }
    if (valorInput === 0) {
        alert('Valor nao pode ser zero');
        return;
    }

    // Aplicar sinal baseado no tipo
    const valor = tipoAjuste === 'credito' ? Math.abs(valorInput) : -Math.abs(valorInput);

    // Obter dados do participante atual
    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get('id');
    const timeId = window.fluxoFinanceiroUI?.participanteAtual?.time_id;

    if (!ligaId || !timeId) {
        alert('Erro: Participante nao identificado');
        return;
    }

    // Usar temporada do MODAL (não da lista principal)
    const temporadaModal = window.fluxoFinanceiroUI?.temporadaModalExtrato || 2026;

    try {
        const response = await fetch(`/api/ajustes/${ligaId}/${timeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descricao,
                valor,
                temporada: temporadaModal
            })
        });

        const result = await response.json();

        if (result.success) {
            window.fecharModalAjuste();
            // ✅ v7.3: Recarregar extrato usando a função de atualização
            if (window.atualizarExtratoModal) {
                await window.atualizarExtratoModal();
            }
        } else {
            alert('Erro ao salvar: ' + (result.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('[AJUSTES] Erro ao salvar:', error);
        alert('Erro de conexao ao salvar ajuste');
    }
};

/**
 * Remove ajuste existente
 */
window.removerAjuste = async function(ajusteId) {
    if (!confirm('Deseja remover este ajuste?')) return;

    // Usar temporada do MODAL (não da lista principal)
    const temporadaModal = window.fluxoFinanceiroUI?.temporadaModalExtrato || 2026;

    try {
        const response = await fetch(`/api/ajustes/${ajusteId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            // ✅ v7.3: Recarregar extrato usando a função de atualização
            if (window.atualizarExtratoModal) {
                await window.atualizarExtratoModal();
            }
        } else {
            alert('Erro ao remover: ' + (result.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('[AJUSTES] Erro ao remover:', error);
        alert('Erro de conexao ao remover ajuste');
    }
};

// =============================================================================
// MODAL: NOVO PARTICIPANTE (Implementação Direta no Fluxo Financeiro)
// =============================================================================

/**
 * Abre modal para cadastrar novo participante na temporada
 * ✅ v8.2: Implementação direta sem dependência de renovacao-core.js
 */
window.abrirNovoParticipante = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get('id');
    const temporada = window.temporadaAtual || 2026;

    if (!ligaId) {
        alert('Liga não identificada');
        return;
    }

    // Remover modal existente se houver
    const existente = document.getElementById('modalNovoParticipanteFluxo');
    if (existente) existente.remove();

    // Estado interno do modal
    const state = {
        timeSelecionado: null,
        modoAtual: 'busca-nome',
        buscando: false
    };

    // Helper para escapar HTML
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Criar modal HTML
    const modalHtml = `
    <div class="modal-overlay-fluxo" id="modalNovoParticipanteFluxo" style="z-index: 10000;">
        <div class="modal-content-fluxo" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header-fluxo">
                <h3>
                    <span class="material-icons" style="color: #3b82f6;">person_add</span>
                    Novo Participante ${temporada}
                </h3>
                <button class="modal-close-fluxo" onclick="window.fecharModalNovoParticipante()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-body-fluxo">
                <!-- TABS -->
                <div class="novo-participante-tabs">
                    <button class="tab-novo-participante active" data-tab="busca-nome" onclick="window.trocarTabNovoParticipante('busca-nome')">
                        <span class="material-icons">search</span> Buscar Nome
                    </button>
                    <button class="tab-novo-participante" data-tab="busca-id" onclick="window.trocarTabNovoParticipante('busca-id')">
                        <span class="material-icons">tag</span> Buscar ID
                    </button>
                    <button class="tab-novo-participante" data-tab="manual" onclick="window.trocarTabNovoParticipante('manual')">
                        <span class="material-icons">edit</span> Manual
                    </button>
                </div>

                <!-- TAB 1: BUSCA POR NOME -->
                <div id="panelBuscaNome" class="panel-novo-participante active">
                    <p style="color: #888; font-size: 0.85rem; margin-bottom: 12px;">
                        Busque o time pelo nome no banco de participantes existentes.
                    </p>
                    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <input type="text"
                               id="inputBuscaTimeNome"
                               placeholder="Digite o nome do time ou cartoleiro (min 3 letras)..."
                               style="flex: 1; background: #252525; border: 1px solid #333; border-radius: 6px; padding: 10px 12px; color: #fff;">
                        <button onclick="window.buscarTimeNovoParticipante('nome')" class="btn-buscar-novo"
                                style="background: #3b82f6; color: #fff; border: none; border-radius: 6px; padding: 10px 16px; cursor: pointer;">
                            <span class="material-icons" style="font-size: 18px; vertical-align: middle;">search</span>
                        </button>
                    </div>
                </div>

                <!-- TAB 2: BUSCA POR ID -->
                <div id="panelBuscaId" class="panel-novo-participante" style="display: none;">
                    <p style="color: #888; font-size: 0.85rem; margin-bottom: 12px;">
                        Informe o ID do Cartola FC enviado pelo participante.
                    </p>
                    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <input type="number"
                               id="inputBuscaTimeId"
                               placeholder="Ex: 12345678"
                               style="flex: 1; background: #252525; border: 1px solid #333; border-radius: 6px; padding: 10px 12px; color: #fff;">
                        <button onclick="window.buscarTimeNovoParticipante('id')" class="btn-buscar-novo"
                                style="background: #3b82f6; color: #fff; border: none; border-radius: 6px; padding: 10px 16px; cursor: pointer;">
                            <span class="material-icons" style="font-size: 18px; vertical-align: middle;">search</span>
                        </button>
                    </div>
                    <div style="background: #1e293b; border-radius: 6px; padding: 10px; font-size: 0.8rem; color: #94a3b8;">
                        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">info</span>
                        O participante encontra seu ID no app Cartola FC > Perfil > "ID do Time"
                    </div>
                </div>

                <!-- TAB 3: CADASTRO MANUAL -->
                <div id="panelManual" class="panel-novo-participante" style="display: none;">
                    <div style="background: #422006; border: 1px solid #854d0e; border-radius: 6px; padding: 10px; font-size: 0.8rem; color: #fbbf24; margin-bottom: 16px;">
                        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">warning</span>
                        <strong>Cadastro com pendencia</strong> - Os dados do Cartola FC serao vinculados posteriormente.
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: #888; margin-bottom: 4px;">Nome do Participante *</label>
                            <input type="text" id="inputNomeManual" placeholder="Ex: Joao Silva"
                                   style="width: 100%; background: #252525; border: 1px solid #333; border-radius: 6px; padding: 10px; color: #fff; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: #888; margin-bottom: 4px;">Apelido/Time</label>
                            <input type="text" id="inputApelidoManual" placeholder="Ex: Mengao FC"
                                   style="width: 100%; background: #252525; border: 1px solid #333; border-radius: 6px; padding: 10px; color: #fff; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: #888; margin-bottom: 4px;">Time do Coracao</label>
                            <select id="selectTimeCor" style="width: 100%; background: #252525; border: 1px solid #333; border-radius: 6px; padding: 10px; color: #fff; box-sizing: border-box;">
                                <option value="">Selecione...</option>
                                <option value="262">Flamengo</option>
                                <option value="275">Palmeiras</option>
                                <option value="264">Corinthians</option>
                                <option value="276">Sao Paulo</option>
                                <option value="277">Santos</option>
                                <option value="266">Fluminense</option>
                                <option value="267">Vasco</option>
                                <option value="263">Botafogo</option>
                                <option value="284">Gremio</option>
                                <option value="285">Internacional</option>
                                <option value="283">Cruzeiro</option>
                                <option value="282">Atletico-MG</option>
                                <option value="293">Athletico-PR</option>
                                <option value="265">Bahia</option>
                                <option value="356">Fortaleza</option>
                                <option value="354">Ceara</option>
                                <option value="0">Outro</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: #888; margin-bottom: 4px;">ID Cartola (se tiver)</label>
                            <input type="number" id="inputIdManual" placeholder="Preencher depois..."
                                   style="width: 100%; background: #252525; border: 1px solid #333; border-radius: 6px; padding: 10px; color: #fff; box-sizing: border-box;">
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <label style="display: block; font-size: 0.8rem; color: #888; margin-bottom: 4px;">Contato (WhatsApp/Email)</label>
                            <input type="text" id="inputContatoManual" placeholder="Ex: (11) 99999-9999"
                                   style="width: 100%; background: #252525; border: 1px solid #333; border-radius: 6px; padding: 10px; color: #fff; box-sizing: border-box;">
                        </div>
                    </div>
                </div>

                <!-- Loading -->
                <div id="loadingBuscaNovo" style="display: none; text-align: center; padding: 20px;">
                    <div class="loading-spinner" style="margin: 0 auto;"></div>
                    <p style="margin-top: 10px; color: #888;">Buscando...</p>
                </div>

                <!-- Resultados Busca -->
                <div id="resultadosBuscaNovo" style="max-height: 200px; overflow-y: auto; margin-bottom: 16px;"></div>

                <!-- Time Selecionado -->
                <div id="timeSelecionadoNovo" style="display: none;">
                    <hr style="border-color: #333; margin: 16px 0;">
                    <h6 style="margin-bottom: 12px; color: #fff;">Time Selecionado</h6>
                    <div style="display: flex; align-items: center; padding: 12px; background: #1a1a1a; border-radius: 8px; margin-bottom: 16px;">
                        <img id="escudoSelecionadoNovo" src="" alt="Escudo" style="width: 48px; height: 48px; border-radius: 6px; margin-right: 12px;">
                        <div style="flex: 1;">
                            <h6 id="nomeTimeSelecionadoNovo" style="margin: 0; color: #fff;"></h6>
                            <small id="nomeCartoleiroSelecionadoNovo" style="color: #888;"></small>
                        </div>
                        <button onclick="window.limparSelecaoNovoParticipante()" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; border-radius: 6px; padding: 6px 10px; cursor: pointer;">
                            <span class="material-icons" style="font-size: 18px; vertical-align: middle;">close</span>
                        </button>
                    </div>
                </div>

                <!-- Secao Confirmacao -->
                <div id="secaoConfirmacaoNovo" style="display: none;">
                    <hr style="border-color: #333; margin: 16px 0;">

                    <!-- Opcao Pagamento -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="checkPagouInscricaoNovo" checked
                                   style="width: 18px; height: 18px; margin-right: 10px;">
                            <span style="color: #fff; font-weight: 600;">Pagou a inscricao</span>
                        </label>
                        <small style="display: block; color: #888; margin-top: 4px; margin-left: 28px;">
                            Se marcado, taxa NAO vira debito. Se desmarcado, participante entra devendo a taxa.
                        </small>
                    </div>

                    <!-- Observacoes -->
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #888; margin-bottom: 4px;">Observacoes (opcional)</label>
                        <textarea id="txtObservacoesNovo" rows="2" placeholder="Indicado por, motivo da entrada..."
                                  style="width: 100%; background: #252525; border: 1px solid #333; border-radius: 6px; padding: 10px; color: #fff; resize: none; box-sizing: border-box;"></textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer-fluxo">
                <button class="btn-cancelar-fluxo" onclick="window.fecharModalNovoParticipante()">Cancelar</button>
                <button id="btnCadastrarNovoParticipante" class="btn-confirmar-fluxo" onclick="window.confirmarNovoParticipante()" disabled
                        style="background: #10b981;">
                    <span class="material-icons">person_add</span>
                    Cadastrar
                </button>
            </div>
        </div>
    </div>
    <style>
        .novo-participante-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }
        .tab-novo-participante {
            flex: 1;
            padding: 10px;
            background: #252525;
            border: 1px solid #333;
            border-radius: 6px;
            color: #888;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 0.85rem;
            transition: all 0.2s;
        }
        .tab-novo-participante:hover {
            border-color: #555;
        }
        .tab-novo-participante.active {
            background: rgba(59, 130, 246, 0.15);
            border-color: #3b82f6;
            color: #3b82f6;
        }
        .tab-novo-participante .material-icons {
            font-size: 18px;
        }
        .panel-novo-participante {
            display: none;
        }
        .panel-novo-participante.active {
            display: block;
        }
        .resultado-busca-item-novo {
            display: flex;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #333;
            cursor: pointer;
            transition: background 0.2s;
        }
        .resultado-busca-item-novo:hover {
            background: #252525;
        }
    </style>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Event listeners para Enter nos inputs de busca
    document.getElementById('inputBuscaTimeNome')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.buscarTimeNovoParticipante('nome');
    });
    document.getElementById('inputBuscaTimeId')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.buscarTimeNovoParticipante('id');
    });

    // Event listener para campos manuais - habilitar botão
    ['inputNomeManual', 'inputApelidoManual'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            const nome = document.getElementById('inputNomeManual')?.value.trim();
            if (state.modoAtual === 'manual' && nome && nome.length >= 2) {
                document.getElementById('btnCadastrarNovoParticipante').disabled = false;
                document.getElementById('secaoConfirmacaoNovo').style.display = 'block';
            }
        });
    });

    // Funções do modal
    window.fecharModalNovoParticipante = function() {
        const modal = document.getElementById('modalNovoParticipanteFluxo');
        if (modal) modal.remove();
    };

    window.trocarTabNovoParticipante = function(tab) {
        state.modoAtual = tab;
        state.timeSelecionado = null;

        // Atualizar tabs
        document.querySelectorAll('.tab-novo-participante').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Atualizar panels
        document.getElementById('panelBuscaNome').style.display = tab === 'busca-nome' ? 'block' : 'none';
        document.getElementById('panelBuscaId').style.display = tab === 'busca-id' ? 'block' : 'none';
        document.getElementById('panelManual').style.display = tab === 'manual' ? 'block' : 'none';

        // Reset UI
        document.getElementById('resultadosBuscaNovo').innerHTML = '';
        document.getElementById('timeSelecionadoNovo').style.display = 'none';
        document.getElementById('secaoConfirmacaoNovo').style.display = tab === 'manual' ? 'block' : 'none';
        document.getElementById('btnCadastrarNovoParticipante').disabled = tab !== 'manual';
    };

    window.buscarTimeNovoParticipante = async function(tipo) {
        if (state.buscando) return;

        const input = tipo === 'nome'
            ? document.getElementById('inputBuscaTimeNome')
            : document.getElementById('inputBuscaTimeId');

        const query = input?.value.trim();

        if (tipo === 'nome' && (!query || query.length < 3)) {
            alert('Digite pelo menos 3 caracteres para buscar');
            return;
        }

        if (tipo === 'id' && (!query || isNaN(query))) {
            alert('Digite um ID válido');
            return;
        }

        state.buscando = true;
        const loading = document.getElementById('loadingBuscaNovo');
        const resultados = document.getElementById('resultadosBuscaNovo');

        loading.style.display = 'block';
        resultados.innerHTML = '';

        try {
            let url, data;

            if (tipo === 'nome') {
                url = `/api/cartola/buscar-time?q=${encodeURIComponent(query)}&limit=20`;
                const response = await fetch(url);
                data = await response.json();
            } else {
                url = `/api/cartola/time/${query}`;
                const response = await fetch(url);
                const timeData = await response.json();
                data = timeData.success ? { success: true, times: [timeData.time || timeData] } : { success: false };
            }

            if (!data.success && !data.times) {
                resultados.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #888;">
                        <span class="material-icons" style="font-size: 36px; color: #ef4444;">search_off</span>
                        <p style="margin-top: 8px;">Nenhum resultado encontrado</p>
                    </div>`;
                return;
            }

            const times = data.times || [data];

            if (times.length === 0) {
                resultados.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #888;">
                        <span class="material-icons" style="font-size: 36px; color: #ef4444;">search_off</span>
                        <p style="margin-top: 8px;">Nenhum resultado encontrado</p>
                    </div>`;
                return;
            }

            resultados.innerHTML = times.map(time => `
                <div class="resultado-busca-item-novo"
                     onclick="window.selecionarTimeNovoParticipante(${time.time_id || time.id}, '${escapeHtml(time.nome_time || time.nome || '')}', '${escapeHtml(time.nome_cartoleiro || time.nome_cartola || '')}', '${escapeHtml(time.escudo_url || time.url_escudo_png || time.escudo || '')}')">
                    <img src="${escapeHtml(time.escudo_url || time.url_escudo_png || time.escudo || '/img/default-escudo.png')}"
                         alt="Escudo"
                         style="width: 36px; height: 36px; border-radius: 4px; margin-right: 12px;"
                         onerror="this.src='/img/default-escudo.png'">
                    <div style="flex: 1;">
                        <div style="color: #fff; font-weight: 600;">${escapeHtml(time.nome_time || time.nome || 'Time sem nome')}</div>
                        <small style="color: #888;">${escapeHtml(time.nome_cartoleiro || time.nome_cartola || '')}</small>
                    </div>
                    <small style="color: #555;">ID: ${time.time_id || time.id}</small>
                </div>
            `).join('');

        } catch (error) {
            console.error('[NOVO-PARTICIPANTE] Erro na busca:', error);
            resultados.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #ef4444;">
                    <span class="material-icons" style="font-size: 36px;">error</span>
                    <p style="margin-top: 8px;">Erro ao buscar: ${error.message}</p>
                </div>`;
        } finally {
            state.buscando = false;
            loading.style.display = 'none';
        }
    };

    window.selecionarTimeNovoParticipante = function(timeId, nomeTime, nomeCartoleiro, escudo) {
        state.timeSelecionado = {
            time_id: timeId,
            nome_time: nomeTime,
            nome_cartoleiro: nomeCartoleiro,
            escudo: escudo
        };

        // Mostrar time selecionado
        document.getElementById('timeSelecionadoNovo').style.display = 'block';
        document.getElementById('escudoSelecionadoNovo').src = escudo || '/img/default-escudo.png';
        document.getElementById('nomeTimeSelecionadoNovo').textContent = nomeTime || 'Time';
        document.getElementById('nomeCartoleiroSelecionadoNovo').textContent = nomeCartoleiro || '';

        // Esconder resultados e mostrar confirmação
        document.getElementById('resultadosBuscaNovo').innerHTML = '';
        document.getElementById('secaoConfirmacaoNovo').style.display = 'block';
        document.getElementById('btnCadastrarNovoParticipante').disabled = false;
    };

    window.limparSelecaoNovoParticipante = function() {
        state.timeSelecionado = null;
        document.getElementById('timeSelecionadoNovo').style.display = 'none';
        document.getElementById('secaoConfirmacaoNovo').style.display = 'none';
        document.getElementById('btnCadastrarNovoParticipante').disabled = true;
    };

    window.confirmarNovoParticipante = async function() {
        const btn = document.getElementById('btnCadastrarNovoParticipante');
        const pagouInscricao = document.getElementById('checkPagouInscricaoNovo')?.checked ?? true;
        const observacoes = document.getElementById('txtObservacoesNovo')?.value || '';

        let dadosTime = null;

        if (state.modoAtual === 'manual') {
            // Cadastro manual
            const nome = document.getElementById('inputNomeManual')?.value.trim();
            const apelido = document.getElementById('inputApelidoManual')?.value.trim();
            const timeCoracao = document.getElementById('selectTimeCor')?.value;
            const idCartola = document.getElementById('inputIdManual')?.value.trim();
            const contato = document.getElementById('inputContatoManual')?.value.trim();

            if (!nome || nome.length < 2) {
                alert('Informe o nome do participante');
                return;
            }

            dadosTime = {
                nome_cartoleiro: nome,
                nome_time: apelido || nome,
                time_id: idCartola ? parseInt(idCartola) : null,
                time_coracao: timeCoracao,
                contato: contato,
                pendente_sincronizacao: !idCartola,
                cadastro_manual: true
            };
        } else {
            // Busca - usar time selecionado
            if (!state.timeSelecionado) {
                alert('Selecione um time primeiro');
                return;
            }
            dadosTime = state.timeSelecionado;
        }

        // Desabilitar botão e mostrar loading
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">sync</span> Cadastrando...';

        try {
            const response = await fetch(`/api/inscricoes/${ligaId}/${temporada}/novo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...dadosTime,
                    pagouInscricao,
                    observacoes
                })
            });

            const result = await response.json();

            if (result.success) {
                const msg = dadosTime.pendente_sincronizacao
                    ? 'Participante cadastrado! Pendente vincular ID do Cartola.'
                    : 'Novo participante cadastrado com sucesso!';
                alert(msg);
                window.fecharModalNovoParticipante();

                // Recarregar fluxo financeiro
                if (window.fluxoFinanceiroOrquestrador?.recarregar) {
                    window.fluxoFinanceiroOrquestrador.recarregar();
                } else if (window.recarregarFluxoFinanceiro) {
                    window.recarregarFluxoFinanceiro();
                }
            } else {
                throw new Error(result.error || 'Erro ao cadastrar');
            }
        } catch (error) {
            console.error('[NOVO-PARTICIPANTE] Erro ao cadastrar:', error);
            alert('Erro: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons">person_add</span> Cadastrar';
        }
    };

    // Focar no input de busca
    setTimeout(() => {
        document.getElementById('inputBuscaTimeNome')?.focus();
    }, 100);
};

// =============================================================================
// ✅ v8.0: MODAL DE AJUSTES FINANCEIROS (2026+)
// =============================================================================

/**
 * Estado global para o modal de ajuste
 */
window._ajusteModalState = {
    timeId: null,
    temporada: 2026,
    ajusteId: null,      // Se editando
    modo: 'criar'        // 'criar' ou 'editar'
};

/**
 * Cria a estrutura do modal de ajuste no DOM
 */
window._criarModalAjuste = function() {
    if (document.getElementById('modalAjusteFinanceiro')) return;

    const modal = document.createElement('div');
    modal.id = 'modalAjusteFinanceiro';
    modal.className = 'modal-ajuste-overlay';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 15000;
        justify-content: center;
        align-items: center;
    `;

    modal.innerHTML = `
        <div class="modal-ajuste-container" style="
            background: #1a1a1a;
            border-radius: 16px;
            max-width: 400px;
            width: 90%;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        ">
            <div class="modal-ajuste-header" style="
                padding: 20px;
                background: linear-gradient(135deg, var(--laranja) 0%, #ff6b00 100%);
                color: #fff;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h3 id="tituloModalAjuste" style="margin: 0; font-size: 16px; font-weight: 600;">
                    <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 8px;">tune</span>
                    Novo Ajuste
                </h3>
                <button onclick="window.fecharModalAjuste()" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    border-radius: 8px;
                    padding: 6px;
                    cursor: pointer;
                    display: flex;
                ">
                    <span class="material-icons" style="font-size: 20px; color: #fff;">close</span>
                </button>
            </div>

            <div class="modal-ajuste-body" style="padding: 24px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Descricao do Ajuste
                    </label>
                    <input type="text" id="inputDescricaoAjuste"
                           maxlength="100"
                           placeholder="Ex: Premio Melhor Mes, Multa atraso..."
                           style="
                               width: 100%;
                               background: rgba(255,255,255,0.05);
                               border: 1px solid rgba(255,255,255,0.1);
                               border-radius: 8px;
                               padding: 14px 16px;
                               color: #fff;
                               font-size: 14px;
                               box-sizing: border-box;
                           ">
                    <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 4px; text-align: right;">
                        <span id="contadorDescricao">0</span>/100 caracteres
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Valor (R$)
                    </label>
                    <input type="number" id="inputValorAjuste"
                           step="0.01"
                           placeholder="Ex: 50.00 ou -20.00"
                           style="
                               width: 100%;
                               background: rgba(255,255,255,0.05);
                               border: 1px solid rgba(255,255,255,0.1);
                               border-radius: 8px;
                               padding: 14px 16px;
                               color: #fff;
                               font-size: 14px;
                               box-sizing: border-box;
                           ">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px;">
                        <span class="material-icons" style="font-size: 12px; vertical-align: middle;">info</span>
                        Use valor positivo para credito, negativo para debito
                    </div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button onclick="window.fecharModalAjuste()" style="
                        flex: 1;
                        padding: 14px;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: rgba(255,255,255,0.7);
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                    ">
                        Cancelar
                    </button>
                    <button id="btnSalvarAjuste" onclick="window.salvarAjuste()" style="
                        flex: 1;
                        padding: 14px;
                        background: linear-gradient(135deg, var(--laranja) 0%, #ff6b00 100%);
                        border: none;
                        border-radius: 8px;
                        color: #fff;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                    ">
                        <span class="material-icons" style="font-size: 16px;">save</span>
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.fecharModalAjuste();
        }
    });

    // Contador de caracteres
    document.getElementById('inputDescricaoAjuste').addEventListener('input', (e) => {
        document.getElementById('contadorDescricao').textContent = e.target.value.length;
    });

    console.log('[AJUSTES] Modal de ajuste criado');
};

/**
 * Abre modal para novo ajuste
 */
window.abrirModalNovoAjuste = function(timeId, temporada) {
    console.log('[AJUSTES] ✅ abrirModalNovoAjuste chamado:', { timeId, temporada });

    try {
        window._criarModalAjuste();

        window._ajusteModalState = {
            timeId: timeId,
            temporada: temporada || 2026,
            ajusteId: null,
            modo: 'criar'
        };

        // Limpar campos
        document.getElementById('inputDescricaoAjuste').value = '';
        document.getElementById('inputValorAjuste').value = '';
        document.getElementById('contadorDescricao').textContent = '0';
        document.getElementById('tituloModalAjuste').innerHTML = `
            <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 8px;">add_circle</span>
            Novo Ajuste
        `;

        // Mostrar modal
        const modal = document.getElementById('modalAjusteFinanceiro');
        if (modal) {
            modal.style.display = 'flex';
            console.log('[AJUSTES] ✅ Modal de ajuste exibido');
        } else {
            console.error('[AJUSTES] ❌ Modal de ajuste não encontrado!');
        }

        // Focar no input
        setTimeout(() => {
            document.getElementById('inputDescricaoAjuste')?.focus();
        }, 100);
    } catch (error) {
        console.error('[AJUSTES] ❌ Erro ao abrir modal:', error);
    }
};

/**
 * Abre modal para editar ajuste existente
 */
window.editarAjusteFinanceiro = function(ajusteId, descricao, valor) {
    window._criarModalAjuste();

    // Pegar timeId e temporada do estado atual do modal de extrato
    const timeId = window.fluxoFinanceiroUI?.participanteAtual?.time_id ||
                   window.fluxoFinanceiroUI?.participanteAtual?.id;
    const temporada = window.fluxoFinanceiroUI?.temporadaModalExtrato || window.temporadaAtual || 2026;

    window._ajusteModalState = {
        timeId: timeId,
        temporada: temporada,
        ajusteId: ajusteId,
        modo: 'editar'
    };

    // Preencher campos
    document.getElementById('inputDescricaoAjuste').value = descricao;
    document.getElementById('inputValorAjuste').value = valor;
    document.getElementById('contadorDescricao').textContent = descricao.length;
    document.getElementById('tituloModalAjuste').innerHTML = `
        <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 8px;">edit</span>
        Editar Ajuste
    `;

    // Mostrar modal
    const modal = document.getElementById('modalAjusteFinanceiro');
    modal.style.display = 'flex';

    // Focar no input
    setTimeout(() => {
        document.getElementById('inputDescricaoAjuste').focus();
    }, 100);
};

/**
 * Fecha modal de ajuste
 */
window.fecharModalAjuste = function() {
    const modal = document.getElementById('modalAjusteFinanceiro');
    if (modal) {
        modal.style.display = 'none';
    }
};

/**
 * Salva ajuste (criar ou atualizar)
 */
window.salvarAjuste = async function() {
    const state = window._ajusteModalState;
    const descricao = document.getElementById('inputDescricaoAjuste').value.trim();
    const valor = parseFloat(document.getElementById('inputValorAjuste').value);

    // Validacoes
    if (!descricao || descricao.length < 3) {
        alert('Informe uma descricao valida (minimo 3 caracteres)');
        return;
    }
    if (isNaN(valor) || valor === 0) {
        alert('Informe um valor valido (diferente de zero)');
        return;
    }

    const btn = document.getElementById('btnSalvarAjuste');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">sync</span> Salvando...';

    try {
        const ligaId = window.obterLigaId?.() || '';

        if (state.modo === 'criar') {
            // Criar novo ajuste
            await window.FluxoFinanceiroAjustesAPI.criarAjuste(ligaId, state.timeId, {
                descricao,
                valor,
                temporada: state.temporada
            });
            console.log('[AJUSTES] Ajuste criado com sucesso');
        } else {
            // Atualizar ajuste existente
            await window.FluxoFinanceiroAjustesAPI.atualizarAjuste(state.ajusteId, {
                descricao,
                valor
            });
            console.log('[AJUSTES] Ajuste atualizado com sucesso');
        }

        // Fechar modal
        window.fecharModalAjuste();

        // Atualizar extrato
        if (window.atualizarExtratoModal) {
            await window.atualizarExtratoModal();
        } else if (window.forcarRefreshExtrato && state.timeId) {
            await window.forcarRefreshExtrato(state.timeId);
        }

    } catch (error) {
        console.error('[AJUSTES] Erro ao salvar:', error);
        alert('Erro ao salvar ajuste: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons" style="font-size: 16px;">save</span> Salvar';
    }
};

/**
 * Remove ajuste com confirmacao
 */
window.removerAjusteFinanceiro = async function(ajusteId, descricao) {
    if (!confirm(`Remover ajuste "${descricao}"?`)) {
        return;
    }

    try {
        await window.FluxoFinanceiroAjustesAPI.removerAjuste(ajusteId);
        console.log('[AJUSTES] Ajuste removido com sucesso');

        // Atualizar extrato
        if (window.atualizarExtratoModal) {
            await window.atualizarExtratoModal();
        } else {
            const timeId = window.fluxoFinanceiroUI?.participanteAtual?.time_id ||
                           window.fluxoFinanceiroUI?.participanteAtual?.id;
            if (window.forcarRefreshExtrato && timeId) {
                await window.forcarRefreshExtrato(timeId);
            }
        }

    } catch (error) {
        console.error('[AJUSTES] Erro ao remover:', error);
        alert('Erro ao remover ajuste: ' + error.message);
    }
};

console.log('[FLUXO-UI] Funcoes de ajuste financeiro carregadas v8.0');

import { FluxoFinanceiroCampos } from "./fluxo-financeiro-campos.js";
import {
    FluxoFinanceiroAuditoria,
    injetarEstilosAuditoria,
} from "./fluxo-financeiro-auditoria.js";
import { formatarMoedaBR, parseMoedaBR } from "./fluxo-financeiro-utils.js";

/**
 * FLUXO-FINANCEIRO-UI.JS - v6.4 (Seletor de Temporadas no Modal)
 * ✅ v6.4: Seletor de temporadas (2025/2026) no modal de extrato individual
 *   - Permite ver histórico e quitação de temporadas anteriores
 *   - Mostra badge QUITADO e banner com detalhes da quitação
 *   - Mostra legado definido para próxima temporada
 * ✅ v6.3: Cards de resumo clicáveis para filtrar tabela
 *   - Card "A Receber" filtra devedores
 *   - Card "A Pagar" filtra credores
 *   - Card "Quitados" filtra participantes sem pendências
 *   - Sincronização com dropdown de filtro
 *   - Clique novamente no card ativo para limpar filtro
 * ✅ v6.2: Modal de Auditoria Financeira com exportação PDF
 *   - Novo botão "Auditoria" na tabela (substituiu "Registrar Acerto" e "Histórico")
 *   - Modal bonito com resumo financeiro completo
 *   - Histórico de acertos integrado
 *   - Exportação para PDF com jsPDF
 * ✅ v5.6: Renomeado 'Ajustes' para 'Aj. Manuais' + nova coluna 'Acertos'
 * ✅ v5.5: FIX - Passar temporada em todas as requisições de API
 * ✅ v5.4: Remove liga ID hardcoded - usa config dinâmica para determinar fases
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
        this.modalId = "modalExtratoFinanceiro";
        this.participanteAtual = null;
        injetarEstilosAuditoria();

        // ✅ v4.3: Detectar modo admin
        this.detectarModoAdmin();

        // ✅ v6.0: Criar modal no DOM
        this.criarModalExtrato();
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
                                <!-- Seletor de Temporada -->
                                <div class="modal-extrato-temporada-selector" id="modalExtratoTemporadaSelector">
                                    <button class="btn-temporada" data-temporada="2025" id="btnTemp2025">2025</button>
                                    <button class="btn-temporada active" data-temporada="2026" id="btnTemp2026">2026</button>
                                </div>
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
                        <button id="btnModalLimparCache" class="btn-recalc-cache" onclick="window.limparCacheExtratoModal()">
                            <span class="material-icons" style="font-size: 14px;">delete_sweep</span> Limpar Cache
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
                if (window.abrirModalAcerto) {
                    window.abrirModalAcerto(timeId, nome);
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
        window.limparCacheExtratoModal = async () => {
            if (this.participanteAtual && window.recalcularCacheParticipante) {
                const timeId = this.participanteAtual.time_id || this.participanteAtual.id;
                await window.recalcularCacheParticipante(timeId);
            }
        };

        // ✅ v6.4: Seletor de temporadas
        window.trocarTemporadaExtrato = async (temporada) => {
            await this.trocarTemporadaExtrato(temporada);
        };

        // Event listeners para botões de temporada
        const btnTemp2025 = modal.querySelector('#btnTemp2025');
        const btnTemp2026 = modal.querySelector('#btnTemp2026');

        if (btnTemp2025) {
            btnTemp2025.addEventListener('click', () => window.trocarTemporadaExtrato(2025));
        }
        if (btnTemp2026) {
            btnTemp2026.addEventListener('click', () => window.trocarTemporadaExtrato(2026));
        }

        // Inicializar temporada do modal
        this.temporadaModalExtrato = window.temporadaAtual || 2025;

        console.log('[FLUXO-UI] Modal de extrato criado');
    }

    /**
     * Abre o modal do extrato
     */
    abrirModalExtrato(participante) {
        console.log('[FLUXO-UI] Abrindo modal para:', participante?.nome || participante?.nomeTime);
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
    async trocarTemporadaExtrato(temporada) {
        console.log('[FLUXO-UI] Trocando temporada do extrato para:', temporada);

        if (!this.participanteAtual) {
            console.error('[FLUXO-UI] Nenhum participante ativo');
            return;
        }

        this.temporadaModalExtrato = temporada;

        // Atualizar botões visuais
        const btn2025 = document.getElementById('btnTemp2025');
        const btn2026 = document.getElementById('btnTemp2026');

        if (btn2025) btn2025.classList.toggle('active', temporada === 2025);
        if (btn2026) btn2026.classList.toggle('active', temporada === 2026);

        // Mostrar loading
        const modalBody = document.getElementById('modalExtratoBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="extrato-loading" style="text-align: center; padding: 40px;">
                    <div class="spinner-border text-warning" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p style="margin-top: 10px; color: #888;">Carregando extrato ${temporada}...</p>
                </div>
            `;
        }

        try {
            const timeId = this.participanteAtual.time_id || this.participanteAtual.id;
            const ligaId = window.ligaId || this.participanteAtual.liga_id;

            // Buscar extrato da temporada selecionada
            const response = await fetch(`/api/tesouraria/participante/${ligaId}/${timeId}?temporada=${temporada}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Erro ao buscar extrato: ${response.status}`);
            }

            const data = await response.json();

            // Verificar se tem quitação
            const badgeQuitacao = document.getElementById('modalExtratoBadgeQuitacao');
            if (badgeQuitacao) {
                if (data.quitacao?.quitado) {
                    badgeQuitacao.style.display = 'inline-flex';
                    badgeQuitacao.title = `Quitado em ${new Date(data.quitacao.data_quitacao).toLocaleDateString('pt-BR')} - ${data.quitacao.tipo}`;
                } else {
                    badgeQuitacao.style.display = 'none';
                }
            }

            // Renderizar extrato
            await this.renderizarExtratoTemporada(data, temporada);

        } catch (error) {
            console.error('[FLUXO-UI] Erro ao trocar temporada:', error);
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="extrato-erro" style="text-align: center; padding: 40px; color: #ef4444;">
                        <span class="material-icons" style="font-size: 48px;">error_outline</span>
                        <p style="margin-top: 10px;">Erro ao carregar extrato ${temporada}</p>
                        <p style="font-size: 12px; color: #888;">${error.message}</p>
                        <p style="font-size: 11px; color: #666; margin-top: 10px;">
                            ${temporada === 2026 ? 'Participante pode não ter sido renovado para 2026.' : ''}
                        </p>
                    </div>
                `;
            }
        }
    }

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
        const saldoFinal = isQuitado ? 0 : (resumo.saldo_final || resumo.saldo || 0);

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

        // Banner de Legado (se tem legado manual na temporada 2026 vindo de 2025)
        if (temporada === 2026 && data.legado_manual?.origem) {
            const valorLegado = data.legado_manual.valor_definido || 0;
            html += `
                <div class="extrato-legado-banner">
                    <div class="extrato-legado-banner-header">
                        <span class="material-icons">history</span>
                        <h4>Legado da Temporada 2025</h4>
                    </div>
                    <div class="extrato-quitado-banner-content">
                        <div class="extrato-quitado-item">
                            <label>Origem</label>
                            <span>${data.legado_manual.origem === 'quitacao_admin' ? 'Quitação Admin' : 'Acordo'}</span>
                        </div>
                        <div class="extrato-quitado-item">
                            <label>Valor Original</label>
                            <span class="${getValorClass(data.legado_manual.valor_original)}">${formatarMoeda(data.legado_manual.valor_original || 0)}</span>
                        </div>
                        <div class="extrato-quitado-item">
                            <label>Valor Definido</label>
                            <span class="${getValorClass(valorLegado)}">${formatarMoeda(valorLegado)}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Cards de Resumo
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

        // Saldo Final
        html += `
            <div class="saldo-final-card ${saldoFinal >= 0 ? 'saldo-final-positivo' : 'saldo-final-negativo'}">
                <div class="saldo-final-titulo">Saldo Final ${temporada}</div>
                <div class="saldo-final-valor">${formatarMoeda(saldoFinal)}</div>
                ${isQuitado ? '<span class="performance-badge excelente">QUITADO</span>' : ''}
            </div>
        `;

        // Se tem histórico de transações, mostrar tabela resumida
        // ✅ FIX: API retorna "rodadas", não "historico"
        const historicoRodadas = data.rodadas || data.historico || [];

        // ✅ v2.16: Separar transações especiais (inscrição, legado) das rodadas normais
        const transacoesEspeciais = historicoRodadas.filter(t => t.isTransacaoEspecial || t.tipo);
        const rodadasNormais = historicoRodadas.filter(t => !t.isTransacaoEspecial && !t.tipo);

        // Mostrar transações especiais primeiro (inscrição 2026, legado, etc.)
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

        // Mostrar tabela de rodadas se existirem
        if (rodadasNormais.length > 0) {
            const ultimasTransacoes = rodadasNormais.slice(-10).reverse();
            html += `
                <div class="detalhamento-container" style="margin-top: 20px;">
                    <div class="detalhamento-header">
                        <h3 class="detalhamento-titulo">Últimas Rodadas</h3>
                    </div>
                    <div class="tabela-wrapper" style="max-height: 300px;">
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
                                ${ultimasTransacoes.map(t => `
                                    <tr>
                                        <td class="rodada-col">${t.rodada}</td>
                                        <td>${t.posicao || '-'}</td>
                                        <td class="${getValorClass(t.bonusOnus)}">${formatarMoeda(t.bonusOnus || 0)}</td>
                                        <td class="${getValorClass(t.pontosCorridos)}">${t.pontosCorridos != null ? formatarMoeda(t.pontosCorridos) : '-'}</td>
                                        <td class="${getValorClass(t.mataMata)}">${t.mataMata != null ? formatarMoeda(t.mataMata) : '-'}</td>
                                        <td class="${getValorClass(t.top10)}">${t.top10 ? formatarMoeda(t.top10) : '-'}</td>
                                        <td class="saldo-col ${getValorClass(t.saldoAcumulado)}">${formatarMoeda(t.saldoAcumulado || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else if (!isQuitado && transacoesEspeciais.length === 0) {
            // Sem dados ainda
            html += `
                <div class="extrato-sem-dados-temporada">
                    <span class="material-icons">hourglass_empty</span>
                    <p>Nenhum dado de rodadas para ${temporada}</p>
                    <p class="hint">${temporada === 2026 ? 'A temporada 2026 ainda não começou ou o participante não foi renovado.' : 'Verifique se o cache foi gerado.'}</p>
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

        // ✅ v2.17: Seção de Ajustes Dinâmicos (temporada 2026+)
        if (temporada >= 2026 && window.isAdminMode) {
            const ajustes = data.ajustes || [];
            const totalAjustes = data.ajustes_total || 0;

            html += `
                <div class="extrato-ajustes-section" style="margin-top: 20px;">
                    <div class="extrato-ajustes-header">
                        <div class="extrato-ajustes-titulo">
                            <span class="material-icons">tune</span>
                            <h4>Ajustes Manuais</h4>
                            <span class="ajustes-total ${getValorClass(totalAjustes)}">${formatarMoeda(totalAjustes)}</span>
                        </div>
                        <button class="btn-adicionar-ajuste" onclick="window.abrirModalAjuste()">
                            <span class="material-icons">add</span>
                            Adicionar
                        </button>
                    </div>
                    <div class="extrato-ajustes-lista" id="ajustesListaContainer">
                        ${ajustes.length === 0 ? `
                            <div class="ajuste-vazio">
                                <span class="material-icons">info</span>
                                <span>Nenhum ajuste cadastrado</span>
                            </div>
                        ` : ajustes.map(a => `
                            <div class="ajuste-item" data-ajuste-id="${a._id}">
                                <div class="ajuste-info">
                                    <span class="ajuste-descricao">${a.descricao}</span>
                                    <span class="ajuste-data">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div class="ajuste-valor ${getValorClass(a.valor)}">${formatarMoeda(a.valor)}</div>
                                <button class="ajuste-remover" onclick="window.removerAjuste('${a._id}')" title="Remover ajuste">
                                    <span class="material-icons">close</span>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

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
            const temporada = window.temporadaAtual || 2025;
            const response = await fetch(`/api/tesouraria/liga/${ligaId}?temporada=${temporada}`);
            if (response.ok) {
                dadosSaldo = await response.json();
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

        // Mesclar dados de participantes com dados de saldo
        const participantesComSaldo = participantes.map(p => {
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

        // Ordenar por nome
        const participantesOrdenados = [...participantesComSaldo].sort((a, b) =>
            (a.nome_cartola || '').localeCompare(b.nome_cartola || '')
        );

        // Calcular totais
        const totais = dadosSaldo?.totais || {
            totalParticipantes: participantes.length,
            quantidadeCredores: 0,
            quantidadeDevedores: 0,
            quantidadeQuitados: participantes.length,
            totalAReceber: 0,
            totalAPagar: 0,
        };

        // Layout Dashboard com Cards de Resumo + Tabela Expandida
        container.innerHTML = `
            <div class="module-toolbar">
                <div class="toolbar-left">
                    <h2 class="module-title">
                        <span class="material-icons">account_balance_wallet</span>
                        Financeiro
                    </h2>
                    <!-- ✅ v7.9: Seletor de Temporada -->
                    <select id="seletorTemporada" class="temporada-selector" onchange="window.mudarTemporada(this.value)">
                        <option value="2026" ${(window.temporadaAtual || 2026) === 2026 ? 'selected' : ''}>2026</option>
                        <option value="2025" ${(window.temporadaAtual || 2026) === 2025 ? 'selected' : ''}>2025</option>
                    </select>
                    <div class="toolbar-stats">
                        <span class="stat-badge">
                            <span class="material-icons">people</span>
                            <span class="participantes-count">${participantes.length}</span>
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

            <!-- Tabela Financeira v3.1 - Layout Expandido -->
            <div class="fluxo-tabela-container">
                <table class="fluxo-participantes-tabela tabela-financeira">
                    <thead>
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
                    </thead>
                    <tbody id="participantesTableBody">
                        ${participantesOrdenados.map((p, idx) => this._renderizarLinhaTabela(p, idx, ligaId)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        window.totalParticipantes = participantes.length;
        window.participantesFluxo = participantesComSaldo;

        // Injetar estilos
        this._injetarEstilosWrapper();
        this._injetarEstilosTabelaCompacta();
        this._injetarEstilosTabelaExpandida();
        this._injetarModalAcerto();
    }

    /**
     * Renderiza uma linha da tabela financeira
     * v3.1: Valores monetários + Layout expandido
     */
    _renderizarLinhaTabela(p, idx, ligaId) {
        const timeId = p.time_id || p.id;
        const saldoFinal = p.saldoFinal || 0;
        const situacao = p.situacao || 'quitado';
        const breakdown = p.breakdown || {};

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
                        ${!isQuitado && Math.abs(saldoFinal) >= 0.01 ? `
                        <button onclick="window.abrirModalQuitacao('${ligaId}', '${timeId}', ${saldoFinal}, ${window.temporadaAtual || 2025}, '${(p.nome_cartola || '').replace(/'/g, "\\'")}')"
                                class="btn-acao btn-quitar" title="Quitar ${window.temporadaAtual || 2025}">
                            <span class="material-icons">lock</span>
                        </button>
                        ` : ''}
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

        // Tooltip dinâmico
        let tooltip = 'Clique para gerenciar renovação';
        if (status.status === 'renovado') {
            tooltip = status.pagouInscricao ? 'Renovado - Inscrição paga' : 'Renovado - Deve inscrição';
        } else if (status.status === 'novo') {
            tooltip = status.pagouInscricao ? 'Novo participante - Inscrição paga' : 'Novo participante - Deve inscrição';
        } else if (status.status === 'nao_participa') {
            tooltip = 'Não participa em 2026';
        }

        // Ícone de alerta para quem deve inscrição
        const alertaDevendo = (status.status === 'renovado' || status.status === 'novo') && status.pagouInscricao === false
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

    _injetarEstilosTabelaCompacta() {
        if (document.getElementById("fluxo-tabela-compacta-styles")) return;

        const style = document.createElement("style");
        style.id = "fluxo-tabela-compacta-styles";
        style.textContent = `
            /* ========================================
               TABELA COMPACTA DE PARTICIPANTES
               v2.1 - Cores Vivas + Colunas Compactas
               ======================================== */

            /* ✅ v2.1: Container com scroll OBRIGATÓRIO para sticky header */
            .fluxo-tabela-container {
                background: #1a1a1a;
                border: 1px solid rgba(255, 85, 0, 0.25);
                border-radius: 12px;
                position: relative;
                height: calc(100vh - 320px);  /* Altura FIXA baseada na viewport */
                min-height: 300px;
                max-height: 600px;
                overflow-y: scroll !important;  /* SCROLL forçado, não auto */
                overflow-x: auto;
            }

            /* Scrollbar elegante */
            .fluxo-tabela-container::-webkit-scrollbar {
                width: 6px;
            }
            .fluxo-tabela-container::-webkit-scrollbar-track {
                background: #1a1a1a;
            }
            .fluxo-tabela-container::-webkit-scrollbar-thumb {
                background: rgba(255, 85, 0, 0.4);
                border-radius: 3px;
            }
            .fluxo-tabela-container::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 85, 0, 0.6);
            }

            .fluxo-participantes-tabela {
                width: 100%;
                border-collapse: separate;  /* ✅ CRITICAL: separate é OBRIGATÓRIO para sticky funcionar */
                border-spacing: 0;
                font-size: 0.9rem;
                table-layout: fixed;
            }

            .fluxo-participantes-tabela thead {
                position: sticky;
                top: 0;
                z-index: 20;
            }

            /* ✅ v2.0: Cada TH precisa de sticky + background sólido */
            .fluxo-participantes-tabela th {
                position: sticky;
                top: 0;
                z-index: 20;
                background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
                color: #FF5500;
                font-weight: 700;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 10px 8px;
                text-align: left;
                border-bottom: 2px solid #FF5500;
            }

            .fluxo-participantes-tabela th.col-num {
                width: 36px;
                text-align: center;
            }

            .fluxo-participantes-tabela th.col-acoes {
                width: 80px;
                text-align: center;
            }

            .fluxo-participantes-tabela th.col-time {
                width: 140px;
            }

            /* Linhas da tabela */
            .participante-row-tabela {
                transition: all 0.15s ease;
                border-bottom: 1px solid rgba(255, 85, 0, 0.08);
            }

            .participante-row-tabela:nth-child(even) {
                background: rgba(255, 85, 0, 0.03);
            }

            .participante-row-tabela:hover {
                background: rgba(255, 85, 0, 0.12);
            }

            .participante-row-tabela.filtered-hidden {
                display: none;
            }

            .participante-row-tabela td {
                padding: 6px 8px;
                vertical-align: middle;
            }

            .participante-row-tabela td.col-num {
                text-align: center;
                color: #FF5500;
                font-size: 0.8rem;
                font-weight: 600;
            }

            /* Botão do participante */
            .participante-btn-tabela {
                display: flex;
                align-items: center;
                gap: 8px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px 6px;
                border-radius: 6px;
                transition: all 0.15s ease;
                width: 100%;
                text-align: left;
            }

            .participante-btn-tabela:hover {
                background: rgba(255, 85, 0, 0.15);
            }

            .participante-avatar-mini {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(255, 85, 0, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                flex-shrink: 0;
                border: 2px solid rgba(255, 85, 0, 0.4);
            }

            .participante-avatar-mini img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .participante-avatar-mini .material-icons {
                font-size: 18px;
                color: #FF5500;
            }

            .participante-nome-tabela {
                color: #fff;
                font-weight: 600;
                font-size: 0.9rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .time-nome-tabela {
                color: #aaa;
                font-size: 0.85rem;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: block;
            }

            /* Botões de ação - CORES VIVAS */
            .col-acoes {
                text-align: center !important;
            }

            .btn-tabela {
                width: 30px;
                height: 30px;
                border-radius: 6px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
                margin: 0 2px;
            }

            .btn-tabela .material-icons {
                font-size: 16px;
            }

            .btn-tabela:hover {
                transform: translateY(-2px);
                box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            }

            /* Botão Extrato - Laranja vivo */
            .btn-extrato {
                background: linear-gradient(135deg, #FF5500 0%, #cc4400 100%);
                border: none;
                color: #fff;
            }
            .btn-extrato:hover {
                background: linear-gradient(135deg, #ff6611 0%, #FF5500 100%);
            }

            /* Botão Auditar - Azul vivo */
            .btn-auditar-tabela {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                border: none;
                color: #fff;
            }
            .btn-auditar-tabela:hover {
                background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
            }

            /* Contador de resultados */
            .fluxo-resultados-busca {
                padding: 8px 16px;
                background: rgba(255, 85, 0, 0.05);
                border-top: 1px solid rgba(255, 85, 0, 0.1);
                font-size: 0.75rem;
                color: #888;
                text-align: center;
            }

            .fluxo-resultados-busca strong {
                color: #FF5500;
            }

            /* Responsivo */
            @media (max-width: 600px) {
                .fluxo-participantes-tabela th.col-time,
                .fluxo-participantes-tabela td.col-time {
                    display: none;
                }

                .fluxo-participantes-tabela th.col-num,
                .fluxo-participantes-tabela td.col-num {
                    width: 35px;
                }

                .participante-nome-tabela {
                    font-size: 0.8rem;
                }

                .btn-tabela {
                    width: 28px;
                    height: 28px;
                }

                .btn-tabela .material-icons {
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Estilos para tabela expandida com saldos e cards de resumo
     * v6.0 - Integração Tesouraria/Prestação de Contas
     */
    _injetarEstilosTabelaExpandida() {
        if (document.getElementById("fluxo-tabela-expandida-styles")) return;

        const style = document.createElement("style");
        style.id = "fluxo-tabela-expandida-styles";
        style.textContent = `
            /* ========================================
               TABELA EXPANDIDA + CARDS RESUMO
               v6.0 - Prestação de Contas Integrada
               ======================================== */

            /* Loading */
            .fluxo-loading-saldos {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 20px;
                gap: 16px;
            }
            .fluxo-loading-saldos p {
                color: #888;
                font-size: 0.9rem;
            }

            /* Cards de Resumo */
            .fluxo-resumo-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 12px;
                margin-bottom: 16px;
            }

            .resumo-card {
                background: #1a1a1a;
                border-radius: 10px;
                padding: 14px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                border: 1px solid #2d2d2d;
                position: relative;
                transition: all 0.2s ease;
            }

            .resumo-card.clickable {
                cursor: pointer;
            }
            .resumo-card.clickable:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            .resumo-card.clickable:active {
                transform: translateY(0);
            }
            .resumo-card.clickable.active {
                transform: scale(1.02);
                box-shadow: 0 0 0 2px currentColor;
            }
            .resumo-card.card-areceber.active {
                box-shadow: 0 0 0 2px #10b981, 0 4px 16px rgba(16, 185, 129, 0.3);
            }
            .resumo-card.card-apagar.active {
                box-shadow: 0 0 0 2px #ef4444, 0 4px 16px rgba(239, 68, 68, 0.3);
            }
            .resumo-card.card-quitados.active {
                box-shadow: 0 0 0 2px #9ca3af, 0 4px 16px rgba(156, 163, 175, 0.3);
            }

            .resumo-card.card-apagar {
                border-color: rgba(239, 68, 68, 0.3);
            }
            .resumo-card.card-areceber {
                border-color: rgba(16, 185, 129, 0.3);
            }
            .resumo-card.card-quitados {
                border-color: rgba(156, 163, 175, 0.3);
            }

            .resumo-icon {
                width: 42px;
                height: 42px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .card-apagar .resumo-icon {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }
            .card-areceber .resumo-icon {
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
            }
            .card-quitados .resumo-icon {
                background: rgba(156, 163, 175, 0.15);
                color: #9ca3af;
            }

            .resumo-icon .material-icons {
                font-size: 22px;
            }

            .resumo-info {
                display: flex;
                flex-direction: column;
            }

            .resumo-valor {
                font-size: 1.2rem;
                font-weight: 700;
                color: #fff;
            }
            .card-apagar .resumo-valor { color: #ef4444; }
            .card-areceber .resumo-valor { color: #10b981; }

            .resumo-label {
                font-size: 0.7rem;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .resumo-badge {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255,255,255,0.1);
                color: #fff;
                font-size: 0.7rem;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
            }

            /* Filtro de Situação */
            .toolbar-select {
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 6px;
                padding: 8px 12px;
                color: #fff;
                font-size: 0.85rem;
                cursor: pointer;
                outline: none;
            }
            .toolbar-select:focus {
                border-color: #FF5500;
            }

            /* ✅ v7.9: Seletor de Temporada */
            .temporada-selector {
                background: linear-gradient(135deg, #FF5500 0%, #cc4400 100%);
                border: none;
                border-radius: 8px;
                padding: 8px 16px;
                color: #fff;
                font-size: 0.9rem;
                font-weight: 700;
                cursor: pointer;
                outline: none;
                margin-left: 12px;
                box-shadow: 0 2px 8px rgba(255, 85, 0, 0.3);
                transition: all 0.2s ease;
            }
            .temporada-selector:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 85, 0, 0.4);
            }
            .temporada-selector:focus {
                box-shadow: 0 0 0 3px rgba(255, 85, 0, 0.3);
            }
            .temporada-selector option {
                background: #1a1a1a;
                color: #fff;
                padding: 8px;
            }

            /* Tabela Expandida */
            .tabela-expandida {
                table-layout: auto !important;
            }

            .tabela-expandida th.col-participante {
                width: auto;
                min-width: 180px;
            }

            .tabela-expandida th.col-saldo-temp,
            .tabela-expandida th.col-saldo-acertos,
            .tabela-expandida th.col-saldo-final {
                width: 100px;
                text-align: right;
            }

            .tabela-expandida th.col-situacao {
                width: 95px;
                text-align: center;
            }

            .tabela-expandida th.col-acoes-expandida {
                width: 110px;
                text-align: center;
            }

            /* ✅ Cabeçalhos Ordenáveis */
            .tabela-expandida th.sortable {
                cursor: pointer;
                user-select: none;
                transition: background 0.15s ease;
                padding: 10px 8px !important;
            }
            .tabela-expandida th.sortable:hover {
                background: rgba(255, 85, 0, 0.1);
            }
            .tabela-expandida th.sortable.sorted {
                background: rgba(255, 85, 0, 0.15);
            }
            .tabela-expandida th.sortable.sorted .th-text {
                color: #FF5500;
            }

            /* Conteúdo do cabeçalho com flexbox */
            .tabela-expandida .th-content {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .tabela-expandida .th-content.th-right {
                justify-content: flex-end;
                width: 100%;
            }
            .tabela-expandida .th-content.th-center {
                justify-content: center;
                width: 100%;
            }
            .tabela-expandida .th-text {
                white-space: nowrap;
            }

            /* Ícone de ordenação */
            .tabela-expandida th .sort-icon {
                font-size: 14px;
                opacity: 0.35;
                transition: all 0.15s ease;
                flex-shrink: 0;
            }
            .tabela-expandida th.sortable:hover .sort-icon {
                opacity: 0.7;
            }
            .tabela-expandida th.sortable.sorted .sort-icon {
                opacity: 1;
                color: #FF5500;
            }

            .tabela-expandida td.col-saldo-temp,
            .tabela-expandida td.col-saldo-acertos,
            .tabela-expandida td.col-saldo-final {
                text-align: right;
                font-size: 0.85rem;
                font-family: 'JetBrains Mono', monospace;
                white-space: nowrap;
            }

            .tabela-expandida td.col-situacao {
                text-align: center;
            }

            .tabela-expandida td.col-acoes-expandida {
                text-align: center;
            }

            /* Cores de Saldo */
            .saldo-positivo {
                color: #10b981 !important;
            }
            .saldo-negativo {
                color: #ef4444 !important;
            }
            .saldo-zero {
                color: #666;
            }

            /* Badges de Situação */
            .situacao-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 20px;
                font-size: 0.65rem;
                font-weight: 600;
                text-transform: uppercase;
            }
            .situacao-badge .material-icons {
                font-size: 12px;
            }

            .situacao-badge.devedor {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }
            .situacao-badge.credor {
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
            }
            .situacao-badge.quitado {
                background: rgba(156, 163, 175, 0.15);
                color: #9ca3af;
            }

            /* Info do participante na célula */
            .participante-info-cell {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                overflow: hidden;
            }
            .participante-time-tabela {
                font-size: 0.7rem;
                color: #666;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Botão Acerto - Verde */
            .btn-acerto {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border: none;
                color: #fff;
            }
            .btn-acerto:hover {
                background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
            }

            /* Botão Histórico - Cinza */
            .btn-historico {
                background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
                border: none;
                color: #fff;
            }
            .btn-historico:hover {
                background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            }

            /* Responsivo */
            @media (max-width: 900px) {
                .tabela-expandida th.col-saldo-temp,
                .tabela-expandida td.col-saldo-temp,
                .tabela-expandida th.col-saldo-acertos,
                .tabela-expandida td.col-saldo-acertos {
                    display: none;
                }
            }

            @media (max-width: 600px) {
                .fluxo-resumo-cards {
                    grid-template-columns: 1fr 1fr;
                }
                .resumo-card {
                    padding: 10px 12px;
                }
                .resumo-valor {
                    font-size: 1rem;
                }
                .tabela-expandida th.col-situacao,
                .tabela-expandida td.col-situacao {
                    display: none;
                }
            }

            /* ========================================
               TABELA FINANCEIRA v3.0 - Colunas por Módulo
               ======================================== */

            .tabela-financeira {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.8rem;
                table-layout: auto;
            }

            .tabela-financeira th,
            .tabela-financeira td {
                padding: 8px 10px;
                border-bottom: 1px solid #2d2d2d;
                vertical-align: middle;
            }

            .tabela-financeira thead {
                position: sticky;
                top: 0;
                z-index: 10;
            }

            .tabela-financeira th {
                background: linear-gradient(135deg, #1f1f1f 0%, #181818 100%);
                color: #FF5500;
                font-weight: 600;
                font-size: 0.7rem;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                white-space: nowrap;
                border-bottom: 2px solid #FF5500;
            }

            .tabela-financeira th.sortable {
                cursor: pointer;
                transition: background 0.15s;
            }
            .tabela-financeira th.sortable:hover {
                background: rgba(255, 85, 0, 0.15);
            }
            .tabela-financeira th.sortable.sorted {
                background: rgba(255, 85, 0, 0.12);
            }

            /* Ícone de ordenação */
            .th-sort {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .sort-icon {
                font-size: 16px;
                opacity: 0.5;
                transition: all 0.15s;
            }
            .sortable:hover .sort-icon {
                opacity: 0.8;
            }
            .sortable.sorted .sort-icon {
                opacity: 1;
                color: #FF5500;
            }

            .tabela-financeira .col-num {
                width: 40px;
                text-align: center;
                color: #666;
            }

            .tabela-financeira .col-participante {
                min-width: 160px;
                width: 18%;
            }

            .tabela-financeira .col-modulo {
                min-width: 90px;
                width: auto;
                text-align: right;
                font-family: 'JetBrains Mono', 'Consolas', monospace;
                font-size: 0.75rem;
                padding-right: 12px;
            }

            .tabela-financeira .col-saldo {
                min-width: 110px;
                width: 12%;
                text-align: right;
                font-family: 'JetBrains Mono', 'Consolas', monospace;
                font-size: 0.85rem;
                font-weight: 700;
                padding-right: 12px;
            }

            .tabela-financeira .col-acoes {
                width: 110px;
                text-align: center;
                white-space: nowrap;
            }

            /* Linha de ações - NUNCA quebra */
            .acoes-row {
                display: flex;
                flex-wrap: nowrap;
                gap: 6px;
                justify-content: center;
            }

            /* Valores coloridos */
            .val-positivo { color: #10b981; font-weight: 600; }
            .val-negativo { color: #ef4444; font-weight: 600; }
            .val-zero { color: #555; }

            /* Linha do Participante */
            .linha-participante {
                transition: background 0.1s;
            }
            .linha-participante:hover {
                background: rgba(255, 85, 0, 0.06);
            }
            .linha-participante:nth-child(even) {
                background: rgba(255, 255, 255, 0.02);
            }
            .linha-participante:nth-child(even):hover {
                background: rgba(255, 85, 0, 0.06);
            }
            .row-devedor {
                background: rgba(239, 68, 68, 0.04) !important;
            }
            .row-devedor:hover {
                background: rgba(239, 68, 68, 0.08) !important;
            }

            /* Célula Participante */
            .participante-cell {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                padding: 2px 0;
            }
            .participante-cell:hover .nome {
                color: #FF5500;
            }

            .avatar-mini {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                background: #2d2d2d;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                overflow: hidden;
            }
            .avatar-mini img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .avatar-mini .material-icons {
                font-size: 14px;
                color: #555;
            }

            .info-participante {
                display: flex;
                flex-direction: column;
                min-width: 0;
                line-height: 1.2;
            }
            .info-participante .nome {
                font-weight: 500;
                color: #fff;
                font-size: 0.8rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: color 0.15s;
            }
            .info-participante .time {
                font-size: 0.65rem;
                color: #666;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Botões de Ação */
            .btn-acao {
                width: 28px;
                height: 28px;
                min-width: 28px;
                border-radius: 5px;
                border: none;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                flex-shrink: 0;
            }
            .btn-acao .material-icons {
                font-size: 16px;
            }
            .btn-acao:hover {
                opacity: 0.8;
            }

            .btn-acerto { background: #10b981; }
            .btn-acerto:hover { background: #059669; }
            .btn-extrato { background: #FF5500; }
            .btn-extrato:hover { background: #cc4400; }
            .btn-auditoria { background: #3b82f6; }
            .btn-auditoria:hover { background: #2563eb; }
            .btn-hist { background: #4b5563; }
            .btn-hist:hover { background: #374151; }
            .btn-whatsapp { background: #25D366; }
            .btn-whatsapp:hover { background: #128C7E; }
            .btn-quitar { background: #f97316; }
            .btn-quitar:hover { background: #ea580c; }

            /* Responsivo */
            @media (max-width: 900px) {
                .tabela-financeira .col-modulo {
                    width: 45px;
                    padding: 6px 4px;
                    font-size: 0.7rem;
                }
                .tabela-financeira th {
                    font-size: 0.65rem;
                    padding: 6px 4px;
                }
            }
            @media (max-width: 700px) {
                .tabela-financeira .col-participante {
                    min-width: 100px;
                    max-width: 120px;
                }
                .info-participante .time {
                    display: none;
                }
                .btn-acao {
                    width: 24px;
                    height: 24px;
                    min-width: 24px;
                }
                .btn-acao .material-icons {
                    font-size: 14px;
                }
            }

            /* ========================================
               COLUNA 2026 - RENOVAÇÃO
               ======================================== */

            .col-2026 {
                text-align: center;
                min-width: 90px;
                white-space: nowrap;
            }

            .renovacao-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.7rem;
                font-weight: 600;
                text-transform: uppercase;
                transition: all 0.2s ease;
            }
            .renovacao-badge:hover {
                transform: scale(1.05);
                filter: brightness(1.1);
            }

            .badge-2026-pendente {
                background: rgba(245, 158, 11, 0.15);
                color: #f59e0b;
                border: 1px solid rgba(245, 158, 11, 0.3);
            }
            .badge-2026-renovado {
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            .badge-2026-nao-participa {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            .badge-2026-novo {
                background: rgba(59, 130, 246, 0.15);
                color: #3b82f6;
                border: 1px solid rgba(59, 130, 246, 0.3);
            }
            .badge-2026-renovado-devendo {
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
                border: 1px solid rgba(245, 158, 11, 0.5);
                box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
            }

            /* Toolbar 2026 */
            .toolbar-separator {
                width: 1px;
                height: 24px;
                background: #333;
                margin: 0 8px;
            }

            .toolbar-btn.btn-outline-warning {
                border: 1px solid #f59e0b;
                color: #f59e0b;
                background: transparent;
            }
            .toolbar-btn.btn-outline-warning:hover {
                background: rgba(245, 158, 11, 0.15);
            }

            .toolbar-btn.btn-outline-info {
                border: 1px solid #3b82f6;
                color: #3b82f6;
                background: transparent;
            }
            .toolbar-btn.btn-outline-info:hover {
                background: rgba(59, 130, 246, 0.15);
            }

            @media (max-width: 900px) {
                .col-2026 {
                    min-width: 70px;
                }
                .renovacao-badge {
                    font-size: 0.6rem;
                    padding: 3px 6px;
                }
            }
        `;
        document.head.appendChild(style);
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
        this._injetarEstilosModal();
        this._registrarFuncoesGlobaisAcerto();
    }

    /**
     * Estilos do modal de acerto
     */
    _injetarEstilosModal() {
        if (document.getElementById("fluxo-modal-acerto-styles")) return;

        const style = document.createElement("style");
        style.id = "fluxo-modal-acerto-styles";
        style.textContent = `
            .modal-overlay-fluxo {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            .modal-overlay-fluxo.active {
                display: flex;
            }

            .modal-content-fluxo {
                background: #1a1a1a;
                border-radius: 12px;
                border: 1px solid #333;
                width: 90%;
                max-width: 420px;
                max-height: 90vh;
                overflow-y: auto;
            }

            .modal-header-fluxo {
                padding: 16px 20px;
                border-bottom: 1px solid #333;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .modal-header-fluxo h3 {
                font-size: 1.1rem;
                font-weight: 700;
                color: #fff;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .modal-close-fluxo {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                padding: 4px;
            }
            .modal-close-fluxo:hover {
                color: #fff;
            }

            .modal-body-fluxo {
                padding: 20px;
            }

            .modal-participante-info-fluxo {
                background: #252525;
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 16px;
            }
            .modal-participante-info-fluxo h4 {
                font-size: 0.95rem;
                font-weight: 600;
                color: #fff;
                margin: 0 0 4px 0;
            }
            .modal-participante-info-fluxo span {
                font-size: 0.8rem;
                color: #888;
            }

            .form-group-fluxo {
                margin-bottom: 16px;
            }
            .form-group-fluxo label {
                display: block;
                font-size: 0.8rem;
                font-weight: 500;
                color: #888;
                margin-bottom: 6px;
            }
            .form-group-fluxo input,
            .form-group-fluxo select {
                width: 100%;
                background: #252525;
                border: 1px solid #333;
                border-radius: 6px;
                padding: 10px 12px;
                font-size: 0.9rem;
                color: #fff;
                outline: none;
                box-sizing: border-box;
            }
            .form-group-fluxo input:focus,
            .form-group-fluxo select:focus {
                border-color: #FF5500;
            }

            .tipo-acerto-btns {
                display: flex;
                gap: 10px;
            }
            .tipo-btn {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                border: 2px solid #333;
                background: transparent;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                color: #888;
                font-size: 0.8rem;
                font-weight: 600;
                transition: all 0.2s ease;
            }
            .tipo-btn .material-icons {
                font-size: 22px;
            }
            .tipo-btn:hover {
                border-color: #555;
            }
            .tipo-btn.pagamento.active {
                border-color: #10b981;
                background: rgba(16, 185, 129, 0.1);
                color: #10b981;
            }
            .tipo-btn.recebimento.active {
                border-color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
            }

            .btn-zerar-saldo-fluxo {
                width: 100%;
                background: rgba(59, 130, 246, 0.1);
                color: #3b82f6;
                border: 1px dashed #3b82f6;
                border-radius: 6px;
                padding: 10px;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            .btn-zerar-saldo-fluxo:hover {
                background: rgba(59, 130, 246, 0.2);
            }
            .btn-zerar-saldo-fluxo .material-icons {
                font-size: 18px;
            }

            .modal-footer-fluxo {
                padding: 16px 20px;
                border-top: 1px solid #333;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .btn-cancelar-fluxo {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                background: #333;
                border: none;
                color: #888;
            }
            .btn-confirmar-fluxo {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                background: #10b981;
                border: none;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .btn-confirmar-fluxo:hover {
                background: #059669;
            }
            .btn-confirmar-fluxo .material-icons {
                font-size: 18px;
            }
        `;
        document.head.appendChild(style);
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

            // Reset form
            document.getElementById('acertoValor').value = '';
            document.getElementById('acertoDescricao').value = '';
            document.getElementById('acertoMetodo').value = 'pix';
            window.selecionarTipoAcerto('pagamento');

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
                        temporada: window.temporadaAtual || 2025, // Temporada dinamica
                    })
                });

                const data = await response.json();

                if (!data.success) throw new Error(data.error);

                window.fecharModalAcerto();

                let msg = data.message;
                if (data.troco) {
                    msg += `\n\n${data.troco.mensagem}`;
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
                        valorA = a.saldoTemporada || 0;
                        valorB = b.saldoTemporada || 0;
                        break;

                    case 'acertos':
                        valorA = a.saldoAcertos || 0;
                        valorB = b.saldoAcertos || 0;
                        break;

                    case 'saldo':
                        valorA = a.saldoFinal || 0;
                        valorB = b.saldoFinal || 0;
                        break;

                    case 'situacao':
                        const ordem = { devedor: 1, credor: 2, quitado: 3 };
                        valorA = ordem[a.situacao] || 3;
                        valorB = ordem[b.situacao] || 3;
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
                const temporada = window.temporadaAtual || 2025;
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

        // ✅ v7.9: Mudar temporada e recarregar dados
        window.mudarTemporada = async (novaTemporada) => {
            const temporadaNum = parseInt(novaTemporada);
            const temporadaAnterior = window.temporadaAtual;

            if (temporadaNum === temporadaAnterior) {
                console.log('[FLUXO-UI] Temporada já selecionada:', temporadaNum);
                return;
            }

            console.log(`[FLUXO-UI] 🔄 Mudando temporada: ${temporadaAnterior} → ${temporadaNum}`);

            // Atualizar variável global
            window.temporadaAtual = temporadaNum;

            // Salvar preferência no localStorage
            localStorage.setItem('temporadaSelecionada', temporadaNum);

            // Limpar cache atual (async)
            if (window.fluxoFinanceiroCache) {
                await window.fluxoFinanceiroCache.limparCache();
            }

            // Forçar reload para garantir dados frescos da nova temporada
            location.reload();
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

        window.extratoAtual = extrato;
        const camposEditaveisHTML = await this.renderizarCamposEditaveis(
            participante.time_id || participante.id,
        );

        // ✅ v4.5: Popular cache no backend quando admin visualiza (silencioso)
        const timeId = participante.time_id || participante.id;
        this.popularCacheBackend(timeId, extrato);

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
            <div class="extrato-header-card" style="position: relative; padding: 24px;">
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

            ${camposEditaveisHTML}

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

    /**
     * ✅ v6.2: Renderiza seção de Acertos Financeiros no extrato
     * Mostra a composição do saldo: Rodadas + Acertos = Saldo Final
     */
    _renderizarSecaoAcertos(extrato) {
        const acertos = extrato.acertos?.lista || [];
        const saldoTemporada = extrato.resumo?.saldo_temporada ?? extrato.resumo?.saldo ?? 0;
        const saldoAcertos = extrato.resumo?.saldo_acertos ?? 0;
        const saldoFinal = extrato.resumo?.saldo ?? 0;

        // Se não tem acertos, não mostrar seção
        if (acertos.length === 0 && saldoAcertos === 0) {
            return '';
        }

        const formatarValor = (v) => Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const corSaldoTemp = saldoTemporada >= 0 ? 'text-success' : 'text-danger';
        const corSaldoAcertos = saldoAcertos >= 0 ? 'text-success' : 'text-danger';
        const corSaldoFinal = saldoFinal >= 0 ? 'text-success' : 'text-danger';

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

                <!-- Resumo da composição -->
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13px;">
                        <span style="color: rgba(255,255,255,0.7);">Saldo Financeiro:</span>
                        <span class="${corSaldoTemp}" style="font-weight: 600;">${saldoTemporada >= 0 ? '+' : '-'}R$ ${formatarValor(saldoTemporada)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13px;">
                        <span style="color: rgba(255,255,255,0.7);">Acertos Manuais:</span>
                        <span class="${corSaldoAcertos}" style="font-weight: 600;">${saldoAcertos >= 0 ? '+' : '-'}R$ ${formatarValor(saldoAcertos)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-top: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 14px;">
                        <span style="color: #fff; font-weight: 700;">SALDO FINAL:</span>
                        <span class="${corSaldoFinal}" style="font-weight: 700; font-size: 16px;">${saldoFinal >= 0 ? '+' : '-'}R$ ${formatarValor(saldoFinal)}</span>
                    </div>
                </div>
            </div>
        `;
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
                                        ${formatarMoedaBR(p.saldoFinal)}
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
        // ✅ v6.3: Terminologia correta
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

// =============================================================================
// MODAL DE AUDITORIA FINANCEIRA - v1.0
// Exibe relatório completo de auditoria financeira do participante
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
 * Injeta estilos do modal de auditoria financeira
 */
function injetarEstilosModalAuditoriaFinanceira() {
    if (document.getElementById('auditoria-modal-financeira-styles')) return;

    const style = document.createElement('style');
    style.id = 'auditoria-modal-financeira-styles';
    style.textContent = `
        /* ========================================
           MODAL DE AUDITORIA FINANCEIRA
           ======================================== */
        .modal-auditoria-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }
        .modal-auditoria-overlay.active {
            display: flex;
        }

        .modal-auditoria-container {
            background: linear-gradient(180deg, #1a1a1a 0%, #121212 100%);
            border-radius: 16px;
            border: 1px solid rgba(255, 85, 0, 0.3);
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 85, 0, 0.1);
        }

        .modal-auditoria-header {
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 85, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(90deg, rgba(255, 85, 0, 0.1) 0%, transparent 100%);
        }
        .modal-auditoria-header .header-info {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .modal-auditoria-header .header-icon {
            font-size: 32px;
            color: #FF5500;
        }
        .modal-auditoria-header h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 700;
            color: #fff;
        }
        .modal-auditoria-header .header-sub {
            font-size: 0.8rem;
            color: #888;
        }
        .modal-auditoria-close {
            background: rgba(255, 255, 255, 0.05);
            border: none;
            color: #888;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .modal-auditoria-close:hover {
            background: rgba(255, 85, 0, 0.2);
            color: #FF5500;
        }

        .modal-auditoria-body {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        }

        /* Loading state */
        .auditoria-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: #888;
        }
        .loading-spinner-audit {
            width: 40px;
            height: 40px;
            border: 3px solid #333;
            border-top-color: #FF5500;
            border-radius: 50%;
            animation: spinAudit 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spinAudit {
            to { transform: rotate(360deg); }
        }

        /* Seções da auditoria */
        .audit-section {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
        }
        .audit-section-header {
            background: rgba(255, 85, 0, 0.08);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .audit-section-header .material-icons {
            color: #FF5500;
            font-size: 20px;
        }
        .audit-section-header h4 {
            margin: 0;
            font-size: 0.9rem;
            font-weight: 600;
            color: #fff;
        }
        .audit-section-body {
            padding: 16px;
        }

        /* Tabela de resumo */
        .audit-table {
            width: 100%;
            border-collapse: collapse;
        }
        .audit-table tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .audit-table tr:last-child {
            border-bottom: none;
        }
        .audit-table td {
            padding: 10px 0;
            font-size: 0.9rem;
        }
        .audit-table td:first-child {
            color: #999;
        }
        .audit-table td:last-child {
            text-align: right;
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
        }
        .audit-table tr.total-row td {
            padding-top: 14px;
            font-size: 1rem;
            color: #fff;
        }
        .audit-table tr.total-row td:last-child {
            font-size: 1.1rem;
        }
        .audit-table .separator-row td {
            padding: 4px 0;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
        }

        /* Status badge */
        .audit-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.95rem;
        }
        .audit-status.status-quitado {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .audit-status.status-devedor {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .audit-status.status-credor {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        /* Valores */
        .val-positivo { color: #10b981; }
        .val-negativo { color: #ef4444; }
        .val-neutro { color: #888; }

        /* Lista de histórico */
        .audit-history-list {
            max-height: 200px;
            overflow-y: auto;
        }
        .audit-history-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 8px;
            margin-bottom: 6px;
        }
        .audit-history-item:last-child {
            margin-bottom: 0;
        }
        .history-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .history-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .history-icon.pagamento {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
        }
        .history-icon.recebimento {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }
        .history-info {
            display: flex;
            flex-direction: column;
        }
        .history-desc {
            font-size: 0.85rem;
            color: #fff;
        }
        .history-date {
            font-size: 0.75rem;
            color: #666;
        }
        .history-valor {
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
        }

        /* Campos manuais */
        .audit-campos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 10px;
        }
        .audit-campo-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .campo-nome {
            font-size: 0.75rem;
            color: #888;
        }
        .campo-valor {
            font-size: 1rem;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
        }

        /* Empty state */
        .audit-empty {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.85rem;
        }

        /* Footer */
        .modal-auditoria-footer {
            padding: 16px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        .btn-audit-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #888;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .btn-audit-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        .btn-audit-pdf {
            background: linear-gradient(135deg, #FF5500 0%, #cc4400 100%);
            border: none;
            color: #fff;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(255, 85, 0, 0.3);
        }
        .btn-audit-pdf:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 85, 0, 0.4);
        }
        .btn-audit-pdf .material-icons,
        .btn-audit-secondary .material-icons {
            font-size: 18px;
        }

        /* Responsivo */
        @media (max-width: 600px) {
            .modal-auditoria-container {
                max-height: 95vh;
                border-radius: 12px 12px 0 0;
                position: fixed;
                bottom: 0;
                max-width: 100%;
            }
            .audit-campos-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
    `;
    document.head.appendChild(style);
}

// Dados da auditoria atual (para exportar PDF)
let auditoriaAtual = null;

/**
 * Abre o modal de auditoria financeira
 */
window.abrirAuditoriaFinanceira = async function(timeId, ligaId, nomeParticipante) {
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
        const temporada = window.temporadaAtual || 2025;

        // Buscar dados via API de tesouraria
        const response = await fetch(`/api/tesouraria/participante/${ligaId}/${timeId}?temporada=${temporada}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        // Salvar para exportação PDF
        auditoriaAtual = {
            participante: data.participante,
            financeiro: data.financeiro,
            acertos: data.acertos || [],
            dataGeracao: new Date()
        };

        // Renderizar conteúdo
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
};

/**
 * Renderiza o conteúdo da auditoria no modal
 */
function renderizarConteudoAuditoria(data, container, subtitulo) {
    const { participante, financeiro, acertos } = data;

    // Atualizar subtítulo
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

    // Histórico de acertos HTML
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
                        <td>Campos Manuais (Prêmios)</td>
                        <td class="${fmtClass(financeiro.saldoCampos)}">${fmtSinal(financeiro.saldoCampos)}R$ ${fmt(financeiro.saldoCampos)}</td>
                    </tr>
                    <tr class="separator-row"><td colspan="2"></td></tr>
                    <tr>
                        <td><strong>Crédito/Débito Base</strong></td>
                        <td class="${fmtClass(financeiro.saldoTemporada)}"><strong>${fmtSinal(financeiro.saldoTemporada)}R$ ${fmt(financeiro.saldoTemporada)}</strong></td>
                    </tr>
                    <tr>
                        <td>Pagamentos (Participante → Admin)</td>
                        <td class="val-positivo">+R$ ${fmt(financeiro.totalPago)}</td>
                    </tr>
                    <tr>
                        <td>Recebimentos (Admin → Participante)</td>
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

        <!-- Histórico de Acertos -->
        <div class="audit-section">
            <div class="audit-section-header">
                <span class="material-icons">history</span>
                <h4>Histórico de Acertos (${acertos.length})</h4>
            </div>
            <div class="audit-section-body">
                <div class="audit-history-list">
                    ${acertosHtml}
                </div>
            </div>
        </div>

        <!-- Legenda -->
        <div style="background: rgba(255, 255, 255, 0.02); border-radius: 8px; padding: 12px 16px; font-size: 0.75rem; color: #666;">
            <strong style="color: #888;">Lógica dos Acertos:</strong><br>
            • <span class="val-positivo">Pagamento</span> = participante paga admin (abate dívida) → SOMA ao saldo<br>
            • <span class="val-negativo">Recebimento</span> = admin paga participante (abate crédito) → SUBTRAI do saldo
        </div>
    `;
}

/**
 * Fecha o modal de auditoria
 */
window.fecharModalAuditoria = function() {
    const modal = document.getElementById('modal-auditoria-financeira');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

/**
 * Exporta a auditoria para PDF
 */
window.exportarAuditoriaPDF = async function() {
    if (!auditoriaAtual) {
        alert('Nenhuma auditoria carregada para exportar.');
        return;
    }

    const { participante, financeiro, acertos, dataGeracao } = auditoriaAtual;

    // Verificar se jsPDF está disponível
    if (typeof window.jspdf === 'undefined') {
        // Carregar jsPDF dinamicamente
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => gerarPDFAuditoria();
        document.head.appendChild(script);
    } else {
        gerarPDFAuditoria();
    }
};

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

    // ========== CABEÇALHO ==========
    doc.setFillColor(...laranja);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('AUDITORIA FINANCEIRA', margin, 15);
    // Nota: Evitamos acentos pois jsPDF nao suporta bem UTF-8 por padrao

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

    // ========== HISTÓRICO DE ACERTOS ==========
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

    // ========== RODAPÉ ==========
    doc.setFontSize(8);
    doc.setTextColor(...cinza);
    doc.text('Super Cartola Manager - Relatorio gerado automaticamente', pageWidth / 2, 290, { align: 'center' });

    // Salvar PDF
    const nomeArquivo = `auditoria_${(participante.nomeCartola || 'participante').replace(/\s+/g, '_')}_${financeiro.temporada}.pdf`;
    doc.save(nomeArquivo);
};

console.log("[FLUXO-UI] ✅ v6.4 Cards clicáveis + Modal de Auditoria + Ajustes Dinâmicos 2026+");

// =============================================================================
// AJUSTES DINÂMICOS (Temporada 2026+)
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
            // Recarregar extrato MANTENDO a temporada atual do modal
            if (window.fluxoFinanceiroUI?.trocarTemporadaExtrato) {
                window.fluxoFinanceiroUI.trocarTemporadaExtrato(temporadaModal);
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
            // Recarregar extrato MANTENDO a temporada atual do modal
            if (window.fluxoFinanceiroUI?.trocarTemporadaExtrato) {
                window.fluxoFinanceiroUI.trocarTemporadaExtrato(temporadaModal);
            }
        } else {
            alert('Erro ao remover: ' + (result.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('[AJUSTES] Erro ao remover:', error);
        alert('Erro de conexao ao remover ajuste');
    }
};

/**
 * Renovacao Modals Module
 *
 * Templates HTML dos modais de renovação/inscrição.
 * Todos os modais usam Material Icons e padrões do sistema.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

const RenovacaoModals = (function() {
    'use strict';

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Escapa JSON para uso seguro em data-attributes HTML
     * Evita quebra de atributos com aspas simples
     */
    function escapeJsonAttr(obj) {
        return JSON.stringify(obj).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }

    /**
     * Escapa string para prevenir XSS em HTML
     * @param {string} str - String a escapar
     * @returns {string} String escapada
     */
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    }

    function formatarData(data) {
        if (!data) return '-';
        return new Date(data).toLocaleDateString('pt-BR');
    }

    function getStatusBadge(status) {
        const badges = {
            pendente: '<span class="badge bg-warning text-dark"><span class="material-icons" style="font-size: 14px; vertical-align: middle;">schedule</span> Pendente</span>',
            renovado: '<span class="badge bg-success"><span class="material-icons" style="font-size: 14px; vertical-align: middle;">check_circle</span> Renovado</span>',
            nao_participa: '<span class="badge bg-danger"><span class="material-icons" style="font-size: 14px; vertical-align: middle;">cancel</span> Nao Participa</span>',
            novo: '<span class="badge bg-info"><span class="material-icons" style="font-size: 14px; vertical-align: middle;">person_add</span> Novo</span>'
        };
        return badges[status] || badges.pendente;
    }

    function getQuitacaoBadge(status) {
        const badges = {
            quitado: '<span class="badge bg-success">Quitado</span>',
            credor: '<span class="badge bg-info">A Receber</span>',
            devedor: '<span class="badge bg-danger">Devedor</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">-</span>';
    }

    /**
     * Renderiza alertas sobre dados de quitação existentes
     * Integração com o modal de Quitação
     */
    function renderAlertasQuitacao(preview) {
        if (!preview) return '';

        const alertas = [];

        // Caso 1: Extrato da temporada anterior já foi quitado
        if (preview.quitacao?.quitado) {
            const tipoLabel = {
                zerado: 'zerado (perdoado)',
                integral: 'integral',
                customizado: 'customizado'
            }[preview.quitacao.tipo] || preview.quitacao.tipo;

            alertas.push(`
                <div class="alert alert-success py-2 mb-2">
                    <span class="material-icons" style="vertical-align: middle; font-size: 18px;">verified</span>
                    <strong>Temporada ${preview.temporadaOrigem} quitada!</strong>
                    Tipo: ${tipoLabel}
                    ${preview.quitacao.valor_legado !== undefined ?
                        ` | Legado definido: ${formatarMoeda(preview.quitacao.valor_legado)}` : ''}
                </div>
            `);
        }

        // Caso 2: Já existe inscrição com legado_manual definido
        if (preview.inscricaoExistente?.legado_manual?.origem) {
            const legado = preview.inscricaoExistente.legado_manual;
            const origem = legado.origem === 'quitacao_admin' ? 'Quitação' : 'Renovação';

            alertas.push(`
                <div class="alert alert-warning py-2 mb-2">
                    <span class="material-icons" style="vertical-align: middle; font-size: 18px;">history</span>
                    <strong>Legado já definido!</strong>
                    Origem: ${origem} |
                    Valor: ${formatarMoeda(legado.valor_definido)}
                    <br>
                    <small class="text-muted">Esta renovação usará o legado já configurado.</small>
                </div>
            `);
        }

        // Caso 3: Inscrição já processada anteriormente
        if (preview.inscricaoExistente?.status === 'renovado') {
            alertas.push(`
                <div class="alert alert-info py-2 mb-2">
                    <span class="material-icons" style="vertical-align: middle; font-size: 18px;">check_circle</span>
                    <strong>Já renovado!</strong>
                    Esta inscrição foi processada anteriormente.
                    ${preview.inscricaoExistente.pagou_inscricao ?
                        'Inscrição paga.' :
                        '<span class="text-warning">Inscrição não paga (débito no extrato).</span>'}
                </div>
            `);
        }

        return alertas.join('');
    }

    // =========================================================================
    // MODAL: CONFIGURACAO DA LIGA
    // =========================================================================

    function modalConfigLiga(ligaId, ligaNome, rules, temporada) {
        const isDefault = rules._isDefault;
        const inscricao = rules.inscricao || {};
        const mensagens = rules.mensagens || {};

        return `
        <div class="modal fade" id="modalConfigLiga" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-xl">
                <div class="modal-content bg-gray-800 text-white">
                    <div class="modal-header border-gray-700">
                        <h5 class="modal-title">
                            <span class="material-icons" style="vertical-align: middle;">settings</span>
                            Configurar Renovacao ${temporada}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">
                            <strong>${ligaNome}</strong> - Configure as regras de inscricao para a temporada ${temporada}
                        </p>

                        <!-- Status do Processo -->
                        <div class="alert ${rules.status === 'aberto' ? 'alert-success' : rules.status === 'encerrado' ? 'alert-secondary' : 'alert-warning'} mb-4">
                            <span class="material-icons" style="vertical-align: middle;">
                                ${rules.status === 'aberto' ? 'lock_open' : rules.status === 'encerrado' ? 'lock' : 'edit'}
                            </span>
                            Status: <strong>${rules.status === 'aberto' ? 'Aberto para Renovacoes' : rules.status === 'encerrado' ? 'Encerrado' : 'Rascunho'}</strong>
                            ${isDefault ? '<br><small>Regras ainda nao configuradas - defina os valores abaixo</small>' : ''}
                        </div>

                        <form id="formConfigLiga">
                            <!-- SECAO 1: VALORES E PRAZOS -->
                            <div class="card bg-gray-900 border-gray-700 mb-3">
                                <div class="card-header border-gray-700">
                                    <span class="material-icons" style="vertical-align: middle;">payments</span>
                                    Valores e Prazos
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <!-- Taxa de Inscricao -->
                                        <div class="col-md-4">
                                            <label class="form-label">Taxa de Inscricao</label>
                                            <div class="input-group">
                                                <span class="input-group-text bg-gray-700 text-white border-gray-600">R$</span>
                                                <input type="number"
                                                       class="form-control bg-gray-700 text-white border-gray-600"
                                                       id="taxaInscricao"
                                                       name="taxa"
                                                       min="0"
                                                       step="0.01"
                                                       value="${inscricao.taxa || 0}"
                                                       required>
                                            </div>
                                            <small class="text-muted">Valor cobrado de cada participante</small>
                                        </div>

                                        <!-- Prazo de Renovacao -->
                                        <div class="col-md-4">
                                            <label class="form-label">Prazo para Renovacao</label>
                                            <input type="date"
                                                   class="form-control bg-gray-700 text-white border-gray-600"
                                                   id="prazoRenovacao"
                                                   name="prazo_renovacao"
                                                   value="${inscricao.prazo_renovacao ? new Date(inscricao.prazo_renovacao).toISOString().split('T')[0] : '2026-01-27'}"
                                                   required>
                                            <small class="text-muted">Recomendado: 1 dia antes da 1a rodada</small>
                                        </div>

                                        <!-- Parcelamento -->
                                        <div class="col-md-4">
                                            <label class="form-label">Parcelamento</label>
                                            <div class="input-group">
                                                <div class="input-group-text bg-gray-700 border-gray-600">
                                                    <input type="checkbox"
                                                           class="form-check-input mt-0"
                                                           id="permitirParcelamento"
                                                           name="permitir_parcelamento"
                                                           ${inscricao.permitir_parcelamento ? 'checked' : ''}>
                                                </div>
                                                <select class="form-select bg-gray-700 text-white border-gray-600"
                                                        id="maxParcelas"
                                                        name="max_parcelas"
                                                        ${!inscricao.permitir_parcelamento ? 'disabled' : ''}>
                                                    ${[1,2,3,4,5,6,12].map(n =>
                                                        `<option value="${n}" ${(inscricao.max_parcelas || 1) === n ? 'selected' : ''}>${n}x</option>`
                                                    ).join('')}
                                                </select>
                                            </div>
                                            <small class="text-muted">Marque para permitir parcelar a taxa</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- SECAO 2: REGRAS DE RENOVACAO -->
                            <div class="card bg-gray-900 border-gray-700 mb-3">
                                <div class="card-header border-gray-700">
                                    <span class="material-icons" style="vertical-align: middle;">rule</span>
                                    Regras de Renovacao
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <!-- Permitir Devedor -->
                                        <div class="col-md-6">
                                            <div class="form-check form-switch">
                                                <input type="checkbox"
                                                       class="form-check-input"
                                                       id="permitirDevedor"
                                                       name="permitir_devedor_renovar"
                                                       ${inscricao.permitir_devedor_renovar !== false ? 'checked' : ''}>
                                                <label class="form-check-label" for="permitirDevedor">
                                                    <strong>Permitir renovacao de devedores</strong>
                                                </label>
                                            </div>
                                            <small class="text-muted d-block mt-1">
                                                Se ativado, participantes com divida podem renovar carregando o debito para ${temporada}.
                                                Se desativado, devem quitar a divida antes de renovar.
                                            </small>
                                        </div>

                                        <!-- Aproveitar Saldo -->
                                        <div class="col-md-6">
                                            <div class="form-check form-switch">
                                                <input type="checkbox"
                                                       class="form-check-input"
                                                       id="aproveitarSaldo"
                                                       name="aproveitar_saldo_positivo"
                                                       ${inscricao.aproveitar_saldo_positivo !== false ? 'checked' : ''}>
                                                <label class="form-check-label" for="aproveitarSaldo">
                                                    <strong>Aproveitar saldo positivo na inscricao</strong>
                                                </label>
                                            </div>
                                            <small class="text-muted d-block mt-1">
                                                Se ativado, credito da temporada anterior abate da taxa de inscricao.
                                                Se desativado, credito fica disponivel para saque mas nao abate.
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- SECAO 3: MENSAGENS PERSONALIZADAS -->
                            <div class="card bg-gray-900 border-gray-700">
                                <div class="card-header border-gray-700" data-bs-toggle="collapse" data-bs-target="#secaoMensagens" style="cursor: pointer;">
                                    <span class="material-icons" style="vertical-align: middle;">message</span>
                                    Mensagens Personalizadas (opcional)
                                    <span class="material-icons float-end">expand_more</span>
                                </div>
                                <div class="card-body collapse" id="secaoMensagens">
                                    <div class="row g-3">
                                        <!-- Boas Vindas -->
                                        <div class="col-12">
                                            <label class="form-label">Mensagem de Boas-Vindas</label>
                                            <textarea class="form-control bg-gray-700 text-white border-gray-600"
                                                      id="msgBoasVindas"
                                                      name="boas_vindas"
                                                      rows="2"
                                                      placeholder="Exibida no modal de renovacao...">${mensagens.boas_vindas || ''}</textarea>
                                        </div>

                                        <!-- Aviso Devedor -->
                                        <div class="col-md-6">
                                            <label class="form-label">Aviso para Devedores</label>
                                            <textarea class="form-control bg-gray-700 text-white border-gray-600"
                                                      id="msgAvisoDevedor"
                                                      name="aviso_devedor"
                                                      rows="2"
                                                      placeholder="Aviso especifico para quem tem divida...">${mensagens.aviso_devedor || ''}</textarea>
                                        </div>

                                        <!-- Confirmacao -->
                                        <div class="col-md-6">
                                            <label class="form-label">Mensagem de Confirmacao</label>
                                            <textarea class="form-control bg-gray-700 text-white border-gray-600"
                                                      id="msgConfirmacao"
                                                      name="confirmacao"
                                                      rows="2"
                                                      placeholder="Exibida apos confirmar renovacao...">${mensagens.confirmacao || ''}</textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <input type="hidden" name="liga_id" value="${ligaId}">
                            <input type="hidden" name="temporada" value="${temporada}">
                        </form>
                    </div>
                    <div class="modal-footer border-gray-700">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        ${rules.status === 'rascunho' ? `
                        <button type="button" class="btn btn-success" id="btnAbrirRenovacoes">
                            <span class="material-icons" style="vertical-align: middle;">lock_open</span>
                            Abrir Renovacoes
                        </button>
                        ` : rules.status === 'aberto' ? `
                        <button type="button" class="btn btn-warning" id="btnEncerrarRenovacoes">
                            <span class="material-icons" style="vertical-align: middle;">lock</span>
                            Encerrar
                        </button>
                        ` : `
                        <button type="button" class="btn btn-info" id="btnReabrirRenovacoes">
                            <span class="material-icons" style="vertical-align: middle;">lock_open</span>
                            Reabrir
                        </button>
                        `}
                        <button type="button" class="btn btn-primary" id="btnSalvarConfig">
                            <span class="material-icons" style="vertical-align: middle;">save</span>
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // =========================================================================
    // MODAL: RENOVAR PARTICIPANTE
    // =========================================================================

    function modalRenovar(participante, preview, regras) {
        const calculo = preview?.calculo || {};
        const cenarios = preview?.cenarios || { pagou: calculo, naoPagou: calculo };
        const saldoAnterior = preview?.saldoTemporadaAnterior || {};
        const podeRenovar = preview?.podeRenovar !== false;
        const taxa = preview?.regras?.taxa || calculo.taxa || 0;

        return `
        <div class="modal fade" id="modalRenovar" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content bg-gray-800 text-white">
                    <div class="modal-header border-gray-700">
                        <h5 class="modal-title">
                            <span class="material-icons" style="vertical-align: middle;">autorenew</span>
                            Renovar Participante
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Header do Participante -->
                        <div class="d-flex align-items-center mb-4 p-3 bg-gray-900 rounded">
                            <img src="${participante.escudo || '/img/default-escudo.png'}"
                                 alt="Escudo"
                                 class="rounded me-3"
                                 style="width: 48px; height: 48px; object-fit: contain;"
                                 onerror="this.src='/img/default-escudo.png'">
                            <div>
                                <h6 class="mb-0">${escapeHtml(participante.nome_time) || 'Time'}</h6>
                                <small class="text-muted">${escapeHtml(participante.nome_cartoleiro) || ''}</small>
                            </div>
                        </div>

                        ${!podeRenovar ? `
                        <div class="alert alert-danger">
                            <span class="material-icons" style="vertical-align: middle;">warning</span>
                            Participante devedor nao pode renovar (regra da liga)
                        </div>
                        ` : ''}

                        <!-- Alertas de integracao com Quitacao -->
                        ${renderAlertasQuitacao(preview)}

                        <!-- Situacao 2025 -->
                        <div class="card bg-gray-900 border-gray-700 mb-3">
                            <div class="card-header border-gray-700">
                                <span class="material-icons" style="vertical-align: middle;">history</span>
                                Situacao ${preview?.temporadaOrigem || 2025}
                                ${preview?.quitacao?.quitado ? '<span class="badge bg-success ms-2">QUITADO</span>' : ''}
                            </div>
                            <div class="card-body">
                                ${saldoAnterior.usandoLegadoManual ? `
                                <!-- Usando legado manual (quitação) -->
                                <div class="text-center">
                                    <small class="text-muted">Legado definido na quitacao</small>
                                    <h4 class="${saldoAnterior.saldoUsado >= 0 ? 'text-success' : 'text-danger'}">
                                        ${formatarMoeda(saldoAnterior.saldoUsado)}
                                    </h4>
                                    <small class="text-muted d-block mt-2">
                                        (Saldo original era ${formatarMoeda(saldoAnterior.final)})
                                    </small>
                                </div>
                                ` : `
                                <!-- Saldo calculado normalmente -->
                                <div class="row text-center">
                                    <div class="col-6">
                                        <small class="text-muted">Saldo Final</small>
                                        <h5 class="${saldoAnterior.final >= 0 ? 'text-success' : 'text-danger'}">
                                            ${formatarMoeda(saldoAnterior.final)}
                                        </h5>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">Status</small>
                                        <h5>${getQuitacaoBadge(saldoAnterior.status)}</h5>
                                    </div>
                                </div>
                                `}
                            </div>
                        </div>

                        <!-- Calculo 2026 (Dinamico) -->
                        <div class="card bg-gray-900 border-gray-700" id="cardCalculo2026"
                             data-cenario-pagou="${escapeJsonAttr(cenarios.pagou)}"
                             data-cenario-nao-pagou="${escapeJsonAttr(cenarios.naoPagou)}"
                             data-taxa="${taxa}">
                            <div class="card-header border-gray-700">
                                <span class="material-icons" style="vertical-align: middle;">calculate</span>
                                Inscricao ${preview?.temporadaDestino || 2026}
                            </div>
                            <div class="card-body">
                                <table class="table table-sm table-borderless text-white mb-0">
                                    <tbody>
                                        <tr id="rowTaxa">
                                            <td>Taxa de Inscricao</td>
                                            <td class="text-end" id="valorTaxa">${formatarMoeda(taxa)}</td>
                                        </tr>
                                        <tr id="rowTaxaStatus" class="${cenarios.pagou.taxaComoDivida === 0 ? 'text-success' : 'text-danger'}">
                                            <td colspan="2" class="small" id="statusTaxa">
                                                ${cenarios.pagou.taxaComoDivida === 0
                                                    ? '<span class="material-icons" style="font-size:14px;vertical-align:middle;">check_circle</span> Paga (não vira dívida)'
                                                    : '<span class="material-icons" style="font-size:14px;vertical-align:middle;">warning</span> Pendente (vira dívida)'}
                                            </td>
                                        </tr>
                                        <tr id="rowCredito" class="text-success" style="display: ${cenarios.pagou.credito > 0 ? 'table-row' : 'none'};">
                                            <td>(-) Credito aproveitado</td>
                                            <td class="text-end" id="valorCredito">- ${formatarMoeda(cenarios.pagou.credito)}</td>
                                        </tr>
                                        <tr id="rowDivida" class="text-danger" style="display: ${calculo.divida > 0 ? 'table-row' : 'none'};">
                                            <td>(+) Divida ${preview?.temporadaOrigem || 2025}</td>
                                            <td class="text-end" id="valorDivida">+ ${formatarMoeda(calculo.divida)}</td>
                                        </tr>
                                        <tr class="border-top border-gray-700">
                                            <td><strong>Saldo Inicial ${preview?.temporadaDestino || 2026}</strong></td>
                                            <td class="text-end">
                                                <strong id="valorSaldoInicial" class="${cenarios.pagou.total > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}">
                                                    ${cenarios.pagou.total > 0 ? '-' : ''}${formatarMoeda(cenarios.pagou.total)}
                                                </strong>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Opcoes -->
                        <div class="mt-3">
                            <div class="form-check mb-2">
                                <input type="checkbox"
                                       class="form-check-input"
                                       id="checkPagouInscricao"
                                       checked>
                                <label class="form-check-label" for="checkPagouInscricao">
                                    <strong>Pagou a inscricao</strong>
                                </label>
                                <br><small class="text-muted">Se marcado, taxa NAO vira debito. Se desmarcado, taxa entra como divida.</small>
                            </div>
                            <div class="form-check">
                                <input type="checkbox"
                                       class="form-check-input"
                                       id="checkAproveitarCredito"
                                       ${regras?.aproveitar_saldo_positivo !== false ? 'checked' : ''}
                                       ${calculo.credito <= 0 ? 'disabled' : ''}>
                                <label class="form-check-label" for="checkAproveitarCredito">
                                    Aproveitar credito na inscricao
                                </label>
                            </div>
                        </div>

                        <!-- Observacoes -->
                        <div class="mt-3">
                            <label class="form-label">Observacoes (opcional)</label>
                            <textarea class="form-control bg-gray-700 text-white border-gray-600"
                                      id="txtObservacoesRenovar"
                                      rows="2"
                                      placeholder="Observacoes para o historico..."></textarea>
                        </div>

                        <input type="hidden" id="hdnTimeIdRenovar" value="${participante.time_id}">
                    </div>
                    <div class="modal-footer border-gray-700">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button type="button"
                                class="btn btn-success"
                                id="btnConfirmarRenovacao"
                                ${!podeRenovar ? 'disabled' : ''}>
                            <span class="material-icons" style="vertical-align: middle;">check</span>
                            Confirmar Renovacao
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // =========================================================================
    // MODAL: NAO PARTICIPAR
    // =========================================================================

    function modalNaoParticipar(participante, saldoAnterior) {
        return `
        <div class="modal fade" id="modalNaoParticipar" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content bg-gray-800 text-white">
                    <div class="modal-header border-gray-700 bg-danger">
                        <h5 class="modal-title">
                            <span class="material-icons" style="vertical-align: middle;">person_remove</span>
                            Nao Vai Participar
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Header do Participante -->
                        <div class="d-flex align-items-center mb-4 p-3 bg-gray-900 rounded">
                            <img src="${participante.escudo || '/img/default-escudo.png'}"
                                 alt="Escudo"
                                 class="rounded me-3"
                                 style="width: 48px; height: 48px; object-fit: contain;"
                                 onerror="this.src='/img/default-escudo.png'">
                            <div>
                                <h6 class="mb-0">${escapeHtml(participante.nome_time) || 'Time'}</h6>
                                <small class="text-muted">${escapeHtml(participante.nome_cartoleiro) || ''}</small>
                            </div>
                        </div>

                        <div class="alert alert-warning">
                            <span class="material-icons" style="vertical-align: middle;">info</span>
                            <strong>Atencao:</strong> O participante nao sera inscrito na temporada 2026.
                            ${saldoAnterior?.final !== 0 ? `
                            <br><br>
                            O saldo de <strong>${formatarMoeda(saldoAnterior?.final)}</strong> ficara
                            ${saldoAnterior?.final > 0 ? 'disponivel para saque' : 'pendente para quitacao'}
                            na temporada 2025.
                            ` : ''}
                        </div>

                        <!-- Situacao 2025 -->
                        <div class="card bg-gray-900 border-gray-700 mb-3">
                            <div class="card-header border-gray-700">
                                Saldo 2025 (congelado)
                            </div>
                            <div class="card-body text-center">
                                <h4 class="${saldoAnterior?.final >= 0 ? 'text-success' : 'text-danger'}">
                                    ${formatarMoeda(saldoAnterior?.final)}
                                </h4>
                                <small class="text-muted">
                                    ${saldoAnterior?.final > 0 ? 'Credito a receber' :
                                      saldoAnterior?.final < 0 ? 'Divida pendente' : 'Quitado'}
                                </small>
                            </div>
                        </div>

                        <!-- Observacoes -->
                        <div class="mt-3">
                            <label class="form-label">Motivo / Observacoes</label>
                            <textarea class="form-control bg-gray-700 text-white border-gray-600"
                                      id="txtObservacoesNaoParticipa"
                                      rows="2"
                                      placeholder="Motivo da saida..."></textarea>
                        </div>

                        <input type="hidden" id="hdnTimeIdNaoParticipa" value="${participante.time_id}">
                    </div>
                    <div class="modal-footer border-gray-700">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="btnConfirmarNaoParticipa">
                            <span class="material-icons" style="vertical-align: middle;">check</span>
                            Confirmar Saida
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // =========================================================================
    // MODAL: NOVO PARTICIPANTE (v2.0 - Com Cadastro Manual)
    // =========================================================================

    function modalNovoParticipante(ligaId, temporada, taxa) {
        return `
        <div class="modal" id="modalNovoParticipante" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content bg-gray-800 text-white">
                    <div class="modal-header border-gray-700">
                        <h5 class="modal-title">
                            <span class="material-icons" style="vertical-align: middle;">person_add</span>
                            Novo Participante ${temporada}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- TABS -->
                        <ul class="nav nav-tabs nav-fill mb-3" id="tabsNovoParticipante" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active bg-gray-700 text-white border-gray-600" id="tab-busca-nome" data-bs-toggle="tab" data-bs-target="#panel-busca-nome" type="button" role="tab">
                                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">search</span>
                                    Buscar Nome
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link bg-gray-700 text-white border-gray-600" id="tab-busca-id" data-bs-toggle="tab" data-bs-target="#panel-busca-id" type="button" role="tab">
                                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">tag</span>
                                    Buscar ID
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link bg-gray-700 text-white border-gray-600" id="tab-manual" data-bs-toggle="tab" data-bs-target="#panel-manual" type="button" role="tab">
                                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">edit</span>
                                    Manual
                                </button>
                            </li>
                        </ul>

                        <div class="tab-content active" id="tabsNovoParticipanteContent" style="display: block !important;">
                            <!-- TAB 1: BUSCA POR NOME -->
                            <div class="tab-pane show active" id="panel-busca-nome" role="tabpanel" style="display: block;">
                                <p class="text-muted mb-3">
                                    Busque o time pelo nome no banco de participantes existentes.
                                </p>
                                <div class="input-group mb-3">
                                    <span class="input-group-text bg-gray-700 text-white border-gray-600">
                                        <span class="material-icons">search</span>
                                    </span>
                                    <input type="text"
                                           class="form-control bg-gray-700 text-white border-gray-600"
                                           id="inputBuscaTime"
                                           placeholder="Digite o nome do time ou cartoleiro (min 3 letras)..."
                                           autocomplete="off">
                                    <button class="btn btn-primary" type="button" id="btnBuscarTime">
                                        Buscar
                                    </button>
                                </div>
                            </div>

                            <!-- TAB 2: BUSCA POR ID -->
                            <div class="tab-pane" id="panel-busca-id" role="tabpanel" style="display: none;">
                                <p class="text-muted mb-3">
                                    Informe o ID do Cartola FC enviado pelo participante.
                                </p>
                                <div class="input-group mb-3">
                                    <span class="input-group-text bg-gray-700 text-white border-gray-600">
                                        <span class="material-icons">tag</span>
                                    </span>
                                    <input type="number"
                                           class="form-control bg-gray-700 text-white border-gray-600"
                                           id="inputBuscaTimeId"
                                           placeholder="Ex: 12345678"
                                           autocomplete="off">
                                    <button class="btn btn-primary" type="button" id="btnBuscarTimeId">
                                        Buscar
                                    </button>
                                </div>
                                <div class="alert alert-secondary small">
                                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">info</span>
                                    O participante encontra seu ID no app Cartola FC > Perfil > "ID do Time"
                                </div>
                            </div>

                            <!-- TAB 3: CADASTRO MANUAL -->
                            <div class="tab-pane" id="panel-manual" role="tabpanel" style="display: none;">
                                <div class="alert alert-warning small mb-3">
                                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">warning</span>
                                    <strong>Cadastro com pendencia</strong> - Os dados do Cartola FC serao vinculados posteriormente.
                                </div>

                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Nome do Participante *</label>
                                        <input type="text"
                                               class="form-control bg-gray-700 text-white border-gray-600"
                                               id="inputNomeManual"
                                               placeholder="Ex: Joao Silva"
                                               required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Apelido/Time</label>
                                        <input type="text"
                                               class="form-control bg-gray-700 text-white border-gray-600"
                                               id="inputApelidoManual"
                                               placeholder="Ex: Mengao FC">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Time do Coracao</label>
                                        <select class="form-select bg-gray-700 text-white border-gray-600" id="selectTimeCoracao">
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
                                            <option value="294">Coritiba</option>
                                            <option value="327">America-MG</option>
                                            <option value="373">Red Bull Bragantino</option>
                                            <option value="280">Goias</option>
                                            <option value="292">Sport</option>
                                            <option value="386">Cuiaba</option>
                                            <option value="314">Juventude</option>
                                            <option value="0">Outro</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">ID Cartola (se tiver)</label>
                                        <input type="number"
                                               class="form-control bg-gray-700 text-white border-gray-600"
                                               id="inputIdCartolaManual"
                                               placeholder="Preencher depois...">
                                        <small class="text-muted">Pode deixar vazio e vincular depois</small>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label">Contato (WhatsApp/Email)</label>
                                        <input type="text"
                                               class="form-control bg-gray-700 text-white border-gray-600"
                                               id="inputContatoManual"
                                               placeholder="Ex: (11) 99999-9999">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Loading -->
                        <div id="loadingBusca" class="text-center py-3 d-none">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Buscando...</span>
                            </div>
                        </div>

                        <!-- Resultados Busca -->
                        <div id="resultadosBusca" class="mb-3" style="max-height: 200px; overflow-y: auto;">
                            <!-- Resultados serao inseridos aqui -->
                        </div>

                        <!-- Time Selecionado (para abas de busca) -->
                        <div id="timeSelecionado" class="d-none">
                            <hr class="border-gray-700">
                            <h6 class="mb-3">Time Selecionado</h6>
                            <div class="d-flex align-items-center p-3 bg-gray-900 rounded mb-3">
                                <img id="escudoSelecionado" src="" alt="Escudo" class="rounded me-3" style="width: 48px; height: 48px;">
                                <div class="flex-grow-1">
                                    <h6 class="mb-0" id="nomeTimeSelecionado"></h6>
                                    <small class="text-muted" id="nomeCartoleiroSelecionado"></small>
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-danger" id="btnLimparSelecao">
                                    <span class="material-icons">close</span>
                                </button>
                            </div>
                        </div>

                        <!-- Secao comum: Taxa e Observacoes -->
                        <div id="secaoConfirmacao" class="d-none">
                            <hr class="border-gray-700">

                            <!-- Taxa -->
                            <div class="alert alert-info">
                                <span class="material-icons" style="vertical-align: middle;">payments</span>
                                Taxa de inscricao: <strong>${formatarMoeda(taxa)}</strong>
                            </div>

                            <!-- Opcao Pagamento -->
                            <div class="form-check mb-3">
                                <input type="checkbox"
                                       class="form-check-input"
                                       id="checkPagouInscricaoNovo"
                                       checked>
                                <label class="form-check-label" for="checkPagouInscricaoNovo">
                                    <strong>Pagou a inscricao</strong>
                                </label>
                                <br><small class="text-muted">Se marcado, taxa NAO vira debito. Se desmarcado, participante entra devendo a taxa.</small>
                            </div>

                            <!-- Observacoes -->
                            <div class="mt-3">
                                <label class="form-label">Observacoes (opcional)</label>
                                <textarea class="form-control bg-gray-700 text-white border-gray-600"
                                          id="txtObservacoesNovo"
                                          rows="2"
                                          placeholder="Indicado por, motivo da entrada..."></textarea>
                            </div>

                            <input type="hidden" id="hdnTimeIdNovo" value="">
                            <input type="hidden" id="hdnNomeTimeNovo" value="">
                            <input type="hidden" id="hdnNomeCartoleiroNovo" value="">
                            <input type="hidden" id="hdnEscudoNovo" value="">
                            <input type="hidden" id="hdnModoNovo" value="busca">
                        </div>
                    </div>
                    <div class="modal-footer border-gray-700">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-success" id="btnCadastrarNovo" disabled>
                            <span class="material-icons" style="vertical-align: middle;">person_add</span>
                            Cadastrar Participante
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // =========================================================================
    // TEMPLATE: ITEM RESULTADO BUSCA
    // =========================================================================

    function itemResultadoBusca(time) {
        return `
        <div class="resultado-busca-item d-flex align-items-center p-2 border-bottom border-gray-700 cursor-pointer"
             data-time-id="${escapeHtml(time.time_id)}"
             data-nome-time="${escapeHtml(time.nome_time || '')}"
             data-nome-cartoleiro="${escapeHtml(time.nome_cartoleiro || '')}"
             data-escudo="${escapeHtml(time.escudo || '')}"
             style="cursor: pointer;"
             onmouseover="this.classList.add('bg-gray-700')"
             onmouseout="this.classList.remove('bg-gray-700')">
            <img src="${escapeHtml(time.escudo) || '/img/default-escudo.png'}"
                 alt="Escudo"
                 class="rounded me-3"
                 style="width: 36px; height: 36px; object-fit: contain;"
                 onerror="this.src='/img/default-escudo.png'">
            <div class="flex-grow-1">
                <div class="fw-bold">${escapeHtml(time.nome_time) || 'Time sem nome'}</div>
                <small class="text-muted">${escapeHtml(time.nome_cartoleiro) || ''}</small>
            </div>
            <small class="text-muted">ID: ${escapeHtml(time.time_id)}</small>
        </div>`;
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        // Modais
        modalConfigLiga,
        modalRenovar,
        modalNaoParticipar,
        modalNovoParticipante,

        // Templates
        itemResultadoBusca,

        // Helpers
        formatarMoeda,
        formatarData,
        getStatusBadge,
        getQuitacaoBadge,
        escapeHtml
    };

})();

// Export para ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenovacaoModals;
}

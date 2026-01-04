/**
 * Modulos Wizard Module
 *
 * Sistema generico de wizard que constroi modais dinamicamente
 * baseado nas perguntas definidas no JSON do modulo.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

const ModulosWizard = (function() {
    'use strict';

    // =========================================================================
    // HELPERS
    // =========================================================================

    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    }

    // =========================================================================
    // RENDERIZADORES DE CAMPOS
    // =========================================================================

    /**
     * Renderiza campo do tipo NUMBER
     */
    function renderCampoNumber(pergunta, valorAtual) {
        const valor = valorAtual !== undefined ? valorAtual : pergunta.default;
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label" for="wizard_${pergunta.id}">
                    ${pergunta.label}
                    ${pergunta.required ? '<span class="text-danger">*</span>' : ''}
                </label>
                <input type="number"
                       class="form-control bg-gray-700 text-white border-gray-600"
                       id="wizard_${pergunta.id}"
                       name="${pergunta.id}"
                       value="${valor}"
                       min="${pergunta.min !== undefined ? pergunta.min : ''}"
                       max="${pergunta.max !== undefined ? pergunta.max : ''}"
                       step="${pergunta.step || 1}"
                       ${pergunta.required ? 'required' : ''}>
                ${pergunta.descricao ? `<small class="text-muted">${pergunta.descricao}</small>` : ''}
            </div>
        `;
    }

    /**
     * Renderiza campo do tipo BOOLEAN
     */
    function renderCampoBoolean(pergunta, valorAtual) {
        const checked = valorAtual !== undefined ? valorAtual : pergunta.default;
        return `
            <div class="col-md-6 mb-3">
                <div class="form-check form-switch mt-4">
                    <input type="checkbox"
                           class="form-check-input"
                           id="wizard_${pergunta.id}"
                           name="${pergunta.id}"
                           ${checked ? 'checked' : ''}>
                    <label class="form-check-label" for="wizard_${pergunta.id}">
                        ${pergunta.label}
                    </label>
                </div>
                ${pergunta.descricao ? `<small class="text-muted">${pergunta.descricao}</small>` : ''}
            </div>
        `;
    }

    /**
     * Renderiza campo do tipo SELECT
     */
    function renderCampoSelect(pergunta, valorAtual) {
        const valorSelecionado = valorAtual !== undefined ? valorAtual : pergunta.default;
        const optionsHtml = (pergunta.options || []).map(opt => {
            const selected = opt.valor == valorSelecionado ? 'selected' : '';
            return `<option value="${opt.valor}" ${selected}>${opt.label}</option>`;
        }).join('');

        return `
            <div class="col-md-6 mb-3">
                <label class="form-label" for="wizard_${pergunta.id}">
                    ${pergunta.label}
                    ${pergunta.required ? '<span class="text-danger">*</span>' : ''}
                </label>
                <select class="form-select bg-gray-700 text-white border-gray-600"
                        id="wizard_${pergunta.id}"
                        name="${pergunta.id}"
                        ${pergunta.required ? 'required' : ''}>
                    ${optionsHtml}
                </select>
                ${pergunta.descricao ? `<small class="text-muted">${pergunta.descricao}</small>` : ''}
            </div>
        `;
    }

    /**
     * Renderiza um campo baseado no tipo
     */
    function renderCampo(pergunta, valorAtual) {
        switch (pergunta.tipo) {
            case 'number':
                return renderCampoNumber(pergunta, valorAtual);
            case 'boolean':
                return renderCampoBoolean(pergunta, valorAtual);
            case 'select':
                return renderCampoSelect(pergunta, valorAtual);
            default:
                console.warn(`[WIZARD] Tipo de campo desconhecido: ${pergunta.tipo}`);
                return '';
        }
    }

    // =========================================================================
    // MODAL PRINCIPAL
    // =========================================================================

    /**
     * Gera HTML do modal de wizard
     * @param {string} moduloId - ID do modulo
     * @param {Object} wizard - Config do wizard (titulo, descricao, perguntas)
     * @param {Object} valoresAtuais - Valores ja salvos (para edicao)
     * @param {Object} moduloInfo - Info do modulo (nome, descricao, ativo)
     * @returns {string} HTML do modal
     */
    function gerarModalWizard(moduloId, wizard, valoresAtuais = {}, moduloInfo = {}) {
        if (!wizard || !wizard.perguntas) {
            return gerarModalSemWizard(moduloId, moduloInfo);
        }

        const perguntas = wizard.perguntas || [];
        const camposHtml = perguntas.map(p => renderCampo(p, valoresAtuais[p.id])).join('');

        return `
        <div class="modal fade" id="modalWizardModulo" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content bg-gray-800 text-white">
                    <div class="modal-header border-gray-700">
                        <h5 class="modal-title">
                            <span class="material-icons" style="vertical-align: middle;">tune</span>
                            ${wizard.titulo || 'Configurar Modulo'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-4">${wizard.descricao || ''}</p>

                        <form id="formWizardModulo" data-modulo="${moduloId}">
                            <div class="row">
                                ${camposHtml}
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-gray-700">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <span class="material-icons" style="vertical-align: middle;">close</span>
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-success" id="btnSalvarWizard">
                            <span class="material-icons" style="vertical-align: middle;">check</span>
                            Ativar Modulo
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Modal para modulos sem wizard (apenas confirma ativacao)
     */
    function gerarModalSemWizard(moduloId, moduloInfo = {}) {
        return `
        <div class="modal fade" id="modalWizardModulo" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content bg-gray-800 text-white">
                    <div class="modal-header border-gray-700">
                        <h5 class="modal-title">
                            <span class="material-icons" style="vertical-align: middle;">toggle_on</span>
                            Ativar ${moduloInfo.nome || moduloId}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Deseja ativar o modulo <strong>${moduloInfo.nome || moduloId}</strong> para esta liga?</p>
                        ${moduloInfo.descricao ? `<p class="text-muted">${moduloInfo.descricao}</p>` : ''}
                        <div class="alert alert-info">
                            <span class="material-icons" style="vertical-align: middle;">info</span>
                            Este modulo sera ativado com as configuracoes padrao.
                        </div>
                        <form id="formWizardModulo" data-modulo="${moduloId}">
                            <!-- Sem campos, apenas confirmacao -->
                        </form>
                    </div>
                    <div class="modal-footer border-gray-700">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-success" id="btnSalvarWizard">
                            <span class="material-icons" style="vertical-align: middle;">check</span>
                            Ativar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Modal de confirmacao para desativar modulo
     */
    function gerarModalDesativar(moduloId, moduloInfo = {}) {
        return `
        <div class="modal fade" id="modalDesativarModulo" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content bg-gray-800 text-white">
                    <div class="modal-header border-gray-700 bg-danger">
                        <h5 class="modal-title">
                            <span class="material-icons" style="vertical-align: middle;">toggle_off</span>
                            Desativar ${moduloInfo.nome || moduloId}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Deseja <strong>desativar</strong> o modulo <strong>${moduloInfo.nome || moduloId}</strong>?</p>
                        <div class="alert alert-warning">
                            <span class="material-icons" style="vertical-align: middle;">warning</span>
                            As configuracoes serao mantidas, mas o modulo nao estara mais ativo para esta liga.
                        </div>
                    </div>
                    <div class="modal-footer border-gray-700">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="btnConfirmarDesativar" data-modulo="${moduloId}">
                            <span class="material-icons" style="vertical-align: middle;">block</span>
                            Desativar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // =========================================================================
    // COLETA DE VALORES
    // =========================================================================

    /**
     * Coleta valores do formulario do wizard
     * @param {HTMLFormElement} form - Formulario
     * @param {Array} perguntas - Lista de perguntas
     * @returns {Object} Valores coletados
     */
    function coletarValoresWizard(form, perguntas = []) {
        const valores = {};

        perguntas.forEach(pergunta => {
            const campo = form.querySelector(`[name="${pergunta.id}"]`);
            if (!campo) return;

            let valor;
            switch (pergunta.tipo) {
                case 'number':
                    valor = campo.value !== '' ? Number(campo.value) : null;
                    break;
                case 'boolean':
                    valor = campo.checked;
                    break;
                case 'select':
                    valor = campo.value;
                    // Tentar converter para number se parecer numero
                    if (!isNaN(valor) && valor !== '') {
                        valor = Number(valor);
                    }
                    break;
                default:
                    valor = campo.value;
            }

            valores[pergunta.id] = valor;
        });

        return valores;
    }

    /**
     * Valida formulario do wizard
     * @param {HTMLFormElement} form - Formulario
     * @param {Array} perguntas - Lista de perguntas
     * @returns {Object} { valido: boolean, erros: [] }
     */
    function validarWizard(form, perguntas = []) {
        const erros = [];

        perguntas.forEach(pergunta => {
            if (!pergunta.required) return;

            const campo = form.querySelector(`[name="${pergunta.id}"]`);
            if (!campo) {
                erros.push(`Campo ${pergunta.label} nao encontrado`);
                return;
            }

            let vazio = false;
            switch (pergunta.tipo) {
                case 'number':
                    vazio = campo.value === '';
                    break;
                case 'boolean':
                    // Boolean sempre tem valor
                    break;
                case 'select':
                    vazio = !campo.value;
                    break;
                default:
                    vazio = !campo.value;
            }

            if (vazio) {
                erros.push(`${pergunta.label} e obrigatorio`);
                campo.classList.add('is-invalid');
            } else {
                campo.classList.remove('is-invalid');
            }
        });

        return {
            valido: erros.length === 0,
            erros
        };
    }

    // =========================================================================
    // LISTAGEM DE MODULOS
    // =========================================================================

    /**
     * Gera HTML da lista de modulos disponiveis
     * @param {Array} modulos - Lista de modulos
     * @param {string} ligaId - ID da liga
     * @returns {string} HTML da lista
     */
    function gerarListaModulos(modulos, ligaId) {
        if (!modulos || modulos.length === 0) {
            return '<p class="text-muted">Nenhum modulo disponivel</p>';
        }

        const cards = modulos.map(modulo => {
            const statusClass = modulo.ativo ? 'border-success' : 'border-gray-600';
            const statusBadge = modulo.ativo
                ? '<span class="badge bg-success"><span class="material-icons" style="font-size: 12px; vertical-align: middle;">check_circle</span> Ativo</span>'
                : '<span class="badge bg-secondary"><span class="material-icons" style="font-size: 12px; vertical-align: middle;">radio_button_unchecked</span> Inativo</span>';

            const btnAcao = modulo.ativo
                ? `<button class="btn btn-outline-danger btn-sm btn-desativar-modulo" data-modulo="${modulo.id}" data-nome="${modulo.nome}">
                     <span class="material-icons" style="font-size: 16px; vertical-align: middle;">toggle_off</span>
                     Desativar
                   </button>`
                : `<button class="btn btn-success btn-sm btn-ativar-modulo" data-modulo="${modulo.id}" data-nome="${modulo.nome}">
                     <span class="material-icons" style="font-size: 16px; vertical-align: middle;">toggle_on</span>
                     Ativar
                   </button>`;

            const btnConfig = modulo.ativo && modulo.wizard_disponivel
                ? `<button class="btn btn-outline-primary btn-sm btn-config-modulo ms-1" data-modulo="${modulo.id}" data-nome="${modulo.nome}">
                     <span class="material-icons" style="font-size: 16px; vertical-align: middle;">settings</span>
                   </button>`
                : '';

            return `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card bg-gray-900 ${statusClass} h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-0">${modulo.nome}</h6>
                                ${statusBadge}
                            </div>
                            <p class="card-text text-muted small">${modulo.descricao || ''}</p>
                            <div class="d-flex justify-content-end mt-3">
                                ${btnAcao}
                                ${btnConfig}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="row">${cards}</div>`;
    }

    // =========================================================================
    // EXPORTS
    // =========================================================================

    return {
        gerarModalWizard,
        gerarModalSemWizard,
        gerarModalDesativar,
        gerarListaModulos,
        coletarValoresWizard,
        validarWizard,
        renderCampo
    };

})();

// Export para uso em modulos ES6
if (typeof window !== 'undefined') {
    window.ModulosWizard = ModulosWizard;
}

/**
 * MODULE-CONFIG-MODAL.JS
 * Sistema de configuração de módulos via wizard dinâmico
 * Versão: 1.0.0
 * Data: 28/01/2026
 */

class ModuleConfigModal {
    constructor() {
        this.ligaId = null;
        this.currentModule = null;
        this.wizardData = null;
        this.userAnswers = {};
        this.modalElement = null;
        this.bsModal = null;
    }

    /**
     * Inicializa modal com dados de um módulo específico
     */
    async init(ligaId, modulo) {
        this.ligaId = ligaId;
        this.currentModule = modulo;

        try {
            // Buscar wizard do backend
            this.wizardData = await this.fetchWizard(modulo);
            this._injectExtratoIntegrationQuestions();

            // Buscar config existente (se houver)
            const configAtual = await this.fetchConfig(ligaId, modulo);
            this.userAnswers = configAtual?.wizard_respostas || {};

            // Renderizar modal
            this.render();
            this.show();
        } catch (error) {
            console.error('[MODULE-CONFIG-MODAL] Erro ao inicializar:', error);
            this.showError('Erro ao carregar wizard de configuração');
        }
    }

    /**
     * Injeta perguntas de integração no extrato (frontend-only)
     */
    _injectExtratoIntegrationQuestions() {
        if (!this.wizardData) return;
        if (!Array.isArray(this.wizardData.perguntas)) {
            this.wizardData.perguntas = [];
        }

        const perguntas = this.wizardData.perguntas;
        const ids = new Set(perguntas.map(p => p.id));

        if (!ids.has('integrar_extrato')) {
            perguntas.push({
                id: 'integrar_extrato',
                tipo: 'boolean',
                label: 'Integrar no Extrato Financeiro',
                descricao: 'Se ativo, este módulo poderá gerar créditos/débitos no extrato.',
                default: false
            });
        }

        if (!ids.has('extrato_tipo_impacto')) {
            perguntas.push({
                id: 'extrato_tipo_impacto',
                tipo: 'select',
                label: 'Tipo de impacto no extrato',
                descricao: 'Defina se o módulo gera crédito, débito ou ambos.',
                required: true,
                dependeDe: 'integrar_extrato',
                condicao: true,
                options: [
                    { valor: 'credito', label: 'Crédito (a receber)' },
                    { valor: 'debito', label: 'Débito (a pagar)' },
                    { valor: 'misto', label: 'Misto (crédito e débito)' }
                ],
                default: 'misto'
            });
        }

        if (!ids.has('extrato_regra')) {
            perguntas.push({
                id: 'extrato_regra',
                tipo: 'text',
                label: 'Regra de integração no extrato',
                descricao: 'Explique como créditos/débitos serão lançados (ex: +R$5 por rodada, débito no fim da temporada).',
                placeholder: 'Descreva a regra de lançamento no extrato...',
                required: true,
                dependeDe: 'integrar_extrato',
                condicao: true
            });
        }
    }

    /**
     * Busca definição do wizard do backend
     */
    async fetchWizard(modulo) {
        const response = await fetch(`/api/modulos/${modulo}/wizard`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.wizard || data;
    }

    /**
     * Busca configuração existente
     */
    async fetchConfig(ligaId, modulo) {
        const response = await fetch(`/api/liga/${ligaId}/modulos/${modulo}`);
        if (response.ok) {
            const data = await response.json();
            return data.config || data;
        }
        return null;
    }

    /**
     * Renderiza modal no DOM
     */
    render() {
        // Remover modal anterior se existir
        const existingModal = document.getElementById('modalConfigModulo');
        if (existingModal) existingModal.remove();

        // Criar novo modal
        const modalHTML = this.buildModalHTML();
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Armazenar referência
        this.modalElement = document.getElementById('modalConfigModulo');

        // Bind de eventos
        this.bindEvents();
    }

    /**
     * Constrói HTML do modal
     */
    buildModalHTML() {
        const titulo = this.wizardData?.titulo || 'Configurar Módulo';
        const descricao = this.wizardData?.descricao || '';

        return `
            <div class="modal fade" id="modalConfigModulo" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content bg-gray-800 text-white">
                        <div class="modal-header border-gray-700">
                            <h5 class="modal-title">
                                <span class="material-icons" style="vertical-align: middle;">settings</span>
                                ${titulo}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${descricao ? `<p class="text-muted mb-4">${descricao}</p>` : ''}
                            ${this.renderWizardQuestions()}
                        </div>
                        <div class="modal-footer border-gray-700">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <span class="material-icons" style="vertical-align: middle; font-size: 18px;">close</span>
                                Cancelar
                            </button>
                            <button type="button" class="btn btn-success" id="btnSalvarConfig">
                                <span class="material-icons" style="vertical-align: middle; font-size: 18px;">save</span>
                                Salvar Configuração
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza perguntas do wizard com layout de preview
     */
    renderWizardQuestions() {
        if (!this.wizardData?.perguntas) return '<p class="text-muted">Nenhuma configuração disponível</p>';

        const questionsHTML = this.wizardData.perguntas.map(q => {
            if (!this.shouldShowQuestion(q)) return '';

            switch (q.tipo) {
                case 'number': return this.renderNumberInput(q);
                case 'select': return this.renderSelect(q);
                case 'boolean': return this.renderSwitch(q);
                case 'text': return this.renderTextInput(q);
                case 'valores_grid': return this.renderValoresGrid(q);
                default: return '';
            }
        }).join('');

        return `
            <div class="row">
                <div class="col-md-7">
                    ${questionsHTML}
                </div>
                <div class="col-md-5">
                    <div class="card bg-gray-900 border-gray-700 sticky-top" style="top: 20px;">
                        <div class="card-header border-gray-700">
                            <span class="material-icons" style="vertical-align: middle;">visibility</span>
                            Preview de Valores
                        </div>
                        <div class="card-body" id="previewValores" style="max-height: 500px; overflow-y: auto;">
                            <small class="text-muted">Preencha os campos para ver o preview</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza input numérico
     */
    renderNumberInput(pergunta) {
        const valor = this.userAnswers[pergunta.id] || pergunta.default || '';
        const required = pergunta.required ? 'required' : '';

        return `
            <div class="mb-4">
                <label class="form-label">${pergunta.label} ${pergunta.required ? '<span class="text-danger">*</span>' : ''}</label>
                ${pergunta.descricao ? `<small class="text-muted d-block mb-2">${pergunta.descricao}</small>` : ''}
                <input type="number"
                       class="form-control bg-gray-700 text-white border-gray-600"
                       id="input_${pergunta.id}"
                       data-question-id="${pergunta.id}"
                       value="${valor}"
                       min="${pergunta.min || ''}"
                       max="${pergunta.max || ''}"
                       step="${pergunta.step || '1'}"
                       ${required}
                       placeholder="${pergunta.placeholder || ''}">
            </div>
        `;
    }

    /**
     * Renderiza select
     */
    renderSelect(pergunta) {
        const valorAtual = this.userAnswers[pergunta.id] || pergunta.default || '';
        const required = pergunta.required ? 'required' : '';

        const options = (pergunta.options || []).map(opt => {
            const selected = opt.valor === valorAtual ? 'selected' : '';
            return `<option value="${opt.valor}" ${selected}>${opt.label}</option>`;
        }).join('');

        return `
            <div class="mb-4">
                <label class="form-label">${pergunta.label} ${pergunta.required ? '<span class="text-danger">*</span>' : ''}</label>
                ${pergunta.descricao ? `<small class="text-muted d-block mb-2">${pergunta.descricao}</small>` : ''}
                <select class="form-select bg-gray-700 text-white border-gray-600"
                        id="input_${pergunta.id}"
                        data-question-id="${pergunta.id}"
                        ${required}>
                    <option value="">Selecione...</option>
                    ${options}
                </select>
            </div>
        `;
    }

    /**
     * Renderiza switch/checkbox
     */
    renderSwitch(pergunta) {
        const checked = this.userAnswers[pergunta.id] ?? pergunta.default ?? false;

        return `
            <div class="mb-4">
                <div class="form-check form-switch">
                    <input class="form-check-input"
                           type="checkbox"
                           id="input_${pergunta.id}"
                           data-question-id="${pergunta.id}"
                           ${checked ? 'checked' : ''}>
                    <label class="form-check-label" for="input_${pergunta.id}">
                        <strong>${pergunta.label}</strong>
                    </label>
                </div>
                ${pergunta.descricao ? `<small class="text-muted d-block mt-1">${pergunta.descricao}</small>` : ''}
            </div>
        `;
    }

    /**
     * Renderiza input de texto
     */
    renderTextInput(pergunta) {
        const valor = this.userAnswers[pergunta.id] || pergunta.default || '';
        const required = pergunta.required ? 'required' : '';

        return `
            <div class="mb-4">
                <label class="form-label">${pergunta.label} ${pergunta.required ? '<span class="text-danger">*</span>' : ''}</label>
                ${pergunta.descricao ? `<small class="text-muted d-block mb-2">${pergunta.descricao}</small>` : ''}
                <input type="text"
                       class="form-control bg-gray-700 text-white border-gray-600"
                       id="input_${pergunta.id}"
                       data-question-id="${pergunta.id}"
                       value="${valor}"
                       ${required}
                       placeholder="${pergunta.placeholder || ''}">
            </div>
        `;
    }

    /**
     * Renderiza grid de valores (específico para rodadas)
     */
    renderValoresGrid(pergunta) {
        const totalParticipantes = this.userAnswers.total_participantes || 10;
        const valores = this.userAnswers[pergunta.id] || {};
        const gridHTML = this.buildValoresGridSections(totalParticipantes, valores, pergunta);

        return `
            <div class="mb-4">
                <label class="form-label">${pergunta.label} ${pergunta.required ? '<span class="text-danger">*</span>' : ''}</label>
                ${pergunta.descricao ? `<small class="text-muted d-block mb-2">${pergunta.descricao}</small>` : ''}
                <div class="valores-grid" id="valoresGrid">
                    ${gridHTML}
                </div>
            </div>
        `;
    }

    /**
     * Monta HTML do grid em blocos (1-10, 11-20...) para ligas grandes
     */
    buildValoresGridSections(totalParticipantes, valores, pergunta) {
        const globalChunk =
            typeof window !== 'undefined' && Number(window.MODAL_GRID_CHUNK_SIZE) > 0
                ? Number(window.MODAL_GRID_CHUNK_SIZE)
                : 0;
        const configChunk =
            Number(pergunta?.tamanho_bloco || pergunta?.block_size || pergunta?.chunk_size) || 0;
        const chunkSizeBase = configChunk > 0 ? configChunk : (totalParticipantes > 12 ? 10 : totalParticipantes);
        const chunkSize = Math.max(
            2,
            Math.min(globalChunk > 0 ? globalChunk : chunkSizeBase, totalParticipantes),
        );
        let html = '';
        let chunkIndex = 0;

        for (let start = 1; start <= totalParticipantes; start += chunkSize) {
            const end = Math.min(start + chunkSize - 1, totalParticipantes);
            const isChunked = totalParticipantes > chunkSize;
            const sectionClass = chunkIndex % 2 === 1 ? 'valores-grid-section is-alt' : 'valores-grid-section';

            html += `
                <div class="${sectionClass}">
                    ${isChunked ? `<div class="valores-grid-title">${start}–${end}</div>` : ''}
            `;

            for (let i = start; i <= end; i++) {
                const valor = valores[i] || '';
                html += `
                    <div class="input-group mb-2">
                        <span class="input-group-text bg-gray-700 text-white border-gray-600" style="min-width: 80px;">
                            ${i}º lugar
                        </span>
                        <span class="input-group-text bg-gray-700 text-white border-gray-600">R$</span>
                        <input type="number"
                               class="form-control bg-gray-700 text-white border-gray-600 valor-input"
                               step="0.01"
                               data-posicao="${i}"
                               data-question-id="${pergunta.id}"
                               value="${valor}"
                               placeholder="0.00"
                               required>
                    </div>
                `;
            }

            html += `
                </div>
            `;
            chunkIndex += 1;
        }

        return html;
    }

    /**
     * Verifica se pergunta deve ser exibida (dependências)
     */
    shouldShowQuestion(pergunta) {
        if (!pergunta.dependeDe) return true;

        const dependValue = this.userAnswers[pergunta.dependeDe];
        return dependValue === pergunta.condicao;
    }

    /**
     * Atualiza preview de valores
     */
    updatePreview() {
        const previewContainer = document.getElementById('previewValores');
        if (!previewContainer) return;

        const totalParticipantes = this.userAnswers.total_participantes;
        const valores = this.userAnswers.valores_manual || {};

        if (!totalParticipantes || Object.keys(valores).length === 0) {
            previewContainer.innerHTML = '<small class="text-muted">Preencha os campos para ver o preview</small>';
            return;
        }

        let html = '<table class="table table-sm table-borderless text-white mb-0">';
        for (let i = 1; i <= totalParticipantes; i++) {
            const valor = parseFloat(valores[i]) || 0;
            const cor = valor > 0 ? 'text-success' : valor < 0 ? 'text-danger' : 'text-muted';
            const sinal = valor > 0 ? '+' : '';
            html += `
                <tr>
                    <td style="width: 50%;">${i}º lugar</td>
                    <td class="text-end ${cor}"><strong>${sinal}R$ ${valor.toFixed(2)}</strong></td>
                </tr>
            `;
        }
        html += '</table>';
        previewContainer.innerHTML = html;
    }

    /**
     * Coleta respostas do formulário
     */
    collectAnswers() {
        const form = this.modalElement;
        const inputs = form.querySelectorAll('[data-question-id]');

        inputs.forEach(input => {
            const questionId = input.dataset.questionId;

            if (input.type === 'checkbox') {
                this.userAnswers[questionId] = input.checked;
            } else if (input.classList.contains('valor-input')) {
                // Valores do grid
                const posicao = input.dataset.posicao;
                if (!this.userAnswers[questionId]) this.userAnswers[questionId] = {};
                this.userAnswers[questionId][posicao] = parseFloat(input.value) || 0;
            } else if (input.type === 'number') {
                this.userAnswers[questionId] = parseFloat(input.value) || 0;
            } else {
                this.userAnswers[questionId] = input.value;
            }
        });
    }

    /**
     * Valida formulário
     */
    validate() {
        const perguntas = this.wizardData.perguntas || [];

        for (const pergunta of perguntas) {
            if (!this.shouldShowQuestion(pergunta)) continue;
            if (!pergunta.required) continue;

            const valor = this.userAnswers[pergunta.id];

            if (valor === undefined || valor === null || valor === '') {
                this.showError(`Campo "${pergunta.label}" é obrigatório`);
                return false;
            }

            // Validação de grid de valores
            if (pergunta.tipo === 'valores_grid') {
                const totalParticipantes = this.userAnswers.total_participantes || 10;
                for (let i = 1; i <= totalParticipantes; i++) {
                    if (valor[i] === undefined || valor[i] === null || valor[i] === '') {
                        this.showError(`Valor para ${i}º lugar é obrigatório`);
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Salva configuração
     */
    async save() {
        this.collectAnswers();

        if (!this.validate()) return;

        const btnSalvar = document.getElementById('btnSalvarConfig');
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

        try {
            const response = await fetch(`/api/liga/${this.ligaId}/modulos/${this.currentModule}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wizard_respostas: this.userAnswers })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.mensagem || 'Erro ao salvar configuração');
            }

            this.showSuccess('Configuração salva com sucesso!');

            setTimeout(() => {
                this.close();
                window.location.reload(); // Recarregar para refletir mudanças
            }, 1500);

        } catch (error) {
            console.error('[MODULE-CONFIG-MODAL] Erro ao salvar:', error);
            this.showError(error.message);
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<span class="material-icons" style="vertical-align: middle; font-size: 18px;">save</span> Salvar Configuração';
        }
    }

    /**
     * Bind de eventos
     */
    bindEvents() {
        // Botão salvar
        const btnSalvar = document.getElementById('btnSalvarConfig');
        btnSalvar?.addEventListener('click', () => this.save());

        // Inputs que afetam renderização dinâmica
        const totalParticipantesInput = document.getElementById('input_total_participantes');
        totalParticipantesInput?.addEventListener('change', (e) => {
            this.userAnswers.total_participantes = parseInt(e.target.value);
            this.reRenderDynamicFields();
        });

        // Inputs de valores (para preview)
        this.modalElement.addEventListener('input', (e) => {
            if (e.target.classList.contains('valor-input')) {
                this.collectAnswers();
                this.updatePreview();
            }
        });

        // Inputs que controlam dependências
        const inputsThatControlDependencies = this.modalElement.querySelectorAll('[data-question-id]');
        inputsThatControlDependencies.forEach(input => {
            input.addEventListener('change', () => {
                this.collectAnswers();
                this.reRenderConditionalFields();
            });
        });
    }

    /**
     * Re-renderiza campos dinâmicos (valores grid)
     */
    reRenderDynamicFields() {
        const gridContainer = document.getElementById('valoresGrid');
        if (!gridContainer) return;

        const pergunta = this.wizardData.perguntas.find(p => p.tipo === 'valores_grid');
        if (!pergunta) return;

        const totalParticipantes = this.userAnswers.total_participantes || 10;
        const valores = this.userAnswers[pergunta.id] || {};

        gridContainer.innerHTML = this.buildValoresGridSections(totalParticipantes, valores, pergunta);
        this.updatePreview();
    }

    /**
     * Re-renderiza campos condicionais
     */
    reRenderConditionalFields() {
        // Recarregar perguntas que dependem de outras
        const perguntas = this.wizardData.perguntas || [];
        perguntas.forEach(pergunta => {
            if (!pergunta.dependeDe) return;

            const container = document.getElementById(`input_${pergunta.id}`)?.closest('.mb-4');
            if (!container) return;

            if (this.shouldShowQuestion(pergunta)) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        });
    }

    /**
     * Mostra modal
     */
    show() {
        this.bsModal = new bootstrap.Modal(this.modalElement);
        this.bsModal.show();
    }

    /**
     * Fecha modal
     */
    close() {
        if (this.bsModal) {
            this.bsModal.hide();
        }
        setTimeout(() => {
            this.modalElement?.remove();
        }, 300);
    }

    /**
     * Exibe mensagem de erro
     */
    showError(message) {
        if (typeof showMessage === 'function') {
            showMessage(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Exibe mensagem de sucesso
     */
    showSuccess(message) {
        if (typeof showMessage === 'function') {
            showMessage(message, 'success');
        } else {
            alert(message);
        }
    }
}

// Exportar instância global
window.ModuleConfigModal = ModuleConfigModal;

console.log('[MODULE-CONFIG-MODAL] ✅ Módulo carregado');

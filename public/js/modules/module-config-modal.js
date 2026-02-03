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
        console.log(`[MODULE-CONFIG-MODAL] Inicializando modal - Liga: ${ligaId}, Módulo: ${modulo}`);
        this.ligaId = ligaId;
        this.currentModule = modulo;

        try {
            // Buscar wizard do backend
            console.log(`[MODULE-CONFIG-MODAL] Passo 1: Buscando wizard...`);
            this.wizardData = await this.fetchWizard(modulo);
            console.log(`[MODULE-CONFIG-MODAL] ✅ Wizard carregado`);

            this._injectExtratoIntegrationQuestions();
            this._injectMelhorMesIntervalsQuestion();

            // Buscar config existente (se houver)
            console.log(`[MODULE-CONFIG-MODAL] Passo 2: Buscando config existente...`);
            const configAtual = await this.fetchConfig(ligaId, modulo);
            this.userAnswers = configAtual?.wizard_respostas || {};
            console.log(`[MODULE-CONFIG-MODAL] ✅ Config carregada`);

            // Renderizar modal
            console.log(`[MODULE-CONFIG-MODAL] Passo 3: Renderizando modal...`);
            this.render();
            console.log(`[MODULE-CONFIG-MODAL] Passo 4: Exibindo modal...`);
            this.show();
            console.log(`[MODULE-CONFIG-MODAL] ✅ Modal exibido`);
        } catch (error) {
            console.error('[MODULE-CONFIG-MODAL] ❌ Erro ao inicializar:', error);
            console.error('[MODULE-CONFIG-MODAL] Stack trace:', error.stack);
            this.showError(`Erro ao carregar configuração: ${error.message}`);
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
     * Injeta pergunta de intervalos de edicoes para Melhor do Mes (fallback)
     */
    _injectMelhorMesIntervalsQuestion() {
        if (this.currentModule !== 'melhor_mes' || !this.wizardData) return;
        if (!Array.isArray(this.wizardData.perguntas)) {
            this.wizardData.perguntas = [];
        }

        const perguntas = this.wizardData.perguntas;
        const ids = new Set(perguntas.map(p => p.id));

        if (!ids.has('edicoes_intervalos')) {
            const idxTotal = perguntas.findIndex(p => p.id === 'total_edicoes');
            const pergunta = {
                id: 'edicoes_intervalos',
                tipo: 'edicoes_ranges',
                label: 'Intervalo de rodadas por edicao',
                descricao: 'Defina de qual rodada ate qual rodada cada edicao sera disputada.',
                required: true,
                dependeDe: 'total_edicoes',
                afeta: 'calendario_override.edicoes'
            };

            if (idxTotal >= 0) {
                if (perguntas[idxTotal].default === undefined) {
                    perguntas[idxTotal].default = 7;
                }
                perguntas.splice(idxTotal + 1, 0, pergunta);
            } else {
                perguntas.push(pergunta);
            }
        }
    }

    /**
     * Busca definição do wizard do backend
     */
    async fetchWizard(modulo) {
        console.log(`[MODULE-CONFIG-MODAL] Buscando wizard para: ${modulo}`);
        const response = await fetch(`/api/modulos/${modulo}/wizard`);
        console.log(`[MODULE-CONFIG-MODAL] Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[MODULE-CONFIG-MODAL] Erro ao buscar wizard: ${response.status}`, errorText);
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[MODULE-CONFIG-MODAL] Wizard recebido:`, data);
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
            let html = '';

            switch (q.tipo) {
                case 'number': html = this.renderNumberInput(q); break;
                case 'select': html = this.renderSelect(q); break;
                case 'boolean': html = this.renderSwitch(q); break;
                case 'text': html = this.renderTextInput(q); break;
                case 'valores_grid': html = this.renderValoresGrid(q); break;
                case 'edicoes_ranges': html = this.renderEdicoesRanges(q); break;
                default: html = '';
            }

            if (!html) return '';

            if (!q.dependeDe) return html;

            const shouldShow = this.shouldShowQuestion(q);
            return `
                <div class="question-conditional" data-question-container="${q.id}" style="display: ${shouldShow ? 'block' : 'none'};">
                    ${html}
                </div>
            `;
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
            // FIX: Usa == para permitir coerção number/string (ex: 1 == "1")
            // JSON pode ter valores numéricos, mas HTML input retorna strings
            const selected = opt.valor == valorAtual ? 'selected' : '';
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
     * Renderiza intervalos de edicoes (Melhor do Mes)
     */
    renderEdicoesRanges(pergunta) {
        const totalEdicoes = this._getTotalEdicoes();
        const respostas = this._getEdicoesValues(pergunta.id, totalEdicoes);

        const cards = [];
        for (let i = 1; i <= totalEdicoes; i++) {
            const edicao = respostas[i] || {};
            const inicio = edicao.inicio ?? '';
            const fim = edicao.fim ?? '';
            cards.push(`
                <div class="edicao-range-card">
                    <div class="edicao-range-header">Edição ${String(i).padStart(2, '0')}</div>
                    <div class="edicao-range-body">
                        <div class="input-group">
                            <span class="input-group-text bg-gray-700 text-white border-gray-600">Início</span>
                            <input type="number"
                                   class="form-control bg-gray-700 text-white border-gray-600"
                                   min="1"
                                   max="38"
                                   step="1"
                                   data-question-id="${pergunta.id}"
                                   data-edicao="${i}"
                                   data-campo="inicio"
                                   value="${inicio}"
                                   placeholder="Rodada">
                        </div>
                        <div class="input-group">
                            <span class="input-group-text bg-gray-700 text-white border-gray-600">Fim</span>
                            <input type="number"
                                   class="form-control bg-gray-700 text-white border-gray-600"
                                   min="1"
                                   max="38"
                                   step="1"
                                   data-question-id="${pergunta.id}"
                                   data-edicao="${i}"
                                   data-campo="fim"
                                   value="${fim}"
                                   placeholder="Rodada">
                        </div>
                    </div>
                </div>
            `);
        }

        const cardsHtml = cards.length ? cards.join('') : '<div class="text-muted">Defina o total de edições para configurar.</div>';

        return `
            <div class="mb-4" id="edicoesRangesWrapper">
                <label class="form-label">${pergunta.label} ${pergunta.required ? '<span class="text-danger">*</span>' : ''}</label>
                ${pergunta.descricao ? `<small class="text-muted d-block mb-2">${pergunta.descricao}</small>` : ''}
                <div class="edicoes-ranges" id="edicoesRanges">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza grid de valores (específico para rodadas)
     */
    renderValoresGrid(pergunta) {
        const totalParticipantes = this._getTotalParticipantes();
        const valores = this.userAnswers[pergunta.id] || {};
        const zonaConfig = this._getZonaConfig(pergunta, totalParticipantes);
        const gridHTML = zonaConfig
            ? this.buildValoresGridZonas(totalParticipantes, valores, pergunta, zonaConfig)
            : this.buildValoresGridSections(totalParticipantes || 10, valores, pergunta);

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

    _getTotalEdicoes() {
        let raw = this.userAnswers.total_edicoes ?? this.userAnswers.totalEdicoes ?? this.userAnswers.qtd_edicoes;
        if (raw === undefined) {
            const pergunta = this.wizardData?.perguntas?.find(p => p.id === 'total_edicoes');
            if (pergunta?.default !== undefined) {
                raw = pergunta.default;
            }
        }
        const total = Number(raw);
        return Number.isFinite(total) && total > 0 ? total : 0;
    }

    _getTotalRodadas() {
        const totalRodadasConfig = Number(this.wizardData?.calendario?.total_rodadas);
        if (Number.isFinite(totalRodadasConfig) && totalRodadasConfig > 0) return totalRodadasConfig;

        const edicoes = this.wizardData?.calendario?.edicoes;
        if (Array.isArray(edicoes) && edicoes.length) {
            const maxFim = Math.max(...edicoes.map(ed => Number(ed?.fim) || 0));
            if (maxFim > 0) return maxFim;
        }

        return 38;
    }

    _getEdicoesValues(questionId, totalEdicoes) {
        if (!questionId) return {};

        if (!this.userAnswers[questionId] || typeof this.userAnswers[questionId] !== 'object') {
            this.userAnswers[questionId] = {};
        }

        const valores = this.userAnswers[questionId];

        // Se nao existe respostas, tentar usar calendario default do wizard
        if (Object.keys(valores).length === 0 && Array.isArray(this.wizardData?.calendario?.edicoes)) {
            this.wizardData.calendario.edicoes.forEach((ed) => {
                if (!ed?.id) return;
                valores[ed.id] = { inicio: ed.inicio, fim: ed.fim };
            });
        }

        if (!this._hasEdicoesValues(questionId)) {
            this._autoDistribuirEdicoesRanges(questionId, totalEdicoes);
        }

        // Normalizar quantidade
        this._normalizeEdicoesRanges(questionId, totalEdicoes);

        return valores;
    }
    _getTotalParticipantes() {
        const raw = this.userAnswers.total_participantes ?? this.userAnswers.total_times ?? this.userAnswers.totalTimes;
        const total = Number(raw);
        return Number.isFinite(total) && total > 0 ? total : 0;
    }

    _getZonaConfig(pergunta, totalParticipantes) {
        if (!totalParticipantes) return null;

        const perguntas = this.wizardData?.perguntas || [];
        let ganhoId = null;
        let perdaId = null;

        perguntas.forEach(p => {
            if (p.tipo !== 'number') return;
            const label = String(p.label || '').toLowerCase();
            const id = String(p.id || '').toLowerCase();

            if (!ganhoId && (label.includes('ganho') || label.includes('bônus') || label.includes('bonus') || id.includes('ganho') || id.includes('bonus'))) {
                ganhoId = p.id;
            }
            if (!perdaId && (label.includes('perda') || label.includes('ônus') || label.includes('onus') || label.includes('débito') || label.includes('debito') || id.includes('perda') || id.includes('onus') || id.includes('debito'))) {
                perdaId = p.id;
            }
        });

        const ganhosRaw = ganhoId ? Number(this.userAnswers[ganhoId]) : 0;
        const perdasRaw = perdaId ? Number(this.userAnswers[perdaId]) : 0;

        const ganhos = Number.isFinite(ganhosRaw) ? ganhosRaw : 0;
        const perdas = Number.isFinite(perdasRaw) ? perdasRaw : 0;

        if (!ganhos && !perdas) return null;

        const ganhosClamped = Math.max(0, Math.min(totalParticipantes, ganhos));
        const perdasClamped = Math.max(0, Math.min(totalParticipantes - ganhosClamped, perdas));
        const neutraInicio = ganhosClamped + 1;
        const neutraFim = totalParticipantes - perdasClamped;

        return {
            ganhos: ganhosClamped,
            perdas: perdasClamped,
            neutraInicio,
            neutraFim,
            ganhoId,
            perdaId
        };
    }

    _hasEdicoesValues(questionId) {
        const valores = this.userAnswers?.[questionId];
        if (!valores || typeof valores !== 'object') return false;
        return Object.values(valores).some((ed) => {
            const inicioRaw = ed?.inicio;
            const fimRaw = ed?.fim;
            const inicio = Number(inicioRaw);
            const fim = Number(fimRaw);
            const hasInicio = inicioRaw !== '' && inicioRaw !== null && inicioRaw !== undefined;
            const hasFim = fimRaw !== '' && fimRaw !== null && fimRaw !== undefined;
            return (hasInicio && Number.isFinite(inicio)) || (hasFim && Number.isFinite(fim));
        });
    }

    _autoDistribuirEdicoesRanges(questionIdOverride = null, totalOverride = null, force = false) {
        const pergunta = this.wizardData?.perguntas?.find(p => p.tipo === 'edicoes_ranges');
        const questionId = questionIdOverride || pergunta?.id;
        const totalEdicoes = totalOverride ?? this._getTotalEdicoes();
        if (!questionId || !totalEdicoes) return;

        if (!force && this._hasEdicoesValues(questionId)) return;

        const totalRodadas = this._getTotalRodadas();
        const base = Math.floor(totalRodadas / totalEdicoes);
        const resto = totalRodadas % totalEdicoes;

        let inicio = 1;
        const valores = {};

        for (let i = 1; i <= totalEdicoes; i++) {
            const tamanho = base + (i <= resto ? 1 : 0);
            const fim = tamanho > 0 ? inicio + tamanho - 1 : inicio - 1;
            valores[i] = {
                inicio: tamanho > 0 ? inicio : '',
                fim: tamanho > 0 ? fim : ''
            };
            inicio = fim + 1;
        }

        this.userAnswers[questionId] = valores;
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
     * Monta HTML do grid com 3 zonas (ganho, neutra, perda)
     */
    buildValoresGridZonas(totalParticipantes, valores, pergunta, zonaConfig) {
        const { ganhos, perdas, neutraInicio, neutraFim } = zonaConfig;

        let html = '';

        // Zona de ganho
        html += `
            <div class="valores-grid-section zone-ganho">
                <div class="valores-grid-title">Zona de Ganho</div>
        `;
        if (ganhos > 0) {
            for (let i = 1; i <= ganhos; i++) {
                const valor = valores[i] ?? '';
                html += `
                    <div class="input-group mb-2">
                        <span class="input-group-text bg-gray-700 text-white border-gray-600" style="min-width: 80px;">
                            ${i}º lugar
                        </span>
                        <span class="input-group-text bg-gray-700 text-white border-gray-600">R$</span>
                        <input type="number"
                               class="form-control bg-gray-700 text-white border-gray-600 valor-input"
                               step="0.01"
                               min="0"
                               data-posicao="${i}"
                               data-question-id="${pergunta.id}"
                               value="${valor}"
                               placeholder="0.00"
                               required>
                    </div>
                `;
            }
        } else {
            html += `<div class="text-muted" style="font-size: 0.85rem;">Nenhuma posição de ganho configurada.</div>`;
        }
        html += `</div>`;

        // Zona neutra
        html += `
            <div class="valores-grid-section zone-neutra">
                <div class="valores-grid-title">Zona Neutra</div>
        `;
        if (neutraFim >= neutraInicio) {
            html += `
                <div class="text-muted" style="font-size: 0.9rem;">
                    Posições ${neutraInicio}–${neutraFim} sem ganho ou perda.
                </div>
            `;
        } else {
            html += `<div class="text-muted" style="font-size: 0.85rem;">Sem posições neutras.</div>`;
        }
        html += `</div>`;

        // Zona de perda
        html += `
            <div class="valores-grid-section zone-perda">
                <div class="valores-grid-title">Zona de Perda</div>
        `;
        if (perdas > 0) {
            const startPerda = totalParticipantes - perdas + 1;
            for (let i = startPerda; i <= totalParticipantes; i++) {
                const valor = valores[i] ?? '';
                html += `
                    <div class="input-group mb-2">
                        <span class="input-group-text bg-gray-700 text-white border-gray-600" style="min-width: 80px;">
                            ${i}º lugar
                        </span>
                        <span class="input-group-text bg-gray-700 text-white border-gray-600">R$</span>
                        <input type="number"
                               class="form-control bg-gray-700 text-white border-gray-600 valor-input"
                               step="0.01"
                               max="0"
                               data-posicao="${i}"
                               data-question-id="${pergunta.id}"
                               value="${valor}"
                               placeholder="-0.00"
                               required>
                    </div>
                `;
            }
        } else {
            html += `<div class="text-muted" style="font-size: 0.85rem;">Nenhuma posição de perda configurada.</div>`;
        }
        html += `</div>`;

        return html;
    }

    /**
     * Verifica se pergunta deve ser exibida (dependências)
     */
    shouldShowQuestion(pergunta) {
        if (!pergunta.dependeDe) return true;

        if (pergunta.tipo === 'edicoes_ranges' && pergunta.dependeDe === 'total_edicoes') {
            return this._getTotalEdicoes() > 0;
        }

        let dependValue = this.userAnswers[pergunta.dependeDe];
        if (dependValue === undefined) {
            const dependQuestion = this.wizardData?.perguntas?.find(p => p.id === pergunta.dependeDe);
            if (dependQuestion?.default !== undefined) {
                dependValue = dependQuestion.default;
            }
        }
        if (pergunta.condicao === undefined) {
            return !!dependValue;
        }
        return dependValue === pergunta.condicao;
    }

    /**
     * Atualiza preview de valores
     */
    updatePreview() {
        const previewContainer = document.getElementById('previewValores');
        if (!previewContainer) return;

        const pergunta = this.wizardData?.perguntas?.find(p => p.tipo === 'valores_grid');
        const totalParticipantes = this._getTotalParticipantes();
        const valores = pergunta ? (this.userAnswers[pergunta.id] || {}) : {};
        const zonaConfig = pergunta ? this._getZonaConfig(pergunta, totalParticipantes) : null;

        if (pergunta && zonaConfig) {
            this._preencherValoresNeutros(pergunta, zonaConfig, totalParticipantes);
        }

        if (!totalParticipantes || Object.keys(valores).length === 0) {
            previewContainer.innerHTML = '<small class="text-muted">Preencha os campos para ver o preview</small>';
            return;
        }

        const valoresNormalizados = pergunta ? (this.userAnswers[pergunta.id] || {}) : valores;

        let html = '<table class="table table-sm table-borderless text-white mb-0">';
        for (let i = 1; i <= totalParticipantes; i++) {
            const valor = parseFloat(valoresNormalizados[i]) || 0;
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
            if (input.disabled) return;
            const questionId = input.dataset.questionId;

            if (input.dataset.edicao && input.dataset.campo) {
                const edicao = Number(input.dataset.edicao);
                const campo = input.dataset.campo;
                if (!this.userAnswers[questionId]) this.userAnswers[questionId] = {};
                if (!this.userAnswers[questionId][edicao]) this.userAnswers[questionId][edicao] = {};
                const valor = input.value === '' ? '' : parseInt(input.value);
                this.userAnswers[questionId][edicao][campo] = Number.isFinite(valor) ? valor : '';
                return;
            }

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

        this._normalizeDependentValues();
        this._normalizeValoresGrid();
        this._normalizeEdicoesRanges();
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
                const totalParticipantes = this._getTotalParticipantes() || 10;
                for (let i = 1; i <= totalParticipantes; i++) {
                    if (valor[i] === undefined || valor[i] === null || valor[i] === '') {
                        this.showError(`Valor para ${i}º lugar é obrigatório`);
                        return false;
                    }
                }
            }

            // Validação de intervalos de edicoes
            if (pergunta.tipo === 'edicoes_ranges') {
                const totalEdicoes = this._getTotalEdicoes() || 0;
                const totalRodadas = this._getTotalRodadas();
                const ranges = [];
                for (let i = 1; i <= totalEdicoes; i++) {
                    const edicao = valor?.[i];
                    const inicio = Number(edicao?.inicio);
                    const fim = Number(edicao?.fim);
                    if (!Number.isFinite(inicio) || !Number.isFinite(fim)) {
                        this.showError(`Informe início e fim da edição ${i}`);
                        return false;
                    }
                    if (inicio < 1 || fim < 1 || inicio > totalRodadas || fim > totalRodadas || inicio > fim) {
                        this.showError(`Intervalo inválido na edição ${i}`);
                        return false;
                    }
                    ranges.push({ index: i, inicio, fim });
                }

                const ordered = ranges.sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
                if (ordered.length) {
                    const first = ordered[0];
                    const last = ordered[ordered.length - 1];
                    if (first.inicio !== 1) {
                        this.showError(`A primeira edição deve iniciar na rodada 1 (atual: ${first.inicio})`);
                        return false;
                    }
                    if (last.fim !== totalRodadas) {
                        this.showError(`A última edição deve finalizar na rodada ${totalRodadas} (atual: ${last.fim})`);
                        return false;
                    }
                }
                for (let i = 1; i < ordered.length; i++) {
                    const prev = ordered[i - 1];
                    const curr = ordered[i];
                    if (curr.inicio <= prev.fim) {
                        this.showError(`Sobreposição de rodadas entre as edições ${prev.index} e ${curr.index}`);
                        return false;
                    }
                    if (curr.inicio > prev.fim + 1) {
                        this.showError(`Lacuna entre as edições ${prev.index} e ${curr.index}`);
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
            window.dispatchEvent(new CustomEvent('modulo-config-saved', {
                detail: {
                    ligaId: this.ligaId,
                    modulo: this.currentModule,
                    respostas: { ...this.userAnswers }
                }
            }));

            setTimeout(() => {
                this.close();
            }, 800);

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
            this.reRenderConditionalFields();
        });

        const totalEdicoesInput = document.getElementById('input_total_edicoes');
        totalEdicoesInput?.addEventListener('change', (e) => {
            this.userAnswers.total_edicoes = parseInt(e.target.value);
            const pergunta = this.wizardData?.perguntas?.find(p => p.tipo === 'edicoes_ranges');
            if (pergunta) {
                this._autoDistribuirEdicoesRanges(pergunta.id, this._getTotalEdicoes(), true);
            }
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
                if (this._shouldRebuildGrid(input)) {
                    this.reRenderDynamicFields();
                }
            });
        });
    }

    _shouldRebuildGrid(input) {
        if (!input || input.classList.contains('valor-input')) return false;

        const questionId = input.dataset.questionId;
        if (!questionId) return false;

        if (questionId === 'total_participantes') return true;

        const pergunta = this.wizardData?.perguntas?.find(p => p.tipo === 'valores_grid');
        if (!pergunta) return false;

        const totalParticipantes = this._getTotalParticipantes();
        const zonaConfig = this._getZonaConfig(pergunta, totalParticipantes);
        if (!zonaConfig) return false;

        return questionId === zonaConfig.ganhoId || questionId === zonaConfig.perdaId;
    }

    /**
     * Re-renderiza campos dinâmicos (valores grid)
     */
    reRenderDynamicFields() {
        const gridContainer = document.getElementById('valoresGrid');
        if (gridContainer) {
            const pergunta = this.wizardData.perguntas.find(p => p.tipo === 'valores_grid');
            if (pergunta) {
                const totalParticipantes = this._getTotalParticipantes() || 10;
                const valores = this.userAnswers[pergunta.id] || {};
                const zonaConfig = this._getZonaConfig(pergunta, totalParticipantes);

                gridContainer.innerHTML = zonaConfig
                    ? this.buildValoresGridZonas(totalParticipantes, valores, pergunta, zonaConfig)
                    : this.buildValoresGridSections(totalParticipantes, valores, pergunta);
                this.updatePreview();
            }
        }

        const edicoesContainer = document.getElementById('edicoesRanges');
        if (edicoesContainer) {
            const pergunta = this.wizardData.perguntas.find(p => p.tipo === 'edicoes_ranges');
            if (pergunta) {
                const totalEdicoes = this._getTotalEdicoes();
                const respostas = this._getEdicoesValues(pergunta.id, totalEdicoes);

                const cards = [];
                for (let i = 1; i <= totalEdicoes; i++) {
                    const edicao = respostas[i] || {};
                    const inicio = edicao.inicio ?? '';
                    const fim = edicao.fim ?? '';
                    cards.push(`
                        <div class="edicao-range-card">
                            <div class="edicao-range-header">Edição ${String(i).padStart(2, '0')}</div>
                            <div class="edicao-range-body">
                                <div class="input-group">
                                    <span class="input-group-text bg-gray-700 text-white border-gray-600">Início</span>
                                    <input type="number"
                                           class="form-control bg-gray-700 text-white border-gray-600"
                                           min="1"
                                           max="38"
                                           step="1"
                                           data-question-id="${pergunta.id}"
                                           data-edicao="${i}"
                                           data-campo="inicio"
                                           value="${inicio}"
                                           placeholder="Rodada">
                                </div>
                                <div class="input-group">
                                    <span class="input-group-text bg-gray-700 text-white border-gray-600">Fim</span>
                                    <input type="number"
                                           class="form-control bg-gray-700 text-white border-gray-600"
                                           min="1"
                                           max="38"
                                           step="1"
                                           data-question-id="${pergunta.id}"
                                           data-edicao="${i}"
                                           data-campo="fim"
                                           value="${fim}"
                                           placeholder="Rodada">
                                </div>
                            </div>
                        </div>
                    `);
                }

                edicoesContainer.innerHTML = cards.join('') || '<div class="text-muted">Defina o total de edições para configurar.</div>';
            }
        }
    }

    /**
     * Re-renderiza campos condicionais
     */
    reRenderConditionalFields() {
        // Recarregar perguntas que dependem de outras
        const perguntas = this.wizardData.perguntas || [];
        perguntas.forEach(pergunta => {
            if (!pergunta.dependeDe) return;

            const container = this.modalElement.querySelector(`[data-question-container="${pergunta.id}"]`)
                || document.getElementById(`input_${pergunta.id}`)?.closest('.mb-4');
            if (!container) return;

            if (this.shouldShowQuestion(pergunta)) {
                container.style.display = 'block';
                const input = document.getElementById(`input_${pergunta.id}`);
                if (input) input.disabled = false;
            } else {
                container.style.display = 'none';
                const input = document.getElementById(`input_${pergunta.id}`);
                if (input) input.disabled = true;

                // Limpar valores dependentes do toggle Integrar no Extrato
                if (pergunta.dependeDe === 'integrar_extrato') {
                    delete this.userAnswers[pergunta.id];
                    if (input) {
                        if (input.type === 'checkbox') input.checked = false;
                        else input.value = '';
                    }
                }
            }
        });
    }

    _normalizeDependentValues() {
        const perguntas = this.wizardData?.perguntas || [];
        perguntas.forEach(pergunta => {
            if (!pergunta.dependeDe) return;
            if (this.shouldShowQuestion(pergunta)) return;
            if (pergunta.dependeDe === 'integrar_extrato') {
                delete this.userAnswers[pergunta.id];
            }
        });
    }

    _normalizeValoresGrid() {
        const pergunta = this.wizardData?.perguntas?.find(p => p.tipo === 'valores_grid');
        if (!pergunta) return;
        const totalParticipantes = this._getTotalParticipantes();
        if (!totalParticipantes) return;

        if (!this.userAnswers[pergunta.id]) {
            this.userAnswers[pergunta.id] = {};
        }

        const zonaConfig = this._getZonaConfig(pergunta, totalParticipantes);
        if (zonaConfig) {
            this._preencherValoresNeutros(pergunta, zonaConfig, totalParticipantes);
        }
    }

    _normalizeEdicoesRanges(questionIdOverride = null, totalOverride = null) {
        const pergunta = this.wizardData?.perguntas?.find(p => p.tipo === 'edicoes_ranges');
        if (!pergunta && !questionIdOverride) return;
        const questionId = questionIdOverride || pergunta.id;
        const totalEdicoes = totalOverride ?? this._getTotalEdicoes();
        if (!totalEdicoes || !questionId) return;

        if (!this.userAnswers[questionId]) {
            this.userAnswers[questionId] = {};
        }

        const valores = this.userAnswers[questionId];
        Object.keys(valores).forEach((key) => {
            if (Number(key) > totalEdicoes) {
                delete valores[key];
            }
        });

        for (let i = 1; i <= totalEdicoes; i++) {
            if (!valores[i]) {
                valores[i] = { inicio: '', fim: '' };
            }
        }
    }

    _preencherValoresNeutros(pergunta, zonaConfig, totalParticipantes) {
        const valores = this.userAnswers[pergunta.id] || {};
        const { neutraInicio, neutraFim } = zonaConfig;
        if (neutraFim >= neutraInicio) {
            for (let i = neutraInicio; i <= neutraFim; i++) {
                if (valores[i] === undefined || valores[i] === null || valores[i] === '') {
                    valores[i] = 0;
                }
            }
        }
        this.userAnswers[pergunta.id] = valores;
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
            SuperModal.toast.error(message);
        }
    }

    /**
     * Exibe mensagem de sucesso
     */
    showSuccess(message) {
        if (typeof showMessage === 'function') {
            showMessage(message, 'success');
        } else {
            SuperModal.toast.success(message);
        }
    }
}

// Exportar instância global
window.ModuleConfigModal = ModuleConfigModal;

console.log('[MODULE-CONFIG-MODAL] ✅ Módulo carregado');

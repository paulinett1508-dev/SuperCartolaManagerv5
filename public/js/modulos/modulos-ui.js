/**
 * Modulos UI Module
 *
 * Orquestra a interface de gerenciamento de modulos.
 * Conecta API, Wizard e interacoes do usuario.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

const ModulosUI = (function() {
    'use strict';

    // Estado
    let ligaAtual = null;
    let temporadaAtual = null;
    let modulosCache = [];
    let wizardCache = {};

    // Containers
    let containerModulos = null;
    let containerModal = null;

    // =========================================================================
    // INICIALIZACAO
    // =========================================================================

    /**
     * Inicializa o modulo de UI
     * @param {Object} config - Configuracoes
     * @param {string} config.ligaId - ID da liga
     * @param {number} config.temporada - Temporada
     * @param {string} config.containerSelector - Seletor do container de modulos
     * @param {string} config.modalContainerSelector - Seletor do container de modais
     */
    async function init(config) {
        ligaAtual = config.ligaId;
        temporadaAtual = config.temporada || new Date().getFullYear();
        containerModulos = document.querySelector(config.containerSelector);
        containerModal = document.querySelector(config.modalContainerSelector) || document.body;

        if (!containerModulos) {
            console.error('[MODULOS-UI] Container de modulos nao encontrado');
            return;
        }

        // Carregar modulos
        await carregarModulos();

        // Bind de eventos
        bindEventos();

        console.log('[MODULOS-UI] Inicializado para liga', ligaAtual);
    }

    // =========================================================================
    // CARREGAMENTO
    // =========================================================================

    async function carregarModulos() {
        try {
            mostrarLoading();

            const resultado = await ModulosAPI.listarModulos(ligaAtual, temporadaAtual);

            if (resultado.sucesso) {
                modulosCache = resultado.modulos;
                renderizarModulos();
            } else {
                mostrarErro('Erro ao carregar modulos');
            }
        } catch (error) {
            console.error('[MODULOS-UI] Erro ao carregar modulos:', error);
            mostrarErro(error.message);
        }
    }

    function renderizarModulos() {
        const html = ModulosWizard.gerarListaModulos(modulosCache, ligaAtual);
        containerModulos.innerHTML = html;
    }

    function mostrarLoading() {
        containerModulos.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <p class="text-muted mt-2">Carregando modulos...</p>
            </div>
        `;
    }

    function mostrarErro(mensagem) {
        containerModulos.innerHTML = `
            <div class="alert alert-danger">
                <span class="material-icons" style="vertical-align: middle;">error</span>
                ${mensagem}
            </div>
        `;
    }

    // =========================================================================
    // EVENTOS
    // =========================================================================

    function bindEventos() {
        // Delegacao de eventos no container
        containerModulos.addEventListener('click', async (e) => {
            const btnAtivar = e.target.closest('.btn-ativar-modulo');
            const btnDesativar = e.target.closest('.btn-desativar-modulo');
            const btnConfig = e.target.closest('.btn-config-modulo');

            if (btnAtivar) {
                const moduloId = btnAtivar.dataset.modulo;
                const moduloNome = btnAtivar.dataset.nome;
                await abrirWizard(moduloId, moduloNome);
            }

            if (btnDesativar) {
                const moduloId = btnDesativar.dataset.modulo;
                const moduloNome = btnDesativar.dataset.nome;
                await confirmarDesativar(moduloId, moduloNome);
            }

            if (btnConfig) {
                const moduloId = btnConfig.dataset.modulo;
                const moduloNome = btnConfig.dataset.nome;
                await abrirWizard(moduloId, moduloNome, true);
            }
        });

        // Evento no container de modais (delegacao)
        containerModal.addEventListener('click', async (e) => {
            const btnSalvar = e.target.closest('#btnSalvarWizard');
            const btnConfirmarDesativar = e.target.closest('#btnConfirmarDesativar');

            if (btnSalvar) {
                await salvarWizard();
            }

            if (btnConfirmarDesativar) {
                const moduloId = btnConfirmarDesativar.dataset.modulo;
                await desativarModulo(moduloId);
            }
        });
    }

    // =========================================================================
    // WIZARD
    // =========================================================================

    async function abrirWizard(moduloId, moduloNome, isEdicao = false) {
        try {
            // Buscar wizard do cache ou API
            let wizardConfig = wizardCache[moduloId];
            if (!wizardConfig) {
                const resultado = await ModulosAPI.buscarWizard(moduloId);
                if (resultado.sucesso) {
                    wizardConfig = resultado.wizard;
                    wizardCache[moduloId] = wizardConfig;
                }
            }

            // Buscar valores atuais se for edicao
            let valoresAtuais = {};
            if (isEdicao) {
                const configAtual = await ModulosAPI.buscarModulo(ligaAtual, moduloId, temporadaAtual);
                if (configAtual.sucesso && configAtual.config) {
                    valoresAtuais = configAtual.config.wizard_respostas || {};
                }
            }

            // Gerar e exibir modal
            const moduloInfo = { nome: moduloNome, id: moduloId };
            const html = ModulosWizard.gerarModalWizard(moduloId, wizardConfig, valoresAtuais, moduloInfo);

            // Remover modal anterior se existir
            const modalAnterior = document.getElementById('modalWizardModulo');
            if (modalAnterior) {
                modalAnterior.remove();
            }

            // Adicionar novo modal
            containerModal.insertAdjacentHTML('beforeend', html);

            // Exibir modal
            const modal = new bootstrap.Modal(document.getElementById('modalWizardModulo'));
            modal.show();

        } catch (error) {
            console.error('[MODULOS-UI] Erro ao abrir wizard:', error);
            SuperModal.toast.error('Erro ao abrir configuracao: ' + error.message);
        }
    }

    async function salvarWizard() {
        const form = document.getElementById('formWizardModulo');
        if (!form) return;

        const moduloId = form.dataset.modulo;
        const wizardConfig = wizardCache[moduloId];
        const perguntas = wizardConfig?.perguntas || [];

        // Validar
        const validacao = ModulosWizard.validarWizard(form, perguntas);
        if (!validacao.valido) {
            SuperModal.toast.warning('Preencha todos os campos obrigatorios: ' + validacao.erros.join(', '));
            return;
        }

        // Coletar valores
        const valores = ModulosWizard.coletarValoresWizard(form, perguntas);

        try {
            // Desabilitar botao
            const btnSalvar = document.getElementById('btnSalvarWizard');
            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
            }

            // Salvar
            const resultado = await ModulosAPI.ativarModulo(ligaAtual, moduloId, {
                wizard_respostas: valores
            }, temporadaAtual);

            if (resultado.sucesso) {
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalWizardModulo'));
                if (modal) modal.hide();

                // Recarregar lista
                await carregarModulos();

                // Feedback
                mostrarToast('Modulo ativado com sucesso!', 'success');
            } else {
                throw new Error(resultado.erro || 'Erro ao salvar');
            }

        } catch (error) {
            console.error('[MODULOS-UI] Erro ao salvar wizard:', error);
            SuperModal.toast.error('Erro ao salvar: ' + error.message);

            // Reabilitar botao
            const btnSalvar = document.getElementById('btnSalvarWizard');
            if (btnSalvar) {
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = '<span class="material-icons" style="vertical-align: middle;">check</span> Ativar Modulo';
            }
        }
    }

    // =========================================================================
    // DESATIVAR
    // =========================================================================

    async function confirmarDesativar(moduloId, moduloNome) {
        const moduloInfo = { nome: moduloNome, id: moduloId };
        const html = ModulosWizard.gerarModalDesativar(moduloId, moduloInfo);

        // Remover modal anterior se existir
        const modalAnterior = document.getElementById('modalDesativarModulo');
        if (modalAnterior) {
            modalAnterior.remove();
        }

        // Adicionar novo modal
        containerModal.insertAdjacentHTML('beforeend', html);

        // Exibir modal
        const modal = new bootstrap.Modal(document.getElementById('modalDesativarModulo'));
        modal.show();
    }

    async function desativarModulo(moduloId) {
        try {
            // Desabilitar botao
            const btn = document.getElementById('btnConfirmarDesativar');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Desativando...';
            }

            const resultado = await ModulosAPI.desativarModulo(ligaAtual, moduloId, temporadaAtual);

            if (resultado.sucesso) {
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalDesativarModulo'));
                if (modal) modal.hide();

                // Recarregar lista
                await carregarModulos();

                // Feedback
                mostrarToast('Modulo desativado', 'warning');
            } else {
                throw new Error(resultado.erro || 'Erro ao desativar');
            }

        } catch (error) {
            console.error('[MODULOS-UI] Erro ao desativar:', error);
            SuperModal.toast.error('Erro ao desativar: ' + error.message);

            const btn = document.getElementById('btnConfirmarDesativar');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-icons" style="vertical-align: middle;">block</span> Desativar';
            }
        }
    }

    // =========================================================================
    // TOAST / FEEDBACK
    // =========================================================================

    function mostrarToast(mensagem, tipo = 'info') {
        const bgClass = {
            success: 'bg-success',
            warning: 'bg-warning text-dark',
            danger: 'bg-danger',
            info: 'bg-info'
        }[tipo] || 'bg-info';

        const toastHtml = `
            <div class="toast align-items-center ${bgClass} border-0 position-fixed bottom-0 end-0 m-3" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${mensagem}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = document.body.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();

        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    // =========================================================================
    // EXPORTS
    // =========================================================================

    return {
        init,
        carregarModulos,
        abrirWizard,
        mostrarToast
    };

})();

// Export para uso em modulos ES6
if (typeof window !== 'undefined') {
    window.ModulosUI = ModulosUI;
}

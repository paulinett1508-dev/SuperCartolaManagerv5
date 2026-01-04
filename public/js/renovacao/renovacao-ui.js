/**
 * Renovacao UI Module
 *
 * Gerencia renderizacao e interacoes de UI dos modais de renovacao.
 * Conecta modais com API e core.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

const RenovacaoUI = (function() {
    'use strict';

    // =========================================================================
    // ESTADO
    // =========================================================================

    let state = {
        ligaId: null,
        temporada: 2026,
        regras: null,
        modalAtivo: null,
        timeSelecionado: null
    };

    // =========================================================================
    // HELPERS
    // =========================================================================

    function showModal(html, modalId) {
        // Remove modal anterior se existir
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        // Insere novo modal
        document.body.insertAdjacentHTML('beforeend', html);

        // Inicializa Bootstrap modal
        const modalEl = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalEl);
        state.modalAtivo = modal;

        // Cleanup ao fechar
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
            state.modalAtivo = null;
        });

        modal.show();
        return modal;
    }

    function fecharModal() {
        if (state.modalAtivo) {
            state.modalAtivo.hide();
        }
    }

    function showToast(message, type = 'success') {
        // Usa sistema de toast do projeto se disponivel
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else if (typeof window.ToastManager !== 'undefined') {
            window.ToastManager.show(message, type);
        } else {
            alert(message);
        }
    }

    function setLoading(button, loading = true) {
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Aguarde...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || 'OK';
        }
    }

    // =========================================================================
    // MODAL: CONFIGURACAO DA LIGA
    // =========================================================================

    async function abrirModalConfig(ligaId, ligaNome) {
        state.ligaId = ligaId;

        try {
            // Buscar regras atuais
            const response = await RenovacaoAPI.buscarRegras(ligaId, state.temporada);
            state.regras = response.rules;

            const html = RenovacaoModals.modalConfigLiga(
                ligaId,
                ligaNome || response.ligaNome,
                state.regras,
                state.temporada
            );

            showModal(html, 'modalConfigLiga');

            // Event listeners
            const btnSalvar = document.getElementById('btnSalvarConfig');
            const btnAbrir = document.getElementById('btnAbrirRenovacoes');
            const btnEncerrar = document.getElementById('btnEncerrarRenovacoes');
            const btnReabrir = document.getElementById('btnReabrirRenovacoes');

            if (btnSalvar) {
                btnSalvar.addEventListener('click', () => salvarConfigLiga());
            }

            if (btnAbrir) {
                btnAbrir.addEventListener('click', () => alterarStatusLiga('aberto'));
            }

            if (btnEncerrar) {
                btnEncerrar.addEventListener('click', () => alterarStatusLiga('encerrado'));
            }

            if (btnReabrir) {
                btnReabrir.addEventListener('click', () => alterarStatusLiga('aberto'));
            }

            // Event listener para checkbox de parcelamento
            const checkParcelamento = document.getElementById('permitirParcelamento');
            const selectParcelas = document.getElementById('maxParcelas');
            if (checkParcelamento && selectParcelas) {
                checkParcelamento.addEventListener('change', () => {
                    selectParcelas.disabled = !checkParcelamento.checked;
                });
            }

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao abrir config:', error);
            showToast('Erro ao carregar configuracoes: ' + error.message, 'error');
        }
    }

    async function salvarConfigLiga() {
        const form = document.getElementById('formConfigLiga');
        const btn = document.getElementById('btnSalvarConfig');

        // Ler todos os campos do formulario expandido
        const dados = {
            inscricao: {
                taxa: parseFloat(form.taxa.value) || 0,
                prazo_renovacao: form.prazo_renovacao.value,
                permitir_devedor_renovar: form.permitir_devedor_renovar.checked,
                aproveitar_saldo_positivo: form.aproveitar_saldo_positivo.checked,
                permitir_parcelamento: document.getElementById('permitirParcelamento')?.checked || false,
                max_parcelas: parseInt(document.getElementById('maxParcelas')?.value) || 1
            },
            mensagens: {
                boas_vindas: document.getElementById('msgBoasVindas')?.value || '',
                aviso_devedor: document.getElementById('msgAvisoDevedor')?.value || '',
                confirmacao: document.getElementById('msgConfirmacao')?.value || ''
            }
        };

        setLoading(btn, true);

        try {
            await RenovacaoAPI.salvarRegras(state.ligaId, state.temporada, dados);
            showToast('Configuracoes salvas com sucesso!');
            fecharModal();

            // Recarregar dados se houver callback
            if (typeof window.onRenovacaoAtualizada === 'function') {
                window.onRenovacaoAtualizada();
            }
        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao salvar:', error);
            showToast('Erro ao salvar: ' + error.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    }

    async function alterarStatusLiga(novoStatus) {
        if (!confirm(`Confirma ${novoStatus === 'aberto' ? 'ABRIR' : 'ENCERRAR'} as renovacoes?`)) {
            return;
        }

        try {
            await RenovacaoAPI.alterarStatusRenovacao(state.ligaId, state.temporada, novoStatus);
            showToast(`Renovacoes ${novoStatus === 'aberto' ? 'abertas' : 'encerradas'}!`);
            fecharModal();

            // Reabrir para atualizar UI
            setTimeout(() => {
                abrirModalConfig(state.ligaId);
            }, 500);
        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao alterar status:', error);
            showToast('Erro: ' + error.message, 'error');
        }
    }

    // =========================================================================
    // MODAL: RENOVAR PARTICIPANTE
    // =========================================================================

    async function abrirModalRenovar(ligaId, participante) {
        state.ligaId = ligaId;

        try {
            // Buscar preview do calculo
            const preview = await RenovacaoAPI.previewInscricao(
                ligaId,
                state.temporada,
                participante.time_id
            );

            // Buscar regras se nao tiver
            if (!state.regras) {
                const response = await RenovacaoAPI.buscarRegras(ligaId, state.temporada);
                state.regras = response.rules;
            }

            const html = RenovacaoModals.modalRenovar(
                participante,
                preview,
                state.regras?.inscricao
            );

            showModal(html, 'modalRenovar');

            // Event listener
            const btnConfirmar = document.getElementById('btnConfirmarRenovacao');
            if (btnConfirmar) {
                btnConfirmar.addEventListener('click', () => confirmarRenovacao());
            }

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao abrir renovacao:', error);
            showToast('Erro ao carregar dados: ' + error.message, 'error');
        }
    }

    async function confirmarRenovacao() {
        const btn = document.getElementById('btnConfirmarRenovacao');
        const timeId = document.getElementById('hdnTimeIdRenovar').value;
        const pagouInscricao = document.getElementById('checkPagouInscricao').checked;
        const aproveitarCredito = document.getElementById('checkAproveitarCredito').checked;
        const observacoes = document.getElementById('txtObservacoesRenovar').value;

        setLoading(btn, true);

        try {
            await RenovacaoAPI.renovarParticipante(
                state.ligaId,
                state.temporada,
                timeId,
                { pagouInscricao, aproveitarCredito, observacoes }
            );

            showToast('Participante renovado com sucesso!');
            fecharModal();

            // Callback para atualizar UI
            if (typeof window.onRenovacaoAtualizada === 'function') {
                window.onRenovacaoAtualizada();
            }
        } catch (error) {
            console.error('[RENOVACAO-UI] Erro na renovacao:', error);
            showToast('Erro: ' + error.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    }

    // =========================================================================
    // MODAL: NAO PARTICIPAR
    // =========================================================================

    async function abrirModalNaoParticipar(ligaId, participante) {
        state.ligaId = ligaId;

        try {
            // Buscar saldo anterior
            const preview = await RenovacaoAPI.previewInscricao(
                ligaId,
                state.temporada,
                participante.time_id
            );

            const html = RenovacaoModals.modalNaoParticipar(
                participante,
                preview?.saldoTemporadaAnterior
            );

            showModal(html, 'modalNaoParticipar');

            // Event listener
            const btnConfirmar = document.getElementById('btnConfirmarNaoParticipa');
            if (btnConfirmar) {
                btnConfirmar.addEventListener('click', () => confirmarNaoParticipar());
            }

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao abrir modal:', error);
            showToast('Erro ao carregar dados: ' + error.message, 'error');
        }
    }

    async function confirmarNaoParticipar() {
        const btn = document.getElementById('btnConfirmarNaoParticipa');
        const timeId = document.getElementById('hdnTimeIdNaoParticipa').value;
        const observacoes = document.getElementById('txtObservacoesNaoParticipa').value;

        setLoading(btn, true);

        try {
            await RenovacaoAPI.naoParticipar(
                state.ligaId,
                state.temporada,
                timeId,
                { observacoes }
            );

            showToast('Participante marcado como NAO PARTICIPA');
            fecharModal();

            // Callback para atualizar UI
            if (typeof window.onRenovacaoAtualizada === 'function') {
                window.onRenovacaoAtualizada();
            }
        } catch (error) {
            console.error('[RENOVACAO-UI] Erro:', error);
            showToast('Erro: ' + error.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    }

    // =========================================================================
    // MODAL: NOVO PARTICIPANTE
    // =========================================================================

    async function abrirModalNovoParticipante(ligaId) {
        state.ligaId = ligaId;
        state.timeSelecionado = null;

        try {
            // Buscar regras para pegar a taxa
            if (!state.regras) {
                const response = await RenovacaoAPI.buscarRegras(ligaId, state.temporada);
                state.regras = response.rules;
            }

            const taxa = state.regras?.inscricao?.taxa || 0;

            const html = RenovacaoModals.modalNovoParticipante(
                ligaId,
                state.temporada,
                taxa
            );

            showModal(html, 'modalNovoParticipante');

            // Event listeners
            setupBuscaTimeListeners();

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao abrir modal:', error);
            showToast('Erro ao carregar dados: ' + error.message, 'error');
        }
    }

    function setupBuscaTimeListeners() {
        const inputBusca = document.getElementById('inputBuscaTime');
        const btnBuscar = document.getElementById('btnBuscarTime');
        const btnCadastrar = document.getElementById('btnCadastrarNovo');
        const btnLimpar = document.getElementById('btnLimparSelecao');

        // Buscar ao clicar ou Enter
        btnBuscar.addEventListener('click', () => executarBuscaTime());
        inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executarBuscaTime();
            }
        });

        // Cadastrar
        btnCadastrar.addEventListener('click', () => cadastrarNovoParticipante());

        // Limpar selecao
        btnLimpar.addEventListener('click', () => limparSelecaoTime());
    }

    async function executarBuscaTime() {
        const input = document.getElementById('inputBuscaTime');
        const loading = document.getElementById('loadingBusca');
        const resultados = document.getElementById('resultadosBusca');
        const query = input.value.trim();

        if (query.length < 3) {
            showToast('Digite pelo menos 3 caracteres', 'warning');
            return;
        }

        loading.classList.remove('d-none');
        resultados.innerHTML = '';

        try {
            const response = await RenovacaoAPI.buscarTimeCartola(query);
            const times = response.times || [];

            if (times.length === 0) {
                resultados.innerHTML = '<p class="text-muted text-center py-3">Nenhum time encontrado</p>';
            } else {
                resultados.innerHTML = times.map(t => RenovacaoModals.itemResultadoBusca(t)).join('');

                // Event listeners para selecao
                resultados.querySelectorAll('.resultado-busca-item').forEach(item => {
                    item.addEventListener('click', () => selecionarTime(item.dataset));
                });
            }

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro na busca:', error);
            resultados.innerHTML = `<p class="text-danger text-center py-3">Erro: ${error.message}</p>`;
        } finally {
            loading.classList.add('d-none');
        }
    }

    function selecionarTime(dados) {
        state.timeSelecionado = {
            time_id: parseInt(dados.timeId),
            nome_time: dados.nomeTime,
            nome_cartoleiro: dados.nomeCartoleiro,
            escudo: dados.escudo
        };

        // Atualizar UI
        document.getElementById('timeSelecionado').classList.remove('d-none');
        document.getElementById('escudoSelecionado').src = dados.escudo || '/img/default-escudo.png';
        document.getElementById('nomeTimeSelecionado').textContent = dados.nomeTime;
        document.getElementById('nomeCartoleiroSelecionado').textContent = dados.nomeCartoleiro;

        // Hidden fields
        document.getElementById('hdnTimeIdNovo').value = dados.timeId;
        document.getElementById('hdnNomeTimeNovo').value = dados.nomeTime;
        document.getElementById('hdnNomeCartoleiroNovo').value = dados.nomeCartoleiro;
        document.getElementById('hdnEscudoNovo').value = dados.escudo;

        // Habilitar botao
        document.getElementById('btnCadastrarNovo').disabled = false;

        // Limpar resultados
        document.getElementById('resultadosBusca').innerHTML = '';
    }

    function limparSelecaoTime() {
        state.timeSelecionado = null;
        document.getElementById('timeSelecionado').classList.add('d-none');
        document.getElementById('btnCadastrarNovo').disabled = true;
        document.getElementById('hdnTimeIdNovo').value = '';
    }

    async function cadastrarNovoParticipante() {
        if (!state.timeSelecionado) {
            showToast('Selecione um time primeiro', 'warning');
            return;
        }

        const btn = document.getElementById('btnCadastrarNovo');
        const pagouInscricao = document.getElementById('checkPagouInscricaoNovo').checked;
        const observacoes = document.getElementById('txtObservacoesNovo').value;

        setLoading(btn, true);

        try {
            await RenovacaoAPI.novoParticipante(
                state.ligaId,
                state.temporada,
                state.timeSelecionado,
                { pagouInscricao, observacoes }
            );

            showToast('Novo participante cadastrado com sucesso!');
            fecharModal();

            // Callback para atualizar UI
            if (typeof window.onRenovacaoAtualizada === 'function') {
                window.onRenovacaoAtualizada();
            }
        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao cadastrar:', error);
            showToast('Erro: ' + error.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        // Estado
        getState: () => ({ ...state }),
        setTemporada: (t) => { state.temporada = t; },

        // Modais
        abrirModalConfig,
        abrirModalRenovar,
        abrirModalNaoParticipar,
        abrirModalNovoParticipante,
        fecharModal,

        // Helpers
        showToast
    };

})();

// Export para ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenovacaoUI;
}

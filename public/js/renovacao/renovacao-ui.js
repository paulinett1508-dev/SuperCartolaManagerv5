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
        console.log('[RENOVACAO-UI] showModal() chamado para:', modalId);

        // Remove modal anterior se existir
        const existing = document.getElementById(modalId);
        if (existing) {
            console.log('[RENOVACAO-UI] Removendo modal existente');
            existing.remove();
        }

        // Remove backdrop anterior se existir
        const existingBackdrop = document.querySelector('.custom-modal-backdrop');
        if (existingBackdrop) existingBackdrop.remove();

        // Criar backdrop customizado
        const backdrop = document.createElement('div');
        backdrop.className = 'custom-modal-backdrop';
        backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1040;';
        document.body.appendChild(backdrop);

        // Insere novo modal
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('[RENOVACAO-UI] Modal inserido no DOM');

        const modalEl = document.getElementById(modalId);
        if (!modalEl) {
            console.error('[RENOVACAO-UI] Modal não encontrado após inserção!');
            backdrop.remove();
            return null;
        }

        // Aplicar estilos diretamente para garantir visibilidade
        modalEl.style.cssText = 'display:block !important;position:fixed;top:0;left:0;width:100%;height:100%;z-index:1050;overflow-y:auto;';
        modalEl.classList.add('show');
        document.body.style.overflow = 'hidden';

        console.log('[RENOVACAO-UI] Modal visível com estilos inline');

        // Guardar referências para fechar
        state.modalAtivo = {
            element: modalEl,
            backdrop: backdrop,
            hide: function() {
                modalEl.style.display = 'none';
                backdrop.remove();
                document.body.style.overflow = '';
                modalEl.remove();
                state.modalAtivo = null;
            }
        };

        // Event listener para TODOS os botões de fechar (X e Cancelar)
        const btnsClose = modalEl.querySelectorAll('[data-bs-dismiss="modal"]');
        btnsClose.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                fecharModal();
            });
        });

        // Fechar ao clicar no backdrop (não, pois é static)
        // backdrop.addEventListener('click', () => fecharModal());

        return state.modalAtivo;
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

            // Event listener - Confirmar
            const btnConfirmar = document.getElementById('btnConfirmarRenovacao');
            if (btnConfirmar) {
                btnConfirmar.addEventListener('click', () => confirmarRenovacao());
            }

            // Event listener - Atualização dinâmica do preview
            const checkPagou = document.getElementById('checkPagouInscricao');
            const checkCredito = document.getElementById('checkAproveitarCredito');

            if (checkPagou) {
                checkPagou.addEventListener('change', () => atualizarPreviewCalculo());
            }
            if (checkCredito) {
                checkCredito.addEventListener('change', () => atualizarPreviewCalculo());
            }

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao abrir renovacao:', error);
            showToast('Erro ao carregar dados: ' + error.message, 'error');
        }
    }

    /**
     * Atualiza o preview de cálculo quando checkboxes mudam
     */
    function atualizarPreviewCalculo() {
        const card = document.getElementById('cardCalculo2026');
        if (!card) return;

        const checkPagou = document.getElementById('checkPagouInscricao');
        const checkCredito = document.getElementById('checkAproveitarCredito');
        const pagouInscricao = checkPagou?.checked ?? true;

        // Buscar cenários dos data attributes
        let cenarioPagou, cenarioNaoPagou;
        try {
            cenarioPagou = JSON.parse(card.dataset.cenarioPagou || '{}');
            cenarioNaoPagou = JSON.parse(card.dataset.cenarioNaoPagou || '{}');
        } catch (e) {
            console.error('[RENOVACAO-UI] Erro ao parsear cenarios:', e);
            return;
        }

        const taxa = parseFloat(card.dataset.taxa) || 0;

        // Selecionar cenário baseado no checkbox
        const cenario = pagouInscricao ? cenarioPagou : cenarioNaoPagou;

        // Atualizar status da taxa
        const rowTaxaStatus = document.getElementById('rowTaxaStatus');
        const statusTaxa = document.getElementById('statusTaxa');
        if (rowTaxaStatus && statusTaxa) {
            if (pagouInscricao) {
                rowTaxaStatus.className = 'text-success';
                statusTaxa.innerHTML = '<span class="material-icons" style="font-size:14px;vertical-align:middle;">check_circle</span> Paga (nao vira divida)';
            } else {
                rowTaxaStatus.className = 'text-warning';
                statusTaxa.innerHTML = '<span class="material-icons" style="font-size:14px;vertical-align:middle;">warning</span> Pendente (vira divida)';
            }
        }

        // Atualizar crédito (só aparece se não pagou E tem crédito)
        const rowCredito = document.getElementById('rowCredito');
        const valorCredito = document.getElementById('valorCredito');
        if (rowCredito && valorCredito) {
            if (!pagouInscricao && cenario.credito > 0) {
                rowCredito.style.display = 'table-row';
                valorCredito.textContent = '- ' + RenovacaoModals.formatarMoeda(cenario.credito);
            } else {
                rowCredito.style.display = 'none';
            }
        }

        // Atualizar checkbox de crédito (desabilitar se pagou)
        if (checkCredito) {
            checkCredito.disabled = pagouInscricao || cenarioNaoPagou.credito <= 0;
            if (pagouInscricao) {
                checkCredito.checked = false;
            }
        }

        // Atualizar saldo inicial
        const valorSaldoInicial = document.getElementById('valorSaldoInicial');
        if (valorSaldoInicial) {
            valorSaldoInicial.textContent = RenovacaoModals.formatarMoeda(cenario.total);
            valorSaldoInicial.className = cenario.total <= 0 ? 'text-success' : 'text-warning';
        }

        console.log('[RENOVACAO-UI] Preview atualizado:', { pagouInscricao, cenario });
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

            // Garantir que todos os painéis estejam configurados corretamente
            setTimeout(() => {
                const allPanes = document.querySelectorAll('#tabsNovoParticipanteContent .tab-pane');
                console.log('[RENOVACAO-UI] Painéis encontrados após inserção:', allPanes.length);
                
                allPanes.forEach((pane, index) => {
                    if (index === 0) {
                        // Primeiro painel visível
                        pane.style.cssText = 'display: block !important;';
                        pane.classList.add('show', 'active');
                        console.log('[RENOVACAO-UI] Painel ativo:', pane.id);
                    } else {
                        // Outros painéis escondidos
                        pane.style.cssText = 'display: none !important;';
                        pane.classList.remove('show', 'active');
                    }
                });
            }, 100);

            // Event listeners
            setupBuscaTimeListeners();

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao abrir modal:', error);
            showToast('Erro ao carregar dados: ' + error.message, 'error');
        }
    }

    function setupBuscaTimeListeners() {
        console.log('[RENOVACAO-UI] Configurando listeners do modal...');
        const inputBusca = document.getElementById('inputBuscaTime');
        const btnBuscar = document.getElementById('btnBuscarTime');
        const btnCadastrar = document.getElementById('btnCadastrarNovo');
        const btnLimpar = document.getElementById('btnLimparSelecao');

        // Tab 1: Buscar por nome
        btnBuscar?.addEventListener('click', () => executarBuscaTime());
        inputBusca?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executarBuscaTime();
            }
        });

        // Tab 2: Buscar por ID
        const inputBuscaId = document.getElementById('inputBuscaTimeId');
        const btnBuscarId = document.getElementById('btnBuscarTimeId');
        btnBuscarId?.addEventListener('click', () => executarBuscaTimeId());
        inputBuscaId?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executarBuscaTimeId();
            }
        });

        // Tab 3: Cadastro manual - validar campos
        const inputNomeManual = document.getElementById('inputNomeManual');
        inputNomeManual?.addEventListener('input', () => validarCadastroManual());

        // Tabs - resetar estado ao trocar de aba
        // Fallback manual para garantir que tabs funcionem
        const tabButtons = document.querySelectorAll('#tabsNovoParticipante button[data-bs-toggle="tab"]');
        const tabPanes = document.querySelectorAll('#tabsNovoParticipanteContent .tab-pane');
        console.log('[RENOVACAO-UI] Tabs encontradas:', tabButtons.length, 'Paineis:', tabPanes.length);

        tabButtons.forEach(tab => {
            // Listener Bootstrap nativo
            tab.addEventListener('shown.bs.tab', (e) => {
                handleTabChange(e.target.id);
            });

            // Fallback click handler para garantir funcionamento
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetId = tab.getAttribute('data-bs-target');
                console.log('[RENOVACAO-UI] Tab clicada:', tab.id, '-> Target:', targetId);

                // Atualizar tabs ativas
                tabButtons.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');

                // Atualizar paineis - forçar com !important
                tabPanes.forEach(pane => {
                    pane.classList.remove('show', 'active');
                    pane.style.cssText = 'display: none !important;';
                });

                const targetPane = document.querySelector(targetId);
                if (targetPane) {
                    targetPane.classList.add('show', 'active');
                    targetPane.style.cssText = 'display: block !important;';
                    console.log('[RENOVACAO-UI] Painel exibido:', targetId, 'computed display:', getComputedStyle(targetPane).display);
                } else {
                    console.error('[RENOVACAO-UI] Painel não encontrado:', targetId);
                }

                handleTabChange(tab.id);
            });
        });

        function handleTabChange(tabId) {
            limparSelecaoTime();
            document.getElementById('resultadosBusca').innerHTML = '';

            // Se for aba manual, mostrar secao de confirmacao
            if (tabId === 'tab-manual') {
                document.getElementById('secaoConfirmacao').classList.remove('d-none');
                document.getElementById('hdnModoNovo').value = 'manual';
                validarCadastroManual();
            } else {
                document.getElementById('secaoConfirmacao').classList.add('d-none');
                document.getElementById('hdnModoNovo').value = 'busca';
                document.getElementById('btnCadastrarNovo').disabled = true;
            }
        }

        // Cadastrar
        btnCadastrar.addEventListener('click', () => cadastrarNovoParticipante());

        // Limpar selecao
        btnLimpar?.addEventListener('click', () => limparSelecaoTime());
    }

    function validarCadastroManual() {
        const nome = document.getElementById('inputNomeManual')?.value.trim();
        const btn = document.getElementById('btnCadastrarNovo');
        btn.disabled = !nome || nome.length < 2;
    }

    async function executarBuscaTimeId() {
        const input = document.getElementById('inputBuscaTimeId');
        const loading = document.getElementById('loadingBusca');
        const resultados = document.getElementById('resultadosBusca');
        const timeId = input.value.trim();

        if (!timeId || isNaN(parseInt(timeId))) {
            showToast('Informe um ID valido', 'warning');
            return;
        }

        loading.classList.remove('d-none');
        resultados.innerHTML = '';

        try {
            const response = await RenovacaoAPI.buscarTimeCartolaPorId(parseInt(timeId));

            if (response.success && response.time) {
                const time = response.time;
                selecionarTime({
                    timeId: time.time_id,
                    nomeTime: time.nome_time || time.nome || '',
                    nomeCartoleiro: time.nome_cartoleiro || '',
                    escudo: time.escudo || time.url_escudo_png || ''
                });
                showToast('Time encontrado!', 'success');
            } else {
                resultados.innerHTML = '<p class="text-warning text-center py-3">Time nao encontrado. Tente cadastro manual.</p>';
            }

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro na busca por ID:', error);
            resultados.innerHTML = `<p class="text-warning text-center py-3">Time nao encontrado ou API indisponivel. Use o cadastro manual.</p>`;
        } finally {
            loading.classList.add('d-none');
        }
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
        document.getElementById('secaoConfirmacao').classList.remove('d-none');
        document.getElementById('escudoSelecionado').src = dados.escudo || '/img/default-escudo.png';
        document.getElementById('nomeTimeSelecionado').textContent = dados.nomeTime;
        document.getElementById('nomeCartoleiroSelecionado').textContent = dados.nomeCartoleiro;

        // Hidden fields
        document.getElementById('hdnTimeIdNovo').value = dados.timeId;
        document.getElementById('hdnNomeTimeNovo').value = dados.nomeTime;
        document.getElementById('hdnNomeCartoleiroNovo').value = dados.nomeCartoleiro;
        document.getElementById('hdnEscudoNovo').value = dados.escudo;
        document.getElementById('hdnModoNovo').value = 'busca';

        // Habilitar botao
        document.getElementById('btnCadastrarNovo').disabled = false;

        // Limpar resultados
        document.getElementById('resultadosBusca').innerHTML = '';
    }

    function limparSelecaoTime() {
        state.timeSelecionado = null;
        const timeSelecionado = document.getElementById('timeSelecionado');
        const secaoConfirmacao = document.getElementById('secaoConfirmacao');
        const btnCadastrar = document.getElementById('btnCadastrarNovo');
        const hdnTimeId = document.getElementById('hdnTimeIdNovo');
        const hdnModo = document.getElementById('hdnModoNovo');

        if (timeSelecionado) timeSelecionado.classList.add('d-none');
        if (hdnModo?.value !== 'manual' && secaoConfirmacao) {
            secaoConfirmacao.classList.add('d-none');
        }
        if (btnCadastrar && hdnModo?.value !== 'manual') {
            btnCadastrar.disabled = true;
        }
        if (hdnTimeId) hdnTimeId.value = '';
    }

    async function cadastrarNovoParticipante() {
        const modo = document.getElementById('hdnModoNovo')?.value || 'busca';
        const btn = document.getElementById('btnCadastrarNovo');
        const pagouInscricao = document.getElementById('checkPagouInscricaoNovo')?.checked ?? true;
        const observacoes = document.getElementById('txtObservacoesNovo')?.value || '';

        let dadosTime = null;

        if (modo === 'manual') {
            // Cadastro manual - pegar dados dos campos
            const nome = document.getElementById('inputNomeManual')?.value.trim();
            const apelido = document.getElementById('inputApelidoManual')?.value.trim();
            const timeCoracao = document.getElementById('selectTimeCoracao')?.value;
            const idCartola = document.getElementById('inputIdCartolaManual')?.value.trim();
            const contato = document.getElementById('inputContatoManual')?.value.trim();

            if (!nome || nome.length < 2) {
                showToast('Informe o nome do participante', 'warning');
                return;
            }

            dadosTime = {
                nome_cartoleiro: nome,
                nome_time: apelido || nome,
                time_id: idCartola ? parseInt(idCartola) : null,
                time_coracao: timeCoracao,
                contato: contato,
                pendente_sincronizacao: !idCartola, // Flag de pendencia
                cadastro_manual: true
            };
        } else {
            // Busca - usar time selecionado
            if (!state.timeSelecionado) {
                showToast('Selecione um time primeiro', 'warning');
                return;
            }
            dadosTime = state.timeSelecionado;
        }

        setLoading(btn, true);

        try {
            await RenovacaoAPI.novoParticipante(
                state.ligaId,
                state.temporada,
                dadosTime,
                { pagouInscricao, observacoes }
            );

            const msg = dadosTime.pendente_sincronizacao
                ? 'Participante cadastrado! Pendente vincular ID do Cartola.'
                : 'Novo participante cadastrado com sucesso!';
            showToast(msg, 'success');
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

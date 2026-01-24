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

        // Buscar cenários dos data attributes (decodificar entities HTML)
        let cenarioPagou, cenarioNaoPagou;
        try {
            const decodeHtmlEntities = (str) => {
                const txt = document.createElement('textarea');
                txt.innerHTML = str;
                return txt.value;
            };
            cenarioPagou = JSON.parse(decodeHtmlEntities(card.dataset.cenarioPagou || '{}'));
            cenarioNaoPagou = JSON.parse(decodeHtmlEntities(card.dataset.cenarioNaoPagou || '{}'));
        } catch (e) {
            console.error('[RENOVACAO-UI] Erro ao parsear cenarios:', e);
            return;
        }

        const taxa = parseFloat(card.dataset.taxa) || 0;
        const cenario = pagouInscricao ? cenarioPagou : cenarioNaoPagou;

        // Atualizar status da taxa
        const rowTaxaStatus = document.getElementById('rowTaxaStatus');
        const statusTaxa = document.getElementById('statusTaxa');
        if (rowTaxaStatus && statusTaxa) {
            if (pagouInscricao) {
                rowTaxaStatus.className = 'text-success';
                statusTaxa.innerHTML = '<span class="material-icons" style="font-size:14px;vertical-align:middle;">check_circle</span> Paga (nao vira divida)';
            } else {
                rowTaxaStatus.className = 'text-danger';
                statusTaxa.innerHTML = '<span class="material-icons" style="font-size:14px;vertical-align:middle;">warning</span> Pendente (vira dívida)';
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
        // Lógica: total > 0 = devedor (vermelho com sinal negativo), senão = quitado/credor (verde)
        const valorSaldoInicial = document.getElementById('valorSaldoInicial');
        if (valorSaldoInicial) {
            const valorFormatado = cenario.total > 0
                ? `-R$ ${Math.abs(cenario.total).toFixed(2).replace('.', ',')}`
                : `R$ ${Math.abs(cenario.total).toFixed(2).replace('.', ',')}`;
            valorSaldoInicial.textContent = valorFormatado;
            valorSaldoInicial.className = cenario.total > 0 ? 'text-danger fw-bold' : 'text-success fw-bold';
        }
    }

    async function confirmarRenovacao() {
        const btn = document.getElementById('btnConfirmarRenovacao');
        const timeId = document.getElementById('hdnTimeIdRenovar').value;
        const pagouInscricao = document.getElementById('checkPagouInscricao').checked;
        const aproveitarCredito = document.getElementById('checkAproveitarCredito').checked;
        const observacoes = document.getElementById('txtObservacoesRenovar').value;

        // ✅ v1.1: Confirmação extra se NÃO pagou inscrição
        if (!pagouInscricao) {
            const taxa = document.getElementById('cardCalculo2026')?.dataset?.taxa || 180;
            const confirmar = confirm(
                `⚠️ ATENÇÃO: "Pagou a inscrição" está DESMARCADO!\n\n` +
                `Isso criará um DÉBITO de R$ ${taxa} no extrato do participante.\n\n` +
                `Tem certeza que o participante NÃO PAGOU a inscrição?\n\n` +
                `Clique OK para confirmar a renovação COM DÉBITO.\n` +
                `Clique Cancelar para voltar e marcar como pago.`
            );
            
            if (!confirmar) {
                return; // Usuário cancelou, volta para o modal
            }
        }

        setLoading(btn, true);

        try {
            await RenovacaoAPI.renovarParticipante(
                state.ligaId,
                state.temporada,
                timeId,
                { pagouInscricao, aproveitarCredito, observacoes }
            );

            showToast('Participante renovado com sucesso!');

            // ✅ Atualizar badge na linha da tabela (Pendente → Renovado)
            const badgeClass = pagouInscricao ? 'badge-2026-renovado' : 'badge-2026-renovado-devendo';
            const alertaDevendo = pagouInscricao ? '' : '<span class="material-icons" style="font-size: 12px; color: #ffc107; vertical-align: middle; margin-left: 2px;" title="Deve inscrição">warning</span>';
            const tooltip = pagouInscricao ? 'Renovado - Inscrição paga' : 'Renovado - Deve inscrição';

            const novoBadge = `
                <span class="renovacao-badge ${badgeClass}"
                      data-time-id="${timeId}"
                      data-status="renovado"
                      style="cursor: pointer;"
                      title="${tooltip}">
                    <span class="material-icons" style="font-size: 14px; vertical-align: middle;">check_circle</span>
                    Renovado${alertaDevendo}
                </span>
            `;

            // Atualizar pelo seletor da coluna 2026
            const row = document.querySelector(`tr[data-time-id="${timeId}"]`);
            if (row) {
                const col2026 = row.querySelector('.col-2026');
                if (col2026) {
                    col2026.innerHTML = novoBadge;
                }
            }

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

            // ✅ Atualizar badge na linha da tabela
            const novoBadge = `
                <span class="renovacao-badge badge-2026-nao-participa"
                      data-time-id="${timeId}"
                      data-status="nao_participa"
                      style="cursor: pointer;"
                      title="Não participa em 2026">
                    <span class="material-icons" style="font-size: 14px; vertical-align: middle;">cancel</span>
                    Saiu
                </span>
            `;

            const row = document.querySelector(`tr[data-time-id="${timeId}"]`);
            if (row) {
                const col2026 = row.querySelector('.col-2026');
                if (col2026) {
                    col2026.innerHTML = novoBadge;
                }
            }

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
    // MODAL: DECISAO UNIFICADA
    // =========================================================================

    /**
     * Abre o modal de decisao unificada (quitacao + renovacao/nao-participar)
     * @param {string} ligaId - ID da liga
     * @param {Object} participante - Dados do participante
     */
    async function abrirModalDecisaoUnificada(ligaId, participante) {
        state.ligaId = ligaId;

        console.log('[RENOVACAO-UI] Abrindo modal decisao unificada para:', participante);

        try {
            // Buscar dados completos do backend
            const dados = await RenovacaoAPI.buscarDadosDecisao(
                ligaId,
                state.temporada,
                participante.time_id
            );

            console.log('[RENOVACAO-UI] Dados decisao recebidos:', dados);

            // Gerar e exibir modal
            const html = RenovacaoModals.modalDecisaoUnificada(dados);
            showModal(html, 'modalDecisaoUnificada');

            // Event listener - Confirmar
            const btnConfirmar = document.getElementById('btnConfirmarDecisao');
            if (btnConfirmar) {
                btnConfirmar.addEventListener('click', () => confirmarDecisaoUnificada());
            }

            // Event listeners para alternar entre opcoes
            const decisaoRenovar = document.getElementById('decisaoRenovar');
            const decisaoNaoParticipar = document.getElementById('decisaoNaoParticipar');

            if (decisaoRenovar) {
                decisaoRenovar.addEventListener('change', () => atualizarUIDecisao());
            }
            if (decisaoNaoParticipar) {
                decisaoNaoParticipar.addEventListener('change', () => atualizarUIDecisao());
            }

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro ao abrir modal decisao:', error);
            showToast('Erro ao carregar dados: ' + error.message, 'error');
        }
    }

    /**
     * Atualiza UI baseado na decisao selecionada
     */
    function atualizarUIDecisao() {
        const isRenovar = document.getElementById('decisaoRenovar')?.checked;

        // Habilitar/desabilitar secoes baseado na decisao
        const cardRenovar = document.getElementById('cardRenovar');
        const cardNaoParticipar = document.getElementById('cardNaoParticipar');

        if (cardRenovar && cardNaoParticipar) {
            if (isRenovar) {
                cardRenovar.style.opacity = '1';
                cardNaoParticipar.style.opacity = '0.5';
            } else {
                cardRenovar.style.opacity = '0.5';
                cardNaoParticipar.style.opacity = '1';
            }
        }
    }

    /**
     * Mapeia opcao unificada para payload compativel com backend
     * @param {string} opcao - Valor da opcao selecionada
     * @returns {Object} - Payload parcial { aproveitarCredito, pagouInscricao, carregarDivida }
     */
    function mapearOpcaoParaPayload(opcao) {
        const mapa = {
            // CREDOR
            'usar_credito_pago': { aproveitarCredito: true, pagouInscricao: true },
            'credito_intacto_pago': { aproveitarCredito: false, pagouInscricao: true },
            'credito_intacto_pendente': { aproveitarCredito: false, pagouInscricao: false },

            // DEVEDOR
            'carregar_pago': { carregarDivida: true, pagouInscricao: true },
            'carregar_pendente': { carregarDivida: true, pagouInscricao: false },
            'quitou_pago': { carregarDivida: false, pagouInscricao: true },
            'quitou_pendente': { carregarDivida: false, pagouInscricao: false },

            // QUITADO
            'inscricao_paga': { pagouInscricao: true },
            'inscricao_pendente': { pagouInscricao: false }
        };

        return mapa[opcao] || { pagouInscricao: true };
    }

    /**
     * Confirma a decisao unificada
     * v2.0: Usa opcoes unificadas sem contradicoes
     */
    async function confirmarDecisaoUnificada() {
        const btn = document.getElementById('btnConfirmarDecisao');
        const timeId = document.getElementById('hdnTimeIdDecisao')?.value;
        const cenario = document.getElementById('hdnCenarioDecisao')?.value;
        const temporada = parseInt(document.getElementById('hdnTemporadaDestino')?.value) || state.temporada;
        const observacoes = document.getElementById('txtObservacoesDecisao')?.value || '';

        // Decisao principal
        const isRenovar = document.getElementById('decisaoRenovar')?.checked;
        const decisao = isRenovar ? 'renovar' : 'nao_participar';

        // Construir payload
        const payload = {
            decisao,
            observacoes
        };

        if (decisao === 'renovar') {
            // v2.0: Ler opcao unificada (opcaoRenovacao)
            const opcaoRenovacao = document.querySelector('input[name="opcaoRenovacao"]:checked')?.value;
            const mapeado = mapearOpcaoParaPayload(opcaoRenovacao);

            // Aplicar valores mapeados ao payload
            Object.assign(payload, mapeado);

            console.log('[RENOVACAO-UI] Opcao selecionada:', opcaoRenovacao, '-> Mapeado:', mapeado);

            // Confirmacao extra se inscricao PENDENTE (opcoes com "pendente" no nome)
            if (!payload.pagouInscricao) {
                const confirmar = confirm(
                    `ATENCAO: A inscricao esta marcada como PENDENTE!\n\n` +
                    `Isso criara um DEBITO no extrato do participante.\n\n` +
                    `Confirma que o participante NAO PAGOU a inscricao?`
                );
                if (!confirmar) return;
            }

        } else {
            // Opcoes de nao-participar (mantidas do original)
            const opcaoSaida = document.querySelector('input[name="opcaoSaida"]:checked')?.value;

            if (cenario === 'credor') {
                payload.acaoCredito = opcaoSaida; // pagar, congelar, perdoar
            } else if (cenario === 'devedor') {
                payload.acaoDivida = opcaoSaida; // cobrar, perdoar
            }
        }

        console.log('[RENOVACAO-UI] Confirmando decisao:', payload);

        setLoading(btn, true);

        try {
            const resultado = await RenovacaoAPI.enviarDecisao(
                state.ligaId,
                temporada,
                timeId,
                payload
            );

            console.log('[RENOVACAO-UI] Resultado:', resultado);

            // Mensagem de sucesso
            const msg = decisao === 'renovar'
                ? `Participante renovado para ${temporada}!`
                : `Participante marcado como NAO PARTICIPA em ${temporada}`;
            showToast(msg, 'success');

            // Atualizar badge na tabela
            const badgeClass = decisao === 'renovar'
                ? (payload.pagouInscricao ? 'badge-2026-renovado' : 'badge-2026-renovado-devendo')
                : 'badge-2026-nao-participa';
            const statusText = decisao === 'renovar' ? 'Renovado' : 'Saiu';
            const statusIcon = decisao === 'renovar' ? 'check_circle' : 'cancel';
            const alertaDevendo = (decisao === 'renovar' && !payload.pagouInscricao)
                ? '<span class="material-icons" style="font-size: 12px; color: #ffc107; vertical-align: middle; margin-left: 2px;" title="Deve inscricao">warning</span>'
                : '';

            const novoBadge = `
                <span class="renovacao-badge ${badgeClass}"
                      data-time-id="${timeId}"
                      data-status="${decisao === 'renovar' ? 'renovado' : 'nao_participa'}"
                      style="cursor: pointer;"
                      title="${statusText}">
                    <span class="material-icons" style="font-size: 14px; vertical-align: middle;">${statusIcon}</span>
                    ${statusText}${alertaDevendo}
                </span>
            `;

            // Atualizar linha da tabela
            const row = document.querySelector(`tr[data-time-id="${timeId}"]`);
            if (row) {
                const col2026 = row.querySelector('.col-2026');
                if (col2026) {
                    col2026.innerHTML = novoBadge;
                }
            }

            fecharModal();

            // Callback para atualizar UI
            if (typeof window.onRenovacaoAtualizada === 'function') {
                window.onRenovacaoAtualizada();
            }

        } catch (error) {
            console.error('[RENOVACAO-UI] Erro na decisao:', error);
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
        abrirModalDecisaoUnificada,
        fecharModal,

        // Helpers
        showToast
    };

})();

// Export para ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenovacaoUI;
}

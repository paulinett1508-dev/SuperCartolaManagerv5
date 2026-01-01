// =====================================================================
// PARTICIPANTE NAVIGATION v4.0 - Sistema de Navegação entre Módulos
// =====================================================================
// v4.0: Bloqueio de modulos em pre-temporada com modal amigavel
// v3.1: Feedback visual imediato durante navegação (opacity transition)
// v3.0: REFATORAÇÃO COMPLETA - Remove flag _navegando que travava
//       Usa apenas debounce por tempo (mais confiável)
//       Navegação NUNCA trava, sempre responde a cliques
// v2.8: Permite recarregar mesmo módulo (cache-first é instantâneo)
// v2.7: Fix transição suave com cache-first (não limpar container)
// v2.6: Fix primeira navegação - não ignorar se container está vazio
// v2.5: Loading inteligente (só primeira vez ou após 24h)
// v2.4: Integração com RefreshButton (temporada encerrada)
// v2.3: Polling fallback para auth
// v2.2: Debounce e controle de navegações duplicadas
// =====================================================================

if (window.Log) Log.info('PARTICIPANTE-NAV', '🚀 Carregando sistema de navegação v3.1...');

class ParticipanteNavigation {
    constructor() {
        this.moduloAtual = "boas-vindas";
        this.participanteData = null;
        this.modulosAtivos = {};
        this.historicoNavegacao = []; // Histórico interno de navegação
        this.modulos = {
            "boas-vindas": "/participante/fronts/boas-vindas.html",
            extrato: "/participante/fronts/extrato.html",
            ranking: "/participante/fronts/ranking.html",
            rodadas: "/participante/fronts/rodadas.html",
            historico: "/participante/fronts/historico.html",
            top10: "/participante/fronts/top10.html",
            "melhor-mes": "/participante/fronts/melhor-mes.html",
            "pontos-corridos": "/participante/fronts/pontos-corridos.html",
            "mata-mata": "/participante/fronts/mata-mata.html",
            artilheiro: "/participante/fronts/artilheiro.html",
            "luva-ouro": "/participante/fronts/luva-ouro.html",
        };

        // ✅ v3.0: Controles simplificados (apenas debounce por tempo)
        this._inicializando = false;
        this._ultimaNavegacao = 0;
        this._debounceMs = 100; // ✅ v3.0: Reduzido para 100ms (super responsivo)
        this._navegacaoEmAndamento = null; // ID da navegação atual (para cancelar se necessário)
    }

    async inicializar() {
        // ✅ v2.2: Evitar inicialização duplicada
        if (this._inicializando) {
            if (window.Log) Log.debug('PARTICIPANTE-NAV', '⏸️ Inicialização já em andamento, ignorando...');
            return;
        }
        this._inicializando = true;

        if (window.Log) Log.info('PARTICIPANTE-NAV', 'Inicializando navegação...');

        // Aguardar dados do participante
        await this.aguardarDadosParticipante();

        // Buscar módulos ativos da liga
        await this.carregarModulosAtivos();

        // Renderizar menu dinâmico
        this.renderizarMenuDinamico();

        // Configurar event listeners
        this.configurarEventListeners();

        // ✅ AJUSTE REFRESH: Recuperar módulo salvo ou usar boas-vindas
        const moduloSalvo =
            sessionStorage.getItem("participante_modulo_atual") ||
            "boas-vindas";

        // ✅ Sincronizar botão ativo do menu com módulo salvo
        if (moduloSalvo) {
            const navButtons = document.querySelectorAll(".nav-item-modern");
            navButtons.forEach((btn) => {
                btn.classList.remove("active");
                if (btn.dataset.module === moduloSalvo) {
                    btn.classList.add("active");
                }
            });
        }

        // Navegar para módulo (salvo ou inicial)
        await this.navegarPara(moduloSalvo);
    }

    async aguardarDadosParticipante() {
        if (window.Log) Log.debug('PARTICIPANTE-NAV', 'Aguardando dados do participante...');

        // ✅ v2.0: PRIMEIRO tentar obter dados do participanteAuth (já carregado)
        if (window.participanteAuth && window.participanteAuth.participante) {
            this.participanteData = {
                timeId: window.participanteAuth.timeId,
                ligaId: window.participanteAuth.ligaId,
                nomeCartola: window.participanteAuth.participante.participante?.nome_cartola || "Participante",
                nomeTime: window.participanteAuth.participante.participante?.nome_time || "Meu Time",
            };
            if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Dados obtidos do Auth (sem requisição extra)');
            return;
        }

        // ✅ v2.3: Se Auth ainda não terminou, aguardar evento com polling de fallback
        return new Promise((resolve, reject) => {
            // Polling a cada 200ms para verificar se dados chegaram
            const pollInterval = setInterval(() => {
                if (window.participanteAuth && window.participanteAuth.participante) {
                    clearInterval(pollInterval);
                    clearTimeout(timeout);
                    this.participanteData = {
                        timeId: window.participanteAuth.timeId,
                        ligaId: window.participanteAuth.ligaId,
                        nomeCartola: window.participanteAuth.participante.participante?.nome_cartola || "Participante",
                        nomeTime: window.participanteAuth.participante.participante?.nome_time || "Meu Time",
                    };
                    if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Dados obtidos via polling');
                    resolve();
                }
            }, 200);

            const timeout = setTimeout(() => {
                clearInterval(pollInterval);
                // ✅ ÚLTIMA CHANCE: Verificar se dados chegaram durante o timeout
                if (window.participanteAuth && window.participanteAuth.participante) {
                    this.participanteData = {
                        timeId: window.participanteAuth.timeId,
                        ligaId: window.participanteAuth.ligaId,
                        nomeCartola: window.participanteAuth.participante.participante?.nome_cartola || "Participante",
                        nomeTime: window.participanteAuth.participante.participante?.nome_time || "Meu Time",
                    };
                    if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Dados obtidos no timeout final');
                    resolve();
                    return;
                }
                if (window.Log) Log.error('PARTICIPANTE-NAV', '❌ Timeout aguardando auth');
                window.location.href = "/participante-login.html";
                reject(new Error('Timeout'));
            }, 5000);

            window.addEventListener('participante-auth-ready', (event) => {
                clearInterval(pollInterval);
                clearTimeout(timeout);
                const { participante, ligaId, timeId, ligaData } = event.detail;
                this.participanteData = {
                    timeId: timeId,
                    ligaId: ligaId,
                    nomeCartola: participante.participante?.nome_cartola || "Participante",
                    nomeTime: participante.participante?.nome_time || "Meu Time",
                };
                // ✅ v2.1: Guardar dados da liga para evitar requisição extra
                if (ligaData) {
                    this._ligaDataFromEvent = ligaData;
                }
                if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Dados obtidos via evento Auth');
                resolve();
            }, { once: true });
        });
    }

    async carregarModulosAtivos() {
        if (window.Log) Log.debug('PARTICIPANTE-NAV', '🔍 Buscando configuração de módulos...');

        try {
            // ✅ v2.1: PRIMEIRO tentar usar dados da liga do Auth (já carregados)
            if (window.participanteAuth && window.participanteAuth.ligaDataCache) {
                const liga = window.participanteAuth.ligaDataCache;
                this.modulosAtivos = liga.modulos_ativos || {};
                if (window.Log) Log.debug('PARTICIPANTE-NAV', '💾 Módulos obtidos do cache Auth (sem requisição)');
                return;
            }

            // ✅ v2.1: Se Auth já passou os dados via evento, usar ligaData
            if (this._ligaDataFromEvent) {
                this.modulosAtivos = this._ligaDataFromEvent.modulos_ativos || {};
                if (window.Log) Log.debug('PARTICIPANTE-NAV', '💾 Módulos obtidos via evento Auth');
                return;
            }

            // Fallback: buscar da API (só se cache não disponível)
            if (window.Log) Log.debug('PARTICIPANTE-NAV', '📡 Buscando módulos da API (fallback)...');
            const response = await fetch(
                `/api/ligas/${this.participanteData.ligaId}`,
            );
            if (!response.ok) {
                throw new Error("Erro ao buscar configuração da liga");
            }

            const liga = await response.json();
            this.modulosAtivos = liga.modulos_ativos || {};

            if (window.Log) Log.debug('PARTICIPANTE-NAV', '📋 Módulos ativos recebidos (API)');
        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', '❌ Erro ao buscar módulos:', error);
            this.modulosAtivos = {
                extrato: true,
                ranking: true,
                rodadas: true,
                top10: false,
                melhorMes: false,
                pontosCorridos: false,
                mataMata: false,
                artilheiro: false,
                luvaOuro: false,
            };
        }
    }

    renderizarMenuDinamico() {
        // ✅ QUICK ACCESS BAR: Não renderizar bottom-nav-modern (foi substituído)
        // A Quick Access Bar gerencia a navegação agora
        if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Quick Access Bar ativa - bottom-nav desabilitado');
        
        // Notificar Quick Bar sobre módulos ativos (se já estiver carregada)
        if (window.quickAccessBar) {
            window.quickAccessBar.atualizarModulosAtivos(this.modulosAtivos);
        }
        
        return;
    }

    verificarModuloAtivo(configKey) {
        // Módulos base sempre ativos (historico é Hall da Fama)
        const modulosBase = ["extrato", "ranking", "rodadas", "historico"];

        if (!this.modulosAtivos || Object.keys(this.modulosAtivos).length === 0) {
            return modulosBase.includes(configKey);
        }

        // Módulos base sempre ativos, outros dependem da configuração
        if (modulosBase.includes(configKey)) {
            return true;
        }

        return this.modulosAtivos[configKey] === true;
    }

    configurarEventListeners() {
        // ✅ QUICK ACCESS BAR: Event listeners não são mais necessários aqui
        // A Quick Access Bar gerencia os cliques nos módulos
        
        // Configurar interceptação do botão Voltar (History API) - ainda necessário
        this.configurarHistoryAPI();

        if (window.Log) Log.debug('PARTICIPANTE-NAV', '✅ Event listeners configurados (History API apenas)');
    }

    // =====================================================================
    // HISTORY API - Interceptar botão Voltar do navegador/celular
    // =====================================================================
    configurarHistoryAPI() {
        // Adicionar estado inicial ao histórico
        if (!history.state || !history.state.modulo) {
            history.replaceState({ modulo: this.moduloAtual, index: 0 }, '', window.location.href);
        }

        // Listener para o evento popstate (botão voltar)
        window.addEventListener('popstate', (event) => {
            if (window.Log) Log.debug('PARTICIPANTE-NAV', '⬅️ Popstate detectado:', event.state);
            this.tratarBotaoVoltar(event);
        });

        if (window.Log) Log.debug('PARTICIPANTE-NAV', '✅ History API configurada');
    }

    tratarBotaoVoltar(event) {
        const moduloAtual = this.moduloAtual;
        const paginasIniciais = ['boas-vindas', 'home'];

        // Se estiver na página inicial, mostrar modal de confirmação
        if (paginasIniciais.includes(moduloAtual)) {
            // Impedir a navegação - voltar ao estado atual
            history.pushState({ modulo: moduloAtual, index: this.historicoNavegacao.length }, '', window.location.href);

            // Mostrar modal de confirmação
            this.mostrarModalSairApp();
            return;
        }

        // Nas outras páginas, voltar normalmente
        if (this.historicoNavegacao.length > 0) {
            const moduloAnterior = this.historicoNavegacao.pop();
            if (window.Log) Log.debug('PARTICIPANTE-NAV', '⬅️ Voltando para:', moduloAnterior);

            // Navegar sem adicionar ao histórico
            this.navegarPara(moduloAnterior, false, true);
        } else {
            // Se não há histórico, ir para boas-vindas
            history.pushState({ modulo: 'boas-vindas', index: 0 }, '', window.location.href);
            this.navegarPara('boas-vindas', false, true);
        }
    }

    mostrarModalSairApp() {
        // Verificar se já existe um modal
        let modal = document.getElementById('modalSairApp');

        if (!modal) {
            // Criar modal
            modal = document.createElement('div');
            modal.id = 'modalSairApp';
            modal.innerHTML = `
                <div class="modal-sair-overlay" onclick="window.participanteNav.fecharModalSairApp()">
                    <div class="modal-sair-content" onclick="event.stopPropagation()">
                        <div class="modal-sair-icon">
                            <span class="material-symbols-outlined">logout</span>
                        </div>
                        <h3 class="modal-sair-titulo">Deseja fechar o app?</h3>
                        <p class="modal-sair-texto">Você está prestes a sair do Super Cartola.</p>
                        <div class="modal-sair-botoes">
                            <button class="modal-sair-btn cancelar" onclick="window.participanteNav.fecharModalSairApp()">
                                <span class="material-symbols-outlined">close</span>
                                Cancelar
                            </button>
                            <button class="modal-sair-btn confirmar" onclick="window.participanteNav.confirmarSairApp()">
                                <span class="material-symbols-outlined">exit_to_app</span>
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Adicionar estilos do modal
            if (!document.getElementById('estilosModalSair')) {
                const estilos = document.createElement('style');
                estilos.id = 'estilosModalSair';
                estilos.textContent = `
                    .modal-sair-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.8);
                        backdrop-filter: blur(4px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                        animation: fadeIn 0.2s ease;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .modal-sair-content {
                        background: #1c1c1c;
                        border-radius: 16px;
                        padding: 24px;
                        max-width: 320px;
                        width: 90%;
                        text-align: center;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                        animation: slideUp 0.3s ease;
                    }
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .modal-sair-icon {
                        width: 64px;
                        height: 64px;
                        background: rgba(255, 69, 0, 0.15);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                    }
                    .modal-sair-icon .material-symbols-outlined {
                        font-size: 32px;
                        color: #ff4500;
                    }
                    .modal-sair-titulo {
                        color: white;
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 8px;
                    }
                    .modal-sair-texto {
                        color: #9ca3af;
                        font-size: 14px;
                        margin-bottom: 24px;
                    }
                    .modal-sair-botoes {
                        display: flex;
                        gap: 12px;
                    }
                    .modal-sair-btn {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        padding: 12px 16px;
                        border-radius: 10px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: none;
                    }
                    .modal-sair-btn .material-symbols-outlined {
                        font-size: 18px;
                    }
                    .modal-sair-btn.cancelar {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                    }
                    .modal-sair-btn.cancelar:active {
                        background: rgba(255, 255, 255, 0.15);
                        transform: scale(0.98);
                    }
                    .modal-sair-btn.confirmar {
                        background: #ff4500;
                        color: white;
                    }
                    .modal-sair-btn.confirmar:active {
                        background: #e63e00;
                        transform: scale(0.98);
                    }
                `;
                document.head.appendChild(estilos);
            }
        }

        modal.style.display = 'block';
        if (window.Log) Log.info('PARTICIPANTE-NAV', '📱 Modal "Sair do App" exibido');
    }

    fecharModalSairApp() {
        const modal = document.getElementById('modalSairApp');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    confirmarSairApp() {
        if (window.Log) Log.info('PARTICIPANTE-NAV', '👋 Usuário confirmou sair do app');
        // Tentar fechar a janela/aba
        // Em PWA, isso pode não funcionar, então redirecionamos para uma página de "adeus"
        try {
            window.close();
        } catch (e) {
            // Se não conseguir fechar, volta ao histórico do navegador
            history.go(-(this.historicoNavegacao.length + 1));
        }
    }

    async navegarPara(moduloId, forcarReload = false, voltandoHistorico = false) {
        // ✅ v4.0: Verificar bloqueio de pre-temporada ANTES de qualquer coisa
        if (this.verificarBloqueioPreTemporada(moduloId)) {
            if (window.Log) Log.info('PARTICIPANTE-NAV', `🚫 Modulo bloqueado (pre-temporada): ${moduloId}`);
            this.mostrarModalBloqueioPreTemporada(moduloId);
            return;
        }

        // ✅ v3.0: APENAS debounce por tempo (sem flag que pode travar)
        const agora = Date.now();
        const navegacaoId = `nav_${agora}_${moduloId}`;

        // Debounce simples: ignorar cliques muito rápidos (< 100ms)
        if (agora - this._ultimaNavegacao < this._debounceMs) {
            if (window.Log) Log.debug('PARTICIPANTE-NAV', '⏸️ Debounce: ignorando clique muito rápido');
            return;
        }

        // Registrar esta navegação
        this._ultimaNavegacao = agora;
        this._navegacaoEmAndamento = navegacaoId;

        const container = document.getElementById("moduleContainer");

        if (window.Log) Log.info('PARTICIPANTE-NAV', `🧭 Navegando para: ${moduloId}`);

        // container já foi obtido acima para verificar isFirstLoad
        if (!container) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', '❌ Container não encontrado');
            return;
        }

        // ✅ CORREÇÃO: Timeout de segurança para evitar tela preta
        const timeoutId = setTimeout(() => {
            if (window.Log) Log.warn('PARTICIPANTE-NAV', '⏱️ Timeout de carregamento atingido');
            this.mostrarErroCarregamento(container, moduloId, 'Timeout de carregamento');
        }, 15000); // 15 segundos

        // Gerenciar histórico de navegação (se não estiver voltando)
        if (!voltandoHistorico && this.moduloAtual && this.moduloAtual !== moduloId) {
            this.historicoNavegacao.push(this.moduloAtual);
            history.pushState({ modulo: moduloId, index: this.historicoNavegacao.length }, '', window.location.href);
        }

        const nomeModulo = this.obterNomeModulo(moduloId);

        // ✅ v3.1: Feedback visual IMEDIATO - aplicar opacity no container
        // Isso dá feedback instantâneo que algo está acontecendo
        container.style.transition = 'opacity 0.15s ease-out';
        container.style.opacity = '0.6';

        // ✅ v2.5: Loading inteligente - só mostra se não tem cache recente (24h)
        const cacheKey = `modulo_loaded_${moduloId}`;
        const lastLoaded = localStorage.getItem(cacheKey);
        const TTL_24H = 24 * 60 * 60 * 1000;
        const temCacheRecente = lastLoaded && (agora - parseInt(lastLoaded)) < TTL_24H;

        // ✅ v2.7: NÃO limpar container durante navegação (cache-first renderiza instantâneo)
        // Apenas mostrar loading se não tem cache recente
        if (!temCacheRecente && window.LoadingOverlay) {
            window.LoadingOverlay.show(`Carregando ${nomeModulo}...`);
        }

        // ✅ v2.7: REMOVIDO - Não limpar container antes de carregar
        // Isso causava tela em branco e necessidade de clique duplo
        // O conteúdo antigo permanece visível até o novo ser carregado

        try {
            const htmlPath = this.modulos[moduloId];
            if (!htmlPath) {
                throw new Error(`Módulo "${moduloId}" não encontrado`);
            }

            const response = await fetch(htmlPath);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`O módulo "${nomeModulo}" ainda não está disponível`);
                }
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();

            // ✅ CORREÇÃO: Limpar timeout de segurança
            clearTimeout(timeoutId);

            container.innerHTML = html;

            await this.carregarModuloJS(moduloId);

            this.moduloAtual = moduloId;
            window.moduloAtualParticipante = moduloId; // Expor globalmente para tracking
            sessionStorage.setItem("participante_modulo_atual", moduloId);

            // ✅ v2.5: Salvar timestamp do carregamento para loading inteligente
            localStorage.setItem(`modulo_loaded_${moduloId}`, Date.now().toString());

            // ✅ v3.1: Restaurar opacity após carregamento
            container.style.opacity = '1';

            if (window.Log) Log.info('PARTICIPANTE-NAV', `✅ Módulo ${moduloId} carregado`);

            // ✅ SPLASH: Esconder após módulo carregado
            if (window.SplashScreen) {
                window.SplashScreen.hide();
            }

            // ✅ LOADING OVERLAY: Esconder também (para pull-to-refresh)
            if (window.LoadingOverlay) {
                window.LoadingOverlay.hide();
            }

            // ✅ v2.4: Adicionar botão de atualização manual (temporada encerrada)
            if (window.RefreshButton?.shouldShow()) {
                window.RefreshButton.addTo(container, { text: 'Atualizar Dados' });
            }

        } catch (error) {
            // ✅ CORREÇÃO: Limpar timeout de segurança
            clearTimeout(timeoutId);

            if (window.Log) Log.error('PARTICIPANTE-NAV', `❌ Erro ao carregar ${moduloId}:`, error);

            // ✅ v3.1: Restaurar opacity mesmo em caso de erro
            container.style.opacity = '1';

            // ✅ SPLASH: Esconder mesmo em caso de erro
            if (window.SplashScreen) {
                window.SplashScreen.hide();
            }

            // ✅ LOADING OVERLAY: Esconder também em caso de erro
            if (window.LoadingOverlay) {
                window.LoadingOverlay.hide();
            }

            this.mostrarErroCarregamento(container, moduloId, error.message);
        }
    }

    // ✅ NOVO: Função para mostrar erro de carregamento
    mostrarErroCarregamento(container, moduloId, mensagem) {
        const mensagemErro = this.obterMensagemErroAmigavel({ message: mensagem });
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; max-width: 500px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)); border-radius: 16px; padding: 40px; border: 2px solid rgba(239, 68, 68, 0.2);">
                    <span class="material-symbols-outlined" style="font-size: 64px; color: #facc15; margin-bottom: 20px; display: block;">warning</span>
                    <h3 style="color: #dc2626; margin-bottom: 16px; font-size: 20px; font-weight: 600;">Ops! Algo deu errado</h3>
                    <p style="color: #999; margin-bottom: 24px; line-height: 1.6;">${mensagemErro}</p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="window.participanteNav.navegarPara('${moduloId}', true)"
                                style="background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
                            Tentar Novamente
                        </button>
                        <button onclick="window.participanteNav.navegarPara('boas-vindas')"
                                style="background: #ff4500; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">home</span>
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            </div>
        `;

        // ✅ Esconder splash se ainda visível
        if (window.SplashScreen) {
            window.SplashScreen.hide();
        }
    }

    obterNomeModulo(moduloId) {
        const nomes = {
            "boas-vindas": "Boas-Vindas",
            extrato: "Extrato Financeiro",
            ranking: "Ranking Geral",
            rodadas: "Rodadas",
            historico: "Hall da Fama",
            top10: "Top 10",
            "melhor-mes": "Melhor Mês",
            "pontos-corridos": "Pontos Corridos",
            "mata-mata": "Mata-Mata",
            artilheiro: "Artilheiro Campeão",
            "luva-ouro": "Luva de Ouro",
        };
        return nomes[moduloId] || moduloId;
    }

    obterMensagemErroAmigavel(error) {
        const mensagem = error.message.toLowerCase();

        if (mensagem.includes("não foi encontrado") || mensagem.includes("404")) {
            return "Este módulo ainda não está disponível. Entre em contato com o administrador da liga.";
        }
        if (mensagem.includes("network") || mensagem.includes("fetch")) {
            return "Falha na conexão. Verifique sua internet e tente novamente.";
        }
        if (mensagem.includes("timeout")) {
            return "A requisição demorou muito. Tente novamente em instantes.";
        }
        return error.message || "Ocorreu um erro inesperado. Tente novamente.";
    }

    async carregarModuloJS(modulo) {
        if (window.Log) Log.debug('PARTICIPANTE-NAV', `📦 Importando JS: ${modulo}`);

        const modulosPaths = {
            "boas-vindas": "/participante/js/modules/participante-boas-vindas.js",
            extrato: "/participante/js/modules/participante-extrato.js",
            ranking: "/participante/js/modules/participante-ranking.js",
            rodadas: "/participante/js/modules/participante-rodadas.js",
            historico: "/participante/js/modules/participante-historico.js",
            top10: "/participante/js/modules/participante-top10.js",
            "melhor-mes": "/participante/js/modules/participante-melhor-mes.js",
            "pontos-corridos": "/participante/js/modules/participante-pontos-corridos.js",
            "mata-mata": "/participante/js/modules/participante-mata-mata.js",
            artilheiro: "/participante/js/modules/participante-artilheiro.js",
            "luva-ouro": "/participante/js/modules/participante-luva-ouro.js",
        };

        const jsPath = modulosPaths[modulo];
        if (jsPath) {
            try {
                const moduloJS = await import(jsPath);

                const moduloCamelCase = modulo
                    .split("-")
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join("");

                const possibleFunctionNames = [
                    `inicializar${moduloCamelCase}Participante`,
                    `inicializar${moduloCamelCase}`,
                    `inicializar${modulo}Participante`,
                    `inicializar${modulo}`,
                ];

                let functionExecuted = false;
                for (const funcName of possibleFunctionNames) {
                    if (moduloJS[funcName]) {
                        if (window.Log) Log.debug('PARTICIPANTE-NAV', `🚀 Executando: ${funcName}()`);
                        try {
                            if (this.participanteData) {
                                await moduloJS[funcName]({
                                    participante: this.participanteData,
                                    ligaId: this.participanteData.ligaId,
                                    timeId: this.participanteData.timeId,
                                });
                            } else {
                                await moduloJS[funcName]();
                            }
                            if (window.Log) Log.debug('PARTICIPANTE-NAV', `✅ ${funcName}() executada`);
                            functionExecuted = true;
                            break;
                        } catch (error) {
                            if (window.Log) Log.error('PARTICIPANTE-NAV', `❌ Erro em ${funcName}():`, error);
                        }
                    }
                }

                if (!functionExecuted) {
                    if (window.Log) Log.debug('PARTICIPANTE-NAV', `ℹ️ Sem função de init para '${modulo}'`);
                }
            } catch (error) {
                if (window.Log) Log.error('PARTICIPANTE-NAV', `❌ Erro ao importar '${jsPath}':`, error);
                throw error;
            }
        } else {
            if (window.Log) Log.debug('PARTICIPANTE-NAV', `ℹ️ Sem JS para '${modulo}'`);
        }
    }

    // =====================================================================
    // BLOQUEIO DE MODULOS EM PRE-TEMPORADA
    // =====================================================================

    /**
     * Verifica se o modulo esta bloqueado por conta da pre-temporada
     * Modulos que dependem de dados de rodadas ficam bloqueados ate o Brasileirao iniciar
     */
    verificarBloqueioPreTemporada(moduloId) {
        const config = window.ParticipanteConfig;

        // Se nao estiver em "preparando", nenhum modulo esta bloqueado
        if (!config || !config.isPreparando || !config.isPreparando()) {
            return false;
        }

        // Modulos que funcionam mesmo em pre-temporada
        const modulosLiberados = ['boas-vindas', 'extrato', 'historico'];

        // Se o modulo esta na lista de liberados, nao bloquear
        if (modulosLiberados.includes(moduloId)) {
            return false;
        }

        // Todos os outros modulos estao bloqueados em pre-temporada
        return true;
    }

    /**
     * Mostra modal amigavel informando que o modulo esta bloqueado
     */
    mostrarModalBloqueioPreTemporada(moduloId) {
        const config = window.ParticipanteConfig;
        const diasRestantes = config && config.getCountdownDays ? config.getCountdownDays() : 0;

        // Mapeamento de nomes amigaveis dos modulos
        const nomesModulos = {
            'ranking': 'Ranking',
            'rodadas': 'Rodadas',
            'top10': 'Top 10',
            'melhor-mes': 'Melhor do Mes',
            'pontos-corridos': 'Pontos Corridos',
            'mata-mata': 'Mata-Mata',
            'artilheiro': 'Artilheiro',
            'luva-ouro': 'Luva de Ouro'
        };

        const nomeModulo = nomesModulos[moduloId] || moduloId;

        // Remover modal existente se houver
        const modalExistente = document.getElementById('modalBloqueioPreTemporada');
        if (modalExistente) {
            modalExistente.remove();
        }

        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'modalBloqueioPreTemporada';
        modal.innerHTML = `
            <div class="modal-bloqueio-overlay" onclick="window.participanteNav.fecharModalBloqueio()">
                <div class="modal-bloqueio-content" onclick="event.stopPropagation()">
                    <div class="modal-bloqueio-icon">
                        <span class="material-symbols-outlined">hourglass_top</span>
                    </div>
                    <h3 class="modal-bloqueio-titulo">Aguarde o Cartola 2026</h3>
                    <p class="modal-bloqueio-texto">
                        O modulo <strong>${nomeModulo}</strong> estara disponivel quando o Brasileirao 2026 comecar.
                    </p>
                    ${diasRestantes > 0 ? `
                    <div class="modal-bloqueio-countdown">
                        <span class="countdown-numero">${diasRestantes}</span>
                        <span class="countdown-label">${diasRestantes === 1 ? 'dia' : 'dias'} restantes</span>
                    </div>
                    ` : ''}
                    <div class="modal-bloqueio-dica">
                        <span class="material-symbols-outlined">lightbulb</span>
                        <span>Enquanto isso, explore seu <strong>Historico</strong> e veja suas conquistas de 2025!</span>
                    </div>
                    <div class="modal-bloqueio-botoes">
                        <button class="modal-bloqueio-btn secundario" onclick="window.participanteNav.fecharModalBloqueio()">
                            <span class="material-symbols-outlined">close</span>
                            Fechar
                        </button>
                        <button class="modal-bloqueio-btn primario" onclick="window.participanteNav.irParaHistorico()">
                            <span class="material-symbols-outlined">emoji_events</span>
                            Ver Historico
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos se nao existirem
        if (!document.getElementById('estilosModalBloqueio')) {
            const estilos = document.createElement('style');
            estilos.id = 'estilosModalBloqueio';
            estilos.textContent = `
                .modal-bloqueio-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                    animation: fadeIn 0.2s ease;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .modal-bloqueio-content {
                    background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
                    border-radius: 20px;
                    padding: 28px 24px;
                    max-width: 340px;
                    width: 100%;
                    text-align: center;
                    border: 1px solid rgba(255, 85, 0, 0.3);
                    box-shadow: 0 20px 60px rgba(255, 85, 0, 0.15);
                    animation: slideUp 0.3s ease;
                }
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .modal-bloqueio-icon {
                    width: 72px;
                    height: 72px;
                    background: rgba(255, 85, 0, 0.15);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .modal-bloqueio-icon .material-symbols-outlined {
                    font-size: 36px;
                    color: #ff5500;
                }
                .modal-bloqueio-titulo {
                    color: white;
                    font-size: 20px;
                    font-weight: 700;
                    margin: 0 0 12px 0;
                }
                .modal-bloqueio-texto {
                    color: #9ca3af;
                    font-size: 14px;
                    margin: 0 0 20px 0;
                    line-height: 1.5;
                }
                .modal-bloqueio-texto strong {
                    color: #ff5500;
                }
                .modal-bloqueio-countdown {
                    background: rgba(255, 85, 0, 0.1);
                    border: 1px solid rgba(255, 85, 0, 0.3);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 20px;
                }
                .modal-bloqueio-countdown .countdown-numero {
                    display: block;
                    font-size: 36px;
                    font-weight: 800;
                    color: #ff5500;
                    line-height: 1;
                }
                .modal-bloqueio-countdown .countdown-label {
                    font-size: 12px;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .modal-bloqueio-dica {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    padding: 12px;
                    margin-bottom: 20px;
                    text-align: left;
                }
                .modal-bloqueio-dica .material-symbols-outlined {
                    font-size: 20px;
                    color: #fbbf24;
                    flex-shrink: 0;
                }
                .modal-bloqueio-dica span:last-child {
                    font-size: 12px;
                    color: #9ca3af;
                    line-height: 1.4;
                }
                .modal-bloqueio-dica strong {
                    color: #ff5500;
                }
                .modal-bloqueio-botoes {
                    display: flex;
                    gap: 10px;
                }
                .modal-bloqueio-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 14px 16px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }
                .modal-bloqueio-btn .material-symbols-outlined {
                    font-size: 18px;
                }
                .modal-bloqueio-btn.secundario {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }
                .modal-bloqueio-btn.secundario:active {
                    background: rgba(255, 255, 255, 0.15);
                    transform: scale(0.98);
                }
                .modal-bloqueio-btn.primario {
                    background: linear-gradient(135deg, #ff5500 0%, #ff8800 100%);
                    color: white;
                }
                .modal-bloqueio-btn.primario:active {
                    transform: scale(0.98);
                    filter: brightness(0.9);
                }
            `;
            document.head.appendChild(estilos);
        }

        document.body.appendChild(modal);
        if (window.Log) Log.info('PARTICIPANTE-NAV', `🚫 Modal bloqueio exibido para: ${moduloId}`);
    }

    fecharModalBloqueio() {
        const modal = document.getElementById('modalBloqueioPreTemporada');
        if (modal) {
            modal.remove();
        }
    }

    irParaHistorico() {
        this.fecharModalBloqueio();
        this.navegarPara('historico');
    }
}

// Instância global
const participanteNav = new ParticipanteNavigation();

// ✅ Expor globalmente para integração com SplashScreen
window.participanteNavigation = participanteNav;
window.participanteNav = participanteNav;

// Inicializar
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
        await participanteNav.inicializar();
    });
} else {
    participanteNav.inicializar();
}

if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Sistema v4.0 pronto (bloqueio pre-temporada + feedback visual)');

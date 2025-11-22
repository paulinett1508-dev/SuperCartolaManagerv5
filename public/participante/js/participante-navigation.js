// PARTICIPANTE NAVIGATION - Sistema de Navegação

console.log('[PARTICIPANTE-NAV] Carregando sistema de navegação...');

class ParticipanteNavigation {
    constructor() {
        this.moduloAtual = 'extrato';
        this.modulos = {
            'boas-vindas': '/participante/fronts/boas-vindas.html',
            'extrato': '/participante/fronts/extrato.html',
            'ranking': '/participante/fronts/ranking.html',
            'rodadas': '/participante/fronts/rodadas.html',
            'top10': '/participante/fronts/top10.html',
            'melhor-mes': '/participante/fronts/melhor-mes.html',
            'pontos-corridos': '/participante/fronts/pontos-corridos.html',
            'mata-mata': '/participante/fronts/mata-mata.html',
            'artilheiro': '/participante/fronts/artilheiro.html',
            'luva-ouro': '/participante/fronts/luva-ouro.html'
        };

        this.inicializar();
    }

    async inicializar() {
        console.log('[PARTICIPANTE-NAV] Inicializando navegação...');

        // ✅ AGUARDAR DADOS DO PARTICIPANTE ANTES DE CARREGAR MÓDULOS
        await this.aguardarDadosParticipante();

        // ✅ BUSCAR MÓDULOS ATIVOS DA LIGA
        await this.carregarModulosAtivos();

        // Event listeners nos botões (serão adicionados no renderizarMenuDinamico)

        // Aguardar módulos carregarem antes de navegar
        this.aguardarModulosENavegar();
    }

    async aguardarDadosParticipante() {
        console.log('[PARTICIPANTE-NAV] Aguardando dados do participante...');

        // Tentar até 10x com intervalo de 500ms (máximo 5 segundos)
        for (let i = 0; i < 10; i++) {
            const dados = participanteAuth.getDados();
            if (dados && dados.ligaId && dados.timeId) {
                console.log('[PARTICIPANTE-NAV] ✅ Dados do participante disponíveis:', dados);
                this.participante = dados; // Armazenar dados do participante na instância
                this.ligaId = dados.ligaId; // Armazenar ligaId
                this.timeId = dados.timeId; // Armazenar timeId
                return dados;
            }
            console.log(`[PARTICIPANTE-NAV] Tentativa ${i + 1}/10 - Aguardando dados...`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.warn('[PARTICIPANTE-NAV] ⚠️ Timeout aguardando dados do participante');
        return null;
    }

    async carregarModulosAtivos() {
        try {
            const participanteData = participanteAuth.getDados();
            if (!participanteData || !participanteData.ligaId) {
                console.error('[PARTICIPANTE-NAV] ❌ Dados do participante não disponíveis para carregar módulos');
                // Renderizar menu básico sem módulos condicionais
                this.modulosAtivos = {
                    extrato: true,
                    ranking: true,
                    rodadas: true,
                    top10: false,
                    melhorMes: false,
                    pontosCorridos: false,
                    mataMata: false,
                    artilheiro: false,
                    luvaOuro: false
                };
                this.renderizarMenuDinamico();
                return;
            }

            console.log(`[PARTICIPANTE-NAV] 🔍 Buscando módulos ativos para liga ${participanteData.ligaId}...`);

            const response = await fetch(`/api/ligas/${participanteData.ligaId}/modulos-ativos`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.modulosAtivos = data.modulos;

            console.log('[PARTICIPANTE-NAV] ✅ Módulos ativos carregados:', this.modulosAtivos);
            console.log('[PARTICIPANTE-NAV] 🔎 Verificação detalhada:');
            console.log('  - pontosCorridos:', this.modulosAtivos.pontosCorridos, typeof this.modulosAtivos.pontosCorridos);
            console.log('  - mataMata:', this.modulosAtivos.mataMata, typeof this.modulosAtivos.mataMata);

            // ✅ RENDERIZAR MENU COM APENAS MÓDULOS ATIVOS
            this.renderizarMenuDinamico();

        } catch (error) {
            console.error('[PARTICIPANTE-NAV] ❌ Erro ao carregar módulos ativos:', error);
            // Em caso de erro, mostrar apenas módulos básicos
            this.modulosAtivos = {
                extrato: true,
                ranking: true,
                rodadas: true,
                top10: false,
                melhorMes: false,
                pontosCorridos: false,
                mataMata: false,
                artilheiro: false,
                luvaOuro: false
            };
            this.renderizarMenuDinamico();
        }
    }

    renderizarMenuDinamico() {
        const navContainer = document.querySelector('.participante-nav');
        if (!navContainer) {
            console.error('[PARTICIPANTE-NAV] ❌ Container .participante-nav não encontrado');
            return;
        }

        console.log('[PARTICIPANTE-NAV] 🎨 Renderizando menu dinâmico...');
        console.log('[PARTICIPANTE-NAV] 📋 Módulos ativos configurados:', this.modulosAtivos);

        // Definição de todos os módulos possíveis
        const todosModulos = [
            { id: 'extrato', icon: '💰', label: 'Extrato', ativo: true },
            { id: 'ranking', icon: '📊', label: 'Classificação', ativo: true },
            { id: 'rodadas', icon: '🎯', label: 'Minhas Rodadas', ativo: true },
            { id: 'top10', icon: '🏆', label: 'Top 10', key: 'top10' },
            { id: 'melhor-mes', icon: '📅', label: 'Melhor do Mês', key: 'melhorMes' },
            { id: 'pontos-corridos', icon: '⚽', label: 'Pontos Corridos', key: 'pontosCorridos' },
            { id: 'mata-mata', icon: '⚔️', label: 'Mata-Mata', key: 'mataMata' },
            { id: 'artilheiro', icon: '🥇', label: 'Artilheiro', key: 'artilheiro' },
            { id: 'luva-ouro', icon: '🥅', label: 'Luva de Ouro', key: 'luvaOuro' }
        ];

        console.log('[PARTICIPANTE-NAV] 🔍 Estado atual dos módulos:', this.modulosAtivos);

        // Filtrar módulos baseado na configuração da liga
        const modulosVisiveis = todosModulos.filter(modulo => {
            // Módulos base sempre visíveis
            if (modulo.ativo) {
                console.log(`[PARTICIPANTE-NAV] ✅ ${modulo.label} - sempre ativo`);
                return true;
            }

            // Módulos condicionais: verificar se estão ativos
            const estaAtivo = this.modulosAtivos && this.modulosAtivos[modulo.key];
            console.log(`[PARTICIPANTE-NAV] ${estaAtivo ? '✅' : '❌'} ${modulo.label} - Chave: "${modulo.key}" = ${estaAtivo} (tipo: ${typeof estaAtivo})`);

            // Debug adicional
            if (modulo.key && this.modulosAtivos) {
                console.log(`[PARTICIPANTE-NAV] 🔎 Verificando this.modulosAtivos["${modulo.key}"] =`, this.modulosAtivos[modulo.key]);
            }

            return estaAtivo;
        });

        // Renderizar botões com botão HOME no início
        navContainer.innerHTML = `
            <button class="nav-btn nav-home" data-module="boas-vindas" title="Voltar para Início">
                🏠 Home
            </button>
        ` + modulosVisiveis.map(modulo => `
            <button class="nav-btn ${modulo.id === 'extrato' ? 'active' : ''}" data-module="${modulo.id}">
                ${modulo.icon} ${modulo.label}
            </button>
        `).join('');

        console.log(`[PARTICIPANTE-NAV] ✅ Menu renderizado com ${modulosVisiveis.length} módulos de ${todosModulos.length} possíveis + Botão Home`);

        // Re-adicionar event listeners
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modulo = e.currentTarget.dataset.module;
                this.navegarPara(modulo);
            });

            // Touch feedback para mobile
            btn.addEventListener('touchstart', () => {
                btn.style.opacity = '0.7';
            });
            btn.addEventListener('touchend', () => {
                btn.style.opacity = '1';
            });
        });
    }

    async aguardarModulosENavegar() {
        console.log('[PARTICIPANTE-NAV] Sistema de navegação pronto');
        // ✅ RESTAURAR MÓDULO ANTERIOR OU CARREGAR BOAS-VINDAS
        const moduloSalvo = this.restaurarModuloAnterior();
        this.navegarPara(moduloSalvo || 'boas-vindas');

        // ✅ PREVENIR QUE PULL-TO-REFRESH VOLTE PARA BOAS-VINDAS
        this.configurarPullToRefresh();
    }

    configurarPullToRefresh() {
        let startY = 0;
        let pulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                pulling = false;
            }
        });

        document.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].pageY;
            if (currentY > startY && window.scrollY === 0) {
                pulling = true;
            }
        });

        document.addEventListener('touchend', () => {
            if (pulling) {
                console.log('[PARTICIPANTE-NAV] 🔄 Pull-to-refresh detectado, mantendo módulo atual');
                // Não navegue para boas-vindas, apenas mantenha o módulo atual
                pulling = false;
            }
        });
    }

    restaurarModuloAnterior() {
        const moduloAnterior = sessionStorage.getItem('moduloAtual');
        if (moduloAnterior) {
            console.log('[PARTICIPANTE-NAV] 🔄 Restaurando módulo:', moduloAnterior);
            this.moduloAtual = moduloAnterior;
            return moduloAnterior;
        }
        return null;
    }

    async navegarPara(modulo) {
        console.log('[PARTICIPANTE-NAV] Navegando para:', modulo);

        // Validar se módulo existe
        if (!this.modulos[modulo]) {
            console.error('[PARTICIPANTE-NAV] Módulo não encontrado:', modulo);
            return;
        }

        // Salvar módulo atual no sessionStorage
        sessionStorage.setItem('moduloAtual', modulo);

        // Atualizar botão ativo
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.module === modulo) {
                btn.classList.add('active');
            }
        });

        // Se não for boas-vindas, manter botão Home visível
        if (modulo !== 'boas-vindas') {
            const homeBtn = document.querySelector('.nav-home');
            if (homeBtn) homeBtn.classList.add('active-home');
        }

        // Carregar conteúdo
        const container = document.getElementById('moduleContainer');
        if (!container) {
            console.error('[PARTICIPANTE-NAV] ❌ Container #moduleContainer não encontrado');
            return;
        }
        this.contentArea = container; // Armazenar container para uso em carregarModulo

        // Loading
        container.innerHTML = `
            <div class="loading-participante">
                <div class="spinner-participante"></div>
                <p style="margin-top: 20px;">Carregando ${modulo}...</p>
            </div>
        `;

        try {
            // ✅ 1. CARREGAR HTML PRIMEIRO
            const response = await fetch(this.modulos[modulo]);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            container.innerHTML = html;

            // ✅ 2. AGUARDAR UM MOMENTO PARA O DOM ESTABILIZAR
            await new Promise(resolve => setTimeout(resolve, 50));

            // ✅ 3. IMPORTAR MÓDULO JS (SE NECESSÁRIO)
            await this.carregarModuloJS(modulo);

            // ✅ 4. SÓ DEPOIS INICIALIZAR
            await this.inicializarModulo(modulo);

            this.moduloAtual = modulo;

        } catch (error) {
            console.error(`[PARTICIPANTE-NAV] Erro ao carregar ${modulo}:`, error);

            const isNetworkError = error.message.includes('fetch') || !navigator.onLine;

            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <h3>❌ ${isNetworkError ? 'Erro de Conexão' : 'Erro ao Carregar Módulo'}</h3>
                    <p style="margin: 15px 0;">${error.message}</p>
                    ${isNetworkError ? '<p style="color: #999; font-size: 14px;">Verifique sua conexão com a internet</p>' : ''}
                    <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                        <button onclick="participanteNav.navegarPara('${modulo}')"
                                style="padding: 10px 20px; background: var(--participante-primary); color: white;
                                       border: none; border-radius: 8px; cursor: pointer;">
                            🔄 Tentar Novamente
                        </button>
                        <button onclick="participanteNav.navegarPara('extrato')"
                                style="padding: 10px 20px; background: #666; color: white;
                                       border: none; border-radius: 8px; cursor: pointer;">
                            ← Voltar ao Extrato
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async carregarModuloJS(modulo) {
        console.log(`[PARTICIPANTE-NAV] 📦 Importando módulo JS: ${modulo}`);

        const modulosPaths = {
            'boas-vindas': '/participante/js/modules/participante-boas-vindas.js',
            'extrato': '/participante/js/modules/participante-extrato.js',
            'ranking': '/participante/js/modules/participante-ranking.js',
            'rodadas': '/participante/js/modules/participante-rodadas.js',
            'top10': '/participante/js/modules/participante-top10.js',
            'melhor-mes': '/participante/js/modules/participante-melhor-mes.js',
            'pontos-corridos': '/participante/js/modules/participante-pontos-corridos.js',
            'mata-mata': '/participante/js/modules/participante-mata-mata.js',
            'artilheiro': '/participante/js/modules/participante-artilheiro.js',
            'luva-ouro': '/participante/js/modules/participante-luva-ouro.js'
        };

        if (modulosPaths[modulo]) {
            try {
                await import(modulosPaths[modulo]);
                console.log(`[PARTICIPANTE-NAV] ✅ Módulo ${modulo} importado`);
            } catch (error) {
                console.error(`[PARTICIPANTE-NAV] ❌ Erro ao importar ${modulo}:`, error);
                throw error;
            }
        }
    }

    async inicializarModulo(modulo) {
        console.log(`[PARTICIPANTE-NAV] Inicializando módulo: ${modulo}`);

        const participanteData = participanteAuth.getDados();

        // Página de boas-vindas com dados reais
        if (modulo === 'boas-vindas') {
            if (participanteData && participanteData.ligaId && participanteData.timeId) {
                if (window.inicializarBoasVindas) {
                    await window.inicializarBoasVindas(participanteData.ligaId, participanteData.timeId);
                    console.log('[PARTICIPANTE-NAV] Página de boas-vindas carregada com dados');
                } else {
                    console.log('[PARTICIPANTE-NAV] Função inicializarBoasVindas não encontrada, usando dados padrão');
                }
            } else {
                console.log('[PARTICIPANTE-NAV] Página de boas-vindas carregada sem dados do participante');
            }
            return;
        }

        // ✅ VALIDAR DADOS DO PARTICIPANTE
        if (!participanteData || !participanteData.ligaId || !participanteData.timeId) {
            console.error('[PARTICIPANTE-NAV] Dados do participante inválidos:', participanteData);
            const container = document.getElementById('moduleContainer');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #ef4444;">
                        <h3>❌ Erro de Autenticação</h3>
                        <p>Dados do participante não encontrados. Por favor, faça login novamente.</p>
                        <button onclick="window.location.href='/participante-login.html'"
                                style="margin-top: 20px; padding: 10px 20px; background: #ff4500;
                                       color: white; border: none; border-radius: 8px; cursor: pointer;">
                            🔐 Fazer Login
                        </button>
                    </div>
                `;
            }
            return;
        }

        // ✅ EXTRAIR DADOS PARA USO SIMPLIFICADO
        const { ligaId, timeId } = participanteData;

        switch(modulo) {
            case 'extrato':
                if (typeof window.inicializarExtratoParticipante === 'function') {
                    console.log('[PARTICIPANTE-NAV] Chamando inicializarExtratoParticipante com dados:', participanteData);
                    try {
                        // Tentar inicializar o módulo com dados do participante
                        if (window.inicializarExtratoParticipante && typeof window.inicializarExtratoParticipante === 'function') {
                            console.log(`[PARTICIPANTE-NAV] Inicializando módulo: extrato`);
                            const dadosParticipante = this.obterDadosParticipante();

                            // Validar dados críticos antes de passar para o módulo
                            if (!dadosParticipante.ligaId || dadosParticipante.ligaId === 'null') {
                                console.error('[PARTICIPANTE-NAV] ❌ ligaId inválida nos dados do participante:', dadosParticipante);
                                this.mostrarErro('Dados de autenticação inválidos. Faça login novamente.');
                                return;
                            }

                            console.log(`[PARTICIPANTE-NAV] Chamando ${window.inicializarExtratoParticipante.name} com dados:`, dadosParticipante);
                            console.log(`[PARTICIPANTE-NAV] 🔑 ligaId: ${dadosParticipante.ligaId}, timeId: ${dadosParticipante.timeId}`);

                            await window.inicializarExtratoParticipante(dadosParticipante);
                        }
                    } catch (error) {
                        console.error('[PARTICIPANTE-NAV] Erro ao inicializar extrato:', error);
                        const container = document.getElementById('moduleContainer');
                        if (container) {
                            container.innerHTML = `<div style="text-align: center; padding: 40px; color: #ef4444;"><h3>❌ Erro ao carregar extrato</h3><p>${error.message}</p><button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ff4500; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 Recarregar</button></div>`;
                        }
                    }
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarExtratoParticipante não encontrada');
                    const container = document.getElementById('moduleContainer');
                    if (container) {
                        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;"><h3>❌ Módulo de extrato não carregado</h3><p>Por favor, recarregue a página</p><button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ff4500; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 Recarregar</button></div>';
                    }
                }
                break;

            case 'ranking':
                if (window.inicializarRankingParticipante) {
                    await window.inicializarRankingParticipante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarRankingParticipante não encontrada');
                }
                break;

            case 'rodadas':
                if (window.inicializarRodadasParticipante) {
                    await window.inicializarRodadasParticipante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarRodadasParticipante não encontrada');
                }
                break;

            case 'top10':
                if (window.inicializarTop10Participante) {
                    await window.inicializarTop10Participante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarTop10Participante não encontrada');
                }
                break;

            case 'melhor-mes':
                if (window.inicializarMelhorMesParticipante) {
                    await window.inicializarMelhorMesParticipante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarMelhorMesParticipante não encontrada');
                }
                break;

            case 'pontos-corridos':
                if (window.inicializarPontosCorridosParticipante) {
                    await window.inicializarPontosCorridosParticipante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarPontosCorridosParticipante não encontrada');
                }
                break;

            case 'mata-mata':
                if (window.inicializarMataMataParticipante) {
                    await window.inicializarMataMataParticipante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarMataMataParticipante não encontrada');
                }
                break;

            case 'artilheiro':
                console.log('[PARTICIPANTE-NAV] 🏆 Inicializando módulo Artilheiro...');
                console.log('[PARTICIPANTE-NAV] Função disponível?', typeof window.inicializarArtilheiroParticipante);
                
                if (window.inicializarArtilheiroParticipante) {
                    console.log('[PARTICIPANTE-NAV] Chamando inicializarArtilheiroParticipante com:', { ligaId, timeId });
                    await window.inicializarArtilheiroParticipante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] ❌ Função inicializarArtilheiroParticipante não encontrada');
                    console.error('[PARTICIPANTE-NAV] Funções disponíveis no window:', Object.keys(window).filter(k => k.includes('Artilheiro')));
                }
                break;

            case 'luva-ouro':
                if (window.inicializarLuvaOuroParticipante) {
                    await window.inicializarLuvaOuroParticipante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarLuvaOuroParticipante não encontrada');
                }
                break;

            default:
                console.warn(`[PARTICIPANTE-NAV] Módulo ${modulo} não tem inicializador definido`);
        }
    }

    // Helper function to get participant data, ensuring it's not null/undefined
    obterDadosParticipante() {
        const dados = participanteAuth.getDados();
        if (!dados) {
            console.error('[PARTICIPANTE-NAV] Erro interno: participanteAuth.getDados() retornou null ou undefined.');
            // Retornar um objeto com valores padrão para evitar erros subsequentes, mas logar o erro.
            return { ligaId: 'null', timeId: 'null' };
        }
        return dados;
    }

    // Helper function to display error messages in the module container
    mostrarErro(mensagem) {
        const container = document.getElementById('moduleContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <h3>❌ Erro Crítico</h3>
                    <p>${mensagem}</p>
                    <button onclick="window.location.reload()"
                            style="margin-top: 20px; padding: 10px 20px; background: #ff4500;
                                   color: white; border: none; border-radius: 8px; cursor: pointer;">
                        🔄 Recarregar
                    </button>
                </div>
            `;
        }
    }

    async carregarModulo(moduloId) {
        console.log(`[PARTICIPANTE-NAV] 🔄 Navegando para: ${moduloId}`);
        console.log(`[PARTICIPANTE-NAV] 📊 Dados disponíveis:`, {
            participante: this.participante,
            ligaId: this.ligaId,
            timeId: this.timeId
        });

        try {
            // Verificar se módulo está ativo
            const moduloAtivo = this.verificarModuloAtivo(moduloId);
            console.log(`[PARTICIPANTE-NAV] ✓ Módulo ${moduloId} está ${moduloAtivo ? 'ATIVO' : 'INATIVO'}`);

            if (!moduloAtivo) {
                console.warn(`[PARTICIPANTE-NAV] ⚠️ Tentativa de acessar módulo inativo: ${moduloId}`);
                this.contentArea.innerHTML = `
                    <div class="alert alert-warning">
                        <h4>⚠️ Módulo Não Disponível</h4>
                        <p>Este módulo não está ativo nesta liga.</p>
                    </div>
                `;
                return;
            }

            // Carregar HTML do front
            const htmlPath = `/participante/fronts/${moduloId}.html`;
            console.log(`[PARTICIPANTE-NAV] 📄 Carregando HTML: ${htmlPath}`);

            const response = await fetch(htmlPath);

            if (!response.ok) {
                throw new Error(`Erro ao carregar ${htmlPath}: ${response.status}`);
            }

            const html = await response.text();
            this.contentArea.innerHTML = html;
            console.log(`[PARTICIPANTE-NAV] ✅ HTML carregado para: ${moduloId}`);

            // Carregar e executar JavaScript do módulo se existir
            const jsPath = `/participante/js/modules/participante-${moduloId}.js`;

            console.log(`[PARTICIPANTE-NAV] 📦 Importando módulo JS: ${jsPath}`);

            try {
                const modulo = await import(jsPath);
                console.log(`[PARTICIPANTE-NAV] ✅ Módulo JS importado:`, modulo);

                console.log(`[PARTICIPANTE-NAV] 🚀 Inicializando módulo: ${moduloId}`);

                if (modulo.init && typeof modulo.init === 'function') {
                    console.log(`[PARTICIPANTE-NAV] Executando modulo.init()`);
                    await modulo.init();
                } else if (modulo.default && typeof modulo.default === 'function') {
                    console.log(`[PARTICIPANTE-NAV] Executando modulo.default()`);
                    await modulo.default();
                } else {
                    console.warn(`[PARTICIPANTE-NAV] ⚠️ Módulo sem função de inicialização`);
                }

                console.log(`[PARTICIPANTE-NAV] ✅ Página de ${moduloId} carregada com sucesso`);
            } catch (jsError) {
                console.error(`[PARTICIPANTE-NAV] ❌ Erro ao carregar módulo JS:`, jsError);
                console.error(`[PARTICIPANTE-NAV] Stack:`, jsError.stack);
                throw new Error(`Erro ao carregar módulo JS: ${jsError.message}`);
            }

        } catch (error) {
            console.error(`[PARTICIPANTE-NAV] ❌ Erro ao carregar módulo ${moduloId}:`, error);
            console.error(`[PARTICIPANTE-NAV] Stack completo:`, error.stack);
            this.contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <h4>❌ Erro ao Carregar Módulo</h4>
                    <p><strong>Módulo:</strong> ${moduloId}</p>
                    <p><strong>Erro:</strong> ${error.message}</p>
                    <details>
                        <summary>Ver detalhes técnicos</summary>
                        <pre>${error.stack}</pre>
                    </details>
                </div>
            `;
        }
    }

    verificarModuloAtivo(moduloId) {
        // Mapear IDs de módulos para chaves de configuração
        const mapaModulos = {
            'artilheiro': 'artilheiro',
            'luva-ouro': 'luvaOuro',
            'mata-mata': 'mataMata',
            'pontos-corridos': 'pontosCorridos',
            'melhor-mes': 'melhorMes',
            'top10': 'top10',
            'ranking': 'ranking',
            'rodadas': 'rodadas',
            'extrato': 'extrato',
            'boas-vindas': true // Sempre ativo
        };

        const chaveModulo = mapaModulos[moduloId];

        if (chaveModulo === true) {
            return true; // Módulos sempre ativos
        }

        if (!chaveModulo) {
            console.warn(`[PARTICIPANTE-NAV] Módulo desconhecido: ${moduloId}`);
            return false;
        }

        const ativo = this.modulosAtivos && this.modulosAtivos[chaveModulo] === true;
        console.log(`[PARTICIPANTE-NAV] 🔍 Verificando módulo: ${moduloId} -> ${chaveModulo} = ${ativo}`);

        return ativo;
    }
}

// Instância global
let participanteNav;

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        participanteNav = new ParticipanteNavigation();
    });
} else {
    participanteNav = new ParticipanteNavigation();
}

console.log('[PARTICIPANTE-NAV] ✅ Sistema carregado');
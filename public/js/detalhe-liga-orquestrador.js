// 🎯 DETALHE-LIGA ORQUESTRADOR - SISTEMA DE CARREGAMENTO MODULAR
// Responsável por gerenciar navegação e carregamento dinâmico dos módulos

class DetalheLigaOrquestrador {
    constructor() {
        this.processingModule = false;
        this.modules = {};
        this.loadedCSS = new Set();

        this.init();
    }

    // 🚀 INICIALIZAÇÃO PRINCIPAL (CORRIGIDA)
    async init() {
        try {
            console.log('🚀 Iniciando orquestrador...');

            await this.loadLayout();
            console.log('✅ Layout carregado');

            await this.loadModules();
            console.log('✅ Módulos carregados');

            await this.updateParticipantesCount();
            console.log('✅ Participantes atualizados');

            this.initializeNavigation();
            console.log('✅ Navegação inicializada');

            this.setupGlobalFunctions();
            console.log('✅ Funções globais configuradas');

            // 🧹 GARANTIR LIMPEZA DO HEADER (timeout mais conservador)
            setTimeout(() => {
                try {
                    this.limparLinhaDoMeio();
                } catch (error) {
                    console.warn('⚠️ Erro ao limpar header:', error);
                }
            }, 1500);

            // Inicializar ícones Lucide
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
                console.log('✅ Ícones Lucide inicializados');
            }

            console.log('✅ Orquestrador inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro na inicialização do orquestrador:', error);
        }
    }

    // 📄 CARREGADOR DE MÓDULOS HTML
    async loadModuleHTML(moduleName) {
        try {
            const response = await fetch(`/fronts/${moduleName}.html`);
            if (!response.ok) {
                throw new Error(`Módulo ${moduleName} não encontrado`);
            }
            return await response.text();
        } catch (error) {
            console.warn(`⚠️ HTML do módulo ${moduleName} não encontrado, usando fallback`);
            return this.getFallbackHTML(moduleName);
        }
    }

    // 🎨 CARREGADOR DE CSS MODULAR
    async loadModuleCSS(moduleName) {
        const cssId = `module-css-${moduleName}`;

        // Verificar se já foi carregado
        if (this.loadedCSS.has(moduleName)) {
            return;
        }

        try {
            const cssPath = `/css/modules/${moduleName}.css`;
            const response = await fetch(cssPath);

            if (response.ok) {
                const cssContent = await response.text();

                // Injetar CSS no head
                const styleElement = document.createElement('style');
                styleElement.id = cssId;
                styleElement.textContent = cssContent;
                document.head.appendChild(styleElement);

                this.loadedCSS.add(moduleName);
                console.log(`✅ CSS do módulo ${moduleName} carregado`);
            } else {
                console.log(`ℹ️ CSS do módulo ${moduleName} não encontrado (usando CSS base)`);
            }
        } catch (error) {
            console.log(`ℹ️ CSS do módulo ${moduleName} não encontrado, usando CSS base`);
        }
    }

    // ⚡ CARREGADOR COMBINADO
    async loadModule(moduleName) {
        this.showLoading(`Carregando módulo ${moduleName}...`);

        try {
            // Carregar HTML e CSS em paralelo
            await Promise.all([
                this.loadModuleCSS(moduleName),
                // CSS sempre tenta carregar primeiro
            ]);

            const html = await this.loadModuleHTML(moduleName);

            // Injetar HTML na área dinâmica
            const contentArea = document.getElementById('dynamic-content-area');
            contentArea.innerHTML = html;

            // Executar scripts específicos do módulo se existirem
            await this.executeModuleScripts(moduleName);

            return { success: true, html };

        } catch (error) {
            console.error(`❌ Erro ao carregar módulo ${moduleName}:`, error);
            return { success: false, error: error.message };
        } finally {
            this.hideLoading();
        }
    }

    // 🔧 EXECUTAR SCRIPTS DO MÓDULO
    async executeModuleScripts(moduleName) {
        try {
            switch (moduleName) {
                case 'ranking-geral':
                    // INTERCEPTAR FUNÇÃO ANTES DE CARREGAR
                    this.interceptarRankingFunction();

                    if (this.modules.ranking?.carregarRankingGeral) {
                        await this.modules.ranking.carregarRankingGeral();
                    }

                    // APLICAR ESTILOS APÓS CARREGAMENTO
                    setTimeout(() => this.applyRankingStyles(), 500);
                    break;

                case 'rodadas':
                    if (this.modules.rodadas?.carregarRodadas) {
                        await this.modules.rodadas.carregarRodadas();
                    }
                    break;

                case 'mata-mata':
                    if (this.modules.mataMata?.carregarMataMata) {
                        await this.modules.mataMata.carregarMataMata();
                    }
                    break;

                case 'pontos-corridos':
                    if (this.modules.pontosCorreidos?.inicializarPontosCorreidos) {
                        await this.modules.pontosCorreidos.inicializarPontosCorreidos();
                    }
                    break;

                case 'luva-de-ouro':
                    if (this.modules.luvaDeOuro?.inicializarLuvaDeOuro) {
                        await this.modules.luvaDeOuro.inicializarLuvaDeOuro();
                    }
                    break;

                case 'artilheiro-campeao':
                    if (this.modules.artilheiroCampeao?.inicializarArtilheiroCampeao) {
                        await this.modules.artilheiroCampeao.inicializarArtilheiroCampeao();
                    }
                    break;

                case 'melhor-mes':
                    if (this.modules.melhorMes?.inicializarMelhorMes) {
                        await this.modules.melhorMes.inicializarMelhorMes();
                    }
                    break;

                case 'top10':
                    if (this.modules.top10?.inicializarTop10) {
                        await this.modules.top10.inicializarTop10();
                    }
                    break;

                case 'fluxo-financeiro':
                    if (this.modules.fluxoFinanceiro?.inicializarFluxoFinanceiro) {
                        await this.modules.fluxoFinanceiro.inicializarFluxoFinanceiro();
                    }
                    break;

                case 'participantes':
                    await this.loadParticipantesData();
                    break;
            }
        } catch (error) {
            console.error(`❌ Erro ao executar scripts do módulo ${moduleName}:`, error);
        }
    }

    // 📄 HTML FALLBACK PARA MÓDULOS SEM ARQUIVO PRÓPRIO
    getFallbackHTML(moduleName) {
        const fallbacks = {
            'participantes': `
                <div id="participantes-content">
                    <h4 style="color: #ffffff; margin-bottom: 15px;">
                        👥 Participantes da Liga
                    </h4>
                    <div class="participantes-grid">
                        <div class="loading-state">Carregando participantes...</div>
                    </div>
                </div>
            `,
            'ranking-geral': `
                <div id="ranking-geral">
                    <div class="ranking-header">
                        <div class="ranking-title">
                            <div class="ranking-icon">🏅</div>
                            <h2>Classificação Geral</h2>
                        </div>
                        <div class="ranking-subtitle">carregando classificação oficial...</div>
                    </div>
                    <div class="loading-state">Processando dados da classificação...</div>
                </div>
            `,
            'rodadas': `
                <div id="rodadas">
                    <div class="mb-3">
                        <select id="rodadaSelect" class="form-control">
                            <option value="">Escolha uma rodada</option>
                        </select>
                    </div>
                    <div class="table-responsive">
                        <table class="ranking-table">
                            <thead>
                                <tr><th>Pos</th><th>❤️</th><th>Cartoleiro</th><th>Time</th><th>Pontos</th><th>Banco</th></tr>
                            </thead>
                            <tbody id="rankingBody">
                                <tr><td colspan="6" class="empty-state">Selecione uma rodada</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `
        };

        return fallbacks[moduleName] || `
            <div class="empty-state">
                <h4>Módulo ${moduleName}</h4>
                <p>Funcionalidade em desenvolvimento</p>
            </div>
        `;
    }

    // 🧭 SISTEMA DE NAVEGAÇÃO
    initializeNavigation() {
        const cards = document.querySelectorAll('.module-card');
        const items = document.querySelectorAll('.module-items li[data-action]');

        // Cards principais
        cards.forEach(card => {
            if (card.classList.contains('disabled')) return;

            card.addEventListener('click', async (e) => {
                if (this.processingModule) return;

                // Feedback visual imediato
                card.style.transform = 'translateY(-1px) scale(0.98)';
                setTimeout(() => card.style.transform = '', 150);

                const module = card.dataset.module;
                if (module === 'participantes') {
                    await this.showModule('participantes');
                } else {
                    // Para outros cards, mostrar primeira ação
                    const firstAction = card.querySelector('li[data-action]');
                    if (firstAction) {
                        await this.executeAction(firstAction.dataset.action);
                    }
                }
            });
        });

        // Items específicos
        items.forEach(item => {
            const parentCard = item.closest('.module-card');
            if (parentCard && parentCard.classList.contains('disabled')) return;

            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (this.processingModule) return;

                // Feedback visual
                item.style.opacity = '0.6';
                setTimeout(() => item.style.opacity = '', 150);

                await this.executeAction(item.dataset.action);
            });
        });
    }

    // ⚡ EXECUTAR AÇÃO ESPECÍFICA
    async executeAction(action) {
        if (this.processingModule) return;

        this.processingModule = true;

        try {
            this.showSecondaryScreen();

            switch (action) {
                case 'ranking-geral':
                    await this.showModule('ranking-geral');
                    break;
                case 'parciais':
                    this.redirectToParciais();
                    break;
                case 'rodadas':
                    await this.showModule('rodadas');
                    break;
                case 'mata-mata':
                    await this.showModule('mata-mata');
                    break;
                case 'pontos-corridos':
                    await this.showModule('pontos-corridos');
                    break;
                case 'luva-de-ouro':
                    await this.showModule('luva-de-ouro');
                    break;
                case 'artilheiro-campeao':
                    await this.showModule('artilheiro-campeao');
                    break;
                case 'melhor-mes':
                    await this.showModule('melhor-mes');
                    break;
                case 'top10':
                    await this.showModule('top10');
                    break;
                case 'fluxo-financeiro':
                    await this.showModule('fluxo-financeiro');
                    break;
                default:
                    document.getElementById('dynamic-content-area').innerHTML = 
                        '<div class="empty-state">Funcionalidade em desenvolvimento</div>';
            }
        } catch (error) {
            document.getElementById('dynamic-content-area').innerHTML = 
                `<div class="empty-state">Erro: ${error.message}</div>`;
        } finally {
            this.processingModule = false;
        }
    }

    // 📄 MOSTRAR MÓDULO ESPECÍFICO
    async showModule(moduleName) {
        const result = await this.loadModule(moduleName);

        if (!result.success) {
            document.getElementById('dynamic-content-area').innerHTML = 
                `<div class="empty-state">Erro ao carregar módulo: ${result.error}</div>`;
        }
    }

    // 🔄 NAVEGAÇÃO ENTRE TELAS
    showSecondaryScreen() {
        document.getElementById('main-screen').style.display = 'none';
        document.getElementById('secondary-screen').classList.add('active');
    }

    voltarParaCards() {
        document.getElementById('secondary-screen').classList.remove('active');
        document.getElementById('main-screen').style.display = 'block';
    }

    // 🔄 LOADING STATES
    showLoading(text = 'Carregando dados...') {
        const overlay = document.getElementById('processing-overlay');
        const textEl = overlay.querySelector('.processing-text');
        textEl.textContent = text;
        overlay.classList.add('active');
    }

    hideLoading() {
        const overlay = document.getElementById('processing-overlay');
        overlay.classList.remove('active');
    }

    // 📊 CARREGAR LAYOUT (MANTIDO PARA COMPATIBILIDADE)
    async loadLayout() {
        try {
            const response = await fetch('layout.html');
            const layoutHtml = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(layoutHtml, 'text/html');

            const sidebar = doc.querySelector('.app-sidebar');
            if (sidebar) {
                const placeholder = document.getElementById('sidebar-placeholder');
                if (placeholder) {
                    placeholder.replaceWith(sidebar);
                }
            }

            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => {
                if (script.textContent.trim()) {
                    const newScript = document.createElement('script');
                    newScript.textContent = script.textContent;
                    document.head.appendChild(newScript);
                }
            });
        } catch (error) {
            console.error('Erro ao carregar layout:', error);
        }
    }

    // 📦 CARREGAR MÓDULOS JS (MANTIDO PARA COMPATIBILIDADE)
    async loadModules() {
        try {
            this.modules.ranking = await import('./ranking.js');
            this.modules.rodadas = await import('./rodadas.js');
            this.modules.mataMata = await import('./mata-mata.js');
            this.modules.pontosCorreidos = await import('./pontos-corridos.js');
            this.modules.luvaDeOuro = await import('./luva-de-ouro.js');
            this.modules.artilheiroCampeao = await import('./artilheiro-campeao.js');
            this.modules.melhorMes = await import('./melhor-mes.js');
            this.modules.top10 = await import('./top10.js');
            this.modules.fluxoFinanceiro = await import('./fluxo-financeiro.js');
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
        }
    }

    // 👥 CARREGAR DADOS DE PARTICIPANTES
    async loadParticipantesData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get('id');

            if (!ligaId) {
                document.getElementById('dynamic-content-area').innerHTML = 
                    '<div class="empty-state">ID da liga não encontrado</div>';
                return;
            }

            const response = await fetch(`/api/ligas/${ligaId}`);
            if (!response.ok) {
                throw new Error('Erro ao carregar liga');
            }

            const liga = await response.json();
            if (!liga.times || liga.times.length === 0) {
                document.getElementById('dynamic-content-area').innerHTML = 
                    '<div class="empty-state">Nenhum participante cadastrado</div>';
                return;
            }

            let participantesHtml = `
                <h4 style="color: #ffffff; margin-bottom: 15px;">
                    👥 Participantes da Liga (${liga.times.length})
                </h4>
                <div class="participantes-grid">
            `;

            for (const timeId of liga.times) {
                try {
                    const timeResponse = await fetch(`/api/time/${timeId}`);
                    if (timeResponse.ok) {
                        const time = await timeResponse.json();
                        participantesHtml += `
                            <div class="participante-card">
                                <img src="${time.url_escudo_png || '/escudos/default.png'}" 
                                     alt="Escudo" class="participante-escudo"
                                     onerror="this.src='/escudos/default.png'">
                                <div class="participante-nome">${time.nome_cartoleiro || 'N/A'}</div>
                                <div class="participante-time">${time.nome_time || 'Time N/A'}</div>
                            </div>
                        `;
                    }
                } catch (error) {
                    console.warn(`Erro ao carregar time ${timeId}:`, error);
                }
            }

            participantesHtml += '</div>';
            document.getElementById('dynamic-content-area').innerHTML = participantesHtml;

        } catch (error) {
            document.getElementById('dynamic-content-area').innerHTML = 
                `<div class="empty-state">Erro ao carregar participantes: ${error.message}</div>`;
        }
    }

    // 📊 ATUALIZAR CONTADOR DE PARTICIPANTES + LIMPAR HEADER (CORRIGIDO)
    async updateParticipantesCount() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ligaId = urlParams.get('id');

            if (!ligaId) {
                console.log('ℹ️ ID da liga não encontrado na URL');
                return;
            }

            const response = await fetch(`/api/ligas/${ligaId}`);
            if (response.ok) {
                const liga = await response.json();

                // Atualizar header da liga
                const nomeElement = document.getElementById('nomeLiga');
                const quantidadeElement = document.getElementById('quantidadeTimes');

                if (nomeElement) {
                    nomeElement.textContent = liga.nome || 'Nome da Liga';
                }

                if (quantidadeElement) {
                    const totalParticipantes = liga.participantes?.length || liga.times?.length || 0;
                    quantidadeElement.textContent = `${totalParticipantes} participantes`;
                }

                // Atualizar contador no card
                const countElement = document.getElementById('participantes-count');
                if (countElement) {
                    const totalMembros = liga.participantes?.length || liga.times?.length || 0;
                    countElement.textContent = `${totalMembros} membros`;
                }

                console.log(`✅ Liga atualizada: ${liga.nome} com ${liga.participantes?.length || liga.times?.length || 0} participantes`);

                // 🔧 LIMPAR LINHA DO MEIO PROGRAMATICAMENTE
                setTimeout(() => this.limparLinhaDoMeio(), 100);
            } else {
                console.warn('⚠️ Erro ao carregar dados da liga:', response.status);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao atualizar contador:', error);
        }
    }

    // 🧹 FUNÇÃO PARA LIMPAR LINHA DO MEIO (CORRIGIDA)
    limparLinhaDoMeio() {
        const ligaHeader = document.querySelector('.liga-header');
        if (!ligaHeader) {
            console.log('ℹ️ Liga header não encontrado');
            return;
        }

        // Remover qualquer elemento que contenha "Liga:" no texto
        const elementos = ligaHeader.querySelectorAll('*');
        elementos.forEach(el => {
            const texto = el.textContent || el.innerText || '';
            if (texto.includes('Liga:') && 
                !el.id.includes('nomeLiga') && 
                !el.id.includes('quantidadeTimes') &&
                !el.classList.contains('liga-titulo') &&
                !el.classList.contains('liga-info')) {
                el.style.display = 'none';
                el.remove();
                console.log('🧹 Removido elemento com "Liga:":', texto.substring(0, 50));
            }
        });

        // Garantir que apenas 2 elementos filhos diretos estão visíveis
        const filhos = Array.from(ligaHeader.children);
        filhos.forEach((filho, index) => {
            const isNomeLiga = filho.id === 'nomeLiga' || filho.classList.contains('liga-titulo');
            const isQuantidade = filho.id === 'quantidadeTimes' || filho.classList.contains('liga-info');

            if (!isNomeLiga && !isQuantidade) {
                filho.style.display = 'none';
                console.log('🧹 Removendo elemento extra do header:', filho.textContent?.substring(0, 30));
            }
        });

        // Observador para remover elementos inseridos dinamicamente
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            const texto = node.textContent || '';
                            if (texto.includes('Liga:')) {
                                console.log('🧹 Removendo elemento dinâmico:', texto.substring(0, 30));
                                node.style.display = 'none';
                                node.remove();
                            }
                        }
                    });
                }
            });
        });

        observer.observe(ligaHeader, { childList: true, subtree: true });

        // Parar observação após 5 segundos
        setTimeout(() => {
            observer.disconnect();
            console.log('🧹 Observer do header desconectado após 5s');
        }, 5000);
    }
    }

    // 🔧 INTERCEPTAR FUNÇÃO DO RANKING.JS (FUNCIONALIDADE CRÍTICA RESTAURADA)
    interceptarRankingFunction() {
        // Aguardar função estar disponível
        const checkFunction = setInterval(() => {
            if (window.criarTabelaRanking) {
                clearInterval(checkFunction);

                console.log('🎯 Interceptando função criarTabelaRanking');

                // Backup da função original
                window.criarTabelaRankingOriginal = window.criarTabelaRanking;

                // Substituir com versão profissional
                window.criarTabelaRanking = function(participantes, ultimaRodada, ligaId) {
                    return `
                        <div class="ranking-header">
                            <div class="ranking-title">
                                <div class="ranking-icon">🏅</div>
                                <h2>Classificação Geral</h2>
                            </div>
                            <div class="ranking-subtitle">pontuação acumulada até a ${ultimaRodada}ª rodada</div>
                        </div>

                        <div class="ranking-controls">
                            <div class="ranking-info">
                                📈 ${participantes.length} participantes classificados
                            </div>
                            <div id="rankingGeralExportBtnContainer" class="export-btn-container"></div>
                        </div>

                        <table id="rankingGeralTable" class="ranking-table">
                            <thead>
                                <tr>
                                    <th style="width: 60px; text-align: center">Posição</th>
                                    <th style="width: 50px; text-align: center">❤️</th>
                                    <th style="min-width: 180px; text-align: left">Cartoleiro</th>
                                    <th style="min-width: 140px; text-align: left">Time</th>
                                    <th style="width: 100px; text-align: center">Pontos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${participantes.map((participante, index) => {
                                    const posicao = index + 1;
                                    const pontos = participante.pontos.toFixed(2);
                                    const trofeu = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : posicao + 'º';

                                    return `
                                    <tr style="${index < 3 ? 'background: rgba(255, 69, 0, 0.1); font-weight: 600;' : ''}">
                                        <td style="text-align:center; padding:12px 8px; font-weight: 700;">
                                            ${trofeu}
                                        </td>
                                        <td style="text-align:center; padding:8px;">
                                            ${participante.clube_id 
                                                ? `<img src="/escudos/${participante.clube_id}.png" 
                                                   alt="Time do Coração" 
                                                   style="width:22px; height:22px; border-radius:50%; border:1px solid #333;"
                                                   onerror="this.outerHTML='❤️'"/>` 
                                                : '❤️'}
                                        </td>
                                        <td style="text-align:left; padding:12px 8px; font-weight: 600; color: #ffffff;">
                                            ${participante.nome_cartola || 'N/D'}
                                        </td>
                                        <td style="text-align:left; padding:12px 8px; color: #e0e0e0;">
                                            ${participante.nome_time || 'N/D'}
                                        </td>
                                        <td style="text-align:center; padding:12px 8px;">
                                            <span style="background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%); 
                                                         color: white; padding: 4px 8px; border-radius: 6px; 
                                                         font-weight: 700; font-size: 12px; font-family: 'JetBrains Mono', monospace;">
                                                ${pontos}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                                }).join('')}
                            </tbody>
                        </table>
                    `;
                };

                console.log('✅ Função criarTabelaRanking interceptada e substituída');
            }
        }, 50);

        // Timeout de segurança
        setTimeout(() => {
            clearInterval(checkFunction);
        }, 3000);
    }

    // 🎨 APLICAR ESTILOS ESPECÍFICOS DO RANKING (FUNCIONALIDADE CRÍTICA RESTAURADA)
    applyRankingStyles() {
        // Observador para aplicar estilos quando conteúdo for injetado
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const rankingGeral = document.getElementById('ranking-geral');
                    if (rankingGeral) {
                        // Aplicar estilos profissionais
                        const titulo = rankingGeral.querySelector('h2');
                        if (titulo) {
                            titulo.style.color = '#ffffff';
                            titulo.style.fontWeight = '800';
                            titulo.style.textShadow = '0 2px 10px rgba(255, 255, 255, 0.3)';
                            titulo.style.fontFamily = 'Inter, -apple-system, sans-serif';
                        }

                        const subtitulo = rankingGeral.querySelector('[style*="color: #888"]');
                        if (subtitulo) {
                            subtitulo.style.color = '#a0a0a0';
                            subtitulo.style.fontWeight = '500';
                        }

                        // Aplicar estilos do botão
                        const exportBtn = rankingGeral.querySelector('#rankingGeralExportBtnContainer button');
                        if (exportBtn) {
                            exportBtn.style.background = 'linear-gradient(135deg, #ff4500 0%, #e8472b 100%)';
                            exportBtn.style.color = 'white';
                            exportBtn.style.border = '2px solid rgba(255, 69, 0, 0.3)';
                            exportBtn.style.fontWeight = '700';
                            exportBtn.style.textTransform = 'uppercase';
                            exportBtn.style.letterSpacing = '0.5px';
                        }

                        // Aplicar estilos às posições específicas
                        const rows = rankingGeral.querySelectorAll('tbody tr');
                        rows.forEach((row, index) => {
                            if (index === 0) {
                                row.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%)';
                                row.style.borderLeft = '4px solid #ffd700';
                            } else if (index === 1) {
                                row.style.background = 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(169, 169, 169, 0.1) 100%)';
                                row.style.borderLeft = '4px solid #c0c0c0';
                            } else if (index === 2) {
                                row.style.background = 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(184, 115, 51, 0.1) 100%)';
                                row.style.borderLeft = '4px solid #cd7f32';
                            }
                        });
                    }
                }
            });
        });

        const contentArea = document.getElementById('dynamic-content-area');
        if (contentArea) {
            observer.observe(contentArea, { childList: true, subtree: true });

            // Parar observação após 10 segundos
            setTimeout(() => observer.disconnect(), 10000);
        }
    }
    redirectToParciais() {
        const urlParams = new URLSearchParams(window.location.search);
        const ligaId = urlParams.get('id');
        if (ligaId) {
            window.location.href = `parciais.html?id=${ligaId}`;
        }
    }

    // 🌐 CONFIGURAR FUNÇÕES GLOBAIS (COMPATIBILIDADE)
    setupGlobalFunctions() {
        window.voltarParaCards = () => this.voltarParaCards();
        window.showParticipantes = () => this.showModule('participantes');
        window.executeAction = (action) => this.executeAction(action);

        // Manter compatibilidade com sistema existente
        window.orquestrador = this;
    }
}

// 🚀 INICIALIZAÇÃO AUTOMÁTICA
document.addEventListener('DOMContentLoaded', () => {
    window.detalheLigaOrquestrador = new DetalheLigaOrquestrador();
});
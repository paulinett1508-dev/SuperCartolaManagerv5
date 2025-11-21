
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

    inicializar() {
        console.log('[PARTICIPANTE-NAV] Inicializando navegação...');

        // Renderizar menu
        this.renderizarMenu();

        // Aguardar módulos carregarem antes de navegar
        this.aguardarModulosENavegar();
    }

    renderizarMenu() {
        const menuContainer = document.getElementById('menuLateral');
        if (!menuContainer) {
            console.error('[PARTICIPANTE-NAV] Container de menu não encontrado');
            return;
        }

        const menuItems = [
            { id: 'boas-vindas', label: '🏠 Início', icon: '🏠' },
            { id: 'extrato', label: '💰 Extrato', icon: '💰' },
            { id: 'ranking', label: '🏆 Ranking', icon: '🏆' },
            { id: 'rodadas', label: '📊 Rodadas', icon: '📊' },
            { id: 'top10', label: '⭐ Top 10', icon: '⭐' },
            { id: 'melhor-mes', label: '📅 Melhor Mês', icon: '📅' },
            { id: 'pontos-corridos', label: '📈 Pontos Corridos', icon: '📈' },
            { id: 'mata-mata', label: '⚔️ Mata-Mata', icon: '⚔️' },
            { id: 'artilheiro', label: '⚽ Artilheiro', icon: '⚽' },
            { id: 'luva-ouro', label: '🥅 Luva de Ouro', icon: '🥅' }
        ];

        menuContainer.innerHTML = menuItems.map(item => `
            <button class="nav-btn" data-module="${item.id}">
                ${item.label}
            </button>
        `).join('');

        // Adicionar event listeners
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modulo = e.currentTarget.dataset.module;
                this.navegarPara(modulo);
            });
        });

        console.log('[PARTICIPANTE-NAV] Menu renderizado com', menuItems.length, 'itens');
    }

    async aguardarModulosENavegar() {
        console.log('[PARTICIPANTE-NAV] Sistema de navegação pronto');
        // ✅ CARREGAR PÁGINA DE BOAS-VINDAS PRIMEIRO
        this.navegarPara('boas-vindas');
    }

    async navegarPara(modulo) {
        if (!this.modulos[modulo]) {
            console.error(`[PARTICIPANTE-NAV] Módulo ${modulo} não encontrado`);
            return;
        }

        console.log(`[PARTICIPANTE-NAV] Navegando para: ${modulo}`);

        // Atualizar botão ativo
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.module === modulo) {
                btn.classList.add('active');
            }
        });

        // Carregar conteúdo
        const container = document.getElementById('moduleContainer');
        
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

        // Página de boas-vindas não precisa de inicialização
        if (modulo === 'boas-vindas') {
            console.log('[PARTICIPANTE-NAV] Página de boas-vindas carregada');
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
                        await window.inicializarExtratoParticipante(participanteData);
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
                if (window.inicializarArtilheiroParticipante) {
                    await window.inicializarArtilheiroParticipante(ligaId, timeId);
                } else {
                    console.error('[PARTICIPANTE-NAV] Função inicializarArtilheiroParticipante não encontrada');
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

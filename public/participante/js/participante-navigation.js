// PARTICIPANTE NAVIGATION - Sistema de Navegação entre Módulos
console.log('[PARTICIPANTE-NAV] 🚀 Carregando sistema de navegação...');

class ParticipanteNavigation {
    constructor() {
        this.moduloAtual = 'boas-vindas';
        this.participanteData = null;
        this.modulosAtivos = {};
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
    }

    async inicializar() {
        console.log('[PARTICIPANTE-NAV] Inicializando navegação...');

        // Aguardar dados do participante
        await this.aguardarDadosParticipante();

        // Buscar módulos ativos da liga
        await this.carregarModulosAtivos();

        // Renderizar menu dinâmico
        this.renderizarMenuDinamico();

        // Configurar event listeners
        this.configurarEventListeners();

        // Navegar para módulo inicial
        await this.navegarPara('boas-vindas');
    }

    async aguardarDadosParticipante() {
        console.log('[PARTICIPANTE-NAV] Aguardando dados do participante...');

        // Tentar obter dados da sessão
        let tentativas = 0;
        const maxTentativas = 10;

        while (!this.participanteData && tentativas < maxTentativas) {
            try {
                const response = await fetch('/api/participante/auth/session', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated && data.participante) {
                        this.participanteData = {
                            timeId: data.participante.timeId,
                            ligaId: data.participante.ligaId,
                            nomeCartola: data.participante.participante?.nome_cartola || 'Participante',
                            nomeTime: data.participante.participante?.nome_time || 'Meu Time'
                        };
                        console.log('[PARTICIPANTE-NAV] ✅ Dados obtidos:', this.participanteData);
                        return;
                    }
                }
            } catch (error) {
                console.warn('[PARTICIPANTE-NAV] Tentativa', tentativas + 1, 'falhou:', error);
            }

            tentativas++;
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!this.participanteData) {
            console.error('[PARTICIPANTE-NAV] ❌ Não foi possível obter dados do participante');
            window.location.href = '/participante-login.html';
        }
    }

    async carregarModulosAtivos() {
        console.log('[PARTICIPANTE-NAV] 🔍 Buscando configuração de módulos...');

        try {
            const response = await fetch(`/api/ligas/${this.participanteData.ligaId}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar configuração da liga');
            }

            const liga = await response.json();
            this.modulosAtivos = liga.configuracao_modulos || {};

            console.log('[PARTICIPANTE-NAV] 📋 Módulos ativos:', this.modulosAtivos);
        } catch (error) {
            console.error('[PARTICIPANTE-NAV] ❌ Erro ao buscar módulos:', error);
            // Módulos padrão se falhar
            this.modulosAtivos = {
                boas_vindas: true,
                extrato: true,
                ranking: true,
                rodadas: true
            };
        }
    }

    renderizarMenuDinamico() {
        const bottomNav = document.querySelector('.bottom-nav-modern');
        if (!bottomNav) {
            console.error('[PARTICIPANTE-NAV] ❌ Bottom nav não encontrado');
            return;
        }

        // Definir módulos base (sempre visíveis)
        const modulosBase = [
            { id: 'boas-vindas', icon: '🏠', label: 'Início', config: 'boas_vindas' },
            { id: 'extrato', icon: '💰', label: 'Extrato', config: 'extrato' },
            { id: 'ranking', icon: '📊', label: 'Ranking', config: 'ranking' },
            { id: 'rodadas', icon: '🎯', label: 'Rodadas', config: 'rodadas' }
        ];

        // Módulos condicionais (dependem da configuração)
        const modulosCondicionais = [
            { id: 'top10', icon: '🔟', label: 'Top 10', config: 'top10' },
            { id: 'melhor-mes', icon: '📅', label: 'Melhor Mês', config: 'melhor_mes' },
            { id: 'pontos-corridos', icon: '🔄', label: 'P. Corridos', config: 'pontos_corridos' },
            { id: 'mata-mata', icon: '⚔️', label: 'Mata-Mata', config: 'mata_mata' },
            { id: 'artilheiro', icon: '⚽', label: 'Artilheiro', config: 'artilheiro' },
            { id: 'luva-ouro', icon: '🧤', label: 'Luva Ouro', config: 'luva_ouro' }
        ];

        // Filtrar módulos ativos
        const todosModulos = [
            ...modulosBase.filter(m => this.verificarModuloAtivo(m.config)),
            ...modulosCondicionais.filter(m => this.verificarModuloAtivo(m.config))
        ];

        // Renderizar botões
        bottomNav.innerHTML = todosModulos.map(modulo => `
            <button class="nav-item-modern ${modulo.id === 'boas-vindas' ? 'active' : ''}"
                    data-module="${modulo.id}">
                <span class="nav-icon-modern">${modulo.icon}</span>
                <span class="nav-label-modern">${modulo.label}</span>
            </button>
        `).join('');

        console.log('[PARTICIPANTE-NAV] ✅ Menu renderizado com', todosModulos.length, 'módulos');
    }

    verificarModuloAtivo(configKey) {
        // Módulos base sempre ativos
        if (['boas_vindas', 'extrato', 'ranking', 'rodadas'].includes(configKey)) {
            return true;
        }

        // Verificar configuração da liga
        return this.modulosAtivos[configKey] === true;
    }

    configurarEventListeners() {
        const navButtons = document.querySelectorAll('.nav-item-modern');

        navButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const modulo = button.dataset.module;
                console.log('[PARTICIPANTE-NAV] 🎯 Clique no módulo:', modulo);

                // Remover active de todos
                navButtons.forEach(btn => btn.classList.remove('active'));

                // Adicionar active no clicado
                button.classList.add('active');

                // Navegar
                await this.navegarPara(modulo);
            });
        });

        console.log('[PARTICIPANTE-NAV] ✅ Event listeners configurados');
    }

    async navegarPara(moduloId) {
        console.log(`[PARTICIPANTE-NAV] 🧭 Navegando para: ${moduloId}`);

        const container = document.getElementById('moduleContainer');
        if (!container) {
            console.error('[PARTICIPANTE-NAV] ❌ Container não encontrado');
            return;
        }

        // Mostrar loading
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="width: 50px; height: 50px; border: 4px solid rgba(255, 69, 0, 0.1); border-top: 4px solid #ff4500; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 20px; color: #999;">Carregando ${moduloId}...</p>
            </div>
        `;

        try {
            // Carregar HTML do módulo
            const htmlPath = this.modulos[moduloId];
            if (!htmlPath) {
                throw new Error(`Módulo ${moduloId} não encontrado`);
            }

            const response = await fetch(htmlPath);
            if (!response.ok) {
                throw new Error(`Erro ao carregar HTML: ${response.statusText}`);
            }

            const html = await response.text();
            container.innerHTML = html;

            // Carregar e executar JS do módulo
            await this.carregarModuloJS(moduloId);

            this.moduloAtual = moduloId;
            console.log(`[PARTICIPANTE-NAV] ✅ Módulo ${moduloId} carregado`);

        } catch (error) {
            console.error(`[PARTICIPANTE-NAV] ❌ Erro ao carregar ${moduloId}:`, error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar Módulo</h3>
                    <p style="color: #999;">${error.message}</p>
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
                const moduloJS = await import(modulosPaths[modulo]);

                // Tentar executar função de inicialização se existir
                const initFunctionName = `inicializar${modulo.charAt(0).toUpperCase() + modulo.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Participante`;

                if (moduloJS[initFunctionName]) {
                    await moduloJS[initFunctionName](this.participanteData);
                    console.log(`[PARTICIPANTE-NAV] ✅ ${initFunctionName} executado`);
                } else {
                    console.log(`[PARTICIPANTE-NAV] ℹ️Função de inicialização não encontrada para ${modulo}`);
                }
            } catch (error) {
                console.error(`[PARTICIPANTE-NAV] ❌ Erro ao importar ${modulo}:`, error);
                throw error;
            }
        }
    }
}

// Instância global
const participanteNav = new ParticipanteNavigation();

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await participanteNav.inicializar();
    });
} else {
    participanteNav.inicializar();
}

// Exportar para uso global
window.participanteNav = participanteNav;

console.log('[PARTICIPANTE-NAV] ✅ Sistema de navegação carregado');
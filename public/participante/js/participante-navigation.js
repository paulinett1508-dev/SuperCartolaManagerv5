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

        // Feedback visual melhorado
        const nomeModulo = this.obterNomeModulo(moduloId);
        container.innerHTML = `
            <div class="loading-state" style="text-align: center; padding: 80px 20px; min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="position: relative; width: 80px; height: 80px; margin-bottom: 24px;">
                    <div style="position: absolute; width: 80px; height: 80px; border: 4px solid rgba(255, 69, 0, 0.1); border-top: 4px solid #ff4500; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div style="position: absolute; width: 60px; height: 60px; top: 10px; left: 10px; border: 3px solid rgba(255, 69, 0, 0.05); border-bottom: 3px solid #ff4500; border-radius: 50%; animation: spin 1.5s linear infinite reverse;"></div>
                </div>
                <h3 style="color: #333; margin-bottom: 8px; font-weight: 600;">Carregando ${nomeModulo}</h3>
                <p style="color: #999; font-size: 14px;">Aguarde um momento...</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;

        try {
            // Carregar HTML do módulo
            const htmlPath = this.modulos[moduloId];
            if (!htmlPath) {
                throw new Error(`Módulo "${moduloId}" não foi encontrado no sistema`);
            }

            const response = await fetch(htmlPath);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`O módulo "${nomeModulo}" ainda não está disponível`);
                }
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            container.innerHTML = html;

            // Carregar e executar JS do módulo
            await this.carregarModuloJS(moduloId);

            this.moduloAtual = moduloId;
            console.log(`[PARTICIPANTE-NAV] ✅ Módulo ${moduloId} carregado com sucesso`);

        } catch (error) {
            console.error(`[PARTICIPANTE-NAV] ❌ Erro ao carregar ${moduloId}:`, error);
            
            // Mensagem de erro mais amigável
            const mensagemErro = this.obterMensagemErroAmigavel(error);
            
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; max-width: 500px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)); border-radius: 16px; padding: 40px; border: 2px solid rgba(239, 68, 68, 0.2);">
                        <div style="font-size: 64px; margin-bottom: 20px; filter: drop-shadow(0 4px 8px rgba(239, 68, 68, 0.2));">⚠️</div>
                        <h3 style="color: #dc2626; margin-bottom: 16px; font-size: 20px; font-weight: 600;">Ops! Algo deu errado</h3>
                        <p style="color: #666; margin-bottom: 24px; line-height: 1.6;">${mensagemErro}</p>
                        <button onclick="window.participanteNav.navegarPara('boas-vindas')" 
                                style="background: #ff4500; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            `;
        }
    }

    obterNomeModulo(moduloId) {
        const nomes = {
            'boas-vindas': 'Boas-Vindas',
            'extrato': 'Extrato Financeiro',
            'ranking': 'Ranking Geral',
            'rodadas': 'Rodadas',
            'top10': 'Top 10',
            'melhor-mes': 'Melhor Mês',
            'pontos-corridos': 'Pontos Corridos',
            'mata-mata': 'Mata-Mata',
            'artilheiro': 'Artilheiro Campeão',
            'luva-ouro': 'Luva de Ouro'
        };
        return nomes[moduloId] || moduloId;
    }

    obterMensagemErroAmigavel(error) {
        const mensagem = error.message.toLowerCase();
        
        if (mensagem.includes('não foi encontrado') || mensagem.includes('404')) {
            return 'Este módulo ainda não está disponível. Entre em contato com o administrador da liga.';
        }
        
        if (mensagem.includes('network') || mensagem.includes('fetch')) {
            return 'Falha na conexão. Verifique sua internet e tente novamente.';
        }
        
        if (mensagem.includes('timeout')) {
            return 'A requisição demorou muito. Tente novamente em alguns instantes.';
        }
        
        return error.message || 'Ocorreu um erro inesperado. Tente novamente.';
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
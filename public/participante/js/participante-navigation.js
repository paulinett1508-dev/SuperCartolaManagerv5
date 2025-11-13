
// PARTICIPANTE NAVIGATION - Sistema de Navegação

console.log('[PARTICIPANTE-NAV] Carregando sistema de navegação...');

class ParticipanteNavigation {
    constructor() {
        this.moduloAtual = 'extrato';
        this.modulos = {
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

        // Event listeners nos botões
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modulo = e.target.dataset.module;
                this.navegarPara(modulo);
            });
        });

        // Aguardar módulos carregarem antes de navegar
        this.aguardarModulosENavegar();
    }

    async aguardarModulosENavegar() {
        console.log('[PARTICIPANTE-NAV] Sistema de navegação pronto');
        // ✅ NAVEGAR DIRETO - HTML será carregado primeiro
        this.navegarPara('extrato');
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
                }
                break;
            case 'rodadas':
                if (window.inicializarRodadasParticipante) {
                    await window.inicializarRodadasParticipante(ligaId, timeId);
                }
                break;
            // ... outros módulos
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

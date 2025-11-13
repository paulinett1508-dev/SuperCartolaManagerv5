
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

        // Aguardar um pouco antes de carregar módulo inicial para garantir que scripts externos carregaram
        setTimeout(() => {
            this.navegarPara('extrato');
        }, 200);
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
            const response = await fetch(this.modulos[modulo]);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            container.innerHTML = html;

            // Inicializar módulo específico
            await this.inicializarModulo(modulo);

            this.moduloAtual = modulo;

        } catch (error) {
            console.error(`[PARTICIPANTE-NAV] Erro ao carregar ${modulo}:`, error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <h3>Erro ao Carregar Módulo</h3>
                    <p>${error.message}</p>
                    <button onclick="participanteNav.navegarPara('extrato')" class="btn-voltar">
                        Voltar ao Extrato
                    </button>
                </div>
            `;
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

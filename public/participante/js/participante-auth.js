
// PARTICIPANTE AUTH - Sistema de Autenticação

console.log('[PARTICIPANTE-AUTH] Carregando sistema de autenticação...');

class ParticipanteAuth {
    constructor() {
        this.participante = null;
        this.ligaId = null;
        this.timeId = null;
        this.verificandoAuth = false; // Flag para evitar múltiplas verificações
    }

    async verificarAutenticacao() {
        // Evitar múltiplas verificações simultâneas
        if (this.verificandoAuth) {
            console.log('[PARTICIPANTE-AUTH] Verificação já em andamento...');
            return false;
        }

        this.verificandoAuth = true;
        console.log('[PARTICIPANTE-AUTH] Verificando autenticação...');

        try {
            // Verificar sessão no servidor
            const response = await fetch('/api/participante/auth/session', {
                credentials: 'include'
            });

            if (!response.ok) {
                console.log('[PARTICIPANTE-AUTH] Sem sessão válida no servidor');
                this.verificandoAuth = false;
                this.redirecionarLogin();
                return false;
            }

            const data = await response.json();

            if (!data.authenticated || !data.participante) {
                console.log('[PARTICIPANTE-AUTH] Sessão inválida');
                this.verificandoAuth = false;
                this.redirecionarLogin();
                return false;
            }

            // Sessão válida - configurar dados
            const { participante } = data;
            this.ligaId = participante.ligaId;
            this.timeId = participante.timeId;
            this.participante = participante;

            // Atualizar UI
            this.atualizarHeader();

            console.log('[PARTICIPANTE-AUTH] ✅ Autenticação válida');
            this.verificandoAuth = false;
            return true;

        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] Erro ao verificar auth:', error);
            this.verificandoAuth = false;
            this.redirecionarLogin();
            return false;
        }
    }

    async atualizarHeader() {
        if (!this.participante) return;

        const nomeTime = document.getElementById('nomeTime');
        const nomeCartoleiro = document.getElementById('nomeCartoleiro');
        const escudo = document.getElementById('escudoParticipante');

        try {
            // Buscar dados atualizados do time
            const timeResponse = await fetch(`/api/times/${this.timeId}`, {
                credentials: 'include'
            });

            if (timeResponse.ok) {
                const timeData = await timeResponse.json();
                
                if (nomeTime) nomeTime.textContent = timeData.nome || 'Meu Time';
                if (nomeCartoleiro) nomeCartoleiro.textContent = timeData.nome_cartola || 'Cartoleiro';

                if (escudo && timeData.clube_id) {
                    escudo.src = `/escudos/${timeData.clube_id}.png`;
                    escudo.onerror = () => escudo.src = '/escudos/placeholder.png';
                }

                // Atualizar dados locais
                this.participante.time = timeData;
            }
        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] Erro ao atualizar header:', error);
            
            // Fallback para dados da sessão
            if (nomeTime) nomeTime.textContent = this.participante.participante?.nome_time || 'Meu Time';
            if (nomeCartoleiro) nomeCartoleiro.textContent = this.participante.participante?.nome_cartola || 'Cartoleiro';
            
            if (escudo && this.participante.participante?.clube_id) {
                escudo.src = `/escudos/${this.participante.participante.clube_id}.png`;
                escudo.onerror = () => escudo.src = '/escudos/placeholder.png';
            }
        }
    }

    logout() {
        this.limpar();
        this.redirecionarLogin();
    }

    redirecionarLogin() {
        // Evitar loop: só redirecionar se NÃO estiver na página de login
        if (window.location.pathname !== '/participante-login.html') {
            console.log('[PARTICIPANTE-AUTH] Redirecionando para login...');
            window.location.href = '/participante-login.html';
        }
    }

    estaAutenticado() {
        return this.participante !== null;
    }

    limpar() {
        this.participante = null;
        this.ligaId = null;
        this.timeId = null;
    }

    getDados() {
        return {
            participante: this.participante,
            ligaId: this.ligaId,
            timeId: this.timeId
        };
    }
}

// Instância global
const participanteAuth = new ParticipanteAuth();

// Inicializar quando a página estiver carregada
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await participanteAuth.verificarAutenticacao();
    });
} else {
    // DOM já carregado
    participanteAuth.verificarAutenticacao();
}

// Função de logout global
function logout() {
    participanteAuth.limpar();
    
    // Fazer logout no servidor
    fetch('/api/participante/auth/logout', {
        method: 'POST',
        credentials: 'include'
    }).finally(() => {
        window.location.href = '/participante-login.html';
    });
}

console.log('[PARTICIPANTE-AUTH] ✅ Sistema carregado');

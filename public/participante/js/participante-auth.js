// PARTICIPANTE AUTH - Sistema de Autenticação

console.log('[PARTICIPANTE-AUTH] Carregando sistema de autenticação...');

class ParticipanteAuth {
    constructor() {
        this.participante = null;
        this.ligaId = null;
        this.timeId = null;
    }

    async verificarAutenticacao() {
        console.log('[PARTICIPANTE-AUTH] Verificando autenticação...');

        const authData = localStorage.getItem('participante_auth');

        if (!authData) {
            console.log('[PARTICIPANTE-AUTH] Sem autenticação, redirecionando...');
            this.redirecionarLogin();
            return false;
        }

        try {
            const { ligaId, timeId, timestamp } = JSON.parse(authData);

            // Verificar expiração (24 horas)
            const agora = Date.now();
            const horasDecorridas = (agora - timestamp) / (1000 * 60 * 60);

            if (horasDecorridas > 24) {
                console.log('[PARTICIPANTE-AUTH] Sessão expirada');
                this.logout();
                return false;
            }

            this.ligaId = ligaId;
            this.timeId = timeId;

            // Carregar dados do participante
            await this.carregarDadosParticipante();

            console.log('[PARTICIPANTE-AUTH] ✅ Autenticação válida');
            return true;

        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] Erro ao verificar auth:', error);
            this.logout();
            return false;
        }
    }

    async carregarDadosParticipante() {
        try {
            // Buscar dados do time
            const response = await fetch(`/api/times/${this.timeId}`);

            if (!response.ok) {
                throw new Error('Erro ao buscar dados do time');
            }

            const timeData = await response.json();
            this.participante = timeData;

            // Atualizar UI
            this.atualizarHeader();

        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] Erro ao carregar dados:', error);
        }
    }

    atualizarHeader() {
        if (!this.participante) return;

        const nomeTime = document.getElementById('nomeTime');
        const nomeCartoleiro = document.getElementById('nomeCartoleiro');
        const escudo = document.getElementById('escudoParticipante');

        if (nomeTime) nomeTime.textContent = this.participante.nome || 'Meu Time';
        if (nomeCartoleiro) nomeCartoleiro.textContent = this.participante.nome_cartola || 'Cartoleiro';

        if (escudo && this.participante.clube_id) {
            escudo.src = `/escudos/${this.participante.clube_id}.png`;
            escudo.onerror = () => escudo.src = '/escudos/placeholder.png';
        }
    }

    logout() {
        localStorage.removeItem('participante_auth');
        this.redirecionarLogin();
    }

    redirecionarLogin() {
        // O ajuste aqui é para evitar redirecionar de volta para a página de login se já estivermos nela.
        if (window.location.pathname !== '/participante-login.html') {
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
        localStorage.removeItem('participante_auth');
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

// Verificar autenticação ao carregar
// Se não estiver autenticado, redirecionar para login
if (!participanteAuth.estaAutenticado()) {
    if (window.location.pathname !== '/participante-login.html') {
        window.location.href = '/participante-login.html';
    }
    // return; // Comentado pois a checagem já está na classe redirecionarLogin
} else {
    // Carregar dados se já estiver autenticado
    participanteAuth.verificarAutenticacao();
}


// Função de logout global
function logout() {
    participanteAuth.limpar();
    window.location.href = '/participante-login.html';
}

console.log('[PARTICIPANTE-AUTH] ✅ Sistema carregado');
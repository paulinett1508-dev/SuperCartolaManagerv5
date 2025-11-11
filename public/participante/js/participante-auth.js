
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
        const nomeCartolaText = document.getElementById('nomeCartolaText');
        const escudoCoracao = document.getElementById('escudoCoracao');
        const escudoTime = document.getElementById('escudoTime');
        const posicaoQuick = document.getElementById('posicaoQuick');
        const patrimonioQuick = document.getElementById('patrimonioQuick');
        const pontosQuick = document.getElementById('pontosQuick');

        try {
            // Buscar dados atualizados do time
            const timeResponse = await fetch(`/api/times/${this.timeId}`, {
                credentials: 'include'
            });

            if (timeResponse.ok) {
                const timeData = await timeResponse.json();
                
                // Atualizar nome do time e cartoleiro
                if (nomeTime) nomeTime.textContent = timeData.nome || 'Meu Time';
                if (nomeCartolaText) nomeCartolaText.textContent = timeData.nome_cartola || 'Cartoleiro';

                // Escudo do clube (coração)
                if (escudoCoracao && timeData.clube_id) {
                    escudoCoracao.src = `/escudos/${timeData.clube_id}.png`;
                    escudoCoracao.onerror = () => escudoCoracao.src = '/escudos/placeholder.png';
                }

                // Escudo do time (foto do escudo do Cartola)
                if (escudoTime) {
                    if (timeData.url_escudo_png) {
                        escudoTime.src = timeData.url_escudo_png;
                        escudoTime.onerror = () => {
                            // Fallback para escudo do clube se imagem do Cartola falhar
                            if (timeData.clube_id) {
                                escudoTime.src = `/escudos/${timeData.clube_id}.png`;
                            } else {
                                escudoTime.src = '/escudos/placeholder.png';
                            }
                        };
                    } else if (timeData.clube_id) {
                        escudoTime.src = `/escudos/${timeData.clube_id}.png`;
                        escudoTime.onerror = () => escudoTime.src = '/escudos/placeholder.png';
                    }
                }

                // Buscar dados da liga para estatísticas rápidas
                const ligaResponse = await fetch(`/api/ligas/${this.ligaId}`, {
                    credentials: 'include'
                });

                if (ligaResponse.ok) {
                    const ligaData = await ligaResponse.json();
                    const participante = ligaData.participantes?.find(p => 
                        String(p.time_id) === String(this.timeId)
                    );

                    if (participante) {
                        // Atualizar estatísticas rápidas
                        if (posicaoQuick) {
                            posicaoQuick.textContent = `${participante.posicao || '--'}º`;
                        }
                        if (patrimonioQuick) {
                            const patrimonio = timeData.patrimonio || 0;
                            patrimonioQuick.textContent = `C$ ${patrimonio.toFixed(2)}`;
                        }
                        if (pontosQuick) {
                            const pontos = participante.pontos || participante.pontuacao || 0;
                            pontosQuick.textContent = `${pontos.toFixed(2)} pts`;
                        }
                    }
                }

                // Atualizar dados locais
                this.participante.time = timeData;
            }
        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] Erro ao atualizar header:', error);
            
            // Fallback para dados da sessão
            if (nomeTime) nomeTime.textContent = this.participante.participante?.nome_time || 'Meu Time';
            if (nomeCartolaText) nomeCartolaText.textContent = this.participante.participante?.nome_cartola || 'Cartoleiro';
            
            if (escudoCoracao && this.participante.participante?.clube_id) {
                escudoCoracao.src = `/escudos/${this.participante.participante.clube_id}.png`;
                escudoCoracao.onerror = () => escudoCoracao.src = '/escudos/placeholder.png';
            }

            if (escudoTime && this.participante.participante?.clube_id) {
                escudoTime.src = `/escudos/${this.participante.participante.clube_id}.png`;
                escudoTime.onerror = () => escudoTime.src = '/escudos/placeholder.png';
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

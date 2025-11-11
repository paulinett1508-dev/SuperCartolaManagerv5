
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

        console.log('[PARTICIPANTE-AUTH] Atualizando header com dados:', this.participante);

        try {
            // 1. Buscar dados reais do time da API
            const timeResponse = await fetch(`/api/times/${this.timeId}`, {
                credentials: 'include'
            });

            let timeData = null;
            let patrimonio = 0;

            if (timeResponse.ok) {
                timeData = await timeResponse.json();
                patrimonio = timeData.patrimonio || 0;
                console.log('[PARTICIPANTE-AUTH] Dados do time carregados:', {
                    nome: timeData.nome_time,
                    cartola: timeData.nome_cartoleiro,
                    clube: timeData.clube_id
                });
            }

            // 2. Buscar dados da liga para obter posição e pontos
            const ligaResponse = await fetch(`/api/ligas/${this.ligaId}`, {
                credentials: 'include'
            });

            if (!ligaResponse.ok) {
                throw new Error('Erro ao buscar dados da liga');
            }

            const ligaData = await ligaResponse.json();
            let participanteData = ligaData.participantes?.find(p => 
                String(p.time_id) === String(this.timeId)
            );

            console.log('[PARTICIPANTE-AUTH] Dados do participante na liga:', participanteData);

            // Priorizar dados reais do time sobre dados da liga (que podem estar desatualizados)
            const nomeTimeTexto = timeData?.nome_time || participanteData?.nome_time || 'Meu Time';
            const nomeCartolaTexto = timeData?.nome_cartoleiro || participanteData?.nome_cartola || 'Cartoleiro';
            const clubeId = timeData?.clube_id || participanteData?.clube_id || null;
            const fotoTime = timeData?.url_escudo_png || participanteData?.foto_time || null;

            // Atualizar nome do time e cartoleiro
            if (nomeTime) {
                nomeTime.textContent = nomeTimeTexto;
            }
            if (nomeCartolaText) {
                nomeCartolaText.textContent = nomeCartolaTexto;
            }

            // Escudo do clube (coração)
            if (escudoCoracao) {
                if (clubeId) {
                    escudoCoracao.src = `/escudos/${clubeId}.png`;
                    escudoCoracao.onerror = () => escudoCoracao.src = '/escudos/placeholder.png';
                } else {
                    escudoCoracao.src = '/escudos/placeholder.png';
                }
            }

            // Escudo do time (foto do escudo do Cartola)
            if (escudoTime) {
                if (fotoTime) {
                    escudoTime.src = fotoTime;
                    escudoTime.onerror = () => {
                        // Fallback para escudo do clube
                        if (clubeId) {
                            escudoTime.src = `/escudos/${clubeId}.png`;
                            escudoTime.onerror = () => escudoTime.src = '/escudos/placeholder.png';
                        } else {
                            escudoTime.src = '/escudos/placeholder.png';
                        }
                    };
                } else if (clubeId) {
                    escudoTime.src = `/escudos/${clubeId}.png`;
                    escudoTime.onerror = () => escudoTime.src = '/escudos/placeholder.png';
                } else {
                    escudoTime.src = '/escudos/placeholder.png';
                }
            }

            // Atualizar estatísticas rápidas
            if (posicaoQuick) {
                const posicao = participanteData?.posicao || '--';
                posicaoQuick.textContent = `${posicao}º`;
            }
            if (patrimonioQuick) {
                patrimonioQuick.textContent = `C$ ${patrimonio.toFixed(2)}`;
            }
            if (pontosQuick) {
                const pontos = participanteData?.pontos || participanteData?.pontuacao || 0;
                pontosQuick.textContent = `${pontos.toFixed(2)} pts`;
            }

                console.log('[PARTICIPANTE-AUTH] ✅ Header atualizado com sucesso:', {
                nome: nomeTimeTexto,
                cartola: nomeCartolaTexto,
                clube: clubeId,
                patrimonio: patrimonio
            });

        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] Erro ao atualizar header:', error);
            
            // Fallback para dados básicos
            if (nomeTime) nomeTime.textContent = 'Meu Time';
            if (nomeCartolaText) nomeCartolaText.textContent = 'Cartoleiro';
            if (escudoCoracao) escudoCoracao.src = '/escudos/placeholder.png';
            if (escudoTime) escudoTime.src = '/escudos/placeholder.png';
            if (posicaoQuick) posicaoQuick.textContent = '--º';
            if (patrimonioQuick) patrimonioQuick.textContent = 'C$ 0,00';
            if (pontosQuick) pontosQuick.textContent = '0,00 pts';
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

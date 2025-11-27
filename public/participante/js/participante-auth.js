// PARTICIPANTE AUTH - Sistema de Autenticação

console.log('[PARTICIPANTE-AUTH] Carregando sistema de autenticação...');

class ParticipanteAuth {
    constructor() {
        this.participante = null;
        this.ligaId = null;
        this.timeId = null;
        this.verificandoAuth = false;
        this.sessionCache = null;
        this.sessionCacheTime = null;
        this.CACHE_DURATION = 60000; // 1 minuto
    }

    async verificarAutenticacao() {
        // Evitar múltiplas verificações simultâneas
        if (this.verificandoAuth) {
            console.log('[PARTICIPANTE-AUTH] Verificação já em andamento...');
            return false;
        }

        // Usar cache se disponível e válido
        const now = Date.now();
        if (this.sessionCache && this.sessionCacheTime && (now - this.sessionCacheTime) < this.CACHE_DURATION) {
            console.log('[PARTICIPANTE-AUTH] 💾 Usando sessão em cache');
            const { participante } = this.sessionCache;
            this.ligaId = participante.ligaId;
            this.timeId = participante.timeId;
            this.participante = participante;

            // Executar operações assíncronas
            await Promise.all([
                this.atualizarHeader(),
                this.verificarMultiplasLigas()
            ]);

            return true;
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

            // Armazenar em cache
            this.sessionCache = data;
            this.sessionCacheTime = Date.now();

            // Atualizar UI e verificar múltiplas ligas
            await Promise.all([
                this.atualizarHeader(),
                this.verificarMultiplasLigas()
            ]);

            console.log('[PARTICIPANTE-AUTH] ✅ Autenticação válida (cache atualizado)');
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

        // Evitar múltiplas atualizações simultâneas
        if (this._atualizandoHeader) return;
        this._atualizandoHeader = true;

        const nomeTimeEl = document.getElementById('nomeTime');
        const nomeCartolaTextEl = document.getElementById('nomeCartolaText');
        const escudoCoracao = document.getElementById('escudoCoracao');
        const escudoTimeEl = document.getElementById('escudoTime');
        const headerLogoutButton = document.getElementById('headerLogoutButton');

        console.log('[PARTICIPANTE-AUTH] Atualizando header com dados da sessão:', this.participante);

        try {
            // ✅ PRIORIZAR DADOS DA SESSÃO (já validados no backend)
            let nomeTimeTexto = this.participante.participante?.nome_time || 'Meu Time';
            let nomeCartolaTexto = this.participante.participante?.nome_cartola || 'Cartoleiro';
            let clubeId = this.participante.participante?.clube_id || null;
            let fotoTime = this.participante.participante?.foto_time || null;

            // Buscar dados atualizados do time APENAS se necessário
            const timeResponse = await fetch(`/api/times/${this.timeId}`, {
                credentials: 'include'
            });

            let timeData = {}; // Inicializa timeData como um objeto vazio
            if (timeResponse.ok) {
                timeData = await timeResponse.json();

                // Atualizar SOMENTE se dados da sessão estiverem vazios ou com valores padrão
                if (nomeTimeTexto === 'Meu Time') {
                    nomeTimeTexto = timeData.nome_time || timeData.nome || nomeTimeTexto;
                }
                if (nomeCartolaTexto === 'Cartoleiro') {
                    nomeCartolaTexto = timeData.nome_cartola || timeData.nome_cartoleiro || nomeCartolaTexto;
                }
                if (!clubeId) {
                    clubeId = timeData.clube_id;
                }
                if (!fotoTime) {
                    fotoTime = timeData.url_escudo_png || timeData.foto_time;
                }

                console.log('[PARTICIPANTE-AUTH] ✅ Dados do time mesclados:', {
                    nome: nomeTimeTexto,
                    cartola: nomeCartolaTexto,
                    clube: clubeId
                });
            } else {
                console.warn('[PARTICIPANTE-AUTH] ⚠️ Não foi possível buscar dados atualizados do time (ID:', this.timeId, ')');
            }

            // 2. Buscar dados da liga para obter posição e pontos
            const ligaResponse = await fetch(`/api/ligas/${this.ligaId}`, {
                credentials: 'include'
            });

            if (!ligaResponse.ok) {
                throw new Error(`Erro ao buscar dados da liga ${this.ligaId} (status: ${ligaResponse.status})`);
            }

            const ligaData = await ligaResponse.json();
            let participanteDataNaLiga = ligaData.participantes?.find(p => 
                String(p.time_id) === String(this.timeId)
            );

            console.log('[PARTICIPANTE-AUTH] Dados do participante na liga:', participanteDataNaLiga);

            // Priorizar dados reais do time sobre dados da liga (que podem estar desatualizados)
            const nomeTimeTextoFinal = timeData?.nome_time || participanteDataNaLiga?.nome_time || nomeTimeTexto || 'Meu Time';
            const nomeCartolaTextoFinal = timeData?.nome_cartoleiro || participanteDataNaLiga?.nome_cartola || nomeCartolaTexto || 'Cartoleiro';
            const clubeIdFinal = timeData?.clube_id || participanteDataNaLiga?.clube_id || clubeId || null;
            const fotoTimeFinal = timeData?.url_escudo_png || timeData?.foto_time || participanteDataNaLiga?.foto_time || fotoTime || null;
            const patrimonio = participanteDataNaLiga?.patrimonio; // Captura o patrimônio

            // Atualizar nome do time e cartoleiro
            if (nomeTimeEl) {
                nomeTimeEl.textContent = nomeTimeTextoFinal;
            }
            if (nomeCartolaTextEl) {
                nomeCartolaTextEl.textContent = nomeCartolaTextoFinal;
            }

            // Escudo do clube (coração)
            if (escudoCoracao) {
                if (clubeIdFinal) {
                    escudoCoracao.src = `/escudos/${clubeIdFinal}.png`;
                    escudoCoracao.onerror = () => escudoCoracao.src = '/escudos/placeholder.png';
                } else {
                    escudoCoracao.src = '/escudos/placeholder.png';
                }
            }

            // Escudo do time (foto do escudo do Cartola)
            if (escudoTimeEl) {
                if (fotoTimeFinal) {
                    escudoTimeEl.src = fotoTimeFinal;
                    escudoTimeEl.onerror = () => {
                        // Fallback para escudo do clube
                        if (clubeIdFinal) {
                            escudoTimeEl.src = `/escudos/${clubeIdFinal}.png`;
                            escudoTimeEl.onerror = () => escudoTimeEl.src = '/escudos/placeholder.png';
                        } else {
                            escudoTimeEl.src = '/escudos/placeholder.png';
                        }
                    };
                } else if (clubeIdFinal) {
                    escudoTimeEl.src = `/escudos/${clubeIdFinal}.png`;
                    escudoTimeEl.onerror = () => escudoTimeEl.src = '/escudos/placeholder.png';
                } else {
                    escudoTimeEl.src = '/escudos/placeholder.png';
                }
            }

            // Mostrar ou ocultar o botão de logout
            if (headerLogoutButton) {
                headerLogoutButton.style.display = this.estaAutenticado() ? 'block' : 'none';
            }

            console.log('[PARTICIPANTE-AUTH] ✅ Header atualizado com sucesso:', {
                nome: nomeTimeTextoFinal,
                cartola: nomeCartolaTextoFinal,
                clube: clubeIdFinal,
                patrimonio: patrimonio // Inclui patrimônio no log
            });

            this._atualizandoHeader = false;

        } catch (error) {
            this._atualizandoHeader = false;
            console.error('[PARTICIPANTE-AUTH] Erro ao atualizar header:', error);

            // Fallback para dados básicos
            if (nomeTimeEl) nomeTimeEl.textContent = 'Meu Time';
            if (nomeCartolaTextEl) nomeCartolaTextEl.textContent = 'Cartoleiro';
            if (escudoCoracao) escudoCoracao.src = '/escudos/placeholder.png';
            if (escudoTimeEl) escudoTimeEl.src = '/escudos/placeholder.png';
            // Esconder botão de logout em caso de erro
            if (headerLogoutButton) {
                headerLogoutButton.style.display = 'none';
            }
        }
    }

    async verificarMultiplasLigas() {
        console.log('[PARTICIPANTE-AUTH] 🔍 Verificando múltiplas ligas para timeId:', this.timeId);

        try {
            const response = await fetch('/api/participante/auth/minhas-ligas', {
                credentials: 'include'
            });

            if (!response.ok) {
                console.warn('[PARTICIPANTE-AUTH] ❌ Erro ao buscar ligas (status:', response.status, ')');
                return;
            }

            const data = await response.json();
            console.log('[PARTICIPANTE-AUTH] 📊 Resposta da API:', data);

            const ligas = data.ligas || [];
            console.log('[PARTICIPANTE-AUTH] 📋 Total de ligas encontradas:', ligas.length);

            if (ligas.length > 0) {
                console.log('[PARTICIPANTE-AUTH] 📝 Ligas:', ligas.map(l => `${l.nome} (${l.id})`).join(', '));
            }

            // ✅ SEMPRE mostrar seletor se tiver múltiplas ligas
            if (ligas.length > 1) {
                console.log('[PARTICIPANTE-AUTH] 🏆 Participante em múltiplas ligas:', ligas.length);
                this.renderizarSeletorLigas(ligas);

                // 🎯 SÓ PAUSAR se NÃO houver liga selecionada
                if (!this.ligaId) {
                    console.log('[PARTICIPANTE-AUTH] ⏸️ Sem liga selecionada - pausando navegação');
                    this.pausarNavegacaoAteSelecao = true;
                } else {
                    console.log('[PARTICIPANTE-AUTH] ✅ Liga já selecionada - permitindo navegação');
                    this.pausarNavegacaoAteSelecao = false;
                }
            } else if (ligas.length === 1) {
                console.log('[PARTICIPANTE-AUTH] ℹ️ Participante em apenas 1 liga - carregando automaticamente');
                this.ocultarSeletorLigas();
                this.pausarNavegacaoAteSelecao = false;
            } else {
                console.warn('[PARTICIPANTE-AUTH] ⚠️ Nenhuma liga encontrada para este participante');
                this.pausarNavegacaoAteSelecao = true;
            }
        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] ❌ Erro ao verificar múltiplas ligas:', error);
        }
    }

    renderizarSeletorLigas(ligas) {
        const select = document.getElementById('seletorLiga');

        if (!select) {
            console.error('[PARTICIPANTE-AUTH] ❌ Elemento #seletorLiga não encontrado no DOM');
            return;
        }

        console.log('[PARTICIPANTE-AUTH] 📝 Renderizando seletor com', ligas.length, 'ligas');

        // Limpar opções anteriores
        select.innerHTML = '';

        // ✅ SEMPRE ADICIONAR PLACEHOLDER quando houver múltiplas ligas
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '🏆 Selecione uma Liga';
        placeholder.disabled = true;
        placeholder.selected = !this.ligaId; // Selecionar se não houver liga atual
        select.appendChild(placeholder);

        // Adicionar opções de ligas
        ligas.forEach(liga => {
            const option = document.createElement('option');
            option.value = liga.id;
            option.textContent = liga.nome;
            option.selected = liga.id === this.ligaId;
            select.appendChild(option);
            console.log(`[PARTICIPANTE-AUTH] ➕ Adicionada liga: ${liga.nome} (${liga.id})`);
        });

        // Event listener para trocar de liga (remover listeners anteriores)
        const novoSelect = select.cloneNode(true);
        select.parentNode.replaceChild(novoSelect, select);

        novoSelect.addEventListener('change', async (e) => {
            const novaLigaId = e.target.value;
            console.log('[PARTICIPANTE-AUTH] 🔄 Liga selecionada:', novaLigaId);
            if (novaLigaId) {
                await this.trocarLiga(novaLigaId);
            }
        });

        // FORÇAR VISIBILIDADE do seletor
        novoSelect.style.display = 'block';
        novoSelect.style.visibility = 'visible';
        novoSelect.style.opacity = '1';

        console.log('[PARTICIPANTE-AUTH] ✅ Seletor de ligas renderizado e visível');
    }

    ocultarSeletorLigas() {
        const select = document.getElementById('seletorLiga');
        if (select) {
            select.style.display = 'none';
            console.log('[PARTICIPANTE-AUTH] ℹ️ Seletor de ligas ocultado (uma liga apenas)');
        }

        const container = select?.closest('.header-secondary');
        if (container) {
            container.classList.remove('active');
        }
    }

    async trocarLiga(novaLigaId) {
        if (novaLigaId === this.ligaId) {
            return; // Mesma liga
        }

        try {
            console.log('[PARTICIPANTE-AUTH] 🔄 Trocando para liga:', novaLigaId);

            const response = await fetch('/api/participante/auth/trocar-liga', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ ligaId: novaLigaId })
            });

            if (!response.ok) {
                throw new Error('Erro ao trocar liga');
            }

            const data = await response.json();
            console.log('[PARTICIPANTE-AUTH] ✅ Liga alterada:', data.ligaNome);

            // Limpar cache de sessão e cache do navegador
            this.sessionCache = null;
            this.sessionCacheTime = null;

            // Limpar sessionStorage para forçar carregamento dos novos módulos
            sessionStorage.clear();

            // Recarregar página para carregar configuração da nova liga
            window.location.reload();
        } catch (error) {
            console.error('[PARTICIPANTE-AUTH] ❌ Erro ao trocar liga:', error);
            alert('Erro ao trocar de liga. Tente novamente.');
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

// Header simplificado - não precisa mais de toggle
console.log('[PARTICIPANTE-AUTH] ✅ Sistema carregado');
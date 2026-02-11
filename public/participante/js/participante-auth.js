// =====================================================================
// PARTICIPANTE AUTH - Sistema de Autenticação
// Destino: /participante/js/participante-auth.js
// =====================================================================

if (window.Log) Log.info('PARTICIPANTE-AUTH', 'Carregando sistema de autenticação...');

class ParticipanteAuth {
    constructor() {
        this.participante = null;
        this.ligaId = null;
        this.timeId = null;
        this.verificandoAuth = false;
        this.sessionCache = null;
        this.sessionCacheTime = null;
        this.CACHE_DURATION = 60000; // 1 minuto

        // ✅ v2.1: Cache de dados da liga para evitar requisições duplicadas
        this.ligaDataCache = null;
        this.ligaDataCacheTime = null;
        this.LIGA_CACHE_DURATION = 30000; // 30 segundos (reduzido para atualização mais rápida de módulos)
    }

    async verificarAutenticacao() {
        // Evitar múltiplas verificações simultâneas
        if (this.verificandoAuth) {
            if (window.Log) Log.debug('PARTICIPANTE-AUTH', 'Verificação já em andamento...');
            return false;
        }

        // Usar cache se disponível e válido
        const now = Date.now();
        if (
            this.sessionCache &&
            this.sessionCacheTime &&
            now - this.sessionCacheTime < this.CACHE_DURATION
        ) {
            if (window.Log) Log.debug('PARTICIPANTE-AUTH', '💾 Usando sessão em cache');
            const { participante } = this.sessionCache;
            this.ligaId = participante.ligaId;
            this.timeId = participante.timeId;
            this.participante = participante;

            // ✅ v2.2: Garantir dados no cache persistente
            if (window.ParticipanteCache) {
                window.ParticipanteCache.setParticipanteBasico(this.ligaId, this.timeId, {
                    ligaId: this.ligaId,
                    timeId: this.timeId,
                    nome_time: participante.participante?.nome_time,
                    nome_cartola: participante.participante?.nome_cartola,
                });
            }

            // Executar operações assíncronas
            await Promise.all([
                this.atualizarHeader({ forceRefresh: true }),
                this.verificarMultiplasLigas(),
            ]);

            // ✅ MANUTENÇÃO: Verificar antes de liberar o app
            const emManutencao = await this._verificarManutencao();

            // ✅ SPLASH: Mostrar após auth válida (cache) - apenas se não em manutenção
            if (!emManutencao && window.SplashScreen) {
                window.SplashScreen.show('autenticacao');
            }

            // ✅ FIX: Só emitir auth-ready se NÃO estiver em manutenção
            if (!emManutencao) {
                window.dispatchEvent(new CustomEvent('participante-auth-ready', {
                    detail: {
                        participante: this.participante,
                        ligaId: this.ligaId,
                        timeId: this.timeId,
                        ligaData: this.ligaDataCache
                    }
                }));
            }

            return true;
        }

        this.verificandoAuth = true;
        if (window.Log) Log.info('PARTICIPANTE-AUTH', 'Verificando autenticação...');

        try {
            // ✅ Verificar sessão no servidor com timeout de 8 segundos
            let response;

            // Usar AbortController se disponível, senão fazer fetch simples
            if (typeof AbortController !== 'undefined') {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000); // ✅ PERF: 12s (era 20s - balanceado para 3G/4G)

                response = await fetch("/api/participante/auth/session", {
                    credentials: "include",
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
            } else {
                // Fallback para navegadores sem AbortController
                response = await fetch("/api/participante/auth/session", {
                    credentials: "include"
                });
            }

            if (!response.ok) {
                if (window.Log) Log.warn('PARTICIPANTE-AUTH', 'Sem sessão válida no servidor');
                this.verificandoAuth = false;
                this.redirecionarLogin();
                return false;
            }

            const data = await response.json();

            if (!data.authenticated || !data.participante) {
                if (window.Log) Log.warn('PARTICIPANTE-AUTH', 'Sessão inválida');
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

            // ✅ PERF: Atualizar UI, verificar ligas e manutenção em PARALELO
            const [, , emManutencaoFetch] = await Promise.all([
                this.atualizarHeader({ forceRefresh: true }),
                this.verificarMultiplasLigas(),
                this._verificarManutencao(),
            ]);

            if (window.Log) Log.info('PARTICIPANTE-AUTH', '✅ Autenticação válida (cache atualizado)');
            this.verificandoAuth = false;

            // ✅ v2.2: Salvar dados do participante no cache persistente (fire-and-forget)
            if (window.ParticipanteCache) {
                window.ParticipanteCache.setParticipanteBasico(this.ligaId, this.timeId, {
                    ligaId: this.ligaId,
                    timeId: this.timeId,
                    nome_time: this.participante.participante?.nome_time,
                    nome_cartola: this.participante.participante?.nome_cartola,
                    foto_time: this.participante.participante?.foto_time,
                    clube_id: this.participante.participante?.clube_id,
                });

                // Pré-carregar dados essenciais em background
                window.ParticipanteCache.preloadEssentials(this.ligaId, this.timeId)
                    .catch(e => { /* Ignorar erros de preload */ });
            }

            // ✅ SPLASH: Mostrar após auth válida - apenas se não em manutenção
            if (!emManutencaoFetch && window.SplashScreen) {
                window.SplashScreen.show('autenticacao');
            }

            // ✅ FIX: Só emitir auth-ready se NÃO estiver em manutenção
            // Evita que navegação carregue módulos desnecessariamente
            if (!emManutencaoFetch) {
                window.dispatchEvent(new CustomEvent('participante-auth-ready', {
                    detail: {
                        participante: this.participante,
                        ligaId: this.ligaId,
                        timeId: this.timeId,
                        ligaData: this.ligaDataCache
                    }
                }));
            }

            return true;
        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-AUTH', 'Erro ao verificar auth:', error);
            this.verificandoAuth = false;
            this.redirecionarLogin();
            return false;
        }
    }

    /**
     * Verifica se o app está em modo manutenção.
     * Se bloqueado, ativa a tela "Calma aê!" (ManutencaoScreen).
     * Se dev bypass (admin logado via Replit Auth), libera normalmente.
     * @returns {boolean} true se app está bloqueado por manutenção
     */
    async _verificarManutencao() {
        try {
            const res = await fetch('/api/participante/manutencao/status', { credentials: 'include' });
            if (!res.ok) return false;

            const data = await res.json();

            if (data.ativo && data.bloqueado) {
                if (window.ManutencaoScreen) {
                    ManutencaoScreen.ativar(data);
                    if (window.Log) Log.info('PARTICIPANTE-AUTH', '🔧 App em manutenção - splash ativada');
                }
                return true;
            }

            // Dev bypass ou whitelist - desativar splash se estava ativa
            if (data.ativo && !data.bloqueado) {
                if (window.ManutencaoScreen && ManutencaoScreen.estaAtivo()) {
                    ManutencaoScreen.desativar();
                    if (window.Log) Log.info('PARTICIPANTE-AUTH', '🔓 Manutenção: acesso liberado (devBypass ou whitelist)');
                }
            }

            return false;
        } catch (error) {
            if (window.Log) Log.warn('PARTICIPANTE-AUTH', 'Erro ao verificar manutenção (ignorando):', error);
            return false; // Em caso de erro, não bloquear
        }
    }

    async atualizarHeader(options = {}) {
        if (!this.participante) return;

        const { forceRefresh = false } = options;

        // Evitar múltiplas atualizações simultâneas
        if (this._atualizandoHeader) return;
        this._atualizandoHeader = true;

        const nomeTimeEl = document.getElementById("nomeTime");
        const nomeCartolaTextEl = document.getElementById("nomeCartolaText");
        const escudoCoracao = document.getElementById("escudoCoracao");
        const escudoTimeEl = document.getElementById("escudoTime");
        const headerLogoutButton =
            document.getElementById("headerLogoutButton");

        if (window.Log) Log.debug('PARTICIPANTE-AUTH', 'Atualizando header com dados da sessão', { forceRefresh });

        try {
            // ✅ PRIORIZAR DADOS DA SESSÃO (já validados no backend)
            let nomeTimeTexto =
                this.participante.participante?.nome_time || "Meu Time";
            let nomeCartolaTexto =
                this.participante.participante?.nome_cartola || "Cartoleiro";
            let clubeId = this.participante.participante?.clube_id || null;
            let fotoTime = this.participante.participante?.foto_time || null;

            // ✅ PERF: Buscar time + liga em PARALELO (eram sequenciais)
            let timeData = {};
            let ligaData = null;
            let participanteDataNaLiga = null;
            const now = Date.now();

            // Preparar fetch do time
            const fetchTime = fetch(`/api/times/${this.timeId}`, {
                credentials: "include",
                cache: "no-store",
            }).then(async (res) => {
                if (res.ok) {
                    timeData = await res.json();
                    nomeTimeTexto = timeData.nome_time || timeData.nome || nomeTimeTexto;
                    nomeCartolaTexto = timeData.nome_cartola || timeData.nome_cartoleiro || nomeCartolaTexto;
                    clubeId = timeData.clube_id || clubeId;
                    fotoTime = timeData.url_escudo_png || timeData.foto_time || fotoTime;
                    if (window.Log) Log.debug('PARTICIPANTE-AUTH', '✅ Dados do time atualizados', {
                        timeId: this.timeId,
                        nome_time: timeData.nome_time || timeData.nome,
                        nome_cartola: timeData.nome_cartola || timeData.nome_cartoleiro,
                    });
                } else {
                    if (window.Log) Log.warn('PARTICIPANTE-AUTH', '⚠️ Não foi possível buscar dados atualizados do time');
                }
            }).catch((timeError) => {
                if (window.Log) Log.warn('PARTICIPANTE-AUTH', '⚠️ Erro ao buscar /api/times:', timeError.message);
            });

            // Preparar fetch da liga (com cache)
            const fetchLiga = (async () => {
                try {
                    if (!forceRefresh &&
                        this.ligaDataCache &&
                        this.ligaDataCacheTime &&
                        now - this.ligaDataCacheTime < this.LIGA_CACHE_DURATION &&
                        this.ligaDataCache._ligaId === this.ligaId) {
                        ligaData = this.ligaDataCache;
                        if (window.Log) Log.debug('PARTICIPANTE-AUTH', '💾 Usando cache da liga');
                    } else {
                        const ligaResponse = await fetch(`/api/ligas/${this.ligaId}`, {
                            credentials: "include",
                        });

                        if (ligaResponse.ok) {
                            ligaData = await ligaResponse.json();
                            ligaData._ligaId = this.ligaId;
                            this.ligaDataCache = ligaData;
                            this.ligaDataCacheTime = Date.now();
                            if (window.Log) Log.debug('PARTICIPANTE-AUTH', '📥 Liga carregada e cacheada', { forceRefresh });
                        } else {
                            if (window.Log) Log.warn('PARTICIPANTE-AUTH', `⚠️ Falha ao buscar liga ${this.ligaId} (status: ${ligaResponse.status}) - usando dados do time/sessão`);
                            if (this.ligaDataCache && this.ligaDataCache._ligaId === this.ligaId) {
                                ligaData = this.ligaDataCache;
                                if (window.Log) Log.debug('PARTICIPANTE-AUTH', '💾 Usando cache stale da liga como fallback');
                            }
                        }
                    }
                } catch (ligaError) {
                    if (window.Log) Log.warn('PARTICIPANTE-AUTH', '⚠️ Erro ao buscar liga:', ligaError.message);
                    if (this.ligaDataCache && this.ligaDataCache._ligaId === this.ligaId) {
                        ligaData = this.ligaDataCache;
                    }
                }
            })();

            // Executar ambos em paralelo
            await Promise.all([fetchTime, fetchLiga]);

            // Atualizar header com dados (time pode ter atualizado vars acima)
            if (nomeTimeEl) nomeTimeEl.textContent = nomeTimeTexto;
            if (nomeCartolaTextEl) nomeCartolaTextEl.textContent = nomeCartolaTexto;
            this._atualizarEscudos(escudoCoracao, escudoTimeEl, clubeId, fotoTime);

            // Processar dados da liga (se disponíveis)
            if (ligaData) {
                // ✅ v3.0: Detectar se liga é estreante (criada na temporada atual)
                const anoAtual = new Date().getFullYear();
                const anoCriacao = ligaData.criadaEm ? new Date(ligaData.criadaEm).getFullYear() : 2025;
                window.isLigaEstreante = (anoCriacao >= anoAtual);
                window.ligaPrimeiraTemporada = anoCriacao;
                if (window.Log) Log.info('PARTICIPANTE-AUTH', `📅 Liga estreante: ${window.isLigaEstreante} (criada em ${anoCriacao})`);

                // ✅ v3.2: Detectar liga aposentada / não renovada
                window.isLigaAposentada = (ligaData.status === 'aposentada' || ligaData.ativa === false);
                if (window.isLigaAposentada) {
                    if (window.Log) Log.info('PARTICIPANTE-AUTH', '🏛️ Liga APOSENTADA - acesso restrito ao Hall da Fama');
                }

                participanteDataNaLiga = ligaData.participantes?.find(
                    (p) => String(p.time_id) === String(this.timeId),
                );

                if (window.Log) Log.debug('PARTICIPANTE-AUTH', 'Dados do participante na liga obtidos');
            }

            // Priorizar dados reais do time sobre dados da liga (que podem estar desatualizados)
            const nomeTimeTextoFinal =
                timeData?.nome_time ||
                timeData?.nome ||
                participanteDataNaLiga?.nome_time ||
                nomeTimeTexto ||
                "Meu Time";
            const nomeCartolaTextoFinal =
                timeData?.nome_cartola ||
                timeData?.nome_cartoleiro ||
                participanteDataNaLiga?.nome_cartola ||
                nomeCartolaTexto ||
                "Cartoleiro";
            const clubeIdFinal =
                timeData?.clube_id ||
                participanteDataNaLiga?.clube_id ||
                clubeId ||
                null;
            const fotoTimeFinal =
                timeData?.url_escudo_png ||
                timeData?.foto_time ||
                participanteDataNaLiga?.foto_time ||
                fotoTime ||
                null;
            const patrimonio = participanteDataNaLiga?.patrimonio;

            // ✅ Sincronizar dados atualizados no auth e cache persistente
            if (this.participante?.participante) {
                const participanteAtualizado = {
                    ...this.participante.participante,
                    nome_time: nomeTimeTextoFinal,
                    nome_cartola: nomeCartolaTextoFinal,
                    clube_id: clubeIdFinal,
                    foto_time: fotoTimeFinal,
                    patrimonio,
                };

                this.participante = { ...this.participante, participante: participanteAtualizado };
                if (this.sessionCache?.participante) {
                    this.sessionCache.participante = this.participante;
                }

                if (window.ParticipanteCache) {
                    window.ParticipanteCache.setParticipanteBasico(this.ligaId, this.timeId, {
                        ligaId: this.ligaId,
                        timeId: this.timeId,
                        nome_time: nomeTimeTextoFinal,
                        nome_cartola: nomeCartolaTextoFinal,
                        foto_time: fotoTimeFinal,
                        clube_id: clubeIdFinal,
                        patrimonio,
                    });
                }
            }

            // ✅ Atualizar header com dados finais (enriquecidos com dados da liga)
            if (nomeTimeEl) nomeTimeEl.textContent = nomeTimeTextoFinal;
            if (nomeCartolaTextEl) nomeCartolaTextEl.textContent = nomeCartolaTextoFinal;
            this._atualizarEscudos(escudoCoracao, escudoTimeEl, clubeIdFinal, fotoTimeFinal);

            // ✅ Badge de ambiente (DEV/PROD) - apenas para participante premium
            const envBadge = document.getElementById("app-env-badge");
            if (envBadge) {
                const isPremium = participanteDataNaLiga?.premium === true;
                const isProduction = window.Log?.isProduction ?? !window.location.hostname.includes('replit');
                if (isPremium) {
                    envBadge.classList.remove('hidden');
                    if (isProduction) {
                        envBadge.textContent = 'PROD';
                        envBadge.className = 'text-[9px] bg-green-500/20 border border-green-500/50 text-green-400 px-1.5 py-0.5 rounded ml-1 font-bold uppercase';
                    } else {
                        envBadge.textContent = 'DEV';
                        envBadge.className = 'text-[9px] bg-red-500/20 border border-red-500/50 text-red-400 px-1.5 py-0.5 rounded ml-1 font-bold uppercase';
                    }
                } else {
                    envBadge.classList.add('hidden');
                }
            }

            // Scrollbar personalizada com cores do time do participante
            this._aplicarCoresScrollbar(clubeIdFinal);

            // Mostrar ou ocultar o botão de logout
            if (headerLogoutButton) {
                headerLogoutButton.style.display = this.estaAutenticado()
                    ? "block"
                    : "none";
            }

            if (window.Log) Log.info('PARTICIPANTE-AUTH', '✅ Header atualizado com sucesso');

            this._atualizandoHeader = false;
        } catch (error) {
            this._atualizandoHeader = false;
            if (window.Log) Log.error('PARTICIPANTE-AUTH', 'Erro ao atualizar header:', error);

            // ✅ FIX: Usar dados da sessão como fallback (não hardcoded "Meu Time")
            const fallbackNome = this.participante?.participante?.nome_time || "Meu Time";
            const fallbackCartola = this.participante?.participante?.nome_cartola || "Cartoleiro";
            const fallbackClubeId = this.participante?.participante?.clube_id || null;
            const fallbackFoto = this.participante?.participante?.foto_time || null;

            if (nomeTimeEl) nomeTimeEl.textContent = fallbackNome;
            if (nomeCartolaTextEl) nomeCartolaTextEl.textContent = fallbackCartola;
            this._atualizarEscudos(escudoCoracao, escudoTimeEl, fallbackClubeId, fallbackFoto);

            // Mostrar botão de logout mesmo em erro (usuário está autenticado)
            if (headerLogoutButton) {
                headerLogoutButton.style.display = this.estaAutenticado()
                    ? "block"
                    : "none";
            }
        }
    }

    /**
     * Atualiza escudos do header (clube e time)
     * Extraído para reuso entre fluxo normal e fallback
     */
    _atualizarEscudos(escudoCoracao, escudoTimeEl, clubeId, fotoTime) {
        if (escudoCoracao) {
            if (clubeId) {
                escudoCoracao.src = `/escudos/${clubeId}.png`;
                escudoCoracao.onerror = () =>
                    (escudoCoracao.src = "/escudos/placeholder.png");
            } else {
                escudoCoracao.src = "/escudos/placeholder.png";
            }
        }

        if (escudoTimeEl) {
            if (fotoTime) {
                escudoTimeEl.src = fotoTime;
                escudoTimeEl.onerror = () => {
                    if (clubeId) {
                        escudoTimeEl.src = `/escudos/${clubeId}.png`;
                        escudoTimeEl.onerror = () =>
                            (escudoTimeEl.src = "/escudos/placeholder.png");
                    } else {
                        escudoTimeEl.src = "/escudos/placeholder.png";
                    }
                };
            } else if (clubeId) {
                escudoTimeEl.src = `/escudos/${clubeId}.png`;
                escudoTimeEl.onerror = () =>
                    (escudoTimeEl.src = "/escudos/placeholder.png");
            } else {
                escudoTimeEl.src = "/escudos/placeholder.png";
            }
        }
    }

    /**
     * Aplica cores do time do participante na scrollbar do app
     * Usa gradiente com as duas cores do escudo do clube
     */
    _aplicarCoresScrollbar(clubeId) {
        // Mapeamento de cores por clube_id (cor1 = primária, cor2 = secundária)
        const CLUBES_CORES = {
            262:  { cor1: '#c4161c', cor2: 'var(--app-surface)' },   // Flamengo
            263:  { cor1: '#2a2a2a', cor2: 'var(--app-text-primary)' },     // Botafogo
            264:  { cor1: '#2a2a2a', cor2: 'var(--app-text-primary)' },     // Corinthians
            265:  { cor1: '#0056a8', cor2: '#e42527' },     // Bahia
            266:  { cor1: '#8b0042', cor2: '#006633' },     // Fluminense
            267:  { cor1: '#2a2a2a', cor2: 'var(--app-text-primary)' },     // Vasco
            275:  { cor1: '#006437', cor2: 'var(--app-text-primary)' },     // Palmeiras
            276:  { cor1: '#e42527', cor2: '#2a2a2a' },     // São Paulo
            277:  { cor1: '#2a2a2a', cor2: 'var(--app-text-primary)' },     // Santos
            280:  { cor1: '#e42527', cor2: 'var(--app-text-primary)' },     // Bragantino
            282:  { cor1: '#2a2a2a', cor2: 'var(--app-text-primary)' },     // Atlético-MG
            283:  { cor1: '#003399', cor2: 'var(--app-text-primary)' },     // Cruzeiro
            284:  { cor1: '#0c2340', cor2: '#75c4e2' },     // Grêmio
            285:  { cor1: '#e42527', cor2: 'var(--app-text-primary)' },     // Internacional
            286:  { cor1: '#006633', cor2: 'var(--app-text-primary)' },     // Juventude
            287:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Vitória
            290:  { cor1: '#006633', cor2: 'var(--app-text-primary)' },     // Goiás
            292:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Sport
            293:  { cor1: '#c4161c', cor2: '#2a2a2a' },     // Athletico-PR
            354:  { cor1: '#2a2a2a', cor2: 'var(--app-text-primary)' },     // Ceará
            356:  { cor1: '#003399', cor2: '#e42527' },     // Fortaleza
            1371: { cor1: '#006633', cor2: 'var(--app-gold)' },     // Cuiabá
            2305: { cor1: 'var(--app-gold)', cor2: '#006633' },     // Mirassol
            270:  { cor1: '#006633', cor2: 'var(--app-text-primary)' },     // Coritiba
            273:  { cor1: '#006633', cor2: 'var(--app-text-primary)' },     // América-MG
            274:  { cor1: '#006633', cor2: 'var(--app-text-primary)' },     // Chapecoense
            288:  { cor1: '#2a2a2a', cor2: 'var(--app-text-primary)' },     // Ponte Preta
            315:  { cor1: 'var(--app-gold)', cor2: '#2a2a2a' },     // Novorizontino
            344:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Santa Cruz
            373:  { cor1: '#e42527', cor2: 'var(--app-text-primary)' },     // CRB
        };

        const cores = clubeId ? CLUBES_CORES[Number(clubeId)] : null;
        if (!cores) return;

        const root = document.documentElement;
        root.style.setProperty('--scrollbar-cor1', cores.cor1);
        root.style.setProperty('--scrollbar-cor2', cores.cor2);

        if (window.Log) Log.info('PARTICIPANTE-AUTH', `🎨 Scrollbar personalizada: ${cores.cor1} + ${cores.cor2} (clube ${clubeId})`);
    }

    async verificarMultiplasLigas() {
        if (window.Log) Log.debug('PARTICIPANTE-AUTH', '🔍 Verificando múltiplas ligas para timeId:', this.timeId);

        try {
            const response = await fetch(
                "/api/participante/auth/minhas-ligas",
                {
                    credentials: "include",
                },
            );

            if (!response.ok) {
                if (window.Log) Log.warn('PARTICIPANTE-AUTH', '❌ Erro ao buscar ligas (status:', response.status, ')');
                return;
            }

            const data = await response.json();
            if (window.Log) Log.debug('PARTICIPANTE-AUTH', '📊 Resposta da API de ligas recebida');

            const ligas = data.ligas || [];
            if (window.Log) Log.debug('PARTICIPANTE-AUTH', '📋 Total de ligas encontradas:', ligas.length);

            if (ligas.length > 0) {
                if (window.Log) Log.debug('PARTICIPANTE-AUTH', '📝 Ligas:', ligas.map((l) => l.nome).join(", "));
            }

            // ✅ SEMPRE mostrar seletor se tiver múltiplas ligas
            // ✅ v3.1: Expor flag multiplasLigas para uso no seletor de temporada
            this.multiplasLigas = ligas.length > 1;

            if (ligas.length > 1) {
                if (window.Log) Log.info('PARTICIPANTE-AUTH', '🏆 Participante em múltiplas ligas:', ligas.length);
                this.renderizarSeletorLigas(ligas);

                // 🎯 SÓ PAUSAR se NÃO houver liga selecionada
                if (!this.ligaId) {
                    if (window.Log) Log.info('PARTICIPANTE-AUTH', '⏸️ Sem liga selecionada - pausando navegação');
                    this.pausarNavegacaoAteSelecao = true;
                } else {
                    if (window.Log) Log.debug('PARTICIPANTE-AUTH', '✅ Liga já selecionada - permitindo navegação');
                    this.pausarNavegacaoAteSelecao = false;
                }
            } else if (ligas.length === 1) {
                if (window.Log) Log.debug('PARTICIPANTE-AUTH', 'ℹ️ Participante em apenas 1 liga - carregando automaticamente');
                this.ocultarSeletorLigas();
                this.pausarNavegacaoAteSelecao = false;
            } else {
                if (window.Log) Log.warn('PARTICIPANTE-AUTH', '⚠️ Nenhuma liga encontrada para este participante');
                this.pausarNavegacaoAteSelecao = true;
            }

            // ✅ v3.2: Atualizar logo da splash/app baseada na liga
            if (window.LigaLogos) {
                const ligaAtual = ligas.find(l => l.id === this.ligaId);
                window.LigaLogos.atualizarLogosApp({
                    ligaId: this.ligaId,
                    ligaNome: ligaAtual?.nome || null,
                    multiplasLigas: this.multiplasLigas
                });
            }
        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-AUTH', '❌ Erro ao verificar múltiplas ligas:', error);
        }
    }

    renderizarSeletorLigas(ligas) {
        // Guardar ligas para uso no modal
        this.ligasDisponiveis = ligas;

        // ✅ NOVO: Mostrar badge de liga no header principal
        this.mostrarBadgeLiga(ligas);

        // ===== SELECT TRADICIONAL (mantido para compatibilidade) =====
        const select = document.getElementById("seletorLiga");

        if (!select) {
            if (window.Log) Log.error('PARTICIPANTE-AUTH', '❌ Elemento #seletorLiga não encontrado no DOM');
            return;
        }

        if (window.Log) Log.debug('PARTICIPANTE-AUTH', '📝 Renderizando seletor com', ligas.length, 'ligas');

        // Limpar opções anteriores
        select.innerHTML = "";

        // Adicionar opções de ligas
        ligas.forEach((liga) => {
            const option = document.createElement("option");
            option.value = liga.id;
            option.textContent = liga.nome;
            option.selected = liga.id === this.ligaId;
            select.appendChild(option);
        });

        // Event listener para trocar de liga (remover listeners anteriores)
        const novoSelect = select.cloneNode(true);
        select.parentNode.replaceChild(novoSelect, select);

        novoSelect.addEventListener("change", async (e) => {
            const novaLigaId = e.target.value;
            if (window.Log) Log.info('PARTICIPANTE-AUTH', '🔄 Liga selecionada:', novaLigaId);
            if (novaLigaId) {
                await this.trocarLiga(novaLigaId);
            }
        });

        // FORÇAR VISIBILIDADE do seletor
        novoSelect.style.display = "block";
        novoSelect.style.visibility = "visible";
        novoSelect.style.opacity = "1";

        if (window.Log) Log.debug('PARTICIPANTE-AUTH', '✅ Seletor de ligas renderizado e visível');
    }

    // ✅ Logo da liga - dinâmico via campo liga.logo (sem hardcode)

    // ✅ NOVO: Mostrar badge de liga clicável no header
    mostrarBadgeLiga(ligas) {
        const badgeContainer = document.getElementById("ligaBadgeContainer");
        const badgeNome = document.getElementById("ligaBadgeNome");
        const badgeIcone = document.getElementById("ligaBadgeIcone");
        const badge = document.getElementById("ligaBadge");

        if (!badgeContainer || !badge) {
            if (window.Log) Log.warn('PARTICIPANTE-AUTH', 'Badge de liga não encontrado no DOM');
            return;
        }

        // Encontrar liga atual
        const ligaAtual = ligas.find(l => l.id === this.ligaId);
        if (ligaAtual && badgeNome) {
            // ✅ Logo dinâmica via campo liga.logo (sem hardcode)
            const logoUrl = ligaAtual.logo ? `/${ligaAtual.logo}` : null;
            
            // Truncar nome se muito longo
            const nomeExibir = ligaAtual.nome.length > 18
                ? ligaAtual.nome.substring(0, 16) + '...'
                : ligaAtual.nome;
            
            // Se tem logo, mostrar logo + nome e esconder ícone genérico
            if (logoUrl) {
                if (badgeIcone) badgeIcone.style.display = 'none';
                badgeNome.innerHTML = `
                    <img src="${logoUrl}" 
                         alt="${ligaAtual.nome}" 
                         class="liga-badge-logo"
                         style="width: 18px; height: 18px; object-fit: contain; margin-right: 4px; vertical-align: middle; border-radius: 3px;"
                         onerror="this.style.display='none'; document.getElementById('ligaBadgeIcone').style.display='inline-block';">
                    <span style="vertical-align: middle;">${nomeExibir}</span>
                `;
            } else {
                // Mostrar ícone genérico
                if (badgeIcone) badgeIcone.style.display = 'inline-block';
                badgeNome.textContent = nomeExibir;
            }
        }

        // Mostrar badge
        badgeContainer.style.display = "block";

        // Configurar clique para abrir modal
        badge.onclick = () => this.abrirModalLigas();

        if (window.Log) Log.debug('PARTICIPANTE-AUTH', '✅ Badge de liga configurado');
    }

    // ✅ NOVO: Modal de seleção de liga
    abrirModalLigas() {
        if (window.Log) Log.info('PARTICIPANTE-AUTH', '📋 Abrindo modal de ligas');

        // Remover modal existente se houver
        const existente = document.getElementById("modalSeletorLiga");
        if (existente) existente.remove();

        const ligas = this.ligasDisponiveis || [];
        if (ligas.length === 0) {
            if (window.Log) Log.warn('PARTICIPANTE-AUTH', 'Sem ligas disponíveis');
            return;
        }

        const modal = document.createElement("div");
        modal.id = "modalSeletorLiga";
        modal.innerHTML = `
            <div class="liga-modal-overlay" onclick="participanteAuth.fecharModalLigas()">
                <div class="liga-modal-content" onclick="event.stopPropagation()">
                    <div class="liga-modal-header">
                        <div class="liga-modal-title">
                            <span class="material-symbols-outlined" style="color: var(--app-gold);">emoji_events</span>
                            Trocar de Liga
                        </div>
                        <button class="liga-modal-close" onclick="participanteAuth.fecharModalLigas()">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="liga-modal-body">
                        ${ligas.map(liga => {
                            const isAposentada = liga.status === 'aposentada' || liga.ativa === false;
                            return `
                            <div class="liga-option ${liga.id === this.ligaId ? 'atual' : ''} ${isAposentada ? 'aposentada' : ''}"
                                 onclick="participanteAuth.selecionarLigaModal('${liga.id}')">
                                <div class="liga-option-icon">
                                    <span class="material-symbols-outlined">${isAposentada ? 'history' : 'emoji_events'}</span>
                                </div>
                                <div class="liga-option-info">
                                    <div class="liga-option-nome">
                                        ${liga.nome}
                                        ${liga.id === this.ligaId ? '<span class="liga-option-atual-badge">ATUAL</span>' : ''}
                                        ${isAposentada ? '<span class="liga-option-aposentada-badge">ENCERRADA</span>' : ''}
                                    </div>
                                    <div class="liga-option-times">${isAposentada ? 'Apenas histórico disponível' : (liga.times || '?') + ' participantes'}</div>
                                </div>
                                <span class="material-symbols-outlined liga-option-check">check_circle</span>
                            </div>
                        `;}).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    fecharModalLigas() {
        const modal = document.getElementById("modalSeletorLiga");
        if (modal) modal.remove();
    }

    async selecionarLigaModal(ligaId) {
        this.fecharModalLigas();

        if (ligaId === this.ligaId) {
            if (window.Log) Log.debug('PARTICIPANTE-AUTH', 'Mesma liga selecionada, ignorando');
            return;
        }

        await this.trocarLiga(ligaId);
    }

    ocultarSeletorLigas() {
        const select = document.getElementById("seletorLiga");
        if (select) {
            select.style.display = "none";
            if (window.Log) Log.debug('PARTICIPANTE-AUTH', 'ℹ️ Seletor de ligas ocultado (uma liga apenas)');
        }

        const container = select?.closest(".header-secondary");
        if (container) {
            container.classList.remove("active");
        }
    }

    async trocarLiga(novaLigaId) {
        if (novaLigaId === this.ligaId) {
            return; // Mesma liga
        }

        try {
            if (window.Log) Log.info('PARTICIPANTE-AUTH', '🔄 Trocando para liga:', novaLigaId);

            const response = await fetch("/api/participante/auth/trocar-liga", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ ligaId: novaLigaId }),
            });

            if (!response.ok) {
                throw new Error("Erro ao trocar liga");
            }

            const data = await response.json();
            if (window.Log) Log.info('PARTICIPANTE-AUTH', '✅ Liga alterada:', data.ligaNome);

            // Limpar cache de sessão e cache do navegador
            this.sessionCache = null;
            this.sessionCacheTime = null;

            // ✅ Limpar TODOS os storages para forçar carregamento dos novos módulos
            sessionStorage.clear();

            // ✅ Limpar localStorage SELETIVAMENTE (preservar chaves de sistema)
            const chavesPreservadas = ['app_version', 'sw_emergency_clean_v8'];
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!chavesPreservadas.includes(key)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // ✅ CORREÇÃO: Aguardar sessão ser salva no MongoDB antes de recarregar (aumentado para 800ms)
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Recarregar página para carregar configuração da nova liga
            window.location.reload();
        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-AUTH', '❌ Erro ao trocar liga:', error);
            SuperModal.toast.error("Erro ao trocar de liga. Tente novamente.");
        }
    }

    logout() {
        this.limpar();
        this.redirecionarLogin();
    }

    redirecionarLogin() {
        // Evitar loop: só redirecionar se NÃO estiver na página de login
        if (window.location.pathname !== "/participante-login.html") {
            if (window.Log) Log.info('PARTICIPANTE-AUTH', 'Redirecionando para login...');

            // ✅ Esconder splash e overlays antes de redirecionar
            if (window.SplashScreen) {
                window.SplashScreen.hide();
            }
            const overlay = document.getElementById('reload-glass-overlay');
            if (overlay) overlay.classList.remove('is-active');

            window.location.href = "/participante-login.html";
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
            timeId: this.timeId,
        };
    }
}

// Instância global
const participanteAuth = new ParticipanteAuth();

// ✅ v2.5: Expor instância globalmente para uso em outros módulos
window.participanteAuth = participanteAuth;

// Inicializar quando a página estiver carregada
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
        await participanteAuth.verificarAutenticacao();
        
        // ✅ Inicializar sistema de versionamento
        if (window.AppVersion) {
            await window.AppVersion.init();
            if (window.Log) Log.info('PARTICIPANTE-AUTH', '📦 Sistema de versionamento inicializado');
        }
    });
} else {
    // DOM já carregado
    participanteAuth.verificarAutenticacao().then(async () => {
        // ✅ Inicializar sistema de versionamento
        if (window.AppVersion) {
            await window.AppVersion.init();
            if (window.Log) Log.info('PARTICIPANTE-AUTH', '📦 Sistema de versionamento inicializado');
        }
    });
}

// Função de logout global
function logout() {
    participanteAuth.limpar();

    // ✅ Limpar chave do app para que a splash apareça no próximo login
    sessionStorage.removeItem('participante_app_loaded');

    // Fazer logout no servidor
    fetch("/api/participante/auth/logout", {
        method: "POST",
        credentials: "include",
    }).finally(() => {
        window.location.href = "/participante-login.html";
    });
}

// Header simplificado - não precisa mais de toggle
if (window.Log) Log.info('PARTICIPANTE-AUTH', '✅ Sistema carregado');

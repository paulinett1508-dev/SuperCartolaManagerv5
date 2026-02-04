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

            // ✅ SPLASH: Mostrar após auth válida (cache)
            if (window.SplashScreen) {
                window.SplashScreen.show('autenticacao');
            }

            // ✅ v2.1: Emitir evento com dados da liga incluídos
            window.dispatchEvent(new CustomEvent('participante-auth-ready', {
                detail: {
                    participante: this.participante,
                    ligaId: this.ligaId,
                    timeId: this.timeId,
                    ligaData: this.ligaDataCache // Incluir dados da liga
                }
            }));

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
                const timeoutId = setTimeout(() => controller.abort(), 20000); // ✅ FIX MOBILE: 20s (era 8s - insuficiente para 3G/4G lento)

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

            // Atualizar UI e verificar múltiplas ligas
            await Promise.all([
                this.atualizarHeader({ forceRefresh: true }),
                this.verificarMultiplasLigas(),
            ]);

            if (window.Log) Log.info('PARTICIPANTE-AUTH', '✅ Autenticação válida (cache atualizado)');
            this.verificandoAuth = false;

            // ✅ v2.2: Salvar dados do participante no cache persistente
            if (window.ParticipanteCache) {
                window.ParticipanteCache.setParticipanteBasico(this.ligaId, this.timeId, {
                    ligaId: this.ligaId,
                    timeId: this.timeId,
                    nome_time: this.participante.participante?.nome_time,
                    nome_cartola: this.participante.participante?.nome_cartola,
                    foto_time: this.participante.participante?.foto_time,
                    clube_id: this.participante.participante?.clube_id,
                });

                // ✅ Pré-carregar dados essenciais em background (para próxima abertura ser instantânea)
                window.ParticipanteCache.preloadEssentials(this.ligaId, this.timeId)
                    .catch(e => { /* Ignorar erros de preload */ });
            }

            // ✅ SPLASH: Mostrar após auth válida
            if (window.SplashScreen) {
                window.SplashScreen.show('autenticacao');
            }

            // ✅ v2.1: Emitir evento com dados da liga incluídos
            window.dispatchEvent(new CustomEvent('participante-auth-ready', {
                detail: {
                    participante: this.participante,
                    ligaId: this.ligaId,
                    timeId: this.timeId,
                    ligaData: this.ligaDataCache // Incluir dados da liga
                }
            }));

            return true;
        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-AUTH', 'Erro ao verificar auth:', error);
            this.verificandoAuth = false;
            this.redirecionarLogin();
            return false;
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

            // Buscar dados atualizados do time APENAS se necessário
            const timeResponse = await fetch(`/api/times/${this.timeId}`, {
                credentials: "include",
                cache: "no-store",
            });

            let timeData = {}; // Inicializa timeData como um objeto vazio
            if (timeResponse.ok) {
                timeData = await timeResponse.json();

                // Atualizar sempre que houver dados do time (prioridade máxima)
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

            // 2. Buscar dados da liga (COM CACHE para evitar duplicação)
            let ligaData = null;
            const now = Date.now();

            // Verificar cache da liga
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

                if (!ligaResponse.ok) {
                    throw new Error(
                        `Erro ao buscar dados da liga ${this.ligaId} (status: ${ligaResponse.status})`,
                    );
                }

                ligaData = await ligaResponse.json();
                ligaData._ligaId = this.ligaId; // Marcar para validação do cache
                this.ligaDataCache = ligaData;
                this.ligaDataCacheTime = Date.now();
                if (window.Log) Log.debug('PARTICIPANTE-AUTH', '📥 Liga carregada e cacheada', { forceRefresh });
            }

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


            let participanteDataNaLiga = ligaData.participantes?.find(
                (p) => String(p.time_id) === String(this.timeId),
            );

            if (window.Log) Log.debug('PARTICIPANTE-AUTH', 'Dados do participante na liga obtidos');

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

            // Atualizar nome do time e cartoleiro
            if (nomeTimeEl) {
                nomeTimeEl.textContent = nomeTimeTextoFinal;
            }
            if (nomeCartolaTextEl) {
                nomeCartolaTextEl.textContent = nomeCartolaTextoFinal;
            }

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

            // Escudo do clube (coração)
            if (escudoCoracao) {
                if (clubeIdFinal) {
                    escudoCoracao.src = `/escudos/${clubeIdFinal}.png`;
                    escudoCoracao.onerror = () =>
                        (escudoCoracao.src = "/escudos/placeholder.png");
                } else {
                    escudoCoracao.src = "/escudos/placeholder.png";
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
                            escudoTimeEl.onerror = () =>
                                (escudoTimeEl.src = "/escudos/placeholder.png");
                        } else {
                            escudoTimeEl.src = "/escudos/placeholder.png";
                        }
                    };
                } else if (clubeIdFinal) {
                    escudoTimeEl.src = `/escudos/${clubeIdFinal}.png`;
                    escudoTimeEl.onerror = () =>
                        (escudoTimeEl.src = "/escudos/placeholder.png");
                } else {
                    escudoTimeEl.src = "/escudos/placeholder.png";
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

            // Fallback para dados básicos
            if (nomeTimeEl) nomeTimeEl.textContent = "Meu Time";
            if (nomeCartolaTextEl) nomeCartolaTextEl.textContent = "Cartoleiro";
            if (escudoCoracao) escudoCoracao.src = "/escudos/placeholder.png";
            if (escudoTimeEl) escudoTimeEl.src = "/escudos/placeholder.png";
            // Esconder botão de logout em caso de erro
            if (headerLogoutButton) {
                headerLogoutButton.style.display = "none";
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
            262:  { cor1: '#c4161c', cor2: '#1a1a1a' },   // Flamengo
            263:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Botafogo
            264:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Corinthians
            265:  { cor1: '#0056a8', cor2: '#e42527' },     // Bahia
            266:  { cor1: '#8b0042', cor2: '#006633' },     // Fluminense
            267:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Vasco
            275:  { cor1: '#006437', cor2: '#ffffff' },     // Palmeiras
            276:  { cor1: '#e42527', cor2: '#2a2a2a' },     // São Paulo
            277:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Santos
            280:  { cor1: '#e42527', cor2: '#ffffff' },     // Bragantino
            282:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Atlético-MG
            283:  { cor1: '#003399', cor2: '#ffffff' },     // Cruzeiro
            284:  { cor1: '#0c2340', cor2: '#75c4e2' },     // Grêmio
            285:  { cor1: '#e42527', cor2: '#ffffff' },     // Internacional
            286:  { cor1: '#006633', cor2: '#ffffff' },     // Juventude
            287:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Vitória
            290:  { cor1: '#006633', cor2: '#ffffff' },     // Goiás
            292:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Sport
            293:  { cor1: '#c4161c', cor2: '#2a2a2a' },     // Athletico-PR
            354:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Ceará
            356:  { cor1: '#003399', cor2: '#e42527' },     // Fortaleza
            1371: { cor1: '#006633', cor2: '#ffd700' },     // Cuiabá
            2305: { cor1: '#ffd700', cor2: '#006633' },     // Mirassol
            270:  { cor1: '#006633', cor2: '#ffffff' },     // Coritiba
            273:  { cor1: '#006633', cor2: '#ffffff' },     // América-MG
            274:  { cor1: '#006633', cor2: '#ffffff' },     // Chapecoense
            288:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Ponte Preta
            315:  { cor1: '#ffd700', cor2: '#2a2a2a' },     // Novorizontino
            344:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Santa Cruz
            373:  { cor1: '#e42527', cor2: '#ffffff' },     // CRB
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
                            <span class="material-symbols-outlined" style="color: #ffd700;">emoji_events</span>
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

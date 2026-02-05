// =====================================================================
// manutencao-screen.js - Tela "Calma aê!" v2.0
// =====================================================================
// Exibe tela de manutenção amigável quando admin ativa o modo.
// v2.0: 3 botões - Ranking Geral, Ranking da Rodada, Dino Game
// =====================================================================

const ManutencaoScreen = {
    _ativo: false,
    _rankingGeralCarregado: false,
    _rankingRodadaCarregado: false,
    _observer: null,
    _config: null,
    _dinoAnimFrame: null,
    _dinoKeyHandler: null,
    _painelAtivo: null, // 'geral' | 'rodada' | 'dino'

    ativar(config = null) {
        if (this._ativo) return;
        this._ativo = true;
        this._config = config;

        const tela = document.getElementById('manutencaoScreen');
        if (!tela) return;

        // Aplicar customização se fornecida
        if (config && config.customizacao) {
            this._aplicarCustomizacao(tela, config.customizacao);
        }

        // Esconder app normal
        const container = document.querySelector('.participante-container');
        const bottomNav = document.querySelector('.bottom-nav-modern');
        if (container) container.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';

        // Esconder quick bar (pode já existir ou não)
        this._esconderQuickBar();

        // Observer para capturar Quick Bar se for renderizada DEPOIS
        this._observer = new MutationObserver(() => {
            this._esconderQuickBar();
        });
        this._observer.observe(document.body, { childList: true, subtree: false });

        // Mostrar tela de manutenção
        tela.style.display = 'flex';

        // Carregar notícias do time do coração automaticamente (se habilitado)
        const mostrarNoticias = config?.customizacao?.mostrar_noticias !== false;
        if (mostrarNoticias) {
            this._carregarNoticias();
        }

        if (window.Log) Log.info('MANUTENCAO', 'Tela de manutenção ativada', config);
    },

    _aplicarCustomizacao(tela, custom) {
        // Atualizar título (cor primária como accent)
        const titulo = tela.querySelector('h1');
        if (titulo && custom.titulo) {
            titulo.textContent = `${custom.emoji || '🛠️'} ${custom.titulo}`;
        }
        if (titulo && custom.cor_primaria) {
            titulo.style.color = custom.cor_primaria;
        }

        // Atualizar mensagem
        const mensagem = tela.querySelector('.manutencao-mensagem');
        if (mensagem && custom.mensagem) {
            mensagem.textContent = custom.mensagem;
        }

        // Aplicar cor primária como accent na borda do card (NÃO como fundo)
        const header = tela.querySelector('.manutencao-header');
        if (header && custom.cor_primaria) {
            header.style.borderColor = custom.cor_primaria + '40'; // 25% opacity
        }

        // Exibir imagem se houver
        if (custom.imagem_url) {
            const imagemContainer = tela.querySelector('.manutencao-imagem');
            if (imagemContainer) {
                imagemContainer.innerHTML = `<img src="${custom.imagem_url}" alt="Banner" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;margin-bottom:16px;">`;
                imagemContainer.style.display = 'block';
            }
        }

        // Controlar visibilidade de seções
        const noticiasContainer = document.getElementById('manutencaoNoticias');
        if (noticiasContainer) {
            noticiasContainer.style.display = custom.mostrar_noticias !== false ? 'block' : 'none';
        }

        // Atualizar visibilidade dos 3 botões
        const btnGeral = document.getElementById('manutencaoBtnRankingGeral');
        const btnRodada = document.getElementById('manutencaoBtnRankingRodada');
        if (btnGeral) {
            btnGeral.style.display = custom.mostrar_ranking !== false ? 'flex' : 'none';
        }
        if (btnRodada) {
            btnRodada.style.display = custom.mostrar_ultima_rodada !== false ? 'flex' : 'none';
        }
        // Dino game sempre visível durante manutenção
    },

    _esconderQuickBar() {
        document.querySelectorAll('.bottom-nav, .menu-overlay, .menu-sheet').forEach(el => {
            if (el.style.display !== 'none') {
                el.dataset.manutencaoHidden = '1';
                el.style.display = 'none';
            }
        });
    },

    desativar() {
        if (!this._ativo) return;
        this._ativo = false;

        // Parar observer
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        // Cleanup dino game
        if (this._dinoAnimFrame) {
            cancelAnimationFrame(this._dinoAnimFrame);
            this._dinoAnimFrame = null;
        }
        if (this._dinoKeyHandler) {
            document.removeEventListener('keydown', this._dinoKeyHandler);
            this._dinoKeyHandler = null;
        }

        const tela = document.getElementById('manutencaoScreen');
        if (tela) tela.style.display = 'none';

        // Restaurar app + quick bar
        const container = document.querySelector('.participante-container');
        const bottomNav = document.querySelector('.bottom-nav-modern');
        if (container) container.style.cssText = 'display:flex !important;flex-direction:column;';
        if (bottomNav) bottomNav.style.cssText = 'display:flex !important;';

        // Restaurar quick bar
        document.querySelectorAll('[data-manutencao-hidden]').forEach(el => {
            el.style.display = '';
            delete el.dataset.manutencaoHidden;
        });

        this._rankingGeralCarregado = false;
        this._rankingRodadaCarregado = false;
        this._painelAtivo = null;
        if (window.Log) Log.info('MANUTENCAO', 'Tela de manutenção desativada');
    },

    estaAtivo() {
        return this._ativo;
    },

    // =====================================================================
    // PAINEL 1: Ranking Geral (pontos acumulados + parciais)
    // =====================================================================
    async carregarRankingGeral() {
        const conteudo = document.getElementById('manutencaoConteudo');
        const dinoContainer = document.getElementById('manutencaoDinoContainer');
        const btn = document.getElementById('manutencaoBtnRankingGeral');
        if (!conteudo) return;

        // Esconder dino game se aberto
        this._fecharDinoGame();
        if (dinoContainer) dinoContainer.style.display = 'none';

        // Toggle se já carregado
        if (this._rankingGeralCarregado && this._painelAtivo === 'geral') {
            conteudo.style.display = 'none';
            this._painelAtivo = null;
            return;
        }

        // Se já carregou antes, só mostrar
        if (this._rankingGeralCarregado) {
            conteudo.style.display = 'block';
            this._painelAtivo = 'geral';
            return;
        }

        // Loading state
        if (btn) {
            btn.disabled = true;
            const btnText = btn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Carregando...';
        }

        conteudo.style.display = 'block';
        conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;">Carregando dados...</div>';

        try {
            const timeId = window.participanteAuth?.timeId;
            const temporada = window.participanteAuth?.temporada || new Date().getFullYear();
            const ligas = window.participanteAuth?.ligasDisponiveis || [];
            const ligaAtiva = window.participanteAuth?.ligaId;

            if (!ligaAtiva) {
                conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#f87171;">Faça login para ver seus dados</div>';
                return;
            }

            // Se tem multiplas ligas, mostrar tabs
            let html = '';
            if (ligas.length > 1) {
                html += this._renderizarTabsLigas(ligas, ligaAtiva, 'geral');
            }

            html += '<div id="manutencaoRankingContainer"></div>';
            conteudo.innerHTML = html;

            // Configurar tabs
            if (ligas.length > 1) {
                conteudo.querySelectorAll('.manut-liga-tab-geral').forEach(tab => {
                    tab.addEventListener('click', () => {
                        const lid = tab.dataset.ligaId;
                        conteudo.querySelectorAll('.manut-liga-tab-geral').forEach(t => t.style.background = '#374151');
                        tab.style.background = 'linear-gradient(135deg,#f97316,#ea580c)';
                        this._carregarRankingLiga(lid, timeId, temporada);
                    });
                });
            }

            // Carregar ranking da liga ativa
            await this._carregarRankingLiga(ligaAtiva, timeId, temporada);

            this._rankingGeralCarregado = true;
            this._painelAtivo = 'geral';
        } catch (error) {
            conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#f87171;">Erro ao carregar dados. Tente novamente.</div>';
            if (window.Log) Log.error('MANUTENCAO', 'Erro ao carregar ranking geral:', error);
        } finally {
            if (btn) {
                btn.disabled = false;
                const btnText = btn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Ranking Geral';
            }
        }
    },

    // =====================================================================
    // PAINEL 2: Ranking da Rodada (pontos só da rodada + escalação)
    // =====================================================================
    async carregarRankingRodada() {
        const conteudo = document.getElementById('manutencaoConteudo');
        const dinoContainer = document.getElementById('manutencaoDinoContainer');
        const btn = document.getElementById('manutencaoBtnRankingRodada');
        if (!conteudo) return;

        // Esconder dino game se aberto
        this._fecharDinoGame();
        if (dinoContainer) dinoContainer.style.display = 'none';

        // Toggle se já carregado e ativo
        if (this._rankingRodadaCarregado && this._painelAtivo === 'rodada') {
            conteudo.style.display = 'none';
            this._painelAtivo = null;
            return;
        }

        // Loading state
        if (btn) {
            btn.disabled = true;
            const btnText = btn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Carregando...';
        }

        conteudo.style.display = 'block';
        conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;">Carregando ranking da rodada...</div>';

        try {
            const timeId = window.participanteAuth?.timeId;
            const ligas = window.participanteAuth?.ligasDisponiveis || [];
            const ligaAtiva = window.participanteAuth?.ligaId;

            if (!ligaAtiva) {
                conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#f87171;">Faça login para ver seus dados</div>';
                return;
            }

            let html = '';
            if (ligas.length > 1) {
                html += this._renderizarTabsLigas(ligas, ligaAtiva, 'rodada');
            }
            html += '<div id="manutencaoRankingRodadaContainer"></div>';
            conteudo.innerHTML = html;

            // Configurar tabs para modo rodada
            if (ligas.length > 1) {
                conteudo.querySelectorAll('.manut-liga-tab-rodada').forEach(tab => {
                    tab.addEventListener('click', () => {
                        const lid = tab.dataset.ligaId;
                        conteudo.querySelectorAll('.manut-liga-tab-rodada').forEach(t => t.style.background = '#374151');
                        tab.style.background = 'linear-gradient(135deg,#f97316,#ea580c)';
                        this._carregarRankingRodadaLiga(lid, timeId);
                    });
                });
            }

            await this._carregarRankingRodadaLiga(ligaAtiva, timeId);

            this._rankingRodadaCarregado = true;
            this._painelAtivo = 'rodada';
        } catch (error) {
            conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#f87171;">Erro ao carregar dados. Tente novamente.</div>';
            if (window.Log) Log.error('MANUTENCAO', 'Erro ao carregar ranking rodada:', error);
        } finally {
            if (btn) {
                btn.disabled = false;
                const btnText = btn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Ranking da Rodada';
            }
        }
    },

    async _carregarRankingRodadaLiga(ligaId, timeId) {
        const container = document.getElementById('manutencaoRankingRodadaContainer');
        if (!container) return;

        container.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;"><span class="material-icons" style="animation:spin 1s linear infinite;font-size:24px;">autorenew</span><div style="margin-top:8px;font-size:0.8rem;">Buscando ranking da rodada...</div></div>';

        try {
            const parciaisRes = await fetch(`/api/matchday/parciais/${ligaId}`).then(r => r.ok ? r.json() : null);

            if (!parciaisRes || !parciaisRes.disponivel || !parciaisRes.ranking?.length) {
                const motivo = parciaisRes?.motivo === 'mercado_aberto'
                    ? 'Mercado aberto - aguarde o início da rodada'
                    : 'Dados da rodada ainda indisponíveis';
                container.innerHTML = `<div style="text-align:center;padding:16px;color:#9ca3af;">${motivo}</div>`;
                return;
            }

            // Buscar dados dos atletas do participante logado (em paralelo)
            let atletasInfo = null;
            if (timeId && parciaisRes.rodada) {
                try {
                    const [escRes, pontRes] = await Promise.all([
                        fetch(`/api/cartola/time/id/${timeId}/${parciaisRes.rodada}`).then(r => r.ok ? r.json() : null),
                        fetch(`/api/cartola/atletas/pontuados`).then(r => r.ok ? r.json() : null)
                    ]);

                    if (escRes?.atletas?.length && pontRes?.atletas) {
                        const meusAtletaIds = escRes.atletas.map(a => a.atleta_id);
                        const pontuados = pontRes.atletas;
                        const emCampo = meusAtletaIds.filter(id => pontuados[id]?.entrou_em_campo === true).length;
                        atletasInfo = { total: meusAtletaIds.length, emCampo };
                    }
                } catch (e) {
                    console.warn('[MANUTENCAO] Não foi possível buscar dados dos atletas:', e);
                }
            }

            container.innerHTML = this._renderizarRankingRodada(parciaisRes, timeId, atletasInfo);
        } catch (error) {
            console.error('[MANUTENCAO] Erro ao carregar ranking da rodada:', error);
            container.innerHTML = '<div style="text-align:center;padding:12px;color:#f87171;">Erro ao carregar ranking da rodada</div>';
        }
    },

    _renderizarRankingRodada(data, timeIdLogado, atletasInfo = null) {
        const ranking = data.ranking || [];
        if (!ranking.length) return '<div style="padding:12px;color:#9ca3af;text-align:center;">Ranking da rodada indisponível</div>';

        // Ordenar por pontos da rodada (não acumulado)
        const rankingRodada = [...ranking].sort((a, b) => (b.pontos_rodada_atual || 0) - (a.pontos_rodada_atual || 0));
        rankingRodada.forEach((item, idx) => item._posRodada = idx + 1);

        const rodadaAtual = data.rodada || '?';
        const atualizadoEm = data.atualizado_em ? new Date(data.atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

        let html = '';

        // Card do user (pontos da rodada)
        const userItem = rankingRodada.find(r => String(r.timeId) === String(timeIdLogado));
        if (userItem && (userItem.pontos_rodada_atual || 0) > 0) {
            const userClubeId = userItem.clube_id || null;
            const userEscudo = userClubeId ? `<img src="/escudos/${userClubeId}.png" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:6px;" onerror="this.style.display='none'">` : '';
            const userNome = userItem.nome_cartola || userItem.nome_time || '';
            html += `
            <div style="background:linear-gradient(135deg,#1e3a5f,#172554);border-radius:14px;padding:16px;border:1px solid #2563eb40;margin-bottom:16px;">
                ${userNome ? `<div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:12px;">${userEscudo}<span style="font-size:0.85rem;color:#93c5fd;font-weight:600;">${userNome}</span></div>` : ''}
                <div style="display:flex;justify-content:space-around;text-align:center;">
                    <div>
                        <div style="font-size:0.7rem;color:#93c5fd;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Posição Rodada</div>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:1.75rem;color:#fbbf24;font-weight:700;">${userItem._posRodada}º</div>
                    </div>
                    <div style="width:1px;background:#374151;"></div>
                    <div>
                        <div style="font-size:0.7rem;color:#93c5fd;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Pts Rodada</div>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:1.75rem;color:#e5e7eb;font-weight:700;">${Number(userItem.pontos_rodada_atual || 0).toFixed(2)}</div>
                    </div>
                </div>
            </div>`;
        }

        // Badge: info dos atletas do participante logado
        if (atletasInfo) {
            const { total, emCampo } = atletasInfo;
            const faltam = total - emCampo;
            const todosJogaram = faltam === 0 && emCampo > 0;

            const mensagem = todosJogaram
                ? 'Todos os seus jogadores já entraram em campo ✅'
                : `${emCampo} jogadores seus já entraram em campo. Faltam ${faltam} jogar`;
            const cor = todosJogaram ? '#34d399' : '#fbbf24';
            const bgCor = todosJogaram ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)';

            html += `
            <div style="text-align:center;margin-bottom:12px;">
                <span style="font-size:0.78rem;color:${cor};background:${bgCor};padding:5px 14px;border-radius:999px;font-family:'Inter',sans-serif;line-height:1.5;">
                    ⚽ ${mensagem}
                </span>
            </div>`;
        }

        // Tabela
        html += `
            <div style="margin-bottom:16px;">
                <h3 style="font-family:'Russo One',sans-serif;font-size:1rem;color:#34d399;margin:0 0 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="material-icons" style="font-size:20px;">leaderboard</span>
                    Ranking da Rodada ${rodadaAtual}
                    <span style="font-size:0.7rem;color:#34d399;font-weight:400;font-family:'Inter',sans-serif;background:rgba(52,211,153,0.12);padding:2px 8px;border-radius:999px;">Parcial</span>
                    ${atualizadoEm ? `<span style="font-size:0.65rem;color:#6b7280;font-weight:400;font-family:'Inter',sans-serif;margin-left:auto;">🕐 ${atualizadoEm}</span>` : ''}
                </h3>
                <div style="background:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                        <thead>
                            <tr style="background:#111827;">
                                <th style="padding:10px 6px;text-align:center;color:#9ca3af;font-weight:600;width:36px;">#</th>
                                <th style="padding:10px 6px;text-align:left;color:#9ca3af;font-weight:600;">Participante</th>
                                <th style="padding:10px 6px;text-align:center;color:#9ca3af;font-weight:600;width:30px;" title="Escalou">⚽</th>
                                <th style="padding:10px 6px;text-align:right;color:#9ca3af;font-weight:600;width:65px;">Pts</th>
                            </tr>
                        </thead>
                        <tbody>`;

        rankingRodada.forEach((item, idx) => {
            const pos = item._posRodada;
            const nomeCartola = item.nome_cartola || item.nome_time || 'Time';
            const nomeTime = item.nome_time || '';
            const clubeId = item.clube_id || null;
            const pontosRodada = item.pontos_rodada_atual ?? 0;
            const isUser = String(item.timeId) === String(timeIdLogado);
            const escalouIcon = item.escalou ? '✅' : '❌';

            const bgColor = isUser ? '#1e3a5f' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)');
            const borderLeft = isUser ? '3px solid #34d399' : '3px solid transparent';
            const fontWeight = isUser ? '700' : '400';
            const textColor = isUser ? '#fbbf24' : '#e5e7eb';

            let posDisplay = pos;
            if (pos === 1) posDisplay = '🥇';
            else if (pos === 2) posDisplay = '🥈';
            else if (pos === 3) posDisplay = '🥉';

            const escudoHtml = clubeId
                ? `<img src="/escudos/${clubeId}.png" alt="" style="width:20px;height:20px;object-fit:contain;border-radius:4px;flex-shrink:0;" onerror="this.style.display='none'">`
                : '';

            html += `
                <tr style="background:${bgColor};border-left:${borderLeft};">
                    <td style="padding:7px 6px;text-align:center;font-family:'JetBrains Mono',monospace;color:${textColor};font-weight:${fontWeight};">${posDisplay}</td>
                    <td style="padding:7px 6px;max-width:140px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${escudoHtml}
                            <div style="min-width:0;">
                                <div style="color:${textColor};font-weight:${fontWeight};font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nomeCartola}</div>
                                ${nomeTime && nomeTime !== nomeCartola ? `<div style="color:#6b7280;font-size:0.68rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nomeTime}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td style="padding:7px 6px;text-align:center;font-size:0.75rem;">${escalouIcon}</td>
                    <td style="padding:7px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:${textColor};font-weight:${fontWeight};">${Number(pontosRodada).toFixed(2)}</td>
                </tr>`;
        });

        html += `</tbody></table></div></div>`;
        return html;
    },

    // =====================================================================
    // PAINEL 3: Cobrança de Pênalti (arcade 8-bit)
    // =====================================================================
    abrirDinoGame() {
        const conteudo = document.getElementById('manutencaoConteudo');
        const dinoContainer = document.getElementById('manutencaoDinoContainer');
        if (!dinoContainer) return;

        // Esconder ranking se aberto
        if (conteudo) conteudo.style.display = 'none';

        // Toggle
        if (this._painelAtivo === 'dino') {
            this._fecharDinoGame();
            dinoContainer.style.display = 'none';
            this._painelAtivo = null;
            return;
        }

        this._painelAtivo = 'dino';
        dinoContainer.style.display = 'block';
        dinoContainer.innerHTML = `
            <div style="text-align:center;margin-bottom:12px;">
                <h3 style="font-family:'Russo One',sans-serif;font-size:1rem;color:#fb923c;margin:0 0 8px;">
                    ⚽ Cobrança de Pênalti
                </h3>
                <p style="font-size:0.75rem;color:#9ca3af;margin:0;">
                    Toque no canto do gol para chutar!
                </p>
            </div>
            <canvas id="dinoCanvas" width="360" height="220"
                style="display:block;margin:0 auto;background:#0f172a;border-radius:12px;border:1px solid #374151;max-width:100%;touch-action:none;"></canvas>
            <div id="dinoScore" style="text-align:center;margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:#fbbf24;">
                ⚽ 0 gols | Cobrança 1
            </div>
            <div style="text-align:center;margin-top:6px;">
                <button onclick="window.ManutencaoScreen && ManutencaoScreen.abrirDinoGame()"
                    style="background:none;border:none;color:#6b7280;font-size:0.75rem;cursor:pointer;font-family:'Inter',sans-serif;text-decoration:underline;">
                    Fechar jogo
                </button>
            </div>
        `;

        this._iniciarDinoGame();
    },

    _fecharDinoGame() {
        if (this._dinoAnimFrame) {
            cancelAnimationFrame(this._dinoAnimFrame);
            this._dinoAnimFrame = null;
        }
        if (this._dinoKeyHandler) {
            document.removeEventListener('keydown', this._dinoKeyHandler);
            this._dinoKeyHandler = null;
        }
    },

    _iniciarDinoGame() {
        const canvas = document.getElementById('dinoCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        this._fecharDinoGame();

        const W = canvas.width;
        const H = canvas.height;

        // Layout
        const goalTop = 28;
        const goalH = 65;
        const goalW = 240;
        const goalL = (W - goalW) / 2;
        const goalR = goalL + goalW;
        const goalB = goalTop + goalH;
        const grassY = goalB + 4;
        const zoneW = goalW / 3;

        // Ball
        const ballStartX = W / 2;
        const ballStartY = H - 30;
        const ballR = 7;

        // Keeper
        const kW = 28;
        const kH = 38;
        const kBaseY = goalB - kH - 2;
        const kBaseX = W / 2 - kW / 2;

        // State
        let state = 'aiming';
        let gols = 0;
        let cobradas = 0;
        let defesas = 0;
        const totalCobradas = 5;
        let resultado = '';
        let resultTimer = 0;
        let chosenZone = -1;
        let keeperZone = -1;
        let hoverZone = -1;
        let ballAnim = { sx: 0, sy: 0, tx: 0, ty: 0, p: 0 };
        let keeperAnim = { sx: 0, tx: 0, p: 0 };
        let keeperX = kBaseX;
        let frame = 0;

        const getAccuracy = () => Math.min(0.55, 0.15 + cobradas * 0.025);

        const resetGame = () => {
            gols = 0; cobradas = 0; defesas = 0;
            state = 'aiming'; keeperX = kBaseX;
            resultado = ''; hoverZone = -1;
        };

        const shoot = (zone) => {
            if (state !== 'aiming') return;
            chosenZone = zone;

            // Keeper AI
            if (Math.random() < getAccuracy()) {
                keeperZone = chosenZone;
            } else {
                const opts = [0, 1, 2].filter(z => z !== chosenZone);
                keeperZone = opts[Math.floor(Math.random() * opts.length)];
            }

            const targetX = goalL + zone * zoneW + zoneW / 2;
            const targetY = goalTop + goalH * 0.45;
            ballAnim = { sx: ballStartX, sy: ballStartY, tx: targetX, ty: targetY, p: 0 };

            const kTarget = goalL + keeperZone * zoneW + zoneW / 2 - kW / 2;
            keeperAnim = { sx: keeperX, tx: kTarget, p: 0 };

            state = 'shooting';
        };

        // Input
        const getCanvasPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const sx = W / rect.width;
            const sy = H / rect.height;
            const cx = e.clientX || e.touches?.[0]?.clientX || 0;
            const cy = e.clientY || e.touches?.[0]?.clientY || 0;
            return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
        };

        const handleClick = (e) => {
            const pos = getCanvasPos(e);

            if (state === 'gameover') { resetGame(); return; }
            if (state === 'result') { state = 'aiming'; keeperX = kBaseX; hoverZone = -1; return; }

            if (state === 'aiming' && pos.y >= goalTop && pos.y <= goalB + 20 && pos.x >= goalL - 10 && pos.x <= goalR + 10) {
                const zone = Math.min(2, Math.max(0, Math.floor((pos.x - goalL) / zoneW)));
                shoot(zone);
            }
        };

        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(e); });
        canvas.addEventListener('mousemove', (e) => {
            if (state !== 'aiming') { hoverZone = -1; return; }
            const pos = getCanvasPos(e);
            if (pos.y >= goalTop && pos.y <= goalB + 20 && pos.x >= goalL - 10 && pos.x <= goalR + 10) {
                hoverZone = Math.min(2, Math.max(0, Math.floor((pos.x - goalL) / zoneW)));
            } else { hoverZone = -1; }
        });

        const keyHandler = (e) => {
            if (state === 'aiming') {
                if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); shoot(0); }
                else if (e.key === 'ArrowUp' || e.key === 's' || e.key === 'ArrowDown') { e.preventDefault(); shoot(1); }
                else if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); shoot(2); }
            } else if (state === 'result' || state === 'gameover') {
                if (e.code === 'Space' || e.key === ' ') {
                    e.preventDefault();
                    if (state === 'gameover') resetGame();
                    else { state = 'aiming'; keeperX = kBaseX; hoverZone = -1; }
                }
            }
        };
        document.addEventListener('keydown', keyHandler);
        this._dinoKeyHandler = keyHandler;

        // Draw helpers
        const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

        const drawGoal = () => {
            // Grass
            px(0, grassY, W, H - grassY, '#166534');
            ctx.fillStyle = '#15803d';
            for (let i = 0; i < W; i += 18) px(i, grassY + 4, 9, H - grassY - 4, '#15803d');

            // Penalty spot
            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath();
            ctx.arc(W / 2, ballStartY + 12, 2, 0, Math.PI * 2);
            ctx.fill();

            // Net background
            px(goalL, goalTop, goalW, goalH, '#1e293b');

            // Net mesh
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.7;
            for (let x = goalL; x <= goalR; x += 12) {
                ctx.beginPath(); ctx.moveTo(x, goalTop); ctx.lineTo(x, goalB); ctx.stroke();
            }
            for (let y = goalTop; y <= goalB; y += 10) {
                ctx.beginPath(); ctx.moveTo(goalL, y); ctx.lineTo(goalR, y); ctx.stroke();
            }

            // Zone highlights
            if (state === 'aiming') {
                for (let i = 0; i < 3; i++) {
                    const zx = goalL + i * zoneW;
                    if (hoverZone === i) {
                        px(zx + 1, goalTop + 1, zoneW - 2, goalH - 2, 'rgba(251,191,36,0.25)');
                    }
                    if (i > 0) {
                        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                        ctx.setLineDash([3, 3]);
                        ctx.beginPath(); ctx.moveTo(zx, goalTop); ctx.lineTo(zx, goalB); ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }

            // Posts
            px(goalL - 4, goalTop - 4, goalW + 8, 5, '#e5e7eb');
            px(goalL - 4, goalTop, 5, goalH + 2, '#e5e7eb');
            px(goalR - 1, goalTop, 5, goalH + 2, '#e5e7eb');
        };

        const drawKeeper = (x, y, diving) => {
            const diveDir = keeperZone === 0 ? -1 : keeperZone === 2 ? 1 : 0;
            const dp = diving ? Math.min(keeperAnim.p * 2, 1) : 0;

            // Jersey (orange)
            px(x + 6, y + 10, 16, 14, '#fb923c');
            // Head
            px(x + 8, y + 1, 12, 10, '#fcd34d');
            // Hair
            px(x + 8, y, 12, 3, '#92400e');

            if (diving && diveDir !== 0) {
                // Diving arms stretched
                const armX = diveDir < 0 ? x - 10 * dp : x + kW - 2;
                const armW = 12 * dp;
                px(armX, y + 8, armW, 5, '#fb923c');
                // Gloves
                const gloveX = diveDir < 0 ? armX - 4 : armX + armW;
                px(gloveX, y + 6, 5, 7, '#22c55e');
            } else {
                // Arms up
                px(x + 1, y + 4, 5, 14, '#fb923c');
                px(x + kW - 6, y + 4, 5, 14, '#fb923c');
                // Gloves
                px(x - 1, y + 1, 5, 6, '#22c55e');
                px(x + kW - 4, y + 1, 5, 6, '#22c55e');
            }

            // Shorts
            px(x + 6, y + 24, 16, 6, '#111827');
            // Legs
            px(x + 7, y + 30, 5, 7, '#fcd34d');
            px(x + 16, y + 30, 5, 7, '#fcd34d');
            // Boots
            px(x + 6, y + 36, 7, 3, '#111827');
            px(x + 15, y + 36, 7, 3, '#111827');
        };

        const drawBall = (x, y, r) => {
            ctx.fillStyle = '#f5f5f5';
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#374151';
            ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fill();
        };

        // Game loop
        const loop = () => {
            frame++;
            ctx.clearRect(0, 0, W, H);

            // Sky
            px(0, 0, W, H, '#0f172a');

            // Stadium lights
            px(15, 3, 4, 4, '#fbbf24'); px(W - 19, 3, 4, 4, '#fbbf24');
            px(12, 0, 10, 10, 'rgba(251,191,36,0.06)');
            px(W - 22, 0, 10, 10, 'rgba(251,191,36,0.06)');

            // Crowd (pixel dots)
            ctx.fillStyle = '#1e293b';
            for (let i = 0; i < W; i += 6) {
                const crowdH = 8 + Math.sin(i * 0.5 + frame * 0.03) * 2;
                px(i, goalTop - 12 + (i % 3), 4, crowdH, i % 12 < 6 ? '#1e293b' : '#334155');
            }

            drawGoal();

            // Keeper
            if (state === 'shooting' || state === 'result') {
                keeperAnim.p = Math.min(1, keeperAnim.p + 0.07);
                const kx = keeperAnim.sx + (keeperAnim.tx - keeperAnim.sx) * keeperAnim.p;
                drawKeeper(kx, kBaseY, keeperAnim.p > 0.2);
            } else if (state === 'aiming') {
                // Keeper idle sway
                const sway = Math.sin(frame * 0.05) * 3;
                drawKeeper(kBaseX + sway, kBaseY, false);
            }

            // Ball
            if (state === 'aiming') {
                drawBall(ballStartX, ballStartY, ballR);

                // Prompt
                ctx.fillStyle = '#fbbf24';
                ctx.font = "bold 11px 'Russo One', sans-serif";
                ctx.textAlign = 'center';
                ctx.fillText('ESCOLHA O CANTO!', W / 2, H - 8);

                // Zone arrows
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.font = "10px 'Inter', sans-serif";
                ctx.fillText('⬅', goalL + zoneW * 0.5, goalB + 14);
                ctx.fillText('⬆', goalL + zoneW * 1.5, goalB + 14);
                ctx.fillText('➡', goalL + zoneW * 2.5, goalB + 14);

            } else if (state === 'shooting') {
                ballAnim.p = Math.min(1, ballAnim.p + 0.055);
                const bx = ballAnim.sx + (ballAnim.tx - ballAnim.sx) * ballAnim.p;
                // Arc trajectory (ball goes up then into goal)
                const arc = Math.sin(ballAnim.p * Math.PI) * 30;
                const by = ballAnim.sy + (ballAnim.ty - ballAnim.sy) * ballAnim.p - arc;
                const br = ballR * (1 - ballAnim.p * 0.35);

                drawBall(bx, by, br);

                if (ballAnim.p >= 1) {
                    cobradas++;
                    if (chosenZone === keeperZone && Math.random() < 0.65) {
                        resultado = 'DEFESA!';
                        defesas++;
                    } else {
                        resultado = 'GOOOL!';
                        gols++;
                    }
                    resultTimer = 0;
                    state = cobradas >= totalCobradas ? 'gameover' : 'result';
                }
            }

            // Result flash
            if (state === 'result') {
                resultTimer++;
                const isGol = resultado === 'GOOOL!';
                const flash = Math.sin(resultTimer * 0.15) * 0.15 + 0.15;
                px(0, 0, W, H, isGol ? `rgba(34,197,94,${flash})` : `rgba(239,68,68,${flash})`);

                // Ball stuck in net
                drawBall(ballAnim.tx, ballAnim.ty, ballR * 0.65);

                ctx.fillStyle = isGol ? '#22c55e' : '#ef4444';
                ctx.font = "bold 26px 'Russo One', sans-serif";
                ctx.textAlign = 'center';
                ctx.fillText(resultado, W / 2, H / 2 + 30);

                ctx.fillStyle = '#9ca3af';
                ctx.font = "11px 'Inter', sans-serif";
                ctx.fillText('Toque para continuar', W / 2, H / 2 + 50);
            }

            // Game over
            if (state === 'gameover') {
                px(0, 0, W, H, 'rgba(0,0,0,0.75)');

                // Rating por desempenho
                let rating, ratingColor;
                if (gols === 5) { rating = 'CRAQUE! ⭐'; ratingColor = '#fbbf24'; }
                else if (gols === 4) { rating = 'Muito bom!'; ratingColor = '#22c55e'; }
                else if (gols === 3) { rating = 'Bom!'; ratingColor = '#34d399'; }
                else if (gols === 2) { rating = 'Precisa treinar...'; ratingColor = '#f59e0b'; }
                else if (gols === 1) { rating = 'Perna de pau!'; ratingColor = '#f87171'; }
                else { rating = 'Caneleiro!'; ratingColor = '#ef4444'; }

                ctx.fillStyle = '#fb923c';
                ctx.font = "bold 20px 'Russo One', sans-serif";
                ctx.textAlign = 'center';
                ctx.fillText('FIM DE JOGO', W / 2, H / 2 - 25);

                // Placar estilo scoreboard
                ctx.fillStyle = '#fbbf24';
                ctx.font = "bold 28px 'JetBrains Mono', monospace";
                ctx.fillText(`${gols} / ${totalCobradas}`, W / 2, H / 2 + 8);

                ctx.fillStyle = ratingColor;
                ctx.font = "bold 14px 'Russo One', sans-serif";
                ctx.fillText(rating, W / 2, H / 2 + 30);

                ctx.fillStyle = '#9ca3af';
                ctx.font = "11px 'Inter', sans-serif";
                ctx.fillText('Toque para jogar novamente', W / 2, H / 2 + 52);
            }

            // HUD
            if (state !== 'gameover') {
                px(0, 0, W, 18, 'rgba(0,0,0,0.6)');
                ctx.font = "bold 10px 'JetBrains Mono', monospace";
                ctx.fillStyle = '#22c55e';
                ctx.textAlign = 'left';
                ctx.fillText(`⚽ ${gols}`, 8, 13);

                // Round dots (filled = played, hollow = remaining)
                ctx.textAlign = 'center';
                const dotStartX = W / 2 - (totalCobradas * 14) / 2;
                for (let i = 0; i < totalCobradas; i++) {
                    const dx = dotStartX + i * 14 + 7;
                    ctx.beginPath();
                    ctx.arc(dx, 10, 4, 0, Math.PI * 2);
                    if (i < cobradas) {
                        // Played: green=gol, red=miss
                        ctx.fillStyle = i < gols + defesas ? (i < cobradas - defesas + (cobradas <= gols ? 0 : 0) ? '#22c55e' : '#ef4444') : '#22c55e';
                    } else {
                        ctx.fillStyle = 'transparent';
                    }
                    // Simpler: just show filled for done, hollow for pending
                    if (i < cobradas) {
                        ctx.fillStyle = '#e5e7eb';
                        ctx.fill();
                    } else {
                        ctx.strokeStyle = '#6b7280';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }

                ctx.fillStyle = '#ef4444';
                ctx.textAlign = 'right';
                ctx.font = "bold 10px 'JetBrains Mono', monospace";
                ctx.fillText(`❌ ${defesas}`, W - 8, 13);
            }

            // Score div
            const scoreEl = document.getElementById('dinoScore');
            if (scoreEl) {
                const atual = cobradas + (state === 'aiming' ? 1 : 0);
                scoreEl.textContent = state === 'gameover'
                    ? `⚽ ${gols} de ${totalCobradas} gols`
                    : `⚽ ${gols} gols | Cobrança ${atual} de ${totalCobradas}`;
            }

            this._dinoAnimFrame = requestAnimationFrame(loop);
        };

        this._dinoAnimFrame = requestAnimationFrame(loop);
    },

    // =====================================================================
    // Métodos compartilhados (Ranking Geral - lógica existente preservada)
    // =====================================================================
    async _carregarNoticias() {
        try {
            // Obter clube_id do participante autenticado
            const clubeId = window.participanteAuth?.participante?.participante?.clube_id
                         || window.participanteAuth?.participante?.clube_id
                         || null;

            if (!clubeId || !window.NoticiasTime) {
                if (window.Log) Log.debug('MANUTENCAO', 'Notícias: sem clube_id ou componente não carregado');
                return;
            }

            await window.NoticiasTime.renderizar({
                clubeId,
                containerId: 'manutencaoNoticias',
                limite: 5,
                modo: 'compacto'
            });

            if (window.Log) Log.info('MANUTENCAO', 'Notícias do time carregadas');
        } catch (error) {
            if (window.Log) Log.warn('MANUTENCAO', 'Erro ao carregar notícias:', error);
        }
    },

    _renderizarTabsLigas(ligas, ligaAtiva, mode = 'geral') {
        const tabClass = `manut-liga-tab-${mode}`;
        let html = `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;justify-content:center;">`;
        ligas.forEach(liga => {
            const isActive = String(liga._id || liga.id) === String(ligaAtiva);
            const bg = isActive ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#374151';
            const nome = liga.nome || liga.name || 'Liga';
            html += `<button class="${tabClass}" data-liga-id="${liga._id || liga.id}"
                style="background:${bg};color:white;border:none;padding:8px 16px;border-radius:10px;font-size:0.8rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;">
                ${nome}
            </button>`;
        });
        html += `</div>`;
        return html;
    },

    async _carregarRankingLiga(ligaId, timeId, temporada) {
        const container = document.getElementById('manutencaoRankingContainer');
        if (!container) return;

        container.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;"><span class="material-icons" style="animation:spin 1s linear infinite;font-size:24px;">autorenew</span><div style="margin-top:8px;font-size:0.8rem;">Buscando pontos dos participantes...</div></div>';

        try {
            // 1) Tentar parciais (pontos em tempo real da API Cartola)
            let dados = null;
            let parciaisRes = null;
            try {
                parciaisRes = await fetch(`/api/matchday/parciais/${ligaId}`).then(r => r.ok ? r.json() : null);
                if (parciaisRes && parciaisRes.disponivel && parciaisRes.ranking?.length) {
                    dados = {
                        success: true,
                        ranking: parciaisRes.ranking,
                        rodada_atual: parciaisRes.rodada,
                        parcial: true,
                        status: 'parcial',
                        atualizado_em: parciaisRes.atualizado_em
                    };
                    console.log('[MANUTENCAO] Pontos carregados via parciais:', parciaisRes.ranking.length, 'times');
                }
            } catch (e) {
                console.warn('[MANUTENCAO] Parciais indisponível, tentando ranking-turno...', e);
            }

            // 2) Fallback: ranking-turno (cache consolidado)
            if (!dados) {
                const rankingRes = await fetch(`/api/ranking-turno/${ligaId}?turno=geral&temporada=${temporada}`).then(r => r.ok ? r.json() : null);

                const cacheAtualizado = rankingRes?.rodada_atual >= (parciaisRes?.rodada || 1);

                if (rankingRes?.success && rankingRes.ranking?.length && cacheAtualizado) {
                    dados = rankingRes;
                    console.log('[MANUTENCAO] Pontos carregados via ranking-turno:', rankingRes.ranking.length, 'times');
                } else if (rankingRes && !cacheAtualizado) {
                    console.warn('[MANUTENCAO] Ranking-turno desatualizado! Cache rodada:', rankingRes.rodada_atual, 'Real:', parciaisRes?.rodada);
                }
            }

            if (!dados || !dados.ranking?.length) {
                container.innerHTML = '<div style="text-align:center;padding:16px;color:#9ca3af;">Ranking ainda sem dados para esta liga</div>';
                return;
            }

            container.innerHTML = this._renderizarRanking(dados, timeId);
        } catch (error) {
            console.error('[MANUTENCAO] Erro ao carregar ranking:', error);
            container.innerHTML = '<div style="text-align:center;padding:12px;color:#f87171;">Erro ao carregar ranking</div>';
        }
    },

    _renderizarRanking(data, timeIdLogado) {
        if (!data || !data.success) return '<div style="padding:12px;color:#9ca3af;text-align:center;">Ranking indisponível</div>';

        const ranking = data.ranking || [];
        if (!ranking.length) return '<div style="padding:12px;color:#9ca3af;text-align:center;">Ranking ainda sem dados</div>';

        const rodadaAtual = data.rodada_atual || '?';
        const isParcial = data.parcial || data.status === 'parcial';
        const atualizadoEm = data.atualizado_em ? new Date(data.atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

        // Detectar se API Cartola está em manutenção (todos escalou: false e pontos 0)
        const todosZerados = ranking.every(r => r.escalou === false && r.pontos === 0);
        const temPontos = ranking.some(r => r.pontos > 0);

        let html = '';

        // Aviso quando API Cartola está em manutenção
        if (todosZerados) {
            html += `
            <div style="background:linear-gradient(135deg,#92400e,#78350f);border-radius:14px;padding:16px;border:1px solid #f59e0b40;margin-bottom:16px;text-align:center;">
                <div style="font-size:1.5rem;margin-bottom:8px;">🛠️</div>
                <div style="font-family:'Russo One',sans-serif;font-size:0.95rem;color:#fbbf24;margin-bottom:6px;">API do Cartola em Manutenção</div>
                <div style="font-size:0.78rem;color:#fde68a;line-height:1.4;">
                    Os pontos da Rodada ${rodadaAtual} serão exibidos assim que a API do Cartola voltar ao ar.
                    Por enquanto, veja os participantes da liga:
                </div>
            </div>`;
        }

        // Card com posição do user (se encontrado e tem pontos)
        const userItem = ranking.find(r => String(r.timeId) === String(timeIdLogado));
        if (userItem && temPontos) {
            const userClubeId = userItem.clube_id || null;
            const userEscudo = userClubeId ? `<img src="/escudos/${userClubeId}.png" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:6px;" onerror="this.style.display='none'">` : '';
            const userNome = userItem.nome_cartola || userItem.nome_time || '';
            html += `
            <div style="background:linear-gradient(135deg,#1e3a5f,#172554);border-radius:14px;padding:16px;border:1px solid #2563eb40;margin-bottom:16px;">
                ${userNome ? `<div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:12px;">${userEscudo}<span style="font-size:0.85rem;color:#93c5fd;font-weight:600;">${userNome}</span></div>` : ''}
                <div style="display:flex;justify-content:space-around;text-align:center;">
                    <div>
                        <div style="font-size:0.7rem;color:#93c5fd;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Sua posição</div>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:1.75rem;color:#fbbf24;font-weight:700;">${userItem.posicao}º</div>
                    </div>
                    <div style="width:1px;background:#374151;"></div>
                    <div>
                        <div style="font-size:0.7rem;color:#93c5fd;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Pontos</div>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:1.75rem;color:#e5e7eb;font-weight:700;">${Number(userItem.pontos).toFixed(2)}</div>
                    </div>
                    <div style="width:1px;background:#374151;"></div>
                    <div>
                        <div style="font-size:0.7rem;color:#93c5fd;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Rodada</div>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:1.75rem;color:#e5e7eb;font-weight:700;">${rodadaAtual}</div>
                    </div>
                </div>
            </div>`;
        }

        // Status labels
        const statusLabel = todosZerados ? 'Aguardando' : (isParcial ? 'Parcial' : 'Consolidado');
        const statusColor = todosZerados ? '#f59e0b' : (isParcial ? '#34d399' : '#9ca3af');

        // Tabela de ranking/participantes
        const tituloTabela = todosZerados ? `Participantes - Rodada ${rodadaAtual}` : `Ranking Geral - Rodada ${rodadaAtual}`;
        html += `
            <div style="margin-bottom:16px;">
                <h3 style="font-family:'Russo One',sans-serif;font-size:1rem;color:#fb923c;margin:0 0 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="material-icons" style="font-size:20px;">${todosZerados ? 'groups' : 'emoji_events'}</span>
                    ${tituloTabela}
                    <span style="font-size:0.7rem;color:${statusColor};font-weight:400;font-family:'Inter',sans-serif;background:${statusColor}20;padding:2px 8px;border-radius:999px;">${statusLabel}</span>
                    ${atualizadoEm ? `<span style="font-size:0.65rem;color:#6b7280;font-weight:400;font-family:'Inter',sans-serif;margin-left:auto;">🕐 ${atualizadoEm}</span>` : ''}
                </h3>
                <div style="background:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                        <thead>
                            <tr style="background:#111827;">
                                <th style="padding:10px 6px;text-align:center;color:#9ca3af;font-weight:600;width:36px;">#</th>
                                <th style="padding:10px 6px;text-align:left;color:#9ca3af;font-weight:600;">Participante</th>
                                ${!todosZerados ? '<th style="padding:10px 6px;text-align:right;color:#9ca3af;font-weight:600;width:65px;">Pontos</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>`;

        ranking.forEach((item, idx) => {
            const pos = item.posicao || (idx + 1);
            const nomeCartola = item.nome_cartola || item.nome_time || 'Time';
            const nomeTime = item.nome_time || '';
            const clubeId = item.clube_id || null;
            const pontos = item.pontos ?? 0;
            const isUser = String(item.timeId) === String(timeIdLogado);

            const bgColor = isUser ? '#1e3a5f' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)');
            const borderLeft = isUser ? '3px solid #fb923c' : '3px solid transparent';
            const fontWeight = isUser ? '700' : '400';
            const textColor = isUser ? '#fbbf24' : '#e5e7eb';

            let posDisplay = pos;
            if (!todosZerados) {
                if (pos === 1) posDisplay = '🥇';
                else if (pos === 2) posDisplay = '🥈';
                else if (pos === 3) posDisplay = '🥉';
            }

            const escudoHtml = clubeId
                ? `<img src="/escudos/${clubeId}.png" alt="" style="width:20px;height:20px;object-fit:contain;border-radius:4px;flex-shrink:0;" onerror="this.style.display='none'">`
                : '';

            html += `
                <tr style="background:${bgColor};border-left:${borderLeft};">
                    <td style="padding:7px 6px;text-align:center;font-family:'JetBrains Mono',monospace;color:${textColor};font-weight:${fontWeight};">${posDisplay}</td>
                    <td style="padding:7px 6px;max-width:180px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${escudoHtml}
                            <div style="min-width:0;">
                                <div style="color:${textColor};font-weight:${fontWeight};font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nomeCartola}</div>
                                ${nomeTime && nomeTime !== nomeCartola ? `<div style="color:#6b7280;font-size:0.68rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nomeTime}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    ${!todosZerados ? `<td style="padding:7px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:${textColor};font-weight:${fontWeight};">${Number(pontos).toFixed(2)}</td>` : ''}
                </tr>`;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>`;

        // Rodapé informativo
        if (todosZerados) {
            html += `
            <div style="text-align:center;padding:8px;font-size:0.72rem;color:#6b7280;">
                ${ranking.length} participantes nesta liga
            </div>`;
        }

        return html;
    }
};

// Expor globalmente
window.ManutencaoScreen = ManutencaoScreen;

console.log('[MANUTENCAO] Módulo v2.0 carregado');

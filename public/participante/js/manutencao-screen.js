// =====================================================================
// manutencao-screen.js - Tela "Calma aê!" v1.0
// =====================================================================
// Exibe tela de manutenção amigável quando admin ativa o modo.
// Permite ao participante ver Ranking Geral e Última Rodada.
// =====================================================================

const ManutencaoScreen = {
    _ativo: false,
    _conteudoCarregado: false,
    _observer: null,

    ativar() {
        if (this._ativo) return;
        this._ativo = true;

        const tela = document.getElementById('manutencaoScreen');
        if (!tela) return;

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

        // Carregar notícias do time do coração automaticamente
        this._carregarNoticias();

        if (window.Log) Log.info('MANUTENCAO', 'Tela de manutenção ativada');
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

        this._conteudoCarregado = false;
        if (window.Log) Log.info('MANUTENCAO', 'Tela de manutenção desativada');
    },

    estaAtivo() {
        return this._ativo;
    },

    async carregarConteudo() {
        const conteudo = document.getElementById('manutencaoConteudo');
        const btn = document.getElementById('manutencaoBtnVer');
        if (!conteudo) return;

        if (this._conteudoCarregado) {
            conteudo.style.display = conteudo.style.display === 'none' ? 'block' : 'none';
            return;
        }

        // Loading state
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite;font-size:20px;">autorenew</span> Carregando...';
        }

        conteudo.style.display = 'block';
        conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;">Carregando dados...</div>';

        try {
            const timeId = window.participanteAuth?.timeId;
            const temporada = window.participanteAuth?.temporada || new Date().getFullYear();
            const ligas = window.participanteAuth?.ligasDisponiveis || [];
            const ligaAtiva = window.participanteAuth?.ligaId;

            if (!ligaAtiva) {
                conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#f87171;">Faca login para ver seus dados</div>';
                return;
            }

            // Se tem multiplas ligas, mostrar tabs
            let html = '';
            if (ligas.length > 1) {
                html += this._renderizarTabsLigas(ligas, ligaAtiva);
            }

            html += '<div id="manutencaoRankingContainer"></div>';
            conteudo.innerHTML = html;

            // Configurar tabs
            if (ligas.length > 1) {
                conteudo.querySelectorAll('.manut-liga-tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        const lid = tab.dataset.ligaId;
                        conteudo.querySelectorAll('.manut-liga-tab').forEach(t => t.style.background = '#374151');
                        tab.style.background = 'linear-gradient(135deg,#f97316,#ea580c)';
                        this._carregarRankingLiga(lid, timeId, temporada);
                    });
                });
            }

            // Carregar ranking da liga ativa
            await this._carregarRankingLiga(ligaAtiva, timeId, temporada);

            this._conteudoCarregado = true;
        } catch (error) {
            conteudo.innerHTML = '<div style="text-align:center;padding:20px;color:#f87171;">Erro ao carregar dados. Tente novamente.</div>';
            if (window.Log) Log.error('MANUTENCAO', 'Erro ao carregar conteúdo:', error);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-icons" style="font-size:20px;">emoji_events</span> Ver Ranking e Última Rodada';
            }
        }
    },

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

    _renderizarTabsLigas(ligas, ligaAtiva) {
        let html = `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;justify-content:center;">`;
        ligas.forEach(liga => {
            const isActive = String(liga._id || liga.id) === String(ligaAtiva);
            const bg = isActive ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#374151';
            const nome = liga.nome || liga.name || 'Liga';
            html += `<button class="manut-liga-tab" data-liga-id="${liga._id || liga.id}"
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
            try {
                const parciaisRes = await fetch(`/api/matchday/parciais/${ligaId}`).then(r => r.ok ? r.json() : null);
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
                if (rankingRes?.success && rankingRes.ranking?.length) {
                    dados = rankingRes;
                    console.log('[MANUTENCAO] Pontos carregados via ranking-turno:', rankingRes.ranking.length, 'times');
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
            html += `
            <div style="background:linear-gradient(135deg,#1e3a5f,#172554);border-radius:14px;padding:16px;border:1px solid #2563eb40;margin-bottom:16px;display:flex;justify-content:space-around;text-align:center;">
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
            const nome = item.nome_time || 'Time';
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

            html += `
                <tr style="background:${bgColor};border-left:${borderLeft};">
                    <td style="padding:7px 6px;text-align:center;font-family:'JetBrains Mono',monospace;color:${textColor};font-weight:${fontWeight};">${posDisplay}</td>
                    <td style="padding:7px 6px;color:${textColor};font-weight:${fontWeight};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${nome}</td>
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

console.log('[MANUTENCAO] Módulo v1.0 carregado');

// =====================================================================
// PARTICIPANTE-HISTORICO.JS - v12.8 (SALDO CLICÁVEL + MODAL DETALHES)
// =====================================================================
// v12.8: Card Saldo Final clicável → abre modal com detalhes financeiros
//        - Mostra créditos, débitos, rodadas, ajustes e acertos
//        - Permite ver breakdown completo de cada componente
// v12.7: FIX - Usar saldo_temporada no Hall da Fama (histórico congelado, sem acertos)
//        - Saldo Final agora mostra o valor "congelado" da temporada
//        - Não é afetado por quitações ou acertos posteriores
// v12.6: FIX - Inclui temporada nas URLs de API (evita criar cache de temporada futura)
// v12.5: Fix campos do adversario no Mata-Mata (nomeTime vs nome)
//        - Corrigido acesso aos campos da API: nomeTime, pontos
// v12.4: Card Mata-Mata interativo com resumo + historico por edicao expandivel
//        - Resumo horizontal: Vitorias, Derrotas, Aproveitamento %, Edicoes
//        - Cards de edicao expandiveis com detalhes de confrontos
//        - CSS dedicado em historico.html (.mm-*)
// v12.3: Busca modulos_ativos da API da liga quando nao existir no historico
//        - Evita chamadas desnecessarias a APIs de modulos desabilitados
//        - SOBRAL: artilheiro, luvaOuro (sem mataMata, melhorMes, pontosCorridos)
//        - SUPERCARTOLA: mataMata, melhorMes, pontosCorridos (sem artilheiro, luvaOuro)
// v12.2: Fallback robusto quando APIs retornam 404 pos-turn-key
//        - Usa ?? (nullish) em vez de || para preservar 0 como valor valido
//        - Fallback para melhor_rodada do tempRecente
//        - Log de warning quando APIs vazias
// v12.1: Usa liga selecionada no header do app (não tem seletor proprio)
// v11.1: Fix pos-turn-key - Usar dados do JSON quando APIs estao vazias
// v11.0: Seletor de Temporadas
// v10.5: Status de Inatividade no banner
// v10.0: TOP10 Historico CORRIGIDO
// v9.0+: Filtros por liga, dados reais das APIs
// =====================================================================

if (window.Log) Log.info("HISTORICO", "Hall da Fama v12.5 carregando...");

// Estado do modulo
let historicoData = null;
let timeId = null;
let ligaIdSelecionada = null; // Liga selecionada no header do app
let temporadaSelecionada = null;
let temporadasDisponiveis = [];

// =====================================================================
// FUNCAO PRINCIPAL
// =====================================================================
export async function inicializarHistoricoParticipante({ participante, ligaId: _ligaId, timeId: _timeId }) {
    console.log("[HISTORICO-DEBUG] inicializarHistoricoParticipante CHAMADA", { ligaId: _ligaId, timeId: _timeId });
    if (window.Log) Log.info("HISTORICO", "Inicializando...", { ligaId: _ligaId, timeId: _timeId });

    timeId = _timeId;
    ligaIdSelecionada = _ligaId;
    console.log("[HISTORICO-DEBUG] Variaveis definidas:", { timeId, ligaIdSelecionada, tipoLigaId: typeof _ligaId });

    if (!timeId) {
        console.log("[HISTORICO-DEBUG] timeId INVALIDO - abortando");
        mostrarErro("Dados invalidos");
        return;
    }

    if (!ligaIdSelecionada) {
        console.log("[HISTORICO-DEBUG] ATENCAO: ligaIdSelecionada esta VAZIO/NULL - vai mostrar todas as ligas");
        if (window.Log) Log.warn("HISTORICO", "Liga nao selecionada - mostrando todas");
    }

    try {
        const response = await fetch(`/api/participante/historico/${timeId}`);
        if (!response.ok) {
            if (response.status === 404) {
                if (window.Log) Log.info("HISTORICO", "Participante nao encontrado no Cartorio - buscando dados em tempo real");
                if (ligaIdSelecionada) {
                    await renderizarDadosTempoReal(ligaIdSelecionada);
                } else {
                    mostrarVazio();
                }
                return;
            }
            throw new Error(`Erro ${response.status}`);
        }

        historicoData = await response.json();
        console.log("[HISTORICO-DEBUG] API response:", { success: historicoData.success, temporadas: historicoData.historico?.length, disponiveis: historicoData.temporadas_disponiveis });
        if (!historicoData.success) throw new Error(historicoData.error);

        if (window.Log) Log.info("HISTORICO", "Dados:", { temporadas: historicoData.historico?.length });

        // v11.0: Armazenar temporadas disponiveis e inicializar seletor
        temporadasDisponiveis = historicoData.temporadas_disponiveis || [];
        const temporadaAtualBackend = historicoData.temporada_atual;

        // Se nao tem temporada selecionada, usar a mais recente
        if (!temporadaSelecionada && temporadasDisponiveis.length > 0) {
            temporadaSelecionada = temporadasDisponiveis[0]; // Mais recente primeiro
        }

        // v12.1: Popular seletor de temporadas (liga vem do header do app)
        popularSeletorTemporadas(temporadasDisponiveis, temporadaAtualBackend);

        // Atualizar subtitle com temporada e nome da liga
        atualizarSubtitle();

        // Renderizar dados
        await renderizarTodasLigas();

    } catch (error) {
        if (window.Log) Log.error("HISTORICO", "Erro:", error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// v12.1: SELETOR DE TEMPORADAS (liga vem do header do app)
// =====================================================================
function popularSeletorTemporadas(temporadas, temporadaAtual) {
    const seletorContainer = document.getElementById("seletorTemporadas");
    const selectEl = document.getElementById("selectTemporada");

    if (!seletorContainer || !selectEl) return;

    // Mostrar seletor apenas se houver mais de 1 temporada
    if (temporadas.length <= 1) {
        seletorContainer.style.display = "none";
        return;
    }

    seletorContainer.style.display = "flex";

    // Popular opcoes
    selectEl.innerHTML = temporadas.map(ano => {
        const isAtual = ano === temporadaAtual;
        const label = isAtual ? `${ano} (atual)` : ano;
        const selected = ano === temporadaSelecionada ? 'selected' : '';
        return `<option value="${ano}" ${selected}>${label}</option>`;
    }).join('');

    // Listener para mudanca
    selectEl.onchange = async (e) => {
        temporadaSelecionada = parseInt(e.target.value);
        if (window.Log) Log.info("HISTORICO", `Temporada alterada para: ${temporadaSelecionada}`);
        atualizarSubtitle();
        await renderizarTodasLigas();
    };
}

function atualizarSubtitle() {
    const elSubtitle = document.getElementById("headerSubtitle");
    if (!elSubtitle) return;

    let temporadas = historicoData?.historico || [];

    // Filtrar por temporada selecionada
    if (temporadaSelecionada) {
        temporadas = temporadas.filter(t => t.ano === temporadaSelecionada);
    }

    // v12.1: Filtrar pela liga selecionada no header do app
    if (ligaIdSelecionada) {
        temporadas = temporadas.filter(t => String(t.liga_id) === String(ligaIdSelecionada));
    }

    const nomeLiga = temporadas[0]?.liga_nome || 'Super Cartola';
    const ano = temporadaSelecionada || temporadas[0]?.ano || '';

    elSubtitle.textContent = ano ? `Temporada ${ano} - ${nomeLiga}` : nomeLiga;
}

// =====================================================================
// RENDERIZAR LIGAS (v11.0: Filtra por temporada e liga)
// =====================================================================
async function renderizarTodasLigas() {
    console.log("[HISTORICO-DEBUG] renderizarTodasLigas CHAMADA");
    const container = document.getElementById("historicoDetalhe");
    console.log("[HISTORICO-DEBUG] Container encontrado:", !!container);
    if (!container) return;

    // v11.0: Validar dados antes de renderizar
    if (!historicoData) {
        console.log("[HISTORICO-DEBUG] historicoData NULO - abortando");
        if (window.Log) Log.warn("HISTORICO", "historicoData nulo - abortando render");
        mostrarErro("Dados nao carregados");
        return;
    }

    container.innerHTML = `<div class="loading-state"><span class="material-icons spin">sync</span><span>Carregando dados...</span></div>`;

    let temporadas = historicoData.historico || [];
    console.log("[HISTORICO-DEBUG] Temporadas iniciais:", temporadas.length, temporadas.map(t => ({ ano: t.ano, liga: t.liga_nome })));

    // v11.0: Filtrar pela temporada selecionada
    if (temporadaSelecionada) {
        temporadas = temporadas.filter(t => t.ano === temporadaSelecionada);
        console.log("[HISTORICO-DEBUG] Apos filtro temporada:", temporadaSelecionada, "->", temporadas.length);
        if (window.Log) Log.debug("HISTORICO", `Filtrando por temporada: ${temporadaSelecionada}`, { encontradas: temporadas.length });
    }

    // v12.1: Filtrar pela liga selecionada no header do app
    if (ligaIdSelecionada) {
        temporadas = temporadas.filter(t => String(t.liga_id) === String(ligaIdSelecionada));
        console.log("[HISTORICO-DEBUG] Apos filtro liga (header):", ligaIdSelecionada, "->", temporadas.length);
        if (window.Log) Log.debug("HISTORICO", `Filtrando por liga do header: ${ligaIdSelecionada}`, { encontradas: temporadas.length });
    }

    console.log("[HISTORICO-DEBUG] Temporadas disponiveis apos filtros:", temporadas.length, temporadas.map(t => t.liga_nome));

    // v11.2: Só buscar dados em tempo real se NAO tiver nenhum historico consolidado
    if (temporadas.length === 0) {
        console.log("[HISTORICO-DEBUG] Sem historico consolidado -> tentando tempo real");
        if (ligaIdSelecionada) {
            if (window.Log) Log.info("HISTORICO", "Sem historico consolidado - buscando dados em tempo real");
            await renderizarDadosTempoReal(ligaIdSelecionada);
            return;
        }
    }

    if (temporadas.length === 0) {
        console.log("[HISTORICO-DEBUG] Sem temporadas -> mostrarVazio");
        mostrarVazio();
        return;
    }

    // Agrupar por liga (agora normalmente terá apenas 1 liga)
    const ligasMap = new Map();
    temporadas.forEach(t => {
        const key = t.liga_id;
        if (!ligasMap.has(key)) {
            ligasMap.set(key, { nome: t.liga_nome, temporadas: [] });
        }
        ligasMap.get(key).temporadas.push(t);
    });

    let html = '';
    let nomeLigaAtual = 'Super Cartola Manager'; // v9.4: Nome da liga para o rodapé

    // Para cada liga, renderizar seus dados
    for (const [ligaId, ligaData] of ligasMap) {
        nomeLigaAtual = ligaData.nome || 'Super Cartola Manager'; // v9.4: Atualizar nome
        // Ordenar temporadas por ano (mais recente primeiro)
        const tempOrdenadas = ligaData.temporadas.sort((a, b) => b.ano - a.ano);

        // Usar a temporada mais recente para os dados principais
        const tempRecente = tempOrdenadas[0];

        // Header da liga (se mais de uma)
        if (ligasMap.size > 1) {
            html += `
                <div class="liga-header">
                    <span class="material-icons">shield</span>
                    <div class="liga-header-text">
                        <div class="liga-nome">${ligaData.nome || 'Liga'}</div>
                        <div class="liga-ano">Temporada ${tempRecente.ano}</div>
                    </div>
                </div>
            `;
        }

        // v12.3: Buscar modulos_ativos da API da liga se nao existir no historico
        let modulos = tempRecente.modulos_ativos;
        console.log("[HISTORICO-DEBUG] modulos_ativos do historico:", modulos, "tipo:", typeof modulos);
        if (!modulos || Object.keys(modulos).length === 0) {
            console.log("[HISTORICO-DEBUG] Buscando modulos da API da liga...");
            try {
                const ligaRes = await fetch(`/api/ligas/${ligaId}`);
                if (ligaRes.ok) {
                    const ligaData = await ligaRes.json();
                    modulos = ligaData.modulos_ativos || {};
                    if (window.Log) Log.info("HISTORICO", "Modulos obtidos da API da liga", { ligaId, modulos });
                }
            } catch (e) {
                if (window.Log) Log.warn("HISTORICO", "Erro ao buscar modulos da liga", e);
                modulos = {};
            }
        }
        modulos = modulos || {};

        // Buscar dados REAIS da API (v8.0: adicionado ranking, melhorRodada e extrato)
        // v12.6 FIX: Passar temporada para buscarExtrato (evita criar cache de temporada futura)
        const temporadaTemp = tempRecente.ano || temporadaSelecionada;
        const [pc, top10, melhorMes, mataMata, artilheiro, luvaOuro, ranking, melhorRodada, extrato] = await Promise.all([
            modulos.pontosCorridos !== false ? buscarPontosCorridos(ligaId) : null,
            modulos.top10 !== false ? buscarTop10(ligaId) : null,
            modulos.melhorMes !== false ? buscarMelhorMes(ligaId) : null,
            modulos.mataMata !== false ? buscarMataMata(ligaId) : null,
            modulos.artilheiro !== false ? buscarArtilheiro(ligaId) : null,
            modulos.luvaOuro !== false ? buscarLuvaOuro(ligaId) : null,
            buscarRanking(ligaId),
            buscarMelhorRodada(ligaId),
            buscarExtrato(ligaId, temporadaTemp)
        ]);

        // v12.2: FALLBACK ROBUSTO - Usar dados historicos de tempRecente quando APIs 404
        // Apos turn_key, os caches sao limpos mas os dados historicos estao no JSON
        const apisVazias = !ranking && !pc && !extrato;
        if (apisVazias && window.Log) {
            Log.warn("HISTORICO", "APIs retornaram vazio - usando fallback de tempRecente", {
                ligaId,
                temEstatisticas: !!tempRecente.estatisticas,
                temFinanceiro: !!tempRecente.financeiro
            });
        }

        // v12.2: Usar ?? (nullish) para preservar 0 como valor valido
        const posicaoReal = ranking?.posicao ?? pc?.posicao ?? tempRecente.estatisticas?.posicao_final ?? '-';
        const pontosReais = ranking?.pontos ?? pc?.pontos ?? tempRecente.estatisticas?.pontos_totais ?? 0;
        const totalParticipantes = ranking?.total ?? pc?.total ?? tempRecente.estatisticas?.total_participantes ?? historicoData?.historico?.length ?? 0;
        const rodadasJogadas = ranking?.rodadas ?? (pc ? (pc.vitorias + pc.empates + pc.derrotas) : null) ?? tempRecente.estatisticas?.rodadas_jogadas ?? 38;

        // v12.2: Saldo - prioridade para extrato da API, fallback para JSON
        const saldoHistorico = extrato?.saldo ?? tempRecente.financeiro?.saldo_final ?? 0;
        const saldoClass = saldoHistorico > 0 ? 'positive' : saldoHistorico < 0 ? 'negative' : '';

        // v12.2: Fallback para melhorRodada usando dados historicos
        const melhorRodadaFinal = melhorRodada ?? tempRecente.estatisticas?.melhor_rodada ?? null;

        html += `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="material-icons stat-icon">emoji_events</div>
                    <div class="stat-label">Posicao Final</div>
                    <div class="stat-value">${posicaoReal}º</div>
                    <div class="stat-subtitle">${totalParticipantes ? `de ${totalParticipantes} participantes` : 'Ranking Geral'}</div>
                </div>
                <div class="stat-card">
                    <div class="material-icons stat-icon">analytics</div>
                    <div class="stat-label">Pontuacao Total</div>
                    <div class="stat-value">${formatarPontosCompletos(pontosReais)}</div>
                    <div class="stat-subtitle">${rodadasJogadas} rodadas</div>
                </div>
                <div class="stat-card stat-card-clickable" onclick="window.abrirModalDetalhesFinanceiros('${ligaId}', ${temporadaTemp}, ${saldoHistorico})" title="Clique para ver detalhes">
                    <div class="material-icons stat-icon">paid</div>
                    <div class="stat-label">Saldo Final</div>
                    <div class="stat-value ${saldoClass}">${formatarMoeda(saldoHistorico)}</div>
                    <div class="stat-subtitle">Toque para detalhes</div>
                </div>
                <div class="stat-card">
                    <div class="material-icons stat-icon">stars</div>
                    <div class="stat-label">Melhor Rodada</div>
                    <div class="stat-value">${melhorRodadaFinal ? 'R' + (melhorRodadaFinal.rodada ?? melhorRodadaFinal.numero ?? melhorRodadaFinal) : '-'}</div>
                    <div class="stat-subtitle">${melhorRodadaFinal?.pontos ? `${formatarPontos(melhorRodadaFinal.pontos)} pontos` : 'Sem dados'}</div>
                </div>
            </div>
        `;

        // v10.5: Banner de inatividade se o participante desistiu
        if (tempRecente.status && tempRecente.status.ativo === false) {
            const rodadaDesist = tempRecente.status.rodada_desistencia || 'N/D';
            html += `
                <div class="alert-banner warning">
                    <span class="material-icons">info</span>
                    <div class="alert-content">
                        <div class="alert-title">Participante Inativo</div>
                        <div class="alert-text">Desistiu na rodada ${rodadaDesist}. Estatisticas ate a ultima rodada ativa.</div>
                    </div>
                </div>
            `;
        }

        html += `<div class="divider"></div>`;

        // Mata-Mata (v10.0: interativo com detalhes por edição)
        if (modulos.mataMata !== false && mataMata && mataMata.participou) {
            const totalJogos = mataMata.vitorias + mataMata.derrotas;
            const aproveitamento = totalJogos > 0 ? Math.round((mataMata.vitorias / totalJogos) * 100) : 0;
            const edicoes = mataMata.edicoes || [];

            let edicoesHtml = '';
            if (edicoes.length > 0) {
                edicoesHtml = edicoes.map(ed => {
                    const edAprov = (ed.vitorias + ed.derrotas) > 0
                        ? Math.round((ed.vitorias / (ed.vitorias + ed.derrotas)) * 100)
                        : 0;
                    const confrontosHtml = (ed.confrontos || []).map(c => `
                        <div class="mm-confronto ${c.venceu ? 'vitoria' : 'derrota'}">
                            <span class="mm-fase">${c.fase}</span>
                            <span class="mm-vs">vs ${c.adversario}</span>
                            <span class="mm-resultado">${c.venceu ? 'V' : 'D'}</span>
                        </div>
                    `).join('');

                    return `
                        <div class="mm-edicao" data-edicao="${ed.edicao}">
                            <div class="mm-edicao-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <div class="mm-edicao-info">
                                    <span class="mm-edicao-num">Edicao ${ed.edicao}</span>
                                    ${ed.campeao ? '<span class="mm-campeao-badge"><span class="material-icons">emoji_events</span></span>' : ''}
                                </div>
                                <div class="mm-edicao-stats">
                                    <span class="mm-fase-alcancada">${ed.melhorFase}</span>
                                    <span class="mm-record">${ed.vitorias}V ${ed.derrotas}D</span>
                                    <span class="material-icons mm-expand-icon">expand_more</span>
                                </div>
                            </div>
                            <div class="mm-edicao-detalhes">
                                ${confrontosHtml || '<div class="mm-sem-dados">Sem confrontos registrados</div>'}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            html += `
                <div class="section section-mata-mata">
                    <div class="section-header">
                        <span class="material-icons section-icon">military_tech</span>
                        <span class="section-title">Mata-Mata</span>
                        ${mataMata.campeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="mm-resumo">
                        <div class="mm-stat">
                            <span class="mm-stat-value">${mataMata.vitorias}</span>
                            <span class="mm-stat-label">Vitorias</span>
                        </div>
                        <div class="mm-stat">
                            <span class="mm-stat-value">${mataMata.derrotas}</span>
                            <span class="mm-stat-label">Derrotas</span>
                        </div>
                        <div class="mm-stat">
                            <span class="mm-stat-value highlight">${aproveitamento}%</span>
                            <span class="mm-stat-label">Aproveitamento</span>
                        </div>
                        <div class="mm-stat">
                            <span class="mm-stat-value">${edicoes.length}</span>
                            <span class="mm-stat-label">Edicoes</span>
                        </div>
                    </div>
                    ${edicoes.length > 0 ? `
                        <div class="mm-edicoes-container">
                            <div class="mm-edicoes-title">
                                <span class="material-icons">format_list_numbered</span>
                                Historico por Edicao
                            </div>
                            <div class="mm-edicoes-list">
                                ${edicoesHtml}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Artilheiro (v9.3: texto descritivo atualizado)
        if (modulos.artilheiro !== false && artilheiro) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">sports_soccer</span>
                        <span class="section-title">Artilheiro Campeao</span>
                        ${artilheiro.isCampeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">sports_soccer</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Voce somou ${artilheiro.gols} gols na temporada e ficou em ${artilheiro.posicao}º lugar</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Luva de Ouro (v9.3: texto descritivo atualizado)
        if (modulos.luvaOuro !== false && luvaOuro) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">sports_handball</span>
                        <span class="section-title">Luva de Ouro</span>
                        ${luvaOuro.isCampeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">sports_handball</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Seus goleiros somaram ${formatarPontosCompletos(luvaOuro.pontos || luvaOuro.defesas)} pontos na temporada e voce ficou em ${luvaOuro.posicao}º lugar</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Melhor do Mes (v9.0: verifica módulo ativo)
        if (modulos.melhorMes !== false && melhorMes && melhorMes.length > 0) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">calendar_month</span>
                        <span class="section-title">Melhor do Mes</span>
                        <span class="section-badge">${melhorMes.length}x Campeao</span>
                    </div>
                    <div class="achievement-list">
                        ${melhorMes.map(m => `
                            <div class="achievement-item">
                                <span class="material-icons achievement-icon">emoji_events</span>
                                <div class="achievement-content">
                                    <div class="achievement-title">Campeao ${m.nome || ''}</div>
                                    <div class="achievement-value">${m.pontos ? formatarPontos(m.pontos) + ' pts' : ''}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // TOP 10 (v10.4: Unificado - mesmo card para todas as ligas)
        if (modulos.top10 !== false && top10) {
            const temAlgoNoTop10 = top10.mitosNoTop10 > 0 || top10.micosNoTop10 > 0;
            const saldoClass = top10.saldoTop10 > 0 ? 'positive' : top10.saldoTop10 < 0 ? 'negative' : '';

            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">leaderboard</span>
                        <span class="section-title">TOP 10 Performance</span>
                        ${temAlgoNoTop10 ? `<span class="section-badge ${saldoClass}">${top10.saldoTop10 >= 0 ? '+' : ''}${formatarMoeda(top10.saldoTop10)}</span>` : ''}
                    </div>
                    <div class="achievement-list">
            `;

            // MITOS no TOP 10
            if (top10.mitosNoTop10 > 0) {
                const posicoesTexto = formatarPosicoes(top10.posicoesMitosTop10);
                html += `
                    <div class="achievement-item destaque">
                        <span class="material-icons achievement-icon">grade</span>
                        <div class="achievement-content">
                            <div class="achievement-title">${top10.mitosNoTop10}x no TOP 10 Mitos</div>
                            <div class="achievement-value">
                                Posicoes: <span class="highlight">${posicoesTexto}</span> |
                                Bonus: <span class="positive">+${formatarMoeda(top10.totalBonus)}</span>
                            </div>
                            <div class="achievement-value">Melhor: ${formatarPontos(top10.melhorMitoPts)} pts (R${top10.melhorMitoRodada})</div>
                        </div>
                    </div>
                `;
            }

            // MICOS no TOP 10
            if (top10.micosNoTop10 > 0) {
                const posicoesTexto = formatarPosicoes(top10.posicoesMicosTop10);
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">sentiment_dissatisfied</span>
                        <div class="achievement-content">
                            <div class="achievement-title">${top10.micosNoTop10}x no TOP 10 Micos</div>
                            <div class="achievement-value">
                                Posicoes: <span class="highlight">${posicoesTexto}</span> |
                                Onus: <span class="negative">-${formatarMoeda(top10.totalOnus)}</span>
                            </div>
                            <div class="achievement-value">Pior: ${formatarPontos(top10.piorMicoPts)} pts (R${top10.piorMicoRodada})</div>
                        </div>
                    </div>
                `;
            }

            // Não está no TOP 10, mas aparece no ranking geral
            if (!temAlgoNoTop10 && (top10.temMitos || top10.temMicos)) {
                const aparicoesMitos = top10.aparicoesMitos?.length || 0;
                const aparicoesMicos = top10.aparicoesMicos?.length || 0;
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">info</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Fora do TOP 10</div>
                            <div class="achievement-value">
                                ${aparicoesMitos > 0 ? `${aparicoesMitos}x no ranking de mitos` : ''}
                                ${aparicoesMitos > 0 && aparicoesMicos > 0 ? ' | ' : ''}
                                ${aparicoesMicos > 0 ? `${aparicoesMicos}x no ranking de micos` : ''}
                            </div>
                            <div class="achievement-value">Apenas as 10 primeiras posicoes geram bonus/onus</div>
                        </div>
                    </div>
                `;
            }

            // Nunca apareceu em nenhum ranking
            if (!top10.temMitos && !top10.temMicos && (top10.totalMitosTemporada > 0 || top10.totalMicosTemporada > 0)) {
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">info</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Voce nao aparece no ranking TOP 10</div>
                            <div class="achievement-value">${top10.totalMitosTemporada} mitos e ${top10.totalMicosTemporada} micos registrados na temporada</div>
                        </div>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        // Pontos Corridos (v9.0: verifica módulo ativo)
        if (modulos.pontosCorridos !== false && pc) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">sync</span>
                        <span class="section-title">Pontos Corridos</span>
                        ${pc.posicao <= 3 ? `<span class="section-badge">${pc.posicao}º Lugar</span>` : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">leaderboard</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Classificacao Final</div>
                                <div class="achievement-value">${pc.posicao}º de ${pc.total} participantes</div>
                            </div>
                        </div>
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">sports_score</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Desempenho</div>
                                <div class="achievement-value">${pc.vitorias}V ${pc.empates}E ${pc.derrotas}D • <span class="highlight">${pc.pontos} pts</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Financeiro (v8.0: usando extrato com créditos/débitos reais)
        const temDadosFinanceiros = extrato?.creditos || extrato?.debitos || saldoHistorico;
        if (temDadosFinanceiros) {
            const creditos = extrato?.creditos || 0;
            const debitos = extrato?.debitos || 0;
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">account_balance_wallet</span>
                        <span class="section-title">Fluxo Financeiro</span>
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">arrow_upward</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Creditos</div>
                                <div class="achievement-value positive">+${formatarMoeda(creditos)}</div>
                            </div>
                        </div>
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">arrow_downward</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Debitos</div>
                                <div class="achievement-value negative">-${formatarMoeda(debitos)}</div>
                            </div>
                        </div>
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">account_balance</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Saldo ${saldoHistorico >= 0 ? 'Positivo' : 'Negativo'}</div>
                                <div class="achievement-value ${saldoClass}">${formatarMoeda(saldoHistorico)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Separador entre ligas
        if (ligasMap.size > 1) {
            html += `<div class="divider"></div>`;
        }
    }

    // Footer (v9.4: usa nome da liga atual)
    html += `<div class="hall-footer">${nomeLigaAtual}</div>`;

    console.log("[HISTORICO-DEBUG] HTML gerado, tamanho:", html.length);
    container.innerHTML = html;
    console.log("[HISTORICO-DEBUG] innerHTML definido, container.children:", container.children.length);
}

// =====================================================================
// FUNCOES DE BUSCA DE DADOS (APIs REAIS)
// =====================================================================

async function buscarPontosCorridos(tempLigaId) {
    try {
        const res = await fetch(`/api/pontos-corridos/cache/${tempLigaId}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.classificacao) return null;
        const meu = data.classificacao.find(t => String(t.timeId) === String(timeId) || String(t.time_id) === String(timeId));
        if (!meu) return null;
        return {
            posicao: meu.posicao || (data.classificacao.indexOf(meu) + 1),
            pontos: meu.pontos || 0,
            vitorias: meu.vitorias || 0,
            empates: meu.empates || 0,
            derrotas: meu.derrotas || 0,
            total: data.classificacao.length
        };
    } catch { return null; }
}

async function buscarTop10(tempLigaId) {
    // v10.3: Lógica corrigida - TOP10 Histórico com valores por liga + debug
    // O ranking armazena TODAS as pontuações extremas da temporada, ordenadas
    // Apenas as 10 primeiras posições geram bônus/ônus financeiro
    // Um participante pode ocupar MÚLTIPLAS posições se teve várias pontuações extremas

    // Valores de bônus/ônus por posição (1º ao 10º) - ESPECÍFICOS POR LIGA
    const LIGA_SOBRAL_ID = '684d821cf1a7ae16d1f89572';

    // Super Cartola: valores maiores (liga principal com 32 times)
    const VALORES_SUPER_CARTOLA = {
        mito: { 1: 30, 2: 28, 3: 26, 4: 24, 5: 22, 6: 20, 7: 18, 8: 16, 9: 14, 10: 12 },
        mico: { 1: -30, 2: -28, 3: -26, 4: -24, 5: -22, 6: -20, 7: -18, 8: -16, 9: -14, 10: -12 }
    };

    // Cartoleiros do Sobral: valores menores (liga com 6 times)
    const VALORES_SOBRAL = {
        mito: { 1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 },
        mico: { 1: -10, 2: -9, 3: -8, 4: -7, 5: -6, 6: -5, 7: -4, 8: -3, 9: -2, 10: -1 }
    };

    // Selecionar valores baseado na liga
    const valoresLiga = (tempLigaId === LIGA_SOBRAL_ID) ? VALORES_SOBRAL : VALORES_SUPER_CARTOLA;
    const VALORES_MITO = valoresLiga.mito;
    const VALORES_MICO = valoresLiga.mico;

    try {
        const res = await fetch(`/api/top10/cache/${tempLigaId}`);
        if (!res.ok) {
            if (window.Log) Log.warn("HISTORICO", "TOP10 API não disponível", { status: res.status, ligaId: tempLigaId });
            return null;
        }
        const data = await res.json();

        // v10.3: Debug log para verificar busca
        if (window.Log) Log.debug("HISTORICO", "TOP10 busca iniciada", {
            ligaId: tempLigaId,
            timeIdBuscado: timeId,
            tipoTimeId: typeof timeId,
            mitosNoCache: data.mitos?.length || 0,
            micosNoCache: data.micos?.length || 0,
            primeiroMitoTimeId: data.mitos?.[0]?.time_id || data.mitos?.[0]?.timeId
        });

        // Arrays para armazenar TODAS as aparições do participante
        const aparicoesMitos = []; // { posicao, pontos, rodada, noTop10, bonus }
        const aparicoesMicos = []; // { posicao, pontos, rodada, noTop10, onus }

        // Buscar aparições nos MITOS
        // v10.1: Suporta campos de diferentes formatos de cache (pontos, pontos_rodada)
        (data.mitos || []).forEach((m, index) => {
            const mTimeId = m.timeId || m.time_id;
            if (String(mTimeId) === String(timeId)) {
                const posicao = index + 1;
                const noTop10 = posicao <= 10;
                const pontos = m.pontos ?? m.pontos_rodada ?? 0;
                aparicoesMitos.push({
                    posicao,
                    pontos,
                    rodada: m.rodada || m.rodada_numero || null,
                    noTop10,
                    bonus: noTop10 ? (VALORES_MITO[posicao] || 0) : 0
                });
            }
        });

        // Buscar aparições nos MICOS
        // v10.1: Suporta campos de diferentes formatos de cache (pontos, pontos_rodada)
        (data.micos || []).forEach((m, index) => {
            const mTimeId = m.timeId || m.time_id;
            if (String(mTimeId) === String(timeId)) {
                const posicao = index + 1;
                const noTop10 = posicao <= 10;
                const pontos = m.pontos ?? m.pontos_rodada ?? 0;
                aparicoesMicos.push({
                    posicao,
                    pontos,
                    rodada: m.rodada || m.rodada_numero || null,
                    noTop10,
                    onus: noTop10 ? (VALORES_MICO[posicao] || 0) : 0
                });
            }
        });

        // Filtrar apenas as que estão no TOP 10
        const mitosNoTop10 = aparicoesMitos.filter(a => a.noTop10);
        const micosNoTop10 = aparicoesMicos.filter(a => a.noTop10);

        // Calcular totais financeiros
        const totalBonus = mitosNoTop10.reduce((sum, a) => sum + a.bonus, 0);
        const totalOnus = micosNoTop10.reduce((sum, a) => sum + Math.abs(a.onus), 0);
        const saldoTop10 = totalBonus - totalOnus;

        // Posições ocupadas no TOP 10 (para exibição: "2º, 6º e 7º")
        const posicoesMitosTop10 = mitosNoTop10.map(a => a.posicao);
        const posicoesMicosTop10 = micosNoTop10.map(a => a.posicao);

        if (window.Log) Log.debug("HISTORICO", "TOP10 v10.2:", {
            timeId,
            aparicoesMitos: aparicoesMitos.length,
            aparicoesMicos: aparicoesMicos.length,
            mitosNoTop10: mitosNoTop10.length,
            micosNoTop10: micosNoTop10.length,
            posicoesMitosTop10,
            posicoesMicosTop10,
            totalBonus,
            totalOnus,
            saldoTop10
        });

        const result = {
            // Flags de participação
            temMitos: aparicoesMitos.length > 0,
            temMicos: aparicoesMicos.length > 0,

            // Aparições no TOP 10 (geram bônus/ônus)
            mitosNoTop10: mitosNoTop10.length,
            micosNoTop10: micosNoTop10.length,
            posicoesMitosTop10, // [2, 6, 7] = "2º, 6º e 7º"
            posicoesMicosTop10, // [1, 3] = "1º e 3º"

            // Melhor/pior pontuação (primeira aparição de cada)
            melhorMitoPts: aparicoesMitos[0]?.pontos || 0,
            melhorMitoRodada: aparicoesMitos[0]?.rodada || null,
            piorMicoPts: aparicoesMicos[0]?.pontos || 0,
            piorMicoRodada: aparicoesMicos[0]?.rodada || null,

            // Financeiro
            totalBonus,
            totalOnus,
            saldoTop10,

            // Totais gerais (para mensagem "X mitos registrados")
            totalMitosTemporada: data.mitos?.length || 0,
            totalMicosTemporada: data.micos?.length || 0,

            // Todas as aparições (para detalhamento se necessário)
            aparicoesMitos,
            aparicoesMicos
        };

        if (window.Log) Log.info("HISTORICO", "TOP10 Resultado v10.2:", {
            ligaId: tempLigaId,
            mitosNoTop10: result.mitosNoTop10,
            micosNoTop10: result.micosNoTop10,
            saldoTop10: result.saldoTop10
        });

        return result;
    } catch (e) {
        if (window.Log) Log.error("HISTORICO", "Erro ao buscar TOP10:", e);
        return null;
    }
}

async function buscarMelhorMes(tempLigaId) {
    try {
        const res = await fetch(`/api/ligas/${tempLigaId}/melhor-mes`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.edicoes) return null;
        const vitorias = [];
        data.edicoes.forEach(ed => {
            if (ed.campeao && String(ed.campeao.timeId) === String(timeId)) {
                vitorias.push({ nome: ed.nome, pontos: ed.campeao.pontos_total || 0 });
            }
        });
        return vitorias.length > 0 ? vitorias : null;
    } catch { return null; }
}

async function buscarMataMata(tempLigaId) {
    try {
        const res = await fetch(`/api/ligas/${tempLigaId}/mata-mata`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.edicoes || data.edicoes.length === 0) return null;

        let participou = false;
        let campeao = false;
        let vitorias = 0;
        let derrotas = 0;
        let melhorFase = null;
        const edicoesPorTime = []; // Detalhes por edição

        data.edicoes.forEach(ed => {
            let edVitorias = 0;
            let edDerrotas = 0;
            let edParticipou = false;
            let edCampeao = false;
            let edMelhorFase = null;
            const confrontosEdicao = [];

            if (ed.campeao && String(ed.campeao.timeId) === String(timeId)) {
                campeao = true;
                edCampeao = true;
                participou = true;
                edParticipou = true;
            }

            (ed.fases || []).forEach(fase => {
                (fase.confrontos || []).forEach(confronto => {
                    const isTimeA = confronto.timeA && String(confronto.timeA.timeId) === String(timeId);
                    const isTimeB = confronto.timeB && String(confronto.timeB.timeId) === String(timeId);
                    if (isTimeA || isTimeB) {
                        participou = true;
                        edParticipou = true;
                        if (!melhorFase || fase.ordem > melhorFase.ordem) {
                            melhorFase = { nome: fase.nome, ordem: fase.ordem };
                        }
                        if (!edMelhorFase || fase.ordem > edMelhorFase.ordem) {
                            edMelhorFase = { nome: fase.nome, ordem: fase.ordem };
                        }
                        const venceu = (confronto.vencedor === 'A' && isTimeA) || (confronto.vencedor === 'B' && isTimeB);
                        if (venceu) { vitorias++; edVitorias++; }
                        else { derrotas++; edDerrotas++; }

                        // Guardar detalhes do confronto
                        const adversario = isTimeA ? confronto.timeB : confronto.timeA;
                        const meuTime = isTimeA ? confronto.timeA : confronto.timeB;
                        confrontosEdicao.push({
                            fase: fase.nome,
                            adversario: adversario?.nomeTime || adversario?.nome_time || adversario?.nome || 'Adversario',
                            venceu,
                            pontosMeu: meuTime?.pontos || 0,
                            pontosAdv: adversario?.pontos || 0
                        });
                    }
                });
            });

            if (edParticipou) {
                edicoesPorTime.push({
                    edicao: ed.edicao || ed.numero || edicoesPorTime.length + 1,
                    campeao: edCampeao,
                    vitorias: edVitorias,
                    derrotas: edDerrotas,
                    melhorFase: edMelhorFase?.nome || 'Participou',
                    confrontos: confrontosEdicao
                });
            }
        });

        return participou ? {
            participou,
            campeao,
            vitorias,
            derrotas,
            melhorFase: melhorFase?.nome || null,
            edicoes: edicoesPorTime
        } : null;
    } catch { return null; }
}

async function buscarArtilheiro(tempLigaId) {
    try {
        const res = await fetch(`/api/artilheiro-campeao/${tempLigaId}/ranking`);
        if (!res.ok) {
            console.log("[ARTILHEIRO-DEBUG] API nao ok:", res.status);
            return null;
        }
        const data = await res.json();
        // v9.1 FIX: API retorna data.data.ranking, não data.ranking
        const ranking = data.data?.ranking || data.ranking;
        console.log("[ARTILHEIRO-DEBUG] timeId buscado:", timeId, "| ranking length:", ranking?.length);
        if (!ranking) return null;
        const meu = ranking.find(t => String(t.time_id) === String(timeId) || String(t.timeId) === String(timeId));
        console.log("[ARTILHEIRO-DEBUG] Participante encontrado:", meu ? meu.nome : "NAO ENCONTRADO", "| timeIds no ranking:", ranking.map(r => r.timeId));
        if (!meu) return null;
        return {
            posicao: ranking.indexOf(meu) + 1,
            // v9.1 FIX: Campos corretos da API
            gols: meu.golsPro || meu.gols || meu.total_gols || 0,
            jogador: meu.nome || meu.artilheiro_nome || meu.nome_jogador || null,
            isCampeao: ranking.indexOf(meu) === 0
        };
    } catch { return null; }
}

async function buscarLuvaOuro(tempLigaId) {
    try {
        const res = await fetch(`/api/luva-de-ouro/${tempLigaId}/ranking`);
        if (!res.ok) return null;
        const data = await res.json();
        // v9.1 FIX: API retorna data.data.ranking, não data.ranking
        const ranking = data.data?.ranking || data.ranking;
        if (!ranking) return null;
        // v9.1 FIX: API usa participanteId, não time_id ou timeId
        const meu = ranking.find(t =>
            String(t.participanteId) === String(timeId) ||
            String(t.time_id) === String(timeId) ||
            String(t.timeId) === String(timeId)
        );
        if (!meu) return null;
        return {
            posicao: ranking.indexOf(meu) + 1,
            // v9.1 FIX: API usa pontosTotais como score principal
            pontos: meu.pontosTotais || meu.defesas || meu.total_defesas || 0,
            defesas: meu.pontosTotais || meu.defesas || meu.total_defesas || 0, // Manter compatibilidade
            goleiro: meu.participanteNome || meu.goleiro_nome || meu.nome_jogador || null,
            isCampeao: ranking.indexOf(meu) === 0
        };
    } catch { return null; }
}

// v8.0: Buscar dados do Ranking (pontuação total real)
async function buscarRanking(tempLigaId) {
    try {
        const res = await fetch(`/api/ranking-turno/${tempLigaId}?turno=geral`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.success || !data.ranking) return null;
        const meu = data.ranking.find(t => String(t.timeId) === String(timeId));
        if (!meu) return null;
        return {
            posicao: meu.posicao || (data.ranking.indexOf(meu) + 1),
            pontos: meu.pontos || 0,
            total: data.ranking.length,
            // v9.1 FIX: Campo correto é rodadas_jogadas, não rodadas
            rodadas: meu.rodadas_jogadas || meu.rodadas || 0
        };
    } catch { return null; }
}

// v8.0: Buscar melhor rodada (maior pontuação do participante)
async function buscarMelhorRodada(tempLigaId) {
    try {
        const res = await fetch(`/api/rodadas/${tempLigaId}/rodadas?inicio=1&fim=38`);
        if (!res.ok) return null;
        const rodadas = await res.json();
        if (!rodadas || !Array.isArray(rodadas)) return null;

        // Filtrar apenas rodadas do meu time
        const minhasRodadas = rodadas.filter(r =>
            String(r.timeId) === String(timeId) || String(r.time_id) === String(timeId)
        );

        if (minhasRodadas.length === 0) return null;

        // Encontrar a rodada com maior pontuação
        let melhorRodada = { rodada: 0, pontos: -Infinity };

        minhasRodadas.forEach(r => {
            const pontos = r.pontos || 0;
            if (pontos > melhorRodada.pontos) {
                melhorRodada = {
                    rodada: r.rodada,
                    pontos: pontos
                };
            }
        });

        return melhorRodada.rodada > 0 ? melhorRodada : null;
    } catch { return null; }
}

// v8.0: Buscar extrato (créditos/débitos/saldo histórico)
// v12.6 FIX: Adicionar temporada na URL para evitar criar cache de temporada futura
// v12.7 FIX: Usar saldo_temporada para Hall da Fama (histórico congelado, sem acertos)
async function buscarExtrato(tempLigaId, temporada = null) {
    try {
        // Se não informar temporada, usar a selecionada no módulo
        const temp = temporada || temporadaSelecionada || '';
        const queryParams = temp ? `?temporada=${temp}` : '';
        const res = await fetch(`/api/extrato-cache/${tempLigaId}/times/${timeId}/cache${queryParams}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data) return null;

        const resumo = data.resumo || {};
        
        // ✅ v12.7: Para Hall da Fama, usar saldo_temporada (congelado)
        // saldo_temporada = cache + campos manuais (SEM acertos)
        // Isso garante que o histórico financeiro fique "congelado" como terminou a temporada
        const saldoHistorico = resumo.saldo_temporada ?? resumo.saldo_final ?? resumo.saldo ?? 0;
        
        return {
            creditos: resumo.totalGanhos || 0,
            debitos: Math.abs(resumo.totalPerdas || 0),
            saldo: saldoHistorico,
            // v12.7: Expor também os campos detalhados para debug/auditoria
            saldo_temporada: resumo.saldo_temporada ?? 0,
            saldo_acertos: resumo.saldo_acertos ?? 0,
            campos_manuais: resumo.camposManuais ?? 0
        };
    } catch { return null; }
}

// =====================================================================
// AUXILIARES
// =====================================================================

function formatarMoeda(valor) {
    const n = parseFloat(valor) || 0;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function formatarPontos(valor) {
    const n = parseFloat(valor) || 0;
    if (n >= 1000) {
        return (n / 1000).toFixed(1).replace('.', ',') + 'k';
    }
    return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// v9.3: Formatar pontos completos (sem abreviação "k")
function formatarPontosCompletos(valor) {
    const n = parseFloat(valor) || 0;
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// v10.0: Formatar lista de posições (ex: [2, 6, 7] → "2º, 6º e 7º")
function formatarPosicoes(posicoes) {
    if (!posicoes || posicoes.length === 0) return '';
    if (posicoes.length === 1) return `${posicoes[0]}º`;
    if (posicoes.length === 2) return `${posicoes[0]}º e ${posicoes[1]}º`;
    const ultimas = posicoes.slice(-2);
    const primeiras = posicoes.slice(0, -2);
    return primeiras.map(p => `${p}º`).join(', ') + ', ' + `${ultimas[0]}º e ${ultimas[1]}º`;
}

function mostrarErro(msg) {
    console.log("[HISTORICO-DEBUG] mostrarErro CHAMADA:", msg);
    const container = document.getElementById("historicoDetalhe");
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">error_outline</span>
                <h3>Erro ao carregar</h3>
                <p>${msg}</p>
            </div>
        `;
    }
}

function mostrarVazio() {
    console.log("[HISTORICO-DEBUG] mostrarVazio CHAMADA");
    const container = document.getElementById("historicoDetalhe");
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">history</span>
                <h3>Sem historico</h3>
                <p>Nenhum registro encontrado para este participante</p>
            </div>
        `;
    }
}

// v9.0: Buscar e renderizar dados em tempo real quando não há histórico consolidado
async function renderizarDadosTempoReal(ligaId) {
    console.log("[HISTORICO-DEBUG] renderizarDadosTempoReal CHAMADA com ligaId:", ligaId);
    const container = document.getElementById("historicoDetalhe");
    if (!container) return;

    container.innerHTML = `<div class="loading-state"><span class="material-icons spin">sync</span><span>Carregando dados...</span></div>`;

    try {
        // Buscar dados da liga (inclui nome e modulos_ativos)
        let ligaNome = 'Liga';
        let modulos = {};
        try {
            const ligaRes = await fetch(`/api/ligas/${ligaId}`);
            if (ligaRes.ok) {
                const ligaData = await ligaRes.json();
                ligaNome = ligaData.nome || 'Liga';
                modulos = ligaData.modulos_ativos || {};
                if (window.Log) Log.debug("HISTORICO", "Módulos ativos da liga:", modulos);
                
                // v9.3: Atualizar subtitle com nome da liga
                const elSubtitle = document.getElementById("headerSubtitle");
                if (elSubtitle) {
                    const anoDisplay = ligaData.ano || window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();
                    elSubtitle.textContent = `Temporada ${anoDisplay} - ${ligaNome}`;
                }
            }
        } catch (e) {
            if (window.Log) Log.warn("HISTORICO", "Erro ao buscar liga:", e);
        }

        // v12.6 FIX: Capturar temporada para passar ao buscarExtrato
        const temporadaTempoReal = ligaData.ano || window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

        // Buscar dados em paralelo
        const [ranking, melhorRodada, extrato, pc, top10, mataMata, artilheiro, luvaOuro, melhorMes] = await Promise.all([
            buscarRanking(ligaId),
            buscarMelhorRodada(ligaId),
            buscarExtrato(ligaId, temporadaTempoReal),
            modulos.pontosCorridos !== false ? buscarPontosCorridos(ligaId) : null,
            modulos.top10 !== false ? buscarTop10(ligaId) : null,
            modulos.mataMata !== false ? buscarMataMata(ligaId) : null,
            modulos.artilheiro !== false ? buscarArtilheiro(ligaId) : null,
            modulos.luvaOuro !== false ? buscarLuvaOuro(ligaId) : null,
            modulos.melhorMes !== false ? buscarMelhorMes(ligaId) : null
        ]);

        // Verificar se há dados
        if (!ranking && !pc && !extrato) {
            mostrarVazio();
            return;
        }

        // Dados principais
        const posicaoReal = ranking?.posicao || pc?.posicao || '-';
        const pontosReais = ranking?.pontos || pc?.pontos || 0;
        const totalParticipantes = ranking?.total || pc?.total || 0;
        const rodadasJogadas = ranking?.rodadas || (pc ? (pc.vitorias + pc.empates + pc.derrotas) : 0);
        const saldoHistorico = extrato?.saldo ?? 0;
        const saldoClass = saldoHistorico > 0 ? 'positive' : saldoHistorico < 0 ? 'negative' : '';

        let html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="material-icons stat-icon">emoji_events</div>
                    <div class="stat-label">Posicao Atual</div>
                    <div class="stat-value">${posicaoReal}º</div>
                    <div class="stat-subtitle">${totalParticipantes ? `de ${totalParticipantes} participantes` : 'Ranking Geral'}</div>
                </div>
                <div class="stat-card">
                    <div class="material-icons stat-icon">analytics</div>
                    <div class="stat-label">Pontuacao Total</div>
                    <div class="stat-value">${formatarPontosCompletos(pontosReais)}</div>
                    <div class="stat-subtitle">${rodadasJogadas} rodadas</div>
                </div>
                <div class="stat-card stat-card-clickable" onclick="window.abrirModalDetalhesFinanceiros('${ligaId}', ${temporadaTempoReal}, ${saldoHistorico})" title="Clique para ver detalhes">
                    <div class="material-icons stat-icon">paid</div>
                    <div class="stat-label">Saldo Atual</div>
                    <div class="stat-value ${saldoClass}">${formatarMoeda(saldoHistorico)}</div>
                    <div class="stat-subtitle">Toque para detalhes</div>
                </div>
                <div class="stat-card">
                    <div class="material-icons stat-icon">stars</div>
                    <div class="stat-label">Melhor Rodada</div>
                    <div class="stat-value">${melhorRodada ? 'R' + melhorRodada.rodada : '-'}</div>
                    <div class="stat-subtitle">${melhorRodada ? `${formatarPontos(melhorRodada.pontos)} pontos` : 'Sem dados'}</div>
                </div>
            </div>
        `;

        // v9.2: Seção "Seu Desempenho" consolidada
        const conquistas = [];
        if (posicaoReal !== '-' && posicaoReal <= 3) {
            conquistas.push({ icone: 'military_tech', texto: `${posicaoReal}º no Ranking Geral`, destaque: true });
        }
        if (artilheiro) {
            conquistas.push({
                icone: 'sports_soccer',
                texto: artilheiro.isCampeao ? 'Artilheiro Campeao' : `${artilheiro.posicao}º no Artilheiro`,
                detalhe: `${artilheiro.gols} gols`,
                destaque: artilheiro.isCampeao
            });
        }
        if (luvaOuro) {
            conquistas.push({
                icone: 'sports_handball',
                texto: luvaOuro.isCampeao ? 'Luva de Ouro' : `${luvaOuro.posicao}º na Luva de Ouro`,
                detalhe: `${formatarPontos(luvaOuro.defesas)} pts`,
                destaque: luvaOuro.isCampeao
            });
        }
        if (top10 && (top10.isMito || top10.isMico)) {
            if (top10.isMito) {
                conquistas.push({
                    icone: 'grade',
                    texto: `${top10.mitoPos}º melhor MITO`,
                    detalhe: `${formatarPontos(top10.mitoPontos)} pts`,
                    destaque: top10.mitoPos <= 3
                });
            }
            if (top10.isMico) {
                conquistas.push({
                    icone: 'sentiment_dissatisfied',
                    texto: `${top10.micoPos}º pior MICO`,
                    detalhe: `${formatarPontos(top10.micoPontos)} pts`,
                    destaque: false
                });
            }
        }
        if (melhorMes && melhorMes.length > 0) {
            conquistas.push({
                icone: 'calendar_month',
                texto: `Melhor do Mes (${melhorMes.length}x)`,
                detalhe: melhorMes.map(m => m.nome).join(', '),
                destaque: true
            });
        }
        if (mataMata && mataMata.participou) {
            const totalJogosM = mataMata.vitorias + mataMata.derrotas;
            const aprovM = totalJogosM > 0 ? Math.round((mataMata.vitorias / totalJogosM) * 100) : 0;
            conquistas.push({
                icone: 'swords',
                texto: mataMata.campeao ? 'Campeao Mata-Mata' : (mataMata.melhorFase || 'Mata-Mata'),
                detalhe: `${mataMata.vitorias}V ${mataMata.derrotas}D (${aprovM}%)`,
                destaque: mataMata.campeao
            });
        }

        // Renderizar seção Seu Desempenho
        html += `
            <div class="section">
                <div class="section-header">
                    <span class="material-icons section-icon">assessment</span>
                    <span class="section-title">Seu Desempenho</span>
                    <span class="section-badge">${ligaNome}</span>
                </div>
                <div class="achievement-list">
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">leaderboard</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Classificacao Geral</div>
                            <div class="achievement-value"><span class="highlight">${posicaoReal}º</span> de ${totalParticipantes} participantes</div>
                        </div>
                    </div>
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">timer</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Rodadas Disputadas</div>
                            <div class="achievement-value"><span class="highlight">${rodadasJogadas}</span> de 38 rodadas</div>
                        </div>
                    </div>
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">trending_up</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Media por Rodada</div>
                            <div class="achievement-value"><span class="highlight">${rodadasJogadas > 0 ? formatarPontos(pontosReais / rodadasJogadas) : '-'}</span> pontos/rodada</div>
                        </div>
                    </div>
        `;

        // Adicionar conquistas se houver
        if (conquistas.length > 0) {
            html += `
                </div>
            </div>
            <div class="section">
                <div class="section-header">
                    <span class="material-icons section-icon">workspace_premium</span>
                    <span class="section-title">Conquistas</span>
                    <span class="section-badge">${conquistas.length} ${conquistas.length === 1 ? 'conquista' : 'conquistas'}</span>
                </div>
                <div class="achievement-list">
            `;
            conquistas.forEach(c => {
                html += `
                    <div class="achievement-item${c.destaque ? ' destaque' : ''}">
                        <span class="material-icons achievement-icon">${c.icone}</span>
                        <div class="achievement-content">
                            <div class="achievement-title">${c.texto}</div>
                            ${c.detalhe ? `<div class="achievement-value">${c.detalhe}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
            <div class="divider"></div>
        `;

        // Mata-Mata (interativo com edicoes)
        if (modulos.mataMata !== false && mataMata && mataMata.participou) {
            const totalJogos = mataMata.vitorias + mataMata.derrotas;
            const aproveitamento = totalJogos > 0 ? Math.round((mataMata.vitorias / totalJogos) * 100) : 0;
            const edicoes = mataMata.edicoes || [];

            let edicoesHtml = '';
            if (edicoes.length > 0) {
                edicoesHtml = edicoes.map(ed => {
                    const confrontosHtml = (ed.confrontos || []).map(c => `
                        <div class="mm-confronto ${c.venceu ? 'vitoria' : 'derrota'}">
                            <span class="mm-fase">${c.fase}</span>
                            <span class="mm-vs">vs ${c.adversario}</span>
                            <span class="mm-resultado">${c.venceu ? 'V' : 'D'}</span>
                        </div>
                    `).join('');

                    return `
                        <div class="mm-edicao" data-edicao="${ed.edicao}">
                            <div class="mm-edicao-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <div class="mm-edicao-info">
                                    <span class="mm-edicao-num">Edicao ${ed.edicao}</span>
                                    ${ed.campeao ? '<span class="mm-campeao-badge"><span class="material-icons">emoji_events</span></span>' : ''}
                                </div>
                                <div class="mm-edicao-stats">
                                    <span class="mm-fase-alcancada">${ed.melhorFase}</span>
                                    <span class="mm-record">${ed.vitorias}V ${ed.derrotas}D</span>
                                    <span class="material-icons mm-expand-icon">expand_more</span>
                                </div>
                            </div>
                            <div class="mm-edicao-detalhes">
                                ${confrontosHtml || '<div class="mm-sem-dados">Sem confrontos registrados</div>'}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            html += `
                <div class="section section-mata-mata">
                    <div class="section-header">
                        <span class="material-icons section-icon">military_tech</span>
                        <span class="section-title">Mata-Mata</span>
                        ${mataMata.campeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="mm-resumo">
                        <div class="mm-stat">
                            <span class="mm-stat-value">${mataMata.vitorias}</span>
                            <span class="mm-stat-label">Vitorias</span>
                        </div>
                        <div class="mm-stat">
                            <span class="mm-stat-value">${mataMata.derrotas}</span>
                            <span class="mm-stat-label">Derrotas</span>
                        </div>
                        <div class="mm-stat">
                            <span class="mm-stat-value highlight">${aproveitamento}%</span>
                            <span class="mm-stat-label">Aproveitamento</span>
                        </div>
                        <div class="mm-stat">
                            <span class="mm-stat-value">${edicoes.length}</span>
                            <span class="mm-stat-label">Edicoes</span>
                        </div>
                    </div>
                    ${edicoes.length > 0 ? `
                        <div class="mm-edicoes-container">
                            <div class="mm-edicoes-title">
                                <span class="material-icons">format_list_numbered</span>
                                Historico por Edicao
                            </div>
                            <div class="mm-edicoes-list">
                                ${edicoesHtml}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Artilheiro (v9.3: texto descritivo atualizado)
        if (modulos.artilheiro !== false && artilheiro) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">sports_soccer</span>
                        <span class="section-title">Artilheiro Campeao</span>
                        ${artilheiro.isCampeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">sports_soccer</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Voce somou ${artilheiro.gols} gols na temporada e ficou em ${artilheiro.posicao}º lugar</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Luva de Ouro (v9.3: texto descritivo atualizado)
        if (modulos.luvaOuro !== false && luvaOuro) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">sports_handball</span>
                        <span class="section-title">Luva de Ouro</span>
                        ${luvaOuro.isCampeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">sports_handball</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Seus goleiros somaram ${formatarPontosCompletos(luvaOuro.pontos || luvaOuro.defesas)} pontos na temporada e voce ficou em ${luvaOuro.posicao}º lugar</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Melhor do Mes
        if (modulos.melhorMes !== false && melhorMes && melhorMes.length > 0) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">calendar_month</span>
                        <span class="section-title">Melhor do Mes</span>
                        <span class="section-badge">${melhorMes.length}x Campeao</span>
                    </div>
                    <div class="achievement-list">
                        ${melhorMes.map(m => `
                            <div class="achievement-item">
                                <span class="material-icons achievement-icon">emoji_events</span>
                                <div class="achievement-content">
                                    <div class="achievement-title">Campeao ${m.nome || ''}</div>
                                    <div class="achievement-value">${m.pontos ? formatarPontos(m.pontos) + ' pts' : ''}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // TOP 10 (v10.3: Corrigido para usar campos novos - valores por liga)
        if (modulos.top10 !== false && top10) {
            const temAlgoNoTop10 = top10.mitosNoTop10 > 0 || top10.micosNoTop10 > 0;
            const saldoClass = top10.saldoTop10 > 0 ? 'positive' : top10.saldoTop10 < 0 ? 'negative' : '';

            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">leaderboard</span>
                        <span class="section-title">TOP 10 Performance</span>
                        ${temAlgoNoTop10 ? `<span class="section-badge ${saldoClass}">${top10.saldoTop10 >= 0 ? '+' : ''}${formatarMoeda(top10.saldoTop10)}</span>` : ''}
                    </div>
                    <div class="achievement-list">
            `;

            // MITOS no TOP 10
            if (top10.mitosNoTop10 > 0) {
                const posicoesTexto = formatarPosicoes(top10.posicoesMitosTop10);
                html += `
                    <div class="achievement-item destaque">
                        <span class="material-icons achievement-icon">grade</span>
                        <div class="achievement-content">
                            <div class="achievement-title">${top10.mitosNoTop10}x no TOP 10 Mitos</div>
                            <div class="achievement-value">
                                Posicoes: <span class="highlight">${posicoesTexto}</span> |
                                Bonus: <span class="positive">+${formatarMoeda(top10.totalBonus)}</span>
                            </div>
                            <div class="achievement-value">Melhor: ${formatarPontos(top10.melhorMitoPts)} pts (R${top10.melhorMitoRodada})</div>
                        </div>
                    </div>
                `;
            }

            // MICOS no TOP 10
            if (top10.micosNoTop10 > 0) {
                const posicoesTexto = formatarPosicoes(top10.posicoesMicosTop10);
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">sentiment_dissatisfied</span>
                        <div class="achievement-content">
                            <div class="achievement-title">${top10.micosNoTop10}x no TOP 10 Micos</div>
                            <div class="achievement-value">
                                Posicoes: <span class="highlight">${posicoesTexto}</span> |
                                Onus: <span class="negative">-${formatarMoeda(top10.totalOnus)}</span>
                            </div>
                            <div class="achievement-value">Pior: ${formatarPontos(top10.piorMicoPts)} pts (R${top10.piorMicoRodada})</div>
                        </div>
                    </div>
                `;
            }

            // Não está no TOP 10, mas aparece no ranking geral
            if (!temAlgoNoTop10 && (top10.temMitos || top10.temMicos)) {
                const aparicoesMitos = top10.aparicoesMitos?.length || 0;
                const aparicoesMicos = top10.aparicoesMicos?.length || 0;
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">info</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Fora do TOP 10</div>
                            <div class="achievement-value">
                                ${aparicoesMitos > 0 ? `${aparicoesMitos}x no ranking de mitos` : ''}
                                ${aparicoesMitos > 0 && aparicoesMicos > 0 ? ' | ' : ''}
                                ${aparicoesMicos > 0 ? `${aparicoesMicos}x no ranking de micos` : ''}
                            </div>
                            <div class="achievement-value">Apenas as 10 primeiras posicoes geram bonus/onus</div>
                        </div>
                    </div>
                `;
            }

            // Nunca apareceu em nenhum ranking
            if (!top10.temMitos && !top10.temMicos && (top10.totalMitosTemporada > 0 || top10.totalMicosTemporada > 0)) {
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">info</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Voce nao aparece no ranking TOP 10</div>
                            <div class="achievement-value">${top10.totalMitosTemporada} mitos e ${top10.totalMicosTemporada} micos registrados na temporada</div>
                        </div>
                    </div>
                `;
            }

            html += `</div></div>`;
        }

        // Pontos Corridos
        if (modulos.pontosCorridos !== false && pc) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">sync</span>
                        <span class="section-title">Pontos Corridos</span>
                        ${pc.posicao <= 3 ? `<span class="section-badge">${pc.posicao}º Lugar</span>` : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">leaderboard</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Classificacao Atual</div>
                                <div class="achievement-value">${pc.posicao}º de ${pc.total} participantes</div>
                            </div>
                        </div>
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">sports_score</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Desempenho</div>
                                <div class="achievement-value">${pc.vitorias}V ${pc.empates}E ${pc.derrotas}D • <span class="highlight">${pc.pontos} pts</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Fluxo Financeiro
        const temDadosFinanceiros = extrato?.creditos || extrato?.debitos || saldoHistorico;
        if (temDadosFinanceiros) {
            const creditos = extrato?.creditos || 0;
            const debitos = extrato?.debitos || 0;
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">account_balance_wallet</span>
                        <span class="section-title">Fluxo Financeiro</span>
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">arrow_upward</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Creditos</div>
                                <div class="achievement-value positive">+${formatarMoeda(creditos)}</div>
                            </div>
                        </div>
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">arrow_downward</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Debitos</div>
                                <div class="achievement-value negative">-${formatarMoeda(debitos)}</div>
                            </div>
                        </div>
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">account_balance</span>
                            <div class="achievement-content">
                                <div class="achievement-title">Saldo ${saldoHistorico >= 0 ? 'Positivo' : 'Negativo'}</div>
                                <div class="achievement-value ${saldoClass}">${formatarMoeda(saldoHistorico)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Footer (v9.4: usa nome da liga)
        html += `<div class="hall-footer">${ligaNome}</div>`;
        container.innerHTML = html;

        if (window.Log) Log.info("HISTORICO", "Dados em tempo real renderizados para liga:", ligaId);

    } catch (error) {
        if (window.Log) Log.error("HISTORICO", "Erro ao buscar dados em tempo real:", error);
        mostrarErro("Erro ao carregar dados");
    }
}

// =====================================================================
// ✅ v12.8: MODAL DETALHES FINANCEIROS
// =====================================================================
window.abrirModalDetalhesFinanceiros = async function(ligaId, temporada, saldoTotal) {
    if (window.Log) Log.info("HISTORICO", `Abrindo modal detalhes financeiros: liga=${ligaId} temp=${temporada}`);

    // Criar overlay do modal
    const overlay = document.createElement('div');
    overlay.id = 'modalDetalhesFinanceirosOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.85); z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        padding: 16px; animation: fadeIn 0.2s ease;
    `;

    // Loading inicial
    overlay.innerHTML = `
        <div style="background: #1f2937; border-radius: 16px; width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto;">
            <div style="padding: 24px; text-align: center;">
                <div class="spinner" style="margin: 0 auto 12px;"></div>
                <p style="color: #9ca3af;">Carregando detalhes...</p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    try {
        // Buscar dados detalhados
        const [cacheRes, camposRes, acertosRes] = await Promise.all([
            fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache?temporada=${temporada}`),
            fetch(`/api/fluxo-financeiro/${ligaId}/times/${timeId}?temporada=${temporada}`),
            fetch(`/api/acertos/${ligaId}/${timeId}?temporada=${temporada}`)
        ]);

        const cacheData = cacheRes.ok ? await cacheRes.json() : null;
        const camposData = camposRes.ok ? await camposRes.json() : null;
        const acertosData = acertosRes.ok ? await acertosRes.json() : null;

        // Processar dados
        const resumo = cacheData?.resumo || {};
        const rodadas = cacheData?.rodadas || [];
        const campos = camposData?.campos || [];
        const acertos = acertosData?.acertos || [];

        // Calcular totais
        let totalCreditos = 0;
        let totalDebitos = 0;

        rodadas.forEach(r => {
            const saldo = (r.bonusOnus || 0) + (r.pontosCorridos || 0) + (r.mataMata || 0) + (r.top10 || 0);
            if (saldo > 0) totalCreditos += saldo;
            else totalDebitos += Math.abs(saldo);
        });

        let totalCampos = 0;
        campos.forEach(c => {
            const valor = parseFloat(c.valor) || 0;
            totalCampos += valor;
            if (valor > 0) totalCreditos += valor;
            else totalDebitos += Math.abs(valor);
        });

        let totalPagamentos = 0;
        let totalRecebimentos = 0;
        acertos.forEach(a => {
            if (a.tipo === 'pagamento') totalPagamentos += a.valor;
            else totalRecebimentos += a.valor;
        });

        // Renderizar modal
        const saldoClass = saldoTotal > 0 ? 'positive' : saldoTotal < 0 ? 'negative' : '';

        overlay.innerHTML = `
            <div style="background: #1f2937; border-radius: 16px; width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto;">
                <!-- Header -->
                <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="color: #fff; margin: 0; font-size: 18px; font-weight: 700;">Detalhes Financeiros</h2>
                        <p style="color: #9ca3af; margin: 4px 0 0; font-size: 13px;">Temporada ${temporada}</p>
                    </div>
                    <button onclick="document.getElementById('modalDetalhesFinanceirosOverlay').remove()"
                            style="background: none; border: none; color: #9ca3af; font-size: 24px; cursor: pointer; padding: 4px;">
                        <span class="material-icons">close</span>
                    </button>
                </div>

                <!-- Saldo Principal -->
                <div style="padding: 20px; background: linear-gradient(135deg, rgba(255,85,0,0.1) 0%, rgba(255,136,0,0.05) 100%); text-align: center;">
                    <div style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Saldo Final</div>
                    <div style="color: ${saldoTotal > 0 ? '#10b981' : saldoTotal < 0 ? '#ef4444' : '#fff'}; font-size: 32px; font-weight: 700; margin: 8px 0;">
                        ${formatarMoeda(saldoTotal)}
                    </div>
                </div>

                <!-- Resumo -->
                <div style="padding: 16px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="background: rgba(16,185,129,0.1); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="color: #10b981; font-size: 12px;">Creditos</div>
                        <div style="color: #10b981; font-size: 18px; font-weight: 700;">+${formatarMoeda(totalCreditos)}</div>
                    </div>
                    <div style="background: rgba(239,68,68,0.1); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="color: #ef4444; font-size: 12px;">Debitos</div>
                        <div style="color: #ef4444; font-size: 18px; font-weight: 700;">-${formatarMoeda(totalDebitos)}</div>
                    </div>
                </div>

                <!-- Detalhamento -->
                <div style="padding: 0 20px 20px;">
                    <!-- Rodadas -->
                    <div style="margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span class="material-icons" style="color: #ff5500; font-size: 18px;">sports_soccer</span>
                            <span style="color: #e5e5e5; font-size: 14px; font-weight: 600;">Rodadas Disputadas</span>
                            <span style="color: #6b7280; font-size: 12px; margin-left: auto;">${rodadas.length} rodadas</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #9ca3af; font-size: 12px;">Bonus/Onus</span>
                                <span style="color: #e5e5e5; font-size: 12px;">${formatarMoeda(rodadas.reduce((s,r) => s + (r.bonusOnus || 0), 0))}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #9ca3af; font-size: 12px;">Pontos Corridos</span>
                                <span style="color: #e5e5e5; font-size: 12px;">${formatarMoeda(rodadas.reduce((s,r) => s + (r.pontosCorridos || 0), 0))}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #9ca3af; font-size: 12px;">Mata-Mata</span>
                                <span style="color: #e5e5e5; font-size: 12px;">${formatarMoeda(rodadas.reduce((s,r) => s + (r.mataMata || 0), 0))}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #9ca3af; font-size: 12px;">TOP 10 (Mitos/Micos)</span>
                                <span style="color: #e5e5e5; font-size: 12px;">${formatarMoeda(rodadas.reduce((s,r) => s + (r.top10 || 0), 0))}</span>
                            </div>
                        </div>
                    </div>

                    ${campos.length > 0 ? `
                    <!-- Ajustes/Premios -->
                    <div style="margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span class="material-icons" style="color: #fbbf24; font-size: 18px;">tune</span>
                            <span style="color: #e5e5e5; font-size: 14px; font-weight: 600;">Ajustes/Premios</span>
                            <span style="color: #6b7280; font-size: 12px; margin-left: auto;">${campos.length} itens</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px;">
                            ${campos.map(c => `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span style="color: #9ca3af; font-size: 12px;">${c.nome}</span>
                                    <span style="color: ${parseFloat(c.valor) >= 0 ? '#10b981' : '#ef4444'}; font-size: 12px;">
                                        ${parseFloat(c.valor) >= 0 ? '+' : ''}${formatarMoeda(c.valor)}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    ${acertos.length > 0 ? `
                    <!-- Acertos -->
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span class="material-icons" style="color: #8b5cf6; font-size: 18px;">handshake</span>
                            <span style="color: #e5e5e5; font-size: 14px; font-weight: 600;">Acertos Financeiros</span>
                            <span style="color: #6b7280; font-size: 12px; margin-left: auto;">${acertos.length} registros</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px;">
                            ${acertos.slice(0, 5).map(a => `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span style="color: #9ca3af; font-size: 12px;">${a.tipo === 'pagamento' ? 'Pagou' : 'Recebeu'}</span>
                                    <span style="color: ${a.tipo === 'pagamento' ? '#10b981' : '#ef4444'}; font-size: 12px;">
                                        ${a.tipo === 'pagamento' ? '+' : '-'}${formatarMoeda(a.valor)}
                                    </span>
                                </div>
                            `).join('')}
                            ${acertos.length > 5 ? `<div style="color: #6b7280; font-size: 11px; text-align: center; margin-top: 8px;">+${acertos.length - 5} registros</div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

    } catch (error) {
        if (window.Log) Log.error("HISTORICO", "Erro ao carregar detalhes financeiros:", error);
        overlay.innerHTML = `
            <div style="background: #1f2937; border-radius: 16px; width: 100%; max-width: 420px; padding: 24px; text-align: center;">
                <span class="material-icons" style="color: #ef4444; font-size: 48px; margin-bottom: 12px;">error_outline</span>
                <h3 style="color: #ef4444; margin: 0 0 8px;">Erro ao carregar</h3>
                <p style="color: #9ca3af; margin: 0 0 16px;">Nao foi possivel carregar os detalhes financeiros.</p>
                <button onclick="document.getElementById('modalDetalhesFinanceirosOverlay').remove()"
                        style="padding: 12px 24px; background: #ff5500; border: none; border-radius: 8px; color: #fff; cursor: pointer;">
                    Fechar
                </button>
            </div>
        `;
    }
};

if (window.Log) Log.info("HISTORICO", "Hall da Fama v12.8 pronto (modal detalhes)");

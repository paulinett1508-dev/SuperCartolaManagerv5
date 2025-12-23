// =====================================================================
// PARTICIPANTE-HISTORICO.JS - v9.4 (HALL DA FAMA - MELHORIAS FINAIS)
// =====================================================================
// v9.4: Melhorias finais:
//       - TOP10: Mostra quantas vezes apareceu no ranking (ex: "2º melhor MITO (3x)")
//       - Artilheiro/Luva: Remove linha "Melhor: [nome]" (informação redundante)
//       - Rodapé: Usa nome da liga selecionada (não mais hardcoded "Super Cartola Manager")
// v9.3: Textos descritivos melhorados + FIX nome da liga + TOP10 sempre visível:
//       - Pontuação Total: número completo com decimais (ex: 3.012,50)
//       - Artilheiro: "Você somou XX gols na temporada e ficou em XXº lugar"
//       - Luva de Ouro: "Seus goleiros somaram XX pontos na temporada e você ficou em XXº lugar"
//       - FIX: Subtítulo agora mostra o nome da liga selecionada (não sempre "Super Cartola")
//       - TOP10: Card aparece sempre, mostra mensagem se não estiver no ranking
// v9.2: Adiciona seções "Seu Desempenho" e "Conquistas" consolidadas
//       - Mostra classificação, rodadas, média por rodada
//       - Lista conquistas: Artilheiro, Luva de Ouro, TOP10, Melhor Mês, Mata-Mata
// v9.1: FIX APIS - Corrige mapeamento de campos das APIs:
//       - buscarRanking: rodadas_jogadas (não rodadas)
//       - buscarArtilheiro: data.data.ranking, golsPro, nome
//       - buscarLuvaOuro: data.data.ranking, participanteId, pontosTotais
// v9.0: FIX CRÍTICO - Filtra pela liga selecionada (não ignora mais ligaId)
// v8.0: Dados corrigidos: Ranking, Melhor Rodada, Saldo Histórico,
//       Mata-Mata com aproveitamento, Extrato com Créditos/Débitos
// v7.0: Layout limpo, sem seletores, mostra TODAS as ligas do participante
// =====================================================================

if (window.Log) Log.info("HISTORICO", "Hall da Fama v9.4 carregando...");

// Estado do modulo
let historicoData = null;
let timeId = null;
let ligaIdSelecionada = null; // v9.0: Liga atualmente selecionada

// =====================================================================
// FUNCAO PRINCIPAL
// =====================================================================
export async function inicializarHistoricoParticipante({ participante, ligaId: _ligaId, timeId: _timeId }) {
    if (window.Log) Log.info("HISTORICO", "Inicializando...", { ligaId: _ligaId, timeId: _timeId });

    timeId = _timeId;
    ligaIdSelecionada = _ligaId; // v9.0: Armazenar liga selecionada

    if (!timeId) {
        mostrarErro("Dados invalidos");
        return;
    }

    if (!ligaIdSelecionada) {
        if (window.Log) Log.warn("HISTORICO", "Liga não selecionada - mostrando todas");
    }

    try {
        const response = await fetch(`/api/participante/historico/${timeId}`);
        if (!response.ok) {
            if (response.status === 404) {
                mostrarVazio();
                return;
            }
            throw new Error(`Erro ${response.status}`);
        }

        historicoData = await response.json();
        if (!historicoData.success) throw new Error(historicoData.error);

        if (window.Log) Log.info("HISTORICO", "Dados:", { temporadas: historicoData.historico?.length });

        // Atualizar subtitle com temporada(s) e nome da liga (v9.3)
        const elSubtitle = document.getElementById("headerSubtitle");
        let temporadas = historicoData.historico || [];
        
        // v9.3: Filtrar pela liga selecionada para pegar o nome correto
        if (ligaIdSelecionada) {
            temporadas = temporadas.filter(t => String(t.liga_id) === String(ligaIdSelecionada));
        }
        
        const anos = [...new Set(temporadas.map(t => t.ano))].sort((a, b) => b - a);
        const nomeLiga = temporadas[0]?.liga_nome || 'Super Cartola'; // v9.3: Pegar nome da liga
        
        if (elSubtitle) {
            elSubtitle.textContent = anos.length > 0
                ? `Temporada${anos.length > 1 ? 's' : ''} ${anos.join(', ')} • ${nomeLiga}`
                : nomeLiga;
        }

        // Renderizar TODAS as ligas
        await renderizarTodasLigas();

    } catch (error) {
        if (window.Log) Log.error("HISTORICO", "Erro:", error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// RENDERIZAR LIGAS (v9.0: Filtra pela liga selecionada)
// =====================================================================
async function renderizarTodasLigas() {
    const container = document.getElementById("historicoDetalhe");
    if (!container) return;

    container.innerHTML = `<div class="loading-state"><span class="material-icons spin">sync</span><span>Carregando dados...</span></div>`;

    let temporadas = historicoData.historico || [];

    // v9.0: Filtrar pela liga selecionada (se houver)
    if (ligaIdSelecionada) {
        temporadas = temporadas.filter(t => String(t.liga_id) === String(ligaIdSelecionada));
        if (window.Log) Log.debug("HISTORICO", `Filtrando por liga: ${ligaIdSelecionada}`, { encontradas: temporadas.length });
    }

    // v9.0: Se não há histórico consolidado para a liga, buscar dados em tempo real
    if (temporadas.length === 0 && ligaIdSelecionada) {
        if (window.Log) Log.info("HISTORICO", "Sem histórico consolidado - buscando dados em tempo real");
        await renderizarDadosTempoReal(ligaIdSelecionada);
        return;
    }

    if (temporadas.length === 0) {
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

        // Buscar dados REAIS da API (v8.0: adicionado ranking, melhorRodada e extrato)
        const modulos = tempRecente.modulos_ativos || {};
        const [pc, top10, melhorMes, mataMata, artilheiro, luvaOuro, ranking, melhorRodada, extrato] = await Promise.all([
            modulos.pontosCorridos !== false ? buscarPontosCorridos(ligaId) : null,
            modulos.top10 !== false ? buscarTop10(ligaId) : null,
            modulos.melhorMes !== false ? buscarMelhorMes(ligaId) : null,
            modulos.mataMata !== false ? buscarMataMata(ligaId) : null,
            modulos.artilheiro !== false ? buscarArtilheiro(ligaId) : null,
            modulos.luvaOuro !== false ? buscarLuvaOuro(ligaId) : null,
            buscarRanking(ligaId),
            buscarMelhorRodada(ligaId),
            buscarExtrato(ligaId)
        ]);

        // v8.0: Usar dados do Ranking (prioridade) ou Pontos Corridos como fallback
        const posicaoReal = ranking?.posicao || pc?.posicao || tempRecente.estatisticas?.posicao_final || '-';
        const pontosReais = ranking?.pontos || pc?.pontos || 0;
        const totalParticipantes = ranking?.total || pc?.total || 0;
        const rodadasJogadas = ranking?.rodadas || (pc ? (pc.vitorias + pc.empates + pc.derrotas) : 0);

        // v8.0: Usar saldo do extrato (histórico real)
        const saldoHistorico = extrato?.saldo ?? (tempRecente.financeiro?.saldo_final || 0);
        const saldoClass = saldoHistorico > 0 ? 'positive' : saldoHistorico < 0 ? 'negative' : '';

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
                <div class="stat-card">
                    <div class="material-icons stat-icon">paid</div>
                    <div class="stat-label">Saldo Final</div>
                    <div class="stat-value ${saldoClass}">${formatarMoeda(saldoHistorico)}</div>
                    <div class="stat-subtitle">Historico Financeiro</div>
                </div>
                <div class="stat-card">
                    <div class="material-icons stat-icon">stars</div>
                    <div class="stat-label">Melhor Rodada</div>
                    <div class="stat-value">${melhorRodada ? 'R' + melhorRodada.rodada : '-'}</div>
                    <div class="stat-subtitle">${melhorRodada ? `${formatarPontos(melhorRodada.pontos)} pontos` : 'Sem dados'}</div>
                </div>
            </div>
            <div class="divider"></div>
        `;

        // Mata-Mata (v9.0: verifica módulo ativo)
        if (modulos.mataMata !== false && mataMata && mataMata.participou) {
            const totalJogos = mataMata.vitorias + mataMata.derrotas;
            const aproveitamento = totalJogos > 0 ? Math.round((mataMata.vitorias / totalJogos) * 100) : 0;
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">military_tech</span>
                        <span class="section-title">Mata-Mata</span>
                        ${mataMata.campeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">workspace_premium</span>
                            <div class="achievement-content">
                                <div class="achievement-title">${mataMata.campeao ? 'Campeao!' : mataMata.melhorFase || 'Participou'}</div>
                                <div class="achievement-value">${mataMata.vitorias}V ${mataMata.derrotas}D • <span class="highlight">${aproveitamento}%</span> aproveitamento</div>
                            </div>
                        </div>
                    </div>
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

        // TOP 10 (v9.3: mostra sempre, mesmo sem estar no ranking)
        if (modulos.top10 !== false && top10) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">leaderboard</span>
                        <span class="section-title">TOP 10 Performance</span>
                    </div>
                    <div class="achievement-list">
            `;

            if (top10.isMito) {
                const vezesMito = top10.countMitos > 1 ? ` (${top10.countMitos}x)` : '';
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">grade</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Voce foi o ${top10.mitoPos}º melhor MITO da temporada${vezesMito}</div>
                            <div class="achievement-value"><span class="highlight">${formatarPontos(top10.mitoPontos)}</span> pontos na rodada</div>
                        </div>
                    </div>
                `;
            }

            if (top10.isMico) {
                const vezesMico = top10.countMicos > 1 ? ` (${top10.countMicos}x)` : '';
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">sentiment_dissatisfied</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Voce foi o ${top10.micoPos}º pior MICO da temporada${vezesMico}</div>
                            <div class="achievement-value">${formatarPontos(top10.micoPontos)} pontos na rodada</div>
                        </div>
                    </div>
                `;
            }

            // v9.3: Se não está em nenhum ranking, mostrar mensagem informativa
            if (!top10.isMito && !top10.isMico && (top10.totalMitos > 0 || top10.totalMicos > 0)) {
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">info</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Voce nao esta no TOP 10 desta temporada</div>
                            <div class="achievement-value">${top10.totalMitos} mitos e ${top10.totalMicos} micos registrados</div>
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

    container.innerHTML = html;
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
    try {
        const res = await fetch(`/api/top10/cache/${tempLigaId}`);
        if (!res.ok) {
            if (window.Log) Log.warn("HISTORICO", "TOP10 API não disponível");
            return null;
        }
        const data = await res.json();
        
        // v9.4: Contar TODAS as aparições do participante nos rankings (pode aparecer múltiplas vezes)
        let countMitos = 0;
        let countMicos = 0;
        let primeiraMitoPos = null;
        let primeiraMicoPos = null;
        let primeiraMitoPts = 0;
        let primeiraMicoPts = 0;
        
        // Contar aparições nos MITOS (TOP 10)
        data.mitos?.slice(0, 10).forEach((m, index) => {
            const mTimeId = m.timeId || m.time_id;
            if (String(mTimeId) === String(timeId)) {
                countMitos++;
                if (!primeiraMitoPos) {
                    primeiraMitoPos = index + 1;
                    primeiraMitoPts = m.pontos || 0;
                }
            }
        });
        
        // Contar aparições nos MICOS (TOP 10)
        data.micos?.slice(0, 10).forEach((m, index) => {
            const mTimeId = m.timeId || m.time_id;
            if (String(mTimeId) === String(timeId)) {
                countMicos++;
                if (!primeiraMicoPos) {
                    primeiraMicoPos = index + 1;
                    primeiraMicoPts = m.pontos || 0;
                }
            }
        });
        
        return {
            isMito: countMitos > 0,
            isMico: countMicos > 0,
            mitoPos: primeiraMitoPos,
            micoPos: primeiraMicoPos,
            mitoPontos: primeiraMitoPts,
            micoPontos: primeiraMicoPts,
            // v9.4: Contagem de aparições
            countMitos: countMitos,
            countMicos: countMicos,
            totalMitos: data.mitos?.length || 0,
            totalMicos: data.micos?.length || 0,
            melhorMito: data.mitos?.[0] || null,
            piorMico: data.micos?.[0] || null
        };
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

        data.edicoes.forEach(ed => {
            if (ed.campeao && String(ed.campeao.timeId) === String(timeId)) {
                campeao = true;
                participou = true;
            }
            (ed.fases || []).forEach(fase => {
                (fase.confrontos || []).forEach(confronto => {
                    const isTimeA = confronto.timeA && String(confronto.timeA.timeId) === String(timeId);
                    const isTimeB = confronto.timeB && String(confronto.timeB.timeId) === String(timeId);
                    if (isTimeA || isTimeB) {
                        participou = true;
                        if (!melhorFase || fase.ordem > melhorFase.ordem) {
                            melhorFase = { nome: fase.nome, ordem: fase.ordem };
                        }
                        if (confronto.vencedor === 'A' && isTimeA) vitorias++;
                        if (confronto.vencedor === 'B' && isTimeB) vitorias++;
                        if (confronto.vencedor === 'A' && isTimeB) derrotas++;
                        if (confronto.vencedor === 'B' && isTimeA) derrotas++;
                    }
                });
            });
        });

        return participou ? { participou, campeao, vitorias, derrotas, melhorFase: melhorFase?.nome || null } : null;
    } catch { return null; }
}

async function buscarArtilheiro(tempLigaId) {
    try {
        const res = await fetch(`/api/artilheiro-campeao/${tempLigaId}/ranking`);
        if (!res.ok) return null;
        const data = await res.json();
        // v9.1 FIX: API retorna data.data.ranking, não data.ranking
        const ranking = data.data?.ranking || data.ranking;
        if (!ranking) return null;
        const meu = ranking.find(t => String(t.time_id) === String(timeId) || String(t.timeId) === String(timeId));
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
async function buscarExtrato(tempLigaId) {
    try {
        const res = await fetch(`/api/extrato-cache/${tempLigaId}/times/${timeId}/cache`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data) return null;

        const resumo = data.resumo || {};
        return {
            creditos: resumo.totalGanhos || 0,
            debitos: Math.abs(resumo.totalPerdas || 0),
            saldo: resumo.saldo_atual ?? resumo.saldo_final ?? resumo.saldo ?? (resumo.totalGanhos || 0) - Math.abs(resumo.totalPerdas || 0)
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

function mostrarErro(msg) {
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
                    elSubtitle.textContent = `Temporada ${ligaData.ano || 2025} • ${ligaNome}`;
                }
            }
        } catch (e) {
            if (window.Log) Log.warn("HISTORICO", "Erro ao buscar liga:", e);
        }

        // Buscar dados em paralelo
        const [ranking, melhorRodada, extrato, pc, top10, mataMata, artilheiro, luvaOuro, melhorMes] = await Promise.all([
            buscarRanking(ligaId),
            buscarMelhorRodada(ligaId),
            buscarExtrato(ligaId),
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
                <div class="stat-card">
                    <div class="material-icons stat-icon">paid</div>
                    <div class="stat-label">Saldo Atual</div>
                    <div class="stat-value ${saldoClass}">${formatarMoeda(saldoHistorico)}</div>
                    <div class="stat-subtitle">Historico Financeiro</div>
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

        // Mata-Mata
        if (modulos.mataMata !== false && mataMata && mataMata.participou) {
            const totalJogos = mataMata.vitorias + mataMata.derrotas;
            const aproveitamento = totalJogos > 0 ? Math.round((mataMata.vitorias / totalJogos) * 100) : 0;
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">military_tech</span>
                        <span class="section-title">Mata-Mata</span>
                        ${mataMata.campeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">workspace_premium</span>
                            <div class="achievement-content">
                                <div class="achievement-title">${mataMata.campeao ? 'Campeao!' : mataMata.melhorFase || 'Participou'}</div>
                                <div class="achievement-value">${mataMata.vitorias}V ${mataMata.derrotas}D • <span class="highlight">${aproveitamento}%</span> aproveitamento</div>
                            </div>
                        </div>
                    </div>
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

        // TOP 10 (v9.3: mostra sempre, mesmo sem estar no ranking)
        if (modulos.top10 !== false && top10) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">leaderboard</span>
                        <span class="section-title">TOP 10 Performance</span>
                    </div>
                    <div class="achievement-list">
            `;
            if (top10.isMito) {
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">grade</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Voce foi o ${top10.mitoPos}º melhor MITO da temporada</div>
                            <div class="achievement-value"><span class="highlight">${formatarPontos(top10.mitoPontos)}</span> pontos na rodada</div>
                        </div>
                    </div>
                `;
            }
            if (top10.isMico) {
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">sentiment_dissatisfied</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Voce foi o ${top10.micoPos}º pior MICO da temporada</div>
                            <div class="achievement-value">${formatarPontos(top10.micoPontos)} pontos na rodada</div>
                        </div>
                    </div>
                `;
            }
            
            // v9.3: Se não está em nenhum ranking, mostrar mensagem informativa
            if (!top10.isMito && !top10.isMico && (top10.totalMitos > 0 || top10.totalMicos > 0)) {
                html += `
                    <div class="achievement-item">
                        <span class="material-icons achievement-icon">info</span>
                        <div class="achievement-content">
                            <div class="achievement-title">Voce nao esta no TOP 10 desta temporada</div>
                            <div class="achievement-value">${top10.totalMitos} mitos e ${top10.totalMicos} micos registrados</div>
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

if (window.Log) Log.info("HISTORICO", "Hall da Fama v9.4 pronto");

// =====================================================================
// PARTICIPANTE-HISTORICO.JS - v8.0 (HALL DA FAMA - DADOS REAIS)
// =====================================================================
// v8.0: Dados corrigidos: Ranking, Melhor Rodada, Saldo Histórico,
//       Mata-Mata com aproveitamento, Extrato com Créditos/Débitos
// v7.0: Layout limpo, sem seletores, mostra TODAS as ligas do participante
// =====================================================================

if (window.Log) Log.info("HISTORICO", "Hall da Fama v8.0 carregando...");

// Estado do modulo
let historicoData = null;
let timeId = null;

// =====================================================================
// FUNCAO PRINCIPAL
// =====================================================================
export async function inicializarHistoricoParticipante({ participante, ligaId: _ligaId, timeId: _timeId }) {
    if (window.Log) Log.info("HISTORICO", "Inicializando...", { timeId: _timeId });

    timeId = _timeId;

    if (!timeId) {
        mostrarErro("Dados invalidos");
        return;
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

        // Atualizar subtitle com temporada(s)
        const elSubtitle = document.getElementById("headerSubtitle");
        const temporadas = historicoData.historico || [];
        const anos = [...new Set(temporadas.map(t => t.ano))].sort((a, b) => b - a);
        if (elSubtitle) {
            elSubtitle.textContent = anos.length > 0
                ? `Temporada${anos.length > 1 ? 's' : ''} ${anos.join(', ')} • Super Cartola`
                : 'Super Cartola';
        }

        // Renderizar TODAS as ligas
        await renderizarTodasLigas();

    } catch (error) {
        if (window.Log) Log.error("HISTORICO", "Erro:", error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// RENDERIZAR TODAS AS LIGAS
// =====================================================================
async function renderizarTodasLigas() {
    const container = document.getElementById("historicoDetalhe");
    if (!container) return;

    container.innerHTML = `<div class="loading-state"><span class="material-icons spin">sync</span><span>Carregando dados...</span></div>`;

    const temporadas = historicoData.historico || [];

    if (temporadas.length === 0) {
        mostrarVazio();
        return;
    }

    // Agrupar por liga
    const ligasMap = new Map();
    temporadas.forEach(t => {
        const key = t.liga_id;
        if (!ligasMap.has(key)) {
            ligasMap.set(key, { nome: t.liga_nome, temporadas: [] });
        }
        ligasMap.get(key).temporadas.push(t);
    });

    let html = '';

    // Para cada liga, renderizar seus dados
    for (const [ligaId, ligaData] of ligasMap) {
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
                    <div class="stat-value">${formatarPontos(pontosReais)}</div>
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

        // Mata-Mata (v8.0: com aproveitamento - estilo "Seu Desempenho")
        if (mataMata && mataMata.participou) {
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

        // Artilheiro
        if (artilheiro) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">sports_soccer</span>
                        <span class="section-title">Artilheiro Campeao</span>
                        ${artilheiro.isCampeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">star</span>
                            <div class="achievement-content">
                                <div class="achievement-title">${artilheiro.jogador || 'Melhor Atacante'}</div>
                                <div class="achievement-value">${artilheiro.gols} gols na temporada</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Luva de Ouro
        if (luvaOuro) {
            html += `
                <div class="section">
                    <div class="section-header">
                        <span class="material-icons section-icon">sports_handball</span>
                        <span class="section-title">Luva de Ouro</span>
                        ${luvaOuro.isCampeao ? '<span class="section-badge">Campeao</span>' : ''}
                    </div>
                    <div class="achievement-list">
                        <div class="achievement-item">
                            <span class="material-icons achievement-icon">shield</span>
                            <div class="achievement-content">
                                <div class="achievement-title">${luvaOuro.goleiro || 'Melhor Goleiro'}</div>
                                <div class="achievement-value">${luvaOuro.defesas} defesas na temporada</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Melhor do Mes
        if (melhorMes && melhorMes.length > 0) {
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

        // TOP 10 (v8.0: texto descritivo)
        if (top10 && (top10.isMito || top10.isMico)) {
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

            html += `
                    </div>
                </div>
            `;
        }

        // Pontos Corridos (detalhes)
        if (pc) {
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

    // Footer
    html += `<div class="hall-footer">Super Cartola Manager</div>`;

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
        if (!res.ok) return null;
        const data = await res.json();
        const mito = data.mitos?.find(t => String(t.timeId) === String(timeId));
        const mico = data.micos?.find(t => String(t.timeId) === String(timeId));
        return {
            isMito: !!mito,
            isMico: !!mico,
            mitoPos: mito ? data.mitos.indexOf(mito) + 1 : null,
            micoPos: mico ? data.micos.indexOf(mico) + 1 : null,
            mitoPontos: mito?.pontos || 0,
            micoPontos: mico?.pontos || 0
        };
    } catch { return null; }
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
        if (!data.ranking) return null;
        const meu = data.ranking.find(t => String(t.time_id) === String(timeId) || String(t.timeId) === String(timeId));
        if (!meu) return null;
        return {
            posicao: data.ranking.indexOf(meu) + 1,
            gols: meu.gols || meu.total_gols || 0,
            jogador: meu.artilheiro_nome || meu.nome_jogador || null,
            isCampeao: data.ranking.indexOf(meu) === 0
        };
    } catch { return null; }
}

async function buscarLuvaOuro(tempLigaId) {
    try {
        const res = await fetch(`/api/luva-de-ouro/${tempLigaId}/ranking`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.ranking) return null;
        const meu = data.ranking.find(t => String(t.time_id) === String(timeId) || String(t.timeId) === String(timeId));
        if (!meu) return null;
        return {
            posicao: data.ranking.indexOf(meu) + 1,
            defesas: meu.defesas || meu.total_defesas || 0,
            goleiro: meu.goleiro_nome || meu.nome_jogador || null,
            isCampeao: data.ranking.indexOf(meu) === 0
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
            rodadas: meu.rodadas || 0
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

if (window.Log) Log.info("HISTORICO", "Hall da Fama v8.0 pronto");

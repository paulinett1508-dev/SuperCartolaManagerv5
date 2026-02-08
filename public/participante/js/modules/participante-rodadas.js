// =====================================================================
// PARTICIPANTE-RODADAS.JS - v7.0 CARTOLA-STYLE ESCALATION + CHART
// ✅ v7.0: Minha Escalação estilo Cartola/Globo com escudos, capitão,
//          reserva de luxo, banco de reservas, gráfico evolutivo
// ✅ v6.0: Removido slider redundante, laranja sutil (#FF4500),
//          detalhamento enriquecido com "Meu Resumo" card
// ✅ v5.1: "Curiosar" + Badge "X/12 em campo"
// ✅ v5.0: Redesign completo
// ✅ v4.6: FIX - Double RAF para garantir container no DOM após refresh
// ✅ v4.5: Removido LIGAS_CONFIG hardcoded - configs vêm do servidor
// ✅ v4.4: CACHE-FIRST - Carregamento instantâneo do IndexedDB
// =====================================================================

if (window.Log) Log.info("[PARTICIPANTE-RODADAS] Carregando modulo v7.0...");

// Importar módulo de parciais
import * as ParciaisModule from "./participante-rodada-parcial.js";
// Importar módulo de polling inteligente
import * as PollingInteligenteModule from "./participante-rodadas-polling.js";

// Estado do módulo
let todasRodadasCache = [];
let meuTimeId = null;
let ligaId = null;
let rodadaSelecionada = null;
let rodadaAtualCartola = 38;
let parciaisInfo = null;
const TEMPORADA_ATUAL = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarRodadasParticipante({
    participante,
    ligaId: ligaIdParam,
    timeId,
}) {
    if (window.Log)
        Log.info("[PARTICIPANTE-RODADAS] Inicializando v6.0...", {
            ligaIdParam,
            timeId,
        });

    ligaId = ligaIdParam;
    meuTimeId = timeId;

    // Aguardar DOM estar renderizado (double RAF)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const cache = window.ParticipanteCache;
    let usouCache = false;

    // =========================================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    // =========================================================================
    if (cache) {
        const rodadasCache = await (cache.getRodadasAsync
            ? cache.getRodadasAsync(ligaId, null, null, TEMPORADA_ATUAL)
            : cache.getRodadas(ligaId, TEMPORADA_ATUAL));

        if (rodadasCache && Array.isArray(rodadasCache) && rodadasCache.length > 0) {
            usouCache = true;
            if (window.Log) Log.info("[PARTICIPANTE-RODADAS] ⚡ INSTANT LOAD - dados do cache!");

            const rodadasAgrupadas = agruparRodadasPorNumero(rodadasCache);
            todasRodadasCache = rodadasAgrupadas;

            mostrarLoading(false);
            renderizarInterface(rodadasAgrupadas);
        }
    }

    if (!usouCache) {
        mostrarLoading(true);
    }

    // =========================================================================
    // FASE 2: ATUALIZAÇÃO EM BACKGROUND (Fetch API)
    // =========================================================================
    try {
        // 1. Buscar rodada atual e verificar parciais
        await buscarRodadaAtual();

        // 2. Inicializar módulo de parciais
        parciaisInfo = await ParciaisModule.inicializarParciais(ligaId, timeId);
        if (window.Log)
            Log.info("[PARTICIPANTE-RODADAS] 📊 Parciais:", parciaisInfo);

        // 3. Buscar rodadas consolidadas
        const response = await fetch(
            `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38&temporada=${TEMPORADA_ATUAL}`,
        );
        if (!response.ok) {
            if (!usouCache) throw new Error(`Erro HTTP ${response.status}`);
            return;
        }

        const rodadas = await response.json();
        if (window.Log)
            Log.info(
                `[PARTICIPANTE-RODADAS] 📊 ${rodadas.length} registros recebidos`,
            );

        // 4. Atualizar cache com dados frescos
        if (cache) {
            cache.setRodadas(ligaId, rodadas, TEMPORADA_ATUAL);
        }

        // 5. Agrupar rodadas
        const rodadasAgrupadas = agruparRodadasPorNumero(rodadas);
        todasRodadasCache = rodadasAgrupadas;

        mostrarLoading(false);

        if (rodadasAgrupadas.length === 0 && !parciaisInfo?.disponivel) {
            if (!usouCache) mostrarEstadoVazio(true);
            return;
        }

        // 6. Renderizar interface completa
        renderizarInterface(rodadasAgrupadas);
    } catch (error) {
        if (window.Log) Log.error("[PARTICIPANTE-RODADAS] ❌ Erro:", error);
        if (!usouCache) {
            mostrarLoading(false);
            mostrarErro(error.message);
        }
    }
}

window.inicializarRodadasParticipante = inicializarRodadasParticipante;

// =====================================================================
// BUSCAR RODADA ATUAL
// =====================================================================
async function buscarRodadaAtual() {
    try {
        const response = await fetch("/api/cartola/mercado/status");
        if (response.ok) {
            const data = await response.json();
            rodadaAtualCartola = data.rodada_atual || 38;
            if (window.Log)
                Log.info(
                    `[PARTICIPANTE-RODADAS] 📅 Rodada atual: ${rodadaAtualCartola}`,
                );
        }
    } catch (e) {
        if (window.Log)
            Log.warn(
                "[PARTICIPANTE-RODADAS] ⚠️ Não foi possível obter rodada atual",
            );
    }
}

// =====================================================================
// AGRUPAMENTO
// =====================================================================
function agruparRodadasPorNumero(rodadas) {
    const rodadasMap = new Map();

    rodadas.forEach((r) => {
        const rodadaNum = r.rodada;
        if (!rodadasMap.has(rodadaNum)) {
            rodadasMap.set(rodadaNum, {
                numero: rodadaNum,
                participantes: [],
                meusPontos: null,
                jogou: false,
                posicaoFinanceira: null,
                valorFinanceiro: null,
            });
        }

        const rodadaData = rodadasMap.get(rodadaNum);
        rodadaData.participantes.push({ ...r });
        if (!rodadaData.totalParticipantesAtivos && r.totalParticipantesAtivos) {
            rodadaData.totalParticipantesAtivos = r.totalParticipantesAtivos;
        }

        const timeId = r.timeId || r.time_id;
        if (String(timeId) === String(meuTimeId)) {
            rodadaData.meusPontos = r.pontos || 0;
            rodadaData.jogou = !r.rodadaNaoJogada;
            rodadaData.posicaoFinanceira = r.posicao;
            rodadaData.valorFinanceiro = r.valorFinanceiro;
        }
    });

    return Array.from(rodadasMap.values()).sort((a, b) => a.numero - b.numero);
}

function getTotalParticipantesAtivos(rodada) {
    if (!rodada) return 0;
    if (rodada.totalParticipantesAtivos) return rodada.totalParticipantesAtivos;
    if (!Array.isArray(rodada.participantes)) return 0;
    const ativos = rodada.participantes.filter((p) => p.rodadaNaoJogada !== true);
    return ativos.length || rodada.participantes.length;
}

// =====================================================================
// RENDERIZAR INTERFACE COMPLETA
// =====================================================================
function renderizarInterface(rodadas) {
    // 1. Renderizar Grid de Rodadas
    renderizarGridRodadas(rodadas);

    // 2. Renderizar Gráfico Evolutivo (substitui Mitos/Micos)
    renderizarGraficoEvolutivo(rodadas, null);

    // 3. Renderizar Card de Desempenho (mantido como fallback)
    renderizarCardDesempenho(rodadas);

    // 4. Mostrar container
    const container = document.getElementById('rodadasGruposContainer');
    if (container) container.style.display = 'flex';
}

// =====================================================================
// GRID DE RODADAS (todas as rodadas, sem agrupamento por turno)
// =====================================================================
function renderizarGridRodadas(rodadas) {
    const container = document.getElementById('rodadasGruposContainer');
    if (!container) return;

    const rodadasMap = new Map();
    rodadas.forEach(r => rodadasMap.set(r.numero, r));

    container.innerHTML = `
        <div class="rodadas-mini-grid" id="grid-todas-rodadas" style="padding:0 4px;">
            ${renderizarMiniCards(1, 38, rodadasMap)}
        </div>
    `;
}

function renderizarMiniCards(inicio, fim, rodadasMap) {
    let html = '';

    for (let i = inicio; i <= fim; i++) {
        const rodada = rodadasMap.get(i);
        const isParcial = parciaisInfo?.disponivel && i === parciaisInfo.rodada;
        const isFuturo = i > rodadaAtualCartola;
        const temDados = rodada && rodada.participantes.length > 0;
        const jogou = rodada?.jogou || false;
        const pontos = rodada?.meusPontos;
        const valorFinanceiro = rodada?.valorFinanceiro;

        let classes = ['rodada-mini-card'];
        let tipoDestaque = null;

            if (isParcial) {
                classes.push('parcial');
            } else if (isFuturo || (!temDados && !isParcial)) {
                classes.push('futuro');
            } else if (jogou) {
                // Cores por saldo
                if (valorFinanceiro > 0) classes.push('saldo-positivo');
                else if (valorFinanceiro < 0) classes.push('saldo-negativo');

                const destaqueRodada = obterMitoMicoDaRodada(rodada);
                const isMito = destaqueRodada && compararTimeIds(destaqueRodada.mito?.timeId, meuTimeId);
                const isMico = destaqueRodada && compararTimeIds(destaqueRodada.mico?.timeId, meuTimeId);

                if (isMito) {
                    classes.push('mito');
                    tipoDestaque = 'mito';
                } else if (isMico) {
                    classes.push('mico');
                    tipoDestaque = 'mico';
                }
            }

        // Formatar pontos
        let pontosTexto = '';
        if (isParcial) pontosTexto = '⏳';
        else if (temDados && jogou && pontos > 0) pontosTexto = pontos.toFixed(0);
        else if (temDados && !jogou) pontosTexto = 'N/J';

        const badgeAoVivo = isParcial ? '<span class="badge-mini-ao-vivo">●</span>' : '';
        let badgeDestaque = '';
        if (tipoDestaque === 'mito') {
            badgeDestaque = '<span class="badge-mini-destaque"><span class="material-symbols-outlined">emoji_events</span></span>';
        } else if (tipoDestaque === 'mico') {
            badgeDestaque = '<span class="badge-mini-destaque"><span class="material-symbols-outlined">thumb_down</span></span>';
        }

        html += `
            <div class="${classes.join(' ')}" data-rodada="${i}" onclick="window.selecionarRodadaMini(${i}, ${isParcial})">
                ${badgeAoVivo}
                ${badgeDestaque}
                <span class="mini-card-numero">${i}</span>
                ${pontosTexto ? `<span class="mini-card-pontos">${pontosTexto}</span>` : ''}
            </div>
        `;
    }

    return html;
}

window.selecionarRodadaMini = function(numero, isParcial) {
    const card = document.querySelector(`.rodada-mini-card[data-rodada="${numero}"]`);
    if (card && !card.classList.contains('futuro')) {
        document.querySelectorAll('.rodada-mini-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selecionarRodada(numero, isParcial);
    }
};

// (Grupos expansíveis removidos na v5.1 - rodadas exibidas em grid único)

// =====================================================================
// CARD SUA TEMPORADA v2.0 - Estatísticas reais do participante
// =====================================================================
function renderizarCardDesempenho(rodadas) {
    const card = document.getElementById("cardSuaTemporada");
    if (!card) return;

    // Coletar dados do participante logado
    const meusDados = [];
    let totalPontos = 0;
    let melhorRodada = { numero: 0, pontos: -Infinity };
    let piorRodada = { numero: 0, pontos: Infinity };
    let vezesTop3 = 0;
    let vezesUltimo = 0;
    let vezesAcimaMedia = 0;
    let somaPosicoesFinanceiras = 0;
    let rodadasComPosicao = 0;

    rodadas.forEach((rodada, idx) => {
        if (!rodada.jogou || !rodada.participantes?.length) return;

        const numeroRodada = obterNumeroRodada(rodada);

        // Debug: verificar se meuTimeId está na lista de participantes
        if (idx === 0 && window.Log) {
            const todosIds = rodada.participantes.map(p => p.timeId ?? p.time_id ?? p.id).join(', ');
            const encontrado = rodada.participantes.find(p => compararTimeIds(p.timeId ?? p.time_id ?? p.id, meuTimeId));
            Log.info("[PARTICIPANTE-RODADAS]", `DEBUG R${numeroRodada}: meuTimeId=${meuTimeId} | encontrado=${!!encontrado} | IDs: ${todosIds}`);
        }
        const meusPontos = rodada.meusPontos ?? 0;

        meusDados.push({
            rodada: numeroRodada,
            pontos: meusPontos,
            posicao: rodada.posicaoFinanceira
        });

        totalPontos += meusPontos;

        // Melhor rodada
        if (meusPontos > melhorRodada.pontos) {
            melhorRodada = { numero: numeroRodada, pontos: meusPontos };
        }

        // Pior rodada
        if (meusPontos < piorRodada.pontos) {
            piorRodada = { numero: numeroRodada, pontos: meusPontos };
        }

        // Calcular posição na rodada e média da liga
        const participantesAtivos = rodada.participantes.filter((p) => p.ativo !== false && !p.rodadaNaoJogada);
        if (participantesAtivos.length > 0) {
            // Ordenar por pontos para descobrir posição
            const ordenados = [...participantesAtivos].sort((a, b) => {
                const pontosA = parseFloat(a.pontos || 0);
                const pontosB = parseFloat(b.pontos || 0);
                return pontosB - pontosA;
            });

            // Buscar posição - verificar múltiplos campos de ID
            const idxFound = ordenados.findIndex((p) => {
                const pId = p.timeId ?? p.time_id ?? p.id;
                return compararTimeIds(pId, meuTimeId);
            });
            const minhaPosicao = idxFound + 1;

            // Top 3
            if (minhaPosicao >= 1 && minhaPosicao <= 3) {
                vezesTop3++;
            }

            // Último lugar
            if (minhaPosicao === ordenados.length && ordenados.length > 1) {
                vezesUltimo++;
            }

            // Acima da média
            const somaPontosLiga = participantesAtivos.reduce((acc, p) => acc + parseFloat(p.pontos || 0), 0);
            const mediaLiga = somaPontosLiga / participantesAtivos.length;
            if (meusPontos > mediaLiga) {
                vezesAcimaMedia++;
            }
        }

        // Posição financeira (para média)
        if (rodada.posicaoFinanceira) {
            somaPosicoesFinanceiras += rodada.posicaoFinanceira;
            rodadasComPosicao++;
        }
    });

    const rodadasJogadas = meusDados.length;

    if (rodadasJogadas === 0) {
        card.style.display = "none";
        return;
    }

    // Cálculos finais
    const mediaPontos = totalPontos / rodadasJogadas;
    const posicaoMedia = rodadasComPosicao > 0 ? (somaPosicoesFinanceiras / rodadasComPosicao) : null;
    const aproveitamento = Math.round((vezesAcimaMedia / rodadasJogadas) * 100);

    // Popular elementos do DOM
    const setEl = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    const setStyle = (id, prop, value) => {
        const el = document.getElementById(id);
        if (el) el.style[prop] = value;
    };

    setEl("tempBadgeRodadas", `${rodadasJogadas} RODADAS`);
    setEl("tempPontosTotal", totalPontos.toFixed(2).replace('.', ','));
    setEl("tempMediaPontos", mediaPontos.toFixed(2).replace('.', ','));
    setEl("tempPosicaoMedia", posicaoMedia ? `${posicaoMedia.toFixed(1)}º` : "-");

    setEl("tempMelhorRodada", `R${String(melhorRodada.numero).padStart(2, '0')}`);
    setEl("tempMelhorPontos", `${melhorRodada.pontos.toFixed(2)} pts`);
    setEl("tempPiorRodada", `R${String(piorRodada.numero).padStart(2, '0')}`);
    setEl("tempPiorPontos", `${piorRodada.pontos.toFixed(2)} pts`);

    setEl("tempVezesTop3", vezesTop3);
    setEl("tempVezesAcimaMedia", vezesAcimaMedia);
    setEl("tempVezesUltimo", vezesUltimo);

    if (window.Log) Log.info("[PARTICIPANTE-RODADAS]",
        `Sua Temporada: ${rodadasJogadas} rodadas | Top3: ${vezesTop3} | AcimaMedia: ${vezesAcimaMedia} | Ultimo: ${vezesUltimo} | Aprov: ${aproveitamento}%`);

    setEl("tempAproveitamento", `${aproveitamento}%`);
    setStyle("tempAproveitamentoBar", "width", `${aproveitamento}%`);
    setEl("tempAproveitamentoHint", `${vezesAcimaMedia} de ${rodadasJogadas} rodadas acima da média da liga`);

    card.style.display = "block";
}

function obterNumeroRodada(rodada) {
    return rodada?.numero ?? rodada?.rodada ?? rodada?.rodadaNumero ?? null;
}

function compararTimeIds(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
}

function obterMitoMicoDaRodada(rodada) {
    if (!rodada || !Array.isArray(rodada.participantes) || rodada.participantes.length === 0) {
        return null;
    }

    const participantesAtivos = rodada.participantes.filter((p) => p.ativo !== false);
    if (participantesAtivos.length === 0) {
        return null;
    }

    const ordenados = [...participantesAtivos].sort((a, b) => {
        const pontosA = parseFloat(a.pontos || 0);
        const pontosB = parseFloat(b.pontos || 0);
        if (pontosB === pontosA) {
            const idA = String(a.timeId ?? a.time_id ?? a.id ?? "");
            const idB = String(b.timeId ?? b.time_id ?? b.id ?? "");
            return idA.localeCompare(idB);
        }
        return pontosB - pontosA;
    });

    const primeiro = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];

    return {
        mito: {
            timeId: primeiro?.timeId ?? primeiro?.time_id,
            pontos: parseFloat(primeiro?.pontos || 0)
        },
        mico: {
            timeId: ultimo?.timeId ?? ultimo?.time_id,
            pontos: parseFloat(ultimo?.pontos || 0)
        }
    };
}

// =====================================================================
// POSIÇÕES E CORES - Cartola
// =====================================================================
const POSICOES_CARTOLA = {
    1: { nome: 'GOL', slug: 'gol', cor: '#FF4500' },
    2: { nome: 'LAT', slug: 'lat', cor: '#3b82f6' },
    3: { nome: 'ZAG', slug: 'zag', cor: '#3b82f6' },
    4: { nome: 'MEI', slug: 'mei', cor: '#22c55e' },
    5: { nome: 'ATA', slug: 'ata', cor: '#ef4444' },
    6: { nome: 'TEC', slug: 'tec', cor: '#6b7280' },
};

// =====================================================================
// MINHA ESCALAÇÃO - Mini Campinho v8.0 (Campo de Futebol Inline)
// =====================================================================

// Thresholds para mito/mico de jogador
const MITO_JOGADOR = 12;
const MICO_JOGADOR = -3;

function renderizarMinhaEscalacao(rodadaData, isParcial) {
    const container = document.getElementById('minhaEscalacaoContainer');
    if (!container) return;

    // Encontrar meus dados na rodada
    const meuPart = rodadaData.participantes?.find(
        p => String(p.timeId || p.time_id) === String(meuTimeId)
    );

    if (!meuPart || !meuPart.atletas || meuPart.atletas.length === 0) {
        container.innerHTML = `
            <div class="minha-escalacao-container">
                <div class="me-sem-escalacao">
                    <span class="material-icons">group_off</span>
                    Escalação não disponível para esta rodada
                </div>
            </div>
        `;
        return;
    }

    const atletas = meuPart.atletas || [];
    const capitaoId = meuPart.capitao_id;
    const reservaLuxoId = meuPart.reserva_luxo_id;

    // Normalizar campo de pontos (pode ser pontos, pontos_num ou pontos_efetivos)
    atletas.forEach(a => {
        if (a.pontos_num === undefined && a.pontos !== undefined) {
            a.pontos_num = a.pontos;
        } else if (a.pontos_num === undefined && a.pontos_efetivos !== undefined) {
            a.pontos_num = a.pontos_efetivos;
        }
    });

    // Separar titulares e reservas (suporta is_reserva de parciais E status_id de consolidados)
    const titulares = atletas.filter(a => !a.is_reserva && a.status_id !== 2);
    const reservas = atletas.filter(a => a.is_reserva || a.status_id === 2);

    // Ordenar titulares por posição: GOL → ZAG → LAT → MEI → ATA → TEC
    const ordemPosicoes = { 1: 1, 3: 2, 2: 3, 4: 4, 5: 5, 6: 6 };
    titulares.sort((a, b) => {
        const ordemA = ordemPosicoes[a.posicao_id] || 99;
        const ordemB = ordemPosicoes[b.posicao_id] || 99;
        return ordemA - ordemB;
    });

    // Ordenar reservas também
    reservas.sort((a, b) => {
        const ordemA = ordemPosicoes[a.posicao_id] || 99;
        const ordemB = ordemPosicoes[b.posicao_id] || 99;
        return ordemA - ordemB;
    });

    // Calcular substituições (regras oficiais Cartola FC 2025/2026)
    const substituicoes = new Map();
    const titularesSubstituidos = new Map(); // atleta_id -> 'ausente' | 'luxo'

    // Verificar se dados pré-computados estão disponíveis (parciais)
    const temDadosParciais = atletas.some(a =>
        a.substituido_por !== undefined || a.substituiu_apelido !== undefined || a.luxo_ativado !== undefined
    );

    if (temDadosParciais) {
        // Usar dados pré-computados do módulo de parciais
        atletas.forEach(a => {
            if (a.is_reserva && a.contribuiu) {
                if (a.luxo_ativado) {
                    substituicoes.set(a.atleta_id, {
                        tipo: 'luxo',
                        substituiu: a.substituiu_apelido || '',
                        herdouCapitao: a.luxo_herdou_capitao || false,
                    });
                } else if (a.substituiu_apelido) {
                    substituicoes.set(a.atleta_id, { tipo: 'posicao', substituiu: a.substituiu_apelido });
                }
            }
            if (!a.is_reserva && a.substituido_por_luxo) {
                titularesSubstituidos.set(a.atleta_id, 'luxo');
            } else if (!a.is_reserva && a.substituido_por) {
                titularesSubstituidos.set(a.atleta_id, 'ausente');
            }
        });
    } else {
        // Fallback: computar localmente para dados consolidados
        const titularesSemJogo = new Map();
        titulares.forEach(t => {
            if (t.entrou_em_campo === false) {
                if (!titularesSemJogo.has(t.posicao_id)) {
                    titularesSemJogo.set(t.posicao_id, []);
                }
                titularesSemJogo.get(t.posicao_id).push(t);
            }
        });

        // Reservas comuns primeiro
        reservas.forEach(r => {
            const isLuxo = r.atleta_id === reservaLuxoId || r.is_reserva_luxo;
            if (isLuxo) return;
            const entrou = r.entrou_em_campo === true || r.contribuiu === true;
            if (!entrou) return;

            if (titularesSemJogo.has(r.posicao_id)) {
                const tits = titularesSemJogo.get(r.posicao_id);
                if (tits.length > 0) {
                    const titular = tits.shift();
                    substituicoes.set(r.atleta_id, { tipo: 'posicao', substituiu: titular.apelido || 'Titular' });
                    titularesSubstituidos.set(titular.atleta_id, 'ausente');
                }
            }
        });

        // Depois o Luxo
        const luxoReserva = reservas.find(r => r.atleta_id === reservaLuxoId || r.is_reserva_luxo);
        if (luxoReserva) {
            const entrou = luxoReserva.entrou_em_campo === true || luxoReserva.contribuiu === true;
            if (entrou) {
                if (titularesSemJogo.has(luxoReserva.posicao_id) && titularesSemJogo.get(luxoReserva.posicao_id).length > 0) {
                    // Luxo como reserva comum
                    const tits = titularesSemJogo.get(luxoReserva.posicao_id);
                    const titular = tits.shift();
                    substituicoes.set(luxoReserva.atleta_id, { tipo: 'posicao', substituiu: titular.apelido || 'Titular' });
                    titularesSubstituidos.set(titular.atleta_id, 'ausente');
                } else {
                    // Luxo special: encontrar pior titular da posição que jogou
                    const titularesNaPosicao = titulares.filter(
                        t => t.posicao_id === luxoReserva.posicao_id && t.entrou_em_campo !== false
                    );
                    if (titularesNaPosicao.length > 0) {
                        const luxoPts = Number(luxoReserva.pontos_num ?? luxoReserva.pontos ?? 0);
                        const pior = titularesNaPosicao.reduce((p, t) => {
                            const ptsP = Number(p.pontos_num ?? p.pontos ?? 0);
                            const ptsT = Number(t.pontos_num ?? t.pontos ?? 0);
                            return ptsT < ptsP ? t : p;
                        }, titularesNaPosicao[0]);
                        const piorPts = Number(pior.pontos_num ?? pior.pontos ?? 0);
                        if (luxoPts > piorPts) {
                            substituicoes.set(luxoReserva.atleta_id, { tipo: 'luxo', substituiu: pior.apelido || 'Titular' });
                            titularesSubstituidos.set(pior.atleta_id, 'luxo');
                        }
                    }
                }
            }
        }
    }

    // Estatísticas
    const pontos = Number(meuPart.pontos || 0);
    const posicao = meuPart.posicao || '-';
    const totalPart = rodadaData.totalParticipantesAtivos || rodadaData.participantes?.length || 0;

    // Nome do time
    const nomeTime = meuPart.nome || meuPart.nome_time || 'Meu Time';
    const nomeCartola = meuPart.nome_cartola || '';

    // Pontos formatados
    const pontosFormatados = pontos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Posições do Cartola
    const POSICOES = {
        1: { nome: 'GOL', cor: '#FF4500' },
        2: { nome: 'LAT', cor: '#3b82f6' },
        3: { nome: 'ZAG', cor: '#3b82f6' },
        4: { nome: 'MEI', cor: '#22c55e' },
        5: { nome: 'ATA', cor: '#ef4444' },
        6: { nome: 'TEC', cor: '#6b7280' },
    };

    // Função para determinar status do jogo baseado em data/hora
    function obterStatusJogo(atleta) {
        if (!isParcial) {
            // Rodada finalizada - todos jogaram
            return '🔵';
        }

        // Verificar se o atleta tem informação de jogo
        const jogoInfo = atleta.jogo || {};
        const dataJogo = jogoInfo.data_jogo || jogoInfo.data || null;
        const horaJogo = jogoInfo.hora || null;
        
        if (!dataJogo) {
            // Sem info de jogo, usar fallback baseado em entrou_em_campo
            if (atleta.entrou_em_campo) {
                return '🟢'; // Jogando ou já jogou
            }
            return '⚪'; // Padrão: ainda não começou
        }

        try {
            // Construir data/hora do jogo
            const [ano, mes, dia] = dataJogo.split('-').map(Number);
            const [hora, minuto] = (horaJogo || '00:00').split(':').map(Number);
            const dataHoraJogo = new Date(ano, mes - 1, dia, hora, minuto);
            const agora = new Date();
            
            // Calcular diferença em minutos
            const diffMinutos = (agora - dataHoraJogo) / (1000 * 60);
            
            if (diffMinutos < -10) {
                // Jogo ainda não começou (mais de 10min antes)
                return '⚪';
            } else if (diffMinutos >= -10 && diffMinutos <= 120) {
                // Jogo em andamento (10min antes até 2h depois)
                return atleta.entrou_em_campo ? '🟢' : '⚪';
            } else {
                // Jogo encerrado (mais de 2h depois)
                return '🔵';
            }
        } catch (err) {
            // Erro ao processar data - fallback
            if (window.Log) Log.warn('[RODADAS] Erro ao processar data do jogo:', err);
            return atleta.entrou_em_campo ? '🟢' : '⚪';
        }
    }

    // Renderizar atleta na tabela
    function renderAtleta(a, isReserva = false, subInfo = null) {
        const pos = POSICOES[a.posicao_id] || { nome: '???', cor: '#6b7280' };
        const pontosRaw = a.pontos_num ?? 0;
        const pontosAtl = Number(pontosRaw).toFixed(1);
        const pontosClass = pontosRaw > 0 ? 'color:#22c55e' : pontosRaw < 0 ? 'color:#ef4444' : 'color:#6b7280';
        
        // Status do jogo baseado em data/hora
        const statusIcon = obterStatusJogo(a);

        const isCapitao = a.atleta_id === capitaoId;
        const isLuxo = a.atleta_id === reservaLuxoId && isReserva;

        const capitaoBadge = isCapitao ? '<span style="background:#eab308;color:#000;font-size:9px;padding:2px 5px;border-radius:3px;font-weight:bold;margin-left:4px;">C</span>' : '';
        const luxoBadge = isLuxo ? '<span style="background:#a855f7;color:#fff;font-size:9px;padding:2px 5px;border-radius:3px;font-weight:bold;margin-left:4px;">L</span>' : '';

        // Badge de substituição (regras oficiais Cartola FC 2025/2026)
        let subBadge = '';
        if (subInfo) {
            if (subInfo.tipo === 'luxo') {
                const textoLuxo = subInfo.herdouCapitao
                    ? `Luxo ativado (C 1.5x) por ${subInfo.substituiu}`
                    : `Luxo ativado por ${subInfo.substituiu}`;
                subBadge = `<div style="font-size:9px;color:#a855f7;margin-top:1px;"><span class="material-icons" style="font-size:10px;vertical-align:middle;">star</span> ${textoLuxo}</div>`;
            } else if (subInfo.tipo === 'posicao') {
                subBadge = `<div style="font-size:9px;color:#22c55e;margin-top:1px;"><span class="material-icons" style="font-size:10px;vertical-align:middle;">swap_vert</span> Entrou por ${subInfo.substituiu}</div>`;
            } else if (subInfo.tipo === 'substituido') {
                subBadge = '<div style="font-size:9px;color:#ef4444;margin-top:1px;opacity:0.8;">Não entrou em campo</div>';
            } else if (subInfo.tipo === 'substituido_luxo') {
                subBadge = '<div style="font-size:9px;color:#a855f7;margin-top:1px;opacity:0.8;"><span class="material-icons" style="font-size:10px;vertical-align:middle;">swap_vert</span> Substituído pelo Luxo</div>';
            }
        }

        const clubeId = a.clube_id || extrairClubeIdDaFoto(a.foto) || null;
        const escudoSrc = clubeId ? `/escudos/${clubeId}.png` : '/escudos/default.png';

        const csAtl = a.variacao_num ?? 0;
        const csClass = csAtl > 0 ? 'color:#22c55e' : csAtl < 0 ? 'color:#ef4444' : 'color:#6b7280';
        const csTexto = csAtl > 0 ? `+${csAtl.toFixed(1)}` : csAtl.toFixed(1);

        return `
            <tr style="border-bottom:1px solid #1f2937;">
                <td style="padding:8px 4px;text-align:center;">
                    <span style="background:${pos.cor};color:#fff;font-size:9px;padding:3px 7px;border-radius:4px;font-weight:bold;">${pos.nome}</span>
                </td>
                <td style="padding:8px 4px;text-align:center;">
                    <img src="${escudoSrc}" alt="" onerror="this.src='/escudos/default.png'" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;">
                </td>
                <td style="padding:8px 8px;font-size:13px;color:#e5e7eb;">
                    <div>${a.apelido || 'Atleta'}${capitaoBadge}${luxoBadge}</div>${subBadge}
                </td>
                <td style="padding:8px 4px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:bold;${pontosClass};">
                    ${pontosAtl}
                </td>
                <td style="padding:8px 4px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px;${csClass};">
                    ${csTexto}
                </td>
                <td style="padding:8px 4px;text-align:center;font-size:14px;">
                    ${statusIcon}
                </td>
            </tr>
        `;
    }

    const titularesHTML = titulares.length > 0
        ? titulares.map(a => {
            let subInfo = null;
            if (titularesSubstituidos.has(a.atleta_id)) {
                const tipo = titularesSubstituidos.get(a.atleta_id);
                subInfo = tipo === 'luxo' ? { tipo: 'substituido_luxo' } : { tipo: 'substituido' };
            }
            return renderAtleta(a, false, subInfo);
        }).join("")
        : '<tr><td colspan="6" style="color:#6b7280;padding:12px;text-align:center;">Sem titulares</td></tr>';

    const reservasHTML = reservas.length > 0
        ? reservas.map(a => renderAtleta(a, true, substituicoes.get(a.atleta_id) || null)).join("")
        : '';

    container.innerHTML = `
        <div class="minha-escalacao-container" style="background:#111827;border-radius:16px;overflow:hidden;margin-bottom:16px;border:1px solid #1f2937;">
            <!-- Header -->
            <div style="padding:16px;background:linear-gradient(135deg, rgba(255, 85, 0, 0.08) 0%, transparent 100%);border-bottom:1px solid #1f2937;">
                <div style="font-family:'Russo One',sans-serif;font-size:16px;color:#fff;">${nomeTime}</div>
                <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${nomeCartola}</div>
            </div>

            <!-- Stats -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 16px;">
                <div style="background:#1f2937;border-radius:8px;padding:10px;text-align:center;">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Pontos</div>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:bold;color:#ff5500;">${pontosFormatados}</div>
                </div>
                <div style="background:#1f2937;border-radius:8px;padding:10px;text-align:center;">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Posição</div>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:bold;color:#fff;">${posicao}º <span style="font-size:12px;color:#6b7280;">/${totalPart}</span></div>
                </div>
            </div>

            <!-- Tabela de Titulares -->
            <div style="padding:8px 16px 16px;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:8px;font-weight:bold;">Titulares (${titulares.length})</div>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="border-bottom:2px solid #374151;color:#6b7280;font-size:10px;text-transform:uppercase;">
                            <th style="padding:6px 4px;text-align:center;font-weight:600;">POS</th>
                            <th style="padding:6px 4px;text-align:center;font-weight:600;">TIME</th>
                            <th style="padding:6px 8px;text-align:left;font-weight:600;">JOGADOR</th>
                            <th style="padding:6px 4px;text-align:right;font-weight:600;">PTS</th>
                            <th style="padding:6px 4px;text-align:right;font-weight:600;">C$</th>
                            <th style="padding:6px 4px;text-align:center;font-weight:600;">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${titularesHTML}
                    </tbody>
                </table>
            </div>

            <!-- Separador Banco de Reservas -->
            ${reservas.length > 0 ? `
                <div style="margin:0 16px;padding:12px 0;display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;border-top:1px dashed #374151;"></div>
                    <span style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:1px;display:flex;align-items:center;gap:4px;">
                        <span class="material-icons" style="font-size:14px;">event_seat</span>
                        BANCO
                    </span>
                    <div style="flex:1;border-top:1px dashed #374151;"></div>
                </div>
                <div style="padding:8px 16px 16px;background:rgba(107,114,128,0.06);border-radius:0 0 16px 16px;">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:8px;font-weight:600;letter-spacing:0.5px;">Reservas (${reservas.length})</div>
                    <table style="width:100%;border-collapse:collapse;font-size:13px;opacity:0.7;">
                        <tbody>
                            ${reservasHTML}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>
    `;
}

// Helper para extrair clube_id da foto do atleta (fallback)
function extrairClubeIdDaFoto(foto) {
    if (!foto) return null;
    // Foto formato: https://s.sde.globo.com/media/organizations/2024/04/11/ESCUDO.png
    // ou: https://s3.glbimg.com/v1/AUTH_.../escudos/65x65/CLUBE_ID.png
    const match = foto.match(/\/escudos\/\d+x\d+\/(\d+)\.png/);
    if (match) return parseInt(match[1]);
    
    // Outro formato possível
    const match2 = foto.match(/clube[_-]?(\d+)/i);
    if (match2) return parseInt(match2[1]);
    
    return null;
}

// =====================================================================
// GRÁFICO EVOLUTIVO DE DESEMPENHO
// =====================================================================
function renderizarGraficoEvolutivo(rodadas, rodadaSelecionadaNum) {
    const chartContainer = document.getElementById('chartDesempenhoEvolutivo');
    const barsContainer = document.getElementById('chartBarsContainer');
    if (!chartContainer || !barsContainer) return;

    // Buscar pontos do meu time em cada rodada
    const meusDados = [];
    let maxPontos = 0;

    rodadas.forEach(rodada => {
        const meuPart = rodada.participantes?.find(
            p => String(p.timeId || p.time_id) === String(meuTimeId)
        );
        const pontos = meuPart ? Number(meuPart.pontos || 0) : 0;
        const jogou = meuPart && !meuPart.rodadaNaoJogada;
        meusDados.push({
            rodada: rodada.numero,
            pontos,
            jogou,
        });
        if (Math.abs(pontos) > maxPontos) maxPontos = Math.abs(pontos);
    });

    if (meusDados.length === 0 || maxPontos === 0) {
        chartContainer.style.display = 'none';
        return;
    }

    const barHeight = 60; // px
    let barsHTML = '';

    meusDados.forEach(d => {
        const isActive = d.rodada === rodadaSelecionadaNum;
        const height = d.jogou ? Math.max(4, (Math.abs(d.pontos) / maxPontos) * barHeight) : 4;
        const cls = !d.jogou ? 'nao-jogou' : d.pontos > 0 ? 'positivo' : d.pontos < 0 ? 'negativo' : 'neutro';

        barsHTML += `<div class="me-chart-bar ${cls} ${isActive ? 'active' : ''}"
            style="height:${height}px"
            data-rodada="${d.rodada}"
            title="R${d.rodada}: ${d.jogou ? d.pontos.toFixed(1) + ' pts' : 'Não jogou'}"
            onclick="window.selecionarRodadaMini(${d.rodada}, false)"></div>`;
    });

    barsContainer.innerHTML = barsHTML;
    chartContainer.style.display = 'block';
}

// =====================================================================
// SELEÇÃO DE RODADA
// =====================================================================
async function selecionarRodada(numeroRodada, isParcial = false) {
    if (window.Log)
        Log.info(`[PARTICIPANTE-RODADAS] 📌 Selecionando rodada ${numeroRodada} (parcial: ${isParcial})`);
    if (window.Log)
        Log.info(`[PARTICIPANTE-RODADAS] 📊 Cache: ${todasRodadasCache.length} rodadas em cache`);

    rodadaSelecionada = numeroRodada;
    ParciaisModule.pararAutoRefresh?.();
    PollingInteligenteModule.parar?.();
    atualizarIndicadorAutoRefresh({ ativo: false });

    const detalhamento = document.getElementById("rodadaDetalhamento");
    if (detalhamento) {
        detalhamento.style.display = "block";
    }

    const rankingContainer = document.getElementById("rankingListPro");
    if (rankingContainer) {
        rankingContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner-rodadas"></div>
                <p style="color: #9ca3af; margin-top: 16px;">Carregando...</p>
            </div>
        `;
    }

    const isRodadaParcial = parciaisInfo?.disponivel && numeroRodada === parciaisInfo.rodada;

    try {
        if (isRodadaParcial) {
            await carregarERenderizarParciais(numeroRodada);

            // ✅ FEAT-026: Usar Polling Inteligente baseado em calendário
            PollingInteligenteModule.inicializar({
                temporada: TEMPORADA_ATUAL,
                rodada: numeroRodada,
                ligaId: ligaId,
                timeId: meuTimeId,
                onUpdate: (dados) => {
                    if (rodadaSelecionada !== numeroRodada) return;
                    renderizarParciaisDados(numeroRodada, dados);
                },
                onStatus: atualizarIndicadorAutoRefresh
            });
        } else {
            const rodadaData = todasRodadasCache.find((r) => r.numero === numeroRodada);
            if (window.Log)
                Log.info(`[PARTICIPANTE-RODADAS] 🔍 Rodada ${numeroRodada}: ${rodadaData ? rodadaData.participantes.length + ' participantes' : 'NÃO ENCONTRADA'}`);

            if (!rodadaData || rodadaData.participantes.length === 0) {
                // Fallback: buscar diretamente da API se cache falhou
                if (window.Log) Log.warn(`[PARTICIPANTE-RODADAS] ⚠️ Cache vazio, buscando da API...`);
                try {
                    const res = await fetch(`/api/rodadas/${ligaId}/rodadas?rodada=${numeroRodada}&temporada=${TEMPORADA_ATUAL}`);
                    if (res.ok) {
                        const rodadas = await res.json();
                        if (rodadas.length > 0) {
                            const agrupadas = agruparRodadasPorNumero(rodadas);
                            const dadosFresh = agrupadas.find(r => r.numero === numeroRodada);
                            if (dadosFresh && dadosFresh.participantes.length > 0) {
                                renderizarDetalhamentoRodada(dadosFresh, false);
                                setTimeout(() => detalhamento?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                                return;
                            }
                        }
                    }
                } catch (fetchErr) {
                    if (window.Log) Log.error(`[PARTICIPANTE-RODADAS] ❌ Fallback API falhou:`, fetchErr);
                }

                if (rankingContainer) {
                    rankingContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #6b7280;">
                            <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">inbox</span>
                            <p>Dados desta rodada não disponíveis</p>
                        </div>
                    `;
                }
                return;
            }

            renderizarDetalhamentoRodada(rodadaData, false);
        }
    } catch (error) {
        if (window.Log) Log.error(`[PARTICIPANTE-RODADAS] ❌ Erro ao selecionar rodada:`, error);
        if (rankingContainer) {
            rankingContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">error_outline</span>
                    <p>Erro ao carregar rodada. Tente novamente.</p>
                </div>
            `;
        }
    }

    setTimeout(() => {
        detalhamento?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
}

window.selecionarRodada = selecionarRodada;

// =====================================================================
// CARREGAR E RENDERIZAR PARCIAIS
// =====================================================================
async function carregarERenderizarParciais(numeroRodada) {
    const titulo = document.getElementById("rodadaTitulo");
    if (titulo) {
        titulo.innerHTML = `Rodada ${numeroRodada} <span class="badge-parcial">EM ANDAMENTO</span>`;
    }

    const resumo = document.getElementById("rodadaResumo");
    if (resumo) {
        resumo.textContent = "Carregando pontuações parciais...";
    }

    try {
        const dados = await ParciaisModule.carregarParciais();
        renderizarParciaisDados(numeroRodada, dados);
    } catch (error) {
        if (window.Log)
            Log.error("[PARTICIPANTE-RODADAS] Erro ao carregar parciais:", error);
        const rankingContainer = document.getElementById("rankingListPro");
        if (rankingContainer) {
            rankingContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">error_outline</span>
                    <p>Erro ao carregar parciais</p>
                    <button onclick="selecionarRodada(${numeroRodada}, true)"
                            style="margin-top: 16px; padding: 10px 20px; background: #E65100; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

function renderizarParciaisDados(numeroRodada, dados) {
    const titulo = document.getElementById("rodadaTitulo");
    if (titulo) {
        titulo.innerHTML = `Rodada ${numeroRodada} <span class="badge-parcial">EM ANDAMENTO</span>`;
    }

    const resumo = document.getElementById("rodadaResumo");
    const rankingContainer = document.getElementById("rankingListPro");
    const participantes = dados?.participantes || [];
    const inativos = dados?.inativos || [];

    const minhaPosicao = ParciaisModule.obterMinhaPosicaoParcial();

    if (!dados || !Array.isArray(participantes) || participantes.length === 0) {
        if (rankingContainer) {
            let html = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">hourglass_empty</span>
                    <p>Aguardando pontuações...</p>
                    <p style="font-size: 12px; margin-top: 8px;">Os dados aparecerão quando os jogos começarem</p>
                </div>
            `;
            if (inativos.length > 0) {
                html += renderizarSecaoInativos(inativos, numeroRodada);
            }
            rankingContainer.innerHTML = html;
        }

        if (resumo) {
            const infoInativos = inativos.length > 0 ? ` • ${inativos.length} inativo${inativos.length > 1 ? "s" : ""}` : "";
            resumo.innerHTML = `0 participantes • Sua posição: ${minhaPosicao?.posicao || "-"}º${infoInativos}`;
        }

        return;
    }

    const rodadaData = {
        numero: numeroRodada,
        participantes: participantes,
        isParcial: true,
        atualizadoEm: dados?.atualizadoEm,
    };

    if (minhaPosicao) {
        rodadaData.posicaoFinanceira = minhaPosicao.posicao;
        rodadaData.meusPontos = minhaPosicao.pontos;
    }

    renderizarDetalhamentoRodada(rodadaData, true, inativos);

    if (resumo) {
        const horaAtualizacao = dados?.atualizadoEm
            ? new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            : "--:--";
        const infoInativos = inativos.length > 0 ? ` • ${inativos.length} inativo${inativos.length > 1 ? "s" : ""}` : "";
        resumo.innerHTML = `${dados?.totalTimes || participantes.length} participantes • Sua posição: ${minhaPosicao?.posicao || "-"}º${infoInativos}
            <span style="color: #6b7280; font-size: 11px;"> • Atualizado às ${horaAtualizacao}</span>`;
    }
}

// =====================================================================
// ZONA LABELS - MITO, G2-G12, Neutro, Z1-Z11, MICO
// =====================================================================
function calcularZonaLabel(posicao, totalParticipantes, valorFinanceiro, totalPerda) {
    if (!posicao || !totalParticipantes) return '';

    // Derivar zona a partir do valorFinanceiro
    if (valorFinanceiro > 0) {
        // Zona de Ganho
        if (posicao === 1) {
            return '<span class="zona-badge zona-mito">MITO</span>';
        }
        return `<span class="zona-badge zona-g">G${posicao}</span>`;
    } else if (valorFinanceiro < 0) {
        // Zona de Risco - MICO é o último, Z numera de cima pra baixo
        if (posicao === totalParticipantes) {
            return '<span class="zona-badge zona-mico">MICO</span>';
        }
        // Z1 = primeiro da zona de perda (mais perto do neutro)
        // ZN = penúltimo (mais perto do MICO)
        const perdaEfetiva = totalPerda || 1;
        const inicioPerda = totalParticipantes - perdaEfetiva + 1;
        const zNum = posicao - inicioPerda + 1;
        return `<span class="zona-badge zona-z">Z${zNum}</span>`;
    }

    // Neutro - sem label
    return '';
}

// =====================================================================
// DETALHAMENTO DA RODADA
// =====================================================================
function renderizarDetalhamentoRodada(rodadaData, isParcial = false, inativos = []) {
    const titulo = document.getElementById("rodadaTitulo");
    if (titulo) {
        if (isParcial) {
            titulo.innerHTML = `Rodada ${rodadaData.numero} <span class="badge-parcial">EM ANDAMENTO</span>`;
        } else {
            titulo.textContent = `Rodada ${rodadaData.numero}`;
        }
    }

    const todosParticipantes = rodadaData.participantes || [];
    let participantesAtivos = [];
    let participantesInativos = inativos.length > 0 ? inativos : [];
    const rodadaNum = rodadaData.numero;

    if (inativos.length === 0) {
        todosParticipantes.forEach((p) => {
            if (p.ativo === false && p.rodada_desistencia) {
                if (rodadaNum < p.rodada_desistencia) {
                    participantesAtivos.push(p);
                } else {
                    participantesInativos.push(p);
                }
            } else if (p.ativo === false && !p.rodada_desistencia) {
                participantesInativos.push(p);
            } else {
                participantesAtivos.push(p);
            }
        });
    } else {
        participantesAtivos = todosParticipantes;
    }

    const resumo = document.getElementById("rodadaResumo");
    if (resumo && !isParcial) {
        const totalAtivos = participantesAtivos.length;

        let minhaPosicao = rodadaData.posicaoFinanceira;
        if (minhaPosicao == null) {
            const ordenados = [...participantesAtivos].sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
            const meuIndex = ordenados.findIndex((p) => String(p.timeId || p.time_id) === String(meuTimeId));
            minhaPosicao = meuIndex >= 0 ? meuIndex + 1 : "-";
        }

        const infoInativos = participantesInativos.length > 0 ? ` • ${participantesInativos.length} inativo${participantesInativos.length > 1 ? "s" : ""}` : "";
        resumo.textContent = `${totalAtivos} participantes • Sua posição: ${minhaPosicao}º${infoInativos}`;
    }

    const participantesOrdenados = [...participantesAtivos].sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
    const totalParticipantes = participantesOrdenados.length;
    const totalPerda = participantesOrdenados.filter(p => (p.valorFinanceiro || 0) < 0).length;
    const container = document.getElementById("rankingListPro");

    if (!container) return;

    // === "MEU RESUMO" card no topo do detalhamento ===
    let meuResumoHTML = '';
    const meuPartIndex = participantesOrdenados.findIndex(
        (p) => String(p.timeId || p.time_id) === String(meuTimeId)
    );
    if (meuPartIndex >= 0) {
        const meuPart = participantesOrdenados[meuPartIndex];
        const minhaPosicaoCalc = meuPart.posicao || meuPartIndex + 1;
        const meusPontosCalc = Number(meuPart.pontos || 0);
        const meusValor = meuPart.valorFinanceiro || 0;
        const meusValorAbs = Math.abs(meusValor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const meusValorTexto = meusValor > 0 ? `+R$ ${meusValorAbs}` : meusValor < 0 ? `-R$ ${meusValorAbs}` : '';
        const meusValorCor = meusValor > 0 ? '#22c55e' : meusValor < 0 ? '#ef4444' : '#fff';
        const meuNome = meuPart.nome || meuPart.nome_time || 'Meu Time';

        // Detalhes extras: zona label + mito/mico
        const meuZonaBadge = !isParcial ? calcularZonaLabel(minhaPosicaoCalc, totalParticipantes, meusValor, totalPerda) : '';
        let detalhesExtra = meuZonaBadge;

        // ✅ v7.0: Ícone e estilo especial se eu sou MITO ou MICO
        const meuIsMito = minhaPosicaoCalc === 1 && !isParcial;
        const meuIsMico = minhaPosicaoCalc === totalParticipantes && totalParticipantes > 1 && !isParcial;
        const meuResumoExtraClass = meuIsMito ? 'meu-resumo-mito' : meuIsMico ? 'meu-resumo-mico' : '';
        const meuPosicaoIcon = meuIsMito
            ? '<span class="material-icons" style="font-size:22px;color:#ffd700;">emoji_events</span>'
            : `${minhaPosicaoCalc}&#186;`;
        const meuStatusLabel = meuIsMito
            ? '<div class="mito-icon-row"><span class="material-icons">star</span> REI DA RODADA</div>'
            : meuIsMico
            ? '<div class="mico-icon-row"><span class="material-icons">trending_down</span> PIOR DA RODADA</div>'
            : '';

        // Em campo badge for parciais - mostrar escalados + jogando ao vivo
        const titularesTotal = 12;
        const escalados = meuPart.atletas ? meuPart.atletas.filter(a => !a.is_reserva).length : 0;
        const jogandoAoVivo = meuPart.atletas ? meuPart.atletas.filter(a => !a.is_reserva && a.entrou_em_campo).length : 0;
        const emCampoInfo = isParcial && escalados > 0
            ? `<span style="margin-left:8px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#9ca3af">${escalados}/12 <span style="color:#22c55e;font-weight:600;font-size:10px;margin-left:2px">${jogandoAoVivo}</span></span>`
            : '';

        meuResumoHTML = `
            <div class="meu-resumo-card ${meuResumoExtraClass}">
                <div class="meu-resumo-posicao">${meuPosicaoIcon}</div>
                <div class="meu-resumo-info">
                    <div class="meu-resumo-nome">${meuNome}</div>
                    <div class="meu-resumo-detalhes">
                        ${detalhesExtra}
                        ${!isParcial && meusValorTexto ? `<span style="color:${meusValorCor};font-family:'JetBrains Mono',monospace;font-size:12px;">${meusValorTexto}</span>` : ''}
                        ${emCampoInfo}
                    </div>
                    ${meuStatusLabel}
                </div>
                <div class="meu-resumo-pontos">
                    <div class="meu-resumo-pontos-valor">${meusPontosCalc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div class="meu-resumo-pontos-label">pontos</div>
                </div>
            </div>
        `;
    }

    let html = meuResumoHTML + participantesOrdenados.map((participante, index) => {
        const timeId = participante.timeId || participante.time_id;
        const isMeuTime = String(timeId) === String(meuTimeId);
        const posicao = participante.posicao || index + 1;
        const valorFinanceiro = participante.valorFinanceiro || 0;

        const valorFormatado = Math.abs(valorFinanceiro).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        const financeiroTexto = valorFinanceiro > 0 ? `+R$ ${valorFormatado}` : valorFinanceiro < 0 ? `-R$ ${valorFormatado}` : "R$ 0,00";
        const financeiroClass = valorFinanceiro > 0 ? "positivo" : valorFinanceiro < 0 ? "negativo" : "neutro";

        // ✅ v7.0: Classes visuais por zona financeira
        const isMito = posicao === 1;
        const isMico = posicao === totalParticipantes && totalParticipantes > 1;
        let posicaoClass = "pos-default";
        if (isMito) posicaoClass = "pos-mito";
        else if (isMico) posicaoClass = "pos-mico";
        else if (valorFinanceiro > 0) posicaoClass = "pos-ganho";
        else if (valorFinanceiro < 0) posicaoClass = "pos-danger";

        const pontosFormatados = Number(participante.pontos || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        const nomeTime = participante.nome || participante.nome_time || "N/D";
        const naoJogouBadge = participante.rodadaNaoJogada ? '<span class="badge-nao-jogou">N/E</span>' : "";

        // ✅ v6.0: Badge de zona (MITO, G2-G12, Z1-Z11, MICO)
        const zonaBadge = !isParcial ? calcularZonaLabel(posicao, totalParticipantes, valorFinanceiro, totalPerda) : '';

        // ✅ Badge "X/12 em campo" - mostrar escalados + jogando ao vivo
        const escalados = participante.atletas ? participante.atletas.filter(a => !a.is_reserva).length : 0;
        const jogandoAoVivo = participante.atletas ? participante.atletas.filter(a => !a.is_reserva && a.entrou_em_campo).length : 0;
        const badgeEmCampo = isParcial && escalados > 0
            ? `<span class="badge-em-campo ${jogandoAoVivo > 0 ? 'ativo' : ''}">${escalados}/12 <span style="color:#22c55e;font-weight:600;font-size:9px;margin-left:2px">${jogandoAoVivo}</span></span>`
            : "";

        // ✅ v8.0: Curiosar disponível em TODAS rodadas (não só parciais)
        const curiosarAttr = !participante.rodadaNaoJogada
            ? `data-curiosar-time-id="${timeId}" style="cursor: pointer;"`
            : "";

        // ✅ v7.0: Ícones especiais para MITO e MICO
        let posicaoContent, itemExtraClass = '';
        if (isMito && !isParcial) {
            posicaoContent = '<span class="material-icons" style="font-size:20px;">emoji_events</span>';
            itemExtraClass = 'item-mito';
        } else if (isMico && !isParcial) {
            posicaoContent = `${posicao}º`;
            itemExtraClass = 'item-mico';
        } else {
            posicaoContent = `${posicao}º`;
        }

        // Label de destaque sob o nome do cartoleiro
        let statusLabel = '';
        if (isMito && !isParcial) {
            statusLabel = `<div class="mito-icon-row"><span class="material-icons">star</span> REI DA RODADA</div>`;
        } else if (isMico && !isParcial) {
            statusLabel = `<div class="mico-icon-row"><span class="material-icons">trending_down</span> PIOR DA RODADA</div>`;
        }

        return `
            <div class="ranking-item-pro ${isMeuTime ? "meu-time" : ""} ${itemExtraClass}" ${curiosarAttr}>
                <div class="posicao-badge-pro ${posicaoClass}">${posicaoContent}</div>
                <div class="ranking-info-pro">
                    <div class="ranking-nome-time">${nomeTime} ${naoJogouBadge} ${badgeEmCampo}</div>
                    <div class="ranking-nome-cartola">${participante.nome_cartola || "N/D"}${zonaBadge}</div>
                    ${statusLabel}
                </div>
                <div class="ranking-stats-pro">
                    <div class="ranking-pontos-pro">${pontosFormatados}</div>
                    <div class="ranking-financeiro-pro ${financeiroClass}">${isParcial ? '' : financeiroTexto}</div>
                </div>
                ${!participante.rodadaNaoJogada ? '<span class="material-icons curiosar-icon" style="font-size:16px;color:#6b7280;margin-left:4px;">visibility</span>' : ''}
            </div>
        `;
    }).join("");

    if (participantesInativos.length > 0) {
        html += renderizarSecaoInativos(participantesInativos, rodadaData.numero);
    }

    container.innerHTML = html || '<div style="text-align: center; padding: 40px; color: #6b7280;">Nenhum dado disponível</div>';

    // ✅ v7.0: Renderizar Minha Escalação estilo Cartola
    renderizarMinhaEscalacao(rodadaData, isParcial);

    // ✅ v7.0: Atualizar gráfico evolutivo
    renderizarGraficoEvolutivo(todasRodadasCache, rodadaData.numero);

    // ✅ v8.0: Event listener para "Curiosar" - disponível em TODAS rodadas
    container.querySelectorAll("[data-curiosar-time-id]").forEach((el) => {
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            const targetTimeId = el.getAttribute("data-curiosar-time-id");
            if (targetTimeId) abrirCampinhoModal(targetTimeId, rodadaData.numero, rodadaData);
        });
    });

    if (isParcial) {
        container.insertAdjacentHTML("beforeend", `
            <div style="text-align: center; padding: 20px;">
                <button onclick="selecionarRodada(${rodadaData.numero}, true)" class="btn-atualizar-parciais">
                    <span class="material-icons">refresh</span>
                    Atualizar Parciais
                </button>
            </div>
        `);
    }
}

// =====================================================================
// MODAL "CURIOSAR" - VER ESCALAÇÃO DE OUTRO TIME
// =====================================================================
function abrirCampinhoModal(targetTimeId, rodada, rodadaData = null) {
    if (window.Log) Log.info("[RODADAS] 👀 Curiosar time:", targetTimeId);

    // ── Fonte 1: Dados enriquecidos do parciais (ao vivo) ──
    const dadosParciais = ParciaisModule.obterDados?.();
    const timeDados = dadosParciais?.participantes?.find(
        (p) => String(p.timeId) === String(targetTimeId)
    );

    // ── Fonte 2: Escalação cacheada do parciais ──
    const escalacaoCacheada = ParciaisModule.obterEscalacaoCacheada?.(targetTimeId);

    // ── Fonte 3: Dados consolidados da rodada (rodadas finalizadas) ──
    const partConsolidado = rodadaData?.participantes?.find(
        (p) => String(p.timeId || p.time_id) === String(targetTimeId)
    );

    // Prioridade: parciais > cache > consolidado
    const nomeTime = timeDados?.nome_time || escalacaoCacheada?.nome_time || partConsolidado?.nome || partConsolidado?.nome_time || "Time";
    const nomeCartola = timeDados?.nome_cartola || escalacaoCacheada?.nome_cartola || partConsolidado?.nome_cartola || "";
    const pontos = timeDados?.pontos || escalacaoCacheada?.pontos || partConsolidado?.pontos || 0;
    const emCampo = timeDados?.atletasEmCampo || escalacaoCacheada?.atletasEmCampo || 0;
    const totalAtl = 12;
    const atletas = (timeDados?.atletas && timeDados.atletas.length > 0)
        ? timeDados.atletas
        : (escalacaoCacheada?.atletas?.length > 0)
            ? escalacaoCacheada.atletas
            : (partConsolidado?.atletas || []);
    const capitaoId = timeDados?.capitao_id || escalacaoCacheada?.capitao_id || partConsolidado?.capitao_id;
    const isMeuTime = String(targetTimeId) === String(meuTimeId);

    // Recalcular emCampo para dados consolidados (sem parciais)
    const emCampoCalc = emCampo || atletas.filter(a =>
        (!a.is_reserva && a.status_id !== 2) && (a.entrou_em_campo || (a.pontos_num && a.pontos_num !== 0))
    ).length;

    // DEBUG: verificar fonte e estrutura dos atletas
    if (window.Log) {
        const fonte = (timeDados?.atletas?.length > 0) ? 'parciais'
            : (escalacaoCacheada?.atletas?.length > 0) ? 'cache'
            : (partConsolidado?.atletas?.length > 0) ? 'consolidado' : 'nenhuma';
        Log.info("[RODADAS] 📊 Curiosar fonte:", fonte, "atletas:", atletas.length);
    }

    const pontosFormatados = Number(pontos).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // Posições do Cartola
    const POSICOES = {
        1: { nome: 'GOL', cor: '#FF4500' },
        2: { nome: 'LAT', cor: '#3b82f6' },
        3: { nome: 'ZAG', cor: '#3b82f6' },
        4: { nome: 'MEI', cor: '#22c55e' },
        5: { nome: 'ATA', cor: '#ef4444' },
        6: { nome: 'TEC', cor: '#6b7280' },
    };

    // Separar titulares e reservas (support both is_reserva and status_id fields)
    const titulares = atletas.filter(a => !a.is_reserva && a.status_id !== 2);
    const reservas = atletas.filter(a => a.is_reserva || a.status_id === 2);

    // Ordenar titulares por posição: GOL → ZAG → LAT → MEI → ATA → TEC
    const ordemPosicoes = { 1: 1, 3: 2, 2: 3, 4: 4, 5: 5, 6: 6 };
    titulares.sort((a, b) => {
        const ordemA = ordemPosicoes[a.posicao_id] || 99;
        const ordemB = ordemPosicoes[b.posicao_id] || 99;
        return ordemA - ordemB;
    });

    // Ordenar reservas também
    reservas.sort((a, b) => {
        const ordemA = ordemPosicoes[a.posicao_id] || 99;
        const ordemB = ordemPosicoes[b.posicao_id] || 99;
        return ordemA - ordemB;
    });

    // Calcular substituições (modal - regras oficiais Cartola FC 2025/2026)
    const substituicoesModal = new Map();
    const titularesSubstituidosModal = new Map(); // atleta_id -> 'ausente' | 'luxo'
    const reservaLuxoIdModal = timeDados?.reserva_luxo_id || escalacaoCacheada?.reserva_luxo_id || partConsolidado?.reserva_luxo_id;

    // Verificar se dados pré-computados estão disponíveis
    const temDadosParciaisModal = atletas.some(a =>
        a.substituido_por !== undefined || a.substituiu_apelido !== undefined || a.luxo_ativado !== undefined
    );

    if (temDadosParciaisModal) {
        atletas.forEach(a => {
            if (a.is_reserva && a.contribuiu) {
                if (a.luxo_ativado) {
                    substituicoesModal.set(a.atleta_id, {
                        tipo: 'luxo',
                        substituiu: a.substituiu_apelido || '',
                        herdouCapitao: a.luxo_herdou_capitao || false,
                    });
                } else if (a.substituiu_apelido) {
                    substituicoesModal.set(a.atleta_id, { tipo: 'posicao', substituiu: a.substituiu_apelido });
                }
            }
            if (!a.is_reserva && a.substituido_por_luxo) {
                titularesSubstituidosModal.set(a.atleta_id, 'luxo');
            } else if (!a.is_reserva && a.substituido_por) {
                titularesSubstituidosModal.set(a.atleta_id, 'ausente');
            }
        });
    } else {
        const titularesSemJogoModal = new Map();
        titulares.forEach(t => {
            if (t.entrou_em_campo === false) {
                if (!titularesSemJogoModal.has(t.posicao_id)) {
                    titularesSemJogoModal.set(t.posicao_id, []);
                }
                titularesSemJogoModal.get(t.posicao_id).push(t);
            }
        });

        // Reservas comuns primeiro
        reservas.forEach(r => {
            const isLuxo = r.is_reserva_luxo || r.atleta_id === reservaLuxoIdModal;
            if (isLuxo) return;
            const entrou = r.entrou_em_campo === true || r.contribuiu === true;
            if (!entrou) return;

            if (titularesSemJogoModal.has(r.posicao_id)) {
                const tits = titularesSemJogoModal.get(r.posicao_id);
                if (tits.length > 0) {
                    const titular = tits.shift();
                    substituicoesModal.set(r.atleta_id, { tipo: 'posicao', substituiu: titular.apelido || 'Titular' });
                    titularesSubstituidosModal.set(titular.atleta_id, 'ausente');
                }
            }
        });

        // Depois o Luxo
        const luxoReserva = reservas.find(r => r.is_reserva_luxo || r.atleta_id === reservaLuxoIdModal);
        if (luxoReserva) {
            const entrou = luxoReserva.entrou_em_campo === true || luxoReserva.contribuiu === true;
            if (entrou) {
                if (titularesSemJogoModal.has(luxoReserva.posicao_id) && titularesSemJogoModal.get(luxoReserva.posicao_id).length > 0) {
                    const tits = titularesSemJogoModal.get(luxoReserva.posicao_id);
                    const titular = tits.shift();
                    substituicoesModal.set(luxoReserva.atleta_id, { tipo: 'posicao', substituiu: titular.apelido || 'Titular' });
                    titularesSubstituidosModal.set(titular.atleta_id, 'ausente');
                } else {
                    const titularesNaPosicao = titulares.filter(
                        t => t.posicao_id === luxoReserva.posicao_id && t.entrou_em_campo !== false
                    );
                    if (titularesNaPosicao.length > 0) {
                        const luxoPts = Number(luxoReserva.pontos_efetivos ?? luxoReserva.pontos_num ?? 0);
                        const pior = titularesNaPosicao.reduce((p, t) => {
                            const ptsP = Number(p.pontos_efetivos ?? p.pontos_num ?? 0);
                            const ptsT = Number(t.pontos_efetivos ?? t.pontos_num ?? 0);
                            return ptsT < ptsP ? t : p;
                        }, titularesNaPosicao[0]);
                        const piorPts = Number(pior.pontos_efetivos ?? pior.pontos_num ?? 0);
                        if (luxoPts > piorPts) {
                            substituicoesModal.set(luxoReserva.atleta_id, { tipo: 'luxo', substituiu: pior.apelido || 'Titular' });
                            titularesSubstituidosModal.set(pior.atleta_id, 'luxo');
                        }
                    }
                }
            }
        }
    }

    // Função para determinar status do jogo baseado em data/hora
    function obterStatusJogo(atleta) {
        // Verificar se o atleta tem informação de jogo
        const jogoInfo = atleta.jogo || {};
        const dataJogo = jogoInfo.data_jogo || jogoInfo.data || null;
        const horaJogo = jogoInfo.hora || null;
        
        if (!dataJogo) {
            // Sem info de jogo, usar fallback baseado em entrou_em_campo
            if (atleta.entrou_em_campo) {
                return '🟢'; // Jogando ou já jogou
            }
            return '⚪'; // Padrão: ainda não começou
        }

        try {
            // Construir data/hora do jogo
            const [ano, mes, dia] = dataJogo.split('-').map(Number);
            const [hora, minuto] = (horaJogo || '00:00').split(':').map(Number);
            const dataHoraJogo = new Date(ano, mes - 1, dia, hora, minuto);
            const agora = new Date();
            
            // Calcular diferença em minutos
            const diffMinutos = (agora - dataHoraJogo) / (1000 * 60);
            
            if (diffMinutos < -10) {
                // Jogo ainda não começou (mais de 10min antes)
                return '⚪';
            } else if (diffMinutos >= -10 && diffMinutos <= 120) {
                // Jogo em andamento (10min antes até 2h depois)
                return atleta.entrou_em_campo ? '🟢' : '⚪';
            } else {
                // Jogo encerrado (mais de 2h depois)
                return '🔵';
            }
        } catch (err) {
            // Erro ao processar data - fallback
            if (window.Log) Log.warn('[RODADAS] Erro ao processar data do jogo:', err);
            return atleta.entrou_em_campo ? '🟢' : '⚪';
        }
    }

    // Renderizar atleta na tabela
    function renderAtleta(a, isReserva = false, subInfo = null) {
        const pos = POSICOES[a.posicao_id] || { nome: '???', cor: '#6b7280' };
        const pontosRaw = a.pontos_efetivos ?? a.pontos_num ?? 0;
        const pontosAtl = Number(pontosRaw).toFixed(1);
        const pontosClass = pontosRaw > 0 ? 'color:#22c55e' : pontosRaw < 0 ? 'color:#ef4444' : 'color:#6b7280';
        
        // Status do jogo baseado em data/hora
        const statusIcon = obterStatusJogo(a);

        const isCapitao = String(a.atleta_id) === String(capitaoId);
        const capitaoBadge = isCapitao ? '<span style="background:#eab308;color:#000;font-size:9px;padding:2px 5px;border-radius:3px;font-weight:bold;margin-left:4px;">C</span>' : '';

        // Badge de substituição (modal - regras oficiais Cartola FC 2025/2026)
        let subBadge = '';
        if (subInfo) {
            if (subInfo.tipo === 'luxo') {
                const textoLuxo = subInfo.herdouCapitao
                    ? `Luxo ativado (C 1.5x) por ${subInfo.substituiu}`
                    : `Luxo ativado por ${subInfo.substituiu}`;
                subBadge = `<div style="font-size:9px;color:#a855f7;margin-top:1px;"><span class="material-icons" style="font-size:10px;vertical-align:middle;">star</span> ${textoLuxo}</div>`;
            } else if (subInfo.tipo === 'posicao') {
                subBadge = `<div style="font-size:9px;color:#22c55e;margin-top:1px;"><span class="material-icons" style="font-size:10px;vertical-align:middle;">swap_vert</span> Entrou por ${subInfo.substituiu}</div>`;
            } else if (subInfo.tipo === 'substituido') {
                subBadge = '<div style="font-size:9px;color:#ef4444;margin-top:1px;opacity:0.8;">Não entrou em campo</div>';
            } else if (subInfo.tipo === 'substituido_luxo') {
                subBadge = '<div style="font-size:9px;color:#a855f7;margin-top:1px;opacity:0.8;"><span class="material-icons" style="font-size:10px;vertical-align:middle;">swap_vert</span> Substituído pelo Luxo</div>';
            }
        }

        const clubeId = a.clube_id || extrairClubeIdDaFoto(a.foto) || null;
        const escudoSrc = clubeId ? `/escudos/${clubeId}.png` : '/escudos/default.png';

        const csAtl = a.variacao_num ?? 0;
        const csClass = csAtl > 0 ? 'color:#22c55e' : csAtl < 0 ? 'color:#ef4444' : 'color:#6b7280';
        const csTexto = csAtl > 0 ? `+${csAtl.toFixed(1)}` : csAtl.toFixed(1);

        return `
            <tr style="border-bottom:1px solid #1f2937;">
                <td style="padding:8px 4px;text-align:center;">
                    <span style="background:${pos.cor};color:#fff;font-size:9px;padding:3px 7px;border-radius:4px;font-weight:bold;">${pos.nome}</span>
                </td>
                <td style="padding:8px 4px;text-align:center;">
                    <img src="${escudoSrc}" alt="" onerror="this.src='/escudos/default.png'" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;">
                </td>
                <td style="padding:8px 8px;font-size:13px;color:#e5e7eb;">
                    <div>${a.apelido || 'Atleta'}${capitaoBadge}</div>${subBadge}
                </td>
                <td style="padding:8px 4px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:bold;${pontosClass};">
                    ${pontosAtl}
                </td>
                <td style="padding:8px 4px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px;${csClass};">
                    ${csTexto}
                </td>
                <td style="padding:8px 4px;text-align:center;font-size:14px;">
                    ${statusIcon}
                </td>
            </tr>
        `;
    }

    const titularesHTML = titulares.length > 0
        ? titulares.map(a => {
            let subInfo = null;
            if (titularesSubstituidosModal.has(a.atleta_id)) {
                const tipo = titularesSubstituidosModal.get(a.atleta_id);
                subInfo = tipo === 'luxo' ? { tipo: 'substituido_luxo' } : { tipo: 'substituido' };
            }
            return renderAtleta(a, false, subInfo);
        }).join("")
        : '<tr><td colspan="6" style="color:#6b7280;padding:12px;text-align:center;">Sem dados de escalação</td></tr>';

    const reservasHTML = reservas.length > 0
        ? reservas.map(a => renderAtleta(a, true, substituicoesModal.get(a.atleta_id) || null)).join("")
        : '';

    // Criar modal
    const existente = document.getElementById("campinhoModal");
    if (existente) existente.remove();

    const modal = document.createElement("div");
    modal.id = "campinhoModal";
    modal.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.7);animation:fadeIn 0.2s ease;";

    modal.innerHTML = `
        <div style="background:#111827;border-radius:16px 16px 0 0;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;padding:0;animation:slideUp 0.3s ease;">
            <!-- Header -->
            <div style="position:sticky;top:0;background:#111827;padding:16px 20px;border-bottom:1px solid #1f2937;display:flex;align-items:center;justify-content:space-between;z-index:1;">
                <div>
                    <div style="font-family:'Russo One',sans-serif;font-size:16px;color:#fff;">${nomeTime}</div>
                    <div style="font-size:12px;color:#9ca3af;">${nomeCartola}${isMeuTime ? ' (Meu Time)' : ''}</div>
                </div>
                <button id="fecharCampinhoModal" style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:8px;">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <!-- Stats -->
            <div style="display:flex;gap:12px;padding:12px 20px;">
                <div style="flex:1;background:#1f2937;border-radius:8px;padding:10px;text-align:center;">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Pontos</div>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:bold;color:#ff5500;">${pontosFormatados}</div>
                </div>
                <div style="flex:1;background:#1f2937;border-radius:8px;padding:10px;text-align:center;">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Em Campo</div>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:bold;color:${emCampoCalc > 0 ? '#22c55e' : '#6b7280'};">${Math.min(emCampoCalc, totalAtl)}/${totalAtl}</div>
                </div>
            </div>

            <!-- Tabela de Titulares -->
            <div style="padding:8px 20px 16px;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:8px;font-weight:bold;">Titulares (${titulares.length})</div>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="border-bottom:2px solid #374151;color:#6b7280;font-size:10px;text-transform:uppercase;">
                            <th style="padding:6px 4px;text-align:center;font-weight:600;">POS</th>
                            <th style="padding:6px 4px;text-align:center;font-weight:600;">TIME</th>
                            <th style="padding:6px 8px;text-align:left;font-weight:600;">JOGADOR</th>
                            <th style="padding:6px 4px;text-align:right;font-weight:600;">PTS</th>
                            <th style="padding:6px 4px;text-align:right;font-weight:600;">C$</th>
                            <th style="padding:6px 4px;text-align:center;font-weight:600;">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${titularesHTML}
                    </tbody>
                </table>
            </div>

            ${reservas.length > 0 ? `
                <!-- Separador Banco de Reservas -->
                <div style="margin:0 20px;padding:12px 0;display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;border-top:1px dashed #374151;"></div>
                    <span style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:1px;display:flex;align-items:center;gap:4px;">
                        <span class="material-icons" style="font-size:14px;">event_seat</span>
                        BANCO
                    </span>
                    <div style="flex:1;border-top:1px dashed #374151;"></div>
                </div>

                <!-- Tabela de Reservas -->
                <div style="padding:8px 20px 24px;background:rgba(107,114,128,0.06);">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:8px;font-weight:600;letter-spacing:0.5px;">Reservas (${reservas.length})</div>
                    <table style="width:100%;border-collapse:collapse;font-size:13px;opacity:0.7;">
                        <tbody>
                            ${reservasHTML}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>
    `;

    // Estilos de animação
    if (!document.getElementById("campinhoModalStyles")) {
        const style = document.createElement("style");
        style.id = "campinhoModalStyles";
        style.textContent = `
            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .badge-em-campo {
                font-family: 'JetBrains Mono', monospace;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
                background: #1f2937;
                color: #6b7280;
                margin-left: 6px;
                font-weight: bold;
            }
            .badge-em-campo.ativo {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
                animation: pulseEmCampo 2s infinite;
            }
            @keyframes pulseEmCampo {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            .curiosar-icon {
                transition: color 0.2s;
            }
            [data-curiosar-time-id]:hover .curiosar-icon,
            [data-curiosar-time-id]:active .curiosar-icon {
                color: #ff5500 !important;
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Fechar modal
    document.getElementById("fecharCampinhoModal").addEventListener("click", () => {
        modal.remove();
    });
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });
}

// =====================================================================
// RENDERIZAR SEÇÃO DE INATIVOS
// =====================================================================
function renderizarSecaoInativos(inativos, rodadaNum) {
    if (!inativos || inativos.length === 0) return "";

    const inativosOrdenados = [...inativos].sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

    const items = inativosOrdenados.map((p) => {
        const nomeTime = p.nome || p.nome_time || "N/D";
        const nomeCartola = p.nome_cartola || "N/D";
        const rodadaDesist = p.rodada_desistencia;
        const rodadaInfo = rodadaDesist ? `Saiu na R${rodadaDesist}` : "Inativo";

        const pontosFormatados = Number(p.pontos || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        return `
            <div class="ranking-item-pro inativo">
                <div class="posicao-badge-pro pos-inativo">
                    <span class="material-icons" style="font-size: 14px;">person_off</span>
                </div>
                <div class="ranking-info-pro">
                    <div class="ranking-nome-time">${nomeTime}</div>
                    <div class="ranking-nome-cartola">${nomeCartola}</div>
                </div>
                <div class="ranking-stats-pro">
                    <div class="ranking-pontos-pro" style="color: #6b7280;">${pontosFormatados}</div>
                    <div class="ranking-inativo-info">${rodadaInfo}</div>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="secao-inativos">
            <div class="secao-inativos-header">
                <span class="material-icons">person_off</span>
                <span>Participantes Inativos (${inativos.length})</span>
            </div>
            ${items}
        </div>
    `;
}

// =====================================================================
// VOLTAR
// =====================================================================
window.voltarParaCards = function () {
    ParciaisModule.pararAutoRefresh?.();
    PollingInteligenteModule.parar?.();
    atualizarIndicadorAutoRefresh({ ativo: false });

    const detalhamento = document.getElementById("rodadaDetalhamento");
    if (detalhamento) {
        detalhamento.style.display = "none";
    }

    // Limpar escalação
    const escalacao = document.getElementById("minhaEscalacaoContainer");
    if (escalacao) escalacao.innerHTML = '';

    // Limpar seleções
    document.querySelectorAll(".rodada-mini-card").forEach((card) => {
        card.classList.remove("selected");
    });

    rodadaSelecionada = null;

    // Scroll para o grid
    const grid = document.getElementById('rodadasGruposContainer');
    if (grid) {
        grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};

// =====================================================================
// TOGGLE CAMPINHO (EXPAND/COLLAPSE)
// =====================================================================
window.toggleCampinho = function () {
    const header = document.getElementById('meToggleHeader');
    const content = document.getElementById('meCollapsibleContent');
    if (!header || !content) return;

    const isExpanded = content.classList.contains('expanded');
    if (isExpanded) {
        content.classList.remove('expanded');
        header.classList.remove('expanded');
    } else {
        content.classList.add('expanded');
        header.classList.add('expanded');
    }
};

// =====================================================================
// INDICADOR DE AUTO-REFRESH
// =====================================================================
function atualizarIndicadorAutoRefresh(status) {
    const indicador = document.getElementById("autoRefreshIndicator");
    const texto = document.getElementById("autoRefreshText");
    if (!indicador || !texto) return;

    if (!status?.ativo) {
        indicador.style.display = "none";
        return;
    }

    const intervaloSeg = Math.max(1, Math.round((status.intervalMs || 0) / 1000));
    const nextAt = status.nextAt || (Date.now() + (status.intervalMs || 0));
    const restanteSeg = Math.max(0, Math.round((nextAt - Date.now()) / 1000));

    texto.textContent = `Auto-refresh ativo • ${intervaloSeg}s (próx. ${restanteSeg}s)`;
    indicador.style.display = "inline-flex";
}

// =====================================================================
// TOAST
// =====================================================================
window.mostrarEmDesenvolvimento = function (funcionalidade) {
    mostrarToast(`${funcionalidade} em desenvolvimento`);
};

function mostrarToast(msg) {
    const toast = document.getElementById("toastDesenvolvimento");
    const mensagem = document.getElementById("toastMensagem");

    if (toast && mensagem) {
        mensagem.textContent = msg;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
}

// =====================================================================
// ESTADOS
// =====================================================================
function mostrarLoading(show) {
    const loading = document.getElementById("rodadasLoading");
    const grupos = document.getElementById("rodadasGruposContainer");

    if (loading) loading.style.display = show ? "flex" : "none";
    if (grupos) grupos.style.display = show ? "none" : "flex";
}

function mostrarEstadoVazio(show) {
    const empty = document.getElementById("rodadasEmpty");
    const grupos = document.getElementById("rodadasGruposContainer");

    if (empty) empty.style.display = show ? "flex" : "none";
    if (grupos) grupos.style.display = show ? "none" : "flex";
}

function mostrarErro(mensagem) {
    const container = document.getElementById("rodadasGruposContainer");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">error_outline</span>
                <h3 style="margin-bottom: 8px;">Erro ao Carregar</h3>
                <p style="color: #9ca3af;">${mensagem}</p>
            </div>
        `;
        container.style.display = "flex";
    }
}

if (window.Log)
    Log.info("[PARTICIPANTE-RODADAS] Modulo v7.0 carregado (CARTOLA-STYLE + CHART)");

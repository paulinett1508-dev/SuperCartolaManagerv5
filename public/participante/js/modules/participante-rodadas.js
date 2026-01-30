// =====================================================================
// PARTICIPANTE-RODADAS.JS - v6.0 CLEAN GRID + ENRICHED DETAIL
// ✅ v6.0: Removido slider redundante, laranja sutil (#FF4500),
//          detalhamento enriquecido com "Meu Resumo" card
// ✅ v5.1: "Curiosar" + Badge "X/12 em campo"
// ✅ v5.0: Redesign completo
// ✅ v4.6: FIX - Double RAF para garantir container no DOM após refresh
// ✅ v4.5: Removido LIGAS_CONFIG hardcoded - configs vêm do servidor
// ✅ v4.4: CACHE-FIRST - Carregamento instantâneo do IndexedDB
// =====================================================================

if (window.Log) Log.info("[PARTICIPANTE-RODADAS] Carregando modulo v6.0...");

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

    // 2. Renderizar Card de Desempenho
    renderizarCardDesempenho(rodadas);

    // 3. Mostrar container
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
// CARD DE DESEMPENHO MITOS/MICOS
// =====================================================================
function renderizarCardDesempenho(rodadas) {
    const card = document.getElementById("cardDesempenhoMitosMicos");
    if (!card) return;

    let totalMitos = 0;
    let totalMicos = 0;
    let ultimoMito = null;
    let ultimoMico = null;
    let rodadasJogadas = 0;

    rodadas.forEach((rodada) => {
        if (!rodada.jogou || !rodada.participantes?.length) return;

        rodadasJogadas++;

        const destaqueRodada = obterMitoMicoDaRodada(rodada);
        if (destaqueRodada) {
            const numeroRodada = obterNumeroRodada(rodada);
            if (compararTimeIds(destaqueRodada.mito?.timeId, meuTimeId)) {
                totalMitos++;
                ultimoMito = numeroRodada;
            }
            if (compararTimeIds(destaqueRodada.mico?.timeId, meuTimeId)) {
                totalMicos++;
                ultimoMico = numeroRodada;
            }
        }
    });

    const totalOcorrencias = totalMitos + totalMicos;
    const percentMito = totalOcorrencias > 0 ? Math.round((totalMitos / totalOcorrencias) * 100) : 0;
    const percentMico = totalOcorrencias > 0 ? Math.round((totalMicos / totalOcorrencias) * 100) : 0;

    document.getElementById("desempBadgeRodadas").textContent = `${rodadasJogadas} RODADAS`;
    document.getElementById("desempMitosCount").textContent = totalMitos;
    document.getElementById("desempMicosCount").textContent = totalMicos;
    document.getElementById("desempMitoPercent").textContent = `${percentMito}%`;
    document.getElementById("desempMicoPercent").textContent = `${percentMico}%`;
    document.getElementById("progressMito").style.width = `${percentMito}%`;
    document.getElementById("progressMico").style.width = `${percentMico}%`;
    document.getElementById("desempUltimoMito").textContent = ultimoMito ? `Rodada ${ultimoMito}` : "Nenhum";
    document.getElementById("desempUltimoMico").textContent = ultimoMico ? `Rodada ${ultimoMico}` : "Nenhum";

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
// SELEÇÃO DE RODADA
// =====================================================================
async function selecionarRodada(numeroRodada, isParcial = false) {
    if (window.Log)
        Log.info(`[PARTICIPANTE-RODADAS] 📌 Selecionando rodada ${numeroRodada} (parcial: ${isParcial})`);

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
        if (!rodadaData || rodadaData.participantes.length === 0) {
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
function calcularZonaLabel(posicao, totalParticipantes, valorFinanceiro) {
    if (!posicao || !totalParticipantes) return '';

    // Derivar zona a partir do valorFinanceiro
    if (valorFinanceiro > 0) {
        // Zona de Ganho
        if (posicao === 1) {
            return '<span class="zona-badge zona-mito">MITO</span>';
        }
        return `<span class="zona-badge zona-g">G${posicao}</span>`;
    } else if (valorFinanceiro < 0) {
        // Zona de Risco - numerar de baixo pra cima
        if (posicao === totalParticipantes) {
            return '<span class="zona-badge zona-mico">MICO</span>';
        }
        // Z1 = primeiro da zona Z (mais perto do neutro), ZN = penúltimo
        const zNum = totalParticipantes - posicao;
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
        const meuZonaBadge = !isParcial ? calcularZonaLabel(minhaPosicaoCalc, totalParticipantes, meusValor) : '';
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

        // Em campo badge for parciais
        const emCampoInfo = isParcial && meuPart.totalAtletas > 0
            ? `<span style="margin-left:8px;font-family:'JetBrains Mono',monospace;font-size:11px;color:${meuPart.atletasEmCampo > 0 ? '#22c55e' : '#6b7280'}">${meuPart.atletasEmCampo}/${meuPart.totalAtletas} em campo</span>`
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
        const zonaBadge = !isParcial ? calcularZonaLabel(posicao, totalParticipantes, valorFinanceiro) : '';

        // ✅ v3.0: Badge "X/12 em campo" e clique para curiosar
        const emCampo = participante.atletasEmCampo || 0;
        const totalAtl = participante.totalAtletas || 0;
        const badgeEmCampo = isParcial && totalAtl > 0
            ? `<span class="badge-em-campo ${emCampo > 0 ? 'ativo' : ''}">${emCampo}/${totalAtl}</span>`
            : "";

        const curiosarAttr = isParcial && !participante.rodadaNaoJogada
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
                ${isParcial ? '<span class="material-icons curiosar-icon" style="font-size:16px;color:#6b7280;margin-left:4px;">visibility</span>' : ''}
            </div>
        `;
    }).join("");

    if (participantesInativos.length > 0) {
        html += renderizarSecaoInativos(participantesInativos, rodadaData.numero);
    }

    container.innerHTML = html || '<div style="text-align: center; padding: 40px; color: #6b7280;">Nenhum dado disponível</div>';

    if (isParcial) {
        container.insertAdjacentHTML("beforeend", `
            <div style="text-align: center; padding: 20px;">
                <button onclick="selecionarRodada(${rodadaData.numero}, true)" class="btn-atualizar-parciais">
                    <span class="material-icons">refresh</span>
                    Atualizar Parciais
                </button>
            </div>
        `);

        // ✅ v3.0: Event listener para "Curiosar" - clicar no card abre campinho
        container.querySelectorAll("[data-curiosar-time-id]").forEach((el) => {
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                const targetTimeId = el.getAttribute("data-curiosar-time-id");
                if (targetTimeId) abrirCampinhoModal(targetTimeId, rodadaData.numero);
            });
        });
    }
}

// =====================================================================
// MODAL "CURIOSAR" - VER ESCALAÇÃO DE OUTRO TIME
// =====================================================================
function abrirCampinhoModal(targetTimeId, rodada) {
    if (window.Log) Log.info("[RODADAS] 👀 Curiosar time:", targetTimeId);

    // Buscar dados enriquecidos do parciais (já em cache)
    const dadosParciais = ParciaisModule.obterDados?.();
    const timeDados = dadosParciais?.participantes?.find(
        (p) => String(p.timeId) === String(targetTimeId)
    );

    // Buscar escalação cacheada completa
    const escalacaoCacheada = ParciaisModule.obterEscalacaoCacheada?.(targetTimeId);

    const nomeTime = timeDados?.nome_time || "Time";
    const nomeCartola = timeDados?.nome_cartola || "";
    const pontos = timeDados?.pontos || 0;
    const emCampo = timeDados?.atletasEmCampo || 0;
    const totalAtl = timeDados?.totalAtletas || 0;
    const atletas = timeDados?.atletas || [];
    const capitaoId = timeDados?.capitao_id;
    const isMeuTime = String(targetTimeId) === String(meuTimeId);

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

    // Separar titulares e reservas
    const titulares = atletas.filter(a => !a.is_reserva);
    const reservas = atletas.filter(a => a.is_reserva);

    // Renderizar lista de atletas
    function renderAtleta(a) {
        const pos = POSICOES[a.posicao_id] || { nome: '???', cor: '#6b7280' };
        const pontosAtl = Number(a.pontos_efetivos || 0).toFixed(1);
        const pontosClass = a.pontos_efetivos > 0 ? 'color:#22c55e' : a.pontos_efetivos < 0 ? 'color:#ef4444' : 'color:#6b7280';
        const emCampoIcon = a.entrou_em_campo
            ? '<span style="color:#22c55e;font-size:10px;">&#9679;</span>'
            : '<span style="color:#374151;font-size:10px;">&#9679;</span>';
        const capitaoBadge = a.is_capitao ? '<span style="background:#eab308;color:#000;font-size:9px;padding:1px 4px;border-radius:3px;font-weight:bold;margin-left:4px;">C</span>' : '';
        const reservaLuxoBadge = a.is_reserva_luxo ? '<span style="background:#a855f7;color:#fff;font-size:9px;padding:1px 4px;border-radius:3px;font-weight:bold;margin-left:4px;">L</span>' : '';

        return `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #1f2937;">
                ${emCampoIcon}
                <span style="background:${pos.cor};color:#fff;font-size:9px;padding:2px 6px;border-radius:4px;min-width:30px;text-align:center;font-weight:bold;">${pos.nome}</span>
                <span style="flex:1;font-size:13px;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.apelido || 'Atleta'}${capitaoBadge}${reservaLuxoBadge}</span>
                <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:bold;${pontosClass};min-width:40px;text-align:right;">${pontosAtl}</span>
            </div>
        `;
    }

    const titularesHTML = titulares.length > 0
        ? titulares.map(renderAtleta).join("")
        : '<div style="color:#6b7280;padding:8px;text-align:center;">Sem dados de escalação</div>';

    const reservasHTML = reservas.length > 0
        ? `<div style="margin-top:12px;padding-top:8px;border-top:1px solid #374151;">
             <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;font-weight:bold;">Banco</div>
             ${reservas.map(renderAtleta).join("")}
           </div>`
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
                    <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:bold;color:${emCampo > 0 ? '#22c55e' : '#6b7280'};">${emCampo}/${totalAtl}</div>
                </div>
            </div>

            <!-- Atletas -->
            <div style="padding:8px 20px 24px;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;font-weight:bold;">Titulares</div>
                ${titularesHTML}
                ${reservasHTML}
            </div>
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
    Log.info("[PARTICIPANTE-RODADAS] Modulo v6.0 carregado (CLEAN GRID + ENRICHED DETAIL)");

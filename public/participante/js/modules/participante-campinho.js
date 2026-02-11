// =====================================================================
// PARTICIPANTE-CAMPINHO.JS - v2.1 (CAMPINHO VIRTUAL PREMIUM)
// =====================================================================
// ✅ v2.1: Fallback offline - Usa atletas salvos na collection rodadas
//          quando API Cartola FC está indisponível
// ✅ v2.0: Redesign completo com visual de campo de futebol real
//          - Cores por posição (GOL laranja, DEF azul, MEI verde, ATA vermelho)
//          - Capitão destacado com badge "C" amarelo
//          - Reserva de Luxo com badge "L" roxo/dourado
//          - Seção de banco de reservas
//          - Animações de entrada e efeitos mito/mico
//          - Integra com confrontos (Pontos Corridos, Mata-mata)
// =====================================================================

if (window.Log) Log.info("PARTICIPANTE-CAMPINHO", "🔄 Carregando módulo v2.1...");

// Mapeamento de posicoes do Cartola
const POSICOES = {
    1: { nome: 'Goleiro', abrev: 'GOL', cor: 'gol', icone: 'sports_soccer' },
    2: { nome: 'Lateral', abrev: 'LAT', cor: 'def', icone: 'directions_run' },
    3: { nome: 'Zagueiro', abrev: 'ZAG', cor: 'def', icone: 'shield' },
    4: { nome: 'Meia', abrev: 'MEI', cor: 'mei', icone: 'sync_alt' },
    5: { nome: 'Atacante', abrev: 'ATA', cor: 'ata', icone: 'sports_score' },
    6: { nome: 'Técnico', abrev: 'TEC', cor: 'tec', icone: 'person' }
};

// Thresholds para mito/mico
const MITO_THRESHOLD = 12;  // > 12 pontos = mito
const MICO_THRESHOLD = -3;  // < -3 pontos = mico

// Truncar pontos (sem arredondar) - fallback local caso participante-utils nao carregue
function _truncar(v) {
    if (typeof truncarPontos === 'function') return truncarPontos(v);
    const num = parseFloat(v) || 0;
    return (Math.trunc(num * 100) / 100).toFixed(2).replace('.', ',');
}

// Escape HTML para prevenir XSS
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Estado do modulo
let dadosEscalacao = null;
let dadosAdversario = null;
let confrontoAtual = null;

// =====================================================================
// FUNCAO PRINCIPAL DE INICIALIZACAO
// =====================================================================
export async function inicializarCampinhoParticipante(params) {
    let ligaId, timeId, participante;

    if (typeof params === "object" && params !== null) {
        ligaId = params.ligaId;
        timeId = params.timeId;
        participante = params.participante;
    } else {
        ligaId = params;
        timeId = arguments[1];
    }

    if (window.Log) Log.debug("PARTICIPANTE-CAMPINHO", "🚀 Inicializando v2.0...", { ligaId, timeId });

    const container = document.getElementById("campinho-container");
    if (!container) {
        if (window.Log) Log.error("PARTICIPANTE-CAMPINHO", "❌ Container não encontrado");
        return;
    }

    // Mostrar loading
    container.innerHTML = renderizarLoading();

    try {
        const statusMercado = await buscarStatusMercado();
        const rodadaMercado = statusMercado?.rodada_atual || 1;
        const mercadoAberto = statusMercado?.status_mercado === 1;

        // Sempre mostrar última rodada consolidada
        // Se mercado aberto, a rodada atual é a próxima (ainda não jogada), então usa anterior
        const rodadaConsolidada = mercadoAberto ? Math.max(1, rodadaMercado - 1) : rodadaMercado;

        const [escalacao, confrontos] = await Promise.all([
            buscarEscalacaoCompleta(ligaId, timeId, rodadaConsolidada),
            buscarConfrontos(ligaId, timeId)
        ]);

        dadosEscalacao = escalacao;
        confrontoAtual = confrontos;

        if (!escalacao || (!escalacao.atletas?.length && !escalacao.titulares?.length)) {
            container.innerHTML = renderizarSemEscalacao();
            return;
        }

        // Buscar dados do adversario se tiver confronto
        if (confrontos?.adversario?.timeId) {
            dadosAdversario = await buscarEscalacaoCompleta(ligaId, confrontos.adversario.timeId, rodadaConsolidada);
        }

        // Renderizar campinho completo
        container.innerHTML = renderizarCampinhoCompleto(escalacao, dadosAdversario, confrontos, ligaId, timeId, statusMercado);

        // Buscar extrato financeiro da rodada (assíncrono)
        buscarExtratoRodada(ligaId, timeId, rodadaConsolidada);

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-CAMPINHO", "❌ Erro:", error);
        container.innerHTML = renderizarErro(error.message);
    }
}

// =====================================================================
// FUNCAO PARA CALCULAR STATS DE JOGO (escalados, jogaram, sairam, entraram)
// =====================================================================
function calcularStatsJogo(titulares, reservas) {
    // Status do Cartola: 2 = Dúvida, 3 = Suspenso, 5 = Contundido, 6 = Nulo (não joga), 7 = Provável
    // Jogador "jogou" se tem pontos != null/undefined ou status indica que jogou
    const STATUS_NAO_JOGOU = [2, 3, 5, 6]; // Dúvida, Suspenso, Contundido, Nulo

    const totalEscalados = titulares.length;

    // Titulares que efetivamente jogaram (pontuaram algo, mesmo 0.00)
    const titularesQueJogaram = titulares.filter(a => {
        const pontos = parseFloat(a.pontos_atual ?? a.pontos_num ?? a.pontos);
        const status = a.status_id ?? a.statusId ?? a.status ?? 7;
        // Se tem pontos definidos (mesmo 0) e status não é "não jogou", jogou
        const temPontos = pontos !== null && pontos !== undefined && !isNaN(pontos);
        const statusJogou = !STATUS_NAO_JOGOU.includes(Number(status));
        return temPontos && statusJogou;
    });

    // Titulares que NÃO jogaram (saíram/substituídos)
    const titularesQueSairam = titulares.filter(a => {
        const pontos = parseFloat(a.pontos_atual ?? a.pontos_num ?? a.pontos);
        const status = a.status_id ?? a.statusId ?? a.status ?? 7;
        const naoTemPontos = pontos === null || pontos === undefined || isNaN(pontos);
        const statusNaoJogou = STATUS_NAO_JOGOU.includes(Number(status));
        return naoTemPontos || statusNaoJogou;
    });

    // Reservas que entraram (substituíram titulares)
    const reservasQueEntraram = reservas.filter(a => {
        const pontos = parseFloat(a.pontos_atual ?? a.pontos_num ?? a.pontos);
        // No Cartola, reserva que entra tem pontos contabilizados
        return pontos !== null && pontos !== undefined && !isNaN(pontos) && pontos !== 0;
    });

    // Se não conseguiu detectar substituições, usar lógica alternativa
    // (reservas usados = min(titulares que sairam, reservas disponíveis))
    let sairam = titularesQueSairam.length;
    let entraram = reservasQueEntraram.length;

    // Garantir consistência: entraram não pode ser maior que sairam
    if (entraram > sairam && sairam === 0) {
        // Provavelmente todos jogaram, reservas com pontos são erro de dados
        entraram = 0;
    }

    return {
        escalados: totalEscalados,
        jogaram: titularesQueJogaram.length + entraram,
        sairam: sairam,
        entraram: entraram,
        totalReservas: reservas.length
    };
}

// =====================================================================
// FUNCAO PARA BUSCAR EXTRATO DA RODADA (ASSÍNCRONO)
// =====================================================================
async function buscarExtratoRodada(ligaId, timeId, rodada) {
    const extratoEl = document.getElementById('campinho-extrato-rodada');
    if (!extratoEl) return;

    try {
        const temporada = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();
        const response = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${rodada}&temporada=${temporada}`);

        if (!response.ok) throw new Error('Falha ao buscar extrato');

        const data = await response.json();
        const rodadas = data?.rodadas || [];

        // Encontrar a rodada específica
        const rodadaData = rodadas.find(r => r.rodada === Number(rodada));

        if (rodadaData) {
            // bonusOnus representa o resultado financeiro da rodada (em R$, não cartoletas)
            const bonusOnus = rodadaData.bonusOnus || 0;
            const posicao = rodadaData.posicao || null;

            let icone, classe, texto;

            if (bonusOnus > 0) {
                icone = 'trending_up';
                classe = 'ganho';
                texto = `Ganhei R$ ${Math.abs(bonusOnus).toFixed(2)} de bônus${posicao ? ` (${posicao}º lugar)` : ''}`;
            } else if (bonusOnus < 0) {
                icone = 'trending_down';
                classe = 'perda';
                texto = `Perdi R$ ${Math.abs(bonusOnus).toFixed(2)} de ônus${posicao ? ` (${posicao}º lugar)` : ''}`;
            } else {
                icone = 'remove';
                classe = 'neutro';
                texto = posicao ? `${posicao}º lugar - Sem bônus/ônus` : 'Sem movimentação financeira';
            }

            extratoEl.innerHTML = `
                <span class="material-icons campinho-desemp-extrato-icon ${classe}">${icone}</span>
                <span class="campinho-desemp-extrato-texto ${classe}">${texto}</span>
            `;
        } else {
            // Rodada não encontrada no extrato
            extratoEl.innerHTML = `
                <span class="material-icons campinho-desemp-extrato-icon neutro">receipt_long</span>
                <span class="campinho-desemp-extrato-texto neutro">Extrato da rodada ainda não processado</span>
            `;
        }
    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-CAMPINHO", "Erro ao buscar extrato:", error);
        extratoEl.innerHTML = `
            <span class="material-icons campinho-desemp-extrato-icon neutro">receipt_long</span>
            <span class="campinho-desemp-extrato-texto neutro">Ver extrato completo no módulo Extrato</span>
        `;
    }
}

// =====================================================================
// FUNCOES DE BUSCA DE DADOS
// =====================================================================
async function buscarEscalacaoCompleta(ligaId, timeId, rodada = 1) {
    const rodadaAtual = Number(rodada) || 1;
    const temporada = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

    try {
        const atletasPontuados = await tentarBuscarAtletasPontuados();
        const rawEscalacao = await carregarEscalacaoDoDataLake(timeId, rodadaAtual, temporada, atletasPontuados.atletas || {});
        if (rawEscalacao) {
            return rawEscalacao;
        }

        // Fallback furrom Cartola (porque o dump ainda não existe)
        const cartolaRes = await fetch(`/api/cartola/time/${timeId}/${rodadaAtual}/escalacao`);
        if (cartolaRes.ok) {
            const data = await cartolaRes.json();
            // Controller já separa titulares/reservas corretamente
            const tit = data.titulares || [];
            const res = data.reservas || [];
            const todosAtletas = data.atletas || [...tit, ...res];
            return {
                timeId,
                rodada: rodadaAtual,
                atletas: todosAtletas,
                titulares: tit,
                reservas: res,
                capitao_id: data.capitao_id,
                reserva_luxo_id: data.reserva_luxo_id,
                pontos: data.pontos || calcularPontosTotais(data),
                patrimonio: data.patrimonio,
                variacao_patrimonio: data.variacao_patrimonio,
                nome: data.nome,
                nome_cartoleiro: data.nome_cartoleiro
            };
        }

        // Fallback extra: usar cache de rodadas
        const response = await fetch(`/api/rodadas/${ligaId}/rodadas?inicio=${rodadaAtual}&fim=${rodadaAtual}`);
        if (!response.ok) return null;

        const rodadas = await response.json();
        const rodadaTime = rodadas.find(r =>
            Number(r.timeId) === Number(timeId) || Number(r.time_id) === Number(timeId)
        );

        if (!rodadaTime) return null;

        const atletas = rodadaTime.atletas || [];
        const titulares = atletas.filter(a => !a.is_reserva);
        const reservas = atletas.filter(a => a.is_reserva);

        return {
            timeId,
            rodada: rodadaAtual,
            atletas: atletas,
            titulares: titulares,
            reservas: reservas,
            capitao_id: rodadaTime.capitao_id || null,
            reserva_luxo_id: rodadaTime.reserva_luxo_id || null,
            pontos: rodadaTime.pontos,
            patrimonio: rodadaTime.patrimonio
        };

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-CAMPINHO", "Erro ao buscar escalação:", error);
        return null;
    }
}

function calcularPontosTotais(data) {
    const atletas = data?.titulares || data?.atletas || [];
    const capitaoId = data?.capitao_id;
    const reservaLuxoId = data?.reserva_luxo_id;

    if (!Array.isArray(atletas)) return 0;

    return atletas.reduce((total, a) => {
        const atletaId = Number(a.atleta_id ?? a.atletaId ?? a.id);
        let pontos = parseFloat(a.pontos_atual ?? a.pontos_num ?? (a.pontos || 0)) || 0;
        if (atletaId && Number(capitaoId) && atletaId === Number(capitaoId)) pontos *= 2;
        else if (atletaId && Number(reservaLuxoId) && atletaId === Number(reservaLuxoId) && pontos !== 0) pontos *= 1.5;
        return total + pontos;
    }, 0);
}

async function buscarConfrontos(ligaId, timeId) {
    try {
        // Buscar confronto de Pontos Corridos
        const pcRes = await fetch(`/api/pontos-corridos/${ligaId}/confronto/${timeId}`);
        let pontosCorridos = null;
        if (pcRes.ok) {
            pontosCorridos = await pcRes.json();
        }

        // Buscar confronto de Mata-mata
        const mmRes = await fetch(`/api/mata-mata/${ligaId}/confronto/${timeId}`);
        let mataMata = null;
        if (mmRes.ok) {
            mataMata = await mmRes.json();
        }

        // Retornar o confronto mais relevante
        if (mataMata?.ativo) {
            return {
                tipo: 'mata-mata',
                adversario: mataMata.adversario,
                placar: mataMata.placar,
                fase: mataMata.fase
            };
        }

        if (pontosCorridos?.adversario) {
            return {
                tipo: 'pontos-corridos',
                adversario: pontosCorridos.adversario,
                placar: pontosCorridos.placar,
                posicao: pontosCorridos.posicao
            };
        }

        return null;
    } catch (error) {
        if (window.Log) Log.debug("PARTICIPANTE-CAMPINHO", "Sem confrontos ativos");
        return null;
    }
}

async function tentarBuscarAtletasPontuados() {
    try {
        const response = await fetch('/api/cartola-proxy/atletas/pontuados');
        if (!response.ok) return { atletas: {} };
        return await response.json();
    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-CAMPINHO", "Falha ao buscar atletas pontuados:", error);
        return { atletas: {} };
    }
}

async function carregarEscalacaoDoDataLake(timeId, rodada, temporada, atletasPontuados) {
    try {
        const response = await fetch(`/api/data-lake/raw/${timeId}?rodada=${rodada}&temporada=${temporada}`);
        if (!response.ok) return null;
        const payload = await response.json();
        const rawJson = payload?.dump_atual?.raw_json;
        if (!rawJson) return null;
        return construirEscalacaoFromRaw(rawJson, timeId, rodada, atletasPontuados);
    } catch (error) {
        if (window.Log) Log.debug("PARTICIPANTE-CAMPINHO", "Data Lake indisponível:", error);
        return null;
    }
}

function construirEscalacaoFromRaw(rawJson, timeId, rodada, atletasPontuados) {
    if (!rawJson) return null;
    // Cartola API retorna titulares em rawJson.atletas e reservas em rawJson.reservas (arrays/objetos separados)
    const titularesRaw = normalizarListaAtletas(rawJson?.atletas || rawJson?.atletas_obj || {}, atletasPontuados, false);
    const reservasRaw = normalizarListaAtletas(rawJson?.reservas || [], atletasPontuados, true);
    const todosAtletas = [...titularesRaw, ...reservasRaw];
    const capitainId = rawJson.capitao_id ?? rawJson.capitaoId ?? rawJson.capitao;
    const reservaLuxoId = rawJson.reserva_luxo_id ?? rawJson.reservaLuxoId ?? rawJson.reserva_luxo;

    return {
        timeId,
        rodada,
        atletas: todosAtletas,
        titulares: titularesRaw,
        reservas: reservasRaw,
        capitao_id: capitainId,
        reserva_luxo_id: reservaLuxoId,
        pontos: rawJson.pontos ?? calcularPontosTotais({ titulares: titularesRaw, capitao_id: capitainId, reserva_luxo_id: reservaLuxoId }),
        patrimonio: rawJson.patrimonio,
        variacao_patrimonio: rawJson.variacao_patrimonio,
        nome: rawJson.nome ?? rawJson.time?.nome ?? rawJson.nome_cartoleiro ?? 'Sua Escalação',
        nome_cartoleiro: rawJson.nome_cartoleiro ?? rawJson.time?.nome_cartoleiro ?? rawJson.cartoleiro_nome ?? 'Cartoleiro'
    };
}

function normalizarListaAtletas(payload, atletasPontuados, isReserva) {
    const lista = Array.isArray(payload) ? payload : Object.values(payload || {});
    return lista.map((atleta) => {
        const atletaId = Number(atleta.atleta_id ?? atleta.atletaId ?? atleta.id);
        const pontuado = atletasPontuados?.[String(atletaId)] ?? atletasPontuados?.[atletaId] ?? {};
        const pontosRaw = parseFloat(atleta.pontos_num ?? atleta.pontos ?? 0) || 0;
        const pontosAtual = Number(pontuado.pontos_num ?? pontuado.pontos ?? pontuado.pontuacao ?? 0);
        const valorPontos = Number.isFinite(pontosAtual) && pontosAtual !== 0 ? pontosAtual : pontosRaw;
        const preco = Number(atleta.preco_num ?? atleta.preco ?? atleta.valor ?? 0) || 0;
        return {
            ...atleta,
            atleta_id: atletaId,
            pontos_raw: pontosRaw,
            pontos_atual: valorPontos,
            posicao_id: atleta.posicao_id ?? atleta.posicaoId ?? atleta.posicao ?? 0,
            status_id: atleta.status_id ?? atleta.statusId ?? atleta.status ?? 1,
            is_reserva: isReserva,
            apelido: atleta.apelido || atleta.nome || atleta.nick || 'Jogador',
            clube_id: atleta.clube_id ?? atleta.clubeId ?? 'default',
            preco
        };
    });
}

async function buscarStatusMercado() {
    try {
        const response = await fetch('/api/cartola/mercado/status');
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch {
        return null;
    }
}

// =====================================================================
// FUNCOES DE RENDERIZACAO
// =====================================================================
function renderizarLoading() {
    return `
        <div class="campinho-loading">
            <div class="spinner"></div>
            <p>Carregando escalação...</p>
        </div>
    `;
}

function renderizarErro(mensagem) {
    return `
        <div class="campinho-empty">
            <span class="material-icons">error_outline</span>
            <h3>Erro ao carregar</h3>
            <p>${esc(mensagem) || 'Não foi possível carregar a escalação'}</p>
        </div>
    `;
}

function renderizarSemEscalacao() {
    return `
        <div class="campinho-empty">
            <span class="material-icons">sports_soccer</span>
            <h3>Sem escalação</h3>
            <p>Você ainda não escalou nesta rodada</p>
        </div>
    `;
}


function renderizarCampinhoCompleto(escalacao, adversario, confronto, ligaId, timeId, statusMercado) {
    const temAdversario = adversario && (adversario.atletas?.length > 0 || adversario.titulares?.length > 0);
    const todosAtletas = escalacao.atletas || [];
    const titulares = escalacao.titulares || todosAtletas.filter(a => !a.is_reserva);
    const reservas = escalacao.reservas?.length ? escalacao.reservas : todosAtletas.filter(a => a.is_reserva);
    const pontosTotais = escalacao.pontos || calcularPontosTotais(escalacao);
    const grupos = agruparTitulares(titulares);
    const gruposAdversario = temAdversario ? agruparTitulares(adversario.titulares || adversario.atletas || []) : null;
    const totalEscalados = (grupos.goleiros.length + grupos.defensores.length + grupos.meias.length + grupos.atacantes.length + grupos.tecnicos.length);

    // Calcular estatísticas de jogo (quem jogou, quem saiu, quem entrou)
    const statsJogo = calcularStatsJogo(titulares, reservas);
    const formacao = `${grupos.defensores.length || 0}-${grupos.meias.length || 0}-${grupos.atacantes.length || 0}`;
    const patrimonio = Number(escalacao.patrimonio ?? escalacao.patrimonio_total ?? 0) || 0;
    const variacao = Number(escalacao.variacao_patrimonio ?? 0) || 0;
    const rodadaLabel = escalacao.rodada ?? '--';

    // Determinar ícone de variação
    const variacaoIcone = variacao > 0 ? '▲' : variacao < 0 ? '▼' : '';
    const variacaoClasse = variacao >= 0 ? 'positivo' : 'negativo';

    // Determinar status da rodada (parcial ao vivo vs consolidada)
    const isParcial = statusMercado?.status_mercado === 2;
    const statusClasse = isParcial ? 'parcial' : 'consolidada';
    const statusTexto = isParcial ? 'AO VIVO' : 'CONSOLIDADA';

    return `
        <div class="campinho-wrapper campinho-screen">
            <header class="campinho-header-minimal">
                <div class="campinho-header-top">
                    <span class="campinho-rodada-badge">RODADA ${rodadaLabel}</span>
                    <span class="campinho-status-indicator ${statusClasse}">
                        <span class="campinho-status-dot"></span>
                        ${statusTexto}
                    </span>
                    <span class="campinho-formation">${formacao}</span>
                </div>
            </header>

            <!-- CARD MEU DESEMPENHO -->
            <div class="campinho-desempenho-card">
                <div class="campinho-desemp-header">
                    <span class="material-icons">bar_chart</span>
                    <span>Meu Desempenho</span>
                </div>

                <div class="campinho-desemp-main">
                    <div class="campinho-desemp-pontos-box">
                        <span class="campinho-desemp-pontos-valor">${_truncar(pontosTotais)}</span>
                        <span class="campinho-desemp-pontos-label">Pontos na Rodada</span>
                    </div>
                </div>

                <div class="campinho-desemp-stats campinho-desemp-stats-2col">
                    <div class="campinho-desemp-stat">
                        <span class="campinho-desemp-stat-valor">${formatarCartoletas(patrimonio)}</span>
                        <span class="campinho-desemp-stat-label">Patrimônio</span>
                    </div>
                    <div class="campinho-desemp-stat">
                        <span class="campinho-desemp-stat-valor ${variacaoClasse}">${variacao >= 0 ? '+' : ''}${formatarCartoletas(variacao)} ${variacaoIcone}</span>
                        <span class="campinho-desemp-stat-label">Variação</span>
                    </div>
                </div>

                <div class="campinho-desemp-escalacao">
                    <div class="campinho-desemp-esc-item">
                        <span class="campinho-desemp-esc-icon escalados">●</span>
                        <span class="campinho-desemp-esc-valor">${statsJogo.escalados}</span>
                        <span class="campinho-desemp-esc-label">escalados</span>
                    </div>
                    <div class="campinho-desemp-esc-item">
                        <span class="campinho-desemp-esc-icon jogaram">●</span>
                        <span class="campinho-desemp-esc-valor">${statsJogo.jogaram}</span>
                        <span class="campinho-desemp-esc-label">jogaram</span>
                    </div>
                    <div class="campinho-desemp-esc-item">
                        <span class="campinho-desemp-esc-icon sairam">▼</span>
                        <span class="campinho-desemp-esc-valor">${statsJogo.sairam}</span>
                        <span class="campinho-desemp-esc-label">saiu</span>
                    </div>
                    <div class="campinho-desemp-esc-item">
                        <span class="campinho-desemp-esc-icon entraram">▲</span>
                        <span class="campinho-desemp-esc-valor">${statsJogo.entraram}</span>
                        <span class="campinho-desemp-esc-label">entrou</span>
                    </div>
                </div>

                <!-- Extrato Financeiro da Rodada (carrega assíncrono) -->
                <div class="campinho-desemp-extrato" id="campinho-extrato-rodada" data-liga-id="${ligaId}" data-time-id="${timeId}" data-rodada="${rodadaLabel}">
                    <span class="material-icons campinho-desemp-extrato-icon loading">sync</span>
                    <span class="campinho-desemp-extrato-texto">Carregando extrato...</span>
                </div>
            </div>

            <!-- TABELA DE ESCALAÇÃO (formato Rodadas) -->
            <section class="campinho-escalacao-tabela">
                <div class="campinho-escalacao-header-bar">
                    <div class="campinho-escalacao-header-left">
                        <span class="material-icons">stadium</span>
                        <span>Titulares</span>
                        <span class="campinho-escalacao-count">(${totalEscalados})</span>
                    </div>
                    <div class="campinho-escalacao-header-right">
                        <span class="campinho-escalacao-total-label">Total</span>
                        <span class="campinho-escalacao-total-valor">${_truncar(pontosTotais)} pts</span>
                    </div>
                </div>
                <div class="campinho-escalacao-body">
                    ${renderizarListaPorPosicao('GOL', grupos.goleiros, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                    ${renderizarListaPorPosicao('LAT', grupos.laterais, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                    ${renderizarListaPorPosicao('ZAG', grupos.zagueiros, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                    ${renderizarListaPorPosicao('MEI', grupos.meias, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                    ${renderizarListaPorPosicao('ATA', grupos.atacantes, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                    ${renderizarListaPorPosicao('TEC', grupos.tecnicos, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                </div>
                <div class="campinho-escalacao-divisoria"></div>
                ${reservas.length > 0
                    ? renderizarReservas(reservas, escalacao.capitao_id, escalacao.reserva_luxo_id)
                    : `<div class="campinho-lineup-section campinho-lineup-banco">
                        <div class="campinho-lineup-section-title">
                            <span class="material-icons campinho-lineup-section-icon" style="color:var(--app-pos-tec);">event_seat</span>
                            <span>Banco de Reservas</span>
                            <span class="campinho-lineup-section-count">(0)</span>
                        </div>
                        <div class="campinho-tabela-jogador reserva-bg" style="justify-content:center;color:rgba(255,255,255,0.3);font-size:12px;">
                            Sem reservas nesta rodada
                        </div>
                    </div>`
                }
            </section>

            <!-- FOOTER: Pontos totais + Escalados -->
            <div class="campinho-field-footer">
                <div class="campinho-points">
                    <span>Pontos totais</span>
                    <strong>${_truncar(pontosTotais)}</strong>
                </div>
                <div class="campinho-counter">
                    <span>Escalados</span>
                    <strong>${totalEscalados}/12</strong>
                </div>
            </div>

            ${confronto ? `
                <div class="campinho-confronto-card">
                    <div class="campinho-confronto-header">
                        <span class="material-icons">${confronto.tipo === 'mata-mata' ? 'sports_kabaddi' : 'leaderboard'}</span>
                        <span>${confronto.tipo === 'mata-mata' ? `Mata-Mata - ${esc(confronto.fase) || ''}` : 'Pontos Corridos'}</span>
                    </div>
                    <div class="campinho-confronto-placar">
                        <div class="campinho-confronto-time">
                            <p class="nome">Você</p>
                            <p class="pontos">${_truncar(confronto.placar?.meu || pontosTotais)}</p>
                        </div>
                        <span class="campinho-confronto-vs">VS</span>
                        <div class="campinho-confronto-time">
                            <p class="nome">${esc(confronto.adversario?.nome) || 'Adversário'}</p>
                            <p class="pontos">${_truncar(confronto.placar?.adversario || 0)}</p>
                        </div>
                    </div>
                </div>

                    ${temAdversario ? `
                        <div class="campinho-header campinho-adversario-header">
                            <div class="campinho-header-info">
                                <h2 class="campinho-adversario-nome">${esc(adversario.nome_cartoleiro || confronto.adversario?.nome) || 'Adversário'}</h2>
                                <p class="rodada">Escalação</p>
                            </div>
                            <div class="campinho-header-pontos">
                                <p class="valor campinho-adversario-pontos">${_truncar(adversario.pontos || calcularPontosTotais(adversario))}</p>
                                <p class="label">Pontos</p>
                            </div>
                        </div>

                        ${renderizarCampo(gruposAdversario || agruparTitulares(adversario.titulares || adversario.atletas || []), adversario.capitao_id, adversario.reserva_luxo_id, 'adversario', true)}
                    ` : ''}
                ` : ''}
            </div>
        `;
    }

function agruparTitulares(atletas) {
    const lista = Array.isArray(atletas) ? atletas : [];
    const groups = {
        goleiros: [],
        laterais: [],
        zagueiros: [],
        meias: [],
        atacantes: [],
        tecnicos: [],
        defensores: []
    };

    lista.filter(a => !a.is_reserva).forEach((atleta) => {
        const pos = Number(atleta.posicao_id ?? atleta.posicaoId ?? atleta.posicao);
        if (pos === 1) groups.goleiros.push(atleta);
        else if (pos === 2) groups.laterais.push(atleta);
        else if (pos === 3) groups.zagueiros.push(atleta);
        else if (pos === 4) groups.meias.push(atleta);
        else if (pos === 5) groups.atacantes.push(atleta);
        else if (pos === 6) groups.tecnicos.push(atleta);
    });

    groups.defensores = [...groups.laterais, ...groups.zagueiros];
    return groups;
}

function formatarCartoletas(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 'C$ 0.00';
    return `C$ ${numero.toFixed(2)}`;
}

function renderizarListaPorPosicao(label, atletas, capitaoId, reservaLuxoId) {
    if (!Array.isArray(atletas) || atletas.length === 0) return '';
    // Buscar ícone da posição pelo label
    const posEntry = Object.values(POSICOES).find(p => p.abrev === label);
    const icone = posEntry?.icone || 'person';
    return `
        <div class="campinho-lineup-section">
            <div class="campinho-lineup-section-title">
                <span class="material-icons campinho-lineup-section-icon">${icone}</span>
                <span>${label}</span>
                <span class="campinho-lineup-section-count">(${atletas.length})</span>
            </div>
            <div class="campinho-lineup-section-body">
                ${atletas.map(a => renderizarLinhaLista(a, capitaoId, reservaLuxoId, false)).join('')}
            </div>
        </div>
    `;
}

function renderizarLinhaLista(atleta, capitaoId, reservaLuxoId, isReserva = false) {
    if (!atleta) return '';
    const atletaId = Number(atleta.atleta_id ?? atleta.atletaId ?? atleta.id);
    const posInfo = POSICOES[atleta.posicao_id ?? atleta.posicaoId ?? atleta.posicao] || { nome: 'Outros', abrev: '?', cor: 'def' };
    const nome = atleta.apelido || atleta.nome || 'Jogador';
    const clubeId = atleta.clube_id || atleta.clubeId || 'default';
    const isCapitao = Number(capitaoId) && atletaId === Number(capitaoId);
    const isReservaLuxo = Number(reservaLuxoId) && atletaId === Number(reservaLuxoId);

    // Pontos com multiplicadores
    let pontos = parseFloat(atleta.pontos_atual ?? atleta.pontos_num ?? (atleta.pontos || 0));
    let pontosExibir = pontos;
    let multiplicador = '';
    let infoExtra = '';
    if (isCapitao) {
        pontosExibir = pontos * 2;
        multiplicador = '2x';
        infoExtra = ' - Capitão (2x)';
    } else if (isReservaLuxo && pontos !== 0) {
        pontosExibir = pontos * 1.5;
        multiplicador = '1.5x';
        infoExtra = ' - Luxo (1.5x)';
    }

    const classePontos = pontosExibir > 0 ? 'positivo' : pontosExibir < 0 ? 'negativo' : 'neutro';
    const classeCard = isCapitao ? 'capitao' : isReservaLuxo ? 'luxo' : '';
    const classeReserva = isReserva ? 'reserva-bg' : '';
    const classeNegativo = pontosExibir < 0 ? 'negativo-bg' : '';

    // Badge no escudo
    let badgeHtml = '';
    if (isCapitao) {
        badgeHtml = '<div class="campinho-tabela-badge badge-c"><span>C</span></div>';
    } else if (isReservaLuxo) {
        badgeHtml = '<div class="campinho-tabela-badge badge-l"><span>L</span></div>';
    }

    // Multiplicador
    const multiplicadorHtml = multiplicador && pontos !== 0
        ? `<span class="campinho-tabela-multiplicador ${isCapitao ? 'cap' : 'lux'}">(${pontos.toFixed(2)} x${multiplicador.replace('x','')})</span>`
        : '';

    return `
        <div class="campinho-tabela-jogador ${classeCard} ${classeReserva} ${classeNegativo}">
            <div class="campinho-tabela-escudo">
                <img src="/escudos/${clubeId}.png" alt="${esc(nome)}" onerror="this.src='/escudos/default.png'">
                ${badgeHtml}
            </div>
            <div class="campinho-tabela-info">
                <span class="campinho-tabela-nome">${esc(nome)}</span>
                <span class="campinho-tabela-pos">${posInfo.abrev}${infoExtra}</span>
            </div>
            <div class="campinho-tabela-pontos">
                <span class="campinho-tabela-pontos-valor ${classePontos}">${pontosExibir.toFixed(2)}</span>
                ${multiplicadorHtml}
            </div>
        </div>
    `;
}

function renderizarReservas(reservas, capitaoId, reservaLuxoId) {
    if (!Array.isArray(reservas) || reservas.length === 0) return '';
    return `
        <div class="campinho-lineup-section campinho-lineup-banco">
            <div class="campinho-lineup-section-title">
                <span class="material-icons campinho-lineup-section-icon" style="color:var(--app-pos-tec);">event_seat</span>
                <span>Banco de Reservas</span>
                <span class="campinho-lineup-section-count">(${reservas.length})</span>
            </div>
            <div class="campinho-lineup-section-body">
                ${reservas.map(a => renderizarLinhaLista(a, capitaoId, reservaLuxoId, true)).join('')}
            </div>
        </div>
    `;
}

function renderizarCampo(grupos, capitaoId, reservaLuxoId, id, isAdversario = false) {
    const gols = grupos?.goleiros || [];
    const defensoresCampo = grupos?.defensores?.length ? grupos.defensores : [...(grupos?.laterais || []), ...(grupos?.zagueiros || [])];
    const meias = grupos?.meias || [];
    const atacantes = grupos?.atacantes || [];
    const tecnicos = grupos?.tecnicos || [];

    const temJogadores = gols.length || defensoresCampo.length || meias.length || atacantes.length || tecnicos.length;
    if (!temJogadores) {
        return '<div class="campinho-empty"><p>Sem dados de escalação</p></div>';
    }

    const classeAdversario = isAdversario ? 'adversario' : '';

    return `
        <div id="campinho-${id}" class="campinho-field ${classeAdversario}">
            <div class="campinho-gol-area"></div>
            <div class="campinho-linha" style="margin-top: 60px;">
                ${gols.map(a => renderizarJogador(a, capitaoId, reservaLuxoId)).join('')}
            </div>
            <div class="campinho-linha">
                ${defensoresCampo.map(a => renderizarJogador(a, capitaoId, reservaLuxoId)).join('')}
            </div>
            <div class="campinho-linha">
                ${meias.map(a => renderizarJogador(a, capitaoId, reservaLuxoId)).join('')}
            </div>
            <div class="campinho-linha">
                ${atacantes.map(a => renderizarJogador(a, capitaoId, reservaLuxoId)).join('')}
            </div>
            <div class="campinho-linha" style="margin-bottom: 10px;">
                ${tecnicos.map(a => renderizarJogador(a, capitaoId, reservaLuxoId)).join('')}
            </div>
        </div>
    `;
}

function renderizarJogador(atleta, capitaoId, reservaLuxoId) {
    const nome = atleta.apelido || atleta.nome || 'Jogador';
    const nomeAbrev = nome.length > 8 ? nome.substring(0, 7) + '.' : nome;
    const posicaoId = atleta.posicao_id || atleta.posicaoId || atleta.posicao || 0;
    const posicao = POSICOES[posicaoId] || { nome: 'Outros', abrev: '?', cor: 'def' };
    const clubeId = atleta.clube_id || atleta.clubeId || 'default';
    const atletaId = Number(atleta.atleta_id ?? atleta.atletaId ?? atleta.id);

    // Pontuação
    let pontos = parseFloat(atleta.pontos_atual ?? atleta.pontos_num ?? (atleta.pontos || 0));
    const isCapitao = Number(capitaoId) && atletaId === Number(capitaoId);
    const isReservaLuxo = Number(reservaLuxoId) && atletaId === Number(reservaLuxoId);

    // Multiplicadores
    let pontosExibir = pontos;
    if (isCapitao) pontosExibir = pontos * 2;
    else if (isReservaLuxo && pontos !== 0) pontosExibir = pontos * 1.5;

    // Classes especiais
    const isMito = pontos > MITO_THRESHOLD;
    const isMico = pontos < MICO_THRESHOLD;
    const isNegativo = pontosExibir < 0; // Qualquer pontuação negativa
    const classePontos = pontosExibir > 0 ? 'positivo' : pontosExibir < 0 ? 'negativo' : 'neutro';

    let classes = ['campinho-jogador'];
    if (isCapitao) classes.push('is-capitao');
    if (isReservaLuxo) classes.push('is-luxo');
    if (isMito) classes.push('is-mito');
    if (isMico) classes.push('is-mico');
    if (isNegativo) classes.push('is-negativo');

    // Badge de capitão ou reserva luxo
    let badgeHtml = '';
    if (isCapitao) {
        badgeHtml = '<div class="campinho-jogador-badge-c"><span>C</span></div>';
    } else if (isReservaLuxo) {
        badgeHtml = '<div class="campinho-jogador-badge-l"><span>L</span></div>';
    }

    return `
        <div class="${classes.join(' ')}">
            <div class="campinho-jogador-avatar pos-${posicao.cor}">
                <img src="/escudos/${clubeId}.png"
                     onerror="this.src='/escudos/default.png'"
                     alt="${esc(nome)}">
                ${badgeHtml}
                <span class="campinho-jogador-pontos ${classePontos}">${pontosExibir.toFixed(1)}</span>
            </div>
            <span class="campinho-jogador-nome">${esc(nomeAbrev)}</span>
            <span class="campinho-jogador-pos">${posicao.abrev}</span>
        </div>
    `;
}


// Expor globalmente
window.inicializarCampinhoParticipante = inicializarCampinhoParticipante;

if (window.Log) Log.info("PARTICIPANTE-CAMPINHO", "✅ Módulo v2.0 carregado (Premium Edition)");

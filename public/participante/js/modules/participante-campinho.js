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
    1: { nome: 'Goleiro', abrev: 'GOL', cor: 'gol' },
    2: { nome: 'Lateral', abrev: 'LAT', cor: 'def' },
    3: { nome: 'Zagueiro', abrev: 'ZAG', cor: 'def' },
    4: { nome: 'Meia', abrev: 'MEI', cor: 'mei' },
    5: { nome: 'Atacante', abrev: 'ATA', cor: 'ata' },
    6: { nome: 'Técnico', abrev: 'TEC', cor: 'tec' }
};

// Thresholds para mito/mico
const MITO_THRESHOLD = 12;  // > 12 pontos = mito
const MICO_THRESHOLD = -3;  // < -3 pontos = mico

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
        const rodadaAtual = statusMercado?.rodada_atual || 1;

        const [escalacao, confrontos] = await Promise.all([
            buscarEscalacaoCompleta(ligaId, timeId, rodadaAtual),
            buscarConfrontos(ligaId, timeId)
        ]);

        dadosEscalacao = escalacao;
        confrontoAtual = confrontos;

        // Verificar se mercado esta fechado (mostra escalacao)
        const mercadoFechado = statusMercado?.status_mercado !== 1;

        if (!mercadoFechado) {
            container.innerHTML = renderizarAvisoMercadoAberto(statusMercado);
            return;
        }

        if (!escalacao || (!escalacao.atletas?.length && !escalacao.titulares?.length)) {
            container.innerHTML = renderizarSemEscalacao();
            return;
        }

        // Buscar dados do adversario se tiver confronto
        if (confrontos?.adversario?.timeId) {
            dadosAdversario = await buscarEscalacaoCompleta(ligaId, confrontos.adversario.timeId);
        }

        // Renderizar campinho completo
        container.innerHTML = renderizarCampinhoCompleto(escalacao, dadosAdversario, confrontos);

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-CAMPINHO", "❌ Erro:", error);
        container.innerHTML = renderizarErro(error.message);
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
            return {
                timeId,
                rodada: rodadaAtual,
                atletas: data.atletas || [],
                titulares: data.titulares || data.atletas || [],
                reservas: data.reservas || [],
                capitao_id: data.capitao_id,
                reserva_luxo_id: data.reserva_luxo_id,
                pontos: data.pontos || calcularPontosTotais(data),
                patrimonio: data.patrimonio,
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
        const titulares = atletas.filter(a => a.status_id !== 2);
        const reservas = atletas.filter(a => a.status_id === 2);

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
    const atletasNormalizados = normalizarAtletas(rawJson, atletasPontuados);
    const titulares = atletasNormalizados.filter(a => Number(a.status_id) !== 2);
    const reservas = atletasNormalizados.filter(a => Number(a.status_id) === 2);
    const capitainId = rawJson.capitao_id ?? rawJson.capitaoId ?? rawJson.capitao;
    const reservaLuxoId = rawJson.reserva_luxo_id ?? rawJson.reservaLuxoId ?? rawJson.reserva_luxo;

    return {
        timeId,
        rodada,
        atletas: atletasNormalizados,
        titulares,
        reservas,
        capitao_id: capitainId,
        reserva_luxo_id: reservaLuxoId,
        pontos: rawJson.pontos ?? calcularPontosTotais({ titulares, capitao_id: capitainId, reserva_luxo_id: reservaLuxoId }),
        patrimonio: rawJson.patrimonio,
        nome: rawJson.nome ?? rawJson.time?.nome ?? rawJson.nome_cartoleiro ?? 'Sua Escalação',
        nome_cartoleiro: rawJson.nome_cartoleiro ?? rawJson.time?.nome_cartoleiro ?? rawJson.cartoleiro_nome ?? 'Cartoleiro'
    };
}

function normalizarAtletas(rawJson, atletasPontuados) {
    const atletasPayload = rawJson?.atletas || rawJson?.atletas_obj || {};
    const lista = Array.isArray(atletasPayload) ? atletasPayload : Object.values(atletasPayload || {});
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
            <p>${mensagem || 'Não foi possível carregar a escalação'}</p>
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

function renderizarAvisoMercadoAberto(status) {
    return `
        <div class="campinho-empty">
            <span class="material-icons" style="color: #22c55e;">storefront</span>
            <h3>Mercado Aberto</h3>
            <p>A escalação será exibida após o fechamento do mercado</p>
            ${status?.rodada_atual ? `<p style="margin-top: 8px; font-size: 12px; opacity: 0.5;">Rodada ${status.rodada_atual}</p>` : ''}
        </div>
    `;
}

function renderizarCampinhoCompleto(escalacao, adversario, confronto) {
    const temAdversario = adversario && (adversario.atletas?.length > 0 || adversario.titulares?.length > 0);
    const titulares = escalacao.titulares || escalacao.atletas || [];
    const reservas = escalacao.reservas || [];
    const pontosTotais = escalacao.pontos || calcularPontosTotais(escalacao);
    const grupos = agruparTitulares(titulares);
    const gruposAdversario = temAdversario ? agruparTitulares(adversario.titulares || adversario.atletas || []) : null;
    const formacao = `${grupos.defensores.length || 0}-${grupos.meias.length || 0}-${grupos.atacantes.length || 0}`;
    const patrimonio = Number(escalacao.patrimonio ?? escalacao.patrimonio_total ?? 0) || 0;
    const saldo = Number(escalacao.saldo ?? escalacao.saldo_total ?? 0) || 0;
    const rodadaLabel = escalacao.rodada ?? '--';

    return `
        <div class="campinho-wrapper campinho-screen">
            <header class="campinho-screen-header">
                <div class="campinho-title-block">
                    <p class="campinho-title-label">Escalação</p>
                    <div class="campinho-title-row">
                        <h1>${escalacao.nome_cartoleiro || 'Sua Escalação'}</h1>
                        <span class="campinho-formation">${formacao}</span>
                    </div>
                </div>
                <div class="campinho-header-actions">
                    <div class="campinho-market-group">
                        <span class="campinho-market-pill">Mercado Fechado</span>
                        <span class="campinho-market-rodada">Rodada ${rodadaLabel}</span>
                    </div>
                    <div class="campinho-header-patrimonio">
                        <p>Meu Time</p>
                        <strong>${formatarCartoletas(patrimonio)}</strong>
                    </div>
                    <div class="campinho-header-saldo">
                        <p>Saldo</p>
                        <strong>${formatarCartoletas(saldo)}</strong>
                    </div>
                </div>
            </header>

            <div class="campinho-screen-body">
                <section class="campinho-field-panel">
                    <div class="campinho-field-wrapper">
                        ${renderizarCampo(grupos, escalacao.capitao_id, escalacao.reserva_luxo_id, 'meu-time')}
                    </div>
                    <div class="campinho-field-footer">
                        <div class="campinho-points">
                            <span>Pontos totais</span>
                            <strong>${pontosTotais.toFixed(2)}</strong>
                        </div>
                        ${renderizarLegenda()}
                    </div>
                </section>
                <aside class="campinho-lineup-panel">
                    <div class="campinho-lineup-card">
                        <div class="campinho-lineup-header">
                            <div>
                                <p class="campinho-lineup-label">Meu Campinho</p>
                                <h3>Rodada ${rodadaLabel}</h3>
                            </div>
                            <div class="campinho-lineup-balance">${formatarCartoletas(patrimonio)}</div>
                        </div>
                        <div class="campinho-lineup-body">
                            ${renderizarListaPorPosicao('GOL', grupos.goleiros, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                            ${renderizarListaPorPosicao('LAT', grupos.laterais, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                            ${renderizarListaPorPosicao('ZAG', grupos.zagueiros, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                            ${renderizarListaPorPosicao('MEI', grupos.meias, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                            ${renderizarListaPorPosicao('ATA', grupos.atacantes, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                            ${renderizarListaPorPosicao('TEC', grupos.tecnicos, escalacao.capitao_id, escalacao.reserva_luxo_id)}
                            ${reservas.length > 0 ? renderizarReservas(reservas, escalacao.capitao_id, escalacao.reserva_luxo_id) : ''}
                        </div>
                    </div>
                </aside>
            </div>

            ${confronto ? `
                <div class="campinho-confronto-card">
                    <div class="campinho-confronto-header">
                        <span class="material-icons">${confronto.tipo === 'mata-mata' ? 'sports_kabaddi' : 'leaderboard'}</span>
                        <span>${confronto.tipo === 'mata-mata' ? `Mata-Mata - ${confronto.fase || ''}` : 'Pontos Corridos'}</span>
                    </div>
                    <div class="campinho-confronto-placar">
                        <div class="campinho-confronto-time">
                            <p class="nome">Você</p>
                            <p class="pontos">${(confronto.placar?.meu || pontosTotais).toFixed(2)}</p>
                        </div>
                        <span class="campinho-confronto-vs">VS</span>
                        <div class="campinho-confronto-time">
                            <p class="nome">${confronto.adversario?.nome || 'Adversário'}</p>
                            <p class="pontos">${(confronto.placar?.adversario || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                    ${temAdversario ? `
                        <div class="campinho-header campinho-adversario-header">
                            <div class="campinho-header-info">
                                <h2 style="color: #f87171;">${adversario.nome_cartoleiro || confronto.adversario?.nome || 'Adversário'}</h2>
                                <p class="rodada">Escalação</p>
                            </div>
                            <div class="campinho-header-pontos">
                                <p class="valor" style="color: #f87171;">${(adversario.pontos || calcularPontosTotais(adversario)).toFixed(2)}</p>
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

    lista.filter(a => Number(a.status_id) !== 2).forEach((atleta) => {
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
    return `
        <div class="campinho-lineup-section">
            <div class="campinho-lineup-section-title">
                <span>${label}</span>
                <span class="campinho-lineup-section-count">(${atletas.length})</span>
            </div>
            <div class="campinho-lineup-section-body">
                ${atletas.map(a => renderizarLinhaLista(a, capitaoId, reservaLuxoId)).join('')}
            </div>
        </div>
    `;
}

function renderizarLinhaLista(atleta, capitaoId, reservaLuxoId) {
    if (!atleta) return '';
    const atletaId = Number(atleta.atleta_id ?? atleta.atletaId ?? atleta.id);
    const posAbrev = POSICOES[atleta.posicao_id ?? atleta.posicaoId ?? atleta.posicao]?.abrev || '---';
    const nome = atleta.apelido || atleta.nome || 'Jogador';
    const nomeAbrev = nome.length > 17 ? `${nome.slice(0, 16)}.` : nome;
    const isCapitao = Number(capitaoId) && atletaId === Number(capitaoId);
    const isReservaLuxo = Number(reservaLuxoId) && atletaId === Number(reservaLuxoId);
    const badges = [];
    if (isCapitao) badges.push('<span class="campinho-lineup-player-badge captain">C</span>');
    if (isReservaLuxo) badges.push('<span class="campinho-lineup-player-badge luxo">L</span>');

    return `
        <div class="campinho-lineup-player ${isCapitao ? 'capitao' : ''} ${isReservaLuxo ? 'reserva' : ''}">
            <div class="campinho-lineup-player-info">
                <span class="pos-label">${posAbrev}</span>
                <span class="lineup-player-name">${nomeAbrev}</span>
                ${badges.length ? `<div class="campinho-lineup-player-badges">${badges.join('')}</div>` : ''}
            </div>
            <span class="lineup-player-price">${formatarCartoletas(atleta.preco)}</span>
        </div>
    `;
}

function renderizarReservas(reservas, capitaoId, reservaLuxoId) {
    if (!Array.isArray(reservas) || reservas.length === 0) return '';
    return `
        <div class="campinho-lineup-section campinho-lineup-banco">
            <div class="campinho-lineup-section-title">
                <span>Banco de Reservas</span>
                <span class="campinho-lineup-section-count">(${reservas.length})</span>
            </div>
            <div class="campinho-lineup-section-body">
                ${reservas.map(a => renderizarLinhaLista(a, capitaoId, reservaLuxoId)).join('')}
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
    const atletaId = atleta.atleta_id || atleta.atletaId || atleta.id;

    // Pontuação
    let pontos = parseFloat(atleta.pontos_atual ?? atleta.pontos_num ?? (atleta.pontos || 0));
    const isCapitao = atletaId === capitaoId;
    const isReservaLuxo = atletaId === reservaLuxoId;

    // Multiplicadores
    let pontosExibir = pontos;
    if (isCapitao) pontosExibir = pontos * 2;
    else if (isReservaLuxo && pontos !== 0) pontosExibir = pontos * 1.5;

    // Classes especiais
    const isMito = pontos > MITO_THRESHOLD;
    const isMico = pontos < MICO_THRESHOLD;
    const classePontos = pontosExibir > 0 ? 'positivo' : pontosExibir < 0 ? 'negativo' : 'neutro';

    let classes = ['campinho-jogador'];
    if (isCapitao) classes.push('is-capitao');
    if (isReservaLuxo) classes.push('is-luxo');
    if (isMito) classes.push('is-mito');
    if (isMico) classes.push('is-mico');

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
                     alt="${nome}">
                ${badgeHtml}
                <span class="campinho-jogador-pontos ${classePontos}">${pontosExibir.toFixed(1)}</span>
            </div>
            <span class="campinho-jogador-nome">${nomeAbrev}</span>
            <span class="campinho-jogador-pos">${posicao.abrev}</span>
        </div>
    `;
}

function renderizarLegenda() {
    return `
        <div class="campinho-legenda">
            <div class="campinho-legenda-item">
                <span class="dot gol"></span>
                <span>GOL</span>
            </div>
            <div class="campinho-legenda-item">
                <span class="dot def"></span>
                <span>DEF</span>
            </div>
            <div class="campinho-legenda-item">
                <span class="dot mei"></span>
                <span>MEI</span>
            </div>
            <div class="campinho-legenda-item">
                <span class="dot ata"></span>
                <span>ATA</span>
            </div>
            <div class="campinho-legenda-item">
                <span class="dot tec"></span>
                <span>TEC</span>
            </div>
        </div>
    `;
}

// Expor globalmente
window.inicializarCampinhoParticipante = inicializarCampinhoParticipante;

if (window.Log) Log.info("PARTICIPANTE-CAMPINHO", "✅ Módulo v2.0 carregado (Premium Edition)");

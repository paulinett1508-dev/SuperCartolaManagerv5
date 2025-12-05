// =====================================================================
// PARTICIPANTE-RODADA-PARCIAL.JS - v1.2
// Exibe ranking parcial da rodada em andamento
// =====================================================================

console.log("[PARCIAIS] 📊 Carregando módulo v1.2...");

// Estado do módulo
let estadoParciais = {
    ligaId: null,
    timeId: null,
    rodadaAtual: null,
    mercadoStatus: null,
    timesLiga: [],
    dadosParciais: [],
    isCarregando: false,
    ultimaAtualizacao: null,
};

// =====================================================================
// INICIALIZAÇÃO - Chamado pelo participante-rodadas.js
// =====================================================================
export async function inicializarParciais(ligaId, timeId) {
    console.log("[PARCIAIS] 🚀 Inicializando...", { ligaId, timeId });

    estadoParciais.ligaId = ligaId;
    estadoParciais.timeId = timeId;

    try {
        // 1. Buscar status do mercado
        const status = await buscarStatusMercado();
        if (!status) {
            console.warn(
                "[PARCIAIS] ⚠️ Não foi possível obter status do mercado",
            );
            return { disponivel: false, motivo: "status_indisponivel" };
        }

        estadoParciais.rodadaAtual = status.rodada_atual;
        estadoParciais.mercadoStatus = status;

        // 2. Verificar se há rodada em andamento
        // status_mercado: 1 = aberto, 2 = fechado (jogos em andamento ou finalizados antes de abrir)
        // bola_rolando: true = jogos acontecendo agora
        const rodadaEmAndamento =
            status.status_mercado === 2 || status.bola_rolando;

        if (!rodadaEmAndamento) {
            console.log(
                "[PARCIAIS] ℹ️ Mercado aberto, sem parciais disponíveis",
            );
            return {
                disponivel: false,
                motivo: "mercado_aberto",
                rodada: status.rodada_atual,
            };
        }

        // 3. Buscar times da liga
        const times = await buscarTimesLiga(ligaId);
        if (!times || times.length === 0) {
            console.warn("[PARCIAIS] ⚠️ Nenhum time encontrado na liga");
            return { disponivel: false, motivo: "sem_times" };
        }

        estadoParciais.timesLiga = times;

        console.log(
            `[PARCIAIS] ✅ Pronto: Rodada ${status.rodada_atual}, ${times.length} times`,
        );

        return {
            disponivel: true,
            rodada: status.rodada_atual,
            totalTimes: times.length,
            bolaRolando: status.bola_rolando,
        };
    } catch (error) {
        console.error("[PARCIAIS] ❌ Erro na inicialização:", error);
        return { disponivel: false, motivo: "erro", erro: error.message };
    }
}

// =====================================================================
// BUSCAR STATUS DO MERCADO
// =====================================================================
async function buscarStatusMercado() {
    try {
        const response = await fetch("/api/cartola/mercado/status");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("[PARCIAIS] Erro ao buscar status:", error);
        return null;
    }
}

// =====================================================================
// BUSCAR TIMES DA LIGA
// =====================================================================
async function buscarTimesLiga(ligaId) {
    try {
        const response = await fetch(`/api/ligas/${ligaId}/times`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // Normalizar estrutura (pode vir como array ou objeto com propriedade times)
        return Array.isArray(data)
            ? data
            : data.times || data.participantes || [];
    } catch (error) {
        console.error("[PARCIAIS] Erro ao buscar times:", error);
        return [];
    }
}

// =====================================================================
// CARREGAR PARCIAIS - Busca pontuação de cada time
// =====================================================================
export async function carregarParciais() {
    if (estadoParciais.isCarregando) {
        console.log("[PARCIAIS] ⏳ Já está carregando...");
        return null;
    }

    if (!estadoParciais.timesLiga.length) {
        console.warn("[PARCIAIS] ⚠️ Sem times para buscar");
        return null;
    }

    estadoParciais.isCarregando = true;
    console.log(
        `[PARCIAIS] 🔄 Buscando parciais de ${estadoParciais.timesLiga.length} times...`,
    );

    const rodada = estadoParciais.rodadaAtual;
    const resultados = [];

    // Buscar em paralelo com limite de concorrência
    const BATCH_SIZE = 5;
    const times = estadoParciais.timesLiga;

    for (let i = 0; i < times.length; i += BATCH_SIZE) {
        const batch = times.slice(i, i + BATCH_SIZE);
        const promises = batch.map((time) => buscarPontuacaoTime(time, rodada));
        const batchResults = await Promise.all(promises);
        resultados.push(...batchResults.filter(Boolean));
    }

    // Ordenar por pontuação (maior primeiro)
    resultados.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

    // Adicionar posição
    resultados.forEach((r, idx) => {
        r.posicao = idx + 1;
    });

    estadoParciais.dadosParciais = resultados;
    estadoParciais.ultimaAtualizacao = new Date();
    estadoParciais.isCarregando = false;

    console.log(`[PARCIAIS] ✅ ${resultados.length} times carregados`);

    return {
        rodada,
        participantes: resultados,
        totalTimes: resultados.length,
        atualizadoEm: estadoParciais.ultimaAtualizacao,
    };
}

// =====================================================================
// BUSCAR PONTUAÇÃO DE UM TIME
// =====================================================================
async function buscarPontuacaoTime(time, rodada) {
    const timeId = time.time_id || time.timeId || time.id;

    if (!timeId) {
        console.warn("[PARCIAIS] Time sem ID:", time);
        return null;
    }

    try {
        // Usar rota do cartola-proxy montada em /api/cartola (tem /time/id/:timeId/:rodada)
        let response = await fetch(`/api/cartola/time/id/${timeId}/${rodada}`);

        // Se falhar, tentar a rota alternativa (tem /time/:id/:rodada sem o "id/" no meio)
        if (!response.ok) {
            response = await fetch(`/api/cartola/time/${timeId}/${rodada}`);
        }

        if (!response.ok) {
            // Time pode não ter escalado
            if (response.status === 404) {
                return {
                    timeId,
                    nome_time: time.nome_time || time.nome || "N/D",
                    nome_cartola: time.nome_cartola || time.cartoleiro || "N/D",
                    pontos: 0,
                    rodadaNaoJogada: true,
                };
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Estrutura do cartola-proxy: { time: {...}, pontos: X, atletas: [...] }
        return {
            timeId,
            nome_time: data.time?.nome || time.nome_time || time.nome || "N/D",
            nome_cartola: data.time?.nome_cartola || time.nome_cartola || "N/D",
            pontos: data.pontos || 0,
            pontos_parcial: data.pontos || 0,
            patrimonio: data.time?.patrimonio || 0,
            rodadaNaoJogada: !data.atletas || data.atletas.length === 0,
            escudo: data.time?.url_escudo_png || time.escudo || null,
        };
    } catch (error) {
        console.warn(
            `[PARCIAIS] Erro ao buscar time ${timeId}:`,
            error.message,
        );
        return {
            timeId,
            nome_time: time.nome_time || time.nome || "N/D",
            nome_cartola: time.nome_cartola || "N/D",
            pontos: 0,
            erro: true,
        };
    }
}

// =====================================================================
// OBTER DADOS ATUAIS (sem buscar novamente)
// =====================================================================
export function obterDadosParciais() {
    return {
        rodada: estadoParciais.rodadaAtual,
        participantes: estadoParciais.dadosParciais,
        totalTimes: estadoParciais.dadosParciais.length,
        atualizadoEm: estadoParciais.ultimaAtualizacao,
        meuTimeId: estadoParciais.timeId,
    };
}

// =====================================================================
// OBTER MINHA POSIÇÃO PARCIAL
// =====================================================================
export function obterMinhaPosicaoParcial() {
    const meuTimeId = estadoParciais.timeId;
    const dados = estadoParciais.dadosParciais;

    if (!meuTimeId || !dados.length) return null;

    const meuDado = dados.find((d) => String(d.timeId) === String(meuTimeId));

    if (!meuDado) return null;

    return {
        posicao: meuDado.posicao,
        pontos: meuDado.pontos,
        totalTimes: dados.length,
        isMito: meuDado.posicao === 1,
        isMico: meuDado.posicao === dados.length,
    };
}

// =====================================================================
// VERIFICAR SE PARCIAIS ESTÃO DISPONÍVEIS
// =====================================================================
export function parciaisDisponiveis() {
    return (
        estadoParciais.mercadoStatus?.status_mercado === 2 ||
        estadoParciais.mercadoStatus?.bola_rolando === true
    );
}

// =====================================================================
// OBTER RODADA ATUAL
// =====================================================================
export function obterRodadaAtual() {
    return estadoParciais.rodadaAtual;
}

// Expor no window para debug e compatibilidade
window.ParciaisModule = {
    inicializar: inicializarParciais,
    carregar: carregarParciais,
    obterDados: obterDadosParciais,
    obterMinhaPosicao: obterMinhaPosicaoParcial,
    disponivel: parciaisDisponiveis,
    rodadaAtual: obterRodadaAtual,
};

console.log("[PARCIAIS] ✅ Módulo v1.2 carregado");

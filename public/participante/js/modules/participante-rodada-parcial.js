// =====================================================================
// PARTICIPANTE-RODADA-PARCIAL.JS - v2.2
// ✅ v2.2: Inativos aparecem em TODAS as rodadas
// Exibe ranking parcial da rodada em andamento
// CÁLCULO REAL: Busca atletas pontuados e calcula pontuação (igual admin)
// =====================================================================

console.log("[PARCIAIS] 📊 Carregando módulo v2.2...");

// Estado do módulo
let estadoParciais = {
    ligaId: null,
    timeId: null,
    rodadaAtual: null,
    mercadoStatus: null,
    timesLiga: [],
    timesInativos: [],
    dadosParciais: [],
    dadosInativos: [],
    atletasPontuados: null,
    isCarregando: false,
    ultimaAtualizacao: null,
};

// =====================================================================
// INICIALIZAÇÃO - Chamado pelo participante-rodadas.js
// =====================================================================
export async function inicializarParciais(ligaId, timeId) {
    console.log("[PARCIAIS] 🚀 Inicializando v2.2...", { ligaId, timeId });

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

        // 4. Separar ativos e inativos
        const { ativos, inativos } = separarTimesAtivosInativos(times);
        estadoParciais.timesLiga = ativos;
        estadoParciais.timesInativos = inativos;

        console.log(
            `[PARCIAIS] ✅ Pronto: Rodada ${status.rodada_atual}, ${ativos.length} ativos, ${inativos.length} inativos`,
        );

        return {
            disponivel: true,
            rodada: status.rodada_atual,
            totalTimes: ativos.length,
            totalInativos: inativos.length,
            bolaRolando: status.bola_rolando,
        };
    } catch (error) {
        console.error("[PARCIAIS] ❌ Erro na inicialização:", error);
        return { disponivel: false, motivo: "erro", erro: error.message };
    }
}

// =====================================================================
// SEPARAR TIMES ATIVOS E INATIVOS
// =====================================================================
function separarTimesAtivosInativos(times) {
    const ativos = [];
    const inativos = [];

    times.forEach((time) => {
        const isAtivo = time.ativo !== false;

        if (isAtivo) {
            ativos.push(time);
        } else {
            inativos.push({
                ...time,
                rodada_desistencia: time.rodada_desistencia || null,
            });
        }
    });

    inativos.sort(
        (a, b) => (b.rodada_desistencia || 0) - (a.rodada_desistencia || 0),
    );

    return { ativos, inativos };
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

        const times = Array.isArray(data)
            ? data
            : data.times || data.participantes || [];

        console.log(`[PARCIAIS] 📋 Times da liga: ${times.length} total`);

        return times;
    } catch (error) {
        console.error("[PARCIAIS] Erro ao buscar times:", error);
        return [];
    }
}

// =====================================================================
// BUSCAR ATLETAS PONTUADOS (tempo real)
// =====================================================================
async function buscarAtletasPontuados() {
    try {
        const timestamp = Date.now();
        const response = await fetch(
            `/api/cartola/atletas/pontuados?_t=${timestamp}`,
            {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                },
            },
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (!data.atletas) {
            console.warn("[PARCIAIS] ⚠️ Sem atletas pontuados na resposta");
            return {};
        }

        console.log(
            `[PARCIAIS] 🔥 ${Object.keys(data.atletas).length} atletas pontuados`,
        );
        return data.atletas;
    } catch (error) {
        console.error("[PARCIAIS] Erro ao buscar atletas pontuados:", error);
        return {};
    }
}

// =====================================================================
// CARREGAR PARCIAIS - Busca e calcula pontuação real
// =====================================================================
export async function carregarParciais() {
    if (estadoParciais.isCarregando) {
        console.log("[PARCIAIS] ⏳ Já está carregando...");
        return null;
    }

    if (!estadoParciais.timesLiga.length) {
        console.warn("[PARCIAIS] ⚠️ Sem times ativos para buscar");
        return null;
    }

    estadoParciais.isCarregando = true;
    console.log(
        `[PARCIAIS] 🔄 Buscando parciais de ${estadoParciais.timesLiga.length} times ativos...`,
    );

    const rodada = estadoParciais.rodadaAtual;

    try {
        // ✅ PASSO 1: Buscar TODOS os atletas pontuados (uma única requisição)
        const atletasPontuados = await buscarAtletasPontuados();
        estadoParciais.atletasPontuados = atletasPontuados;

        if (Object.keys(atletasPontuados).length === 0) {
            console.warn("[PARCIAIS] ⚠️ Nenhum atleta pontuado ainda");
            estadoParciais.isCarregando = false;
            return {
                rodada,
                participantes: [],
                inativos: estadoParciais.dadosInativos,
                totalTimes: 0,
                totalInativos: estadoParciais.timesInativos.length,
                atualizadoEm: new Date(),
            };
        }

        // ✅ PASSO 2: Buscar escalação de cada time e calcular pontos
        const resultados = [];
        const BATCH_SIZE = 5;
        const times = estadoParciais.timesLiga;

        for (let i = 0; i < times.length; i += BATCH_SIZE) {
            const batch = times.slice(i, i + BATCH_SIZE);
            const promises = batch.map((time) =>
                buscarECalcularPontuacao(time, rodada, atletasPontuados),
            );

            const batchResults = await Promise.all(promises);
            resultados.push(...batchResults.filter((r) => r !== null));
        }

        // Ordenar por pontos
        resultados.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

        // Adicionar posição
        resultados.forEach((r, idx) => {
            r.posicao = idx + 1;
        });

        estadoParciais.dadosParciais = resultados;
        estadoParciais.ultimaAtualizacao = new Date();

        // ✅ v2.2: TODOS os inativos aparecem (sem filtro por rodada)
        estadoParciais.dadosInativos = estadoParciais.timesInativos.map(
            (time) => ({
                timeId: time.id || time.time_id,
                nome_time: time.nome_time || time.nome || "N/D",
                nome_cartola: time.nome_cartola || "N/D",
                escudo: time.url_escudo_png || time.escudo || null,
                ativo: false,
                rodada_desistencia: time.rodada_desistencia || null,
            }),
        );

        console.log(
            `[PARCIAIS] ✅ ${resultados.length} ativos, ${estadoParciais.dadosInativos.length} inativos`,
        );

        return {
            rodada,
            participantes: resultados,
            inativos: estadoParciais.dadosInativos,
            totalTimes: resultados.length,
            totalInativos: estadoParciais.dadosInativos.length,
            atualizadoEm: estadoParciais.ultimaAtualizacao,
        };
    } catch (error) {
        console.error("[PARCIAIS] ❌ Erro ao carregar parciais:", error);
        return null;
    } finally {
        estadoParciais.isCarregando = false;
    }
}

// =====================================================================
// BUSCAR ESCALAÇÃO E CALCULAR PONTUAÇÃO (mesma lógica do admin)
// =====================================================================
async function buscarECalcularPontuacao(time, rodada, atletasPontuados) {
    const timeId = time.id || time.time_id || time.timeId;

    if (!timeId) {
        console.warn("[PARCIAIS] Time sem ID:", time);
        return null;
    }

    try {
        const timestamp = Date.now();

        // Buscar escalação do time
        const response = await fetch(
            `/api/cartola/time/id/${timeId}/${rodada}?_t=${timestamp}`,
            {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                },
            },
        );

        if (!response.ok) {
            if (response.status === 404) {
                return {
                    timeId,
                    nome_time: time.nome_time || time.nome || "N/D",
                    nome_cartola: time.nome_cartola || time.cartoleiro || "N/D",
                    escudo: time.url_escudo_png || time.escudo || null,
                    pontos: 0,
                    rodadaNaoJogada: true,
                    ativo: true,
                };
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const dadosEscalacao = await response.json();

        // ✅ CALCULAR PONTUAÇÃO (igual ao admin)
        let pontos = 0;
        const posicoesQuePontuaram = new Set();

        // Somar pontos dos TITULARES
        if (dadosEscalacao.atletas && Array.isArray(dadosEscalacao.atletas)) {
            dadosEscalacao.atletas.forEach((atleta) => {
                const atletaPontuado = atletasPontuados[atleta.atleta_id];
                const pontuacao = atletaPontuado?.pontuacao || 0;
                const entrouEmCampo = atletaPontuado?.entrou_em_campo;

                // Verificar se atleta entrou em campo
                if (entrouEmCampo || pontuacao !== 0) {
                    posicoesQuePontuaram.add(atleta.posicao_id);
                }

                // Capitão pontua em dobro
                if (atleta.atleta_id === dadosEscalacao.capitao_id) {
                    pontos += pontuacao * 2;
                } else {
                    pontos += pontuacao;
                }
            });
        }

        // Somar pontos dos RESERVAS
        if (dadosEscalacao.reservas && Array.isArray(dadosEscalacao.reservas)) {
            dadosEscalacao.reservas.forEach((atleta) => {
                const atletaPontuado = atletasPontuados[atleta.atleta_id];
                const pontuacao = atletaPontuado?.pontuacao || 0;
                const entrouEmCampo = atletaPontuado?.entrou_em_campo;

                // Reserva de luxo pontua 1.5x se entrou em campo
                if (
                    atleta.atleta_id === dadosEscalacao.reserva_luxo_id &&
                    entrouEmCampo
                ) {
                    pontos += pontuacao * 1.5;
                }
                // Reserva comum substitui titular que não pontuou (só um por posição)
                else if (
                    !posicoesQuePontuaram.has(atleta.posicao_id) &&
                    entrouEmCampo
                ) {
                    pontos += pontuacao;
                    posicoesQuePontuaram.add(atleta.posicao_id);
                }
            });
        }

        // Extrair dados do time
        const nomeTime =
            dadosEscalacao.time?.nome || time.nome_time || time.nome || "N/D";
        const nomeCartola =
            dadosEscalacao.time?.nome_cartola || time.nome_cartola || "N/D";
        const escudo =
            dadosEscalacao.time?.url_escudo_png ||
            time.url_escudo_png ||
            time.escudo ||
            null;

        return {
            timeId,
            nome_time: nomeTime,
            nome_cartola: nomeCartola,
            escudo: escudo,
            pontos: pontos,
            pontos_parcial: pontos,
            patrimonio: dadosEscalacao.time?.patrimonio || 0,
            rodadaNaoJogada:
                !dadosEscalacao.atletas || dadosEscalacao.atletas.length === 0,
            ativo: true,
        };
    } catch (error) {
        console.warn(
            `[PARCIAIS] Erro ao calcular time ${timeId}:`,
            error.message,
        );
        return {
            timeId,
            nome_time: time.nome_time || time.nome || "N/D",
            nome_cartola: time.nome_cartola || "N/D",
            escudo: time.url_escudo_png || time.escudo || null,
            pontos: 0,
            erro: true,
            ativo: true,
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
        inativos: estadoParciais.dadosInativos,
        totalTimes: estadoParciais.dadosParciais.length,
        totalInativos: estadoParciais.dadosInativos.length,
        atualizadoEm: estadoParciais.ultimaAtualizacao,
        meuTimeId: estadoParciais.timeId,
    };
}

// =====================================================================
// OBTER TIMES INATIVOS
// =====================================================================
export function obterTimesInativos() {
    return estadoParciais.dadosInativos || [];
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
    obterInativos: obterTimesInativos,
    obterMinhaPosicao: obterMinhaPosicaoParcial,
    disponivel: parciaisDisponiveis,
    rodadaAtual: obterRodadaAtual,
};

console.log(
    "[PARCIAIS] ✅ Módulo v2.2 carregado (inativos em todas as rodadas)",
);

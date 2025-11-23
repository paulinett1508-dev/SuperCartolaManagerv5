// MATA-MATA ORQUESTRADOR - Versão Auto-Corretiva
// Responsável por: coordenação de chaves, carregamento dinâmico e persistência

import { edicoes, getFaseInfo, getLigaId } from "./mata-mata-config.js";
import * as UI from "./mata-mata-ui.js";

// Estado interno
let dadosEdicaoAtual = null;
let edicaoIdAtual = null;
let faseAtual = "primeira";

// ============================================================================
// 🧠 SISTEMA DE PERSISTÊNCIA (CACHE)
// ============================================================================

async function lerCacheMataMata(ligaId, edicaoId) {
    try {
        const ts = new Date().getTime();
        const response = await fetch(
            `/api/mata-mata/cache/${ligaId}/${edicaoId}?_=${ts}`,
        );

        if (!response.ok) return null;

        const data = await response.json();

        // 🛡️ VALIDAÇÃO DE INTEGRIDADE (NOVO)
        // Se o cache existir mas estiver vazio (sem jogos na primeira fase), descarta!
        if (data.cached && data.dados) {
            const temDadosValidos =
                data.dados["primeira"] &&
                Array.isArray(data.dados["primeira"]) &&
                data.dados["primeira"].length > 0;

            if (!temDadosValidos) {
                console.warn(
                    `[MATA-ORQUESTRADOR] ⚠️ Cache encontrado mas INVÁLIDO (Vazio). Forçando recálculo.`,
                );
                return null;
            }

            console.log(
                `[MATA-ORQUESTRADOR] 💾 Cache VÁLIDO encontrado para Edição ${edicaoId}`,
            );
            return data.dados;
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function salvarCacheMataMata(
    ligaId,
    edicaoId,
    rodadaAtual,
    dadosTorneio,
) {
    try {
        // Proteção para não salvar cache vazio
        if (
            !dadosTorneio["primeira"] ||
            dadosTorneio["primeira"].length === 0
        ) {
            console.warn(
                "[MATA-ORQUESTRADOR] 🛑 Tentativa de salvar cache vazio abortada.",
            );
            return;
        }

        await fetch(`/api/mata-mata/cache/${ligaId}/${edicaoId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                rodada: rodadaAtual,
                dados: dadosTorneio,
            }),
        });
        console.log(
            `[MATA-ORQUESTRADOR] 💾 Snapshot da Edição ${edicaoId} salvo com sucesso!`,
        );
    } catch (error) {
        console.warn("[MATA-ORQUESTRADOR] Falha silenciada ao salvar cache");
    }
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

export async function carregarMataMata() {
    console.log("[MATA-ORQUESTRADOR] Iniciando módulo...");

    const containerControles = document.getElementById("mata-mata-tabs");
    const ligaId = getLigaId();

    if (containerControles && ligaId) {
        UI.renderizarInterface(
            containerControles,
            ligaId,
            (novoId) => selecionarEdicao(novoId),
            (novaFase) => selecionarFase(novaFase),
        );
    }

    const edicaoAtiva =
        edicoes.find((e) => e.ativo) || edicoes[edicoes.length - 1];
    if (edicaoAtiva) {
        setTimeout(() => {
            document
                .querySelectorAll(".tab-edicao")
                .forEach((b) => b.classList.remove("active"));
            document
                .getElementById(`tab-edicao-${edicaoAtiva.id}`)
                ?.classList.add("active");
        }, 100);
        await selecionarEdicao(edicaoAtiva.id); // Mudado para selecionarEdicao para consistência
    }
}

async function selecionarEdicao(edicaoId) {
    console.log(`[MATA-ORQUESTRADOR] Selecionando Edição ${edicaoId}...`);
    edicaoIdAtual = edicaoId;

    const containerConteudo = document.getElementById("mata-mata-conteudo");
    if (containerConteudo) {
        containerConteudo.innerHTML =
            '<div class="loading-state"><div class="spinner"></div><p>Processando torneio...</p></div>';
    }

    const ligaId = getLigaId();

    try {
        let dados = await lerCacheMataMata(ligaId, edicaoId);

        if (!dados) {
            console.log(
                "[MATA-ORQUESTRADOR] ⚠️ Cache Miss ou Inválido. Iniciando cálculo...",
            );
            dados = await recalcularDadosEdicao(ligaId, edicaoId);
        }

        dadosEdicaoAtual = dados;
        faseAtual = determinarFaseInicial(dados);

        atualizarNavegacaoFases(faseAtual);
        renderizarFaseAtual();
    } catch (error) {
        console.error("[MATA-ORQUESTRADOR] Erro:", error);
        if (containerConteudo)
            containerConteudo.innerHTML = `<div class="erro-box">${error.message}</div>`;
    }
}

function selecionarFase(fase) {
    faseAtual = fase;
    atualizarNavegacaoFases(fase); // Atualiza visual dos botões
    renderizarFaseAtual();
}

function renderizarFaseAtual() {
    if (!dadosEdicaoAtual || !dadosEdicaoAtual[faseAtual]) {
        const container = document.getElementById("mata-mata-conteudo");
        if (container)
            container.innerHTML =
                '<div class="aviso-box">Fase não disponível ainda.</div>';
        return;
    }

    // Passa os dados para o UI renderizar
    UI.renderizarConfrontos(
        "mata-mata-conteudo",
        dadosEdicaoAtual[faseAtual],
        false,
    );
}

// ============================================================================
// LÓGICA DE CÁLCULO
// ============================================================================

async function recalcularDadosEdicao(ligaId, edicaoId) {
    // Importação Dinâmica das Dependências
    const {
        montarConfrontosFase,
        montarConfrontosPrimeiraFase,
        getPontosDaRodada,
        setRankingFunction,
    } = await import("./mata-mata-confrontos.js");
    const { getRankingRodadaEspecifica } = await import("../rodadas.js");

    // Injeta a função de ranking IMEDIATAMENTE
    if (setRankingFunction && getRankingRodadaEspecifica) {
        setRankingFunction(getRankingRodadaEspecifica);
    }

    const edicao = edicoes.find((e) => e.id === parseInt(edicaoId));
    if (!edicao) throw new Error("Edição não encontrada");

    // 1. Busca Ranking Base
    const rankingBase = await getRankingRodadaEspecifica(
        ligaId,
        edicao.rodadaDefinicao || 1,
    );

    // Validação crítica para não gerar cache vazio
    if (!rankingBase || rankingBase.length === 0) {
        throw new Error(
            `Ranking da rodada ${edicao.rodadaDefinicao} está vazio. Impossível montar chaves.`,
        );
    }

    const rankingTratado = garantir32Times(rankingBase);
    const dadosTorneio = {};

    // 2. Fase 1
    const pontosFase1 = await getPontosDaRodada(ligaId, edicao.rodadaInicial);
    const fase1 = montarConfrontosPrimeiraFase(rankingTratado, pontosFase1);
    dadosTorneio["primeira"] = fase1;

    // 3. Fases Seguintes
    let vencedoresAtuais = await extrairVencedores(fase1);

    const fases = [
        { chave: "oitavas", nome: "OITAVAS" },
        { chave: "quartas", nome: "QUARTAS" },
        { chave: "semis", nome: "SEMIS" },
        { chave: "final", nome: "FINAL" },
    ];

    for (const f of fases) {
        if (vencedoresAtuais.length < 2) break;

        const info = getFaseInfo(f.nome, edicao);
        const pontos = await getPontosDaRodada(ligaId, info.pontosRodada);

        const confrontos = montarConfrontosFase(
            vencedoresAtuais,
            pontos,
            info.numJogos,
        );
        dadosTorneio[f.chave] = confrontos;

        vencedoresAtuais = await extrairVencedores(confrontos);
    }

    // 4. Salvar Cache (apenas se válido)
    const status = await fetch("/api/cartola/mercado/status")
        .then((r) => r.json())
        .catch(() => ({ rodada_atual: 0 }));
    await salvarCacheMataMata(
        ligaId,
        edicaoId,
        status.rodada_atual,
        dadosTorneio,
    );

    return dadosTorneio;
}

// ============================================================================
// AUXILIARES
// ============================================================================

function garantir32Times(ranking) {
    const arr = Array.isArray(ranking) ? [...ranking] : [];
    while (arr.length < 32) {
        arr.push({
            timeId: `fake_${arr.length}`,
            nome_time: "A definir",
            escudo: "/escudos/placeholder.png",
        });
    }
    return arr;
}

async function extrairVencedores(confrontos) {
    const v = [];
    if (!confrontos) return v;

    confrontos.forEach((c) => {
        if (c.vencedorDeterminado === "A") v.push(c.timeA);
        else if (c.vencedorDeterminado === "B") v.push(c.timeB);
        else
            v.push({
                nome_time: "A definir",
                escudo: "/escudos/placeholder.png",
            });
    });
    return v;
}

function determinarFaseInicial(dados) {
    if (dados["final"]) return "final";
    if (dados["semis"]) return "semis";
    if (dados["quartas"]) return "quartas";
    if (dados["oitavas"]) return "oitavas";
    return "primeira";
}

function atualizarNavegacaoFases(faseAtiva) {
    document.querySelectorAll(".fase-btn").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.dataset.fase === faseAtiva) btn.classList.add("active");
    });

    const navContainer = document.getElementById("fase-nav-container");
    if (navContainer) navContainer.style.display = "flex";
}

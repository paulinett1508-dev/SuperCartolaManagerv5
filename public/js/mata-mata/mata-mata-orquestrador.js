// MATA-MATA ORQUESTRADOR - Cache de Alta Performance + UI Original
// Responsável por: coordenação de chaves, carregamento dinâmico e persistência

import { edicoes, getFaseInfo, getLigaId } from "./mata-mata-config.js";
import * as UI from "./mata-mata-ui.js"; // ✅ Volta a usar o UI original

// Estado interno para navegação
let dadosEdicaoAtual = null;
let edicaoIdAtual = null;
let faseAtual = "primeira";

// ============================================================================
// 🧠 SISTEMA DE PERSISTÊNCIA (CACHE) - MANTIDO
// ============================================================================

async function lerCacheMataMata(ligaId, edicaoId) {
    try {
        const ts = new Date().getTime();
        const response = await fetch(
            `/api/mata-mata/cache/${ligaId}/${edicaoId}?_=${ts}`,
        );

        if (!response.ok) return null;

        const data = await response.json();
        if (data.cached && data.dados) {
            console.log(
                `[MATA-ORQUESTRADOR] 💾 Cache encontrado para Edição ${edicaoId}`,
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

    // 1. Renderizar controles (Edições e Fases) usando o UI original
    // Usamos o 'mata-mata-tabs' para injetar os controles sem limpar o card inteiro
    const containerControles = document.getElementById("mata-mata-tabs");
    const ligaId = getLigaId();

    if (containerControles && ligaId) {
        UI.renderizarInterface(
            containerControles,
            ligaId,
            (novoId) => selecionarEdicao(novoId), // Callback troca edição
            (novaFase) => selecionarFase(novaFase), // Callback troca fase
        );
    }

    // 2. Carregar a edição ativa padrão
    const edicaoAtiva =
        edicoes.find((e) => e.ativo) || edicoes[edicoes.length - 1];
    if (edicaoAtiva) {
        // Atualiza visualmente o select/tabs do UI original se necessário
        // (A função renderizarInterface já deve lidar com o estado inicial, mas forçamos aqui)
        await selecionarEdicao(edicaoAtiva.id);
    }
}

// Função chamada ao trocar de edição
async function selecionarEdicao(edicaoId) {
    console.log(`[MATA-ORQUESTRADOR] Selecionando Edição ${edicaoId}...`);
    edicaoIdAtual = edicaoId;

    // Mostra loading na área de conteúdo
    const containerConteudo = document.getElementById("mata-mata-conteudo");
    if (containerConteudo) {
        containerConteudo.innerHTML =
            '<div class="loading-state"><div class="spinner"></div><p>Carregando chaves...</p></div>';
    }

    const ligaId = getLigaId();

    try {
        // A. Busca dados (Cache ou Cálculo)
        let dados = await lerCacheMataMata(ligaId, edicaoId);

        if (!dados) {
            console.log("[MATA-ORQUESTRADOR] ⚠️ Cache Miss. Recalculando...");
            dados = await recalcularDadosEdicao(ligaId, edicaoId);
        }

        dadosEdicaoAtual = dados; // Salva no estado

        // B. Renderiza a fase inicial (ou a última disponível)
        // Define qual fase mostrar por padrão
        faseAtual = determinarFaseInicial(dados);

        // Atualiza navegação de fases no UI (se houver lógica para mostrar/esconder botões)
        atualizarNavegacaoFases(faseAtual);

        // C. Renderiza a tabela
        renderizarFaseAtual();
    } catch (error) {
        console.error("[MATA-ORQUESTRADOR] Erro:", error);
        if (containerConteudo)
            containerConteudo.innerHTML = `<div class="erro-box">${error.message}</div>`;
    }
}

// Função chamada ao clicar nos botões de fase (1ª Fase, Oitavas, etc)
function selecionarFase(fase) {
    faseAtual = fase;
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

    // ✅ AQUI ESTÁ A MÁGICA: Chama o UI original para desenhar a tabela
    // Passamos o ID da div de conteúdo ("mata-mata-conteudo")
    UI.renderizarConfrontos(
        "mata-mata-conteudo",
        dadosEdicaoAtual[faseAtual],
        false, // isPending (pode ajustar se quiser tratar status "em andamento")
    );
}

// ============================================================================
// LÓGICA DE CÁLCULO (RESTAURADA E SEGURA)
// ============================================================================

async function recalcularDadosEdicao(ligaId, edicaoId) {
    const {
        montarConfrontosFase,
        montarConfrontosPrimeiraFase,
        getPontosDaRodada,
        setRankingFunction,
    } = await import("./mata-mata-confrontos.js");
    const { getRankingRodadaEspecifica } = await import("../rodadas.js");

    // Injeção de dependência vital
    setRankingFunction(getRankingRodadaEspecifica);

    const edicao = edicoes.find((e) => e.id === parseInt(edicaoId));
    if (!edicao) throw new Error("Edição não encontrada");

    // Garante ranking base
    const rankingBase = await getRankingRodadaEspecifica(
        ligaId,
        edicao.rodadaDefinicao || 1,
    );
    const rankingTratado = garantir32Times(rankingBase);

    const dadosTorneio = {};

    // Fase 1
    const pontosFase1 = await getPontosDaRodada(ligaId, edicao.rodadaInicial);
    const fase1 = montarConfrontosPrimeiraFase(rankingTratado, pontosFase1);
    dadosTorneio["primeira"] = fase1; // UI usa chave 'primeira', não 'fase1'

    // Fases Seguintes
    let vencedoresAtuais = await extrairVencedores(fase1);

    const fases = [
        { chave: "oitavas", nome: "OITAVAS" },
        { chave: "quartas", nome: "QUARTAS" },
        { chave: "semis", nome: "SEMIS" }, // Atenção ao nome no UI
        { chave: "final", nome: "FINAL" },
    ];

    for (const f of fases) {
        if (vencedoresAtuais.length < 2) break;

        const info = getFaseInfo(f.nome, edicao); // Função do config
        const pontos = await getPontosDaRodada(ligaId, info.pontosRodada);

        const confrontos = montarConfrontosFase(
            vencedoresAtuais,
            pontos,
            info.numJogos,
        );
        dadosTorneio[f.chave] = confrontos;

        vencedoresAtuais = await extrairVencedores(confrontos);
    }

    // Salvar
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
    // Retorna a última fase que tem dados
    if (dados["final"]) return "final";
    if (dados["semis"]) return "semis";
    if (dados["quartas"]) return "quartas";
    if (dados["oitavas"]) return "oitavas";
    return "primeira";
}

function atualizarNavegacaoFases(faseAtiva) {
    // Atualiza classes CSS dos botões de fase no UI original
    document.querySelectorAll(".fase-btn").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.dataset.fase === faseAtiva) btn.classList.add("active");
    });

    // Mostra/esconde container de navegação se necessário
    const navContainer = document.getElementById("fase-nav-container");
    if (navContainer) navContainer.style.display = "block";
}

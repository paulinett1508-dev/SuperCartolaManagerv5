// MATA-MATA ORQUESTRADOR - Com Cache de Alta Performance
// Responsável por: coordenação de chaves, carregamento dinâmico e persistência

import { edicoes, getFaseInfo, getLigaId } from "./mata-mata-config.js";

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
        const response = await fetch(
            `/api/mata-mata/cache/${ligaId}/${edicaoId}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rodada: rodadaAtual,
                    dados: dadosTorneio,
                }),
            },
        );
        if (response.ok) {
            console.log(
                `[MATA-ORQUESTRADOR] 💾 Snapshot da Edição ${edicaoId} salvo com sucesso!`,
            );
        } else {
            console.warn(
                `[MATA-ORQUESTRADOR] ❌ Falha ao salvar cache (HTTP ${response.status}) - Verifique index.js`,
            );
        }
    } catch (error) {
        console.warn(
            "[MATA-ORQUESTRADOR] Falha de conexão ao salvar cache:",
            error,
        );
    }
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

export async function carregarMataMata() {
    console.log("[MATA-ORQUESTRADOR] Iniciando módulo...");

    const container = document.getElementById("mata-mata-container");
    if (!container) return;

    criarTabsEdicoes();

    const edicaoAtiva =
        edicoes.find((e) => e.ativo) || edicoes[edicoes.length - 1];
    if (edicaoAtiva) {
        // Marca a aba ativa visualmente
        setTimeout(() => {
            document
                .querySelectorAll(".tab-edicao")
                .forEach((b) => b.classList.remove("active"));
            document
                .getElementById(`tab-edicao-${edicaoAtiva.id}`)
                ?.classList.add("active");
        }, 100);
        await carregarEdicao(edicaoAtiva.id);
    }
}

async function carregarEdicao(edicaoId) {
    console.log(`[MATA-ORQUESTRADOR] Carregando Edição ${edicaoId}...`);

    const ligaId = getLigaId();
    if (!ligaId) return console.error("Liga ID não encontrado");

    const containerConteudo = document.getElementById("mata-mata-conteudo");
    if (containerConteudo) {
        containerConteudo.innerHTML =
            '<div class="loading-state"><div class="spinner"></div><p>Processando chaves do torneio...</p></div>';
    }

    try {
        // 1. TENTATIVA DE CACHE RÁPIDO 🚀
        const cache = await lerCacheMataMata(ligaId, edicaoId);
        if (cache) {
            renderizarTorneioCompleto(cache);
            return;
        }

        console.log(
            "[MATA-ORQUESTRADOR] ⚠️ Cache Miss. Iniciando cálculo pesado...",
        );

        // 2. PREPARAÇÃO DE DEPENDÊNCIAS
        // Importamos dinamicamente para garantir que as funções existam
        const {
            montarConfrontosFase,
            montarConfrontosPrimeiraFase,
            getPontosDaRodada,
            setRankingFunction,
        } = await import("./mata-mata-confrontos.js");
        const { getRankingRodadaEspecifica } = await import("../rodadas.js"); // Importante: Buscar o ranking real!

        // Injetar a função de ranking explicitamente para evitar avisos
        setRankingFunction(getRankingRodadaEspecifica);

        const edicao = edicoes.find((e) => e.id === edicaoId);
        if (!edicao) throw new Error("Edição não encontrada");

        // 3. BUSCAR DADOS REAIS (AQUI ESTAVA O ERRO ANTES)
        // Precisamos do Ranking Base para definir os confrontos (1º vs 32º, etc)
        console.log(
            `[MATA-ORQUESTRADOR] Buscando ranking base da rodada ${edicao.rodadaDefinicao}...`,
        );
        const rankingBase = await getRankingRodadaEspecifica(
            ligaId,
            edicao.rodadaDefinicao || 1,
        );

        if (
            !rankingBase ||
            !Array.isArray(rankingBase) ||
            rankingBase.length === 0
        ) {
            throw new Error(
                `Ranking base não encontrado para rodada ${edicao.rodadaDefinicao}. Verifique se a rodada já aconteceu.`,
            );
        }

        // Precisamos garantir 32 times para a chave funcionar
        // Se tiver menos, o montarConfrontosPrimeiraFase vai quebrar
        const rankingTratado = garantir32Times(rankingBase);

        // 4. CÁLCULO DA FASE 1
        console.log(
            `[MATA-ORQUESTRADOR] Calculando Fase 1 (Rodada ${edicao.rodadaInicial})...`,
        );
        const pontosFase1 = await getPontosDaRodada(
            ligaId,
            edicao.rodadaInicial,
        );
        const fase1 = montarConfrontosPrimeiraFase(rankingTratado, pontosFase1);

        const dadosTorneio = { fase1: fase1 };

        // 5. CÁLCULO DAS FASES SEGUINTES (Cascata)
        let vencedoresAtuais = await extrairVencedores(fase1);

        const sequenciaFases = [
            { chave: "oitavas", nome: "OITAVAS" },
            { chave: "quartas", nome: "QUARTAS" },
            { chave: "semifinal", nome: "SEMIS" },
            { chave: "final", nome: "FINAL" },
        ];

        for (const fase of sequenciaFases) {
            if (vencedoresAtuais.length < 2) break;

            const infoFase = getFaseInfo(fase.nome, edicao); // Passar a edição é crucial
            const pontosFase = await getPontosDaRodada(
                ligaId,
                infoFase.pontosRodada,
            );

            // Calcula quem ganhou baseado nos vencedores da anterior + pontos da rodada atual
            const confrontosFase = montarConfrontosFase(
                vencedoresAtuais,
                pontosFase,
                infoFase.numJogos,
            );

            dadosTorneio[fase.chave] = confrontosFase;
            vencedoresAtuais = await extrairVencedores(confrontosFase);
        }

        // 6. SALVAR E RENDERIZAR
        const statusMercado = await fetch("/api/cartola/mercado/status")
            .then((r) => r.json())
            .catch(() => ({ rodada_atual: 0 }));
        await salvarCacheMataMata(
            ligaId,
            edicaoId,
            statusMercado.rodada_atual,
            dadosTorneio,
        );

        renderizarTorneioCompleto(dadosTorneio);
    } catch (error) {
        console.error("[MATA-ORQUESTRADOR] Erro fatal:", error);
        if (containerConteudo) {
            containerConteudo.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                    <p><strong>Não foi possível carregar o Mata-Mata</strong></p>
                    <p style="font-size: 0.9em; color: #666;">${error.message}</p>
                    <button class="btn-voltar" onclick="location.reload()">Tentar Novamente</button>
                </div>`;
        }
    }
}

// ============================================================================
// AUXILIARES DE LÓGICA
// ============================================================================

// Garante que o array tenha 32 posições para não quebrar o loop for(i=0; i<16)
function garantir32Times(rankingOriginal) {
    const novoRanking = [...rankingOriginal];
    while (novoRanking.length < 32) {
        novoRanking.push({
            timeId: `fake_${novoRanking.length}`,
            nome_time: "A definir",
            nome_cartola: "-",
            escudo: "/escudos/placeholder.png",
            pontos: 0,
        });
    }
    return novoRanking;
}

async function extrairVencedores(confrontos) {
    const vencedores = [];
    if (!confrontos) return [];

    confrontos.forEach((c) => {
        // A lógica de quem venceu está no objeto do confronto (vencedorDeterminado)
        if (c.vencedorDeterminado === "A") vencedores.push(c.timeA);
        else if (c.vencedorDeterminado === "B") vencedores.push(c.timeB);
        else {
            // Se ainda não tem vencedor (futuro), passa um placeholder para desenhar a próxima chave vazia
            vencedores.push({
                nome_time: "A definir",
                escudo: "/escudos/placeholder.png",
            });
        }
    });
    return vencedores;
}

// ============================================================================
// UI / RENDERIZAÇÃO
// ============================================================================

function criarTabsEdicoes() {
    const tabsContainer = document.getElementById("mata-mata-tabs");
    if (!tabsContainer) return;

    tabsContainer.innerHTML = edicoes
        .map(
            (ed) => `
        <button class="tab-edicao ${ed.ativo ? "" : "inativo"}" 
                onclick="selecionarEdicaoMataMata(${ed.id})" 
                id="tab-edicao-${ed.id}">
            ${ed.nome}
        </button>
    `,
        )
        .join("");

    window.selecionarEdicaoMataMata = (id) => {
        document
            .querySelectorAll(".tab-edicao")
            .forEach((b) => b.classList.remove("active"));
        document.getElementById(`tab-edicao-${id}`)?.classList.add("active");
        carregarEdicao(id);
    };
}

function renderizarTorneioCompleto(dados) {
    const container = document.getElementById("mata-mata-conteudo");
    if (!container) return;
    container.innerHTML = "";

    const ordemFases = ["fase1", "oitavas", "quartas", "semifinal", "final"];

    ordemFases.forEach((faseKey) => {
        if (!dados[faseKey]) return;

        const html = `
            <div class="fase-container">
                <h3>${formatarNomeFase(faseKey)}</h3>
                <div class="lista-confrontos">
                    ${dados[faseKey].map((jogo) => criarCardConfrontoHTML(jogo)).join("")}
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function criarCardConfrontoHTML(jogo) {
    const timeA = jogo.timeA || { nome_time: "A definir" };
    const timeB = jogo.timeB || { nome_time: "A definir" };

    // Detectar vencedor para classe CSS
    const classA = jogo.vencedorDeterminado === "A" ? "vencedor" : "";
    const classB = jogo.vencedorDeterminado === "B" ? "vencedor" : "";

    // Formatar pontos
    const pontosA =
        typeof timeA.pontos === "number" ? timeA.pontos.toFixed(2) : "-";
    const pontosB =
        typeof timeB.pontos === "number" ? timeB.pontos.toFixed(2) : "-";

    return `
    <div class="confronto-card">
        <div class="time time-a ${classA}">
            <img src="${timeA.escudo || "/escudos/placeholder.png"}" class="escudo-mini" onerror="this.src='/escudos/placeholder.png'">
            <div class="info">
                <span class="nome">${timeA.nome_time || timeA.nome}</span>
                <span class="pontos">${pontosA}</span>
            </div>
        </div>
        <div class="vs">X</div>
        <div class="time time-b ${classB}">
            <div class="info">
                <span class="pontos">${pontosB}</span>
                <span class="nome">${timeB.nome_time || timeB.nome}</span>
            </div>
            <img src="${timeB.escudo || "/escudos/placeholder.png"}" class="escudo-mini" onerror="this.src='/escudos/placeholder.png'">
        </div>
    </div>`;
}

function formatarNomeFase(key) {
    const map = {
        fase1: "1ª FASE",
        oitavas: "OITAVAS DE FINAL",
        quartas: "QUARTAS DE FINAL",
        semifinal: "SEMIFINAIS",
        final: "GRANDE FINAL",
    };
    return map[key] || key.toUpperCase();
}

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

        if (!response.ok) {
            console.log(`[MATA-ORQUESTRADOR] ⚠️ Cache não encontrado (HTTP ${response.status})`);
            return null;
        }

        const data = await response.json();

        // Validação básica: cache deve existir E ter dados
        if (!data.cached || !data.dados) {
            console.log(`[MATA-ORQUESTRADOR] ⚠️ Resposta sem cache válido`);
            return null;
        }

        // ✅ CORREÇÃO: Validar mas NÃO deletar - deixar recálculo handle
        const primeiraFase = data.dados["primeira"];
        if (!Array.isArray(primeiraFase) || primeiraFase.length === 0) {
            console.warn(
                `[MATA-ORQUESTRADOR] ⚠️ Cache com primeira fase vazia, forçando recálculo...`,
            );
            return null; // Apenas retorna null, não deleta
        }

        console.log(
            `[MATA-ORQUESTRADOR] ✅ Cache encontrado: ${primeiraFase.length} confrontos na primeira fase`,
        );
        return data.dados;
    } catch (error) {
        console.error('[MATA-ORQUESTRADOR] Erro ao ler cache:', error);
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
        // ✅ CORREÇÃO: Log de diagnóstico antes da validação
        const primeiraFase = dadosTorneio["primeira"];
        console.log(
            `[MATA-ORQUESTRADOR] 💾 Salvando cache - Primeira fase: ${Array.isArray(primeiraFase) ? primeiraFase.length : 'INVÁLIDO'} confrontos`,
        );

        // Validação mantida, mas com log mais detalhado
        if (!primeiraFase || primeiraFase.length === 0) {
            console.error(
                "[MATA-ORQUESTRADOR] 🛑 ERRO CRÍTICO: Tentativa de salvar cache sem confrontos na primeira fase!",
                { dadosTorneio }
            );
            return;
        }

        const response = await fetch(`/api/mata-mata/cache/${ligaId}/${edicaoId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                rodada: rodadaAtual,
                dados: dadosTorneio,
            }),
        });

        if (response.ok) {
            console.log(
                `[MATA-ORQUESTRADOR] ✅ Snapshot da Edição ${edicaoId} salvo com ${primeiraFase.length} confrontos!`,
            );
        } else {
            console.error(`[MATA-ORQUESTRADOR] ❌ Erro HTTP ${response.status} ao salvar cache`);
        }
    } catch (error) {
        console.error("[MATA-ORQUESTRADOR] ❌ Falha ao salvar cache:", error);
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
        // ✅ CORREÇÃO: Definir o valor do select ANTES de chamar selecionarEdicao
        const edicaoSelect = document.getElementById("edicao-select");
        if (edicaoSelect) {
            edicaoSelect.value = edicaoAtiva.id;
        }
        
        setTimeout(() => {
            document
                .querySelectorAll(".tab-edicao")
                .forEach((b) => b.classList.remove("active"));
            document
                .getElementById(`tab-edicao-${edicaoAtiva.id}`)
                ?.classList.add("active");
        }, 100);
        
        await selecionarEdicao(edicaoAtiva.id);
    }
}

async function selecionarEdicao(edicaoId) {
    console.log(`[MATA-ORQUESTRADOR] Selecionando Edição ${edicaoId}...`);
    edicaoIdAtual = parseInt(edicaoId);
    
    // Resetar para primeira fase ao trocar de edição
    faseAtual = "primeira";

    const containerConteudo = document.getElementById("mata-mata-conteudo");
    if (containerConteudo) {
        containerConteudo.innerHTML =
            '<div class="loading-state"><div class="spinner"></div><p>Processando torneio...</p></div>';
    }

    const ligaId = getLigaId();

    try {
        let dados = await lerCacheMataMata(ligaId, edicaoIdAtual);

        if (!dados) {
            console.log(
                "[MATA-ORQUESTRADOR] ⚠️ Cache Miss ou Inválido. Iniciando cálculo...",
            );
            dados = await recalcularDadosEdicao(ligaId, edicaoIdAtual);
        }

        // Validação extra: garantir que o cache tem a primeira fase
        if (!dados || !dados["primeira"] || !Array.isArray(dados["primeira"]) || dados["primeira"].length === 0) {
            console.warn(
                "[MATA-ORQUESTRADOR] ⚠️ Cache inválido ou sem primeira fase. Forçando recálculo...",
            );
            dados = await recalcularDadosEdicao(ligaId, edicaoIdAtual);
        }

        dadosEdicaoAtual = dados;
        faseAtual = determinarFaseInicial(dados);

        console.log(`[MATA-ORQUESTRADOR] Dados carregados. Fase inicial: ${faseAtual}`);
        console.log(`[MATA-ORQUESTRADOR] Fases disponíveis:`, Object.keys(dados));

        atualizarNavegacaoFases(faseAtual);
        renderizarFaseAtual();
    } catch (error) {
        console.error("[MATA-ORQUESTRADOR] Erro:", error);
        if (containerConteudo)
            containerConteudo.innerHTML = `<div class="erro-box" style="padding: 20px; text-align: center; color: #ef4444; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                <h4>Erro ao carregar Mata-Mata</h4>
                <p>${error.message}</p>
            </div>`;
    }
}

function selecionarFase(fase) {
    faseAtual = fase;
    atualizarNavegacaoFases(fase); // Atualiza visual dos botões
    renderizarFaseAtual();
}

function renderizarFaseAtual() {
    const container = document.getElementById("mata-mata-conteudo");
    
    if (!dadosEdicaoAtual) {
        if (container) {
            container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Carregando dados...</p></div>';
        }
        return;
    }

    if (!dadosEdicaoAtual[faseAtual]) {
        if (container) {
            container.innerHTML = '<div class="aviso-box" style="padding: 20px; text-align: center; color: #ff7e00;">Fase não disponível ainda.</div>';
        }
        return;
    }

    // Mapear nome da fase para label correto
    const faseLabels = {
        'primeira': '1ª FASE',
        'oitavas': 'OITAVAS',
        'quartas': 'QUARTAS',
        'semis': 'SEMIS',
        'final': 'FINAL'
    };

    const faseLabel = faseLabels[faseAtual] || faseAtual.toUpperCase();
    
    console.log(`[MATA-ORQUESTRADOR] Renderizando fase "${faseAtual}" (${faseLabel}) com ${dadosEdicaoAtual[faseAtual].length} confrontos`);
    
    // Passa os dados para o UI renderizar usando a função correta
    UI.renderTabelaMataMata(
        dadosEdicaoAtual[faseAtual],
        "mata-mata-conteudo",
        faseLabel,
        edicaoIdAtual,
        false
    );
}

// ============================================================================
// LÓGICA DE CÁLCULO
// ============================================================================

async function recalcularDadosEdicao(ligaId, edicaoId) {
    console.log(`[MATA-ORQUESTRADOR] 🔄 Iniciando RECÁLCULO para Edição ${edicaoId}...`);
    
    // Importação Dinâmica das Dependências
    const {
        montarConfrontosFase,
        montarConfrontosPrimeiraFase,
        getPontosDaRodada,
        setRankingFunction,
        calcularValoresConfronto,
    } = await import("./mata-mata-confrontos.js");
    const { getRankingRodadaEspecifica } = await import("../rodadas.js");

    // Injeta a função de ranking IMEDIATAMENTE
    if (setRankingFunction && getRankingRodadaEspecifica) {
        setRankingFunction(getRankingRodadaEspecifica);
        console.log('[MATA-ORQUESTRADOR] ✅ Função de ranking injetada');
    }

    const edicao = edicoes.find((e) => e.id === parseInt(edicaoId));
    if (!edicao) {
        console.error(`[MATA-ORQUESTRADOR] ❌ Edição ${edicaoId} não encontrada`);
        throw new Error(`Edição ${edicaoId} não encontrada`);
    }

    console.log(`[MATA-ORQUESTRADOR] 📊 Buscando ranking da rodada ${edicao.rodadaDefinicao}...`);
    
    // 1. Busca Ranking Base
    const rankingBase = await getRankingRodadaEspecifica(
        ligaId,
        edicao.rodadaDefinicao || 1,
    );

    // Validação crítica para não gerar cache vazio
    if (!rankingBase || rankingBase.length === 0) {
        console.error(`[MATA-ORQUESTRADOR] ❌ Ranking vazio na rodada ${edicao.rodadaDefinicao}`);
        throw new Error(
            `Ranking da rodada ${edicao.rodadaDefinicao} está vazio. Impossível montar chaves.`,
        );
    }
    
    console.log(`[MATA-ORQUESTRADOR] ✅ Ranking obtido: ${rankingBase.length} times`);

    const rankingTratado = garantir32Times(rankingBase);
    const dadosTorneio = {};

    // 2. Fase 1 (Primeira Fase - 16 confrontos)
    console.log(`[MATA-ORQUESTRADOR] 🎮 Montando PRIMEIRA FASE (rodada ${edicao.rodadaInicial})...`);
    console.log(`[MATA-ORQUESTRADOR] 📋 Ranking tratado: ${rankingTratado.length} times`);
    
    const pontosFase1 = await getPontosDaRodada(ligaId, edicao.rodadaInicial);
    console.log(`[MATA-ORQUESTRADOR] 📊 Pontos obtidos: ${Object.keys(pontosFase1).length} times`);
    
    const fase1 = montarConfrontosPrimeiraFase(rankingTratado, pontosFase1);
    console.log(`[MATA-ORQUESTRADOR] ✅ Primeira fase montada: ${fase1.length} confrontos`);
    
    if (!fase1 || fase1.length === 0) {
        console.error(`[MATA-ORQUESTRADOR] ❌ ERRO CRÍTICO: Primeira fase retornou vazia!`);
        console.error(`[MATA-ORQUESTRADOR] Debug - rankingTratado:`, rankingTratado.slice(0, 3));
        throw new Error('Falha ao montar confrontos da primeira fase');
    }
    
    // Calcular valores e vencedores da primeira fase
    calcularValoresConfronto(fase1, false);
    dadosTorneio["primeira"] = fase1;

    // 3. Fases Seguintes - CALCULAR TODAS ANTES DE SALVAR
    let vencedoresAtuais = await extrairVencedores(fase1);

    const fases = [
        { chave: "oitavas", nome: "OITAVAS" },
        { chave: "quartas", nome: "QUARTAS" },
        { chave: "semis", nome: "SEMIS" },
        { chave: "final", nome: "FINAL" },
    ];

    for (const f of fases) {
        if (vencedoresAtuais.length < 2) break;

        // ✅ CORREÇÃO ESPECIAL: 5ª Edição pula SEMIS (vai direto de QUARTAS para FINAL)
        if (edicaoId === 5 && f.chave === "semis") {
            console.log(`[MATA-ORQUESTRADOR] ⚠️ Edição 5: Pulando SEMIS (formato diferenciado)`);
            continue;
        }

        // ✅ CORREÇÃO: getFaseInfo espera (faseNome:string, edicaoObjeto)
        const info = getFaseInfo(f.chave, edicao);
        
        // Validação crítica: garantir que rodada existe
        if (!info || !info.pontosRodada) {
            console.warn(`[MATA-ORQUESTRADOR] ⚠️ Rodada não definida para fase ${f.nome}, pulando...`);
            continue;
        }
        
        console.log(`[MATA-ORQUESTRADOR] 🎮 Montando fase ${f.nome} (rodada ${info.pontosRodada})...`);
        const pontos = await getPontosDaRodada(ligaId, info.pontosRodada);

        const confrontos = montarConfrontosFase(
            vencedoresAtuais,
            pontos,
            info.numJogos,
        );
        
        // Calcular valores e vencedores
        calcularValoresConfronto(confrontos, false);
        dadosTorneio[f.chave] = confrontos;
        
        console.log(`[MATA-ORQUESTRADOR] ✅ Fase ${f.nome}: ${confrontos.length} confrontos montados`);

        vencedoresAtuais = await extrairVencedores(confrontos);
    }

    // 4. Log final antes de salvar
    console.log(`[MATA-ORQUESTRADOR] 📦 Torneio completo calculado:`, {
        primeira: dadosTorneio.primeira?.length || 0,
        oitavas: dadosTorneio.oitavas?.length || 0,
        quartas: dadosTorneio.quartas?.length || 0,
        semis: dadosTorneio.semis?.length || 0,
        final: dadosTorneio.final?.length || 0,
    });

    // 5. Salvar Cache (apenas se válido e completo)
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
    // SEMPRE começar pela primeira fase, independente das outras existirem
    if (dados["primeira"]) return "primeira";
    if (dados["oitavas"]) return "oitavas";
    if (dados["quartas"]) return "quartas";
    if (dados["semis"]) return "semis";
    if (dados["final"]) return "final";
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

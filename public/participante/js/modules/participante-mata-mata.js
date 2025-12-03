// =====================================================================
// PARTICIPANTE-MATA-MATA.JS - v3.0 (VISUAL ATUALIZADO)
// =====================================================================

console.log("[PARTICIPANTE-MATA-MATA] 🔄 Carregando módulo v3.0...");

// =====================================================================
// ESTADO DO MÓDULO
// =====================================================================
let estadoMataMata = {
    edicoes: [],
    edicaoSelecionada: null,
    faseSelecionada: null,
    timeId: null,
    ligaId: null,
};

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarMataMataParticipante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-MATA-MATA] 🚀 Inicializando v3.0...", {
        ligaId,
        timeId,
    });

    estadoMataMata.ligaId = ligaId;
    estadoMataMata.timeId = timeId;

    const container = document.getElementById("mataMataContainer");
    if (!container) {
        console.error("[PARTICIPANTE-MATA-MATA] ❌ Container não encontrado");
        return;
    }

    try {
        const response = await fetch(`/api/ligas/${ligaId}/mata-mata`);

        if (!response.ok) {
            throw new Error("Módulo não configurado");
        }

        const data = await response.json();
        console.log("[PARTICIPANTE-MATA-MATA] 📦 Dados recebidos:", data);

        estadoMataMata.edicoes = data.edicoes || data.fases || [];

        // Atualizar contagem de times no header
        const timesCount = document.getElementById("mmTimesCount");
        if (timesCount) {
            const totalTimes = contarTimesUnicos(estadoMataMata.edicoes);
            timesCount.textContent = `${totalTimes} time(s) no mata-mata`;
        }

        if (estadoMataMata.edicoes.length === 0) {
            renderizarEstadoVazio(container);
            return;
        }

        // Inicializar seletor de edições
        inicializarSeletorEdicoes();

        // Selecionar última edição por padrão
        estadoMataMata.edicaoSelecionada = estadoMataMata.edicoes[0];

        // Renderizar
        renderizarMataMata(container);
    } catch (error) {
        console.error("[PARTICIPANTE-MATA-MATA] ❌ Erro:", error);
        renderizarEstadoVazio(container);
    }
}

// Também expor no window para compatibilidade
window.inicializarMataMataParticipante = inicializarMataMataParticipante;

// =====================================================================
// HELPERS
// =====================================================================
function contarTimesUnicos(edicoes) {
    const timesSet = new Set();
    edicoes.forEach((edicao) => {
        const confrontos = edicao.confrontos || edicao.jogos || [];
        confrontos.forEach((c) => {
            const timeA = c.timeA || c.time1 || {};
            const timeB = c.timeB || c.time2 || {};
            const idA = timeA.timeId || timeA.time_id;
            const idB = timeB.timeId || timeB.time_id;
            if (idA) timesSet.add(String(idA));
            if (idB) timesSet.add(String(idB));
        });
    });
    return timesSet.size;
}

function inicializarSeletorEdicoes() {
    const select = document.getElementById("mmEditionSelect");
    if (!select) return;

    select.innerHTML = estadoMataMata.edicoes
        .map((edicao, idx) => {
            const nome = edicao.nome || `Edição ${idx + 1}`;
            return `<option value="${idx}">${nome}</option>`;
        })
        .join("");

    select.addEventListener("change", (e) => {
        const idx = parseInt(e.target.value);
        estadoMataMata.edicaoSelecionada = estadoMataMata.edicoes[idx];
        estadoMataMata.faseSelecionada = null;
        renderizarMataMata(document.getElementById("mataMataContainer"));
    });
}

function extrairFases(edicao) {
    // Verificar se a edição tem subfases ou se ela própria é uma fase
    if (edicao.fases && edicao.fases.length > 0) {
        return edicao.fases;
    }

    // Se não tem subfases, a própria edição é a fase
    const confrontos = edicao.confrontos || edicao.jogos || [];
    const numConfrontos = confrontos.length;

    // Determinar nome da fase baseado no número de confrontos
    let nomeFase = "1ª FASE";
    if (numConfrontos === 16) nomeFase = "1ª FASE";
    else if (numConfrontos === 8) nomeFase = "OITAVAS";
    else if (numConfrontos === 4) nomeFase = "QUARTAS";
    else if (numConfrontos === 2) nomeFase = "SEMI";
    else if (numConfrontos === 1) nomeFase = "FINAL";

    return [
        {
            nome: edicao.faseNome || nomeFase,
            confrontos: confrontos,
            rodada: edicao.rodada || edicao.rodadaAtual,
            status: edicao.status,
            finalizada: edicao.finalizada,
        },
    ];
}

// =====================================================================
// RENDERIZAÇÃO PRINCIPAL
// =====================================================================
function renderizarMataMata(container) {
    const edicao = estadoMataMata.edicaoSelecionada;
    if (!edicao) {
        renderizarEstadoVazio(container);
        return;
    }

    const fases = extrairFases(edicao);

    // Selecionar fase (última ativa ou primeira)
    if (!estadoMataMata.faseSelecionada) {
        estadoMataMata.faseSelecionada = fases[fases.length - 1] || fases[0];
    }

    // Renderizar navegação de fases
    renderizarNavFases(fases);

    // Atualizar info da fase
    atualizarInfoFase(edicao);

    // Encontrar meu confronto na fase atual
    const meuConfronto = encontrarMeuConfronto(estadoMataMata.faseSelecionada);

    // Renderizar conteúdo
    let html = "";

    // Se estou no mata-mata, mostrar destaque do meu confronto
    if (meuConfronto) {
        html += renderizarMeuConfrontoDestaque(meuConfronto);
    } else {
        html += renderizarNaoClassificado();
    }

    // Renderizar tabela de confrontos
    html += renderizarTabelaConfrontos(estadoMataMata.faseSelecionada);

    container.innerHTML = html;
}

function renderizarNavFases(fases) {
    const nav = document.getElementById("mmPhasesNav");
    if (!nav) return;

    nav.innerHTML = fases
        .map((fase, idx) => {
            const isActive = fase === estadoMataMata.faseSelecionada;
            const nome = fase.nome || `Fase ${idx + 1}`;
            return `
            <button class="mm-phase-btn ${isActive ? "active" : ""}" 
                    data-fase-idx="${idx}">
                ${nome}
            </button>
        `;
        })
        .join("");

    // Event listeners
    nav.querySelectorAll(".mm-phase-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.faseIdx);
            estadoMataMata.faseSelecionada = fases[idx];
            renderizarMataMata(document.getElementById("mataMataContainer"));
        });
    });
}

function atualizarInfoFase(edicao) {
    const info = document.getElementById("mmPhaseInfo");
    if (!info) return;

    const fase = estadoMataMata.faseSelecionada;
    const edicaoNome = edicao.nome || "Edição Atual";
    const faseNome = fase?.nome || "Fase Atual";
    const rodada = fase?.rodada || edicao.rodada || edicao.rodadaAtual || "";

    info.querySelector(".mm-edition-name").textContent = edicaoNome;
    info.querySelector(".mm-phase-name").textContent = `CONFRONTO ${faseNome}`;
    info.querySelector(".mm-round-info").textContent = rodada
        ? `Pontuação da Rodada ${rodada}`
        : "";
}

function encontrarMeuConfronto(fase) {
    if (!fase) return null;

    const confrontos = fase.confrontos || fase.jogos || [];
    return confrontos.find((c) => {
        const timeA = c.timeA || c.time1 || {};
        const timeB = c.timeB || c.time2 || {};
        const idA = String(timeA.timeId || timeA.time_id || "");
        const idB = String(timeB.timeId || timeB.time_id || "");
        return (
            idA === String(estadoMataMata.timeId) ||
            idB === String(estadoMataMata.timeId)
        );
    });
}

// =====================================================================
// RENDERIZAÇÃO DE COMPONENTES
// =====================================================================
function renderizarMeuConfrontoDestaque(confronto) {
    const timeA = confronto.timeA || confronto.time1 || {};
    const timeB = confronto.timeB || confronto.time2 || {};

    const idA = String(timeA.timeId || timeA.time_id || "");
    const souTimeA = idA === String(estadoMataMata.timeId);

    const eu = souTimeA ? timeA : timeB;
    const adversario = souTimeA ? timeB : timeA;

    const meusPontos = Number(eu.pontos || eu.pontos_total || 0);
    const pontosAdv = Number(adversario.pontos || adversario.pontos_total || 0);

    let statusClass = "empatando";
    let statusText = "⚖️ Empate técnico";
    if (meusPontos > pontosAdv) {
        statusClass = "vencendo";
        statusText = "🏆 Você está vencendo!";
    } else if (meusPontos < pontosAdv) {
        statusClass = "perdendo";
        statusText = "😔 Você está perdendo";
    }

    return `
        <div class="mm-my-match-highlight">
            <h3 class="mm-my-match-title">🎯 Seu Confronto</h3>
            <div class="mm-my-match-grid">
                <div class="mm-my-team-card eu">
                    <div class="mm-my-team-label">VOCÊ</div>
                    <img class="mm-my-team-escudo" 
                         src="${eu.escudo || eu.url_escudo_png || "https://via.placeholder.com/48"}" 
                         alt="${eu.nomeTime || eu.nome_time || "Seu Time"}"
                         onerror="this.src='https://via.placeholder.com/48'">
                    <div class="mm-my-team-nome">${eu.nomeTime || eu.nome_time || "Seu Time"}</div>
                    <div class="mm-my-team-pts">${meusPontos.toFixed(2)}</div>
                </div>
                <div class="mm-my-match-vs">VS</div>
                <div class="mm-my-team-card adversario">
                    <div class="mm-my-team-label">ADVERSÁRIO</div>
                    <img class="mm-my-team-escudo" 
                         src="${adversario.escudo || adversario.url_escudo_png || "https://via.placeholder.com/48"}" 
                         alt="${adversario.nomeTime || adversario.nome_time || "Adversário"}"
                         onerror="this.src='https://via.placeholder.com/48'">
                    <div class="mm-my-team-nome">${adversario.nomeTime || adversario.nome_time || "Adversário"}</div>
                    <div class="mm-my-team-pts">${pontosAdv.toFixed(2)}</div>
                </div>
            </div>
            <div class="mm-my-match-status ${statusClass}">${statusText}</div>
        </div>
    `;
}

function renderizarNaoClassificado() {
    return `
        <div class="mm-not-qualified">
            <div class="mm-nq-icon">😔</div>
            <h3>Você Não Está Nesta Fase</h3>
            <p>Você não se classificou ou foi eliminado nesta fase do Mata-Mata.</p>
        </div>
    `;
}

function renderizarTabelaConfrontos(fase) {
    if (!fase) return "";

    const confrontos = fase.confrontos || fase.jogos || [];
    if (confrontos.length === 0) {
        return `
            <div class="mm-empty-state">
                <div class="mm-empty-icon">📋</div>
                <h3>Sem Confrontos</h3>
                <p>Nenhum confronto registrado para esta fase.</p>
            </div>
        `;
    }

    let rowsHtml = confrontos
        .map((confronto, idx) => {
            return renderizarLinhaConfronto(confronto, idx + 1);
        })
        .join("");

    return `
        <div class="mm-confrontos-table">
            <div class="mm-table-header">
                <div class="mm-th-num">#</div>
                <div class="mm-th-time-left">Time</div>
                <div class="mm-th-pts">Pts</div>
                <div class="mm-th-vs"></div>
                <div class="mm-th-pts">Pts</div>
                <div class="mm-th-time-right">Time</div>
            </div>
            <div class="mm-table-body">
                ${rowsHtml}
            </div>
        </div>
    `;
}

function renderizarLinhaConfronto(confronto, numero) {
    const timeA = confronto.timeA || confronto.time1 || {};
    const timeB = confronto.timeB || confronto.time2 || {};

    const idA = String(timeA.timeId || timeA.time_id || "");
    const idB = String(timeB.timeId || timeB.time_id || "");
    const isMeuConfronto =
        idA === String(estadoMataMata.timeId) ||
        idB === String(estadoMataMata.timeId);

    const ptsA = Number(timeA.pontos || timeA.pontos_total || 0);
    const ptsB = Number(timeB.pontos || timeB.pontos_total || 0);

    // Determinar vencedor/perdedor
    let statusA = "empate";
    let statusB = "empate";
    if (ptsA > ptsB) {
        statusA = "vencedor";
        statusB = "perdedor";
    } else if (ptsB > ptsA) {
        statusA = "perdedor";
        statusB = "vencedor";
    }

    // Valor financeiro (R$ 10,00 no mata-mata)
    const valorMM = 10;

    return `
        <div class="mm-confronto-row ${isMeuConfronto ? "meu-confronto" : ""}">
            <div class="mm-row-num">${numero}</div>
            <div class="mm-time-left">
                <img class="mm-escudo" 
                     src="${timeA.escudo || timeA.url_escudo_png || "https://via.placeholder.com/28"}" 
                     alt="${timeA.nomeTime || timeA.nome_time || ""}"
                     onerror="this.src='https://via.placeholder.com/28'">
                <div class="mm-time-info">
                    <div class="mm-time-nome">${timeA.nomeTime || timeA.nome_time || "Time A"}</div>
                    <div class="mm-cartoleiro">${timeA.nomeCartoleiro || timeA.nome_cartola || ""}</div>
                </div>
            </div>
            <div class="mm-pts-cell ${statusA}">
                <div class="mm-pts-value ${statusA}">${ptsA.toFixed(2)}</div>
                ${renderizarMiniModalFinanceiro(statusA, valorMM)}
            </div>
            <div class="mm-vs-cell">X</div>
            <div class="mm-pts-cell ${statusB}">
                <div class="mm-pts-value ${statusB}">${ptsB.toFixed(2)}</div>
                ${renderizarMiniModalFinanceiro(statusB, valorMM)}
            </div>
            <div class="mm-time-right">
                <div class="mm-time-info">
                    <div class="mm-time-nome">${timeB.nomeTime || timeB.nome_time || "Time B"}</div>
                    <div class="mm-cartoleiro">${timeB.nomeCartoleiro || timeB.nome_cartola || ""}</div>
                </div>
                <img class="mm-escudo" 
                     src="${timeB.escudo || timeB.url_escudo_png || "https://via.placeholder.com/28"}" 
                     alt="${timeB.nomeTime || timeB.nome_time || ""}"
                     onerror="this.src='https://via.placeholder.com/28'">
            </div>
        </div>
    `;
}

function renderizarMiniModalFinanceiro(status, valor) {
    if (status === "vencedor") {
        return `
            <div class="mm-financial-trigger" tabindex="0">
                <span class="material-icons ganho">monetization_on</span>
                <div class="mm-mini-modal ganho">Crédito: +R$ ${valor.toFixed(2)}</div>
            </div>
        `;
    } else if (status === "perdedor") {
        return `
            <div class="mm-financial-trigger" tabindex="0">
                <span class="material-icons perda">money_off</span>
                <div class="mm-mini-modal perda">Débito: -R$ ${valor.toFixed(2)}</div>
            </div>
        `;
    } else {
        // Empate - sem movimentação
        return `
            <div class="mm-financial-trigger" tabindex="0">
                <span class="material-icons empate-icon">balance</span>
                <div class="mm-mini-modal empate-bg">Empate: R$ 0,00</div>
            </div>
        `;
    }
}

function renderizarEstadoVazio(container) {
    // Atualizar header
    const timesCount = document.getElementById("mmTimesCount");
    if (timesCount) {
        timesCount.textContent = "Não configurado";
    }

    // Esconder seletor e nav
    const selector = document.querySelector(".mm-edition-selector");
    const nav = document.getElementById("mmPhasesNav");
    const info = document.getElementById("mmPhaseInfo");
    if (selector) selector.style.display = "none";
    if (nav) nav.style.display = "none";
    if (info) info.style.display = "none";

    container.innerHTML = `
        <div class="mm-empty-state">
            <div class="mm-empty-icon">⚔️</div>
            <h3>Mata-Mata</h3>
            <p>Este módulo ainda não foi configurado para esta liga.</p>
        </div>
    `;
}

console.log("[PARTICIPANTE-MATA-MATA] ✅ Módulo v3.0 carregado");

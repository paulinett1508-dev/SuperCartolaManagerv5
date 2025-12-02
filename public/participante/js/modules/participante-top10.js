// =====================================================================
// PARTICIPANTE-TOP10.JS - v4.0 (Design PRO)
// =====================================================================

console.log("[PARTICIPANTE-TOP10] 🏆 Carregando módulo v4.0...");

// =====================================================================
// CONFIGURAÇÃO DE VALORES BÔNUS/ÔNUS
// =====================================================================
const valoresBonusOnusPadrao = {
    mitos: { 1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 },
    micos: {
        1: -10,
        2: -9,
        3: -8,
        4: -7,
        5: -6,
        6: -5,
        7: -4,
        8: -3,
        9: -2,
        10: -1,
    },
};

const valoresBonusOnusCartoleirosSobral = {
    mitos: { 1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 },
    micos: {
        1: -10,
        2: -9,
        3: -8,
        4: -7,
        5: -6,
        6: -5,
        7: -4,
        8: -3,
        9: -2,
        10: -1,
    },
};

// Estado do módulo
let meuTimeIdGlobal = null;

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarTop10Participante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-TOP10] 🚀 Inicializando...", { ligaId, timeId });

    meuTimeIdGlobal = timeId;

    // Mostrar loading
    mostrarLoading(true);

    try {
        // Buscar rodada atual
        let rodadaAtual = 1;
        try {
            const resStatus = await fetch("/api/cartola/mercado/status");
            if (resStatus.ok) {
                const status = await resStatus.json();
                rodadaAtual = status.rodada_atual || 1;
            }
        } catch (e) {
            console.warn(
                "[PARTICIPANTE-TOP10] ⚠️ Falha ao buscar rodada atual",
            );
        }

        // Buscar cache do TOP10
        const cacheUrl = `/api/top10/cache/${ligaId}?rodada=${rodadaAtual}`;
        console.log("[PARTICIPANTE-TOP10] 📡 Buscando cache:", cacheUrl);

        const response = await fetch(cacheUrl);

        let mitos = [];
        let micos = [];

        if (response.ok) {
            const data = await response.json();

            if (data.cached && data.mitos && data.micos) {
                mitos = data.mitos;
                micos = data.micos;
                console.log(
                    `[PARTICIPANTE-TOP10] 💾 Cache encontrado: ${mitos.length} mitos, ${micos.length} micos`,
                );
            }
        }

        // Se não tem cache, tentar buscar dados brutos e calcular
        if (mitos.length === 0 || micos.length === 0) {
            console.log("[PARTICIPANTE-TOP10] 📊 Calculando MITOS/MICOS...");
            const resultado = await calcularMitosMicos(ligaId, rodadaAtual);
            mitos = resultado.mitos;
            micos = resultado.micos;
        }

        // Esconder loading
        mostrarLoading(false);

        if (mitos.length === 0 && micos.length === 0) {
            mostrarEstadoVazio(true);
            return;
        }

        // Determinar valores de bônus/ônus
        const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";
        const valoresBonusOnus = isLigaCartoleirosSobral
            ? valoresBonusOnusCartoleirosSobral
            : valoresBonusOnusPadrao;

        // Renderizar tabelas
        renderizarTabelasTop10(mitos, micos, timeId, valoresBonusOnus);

        console.log("[PARTICIPANTE-TOP10] ✅ TOP 10 carregado com sucesso");
    } catch (error) {
        console.error("[PARTICIPANTE-TOP10] ❌ Erro:", error);
        mostrarLoading(false);
        mostrarEstadoVazio(true);
    }
}

// Expor no window para compatibilidade
window.inicializarTop10Participante = inicializarTop10Participante;

// =====================================================================
// CALCULAR MITOS/MICOS (FALLBACK)
// =====================================================================
async function calcularMitosMicos(ligaId, rodadaAtual) {
    const mitos = [];
    const micos = [];

    try {
        const response = await fetch(`/api/ligas/${ligaId}/top10`);
        if (!response.ok) return { mitos: [], micos: [] };

        const dados = await response.json();

        const rodadas = Object.keys(dados)
            .map(Number)
            .filter((n) => !isNaN(n) && n <= rodadaAtual);

        for (const numRodada of rodadas) {
            const timesRodada = dados[numRodada];
            if (!timesRodada || timesRodada.length === 0) continue;

            const ordenados = [...timesRodada].sort(
                (a, b) => (b.pontos || 0) - (a.pontos || 0),
            );

            // Debug: ver estrutura do primeiro registro
            if (numRodada === rodadas[0] && ordenados.length > 0) {
                console.log(
                    "[PARTICIPANTE-TOP10] 🔍 Estrutura do registro:",
                    Object.keys(ordenados[0]),
                );
                console.log(
                    "[PARTICIPANTE-TOP10] 🔍 Primeiro registro:",
                    ordenados[0],
                );
            }

            // MITO = 1º lugar
            if (ordenados.length > 0) {
                const mito = ordenados[0];
                const clubeId = mito.clube_id || null;
                const escudo = mito.escudo_time_do_coracao || mito.escudo || "";

                mitos.push({
                    rodada: numRodada,
                    timeId: mito.timeId || mito.time_id,
                    nome_cartola: mito.nome_cartola || "N/D",
                    nome_time: mito.nome_time || "N/D",
                    pontos: parseFloat(mito.pontos) || 0,
                    escudo: escudo,
                    clube_id: clubeId,
                });
            }

            // MICO = último lugar
            if (ordenados.length > 1) {
                const mico = ordenados[ordenados.length - 1];
                const clubeId = mico.clube_id || null;
                const escudo = mico.escudo_time_do_coracao || mico.escudo || "";

                micos.push({
                    rodada: numRodada,
                    timeId: mico.timeId || mico.time_id,
                    nome_cartola: mico.nome_cartola || "N/D",
                    nome_time: mico.nome_time || "N/D",
                    pontos: parseFloat(mico.pontos) || 0,
                    escudo: escudo,
                    clube_id: clubeId,
                });
            }
        }

        mitos.sort((a, b) => b.pontos - a.pontos);
        micos.sort((a, b) => a.pontos - b.pontos);
    } catch (error) {
        console.error("[PARTICIPANTE-TOP10] Erro ao calcular:", error);
    }

    return { mitos: mitos.slice(0, 10), micos: micos.slice(0, 10) };
}

// =====================================================================
// RENDERIZAÇÃO - TABELAS MITOS E MICOS
// =====================================================================
function renderizarTabelasTop10(mitos, micos, meuTimeId, valoresBonusOnus) {
    const container = document.getElementById("top10Grid");
    if (!container) return;

    const meuTimeIdNum = Number(meuTimeId);

    const html = `
        <!-- TABELA MITOS -->
        <div class="top10-tabela-wrapper">
            <div class="top10-tabela-header mitos">
                <span class="top10-tabela-icone">🎩</span>
                <span>TOP 10 MITOS</span>
            </div>
            ${gerarTabelaHTML(mitos, "mitos", meuTimeIdNum, valoresBonusOnus)}
        </div>

        <!-- TABELA MICOS -->
        <div class="top10-tabela-wrapper">
            <div class="top10-tabela-header micos">
                <span class="top10-tabela-icone">😢</span>
                <span>TOP 10 MICOS</span>
            </div>
            ${gerarTabelaHTML(micos, "micos", meuTimeIdNum, valoresBonusOnus)}
        </div>
    `;

    container.innerHTML = html;
}

function gerarTabelaHTML(dados, tipo, meuTimeIdNum, valoresBonusOnus) {
    if (!dados || dados.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <p>Nenhum dado disponível para ${tipo === "mitos" ? "MITOS" : "MICOS"}</p>
            </div>
        `;
    }

    const valoresBonus =
        tipo === "mitos" ? valoresBonusOnus.mitos : valoresBonusOnus.micos;
    const isMitos = tipo === "mitos";

    return `
        <table class="tabela-top10-pro">
            <thead>
                <tr>
                    <th style="width: 45px;">Pos</th>
                    <th class="col-nome">Cartoleiro</th>
                    <th style="width: 36px;">🏠</th>
                    <th style="width: 65px;">Pts</th>
                    <th style="width: 45px;">Rod</th>
                    <th style="width: 70px;">${isMitos ? "Bônus" : "Ônus"}</th>
                    <th style="width: 40px;">Time</th>
                </tr>
            </thead>
            <tbody>
                ${dados
                    .map((item, index) => {
                        const posicao = index + 1;
                        const timeIdNum = Number(item.timeId || item.time_id);
                        const isMeuTime = timeIdNum === meuTimeIdNum;
                        const valorBonus = valoresBonus[posicao] ?? 0;

                        // Classes da linha
                        let rowClass = isMeuTime ? "meu-time" : "";

                        // Badge da posição
                        let posicaoBadge = "";
                        if (posicao === 1 && isMitos) {
                            posicaoBadge = `<span class="posicao-badge-top10 gold">👑</span>`;
                        } else if (posicao === 1 && !isMitos) {
                            posicaoBadge = `<span class="posicao-badge-top10 skull">💀</span>`;
                        } else if (posicao === 2) {
                            posicaoBadge = `<span class="posicao-badge-top10 silver">${posicao}º</span>`;
                        } else if (posicao === 3) {
                            posicaoBadge = `<span class="posicao-badge-top10 bronze">${posicao}º</span>`;
                        } else {
                            posicaoBadge = `<span class="posicao-badge-top10 default">${posicao}º</span>`;
                        }

                        // Valor formatado
                        const valorClass =
                            valorBonus >= 0 ? "valor-bonus" : "valor-onus";
                        const valorFormatado =
                            valorBonus >= 0
                                ? `+R$ ${valorBonus.toFixed(2)}`
                                : `-R$ ${Math.abs(valorBonus).toFixed(2)}`;

                        // Escudo: priorizar URL externa, depois clube_id local
                        let escudoHTML = `<span class="escudo-placeholder">🛡️</span>`;
                        if (item.escudo && item.escudo.startsWith("http")) {
                            // URL externa (do Cartola)
                            escudoHTML = `<img src="${item.escudo}" alt="" class="escudo-top10" onerror="this.parentElement.innerHTML='🛡️'"/>`;
                        } else if (item.clube_id) {
                            // ID do clube local
                            escudoHTML = `<img src="/escudos/${item.clube_id}.png" alt="" class="escudo-top10" onerror="this.parentElement.innerHTML='🛡️'"/>`;
                        }

                        return `
                        <tr class="${rowClass}">
                            <td>${posicaoBadge}</td>
                            <td class="nome-cell-top10">
                                <span class="nome-texto">${item.nome_cartola || "N/D"}</span>
                            </td>
                            <td class="escudo-cell">${escudoHTML}</td>
                            <td class="pontos-valor">${(item.pontos ?? 0).toFixed(2)}</td>
                            <td class="rodada-badge">R${item.rodada ?? "?"}</td>
                            <td class="${valorClass}">${valorFormatado}</td>
                            <td>
                                <button class="btn-ver-time" onclick="window.abrirModalTop10('${item.nome_time}', ${item.rodada}, ${item.pontos})">
                                    👁️
                                </button>
                            </td>
                        </tr>
                    `;
                    })
                    .join("")}
            </tbody>
        </table>
    `;
}

// =====================================================================
// MODAL
// =====================================================================
window.abrirModalTop10 = function (nomeTime, rodada, pontos) {
    const modal = document.getElementById("modalJogadores");
    const nomeEl = document.getElementById("modalTimeNome");
    const rodadaEl = document.getElementById("modalRodadaInfo");
    const pontosEl = document.getElementById("modalPontuacao");

    if (modal && nomeEl && rodadaEl && pontosEl) {
        nomeEl.textContent = nomeTime || "Time";
        rodadaEl.textContent = `Rodada ${rodada || "?"}`;
        pontosEl.textContent = (pontos || 0).toFixed(2);
        modal.style.display = "flex";
    }
};

window.fecharModalTop10 = function () {
    const modal = document.getElementById("modalJogadores");
    if (modal) {
        modal.style.display = "none";
    }
};

// Fechar modal ao clicar fora
document.addEventListener("click", (e) => {
    const modal = document.getElementById("modalJogadores");
    if (modal && e.target === modal) {
        modal.style.display = "none";
    }
});

// =====================================================================
// TOAST
// =====================================================================
function mostrarToast(msg) {
    const toast = document.getElementById("toastTop10");
    const msgEl = document.getElementById("toastTop10Msg");

    if (toast && msgEl) {
        msgEl.textContent = msg;
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
    const loading = document.getElementById("top10Loading");
    const grid = document.getElementById("top10Grid");

    if (loading) loading.style.display = show ? "flex" : "none";
    if (grid) grid.style.display = show ? "none" : "flex";
}

function mostrarEstadoVazio(show) {
    const empty = document.getElementById("top10Empty");
    const grid = document.getElementById("top10Grid");

    if (empty) empty.style.display = show ? "block" : "none";
    if (grid) grid.style.display = show ? "none" : "flex";
}

console.log("[PARTICIPANTE-TOP10] ✅ Módulo v4.0 carregado");

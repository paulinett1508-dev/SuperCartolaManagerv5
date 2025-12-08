// =====================================================================
// PARTICIPANTE-TOP10.JS - v4.4 (Card Resumo ao final)
// =====================================================================

console.log("[PARTICIPANTE-TOP10] 🏆 Carregando módulo v4.4...");

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

let meuTimeIdGlobal = null;

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarTop10Participante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-TOP10] 🚀 Inicializando v4.3...", {
        ligaId,
        timeId,
    });

    meuTimeIdGlobal = timeId;
    mostrarLoading(true);

    try {
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

        if (mitos.length === 0 || micos.length === 0) {
            console.log("[PARTICIPANTE-TOP10] 📊 Calculando MITOS/MICOS...");
            const resultado = await calcularMitosMicos(ligaId, rodadaAtual);
            mitos = resultado.mitos;
            micos = resultado.micos;
        }

        mostrarLoading(false);

        if (mitos.length === 0 && micos.length === 0) {
            mostrarEstadoVazio(true);
            return;
        }

        const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";
        const valoresBonusOnus = isLigaCartoleirosSobral
            ? valoresBonusOnusCartoleirosSobral
            : valoresBonusOnusPadrao;

        renderizarTabelasTop10(mitos, micos, timeId, valoresBonusOnus);

        // Renderizar card de resumo
        renderizarCardResumo(mitos, micos, timeId, valoresBonusOnus);

        console.log("[PARTICIPANTE-TOP10] ✅ TOP 10 carregado com sucesso");
    } catch (error) {
        console.error("[PARTICIPANTE-TOP10] ❌ Erro:", error);
        mostrarLoading(false);
        mostrarEstadoVazio(true);
    }
}

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

            // ✅ v4.2: Filtrar apenas ativos para ranking
            const timesAtivos = timesRodada.filter((t) => t.ativo !== false);
            const ordenados = [...timesAtivos].sort(
                (a, b) => (b.pontos || 0) - (a.pontos || 0),
            );

            if (ordenados.length > 0) {
                const mito = ordenados[0];
                mitos.push({
                    rodada: numRodada,
                    timeId: mito.timeId || mito.time_id,
                    nome_cartola: mito.nome_cartola || "N/D",
                    nome_time: mito.nome_time || "N/D",
                    pontos: parseFloat(mito.pontos) || 0,
                    escudo: mito.escudo_time_do_coracao || mito.escudo || "",
                    clube_id: mito.clube_id || null,
                    ativo: mito.ativo !== false,
                });
            }

            if (ordenados.length > 1) {
                const mico = ordenados[ordenados.length - 1];
                micos.push({
                    rodada: numRodada,
                    timeId: mico.timeId || mico.time_id,
                    nome_cartola: mico.nome_cartola || "N/D",
                    nome_time: mico.nome_time || "N/D",
                    pontos: parseFloat(mico.pontos) || 0,
                    escudo: mico.escudo_time_do_coracao || mico.escudo || "",
                    clube_id: mico.clube_id || null,
                    ativo: mico.ativo !== false,
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

    // ✅ v4.2: Separar ativos de inativos em cada lista
    const mitosAtivos = mitos.filter((m) => m.ativo !== false);
    const mitosInativos = mitos.filter((m) => m.ativo === false);
    const micosAtivos = micos.filter((m) => m.ativo !== false);
    const micosInativos = micos.filter((m) => m.ativo === false);

    const html = `
        <!-- TABELA MITOS -->
        <div class="top10-tabela-wrapper">
            <div class="top10-tabela-header mitos">
                <span class="material-symbols-outlined">emoji_events</span>
                <span>TOP 10 MITOS</span>
            </div>
            ${gerarTabelaHTML(mitosAtivos, "mitos", meuTimeIdNum, valoresBonusOnus, false)}
            ${
                mitosInativos.length > 0
                    ? `
                <div class="top10-divisor-inativos">
                    <span class="material-symbols-outlined">person_off</span>
                    <span>Participantes Inativos (${mitosInativos.length})</span>
                </div>
                ${gerarTabelaHTML(mitosInativos, "mitos", meuTimeIdNum, valoresBonusOnus, true)}
            `
                    : ""
            }
        </div>

        <!-- TABELA MICOS -->
        <div class="top10-tabela-wrapper">
            <div class="top10-tabela-header micos">
                <span class="material-symbols-outlined">thumb_down</span>
                <span>TOP 10 MICOS</span>
            </div>
            ${gerarTabelaHTML(micosAtivos, "micos", meuTimeIdNum, valoresBonusOnus, false)}
            ${
                micosInativos.length > 0
                    ? `
                <div class="top10-divisor-inativos">
                    <span class="material-symbols-outlined">person_off</span>
                    <span>Participantes Inativos (${micosInativos.length})</span>
                </div>
                ${gerarTabelaHTML(micosInativos, "micos", meuTimeIdNum, valoresBonusOnus, true)}
            `
                    : ""
            }
        </div>
    `;

    container.innerHTML = html;
}

function gerarTabelaHTML(
    dados,
    tipo,
    meuTimeIdNum,
    valoresBonusOnus,
    isInativo = false,
) {
    if (!dados || dados.length === 0) {
        return isInativo
            ? ""
            : `
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
            ${
                !isInativo
                    ? `
            <thead>
                <tr>
                    <th style="width: 45px;">Pos</th>
                    <th class="col-nome">Cartoleiro</th>
                    <th style="width: 36px;"><span class="material-symbols-outlined">home</span></th>
                    <th style="width: 65px;">Pts</th>
                    <th style="width: 45px;">Rod</th>
                    <th style="width: 70px;">${isMitos ? "Bônus" : "Ônus"}</th>
                    <th style="width: 40px;">Time</th>
                </tr>
            </thead>
            `
                    : ""
            }
            <tbody>
                ${dados
                    .map((item, index) => {
                        const posicao = isInativo ? null : index + 1;
                        const timeIdNum = Number(item.timeId || item.time_id);
                        const isMeuTime = timeIdNum === meuTimeIdNum;
                        const valorBonus = isInativo
                            ? 0
                            : (valoresBonus[posicao] ?? 0);

                        // Classe diferente para MITOS (verde) e MICOS (vermelho)
                        let rowClass = "";
                        if (isMeuTime && !isInativo) {
                            rowClass = isMitos
                                ? "meu-time-mitos"
                                : "meu-time-micos";
                        }
                        if (isInativo) rowClass += " linha-inativa";

                        // Badge da posição com Material Icons
                        let posicaoBadge = "";
                        if (isInativo) {
                            posicaoBadge = `<span class="posicao-badge-top10 default" style="color: #6b7280;">—</span>`;
                        } else if (posicao === 1 && isMitos) {
                            posicaoBadge = `<span class="posicao-badge-top10 gold"><span class="material-symbols-outlined">trophy</span></span>`;
                        } else if (posicao === 1 && !isMitos) {
                            posicaoBadge = `<span class="posicao-badge-top10 skull"><span class="material-symbols-outlined">skull</span></span>`;
                        } else {
                            posicaoBadge = `<span class="posicao-badge-top10 default">${posicao}º</span>`;
                        }

                        // Valor formatado
                        const valorClass = isInativo
                            ? "text-gray-600"
                            : isMitos
                              ? "valor-bonus"
                              : "valor-onus";
                        const valorAbs = Math.abs(valorBonus).toFixed(2);
                        const valorFormatado = isInativo
                            ? "—"
                            : isMitos
                              ? `+${valorAbs}`
                              : `-${valorAbs}`;

                        // Escudo com Material Icon fallback
                        let escudoHTML = `<span class="escudo-placeholder"><span class="material-symbols-outlined">shield</span></span>`;
                        if (item.escudo && item.escudo.startsWith("http")) {
                            escudoHTML = `<img src="${item.escudo}" alt="" class="escudo-top10" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>shield</span>'"/>`;
                        } else if (item.clube_id) {
                            escudoHTML = `<img src="/escudos/${item.clube_id}.png" alt="" class="escudo-top10" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>shield</span>'"/>`;
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
                                    <span class="material-symbols-outlined">visibility</span>
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
// CARD RESUMO DESEMPENHO
// =====================================================================
function renderizarCardResumo(mitos, micos, meuTimeId, valoresBonusOnus) {
    const card = document.getElementById("top10ResumoCard");
    if (!card) return;

    const meuTimeIdNum = Number(meuTimeId);

    // Contar aparições do meu time
    let countMitos = 0;
    let totalBonus = 0;
    let countMicos = 0;
    let totalOnus = 0;

    // Verificar MITOS
    mitos.forEach((item, index) => {
        const timeIdNum = Number(item.timeId || item.time_id);
        if (timeIdNum === meuTimeIdNum && item.ativo !== false) {
            countMitos++;
            const posicao = index + 1;
            totalBonus += valoresBonusOnus.mitos[posicao] || 0;
        }
    });

    // Verificar MICOS
    micos.forEach((item, index) => {
        const timeIdNum = Number(item.timeId || item.time_id);
        if (timeIdNum === meuTimeIdNum && item.ativo !== false) {
            countMicos++;
            const posicao = index + 1;
            totalOnus += Math.abs(valoresBonusOnus.micos[posicao] || 0);
        }
    });

    // Calcular saldo
    const saldo = totalBonus - totalOnus;

    // Atualizar DOM
    document.getElementById("resumoMitosCount").textContent = countMitos;
    document.getElementById("resumoMicosCount").textContent = countMicos;
    document.getElementById("resumoBonusTotal").textContent =
        `+R$ ${totalBonus.toFixed(2)}`;
    document.getElementById("resumoOnusTotal").textContent =
        `-R$ ${totalOnus.toFixed(2)}`;

    const saldoEl = document.getElementById("resumoSaldo");
    if (saldo >= 0) {
        saldoEl.textContent = `+R$ ${saldo.toFixed(2)}`;
        saldoEl.className = "top10-resumo-total-value positivo";
    } else {
        saldoEl.textContent = `-R$ ${Math.abs(saldo).toFixed(2)}`;
        saldoEl.className = "top10-resumo-total-value negativo";
    }

    // Mostrar card apenas se tiver alguma aparição
    if (countMitos > 0 || countMicos > 0) {
        card.style.display = "block";
    }

    console.log(
        `[PARTICIPANTE-TOP10] 📊 Resumo: ${countMitos} MITOS (+R$${totalBonus}), ${countMicos} MICOS (-R$${totalOnus}), Saldo: R$${saldo}`,
    );
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
    if (modal) modal.style.display = "none";
};

document.addEventListener("click", (e) => {
    const modal = document.getElementById("modalJogadores");
    if (modal && e.target === modal) modal.style.display = "none";
});

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

console.log(
    "[PARTICIPANTE-TOP10] ✅ Módulo v4.3 carregado (Material Icons + Card Resumo)",
);

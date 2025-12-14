// =====================================================================
// PARTICIPANTE-TOP10.JS - v4.8 (Padronização Escudos)
// =====================================================================
// ✅ v4.8: Padronização de escudos - sempre usa brasão do time do cartoleiro
// ✅ v4.7: Cache-first com IndexedDB para carregamento instantâneo
// ✅ v4.6: Fix rodada 38 (CAMPEONATO_ENCERRADO)
// ✅ v4.5: Destaque visual para os 10 primeiros (verdadeiro TOP 10)
//    - Borda dourada/vermelha nos 10 primeiros
//    - Separador visual entre TOP 10 e demais
//    - Badge "TOP 10" nos campeões
// ✅ v4.4: Card Resumo ao final
// ✅ v4.3: Filtro de times ativos
// ✅ v4.2: Cache batch

if (window.Log) Log.info("[PARTICIPANTE-TOP10] 🏆 Carregando módulo v4.8...");

// =====================================================================
// CONFIGURAÇÃO DO CAMPEONATO 2025
// =====================================================================
const RODADA_FINAL_CAMPEONATO = 38; // Última rodada do Brasileirão 2025
const CAMPEONATO_ENCERRADO = true; // Flag: temporada finalizada

// =====================================================================
// CONFIGURAÇÃO DE VALORES BÔNUS/ÔNUS
// =====================================================================
const valoresBonusOnusSuperCartola = {
    mitos: {
        1: 30,
        2: 28,
        3: 26,
        4: 24,
        5: 22,
        6: 20,
        7: 18,
        8: 16,
        9: 14,
        10: 12,
    },
    micos: {
        1: -30,
        2: -28,
        3: -26,
        4: -24,
        5: -22,
        6: -20,
        7: -18,
        8: -16,
        9: -14,
        10: -12,
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
    if (window.Log)
        Log.info("[PARTICIPANTE-TOP10] 🚀 Inicializando v4.7...", {
            ligaId,
            timeId,
        });

    meuTimeIdGlobal = timeId;

    // ✅ v4.7: CACHE-FIRST - Tentar carregar do IndexedDB primeiro
    const cache = window.ParticipanteCache;
    let usouCache = false;
    let dadosCache = null;

    // Selecionar valores corretos por liga (necessário para renderização)
    let valoresBonusOnus;
    if (ligaId === "684cb1c8af923da7c7df51de") {
        valoresBonusOnus = valoresBonusOnusSuperCartola;
    } else if (ligaId === "684d821cf1a7ae16d1f89572") {
        valoresBonusOnus = valoresBonusOnusCartoleirosSobral;
    } else {
        valoresBonusOnus = valoresBonusOnusCartoleirosSobral; // Fallback
    }

    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    if (cache && window.OfflineCache) {
        try {
            const top10Cache = await window.OfflineCache.get('top10', ligaId, true);
            if (top10Cache && top10Cache.mitos && top10Cache.micos) {
                usouCache = true;
                dadosCache = top10Cache;

                // Renderizar IMEDIATAMENTE com dados do cache
                if (window.Log)
                    Log.info(`[PARTICIPANTE-TOP10] ⚡ Cache IndexedDB: ${top10Cache.mitos.length} mitos, ${top10Cache.micos.length} micos`);

                renderizarTabelasTop10(top10Cache.mitos, top10Cache.micos, timeId, valoresBonusOnus);
                renderizarCardResumo(top10Cache.mitos, top10Cache.micos, timeId, valoresBonusOnus);
            }
        } catch (e) {
            if (window.Log) Log.warn("[PARTICIPANTE-TOP10] ⚠️ Erro ao ler cache:", e);
        }
    }

    // Se não tem cache, mostrar loading
    if (!usouCache) {
        mostrarLoading(true);
    }

    try {
        // ✅ v4.6: Determinar rodada correta considerando fim do campeonato
        let ultimaRodadaCompleta = 1;

        if (CAMPEONATO_ENCERRADO) {
            // Campeonato encerrado: última rodada = RODADA_FINAL_CAMPEONATO (38)
            ultimaRodadaCompleta = RODADA_FINAL_CAMPEONATO;
            if (window.Log)
                Log.info(
                    `[PARTICIPANTE-TOP10] 🏁 Campeonato ENCERRADO - usando rodada ${RODADA_FINAL_CAMPEONATO}`,
                );
        } else {
            // Campeonato em andamento: verificar mercado
            try {
                const resStatus = await fetch("/api/cartola/mercado/status");
                if (resStatus.ok) {
                    const status = await resStatus.json();
                    const rodadaAtual = status.rodada_atual || 1;
                    const mercadoAberto =
                        status.mercado_aberto || status.status_mercado === 1;

                    if (mercadoAberto) {
                        ultimaRodadaCompleta = Math.max(1, rodadaAtual - 1);
                    } else {
                        ultimaRodadaCompleta = rodadaAtual;
                    }
                }
            } catch (e) {
                if (window.Log)
                    Log.warn(
                        "[PARTICIPANTE-TOP10] ⚠️ Falha ao buscar rodada atual",
                    );
            }
        }

        // FASE 2: ATUALIZAÇÃO EM BACKGROUND (Fetch API)
        const cacheUrl = `/api/top10/cache/${ligaId}?rodada=${ultimaRodadaCompleta}`;
        if (window.Log)
            Log.info("[PARTICIPANTE-TOP10] 📡 Buscando API:", cacheUrl);

        const response = await fetch(cacheUrl);
        let mitos = [];
        let micos = [];

        if (response.ok) {
            const data = await response.json();
            if (data.cached && data.mitos && data.micos) {
                mitos = data.mitos;
                micos = data.micos;
                if (window.Log)
                    Log.info(
                        `[PARTICIPANTE-TOP10] 💾 API: ${mitos.length} mitos, ${micos.length} micos`,
                    );
            }
        }

        if (mitos.length === 0 || micos.length === 0) {
            if (window.Log)
                Log.info("[PARTICIPANTE-TOP10] 📊 Calculando MITOS/MICOS...");
            const resultado = await calcularMitosMicos(ligaId, ultimaRodadaCompleta);
            mitos = resultado.mitos;
            micos = resultado.micos;
        }

        mostrarLoading(false);

        if (mitos.length === 0 && micos.length === 0) {
            if (!usouCache) {
                mostrarEstadoVazio(true);
            }
            return;
        }

        // ✅ v4.7: Salvar no IndexedDB para próxima visita
        if (window.OfflineCache && mitos.length > 0) {
            try {
                await window.OfflineCache.set('top10', ligaId, { mitos, micos });
                if (window.Log) Log.info("[PARTICIPANTE-TOP10] 💾 Cache IndexedDB atualizado");
            } catch (e) {
                if (window.Log) Log.warn("[PARTICIPANTE-TOP10] ⚠️ Erro ao salvar cache:", e);
            }
        }

        // Só re-renderizar se dados mudaram ou se não usou cache antes
        const dadosMudaram = !usouCache ||
            !dadosCache ||
            JSON.stringify(dadosCache.mitos?.slice(0,3)) !== JSON.stringify(mitos.slice(0,3)) ||
            JSON.stringify(dadosCache.micos?.slice(0,3)) !== JSON.stringify(micos.slice(0,3));

        if (dadosMudaram) {
            renderizarTabelasTop10(mitos, micos, timeId, valoresBonusOnus);
            renderizarCardResumo(mitos, micos, timeId, valoresBonusOnus);
            if (usouCache && window.Log) {
                Log.info("[PARTICIPANTE-TOP10] 🔄 Re-renderizado com dados frescos");
            }
        } else if (window.Log) {
            Log.info("[PARTICIPANTE-TOP10] ✅ Dados iguais, mantendo renderização do cache");
        }

        if (window.Log)
            Log.info("[PARTICIPANTE-TOP10] ✅ TOP 10 carregado com sucesso");
    } catch (error) {
        if (window.Log) Log.error("[PARTICIPANTE-TOP10] ❌ Erro:", error);
        mostrarLoading(false);
        if (!usouCache) {
            mostrarEstadoVazio(true);
        }
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
                    // ✅ v4.8: Priorizar escudo do time (url_escudo_png), NÃO time do coração
                    escudo: mito.escudo || mito.url_escudo_png || "",
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
                    // ✅ v4.8: Priorizar escudo do time (url_escudo_png), NÃO time do coração
                    escudo: mico.escudo || mico.url_escudo_png || "",
                    ativo: mico.ativo !== false,
                });
            }
        }

        mitos.sort((a, b) => b.pontos - a.pontos);
        micos.sort((a, b) => a.pontos - b.pontos);
    } catch (error) {
        if (window.Log)
            Log.error("[PARTICIPANTE-TOP10] Erro ao calcular:", error);
    }

    return { mitos, micos };
}

// =====================================================================
// RENDERIZAÇÃO - TABELAS MITOS E MICOS (v4.5 com destaque TOP 10)
// =====================================================================
function renderizarTabelasTop10(mitos, micos, meuTimeId, valoresBonusOnus) {
    const container = document.getElementById("top10Grid");
    if (!container) return;

    const meuTimeIdNum = Number(meuTimeId);

    // Separar ativos de inativos
    const mitosAtivos = mitos.filter((m) => m.ativo !== false);
    const mitosInativos = mitos.filter((m) => m.ativo === false);
    const micosAtivos = micos.filter((m) => m.ativo !== false);
    const micosInativos = micos.filter((m) => m.ativo === false);

    container.innerHTML = `
        <!-- MITOS -->
        <div class="top10-section">
            ${gerarTabelaTop10(mitosAtivos, true, meuTimeIdNum, valoresBonusOnus.mitos)}
            ${
                mitosInativos.length > 0
                    ? `
                <div class="inativos-separator">
                    <span class="material-symbols-outlined">person_off</span>
                    Times Inativos (${mitosInativos.length})
                </div>
                ${gerarTabelaTop10(mitosInativos, true, meuTimeIdNum, valoresBonusOnus.mitos, true)}
            `
                    : ""
            }
        </div>

        <!-- MICOS -->
        <div class="top10-section">
            ${gerarTabelaTop10(micosAtivos, false, meuTimeIdNum, valoresBonusOnus.micos)}
            ${
                micosInativos.length > 0
                    ? `
                <div class="inativos-separator">
                    <span class="material-symbols-outlined">person_off</span>
                    Times Inativos (${micosInativos.length})
                </div>
                ${gerarTabelaTop10(micosInativos, false, meuTimeIdNum, valoresBonusOnus.micos, true)}
            `
                    : ""
            }
        </div>
    `;
}

// =====================================================================
// GERAR TABELA TOP10 (v4.5 com destaque visual)
// =====================================================================
function gerarTabelaTop10(
    dados,
    isMitos,
    meuTimeIdNum,
    valoresBonus,
    isInativo = false,
) {
    if (!dados || dados.length === 0) {
        return `<div class="top10-empty">Nenhum registro</div>`;
    }

    // ✅ v4.5: Separar TOP 10 dos demais
    const top10 = dados.slice(0, 10);
    const restante = dados.slice(10);

    let html = "";

    // === SEÇÃO TOP 10 (com destaque) ===
    if (top10.length > 0) {
        html += `
            <div class="top10-destaque-wrapper ${isMitos ? "mitos" : "micos"}">
                <div class="top10-badge-header">
                    <span class="material-symbols-outlined">${isMitos ? "military_tech" : "dangerous"}</span>
                    <span>TOP 10 ${isMitos ? "MITOS" : "MICOS"}</span>
                </div>
                <table class="top10-table destaque">
                    <thead>
                        <tr>
                            <th style="width: 40px;">Pos</th>
                            <th class="col-nome">Nome</th>
                            <th style="width: 32px;"></th>
                            <th style="width: 60px;">Pts</th>
                            <th style="width: 40px;">Rod</th>
                            <th style="width: 65px;">${isMitos ? "Bônus" : "Ônus"}</th>
                            <th style="width: 36px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${top10.map((item, index) => gerarLinhaTabela(item, index, isMitos, meuTimeIdNum, valoresBonus, isInativo, true)).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    // === SEÇÃO RESTANTE (sem destaque) ===
    if (restante.length > 0 && !isInativo) {
        html += `
            <div class="top10-restante-wrapper">
                <div class="top10-restante-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <span class="material-symbols-outlined chevron-icon">expand_more</span>
                    <span>Mais ${restante.length} ${isMitos ? "mitos" : "micos"} (11º ao ${10 + restante.length}º)</span>
                </div>
                <div class="top10-restante-content">
                    <table class="top10-table secundaria">
                        <tbody>
                            ${restante.map((item, index) => gerarLinhaTabela(item, index + 10, isMitos, meuTimeIdNum, {}, false, false)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    return html;
}

// =====================================================================
// GERAR LINHA DA TABELA
// =====================================================================
function gerarLinhaTabela(
    item,
    index,
    isMitos,
    meuTimeIdNum,
    valoresBonus,
    isInativo,
    isTop10,
) {
    const posicao = isInativo ? null : index + 1;
    const timeIdNum = Number(item.timeId || item.time_id);
    const isMeuTime = timeIdNum === meuTimeIdNum;
    const valorBonus = isTop10 && !isInativo ? (valoresBonus[posicao] ?? 0) : 0;

    // Classes da linha
    let rowClass = "";
    if (isMeuTime && !isInativo) {
        rowClass = isMitos ? "meu-time-mitos" : "meu-time-micos";
    }
    if (isInativo) rowClass += " linha-inativa";
    if (isTop10 && !isInativo) rowClass += " linha-top10";

    // Badge da posição
    let posicaoBadge = "";
    if (isInativo) {
        posicaoBadge = `<span class="posicao-badge-top10 default" style="color: #6b7280;">—</span>`;
    } else if (posicao === 1 && isMitos) {
        posicaoBadge = `<span class="posicao-badge-top10 gold"><span class="material-symbols-outlined">trophy</span></span>`;
    } else if (posicao === 1 && !isMitos) {
        posicaoBadge = `<span class="posicao-badge-top10 skull"><span class="material-symbols-outlined">skull</span></span>`;
    } else if (posicao <= 3 && isTop10) {
        const medalColor = posicao === 2 ? "#C0C0C0" : "#CD7F32";
        posicaoBadge = `<span class="posicao-badge-top10 medal" style="color: ${medalColor};">${posicao}º</span>`;
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
    const valorFormatado =
        isInativo || !isTop10 ? "—" : isMitos ? `+${valorAbs}` : `-${valorAbs}`;

    // ✅ v4.8: Escudo padronizado - usa apenas o brasão do time do cartoleiro
    // NÃO usa clube_id (time do coração) como fallback
    let escudoHTML = `<span class="escudo-placeholder"><span class="material-symbols-outlined">shield</span></span>`;
    if (item.escudo && item.escudo.startsWith("http")) {
        escudoHTML = `<img src="${item.escudo}" alt="" class="escudo-top10" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>shield</span>'"/>`;
    }

    return `
        <tr class="${rowClass}">
            <td>${posicaoBadge}</td>
            <td class="nome-cell-top10">
                <div class="nome-wrapper-top10">
                    <span class="nome-cartoleiro">${item.nome_cartola || "N/D"}</span>
                    <span class="nome-time">${item.nome_time || "Time sem nome"}</span>
                </div>
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
}

// =====================================================================
// CARD RESUMO DESEMPENHO (TOP 10 Histórico - Bônus/Ônus)
// =====================================================================
// NOTA: Este card mostra quantas vezes o usuário aparece no TOP 10 HISTÓRICO
// de maiores/menores pontuações do campeonato (gera bônus/ônus financeiro).
// É DIFERENTE do módulo Rodadas que conta quantas vezes foi 1º/último na rodada.
// =====================================================================
function renderizarCardResumo(mitos, micos, meuTimeId, valoresBonusOnus) {
    const card = document.getElementById("top10ResumoCard");
    if (!card) return;

    const meuTimeIdNum = Number(meuTimeId);

    let countMitos = 0;
    let totalBonus = 0;
    let countMicos = 0;
    let totalOnus = 0;

    // Verificar MITOS - apenas TOP 10 gera bônus
    mitos.forEach((item, index) => {
        const timeIdNum = Number(item.timeId || item.time_id);
        if (timeIdNum === meuTimeIdNum && item.ativo !== false) {
            const posicao = index + 1;
            // Só conta para bônus se estiver no TOP 10
            if (posicao <= 10) {
                countMitos++;
                totalBonus += valoresBonusOnus.mitos[posicao] || 0;
            }
        }
    });

    // Verificar MICOS - apenas TOP 10 gera ônus
    micos.forEach((item, index) => {
        const timeIdNum = Number(item.timeId || item.time_id);
        if (timeIdNum === meuTimeIdNum && item.ativo !== false) {
            const posicao = index + 1;
            // Só conta para ônus se estiver no TOP 10
            if (posicao <= 10) {
                countMicos++;
                totalOnus += Math.abs(valoresBonusOnus.micos[posicao] || 0);
            }
        }
    });

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

    // Sempre mostrar o card
    card.style.display = "block";

    if (window.Log)
        Log.info(
            `[PARTICIPANTE-TOP10] 📊 Resumo TOP 10 Histórico: ${countMitos} MITOS (+R$${totalBonus}), ${countMicos} MICOS (-R$${totalOnus}), Saldo: R$${saldo}`,
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

if (window.Log)
    Log.info(
        "[PARTICIPANTE-TOP10] ✅ Módulo v4.8 carregado (Escudos Padronizados)",
    );

// =====================================================================
// PARTICIPANTE-TOP10.JS - v3.0 (MITOS/MICOS IGUAL AO ADMIN)
// =====================================================================

console.log("[PARTICIPANTE-TOP10] 🔄 Carregando módulo v3.0...");

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

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarTop10Participante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-TOP10] 🚀 Inicializando...", { ligaId, timeId });

    const container = document.getElementById("top10Grid");
    if (!container) {
        console.error("[PARTICIPANTE-TOP10] ❌ Container não encontrado");
        return;
    }

    // Loading state
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="spinner" style="margin: 0 auto 16px;"></div>
            <p style="color: #999;">Carregando TOP 10...</p>
        </div>
    `;

    try {
        // ✅ Buscar rodada atual
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

        // ✅ Buscar cache do TOP10 (mesmo endpoint do admin)
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

        if (mitos.length === 0 && micos.length === 0) {
            throw new Error("Nenhum dado disponível");
        }

        // Determinar valores de bônus/ônus
        const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";
        const valoresBonusOnus = isLigaCartoleirosSobral
            ? valoresBonusOnusCartoleirosSobral
            : valoresBonusOnusPadrao;

        // ✅ Renderizar tabelas MITOS e MICOS
        renderizarTabelasTop10(
            container,
            mitos,
            micos,
            timeId,
            valoresBonusOnus,
        );

        console.log("[PARTICIPANTE-TOP10] ✅ TOP 10 carregado com sucesso");
    } catch (error) {
        console.error("[PARTICIPANTE-TOP10] ❌ Erro:", error);
        mostrarErro(container, error.message);
    }
}

// Também expor no window para compatibilidade
window.inicializarTop10Participante = inicializarTop10Participante;

// =====================================================================
// CALCULAR MITOS/MICOS (FALLBACK)
// =====================================================================
async function calcularMitosMicos(ligaId, rodadaAtual) {
    const mitos = [];
    const micos = [];

    try {
        // Buscar todas as rodadas
        const response = await fetch(`/api/ligas/${ligaId}/top10`);
        if (!response.ok) return { mitos: [], micos: [] };

        const dados = await response.json();

        // dados é objeto com rodadas como keys: { "1": [...], "2": [...], ... }
        const rodadas = Object.keys(dados)
            .map(Number)
            .filter((n) => !isNaN(n) && n <= rodadaAtual);

        for (const numRodada of rodadas) {
            const timesRodada = dados[numRodada];
            if (!timesRodada || timesRodada.length === 0) continue;

            // Ordenar por pontos
            const ordenados = [...timesRodada].sort(
                (a, b) => (b.pontos || 0) - (a.pontos || 0),
            );

            // MITO = 1º lugar (maior pontuação)
            if (ordenados.length > 0) {
                const mito = ordenados[0];
                mitos.push({
                    rodada: numRodada,
                    timeId: mito.timeId || mito.time_id,
                    nome_cartola:
                        mito.nome_cartola || mito.nome_cartoleiro || "N/D",
                    nome_time: mito.nome_time || "N/D",
                    pontos: parseFloat(mito.pontos) || 0,
                    escudo: mito.escudo || "",
                    clube_id: mito.clube_id,
                });
            }

            // MICO = último lugar (menor pontuação)
            if (ordenados.length > 1) {
                const mico = ordenados[ordenados.length - 1];
                micos.push({
                    rodada: numRodada,
                    timeId: mico.timeId || mico.time_id,
                    nome_cartola:
                        mico.nome_cartola || mico.nome_cartoleiro || "N/D",
                    nome_time: mico.nome_time || "N/D",
                    pontos: parseFloat(mico.pontos) || 0,
                    escudo: mico.escudo || "",
                    clube_id: mico.clube_id,
                });
            }
        }

        // Ordenar: MITOS por maior pontuação, MICOS por menor pontuação
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
function renderizarTabelasTop10(
    container,
    mitos,
    micos,
    meuTimeId,
    valoresBonusOnus,
) {
    const meuTimeIdNum = Number(meuTimeId);

    const html = `
        <div class="top10-tabelas-container">
            <!-- TABELA MITOS -->
            <div class="top10-tabela-wrapper">
                <div class="top10-tabela-header mitos">
                    <span class="top10-tabela-icone">🎩</span>
                    <span class="top10-tabela-titulo">TOP 10 MITOS</span>
                </div>
                ${gerarTabelaHTML(mitos, "mitos", meuTimeIdNum, valoresBonusOnus)}
            </div>

            <!-- TABELA MICOS -->
            <div class="top10-tabela-wrapper">
                <div class="top10-tabela-header micos">
                    <span class="top10-tabela-icone">🐵</span>
                    <span class="top10-tabela-titulo">TOP 10 MICOS</span>
                </div>
                ${gerarTabelaHTML(micos, "micos", meuTimeIdNum, valoresBonusOnus)}
            </div>
        </div>

        <style>
            .top10-tabelas-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
                padding: 16px;
            }

            .top10-tabela-wrapper {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .top10-tabela-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 16px;
                font-weight: 700;
                font-size: 14px;
            }

            .top10-tabela-header.mitos {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
                color: #22c55e;
                border-bottom: 2px solid #22c55e;
            }

            .top10-tabela-header.micos {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%);
                color: #ef4444;
                border-bottom: 2px solid #ef4444;
            }

            .top10-tabela-icone {
                font-size: 20px;
            }

            .tabela-top10-participante {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }

            .tabela-top10-participante thead {
                background: rgba(255, 255, 255, 0.05);
            }

            .tabela-top10-participante th {
                padding: 10px 8px;
                text-align: center;
                color: #999;
                font-weight: 600;
                font-size: 10px;
                text-transform: uppercase;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .tabela-top10-participante td {
                padding: 10px 8px;
                text-align: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                color: #e0e0e0;
            }

            .tabela-top10-participante tbody tr:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            .tabela-top10-participante tbody tr.meu-time {
                background: rgba(255, 69, 0, 0.15);
                border-left: 3px solid #ff4500;
            }

            .tabela-top10-participante tbody tr.meu-time td {
                color: #ff4500;
                font-weight: 600;
            }

            .tabela-top10-participante .posicao-1 td:first-child {
                color: #ffd700;
                font-weight: 700;
            }

            .tabela-top10-participante .posicao-2 td:first-child {
                color: #c0c0c0;
            }

            .tabela-top10-participante .posicao-3 td:first-child {
                color: #cd7f32;
            }

            .pontos-destaque {
                font-weight: 700;
                font-family: 'JetBrains Mono', monospace;
            }

            .valor-positivo {
                color: #22c55e;
                font-weight: 700;
            }

            .valor-negativo {
                color: #ef4444;
                font-weight: 700;
            }

            .time-escudo {
                width: 20px;
                height: 20px;
                object-fit: contain;
            }

            .nome-cell {
                text-align: left !important;
                max-width: 100px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            @media (max-width: 768px) {
                .tabela-top10-participante {
                    font-size: 10px;
                }

                .tabela-top10-participante th,
                .tabela-top10-participante td {
                    padding: 8px 4px;
                }

                .nome-cell {
                    max-width: 70px;
                }

                .tabela-top10-participante th:nth-child(3),
                .tabela-top10-participante td:nth-child(3) {
                    display: none; /* Esconder coluna Time em mobile */
                }
            }
        </style>
    `;

    container.innerHTML = html;
}

function gerarTabelaHTML(dados, tipo, meuTimeIdNum, valoresBonusOnus) {
    if (!dados || dados.length === 0) {
        return `
            <div style="text-align: center; padding: 30px; color: #999;">
                <p>Nenhum dado disponível para ${tipo === "mitos" ? "MITOS" : "MICOS"}</p>
            </div>
        `;
    }

    const valoresBonus =
        tipo === "mitos" ? valoresBonusOnus.mitos : valoresBonusOnus.micos;

    return `
        <table class="tabela-top10-participante">
            <thead>
                <tr>
                    <th style="width: 35px;">Pos</th>
                    <th class="nome-cell">Cartoleiro</th>
                    <th class="nome-cell">Time</th>
                    <th style="width: 30px;">🏠</th>
                    <th style="width: 60px;">Pontos</th>
                    <th style="width: 45px;">Rod</th>
                    <th style="width: 55px;">${tipo === "mitos" ? "Bônus" : "Ônus"}</th>
                </tr>
            </thead>
            <tbody>
                ${dados
                    .map((item, index) => {
                        const posicao = index + 1;
                        const timeIdNum = Number(item.timeId || item.time_id);
                        const isMeuTime = timeIdNum === meuTimeIdNum;
                        const valorBonus = valoresBonus[posicao] ?? 0;
                        const valorClass =
                            valorBonus >= 0
                                ? "valor-positivo"
                                : "valor-negativo";
                        const valorFormatado =
                            valorBonus >= 0
                                ? `+R$ ${valorBonus.toFixed(2)}`
                                : `-R$ ${Math.abs(valorBonus).toFixed(2)}`;

                        let rowClass = isMeuTime ? "meu-time" : "";
                        if (posicao <= 3) rowClass += ` posicao-${posicao}`;

                        const posicaoDisplay =
                            posicao === 1
                                ? tipo === "mitos"
                                    ? "👑"
                                    : "💀"
                                : `${posicao}º`;

                        return `
                        <tr class="${rowClass}">
                            <td style="font-weight: 700;">${posicaoDisplay}</td>
                            <td class="nome-cell">${item.nome_cartola || "N/D"}</td>
                            <td class="nome-cell">${item.nome_time || "N/D"}</td>
                            <td>
                                ${
                                    item.clube_id
                                        ? `<img src="/escudos/${item.clube_id}.png" alt="" class="time-escudo" onerror="this.style.display='none'"/>`
                                        : "❤️"
                                }
                            </td>
                            <td class="pontos-destaque">${(item.pontos ?? 0).toFixed(2)}</td>
                            <td>R${item.rodada ?? "?"}</td>
                            <td class="${valorClass}">${valorFormatado}</td>
                        </tr>
                    `;
                    })
                    .join("")}
            </tbody>
        </table>
    `;
}

// =====================================================================
// ERRO
// =====================================================================
function mostrarErro(container, mensagem) {
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%); border-radius: 12px; border: 2px dashed rgba(239, 68, 68, 0.3);">
            <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
            <h3 style="color: #fff; margin-bottom: 12px;">TOP 10 Indisponível</h3>
            <p style="color: #999;">${mensagem || "Dados não disponíveis no momento."}</p>
        </div>
    `;
}

console.log("[PARTICIPANTE-TOP10] ✅ Módulo v3.0 carregado");

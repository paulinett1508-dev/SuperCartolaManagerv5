// =====================================================================
// PARTICIPANTE-PONTOS-CORRIDOS.JS - v2.0 (APENAS CONSUMO)
// =====================================================================
// ✅ Consome dados prontos do backend
// ✅ Zero import de orquestradores do admin
// ✅ Leve e rápido
// =====================================================================

console.log("[PONTOS-CORRIDOS-PARTICIPANTE] 🔄 Módulo v2.0 (consumo)");

let ligaIdAtual = null;
let timeIdAtual = null;

// =====================================================================
// FUNÇÃO PRINCIPAL - INICIALIZAR
// =====================================================================
window.inicializarPontosCorridosParticipante = async function ({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PONTOS-CORRIDOS-PARTICIPANTE] Inicializando...", {
        ligaId,
        timeId,
    });

    if (!ligaId) {
        mostrarErro("Dados da liga não encontrados");
        return;
    }

    ligaIdAtual = ligaId;
    timeIdAtual = timeId;

    await carregarPontosCorridos(ligaId, timeId);
};

// =====================================================================
// CARREGAR DADOS DO BACKEND
// =====================================================================
async function carregarPontosCorridos(ligaId, timeId) {
    const container =
        document.getElementById("pontosCorridosContainer") ||
        document.getElementById("moduleContainer");

    if (!container) {
        console.error(
            "[PONTOS-CORRIDOS-PARTICIPANTE] ❌ Container não encontrado",
        );
        return;
    }

    // Loading state
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px;">
            <div style="width: 40px; height: 40px; border: 3px solid rgba(255, 69, 0, 0.2); border-top-color: #ff4500; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p style="margin-top: 16px; color: #999; font-size: 14px;">Carregando classificação...</p>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
        // ✅ BUSCAR DO CACHE (prioridade)
        let dados = null;

        // Tentar cache primeiro
        const cacheResponse = await fetch(
            `/api/pontos-corridos/cache/${ligaId}`,
        );
        if (cacheResponse.ok) {
            const cacheData = await cacheResponse.json();
            if (cacheData && cacheData.dados) {
                dados = cacheData.dados;
                console.log("[PONTOS-CORRIDOS-PARTICIPANTE] ✅ Dados do cache");
            }
        }

        // Fallback para endpoint direto
        if (!dados) {
            const response = await fetch(
                `/api/ligas/${ligaId}/pontos-corridos`,
            );
            if (response.ok) {
                dados = await response.json();
                console.log(
                    "[PONTOS-CORRIDOS-PARTICIPANTE] ✅ Dados do endpoint direto",
                );
            }
        }

        if (!dados || (Array.isArray(dados) && dados.length === 0)) {
            mostrarVazio(container);
            return;
        }

        // Renderizar tabela
        renderizarClassificacao(container, dados, timeId);
    } catch (error) {
        console.error("[PONTOS-CORRIDOS-PARTICIPANTE] ❌ Erro:", error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// RENDERIZAR CLASSIFICAÇÃO
// =====================================================================
function renderizarClassificacao(container, dados, meuTimeId) {
    // Normalizar dados (pode vir como array ou objeto com ranking)
    let classificacao = Array.isArray(dados)
        ? dados
        : dados.ranking || dados.classificacao || [];

    if (!Array.isArray(classificacao) || classificacao.length === 0) {
        mostrarVazio(container);
        return;
    }

    // Ordenar por pontos (se não estiver ordenado)
    classificacao = classificacao.sort((a, b) => {
        const pontosA = a.pontos_totais || a.pontos || 0;
        const pontosB = b.pontos_totais || b.pontos || 0;
        return pontosB - pontosA;
    });

    const totalTimes = classificacao.length;
    const meuTimeIdNum = Number(meuTimeId);

    const html = `
        <div class="pontos-corridos-container">
            <div class="pc-header">
                <h2>🏆 Classificação Geral</h2>
                <span class="pc-subtitle">${totalTimes} participantes</span>
            </div>

            <div class="pc-table-wrapper">
                <table class="pc-table">
                    <thead>
                        <tr>
                            <th class="col-pos">#</th>
                            <th class="col-time">Time</th>
                            <th class="col-pts">Pts</th>
                            <th class="col-media">Média</th>
                            <th class="col-jogos">J</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${classificacao
                            .map((time, index) => {
                                const posicao = index + 1;
                                const timeId = time.timeId || time.time_id;
                                const isMeuTime =
                                    Number(timeId) === meuTimeIdNum;
                                const pontos =
                                    time.pontos_totais || time.pontos || 0;
                                const jogos =
                                    time.rodadas_jogadas || time.jogos || 0;
                                const media =
                                    jogos > 0
                                        ? (pontos / jogos).toFixed(2)
                                        : "0.00";

                                // Zonas
                                let zonaClass = "";
                                let zonaIcon = "";
                                if (posicao === 1) {
                                    zonaClass = "zona-campeao";
                                    zonaIcon = "👑";
                                } else if (posicao <= 3) {
                                    zonaClass = "zona-podio";
                                    zonaIcon = "🏅";
                                } else if (
                                    posicao <= Math.ceil(totalTimes * 0.3)
                                ) {
                                    zonaClass = "zona-g6";
                                } else if (
                                    posicao >
                                    totalTimes - Math.ceil(totalTimes * 0.2)
                                ) {
                                    zonaClass = "zona-z4";
                                }

                                const pontosFormatados = pontos.toLocaleString(
                                    "pt-BR",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    },
                                );

                                return `
                                <tr class="${isMeuTime ? "meu-time" : ""} ${zonaClass}">
                                    <td class="col-pos">
                                        <span class="pos-badge ${zonaClass}">${posicao}º ${zonaIcon}</span>
                                    </td>
                                    <td class="col-time">
                                        <div class="time-info">
                                            <span class="time-nome">${time.nome_time || time.nome || "N/D"}</span>
                                            <span class="cartola-nome">${time.nome_cartola || ""}</span>
                                        </div>
                                    </td>
                                    <td class="col-pts">${pontosFormatados}</td>
                                    <td class="col-media">${media}</td>
                                    <td class="col-jogos">${jogos}</td>
                                </tr>
                            `;
                            })
                            .join("")}
                    </tbody>
                </table>
            </div>

            <!-- Legenda -->
            <div class="pc-legenda">
                <span class="legenda-item zona-campeao">👑 Líder</span>
                <span class="legenda-item zona-podio">🏅 Pódio</span>
                <span class="legenda-item zona-g6">G6</span>
                <span class="legenda-item zona-z4">Z4</span>
            </div>
        </div>

        <style>
        .pontos-corridos-container {
            padding: 0;
        }

        .pc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: linear-gradient(135deg, rgba(255, 69, 0, 0.1) 0%, rgba(255, 69, 0, 0.05) 100%);
            border-bottom: 2px solid rgba(255, 69, 0, 0.2);
        }

        .pc-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            color: #fff;
        }

        .pc-subtitle {
            font-size: 12px;
            color: #999;
            background: rgba(0,0,0,0.3);
            padding: 4px 10px;
            border-radius: 12px;
        }

        .pc-table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .pc-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        .pc-table thead {
            background: rgba(0,0,0,0.4);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .pc-table th {
            padding: 10px 6px;
            text-align: center;
            color: var(--participante-primary, #ff4500);
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .pc-table td {
            padding: 10px 6px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            color: #e0e0e0;
        }

        .col-pos { width: 50px; }
        .col-time { text-align: left !important; }
        .col-pts { font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .col-media { color: #999; font-size: 11px; }
        .col-jogos { color: #666; font-size: 11px; }

        .pos-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 11px;
            background: rgba(255,255,255,0.05);
        }

        .pos-badge.zona-campeao {
            background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
            color: #000;
        }

        .pos-badge.zona-podio {
            background: rgba(192, 192, 192, 0.2);
            color: #c0c0c0;
            border: 1px solid rgba(192, 192, 192, 0.3);
        }

        .pos-badge.zona-g6 {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
            border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .pos-badge.zona-z4 {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .time-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            text-align: left;
        }

        .time-nome {
            font-weight: 600;
            color: #fff;
            font-size: 12px;
        }

        .cartola-nome {
            font-size: 10px;
            color: #666;
        }

        /* Meu time destacado */
        tr.meu-time {
            background: rgba(16, 185, 129, 0.1) !important;
            border-left: 3px solid #10b981;
        }

        tr.meu-time .time-nome {
            color: #10b981;
        }

        /* Hover */
        .pc-table tbody tr:active {
            background: rgba(255,255,255,0.05);
        }

        /* Legenda */
        .pc-legenda {
            display: flex;
            justify-content: center;
            gap: 12px;
            padding: 12px;
            background: rgba(0,0,0,0.2);
            border-top: 1px solid rgba(255,255,255,0.05);
        }

        .legenda-item {
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 4px;
            color: #999;
        }

        .legenda-item.zona-campeao { color: #ffd700; }
        .legenda-item.zona-podio { color: #c0c0c0; }
        .legenda-item.zona-g6 { color: #22c55e; }
        .legenda-item.zona-z4 { color: #ef4444; }

        /* Responsivo */
        @media (min-width: 768px) {
            .pc-table { font-size: 14px; }
            .pc-table th, .pc-table td { padding: 12px 10px; }
            .time-nome { font-size: 14px; }
        }
        </style>
    `;

    container.innerHTML = html;
    console.log("[PONTOS-CORRIDOS-PARTICIPANTE] ✅ Classificação renderizada");
}

// =====================================================================
// HELPERS
// =====================================================================
function mostrarVazio(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🏆</div>
            <h3 style="color: #ccc; margin-bottom: 8px;">Sem dados ainda</h3>
            <p style="color: #666; font-size: 13px;">A classificação será gerada após as primeiras rodadas.</p>
        </div>
    `;
}

function mostrarErro(mensagem) {
    const container =
        document.getElementById("pontosCorridosContainer") ||
        document.getElementById("moduleContainer");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3>Erro ao Carregar</h3>
                <p style="margin: 12px 0;">${mensagem}</p>
                <button onclick="window.inicializarPontosCorridosParticipante({ligaId: '${ligaIdAtual}', timeId: '${timeIdAtual}'})" 
                        style="margin-top: 16px; padding: 12px 24px; background: #ff4500; 
                               color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

console.log("[PONTOS-CORRIDOS-PARTICIPANTE] ✅ Módulo v2.0 carregado");

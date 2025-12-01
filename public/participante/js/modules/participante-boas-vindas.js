// =====================================================================
// PARTICIPANTE-BOAS-VINDAS.JS - v2.1 (CORRIGIDO DADOS N/D)
// =====================================================================

console.log("[PARTICIPANTE-BOAS-VINDAS] 🔄 Carregando módulo v2.1...");

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarBoasVindasParticipante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-BOAS-VINDAS] 🚀 Inicializando...", {
        ligaId,
        timeId,
        participante,
    });

    try {
        // Buscar dados em paralelo para performance
        const [ligaRes, rankingRes, saldoRes, rodadaRes] =
            await Promise.allSettled([
                fetch(`/api/ligas/${ligaId}`),
                fetch(`/api/ligas/${ligaId}/ranking`),
                fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`),
                fetch("/api/cartola/mercado/status"),
            ]);

        // Processar resultados
        const liga =
            ligaRes.status === "fulfilled" && ligaRes.value.ok
                ? await ligaRes.value.json()
                : null;

        const ranking =
            rankingRes.status === "fulfilled" && rankingRes.value.ok
                ? await rankingRes.value.json()
                : [];

        const extratoCache =
            saldoRes.status === "fulfilled" && saldoRes.value.ok
                ? await saldoRes.value.json()
                : null;

        const mercado =
            rodadaRes.status === "fulfilled" && rodadaRes.value.ok
                ? await rodadaRes.value.json()
                : { rodada_atual: 1 };

        // ✅ CORREÇÃO: Buscar dados do participante DIRETAMENTE da liga
        let dadosParticipanteLiga = null;
        if (liga && liga.participantes) {
            dadosParticipanteLiga = liga.participantes.find(
                (p) => String(p.time_id) === String(timeId),
            );
            console.log(
                "[PARTICIPANTE-BOAS-VINDAS] 📋 Dados da liga:",
                dadosParticipanteLiga,
            );
        }

        // Encontrar minha posição no ranking
        let minhaPosicao = null;
        let meusDados = null;

        if (Array.isArray(ranking)) {
            const idx = ranking.findIndex(
                (r) => String(r.time_id || r.timeId) === String(timeId),
            );
            if (idx >= 0) {
                minhaPosicao = idx + 1;
                meusDados = ranking[idx];
            }
        }

        // Calcular saldo do extrato
        let saldo = 0;
        if (extratoCache && extratoCache.resumo) {
            saldo =
                extratoCache.resumo.saldo ||
                extratoCache.resumo.saldo_final ||
                0;
        } else if (
            extratoCache &&
            extratoCache.data &&
            extratoCache.data.saldoAtual !== undefined
        ) {
            saldo = extratoCache.data.saldoAtual;
        } else if (extratoCache && extratoCache.saldoAtual !== undefined) {
            saldo = extratoCache.saldoAtual;
        }

        // Renderizar
        renderizarBoasVindas({
            participante,
            dadosParticipanteLiga, // ✅ NOVO: dados direto da liga
            liga,
            minhaPosicao,
            meusDados,
            saldo,
            totalParticipantes: ranking.length,
            rodadaAtual: mercado.rodada_atual || 1,
        });
    } catch (error) {
        console.error("[PARTICIPANTE-BOAS-VINDAS] ❌ Erro:", error);
        mostrarErro(error.message);
    }
}

// Também expor no window para compatibilidade
window.inicializarBoasVindasParticipante = inicializarBoasVindasParticipante;

// =====================================================================
// RENDERIZAÇÃO
// =====================================================================
function renderizarBoasVindas(dados) {
    const {
        participante,
        dadosParticipanteLiga, // ✅ NOVO
        liga,
        minhaPosicao,
        meusDados,
        saldo,
        totalParticipantes,
        rodadaAtual,
    } = dados;

    const container = document.getElementById("boas-vindas-container");
    if (!container) {
        console.error("[PARTICIPANTE-BOAS-VINDAS] ❌ Container não encontrado");
        return;
    }

    // ✅ CORREÇÃO: Prioridade de dados (liga > ranking > participante > fallback)
    // Evita usar N/D da sessão quando temos dados reais
    const nomeTime =
        dadosParticipanteLiga?.nome_time ||
        meusDados?.nome_time ||
        (participante?.nomeTime && participante.nomeTime !== "N/D"
            ? participante.nomeTime
            : null) ||
        "Meu Time";

    const nomeCartola =
        dadosParticipanteLiga?.nome_cartola ||
        meusDados?.nome_cartola ||
        (participante?.nomeCartola && participante.nomeCartola !== "N/D"
            ? participante.nomeCartola
            : null) ||
        "Cartoleiro";

    const pontosTotais =
        meusDados?.pontos_total || meusDados?.pontos_totais || 0;
    const nomeLiga = liga?.nome || "Liga";

    console.log("[PARTICIPANTE-BOAS-VINDAS] ✅ Dados finais:", {
        nomeTime,
        nomeCartola,
        pontosTotais,
    });

    // Formatadores
    const saldoFormatado = Math.abs(saldo).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const saldoClasse = saldo >= 0 ? "positivo" : "negativo";
    const saldoTexto =
        saldo >= 0 ? `+R$ ${saldoFormatado}` : `-R$ ${saldoFormatado}`;

    const pontosFormatados = Number(pontosTotais).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // Determinar zona
    let zonaTexto = "";
    let zonaClasse = "";
    if (minhaPosicao && totalParticipantes) {
        const percentil = (minhaPosicao / totalParticipantes) * 100;
        if (percentil <= 10) {
            zonaTexto = "🏆 Zona de Premiação";
            zonaClasse = "zona-premiacao";
        } else if (percentil <= 30) {
            zonaTexto = "✨ G6 - Zona Verde";
            zonaClasse = "zona-g6";
        } else if (percentil >= 80) {
            zonaTexto = "⚠️ Z4 - Zona de Rebaixamento";
            zonaClasse = "zona-z4";
        } else {
            zonaTexto = "📊 Zona Intermediária";
            zonaClasse = "zona-neutra";
        }
    }

    const html = `
        <div style="padding: 20px;">
            <!-- Header de Boas-Vindas -->
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 24px; font-weight: 800; color: #fff; margin: 0 0 8px 0;">
                    Olá, ${nomeCartola}! 👋
                </h1>
                <p style="color: #999; margin: 0; font-size: 14px;">
                    ${nomeLiga} • Rodada ${rodadaAtual}
                </p>
            </div>

            <!-- Card Principal - Meu Time -->
            <div style="background: linear-gradient(135deg, rgba(255, 69, 0, 0.15) 0%, rgba(255, 69, 0, 0.05) 100%); border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 2px solid rgba(255, 69, 0, 0.3);">
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 18px; font-weight: 700; color: #fff;">${nomeTime}</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <!-- Posição -->
                    <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 12px; color: #999; margin-bottom: 4px;">POSIÇÃO</div>
                        <div style="font-size: 28px; font-weight: 900; color: #ff4500;">
                            ${minhaPosicao ? `${minhaPosicao}º` : "-"}
                        </div>
                        <div style="font-size: 11px; color: #666;">de ${totalParticipantes || "?"}</div>
                    </div>

                    <!-- Pontos -->
                    <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 12px; color: #999; margin-bottom: 4px;">PONTOS</div>
                        <div style="font-size: 28px; font-weight: 900; color: #fff;">
                            ${pontosFormatados}
                        </div>
                        <div style="font-size: 11px; color: #666;">total acumulado</div>
                    </div>
                </div>

                ${
                    zonaTexto
                        ? `
                    <div style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; text-align: center;">
                        <span class="${zonaClasse}" style="font-size: 13px; font-weight: 600;">${zonaTexto}</span>
                    </div>
                `
                        : ""
                }
            </div>

            <!-- Card Saldo Financeiro -->
            <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.08);" onclick="window.participanteNav?.navegarPara('extrato')" role="button">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 12px; color: #999; margin-bottom: 4px;">💰 SALDO FINANCEIRO</div>
                        <div style="font-size: 22px; font-weight: 800; color: ${saldo >= 0 ? "#22c55e" : "#ef4444"};">
                            ${saldoTexto}
                        </div>
                    </div>
                    <div style="color: #666; font-size: 20px;">→</div>
                </div>
            </div>

            <!-- Estatísticas Rápidas -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
                <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 12px; text-align: center;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Rodadas</div>
                    <div style="font-size: 18px; font-weight: 700; color: #fff;">${rodadaAtual - 1}</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 12px; text-align: center;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Participantes</div>
                    <div style="font-size: 18px; font-weight: 700; color: #fff;">${totalParticipantes}</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 12px; text-align: center;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Faltam</div>
                    <div style="font-size: 18px; font-weight: 700; color: #ff4500;">${38 - rodadaAtual + 1}</div>
                </div>
            </div>

            <!-- Dica do Dia -->
            <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border-radius: 10px; padding: 14px; border: 1px solid rgba(59, 130, 246, 0.2);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">💡</span>
                    <div>
                        <div style="font-size: 12px; color: #3b82f6; font-weight: 600; margin-bottom: 2px;">DICA</div>
                        <div style="font-size: 13px; color: #ccc;">Acompanhe seu extrato financeiro para entender sua evolução na liga!</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// =====================================================================
// ERRO
// =====================================================================
function mostrarErro(mensagem) {
    const container = document.getElementById("boas-vindas-container");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 16px;">😔</div>
                <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar</h3>
                <p style="color: #999;">${mensagem}</p>
                <button onclick="location.reload()" style="margin-top: 20px; background: #ff4500; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

console.log("[PARTICIPANTE-BOAS-VINDAS] ✅ Módulo v2.1 carregado");

// =====================================================================
// PARTICIPANTE-ARTILHEIRO.JS - v2.2 (FORMATO CORRETO DO BACKEND)
// =====================================================================

console.log("[PARTICIPANTE-ARTILHEIRO] 🔄 Carregando módulo v2.2...");

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarArtilheiroParticipante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-ARTILHEIRO] 🚀 Inicializando...", {
        ligaId,
        timeId,
    });

    const container = document.getElementById("artilheiro-content");
    if (!container) {
        console.error("[PARTICIPANTE-ARTILHEIRO] ❌ Container não encontrado");
        return;
    }

    try {
        // ✅ VERIFICAR SE MÓDULO ESTÁ ATIVO NA LIGA
        const ligaRes = await fetch(`/api/ligas/${ligaId}`);
        if (ligaRes.ok) {
            const liga = await ligaRes.json();
            const modulosAtivos =
                liga.modulosAtivos || liga.modulos_ativos || {};
            const artilheiroAtivo = modulosAtivos.artilheiro !== false;

            if (!artilheiroAtivo) {
                console.log(
                    "[PARTICIPANTE-ARTILHEIRO] ⚠️ Módulo não ativo para esta liga",
                );
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(34, 197, 94, 0.3);">
                        <div style="font-size: 64px; margin-bottom: 16px;">⚽</div>
                        <h3 style="color: #fff; margin-bottom: 12px;">Artilheiro Campeão</h3>
                        <p style="color: #999;">Este módulo não está ativo para esta liga.</p>
                    </div>
                `;
                return;
            }
        }

        // ✅ Endpoint correto: /api/artilheiro-campeao/:ligaId/ranking
        const response = await fetch(
            `/api/artilheiro-campeao/${ligaId}/ranking`,
        );

        if (!response.ok) {
            throw new Error("Dados não disponíveis");
        }

        const data = await response.json();
        console.log("[PARTICIPANTE-ARTILHEIRO] 📦 Dados recebidos:", data);

        renderizarArtilheiro(container, data, timeId);
    } catch (error) {
        console.error("[PARTICIPANTE-ARTILHEIRO] ❌ Erro:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(34, 197, 94, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">⚽</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Artilheiro Campeão</h3>
                <p style="color: #999;">Dados não disponíveis no momento.</p>
            </div>
        `;
    }
}

// Também expor no window para compatibilidade
window.inicializarArtilheiroParticipante = inicializarArtilheiroParticipante;

// =====================================================================
// RENDERIZAÇÃO - v2.2 (FORMATO CORRETO)
// =====================================================================
function renderizarArtilheiro(container, response, meuTimeId) {
    // ✅ CORREÇÃO: Backend retorna { success, data: { ranking, estatisticas } }
    const data = response.data || response;
    const ranking = data.ranking || [];
    const estatisticas = data.estatisticas || {};

    // Verificar se há ranking
    if (!ranking || ranking.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(34, 197, 94, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">⚽</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Artilheiro Não Disponível</h3>
                <p style="color: #999;">Nenhum dado de artilheiro disponível ainda.</p>
            </div>
        `;
        return;
    }

    // Encontrar posição do usuário
    const minhaPosicao = ranking.findIndex(
        (r) => String(r.timeId) === String(meuTimeId),
    );
    const meusDados = minhaPosicao >= 0 ? ranking[minhaPosicao] : null;
    const minhaColocacao = minhaPosicao >= 0 ? minhaPosicao + 1 : null;

    // Campeão (1º lugar)
    const campeao = ranking[0];

    // Período das rodadas
    const rodadaInicio = estatisticas.rodadaInicio || 1;
    const rodadaFim = estatisticas.rodadaFim || estatisticas.rodadaAtual || "?";

    let html = `
    <div style="padding: 16px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #22c55e;">
                ⚽ Artilheiro Campeão
            </h2>
            <p style="margin: 0; color: #888; font-size: 14px;">
                Rodadas ${rodadaInicio} - ${rodadaFim}
            </p>
        </div>

        <!-- Card do Campeão -->
        ${
            campeao
                ? `
        <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 16px; padding: 20px; margin-bottom: 16px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 8px;">👑</div>
            <div style="font-size: 12px; color: #22c55e; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Artilheiro</div>
            <div style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 4px;">${campeao.nomeTime || campeao.nome}</div>
            <div style="font-size: 13px; color: #888; margin-bottom: 12px;">${campeao.nome || ""}</div>
            <div style="display: flex; justify-content: center; gap: 24px;">
                <div>
                    <div style="font-size: 28px; font-weight: 900; color: #22c55e;">${campeao.golsPro || 0}</div>
                    <div style="font-size: 11px; color: #888;">GOLS PRÓ</div>
                </div>
                <div>
                    <div style="font-size: 28px; font-weight: 900; color: #ef4444;">${campeao.golsContra || 0}</div>
                    <div style="font-size: 11px; color: #888;">GOLS CONTRA</div>
                </div>
                <div>
                    <div style="font-size: 28px; font-weight: 900; color: ${campeao.saldoGols >= 0 ? "#22c55e" : "#ef4444"};">${campeao.saldoGols >= 0 ? "+" : ""}${campeao.saldoGols || 0}</div>
                    <div style="font-size: 11px; color: #888;">SALDO</div>
                </div>
            </div>
        </div>
        `
                : ""
        }

        <!-- Minha Posição -->
        ${
            meusDados
                ? `
        <div style="background: ${minhaColocacao === 1 ? "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)" : "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)"}; border: 2px solid ${minhaColocacao === 1 ? "rgba(34, 197, 94, 0.4)" : "rgba(59, 130, 246, 0.4)"}; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 11px; color: #3b82f6; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Sua Posição</div>
                    <div style="font-size: 24px; font-weight: 900; color: #fff;">${minhaColocacao}º lugar</div>
                </div>
                <div style="display: flex; gap: 16px; text-align: center;">
                    <div>
                        <div style="font-size: 20px; font-weight: 800; color: #22c55e;">${meusDados.golsPro || 0}</div>
                        <div style="font-size: 10px; color: #888;">GP</div>
                    </div>
                    <div>
                        <div style="font-size: 20px; font-weight: 800; color: #ef4444;">${meusDados.golsContra || 0}</div>
                        <div style="font-size: 10px; color: #888;">GC</div>
                    </div>
                    <div>
                        <div style="font-size: 20px; font-weight: 800; color: ${meusDados.saldoGols >= 0 ? "#22c55e" : "#ef4444"};">${meusDados.saldoGols >= 0 ? "+" : ""}${meusDados.saldoGols || 0}</div>
                        <div style="font-size: 10px; color: #888;">SG</div>
                    </div>
                </div>
            </div>
        </div>
        `
                : `
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; margin-bottom: 16px; text-align: center;">
            <span style="color: #666; font-size: 14px;">Você não está no ranking</span>
        </div>
        `
        }

        <!-- Ranking Completo -->
        <div style="background: rgba(0,0,0,0.3); border-radius: 12px; overflow: hidden;">
            <div style="background: rgba(34, 197, 94, 0.1); padding: 12px 16px; border-bottom: 1px solid rgba(34, 197, 94, 0.2);">
                <span style="font-size: 14px; font-weight: 700; color: #22c55e;">🏆 Ranking Completo</span>
            </div>

            <!-- Header da tabela -->
            <div style="display: grid; grid-template-columns: 40px 1fr 50px 50px 50px; gap: 8px; padding: 10px 16px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #888; text-transform: uppercase; font-weight: 600;">
                <div>#</div>
                <div>Time</div>
                <div style="text-align: center;">GP</div>
                <div style="text-align: center;">GC</div>
                <div style="text-align: center;">SG</div>
            </div>

            ${ranking
                .map((time, idx) => {
                    const isMeuTime = String(time.timeId) === String(meuTimeId);
                    const pos = idx + 1;
                    const medalha =
                        pos === 1
                            ? "🥇"
                            : pos === 2
                              ? "🥈"
                              : pos === 3
                                ? "🥉"
                                : `${pos}º`;

                    return `
                <div style="display: grid; grid-template-columns: 40px 1fr 50px 50px 50px; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); ${isMeuTime ? "background: rgba(34, 197, 94, 0.1);" : ""}">
                    <div style="font-size: 14px; display: flex; align-items: center;">${medalha}</div>
                    <div style="display: flex; flex-direction: column; justify-content: center; min-width: 0;">
                        <span style="color: ${isMeuTime ? "#22c55e" : "#fff"}; font-weight: ${isMeuTime ? "700" : "500"}; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${time.nomeTime || time.nome}</span>
                        <span style="color: #666; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${time.nome || ""}</span>
                    </div>
                    <div style="text-align: center; color: #22c55e; font-weight: 700; font-size: 14px;">${time.golsPro || 0}</div>
                    <div style="text-align: center; color: #ef4444; font-weight: 700; font-size: 14px;">${time.golsContra || 0}</div>
                    <div style="text-align: center; color: ${time.saldoGols >= 0 ? "#22c55e" : "#ef4444"}; font-weight: 700; font-size: 14px;">${time.saldoGols >= 0 ? "+" : ""}${time.saldoGols || 0}</div>
                </div>
                `;
                })
                .join("")}
        </div>

        <!-- Estatísticas -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px;">
            <div style="background: rgba(34, 197, 94, 0.1); border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 20px; font-weight: 800; color: #22c55e;">${estatisticas.totalGolsPro || 0}</div>
                <div style="font-size: 10px; color: #888; text-transform: uppercase;">Total GP</div>
            </div>
            <div style="background: rgba(239, 68, 68, 0.1); border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 20px; font-weight: 800; color: #ef4444;">${estatisticas.totalGolsContra || 0}</div>
                <div style="font-size: 10px; color: #888; text-transform: uppercase;">Total GC</div>
            </div>
            <div style="background: rgba(59, 130, 246, 0.1); border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 20px; font-weight: 800; color: #3b82f6;">${ranking.length}</div>
                <div style="font-size: 10px; color: #888; text-transform: uppercase;">Participantes</div>
            </div>
        </div>
    </div>
    `;

    container.innerHTML = html;
}

console.log("[PARTICIPANTE-ARTILHEIRO] ✅ Módulo v2.2 carregado");

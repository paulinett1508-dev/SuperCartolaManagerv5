// =====================================================================
// PARTICIPANTE-MATA-MATA.JS - v2.0 (CORRIGIDO COM EXPORT)
// =====================================================================

console.log("[PARTICIPANTE-MATA-MATA] 🔄 Carregando módulo v2.0...");

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarMataMataParticipante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-MATA-MATA] 🚀 Inicializando...", {
        ligaId,
        timeId,
    });

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
        renderizarMataMata(container, data, timeId);
    } catch (error) {
        console.error("[PARTICIPANTE-MATA-MATA] ❌ Erro:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 69, 0, 0.05) 0%, rgba(255, 69, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 69, 0, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">⚔️</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Mata-Mata</h3>
                <p style="color: #999;">Este módulo ainda não foi configurado para esta liga.</p>
            </div>
        `;
    }
}

// Também expor no window para compatibilidade
window.inicializarMataMataParticipante = inicializarMataMataParticipante;

// =====================================================================
// RENDERIZAÇÃO
// =====================================================================
function renderizarMataMata(container, data, timeId) {
    // Verificar se há edições
    const edicoes = data.edicoes || data.fases || [];

    if (!edicoes || edicoes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 69, 0, 0.05) 0%, rgba(255, 69, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 69, 0, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">⚔️</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Mata-Mata Não Disponível</h3>
                <p style="color: #999;">Nenhuma edição do Mata-Mata foi configurada ainda.</p>
            </div>
        `;
        return;
    }

    // Encontrar minha participação
    let minhaParticipacao = null;
    let edicaoAtual = null;

    for (const edicao of edicoes) {
        const confrontos = edicao.confrontos || edicao.jogos || [];
        if (confrontos.length > 0) {
            const meuConfronto = confrontos.find((c) => {
                const timeAId = String(
                    c.timeA?.timeId ||
                        c.timeA?.time_id ||
                        c.time1?.timeId ||
                        "",
                );
                const timeBId = String(
                    c.timeB?.timeId ||
                        c.timeB?.time_id ||
                        c.time2?.timeId ||
                        "",
                );
                return timeAId === String(timeId) || timeBId === String(timeId);
            });

            if (meuConfronto) {
                minhaParticipacao = meuConfronto;
                edicaoAtual = edicao;
                break;
            }
        }
    }

    // Renderizar interface
    let html = `<div style="padding: 20px;">`;

    if (minhaParticipacao && edicaoAtual) {
        // Participante está no Mata-Mata
        const timeA = minhaParticipacao.timeA || minhaParticipacao.time1 || {};
        const timeB = minhaParticipacao.timeB || minhaParticipacao.time2 || {};

        const sou_timeA =
            String(timeA.timeId || timeA.time_id) === String(timeId);
        const eu = sou_timeA ? timeA : timeB;
        const adversario = sou_timeA ? timeB : timeA;

        const meusPontos = eu.pontos || eu.pontos_total || 0;
        const pontosAdversario =
            adversario.pontos || adversario.pontos_total || 0;

        html += `
            <div style="background: linear-gradient(135deg, rgba(255, 69, 0, 0.1) 0%, rgba(255, 69, 0, 0.05) 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid rgba(255, 69, 0, 0.3);">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #fff; text-align: center;">
                    🎯 Seu Confronto - ${edicaoAtual.nome || "Fase Atual"}
                </h3>

                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center;">
                    <!-- Você -->
                    <div style="text-align: center; background: rgba(34, 197, 94, 0.1); padding: 16px; border-radius: 10px; border: 2px solid rgba(34, 197, 94, 0.3);">
                        <div style="font-size: 11px; color: #22c55e; margin-bottom: 8px; font-weight: 700;">VOCÊ</div>
                        <div style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">${eu.nomeTime || eu.nome_time || "Seu Time"}</div>
                        <div style="font-size: 28px; font-weight: 900; color: #22c55e;">${Number(meusPontos).toFixed(2)}</div>
                    </div>

                    <!-- VS -->
                    <div style="font-size: 20px; font-weight: 900; color: #666;">VS</div>

                    <!-- Adversário -->
                    <div style="text-align: center; background: rgba(239, 68, 68, 0.1); padding: 16px; border-radius: 10px; border: 2px solid rgba(239, 68, 68, 0.3);">
                        <div style="font-size: 11px; color: #ef4444; margin-bottom: 8px; font-weight: 700;">ADVERSÁRIO</div>
                        <div style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">${adversario.nomeTime || adversario.nome_time || "Adversário"}</div>
                        <div style="font-size: 28px; font-weight: 900; color: #ef4444;">${Number(pontosAdversario).toFixed(2)}</div>
                    </div>
                </div>

                <div style="margin-top: 16px; padding: 12px; background: ${meusPontos > pontosAdversario ? "rgba(34, 197, 94, 0.15)" : meusPontos < pontosAdversario ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.15)"}; border-radius: 8px; text-align: center;">
                    <strong style="color: ${meusPontos > pontosAdversario ? "#22c55e" : meusPontos < pontosAdversario ? "#ef4444" : "#3b82f6"};">
                        ${meusPontos > pontosAdversario ? "🏆 Você está vencendo!" : meusPontos < pontosAdversario ? "😔 Você está perdendo" : "⚖️ Empate"}
                    </strong>
                </div>
            </div>
        `;
    } else {
        // Participante não está no Mata-Mata
        html += `
            <div style="text-align: center; padding: 40px 20px; background: rgba(255, 255, 255, 0.03); border-radius: 12px; border: 2px dashed rgba(255, 255, 255, 0.1); margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">😔</div>
                <h3 style="color: #999; margin-bottom: 12px;">Você Não Está Classificado</h3>
                <p style="color: #666; font-size: 14px;">Você não se classificou para o Mata-Mata nesta edição.</p>
            </div>
        `;
    }

    // Mostrar histórico de edições
    html += `
        <h3 style="margin: 24px 0 16px 0; font-size: 18px; font-weight: 700; color: #fff;">📋 Fases do Mata-Mata</h3>
        <div style="display: grid; gap: 12px;">
    `;

    edicoes.forEach((edicao) => {
        const confrontos = edicao.confrontos || edicao.jogos || [];
        const totalConfrontos = confrontos.length;

        html += `
            <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 16px; border: 1px solid rgba(255, 69, 0, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #fff;">${edicao.nome || "Fase"}</h4>
                        <p style="margin: 0; font-size: 13px; color: #666;">${totalConfrontos} confrontos</p>
                    </div>
                    <div style="background: rgba(255, 69, 0, 0.15); color: #ff4500; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;">
                        ${edicao.status === "concluida" || edicao.finalizada ? "✅ Concluída" : "⏳ Em Andamento"}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;

    container.innerHTML = html;
}

console.log("[PARTICIPANTE-MATA-MATA] ✅ Módulo v2.0 carregado");

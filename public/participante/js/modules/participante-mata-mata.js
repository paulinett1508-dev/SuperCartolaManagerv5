
// MÓDULO PARTICIPANTE - MATA-MATA

console.log('[PARTICIPANTE-MATA-MATA] Carregando módulo...');

/**
 * Inicializa o módulo Mata-Mata para o participante
 */
async function inicializarMataMataParticipante(ligaId, timeId) {
    console.log('[PARTICIPANTE-MATA-MATA] Inicializando para time', timeId, 'na liga', ligaId);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/mata-mata`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do Mata-Mata');
        }

        const data = await response.json();

        // Renderizar dados do Mata-Mata
        renderizarMataMata(data, timeId);

    } catch (error) {
        console.error('[PARTICIPANTE-MATA-MATA] Erro:', error);
        
        const container = document.getElementById('mataMataContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar Mata-Mata</h3>
                    <p style="color: #e0e0e0;">${error.message}</p>
                </div>
            `;
        }
    }
}

/**
 * Renderiza os dados do Mata-Mata
 */
function renderizarMataMata(data, timeId) {
    const container = document.getElementById('mataMataContainer');
    if (!container) {
        console.error('[PARTICIPANTE-MATA-MATA] Container não encontrado');
        return;
    }

    // Verificar se há edições
    if (!data.edicoes || data.edicoes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 69, 0, 0.05) 0%, rgba(255, 69, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 69, 0, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">⚔️</div>
                <h3 style="color: var(--text-primary); margin-bottom: 12px;">Mata-Mata Não Disponível</h3>
                <p style="color: var(--text-muted);">Nenhuma edição do Mata-Mata foi configurada ainda.</p>
            </div>
        `;
        return;
    }

    // Encontrar minha participação
    let minhaParticipacao = null;
    let edicaoAtual = null;

    for (const edicao of data.edicoes) {
        // Verificar se existem confrontos
        if (edicao.confrontos && edicao.confrontos.length > 0) {
            // Procurar confronto onde o participante está
            const meuConfronto = edicao.confrontos.find(c => 
                (c.timeA && String(c.timeA.timeId) === String(timeId)) || 
                (c.timeB && String(c.timeB.timeId) === String(timeId))
            );

            if (meuConfronto) {
                minhaParticipacao = meuConfronto;
                edicaoAtual = edicao;
                break;
            }
        }
    }

    // Renderizar interface
    let html = `
        <div style="padding: 20px;">
            <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 800; color: var(--text-primary);">⚔️ Mata-Mata</h2>
    `;

    if (minhaParticipacao && edicaoAtual) {
        // Participante está no Mata-Mata
        const sou_timeA = String(minhaParticipacao.timeA.timeId) === String(timeId);
        const eu = sou_timeA ? minhaParticipacao.timeA : minhaParticipacao.timeB;
        const adversario = sou_timeA ? minhaParticipacao.timeB : minhaParticipacao.timeA;

        html += `
            <div style="background: linear-gradient(135deg, rgba(255, 69, 0, 0.1) 0%, rgba(255, 69, 0, 0.05) 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid rgba(255, 69, 0, 0.3);">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: var(--text-primary);">🎯 Seu Confronto - ${edicaoAtual.nome}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center;">
                    <!-- Você -->
                    <div style="text-align: center; background: rgba(34, 197, 94, 0.1); padding: 16px; border-radius: 10px; border: 2px solid rgba(34, 197, 94, 0.3);">
                        <div style="font-size: 12px; color: #22c55e; margin-bottom: 8px; font-weight: 700;">VOCÊ</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${eu.nomeTime || 'Seu Time'}</div>
                        <div style="font-size: 24px; font-weight: 900; color: #22c55e;">${eu.pontos || 0}</div>
                    </div>

                    <!-- VS -->
                    <div style="font-size: 24px; font-weight: 900; color: var(--text-muted);">VS</div>

                    <!-- Adversário -->
                    <div style="text-align: center; background: rgba(239, 68, 68, 0.1); padding: 16px; border-radius: 10px; border: 2px solid rgba(239, 68, 68, 0.3);">
                        <div style="font-size: 12px; color: #ef4444; margin-bottom: 8px; font-weight: 700;">ADVERSÁRIO</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${adversario.nomeTime || 'Adversário'}</div>
                        <div style="font-size: 24px; font-weight: 900; color: #ef4444;">${adversario.pontos || 0}</div>
                    </div>
                </div>

                ${minhaParticipacao.status === 'concluido' ? `
                    <div style="margin-top: 16px; padding: 12px; background: ${eu.pontos > adversario.pontos ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; border-radius: 8px; text-align: center;">
                        <strong style="color: ${eu.pontos > adversario.pontos ? '#22c55e' : '#ef4444'};">
                            ${eu.pontos > adversario.pontos ? '🏆 Você Venceu!' : '😔 Você Foi Eliminado'}
                        </strong>
                    </div>
                ` : `
                    <div style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; text-align: center;">
                        <strong style="color: #3b82f6;">⏳ Confronto em Andamento</strong>
                    </div>
                `}
            </div>
        `;
    } else {
        // Participante não está no Mata-Mata
        html += `
            <div style="text-align: center; padding: 40px 20px; background: rgba(255, 255, 255, 0.03); border-radius: 12px; border: 2px dashed rgba(255, 255, 255, 0.1);">
                <div style="font-size: 48px; margin-bottom: 16px;">😔</div>
                <h3 style="color: var(--text-muted); margin-bottom: 12px;">Você Não Está Classificado</h3>
                <p style="color: var(--text-muted); font-size: 14px;">Você não se classificou para o Mata-Mata nesta edição.</p>
            </div>
        `;
    }

    // Mostrar todas as edições (histórico)
    html += `
        <h3 style="margin: 24px 0 16px 0; font-size: 18px; font-weight: 700; color: var(--text-primary);">📋 Histórico de Edições</h3>
        <div style="display: grid; gap: 12px;">
    `;

    data.edicoes.forEach(edicao => {
        const totalConfrontos = edicao.confrontos ? edicao.confrontos.length : 0;
        html += `
            <div style="background: var(--bg-card); border-radius: 10px; padding: 16px; border: 1px solid rgba(255, 69, 0, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">${edicao.nome}</h4>
                        <p style="margin: 0; font-size: 13px; color: var(--text-muted);">${totalConfrontos} confrontos</p>
                    </div>
                    <div style="background: rgba(255, 69, 0, 0.15); color: var(--laranja); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;">
                        ${edicao.status === 'concluida' ? '✅ Concluída' : '⏳ Em Andamento'}
                    </div>
                </div>
            </div>
        `;
    });

    html += `
        </div>
    </div>
    `;

    container.innerHTML = html;
}

// Exportar função globalmente
window.inicializarMataMataParticipante = inicializarMataMataParticipante;

console.log('[PARTICIPANTE-MATA-MATA] ✅ Módulo carregado');

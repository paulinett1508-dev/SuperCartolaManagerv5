
// MATA-MATA UI - Interface e Renderização
// Responsável por: renderização de tabs, navegação de fases, exibição de confrontos

console.log("[MATA-UI] Carregando módulo de interface...");

import { edicoes, gerarTextoConfronto, getRodadaPontosText } from "./mata-mata-config.js";

// ============================================================================
// RENDERIZAÇÃO DA INTERFACE PRINCIPAL
// ============================================================================

export function renderizarInterface(containerControles, ligaId, onEdicaoChange, onFaseChange) {
    if (!containerControles) {
        console.warn("[MATA-UI] Container de controles não encontrado");
        return;
    }

    // Renderizar seletor de edições
    const seletorHTML = `
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 20px;">
            <label for="edicao-select" style="font-weight: 600; color: var(--text-primary);">
                📅 Edição:
            </label>
            <select id="edicao-select" style="
                padding: 8px 16px;
                border-radius: 8px;
                border: 1px solid var(--border-color);
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 14px;
                cursor: pointer;
            ">
                ${edicoes.map(e => `
                    <option value="${e.id}" ${e.ativo ? 'selected' : ''}>
                        ${e.nome} ${e.ativo ? '(Ativa)' : ''}
                    </option>
                `).join('')}
            </select>
        </div>

        <!-- Navegação de Fases -->
        <div id="fase-nav-container" style="display: none; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
            <button class="fase-btn" data-fase="primeira">1ª Fase</button>
            <button class="fase-btn" data-fase="oitavas">Oitavas</button>
            <button class="fase-btn" data-fase="quartas">Quartas</button>
            <button class="fase-btn" data-fase="semis">Semifinal</button>
            <button class="fase-btn" data-fase="final">Final</button>
        </div>
    `;

    containerControles.innerHTML = seletorHTML;

    // Event listeners
    const edicaoSelect = document.getElementById("edicao-select");
    if (edicaoSelect && onEdicaoChange) {
        edicaoSelect.addEventListener("change", (e) => {
            onEdicaoChange(parseInt(e.target.value));
        });
    }

    // Event listeners para botões de fase
    document.querySelectorAll(".fase-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (onFaseChange) {
                onFaseChange(btn.dataset.fase);
            }
        });
    });

    console.log("[MATA-UI] Interface renderizada com sucesso");
}

// ============================================================================
// RENDERIZAÇÃO DE CONFRONTOS
// ============================================================================

export function renderTabelaMataMata(confrontos, containerId, faseLabel, edicao, isPending) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`[MATA-UI] Container ${containerId} não encontrado`);
        return;
    }

    if (!confrontos || confrontos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(255, 69, 0, 0.05); border-radius: 12px;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3 style="color: var(--text-muted);">Nenhum confronto disponível</h3>
                <p style="color: var(--text-muted); font-size: 14px;">Aguardando início da fase ${faseLabel}</p>
            </div>
        `;
        return;
    }

    const rodadaPontos = getRodadaPontosText(faseLabel, edicao);
    const textoConfronto = gerarTextoConfronto(faseLabel);

    let html = `
        <div style="margin-bottom: 24px;">
            <h3 style="
                color: var(--primary-color);
                font-size: 24px;
                margin: 0 0 8px 0;
                font-weight: 800;
            ">${textoConfronto}</h3>
            <p style="
                color: var(--text-muted);
                font-size: 14px;
                margin: 0;
            ">${rodadaPontos}</p>
            ${isPending ? `
                <div style="
                    background: rgba(255, 152, 0, 0.1);
                    border: 1px solid rgba(255, 152, 0, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-top: 12px;
                    color: #ff9800;
                    font-size: 13px;
                ">
                    ⏳ Aguardando conclusão da rodada
                </div>
            ` : ''}
        </div>

        <div style="display: grid; gap: 16px;">
    `;

    confrontos.forEach((confronto, index) => {
        html += renderizarConfrontoCard(confronto, index, isPending);
    });

    html += `</div>`;

    // Adicionar botão de exportação
    html += `
        <div id="mata-mata-export-container" style="margin-top: 24px;"></div>
    `;

    container.innerHTML = html;

    // Carregar módulo de exportação se disponível
    carregarModuloExportacao(confrontos, faseLabel, edicao, isPending, rodadaPontos);

    console.log(`[MATA-UI] Renderizados ${confrontos.length} confrontos da fase ${faseLabel}`);
}

// ============================================================================
// CARD INDIVIDUAL DE CONFRONTO
// ============================================================================

function renderizarConfrontoCard(confronto, index, isPending) {
    const { jogo, timeA, timeB, vencedorDeterminado } = confronto;

    const vencedorA = !isPending && vencedorDeterminado === "A";
    const vencedorB = !isPending && vencedorDeterminado === "B";

    const formatarPontos = (pontos) => {
        if (isPending || pontos === null || pontos === undefined) return "-";
        return typeof pontos === "number" ? pontos.toFixed(2) : "-";
    };

    const getCorPontos = (isVencedor, isPendente) => {
        if (isPendente) return "var(--text-muted)";
        return isVencedor ? "#10b981" : "#ef4444";
    };

    return `
        <div style="
            background: var(--bg-secondary);
            border: 1px solid ${vencedorA || vencedorB ? "var(--primary-color)" : "var(--border-color)"};
            border-radius: 12px;
            padding: 16px;
            transition: all 0.3s ease;
        " onmouseover="this.style.boxShadow='0 4px 12px rgba(255,69,0,0.15)'" 
           onmouseout="this.style.boxShadow='none'">
            
            <!-- Número do Jogo -->
            <div style="
                text-align: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--border-color);
            ">
                <span style="
                    background: var(--primary-color);
                    color: white;
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-weight: 700;
                    font-size: 14px;
                ">Jogo ${jogo}</span>
            </div>

            <!-- Confronto -->
            <div style="display: flex; align-items: center; gap: 16px;">
                
                <!-- Time A -->
                <div style="flex: 1; display: flex; align-items: center; gap: 12px;">
                    ${timeA?.clube_id ? `
                        <img src="/escudos/${timeA.clube_id}.png" 
                             style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${vencedorA ? "#10b981" : "var(--border-color)"}"
                             onerror="this.src='/escudos/default.png'"
                             alt="Escudo">
                    ` : `
                        <div style="
                            width: 40px; 
                            height: 40px; 
                            background: var(--bg-card); 
                            border: 2px solid var(--border-color); 
                            border-radius: 50%; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                        ">⚽</div>
                    `}
                    
                    <div style="flex: 1; min-width: 0;">
                        <div style="
                            font-weight: 700;
                            color: ${vencedorA ? "#10b981" : "var(--text-primary)"};
                            font-size: 14px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        ">
                            ${vencedorA ? "👑 " : ""}${timeA?.nome_time || "A definir"}
                        </div>
                        <div style="
                            font-size: 12px;
                            color: var(--text-muted);
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        ">${timeA?.nome_cartoleiro || timeA?.nome_cartola || "N/D"}</div>
                    </div>
                </div>

                <!-- Placar A -->
                <div style="
                    font-size: 24px;
                    font-weight: 900;
                    color: ${getCorPontos(vencedorA, isPending)};
                    min-width: 60px;
                    text-align: center;
                ">
                    ${formatarPontos(timeA?.pontos)}
                </div>

                <!-- VS -->
                <div style="
                    font-weight: 900;
                    color: var(--text-muted);
                    font-size: 16px;
                    padding: 0 8px;
                ">VS</div>

                <!-- Placar B -->
                <div style="
                    font-size: 24px;
                    font-weight: 900;
                    color: ${getCorPontos(vencedorB, isPending)};
                    min-width: 60px;
                    text-align: center;
                ">
                    ${formatarPontos(timeB?.pontos)}
                </div>

                <!-- Time B -->
                <div style="flex: 1; display: flex; align-items: center; gap: 12px; flex-direction: row-reverse;">
                    ${timeB?.clube_id ? `
                        <img src="/escudos/${timeB.clube_id}.png" 
                             style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${vencedorB ? "#10b981" : "var(--border-color)"}"
                             onerror="this.src='/escudos/default.png'"
                             alt="Escudo">
                    ` : `
                        <div style="
                            width: 40px; 
                            height: 40px; 
                            background: var(--bg-card); 
                            border: 2px solid var(--border-color); 
                            border-radius: 50%; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                        ">⚽</div>
                    `}
                    
                    <div style="flex: 1; min-width: 0; text-align: right;">
                        <div style="
                            font-weight: 700;
                            color: ${vencedorB ? "#10b981" : "var(--text-primary)"};
                            font-size: 14px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        ">
                            ${timeB?.nome_time || "A definir"}${vencedorB ? " 👑" : ""}
                        </div>
                        <div style="
                            font-size: 12px;
                            color: var(--text-muted);
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        ">${timeB?.nome_cartoleiro || timeB?.nome_cartola || "N/D"}</div>
                    </div>
                </div>

            </div>
        </div>
    `;
}

// ============================================================================
// EXPORTAÇÃO
// ============================================================================

async function carregarModuloExportacao(confrontos, fase, edicao, isPending, rodadaPontos) {
    try {
        const { criarBotaoExportacaoMataMata } = await import("../exports/export-mata-mata.js");
        
        await criarBotaoExportacaoMataMata({
            containerId: "mata-mata-export-container",
            fase,
            confrontos,
            isPending,
            rodadaPontos,
            edicao: `SuperCartola ${new Date().getFullYear()}`
        });
        
        console.log("[MATA-UI] Módulo de exportação carregado");
    } catch (error) {
        console.warn("[MATA-UI] Módulo de exportação não disponível:", error);
    }
}

console.log("[MATA-UI] ✅ Módulo de interface carregado");

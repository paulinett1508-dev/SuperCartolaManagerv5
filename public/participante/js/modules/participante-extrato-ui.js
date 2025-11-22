
// MÓDULO: UI DO EXTRATO PARTICIPANTE
// Renderização visual independente, específica para participantes

console.log('[EXTRATO-UI] 🎨 Módulo de UI carregado');

export function renderizarExtratoParticipante(extrato, participante) {
    const container = document.getElementById('fluxoFinanceiroContent');
    
    if (!container) {
        console.error('[EXTRATO-UI] Container não encontrado');
        return;
    }

    // ===== RENDERIZAR APENAS A TABELA (sem card grande) =====
    const html = `
        <div class="extrato-participante-table">
            <!-- Histórico de Rodadas -->
            <table class="tabela-extrato">
                <thead>
                    <tr>
                        <th>Rod</th>
                        <th>Pos</th>
                        <th>Bônus/Ônus</th>
                        <th>P.C</th>
                        <th>M-M</th>
                        <th>TOP10</th>
                        <th>Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    ${renderizarLinhasRodadas(extrato.rodadas)}
                    ${renderizarLinhaTotal(extrato.resumo)}
                </tbody>
            </table>
        </div>

        <style>
        .extrato-participante-table {
            width: 100%;
            overflow-x: auto;
        }

        .tabela-extrato {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }

        .tabela-extrato thead {
            background: linear-gradient(135deg, rgba(255, 69, 0, 0.15), rgba(255, 69, 0, 0.05));
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .tabela-extrato th {
            padding: 6px 4px;
            text-align: center;
            color: var(--participante-primary);
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
            border-bottom: 2px solid var(--participante-border);
            line-height: 1.2;
        }

        .tabela-extrato td {
            padding: 6px 4px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 10px;
            line-height: 1.3;
        }

        .tabela-extrato tbody tr:nth-child(even) {
            background: rgba(255, 255, 255, 0.02);
        }

        .tabela-extrato tbody tr:active {
            background: rgba(255, 69, 0, 0.1);
        }

        /* Badges de posição */
        .badge-pos {
            display: inline-flex;
            padding: 2px 5px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 9px;
            line-height: 1.2;
        }

        .badge-pos.mito {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
            border: 1px solid #f1c40f;
        }

        .badge-pos.mico {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: 1px solid #943126;
        }

        .badge-pos.top11 {
            background: rgba(46, 204, 113, 0.15);
            color: #2ecc71;
            border: 1px solid #2ecc71;
        }

        .badge-pos.z4 {
            background: rgba(231, 76, 60, 0.15);
            color: #e74c3c;
            border: 1px solid #e74c3c;
        }

        /* Valores monetários */
        .valor-positivo {
            color: #22c55e;
            font-weight: 700;
        }

        .valor-negativo {
            color: #ef4444;
            font-weight: 700;
        }

        .valor-zero {
            color: #666;
        }

        /* Linha de total */
        .linha-total {
            background: linear-gradient(135deg, rgba(255, 69, 0, 0.1), rgba(255, 69, 0, 0.05));
            border-top: 2px solid var(--participante-primary);
            font-weight: 700;
        }

        /* Responsividade */
        @media (max-width: 768px) {
            .tabela-extrato {
                font-size: 10px;
            }

            .tabela-extrato th,
            .tabela-extrato td {
                padding: 5px 3px;
            }
        }
        </style>
    `;

    container.innerHTML = html;

    // ===== ATUALIZAR CARDS DO TOPO (mantém os compactos) =====
    atualizarCardsHeader(extrato.resumo);
}

function renderizarLinhasRodadas(rodadas) {
    return rodadas.map((r) => `
        <tr>
            <td>${r.rodada}ª</td>
            <td>${formatarPosicao(r)}</td>
            <td>${formatarValor(r.bonusOnus)}</td>
            <td>${formatarValor(r.pontosCorridos)}</td>
            <td>${formatarValor(r.mataMata)}</td>
            <td>${formatarTop10(r)}</td>
            <td style="background: ${r.saldo >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};">
                ${formatarValor(r.saldo)}
            </td>
        </tr>
    `).join('');
}

function renderizarLinhaTotal(resumo) {
    return `
        <tr class="linha-total">
            <td colspan="2">📊 TOTAIS</td>
            <td>${formatarValor(resumo.bonus + resumo.onus)}</td>
            <td>${formatarValor(resumo.pontosCorridos)}</td>
            <td>${formatarValor(resumo.mataMata)}</td>
            <td>${formatarValor(resumo.top10 || 0)}</td>
            <td>-</td>
        </tr>
    `;
}

function formatarPosicao(rodada) {
    if (!rodada.posicao) return '<span class="badge-pos">-</span>';
    
    if (rodada.posicao === 1 || rodada.isMito) {
        return '<span class="badge-pos mito">🎩 MITO</span>';
    }
    
    if (rodada.posicao === rodada.totalTimes || rodada.isMico) {
        return '<span class="badge-pos mico">🐵 MICO</span>';
    }
    
    if (rodada.posicao >= 2 && rodada.posicao <= 11) {
        return `<span class="badge-pos top11">${rodada.posicao}º</span>`;
    }
    
    if (rodada.posicao >= 22 && rodada.posicao <= 31) {
        return `<span class="badge-pos z4">${rodada.posicao}º</span>`;
    }
    
    return `<span class="badge-pos">${rodada.posicao}º</span>`;
}

function formatarValor(valor) {
    const num = parseFloat(valor) || 0;
    
    if (num === 0) {
        return '<span class="valor-zero">-</span>';
    }
    
    const classe = num > 0 ? 'valor-positivo' : 'valor-negativo';
    const sinal = num > 0 ? '+' : '';
    const formatado = Math.abs(num).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return `<span class="${classe}">${sinal}${formatado}</span>`;
}

function formatarTop10(rodada) {
    if (!rodada.top10 || rodada.top10 === 0) {
        return '<span class="valor-zero">-</span>';
    }
    
    const status = rodada.top10Status || (rodada.top10 > 0 ? 'MITO' : 'MICO');
    const posicao = rodada.top10Posicao || 1;
    const cor = status === 'MITO' ? '#2ecc71' : '#e74c3c';
    const icone = status === 'MITO' ? '🏆' : '🐵';
    
    return `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1px;">
            <span style="font-size: 7px; color: ${cor}; font-weight: 600; line-height: 1.1;">
                ${icone} ${posicao}º ${status === 'MITO' ? 'MAIOR' : 'PIOR'}
            </span>
            ${formatarValor(rodada.top10)}
        </div>
    `;
}

function atualizarCardsHeader(resumo) {
    // Atualizar card "Ganhou"
    const ganhosEl = document.getElementById('totalGanhosHeader');
    if (ganhosEl && resumo.totalGanhos !== undefined) {
        ganhosEl.textContent = `${resumo.totalGanhos.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    // Atualizar card "Perdeu"
    const perdeuEl = document.getElementById('totalPerdeuHeader');
    if (perdeuEl && resumo.totalPerdas !== undefined) {
        perdeuEl.textContent = `${Math.abs(resumo.totalPerdas).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
}

export function mostrarLoading() {
    const container = document.getElementById('fluxoFinanceiroContent');
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando extrato...</p>
            </div>
        `;
    }
}

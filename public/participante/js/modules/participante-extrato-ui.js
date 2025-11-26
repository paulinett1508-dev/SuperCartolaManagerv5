// MÓDULO: UI DO EXTRATO PARTICIPANTE
// Renderização visual independente, específica para participantes

console.log('[EXTRATO-UI] 🎨 Módulo de UI carregado');

export function renderizarExtratoParticipante(extrato, participanteId) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[EXTRATO-UI] 🎨 INICIANDO RENDERIZAÇÃO');
  console.log('[EXTRATO-UI] 📦 Dados recebidos:', JSON.stringify(extrato, null, 2));
  console.log('[EXTRATO-UI] 👤 Participante:', participanteId);
  console.log('[EXTRATO-UI] 🔍 Validação CRÍTICA:', {
    extratoValido: !!extrato,
    temRodadas: Array.isArray(extrato?.rodadas),
    qtdRodadas: extrato?.rodadas?.length || 0,
    temResumo: !!extrato?.resumo,
    participanteValido: !!participanteId,
    estruturaCorreta: extrato && typeof extrato === 'object' && Array.isArray(extrato.rodadas)
  });
  console.log('═══════════════════════════════════════════════════════════════');

  const container = document.getElementById('fluxoFinanceiroContent');

  if (!container) {
    console.error('[EXTRATO-UI] ❌ Container "fluxoFinanceiroContent" não encontrado!');
    console.log('[EXTRATO-UI] 📍 Containers disponíveis:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
    return;
  }

  console.log('[EXTRATO-UI] ✅ Container encontrado');

  // Validar estrutura do extrato
  if (!extrato || !extrato.rodadas || !Array.isArray(extrato.rodadas)) {
    console.error('[EXTRATO-UI] ❌ Estrutura do extrato inválida:', extrato);
    container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1); 
                        border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3 style="color: #ef4444; margin-bottom: 12px;">Dados Inválidos</h3>
                <p style="color: #e0e0e0; margin-bottom: 20px;">A estrutura do extrato está incompleta ou corrompida.</p>
                <button onclick="window.forcarRefreshExtratoParticipante()" 
                        style="padding: 12px 24px; background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%); 
                               color: white; border: none; border-radius: 8px; cursor: pointer; 
                               font-weight: 600; font-size: 14px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    return;
  }

  console.log('[EXTRATO-UI] ✅ Dados validados');

  // ✅ ARMAZENAR GLOBALMENTE PARA POPUPS
  window.extratoAtual = extrato;
  console.log('[EXTRATO-UI] 💾 Dados armazenados globalmente');

  // ✅ CONFIGURAR BOTÃO DE REFRESH
  setTimeout(() => {
    const btnRefresh = document.getElementById('btnRefreshExtrato');
    if (btnRefresh) {
      btnRefresh.onclick = async () => {
        if (btnRefresh.classList.contains('loading')) return;

        btnRefresh.classList.add('loading');
        console.log('[EXTRATO-UI] 🔄 Refresh solicitado pelo participante');

        try {
          await window.forcarRefreshExtratoParticipante();
        } catch (error) {
          console.error('[EXTRATO-UI] Erro ao atualizar:', error);
          alert('Erro ao atualizar dados. Tente novamente.');
        } finally {
          btnRefresh.classList.remove('loading');
        }
      };
    }
  }, 100);

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

  console.log('[EXTRATO-UI] 📝 HTML gerado, inserindo no container...');
  container.innerHTML = html;
  console.log('[EXTRATO-UI] ✅ HTML inserido com sucesso');
  console.log('[EXTRATO-UI] 📊 Rodadas renderizadas:', extrato?.rodadas?.length || 0);

  // ===== ATUALIZAR CARDS DO TOPO (mantém os compactos) =====
  console.log('[EXTRATO-UI] 🎯 Atualizando cards do header...');
  atualizarCardsHeader(extrato.resumo);
  console.log('[EXTRATO-UI] ✅ Cards atualizados');
}

function renderizarLinhasRodadas(rodadas) {
  console.log('[EXTRATO-UI] 📊 Renderizando rodadas:', rodadas?.length || 0);
  
  if (!rodadas || rodadas.length === 0) {
    console.warn('[EXTRATO-UI] ⚠️ Nenhuma rodada para renderizar');
    return `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">Sem dados de rodadas</td></tr>`;
  }

  return rodadas.map((r, idx) => {
    console.log(`[EXTRATO-UI] Rodada ${idx + 1}/${rodadas.length}:`, {
      rodada: r.rodada,
      posicao: r.posicao,
      bonusOnus: r.bonusOnus,
      saldo: r.saldo
    });
    
    return `
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
    `;
  }).join('');
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
  // Atualizar Saldo Total
  const saldoEl = document.getElementById('saldoTotalHeader');
  const statusBadgeEl = document.getElementById('saldoStatusBadge');

  if (saldoEl && resumo.saldo !== undefined) {
    const saldo = parseFloat(resumo.saldo) || 0;

    saldoEl.textContent = `R$ ${Math.abs(saldo).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    // Atualizar badge de status
    if (statusBadgeEl) {
      const iconEl = statusBadgeEl.querySelector('.status-icon');
      const textEl = statusBadgeEl.querySelector('.status-text');

      if (saldo > 0) {
        saldoEl.style.color = '#22c55e';
        statusBadgeEl.style.borderColor = 'rgba(34, 197, 94, 0.3)';
        statusBadgeEl.style.background = 'rgba(34, 197, 94, 0.1)';
        if (iconEl) iconEl.textContent = '💰';
        if (textEl) {
          textEl.textContent = 'A Receber';
          textEl.style.color = '#22c55e';
        }
      } else if (saldo < 0) {
        saldoEl.style.color = '#ef4444';
        statusBadgeEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        statusBadgeEl.style.background = 'rgba(239, 68, 68, 0.1)';
        if (iconEl) iconEl.textContent = '💸';
        if (textEl) {
          textEl.textContent = 'A Pagar';
          textEl.style.color = '#ef4444';
        }
      } else {
        saldoEl.style.color = '#a0a0a0';
        statusBadgeEl.style.borderColor = 'rgba(160, 160, 160, 0.3)';
        statusBadgeEl.style.background = 'rgba(160, 160, 160, 0.1)';
        if (iconEl) iconEl.textContent = '✅';
        if (textEl) {
          textEl.textContent = 'Quitado';
          textEl.style.color = '#a0a0a0';
        }
      }
    }
  }

  // Atualizar card "Ganhou"
  const ganhosEl = document.getElementById('totalGanhosHeader');
  if (ganhosEl && resumo.totalGanhos !== undefined) {
    ganhosEl.textContent = `+R$ ${resumo.totalGanhos.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  // Atualizar card "Perdeu"
  const perdeuEl = document.getElementById('totalPerdeuHeader');
  if (perdeuEl && resumo.totalPerdas !== undefined) {
    perdeuEl.textContent = `R$ ${Math.abs(resumo.totalPerdas).toLocaleString('pt-BR', {
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

// Expor globalmente para refresh
window.mostrarLoadingExtrato = mostrarLoading;

// ===== FUNÇÕES DE DETALHAMENTO (POPUPS) =====
window.mostrarDetalhamentoGanhos = function () {
  const extrato = window.extratoAtual;
  if (!extrato) {
    console.warn('[EXTRATO-UI] Dados do extrato não disponíveis');
    return;
  }

  const detalhes = calcularDetalhamentoGanhos(extrato);
  mostrarPopupDetalhamento('Detalhamento: Tudo que Ganhou', detalhes, '#22c55e');
};

window.mostrarDetalhamentoPerdas = function () {
  const extrato = window.extratoAtual;
  if (!extrato) {
    console.warn('[EXTRATO-UI] Dados do extrato não disponíveis');
    return;
  }

  const detalhes = calcularDetalhamentoPerdas(extrato);
  mostrarPopupDetalhamento('Detalhamento: Tudo que Perdeu', detalhes, '#ef4444');
};

function calcularDetalhamentoGanhos(extrato) {
  const detalhes = {
    bonusOnus: 0,
    pontosCorridos: 0,
    mataMata: 0,
    top10: 0,
    melhorMes: 0,
    camposEditaveis: 0,
    rodadas: {
      bonusOnus: [],
      pontosCorridos: [],
      mataMata: [],
      top10: [],
      melhorMes: [],
    },
  };

  const rodadas = extrato.rodadas || [];
  const resumo = extrato.resumo || {};

  rodadas.forEach((rodada) => {
    if (rodada.bonusOnus > 0) {
      detalhes.bonusOnus += rodada.bonusOnus;
      detalhes.rodadas.bonusOnus.push({
        rodada: rodada.rodada,
        valor: rodada.bonusOnus,
      });
    }
    if (rodada.pontosCorridos > 0) {
      detalhes.pontosCorridos += rodada.pontosCorridos;
      detalhes.rodadas.pontosCorridos.push({
        rodada: rodada.rodada,
        valor: rodada.pontosCorridos,
      });
    }
    if (rodada.mataMata > 0) {
      detalhes.mataMata += rodada.mataMata;
      detalhes.rodadas.mataMata.push({
        rodada: rodada.rodada,
        valor: rodada.mataMata,
      });
    }
    if (rodada.top10 > 0) {
      detalhes.top10 += rodada.top10;
      detalhes.rodadas.top10.push({
        rodada: rodada.rodada,
        valor: rodada.top10,
        status: rodada.top10Status,
      });
    }
    if (rodada.melhorMes > 0) {
      detalhes.melhorMes += rodada.melhorMes;
      detalhes.rodadas.melhorMes.push({
        rodada: rodada.rodada,
        valor: rodada.melhorMes,
      });
    }
  });

  if (resumo.campo1 > 0) detalhes.camposEditaveis += resumo.campo1;
  if (resumo.campo2 > 0) detalhes.camposEditaveis += resumo.campo2;
  if (resumo.campo3 > 0) detalhes.camposEditaveis += resumo.campo3;
  if (resumo.campo4 > 0) detalhes.camposEditaveis += resumo.campo4;

  return detalhes;
}

function calcularDetalhamentoPerdas(extrato) {
  const detalhes = {
    bonusOnus: 0,
    pontosCorridos: 0,
    mataMata: 0,
    top10: 0,
    melhorMes: 0,
    camposEditaveis: 0,
    rodadas: {
      bonusOnus: [],
      pontosCorridos: [],
      mataMata: [],
      top10: [],
      melhorMes: [],
    },
  };

  const rodadas = extrato.rodadas || [];
  const resumo = extrato.resumo || {};

  rodadas.forEach((rodada) => {
    if (rodada.bonusOnus < 0) {
      detalhes.bonusOnus += rodada.bonusOnus;
      detalhes.rodadas.bonusOnus.push({
        rodada: rodada.rodada,
        valor: rodada.bonusOnus,
      });
    }
    if (rodada.pontosCorridos < 0) {
      detalhes.pontosCorridos += rodada.pontosCorridos;
      detalhes.rodadas.pontosCorridos.push({
        rodada: rodada.rodada,
        valor: rodada.pontosCorridos,
      });
    }
    if (rodada.mataMata < 0) {
      detalhes.mataMata += rodada.mataMata;
      detalhes.rodadas.mataMata.push({
        rodada: rodada.rodada,
        valor: rodada.mataMata,
      });
    }
    if (rodada.top10 < 0) {
      detalhes.top10 += rodada.top10;
      detalhes.rodadas.top10.push({
        rodada: rodada.rodada,
        valor: rodada.top10,
        status: rodada.top10Status,
      });
    }
    if (rodada.melhorMes < 0) {
      detalhes.melhorMes += rodada.melhorMes;
      detalhes.rodadas.melhorMes.push({
        rodada: rodada.rodada,
        valor: rodada.melhorMes,
      });
    }
  });

  if (resumo.campo1 < 0) detalhes.camposEditaveis += resumo.campo1;
  if (resumo.campo2 < 0) detalhes.camposEditaveis += resumo.campo2;
  if (resumo.campo3 < 0) detalhes.camposEditaveis += resumo.campo3;
  if (resumo.campo4 < 0) detalhes.camposEditaveis += resumo.campo4;

  return detalhes;
}

function mostrarPopupDetalhamento(titulo, detalhes, cor) {
  const formatarMoeda = (valor) => {
    return (valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const total =
    detalhes.bonusOnus +
    detalhes.pontosCorridos +
    detalhes.mataMata +
    detalhes.top10 +
    detalhes.melhorMes +
    detalhes.camposEditaveis;

  // Criar array de categorias com valores não-zero
  const categorias = [];
  
  if (detalhes.bonusOnus !== 0) {
    categorias.push({
      nome: 'Bônus/Ônus',
      icone: '💰',
      valor: detalhes.bonusOnus,
      rodadas: detalhes.rodadas.bonusOnus,
      percentual: Math.abs((detalhes.bonusOnus / total) * 100)
    });
  }
  
  if (detalhes.pontosCorridos !== 0) {
    categorias.push({
      nome: 'Pontos Corridos',
      icone: '⚽',
      valor: detalhes.pontosCorridos,
      rodadas: detalhes.rodadas.pontosCorridos,
      percentual: Math.abs((detalhes.pontosCorridos / total) * 100)
    });
  }
  
  if (detalhes.mataMata !== 0) {
    categorias.push({
      nome: 'Mata-Mata',
      icone: '🏆',
      valor: detalhes.mataMata,
      rodadas: detalhes.rodadas.mataMata,
      percentual: Math.abs((detalhes.mataMata / total) * 100)
    });
  }
  
  if (detalhes.top10 !== 0) {
    categorias.push({
      nome: 'TOP 10',
      icone: '🔝',
      valor: detalhes.top10,
      rodadas: detalhes.rodadas.top10,
      percentual: Math.abs((detalhes.top10 / total) * 100)
    });
  }
  
  if (detalhes.melhorMes !== 0) {
    categorias.push({
      nome: 'Melhor Mês',
      icone: '📅',
      valor: detalhes.melhorMes,
      rodadas: detalhes.rodadas.melhorMes,
      percentual: Math.abs((detalhes.melhorMes / total) * 100)
    });
  }
  
  if (detalhes.camposEditaveis !== 0) {
    categorias.push({
      nome: 'Ajustes Manuais',
      icone: '⚙️',
      valor: detalhes.camposEditaveis,
      rodadas: [],
      percentual: Math.abs((detalhes.camposEditaveis / total) * 100)
    });
  }

  const html = `
    <style>
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fillBar {
        from {
          width: 0%;
        }
      }
      
      #popupDetalhamento {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(6px);
        padding: 20px;
        box-sizing: border-box;
        animation: fadeIn 0.3s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      #popupDetalhamento .modal-content {
        background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
        border-radius: 20px;
        max-width: 550px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 80px rgba(0,0,0,0.8);
        border: 2px solid ${cor};
        animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      
      #popupDetalhamento .modal-header {
        background: linear-gradient(135deg, ${cor} 0%, ${cor}dd 100%);
        padding: 24px;
        border-radius: 18px 18px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      
      #popupDetalhamento .modal-header h3 {
        margin: 0;
        color: white;
        font-size: 18px;
        font-weight: 700;
        flex: 1;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      
      #popupDetalhamento .btn-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      
      #popupDetalhamento .btn-close:hover {
        background: rgba(255,255,255,0.3);
        transform: rotate(90deg);
      }
      
      #popupDetalhamento .modal-body {
        padding: 24px;
      }
      
      #popupDetalhamento .categoria-item {
        background: rgba(255,255,255,0.03);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        transition: all 0.3s ease;
        animation: slideIn 0.5s ease both;
      }
      
      #popupDetalhamento .categoria-item:hover {
        background: rgba(255,255,255,0.06);
        border-color: ${cor}40;
        transform: translateX(4px);
      }
      
      #popupDetalhamento .categoria-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      
      #popupDetalhamento .categoria-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      #popupDetalhamento .categoria-icone {
        font-size: 24px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${cor}20;
        border-radius: 8px;
      }
      
      #popupDetalhamento .categoria-nome {
        font-weight: 600;
        color: #fff;
        font-size: 14px;
      }
      
      #popupDetalhamento .categoria-valor {
        font-weight: 700;
        font-size: 16px;
        color: ${cor};
        text-shadow: 0 2px 8px ${cor}40;
      }
      
      #popupDetalhamento .barra-container {
        background: rgba(255,255,255,0.05);
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      #popupDetalhamento .barra-progresso {
        height: 100%;
        background: linear-gradient(90deg, ${cor} 0%, ${cor}cc 100%);
        border-radius: 3px;
        animation: fillBar 1s ease-out both;
        box-shadow: 0 0 10px ${cor}80;
      }
      
      #popupDetalhamento .categoria-detalhes {
        font-size: 11px;
        color: #999;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      #popupDetalhamento .percentual-badge {
        background: ${cor}20;
        color: ${cor};
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 10px;
      }
      
      #popupDetalhamento .total-section {
        background: linear-gradient(135deg, ${cor}25 0%, ${cor}15 100%);
        padding: 20px;
        border-radius: 12px;
        border: 2px solid ${cor};
        margin-top: 20px;
        box-shadow: 0 4px 16px ${cor}20;
      }
      
      #popupDetalhamento .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      #popupDetalhamento .total-label {
        font-weight: 700;
        color: #fff;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      #popupDetalhamento .total-value {
        font-weight: 800;
        font-size: 24px;
        color: ${cor};
        text-shadow: 0 2px 12px ${cor}60;
      }
      
      @media (max-width: 768px) {
        #popupDetalhamento .modal-content {
          max-width: 95vw;
          max-height: 85vh;
          border-radius: 16px;
        }
        
        #popupDetalhamento .modal-header {
          padding: 18px;
        }
        
        #popupDetalhamento .modal-header h3 {
          font-size: 15px;
        }
        
        #popupDetalhamento .modal-body {
          padding: 18px;
        }
        
        #popupDetalhamento .categoria-icone {
          font-size: 20px;
          width: 36px;
          height: 36px;
        }
        
        #popupDetalhamento .categoria-nome {
          font-size: 13px;
        }
        
        #popupDetalhamento .categoria-valor {
          font-size: 14px;
        }
        
        #popupDetalhamento .total-value {
          font-size: 20px;
        }
      }
    </style>
    
    <div id="popupDetalhamento" onclick="this.remove()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <!-- CABEÇALHO -->
        <div class="modal-header">
          <h3>${titulo}</h3>
          <button class="btn-close" onclick="document.getElementById('popupDetalhamento').remove()">×</button>
        </div>

        <!-- CONTEÚDO -->
        <div class="modal-body">
          ${categorias.map((cat, idx) => `
            <div class="categoria-item" style="animation-delay: ${idx * 0.1}s;">
              <div class="categoria-header">
                <div class="categoria-info">
                  <div class="categoria-icone">${cat.icone}</div>
                  <span class="categoria-nome">${cat.nome}</span>
                </div>
                <span class="categoria-valor">R$ ${formatarMoeda(cat.valor)}</span>
              </div>
              
              <div class="barra-container">
                <div class="barra-progresso" style="width: ${cat.percentual}%; animation-delay: ${idx * 0.1}s;"></div>
              </div>
              
              <div class="categoria-detalhes">
                <span>${cat.rodadas.length > 0 ? `${cat.rodadas.length} rodada(s)` : 'Ajuste manual'}</span>
                <span class="percentual-badge">${cat.percentual.toFixed(1)}%</span>
              </div>
            </div>
          `).join('')}

          <!-- TOTAL -->
          <div class="total-section">
            <div class="total-row">
              <span class="total-label">
                💵 <span>TOTAL ${titulo.includes('Ganhou') ? 'GANHO' : 'PERDIDO'}</span>
              </span>
              <span class="total-value">R$ ${formatarMoeda(Math.abs(total))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}
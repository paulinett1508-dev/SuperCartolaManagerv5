// MÓDULO: UI DO EXTRATO PARTICIPANTE
// Renderização visual independente, específica para participantes

console.log('[EXTRATO-UI] 🎨 Módulo de UI carregado');

export function renderizarExtratoParticipante(extrato, participanteId) {
  // Validação silenciosa - log apenas se houver problema
    const validacao = {
        extratoValido: !!extrato,
        temRodadas: !!extrato.rodadas,
        qtdRodadas: extrato.rodadas?.length || 0,
        temResumo: !!extrato.resumo,
        participanteValido: !!participanteId,
        saldoFinal: extrato.resumo?.saldo_final
    };

    if (!validacao.extratoValido || validacao.qtdRodadas === 0) {
        console.warn('[EXTRATO-UI] ⚠️ Problema na validação:', validacao);
    }

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
  mostrarPopupDetalhamento('💰 Detalhamento Completo de Ganhos', detalhes, '#22c55e', 'ganhos');
};

window.mostrarDetalhamentoPerdas = function () {
  const extrato = window.extratoAtual;
  if (!extrato) {
    console.warn('[EXTRATO-UI] Dados do extrato não disponíveis');
    return;
  }

  const detalhes = calcularDetalhamentoPerdas(extrato);
  mostrarPopupDetalhamento('💸 Detalhamento Completo de Perdas', detalhes, '#ef4444', 'perdas');
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
    estatisticas: {
      totalRodadasComGanho: 0,
      maiorGanhoRodada: { rodada: 0, valor: 0, categoria: '' },
      mediaGanhoPorRodada: 0,
      rodadasMito: 0,
      rodadasTop11: 0,
    }
  };

  const rodadas = extrato.rodadas || [];
  const resumo = extrato.resumo || {};
  let somaGanhos = 0;
  let rodadasComGanho = 0;

  rodadas.forEach((rodada) => {
    let ganhoRodada = 0;

    if (rodada.bonusOnus > 0) {
      detalhes.bonusOnus += rodada.bonusOnus;
      ganhoRodada += rodada.bonusOnus;
      detalhes.rodadas.bonusOnus.push({
        rodada: rodada.rodada,
        valor: rodada.bonusOnus,
        posicao: rodada.posicao,
        isMito: rodada.isMito
      });
    }
    if (rodada.pontosCorridos > 0) {
      detalhes.pontosCorridos += rodada.pontosCorridos;
      ganhoRodada += rodada.pontosCorridos;
      detalhes.rodadas.pontosCorridos.push({
        rodada: rodada.rodada,
        valor: rodada.pontosCorridos,
      });
    }
    if (rodada.mataMata > 0) {
      detalhes.mataMata += rodada.mataMata;
      ganhoRodada += rodada.mataMata;
      detalhes.rodadas.mataMata.push({
        rodada: rodada.rodada,
        valor: rodada.mataMata,
      });
    }
    if (rodada.top10 > 0) {
      detalhes.top10 += rodada.top10;
      ganhoRodada += rodada.top10;
      detalhes.rodadas.top10.push({
        rodada: rodada.rodada,
        valor: rodada.top10,
        status: rodada.top10Status,
        posicao: rodada.top10Posicao
      });
    }
    if (rodada.melhorMes > 0) {
      detalhes.melhorMes += rodada.melhorMes;
      ganhoRodada += rodada.melhorMes;
      detalhes.rodadas.melhorMes.push({
        rodada: rodada.rodada,
        valor: rodada.melhorMes,
      });
    }

    // Estatísticas
    if (ganhoRodada > 0) {
      rodadasComGanho++;
      somaGanhos += ganhoRodada;

      if (ganhoRodada > detalhes.estatisticas.maiorGanhoRodada.valor) {
        detalhes.estatisticas.maiorGanhoRodada = {
          rodada: rodada.rodada,
          valor: ganhoRodada,
          categoria: 'Misto'
        };
      }
    }

    if (rodada.isMito) detalhes.estatisticas.rodadasMito++;
    if (rodada.posicao >= 2 && rodada.posicao <= 11) detalhes.estatisticas.rodadasTop11++;
  });

  if (resumo.campo1 > 0) detalhes.camposEditaveis += resumo.campo1;
  if (resumo.campo2 > 0) detalhes.camposEditaveis += resumo.campo2;
  if (resumo.campo3 > 0) detalhes.camposEditaveis += resumo.campo3;
  if (resumo.campo4 > 0) detalhes.camposEditaveis += resumo.campo4;

  detalhes.estatisticas.totalRodadasComGanho = rodadasComGanho;
  detalhes.estatisticas.mediaGanhoPorRodada = rodadasComGanho > 0 ? somaGanhos / rodadasComGanho : 0;

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
    estatisticas: {
      totalRodadasComPerda: 0,
      maiorPerdaRodada: { rodada: 0, valor: 0, categoria: '' },
      mediaPerdaPorRodada: 0,
      rodadasMico: 0,
      rodadasZ4: 0,
    }
  };

  const rodadas = extrato.rodadas || [];
  const resumo = extrato.resumo || {};
  let somaPerdas = 0;
  let rodadasComPerda = 0;

  rodadas.forEach((rodada) => {
    let perdaRodada = 0;

    if (rodada.bonusOnus < 0) {
      detalhes.bonusOnus += rodada.bonusOnus;
      perdaRodada += Math.abs(rodada.bonusOnus);
      detalhes.rodadas.bonusOnus.push({
        rodada: rodada.rodada,
        valor: rodada.bonusOnus,
        posicao: rodada.posicao,
        isMico: rodada.isMico
      });
    }
    if (rodada.pontosCorridos < 0) {
      detalhes.pontosCorridos += rodada.pontosCorridos;
      perdaRodada += Math.abs(rodada.pontosCorridos);
      detalhes.rodadas.pontosCorridos.push({
        rodada: rodada.rodada,
        valor: rodada.pontosCorridos,
      });
    }
    if (rodada.mataMata < 0) {
      detalhes.mataMata += rodada.mataMata;
      perdaRodada += Math.abs(rodada.mataMata);
      detalhes.rodadas.mataMata.push({
        rodada: rodada.rodada,
        valor: rodada.mataMata,
      });
    }
    if (rodada.top10 < 0) {
      detalhes.top10 += rodada.top10;
      perdaRodada += Math.abs(rodada.top10);
      detalhes.rodadas.top10.push({
        rodada: rodada.rodada,
        valor: rodada.top10,
        status: rodada.top10Status,
        posicao: rodada.top10Posicao
      });
    }
    if (rodada.melhorMes < 0) {
      detalhes.melhorMes += rodada.melhorMes;
      perdaRodada += Math.abs(rodada.melhorMes);
      detalhes.rodadas.melhorMes.push({
        rodada: rodada.rodada,
        valor: rodada.melhorMes,
      });
    }

    // Estatísticas
    if (perdaRodada > 0) {
      rodadasComPerda++;
      somaPerdas += perdaRodada;

      if (perdaRodada > Math.abs(detalhes.estatisticas.maiorPerdaRodada.valor)) {
        detalhes.estatisticas.maiorPerdaRodada = {
          rodada: rodada.rodada,
          valor: -perdaRodada,
          categoria: 'Misto'
        };
      }
    }

    if (rodada.isMico) detalhes.estatisticas.rodadasMico++;
    if (rodada.posicao >= 22 && rodada.posicao <= 31) detalhes.estatisticas.rodadasZ4++;
  });

  if (resumo.campo1 < 0) detalhes.camposEditaveis += resumo.campo1;
  if (resumo.campo2 < 0) detalhes.camposEditaveis += resumo.campo2;
  if (resumo.campo3 < 0) detalhes.camposEditaveis += resumo.campo3;
  if (resumo.campo4 < 0) detalhes.camposEditaveis += resumo.campo4;

  detalhes.estatisticas.totalRodadasComPerda = rodadasComPerda;
  detalhes.estatisticas.mediaPerdaPorRodada = rodadasComPerda > 0 ? somaPerdas / rodadasComPerda : 0;

  return detalhes;
}

function mostrarPopupDetalhamento(titulo, detalhes, cor, tipo) {
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
      icone: tipo === 'ganhos' ? '🎁' : '⚠️',
      valor: detalhes.bonusOnus,
      rodadas: detalhes.rodadas.bonusOnus,
      percentual: Math.abs((detalhes.bonusOnus / total) * 100),
      descricao: tipo === 'ganhos' ? 'Bônus por posições de destaque' : 'Ônus por posições ruins'
    });
  }

  if (detalhes.pontosCorridos !== 0) {
    categorias.push({
      nome: 'Pontos Corridos',
      icone: '⚽',
      valor: detalhes.pontosCorridos,
      rodadas: detalhes.rodadas.pontosCorridos,
      percentual: Math.abs((detalhes.pontosCorridos / total) * 100),
      descricao: tipo === 'ganhos' ? 'Vitórias em confrontos diretos' : 'Derrotas em confrontos diretos'
    });
  }

  if (detalhes.mataMata !== 0) {
    categorias.push({
      nome: 'Mata-Mata',
      icone: '🏆',
      valor: detalhes.mataMata,
      rodadas: detalhes.rodadas.mataMata,
      percentual: Math.abs((detalhes.mataMata / total) * 100),
      descricao: tipo === 'ganhos' ? 'Premiações de edições do Mata-Mata' : 'Taxas de participação no Mata-Mata'
    });
  }

  if (detalhes.top10 !== 0) {
    categorias.push({
      nome: 'TOP 10',
      icone: tipo === 'ganhos' ? '🌟' : '💩',
      valor: detalhes.top10,
      rodadas: detalhes.rodadas.top10,
      percentual: Math.abs((detalhes.top10 / total) * 100),
      descricao: tipo === 'ganhos' ? 'Maiores pontuações da rodada' : 'Piores pontuações da rodada'
    });
  }

  if (detalhes.melhorMes !== 0) {
    categorias.push({
      nome: 'Melhor Mês',
      icone: '📅',
      valor: detalhes.melhorMes,
      rodadas: detalhes.rodadas.melhorMes,
      percentual: Math.abs((detalhes.melhorMes / total) * 100),
      descricao: 'Prêmios mensais acumulados'
    });
  }

  if (detalhes.camposEditaveis !== 0) {
    categorias.push({
      nome: 'Ajustes Manuais',
      icone: '⚙️',
      valor: detalhes.camposEditaveis,
      rodadas: [],
      percentual: Math.abs((detalhes.camposEditaveis / total) * 100),
      descricao: 'Valores inseridos manualmente pelo administrador'
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

      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 10px ${cor}40;
        }
        50% {
          box-shadow: 0 0 20px ${cor}80;
        }
      }

      #popupDetalhamento {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 16px;
        box-sizing: border-box;
        animation: fadeIn 0.3s ease;
        overflow-y: auto;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      #popupDetalhamento .modal-content {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        border-radius: 20px;
        max-width: 650px;
        width: 100%;
        max-height: 92vh;
        overflow-y: auto;
        box-shadow: 0 25px 80px rgba(0,0,0,0.9), 0 0 40px ${cor}30;
        border: 2px solid ${cor};
        animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      #popupDetalhamento .modal-header {
        background: linear-gradient(135deg, ${cor} 0%, ${cor}dd 100%);
        padding: 24px 20px;
        border-radius: 18px 18px 0 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      }

      #popupDetalhamento .modal-header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      #popupDetalhamento .modal-header h3 {
        margin: 0;
        color: white;
        font-size: 18px;
        font-weight: 700;
        flex: 1;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }

      #popupDetalhamento .stats-resumo {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
        padding: 12px;
        background: rgba(0,0,0,0.2);
        border-radius: 12px;
        margin-top: 8px;
      }

      #popupDetalhamento .stat-resumo-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      #popupDetalhamento .stat-resumo-label {
        font-size: 10px;
        color: rgba(255,255,255,0.7);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }

      #popupDetalhamento .stat-resumo-valor {
        font-size: 16px;
        color: white;
        font-weight: 800;
        font-family: 'JetBrains Mono', monospace;
      }

      #popupDetalhamento .btn-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      #popupDetalhamento .btn-close:active {
        background: rgba(255,255,255,0.3);
        transform: scale(0.9);
      }

      #popupDetalhamento .modal-body {
        padding: 20px;
      }

      #popupDetalhamento .categoria-item {
        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 16px;
        border: 1px solid rgba(255,255,255,0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        animation: slideIn 0.5s ease both;
        position: relative;
        overflow: hidden;
      }

      #popupDetalhamento .categoria-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: ${cor};
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      #popupDetalhamento .categoria-item:active {
        background: rgba(255,255,255,0.08);
        border-color: ${cor}60;
        transform: scale(0.98);
      }

      #popupDetalhamento .categoria-item:active::before {
        opacity: 1;
      }

      #popupDetalhamento .categoria-descricao {
        font-size: 10px;
        color: rgba(255,255,255,0.5);
        margin-top: 4px;
        font-style: italic;
      }

      #popupDetalhamento .categoria-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      #popupDetalhamento .categoria-info {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }

      #popupDetalhamento .categoria-icone {
        font-size: 22px;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${cor}20;
        border-radius: 8px;
        flex-shrink: 0;
      }

      #popupDetalhamento .categoria-nome {
        font-weight: 600;
        color: #fff;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #popupDetalhamento .categoria-valor {
        font-weight: 700;
        font-size: 15px;
        color: ${cor};
        text-shadow: 0 2px 8px ${cor}40;
        white-space: nowrap;
        margin-left: 8px;
      }

      #popupDetalhamento .barra-container {
        background: rgba(255,255,255,0.05);
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 10px;
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
        margin-bottom: 8px;
      }

      #popupDetalhamento .percentual-badge {
        background: ${cor}20;
        color: ${cor};
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 10px;
      }

      #popupDetalhamento .rodadas-lista {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;
      }

      #popupDetalhamento .rodada-chip {
        background: rgba(255,255,255,0.08);
        color: #fff;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,0.1);
      }

      #popupDetalhamento .total-section {
        background: linear-gradient(135deg, ${cor}25 0%, ${cor}15 100%);
        padding: 18px;
        border-radius: 12px;
        border: 2px solid ${cor};
        margin-top: 18px;
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
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #popupDetalhamento .total-value {
        font-weight: 800;
        font-size: 22px;
        color: ${cor};
        text-shadow: 0 2px 12px ${cor}60;
      }

      @media (max-width: 768px) {
        #popupDetalhamento {
          padding: 12px;
        }

        #popupDetalhamento .modal-content {
          max-width: 95vw;
          max-height: 88vh;
          border-radius: 16px;
        }

        #popupDetalhamento .modal-header {
          padding: 16px;
        }

        #popupDetalhamento .modal-header h3 {
          font-size: 14px;
        }

        #popupDetalhamento .modal-body {
          padding: 16px;
        }

        #popupDetalhamento .categoria-icone {
          font-size: 20px;
          width: 34px;
          height: 34px;
        }

        #popupDetalhamento .categoria-nome {
          font-size: 12px;
        }

        #popupDetalhamento .categoria-valor {
          font-size: 13px;
        }

        #popupDetalhamento .total-value {
          font-size: 18px;
        }
      }
    </style>

    <div id="popupDetalhamento" onclick="this.remove()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <!-- CABEÇALHO -->
        <div class="modal-header">
          <div class="modal-header-top">
            <h3>${titulo}</h3>
            <button class="btn-close" onclick="document.getElementById('popupDetalhamento').remove()">×</button>
          </div>
          
          <!-- ESTATÍSTICAS GERAIS -->
          ${detalhes.estatisticas ? `
            <div class="stats-resumo">
              <div class="stat-resumo-item">
                <span class="stat-resumo-label">Rodadas</span>
                <span class="stat-resumo-valor">${tipo === 'ganhos' ? detalhes.estatisticas.totalRodadasComGanho : detalhes.estatisticas.totalRodadasComPerda}</span>
              </div>
              ${tipo === 'ganhos' ? `
                <div class="stat-resumo-item">
                  <span class="stat-resumo-label">Média/Rodada</span>
                  <span class="stat-resumo-valor">R$ ${formatarMoeda(detalhes.estatisticas.mediaGanhoPorRodada)}</span>
                </div>
                <div class="stat-resumo-item">
                  <span class="stat-resumo-label">🎩 Mito</span>
                  <span class="stat-resumo-valor">${detalhes.estatisticas.rodadasMito}x</span>
                </div>
                <div class="stat-resumo-item">
                  <span class="stat-resumo-label">Top 11</span>
                  <span class="stat-resumo-valor">${detalhes.estatisticas.rodadasTop11}x</span>
                </div>
              ` : `
                <div class="stat-resumo-item">
                  <span class="stat-resumo-label">Média/Rodada</span>
                  <span class="stat-resumo-valor">R$ ${formatarMoeda(Math.abs(detalhes.estatisticas.mediaPerdaPorRodada))}</span>
                </div>
                <div class="stat-resumo-item">
                  <span class="stat-resumo-label">🐵 Mico</span>
                  <span class="stat-resumo-valor">${detalhes.estatisticas.rodadasMico}x</span>
                </div>
                <div class="stat-resumo-item">
                  <span class="stat-resumo-label">Z4</span>
                  <span class="stat-resumo-valor">${detalhes.estatisticas.rodadasZ4}x</span>
                </div>
              `}
            </div>
          ` : ''}
        </div>

        <!-- CONTEÚDO -->
        <div class="modal-body">
          ${categorias.map((cat, idx) => `
            <div class="categoria-item" style="animation-delay: ${idx * 0.1}s;">
              <div class="categoria-header">
                <div class="categoria-info">
                  <div class="categoria-icone">${cat.icone}</div>
                  <div style="flex: 1; min-width: 0;">
                    <span class="categoria-nome">${cat.nome}</span>
                    ${cat.descricao ? `<div class="categoria-descricao">${cat.descricao}</div>` : ''}
                  </div>
                </div>
                <span class="categoria-valor">R$ ${formatarMoeda(Math.abs(cat.valor))}</span>
              </div>

              <div class="barra-container">
                <div class="barra-progresso" style="width: ${cat.percentual}%; animation-delay: ${idx * 0.1}s;"></div>
              </div>

              <div class="categoria-detalhes">
                <span>${cat.rodadas.length > 0 ? `${cat.rodadas.length} rodada(s)` : 'Ajuste manual'}</span>
                <span class="percentual-badge">${cat.percentual.toFixed(1)}% do total</span>
              </div>

              ${cat.rodadas.length > 0 ? `
                <div class="rodadas-lista">
                  ${cat.rodadas.slice(0, 12).map(r => {
                    const extras = [];
                    if (r.isMito) extras.push('🎩');
                    if (r.isMico) extras.push('🐵');
                    if (r.status === 'MITO') extras.push(`🏆${r.posicao}º`);
                    if (r.status === 'MICO') extras.push(`💩${r.posicao}º`);
                    
                    return `<span class="rodada-chip">R${r.rodada}: ${r.valor > 0 ? '+' : ''}${formatarMoeda(r.valor)} ${extras.join(' ')}</span>`;
                  }).join('')}
                  ${cat.rodadas.length > 12 ? `<span class="rodada-chip" style="background: rgba(255,255,255,0.15);">+${cat.rodadas.length - 12} rodadas</span>` : ''}
                </div>
              ` : ''}
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
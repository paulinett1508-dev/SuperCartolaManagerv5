
// ✅ EXPORT-RODADAS-HQ.JS - EXPORTAÇÃO DE RODADAS EM ALTA QUALIDADE
// Sistema otimizado especificamente para exportar rankings de rodadas com máxima qualidade

import { 
  EXPORT_BASE_CONFIG, 
  criarHeaderProfissional, 
  criarFooterProfissional,
  gerarCanvasDownload,
  mostrarNotificacaoSucesso,
  mostrarNotificacaoErro 
} from './export-base.js';

console.log("[EXPORT-RODADAS-HQ] 🚀 Módulo de alta qualidade carregado");

// ✅ CONFIGURAÇÃO ESPECÍFICA PARA RODADAS EM ALTA QUALIDADE
const RODADAS_HQ_CONFIG = {
  ...EXPORT_BASE_CONFIG,
  width: 1200, // ✅ AINDA MAIOR para rodadas
  scale: 4, // ✅ ESCALA 4x para máxima qualidade
  fonts: {
    title: "36px Inter, sans-serif",
    subtitle: "22px Inter, sans-serif", 
    heading: "20px Inter, sans-serif",
    body: "16px Inter, sans-serif",
    caption: "14px Inter, sans-serif",
  },
};

// ✅ FUNÇÃO PRINCIPAL PARA EXPORTAR RODADAS EM ALTA QUALIDADE
export async function exportarRodadaAltaQualidade(rankings, rodada, tipo = "rodada") {
  console.log(`[EXPORT-RODADAS-HQ] 🎨 Exportando rodada ${rodada} em alta qualidade...`);

  try {
    // Criar container de exportação com configurações HQ
    const exportContainer = document.createElement("div");
    exportContainer.id = "rodada-hq-export-container";
    exportContainer.style.cssText = `
      position: absolute;
      top: -99999px;
      left: -99999px;
      width: ${RODADAS_HQ_CONFIG.width}px;
      background: ${RODADAS_HQ_CONFIG.colors.background};
      font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.4;
      color: ${RODADAS_HQ_CONFIG.colors.text};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    `;

    // Construir layout otimizado para alta qualidade
    exportContainer.innerHTML = criarLayoutRodadaHQ({ rankings, rodada, tipo });

    document.body.appendChild(exportContainer);

    // Aguardar renderização completa
    await new Promise(resolve => setTimeout(resolve, 500));

    // Aguardar carregamento de todas as imagens
    const imagens = exportContainer.querySelectorAll("img");
    if (imagens.length > 0) {
      await Promise.all(
        Array.from(imagens).map(img => {
          return new Promise(resolve => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 3000); // Timeout maior para HQ
            }
          });
        })
      );
    }

    console.log("[EXPORT-RODADAS-HQ] 📸 Capturando em alta qualidade...");

    // Capturar com configurações de máxima qualidade
    const canvas = await window.html2canvas(exportContainer, {
      allowTaint: true,
      useCORS: true,
      scale: RODADAS_HQ_CONFIG.scale, // Escala 4x
      logging: false,
      width: RODADAS_HQ_CONFIG.width,
      height: exportContainer.scrollHeight,
      backgroundColor: RODADAS_HQ_CONFIG.colors.background,
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2), // Pixel ratio mínimo 2x
      removeContainer: true,
      imageTimeout: 8000, // Timeout maior para HQ
      letterRendering: true, // Melhor renderização de texto
    });

    // Gerar nome do arquivo
    const timestamp = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    const nomeArquivo = `ranking-rodada-${rodada}-hq-${timestamp}.png`;

    // Download em qualidade máxima
    const link = document.createElement("a");
    link.download = nomeArquivo;
    link.href = canvas.toDataURL("image/png", 1.0); // Qualidade máxima
    link.click();

    console.log("[EXPORT-RODADAS-HQ] ✅ Exportação HQ concluída com sucesso");
    mostrarNotificacaoSucesso("Imagem de alta qualidade exportada com sucesso!");

  } catch (error) {
    console.error("[EXPORT-RODADAS-HQ] ❌ Erro na exportação HQ:", error);
    mostrarNotificacaoErro("Erro ao exportar imagem HQ. Tente novamente.");
    throw error;
  } finally {
    // Limpar container temporário
    const container = document.getElementById("rodada-hq-export-container");
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT OTIMIZADO PARA ALTA QUALIDADE
function criarLayoutRodadaHQ({ rankings, rodada, tipo }) {
  const titulo = `Ranking da Rodada ${rodada}`;
  const subtitulo = `Resultados da ${rodada}ª rodada`;

  return `
    ${criarHeaderProfissional(titulo, subtitulo, { rodada })}

    <!-- CONTEÚDO PRINCIPAL - ALTA QUALIDADE -->
    <div style="padding: ${RODADAS_HQ_CONFIG.padding}px;">

      <!-- TABELA DE RANKING OTIMIZADA -->
      <div style="
        background: ${RODADAS_HQ_CONFIG.colors.surface};
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
        border: 1px solid ${RODADAS_HQ_CONFIG.colors.border};
      ">
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:16px;">
            <thead>
              <tr style="background: ${RODADAS_HQ_CONFIG.colors.primary}; color: white;">
                <th style="width: 80px; text-align: center; padding: 14px 8px; font: 600 14px Inter, sans-serif; letter-spacing: 0.5px;">POSIÇÃO</th>
                <th style="width: 60px; text-align: center; padding: 14px 8px; font: 600 14px Inter, sans-serif; letter-spacing: 0.5px;">CLUBE</th>
                <th style="text-align: left; padding: 14px 8px; font: 600 14px Inter, sans-serif; letter-spacing: 0.5px;">CARTOLEIRO / TIME</th>
                <th style="width: 100px; text-align: center; padding: 14px 8px; font: 600 14px Inter, sans-serif; letter-spacing: 0.5px;">PONTOS</th>
                <th style="width: 120px; text-align: center; padding: 14px 8px; font: 600 14px Inter, sans-serif; letter-spacing: 0.5px;">BANCO</th>
              </tr>
            </thead>
            <tbody>
              ${rankings.map((time, index) => {
                const nomeCartoleiro = time.nome_cartola || time.nome_cartoleiro || "N/D";
                const nomeTime = time.nome_time || time.nome || "N/D";

                // Posição com destaque especial para HQ
                let posContent = "";
                if (index === 0) {
                  posContent = `<span style="background:#198754; color:#fff; font-weight:bold; border-radius:6px; padding:4px 12px; font-size:14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">MITO</span>`;
                } else if (index === rankings.length - 1 && rankings.length > 1) {
                  posContent = `<span style="background:#dc3545; color:#fff; font-weight:bold; border-radius:6px; padding:4px 12px; font-size:14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">MICO</span>`;
                } else {
                  posContent = `<span style="font-weight:600; font-size:16px;">${index + 1}º</span>`;
                }

                // Banco com destaque
                const bancoValor = time.banco || 0;
                const bancoClass = bancoValor >= 0 ? RODADAS_HQ_CONFIG.colors.success : RODADAS_HQ_CONFIG.colors.danger;
                const bancoSinal = bancoValor >= 0 ? "+" : "";
                
                const rowBg = index === 0 ? "background: linear-gradient(135deg, #e7f3ff, #f0f8ff);" :
                             index === rankings.length - 1 && rankings.length > 1 ? "background: linear-gradient(135deg, #ffe7e7, #fff0f0);" :
                             index % 2 === 0 ? "background: #f8f9fa;" : "";

                return `
                  <tr style="border-bottom: 2px solid ${RODADAS_HQ_CONFIG.colors.border}; ${rowBg}">
                    <td style="text-align:center; padding: 12px 8px;">${posContent}</td>
                    <td style="text-align:center; padding: 12px 8px;">
                      ${time.clube_id ? `<img src="/escudos/${time.clube_id}.png" alt="" style="width:28px; height:28px; border-radius:50%; background:#fff; border:2px solid #eee; vertical-align: middle;" onerror="this.style.display='none'"/>` : "—"}
                    </td>
                    <td style="text-align:left; padding: 12px 8px;">
                      <div style="font-weight:700; font-size: 16px; margin-bottom: 2px;">${nomeCartoleiro}</div>
                      <div style="color:${RODADAS_HQ_CONFIG.colors.textLight}; font-size:14px;">${nomeTime}</div>
                    </td>
                    <td style="text-align:center; padding: 12px 8px; font: 700 18px Inter, sans-serif; color: ${RODADAS_HQ_CONFIG.colors.primary};">${time.pontos.toFixed(2).replace(".", ",")}</td>
                    <td style="text-align:center; padding: 12px 8px; font: 700 16px Inter, sans-serif; color: ${bancoClass};">
                      ${bancoSinal}R$ ${Math.abs(bancoValor).toFixed(2).replace(".", ",")}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ESTATÍSTICAS EM ALTA QUALIDADE -->
      <div style="
        margin-top: 20px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16px;
      ">
        <div style="
          background: linear-gradient(135deg, ${RODADAS_HQ_CONFIG.colors.success}, #2ecc71);
          color: white;
          padding: 18px;
          border-radius: 10px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
          <h4 style="font: 600 14px Inter, sans-serif; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">📊 PARTICIPANTES</h4>
          <p style="font: 700 22px Inter, sans-serif; margin: 0;">${rankings.length} times</p>
        </div>

        <div style="
          background: linear-gradient(135deg, ${RODADAS_HQ_CONFIG.colors.primary}, ${RODADAS_HQ_CONFIG.colors.secondary});
          color: white;
          padding: 18px;
          border-radius: 10px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
          <h4 style="font: 600 14px Inter, sans-serif; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">📈 MÉDIA</h4>
          <p style="font: 700 22px Inter, sans-serif; margin: 0;">${(rankings.reduce((acc, t) => acc + t.pontos, 0) / rankings.length).toFixed(2).replace(".", ",")} pts</p>
        </div>

        <div style="
          background: linear-gradient(135deg, #ff6b6b, #ee5a52);
          color: white;
          padding: 18px;
          border-radius: 10px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
          <h4 style="font: 600 14px Inter, sans-serif; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">🎯 RODADA</h4>
          <p style="font: 700 22px Inter, sans-serif; margin: 0;">${rodada}ª</p>
        </div>
      </div>
    </div>

    ${criarFooterProfissional()}
  `;
}

console.log("[EXPORT-RODADAS-HQ] ✅ Sistema de exportação em alta qualidade carregado");
// ✅ MÓDULO DE EXPORTAÇÃO DE ALTA QUALIDADE PARA RODADAS
// 🚀 VERSÃO v1.0.0 - Sistema de exportação com qualidade máxima

console.log("[EXPORT-RODADAS-HQ] 🎯 Módulo de alta qualidade para rodadas carregado");

import { TEMPLATE_CONFIG, criarCanvasComFundo, aplicarEstilosTexto, adicionarCabecalho, adicionarRodape, exportarCanvas } from "./export-base.js";

// ✅ CONFIGURAÇÃO ESPECÍFICA PARA RODADAS
const RODADAS_CONFIG = {
  qualidade: {
    scale: 4, // 4x resolução para máxima qualidade
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: false,
    removeContainer: false,
    logging: false,
    width: 1200,
    height: 1600,
  },
  estilos: {
    titulo: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: TEMPLATE_CONFIG.colors.primary,
      textAlign: 'center',
      marginBottom: '20px',
    },
    subtitulo: {
      fontSize: '18px',
      color: TEMPLATE_CONFIG.colors.text,
      textAlign: 'center',
      marginBottom: '30px',
    },
    tabela: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
      lineHeight: '1.4',
    },
    celula: {
      padding: '12px 8px',
      borderBottom: '1px solid #e0e0e0',
      textAlign: 'center',
    },
    header: {
      backgroundColor: TEMPLATE_CONFIG.colors.primary,
      color: 'white',
      fontWeight: 'bold',
      fontSize: '16px',
    }
  }
};

// ✅ FUNÇÃO PRINCIPAL DE EXPORTAÇÃO COM ALTA QUALIDADE
export async function exportarRodadaAltaQualidade(rankings, rodada, tipo = "rodada") {
  console.log(`[EXPORT-RODADAS-HQ] 🚀 Iniciando exportação de alta qualidade - Rodada ${rodada}`);
  
  try {
    // Verificar se html2canvas está disponível
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas não está disponível. Verifique se a biblioteca foi carregada.');
    }

    if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
      throw new Error('Dados de rankings inválidos ou vazios');
    }

    // Criar container temporário para renderização
    const container = document.createElement('div');
    container.id = 'export-rodada-container';
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${RODADAS_CONFIG.qualidade.width}px;
      min-height: ${RODADAS_CONFIG.qualidade.height}px;
      background: white;
      padding: 40px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    // Adicionar cabeçalho
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="${Object.entries(RODADAS_CONFIG.estilos.titulo).map(([k,v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
          🏆 Ranking da Rodada ${rodada}
        </h1>
        <p style="${Object.entries(RODADAS_CONFIG.estilos.subtitulo).map(([k,v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
          Resultados e classificação da rodada
        </p>
      </div>
    `;
    container.appendChild(header);

    // Criar tabela com alta qualidade
    const tabela = criarTabelaRodada(rankings, rodada);
    container.appendChild(tabela);

    // Adicionar rodapé
    const footer = document.createElement('div');
    footer.innerHTML = `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid ${TEMPLATE_CONFIG.colors.primary};">
        <p style="color: ${TEMPLATE_CONFIG.colors.primary}; font-weight: bold; font-size: 16px;">
          🎯 Sistema de Gestão de Ligas Cartola FC
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 8px;">
          Gerado em ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    `;
    container.appendChild(footer);

    // Adicionar ao DOM temporariamente
    document.body.appendChild(container);

    // Aguardar renderização
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`[EXPORT-RODADAS-HQ] 📸 Capturando imagem com alta resolução...`);

    // Capturar com html2canvas em alta qualidade
    const canvas = await html2canvas(container, RODADAS_CONFIG.qualidade);

    // Remover container temporário
    document.body.removeChild(container);

    // Fazer download da imagem
    const link = document.createElement('a');
    link.download = `ranking-rodada-${rodada}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`[EXPORT-RODADAS-HQ] ✅ Exportação concluída com sucesso!`);
    
    // Mostrar notificação de sucesso
    mostrarNotificacao(`Ranking da Rodada ${rodada} exportado com alta qualidade!`, 'success');

  } catch (error) {
    console.error('[EXPORT-RODADAS-HQ] ❌ Erro na exportação:', error);
    mostrarNotificacao(`Erro ao exportar: ${error.message}`, 'error');
    throw error;
  }
}

// ✅ FUNÇÃO PARA CRIAR TABELA OTIMIZADA
function criarTabelaRodada(rankings, rodada) {
  const tabela = document.createElement('table');
  tabela.style.cssText = `
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    line-height: 1.4;
    margin: 20px 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
  `;

  // Cabeçalho
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background: ${TEMPLATE_CONFIG.colors.primary}; color: white;">
      <th style="padding: 16px 8px; text-align: center; font-weight: bold; width: 60px;">Pos</th>
      <th style="padding: 16px 8px; text-align: center; font-weight: bold; width: 50px;">❤️</th>
      <th style="padding: 16px 8px; text-align: left; font-weight: bold; min-width: 150px;">Cartoleiro</th>
      <th style="padding: 16px 8px; text-align: left; font-weight: bold; min-width: 150px;">Time</th>
      <th style="padding: 16px 8px; text-align: center; font-weight: bold; width: 80px;">Pontos</th>
      <th style="padding: 16px 8px; text-align: center; font-weight: bold; width: 80px;">Banco</th>
    </tr>
  `;
  tabela.appendChild(thead);

  // Corpo da tabela
  const tbody = document.createElement('tbody');
  
  rankings.forEach((rank, index) => {
    const tr = document.createElement('tr');
    tr.style.cssText = `
      background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};
      transition: background 0.2s;
    `;

    const posicao = index + 1;
    const posLabel = getPosicaoLabel(posicao, rankings.length);
    const clubeImg = rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid #ddd;" onerror="this.style.display='none'"/>` : '—';
    const pontos = rank.pontos != null ? parseFloat(rank.pontos).toFixed(2) : '-';
    const banco = rank.banco != null ? formatarBanco(rank.banco) : '-';

    tr.innerHTML = `
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">${posLabel}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">${clubeImg}</td>
      <td style="padding: 12px 8px; text-align: left; border-bottom: 1px solid #e0e0e0; font-weight: 500;">${rank.nome_cartola || 'N/D'}</td>
      <td style="padding: 12px 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">${rank.nome_time || 'N/D'}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: ${pontos > 0 ? TEMPLATE_CONFIG.colors.success : pontos < 0 ? TEMPLATE_CONFIG.colors.danger : '#333'};">${pontos}</td>
      <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: ${rank.banco > 0 ? TEMPLATE_CONFIG.colors.success : rank.banco < 0 ? TEMPLATE_CONFIG.colors.danger : '#333'};">${banco}</td>
    `;
    
    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);
  return tabela;
}

// ✅ FUNÇÃO PARA FORMATAR LABELS DE POSIÇÃO
function getPosicaoLabel(pos, total) {
  if (pos === 1) {
    return `<span style="background: ${TEMPLATE_CONFIG.colors.success}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">MITO</span>`;
  }
  
  if (pos === total && total > 1) {
    return `<span style="background: ${TEMPLATE_CONFIG.colors.danger}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">MICO</span>`;
  }
  
  if (pos >= 2 && pos <= 10) {
    return `<span style="background: ${TEMPLATE_CONFIG.colors.primary}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">G${pos}</span>`;
  }
  
  if (pos >= total - 10 && pos < total) {
    const zPos = total - pos;
    return `<span style="background: ${TEMPLATE_CONFIG.colors.warning}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${pos}º | Z${zPos}</span>`;
  }
  
  return `${pos}º`;
}

// ✅ FUNÇÃO PARA FORMATAR VALORES DO BANCO
function formatarBanco(valor) {
  const valorNum = parseFloat(valor);
  if (valorNum >= 0) {
    return `R$ ${valorNum.toFixed(2)}`;
  } else {
    return `-R$ ${Math.abs(valorNum).toFixed(2)}`;
  }
}

// ✅ FUNÇÃO PARA CRIAR BOTÃO DE EXPORTAÇÃO
export function criarBotaoExportacaoRodadaHQ(containerId, rodada, rankings, tipo = "rodada") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[EXPORT-RODADAS-HQ] Container ${containerId} não encontrado`);
    return;
  }

  // Remover botão existente
  const existente = container.querySelector('.btn-export-rodada-hq');
  if (existente) {
    existente.remove();
  }

  // Criar novo botão
  const btn = document.createElement('button');
  btn.className = 'btn-export-rodada-hq';
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
      <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
    </svg>
    Exportar Ranking da Rodada
  `;

  btn.style.cssText = `
    background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary} 0%, ${TEMPLATE_CONFIG.colors.accent} 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font: 500 14px Inter, sans-serif;
    display: inline-flex;
    align-items: center;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);
  `;

  // Efeitos hover
  btn.onmouseover = () => {
    btn.style.transform = 'translateY(-2px)';
    btn.style.boxShadow = '0 6px 20px rgba(46, 139, 87, 0.4)';
  };

  btn.onmouseout = () => {
    btn.style.transform = 'translateY(0)';
    btn.style.boxShadow = '0 4px 12px rgba(46, 139, 87, 0.3)';
  };

  // Event listener
  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; animation: spin 1s linear infinite;">
          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
        </svg>
        Exportando...
      `;
      
      await exportarRodadaAltaQualidade(rankings, rodada, tipo);
    } catch (error) {
      console.error('[EXPORT-RODADAS-HQ] Erro no botão:', error);
      mostrarNotificacao('Erro ao exportar. Tente novamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
        </svg>
        Exportar Ranking da Rodada
      `;
    }
  };

  container.appendChild(btn);
  console.log(`[EXPORT-RODADAS-HQ] ✅ Botão de exportação criado para rodada ${rodada}`);
}

// ✅ FUNÇÃO PARA MOSTRAR NOTIFICAÇÕES
function mostrarNotificacao(mensagem, tipo = 'info') {
  const cores = {
    success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
    error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
    info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' },
  };

  const cor = cores[tipo] || cores.info;

  const notificacao = document.createElement('div');
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${cor.bg};
    border: 1px solid ${cor.border};
    color: ${cor.text};
    padding: 16px 24px;
    border-radius: 8px;
    font: 500 14px Inter, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;

  notificacao.textContent = mensagem;
  document.body.appendChild(notificacao);

  // Animação de entrada
  requestAnimationFrame(() => {
    notificacao.style.transform = 'translateX(0)';
  });

  // Remover após 3 segundos
  setTimeout(() => {
    notificacao.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notificacao.parentNode) {
        document.body.removeChild(notificacao);
      }
    }, 300);
  }, 3000);
}

// ✅ CSS para animação de loading
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

console.log("[EXPORT-RODADAS-HQ] ✅ Módulo de alta qualidade para rodadas inicializado");

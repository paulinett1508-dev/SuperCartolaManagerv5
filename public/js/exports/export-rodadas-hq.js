
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

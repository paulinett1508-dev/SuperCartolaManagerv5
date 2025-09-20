// SISTEMA DE EXPORTAÇÃO TOP 10 v3.0.3 - IMPORTS CORRETOS
// USANDO APENAS FUNÇÕES QUE EXISTEM NO EXPORT-BASE.JS

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log("[EXPORT-TOP10] Módulo Top 10 v3.0.3 IMPORTS CORRETOS carregado");

/**
 * Formata pontuação com 2 casas decimais
 */
function formatarPontuacao(valor) {
  const numero = parseFloat(valor) || 0;
  return numero.toFixed(2);
}

/**
 * Função principal para exportar Top10 (COMPATIBILIDADE TOTAL)
 */
export async function exportarTop10ComoImagem(dados, tipo, rodada, valoresBonusOnus = {}) {
  try {
    console.log("[EXPORT-TOP10] Iniciando exportação:", { dados: dados.length, tipo, rodada });

    if (!Array.isArray(dados) || dados.length === 0) {
      throw new Error("Dados do Top 10 inválidos ou vazios");
    }

    const titulo = tipo === "mitos" ? "TOP 10 MITOS" : "TOP 10 MICOS";
    const subtitulo = `${tipo === "mitos" ? "Maiores Pontuações" : "Menores Pontuações"} - ${rodada === "geral" ? "Ranking Geral" : `Rodada ${rodada}`}`;

    // Criar container mobile dark (SISTEMA QUE EXISTE)
    const exportContainer = criarContainerMobileDark(titulo, subtitulo, { rodada: rodada });
    const contentDiv = exportContainer.querySelector("#mobile-export-content");

    // Layout TOP10 compacto
    contentDiv.innerHTML = criarLayoutTop10Final(dados, tipo, valoresBonusOnus);

    document.body.appendChild(exportContainer);

    try {
      const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("top10", {
        rodada: rodada === "geral" ? "geral" : rodada,
        extra: tipo,
      });

      await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);
      console.log("[EXPORT-TOP10] Exportação concluída com sucesso");

    } finally {
      if (exportContainer.parentNode === document.body) {
        document.body.removeChild(exportContainer);
      }
    }

  } catch (error) {
    console.error("[EXPORT-TOP10] Erro ao exportar:", error);
    MobileDarkUtils.mostrarErro("Erro ao gerar Top 10. Tente novamente.");
    throw error;
  }
}

// LAYOUT COMPACTO FINAL - CARD VERDE REDUZIDO PARA 60PX
function criarLayoutTop10Final(dados, tipo, valoresBonusOnus) {
  const corTema = tipo === "mitos" ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger;
  const corGradiente = tipo === "mitos" ? MOBILE_DARK_HD_CONFIG.colors.gradientSuccess : MOBILE_DARK_HD_CONFIG.colors.gradientDanger;

  return `
    <!-- CARD VERDE SUPER COMPACTO - 60PX -->
    <div style="
      background: ${corGradiente};
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 16px;
      text-align: center;
      max-height: 60px;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      ${dados.length > 0 ? `
        <div style="display: flex; align-items: center; gap: 12px;">
          ${dados[0].clube_id ? `
            <img src="/escudos/${dados[0].clube_id}.png"
                 style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3);"
                 onerror="this.style.display='none'"
                 alt="Escudo">
          ` : ""}

          <div>
            <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 13px Inter; color: white; margin-bottom: 1px;">
              ${dados[0].nome_cartola || dados[0].nome_cartoleiro || "N/D"}
            </div>
            <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 16px Inter; color: white;">
              ${formatarPontuacao(dados[0].pontos)} pts
            </div>
          </div>
        </div>
      ` : `
        <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 14px Inter; color: rgba(255,255,255,0.8);">
          Nenhum dado disponível
        </div>
      `}
    </div>

    <!-- TABELA PRINCIPAL -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      margin-bottom: 16px;
    ">

      <h3 style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 16px Inter;
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin: 0 0 16px 0;
        text-align: center;
        padding: 12px;
        background: ${corGradiente};
        border-radius: 8px;
        margin: -16px -16px 16px -16px;
      ">${tipo === "mitos" ? "TOP 10 MAIORES PONTUAÇÕES" : "TOP 10 MENORES PONTUAÇÕES"}</h3>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};">
              <th style="padding: 10px 8px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.text};">Pos</th>
              <th style="padding: 10px 8px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.text};">Clube</th>
              <th style="padding: 10px 8px; text-align: left; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.text};">Cartoleiro</th>
              <th style="padding: 10px 8px; text-align: left; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.text};">Time</th>
              <th style="padding: 10px 8px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.text};">Pontos</th>
              <th style="padding: 10px 8px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.text};">Rodada</th>
              <th style="padding: 10px 8px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.text};">${tipo === "mitos" ? "Bônus" : "Ônus"}</th>
            </tr>
          </thead>
          <tbody>
            ${dados.slice(0, 10).map((item, index) => {
              const posicao = index + 1;
              const valorBonus = valoresBonusOnus[tipo] ? valoresBonusOnus[tipo][posicao] || 0 : 0;

              let posContent = "";
              if (posicao === 1) {
                posContent = `<span style="background: ${corTema}; color: white; font-weight: bold; border-radius: 4px; padding: 2px 6px; font-size: 11px;">${tipo === "mitos" ? "MITO" : "MICO"}</span>`;
              } else {
                posContent = `<span style="font-weight: 600; font-size: 12px;">${posicao}º</span>`;
              }

              const valorClass = valorBonus >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger;
              const valorFormatado = valorBonus >= 0 ? `+R$ ${valorBonus.toFixed(2)}` : `-R$ ${Math.abs(valorBonus).toFixed(2)}`;

              return `
                <tr style="border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};">
                  <td style="text-align: center; padding: 8px;">${posContent}</td>
                  <td style="text-align: center; padding: 8px;">
                    ${item.clube_id ? `<img src="/escudos/${item.clube_id}.png" alt="" style="width: 20px; height: 20px; border-radius: 50%;" onerror="this.style.display='none'"/>` : "❤️"}
                  </td>
                  <td style="text-align: left; padding: 8px; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} 11px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.text};">
                    ${item.nome_cartola || item.nome_cartoleiro || "N/D"}
                  </td>
                  <td style="text-align: left; padding: 8px; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 10px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};">
                    ${item.nome_time || "N/D"}
                  </td>
                  <td style="text-align: center; padding: 8px; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 12px Inter; color: ${corTema};">
                    ${formatarPontuacao(item.pontos)}
                  </td>
                  <td style="text-align: center; padding: 8px; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 10px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};">
                    R${item.rodada}
                  </td>
                  <td style="text-align: center; padding: 8px; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 11px Inter; color: ${valorClass};">
                    ${valorFormatado}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ESTATÍSTICAS -->
    <div style="
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    ">
      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
        border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      ">
        <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 10px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted}; margin-bottom: 4px;">PARTICIPANTES</div>
        <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 16px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.accent};">${dados.length}</div>
      </div>

      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
        border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      ">
        <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 10px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted}; margin-bottom: 4px;">${tipo === "mitos" ? "MÁXIMA" : "MÍNIMA"}</div>
        <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 16px Inter; color: ${corTema};">${formatarPontuacao(dados[0].pontos)}</div>
      </div>
    </div>
  `;
}

export function testarModulo() {
  console.log("[EXPORT-TOP10] Módulo carregado e funcionando");
  return true;
}

console.log("[EXPORT-TOP10] ✅ Sistema corrigido v3.0.3");
console.log("[EXPORT-TOP10] 🎯 Card verde limitado a 60px - IMPORTS CORRETOS");
console.log("[EXPORT-TOP10] 🔧 Usando apenas MOBILE_DARK_HD_CONFIG existente");
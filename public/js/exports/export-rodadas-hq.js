// SISTEMA DE EXPORTAÇÃO RODADAS - MOBILE DARK HD v3.0.1
// CORREÇÃO: Padronização completa seguindo export-pontos-corridos.js

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log(
  "[EXPORT-RODADAS-MOBILE] 🚀 Sistema Mobile Dark HD v3.0.1 carregado",
);

// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO - RODADAS
export async function exportarRodadaAltaQualidade(
  rankings,
  rodada,
  tipo = "rodada",
) {
  console.log(
    `[EXPORT-RODADAS-MOBILE] 🎨 Exportando rodada ${rodada} mobile HD...`,
  );
  console.log(`[EXPORT-RODADAS-MOBILE] 📊 Total de times: ${rankings.length}`);

  try {
    // Validar dados
    MobileDarkUtils.validarDadosMobile({ rankings, rodada }, [
      "rankings",
      "rodada",
    ]);

    if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
      throw new Error("Dados de rankings inválidos ou vazios");
    }

    // Definir títulos
    const titulo = `🏆 Ranking Rodada ${rodada}`;
    const subtitulo = `${rankings.length} participantes`;

    // Criar container mobile dark
    const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
      rodada: rodada,
    });

    const contentDiv = exportContainer.querySelector("#mobile-export-content");

    // Inserir conteúdo do ranking mobile
    contentDiv.innerHTML = criarLayoutRankingRodadaMobile(
      rankings,
      rodada,
      tipo,
    );

    document.body.appendChild(exportContainer);

    try {
      // Aguardar renderização completa
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Aguardar carregamento de imagens
      const imagens = exportContainer.querySelectorAll("img");
      if (imagens.length > 0) {
        console.log(
          `[EXPORT-RODADAS-MOBILE] 🖼️ Aguardando ${imagens.length} escudos...`,
        );
        await Promise.allSettled(
          Array.from(imagens).map((img) => {
            return new Promise((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve();
              } else {
                img.onload = resolve;
                img.onerror = resolve;
                setTimeout(resolve, 3000);
              }
            });
          }),
        );
      }

      // Gerar nome do arquivo
      const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("ranking", {
        rodada: rodada,
        extra: `${rankings.length}times`,
      });

      // Gerar e fazer download da imagem HD
      await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);

      console.log(
        `[EXPORT-RODADAS-MOBILE] ✅ Exportação concluída: ${rankings.length} times`,
      );
      MobileDarkUtils.mostrarSucesso(
        `Ranking da Rodada ${rodada} exportado com ${rankings.length} times!`,
      );
    } finally {
      // Limpar container temporário
      if (exportContainer.parentNode === document.body) {
        document.body.removeChild(exportContainer);
      }
    }
  } catch (error) {
    console.error("[EXPORT-RODADAS-MOBILE] ❌ Erro na exportação:", error);
    MobileDarkUtils.mostrarErro(
      "Erro ao exportar ranking HD. Tente novamente.",
    );
    throw error;
  }
}

// LAYOUT RANKING MOBILE DARK
function criarLayoutRankingRodadaMobile(rankings, rodada, tipo) {
  const totalTimes = rankings.length;
  const lider = rankings.length > 0 ? rankings[0] : null;
  const mediaGeral =
    rankings.reduce((acc, t) => acc + (t.pontos || 0), 0) / rankings.length;

  return `
  <!-- CARD PRINCIPAL DE DESTAQUE - LÍDER -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientSuccess};
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
    <div style="
      font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
      color: rgba(255,255,255,0.9);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 2px;
    ">🏆 LÍDER DA RODADA</div>

    ${
      lider
        ? `
      <div style="display: flex; align-items: center; gap: 12px;">
        ${
          lider.clube_id
            ? `
          <img src="/escudos/${lider.clube_id}.png"
               style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3);"
               onerror="this.style.display='none'"
               alt="Escudo">
        `
            : ""
        }

        <div>
          <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 13px Inter; color: white; margin-bottom: 1px;">
            ${lider.nome_cartola || lider.nome_cartoleiro || "N/D"}
          </div>
          <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 16px Inter; color: white;">
            ${(lider.pontos || 0).toFixed(2)} pts
          </div>
        </div>
      </div>
    `
        : `
      <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 14px Inter; color: rgba(255,255,255,0.8);">
        Nenhum dado disponível
      </div>
    `
    }
  </div>

  <!-- MINI CARD DISCRETO - INFO RODADA -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
    border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
  ">
    <!-- Ícone da rodada -->
    <div style="
      width: 32px; 
      height: 32px; 
      background: ${MOBILE_DARK_HD_CONFIG.colors.accent}; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 16px;
      flex-shrink: 0;
    ">🏆</div>

    <!-- Informações compactas -->
    <div style="flex: 1; min-width: 0;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 2px;
      ">Rodada ${rodada}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
      ">Ranking completo</div>
    </div>

    <!-- Total times -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.accent};
      color: #000;
      padding: 6px 10px;
      border-radius: 8px;
      text-align: center;
      flex-shrink: 0;
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
      ">${totalTimes}</div>
    </div>
  </div>

  <!-- TABELA DE RANKING -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
    border-radius: 16px;
    padding: 0;
    border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    overflow: hidden;
    margin-bottom: 20px;
  ">

    <!-- Header da tabela -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.gradientDark};
      color: ${MOBILE_DARK_HD_CONFIG.colors.text};
      padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
      text-align: center;
    ">
      <h3 style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
        margin: 0;
        letter-spacing: 0.5px;
      ">🏆 RANKING COMPLETO</h3>
    </div>

    <!-- Lista de posições -->
    <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
      ${rankings
        .slice(0, 40)
        .map((time, index) =>
          criarItemRankingMobile(time, index, rankings.length),
        )
        .join("")}
    </div>

  </div>

  <!-- ESTATÍSTICAS RESUMO -->
  <div style="
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: ${MOBILE_DARK_HD_CONFIG.cardSpacing}px;
  ">

    <!-- Total de Participantes -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">👥 Times</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.accent};
      ">${totalTimes}</div>
    </div>

    <!-- Média Geral -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">📈 Média</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.info};
      ">${mediaGeral.toFixed(2)}</div>
    </div>

    <!-- Rodada -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">🎯 Rodada</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.warning};
      ">${rodada}ª</div>
    </div>

  </div>
`;
}

// ITEM INDIVIDUAL DO RANKING MOBILE DARK
function criarItemRankingMobile(time, index, total) {
  const posicao = index + 1;

  // Determinar estilo da posição - SEM MEDALHAS
  let posicaoDisplay,
    posicaoStyle,
    cardStyle = "";

  if (posicao === 1) {
    posicaoDisplay = "MITO";
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.success};
      color: ${MOBILE_DARK_HD_CONFIG.colors.text};
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold};
    `;
    cardStyle = `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.success};`;
  } else if (posicao >= 2 && posicao <= 11) {
    posicaoDisplay = `G${posicao}`;
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.success};
      color: ${MOBILE_DARK_HD_CONFIG.colors.text};
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold};
    `;
    cardStyle = `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.success};`;
  } else if (posicao === total && total > 11) {
    posicaoDisplay = "MICO";
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.danger};
      color: ${MOBILE_DARK_HD_CONFIG.colors.text};
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold};
    `;
    cardStyle = `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.danger};`;
  } else if (posicao >= total - 10 && posicao < total && total > 11) {
    const zNumber = total - posicao;
    posicaoDisplay = `Z${zNumber}`;
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.danger};
      color: ${MOBILE_DARK_HD_CONFIG.colors.text};
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold};
    `;
    cardStyle = `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.danger};`;
  } else {
    posicaoDisplay = `${posicao}º`;
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
      color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold};
    `;
  }

  // Formatação do banco
  const bancoValor = time.banco || 0;
  const bancoFormatado = MobileDarkUtils.formatarMoedaMobile(bancoValor);
  const bancoColor =
    bancoValor >= 0
      ? MOBILE_DARK_HD_CONFIG.colors.success
      : MOBILE_DARK_HD_CONFIG.colors.danger;

  return `
  <div style="
    display: flex;
    align-items: center;
    padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
    border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
    ${cardStyle}
    transition: all 0.2s ease;
  ">

    <!-- Posição -->
    <div style="
      ${posicaoStyle}
      padding: 8px 12px;
      border-radius: 8px;
      margin-right: 16px;
      min-width: 50px;
      text-align: center;
      font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
    ">
      ${posicaoDisplay}
    </div>

    <!-- Escudo -->
    <div style="margin-right: 12px; flex-shrink: 0;">
      ${
        time.clube_id
          ? `
        <img src="/escudos/${time.clube_id}.png"
             style="
               width: 32px; 
               height: 32px; 
               border-radius: 50%; 
               border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
               background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
             "
             onerror="this.outerHTML='<div style=\\'width:32px;height:32px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:2px solid ${MOBILE_DARK_HD_CONFIG.colors.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;\\'>⚽</div>'"
             alt="Escudo">
      `
          : `
        <div style="
          width: 32px; 
          height: 32px; 
          background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight}; 
          border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.border}; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 14px;
        ">⚽</div>
      `
      }
    </div>

    <!-- Informações -->
    <div style="flex: 1; min-width: 0;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${time.nome_cartola || time.nome_cartoleiro || "N/D"}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${time.nome_time || "Time não informado"}</div>
    </div>

    <!-- Pontuação e Banco -->
    <div style="text-align: right; margin-left: 12px;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
        color: ${
          posicao >= 1 && posicao <= 11
            ? MOBILE_DARK_HD_CONFIG.colors.success // Verde: MITO + G2-G11 (zona de crédito)
            : posicao >= total - 10 && posicao <= total
              ? MOBILE_DARK_HD_CONFIG.colors.accent // Cor padrão: Z1-Z10 + MICO
              : MOBILE_DARK_HD_CONFIG.colors.text // Branco: meio da tabela (zona neutra)
        };
      ">${(time.pontos || 0).toFixed(2)}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${
          posicao >= 1 && posicao <= 11
            ? MOBILE_DARK_HD_CONFIG.colors.success // Verde: MITO + G2-G11 (crédito)
            : posicao >= total - 10 && posicao <= total
              ? MOBILE_DARK_HD_CONFIG.colors.danger // Vermelho: Z1-Z10 + MICO (débito)
              : MOBILE_DARK_HD_CONFIG.colors.text // Branco: meio da tabela (sem crédito/débito)
        };
        margin-top: 2px;
      ">${bancoFormatado}</div>
    </div>

  </div>
`;
}

// FUNÇÃO PARA CRIAR BOTÃO DE EXPORTAÇÃO
export function criarBotaoExportacaoRodadaHQ(
  containerId,
  rodada,
  rankings,
  tipo = "rodada",
) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(
      `[EXPORT-RODADAS-MOBILE] Container ${containerId} não encontrado`,
    );
    return;
  }

  // Remover botão existente
  const existente = container.querySelector(".btn-export-rodada-mobile");
  if (existente) {
    existente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  // Criar botão mobile dark
  const btn = document.createElement("button");
  btn.className = "btn-export-rodada-mobile";
  btn.innerHTML = `
  <div style="display: flex; align-items: center; gap: 10px;">
    <span style="font-size: 16px;">🏆</span>
    <span>Ranking Mobile HD</span>
    <div style="
      background: rgba(255,255,255,0.2);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
    ">${rankings.length} TIMES</div>
  </div>
`;

  btn.style.cssText = `
  background: ${MOBILE_DARK_HD_CONFIG.colors.gradientPrimary};
  color: ${MOBILE_DARK_HD_CONFIG.colors.text};
  border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.accent};
  padding: 16px 24px;
  border-radius: 14px;
  cursor: pointer;
  font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
  box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 200px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

  // Efeitos hover
  btn.onmouseover = () => {
    btn.style.transform = "translateY(-3px) scale(1.02)";
    btn.style.boxShadow = `0 12px 40px ${MOBILE_DARK_HD_CONFIG.colors.accent}40`;
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0) scale(1)";
    btn.style.boxShadow = MOBILE_DARK_HD_CONFIG.colors.shadow;
  };

  btn.onclick = async () => {
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="
        width: 20px; 
        height: 20px; 
        border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.text};
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      <span>Gerando HD...</span>
    </div>
  `;
    btn.disabled = true;

    try {
      await exportarRodadaAltaQualidade(rankings, rodada, tipo);
    } catch (error) {
      console.error("[EXPORT-RODADAS-MOBILE] Erro na exportação:", error);
      MobileDarkUtils.mostrarErro("Erro ao gerar ranking HD. Tente novamente.");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // Adicionar animação CSS se não existir
  if (!document.getElementById("export-mobile-animations")) {
    const style = document.createElement("style");
    style.id = "export-mobile-animations";
    style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
    document.head.appendChild(style);
  }

  btnContainer.appendChild(btn);

  // Posicionar na parte superior
  if (container.firstChild) {
    container.insertBefore(btnContainer, container.firstChild);
  } else {
    container.appendChild(btnContainer);
  }

  console.log(
    `[EXPORT-RODADAS-MOBILE] ✅ Botão mobile criado para rodada ${rodada} com ${rankings.length} times`,
  );
}

console.log("[EXPORT-RODADAS-MOBILE] ✅ Sistema Mobile Dark HD configurado");
console.log("[EXPORT-RODADAS-MOBILE] 📱 Resolução: 720px x 800px+ @ 4x scale");
console.log(
  "[EXPORT-RODADAS-MOBILE] 🎨 Compatibilidade com padrão Mobile Dark HD",
);

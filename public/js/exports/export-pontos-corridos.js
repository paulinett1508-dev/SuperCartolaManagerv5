// SISTEMA DE EXPORTAÇÃO PONTOS CORRIDOS - MOBILE DARK HD v3.1.0
// VERSÃO ENRIQUECIDA com dados completos da classificação

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log(
  "[EXPORT-PONTOS-CORRIDOS-MOBILE] Sistema Mobile Dark HD v3.1.0 ENRIQUECIDO carregado",
);

// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO - RODADA (CONFRONTOS)
export async function criarBotaoExportacaoPontosCorridosRodada(config) {
  if (!config || typeof config !== "object") {
    console.error(
      "[EXPORT-PONTOS-CORRIDOS-MOBILE] Configuração inválida:",
      config,
    );
    return;
  }

  const {
    containerId,
    jogos = [],
    rodadaLiga = "",
    rodadaCartola = "",
    times = [],
  } = config;

  console.log(
    "[EXPORT-PONTOS-CORRIDOS-MOBILE] Criando botão exportação rodada:",
    {
      containerId,
      jogosCount: jogos.length,
      rodadaLiga,
      rodadaCartola,
    },
  );

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-PONTOS-CORRIDOS-MOBILE] Container ${containerId} não encontrado - Tentando novamente em 500ms`,
    );
    // Retry após 500ms
    setTimeout(() => {
      criarBotaoExportacaoPontosCorridosRodada(config);
    }, 500);
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-pontos-corridos-rodada-mobile",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  // Criar botão mobile dark
  const btn = document.createElement("button");
  btn.className = "btn-export-pontos-corridos-rodada-mobile";
  btn.innerHTML = `
  <div style="display: flex; align-items: center; gap: 10px;">
    <span style="font-size: 16px;">⚔️</span>
    <span>Confrontos Mobile HD</span>
    <div style="
      background: rgba(255,255,255,0.2);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
    ">MOBILE</div>
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
      await exportarPontosCorridosRodadaMobileDarkHD({
        jogos,
        rodadaLiga,
        rodadaCartola,
        times,
      });
    } catch (error) {
      console.error(
        "[EXPORT-PONTOS-CORRIDOS-MOBILE] Erro na exportação:",
        error,
      );
      MobileDarkUtils.mostrarErro(
        "Erro ao gerar confrontos HD. Tente novamente.",
      );
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

  // POSICIONAR NA PARTE SUPERIOR conforme solicitado
  if (container.firstChild) {
    container.insertBefore(btnContainer, container.firstChild);
  } else {
    container.appendChild(btnContainer);
  }
}

// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO - CLASSIFICAÇÃO
export async function criarBotaoExportacaoPontosCorridosClassificacao(config) {
  if (!config || typeof config !== "object") {
    console.error(
      "[EXPORT-PONTOS-CORRIDOS-MOBILE] Configuração inválida:",
      config,
    );
    return;
  }

  const {
    containerId,
    times = [],
    rodadaLiga = "",
    rodadaCartola = "",
  } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-PONTOS-CORRIDOS-MOBILE] Container ${containerId} não encontrado - Tentando novamente em 500ms`,
    );
    // Retry após 500ms
    setTimeout(() => {
      criarBotaoExportacaoPontosCorridosClassificacao(config);
    }, 500);
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-pontos-corridos-classificacao-mobile",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  // Criar botão mobile dark
  const btn = document.createElement("button");
  btn.className = "btn-export-pontos-corridos-classificacao-mobile";
  btn.innerHTML = `
  <div style="display: flex; align-items: center; gap: 10px;">
    <span style="font-size: 16px;">🏆</span>
    <span>Classificação Mobile HD</span>
    <div style="
      background: rgba(255,255,255,0.2);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
    ">MOBILE</div>
  </div>
`;

  btn.style.cssText = `
  background: ${MOBILE_DARK_HD_CONFIG.colors.gradientSuccess};
  color: ${MOBILE_DARK_HD_CONFIG.colors.text};
  border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.success};
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
    btn.style.boxShadow = `0 12px 40px ${MOBILE_DARK_HD_CONFIG.colors.success}40`;
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
      await exportarPontosCorridosClassificacaoMobileDarkHD(
        times,
        rodadaLiga,
        rodadaCartola,
      );
    } catch (error) {
      console.error(
        "[EXPORT-PONTOS-CORRIDOS-MOBILE] Erro na exportação:",
        error,
      );
      MobileDarkUtils.mostrarErro(
        "Erro ao gerar classificação HD. Tente novamente.",
      );
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  btnContainer.appendChild(btn);

  // POSICIONAR NA PARTE SUPERIOR
  if (container.firstChild) {
    container.insertBefore(btnContainer, container.firstChild);
  } else {
    container.appendChild(btnContainer);
  }
}

// EXPORTAÇÃO MOBILE DARK HD - RODADA (CONFRONTOS)
async function exportarPontosCorridosRodadaMobileDarkHD(config) {
  const { jogos, rodadaLiga, rodadaCartola, times } = config;

  console.log(
    "[EXPORT-PONTOS-CORRIDOS-MOBILE] Criando layout mobile dark HD - Rodada...",
  );

  // Validar dados
  MobileDarkUtils.validarDadosMobile(config, [
    "jogos",
    "rodadaLiga",
    "rodadaCartola",
  ]);

  // Definir títulos
  const titulo = `⚔️ Confrontos R${rodadaLiga}`;
  const subtitulo = `Rodada ${rodadaCartola} do Brasileirão`;

  // Criar container mobile dark
  const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
    rodada: rodadaLiga,
  });

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  // Inserir conteúdo dos confrontos mobile
  contentDiv.innerHTML = criarLayoutPontosCorridosRodadaMobile(
    jogos,
    rodadaLiga,
    rodadaCartola,
    times,
  );

  document.body.appendChild(exportContainer);

  try {
    // Gerar nome do arquivo
    const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("confrontos", {
      rodada: rodadaLiga,
      extra: `r${rodadaCartola}`,
    });

    // Gerar e fazer download da imagem HD
    await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);
  } finally {
    // Limpar container temporário
    if (exportContainer.parentNode === document.body) {
      document.body.removeChild(exportContainer);
    }
  }
}

// EXPORTAÇÃO MOBILE DARK HD - CLASSIFICAÇÃO
async function exportarPontosCorridosClassificacaoMobileDarkHD(
  times,
  rodadaLiga,
  rodadaCartola,
) {
  console.log(
    "[EXPORT-PONTOS-CORRIDOS-MOBILE] Criando layout mobile dark HD - Classificação...",
  );

  // Validar dados
  MobileDarkUtils.validarDadosMobile({ times }, ["times"]);

  // Definir títulos
  const titulo = `🏆 Classificação`;
  const subtitulo = `Após ${rodadaLiga}ª rodada`;

  // Criar container mobile dark
  const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
    rodada: rodadaLiga,
  });

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  // Inserir conteúdo da classificação mobile
  contentDiv.innerHTML = criarLayoutPontosCorridosClassificacaoMobile(
    times,
    rodadaLiga,
    rodadaCartola,
  );

  document.body.appendChild(exportContainer);

  try {
    // Gerar nome do arquivo
    const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile(
      "classificacao",
      {
        rodada: rodadaLiga,
        extra: `r${rodadaCartola}`,
      },
    );

    // Gerar e fazer download da imagem HD
    await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);
  } finally {
    // Limpar container temporário
    if (exportContainer.parentNode === document.body) {
      document.body.removeChild(exportContainer);
    }
  }
}

// LAYOUT CONFRONTOS MOBILE DARK
function criarLayoutPontosCorridosRodadaMobile(
  jogos,
  rodadaLiga,
  rodadaCartola,
  times,
) {
  const goleadas = jogos.filter(
    (j) => j.timeA?.pontosGoleada > 0 || j.timeB?.pontosGoleada > 0,
  ).length;

  const confrontosFinalizados = jogos.filter(
    (j) => j.timeA?.pontos !== undefined && j.timeB?.pontos !== undefined,
  ).length;

  return `
  <!-- MINI CARD DISCRETO - RODADA -->
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
    ">⚔️</div>

    <!-- Informações compactas -->
    <div style="flex: 1; min-width: 0;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 2px;
      ">Rodada ${rodadaLiga}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
      ">R${rodadaCartola} do Brasileirão</div>
    </div>

    <!-- Total confrontos -->
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
      ">${jogos.length}</div>
    </div>
  </div>

  <!-- LISTA DE CONFRONTOS -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
    border-radius: 16px;
    padding: 0;
    border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    overflow: hidden;
    margin-bottom: 20px;
  ">

    <!-- Header da lista -->
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
      ">⚔️ CONFRONTOS DA RODADA</h3>
    </div>

    <!-- Lista de jogos -->
    <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
      ${jogos
        .slice(0, 16)
        .map((jogo, index) => criarItemConfrontoMobile(jogo, index))
        .join("")}
    </div>

  </div>

  <!-- ESTATÍSTICAS RESUMO -->
  <div style="
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: ${MOBILE_DARK_HD_CONFIG.cardSpacing}px;
  ">

    <!-- Total de Jogos -->
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
      ">⚔️ Jogos</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.accent};
      ">${jogos.length}</div>
    </div>

    <!-- Goleadas -->
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
      ">🔥 Goleadas</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.warning};
      ">${goleadas}</div>
    </div>

    <!-- Finalizados -->
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
      ">✅ Finalizados</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.success};
      ">${confrontosFinalizados}</div>
    </div>

  </div>
`;
}

// ITEM INDIVIDUAL DO CONFRONTO MOBILE DARK
function criarItemConfrontoMobile(jogo, index) {
  const timeA = jogo.timeA || {};
  const timeB = jogo.timeB || {};
  const temPontuacao =
    timeA.pontos !== undefined &&
    timeA.pontos !== null &&
    timeB.pontos !== undefined &&
    timeB.pontos !== null;

  let vencedorA = false,
    vencedorB = false,
    empate = false;
  if (temPontuacao) {
    if (timeA.pontos > timeB.pontos) vencedorA = true;
    else if (timeB.pontos > timeA.pontos) vencedorB = true;
    else empate = true;
  }

  const goleadaA = timeA.pontosGoleada > 0;
  const goleadaB = timeB.pontosGoleada > 0;

  return `
  <div style="
    display: flex;
    align-items: center;
    padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
    border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
    ${goleadaA || goleadaB ? `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.warning};` : ""}
    transition: all 0.2s ease;
  ">

    <!-- Time A -->
    <div style="flex: 1; display: flex; align-items: center; gap: 12px;">
      ${
        timeA.clube_id
          ? `
        <img src="/escudos/${timeA.clube_id}.png"
             style="
               width: 32px; 
               height: 32px; 
               border-radius: 50%; 
               border: 2px solid ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.border};
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
        ">❤️</div>
      `
      }

      <div style="flex: 1; min-width: 0;">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
          color: ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.text};
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${timeA.nome_time || "N/D"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${timeA.nome_cartola || "N/D"}</div>
      </div>
    </div>

    <!-- Pontuação A -->
    <div style="text-align: center; margin: 0 12px;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
        color: ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : vencedorB ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.text};
      ">
        ${temPontuacao ? timeA.pontos.toFixed(2) : "-"}${goleadaA ? " 🔥" : ""}
      </div>
    </div>

    <!-- VS -->
    <div style="
      font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
      color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
      margin: 0 8px;
    ">VS</div>

    <!-- Pontuação B -->
    <div style="text-align: center; margin: 0 12px;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
        color: ${vencedorB ? MOBILE_DARK_HD_CONFIG.colors.success : vencedorA ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.text};
      ">
        ${temPontuacao ? timeB.pontos.toFixed(2) : "-"}${goleadaB ? " 🔥" : ""}
      </div>
    </div>

    <!-- Time B -->
    <div style="flex: 1; display: flex; align-items: center; gap: 12px; flex-direction: row-reverse;">
      ${
        timeB.clube_id
          ? `
        <img src="/escudos/${timeB.clube_id}.png"
             style="
               width: 32px; 
               height: 32px; 
               border-radius: 50%; 
               border: 2px solid ${vencedorB ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.border};
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
        ">❤️</div>
      `
      }

      <div style="flex: 1; min-width: 0; text-align: right;">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
          color: ${vencedorB ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.text};
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${timeB.nome_time || "N/D"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${timeB.nome_cartola || "N/D"}</div>
      </div>
    </div>

  </div>
`;
}

// LAYOUT CLASSIFICAÇÃO MOBILE DARK - VERSÃO ENRIQUECIDA
function criarLayoutPontosCorridosClassificacaoMobile(
  times,
  rodadaLiga,
  rodadaCartola,
) {
  const totalTimes = times.length;
  const lider = times.length > 0 ? times[0] : null;

  // Calcular estatísticas gerais
  const totalJogos = times.reduce((acc, time) => acc + time.jogos, 0);
  const totalGoleadas = times.reduce(
    (acc, time) => acc + time.pontosGoleada,
    0,
  );
  const melhorAproveitamento =
    times.length > 0
      ? Math.max(
          ...times.map((time) =>
            time.jogos > 0 ? (time.pontos / (time.jogos * 3)) * 100 : 0,
          ),
        )
      : 0;

  return `
  <!-- CARD COMPACTO DE DESTAQUE - LÍDER (70PX) -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientSuccess};
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 16px;
    text-align: center;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
  ">
    ${
      lider
        ? `
      <div style="display: flex; align-items: center; gap: 16px; width: 100%;">
        ${
          lider.clube_id
            ? `
          <img src="/escudos/${lider.clube_id}.png"
               style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4);"
               onerror="this.style.display='none'"
               alt="Escudo">
        `
            : ""
        }

        <div style="flex: 1; text-align: left;">
          <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 15px Inter; color: white; margin-bottom: 3px;">
            🥇 ${lider.nome_cartola || lider.nome_cartoleiro || "N/D"}
          </div>
          <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 18px Inter; color: white;">
            ${lider.pontos || 0} pts
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 11px Inter; color: rgba(255,255,255,0.8);">
            ${lider.jogos > 0 ? `${((lider.pontos / (lider.jogos * 3)) * 100).toFixed(1)}%` : "0%"}
          </div>
          <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter; color: rgba(255,255,255,0.9);">
            ${lider.vitorias}V-${lider.empates}E-${lider.derrotas}D
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

  <!-- TABELA CLASSIFICAÇÃO -->
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
      ">🏆 CLASSIFICAÇÃO GERAL</h3>
    </div>

    <!-- Lista de classificação - ENRIQUECIDA -->
    <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
      ${times.map((time, index) => criarItemClassificacaoMobileEnriquecido(time, index)).join("")}
    </div>

  </div>

  <!-- ESTATÍSTICAS RESUMO EXPANDIDAS -->
  <div style="
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${MOBILE_DARK_HD_CONFIG.cardSpacing}px;
    margin-bottom: 16px;
  ">

    <!-- Total Participantes -->
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

    <!-- Rodada Atual -->
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
      ">📅 Rodada</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.success};
      ">${rodadaLiga}ª</div>
    </div>

  </div>

  <!-- ESTATÍSTICAS COMPLEMENTARES -->
  <div style="
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: ${MOBILE_DARK_HD_CONFIG.cardSpacing}px;
  ">

    <!-- Total Jogos -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 9px;
      ">⚔️ Jogos</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
        color: ${MOBILE_DARK_HD_CONFIG.colors.accent};
      ">${totalJogos}</div>
    </div>

    <!-- Total Goleadas -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 9px;
      ">🔥 Goleadas</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
        color: ${MOBILE_DARK_HD_CONFIG.colors.warning};
      ">${totalGoleadas}</div>
    </div>

    <!-- Melhor Aproveitamento -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 9px;
      ">📈 Top %</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
        color: ${MOBILE_DARK_HD_CONFIG.colors.success};
      ">${melhorAproveitamento.toFixed(1)}%</div>
    </div>

  </div>
`;
}

// ITEM INDIVIDUAL DA CLASSIFICAÇÃO MOBILE DARK - VERSÃO ENRIQUECIDA
function criarItemClassificacaoMobileEnriquecido(time, index) {
  const posicao = index + 1;
  const aproveitamento =
    time.jogos > 0 ? (time.pontos / (time.jogos * 3)) * 100 : 0;

  // Determinar estilo da posição
  let posicaoDisplay,
    posicaoStyle,
    cardStyle = "";

  if (posicao === 1) {
    posicaoDisplay = "🥇";
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.gold};
      color: #000;
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold};
    `;
    cardStyle = `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};`;
  } else if (posicao === 2) {
    posicaoDisplay = "🥈";
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.silver};
      color: #000;
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold};
    `;
  } else if (posicao === 3) {
    posicaoDisplay = "🥉";
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.bronze};
      color: #000;
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold};
    `;
  } else {
    posicaoDisplay = `${posicao}º`;
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
      color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold};
    `;
  }

  return `
  <div style="
    display: flex;
    align-items: center;
    padding: 12px ${MOBILE_DARK_HD_CONFIG.padding}px;
    border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
    ${cardStyle}
    transition: all 0.2s ease;
    min-height: 60px;
  ">

    <!-- Posição -->
    <div style="
      ${posicaoStyle}
      padding: 6px 10px;
      border-radius: 8px;
      margin-right: 12px;
      min-width: 42px;
      text-align: center;
      font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
      flex-shrink: 0;
    ">
      ${posicaoDisplay}
    </div>

    <!-- Escudo -->
    <div style="margin-right: 10px; flex-shrink: 0;">
      ${
        time.clube_id
          ? `
        <img src="/escudos/${time.clube_id}.png"
             style="
               width: 28px; 
               height: 28px; 
               border-radius: 50%; 
               border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
               background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
             "
             onerror="this.outerHTML='<div style=\\'width:28px;height:28px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;\\'>⚽</div>'"
             alt="Escudo">
      `
          : `
        <div style="
          width: 28px; 
          height: 28px; 
          background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight}; 
          border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border}; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 12px;
        ">❤️</div>
      `
      }
    </div>

    <!-- Informações do Time -->
    <div style="flex: 1; min-width: 0; margin-right: 12px;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${time.nome_cartola || time.nome_cartoleiro || "N/D"}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 9px;
        letter-spacing: 0.3px;
      ">J${time.jogos || 0} V${time.vitorias || 0} E${time.empates || 0} D${time.derrotas || 0} • Goleadas ${time.gols_pro || time.pontosGoleada || 0}</div>
    </div>

    <!-- Pontuação Principal -->
    <div style="text-align: right; margin-right: 12px; flex-shrink: 0;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
        color: ${posicao <= 3 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.accent};
        line-height: 1;
      ">${time.pontos || 0}</div>
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        font-size: 9px;
      ">pts</div>
    </div>

    <!-- Saldo Financeiro -->
    <div style="
      background: ${(time.financeiroTotal || 0) >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success + "15" : MOBILE_DARK_HD_CONFIG.colors.danger + "15"};
      border: 1px solid ${(time.financeiroTotal || 0) >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success + "40" : MOBILE_DARK_HD_CONFIG.colors.danger + "40"};
      padding: 4px 8px;
      border-radius: 6px;
      text-align: center;
      min-width: 60px;
      flex-shrink: 0;
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${(time.financeiroTotal || 0) >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
        font-size: 10px;
        line-height: 1;
      ">R$ ${(time.financeiroTotal || 0).toFixed(2)}</div>
    </div>

  </div>
`;
}

// COMPATIBILIDADE COM FUNÇÕES LEGADO
export async function exportarPontosCorridosRodadaComoImagem(
  jogos,
  rodadaLiga,
  rodadaCartola,
  times,
) {
  await exportarPontosCorridosRodadaMobileDarkHD({
    jogos,
    rodadaLiga,
    rodadaCartola,
    times,
  });
}

export async function exportarPontosCorridosClassificacaoComoImagem(
  times,
  rodadaLiga,
  rodadaCartola,
) {
  await exportarPontosCorridosClassificacaoMobileDarkHD(
    times,
    rodadaLiga,
    rodadaCartola,
  );
}

console.log(
  "[EXPORT-PONTOS-CORRIDOS-MOBILE] Sistema Mobile Dark HD ENRIQUECIDO configurado",
);
console.log(
  "[EXPORT-PONTOS-CORRIDOS-MOBILE] Resolução: 400px x 800px+ @ 4x scale",
);
console.log(
  "[EXPORT-PONTOS-CORRIDOS-MOBILE] Dados completos: J-V-E-D, SG, GP, %, Financeiro",
);

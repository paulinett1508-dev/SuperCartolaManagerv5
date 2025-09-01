// SISTEMA DE EXPORTAÇÃO RANKING GERAL - MOBILE DARK HD v3.0.1
// Migrado para padrão mobile dark seguindo export-base.js e export-top10.js

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log(
  "[EXPORT-RANKING-GERAL-MOBILE] Sistema Mobile Dark HD v3.0.1 carregado",
);

// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO - RANKING GERAL
export async function criarBotaoExportacaoRankingGeral(config) {
  if (!config || typeof config !== "object") {
    console.error(
      "[EXPORT-RANKING-GERAL-MOBILE] Configuração inválida:",
      config,
    );
    return;
  }

  const { containerId, rankings = [], rodada = "", tipo = "geral" } = config;

  if (!containerId) {
    console.error("[EXPORT-RANKING-GERAL-MOBILE] containerId é obrigatório");
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-RANKING-GERAL-MOBILE] Container ${containerId} não encontrado`,
    );
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-ranking-geral-mobile",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  // Criar botão mobile dark
  const btn = document.createElement("button");
  btn.className = "btn-export-ranking-geral-mobile";

  // Definir conteúdo baseado no tipo
  const textoTipo = tipo === "geral" ? "Ranking Geral" : "Ranking da Rodada";
  const iconeTipo = tipo === "geral" ? "🏆" : "📊";

  btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 16px;">${iconeTipo}</span>
      <span>${textoTipo} Mobile HD</span>
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
    background: ${tipo === "geral" ? MOBILE_DARK_HD_CONFIG.colors.gradientSuccess : MOBILE_DARK_HD_CONFIG.colors.gradientPrimary};
    color: ${MOBILE_DARK_HD_CONFIG.colors.text};
    border: 2px solid ${tipo === "geral" ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.accent};
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
    btn.style.boxShadow = `0 12px 40px ${tipo === "geral" ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.accent}40`;
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
      await exportarRankingGeralMobileDarkHD({
        rankings,
        rodada,
        tipo,
      });
    } catch (error) {
      console.error("[EXPORT-RANKING-GERAL-MOBILE] Erro na exportação:", error);
      MobileDarkUtils.mostrarErro("Erro ao gerar ranking HD. Tente novamente.");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // Adicionar animação CSS se não existir
  if (!document.getElementById("export-ranking-animations")) {
    const style = document.createElement("style");
    style.id = "export-ranking-animations";
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

// EXPORTAÇÃO MOBILE DARK HD - RANKING GERAL
async function exportarRankingGeralMobileDarkHD(config) {
  const { rankings, rodada, tipo } = config;

  console.log("[EXPORT-RANKING-GERAL-MOBILE] Criando layout mobile dark HD...");

  // Validar dados
  MobileDarkUtils.validarDadosMobile(config, ["rankings", "rodada"]);

  if (!Array.isArray(rankings) || rankings.length === 0) {
    throw new Error("Dados do ranking inválidos ou vazios");
  }

  // Definir títulos
  const titulo =
    tipo === "geral" ? "🏆 Ranking Geral" : `📊 Ranking R${rodada}`;
  const subtitulo =
    tipo === "geral"
      ? `Até a ${rodada}ª rodada`
      : `Resultados da ${rodada}ª rodada`;

  // Criar container mobile dark
  const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
    rodada: rodada,
  });

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  // Inserir conteúdo do ranking mobile
  contentDiv.innerHTML = criarLayoutRankingGeralMobile(rankings, rodada, tipo);

  document.body.appendChild(exportContainer);

  try {
    // Gerar nome do arquivo
    const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("ranking", {
      rodada: rodada,
      extra: tipo,
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

// LAYOUT RANKING GERAL MOBILE DARK
function criarLayoutRankingGeralMobile(rankings, rodada, tipo) {
  const lider = rankings.length > 0 ? rankings[0] : null;
  const pontuacaoMedia =
    rankings.length > 0
      ? rankings.reduce((sum, t) => sum + (parseFloat(t.pontos) || 0), 0) /
        rankings.length
      : 0;

  const pontuacaoMaxima =
    rankings.length > 0
      ? Math.max(...rankings.map((t) => parseFloat(t.pontos) || 0))
      : 0;

  const gradienteTipo =
    tipo === "geral"
      ? MOBILE_DARK_HD_CONFIG.colors.gradientSuccess
      : MOBILE_DARK_HD_CONFIG.colors.gradientPrimary;

  return `
    <!-- MINI CARD DISCRETO - LÍDER -->
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
      <!-- Escudo compacto -->
      ${
        lider && lider.clube_id
          ? `
        <img src="/escudos/${lider.clube_id}.png"
             style="
               width: 32px; 
               height: 32px; 
               border-radius: 50%; 
               border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};
               background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
               flex-shrink: 0;
             "
             onerror="this.outerHTML='<div style=\\'width:32px;height:32px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:2px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;\\'>⚽</div>'"
             alt="Líder">
      `
          : `
        <div style="
          width: 32px; 
          height: 32px; 
          background: ${MOBILE_DARK_HD_CONFIG.colors.gold}; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 16px;
          flex-shrink: 0;
        ">🏆</div>
      `
      }

      <!-- Informações compactas -->
      <div style="flex: 1; min-width: 0;">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
          color: ${MOBILE_DARK_HD_CONFIG.colors.text};
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${lider ? lider.nome_cartola || lider.nome_cartoleiro || "N/D" : "N/D"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${tipo === "geral" ? "Líder Geral" : `Mito R${rodada}`}</div>
      </div>

      <!-- Pontuação destaque -->
      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.gold};
        color: #000;
        padding: 6px 10px;
        border-radius: 8px;
        text-align: center;
        flex-shrink: 0;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        ">${lider ? (parseFloat(lider.pontos) || 0).toFixed(1) : "0"}</div>
      </div>
    </div>

    <!-- LISTA COMPLETA RANKING -->
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
        background: ${gradienteTipo};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
        text-align: center;
      ">
        <h3 style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
          margin: 0;
          letter-spacing: 0.5px;
        ">${tipo === "geral" ? "🏆 RANKING GERAL" : `📊 RANKING RODADA ${rodada}`}</h3>
      </div>

      <!-- Lista de participantes -->
      <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
        ${rankings
          .slice(0, 20)
          .map((time, index) =>
            criarItemRankingMobile(time, index, tipo, rankings.length),
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

      <!-- Participantes -->
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
        ">${rankings.length}</div>
      </div>

      <!-- Pontuação Média -->
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
        ">${pontuacaoMedia.toFixed(1)}</div>
      </div>

      <!-- Pontuação Máxima -->
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
        ">${tipo === "geral" ? "🔥 Máxima" : "🎯 Melhor"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
          color: ${MOBILE_DARK_HD_CONFIG.colors.success};
        ">${pontuacaoMaxima.toFixed(1)}</div>
      </div>

    </div>
  `;
}

// ITEM INDIVIDUAL DO RANKING MOBILE DARK - CORRIGIDO
function criarItemRankingMobile(time, index, tipo, totalRankings) {
  const posicao = index + 1;

  // Determinar estilo da posição
  let posicaoDisplay,
    posicaoStyle,
    cardStyle = "";

  if (tipo === "rodada") {
    // Para ranking de rodada - destaque para MITO e MICO
    if (posicao === 1) {
      posicaoDisplay = "🔥";
      posicaoStyle = `
        background: ${MOBILE_DARK_HD_CONFIG.colors.success};
        color: #000;
        font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold};
      `;
      cardStyle = `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.success};`;
    } else if (posicao === totalRankings && totalRankings > 1) {
      posicaoDisplay = "😰";
      posicaoStyle = `
        background: ${MOBILE_DARK_HD_CONFIG.colors.danger};
        color: #000;
        font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold};
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
  } else {
    // Para ranking geral - medalhas tradicionais
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
  }

  // Mostrar banco apenas para ranking de rodada
  const mostrarBanco =
    tipo === "rodada" && time.banco !== undefined && time.banco !== null;

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
          ">❤️</div>
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

        ${
          mostrarBanco
            ? `
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${time.banco >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
            margin-top: 4px;
          ">
            ${time.banco >= 0 ? "+" : ""}R$ ${time.banco.toFixed(2).replace(".", ",")}
          </div>
        `
            : ""
        }
      </div>

      <!-- Pontuação -->
      <div style="
        text-align: right;
        margin-left: 12px;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
          color: ${posicao <= 3 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.accent};
        ">${(parseFloat(time.pontos) || 0).toFixed(2)}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          margin-top: 2px;
        ">pts</div>
      </div>

    </div>
  `;
}

// COMPATIBILIDADE COM FUNÇÕES LEGADO
export async function exportarRankingGeralComoImagem(rankings, rodada) {
  await exportarRankingGeralMobileDarkHD({
    rankings,
    rodada,
    tipo: "geral",
  });
}

export async function exportarRodadaComoImagem(
  rankings,
  rodada,
  tipo = "rodada",
) {
  await exportarRankingGeralMobileDarkHD({
    rankings,
    rodada,
    tipo,
  });
}

console.log("[EXPORT-RANKING-GERAL-MOBILE] Sistema Mobile Dark HD configurado");
console.log(
  "[EXPORT-RANKING-GERAL-MOBILE] Resolução: 400px x 800px+ @ 4x scale",
);
console.log(
  "[EXPORT-RANKING-GERAL-MOBILE] Compatibilidade com sistema existente mantida",
);

// SISTEMA DE EXPORTAÇÃO TOP 10 MOBILE DARK HD v3.0.0
// Migrado para formato vertical mobile, tema dark, ultra alta definição

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log(
  "[EXPORT-TOP10-MOBILE-DARK] Módulo Top 10 Mobile Dark HD v3.0.0 carregado",
);

/**
 * Formata pontuação com 2 casas decimais
 * @param {number|string} valor - Valor a ser formatado
 * @returns {string} - Valor formatado com 2 casas decimais
 */
function formatarPontuacao(valor) {
  const numero = parseFloat(valor) || 0;
  return numero.toFixed(2);
}

/**
 * Função principal para exportar Top10 mobile dark HD
 * @param {Array} dados - Array com dados do top10
 * @param {string} tipo - 'mitos' ou 'micos'
 * @param {number} rodada - Número da rodada
 * @param {Object} valoresBonusOnus - Valores de bônus/ônus da liga
 * @returns {Promise<void>}
 */
export async function exportarTop10ComoImagem(
  dados,
  tipo,
  rodada,
  valoresBonusOnus = {},
) {
  try {
    console.log("[EXPORT-TOP10-MOBILE-DARK] Iniciando exportação:", {
      dados: dados.length,
      tipo,
      rodada,
    });

    await exportarTop10MobileDarkHD({
      dados,
      tipo,
      rodada,
      valoresBonusOnus,
    });
  } catch (error) {
    console.error("[EXPORT-TOP10-MOBILE-DARK] Erro ao exportar:", error);
    throw error;
  }
}

/**
 * Função para criar botão de exportação Top10 mobile dark
 */
export async function criarBotaoExportacaoTop10(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-TOP10-MOBILE-DARK] Configuração inválida:", config);
    return;
  }

  const {
    containerId,
    dados = [],
    tipo = "mitos",
    rodada = "",
    valoresBonusOnus = {},
  } = config;

  // Localizar container
  let container = null;
  if (containerId) {
    container =
      typeof containerId === "string"
        ? document.getElementById(containerId)
        : containerId;
  }

  if (!container) {
    // Fallback para containers comuns
    container =
      document.querySelector(".top10-container") ||
      document.querySelector(".ranking-container") ||
      document.querySelector("#top10-mitos") ||
      document.querySelector("#top10-micos") ||
      document.body;
  }

  if (!container) {
    console.error("[EXPORT-TOP10-MOBILE-DARK] Container não encontrado");
    return;
  }

  // Remover botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-top10-mobile-dark",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = `
    display: flex;
    justify-content: center;
    margin: 20px 0;
    padding: 0 16px;
  `;

  // Criar botão mobile dark
  const btn = document.createElement("button");
  btn.className = "btn-export-top10-mobile-dark";

  // Definir texto baseado no tipo
  const tipoTexto = tipo === "mitos" ? "Mitos" : "Micos";
  const tipoIcon = tipo === "mitos" ? "🏆" : "😅";

  btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 18px;">${tipoIcon}</span>
      <span>Top 10 ${tipoTexto} HD</span>
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
    background: ${tipo === "mitos" ? MOBILE_DARK_HD_CONFIG.colors.gradientSuccess : MOBILE_DARK_HD_CONFIG.colors.gradientDanger};
    color: ${MOBILE_DARK_HD_CONFIG.colors.text};
    border: none;
    padding: 16px 24px;
    border-radius: 14px;
    cursor: pointer;
    font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 200px;
    position: relative;
    overflow: hidden;
  `;

  // Efeitos hover
  btn.onmouseover = () => {
    btn.style.transform = "translateY(-3px) scale(1.02)";
    btn.style.boxShadow = `0 12px 40px ${tipo === "mitos" ? "rgba(76, 175, 80, 0.4)" : "rgba(244, 67, 54, 0.4)"}`;
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0) scale(1)";
    btn.style.boxShadow = MOBILE_DARK_HD_CONFIG.colors.shadow;
  };

  // Event handler
  btn.onclick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

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
      await exportarTop10MobileDarkHD({
        dados,
        tipo,
        rodada,
        valoresBonusOnus,
      });
    } catch (error) {
      console.error("[EXPORT-TOP10-MOBILE-DARK] Erro:", error);
      MobileDarkUtils.mostrarErro("Erro ao gerar Top 10 HD. Tente novamente.");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // Adicionar animação CSS
  if (!document.querySelector("#top10-mobile-animations")) {
    const style = document.createElement("style");
    style.id = "top10-mobile-animations";
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  btnContainer.appendChild(btn);

  if (container.firstChild) {
    container.insertBefore(btnContainer, container.firstChild);
  } else {
    container.appendChild(btnContainer);
  }

  console.log("[EXPORT-TOP10-MOBILE-DARK] Botão mobile dark HD criado");
}

// FUNÇÃO DE EXPORTAÇÃO MOBILE DARK HD
async function exportarTop10MobileDarkHD(config) {
  const { dados, tipo, rodada, valoresBonusOnus } = config;

  console.log("[EXPORT-TOP10-MOBILE-DARK] Criando layout mobile dark HD...");

  // Validar dados
  MobileDarkUtils.validarDadosMobile(dados);

  if (!Array.isArray(dados) || dados.length === 0) {
    throw new Error("Dados do Top 10 inválidos ou vazios");
  }

  // Extrair número da rodada
  const rodadaNumero =
    typeof rodada === "object" && rodada !== null
      ? rodada.numero || rodada.id || rodada.rodada || "atual"
      : rodada || "atual";

  // Definir títulos
  const titulo = tipo === "mitos" ? "🏆 Top 10 MITOS" : "😅 Top 10 MICOS";
  const subtitulo = `Rodada ${rodadaNumero}`;

  // Criar container mobile dark
  const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
    rodada: rodadaNumero,
  });

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  // Inserir conteúdo do top 10 mobile
  contentDiv.innerHTML = criarLayoutTop10MobileDark(
    dados,
    tipo,
    valoresBonusOnus,
  );

  document.body.appendChild(exportContainer);

  try {
    // Gerar nome do arquivo
    const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("top10", {
      rodada: rodadaNumero,
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

// LAYOUT TOP 10 MOBILE DARK OTIMIZADO
function criarLayoutTop10MobileDark(dados, tipo, valoresBonusOnus) {
  const corTema =
    tipo === "mitos"
      ? MOBILE_DARK_HD_CONFIG.colors.success
      : MOBILE_DARK_HD_CONFIG.colors.danger;

  const corGradiente =
    tipo === "mitos"
      ? MOBILE_DARK_HD_CONFIG.colors.gradientSuccess
      : MOBILE_DARK_HD_CONFIG.colors.gradientDanger;

  // Calcular estatísticas
  const pontuacaoMedia =
    dados.length > 0
      ? dados.reduce((sum, t) => sum + (parseFloat(t.pontos) || 0), 0) /
        dados.length
      : 0;

  const pontuacaoExtrema =
    dados.length > 0
      ? tipo === "mitos"
        ? Math.max(...dados.map((t) => parseFloat(t.pontos) || 0))
        : Math.min(...dados.map((t) => parseFloat(t.pontos) || 0))
      : 0;

  return `
    <!-- CARD PRINCIPAL DE DESTAQUE -->
    <div style="
      background: ${corGradiente};
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: rgba(255,255,255,0.9);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 2px;
      ">${tipo === "mitos" ? "🔥 DESTAQUE DA RODADA" : "😰 MAIOR PERRENGUE"}</div>

      ${
        dados.length > 0
          ? `
        <!-- Escudo e nome do líder -->
        <div style="margin-bottom: 12px;">
          ${
            dados[0].clube_id
              ? `
            <img src="/escudos/${dados[0].clube_id}.png"
                 style="
                   width: 56px; 
                   height: 56px; 
                   border-radius: 50%; 
                   border: 3px solid rgba(255,255,255,0.3);
                   background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
                   margin-bottom: 12px;
                 "
                 onerror="this.outerHTML='<div style=\\'width:56px;height:56px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:3px solid rgba(255,255,255,0.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;\\'>⚽</div>'"
                 alt="Escudo">
          `
              : ""
          }
        </div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
          color: ${MOBILE_DARK_HD_CONFIG.colors.text};
          margin-bottom: 4px;
        ">${dados[0].nome_cartola || dados[0].nome_cartoleiro || "N/D"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
          color: rgba(255,255,255,0.8);
          margin-bottom: 12px;
        ">${dados[0].nome_time || "Time não informado"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} ${MOBILE_DARK_HD_CONFIG.fonts.titleLarge};
          color: ${MOBILE_DARK_HD_CONFIG.colors.text};
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        ">${formatarPontuacao(dados[0].pontos)} pts</div>
      `
          : `
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.body};
          color: rgba(255,255,255,0.8);
        ">Nenhum dado disponível</div>
      `
      }
    </div>

    <!-- LISTA COMPLETA TOP 10 -->
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
        background: ${corGradiente};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
        text-align: center;
      ">
        <h3 style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
          margin: 0;
          letter-spacing: 0.5px;
        ">${tipo === "mitos" ? "🏆 TOP 10 MAIORES PONTUAÇÕES" : "😅 TOP 10 MENORES PONTUAÇÕES"}</h3>
      </div>

      <!-- Lista de participantes -->
      <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
        ${dados
          .slice(0, 10)
          .map((item, index) =>
            criarItemTop10Mobile(item, index, tipo, valoresBonusOnus),
          )
          .join("")}
      </div>

    </div>

    <!-- ESTATÍSTICAS RESUMO -->
    <div style="
      display: grid;
      grid-template-columns: 1fr 1fr;
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
        ">${dados.length}</div>
      </div>

      <!-- Pontuação Média/Extrema -->
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
        ">${tipo === "mitos" ? "🔥 Máxima" : "❄️ Mínima"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
          color: ${corTema};
        ">${formatarPontuacao(pontuacaoExtrema)}</div>
      </div>

    </div>
  `;
}

// ITEM INDIVIDUAL DO TOP 10 MOBILE DARK
function criarItemTop10Mobile(item, index, tipo, valoresBonusOnus) {
  const posicao = index + 1;

  // Calcular pontos com bônus/ônus
  let pontos = parseFloat(item.pontos) || 0;
  if (valoresBonusOnus && Object.keys(valoresBonusOnus).length > 0) {
    if (valoresBonusOnus.bonus) {
      pontos += parseFloat(valoresBonusOnus.bonus) || 0;
    }
    if (valoresBonusOnus.onus) {
      pontos -= parseFloat(valoresBonusOnus.onus) || 0;
    }
  }

  // Determinar estilo da posição
  let posicaoDisplay,
    posicaoStyle,
    cardStyle = "";

  if (posicao === 1) {
    posicaoDisplay = tipo === "mitos" ? "🥇" : "🏆";
    posicaoStyle = `
      background: ${tipo === "mitos" ? MOBILE_DARK_HD_CONFIG.colors.gold : MOBILE_DARK_HD_CONFIG.colors.danger};
      color: #000;
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold};
    `;
    cardStyle = `border-left: 4px solid ${tipo === "mitos" ? MOBILE_DARK_HD_CONFIG.colors.gold : MOBILE_DARK_HD_CONFIG.colors.danger};`;
  } else if (posicao === 2) {
    posicaoDisplay = tipo === "mitos" ? "🥈" : "😰";
    posicaoStyle = `
      background: ${MOBILE_DARK_HD_CONFIG.colors.silver};
      color: #000;
      font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold};
    `;
  } else if (posicao === 3) {
    posicaoDisplay = tipo === "mitos" ? "🥉" : "😬";
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
          item.clube_id
            ? `
          <img src="/escudos/${item.clube_id}.png"
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
        ">${item.nome_cartola || item.nome_cartoleiro || "N/D"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${item.nome_time || "Time não informado"}</div>

      </div>

      <!-- Pontuação -->
      <div style="
        text-align: right;
        margin-left: 12px;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
          color: ${tipo === "mitos" ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
        ">${formatarPontuacao(pontos)}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          margin-top: 2px;
        ">pts</div>
      </div>

    </div>
  `;
}

// FUNÇÃO DE TESTE DO MÓDULO
export function testarModulo() {
  console.log("[EXPORT-TOP10-MOBILE-DARK] Módulo carregado e funcionando");
  return true;
}

console.log("[EXPORT-TOP10-MOBILE-DARK] Sistema mobile dark HD configurado");
console.log("[EXPORT-TOP10-MOBILE-DARK] Resolução: 400px x 800px+ @ 4x scale");
console.log(
  "[EXPORT-TOP10-MOBILE-DARK] Compatibilidade com sistema existente mantida",
);

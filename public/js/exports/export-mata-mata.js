// SISTEMA DE EXPORTAÇÃO MATA-MATA - MOBILE DARK HD v3.0.1
// Seguindo padrão estabelecido por export-pontos-corridos.js
// CORREÇÃO: Cores vermelhas para perdedores + Fix de sintaxe

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log(
  "[EXPORT-MATA-MATA-MOBILE] Sistema Mobile Dark HD v3.0.1 carregado",
);

// ================================================================
// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO
// ================================================================
export async function criarBotaoExportacaoMataMata(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-MATA-MATA-MOBILE] Configuração inválida:", config);
    return;
  }

  const {
    containerId,
    fase = "Mata-Mata",
    confrontos = [],
    isPending = false,
    rodadaPontos = "",
    edicao = "SuperCartola 2025",
  } = config;

  console.log("[EXPORT-MATA-MATA-MOBILE] Criando botão exportação:", {
    containerId,
    confrontosCount: confrontos.length,
    fase,
    isPending,
  });

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-MATA-MATA-MOBILE] Container ${containerId} não encontrado`,
    );
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-mata-mata-mobile",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  // Criar botão mobile dark
  const btn = document.createElement("button");
  btn.className = "btn-export-mata-mata-mobile";
  btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 16px;">⚔️</span>
      <span>Mata-Mata Mobile HD</span>
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
    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientWarning};
    color: ${MOBILE_DARK_HD_CONFIG.colors.text};
    border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.warning};
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
    btn.style.boxShadow = `0 12px 40px ${MOBILE_DARK_HD_CONFIG.colors.warning}40`;
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
      await exportarMataMataComoImagemMobileDarkHD({
        fase,
        edicao,
        confrontos,
        isPending,
        rodadaPontos,
      });
    } catch (error) {
      console.error("[EXPORT-MATA-MATA-MOBILE] Erro na exportação:", error);
      MobileDarkUtils.mostrarErro(
        "Erro ao gerar Mata-Mata HD. Tente novamente.",
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

  // POSICIONAR NA PARTE SUPERIOR
  if (container.firstChild) {
    container.insertBefore(btnContainer, container.firstChild);
  } else {
    container.appendChild(btnContainer);
  }
}

// ================================================================
// EXPORTAÇÃO MOBILE DARK HD
// ================================================================
async function exportarMataMataComoImagemMobileDarkHD(config) {
  const { fase, edicao, confrontos, isPending, rodadaPontos } = config;

  console.log("[EXPORT-MATA-MATA-MOBILE] Criando layout mobile dark HD...");

  // Validar dados
  MobileDarkUtils.validarDadosMobile(config, ["fase", "confrontos"]);

  // Definir títulos
  const titulo = `⚔️ ${fase}`;
  const subtitulo = isPending
    ? "Aguardando próxima rodada"
    : "Resultados finalizados";

  // Criar container mobile dark
  const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
    fase: fase,
  });

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  // Inserir conteúdo específico do mata-mata
  contentDiv.innerHTML = criarLayoutMataMataComoImagemMobile(
    confrontos,
    fase,
    edicao,
    isPending,
    rodadaPontos,
  );

  document.body.appendChild(exportContainer);

  try {
    // Gerar nome do arquivo seguindo padrão
    const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("mata-mata", {
      extra: fase.toLowerCase().replace(/\s+/g, "-"),
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

// ================================================================
// LAYOUT MATA-MATA MOBILE DARK
// ================================================================
function criarLayoutMataMataComoImagemMobile(
  confrontos,
  fase,
  edicao,
  isPending,
  rodadaPontos,
) {
  const totalConfrontos = confrontos.length;
  const confrontosFinalizados = confrontos.filter(
    (c) => !isPending && c.timeA?.pontos !== null && c.timeB?.pontos !== null,
  ).length;

  const vitoriasPorGoleada = confrontos.filter((c) => {
    if (isPending || !c.timeA?.pontos || !c.timeB?.pontos) return false;
    const diferenca = Math.abs(c.timeA.pontos - c.timeB.pontos);
    return diferenca >= 50; // Critério de goleada no mata-mata
  }).length;

  return `
    <!-- MINI CARD DISCRETO - FASE -->
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
      <!-- Ícone da fase -->
      <div style="
        width: 32px; 
        height: 32px; 
        background: ${MOBILE_DARK_HD_CONFIG.colors.warning}; 
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
        ">${fase}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        ">${edicao}</div>
      </div>

      <!-- Total confrontos -->
      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.warning};
        color: #000;
        padding: 6px 10px;
        border-radius: 8px;
        text-align: center;
        flex-shrink: 0;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        ">${confrontos.length}</div>
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
        ">⚔️ CONFRONTOS DO MATA-MATA</h3>
      </div>

      <!-- Lista de confrontos -->
      <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
        ${confrontos
          .slice(0, 16)
          .map((confronto, index) =>
            criarItemConfrontoMataMataComoImagemMobile(
              confronto,
              index,
              isPending,
            ),
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

      <!-- Total Confrontos -->
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
        ">⚔️ Confrontos</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
          color: ${MOBILE_DARK_HD_CONFIG.colors.warning};
        ">${totalConfrontos}</div>
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
        ">${vitoriasPorGoleada}</div>
      </div>

    </div>
  `;
}

// ================================================================
// ITEM INDIVIDUAL DO CONFRONTO MOBILE DARK - CORRIGIDO
// ================================================================
function criarItemConfrontoMataMataComoImagemMobile(
  confronto,
  index,
  isPending,
) {
  const { jogo, timeA, timeB } = confronto;

  // Determinar vencedor
  let vencedorA = false,
    vencedorB = false;
  if (!isPending && timeA?.pontos !== null && timeB?.pontos !== null) {
    if (timeA.pontos > timeB.pontos) {
      vencedorA = true;
    } else if (timeB.pontos > timeA.pontos) {
      vencedorB = true;
    } else {
      // Critério de desempate por ranking (mata-mata)
      if (timeA.rankR2 < timeB.rankR2) {
        vencedorA = true;
      } else {
        vencedorB = true;
      }
    }
  }

  // Verificar goleada
  const diferenca =
    !isPending && timeA?.pontos && timeB?.pontos
      ? Math.abs(timeA.pontos - timeB.pontos)
      : 0;
  const goleada = diferenca >= 50;

  const formatarPontos = (pontos) => {
    if (isPending || pontos === null || pontos === undefined) return "-";
    return typeof pontos === "number" ? pontos.toFixed(2) : "-";
  };

  return `
    <div style="
      display: flex;
      align-items: center;
      padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
      border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
      ${goleada ? `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.warning};` : ""}
      transition: all 0.2s ease;
    ">

      <!-- Número do Jogo -->
      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.warning};
        color: #000;
        padding: 8px 12px;
        border-radius: 8px;
        margin-right: 16px;
        min-width: 50px;
        text-align: center;
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
      ">
        J${jogo}
      </div>

      <!-- Time A -->
      <div style="flex: 1; display: flex; align-items: center; gap: 12px;">
        ${
          timeA?.clube_id
            ? `
          <img src="/escudos/${timeA.clube_id}.png"
               style="
                 width: 32px; 
                 height: 32px; 
                 border-radius: 50%; 
                 border: 2px solid ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : vencedorB ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.border};
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

        <div style="flex: 1; min-width: 0;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
            color: ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : vencedorB ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.text};
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">
            ${vencedorA ? "👑 " : ""}${timeA?.nome_time || "Time A"}
          </div>

          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${timeA?.nome_cartoleiro || timeA?.nome_cartola || "N/D"}</div>
        </div>
      </div>

      <!-- Pontuação A -->
      <div style="text-align: center; margin: 0 12px;">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
          color: ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : vencedorB ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.text};
        ">
          ${formatarPontos(timeA?.pontos)}${goleada && vencedorA ? " 🔥" : ""}
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
          ${formatarPontos(timeB?.pontos)}${goleada && vencedorB ? " 🔥" : ""}
        </div>
      </div>

      <!-- Time B -->
      <div style="flex: 1; display: flex; align-items: center; gap: 12px; flex-direction: row-reverse;">
        ${
          timeB?.clube_id
            ? `
          <img src="/escudos/${timeB.clube_id}.png"
               style="
                 width: 32px; 
                 height: 32px; 
                 border-radius: 50%; 
                 border: 2px solid ${vencedorB ? MOBILE_DARK_HD_CONFIG.colors.success : vencedorA ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.border};
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

        <div style="flex: 1; min-width: 0; text-align: right;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
            color: ${vencedorB ? MOBILE_DARK_HD_CONFIG.colors.success : vencedorA ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.text};
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">
            ${timeB?.nome_time || "Time B"}${vencedorB ? " 👑" : ""}
          </div>

          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${timeB?.nome_cartoleiro || timeB?.nome_cartola || "N/D"}</div>
        </div>
      </div>

    </div>
  `;
}

// ================================================================
// COMPATIBILIDADE COM SISTEMA LEGADO
// ================================================================
export async function exportarMataMataComoImagem(config) {
  return await exportarMataMataComoImagemMobileDarkHD(config);
}

console.log("[EXPORT-MATA-MATA-MOBILE] Sistema Mobile Dark HD configurado");
console.log("[EXPORT-MATA-MATA-MOBILE] Resolução: 720px x 800px+ @ 4x scale");
console.log(
  "[EXPORT-MATA-MATA-MOBILE] Compatibilidade com sistema existente mantida",
);

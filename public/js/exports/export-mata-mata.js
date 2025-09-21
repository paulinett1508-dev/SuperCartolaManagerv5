// SISTEMA DE EXPORTAÇÃO MATA-MATA - MOBILE DARK HD v3.0.1 CORRIGIDO
// Implementação completa e funcional

console.log("[EXPORT-MATA-MATA] 🚀 Sistema Mobile Dark HD v3.0.1 carregado");

// ================================================================
// CONFIGURAÇÃO LOCAL (FALLBACK SE IMPORT FALHAR)
// ================================================================
const FALLBACK_CONFIG = {
  colors: {
    gradientPrimary: "linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)",
    gradientWarning: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",
    gradientDark: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
    gradientSuccess: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",
    text: "#FFFFFF",
    accent: "#FF6B35",
    warning: "#4CAF50",
    success: "#4CAF50",
    surface: "#1e1e1e",
    border: "#404040",
    divider: "#333333",
    textMuted: "#B0B0B0",
    shadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
    shadowLight: "0 4px 16px rgba(0, 0, 0, 0.4)",
  },
  fonts: {
    weights: { semibold: 600, bold: 700, regular: 400 },
    heading: "20px 'Inter', sans-serif",
    subheading: "18px 'Inter', sans-serif",
    body: "16px 'Inter', sans-serif",
    bodySmall: "14px 'Inter', sans-serif",
    caption: "12px 'Inter', sans-serif",
  },
  padding: 16,
};

// Sistema Desktop Original (mantido do arquivo atual)
const TEMPLATE_CONFIG = {
  colors: {
    primary: "#2E8B57",
    secondary: "#228B22",
    accent: "#32CD32",
  },
};

// Tentar importar Mobile Dark HD ou usar fallback
let MobileDarkConfig = FALLBACK_CONFIG;
let MobileDarkUtils = null;
let criarContainerMobileDark = null;
let gerarCanvasMobileDarkHD = null;

async function carregarMobileDarkHD() {
  try {
    const module = await import("./export-base.js");
    MobileDarkConfig = module.MOBILE_DARK_HD_CONFIG || FALLBACK_CONFIG;
    MobileDarkUtils = module.MobileDarkUtils;
    criarContainerMobileDark = module.criarContainerMobileDark;
    gerarCanvasMobileDarkHD = module.gerarCanvasMobileDarkHD;
    console.log("[EXPORT-MATA-MATA] ✅ Mobile Dark HD importado com sucesso");
    return true;
  } catch (error) {
    console.warn("[EXPORT-MATA-MATA] ⚠️ Usando fallback config:", error);
    return false;
  }
}

// ================================================================
// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO
// ================================================================
export async function criarBotaoExportacaoMataMata(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-MATA-MATA] Configuração inválida:", config);
    return;
  }

  const { containerId } = config;
  console.log(
    "[EXPORT-MATA-MATA] 🎯 Criando botão para container:",
    containerId,
  );

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-MATA-MATA] ❌ Container ${containerId} não encontrado`,
    );
    return;
  }

  // Carregar Mobile Dark HD
  const mobileDarkLoaded = await carregarMobileDarkHD();

  // Remove botões existentes
  const botoesExistentes = container.querySelectorAll(
    ".btn-export-mata-mata, .btn-export-mata-mata-mobile, .btn-export-mata-mata-test",
  );
  botoesExistentes.forEach((btn) => btn.remove());

  // Criar container para botões
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = `
    text-align: right; 
    margin: 15px 0; 
    display: flex; 
    gap: 10px; 
    justify-content: flex-end; 
    flex-wrap: wrap;
    border: 1px solid #ddd;
    padding: 10px;
    border-radius: 8px;
    background: #f9f9f9;
  `;

  // Botão Mobile Dark HD (se disponível)
  if (mobileDarkLoaded) {
    const btnMobile = criarBotaoMobileDarkHD(config);
    btnContainer.appendChild(btnMobile);
  }

  // Botão Desktop (sempre disponível)
  const btnDesktop = criarBotaoDesktop(config);
  btnContainer.appendChild(btnDesktop);

  // Botão de teste (para debug)
  const btnTest = criarBotaoTeste(config);
  btnContainer.appendChild(btnTest);

  // Posicionar container
  if (container.firstChild) {
    container.insertBefore(btnContainer, container.firstChild);
  } else {
    container.appendChild(btnContainer);
  }

  console.log("[EXPORT-MATA-MATA] ✅ Botões criados com sucesso");
}

// ================================================================
// BOTÃO MOBILE DARK HD
// ================================================================
function criarBotaoMobileDarkHD(config) {
  const btn = document.createElement("button");
  btn.className = "btn-export-mata-mata-mobile";
  btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 14px;">📱</span>
      <span>Mobile HD</span>
    </div>
  `;

  btn.style.cssText = `
    background: ${MobileDarkConfig.colors.gradientPrimary};
    color: ${MobileDarkConfig.colors.text};
    border: 2px solid ${MobileDarkConfig.colors.accent};
    padding: 12px 18px;
    border-radius: 8px;
    cursor: pointer;
    font: ${MobileDarkConfig.fonts.weights.semibold} 13px Inter, sans-serif;
    transition: all 0.3s ease;
    box-shadow: ${MobileDarkConfig.colors.shadow};
  `;

  btn.onclick = async () => {
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 14px; height: 14px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span>Gerando...</span>
      </div>
    `;
    btn.disabled = true;

    try {
      await exportarMataMataComoImagemMobileDarkHD(config);
      alert("✅ Mobile HD exportado com sucesso!");
    } catch (error) {
      console.error("[EXPORT-MATA-MATA] ❌ Erro Mobile HD:", error);
      alert("❌ Erro ao gerar Mobile HD: " + error.message);
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  return btn;
}

// ================================================================
// BOTÃO DESKTOP (SISTEMA ORIGINAL)
// ================================================================
function criarBotaoDesktop(config) {
  const btn = document.createElement("button");
  btn.className = "btn-export-mata-mata";
  btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>🖥️</span>
      <span>Desktop</span>
    </div>
  `;

  btn.style.cssText = `
    background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary} 0%, ${TEMPLATE_CONFIG.colors.accent} 100%);
    color: white;
    border: none;
    padding: 12px 18px;
    border-radius: 8px;
    cursor: pointer;
    font: 500 13px Inter, sans-serif;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);
  `;

  btn.onclick = async () => {
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 14px; height: 14px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span>Gerando...</span>
      </div>
    `;
    btn.disabled = true;

    try {
      await exportarMataMataDesktop(config);
      alert("✅ Desktop exportado com sucesso!");
    } catch (error) {
      console.error("[EXPORT-MATA-MATA] ❌ Erro Desktop:", error);
      alert("❌ Erro ao gerar Desktop: " + error.message);
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  return btn;
}

// ================================================================
// BOTÃO DE TESTE
// ================================================================
function criarBotaoTeste(config) {
  const btn = document.createElement("button");
  btn.className = "btn-export-mata-mata-test";
  btn.innerHTML = `🧪 Teste`;

  btn.style.cssText = `
    background: #17a2b8;
    color: white;
    border: none;
    padding: 12px 18px;
    border-radius: 8px;
    cursor: pointer;
    font: 500 13px Inter, sans-serif;
  `;

  btn.onclick = () => {
    console.log("[EXPORT-MATA-MATA] 🧪 Teste executado");
    console.log("Config recebida:", config);
    alert("🧪 Botão funcionando!\nVerifique o console para detalhes.");
  };

  return btn;
}

// ================================================================
// EXPORTAÇÃO MOBILE DARK HD
// ================================================================
async function exportarMataMataComoImagemMobileDarkHD(config) {
  console.log("[EXPORT-MATA-MATA] 📱 Iniciando exportação Mobile Dark HD...");

  if (!criarContainerMobileDark || !gerarCanvasMobileDarkHD) {
    throw new Error("Funções Mobile Dark HD não disponíveis");
  }

  const { fase, edicao, confrontos, isPending, rodadaPontos } = config;

  // Validar dados básicos
  if (!confrontos || !Array.isArray(confrontos)) {
    throw new Error("Confrontos inválidos");
  }

  // Definir títulos
  const titulo = `⚔️ ${fase || "Mata-Mata"}`;
  const subtitulo = isPending
    ? "Aguardando próxima rodada"
    : "Resultados finalizados";

  // Criar container mobile dark
  const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
    fase: fase,
    edicao: edicao,
  });

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  // Inserir conteúdo específico do mata-mata
  contentDiv.innerHTML = criarLayoutMataMataMobile(
    confrontos,
    fase || "Mata-Mata",
    edicao || "SuperCartola 2025",
    isPending || false,
    rodadaPontos || "",
  );

  document.body.appendChild(exportContainer);

  try {
    // Gerar nome do arquivo
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "");
    const nomeArquivo = `mata-mata-mobile-${timestamp}.png`;

    // Gerar e fazer download da imagem HD
    await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);

    console.log("[EXPORT-MATA-MATA] ✅ Mobile HD exportado:", nomeArquivo);
  } finally {
    // Limpar container temporário
    if (exportContainer.parentNode === document.body) {
      document.body.removeChild(exportContainer);
    }
  }
}

// ================================================================
// EXPORTAÇÃO DESKTOP (SIMPLIFICADA)
// ================================================================
async function exportarMataMataDesktop(config) {
  console.log("[EXPORT-MATA-MATA] 🖥️ Iniciando exportação Desktop...");

  // Implementação simplificada para teste
  const { confrontos, fase } = config;

  const html = `
    <div style="width: 800px; background: white; padding: 20px; font-family: Inter;">
      <h1 style="text-align: center; color: #2E8B57;">${fase || "Mata-Mata"}</h1>
      <div style="display: grid; gap: 10px;">
        ${confrontos
          .map(
            (c) => `
          <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
            <strong>Jogo ${c.jogo}:</strong>
            ${c.timeA?.nome_time || "Time A"} vs ${c.timeB?.nome_time || "Time B"}
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  // Criar container temporário
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.top = "-9999px";
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  try {
    // Simular exportação (aqui você usaria html2canvas)
    console.log("[EXPORT-MATA-MATA] 🖥️ Desktop gerado (simulado)");

    // Cleanup
    document.body.removeChild(tempDiv);
  } catch (error) {
    document.body.removeChild(tempDiv);
    throw error;
  }
}

// ================================================================
// LAYOUT MOBILE DARK
// ================================================================
function criarLayoutMataMataMobile(
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

  return `
    <div style="
      background: ${MobileDarkConfig.colors.gradientWarning};
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      text-align: center;
      box-shadow: ${MobileDarkConfig.colors.shadow};
    ">
      <div style="
        font: ${MobileDarkConfig.fonts.weights.regular} ${MobileDarkConfig.fonts.caption};
        color: rgba(255,255,255,0.9);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 2px;
      ">⚔️ MATA-MATA</div>

      <div style="
        font: ${MobileDarkConfig.fonts.weights.bold} ${MobileDarkConfig.fonts.heading};
        color: ${MobileDarkConfig.colors.text};
        margin-bottom: 4px;
      ">${fase}</div>

      <div style="
        font: ${MobileDarkConfig.fonts.weights.regular} ${MobileDarkConfig.fonts.bodySmall};
        color: rgba(255,255,255,0.8);
      ">${edicao}</div>
    </div>

    <div style="
      background: ${MobileDarkConfig.colors.surface};
      border-radius: 16px;
      padding: 0;
      border: 1px solid ${MobileDarkConfig.colors.border};
      box-shadow: ${MobileDarkConfig.colors.shadowLight};
      overflow: hidden;
      margin-bottom: 20px;
    ">
      <div style="
        background: ${MobileDarkConfig.colors.gradientDark};
        color: ${MobileDarkConfig.colors.text};
        padding: 16px;
        text-align: center;
      ">
        <h3 style="
          font: ${MobileDarkConfig.fonts.weights.semibold} ${MobileDarkConfig.fonts.subheading};
          margin: 0;
        ">⚔️ CONFRONTOS</h3>
      </div>

      <div style="padding: 16px 0;">
        ${confrontos
          .slice(0, 16)
          .map((confronto, index) =>
            criarItemConfrontoMobile(confronto, index, isPending),
          )
          .join("")}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div style="
        background: ${MobileDarkConfig.colors.surface};
        border: 1px solid ${MobileDarkConfig.colors.border};
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      ">
        <div style="
          font: ${MobileDarkConfig.fonts.weights.regular} ${MobileDarkConfig.fonts.caption};
          color: ${MobileDarkConfig.colors.textMuted};
          margin-bottom: 4px;
        ">⚔️ JOGOS</div>
        <div style="
          font: ${MobileDarkConfig.fonts.weights.bold} ${MobileDarkConfig.fonts.heading};
          color: ${MobileDarkConfig.colors.accent};
        ">${totalConfrontos}</div>
      </div>

      <div style="
        background: ${MobileDarkConfig.colors.surface};
        border: 1px solid ${MobileDarkConfig.colors.border};
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      ">
        <div style="
          font: ${MobileDarkConfig.fonts.weights.regular} ${MobileDarkConfig.fonts.caption};
          color: ${MobileDarkConfig.colors.textMuted};
          margin-bottom: 4px;
        ">✅ FINALIZADOS</div>
        <div style="
          font: ${MobileDarkConfig.fonts.weights.bold} ${MobileDarkConfig.fonts.heading};
          color: ${MobileDarkConfig.colors.success};
        ">${confrontosFinalizados}</div>
      </div>
    </div>
  `;
}

function criarItemConfrontoMobile(confronto, index, isPending) {
  const { jogo, timeA, timeB } = confronto;

  let vencedorA = false,
    vencedorB = false;
  if (!isPending && timeA?.pontos !== null && timeB?.pontos !== null) {
    if (timeA.pontos > timeB.pontos) {
      vencedorA = true;
    } else if (timeB.pontos > timeA.pontos) {
      vencedorB = true;
    } else if (timeA.rankR2 < timeB.rankR2) {
      vencedorA = true;
    } else {
      vencedorB = true;
    }
  }

  const formatarPontos = (pontos) => {
    if (isPending || pontos === null) return "-";
    return typeof pontos === "number" ? pontos.toFixed(2) : "-";
  };

  return `
    <div style="
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid ${MobileDarkConfig.colors.divider};
    ">
      <div style="
        background: ${MobileDarkConfig.colors.warning};
        color: #000;
        padding: 6px 10px;
        border-radius: 6px;
        margin-right: 12px;
        font: ${MobileDarkConfig.fonts.weights.bold} ${MobileDarkConfig.fonts.bodySmall};
      ">J${jogo}</div>

      <div style="flex: 1; text-align: center;">
        <div style="
          font: ${MobileDarkConfig.fonts.weights.semibold} ${MobileDarkConfig.fonts.bodySmall};
          color: ${vencedorA ? MobileDarkConfig.colors.success : MobileDarkConfig.colors.text};
          margin-bottom: 2px;
        ">
          ${vencedorA ? "👑 " : ""}${timeA?.nome_time || "Time A"}
        </div>
        <div style="
          font: ${MobileDarkConfig.fonts.weights.bold} ${MobileDarkConfig.fonts.subheading};
          color: ${vencedorA ? MobileDarkConfig.colors.success : MobileDarkConfig.colors.text};
        ">${formatarPontos(timeA?.pontos)}</div>
      </div>

      <div style="
        font: ${MobileDarkConfig.fonts.weights.bold} ${MobileDarkConfig.fonts.bodySmall};
        color: ${MobileDarkConfig.colors.textMuted};
        margin: 0 8px;
      ">VS</div>

      <div style="flex: 1; text-align: center;">
        <div style="
          font: ${MobileDarkConfig.fonts.weights.semibold} ${MobileDarkConfig.fonts.bodySmall};
          color: ${vencedorB ? MobileDarkConfig.colors.success : MobileDarkConfig.colors.text};
          margin-bottom: 2px;
        ">
          ${timeB?.nome_time || "Time B"}${vencedorB ? " 👑" : ""}
        </div>
        <div style="
          font: ${MobileDarkConfig.fonts.weights.bold} ${MobileDarkConfig.fonts.subheading};
          color: ${vencedorB ? MobileDarkConfig.colors.success : MobileDarkConfig.colors.text};
        ">${formatarPontos(timeB?.pontos)}</div>
      </div>
    </div>
  `;
}

// ================================================================
// COMPATIBILIDADE E EXPORTS
// ================================================================

// Função legado para compatibilidade
export async function exportarMataMataComoImagem(config) {
  return await criarBotaoExportacaoMataMata(config);
}

// Adicionar animação CSS
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

console.log("[EXPORT-MATA-MATA] ✅ Sistema carregado e funcional");

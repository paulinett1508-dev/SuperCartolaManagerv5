// ✅ SISTEMA DE EXPORTAÇÃO PROFISSIONAL - MATA-MATA
// Padrão UX modular, vertical, compacto e bonito

// ✅ CONFIGURAÇÃO DO TEMPLATE PROFISSIONAL
const TEMPLATE_CONFIG = {
  width: 800,
  padding: 24, // Reduzido de 32 para 24
  headerHeight: 85, // Reduzido de 100 para 85
  footerHeight: 40, // Reduzido de 50 para 40
  cardSpacing: 8, // Reduzido de 12 para 8
  colors: {
    primary: "#2E8B57", // Verde da logo SuperCartola
    secondary: "#228B22", // Verde mais escuro
    accent: "#32CD32", // Verde claro
    background: "#ffffff",
    surface: "#ffffff",
    border: "#e0e0e0",
    text: "#2c2c2c",
    textLight: "#666666",
    success: "#27ae60",
    danger: "#e74c3c",
  },
  fonts: {
    title: "28px Inter, sans-serif", // Reduzido de 32px
    subtitle: "18px Inter, sans-serif", // Reduzido de 20px
    heading: "16px Inter, sans-serif", // Reduzido de 18px
    body: "13px Inter, sans-serif", // Reduzido de 14px
    caption: "11px Inter, sans-serif", // Reduzido de 12px
  },
};

// ✅ FUNÇÃO PRINCIPAL DE EXPORTAÇÃO PROFISSIONAL
export async function criarBotaoExportacaoMataMata(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-MATA-MATA] Configuração inválida:", config);
    return;
  }

  const {
    containerId,
    fase = "Mata-Mata",
    confrontos = [],
    isPending = false,
    rodadaPontos = "",
    edicao = "Mata-Mata",
  } = config;

  if (!containerId) {
    console.error("[EXPORT-MATA-MATA] containerId é obrigatório");
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[EXPORT-MATA-MATA] Container ${containerId} não encontrado`);
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(".btn-export-mata-mata");
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar botão com design profissional
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-export-mata-mata";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
      <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
    </svg>
    Exportar Mata-Mata
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
    btn.style.transform = "translateY(-2px)";
    btn.style.boxShadow = "0 6px 20px rgba(46, 139, 87, 0.4)";
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0)";
    btn.style.boxShadow = "0 4px 12px rgba(46, 139, 87, 0.3)";
  };

  btn.onclick = async () => {
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
      <div style="width: 16px; height: 16px; margin-right: 8px;">
        <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      Gerando Imagem...
    `;
    btn.disabled = true;

    try {
      await exportarMataMataComoImagemProfissional({
        fase,
        edicao,
        confrontos,
        isPending,
        rodadaPontos,
      });
    } catch (error) {
      console.error("[EXPORT-MATA-MATA] Erro na exportação:", error);
      mostrarNotificacao("Erro ao gerar imagem. Tente novamente.", "error");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // Adicionar animação CSS
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  btnContainer.appendChild(btn);
  container.insertBefore(btnContainer, container.firstChild);
}

// ✅ FUNÇÃO DE EXPORTAÇÃO PROFISSIONAL
async function exportarMataMataComoImagemProfissional(config) {
  const { fase, edicao, confrontos, isPending, rodadaPontos } = config;

  console.log("[EXPORT-MATA-MATA] 🎨 Criando layout profissional...");

  // Criar container de exportação invisível
  const exportContainer = document.createElement("div");
  exportContainer.id = "mata-mata-export-container";
  exportContainer.style.cssText = `
    position: absolute;
    top: -99999px;
    left: -99999px;
    width: ${TEMPLATE_CONFIG.width}px;
    background: ${TEMPLATE_CONFIG.colors.background};
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.3;
    color: ${TEMPLATE_CONFIG.colors.text};
  `;

  // Construir layout profissional
  exportContainer.innerHTML = criarLayoutMataMata({
    fase,
    edicao,
    confrontos,
    isPending,
    rodadaPontos,
  });

  document.body.appendChild(exportContainer);

  try {
    // Aguardar renderização
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Aguardar carregamento de imagens
    const imagens = exportContainer.querySelectorAll("img");
    if (imagens.length > 0) {
      await Promise.all(
        Array.from(imagens).map((img) => {
          return new Promise((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 2000);
            }
          });
        }),
      );
    }

    console.log("[EXPORT-MATA-MATA] 📸 Capturando imagem...");

    // Capturar com html2canvas
    const canvas = await html2canvas(exportContainer, {
      allowTaint: true,
      useCORS: true,
      scale: 3, // Aumentado de 2 para 3
      logging: false,
      width: TEMPLATE_CONFIG.width,
      height: exportContainer.scrollHeight,
      backgroundColor: TEMPLATE_CONFIG.colors.background,
      imageTimeout: 15000,
      removeContainer: true,
      letterRendering: true,
      foreignObjectRendering: true,
    });

    // Gerar nome do arquivo
    const timestamp = new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const nomeArquivo = `mata-mata-${fase.toLowerCase()}-${timestamp}`;

    // Download da imagem
    const link = document.createElement("a");
    link.download = `${nomeArquivo}.png`;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();

    console.log("[EXPORT-MATA-MATA] ✅ Imagem exportada com sucesso");
    mostrarNotificacao("Imagem exportada com sucesso!", "success");
  } finally {
    // Remover container temporário
    document.body.removeChild(exportContainer);
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT PROFISSIONAL
function criarLayoutMataMata({
  fase,
  edicao,
  confrontos,
  isPending,
  rodadaPontos,
}) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!-- HEADER PROFISSIONAL COM LOGO GARANTIDA -->
    <div style="
      background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary} 0%, ${TEMPLATE_CONFIG.colors.secondary} 100%);
      color: white;
      padding: ${TEMPLATE_CONFIG.padding}px;
      text-align: center;
      position: relative;
      overflow: hidden;
      min-height: ${TEMPLATE_CONFIG.headerHeight}px;
    ">
      <!-- Padrão geométrico de fundo -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"50\" height=\"50\" viewBox=\"0 0 50 50\"><g fill=\"none\" fill-rule=\"evenodd\"><g fill=\"%23ffffff\" fill-opacity=\"0.08\"><polygon points=\"30 28 5 28 5 3 30 3\"/></g></g></svg>');
        opacity: 0.6;
      "></div>

      <!-- Conteúdo do header -->
      <div style="position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 16px;">
        <!-- Logo SuperCartola - SEMPRE PRESENTE -->
        <div style="flex-shrink: 0;">
          <img src="/img/logo-supercartola.png" 
               style="height: 42px; width: auto; filter: brightness(1.1);" 
               alt="SuperCartola"
               onerror="this.outerHTML='<div style=\\'width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font:bold 14px Inter;\\'>SC</div>'">
        </div>

        <div style="text-align: center;">
          <h1 style="
            font: 700 ${TEMPLATE_CONFIG.fonts.title} Inter, sans-serif;
            margin: 0 0 3px 0;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">SuperCartola 2025</h1>

          <h2 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.subtitle} Inter, sans-serif;
            margin: 0 0 6px 0;
            opacity: 0.95;
          ">${edicao}</h2>

          <div style="
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 4px 16px;
            display: inline-block;
            border: 1px solid rgba(255, 255, 255, 0.3);
          ">
            <span style="font: 600 13px Inter, sans-serif; letter-spacing: 0.5px;">
              ${fase.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      ${
        rodadaPontos
          ? `
        <p style="
          font: 500 11px Inter, sans-serif;
          margin: 8px 0 0 0;
          opacity: 0.9;
        ">${rodadaPontos}</p>
      `
          : ""
      }
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div style="padding: ${TEMPLATE_CONFIG.padding}px;">

      ${
        isPending
          ? `
        <!-- AVISO DE RODADA PENDENTE -->
        <div style="
          background: linear-gradient(45deg, #fff3cd, #ffeaa7);
          border: 1px solid #ffc107;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 16px;
          text-align: center;
        ">
          <div style="font-size: 16px; margin-bottom: 2px;">⏰</div>
          <h3 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.heading} Inter, sans-serif;
            margin: 0 0 2px 0;
            color: #856404;
          </div>
      `
          : ""
      }

      <!-- TABELA DE CONFRONTOS COMPACTA -->
      <div style="
        background: ${TEMPLATE_CONFIG.colors.surface};
        border-radius: 10px;
        padding: 18px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        border: 1px solid ${TEMPLATE_CONFIG.colors.border};
      ">
        <h3 style="
          font: 600 ${TEMPLATE_CONFIG.fonts.heading} Inter, sans-serif;
          margin: 0 0 12px 0;
          text-align: center;
          color: ${TEMPLATE_CONFIG.colors.primary};
        ">Confrontos da ${fase.toUpperCase()}</h3>

        <div style="display: grid; gap: ${TEMPLATE_CONFIG.cardSpacing}px;">
          ${confrontos.map((confronto) => criarCardConfronto(confronto, isPending)).join("")}
        </div>
      </div>

      <!-- INFORMAÇÕES ADICIONAIS COMPACTAS -->
      <div style="
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      ">
        <!-- Card de Valores -->
        <div style="
          background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.success}, #2ecc71);
          color: white;
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        ">
          <h4 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.heading} Inter, sans-serif;
            margin: 0 0 4px 0;
          ">💰 Valores</h4>
          <p style="font: ${TEMPLATE_CONFIG.fonts.body} Inter, sans-serif; margin: 0; line-height: 1.3;">
            Vitória: <strong>R$ 10,00</strong><br>
            Derrota: <strong>R$ -10,00</strong>
          </p>
        </div>

        <!-- Card de Participantes -->
        <div style="
          background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary}, ${TEMPLATE_CONFIG.colors.secondary});
          color: white;
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        ">
          <h4 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.heading} Inter, sans-serif;
            margin: 0 0 4px 0;
          ">👥 Participantes</h4>
          <p style="font: ${TEMPLATE_CONFIG.fonts.body} Inter, sans-serif; margin: 0; line-height: 1.3;">
            <strong>${confrontos.length * 2}</strong> times<br>
            <strong>${confrontos.length}</strong> jogos
          </p>
        </div>
      </div>
    </div>

    <!-- FOOTER PROFISSIONAL COMPACTO -->
    <div style="
      background: ${TEMPLATE_CONFIG.colors.surface};
      border-top: 1px solid ${TEMPLATE_CONFIG.colors.border};
      padding: 12px ${TEMPLATE_CONFIG.padding}px;
      text-align: center;
      margin-top: 16px;
    ">
      <p style="
        font: ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
        margin: 0;
        color: ${TEMPLATE_CONFIG.colors.textLight};
        line-height: 1.2;
      ">
        Gerado em ${dataFormatada} • SuperCartola Manager v2.2.0<br>
        Sistema de Gerenciamento de Ligas do Cartola FC
      </p>
    </div>
  `;
}

// ✅ FUNÇÃO PARA CRIAR CARD DE CONFRONTO ULTRA-COMPACTO
function criarCardConfronto(confronto, isPending) {
  const { jogo, timeA, timeB } = confronto;

  // Determinar vencedor e valores financeiros
  let statusA = "",
    statusB = "",
    corA = TEMPLATE_CONFIG.colors.text,
    corB = TEMPLATE_CONFIG.colors.text;
  let valorA = "",
    valorB = "";

  if (!isPending && timeA.pontos !== null && timeB.pontos !== null) {
    if (timeA.pontos > timeB.pontos) {
      statusA = "👑";
      corA = TEMPLATE_CONFIG.colors.success;
      corB = TEMPLATE_CONFIG.colors.textLight;
      valorA = "+R$ 10,00";
      valorB = "-R$ 10,00";
    } else if (timeB.pontos > timeA.pontos) {
      statusB = "👑";
      corB = TEMPLATE_CONFIG.colors.success;
      corA = TEMPLATE_CONFIG.colors.textLight;
      valorB = "+R$ 10,00";
      valorA = "-R$ 10,00";
    } else {
      // Em caso de empate, usar critério de desempate
      if (timeA.rankR2 < timeB.rankR2) {
        statusA = "👑";
        corA = TEMPLATE_CONFIG.colors.success;
        corB = TEMPLATE_CONFIG.colors.textLight;
        valorA = "+R$ 10,00";
        valorB = "-R$ 10,00";
      } else {
        statusB = "👑";
        corB = TEMPLATE_CONFIG.colors.success;
        corA = TEMPLATE_CONFIG.colors.textLight;
        valorB = "+R$ 10,00";
        valorA = "-R$ 10,00";
      }
    }
  }

  const formatarPontos = (pontos) => {
    if (isPending || pontos === null) return "?";
    return typeof pontos === "number"
      ? pontos.toFixed(2).replace(".", ",")
      : "-";
  };

  return `
    <div style="
      background: white;
      border-radius: 6px;
      padding: 10px;
      border: 1px solid ${TEMPLATE_CONFIG.colors.border};
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    ">
      <!-- Header do Jogo Compacto -->
      <div style="
        text-align: center;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 2px solid ${TEMPLATE_CONFIG.colors.primary};
      ">
        <span style="
          background: ${TEMPLATE_CONFIG.colors.primary};
          color: white;
          padding: 2px 10px;
          border-radius: 12px;
          font: 600 11px Inter, sans-serif;
        ">JOGO ${jogo}</span>
      </div>

      <!-- Confronto Ultra-Compacto -->
      <div style="
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 8px;
      ">
        <!-- Time A -->
        <div style="text-align: center; color: ${corA};">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
            <img src="/escudos/${timeA.clube_id || "placeholder"}.png" 
                 style="width: 20px; height: 20px; border-radius: 50%; margin-right: 4px;" 
                 onerror="this.style.display='none'">
            <span style="font-size: 14px;">${statusA}</span>
          </div>
          <h4 style="
            font: 600 11px Inter, sans-serif;
            margin: 0 0 1px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            line-height: 1.1;
          ">${timeA.nome_time || "Time A"}</h4>
          <p style="
            font: ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
            margin: 0 0 4px 0;
            color: ${TEMPLATE_CONFIG.colors.textLight};
            line-height: 1.1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${timeA.nome_cartoleiro || timeA.nome_cartola || "—"}</p>
          <div style="
            background: ${corA === TEMPLATE_CONFIG.colors.success ? TEMPLATE_CONFIG.colors.success : TEMPLATE_CONFIG.colors.surface};
            color: ${corA === TEMPLATE_CONFIG.colors.success ? "white" : TEMPLATE_CONFIG.colors.text};
            padding: 4px 6px;
            border-radius: 4px;
            font: 600 12px Inter, sans-serif;
            margin-bottom: 3px;
          ">${formatarPontos(timeA.pontos)}</div>
          ${
            valorA
              ? `
            <div style="
              font: 600 9px Inter, sans-serif;
              color: ${valorA.includes("+") ? TEMPLATE_CONFIG.colors.success : TEMPLATE_CONFIG.colors.danger};
              background: ${valorA.includes("+") ? "#d4edda" : "#f8d7da"};
              padding: 1px 4px;
              border-radius: 3px;
              display: inline-block;
              white-space: nowrap;
            ">${valorA}</div>
          `
              : ""
          }
        </div>

        <!-- VS -->
        <div style="
          text-align: center;
          font: 700 14px Inter, sans-serif;
          color: ${TEMPLATE_CONFIG.colors.primary};
        ">VS</div>

        <!-- Time B -->
        <div style="text-align: center; color: ${corB};">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
            <span style="font-size: 14px;">${statusB}</span>
            <img src="/escudos/${timeB.clube_id || "placeholder"}.png" 
                 style="width: 20px; height: 20px; border-radius: 50%; margin-left: 4px;" 
                 onerror="this.style.display='none'">
          </div>
          <h4 style="
            font: 600 11px Inter, sans-serif;
            margin: 0 0 1px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            line-height: 1.1;
          ">${timeB.nome_time || "Time B"}</h4>
          <p style="
            font: ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
            margin: 0 0 4px 0;
            color: ${TEMPLATE_CONFIG.colors.textLight};
            line-height: 1.1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${timeB.nome_cartoleiro || timeB.nome_cartola || "—"}</p>
          <div style="
            background: ${corB === TEMPLATE_CONFIG.colors.success ? TEMPLATE_CONFIG.colors.success : TEMPLATE_CONFIG.colors.surface};
            color: ${corB === TEMPLATE_CONFIG.colors.success ? "white" : TEMPLATE_CONFIG.colors.text};
            padding: 4px 6px;
            border-radius: 4px;
            font: 600 12px Inter, sans-serif;
            margin-bottom: 3px;
          ">${formatarPontos(timeB.pontos)}</div>
          ${
            valorB
              ? `
            <div style="
              font: 600 9px Inter, sans-serif;
              color: ${valorB.includes("+") ? TEMPLATE_CONFIG.colors.success : TEMPLATE_CONFIG.colors.danger};
              background: ${valorB.includes("+") ? "#d4edda" : "#f8d7da"};
              padding: 1px 4px;
              border-radius: 3px;
              display: inline-block;
              white-space: nowrap;
            ">${valorB}</div>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

// ✅ FUNÇÃO PARA MOSTRAR NOTIFICAÇÕES
function mostrarNotificacao(mensagem, tipo = "info") {
  const cores = {
    success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
    error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
    info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
  };

  const cor = cores[tipo] || cores.info;

  const notificacao = document.createElement("div");
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
    notificacao.style.transform = "translateX(0)";
  });

  // Remover após 3 segundos
  setTimeout(() => {
    notificacao.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notificacao.parentNode) {
        document.body.removeChild(notificacao);
      }
    }, 300);
  }, 3000);
}

console.log(
  "[EXPORT-MATA-MATA] ✅ Sistema de exportação profissional carregado",
);
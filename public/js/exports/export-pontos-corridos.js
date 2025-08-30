// ✅ SISTEMA DE EXPORTAÇÃO PROFISSIONAL - PONTOS CORRIDOS
// Padrão UX modular, vertical, compacto e bonito

// ✅ CONFIGURAÇÃO DO TEMPLATE PROFISSIONAL - CORES DO SISTEMA ATUALIZADAS
const TEMPLATE_CONFIG = {
  width: 900,
  padding: 24,
  headerHeight: 85,
  footerHeight: 40,
  cardSpacing: 8,
  colors: {
    primary: "#FF4500",        // --laranja do sistema
    secondary: "#E8472B",      // --laranja-dark do sistema
    accent: "#FFA726",         // --laranja-light do sistema
    background: "#ffffff",
    surface: "#ffffff",
    border: "#e0e0e0",
    text: "#2c2c2c",
    textLight: "#a0a0a0",      // --text-muted do sistema
    success: "#22c55e",        // --success do sistema
    danger: "#ef4444",         // --danger do sistema
  },
  fonts: {
    title: "28px Inter, sans-serif",
    subtitle: "18px Inter, sans-serif",
    heading: "16px Inter, sans-serif",
    body: "13px Inter, sans-serif",
    caption: "11px Inter, sans-serif",
  },
};

// 🔧 CARREGAMENTO DINÂMICO DO HTML2CANVAS (CORREÇÃO CRÍTICA)
async function carregarHtml2Canvas() {
  if (typeof window === "undefined") {
    console.warn("[EXPORT-PONTOS-CORRIDOS] Executando no backend - html2canvas não disponível");
    return null;
  }

  // Verificar se já está disponível
  if (window.html2canvas) {
    return window.html2canvas;
  }

  // Tentar carregar dinamicamente
  console.log("[EXPORT-PONTOS-CORRIDOS] 📦 Carregando html2canvas dinamicamente...");

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.async = true;

    script.onload = () => {
      console.log("[EXPORT-PONTOS-CORRIDOS] ✅ html2canvas carregado com sucesso");
      resolve(window.html2canvas);
    };

    script.onerror = () => {
      console.error("[EXPORT-PONTOS-CORRIDOS] ❌ Erro ao carregar html2canvas");
      reject(new Error('Falha ao carregar html2canvas'));
    };

    document.head.appendChild(script);
  });
}

// Função utilitária para obter dados da liga ativa
function getLigaAtivaInfo() {
  if (typeof window === "undefined") {
    return {
      nome: "SuperCartola 2025",
      logo: "/img/logo-supercartola.png",
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");
  const ligas = {
    "684cb1c8af923da7c7df51de": {
      nome: "SuperCartola 2025",
      logo: "/img/logo-supercartola.png",
    },
    "684d821cf1a7ae16d1f89572": {
      nome: "Cartoleiros Sobral 2025",
      logo: "/img/logo-cartoleirossobral.png",
    },
  };
  return ligas[ligaId] || ligas["684cb1c8af923da7c7df51de"];
}

// ✅ FUNÇÃO PRINCIPAL DE EXPORTAÇÃO PROFISSIONAL - RODADA (CONFRONTOS)
export async function criarBotaoExportacaoPontosCorridosRodada(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-PONTOS-CORRIDOS] Configuração inválida:", config);
    return;
  }

  const {
    containerId,
    jogos = [],
    rodadaLiga = "",
    rodadaCartola = "",
    times = [],
  } = config;

  console.log("[EXPORT-PONTOS-CORRIDOS] 🎯 Criando botão exportação rodada:", {
    containerId,
    jogosCount: jogos.length,
    rodadaLiga,
    rodadaCartola,
  });

  if (!containerId) {
    console.error("[EXPORT-PONTOS-CORRIDOS] containerId é obrigatório");
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-PONTOS-CORRIDOS] Container ${containerId} não encontrado`,
    );
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-pontos-corridos-rodada",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar botão com design profissional seguindo padrões do sistema
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-export-pontos-corridos-rodada";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
      <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
    </svg>
    Exportar Confrontos da Rodada
  `;

  // Aplicando padrões de cores do sistema UX_PATTERNS
  btn.style.cssText = `
    background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary} 0%, ${TEMPLATE_CONFIG.colors.secondary} 100%) !important;
    color: white !important;
    border: none;
    padding: 12px 20px !important;
    border-radius: 8px !important;
    cursor: pointer;
    font: 500 13px Inter, sans-serif !important;
    display: inline-flex;
    align-items: center;
    transition: all 0.3s ease !important;
    box-shadow: 0 4px 15px rgba(255, 69, 0, 0.4) !important;
  `;

  // Efeitos hover seguindo padrões
  btn.onmouseover = () => {
    btn.style.transform = "translateY(-2px)";
    btn.style.boxShadow = "0 8px 25px rgba(255, 69, 0, 0.5) !important";
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0)";
    btn.style.boxShadow = "0 4px 15px rgba(255, 69, 0, 0.4) !important";
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
      await exportarPontosCorridosRodadaComoImagemProfissional({
        jogos,
        rodadaLiga,
        rodadaCartola,
        times,
      });
    } catch (error) {
      console.error("[EXPORT-PONTOS-CORRIDOS] Erro na exportação:", error);
      mostrarNotificacao("Erro ao gerar imagem. Tente novamente.", "error");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // Adicionar animação CSS se não existir
  if (!document.getElementById('export-animations')) {
    const style = document.createElement("style");
    style.id = 'export-animations';
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

// ✅ FUNÇÃO PRINCIPAL DE EXPORTAÇÃO PROFISSIONAL - CLASSIFICAÇÃO
export async function criarBotaoExportacaoPontosCorridosClassificacao(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-PONTOS-CORRIDOS] Configuração inválida:", config);
    return;
  }

  const {
    containerId,
    times = [],
    rodadaLiga = "",
    rodadaCartola = "",
  } = config;

  console.log(
    "[EXPORT-PONTOS-CORRIDOS] 🎯 Criando botão exportação classificação:",
    {
      containerId,
      timesCount: times.length,
      rodadaLiga,
      rodadaCartola,
    },
  );

  if (!containerId) {
    console.error("[EXPORT-PONTOS-CORRIDOS] containerId é obrigatório");
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-PONTOS-CORRIDOS] Container ${containerId} não encontrado`,
    );
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-pontos-corridos-classificacao",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar botão com design profissional
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-export-pontos-corridos-classificacao";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
      <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
    </svg>
    Exportar Classificação
  `;

  btn.style.cssText = `
    background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary} 0%, ${TEMPLATE_CONFIG.colors.secondary} 100%) !important;
    color: white !important;
    border: none;
    padding: 12px 20px !important;
    border-radius: 8px !important;
    cursor: pointer;
    font: 500 13px Inter, sans-serif !important;
    display: inline-flex;
    align-items: center;
    transition: all 0.3s ease !important;
    box-shadow: 0 4px 15px rgba(255, 69, 0, 0.4) !important;
  `;

  // Efeitos hover
  btn.onmouseover = () => {
    btn.style.transform = "translateY(-2px)";
    btn.style.boxShadow = "0 8px 25px rgba(255, 69, 0, 0.5) !important";
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0)";
    btn.style.boxShadow = "0 4px 15px rgba(255, 69, 0, 0.4) !important";
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
      await exportarPontosCorridosClassificacaoComoImagem(
        times,
        rodadaLiga,
        rodadaCartola,
      );
    } catch (error) {
      console.error("[EXPORT-PONTOS-CORRIDOS] Erro na exportação:", error);
      mostrarNotificacao("Erro ao gerar imagem. Tente novamente.", "error");
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

// ✅ FUNÇÃO DE EXPORTAÇÃO PROFISSIONAL - RODADA (CONFRONTOS) - CORRIGIDA
async function exportarPontosCorridosRodadaComoImagemProfissional(config) {
  const { jogos, rodadaLiga, rodadaCartola, times } = config;

  console.log(
    "[EXPORT-PONTOS-CORRIDOS] 🎨 Criando layout profissional - Rodada...",
  );

  // Criar container de exportação invisível
  const exportContainer = document.createElement("div");
  exportContainer.id = "pontos-corridos-rodada-export-container";
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
  exportContainer.innerHTML = criarLayoutPontosCorridosRodada({
    jogos,
    rodadaLiga,
    rodadaCartola,
    times,
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

    console.log("[EXPORT-PONTOS-CORRIDOS] 📸 Capturando imagem...");

    // 🔧 CORREÇÃO CRÍTICA: Carregar html2canvas dinamicamente
    const html2canvas = await carregarHtml2Canvas();

    if (!html2canvas) {
      throw new Error("html2canvas não pôde ser carregado");
    }

    // Capturar com html2canvas
    const canvas = await html2canvas(exportContainer, {
      allowTaint: true,
      useCORS: true,
      scale: 2,
      logging: false,
      width: TEMPLATE_CONFIG.width,
      height: exportContainer.scrollHeight,
      backgroundColor: TEMPLATE_CONFIG.colors.background,
    });

    // Gerar nome do arquivo
    const timestamp = new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const nomeArquivo = `pontos-corridos-rodada-${rodadaLiga}-${timestamp}`;

    // Download da imagem
    const link = document.createElement("a");
    link.download = `${nomeArquivo}.png`;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();

    console.log("[EXPORT-PONTOS-CORRIDOS] ✅ Imagem exportada com sucesso");
    mostrarNotificacao("Imagem exportada com sucesso!", "success");
  } catch (error) {
    console.error("[EXPORT-PONTOS-CORRIDOS] ❌ Erro na exportação:", error);
    throw error;
  } finally {
    // Remover container temporário
    if (exportContainer.parentNode) {
      document.body.removeChild(exportContainer);
    }
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT PROFISSIONAL - RODADA (CONFRONTOS)
function criarLayoutPontosCorridosRodada({
  jogos,
  rodadaLiga,
  rodadaCartola,
  times,
}) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const titulo = `Liga Pontos Corridos - ${rodadaLiga}ª Rodada`;
  const subtitulo = `Rodada ${rodadaCartola}ª do Brasileirão`;

  const goleadas = jogos.filter(
    (j) => j.timeA?.pontosGoleada > 0 || j.timeB?.pontosGoleada > 0,
  ).length;

  return `
    <!-- HEADER PROFISSIONAL COM CORES DO SISTEMA -->
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
            font: 700 ${TEMPLATE_CONFIG.fonts.title};
            margin: 0 0 3px 0;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">SuperCartola 2025</h1>

          <h2 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.subtitle};
            margin: 0 0 6px 0;
            opacity: 0.95;
          ">⚽ ${titulo}</h2>

          <div style="
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 4px 16px;
            display: inline-block;
            border: 1px solid rgba(255, 255, 255, 0.3);
          ">
            <span style="font: 600 13px Inter, sans-serif; letter-spacing: 0.5px;">
              ${subtitulo.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div style="padding: ${TEMPLATE_CONFIG.padding}px;">

      <!-- TABELA DE CONFRONTOS -->
      <div style="
        background: ${TEMPLATE_CONFIG.colors.surface};
        border-radius: 10px;
        padding: 18px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        border: 1px solid ${TEMPLATE_CONFIG.colors.border};
      ">
        <h3 style="
          font: 600 ${TEMPLATE_CONFIG.fonts.heading};
          margin: 0 0 12px 0;
          text-align: center;
          color: ${TEMPLATE_CONFIG.colors.primary};
        ">⚔️ Confrontos da ${rodadaLiga}ª Rodada</h3>

        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
              <tr style="background: ${TEMPLATE_CONFIG.colors.primary}; color: white;">
                <th style="width: 40px; text-align: center; padding: 8px 5px; font: 600 11px Inter, sans-serif; letter-spacing: 0.3px;">#</th>
                <th style="text-align: left; padding: 8px 5px; font: 600 11px Inter, sans-serif; letter-spacing: 0.3px;">TIME 1</th>
                <th style="width: 80px; text-align: center; padding: 8px 5px; font: 600 11px Inter, sans-serif; letter-spacing: 0.3px;">PTS 1</th>
                <th style="width: 40px; text-align: center; padding: 8px 5px; font: 600 11px Inter, sans-serif; letter-spacing: 0.3px;">X</th>
                <th style="width: 80px; text-align: center; padding: 8px 5px; font: 600 11px Inter, sans-serif; letter-spacing: 0.3px;">PTS 2</th>
                <th style="text-align: left; padding: 8px 5px; font: 600 11px Inter, sans-serif; letter-spacing: 0.3px;">TIME 2</th>
                <th style="width: 60px; text-align: center; padding: 8px 5px; font: 600 11px Inter, sans-serif; letter-spacing: 0.3px;">DIF</th>
              </tr>
            </thead>
            <tbody>
              ${jogos
                .map((jogo, i) => {
                  const timeA = jogo.timeA || {};
                  const timeB = jogo.timeB || {};
                  const temPontuacao =
                    timeA.pontos !== undefined &&
                    timeA.pontos !== null &&
                    timeB.pontos !== undefined &&
                    timeB.pontos !== null;

                  let classPtsA = "font-weight: 600;";
                  let classPtsB = "font-weight: 600;";
                  let goleadaA = false;
                  let goleadaB = false;

                  if (temPontuacao) {
                    if (timeA.pontos > timeB.pontos) {
                      classPtsA += ` color: ${TEMPLATE_CONFIG.colors.success};`;
                      classPtsB += ` color: ${TEMPLATE_CONFIG.colors.danger};`;
                    } else if (timeB.pontos > timeA.pontos) {
                      classPtsB += ` color: ${TEMPLATE_CONFIG.colors.success};`;
                      classPtsA += ` color: ${TEMPLATE_CONFIG.colors.danger};`;
                    }
                    goleadaA = timeA.pontosGoleada > 0;
                    goleadaB = timeB.pontosGoleada > 0;
                  }

                  const dif =
                    jogo.diferenca !== null
                      ? jogo.diferenca.toFixed(2).replace(".", ",")
                      : "-";

                  const pontosA = temPontuacao
                    ? `${timeA.pontos.toFixed(2).replace(".", ",")}${goleadaA ? " 🔥" : ""}`
                    : "-";

                  const pontosB = temPontuacao
                    ? `${timeB.pontos.toFixed(2).replace(".", ",")}${goleadaB ? " 🔥" : ""}`
                    : "-";

                  const financeiroA =
                    temPontuacao && timeA.financeiro !== 0
                      ? `<span style="font-size: 0.8em; color: ${timeA.financeiro > 0 ? TEMPLATE_CONFIG.colors.success : TEMPLATE_CONFIG.colors.danger};">(${timeA.financeiro > 0 ? "+" : ""}R$ ${timeA.financeiro.toFixed(2).replace(".", ",")})</span>`
                      : "";

                  const financeiroB =
                    temPontuacao && timeB.financeiro !== 0
                      ? `<span style="font-size: 0.8em; color: ${timeB.financeiro > 0 ? TEMPLATE_CONFIG.colors.success : TEMPLATE_CONFIG.colors.danger};">(${timeB.financeiro > 0 ? "+" : ""}R$ ${timeB.financeiro.toFixed(2).replace(".", ",")})</span>`
                      : "";

                  const linhaGoleadaClass =
                    goleadaA || goleadaB ? "background-color: #fff3e0;" : "";
                  const rowBg = i % 2 === 0 ? "background: #f8f9fa;" : "";

                  return `
                    <tr style="border-bottom: 1px solid ${TEMPLATE_CONFIG.colors.border}; ${linhaGoleadaClass || rowBg}">
                      <td style="text-align:center; padding: 7px 5px; font-weight: 600;">${i + 1}</td>
                      <td style="text-align:left; padding: 7px 5px;">
                        <div style="display:flex; align-items:center; gap:5px;">
                          ${timeA.clube_id ? `<img src="/escudos/${timeA.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : ""}
                          <div>
                            <div style="font-weight: 500; font-size: 11px;">${timeA.nome_time || "N/D"}</div>
                            <div style="font-size: 9px; color: ${TEMPLATE_CONFIG.colors.textLight};">${timeA.nome_cartola || "N/D"} ${financeiroA}</div>
                          </div>
                        </div>
                      </td>
                      <td style="text-align:center; padding: 7px 5px; ${classPtsA}">${pontosA}</td>
                      <td style="text-align:center; padding: 7px 5px; font-weight: 700; color: ${TEMPLATE_CONFIG.colors.textLight};">X</td>
                      <td style="text-align:center; padding: 7px 5px; ${classPtsB}">${pontosB}</td>
                      <td style="text-align:left; padding: 7px 5px;">
                        <div style="display:flex; align-items:center; gap:5px;">
                          ${timeB.clube_id ? `<img src="/escudos/${timeB.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : ""}
                          <div>
                            <div style="font-weight: 500; font-size: 11px;">${timeB.nome_time || "N/D"}</div>
                            <div style="font-size: 9px; color: ${TEMPLATE_CONFIG.colors.textLight};">${timeB.nome_cartola || "N/D"} ${financeiroB}</div>
                          </div>
                        </div>
                      </td>
                      <td style="text-align:center; padding: 7px 5px; font-weight: 600; color: ${jogo.diferenca > 0 ? TEMPLATE_CONFIG.colors.success : jogo.diferenca < 0 ? TEMPLATE_CONFIG.colors.danger : TEMPLATE_CONFIG.colors.textLight};">${dif}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- INFORMAÇÕES ADICIONAIS -->
      <div style="
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
      ">
        <!-- Total de Jogos -->
        <div style="
          background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.success}, #2ecc71);
          color: white;
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        ">
          <h4 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.caption};
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">⚔️ Confrontos</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${jogos.length} jogos
          </p>
        </div>

        <!-- Goleadas -->
        <div style="
          background: linear-gradient(135deg, #f39c12, #e67e22);
          color: white;
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        ">
          <h4 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.caption};
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">🔥 Goleadas</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${goleadas} times
          </p>
        </div>

        <!-- Rodada Info -->
        <div style="
          background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary}, ${TEMPLATE_CONFIG.colors.secondary});
          color: white;
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        ">
          <h4 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.caption};
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">📅 Rodada</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${rodadaLiga}ª Liga
          </p>
        </div>
      </div>

      <!-- LEGENDA -->
      <div style="
        margin-top: 16px;
        background: ${TEMPLATE_CONFIG.colors.surface};
        border: 1px solid ${TEMPLATE_CONFIG.colors.border};
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      ">
        <p style="
          font: 500 11px Inter, sans-serif;
          margin: 0;
          color: ${TEMPLATE_CONFIG.colors.textLight};
          line-height: 1.4;
        ">
          🔥 <strong>Goleada</strong>: 50+ pontos | 💰 <strong>Valores</strong>: Impacto financeiro por confronto | 📊 <strong>Dif</strong>: Diferença de pontos
        </p>
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
        font: ${TEMPLATE_CONFIG.fonts.caption};
        margin: 0;
        color: ${TEMPLATE_CONFIG.colors.textLight};
        line-height: 1.2;
      ">
        Gerado em ${dataFormatada} • SuperCartola Manager v2.4.2<br>
        Sistema de Gerenciamento de Ligas do Cartola FC
      </p>
    </div>
  `;
}

// ✅ FUNÇÃO DE EXPORTAÇÃO PROFISSIONAL - CLASSIFICAÇÃO - CORRIGIDA
export async function exportarPontosCorridosClassificacaoComoImagem(
  times,
  rodadaLiga,
  rodadaCartola,
) {
  if (typeof window === "undefined") {
    console.log(
      "[EXPORT-PONTOS-CORRIDOS] exportarPontosCorridosClassificacaoComoImagem: executando no backend - ignorando",
    );
    return;
  }

  console.log(
    "[EXPORT-PONTOS-CORRIDOS] 🎨 Criando layout profissional - Classificação...",
  );

  // Criar container de exportação invisível
  const exportContainer = document.createElement("div");
  exportContainer.id = "pontos-corridos-classificacao-export-container";
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

  // Construir layout profissional da classificação
  exportContainer.innerHTML = criarLayoutPontosCorridosClassificacao({
    times,
    rodadaLiga,
    rodadaCartola,
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

    console.log("[EXPORT-PONTOS-CORRIDOS] 📸 Capturando imagem...");

    // 🔧 CORREÇÃO CRÍTICA: Carregar html2canvas dinamicamente
    const html2canvas = await carregarHtml2Canvas();

    if (!html2canvas) {
      throw new Error("html2canvas não pôde ser carregado");
    }

    // Capturar com html2canvas
    const canvas = await html2canvas(exportContainer, {
      allowTaint: true,
      useCORS: true,
      scale: 2,
      logging: false,
      width: TEMPLATE_CONFIG.width,
      height: exportContainer.scrollHeight,
      backgroundColor: TEMPLATE_CONFIG.colors.background,
    });

    // Gerar nome do arquivo
    const timestamp = new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const nomeArquivo = `pontos-corridos-classificacao-${rodadaLiga}-${timestamp}`;

    // Download da imagem
    const link = document.createElement("a");
    link.download = `${nomeArquivo}.png`;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();

    console.log("[EXPORT-PONTOS-CORRIDOS] ✅ Imagem exportada com sucesso");
    mostrarNotificacao("Classificação exportada com sucesso!", "success");
  } finally {
    // Remover container temporário
    if (exportContainer.parentNode) {
      document.body.removeChild(exportContainer);
    }
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT PROFISSIONAL - CLASSIFICAÇÃO
function criarLayoutPontosCorridosClassificacao({
  times,
  rodadaLiga,
  rodadaCartola,
}) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const titulo = `Liga Pontos Corridos - Classificação`;
  const subtitulo = `Após ${rodadaLiga}ª rodada (Rodada ${rodadaCartola}ª do Brasileirão)`;

  return `
    <!-- HEADER PROFISSIONAL -->
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
        <!-- Logo SuperCartola -->
        <div style="flex-shrink: 0;">
          <img src="/img/logo-supercartola.png" 
               style="height: 42px; width: auto; filter: brightness(1.1);" 
               alt="SuperCartola"
               onerror="this.outerHTML='<div style=\\'width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font:bold 14px Inter;\\'>SC</div>'">
        </div>

        <div style="text-align: center;">
          <h1 style="
            font: 700 ${TEMPLATE_CONFIG.fonts.title};
            margin: 0 0 3px 0;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">SuperCartola 2025</h1>

          <h2 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.subtitle};
            margin: 0 0 6px 0;
            opacity: 0.95;
          ">🏆 ${titulo}</h2>

          <div style="
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 4px 16px;
            display: inline-block;
            border: 1px solid rgba(255, 255, 255, 0.3);
          ">
            <span style="font: 600 13px Inter, sans-serif; letter-spacing: 0.5px;">
              ${subtitulo.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div style="padding: ${TEMPLATE_CONFIG.padding}px;">

      <!-- TABELA DE CLASSIFICAÇÃO -->
      <div style="
        background: ${TEMPLATE_CONFIG.colors.surface};
        border-radius: 10px;
        padding: 18px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        border: 1px solid ${TEMPLATE_CONFIG.colors.border};
      ">
        <h3 style="
          font: 600 ${TEMPLATE_CONFIG.fonts.heading};
          margin: 0 0 12px 0;
          text-align: center;
          color: ${TEMPLATE_CONFIG.colors.primary};
        ">🏆 Classificação Geral</h3>

        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
              <tr style="background: ${TEMPLATE_CONFIG.colors.primary}; color: white;">
                <th style="width: 30px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">Pos</th>
                <th style="width: 30px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">❤️</th>
                <th style="text-align: left; padding: 6px 3px; font: 600 10px Inter, sans-serif;">Time</th>
                <th style="text-align: left; padding: 6px 3px; font: 600 10px Inter, sans-serif;">Cartoleiro</th>
                <th style="width: 40px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif; color: #ffd700;">Pts</th>
                <th style="width: 30px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">J</th>
                <th style="width: 30px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">V</th>
                <th style="width: 30px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">E</th>
                <th style="width: 30px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">D</th>
                <th style="width: 30px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif; background-color: rgba(255,243,224,0.3);">PG</th>
                <th style="width: 45px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">PP</th>
                <th style="width: 45px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">PC</th>
                <th style="width: 45px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">SP</th>
                <th style="width: 55px; text-align: center; padding: 6px 3px; font: 600 10px Inter, sans-serif;">R$</th>
              </tr>
            </thead>
            <tbody>
              ${(times || [])
                .map((time, index) => {
                  const nomeCartoleiro =
                    time.nome_cartola || time.nome_cartoleiro || "N/D";
                  const nomeTime = time.nome_time || time.nome || "N/D";

                  // Determinar cor da posição - APENAS TOP 3
                  let corPosicao = "#333";
                  let bgPosicao = "transparent";
                  if (index === 0) {
                    // 1º Lugar - Campeão
                    corPosicao = "#fff";
                    bgPosicao = "#FFD700"; // Dourado
                  } else if (index === 1) {
                    // 2º Lugar
                    corPosicao = "#fff";
                    bgPosicao = "#C0C0C0"; // Prata
                  } else if (index === 2) {
                    // 3º Lugar
                    corPosicao = "#fff";
                    bgPosicao = "#CD7F32"; // Bronze
                  }

                  const rowBg = index % 2 === 0 ? "background: #f8f9fa;" : "";

                  // Formatação dos valores financeiros
                  const formatarFinanceiro = (valor) => {
                    if (!valor || valor === 0) return "R$ 0,00";
                    const cor = valor > 0 ? "#198754" : "#dc3545";
                    const valorAbs = Math.abs(valor)
                      .toFixed(2)
                      .replace(".", ",");
                    const prefixo = valor > 0 ? "R$ " : "-R$ ";
                    return `<span style="color: ${cor}; font-weight: 600;">${prefixo}${valorAbs}</span>`;
                  };

                  // Formatação do saldo de pontos
                  const formatarSaldo = (valor) => {
                    if (!valor || valor === 0) return "0,00";
                    const cor =
                      valor > 0 ? "#198754" : valor < 0 ? "#dc3545" : "#333";
                    return `<span style="color: ${cor};">${valor.toFixed(2).replace(".", ",")}</span>`;
                  };

                  return `
                    <tr style="border-bottom: 1px solid ${TEMPLATE_CONFIG.colors.border}; ${rowBg}">
                      <td style="text-align:center; padding: 6px 3px; background: ${bgPosicao}; color: ${corPosicao}; font-weight: bold; font-size: 11px;">${index + 1}</td>
                      <td style="text-align:center; padding: 6px 3px;">
                        ${time.clube_id ? `<img src="/escudos/${time.clube_id}.png" alt="" style="width:18px; height:18px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "—"}
                      </td>
                      <td style="text-align:left; padding: 6px 3px;">
                        <div style="font-weight: 500; font-size: 10px;">${nomeTime}</div>
                      </td>
                      <td style="text-align:left; padding: 6px 3px;">
                        <div style="font-size: 9px; color: ${TEMPLATE_CONFIG.colors.textLight};">${nomeCartoleiro}</div>
                      </td>
                      <td style="text-align:center; padding: 6px 3px; font-weight: bold; font-size: 12px; color: ${TEMPLATE_CONFIG.colors.primary};">${time.pontos || 0}</td>
                      <td style="text-align:center; padding: 6px 3px; font-size: 10px;">${time.jogos || 0}</td>
                      <td style="text-align:center; padding: 6px 3px; color: ${TEMPLATE_CONFIG.colors.success}; font-weight: 600; font-size: 10px;">${time.vitorias || 0}</td>
                      <td style="text-align:center; padding: 6px 3px; color: #ffc107; font-weight: 600; font-size: 10px;">${time.empates || 0}</td>
                      <td style="text-align:center; padding: 6px 3px; color: ${TEMPLATE_CONFIG.colors.danger}; font-weight: 600; font-size: 10px;">${time.derrotas || 0}</td>
                      <td style="text-align:center; padding: 6px 3px; background-color: #fff3e0; font-weight: ${(time.gols_pro || time.pontosGoleada || 0) > 0 ? "bold" : "normal"}; font-size: 10px;">${time.gols_pro || time.pontosGoleada || 0}</td>
                      <td style="text-align:center; padding: 6px 3px; font-size: 9px;">${(time.pontosPro || 0).toFixed(2).replace(".", ",")}</td>
                      <td style="text-align:center; padding: 6px 3px; font-size: 9px;">${(time.pontosContra || 0).toFixed(2).replace(".", ",")}</td>
                      <td style="text-align:center; padding: 6px 3px; font-size: 9px;">${formatarSaldo(time.saldoPontos || 0)}</td>
                      <td style="text-align:center; padding: 6px 3px; font-size: 9px;">${formatarFinanceiro(time.financeiroTotal || 0)}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- LEGENDA -->
      <div style="
        margin-top: 16px;
        background: ${TEMPLATE_CONFIG.colors.surface};
        border: 1px solid ${TEMPLATE_CONFIG.colors.border};
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      ">
        <p style="
          font: 500 11px Inter, sans-serif;
          margin: 0;
          color: ${TEMPLATE_CONFIG.colors.textLight};
          line-height: 1.4;
        ">
          <strong>J</strong>: Jogos | <strong>V</strong>: Vitórias | <strong>E</strong>: Empates | <strong>D</strong>: Derrotas | <strong>Pts</strong>: Pontos | <strong>PG</strong>: Pontos Goleada | <strong>PP</strong>: Pontos Pró | <strong>PC</strong>: Pontos Contra | <strong>SP</strong>: Saldo Pontos | <strong>R$</strong>: Financeiro
        </p>
      </div>
    </div>

    <!-- FOOTER PROFISSIONAL -->
    <div style="
      background: ${TEMPLATE_CONFIG.colors.surface};
      border-top: 1px solid ${TEMPLATE_CONFIG.colors.border};
      padding: 12px ${TEMPLATE_CONFIG.padding}px;
      text-align: center;
      margin-top: 16px;
    ">
      <p style="
        font: ${TEMPLATE_CONFIG.fonts.caption};
        margin: 0;
        color: ${TEMPLATE_CONFIG.colors.textLight};
        line-height: 1.2;
      ">
        Gerado em ${dataFormatada} • SuperCartola Manager v2.4.2<br>
        Sistema de Gerenciamento de Ligas do Cartola FC
      </p>
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

// Função para criar o cabeçalho e container de exportação (compatibilidade)
function criarDivExportacao(titulo, subtitulo = "", maxWidth = "900px") {
  const { nome, logo } = getLigaAtivaInfo();
  const exportDiv = document.createElement("div");
  exportDiv.style = `background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0002; padding: 24px; min-width: 600px; max-width: ${maxWidth}; margin: 0 auto; font-family: 'Roboto', Arial, sans-serif;`;

  exportDiv.innerHTML = `
    <div style="text-align:center; margin-bottom: 18px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
      <div style="display:flex; align-items:center; justify-content:center; gap:10px; font-size: 1.8rem; font-weight: bold; color: #2c3e50;">
        <img src="${logo}" alt="${nome}" style="height:35px; vertical-align:middle; margin-right:5px;"/>
        <span>${nome}</span>
      </div>
      ${titulo ? `<div style="font-size: 1.4rem; font-weight: 600; margin-top: 8px; color: #34495e;">${titulo}</div>` : ""}
      ${subtitulo ? `<div style="font-size: 1.1rem; font-weight: 400; margin-top: 4px; color: #888;">${subtitulo}</div>` : ""}
    </div>
  `;
  return exportDiv;
}

// Função para gerar canvas e download (compatibilidade)
async function gerarCanvasDownload(element, filename) {
  if (typeof window === "undefined") {
    console.log(
      "[EXPORT-PONTOS-CORRIDOS] gerarCanvasDownload: executando no backend - ignorando",
    );
    return;
  }

  try {
    const html2canvas = await carregarHtml2Canvas();

    if (!html2canvas) {
      throw new Error("html2canvas não pôde ser carregado");
    }

    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2.5,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();
  } catch (error) {
    console.error("Erro no html2canvas ou download:", error);
    throw error;
  } finally {
    if (element && element.parentNode === document.body) {
      document.body.removeChild(element);
    }
  }
}

// ✅ MANTER COMPATIBILIDADE COM FUNÇÕES ORIGINAIS

/**
 * Exportação específica para Pontos Corridos Rodada
 */
export async function exportarPontosCorridosRodadaComoImagem(
  jogos,
  rodadaLiga,
  rodadaCartola,
  times,
) {
  if (typeof window === "undefined") {
    console.log(
      "[EXPORT-PONTOS-CORRIDOS] exportarPontosCorridosRodadaComoImagem: executando no backend - ignorando",
    );
    return;
  }

  // Usar nova função profissional
  await exportarPontosCorridosRodadaComoImagemProfissional({
    jogos,
    rodadaLiga,
    rodadaCartola,
    times,
  });
}

/**
 * Exportação específica para Pontos Corridos Histórico
 */
export async function exportarPontosCorridosHistoricoComoImagem(
  times,
  rodadaLiga,
  rodadaCartola,
) {
  if (typeof window === "undefined") {
    console.log(
      "[EXPORT-PONTOS-CORRIDOS] exportarPontosCorridosHistoricoComoImagem: executando no backend - ignorando",
    );
    return;
  }

  const titulo = `Liga Pontos Corridos - Histórico de Pontos`;
  const subtitulo = `Evolução até a ${rodadaLiga}ª rodada (Rodada ${rodadaCartola} do Brasileirão)`;
  const exportDiv = criarDivExportacao(titulo, subtitulo, "1000px");

  // Criar tabela com histórico de pontos
  const maxRodadas = Math.max(
    ...times.map((t) => (t.historico ? t.historico.length : 0)),
  );

  let tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 30px; text-align: center; padding: 6px 4px; border-bottom: 2px solid #dee2e6;">Pos</th>
          <th style="width: 30px; text-align: center; padding: 6px 4px; border-bottom: 2px solid #dee2e6;">❤️</th>
          <th style="text-align: left; padding: 6px 4px; border-bottom: 2px solid #dee2e6;">Time</th>
  `;

  // Adicionar cabeçalhos das rodadas
  for (let r = 1; r <= maxRodadas; r++) {
    tabelaHtml += `<th style="width: 35px; text-align: center; padding: 6px 2px; border-bottom: 2px solid #dee2e6; font-size: 0
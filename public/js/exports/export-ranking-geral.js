// ✅ SISTEMA DE EXPORTAÇÃO PROFISSIONAL - RANKING GERAL
// Padrão UX modular, vertical, compacto e bonito

// ✅ CONFIGURAÇÃO DO TEMPLATE PROFISSIONAL - ALTA QUALIDADE
const TEMPLATE_CONFIG = {
  width: 1000, // ✅ LARGURA AUMENTADA para melhor qualidade
  padding: 24,
  headerHeight: 85,
  footerHeight: 40,
  cardSpacing: 8,
  colors: {
    primary: "#2E8B57",
    secondary: "#228B22",
    accent: "#32CD32",
    background: "#ffffff",
    surface: "#ffffff",
    border: "#e0e0e0",
    text: "#2c2c2c",
    textLight: "#666666",
    success: "#27ae60",
    danger: "#e74c3c",
  },
  fonts: {
    title: "28px Inter, sans-serif",
    subtitle: "18px Inter, sans-serif",
    heading: "16px Inter, sans-serif",
    body: "13px Inter, sans-serif",
    caption: "11px Inter, sans-serif",
  },
};

console.log("[EXPORT-RANKING-GERAL] ✅ Módulo carregado com sucesso");

// ✅ FUNÇÃO PRINCIPAL DE EXPORTAÇÃO PROFISSIONAL - RANKING GERAL
export async function criarBotaoExportacaoRankingGeral(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-RANKING-GERAL] Configuração inválida:", config);
    return;
  }

  const { containerId, rankings = [], rodada = "", tipo = "geral" } = config;

  if (!containerId) {
    console.error("[EXPORT-RANKING-GERAL] containerId é obrigatório");
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-RANKING-GERAL] Container ${containerId} não encontrado`,
    );
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(".btn-export-ranking-geral");
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar botão com design profissional
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-export-ranking-geral";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
      <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
    </svg>
    ${tipo === "geral" ? "Exportar Ranking Geral" : "Exportar Ranking da Rodada"}
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
      await exportarRankingGeralComoImagemProfissional({
        rankings,
        rodada,
        tipo,
      });
    } catch (error) {
      console.error("[EXPORT-RANKING-GERAL] Erro na exportação:", error);
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
async function exportarRankingGeralComoImagemProfissional(config) {
  const { rankings, rodada, tipo } = config;

  console.log("[EXPORT-RANKING-GERAL] 🎨 Criando layout profissional...");

  // Criar container de exportação invisível
  const exportContainer = document.createElement("div");
  exportContainer.id = "ranking-geral-export-container";
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
  exportContainer.innerHTML = criarLayoutRankingGeral({
    rankings,
    rodada,
    tipo,
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

    console.log("[EXPORT-RANKING-GERAL] 📸 Capturando imagem...");

    // Capturar com html2canvas em alta qualidade
    const canvas = await html2canvas(exportContainer, {
      allowTaint: true,
      useCORS: true,
      scale: 3, // ✅ ALTA QUALIDADE: Escala 3x
      logging: false,
      width: TEMPLATE_CONFIG.width,
      height: exportContainer.scrollHeight,
      backgroundColor: TEMPLATE_CONFIG.colors.background,
      pixelRatio: window.devicePixelRatio || 1, // ✅ NOVO: Pixel ratio do dispositivo
      removeContainer: true,
      imageTimeout: 5000,
    });

    // Gerar nome do arquivo
    const timestamp = new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const nomeArquivo =
      tipo === "geral"
        ? `ranking-geral-rodada-${rodada}-${timestamp}`
        : `ranking-rodada-${rodada}-${timestamp}`;

    // Download da imagem em qualidade máxima
    const link = document.createElement("a");
    link.download = `${nomeArquivo}.png`;
    link.href = canvas.toDataURL("image/png", 1.0); // ✅ QUALIDADE MÁXIMA
    link.click();

    console.log("[EXPORT-RANKING-GERAL] ✅ Imagem exportada com sucesso");
    mostrarNotificacao("Imagem exportada com sucesso!", "success");
  } finally {
    // Remover container temporário
    document.body.removeChild(exportContainer);
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT PROFISSIONAL
function criarLayoutRankingGeral({ rankings, rodada, tipo }) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const titulo =
    tipo === "geral" ? "Ranking Geral" : `Ranking da Rodada ${rodada}`;
  const subtitulo =
    tipo === "geral"
      ? `Pontuação até a ${rodada}ª rodada`
      : `Resultados da ${rodada}ª rodada`;

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
          ">${titulo}</h2>

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

      <!-- TABELA DE RANKING -->
      <div style="
        background: ${TEMPLATE_CONFIG.colors.surface};
        border-radius: 10px;
        padding: 18px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        border: 1px solid ${TEMPLATE_CONFIG.colors.border};
      ">
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background: ${TEMPLATE_CONFIG.colors.primary}; color: white;">
                <th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">POS</th>
                <th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">❤️</th>
                <th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">CARTOLEIRO / TIME</th>
                <th style="width: 80px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">PONTOS</th>
                ${
                  tipo === "rodada"
                    ? `
                  <th style="width: 80px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">BANCO</th>
                `
                    : ""
                }
              </tr>
            </thead>
            <tbody>
              ${rankings
                .map((time, index) => {
                  const nomeCartoleiro =
                    time.nome_cartola || time.nome_cartoleiro || "N/D";
                  const nomeTime = time.nome_time || time.nome || "N/D";

                  // Posição com emojis especiais
                  let posContent = "";
                  if (tipo === "rodada") {
                    if (index === 0) {
                      posContent = `<span style="background:#198754; color:#fff; font-weight:bold; border-radius:4px; padding:2px 8px; font-size:0.9em;">MITO</span>`;
                    } else if (
                      index === rankings.length - 1 &&
                      rankings.length > 1
                    ) {
                      posContent = `<span style="background:#dc3545; color:#fff; font-weight:bold; border-radius:4px; padding:2px 8px; font-size:0.9em;">MICO</span>`;
                    } else {
                      posContent = `${index + 1}º`;
                    }
                  } else {
                    posContent =
                      index === 0
                        ? "🏆"
                        : index === 1
                          ? "🥈"
                          : index === 2
                            ? "🥉"
                            : `${index + 1}º`;
                  }

                  // Banco para ranking de rodada
                  let bancoContent = "";
                  if (
                    tipo === "rodada" &&
                    time.banco !== undefined &&
                    time.banco !== null
                  ) {
                    const bancoClass =
                      time.banco >= 0
                        ? TEMPLATE_CONFIG.colors.success
                        : TEMPLATE_CONFIG.colors.danger;
                    const bancoSinal = time.banco >= 0 ? "+" : "-";
                    bancoContent = `
                      <td style="text-align:center; padding: 8px 6px; font: 600 12px Inter, sans-serif; color: ${bancoClass};">
                        ${bancoSinal}R$ ${Math.abs(time.banco).toFixed(2).replace(".", ",")}
                      </td>
                    `;
                  }

                  const rowBg =
                    index === 0 && tipo === "geral"
                      ? "background: #e7f3ff;"
                      : index === 0 && tipo === "rodada"
                        ? "background: #e7f3ff;"
                        : index === rankings.length - 1 &&
                            tipo === "rodada" &&
                            rankings.length > 1
                          ? "background: #ffe7e7;"
                          : index % 2 === 0
                            ? "background: #f8f9fa;"
                            : "";

                  return `
                    <tr style="border-bottom: 1px solid ${TEMPLATE_CONFIG.colors.border}; ${rowBg}">
                      <td style="text-align:center; padding: 8px 6px;">${posContent}</td>
                      <td style="text-align:center; padding: 8px 6px;">
                        ${time.clube_id ? `<img src="/escudos/${time.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee; vertical-align: middle;" onerror="this.style.display='none'"/>` : "—"}
                      </td>
                      <td style="text-align:left; padding: 8px 6px;">
                        <div style="font-weight:600; font-size: 12px;">${nomeCartoleiro}</div>
                        <div style="color:${TEMPLATE_CONFIG.colors.textLight}; font-size:11px; margin-top:1px;">${nomeTime}</div>
                      </td>
                      <td style="text-align:center; padding: 8px 6px; font: 600 14px Inter, sans-serif; color: ${TEMPLATE_CONFIG.colors.primary};">${time.pontos.toFixed(2).replace(".", ",")}</td>
                      ${bancoContent}
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
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      ">
        <!-- Estatísticas -->
        <div style="
          background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.success}, #2ecc71);
          color: white;
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        ">
          <h4 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">📊 Participantes</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${rankings.length} times
          </p>
        </div>

        <!-- Pontuação Média -->
        <div style="
          background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary}, ${TEMPLATE_CONFIG.colors.secondary});
          color: white;
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        ">
          <h4 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">📈 Média</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${(rankings.reduce((acc, t) => acc + t.pontos, 0) / rankings.length).toFixed(2).replace(".", ",")} pts
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
        Gerado em ${dataFormatada} • SuperCartola Manager v2.3.0<br>
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

// ✅ MANTER COMPATIBILIDADE COM FUNÇÕES ORIGINAIS
export async function exportarRankingGeralComoImagem(rankings, rodada) {
  await exportarRankingGeralComoImagemProfissional({
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
  await exportarRankingGeralComoImagemProfissional({
    rankings,
    rodada,
    tipo,
  });
}

console.log(
  "[EXPORT-RANKING-GERAL] ✅ Sistema de exportação profissional carregado",
);

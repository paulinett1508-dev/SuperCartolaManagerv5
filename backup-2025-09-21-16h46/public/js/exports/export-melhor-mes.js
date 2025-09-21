const TEMPLATE_CONFIG = {
  width: 800,
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

// Função utilitária para obter dados da liga ativa
function getLigaAtivaInfo() {
  if (typeof window === "undefined") {
    return {
      nome: "SuperCartola 2025",
      nomeCompleto: "SuperCartola 2025",
      logo: "/img/logo-supercartola.png",
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");
  const ligas = {
    "684cb1c8af923da7c7df51de": {
      nome: "SuperCartola",
      nomeCompleto: "SuperCartola 2025",
      logo: "/img/logo-supercartola.png",
    },
    "684d821cf1a7ae16d1f89572": {
      nome: "Cartoleiros Sobral",
      nomeCompleto: "Cartoleiros Sobral 2025",
      logo: "/img/logo-cartoleirossobral.png",
    },
  };
  return ligas[ligaId] || ligas["684cb1c8af923da7c7df51de"];
}

// ✅ FUNÇÃO PRINCIPAL DE EXPORTAÇÃO PROFISSIONAL - CORRIGIDA
export async function criarBotaoExportacaoMelhorMes(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-MELHOR-MES] Configuração inválida:", config);
    return;
  }

  const {
    containerId,
    rankings = [],
    edicao = {},
    tituloPersonalizado = "",
    ligaId = "",
  } = config;

  console.log(
    "[EXPORT-MELHOR-MES] 🎯 Criando botão exportação melhor do mês:",
    {
      containerId,
      rankingsCount: rankings.length,
      edicao,
      tituloPersonalizado,
      ligaId,
    },
  );

  // CORREÇÃO: Buscar container automaticamente se não fornecido
  let container;

  if (containerId) {
    container = document.getElementById(containerId);
  }

  // Fallback: buscar containers comuns
  if (!container) {
    container =
      document.querySelector(".ranking-container") ||
      document.querySelector(".melhor-mes-container") ||
      document.querySelector("#ranking-melhor-mes") ||
      document.querySelector(".container-fluid") ||
      document.querySelector(".row") ||
      document.body;
  }

  if (!container) {
    console.error("[EXPORT-MELHOR-MES] Nenhum container encontrado");
    return;
  }

  console.log(
    "[EXPORT-MELHOR-MES] ✅ Container encontrado:",
    container.className || container.tagName,
  );

  // Remove botão existente
  const botaoExistente = container.querySelector(".btn-export-melhor-mes");
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar botão com design profissional
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-export-melhor-mes botao-exportacao-melhor-mes";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
      <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
    </svg>
    📥 Exportar Melhor do Mês
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
      await exportarMelhorMesComoImagemProfissional({
        rankings,
        edicao,
        tituloPersonalizado,
        ligaId,
      });
    } catch (error) {
      console.error("[EXPORT-MELHOR-MES] Erro na exportação:", error);
      mostrarNotificacao("Erro ao gerar imagem. Tente novamente.", "error");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // Adicionar animação CSS se não existir
  if (!document.querySelector("#melhor-mes-animations")) {
    const style = document.createElement("style");
    style.id = "melhor-mes-animations";
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  btnContainer.appendChild(btn);
  container.insertBefore(btnContainer, container.firstChild);

  console.log("[EXPORT-MELHOR-MES] ✅ Botão criado:", btn.textContent);
}

// ✅ FUNÇÃO DE EXPORTAÇÃO PROFISSIONAL - CORRIGIDA
async function exportarMelhorMesComoImagemProfissional(config) {
  const { rankings, edicao, tituloPersonalizado, ligaId } = config;
  const ligaInfo = getLigaAtivaInfo();
  const rodadaAtual = window.rodadaAtual || 13; // Valor atual do sistema
  const edicaoCompleta = rodadaAtual >= (edicao.fim || edicao.rodadaFim || 17);

  console.log("[EXPORT-MELHOR-MES] 🎨 Criando layout profissional...");
  console.log("[EXPORT-MELHOR-MES] 📊 Config:", {
    ligaInfo,
    edicaoCompleta,
    rodadaAtual,
    edicaoFim: edicao.fim || edicao.rodadaFim,
  });

  // Criar container de exportação invisível
  const exportContainer = document.createElement("div");
  exportContainer.id = "melhor-mes-export-container";
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
  exportContainer.innerHTML = criarLayoutMelhorMes({
    rankings,
    edicao,
    tituloPersonalizado,
    ligaInfo,
    edicaoCompleta,
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

    console.log("[EXPORT-MELHOR-MES] 📸 Capturando imagem...");

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
    const nomeArquivo = `melhor-mes-edicao-${edicao.numero || edicao.nome || 3}-${timestamp}`;

    // Download da imagem
    const link = document.createElement("a");
    link.download = `${nomeArquivo}.png`;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();

    console.log("[EXPORT-MELHOR-MES] ✅ Imagem exportada com sucesso");
    mostrarNotificacao("Melhor do Mês exportado com sucesso!", "success");
  } finally {
    // Remover container temporário
    document.body.removeChild(exportContainer);
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT PROFISSIONAL - CORRIGIDA
function criarLayoutMelhorMes({
  rankings,
  edicao,
  tituloPersonalizado,
  ligaInfo,
  edicaoCompleta,
}) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // CORREÇÃO: Títulos específicos
  const numeroEdicao = edicao.numero || edicao.nome || 3;
  const titulo =
    tituloPersonalizado || `🏆 Melhor do Mês - Edição ${numeroEdicao}`;
  const subtitulo = `Pontuação das rodadas ${edicao.inicio || edicao.rodadaInicio || 11} a ${edicao.fim || edicao.rodadaFim || 17}`;

  // CORREÇÃO: Banner condicional
  const bannerTexto = edicaoCompleta ? "🏆 CAMPEÃO" : "👑 LÍDER ATUAL";
  const statusTexto = edicaoCompleta ? "RESULTADO FINAL" : "RESULTADO PARCIAL";

  console.log("[EXPORT-MELHOR-MES] 📝 Títulos:", {
    titulo,
    subtitulo,
    bannerTexto,
    statusTexto,
    edicaoCompleta,
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
        <!-- Logo da Liga -->
        <div style="flex-shrink: 0;">
          <img src="${ligaInfo.logo}" 
               style="height: 42px; width: auto; filter: brightness(1.1);" 
               alt="${ligaInfo.nome}"
               onerror="this.outerHTML='<div style=\\'width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font:bold 14px Inter;\\'>🏆</div>'">
        </div>

        <div style="text-align: center;">
          <h1 style="
            font: 700 ${TEMPLATE_CONFIG.fonts.title};
            margin: 0 0 3px 0;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${ligaInfo.nomeCompleto}</h1>

          <h2 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.subtitle};
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
              ${statusTexto}
            </span>
          </div>
        </div>
      </div>

      <p style="
        font: 500 11px Inter, sans-serif;
        margin: 8px 0 0 0;
        opacity: 0.9;
      ">${subtitulo}</p>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div style="padding: ${TEMPLATE_CONFIG.padding}px;">

      <!-- BANNER DO CAMPEÃO/LÍDER -->
      <div style="
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #333;
        border-radius: 10px;
        padding: 18px;
        margin-bottom: 16px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(255, 215, 0, 0.3);
        border: 2px solid #FFD700;
      ">
        <h3 style="
          font: 600 ${TEMPLATE_CONFIG.fonts.heading};
          margin: 0 0 8px 0;
        ">${bannerTexto}</h3>
        ${
          rankings.length > 0
            ? `
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
            ${rankings[0].clube_id ? `<img src="/escudos/${rankings[0].clube_id}.png" alt="" style="width:32px; height:32px; border-radius:50%; background:#fff; border:2px solid #FFD700;" onerror="this.style.display='none'"/>` : ""}
            <div>
              <div style="font: 700 18px Inter, sans-serif; margin: 0;">${rankings[0].nome_cartola || rankings[0].nome_cartoleiro || "N/D"}</div>
              <div style="font: 500 14px Inter, sans-serif; color: #666; margin: 2px 0 0 0;">${rankings[0].nome_time || rankings[0].nome || "N/D"}</div>
              <div style="font: 700 16px Inter, sans-serif; color: #333; margin: 4px 0 0 0;">${rankings[0].pontos.toFixed(2).replace(".", ",")} pontos</div>
            </div>
          </div>
        `
            : `<p>Nenhum dado disponível</p>`
        }
      </div>

      <!-- TABELA DE RANKING -->
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
        ">📋 Classificação Completa</h3>

        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background: ${TEMPLATE_CONFIG.colors.primary}; color: white;">
                <th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">POS</th>
                <th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">❤️</th>
                <th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">CARTOLEIRO</th>
                <th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">TIME</th>
                <th style="width: 80px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px;">PONTOS</th>
              </tr>
            </thead>
            <tbody>
              ${rankings
                .map((t, i) => {
                  const nomeCartoleiro =
                    t.nome_cartola || t.nome_cartoleiro || "N/D";
                  const nomeTime = t.nome_time || t.nome || "N/D";

                  const posEmoji = i === 0 ? "🏆" : `${i + 1}º`;
                  const rowBg =
                    i === 0
                      ? "background: #fff9e6; font-weight: bold;"
                      : i % 2 === 0
                        ? "background: #f8f9fa;"
                        : "";

                  return `
                    <tr style="border-bottom: 1px solid ${TEMPLATE_CONFIG.colors.border}; ${rowBg}">
                      <td style="text-align:center; padding: 8px 6px; font: 600 14px Inter, sans-serif;">${posEmoji}</td>
                      <td style="text-align:center; padding: 8px 6px;">
                        ${t.clube_id ? `<img src="/escudos/${t.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee; vertical-align: middle;" onerror="this.style.display='none'"/>` : "—"}
                      </td>
                      <td style="text-align:left; padding: 8px 6px; font: 600 12px Inter, sans-serif;">${nomeCartoleiro}</td>
                      <td style="text-align:left; padding: 8px 6px; font: 500 11px Inter, sans-serif; color: ${TEMPLATE_CONFIG.colors.textLight};">${nomeTime}</td>
                      <td style="text-align:center; padding: 8px 6px; font: 600 14px Inter, sans-serif; color: ${TEMPLATE_CONFIG.colors.primary};">${t.pontos.toFixed(2).replace(".", ",")}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ESTATÍSTICAS RESUMO -->
      <div style="
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
      ">
        <!-- Participantes -->
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
          ">👥 Participantes</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${rankings.length} times
          </p>
        </div>

        <!-- Status -->
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
          ">📊 Status</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${edicaoCompleta ? "Finalizada" : "Em Andamento"}
          </p>
        </div>

        <!-- Período -->
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
          ">📅 Período</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            R${edicao.inicio || edicao.rodadaInicio || 11} - R${edicao.fim || edicao.rodadaFim || 17}
          </p>
        </div>
      </div>

      <!-- INFORMAÇÕES ADICIONAIS -->
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
          🏆 <strong>Melhor do Mês</strong>: Competição mensal baseada na soma de pontos das rodadas do período especificado
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

// ✅ MANTER COMPATIBILIDADE COM FUNÇÃO ORIGINAL
export async function exportarMelhorMesComoImagem(rankings, edicao) {
  await exportarMelhorMesComoImagemProfissional({
    rankings,
    edicao,
  });
}

console.log(
  "[EXPORT-MELHOR-MES] ✅ Sistema de exportação profissional carregado",
);

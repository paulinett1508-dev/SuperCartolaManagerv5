// ✅ EXPORT-BASE.JS - UTILITÁRIOS COMPARTILHADOS OTIMIZADOS v2.3.0
// Sistema base padronizado para todos os módulos de exportação

console.log("[EXPORT-BASE] 🚀 Carregando utilities otimizadas v2.3.0...");

// ✅ CONFIGURAÇÃO PADRONIZADA PARA TODOS OS EXPORTS
export const EXPORT_BASE_CONFIG = {
  width: 800,
  padding: 24,
  headerHeight: 85,
  footerHeight: 40,
  cardSpacing: 8,
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
    title: "28px Inter, sans-serif",
    subtitle: "18px Inter, sans-serif",
    heading: "16px Inter, sans-serif",
    body: "13px Inter, sans-serif",
    caption: "11px Inter, sans-serif",
  },
};

// ✅ INFORMAÇÕES DAS LIGAS OTIMIZADAS
const LIGAS_CONFIG = {
  "684cb1c8af923da7c7df51de": {
    nome: "SuperCartola 2025",
    logo: "/img/logo-supercartola.png",
    fallbackLogo: "SC",
    corPrimaria: EXPORT_BASE_CONFIG.colors.primary,
  },
  "684d821cf1a7ae16d1f89572": {
    nome: "Cartoleiros Sobral 2025",
    logo: "/img/logo-cartoleirossobral.png",
    fallbackLogo: "CS",
    corPrimaria: EXPORT_BASE_CONFIG.colors.primary,
  },
};

// ✅ FUNÇÃO OTIMIZADA PARA OBTER DADOS DA LIGA ATIVA
export function getLigaAtivaInfo() {
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  if (ligaId && LIGAS_CONFIG[ligaId]) {
    console.log(
      `[EXPORT-BASE] ✅ Liga identificada: ${LIGAS_CONFIG[ligaId].nome}`,
    );
    return LIGAS_CONFIG[ligaId];
  }

  // Fallback para liga padrão
  console.log("[EXPORT-BASE] ⚠️ Liga não identificada, usando padrão");
  return LIGAS_CONFIG["684cb1c8af923da7c7df51de"];
}

// ✅ FUNÇÃO OTIMIZADA PARA TOTAL DE RODADAS
export async function obterTotalRodasExport() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch("/api/configuracao/total-rodadas", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const totalRodadas = data.totalRodadas || 38;
      console.log(`[EXPORT-BASE] ✅ Total de rodadas: ${totalRodadas}`);
      return totalRodadas;
    }
  } catch (error) {
    console.warn(
      "[EXPORT-BASE] ⚠️ Erro ao obter total de rodadas, usando padrão 38:",
      error.message,
    );
  }
  return 38;
}

// ✅ FUNÇÃO PRINCIPAL PARA CRIAR HEADER PROFISSIONAL
export function criarHeaderProfissional(titulo, subtitulo = "", info = {}) {
  const ligaInfo = getLigaAtivaInfo();
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!-- HEADER PROFISSIONAL PADRONIZADO -->
    <div style="
      background: linear-gradient(135deg, ${EXPORT_BASE_CONFIG.colors.primary} 0%, ${EXPORT_BASE_CONFIG.colors.secondary} 100%);
      color: white;
      padding: ${EXPORT_BASE_CONFIG.padding}px;
      text-align: center;
      position: relative;
      overflow: hidden;
      min-height: ${EXPORT_BASE_CONFIG.headerHeight}px;
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
        <!-- Logo sempre presente -->
        <div style="flex-shrink: 0;">
          <img src="${ligaInfo.logo}" 
               style="height: 42px; width: auto; filter: brightness(1.1);" 
               alt="${ligaInfo.nome}"
               onerror="this.outerHTML='<div style=\\'width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font:bold 14px Inter;\\'>${ligaInfo.fallbackLogo}</div>'">
        </div>

        <div style="text-align: center;">
          <h1 style="
            font: 700 ${EXPORT_BASE_CONFIG.fonts.title} Inter, sans-serif;
            margin: 0 0 3px 0;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${ligaInfo.nome}</h1>

          ${
            titulo
              ? `
            <h2 style="
              font: 600 ${EXPORT_BASE_CONFIG.fonts.subtitle} Inter, sans-serif;
              margin: 0 0 6px 0;
              opacity: 0.95;
            ">${titulo}</h2>
          `
              : ""
          }

          ${
            subtitulo
              ? `
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
          `
              : ""
          }
        </div>
      </div>

      ${
        info.rodada
          ? `
        <p style="
          font: 500 11px Inter, sans-serif;
          margin: 8px 0 0 0;
          opacity: 0.9;
        ">Rodada ${info.rodada}</p>
      `
          : ""
      }
    </div>
  `;
}

// ✅ FUNÇÃO PARA CRIAR FOOTER PROFISSIONAL
export function criarFooterProfissional() {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!-- FOOTER PROFISSIONAL PADRONIZADO -->
    <div style="
      background: ${EXPORT_BASE_CONFIG.colors.surface};
      border-top: 1px solid ${EXPORT_BASE_CONFIG.colors.border};
      padding: 12px ${EXPORT_BASE_CONFIG.padding}px;
      text-align: center;
      margin-top: 16px;
    ">
      <p style="
        font: ${EXPORT_BASE_CONFIG.fonts.caption} Inter, sans-serif;
        margin: 0;
        color: ${EXPORT_BASE_CONFIG.colors.textLight};
        line-height: 1.2;
      ">
        Gerado em ${dataFormatada} • SuperCartola Manager v2.3.0<br>
        Sistema de Gerenciamento de Ligas do Cartola FC
      </p>
    </div>
  `;
}

// ✅ FUNÇÃO OTIMIZADA PARA CRIAR CONTAINER DE EXPORTAÇÃO
export function criarDivExportacao(titulo, subtitulo = "", info = {}) {
  const exportDiv = document.createElement("div");
  exportDiv.id = "export-container-temp";
  exportDiv.style.cssText = `
    position: absolute;
    top: -99999px;
    left: -99999px;
    width: ${EXPORT_BASE_CONFIG.width}px;
    background: ${EXPORT_BASE_CONFIG.colors.background};
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.3;
    color: ${EXPORT_BASE_CONFIG.colors.text};
  `;

  const headerHtml = criarHeaderProfissional(titulo, subtitulo, info);
  const footerHtml = criarFooterProfissional();

  exportDiv.innerHTML = `
    ${headerHtml}

    <!-- CONTEÚDO PRINCIPAL -->
    <div id="export-content" style="padding: ${EXPORT_BASE_CONFIG.padding}px;">
      <!-- Conteúdo será inserido aqui -->
    </div>

    ${footerHtml}
  `;

  return exportDiv;
}

// ✅ FUNÇÃO OTIMIZADA PARA FORMATAR MOEDA
export function formatarMoedaExport(valor) {
  if (typeof valor !== "number") {
    return "R$ 0,00";
  }

  const abs = Math.abs(valor).toFixed(2).replace(".", ",");
  return valor >= 0 ? `R$ ${abs}` : `-R$ ${abs}`;
}

// ✅ FUNÇÃO OTIMIZADA PARA CANVAS E DOWNLOAD
export async function gerarCanvasDownload(element, filename) {
  try {
    console.log(`[EXPORT-BASE] 📸 Gerando canvas para: ${filename}`);

    // Verificar se html2canvas está disponível
    if (!window.html2canvas) {
      throw new Error("html2canvas não está disponível");
    }

    // Aguardar renderização de imagens
    const imagens = element.querySelectorAll("img");
    if (imagens.length > 0) {
      await Promise.all(
        Array.from(imagens).map((img) => {
          return new Promise((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 2000); // Timeout de segurança
            }
          });
        }),
      );
    }

    // Aguardar um frame para garantir renderização
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Gerar canvas com configurações de alta qualidade
    const canvas = await window.html2canvas(element, {
      allowTaint: true,
      useCORS: true,
      scale: 3, // Aumentado de 2 para 3
      logging: false,
      width: EXPORT_BASE_CONFIG.width,
      height: element.scrollHeight,
      backgroundColor: EXPORT_BASE_CONFIG.colors.background,
      imageTimeout: 15000, // Timeout maior para carregamento de imagens
      removeContainer: true,
      letterRendering: true, // Melhor renderização de texto
      foreignObjectRendering: true, // Melhor renderização de elementos
    });

    // Download da imagem com qualidade máxima
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png", 1.0); // Qualidade máxima
    link.click();

    console.log(`[EXPORT-BASE] ✅ Imagem exportada: ${filename}`);
    mostrarNotificacaoSucesso("Imagem exportada com sucesso!");
  } catch (error) {
    console.error("[EXPORT-BASE] ❌ Erro no canvas/download:", error);
    mostrarNotificacaoErro("Erro ao exportar imagem. Tente novamente.");
    throw error;
  } finally {
    // Limpar elemento temporário
    if (element && element.parentNode === document.body) {
      document.body.removeChild(element);
    }
  }
}

// ✅ SISTEMA DE NOTIFICAÇÕES PADRONIZADO
export function mostrarNotificacaoSucesso(mensagem) {
  mostrarNotificacao(mensagem, "success");
}

export function mostrarNotificacaoErro(mensagem) {
  mostrarNotificacao(mensagem, "error");
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const cores = {
    success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724", icon: "✅" },
    error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24", icon: "❌" },
    info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460", icon: "ℹ️" },
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
    max-width: 300px;
  `;

  notificacao.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">${cor.icon}</span>
      <span>${mensagem}</span>
    </div>
  `;

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

// ✅ FUNÇÃO OTIMIZADA PARA CRIAR BOTÃO DE EXPORTAÇÃO
export function criarBotaoExportacaoRodada({
  containerId,
  rodada,
  rankings,
  tipo = "rodada",
  customExport = null,
  texto = "Exportar Imagem",
}) {
  const container =
    typeof containerId === "string"
      ? document.getElementById(containerId)
      : containerId;

  if (!container) {
    console.warn(`[EXPORT-BASE] ⚠️ Container não encontrado: ${containerId}`);
    // Retry após 100ms
    setTimeout(() => {
      const retryContainer =
        typeof containerId === "string"
          ? document.getElementById(containerId)
          : containerId;
      if (retryContainer) {
        criarBotaoExportacaoRodada({
          containerId: retryContainer,
          rodada,
          rankings,
          tipo,
          customExport,
          texto,
        });
      } else {
        console.error(
          `[EXPORT-BASE] ❌ Container ${containerId} não encontrado após retry`,
        );
      }
    }, 100);
    return;
  }

  // Limpar container
  container.innerHTML = "";

  // Criar botão com design profissional
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-exportar-imagem";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
      <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
    </svg>
    ${texto}
  `;

  btn.style.cssText = `
    background: linear-gradient(135deg, ${EXPORT_BASE_CONFIG.colors.primary} 0%, ${EXPORT_BASE_CONFIG.colors.accent} 100%);
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

  btn.onclick = async (e) => {
    e.stopPropagation();

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
      <div style="width: 16px; height: 16px; margin-right: 8px;">
        <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      Gerando Imagem...
    `;
    btn.disabled = true;

    try {
      if (typeof customExport === "function") {
        await customExport(rankings, rodada, tipo);
      } else {
        console.log(
          `[EXPORT-BASE] 📦 Executando export padrão para rodada ${rodada}`,
        );
        mostrarNotificacaoErro("Função de exportação não configurada");
      }
    } catch (error) {
      console.error("[EXPORT-BASE] ❌ Erro no export:", error);
      mostrarNotificacaoErro("Erro ao exportar. Tente novamente.");
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
  container.appendChild(btnContainer);

  console.log(
    `[EXPORT-BASE] ✅ Botão de exportação criado para: ${containerId}`,
  );
}

// ✅ UTILITÁRIOS ADICIONAIS
export const ExportUtils = {
  config: EXPORT_BASE_CONFIG,
  getLigaInfo: getLigaAtivaInfo,
  formatarMoeda: formatarMoedaExport,
  criarHeader: criarHeaderProfissional,
  criarFooter: criarFooterProfissional,
  mostrarSucesso: mostrarNotificacaoSucesso,
  mostrarErro: mostrarNotificacaoErro,

  // Função para validar dados antes da exportação
  validarDadosExport: (dados, campos = []) => {
    if (!dados) {
      throw new Error("Dados não fornecidos para exportação");
    }

    for (const campo of campos) {
      if (!dados[campo]) {
        throw new Error(`Campo obrigatório não encontrado: ${campo}`);
      }
    }

    return true;
  },

  // Função para gerar nome de arquivo padronizado
  gerarNomeArquivo: (tipo, info = {}) => {
    const timestamp = new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const ligaInfo = getLigaAtivaInfo();
    const ligaNome = ligaInfo.nome.toLowerCase().replace(/\s+/g, "-");

    let nome = `${ligaNome}-${tipo}`;
    if (info.rodada) nome += `-rodada-${info.rodada}`;
    if (info.extra) nome += `-${info.extra}`;
    nome += `-${timestamp}`;

    return `${nome}.png`;
  },
};

console.log("[EXPORT-BASE] ✅ Utilities otimizadas carregadas com sucesso");
console.log("[EXPORT-BASE] 📦 Configuração padronizada disponível");
console.log(
  "[EXPORT-BASE] 🎯 Utilitários disponíveis:",
  Object.keys(ExportUtils),
);

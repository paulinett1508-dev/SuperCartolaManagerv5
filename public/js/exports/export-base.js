// SISTEMA DE EXPORTAÇÃO MOBILE DARK HD - BASE UNIFICADA v3.0.1
// Configuração otimizada para mobile vertical, tema dark, alta definição
// CORREÇÃO CRÍTICA: Carregamento dinâmico do html2canvas

console.log(
  "[EXPORT-BASE-MOBILE-DARK] 🚀 Sistema Mobile Dark HD v3.0.1 carregado",
);

// CONFIGURAÇÃO BASE MOBILE DARK HD - TODOS OS MÓDULOS DEVEM USAR ESTA
export const MOBILE_DARK_HD_CONFIG = {
  // DIMENSÕES MOBILE VERTICAL HD
  width: 400, // Largura mobile vertical
  minHeight: 800, // Altura mínima para scroll adequado
  scale: 4, // 4x para ultra alta definição
  dpi: 300, // DPI profissional para print quality

  // ESPAÇAMENTO MOBILE OTIMIZADO
  padding: 16, // Padding reduzido para mobile
  headerHeight: 80, // Header compacto otimizado
  footerHeight: 60, // Footer proporcional
  cardSpacing: 12, // Espaçamento entre cards

  // TEMA DARK PROFISSIONAL
  colors: {
    // Backgrounds Dark
    primary: "#1a1a1a", // Fundo principal escuro
    secondary: "#2d2d2d", // Fundo secundário
    surface: "#1e1e1e", // Superfície de cards
    surfaceLight: "#252525", // Superfície clara

    // Acentos e Destaques
    accent: "#FF6B35", // Laranja vibrante para destaques
    accentDark: "#E55A2B", // Laranja escuro
    gold: "#FFD700", // Dourado para primeiro lugar
    silver: "#C0C0C0", // Prata para segundo lugar
    bronze: "#CD7F32", // Bronze para terceiro lugar

    // Textos Dark Theme
    text: "#FFFFFF", // Texto principal branco
    textSecondary: "#E0E0E0", // Texto secundário
    textMuted: "#B0B0B0", // Texto desbotado
    textDisabled: "#707070", // Texto desabilitado

    // Estados e Feedbacks
    success: "#4CAF50", // Verde sucesso
    successDark: "#388E3C", // Verde escuro
    danger: "#F44336", // Vermelho erro/negativo
    dangerDark: "#C62828", // Vermelho escuro
    warning: "#FF9800", // Amarelo aviso
    info: "#2196F3", // Azul informação

    // Bordas e Separadores
    border: "#404040", // Bordas sutis
    borderLight: "#505050", // Bordas claras
    divider: "#333333", // Divisores

    // Gradientes Dark
    gradientPrimary: "linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)",
    gradientDark: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
    gradientSuccess: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",
    gradientDanger: "linear-gradient(135deg, #F44336 0%, #C62828 100%)",

    // Overlay e Sombras
    overlay: "rgba(0, 0, 0, 0.8)",
    shadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
    shadowLight: "0 4px 16px rgba(0, 0, 0, 0.4)",
  },

  // TIPOGRAFIA MOBILE OTIMIZADA
  fonts: {
    // Tamanhos maiores para mobile
    title: "32px 'Inter', -apple-system, sans-serif",
    titleLarge: "36px 'Inter', -apple-system, sans-serif",
    subtitle: "24px 'Inter', -apple-system, sans-serif",
    heading: "20px 'Inter', -apple-system, sans-serif",
    subheading: "18px 'Inter', -apple-system, sans-serif",
    body: "16px 'Inter', -apple-system, sans-serif",
    bodySmall: "14px 'Inter', -apple-system, sans-serif",
    caption: "12px 'Inter', -apple-system, sans-serif",

    // Pesos específicos
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },

  // CONFIGURAÇÕES DE EXPORTAÇÃO HD
  export: {
    quality: 1.0, // Qualidade máxima PNG
    format: "png", // Formato PNG para transparência
    backgroundColor: "#1a1a1a", // Fundo dark padrão
    useCORS: true, // Permitir cross-origin
    allowTaint: true, // Permitir imagens externas
    logging: false, // Sem logs no html2canvas
    imageTimeout: 5000, // Timeout para carregar imagens
    removeContainer: true, // Remover container após export
    letterRendering: true, // Melhor renderização de texto
  },
};

// INFORMAÇÕES DAS LIGAS OTIMIZADAS PARA MOBILE DARK
const LIGAS_MOBILE_CONFIG = {
  "684cb1c8af923da7c7df51de": {
    nome: "SuperCartola",
    nomeCompleto: "SuperCartola 2025",
    logo: "/img/logo-supercartola.png",
    fallbackLogo: "SC",
    corPrimaria: MOBILE_DARK_HD_CONFIG.colors.accent,
    corSecundaria: MOBILE_DARK_HD_CONFIG.colors.accentDark,
  },
  "684d821cf1a7ae16d1f89572": {
    nome: "Cartoleiros Sobral",
    nomeCompleto: "Cartoleiros Sobral 2025",
    logo: "/img/logo-cartoleirossobral.png",
    fallbackLogo: "CS",
    corPrimaria: MOBILE_DARK_HD_CONFIG.colors.accent,
    corSecundaria: MOBILE_DARK_HD_CONFIG.colors.accentDark,
  },
};

// FUNÇÃO PARA OBTER DADOS DA LIGA ATIVA
export function getLigaAtivaInfoMobile() {
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  if (ligaId && LIGAS_MOBILE_CONFIG[ligaId]) {
    return LIGAS_MOBILE_CONFIG[ligaId];
  }

  return LIGAS_MOBILE_CONFIG["684cb1c8af923da7c7df51de"];
}

// HEADER MOBILE DARK COMPACTO - MINI CARDS
export function criarHeaderMobileDark(titulo, subtitulo = "", info = {}) {
  const ligaInfo = getLigaAtivaInfoMobile();
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!-- HEADER MOBILE DARK COMPACTO -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.gradientPrimary};
      color: ${MOBILE_DARK_HD_CONFIG.colors.text};
      padding: 12px ${MOBILE_DARK_HD_CONFIG.padding}px;
      position: relative;
      overflow: hidden;
      min-height: ${MOBILE_DARK_HD_CONFIG.headerHeight}px;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
    ">

      <!-- Container flex compacto -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        z-index: 2;
      ">

        <!-- MINI CARD ESQUERDO - Liga -->
        <div style="
          display: flex;
          align-items: center;
          background: ${MOBILE_DARK_HD_CONFIG.colors.overlay};
          backdrop-filter: blur(10px);
          border-radius: 10px;
          padding: 6px 10px;
          border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
          min-width: 0;
          flex: 1;
        ">
          <img src="${ligaInfo.logo}" 
               style="
                 height: 24px; 
                 width: 24px; 
                 border-radius: 50%;
                 margin-right: 8px;
                 flex-shrink: 0;
               " 
               alt="${ligaInfo.nome}"
               onerror="this.outerHTML='<div style=\\'width:24px;height:24px;background:${MOBILE_DARK_HD_CONFIG.colors.accent};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;margin-right:8px;flex-shrink:0;\\'>${ligaInfo.fallbackLogo}</div>'">

          <div style="min-width: 0; flex: 1;">
            <div style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 12px Inter;
              color: ${MOBILE_DARK_HD_CONFIG.colors.text};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${ligaInfo.nome}</div>
          </div>
        </div>

        <!-- MINI CARD CENTRO - Título -->
        <div style="
          background: ${MOBILE_DARK_HD_CONFIG.colors.overlay};
          backdrop-filter: blur(10px);
          border-radius: 10px;
          padding: 6px 12px;
          border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
          margin: 0 8px;
          flex-shrink: 0;
        ">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 14px Inter;
            color: ${MOBILE_DARK_HD_CONFIG.colors.text};
            text-align: center;
            white-space: nowrap;
          ">${titulo || "Exportação"}</div>

          ${
            subtitulo
              ? `
            <div style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 10px Inter;
              color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
              text-align: center;
              margin-top: 2px;
            ">${subtitulo}</div>
          `
              : ""
          }
        </div>

        <!-- MINI CARD DIREITO - Data -->
        <div style="
          background: ${MOBILE_DARK_HD_CONFIG.colors.overlay};
          backdrop-filter: blur(10px);
          border-radius: 10px;
          padding: 6px 8px;
          border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
          flex-shrink: 0;
        ">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} 10px Inter;
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            text-align: center;
            white-space: nowrap;
          ">${dataFormatada}</div>
        </div>

      </div>
    </div>
  `;
}

// FOOTER MOBILE DARK PROFISSIONAL
export function criarFooterMobileDark() {
  const agora = new Date();
  const dataCompleta = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!-- FOOTER MOBILE DARK HD -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border-top: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.accent};
      padding: ${MOBILE_DARK_HD_CONFIG.padding}px;
      text-align: center;
      margin-top: 24px;
    ">

      <!-- Logo mini -->
      <div style="
        width: 32px;
        height: 32px;
        background: ${MOBILE_DARK_HD_CONFIG.colors.gradientPrimary};
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
      ">
        <span style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 14px Inter;
          color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        ">SC</span>
      </div>

      <!-- Informações do sistema -->
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        line-height: 1.4;
        margin: 0;
      ">
        SuperCartola Manager v3.0.1<br>
        Sistema de Gestão de Ligas Cartola FC<br>
        <span style="
          color: ${MOBILE_DARK_HD_CONFIG.colors.accent};
          font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold};
        ">Gerado em ${dataCompleta}</span>
      </div>
    </div>
  `;
}

// CONTAINER DE EXPORTAÇÃO MOBILE DARK HD
export function criarContainerMobileDark(titulo, subtitulo = "", info = {}) {
  const exportContainer = document.createElement("div");
  exportContainer.id = "mobile-dark-export-container";
  exportContainer.style.cssText = `
    position: absolute;
    top: -99999px;
    left: -99999px;
    width: ${MOBILE_DARK_HD_CONFIG.width}px;
    min-height: ${MOBILE_DARK_HD_CONFIG.minHeight}px;
    background: ${MOBILE_DARK_HD_CONFIG.colors.primary};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: ${MOBILE_DARK_HD_CONFIG.colors.text};
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  `;

  const headerHtml = criarHeaderMobileDark(titulo, subtitulo, info);
  const footerHtml = criarFooterMobileDark();

  exportContainer.innerHTML = `
    ${headerHtml}

    <!-- CONTEÚDO PRINCIPAL MOBILE -->
    <div id="mobile-export-content" style="
      padding: ${MOBILE_DARK_HD_CONFIG.padding}px;
      min-height: calc(${MOBILE_DARK_HD_CONFIG.minHeight}px - ${MOBILE_DARK_HD_CONFIG.headerHeight}px - ${MOBILE_DARK_HD_CONFIG.footerHeight}px);
    ">
      <!-- Conteúdo será inserido aqui -->
    </div>

    ${footerHtml}
  `;

  return exportContainer;
}

// CARREGAMENTO DINÂMICO DO HTML2CANVAS - CORREÇÃO CRÍTICA
async function carregarHtml2Canvas() {
  if (window.html2canvas) {
    console.log("[EXPORT-BASE-MOBILE-DARK] html2canvas já carregado");
    return window.html2canvas;
  }

  console.log(
    "[EXPORT-BASE-MOBILE-DARK] Carregando html2canvas dinamicamente...",
  );

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.crossOrigin = "anonymous";

    script.onload = () => {
      if (window.html2canvas) {
        console.log(
          "[EXPORT-BASE-MOBILE-DARK] ✅ html2canvas carregado com sucesso",
        );
        resolve(window.html2canvas);
      } else {
        console.error(
          "[EXPORT-BASE-MOBILE-DARK] ❌ html2canvas não disponível após carregamento",
        );
        reject(new Error("html2canvas não carregou corretamente"));
      }
    };

    script.onerror = (error) => {
      console.error(
        "[EXPORT-BASE-MOBILE-DARK] ❌ Erro ao carregar html2canvas:",
        error,
      );
      reject(new Error("Falha ao carregar html2canvas"));
    };

    // Timeout de segurança
    setTimeout(() => {
      if (!window.html2canvas) {
        console.error(
          "[EXPORT-BASE-MOBILE-DARK] ❌ Timeout ao carregar html2canvas",
        );
        reject(new Error("Timeout ao carregar html2canvas"));
      }
    }, 10000);

    document.head.appendChild(script);
  });
}

// GERAÇÃO DE CANVAS HD OTIMIZADA PARA MOBILE - CORRIGIDA
export async function gerarCanvasMobileDarkHD(element, filename) {
  try {
    console.log(
      `[EXPORT-BASE-MOBILE-DARK] 📱 Gerando canvas mobile HD: ${filename}`,
    );

    // Carregar html2canvas dinamicamente se não estiver disponível
    await carregarHtml2Canvas();

    // Aguardar carregamento de todas as imagens
    const imagens = element.querySelectorAll("img");
    if (imagens.length > 0) {
      await Promise.all(
        Array.from(imagens).map((img) => {
          return new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            } else {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, MOBILE_DARK_HD_CONFIG.export.imageTimeout);
            }
          });
        }),
      );
    }

    // Aguardar renderização completa
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    // Gerar canvas com configurações HD mobile
    const canvas = await window.html2canvas(element, {
      allowTaint: MOBILE_DARK_HD_CONFIG.export.allowTaint,
      useCORS: MOBILE_DARK_HD_CONFIG.export.useCORS,
      scale: MOBILE_DARK_HD_CONFIG.scale,
      logging: MOBILE_DARK_HD_CONFIG.export.logging,
      width: MOBILE_DARK_HD_CONFIG.width,
      height: Math.max(element.scrollHeight, MOBILE_DARK_HD_CONFIG.minHeight),
      backgroundColor: MOBILE_DARK_HD_CONFIG.export.backgroundColor,
      removeContainer: MOBILE_DARK_HD_CONFIG.export.removeContainer,
      letterRendering: MOBILE_DARK_HD_CONFIG.export.letterRendering,
      imageTimeout: MOBILE_DARK_HD_CONFIG.export.imageTimeout,
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    });

    // Download da imagem HD
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL(
      `image/${MOBILE_DARK_HD_CONFIG.export.format}`,
      MOBILE_DARK_HD_CONFIG.export.quality,
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(
      `[EXPORT-BASE-MOBILE-DARK] ✅ Imagem HD exportada: ${filename}`,
    );
    mostrarNotificacaoSucessoMobile("Imagem HD exportada com sucesso!");
  } catch (error) {
    console.error("[EXPORT-BASE-MOBILE-DARK] ❌ Erro no canvas HD:", error);
    mostrarNotificacaoErroMobile(
      "Erro ao exportar imagem HD. Tente novamente.",
    );
    throw error;
  } finally {
    // Limpar container temporário
    if (element && element.parentNode === document.body) {
      document.body.removeChild(element);
    }
  }
}

// SISTEMA DE NOTIFICAÇÕES MOBILE DARK
export function mostrarNotificacaoSucessoMobile(mensagem) {
  mostrarNotificacaoMobile(mensagem, "success");
}

export function mostrarNotificacaoErroMobile(mensagem) {
  mostrarNotificacaoMobile(mensagem, "error");
}

function mostrarNotificacaoMobile(mensagem, tipo = "info") {
  const cores = {
    success: {
      bg: MOBILE_DARK_HD_CONFIG.colors.success,
      text: MOBILE_DARK_HD_CONFIG.colors.text,
      icon: "✅",
    },
    error: {
      bg: MOBILE_DARK_HD_CONFIG.colors.danger,
      text: MOBILE_DARK_HD_CONFIG.colors.text,
      icon: "❌",
    },
    info: {
      bg: MOBILE_DARK_HD_CONFIG.colors.info,
      text: MOBILE_DARK_HD_CONFIG.colors.text,
      icon: "ℹ️",
    },
  };

  const cor = cores[tipo] || cores.info;

  const notificacao = document.createElement("div");
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${cor.bg};
    color: ${cor.text};
    padding: 16px 20px;
    border-radius: 12px;
    font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.body};
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 280px;
    border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
  `;

  notificacao.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 18px; flex-shrink: 0;">${cor.icon}</span>
      <span style="line-height: 1.3;">${mensagem}</span>
    </div>
  `;

  document.body.appendChild(notificacao);

  // Animação de entrada
  requestAnimationFrame(() => {
    notificacao.style.transform = "translateX(0)";
  });

  // Remover após 4 segundos (mais tempo para mobile)
  setTimeout(() => {
    notificacao.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notificacao.parentNode) {
        document.body.removeChild(notificacao);
      }
    }, 300);
  }, 4000);
}

// UTILITÁRIOS MOBILE DARK
export const MobileDarkUtils = {
  config: MOBILE_DARK_HD_CONFIG,
  getLigaInfo: getLigaAtivaInfoMobile,
  criarHeader: criarHeaderMobileDark,
  criarFooter: criarFooterMobileDark,
  criarContainer: criarContainerMobileDark,
  gerarCanvas: gerarCanvasMobileDarkHD,
  mostrarSucesso: mostrarNotificacaoSucessoMobile,
  mostrarErro: mostrarNotificacaoErroMobile,

  // Gerar nome de arquivo otimizado para mobile
  gerarNomeArquivoMobile: (tipo, info = {}) => {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "");
    const ligaInfo = getLigaAtivaInfoMobile();
    const ligaNome = ligaInfo.nome.toLowerCase().replace(/\s+/g, "-");

    let nome = `${ligaNome}-${tipo}-mobile-hd`;
    if (info.rodada) nome += `-r${info.rodada}`;
    if (info.extra) nome += `-${info.extra}`;
    nome += `-${timestamp}`;

    return `${nome}.png`;
  },

  // Validar dados antes da exportação
  validarDadosMobile: (dados, campos = []) => {
    if (!dados) {
      throw new Error("Dados não fornecidos para exportação mobile");
    }

    for (const campo of campos) {
      if (dados[campo] === undefined || dados[campo] === null) {
        console.warn(`Campo ${campo} não encontrado, usando valor padrão`);
      }
    }

    return true;
  },

  // Formatar valores monetários para mobile
  formatarMoedaMobile: (valor) => {
    if (typeof valor !== "number" || isNaN(valor)) return "R$ 0,00";

    const abs = Math.abs(valor);
    const formatado = abs.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return valor >= 0 ? `R$ ${formatado}` : `-R$ ${formatado}`;
  },
};

console.log("[EXPORT-BASE-MOBILE-DARK] ✅ Sistema Mobile Dark HD configurado");
console.log(
  "[EXPORT-BASE-MOBILE-DARK] 📱 Resolução:",
  `${MOBILE_DARK_HD_CONFIG.width}px x ${MOBILE_DARK_HD_CONFIG.minHeight}px @ ${MOBILE_DARK_HD_CONFIG.scale}x`,
);
console.log(
  "[EXPORT-BASE-MOBILE-DARK] 🎨 Tema Dark ativado com",
  Object.keys(MOBILE_DARK_HD_CONFIG.colors).length,
  "cores",
);
console.log(
  "[EXPORT-BASE-MOBILE-DARK] 🔧 Carregamento dinâmico html2canvas ativado",
);

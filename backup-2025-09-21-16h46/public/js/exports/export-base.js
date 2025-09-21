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
    warning: "#4CAF50", // ✅ ALTERADO: de "#FF9800" para verde
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
    gradientWarning: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)", // ✅ NOVO: verde

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

// HEADER MOBILE DARK COMPACTO UX OTIMIZADO
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
    <!-- HEADER MOBILE DARK COMPACTO UX OTIMIZADO -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.gradientPrimary};
      color: ${MOBILE_DARK_HD_CONFIG.colors.text};
      padding: 8px ${MOBILE_DARK_HD_CONFIG.padding}px;
      position: relative;
      overflow: hidden;
      min-height: 48px;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
      display: flex;
      align-items: center;
      justify-content: space-between;
    ">

      <!-- LOGO COMPACTO ESQUERDA -->
      <div style="
        display: flex;
        align-items: center;
        background: ${MOBILE_DARK_HD_CONFIG.colors.overlay};
        backdrop-filter: blur(10px);
        border-radius: 6px;
        padding: 4px 8px;
        border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
        flex-shrink: 0;
      ">
        <img src="${ligaInfo.logo}" 
             style="height: 20px; width: 20px; border-radius: 50%; margin-right: 6px;" 
             alt="${ligaInfo.nome}"
             onerror="this.outerHTML='<div style=\\'width:20px;height:20px;background:${MOBILE_DARK_HD_CONFIG.colors.accent};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;margin-right:6px;\\'>${ligaInfo.fallbackLogo}</div>'">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 10px Inter;
          color: ${MOBILE_DARK_HD_CONFIG.colors.text};
          white-space: nowrap;
        ">${ligaInfo.nome}</div>
      </div>

      <!-- TÍTULO CENTRAL COMPACTO -->
      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.overlay};
        backdrop-filter: blur(10px);
        border-radius: 6px;
        padding: 4px 10px;
        border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
        flex: 1;
        margin: 0 8px;
        text-align: center;
        max-width: 200px;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 12px Inter;
          color: ${MOBILE_DARK_HD_CONFIG.colors.text};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">${titulo || "Exportação"}</div>

        ${subtitulo ? `
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 8px Inter;
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          margin-top: 1px;
        ">${subtitulo}</div>
        ` : ""}
      </div>

      <!-- DATA DIREITA COMPACTA -->
      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.overlay};
        backdrop-filter: blur(10px);
        border-radius: 6px;
        padding: 4px 6px;
        border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
        flex-shrink: 0;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} 8px Inter;
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          text-align: center;
          white-space: nowrap;
        ">${dataFormatada}</div>
      </div>

    </div>
  `;
}

// FOOTER MOBILE DARK COMPACTO
export function criarFooterMobileDark() {
  const agora = new Date();
  const dataCompleta = agora.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!-- FOOTER MOBILE DARK COMPACTO -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border-top: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.accent};
      padding: 8px ${MOBILE_DARK_HD_CONFIG.padding}px;
      text-align: center;
      margin-top: 16px;
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} 9px Inter;
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        line-height: 1.3;
      ">
        SuperCartola Manager • ${dataCompleta}
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
  // Verificar se já está carregado
  if (window.html2canvas && typeof window.html2canvas === 'function') {
    console.log("[EXPORT-BASE-MOBILE-DARK] html2canvas já disponível");
    return window.html2canvas;
  }

  console.log("[EXPORT-BASE-MOBILE-DARK] Carregando html2canvas dinamicamente...");

  return new Promise((resolve, reject) => {
    // Verificar se script já está sendo carregado
    const existingScript = document.querySelector('script[src*="html2canvas"]');
    if (existingScript) {
      // Aguardar carregamento do script existente
      const checkInterval = setInterval(() => {
        if (window.html2canvas) {
          clearInterval(checkInterval);
          resolve(window.html2canvas);
        }
      }, 100);

      // Timeout para o script existente
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.html2canvas) {
          reject(new Error("Timeout aguardando script existente"));
        }
      }, 10000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.crossOrigin = "anonymous";
    script.async = true;

    let resolved = false;

    script.onload = () => {
      if (resolved) return;
      
      // Aguardar um momento para o script se registrar
      setTimeout(() => {
        if (window.html2canvas && typeof window.html2canvas === 'function') {
          resolved = true;
          console.log("[EXPORT-BASE-MOBILE-DARK] ✅ html2canvas carregado com sucesso");
          resolve(window.html2canvas);
        } else {
          resolved = true;
          console.error("[EXPORT-BASE-MOBILE-DARK] ❌ html2canvas não disponível após carregamento");
          reject(new Error("html2canvas não se registrou corretamente"));
        }
      }, 200);
    };

    script.onerror = (error) => {
      if (resolved) return;
      resolved = true;
      console.error("[EXPORT-BASE-MOBILE-DARK] ❌ Erro ao carregar html2canvas:", error);
      reject(new Error("Falha no carregamento do script html2canvas"));
    };

    // Timeout de segurança
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error("[EXPORT-BASE-MOBILE-DARK] ❌ Timeout ao carregar html2canvas");
        reject(new Error("Timeout de 10s ao carregar html2canvas"));
      }
    }, 10000);

    document.head.appendChild(script);
  });
}

// GERAÇÃO DE CANVAS HD OTIMIZADA PARA MOBILE - CORRIGIDA
export async function gerarCanvasMobileDarkHD(element, filename) {
  try {
    console.log(`[EXPORT-BASE-MOBILE-DARK] 📱 Gerando canvas mobile HD: ${filename}`);

    // CORREÇÃO CRÍTICA: Aguardar carregamento completo do html2canvas
    let html2canvas;
    try {
      html2canvas = await carregarHtml2Canvas();
    } catch (error) {
      console.error("[EXPORT-BASE-MOBILE-DARK] Erro ao carregar html2canvas:", error);
      throw new Error("Não foi possível carregar a biblioteca de exportação");
    }

    // Verificação adicional de segurança
    if (!html2canvas || typeof html2canvas !== 'function') {
      throw new Error("html2canvas não está disponível após o carregamento");
    }

    // Aguardar carregamento de todas as imagens
    const imagens = element.querySelectorAll("img");
    if (imagens.length > 0) {
      console.log(`[EXPORT-BASE-MOBILE-DARK] Aguardando ${imagens.length} imagens...`);
      
      await Promise.allSettled(
        Array.from(imagens).map((img) => {
          return new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            } else {
              const timer = setTimeout(() => {
                console.warn(`[EXPORT-BASE-MOBILE-DARK] Timeout na imagem: ${img.src}`);
                resolve();
              }, MOBILE_DARK_HD_CONFIG.export.imageTimeout);

              img.onload = () => {
                clearTimeout(timer);
                resolve();
              };
              
              img.onerror = () => {
                clearTimeout(timer);
                console.warn(`[EXPORT-BASE-MOBILE-DARK] Erro ao carregar imagem: ${img.src}`);
                resolve();
              };
            }
          });
        })
      );
    }

    // Aguardar renderização completa com delay adicional
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100); // Delay adicional para estabilidade
        });
      });
    });

    console.log("[EXPORT-BASE-MOBILE-DARK] Iniciando captura canvas...");

    // Gerar canvas com configurações HD mobile
    const canvas = await html2canvas(element, {
      allowTaint: MOBILE_DARK_HD_CONFIG.export.allowTaint,
      useCORS: MOBILE_DARK_HD_CONFIG.export.useCORS,
      scale: MOBILE_DARK_HD_CONFIG.scale,
      logging: MOBILE_DARK_HD_CONFIG.export.logging,
      width: MOBILE_DARK_HD_CONFIG.width,
      height: Math.max(element.scrollHeight, MOBILE_DARK_HD_CONFIG.minHeight),
      backgroundColor: MOBILE_DARK_HD_CONFIG.export.backgroundColor,
      removeContainer: false, // Não remover automaticamente
      letterRendering: MOBILE_DARK_HD_CONFIG.export.letterRendering,
      imageTimeout: MOBILE_DARK_HD_CONFIG.export.imageTimeout,
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    });

    // Verificar se canvas foi gerado corretamente
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("Canvas gerado é inválido");
    }

    // Download da imagem HD
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL(
      `image/${MOBILE_DARK_HD_CONFIG.export.format}`,
      MOBILE_DARK_HD_CONFIG.export.quality,
    );

    // Verificar se dataURL foi gerado
    if (!link.href || link.href === 'data:,') {
      throw new Error("Falha ao gerar dados da imagem");
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`[EXPORT-BASE-MOBILE-DARK] ✅ Imagem HD exportada: ${filename}`);
    mostrarNotificacaoSucessoMobile("Imagem HD exportada com sucesso!");
    
  } catch (error) {
    console.error("[EXPORT-BASE-MOBILE-DARK] ❌ Erro no canvas HD:", error);
    mostrarNotificacaoErroMobile("Erro ao exportar imagem HD. Tente novamente.");
    throw error;
  } finally {
    // Limpar container temporário
    if (element && element.parentNode === document.body) {
      try {
        document.body.removeChild(element);
      } catch (cleanupError) {
        console.warn("[EXPORT-BASE-MOBILE-DARK] Erro na limpeza:", cleanupError);
      }
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
    // ✅ REMOVIDO: minimumFractionDigits e maximumFractionDigits
    const formatado = abs.toLocaleString("pt-BR");

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



// ======================================================================
// UTILITÁRIOS PARA CRIAÇÃO DE BOTÕES DE EXPORTAÇÃO MOBILE DARK
// ======================================================================

// FUNÇÃO PARA CRIAR BOTÃO DE EXPORTAÇÃO MOBILE DARK - GENÉRICO
export function criarBotaoExportacaoMobileDark(config) {
  const {
    containerId,
    className,
    textoIcone = "📱",
    textoBotao = "Exportar Mobile HD",
    funcaoExportacao,
    dadosExportacao = {},
  } = config;

  if (!containerId || !funcaoExportacao) {
    console.error("[EXPORT-BASE-MOBILE-DARK] containerId e funcaoExportacao são obrigatórios");
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[EXPORT-BASE-MOBILE-DARK] Container ${containerId} não encontrado`);
    return;
  }

  // Remove botão existente se houver
  const botaoExistente = container.querySelector(`.${className}`);
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  // Criar botão com design mobile dark
  const btn = document.createElement("button");
  btn.className = className;
  btn.innerHTML = `
    <span style="margin-right: 8px; font-size: 16px;">${textoIcone}</span>
    ${textoBotao}
  `;

  // Aplicar estilos mobile dark
  btn.style.cssText = `
    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientPrimary} !important;
    color: ${MOBILE_DARK_HD_CONFIG.colors.text} !important;
    border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.accent} !important;
    padding: 12px 20px !important;
    border-radius: 8px !important;
    cursor: pointer;
    font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} 13px Inter, sans-serif !important;
    display: inline-flex;
    align-items: center;
    transition: all 0.3s ease !important;
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow} !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
  `;

  // Efeitos hover
  btn.onmouseover = () => {
    btn.style.transform = "translateY(-2px) scale(1.02)";
    btn.style.boxShadow = `0 12px 35px ${MOBILE_DARK_HD_CONFIG.colors.accent}40 !important`;
    btn.style.background = `${MOBILE_DARK_HD_CONFIG.colors.gradientDanger} !important`;
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0) scale(1)";
    btn.style.boxShadow = `${MOBILE_DARK_HD_CONFIG.colors.shadow} !important`;
    btn.style.background = `${MOBILE_DARK_HD_CONFIG.colors.gradientPrimary} !important`;
  };

  // Configurar click handler
  btn.onclick = async () => {
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
      <div style="width: 16px; height: 16px; margin-right: 8px;">
        <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      Gerando Mobile HD...
    `;
    btn.disabled = true;

    try {
      await funcaoExportacao(dadosExportacao);
    } catch (error) {
      console.error("[EXPORT-BASE-MOBILE-DARK] Erro na exportação:", error);
      mostrarNotificacaoErroMobile("Erro ao gerar imagem HD. Tente novamente.");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  btnContainer.appendChild(btn);

  // POSICIONAR NA PARTE SUPERIOR (seguindo padrão estabelecido)
  if (container.firstChild) {
    container.insertBefore(btnContainer, container.firstChild);
  } else {
    container.appendChild(btnContainer);
  }

  return btn;
}

// FUNÇÃO ESPECÍFICA PARA CRIAÇÃO DE BOTÃO MOBILE DARK - PONTOS CORRIDOS RODADA
export function criarBotaoMobileDarkPontosCorridosRodada(config) {
  return criarBotaoExportacaoMobileDark({
    ...config,
    className: "btn-export-mobile-dark-pontos-corridos-rodada",
    textoIcone: "📱",
    textoBotao: "Exportar Confrontos Mobile HD",
    funcaoExportacao: async (dados) => {
      // Aqui será implementada a função de exportação mobile dark para pontos corridos rodada
      console.log("[EXPORT-BASE-MOBILE-DARK] Exportando confrontos mobile HD:", dados);
      // TODO: Implementar exportação mobile dark específica
      mostrarNotificacaoSucessoMobile("Função em desenvolvimento - Confrontos Mobile HD");
    },
  });
}

// FUNÇÃO ESPECÍFICA PARA CRIAÇÃO DE BOTÃO MOBILE DARK - PONTOS CORRIDOS CLASSIFICAÇÃO
export function criarBotaoMobileDarkPontosCorridosClassificacao(config) {
  return criarBotaoExportacaoMobileDark({
    ...config,
    className: "btn-export-mobile-dark-pontos-corridos-classificacao",
    textoIcone: "📱",
    textoBotao: "Exportar Classificação Mobile HD",
    funcaoExportacao: async (dados) => {
      // Aqui será implementada a função de exportação mobile dark para classificação
      console.log("[EXPORT-BASE-MOBILE-DARK] Exportando classificação mobile HD:", dados);
      // TODO: Implementar exportação mobile dark específica
      mostrarNotificacaoSucessoMobile("Função em desenvolvimento - Classificação Mobile HD");
    },
  });
}

// FUNÇÃO ESPECÍFICA PARA CRIAÇÃO DE BOTÃO MOBILE DARK - PONTOS CORRIDOS HISTÓRICO
export function criarBotaoMobileDarkPontosCorridosHistorico(config) {
  return criarBotaoExportacaoMobileDark({
    ...config,
    className: "btn-export-mobile-dark-pontos-corridos-historico",
    textoIcone: "📱",
    textoBotao: "Exportar Histórico Mobile HD",
    funcaoExportacao: async (dados) => {
      // Aqui será implementada a função de exportação mobile dark para histórico
      console.log("[EXPORT-BASE-MOBILE-DARK] Exportando histórico mobile HD:", dados);
      // TODO: Implementar exportação mobile dark específica
      mostrarNotificacaoSucessoMobile("Função em desenvolvimento - Histórico Mobile HD");
    },
  });
}

// EXTENSÃO DO UTILITÁRIO MOBILE DARK UTILS
MobileDarkUtils.criarBotao = criarBotaoExportacaoMobileDark;
MobileDarkUtils.criarBotaoPontosCorridosRodada = criarBotaoMobileDarkPontosCorridosRodada;
MobileDarkUtils.criarBotaoPontosCorridosClassificacao = criarBotaoMobileDarkPontosCorridosClassificacao;
MobileDarkUtils.criarBotaoPontosCorridosHistorico = criarBotaoMobileDarkPontosCorridosHistorico;

console.log("[EXPORT-BASE-MOBILE-DARK] ✅ Utilitários de botões Mobile Dark configurados");
console.log("[EXPORT-BASE-MOBILE-DARK] 🎯 Funções disponíveis: criarBotao, criarBotaoPontosCorridosRodada, criarBotaoPontosCorridosClassificacao, criarBotaoPontosCorridosHistorico");


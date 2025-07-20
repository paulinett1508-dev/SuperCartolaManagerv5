// ✅ SISTEMA DE EXPORTAÇÃO PROFISSIONAL - TOP 10
// Padrão UX modular, vertical, compacto e bonito

// ✅ CONFIGURAÇÃO DO TEMPLATE PROFISSIONAL
const TEMPLATE_CONFIG = {
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
    mitos: "#198754", // Verde para mitos
    micos: "#dc3545", // Vermelho para micos
  },
  fonts: {
    title: "28px Inter, sans-serif",
    subtitle: "18px Inter, sans-serif",
    heading: "16px Inter, sans-serif",
    body: "13px Inter, sans-serif",
    caption: "11px Inter, sans-serif",
  },
};

console.log("[EXPORT-TOP10] ✅ Módulo carregado com sucesso");

/**
 * Exporta o Top10 como imagem PNG
 * @param {Array} dados - Array com dados do top10
 * @param {string} tipo - 'mitos' ou 'micos'
 * @param {number} rodada - Número da rodada
 * @param {Object} valoresBonusOnus - Valores de bônus/ônus da liga
 * @returns {Promise<void>}
 */
async function exportarTop10ComoImagem(
  dados,
  tipo,
  rodada,
  valoresBonusOnus = {},
) {
  try {
    console.log("[EXPORT-TOP10] 🎨 Iniciando exportação:", {
      dados: dados.length,
      tipo,
      rodada,
    });

    await exportarTop10ComoImagemProfissional({
      dados,
      tipo,
      rodada,
      valoresBonusOnus,
    });
  } catch (error) {
    console.error("[EXPORT-TOP10] ❌ Erro ao exportar imagem:", error);
    throw error;
  }
}

// ✅ FUNÇÃO DE EXPORTAÇÃO PROFISSIONAL
async function exportarTop10ComoImagemProfissional(config) {
  const { dados, tipo, rodada, valoresBonusOnus } = config;

  console.log("[EXPORT-TOP10] 🎨 Criando layout profissional...");

  // Criar container de exportação invisível
  const exportContainer = document.createElement("div");
  exportContainer.id = "top10-export-container";
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
  exportContainer.innerHTML = criarLayoutTop10({
    dados,
    tipo,
    rodada,
    valoresBonusOnus,
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

    console.log("[EXPORT-TOP10] 📸 Capturando imagem...");

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

    // Extrair número da rodada
    const rodadaNumero =
      typeof rodada === "object" && rodada !== null
        ? rodada.numero || rodada.id || rodada.rodada || "atual"
        : rodada || "atual";

    // Gerar nome do arquivo
    const timestamp = new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const nomeArquivo = `top10-${tipo}-rodada-${rodadaNumero}-${timestamp}`;

    // Download da imagem
    const link = document.createElement("a");
    link.download = `${nomeArquivo}.png`;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();

    console.log(`[EXPORT-TOP10] ✅ Imagem exportada: ${link.download}`);
    mostrarNotificacao("Imagem exportada com sucesso!", "success");
  } finally {
    // Remover container temporário
    document.body.removeChild(exportContainer);
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT PROFISSIONAL
function criarLayoutTop10({ dados, tipo, rodada, valoresBonusOnus }) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Extrair número da rodada
  const rodadaNumero =
    typeof rodada === "object" && rodada !== null
      ? rodada.numero || rodada.id || rodada.rodada || "ATUAL"
      : rodada || "ATUAL";

  const titulo = tipo === "mitos" ? "TOP 10 MITOS" : "TOP 10 MICOS";
  const subtitulo = `Rodada ${rodadaNumero}`;
  const corTema =
    tipo === "mitos"
      ? TEMPLATE_CONFIG.colors.mitos
      : TEMPLATE_CONFIG.colors.micos;

  return `
    <!-- HEADER PROFISSIONAL COM LOGO GARANTIDA -->
    <div style="
      background: linear-gradient(135deg, ${corTema} 0%, ${tipo === "mitos" ? "#198754" : "#dc3545"} 100%);
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

      <!-- TABELA DE TOP 10 -->
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
          color: ${corTema};
        ">${tipo === "mitos" ? "🏆 MAIORES PONTUAÇÕES" : "😅 MENORES PONTUAÇÕES"}</h3>

        <div style="display: grid; gap: ${TEMPLATE_CONFIG.cardSpacing}px;">
          ${dados
            .slice(0, 10)
            .map((item, index) =>
              criarCardCartoleiro(item, index, tipo, valoresBonusOnus),
            )
            .join("")}
        </div>
      </div>

      <!-- INFORMAÇÕES ADICIONAIS -->
      <div style="
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
      ">
        <!-- Participantes -->
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
          ">👥 Participantes</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${dados.length} times
          </p>
        </div>

        <!-- Pontuação Média -->
        <div style="
          background: linear-gradient(135deg, ${corTema}, ${tipo === "mitos" ? "#198754" : "#dc3545"});
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
          ">📊 Média</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${(dados.reduce((acc, t) => acc + (parseFloat(t.pontos) || 0), 0) / dados.length).toFixed(2).replace(".", ",")} pts
          </p>
        </div>

        <!-- Destaque -->
        <div style="
          background: linear-gradient(135deg, ${tipo === "mitos" ? "#ffd700" : "#6c757d"}, ${tipo === "mitos" ? "#ffed4a" : "#495057"});
          color: ${tipo === "mitos" ? "#856404" : "white"};
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        ">
          <h4 style="
            font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">${tipo === "mitos" ? "🏆 Líder" : "😅 Último"}</h4>
          <p style="font: 700 18px Inter, sans-serif; margin: 0;">
            ${dados[0] ? (parseFloat(dados[0].pontos) || 0).toFixed(2).replace(".", ",") : "0,00"} pts
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
        Gerado em ${dataFormatada} • SuperCartola Manager v2.4.1<br>
        Sistema de Gerenciamento de Ligas do Cartola FC
      </p>
    </div>
  `;
}

// ✅ FUNÇÃO PARA CRIAR CARD DE CARTOLEIRO
function criarCardCartoleiro(item, index, tipo, valoresBonusOnus) {
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

  // Cores especiais para primeiras posições
  let corFundo = "#ffffff";
  let corBorda = TEMPLATE_CONFIG.colors.border;
  let icone = "";

  if (posicao === 1) {
    corFundo = tipo === "mitos" ? "#d4edda" : "#f8d7da";
    corBorda = tipo === "mitos" ? "#c3e6cb" : "#f5c6cb";
    icone = tipo === "mitos" ? "🏆" : "😅";
  } else if (posicao === 2) {
    icone = tipo === "mitos" ? "🥈" : "😰";
  } else if (posicao === 3) {
    icone = tipo === "mitos" ? "🥉" : "😬";
  }

  return `
    <div style="
      background: ${corFundo};
      border-radius: 8px;
      padding: 12px;
      border: 1px solid ${corBorda};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      display: grid;
      grid-template-columns: 40px 40px 1fr auto;
      align-items: center;
      gap: 12px;
    ">
      <!-- Posição -->
      <div style="
        text-align: center;
        font: 700 16px Inter, sans-serif;
        color: ${tipo === "mitos" ? TEMPLATE_CONFIG.colors.mitos : TEMPLATE_CONFIG.colors.micos};
      ">
        ${posicao}º
      </div>

      <!-- Escudo -->
      <div style="text-align: center;">
        ${
          item.clube_id
            ? `<img src="/escudos/${item.clube_id}.png" 
                 style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid ${TEMPLATE_CONFIG.colors.border};" 
                 onerror="this.outerHTML='<div style=\\'width:32px;height:32px;background:${TEMPLATE_CONFIG.colors.surface};border:1px solid ${TEMPLATE_CONFIG.colors.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;\\'>⚽</div>'">`
            : `<div style="width:32px;height:32px;background:${TEMPLATE_CONFIG.colors.surface};border:1px solid ${TEMPLATE_CONFIG.colors.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;">❤️</div>`
        }
      </div>

      <!-- Nome -->
      <div>
        <div style="
          font: 600 14px Inter, sans-serif;
          color: ${TEMPLATE_CONFIG.colors.text};
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          ${icone} ${item.nome_cartola || item.nome_cartoleiro || "N/D"}
        </div>
        <div style="
          font: ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
          color: ${TEMPLATE_CONFIG.colors.textLight};
        ">
          ${item.nome_time || "Time não informado"}
        </div>
      </div>

      <!-- Pontos -->
      <div style="
        text-align: right;
        background: ${tipo === "mitos" ? TEMPLATE_CONFIG.colors.mitos : TEMPLATE_CONFIG.colors.micos};
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font: 700 16px Inter, sans-serif;
        min-width: 80px;
      ">
        ${pontos.toFixed(2).replace(".", ",")}
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

/**
 * Função auxiliar para verificar se o módulo está funcionando
 * @returns {boolean}
 */
function testarModulo() {
  console.log("[EXPORT-TOP10] ✅ Módulo carregado e funcionando");
  return true;
}

// ==========================================
// SISTEMA DE EXPORTAÇÃO PARA COMPATIBILIDADE
// ==========================================

// Objeto principal de exportação
const exportTop10Functions = {
  exportarTop10ComoImagem: exportarTop10ComoImagem,
  testarModulo: testarModulo,
};

// Garantir que as funções existem no escopo global
console.log("[EXPORT-TOP10] 🔧 Definindo funções no escopo global...");

// Definir no window de todas as formas possíveis
if (typeof window !== "undefined") {
  // Método 1: Definição direta
  window.exportarTop10ComoImagem = exportarTop10ComoImagem;
  window.testarModulo = testarModulo;

  // Método 2: Objeto namespace
  window.exportTop10 = exportTop10Functions;

  // Método 3: Para módulos ES6 (caso necessário)
  window.exportTop10Module = exportTop10Functions;

  // Método 4: Definir também no próprio script tag (se existir)
  if (document.currentScript) {
    document.currentScript.exportarTop10ComoImagem = exportarTop10ComoImagem;
    document.currentScript.testarModulo = testarModulo;
    // CRITICAL: Para sistemas de carregamento dinâmico
    document.currentScript.exports = exportTop10Functions;
    document.currentScript.module = { exports: exportTop10Functions };
  }

  // Método 5: CRÍTICO - Para sistemas que esperam retorno direto do script
  if (typeof window._lastLoadedModule === "undefined") {
    window._lastLoadedModule = exportTop10Functions;
  }

  // Método 6: Para compatibilidade com require.js style
  if (typeof window.define === "function") {
    try {
      window.define([], function () {
        return exportTop10Functions;
      });
    } catch (e) {
      // Se define já foi usado, ignora
    }
  }

  // Método 7: Tentar descobrir como o export-exports carrega e definir lá
  const scripts = document.querySelectorAll('script[src*="export-top10"]');
  scripts.forEach((script) => {
    script.moduleExports = exportTop10Functions;
    script.exports = exportTop10Functions;
  });
}

// Para Node.js e CommonJS - CRÍTICO para sistemas de carregamento dinâmico
if (typeof module !== "undefined" && module.exports) {
  module.exports = exportTop10Functions;
  // Também definir as funções individualmente
  module.exports.exportarTop10ComoImagem = exportarTop10ComoImagem;
  module.exports.testarModulo = testarModulo;
}

// Para AMD (require.js) - com retorno correto
if (typeof define === "function" && define.amd) {
  define([], function () {
    return exportTop10Functions;
  });
}

// HACK CRÍTICO: Para sistemas que carregam scripts dinamicamente
// Alguns sistemas esperam que o último script definido tenha exports
setTimeout(() => {
  const allScripts = document.querySelectorAll("script");
  const lastScript = allScripts[allScripts.length - 1];
  if (lastScript && lastScript.src && lastScript.src.includes("export-top10")) {
    lastScript.moduleExports = exportTop10Functions;
    lastScript.exports = exportTop10Functions;
  }

  // Definir também globalmente para sistemas que procuram por exports globais
  window.exports = window.exports || {};
  Object.assign(window.exports, exportTop10Functions);

  window.module = window.module || {};
  window.module.exports = Object.assign(
    window.module.exports || {},
    exportTop10Functions,
  );
}, 10);

// Log final detalhado de verificação
console.log("[EXPORT-TOP10] 📦 Módulo inicializado - funções disponíveis:", {
  exportarTop10ComoImagem: typeof exportarTop10ComoImagem === "function",
  testarModulo: typeof testarModulo === "function",
});

if (typeof window !== "undefined") {
  console.log("[EXPORT-TOP10] 🔧 Funções exportadas para window:", {
    "window.exportarTop10ComoImagem":
      typeof window.exportarTop10ComoImagem === "function",
    "window.testarModulo": typeof window.testarModulo === "function",
    "window.exportTop10": typeof window.exportTop10 === "object",
    "window.exportTop10Module": typeof window.exportTop10Module === "object",
    "window._lastLoadedModule": typeof window._lastLoadedModule === "object",
  });

  console.log("[EXPORT-TOP10] 🧪 Teste de acesso direto:");
  console.log(
    "[EXPORT-TOP10]   - exportarTop10ComoImagem:",
    typeof exportarTop10ComoImagem,
  );
  console.log(
    "[EXPORT-TOP10]   - window.exportarTop10ComoImagem:",
    typeof window.exportarTop10ComoImagem,
  );

  // Teste final para garantir que as funções estão acessíveis
  try {
    const testeExportacao =
      window.exportarTop10ComoImagem &&
      typeof window.exportarTop10ComoImagem === "function";
    const testeTeste =
      window.testarModulo && typeof window.testarModulo === "function";

    console.log("[EXPORT-TOP10] ✅ Verificação final:", {
      exportarTop10ComoImagem: testeExportacao,
      testarModulo: testeTeste,
      moduloFuncionando: testeExportacao && testeTeste,
      objetoExportado: typeof exportTop10Functions === "object",
      funcoes: Object.keys(exportTop10Functions),
    });

    if (testeExportacao && testeTeste) {
      console.log(
        "[EXPORT-TOP10] 🎉 Módulo totalmente funcional e exportado com sucesso!",
      );

      // ÚLTIMO RECURSO: Tentar registrar de todas as formas possíveis
      const registros = [
        "window.exportTop10Functions",
        "window.top10Exports",
        "window.moduleExports",
        "globalThis.exportTop10Functions",
      ];

      registros.forEach((registro) => {
        try {
          eval(`${registro} = exportTop10Functions`);
          console.log(`[EXPORT-TOP10] ✅ Registrado em: ${registro}`);
        } catch (e) {
          console.log(`[EXPORT-TOP10] ⚠️ Falha ao registrar em: ${registro}`);
        }
      });
    } else {
      console.warn(
        "[EXPORT-TOP10] ⚠️ Possível problema na exportação das funções",
      );
    }
  } catch (error) {
    console.error("[EXPORT-TOP10] ❌ Erro na verificação final:", error);
  }
}

// ==========================================
// EXPORTS ES6 PARA COMPATIBILIDADE COM EXPORT-EXPORTS.JS
// ==========================================

// Exportar funções usando export statements ES6
export { exportarTop10ComoImagem };
export { testarModulo };

// Export default do objeto completo
export default exportTop10Functions;

console.log("[EXPORT-TOP10] ✅ Módulo carregado sem erros de sintaxe!");

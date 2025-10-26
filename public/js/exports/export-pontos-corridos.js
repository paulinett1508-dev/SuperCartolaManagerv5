// SISTEMA DE EXPORTAÇÃO PONTOS CORRIDOS - ULTRA HD v4.0.0
// VERSÃO PREMIUM com design completo da tela + resolução 4K
// Mantém compatibilidade com funções antigas + nova versão ULTRA HD

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log(
  "[EXPORT-PONTOS-CORRIDOS-ULTRA-HD] Sistema Ultra HD v4.0.0 PREMIUM carregado",
);

// ✅ FUNÇÃO PARA EXPORTAÇÃO DE CONFRONTOS DA RODADA
export async function criarBotaoExportacaoPontosCorridosRodada(config) {
  console.log(
    "[EXPORT-PONTOS-CORRIDOS] criarBotaoExportacaoPontosCorridosRodada",
    config,
  );

  if (!config || typeof config !== "object") {
    console.error(
      "[EXPORT-PONTOS-CORRIDOS-RODADA] Configuração inválida:",
      config,
    );
    return;
  }

  const {
    containerId,
    jogos = [],
    rodadaLiga = "",
    rodadaCartola = "",
  } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-PONTOS-CORRIDOS-RODADA] Container ${containerId} não encontrado - Tentando novamente em 500ms`,
    );
    setTimeout(() => {
      criarBotaoExportacaoPontosCorridosRodada(config);
    }, 500);
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-pontos-corridos-rodada-ultra-hd",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: center; margin: 20px 0;";

  // Criar botão para Rodada
  const btn = document.createElement("button");
  btn.className = "btn-export-pontos-corridos-rodada-ultra-hd";
  btn.innerHTML = `
  <div style="display: flex; align-items: center; gap: 12px;">
    <span style="font-size: 18px;">⚡</span>
    <div>
      <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">Exportar Confrontos</div>
      <div style="font-size: 10px; opacity: 0.9;">Rodada ${rodadaLiga} • Brasileirão R${rodadaCartola}</div>
    </div>
  </div>
`;

  btn.style.cssText = `
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: 2px solid #3b82f6;
  padding: 18px 28px;
  border-radius: 16px;
  cursor: pointer;
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 600;
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 280px;
  text-transform: none;
`;

  // Efeitos hover
  btn.onmouseover = () => {
    btn.style.transform = "translateY(-4px) scale(1.03)";
    btn.style.boxShadow = "0 16px 50px rgba(59, 130, 246, 0.7)";
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0) scale(1)";
    btn.style.boxShadow = "0 8px 30px rgba(59, 130, 246, 0.5)";
  };

  btn.onclick = async () => {
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="
        width: 24px; 
        height: 24px; 
        border: 3px solid rgba(255,255,255,0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      "></div>
      <span>Gerando imagem...</span>
    </div>
  `;
    btn.disabled = true;

    try {
      await exportarPontosCorridosRodadaMobileHD(
        jogos,
        rodadaLiga,
        rodadaCartola,
      );
    } catch (error) {
      console.error(
        "[EXPORT-PONTOS-CORRIDOS-RODADA] Erro na exportação:",
        error,
      );
      MobileDarkUtils.mostrarErro("Erro ao gerar confrontos. Tente novamente.");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // Adicionar animação CSS se não existir
  if (!document.getElementById("export-ultra-hd-animations")) {
    const style = document.createElement("style");
    style.id = "export-ultra-hd-animations";
    style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
    document.head.appendChild(style);
  }

  btnContainer.appendChild(btn);
  container.appendChild(btnContainer);

  console.log("[EXPORT-PONTOS-CORRIDOS-RODADA] ✅ Botão ULTRA HD criado");
}

// ✅ CONFIGURAÇÃO MOBILE-FIRST - RESOLUÇÃO OTIMIZADA
const MOBILE_OPTIMIZED_CONFIG = {
  width: 720, // 720px base (ideal para mobile)
  scale: 2, // 2x scale = 1440px final (Full HD mobile perfeito)
  quality: 0.95,
  padding: 20,
  fontSize: {
    title: 28,
    subtitle: 16,
    heading: 22,
    body: 14,
    small: 12,
    caption: 10,
  },
  spacing: {
    card: 12,
    section: 16,
    item: 10,
  },
  ...MOBILE_DARK_HD_CONFIG,
};

// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO - CLASSIFICAÇÃO ULTRA HD
export async function criarBotaoExportacaoPontosCorridosClassificacao(config) {
  if (!config || typeof config !== "object") {
    console.error(
      "[EXPORT-PONTOS-CORRIDOS-ULTRA-HD] Configuração inválida:",
      config,
    );
    return;
  }

  const {
    containerId,
    times = [],
    rodadaLiga = "",
    rodadaCartola = "",
  } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-PONTOS-CORRIDOS-ULTRA-HD] Container ${containerId} não encontrado - Tentando novamente em 500ms`,
    );
    setTimeout(() => {
      criarBotaoExportacaoPontosCorridosClassificacao(config);
    }, 500);
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-pontos-corridos-classificacao-ultra-hd",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar container do botão
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  // Criar botão de Classificação
  const btn = document.createElement("button");
  btn.className = "btn-export-pontos-corridos-classificacao-ultra-hd";
  btn.innerHTML = `
  <div style="display: flex; align-items: center; gap: 12px;">
    <span style="font-size: 18px;">🏆</span>
    <div>
      <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">Exportar Classificação</div>
      <div style="font-size: 10px; opacity: 0.9;">Rodada ${rodadaLiga} • Brasileirão R${rodadaCartola}</div>
    </div>
  </div>
`;

  btn.style.cssText = `
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  border: 2px solid #22c55e;
  padding: 18px 28px;
  border-radius: 16px;
  cursor: pointer;
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 600;
  box-shadow: 0 8px 30px rgba(34, 197, 94, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 280px;
  text-transform: none;
`;

  // Efeitos hover
  btn.onmouseover = () => {
    btn.style.transform = "translateY(-4px) scale(1.03)";
    btn.style.boxShadow = "0 16px 50px rgba(34, 197, 94, 0.7)";
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0) scale(1)";
    btn.style.boxShadow = "0 8px 30px rgba(34, 197, 94, 0.5)";
  };

  btn.onclick = async () => {
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="
        width: 24px; 
        height: 24px; 
        border: 3px solid rgba(255,255,255,0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      "></div>
      <span>Gerando imagem...</span>
    </div>
  `;
    btn.disabled = true;

    try {
      await exportarPontosCorridosClassificacaoMobileHD(
        times,
        rodadaLiga,
        rodadaCartola,
      );
    } catch (error) {
      console.error(
        "[EXPORT-PONTOS-CORRIDOS-ULTRA-HD] Erro na exportação:",
        error,
      );
      MobileDarkUtils.mostrarErro(
        "Erro ao gerar classificação. Tente novamente.",
      );
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  // Adicionar animação CSS se não existir
  if (!document.getElementById("export-ultra-hd-animations")) {
    const style = document.createElement("style");
    style.id = "export-ultra-hd-animations";
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

  console.log("[EXPORT-PONTOS-CORRIDOS-ULTRA-HD] ✅ Botão ULTRA HD criado");
}

// EXPORTAÇÃO MOBILE HD - CLASSIFICAÇÃO COM DESIGN COMPLETO
async function exportarPontosCorridosClassificacaoMobileHD(
  times,
  rodadaLiga,
  rodadaCartola,
) {
  console.log(
    "[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] 🎨 Criando layout Mobile HD otimizado...",
  );

  // Validar dados
  MobileDarkUtils.validarDadosMobile({ times }, ["times"]);

  // Definir títulos
  const titulo = `🏆 Classificação Geral`;
  const subtitulo = `Após ${rodadaLiga}ª rodada • Brasileirão R${rodadaCartola}`;

  // Criar container Mobile HD (720px base)
  const exportContainer = criarContainerMobileHD(titulo, subtitulo, {
    rodada: rodadaLiga,
  });

  const contentDiv = exportContainer.querySelector("#mobile-hd-export-content");

  // Inserir conteúdo da classificação Mobile HD
  contentDiv.innerHTML = criarLayoutClassificacaoMobileHD(
    times,
    rodadaLiga,
    rodadaCartola,
  );

  document.body.appendChild(exportContainer);

  try {
    // Aguardar renderização e carregamento de imagens
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const imagens = exportContainer.querySelectorAll("img");
    if (imagens.length > 0) {
      console.log(
        `[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] 🖼️ Aguardando ${imagens.length} imagens...`,
      );
      await Promise.allSettled(
        Array.from(imagens).map((img) => {
          return new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            } else {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 3000);
            }
          });
        }),
      );
    }

    // Gerar nome do arquivo
    const nomeArquivo = `classificacao_mobile_hd_rodada_${rodadaLiga}_${Date.now()}.png`;

    // Gerar e fazer download da imagem Mobile HD
    await gerarCanvasMobileHD(exportContainer, nomeArquivo);
  } finally {
    // Limpar container temporário
    if (exportContainer.parentNode === document.body) {
      document.body.removeChild(exportContainer);
    }
  }
}

// CRIAR CONTAINER MOBILE HD OTIMIZADO
function criarContainerMobileHD(titulo, subtitulo, metadata = {}) {
  const container = document.createElement("div");
  container.id = "mobile-hd-export-container";
  container.style.cssText = `
    position: fixed;
    top: -99999px;
    left: -99999px;
    width: ${MOBILE_OPTIMIZED_CONFIG.width}px;
    background: #0a0a0a;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    z-index: 999999;
    overflow: hidden;
  `;

  container.innerHTML = `
    <!-- HEADER PREMIUM COM GRADIENTE -->
    <div style="
      background: linear-gradient(135deg, #ff4500 0%, #d63920 100%);
      padding: ${MOBILE_OPTIMIZED_CONFIG.padding}px;
      text-align: center;
      position: relative;
      overflow: hidden;
      border-bottom: 3px solid rgba(255,215,0,0.6);
      box-shadow: 0 6px 24px rgba(255, 69, 0, 0.4);
    ">
      <!-- Padrão de fundo -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: 
          repeating-linear-gradient(
            45deg,
            rgba(255,255,255,0.03) 0px,
            rgba(255,255,255,0.03) 10px,
            transparent 10px,
            transparent 20px
          );
      "></div>

      <div style="position: relative; z-index: 1;">
        <!-- Título Principal -->
        <h1 style="
          font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.title}px;
          font-weight: 900;
          color: white;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
          text-shadow: 0 3px 12px rgba(0,0,0,0.5);
          line-height: 1.1;
        ">${titulo}</h1>

        <!-- Subtítulo -->
        <p style="
          font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.subtitle}px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
          margin: 0;
          text-shadow: 0 2px 6px rgba(0,0,0,0.4);
        ">${subtitulo}</p>

      </div>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div id="mobile-hd-export-content" style="
      padding: ${MOBILE_OPTIMIZED_CONFIG.padding}px;
      background: #0a0a0a;
    "></div>

    <!-- FOOTER PREMIUM -->
    <div style="
      padding: ${MOBILE_OPTIMIZED_CONFIG.padding}px;
      background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
      border-top: 2px solid rgba(255, 69, 0, 0.3);
      text-align: center;
    ">
      <div style="
        font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
        font-weight: 600;
        color: rgba(255,255,255,0.6);
        letter-spacing: 0.5px;
      ">
        🏆 Super Cartola Manager • ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  `;

  return container;
}

// LAYOUT CLASSIFICAÇÃO MOBILE HD - DESIGN COMPLETO E OTIMIZADO
function criarLayoutClassificacaoMobileHD(times, rodadaLiga, rodadaCartola) {
  const totalTimes = times.length;
  const lider = times.length > 0 ? times[0] : null;

  return `
  <!-- CARD LÍDER PREMIUM MOBILE -->
  <div style="
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border-radius: 16px;
    padding: ${MOBILE_OPTIMIZED_CONFIG.spacing.section}px;
    margin-bottom: ${MOBILE_OPTIMIZED_CONFIG.spacing.section}px;
    border: 2px solid rgba(34, 197, 94, 0.5);
    box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
    position: relative;
    overflow: hidden;
  ">
    <!-- Padrão de fundo -->
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        repeating-linear-gradient(
          -45deg,
          rgba(255,255,255,0.03) 0px,
          rgba(255,255,255,0.03) 10px,
          transparent 10px,
          transparent 20px
        );
    "></div>

    ${
      lider
        ? `
      <div style="position: relative; z-index: 1; display: flex; align-items: center; gap: ${MOBILE_OPTIMIZED_CONFIG.spacing.card}px;">
        <!-- Troféu -->
        <div style="
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 4px 16px rgba(255,215,0,0.6);
          border: 3px solid rgba(255,255,255,0.3);
          flex-shrink: 0;
        ">🏆</div>

        <!-- Escudo -->
        ${
          lider.clube_id
            ? `
          <img src="/escudos/${lider.clube_id}.png"
               style="
                 width: 44px; 
                 height: 44px; 
                 border-radius: 50%; 
                 border: 3px solid rgba(255,255,255,0.5);
                 background: white;
                 box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                 flex-shrink: 0;
               "
               onerror="this.style.display='none'"
               alt="Escudo">
        `
            : ""
        }

        <!-- Informações do Líder -->
        <div style="flex: 1; min-width: 0;">
          <div style="
            font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption}px;
            font-weight: 700;
            color: rgba(255,255,255,0.9);
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">👑 LÍDER</div>

          <div style="
            font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px;
            font-weight: 900;
            color: white;
            margin-bottom: 4px;
            text-shadow: 0 2px 8px rgba(0,0,0,0.3);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${lider.nome_cartola || lider.nome_cartoleiro || "N/D"}</div>

          <!-- Estatísticas do Líder -->
          <div style="
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          ">
            <!-- Pontos -->
            <div style="
              background: rgba(255,255,255,0.2);
              backdrop-filter: blur(10px);
              padding: 6px 10px;
              border-radius: 10px;
              border: 1.5px solid rgba(255,255,255,0.3);
            ">
              <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption - 1}px; color: rgba(255,255,255,0.8); font-weight: 600; margin-bottom: 2px;">PTS</div>
              <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px; font-weight: 900; color: white; line-height: 1;">${lider.pontos || 0}</div>
            </div>

            <!-- Vitórias -->
            <div style="
              background: rgba(255,255,255,0.2);
              backdrop-filter: blur(10px);
              padding: 6px 10px;
              border-radius: 10px;
              border: 1.5px solid rgba(255,255,255,0.3);
            ">
              <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption - 1}px; color: rgba(255,255,255,0.8); font-weight: 600; margin-bottom: 2px;">VIT</div>
              <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px; font-weight: 900; color: white; line-height: 1;">${lider.vitorias || 0}</div>
            </div>

            <!-- Aproveitamento -->
            <div style="
              background: rgba(255,255,255,0.2);
              backdrop-filter: blur(10px);
              padding: 6px 10px;
              border-radius: 10px;
              border: 1.5px solid rgba(255,255,255,0.3);
            ">
              <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption - 1}px; color: rgba(255,255,255,0.8); font-weight: 600; margin-bottom: 2px;">APROV</div>
              <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px; font-weight: 900; color: white; line-height: 1;">
                ${lider.jogos > 0 ? ((lider.pontos / (lider.jogos * 3)) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>

            <!-- Financeiro -->
            <div style="
              background: ${(lider.financeiroTotal || 0) >= 0 ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"};
              backdrop-filter: blur(10px);
              padding: 6px 10px;
              border-radius: 10px;
              border: 1.5px solid ${(lider.financeiroTotal || 0) >= 0 ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)"};
            ">
              <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption - 1}px; color: rgba(255,255,255,0.8); font-weight: 600; margin-bottom: 2px;">R$</div>
              <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px; font-weight: 900; color: white; line-height: 1;">
                ${(lider.financeiroTotal || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `
        : `
      <div style="position: relative; z-index: 1; text-align: center; color: rgba(255,255,255,0.8); font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.body}px;">
        Nenhum dado disponível
      </div>
    `
    }
  </div>

  <!-- TABELA CLASSIFICAÇÃO PREMIUM -->
  <div style="
    background: #1a1a1a;
    border-radius: 16px;
    overflow: hidden;
    border: 2px solid rgba(255, 69, 0, 0.3);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  ">
    <!-- Header da Tabela -->
    <div style="
      background: linear-gradient(135deg, #ff4500 0%, #d63920 100%);
      padding: ${MOBILE_OPTIMIZED_CONFIG.spacing.card}px ${MOBILE_OPTIMIZED_CONFIG.padding}px;
      border-bottom: 2px solid rgba(255,215,0,0.5);
    ">
      <h2 style="
        font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px;
        font-weight: 800;
        color: white;
        margin: 0 0 8px 0;
        letter-spacing: 0.5px;
        text-align: center;
        text-shadow: 0 2px 6px rgba(0,0,0,0.4);
      ">📊 CLASSIFICAÇÃO</h2>

      <!-- Cabeçalhos das Colunas -->
      <div style="
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption - 1}px;
        font-weight: 700;
        color: rgba(255,255,255,0.9);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">
        <div style="min-width: 28px; text-align: center; flex-shrink: 0;">Pos</div>
        <div style="width: 28px; flex-shrink: 0;"></div>
        <div style="flex: 1; min-width: 0;">Time</div>
        <div style="min-width: 36px; text-align: right; flex-shrink: 0;">Pts</div>
        <div style="min-width: 24px; text-align: right; flex-shrink: 0;">J</div>
        <div style="min-width: 24px; text-align: right; flex-shrink: 0;">V</div>
        <div style="min-width: 24px; text-align: right; flex-shrink: 0;">E</div>
        <div style="min-width: 24px; text-align: right; flex-shrink: 0;">D</div>
        <div style="min-width: 28px; text-align: right; flex-shrink: 0;">GP</div>
        <div style="min-width: 38px; text-align: right; flex-shrink: 0;">SG</div>
        <div style="min-width: 42px; text-align: right; flex-shrink: 0;">%</div>
        <div style="min-width: 50px; text-align: right; flex-shrink: 0;">R$</div>
      </div>
    </div>

    <!-- Linhas da Classificação -->
    <div>
      ${times.map((time, index) => criarLinhaClassificacaoMobileHD(time, index)).join("")}
    </div>
  </div>

  <!-- ESTATÍSTICAS GERAIS -->
  <div style="
    margin-top: ${MOBILE_OPTIMIZED_CONFIG.spacing.section}px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: ${MOBILE_OPTIMIZED_CONFIG.spacing.item}px;
  ">
    <!-- Total Times -->
    <div style="
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 12px;
      padding: ${MOBILE_OPTIMIZED_CONFIG.spacing.card}px;
      text-align: center;
      border: 2px solid rgba(59, 130, 246, 0.4);
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
    ">
      <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption}px; color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 4px;">👥</div>
      <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px; font-weight: 900; color: white; line-height: 1;">${totalTimes}</div>
    </div>

    <!-- Rodada -->
    <div style="
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 12px;
      padding: ${MOBILE_OPTIMIZED_CONFIG.spacing.card}px;
      text-align: center;
      border: 2px solid rgba(34, 197, 94, 0.4);
      box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
    ">
      <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption}px; color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 4px;">📅</div>
      <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px; font-weight: 900; color: white; line-height: 1;">${rodadaLiga}ª</div>
    </div>

    <!-- Total Jogos -->
    <div style="
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-radius: 12px;
      padding: ${MOBILE_OPTIMIZED_CONFIG.spacing.card}px;
      text-align: center;
      border: 2px solid rgba(245, 158, 11, 0.4);
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
    ">
      <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption}px; color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 4px;">⚔️</div>
      <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px; font-weight: 900; color: white; line-height: 1;">
        ${times.reduce((acc, time) => acc + (time.jogos || 0), 0)}
      </div>
    </div>

    <!-- Goleadas -->
    <div style="
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 12px;
      padding: ${MOBILE_OPTIMIZED_CONFIG.spacing.card}px;
      text-align: center;
      border: 2px solid rgba(239, 68, 68, 0.4);
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
    ">
      <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption}px; color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 4px;">🔥</div>
      <div style="font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px; font-weight: 900; color: white; line-height: 1;">
        ${times.reduce((acc, time) => acc + (time.pontosGoleada || 0), 0)}
      </div>
    </div>
  </div>
  `;
}

// LINHA INDIVIDUAL CLASSIFICAÇÃO MOBILE HD - FORMATO TABELA HORIZONTAL COMPACTA
function criarLinhaClassificacaoMobileHD(time, index) {
  const posicao = index + 1;
  const aproveitamento =
    time.jogos > 0 ? (time.pontos / (time.jogos * 3)) * 100 : 0;

  // Determinar estilo baseado na posição
  let bgGradient, borderColor, posicaoIcon, posicaoColor;

  if (posicao === 1) {
    bgGradient =
      "linear-gradient(90deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.05) 100%)";
    borderColor = "#ffd700";
    posicaoIcon = "🥇";
    posicaoColor = "#ffd700";
  } else if (posicao === 2) {
    bgGradient =
      "linear-gradient(90deg, rgba(192,192,192,0.2) 0%, rgba(192,192,192,0.05) 100%)";
    borderColor = "#c0c0c0";
    posicaoIcon = "🥈";
    posicaoColor = "#c0c0c0";
  } else if (posicao === 3) {
    bgGradient =
      "linear-gradient(90deg, rgba(205,127,50,0.2) 0%, rgba(205,127,50,0.05) 100%)";
    borderColor = "#cd7f32";
    posicaoIcon = "🥉";
    posicaoColor = "#cd7f32";
  } else if (posicao <= 6) {
    bgGradient =
      "linear-gradient(90deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)";
    borderColor = "rgba(34,197,94,0.4)";
    posicaoIcon = `${posicao}º`;
    posicaoColor = "#22c55e";
  } else {
    bgGradient =
      "linear-gradient(90deg, rgba(42,42,42,0.6) 0%, rgba(26,26,26,0.3) 100%)";
    borderColor = "rgba(255,255,255,0.1)";
    posicaoIcon = `${posicao}º`;
    posicaoColor = "rgba(255,255,255,0.6)";
  }

  const saldoColor = (time.saldoPontos || 0) >= 0 ? "#22c55e" : "#ef4444";
  const financeiroColor =
    (time.financeiroTotal || 0) >= 0 ? "#22c55e" : "#ef4444";
  const goleadaAtivo = (time.pontosGoleada || 0) > 0;

  return `
  <div style="
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: ${bgGradient};
    border-bottom: 1px solid rgba(255,255,255,0.05);
    border-left: 3px solid ${borderColor};
    min-height: 48px;
  ">
    <!-- Pos -->
    <div style="
      min-width: 28px;
      text-align: center;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.body}px;
      font-weight: 900;
      color: ${posicaoColor};
      flex-shrink: 0;
    ">${posicaoIcon}</div>

    <!-- Escudo -->
    ${
      time.clube_id || time.time?.url_escudo_png
        ? `
      <img src="${time.time?.url_escudo_png || `/escudos/${time.clube_id}.png`}"
           style="
             width: 28px; 
             height: 28px; 
             border-radius: 50%; 
             border: 1.5px solid ${borderColor};
             background: white;
             flex-shrink: 0;
           "
           onerror="this.style.display='none'"
           alt="Escudo">
    `
        : `
      <div style="
        width: 28px;
        height: 28px;
        background: rgba(255,255,255,0.1);
        border: 1.5px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        flex-shrink: 0;
      ">❤️</div>
    `
    }

    <!-- Nome (flex) -->
    <div style="
      flex: 1;
      min-width: 0;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: 600;
      color: white;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    ">${time.nome_cartola || time.time?.nome_cartoleiro || time.nome_cartoleiro || "N/D"}</div>

    <!-- Pts (destaque) -->
    <div style="
      min-width: 36px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.heading}px;
      font-weight: 900;
      color: #22c55e;
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">${time.pontos || 0}</div>

    <!-- J -->
    <div style="
      min-width: 24px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: 600;
      color: #3b82f6;
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">${time.jogos || 0}</div>

    <!-- V -->
    <div style="
      min-width: 24px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: 700;
      color: #22c55e;
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">${time.vitorias || 0}</div>

    <!-- E -->
    <div style="
      min-width: 24px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: 600;
      color: #f59e0b;
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">${time.empates || 0}</div>

    <!-- D -->
    <div style="
      min-width: 24px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: 600;
      color: #ef4444;
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">${time.derrotas || 0}</div>

    <!-- GP (com destaque se > 0) -->
    <div style="
      min-width: 28px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: ${goleadaAtivo ? "900" : "600"};
      color: ${goleadaAtivo ? "#ff4500" : "rgba(255,255,255,0.4)"};
      ${goleadaAtivo ? "text-shadow: 0 0 8px rgba(255,69,0,0.6);" : ""}
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">${goleadaAtivo ? "🔥" : ""}${time.pontosGoleada || 0}</div>

    <!-- SG (Saldo) -->
    <div style="
      min-width: 38px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: 700;
      color: ${saldoColor};
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">${(time.saldoPontos || 0) >= 0 ? "+" : ""}${(time.saldoPontos || 0).toFixed(1)}</div>

    <!-- % (Aproveitamento) -->
    <div style="
      min-width: 42px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: 600;
      color: #8b5cf6;
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">${aproveitamento.toFixed(1)}%</div>

    <!-- R$ (Financeiro) -->
    <div style="
      min-width: 50px;
      text-align: right;
      font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
      font-weight: 700;
      color: ${financeiroColor};
      flex-shrink: 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    ">R$${(time.financeiroTotal || 0).toFixed(2)}</div>
  </div>
  `;
}

// GERAR CANVAS MOBILE HD (1440px final)
async function gerarCanvasMobileHD(container, nomeArquivo) {
  console.log(
    "[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] 🎨 Gerando canvas Mobile HD...",
  );

  const html2canvas = (
    await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm")
  ).default;

  const canvas = await html2canvas(container, {
    width: MOBILE_OPTIMIZED_CONFIG.width,
    scale: MOBILE_OPTIMIZED_CONFIG.scale,
    backgroundColor: "#0a0a0a",
    logging: false,
    useCORS: true,
    allowTaint: true,
    imageTimeout: 0,
    removeContainer: false,
  });

  console.log(
    `[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] ✅ Canvas gerado: ${canvas.width}x${canvas.height}px`,
  );

  canvas.toBlob(
    (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      link.click();
      URL.revokeObjectURL(url);

      console.log("[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] ✅ Download iniciado");
    },
    "image/png",
    MOBILE_OPTIMIZED_CONFIG.quality,
  );
}

// ========================================
// EXPORTAÇÃO MOBILE HD - CONFRONTOS DA RODADA
// ========================================

async function exportarPontosCorridosRodadaMobileHD(
  jogos,
  rodadaLiga,
  rodadaCartola,
) {
  console.log(
    "[EXPORT-PONTOS-CORRIDOS-RODADA-HD] 🎨 Criando layout Mobile HD de confrontos...",
  );
  console.log("[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Jogos recebidos:", jogos);

  // Validar dados
  if (!Array.isArray(jogos) || jogos.length === 0) {
    console.error(
      "[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Nenhum jogo válido encontrado",
    );
    MobileDarkUtils.mostrarErro("Nenhum confronto disponível para exportar");
    return;
  }

  // Definir títulos
  const titulo = `⚡ ${rodadaLiga}ª Rodada da Liga`;
  const subtitulo = `Rodada ${rodadaCartola}ª do Campeonato Brasileiro`;

  console.log("[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Criando container...");

  // Criar container Mobile HD (720px base)
  const exportContainer = criarContainerMobileHD(titulo, subtitulo, {
    rodada: rodadaLiga,
  });

  console.log(
    "[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Container criado, buscando contentDiv...",
  );

  const contentDiv = exportContainer.querySelector("#mobile-hd-export-content");

  if (!contentDiv) {
    console.error(
      "[EXPORT-PONTOS-CORRIDOS-RODADA-HD] contentDiv não encontrado!",
    );
    console.error(
      "[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Container HTML:",
      exportContainer.innerHTML.substring(0, 500),
    );
    MobileDarkUtils.mostrarErro("Erro ao criar estrutura de exportação");
    return;
  }

  console.log(
    "[EXPORT-PONTOS-CORRIDOS-RODADA-HD] contentDiv encontrado, gerando layout...",
  );

  // Inserir conteúdo dos confrontos Mobile HD
  contentDiv.innerHTML = criarLayoutConfrontosRodadaMobileHD(
    jogos,
    rodadaLiga,
    rodadaCartola,
  );

  console.log(
    "[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Layout gerado, adicionando ao body...",
  );

  document.body.appendChild(exportContainer);

  try {
    // Aguardar renderização e carregamento de imagens
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const imagens = exportContainer.querySelectorAll("img");
    if (imagens.length > 0) {
      console.log(
        `[EXPORT-PONTOS-CORRIDOS-RODADA-HD] 🖼️ Aguardando ${imagens.length} imagens...`,
      );
      await Promise.allSettled(
        Array.from(imagens).map((img) => {
          return new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
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

    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(
      "[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Gerando e baixando imagem...",
    );

    const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile(
      "confrontos_pontos_corridos",
      {
        rodada: rodadaLiga,
      },
    );

    // A função gerarCanvasMobileDarkHD já faz o download automaticamente
    await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);

    console.log("[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Removendo container...");
    document.body.removeChild(exportContainer);

    console.log("[EXPORT-PONTOS-CORRIDOS-RODADA-HD] ✅ Download iniciado");
    MobileDarkUtils.mostrarSucesso("Confrontos exportados com sucesso!");
  } catch (error) {
    console.error("[EXPORT-PONTOS-CORRIDOS-RODADA-HD] Erro:", error);
    if (document.body.contains(exportContainer)) {
      document.body.removeChild(exportContainer);
    }
    MobileDarkUtils.mostrarErro(`Erro ao gerar imagem: ${error.message}`);
    throw error;
  }
}

// Layout dos confrontos da rodada em formato tabela profissional
function criarLayoutConfrontosRodadaMobileHD(jogos, rodadaLiga, rodadaCartola) {
  if (!Array.isArray(jogos) || jogos.length === 0) {
    return `
      <div style="
        padding: 40px 20px;
        text-align: center;
        color: rgba(255,255,255,0.6);
      ">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <div style="font-size: 16px;">Nenhum confronto disponível</div>
      </div>
    `;
  }

  let confrontosHTML = `
    <style>
      .confronto-row { border-bottom: 1px solid rgba(255,255,255,0.1); }
      .confronto-row:last-child { border-bottom: none; }
      .time-cell { padding: 12px 8px; vertical-align: middle; }
      .escudo-img { width: 32px; height: 32px; border-radius: 50%; object-fit: contain; }
      .placar-cell { text-align: center; padding: 12px 16px; font-family: 'JetBrains Mono', monospace; }
    </style>
    <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border-radius: 12px; overflow: hidden;">
      <thead>
        <tr style="background: rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.1);">
          <th style="padding: 14px 8px; text-align: left; font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Mandante</th>
          <th style="padding: 14px 16px; text-align: center; font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px; width: 100px;">Placar</th>
          <th style="padding: 14px 8px; text-align: right; font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Visitante</th>
        </tr>
      </thead>
      <tbody>
  `;

  jogos.forEach((jogo, index) => {
    const timeA = jogo.timeA || {};
    const timeB = jogo.timeB || {};

    const nomeA = timeA.nome_cartola || timeA.nome_cartoleiro || "N/D";
    const timeNomeA = timeA.nome_time || "";
    const pontosA =
      timeA.pontos !== null && timeA.pontos !== undefined ? timeA.pontos : null;
    const brasaoA = timeA.clube_id
      ? `/escudos/${timeA.clube_id}.png`
      : "/escudos/default.png";

    const nomeB = timeB.nome_cartola || timeB.nome_cartoleiro || "N/D";
    const timeNomeB = timeB.nome_time || "";
    const pontosB =
      timeB.pontos !== null && timeB.pontos !== undefined ? timeB.pontos : null;
    const brasaoB = timeB.clube_id
      ? `/escudos/${timeB.clube_id}.png`
      : "/escudos/default.png";

    // Determinar cores do placar
    let corPontosA = "rgba(255,255,255,0.9)";
    let corPontosB = "rgba(255,255,255,0.9)";
    let bgPlacar = "transparent";

    if (pontosA !== null && pontosB !== null) {
      const diferenca = Math.abs(pontosA - pontosB);

      if (diferenca <= 1) {
        // Empate
        corPontosA = "#3b82f6";
        corPontosB = "#3b82f6";
        bgPlacar = "rgba(59, 130, 246, 0.1)";
      } else if (pontosA > pontosB) {
        // Time A venceu
        corPontosA = "#22c55e";
        corPontosB = "#ef4444";
        if (diferenca >= 30) {
          bgPlacar = "rgba(251, 191, 36, 0.15)"; // Goleada
        } else {
          bgPlacar = "rgba(34, 197, 94, 0.1)";
        }
      } else {
        // Time B venceu
        corPontosA = "#ef4444";
        corPontosB = "#22c55e";
        if (diferenca >= 30) {
          bgPlacar = "rgba(251, 191, 36, 0.15)"; // Goleada
        } else {
          bgPlacar = "rgba(34, 197, 94, 0.1)";
        }
      }
    }

    confrontosHTML += `
      <tr class="confronto-row">
        <!-- Time A (Mandante) -->
        <td class="time-cell" style="width: 45%;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${brasaoA}" class="escudo-img" onerror="this.src='/escudos/default.png'" alt="Time A" />
            <div style="flex: 1; min-width: 0;">
              <div style="
                font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.body}px;
                font-weight: 700;
                color: white;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${nomeA}</div>
              <div style="
                font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption}px;
                color: rgba(255,255,255,0.5);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${timeNomeA}</div>
            </div>
          </div>
        </td>

        <!-- Placar -->
        <td class="placar-cell" style="background: ${bgPlacar};">
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span style="
              font-size: 20px;
              font-weight: 900;
              color: ${corPontosA};
            ">${pontosA !== null ? pontosA.toFixed(1) : "-"}</span>
            <span style="
              font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.small}px;
              color: rgba(255,255,255,0.3);
              font-weight: 700;
            ">×</span>
            <span style="
              font-size: 20px;
              font-weight: 900;
              color: ${corPontosB};
            ">${pontosB !== null ? pontosB.toFixed(1) : "-"}</span>
          </div>
        </td>

        <!-- Time B (Visitante) -->
        <td class="time-cell" style="width: 45%;">
          <div style="display: flex; align-items: center; gap: 10px; justify-content: flex-end;">
            <div style="flex: 1; min-width: 0; text-align: right;">
              <div style="
                font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.body}px;
                font-weight: 700;
                color: white;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${nomeB}</div>
              <div style="
                font-size: ${MOBILE_OPTIMIZED_CONFIG.fontSize.caption}px;
                color: rgba(255,255,255,0.5);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${timeNomeB}</div>
            </div>
            <img src="${brasaoB}" class="escudo-img" onerror="this.src='/escudos/default.png'" alt="Time B" />
          </div>
        </td>
      </tr>
    `;
  });

  confrontosHTML += `
      </tbody>
    </table>
  `;

  return confrontosHTML;
}

console.log(
  "[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] ✅ Sistema Mobile HD v4.0 OTIMIZADO configurado",
);
console.log(
  "[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] 📱 Resolução: 720px @ 2x = 1440px (Full HD Mobile)",
);
console.log(
  "[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] 🎨 Design completo otimizado para visualização mobile perfeita",
);
console.log(
  "[EXPORT-PONTOS-CORRIDOS-MOBILE-HD] ✨ Legibilidade ajustada: fontes e espaçamento ideais para mobile",
);

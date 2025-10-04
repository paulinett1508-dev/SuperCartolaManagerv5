// SISTEMA DE EXPORTAÇÃO MELHOR DO MÊS - MOBILE DARK HD v3.0.1
// Seguindo padrão export-pontos-corridos.js e export-extrato-financeiro.js

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log("[EXPORT-MELHOR-MES-MOBILE] Sistema Mobile Dark HD v3.0.1 carregado");

// ✅ FUNÇÃO PRINCIPAL - CRIAR BOTÃO DE EXPORTAÇÃO
export async function criarBotaoExportacaoMelhorMes(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-MELHOR-MES-MOBILE] Configuração inválida:", config);
    return;
  }

  const {
    containerId,
    rankings = [],
    edicao = {},
    tituloPersonalizado = "",
    ligaId = "",
  } = config;

  console.log("[EXPORT-MELHOR-MES-MOBILE] 🎯 Criando botão exportação:", {
    containerId,
    rankingsCount: rankings.length,
    edicao,
  });

  // Buscar container
  let container;
  if (containerId) {
    container = document.getElementById(containerId);
  }

  if (!container) {
    container =
      document.querySelector("#melhorMesExportBtnContainer") ||
      document.querySelector(".export-container") ||
      document.querySelector(".melhor-mes-container") ||
      document.body;
  }

  if (!container) {
    console.error("[EXPORT-MELHOR-MES-MOBILE] Nenhum container encontrado");
    return;
  }

  console.log("[EXPORT-MELHOR-MES-MOBILE] ✅ Container:", container.id || container.className);

  // Remove botão existente
  const botaoExistente = container.querySelector(".btn-export-melhor-mes-mobile");
  if (botaoExistente) {
    botaoExistente.remove();
  }

  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-export-melhor-mes-mobile";
  btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 16px;">🏆</span>
      <span>Exportar Mobile HD</span>
      <div style="
        background: rgba(255,255,255,0.2);
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
      ">MOBILE</div>
    </div>
  `;

  btn.style.cssText = `
    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientSuccess};
    color: ${MOBILE_DARK_HD_CONFIG.colors.text};
    border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.success};
    padding: 16px 24px;
    border-radius: 14px;
    cursor: pointer;
    font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 200px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;

  btn.onmouseover = () => {
    btn.style.transform = "translateY(-3px) scale(1.02)";
    btn.style.boxShadow = `0 12px 40px ${MOBILE_DARK_HD_CONFIG.colors.success}40`;
  };

  btn.onmouseout = () => {
    btn.style.transform = "translateY(0) scale(1)";
    btn.style.boxShadow = MOBILE_DARK_HD_CONFIG.colors.shadow;
  };

  btn.onclick = async () => {
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="
          width: 20px; 
          height: 20px; 
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.text};
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <span>Gerando HD...</span>
      </div>
    `;
    btn.disabled = true;

    try {
      await exportarMelhorMesMobileDarkHD({
        rankings,
        edicao,
        tituloPersonalizado,
        ligaId,
      });
    } catch (error) {
      console.error("[EXPORT-MELHOR-MES-MOBILE] Erro na exportação:", error);
      MobileDarkUtils.mostrarErro("Erro ao gerar imagem HD. Tente novamente.");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  if (!document.getElementById("export-melhor-mes-animations")) {
    const style = document.createElement("style");
    style.id = "export-melhor-mes-animations";
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  btnContainer.appendChild(btn);

  if (container.firstChild) {
    container.insertBefore(btnContainer, container.firstChild);
  } else {
    container.appendChild(btnContainer);
  }

  console.log("[EXPORT-MELHOR-MES-MOBILE] ✅ Botão criado");
}

// ✅ EXPORTAÇÃO MOBILE DARK HD
async function exportarMelhorMesMobileDarkHD(config) {
  const { rankings, edicao, tituloPersonalizado, ligaId } = config;

  console.log("[EXPORT-MELHOR-MES-MOBILE] 🎨 Criando layout mobile dark HD...");

  MobileDarkUtils.validarDadosMobile(config, ["rankings", "edicao"]);

  if (!Array.isArray(rankings) || rankings.length === 0) {
    throw new Error("Rankings inválidos ou vazios");
  }

  const numeroEdicao = edicao.numero || edicao.nome || "05";
  const titulo = tituloPersonalizado || `🏆 Melhor do Mês - Edição ${numeroEdicao}`;
  const subtitulo = `Rodadas ${edicao.inicio || edicao.rodadaInicio || 23} a ${edicao.fim || edicao.rodadaFim || 28}`;

  const rodadaAtual = window.rodadaAtual || 26;
  const edicaoCompleta = rodadaAtual >= (edicao.fim || edicao.rodadaFim || 28);

  const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
    rodada: `${edicao.inicio || edicao.rodadaInicio}-${edicao.fim || edicao.rodadaFim}`,
  });

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  contentDiv.innerHTML = criarLayoutMelhorMesMobile(
    rankings,
    edicao,
    edicaoCompleta,
  );

  document.body.appendChild(exportContainer);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const imagens = exportContainer.querySelectorAll("img");
    if (imagens.length > 0) {
      console.log(`[EXPORT-MELHOR-MES-MOBILE] 🖼️ Aguardando ${imagens.length} imagens...`);
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

    const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("melhor-mes", {
      rodada: `edicao-${numeroEdicao}`,
      extra: `${rankings.length}times`,
    });

    await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);

    console.log("[EXPORT-MELHOR-MES-MOBILE] ✅ Exportação concluída");
    MobileDarkUtils.mostrarSucesso("Melhor do Mês exportado com sucesso!");
  } finally {
    if (exportContainer.parentNode === document.body) {
      document.body.removeChild(exportContainer);
    }
  }
}

// ✅ LAYOUT MELHOR DO MÊS MOBILE DARK
function criarLayoutMelhorMesMobile(rankings, edicao, edicaoCompleta) {
  const campeao = rankings[0];
  const bannerTexto = edicaoCompleta ? "🏆 CAMPEÃO" : "👑 LÍDER ATUAL";
  const statusTexto = edicaoCompleta ? "RESULTADO FINAL" : "EM ANDAMENTO";

  return `
    <!-- BANNER CAMPEÃO/LÍDER -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.gradientGold};
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
      border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">${bannerTexto}</div>

      ${campeao ? `
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
        ${campeao.clube_id ? `
          <img src="/escudos/${campeao.clube_id}.png"
               style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid ${MOBILE_DARK_HD_CONFIG.colors.gold}; background: ${MOBILE_DARK_HD_CONFIG.colors.surface};"
               onerror="this.outerHTML='<div style=\\'width:48px;height:48px;background:${MOBILE_DARK_HD_CONFIG.colors.gold};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;\\'>⚽</div>'"
               alt="Escudo">
        ` : `<div style="width:48px;height:48px;background:${MOBILE_DARK_HD_CONFIG.colors.gold};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;">⚽</div>`}

        <div style="text-align: left;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
            color: ${MOBILE_DARK_HD_CONFIG.colors.text};
          ">${campeao.nome_cartola || campeao.nome_cartoleiro || "N/D"}</div>
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
          ">${campeao.nome_time || campeao.nome || "N/D"}</div>
        </div>
      </div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} 28px Inter;
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${campeao.pontos.toFixed(2).replace(".", ",")} pontos</div>
      ` : `<div style="color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};">Nenhum dado disponível</div>`}
    </div>

    <!-- STATUS DA EDIÇÃO -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <div>
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          text-transform: uppercase;
        ">Status</div>
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
          color: ${edicaoCompleta ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.warning};
        ">${statusTexto}</div>
      </div>
      <div>
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          text-transform: uppercase;
        ">Participantes</div>
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
          color: ${MOBILE_DARK_HD_CONFIG.colors.accent};
        ">${rankings.length} times</div>
      </div>
    </div>

    <!-- CLASSIFICAÇÃO COMPLETA -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border-radius: 16px;
      padding: 0;
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
      overflow: hidden;
    ">
      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.gradientDark};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
        text-align: center;
      ">
        <h3 style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
          margin: 0;
          letter-spacing: 0.5px;
        ">📋 CLASSIFICAÇÃO COMPLETA</h3>
      </div>

      <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
        ${rankings.length === 0 
          ? `<div style="text-align: center; padding: 40px 20px; color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};">Nenhum participante encontrado</div>`
          : rankings.map((time, index) => criarItemRankingMobile(time, index)).join("")
        }
      </div>
    </div>
  `;
}

// ✅ ITEM DO RANKING
function criarItemRankingMobile(time, index) {
  const posicao = index + 1;
  const isPrimeiro = posicao === 1;
  const isSegundo = posicao === 2;
  const isTerceiro = posicao === 3;

  let bgColor = MOBILE_DARK_HD_CONFIG.colors.surface;
  let borderLeft = "none";

  if (isPrimeiro) {
    bgColor = `${MOBILE_DARK_HD_CONFIG.colors.gold}15`;
    borderLeft = `4px solid ${MOBILE_DARK_HD_CONFIG.colors.gold}`;
  } else if (isSegundo || isTerceiro) {
    bgColor = `${MOBILE_DARK_HD_CONFIG.colors.success}10`;
    borderLeft = `4px solid ${MOBILE_DARK_HD_CONFIG.colors.success}`;
  }

  const posicaoEmoji = isPrimeiro ? "🏆" : isSegundo ? "🥈" : isTerceiro ? "🥉" : `${posicao}º`;

  return `
    <div style="
      display: flex;
      align-items: center;
      padding: 12px ${MOBILE_DARK_HD_CONFIG.padding}px;
      border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
      background: ${bgColor};
      border-left: ${borderLeft};
      min-height: 60px;
    ">
      <div style="
        background: ${isPrimeiro ? MOBILE_DARK_HD_CONFIG.colors.gold : MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
        color: ${isPrimeiro ? MOBILE_DARK_HD_CONFIG.colors.text : MOBILE_DARK_HD_CONFIG.colors.text};
        padding: 8px 12px;
        border-radius: 10px;
        margin-right: 12px;
        min-width: 50px;
        text-align: center;
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
        flex-shrink: 0;
      ">${posicaoEmoji}</div>

      ${time.clube_id ? `
        <img src="/escudos/${time.clube_id}.png"
             style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.border}; background: ${MOBILE_DARK_HD_CONFIG.colors.surface}; margin-right: 12px; flex-shrink: 0;"
             onerror="this.style.display='none'"
             alt="Escudo">
      ` : ""}

      <div style="flex: 1; min-width: 0; margin-right: 12px;">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
          color: ${MOBILE_DARK_HD_CONFIG.colors.text};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${time.nome_cartola || time.nome_cartoleiro || "N/D"}</div>
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${time.nome_time || time.nome || "N/D"}</div>
      </div>

      <div style="
        background: ${isPrimeiro ? MOBILE_DARK_HD_CONFIG.colors.gold + "30" : MOBILE_DARK_HD_CONFIG.colors.success + "15"};
        border: 1px solid ${isPrimeiro ? MOBILE_DARK_HD_CONFIG.colors.gold : MOBILE_DARK_HD_CONFIG.colors.success}40;
        padding: 8px 12px;
        border-radius: 10px;
        text-align: center;
        min-width: 70px;
        flex-shrink: 0;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
          color: ${isPrimeiro ? MOBILE_DARK_HD_CONFIG.colors.gold : MOBILE_DARK_HD_CONFIG.colors.success};
          line-height: 1;
        ">${time.pontos.toFixed(2).replace(".", ",")}</div>
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        ">pts</div>
      </div>
    </div>
  `;
}

// ✅ COMPATIBILIDADE COM FUNÇÃO LEGADO
export async function exportarMelhorMesComoImagem(rankings, edicao) {
  await exportarMelhorMesMobileDarkHD({
    rankings,
    edicao,
  });
}

console.log("[EXPORT-MELHOR-MES-MOBILE] ✅ Sistema Mobile Dark HD v3.0.1 configurado");
console.log("[EXPORT-MELHOR-MES-MOBILE] 📱 Resolução: 720px x 800px+ @ 4x scale");
console.log("[EXPORT-MELHOR-MES-MOBILE] 🎨 Tema Dark com destaque para campeão");
// SISTEMA DE EXPORTAÇÃO EXTRATO FINANCEIRO - MOBILE LIGHT HD v3.1.0
// Tema claro otimizado para máxima legibilidade em exportações

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

// ✅ CONFIGURAÇÃO DE CORES PARA TEMA CLARO (HIGH CONTRAST)
const EXTRATO_LIGHT_CONFIG = {
  colors: {
    // Fundo branco limpo
    background: "#FFFFFF",
    surface: "#F8F9FA",
    surfaceLight: "#FFFFFF",

    // Textos com alto contraste para exportação
    text: "#000000",
    textPrimary: "#000000",
    textSecondary: "#2C3E50",
    textMuted: "#5A6C7D",

    // Bordas suaves
    border: "#DEE2E6",
    borderLight: "#E9ECEF",
    divider: "#E9ECEF",

    // Cores de status (mais saturadas para impressão)
    success: "#198754",
    successLight: "#D1F2EB",
    danger: "#DC3545",
    dangerLight: "#F8D7DA",
    warning: "#FD7E14",
    warningLight: "#FFE8CC",
    info: "#0DCAF0",
    infoLight: "#CFF4FC",
    gold: "#FFD700",

    // Gradientes para cabeçalhos
    gradientPrimary: "linear-gradient(135deg, #FF4500 0%, #FF6347 100%)",
    gradientSuccess: "linear-gradient(135deg, #198754 0%, #20C997 100%)",
    gradientDanger: "linear-gradient(135deg, #DC3545 0%, #E74C3C 100%)",
    gradientWarning: "linear-gradient(135deg, #FD7E14 0%, #FFC107 100%)",

    // Sombras suaves
    shadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    shadowLight: "0 1px 3px rgba(0, 0, 0, 0.06)",
  },
  fonts: {
    body: "16px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    bodySmall: "14px 'Inter', sans-serif",
    heading: "24px 'Inter', sans-serif",
    subheading: "18px 'Inter', sans-serif",
    caption: "13px 'Inter', sans-serif",
    mini: "12px 'Inter', sans-serif",
    weights: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
  },
  padding: 16,
  cardSpacing: 12,
};

console.log(
  "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Sistema Mobile Light HD v3.1.0 carregado",
);

// FUNÇÃO PRINCIPAL - CRIAR BOTÃO DE EXPORTAÇÃO
export async function criarBotaoExportacaoExtratoFinanceiro(config) {
  if (!config || typeof config !== "object") {
    console.error(
      "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Configuração inválida:",
      config,
    );
    return;
  }

  const {
    containerId,
    dadosExtrato = [],
    participante = {},
    rodadaAtual = "",
  } = config;

  if (!containerId) {
    console.error(
      "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] containerId é obrigatório",
    );
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Container ${containerId} não encontrado`,
    );
    return;
  }

  const botaoExistente = container.querySelector(
    ".btn-export-extrato-financeiro-mobile",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-export-extrato-financeiro-mobile";
  btn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 16px;">💰</span>
      <span>Extrato Mobile HD</span>
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
    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientWarning};
    color: ${MOBILE_DARK_HD_CONFIG.colors.text};
    border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.warning};
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
    btn.style.boxShadow = `0 12px 40px ${MOBILE_DARK_HD_CONFIG.colors.warning}40`;
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
      await exportarExtratoFinanceiroMobileDarkHD({
        dadosExtrato,
        participante,
        rodadaAtual,
      });
    } catch (error) {
      console.error(
        "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Erro na exportação:",
        error,
      );
      MobileDarkUtils.mostrarErro("Erro ao gerar extrato HD. Tente novamente.");
    } finally {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }
  };

  if (!document.getElementById("export-extrato-animations")) {
    const style = document.createElement("style");
    style.id = "export-extrato-animations";
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
}

// EXPORTAÇÃO MOBILE DARK HD - EXTRATO FINANCEIRO
async function exportarExtratoFinanceiroMobileDarkHD(config) {
  const { dadosExtrato, participante, rodadaAtual } = config;

  console.log(
    "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Criando layout mobile dark HD...",
  );
  console.log("[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Dados recebidos:", config);

  MobileDarkUtils.validarDadosMobile(config, [
    "dadosExtrato",
    "participante",
    "rodadaAtual",
  ]);

  if (!Array.isArray(dadosExtrato) || dadosExtrato.length === 0) {
    console.error(
      "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Dados do extrato inválidos:",
      dadosExtrato,
    );
    throw new Error(
      "Dados do extrato inválidos ou vazios. Verifique se há dados financeiros disponíveis.",
    );
  }

  const titulo = `💰 Extrato Financeiro`;
  const subtitulo = `${participante?.nome_cartola || "Participante"} • R${rodadaAtual}`;

  // ✅ CRIAR CONTAINER COM TEMA CLARO
  const exportContainer = document.createElement("div");
  exportContainer.id = "mobile-export-container-light";
  exportContainer.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 720px;
    background: ${EXTRATO_LIGHT_CONFIG.colors.background};
    font-family: ${EXTRATO_LIGHT_CONFIG.fonts.body};
    padding: 24px;
    box-sizing: border-box;
  `;

  exportContainer.innerHTML = `
    <div style="
      background: ${EXTRATO_LIGHT_CONFIG.colors.gradientPrimary};
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      text-align: center;
    ">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800;">${titulo}</h1>
      <p style="margin: 0; font-size: 14px; opacity: 0.95;">${subtitulo}</p>
    </div>
    <div id="mobile-export-content"></div>
  `;

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  // ✅ DETERMINAR SE HÁ DADOS DE PONTOS CORRIDOS, MATA-MATA E TOP 10 PARA AJUSTAR O LAYOUT
  const temPontosCorridos = dadosExtrato.some(
    (item) => item.tipo === "pontos_corridos",
  );
  const temMataMata = dadosExtrato.some((item) => item.tipo === "mata_mata");
  const temTop10 = dadosExtrato.some((item) => item.tipo === "top10");

  contentDiv.innerHTML = criarLayoutExtratoFinanceiroMobile(
    dadosExtrato,
    participante,
    rodadaAtual,
    temPontosCorridos,
    temMataMata,
    temTop10,
  );

  document.body.appendChild(exportContainer);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const imagens = exportContainer.querySelectorAll("img");
    if (imagens.length > 0) {
      console.log(
        `[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Aguardando ${imagens.length} imagens...`,
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

    const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("extrato", {
      rodada: rodadaAtual,
      extra: participante?.nome_cartola?.replace(/\s/g, "_") || "participante",
    });

    // ✅ USAR ESCALA PADRÃO DO SISTEMA (6x para máxima qualidade)
    await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);

    console.log("[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Exportação concluída");
    MobileDarkUtils.mostrarSucesso("Extrato financeiro exportado com sucesso!");
  } finally {
    if (exportContainer.parentNode === document.body) {
      document.body.removeChild(exportContainer);
    }
  }
}

// FUNÇÃO DE FORMATAÇÃO MONETÁRIA
function formatarValorMonetario(valor) {
  if (typeof valor !== "number" || isNaN(valor)) {
    return "R$ 0,00";
  }

  const abs = Math.abs(valor);
  const formatado = abs.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (valor === 0) {
    return "R$ 0,00";
  } else if (valor > 0) {
    return `+R$ ${formatado}`;
  } else {
    return `-R$ ${formatado}`;
  }
}

// LAYOUT EXTRATO FINANCEIRO MOBILE DARK
function criarLayoutExtratoFinanceiroMobile(
  dadosExtrato,
  participante,
  rodadaAtual,
  temPontosCorridos,
  temMataMata,
  temTop10,
) {
  const dadosValidados = Array.isArray(dadosExtrato) ? dadosExtrato : [];

  const resumoFinanceiro = calcularResumoFinanceiro(dadosValidados);
  const detalhamentoPorRodada = estruturarDetalhamentoPorRodada(dadosValidados);

  // ✅ DEBUG: Verificar campos editáveis
  console.log("[EXPORT-EXTRATO-FINANCEIRO-MOBILE] 🔍 DEBUG Campos Editáveis:");
  console.log("  - Total de itens no extrato:", dadosValidados.length);
  console.log(
    "  - Campos editáveis encontrados:",
    resumoFinanceiro.camposEditaveis.length,
  );
  console.log("  - Dados dos campos:", resumoFinanceiro.camposEditaveis);

  const camposEditaveisNoArray = dadosExtrato.filter(
    (item) => item.tipo === "campo_editavel",
  );
  console.log(
    "  - Campos editáveis no array original:",
    camposEditaveisNoArray.length,
  );
  console.log("  - Dados originais:", camposEditaveisNoArray);

  const saldoPositivo = resumoFinanceiro.saldoFinal >= 0;
  const gradienteSaldo = saldoPositivo
    ? MOBILE_DARK_HD_CONFIG.colors.gradientSuccess
    : MOBILE_DARK_HD_CONFIG.colors.gradientDanger;

  const totalRodadas = detalhamentoPorRodada.length;

  let melhorRodada = 0;
  let melhorRodadaNumero = 0;
  let piorRodada = 0;
  let piorRodadaNumero = 0;

  if (totalRodadas > 0) {
    detalhamentoPorRodada.forEach((r) => {
      const valorRodada = r.bonusOnus + (r.pontosCorridos || 0) + r.mataMata;
      if (valorRodada > melhorRodada) {
        melhorRodada = valorRodada;
        melhorRodadaNumero = r.rodada;
      }
      if (valorRodada < piorRodada) {
        piorRodada = valorRodada;
        piorRodadaNumero = r.rodada;
      }
    });
  }

  // ✅ CALCULAR TOTAIS PARA LINHA FINAL (IGUAL À TELA)
  const totalBonusOnus =
    resumoFinanceiro.totalBonus + resumoFinanceiro.totalOnus;

  return `
    <!-- CARD COMPACTO - INFO PARTICIPANTE -->
    <div style="
      background: ${EXTRATO_LIGHT_CONFIG.colors.surface};
      border: 2px solid ${EXTRATO_LIGHT_CONFIG.colors.border};
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: ${EXTRATO_LIGHT_CONFIG.colors.shadow};
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <!-- Escudo do Time -->
        ${
          participante?.clube_id
            ? `
          <img src="/escudos/${participante.clube_id}.png"
               style="
                 width: 36px; 
                 height: 36px; 
                 border-radius: 50%; 
                 border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.warning};
                 background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
                 flex-shrink: 0;
               "
               onerror="this.outerHTML='<div style=\\'width:36px;height:36px;background:${MOBILE_DARK_HD_CONFIG.colors.warning};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;\\'>⚽</div>'"
               alt="Escudo">
        `
            : `
          <div style="
            width: 36px; 
            height: 36px; 
            background: ${MOBILE_DARK_HD_CONFIG.colors.warning}; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 16px;
            flex-shrink: 0;
          ">⚽</div>
        `
        }

        <!-- Informações Principais -->
        <div style="flex: 1; min-width: 0;">
          <div style="
            font: ${EXTRATO_LIGHT_CONFIG.fonts.weights.bold} 14px Inter;
            color: ${EXTRATO_LIGHT_CONFIG.colors.textPrimary};
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${participante?.nome_cartola || participante?.nome_cartoleiro || "Participante"}</div>

          <div style="
            font: ${EXTRATO_LIGHT_CONFIG.fonts.weights.medium} 11px Inter;
            color: ${EXTRATO_LIGHT_CONFIG.colors.textSecondary};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${participante?.nome_time || "Time não informado"} • até R${rodadaAtual}</div>
        </div>
      </div>
    </div>

    <!-- MINI CARD SALDO FINAL -->
    <div style="
      background: ${gradienteSaldo};
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 13px Inter;
        color: rgba(255,255,255,0.95);
        text-transform: uppercase;
        letter-spacing: 1px;
      ">${resumoFinanceiro.saldoFinal < 0 ? "💸 A Pagar" : resumoFinanceiro.saldoFinal > 0 ? "💰 A Receber" : "✅ Saldo"}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} 18px Inter;
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
      ">
        ${formatarValorMonetario(resumoFinanceiro.saldoFinal)}
      </div>
    </div>

    <!-- GRID RESUMO FINANCEIRO COMPACTO -->
    <div style="
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    ">
      ${criarCardResumoCompacto("💚 Bônus", resumoFinanceiro.totalBonus, MOBILE_DARK_HD_CONFIG.colors.success)}
      ${criarCardResumoCompacto("💔 Ônus", resumoFinanceiro.totalOnus, MOBILE_DARK_HD_CONFIG.colors.danger)}
      ${criarCardResumoCompacto("🎩 MITO", resumoFinanceiro.vezesMito, MOBILE_DARK_HD_CONFIG.colors.gold, false, true)}
      ${criarCardResumoCompacto("🐵 MICO", resumoFinanceiro.vezesMico, MOBILE_DARK_HD_CONFIG.colors.danger, false, true)}
    </div>

    ${resumoFinanceiro.camposEditaveis.length > 0 ? criarSecaoAjustesManuais(resumoFinanceiro.camposEditaveis) : ""}

    <!-- TABELA DETALHAMENTO -->
    <div style="
      background: ${EXTRATO_LIGHT_CONFIG.colors.background};
      border-radius: 12px;
      padding: 0;
      border: 2px solid ${EXTRATO_LIGHT_CONFIG.colors.border};
      box-shadow: ${EXTRATO_LIGHT_CONFIG.colors.shadow};
      overflow: hidden;
      margin-bottom: 20px;
    ">
      <div style="
        background: ${EXTRATO_LIGHT_CONFIG.colors.gradientPrimary};
        color: white;
        padding: 16px ${EXTRATO_LIGHT_CONFIG.padding}px;
        text-align: center;
      ">
        <h3 style="
          font: ${EXTRATO_LIGHT_CONFIG.fonts.weights.bold} ${EXTRATO_LIGHT_CONFIG.fonts.subheading};
          margin: 0;
          letter-spacing: 0.5px;
        ">📋 DETALHAMENTO POR RODADA</h3>
      </div>

      <div style="padding: ${EXTRATO_LIGHT_CONFIG.padding}px 0; background: ${EXTRATO_LIGHT_CONFIG.colors.background};">
        ${
          detalhamentoPorRodada.length === 0
            ? `<div style="text-align: center; padding: 40px 20px; color: ${EXTRATO_LIGHT_CONFIG.colors.textMuted};">Nenhuma rodada encontrada</div>`
            : detalhamentoPorRodada
                .map((rodada, index) => {
                  return criarItemExtratoRodadaMobile(
                    rodada,
                    index,
                    temPontosCorridos,
                    temMataMata,
                    temTop10,
                  );
                })
                .join("")
        }

        <!-- LINHA DE TOTAIS (ALINHADA COM AS RODADAS) -->
        ${
          detalhamentoPorRodada.length > 0
            ? `
        <div style="
          display: flex;
          align-items: center;
          padding: 16px ${EXTRATO_LIGHT_CONFIG.padding}px;
          border-top: 3px solid ${EXTRATO_LIGHT_CONFIG.colors.warning};
          background: ${EXTRATO_LIGHT_CONFIG.colors.surface};
          min-height: 60px;
          box-shadow: ${EXTRATO_LIGHT_CONFIG.colors.shadow};
        ">
          <!-- Espaço alinhado com número da rodada (R1, R2...) -->
          <div style="
            padding: 6px 10px;
            border-radius: 8px;
            margin-right: 12px;
            min-width: 40px;
            text-align: center;
            flex-shrink: 0;
            visibility: hidden;
          ">-</div>

          <!-- Label TOTAIS: alinhado com posição -->
          <div style="
            padding: 6px 10px;
            border-radius: 8px;
            margin-right: 12px;
            min-width: 50px;
            text-align: center;
            font: ${EXTRATO_LIGHT_CONFIG.fonts.weights.extrabold} ${EXTRATO_LIGHT_CONFIG.fonts.bodySmall};
            color: ${EXTRATO_LIGHT_CONFIG.colors.textPrimary};
            background: ${EXTRATO_LIGHT_CONFIG.colors.warningLight};
            flex-shrink: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">TOTAIS</div>

          <!-- Grid de valores alinhado com as colunas das rodadas -->
          <div style="
            flex: 1;
            display: grid;
            grid-template-columns: ${temPontosCorridos && temMataMata && temTop10 ? "1fr 1fr 1fr 1fr" : temPontosCorridos && temMataMata ? "1fr 1fr 1fr" : temPontosCorridos && temTop10 ? "1fr 1fr 1fr" : temPontosCorridos ? "1fr 1fr" : "1fr"};
            gap: 8px;
            margin-right: 12px;
          ">
            <div style="text-align: center;">
              <div style="
                font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} 13px Inter;
                color: ${totalBonusOnus === 0 ? MOBILE_DARK_HD_CONFIG.colors.textMuted : totalBonusOnus > 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
                white-space: nowrap;
              ">${formatarValorMonetario(totalBonusOnus)}</div>
            </div>

            ${
              temPontosCorridos
                ? `
            <div style="text-align: center;">
              <div style="
                font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} 13px Inter;
                color: ${resumoFinanceiro.totalPontosCorridos === 0 ? MOBILE_DARK_HD_CONFIG.colors.textMuted : resumoFinanceiro.totalPontosCorridos > 0 ? MOBILE_DARK_HD_CONFIG.colors.info : MOBILE_DARK_HD_CONFIG.colors.danger};
                white-space: nowrap;
              ">${formatarValorMonetario(resumoFinanceiro.totalPontosCorridos)}</div>
            </div>
            `
                : ""
            }

            ${
              temMataMata
                ? `
            <div style="text-align: center;">
              <div style="
                font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} 13px Inter;
                color: ${resumoFinanceiro.totalMataMata === 0 ? MOBILE_DARK_HD_CONFIG.colors.textMuted : resumoFinanceiro.totalMataMata > 0 ? MOBILE_DARK_HD_CONFIG.colors.warning : MOBILE_DARK_HD_CONFIG.colors.danger};
                white-space: nowrap;
              ">${formatarValorMonetario(resumoFinanceiro.totalMataMata)}</div>
            </div>
            `
                : ""
            }

            ${
              temTop10
                ? `
            <div style="text-align: center;">
              <div style="
                font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} 13px Inter;
                color: ${resumoFinanceiro.totalTop10 === 0 ? MOBILE_DARK_HD_CONFIG.colors.textMuted : resumoFinanceiro.totalTop10 > 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
                white-space: nowrap;
              ">${formatarValorMonetario(resumoFinanceiro.totalTop10)}</div>
            </div>
            `
                : ""
            }
          </div>

          <!-- Saldo final alinhado com saldo acumulado das rodadas -->
          <div style="
            background: rgba(255, 69, 0, 0.08);
            border-left: 3px solid ${MOBILE_DARK_HD_CONFIG.colors.warning};
            padding: 10px 12px;
            border-radius: 8px;
            text-align: center;
            min-width: 80px;
            flex-shrink: 0;
          ">
            <div style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} 14px Inter;
              color: ${resumoFinanceiro.saldoFinal >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
              line-height: 1;
              white-space: nowrap;
            ">${formatarValorMonetario(resumoFinanceiro.saldoFinal)}</div>
          </div>
        </div>
        `
            : ""
        }
      </div>
    </div>

    <!-- ESTATÍSTICAS FINAIS -->
    <div style="
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: ${MOBILE_DARK_HD_CONFIG.cardSpacing}px;
    ">
      ${criarCardStat("Rodadas Jogadas", totalRodadas, MOBILE_DARK_HD_CONFIG.colors.accent, "")}
      ${criarCardStat("Melhor Rodada", "+" + melhorRodada.toFixed(2), MOBILE_DARK_HD_CONFIG.colors.success, melhorRodadaNumero > 0 ? `R${melhorRodadaNumero}` : "")}
      ${criarCardStat("Pior Rodada", piorRodada.toFixed(2), MOBILE_DARK_HD_CONFIG.colors.danger, piorRodadaNumero > 0 ? `R${piorRodadaNumero}` : "")}
    </div>
  `;
}

// HELPERS DE LAYOUT
function criarCardResumoCompacto(
  titulo,
  valor,
  cor,
  isMoeda = true,
  isContador = false,
) {
  let valorFormatado;
  if (isContador) {
    valorFormatado = `${valor}x`;
  } else if (isMoeda) {
    valorFormatado = formatarValorMonetario(valor);
  } else {
    valorFormatado = valor;
  }

  return `
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${cor};
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 10px Inter;
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">${titulo}</div>
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 15px Inter;
        color: ${cor};
        line-height: 1;
      ">${valorFormatado}</div>
    </div>
  `;
}

function criarCardResumo(
  titulo,
  valor,
  cor,
  isMoeda = true,
  isContador = false,
) {
  let valorFormatado;
  if (isContador) {
    valorFormatado = `${valor}x`;
  } else if (isMoeda) {
    valorFormatado = formatarValorMonetario(valor);
  } else {
    valorFormatado = valor;
  }

  return `
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${cor};
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">${titulo}</div>
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${cor};
      ">${valorFormatado}</div>
    </div>
  `;
}

function criarCardStat(titulo, valor, cor, rodada = "") {
  return `
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">${titulo}</div>
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${cor};
      ">${valor}</div>
      ${
        rodada
          ? `
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          margin-top: 4px;
        ">${rodada}</div>
      `
          : ""
      }
    </div>
  `;
}

function criarSecaoAjustesManuais(campos) {
  const camposComValor = campos.filter((campo) => campo.valor !== 0);

  if (camposComValor.length === 0) {
    return "";
  }

  return `
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 2px dashed ${MOBILE_DARK_HD_CONFIG.colors.warning};
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <h4 style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 12px Inter;
        color: ${MOBILE_DARK_HD_CONFIG.colors.warning};
        margin: 0 0 10px 0;
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
      ">
        <span>📝</span>
        <span>Ajustes Manuais</span>
      </h4>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${camposComValor
          .map(
            (campo) => `
          <div style="
            background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
            border: 1px solid ${campo.valor === 0 ? MOBILE_DARK_HD_CONFIG.colors.textMuted : campo.valor > 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
            border-radius: 6px;
            padding: 8px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} 11px Inter;
              color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
            ">${campo.nome}</span>
            <span style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 13px Inter;
              color: ${campo.valor === 0 ? MOBILE_DARK_HD_CONFIG.colors.textMuted : campo.valor > 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
            ">${formatarValorMonetario(campo.valor)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function criarItemExtratoRodadaMobile(
  rodada,
  index,
  temPontosCorridos,
  temMataMata,
  temTop10,
) {
  const { posicaoStyle, posicaoTexto } = obterEstiloPosicao(rodada);

  const bonusOnus = typeof rodada.bonusOnus === "number" ? rodada.bonusOnus : 0;
  const pontosCorridos =
    typeof rodada.pontosCorridos === "number" ? rodada.pontosCorridos : 0;
  const mataMata = typeof rodada.mataMata === "number" ? rodada.mataMata : 0;
  const top10 = typeof rodada.top10 === "number" ? rodada.top10 : 0;
  const saldoAcumulado =
    typeof rodada.saldoAcumulado === "number" ? rodada.saldoAcumulado : 0;

  // Verificar se a rodada teve ganhos
  const valorTotalRodada = bonusOnus + pontosCorridos + mataMata + top10;
  const temGanhos = valorTotalRodada !== 0;

  // Background: cinza claro se não teve ganhos, alternado normal se teve
  const backgroundRodada = !temGanhos
    ? "#E9ECEF"
    : index % 2 === 0
    ? EXTRATO_LIGHT_CONFIG.colors.surface
    : EXTRATO_LIGHT_CONFIG.colors.background;

  return `
    <div style="
      display: flex;
      align-items: center;
      padding: 12px ${EXTRATO_LIGHT_CONFIG.padding}px;
      border-bottom: 1px solid ${EXTRATO_LIGHT_CONFIG.colors.divider};
      background: ${backgroundRodada};
      ${rodada.isMito ? `border-left: 4px solid ${EXTRATO_LIGHT_CONFIG.colors.success};` : rodada.isMico ? `border-left: 4px solid ${EXTRATO_LIGHT_CONFIG.colors.danger};` : ""}
      min-height: 50px;
    ">
      <div style="
        background: ${EXTRATO_LIGHT_CONFIG.colors.surface};
        border: 1px solid ${EXTRATO_LIGHT_CONFIG.colors.border};
        padding: 6px 10px;
        border-radius: 8px;
        margin-right: 12px;
        min-width: 40px;
        text-align: center;
        font: ${EXTRATO_LIGHT_CONFIG.fonts.weights.bold} ${EXTRATO_LIGHT_CONFIG.fonts.bodySmall};
        color: ${EXTRATO_LIGHT_CONFIG.colors.textPrimary};
        flex-shrink: 0;
      ">R${rodada.rodada}</div>

      <div style="
        ${posicaoStyle}
        padding: 6px 10px;
        border-radius: 8px;
        margin-right: 12px;
        min-width: 50px;
        text-align: center;
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        flex-shrink: 0;
      ">${posicaoTexto}</div>

      <div style="
        flex: 1;
        display: grid;
        grid-template-columns: ${temPontosCorridos && temMataMata && temTop10 ? "1fr 1fr 1fr 1fr" : temPontosCorridos && temMataMata ? "1fr 1fr 1fr" : temPontosCorridos ? "1fr 1fr" : "1fr"};
        gap: 8px;
        margin-right: 12px;
      ">
        <div style="text-align: center;">
          <div style="
            font: ${EXTRATO_LIGHT_CONFIG.fonts.weights.semibold} ${EXTRATO_LIGHT_CONFIG.fonts.mini};
            color: ${EXTRATO_LIGHT_CONFIG.colors.textSecondary};
            margin-bottom: 2px;
          ">Bônus/Ônus</div>
          <div style="
            font: ${EXTRATO_LIGHT_CONFIG.fonts.weights.bold} ${EXTRATO_LIGHT_CONFIG.fonts.caption};
            color: ${bonusOnus === 0 ? EXTRATO_LIGHT_CONFIG.colors.textMuted : bonusOnus > 0 ? EXTRATO_LIGHT_CONFIG.colors.success : EXTRATO_LIGHT_CONFIG.colors.danger};
          ">${formatarValorMonetario(bonusOnus)}</div>
        </div>

        ${
          temPontosCorridos
            ? `
        <div style="text-align: center;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            margin-bottom: 2px;
          ">Pts Corridos</div>
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${pontosCorridos === 0 ? MOBILE_DARK_HD_CONFIG.colors.textMuted : pontosCorridos > 0 ? MOBILE_DARK_HD_CONFIG.colors.info : MOBILE_DARK_HD_CONFIG.colors.danger};
          ">${formatarValorMonetario(pontosCorridos)}</div>
        </div>
        `
            : ""
        }
        ${
          temMataMata
            ? `
        <div style="text-align: center;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            margin-bottom: 2px;
          ">Mata-Mata</div>
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${mataMata === 0 ? MOBILE_DARK_HD_CONFIG.colors.textMuted : mataMata > 0 ? MOBILE_DARK_HD_CONFIG.colors.warning : MOBILE_DARK_HD_CONFIG.colors.danger};
          ">${formatarValorMonetario(mataMata)}</div>
        </div>
        `
            : ""
        }
        ${
          temTop10
            ? `
        <div style="text-align: center;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            margin-bottom: 4px;
          ">TOP 10</div>
          ${
            top10 !== 0
              ? `
          <div style="
            background: ${rodada.top10Status === "MITO" ? "linear-gradient(90deg, rgba(46,204,113,0.15), transparent)" : "linear-gradient(90deg, rgba(231,76,60,0.15), transparent)"};
            border-left: 2px solid ${rodada.top10Status === "MITO" ? "#2ecc71" : "#e74c3c"};
            padding: 4px 6px;
            border-radius: 4px;
            margin: 0 auto;
            max-width: 90px;
          ">
            <div style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} 8px sans-serif;
              color: ${rodada.top10Status === "MITO" ? "#2ecc71" : "#e74c3c"};
              line-height: 1.2;
              margin-bottom: 2px;
            ">${rodada.top10Status === "MITO" ? "🏆" : "🐵"} ${rodada.top10Ordinal || ""} ${rodada.top10Tipo || ""}</div>
            <div style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
              color: ${rodada.top10Status === "MITO" ? "#2ecc71" : "#e74c3c"};
            ">${formatarValorMonetario(top10)}</div>
          </div>
          `
              : `<div style="color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};">-</div>`
          }
        </div>
        `
            : ""
        }
      </div>

      <div style="
        background: ${saldoAcumulado >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success + "15" : MOBILE_DARK_HD_CONFIG.colors.danger + "15"};
        border: 1px solid ${saldoAcumulado >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success + "40" : MOBILE_DARK_HD_CONFIG.colors.danger + "40"};
        padding: 8px 10px;
        border-radius: 8px;
        text-align: center;
        min-width: 70px;
        flex-shrink: 0;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
          color: ${saldoAcumulado >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
          line-height: 1;
        ">${formatarValorMonetario(saldoAcumulado)}</div>
      </div>
    </div>
  `;
}

// FUNÇÕES AUXILIARES
function calcularResumoFinanceiro(dadosExtrato) {
  let totalBonus = 0;
  let totalOnus = 0;
  let totalPontosCorridos = 0;
  let totalMataMata = 0;
  let totalTop10 = 0;
  let vezesMito = 0;
  let vezesMico = 0;
  let camposEditaveis = [];

  dadosExtrato.forEach((item) => {
    if (item.tipo === "bonus_onus") {
      if (item.valor > 0) {
        totalBonus += item.valor;
      } else {
        totalOnus += item.valor;
      }
      if (item.descricao.includes("MITO")) vezesMito++;
      if (item.descricao.includes("MICO")) vezesMico++;
    } else if (item.tipo === "pontos_corridos") {
      totalPontosCorridos += item.valor;
    } else if (item.tipo === "mata_mata") {
      totalMataMata += item.valor;
    } else if (item.tipo === "top10") {
      totalTop10 += item.valor;
    } else if (item.tipo === "campo_editavel") {
      camposEditaveis.push({
        nome: item.descricao,
        valor: item.valor,
      });
    }
  });

  const saldoFinal =
    totalBonus +
    totalOnus +
    totalPontosCorridos +
    totalMataMata +
    totalTop10 +
    camposEditaveis.reduce((acc, campo) => acc + campo.valor, 0);

  return {
    totalBonus,
    totalOnus,
    totalPontosCorridos,
    totalMataMata,
    totalTop10,
    vezesMito,
    vezesMico,
    camposEditaveis,
    saldoFinal,
  };
}

function estruturarDetalhamentoPorRodada(dadosExtrato) {
  const rodadasMap = new Map();

  let maiorRodada = 0;
  dadosExtrato.forEach((item) => {
    if (item.tipo === "campo_editavel") return;
    const rodadaMatch = item.data.match(/R(\d+)/);
    if (rodadaMatch) {
      const numeroRodada = parseInt(rodadaMatch[1]);
      maiorRodada = Math.max(maiorRodada, numeroRodada);
    }
  });

  for (let i = 1; i <= maiorRodada; i++) {
    rodadasMap.set(i, {
      rodada: i,
      posicao: null,
      bonusOnus: 0,
      pontosCorridos: 0,
      mataMata: 0,
      top10: 0,
      saldoAcumulado: 0,
      isMito: false,
      isMico: false,
      totalTimes: 32,
    });
  }

  dadosExtrato.forEach((item) => {
    if (item.tipo === "campo_editavel") return;

    const rodadaMatch = item.data.match(/R(\d+)/);
    if (!rodadaMatch) return;

    const numeroRodada = parseInt(rodadaMatch[1]);
    const rodadaData = rodadasMap.get(numeroRodada);

    if (!rodadaData) return;

    const posicaoMatch = item.descricao.match(/(\d+)°/);
    if (posicaoMatch && rodadaData.posicao === null) {
      rodadaData.posicao = parseInt(posicaoMatch[1]);
    }

    if (item.descricao.includes("MITO")) rodadaData.isMito = true;
    if (item.descricao.includes("MICO")) rodadaData.isMico = true;

    if (item.tipo === "bonus_onus") {
      rodadaData.bonusOnus = item.valor;
    } else if (item.tipo === "pontos_corridos") {
      rodadaData.pontosCorridos = item.valor;
    } else if (item.tipo === "mata_mata") {
      rodadaData.mataMata = item.valor;
    } else if (item.tipo === "top10") {
      rodadaData.top10 = item.valor;
      rodadaData.top10Status = item.top10Status;
      rodadaData.top10Posicao = item.top10Posicao;
      rodadaData.top10Ordinal = item.top10Ordinal;
      rodadaData.top10Tipo = item.top10Tipo;
    }
  });

  const rodadasArray = Array.from(rodadasMap.values()).sort(
    (a, b) => a.rodada - b.rodada,
  );

  let saldoAcumulado = 0;
  rodadasArray.forEach((rodada) => {
    const valorRodada =
      rodada.bonusOnus +
      (rodada.pontosCorridos || 0) +
      rodada.mataMata +
      (rodada.top10 || 0);
    saldoAcumulado += valorRodada;
    rodada.saldoAcumulado = saldoAcumulado;
  });

  return rodadasArray;
}

function obterEstiloPosicao(rodada) {
  const totalTimes = rodada.totalTimes || 32;

  if (rodada.isMito) {
    return {
      posicaoTexto: "MITO",
      posicaoStyle: `
        background: ${MOBILE_DARK_HD_CONFIG.colors.success};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};
      `,
    };
  }

  if (rodada.isMico) {
    return {
      posicaoTexto: "MICO",
      posicaoStyle: `
        background: ${MOBILE_DARK_HD_CONFIG.colors.danger};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.dangerDark};
      `,
    };
  }

  if (rodada.posicao && rodada.posicao > 0) {
    const isTop11 = rodada.posicao >= 1 && rodada.posicao <= 11;
    const isZ22_31 = rodada.posicao >= 22 && rodada.posicao <= totalTimes;

    if (isTop11) {
      return {
        posicaoTexto: `${rodada.posicao}°`,
        posicaoStyle: `
          background: ${MOBILE_DARK_HD_CONFIG.colors.success}30;
          color: ${MOBILE_DARK_HD_CONFIG.colors.success};
          border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.success};
        `,
      };
    }

    if (isZ22_31) {
      return {
        posicaoTexto: `${rodada.posicao}°`,
        posicaoStyle: `
          background: ${MOBILE_DARK_HD_CONFIG.colors.danger}30;
          color: ${MOBILE_DARK_HD_CONFIG.colors.danger};
          border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.danger};
        `,
      };
    }

    return {
      posicaoTexto: `${rodada.posicao}°`,
      posicaoStyle: `
        background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
      `,
    };
  }

  return {
    posicaoTexto: "-",
    posicaoStyle: `
      background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
      color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
    `,
  };
}

// COMPATIBILIDADE COM FUNÇÃO LEGADO
export async function exportarExtratoFinanceiroComoImagem(
  dadosExtrato,
  participante,
  rodadaAtual,
) {
  await exportarExtratoFinanceiroMobileDarkHD({
    dadosExtrato,
    participante,
    rodadaAtual,
  });
}

// ✅ EXPOR FUNÇÃO GLOBALMENTE PARA USO EM ONCLICK
window.exportarExtratoComoImagem = async function (
  dadosExtrato,
  participante,
  rodadaAtual,
) {
  try {
    console.log(
      "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Função global chamada com:",
      {
        dadosExtrato,
        participante,
        rodadaAtual,
      },
    );

    if (!dadosExtrato) {
      throw new Error(
        "Dados do extrato não fornecidos. Certifique-se de que o extrato financeiro foi carregado.",
      );
    }

    if (!Array.isArray(dadosExtrato)) {
      throw new Error("Dados do extrato devem ser um array.");
    }

    if (dadosExtrato.length === 0) {
      throw new Error("Nenhum dado financeiro disponível para exportação.");
    }

    await exportarExtratoFinanceiroMobileDarkHD({
      dadosExtrato,
      participante,
      rodadaAtual,
    });
  } catch (error) {
    console.error(
      "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Erro na exportação:",
      error,
    );
    MobileDarkUtils.mostrarErro(
      error.message || "Erro ao exportar extrato financeiro.",
    );
    throw error;
  }
};

console.log(
  "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Sistema Mobile Dark HD v3.0.1 configurado",
);
console.log(
  "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Resolução: 720px x 800px+ @ 4x scale",
);
console.log(
  "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Tema Dark com cores dinâmicas (verde/vermelho)",
);
console.log(
  "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Destaque para saldo final e acumulado",
);
console.log(
  "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] ✅ Função window.exportarExtratoComoImagem exposta",
);
// SISTEMA DE EXPORTAÇÃO EXTRATO FINANCEIRO - MOBILE DARK HD v3.0.1
// Migrado para padrão Mobile Dark HD seguindo export-pontos-corridos.js

import {
  MOBILE_DARK_HD_CONFIG,
  MobileDarkUtils,
  criarContainerMobileDark,
  gerarCanvasMobileDarkHD,
} from "./export-base.js";

console.log(
  "[EXPORT-EXTRATO-FINANCEIRO-MOBILE] Sistema Mobile Dark HD v3.0.1 carregado",
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

  MobileDarkUtils.validarDadosMobile(config, [
    "dadosExtrato",
    "participante",
    "rodadaAtual",
  ]);

  if (!Array.isArray(dadosExtrato)) {
    throw new Error("Dados do extrato inválidos");
  }

  const titulo = `💰 Extrato Financeiro`;
  const subtitulo = `${participante?.nome_cartola || "Participante"} • R${rodadaAtual}`;

  const exportContainer = criarContainerMobileDark(titulo, subtitulo, {
    rodada: rodadaAtual,
  });

  const contentDiv = exportContainer.querySelector("#mobile-export-content");

  contentDiv.innerHTML = criarLayoutExtratoFinanceiroMobile(
    dadosExtrato,
    participante,
    rodadaAtual,
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
) {
  const dadosValidados = Array.isArray(dadosExtrato) ? dadosExtrato : [];
  const resumoFinanceiro = calcularResumoFinanceiro(dadosValidados);
  const detalhamentoPorRodada = estruturarDetalhamentoPorRodada(dadosValidados);

  const saldoPositivo = resumoFinanceiro.saldoFinal >= 0;
  const gradienteSaldo = saldoPositivo
    ? MOBILE_DARK_HD_CONFIG.colors.gradientSuccess
    : MOBILE_DARK_HD_CONFIG.colors.gradientDanger;

  const isSuperCartola = detalhamentoPorRodada.some(
    (r) => r.pontosCorridos !== null && r.pontosCorridos !== undefined,
  );

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

  return `
    <!-- CARD EXPANDIDO - INFO PARTICIPANTE -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
        <!-- Escudo do Time -->
        ${
          participante?.clube_id
            ? `
          <img src="/escudos/${participante.clube_id}.png"
               style="
                 width: 40px; 
                 height: 40px; 
                 border-radius: 50%; 
                 border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.warning};
                 background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
                 flex-shrink: 0;
               "
               onerror="this.outerHTML='<div style=\\'width:40px;height:40px;background:${MOBILE_DARK_HD_CONFIG.colors.warning};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;\\'>⚽</div>'"
               alt="Escudo">
        `
            : `
          <div style="
            width: 40px; 
            height: 40px; 
            background: ${MOBILE_DARK_HD_CONFIG.colors.warning}; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 18px;
            flex-shrink: 0;
          ">⚽</div>
        `
        }

        <!-- Informações Principais -->
        <div style="flex: 1; min-width: 0;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
            color: ${MOBILE_DARK_HD_CONFIG.colors.text};
            margin-bottom: 3px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${participante?.nome_cartola || participante?.nome_cartoleiro || "Participante"}</div>

          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${participante?.nome_time || "Time não informado"}</div>

          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          ">até rodada ${rodadaAtual}</div>
        </div>
      </div>
    </div>

    <!-- CARD SALDO FINAL DESTACADO -->
    <div style="
      background: ${gradienteSaldo};
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      text-align: center;
      min-height: 80px;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: rgba(255,255,255,0.9);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 2px;
      ">${resumoFinanceiro.saldoFinal < 0 ? "💸 VALOR A PAGAR" : resumoFinanceiro.saldoFinal > 0 ? "💰 VALOR A RECEBER" : "✅ SALDO"}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} 32px Inter;
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${formatarValorMonetario(resumoFinanceiro.saldoFinal)}
      </div>
    </div>

    <!-- GRID RESUMO FINANCEIRO -->
    <div style="
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${MOBILE_DARK_HD_CONFIG.cardSpacing}px;
      margin-bottom: 16px;
    ">
      ${criarCardResumo("💚 Bônus Total", resumoFinanceiro.totalBonus, MOBILE_DARK_HD_CONFIG.colors.success)}
      ${criarCardResumo("💔 Ônus Total", resumoFinanceiro.totalOnus, MOBILE_DARK_HD_CONFIG.colors.danger)}
      ${isSuperCartola ? criarCardResumo("🏆 Pontos Corridos", resumoFinanceiro.totalPontosCorridos, MOBILE_DARK_HD_CONFIG.colors.info) : ""}
      ${isSuperCartola ? criarCardResumo("⚔️ Mata-Mata", resumoFinanceiro.totalMataMata, MOBILE_DARK_HD_CONFIG.colors.warning) : ""}
      ${criarCardResumo("🎩 Vezes MITO", resumoFinanceiro.vezesMito, MOBILE_DARK_HD_CONFIG.colors.gold, false, true)}
      ${criarCardResumo("🐵 Vezes MICO", resumoFinanceiro.vezesMico, MOBILE_DARK_HD_CONFIG.colors.danger, false, true)}
    </div>

    ${resumoFinanceiro.camposEditaveis.length > 0 ? criarSecaoAjustesManuais(resumoFinanceiro.camposEditaveis) : ""}

    <!-- TABELA DETALHAMENTO -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border-radius: 16px;
      padding: 0;
      border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
      overflow: hidden;
      margin-bottom: 20px;
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
        ">📋 DETALHAMENTO POR RODADA</h3>
      </div>

      <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
        ${
          detalhamentoPorRodada.length === 0
            ? `<div style="text-align: center; padding: 40px 20px; color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};">Nenhuma rodada encontrada</div>`
            : detalhamentoPorRodada
                .map((rodada, index) =>
                  criarItemExtratoRodadaMobile(rodada, index, isSuperCartola),
                )
                .join("")
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
  // ✅ FILTRAR APENAS CAMPOS COM VALOR DIFERENTE DE ZERO
  const camposComValor = campos.filter((campo) => campo.valor !== 0);

  // ✅ SE NÃO HOUVER CAMPOS COM VALOR, NÃO EXIBIR A SEÇÃO
  if (camposComValor.length === 0) {
    return "";
  }

  return `
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
      border: 2px dashed ${MOBILE_DARK_HD_CONFIG.colors.warning};
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    ">
      <h4 style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
        color: ${MOBILE_DARK_HD_CONFIG.colors.warning};
        margin: 0 0 12px 0;
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
      ">
        <span>📝</span>
        <span>Ajustes Manuais</span>
      </h4>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${camposComValor
          .map(
            (campo) => `
          <div style="
            background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
            border: 1px solid ${campo.valor >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
            border-radius: 8px;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
              color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
            ">${campo.nome}</span>
            <span style="
              font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
              color: ${campo.valor >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
            ">${formatarValorMonetario(campo.valor)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function criarItemExtratoRodadaMobile(rodada, index, isSuperCartola) {
  const { posicaoStyle, posicaoTexto } = obterEstiloPosicao(rodada);

  return `
    <div style="
      display: flex;
      align-items: center;
      padding: 12px ${MOBILE_DARK_HD_CONFIG.padding}px;
      border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
      ${rodada.isMito ? `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.success};` : rodada.isMico ? `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.danger};` : ""}
      min-height: 50px;
    ">
      <div style="
        background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
        padding: 6px 10px;
        border-radius: 8px;
        margin-right: 12px;
        min-width: 40px;
        text-align: center;
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
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
        grid-template-columns: ${isSuperCartola ? "1fr 1fr 1fr" : "1fr"};
        gap: 8px;
        margin-right: 12px;
      ">
        <div style="text-align: center;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            margin-bottom: 2px;
          ">Bônus/Ônus</div>
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${rodada.bonusOnus >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
          ">${formatarValorMonetario(rodada.bonusOnus)}</div>
        </div>

        ${
          isSuperCartola
            ? `
        <div style="text-align: center;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            margin-bottom: 2px;
          ">Pts Corridos</div>
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${rodada.pontosCorridos >= 0 ? MOBILE_DARK_HD_CONFIG.colors.info : MOBILE_DARK_HD_CONFIG.colors.danger};
          ">${formatarValorMonetario(rodada.pontosCorridos)}</div>
        </div>

        <div style="text-align: center;">
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};
            color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
            margin-bottom: 2px;
          ">Mata-Mata</div>
          <div style="
            font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
            color: ${rodada.mataMata >= 0 ? MOBILE_DARK_HD_CONFIG.colors.warning : MOBILE_DARK_HD_CONFIG.colors.danger};
          ">${formatarValorMonetario(rodada.mataMata)}</div>
        </div>
        `
            : ""
        }
      </div>

      <div style="
        background: ${rodada.saldoAcumulado >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success + "15" : MOBILE_DARK_HD_CONFIG.colors.danger + "15"};
        border: 1px solid ${rodada.saldoAcumulado >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success + "40" : MOBILE_DARK_HD_CONFIG.colors.danger + "40"};
        padding: 8px 10px;
        border-radius: 8px;
        text-align: center;
        min-width: 70px;
        flex-shrink: 0;
      ">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
          color: ${rodada.saldoAcumulado >= 0 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.danger};
          line-height: 1;
        ">${formatarValorMonetario(rodada.saldoAcumulado)}</div>
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
    camposEditaveis.reduce((acc, campo) => acc + campo.valor, 0);

  return {
    totalBonus,
    totalOnus,
    totalPontosCorridos,
    totalMataMata,
    vezesMito,
    vezesMico,
    camposEditaveis,
    saldoFinal,
  };
}

function estruturarDetalhamentoPorRodada(dadosExtrato) {
  const rodadasMap = new Map();

  dadosExtrato.forEach((item) => {
    if (item.tipo === "campo_editavel") return;

    const rodadaMatch = item.data.match(/R(\d+)/);
    if (!rodadaMatch) return;

    const numeroRodada = parseInt(rodadaMatch[1]);

    if (!rodadasMap.has(numeroRodada)) {
      rodadasMap.set(numeroRodada, {
        rodada: numeroRodada,
        posicao: null,
        bonusOnus: 0,
        pontosCorridos: 0,
        mataMata: 0,
        saldoAcumulado: 0,
        isMito: false,
        isMico: false,
        totalTimes: 32,
      });
    }

    const rodadaData = rodadasMap.get(numeroRodada);

    if (item.tipo === "bonus_onus") {
      rodadaData.bonusOnus = item.valor;

      const posicaoMatch = item.descricao.match(/(\d+)°/);
      if (posicaoMatch) {
        rodadaData.posicao = parseInt(posicaoMatch[1]);
      }

      if (item.descricao.includes("MITO")) rodadaData.isMito = true;
      if (item.descricao.includes("MICO")) rodadaData.isMico = true;
    } else if (item.tipo === "pontos_corridos") {
      rodadaData.pontosCorridos = item.valor;
    } else if (item.tipo === "mata_mata") {
      rodadaData.mataMata = item.valor;
    }
  });

  const rodadasArray = Array.from(rodadasMap.values()).sort(
    (a, b) => a.rodada - b.rodada,
  );

  let saldoAcumulado = 0;
  rodadasArray.forEach((rodada) => {
    const valorRodada =
      rodada.bonusOnus + (rodada.pontosCorridos || 0) + rodada.mataMata;
    saldoAcumulado += valorRodada;
    rodada.saldoAcumulado = saldoAcumulado;
  });

  return rodadasArray;
}

function obterEstiloPosicao(rodada) {
  // ✅ CORREÇÃO DO UNDEFINED - VERIFICAR SE POSIÇÃO EXISTE
  if (!rodada.posicao && !rodada.isMito && !rodada.isMico) {
    return {
      posicaoTexto: "-",
      posicaoStyle: `
        background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
      `,
    };
  }

  if (rodada.posicao === 1 || rodada.isMito) {
    return {
      posicaoTexto: "MITO",
      posicaoStyle: `
        background: ${MOBILE_DARK_HD_CONFIG.colors.success};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};
      `,
    };
  }

  if (rodada.posicao === rodada.totalTimes || rodada.isMico) {
    return {
      posicaoTexto: "MICO",
      posicaoStyle: `
        background: ${MOBILE_DARK_HD_CONFIG.colors.danger};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.dangerDark};
      `,
    };
  }

  if (rodada.posicao) {
    const isTop11 = rodada.posicao >= 2 && rodada.posicao <= 11;
    const isZ22_31 = rodada.posicao >= 22 && rodada.posicao <= 31;

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

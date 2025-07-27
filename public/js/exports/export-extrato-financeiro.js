// ✅ SISTEMA DE EXPORTAÇÃO PROFISSIONAL - EXTRATO FINANCEIRO
// 🔧 VERSÃO MELHORADA v2.5.0 - ESPELHA EXATAMENTE A TABELA DA INTERFACE

// ✅ CONFIGURAÇÃO DO TEMPLATE PROFISSIONAL
const TEMPLATE_CONFIG = {
  width: 900, // Aumentado para acomodar mais colunas
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
    mito: "#28a745",
    mico: "#dc3545",
    top11: "#155724",
    z22: "#721c24",
  },
  fonts: {
    title: "28px Inter, sans-serif",
    subtitle: "18px Inter, sans-serif",
    heading: "16px Inter, sans-serif",
    body: "13px Inter, sans-serif",
    caption: "11px Inter, sans-serif",
  },
};

// ✅ FUNÇÃO PRINCIPAL DE EXPORTAÇÃO PROFISSIONAL
export async function criarBotaoExportacaoExtratoFinanceiro(config) {
  if (!config || typeof config !== "object") {
    console.error("[EXPORT-EXTRATO-FINANCEIRO] Configuração inválida:", config);
    return;
  }

  const {
    containerId,
    dadosExtrato = [],
    participante = {},
    rodadaAtual = "",
  } = config;

  if (!containerId) {
    console.error("[EXPORT-EXTRATO-FINANCEIRO] containerId é obrigatório");
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[EXPORT-EXTRATO-FINANCEIRO] Container ${containerId} não encontrado`,
    );
    return;
  }

  // Remove botão existente
  const botaoExistente = container.querySelector(
    ".btn-export-extrato-financeiro",
  );
  if (botaoExistente) {
    botaoExistente.remove();
  }

  // Criar botão com design profissional
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

  const btn = document.createElement("button");
  btn.className = "btn-export-extrato-financeiro";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
      <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
    </svg>
    Exportar Extrato Financeiro
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

  // Event handler com tratamento seguro de async
  btn.onclick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `
      <div style="width: 16px; height: 16px; margin-right: 8px;">
        <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      Gerando Imagem...
    `;
    btn.disabled = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 0));

      await Promise.race([
        exportarExtratoFinanceiroComoImagemProfissional({
          dadosExtrato,
          participante,
          rodadaAtual,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout na exportação")), 30000),
        ),
      ]);
    } catch (error) {
      console.error("[EXPORT-EXTRATO-FINANCEIRO] Erro na exportação:", error);
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

// ✅ FUNÇÃO DE EXPORTAÇÃO PROFISSIONAL MELHORADA
async function exportarExtratoFinanceiroComoImagemProfissional(config) {
  const { dadosExtrato, participante, rodadaAtual } = config;

  console.log(
    "[EXPORT-EXTRATO-FINANCEIRO] 🎨 Criando layout que espelha a interface...",
  );

  // Criar container de exportação invisível
  const exportContainer = document.createElement("div");
  exportContainer.id = "extrato-financeiro-export-container";
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
  exportContainer.innerHTML = criarLayoutExtratoFinanceiro({
    dadosExtrato,
    participante,
    rodadaAtual,
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

    console.log("[EXPORT-EXTRATO-FINANCEIRO] 📸 Capturando imagem...");

    // Capturar com html2canvas
    const canvas = await html2canvas(exportContainer, {
      allowTaint: true,
      useCORS: true,
      scale: 3, // Aumentado de 2 para 3
      logging: false,
      width: TEMPLATE_CONFIG.width,
      height: exportContainer.scrollHeight,
      backgroundColor: TEMPLATE_CONFIG.colors.background,
      imageTimeout: 15000,
      removeContainer: true,
      letterRendering: true,
      foreignObjectRendering: true,
    });

    // Gerar nome do arquivo
    const timestamp = new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const nomeArquivo = `extrato-financeiro-${participante.nome_cartola?.replace(/\s/g, "_") || "participante"}-${timestamp}`;

    // Download da imagem
    const link = document.createElement("a");
    link.download = `${nomeArquivo}.png`;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();

    console.log("[EXPORT-EXTRATO-FINANCEIRO] ✅ Imagem exportada com sucesso");
    mostrarNotificacao("Imagem exportada com sucesso!", "success");
  } finally {
    document.body.removeChild(exportContainer);
  }
}

// ✅ FUNÇÃO MELHORADA: Layout que espelha exatamente a tabela da interface
function criarLayoutExtratoFinanceiro({
  dadosExtrato,
  participante,
  rodadaAtual,
}) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Validar e estruturar dados
  const dadosValidados = Array.isArray(dadosExtrato) ? dadosExtrato : [];

  // ✅ MELHORADO: Estruturar dados como na interface
  const resumoFinanceiro = calcularResumoFinanceiro(dadosValidados);
  const detalhamentoPorRodada = estruturarDetalhamentoPorRodada(dadosValidados);

  const saldoClass =
    resumoFinanceiro.saldoFinal >= 0
      ? TEMPLATE_CONFIG.colors.success
      : TEMPLATE_CONFIG.colors.danger;

  // Formatação de moeda profissional
  const formatarMoedaExport = (valor) => {
    const valorNumerico = typeof valor === "number" ? valor : 0;
    return `R$ ${Math.abs(valorNumerico).toFixed(2).replace(".", ",")}`;
  };

  // Determinar se é SuperCartola (tem pontos corridos e mata-mata)
  const isSuperCartola = detalhamentoPorRodada.some(
    (r) => r.pontosCorridos !== undefined || r.mataMata !== undefined,
  );

  return `
    <!-- HEADER PROFISSIONAL -->
    <div style="
      background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary} 0%, ${TEMPLATE_CONFIG.colors.secondary} 100%);
      color: white;
      padding: ${TEMPLATE_CONFIG.padding}px;
      text-align: center;
      position: relative;
      overflow: hidden;
      min-height: ${TEMPLATE_CONFIG.headerHeight}px;
    ">
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"50\" height=\"50\" viewBox=\"0 0 50 50\"><g fill=\"none\" fill-rule=\"evenodd\"><g fill=\"%23ffffff\" fill-opacity=\"0.08\"><polygon points=\"30 28 5 28 5 3 30 3\"/></g></g></svg>');
        opacity: 0.6;
      "></div>

      <div style="position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 16px;">
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
          ">Extrato Financeiro</h2>

          <div style="
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 4px 16px;
            display: inline-block;
            border: 1px solid rgba(255, 255, 255, 0.3);
          ">
            <span style="font: 600 13px Inter, sans-serif; letter-spacing: 0.5px;">
              ${participante?.nome_cartola || "PARTICIPANTE"} - ${participante?.nome_time || "TIME"}
            </span>
          </div>
        </div>
      </div>

      <p style="
        font: 500 11px Inter, sans-serif;
        margin: 8px 0 0 0;
        opacity: 0.9;
      ">até rodada ${rodadaAtual || "N/A"}</p>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div style="padding: ${TEMPLATE_CONFIG.padding}px;">

      <!-- SALDO FINAL DESTACADO -->
      <div style="
        background: linear-gradient(135deg, ${saldoClass}, ${resumoFinanceiro.saldoFinal >= 0 ? "#2ecc71" : "#e55353"});
        color: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      ">
        <h3 style="
          font: 600 ${TEMPLATE_CONFIG.fonts.heading} Inter, sans-serif;
          margin: 0 0 8px 0;
        ">💰 Saldo Final</h3>
        <div style="
          font: 700 36px Inter, sans-serif;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">${resumoFinanceiro.saldoFinal >= 0 ? "+" : "-"}${formatarMoedaExport(resumoFinanceiro.saldoFinal)}</div>
      </div>

      <!-- RESUMO FINANCEIRO - ESPELHA OS CARDS DA INTERFACE -->
      <div style="
        background: ${TEMPLATE_CONFIG.colors.surface};
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        border: 1px solid ${TEMPLATE_CONFIG.colors.border};
      ">
        <h3 style="
          font: 600 ${TEMPLATE_CONFIG.fonts.heading} Inter, sans-serif;
          margin: 0 0 16px 0;
          text-align: center;
          color: ${TEMPLATE_CONFIG.colors.primary};
        ">📊 Resumo Financeiro</h3>

        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        ">
          <!-- Bônus -->
          <div style="
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            color: #155724;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #c3e6cb;
          ">
            <h4 style="
              font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Bônus</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">
              ${formatarMoedaExport(resumoFinanceiro.totalBonus)}
            </p>
          </div>

          <!-- Ônus -->
          <div style="
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            color: #721c24;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #f5c6cb;
          ">
            <h4 style="
              font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Ônus</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">
              ${formatarMoedaExport(resumoFinanceiro.totalOnus)}
            </p>
          </div>

          ${
            isSuperCartola
              ? `
          <!-- Pontos Corridos -->
          <div style="
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            color: #0d47a1;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #bbdefb;
          ">
            <h4 style="
              font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Pontos Corridos</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">
              ${formatarMoedaExport(resumoFinanceiro.totalPontosCorridos)}
            </p>
          </div>

          <!-- Mata-Mata -->
          <div style="
            background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
            color: #e65100;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #ffb74d;
          ">
            <h4 style="
              font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Mata-Mata</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">
              ${formatarMoedaExport(resumoFinanceiro.totalMataMata)}
            </p>
          </div>
          `
              : ""
          }

          ${resumoFinanceiro.camposEditaveis
            .map(
              (campo) => `
          <div style="
            background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
            color: #e65100;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #ffb74d;
          ">
            <h4 style="
              font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">${campo.nome}</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">
              ${formatarMoedaExport(campo.valor)}
            </p>
          </div>
          `,
            )
            .join("")}

          <!-- Estatísticas -->
          <div style="
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            color: #2e7d32;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #81c784;
          ">
            <h4 style="
              font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Vezes MITO</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">
              ${resumoFinanceiro.vezesMito}
            </p>
          </div>

          <div style="
            background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
            color: #c62828;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #ef5350;
          ">
            <h4 style="
              font: 600 ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Vezes MICO</h4>
            <p style="font: 700 16px Inter, sans-serif; margin: 0;">
              ${resumoFinanceiro.vezesMico}
            </p>
          </div>
        </div>
      </div>

      <!-- DETALHAMENTO POR RODADA - ESPELHA A TABELA DA INTERFACE -->
      <div style="
        background: ${TEMPLATE_CONFIG.colors.surface};
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        border: 1px solid ${TEMPLATE_CONFIG.colors.border};
      ">
        <h3 style="
          font: 600 ${TEMPLATE_CONFIG.fonts.heading} Inter, sans-serif;
          margin: 0 0 16px 0;
          text-align: center;
          color: ${TEMPLATE_CONFIG.colors.primary};
        ">📋 Detalhamento por Rodada</h3>

        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:12px; min-width: 800px;">
            <thead>
              <tr style="background: linear-gradient(135deg, #495057 0%, #343a40 100%); color: white;">
                <th style="padding: 12px 8px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px; text-align: center;">Rodada</th>
                <th style="padding: 12px 8px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px; text-align: center;">Posição</th>
                <th style="padding: 12px 8px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px; text-align: center;">Bônus/Ônus</th>
                ${
                  isSuperCartola
                    ? `
                <th style="padding: 12px 8px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px; text-align: center;">Pontos Corridos</th>
                <th style="padding: 12px 8px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px; text-align: center;">Mata-Mata</th>
                `
                    : ""
                }
                <th style="padding: 12px 8px; font: 600 11px Inter, sans-serif; letter-spacing: 0.5px; text-align: center;">Total Acumulado</th>
              </tr>
            </thead>
            <tbody>
              ${
                detalhamentoPorRodada.length === 0
                  ? `
                <tr>
                  <td colspan="${isSuperCartola ? "6" : "4"}" style="text-align: center; padding: 20px; color: ${TEMPLATE_CONFIG.colors.textLight};">
                    Nenhuma rodada encontrada
                  </td>
                </tr>
              `
                  : detalhamentoPorRodada
                      .map((rodada, index) => {
                        const posicaoStyle = obterEstiloPosicao(rodada);

                        return `
                  <tr style="border-bottom: 1px solid ${TEMPLATE_CONFIG.colors.border}; ${index % 2 === 0 ? "background: #f8f9fa;" : ""}">
                    <td style="text-align: center; padding: 10px 8px; font: 600 12px Inter, sans-serif; background-color: #f8f9fa;">
                      ${rodada.rodada}
                    </td>
                    <td style="text-align: center; padding: 10px 8px; ${posicaoStyle.css}">
                      ${posicaoStyle.texto}
                    </td>
                    <td style="text-align: center; padding: 10px 8px; font: 600 12px Inter, sans-serif; color: ${obterCorValor(rodada.bonusOnus)};">
                      ${formatarValorTabela(rodada.bonusOnus)}
                    </td>
                    ${
                      isSuperCartola
                        ? `
                    <td style="text-align: center; padding: 10px 8px; font: 600 12px Inter, sans-serif; color: ${obterCorValor(rodada.pontosCorridos)};">
                      ${formatarValorTabela(rodada.pontosCorridos)}
                    </td>
                    <td style="text-align: center; padding: 10px 8px; font: 600 12px Inter, sans-serif; color: ${obterCorValor(rodada.mataMata)};">
                      ${formatarValorTabela(rodada.mataMata)}
                    </td>
                    `
                        : ""
                    }
                    <td style="text-align: center; padding: 10px 8px; font: 700 12px Inter, sans-serif; color: ${obterCorValor(rodada.saldoAcumulado)}; background-color: #f8f9fa; border-left: 3px solid #007bff;">
                      ${formatarValorTabela(rodada.saldoAcumulado)}
                    </td>
                  </tr>
                `;
                      })
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- FOOTER PROFISSIONAL -->
    <div style="
      background: ${TEMPLATE_CONFIG.colors.surface};
      border-top: 1px solid ${TEMPLATE_CONFIG.colors.border};
      padding: 12px ${TEMPLATE_CONFIG.padding}px;
      text-align: center;
      margin-top: 20px;
    ">
      <p style="
        font: ${TEMPLATE_CONFIG.fonts.caption} Inter, sans-serif;
        margin: 0;
        color: ${TEMPLATE_CONFIG.colors.textLight};
        line-height: 1.2;
      ">
        Gerado em ${dataFormatada} • SuperCartola Manager v2.5.0<br>
        Sistema de Gerenciamento de Ligas do Cartola FC
      </p>
    </div>
  `;
}

// ✅ FUNÇÕES AUXILIARES PARA PROCESSAR DADOS

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

  // Agrupar dados por rodada
  dadosExtrato.forEach((item) => {
    if (item.tipo === "campo_editavel") return; // Campos editáveis não vão na tabela de rodadas

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
        totalTimes: 32, // Assumindo 32 times por padrão
      });
    }

    const rodadaData = rodadasMap.get(numeroRodada);

    if (item.tipo === "bonus_onus") {
      rodadaData.bonusOnus = item.valor;

      // Extrair posição da descrição
      const posicaoMatch = item.descricao.match(/(\d+)°\/(\d+)/);
      if (posicaoMatch) {
        rodadaData.posicao = parseInt(posicaoMatch[1]);
        rodadaData.totalTimes = parseInt(posicaoMatch[2]);
        rodadaData.isMito = rodadaData.posicao === 1;
        rodadaData.isMico =```text
rodadaData.posicao === rodadaData.totalTimes;
      }

      // Verificar se é MITO ou MICO na descrição
      if (item.descricao.includes("MITO")) rodadaData.isMito = true;
      if (item.descricao.includes("MICO")) rodadaData.isMico = true;
    } else if (item.tipo === "pontos_corridos") {
      rodadaData.pontosCorridos = item.valor;
    } else if (item.tipo === "mata_mata") {
      rodadaData.mataMata = item.valor;
    }
  });

  // Converter para array e ordenar por rodada
  const rodadasArray = Array.from(rodadasMap.values()).sort(
    (a, b) => a.rodada - b.rodada,
  );

  // Calcular saldo acumulado
  let saldoAcumulado = 0;
  rodadasArray.forEach((rodada) => {
    const valorRodada =
      rodada.bonusOnus + rodada.pontosCorridos + rodada.mataMata;
    saldoAcumulado += valorRodada;
    rodada.saldoAcumulado = saldoAcumulado;
  });

  return rodadasArray;
}

function obterEstiloPosicao(rodada) {
  if (rodada.isMito) {
    return {
      texto: "MITO",
      css: "font: 800 12px Inter, sans-serif; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #fff; border-radius: 6px; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); border: 2px solid #20c997;",
    };
  }

  if (rodada.isMico) {
    return {
      texto: "MICO",
      css: "font: 800 12px Inter, sans-serif; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: #fff; border-radius: 6px; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); border: 2px solid #c82333;",
    };
  }

  if (rodada.posicao) {
    const isTop11 = rodada.posicao >= 1 && rodada.posicao <= 11;
    const isZ22_32 = rodada.posicao >= 22 && rodada.posicao <= 32;

    if (isTop11) {
      return {
        texto: `${rodada.posicao}°`,
        css: "font: 700 12px Inter, sans-serif; background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); color: #155724; border-radius: 6px; border: 1px solid #b8daff;",
      };
    }

    if (isZ22_32) {
      return {
        texto: `${rodada.posicao}°`,
        css: "font: 700 12px Inter, sans-serif; background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); color: #721c24; border-radius: 6px; border: 1px solid #f5c6cb;",
      };
    }

    return {
      texto: `${rodada.posicao}°`,
      css: "font: 500 12px Inter, sans-serif; color: #495057;",
    };
  }

  return {
    texto: "-",
    css: "font: 500 12px Inter, sans-serif; color: #6c757d;",
  };
}

function obterCorValor(valor) {
  if (typeof valor !== "number") return TEMPLATE_CONFIG.colors.textLight;
  if (valor > 0) return TEMPLATE_CONFIG.colors.success;
  if (valor < 0) return TEMPLATE_CONFIG.colors.danger;
  return TEMPLATE_CONFIG.colors.textLight;
}

function formatarValorTabela(valor) {
  if (typeof valor !== "number" || valor === 0) return "-";
  const valorFormatado = `R$ ${Math.abs(valor).toFixed(2).replace(".", ",")}`;
  return valor >= 0 ? `+${valorFormatado}` : `-${valorFormatado}`;
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
export async function exportarExtratoFinanceiroComoImagem(
  dadosExtrato,
  participante,
  rodadaAtual,
) {
  // Função wrapper para manter compatibilidade
  await exportarExtratoFinanceiroComoImagemProfissional({
    dadosExtrato,
    participante,
    rodadaAtual,
  });
}

console.log(
  "[EXPORT-EXTRATO-FINANCEIRO] ✅ Sistema de exportação melhorado v2.5.0 - Espelha exatamente a interface",
);
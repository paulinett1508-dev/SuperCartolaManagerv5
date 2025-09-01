<!-- MINI CARD DISCRETO - LÍDER -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
    border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
  ">
    <!-- Escudo compacto -->
    ${lider && lider.clube_id ? `
      <img src="/escudos/${lider.clube_id}.png"
           style="
             width: 32px; 
             height: 32px; 
             border-radius: 50%; 
             border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};
             background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
             flex-shrink: 0;
           "
           onerror="this.outerHTML='<div style=\\'width:32px;height:32px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:2px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;\\'>⚽</div>'"
           alt="Líder">
    ` : `
      <div style="
        width: 32px; 
        height: 32px; 
        background: ${MOBILE_DARK_HD_CONFIG.colors.gold}; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 16px;
        flex-shrink: 0;
      ">🏆</div>
    `}

    <!-- Informações compactas -->
    <div style="flex: 1; min-width: 0;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${lider ? (lider.nome_cartola || lider.nome_cartoleiro || "N/D") : "N/D"}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">Líder da Liga</div>
    </div>

    <!-- Pontuação destaque -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.gold};
      color: #000;
      padding: 6px 10px;
      border-radius: 8px;
      text-align: center;
      flex-shrink: 0;
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
      ">${lider ? (lider.pontos || 0) : "0"}</div>
    </div>
  </div>// SISTEMA DE EXPORTAÇÃO PONTOS CORRIDOS - MOBILE DARK HD v3.0.1
// Migrado para padrão mobile dark seguindo export-base.js e export-top10.js

import {
MOBILE_DARK_HD_CONFIG,
MobileDarkUtils,
criarContainerMobileDark,
gerarCanvasMobileDarkHD
} from './export-base.js';

console.log("[EXPORT-PONTOS-CORRIDOS-MOBILE] Sistema Mobile Dark HD v3.0.1 carregado");

// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO - RODADA (CONFRONTOS)
export async function criarBotaoExportacaoPontosCorridosRodada(config) {
if (!config || typeof config !== "object") {
  console.error("[EXPORT-PONTOS-CORRIDOS-MOBILE] Configuração inválida:", config);
  return;
}

const {
  containerId,
  jogos = [],
  rodadaLiga = "",
  rodadaCartola = "",
  times = [],
} = config;

console.log("[EXPORT-PONTOS-CORRIDOS-MOBILE] Criando botão exportação rodada:", {
  containerId,
  jogosCount: jogos.length,
  rodadaLiga,
  rodadaCartola,
});

const container = document.getElementById(containerId);
if (!container) {
  console.error(`[EXPORT-PONTOS-CORRIDOS-MOBILE] Container ${containerId} não encontrado`);
  return;
}

// Remove botão existente
const botaoExistente = container.querySelector(".btn-export-pontos-corridos-rodada-mobile");
if (botaoExistente) {
  botaoExistente.remove();
}

// Criar container do botão
const btnContainer = document.createElement("div");
btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

// Criar botão mobile dark
const btn = document.createElement("button");
btn.className = "btn-export-pontos-corridos-rodada-mobile";
btn.innerHTML = `
  <div style="display: flex; align-items: center; gap: 10px;">
    <span style="font-size: 16px;">⚔️</span>
    <span>Confrontos Mobile HD</span>
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
  background: ${MOBILE_DARK_HD_CONFIG.colors.gradientPrimary};
  color: ${MOBILE_DARK_HD_CONFIG.colors.text};
  border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.accent};
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

// Efeitos hover
btn.onmouseover = () => {
  btn.style.transform = "translateY(-3px) scale(1.02)";
  btn.style.boxShadow = `0 12px 40px ${MOBILE_DARK_HD_CONFIG.colors.accent}40`;
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
    await exportarPontosCorridosRodadaMobileDarkHD({
      jogos,
      rodadaLiga,
      rodadaCartola,
      times,
    });
  } catch (error) {
    console.error("[EXPORT-PONTOS-CORRIDOS-MOBILE] Erro na exportação:", error);
    MobileDarkUtils.mostrarErro("Erro ao gerar confrontos HD. Tente novamente.");
  } finally {
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
  }
};

// Adicionar animação CSS se não existir
if (!document.getElementById('export-mobile-animations')) {
  const style = document.createElement("style");
  style.id = 'export-mobile-animations';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

btnContainer.appendChild(btn);

// POSICIONAR NA PARTE SUPERIOR conforme solicitado
if (container.firstChild) {
  container.insertBefore(btnContainer, container.firstChild);
} else {
  container.appendChild(btnContainer);
}
}

// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO - CLASSIFICAÇÃO
export async function criarBotaoExportacaoPontosCorridosClassificacao(config) {
if (!config || typeof config !== "object") {
  console.error("[EXPORT-PONTOS-CORRIDOS-MOBILE] Configuração inválida:", config);
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
  console.error(`[EXPORT-PONTOS-CORRIDOS-MOBILE] Container ${containerId} não encontrado`);
  return;
}

// Remove botão existente
const botaoExistente = container.querySelector(".btn-export-pontos-corridos-classificacao-mobile");
if (botaoExistente) {
  botaoExistente.remove();
}

// Criar container do botão
const btnContainer = document.createElement("div");
btnContainer.style.cssText = "text-align: right; margin: 15px 0;";

// Criar botão mobile dark
const btn = document.createElement("button");
btn.className = "btn-export-pontos-corridos-classificacao-mobile";
btn.innerHTML = `
  <div style="display: flex; align-items: center; gap: 10px;">
    <span style="font-size: 16px;">🏆</span>
    <span>Classificação Mobile HD</span>
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

// Efeitos hover
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
    await exportarPontosCorridosClassificacaoMobileDarkHD(
      times,
      rodadaLiga,
      rodadaCartola,
    );
  } catch (error) {
    console.error("[EXPORT-PONTOS-CORRIDOS-MOBILE] Erro na exportação:", error);
    MobileDarkUtils.mostrarErro("Erro ao gerar classificação HD. Tente novamente.");
  } finally {
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
  }
};

btnContainer.appendChild(btn);

// POSICIONAR NA PARTE SUPERIOR
if (container.firstChild) {
  container.insertBefore(btnContainer, container.firstChild);
} else {
  container.appendChild(btnContainer);
}
}

// EXPORTAÇÃO MOBILE DARK HD - RODADA (CONFRONTOS)
async function exportarPontosCorridosRodadaMobileDarkHD(config) {
const { jogos, rodadaLiga, rodadaCartola, times } = config;

console.log("[EXPORT-PONTOS-CORRIDOS-MOBILE] Criando layout mobile dark HD - Rodada...");

// Validar dados
MobileDarkUtils.validarDadosMobile(config, ['jogos', 'rodadaLiga', 'rodadaCartola']);

// Definir títulos
const titulo = `⚔️ Confrontos R${rodadaLiga}`;
const subtitulo = `Rodada ${rodadaCartola} do Brasileirão`;

// Criar container mobile dark
const exportContainer = criarContainerMobileDark(titulo, subtitulo, { 
  rodada: rodadaLiga 
});

const contentDiv = exportContainer.querySelector("#mobile-export-content");

// Inserir conteúdo dos confrontos mobile
contentDiv.innerHTML = criarLayoutPontosCorridosRodadaMobile(jogos, rodadaLiga, rodadaCartola, times);

document.body.appendChild(exportContainer);

try {
  // Gerar nome do arquivo
  const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("confrontos", {
    rodada: rodadaLiga,
    extra: `r${rodadaCartola}`
  });

  // Gerar e fazer download da imagem HD
  await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);

} finally {
  // Limpar container temporário
  if (exportContainer.parentNode === document.body) {
    document.body.removeChild(exportContainer);
  }
}
}

// EXPORTAÇÃO MOBILE DARK HD - CLASSIFICAÇÃO
async function exportarPontosCorridosClassificacaoMobileDarkHD(times, rodadaLiga, rodadaCartola) {
console.log("[EXPORT-PONTOS-CORRIDOS-MOBILE] Criando layout mobile dark HD - Classificação...");

// Validar dados
MobileDarkUtils.validarDadosMobile({ times }, ['times']);

// Definir títulos
const titulo = `🏆 Classificação`;
const subtitulo = `Após ${rodadaLiga}ª rodada`;

// Criar container mobile dark
const exportContainer = criarContainerMobileDark(titulo, subtitulo, { 
  rodada: rodadaLiga 
});

const contentDiv = exportContainer.querySelector("#mobile-export-content");

// Inserir conteúdo da classificação mobile
contentDiv.innerHTML = criarLayoutPontosCorridosClassificacaoMobile(times, rodadaLiga, rodadaCartola);

document.body.appendChild(exportContainer);

try {
  // Gerar nome do arquivo
  const nomeArquivo = MobileDarkUtils.gerarNomeArquivoMobile("classificacao", {
    rodada: rodadaLiga,
    extra: `r${rodadaCartola}`
  });

  // Gerar e fazer download da imagem HD
  await gerarCanvasMobileDarkHD(exportContainer, nomeArquivo);

} finally {
  // Limpar container temporário
  if (exportContainer.parentNode === document.body) {
    document.body.removeChild(exportContainer);
  }
}
}

// LAYOUT CONFRONTOS MOBILE DARK
function criarLayoutPontosCorridosRodadaMobile(jogos, rodadaLiga, rodadaCartola, times) {
const goleadas = jogos.filter(j => 
  j.timeA?.pontosGoleada > 0 || j.timeB?.pontosGoleada > 0
).length;

const confrontosFinalizados = jogos.filter(j => 
  j.timeA?.pontos !== undefined && 
  j.timeB?.pontos !== undefined
).length;

return `
  <!-- MINI CARD DISCRETO - RODADA -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
    border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
  ">
    <!-- Ícone da rodada -->
    <div style="
      width: 32px; 
      height: 32px; 
      background: ${MOBILE_DARK_HD_CONFIG.colors.accent}; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 16px;
      flex-shrink: 0;
    ">⚔️</div>

    <!-- Informações compactas -->
    <div style="flex: 1; min-width: 0;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 2px;
      ">Rodada ${rodadaLiga}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
      ">R${rodadaCartola} do Brasileirão</div>
    </div>

    <!-- Total confrontos -->
    <div style="
      background: ${MOBILE_DARK_HD_CONFIG.colors.accent};
      color: #000;
      padding: 6px 10px;
      border-radius: 8px;
      text-align: center;
      flex-shrink: 0;
    ">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
      ">${jogos.length}</div>
    </div>
  </div>

  <!-- LISTA DE CONFRONTOS -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
    border-radius: 16px;
    padding: 0;
    border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    overflow: hidden;
    margin-bottom: 20px;
  ">

    <!-- Header da lista -->
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
      ">⚔️ CONFRONTOS DA RODADA</h3>
    </div>

    <!-- Lista de jogos -->
    <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
      ${jogos.slice(0, 16).map((jogo, index) => 
        criarItemConfrontoMobile(jogo, index)
      ).join('')}
    </div>

  </div>

  <!-- ESTATÍSTICAS RESUMO -->
  <div style="
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: ${MOBILE_DARK_HD_CONFIG.cardSpacing}px;
  ">

    <!-- Total de Jogos -->
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
      ">⚔️ Jogos</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.accent};
      ">${jogos.length}</div>
    </div>

    <!-- Goleadas -->
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
      ">🔥 Goleadas</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.warning};
      ">${goleadas}</div>
    </div>

    <!-- Finalizados -->
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
      ">✅ Finalizados</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.success};
      ">${confrontosFinalizados}</div>
    </div>

  </div>
`;
}

// ITEM INDIVIDUAL DO CONFRONTO MOBILE DARK
function criarItemConfrontoMobile(jogo, index) {
const timeA = jogo.timeA || {};
const timeB = jogo.timeB || {};
const temPontuacao = timeA.pontos !== undefined && 
                    timeA.pontos !== null && 
                    timeB.pontos !== undefined && 
                    timeB.pontos !== null;

let vencedorA = false, vencedorB = false, empate = false;
if (temPontuacao) {
  if (timeA.pontos > timeB.pontos) vencedorA = true;
  else if (timeB.pontos > timeA.pontos) vencedorB = true;
  else empate = true;
}

const goleadaA = timeA.pontosGoleada > 0;
const goleadaB = timeB.pontosGoleada > 0;

return `
  <div style="
    display: flex;
    align-items: center;
    padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
    border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
    ${(goleadaA || goleadaB) ? `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.warning};` : ''}
    transition: all 0.2s ease;
  ">

    <!-- Time A -->
    <div style="flex: 1; display: flex; align-items: center; gap: 12px;">
      ${timeA.clube_id ? `
        <img src="/escudos/${timeA.clube_id}.png"
             style="
               width: 32px; 
               height: 32px; 
               border-radius: 50%; 
               border: 2px solid ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.border};
               background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
             "
             onerror="this.outerHTML='<div style=\\'width:32px;height:32px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:2px solid ${MOBILE_DARK_HD_CONFIG.colors.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;\\'>⚽</div>'"
             alt="Escudo">
      ` : `
        <div style="
          width: 32px; 
          height: 32px; 
          background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight}; 
          border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.border}; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 14px;
        ">❤️</div>
      `}

      <div style="flex: 1; min-width: 0;">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
          color: ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.text};
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${timeA.nome_time || "N/D"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${timeA.nome_cartola || "N/D"}</div>
      </div>
    </div>

    <!-- Pontuação A -->
    <div style="text-align: center; margin: 0 12px;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
        color: ${vencedorA ? MOBILE_DARK_HD_CONFIG.colors.success : (vencedorB ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.text)};
      ">
        ${temPontuacao ? timeA.pontos.toFixed(2) : "-"}${goleadaA ? " 🔥" : ""}
      </div>
    </div>

    <!-- VS -->
    <div style="
      font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
      color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
      margin: 0 8px;
    ">VS</div>

    <!-- Pontuação B -->
    <div style="text-align: center; margin: 0 12px;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
        color: ${vencedorB ? MOBILE_DARK_HD_CONFIG.colors.success : (vencedorA ? MOBILE_DARK_HD_CONFIG.colors.danger : MOBILE_DARK_HD_CONFIG.colors.text)};
      ">
        ${temPontuacao ? timeB.pontos.toFixed(2) : "-"}${goleadaB ? " 🔥" : ""}
      </div>
    </div>

    <!-- Time B -->
    <div style="flex: 1; display: flex; align-items: center; gap: 12px; flex-direction: row-reverse;">
      ${timeB.clube_id ? `
        <img src="/escudos/${timeB.clube_id}.png"
             style="
               width: 32px; 
               height: 32px; 
               border-radius: 50%; 
               border: 2px solid ${vencedorB ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.border};
               background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
             "
             onerror="this.outerHTML='<div style=\\'width:32px;height:32px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:2px solid ${MOBILE_DARK_HD_CONFIG.colors.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;\\'>⚽</div>'"
             alt="Escudo">
      ` : `
        <div style="
          width: 32px; 
          height: 32px; 
          background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight}; 
          border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.border}; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 14px;
        ">❤️</div>
      `}

      <div style="flex: 1; min-width: 0; text-align: right;">
        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
          color: ${vencedorB ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.text};
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${timeB.nome_time || "N/D"}</div>

        <div style="
          font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
          color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${timeB.nome_cartola || "N/D"}</div>
      </div>
    </div>

  </div>
`;
}

// LAYOUT CLASSIFICAÇÃO MOBILE DARK
function criarLayoutPontosCorridosClassificacaoMobile(times, rodadaLiga, rodadaCartola) {
const totalTimes = times.length;
const lider = times.length > 0 ? times[0] : null;

return `
  <!-- CARD PRINCIPAL DE DESTAQUE - LÍDER -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientSuccess};
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
    text-align: center;
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadow};
  ">
    <div style="
      font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
      color: rgba(255,255,255,0.9);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 2px;
    ">🏆 LÍDER DA LIGA</div>

    ${lider ? `
      <!-- Escudo do líder -->
      <div style="margin-bottom: 12px;">
        ${lider.clube_id ? `
          <img src="/escudos/${lider.clube_id}.png"
               style="
                 width: 56px; 
                 height: 56px; 
                 border-radius: 50%; 
                 border: 3px solid rgba(255,255,255,0.3);
                 background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
                 margin-bottom: 12px;
               "
               onerror="this.outerHTML='<div style=\\'width:56px;height:56px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:3px solid rgba(255,255,255,0.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;\\'>⚽</div>'"
               alt="Escudo">
        ` : ""}
      </div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 4px;
      ">${lider.nome_cartola || lider.nome_cartoleiro || "N/D"}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: rgba(255,255,255,0.8);
        margin-bottom: 12px;
      ">${lider.nome_time || "Time não informado"}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold} ${MOBILE_DARK_HD_CONFIG.fonts.titleLarge};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        text-shadow: 0 2px 8px rgba(0,0,0,0.5);
      ">${lider.pontos || 0} pts</div>
    ` : `
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.body};
        color: rgba(255,255,255,0.8);
      ">Nenhum dado disponível</div>
    `}
  </div>

  <!-- TABELA CLASSIFICAÇÃO -->
  <div style="
    background: ${MOBILE_DARK_HD_CONFIG.colors.surface};
    border-radius: 16px;
    padding: 0;
    border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
    box-shadow: ${MOBILE_DARK_HD_CONFIG.colors.shadowLight};
    overflow: hidden;
    margin-bottom: 20px;
  ">

    <!-- Header da tabela -->
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
      ">🏆 CLASSIFICAÇÃO GERAL</h3>
    </div>

    <!-- Lista de classificação -->
    <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px 0;">
      ${times.slice(0, 20).map((time, index) => 
        criarItemClassificacaoMobile(time, index)
      ).join('')}
    </div>

  </div>

  <!-- ESTATÍSTICAS RESUMO -->
  <div style="
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${MOBILE_DARK_HD_CONFIG.cardSpacing}px;
  ">

    <!-- Total Participantes -->
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
      ">👥 Times</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.accent};
      ">${totalTimes}</div>
    </div>

    <!-- Rodada Atual -->
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
      ">📅 Rodada</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
        color: ${MOBILE_DARK_HD_CONFIG.colors.success};
      ">${rodadaLiga}ª</div>
    </div>

  </div>
`;
}

// ITEM INDIVIDUAL DA CLASSIFICAÇÃO MOBILE DARK
function criarItemClassificacaoMobile(time, index) {
const posicao = index + 1;

// Determinar estilo da posição
let posicaoDisplay, posicaoStyle, cardStyle = "";

if (posicao === 1) {
  posicaoDisplay = "🥇";
  posicaoStyle = `
    background: ${MOBILE_DARK_HD_CONFIG.colors.gold};
    color: #000;
    font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.extrabold};
  `;
  cardStyle = `border-left: 4px solid ${MOBILE_DARK_HD_CONFIG.colors.gold};`;
} else if (posicao === 2) {
  posicaoDisplay = "🥈";
  posicaoStyle = `
    background: ${MOBILE_DARK_HD_CONFIG.colors.silver};
    color: #000;
    font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold};
  `;
} else if (posicao === 3) {
  posicaoDisplay = "🥉";
  posicaoStyle = `
    background: ${MOBILE_DARK_HD_CONFIG.colors.bronze};
    color: #000;
    font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold};
  `;
} else {
  posicaoDisplay = `${posicao}º`;
  posicaoStyle = `
    background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
    color: ${MOBILE_DARK_HD_CONFIG.colors.textSecondary};
    font-weight: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold};
  `;
}

return `
  <div style="
    display: flex;
    align-items: center;
    padding: 16px ${MOBILE_DARK_HD_CONFIG.padding}px;
    border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
    ${cardStyle}
    transition: all 0.2s ease;
  ">

    <!-- Posição -->
    <div style="
      ${posicaoStyle}
      padding: 8px 12px;
      border-radius: 8px;
      margin-right: 16px;
      min-width: 50px;
      text-align: center;
      font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
    ">
      ${posicaoDisplay}
    </div>

    <!-- Escudo -->
    <div style="margin-right: 12px; flex-shrink: 0;">
      ${time.clube_id ? `
        <img src="/escudos/${time.clube_id}.png"
             style="
               width: 32px; 
               height: 32px; 
               border-radius: 50%; 
               border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
               background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};
             "
             onerror="this.outerHTML='<div style=\\'width:32px;height:32px;background:${MOBILE_DARK_HD_CONFIG.colors.surfaceLight};border:2px solid ${MOBILE_DARK_HD_CONFIG.colors.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;\\'>⚽</div>'"
             alt="Escudo">
      ` : `
        <div style="
          width: 32px; 
          height: 32px; 
          background: ${MOBILE_DARK_HD_CONFIG.colors.surfaceLight}; 
          border: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.border}; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 14px;
        ">❤️</div>
      `}
    </div>

    <!-- Informações -->
    <div style="flex: 1; min-width: 0;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.body};
        color: ${MOBILE_DARK_HD_CONFIG.colors.text};
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${time.nome_cartola || time.nome_cartoleiro || "N/D"}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${time.nome_time || "Time não informado"}</div>
    </div>

    <!-- Pontuação -->
    <div style="text-align: right; margin-left: 12px;">
      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.subheading};
        color: ${posicao <= 3 ? MOBILE_DARK_HD_CONFIG.colors.success : MOBILE_DARK_HD_CONFIG.colors.accent};
      ">${time.pontos || 0}</div>

      <div style="
        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
        color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};
        margin-top: 2px;
      ">pts</div>
    </div>

  </div>
`;
}

// COMPATIBILIDADE COM FUNÇÕES LEGADO
export async function exportarPontosCorridosRodadaComoImagem(jogos, rodadaLiga, rodadaCartola, times) {
await exportarPontosCorridosRodadaMobileDarkHD({
  jogos, rodadaLiga, rodadaCartola, times
});
}

export async function exportarPontosCorridosClassificacaoComoImagem(times, rodadaLiga, rodadaCartola) {
await exportarPontosCorridosClassificacaoMobileDarkHD(times, rodadaLiga, rodadaCartola);
}

console.log("[EXPORT-PONTOS-CORRIDOS-MOBILE] Sistema Mobile Dark HD configurado");
console.log("[EXPORT-PONTOS-CORRIDOS-MOBILE] Resolução: 400px x 800px+ @ 4x scale");
console.log("[EXPORT-PONTOS-CORRIDOS-MOBILE] Compatibilidade com sistema existente mantida");
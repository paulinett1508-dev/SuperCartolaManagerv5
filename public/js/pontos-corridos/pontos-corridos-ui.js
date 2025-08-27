// PONTOS CORRIDOS UI - Interface e Renderização
// Responsável por: renderização, templates, interface visual

import {
  PONTOS_CORRIDOS_CONFIG,
  calcularRodadaBrasileirao,
} from "./pontos-corridos-config.js";

// Renderiza interface principal
export function renderizarInterface(
  container,
  ligaId,
  onRodadaChange,
  onClassificacaoClick,
) {
  if (!container) {
    console.error("[PONTOS-CORRIDOS-UI] Container não encontrado");
    return;
  }

  container.innerHTML = `
    <div id="pontos-corridos-interface">
      <!-- Seletor de Rodada -->
      <div id="pontosCorridosSelect"></div>

      <!-- Conteúdo Principal -->
      <div id="pontosCorridosRodada"></div>
    </div>
  `;

  // Configurar callbacks
  if (onRodadaChange) {
    container.onRodadaChange = onRodadaChange;
  }
  if (onClassificacaoClick) {
    container.onClassificacaoClick = onClassificacaoClick;
  }

  console.log("[PONTOS-CORRIDOS-UI] Interface renderizada");
}

// Renderiza seletor de rodada
export function renderSeletorRodada(
  confrontos,
  onRodadaChange,
  onClassificacaoClick,
) {
  const container = document.getElementById("pontosCorridosSelect");
  if (!container) return;

  const { rodadaInicial } = PONTOS_CORRIDOS_CONFIG;

  container.innerHTML = `
    <div style="max-width: 700px; margin: 0 auto 20px auto; text-align: center;">
      <select id="rodadaPontosCorridosSelect" class="rodada-select">
        ${confrontos
          .map(
            (_, idx) => `
            <option value="${idx}">
              ${idx + 1}ª Rodada (Rodada ${calcularRodadaBrasileirao(idx)}ª do BR)
            </option>
          `,
          )
          .join("")}
      </select>
      <button id="btnClassificacaoPontosCorridos" class="btn-classificacao">
        Classificação
      </button>
    </div>
  `;

  // Event listeners
  const selectElement = document.getElementById("rodadaPontosCorridosSelect");
  if (selectElement && onRodadaChange) {
    selectElement.addEventListener("change", (e) => {
      onRodadaChange(Number(e.target.value));
    });
  }

  const btnClassificacao = document.getElementById(
    "btnClassificacaoPontosCorridos",
  );
  if (btnClassificacao && onClassificacaoClick) {
    btnClassificacao.addEventListener("click", onClassificacaoClick);
  }
}

// Renderiza estado de loading
export function renderLoadingState(containerId, texto = "Carregando dados") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 69, 0, 0.3);
        border-top: 4px solid var(--laranja, #FF4500);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px auto;
      "></div>
      <p style="color: var(--text-muted, #a0a0a0); font: 500 14px Inter, sans-serif;">
        ${texto}...
      </p>
    </div>
  `;
}

// Renderiza estado de erro
export function renderErrorState(containerId, erro) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="
      color: var(--danger, #ef4444);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
      font: 500 14px Inter, sans-serif;
    ">
      Erro ao carregar dados: ${erro.message || erro}
    </div>
  `;
}

// Renderiza tabela de confrontos da rodada
export function renderTabelaRodada(
  jogos,
  idxRodada,
  pontuacoesMap,
  rodadaAtual,
) {
  const rodadaCartola = calcularRodadaBrasileirao(idxRodada);
  const isRodadaPassada = rodadaCartola < rodadaAtual;

  const linhasHtml = jogos
    .map((jogo, i) => {
      const timeA = jogo.timeA;
      const timeB = jogo.timeB;
      const idA = timeA.id;
      const idB = timeB.id;
      const pontosA = pontuacoesMap[idA] ?? null;
      const pontosB = pontuacoesMap[idB] ?? null;

      let classA = "";
      let classB = "";
      let dif = "-";
      let financeiro = {
        financeiroA: 0,
        financeiroB: 0,
        pontosGoleadaA: 0,
        pontosGoleadaB: 0,
      };

      if (isRodadaPassada && pontosA !== null && pontosB !== null) {
        dif = Math.abs(pontosA - pontosB);

        // Importa função de cálculo financeiro dinamicamente
        import("./pontos-corridos-core.js").then((module) => {
          financeiro = module.calcularFinanceiroConfronto(pontosA, pontosB);
        });

        if (pontosA > pontosB) {
          classA = "vencedor";
          classB = "perdedor";
        } else if (pontosB > pontosA) {
          classB = "vencedor";
          classA = "perdedor";
        } else {
          classA = "empate";
          classB = "empate";
        }
      }

      const nomeTimeA = timeA.nome_time || timeA.nome || "N/D";
      const nomeCartolaA = timeA.nome_cartola || timeA.nome_cartoleiro || "N/D";
      const nomeTimeB = timeB.nome_time || timeB.nome || "N/D";
      const nomeCartolaB = timeB.nome_cartola || timeB.nome_cartoleiro || "N/D";

      const difFormatada =
        typeof dif === "number" ? dif.toFixed(2).replace(".", ",") : dif;
      const isGoleada =
        financeiro.pontosGoleadaA > 0 || financeiro.pontosGoleadaB > 0;

      // Formatação financeira discreta
      const formatarFinanceiroDiscreto = (valor) => {
        if (!isRodadaPassada || valor === 0 || valor == null) return "";
        const cor = valor > 0 ? "#28a745" : "#dc3545";
        const valorAbs = Math.abs(valor).toFixed(2).replace(".", ",");
        const prefixo = valor > 0 ? "+" : "-";
        return `<span style="font-size: 0.75em; color: ${cor}; margin-left: 4px;">(${prefixo}R$ ${valorAbs})</span>`;
      };

      const financeiroADiscreto = formatarFinanceiroDiscreto(
        financeiro.financeiroA,
      );
      const financeiroBDiscreto = formatarFinanceiroDiscreto(
        financeiro.financeiroB,
      );
      const linhaGoleadaClass = isGoleada ? "linha-goleada" : "";

      return `
      <tr class="${linhaGoleadaClass}" style="border-bottom: 1px solid #eee;">
        <td style="text-align: center; padding: 8px 4px; font-weight: 600; color: #555;">${i + 1}</td>
        <td style="text-align: left; padding: 8px 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="/escudos/${timeA.clube_id}.png" style="width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; border: 1px solid #eee;" onerror="this.style.display='none'">
            <div>
              <div style="font-weight: 500; font-size: 0.9em; color: #333;">${nomeTimeA}</div>
              <div style="font-size: 0.8em; color: #777;">${nomeCartolaA}</div>
            </div>
          </div>
        </td>
        <td style="text-align: center; padding: 8px 4px; font-weight: 600; font-size: 1em; color: ${classA === "vencedor" ? "#198754" : classA === "perdedor" ? "#dc3545" : "#333"};">
          ${pontosA !== null ? pontosA.toFixed(2).replace(".", ",") : "-"}
          ${financeiroADiscreto}
          ${isGoleada && classA === "vencedor" ? '<span style="color: #ffc107; margin-left: 4px; font-size: 0.8em;" title="Ponto Goleada">🔥</span>' : ""}
        </td>
        <td style="text-align: center; padding: 8px 4px; font-weight: 700; color: #888;">X</td>
        <td style="text-align: center; padding: 8px 4px; font-weight: 600; font-size: 1em; color: ${classB === "vencedor" ? "#198754" : classB === "perdedor" ? "#dc3545" : "#333"};">
          ${pontosB !== null ? pontosB.toFixed(2).replace(".", ",") : "-"}
          ${financeiroBDiscreto}
          ${isGoleada && classB === "vencedor" ? '<span style="color: #ffc107; margin-left: 4px; font-size: 0.8em;" title="Ponto Goleada">🔥</span>' : ""}
        </td>
        <td style="text-align: left; padding: 8px 4px;">
          <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
            <div>
              <div style="font-weight: 500; font-size: 0.9em; color: #333; text-align: right;">${nomeTimeB}</div>
              <div style="font-size: 0.8em; color: #777; text-align: right;">${nomeCartolaB}</div>
            </div>
            <img src="/escudos/${timeB.clube_id}.png" style="width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; border: 1px solid #eee;" onerror="this.style.display='none'">
          </div>
        </td>
        <td style="text-align: center; padding: 8px 4px; font-size: 0.85em; color: #666;">${difFormatada}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div style="max-width: 900px; margin: 0 auto;">
      <h3 style="text-align: center; font-size: ${PONTOS_CORRIDOS_CONFIG.ui.fontSize.header}; margin-bottom: 10px;">
        ${idxRodada + 1}ª Rodada da Liga Pontos Corridos<br>
        <span style="font-size: ${PONTOS_CORRIDOS_CONFIG.ui.fontSize.subheader}; color: #888;">
          Rodada ${rodadaCartola}ª do Brasileirão
        </span>
      </h3>
      <div id="exportPontosCorridosRodadaBtnContainer" style="text-align: right; margin-bottom: 8px;"></div>

      <table class="ranking-table" style="width: 100%; font-size: ${PONTOS_CORRIDOS_CONFIG.ui.fontSize.rodada}; border-collapse: collapse;">
        <thead style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
          <tr>
            <th style="text-align: center; padding: 8px 4px; width: 5%;">#</th>
            <th style="text-align: left; padding: 8px 4px; width: 30%;">Time 1</th>
            <th style="text-align: center; padding: 8px 4px; width: 15%;">Pts 1</th>
            <th style="text-align: center; padding: 8px 4px; width: 5%;">X</th>
            <th style="text-align: center; padding: 8px 4px; width: 15%;">Pts 2</th>
            <th style="text-align: right; padding: 8px 4px; width: 25%;">Time 2</th>
            <th style="text-align: center; padding: 8px 4px; width: 5%;">Dif</th>
          </tr>
        </thead>
        <tbody id="jogos-tbody">
          ${linhasHtml}
        </tbody>
      </table>
    </div>
  `;
}

// Renderiza tabela de classificação
export function renderTabelaClassificacao(
  classificacao,
  ultimaRodada,
  houveErro,
) {
  const { ui, textos } = PONTOS_CORRIDOS_CONFIG;

  const textoRodadas =
    ultimaRodada > 0
      ? `Após ${ultimaRodada} rodada${ultimaRodada > 1 ? "s" : ""} da Liga`
      : "Classificação inicial";

  const avisoErro = houveErro
    ? `<span style='color: red;'>(${textos.dadosParciais})</span>`
    : "";

  // Formatação de valores financeiros
  const formatarMoeda = (valor) => {
    const cor = valor > 0 ? "#198754" : valor < 0 ? "#dc3545" : "#333";
    const valorAbs = Math.abs(valor).toFixed(2).replace(".", ",");
    const prefixo = valor >= 0 ? "R$ " : "-R$ ";
    return `<span style="font-weight: 600; color: ${cor};">${prefixo}${valorAbs}</span>`;
  };

  const linhasClassificacao = classificacao
    .map((item, idx) => {
      const nomeTime = item.time.nome_time || item.time.nome || "N/D";
      const nomeCartola =
        item.time.nome_cartola || item.time.nome_cartoleiro || "N/D";

      const estiloLinha =
        idx === 0
          ? "background-color: #fff3cd; font-weight: bold;"
          : idx % 2 !== 0
            ? "background-color: #f9f9f9;"
            : "";

      const estiloSaldo =
        item.saldoPontos > 0
          ? "color: #198754;"
          : item.saldoPontos < 0
            ? "color: #dc3545;"
            : "";

      const financeiroFormatado = formatarMoeda(item.financeiroTotal);

      return `
      <tr style="${estiloLinha}">
        <td style="text-align: center; padding: 5px 3px;">${idx + 1}</td>
        <td style="text-align: center; padding: 5px 3px;">
          <img src="/escudos/${item.time.clube_id}.png" alt="" class="escudo" 
               style="width: 20px; height: 20px;" onerror="this.style.display='none'"/>
        </td>
        <td style="text-align: left; padding: 5px 3px;">${nomeTime}</td>
        <td style="text-align: left; padding: 5px 3px;">${nomeCartola}</td>
        <td style="text-align: center; padding: 5px 3px; font-size: 1.1em; font-weight: 600; color: #0d6efd;">${item.pontos}</td>
        <td style="text-align: center; padding: 5px 3px;">${item.jogos}</td>
        <td style="text-align: center; padding: 5px 3px;">${item.vitorias}</td>
        <td style="text-align: center; padding: 5px 3px;">${item.empates}</td>
        <td style="text-align: center; padding: 5px 3px;">${item.derrotas}</td>
        <td style="text-align: center; padding: 5px 3px; background-color: #fff3e0; font-weight: ${item.pontosGoleada > 0 ? "bold" : "normal"};">${item.pontosGoleada}</td>
        <td style="text-align: center; padding: 5px 3px;">${item.pontosPro.toFixed(2)}</td>
        <td style="text-align: center; padding: 5px 3px;">${item.pontosContra.toFixed(2)}</td>
        <td style="text-align: center; padding: 5px 3px; ${estiloSaldo}">${item.saldoPontos.toFixed(2)}</td>
        <td style="text-align: center; padding: 5px 3px;">${financeiroFormatado}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div style="max-width: ${ui.maxWidth}; margin: 0 auto;">
      <h3 style="text-align: center; font-size: ${ui.fontSize.header}; margin-bottom: 10px;">
        Classificação da Liga Pontos Corridos<br>
        <span style="font-size: ${ui.fontSize.subheader}; color: #888;">
          ${textoRodadas} ${avisoErro}
        </span>
      </h3>
      <div id="exportClassificacaoPontosCorridosBtnContainer" style="text-align: right; margin-bottom: 8px;"></div>
      <button id="btnVoltarPontosCorridos" class="btn-voltar" style="margin-bottom: 12px;">
        ← Voltar para Rodadas
      </button>

      <table class="ranking-table" style="width: 100%; font-size: ${ui.fontSize.classificacao}; border-collapse: collapse;">
        <thead style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
          <tr>
            <th style="text-align: center; padding: 6px 3px; width: 3%;">Pos</th>
            <th style="text-align: center; padding: 6px 3px; width: 3%;">❤️</th>
            <th style="text-align: left; padding: 6px 3px; width: 20%;">Time</th>
            <th style="text-align: left; padding: 6px 3px; width: 18%;">Cartoleiro</th>
            <th style="text-align: center; padding: 6px 3px; width: 5%; font-size: 1.1em; color: #0d6efd;">Pts</th>
            <th style="text-align: center; padding: 6px 3px; width: 4%;">J</th>
            <th style="text-align: center; padding: 6px 3px; width: 4%;">V</th>
            <th style="text-align: center; padding: 6px 3px; width: 4%;">E</th>
            <th style="text-align: center; padding: 6px 3px; width: 4%;">D</th>
            <th style="text-align: center; padding: 6px 3px; width: 4%; background-color: #fff3e0;">PG</th>
            <th style="text-align: center; padding: 6px 3px; width: 7%;">PP</th>
            <th style="text-align: center; padding: 6px 3px; width: 7%;">PC</th>
            <th style="text-align: center; padding: 6px 3px; width: 7%;">SP</th>
            <th style="text-align: center; padding: 6px 3px; width: 10%;">R$</th>
          </tr>
        </thead>
        <tbody>
          ${linhasClassificacao}
        </tbody>
      </table>

      <!-- Legenda explicativa -->
      <div style="
        margin-top: 15px; 
        padding: 10px; 
        background-color: #f8f9fa; 
        border-radius: 5px; 
        font-size: 12px;
      ">
        <strong>Legenda:</strong>
        <ul style="
          list-style-type: none; 
          padding-left: 10px; 
          margin-top: 5px; 
          display: flex; 
          flex-wrap: wrap; 
          gap: 15px;
        ">
          <li><strong>Pts</strong> - Pontos</li>
          <li><strong>J</strong> - Jogos</li>
          <li><strong>V</strong> - Vitórias</li>
          <li><strong>E</strong> - Empates</li>
          <li><strong>D</strong> - Derrotas</li>
          <li><strong>PG</strong> - Pontos Goleada (Vitória ≥ 50 pts)</li>
          <li><strong>PP</strong> - Pontos Pró (Média)</li>
          <li><strong>PC</strong> - Pontos Contra (Média)</li>
          <li><strong>SP</strong> - Saldo de Pontos (Média)</li>
          <li><strong>R$</strong> - Financeiro Acumulado</li>
        </ul>
      </div>
    </div>
  `;
}

// Função para atualizar conteúdo de container
export function atualizarContainer(containerId, html) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(
      `[PONTOS-CORRIDOS-UI] Container ${containerId} não encontrado`,
    );
    return false;
  }

  container.innerHTML = html;
  return true;
}

// Função para adicionar event listener do botão voltar
export function configurarBotaoVoltar(onVoltarClick) {
  const btnVoltar = document.getElementById("btnVoltarPontosCorridos");
  if (btnVoltar && onVoltarClick) {
    btnVoltar.addEventListener("click", onVoltarClick, { once: true });
  }
}

console.log("[PONTOS-CORRIDOS-UI] Módulo carregado com sucesso");

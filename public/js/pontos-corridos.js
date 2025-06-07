import {
  gerarConfrontos,
  calcularResultadoConfronto,
  buscarStatusMercado,
  buscarTimesLiga,
} from "./pontos-corridos-utils.js";
import {
  criarBotaoExportacaoRodada,
  exportarPontosCorridosRodadaComoImagem,
  exportarClassificacaoPontosCorridosComoImagem,
} from "./export.utils.js";
import { getRankingRodadaEspecifica } from "./rodadas.js";

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");
const RODADA_INICIAL = 7;

let times = [];
let confrontos = [];
let rodadaAtualBrasileirao = 1;

// Função de cálculo financeiro dos confrontos
export function calcularFinanceiroConfronto(pontosA, pontosB) {
  let financeiroA = 0;
  let financeiroB = 0;
  let pontosGoleadaA = 0;
  let pontosGoleadaB = 0;

  if (pontosA === null || pontosB === null) {
    return {
      financeiroA: 0,
      financeiroB: 0,
      pontosGoleadaA: 0,
      pontosGoleadaB: 0,
    };
  }

  const diferenca = Math.abs(pontosA - pontosB);

  if (pontosA === pontosB) {
    financeiroA = 0;
    financeiroB = 0;
  } else if (diferenca >= 50) {
    if (pontosA > pontosB) {
      financeiroA = 7.0;
      financeiroB = -7.0;
      pontosGoleadaA = 1; // Marca 1 ponto de goleada para A
    } else {
      financeiroA = -7.0;
      financeiroB = 7.0;
      pontosGoleadaB = 1; // Marca 1 ponto de goleada para B
    }
  } else {
    if (pontosA > pontosB) {
      financeiroA = 5.0;
      financeiroB = -5.0;
    } else {
      financeiroA = -5.0;
      financeiroB = 5.0;
    }
  }
  return { financeiroA, financeiroB, pontosGoleadaA, pontosGoleadaB };
}

// --- Função Auxiliar para Formatar Moeda --- (Adicionada)
function formatarMoeda(valor) {
  const cor = valor > 0 ? "#198754" : valor < 0 ? "#dc3545" : "#333";
  const valorAbs = Math.abs(valor).toFixed(2).replace(".", ",");
  const prefixo = valor >= 0 ? "R$ " : "-R$ ";
  return `<span style="font-weight:600; color:${cor};">${prefixo}${valorAbs}</span>`;
}

export async function inicializarPontosCorridos() {
  const container = document.getElementById("pontos-corridos");
  if (!container || !container.classList.contains("active")) {
    return;
  }
  console.log("[pontos-corridos.js] Chamando inicializarPontosCorridos()");

  try {
    const status = await buscarStatusMercado();
    rodadaAtualBrasileirao = status.rodada_atual;
  } catch (error) {
    console.error("Erro ao buscar status do mercado inicial:", error);
    rodadaAtualBrasileirao = 1;
  }

  try {
    times = await buscarTimesLiga(ligaId);
    if (!times.length) {
      container.innerHTML =
        "<div class='erro'>Nenhum time encontrado na liga</div>";
      return;
    }
    times = times.filter((t) => t && typeof t.id === "number");
    if (!times.length) {
      container.innerHTML =
        "<div class='erro'>Nenhum time com ID numérico válido encontrado na liga</div>";
      return;
    }
  } catch (error) {
    console.error("Erro ao buscar times da liga:", error);
    container.innerHTML =
      "<div class='erro'>Erro ao carregar times da liga. Verifique o console.</div>";
    return;
  }

  confrontos = gerarConfrontos(times);

  renderSelectRodada();
  renderRodadaComTemplate(0);
}

function renderSelectRodada() {
  const container = document.getElementById("pontosCorridosSelect");
  if (!container) return;

  container.innerHTML = `
    <div style="max-width: 700px; margin: 0 auto 20px auto; text-align: center;">
      <select id="rodadaPontosCorridosSelect" class="rodada-select">
        ${confrontos
          .map(
            (_, idx) => `
          <option value="${idx}">
            ${idx + 1}ª Rodada (Rodada ${idx + RODADA_INICIAL}ª do BR)
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

  document
    .getElementById("rodadaPontosCorridosSelect")
    .addEventListener("change", (e) => {
      renderRodadaComTemplate(Number(e.target.value));
    });

  document
    .getElementById("btnClassificacaoPontosCorridos")
    .addEventListener("click", () => {
      renderClassificacao();
    });
}

// --- MODIFICADO: renderRodadaComTemplate (para incluir financeiro) ---
export async function renderRodadaComTemplate(idxRodada) {
  const container = document.getElementById("pontosCorridosRodada");
  if (!container) {
    console.error("Container #pontosCorridosRodada não encontrado!");
    return;
  }

  const rodadaCartola = RODADA_INICIAL + idxRodada;
  const jogos = confrontos[idxRodada];

  let rankingDaRodada = null;
  let pontuacoesMap = {};
  const isRodadaPassada = rodadaCartola < rodadaAtualBrasileirao;

  container.innerHTML = `<div style="text-align:center; padding:20px;">Carregando dados da rodada ${idxRodada + 1}...</div>`; // Feedback inicial

  if (isRodadaPassada) {
    try {
      rankingDaRodada = await getRankingRodadaEspecifica(ligaId, rodadaCartola);
      if (rankingDaRodada && Array.isArray(rankingDaRodada)) {
        rankingDaRodada.forEach((rank) => {
          if (
            rank &&
            typeof rank.timeId === "number" &&
            typeof rank.pontos === "number"
          ) {
            pontuacoesMap[rank.timeId] = rank.pontos;
          }
        });
      } else {
        console.warn(
          `Ranking para rodada ${rodadaCartola} não encontrado ou inválido.`,
        );
        rankingDaRodada = [];
      }
    } catch (error) {
      console.error(
        `Erro ao buscar ranking da rodada ${rodadaCartola} via getRankingRodadaEspecifica: `,
        error,
      );
      container.innerHTML = `<div class="error-message">Erro ao buscar pontuações da rodada ${rodadaCartola}. Tente novamente.</div>`;
      rankingDaRodada = [];
      return; // Interrompe se houver erro na busca da rodada
    }
  }

  try {
    // Busca o template HTML
    const res = await fetch("/templates/pontos-corridos-tabela.html");
    if (!res.ok) {
      console.error("Erro ao buscar template. Status:", res.status);
      container.innerHTML = `<p>Erro ao carregar template (Status: ${res.status}).</p>`;
      return;
    }
    let templateHtml = await res.text();

    templateHtml = templateHtml
      .replace(/{{rodada_num}}/g, idxRodada + 1)
      .replace(/{{rodada_cartola}}/g, rodadaCartola);

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = templateHtml;

    const tbody = tempDiv.querySelector("#jogos-tbody");
    if (!tbody) {
      console.error("tbody #jogos-tbody não encontrado no template!");
      container.innerHTML =
        "<p>Erro interno: tbody não encontrado no template.</p>";
      return;
    }

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
          financeiro = calcularFinanceiroConfronto(pontosA, pontosB);

          if (pontosA > pontosB) {
            classA = "vencedor";
            classB = "perdedor";
          } else if (pontosB > pontosA) {
            classB = "vencedor";
            classA = "perdedor";
          }
          // Adiciona classe para empate se necessário
          else {
            classA = "empate";
            classB = "empate";
          }
        }

        const nomeTimeA = timeA.nome_time || timeA.nome || "N/D";
        const nomeCartolaA =
          timeA.nome_cartola || timeA.nome_cartoleiro || "N/D";
        const nomeTimeB = timeB.nome_time || timeB.nome || "N/D";
        const nomeCartolaB =
          timeB.nome_cartola || timeB.nome_cartoleiro || "N/D";

        // Formata a diferença e os valores financeiros
        const difFormatada =
          typeof dif === "number" ? dif.toFixed(2).replace(".", ",") : dif;
        const isGoleada =
          financeiro.pontosGoleadaA > 0 || financeiro.pontosGoleadaB > 0;

        // Formatação discreta do valor financeiro
        const formatarFinanceiroDiscreto = (valor) => {
          if (!isRodadaPassada || valor === 0 || valor == null) return "";
          const cor = valor > 0 ? "#28a745" : "#dc3545"; // Verde para ganho, Vermelho para perda
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

        // Classe para destacar linha de goleada
        const linhaGoleadaClass = isGoleada ? "linha-goleada" : "";

        // Estilo inspirado no Mata-Mata
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
            <td style="text-align: center; padding: 8px 4px; font-size: 0.85em; color: #666;">${difFormatada}</td> <!-- Coluna Dif -->
          </tr>
        `;
      })
      .join("");

    // Renderiza a tabela de confrontos da rodada
    container.innerHTML = `
    <div style="max-width:900px; margin:0 auto;">
      <h3 style="text-align:center; font-size:1.2rem; margin-bottom:10px;">
        ${idxRodada + 1}ª Rodada da Liga Pontos Corridos<br>
        <span style="font-size:1rem; color:#888;">Rodada ${rodadaCartola}ª do Brasileirão</span>
      </h3>
      <div id="exportPontosCorridosRodadaBtnContainer" style="text-align:right; margin-bottom:8px;"></div>
      <!-- Botão Ver Classificação removido -->
      <table class="ranking-table" style="width:100%; font-size:14px; border-collapse: collapse;">
          <thead style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
            <tr>
              <th style="text-align:center; padding: 8px 4px; width: 5%;">#</th>
              <th style="text-align:left; padding: 8px 4px; width: 30%;">Time 1</th>
              <th style="text-align:center; padding: 8px 4px; width: 15%;">Pts 1</th>
              <th style="text-align:center; padding: 8px 4px; width: 5%;">X</th>
              <th style="text-align:center; padding: 8px 4px; width: 15%;">Pts 2</th>
              <th style="text-align:right; padding: 8px 4px; width: 25%;">Time 2</th> <!-- Ajuste de largura -->
              <th style="text-align:center; padding: 8px 4px; width: 5%;">Dif</th> <!-- Nova coluna -->
            </tr>
          </thead>
          <tbody id="jogos-tbody">
            ${linhasHtml}
          </tbody>
      </table>
    </div>
  `;

    // Prepara dados normalizados para exportação (incluindo financeiro)
    const jogosNormalizados = jogos.map((jogo) => {
      const idA = jogo.timeA.id;
      const idB = jogo.timeB.id;
      const pontosA = pontuacoesMap[idA] ?? null;
      const pontosB = pontuacoesMap[idB] ?? null;
      const financeiro = calcularFinanceiroConfronto(pontosA, pontosB);
      return {
        timeA: {
          nome_time: jogo.timeA.nome_time || jogo.timeA.nome || "N/D",
          nome_cartola:
            jogo.timeA.nome_cartola || jogo.timeA.nome_cartoleiro || "N/D",
          clube_id: jogo.timeA.clube_id || null,
          pontos: pontosA,
          financeiro: financeiro.financeiroA, // Adiciona financeiro
          pontosGoleada: financeiro.pontosGoleadaA, // Adiciona ponto goleada
        },
        timeB: {
          nome_time: jogo.timeB.nome_time || jogo.timeB.nome || "N/D",
          nome_cartola:
            jogo.timeB.nome_cartola || jogo.timeB.nome_cartoleiro || "N/D",
          clube_id: jogo.timeB.clube_id || null,
          pontos: pontosB,
          financeiro: financeiro.financeiroB, // Adiciona financeiro
          pontosGoleada: financeiro.pontosGoleadaB, // Adiciona ponto goleada
        },
        diferenca:
          pontosA !== null && pontosB !== null
            ? Math.abs(pontosA - pontosB)
            : null, // Adiciona diferença
      };
    });

    const exportContainerIdRodada = "exportPontosCorridosRodadaBtnContainer";
    const exportContainerElRodada = container.querySelector(
      `#${exportContainerIdRodada}`,
    );
    if (exportContainerElRodada) {
      exportContainerElRodada.innerHTML = "";
      criarBotaoExportacaoRodada({
        containerId: exportContainerIdRodada,
        rodada: rodadaCartola,
        rankings: jogosNormalizados,
        tipo: "pontos-corridos-rodada", // Tipo específico para esta exportação
        customExport: () =>
          exportarPontosCorridosRodadaComoImagem(
            jogosNormalizados,
            idxRodada + 1,
            rodadaCartola,
            times, // Passa a lista de times completa
          ),
      });
    } else {
      console.warn(
        `Container #${exportContainerIdRodada} não encontrado no template para o botão de exportação da rodada.`,
      );
    }
  } catch (error) {
    console.error("Erro durante a renderização da rodada:", error);
    container.innerHTML = `<p>Ocorreu um erro ao renderizar a rodada: ${error.message}</p>`;
  }
}

// --- MODIFICADO: renderClassificacao (para incluir financeiro e PG) ---
export async function renderClassificacao() {
  const container = document.getElementById("pontosCorridosRodada");
  if (!container) {
    console.error("Container #pontosCorridosRodada não encontrado!");
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:20px;">Calculando classificação...</div>`; // Feedback inicial

  // Inicializa tabela de classificação
  const tabela = {};
  times.forEach((time) => {
    tabela[time.id] = {
      time,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      pontosPro: 0,
      pontosContra: 0,
      saldoPontos: 0,
      pontosGoleada: 0, // Novo campo para contar goleadas
      financeiroTotal: 0, // Novo campo para financeiro acumulado
    };
  });

  // Busca pontuações de todas as rodadas
  let ultimaRodadaLigaComDados = 0;
  let houveErroPontuacao = false;

  // Usar Promise.all para buscar rodadas em paralelo (com limite de concorrência)
  const MAX_CONCURRENT_REQUESTS = 5;
  const rodadasParaBuscar = [];
  for (let idxRodada = 0; idxRodada < confrontos.length; idxRodada++) {
    const rodadaCartola = RODADA_INICIAL + idxRodada;
    if (rodadaCartola >= rodadaAtualBrasileirao) {
      break; // Não processa rodadas futuras
    }
    rodadasParaBuscar.push({ idxRodada, rodadaCartola });
  }

  const resultadosRodadas = new Map(); // Para armazenar resultados { rodadaCartola: pontuacoesMap }

  // Função para processar um lote de rodadas
  const processBatch = async (batch) => {
    const promises = batch.map(async ({ idxRodada, rodadaCartola }) => {
      try {
        const rankingDaRodada = await getRankingRodadaEspecifica(
          ligaId,
          rodadaCartola,
        );
        if (!rankingDaRodada || !Array.isArray(rankingDaRodada)) {
          console.warn(
            `Ranking para rodada ${rodadaCartola} não encontrado ou inválido.`,
          );
          return { rodadaCartola, pontuacoesMap: null, error: true }; // Marca erro
        }

        const pontuacoesMap = {};
        rankingDaRodada.forEach((rank) => {
          if (
            rank &&
            typeof rank.timeId === "number" &&
            typeof rank.pontos === "number"
          ) {
            pontuacoesMap[rank.timeId] = rank.pontos;
          }
        });
        return { rodadaCartola, pontuacoesMap, error: false };
      } catch (error) {
        console.error(
          `Erro ao buscar ranking da rodada ${rodadaCartola}:`,
          error,
        );
        return { rodadaCartola, pontuacoesMap: null, error: true }; // Marca erro
      }
    });
    return Promise.all(promises);
  };

  // Processa em lotes
  for (let i = 0; i < rodadasParaBuscar.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = rodadasParaBuscar.slice(i, i + MAX_CONCURRENT_REQUESTS);
    const results = await processBatch(batch);
    results.forEach((result) => {
      if (result.error) {
        houveErroPontuacao = true;
      } else if (result.pontuacoesMap) {
        resultadosRodadas.set(result.rodadaCartola, result.pontuacoesMap);
        // Atualiza a última rodada com dados válidos
        const idxRodadaAtual = rodadasParaBuscar.find(
          (r) => r.rodadaCartola === result.rodadaCartola,
        )?.idxRodada;
        if (idxRodadaAtual !== undefined) {
          ultimaRodadaLigaComDados = Math.max(
            ultimaRodadaLigaComDados,
            idxRodadaAtual + 1,
          );
        }
      }
    });
  }

  // Processa confrontos usando os dados buscados
  for (let idxRodada = 0; idxRodada < confrontos.length; idxRodada++) {
    const rodadaCartola = RODADA_INICIAL + idxRodada;
    const pontuacoesMap = resultadosRodadas.get(rodadaCartola);

    if (!pontuacoesMap) {
      // Se não há dados para esta rodada (ou houve erro), pula
      continue;
    }

    const jogos = confrontos[idxRodada];
    jogos.forEach((jogo) => {
      const idA = jogo.timeA.id;
      const idB = jogo.timeB.id;
      const pontosA = pontuacoesMap[idA];
      const pontosB = pontuacoesMap[idB];

      // Verifica se ambos os times existem na tabela e têm pontuação
      if (
        tabela[idA] === undefined ||
        tabela[idB] === undefined ||
        pontosA === undefined ||
        pontosB === undefined
      ) {
        console.warn(
          `Time ${idA} ou ${idB} não encontrado na tabela ou sem pontuação na rodada ${rodadaCartola}.`,
        );
        return; // Pula este confronto se faltar dados
      }

      const res = calcularResultadoConfronto(pontosA, pontosB);
      const financeiro = calcularFinanceiroConfronto(pontosA, pontosB);

      // Atualiza estatísticas
      tabela[idA].pontos += res.pontosA;
      tabela[idB].pontos += res.pontosB;
      tabela[idA].pontosPro += pontosA;
      tabela[idA].pontosContra += pontosB;
      tabela[idB].pontosPro += pontosB;
      tabela[idB].pontosContra += pontosA;
      tabela[idA].saldoPontos += pontosA - pontosB;
      tabela[idB].saldoPontos += pontosB - pontosA;
      tabela[idA].jogos += 1;
      tabela[idB].jogos += 1;

      // Adiciona pontos de goleada e financeiro
      tabela[idA].pontosGoleada += financeiro.pontosGoleadaA || 0;
      tabela[idB].pontosGoleada += financeiro.pontosGoleadaB || 0;
      tabela[idA].financeiroTotal += financeiro.financeiroA || 0;
      tabela[idB].financeiroTotal += financeiro.financeiroB || 0;

      if (res.pontosA > res.pontosB) {
        tabela[idA].vitorias += 1;
        tabela[idB].derrotas += 1;
      } else if (res.pontosA < res.pontosB) {
        tabela[idB].vitorias += 1;
        tabela[idA].derrotas += 1;
      } else {
        tabela[idA].empates += 1;
        tabela[idB].empates += 1;
      }
    });
  }

  let classificacao = Object.values(tabela);
  if (ultimaRodadaLigaComDados > 0) {
    // Ordena se houver dados
    // Ajusta critérios de desempate
    classificacao.sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos; // 1. Pontos
      if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias; // 2. Vitórias
      if (b.pontosGoleada !== a.pontosGoleada)
        return b.pontosGoleada - a.pontosGoleada; // 3. Pontos Goleada (PG)
      if (b.saldoPontos !== a.saldoPontos) return b.saldoPontos - a.saldoPontos; // 4. Saldo de Pontos (SP)
      if (b.pontosPro !== a.pontosPro) return b.pontosPro - a.pontosPro; // 5. Pontos Pró (PP)
      const nomeA = a.time.nome_cartola || a.time.nome_cartoleiro || "";
      const nomeB = b.time.nome_cartola || b.time.nome_cartoleiro || "";
      return nomeA.localeCompare(nomeB); // 6. Ordem alfabética (Cartoleiro)
    });
  } else {
    // Ordena por nome se não houver dados
    classificacao.sort((a, b) => {
      const nomeA = a.time.nome_cartola || a.time.nome_cartoleiro || "";
      const nomeB = b.time.nome_cartola || b.time.nome_cartoleiro || "";
      return nomeA.localeCompare(nomeB);
    });
  }

  const textoRodadas =
    ultimaRodadaLigaComDados > 0
      ? `Após ${ultimaRodadaLigaComDados} rodada${ultimaRodadaLigaComDados > 1 ? "s" : ""} da Liga`
      : "Classificação inicial";

  // Renderiza a tabela de classificação com novas colunas e estilos
  container.innerHTML = `
  <div style="max-width:1000px; margin:0 auto;"> <!-- Aumentado max-width -->
    <h3 style="text-align:center; font-size:1.2rem; margin-bottom:10px;">
      Classificação da Liga Pontos Corridos<br>
      <span style="font-size:1rem; color:#888;">${textoRodadas} ${houveErroPontuacao ? "<span style='color:red;'>(Dados parciais devido a erro na busca de pontuações)</span>" : ""}</span>
    </h3>
    <div id="exportClassificacaoPontosCorridosBtnContainer" style="text-align:right; margin-bottom:8px;"></div>
    <button id="btnVoltarPontosCorridos" class="btn-voltar" style="margin-bottom:12px;">⬅ Voltar para Rodadas</button>
    <table class="ranking-table" style="width:100%; font-size:13px; border-collapse: collapse;"> <!-- Diminuído font-size -->
        <thead style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
          <tr>
            <th style="text-align:center; padding: 6px 3px; width: 3%;">Pos</th>
            <th style="text-align:center; padding: 6px 3px; width: 3%;">❤️</th> <!-- Escudo -->
            <th style="text-align:left; padding: 6px 3px; width: 20%;">Time</th>
            <th style="text-align:left; padding: 6px 3px; width: 18%;">Cartoleiro</th>
            <th style="text-align:center; padding: 6px 3px; width: 5%; font-size: 1.1em; color: #0d6efd;">Pts</th>
            <th style="text-align:center; padding: 6px 3px; width: 4%;">J</th>
            <th style="text-align:center; padding: 6px 3px; width: 4%;">V</th>
            <th style="text-align:center; padding: 6px 3px; width: 4%;">E</th>
            <th style="text-align:center; padding: 6px 3px; width: 4%;">D</th>
            <th style="text-align:center; padding: 6px 3px; width: 4%; background-color: #fff3e0;">PG</th>
            <th style="text-align:center; padding: 6px 3px; width: 7%;">PP</th>
            <th style="text-align:center; padding: 6px 3px; width: 7%;">PC</th>
            <th style="text-align:center; padding: 6px 3px; width: 7%;">SP</th>
            <th style="text-align:center; padding: 6px 3px; width: 10%;">R$</th> <!-- Financeiro -->
          </tr>
        </thead>
        <tbody>
          ${classificacao
            .map((item, idx) => {
              const nomeTime = item.time.nome_time || item.time.nome || "N/D";
              const nomeCartola =
                item.time.nome_cartola || item.time.nome_cartoleiro || "N/D";
              const estiloLinha =
                idx === 0
                  ? "background-color: #fff3cd; font-weight: bold;"
                  : idx % 2 !== 0
                    ? "background-color: #f9f9f9;"
                    : ""; // Linhas alternadas
              const estiloSaldo =
                item.saldoPontos > 0
                  ? "color: #198754;"
                  : item.saldoPontos < 0
                    ? "color: #dc3545;"
                    : "";
              const financeiroFormatado = formatarMoeda(item.financeiroTotal); // Formata financeiro

              return `
                    <tr style="${estiloLinha}">
                    <td style="text-align:center; padding: 5px 3px;">${idx + 1}</td>
                    <td style="text-align:center; padding: 5px 3px;">
                        <img src="/escudos/${item.time.clube_id}.png" alt="" class="escudo" style="width:20px; height:20px;" onerror="this.style.display='none'"/>
                    </td>
                    <td style="text-align:left; padding: 5px 3px;">${nomeTime}</td>
                    <td style="text-align:left; padding: 5px 3px;">${nomeCartola}</td>
                    <td style="text-align:center; padding: 5px 3px; font-size: 1.1em; font-weight:600; color: #0d6efd;">${item.pontos}</td>
                    <td style="text-align:center; padding: 5px 3px;">${item.jogos}</td>
                    <td style="text-align:center; padding: 5px 3px;">${item.vitorias}</td>
                    <td style="text-align:center; padding: 5px 3px;">${item.empates}</td>
                    <td style="text-align:center; padding: 5px 3px;">${item.derrotas}</td>
                    <td style="text-align:center; padding: 5px 3px; background-color: #fff3e0; font-weight: ${item.pontosGoleada > 0 ? "bold" : "normal"};">${item.pontosGoleada}</td>
                    <td style="text-align:center; padding: 5px 3px;">${item.pontosPro.toFixed(2)}</td>
                    <td style="text-align:center; padding: 5px 3px;">${item.pontosContra.toFixed(2)}</td>
                    <td style="text-align:center; padding: 5px 3px; ${estiloSaldo}">${item.saldoPontos.toFixed(2)}</td>
                    <td style="text-align:center; padding: 5px 3px;">${financeiroFormatado}</td> <!-- Financeiro -->
                    </tr>
                `;
            })
            .join("")}
        </tbody>
      </table>

      <!-- Legenda explicativa -->
      <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px;"> <!-- Diminuído font-size -->
        <strong>Legenda:</strong>
        <ul style="list-style-type: none; padding-left: 10px; margin-top: 5px; display: flex; flex-wrap: wrap; gap: 15px;"> <!-- Ajustado gap -->
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

  const exportContainerIdClassificacao =
    "exportClassificacaoPontosCorridosBtnContainer";
  const exportContainerElClassificacao = container.querySelector(
    `#${exportContainerIdClassificacao}`,
  );
  if (exportContainerElClassificacao) {
    exportContainerElClassificacao.innerHTML = ""; // Limpa botão anterior
    // Mapeia os dados para exportação, incluindo financeiro
    const classificacaoParaExportar = classificacao.map((item) => ({
      nome_time: item.time.nome_time || item.time.nome || "N/D",
      nome_cartola:
        item.time.nome_cartola || item.time.nome_cartoleiro || "N/D",
      clube_id: item.time.clube_id || null,
      pontos: item.pontos,
      jogos: item.jogos,
      vitorias: item.vitorias,
      empates: item.empates,
      derrotas: item.derrotas,
      gols_pro: item.pontosGoleada, // Mapeado como gols_pro na exportação
      gols_contra: 0, // Não temos um equivalente direto, usar 0 ou remover
      saldo_gols: item.pontosGoleada, // Mapeado como saldo_gols na exportação
      financeiroTotal: item.financeiroTotal, // Inclui financeiro
      // Adicionar PP, PC, SP se necessário na exportação
      pontosPro: item.pontosPro,
      pontosContra: item.pontosContra,
      saldoPontos: item.saldoPontos,
    }));

    criarBotaoExportacaoRodada({
      containerId: exportContainerIdClassificacao,
      rodada: null, // Não é uma rodada específica
      rankings: classificacaoParaExportar,
      tipo: "pontos-corridos-classificacao", // Tipo específico
      customExport: () =>
        exportarClassificacaoPontosCorridosComoImagem(
          classificacaoParaExportar,
          times, // Passa a lista de times completa
          ultimaRodadaLigaComDados, // Passa a última rodada com dados
        ),
    });
  } else {
    console.warn(
      `Container #${exportContainerIdClassificacao} não encontrado para o botão de exportação da classificação.`,
    );
  }

  const btnVoltar = container.querySelector("#btnVoltarPontosCorridos");
  if (btnVoltar) {
    btnVoltar.addEventListener(
      "click",
      () => {
        const selectRodada = document.getElementById(
          "rodadaPontosCorridosSelect",
        );
        const rodadaSelecionada = selectRodada ? Number(selectRodada.value) : 0;
        renderRodadaComTemplate(rodadaSelecionada);
      },
      { once: true }, // Garante que o listener seja adicionado apenas uma vez
    );
  }
}

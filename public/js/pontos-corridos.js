// PONTOS CORRIDOS - Versão Corrigida Monolítica
// Mantém estrutura original + correções críticas

import { getRankingRodadaEspecifica } from "./rodadas.js";

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");
const RODADA_INICIAL = 7;

let times = [];
let confrontos = [];
let rodadaAtualBrasileirao = 1;
let exportsCarregados = false;

// CORREÇÃO: Função exportada para mata-mata
export function getRodadaPontosText(rodadaLiga, edicao) {
  if (!rodadaLiga) return "Rodada não definida";
  const rodadaBrasileirao = RODADA_INICIAL + (rodadaLiga - 1);
  return `${rodadaLiga}ª Rodada da Liga (Rodada ${rodadaBrasileirao}ª do Brasileirão)`;
}

// Gera confrontos todos contra todos
function gerarConfrontos(times) {
  const n = times.length;
  const rodadas = [];
  const lista = [...times];
  if (n % 2 !== 0) lista.push(null);

  for (let rodada = 0; rodada < n - 1; rodada++) {
    const jogos = [];
    for (let i = 0; i < n / 2; i++) {
      const timeA = lista[i];
      const timeB = lista[n - 1 - i];
      if (timeA && timeB) {
        jogos.push({ timeA, timeB });
      }
    }
    rodadas.push(jogos);
    lista.splice(1, 0, lista.pop());
  }
  return rodadas;
}

// Calcula resultado do confronto
function calcularResultadoConfronto(pontosA, pontosB) {
  const diff = Math.abs(pontosA - pontosB);
  if (diff <= 0.3) return { resultado: "empate", pontosA: 1, pontosB: 1 };
  if (pontosA > pontosB) {
    if (diff >= 50) return { resultado: "goleadaA", pontosA: 4, pontosB: 0 };
    return { resultado: "vitoriaA", pontosA: 3, pontosB: 0 };
  }
  if (pontosB > pontosA) {
    if (diff >= 50) return { resultado: "goleadaB", pontosA: 0, pontosB: 4 };
    return { resultado: "vitoriaB", pontosA: 0, pontosB: 3 };
  }
  return { resultado: "empate", pontosA: 1, pontosB: 1 };
}

// CORREÇÃO: Função financeira centralizada
function calcularFinanceiroConfronto(pontosA, pontosB) {
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

  if (diferenca <= 0.3) {
    // Empate
    financeiroA = 3.0;
    financeiroB = 3.0;
  } else if (diferenca >= 50) {
    // Goleada
    if (pontosA > pontosB) {
      financeiroA = 7.0;
      financeiroB = -7.0;
      pontosGoleadaA = 1;
    } else {
      financeiroA = -7.0;
      financeiroB = 7.0;
      pontosGoleadaB = 1;
    }
  } else {
    // Vitória simples
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

// Busca status do mercado
async function buscarStatusMercado() {
  try {
    const res = await fetch("/api/cartola/mercado/status");
    if (!res.ok) throw new Error("Erro ao buscar status do mercado");
    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar status do mercado:", err);
    return { rodada_atual: 1, status_mercado: 2 };
  }
}

// Busca times da liga
async function buscarTimesLiga(ligaId) {
  try {
    const res = await fetch(`/api/ligas/${ligaId}/times`);
    if (!res.ok) throw new Error("Erro ao buscar times da liga");
    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar times da liga:", err);
    return [];
  }
}

// Formatar moeda
function formatarMoeda(valor) {
  const cor = valor > 0 ? "#198754" : valor < 0 ? "#dc3545" : "#333";
  const valorAbs = Math.abs(valor).toFixed(2).replace(".", ",");
  const prefixo = valor >= 0 ? "R$ " : "-R$ ";
  return `<span style="font-weight:600; color:${cor};">${prefixo}${valorAbs}</span>`;
}

// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
export async function inicializarPontosCorridos() {
  const container = document.getElementById("pontos-corridos");
  if (!container || !container.classList.contains("active")) {
    return;
  }

  console.log("[PONTOS-CORRIDOS] Inicializando sistema...");

  try {
    const status = await buscarStatusMercado();
    rodadaAtualBrasileirao = status.rodada_atual;
  } catch (error) {
    console.error("Erro ao buscar status do mercado:", error);
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
        "<div class='erro'>Nenhum time com ID numérico válido encontrado</div>";
      return;
    }
  } catch (error) {
    console.error("Erro ao buscar times da liga:", error);
    container.innerHTML =
      "<div class='erro'>Erro ao carregar times da liga</div>";
    return;
  }

  confrontos = gerarConfrontos(times);
  renderSelectRodada();
  renderRodadaComTemplate(0);
}

// Renderiza seletor de rodada
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

// CORREÇÃO: Renderiza rodada sem template
export async function renderRodadaComTemplate(idxRodada) {
  const container = document.getElementById("pontosCorridosRodada");
  if (!container) {
    console.error("Container #pontosCorridosRodada não encontrado!");
    return;
  }

  const rodadaCartola = RODADA_INICIAL + idxRodada;
  const jogos = confrontos[idxRodada];
  const isRodadaPassada = rodadaCartola < rodadaAtualBrasileirao;

  container.innerHTML = `<div style="text-align:center; padding:20px;">Carregando dados da rodada ${idxRodada + 1}...</div>`;

  let pontuacoesMap = {};
  if (isRodadaPassada) {
    try {
      const rankingDaRodada = await getRankingRodadaEspecifica(
        ligaId,
        rodadaCartola,
      );
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
      }
    } catch (error) {
      console.error(
        `Erro ao buscar ranking da rodada ${rodadaCartola}:`,
        error,
      );
      container.innerHTML = `<div class="error-message">Erro ao buscar pontuações da rodada ${rodadaCartola}</div>`;
      return;
    }
  }

  // RENDERIZAÇÃO DIRETA SEM TEMPLATE
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
          ${isGoleada && classA === "vencedor" ? '<span style="color: #ffc107; margin-left: 4px; font-size: 0.8em;">🔥</span>' : ""}
        </td>
        <td style="text-align: center; padding: 8px 4px; font-weight: 700; color: #888;">X</td>
        <td style="text-align: center; padding: 8px 4px; font-weight: 600; font-size: 1em; color: ${classB === "vencedor" ? "#198754" : classB === "perdedor" ? "#dc3545" : "#333"};">
          ${pontosB !== null ? pontosB.toFixed(2).replace(".", ",") : "-"}
          ${financeiroBDiscreto}
          ${isGoleada && classB === "vencedor" ? '<span style="color: #ffc107; margin-left: 4px; font-size: 0.8em;">🔥</span>' : ""}
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

  // RENDERIZAÇÃO DIRETA
  container.innerHTML = `
    <div style="max-width:900px; margin:0 auto;">
      <h3 style="text-align:center; font-size:1.2rem; margin-bottom:10px;">
        ${idxRodada + 1}ª Rodada da Liga Pontos Corridos<br>
        <span style="font-size:1rem; color:#888;">Rodada ${rodadaCartola}ª do Brasileirão</span>
      </h3>
      <div id="exportPontosCorridosRodadaBtnContainer" style="text-align:right; margin-bottom:8px;"></div>

      <table class="ranking-table" style="width:100%; font-size:14px; border-collapse: collapse;">
        <thead style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
          <tr>
            <th style="text-align:center; padding: 8px 4px; width: 5%;">#</th>
            <th style="text-align:left; padding: 8px 4px; width: 30%;">Time 1</th>
            <th style="text-align:center; padding: 8px 4px; width: 15%;">Pts 1</th>
            <th style="text-align:center; padding: 8px 4px; width: 5%;">X</th>
            <th style="text-align:center; padding: 8px 4px; width: 15%;">Pts 2</th>
            <th style="text-align:right; padding: 8px 4px; width: 25%;">Time 2</th>
            <th style="text-align:center; padding: 8px 4px; width: 5%;">Dif</th>
          </tr>
        </thead>
        <tbody>
          ${linhasHtml}
        </tbody>
      </table>
    </div>
  `;

  // Carregar exports dinamicamente
  await carregarExports();

  // Adicionar botão de exportação
  if (exportsCarregados) {
    const jogosNormalizados = jogos.map((jogo) => ({
      timeA: {
        nome_time: jogo.timeA.nome_time || jogo.timeA.nome || "N/D",
        nome_cartola:
          jogo.timeA.nome_cartola || jogo.timeA.nome_cartoleiro || "N/D",
        clube_id: jogo.timeA.clube_id || null,
        pontos: pontuacoesMap[jogo.timeA.id] ?? null,
        financeiro: calcularFinanceiroConfronto(
          pontuacoesMap[jogo.timeA.id],
          pontuacoesMap[jogo.timeB.id],
        ).financeiroA,
        pontosGoleada: calcularFinanceiroConfronto(
          pontuacoesMap[jogo.timeA.id],
          pontuacoesMap[jogo.timeB.id],
        ).pontosGoleadaA,
      },
      timeB: {
        nome_time: jogo.timeB.nome_time || jogo.timeB.nome || "N/D",
        nome_cartola:
          jogo.timeB.nome_cartola || jogo.timeB.nome_cartoleiro || "N/D",
        clube_id: jogo.timeB.clube_id || null,
        pontos: pontuacoesMap[jogo.timeB.id] ?? null,
        financeiro: calcularFinanceiroConfronto(
          pontuacoesMap[jogo.timeA.id],
          pontuacoesMap[jogo.timeB.id],
        ).financeiroB,
        pontosGoleada: calcularFinanceiroConfronto(
          pontuacoesMap[jogo.timeA.id],
          pontuacoesMap[jogo.timeB.id],
        ).pontosGoleadaB,
      },
      diferenca:
        pontuacoesMap[jogo.timeA.id] !== null &&
        pontuacoesMap[jogo.timeB.id] !== null
          ? Math.abs(
              pontuacoesMap[jogo.timeA.id] - pontuacoesMap[jogo.timeB.id],
            )
          : null,
    }));

    const exportContainer = document.querySelector(
      "#exportPontosCorridosRodadaBtnContainer",
    );
    if (exportContainer && window.criarBotaoExportacaoPontosCorridosRodada) {
      exportContainer.innerHTML = "";
      await window.criarBotaoExportacaoPontosCorridosRodada({
        containerId: "exportPontosCorridosRodadaBtnContainer",
        jogos: jogosNormalizados,
        rodadaLiga: idxRodada + 1,
        rodadaCartola: rodadaCartola,
        times: times,
      });
    }
  }
}

// Renderizar classificação
export async function renderClassificacao() {
  const container = document.getElementById("pontosCorridosRodada");
  if (!container) {
    console.error("Container #pontosCorridosRodada não encontrado!");
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:20px;">Calculando classificação...</div>`;

  // Inicializa tabela
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
      pontosGoleada: 0,
      financeiroTotal: 0,
    };
  });

  let ultimaRodadaComDados = 0;
  let houveErro = false;

  // Processar todas as rodadas
  for (let idxRodada = 0; idxRodada < confrontos.length; idxRodada++) {
    const rodadaCartola = RODADA_INICIAL + idxRodada;
    if (rodadaCartola >= rodadaAtualBrasileirao) break;

    try {
      const rankingDaRodada = await getRankingRodadaEspecifica(
        ligaId,
        rodadaCartola,
      );
      if (!rankingDaRodada || !Array.isArray(rankingDaRodada)) {
        console.warn(`Ranking para rodada ${rodadaCartola} não encontrado`);
        continue;
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

      ultimaRodadaComDados = idxRodada + 1;

      // Processar confrontos da rodada
      const jogos = confrontos[idxRodada];
      jogos.forEach((jogo) => {
        const idA = jogo.timeA.id;
        const idB = jogo.timeB.id;
        const pontosA = pontuacoesMap[idA];
        const pontosB = pontuacoesMap[idB];

        if (
          tabela[idA] === undefined ||
          tabela[idB] === undefined ||
          pontosA === undefined ||
          pontosB === undefined
        ) {
          return;
        }

        const res = calcularResultadoConfronto(pontosA, pontosB);
        const financeiro = calcularFinanceiroConfronto(pontosA, pontosB);

        // Atualizar estatísticas
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
    } catch (error) {
      console.error(`Erro ao processar rodada ${rodadaCartola}:`, error);
      houveErro = true;
    }
  }

  // Ordenar classificação
  let classificacao = Object.values(tabela);
  if (ultimaRodadaComDados > 0) {
    classificacao.sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
      if (b.pontosGoleada !== a.pontosGoleada)
        return b.pontosGoleada - a.pontosGoleada;
      if (b.saldoPontos !== a.saldoPontos) return b.saldoPontos - a.saldoPontos;
      if (b.pontosPro !== a.pontosPro) return b.pontosPro - a.pontosPro;
      const nomeA = a.time.nome_cartola || a.time.nome_cartoleiro || "";
      const nomeB = b.time.nome_cartola || b.time.nome_cartoleiro || "";
      return nomeA.localeCompare(nomeB);
    });
  }

  const textoRodadas =
    ultimaRodadaComDados > 0
      ? `Após ${ultimaRodadaComDados} rodada${ultimaRodadaComDados > 1 ? "s" : ""} da Liga`
      : "Classificação inicial";

  // Renderizar tabela
  container.innerHTML = `
    <div style="max-width:1000px; margin:0 auto;">
      <h3 style="text-align:center; font-size:1.2rem; margin-bottom:10px;">
        Classificação da Liga Pontos Corridos<br>
        <span style="font-size:1rem; color:#888;">${textoRodadas} ${houveErro ? "<span style='color:red;'>(Dados parciais)</span>" : ""}</span>
      </h3>
      <div id="exportClassificacaoPontosCorridosBtnContainer" style="text-align:right; margin-bottom:8px;"></div>
      <button id="btnVoltarPontosCorridos" class="btn-voltar" style="margin-bottom:12px;">← Voltar para Rodadas</button>

      <table class="ranking-table" style="width:100%; font-size:13px; border-collapse: collapse;">
        <thead style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
          <tr>
            <th style="text-align:center; padding: 6px 3px; width: 3%;">Pos</th>
            <th style="text-align:center; padding: 6px 3px; width: 3%;">❤️</th>
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
            <th style="text-align:center; padding: 6px 3px; width: 10%;">R$</th>
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
                <td style="text-align:center; padding: 5px 3px;">${idx + 1}</td>
                <td style="text-align:center; padding: 5px 3px;">
                  <img src="/escudos/${item.time.clube_id}.png" alt="" style="width:20px; height:20px;" onerror="this.style.display='none'"/>
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
                <td style="text-align:center; padding: 5px 3px;">${financeiroFormatado}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>

      <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px;">
        <strong>Legenda:</strong>
        <ul style="list-style-type: none; padding-left: 10px; margin-top: 5px; display: flex; flex-wrap: wrap; gap: 15px;">
          <li><strong>Pts</strong> - Pontos</li>
          <li><strong>J</strong> - Jogos</li>
          <li><strong>V</strong> - Vitórias</li>
          <li><strong>E</strong> - Empates</li>
          <li><strong>D</strong> - Derrotas</li>
          <li><strong>PG</strong> - Pontos Goleada</li>
          <li><strong>PP</strong> - Pontos Pró</li>
          <li><strong>PC</strong> - Pontos Contra</li>
          <li><strong>SP</strong> - Saldo de Pontos</li>
          <li><strong>R$</strong> - Financeiro</li>
        </ul>
      </div>
    </div>
  `;

  // Configurar botão voltar
  const btnVoltar = document.getElementById("btnVoltarPontosCorridos");
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
      { once: true },
    );
  }
}

// Carregar exports dinamicamente
async function carregarExports() {
  if (exportsCarregados) return;

  try {
    const exportModule = await import("./exports/export-pontos-corridos.js");
    window.criarBotaoExportacaoPontosCorridosRodada =
      exportModule.criarBotaoExportacaoPontosCorridosRodada;
    window.exportarPontosCorridosRodadaComoImagem =
      exportModule.exportarPontosCorridosRodadaComoImagem;
    window.criarBotaoExportacaoPontosCorridosClassificacao =
      exportModule.criarBotaoExportacaoPontosCorridosClassificacao;
    exportsCarregados = true;
    console.log("[PONTOS-CORRIDOS] Exports carregados com sucesso");
  } catch (error) {
    console.warn("[PONTOS-CORRIDOS] Erro ao carregar exports:", error);
  }
}

// Função para obter confrontos (compatibilidade com fluxo financeiro)
export async function getConfrontosLigaPontosCorridos() {
  if (!ligaId) {
    console.error("ID da Liga não encontrado");
    return [];
  }

  try {
    const timesLiga = await buscarTimesLiga(ligaId);
    if (!timesLiga || timesLiga.length === 0) {
      console.error("Nenhum time encontrado");
      return [];
    }

    const confrontosBase = gerarConfrontos(timesLiga);
    const status = await buscarStatusMercado();
    const ultimaRodadaCompleta = status ? status.rodada_atual - 1 : 0;

    const confrontosComPontos = [];

    for (let i = 0; i < confrontosBase.length; i++) {
      const rodadaNum = i + 1;
      const rodadaCartola = RODADA_INICIAL + i;
      const jogosDaRodada = confrontosBase[i];
      const jogosComPontos = [];

      let pontuacoesRodada = {};
      if (rodadaCartola <= ultimaRodadaCompleta) {
        try {
          const rankingDaRodada = await getRankingRodadaEspecifica(
            ligaId,
            rodadaCartola,
          );
          if (rankingDaRodada) {
            rankingDaRodada.forEach((p) => {
              pontuacoesRodada[p.time_id || p.timeId] = p.pontos;
            });
          }
        } catch (err) {
          console.error(
            `Erro ao buscar pontuações para rodada ${rodadaNum}:`,
            err,
          );
        }
      }

      for (const jogo of jogosDaRodada) {
        const timeAId = jogo.timeA.id || jogo.timeA.time_id;
        const timeBId = jogo.timeB.id || jogo.timeB.time_id;
        const pontosA =
          pontuacoesRodada[timeAId] !== undefined
            ? pontuacoesRodada[timeAId]
            : null;
        const pontosB =
          pontuacoesRodada[timeBId] !== undefined
            ? pontuacoesRodada[timeBId]
            : null;

        jogosComPontos.push({
          time1: jogo.timeA,
          time2: jogo.timeB,
          pontos1: pontosA,
          pontos2: pontosB,
        });
      }

      confrontosComPontos.push({
        rodada: rodadaNum,
        jogos: jogosComPontos,
      });
    }

    return confrontosComPontos;
  } catch (error) {
    console.error("Erro geral:", error);
    return [];
  }
}

// EXPORTAÇÕES PARA COMPATIBILIDADE GLOBAL
if (typeof window !== "undefined") {
  window.inicializarPontosCorridos = inicializarPontosCorridos;
  window.renderRodadaComTemplate = renderRodadaComTemplate;
  window.renderClassificacao = renderClassificacao;
  window.gerarConfrontos = gerarConfrontos;
  window.calcularResultadoConfronto = calcularResultadoConfronto;
  window.calcularFinanceiroConfronto = calcularFinanceiroConfronto;
  window.buscarStatusMercado = buscarStatusMercado;
  window.buscarTimesLiga = buscarTimesLiga;
  window.getConfrontosLigaPontosCorridos = getConfrontosLigaPontosCorridos;
  window.getRodadaPontosText = getRodadaPontosText; // CORREÇÃO para mata-mata
}

console.log(
  "[PONTOS-CORRIDOS] Sistema carregado - versão corrigida monolítica",
);
console.log(
  "[PONTOS-CORRIDOS] Função getRodadaPontosText disponível para mata-mata",
);

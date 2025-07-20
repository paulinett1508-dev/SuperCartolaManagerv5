import { getRankingRodadaEspecifica } from "./rodadas.js"; // <-- Importa a função para buscar rodada específica
// CORREÇÃO: Removida importação estática que causava dependência circular
// import {
//   criarBotaoExportacaoRodada,
//   exportarMelhorMesComoImagem,
// } from "./exports/export-exports.js";
import { getLigaId } from "./pontos-corridos-utils.js"; // <-- Importa para obter o ID da liga

// ==============================
// VARIÁVEIS PARA EXPORTS DINÂMICOS
// ==============================
let criarBotaoExportacaoMelhorMes = null;
let exportarMelhorMesComoImagem = null;
let exportsCarregados = false;

// ==============================
// FUNÇÃO PARA CARREGAR EXPORTS DINAMICAMENTE
// ==============================
async function carregarExports() {
  if (exportsCarregados) return;

  try {
    const exportModule = await import("./exports/export-melhor-mes.js");
    criarBotaoExportacaoMelhorMes = exportModule.criarBotaoExportacaoMelhorMes;
    exportarMelhorMesComoImagem = exportModule.exportarMelhorMesComoImagem;
    exportsCarregados = true;
    console.log("[MELHOR-MES] ✅ Exports carregados com sucesso");
  } catch (error) {
    console.warn("[MELHOR-MES] ⚠️ Erro ao carregar exports:", error);
  }
}

// Elemento de espera global
function mostrarElementoEspera(containerId, mensagem = "Carregando...") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; color:#666;">
      <div class="loading-spinner" style="border:4px solid #f3f3f3; border-top:4px solid #3498db; border-radius:50%; width:30px; height:30px; margin-bottom:15px; animation:spin 1s linear infinite;"></div>
      <div>${mensagem}</div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

const edicoes = [
  { nome: "Edição 01", inicio: 1, fim: 6 },
  { nome: "Edição 02", inicio: 7, fim: 10 },
  { nome: "Edição 03", inicio: 11, fim: 17 },
  { nome: "Edição 04", inicio: 18, fim: 22 },
  { nome: "Edição 05", inicio: 23, fim: 28 },
  { nome: "Edição 06", inicio: 29, fim: 32 },
  { nome: "Edição 07", inicio: 33, fim: 38 },
];

export function inicializarMelhorMes() {
  renderSelectEdicoes();
  carregarRankingEdicao(0);
}

function renderSelectEdicoes(containerId = "melhorMesSelect") {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div style="max-width: 480px; margin: 0 auto 18px auto; text-align:center;">
      <select id="edicaoSelect" class="melhor-mes-select" style="font-size:1.1em; padding:8px 12px; border-radius:6px;">
        ${edicoes
          .map(
            (ed, idx) =>
              `<option value="${idx}">${ed.nome} (Rod. ${ed.inicio} a ${ed.fim})</option>`,
          )
          .join("")}
      </select>
    </div>
  `;
  document.getElementById("edicaoSelect").addEventListener("change", (e) => {
    carregarRankingEdicao(Number(e.target.value));
  });
}

// --- CORREÇÃO: Função auxiliar para buscar rankings de rodadas individualmente ---
async function buscarRankingsIndividualmente(rodadaInicio, rodadaFim) {
  const ligaId = getLigaId();
  if (!ligaId) {
    console.error("Melhor Mês: ID da Liga não encontrado.");
    return [];
  }
  console.log(
    `[Melhor Mês] Buscando rankings individualmente de ${rodadaInicio} a ${rodadaFim}...`,
  );
  const rankingsAgregados = [];
  const promises = [];
  for (let r = rodadaInicio; r <= rodadaFim; r++) {
    promises.push(
      getRankingRodadaEspecifica(ligaId, r)
        .then((ranking) => {
          if (ranking && Array.isArray(ranking)) {
            // Adiciona a informação da rodada a cada time no ranking
            const rankingComRodada = ranking.map((time) => ({
              ...time,
              rodada: r,
            }));
            rankingsAgregados.push(...rankingComRodada);
          } else {
            console.warn(
              `[Melhor Mês] Nenhum ranking válido retornado para rodada ${r}`,
            );
          }
        })
        .catch((e) =>
          console.error(
            `[Melhor Mês] Erro ao buscar ranking da rodada ${r}:`,
            e,
          ),
        ),
    );
  }
  await Promise.all(promises);
  console.log(
    `[Melhor Mês] Busca individual concluída. ${rankingsAgregados.length} registros de time agregados.`,
  );
  return rankingsAgregados;
}
// --- FIM CORREÇÃO ---

async function carregarRankingEdicao(idxEdicao) {
  const edicao = edicoes[idxEdicao];
  if (!edicao) return;

  const loadingIndicator = document.getElementById("loadingMelhorMes"); // Assumindo que existe um loading indicator
  if (loadingIndicator) loadingIndicator.style.display = "block";

  try {
    // Descubra a última rodada disponível
    const resMercado = await fetch("/api/cartola/mercado/status");
    if (!resMercado.ok) {
      throw new Error("Erro ao buscar status do mercado");
    }
    const { rodada_atual } = await resMercado.json();
    const ultimaRodadaCompleta = rodada_atual > 0 ? rodada_atual - 1 : 0;

    // Se a edição ainda não aconteceu
    if (ultimaRodadaCompleta < edicao.inicio) {
      renderTabelaRankingEdicao(null, edicao, true);
      return;
    }

    // --- CORREÇÃO: Busca rankings individualmente ---
    const rodadaFinalBusca = Math.min(edicao.fim, ultimaRodadaCompleta);
    const rankingsEdicao = await buscarRankingsIndividualmente(
      edicao.inicio,
      rodadaFinalBusca,
    );
    // --- FIM CORREÇÃO ---

    if (!rankingsEdicao || rankingsEdicao.length === 0) {
      console.warn(
        `[Melhor Mês] Nenhum ranking encontrado para as rodadas da ${edicao.nome}.`,
      );
      renderTabelaRankingEdicao([], edicao, false); // Renderiza tabela vazia
      return;
    }

    // Calcula a pontuação total por time na edição
    const pontuacaoTotal = {};
    rankingsEdicao.forEach((time) => {
      // Usa timeId ou time_id como fallback
      const id = String(time.timeId || time.time_id);
      if (!id || id === "undefined") return; // Pula registros inválidos

      if (!pontuacaoTotal[id]) {
        pontuacaoTotal[id] = {
          time_id: id,
          nome_cartola: time.nome_cartola || time.nome_cartoleiro || "N/D",
          nome_time: time.nome_time || time.nome || "N/D",
          clube_id: time.clube_id || null,
          pontos: 0,
        };
      }
      pontuacaoTotal[id].pontos += parseFloat(time.pontos || 0);
    });

    // Ordena do maior para o menor
    const ranking = Object.values(pontuacaoTotal).sort(
      (a, b) => b.pontos - a.pontos,
    );

    renderTabelaRankingEdicao(ranking, edicao, false);
  } catch (error) {
    console.error("[Melhor Mês] Erro ao carregar ranking da edição:", error);
    const container = document.getElementById("melhorMesTabela");
    if (container) {
      container.innerHTML = `<div class="error-message">Erro ao carregar ranking: ${error.message}</div>`;
    }
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = "none";
  }
}

function renderTabelaRankingEdicao(ranking, edicao, edicaoNaoAconteceu) {
  const container = document.getElementById("melhorMesTabela");
  if (!container) return;

  // Verifica se é a liga Cartoleiros Sobral 2025
  const ligaId = getLigaId();
  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";

  // Título elegante
  const titulo = `<span style="font-size:1.25rem; font-weight:700; color:#2d3436; letter-spacing:0.5px;">
    Ranking Melhor do Mês - <span style="color:#1976d2;">${edicao.nome}</span>
  </span>`;

  if (edicaoNaoAconteceu) {
    container.innerHTML = `
      <div style="max-width: 480px; margin: 32px auto; text-align:center; background:#fffbe6; border:1px solid #ffe58f; border-radius:8px; padding:32px 12px; color:#b8860b; font-size:1.2em;">
        <b>${titulo}</b><br>
        <span style="font-size:1.1em;">Edição ainda não aconteceu.</span>
      </div>
    `;
    return;
  }

  // --- CORREÇÃO: Mensagem se o ranking estiver vazio após busca ---
  const tabelaBodyHtml =
    !ranking || ranking.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #888;">Nenhum dado de pontuação encontrado para esta edição.</td></tr>`
      : ranking
          .map((t, i) => {
            // Adiciona coluna de premiação para liga Cartoleiros Sobral 2025
            let premioHtml = "";
            if (isLigaCartoleirosSobral) {
              if (i === 0) {
                // 1º colocado ganha R$ 15,00
                premioHtml = `<td style="text-align:center; color:#198754; font-weight:bold;">R$ 15,00</td>`;
              } else if (ranking.length >= 6 && i === ranking.length - 1) {
                // Último colocado perde R$ -15,00
                premioHtml = `<td style="text-align:center; color:#dc3545; font-weight:bold;">-R$ 15,00</td>`;
              } else {
                premioHtml = `<td style="text-align:center;">-</td>`;
              }
            }

            return `
                <tr style="${i === 0 ? "background:#e3f2fd;font-weight:bold;" : i === ranking.length - 1 && isLigaCartoleirosSobral ? "background:#ffebee;" : ""}">
                  <td style="text-align:center; padding:8px 2px;">
                    ${i === 0 ? "🏆" : i + 1}
                  </td>
                  <td style="text-align:left; padding:8px 4px;">${t.nome_cartola}</td>
                  <td style="text-align:left; padding:8px 4px;">${t.nome_time}</td>
                  <td style="text-align:center;">
                    ${
                      t.clube_id
                        ? `<img src="/escudos/${t.clube_id}.png" alt="Time do Coração" style="width:24px; height:24px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display=\'none\'"/>`
                        : "—"
                    }
                  </td>
                  <td style="text-align:center; padding:8px 2px;">
                    <span style="font-weight:600;">
                      ${t.pontos.toFixed(2)}
                    </span>
                  </td>
                  ${isLigaCartoleirosSobral ? premioHtml : ""}
                </tr>
              `;
          })
          .join("");
  // --- FIM CORREÇÃO ---

  container.innerHTML = `
    <div style="max-width: 700px; margin: 0 auto;">
      <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 8px;">
        <div id="melhorMesExportBtnContainer"></div>
      </div>
      <div style="text-align: center; margin-bottom: 10px;">
        <div>${titulo}</div>
        <div style="font-size: 1rem; color: #888; margin-bottom: 18px; font-weight: 400;">
          Pontuação das rodadas ${edicao.inicio} a ${edicao.fim}
        </div>
      </div>
      <table id="melhorMesTable" class="tabela-melhor-mes" style="margin: 0 auto; min-width: 320px; max-width: 100%;">
        <thead>
          <tr>
            <th style="width: 36px; text-align: center">Pos</th>
            <th style="min-width: 140px; text-align: left">Cartoleiro</th>
            <th style="min-width: 110px; text-align: left">Time</th>
            <th style="width: 48px; text-align: center">Escudo</th>
            <th style="width: 80px; text-align: center">Pontos</th>
            ${isLigaCartoleirosSobral ? '<th style="width: 80px; text-align: center">Prêmio</th>' : ""}
          </tr>
        </thead>
        <tbody>
          ${tabelaBodyHtml} 
        </tbody>
      </table>
    </div>
  `;

  // CORREÇÃO: Carregar exports antes de usar
  carregarExports().then(() => {
    // Botão de exportação (só adiciona se houver ranking)
    if (ranking && ranking.length > 0 && criarBotaoExportacaoMelhorMes) {
      criarBotaoExportacaoMelhorMes({
        containerId: "melhorMesExportBtnContainer",
        rodada: `${edicao.inicio}-${edicao.fim}`,
        rankings: ranking,
        isParciais: false,
        isRankingGeral: false,
        customExport: (rankings) =>
          exportarMelhorMesComoImagem(rankings, edicao),
        tabelaId: "melhorMesTable",
        titulo: `Ranking Melhor do Mês - ${edicao.nome} (Rodadas ${edicao.inicio} a ${edicao.fim})`,
      });
    } else {
      // Limpa o container do botão se não houver ranking
      const exportContainer = document.getElementById(
        "melhorMesExportBtnContainer",
      );
      if (exportContainer) exportContainer.innerHTML = "";
    }
  });
}

// Nova função para retornar os vencedores de cada edição do Melhor do Mês
// Retorna: Array de objetos { edicao: edicaoObj, vencedor: timeObj }
export async function getResultadosMelhorMes() {
  console.log("[getResultadosMelhorMes] Calculando vencedores...");
  const vencedoresPorEdicao = [];

  try {
    // Descubra a última rodada disponível
    const resMercado = await fetch("/api/cartola/mercado/status");
    if (!resMercado.ok) {
      throw new Error("Erro ao buscar status do mercado");
    }
    const { rodada_atual } = await resMercado.json();
    const ultimaRodadaCompleta = rodada_atual > 0 ? rodada_atual - 1 : 0;
    window.rodadaAtual = rodada_atual;

    // --- CORREÇÃO: Busca rankings individualmente ---
    // Busca todas as rodadas completas necessárias para todas as edições
    let maxRodadaNecessaria = 0;
    edicoes.forEach((ed) => {
      if (ultimaRodadaCompleta >= ed.inicio) {
        // Só busca se a edição começou
        maxRodadaNecessaria = Math.max(
          maxRodadaNecessaria,
          Math.min(ed.fim, ultimaRodadaCompleta),
        );
      }
    });

    if (maxRodadaNecessaria === 0) {
      console.log("[getResultadosMelhorMes] Nenhuma rodada completa ainda.");
      return [];
    }

    const rankingsPorRodadaAgregados = await buscarRankingsIndividualmente(
      1,
      maxRodadaNecessaria,
    );
    // --- FIM CORREÇÃO ---

    if (
      !rankingsPorRodadaAgregados ||
      rankingsPorRodadaAgregados.length === 0
    ) {
      console.warn(
        "[getResultadosMelhorMes] Nenhum ranking de rodada encontrado após busca individual.",
      );
      return [];
    }

    for (const edicao of edicoes) {
      // Verifica se a edição já foi concluída
      if (ultimaRodadaCompleta >= edicao.fim) {
        console.log(
          `[getResultadosMelhorMes] Calculando vencedor da ${edicao.nome}...`,
        );
        // Filtra rankings apenas das rodadas da edição a partir dos dados agregados
        const rankingsEdicao = rankingsPorRodadaAgregados.filter(
          (time) => time.rodada >= edicao.inicio && time.rodada <= edicao.fim,
        );

        if (rankingsEdicao.length === 0) {
          console.warn(
            `[getResultadosMelhorMes] Nenhum ranking encontrado para as rodadas da ${edicao.nome} nos dados agregados.`,
          );
          continue; // Pula para a próxima edição
        }

        // Calcula a pontuação total por time na edição
        const pontuacaoTotal = {};
        rankingsEdicao.forEach((time) => {
          const id = String(time.timeId || time.time_id);
          if (!id || id === "undefined") return;
          if (!pontuacaoTotal[id]) {
            pontuacaoTotal[id] = {
              time_id: id,
              nome_cartola: time.nome_cartola || time.nome_cartoleiro || "N/D",
              nome_time: time.nome_time || time.nome || "N/D",
              clube_id: time.clube_id || null,
              pontos: 0,
            };
          }
          pontuacaoTotal[id].pontos += parseFloat(time.pontos || 0);
        });

        // Ordena para encontrar o vencedor
        const rankingFinalEdicao = Object.values(pontuacaoTotal).sort(
          (a, b) => b.pontos - a.pontos,
        );

        if (rankingFinalEdicao.length > 0) {
          const vencedor = rankingFinalEdicao[0];
          console.log(
            `[getResultadosMelhorMes] Vencedor da ${edicao.nome}: ${vencedor.nome_cartola} (${vencedor.pontos.toFixed(2)})`,
          );
          vencedoresPorEdicao.push({ edicao: edicao, vencedor: vencedor });
        } else {
          console.warn(
            `[getResultadosMelhorMes] Não foi possível determinar o vencedor da ${edicao.nome}.`,
          );
        }
      } else {
        console.log(
          `[getResultadosMelhorMes] Edição ${edicao.nome} ainda não concluída (última rodada completa: ${ultimaRodadaCompleta}).`,
        );
      }
    }

    console.log(
      `[getResultadosMelhorMes] Cálculo de vencedores concluído. ${vencedoresPorEdicao.length} edições com vencedores.`,
    );
    return vencedoresPorEdicao;
  } catch (error) {
    console.error(
      "[getResultadosMelhorMes] Erro ao calcular vencedores:",
      error,
    );
    return []; // Retorna array vazio em caso de erro
  }
}

// A função getRankingsTodasRodadas não é mais necessária aqui
// import { getRankingsTodasRodadas } from "./rodadas.js"; // <-- REMOVIDO

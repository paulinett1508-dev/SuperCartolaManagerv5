// CORREÇÃO: Removida importação estática que causava dependência circular
// import {
//   criarBotaoExportacaoRodada,
//   exportarRankingGeralComoImagem,
// } from "./exports/export-exports.js";

// **MODIFICADO:** Importa a função para buscar ranking de UMA rodada específica
import { getRankingRodadaEspecifica } from "./rodadas.js";

// ==============================
// VARIÁVEIS PARA EXPORTS DINÂMICOS
// ==============================
let criarBotaoExportacaoRodada = null;
let exportarRankingGeralComoImagem = null;
let exportsCarregados = false;

// ==============================
// FUNÇÃO PARA CARREGAR EXPORTS DINAMICAMENTE
// ==============================
async function carregarExports() {
  if (exportsCarregados) return;

  try {
    const exportModule = await import("./exports/export-exports.js");
    criarBotaoExportacaoRodada = exportModule.criarBotaoExportacaoRodada;
    exportarRankingGeralComoImagem =
      exportModule.exportarRankingGeralComoImagem;
    exportsCarregados = true;
    console.log("[RANKING] ✅ Exports carregados com sucesso");
  } catch (error) {
    console.warn("[RANKING] ⚠️ Erro ao carregar exports:", error);
  }
}

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

async function carregarRankingGeral() {
  const rankingContainer = document.getElementById("ranking-geral");
  if (!rankingContainer || !rankingContainer.classList.contains("active")) {
    return;
  }

  rankingContainer.innerHTML = `<div style="color:#555; text-align:center; padding:20px;">Calculando ranking geral...</div>`;

  try {
    // 1. Buscar status do mercado para saber a rodada atual
    let rodada_atual = 1;
    try {
      const resMercado = await fetch("/api/cartola/mercado/status");
      if (resMercado.ok) {
        rodada_atual = (await resMercado.json()).rodada_atual;
      } else {
        console.warn("Mercado status não OK, assumindo rodada 1.");
      }
    } catch (err) {
      console.warn(
        "Erro ao buscar status do mercado, assumindo rodada 1.",
        err,
      );
    }

    const ultimaRodadaCompleta = rodada_atual - 1;
    if (ultimaRodadaCompleta < 1) {
      rankingContainer.innerHTML = `<div style="color:#555; text-align:center; padding:20px;">Nenhuma rodada completa ainda para gerar o ranking geral.</div>`;
      return;
    }

    // 2. **MODIFICADO:** Buscar rankings rodada a rodada e acumular
    const pontuacaoTotal = {};
    const todosTimesInfo = {}; // Para guardar info do time (nome, clube_id)

    console.log(
      `[ranking.js] Calculando ranking geral até a rodada ${ultimaRodadaCompleta}...`,
    );
    for (let r = 1; r <= ultimaRodadaCompleta; r++) {
      console.log(`[ranking.js] Buscando dados da rodada ${r}...`);
      try {
        const rankingDaRodada = await getRankingRodadaEspecifica(ligaId, r);
        if (Array.isArray(rankingDaRodada)) {
          console.log(
            `[ranking.js] Rodada ${r}: ${rankingDaRodada.length} times encontrados.`,
          );
          rankingDaRodada.forEach((time) => {
            const id = String(time.timeId);
            if (!id) return;

            // Inicializa se for a primeira vez que vemos o time
            if (!pontuacaoTotal[id]) {
              pontuacaoTotal[id] = 0;
              todosTimesInfo[id] = {
                time_id: id,
                nome_cartola:
                  time.nome_cartola || time.nome_cartoleiro || "N/D",
                nome_time: time.nome_time || time.nome || "N/D",
                clube_id: time.clube_id || null,
              };
            }
            // Acumula pontos
            pontuacaoTotal[id] += parseFloat(time.pontos || 0);

            // Atualiza info do time (pega a mais recente, caso mude)
            todosTimesInfo[id].nome_cartola =
              time.nome_cartola ||
              time.nome_cartoleiro ||
              todosTimesInfo[id].nome_cartola;
            todosTimesInfo[id].nome_time =
              time.nome_time || time.nome || todosTimesInfo[id].nome_time;
            todosTimesInfo[id].clube_id =
              time.clube_id || todosTimesInfo[id].clube_id;
          });
        } else {
          console.warn(
            `[ranking.js] Dados inválidos recebidos para a rodada ${r}.`,
          );
        }
      } catch (errorRodada) {
        console.error(
          `[ranking.js] Erro ao buscar ou processar dados da rodada ${r}:`,
          errorRodada,
        );
        // Decide se quer parar ou continuar (aqui continua)
      }
    }

    // 3. Converter para array e ordenar
    const ranking = Object.keys(pontuacaoTotal)
      .map((id) => ({
        ...todosTimesInfo[id],
        pontos: pontuacaoTotal[id],
      }))
      .sort((a, b) => b.pontos - a.pontos);

    console.log(
      `[ranking.js] Ranking final calculado com ${ranking.length} times.`,
    );

    // 4. Criar HTML da tabela (mesma lógica de antes)
    const tableHTML = `
      <div style="max-width: 700px; margin: 0 auto;">
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 8px;">
          <div id="rankingGeralExportBtnContainer"></div>
        </div>
        <div style="text-align: center;">
          <h2 style="margin-bottom: 2px; font-size: 2rem;">Ranking Geral</h2>
          <div style="font-size: 1rem; color: #888; margin-bottom: 18px; font-weight: 400;">
            pontuação acumulada até a ${ultimaRodadaCompleta}ª rodada
          </div>
        </div>
        <table id="rankingGeralTable" class="ranking-table">
          <thead>
            <tr>
              <th style="width: 36px; text-align: center">Pos</th>
              <th style="width: 40px; text-align: center">❤️</th>
              <th style="min-width: 180px; text-align: left">Cartoleiro</th>
              <th style="min-width: 110px; text-align: left">Time</th>
              <th style="width: 80px; text-align: center">Pontos</th>
            </tr>
          </thead>
          <tbody>
            ${ranking
              .map(
                (time, index) => `
              <tr class="${getPosicaoClass(index)}">
                <td style="text-align:center; padding:8px 2px;${index === 31 ? "background:#8b0000;color:#fff;font-weight:bold;border-radius:4px;" : ""}">
                  ${getPosicaoLabel(index)} <!-- Modificado para usar a função atualizada -->
                </td>
                <td style="text-align:center;">
                  ${
                    time.clube_id
                      ? `<img src="/escudos/${time.clube_id}.png" 
                         alt="Time do Coração" 
                         style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;"
                         onerror="this.style.display=\'none\'"/>`
                      : "—"
                  }
                </td>
                <td style="text-align:left; padding:8px 4px;">
                  ${time.nome_cartola || "N/D"}
                </td>
                <td style="text-align:left; padding:8px 4px;">
                  ${time.nome_time || "N/D"}
                </td>
                <td style="text-align:center; padding:8px 2px;">
                  <span style="font-weight:600;">
                    ${time.pontos.toFixed(2)}
                  </span>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    rankingContainer.innerHTML = tableHTML;

    // CORREÇÃO: Carregar exports antes de usar
    await carregarExports();

    // 5. Adicionar botão de exportação (mesma lógica de antes)
    if (criarBotaoExportacaoRodada && exportarRankingGeralComoImagem) {
      criarBotaoExportacaoRodada({
        containerId: "rankingGeralExportBtnContainer",
        rodada: ultimaRodadaCompleta,
        rankings: ranking,
        isParciais: false,
        isRankingGeral: true,
        customExport: exportarRankingGeralComoImagem,
      });
    } else {
      console.warn("[RANKING] ⚠️ Funções de exportação não disponíveis");
    }
  } catch (error) {
    console.error("Erro ao carregar ranking geral:", error);
    rankingContainer.innerHTML = `
      <div class="error-message" style="text-align:center; padding:20px;">
        Erro ao carregar o ranking geral: ${error.message}
      </div>
    `;
  }
}

// Funções auxiliares (getPosicaoClass, getPosicaoLabel) permanecem as mesmas
function getPosicaoClass(index) {
  switch (index) {
    case 0:
      return "ranking-primeiro";
    case 1:
      return "ranking-segundo";
    case 2:
      return "ranking-terceiro";
    default:
      return "";
  }
}

// **MODIFICADO:** Remove o ícone de bronze para a liga Sobral
function getPosicaoLabel(index) {
  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";

  switch (index) {
    case 0:
      return `<span class="trofeu-ouro" title="Campeão">🏆</span>`;
    case 1:
      return `<span class="trofeu-prata" title="Vice-Campeão">🥈</span>`;
    case 2:
      // Se for a liga Sobral, não mostra o ícone de bronze
      if (isLigaCartoleirosSobral) {
        return `${index + 1}º`;
      }
      // Para outras ligas, mantém o ícone de bronze
      return `<span class="trofeu-bronze" title="Terceiro Lugar">🥉</span>`;
    default:
      return `${index + 1}º`;
  }
}

export { carregarRankingGeral };

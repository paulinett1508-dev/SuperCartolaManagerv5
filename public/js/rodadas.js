import {
  buscarStatusMercado as getMercadoStatus,
  getLigaId,
} from "./pontos-corridos-utils.js"; // Corrigido: busca do arquivo e nome corretos
import {
  criarBotaoExportacaoRodada,
  exportarRodadaComoImagem,
} from "./export.utils.js";

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

// Valores padrão para rodadas
const valoresBancoPadrao = {
  1: 20.0,
  2: 19.0,
  3: 18.0,
  4: 17.0,
  5: 16.0,
  6: 15.0,
  7: 14.0,
  8: 13.0,
  9: 12.0,
  10: 11.0,
  11: 10.0,
  12: 0.0,
  13: 0.0,
  14: 0.0,
  15: 0.0,
  16: 0.0,
  17: 0.0,
  18: 0.0,
  19: 0.0,
  20: 0.0,
  21: 0.0,
  22: -10.0,
  23: -11.0,
  24: -12.0,
  25: -13.0,
  26: -14.0,
  27: -15.0,
  28: -16.0,
  29: -17.0,
  30: -18.0,
  31: -19.0,
  32: -20.0,
};

// Valores específicos para a liga Cartoleiros Sobral 2025
const valoresBancoCartoleirosSobral = {
  1: 7.0, // MITO ganha R$ 7,00
  2: 4.0, // G2 ganha R$ 4,00
  3: 0.0, // 3º não ganha nem perde
  4: -2.0, // 4º perde R$ -2,00
  5: -5.0, // 5º perde R$ -5,00
  6: -10.0, // MICO perde R$ -10,00
};

// Helper para gerar labels de posição (MITO, G10, Z10, MICO)
// **AJUSTE POSIÇÕES:** Modificado para atender novo formato Z e G11
// **AJUSTE LIGA SOBRAL:** Adicionado MICO para 6ª posição
function getPosLabel(index, total) {
  const pos = index + 1;
  const isLigaCartoleirosSobral = ligaId === "6818c6125b30e1ad70847192";

  // Para a liga Cartoleiros Sobral 2025
  if (isLigaCartoleirosSobral) {
    if (pos === 1) {
      // MITO
      return `<span style="color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;">MITO</span>`;
    }
    if (pos === 6) {
      // MICO
      return `<span style="color:#fff; font-weight:bold; background:#dc3545; border-radius:4px; padding:1px 8px; font-size:12px;">MICO</span>`;
    }
    if (pos === 2) {
      // Mantém G2 se houver estilo associado
      return `<span class="pos-g">G2</span>`;
    }
    // Posições normais (3, 4, 5)
    return `${pos}º`;
  } else {
    // Lógica padrão para outras ligas
    if (pos === 1) {
      return `<span style="color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;">MITO</span>`;
    }
    // G2 a G10
    if (pos >= 2 && pos <= 10) {
      return `<span class="pos-g">G${pos}</span>`;
    }
    // **NOVO:** G11
    if (pos === 11) {
      return `<span class="pos-g">G11</span>`;
    }
    // **NOVO FORMATO:** Z1 a Z10 (para posições 22 a 31 em um total de 32)
    if (pos >= total - 10 && pos < total) {
      // Ex: Se total=32, de 22 a 31
      // Calcula a posição Z de forma inversa (Z1 = 31º, Z10 = 22º)
      const zPos = total - pos;
      return `<span class="pos-z">${pos}º | Z${zPos}</span>`;
    }
    // MICO (Último lugar)
    if (pos === total && total > 1) {
      return `<span class="pos-mico">MICO</span>`;
    }
    // Posições normais (12 a 21, se total=32)
    return `${pos}º`;
  }
}

// Função principal para carregar e exibir dados da rodada selecionada
export async function carregarRodadas(forceRefresh = false) {
  const rodadasContainer = document.getElementById("rodadas");
  if (!rodadasContainer || !rodadasContainer.classList.contains("active")) {
    return;
  }

  const rodadaSelect = document.getElementById("rodadaSelect");
  const rankingBody = document.getElementById("rankingBody");
  const loading = document.getElementById("loading");

  let rodada_atual = 1;
  let status_mercado = 4; // Default: Mercado fechado
  try {
    const resMercado = await fetch("/api/cartola/mercado/status");
    if (resMercado.ok) {
      const mercadoData = await resMercado.json();
      rodada_atual = mercadoData.rodada_atual;
      status_mercado = mercadoData.status_mercado;
    } else {
      console.warn("Não foi possível buscar status do mercado.");
    }
  } catch (err) {
    console.error("Erro ao buscar status do mercado:", err);
  }
  const mercadoAberto = status_mercado === 1;

  // Popula o select de rodadas se ainda não foi populado
  if (rodadaSelect.options.length < 39) {
    rodadaSelect.innerHTML = ""; // Limpa opções antigas
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Escolha uma rodada";
    rodadaSelect.appendChild(defaultOption);

    for (let i = 1; i <= 38; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `Rodada ${i}`;
      if (i < rodada_atual) {
        option.className = "encerrada";
      } else if (i === rodada_atual) {
        option.className = "vigente";
      } else {
        option.className = "futura";
        option.disabled = true; // Desabilita rodadas futuras
      }
      rodadaSelect.appendChild(option);
    }
    rodadaSelect.onchange = () => carregarRodadas(); // Recarrega ao mudar a seleção
  }

  let rodadaSelecionada = parseInt(rodadaSelect.value);

  // Se nenhuma rodada válida for selecionada, limpa a tabela
  if (!rodadaSelecionada || rodadaSelecionada > rodada_atual + 1) {
    // Não permite carregar futuras
    rankingBody.innerHTML =
      '<tr><td colspan="6">Selecione uma rodada para visualizar o ranking.</td></tr>';
    loading.style.display = "none";
    const exportContainer = document.getElementById(
      "rodadasExportBtnContainer",
    );
    if (exportContainer) exportContainer.innerHTML = "";
    return;
  }

  try {
    loading.style.display = "block";
    rankingBody.innerHTML = ""; // Limpa ranking anterior

    // Lógica para buscar e exibir dados da rodada selecionada
    if (rodadaSelecionada < rodada_atual) {
      // Rodada Encerrada: Busca dados consolidados da API
      // **MODIFICADO:** Usa a nova função interna que já filtra e ordena
      const rankingsDaRodada = await fetchAndProcessRankingRodada(
        ligaId,
        rodadaSelecionada,
      );
      exibirRanking(rankingsDaRodada, rodadaSelecionada);
    } else if (rodadaSelecionada === rodada_atual) {
      // Rodada Vigente: Verifica status do mercado
      if (mercadoAberto) {
        rankingBody.innerHTML =
          '<tr><td colspan="6" style="color: #e67e22;">O mercado está aberto. A rodada ainda não começou!</td></tr>';
        const exportContainer = document.getElementById(
          "rodadasExportBtnContainer",
        );
        if (exportContainer) exportContainer.innerHTML = "";
      } else {
        // Mercado Fechado: Calcula e exibe parciais
        const liga = await buscarLiga(ligaId);
        if (!liga)
          throw new Error(
            "Erro ao buscar dados da liga para calcular parciais",
          );
        const rankingsParciais = await calcularPontosParciais(
          liga,
          rodada_atual,
        );
        exibirRankingParciais(rankingsParciais, rodada_atual);
      }
    } else {
      // Rodada Futura (não deveria chegar aqui devido à validação inicial, mas por segurança)
      rankingBody.innerHTML =
        '<tr><td colspan="6" style="color: #bbb;">Esta rodada ainda não aconteceu.</td></tr>';
      const exportContainer = document.getElementById(
        "rodadasExportBtnContainer",
      );
      if (exportContainer) exportContainer.innerHTML = "";
    }
  } catch (err) {
    console.error("Erro em carregarRodadas:", err);
    rankingBody.innerHTML = `<tr><td colspan=\"6\" style=\"color: red;\">${err.message}</td></tr>`;
    const exportContainer = document.getElementById(
      "rodadasExportBtnContainer",
    );
    if (exportContainer) exportContainer.innerHTML = "";
  } finally {
    loading.style.display = "none";
  }
}

// **NOVA FUNÇÃO INTERNA:** Busca dados da API, filtra pela rodada e ordena
// Retorna o array ordenado (ranking) ou lança erro
async function fetchAndProcessRankingRodada(ligaId, rodadaNum) {
  try {
    const resRodadas = await fetch(
      `/api/ligas/${ligaId}/rodadas?inicio=${rodadaNum}&fim=${rodadaNum}`,
    );
    if (!resRodadas.ok)
      throw new Error(
        `Erro ${resRodadas.status} ao buscar dados da API para rodada ${rodadaNum}`,
      );
    const rankingsDataFromApi = await resRodadas.json();

    // Filtra para garantir que apenas dados da rodada correta sejam usados
    const rankingsDaRodada = Array.isArray(rankingsDataFromApi)
      ? rankingsDataFromApi.filter((rank) => rank.rodada === rodadaNum)
      : [];

    // Verifica se há dados *após* filtrar
    if (rankingsDaRodada.length === 0) {
      // Lança erro se não encontrar dados para a rodada específica
      throw new Error(
        `Nenhum dado encontrado para a rodada ${rodadaNum} após filtro.`,
      );
    }

    // Ordena pela pontuação
    rankingsDaRodada.sort(
      (a, b) => parseFloat(b.pontos) - parseFloat(a.pontos),
    );

    return rankingsDaRodada; // Retorna o ranking processado
  } catch (err) {
    console.error(`Erro em fetchAndProcessRankingRodada(${rodadaNum}):`, err);
    throw err; // Re-lança o erro para ser tratado pela função chamadora
  }
}

// **NOVA FUNÇÃO EXPORTADA:** Para ser usada pelo mata-mata.js e outros módulos
// Simplesmente chama a função interna para obter o ranking da rodada
export async function getRankingRodadaEspecifica(ligaId, rodadaNum) {
  console.log(`[rodadas.js] Solicitado ranking para rodada ${rodadaNum}`);
  // Chama a função que busca, filtra e ordena
  return await fetchAndProcessRankingRodada(ligaId, rodadaNum);
}

// Função para exibir o ranking de uma rodada ENCERRADA
// Recebe o ranking JÁ PROCESSADO (filtrado e ordenado)
function exibirRanking(rankingsDaRodada, rodadaSelecionada) {
  const rankingBody = document.getElementById("rankingBody");

  // Não precisa mais filtrar ou ordenar aqui, já foi feito
  if (!rankingsDaRodada || rankingsDaRodada.length === 0) {
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado encontrado para a rodada ${rodadaSelecionada}.</td></tr>`;
    const exportContainer = document.getElementById(
      "rodadasExportBtnContainer",
    );
    if (exportContainer) exportContainer.innerHTML = "";
    return;
  }

  // Verifica se é a liga Cartoleiros Sobral 2025
  const isLigaCartoleirosSobral = ligaId === "6818c6125b30e1ad70847192";

  // Seleciona os valores de banco com base na liga
  const bancoValores = isLigaCartoleirosSobral
    ? valoresBancoCartoleirosSobral
    : valoresBancoPadrao;

  // Gera o HTML da tabela
  const tableHTML = rankingsDaRodada
    .map((rank, index) => {
      const banco =
        bancoValores[index + 1] !== undefined ? bancoValores[index + 1] : 0.0;
      const posLabel = getPosLabel(index, rankingsDaRodada.length);
      const nomeCartoleiro = rank.nome_cartola || rank.nome_cartoleiro || "N/D";
      const nomeTime = rank.nome_time || "N/D";
      const pontos =
        rank.pontos != null ? parseFloat(rank.pontos).toFixed(2) : "-";

      return `
      <tr>
        <td style="text-align:center; padding:4px 2px; font-size:13px; vertical-align:middle;">
          ${posLabel}
        </td>
        <td style="text-align:center; padding:4px 2px; vertical-align:middle;">
          ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" title="${rank.clube_id}" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display=\'none\'"/>` : "—"}
        </td>
        <td style="max-width:110px; text-align:left; padding:4px; font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nomeCartoleiro}">
          ${nomeCartoleiro}
        </td>
        <td style="max-width:110px; text-align:left; padding:4px; font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nomeTime}">
          ${nomeTime}
        </td>
        <td style="text-align:center; padding:4px 2px; font-size:13px; vertical-align:middle;">
          <span style="font-weight:600; color:${pontos > 0 ? "#198754" : pontos < 0 ? "#dc3545" : "#333"};">
            ${pontos}
          </span>
        </td>
        <td style="text-align:center; padding:4px 2px; font-size:12px; vertical-align:middle;">
          <span style="font-size:11px; font-weight:600; color:${banco > 0 ? "#198754" : banco < 0 ? "#dc3545" : "#333"}; white-space:nowrap;">
            ${banco >= 0 ? `R$ ${banco.toFixed(2)}` : `-R$ ${Math.abs(banco).toFixed(2)}`}
          </span>
        </td>
      </tr>
      `;
    })
    .join("");

  rankingBody.innerHTML = tableHTML;

  // Adiciona o campo 'banco' aos dados para exportação
  const rankingsParaExportar = rankingsDaRodada.map((rank, index) => ({
    ...rank,
    nome_cartola: rank.nome_cartola || rank.nome_cartoleiro || "N/D",
    nome_time: rank.nome_time || "N/D",
    pontos: rank.pontos != null ? parseFloat(rank.pontos) : 0,
    banco:
      bancoValores[index + 1] !== undefined ? bancoValores[index + 1] : 0.0,
  }));

  // Cria o botão de exportação
  criarBotaoExportacaoRodada({
    containerId: "rodadasExportBtnContainer",
    rodada: rodadaSelecionada,
    rankings: rankingsParaExportar,
    tipo: "rodada",
    customExport: exportarRodadaComoImagem,
  });
}

// Função para exibir o ranking de uma rodada VIGENTE (Parciais)
function exibirRankingParciais(rankingsParciais, rodada) {
  const rankingBody = document.getElementById("rankingBody");

  if (
    !rankingsParciais ||
    !Array.isArray(rankingsParciais) ||
    rankingsParciais.length === 0
  ) {
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado parcial encontrado para a rodada ${rodada}.</td></tr>`;
    const exportContainer = document.getElementById(
      "rodadasExportBtnContainer",
    );
    if (exportContainer) exportContainer.innerHTML = "";
    return;
  }

  // Ordena pela pontuação parcial
  rankingsParciais.sort(
    (a, b) => parseFloat(b.totalPontos) - parseFloat(a.totalPontos),
  );

  const tableHTML = rankingsParciais
    .map((rank, index) => {
      const posLabel = getPosLabel(index, rankingsParciais.length);
      const nomeCartoleiro = rank.nome_cartola || rank.nome_cartoleiro || "N/D";
      const nomeTime = rank.nome_time || "N/D";
      const pontos =
        rank.totalPontos != null
          ? parseFloat(rank.totalPontos).toFixed(2)
          : "-";

      return `
      <tr>
         <td style="text-align:center; padding:4px 2px; font-size:13px; vertical-align:middle;">
          ${posLabel}
        </td>
        <td style="text-align:center; padding:4px 2px; vertical-align:middle;">
          ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" title="${rank.clube_id}" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display=\'none\'"/>` : "—"}
        </td>
        <td style="max-width:110px; text-align:left; padding:4px; font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nomeCartoleiro}">
          ${nomeCartoleiro}
        </td>
        <td style="max-width:110px; text-align:left; padding:4px; font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nomeTime}">
          ${nomeTime}
        </td>
        <td style="text-align:center; padding:4px 2px; font-size:13px; vertical-align:middle;">
          <span style="font-weight:600; color:${pontos > 0 ? "#198754" : pontos < 0 ? "#dc3545" : "#333"};">
            ${pontos} (Parcial)
          </span>
        </td>
        <td style="text-align:center; padding:4px 2px; font-size:12px; vertical-align:middle;">
          <span style="font-size:11px; font-weight:600; color:#333; white-space:nowrap;">
            -
          </span>
        </td>
      </tr>
      `;
    })
    .join("");

  rankingBody.innerHTML = tableHTML;

  // Prepara dados para exportação (sem banco para parciais)
  const rankingsParaExportar = rankingsParciais.map((rank, index) => ({
    ...rank,
    nome_cartola: rank.nome_cartola || rank.nome_cartoleiro || "N/D",
    nome_time: rank.nome_time || "N/D",
    pontos: rank.totalPontos != null ? parseFloat(rank.totalPontos) : 0,
    banco: null, // Sem banco em parciais
  }));

  // Cria botão de exportação para parciais
  criarBotaoExportacaoRodada({
    containerId: "rodadasExportBtnContainer",
    rodada: rodada,
    rankings: rankingsParaExportar,
    tipo: "rodada",
    customExport: exportarRodadaComoImagem,
  });
}

// --- Funções para cálculo de parciais ---

// Busca dados da liga (incluindo times)
async function buscarLiga(ligaId) {
  try {
    const res = await fetch(`/api/ligas/${ligaId}`);
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar liga`);
    return await res.json();
  } catch (err) {
    console.error("Erro em buscarLiga:", err);
    return null;
  }
}

// Busca pontuações parciais dos atletas
async function buscarPontuacoesParciais() {
  try {
    const res = await fetch("/api/cartola/atletas/pontuados");
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar parciais`);
    const data = await res.json();
    return data.atletas || {}; // Retorna o objeto de atletas { id: { pontuacao: X }, ... }
  } catch (err) {
    console.error("Erro em buscarPontuacoesParciais:", err);
    return {};
  }
}

// Calcula pontos parciais para todos os times da liga
async function calcularPontosParciais(liga, rodada) {
  const atletasPontuados = await buscarPontuacoesParciais();
  const times = liga.times || [];
  const rankingsParciais = [];

  for (const time of times) {
    try {
      const resTime = await fetch(
        `/api/cartola/time/id/${time.time_id}/${rodada}`,
      );
      if (!resTime.ok) {
        console.warn(
          `Erro ${resTime.status} ao buscar escalação do time ${time.time_id} para rodada ${rodada}`,
        );
        continue; // Pula para o próximo time se houver erro
      }
      const escalacaoData = await resTime.json();
      const atletasEscalados = escalacaoData.atletas || [];
      const capitaoId = escalacaoData.capitao_id;

      let totalPontos = 0;
      atletasEscalados.forEach((atleta) => {
        const pontuacaoAtleta =
          atletasPontuados[atleta.atleta_id]?.pontuacao || 0;
        if (atleta.atleta_id === capitaoId) {
          totalPontos += pontuacaoAtleta * 1.5; // Capitão pontua 1.5x
        } else {
          totalPontos += pontuacaoAtleta;
        }
      });

      rankingsParciais.push({
        ...time, // Inclui dados do time (nome_cartola, nome_time, clube_id)
        totalPontos: totalPontos,
      });
    } catch (err) {
      console.error(
        `Erro ao processar parciais para o time ${time.time_id}:`,
        err,
      );
    }
  }

  return rankingsParciais;
}

// VERIFICAÇÃO DE AMBIENTE - Executar lógica diferente para frontend/backend
const isBackend = typeof window === "undefined";
const isFrontend = typeof window !== "undefined";

// DECLARAÇÕES CONDICIONAIS
let urlParams, ligaId;

// ==============================
// VARIÁVEIS PARA IMPORTS DINÂMICOS
// ==============================
let getMercadoStatus = null;
let getLigaId = null;
let criarBotaoExportacaoRodada = null;
let exportarRodadaComoImagem = null;
let modulosCarregados = false;

// ==============================
// FUNÇÃO PARA CARREGAR MÓDULOS DINAMICAMENTE
// ==============================
async function carregarModulos() {
  if (modulosCarregados || isBackend) return;

  try {
    // CORREÇÃO: Usar importações dinâmicas condicionais para evitar dependências circulares
    const [pontosCorridosModule, exportModule] = await Promise.all([
      import("./pontos-corridos-utils.js"),
      import("./exports/export-exports.js"),
    ]);

    getMercadoStatus = pontosCorridosModule.buscarStatusMercado;
    getLigaId = pontosCorridosModule.getLigaId;
    criarBotaoExportacaoRodada = exportModule.criarBotaoExportacaoRodada;
    exportarRodadaComoImagem = exportModule.exportarRodadaComoImagem;

    modulosCarregados = true;
    console.log("[RODADAS] ✅ Módulos carregados com sucesso");
  } catch (error) {
    console.warn("[RODADAS] ⚠️ Erro ao carregar módulos:", error);
  }
}

if (isFrontend) {
  // ✅ CORREÇÃO: Remover await no nível superior - causar problemas de carregamento
  // Carregar módulos de forma assíncrona sem bloquear
  carregarModulos().then(() => {
    console.log("[RODADAS] ✅ Inicialização assíncrona completa");
  }).catch(error => {
    console.warn("[RODADAS] ⚠️ Erro na inicialização assíncrona:", error);
  });

  // Variáveis específicas do frontend
  urlParams = new URLSearchParams(window.location.search);
  ligaId = urlParams.get("id");

  // ✅ CORREÇÃO: Disponibilizar globalmente após carregamento assíncrono
  // Remover tentativa de disponibilizar antes do carregamento completo
} else {
  // BACKEND - Definir valores padrão
  console.log("[RODADAS] Executando no backend - modo limitado");
  urlParams = null;
  ligaId = null;
}

// Valores padrão para rodadas (mantido inalterado)
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
  1: 7.0,
  2: 4.0,
  3: 0.0,
  4: -2.0,
  5: -5.0,
  6: -10.0,
};

// Helper para gerar labels de posição (MITO, G10, Z10, MICO) - mantido inalterado
function getPosLabel(index, total) {
  if (isBackend) return `${index + 1}º`; // Versão simplificada para backend

  const pos = index + 1;
  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";

  if (isLigaCartoleirosSobral) {
    if (pos === 1)
      return `<span style="color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;">MITO</span>`;
    if (pos === 6)
      return `<span style="color:#fff; font-weight:bold; background:#dc3545; border-radius:4px; padding:1px 8px; font-size:12px;">MICO</span>`;
    if (pos === 2) return `<span class="pos-g">G2</span>`;
    return `${pos}º`;
  } else {
    if (pos === 1)
      return `<span style="color:#fff; font-weight:bold; background:#198754; border-radius:4px; padding:1px 8px; font-size:12px;">MITO</span>`;
    if (pos >= 2 && pos <= 10) return `<span class="pos-g">G${pos}</span>`;
    if (pos === 11) return `<span class="pos-g">G11</span>`;
    if (pos >= total - 10 && pos < total) {
      const zPos = total - pos;
      return `<span class="pos-z">${pos}º | Z${zPos}</span>`;
    }
    if (pos === total && total > 1) return `<span class="pos-mico">MICO</span>`;
    return `${pos}º`;
  }
}

// ✅ CORREÇÃO: Função principal com carregamento garantido
export async function carregarRodadas(forceRefresh = false) {
  if (isBackend) {
    console.log("[RODADAS] carregarRodadas: executando no backend - ignorando");
    return;
  }

  // ✅ CORREÇÃO: Garantir que módulos estão carregados antes de usar
  await carregarModulos();

  const rodadasContainer = document.getElementById("rodadas");
  if (!rodadasContainer || !rodadasContainer.classList.contains("active")) {
    return;
  }

  const rodadaSelect = document.getElementById("rodadaSelect");
  const rankingBody = document.getElementById("rankingBody");
  const loading = document.getElementById("loading");

  let rodada_atual = 1;
  let status_mercado = 4;

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
    rodadaSelect.innerHTML = "";
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
        option.disabled = true;
      }
      rodadaSelect.appendChild(option);
    }
    rodadaSelect.onchange = () => carregarRodadas();
  }

  let rodadaSelecionada = parseInt(rodadaSelect.value);

  if (!rodadaSelecionada || rodadaSelecionada > rodada_atual + 1) {
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
    rankingBody.innerHTML = "";

    if (rodadaSelecionada < rodada_atual) {
      const rankingsDaRodada = await fetchAndProcessRankingRodada(
        ligaId,
        rodadaSelecionada,
      );
      exibirRanking(rankingsDaRodada, rodadaSelecionada);
    } else if (rodadaSelecionada === rodada_atual) {
      if (mercadoAberto) {
        rankingBody.innerHTML =
          '<tr><td colspan="6" style="color: #e67e22;">O mercado está aberto. A rodada ainda não começou!</td></tr>';
        const exportContainer = document.getElementById(
          "rodadasExportBtnContainer",
        );
        if (exportContainer) exportContainer.innerHTML = "";
      } else {
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
      rankingBody.innerHTML =
        '<tr><td colspan="6" style="color: #bbb;">Esta rodada ainda não aconteceu.</td></tr>';
      const exportContainer = document.getElementById(
        "rodadasExportBtnContainer",
      );
      if (exportContainer) exportContainer.innerHTML = "";
    }
  } catch (err) {
    console.error("Erro em carregarRodadas:", err);
    rankingBody.innerHTML = `<tr><td colspan="6" style="color: red;">${err.message}</td></tr>`;
    const exportContainer = document.getElementById(
      "rodadasExportBtnContainer",
    );
    if (exportContainer) exportContainer.innerHTML = "";
  } finally {
    loading.style.display = "none";
  }
}

// Função interna para buscar dados da API (mantida inalterada)
async function fetchAndProcessRankingRodada(ligaId, rodadaNum) {
  try {
    console.log(
      `[DEBUG] Iniciando busca para ligaId: ${ligaId}, rodada: ${rodadaNum}`,
    );

    // Determinar qual fetch usar
    let fetchFunc;
    if (isBackend) {
      fetchFunc = (await import("node-fetch")).default;
    } else {
      fetchFunc = fetch;
    }

    const baseUrl = isBackend ? "http://localhost:3000" : "";
    const resRodadas = await fetchFunc(
      `${baseUrl}/api/rodadas/${ligaId}/rodadas?inicio=${rodadaNum}&fim=${rodadaNum}`,
    );

    if (!resRodadas.ok) {
      throw new Error(
        `Erro ${resRodadas.status} ao buscar dados da API para rodada ${rodadaNum}`,
      );
    }

    const rankingsDataFromApi = await resRodadas.json();

    console.log(
      "[DEBUG] Dados brutos da API recebidos para a rodada:",
      rodadaNum,
    );
    console.log("[DEBUG] Tipo dos dados:", typeof rankingsDataFromApi);
    console.log("[DEBUG] É array:", Array.isArray(rankingsDataFromApi));
    console.log(
      "[DEBUG] Quantidade de registros:",
      Array.isArray(rankingsDataFromApi) ? rankingsDataFromApi.length : "N/A",
    );

    if (!rankingsDataFromApi) {
      console.warn(
        `[WARN] API retornou dados nulos/undefined para rodada ${rodadaNum}`,
      );
      return [];
    }

    const dataArray = Array.isArray(rankingsDataFromApi)
      ? rankingsDataFromApi
      : [];

    if (dataArray.length === 0) {
      console.warn(`[WARN] API retornou array vazio para rodada ${rodadaNum}`);
      return [];
    }

    const rankingsDaRodada = dataArray.filter((rank, index) => {
      console.log(`[DEBUG] Item ${index}:`, {
        rodada_no_dado: rank.rodada,
        tipo_rodada: typeof rank.rodada,
        rodada_solicitada: rodadaNum,
        tipo_solicitada: typeof rodadaNum,
        tem_campo_rodada: rank.hasOwnProperty("rodada"),
        comparacao_direta: rank.rodada === rodadaNum,
        comparacao_numerica: Number(rank.rodada) === Number(rodadaNum),
        comparacao_string: String(rank.rodada) === String(rodadaNum),
        parseInt_comparacao: parseInt(rank.rodada) === parseInt(rodadaNum),
      });

      if (!rank || typeof rank !== "object") {
        console.warn(`[WARN] Item ${index} não é um objeto válido:`, rank);
        return false;
      }

      if (!rank.hasOwnProperty("rodada")) {
        console.warn(`[WARN] Item ${index} não possui campo 'rodada':`, rank);
        return false;
      }

      const rodadaDado = rank.rodada;
      const rodadaSolicitada = rodadaNum;

      if (rodadaDado === rodadaSolicitada) return true;

      const rodadaDadoNum = Number(rodadaDado);
      const rodadaSolicitadaNum = Number(rodadaSolicitada);

      if (
        !isNaN(rodadaDadoNum) &&
        !isNaN(rodadaSolicitadaNum) &&
        rodadaDadoNum === rodadaSolicitadaNum
      ) {
        return true;
      }

      const rodadaDadoInt = parseInt(rodadaDado);
      const rodadaSolicitadaInt = parseInt(rodadaSolicitada);

      if (
        !isNaN(rodadaDadoInt) &&
        !isNaN(rodadaSolicitadaInt) &&
        rodadaDadoInt === rodadaSolicitadaInt
      ) {
        return true;
      }

      return false;
    });

    console.log(
      `[DEBUG] Após filtro: ${rankingsDaRodada.length} registros encontrados`,
    );

    if (rankingsDaRodada.length === 0) {
      console.warn(
        `[WARN] Nenhum dado encontrado após filtro para rodada ${rodadaNum}`,
      );
      const rodadasDisponiveis = [
        ...new Set(dataArray.map((item) => item.rodada)),
      ].sort();
      console.log("[DEBUG] Rodadas encontradas nos dados:", rodadasDisponiveis);
      console.warn(
        `[WARN] Retornando array vazio para rodada ${rodadaNum}. Rodadas disponíveis: ${rodadasDisponiveis.join(", ")}`,
      );
      return [];
    }

    rankingsDaRodada.sort(
      (a, b) => parseFloat(b.pontos || 0) - parseFloat(a.pontos || 0),
    );

    console.log(
      `[DEBUG] Dados processados com sucesso para rodada ${rodadaNum}: ${rankingsDaRodada.length} registros`,
    );
    return rankingsDaRodada;
  } catch (err) {
    console.error(
      `[ERROR] Erro em fetchAndProcessRankingRodada(${rodadaNum}):`,
      err,
    );
    console.warn(
      `[WARN] Retornando array vazio devido ao erro para rodada ${rodadaNum}`,
    );
    return [];
  }
}

// ✅ FUNÇÃO EXPORTADA: Uso pelo mata-mata.js (mantida inalterada)
export async function getRankingRodadaEspecifica(ligaId, rodadaNum) {
  console.log(`[rodadas.js] Solicitado ranking para rodada ${rodadaNum}`);
  return await fetchAndProcessRankingRodada(ligaId, rodadaNum);
}

// ✅ CORREÇÃO: Função para exibir ranking com verificação de carregamento
function exibirRanking(rankingsDaRodada, rodadaSelecionada) {
  if (isBackend) {
    console.log("[RODADAS] exibirRanking: executando no backend - ignorando");
    return;
  }

  const rankingBody = document.getElementById("rankingBody");

  if (!rankingsDaRodada || rankingsDaRodada.length === 0) {
    rankingBody.innerHTML = `<tr><td colspan="6">Nenhum dado encontrado para a rodada ${rodadaSelecionada}.</td></tr>`;
    const exportContainer = document.getElementById(
      "rodadasExportBtnContainer",
    );
    if (exportContainer) exportContainer.innerHTML = "";
    return;
  }

  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";
  const bancoValores = isLigaCartoleirosSobral
    ? valoresBancoCartoleirosSobral
    : valoresBancoPadrao;

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
        <td style="text-align:center; padding:4px 2px; font-size:13px; vertical-align:middle;">${posLabel}</td>
        <td style="text-align:center; padding:4px 2px; vertical-align:middle;">
          ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" title="${rank.clube_id}" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "—"}
        </td>
        <td style="max-width:110px; text-align:left; padding:4px; font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nomeCartoleiro}">${nomeCartoleiro}</td>
        <td style="max-width:110px; text-align:left; padding:4px; font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nomeTime}">${nomeTime}</td>
        <td style="text-align:center; padding:4px 2px; font-size:13px; vertical-align:middle;">
          <span style="font-weight:600; color:${pontos > 0 ? "#198754" : pontos < 0 ? "#dc3545" : "#333"};">${pontos}</span>
        </td>
        <td style="text-align:center; padding:4px 2px; font-size:12px; vertical-align:middle;">
          <span style="font-size:11px; font-weight:600; color:${banco > 0 ? "#198754" : banco < 0 ? "#dc3545" : "#333"}; white-space:nowrap;">
            ${banco >= 0 ? `R$ ${banco.toFixed(2)}` : `-R$ ${Math.abs(banco).toFixed(2)}`}
          </span>
        </td>
      </tr>`;
    })
    .join("");

  rankingBody.innerHTML = tableHTML;

  const rankingsParaExportar = rankingsDaRodada.map((rank, index) => ({
    ...rank,
    nome_cartola: rank.nome_cartola || rank.nome_cartoleiro || "N/D",
    nome_time: rank.nome_time || "N/D",
    pontos: rank.pontos != null ? parseFloat(rank.pontos) : 0,
    banco:
      bancoValores[index + 1] !== undefined ? bancoValores[index + 1] : 0.0,
  }));

  // ✅ CORREÇÃO: Usar função de alta qualidade diretamente
  try {
    const { criarBotaoExportacaoRodadaHQ } = await import("./exports/export-rodadas-hq.js");
    criarBotaoExportacaoRodadaHQ("rodadasExportBtnContainer", rodadaSelecionada, rankingsParaExportar, "rodada");
  } catch (error) {
    console.warn("[RODADAS] ⚠️ Erro ao carregar exportação de alta qualidade:", error);
    // Fallback para sistema antigo
    if (criarBotaoExportacaoRodada && exportarRodadaComoImagem) {
      criarBotaoExportacaoRodada({
        containerId: "rodadasExportBtnContainer",
        rodada: rodadaSelecionada,
        rankings: rankingsParaExportar,
        tipo: "rodada",
        customExport: exportarRodadaComoImagem,
      });
    }
  }
}

// ✅ CORREÇÃO: Função para exibir ranking parciais com verificação de carregamento  
function exibirRankingParciais(rankingsParciais, rodada) {
  if (isBackend) {
    console.log(
      "[RODADAS] exibirRankingParciais: executando no backend - ignorando",
    );
    return;
  }

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
        <td style="text-align:center; padding:4px 2px; font-size:13px; vertical-align:middle;">${posLabel}</td>
        <td style="text-align:center; padding:4px 2px; vertical-align:middle;">
          ${rank.clube_id ? `<img src="/escudos/${rank.clube_id}.png" alt="" title="${rank.clube_id}" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "—"}
        </td>
        <td style="max-width:110px; text-align:left; padding:4px; font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nomeCartoleiro}">${nomeCartoleiro}</td>
        <td style="max-width:110px; text-align:left; padding:4px; font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nomeTime}">${nomeTime}</td>
        <td style="text-align:center; padding:4px 2px; font-size:13px; vertical-align:middle;">
          <span style="font-weight:600; color:${pontos > 0 ? "#198754" : pontos < 0 ? "#dc3545" : "#333"};">${pontos} (Parcial)</span>
        </td>
        <td style="text-align:center; padding:4px 2px; font-size:12px; vertical-align:middle;">
          <span style="font-size:11px; font-weight:600; color:#333; white-space:nowrap;">-</span>
        </td>
      </tr>`;
    })
    .join("");

  rankingBody.innerHTML = tableHTML;

  const rankingsParaExportar = rankingsParciais.map((rank, index) => ({
    ...rank,
    nome_cartola: rank.nome_cartola || rank.nome_cartoleiro || "N/D",
    nome_time: rank.nome_time || "N/D",
    pontos: rank.totalPontos != null ? parseFloat(rank.totalPontos) : 0,
    banco: null,
  }));

  // ✅ CORREÇÃO: Usar função de alta qualidade diretamente para parciais
  try {
    const { criarBotaoExportacaoRodadaHQ } = await import("./exports/export-rodadas-hq.js");
    criarBotaoExportacaoRodadaHQ("rodadasExportBtnContainer", rodada, rankingsParaExportar, "rodada-parcial");
  } catch (error) {
    console.warn("[RODADAS] ⚠️ Erro ao carregar exportação de alta qualidade para parciais:", error);
    // Fallback para sistema antigo
    if (criarBotaoExportacaoRodada && exportarRodadaComoImagem) {
      criarBotaoExportacaoRodada({
        containerId: "rodadasExportBtnContainer",
        rodada: rodada,
        rankings: rankingsParaExportar,
        tipo: "rodada",
        customExport: exportarRodadaComoImagem,
      });
    }
  }
}

// Busca dados da liga (incluindo times) - mantida inalterada
async function buscarLiga(ligaId) {
  try {
    let fetchFunc;
    if (isBackend) {
      fetchFunc = (await import("node-fetch")).default;
    } else {
      fetchFunc = fetch;
    }

    const baseUrl = isBackend ? "http://localhost:3000" : "";
    const res = await fetchFunc(`${baseUrl}/api/ligas/${ligaId}`);
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar liga`);
    return await res.json();
  } catch (err) {
    console.error("Erro em buscarLiga:", err);
    return null;
  }
}

// Busca pontuações parciais dos atletas - mantida inalterada
async function buscarPontuacoesParciais() {
  try {
    let fetchFunc;
    if (isBackend) {
      fetchFunc = (await import("node-fetch")).default;
    } else {
      fetchFunc = fetch;
    }

    const baseUrl = isBackend ? "http://localhost:3000" : "";
    const res = await fetchFunc(`${baseUrl}/api/cartola/atletas/pontuados`);
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar parciais`);
    const data = await res.json();
    return data.atletas || {};
  } catch (err) {
    console.error("Erro em buscarPontuacoesParciais:", err);
    return {};
  }
}

// Calcula pontos parciais para todos os times da liga - mantida inalterada
async function calcularPontosParciais(liga, rodada) {
  const atletasPontuados = await buscarPontuacoesParciais();
  const times = liga.times || [];
  const rankingsParciais = [];

  for (const time of times) {
    try {
      let fetchFunc;
      if (isBackend) {
        fetchFunc = (await import("node-fetch")).default;
      } else {
        fetchFunc = fetch;
      }

      const baseUrl = isBackend ? "http://localhost:3000" : "";
      const resTime = await fetchFunc(
        `${baseUrl}/api/cartola/time/id/${time.time_id}/${rodada}`,
      );

      if (!resTime.ok) {
        console.warn(
          `Erro ${resTime.status} ao buscar escalação do time ${time.time_id} para rodada ${rodada}`,
        );
        continue;
      }

      const escalacaoData = await resTime.json();
      const atletasEscalados = escalacaoData.atletas || [];
      const capitaoId = escalacaoData.capitao_id;

      let totalPontos = 0;
      atletasEscalados.forEach((atleta) => {
        const pontuacaoAtleta =
          atletasPontuados[atleta.atleta_id]?.pontuacao || 0;
        if (atleta.atleta_id === capitaoId) {
          totalPontos += pontuacaoAtleta * 1.5;
        } else {
          totalPontos += pontuacaoAtleta;
        }
      });

      rankingsParciais.push({
        ...time,
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

console.log('[RODADAS] ✅ Módulo carregado com importações dinâmicas - dependências circulares eliminadas');
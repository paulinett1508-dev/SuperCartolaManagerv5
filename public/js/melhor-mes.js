// MELHOR DO MÊS - SISTEMA MODULAR v1.0
// Orquestrador principal seguindo arquitetura padrão do sistema

console.log("[MELHOR-MES] Sistema modular carregando...");

// IMPORTAÇÕES DOS MÓDULOS DA SUBPASTA
let melhorMesOrquestrador = null;
let modulosCarregados = false;

// FUNÇÃO PARA CARREGAR MÓDULOS DINAMICAMENTE
async function carregarModulos() {
  if (modulosCarregados) return;

  try {
    const orquestradorModule = await import(
      "./melhor-mes/melhor-mes-orquestrador.js"
    );
    melhorMesOrquestrador = orquestradorModule.melhorMesOrquestrador;
    modulosCarregados = true;
    console.log("[MELHOR-MES] Módulos carregados com sucesso");
  } catch (error) {
    console.error("[MELHOR-MES] Erro ao carregar módulos:", error);
    throw error;
  }
}

// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO (COMPATIBILIDADE)
export async function inicializarMelhorMes() {
  console.log("[MELHOR-MES] Inicializando sistema...");

  try {
    await carregarModulos();

    if (!melhorMesOrquestrador) {
      throw new Error("Orquestrador não carregado");
    }

    await melhorMesOrquestrador.inicializar();
    console.log("[MELHOR-MES] Sistema inicializado com sucesso");
  } catch (error) {
    console.error("[MELHOR-MES] Erro na inicialização:", error);

    // Fallback para sistema original em caso de erro
    await inicializarMelhorMesFallback();
  }
}

// Expor globalmente para compatibilidade
window.inicializarMelhorMes = inicializarMelhorMes;

// FUNÇÃO COMPATÍVEL PARA OUTROS MÓDULOS
export async function getResultadosMelhorMes() {
  console.log("[MELHOR-MES] Obtendo resultados...");

  try {
    // ✅ VALIDAÇÃO: Verificar se ligaId está disponível
    const ligaId = window.ligaIdAtual || window.currentLigaId;

    if (!ligaId || ligaId === 'null') {
        console.warn("[MELHOR-MES] Liga ID não disponível, retornando vazio");
        return [];
    }

    await carregarModulos();

    if (melhorMesOrquestrador) {
      return await melhorMesOrquestrador.obterVencedores();
    }

    // Fallback
    return await getResultadosMelhorMesFallback();
  } catch (error) {
    console.error("[MELHOR-MES] Erro ao obter resultados:", error);
    return [];
  }
}

// ==============================
// SISTEMA FALLBACK (ORIGINAL)
// ==============================

// Imports para fallback
import { getRankingRodadaEspecifica } from "./rodadas.js";

const EDICOES_FALLBACK = [
  { nome: "Edição 01", inicio: 1, fim: 6 },
  { nome: "Edição 02", inicio: 7, fim: 10 },
  { nome: "Edição 03", inicio: 11, fim: 17 },
  { nome: "Edição 04", inicio: 18, fim: 22 },
  { nome: "Edição 05", inicio: 23, fim: 28 },
  { nome: "Edição 06", inicio: 29, fim: 32 },
  { nome: "Edição 07", inicio: 33, fim: 38 },
];

let exportsCarregados = false;
let criarBotaoExportacaoMelhorMes = null;
let exportarMelhorMesComoImagem = null;

// FUNÇÃO FALLBACK DE INICIALIZAÇÃO
async function inicializarMelhorMesFallback() {
  console.log("[MELHOR-MES] Inicializando sistema fallback...");

  try {
    await carregarExportsFallback();
    renderSelectEdicoesFallback();
    carregarRankingEdicaoFallback(0); // Edição 01 como padrão
  } catch (error) {
    console.error("[MELHOR-MES] Erro no fallback:", error);
    mostrarErroFallback("Sistema indisponível temporariamente");
  }
}

// CARREGAR EXPORTS FALLBACK
async function carregarExportsFallback() {
  if (exportsCarregados) return;

  try {
    const exportModule = await import("./exports/export-melhor-mes.js");
    criarBotaoExportacaoMelhorMes = exportModule.criarBotaoExportacaoMelhorMes;
    exportarMelhorMesComoImagem = exportModule.exportarMelhorMesComoImagem;
    exportsCarregados = true;
    console.log("[MELHOR-MES] Exports fallback carregados");
  } catch (error) {
    console.warn("[MELHOR-MES] Exports não disponíveis:", error);
  }
}

// SELECT FALLBACK
function renderSelectEdicoesFallback(containerId = "melhorMesSelect") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="max-width: 480px; margin: 0 auto 18px auto; text-align: center;">
      <h3 style="margin-bottom: 16px; color: #333;">Melhor do Mês - Sistema Fallback</h3>
      <select id="edicaoSelect" class="melhor-mes-select" style="font-size: 1.1em; padding: 8px 12px; border-radius: 6px;">
        ${EDICOES_FALLBACK.map(
          (ed, idx) =>
            `<option value="${idx}">${ed.nome} (Rod. ${ed.inicio} a ${ed.fim})</option>`,
        ).join("")}
      </select>
    </div>
  `;

  document.getElementById("edicaoSelect").addEventListener("change", (e) => {
    carregarRankingEdicaoFallback(Number(e.target.value));
  });
}

// CARREGAR RANKING FALLBACK
async function carregarRankingEdicaoFallback(idxEdicao) {
  const edicao = EDICOES_FALLBACK[idxEdicao];
  if (!edicao) return;

  const container = document.getElementById("melhorMesTabela");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #666;">
      <div>Carregando ${edicao.nome}...</div>
    </div>
  `;

  try {
    const ligaId = getLigaId();
    const resMercado = await fetch("/api/cartola/mercado/status");
    const { rodada_atual } = await resMercado.json();
    const ultimaRodadaCompleta = rodada_atual - 1;

    if (ultimaRodadaCompleta < edicao.inicio) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; background: #fff3cd; border-radius: 8px; color: #856404;">
          <h4>${edicao.nome}</h4>
          <p>Edição ainda não iniciou</p>
        </div>
      `;
      return;
    }

    const rodadaFinal = Math.min(edicao.fim, ultimaRodadaCompleta);
    const ranking = await calcularRankingEdicaoFallback(
      edicao.inicio,
      rodadaFinal,
      ligaId,
    );

    renderTabelaFallback(ranking, edicao);
  } catch (error) {
    console.error("[MELHOR-MES] Erro no fallback:", error);
    mostrarErroFallback("Erro ao carregar dados");
  }
}

// CALCULAR RANKING FALLBACK
async function calcularRankingEdicaoFallback(rodadaInicio, rodadaFim, ligaId) {
  const rankingsAgregados = [];
  const promises = [];

  for (let r = rodadaInicio; r <= rodadaFim; r++) {
    promises.push(
      getRankingRodadaEspecifica(ligaId, r)
        .then((ranking) => {
          if (ranking && Array.isArray(ranking)) {
            rankingsAgregados.push(
              ...ranking.map((time) => ({ ...time, rodada: r })),
            );
          }
        })
        .catch((e) => console.error(`[MELHOR-MES] Erro rodada ${r}:`, e)),
    );
  }

  await Promise.all(promises);

  const pontuacaoTotal = {};
  rankingsAgregados.forEach((time) => {
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

  return Object.values(pontuacaoTotal).sort((a, b) => b.pontos - a.pontos);
}

// RENDER TABELA FALLBACK
function renderTabelaFallback(ranking, edicao) {
  const container = document.getElementById("melhorMesTabela");
  if (!container) return;

  const ligaId = getLigaId();
  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";

  const tabelaBodyHtml = ranking
    .map((t, i) => {
      let premioHtml = "";
      if (isLigaCartoleirosSobral) {
        if (i === 0) {
          premioHtml = `<td style="text-align:center; color:#198754; font-weight:bold;">R$ 15,00</td>`;
        } else if (ranking.length >= 6 && i === ranking.length - 1) {
          premioHtml = `<td style="text-align:center; color:#dc3545; font-weight:bold;">-R$ 15,00</td>`;
        } else {
          premioHtml = `<td style="text-align:center;">-</td>`;
        }
      }

      return `
      <tr style="${i === 0 ? "background:#e3f2fd;font-weight:bold;" : i === ranking.length - 1 && isLigaCartoleirosSobral ? "background:#ffebee;" : ""}">
        <td style="text-align:center; padding:8px 2px;">${i === 0 ? "🏆" : i + 1}</td>
        <td style="text-align:left; padding:8px 4px;">${t.nome_cartola}</td>
        <td style="text-align:left; padding:8px 4px;">${t.nome_time}</td>
        <td style="text-align:center;">
          ${t.clube_id ? `<img src="/escudos/${t.clube_id}.png" alt="Escudo" style="width:24px; height:24px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>` : "—"}
        </td>
        <td style="text-align:center; padding:8px 2px;"><span style="font-weight:600;">${t.pontos.toFixed(2)}</span></td>
        ${isLigaCartoleirosSobral ? premioHtml : ""}
      </tr>
    `;
    })
    .join("");

  container.innerHTML = `
    <div style="max-width: 700px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h3>${edicao.nome} - Ranking (Fallback)</h3>
      </div>
      <table id="melhorMesTable" style="margin: 0 auto; min-width: 320px; max-width: 100%;">
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
        <tbody>${tabelaBodyHtml}</tbody>
      </table>
    </div>
  `;
}

// FUNÇÃO COMPATÍVEL FALLBACK
async function getResultadosMelhorMesFallback() {
  // Implementação básica para compatibilidade
  return [];
}

// MOSTRAR ERRO FALLBACK
function mostrarErroFallback(mensagem) {
  const container = document.getElementById("melhorMesSelect");
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #dc3545;">
        <h4>Erro no Melhor do Mês</h4>
        <p>${mensagem}</p>
      </div>
    `;
  }
}

// DEBUG
window.melhorMesDebug = {
  carregarModulos: () => carregarModulos(),
  orquestrador: () => melhorMesOrquestrador,
  recarregar: () => inicializarMelhorMes(),
};

console.log(
  "[MELHOR-MES] Sistema modular carregado com arquitetura refatorada",
);
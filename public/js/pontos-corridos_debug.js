import {
  gerarConfrontos,
  calcularResultadoConfronto,
  buscarStatusMercado,
  buscarTimesLiga,
  montarPontuacoesPorTime,
} from "./pontos-corridos-utils.js";
import {
  criarBotaoExportacaoRodada,
  exportarPontosCorridosRodadaComoImagem,
  exportarClassificacaoPontosCorridosComoImagem,
} from "./export.utils.js";

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");
const RODADA_INICIAL = 7;

let times = [];
let confrontos = [];

export async function inicializarPontosCorridos() {
  const container = document.getElementById("pontos-corridos");
  if (!container || !container.classList.contains("active")) {
    console.log("Container pontos-corridos não encontrado ou não ativo");
    return; // Corrigido: estava faltando fechar o if corretamente
  }
  console.log("Chamando inicializarPontosCorridos()");

  const status = await buscarStatusMercado();
  const rodada_atual = status.rodada_atual;

  times = await buscarTimesLiga(ligaId);
  console.log("Times da liga:", times);
  if (!times.length) {
    container.innerHTML =
      "<div class='erro'>Nenhum time encontrado na liga</div>";
    return;
  }

  confrontos = gerarConfrontos(times);
  console.log("Confrontos gerados:", confrontos);

  renderSelectRodada(rodada_atual);
  renderRodadaComTemplate(0, rodada_atual);
}

function renderSelectRodada(rodada_atual) {
  const container = document.getElementById("pontosCorridosSelect");
  if (!container) return;

  container.innerHTML = `
    <div style="max-width: 700px; margin: 0 auto 20px auto; text-align: center;">
      <select id="rodadaPontosCorridosSelect" class="rodada-select">
        ${confrontos
          .map(
            (_, idx) => `
          <option value="${idx}" ${
            idx + RODADA_INICIAL > rodada_atual ? "disabled" : ""
          }>
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
      renderRodadaComTemplate(Number(e.target.value), rodada_atual);
    });

  document
    .getElementById("btnClassificacaoPontosCorridos")
    .addEventListener("click", () => {
      renderClassificacao(rodada_atual);
    });
}

export async function renderRodadaComTemplate(idxRodada, rodada_atual) {
  console.log(
    `[renderRodadaComTemplate] Iniciando para rodada ${idxRodada + 1}`,
  );
  const container = document.getElementById("pontosCorridosRodada");
  if (!container) {
    console.error(
      "[renderRodadaComTemplate] Container #pontosCorridosRodada não encontrado!",
    );
    return;
  }
  console.log(
    "[renderRodadaComTemplate] Container #pontosCorridosRodada encontrado:",
    container,
  );

  const rodadaCartola = RODADA_INICIAL + idxRodada;
  const jogos = confrontos[idxRodada];
  console.log(
    `[renderRodadaComTemplate] Jogos para rodada ${idxRodada + 1}:`,
    jogos,
  );

  let pontuacoes = {};
  if (rodadaCartola < rodada_atual) {
    console.log(
      `[renderRodadaComTemplate] Buscando pontuações para rodada Cartola ${rodadaCartola}`,
    );
    pontuacoes = await montarPontuacoesPorTime(ligaId, rodadaCartola);
    console.log(`[renderRodadaComTemplate] Pontuações recebidas:`, pontuacoes);
  } else {
    console.log(
      `[renderRodadaComTemplate] Rodada Cartola ${rodadaCartola} ainda não finalizada, sem pontuações.`,
    );
  }

  // Busca o template HTML
  try {
    console.log("[renderRodadaComTemplate] Buscando template HTML...");
    const res = await fetch("/templates/pontos-corridos-tabela.html");
    console.log("[renderRodadaComTemplate] Resposta do fetch:", res);
    if (!res.ok) {
      console.error(
        "[renderRodadaComTemplate] Erro ao buscar template. Status:",
        res.status,
      );
      container.innerHTML = `<p>Erro ao carregar template (Status: ${res.status}).</p>`;
      return;
    }
    let templateHtml = await res.text();
    console.log(
      "[renderRodadaComTemplate] Template HTML recebido:",
      templateHtml,
    );

    // Substitui placeholders simples
    templateHtml = templateHtml
      .replace(/{{rodada_num}}/g, idxRodada + 1)
      .replace(/{{rodada_cartola}}/g, rodadaCartola);
    console.log(
      "[renderRodadaComTemplate] Template HTML após replace:",
      templateHtml,
    );

    // Cria um elemento temporário para manipular o DOM do template
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = templateHtml;
    console.log("[renderRodadaComTemplate] tempDiv após innerHTML:", tempDiv);

    // Monta as linhas da tabela
    const tbody = tempDiv.querySelector("#jogos-tbody");
    if (!tbody) {
      console.error(
        "[renderRodadaComTemplate] tbody #jogos-tbody não encontrado no template!",
      );
      container.innerHTML =
        "<p>Erro interno: tbody não encontrado no template.</p>";
      return;
    }
    console.log("[renderRodadaComTemplate] tbody encontrado:", tbody);

    const linhasHtml = jogos
      .map((jogo, i) => {
        const timeA = jogo.timeA;
        const timeB = jogo.timeB;
        const pontosA = pontuacoes[timeA._id] ?? pontuacoes[timeA.id] ?? null;
        const pontosB = pontuacoes[timeB._id] ?? pontuacoes[timeB.id] ?? null;
        const resultado =
          pontosA !== null && pontosB !== null
            ? `(${pontosA.toFixed(2)} x ${pontosB.toFixed(2)})`
            : "-";
        return `
          <tr>
            <td class=\"center\">${i + 1}</td>
            <td class=\"time-cell\">
              <img src=\"/escudos/${timeA.clube_id}.png\" alt=\"\" class=\"escudo\" onerror=\"this.style.display='none'\"/>
              <span>${timeA.nome_time || timeA.nome || "N/D"}</span>
            </td>
            <td>${timeA.nome_cartola || timeA.nome_cartoleiro || "N/D"}</td>
            <td class=\"center\">${pontosA !== null ? pontosA.toFixed(2) : "-"}</td>
            <td class=\"center\"><strong>X</strong></td>
            <td class=\"center\">${pontosB !== null ? pontosB.toFixed(2) : "-"}</td>
            <td class=\"time-cell\">
              <img src=\"/escudos/${timeB.clube_id}.png\" alt=\"\" class=\"escudo\" onerror=\"this.style.display='none'\"/>
              <span>${timeB.nome_time || timeB.nome || "N/D"}</span>
            </td>
            <td>${timeB.nome_cartola || timeB.nome_cartoleiro || "N/D"}</td>
            <td class=\"center\">${resultado}</td>
          </tr>
        `;
      })
      .join("");
    console.log(
      "[renderRodadaComTemplate] HTML das linhas gerado:",
      linhasHtml,
    );

    tbody.innerHTML = linhasHtml;
    console.log("[renderRodadaComTemplate] tbody após innerHTML:", tbody);

    // Atualiza o container com o conteúdo do template preenchido
    container.innerHTML = ""; // Limpa o container antes de adicionar
    console.log("[renderRodadaComTemplate] Container limpo.");

    const elementToAppend = tempDiv.firstElementChild;
    console.log(
      "[renderRodadaComTemplate] Elemento para append:",
      elementToAppend,
    );

    if (elementToAppend) {
      container.appendChild(elementToAppend);
      console.log(
        "[renderRodadaComTemplate] Elemento adicionado ao container.",
      );
    } else {
      console.error(
        "[renderRodadaComTemplate] Nenhum elemento filho encontrado em tempDiv para adicionar ao container!",
      );
      // Tenta adicionar todo o conteúdo do tempDiv como fallback
      while (tempDiv.firstChild) {
        container.appendChild(tempDiv.firstChild);
      }
      console.warn(
        "[renderRodadaComTemplate] Fallback: Adicionado todo o conteúdo de tempDiv.",
      );
    }

    // Normaliza os dados para exportação
    const jogosNormalizados = jogos.map((jogo) => ({
      timeA: {
        nome_time: jogo.timeA.nome_time || jogo.timeA.nome || "N/D",
        nome_cartola:
          jogo.timeA.nome_cartola || jogo.timeA.nome_cartoleiro || "N/D",
        clube_id: jogo.timeA.clube_id || null,
        pontos: pontuacoes[jogo.timeA._id] ?? pontuacoes[jogo.timeA.id] ?? null,
      },
      timeB: {
        nome_time: jogo.timeB.nome_time || jogo.timeB.nome || "N/D",
        nome_cartola:
          jogo.timeB.nome_cartola || jogo.timeB.nome_cartoleiro || "N/D",
        clube_id: jogo.timeB.clube_id || null,
        pontos: pontuacoes[jogo.timeB._id] ?? pontuacoes[jogo.timeB.id] ?? null,
      },
    }));

    criarBotaoExportacaoRodada({
      containerId: "exportPontosCorridosBtnContainer", // Certifique-se que este ID existe no HTML
      rodada: rodadaCartola,
      rankings: jogosNormalizados,
      customExport: () =>
        exportarPontosCorridosRodadaComoImagem(
          jogosNormalizados,
          idxRodada + 1,
          rodadaCartola,
          times,
        ),
    });
    console.log("[renderRodadaComTemplate] Renderização da rodada concluída.");
  } catch (error) {
    console.error(
      "[renderRodadaComTemplate] Erro durante a renderização:",
      error,
    );
    container.innerHTML = `<p>Ocorreu um erro ao renderizar a rodada: ${error.message}</p>`;
  }
}

async function renderClassificacao(rodada_atual) {
  const container = document.getElementById("pontosCorridosRodada");
  if (!container) return;

  const totalRodadas = Math.min(
    confrontos.length,
    rodada_atual - RODADA_INICIAL,
  );
  if (totalRodadas <= 0) {
    container.innerHTML = `<div style="color:#e67e22; text-align:center; margin:20px 0;">Nenhuma rodada encerrada para classificação.</div>`;
    return;
  }

  const tabela = {};
  times.forEach((t) => {
    tabela[t._id] = {
      time: t,
      pontos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldo: 0,
      jogos: 0,
    };
  });

  for (let idxRodada = 0; idxRodada < totalRodadas; idxRodada++) {
    const rodadaCartola = RODADA_INICIAL + idxRodada;
    const pontuacoes = await montarPontuacoesPorTime(ligaId, rodadaCartola);
    const jogos = confrontos[idxRodada];

    jogos.forEach((jogo) => {
      const idA = jogo.timeA._id;
      const idB = jogo.timeB._id;
      const pontosA = pontuacoes[idA];
      const pontosB = pontuacoes[idB];
      if (pontosA == null || pontosB == null) return;

      const res = calcularResultadoConfronto(pontosA, pontosB);

      tabela[idA].pontos += res.pontosA;
      tabela[idB].pontos += res.pontosB;
      tabela[idA].golsPro += pontosA;
      tabela[idA].golsContra += pontosB;
      tabela[idB].golsPro += pontosB;
      tabela[idB].golsContra += pontosA;
      tabela[idA].saldo += pontosA - pontosB;
      tabela[idB].saldo += pontosB - pontosA;
      tabela[idA].jogos += 1;
      tabela[idB].jogos += 1;

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

  const classificacao = Object.values(tabela).sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;
    return a.time.nome_time.localeCompare(b.time.nome_time);
  });

  container.innerHTML = `
  <div style="max-width:800px; margin:0 auto;">
    <h3 style="text-align:center; font-size:1.2rem; margin-bottom:10px;">
      Classificação da Liga Pontos Corridos<br>
      <span style="font-size:1rem; color:#888;">Após ${totalRodadas} rodadas</span>
    </h3>
    <div id="exportClassificacaoPontosCorridosBtnContainer" style="text-align:right; margin-bottom:8px;"></div>
    <button id="btnVoltarPontosCorridos" class="btn-voltar" style="margin-bottom:12px;">⬅ Voltar</button>
    <table class="ranking-table" style="width:100%; font-size:14px;">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Time</th>
            <th>Cartoleiro</th>
            <th>J</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
            <th>GP</th>
            <th>GC</th>
            <th>SG</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          ${classificacao
            .map(
              (item, idx) => `
            <tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td>
                <img src="/escudos/${item.time.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; border:1px solid #eee; background:#fff; margin-right:4px;" onerror="this.style.display='none'"/>
                ${item.time.nome_time}
              </td>
              <td>${item.time.nome_cartola}</td>
              <td style="text-align:center;">${item.jogos}</td>
              <td style="text-align:center;">${item.vitorias}</td>
              <td style="text-align:center;">${item.empates}</td>
              <td style="text-align:center;">${item.derrotas}</td>
              <td style="text-align:center;">${item.golsPro.toFixed(2)}</td>
              <td style="text-align:center;">${item.golsContra.toFixed(2)}</td>
              <td style="text-align:center;">${item.saldo.toFixed(2)}</td>
              <td style="text-align:center; font-weight:600;">${item.pontos}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  criarBotaoExportacaoRodada({
    containerId: "exportClassificacaoPontosCorridosBtnContainer",
    rodada: null,
    rankings: classificacao,
    customExport: () =>
      exportarClassificacaoPontosCorridosComoImagem(classificacao, times),
  });

  // Botão voltar para rodada
  document
    .getElementById("rodadaPontosCorridosSelect")
    .addEventListener("change", (e) => {
      renderRodadaComTemplate(Number(e.target.value), rodada_atual);
    });
}

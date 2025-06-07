import { criarBotaoExportacaoMataMata } from "./export-mata-mata.js";
// **NOVO:** Importa a função para buscar ranking específico de rodadas.js
import { getRankingRodadaEspecifica } from "./rodadas.js";

// Definição das edições do Mata-Mata
const edicoes = [
  {
    id: 1,
    nome: "1ª Edição",
    rodadaInicial: 2,
    rodadaFinal: 7,
    rodadaDefinicao: 2,
    ativo: true,
  },
  {
    id: 2,
    nome: "2ª Edição",
    rodadaInicial: 9,
    rodadaFinal: 14,
    rodadaDefinicao: 9,
    ativo: true,
  },
  {
    id: 3,
    nome: "3ª Edição",
    rodadaInicial: 16,
    rodadaFinal: 21,
    rodadaDefinicao: 16,
    ativo: false,
  },
  {
    id: 4,
    nome: "4ª Edição",
    rodadaInicial: 23,
    rodadaFinal: 28,
    rodadaDefinicao: 23,
    ativo: false,
  },
  {
    id: 5,
    nome: "5ª Edição",
    rodadaInicial: 30,
    rodadaFinal: 35,
    rodadaDefinicao: 30,
    ativo: false,
  },
];

// Variável global para armazenar a edição atual
let edicaoAtual = null;

// Função para determinar o texto da rodada de pontos conforme a fase
function getRodadaPontosText(faseLabel, edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  if (!edicaoSelecionada) return "";

  const rodadaBase = edicaoSelecionada.rodadaInicial;

  switch (faseLabel.toUpperCase()) {
    case "1ª FASE":
      return `Pontuação da Rodada ${rodadaBase + 1}`;
    case "OITAVAS":
      return `Pontuação da Rodada ${rodadaBase + 2}`;
    case "QUARTAS":
      return `Pontuação da Rodada ${rodadaBase + 3}`;
    case "SEMIS":
      return `Pontuação da Rodada ${rodadaBase + 4}`;
    case "FINAL":
      return `Pontuação da Rodada ${rodadaBase + 5}`;
    default:
      return "";
  }
}

// Função para obter o número da rodada de pontos conforme a fase
function getRodadaPontosNum(fase, edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  if (!edicaoSelecionada) return 0;

  const rodadaBase = edicaoSelecionada.rodadaInicial;

  switch (fase.toLowerCase()) {
    case "primeira":
      return rodadaBase + 1;
    case "oitavas":
      return rodadaBase + 2;
    case "quartas":
      return rodadaBase + 3;
    case "semis":
      return rodadaBase + 4;
    case "final":
      return rodadaBase + 5;
    default:
      return 0;
  }
}

function getEdicaoMataMata(edicao) {
  const edicaoSelecionada = edicoes.find((e) => e.id === edicao);
  return edicaoSelecionada
    ? `${edicaoSelecionada.nome} do Mata-Mata`
    : "Mata-Mata";
}

export function carregarMataMata() {
  const container = document.getElementById("mata-mata");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  // Verificar status do mercado para determinar quais edições estão ativas
  fetch("/api/cartola/mercado/status")
    .then((res) => (res.ok ? res.json() : { rodada_atual: 1 }))
    .then((data) => {
      const rodadaAtual = data.rodada_atual || 1;

      // Atualizar status ativo das edições com base na rodada atual
      edicoes.forEach((edicao) => {
        edicao.ativo = rodadaAtual >= edicao.rodadaDefinicao;
      });

      // Renderizar o seletor de edições e os botões de fase
      renderizarInterface(container, ligaId);
    })
    .catch((err) => {
      console.error("Erro ao verificar status do mercado:", err);
      // Em caso de erro, renderizar com configuração padrão
      renderizarInterface(container, ligaId);
    });
}

function renderizarInterface(container, ligaId) {
  // Criar seletor de edições
  let edicoesHtml = `
    <div class="edicao-selector" style="margin-bottom:16px; text-align:center;">
      <label for="edicao-select" style="font-weight:bold; margin-right:8px;">Edição:</label>
      <select id="edicao-select" style="padding:6px 12px; border-radius:4px; border:1px solid #ccc;">
        <option value="" selected disabled>Selecione uma edição</option>
        ${edicoes
          .map(
            (edicao) => `
          <option value="${edicao.id}" ${!edicao.ativo ? "disabled" : ""}>
            ${edicao.nome} (Rodadas ${edicao.rodadaInicial}-${edicao.rodadaFinal})
          </option>
        `,
          )
          .join("")}
      </select>
    </div>
  `;

  // Criar navegação de fases (inicialmente oculta)
  let fasesHtml = `
    <div id="fase-nav-container" style="display:none;">
      <div class="fase-nav" style="margin-bottom:16px;">
        <button class="fase-btn active" data-fase="primeira">1ª FASE</button>
        <button class="fase-btn" data-fase="oitavas">OITAVAS</button>
        <button class="fase-btn" data-fase="quartas">QUARTAS</button>
        <button class="fase-btn" data-fase="semis">SEMIS</button>
        <button class="fase-btn" data-fase="final">FINAL</button>
      </div>
    </div>
    <div id="mataMataContent">
      <div class="instrucao-inicial" style="text-align:center; padding:40px 20px; background:#f8f9fa; border-radius:8px; margin:20px 0;">
        <p style="font-size:16px; color:#666;">Por favor, selecione uma edição do Mata-Mata para visualizar os confrontos.</p>
      </div>
    </div>
  `;

  container.innerHTML = edicoesHtml + fasesHtml;

  // Adicionar event listener para o seletor de edições
  const edicaoSelect = document.getElementById("edicao-select");
  if (edicaoSelect) {
    edicaoSelect.addEventListener("change", function () {
      edicaoAtual = parseInt(this.value);

      // Mostrar a navegação de fases
      const faseNavContainer = document.getElementById("fase-nav-container");
      if (faseNavContainer) {
        faseNavContainer.style.display = "block";
      }

      // Recarregar a fase atual com a nova edição
      const faseAtiva = container.querySelector(".fase-btn.active");
      if (faseAtiva) {
        const fase = faseAtiva.getAttribute("data-fase");
        carregarFase(fase, ligaId);
      } else {
        // Se não houver fase ativa, carregar a primeira fase
        carregarFase("primeira", ligaId);
        // Marcar o botão da primeira fase como ativo
        const primeiraFaseBtn = container.querySelector(
          '.fase-btn[data-fase="primeira"]',
        );
        if (primeiraFaseBtn) {
          primeiraFaseBtn.classList.add("active");
        }
      }
    });
  }

  // Adicionar event listeners para os botões de fase
  container.querySelectorAll(".fase-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      // Verificar se uma edição foi selecionada
      if (!edicaoAtual) {
        alert("Por favor, selecione uma edição do Mata-Mata primeiro.");
        return;
      }

      container
        .querySelectorAll(".fase-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      const fase = this.getAttribute("data-fase");
      carregarFase(fase, ligaId);
    });
  });
}

function gerarTextoConfronto(faseLabel) {
  const faseUpper = faseLabel.toUpperCase();
  if (faseUpper === "1ª FASE") return "Confronto da 1ª FASE";
  if (faseUpper === "OITAVAS") return "Confronto das OITAVAS";
  if (faseUpper === "QUARTAS") return "Confronto das QUARTAS";
  if (faseUpper === "SEMIS") return "Confronto das SEMIS";
  if (faseUpper === "FINAL") return "Confronto da FINAL";
  return `Confronto da ${faseLabel}`;
}

// Modificado para aceitar flag isPending
async function renderTabelaMataMata(
  confrontos,
  containerId,
  faseLabel,
  isPending = false,
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Função interna para formatar pontos (mostra "?" se pendente)
  const formatPoints = (points) => {
    if (isPending) return "?";
    return typeof points === "number"
      ? points.toFixed(2).replace(".", ",")
      : "-";
  };

  container.innerHTML = `
    <div style="padding: 12px 0 8px 0; text-align:center;">
      <div style="font-size: 20px; font-weight: bold; color: #1a237e;">SuperCartola 2025</div>
      <div style="font-size: 15px; font-weight: 600; color: #3949ab; margin-top: 2px;">${getEdicaoMataMata(edicaoAtual)}</div>
      <div style="
        font-size: 16px;
        color: #fff;
        background: linear-gradient(90deg, #3949ab 60%, #1a237e 100%);
        display: inline-block;
        padding: 4px 22px;
        border-radius: 16px;
        font-weight: bold;
        margin: 16px 0 10px 0;
        letter-spacing: 1px;
        box-shadow: 0 2px 8px #0001;
      ">
        ${gerarTextoConfronto(faseLabel)}
      </div>
      <div style="font-size: 13px; color: #3949ab; margin-bottom: 10px;">
        ${getRodadaPontosText(faseLabel, edicaoAtual)}
      </div>
    </div>
    <div style="overflow-x:auto;">
      <table style="
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        border-collapse: separate;
        border-spacing: 0;
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px #0001;
        font-size: 13px;
      ">
        <thead>
          <tr style="background: #e3e6f3;">
            <th style="padding: 7px 2px;">Jogo</th>
            <th style="padding: 7px 2px;">Time 1</th>
            <th style="padding: 7px 2px; min-width: 54px;">Pts</th>
            <th style="padding: 7px 2px;">X</th>
            <th style="padding: 7px 2px; min-width: 54px;">Pts</th>
            <th style="padding: 7px 2px;">Time 2</th>
          </tr>
        </thead>
        <tbody>
          ${confrontos
            .map((c) => {
              // **AJUSTE:** Usa c.timeA.valor e c.timeB.valor que agora são definidos em carregarFase
              const valorA = c.timeA.valor || 0;
              const valorB = c.timeB.valor || 0;

              return `
                <tr style="border-bottom:1px solid #f0f0f0;">
                  <td style="font-weight:600; color:#3949ab; padding:6px 2px;">${c.jogo}</td>
                  <td style="text-align:left; padding:6px 2px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <img src="/escudos/${c.timeA.clube_id}.png" style="width:20px; height:20px; border-radius:50%; flex-shrink:0;" onerror="this.style.display=\'none\'">
                      <div style="display:flex; flex-direction:column; align-items:flex-start;">
                        <span style="font-weight:500; font-size:13px; color:#222;">${c.timeA.nome_time}</span>
                        <span style="font-size:11px; color:#888;">${c.timeA.nome_cartoleiro || c.timeA.nome_cartola || "—"}</span>
                      </div>
                    </div>
                  </td>
                  <td style="font-weight:600; min-width:54px; color:${valorA > 0 ? "#27ae60" : valorA < 0 ? "#c0392b" : "#222"}; padding:6px 2px;">
                    <div>${formatPoints(c.timeA.pontos)}</div>
                    <div style="font-size:8px; color:${valorA === 10 ? "#1976d2" : valorA === -10 ? "#c0392b" : "transparent"}; font-weight:400;">
                      ${valorA === 10 ? "R$ 10,00" : valorA === -10 ? "-R$ 10,00" : ""}
                    </div>
                  </td>
                  <td style="font-weight:700; color:#3949ab; padding:6px 2px;">X</td>
                  <td style="font-weight:600; min-width:54px; color:${valorB > 0 ? "#27ae60" : valorB < 0 ? "#c0392b" : "#222"}; padding:6px 2px;">
                    <div>${formatPoints(c.timeB.pontos)}</div>
                    <div style="font-size:8px; color:${valorB === 10 ? "#1976d2" : valorB === -10 ? "#c0392b" : "transparent"}; font-weight:400;">
                      ${valorB === 10 ? "R$ 10,00" : valorB === -10 ? "-R$ 10,00" : ""}
                    </div>
                  </td>
                  <td style="text-align:left; padding:6px 2px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <img src="/escudos/${c.timeB.clube_id}.png" style="width:20px; height:20px; border-radius:50%; flex-shrink:0;" onerror="this.style.display=\'none\'">
                      <div style="display:flex; flex-direction:column; align-items:flex-start;">
                        <span style="font-weight:500; font-size:13px; color:#222;">${c.timeB.nome_time}</span>
                        <span style="font-size:11px; color:#888;">${c.timeB.nome_cartoleiro || c.timeB.nome_cartola || "—"}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Busca pontos de uma rodada específica e retorna um mapa { timeId: pontos }
async function getPontosDaRodada(ligaId, rodada) {
  try {
    const rankingDaRodada = await getRankingRodadaEspecifica(ligaId, rodada);
    const mapa = {};
    if (Array.isArray(rankingDaRodada)) {
      rankingDaRodada.forEach((t) => {
        if (t.timeId && typeof t.pontos === "number") {
          mapa[t.timeId] = t.pontos;
        }
      });
    }
    return mapa;
  } catch (err) {
    console.error(`Falha em getPontosDaRodada(${rodada}):`, err);
    return {};
  }
}

// Monta confrontos da 1ª fase com base no ranking da rodada de definição
function montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual) {
  const confrontos = [];
  for (let i = 0; i < 16; i++) {
    const timeA = rankingBase[i];
    const timeB = rankingBase[31 - i];

    const pontosA = pontosRodadaAtual[timeA.timeId] ?? null;
    const pontosB = pontosRodadaAtual[timeB.timeId] ?? null;

    confrontos.push({
      jogo: i + 1,
      timeA: {
        ...timeA,
        pontos: pontosA,
        nome_cartoleiro: timeA.nome_cartoleiro || timeA.nome_cartola,
        rankR2: i + 1,
      },
      timeB: {
        ...timeB,
        pontos: pontosB,
        nome_cartoleiro: timeB.nome_cartoleiro || timeB.nome_cartola,
        rankR2: 32 - i,
      },
    });
  }
  return confrontos;
}

// Monta confrontos das fases seguintes
function montarConfrontosFase(
  vencedoresAnteriores,
  pontosRodadaAtual,
  numJogos,
) {
  const confrontos = [];
  vencedoresAnteriores.sort((a, b) => a.jogoAnterior - b.jogoAnterior);

  for (let i = 0; i < numJogos; i++) {
    const timeA = vencedoresAnteriores[i * 2];
    const timeB = vencedoresAnteriores[i * 2 + 1];

    const pontosA = pontosRodadaAtual[timeA.timeId] ?? null;
    const pontosB = pontosRodadaAtual[timeB.timeId] ?? null;

    confrontos.push({
      jogo: i + 1,
      jogoAnteriorA: timeA.jogoAnterior || "?",
      jogoAnteriorB: timeB.jogoAnterior || "?",
      timeA: {
        ...timeA,
        pontos: pontosA,
        nome_cartoleiro: timeA.nome_cartoleiro || timeA.nome_cartola,
      },
      timeB: {
        ...timeB,
        pontos: pontosB,
        nome_cartoleiro: timeB.nome_cartoleiro || timeB.nome_cartola,
      },
    });
  }
  return confrontos;
}

// Extrai vencedores, usando rank da rodada de definição como critério de desempate
// **AJUSTE:** Retorna os vencedores E modifica o array de confrontos original
// adicionando a propriedade `vencedorDeterminado` ("A" ou "B") a cada confronto.
function extrairVencedores(confrontos) {
  const vencedores = [];
  confrontos.forEach((c) => {
    let vencedor = null;
    let vencedorDeterminado = null; // "A" ou "B"

    const pontosAValidos = typeof c.timeA.pontos === "number";
    const pontosBValidos = typeof c.timeB.pontos === "number";

    if (pontosAValidos && pontosBValidos) {
      if (c.timeA.pontos > c.timeB.pontos) {
        vencedor = c.timeA;
        vencedorDeterminado = "A";
      } else if (c.timeB.pontos > c.timeA.pontos) {
        vencedor = c.timeB;
        vencedorDeterminado = "B";
      } else {
        console.warn(
          `Empate no jogo ${c.jogo} (${c.timeA.pontos} x ${c.timeB.pontos}). Desempatando pelo rank da rodada de definição.`,
        );
        if (c.timeA.rankR2 < c.timeB.rankR2) {
          vencedor = c.timeA;
          vencedorDeterminado = "A";
          console.log(
            ` -> Time A (${c.timeA.rankR2}) venceu Time B (${c.timeB.rankR2}) no desempate.`,
          );
        } else if (c.timeB.rankR2 < c.timeA.rankR2) {
          vencedor = c.timeB;
          vencedorDeterminado = "B";
          console.log(
            ` -> Time B (${c.timeB.rankR2}) venceu Time A (${c.timeA.rankR2}) no desempate.`,
          );
        } else {
          console.error(
            `Empate total no jogo ${c.jogo} (pontos e rank). Assumindo Time A.`,
          );
          vencedor = c.timeA;
          vencedorDeterminado = "A";
        }
      }
    } else {
      console.error(
        `Pontos inválidos no jogo ${c.jogo} (A: ${c.timeA.pontos}, B: ${c.timeB.pontos}). Tentando desempatar pelo rank da rodada de definição.`,
      );
      if (c.timeA.rankR2 < c.timeB.rankR2) {
        vencedor = c.timeA;
        vencedorDeterminado = "A";
      } else if (c.timeB.rankR2 < c.timeA.rankR2) {
        vencedor = c.timeB;
        vencedorDeterminado = "B";
      } else {
        console.error(
          `Empate total no jogo ${c.jogo} (pontos e rank). Assumindo Time A.`,
        );
        vencedor = c.timeA;
        vencedorDeterminado = "A";
      }
    }

    // Adiciona o vencedor determinado ao confronto original
    c.vencedorDeterminado = vencedorDeterminado;

    // Adiciona o vencedor à lista de vencedores
    if (vencedor) {
      vencedor.jogoAnterior = c.jogo;
      vencedores.push(vencedor);
    } else {
      console.error(`Erro ao determinar vencedor do jogo ${c.jogo}`);
    }
  });
  return vencedores;
}

// Função para carregar uma fase específica do Mata-Mata
async function carregarFase(fase, ligaId) {
  const contentId = "mataMataContent";
  document.getElementById(contentId).innerHTML = `
    <div style="text-align:center; padding:20px;">
      <div class="loading-spinner" style="margin:0 auto 20px auto; width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #3949ab; border-radius:50%; animation:spin 1s linear infinite;"></div>
      <p>Carregando confrontos...</p>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </div>
  `;

  try {
    // Verificar se uma edição foi selecionada
    if (!edicaoAtual) {
      document.getElementById(contentId).innerHTML = `
        <div class="instrucao-inicial" style="text-align:center; padding:40px 20px; background:#f8f9fa; border-radius:8px; margin:20px 0;">
          <p style="font-size:16px; color:#666;">Por favor, selecione uma edição do Mata-Mata para visualizar os confrontos.</p>
        </div>
      `;
      return;
    }

    // 1. Obter status do mercado
    let rodada_atual = 1;
    try {
      const resMercado = await fetch("/api/cartola/mercado/status");
      if (resMercado.ok) {
        const data = await resMercado.json();
        rodada_atual = data.rodada_atual;
      }
    } catch (err) {
      console.warn("Não foi possível buscar status do mercado:", err);
    }

    // 2. Obter a edição selecionada e o ranking base
    const edicaoSelecionada = edicoes.find((e) => e.id === edicaoAtual);
    if (!edicaoSelecionada) {
      throw new Error(`Edição ${edicaoAtual} não encontrada.`);
    }

    // Obter a rodada de definição da edição selecionada
    const rodadaDefinicao = edicaoSelecionada.rodadaDefinicao;

    console.log(
      `[mata-mata.js] Buscando ranking base da Rodada ${rodadaDefinicao}...`,
    );
    const rankingBase = await getRankingRodadaEspecifica(
      ligaId,
      rodadaDefinicao,
    );
    console.log(
      `[mata-mata.js] Ranking base da Rodada ${rodadaDefinicao} recebido com ${rankingBase.length} times.`,
    );
    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      throw new Error(
        `Ranking base da Rodada ${rodadaDefinicao} inválido ou insuficiente (${rankingBase.length}/32 times).`,
      );
    }

    // 3. Determinar informações da fase atual
    const faseInfo = {
      primeira: {
        label: "1ª FASE",
        pontosRodada: edicaoSelecionada.rodadaInicial + 1,
        numJogos: 16,
        prevFaseRodada: null,
      },
      oitavas: {
        label: "OITAVAS",
        pontosRodada: edicaoSelecionada.rodadaInicial + 2,
        numJogos: 8,
        prevFaseRodada: edicaoSelecionada.rodadaInicial + 1,
      },
      quartas: {
        label: "QUARTAS",
        pontosRodada: edicaoSelecionada.rodadaInicial + 3,
        numJogos: 4,
        prevFaseRodada: edicaoSelecionada.rodadaInicial + 2,
      },
      semis: {
        label: "SEMIS",
        pontosRodada: edicaoSelecionada.rodadaInicial + 4,
        numJogos: 2,
        prevFaseRodada: edicaoSelecionada.rodadaInicial + 3,
      },
      final: {
        label: "FINAL",
        pontosRodada: edicaoSelecionada.rodadaInicial + 5,
        numJogos: 1,
        prevFaseRodada: edicaoSelecionada.rodadaInicial + 4,
      },
    };
    const currentFaseInfo = faseInfo[fase.toLowerCase()];
    if (!currentFaseInfo) throw new Error(`Fase desconhecida: ${fase}`);
    const {
      label: faseLabel,
      pontosRodada: rodadaPontosNum,
      numJogos,
      prevFaseRodada,
    } = currentFaseInfo;

    // 4. Calcular vencedores das fases anteriores, se necessário
    let timesParaConfronto = rankingBase;
    let confrontosAnterioresCalculados = null;

    if (prevFaseRodada) {
      let vencedoresAnteriores = rankingBase;

      // Iniciar da rodada inicial + 1 (primeira fase)
      const rodadaInicial = edicaoSelecionada.rodadaInicial;

      for (let r = rodadaInicial + 1; r <= prevFaseRodada; r++) {
        const pontosDaRodadaAnterior = await getPontosDaRodada(ligaId, r);

        // Calcular o número de jogos para a fase atual
        const jogosFaseAnterior =
          r === rodadaInicial + 1
            ? 16 // Primeira fase sempre tem 16 jogos
            : 32 / Math.pow(2, r - rodadaInicial);

        const confrontosAnteriores =
          r === rodadaInicial + 1
            ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAnterior)
            : montarConfrontosFase(
                vencedoresAnteriores,
                pontosDaRodadaAnterior,
                jogosFaseAnterior,
              );

        // Agora extrairVencedores modifica confrontosAnteriores E retorna os vencedores
        vencedoresAnteriores = extrairVencedores(confrontosAnteriores);

        if (r === prevFaseRodada) {
          confrontosAnterioresCalculados = confrontosAnteriores;
        }

        const expectedWinners = 32 / Math.pow(2, r - rodadaInicial);
        if (vencedoresAnteriores.length !== expectedWinners) {
          console.warn(
            `Número inesperado de vencedores (${vencedoresAnteriores.length}/${expectedWinners}) após rodada ${r}.`,
          );
        }
      }
      timesParaConfronto = vencedoresAnteriores;
    }

    // 5. Verificar se a rodada atual já ocorreu
    let isPending = rodada_atual < rodadaPontosNum;
    if (isPending) {
      console.log(
        `Rodada ${rodadaPontosNum} (para fase ${faseLabel}) ainda não ocorreu (Rodada Atual: ${rodada_atual})`,
      );
    }

    // 6. Obter pontos da rodada atual (ou mapa vazio se pendente)
    const pontosRodadaAtual = isPending
      ? {}
      : await getPontosDaRodada(ligaId, rodadaPontosNum);

    // 7. Montar confrontos da fase atual
    const confrontos =
      fase === "primeira"
        ? montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual)
        : montarConfrontosFase(timesParaConfronto, pontosRodadaAtual, numJogos);

    // 8. **AJUSTE:** Determinar vencedor e adicionar valores (R$) ANTES de renderizar/exportar
    confrontos.forEach((c) => {
      let vencedorDeterminado = null;
      if (!isPending) {
        const pontosAValidos = typeof c.timeA.pontos === "number";
        const pontosBValidos = typeof c.timeB.pontos === "number";
        if (pontosAValidos && pontosBValidos) {
          if (c.timeA.pontos > c.timeB.pontos) vencedorDeterminado = "A";
          else if (c.timeB.pontos > c.timeA.pontos) vencedorDeterminado = "B";
          else {
            // Empate
            if (c.timeA.rankR2 < c.timeB.rankR2) vencedorDeterminado = "A";
            else if (c.timeB.rankR2 < c.timeA.rankR2) vencedorDeterminado = "B";
            else vencedorDeterminado = "A"; // Empate total, assume A
          }
        } else {
          // Pontos inválidos, desempata pelo rank R2
          if (c.timeA.rankR2 < c.timeB.rankR2) vencedorDeterminado = "A";
          else if (c.timeB.rankR2 < c.timeA.rankR2) vencedorDeterminado = "B";
          else vencedorDeterminado = "A";
        }
      }
      // Define os valores para exportação e renderização
      c.timeA.valor = isPending
        ? 0
        : vencedorDeterminado === "A"
          ? 10
          : vencedorDeterminado === "B"
            ? -10
            : 0;
      c.timeB.valor = isPending
        ? 0
        : vencedorDeterminado === "B"
          ? 10
          : vencedorDeterminado === "A"
            ? -10
            : 0;
      c.vencedorDeterminado = vencedorDeterminado; // Guarda para renderização
    });

    // 9. Renderizar a tabela
    await renderTabelaMataMata(confrontos, contentId, faseLabel, isPending);

    // 10. Adicionar botão de exportação (passando os confrontos com os valores calculados)
    criarBotaoExportacaoMataMata({
      containerId: contentId,
      fase: faseLabel,
      confrontos: confrontos, // Agora inclui .valor em timeA e timeB
      isPending: isPending,
      rodadaPontos: getRodadaPontosText(faseLabel, edicaoAtual),
      edicao: getEdicaoMataMata(edicaoAtual),
    });

    // Adiciona mensagem se a rodada estiver pendente
    if (isPending) {
      const msgContainer = document.createElement("div");
      msgContainer.style.textAlign = "center";
      msgContainer.style.marginTop = "10px";
      msgContainer.style.color = "#e67e22";
      msgContainer.style.fontSize = "13px";
      msgContainer.textContent = `A Rodada ${rodadaPontosNum} ainda não ocorreu. Os resultados serão definidos após o fechamento do mercado.`;
      document.getElementById(contentId).appendChild(msgContainer);
    }
  } catch (err) {
    console.error(`Erro ao carregar fase ${fase}:`, err);
    document.getElementById(contentId).innerHTML =
      `<div style="color: red; text-align:center; padding:20px;">Erro ao carregar confrontos: ${err.message}</div>`;
  }
}

// Nova função para retornar os resultados financeiros do Mata-Mata para o Fluxo Financeiro
// Retorna: Array de objetos { timeId: string, fase: string, rodadaPontos: number, valor: number (+10 ou -10) }
export async function getResultadosMataMata() {
  console.log("[getResultadosMataMata] Iniciando cálculo financeiro...");
  const ligaId = getLigaId(); // Assume que getLigaId() está disponível
  if (!ligaId) {
    console.error("[getResultadosMataMata] ID da Liga não encontrado.");
    return [];
  }

  // Verificar status do mercado para determinar quais edições estão ativas
  let rodada_atual = 1;
  try {
    const resMercado = await fetch("/api/cartola/mercado/status");
    if (resMercado.ok) {
      rodada_atual = (await resMercado.json()).rodada_atual;
    }
  } catch (err) {
    console.warn(
      "[getResultadosMataMata] Não foi possível buscar status do mercado.",
    );
  }

  // Determinar a edição atual (a mais recente ativa)
  const edicoesAtivas = edicoes.filter(
    (e) => rodada_atual >= e.rodadaDefinicao,
  );
  if (edicoesAtivas.length === 0) {
    console.log("[getResultadosMataMata] Nenhuma edição ativa encontrada.");
    return [];
  }

  // Usar a edição mais recente ativa para cálculos financeiros
  const edicaoAtiva = edicoesAtivas[edicoesAtivas.length - 1];
  console.log(
    `[getResultadosMataMata] Usando edição ${edicaoAtiva.id} (${edicaoAtiva.nome}) para cálculos financeiros.`,
  );

  const resultadosFinanceiros = [];
  const fases = ["primeira", "oitavas", "quartas", "semis", "final"];

  try {
    // Obter o ranking base da rodada de definição
    const rodadaDefinicao = edicaoAtiva.rodadaDefinicao;
    const rankingBase = await getRankingRodadaEspecifica(
      ligaId,
      rodadaDefinicao,
    );
    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      throw new Error(
        `[getResultadosMataMata] Ranking base da Rodada ${rodadaDefinicao} inválido.`,
      );
    }

    // Calcular as rodadas para cada fase
    const rodadasFases = {
      primeira: edicaoAtiva.rodadaInicial + 1,
      oitavas: edicaoAtiva.rodadaInicial + 2,
      quartas: edicaoAtiva.rodadaInicial + 3,
      semis: edicaoAtiva.rodadaInicial + 4,
      final: edicaoAtiva.rodadaInicial + 5,
    };

    // 3. Calcular vencedores e resultados financeiros fase a fase
    let vencedoresAnteriores = rankingBase;
    for (const fase of fases) {
      const rodadaPontosNum = rodadasFases[fase];
      const numJogos =
        fase === "primeira"
          ? 16
          : fase === "oitavas"
            ? 8
            : fase === "quartas"
              ? 4
              : fase === "semis"
                ? 2
                : 1;

      // Só calcula se a rodada de pontos já ocorreu
      if (rodadaPontosNum > rodada_atual - 1) {
        console.log(
          `[getResultadosMataMata] Rodada ${rodadaPontosNum} (Fase ${fase}) ainda não concluída. Parando cálculo financeiro.`,
        );
        break; // Para de calcular para esta fase e as seguintes
      }

      const pontosDaRodadaAtual = await getPontosDaRodada(
        ligaId,
        rodadaPontosNum,
      );
      const confrontosFase =
        fase === "primeira"
          ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAtual)
          : montarConfrontosFase(
              vencedoresAnteriores,
              pontosDaRodadaAtual,
              numJogos,
            );

      // Extrair vencedores E determinar quem ganhou/perdeu no confronto
      const proximosVencedores = [];
      confrontosFase.forEach((c) => {
        let vencedor = null;
        let perdedor = null;
        const pontosAValidos = typeof c.timeA.pontos === "number";
        const pontosBValidos = typeof c.timeB.pontos === "number";

        if (pontosAValidos && pontosBValidos) {
          if (c.timeA.pontos > c.timeB.pontos) {
            vencedor = c.timeA;
            perdedor = c.timeB;
          } else if (c.timeB.pontos > c.timeA.pontos) {
            vencedor = c.timeB;
            perdedor = c.timeA;
          } else {
            // Empate -> Desempate pelo rank R2
            if (c.timeA.rankR2 < c.timeB.rankR2) {
              vencedor = c.timeA;
              perdedor = c.timeB;
            } else {
              vencedor = c.timeB;
              perdedor = c.timeA;
            }
          }
        } else {
          // Pontos inválidos -> Desempate pelo rank R2
          if (c.timeA.rankR2 < c.timeB.rankR2) {
            vencedor = c.timeA;
            perdedor = c.timeB;
          } else {
            vencedor = c.timeB;
            perdedor = c.timeA;
          }
        }

        if (vencedor && perdedor) {
          // Adiciona resultado financeiro para o vencedor
          resultadosFinanceiros.push({
            timeId: String(vencedor.timeId || vencedor.id),
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: 10.0,
          });
          // Adiciona resultado financeiro para o perdedor
          resultadosFinanceiros.push({
            timeId: String(perdedor.timeId || perdedor.id),
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: -10.0,
          });
          // Guarda o vencedor para a próxima fase
          vencedor.jogoAnterior = c.jogo;
          proximosVencedores.push(vencedor);
        } else {
          console.error(
            `[getResultadosMataMata] Não foi possível determinar vencedor/perdedor do jogo ${c.jogo} da fase ${fase}`,
          );
        }
      });
      vencedoresAnteriores = proximosVencedores; // Atualiza para a próxima iteração
    }

    console.log(
      `[getResultadosMataMata] Cálculo financeiro concluído. ${resultadosFinanceiros.length} registros gerados.`,
    );
    return resultadosFinanceiros;
  } catch (error) {
    console.error(
      "[getResultadosMataMata] Erro ao calcular resultados financeiros:",
      error,
    );
    return []; // Retorna array vazio em caso de erro
  }
}

// Função auxiliar para obter o ID da liga (deve existir em utils.js ou ser definida)
function getLigaId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

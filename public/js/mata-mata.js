// ✅ MATA-MATA.JS - CÓDIGO COMPLETO E FINAL
// Sistema de Mata-Mata com todas as correções implementadas

// Variáveis dinâmicas para exports
let criarBotaoExportacaoMataMata = null;
let exportsCarregados = false;
let exportsCarregando = false;

// Variáveis dinâmicas para rodadas
let getRankingRodadaEspecifica = null;
let rodadasCarregados = false;
let rodadasCarregando = false;

// Cache de módulos
const moduleCache = new Map();

// Função de carregamento dinâmico dos exports
async function carregarExports() {
  if (exportsCarregados) return true;
  if (exportsCarregando) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (exportsCarregados || !exportsCarregando) {
          clearInterval(checkInterval);
          resolve(exportsCarregados);
        }
      }, 100);
    });
  }

  exportsCarregando = true;

  try {
    if (moduleCache.has("exports")) {
      const cached = moduleCache.get("exports");
      criarBotaoExportacaoMataMata = cached.criarBotaoExportacaoMataMata;
      exportsCarregados = true;
      console.log("[MATA-MATA] ✅ Exports carregados do cache");
      return true;
    }

    console.log("[MATA-MATA] 🔄 Carregando módulo de exports...");

    try {
      const exportModule = await import("./exports/export-exports.js");
      if (exportModule && exportModule.exportarMataMata) {
        criarBotaoExportacaoMataMata = exportModule.exportarMataMata;
        moduleCache.set("exports", { criarBotaoExportacaoMataMata });
        exportsCarregados = true;
        console.log(
          "[MATA-MATA] ✅ Exports carregados via função centralizada",
        );
        return true;
      }
    } catch (error) {
      console.warn(
        "[MATA-MATA] ⚠️ Função centralizada não disponível, tentando módulo específico",
      );
    }

    const exportMataMataModule = await import("./exports/export-mata-mata.js");
    if (
      exportMataMataModule &&
      exportMataMataModule.criarBotaoExportacaoMataMata
    ) {
      criarBotaoExportacaoMataMata =
        exportMataMataModule.criarBotaoExportacaoMataMata;
      moduleCache.set("exports", { criarBotaoExportacaoMataMata });
      exportsCarregados = true;
      console.log("[MATA-MATA] ✅ Exports carregados via módulo específico");
      return true;
    }

    throw new Error("Nenhuma função de exportação encontrada");
  } catch (error) {
    console.warn("[MATA-MATA] ⚠️ Erro ao carregar exports:", error);
    exportsCarregados = false;
    return false;
  } finally {
    exportsCarregando = false;
  }
}

// Função de carregamento dinâmico das rodadas
async function carregarRodadas() {
  if (rodadasCarregados) return true;
  if (rodadasCarregando) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (rodadasCarregados || !rodadasCarregando) {
          clearInterval(checkInterval);
          resolve(rodadasCarregados);
        }
      }, 100);
    });
  }

  rodadasCarregando = true;

  try {
    if (moduleCache.has("rodadas")) {
      const cached = moduleCache.get("rodadas");
      getRankingRodadaEspecifica = cached.getRankingRodadaEspecifica;
      rodadasCarregados = true;
      console.log("[MATA-MATA] ✅ Módulo rodadas carregado do cache");
      return true;
    }

    console.log("[MATA-MATA] 🔄 Carregando módulo rodadas...");
    const rodadasModule = await import("./rodadas.js");

    if (rodadasModule && rodadasModule.getRankingRodadaEspecifica) {
      getRankingRodadaEspecifica = rodadasModule.getRankingRodadaEspecifica;
      moduleCache.set("rodadas", { getRankingRodadaEspecifica });
      rodadasCarregados = true;
      console.log("[MATA-MATA] ✅ Módulo rodadas carregado com sucesso");
      return true;
    } else {
      throw new Error("Função getRankingRodadaEspecifica não encontrada");
    }
  } catch (error) {
    console.error("[MATA-MATA] ❌ Erro ao carregar módulo rodadas:", error);
    rodadasCarregados = false;
    return false;
  } finally {
    rodadasCarregando = false;
  }
}

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

let edicaoAtual = null;

// Funções auxiliares
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

function gerarTextoConfronto(faseLabel) {
  const faseUpper = faseLabel.toUpperCase();
  if (faseUpper === "1ª FASE") return "Confronto da 1ª FASE";
  if (faseUpper === "OITAVAS") return "Confronto das OITAVAS";
  if (faseUpper === "QUARTAS") return "Confronto das QUARTAS";
  if (faseUpper === "SEMIS") return "Confronto das SEMIS";
  if (faseUpper === "FINAL") return "Confronto da FINAL";
  return `Confronto da ${faseLabel}`;
}

// Função principal para carregar mata-mata
export async function carregarMataMata() {
  const container = document.getElementById("mata-mata");
  if (!container) return;

  console.log("[MATA-MATA] 🚀 Iniciando carregamento do mata-mata...");

  try {
    console.log("[MATA-MATA] 📦 Pré-carregando dependências...");
    const [rodadasOk, exportsOk] = await Promise.all([
      carregarRodadas(),
      carregarExports(),
    ]);
    if (!rodadasOk) console.warn("[MATA-MATA] ⚠️ Módulo rodadas não carregou");
    if (!exportsOk) console.warn("[MATA-MATA] ⚠️ Módulo exports não carregou");
  } catch (error) {
    console.warn("[MATA-MATA] ⚠️ Erro no pré-carregamento:", error);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch("/api/cartola/mercado/status", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rodadaAtual = data.rodada_atual || 1;
      edicoes.forEach((edicao) => {
        edicao.ativo = rodadaAtual >= edicao.rodadaDefinicao;
      });
    }
  } catch (error) {
    console.warn("[MATA-MATA] ⚠️ Erro ao verificar status do mercado:", error);
  }

  renderizarInterface(container, ligaId);
}

// Função para renderizar a interface
function renderizarInterface(container, ligaId) {
  console.log("[MATA-MATA] 🎨 Renderizando interface...");

  const edicoesHtml = `
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

  const fasesHtml = `
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

  const edicaoSelect = document.getElementById("edicao-select");
  if (edicaoSelect) {
    let debounceTimer;
    edicaoSelect.addEventListener("change", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        edicaoAtual = parseInt(this.value);
        console.log(`[MATA-MATA] 📋 Edição selecionada: ${edicaoAtual}`);

        const faseNavContainer = document.getElementById("fase-nav-container");
        if (faseNavContainer) faseNavContainer.style.display = "block";

        container
          .querySelectorAll(".fase-btn")
          .forEach((btn) => btn.classList.remove("active"));
        const primeiraFaseBtn = container.querySelector(
          '.fase-btn[data-fase="primeira"]',
        );
        if (primeiraFaseBtn) primeiraFaseBtn.classList.add("active");

        carregarFase("primeira", ligaId);
      }, 300);
    });
  }

  container.querySelectorAll(".fase-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      if (!edicaoAtual) {
        const message =
          "Por favor, selecione uma edição do Mata-Mata primeiro.";
        console.warn(`[MATA-MATA] ⚠️ ${message}`);

        const alertDiv = document.createElement("div");
        alertDiv.className = "alert alert-warning";
        alertDiv.style.cssText =
          "margin: 10px 0; padding: 12px; background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; border-radius: 6px; text-align: center;";
        alertDiv.textContent = message;

        const contentDiv = document.getElementById("mataMataContent");
        if (contentDiv) {
          contentDiv.innerHTML = "";
          contentDiv.appendChild(alertDiv);
        }
        return;
      }

      container
        .querySelectorAll(".fase-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      const fase = this.getAttribute("data-fase");
      console.log(`[MATA-MATA] 🎯 Fase selecionada: ${fase}`);
      carregarFase(fase, ligaId);
    });
  });
}

// Função para carregar uma fase específica
async function carregarFase(fase, ligaId) {
  const contentId = "mataMataContent";
  const contentElement = document.getElementById(contentId);

  if (!contentElement) {
    console.error("[MATA-MATA] ❌ Elemento de conteúdo não encontrado");
    return;
  }

  console.log(`[MATA-MATA] 🔄 Carregando fase: ${fase}`);

  contentElement.innerHTML = `
    <div style="text-align:center; padding:30px;">
      <div class="loading-spinner" style="margin:0 auto 20px auto; width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #3949ab; border-radius:50%; animation:spin 1s linear infinite;"></div>
      <p style="font-size:16px; color:#666; margin-bottom:10px;">Carregando confrontos da fase ${fase.toUpperCase()}...</p>
      <p style="font-size:14px; color:#888;">Aguarde, processando dados da edição ${edicaoAtual}</p>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>
  `;

  try {
    const dependenciasOk = await Promise.all([
      carregarRodadas(),
      carregarExports(),
    ]);

    if (!dependenciasOk[0]) {
      throw new Error(
        "Módulo rodadas não disponível - não é possível calcular confrontos",
      );
    }

    if (!edicaoAtual) {
      contentElement.innerHTML = `
        <div class="instrucao-inicial" style="text-align:center; padding:40px 20px; background:#f8f9fa; border-radius:8px; margin:20px 0;">
          <p style="font-size:16px; color:#666;">Por favor, selecione uma edição do Mata-Mata para visualizar os confrontos.</p>
        </div>
      `;
      return;
    }

    let rodada_atual = 1;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resMercado = await fetch("/api/cartola/mercado/status", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resMercado.ok) {
        const data = await resMercado.json();
        rodada_atual = data.rodada_atual || 1;
      }
    } catch (err) {
      console.warn("[MATA-MATA] ⚠️ Usando rodada padrão:", err.message);
    }

    const edicaoSelecionada = edicoes.find((e) => e.id === edicaoAtual);
    if (!edicaoSelecionada) {
      throw new Error(`Edição ${edicaoAtual} não encontrada.`);
    }

    const rodadaDefinicao = edicaoSelecionada.rodadaDefinicao;
    console.log(
      `[MATA-MATA] 📊 Buscando ranking base da Rodada ${rodadaDefinicao}...`,
    );

    const rankingBase = await Promise.race([
      getRankingRodadaEspecifica(ligaId, rodadaDefinicao),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao buscar ranking")), 10000),
      ),
    ]);

    console.log(
      `[MATA-MATA] ✅ Ranking base recebido: ${rankingBase?.length || 0} times`,
    );

    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      throw new Error(
        `Ranking base inválido: ${rankingBase?.length || 0}/32 times encontrados`,
      );
    }

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

    let timesParaConfronto = rankingBase;
    if (prevFaseRodada) {
      let vencedoresAnteriores = rankingBase;
      const rodadaInicial = edicaoSelecionada.rodadaInicial;

      for (let r = rodadaInicial + 1; r <= prevFaseRodada; r++) {
        const pontosDaRodadaAnterior = await getPontosDaRodada(ligaId, r);
        const jogosFaseAnterior =
          r === rodadaInicial + 1 ? 16 : 32 / Math.pow(2, r - rodadaInicial);
        const confrontosAnteriores =
          r === rodadaInicial + 1
            ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAnterior)
            : montarConfrontosFase(
                vencedoresAnteriores,
                pontosDaRodadaAnterior,
                jogosFaseAnterior,
              );
        vencedoresAnteriores = extrairVencedores(confrontosAnteriores);
      }
      timesParaConfronto = vencedoresAnteriores;
    }

    let isPending = rodada_atual < rodadaPontosNum;
    console.log(
      `[MATA-MATA] 📅 Rodada ${rodadaPontosNum} - Status: ${isPending ? "Pendente" : "Concluída"}`,
    );

    const pontosRodadaAtual = isPending
      ? {}
      : await getPontosDaRodada(ligaId, rodadaPontosNum);

    const confrontos =
      fase === "primeira"
        ? montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual)
        : montarConfrontosFase(timesParaConfronto, pontosRodadaAtual, numJogos);

    confrontos.forEach((c) => {
      let vencedorDeterminado = null;
      if (!isPending) {
        const pontosAValidos = typeof c.timeA.pontos === "number";
        const pontosBValidos = typeof c.timeB.pontos === "number";
        if (pontosAValidos && pontosBValidos) {
          if (c.timeA.pontos > c.timeB.pontos) vencedorDeterminado = "A";
          else if (c.timeB.pontos > c.timeA.pontos) vencedorDeterminado = "B";
          else
            vencedorDeterminado = c.timeA.rankR2 < c.timeB.rankR2 ? "A" : "B";
        } else {
          vencedorDeterminado = c.timeA.rankR2 < c.timeB.rankR2 ? "A" : "B";
        }
      }

      c.timeA.valor = isPending ? 0 : vencedorDeterminado === "A" ? 10 : -10;
      c.timeB.valor = isPending ? 0 : vencedorDeterminado === "B" ? 10 : -10;
      c.vencedorDeterminado = vencedorDeterminado;
    });

    await renderTabelaMataMata(confrontos, contentId, faseLabel, isPending);

    if (dependenciasOk[1] && criarBotaoExportacaoMataMata) {
      try {
        await criarBotaoExportacaoMataMata({
          containerId: contentId,
          fase: faseLabel,
          confrontos: confrontos,
          isPending: isPending,
          rodadaPontos: getRodadaPontosText(faseLabel, edicaoAtual),
          edicao: getEdicaoMataMata(edicaoAtual),
        });
        console.log("[MATA-MATA] ✅ Botão de exportação adicionado");
      } catch (exportError) {
        console.warn(
          "[MATA-MATA] ⚠️ Erro ao adicionar botão de exportação:",
          exportError,
        );
      }
    } else {
      console.warn("[MATA-MATA] ⚠️ Função de exportação não disponível");
    }

    if (isPending) {
      const msgContainer = document.createElement("div");
      msgContainer.style.cssText =
        "text-align: center; margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; color: #856404;";
      msgContainer.innerHTML = `
        <strong>⏰ Rodada Pendente</strong><br>
        A Rodada ${rodadaPontosNum} ainda não ocorreu. Os resultados serão definidos após o fechamento do mercado.
      `;
      contentElement.appendChild(msgContainer);
    }

    console.log(`[MATA-MATA] ✅ Fase ${fase} carregada com sucesso`);
  } catch (err) {
    console.error(`[MATA-MATA] ❌ Erro ao carregar fase ${fase}:`, err);

    contentElement.innerHTML = `
      <div style="color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #721c24;">❌ Erro ao Carregar Confrontos</h4>
        <p style="margin: 0 0 10px 0;"><strong>Fase:</strong> ${fase.toUpperCase()}</p>
        <p style="margin: 0 0 15px 0;"><strong>Erro:</strong> ${err.message}</p>
        <button onclick="window.location.reload()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          🔄 Recarregar Página
        </button>
      </div>
    `;
  }
}

// Função para obter pontos de uma rodada
async function getPontosDaRodada(ligaId, rodada) {
  try {
    if (!getRankingRodadaEspecifica) {
      console.warn(
        "[MATA-MATA] ⚠️ Função getRankingRodadaEspecifica não disponível",
      );
      return {};
    }

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
    console.error(`[MATA-MATA] ❌ Falha em getPontosDaRodada(${rodada}):`, err);
    return {};
  }
}

// Função para montar confrontos da primeira fase
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

// Função para montar confrontos de fases eliminatórias
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

// Função para extrair vencedores dos confrontos
function extrairVencedores(confrontos) {
  const vencedores = [];
  confrontos.forEach((c) => {
    let vencedor = null;
    let vencedorDeterminado = null;

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
        if (c.timeA.rankR2 < c.timeB.rankR2) {
          vencedor = c.timeA;
          vencedorDeterminado = "A";
        } else {
          vencedor = c.timeB;
          vencedorDeterminado = "B";
        }
      }
    } else {
      if (c.timeA.rankR2 < c.timeB.rankR2) {
        vencedor = c.timeA;
        vencedorDeterminado = "A";
      } else {
        vencedor = c.timeB;
        vencedorDeterminado = "B";
      }
    }

    c.vencedorDeterminado = vencedorDeterminado;

    if (vencedor) {
      vencedor.jogoAnterior = c.jogo;
      vencedores.push(vencedor);
    }
  });
  return vencedores;
}

// Função para renderizar a tabela do mata-mata
async function renderTabelaMataMata(
  confrontos,
  containerId,
  faseLabel,
  isPending = false,
) {
  const container = document.getElementById(containerId);
  if (!container) return;

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
      <div style="font-size: 16px; color: #fff; background: linear-gradient(90deg, #3949ab 60%, #1a237e 100%); display: inline-block; padding: 4px 22px; border-radius: 16px; font-weight: bold; margin: 16px 0 10px 0; letter-spacing: 1px; box-shadow: 0 2px 8px #0001;">
        ${gerarTextoConfronto(faseLabel)}
      </div>
      <div style="font-size: 13px; color: #3949ab; margin-bottom: 10px;">
        ${getRodadaPontosText(faseLabel, edicaoAtual)}
      </div>
    </div>
    <div style="overflow-x:auto;">
      <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: separate; border-spacing: 0; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px #0001; font-size: 13px;">
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
              const valorA = c.timeA.valor || 0;
              const valorB = c.timeB.valor || 0;
              return `
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="font-weight:600; color:#3949ab; padding:6px 2px;">${c.jogo}</td>
                <td style="text-align:left; padding:6px 2px;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <img src="/escudos/${c.timeA.clube_id}.png" style="width:20px; height:20px; border-radius:50%; flex-shrink:0;" onerror="this.style.display='none'">
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
                    <img src="/escudos/${c.timeB.clube_id}.png" style="width:20px; height:20px; border-radius:50%; flex-shrink:0;" onerror="this.style.display='none'">
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

// Função para obter resultados financeiros do mata-mata
export async function getResultadosMataMata() {
  console.log("[getResultadosMataMata] Iniciando cálculo financeiro...");

  const rodadasOk = await carregarRodadas();
  if (!rodadasOk || !getRankingRodadaEspecifica) {
    console.error(
      "[getResultadosMataMata] Função getRankingRodadaEspecifica não disponível.",
    );
    return [];
  }

  const ligaId = getLigaId();
  if (!ligaId) {
    console.error("[getResultadosMataMata] ID da Liga não encontrado.");
    return [];
  }

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

  const edicoesAtivas = edicoes.filter(
    (e) => rodada_atual >= e.rodadaDefinicao,
  );
  if (edicoesAtivas.length === 0) {
    console.log("[getResultadosMataMata] Nenhuma edição ativa encontrada.");
    return [];
  }

  const edicaoAtiva = edicoesAtivas[edicoesAtivas.length - 1];
  console.log(
    `[getResultadosMataMata] Usando edição ${edicaoAtiva.id} (${edicaoAtiva.nome}) para cálculos financeiros.`,
  );

  const resultadosFinanceiros = [];
  const fases = ["primeira", "oitavas", "quartas", "semis", "final"];

  try {
    const rodadaDefinicao = edicaoAtiva.rodadaDefinicao;
    const rankingBase = await getRankingRodadaEspecifica(
      ligaId,
      rodadaDefinicao,
    );
    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      throw new Error(`Ranking base da Rodada ${rodadaDefinicao} inválido.`);
    }

    const rodadasFases = {
      primeira: edicaoAtiva.rodadaInicial + 1,
      oitavas: edicaoAtiva.rodadaInicial + 2,
      quartas: edicaoAtiva.rodadaInicial + 3,
      semis: edicaoAtiva.rodadaInicial + 4,
      final: edicaoAtiva.rodadaInicial + 5,
    };

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

      if (rodadaPontosNum > rodada_atual - 1) {
        console.log(
          `[getResultadosMataMata] Rodada ${rodadaPontosNum} (Fase ${fase}) ainda não concluída.`,
        );
        break;
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

      const proximosVencedores = [];
      confrontosFase.forEach((c) => {
        let vencedor = null;
        let perdedor = null;

        if (
          typeof c.timeA.pontos === "number" &&
          typeof c.timeB.pontos === "number"
        ) {
          if (c.timeA.pontos > c.timeB.pontos) {
            vencedor = c.timeA;
            perdedor = c.timeB;
          } else if (c.timeB.pontos > c.timeA.pontos) {
            vencedor = c.timeB;
            perdedor = c.timeA;
          } else {
            vencedor = c.timeA.rankR2 < c.timeB.rankR2 ? c.timeA : c.timeB;
            perdedor = vencedor === c.timeA ? c.timeB : c.timeA;
          }
        } else {
          vencedor = c.timeA.rankR2 < c.timeB.rankR2 ? c.timeA : c.timeB;
          perdedor = vencedor === c.timeA ? c.timeB : c.timeA;
        }

        if (vencedor && perdedor) {
          resultadosFinanceiros.push({
            timeId: String(vencedor.timeId || vencedor.id),
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: 10.0,
          });
          resultadosFinanceiros.push({
            timeId: String(perdedor.timeId || perdedor.id),
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: -10.0,
          });
          vencedor.jogoAnterior = c.jogo;
          proximosVencedores.push(vencedor);
        }
      });
      vencedoresAnteriores = proximosVencedores;
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
    return [];
  }
}

// Função para obter resultados consolidados para fluxo financeiro
export async function getResultadosMataMataFluxo() {
  console.log("[MATA-MATA] Calculando TODAS as edições concluídas...");

  try {
    const rodadasOk = await carregarRodadas();
    if (!rodadasOk || !getRankingRodadaEspecifica) {
      console.error(
        "[MATA-MATA] Função getRankingRodadaEspecifica não disponível.",
      );
      return {
        participantes: [],
        totalArrecadado: 0,
        totalPago: 0,
        saldoFinal: 0,
        edicoes: [],
      };
    }

    const ligaId = getLigaId();
    if (!ligaId) {
      console.error("[MATA-MATA] ID da Liga não encontrado.");
      return {
        participantes: [],
        totalArrecadado: 0,
        totalPago: 0,
        saldoFinal: 0,
        edicoes: [],
      };
    }

    let rodada_atual = 1;
    try {
      const resMercado = await fetch("/api/cartola/mercado/status");
      if (resMercado.ok) {
        rodada_atual = (await resMercado.json()).rodada_atual;
      }
    } catch (err) {
      console.warn("[MATA-MATA] Erro ao buscar status do mercado:", err);
    }

    const edicoesProcessaveis = edicoes.filter(
      (edicao) => rodada_atual > edicao.rodadaInicial,
    );
    console.log(
      `[MATA-MATA] Encontradas ${edicoesProcessaveis.length} edições para processar (rodada atual: ${rodada_atual})`,
    );

    if (edicoesProcessaveis.length === 0) {
      return {
        participantes: [],
        totalArrecadado: 0,
        totalPago: 0,
        saldoFinal: 0,
        edicoes: [],
      };
    }

    const resultadosConsolidados = new Map();
    let totalArrecadado = 0;
    let totalPago = 0;
    const edicoesProcessadas = [];

    for (const edicao of edicoesProcessaveis) {
      console.log(`[MATA-MATA] Processando ${edicao.nome}...`);
      const resultadosEdicao = await calcularResultadosEdicaoFluxo(
        ligaId,
        edicao,
        rodada_atual,
      );

      if (resultadosEdicao.length > 0) {
        resultadosEdicao.forEach((resultado) => {
          const timeId = resultado.timeId;
          if (!resultadosConsolidados.has(timeId)) {
            resultadosConsolidados.set(timeId, {
              timeId: timeId,
              nome: resultado.nome || `Time ${timeId}`,
              totalPago: 0,
              totalRecebido: 0,
              saldoFinal: 0,
              edicoes: [],
            });
          }

          const participante = resultadosConsolidados.get(timeId);
          if (resultado.valor > 0) {
            participante.totalRecebido += resultado.valor;
          } else {
            participante.totalPago += Math.abs(resultado.valor);
          }

          participante.saldoFinal += resultado.valor;
          participante.edicoes.push({
            edicao: edicao.id,
            fase: resultado.fase,
            valor: resultado.valor,
          });
        });

        const arrecadadoEdicao = 32 * 10.0;
        const pagoEdicao = resultadosEdicao
          .filter((r) => r.valor > 0)
          .reduce((total, r) => total + r.valor, 0);
        totalArrecadado += arrecadadoEdicao;
        totalPago += pagoEdicao;

        edicoesProcessadas.push({
          edicao: edicao.id,
          nome: edicao.nome,
          arrecadado: arrecadadoEdicao,
          pago: pagoEdicao,
        });
      }
    }

    const participantesArray = Array.from(resultadosConsolidados.values());
    console.log(
      `[MATA-MATA] CONSOLIDADO: ${participantesArray.length} participantes, R$ ${totalArrecadado.toFixed(2)} total`,
    );

    return {
      participantes: participantesArray,
      totalArrecadado: totalArrecadado,
      totalPago: totalPago,
      saldoFinal: totalArrecadado - totalPago,
      edicoes: edicoesProcessadas,
    };
  } catch (error) {
    console.error("[MATA-MATA] Erro ao calcular resultados:", error);
    return {
      participantes: [],
      totalArrecadado: 0,
      totalPago: 0,
      saldoFinal: 0,
      edicoes: [],
    };
  }
}

// Função para calcular resultados de uma edição específica
async function calcularResultadosEdicaoFluxo(ligaId, edicao, rodadaAtual) {
  try {
    const resultadosFinanceiros = [];
    const fases = ["primeira", "oitavas", "quartas", "semis", "final"];
    const rankingBase = await getRankingRodadaEspecifica(
      ligaId,
      edicao.rodadaDefinicao,
    );

    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      console.error(`[MATA-MATA] Ranking base inválido para ${edicao.nome}`);
      return [];
    }

    const rodadasFases = {
      primeira: edicao.rodadaInicial + 1,
      oitavas: edicao.rodadaInicial + 2,
      quartas: edicao.rodadaInicial + 3,
      semis: edicao.rodadaInicial + 4,
      final: edicao.rodadaInicial + 5,
    };

    let vencedoresAnteriores = rankingBase;
    for (const fase of fases) {
      const rodadaPontosNum = rodadasFases[fase];
      if (rodadaPontosNum >= rodadaAtual) break;

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

      const proximosVencedores = [];
      confrontosFase.forEach((c) => {
        let vencedor = null;
        let perdedor = null;

        if (
          typeof c.timeA.pontos === "number" &&
          typeof c.timeB.pontos === "number"
        ) {
          if (c.timeA.pontos > c.timeB.pontos) {
            vencedor = c.timeA;
            perdedor = c.timeB;
          } else if (c.timeB.pontos > c.timeA.pontos) {
            vencedor = c.timeB;
            perdedor = c.timeA;
          } else {
            vencedor = c.timeA.rankR2 < c.timeB.rankR2 ? c.timeA : c.timeB;
            perdedor = vencedor === c.timeA ? c.timeB : c.timeA;
          }
        } else {
          vencedor = c.timeA.rankR2 < c.timeB.rankR2 ? c.timeA : c.timeB;
          perdedor = vencedor === c.timeA ? c.timeB : c.timeA;
        }

        if (vencedor && perdedor) {
          resultadosFinanceiros.push({
            timeId: String(vencedor.timeId || vencedor.id),
            nome:
              vencedor.nome_time ||
              vencedor.nome_cartoleiro ||
              `Time ${vencedor.timeId}`,
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: 10.0,
          });
          resultadosFinanceiros.push({
            timeId: String(perdedor.timeId || perdedor.id),
            nome:
              perdedor.nome_time ||
              perdedor.nome_cartoleiro ||
              `Time ${perdedor.timeId}`,
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: -10.0,
          });

          vencedor.jogoAnterior = c.jogo;
          proximosVencedores.push(vencedor);
        }
      });
      vencedoresAnteriores = proximosVencedores;
    }

    console.log(
      `[MATA-MATA] ${edicao.nome}: ${resultadosFinanceiros.length} resultados financeiros calculados`,
    );
    return resultadosFinanceiros;
  } catch (error) {
    console.error(`[MATA-MATA] Erro ao calcular edição ${edicao.nome}:`, error);
    return [];
  }
}

// Função para obter ID da liga
function getLigaId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

// Funções de debug e teste
export function debugEdicoesMataMataFluxo() {
  console.log("[MATA-MATA DEBUG] Edições configuradas:");
  edicoes.forEach((edicao) => {
    console.log(
      `  ${edicao.nome}: rodadas ${edicao.rodadaInicial}-${edicao.rodadaFinal}, ativo: ${edicao.ativo}`,
    );
  });
  return edicoes;
}

export async function testarDadosMataMata() {
  console.log("=== TESTE DOS DADOS DO MATA-MATA ===");
  try {
    const resultado = await getResultadosMataMataFluxo();
    console.log("Estrutura do resultado:", {
      temParticipantes: !!resultado.participantes,
      numeroParticipantes: resultado.participantes?.length || 0,
      totalArrecadado: resultado.totalArrecadado,
      totalPago: resultado.totalPago,
      saldoFinal: resultado.saldoFinal,
      numeroEdicoes: resultado.edicoes?.length || 0,
    });

    if (resultado.participantes && resultado.participantes.length > 0) {
      const primeiroParticipante = resultado.participantes[0];
      console.log("Primeiro participante:", {
        timeId: primeiroParticipante.timeId,
        nome: primeiroParticipante.nome,
        numeroEdicoes: primeiroParticipante.edicoes?.length || 0,
        saldoFinal: primeiroParticipante.saldoFinal,
      });

      if (
        primeiroParticipante.edicoes &&
        primeiroParticipante.edicoes.length > 0
      ) {
        console.log(
          "Primeira edição do participante:",
          primeiroParticipante.edicoes[0],
        );
      }
    }

    return resultado;
  } catch (error) {
    console.error("Erro no teste:", error);
    return null;
  }
}

console.log(
  "[MATA-MATA] ✅ Módulo carregado com correções de carregamento implementadas",
);

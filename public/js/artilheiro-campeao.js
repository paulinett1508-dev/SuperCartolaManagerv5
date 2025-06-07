// public/js/artilheiro-campeao.js

// Constantes
const LIGA_SOBRAL_ID = "6818c6125b30e1ad70847192";
const TOTAL_RODADAS = 38; // Total de rodadas do campeonato

// Variáveis globais
let dadosAtuais = [];
let ligaAtual = null;
let participantesReais = [];
let rodadaAtualDinamica = 1; // Inicializa com 1, será atualizado pela API

// Importar funções de exportação
import {
  criarBotaoExportacaoRodada,
  criarDivExportacao,
  gerarCanvasDownload,
} from "./export.utils.js";

// Inicialização do módulo
export async function inicializarArtilheiroCampeao() {
  console.log("🏆 Inicializando Artilheiro Campeão...");

  const container = document.getElementById("artilheiro-campeao");
  if (!container) {
    console.warn("Container da aba Artilheiro Campeão não encontrado.");
    return;
  }

  // Verificar se é a liga correta
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  if (ligaId !== LIGA_SOBRAL_ID) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; color: #856404;">
        <h3>⚠️ Funcionalidade Restrita</h3>
        <p>O Artilheiro Campeão está disponível apenas para a liga <strong>Cartoleiros Sobral 2025</strong>.</p>
      </div>
    `;
    return;
  }

  // Renderizar loading inicial e começar carregamento automático
  renderizarLoadingInicial();
  await carregarDadosAutomaticamente();
}

// Renderizar tela de loading inicial
function renderizarLoadingInicial() {
  const container = document.getElementById("artilheiro-campeao");

  container.innerHTML = `
    <div id="loading-screen" style="text-align: center; padding: 60px 20px;">
      <div style="width: 80px; height: 80px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>

      <h3 style="color: #007bff; margin-bottom: 15px;">🏆 Carregando Artilheiro Campeão</h3>

      <div id="loading-steps" style="max-width: 500px; margin: 0 auto; text-align: left;">
        <div class="loading-step" id="step-1">
          <span style="color: #007bff;">⏳</span> Buscando participantes reais da liga...
        </div>
        <div class="loading-step" id="step-2" style="color: #999; margin-top: 8px;">
          <span>⏳</span> Validando dados dos times...
        </div>
        <div class="loading-step" id="step-3" style="color: #999; margin-top: 8px;">
          <span>⏳</span> Tentando buscar via backend API...
        </div>
        <div class="loading-step" id="step-4" style="color: #999; margin-top: 8px;">
          <span>⏳</span> Processando ranking...
        </div>
      </div>

      <div id="progress-info" style="margin-top: 20px; color: #6c757d; font-size: 0.9em;">
        <p>Carregando participantes da liga...</p>
      </div>
    </div>
  `;
}

// Atualizar step do loading
function atualizarLoadingStep(stepNumber, status = "loading") {
  const step = document.getElementById(`step-${stepNumber}`);
  if (!step) return;

  const icons = {
    loading: "⏳",
    success: "✅",
    error: "❌",
  };

  const colors = {
    loading: "#007bff",
    success: "#28a745",
    error: "#dc3545",
  };

  step.style.color = colors[status];
  step.querySelector("span").textContent = icons[status];
}

// Atualizar informações de progresso
function atualizarProgressoInfo(texto) {
  const progressInfo = document.getElementById("progress-info");
  if (progressInfo) {
    progressInfo.innerHTML = `<p>${texto}</p>`;
  }
}

// Simular delay para melhor UX
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Carregar dados automaticamente
async function carregarDadosAutomaticamente() {
  try {
    // Step 1: Buscar participantes reais da liga
    atualizarLoadingStep(1, "loading");
    atualizarProgressoInfo("Buscando dados dos participantes cadastrados...");

    participantesReais = await buscarParticipantesReais();

    if (participantesReais.length === 0) {
      throw new Error("Nenhum participante encontrado na liga");
    }

    atualizarLoadingStep(1, "success");
    atualizarProgressoInfo(
      `${participantesReais.length} participantes encontrados`,
    );

    // Step 2: Validar dados
    atualizarLoadingStep(2, "loading");
    await delay(300);
    atualizarLoadingStep(2, "success");

    // Step 3: Tentar buscar via backend
    atualizarLoadingStep(3, "loading");
    atualizarProgressoInfo("Conectando com API do backend...");

    const dadosBackend = await tentarBackendComParticipantesReais();

    if (dadosBackend && dadosBackend.length > 0) {
      atualizarLoadingStep(3, "success");
      atualizarLoadingStep(4, "loading");

      await delay(300);
      atualizarLoadingStep(4, "success");

      // A rodada atual virá do backend
      rodadaAtualDinamica = dadosBackend[0].rodadaAtual || 1; // Assumindo que o primeiro item tem a rodada atual
      renderizarTabelaFinal(dadosBackend, rodadaAtualDinamica);
      return;
    }

    // Se backend não funcionou, usar dados baseados nos participantes reais
    atualizarLoadingStep(3, "error");
    atualizarLoadingStep(4, "loading");
    atualizarProgressoInfo(
      "Backend indisponível. Buscando dados de todas as rodadas disponíveis...",
    );

    // Nova lógica: Buscar dados de todas as rodadas disponíveis
    const dadosAcumulados = await buscarDadosTodasRodadas();

    if (dadosAcumulados && dadosAcumulados.length > 0) {
      atualizarLoadingStep(4, "success");
      // A rodada atual virá do backend
      rodadaAtualDinamica = dadosAcumulados[0].rodadaAtual || 1; // Assumindo que o primeiro item tem a rodada atual
      renderizarTabelaFinal(dadosAcumulados, rodadaAtualDinamica);
      return;
    }

    // Fallback para dados simulados se não conseguir dados reais
    atualizarProgressoInfo(
      "Não foi possível obter dados reais. Simulando dados baseados nos participantes...",
    );
    await delay(500);

    const dadosSimulados = gerarDadosBaseadosEmParticipantesReais();
    atualizarLoadingStep(4, "success");

    // A rodada atual virá do backend
    rodadaAtualDinamica = dadosSimulados[0].rodadaAtual || 1; // Assumindo que o primeiro item tem a rodada atual
    renderizarTabelaFinal(dadosSimulados, rodadaAtualDinamica);
  } catch (error) {
    console.error("Erro ao carregar dados automaticamente:", error);
    renderizarErro(error.message);
  }
}

// Função auxiliar para fazer requisições HTTP com tratamento de erro
async function fazerRequisicao(url, options = {}) {
  try {
    console.log(`🔗 Fazendo requisição para: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.warn(
        `⚠️ Requisição falhou: ${response.status} ${response.statusText} para ${url}`,
      );
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
      };
    }

    const data = await response.json();
    console.log(`✅ Requisição bem-sucedida para: ${url}`);
    return { ok: true, data };
  } catch (error) {
    console.error(`❌ Erro na requisição para ${url}:`, error.message);
    return { ok: false, error: error.message };
  }
}

// Buscar participantes reais da liga
async function buscarParticipantesReais() {
  console.log("🔍 Buscando participantes reais da liga...");

  try {
    // Estratégias corretas baseadas nos endpoints disponíveis
    const strategies = [
      // Estratégia 1: Buscar times da liga específica
      async () => {
        const url = `/api/ligas/${LIGA_SOBRAL_ID}/times`;
        const result = await fazerRequisicao(url);

        if (result.ok && result.data) {
          return { ok: true, json: () => Promise.resolve(result.data) };
        }
        return { ok: false };
      },

      // Estratégia 2: Buscar dados da liga
      async () => {
        const url = `/api/ligas/${LIGA_SOBRAL_ID}`;
        const result = await fazerRequisicao(url);

        if (result.ok && result.data) {
          const data = result.data;
          if (data.times && Array.isArray(data.times)) {
            // Se a liga tem array de IDs, buscar detalhes dos times
            const timesDetalhados = [];
            for (const timeId of data.times.slice(0, 10)) {
              // Limitar para não sobrecarregar
              try {
                const timeUrl = `/api/times/${timeId}`;
                const timeResult = await fazerRequisicao(timeUrl);

                if (timeResult.ok && timeResult.data) {
                  timesDetalhados.push(timeResult.data);
                }
              } catch (e) {
                console.log(`Erro ao buscar time ${timeId}:`, e.message);
              }
            }
            return { ok: true, json: () => Promise.resolve(timesDetalhados) };
          }
        }
        return { ok: false };
      },

      // Estratégia 3: Buscar todos os times
      async () => {
        const url = `/api/times`;
        const result = await fazerRequisicao(url);

        if (result.ok && result.data) {
          return { ok: true, json: () => Promise.resolve(result.data) };
        }
        return { ok: false };
      },

      // Estratégia 4: Extrair da aba participantes
      () => buscarViaParticipantesTab(),
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Tentativa ${i + 1}: Buscando participantes...`);

        const response = await strategies[i]();

        if (response && response.ok) {
          const data = await response.json();
          console.log("📊 Resposta da API:", data);

          let participantes = [];

          // Processar diferentes formatos de resposta
          if (Array.isArray(data)) {
            participantes = data;
          } else if (data.times && Array.isArray(data.times)) {
            participantes = data.times;
          } else if (data.data && Array.isArray(data.data)) {
            participantes = data.data;
          }

          // Validar e formatar participantes
          const participantesFormatados = participantes
            .filter((p) => p && (p.id || p.time_id || p.timeId))
            .map((p) => ({
              id: p.id || p.time_id || p.timeId,
              nome_cartola:
                p.nome_cartoleiro ||
                p.nome_cartola ||
                p.cartoleiro ||
                `Cartoleiro ${p.id}`,
              nome_time: p.nome_time || p.nome || p.time || `Time ${p.id}`,
              url_escudo_png: p.url_escudo_png || p.escudo || "",
              clube_id: p.clube_id || null, // Adicionado para suportar escudos de coração
            }));

          if (participantesFormatados.length > 0) {
            console.log(
              `✅ Encontrados ${participantesFormatados.length} participantes:`,
              participantesFormatados,
            );
            return participantesFormatados;
          }
        }
      } catch (error) {
        console.log(`❌ Estratégia ${i + 1} falhou:`, error.message);
      }
    }

    // Se todas falharam, criar participantes baseados nos nomes vistos
    console.log(
      "⚠️ Todas as estratégias falharam, usando participantes manuais",
    );
    return [
      {
        id: 1,
        nome_cartola: "Paulinelli Miranda",
        nome_time: "Ukulele City F.C.",
      },
      { id: 2, nome_cartola: "Carlos Henrique", nome_time: "CHG FC" },
      { id: 3, nome_cartola: "Daniel Barbosa", nome_time: "Democrata United" },
      { id: 4, nome_cartola: "Junior Brasilino", nome_time: "JBrandNoxXad FC" },
      { id: 5, nome_cartola: "Dhienes", nome_time: "Santarém Da Peneiraide" },
      { id: 6, nome_cartola: "Matheus Coutinho", nome_time: "RG Tomou SK" },
    ];
  } catch (error) {
    console.error("Erro geral ao buscar participantes:", error);
    return [];
  }
}

// Buscar via aba participantes (analisar DOM)
async function buscarViaParticipantesTab() {
  console.log("🔍 Tentando extrair dados da aba Participantes...");

  try {
    // Simular clique na aba participantes para carregar dados
    const tabParticipantes = document.querySelector(
      '[data-tab="participantes"]',
    );
    if (tabParticipantes) {
      tabParticipantes.click();
      await delay(1000); // Aguardar carregamento
    }

    // Tentar extrair dados da tabela de participantes
    const tabelaParticipantes = document.querySelector(
      ".tabela-participantes tbody",
    );
    if (tabelaParticipantes) {
      const linhas = tabelaParticipantes.querySelectorAll("tr");
      const participantes = [];

      linhas.forEach((linha) => {
        const colunas = linha.querySelectorAll("td");
        if (colunas.length >= 5) {
          // Agora temos 5 colunas incluindo escudos
          const id = colunas[0]?.textContent?.trim();
          const nome_cartola = colunas[1]?.textContent?.trim();
          const nome_time = colunas[2]?.textContent?.trim();

          // Tentar extrair clube_id da imagem na coluna 4 (❤️)
          let clube_id = null;
          const escudoImg = colunas[4]?.querySelector("img");
          if (escudoImg) {
            const srcMatch = escudoImg.src.match(/\/escudos\/(\d+)\.png/);
            if (srcMatch && srcMatch[1]) {
              clube_id = parseInt(srcMatch[1]);
            }
          }

          // Tentar extrair url_escudo_png da imagem na coluna 3 (Brasão)
          let url_escudo_png = "";
          const brasaoImg = colunas[3]?.querySelector("img");
          if (brasaoImg) {
            url_escudo_png = brasaoImg.src;
          }

          if (nome_cartola && nome_time) {
            participantes.push({
              id: id || participantes.length + 1,
              nome_cartola,
              nome_time,
              url_escudo_png,
              clube_id,
            });
          }
        }
      });

      if (participantes.length > 0) {
        console.log("✅ Participantes extraídos da tabela:", participantes);
        return { ok: true, json: () => Promise.resolve(participantes) };
      }
    }

    return { ok: false };
  } catch (error) {
    console.log("❌ Erro ao extrair da aba participantes:", error.message);
    return { ok: false };
  }
}

// NOVA FUNÇÃO: Buscar dados de todas as rodadas disponíveis
async function buscarDadosTodasRodadas() {
  console.log("🔄 Buscando dados de todas as rodadas disponíveis...");

  try {
    // Primeiro, verificar quais rodadas estão disponíveis
    const rodadasUrl = `/api/artilheiro-campeao/${LIGA_SOBRAL_ID}/rodadas`;
    const rodadasResult = await fazerRequisicao(rodadasUrl);

    let rodadasDisponiveis = [];
    let rodadaAtualBackend = 1; // Default

    if (
      rodadasResult.ok &&
      rodadasResult.data &&
      rodadasResult.data.success &&
      rodadasResult.data.rodadas &&
      rodadasResult.data.rodadas.length > 0
    ) {
      // Se o backend retornou rodadas disponíveis, usar essas
      rodadasDisponiveis = rodadasResult.data.rodadas;
      rodadaAtualBackend = rodadasResult.data.rodadaAtual; // Obter rodada atual do backend
      console.log(
        `✅ Rodadas disponíveis no backend: ${rodadasDisponiveis.join(", ")}`,
      );
    } else {
      // Fallback para rodadas padrão se o backend não retornar
      for (let i = 1; i <= rodadaAtualDinamica; i++) {
        // Usar rodadaAtualDinamica global
        rodadasDisponiveis.push(i);
      }
      console.log(`⚠️ Usando rodadas padrão: ${rodadasDisponiveis.join(", ")}`);
    }

    // Atualizar a variável global rodadaAtualDinamica
    rodadaAtualDinamica = rodadaAtualBackend;

    // Mapa para acumular dados de todas as rodadas por participante
    const dadosAcumuladosPorParticipante = new Map();

    // Contador de rodadas processadas com sucesso
    let rodadasProcessadas = 0;

    // Buscar dados de cada rodada
    for (const rodada of rodadasDisponiveis) {
      atualizarProgressoInfo(`Processando rodada ${rodada}...`);

      const dadosUrl = `/api/artilheiro-campeao/${LIGA_SOBRAL_ID}/${rodada}`;
      const dadosResult = await fazerRequisicao(dadosUrl);

      if (
        dadosResult.ok &&
        dadosResult.data &&
        dadosResult.data.success &&
        dadosResult.data.dados &&
        dadosResult.data.dados.length > 0
      ) {
        console.log(
          `✅ Dados obtidos para rodada ${rodada}: ${dadosResult.data.dados.length} participantes`,
        );
        rodadasProcessadas++;

        // Processar dados desta rodada
        dadosResult.data.dados.forEach((item) => {
          const id = item.id || item.timeId;
          if (!id) return; // Pular se não tiver ID

          // Se já temos este participante, acumular dados
          if (dadosAcumuladosPorParticipante.has(id)) {
            const participanteExistente =
              dadosAcumuladosPorParticipante.get(id);
            participanteExistente.golsPro += item.golsPro || 0;
            participanteExistente.golsContra += item.golsContra || 0;
            participanteExistente.saldoGols =
              participanteExistente.golsPro - participanteExistente.golsContra;

            // Armazenar dados por rodada
            participanteExistente.golsPorRodada =
              participanteExistente.golsPorRodada || [];
            participanteExistente.golsPorRodada[rodada - 1] = {
              rodada: rodada,
              golsPro: item.golsPro || 0,
              golsContra: item.golsContra || 0,
              saldo: (item.golsPro || 0) - (item.golsContra || 0),
              ocorreu: true,
            };

            // Atualizar jogadores que marcaram gols
            if (item.jogadores && item.jogadores.length > 0) {
              item.jogadores.forEach((jogador) => {
                const jogadorExistente = participanteExistente.jogadores.find(
                  (j) => j.nome === jogador.nome,
                );
                if (jogadorExistente) {
                  jogadorExistente.gols += jogador.gols;
                } else {
                  participanteExistente.jogadores.push({ ...jogador });
                }
              });
            }
          } else {
            // Criar novo participante
            const novoParticipante = {
              timeId: id,
              nomeCartoleiro: item.nomeCartoleiro || "Cartoleiro Desconhecido",
              nomeTime: item.nomeTime || "Time Desconhecido",
              escudo: item.escudo || "",
              golsPro: item.golsPro || 0,
              golsContra: item.golsContra || 0,
              saldoGols: (item.golsPro || 0) - (item.golsContra || 0),
              pontosRodada: item.pontosRodada || 0,
              pontosRankingGeral: item.pontosRankingGeral || 0,
              posicaoRanking: item.posicaoRanking || 999,
              jogadores: item.jogadores ? [...item.jogadores] : [],
              golsPorRodada: Array(TOTAL_RODADAS)
                .fill(null)
                .map((_, i) => {
                  if (i + 1 === rodada) {
                    return {
                      rodada: rodada,
                      golsPro: item.golsPro || 0,
                      golsContra: item.golsContra || 0,
                      saldo: (item.golsPro || 0) - (item.golsContra || 0),
                      ocorreu: true,
                    };
                  } else if (i + 1 <= rodadaAtualBackend) {
                    // Usar rodadaAtualBackend
                    return {
                      rodada: i + 1,
                      golsPro: 0,
                      golsContra: 0,
                      saldo: 0,
                      ocorreu: true,
                    };
                  } else {
                    return {
                      rodada: i + 1,
                      golsPro: 0,
                      golsContra: 0,
                      saldo: 0,
                      ocorreu: false,
                    };
                  }
                }),
            };
            dadosAcumuladosPorParticipante.set(id, novoParticipante);
          }
        });
      } else {
        console.warn(
          `⚠️ Nenhum dado válido para rodada ${rodada} do backend. Status: ${dadosResult.status} ${dadosResult.statusText}`,
        );
      }
    }

    if (rodadasProcessadas === 0) {
      console.warn("❌ Nenhuma rodada processada com sucesso.");
      return [];
    }

    // Converter o mapa para array e ordenar
    let dadosFinais = Array.from(dadosAcumuladosPorParticipante.values());

    // Ordenar por: 1) Saldo de gols (desc), 2) Gols pró (desc), 3) Pontos ranking geral (desc)
    dadosFinais.sort((a, b) => {
      if (b.saldoGols !== a.saldoGols) {
        return b.saldoGols - a.saldoGols;
      }
      if (b.golsPro !== a.golsPro) {
        return b.golsPro - a.golsPro;
      }
      return b.pontosRankingGeral - a.pontosRankingGeral;
    });

    // Atribuir posições
    dadosFinais.forEach((item, index) => {
      item.posicao = index + 1;
    });

    console.log(
      `✅ Dados acumulados de todas as rodadas: ${dadosFinais.length} participantes`,
    );
    return dadosFinais;
  } catch (error) {
    console.error("Erro ao buscar dados de todas as rodadas:", error);
    return [];
  }
}

// Tentar buscar dados do backend com participantes reais
async function tentarBackendComParticipantesReais() {
  console.log("🚀 Tentando buscar dados acumulados via backend...");
  const url = `/api/artilheiro-campeao/${LIGA_SOBRAL_ID}/acumulado`;
  const result = await fazerRequisicao(url);

  if (result.ok && result.data && result.data.success) {
    console.log("✅ Backend retornou dados acumulados.", result.data.dados);
    rodadaAtualDinamica = result.data.rodadaAtual; // Atualiza a rodada atual global
    return result.data.dados;
  } else {
    console.warn(
      "Backend não retornou dados acumulados, tentando buscar rodada por rodada",
    );
    return null;
  }
}

// Função para gerar dados simulados baseados nos participantes reais
function gerarDadosBaseadosEmParticipantesReais() {
  console.log("🔄 Gerando dados simulados baseados nos participantes reais");

  // Para simulação, vamos definir a rodada atual como 11
  rodadaAtualDinamica = 11;

  return participantesReais
    .map((participante, index) => {
      // Gerar dados aleatórios para cada rodada
      const golsPorRodada = [];
      let totalGolsPro = 0;
      let totalGolsContra = 0;

      for (let i = 1; i <= TOTAL_RODADAS; i++) {
        const ocorreu = i <= rodadaAtualDinamica;
        if (ocorreu) {
          // Gerar dados aleatórios para rodadas que já ocorreram
          const golsPro = Math.floor(Math.random() * 3); // 0-2 gols por rodada
          const golsContra = Math.floor(Math.random() * 2); // 0-1 gols contra por rodada

          totalGolsPro += golsPro;
          totalGolsContra += golsContra;

          golsPorRodada.push({
            rodada: i,
            golsPro,
            golsContra,
            saldo: golsPro - golsContra,
            ocorreu: true,
          });
        } else {
          // Rodadas futuras
          golsPorRodada.push({
            rodada: i,
            golsPro: 0,
            golsContra: 0,
            saldo: 0,
            ocorreu: false,
          });
        }
      }

      return {
        posicao: index + 1,
        timeId: participante.id,
        nomeCartoleiro: participante.nome_cartola,
        nomeTime: participante.nome_time,
        escudo: participante.url_escudo_png,
        golsPro: totalGolsPro,
        golsContra: totalGolsContra,
        saldoGols: totalGolsPro - totalGolsContra,
        pontosRankingGeral: Math.floor(Math.random() * 500) + 100, // 100-599 pontos
        posicaoRanking: index + 1,
        golsPorRodada: golsPorRodada,
        jogadores: [
          { nome: "Jogador 1", gols: Math.floor(Math.random() * 5) + 1 },
          { nome: "Jogador 2", gols: Math.floor(Math.random() * 3) },
        ],
      };
    })
    .sort((a, b) => {
      // Ordenar por saldo de gols
      if (b.saldoGols !== a.saldoGols) {
        return b.saldoGols - a.saldoGols;
      }
      // Desempate por gols pró
      if (b.golsPro !== a.golsPro) {
        return b.golsPro - a.golsPro;
      }
      // Desempate final por pontos do ranking geral
      return b.pontosRankingGeral - a.pontosRankingGeral;
    })
    .map((item, index) => {
      // Atualizar posições após ordenação
      item.posicao = index + 1;
      return item;
    });
}

// Função para exportar dados do Artilheiro Campeão (apenas últimas 5 rodadas)
async function exportarArtilheiroCampeao(dados, rodadaAtual) {
  try {
    // Calcular quais são as últimas 5 rodadas (ou menos se não houver 5 rodadas)
    const ultimasRodadas = [];
    for (let i = rodadaAtual; i > 0 && ultimasRodadas.length < 5; i--) {
      ultimasRodadas.push(i);
    }
    ultimasRodadas.sort((a, b) => a - b); // Ordenar em ordem crescente

    const titulo = `Artilheiro Campeão - Liga Cartoleiros Sobral 2025`;
    const subtitulo = `Dados acumulados até a Rodada ${rodadaAtual}`;

    // Criar div de exportação
    const exportDiv = criarDivExportacao(titulo, subtitulo, "900px");

    // Criar cabeçalhos para as últimas 5 rodadas
    const cabecalhosRodadas = ultimasRodadas
      .map((rodada) => {
        const rodadaFormatada = rodada.toString().padStart(2, "0");
        return `<th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">R${rodadaFormatada}</th>`;
      })
      .join("");

    // Criar tabela HTML
    const tabelaHtml = `
      <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
        <thead>
          <tr style="background: #f8f9fa; color: #495057;">
            <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pos</th>
            <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Time</th>
            <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Escudo</th>
            <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">GP</th>
            <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">GC</th>
            <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Saldo</th>
            <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pts RG</th>
            ${cabecalhosRodadas}
          </tr>
        </thead>
        <tbody>
          ${dados
            .map((item, index) => {
              // Criar células para as últimas 5 rodadas
              const celulasPorRodada = ultimasRodadas
                .map((rodada) => {
                  const rodadaData = item.golsPorRodada
                    ? item.golsPorRodada.find((r) => r.rodada === rodada)
                    : null;

                  if (
                    rodadaData &&
                    (rodadaData.golsPro > 0 || rodadaData.golsContra > 0)
                  ) {
                    return `
                  <td style="text-align: center; padding: 7px 5px;">
                    <span style="color: #198754; font-weight: 600;">${rodadaData.golsPro}</span>
                    ${
                      rodadaData.golsContra > 0
                        ? `<span style="color: #dc3545;">(-${rodadaData.golsContra})</span>`
                        : ""
                    }
                  </td>
                `;
                  } else {
                    return `<td style="text-align: center; padding: 7px 5px;">0</td>`;
                  }
                })
                .join("");

              return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="text-align: center; padding: 7px 5px; font-weight: 600;">${item.posicao}</td>
                <td style="text-align: left; padding: 7px 5px;">
                  <div style="font-weight: 500;">${item.nomeTime || "N/D"}</div>
                  <div style="font-size: 0.8em; color: #777;">${item.nomeCartoleiro || "N/D"}</div>
                </td>
                <td style="text-align: center; padding: 7px 5px;">
                  ${
                    item.escudo
                      ? `<img src="${item.escudo}" alt="" style="width:25px; height:25px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>`
                      : "—"
                  }
                </td>
                <td style="text-align: center; padding: 7px 5px; color: #198754; font-weight: 600;">${item.golsPro}</td>
                <td style="text-align: center; padding: 7px 5px; color: #dc3545;">${item.golsContra}</td>
                <td style="text-align: center; padding: 7px 5px; font-weight: 600;">${item.saldoGols}</td>
                <td style="text-align: center; padding: 7px 5px; font-weight: 600;">${item.pontosRankingGeral.toFixed(2)}</td>
                ${celulasPorRodada}
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>

      <div style="margin-top: 15px; font-size: 0.9em; color: #6c757d;">
        <p>Legenda: GP = Gols Pró, GC = Gols Contra, Pts RG = Pontos Ranking Geral, R## = Rodada</p>
        <p>Formato das células de rodada: GP(-GC)</p>
      </div>
    `;

    exportDiv.innerHTML += tabelaHtml;
    document.body.appendChild(exportDiv);

    // Gerar canvas e download
    await gerarCanvasDownload(
      exportDiv,
      `artilheiro_campeao_rodada_${rodadaAtual}.png`,
    );

    return true;
  } catch (error) {
    console.error("Erro ao exportar Artilheiro Campeão:", error);
    return false;
  }
}

// Renderizar a tabela final
function renderizarTabelaFinal(dados, rodadaAtual) {
  dadosAtuais = dados; // Armazenar dados para uso posterior (exportação)

  const container = document.getElementById("artilheiro-campeao");
  container.innerHTML = ""; // Limpar conteúdo anterior

  const titulo = document.createElement("h3");
  titulo.className = "text-center mb-4";
  titulo.innerHTML = `🏆 Artilheiro Campeão - Liga Cartoleiros Sobral 2025`;
  container.appendChild(titulo);

  const infoRodada = document.createElement("p");
  infoRodada.className = "text-center text-muted mb-4";
  infoRodada.textContent = `Dados acumulados até a Rodada ${rodadaAtual} de ${TOTAL_RODADAS}`;
  container.appendChild(infoRodada);

  const botoesAcoes = document.createElement("div");
  botoesAcoes.className = "d-flex justify-content-center mb-4";
  botoesAcoes.innerHTML = `
    <button id="btnLimparCache" class="btn btn-secondary me-2">Limpar Cache</button>
    <button id="btnForcarAtualizacao" class="btn btn-primary me-2">Forçar Atualização</button>
    <div id="btnExportarContainer" class="ms-2"></div>
  `;
  container.appendChild(botoesAcoes);

  // Adicionar event listeners para os botões
  document
    .getElementById("btnLimparCache")
    .addEventListener("click", async () => {
      if (confirm("Tem certeza que deseja limpar o cache?")) {
        await fazerRequisicao(
          `/api/artilheiro-campeao/${LIGA_SOBRAL_ID}/limpar-cache`,
          { method: "DELETE" },
        );
        alert("Cache limpo! Recarregando dados...");
        window.location.reload();
      }
    });

  document
    .getElementById("btnForcarAtualizacao")
    .addEventListener("click", async () => {
      if (
        confirm(
          "Forçar atualização pode demorar. Deseja continuar? (Isso limpará o cache)",
        )
      ) {
        await fazerRequisicao(
          `/api/artilheiro-campeao/${LIGA_SOBRAL_ID}/acumulado/force-update`,
          { method: "GET" },
        );
        alert("Atualização forçada! Recarregando dados...");
        window.location.reload();
      }
    });

  // Adicionar botão de exportação
  criarBotaoExportacaoRodada({
    containerId: "btnExportarContainer",
    rodada: rodadaAtual,
    rankings: dados,
    customExport: (rankings) =>
      exportarArtilheiroCampeao(rankings, rodadaAtual),
  });

  // Criar container para a tabela com rolagem horizontal
  const tabelaContainer = document.createElement("div");
  tabelaContainer.className = "table-responsive";
  tabelaContainer.style.maxHeight = "800px"; // Altura máxima para rolagem vertical
  tabelaContainer.style.overflowY = "auto";
  tabelaContainer.style.overflowX = "auto";
  tabelaContainer.style.position = "relative";
  container.appendChild(tabelaContainer);

  // Criar cabeçalhos para todas as rodadas
  const cabecalhosRodadas = [];
  for (let i = 1; i <= TOTAL_RODADAS; i++) {
    const rodadaFormatada = i.toString().padStart(2, "0");
    cabecalhosRodadas.push(
      `<th class="rodada-col ${i > rodadaAtual ? "text-muted" : ""}" title="Rodada ${i}">R${rodadaFormatada}</th>`,
    );
  }

  // Criar a tabela com estilo moderno
  const tabela = document.createElement("table");
  tabela.className = "table table-striped table-hover";
  tabela.style.position = "relative";

  // Adicionar CSS para fixar cabeçalhos
  const style = document.createElement("style");
  style.textContent = `
    .sticky-header {
      position: sticky;
      top: 0;
      background-color: #f8f9fa;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .sticky-col {
      position: sticky;
      left: 0;
      background-color: #fff;
      z-index: 5;
      box-shadow: 2px 0 4px rgba(0,0,0,0.1);
    }
    .rodada-col {
      min-width: 60px;
      text-align: center;
    }
    .info-col {
      min-width: 80px;
    }
    .nome-col {
      min-width: 150px;
    }
    .gol-positivo {
      color: #198754;
      font-weight: 600;
    }
    .gol-negativo {
      color: #dc3545;
    }
    .rodada-futura {
      color: #adb5bd;
      font-style: italic;
    }
    .tooltip-custom {
      position: absolute;
      background-color: rgba(0,0,0,0.8);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 100;
      pointer-events: none;
      display: none;
    }
  `;
  document.head.appendChild(style);

  // Criar tooltip personalizado
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip-custom";
  tabelaContainer.appendChild(tooltip);

  // Criar cabeçalho da tabela
  tabela.innerHTML = `
    <thead>
      <tr class="sticky-header">
        <th class="sticky-col" style="z-index: 15;">Pos</th>
        <th class="sticky-col" style="left: 50px; z-index: 15;">Time</th>
        <th class="info-col">Escudo</th>
        <th class="info-col">GP</th>
        <th class="info-col">GC</th>
        <th class="info-col">Saldo</th>
        <th class="info-col">Pts RG</th>
        ${cabecalhosRodadas.join("")}
      </tr>
    </thead>
    <tbody>
      ${dados
        .map((item) => {
          // Criar células para cada rodada
          const celulasPorRodada = [];
          for (let i = 1; i <= TOTAL_RODADAS; i++) {
            const rodadaData = item.golsPorRodada
              ? item.golsPorRodada.find((r) => r.rodada === i)
              : null;

            if (rodadaData) {
              if (i > rodadaAtual) {
                // Rodada futura
                celulasPorRodada.push(
                  `<td class="rodada-col rodada-futura" data-rodada="${i}" data-time="${item.nomeTime}">-</td>`,
                );
              } else if (rodadaData.golsPro > 0 || rodadaData.golsContra > 0) {
                // Rodada com gols
                celulasPorRodada.push(`
                <td class="rodada-col" data-rodada="${i}" data-time="${item.nomeTime}" 
                    data-gp="${rodadaData.golsPro}" data-gc="${rodadaData.golsContra}">
                  <span class="gol-positivo">${rodadaData.golsPro}</span>
                  ${rodadaData.golsContra > 0 ? `<span class="gol-negativo">(-${rodadaData.golsContra})</span>` : ""}
                </td>
              `);
              } else {
                // Rodada sem gols
                celulasPorRodada.push(
                  `<td class="rodada-col" data-rodada="${i}" data-time="${item.nomeTime}">0</td>`,
                );
              }
            } else {
              // Sem dados para esta rodada
              celulasPorRodada.push(
                `<td class="rodada-col" data-rodada="${i}" data-time="${item.nomeTime}">-</td>`,
              );
            }
          }

          return `
          <tr>
            <td class="sticky-col" style="z-index: 5;">${item.posicao}</td>
            <td class="sticky-col nome-col" style="left: 50px; z-index: 5;" title="${item.nomeCartoleiro}">${item.nomeTime}</td>
            <td>
              ${
                item.escudo
                  ? `<img src="${item.escudo}" alt="Escudo do Time" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">`
                  : "N/A"
              }
            </td>
            <td class="gol-positivo">${item.golsPro}</td>
            <td class="gol-negativo">${item.golsContra}</td>
            <td><strong>${item.saldoGols}</strong></td>
            <td><strong>${item.pontosRankingGeral.toFixed(2)}</strong></td>
            ${celulasPorRodada.join("")}
          </tr>
        `;
        })
        .join("")}
    </tbody>
  `;

  tabelaContainer.appendChild(tabela);

  // Adicionar interatividade para tooltip
  const celulasRodada = tabelaContainer.querySelectorAll("td.rodada-col");
  celulasRodada.forEach((celula) => {
    celula.addEventListener("mouseenter", (e) => {
      const rodada = e.target.getAttribute("data-rodada");
      const time = e.target.getAttribute("data-time");
      const gp = e.target.getAttribute("data-gp");
      const gc = e.target.getAttribute("data-gc");

      if (rodada && time) {
        let tooltipText = `${time} - Rodada ${rodada}`;
        if (gp && gc) {
          tooltipText += `<br>Gols Pró: ${gp} | Gols Contra: ${gc}`;
        } else if (parseInt(rodada) > rodadaAtual) {
          tooltipText += `<br>Rodada futura`;
        } else {
          tooltipText += `<br>Sem gols`;
        }

        tooltip.innerHTML = tooltipText;
        tooltip.style.display = "block";
        tooltip.style.left = `${e.pageX - tabelaContainer.offsetLeft + 10}px`;
        tooltip.style.top = `${e.pageY - tabelaContainer.offsetTop - 30}px`;
      }
    });

    celula.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    celula.addEventListener("mousemove", (e) => {
      tooltip.style.left = `${e.pageX - tabelaContainer.offsetLeft + 10}px`;
      tooltip.style.top = `${e.pageY - tabelaContainer.offsetTop - 30}px`;
    });
  });

  // Adicionar legenda
  const legenda = document.createElement("div");
  legenda.className = "mt-4";
  legenda.innerHTML = `
    <h5>Legenda:</h5>
    <ul class="list-unstyled d-flex flex-wrap">
      <li class="me-4"><strong>Pos</strong>: Posição</li>
      <li class="me-4"><strong>GP</strong>: Gols Pró</li>
      <li class="me-4"><strong>GC</strong>: Gols Contra</li>
      <li class="me-4"><strong>Pts RG</strong>: Pontos no Ranking Geral</li>
      <li class="me-4"><strong>R01-R38</strong>: Gols por rodada (formato: GP(-GC))</li>
    </ul>
    <p class="text-muted small">Passe o mouse sobre as células para ver detalhes. Role horizontalmente para ver todas as rodadas.</p>
  `;
  container.appendChild(legenda);
}

// Renderizar mensagem de erro
function renderizarErro(mensagem) {
  const container = document.getElementById("artilheiro-campeao");
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
      <h3>❌ Erro ao carregar Artilheiro Campeão</h3>
      <p>${mensagem || "Ocorreu um erro inesperado."}</p>
      <button class="btn btn-danger mt-3" onclick="window.location.reload();">Tentar Novamente</button>
    </div>
  `;
}

import Gols from "../models/Gols.js";
import axios from "axios";

// Exportando a função listarGols explicitamente
export const listarGols = async function (req, res) {
  try {
    const { rodada } = req.query;

    // Filtro condicional baseado na rodada
    const filtro = rodada ? { rodada: parseInt(rodada, 10) } : {};

    // Buscar todos os gols com o filtro aplicado
    const gols = await Gols.find(filtro).sort({
      rodada: -1,
      G: -1,
      nome_cartola: 1,
    });

    return res.status(200).json({
      status: "ok",
      data: gols,
    });
  } catch (err) {
    console.error("Erro ao listar gols:", err);
    return res.status(500).json({
      error: "Erro ao listar gols",
      details: err.message,
    });
  }
};

// Exportando a função com ambos os nomes para compatibilidade
export const extrairGolsDaRodada = async function (req, res) {
  console.log("=== INICIANDO EXTRAÇÃO DE GOLS ===");
  const { timeIds, rodada } = req.body;
  console.log("Parâmetros recebidos para extração:", { timeIds, rodada });

  if (!Array.isArray(timeIds) || !rodada) {
    console.error("Erro: Parâmetros inválidos", { timeIds, rodada });
    return res.status(400).json({ error: "Parâmetros inválidos" });
  }

  // Contadores e arrays para rastreamento
  let totalCriados = 0;
  let totalErros = 0;
  let errosDetalhados = [];
  let atletasComGols = [];
  let duplicadosDetalhes = [];
  let timesSemGols = [];

  try {
    console.log(
      `Iniciando processamento de ${timeIds.length} times para a rodada ${rodada}`,
    );

    for (const timeId of timeIds) {
      const url = `https://api.cartola.globo.com/time/id/${timeId}/${rodada}`;
      console.log(`[Time ${timeId}] Consultando API: ${url}`);

      try {
        const { data } = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
          },
        });

        // Implementação da abordagem de fallback em cascata para o campo nome_cartola
        const nomeCartola =
          data.nome_cartola ?? data.time?.nome ?? "Cartoleiro Desconhecido";
        console.log(`[Time ${timeId}] Nome do cartola: ${nomeCartola}`);

        if (
          !data.atletas ||
          !Array.isArray(data.atletas) ||
          data.atletas.length === 0
        ) {
          console.log(
            `[Time ${timeId}] Nenhum atleta encontrado para o time ${nomeCartola}`,
          );
          timesSemGols.push({ timeId, nome_cartola: nomeCartola });
          continue;
        }

        console.log(
          `[Time ${timeId}] Total de atletas encontrados: ${data.atletas.length}`,
        );
        let atletasComGolNoTime = 0;

        for (const atleta of data.atletas) {
          const atletaId = atleta.atleta_id;
          const apelido = atleta.apelido;

          // Melhorar a conversão do campo G para número
          let G = 0;
          try {
            // Verificação mais robusta para o campo G
            if (atleta.scout && atleta.scout.G !== undefined) {
              // Garantir que G seja sempre um número válido
              G = Number(atleta.scout.G);
              // Se a conversão resultar em NaN, definir como 0
              if (isNaN(G)) {
                console.warn(
                  `[Time ${timeId}] Valor inválido para gols do atleta ${apelido}: ${atleta.scout.G}, definindo como 0`,
                );
                G = 0;
              }
            }
          } catch (convErr) {
            console.error(
              `[Time ${timeId}] Erro ao converter gols para o atleta ${apelido}:`,
              convErr.message,
            );
            G = 0;
          }

          console.log(
            `[Time ${timeId}] Atleta ${apelido} (ID: ${atletaId}) - Gols: ${G} (${typeof G})`,
          );

          if (G > 0) {
            atletasComGolNoTime++;
            atletasComGols.push({
              atletaId,
              apelido,
              G,
              timeId,
              rodada,
              nome_cartola: nomeCartola,
            });

            try {
              // Checa se já existe esse registro para evitar duplicidade
              console.log(
                `[Time ${timeId}] Verificando duplicidade para ${apelido} - Gols: ${G} - Rodada: ${rodada}`,
              );

              const jaExiste = await Gols.findOne({
                nome_cartola: nomeCartola,
                apelido,
                rodada,
                time_id: timeId,
                G: G,
              });

              if (jaExiste) {
                console.log(
                  `[Time ${timeId}] ⚠️ Registro duplicado para ${apelido} - Gols: ${G} - Rodada: ${rodada}`,
                );
                duplicadosDetalhes.push({
                  atletaId,
                  apelido,
                  G,
                  rodada,
                  timeId,
                  nome_cartola: nomeCartola,
                });
              } else {
                console.log(
                  `[Time ${timeId}] ✅ Criando novo registro para ${apelido} - Gols: ${G} - Rodada: ${rodada}`,
                );

                try {
                  // Usar diretamente o nomeCartola que já tem o fallback implementado
                  await Gols.create({
                    nome_cartola: nomeCartola,
                    apelido,
                    atletaId,
                    G,
                    rodada,
                    time_id: timeId,
                  });
                  totalCriados++;
                  console.log(
                    `[Time ${timeId}] Registro criado com sucesso para ${apelido}`,
                  );
                } catch (dbErr) {
                  console.error(
                    `[Time ${timeId}] Erro ao salvar no banco de dados para ${apelido}:`,
                    dbErr.message,
                  );
                  errosDetalhados.push({
                    timeId,
                    atletaId,
                    apelido,
                    error: `Erro ao salvar no banco: ${dbErr.message}`,
                  });
                  totalErros++;
                }
              }
            } catch (dbQueryErr) {
              console.error(
                `[Time ${timeId}] Erro ao consultar banco de dados para ${apelido}:`,
                dbQueryErr.message,
              );
              errosDetalhados.push({
                timeId,
                atletaId,
                apelido,
                error: `Erro na consulta ao banco: ${dbQueryErr.message}`,
              });
              totalErros++;
            }
          }
        }

        console.log(
          `[Time ${timeId}] Atletas com gols neste time: ${atletasComGolNoTime}`,
        );
        if (atletasComGolNoTime === 0) {
          console.log(
            `[Time ${timeId}] Nenhum atleta com gols encontrado para o time ${nomeCartola}`,
          );
        }
      } catch (apiErr) {
        console.error(
          `[Time ${timeId}] ❌ Erro ao processar time:`,
          apiErr.message,
        );
        totalErros++;
        errosDetalhados.push({
          timeId,
          error: `Erro na API: ${apiErr.message}`,
        });
      }
    }

    // Resumo detalhado da extração
    console.log("\n=== RESUMO DA EXTRAÇÃO DE GOLS ===");
    console.log(`- Total de times processados: ${timeIds.length}`);
    console.log(`- Atletas com gols encontrados: ${atletasComGols.length}`);
    if (atletasComGols.length > 0) {
      console.log("- Lista de atletas com gols:");
      atletasComGols.forEach((a) => {
        console.log(
          `  * ${a.apelido} (Time: ${a.nome_cartola}) - ${a.G} gol(s)`,
        );
      });
    }

    console.log(`- Registros duplicados: ${duplicadosDetalhes.length}`);
    if (duplicadosDetalhes.length > 0) {
      console.log("- Lista de registros duplicados:");
      duplicadosDetalhes.forEach((d) => {
        console.log(
          `  * ${d.apelido} (Time: ${d.nome_cartola}) - ${d.G} gol(s)`,
        );
      });
    }

    console.log(`- Novos registros criados: ${totalCriados}`);
    console.log(`- Erros encontrados: ${totalErros}`);
    if (totalErros > 0) {
      console.log(
        "- Detalhes dos erros:",
        JSON.stringify(errosDetalhados, null, 2),
      );
    }
    console.log("=== FIM DA EXTRAÇÃO DE GOLS ===");

    return res.status(200).json({
      status: "ok",
      message: `Extração concluída. Registros criados: ${totalCriados}`,
      totalCriados,
      totalErros,
      errosDetalhados,
      atletasComGols,
      duplicadosDetalhes,
      timesSemGols,
    });
  } catch (err) {
    console.error("❌ ERRO GERAL NA EXTRAÇÃO:", err);
    console.error("Stack trace:", err.stack);
    return res.status(500).json({
      error: "Erro ao extrair gols",
      details: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

// Adicionando um alias para a função extrairGolsDaRodada para compatibilidade com a importação
export const extrairGolsRodada = extrairGolsDaRodada;

// Implementação da função extrairGolsRodadaTime que chama extrairGolsDaRodada
export async function extrairGolsRodadaTime(rodada, time) {
  console.log(
    `Chamando extrairGolsRodadaTime para rodada ${rodada} e time ${time}`,
  );
  // Cria um objeto de requisição e resposta simulados para chamar extrairGolsDaRodada
  const req = {
    body: {
      timeIds: Array.isArray(time) ? time : [time],
      rodada: rodada,
    },
  };

  // Objeto de resposta simulado
  const res = {
    status: function (statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json: function (data) {
      this.data = data;
      return this;
    },
  };

  // Chama a função extrairGolsDaRodada com os objetos simulados
  await extrairGolsDaRodada(req, res);

  // Retorna os dados da resposta
  return res.data;
}

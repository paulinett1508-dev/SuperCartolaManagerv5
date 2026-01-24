import fetch from "node-fetch";
import {
  buscarClubes,
  buscarTimePorId,
  buscarPontuacaoPorRodada,
} from "../services/cartolaService.js";
import { isSeasonFinished, getSeasonStatus, logBlockedOperation, SEASON_CONFIG } from "../utils/seasonGuard.js";
import cartolaApiService from "../services/cartolaApiService.js";
import Time from "../models/Time.js";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
import { CURRENT_SEASON } from "../config/seasons.js";

// Retorna todos os clubes disponíveis
export async function listarClubes(req, res) {
  try {
    const clubes = await buscarClubes();
    res.status(200).json(clubes);
  } catch (error) {
    console.error("Erro ao listar clubes:", error.message);
    res.status(500).json({ error: `Erro ao buscar clubes: ${error.message}` });
  }
}

// Retorna dados de um time específico
export async function obterTimePorId(req, res) {
  try {
    const time = await buscarTimePorId(req.params.id);

    // ✅ FIX: Tratar time não encontrado
    if (!time) {
      return res.status(404).json({
        erro: `Time ${req.params.id} não encontrado na API do Cartola`
      });
    }

    res.status(200).json({
      time: {
        nome: time.nome_time,
        nome_cartoleiro: time.nome_cartoleiro,
        url_escudo_png: time.escudo,
        clube_id: time.clube_id,
      },
      // Campos no nível raiz para compatibilidade
      nome: time.nome_time,
      nome_cartoleiro: time.nome_cartoleiro,
      url_escudo_png: time.escudo,
      escudo: time.escudo,
      clube_id: time.clube_id,
    });
  } catch (error) {
    console.error(
      `Erro ao buscar time com ID ${req.params.id}:`,
      error.message,
    );
    res.status(404).json({
      erro: `Erro ao buscar time com ID ${req.params.id}: ${error.message}`,
    });
  }
}

// Retorna pontuação de um time numa rodada
export async function obterPontuacao(req, res) {
  const { id, rodada } = req.params;
  try {
    const dados = await buscarPontuacaoPorRodada(id, rodada);
    res.status(200).json(dados);
  } catch (error) {
    console.error(
      `Erro ao buscar pontuação do time ${id} na rodada ${rodada}:`,
      error.message,
    );
    res.status(500).json({
      error: `Erro ao buscar pontuação do time ${id} na rodada ${rodada}: ${error.message}`,
    });
  }
}

// Nova função para buscar escalação de um time para a rodada atual
export async function obterEscalacao(req, res) {
  const { id, rodada } = req.params;
  try {
    const response = await fetch(
      `https://api.cartola.globo.com/time/id/${id}/${rodada}`,
      {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "If-Modified-Since": "0",
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    const time = await response.json();
    res.status(200).json({
      time_id: time.time.time_id,
      nome: time.time.nome,
      nome_cartoleiro: time.time.nome_cartola,
      url_escudo_png: time.time.url_escudo_png,
      atletas: time.atletas,
      capitao_id: time.capitao_id,
    });
  } catch (error) {
    console.error(
      `Erro ao buscar escalação do time ${id} na rodada ${rodada}:`,
      error.message,
    );
    res.status(500).json({
      error: `Erro ao buscar escalação do time ${id} na rodada ${rodada}: ${error.message}`,
    });
  }
}

// Função para buscar o status do mercado
export async function getMercadoStatus(req, res) {
  // ⛔ SEASON GUARD: Temporada encerrada - retornar status fixo
  if (isSeasonFinished()) {
    logBlockedOperation('getMercadoStatus', { reason: 'Temporada encerrada' });
    return res.status(200).json({
      rodada_atual: SEASON_CONFIG.LAST_ROUND,
      status_mercado: 6, // 6 = Temporada Encerrada
      mercado_aberto: false,
      fechamento: null,
      temporada_encerrada: true,
      season: SEASON_CONFIG.SEASON_YEAR,
      message: SEASON_CONFIG.BLOCK_MESSAGE
    });
  }

  try {
    console.log("[CARTOLA-CONTROLLER] Buscando status do mercado...");
    const response = await fetch(
      "https://api.cartola.globo.com/mercado/status",
      {
        timeout: 10000,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "If-Modified-Since": "0",
          "User-Agent": "SuperCartola/1.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `API externa retornou ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("[CARTOLA-CONTROLLER] Status recebido:", data);

    res.status(200).json({
      rodada_atual: data.rodada_atual,
      status_mercado: data.status_mercado,
      mercado_aberto: data.status_mercado === 1, // 1 = ABERTO, 2 = FECHADO
      fechamento: data.fechamento,
    });
  } catch (error) {
    console.error(
      "[CARTOLA-CONTROLLER] Erro ao buscar status do mercado:",
      error.message,
    );

    // Retornar dados de fallback em vez de erro 503
    console.log("[CARTOLA-CONTROLLER] Retornando fallback (rodada 38)");
    res.status(200).json({
      rodada_atual: SEASON_CONFIG.LAST_ROUND,
      status_mercado: 2,
      mercado_aberto: false,
      fechamento: null,
      fallback: true,
      message: "API Cartola indisponível, usando dados padrão"
    });
  }
}

// Retorna status da temporada (para frontend)
export async function getSeasonStatusEndpoint(req, res) {
  res.status(200).json(getSeasonStatus());
}

// Nova função para buscar os dados de parciais
export async function getParciais(req, res) {
  try {
    const response = await fetch(
      "https://api.cartola.globo.com/mercado/selecao/parciais",
      {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "If-Modified-Since": "0",
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Erro ao buscar parciais: ${response.statusText}`);
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Erro ao buscar parciais:", error.message);
    res
      .status(500)
      .json({ error: `Erro ao buscar parciais: ${error.message}` });
  }
}

// Função proxy para buscar clubes do Cartola
export async function getClubes(req, res) {
  try {
    const response = await fetch("https://api.cartola.globo.com/clubes");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar clubes do Cartola" });
  }
}

/**
 * Busca dados COMPLETOS da API Cartola e sincroniza com o banco de dados
 * - Atualiza campos básicos (nome_time, nome_cartoleiro, url_escudo_png, slug, assinante)
 * - Salva JSON completo em dados_cartola
 * - Atualiza ultima_sincronizacao_globo
 * - Se ligaId for passado, também atualiza o participante embedded na liga
 */
export async function sincronizarDadosCartola(req, res) {
  const { id } = req.params;
  const { salvar, ligaId } = req.query; // ?salvar=true&ligaId=xxx para persistir no banco e na liga

  try {
    console.log(`[CARTOLA-SYNC] Buscando dados completos do time ${id}...`);

    // Buscar dados COMPLETOS da API Cartola (sem normalização)
    const dadosCompletos = await cartolaApiService.buscarTimePorIdCompleto(id);

    if (!dadosCompletos) {
      return res.status(404).json({
        success: false,
        erro: `Time ${id} não encontrado na API do Cartola`
      });
    }

    const time = dadosCompletos.time || dadosCompletos;
    const agora = new Date();

    // Preparar resposta com todos os dados
    const resposta = {
      success: true,
      time_id: parseInt(id),
      sincronizado_em: agora.toISOString(),
      dados_api: {
        // Dados básicos
        time_id: time.time_id,
        nome: time.nome,
        nome_cartola: time.nome_cartola,
        slug: time.slug,
        url_escudo_png: time.url_escudo_png,
        url_escudo_svg: time.url_escudo_svg,
        foto_perfil: time.foto_perfil,
        assinante: time.assinante,
        // Dados financeiros/pontuação
        patrimonio: time.patrimonio,
        pontos_campeonato: time.pontos_campeonato,
        rodada_atual: time.rodada_atual,
        rodada_time_id: time.rodada_time_id,
        // Dados do clube do coração
        clube_id: time.clube?.id || null,
        clube_nome: time.clube?.nome || null,
        clube_abreviacao: time.clube?.abreviacao || null,
        clube_escudo: time.clube?.escudos?.["60x60"] || time.clube?.escudos?.["45x45"] || null,
        // Dados extras
        facebook_id: time.facebook_id,
        globo_id: time.globo_id,
        cadastro_completo: time.cadastro_completo,
        // Raw completo para referência
        _raw: dadosCompletos
      },
      salvo_no_banco: false,
      atualizado_na_liga: false
    };

    // Se solicitado, salvar no banco de dados
    if (salvar === "true") {
      console.log(`[CARTOLA-SYNC] Salvando dados do time ${id} no banco...`);

      const timeDoc = await Time.findOne({ id: parseInt(id) });

      if (timeDoc) {
        // Atualizar campos básicos
        timeDoc.nome_time = time.nome || timeDoc.nome_time;
        timeDoc.nome = time.nome || timeDoc.nome;
        timeDoc.nome_cartoleiro = time.nome_cartola || timeDoc.nome_cartoleiro;
        timeDoc.nome_cartola = time.nome_cartola || timeDoc.nome_cartola;
        timeDoc.url_escudo_png = time.url_escudo_png || timeDoc.url_escudo_png;
        timeDoc.escudo = time.url_escudo_png || timeDoc.escudo;
        timeDoc.slug = time.slug || timeDoc.slug;
        timeDoc.assinante = time.assinante ?? timeDoc.assinante;
        timeDoc.foto_perfil = time.foto_perfil || timeDoc.foto_perfil;

        // Salvar dados completos no container
        timeDoc.dados_cartola = {
          patrimonio: time.patrimonio,
          pontos_campeonato: time.pontos_campeonato,
          rodada_atual: time.rodada_atual,
          rodada_time_id: time.rodada_time_id,
          clube_id: time.clube?.id || null,
          clube_nome: time.clube?.nome || null,
          clube_abreviacao: time.clube?.abreviacao || null,
          clube_escudo: time.clube?.escudos?.["60x60"] || null,
          facebook_id: time.facebook_id,
          globo_id: time.globo_id,
          url_escudo_svg: time.url_escudo_svg,
          cadastro_completo: time.cadastro_completo,
          _ultima_atualizacao: agora
        };

        // Atualizar timestamp de sincronização
        timeDoc.ultima_sincronizacao_globo = agora;

        await timeDoc.save();

        resposta.salvo_no_banco = true;
        resposta.mensagem = "Dados sincronizados e salvos com sucesso";
        console.log(`[CARTOLA-SYNC] Time ${id} atualizado com sucesso`);
      } else {
        resposta.salvo_no_banco = false;
        resposta.mensagem = `Time ${id} não encontrado no banco local. Use o cadastro de participantes para adicioná-lo primeiro.`;
        console.log(`[CARTOLA-SYNC] Time ${id} não existe no banco local`);
      }

      // Se ligaId foi passado, também atualizar o participante embedded na liga
      if (ligaId) {
        try {
          const Liga = (await import('../models/Liga.js')).default;
          const liga = await Liga.findById(ligaId);

          if (liga && liga.participantes) {
            const participanteIndex = liga.participantes.findIndex(
              p => Number(p.time_id) === parseInt(id)
            );

            if (participanteIndex !== -1) {
              // Atualizar dados do participante embedded
              liga.participantes[participanteIndex].nome_time = time.nome || liga.participantes[participanteIndex].nome_time;
              liga.participantes[participanteIndex].nome_cartola = time.nome_cartola || liga.participantes[participanteIndex].nome_cartola;
              liga.participantes[participanteIndex].clube_id = time.clube?.id || liga.participantes[participanteIndex].clube_id;
              liga.participantes[participanteIndex].foto_perfil = time.foto_perfil || liga.participantes[participanteIndex].foto_perfil;
              liga.participantes[participanteIndex].foto_time = time.url_escudo_png || liga.participantes[participanteIndex].foto_time;
              liga.participantes[participanteIndex].assinante = time.assinante ?? liga.participantes[participanteIndex].assinante;

              await liga.save();

              resposta.atualizado_na_liga = true;
              resposta.mensagem += ". Participante na liga também atualizado.";
              console.log(`[CARTOLA-SYNC] Participante ${id} atualizado na liga ${ligaId}`);
            } else {
              console.log(`[CARTOLA-SYNC] Participante ${id} não encontrado na liga ${ligaId}`);
            }
          }

          // Também atualizar a inscrição da temporada atual (2026)
          try {
            const inscricaoAtualizada = await InscricaoTemporada.findOneAndUpdate(
              {
                liga_id: ligaId,
                time_id: parseInt(id),
                temporada: CURRENT_SEASON
              },
              {
                $set: {
                  'dados_participante.nome_time': time.nome,
                  'dados_participante.nome_cartoleiro': time.nome_cartola,
                  'dados_participante.escudo': time.url_escudo_png || ''
                }
              },
              { new: true }
            );

            if (inscricaoAtualizada) {
              resposta.atualizado_inscricao = true;
              resposta.mensagem += ` Inscrição ${CURRENT_SEASON} atualizada.`;
              console.log(`[CARTOLA-SYNC] Inscrição ${CURRENT_SEASON} do time ${id} atualizada`);
            }
          } catch (inscError) {
            console.error(`[CARTOLA-SYNC] Erro ao atualizar inscrição:`, inscError.message);
          }
        } catch (ligaError) {
          console.error(`[CARTOLA-SYNC] Erro ao atualizar liga:`, ligaError.message);
          // Não falhar a request por erro na liga
        }
      }
    }

    res.status(200).json(resposta);

  } catch (error) {
    console.error(`[CARTOLA-SYNC] Erro ao sincronizar time ${id}:`, error.message);
    res.status(500).json({
      success: false,
      erro: `Erro ao sincronizar dados: ${error.message}`
    });
  }
}

/**
 * Retorna dados completos da API Cartola (sem salvar)
 * Útil para visualização no modal
 */
export async function obterDadosCompletosCartola(req, res) {
  const { id } = req.params;

  try {
    console.log(`[CARTOLA-API] Buscando dados completos do time ${id}...`);

    const dadosCompletos = await cartolaApiService.buscarTimePorIdCompleto(id);

    if (!dadosCompletos) {
      return res.status(404).json({
        success: false,
        erro: `Time ${id} não encontrado na API do Cartola`
      });
    }

    // Buscar também dados do banco local para comparar
    const timeLocal = await Time.findOne({ id: parseInt(id) });

    res.status(200).json({
      success: true,
      time_id: parseInt(id),
      dados_api: dadosCompletos,
      dados_local: timeLocal ? {
        ultima_sincronizacao: timeLocal.ultima_sincronizacao_globo,
        dados_cartola: timeLocal.dados_cartola,
        nome_time: timeLocal.nome_time,
        nome_cartoleiro: timeLocal.nome_cartoleiro
      } : null
    });

  } catch (error) {
    console.error(`[CARTOLA-API] Erro ao buscar time ${id}:`, error.message);
    res.status(500).json({
      success: false,
      erro: `Erro ao buscar dados: ${error.message}`
    });
  }
}

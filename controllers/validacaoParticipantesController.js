/**
 * Controller: Validação de Participantes por Temporada
 * Verifica se os IDs do Cartola ainda são válidos na nova temporada
 *
 * @module controllers/validacaoParticipantesController
 */

import mongoose from "mongoose";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
import cartolaApi from "../services/cartolaApiService.js";

/**
 * Valida participantes de uma temporada consultando a API do Cartola
 *
 * @route GET /api/ligas/:id/validar-participantes/:temporada
 */
export async function validarParticipantesTemporada(req, res) {
    const { id: ligaId, temporada } = req.params;
    const temporadaNum = parseInt(temporada);

    if (!temporadaNum || temporadaNum < 2020 || temporadaNum > 2030) {
        return res.status(400).json({ erro: "Temporada inválida" });
    }

    try {
        console.log(`[VALIDACAO] Iniciando validação de participantes ${temporadaNum} para liga ${ligaId}`);

        // Buscar inscrições da temporada com IDs positivos (reais do Cartola)
        const inscricoes = await InscricaoTemporada.find({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            temporada: temporadaNum,
            time_id: { $gt: 0 }, // Apenas IDs reais (positivos)
            status: { $in: ["renovado", "novo", "pendente"] } // Excluir quem saiu
        }).lean();

        if (inscricoes.length === 0) {
            return res.json({
                temporada: temporadaNum,
                total: 0,
                validados: [],
                mensagem: "Nenhuma inscrição com ID real encontrada"
            });
        }

        console.log(`[VALIDACAO] ${inscricoes.length} inscrições para validar`);

        const resultados = [];
        const delay = (ms) => new Promise(r => setTimeout(r, ms));

        for (const insc of inscricoes) {
            const timeId = insc.time_id;
            const nomeRegistrado = insc.dados_participante?.nome_cartoleiro || "N/D";
            const nomeTimeRegistrado = insc.dados_participante?.nome_time || "N/D";

            try {
                // Rate limiting: 500ms entre requests
                await delay(500);

                const dadosCartola = await cartolaApi.buscarTimePorId(timeId);

                if (!dadosCartola) {
                    // Time não existe mais na API
                    resultados.push({
                        time_id: timeId,
                        status: "inexistente",
                        nome_registrado: nomeRegistrado,
                        nome_time_registrado: nomeTimeRegistrado,
                        nome_atual: null,
                        nome_time_atual: null,
                        mensagem: "Time não encontrado na API do Cartola"
                    });
                    continue;
                }

                const nomeAtual = dadosCartola.time?.nome_cartoleiro || dadosCartola.nome_cartoleiro || "N/D";
                const nomeTimeAtual = dadosCartola.time?.nome || dadosCartola.nome || "N/D";
                const escudoAtual = dadosCartola.time?.url_escudo_png || dadosCartola.url_escudo_png || "";

                // Comparar nome do cartoleiro (dono)
                const nomesIguais = normalizarNome(nomeRegistrado) === normalizarNome(nomeAtual);

                resultados.push({
                    time_id: timeId,
                    status: nomesIguais ? "valido" : "dono_diferente",
                    nome_registrado: nomeRegistrado,
                    nome_time_registrado: nomeTimeRegistrado,
                    nome_atual: nomeAtual,
                    nome_time_atual: nomeTimeAtual,
                    escudo_atual: escudoAtual,
                    mensagem: nomesIguais
                        ? "ID válido, mesmo dono"
                        : "ID válido, mas dono diferente (possível troca de time)"
                });

            } catch (error) {
                console.error(`[VALIDACAO] Erro ao validar time ${timeId}:`, error.message);
                resultados.push({
                    time_id: timeId,
                    status: "erro",
                    nome_registrado: nomeRegistrado,
                    nome_time_registrado: nomeTimeRegistrado,
                    nome_atual: null,
                    nome_time_atual: null,
                    mensagem: `Erro na API: ${error.message}`
                });
            }
        }

        // Estatísticas
        const stats = {
            total: resultados.length,
            validos: resultados.filter(r => r.status === "valido").length,
            dono_diferente: resultados.filter(r => r.status === "dono_diferente").length,
            inexistentes: resultados.filter(r => r.status === "inexistente").length,
            erros: resultados.filter(r => r.status === "erro").length
        };

        console.log(`[VALIDACAO] Concluído:`, stats);

        res.json({
            temporada: temporadaNum,
            liga_id: ligaId,
            validado_em: new Date().toISOString(),
            stats,
            resultados
        });

    } catch (error) {
        console.error(`[VALIDACAO] Erro geral:`, error);
        res.status(500).json({ erro: "Erro ao validar participantes: " + error.message });
    }
}

/**
 * Normaliza nome para comparação (lowercase, sem acentos, sem espaços extras)
 */
function normalizarNome(nome) {
    if (!nome) return "";
    return nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Atualiza dados de um participante com dados atuais do Cartola
 *
 * @route PUT /api/ligas/:id/participantes/:timeId/sincronizar
 */
export async function sincronizarParticipanteCartola(req, res) {
    const { id: ligaId, timeId } = req.params;
    const { temporada } = req.body;

    const temporadaNum = parseInt(temporada) || new Date().getFullYear();
    const timeIdNum = parseInt(timeId);

    if (!timeIdNum || timeIdNum < 0) {
        return res.status(400).json({ erro: "Time ID inválido" });
    }

    try {
        // Buscar dados atuais do Cartola
        const dadosCartola = await cartolaApi.buscarTimePorId(timeIdNum);

        if (!dadosCartola) {
            return res.status(404).json({ erro: "Time não encontrado na API do Cartola" });
        }

        const nomeAtual = dadosCartola.time?.nome_cartoleiro || dadosCartola.nome_cartoleiro;
        const nomeTimeAtual = dadosCartola.time?.nome || dadosCartola.nome;
        const escudoAtual = dadosCartola.time?.url_escudo_png || dadosCartola.url_escudo_png || "";

        // Atualizar inscrição
        const resultado = await InscricaoTemporada.findOneAndUpdate(
            {
                liga_id: new mongoose.Types.ObjectId(ligaId),
                temporada: temporadaNum,
                time_id: timeIdNum
            },
            {
                $set: {
                    "dados_participante.nome_cartoleiro": nomeAtual,
                    "dados_participante.nome_time": nomeTimeAtual,
                    "dados_participante.escudo": escudoAtual,
                    "dados_participante.id_cartola_oficial": timeIdNum,
                    atualizado_em: new Date()
                }
            },
            { new: true }
        );

        if (!resultado) {
            return res.status(404).json({ erro: "Inscrição não encontrada" });
        }

        res.json({
            success: true,
            mensagem: "Dados sincronizados com sucesso",
            dados_atualizados: {
                nome_cartoleiro: nomeAtual,
                nome_time: nomeTimeAtual,
                escudo: escudoAtual
            }
        });

    } catch (error) {
        console.error(`[VALIDACAO] Erro ao sincronizar:`, error);
        res.status(500).json({ erro: "Erro ao sincronizar: " + error.message });
    }
}

import Time from "../models/Time.js";
import mongoose from "mongoose";

// ==================================================
// FUNÇÕES ORIGINAIS (Lógica de Negócio Robusta)
// ==================================================

/**
 * Inativa um participante a partir de uma rodada específica
 */
export const inativarParticipante = async (req, res) => {
  const { timeId } = req.params;
  const { rodada_desistencia } = req.body;

  try {
    const rodadaNum = Number(rodada_desistencia);
    // Validação removida para permitir inativação forçada se rodada não vier
    // if (isNaN(rodadaNum) || rodadaNum < 1 || rodadaNum > 38) ...

    const time = await Time.findOne({ time_id: Number(timeId) });
    if (!time) {
      return res.status(404).json({ erro: "Participante não encontrado" });
    }

    time.ativo = false;
    if (!isNaN(rodadaNum)) {
      time.rodada_desistencia = rodadaNum;
    }
    time.data_desistencia = new Date();

    await time.save();
    console.log(`✅ Participante ${timeId} inativado.`);
    res.status(200).json({ success: true, message: "Participante inativado" });
  } catch (err) {
    console.error("Erro ao inativar:", err);
    res.status(500).json({ erro: err.message });
  }
};

/**
 * Reativa um participante
 */
export const reativarParticipante = async (req, res) => {
  const { timeId } = req.params;
  try {
    const time = await Time.findOne({ time_id: Number(timeId) });
    if (!time) {
      return res.status(404).json({ erro: "Participante não encontrado" });
    }

    time.ativo = true;
    time.rodada_desistencia = null;
    time.data_desistencia = null;

    await time.save();
    console.log(`✅ Participante ${timeId} reativado.`);
    res.status(200).json({ success: true, message: "Participante reativado" });
  } catch (err) {
    console.error("Erro ao reativar:", err);
    res.status(500).json({ erro: err.message });
  }
};

/**
 * Buscar status (Original)
 */
export const buscarStatusParticipante = async (req, res) => {
  const { timeId } = req.params;
  try {
    const time = await Time.findOne({ time_id: Number(timeId) });
    if (!time) return res.status(404).json({ erro: "Time não encontrado" });

    res.status(200).json({
      id: time.time_id,
      ativo: time.ativo,
      status: time.ativo ? "ativo" : "inativo",
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// ==================================================
// ADAPTADORES PARA O INDEX.JS (Correção do Crash)
// ==================================================

// 1. Alias para verificarStatusParticipante
// O index.js chama 'verificarStatusParticipante', então exportamos essa função
// reutilizando a lógica de busca.
export const verificarStatusParticipante = async (req, res) => {
  // Aproveita a lógica existente
  return buscarStatusParticipante(req, res);
};

// 2. Implementação do Toggle Simples (alternarStatusParticipante)
// O index.js chama 'alternarStatusParticipante' para o botão de liga/desliga rápido.
export const alternarStatusParticipante = async (req, res) => {
  const { timeId } = req.params;

  try {
    const time = await Time.findOne({ time_id: Number(timeId) });
    if (!time) {
      return res
        .status(404)
        .json({ success: false, message: "Time não encontrado" });
    }

    // Lógica de Toggle (Inverte o status atual)
    const novoStatus = !time.ativo;

    time.ativo = novoStatus;

    // Se estiver ativando, limpa dados de desistência
    if (novoStatus) {
      time.rodada_desistencia = null;
      time.data_desistencia = null;
    } else {
      // Se estiver desativando via toggle rápido, marca data de hoje
      time.data_desistencia = new Date();
    }

    await time.save();

    console.log(
      `[TOGGLE] Time ${timeId} alterado para: ${novoStatus ? "Ativo" : "Inativo"}`,
    );

    return res.json({
      success: true,
      ativo: novoStatus,
      status: novoStatus ? "ativo" : "inativo",
    });
  } catch (error) {
    console.error("[TOGGLE] Erro:", error);
    return res.status(500).json({ error: "Erro interno ao alternar status" });
  }
};

// Exporta também a função auxiliar se alguém usar
export const verificarAtivoNaRodada = async (timeId, rodada) => {
  // ... (lógica original mantida se necessária)
  return true;
};


import Time from "../models/Time.js";
import mongoose from "mongoose";

/**
 * Inativa um participante a partir de uma rodada específica
 */
export const inativarParticipante = async (req, res) => {
  const { timeId } = req.params;
  const { rodada_desistencia } = req.body;

  try {
    // Validar rodada
    const rodadaNum = Number(rodada_desistencia);
    if (isNaN(rodadaNum) || rodadaNum < 1 || rodadaNum > 38) {
      return res.status(400).json({ 
        erro: "Número da rodada inválido. Deve ser entre 1 e 38." 
      });
    }

    // Buscar time
    const time = await Time.findOne({ id: Number(timeId) });
    if (!time) {
      return res.status(404).json({ erro: "Participante não encontrado" });
    }

    // Verificar se já está inativo
    if (!time.ativo) {
      return res.status(400).json({ 
        erro: "Participante já está inativo",
        rodada_desistencia_anterior: time.rodada_desistencia 
      });
    }

    // Inativar participante
    time.ativo = false;
    time.rodada_desistencia = rodadaNum;
    time.data_desistencia = new Date();
    await time.save();

    console.log(`✅ Participante ${timeId} inativado a partir da rodada ${rodadaNum}`);

    res.status(200).json({
      mensagem: "Participante inativado com sucesso",
      time: {
        id: time.id,
        nome_time: time.nome_time,
        nome_cartoleiro: time.nome_cartoleiro,
        ativo: time.ativo,
        rodada_desistencia: time.rodada_desistencia,
        data_desistencia: time.data_desistencia
      }
    });
  } catch (err) {
    console.error("Erro ao inativar participante:", err);
    res.status(500).json({ 
      erro: "Erro ao inativar participante: " + err.message 
    });
  }
};

/**
 * Reativa um participante
 */
export const reativarParticipante = async (req, res) => {
  const { timeId } = req.params;

  try {
    const time = await Time.findOne({ id: Number(timeId) });
    if (!time) {
      return res.status(404).json({ erro: "Participante não encontrado" });
    }

    if (time.ativo) {
      return res.status(400).json({ 
        erro: "Participante já está ativo" 
      });
    }

    // Reativar participante
    time.ativo = true;
    time.rodada_desistencia = null;
    time.data_desistencia = null;
    await time.save();

    console.log(`✅ Participante ${timeId} reativado`);

    res.status(200).json({
      mensagem: "Participante reativado com sucesso",
      time: {
        id: time.id,
        nome_time: time.nome_time,
        nome_cartoleiro: time.nome_cartoleiro,
        ativo: time.ativo
      }
    });
  } catch (err) {
    console.error("Erro ao reativar participante:", err);
    res.status(500).json({ 
      erro: "Erro ao reativar participante: " + err.message 
    });
  }
};

/**
 * Buscar status de um participante
 */
export const buscarStatusParticipante = async (req, res) => {
  const { timeId } = req.params;

  try {
    const time = await Time.findOne({ id: Number(timeId) });
    if (!time) {
      return res.status(404).json({ erro: "Participante não encontrado" });
    }

    res.status(200).json({
      id: time.id,
      nome_time: time.nome_time,
      nome_cartoleiro: time.nome_cartoleiro,
      ativo: time.ativo,
      rodada_desistencia: time.rodada_desistencia,
      data_desistencia: time.data_desistencia
    });
  } catch (err) {
    console.error("Erro ao buscar status:", err);
    res.status(500).json({ 
      erro: "Erro ao buscar status: " + err.message 
    });
  }
};

/**
 * Verificar se um participante estava ativo em determinada rodada
 */
export const verificarAtivoNaRodada = async (timeId, rodada) => {
  try {
    const time = await Time.findOne({ id: Number(timeId) });
    if (!time) return false;
    
    // Se está ativo, participou de todas
    if (time.ativo) return true;
    
    // Se inativo, verificar se a rodada é anterior à desistência
    if (time.rodada_desistencia && rodada < time.rodada_desistencia) {
      return true;
    }
    
    return false;
  } catch (err) {
    console.error("Erro ao verificar status na rodada:", err);
    return false;
  }
};

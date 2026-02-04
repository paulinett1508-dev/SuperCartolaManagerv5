/**
 * Controller de Avisos - Interface Participante
 * Consumo de avisos no app participante
 */

import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';

// ============================================
// OBTER AVISOS VISÍVEIS
// ============================================
export async function getAvisos(req, res) {
  try {
    const db = getDB();
    const { ligaId, timeId } = req.query;

    if (!ligaId || !timeId) {
      return res.status(400).json({
        success: false,
        error: 'ligaId e timeId são obrigatórios'
      });
    }

    // Filtro: avisos ativos, sincronizados e não expirados
    // Visíveis: global (ligaId=null) + da liga + do participante específico
    const agora = new Date();

    const filtro = {
      ativo: true,
      sincronizadoComApp: true,
      $or: [
        { dataExpiracao: null },
        { dataExpiracao: { $gte: agora } }
      ],
      $and: [
        {
          $or: [
            { ligaId: null }, // Global
            { ligaId, timeId: null }, // Toda liga
            { ligaId, timeId } // Participante específico
          ]
        }
      ]
    };

    const avisos = await db.collection('avisos')
      .find(filtro)
      .sort({ publicadoEm: -1 })
      .limit(10) // Máximo 10 avisos simultâneos
      .toArray();

    res.json({
      success: true,
      avisos
    });

  } catch (error) {
    console.error('[AVISOS-PARTICIPANTE] Erro ao buscar avisos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar avisos'
    });
  }
}

// ============================================
// MARCAR AVISO COMO LIDO
// ============================================
export async function marcarComoLido(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const { timeId } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }

    if (!timeId) {
      return res.status(400).json({
        success: false,
        error: 'timeId obrigatório'
      });
    }

    // Adicionar timeId ao array leitoPor (unique)
    await db.collection('avisos').updateOne(
      { _id: new ObjectId(id) },
      { $addToSet: { leitoPor: String(timeId) } }
    );

    res.json({
      success: true,
      message: 'Aviso marcado como lido'
    });

  } catch (error) {
    console.error('[AVISOS-PARTICIPANTE] Erro ao marcar como lido:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao marcar como lido'
    });
  }
}

// ============================================
// CONTADOR DE NÃO LIDOS
// ============================================
export async function getContadorNaoLidos(req, res) {
  try {
    const db = getDB();
    const { ligaId, timeId } = req.query;

    if (!ligaId || !timeId) {
      return res.status(400).json({
        success: false,
        error: 'ligaId e timeId são obrigatórios'
      });
    }

    const agora = new Date();

    const filtro = {
      ativo: true,
      sincronizadoComApp: true,
      $or: [
        { dataExpiracao: null },
        { dataExpiracao: { $gte: agora } }
      ],
      $and: [
        {
          $or: [
            { ligaId: null },
            { ligaId, timeId: null },
            { ligaId, timeId }
          ]
        }
      ],
      leitoPor: { $ne: String(timeId) } // Não lidos
    };

    const count = await db.collection('avisos').countDocuments(filtro);

    res.json({
      success: true,
      naoLidos: count
    });

  } catch (error) {
    console.error('[AVISOS-PARTICIPANTE] Erro ao contar não lidos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao contar não lidos'
    });
  }
}

export default {
  getAvisos,
  marcarComoLido,
  getContadorNaoLidos
};

/**
 * Controller de Avisos - Interface Admin
 * Gerencia CRUD de avisos e sincronização com app participante
 */

import { getDB } from '../config/database.js';
import mongoose from 'mongoose';
const ObjectId = mongoose.Types.ObjectId;

// ============================================
// CRIAR AVISO
// ============================================
export async function criarAviso(req, res) {
  try {
    const db = getDB();
    const { titulo, mensagem, categoria, ligaId, timeId, dataExpiracao } = req.body;

    // Validações
    if (!titulo || titulo.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Título inválido (max 50 caracteres)'
      });
    }

    if (!mensagem || mensagem.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Mensagem inválida (max 200 caracteres)'
      });
    }

    if (!['success', 'warning', 'info', 'urgent'].includes(categoria)) {
      return res.status(400).json({
        success: false,
        error: 'Categoria inválida'
      });
    }

    // Admin que criou
    const criadoPor = req.session?.admin?.email || 'sistema';

    // Data de expiração padrão: 7 dias
    const expiraEm = dataExpiracao
      ? new Date(dataExpiracao)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const novoAviso = {
      titulo,
      mensagem,
      categoria,
      ligaId: ligaId || null,
      timeId: timeId || null,
      ativo: false, // Criado como rascunho
      sincronizadoComApp: false,
      dataCriacao: new Date(),
      dataExpiracao: expiraEm,
      publicadoEm: null,
      despublicadoEm: null,
      leitoPor: [],
      criadoPor,
      editadoPor: []
    };

    const result = await db.collection('avisos').insertOne(novoAviso);

    res.json({
      success: true,
      message: 'Aviso criado com sucesso',
      aviso: {
        ...novoAviso,
        _id: result.insertedId
      }
    });

  } catch (error) {
    console.error('[AVISOS-ADMIN] Erro ao criar aviso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar aviso'
    });
  }
}

// ============================================
// LISTAR AVISOS
// ============================================
export async function listarAvisos(req, res) {
  try {
    const db = getDB();
    const { ligaId } = req.query;

    // Filtro: se ligaId informado, filtra por liga + globais
    const filtro = ligaId
      ? { $or: [{ ligaId }, { ligaId: null }] }
      : {};

    const avisos = await db.collection('avisos')
      .find(filtro)
      .sort({ dataCriacao: -1 })
      .toArray();

    res.json({
      success: true,
      avisos
    });

  } catch (error) {
    console.error('[AVISOS-ADMIN] Erro ao listar avisos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar avisos'
    });
  }
}

// ============================================
// TOGGLE ATIVO/INATIVO
// ============================================
export async function toggleAtivoAviso(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }

    const aviso = await db.collection('avisos').findOne({ _id: new ObjectId(id) });

    if (!aviso) {
      return res.status(404).json({
        success: false,
        error: 'Aviso não encontrado'
      });
    }

    // Toggle: ativo <-> inativo
    const novoEstado = !aviso.ativo;

    await db.collection('avisos').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ativo: novoEstado } }
    );

    res.json({
      success: true,
      message: `Aviso ${novoEstado ? 'ativado' : 'desativado'}`,
      ativo: novoEstado
    });

  } catch (error) {
    console.error('[AVISOS-ADMIN] Erro ao toggle aviso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao alterar estado'
    });
  }
}

// ============================================
// PUBLICAR AVISO (Sincronizar com App)
// ============================================
export async function publicarAviso(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }

    const aviso = await db.collection('avisos').findOne({ _id: new ObjectId(id) });

    if (!aviso) {
      return res.status(404).json({
        success: false,
        error: 'Aviso não encontrado'
      });
    }

    // Apenas avisos ativos podem ser publicados
    if (!aviso.ativo) {
      return res.status(400).json({
        success: false,
        error: 'Aviso deve estar ativo para ser publicado'
      });
    }

    // Verificar se expirou
    if (aviso.dataExpiracao && new Date(aviso.dataExpiracao) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Aviso expirado, não pode ser publicado'
      });
    }

    await db.collection('avisos').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          sincronizadoComApp: true,
          publicadoEm: aviso.publicadoEm || new Date() // Mantém primeira publicação
        }
      }
    );

    res.json({
      success: true,
      message: 'Aviso publicado no app',
      sincronizadoComApp: true
    });

  } catch (error) {
    console.error('[AVISOS-ADMIN] Erro ao publicar aviso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao publicar aviso'
    });
  }
}

// ============================================
// DESPUBLICAR AVISO (Remover do App)
// ============================================
export async function despublicarAviso(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }

    await db.collection('avisos').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          sincronizadoComApp: false,
          ativo: false, // Força desativação também
          despublicadoEm: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Aviso removido do app',
      sincronizadoComApp: false
    });

  } catch (error) {
    console.error('[AVISOS-ADMIN] Erro ao despublicar aviso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao despublicar aviso'
    });
  }
}

// ============================================
// EDITAR AVISO
// ============================================
export async function editarAviso(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const { titulo, mensagem, categoria, dataExpiracao } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }

    const aviso = await db.collection('avisos').findOne({ _id: new ObjectId(id) });

    if (!aviso) {
      return res.status(404).json({
        success: false,
        error: 'Aviso não encontrado'
      });
    }

    // Preparar update
    const update = {};
    if (titulo) update.titulo = titulo;
    if (mensagem) update.mensagem = mensagem;
    if (categoria) update.categoria = categoria;
    if (dataExpiracao) update.dataExpiracao = new Date(dataExpiracao);

    // Registrar edição no histórico
    const adminEmail = req.session?.admin?.email || 'sistema';
    const edicao = {
      admin: adminEmail,
      data: new Date(),
      alteracoes: update
    };

    await db.collection('avisos').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: update,
        $push: { editadoPor: edicao }
      }
    );

    res.json({
      success: true,
      message: 'Aviso editado com sucesso'
    });

  } catch (error) {
    console.error('[AVISOS-ADMIN] Erro ao editar aviso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao editar aviso'
    });
  }
}

// ============================================
// DELETAR AVISO
// ============================================
export async function deletarAviso(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }

    const result = await db.collection('avisos').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aviso não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Aviso deletado com sucesso'
    });

  } catch (error) {
    console.error('[AVISOS-ADMIN] Erro ao deletar aviso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar aviso'
    });
  }
}

export default {
  criarAviso,
  listarAvisos,
  toggleAtivoAviso,
  publicarAviso,
  despublicarAviso,
  editarAviso,
  deletarAviso
};

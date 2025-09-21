
import mongoose from "mongoose";
import cartolaApiService from "../services/cartolaApiService.js"; // BEGIN dynamic-round fix

const golsSchema = new mongoose.Schema(
  {
    // Identificação
    ligaId: {
      type: mongoose.Schema.Types.Mixed, // Aceita String ou Number
      required: true,
      index: true,
      validate: {
        validator: function(v) {
          return v != null && v !== '' && v !== 'null' && v !== 'undefined';
        },
        message: 'Liga ID é obrigatório e deve ser válido'
      }
    },
    rodada: {
      type: Number,
      required: true,
      min: [1, 'Rodada deve ser no mínimo 1'],
      max: [() => cartolaApiService.obterTotalRodadas(), 'Rodada inválida'], // BEGIN dynamic-round fix
      validate: {
        validator: Number.isInteger,
        message: 'Rodada deve ser um número inteiro'
      }
    },
    atletaId: {
      type: Number,
      required: true,
      index: true,
      validate: {
        validator: function(v) {
          return Number.isInteger(v) && v > 0;
        },
        message: 'Atleta ID deve ser um número inteiro positivo'
      }
    },
    nome: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Nome do atleta não pode exceder 100 caracteres'],
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'Nome do atleta é obrigatório'
      }
    },
    timeId: {
      type: Number,
      required: true,
      validate: {
        validator: function(v) {
          return Number.isInteger(v) && v > 0;
        },
        message: 'Time ID deve ser um número inteiro positivo'
      }
    },

    // Estatísticas de gols
    gols: {
      type: Number,
      default: 0,
      min: [0, 'Gols não pode ser negativo'],
      max: [10, 'Número de gols suspeito (máximo 10 por rodada)'],
      validate: {
        validator: Number.isInteger,
        message: 'Gols deve ser um número inteiro'
      }
    },
    golsContra: {
      type: Number,
      default: 0,
      min: [0, 'Gols contra não pode ser negativo'],
      max: [5, 'Número de gols contra suspeito (máximo 5 por rodada)'],
      validate: {
        validator: Number.isInteger,
        message: 'Gols contra deve ser um número inteiro'
      }
    },
    golsLiquidos: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Gols líquidos deve ser um número inteiro'
      }
    },

    // Dados complementares
    pontos: {
      type: Number,
      default: 0,
      min: [-50, 'Pontos muito baixos'],
      max: [100, 'Pontos muito altos']
    },
    posicao: {
      type: Number,
      min: [1, 'Posição deve ser entre 1 e 6'],
      max: [6, 'Posição deve ser entre 1 e 6'],
      validate: {
        validator: function(v) {
          return v == null || Number.isInteger(v);
        },
        message: 'Posição deve ser um número inteiro'
      }
    },
    clube: {
      type: Number,
      validate: {
        validator: function(v) {
          return v == null || (Number.isInteger(v) && v > 0);
        },
        message: 'Clube ID deve ser um número inteiro positivo'
      }
    },
    clubeNome: {
      type: String,
      trim: true,
      maxlength: [50, 'Nome do clube não pode exceder 50 caracteres']
    },

    // Controle de qualidade
    scoutValido: {
      type: Boolean,
      default: true,
      index: true
    },
    dataColeta: {
      type: Date,
      default: Date.now,
      index: true
    },
    ativo: {
      type: Boolean,
      default: true,
      index: true
    },
  },
  {
    timestamps: true,
    collection: "gols",
    // Otimizações de performance
    autoIndex: process.env.NODE_ENV !== 'production',
    bufferCommands: false,
    bufferMaxEntries: 0
  },
);

// Índices compostos para performance otimizada
golsSchema.index({ ligaId: 1, rodada: 1 }, { background: true });
golsSchema.index({ ligaId: 1, atletaId: 1 }, { background: true });
golsSchema.index({ ligaId: 1, gols: -1 }, { background: true });
golsSchema.index({ ligaId: 1, golsLiquidos: -1 }, { background: true });
golsSchema.index({ gols: -1, golsLiquidos: -1 }, { background: true });
golsSchema.index({ dataColeta: -1 }, { background: true });
golsSchema.index({ scoutValido: 1, ativo: 1 }, { background: true });

// Índice único para evitar duplicatas
golsSchema.index(
  { ligaId: 1, rodada: 1, atletaId: 1 }, 
  { unique: true, background: true }
);

// Middleware para calcular gols líquidos e validações
golsSchema.pre("save", function (next) {
  try {
    // Calcular gols líquidos
    this.golsLiquidos = this.gols - this.golsContra;
    
    // Validações adicionais
    if (this.gols < 0 || this.golsContra < 0) {
      return next(new Error('Gols e gols contra não podem ser negativos'));
    }
    
    if (this.gols > 10) {
      console.warn(`Valor de gols suspeito: ${this.gols} para atleta ${this.atletaId}`);
      this.scoutValido = false;
    }
    
    if (this.golsContra > 5) {
      console.warn(`Valor de gols contra suspeito: ${this.golsContra} para atleta ${this.atletaId}`);
      this.scoutValido = false;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para logging de operações
golsSchema.post('save', function(doc) {
  if (doc.gols > 0) {
    console.log(`[GOLS-MODEL] Gol registrado: ${doc.nome} - ${doc.gols} gols na rodada ${doc.rodada}`);
  }
});

// Método estático melhorado para buscar artilheiros
golsSchema.statics.buscarArtilheiros = function (ligaId, limite = 50) {
  if (!ligaId) {
    throw new Error('Liga ID é obrigatório');
  }

  return this.aggregate([
    { 
      $match: { 
        ligaId: ligaId, 
        ativo: true,
        scoutValido: true
      } 
    },
    {
      $group: {
        _id: "$atletaId",
        nome: { $first: "$nome" },
        totalGols: { $sum: "$gols" },
        totalGolsContra: { $sum: "$golsContra" },
        golsLiquidos: { $sum: "$golsLiquidos" },
        totalPontos: { $sum: "$pontos" },
        clube: { $first: "$clube" },
        clubeNome: { $first: "$clubeNome" },
        rodadasComGols: { 
          $sum: { $cond: [{ $gt: ["$gols", 0] }, 1, 0] } 
        },
        rodadasJogadas: { $sum: 1 },
        melhorRodada: { $max: "$gols" },
        mediaGolsPorRodada: { $avg: "$gols" },
        detalhesRodadas: {
          $push: {
            rodada: "$rodada",
            gols: "$gols",
            golsContra: "$golsContra",
            pontos: "$pontos",
            dataColeta: "$dataColeta"
          },
        },
        ultimaAtualizacao: { $max: "$updatedAt" }
      },
    },
    {
      $addFields: {
        consistencia: {
          $cond: [
            { $gt: ["$rodadasJogadas", 0] },
            { $divide: ["$rodadasComGols", "$rodadasJogadas"] },
            0
          ]
        }
      }
    },
    { 
      $sort: { 
        golsLiquidos: -1, 
        totalGols: -1, 
        consistencia: -1,
        nome: 1 
      } 
    },
    { $limit: limite },
  ]);
};

// Método estático para obter estatísticas da liga
golsSchema.statics.obterEstatisticasLiga = function (ligaId) {
  if (!ligaId) {
    throw new Error('Liga ID é obrigatório');
  }

  return this.aggregate([
    { 
      $match: { 
        ligaId: ligaId, 
        ativo: true 
      } 
    },
    {
      $group: {
        _id: null,
        totalGols: { $sum: "$gols" },
        totalGolsContra: { $sum: "$golsContra" },
        totalJogadores: { $addToSet: "$atletaId" },
        rodadasProcessadas: { $addToSet: "$rodada" },
        maiorGoleador: { $max: "$gols" },
        totalRegistros: { $sum: 1 },
        registrosValidos: {
          $sum: { $cond: ["$scoutValido", 1, 0] }
        },
        jogadoresComGols: {
          $sum: { $cond: [{ $gt: ["$gols", 0] }, 1, 0] }
        },
        ultimaColeta: { $max: "$dataColeta" }
      },
    },
    {
      $addFields: {
        totalJogadoresUnicos: { $size: "$totalJogadores" },
        totalRodadasProcessadas: { $size: "$rodadasProcessadas" },
        percentualValidos: {
          $cond: [
            { $gt: ["$totalRegistros", 0] },
            { 
              $multiply: [
                { $divide: ["$registrosValidos", "$totalRegistros"] },
                100
              ]
            },
            0
          ]
        }
      }
    }
  ]);
};

// Método estático para limpar dados inválidos
golsSchema.statics.limparDadosInvalidos = function (ligaId) {
  return this.deleteMany({
    ligaId: ligaId,
    $or: [
      { scoutValido: false },
      { ativo: false },
      { gols: { $lt: 0 } },
      { golsContra: { $lt: 0 } },
      { gols: { $gt: 10 } },
      { golsContra: { $gt: 5 } }
    ]
  });
};

// Método estático para reprocessar gols líquidos
golsSchema.statics.reprocessarGolsLiquidos = function (ligaId) {
  return this.updateMany(
    { ligaId: ligaId },
    [
      {
        $set: {
          golsLiquidos: { $subtract: ["$gols", "$golsContra"] }
        }
      }
    ]
  );
};

// Método de instância para validar dados
golsSchema.methods.validarDados = function() {
  const erros = [];
  
  if (!this.ligaId) erros.push('Liga ID é obrigatório');
  if (!this.atletaId || this.atletaId <= 0) erros.push('Atleta ID inválido');
  if (!this.nome || this.nome.trim().length === 0) erros.push('Nome do atleta é obrigatório');
  const totalRodadas = cartolaApiService.obterTotalRodadas(); // BEGIN dynamic-round fix
  if (this.rodada < 1 || this.rodada > totalRodadas) erros.push(`Rodada deve estar entre 1 e ${totalRodadas}`); // BEGIN dynamic-round fix
  if (this.gols < 0) erros.push('Gols não pode ser negativo');
  if (this.golsContra < 0) erros.push('Gols contra não pode ser negativo');
  
  return {
    valido: erros.length === 0,
    erros: erros
  };
};

// Middleware para tratamento de erros
golsSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const match = error.message.match(/dup key: { ligaId: "([^"]*)", rodada: ([^,]*), atletaId: ([^}]*) }/);
    if (match) {
      const [, ligaId, rodada, atletaId] = match;
      next(new Error(`Registro duplicado: Atleta ${atletaId} já existe na rodada ${rodada} da liga ${ligaId}`));
    } else {
      next(new Error('Registro duplicado detectado'));
    }
  } else {
    next(error);
  }
});

export default mongoose.model("Gols", golsSchema);

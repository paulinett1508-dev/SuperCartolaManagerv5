/**
 * SCRIPT DE MIGRAÇÃO: Popular configurações das ligas
 *
 * Este script extrai os valores hardcoded do código e popula
 * o campo `configuracoes` de cada liga no banco de dados.
 *
 * Executar: node scripts/migrar-configuracoes-ligas.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// IDs das Ligas
const LIGA_SUPERCARTOLA = "684cb1c8af923da7c7df51de";
const LIGA_SOBRAL = "684d821cf1a7ae16d1f89572";

// =============================================================================
// CONFIGURAÇÕES EXTRAÍDAS DOS HARDCODES
// =============================================================================

const CONFIGURACOES_SUPERCARTOLA = {
  // RANKING DA RODADA (BANCO) - 32 participantes
  ranking_rodada: {
    descricao: "Bônus/ônus por posição na rodada",
    total_participantes: 32,
    valores: {
      1: 20.0, 2: 19.0, 3: 18.0, 4: 17.0, 5: 16.0,
      6: 15.0, 7: 14.0, 8: 13.0, 9: 12.0, 10: 11.0, 11: 10.0,
      12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0,
      22: -10.0, 23: -11.0, 24: -12.0, 25: -13.0, 26: -14.0,
      27: -15.0, 28: -16.0, 29: -17.0, 30: -18.0, 31: -19.0, 32: -20.0
    },
    faixas: {
      credito: { inicio: 1, fim: 11 },
      neutro: { inicio: 12, fim: 21 },
      debito: { inicio: 22, fim: 32 }
    }
  },

  // TOP 10 MITOS/MICOS
  top10: {
    descricao: "Prêmio histórico por posição no ranking semanal",
    habilitado: true,
    valores_mito: {
      1: 30, 2: 28, 3: 26, 4: 24, 5: 22,
      6: 20, 7: 18, 8: 16, 9: 14, 10: 12
    },
    valores_mico: {
      1: -30, 2: -28, 3: -26, 4: -24, 5: -22,
      6: -20, 7: -18, 8: -16, 9: -14, 10: -12
    }
  },

  // PONTOS CORRIDOS
  pontos_corridos: {
    descricao: "Confrontos todos contra todos",
    habilitado: true,
    valores: {
      vitoria: 3,
      empate: 1,
      derrota: 0
    },
    premiacao: {
      primeiro: 0,
      segundo: 0,
      terceiro: 0
    }
  },

  // MATA-MATA
  mata_mata: {
    descricao: "Eliminatórias em chaves",
    habilitado: true,
    valores: {
      vitoria: 10,
      derrota: -10
    },
    edicoes: 3
  },

  // MELHOR DO MÊS
  melhor_mes: {
    descricao: "Ranking por período mensal",
    habilitado: true,
    edicoes: [
      { id: 1, nome: "Edição 01", inicio: 1, fim: 6 },
      { id: 2, nome: "Edição 02", inicio: 7, fim: 10 },
      { id: 3, nome: "Edição 03", inicio: 11, fim: 17 },
      { id: 4, nome: "Edição 04", inicio: 18, fim: 22 },
      { id: 5, nome: "Edição 05", inicio: 23, fim: 26 },
      { id: 6, nome: "Edição 06", inicio: 27, fim: 30 },
      { id: 7, nome: "Edição 07", inicio: 31, fim: 38 }
    ],
    premiacao: {
      primeiro: 0,
      ultimo: 0
    }
  },

  // ARTILHEIRO
  artilheiro: {
    descricao: "Ranking de gols",
    habilitado: false
  },

  // LUVA DE OURO
  luva_ouro: {
    descricao: "Ranking de goleiros",
    habilitado: false
  },

  // CARDS DESABILITADOS NO FRONTEND
  cards_desabilitados: ["luva-de-ouro", "artilheiro-campeao"],

  // TEMPORADA 2025
  temporada_2025: {
    status: "ativa",
    rodada_inicial: 1,
    rodada_final: 38
  }
};

const CONFIGURACOES_SOBRAL = {
  // RANKING DA RODADA (BANCO) - Sistema de 2 fases
  ranking_rodada: {
    descricao: "Bônus/ônus por posição na rodada (sistema temporal)",
    temporal: true,
    rodada_transicao: 30,
    fase1: {
      descricao: "Rodadas 1-29: 6 participantes",
      total_participantes: 6,
      valores: {
        1: 7.0, 2: 4.0, 3: 0.0, 4: -2.0, 5: -5.0, 6: -10.0
      },
      faixas: {
        credito: { inicio: 1, fim: 2 },
        neutro: { inicio: 3, fim: 3 },
        debito: { inicio: 4, fim: 6 }
      }
    },
    fase2: {
      descricao: "Rodadas 30-38: 4 participantes ativos",
      total_participantes: 4,
      valores: {
        1: 5.0, 2: 0.0, 3: 0.0, 4: -5.0
      },
      faixas: {
        credito: { inicio: 1, fim: 1 },
        neutro: { inicio: 2, fim: 3 },
        debito: { inicio: 4, fim: 4 }
      }
    }
  },

  // TOP 10 MITOS/MICOS
  top10: {
    descricao: "Prêmio histórico por posição no ranking semanal",
    habilitado: true,
    valores_mito: {
      1: 10, 2: 9, 3: 8, 4: 7, 5: 6,
      6: 5, 7: 4, 8: 3, 9: 2, 10: 1
    },
    valores_mico: {
      1: -10, 2: -9, 3: -8, 4: -7, 5: -6,
      6: -5, 7: -4, 8: -3, 9: -2, 10: -1
    }
  },

  // PONTOS CORRIDOS
  pontos_corridos: {
    descricao: "Confrontos todos contra todos",
    habilitado: false
  },

  // MATA-MATA
  mata_mata: {
    descricao: "Eliminatórias em chaves",
    habilitado: false
  },

  // MELHOR DO MÊS
  melhor_mes: {
    descricao: "Ranking por período mensal",
    habilitado: false,
    premiacao: {
      primeiro: 15.0,
      ultimo: -15.0
    }
  },

  // ARTILHEIRO
  artilheiro: {
    descricao: "Ranking de gols",
    habilitado: true,
    premiacao: {
      primeiro: 0,
      segundo: 0,
      terceiro: 0
    }
  },

  // LUVA DE OURO
  luva_ouro: {
    descricao: "Ranking de goleiros",
    habilitado: true,
    premiacao: {
      primeiro: 0,
      segundo: 0,
      terceiro: 0
    }
  },

  // CARDS DESABILITADOS NO FRONTEND
  cards_desabilitados: ["mata-mata", "pontos-corridos", "melhor-mes"],

  // TEMPORADA 2025
  temporada_2025: {
    status: "finalizada",
    rodada_final: 38,
    data_encerramento: "2025-12-11T02:31:05.184Z",
    cache_permanente: true
  }
};

// =============================================================================
// CONEXÃO E MIGRAÇÃO
// =============================================================================

async function conectarMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI não definida no .env');
  }
  await mongoose.connect(uri);
  console.log('✅ Conectado ao MongoDB');
}

async function migrarConfiguracoes() {
  const db = mongoose.connection.db;
  const ligasCollection = db.collection('ligas');

  console.log('\n📦 Iniciando migração das configurações...\n');

  // MIGRAR SUPERCARTOLA
  console.log('1️⃣ Atualizando Super Cartola 2025...');
  const resultSC = await ligasCollection.updateOne(
    { _id: new mongoose.Types.ObjectId(LIGA_SUPERCARTOLA) },
    {
      $set: {
        configuracoes: CONFIGURACOES_SUPERCARTOLA,
        atualizadaEm: new Date()
      }
    }
  );
  console.log(`   ✅ Matched: ${resultSC.matchedCount}, Modified: ${resultSC.modifiedCount}`);

  // MIGRAR SOBRAL
  console.log('2️⃣ Atualizando Cartoleiros do Sobral...');
  const resultSobral = await ligasCollection.updateOne(
    { _id: new mongoose.Types.ObjectId(LIGA_SOBRAL) },
    {
      $set: {
        configuracoes: CONFIGURACOES_SOBRAL,
        atualizadaEm: new Date()
      }
    }
  );
  console.log(`   ✅ Matched: ${resultSobral.matchedCount}, Modified: ${resultSobral.modifiedCount}`);

  // VERIFICAR
  console.log('\n🔍 Verificando migração...\n');

  const superCartola = await ligasCollection.findOne(
    { _id: new mongoose.Types.ObjectId(LIGA_SUPERCARTOLA) },
    { projection: { nome: 1, 'configuracoes.ranking_rodada.descricao': 1, 'configuracoes.top10.habilitado': 1 } }
  );
  console.log('Super Cartola:', JSON.stringify(superCartola, null, 2));

  const sobral = await ligasCollection.findOne(
    { _id: new mongoose.Types.ObjectId(LIGA_SOBRAL) },
    { projection: { nome: 1, 'configuracoes.ranking_rodada.descricao': 1, 'configuracoes.top10.habilitado': 1 } }
  );
  console.log('Cartoleiros Sobral:', JSON.stringify(sobral, null, 2));

  console.log('\n✅ MIGRAÇÃO CONCLUÍDA!\n');
}

async function main() {
  try {
    await conectarMongo();
    await migrarConfiguracoes();
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

main();

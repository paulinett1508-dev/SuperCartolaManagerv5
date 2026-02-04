#!/usr/bin/env node

/**
 * 🔧 SCRIPT: Adicionar Índices para Performance de Ligas
 *
 * Objetivo: Resolver problema de "Carregando ligas..." travando
 *
 * Índices adicionados:
 * 1. ExtratoFinanceiroCache: liga_id + temporada (agregação de temporadas)
 * 2. InscricaoTemporada: liga_id + temporada (contagem de inscrições)
 * 3. InscricaoTemporada: liga_id + status + temporada (filtro de novos)
 *
 * Uso:
 *   node scripts/add-indexes-ligas-performance.js
 *   node scripts/add-indexes-ligas-performance.js --dry-run
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';
import InscricaoTemporada from '../models/InscricaoTemporada.js';

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

// ==============================
// ÍNDICES A SEREM CRIADOS
// ==============================

const INDEXES = [
  {
    model: 'ExtratoFinanceiroCache',
    collection: 'extratofinanceirocaches',
    indexes: [
      {
        fields: { liga_id: 1, temporada: 1 },
        options: {
          name: 'idx_ligaid_temporada',
          background: true
        },
        description: 'Otimiza agregação de temporadas por liga'
      }
    ]
  },
  {
    model: 'InscricaoTemporada',
    collection: 'inscricoestemporadas',
    indexes: [
      {
        fields: { liga_id: 1, temporada: 1 },
        options: {
          name: 'idx_ligaid_temporada',
          background: true
        },
        description: 'Otimiza contagem de inscrições por liga/temporada'
      },
      {
        fields: { liga_id: 1, status: 1, temporada: 1 },
        options: {
          name: 'idx_ligaid_status_temporada',
          background: true
        },
        description: 'Otimiza filtro de novos participantes'
      }
    ]
  }
];

// ==============================
// FUNÇÕES AUXILIARES
// ==============================

function log(message, type = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    dry: '🔍'
  };
  console.log(`${icons[type]} ${message}`);
}

async function checkExistingIndexes(collection, indexName) {
  try {
    const indexes = await mongoose.connection.db
      .collection(collection)
      .listIndexes()
      .toArray();

    return indexes.some(idx => idx.name === indexName);
  } catch (error) {
    // Collection pode não existir ainda
    return false;
  }
}

async function analyzeQueryPerformance(collection, pipeline) {
  try {
    const result = await mongoose.connection.db
      .collection(collection)
      .aggregate(pipeline, { explain: true })
      .toArray();

    return result[0]?.executionStats || null;
  } catch (error) {
    log(`Erro ao analisar performance: ${error.message}`, 'warning');
    return null;
  }
}

async function collectionExists(collection) {
  try {
    const collections = await mongoose.connection.db.listCollections({ name: collection }).toArray();
    return collections.length > 0;
  } catch (error) {
    return false;
  }
}

async function getCollectionStats(collection) {
  try {
    const stats = await mongoose.connection.db
      .collection(collection)
      .stats();

    return {
      count: stats.count || 0,
      size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
      avgObjSize: (stats.avgObjSize / 1024).toFixed(2) + ' KB'
    };
  } catch (error) {
    return { count: 0, size: '0 MB', avgObjSize: '0 KB' };
  }
}

// ==============================
// MAIN
// ==============================

async function main() {
  console.log('\n' + '='.repeat(60));
  log('ADICIONAR ÍNDICES PARA PERFORMANCE DE LIGAS', 'info');
  console.log('='.repeat(60) + '\n');

  if (isDryRun) {
    log('Modo DRY-RUN ativo (nenhuma alteração será feita)', 'dry');
  }

  try {
    // Conectar ao MongoDB
    log('Conectando ao MongoDB...', 'info');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGO_URI ou MONGODB_URI não definido no .env');
    }

    await mongoose.connect(mongoUri);
    log('Conectado com sucesso!', 'success');

    console.log('\n📊 ANÁLISE DAS COLLECTIONS\n');

    // Analisar cada collection
    let totalIndexesCreated = 0;
    let totalIndexesSkipped = 0;

    for (const config of INDEXES) {
      console.log(`\n${'─'.repeat(60)}`);
      log(`Collection: ${config.collection}`, 'info');
      console.log('─'.repeat(60));

      // Verificar se collection existe
      const exists = await collectionExists(config.collection);
      if (!exists) {
        log(`Collection não existe ainda, será criada quando necessário`, 'warning');
        console.log(`  Índices serão criados automaticamente quando collection for populada`);
        continue;
      }

      // Estatísticas da collection
      const stats = await getCollectionStats(config.collection);
      console.log(`  Documentos: ${stats.count}`);
      console.log(`  Tamanho: ${stats.size}`);
      console.log(`  Tamanho médio/doc: ${stats.avgObjSize}`);

      // Listar índices existentes
      let existingIndexes = [];
      try {
        existingIndexes = await mongoose.connection.db
          .collection(config.collection)
          .listIndexes()
          .toArray();
      } catch (error) {
        log(`Erro ao listar índices: ${error.message}`, 'warning');
      }

      console.log(`\n  Índices existentes: ${existingIndexes.length}`);
      existingIndexes.forEach(idx => {
        console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });

      // Processar cada índice
      for (const indexConfig of config.indexes) {
        console.log(`\n  🔧 Processando índice: ${indexConfig.options.name}`);
        console.log(`     Descrição: ${indexConfig.description}`);
        console.log(`     Campos: ${JSON.stringify(indexConfig.fields)}`);

        // Verificar se já existe
        const exists = await checkExistingIndexes(
          config.collection,
          indexConfig.options.name
        );

        if (exists) {
          log(`Índice já existe, pulando...`, 'warning');
          totalIndexesSkipped++;
          continue;
        }

        // Criar índice
        if (isDryRun) {
          log(`[DRY-RUN] Índice seria criado`, 'dry');
        } else {
          try {
            log(`Criando índice...`, 'info');

            await mongoose.connection.db
              .collection(config.collection)
              .createIndex(indexConfig.fields, indexConfig.options);

            log(`Índice criado com sucesso!`, 'success');
            totalIndexesCreated++;

            // Aguardar um pouco entre criações
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            log(`Erro ao criar índice: ${error.message}`, 'error');
          }
        }
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO FINAL');
    console.log('='.repeat(60));
    console.log(`✅ Índices criados: ${totalIndexesCreated}`);
    console.log(`⏭️  Índices já existiam: ${totalIndexesSkipped}`);

    if (isDryRun) {
      console.log('\n🔍 DRY-RUN: Nenhuma alteração foi feita');
      console.log('Execute sem --dry-run para aplicar as mudanças');
    } else if (totalIndexesCreated > 0) {
      console.log('\n✅ Índices criados com sucesso!');
      console.log('\n💡 Recomendações:');
      console.log('   1. Monitore a performance da rota /api/ligas');
      console.log('   2. Tempo de resposta esperado: < 2 segundos');
      console.log('   3. Verifique logs: tail -f /tmp/server.log | grep "[LIGAS]"');
    } else {
      console.log('\n⏭️  Todos os índices já existiam');
    }

    // Análise de performance (opcional)
    if (!isDryRun && totalIndexesCreated > 0) {
      console.log('\n📊 ANÁLISE DE PERFORMANCE');
      console.log('='.repeat(60));

      log('Testando query de temporadas por liga...', 'info');
      const testPipeline = [
        {
          $addFields: {
            liga_id_str: { $toString: "$liga_id" }
          }
        },
        {
          $group: {
            _id: { liga_id: "$liga_id_str", temporada: "$temporada" }
          }
        },
        {
          $group: {
            _id: "$_id.liga_id",
            temporadas: { $addToSet: "$_id.temporada" }
          }
        }
      ];

      const perfStats = await analyzeQueryPerformance(
        'extratofinanceirocaches',
        testPipeline
      );

      if (perfStats) {
        console.log(`  Docs examinados: ${perfStats.totalDocsExamined || 'N/A'}`);
        console.log(`  Tempo de execução: ${perfStats.executionTimeMillis || 'N/A'}ms`);
        console.log(`  Índice usado: ${perfStats.totalKeysExamined > 0 ? 'SIM' : 'NÃO'}`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    log(`Erro fatal: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('Desconectado do MongoDB', 'info');
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});

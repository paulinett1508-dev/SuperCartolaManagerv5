/**
 * Script: criar-indices-avisos.js
 * Cria índices otimizados para a collection 'avisos'
 */

import connectDB, { getDB } from '../config/database.js';

async function criarIndices() {
  try {
    await connectDB();
    const db = getDB();

    console.log('🔧 Criando índices para collection "avisos"...\n');

    // Índice composto para queries participante
    await db.collection('avisos').createIndex({
      ativo: 1,
      sincronizadoComApp: 1,
      dataExpiracao: 1
    }, { name: 'idx_avisos_participante' });
    console.log('✅ Índice composto criado: idx_avisos_participante');

    // Índice de segmentação
    await db.collection('avisos').createIndex({
      ligaId: 1,
      timeId: 1
    }, { name: 'idx_avisos_segmentacao' });
    console.log('✅ Índice de segmentação criado: idx_avisos_segmentacao');

    // TTL index para expiração automática
    await db.collection('avisos').createIndex(
      { dataExpiracao: 1 },
      {
        expireAfterSeconds: 0,
        name: 'idx_avisos_ttl'
      }
    );
    console.log('✅ TTL Index criado: idx_avisos_ttl (expira automaticamente)');

    console.log('\n✅ Todos os índices de avisos criados com sucesso!');

    // Listar índices criados
    const indices = await db.collection('avisos').indexes();
    console.log('\n📊 Índices atuais na collection "avisos":');
    indices.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    process.exit(1);
  }
}

criarIndices();

#!/usr/bin/env node
/**
 * SCRIPT: Atualizar admin_id de todas as ligas
 *
 * Problema: Ligas sem admin_id ou com admin_id diferente não aparecem
 * no dashboard para admins não-super devido ao filtro de tenant.
 *
 * Solução: Atualizar todas as ligas para terem o admin_id correto.
 *
 * Uso:
 *   node scripts/atualizar-admin-id-ligas.js --dry-run
 *   NODE_ENV=production node scripts/atualizar-admin-id-ligas.js --force
 *
 * @version 1.0.0
 */

import mongoose from 'mongoose';
import Liga from '../models/Liga.js';
import connectDB from '../config/database.js';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

// Admin ID correto (paulinett1508@gmail.com)
const ADMIN_ID_CORRETO = '69815ae6507b1bb44c1ef7b8';
const ADMIN_EMAIL = 'paulinett1508@gmail.com';

// Parse argumentos
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForced = args.includes('--force');
const isProd = process.env.NODE_ENV === 'production';

// ============================================================================
// VALIDAÇÕES DE SEGURANÇA
// ============================================================================

if (isProd && !isForced && !isDryRun) {
  console.error('❌ ERRO: Produção requer --force ou --dry-run');
  console.error('');
  console.error('Uso correto:');
  console.error('  node scripts/atualizar-admin-id-ligas.js --dry-run');
  console.error('  NODE_ENV=production node scripts/atualizar-admin-id-ligas.js --force');
  process.exit(1);
}

if (!isDryRun && !isForced) {
  console.error('❌ ERRO: Você deve usar --dry-run (testar) ou --force (executar)');
  console.error('');
  console.error('Uso:');
  console.error('  --dry-run : Simula sem modificar o banco');
  console.error('  --force   : Executa a atualização real');
  process.exit(1);
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

async function atualizarAdminId() {
  try {
    console.log('🔧 ATUALIZAÇÃO DE admin_id NAS LIGAS');
    console.log('=====================================\n');

    if (isDryRun) {
      console.log('🧪 MODO: DRY-RUN (simulação, sem alterações)');
    } else {
      console.log('⚡ MODO: PRODUÇÃO (alterações reais!)');
    }

    console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
    console.log(`🆔 Admin ID: ${ADMIN_ID_CORRETO}`);
    console.log('');

    // Conectar ao banco
    console.log('🔍 Conectando ao MongoDB...\n');
    await connectDB();

    const adminIdObj = new mongoose.Types.ObjectId(ADMIN_ID_CORRETO);

    // ========================================================================
    // 1. ESTATÍSTICAS ANTES
    // ========================================================================
    console.log('📊 ESTADO ATUAL DO BANCO:\n');

    const totalLigas = await Liga.countDocuments({});
    console.log(`   Total de ligas: ${totalLigas}`);

    const comAdminIdCorreto = await Liga.countDocuments({ admin_id: adminIdObj });
    console.log(`   ✅ Com admin_id correto: ${comAdminIdCorreto}`);

    const comAdminIdDiferente = await Liga.countDocuments({
      admin_id: { $exists: true, $ne: adminIdObj }
    });
    console.log(`   ⚠️  Com admin_id diferente: ${comAdminIdDiferente}`);

    const semAdminId = await Liga.countDocuments({
      $or: [
        { admin_id: { $exists: false } },
        { admin_id: null }
      ]
    });
    console.log(`   ❌ Sem admin_id: ${semAdminId}`);
    console.log('');

    // ========================================================================
    // 2. BUSCAR LIGAS A SEREM ATUALIZADAS
    // ========================================================================
    const ligasParaAtualizar = await Liga.find({
      $or: [
        { admin_id: { $exists: false } },
        { admin_id: null },
        { admin_id: { $ne: adminIdObj } }
      ]
    }).select('_id nome temporada admin_id owner_email').lean();

    if (ligasParaAtualizar.length === 0) {
      console.log('✅ Nenhuma liga precisa ser atualizada!');
      console.log('   Todas já têm o admin_id correto.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`🎯 LIGAS A SEREM ATUALIZADAS: ${ligasParaAtualizar.length}\n`);

    ligasParaAtualizar.forEach((liga, index) => {
      console.log(`   ${index + 1}. ${liga.nome} (Temporada ${liga.temporada})`);
      console.log(`      ID: ${liga._id}`);
      console.log(`      Admin ID atual: ${liga.admin_id || '❌ não tem'}`);
      console.log(`      Owner Email: ${liga.owner_email || 'N/D'}`);
      console.log('');
    });

    // ========================================================================
    // 3. EXECUTAR ATUALIZAÇÃO (ou simular)
    // ========================================================================
    if (isDryRun) {
      console.log('🧪 DRY-RUN: Simulando atualização...\n');
      console.log(`   ✅ ${ligasParaAtualizar.length} ligas SERIAM atualizadas`);
      console.log(`   🆔 admin_id seria definido como: ${ADMIN_ID_CORRETO}`);
      console.log(`   📧 owner_email seria definido como: ${ADMIN_EMAIL}`);
      console.log('');
      console.log('💡 Para executar de verdade, use:');
      console.log(`   NODE_ENV=production node scripts/atualizar-admin-id-ligas.js --force`);
    } else {
      console.log('⚡ EXECUTANDO ATUALIZAÇÃO...\n');

      const resultado = await Liga.updateMany(
        {
          $or: [
            { admin_id: { $exists: false } },
            { admin_id: null },
            { admin_id: { $ne: adminIdObj } }
          ]
        },
        {
          $set: {
            admin_id: adminIdObj,
            owner_email: ADMIN_EMAIL,
            atualizado_em: new Date()
          }
        }
      );

      console.log(`   ✅ Ligas atualizadas: ${resultado.modifiedCount}`);
      console.log(`   📝 Matched: ${resultado.matchedCount}`);
      console.log('');

      // Verificar resultado
      const aposAtualizacao = await Liga.countDocuments({ admin_id: adminIdObj });
      console.log(`📊 APÓS ATUALIZAÇÃO:`);
      console.log(`   ✅ Ligas com admin_id correto: ${aposAtualizacao}`);
      console.log('');

      if (aposAtualizacao === totalLigas) {
        console.log('🎉 SUCESSO! Todas as ligas agora têm o admin_id correto!');
      } else {
        console.log(`⚠️  ATENÇÃO: ${totalLigas - aposAtualizacao} ligas ainda sem admin_id correto`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Script concluído!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ============================================================================
// EXECUTAR
// ============================================================================
atualizarAdminId();

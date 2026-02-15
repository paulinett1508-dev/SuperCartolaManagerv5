#!/usr/bin/env node
/**
 * Script para verificar estado do campo admin_id nas ligas
 * Uso: node scripts/check-admin-id.js
 */

import mongoose from 'mongoose';
import Liga from '../models/Liga.js';
import connectDB from '../config/database.js';

async function checkAdminId() {
  try {
    console.log('🔍 Conectando ao MongoDB...\n');
    await connectDB();

    // Total de ligas
    const total = await Liga.countDocuments({});
    console.log(`📊 Total de ligas no banco: ${total}`);

    // Ligas COM admin_id
    const comAdminId = await Liga.countDocuments({
      admin_id: { $exists: true, $ne: null }
    });
    console.log(`✅ Ligas COM admin_id: ${comAdminId}`);

    // Ligas SEM admin_id
    const semAdminId = total - comAdminId;
    console.log(`❌ Ligas SEM admin_id: ${semAdminId}`);

    // Exemplo de liga SEM admin_id
    const exemploSem = await Liga.findOne({
      admin_id: { $exists: false }
    }).select('_id nome temporada').lean();

    if (exemploSem) {
      console.log('\n📋 Exemplo de liga SEM admin_id:');
      console.log(`   ID: ${exemploSem._id}`);
      console.log(`   Nome: ${exemploSem.nome}`);
      console.log(`   Temporada: ${exemploSem.temporada}`);
    }

    // Exemplo de liga COM admin_id (se existir)
    const exemploCom = await Liga.findOne({
      admin_id: { $exists: true, $ne: null }
    }).select('_id nome admin_id owner_email').lean();

    if (exemploCom) {
      console.log('\n📋 Exemplo de liga COM admin_id:');
      console.log(`   ID: ${exemploCom._id}`);
      console.log(`   Nome: ${exemploCom.nome}`);
      console.log(`   Admin ID: ${exemploCom.admin_id}`);
      console.log(`   Owner Email: ${exemploCom.owner_email || 'N/D'}`);
    }

    // Verificar admin_id específico que está sendo buscado
    const adminIdBuscado = new mongoose.Types.ObjectId('69815ae6507b1bb44c1ef7b8');
    const ligasDoAdmin = await Liga.countDocuments({ admin_id: adminIdBuscado });

    console.log(`\n🎯 Ligas com admin_id=69815ae6507b1bb44c1ef7b8: ${ligasDoAdmin}`);

    if (ligasDoAdmin === 0) {
      console.log('   ⚠️  PROBLEMA: Nenhuma liga tem esse admin_id!');
      console.log('   💡 Solução: Atualizar ligas para incluir esse admin_id');
    }

    await mongoose.disconnect();
    console.log('\n✅ Verificação concluída!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkAdminId();

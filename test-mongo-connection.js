#!/usr/bin/env node
/**
 * Test MongoDB Connection
 * Testa conexão direta ao MongoDB Atlas
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load .env
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI não configurada no .env');
  process.exit(1);
}

console.log('🔗 Testando conexão ao MongoDB...');
console.log('📍 URI:', MONGO_URI.replace(/:[^:@]+@/, ':***@')); // Hide password
console.log('');

const client = new MongoClient(MONGO_URI, {
  serverSelectionTimeoutMS: 10000, // 10 segundos
  connectTimeoutMS: 10000,
});

async function testConnection() {
  try {
    console.log('⏳ Conectando...');
    await client.connect();

    console.log('✅ CONEXÃO ESTABELECIDA!');
    console.log('');

    // Test database
    const db = client.db('cartola-manager');
    console.log('📦 Database:', db.databaseName);

    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📂 Collections encontradas:', collections.length);

    if (collections.length > 0) {
      console.log('');
      console.log('📋 Primeiras 10 collections:');
      collections.slice(0, 10).forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }

    console.log('');
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');

  } catch (error) {
    console.error('');
    console.error('❌ ERRO NA CONEXÃO:');
    console.error('   Tipo:', error.name);
    console.error('   Mensagem:', error.message);

    if (error.cause) {
      console.error('   Causa:', error.cause.message);
    }

    console.error('');
    console.error('🔍 Diagnóstico:');

    if (error.message.includes('ECONNREFUSED')) {
      console.error('   → Firewall ou DNS bloqueando conexão');
      console.error('   → Verifique se porta 27017 está liberada');
    } else if (error.message.includes('authentication failed')) {
      console.error('   → Senha incorreta no MongoDB Atlas');
    } else if (error.message.includes('Could not connect to any servers')) {
      console.error('   → Cluster pode estar pausado ou indisponível');
    } else {
      console.error('   → Erro desconhecido');
    }

    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();

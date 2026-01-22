#!/usr/bin/env node
/**
 * fix-senhas-vazias.js
 *
 * Script para corrigir participantes com senha_acesso vazia/null
 * Define a senha padrao "acessocartola" para todos os casos
 *
 * Uso:
 *   node scripts/fix-senhas-vazias.js --dry-run    # Simula sem alterar
 *   node scripts/fix-senhas-vazias.js --force      # Executa correcoes
 *
 * @author Code Inspector
 * @date 2026-01-22
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

// Configuracoes
const SENHA_PADRAO = 'acessocartola';
const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, symbol, msg) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${msg}`);
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  FIX SENHAS VAZIAS - Super Cartola Manager');
  console.log('='.repeat(60) + '\n');

  // Validar argumentos
  if (!isDryRun && !isForce) {
    log('yellow', '[!]', 'Use --dry-run para simular ou --force para executar');
    process.exit(1);
  }

  if (isDryRun) {
    log('cyan', '[DRY-RUN]', 'Modo simulacao - nenhuma alteracao sera feita\n');
  } else {
    log('yellow', '[FORCE]', 'Modo execucao - alteracoes serao aplicadas\n');
  }

  // Conectar ao MongoDB
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    log('red', '[ERRO]', 'MONGO_URI nao configurada');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    log('green', '[OK]', 'Conectado ao MongoDB\n');

    const db = mongoose.connection.db;

    // ========================================
    // FASE 1: Analisar ligas.participantes
    // ========================================
    log('blue', '[1/3]', 'Analisando participantes nas ligas...\n');

    const ligas = await db.collection('ligas').find({}).toArray();

    let totalParticipantes = 0;
    let participantesSemSenha = [];

    for (const liga of ligas) {
      if (!liga.participantes || !Array.isArray(liga.participantes)) continue;

      for (const p of liga.participantes) {
        totalParticipantes++;

        // Verificar se senha esta vazia/null/undefined
        const senhaMissing = !p.senha_acesso || p.senha_acesso.trim() === '';

        if (senhaMissing) {
          participantesSemSenha.push({
            liga_id: liga._id,
            liga_nome: liga.nome,
            time_id: p.time_id,
            nome_cartola: p.nome_cartola || 'N/D',
            nome_time: p.nome_time || 'N/D',
            senha_atual: p.senha_acesso
          });
        }
      }
    }

    console.log(`  Total de participantes analisados: ${totalParticipantes}`);
    console.log(`  Participantes SEM senha: ${participantesSemSenha.length}\n`);

    if (participantesSemSenha.length > 0) {
      console.log('  Participantes afetados:');
      console.log('  ' + '-'.repeat(56));

      for (const p of participantesSemSenha) {
        console.log(`  ${colors.yellow}[!]${colors.reset} ${p.nome_cartola} (${p.nome_time})`);
        console.log(`      Liga: ${p.liga_nome}`);
        console.log(`      Time ID: ${p.time_id}`);
        console.log(`      Senha atual: "${p.senha_atual || ''}"\n`);
      }
    }

    // ========================================
    // FASE 2: Analisar collection times
    // ========================================
    log('blue', '[2/3]', 'Analisando collection times...\n');

    const timesSemSenha = await db.collection('times').find({
      $or: [
        { senha_acesso: null },
        { senha_acesso: '' },
        { senha_acesso: { $exists: false } }
      ]
    }).toArray();

    console.log(`  Times SEM senha na collection: ${timesSemSenha.length}\n`);

    if (timesSemSenha.length > 0) {
      console.log('  Times afetados:');
      console.log('  ' + '-'.repeat(56));

      for (const t of timesSemSenha) {
        console.log(`  ${colors.yellow}[!]${colors.reset} ${t.nome_cartoleiro || t.nome || 'N/D'} (${t.nome_time || 'N/D'})`);
        console.log(`      ID: ${t.id}, Temporada: ${t.temporada || 'N/D'}\n`);
      }
    }

    // ========================================
    // FASE 3: Aplicar correcoes
    // ========================================
    if (isDryRun) {
      log('cyan', '\n[DRY-RUN]', 'Simulacao concluida. Nenhuma alteracao feita.');
      log('cyan', '[INFO]', `Execute com --force para corrigir ${participantesSemSenha.length + timesSemSenha.length} registros`);
    } else {
      log('blue', '[3/3]', 'Aplicando correcoes...\n');

      let corrigidosLiga = 0;
      let corrigidosTimes = 0;

      // Corrigir nas ligas
      for (const p of participantesSemSenha) {
        const result = await db.collection('ligas').updateOne(
          {
            _id: p.liga_id,
            'participantes.time_id': p.time_id
          },
          {
            $set: { 'participantes.$.senha_acesso': SENHA_PADRAO }
          }
        );

        if (result.modifiedCount > 0) {
          corrigidosLiga++;
          log('green', '[OK]', `Liga: ${p.nome_cartola} (time_id: ${p.time_id})`);
        }
      }

      // Corrigir na collection times
      for (const t of timesSemSenha) {
        const result = await db.collection('times').updateOne(
          { _id: t._id },
          { $set: { senha_acesso: SENHA_PADRAO } }
        );

        if (result.modifiedCount > 0) {
          corrigidosTimes++;
          log('green', '[OK]', `Times: ${t.nome_cartoleiro || t.nome} (id: ${t.id})`);
        }
      }

      console.log('\n' + '='.repeat(60));
      log('green', '[RESULTADO]', `Corrigidos ${corrigidosLiga} participantes em ligas`);
      log('green', '[RESULTADO]', `Corrigidos ${corrigidosTimes} registros em times`);
      log('green', '[SENHA]', `Senha definida: "${SENHA_PADRAO}"`);
      console.log('='.repeat(60) + '\n');
    }

  } catch (error) {
    log('red', '[ERRO]', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('blue', '[INFO]', 'Desconectado do MongoDB');
  }
}

main();

/**
 * Script para Sincronizar Caches DEV com PROD
 *
 * Copia/atualiza caches de extrato financeiro do PROD para o DEV
 * para os participantes identificados com problemas.
 *
 * @version 1.0.0
 */

import mongoose from "mongoose";

// Configurações
const DEV_URI = process.env.MONGO_URI_DEV;
const PROD_URI = process.env.MONGO_URI;

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function conectar(uri, nome) {
  const conn = await mongoose.createConnection(uri).asPromise();
  console.log(`${colors.green}✅ Conectado ao banco ${nome}${colors.reset}`);
  return conn;
}

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  SINCRONIZAÇÃO DE CACHES DEV ← PROD${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}\n`);

  // Conectar aos dois bancos
  const devConn = await conectar(DEV_URI, "DEV");
  const prodConn = await conectar(PROD_URI, "PROD");

  const devDb = devConn.db;
  const prodDb = prodConn.db;

  // Participantes identificados com problemas (time_ids corrigidos)
  const participantesParaCorrigir = [
    {
      nome: "CHS EC",
      time_id: 14747183,
      ligaNome: "Cartoleiros do Sobral",
      problema: "sem_cache_dev",
    },
    {
      nome: "Urubu Play F.C.",
      time_id: 13935277,
      ligaNome: "Cartoleiros do Sobral",
      problema: "desatualizado",
    },
    {
      nome: "RB Ousadia&Alegria 94",
      time_id: 20165417,
      ligaNome: "Super Cartola 2025",
      problema: "faltando_rodada_38",
    },
  ];

  let corrigidos = 0;
  let erros = 0;

  for (const p of participantesParaCorrigir) {
    console.log(`\n${colors.bold}🔧 Corrigindo: ${p.nome}${colors.reset}`);
    console.log(`   Liga: ${p.ligaNome}`);
    console.log(`   Time ID: ${p.time_id}`);
    console.log(`   Problema: ${p.problema}`);

    try {
      // Buscar cache no PROD
      const cacheProd = await prodDb.collection("extratofinanceirocaches").findOne({
        time_id: p.time_id,
      });

      if (!cacheProd) {
        console.log(`   ${colors.red}❌ Cache não encontrado no PROD${colors.reset}`);
        erros++;
        continue;
      }

      console.log(`   ${colors.blue}📊 Cache PROD: ${cacheProd.historico_transacoes?.length || 0} rodadas, R${cacheProd.ultima_rodada_consolidada}${colors.reset}`);

      // Buscar cache no DEV
      const cacheDev = await devDb.collection("extratofinanceirocaches").findOne({
        time_id: p.time_id,
      });

      if (cacheDev) {
        console.log(`   ${colors.yellow}📊 Cache DEV existente: ${cacheDev.historico_transacoes?.length || 0} rodadas, R${cacheDev.ultima_rodada_consolidada}${colors.reset}`);

        // Substituir cache DEV pelo PROD
        const resultado = await devDb.collection("extratofinanceirocaches").replaceOne(
          { _id: cacheDev._id },
          {
            ...cacheProd,
            _id: cacheDev._id, // Manter o _id original do DEV
            updated_at: new Date(),
            sync_from_prod: true,
            sync_date: new Date(),
          }
        );

        if (resultado.modifiedCount > 0) {
          console.log(`   ${colors.green}✅ Cache atualizado com sucesso!${colors.reset}`);
          corrigidos++;
        } else {
          console.log(`   ${colors.red}❌ Falha ao atualizar cache${colors.reset}`);
          erros++;
        }
      } else {
        console.log(`   ${colors.yellow}📊 Cache DEV não existe, criando novo...${colors.reset}`);

        // Criar novo cache no DEV (copiando do PROD)
        const novoCache = {
          ...cacheProd,
          _id: new mongoose.Types.ObjectId(), // Novo ID
          created_at: new Date(),
          updated_at: new Date(),
          sync_from_prod: true,
          sync_date: new Date(),
        };

        const resultado = await devDb.collection("extratofinanceirocaches").insertOne(novoCache);

        if (resultado.insertedId) {
          console.log(`   ${colors.green}✅ Cache criado com sucesso! ID: ${resultado.insertedId}${colors.reset}`);
          corrigidos++;
        } else {
          console.log(`   ${colors.red}❌ Falha ao criar cache${colors.reset}`);
          erros++;
        }
      }
    } catch (error) {
      console.log(`   ${colors.red}❌ Erro: ${error.message}${colors.reset}`);
      erros++;
    }
  }

  // Resumo final
  console.log(`\n${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  RESUMO${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}\n`);

  console.log(`   Total a corrigir: ${participantesParaCorrigir.length}`);
  console.log(`   ${colors.green}Corrigidos: ${corrigidos}${colors.reset}`);
  console.log(`   ${colors.red}Erros: ${erros}${colors.reset}`);

  // Fechar conexões
  await devConn.close();
  await prodConn.close();

  console.log(`\n${colors.green}✅ Sincronização concluída!${colors.reset}\n`);
}

main().catch(console.error);

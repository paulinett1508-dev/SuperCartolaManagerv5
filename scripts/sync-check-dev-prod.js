/**
 * Script de Verificação de Sincronismo DEV vs PROD
 *
 * Compara os caches de extrato financeiro entre os bancos de desenvolvimento
 * e produção, identificando discrepâncias.
 *
 * @version 1.0.0
 */

import mongoose from "mongoose";

// Configurações
const DEV_URI = process.env.MONGO_URI_DEV;
const PROD_URI = process.env.MONGO_URI;
const RODADA_FINAL_2025 = 38;

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

async function buscarLigas(db) {
  return await db.collection("ligas").find({}).toArray();
}

async function buscarCaches(db, ligaId) {
  const ObjectId = mongoose.Types.ObjectId;
  return await db.collection("extratofinanceirocaches").find({
    liga_id: new ObjectId(ligaId),
  }).toArray();
}

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  VERIFICAÇÃO DE SINCRONISMO DEV vs PROD${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}\n`);

  // Conectar aos dois bancos
  const devConn = await conectar(DEV_URI, "DEV");
  const prodConn = await conectar(PROD_URI, "PROD");

  const devDb = devConn.db;
  const prodDb = prodConn.db;

  // Buscar ligas do PROD (fonte da verdade)
  const ligasProd = await buscarLigas(prodDb);
  console.log(`\n${colors.blue}📊 Encontradas ${ligasProd.length} ligas no PROD${colors.reset}\n`);

  const relatorio = {
    totalLigas: ligasProd.length,
    totalParticipantes: 0,
    participantesSincronizados: 0,
    participantesDesatualizados: [],
    participantesSemCacheDev: [],
    participantesSemCacheProd: [],
    ligasAnalisadas: [],
  };

  // Analisar cada liga
  for (const liga of ligasProd) {
    const ligaId = liga._id.toString();
    const ligaNome = liga.nome || "Sem nome";
    const participantes = liga.participantes || [];

    console.log(`\n${colors.bold}📋 Liga: ${ligaNome}${colors.reset}`);
    console.log(`   ID: ${ligaId}`);
    console.log(`   Participantes: ${participantes.length}`);

    const cachesDev = await buscarCaches(devDb, ligaId);
    const cachesProd = await buscarCaches(prodDb, ligaId);

    // Criar mapas para lookup rápido
    const cachesDevMap = new Map(cachesDev.map(c => [c.time_id, c]));
    const cachesProdMap = new Map(cachesProd.map(c => [c.time_id, c]));

    let ligaSincronizada = true;
    const ligaInfo = {
      nome: ligaNome,
      id: ligaId,
      participantes: participantes.length,
      cachesDev: cachesDev.length,
      cachesProd: cachesProd.length,
      problemas: [],
    };

    // Verificar cada participante
    for (const p of participantes) {
      const timeId = p.time_id;
      const nomeTime = p.nome_time || p.nome_cartola || `Time ${timeId}`;
      relatorio.totalParticipantes++;

      const cacheDev = cachesDevMap.get(timeId);
      const cacheProd = cachesProdMap.get(timeId);

      // Sem cache no DEV
      if (!cacheDev && cacheProd) {
        ligaSincronizada = false;
        relatorio.participantesSemCacheDev.push({
          ligaId,
          ligaNome,
          timeId,
          nomeTime,
          rodadasProd: cacheProd.historico_transacoes?.length || 0,
        });
        ligaInfo.problemas.push(`❌ ${nomeTime}: sem cache no DEV`);
        continue;
      }

      // Sem cache no PROD (estranho, mas verificar)
      if (cacheDev && !cacheProd) {
        ligaSincronizada = false;
        relatorio.participantesSemCacheProd.push({
          ligaId,
          ligaNome,
          timeId,
          nomeTime,
          rodadasDev: cacheDev.historico_transacoes?.length || 0,
        });
        ligaInfo.problemas.push(`⚠️ ${nomeTime}: sem cache no PROD`);
        continue;
      }

      // Sem cache em ambos
      if (!cacheDev && !cacheProd) {
        ligaInfo.problemas.push(`⚪ ${nomeTime}: sem cache em ambos`);
        continue;
      }

      // Comparar rodadas
      const rodadasDev = cacheDev.historico_transacoes?.length || 0;
      const rodadasProd = cacheProd.historico_transacoes?.length || 0;
      const ultimaRodadaDev = cacheDev.ultima_rodada_consolidada || 0;
      const ultimaRodadaProd = cacheProd.ultima_rodada_consolidada || 0;

      if (rodadasDev !== rodadasProd || ultimaRodadaDev !== ultimaRodadaProd) {
        ligaSincronizada = false;
        relatorio.participantesDesatualizados.push({
          ligaId,
          ligaNome,
          timeId,
          nomeTime,
          rodadasDev,
          rodadasProd,
          ultimaRodadaDev,
          ultimaRodadaProd,
          faltando: ultimaRodadaProd - ultimaRodadaDev,
        });
        ligaInfo.problemas.push(
          `🔄 ${nomeTime}: DEV=${rodadasDev}r (R${ultimaRodadaDev}) vs PROD=${rodadasProd}r (R${ultimaRodadaProd})`
        );
      } else if (ultimaRodadaDev < RODADA_FINAL_2025) {
        // Sincronizado mas não tem rodada final
        ligaInfo.problemas.push(
          `⚠️ ${nomeTime}: sincronizado mas só até R${ultimaRodadaDev} (falta até R${RODADA_FINAL_2025})`
        );
      } else {
        relatorio.participantesSincronizados++;
      }
    }

    if (ligaSincronizada && ligaInfo.problemas.length === 0) {
      console.log(`   ${colors.green}✅ Todos sincronizados até R${RODADA_FINAL_2025}${colors.reset}`);
    } else {
      console.log(`   ${colors.yellow}⚠️ Problemas encontrados:${colors.reset}`);
      ligaInfo.problemas.forEach(p => console.log(`      ${p}`));
    }

    relatorio.ligasAnalisadas.push(ligaInfo);
  }

  // Resumo final
  console.log(`\n${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  RESUMO FINAL${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}\n`);

  console.log(`${colors.blue}📊 Estatísticas:${colors.reset}`);
  console.log(`   Total de ligas: ${relatorio.totalLigas}`);
  console.log(`   Total de participantes: ${relatorio.totalParticipantes}`);
  console.log(`   ${colors.green}Sincronizados: ${relatorio.participantesSincronizados}${colors.reset}`);
  console.log(`   ${colors.yellow}Desatualizados: ${relatorio.participantesDesatualizados.length}${colors.reset}`);
  console.log(`   ${colors.red}Sem cache DEV: ${relatorio.participantesSemCacheDev.length}${colors.reset}`);
  console.log(`   ${colors.red}Sem cache PROD: ${relatorio.participantesSemCacheProd.length}${colors.reset}`);

  // Listar desatualizados
  if (relatorio.participantesDesatualizados.length > 0) {
    console.log(`\n${colors.yellow}🔄 Participantes desatualizados no DEV:${colors.reset}`);
    relatorio.participantesDesatualizados.forEach(p => {
      console.log(`   - ${p.nomeTime} (${p.ligaNome}): DEV R${p.ultimaRodadaDev} → PROD R${p.ultimaRodadaProd} (faltam ${p.faltando} rodadas)`);
    });
  }

  // Listar sem cache DEV
  if (relatorio.participantesSemCacheDev.length > 0) {
    console.log(`\n${colors.red}❌ Participantes sem cache no DEV:${colors.reset}`);
    relatorio.participantesSemCacheDev.forEach(p => {
      console.log(`   - ${p.nomeTime} (${p.ligaNome}): PROD tem ${p.rodadasProd} rodadas`);
    });
  }

  // Fechar conexões
  await devConn.close();
  await prodConn.close();

  console.log(`\n${colors.green}✅ Análise concluída!${colors.reset}\n`);

  return relatorio;
}

main().catch(console.error);

/**
 * Script para remover time placeholder (645089) de toda a base
 *
 * Uso:
 *   node scripts/remover-time-placeholder.js --dry-run    # Apenas mostra o que seria removido
 *   node scripts/remover-time-placeholder.js --force      # Executa a remoção
 */

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
const TIME_ID_REMOVER = 645089;

const isDryRun = process.argv.includes('--dry-run');
const isForced = process.argv.includes('--force');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  REMOÇÃO DE TIME PLACEHOLDER${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}\n`);

  console.log(`Time ID a remover: ${colors.red}${TIME_ID_REMOVER}${colors.reset}`);
  console.log(`Modo: ${isDryRun ? colors.yellow + 'DRY-RUN (simulação)' : colors.red + 'EXECUÇÃO REAL'}${colors.reset}\n`);

  if (!isDryRun && !isForced) {
    console.log(`${colors.red}❌ Requer --dry-run ou --force${colors.reset}`);
    process.exit(1);
  }

  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  console.log(`${colors.green}✅ Conectado ao banco${colors.reset}\n`);

  const db = conn.db;
  const relatorio = {
    encontrados: [],
    removidos: []
  };

  // 1. Ligas - remover do array participantes e times
  console.log(`${colors.bold}1. Verificando collection 'ligas'...${colors.reset}`);

  const ligas = await db.collection("ligas").find({
    $or: [
      { "participantes.time_id": TIME_ID_REMOVER },
      { "times": TIME_ID_REMOVER }
    ]
  }).toArray();

  for (const liga of ligas) {
    const temParticipante = liga.participantes?.some(p => p.time_id === TIME_ID_REMOVER);
    const temTime = liga.times?.includes(TIME_ID_REMOVER);

    console.log(`   Liga: ${liga.nome}`);
    console.log(`     - Em participantes: ${temParticipante ? 'SIM' : 'não'}`);
    console.log(`     - Em times: ${temTime ? 'SIM' : 'não'}`);

    relatorio.encontrados.push({
      collection: "ligas",
      documento: liga.nome,
      local: temParticipante ? "participantes" : "times"
    });

    if (!isDryRun) {
      await db.collection("ligas").updateOne(
        { _id: liga._id },
        {
          $pull: {
            participantes: { time_id: TIME_ID_REMOVER },
            times: TIME_ID_REMOVER
          }
        }
      );
      console.log(`     ${colors.green}✅ Removido${colors.reset}`);
      relatorio.removidos.push({ collection: "ligas", liga: liga.nome });
    }
  }

  // 2. extratofinanceirocaches
  console.log(`\n${colors.bold}2. Verificando collection 'extratofinanceirocaches'...${colors.reset}`);

  const extratoCaches = await db.collection("extratofinanceirocaches").find({
    time_id: TIME_ID_REMOVER
  }).toArray();

  console.log(`   Encontrados: ${extratoCaches.length} documento(s)`);

  for (const cache of extratoCaches) {
    relatorio.encontrados.push({
      collection: "extratofinanceirocaches",
      documento: cache._id.toString(),
      liga_id: cache.liga_id?.toString()
    });

    if (!isDryRun) {
      await db.collection("extratofinanceirocaches").deleteOne({ _id: cache._id });
      console.log(`   ${colors.green}✅ Removido cache${colors.reset}`);
      relatorio.removidos.push({ collection: "extratofinanceirocaches", id: cache._id.toString() });
    }
  }

  // 3. rankinggeralcaches
  console.log(`\n${colors.bold}3. Verificando collection 'rankinggeralcaches'...${colors.reset}`);

  const rankingCaches = await db.collection("rankinggeralcaches").find({
    "ranking.timeId": TIME_ID_REMOVER
  }).toArray();

  console.log(`   Encontrados em ranking: ${rankingCaches.length} documento(s)`);

  for (const cache of rankingCaches) {
    relatorio.encontrados.push({
      collection: "rankinggeralcaches",
      documento: cache._id.toString()
    });

    if (!isDryRun) {
      await db.collection("rankinggeralcaches").updateOne(
        { _id: cache._id },
        { $pull: { ranking: { timeId: TIME_ID_REMOVER } } }
      );
      console.log(`   ${colors.green}✅ Removido do ranking${colors.reset}`);
      relatorio.removidos.push({ collection: "rankinggeralcaches", id: cache._id.toString() });
    }
  }

  // 4. top10caches
  console.log(`\n${colors.bold}4. Verificando collection 'top10caches'...${colors.reset}`);

  const top10Caches = await db.collection("top10caches").find({
    $or: [
      { "historico.mitos.time_id": TIME_ID_REMOVER },
      { "historico.micos.time_id": TIME_ID_REMOVER }
    ]
  }).toArray();

  console.log(`   Encontrados: ${top10Caches.length} documento(s)`);

  for (const cache of top10Caches) {
    relatorio.encontrados.push({
      collection: "top10caches",
      documento: cache._id.toString()
    });

    if (!isDryRun) {
      // Atualizar cada rodada no histórico
      const historico = cache.historico || [];
      for (let i = 0; i < historico.length; i++) {
        historico[i].mitos = historico[i].mitos?.filter(m => m.time_id !== TIME_ID_REMOVER) || [];
        historico[i].micos = historico[i].micos?.filter(m => m.time_id !== TIME_ID_REMOVER) || [];
      }

      await db.collection("top10caches").updateOne(
        { _id: cache._id },
        { $set: { historico: historico } }
      );
      console.log(`   ${colors.green}✅ Removido do top10${colors.reset}`);
      relatorio.removidos.push({ collection: "top10caches", id: cache._id.toString() });
    }
  }

  // 5. pontoscorridoscaches
  console.log(`\n${colors.bold}5. Verificando collection 'pontoscorridoscaches'...${colors.reset}`);

  const pcCaches = await db.collection("pontoscorridoscaches").find({
    "classificacao.time_id": TIME_ID_REMOVER
  }).toArray();

  console.log(`   Encontrados: ${pcCaches.length} documento(s)`);

  for (const cache of pcCaches) {
    relatorio.encontrados.push({
      collection: "pontoscorridoscaches",
      documento: cache._id.toString()
    });

    if (!isDryRun) {
      const classificacao = cache.classificacao?.filter(c => c.time_id !== TIME_ID_REMOVER) || [];
      await db.collection("pontoscorridoscaches").updateOne(
        { _id: cache._id },
        { $set: { classificacao: classificacao } }
      );
      console.log(`   ${colors.green}✅ Removido da classificação${colors.reset}`);
      relatorio.removidos.push({ collection: "pontoscorridoscaches", id: cache._id.toString() });
    }
  }

  // 6. matamatacaches
  console.log(`\n${colors.bold}6. Verificando collection 'matamatacaches'...${colors.reset}`);

  const mmCaches = await db.collection("matamatacaches").find({
    $or: [
      { "rodadas.confrontos.time1_id": TIME_ID_REMOVER },
      { "rodadas.confrontos.time2_id": TIME_ID_REMOVER }
    ]
  }).toArray();

  console.log(`   Encontrados: ${mmCaches.length} documento(s)`);

  if (mmCaches.length > 0) {
    relatorio.encontrados.push({
      collection: "matamatacaches",
      nota: "Confrontos com time placeholder encontrados"
    });
  }

  // 7. times (collection direta)
  console.log(`\n${colors.bold}7. Verificando collection 'times'...${colors.reset}`);

  const times = await db.collection("times").find({
    $or: [
      { id: TIME_ID_REMOVER },
      { time_id: TIME_ID_REMOVER }
    ]
  }).toArray();

  console.log(`   Encontrados: ${times.length} documento(s)`);

  for (const time of times) {
    relatorio.encontrados.push({
      collection: "times",
      documento: time._id.toString(),
      nome: time.nome_time || time.nome
    });

    if (!isDryRun) {
      await db.collection("times").deleteOne({ _id: time._id });
      console.log(`   ${colors.green}✅ Removido time${colors.reset}`);
      relatorio.removidos.push({ collection: "times", id: time._id.toString() });
    }
  }

  // 8. rodadasnapshots
  console.log(`\n${colors.bold}8. Verificando collection 'rodadasnapshots'...${colors.reset}`);

  const snapshots = await db.collection("rodadasnapshots").find({
    "participantes.time_id": TIME_ID_REMOVER
  }).toArray();

  console.log(`   Encontrados: ${snapshots.length} documento(s)`);

  for (const snap of snapshots) {
    relatorio.encontrados.push({
      collection: "rodadasnapshots",
      rodada: snap.rodada
    });

    if (!isDryRun) {
      const participantes = snap.participantes?.filter(p => p.time_id !== TIME_ID_REMOVER) || [];
      await db.collection("rodadasnapshots").updateOne(
        { _id: snap._id },
        { $set: { participantes: participantes } }
      );
      console.log(`   ${colors.green}✅ Removido do snapshot R${snap.rodada}${colors.reset}`);
      relatorio.removidos.push({ collection: "rodadasnapshots", rodada: snap.rodada });
    }
  }

  // 9. acertofinanceiros
  console.log(`\n${colors.bold}9. Verificando collection 'acertofinanceiros'...${colors.reset}`);

  const acertos = await db.collection("acertofinanceiros").find({
    "participantes.time_id": TIME_ID_REMOVER
  }).toArray();

  console.log(`   Encontrados: ${acertos.length} documento(s)`);

  for (const acerto of acertos) {
    relatorio.encontrados.push({
      collection: "acertofinanceiros",
      rodada: acerto.rodada
    });

    if (!isDryRun) {
      const participantes = acerto.participantes?.filter(p => p.time_id !== TIME_ID_REMOVER) || [];
      await db.collection("acertofinanceiros").updateOne(
        { _id: acerto._id },
        { $set: { participantes: participantes } }
      );
      console.log(`   ${colors.green}✅ Removido do acerto R${acerto.rodada}${colors.reset}`);
      relatorio.removidos.push({ collection: "acertofinanceiros", rodada: acerto.rodada });
    }
  }

  // Resumo
  console.log(`\n${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  RESUMO${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}\n`);

  console.log(`Total de ocorrências encontradas: ${relatorio.encontrados.length}`);

  if (isDryRun) {
    console.log(`\n${colors.yellow}⚠️ Modo DRY-RUN: Nenhuma alteração foi feita${colors.reset}`);
    console.log(`Execute com --force para aplicar as remoções`);
  } else {
    console.log(`${colors.green}Total removido: ${relatorio.removidos.length}${colors.reset}`);
  }

  await conn.close();
  console.log(`\n${colors.green}✅ Operação concluída!${colors.reset}\n`);
}

main().catch(console.error);

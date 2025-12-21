/**
 * Script para investigar dados do RB Ousadia na rodada 38
 */

import mongoose from "mongoose";

const PROD_URI = process.env.MONGO_URI;

async function main() {
  const conn = await mongoose.createConnection(PROD_URI).asPromise();
  const db = conn.db;

  const ligaIdStr = "684cb1c8af923da7c7df51de";
  const ligaIdObj = new mongoose.Types.ObjectId(ligaIdStr);
  const timeId = 20165417;

  console.log("=== Investigando RB Ousadia (time_id: " + timeId + ") ===\n");

  // Buscar ranking geral
  let ranking = await db.collection("rankinggeralcaches").findOne({ ligaId: ligaIdStr });
  if (!ranking) {
    ranking = await db.collection("rankinggeralcaches").findOne({ ligaId: ligaIdObj });
  }

  if (ranking) {
    console.log("Ranking Geral Cache encontrado:");
    console.log("  rodadaFinal:", ranking.rodadaFinal);
    console.log("  Total no ranking:", ranking.ranking?.length);

    const rb = ranking.ranking?.find(p => p.time_id === timeId || p.timeId === timeId);
    if (rb) {
      console.log("\n  RB Ousadia no ranking geral:");
      console.log(JSON.stringify(rb, null, 2));
    } else {
      console.log("  RB não encontrado no ranking");
    }
  } else {
    console.log("Ranking geral cache não encontrado");
  }

  // Verificar todos os caches para essa liga
  console.log("\n=== Verificando outros caches ===");

  // Top10
  const top10 = await db.collection("top10caches").findOne({
    $or: [{ liga_id: ligaIdObj }, { ligaId: ligaIdStr }]
  });
  if (top10) {
    console.log("\nTop10 Cache:");
    console.log("  ultima_rodada:", top10.ultima_rodada);
    const hist38 = top10.historico?.find(h => h.rodada === 38);
    if (hist38) {
      console.log("  Rodada 38 no histórico: SIM");
    }
  }

  // Verificar caches de outros participantes com R38 para ver a estrutura
  const cacheComR38 = await db.collection("extratofinanceirocaches").findOne({
    liga_id: ligaIdObj,
    ultima_rodada_consolidada: 38
  });

  if (cacheComR38) {
    console.log("\n=== Exemplo de cache com R38 (para comparação) ===");
    const trans38 = cacheComR38.historico_transacoes?.find(t => t.rodada === 38);
    if (trans38) {
      console.log("Transação R38:", JSON.stringify(trans38, null, 2));
    }
  }

  // Buscar cache do RB
  const rbCache = await db.collection("extratofinanceirocaches").findOne({
    liga_id: ligaIdObj,
    time_id: timeId
  });

  if (rbCache) {
    console.log("\n=== Cache RB Ousadia ===");
    console.log("  ultima_rodada_consolidada:", rbCache.ultima_rodada_consolidada);
    console.log("  Saldo consolidado:", rbCache.saldo_consolidado);

    const ultimaTrans = rbCache.historico_transacoes?.slice(-1)[0];
    console.log("  Última transação:", JSON.stringify(ultimaTrans, null, 2));
  }

  // Verificar se existe uma "rodada 38" snapshot em algum lugar
  console.log("\n=== Buscando dados brutos da R38 ===");

  // Verificar acertos financeiros
  const acerto38 = await db.collection("acertofinanceiros").findOne({
    liga_id: ligaIdObj,
    rodada: 38
  });

  if (acerto38) {
    console.log("\nAcerto Financeiro R38 encontrado");
    const rbAcerto = acerto38.participantes?.find(p => p.time_id === timeId);
    if (rbAcerto) {
      console.log("RB no acerto:", JSON.stringify(rbAcerto, null, 2));
    }
  }

  await conn.close();
  console.log("\n✅ Investigação concluída");
}

main().catch(console.error);

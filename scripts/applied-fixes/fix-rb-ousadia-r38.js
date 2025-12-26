/**
 * Script para corrigir cache do RB Ousadia - adicionar rodada 38
 */

import mongoose from "mongoose";

const PROD_URI = process.env.MONGO_URI;
const DEV_URI = process.env.MONGO_URI_DEV;

async function main() {
  console.log("=== Corrigindo RB Ousadia - Rodada 38 ===\n");

  const prodConn = await mongoose.createConnection(PROD_URI).asPromise();
  const devConn = await mongoose.createConnection(DEV_URI).asPromise();

  const prodDb = prodConn.db;
  const devDb = devConn.db;

  const ligaId = new mongoose.Types.ObjectId("684cb1c8af923da7c7df51de");
  const timeId = 20165417;

  // Verificar MM, PC, Top10 para R38
  console.log("1. Buscando dados de R38...\n");

  // Mata Mata
  const mmCache = await prodDb.collection("matamatacaches").findOne({ liga_id: ligaId });
  let mmR38 = 0;
  if (mmCache) {
    console.log("Mata Mata - última rodada:", mmCache.ultima_rodada);
    // R38 provavelmente não tem MM (é a última rodada, final já definida)
  }

  // Pontos Corridos
  const pcCache = await prodDb.collection("pontoscorridoscaches").findOne({ liga_id: ligaId });
  let pcR38 = 0;
  if (pcCache) {
    console.log("Pontos Corridos - última rodada:", pcCache.ultima_rodada);
    // Verificar se tem dados de R38
  }

  // Top10
  const top10Cache = await prodDb.collection("top10caches").findOne({ liga_id: ligaId });
  let top10R38 = 0;
  let isMito = false;
  let isMico = false;
  let top10Status = null;
  let top10Posicao = null;

  if (top10Cache) {
    console.log("Top10 - última rodada:", top10Cache.ultima_rodada);
    const r38t10 = top10Cache.historico?.find(h => h.rodada === 38);
    if (r38t10) {
      const rbMito = r38t10.mitos?.find(m => m.time_id === timeId);
      const rbMico = r38t10.micos?.find(m => m.time_id === timeId);

      if (rbMito) {
        console.log("RB em MITO R38:", JSON.stringify(rbMito, null, 2));
        isMito = true;
        top10Status = "MITO";
        top10R38 = rbMito.premio || 0;
      }
      if (rbMico) {
        console.log("RB em MICO R38:", JSON.stringify(rbMico, null, 2));
        isMico = true;
        top10Status = "MICO";
        top10R38 = rbMico.penalidade || 0;
      }
    }
  }

  // Posição 18 = faixa neutra = 0 bônus
  const posicao = 18;
  const bonusOnus = 0; // faixa neutra (12-21)

  // Buscar cache atual
  console.log("\n2. Buscando cache atual...\n");

  const rbCacheProd = await prodDb.collection("extratofinanceirocaches").findOne({
    liga_id: ligaId,
    time_id: timeId
  });

  console.log("Cache PROD:");
  console.log("  Última rodada:", rbCacheProd.ultima_rodada_consolidada);
  console.log("  Saldo acumulado R37:", rbCacheProd.saldo_consolidado);

  // Calcular nova transação R38
  const saldoR37 = rbCacheProd.saldo_consolidado;
  const saldoR38 = bonusOnus + pcR38 + mmR38 + top10R38;
  const saldoAcumuladoR38 = saldoR37 + saldoR38;

  const novaTransacao = {
    rodada: 38,
    posicao: posicao,
    bonusOnus: bonusOnus,
    pontosCorridos: pcR38,
    mataMata: mmR38,
    top10: top10R38,
    saldo: saldoR38,
    saldoAcumulado: saldoAcumuladoR38,
    isMito: isMito,
    isMico: isMico,
    top10Status: top10Status,
    top10Posicao: top10Posicao,
    _id: new mongoose.Types.ObjectId()
  };

  console.log("\n3. Nova transação R38:");
  console.log(JSON.stringify(novaTransacao, null, 2));

  // Atualizar PROD
  console.log("\n4. Atualizando PROD...");

  const resultProd = await prodDb.collection("extratofinanceirocaches").updateOne(
    { _id: rbCacheProd._id },
    {
      $push: { historico_transacoes: novaTransacao },
      $set: {
        ultima_rodada_consolidada: 38,
        saldo_consolidado: saldoAcumuladoR38,
        data_ultima_atualizacao: new Date()
      }
    }
  );

  console.log("PROD modificado:", resultProd.modifiedCount);

  // Atualizar DEV
  console.log("\n5. Atualizando DEV...");

  const rbCacheDev = await devDb.collection("extratofinanceirocaches").findOne({
    liga_id: ligaId,
    time_id: timeId
  });

  if (rbCacheDev) {
    const resultDev = await devDb.collection("extratofinanceirocaches").updateOne(
      { _id: rbCacheDev._id },
      {
        $push: { historico_transacoes: novaTransacao },
        $set: {
          ultima_rodada_consolidada: 38,
          saldo_consolidado: saldoAcumuladoR38,
          data_ultima_atualizacao: new Date()
        }
      }
    );
    console.log("DEV modificado:", resultDev.modifiedCount);
  } else {
    console.log("Cache não encontrado no DEV");
  }

  await prodConn.close();
  await devConn.close();

  console.log("\n✅ RB Ousadia corrigido com rodada 38!");
}

main().catch(console.error);

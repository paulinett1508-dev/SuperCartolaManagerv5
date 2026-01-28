/**
 * Script para remover um participante de toda a base
 *
 * Uso:
 *   node scripts/remover-participante.js --time-id 1049837 --dry-run
 *   node scripts/remover-participante.js --time-id 1049837 --force
 *
 * Opcoes:
 *   --liga-id <id>       Limita a remocao a uma liga especifica
 *   --temporada <ano>    Limita a remocao a uma temporada (quando aplicavel)
 *   --purge-datalake     Remove dumps do Data Lake (cartolaoficialdumps)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isForced = args.includes("--force");
const purgeDatalake = args.includes("--purge-datalake");

function getArgValue(name) {
  const exact = `--${name}`;
  const idx = args.findIndex((a) => a === exact);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const withEq = args.find((a) => a.startsWith(`${exact}=`));
  if (withEq) return withEq.split("=")[1];
  return null;
}

const timeIdArg =
  getArgValue("time-id") || getArgValue("id") || args.find((a) => !a.startsWith("--"));
const ligaIdArg = getArgValue("liga-id");
const temporadaArg = getArgValue("temporada") || getArgValue("season");

if (!timeIdArg) {
  console.error("❌ Informe --time-id");
  process.exit(1);
}

const timeIdNum = Number(timeIdArg);
if (Number.isNaN(timeIdNum)) {
  console.error("❌ time-id invalido (precisa ser numero)");
  process.exit(1);
}

if (!isDryRun && !isForced) {
  console.error("❌ Use --dry-run para simular ou --force para executar");
  process.exit(1);
}

const timeIdStr = String(timeIdNum);
const timeIdCandidates = [timeIdNum, timeIdStr];

const temporadaNum = temporadaArg ? Number(temporadaArg) : null;
if (temporadaArg && Number.isNaN(temporadaNum)) {
  console.error("❌ temporada invalida");
  process.exit(1);
}

const ligaIdCandidates = [];
if (ligaIdArg) {
  ligaIdCandidates.push(ligaIdArg);
  if (mongoose.isValidObjectId(ligaIdArg)) {
    ligaIdCandidates.push(new mongoose.Types.ObjectId(ligaIdArg));
  }
}

const matchTimeId = (value) => value !== undefined && String(value) === timeIdStr;

function inc(map, key, value) {
  map[key] = (map[key] || 0) + value;
}

async function deleteByQuery(db, collection, query, report, label) {
  const count = await db.collection(collection).countDocuments(query);
  inc(report.encontrados, label || collection, count);
  if (!isDryRun && count > 0) {
    const res = await db.collection(collection).deleteMany(query);
    inc(report.removidos, label || collection, res.deletedCount);
  }
}

async function updateArrayField(db, collection, query, arrayField, report) {
  const docs = await db.collection(collection).find(query).toArray();
  inc(report.encontrados, collection, docs.length);
  for (const doc of docs) {
    const original = Array.isArray(doc[arrayField]) ? doc[arrayField] : [];
    const filtered = original.filter(
      (item) =>
        !matchTimeId(item?.timeId) &&
        !matchTimeId(item?.time_id) &&
        !matchTimeId(item?.id) &&
        !matchTimeId(item?.participanteId),
    );
    if (!isDryRun && filtered.length !== original.length) {
      await db.collection(collection).updateOne(
        { _id: doc._id },
        { $set: { [arrayField]: filtered } },
      );
      inc(report.removidos, collection, 1);
    }
  }
}

async function main() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI nao configurada");
    process.exit(1);
  }

  console.log("========================================");
  console.log("REMOVER PARTICIPANTE");
  console.log("========================================");
  console.log(`time_id: ${timeIdNum}`);
  if (ligaIdArg) console.log(`liga_id: ${ligaIdArg}`);
  if (temporadaNum) console.log(`temporada: ${temporadaNum}`);
  console.log(`modo: ${isDryRun ? "DRY-RUN" : "EXECUCAO"}`);
  console.log(`purge datalake: ${purgeDatalake ? "SIM" : "NAO"}`);
  console.log("========================================\n");

  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  const db = conn.db;

  const report = { encontrados: {}, removidos: {} };

  // 1) ligas - remover de participantes e times
  const ligaQuery = {
    $or: [
      { "participantes.time_id": { $in: timeIdCandidates } },
      { times: { $in: timeIdCandidates } },
    ],
  };
  if (ligaIdCandidates.length > 0) {
    ligaQuery._id = { $in: ligaIdCandidates };
  }

  const ligas = await db.collection("ligas").find(ligaQuery).toArray();
  inc(report.encontrados, "ligas", ligas.length);
  for (const liga of ligas) {
    const temParticipante = liga.participantes?.some((p) => matchTimeId(p?.time_id));
    const temTime = Array.isArray(liga.times) && liga.times.some((t) => matchTimeId(t));

    console.log(`Liga: ${liga.nome} (${liga._id})`);
    console.log(`  participantes: ${temParticipante ? "SIM" : "nao"}`);
    console.log(`  times: ${temTime ? "SIM" : "nao"}`);

    if (!isDryRun) {
      await db.collection("ligas").updateOne(
        { _id: liga._id },
        {
          $pull: {
            participantes: { time_id: { $in: timeIdCandidates } },
            times: { $in: timeIdCandidates },
          },
        },
      );
      inc(report.removidos, "ligas", 1);
    }
  }

  // 2) inscricoes temporada
  const inscricoesQuery = {
    time_id: { $in: timeIdCandidates },
  };
  if (ligaIdCandidates.length > 0) {
    inscricoesQuery.liga_id = { $in: ligaIdCandidates };
  }
  if (temporadaNum) {
    inscricoesQuery.temporada = temporadaNum;
  }
  await deleteByQuery(db, "inscricoestemporada", inscricoesQuery, report);

  // 3) times
  await deleteByQuery(
    db,
    "times",
    { $or: [{ id: { $in: timeIdCandidates } }, { time_id: { $in: timeIdCandidates } }] },
    report,
  );

  // 4) extratos (duas colecoes)
  const extratoQuery = { time_id: { $in: timeIdCandidates } };
  if (ligaIdCandidates.length > 0) extratoQuery.liga_id = { $in: ligaIdCandidates };
  if (temporadaNum) extratoQuery.temporada = temporadaNum;
  await deleteByQuery(db, "extratofinanceirocaches", extratoQuery, report);
  await deleteByQuery(db, "extrato_financeiro_caches", extratoQuery, report);

  // 5) rodadas (docs por participante)
  const rodadasQuery = { $or: [{ timeId: { $in: timeIdCandidates } }, { time_id: { $in: timeIdCandidates } }] };
  if (ligaIdCandidates.length > 0) rodadasQuery.ligaId = { $in: ligaIdCandidates };
  if (temporadaNum) rodadasQuery.temporada = temporadaNum;
  await deleteByQuery(db, "rodadas", rodadasQuery, report);

  // 6) goleiros / gols / golsconsolidados
  const goleirosQuery = { participanteId: { $in: timeIdCandidates } };
  if (ligaIdCandidates.length > 0) goleirosQuery.ligaId = { $in: ligaIdCandidates };
  await deleteByQuery(db, "goleiros", goleirosQuery, report);

  const golsQuery = { $or: [{ timeId: { $in: timeIdCandidates } }, { time_id: { $in: timeIdCandidates } }] };
  if (ligaIdCandidates.length > 0) golsQuery.ligaId = { $in: ligaIdCandidates };
  await deleteByQuery(db, "gols", golsQuery, report);
  await deleteByQuery(db, "golsconsolidados", golsQuery, report);

  // 7) ranking geral / turno / turnos / pontos corridos
  const rankingQuery = {};
  if (ligaIdCandidates.length > 0) rankingQuery.ligaId = { $in: ligaIdCandidates };
  if (temporadaNum) rankingQuery.temporada = temporadaNum;
  await updateArrayField(db, "rankinggeralcaches", rankingQuery, "ranking", report);

  const rankingTurnoQuery = {};
  if (ligaIdCandidates.length > 0) rankingTurnoQuery.liga_id = { $in: ligaIdCandidates };
  await updateArrayField(db, "ranking_turno_caches", rankingTurnoQuery, "ranking", report);

  const rankingTurnosQuery = {};
  if (ligaIdCandidates.length > 0) rankingTurnosQuery.ligaId = { $in: ligaIdCandidates };
  await updateArrayField(db, "rankingturnos", rankingTurnosQuery, "ranking", report);

  const pcQuery = {};
  if (ligaIdCandidates.length > 0) pcQuery.liga_id = { $in: ligaIdCandidates };
  await updateArrayField(db, "pontoscorridoscaches", pcQuery, "classificacao", report);

  // 8) top10caches (historico.mitos/micos)
  const top10Query = {};
  if (ligaIdCandidates.length > 0) top10Query.liga_id = { $in: ligaIdCandidates };
  const top10Docs = await db.collection("top10caches").find(top10Query).toArray();
  inc(report.encontrados, "top10caches", top10Docs.length);
  for (const doc of top10Docs) {
    const historico = Array.isArray(doc.historico) ? doc.historico : [];
    let changed = false;
    const novoHistorico = historico.map((h) => {
      const mitos = Array.isArray(h.mitos) ? h.mitos : [];
      const micos = Array.isArray(h.micos) ? h.micos : [];
      const mitosFiltrados = mitos.filter(
        (m) => !matchTimeId(m?.time_id) && !matchTimeId(m?.timeId) && !matchTimeId(m?.id),
      );
      const micosFiltrados = micos.filter(
        (m) => !matchTimeId(m?.time_id) && !matchTimeId(m?.timeId) && !matchTimeId(m?.id),
      );
      if (mitosFiltrados.length !== mitos.length || micosFiltrados.length !== micos.length) {
        changed = true;
      }
      return { ...h, mitos: mitosFiltrados, micos: micosFiltrados };
    });

    if (!isDryRun && changed) {
      await db.collection("top10caches").updateOne(
        { _id: doc._id },
        { $set: { historico: novoHistorico } },
      );
      inc(report.removidos, "top10caches", 1);
    }
  }

  // 9) melhor_mes_cache (edicoes[].ranking)
  const mmQuery = {};
  if (ligaIdCandidates.length > 0) mmQuery.ligaId = { $in: ligaIdCandidates };
  const mmDocs = await db.collection("melhor_mes_cache").find(mmQuery).toArray();
  inc(report.encontrados, "melhor_mes_cache", mmDocs.length);
  for (const doc of mmDocs) {
    const edicoes = Array.isArray(doc.edicoes) ? doc.edicoes : [];
    let changed = false;
    const novasEdicoes = edicoes.map((ed) => {
      const ranking = Array.isArray(ed.ranking) ? ed.ranking : [];
      const filtrado = ranking.filter(
        (r) =>
          !matchTimeId(r?.timeId) &&
          !matchTimeId(r?.time_id) &&
          !matchTimeId(r?.id) &&
          !matchTimeId(r?.participanteId),
      );
      if (filtrado.length !== ranking.length) changed = true;
      return { ...ed, ranking: filtrado };
    });

    if (!isDryRun && changed) {
      await db.collection("melhor_mes_cache").updateOne(
        { _id: doc._id },
        { $set: { edicoes: novasEdicoes } },
      );
      inc(report.removidos, "melhor_mes_cache", 1);
    }
  }

  // 10) artilheirocampeaos (dados[])
  const artQuery = {};
  if (ligaIdCandidates.length > 0) artQuery.ligaId = { $in: ligaIdCandidates };
  const artDocs = await db.collection("artilheirocampeaos").find(artQuery).toArray();
  inc(report.encontrados, "artilheirocampeaos", artDocs.length);
  for (const doc of artDocs) {
    const dados = Array.isArray(doc.dados) ? doc.dados : [];
    const filtrado = dados.filter(
      (d) =>
        !matchTimeId(d?.timeId) &&
        !matchTimeId(d?.time_id) &&
        !matchTimeId(d?.id) &&
        !matchTimeId(d?.participanteId),
    );
    if (!isDryRun && filtrado.length !== dados.length) {
      await db.collection("artilheirocampeaos").updateOne(
        { _id: doc._id },
        { $set: { dados: filtrado } },
      );
      inc(report.removidos, "artilheirocampeaos", 1);
    }
  }

  // 11) rodadasnapshots (participantes[])
  const snapQuery = {};
  if (ligaIdCandidates.length > 0) snapQuery.ligaId = { $in: ligaIdCandidates };
  const snaps = await db.collection("rodadasnapshots").find(snapQuery).toArray();
  inc(report.encontrados, "rodadasnapshots", snaps.length);
  for (const snap of snaps) {
    const participantes = Array.isArray(snap.participantes) ? snap.participantes : [];
    const filtrado = participantes.filter(
      (p) =>
        !matchTimeId(p?.time_id) &&
        !matchTimeId(p?.timeId) &&
        !matchTimeId(p?.id) &&
        !matchTimeId(p?.participanteId),
    );
    if (!isDryRun && filtrado.length !== participantes.length) {
      await db.collection("rodadasnapshots").updateOne(
        { _id: snap._id },
        { $set: { participantes: filtrado } },
      );
      inc(report.removidos, "rodadasnapshots", 1);
    }
  }

  // 12) acertofinanceiros (participantes[])
  const acertoQuery = {};
  if (ligaIdCandidates.length > 0) acertoQuery.liga_id = { $in: ligaIdCandidates };
  const acertos = await db.collection("acertofinanceiros").find(acertoQuery).toArray();
  inc(report.encontrados, "acertofinanceiros", acertos.length);
  for (const acerto of acertos) {
    const participantes = Array.isArray(acerto.participantes) ? acerto.participantes : [];
    const filtrado = participantes.filter(
      (p) =>
        !matchTimeId(p?.time_id) &&
        !matchTimeId(p?.timeId) &&
        !matchTimeId(p?.id) &&
        !matchTimeId(p?.participanteId),
    );
    if (!isDryRun && filtrado.length !== participantes.length) {
      await db.collection("acertofinanceiros").updateOne(
        { _id: acerto._id },
        { $set: { participantes: filtrado } },
      );
      inc(report.removidos, "acertofinanceiros", 1);
    }
  }

  // 13) Data Lake (opcional)
  if (purgeDatalake) {
    const dlQuery = { time_id: { $in: timeIdCandidates } };
    if (temporadaNum) dlQuery.temporada = temporadaNum;
    await deleteByQuery(db, "cartolaoficialdumps", dlQuery, report);
    await deleteByQuery(db, "cartola_oficial_dumps", dlQuery, report);
  } else {
    console.log("\n[INFO] Data Lake preservado (use --purge-datalake para remover).");
  }

  console.log("\n========================================");
  console.log("RESUMO");
  console.log("========================================");
  console.log("Encontrados:");
  Object.entries(report.encontrados).forEach(([k, v]) => console.log(`  - ${k}: ${v}`));
  if (isDryRun) {
    console.log("\nDRY-RUN: nenhuma alteracao foi feita.");
  } else {
    console.log("\nRemovidos:");
    Object.entries(report.removidos).forEach(([k, v]) => console.log(`  - ${k}: ${v}`));
  }
  console.log("========================================\n");

  await conn.close();
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});

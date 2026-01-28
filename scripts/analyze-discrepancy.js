import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const ligaId = new mongoose.Types.ObjectId("684cb1c8af923da7c7df51de");

  // 1. Contar participantes em liga.participantes
  const liga = await db.collection("ligas").findOne({ _id: ligaId });
  console.log("=== ANÁLISE DE DISCREPÂNCIA ===\n");
  console.log("1. liga.participantes.length:", liga.participantes?.length || 0);
  console.log("   liga.times.length:", liga.times?.length || 0);

  // 2. Contar inscricoes para 2026
  const inscricoes2026 = await db.collection("inscricoestemporada").find({
    liga_id: ligaId,
    temporada: 2026
  }).toArray();
  console.log("\n2. inscricoestemporada (2026):", inscricoes2026.length);

  // 3. Breakdown por status
  const byStatus = {};
  inscricoes2026.forEach(i => {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });
  console.log("   Breakdown por status:", byStatus);

  // 4. Identificar participantes em liga.participantes que NAO estao em inscricoestemporada
  const inscritosIds = new Set(inscricoes2026.map(i => i.time_id));
  const participantesSemInscricao = (liga.participantes || []).filter(p => {
    return inscritosIds.has(p.time_id) === false;
  });

  console.log("\n3. Participantes em liga.participantes SEM inscricao 2026:", participantesSemInscricao.length);
  if (participantesSemInscricao.length > 0) {
    participantesSemInscricao.forEach(p => {
      console.log("   -", p.nome_cartola || p.nome_time, "(ID:", p.time_id, ")");
    });
  }

  // 5. Verificar se ha inscricoes que NAO estao em liga.participantes
  const participantesIds = new Set((liga.participantes || []).map(p => p.time_id));
  const inscricoesSemParticipante = inscricoes2026.filter(i => {
    return participantesIds.has(i.time_id) === false;
  });

  console.log("\n4. Inscricoes 2026 SEM registro em liga.participantes:", inscricoesSemParticipante.length);
  if (inscricoesSemParticipante.length > 0) {
    inscricoesSemParticipante.forEach(i => {
      console.log("   -", i.dados_participante?.nome_cartoleiro || "N/D", "(ID:", i.time_id, ") Status:", i.status);
    });
  }

  await mongoose.disconnect();
})();

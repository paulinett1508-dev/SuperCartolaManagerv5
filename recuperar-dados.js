import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const LIGA_ID = "684d821cf1a7ae16d1f89572";

const VALORES_BANCO = {
  1: 7.0,
  2: 4.0,
  3: 0.0,
  4: -2.0,
  5: -5.0,
  6: -10.0,
};

async function recuperar() {
  // Conectar usando mesma configuração do sistema
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 50,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    console.log("Conectado ao MongoDB\n");

    const db = mongoose.connection.db;

    const snapshots = await db
      .collection("rodadasnapshots")
      .find({ liga_id: LIGA_ID })
      .sort({ rodada: 1 })
      .toArray();

    console.log(`Encontrados ${snapshots.length} snapshots\n`);

    let totalRecuperados = 0;

    for (const snap of snapshots) {
      const rodada = snap.rodada;
      const rankingRodada = snap.dados_consolidados?.ranking_rodada || [];
      const rankingGeral = snap.dados_consolidados?.ranking_geral || [];

      if (rankingRodada.length === 0) {
        console.log(`Rodada ${rodada}: sem dados`);
        continue;
      }

      console.log(`Rodada ${rodada}: ${rankingRodada.length} times`);

      for (const timeRanking of rankingRodada) {
        const timeGeral = rankingGeral.find(
          (t) => t.timeId === timeRanking.time_id,
        );

        const documento = {
          ligaId: new mongoose.Types.ObjectId(LIGA_ID),
          rodada: rodada,
          timeId: timeRanking.time_id,
          pontos: timeRanking.pontos_rodada,
          posicao: timeRanking.posicao,
          valorFinanceiro: VALORES_BANCO[timeRanking.posicao] || 0,
          totalParticipantesAtivos: rankingRodada.length,
          nome_cartola: timeGeral?.nome_cartola || "",
          nome_time: timeGeral?.nome_time || "",
          escudo: timeGeral?.escudo || "",
          clube_id: timeGeral?.clube_id || null,
          escudo_time_do_coracao: timeGeral?.escudo_time_do_coracao || null,
          rodadaNaoJogada: false,
        };

        await db
          .collection("rodadas")
          .updateOne(
            {
              ligaId: documento.ligaId,
              rodada: documento.rodada,
              timeId: documento.timeId,
            },
            { $set: documento },
            { upsert: true },
          );

        totalRecuperados++;
      }

      console.log(`  OK: ${rankingRodada.length} registros`);
    }

    console.log(`\nRECUPERACAO CONCLUIDA!`);
    console.log(`Total: ${totalRecuperados} registros\n`);
  } catch (error) {
    console.error("Erro:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

recuperar();

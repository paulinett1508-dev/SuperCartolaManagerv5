// scripts/populateRodadas.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Time from "../models/Time.js";
import Rodada from "../models/Rodada.js";
import Liga from "../models/Liga.js";

// Carrega variáveis do .env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI não definida no .env");
  process.exit(1);
}

async function popularRodadas(ligaId, rodadaInicial, rodadaFinal) {
  // Busca a liga
  const liga = await Liga.findById(ligaId).lean();
  if (!liga) {
    console.error("Liga não encontrada!");
    process.exit(1);
  }

  // Busca os times da liga
  const times = await Time.find({ id: { $in: liga.times } }).lean();
  if (!times.length) {
    console.error("Nenhum time encontrado para a liga!");
    process.exit(1);
  }

  for (let rodada = rodadaInicial; rodada <= rodadaFinal; rodada++) {
    // Remove rodadas antigas dessa liga e rodada
    await Rodada.deleteMany({ ligaId, rodada });

    // Cria as rodadas para todos os times
    const rodadasParaInserir = times.map((time) => ({
      ligaId,
      rodada,
      timeId: time.id,
      nome_cartola: time.nome_cartoleiro || "N/D",
      nome_time: time.nome_time || "N/D",
      escudo: time.url_escudo_png || "",
      clube_id: time.clube_id || "",
      escudo_time_do_coracao: "",
      pontos: 0,
      rodadaNaoJogada: false,
    }));

    await Rodada.insertMany(rodadasParaInserir);
    console.log(
      `Rodada ${rodada} para liga ${ligaId} populada com sucesso (${rodadasParaInserir.length} times)`,
    );
  }
}

const [, , ligaId, rodadaInicial, rodadaFinal] = process.argv;

if (!ligaId || !rodadaInicial || !rodadaFinal) {
  console.error(
    "Uso: node scripts/populateRodadas.js <ligaId> <rodadaInicial> <rodadaFinal>",
  );
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "cartola-manager",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Conectado ao MongoDB com sucesso!");
    await popularRodadas(ligaId, Number(rodadaInicial), Number(rodadaFinal));
    console.log("Rodadas populadas!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao popular rodadas:", err.message);
    process.exit(1);
  }
})();

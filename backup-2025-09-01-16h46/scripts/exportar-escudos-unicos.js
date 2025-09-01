import "dotenv/config";
import fs from "fs";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = "cartola-manager";
const colecao = "rodadas";

async function exportarEscudosUnicos() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);

    // Busca apenas documentos da rodada 1
    const rodadas = await db.collection(colecao).find({ rodada: 1 }).toArray();

    // Usa um Map para garantir unicidade por clube_id
    const escudosMap = new Map();

    for (const time of rodadas) {
      if (time.clube_id && time.escudo_time_do_coracao) {
        escudosMap.set(time.clube_id, {
          clube_id: time.clube_id,
          escudo_time_do_coracao: time.escudo_time_do_coracao,
        });
      }
    }

    const escudosUnicos = Array.from(escudosMap.values());

    fs.writeFileSync(
      "./scripts/times-da-liga.json",
      JSON.stringify(escudosUnicos, null, 2),
    );
    console.log(
      `Exportação concluída! ${escudosUnicos.length} escudos únicos salvos em scripts/times-da-liga.json`,
    );
  } catch (err) {
    console.error("Erro ao exportar escudos:", err);
  } finally {
    await client.close();
  }
}

exportarEscudosUnicos();

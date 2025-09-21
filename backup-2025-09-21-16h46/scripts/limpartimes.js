import mongoose from "mongoose";
import Time from "../models/Time.js";
import dotenv from "dotenv";

dotenv.config();

async function limparTimes(ids) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    for (const id of ids) {
      const res = await Time.deleteMany({
        $or: [{ id: id }, { time_id: id }],
      });
      console.log(`Removidos ${res.deletedCount} documentos para ID ${id}`);
    }

    await mongoose.disconnect();
    console.log("Conexão com MongoDB encerrada.");
  } catch (err) {
    console.error("Erro ao limpar times:", err);
  }
}

const idsParaLimpar = [13935277, 1926323];

limparTimes(idsParaLimpar);

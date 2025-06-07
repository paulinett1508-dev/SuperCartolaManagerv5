// testarLigas.js
import mongoose from "mongoose";
import Liga from "./models/Liga.js";

const MONGO_URI =
  "mongodb+srv://admin:senha123@cluster0.fjcat.mongodb.net/cartola-manager?retryWrites=true&w=majority";

async function verificarLigas() {
  try {
    await mongoose.connect(MONGO_URI);
    const ligas = await Liga.find();

    if (ligas.length === 0) {
      console.log("❌ Nenhuma liga encontrada no banco de dados.");
    } else {
      console.log(`✅ ${ligas.length} liga(s) encontradas:\n`);
      ligas.forEach((liga, index) => {
        console.log(`${index + 1}. ${liga.nome}`);
        console.log(`   Times: ${liga.times.length}`);
        console.log(`   ID: ${liga._id}`);
        console.log("------");
      });
    }
  } catch (error) {
    console.error("❌ Erro ao acessar o MongoDB:", error.message);
  } finally {
    mongoose.disconnect();
  }
}

verificarLigas();

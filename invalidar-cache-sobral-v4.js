
import mongoose from "mongoose";
import ExtratoFinanceiroCache from "./models/ExtratoFinanceiroCache.js";
import dotenv from "dotenv";

dotenv.config();

const LIGA_CARTOLEIROS_SOBRAL = "684d821cf1a7ae16d1f89572";

async function invalidarCacheSobral() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB conectado");

        const resultado = await ExtratoFinanceiroCache.deleteMany({
            liga_id: new mongoose.Types.ObjectId(LIGA_CARTOLEIROS_SOBRAL),
            $or: [
                { versao_calculo: { $lt: "4.0.0" } },
                { versao_calculo: { $exists: false } }
            ]
        });

        console.log(`🗑️  ${resultado.deletedCount} caches invalidados`);
        console.log("✅ Sistema v4.0 pronto para recalcular com tabelas contextuais");

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Erro:", error);
        process.exit(1);
    }
}

invalidarCacheSobral();

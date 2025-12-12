import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const LIGA_SOBRAL = "684d821cf1a7ae16d1f89572";

async function verificar() {
    await mongoose.connect(process.env.MONGODB_URI);

    // Verificar configuração da liga
    const Liga = mongoose.model("Liga", new mongoose.Schema({}, { strict: false }), "ligas");
    const liga = await Liga.findById(LIGA_SOBRAL).lean();

    console.log("=== LIGA CARTOLEIROS SOBRAL ===");
    console.log("Nome:", liga.nome);
    console.log("\nMódulos ativos:", JSON.stringify(liga.modulos_ativos, null, 2));
    console.log("\nConfigurações:", JSON.stringify(liga.configuracoes, null, 2));

    // Verificar se existe cache de artilheiro
    const ArtilheiroCache = mongoose.model("ArtilheiroCache", new mongoose.Schema({}, { strict: false }), "artilheirocampeaos");
    const artilheiroCount = await ArtilheiroCache.countDocuments({ liga_id: LIGA_SOBRAL });
    console.log("\n=== ARTILHEIRO ===");
    console.log("Documentos no cache:", artilheiroCount);

    if (artilheiroCount > 0) {
        const artilheiro = await ArtilheiroCache.findOne({ liga_id: LIGA_SOBRAL }).lean();
        console.log("Estrutura:", Object.keys(artilheiro));
        if (artilheiro.ranking) {
            console.log("Top 3 artilheiros:");
            artilheiro.ranking.slice(0, 3).forEach((a, i) => {
                console.log(`  ${i + 1}º: ${a.nome_time} - ${a.gols} gols`);
            });
        }
    }

    // Verificar se existe cache de goleiros (luva de ouro)
    const GoleiroCache = mongoose.model("GoleiroCache", new mongoose.Schema({}, { strict: false }), "goleiros");
    const goleiroCount = await GoleiroCache.countDocuments({ liga_id: LIGA_SOBRAL });
    console.log("\n=== LUVA DE OURO (GOLEIROS) ===");
    console.log("Documentos no cache:", goleiroCount);

    // Verificar snapshots para ver se tem dados de artilheiro/luva
    const Snapshot = mongoose.model("Snapshot", new mongoose.Schema({}, { strict: false }), "rodadasnapshots");
    const snapshot = await Snapshot.findOne({ liga_id: LIGA_SOBRAL }).sort({ rodada: -1 }).lean();

    if (snapshot) {
        console.log("\n=== SNAPSHOT R" + snapshot.rodada + " ===");
        console.log("Tem artilheiro_campeao?", !!snapshot.artilheiro_campeao);
        console.log("Tem luva_de_ouro?", !!snapshot.luva_de_ouro);

        if (snapshot.artilheiro_campeao) {
            console.log("Artilheiro:", JSON.stringify(snapshot.artilheiro_campeao, null, 2).slice(0, 500));
        }
        if (snapshot.luva_de_ouro) {
            console.log("Luva de Ouro:", JSON.stringify(snapshot.luva_de_ouro, null, 2).slice(0, 500));
        }
    }

    await mongoose.disconnect();
}

verificar().catch(console.error);

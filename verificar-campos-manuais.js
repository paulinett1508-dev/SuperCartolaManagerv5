import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const LIGA_SUPERCARTOLA = "684cb1c8af923da7c7df51de";
const LIGA_SOBRAL = "684d821cf1a7ae16d1f89572";

async function verificar() {
    await mongoose.connect(process.env.MONGODB_URI);

    const CamposManuais = mongoose.model("CamposManuais", new mongoose.Schema({}, { strict: false }), "fluxofinanceirocampos");

    // ===== SUPERCARTOLA =====
    console.log("=== CAMPOS MANUAIS - SUPERCARTOLA ===");
    const camposSC = await CamposManuais.find({ ligaId: LIGA_SUPERCARTOLA }).lean();
    console.log(`Times com campos cadastrados: ${camposSC.length}`);

    let totalSC = 0;
    let timesComValor = 0;

    camposSC.forEach(doc => {
        const totalTime = doc.campos?.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0) || 0;
        totalSC += totalTime;
        if (totalTime !== 0) {
            timesComValor++;
            console.log(`  Time ${doc.timeId}: R$ ${totalTime.toFixed(2)}`);
            doc.campos?.filter(c => c.valor !== 0).forEach(c => {
                console.log(`    - ${c.nome}: R$ ${c.valor}`);
            });
        }
    });

    console.log(`\nTimes com valores: ${timesComValor}`);
    console.log(`Total financeiro manual: R$ ${totalSC.toFixed(2)}`);

    // ===== SOBRAL =====
    console.log("\n\n=== CAMPOS MANUAIS - SOBRAL ===");
    const camposSobral = await CamposManuais.find({ ligaId: LIGA_SOBRAL }).lean();
    console.log(`Times com campos cadastrados: ${camposSobral.length}`);

    let totalSobral = 0;
    let timesComValorSobral = 0;

    camposSobral.forEach(doc => {
        const totalTime = doc.campos?.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0) || 0;
        totalSobral += totalTime;
        if (totalTime !== 0) {
            timesComValorSobral++;
            console.log(`  Time ${doc.timeId}: R$ ${totalTime.toFixed(2)}`);
            doc.campos?.filter(c => c.valor !== 0).forEach(c => {
                console.log(`    - ${c.nome}: R$ ${c.valor}`);
            });
        }
    });

    console.log(`\nTimes com valores: ${timesComValorSobral}`);
    console.log(`Total financeiro manual: R$ ${totalSobral.toFixed(2)}`);

    // ===== VERIFICAR INCLUSÃO NO EXTRATO =====
    console.log("\n\n=== VERIFICAÇÃO: CAMPOS MANUAIS NO EXTRATO ===");

    const ExtratoCache = mongoose.model("ExtratoCache", new mongoose.Schema({}, { strict: false }), "extratofinanceirocaches");

    // Verificar um time com campo manual
    const timeComCampo = camposSC.find(c => c.campos?.some(f => f.valor !== 0));
    if (timeComCampo) {
        const timeId = parseInt(timeComCampo.timeId);
        const totalManual = timeComCampo.campos?.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0) || 0;

        const extrato = await ExtratoCache.findOne({ time_id: timeId }).lean();
        if (extrato) {
            console.log(`\nTime ${timeId}:`);
            console.log(`  Campos manuais cadastrados: R$ ${totalManual.toFixed(2)}`);
            console.log(`  Saldo no cache: R$ ${extrato.saldo_consolidado}`);

            // Os campos manuais são somados separadamente, não ficam no histórico
            // Verificar se o frontend soma corretamente
            console.log(`\n  Obs: Campos manuais são buscados separadamente pelo frontend`);
            console.log(`       e somados ao saldo na exibição.`);
        }
    }

    await mongoose.disconnect();
}

verificar().catch(console.error);

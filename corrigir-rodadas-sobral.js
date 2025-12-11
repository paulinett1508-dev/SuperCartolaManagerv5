// =====================================================================
// corrigir-rodadas-sobral.js
// Script para corrigir rodadas 36-38 da liga Cartoleiros do Sobral
// Executar: node corrigir-rodadas-sobral.js
// =====================================================================

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Schema do Rodada (inline para não depender de imports)
const RodadaSchema = new mongoose.Schema({
  ligaId: { type: mongoose.Schema.Types.ObjectId, ref: "Liga", required: true },
  rodada: { type: Number, required: true },
  timeId: { type: Number, required: true },
  nome_cartola: { type: String, default: "N/D" },
  nome_time: { type: String, default: "N/D" },
  escudo: { type: String, default: "" },
  clube_id: { type: Number },
  escudo_time_do_coracao: { type: String },
  pontos: { type: Number, default: 0 },
  rodadaNaoJogada: { type: Boolean, default: false },
  posicao: { type: Number },
  valorFinanceiro: { type: Number, default: 0 },
  totalParticipantesAtivos: { type: Number },
});

const Rodada = mongoose.model("Rodada", RodadaSchema);

// Configurações
const LIGA_SOBRAL_ID = "684d821cf1a7ae16d1f89572";
const RODADAS_CORRIGIR = [36, 37, 38];

// Tabela de valores financeiros (fase 2: 4 times)
const VALORES_BANCO = {
  1: 5.0, // MITO
  2: 0.0, // Neutro
  3: 0.0, // Neutro
  4: -5.0, // MICO
};

async function conectarMongo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado ao MongoDB");
  } catch (error) {
    console.error("❌ Erro ao conectar:", error);
    process.exit(1);
  }
}

async function limparRodadasCorrompidas() {
  console.log("\n🗑️ ETAPA 1: Limpando registros corrompidos...\n");

  const ligaIdObj = new mongoose.Types.ObjectId(LIGA_SOBRAL_ID);

  for (const rodada of RODADAS_CORRIGIR) {
    // Deletar registros com timeId null ou inválido
    const resultado = await Rodada.deleteMany({
      ligaId: ligaIdObj,
      rodada: rodada,
      $or: [
        { timeId: null },
        { timeId: { $exists: false } },
        { nome_cartola: "N/D", pontos: 0 },
      ],
    });

    console.log(
      `  Rodada ${rodada}: ${resultado.deletedCount} registros corrompidos removidos`,
    );
  }
}

async function popularRodadasCartola() {
  console.log("\n📥 ETAPA 2: Buscando dados da API do Cartola FC...\n");

  const ligaIdObj = new mongoose.Types.ObjectId(LIGA_SOBRAL_ID);

  // Buscar os times da liga baseado na rodada 35 (que tem dados válidos)
  const timesExistentes = await Rodada.distinct("timeId", {
    ligaId: ligaIdObj,
    rodada: 35,
    timeId: { $ne: null },
  });

  console.log(`  Times encontrados na rodada 35: ${timesExistentes.length}`);
  console.log(`  IDs: ${timesExistentes.join(", ")}`);

  if (timesExistentes.length === 0) {
    console.error("❌ Não foi possível identificar os times da liga");
    return;
  }

  for (const rodada of RODADAS_CORRIGIR) {
    console.log(`\n  📊 Processando rodada ${rodada}...`);

    const dadosRodada = [];

    for (const timeId of timesExistentes) {
      try {
        const url = `https://api.cartolafc.globo.com/time/id/${timeId}/${rodada}`;
        console.log(`    Buscando time ${timeId}...`);

        const response = await fetch(url);

        if (response.ok) {
          const dados = await response.json();

          dadosRodada.push({
            timeId: timeId,
            nome_cartola: dados.time?.nome_cartola || "N/D",
            nome_time: dados.time?.nome || "N/D",
            escudo: dados.time?.url_escudo_png || "",
            clube_id: dados.time?.time_id_do_coracao || null,
            pontos: dados.pontos || 0,
          });

          console.log(
            `    ✅ ${dados.time?.nome_cartola}: ${dados.pontos} pts`,
          );
        } else {
          console.log(
            `    ⚠️ API retornou ${response.status} para time ${timeId}`,
          );
        }

        // Delay para não sobrecarregar a API
        await new Promise((r) => setTimeout(r, 300));
      } catch (error) {
        console.error(`    ❌ Erro ao buscar time ${timeId}:`, error.message);
      }
    }

    if (dadosRodada.length === 0) {
      console.log(`  ⚠️ Nenhum dado obtido para rodada ${rodada}`);
      continue;
    }

    // Ordenar por pontos e calcular posições
    dadosRodada.sort((a, b) => b.pontos - a.pontos);

    // Salvar no banco
    for (let i = 0; i < dadosRodada.length; i++) {
      const time = dadosRodada[i];
      const posicao = i + 1;
      const valorFinanceiro = VALORES_BANCO[posicao] || 0;

      await Rodada.findOneAndUpdate(
        { ligaId: ligaIdObj, rodada, timeId: time.timeId },
        {
          ligaId: ligaIdObj,
          rodada,
          timeId: time.timeId,
          nome_cartola: time.nome_cartola,
          nome_time: time.nome_time,
          escudo: time.escudo,
          clube_id: time.clube_id,
          pontos: time.pontos,
          posicao,
          valorFinanceiro,
          totalParticipantesAtivos: dadosRodada.length,
          rodadaNaoJogada: false,
        },
        { upsert: true, new: true },
      );
    }

    console.log(`  ✅ Rodada ${rodada}: ${dadosRodada.length} times salvos`);
  }
}

async function verificarResultado() {
  console.log("\n🔍 ETAPA 3: Verificando resultado...\n");

  const ligaIdObj = new mongoose.Types.ObjectId(LIGA_SOBRAL_ID);

  for (const rodada of RODADAS_CORRIGIR) {
    const registros = await Rodada.find({
      ligaId: ligaIdObj,
      rodada,
    })
      .sort({ posicao: 1 })
      .lean();

    console.log(`  Rodada ${rodada}: ${registros.length} registros`);

    if (registros.length > 0) {
      registros.forEach((r) => {
        const banco =
          r.valorFinanceiro >= 0 ? `+${r.valorFinanceiro}` : r.valorFinanceiro;
        console.log(
          `    ${r.posicao}° ${r.nome_cartola} - ${r.pontos.toFixed(2)} pts (R$ ${banco})`,
        );
      });
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  CORREÇÃO DE RODADAS - CARTOLEIROS DO SOBRAL");
  console.log("  Rodadas: 36, 37, 38");
  console.log("═══════════════════════════════════════════════════════════");

  await conectarMongo();

  await limparRodadasCorrompidas();
  await popularRodadasCartola();
  await verificarResultado();

  console.log("\n✅ Processo concluído!\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});

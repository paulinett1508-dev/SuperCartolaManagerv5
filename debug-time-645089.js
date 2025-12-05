
// debug-time-645089.js - Diagnóstico completo do time 645089
import mongoose from "mongoose";
import Time from "./models/Time.js";

async function diagnosticarTime() {
  try {
    // Conectar ao MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/supercartola";
    await mongoose.connect(mongoUri);
    console.log("✅ Conectado ao MongoDB");

    // Buscar com .lean() para ver o documento RAW
    const timeLean = await Time.findOne({ id: 645089 }).lean();
    console.log("\n📄 DOCUMENTO RAW (.lean()):");
    console.log(JSON.stringify(timeLean, null, 2));

    // Buscar SEM .lean() para ver o que o Mongoose retorna
    const timeMongoose = await Time.findOne({ id: 645089 });
    console.log("\n📄 DOCUMENTO MONGOOSE (sem .lean()):");
    console.log(JSON.stringify(timeMongoose, null, 2));

    // Verificar schema do Model
    console.log("\n📋 SCHEMA DO MODEL Time.js:");
    const schemaPaths = Time.schema.paths;
    Object.keys(schemaPaths).forEach(path => {
      if (path !== '__v' && path !== '_id') {
        console.log(`  - ${path}: ${schemaPaths[path].instance}`);
      }
    });

    // Buscar TODOS os times para comparar estruturas
    console.log("\n🔍 Comparando com outros times...");
    const timesComDados = await Time.find({
      $or: [
        { nome: { $exists: true, $ne: "" } },
        { nome_time: { $exists: true, $ne: "" } },
        { nome_cartola: { $exists: true, $ne: "" } },
        { nome_cartoleiro: { $exists: true, $ne: "" } }
      ]
    }).limit(3).lean();

    console.log("\n📊 ESTRUTURA DE OUTROS TIMES:");
    timesComDados.forEach((t, i) => {
      console.log(`\nTime ${i + 1} (ID: ${t.id}):`);
      console.log(`  - Campos presentes: ${Object.keys(t).join(', ')}`);
      console.log(`  - nome: ${t.nome || 'undefined'}`);
      console.log(`  - nome_time: ${t.nome_time || 'undefined'}`);
      console.log(`  - nome_cartola: ${t.nome_cartola || 'undefined'}`);
      console.log(`  - nome_cartoleiro: ${t.nome_cartoleiro || 'undefined'}`);
    });

    // Query direta na collection
    console.log("\n🔧 QUERY DIRETA NA COLLECTION:");
    const db = mongoose.connection.db;
    const collection = db.collection('times');
    const documentoDireto = await collection.findOne({ id: 645089 });
    console.log(JSON.stringify(documentoDireto, null, 2));

    await mongoose.connection.close();
    console.log("\n✅ Diagnóstico concluído");
  } catch (error) {
    console.error("❌ Erro no diagnóstico:", error);
    process.exit(1);
  }
}

diagnosticarTime();

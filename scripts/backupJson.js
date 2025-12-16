import mongoose from "mongoose";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// =========================================================================
// SELEÇÃO DE AMBIENTE (Prod vs Dev)
// =========================================================================
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const getMongoURI = () => {
  if (IS_PRODUCTION) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('❌ ERRO: MONGO_URI não configurada para produção!');
      process.exit(1);
    }
    console.log('🔴 BACKUP: Conectando ao banco de PRODUÇÃO');
    return uri;
  } else {
    const uri = process.env.MONGO_URI_DEV;
    if (!uri) {
      console.error('❌ ERRO: MONGO_URI_DEV não configurada para desenvolvimento!');
      process.exit(1);
    }
    console.log('🟢 BACKUP: Conectando ao banco de DESENVOLVIMENTO');
    return uri;
  }
};

const uri = getMongoURI();

async function exportCollection(collectionName) {
  const Model = mongoose.model(
    collectionName,
    new mongoose.Schema({}, { strict: false }),
    collectionName,
  );
  const docs = await Model.find().lean();
  fs.writeFileSync(
    `backups/${collectionName}.json`,
    JSON.stringify(docs, null, 2),
  );
  console.log(
    `Exportado ${docs.length} documentos da coleção ${collectionName}`,
  );
}

async function main() {
  await mongoose.connect(uri);
  const collections = await mongoose.connection.db.listCollections().toArray();
  if (!fs.existsSync("backups")) {
    fs.mkdirSync("backups");
  }
  for (const coll of collections) {
    await exportCollection(coll.name);
  }
  await mongoose.disconnect();
  console.log("Backup completo realizado.");
}

main().catch(console.error);

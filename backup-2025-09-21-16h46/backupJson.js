import mongoose from "mongoose";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;

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

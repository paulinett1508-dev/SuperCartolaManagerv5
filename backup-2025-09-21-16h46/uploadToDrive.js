import fs from "fs";
import path from "path";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const CREDENTIALS_PATH = "./credentials.json";
const FOLDER_ID = "16FHgIpeGr7o1_Ybc7OJBlflih9eVlyiH";

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
  });
  return await auth.getClient();
}

async function uploadFile(auth, filePath, folderId = FOLDER_ID) {
  const drive = google.drive({ version: "v3", auth });
  const fileMetadata = {
    name: path.basename(filePath),
    parents: [folderId],
  };
  const media = {
    body: fs.createReadStream(filePath),
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });
  console.log(`Arquivo enviado: ${filePath} (ID: ${res.data.id})`);
  return res.data.id;
}

async function uploadFolder(auth, folderPath, folderId = null) {
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      await uploadFile(auth, fullPath, folderId);
    } else if (stat.isDirectory()) {
      console.log(
        `Pasta encontrada, mas upload recursivo não implementado: ${fullPath}`,
      );
    }
  }
}

async function main() {
  const auth = await authenticate();
  const backupBaseDir = path.resolve("backups");
  const backups = fs
    .readdirSync(backupBaseDir)
    .filter((name) => name.endsWith(".json"));
  if (backups.length === 0) {
    console.log("Nenhum backup encontrado para enviar.");
    return;
  }

  for (const backup of backups) {
    const backupPath = path.join(backupBaseDir, backup);
    console.log(`Enviando backup: ${backupPath}`);
    await uploadFile(auth, backupPath);
  }
}

main().catch(console.error);

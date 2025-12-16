import { exec } from "child_process";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const backupBaseDir = path.resolve("backups");

function fazerBackup() {
  const command = `node scripts/backupJson.js`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao fazer backup: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Erro: ${stderr}`);
      return;
    }
    console.log("Backup realizado com sucesso.");
    console.log(stdout);
    uploadBackup();
  });
}

function uploadBackup() {
  exec("node uploadToDrive.js", (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro no upload: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Erro no upload: ${stderr}`);
      return;
    }
    console.log("Upload para Google Drive concluído.");
    console.log(stdout);
  });
}

// Backup manual via argumento
if (process.argv.includes("--manual")) {
  fazerBackup();
} else {
  // Backup automático semanal (7 dias em milissegundos)
  const seteDias = 7 * 24 * 60 * 60 * 1000;

  console.log("Backup automático iniciado. Será executado a cada 7 dias.");

  fazerBackup(); // backup inicial

  setInterval(() => {
    fazerBackup();
  }, seteDias);
}

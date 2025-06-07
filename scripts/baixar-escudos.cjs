const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const times = JSON.parse(
  fs.readFileSync(path.join(__dirname, "times-da-liga.json"), "utf8"),
);
const pastaDestino = path.join(__dirname, "..", "public", "escudos");

if (!fs.existsSync(pastaDestino)) {
  fs.mkdirSync(pastaDestino, { recursive: true });
}

function baixarImagem(url, destino, cb) {
  const mod = url.startsWith("https") ? https : http;
  mod
    .get(url, (res) => {
      if (res.statusCode !== 200) {
        cb(new Error(`Status ${res.statusCode} para ${url}`));
        return;
      }
      const file = fs.createWriteStream(destino);
      res.pipe(file);
      file.on("finish", () => file.close(cb));
    })
    .on("error", cb);
}

async function baixarTodos() {
  for (const time of times) {
    if (!time.clube_id || !time.escudo_time_do_coracao) continue;
    const nomeArquivo = `${time.clube_id}.png`;
    const destino = path.join(pastaDestino, nomeArquivo);
    if (fs.existsSync(destino)) {
      console.log(`Já existe: ${nomeArquivo}`);
      continue;
    }
    console.log(`Baixando escudo do clube ${time.clube_id}...`);
    await new Promise((resolve, reject) => {
      baixarImagem(time.escudo_time_do_coracao, destino, (err) => {
        if (err) {
          console.error(`Erro ao baixar ${nomeArquivo}:`, err.message);
        } else {
          console.log(`Salvo: ${nomeArquivo}`);
        }
        resolve();
      });
    });
  }
  console.log("Todos os escudos baixados!");
}

baixarTodos();

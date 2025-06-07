// index.js
import { readFileSync } from "fs";
const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import ligaRoutes from "./routes/ligas.js";
import cartolaRoutes from "./routes/cartola.js";
import timesRoutes from "./routes/times.js";
import rodadasRoutes from "./routes/rodadas-routes.js";
import golsRoutes from "./routes/gols.js";
import { getClubes } from "./controllers/cartolaController.js";
import artilheiroCampeaoRoutes from "./routes/artilheiro-campeao-routes.js";

dotenv.config();

if (!process.env.MONGODB_URI) {
  console.error(
    "Erro: A variável de ambiente MONGODB_URI não está definida. Verifique o arquivo .env.",
  );
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Middleware para logar o caminho da requisição
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware para definir o charset UTF-8 em todas as respostas
app.use((req, res, next) => {
  // Verifica se é uma resposta JSON e define o charset UTF-8
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// Rota específica para clubes no nível raiz da API
app.get("/api/clubes", getClubes);
console.log("[INDEX] Registrando rota /api/clubes");

// Rotas principais da API
app.use("/api/cartola", cartolaRoutes);
console.log("[INDEX] Registrando rota /api/cartola");
app.use("/api/times", timesRoutes);
console.log("[INDEX] Registrando rota /api/times");
app.use("/api/time", timesRoutes); // ADICIONADO para funcionar com o frontend
console.log("[INDEX] Registrando rota /api/time");
app.use("/api/ligas", ligaRoutes);
console.log("[INDEX] Registrando rota /api/ligas");
app.use("/api/rodadas", rodadasRoutes);
console.log("[INDEX] Registrando rota /api/rodadas");
app.use("/api/gols", golsRoutes);
console.log("[INDEX] Registrando rota /api/gols");
app.use("/api", artilheiroCampeaoRoutes);
console.log("[INDEX] Registrando rota /api para artilheiroCampeaoRoutes");

// Versão da API
app.get("/api/version", (req, res) => {
  res.json({ version: pkg.version });
});
console.log("[INDEX] Registrando rota /api/version");

// Middleware para rotas não encontradas
app.use((req, res, next) => {
  console.log(`Rota não encontrada: ${req.method} ${req.url}`);
  res.status(404).json({ erro: "Rota não encontrada" });
});
console.log("[INDEX] Registrando middleware para rotas não encontradas");

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(`Erro no servidor: ${err.message}`);
  res.status(500).json({ erro: "Erro interno no servidor: " + err.message });
});
console.log("[INDEX] Registrando middleware de tratamento de erros");

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Conectado ao MongoDB com sucesso!");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err.message);
    process.exit(1);
  });

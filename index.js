// index.js - Super Cartola Manager OTIMIZADO (Sessões Persistentes)
import mongoose from "mongoose";
import { readFileSync } from "fs";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo"; // ADICIONADO: Persistência de sessão
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

// ⚡ USAR CONEXÃO OTIMIZADA
import connectDB from "./config/database.js";

// Importar package.json para versão
const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

// Importar rotas do sistema
import ligaRoutes from "./routes/ligas.js";
import cartolaRoutes from "./routes/cartola.js";
import cartolaProxyRoutes from "./routes/cartola-proxy.js";
import timesRoutes from "./routes/times.js";
import rodadasRoutes from "./routes/rodadas-routes.js";
import golsRoutes from "./routes/gols.js";
import artilheiroCampeaoRoutes from "./routes/artilheiro-campeao-routes.js";
import luvaDeOuroRoutes from "./routes/luva-de-ouro-routes.js";
import configuracaoRoutes from "./routes/configuracao-routes.js";
import fluxoFinanceiroRoutes from "./routes/fluxoFinanceiroRoutes.js";
import extratoFinanceiroCacheRoutes from "./routes/extratoFinanceiroCacheRoutes.js";
import participanteAuthRoutes from "./routes/participante-auth.js";
import pontosCorridosCacheRoutes from "./routes/pontosCorridosCacheRoutes.js";
import top10CacheRoutes from "./routes/top10CacheRoutes.js";
import mataMataCacheRoutes from "./routes/mataMataCacheRoutes.js";
import rankingGeralCacheRoutes from "./routes/ranking-geral-cache-routes.js";
import consolidacaoRoutes from "./routes/consolidacao-routes.js";

import { getClubes } from "./controllers/cartolaController.js";
import {
  verificarStatusParticipante,
  alternarStatusParticipante,
} from "./controllers/participanteStatusController.js";
import { iniciarSchedulerConsolidacao } from "./utils/consolidacaoScheduler.js";

// Configuração do .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar ao Banco de Dados (Otimizado)
connectDB();

// Middleware para Parsing do Body (JSON e URL-encoded)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configuração CORS
app.use(cors());

// Configuração de Sessão com MongoDB Store (Persistência Real)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supercartolamanagerv5_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      clientPromise: mongoose.connection
        .asPromise()
        .then((conn) => conn.client),
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // 14 dias
      autoRemove: "native",
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 dias
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Apenas HTTPS em produção
      sameSite: "lax", // ✅ CRÍTICO: Permite envio de cookie em cross-site (compatibilidade com produção)
    },
    proxy: process.env.NODE_ENV === "production", // ✅ Confiar em reverse proxy em produção
  }),
);

// Servir arquivos estáticos (Frontend) - ANTES de qualquer autenticação
app.use(express.static("public"));

// Middleware de segurança: bloqueia participantes de acessar admin
// Aplicado APENAS às rotas da API, não aos arquivos estáticos
import { bloquearParticipanteDeAdmin } from './middleware/auth.js';

// Aplicar bloqueio de participante apenas nas rotas da API (não em arquivos estáticos)
app.use('/api', bloquearParticipanteDeAdmin);

// Rotas da API
app.use("/api/ligas", ligaRoutes);
app.use("/api/cartola", cartolaRoutes);
app.use("/api/cartola", cartolaProxyRoutes); // Proxy para evitar CORS
app.use("/api/times", timesRoutes);
app.use("/api/time", timesRoutes); // ✅ Alias para compatibilidade (singular)
app.use("/api/rodadas", rodadasRoutes);
app.use("/api/gols", golsRoutes);
app.use("/api/artilheiro-campeao", artilheiroCampeaoRoutes);
app.use("/api/luva-de-ouro", luvaDeOuroRoutes);
app.use("/api/configuracao", configuracaoRoutes);
app.use("/api/fluxo-financeiro", fluxoFinanceiroRoutes);
console.log('[SERVER] ✅ Rotas de Fluxo Financeiro registradas em /api/fluxo-financeiro');
app.use("/api/extrato-cache", extratoFinanceiroCacheRoutes);
app.use("/api/ranking-cache", rankingGeralCacheRoutes);
app.use("/api/consolidacao", consolidacaoRoutes);
app.use("/api/participante/auth", participanteAuthRoutes);
app.use("/api/pontos-corridos", pontosCorridosCacheRoutes);
app.use("/api/top10", top10CacheRoutes);
app.use("/api/mata-mata", mataMataCacheRoutes);

// Rotas Adicionais (Controllers Diretos)
app.get("/api/clubes", getClubes);
app.get(
  "/api/ligas/:ligaId/participantes/:timeId/status",
  verificarStatusParticipante,
);
app.post(
  "/api/ligas/:ligaId/participantes/:timeId/status",
  alternarStatusParticipante,
);

// Endpoint para versão
app.get("/api/version", (req, res) => {
  res.json({ version: pkg.version });
});

// Rota de fallback para o Frontend (SPA)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.resolve("public/index.html"));
});

// Inicialização do Servidor
if (process.env.NODE_ENV !== "test") {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 SUPER CARTOLA MANAGER RODANDO NA PORTA ${PORT}`);
      console.log(`💾 Sessões persistentes: ATIVADAS (MongoDB Store)`);
    });
  } catch (err) {
    console.error("❌ Erro ao conectar ao MongoDB:", err.message);
    process.exit(1);
  }
}

// ====================================================================
// 🧹 LIMPEZA DE ÍNDICES ANTIGOS (FIX ERRO E11000)
// ====================================================================
mongoose.connection.once("open", async () => {
  console.log("🔧 Verificando índices do banco de dados...");
  try {
    const collection = mongoose.connection.db.collection(
      "extratofinanceirocaches",
    );

    // Verifica se o índice antigo existe e o remove
    const indexes = await collection.indexes();
    const indiceAntigo = indexes.find(
      (idx) => idx.name === "ligaId_1_timeId_1",
    );

    if (indiceAntigo) {
      console.log(
        "🚨 Índice antigo 'ligaId_1_timeId_1' encontrado. Removendo...",
      );
      await collection.dropIndex("ligaId_1_timeId_1");
      console.log(
        "✅ Índice antigo removido com sucesso! O erro E11000 deve sumir.",
      );
    } else {
      console.log("✅ Nenhum índice conflitante encontrado.");
    }
  } catch (error) {
    // Silencia erro se a coleção não existir ainda
    if (error.codeName !== "NamespaceNotFound") {
      console.error("⚠️ Erro na verificação de índices:", error.message);
    }
  }

  // ✅ SCHEDULER DE CONSOLIDAÇÃO AUTOMÁTICA
  if (process.env.NODE_ENV === "production") {
    setTimeout(() => {
      console.log("[SERVER] 🚀 Iniciando scheduler de consolidação em produção...");
      iniciarSchedulerConsolidacao();
    }, 10000); // Aguarda 10s após conexão para garantir estabilidade
  } else {
    console.log("[SERVER] ⚠️ Scheduler de consolidação desativado em desenvolvimento");
    console.log("[SERVER] 💡 Para testar manualmente, use: POST /api/consolidacao/ligas/{ID}/consolidar-historico");
  }
});

export default app;
// index.js - Super Cartola Manager OTIMIZADO (Sessões Persistentes + Auth Admin)
import mongoose from "mongoose";
import { readFileSync } from "fs";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

// ⚡ USAR CONEXÃO OTIMIZADA
import connectDB from "./config/database.js";

// 🔐 GOOGLE OAUTH
import passport, {
  configurarGoogleOAuth,
  verificarConfigOAuth,
} from "./config/google-oauth.js";

// Importar package.json para versão
const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

// Importar rotas do sistema
import ligaRoutes from "./routes/ligas.js";
import cartolaRoutes from "./routes/cartola.js";
import cartolaProxyRoutes from "./routes/cartola-proxy.js";
import timesRoutes from "./routes/times.js";
import timesAdminRoutes from "./routes/times-admin.js";
import rodadasRoutes from "./routes/rodadas-routes.js";
import golsRoutes from "./routes/gols.js";
import artilheiroCampeaoRoutes from "./routes/artilheiro-campeao-routes.js";
import luvaDeOuroRoutes from "./routes/luva-de-ouro-routes.js";
import configuracaoRoutes from "./routes/configuracao-routes.js";
import fluxoFinanceiroRoutes from "./routes/fluxoFinanceiroRoutes.js";
import extratoFinanceiroCacheRoutes from "./routes/extratoFinanceiroCacheRoutes.js";
import participanteAuthRoutes from "./routes/participante-auth.js";
import pontosCorridosCacheRoutes from "./routes/pontosCorridosCacheRoutes.js";
import pontosCorridosMigracaoRoutes from "./routes/pontosCorridosMigracaoRoutes.js";
import top10CacheRoutes from "./routes/top10CacheRoutes.js";
import mataMataCacheRoutes from "./routes/mataMataCacheRoutes.js";
import rankingGeralCacheRoutes from "./routes/ranking-geral-cache-routes.js";
import rankingTurnoRoutes from "./routes/ranking-turno-routes.js";
import consolidacaoRoutes from "./routes/consolidacao-routes.js";

// 🔐 Rotas de autenticação admin
import adminAuthRoutes from "./routes/admin-auth.js";
console.log("[DEBUG] adminAuthRoutes type:", typeof adminAuthRoutes);
console.log(
  "[DEBUG] adminAuthRoutes.stack length:",
  adminAuthRoutes.stack?.length,
);

import { getClubes } from "./controllers/cartolaController.js";
import {
  verificarStatusParticipante,
  alternarStatusParticipante,
} from "./controllers/participanteStatusController.js";
import { iniciarSchedulerConsolidacao } from "./utils/consolidacaoScheduler.js";

// Middleware de proteção
import { protegerRotas } from "./middleware/auth.js";

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

// ====================================================================
// DEBUG - DEVE SER O PRIMEIRO MIDDLEWARE PARA CAPTURAR TUDO
// ====================================================================
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

// TESTE DIRETO - sem router
app.get("/api/teste-direto", (req, res) => {
  res.json({ teste: "ok", timestamp: new Date() });
});

// TESTE DIRETO - com path admin
app.get("/api/admin/teste-admin", (req, res) => {
  res.json({ testeAdmin: "ok", timestamp: new Date() });
});

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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    proxy: process.env.NODE_ENV === "production",
  }),
);

// 🔐 Inicializar Passport (Google OAuth)
if (verificarConfigOAuth()) {
  configurarGoogleOAuth();
  app.use(passport.initialize());
  app.use(passport.session());
  console.log("[SERVER] 🔐 Google OAuth ativado");
} else {
  console.warn(
    "[SERVER] ⚠️ Google OAuth desativado (credenciais não configuradas)",
  );
}

// 🔐 Rotas de autenticação admin (Google OAuth) - ANTES do protegerRotas
app.use("/api/admin/auth", adminAuthRoutes);
console.log("[DEBUG] Rota /api/admin/auth registrada");

// 🔐 Rotas de autenticação participante - ANTES do protegerRotas
app.use("/api/participante/auth", participanteAuthRoutes);

// 🛡️ MIDDLEWARE DE PROTEÇÃO DE ROTAS (antes de servir estáticos)
app.use(protegerRotas);

// Servir arquivos estáticos (Frontend)
app.use(express.static("public"));

// Rotas da API
app.use("/api/ligas", ligaRoutes);
app.use("/api/cartola", cartolaRoutes);
app.use("/api/cartola", cartolaProxyRoutes);
app.use("/api/times", timesRoutes);
app.use("/api/time", timesRoutes);
app.use("/api/rodadas", rodadasRoutes);
app.use("/api/gols", golsRoutes);
app.use("/api/artilheiro-campeao", artilheiroCampeaoRoutes);
app.use("/api/luva-de-ouro", luvaDeOuroRoutes);
app.use("/api/configuracao", configuracaoRoutes);
app.use("/api/fluxo-financeiro", fluxoFinanceiroRoutes);
console.log(
  "[SERVER] ✅ Rotas de Fluxo Financeiro registradas em /api/fluxo-financeiro",
);
app.use("/api/extrato-cache", extratoFinanceiroCacheRoutes);
app.use("/api/ranking-cache", rankingGeralCacheRoutes);
app.use("/api/ranking-turno", rankingTurnoRoutes);
app.use("/api/consolidacao", consolidacaoRoutes);
app.use("/api/pontos-corridos", pontosCorridosCacheRoutes);
app.use("/api/pontos-corridos", pontosCorridosMigracaoRoutes);
app.use("/api/top10", top10CacheRoutes);
app.use("/api/mata-mata", mataMataCacheRoutes);
app.use("/api/times-admin", timesAdminRoutes);

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

// ====================================================================
// FALLBACK - DEVE SER A ÚLTIMA ROTA REGISTRADA
// ====================================================================
// Primeiro: capturar rotas de API não encontradas
app.use("/api/*", (req, res) => {
  console.log(`[404] API endpoint não encontrado: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: "API endpoint not found",
    path: req.path,
    method: req.method
  });
});

// Depois: servir o frontend para qualquer outra rota
app.get("*", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

// Inicialização do Servidor
if (process.env.NODE_ENV !== "test") {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 SUPER CARTOLA MANAGER RODANDO NA PORTA ${PORT}`);
      console.log(`💾 Sessões persistentes: ATIVADAS (MongoDB Store)`);
      console.log(`🔐 Autenticação Admin: Google OAuth`);
      console.log(`🔐 Autenticação Participante: Senha do Time`);
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
    const indexes = await collection.indexes();
    const indiceAntigo = indexes.find(
      (idx) => idx.name === "ligaId_1_timeId_1",
    );

    if (indiceAntigo) {
      console.log(
        "🚨 Índice antigo 'ligaId_1_timeId_1' encontrado. Removendo...",
      );
      await collection.dropIndex("ligaId_1_timeId_1");
      console.log("✅ Índice antigo removido com sucesso!");
    } else {
      console.log("✅ Nenhum índice conflitante encontrado.");
    }
  } catch (error) {
    if (error.codeName !== "NamespaceNotFound") {
      console.error("⚠️ Erro na verificação de índices:", error.message);
    }
  }

  // ✅ SCHEDULER DE CONSOLIDAÇÃO AUTOMÁTICA
  if (process.env.NODE_ENV === "production") {
    setTimeout(() => {
      console.log(
        "[SERVER] 🚀 Iniciando scheduler de consolidação em produção...",
      );
      iniciarSchedulerConsolidacao();
    }, 10000);
  } else {
    console.log(
      "[SERVER] ⚠️ Scheduler de consolidação desativado em desenvolvimento",
    );
  }
});

export default app;

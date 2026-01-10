// index.js - Super Cartola Manager OTIMIZADO (Sessões Persistentes + Auth Admin + Segurança)
// v2.0: Hardening de Produção - Logs e Erros por ambiente
import mongoose from "mongoose";
import { readFileSync } from "fs";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

// Carregar .env ANTES de tudo
dotenv.config();

// =========================================================================
// 🔇 SILENCIAMENTO DE LOGS EM PRODUÇÃO
// =========================================================================
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Guardar console original
const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
};

// Em produção: silenciar logs normais (manter apenas erros críticos)
if (IS_PRODUCTION) {
    console.log = () => {};
    console.info = () => {};
    // Manter warn e error para monitoramento
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
}

// ⚡ USAR CONEXÃO OTIMIZADA
import connectDB from "./config/database.js";

// 🔐 REPLIT AUTH
import passport, { setupReplitAuthRoutes } from "./config/replit-auth.js";

// 🛡️ SEGURANÇA
import { setupSecurity, authRateLimiter } from "./middleware/security.js";

// 📦 VERSIONAMENTO AUTO
import { APP_VERSION } from "./config/appVersion.js";

// 📊 MODELS PARA SYNC DE ÍNDICES
import ExtratoFinanceiroCache from "./models/ExtratoFinanceiroCache.js";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importar package.json para versão
const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

// Importar rotas do sistema
import ligaRoutes from "./routes/ligas.js";
import cartolaRoutes from "./routes/cartola.js";
import cartolaProxyRoutes from "./routes/cartola-proxy.js";
import timesRoutes from "./routes/times.js";
import timesAdminRoutes from "./routes/times-admin.js";
import rodadasRoutes from "./routes/rodadas-routes.js";
import rodadasCacheRoutes from "./routes/rodadasCacheRoutes.js";
import rodadasCorrecaoRoutes from "./routes/rodadasCorrecaoRoutes.js";
import golsRoutes from "./routes/gols.js";
import artilheiroCampeaoRoutes from "./routes/artilheiro-campeao-routes.js";
import luvaDeOuroRoutes from "./routes/luva-de-ouro-routes.js";
import configuracaoRoutes from "./routes/configuracao-routes.js";
import fluxoFinanceiroRoutes from "./routes/fluxoFinanceiroRoutes.js";
import extratoFinanceiroCacheRoutes from "./routes/extratoFinanceiroCacheRoutes.js";
import participanteAuthRoutes from "./routes/participante-auth.js";
import participanteHistoricoRoutes from "./routes/participante-historico-routes.js";
import pontosCorridosCacheRoutes from "./routes/pontosCorridosCacheRoutes.js";
import pontosCorridosMigracaoRoutes from "./routes/pontosCorridosMigracaoRoutes.js";
import top10CacheRoutes from "./routes/top10CacheRoutes.js";
import mataMataCacheRoutes from "./routes/mataMataCacheRoutes.js";
import rankingGeralCacheRoutes from "./routes/ranking-geral-cache-routes.js";
import rankingTurnoRoutes from "./routes/ranking-turno-routes.js";
import consolidacaoRoutes from "./routes/consolidacao-routes.js";
import renovacoesRoutes from "./routes/renovacoes-routes.js";
import acertosFinanceirosRoutes from "./routes/acertos-financeiros-routes.js";
import tesourariaRoutes from "./routes/tesouraria-routes.js";
import ajustesRoutes from "./routes/ajustes-routes.js";

// 🔄 Renovação de Temporada
import ligaRulesRoutes from "./routes/liga-rules-routes.js";
import inscricoesRoutes from "./routes/inscricoes-routes.js";
import quitacaoRoutes from "./routes/quitacao-routes.js";

// 🧩 Configuração de Módulos por Liga
import moduleConfigRoutes from "./routes/module-config-routes.js";

// 📦 DATA LAKE dos Participantes
import dataLakeRoutes from "./routes/data-lake-routes.js";

// 📦 Versionamento do App
import appVersionRoutes from "./routes/appVersionRoutes.js";

// 👁️ Monitoramento de usuários online
import usuariosOnlineRoutes from "./routes/usuarios-online-routes.js";
import activityTrackerMiddleware from "./middleware/activityTracker.js";

// 🔐 Rotas de autenticação admin
import adminAuthRoutes from "./routes/admin-auth.js";
import adminAuditoriaRoutes from "./routes/admin-auditoria-routes.js";
import adminGestaoRoutes from "./routes/admin-gestao-routes.js";
import adminClienteAuthRoutes from "./routes/admin-cliente-auth.js";
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

// dotenv já foi carregado no início do arquivo

const app = express();
const PORT = process.env.PORT || 5000;

// Conectar ao Banco de Dados (Otimizado)
connectDB();

// ====================================================================
// 🛡️ MIDDLEWARES DE SEGURANÇA (PRIMEIRO!)
// ====================================================================
setupSecurity(app);

// Trust proxy (necessário para rate limiting correto no Replit)
app.set("trust proxy", 1);

// Middleware para Parsing do Body (JSON e URL-encoded)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configuração CORS
app.use(cors());

// ====================================================================
// DESABILITAR CACHE PARA HTML (evita problema de CDN/proxy)
// ====================================================================
app.use((req, res, next) => {
  if (req.path.endsWith(".html") || req.path === "/") {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});

// ====================================================================
// 📦 CACHE BUSTING - Injetar versão em CSS/JS (evita White Screen of Death)
// ====================================================================
app.get(["/participante/", "/participante/index.html"], async (req, res, next) => {
  try {
    const htmlPath = path.join(__dirname, "public", "participante", "index.html");
    let html = await readFile(htmlPath, "utf8");

    const version = APP_VERSION.version;

    // Injetar versão em arquivos CSS locais (não CDNs)
    html = html.replace(
      /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+\.css)["']/gi,
      (match, href) => {
        // Ignorar CDNs (começam com http:// ou https:// ou //)
        if (href.startsWith("http") || href.startsWith("//")) {
          return match;
        }
        // Adicionar versão
        const separator = href.includes("?") ? "&" : "?";
        return `<link rel="stylesheet" href="${href}${separator}v=${version}"`;
      }
    );

    // Injetar versão em arquivos JS locais (não CDNs)
    html = html.replace(
      /<script\s+(?:type=["']module["']\s+)?src=["']([^"']+\.js)["']/gi,
      (match, src) => {
        // Ignorar CDNs
        if (src.startsWith("http") || src.startsWith("//")) {
          return match;
        }
        // Preservar type="module" se existir
        const hasModule = match.includes('type="module"') || match.includes("type='module'");
        const separator = src.includes("?") ? "&" : "?";
        const typeAttr = hasModule ? 'type="module" ' : "";
        return `<script ${typeAttr}src="${src}${separator}v=${version}"`;
      }
    );

    // Headers anti-cache
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    res.send(html);
  } catch (error) {
    // Fallback: servir arquivo original
    next();
  }
});

// ====================================================================
// DEBUG - CAPTURAR TODAS AS REQUISIÇÕES (apenas em desenvolvimento)
// ====================================================================
if (IS_DEVELOPMENT) {
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
  });
}

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

// 🔐 Inicializar Passport (Replit Auth)
app.use(passport.initialize());
app.use(passport.session());

// Setup Replit Auth routes (synchronous registration with lazy OIDC discovery)
setupReplitAuthRoutes(app);
console.log("[SERVER] 🔐 Replit Auth ativado");

// 🔐 Rotas de autenticação admin (Replit Auth) - ANTES do protegerRotas
app.use("/api/admin/auth", adminAuthRoutes);
console.log("[DEBUG] Rota /api/admin/auth registrada");

// 📊 Rotas de auditoria admin
app.use("/api/admin/auditoria", adminAuditoriaRoutes);
console.log("[SERVER] 📊 Rotas de auditoria admin registradas");

// 👤 Rotas de gestao de admins
app.use("/api/admin/gestao", adminGestaoRoutes);
console.log("[SERVER] 👤 Rotas de gestao de admins registradas");

// 🔑 Rotas de autenticacao de clientes (email + senha)
app.use("/api/admin/cliente", adminClienteAuthRoutes);
console.log("[SERVER] 🔑 Rotas de autenticacao de clientes registradas");

// 👁️ Rota de monitoramento de usuários online (admin)
app.use("/api/admin/usuarios-online", usuariosOnlineRoutes);
console.log("[SERVER] 👁️ Rota de usuários online registrada");

// 🔐 Rotas de autenticação participante - ANTES do protegerRotas
// Aplicar rate limiting específico para login
app.use("/api/participante/auth/login", authRateLimiter);
app.use("/api/participante/auth", participanteAuthRoutes);
app.use("/api/participante/historico", participanteHistoricoRoutes);

// ====================================================================
// 📦 ROTAS DE VERSÃO DO APP (antes do protegerRotas)
// ====================================================================
app.use("/api/app", appVersionRoutes);
console.log("[SERVER] 📦 Rotas de versionamento registradas em /api/app");

// 🛡️ MIDDLEWARE DE PROTEÇÃO DE ROTAS (antes de servir estáticos)
app.use(protegerRotas);

// 👁️ MIDDLEWARE DE RASTREAMENTO DE ATIVIDADE (participantes)
app.use(activityTrackerMiddleware);

// Servir arquivos estáticos (Frontend)
app.use(express.static("public"));

// Rotas da API
app.use("/api/ligas", ligaRoutes);
app.use("/api/cartola", cartolaRoutes);
app.use("/api/cartola", cartolaProxyRoutes);
app.use("/api/times", timesRoutes);
app.use("/api/time", timesRoutes);
app.use("/api/rodadas", rodadasRoutes);
app.use("/api/rodadas-cache", rodadasCacheRoutes);
app.use("/api/rodadas-correcao", rodadasCorrecaoRoutes);
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
app.use("/api/renovacoes", renovacoesRoutes);
app.use("/api/acertos", acertosFinanceirosRoutes);
app.use("/api/tesouraria", tesourariaRoutes);
app.use("/api/ajustes", ajustesRoutes);

// 🔄 Renovação de Temporada
app.use("/api/liga-rules", ligaRulesRoutes);
app.use("/api/inscricoes", inscricoesRoutes);
app.use("/api/quitacao", quitacaoRoutes);

// 🧩 Configuração de Módulos
app.use("/api", moduleConfigRoutes);
console.log("[SERVER] 🔄 Sistema de Renovação de Temporada registrado");

// 📦 DATA LAKE dos Participantes
app.use("/api/data-lake", dataLakeRoutes);
// Alias para acesso conveniente: /api/participantes/:id/raw → /api/data-lake/raw/:id
app.use("/api/participantes", dataLakeRoutes);
console.log("[SERVER] 📦 Data Lake dos Participantes registrado em /api/data-lake");

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
    method: req.method,
  });
});

// Depois: servir o frontend para qualquer outra rota
app.get("*", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

// ====================================================================
// 🛡️ MIDDLEWARE DE ERRO GLOBAL (HARDENING DE PRODUÇÃO)
// ====================================================================
app.use((err, req, res, next) => {
  // Em produção: Ocultar stack trace e detalhes
  if (IS_PRODUCTION) {
    // Log interno para monitoramento (mantém console.error original)
    originalConsole.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

    // Resposta genérica ao cliente
    return res.status(err.status || 500).json({
      msg: "Erro interno",
      code: err.code || "INTERNAL_ERROR"
    });
  }

  // Em desenvolvimento: Mostrar detalhes completos
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  res.status(err.status || 500).json({
    msg: err.message,
    code: err.code || "INTERNAL_ERROR",
    stack: err.stack,
    details: err.details || null
  });
});

// Inicialização do Servidor
if (process.env.NODE_ENV !== "test") {
  try {
    app.listen(PORT, "0.0.0.0", () => {
      // Log de inicialização sempre visível (usa console original)
      const startupLog = IS_PRODUCTION ? originalConsole.log : console.log;

      startupLog(`🚀 SUPER CARTOLA MANAGER RODANDO NA PORTA ${PORT}`);
      startupLog(`🌍 Ambiente: ${IS_PRODUCTION ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
      startupLog(`📦 Versão: ${APP_VERSION.version} (build ${APP_VERSION.build})`);

      if (IS_DEVELOPMENT) {
        console.log(`💾 Sessões persistentes: ATIVADAS (MongoDB Store)`);
        console.log(`🔐 Autenticação Admin: Replit Auth`);
        console.log(`🔐 Autenticação Participante: Senha do Time`);
        console.log(`🛡️ Segurança: Headers + Rate Limiting ATIVADOS`);
        console.log(`📝 Logs: VERBOSE (desenvolvimento)`);
      } else {
        startupLog(`🔇 Logs: SILENCIADOS (produção)`);
        startupLog(`🛡️ Erros: Mensagens genéricas (sem stack trace)`);
      }
    });
  } catch (err) {
    originalConsole.error("❌ Erro ao conectar ao MongoDB:", err.message);
    process.exit(1);
  }
}

// ====================================================================
// 🔄 SINCRONIZAÇÃO DE ÍNDICES (Mongoose 8.x syncIndexes)
// Remove índices legados e cria índices definidos no schema
// ====================================================================
mongoose.connection.once("open", async () => {
  console.log("🔧 Sincronizando índices do banco de dados (Mongoose 8.x)...");
  try {
    // Preview das mudanças antes de aplicar
    const diff = await ExtratoFinanceiroCache.diffIndexes();

    if (diff.toDrop.length > 0 || diff.toCreate.length > 0) {
      console.log("📋 Índices a remover:", diff.toDrop);
      console.log("📋 Índices a criar:", diff.toCreate);

      // Sincroniza: remove extras, cria faltantes
      const dropped = await ExtratoFinanceiroCache.syncIndexes();
      if (dropped.length > 0) {
        console.log("✅ Índices removidos:", dropped);
      }
      console.log("✅ Índices sincronizados com sucesso!");
    } else {
      console.log("✅ Índices já estão sincronizados.");
    }
  } catch (error) {
    if (error.codeName !== "NamespaceNotFound") {
      console.error("⚠️ Erro na sincronização de índices:", error.message);
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

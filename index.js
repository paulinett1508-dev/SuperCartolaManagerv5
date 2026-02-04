import cron from "node-cron";
import compression from "compression";
// Executar scraper de jogos Globo Esporte diariamente às 6h (horário do servidor)
import { exec } from "child_process";

// ====================================================================
// 🔄 RECURSOS GLOBAIS PARA GRACEFUL SHUTDOWN
// ====================================================================
let httpServer = null;
const cronJobs = [];
let consolidacaoIntervalId = null;
let rateLimitCleanupIntervalId = null;

const cronGloboScraper = cron.schedule("0 6 * * *", () => {
  console.log("[CRON] Executando atualização de jogos do Globo Esporte...");
  exec("node scripts/save-jogos-globo.js", (err, stdout, stderr) => {
    if (err) {
      console.error("[CRON] Erro ao rodar save-jogos-globo.js:", err.message);
      return;
    }
    if (stdout) console.log("[CRON] save-jogos-globo.js:", stdout.trim());
    if (stderr) console.error("[CRON] save-jogos-globo.js (stderr):", stderr.trim());
  });
});
cronJobs.push(cronGloboScraper);
// Também executa na inicialização para garantir cache atualizado
exec("node scripts/save-jogos-globo.js", (err, stdout, stderr) => {
  if (err) {
    console.error("[INIT] Erro ao rodar save-jogos-globo.js:", err.message);
    return;
  }
  if (stdout) console.log("[INIT] save-jogos-globo.js:", stdout.trim());
  if (stderr) console.error("[INIT] save-jogos-globo.js (stderr):", stderr.trim());
});
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
import { setupSecurity, authRateLimiter, getRateLimitCleanupIntervalId } from "./middleware/security.js";

// 📦 VERSIONAMENTO AUTO
import { APP_VERSION } from "./config/appVersion.js";

// 📊 MODELS PARA SYNC DE ÍNDICES
import ExtratoFinanceiroCache from "./models/ExtratoFinanceiroCache.js";
import UserActivity from "./models/UserActivity.js";
import AccessLog from "./models/AccessLog.js";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importar package.json para versão
const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

// Importar rotas do sistema
import jogosHojeRoutes from "./routes/jogos-hoje-routes.js";
import liveResultsRoutes from "./routes/live-results-routes.js";
import jogosHojeGloboRoutes from "./routes/jogos-hoje-globo.js"; // NOVA ROTA
import jogosAoVivoRoutes from "./routes/jogos-ao-vivo-routes.js"; // API-Football
import ligaRoutes from "./routes/ligas.js";
import cartolaRoutes from "./routes/cartola.js";
import cartolaProxyRoutes from "./routes/cartola-proxy.js";
import timesRoutes from "./routes/times.js";
import timesAdminRoutes from "./routes/times-admin.js";
import analisarParticipantesRoutes from "./routes/analisar-participantes.js";
import rodadasRoutes from "./routes/rodadas-routes.js";
import rodadasCacheRoutes from "./routes/rodadasCacheRoutes.js";
import rodadasCorrecaoRoutes from "./routes/rodadasCorrecaoRoutes.js";
import calendarioRodadasRoutes from "./routes/calendario-rodadas-routes.js";
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

// ✅ FEAT-026 & FEAT-027: Matchday + Capitão de Luxo
import matchdayRoutes from "./routes/matchday-routes.js";
import capitaoRoutes from "./routes/capitao-routes.js";

// 🔄 Renovação de Temporada
import ligaRulesRoutes from "./routes/liga-rules-routes.js";
import inscricoesRoutes from "./routes/inscricoes-routes.js";
import quitacaoRoutes from "./routes/quitacao-routes.js";

// 🧩 Configuração de Módulos por Liga
import moduleConfigRoutes from "./routes/module-config-routes.js";
import rulesRoutes from "./routes/rules-routes.js";

// 📦 DATA LAKE dos Participantes
import dataLakeRoutes from "./routes/data-lake-routes.js";

// ⚡ Cartola PRO (Escalação Automática)
import cartolaProRoutes from "./routes/cartola-pro-routes.js";

// 🔔 Push Notifications
import notificationsRoutes from "./routes/notifications-routes.js";
import { cleanExpiredSubscriptions } from "./controllers/notificationsController.js";
import { cronEscalacaoPendente } from "./services/notificationTriggers.js";
import { verificarENotificarEscalacao, limparCacheNotificacoes } from "./services/smartEscalacaoNotifier.js";

// 🎯 Dicas Premium
import dicasPremiumRoutes from "./routes/dicas-premium-routes.js";

// 📰 Notícias personalizadas do time do coração
import noticiasTimeRoutes from "./routes/noticias-time-routes.js";

// 📊 Tabelas Esportivas (Brasileirão, jogos do time, etc)
import tabelasEsportesRoutes from "./routes/tabelas-esportes-routes.js";

// 🔧 Modo Manutenção do App
import manutencaoRoutes from "./routes/manutencao-routes.js";

// 📦 Versionamento do App
import appVersionRoutes from "./routes/appVersionRoutes.js";

// 👁️ Monitoramento de usuários online
import usuariosOnlineRoutes from "./routes/usuarios-online-routes.js";
import activityTrackerMiddleware from "./middleware/activityTracker.js";

// 🔐 Rotas de autenticação admin
import adminAuthRoutes from "./routes/admin-auth.js";
import adminAuditoriaRoutes from "./routes/admin-auditoria-routes.js";
import adminGestaoRoutes from "./routes/admin-gestao-routes.js";
import systemHealthRoutes from "./routes/system-health-routes.js";
import adminClienteAuthRoutes from "./routes/admin-cliente-auth.js";
import adminMobileRoutes from "./routes/admin-mobile-routes.js";
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
import { protegerRotas, injetarSessaoDevAdmin } from "./middleware/auth.js";

// dotenv já foi carregado no início do arquivo

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar ao Banco de Dados (Otimizado)
await connectDB();

// ====================================================================
// 🛡️ MIDDLEWARES DE SEGURANÇA (PRIMEIRO!)
// ====================================================================
setupSecurity(app);

// Trust proxy (necessário para rate limiting correto no Replit)
app.set("trust proxy", 1);

// ====================================================================
// 📦 COMPRESSION - Reduz ~70% do tamanho de JS/CSS na transferência
// ====================================================================
app.use(compression({
    filter: (req, res) => {
        // Não comprimir se o cliente não suportar
        if (req.headers['x-no-compression']) return false;
        // Comprimir por padrão
        return compression.filter(req, res);
    },
    level: 6, // Balanceado entre compressão e CPU (1-9)
    threshold: 1024 // Só comprimir arquivos > 1KB
}));

// Middleware para Parsing do Body (JSON e URL-encoded)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configuração CORS - Restrito a origens autorizadas
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sem origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Em desenvolvimento, permitir qualquer origem
    if (IS_DEVELOPMENT) return callback(null, true);
    // Permitir origens do mesmo domínio Replit (*.replit.dev)
    if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co') || origin.endsWith('.replit.app') || origin.endsWith('supercartolamanager.com.br')) {
      return callback(null, true);
    }
    // Verificar whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true
}));

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

// ====================================================================
// ⚡ SERVIR ASSETS ESTÁTICOS SEM SESSION (antes de MongoStore)
// JS, CSS, imagens e fontes não precisam de session/MongoDB
// HTML e diretórios seguem para o chain completo (session → protegerRotas)
// ====================================================================
const servePublicAssets = express.static("public");
app.use((req, res, next) => {
  if (/\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|webmanifest)$/i.test(req.path)) {
    return servePublicAssets(req, res, next);
  }
  next();
});

// Configuração de Sessão com MongoDB Store (Persistência Real)
app.use(
  session({
    secret: (() => {
      const secret = process.env.SESSION_SECRET;
      if (!secret && IS_PRODUCTION) {
        console.error("[SERVER] ❌ SESSION_SECRET não definido em produção! Defina a variável de ambiente.");
        process.exit(1);
      }
      return secret || "dev_only_secret_" + Date.now();
    })(),
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

// 🏥 Dashboard de Saúde do Sistema (admin)
app.use("/api/admin/system-health", systemHealthRoutes);
console.log("[SERVER] 🏥 Rota de dashboard de saúde registrada");

// 📱 Admin Mobile - App PWA para administradores
app.use("/api/admin/mobile", adminMobileRoutes);
console.log("[SERVER] 📱 Rotas de Admin Mobile registradas");

// 🔧 Modo Manutenção do App
app.use("/api/admin", manutencaoRoutes);
console.log("[SERVER] 🔧 Rotas de modo manutenção registradas");

// 🔐 Rotas de autenticação participante - ANTES do protegerRotas
// Aplicar rate limiting específico para login (tradicional e Globo)
app.use("/api/participante/auth/login", authRateLimiter);
app.use("/api/participante/auth/globo/direct", authRateLimiter);
app.use("/api/participante/auth", participanteAuthRoutes);
app.use("/api/participante/historico", participanteHistoricoRoutes);

// ====================================================================
// 📦 ROTAS DE VERSÃO DO APP (antes do protegerRotas)
// ====================================================================
app.use("/api/app", appVersionRoutes);
console.log("[SERVER] 📦 Rotas de versionamento registradas em /api/app");

// 🛡️ MIDDLEWARE DE PROTEÇÃO DE ROTAS (antes de servir estáticos)
// ✅ Bypass de desenvolvimento: injeta sessão admin automaticamente em NODE_ENV=development
app.use(injetarSessaoDevAdmin);
app.use(protegerRotas);

// 👁️ MIDDLEWARE DE RASTREAMENTO DE ATIVIDADE (participantes)
app.use(activityTrackerMiddleware);

// Servir arquivos estáticos (Frontend)
app.use(express.static("public"));

// Rotas da API
app.use("/api/jogos-hoje", jogosHojeRoutes);
app.use("/api/live-results", liveResultsRoutes);

// ✅ FEAT-026: Modo Matchday
app.use('/api/matchday', matchdayRoutes);

// ✅ FEAT-027: Capitão de Luxo
app.use('/api/capitao', capitaoRoutes);

app.use("/api/jogos-hoje-globo", jogosHojeGloboRoutes); // NOVA ROTA
app.use("/api/jogos-ao-vivo", jogosAoVivoRoutes); // API-Football
app.use("/api/ligas", ligaRoutes);
app.use("/api/cartola", cartolaRoutes);
app.use("/api/cartola", cartolaProxyRoutes);
app.use("/api/cartola-pro", cartolaProRoutes);
app.use("/api/times", timesRoutes);
app.use("/api/time", timesRoutes);
app.use("/api/rodadas", rodadasRoutes);
app.use("/api/rodadas-cache", rodadasCacheRoutes);
app.use("/api/rodadas-correcao", rodadasCorrecaoRoutes);
app.use("/api/calendario-rodadas", calendarioRodadasRoutes);
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
app.use("/api/analisar-participantes", analisarParticipantesRoutes);
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

// 📚 Regras estáticas (JSON)
app.use("/api/rules", rulesRoutes);
console.log("[SERVER] 🧾 Rotas de regras estáticas registradas em /api/rules");

// 📦 DATA LAKE dos Participantes
app.use("/api/data-lake", dataLakeRoutes);
// Alias para acesso conveniente: /api/participantes/:id/raw → /api/data-lake/raw/:id
app.use("/api/participantes", dataLakeRoutes);
console.log("[SERVER] 📦 Data Lake dos Participantes registrado em /api/data-lake");

// 🔔 Push Notifications
app.use("/api/notifications", notificationsRoutes);
console.log("[SERVER] 🔔 Rotas de Push Notifications registradas em /api/notifications");

// 🎯 Dicas Premium
app.use("/api/dicas-premium", dicasPremiumRoutes);
console.log("[SERVER] 🎯 Rotas de Dicas Premium registradas em /api/dicas-premium");

// 📰 Notícias do Time do Coração
app.use("/api/noticias", noticiasTimeRoutes);
console.log("[SERVER] 📰 Rotas de notícias personalizadas registradas em /api/noticias");

// 📊 Tabelas Esportivas
app.use("/api/tabelas", tabelasEsportesRoutes);
console.log("[SERVER] 📊 Rotas de tabelas esportivas registradas em /api/tabelas");

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
    httpServer = app.listen(PORT, "0.0.0.0", () => {
      // Capturar intervalId do rate limiting após inicialização
      rateLimitCleanupIntervalId = getRateLimitCleanupIntervalId();
      
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
      consolidacaoIntervalId = iniciarSchedulerConsolidacao();
    }, 10000);
  } else {
    console.log(
      "[SERVER] ⚠️ Scheduler de consolidação desativado em desenvolvimento",
    );
  }

  // 🔔 CRON: Limpeza de push subscriptions expiradas
  // Toda segunda-feira às 3h da manhã
  cron.schedule("0 3 * * 1", async () => {
    console.log("[CRON] Executando limpeza de push subscriptions...");
    try {
      const removidas = await cleanExpiredSubscriptions();
      console.log(`[CRON] Limpeza concluída: ${removidas} subscriptions removidas`);
    } catch (erro) {
      console.error("[CRON] Erro na limpeza de subscriptions:", erro.message);
    }
  });
  console.log("[SERVER] 🔔 Cron de limpeza de push subscriptions agendado (seg 3h)");

  // 🔔 CRON: Notificação de escalação pendente v2.0 (INTELIGENTE)
  // Sistema inteligente baseado em MarketGate que calcula horários dinâmicos
  // Notifica 2h, 1h e 30min antes do fechamento REAL do mercado
  // Roda a cada 15 minutos para detectar os intervalos corretos
  const cronEscalacaoInteligente = cron.schedule("*/15 * * * *", async () => {
    try {
      await verificarENotificarEscalacao();
    } catch (erro) {
      console.error("[CRON] Erro ao verificar escalações:", erro.message);
    }
  });
  cronJobs.push(cronEscalacaoInteligente);
  console.log("[SERVER] 🔔 Cron de escalação INTELIGENTE agendado (a cada 15min, notifica 2h/1h/30min antes)");

  // 🔔 CRON: Limpeza de cache de notificações (diário às 4h)
  const cronLimpezaCache = cron.schedule("0 4 * * *", async () => {
    try {
      limparCacheNotificacoes();
    } catch (erro) {
      console.error("[CRON] Erro na limpeza de cache:", erro.message);
    }
  });
  cronJobs.push(cronLimpezaCache);
  console.log("[SERVER] 🔔 Cron de limpeza de cache agendado (diário 4h)");
});

// ====================================================================
// 🛑 GRACEFUL SHUTDOWN - Fecha recursos antes de encerrar processo
// ====================================================================
async function gracefulShutdown(signal) {
  const logShutdown = IS_PRODUCTION ? originalConsole.log : console.log;
  logShutdown(`\n[SHUTDOWN] Recebido sinal ${signal}, encerrando gracefully...`);
  
  const SHUTDOWN_TIMEOUT = 10000; // 10 segundos
  let forcedExit = false;
  
  // Força encerramento após timeout
  const forceExitTimer = setTimeout(() => {
    forcedExit = true;
    const logError = IS_PRODUCTION ? originalConsole.error : console.error;
    logError("[SHUTDOWN] ⚠️ Timeout excedido, forçando encerramento...");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
  
  try {
    // 1. Parar de aceitar novas conexões HTTP
    if (httpServer) {
      logShutdown("[SHUTDOWN] Fechando servidor HTTP...");
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
      logShutdown("[SHUTDOWN] ✅ Servidor HTTP fechado");
    }
    
    // 2. Parar todos os cron jobs
    if (cronJobs.length > 0) {
      logShutdown(`[SHUTDOWN] Parando ${cronJobs.length} cron jobs...`);
      cronJobs.forEach(job => job.stop());
      logShutdown("[SHUTDOWN] ✅ Cron jobs parados");
    }
    
    // 3. Limpar timer de consolidação
    if (consolidacaoIntervalId) {
      logShutdown("[SHUTDOWN] Parando scheduler de consolidação...");
      clearInterval(consolidacaoIntervalId);
      logShutdown("[SHUTDOWN] ✅ Scheduler de consolidação parado");
    }
    
    // 4. Limpar timer de rate limiting
    if (rateLimitCleanupIntervalId) {
      logShutdown("[SHUTDOWN] Parando limpeza de rate limiting...");
      clearInterval(rateLimitCleanupIntervalId);
      logShutdown("[SHUTDOWN] ✅ Rate limiting cleanup parado");
    }
    
    // 5. Fechar conexão MongoDB
    if (mongoose.connection.readyState === 1) {
      logShutdown("[SHUTDOWN] Fechando conexão MongoDB...");
      await mongoose.connection.close();
      logShutdown("[SHUTDOWN] ✅ MongoDB desconectado");
    }
    
    clearTimeout(forceExitTimer);
    
    if (!forcedExit) {
      logShutdown("[SHUTDOWN] 🎉 Encerramento graceful completo");
      process.exit(0);
    }
  } catch (erro) {
    const logError = IS_PRODUCTION ? originalConsole.error : console.error;
    logError("[SHUTDOWN] ❌ Erro durante shutdown:", erro);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

// ====================================================================
// 📡 SIGNAL HANDLERS - Intercepta sinais de encerramento
// ====================================================================
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));

export default app;


// Webhook para GitHub Actions
app.post('/github-sync', express.json(), (req, res) => {
  console.log('🔔 Webhook do GitHub recebido:', req.body);
  
  exec('bash scripts/sync-replit.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Erro no sync:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Sync concluído:', stdout);
    res.json({ 
      success: true, 
      message: 'Sync executado',
      timestamp: new Date().toISOString()
    });
  });
});

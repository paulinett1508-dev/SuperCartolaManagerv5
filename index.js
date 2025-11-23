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
import { getClubes } from "./controllers/cartolaController.js";
import {
  verificarAutenticacaoParticipante,
  isRotaPublica,
  isRotaAdmin,
  isRotaParticipante,
} from "./middleware/auth.js";

// Configurar variáveis de ambiente
dotenv.config();

// Validação das variáveis de ambiente obrigatórias
if (!process.env.MONGODB_URI) {
  console.error(
    "❌ Erro: A variável de ambiente MONGODB_URI não está definida. Verifique o arquivo .env.",
  );
  process.exit(1);
}

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuração de middlewares globais
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ⚡ CONFIGURAÇÃO DE SESSÃO COM MONGODB (Correção de UX e Persistência)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cartola-secret-key-2025",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions", // Coleção específica para sessões
      ttl: 14 * 24 * 60 * 60, // Sessão dura 14 dias no banco
      autoRemove: "native", // MongoDB remove sessões expiradas automaticamente
    }),
    cookie: {
      secure: false, // set true se usar HTTPS com certificado válido
      httpOnly: true,
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 dias (UX de App)
    },
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ⚡ MIDDLEWARE DE SEGURANÇA: Proteger páginas admin
app.use((req, res, next) => {
  if (isRotaPublica(req.url)) return next();
  if (isRotaAdmin(req.url)) return next();
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|json)$/)) return next();
  if (req.url.startsWith("/api/")) return next();

  if (isRotaParticipante(req.url)) {
    return verificarAutenticacaoParticipante(req, res, next);
  }

  next();
});

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(process.cwd(), "public")));

// ⚡ MIDDLEWARE DE LOGGING OTIMIZADO (só em desenvolvimento)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Middleware para definir charset UTF-8 apenas em respostas JSON
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (obj) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return originalJson.call(this, obj);
  };
  next();
});

// Rota específica para clubes no nível raiz da API
app.get("/api/clubes", getClubes);

// Rotas principais da API
app.use("/api/cartola", cartolaRoutes);
app.use("/api/cartola", cartolaProxyRoutes); // Proxy
app.use("/api/times", timesRoutes);
app.use("/api/time", timesRoutes); // Compatibilidade
app.use("/api/cartola/time", timesRoutes); // Compatibilidade
app.use("/api/ligas", ligaRoutes);
app.use("/api/rodadas", rodadasRoutes);
app.use("/api/gols", golsRoutes);
app.use("/api/artilheiro-campeao", artilheiroCampeaoRoutes);
app.use("/api/luva-de-ouro", luvaDeOuroRoutes);
app.use("/api/configuracao", configuracaoRoutes);
app.use("/api/fluxo-financeiro", fluxoFinanceiroRoutes);
app.use("/api/extrato-cache", extratoFinanceiroCacheRoutes);
app.use("/api/participante/auth", participanteAuthRoutes);
app.use("/api/auth", participanteAuthRoutes); // Compatibilidade

// Rota para informações da API e versão
app.get("/api/version", (req, res) => {
  res.json({
    name: "Super Cartola Manager API",
    version: pkg.version,
    description: "Sistema de gerenciamento de ligas internas do Cartola FC",
    environment: process.env.NODE_ENV || "development",
    performance: {
      cache: "NodeCache habilitado",
      database: "Connection pooling ativo",
      session: "MongoDB Persistent Store", // Indicador da melhoria
    },
  });
});

// Rota para servir o favicon
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "favicon.png"));
});

// Rota raiz - redireciona para a aplicação
app.get("/", (req, res) => {
  res.redirect("/index.html");
});

// Middleware para rotas não encontradas
app.use((req, res, next) => {
  const isApiRoute = req.url.startsWith("/api/");
  if (isApiRoute) {
    res.status(404).json({
      erro: "Rota de API não encontrada",
      message: `O endpoint ${req.method} ${req.url} não existe`,
    });
  } else {
    res.status(404).send(`
      <html><head><title>404 - Página não encontrada</title></head>
      <body><h1>404</h1><p>A página <strong>${req.url}</strong> não foi encontrada.</p><a href="/">Voltar</a></body></html>
    `);
  }
});

// Middleware de tratamento de erros globais
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`🚨 [${timestamp}] Erro no servidor:`, err.message);
  res.status(err.status || 500).json({
    erro: "Erro interno no servidor",
    message:
      process.env.NODE_ENV !== "production" ? err.message : "Algo deu errado",
    timestamp: timestamp,
  });
});

// ⚡ FUNÇÃO OTIMIZADA PARA CONECTAR AO MONGODB E INICIAR SERVIDOR
async function iniciarServidor() {
  try {
    console.log("🔄 Conectando ao MongoDB...");
    await connectDB();
    console.log("✅ Conectado ao MongoDB com sucesso!");

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
// Adicione este bloco no final do seu index.js ou logo após a conexão
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
  } catch (err) {
    console.log(
      "⚠️ Aviso na verificação de índices (não crítico):",
      err.message,
    );
  }
});

// Iniciar o servidor
iniciarServidor();

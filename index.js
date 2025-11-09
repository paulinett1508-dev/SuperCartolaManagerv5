// index.js - Super Cartola Manager OTIMIZADO
import { readFileSync } from "fs";
import express from "express";
import session from "express-session";
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
import timesRoutes from "./routes/times.js";
import rodadasRoutes from "./routes/rodadas-routes.js";
import golsRoutes from "./routes/gols.js";
import artilheiroCampeaoRoutes from "./routes/artilheiro-campeao-routes.js";
import luvaDeOuroRoutes from "./routes/luva-de-ouro-routes.js";
import configuracaoRoutes from "./routes/configuracao-routes.js";
import fluxoFinanceiroRoutes from "./routes/fluxoFinanceiroRoutes.js";
import participanteAuthRoutes from "./routes/participante-auth.js";
import { getClubes } from "./controllers/cartolaController.js";

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

// Configurar sessões
app.use(
    session({
        secret: process.env.SESSION_SECRET || "cartola-secret-key-2025", // Chave secreta para assinar os cookies de sessão
        resave: false, // Não salvar sessões que não foram modificadas
        saveUninitialized: false, // Não criar sessões para usuários não logados
        cookie: {
            secure: false, // set true se usar HTTPS
            httpOnly: true, // O cookie de sessão não pode ser acessado por JavaScript no cliente
            maxAge: 24 * 60 * 60 * 1000, // Duração da sessão em milissegundos (24 horas)
        },
    }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: GET /api/clubes");
}

// Rotas principais da API
app.use("/api/cartola", cartolaRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/cartola/*");
}

// Rotas de times - ORDEM IMPORTA!
app.use("/api/times", timesRoutes);
console.log("✅ [ROUTES] Registrada: /api/times/*");

app.use("/api/time", timesRoutes);
console.log("✅ [ROUTES] Registrada: /api/time/* (compatibilidade)");

app.use("/api/cartola/time", timesRoutes);
console.log("✅ [ROUTES] Registrada: /api/cartola/time/* (compatibilidade)");

app.use("/api/ligas", ligaRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/ligas/*");
}

app.use("/api/rodadas", rodadasRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/rodadas/*");
}

app.use("/api/gols", golsRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/gols/*");
}

app.use("/api/artilheiro-campeao", artilheiroCampeaoRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/artilheiro-campeao/*");
}

app.use("/api/luva-de-ouro", luvaDeOuroRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/luva-de-ouro/*");
}

app.use("/api/configuracao", configuracaoRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/configuracao/*");
}

// ✨ NOVO: Rotas do Fluxo Financeiro
app.use("/api/fluxo-financeiro", fluxoFinanceiroRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/fluxo-financeiro/*");
}

// ✨ NOVO: Rotas de autenticação de participantes
app.use("/api/participante", participanteAuthRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/participante/*");
}

// Rotas de autenticação genéricas (para login/logout)
app.use("/api/auth", participanteAuthRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: /api/auth/*");
}


// Rota para informações da API e versão
app.get("/api/version", (req, res) => {
  res.json({
    name: "Super Cartola Manager API",
    version: pkg.version,
    description: "Sistema de gerenciamento de ligas internas do Cartola FC",
    author: pkg.author || "Super Cartola Team",
    environment: process.env.NODE_ENV || "development",
    performance: {
      cache: "NodeCache habilitado",
      database: "Connection pooling ativo",
      logs:
        process.env.NODE_ENV === "production"
          ? "Otimizados para produção"
          : "Completos para desenvolvimento",
    },
    features: [
      "Gerenciamento de Ligas",
      "Sistema de Pontos Corridos",
      "Mata-Mata",
      "Artilheiro e Campeão",
      "Luva de Ouro",
      "Fluxo Financeiro (Persistente)",
      "Exportação de Relatórios (Frontend)",
      "Integração com API do Cartola FC",
      "Cache inteligente",
      "Índices otimizados",
      "Autenticação de Participantes", // Nova feature
    ],
    endpoints: {
      clubes: "/api/clubes",
      cartola: "/api/cartola",
      times: "/api/times",
      ligas: "/api/ligas",
      rodadas: "/api/rodadas",
      gols: "/api/gols",
      artilheiro: "/api/artilheiro-campeao",
      luvaDeOuro: "/api/luva-de-ouro",
      configuracao: "/api/configuracao",
      fluxoFinanceiro: "/api/fluxo-financeiro",
      participanteAuth: "/api/participante/*", // Novo endpoint
      auth: "/api/auth/*", // Novo endpoint
      version: "/api/version",
    },
  });
});

if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: GET /api/version");
}

// Rota para servir o favicon
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "favicon.png"));
});

// Rota raiz - redireciona para a aplicação
app.get("/", (req, res) => {
  res.redirect("/index.html");
});

if (process.env.NODE_ENV !== "production") {
  console.log("✅ [ROUTES] Registrada: GET / (redirect)");
}

// Middleware para rotas não encontradas
app.use((req, res, next) => {
  const isApiRoute = req.url.startsWith("/api/");

  if (isApiRoute) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `❌ [404] Rota de API não encontrada: ${req.method} ${req.url}`,
      );
    }
    res.status(404).json({
      erro: "Rota de API não encontrada",
      message: `O endpoint ${req.method} ${req.url} não existe`,
      available_endpoints: [
        "GET /api/version",
        "GET /api/clubes",
        "GET /api/times/*",
        "GET /api/time/*",
        "GET /api/ligas/*",
        "GET /api/rodadas/*",
        "GET /api/gols/*",
        "GET /api/artilheiro-campeao/*",
        "GET /api/luva-de-ouro/*",
        "GET /api/configuracao/*",
        "GET /api/fluxo-financeiro/*",
        "POST /api/participante/login", // Novo endpoint
        "POST /api/participante/register", // Novo endpoint
        "POST /api/auth/logout", // Novo endpoint
      ],
    });
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.log(`❌ [404] Arquivo não encontrado: ${req.method} ${req.url}`);
    }
    res.status(404).send(`
      <html>
        <head>
          <title>404 - Página não encontrada</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 50px; }
            .container { max-width: 600px; margin: 0 auto; text-align: center; }
            .error-code { font-size: 4em; color: #dc3545; margin: 0; }
            .error-message { font-size: 1.2em; color: #6c757d; margin: 20px 0; }
            .back-link { color: #007bff; text-decoration: none; font-size: 1.1em; }
            .back-link:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error-code">404</h1>
            <p class="error-message">A página <strong>${req.url}</strong> não foi encontrada.</p>
            <a href="/" class="back-link">← Voltar para o Super Cartola Manager</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Middleware de tratamento de erros globais
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`🚨 [${timestamp}] Erro no servidor:`, err.message);

  // Log do stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    console.error("Stack trace:", err.stack);
  }

  // Resposta de erro padronizada
  const isDevelopment = process.env.NODE_ENV !== "production";
  res.status(err.status || 500).json({
    erro: "Erro interno no servidor",
    message: isDevelopment ? err.message : "Algo deu errado",
    timestamp: timestamp,
    ...(isDevelopment && { stack: err.stack }),
  });
});

// ⚡ FUNÇÃO OTIMIZADA PARA CONECTAR AO MONGODB E INICIAR SERVIDOR
async function iniciarServidor() {
  try {
    console.log("🔄 Conectando ao MongoDB...");

    // ⚡ USAR CONEXÃO OTIMIZADA COM POOLING
    await connectDB();

    console.log("✅ Conectado ao MongoDB com sucesso!");

    app.listen(PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log("🚀 SUPER CARTOLA MANAGER INICIADO COM SUCESSO!");
      console.log("=".repeat(60));
      console.log(`📡 Servidor rodando na porta: ${PORT}`);
      console.log(`🌐 URL Local: http://localhost:${PORT}`);
      console.log(`📊 API Info: http://localhost:${PORT}/api/version`);
      console.log(`🏠 Aplicação: http://localhost:${PORT}/index.html`);
      console.log(`⚙️  Ambiente: ${process.env.NODE_ENV || "development"}`);
      console.log(`📦 Versão: ${pkg.version}`);
      console.log(`💾 MongoDB: Conectado com pooling`);
      console.log(`⚡ Cache: NodeCache ativo`);
      console.log(`📈 Performance: Otimizada`);
      console.log("✨ Módulos de export funcionando no frontend");
      console.log("🥅 Sistema Luva de Ouro integrado");
      console.log("💰 Sistema Fluxo Financeiro persistente");
      console.log("🔒 Sistema de Autenticação de Participantes integrado"); // Nova informação
      console.log("=".repeat(60) + "\n");

      // Log adicional para desenvolvimento
      if (process.env.NODE_ENV !== "production") {
        console.log("🛠️  Modo de desenvolvimento ativo");
        console.log("📝 Logs detalhados habilitados");
        console.log("🔍 Cache em modo debug");
      } else {
        console.log("🚀 Modo de produção ativo");
        console.log("⚡ Logs otimizados");
        console.log("💨 Performance máxima");
      }
    });
  } catch (err) {
    console.error("❌ Erro ao conectar ao MongoDB:", err.message);
    console.error(
      "🔧 Verifique se o MongoDB está rodando e se a string de conexão está correta",
    );
    process.exit(1);
  }
}

// Tratamento gracioso de sinais do sistema
process.on("SIGTERM", () => {
  console.log("\n🔄 SIGTERM recebido. Encerrando servidor graciosamente...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n🔄 SIGINT recebido. Encerrando servidor graciosamente...");
  process.exit(0);
});

// Tratamento de erros não capturados
process.on("uncaughtException", (error) => {
  console.error("🚨 Erro não capturado:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Promise rejeitada não tratada:", reason);
  console.error("Promise:", promise);
  process.exit(1);
});

// Iniciar o servidor
iniciarServidor();

// ⚠️  NOTA: Módulos de export (export-*.js) são isolados no frontend
// Eles são carregados através de <script type="module"> nos arquivos HTML
// e não devem ser importados no backend Node.js
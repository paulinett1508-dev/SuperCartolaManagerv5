/**
 * Configuração Replit Auth para Admin
 * Super Cartola Manager
 * Implementação baseada no blueprint Replit Auth (OpenID Connect)
 */
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import memoize from "memoizee";
import { getDB } from "./database.js";

// Fallback para variavel de ambiente (compatibilidade)
const ADMIN_EMAILS_ENV = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(e => e.length > 0);

/**
 * Verifica se email e admin autorizado
 * Primeiro verifica no banco, depois na variavel de ambiente
 */
async function isAdminAuthorizado(email) {
  if (!email) return false;
  const emailLower = email.toLowerCase();

  try {
    const db = getDB();
    if (db) {
      // Verificar na collection admins
      const admin = await db.collection("admins").findOne({
        email: emailLower,
        ativo: { $ne: false }
      });

      if (admin) {
        console.log("[REPLIT-AUTH] ✅ Admin encontrado no banco:", emailLower);
        return true;
      }

      // Se nao tem admins no banco, usar variavel de ambiente
      const countAdmins = await db.collection("admins").countDocuments();
      if (countAdmins === 0 && ADMIN_EMAILS_ENV.length > 0) {
        console.log("[REPLIT-AUTH] 📋 Sem admins no banco, usando env");
        return ADMIN_EMAILS_ENV.includes(emailLower);
      }

      // Se tem admins no banco mas email nao esta, negar
      if (countAdmins > 0) {
        console.log("[REPLIT-AUTH] ❌ Email nao encontrado nos admins do banco");
        return false;
      }
    }
  } catch (error) {
    console.error("[REPLIT-AUTH] ⚠️ Erro ao verificar admin no banco:", error.message);
  }

  // Fallback para variavel de ambiente
  if (ADMIN_EMAILS_ENV.length > 0) {
    return ADMIN_EMAILS_ENV.includes(emailLower);
  }

  // Se nao tem restricao, permitir qualquer um (desenvolvimento)
  console.log("[REPLIT-AUTH] ⚠️ Sem restricao de admin configurada");
  return true;
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

const registeredStrategies = new Set();

function ensureStrategy(domain, config, verify) {
  const strategyName = `replitauth:${domain}`;
  if (!registeredStrategies.has(strategyName)) {
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/oauth/callback`,
      },
      verify
    );
    passport.use(strategy);
    registeredStrategies.add(strategyName);
  }
  return strategyName;
}

const verify = async (tokens, done) => {
  console.log("[REPLIT-AUTH] 🔐 Iniciando verify...");
  console.log("[REPLIT-AUTH] 🔐 tokens existe:", !!tokens);

  try {
    let claims;
    try {
      claims = tokens.claims();
      console.log("[REPLIT-AUTH] 🔐 Claims obtidos:", JSON.stringify(claims, null, 2));
    } catch (claimsError) {
      console.error("[REPLIT-AUTH] ❌ Erro ao obter claims:", claimsError.message);
      return done(null, false, { message: "Erro ao processar token" });
    }

    const email = claims.email?.toLowerCase();
    console.log("[REPLIT-AUTH] 📧 Email autenticado:", email);

    if (!email) {
      console.log("[REPLIT-AUTH] ❌ Email não encontrado no perfil");
      return done(null, false, { message: "Email não encontrado no perfil" });
    }

    // Verificar se e admin autorizado (banco ou env)
    const autorizado = await isAdminAuthorizado(email);
    if (!autorizado) {
      console.log("[REPLIT-AUTH] ❌ Email não autorizado:", email);
      return done(null, false, { message: "Email não autorizado como administrador" });
    }

    console.log("[REPLIT-AUTH] ✅ Admin autorizado:", email);

    const user = {
      id: claims.sub,
      email: email,
      nome: claims.first_name || email?.split("@")[0] || "Admin",
      foto: claims.profile_image_url,
      claims: claims,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: claims.exp,
    };

    console.log("[REPLIT-AUTH] ✅ User criado, chamando done(null, user)");
    done(null, user);
  } catch (error) {
    console.error("[REPLIT-AUTH] ❌ Erro na verificação:", error.message);
    console.error("[REPLIT-AUTH] ❌ Stack:", error.stack);
    done(error);
  }
};

passport.serializeUser((user, cb) => {
  console.log("[REPLIT-AUTH] 📦 Serializando user:", user?.email);
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  console.log("[REPLIT-AUTH] 📦 Deserializando user:", user?.email);
  cb(null, user);
});

export function setupReplitAuthRoutes(app) {
  app.set("trust proxy", 1);

  // Rota de debug para verificar configuração
  app.get("/api/admin/auth/debug", async (req, res) => {
    try {
      const cfg = await getOidcConfig();
      res.json({
        ok: true,
        hostname: req.hostname,
        protocol: req.protocol,
        repl_id: process.env.REPL_ID ? "SET" : "NOT_SET",
        issuer_url: process.env.ISSUER_URL || "https://replit.com/oidc",
        callback_url: `https://${req.hostname}/api/oauth/callback`,
        admin_emails_env: ADMIN_EMAILS_ENV.length > 0 ? ADMIN_EMAILS_ENV : "EMPTY",
        oidc_config: cfg ? "LOADED" : "NOT_LOADED"
      });
    } catch (error) {
      res.json({
        ok: false,
        error: error.message,
        stack: error.stack
      });
    }
  });

  app.get("/api/admin/auth/login", async (req, res, next) => {
    console.log("[REPLIT-AUTH] 🚀 Iniciando login...");
    console.log("[REPLIT-AUTH] 🚀 Hostname:", req.hostname);

    try {
      const cfg = await getOidcConfig();
      console.log("[REPLIT-AUTH] ✅ Config OIDC obtida para login");

      const strategyName = ensureStrategy(req.hostname, cfg, verify);
      console.log("[REPLIT-AUTH] ✅ Strategy criada:", strategyName);
      console.log("[REPLIT-AUTH] 🚀 Redirecionando para Replit Auth...");

      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("[REPLIT-AUTH] ❌ Erro ao iniciar login:", error.message);
      console.error("[REPLIT-AUTH] ❌ Stack:", error.stack);
      res.redirect("/?error=auth_init_failed");
    }
  });

  app.get("/api/oauth/callback", async (req, res, next) => {
    console.log("[REPLIT-AUTH] 📥 Callback recebido");
    console.log("[REPLIT-AUTH] 📥 Query params:", req.query);
    console.log("[REPLIT-AUTH] 📥 Hostname:", req.hostname);

    try {
      const cfg = await getOidcConfig();
      console.log("[REPLIT-AUTH] ✅ Config OIDC obtida");

      const strategyName = ensureStrategy(req.hostname, cfg, verify);
      console.log("[REPLIT-AUTH] ✅ Strategy:", strategyName);

      passport.authenticate(strategyName, {
        failureRedirect: "/?error=unauthorized",
        failureMessage: true,
      })(req, res, (err) => {
        console.log("[REPLIT-AUTH] 📥 Dentro do authenticate callback");
        console.log("[REPLIT-AUTH] 📥 err:", err);
        console.log("[REPLIT-AUTH] 📥 req.user:", req.user?.email || "null");

        if (err) {
          console.error("[REPLIT-AUTH] ❌ Erro no callback:", err.message || err);
          console.error("[REPLIT-AUTH] ❌ Stack:", err.stack);
          return res.redirect("/?error=auth_failed");
        }

        if (!req.user) {
          console.log("[REPLIT-AUTH] ❌ Usuário não autorizado (req.user é null)");
          console.log("[REPLIT-AUTH] ❌ Session messages:", req.session?.messages);
          return res.redirect("/?error=unauthorized");
        }

        req.session.admin = req.user;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[REPLIT-AUTH] ❌ Erro ao salvar sessão:", saveErr);
            return res.redirect("/?error=session");
          }
          console.log("[REPLIT-AUTH] ✅ Admin autenticado:", req.user.email);
          res.redirect("/painel.html");
        });
      });
    } catch (error) {
      console.error("[REPLIT-AUTH] ❌ Erro no callback (catch):", error.message);
      console.error("[REPLIT-AUTH] ❌ Stack:", error.stack);
      res.redirect("/?error=auth_callback_failed");
    }
  });

  app.get("/api/admin/auth/logout", async (req, res) => {
    const email = req.session?.admin?.email || "desconhecido";
    
    req.logout(() => {
      req.session.destroy(async (err) => {
        if (err) {
          console.error("[REPLIT-AUTH] Erro ao destruir sessão:", err);
        }
        
        res.clearCookie("connect.sid");
        console.log("[REPLIT-AUTH] 👋 Admin deslogado:", email);
        
        try {
          const cfg = await getOidcConfig();
          const endSessionUrl = client.buildEndSessionUrl(cfg, {
            client_id: process.env.REPL_ID,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          });
          res.redirect(endSessionUrl.href);
        } catch (error) {
          res.redirect("/");
        }
      });
    });
  });

  console.log("[REPLIT-AUTH] ✅ Replit Auth configurado com sucesso");
  console.log("[REPLIT-AUTH] 📧 Admins autorizados (env):", ADMIN_EMAILS_ENV.join(", ") || "Verificar banco de dados");
}

export async function isAuthenticated(req, res, next) {
  const user = req.session?.admin;

  if (!user || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    req.session.admin = user;
    return next();
  } catch (error) {
    console.error("[REPLIT-AUTH] Erro ao renovar token:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export default passport;

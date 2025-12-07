/**
 * Configuração Replit Auth para Admin
 * Super Cartola Manager
 * Implementação baseada no blueprint Replit Auth (OpenID Connect)
 */
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import memoize from "memoizee";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(e => e.length > 0);

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

const verify = (tokens, done) => {
  try {
    const claims = tokens.claims();
    const email = claims.email?.toLowerCase();
    
    console.log("[REPLIT-AUTH] 📧 Email autenticado:", email);
    console.log("[REPLIT-AUTH] 📋 Admins autorizados:", ADMIN_EMAILS);
    
    if (!email) {
      console.log("[REPLIT-AUTH] ❌ Email não encontrado no perfil");
      return done(null, false, { message: "Email não encontrado no perfil" });
    }
    
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
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
    
    done(null, user);
  } catch (error) {
    console.error("[REPLIT-AUTH] Erro na verificação:", error);
    done(error);
  }
};

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

export function setupReplitAuthRoutes(app) {
  app.set("trust proxy", 1);

  app.get("/api/admin/auth/login", async (req, res, next) => {
    try {
      const cfg = await getOidcConfig();
      const strategyName = ensureStrategy(req.hostname, cfg, verify);
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("[REPLIT-AUTH] Erro ao iniciar login:", error);
      res.redirect("/?error=auth_init_failed");
    }
  });

  app.get("/api/oauth/callback", async (req, res, next) => {
    try {
      const cfg = await getOidcConfig();
      const strategyName = ensureStrategy(req.hostname, cfg, verify);
      passport.authenticate(strategyName, {
        failureRedirect: "/?error=unauthorized",
      })(req, res, (err) => {
        if (err) {
          console.error("[REPLIT-AUTH] Erro no callback:", err);
          return res.redirect("/?error=auth_failed");
        }
        
        if (!req.user) {
          console.log("[REPLIT-AUTH] ❌ Usuário não autorizado");
          return res.redirect("/?error=unauthorized");
        }
        
        req.session.admin = req.user;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[REPLIT-AUTH] Erro ao salvar sessão:", saveErr);
            return res.redirect("/?error=session");
          }
          console.log("[REPLIT-AUTH] ✅ Admin autenticado:", req.user.email);
          res.redirect("/painel.html");
        });
      });
    } catch (error) {
      console.error("[REPLIT-AUTH] Erro no callback:", error);
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
  console.log("[REPLIT-AUTH] 📧 Admins autorizados:", ADMIN_EMAILS.join(", ") || "TODOS (sem restrição)");
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

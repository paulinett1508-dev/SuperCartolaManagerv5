/**
 * Configuração Google OAuth para Admin
 * Super Cartola Manager
 */
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// Lista de emails autorizados como admin
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase());

/**
 * Obtém a URL base do ambiente
 */
function getBaseURL() {
  // Prioridade 1: BASE_URL definida manualmente
  if (process.env.BASE_URL) {
    console.log("[GOOGLE-OAUTH] 🌐 Base URL:", process.env.BASE_URL);
    return process.env.BASE_URL;
  }

  // Prioridade 2: Produção
  if (process.env.NODE_ENV === "production") {
    return "https://supercartolamanager.com.br";
  }

  // Prioridade 3: Replit
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const url = `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`;
    console.log("[GOOGLE-OAUTH] 🌐 Base URL (Replit):", url);
    return url;
  }

  // Fallback: localhost
  return "http://localhost:5000";
}

/**
 * Configura o Passport com Google OAuth
 */
function configurarGoogleOAuth() {
  const baseURL = getBaseURL();
  const callbackURL = `${baseURL}/api/oauth/callback`;

  console.log("[GOOGLE-OAUTH] 🔗 Callback URL:", callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL,
      },
      (accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        console.log("[GOOGLE-OAUTH] 📧 Email autenticado:", email);
        console.log("[GOOGLE-OAUTH] 📋 Admins autorizados:", ADMIN_EMAILS);

        if (!email) {
          return done(null, false, {
            message: "Email não encontrado no perfil Google",
          });
        }

        if (!ADMIN_EMAILS.includes(email)) {
          console.log("[GOOGLE-OAUTH] ❌ Email não autorizado:", email);
          return done(null, false, {
            message: "Email não autorizado como administrador",
          });
        }

        console.log("[GOOGLE-OAUTH] ✅ Admin autorizado:", email);

        const user = {
          googleId: profile.id,
          email: email,
          nome: profile.displayName,
          foto: profile.photos?.[0]?.value,
        };

        return done(null, user);
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  console.log("[GOOGLE-OAUTH] ✅ Passport configurado com Google Strategy");
  console.log("[GOOGLE-OAUTH] 📧 Admins autorizados:", ADMIN_EMAILS.join(", "));
}

/**
 * Verifica se as credenciais OAuth estão configuradas
 */
function verificarConfigOAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[GOOGLE-OAUTH] ⚠️ Credenciais não configuradas");
    return false;
  }

  return true;
}

export default passport;
export { configurarGoogleOAuth, verificarConfigOAuth, getBaseURL };

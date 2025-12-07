/**
 * Configuração Google OAuth para Autenticação de Admins
 * Super Cartola Manager
 */
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config();

// Whitelist de emails autorizados como admin (do .env ou hardcoded)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * Determina a URL base do ambiente
 */
function getBaseURL() {
  // Prioridade 1: BASE_URL definida manualmente no .env
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, ""); // Remove trailing slash
  }

  // Prioridade 2: Produção
  if (process.env.NODE_ENV === "production") {
    return "https://supercartolamanager.com.br";
  }

  // Prioridade 3: Localhost
  return `http://localhost:${process.env.PORT || 5000}`;
}

/**
 * Configura o Passport com estratégia Google OAuth
 */
export function configurarGoogleOAuth() {
  const baseURL = getBaseURL();
  const callbackURL = `${baseURL}/api/admin/auth/google/callback`;

  console.log(`[GOOGLE-OAUTH] 🌐 Base URL: ${baseURL}`);
  console.log(`[GOOGLE-OAUTH] 🔗 Callback URL: ${callbackURL}`);

  // Serialização do usuário na sessão
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  // Estratégia Google OAuth 2.0
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL,
        scope: ["profile", "email"],
      },
      (accessToken, refreshToken, profile, done) => {
        // Extrair dados do perfil Google
        const email = profile.emails?.[0]?.value?.toLowerCase() || "";
        const nome = profile.displayName || "";
        const foto = profile.photos?.[0]?.value || "";
        const googleId = profile.id;

        // Verificar se email está na whitelist
        const isAdmin = ADMIN_EMAILS.includes(email);

        if (!isAdmin) {
          console.log(`[ADMIN-AUTH] ⛔ Acesso negado para: ${email}`);
          return done(null, false, {
            message: "Email não autorizado como administrador",
          });
        }

        console.log(`[ADMIN-AUTH] ✅ Admin autenticado: ${email}`);

        // Retornar objeto do admin
        const adminUser = {
          googleId,
          email,
          nome,
          foto,
          isAdmin: true,
          loginAt: new Date(),
        };

        return done(null, adminUser);
      },
    ),
  );

  console.log("[GOOGLE-OAUTH] ✅ Passport configurado com Google Strategy");
  console.log(
    `[GOOGLE-OAUTH] 📧 Admins autorizados: ${ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS.join(", ") : "NENHUM (configure ADMIN_EMAILS no .env)"}`,
  );
}

/**
 * Verifica se as credenciais Google estão configuradas
 */
export function verificarConfigOAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "[GOOGLE-OAUTH] ❌ ERRO: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não configurados no .env",
    );
    return false;
  }

  if (ADMIN_EMAILS.length === 0) {
    console.warn(
      "[GOOGLE-OAUTH] ⚠️ AVISO: Nenhum email admin configurado em ADMIN_EMAILS",
    );
  }

  return true;
}

export { ADMIN_EMAILS };
export default passport;

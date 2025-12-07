/**
 * Rotas de Autenticação Admin (Google OAuth)
 * Super Cartola Manager
 */
import express from "express";
import passport from "passport";

const router = express.Router();

console.log("[ADMIN-AUTH] ✅ Rotas de autenticação admin carregadas");

/**
 * GET /api/admin/auth/test
 * Rota de teste
 */
router.get("/test", (req, res) => {
  res.json({ message: "Admin auth routes working!", timestamp: new Date() });
});

/**
 * GET /api/admin/auth/google
 * Inicia fluxo de autenticação Google
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

/**
 * GET /api/admin/auth/google/callback
 * Callback após autenticação Google
 */
router.get(
  "/google/callback",
  (req, res, next) => {
    console.log("[ADMIN-AUTH] 🔄 Callback recebido!");
    console.log("[ADMIN-AUTH] Query params:", req.query);
    next();
  },
  passport.authenticate("google", {
    failureRedirect: "/?error=unauthorized",
    failureMessage: true,
  }),
  (req, res) => {
    console.log("[ADMIN-AUTH] ✅ Autenticação bem sucedida, user:", req.user);
    req.session.admin = req.user;

    req.session.save((err) => {
      if (err) {
        console.error("[ADMIN-AUTH] ❌ Erro ao salvar sessão:", err);
        return res.redirect("/?error=session");
      }

      console.log("[ADMIN-AUTH] ✅ Sessão admin criada:", req.user.email);
      res.redirect("/dashboard.html");
    });
  },
);

/**
 * GET /api/admin/auth/session
 * Verifica sessão atual do admin
 */
router.get("/session", (req, res) => {
  if (req.session?.admin) {
    res.json({
      authenticated: true,
      admin: {
        email: req.session.admin.email,
        nome: req.session.admin.nome,
        foto: req.session.admin.foto,
      },
    });
  } else {
    res.status(401).json({
      authenticated: false,
      message: "Não autenticado como admin",
    });
  }
});

/**
 * POST /api/admin/auth/logout
 * Logout do admin
 */
router.post("/logout", (req, res) => {
  const email = req.session?.admin?.email || "desconhecido";

  req.session.destroy((err) => {
    if (err) {
      console.error("[ADMIN-AUTH] ❌ Erro ao destruir sessão:", err);
      return res.status(500).json({ error: "Erro ao fazer logout" });
    }

    res.clearCookie("connect.sid");
    console.log("[ADMIN-AUTH] 👋 Admin deslogado:", email);
    res.json({ success: true, message: "Logout realizado" });
  });
});

/**
 * GET /api/admin/auth/check
 * Check rápido de autenticação (sem detalhes)
 */
router.get("/check", (req, res) => {
  res.json({
    authenticated: !!req.session?.admin,
    isAdmin: !!req.session?.admin?.isAdmin,
  });
});

export default router;

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
  console.log("[ADMIN-AUTH] 🧪 Rota /test acessada!");
  res.json({ message: "Admin auth routes working!", timestamp: new Date() });
});

/**
 * GET /api/admin/auth/google
 * Inicia fluxo de autenticação Google
 */
router.get(
  "/google",
  (req, res, next) => {
    console.log("[ADMIN-AUTH] 🔑 Iniciando autenticação Google...");
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
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
 * Verifica autenticação do admin
 */
router.get("/check", (req, res) => {
  if (req.session?.admin) {
    res.json({
      authenticated: true,
      isAdmin: true,
      user: {
        email: req.session.admin.email,
        name: req.session.admin.nome,
        picture: req.session.admin.foto,
      },
    });
  } else {
    res.status(401).json({
      authenticated: false,
      message: "Não autenticado",
    });
  }
});

export default router;

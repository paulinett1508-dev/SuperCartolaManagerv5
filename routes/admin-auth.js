/**
 * Rotas de Autenticação Admin (Replit Auth)
 * Super Cartola Manager
 */
import express from "express";

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
 * GET /api/admin/auth/session
 * Verifica sessão atual do admin
 */
router.get("/session", (req, res) => {
  if (req.session?.admin) {
    res.json({
      authenticated: true,
      admin: {
        id: req.session.admin.id,
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
 * Logout do admin (legacy POST endpoint - redirects to GET)
 */
router.post("/logout", (req, res) => {
  res.redirect("/api/admin/auth/logout");
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
        id: req.session.admin.id,
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

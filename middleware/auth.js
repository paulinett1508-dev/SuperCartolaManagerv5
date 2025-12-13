/**
 * Middleware de Autenticação - Super Cartola Manager
 * Destino: /middlewares/auth.js
 * Protege rotas Admin (Google OAuth) e Participante (senha time)
 */

/**
 * Lista de rotas/recursos PÚBLICOS (sem autenticação)
 */
export const ROTAS_PUBLICAS = [
  "/favicon.ico",
  "/favicon.png",
  "/escudos/",
  "/css/",
  "/js/",
  "/img/",
  "/api/admin/auth/",
  "/api/participante/auth/",
  "/api/oauth/callback",
  "/api/cartola/",
  "/api/configuracao/",
  "/api/version",
  // ✅ PWA - Arquivos que precisam ser públicos
  "/participante/manifest.json",
  "/participante/service-worker.js",
  // ✅ CRÍTICO: Assets estáticos do participante (JS, CSS, imagens)
  // Sem isso, o auth middleware redireciona para login e retorna HTML
  "/participante/js/",
  "/participante/css/",
  "/participante/img/",
  "/participante/fronts/",
];

/**
 * Lista de páginas HTML ADMIN (requerem sessão admin)
 */
export const PAGINAS_ADMIN = [
  "/painel.html",
  "/detalhe-liga.html",
  "/gerenciar.html",
  "/admin.html",
  "/criar-liga.html",
  "/editar-liga.html",
  "/ferramentas.html",
  "/ferramentas-rodadas.html",
  "/gerir-senhas-participantes.html",
  "/admin-consolidacao.html",
  "/gerenciar-modulos.html",
  "/layout.html",
];

/**
 * Lista de páginas/rotas PARTICIPANTE (requerem sessão participante)
 */
export const PAGINAS_PARTICIPANTE = [
  "/participante/",
  "/participante-dashboard.html",
];

/**
 * Verifica se a URL é um recurso público
 */
export function isRotaPublica(url) {
  return ROTAS_PUBLICAS.some((rota) => url.startsWith(rota) || url === rota);
}

/**
 * Verifica se a URL é uma página admin
 */
export function isPaginaAdmin(url) {
  return PAGINAS_ADMIN.some((pagina) => url.includes(pagina));
}

/**
 * Verifica se a URL é uma página de participante
 */
export function isPaginaParticipante(url) {
  return PAGINAS_PARTICIPANTE.some((pagina) => url.includes(pagina));
}

/**
 * Middleware principal de proteção de rotas
 * Aplica ANTES de servir arquivos estáticos
 */
export function protegerRotas(req, res, next) {
  const url = req.path;

  // 1. Recursos públicos - liberar
  if (isRotaPublica(url)) {
    return next();
  }

  // 2. Landing page (index.html ou /) - liberar
  if (url === "/" || url === "/index.html") {
    // Se admin logado, redirecionar para painel
    if (req.session?.admin) {
      return res.redirect("/painel.html");
    }
    // Se participante logado, redirecionar para área participante
    if (req.session?.participante) {
      return res.redirect("/participante/");
    }
    return next();
  }

  // 3. Login participante - liberar
  if (url === "/participante-login.html") {
    // Se já logado como participante, redirecionar
    if (req.session?.participante) {
      return res.redirect("/participante/");
    }
    return next();
  }

  // 4. Páginas ADMIN - verificar sessão admin
  if (isPaginaAdmin(url)) {
    if (!req.session?.admin) {
      console.log(`[AUTH] 🚫 Acesso admin negado (não autenticado): ${url}`);
      return res.redirect("/?error=admin_required");
    }

    // Bloquear participante de acessar admin
    if (req.session?.participante && !req.session?.admin) {
      console.log(`[AUTH] 🚫 Participante bloqueado de admin: ${url}`);
      return res.redirect("/participante/");
    }

    return next();
  }

  // 5. Páginas PARTICIPANTE - verificar sessão participante
  if (isPaginaParticipante(url)) {
    if (!req.session?.participante) {
      console.log(`[AUTH] 🚫 Acesso participante negado: ${url}`);
      return res.redirect("/participante-login.html");
    }
    return next();
  }

  // 6. Demais rotas - liberar (APIs são protegidas individualmente)
  next();
}

/**
 * Middleware para proteger rotas de API admin
 * Usar em rotas específicas que só admin pode acessar
 */
export function verificarAdmin(req, res, next) {
  if (!req.session?.admin) {
    return res.status(401).json({
      error: "Não autorizado",
      message: "Autenticação de administrador necessária",
      needsLogin: true,
    });
  }
  next();
}

/**
 * Middleware para proteger rotas de API participante
 */
export function verificarParticipante(req, res, next) {
  if (!req.session?.participante) {
    return res.status(401).json({
      error: "Sessão expirada",
      message: "Faça login novamente",
      needsLogin: true,
    });
  }
  next();
}

/**
 * Middleware legado - bloquear participante de admin
 * @deprecated Use protegerRotas no lugar
 */
export function bloquearParticipanteDeAdmin(req, res, next) {
  if (req.session?.participante && !req.session?.admin) {
    const isAdmin = PAGINAS_ADMIN.some((rota) => req.path.includes(rota));
    if (isAdmin) {
      console.log("[AUTH] 🚫 Participante bloqueado (legado):", req.path);
      return res.redirect("/participante/");
    }
  }
  next();
}

/**
 * Middleware legado - manter compatibilidade
 * @deprecated Use protegerRotas no lugar
 */
export function bloquearPaginasAdminParaParticipantes(req, res, next) {
  return protegerRotas(req, res, next);
}

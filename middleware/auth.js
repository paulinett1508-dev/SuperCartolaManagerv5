/**
 * Middleware de Autenticação para Participantes
 * Protege APENAS as páginas específicas de participantes
 */

/**
 * Verifica se o participante está autenticado via sessão
 */
export function verificarAutenticacaoParticipante(req, res, next) {
  // Permitir rotas de API sem autenticação de participante
  if (req.url.startsWith('/api/')) {
    return next();
  }

  // Verificar se há sessão de participante
  if (req.session && req.session.participante) {
    return next();
  }

  // Se não está autenticado, redirecionar para login de participante
  res.redirect('/participante-login.html');
}

/**
 * Lista de rotas que NÃO precisam de autenticação (públicas e admin)
 */
export const ROTAS_PUBLICAS = [
  '/participante-login.html',
  '/favicon.ico',
  '/favicon.png',
  '/escudos/',
  '/css/',
  '/js/',
  '/img/',
];

/**
 * Lista de rotas ADMIN que NÃO devem ter bloqueio
 */
export const ROTAS_ADMIN = [
  '/dashboard.html',
  '/detalhe-liga.html',
  '/gerenciar.html',
  '/admin.html',
  '/criar-liga.html',
  '/editar-liga.html',
  '/ferramentas.html',
  '/ferramentas-rodadas.html',
  '/gerir-senhas-participantes.html',
  '/admin-consolidacao.html',
  '/gerenciar-modulos.html',
  '/index.html',
  '/layout.html',
];

/**
 * Lista de rotas que PRECISAM de autenticação de participante
 */
export const ROTAS_PARTICIPANTE = [
  '/participante-dashboard.html',
  '/participante-login.html',
  '/participante/',
];

/**
 * Verifica se a rota é pública
 */
export function isRotaPublica(url) {
  return ROTAS_PUBLICAS.some(rota => url.startsWith(rota));
}

/**
 * Verifica se a rota é admin
 */
export function isRotaAdmin(url) {
  return ROTAS_ADMIN.some(rota => url.includes(rota));
}

/**
 * Verifica se a rota é de participante
 */
export function isRotaParticipante(url) {
  return ROTAS_PARTICIPANTE.some(rota => url.includes(rota));
}


/**
 * Middleware que BLOQUEIA participantes de acessar rotas admin
 */
export function bloquearParticipanteDeAdmin(req, res, next) {
  const isRotaAdmin = ROTAS_ADMIN.some(rota => req.path.includes(rota));
  
  if (isRotaAdmin && req.session?.participante) {
    console.log('[AUTH] 🚫 Participante tentou acessar rota admin:', req.path);
    return res.redirect('/participante-login.html');
  }
  
  next();
}

/**
 * Middleware que BLOQUEIA acesso direto a páginas HTML admin
 * Deve ser aplicado ANTES de servir arquivos estáticos
 */
export function bloquearPaginasAdminParaParticipantes(req, res, next) {
  // Verificar se é uma requisição HTML
  const isHtmlRequest = req.path.endsWith('.html') || (!req.path.includes('.') && req.path !== '/');
  
  if (!isHtmlRequest) {
    return next();
  }
  
  // Se é participante autenticado e está tentando acessar página admin
  if (req.session?.participante) {
    const isRotaAdmin = ROTAS_ADMIN.some(rota => req.path.includes(rota));
    const isRotaParticipante = ROTAS_PARTICIPANTE.some(rota => req.path.includes(rota)) || req.path.includes('/participante');
    
    // Se está tentando acessar admin, bloquear
    if (isRotaAdmin) {
      console.log('[AUTH] 🚫 Participante bloqueado de acessar:', req.path);
      return res.redirect('/participante/');
    }
    
    // Se está na raiz, redirecionar para dashboard participante
    if (req.path === '/' || req.path === '/index.html') {
      console.log('[AUTH] ↪️ Participante redirecionado de raiz para dashboard');
      return res.redirect('/participante/');
    }
    
    // Permitir rotas de participante
    if (isRotaParticipante) {
      return next();
    }
  }
  
  next();
}

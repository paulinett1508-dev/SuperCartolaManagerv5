
/**
 * Middleware de Autenticação para páginas administrativas
 * Protege rotas HTML do painel de administração
 */

/**
 * Verifica se o usuário tem autenticação Replit válida
 */
export function verificarAutenticacaoReplit(req, res, next) {
  // Verificar se tem os headers de autenticação do Replit
  const replitUserId = req.headers["x-replit-user-id"];
  const replitUserName = req.headers["x-replit-user-name"];
  
  if (replitUserId && replitUserName) {
    req.user = {
      id: replitUserId,
      name: replitUserName,
      roles: req.headers["x-replit-user-roles"] || "",
    };
    return next();
  }
  
  // Se não está autenticado, redirecionar para página de acesso negado
  res.status(403).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Acesso Negado - Super Cartola Manager</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          padding: 40px 30px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          border: 1px solid rgba(255, 69, 0, 0.3);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #ff4500; font-size: 28px; margin-bottom: 15px; }
        p { color: #a0a0a0; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
        .btn {
          background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%);
          color: white;
          padding: 14px 28px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          display: inline-block;
          transition: transform 0.2s;
        }
        .btn:hover { transform: translateY(-2px); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🔒</div>
        <h1>Acesso Negado</h1>
        <p>Esta área é restrita aos administradores do sistema.<br><br>
        Se você é um participante, acesse o app específico para participantes.</p>
        <a href="/participante-login.html" class="btn">🏠 Ir para Login de Participante</a>
      </div>
    </body>
    </html>
  `);
}

/**
 * Lista de rotas públicas que não precisam de autenticação
 */
export const ROTAS_PUBLICAS = [
  '/participante-login.html',
  '/participante-dashboard.html',
  '/favicon.ico',
  '/favicon.png',
  '/escudos/',
  '/css/',
  '/js/',
  '/img/',
];

/**
 * Verifica se a rota é pública
 */
export function isRotaPublica(url) {
  return ROTAS_PUBLICAS.some(rota => url.startsWith(rota));
}

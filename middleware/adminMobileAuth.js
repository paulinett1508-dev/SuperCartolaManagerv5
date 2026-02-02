/**
 * Middleware de Autenticação Mobile Admin
 * Valida JWT tokens para acesso às rotas mobile
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
const JWT_EXPIRATION = '24h';

/**
 * Gera JWT token para admin autenticado
 */
function generateToken(email, nome) {
  return jwt.sign(
    {
      email,
      nome,
      type: 'admin',
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Middleware: valida JWT token + verifica se é admin
 */
async function validateAdminToken(req, res, next) {
  try {
    // Extrai token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token não fornecido',
        code: 'TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Valida JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        error: 'Token inválido',
        code: 'TOKEN_INVALID'
      });
    }

    // Verifica se é admin
    const db = req.app.locals.db;
    const admin = await db.collection('admins').findOne({ email: decoded.email });

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const isAdminEmail = adminEmails.includes(decoded.email);

    if (!admin && !isAdminEmail) {
      return res.status(403).json({
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }

    // Adiciona info do admin no request
    req.admin = {
      email: decoded.email,
      nome: decoded.nome
    };

    next();
  } catch (error) {
    console.error('[adminMobileAuth] Erro ao validar token:', error);
    res.status(500).json({
      error: 'Erro ao validar token',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Helper: verifica se usuário é admin (sem JWT)
 * Usado apenas no endpoint de autenticação inicial
 */
async function isAdminAutorizado(email, db) {
  try {
    const admin = await db.collection('admins').findOne({ email });

    if (admin) {
      return true;
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    return adminEmails.includes(email);
  } catch (error) {
    console.error('[adminMobileAuth] Erro ao verificar admin:', error);
    return false;
  }
}

export {
  generateToken,
  validateAdminToken,
  isAdminAutorizado
};

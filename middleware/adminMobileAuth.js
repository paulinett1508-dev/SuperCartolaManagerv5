/**
 * Middleware de Autenticação Mobile Admin
 * Valida JWT tokens para acesso às rotas mobile
 */

import jwt from 'jsonwebtoken';
import { isAdminAutorizado as isAdminAutorizadoCentral } from '../config/admin-config.js';
import { getDB } from '../config/database.js';

// ✅ SECURITY: JWT_SECRET obrigatório em produção
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';

  if (!secret && IS_PRODUCTION) {
    console.error('[SECURITY] ❌ JWT_SECRET não definido em produção! Defina a variável de ambiente.');
    console.error('[SECURITY] ❌ Sistema mobile será desabilitado por segurança.');
    process.exit(1);
  }

  // Desenvolvimento: gera secret temporário (muda a cada restart)
  return secret || `dev_only_secret_${Date.now()}`;
})();

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

    // Verifica se é admin (usa função centralizada)
    const db = req.app.locals.db || getDB();
    const isAdmin = await isAdminAutorizadoCentral(decoded.email, db);

    if (!isAdmin) {
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

// ✅ isAdminAutorizado removido (usar função centralizada de config/admin-config.js)

export {
  generateToken,
  validateAdminToken,
  isAdminAutorizadoCentral as isAdminAutorizado // Re-exporta para compatibilidade
};

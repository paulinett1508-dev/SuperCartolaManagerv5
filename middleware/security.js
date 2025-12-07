/**
 * Middleware de Segurança - Super Cartola Manager
 * Headers, Rate Limiting, Proteções
 */

// ====================================================================
// RATE LIMITING - Proteção contra brute force
// ====================================================================
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100; // máx requisições por minuto
const RATE_LIMIT_AUTH_MAX = 10; // máx tentativas de login por minuto

// Limpar contadores antigos periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.startTime > RATE_LIMIT_WINDOW) {
      requestCounts.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

/**
 * Rate Limiter genérico
 */
export function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }

  const data = requestCounts.get(ip);

  if (now - data.startTime > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }

  data.count++;

  if (data.count > RATE_LIMIT_MAX_REQUESTS) {
    console.log(`[SECURITY] 🚫 Rate limit excedido: ${ip}`);
    return res.status(429).json({
      error: "Muitas requisições",
      message: "Aguarde um momento antes de tentar novamente",
      retryAfter: Math.ceil(
        (RATE_LIMIT_WINDOW - (now - data.startTime)) / 1000,
      ),
    });
  }

  next();
}

/**
 * Rate Limiter específico para autenticação (mais restritivo)
 */
const authAttempts = new Map();

export function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();

  if (!authAttempts.has(ip)) {
    authAttempts.set(ip, { count: 1, startTime: now });
    return next();
  }

  const data = authAttempts.get(ip);

  if (now - data.startTime > RATE_LIMIT_WINDOW) {
    authAttempts.set(ip, { count: 1, startTime: now });
    return next();
  }

  data.count++;

  if (data.count > RATE_LIMIT_AUTH_MAX) {
    console.log(`[SECURITY] 🚫 Auth rate limit excedido: ${ip}`);
    return res.status(429).json({
      error: "Muitas tentativas de login",
      message: "Aguarde 1 minuto antes de tentar novamente",
      retryAfter: Math.ceil(
        (RATE_LIMIT_WINDOW - (now - data.startTime)) / 1000,
      ),
    });
  }

  next();
}

// ====================================================================
// SECURITY HEADERS - Proteção via headers HTTP
// ====================================================================
export function securityHeaders(req, res, next) {
  // Prevenir clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Prevenir MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (desabilitar recursos não usados)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

  // Content Security Policy (produção)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
        "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.cartolafc.globo.com https://*.globo.com",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );

    // HSTS (apenas em produção com HTTPS)
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  next();
}

// ====================================================================
// PROTEÇÃO CONTRA ATAQUES COMUNS
// ====================================================================

/**
 * Sanitizar parâmetros de entrada
 */
export function sanitizeInput(req, res, next) {
  // Limitar tamanho de query strings
  const queryString = req.originalUrl.split("?")[1] || "";
  if (queryString.length > 2000) {
    return res.status(414).json({ error: "URL muito longa" });
  }

  // Bloquear tentativas óbvias de injeção no path
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS
    /javascript:/i, // XSS
    /on\w+\s*=/i, // Event handlers
    /union\s+select/i, // SQL injection
    /exec\s*\(/i, // Command injection
  ];

  const fullUrl = req.originalUrl;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl)) {
      console.log(
        `[SECURITY] 🚨 Tentativa suspeita bloqueada: ${req.ip} - ${fullUrl}`,
      );
      return res.status(400).json({ error: "Requisição inválida" });
    }
  }

  next();
}

/**
 * Log de segurança para tentativas suspeitas
 */
export function securityLogger(req, res, next) {
  // Detectar tentativas de acesso a arquivos sensíveis
  const sensitivePatterns = [
    /\.env/i,
    /\.git/i,
    /\.htaccess/i,
    /wp-admin/i,
    /wp-login/i,
    /phpmyadmin/i,
    /admin\.php/i,
    /config\.php/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(req.path)) {
      console.log(`[SECURITY] 🔍 Scan detectado: ${req.ip} - ${req.path}`);
      return res.status(404).send("Not Found");
    }
  }

  next();
}

// ====================================================================
// MIDDLEWARE COMBINADO
// ====================================================================
export function setupSecurity(app) {
  // Ordem importa!
  app.use(securityHeaders);
  app.use(sanitizeInput);
  app.use(securityLogger);
  app.use(rateLimiter);

  console.log("[SECURITY] 🛡️ Middlewares de segurança ativados");
}

export default {
  rateLimiter,
  authRateLimiter,
  securityHeaders,
  sanitizeInput,
  securityLogger,
  setupSecurity,
};

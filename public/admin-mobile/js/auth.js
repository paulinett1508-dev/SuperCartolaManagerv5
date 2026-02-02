/**
 * Auth Module - Autenticação de Admin
 */

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

/**
 * Faz login com email e senha
 */
export async function login(email, senha) {
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, senha })
    });

    if (!response.ok) {
      throw new Error('Credenciais inválidas');
    }

    // Após login no backend, pega token JWT
    const authResponse = await fetch('/api/admin/mobile/auth', {
      method: 'POST',
      credentials: 'include' // Inclui session cookie
    });

    if (!authResponse.ok) {
      const error = await authResponse.json();
      throw new Error(error.error || 'Acesso negado');
    }

    const data = await authResponse.json();

    // Salva token e user data
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify({
      email: data.email,
      nome: data.nome
    }));

    console.log('Login bem-sucedido:', data.email);
    return true;
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
}

/**
 * Verifica se o token atual é válido
 */
export async function checkAuth() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return false;
  }

  try {
    const response = await fetch('/api/admin/mobile/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      // Token inválido ou expirado
      logout();
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar auth:', error);
    return false;
  }
}

/**
 * Faz logout
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  console.log('Logout realizado');
  window.location.href = '/admin-mobile/login.html';
}

/**
 * Retorna o token atual
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Retorna dados do usuário logado
 */
export function getUser() {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
}

/**
 * Verifica se está autenticado (síncrono)
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Middleware de autenticação
 * Redireciona para login se não autenticado
 */
export async function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/admin-mobile/login.html';
    return false;
  }

  const isValid = await checkAuth();
  if (!isValid) {
    window.location.href = '/admin-mobile/login.html';
    return false;
  }

  return true;
}

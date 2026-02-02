/**
 * CONFIGURAÇÃO DE ADMINISTRADORES - Super Cartola Manager
 *
 * Centraliza a lógica de verificação de Super Admins.
 * Remove hardcodes espalhados pelo código.
 *
 * @version 1.0.0
 * @since 2026-01-03
 */

// ============================================================================
// SUPER ADMINS (via variáveis de ambiente)
// ============================================================================

/**
 * Lista de emails de Super Admins
 * Carregada da variável de ambiente ADMIN_EMAILS
 */
export const SUPER_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * Email do Super Admin principal (primeiro da lista)
 */
export const PRIMARY_SUPER_ADMIN = SUPER_ADMIN_EMAILS[0] || "";

/**
 * Verifica se um email é de Super Admin
 *
 * @param {string} email - Email a verificar
 * @returns {boolean}
 */
export function isSuperAdmin(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase().trim();
    return SUPER_ADMIN_EMAILS.includes(emailLower);
}

/**
 * Verifica se um admin (sessão) é Super Admin
 *
 * @param {Object} admin - Objeto admin da sessão
 * @returns {boolean}
 */
export function isAdminSuper(admin) {
    if (!admin) return false;

    // Flag explícita na sessão
    if (admin.superAdmin === true) return true;

    // Verificar por email
    return isSuperAdmin(admin.email);
}

/**
 * Verifica se um email é de admin autorizado (MongoDB + ENV)
 * CENTRALIZADO: Todas as verificações de admin devem usar esta função
 *
 * @param {string} email - Email a verificar
 * @param {Object} db - Instância do MongoDB
 * @returns {Promise<boolean>}
 */
export async function isAdminAutorizado(email, db) {
    if (!email) return false;

    const emailLower = email.toLowerCase().trim();

    try {
        if (db) {
            // 1. Verificar na collection admins (prioridade)
            const admin = await db.collection('admins').findOne({
                email: emailLower,
                ativo: { $ne: false } // ✅ Verifica campo 'ativo'
            });

            if (admin) {
                return true;
            }

            // 2. Se tem admins no banco mas email não está, negar
            const countAdmins = await db.collection('admins').countDocuments();
            if (countAdmins > 0) {
                // Banco tem admins, mas esse email não está → NEGAR
                return false;
            }
        }
    } catch (error) {
        console.error('[admin-config] Erro ao verificar admin no banco:', error.message);
        // Em caso de erro no banco, continua para fallback
    }

    // 3. Fallback: verificar na variável de ambiente
    // Usado quando banco está vazio ou indisponível
    if (SUPER_ADMIN_EMAILS.length > 0) {
        return SUPER_ADMIN_EMAILS.includes(emailLower);
    }

    // 4. Sem restrição configurada (modo desenvolvimento)
    console.warn('[admin-config] ⚠️ Sem restrição de admin configurada');
    return false; // ✅ SECURITY: Negar por padrão
}

// ============================================================================
// CONFIGURAÇÕES PADRÃO PARA NOVAS LIGAS
// ============================================================================

/**
 * Módulos ativos por padrão ao criar nova liga
 *
 * v2.0: Módulos BASE sempre ativos, OPCIONAIS desabilitados
 * Admin deve configurar regras antes de habilitar módulos opcionais
 */
export const DEFAULT_MODULOS_ATIVOS = {
    // Módulos BASE - sempre habilitados
    extrato: true,
    ranking: true,
    rodadas: true,
    historico: true,
    // Módulos OPCIONAIS - desabilitados até admin configurar
    top10: false,
    melhorMes: false,
    pontosCorridos: false,
    mataMata: false,
    artilheiro: false,
    luvaOuro: false,
    campinho: false,
    dicas: false,
};

/**
 * Configurações padrão para nova liga
 */
export const DEFAULT_LIGA_CONFIG = {
    ranking_rodada: {
        // Valores de bônus/ônus por posição (exemplo para 32 participantes)
        valores: {
            1: 100, 2: 80, 3: 60, 4: 50, 5: 40,
            6: 30, 7: 25, 8: 20, 9: 15, 10: 10,
            // Posições intermediárias = 0
            // Últimas posições = ônus (negativo)
            28: -10, 29: -15, 30: -20, 31: -30, 32: -50,
        },
        faixas: {
            credito: { inicio: 1, fim: 10 },
            neutro: { inicio: 11, fim: 27 },
            debito: { inicio: 28, fim: 32 },
        },
    },
    pontos_corridos: {
        rodada_inicial: 7,
        valor_vitoria: 5,
        valor_empate: 3,
        valor_goleada: 7,
        tolerancia_empate: 0.3,
        minimo_goleada: 50,
    },
    top10: {
        habilitado: true,
        valores_mito: {
            1: 50, 2: 40, 3: 30, 4: 25, 5: 20,
            6: 15, 7: 12, 8: 10, 9: 8, 10: 5,
        },
        valores_mico: {
            1: -50, 2: -40, 3: -30, 4: -25, 5: -20,
            6: -15, 7: -12, 8: -10, 9: -8, 10: -5,
        },
    },
    mata_mata: {
        habilitado: true,
        edicoes: 4,
        participantes_por_edicao: 16,
    },
    melhor_mes: {
        habilitado: true,
        valor_premio: 100,
    },
    artilheiro: {
        habilitado: true,
    },
    luva_ouro: {
        habilitado: true,
    },
    cards_desabilitados: [],
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    SUPER_ADMIN_EMAILS,
    PRIMARY_SUPER_ADMIN,
    isSuperAdmin,
    isAdminSuper,
    isAdminAutorizado,
    DEFAULT_MODULOS_ATIVOS,
    DEFAULT_LIGA_CONFIG,
};

/**
 * Activity Tracker Middleware v1.0
 * Rastreia atividade de participantes para monitoramento em tempo real
 *
 * Funciona de forma assíncrona (não bloqueia a resposta)
 */

import UserActivity from '../models/UserActivity.js';
import Liga from '../models/Liga.js';

// Cache de nomes de liga para evitar lookups repetidos
const ligaCache = new Map();
const LIGA_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Detecta tipo de dispositivo baseado no User-Agent
 */
function detectarDispositivo(userAgent = '') {
    if (/iPad/i.test(userAgent)) return 'Tablet';
    if (/Mobile|Android|iPhone|iPod/i.test(userAgent)) return 'Mobile';
    return 'Desktop';
}

/**
 * Extrai nome do módulo do path da requisição
 */
function extrairModulo(path, headerModulo) {
    // Se o header X-Modulo-Atual foi enviado, usar ele
    if (headerModulo) return headerModulo;

    // Tentar extrair do path da API
    if (path.includes('extrato')) return 'extrato';
    if (path.includes('ranking')) return 'ranking';
    if (path.includes('rodadas')) return 'rodadas';
    if (path.includes('top10')) return 'top10';
    if (path.includes('mata-mata')) return 'mata-mata';
    if (path.includes('pontos-corridos')) return 'pontos-corridos';
    if (path.includes('artilheiro')) return 'artilheiro';
    if (path.includes('luva')) return 'luva-de-ouro';
    if (path.includes('melhor-mes')) return 'melhor-mes';

    return 'home';
}

/**
 * Busca nome da liga (com cache)
 */
async function buscarNomeLiga(ligaId) {
    // Verificar cache
    const cached = ligaCache.get(ligaId);
    if (cached && Date.now() - cached.timestamp < LIGA_CACHE_TTL) {
        return cached.nome;
    }

    try {
        const liga = await Liga.findById(ligaId).select('nome').lean();
        const nome = liga?.nome || 'Liga';

        // Salvar no cache
        ligaCache.set(ligaId, { nome, timestamp: Date.now() });

        return nome;
    } catch (error) {
        return 'Liga';
    }
}

/**
 * Middleware principal de rastreamento de atividade
 * Deve ser aplicado APENAS em rotas de participante (não admin, não auth)
 */
export function trackParticipanteActivity(req, res, next) {
    // Continuar imediatamente (não bloquear a resposta)
    next();

    // Registrar atividade de forma assíncrona
    setImmediate(async () => {
        try {
            // Verificar se há sessão de participante
            const participante = req.session?.participante;
            if (!participante || !participante.timeId || !participante.ligaId) {
                return;
            }

            const userAgent = req.get('User-Agent') || '';
            const moduloHeader = req.get('X-Modulo-Atual') || '';

            // Buscar nome da liga
            const ligaNome = await buscarNomeLiga(participante.ligaId);

            // Preparar dados de atividade
            const dadosAtividade = {
                time_id: participante.timeId,
                liga_id: participante.ligaId,
                nome_time: participante.participante?.nome_time || '',
                nome_cartola: participante.participante?.nome_cartola || '',
                escudo: participante.participante?.foto_time || '',
                liga_nome: ligaNome,
                modulo_atual: extrairModulo(req.path, moduloHeader),
                dispositivo: detectarDispositivo(userAgent),
                user_agent: userAgent.substring(0, 500), // Limitar tamanho
                session_id: req.sessionID || ''
            };

            // Registrar no banco (upsert)
            await UserActivity.registrarAtividade(dadosAtividade);

        } catch (error) {
            // Silenciar erros para não afetar a aplicação
            // Em produção, logs são silenciados
            if (process.env.NODE_ENV !== 'production') {
                console.error('[ActivityTracker] Erro ao registrar atividade:', error.message);
            }
        }
    });
}

/**
 * Rotas que devem ser rastreadas
 */
export const rotasParaRastrear = [
    '/api/extrato-cache',
    '/api/ranking-cache',
    '/api/rodadas',
    '/api/top10',
    '/api/mata-mata',
    '/api/pontos-corridos',
    '/api/artilheiro',
    '/api/luva-de-ouro',
    '/api/ligas',
    '/api/consolidacao'
];

/**
 * Middleware condicional - aplica tracking apenas em rotas específicas
 */
export function activityTrackerMiddleware(req, res, next) {
    // Verificar se a rota deve ser rastreada
    const deveRastrear = rotasParaRastrear.some(rota => req.path.startsWith(rota));

    if (deveRastrear) {
        return trackParticipanteActivity(req, res, next);
    }

    next();
}

export default activityTrackerMiddleware;

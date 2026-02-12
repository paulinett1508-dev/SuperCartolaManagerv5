// =====================================================================
// GITHUB ANALYTICS ROUTES - Integração com GitHub API (Admin)
// v1.0 - Pull Requests, Branches, Sync Status
// =====================================================================

import express from 'express';
import { execSync } from 'child_process';
import https from 'https';
import { verificarAdmin } from '../middleware/auth.js';

const router = express.Router();

// =====================================================================
// CACHE SIMPLES (TTL: 2 minutos)
// =====================================================================
const cache = {
    prs: { data: null, timestamp: 0, ttl: 120000 },
    branches: { data: null, timestamp: 0, ttl: 120000 },
    sync: { data: null, timestamp: 0, ttl: 120000 }
};

function getCachedData(key) {
    const cached = cache[key];
    if (cached.data && (Date.now() - cached.timestamp) < cached.ttl) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    cache[key].data = data;
    cache[key].timestamp = Date.now();
}

function clearCache() {
    Object.keys(cache).forEach(key => {
        cache[key].data = null;
        cache[key].timestamp = 0;
    });
}

// =====================================================================
// HELPER: Executar comando Git
// =====================================================================
function executeGitCommand(command) {
    try {
        return execSync(command, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'ignore'] // Suprimir stderr
        }).trim();
    } catch (error) {
        console.error(`[GITHUB] Erro ao executar comando: ${command}`, error.message);
        return '';
    }
}

// =====================================================================
// HELPER: Extrair informações do repositório
// =====================================================================
function getRepoInfo() {
    try {
        const remoteUrl = executeGitCommand('git remote get-url origin');
        // Extrair owner/repo de URLs como: https://github.com/owner/repo.git
        const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
        if (match) {
            const owner = match[1].replace(/^.*@/, ''); // Remove token se houver
            const repo = match[2].replace('.git', '');
            return {
                owner,
                repo,
                url: `https://github.com/${owner}/${repo}`
            };
        }
    } catch (error) {
        console.error('[GITHUB] Erro ao obter info do repositório:', error.message);
    }
    return null;
}

// =====================================================================
// HELPER: Fazer requisição à GitHub API
// =====================================================================
function makeGitHubRequest(endpoint, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: endpoint,
            method: 'GET',
            headers: {
                'User-Agent': 'Super-Cartola-Manager',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        // Adicionar token se disponível
        if (token) {
            options.headers['Authorization'] = `token ${token}`;
        }

        https.get(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`Erro ao parsear JSON: ${error.message}`));
                    }
                } else {
                    reject(new Error(`GitHub API retornou ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// =====================================================================
// GET /api/github/prs
// Lista Pull Requests do repositório
// Query params:
//   - state: all (default), open, closed
//   - limit: número máximo de resultados (default: 50)
//   - periodo: hoje, ontem, semana, mes ou YYYY-MM-DD
// =====================================================================
router.get('/prs', verificarAdmin, async (req, res) => {
    try {
        console.log('[GITHUB] Buscando Pull Requests...');

        // Verificar cache
        const cached = getCachedData('prs');
        if (cached) {
            console.log('[GITHUB] Retornando PRs do cache');
            return res.json(cached);
        }

        const repoInfo = getRepoInfo();
        if (!repoInfo) {
            return res.status(500).json({
                ok: false,
                error: 'Não foi possível identificar o repositório GitHub'
            });
        }

        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            return res.status(500).json({
                ok: false,
                error: 'GITHUB_TOKEN não configurado. Configure a variável de ambiente.',
                requiresToken: true
            });
        }

        const state = req.query.state || 'all';
        const limit = parseInt(req.query.limit) || 50;

        // Buscar PRs da API GitHub
        const endpoint = `/repos/${repoInfo.owner}/${repoInfo.repo}/pulls?state=${state}&per_page=${limit}`;
        const prs = await makeGitHubRequest(endpoint, githubToken);

        // Filtrar por período se especificado
        let prsFiltered = prs;
        if (req.query.periodo) {
            const periodo = req.query.periodo.toLowerCase();
            const now = new Date();
            let dataInicio;

            switch (periodo) {
                case 'hoje':
                    dataInicio = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'ontem':
                    dataInicio = new Date(now.setDate(now.getDate() - 1));
                    dataInicio.setHours(0, 0, 0, 0);
                    break;
                case 'semana':
                    dataInicio = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'mes':
                    dataInicio = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                default:
                    // Tentar parsear como data YYYY-MM-DD
                    dataInicio = new Date(periodo);
                    if (isNaN(dataInicio.getTime())) {
                        dataInicio = null;
                    }
            }

            if (dataInicio) {
                prsFiltered = prs.filter(pr => new Date(pr.created_at) >= dataInicio);
            }
        }

        // Formatar resposta
        const response = {
            ok: true,
            total: prsFiltered.length,
            repository: repoInfo,
            pulls: prsFiltered.map(pr => ({
                number: pr.number,
                title: pr.title,
                state: pr.state,
                merged: pr.merged_at !== null,
                draft: pr.draft,
                author: {
                    login: pr.user.login,
                    avatar: pr.user.avatar_url
                },
                branch: {
                    head: pr.head.ref,
                    base: pr.base.ref
                },
                url: pr.html_url,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                merged_at: pr.merged_at,
                closed_at: pr.closed_at,
                comments: pr.comments,
                commits: pr.commits,
                additions: pr.additions,
                deletions: pr.deletions,
                changed_files: pr.changed_files
            }))
        };

        // Cachear resposta
        setCachedData('prs', response);

        res.json(response);
    } catch (error) {
        console.error('[GITHUB] Erro ao buscar PRs:', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

// =====================================================================
// GET /api/github/branches
// Lista branches remotas e status de merge
// Query params:
//   - incluirMergeadas: true/false (default: false)
//   - limit: número máximo (default: 50)
// =====================================================================
router.get('/branches', verificarAdmin, async (req, res) => {
    try {
        console.log('[GITHUB] Listando branches...');

        // Verificar cache
        const cacheKey = `branches_${req.query.incluirMergeadas || 'false'}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
            console.log('[GITHUB] Retornando branches do cache');
            return res.json(cached);
        }

        const incluirMergeadas = req.query.incluirMergeadas === 'true';
        const limit = parseInt(req.query.limit) || 50;

        // Fetch para atualizar referências
        executeGitCommand('git fetch origin --quiet 2>/dev/null');

        // Listar branches remotas
        const branchesRaw = executeGitCommand('git branch -r --format="%(refname:short)|%(creatordate:iso)|%(authorname)"');

        if (!branchesRaw) {
            return res.json({
                ok: true,
                total: 0,
                branches: []
            });
        }

        const branches = branchesRaw.split('\n')
            .filter(line => line && !line.includes('HEAD'))
            .map(line => {
                const [refname, date, author] = line.split('|');
                const branchName = refname.replace('origin/', '');

                // Verificar se está mergeada
                let mergeada = false;
                try {
                    const result = executeGitCommand(`git branch -r --merged origin/main | grep "origin/${branchName}"`);
                    mergeada = !!result;
                } catch {
                    mergeada = false;
                }

                return {
                    nome: branchName,
                    fullName: refname,
                    dataCriacao: date || 'N/A',
                    autor: author || 'Desconhecido',
                    mergeada
                };
            })
            .filter(b => incluirMergeadas || !b.mergeada)
            .slice(0, limit);

        const response = {
            ok: true,
            total: branches.length,
            incluindoMergeadas: incluirMergeadas,
            branches
        };

        // Cachear resposta
        setCachedData(cacheKey, response);

        res.json(response);
    } catch (error) {
        console.error('[GITHUB] Erro ao listar branches:', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

// =====================================================================
// GET /api/github/sync-status
// Verifica sincronização local vs remoto
// =====================================================================
router.get('/sync-status', verificarAdmin, async (req, res) => {
    try {
        console.log('[GITHUB] Verificando sincronização...');

        // Verificar cache
        const cached = getCachedData('sync');
        if (cached) {
            console.log('[GITHUB] Retornando sync status do cache');
            return res.json(cached);
        }

        // Fetch para atualizar referências
        executeGitCommand('git fetch origin --quiet 2>/dev/null');

        // Obter branch atual
        const branchAtual = executeGitCommand('git rev-parse --abbrev-ref HEAD');

        // Verificar status da branch atual
        const localCommit = executeGitCommand(`git rev-parse ${branchAtual}`);
        const remoteCommit = executeGitCommand(`git rev-parse origin/${branchAtual} 2>/dev/null || echo ""`);

        let status = {
            branchAtual,
            sincronizado: false,
            commitsAtras: 0,
            commitsAFrente: 0,
            divergente: false
        };

        if (remoteCommit) {
            if (localCommit === remoteCommit) {
                status.sincronizado = true;
            } else {
                const behind = executeGitCommand(`git rev-list --count ${branchAtual}..origin/${branchAtual} 2>/dev/null || echo "0"`);
                const ahead = executeGitCommand(`git rev-list --count origin/${branchAtual}..${branchAtual} 2>/dev/null || echo "0"`);

                status.commitsAtras = parseInt(behind) || 0;
                status.commitsAFrente = parseInt(ahead) || 0;
                status.divergente = status.commitsAtras > 0 && status.commitsAFrente > 0;
            }
        } else {
            status.erro = 'Branch remota não encontrada';
        }

        // Verificar todas as branches locais
        const branchesLocais = executeGitCommand('git branch --format="%(refname:short)"')
            .split('\n')
            .filter(b => b);

        const todasBranches = [];
        for (const branch of branchesLocais) {
            try {
                const local = executeGitCommand(`git rev-parse ${branch}`);
                const remote = executeGitCommand(`git rev-parse origin/${branch} 2>/dev/null || echo ""`);

                if (!remote) continue;

                const sync = local === remote;
                let behind = 0, ahead = 0;

                if (!sync) {
                    behind = parseInt(executeGitCommand(`git rev-list --count ${branch}..origin/${branch} 2>/dev/null || echo "0"`)) || 0;
                    ahead = parseInt(executeGitCommand(`git rev-list --count origin/${branch}..${branch} 2>/dev/null || echo "0"`)) || 0;
                }

                todasBranches.push({
                    nome: branch,
                    sincronizada: sync,
                    commitsAtras: behind,
                    commitsAFrente: ahead
                });
            } catch {
                // Ignorar branches sem remote
            }
        }

        const response = {
            ok: true,
            branchAtual: status,
            todasBranches,
            resumo: {
                sincronizadas: todasBranches.filter(b => b.sincronizada).length,
                atrasadas: todasBranches.filter(b => b.commitsAtras > 0).length,
                aFrente: todasBranches.filter(b => b.commitsAFrente > 0).length
            }
        };

        // Cachear resposta
        setCachedData('sync', response);

        res.json(response);
    } catch (error) {
        console.error('[GITHUB] Erro ao verificar sincronização:', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

// =====================================================================
// POST /api/github/sync-trigger
// Executa sincronização manual (git pull)
// PROTEGIDO - Apenas admins
// =====================================================================
router.post('/sync-trigger', verificarAdmin, async (req, res) => {
    try {
        console.log('[GITHUB] Iniciando sincronização manual...');

        const branchAtual = executeGitCommand('git rev-parse --abbrev-ref HEAD');

        // Verificar se há mudanças locais não commitadas
        const status = executeGitCommand('git status --porcelain');
        if (status) {
            return res.status(400).json({
                ok: false,
                error: 'Há mudanças locais não commitadas. Commit ou stash antes de sincronizar.',
                uncommittedChanges: true
            });
        }

        // Executar git pull
        const result = executeGitCommand(`git pull origin ${branchAtual}`);

        // Limpar cache após sincronização
        clearCache();

        res.json({
            ok: true,
            message: 'Sincronização realizada com sucesso',
            branch: branchAtual,
            output: result
        });
    } catch (error) {
        console.error('[GITHUB] Erro ao sincronizar:', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

// =====================================================================
// GET /api/github/status
// Retorna status geral da integração GitHub
// =====================================================================
router.get('/status', verificarAdmin, async (req, res) => {
    try {
        const repoInfo = getRepoInfo();
        const githubToken = process.env.GITHUB_TOKEN;
        const branchAtual = executeGitCommand('git rev-parse --abbrev-ref HEAD');

        res.json({
            ok: true,
            configured: !!githubToken,
            repository: repoInfo,
            currentBranch: branchAtual,
            cacheStatus: {
                prs: cache.prs.data ? 'cached' : 'empty',
                branches: cache.branches.data ? 'cached' : 'empty',
                sync: cache.sync.data ? 'cached' : 'empty'
            }
        });
    } catch (error) {
        console.error('[GITHUB] Erro ao obter status:', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

export default router;

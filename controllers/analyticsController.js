/**
 * Analytics Controller
 * Análise de branches, merges e funcionalidades para o painel admin
 * 
 * Consulta GitHub API diretamente - sem dependência de git local
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================================
// Configuração GitHub
// =====================================================================
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_OWNER = process.env.GITHUB_OWNER || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';

// =====================================================================
// HELPER: Parse de data
// =====================================================================
function parseData(dataStr) {
  if (!dataStr) return null;
  const d = new Date(dataStr);
  return isNaN(d.getTime()) ? null : d;
}

function isBetweenDates(dataCommit, desde, ate) {
  if (!dataCommit) return true;
  const data = parseData(dataCommit);
  if (!data) return true;
  
  if (desde && data < desde) return false;
  if (ate && data > ate) return false;
  return true;
}

// =====================================================================
// HELPER: Fazer requisição HTTPS para GitHub API
// =====================================================================
function fazerRequisicaoGithub(endpoint, metodo = 'GET') {
  return new Promise((resolve, reject) => {
    const owner = GITHUB_OWNER;
    const repo = GITHUB_REPO;

    if (!owner || !repo) {
      return reject(new Error('GitHub config não configurado: GITHUB_OWNER e GITHUB_REPO requeridos'));
    }

    const caminho = `/repos/${owner}/${repo}${endpoint}`;
    const opcoes = {
      hostname: 'api.github.com',
      path: caminho,
      method: metodo,
      headers: {
        'User-Agent': 'Super-Cartola-Manager',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 30000
    };

    if (GITHUB_TOKEN) {
      opcoes.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    const req = https.request(opcoes, (res) => {
      let dados = '';

      res.on('data', (chunk) => {
        dados += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(dados));
          } catch {
            resolve(dados);
          }
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout na requisição GitHub API'));
    });

    req.end();
  });
}

// =====================================================================
// HELPER: Buscar branches do GitHub API (com análise enriquecida)
// =====================================================================
async function buscarDataCommit(sha) {
  try {
    const commit = await fazerRequisicaoGithub(`/commits/${sha}`);
    return commit?.commit?.author?.date || null;
  } catch {
    return null;
  }
}

async function buscarBranchesGitHub(desde = null, ate = null) {
  try {
    const desdeData = desde ? parseData(desde) : null;
    const ateData = ate ? parseData(ate) : null;

    const branchesRaw = [];
    let pagina = 1;
    let temMais = true;

    while (temMais && pagina <= 5) {
      const endpoint = `/branches?per_page=100&page=${pagina}`;
      const resposta = await fazerRequisicaoGithub(endpoint);

      if (!Array.isArray(resposta) || resposta.length === 0) {
        temMais = false;
        break;
      }

      for (const branch of resposta) {
        if (branch.name === 'main' || branch.name === 'master') continue;
        branchesRaw.push(branch);
      }

      pagina++;
    }

    // Buscar data real de cada commit via SHA (em paralelo, batches de 10)
    const branches = [];
    for (let i = 0; i < branchesRaw.length; i += 10) {
      const batch = branchesRaw.slice(i, i + 10);
      const resultados = await Promise.all(
        batch.map(async (branch) => {
          const sha = branch.commit?.sha;
          const dataCommit = sha ? await buscarDataCommit(sha) : null;
          const agora = new Date();

          let diasDesdeUltimoCommit = null;
          if (dataCommit) {
            const dataObj = new Date(dataCommit);
            if (!isNaN(dataObj.getTime())) {
              diasDesdeUltimoCommit = Math.floor((agora - dataObj) / (1000 * 60 * 60 * 24));
            }
          }

          if (!isBetweenDates(dataCommit, desdeData, ateData)) {
            return null;
          }

          return {
            nome: branch.name,
            dataCriacao: dataCommit ? dataCommit.split('T')[0] : null,
            protected: branch.protected,
            sha: sha || null,
            ultimoAutor: branch.commit?.commit?.author?.name || 'Desconhecido',
            diasDesdeUltimoCommit,

            // Flags baseadas em data confiável (null = sem dados, não assume velho)
            desatualizada: diasDesdeUltimoCommit != null && diasDesdeUltimoCommit > 30,
            orfa: false,
            passivDeletacao: diasDesdeUltimoCommit != null && diasDesdeUltimoCommit > 60
          };
        })
      );
      branches.push(...resultados.filter(Boolean));
    }

    return branches;
  } catch (erro) {
    console.error('[Analytics] Erro ao buscar branches do GitHub:', erro.message);
    return [];
  }
}

// =====================================================================
// HELPER: Buscar commits de uma branch via GitHub API
// =====================================================================
async function buscarCommitsGitHub(nomeBranch, desde = null, ate = null) {
  try {
    const desdeData = desde ? parseData(desde) : null;
    const ateData = ate ? parseData(ate) : null;

    const commits = [];
    let pagina = 1;
    let temMais = true;

    while (temMais && pagina <= 3) { // Limitar a 3 páginas = até 300 commits
      const endpoint = `/commits?sha=${nomeBranch}&per_page=100&page=${pagina}`;
      
      try {
        const resposta = await fazerRequisicaoGithub(endpoint);

        if (!Array.isArray(resposta) || resposta.length === 0) {
          temMais = false;
          break;
        }

        for (const commit of resposta) {
          const dataCommit = commit.commit?.author?.date || null;

          if (!isBetweenDates(dataCommit, desdeData, ateData)) {
            continue;
          }

          commits.push({
            hash: commit.sha.substring(0, 7),
            autor: commit.commit?.author?.name || 'Desconhecido',
            data: dataCommit ? dataCommit.split('T')[0] : null,
            mensagem: commit.commit?.message?.split('\n')[0] || ''
          });
        }

        pagina++;
      } catch (erroApi) {
        // Branch pode não existir na API, ignorar
        temMais = false;
      }
    }

    return commits;
  } catch (erro) {
    console.error(`[Analytics] Erro ao buscar commits de ${nomeBranch}:`, erro.message);
    return [];
  }
}

// =====================================================================
// HELPER: Buscar detalhe de uma PR (inclui commits, additions, etc.)
// =====================================================================
async function buscarPrDetalhe(numero) {
  try {
    const resposta = await fazerRequisicaoGithub(`/pulls/${numero}`);
    return resposta?.commits || 0;
  } catch {
    return 0;
  }
}

// =====================================================================
// HELPER: Buscar commits exclusivos da branch (ahead of main)
// =====================================================================
async function buscarCommitsAhead(nomeBranch) {
  try {
    const branchEncoded = encodeURIComponent(nomeBranch);
    const resposta = await fazerRequisicaoGithub(`/compare/main...${branchEncoded}`);

    const aheadBy = resposta?.ahead_by || 0;
    const commits = (resposta?.commits || []).map(c => ({
      hash: c.sha?.substring(0, 7),
      autor: c.commit?.author?.name || 'Desconhecido',
      data: c.commit?.author?.date ? c.commit.author.date.split('T')[0] : null,
      mensagem: c.commit?.message?.split('\n')[0] || ''
    }));

    return { total: aheadBy, commits };
  } catch {
    return { total: 0, commits: [] };
  }
}

// =====================================================================
// HELPER: Buscar Pull Requests (com análise de risco)
// =====================================================================
async function buscarPullRequestsGitHub(desde = null, ate = null) {
  try {
    const desdeData = desde ? parseData(desde) : null;
    const ateData = ate ? parseData(ate) : null;

    const prs = [];
    let pagina = 1;
    let temMais = true;

    while (temMais && pagina <= 5) {
      const endpoint = `/pulls?state=all&per_page=100&page=${pagina}&sort=updated&direction=desc`;
      const resposta = await fazerRequisicaoGithub(endpoint);

      if (!Array.isArray(resposta) || resposta.length === 0) {
        temMais = false;
        break;
      }

      for (const pr of resposta) {
        const dataMerge = pr.merged_at || pr.updated_at;

        if (!isBetweenDates(dataMerge, desdeData, ateData)) {
          continue;
        }

        // Calcular dias desde criação
        const criado = new Date(pr.created_at);
        const agora = new Date();
        const diasDesdeCreacao = Math.floor((agora - criado) / (1000 * 60 * 60 * 24));

        prs.push({
          numero: pr.number,
          titulo: pr.title,
          branch: pr.head?.ref || 'unknown',
          estado: pr.state, // open, closed
          mergeado: pr.merged_at !== null,
          dataMerge: pr.merged_at ? pr.merged_at.split('T')[0] : null,
          dataCriacao: pr.created_at?.split('T')[0] || null,
          dataAtualizacao: pr.updated_at?.split('T')[0] || null,
          autor: pr.user?.login || 'Desconhecido',
          url: pr.html_url,
          
          // Status estendido
          isDraft: pr.draft || false,
          statusRevisao: pr.state === 'open' ? 'Em Revisão' : pr.merged_at ? 'Mergeado' : 'Fechado',
          diasAberto: pr.state === 'open' ? diasDesdeCreacao : null,
          requestedReviewers: pr.requested_reviewers?.length || 0,
          comments: pr.comments || 0,
          commits: pr.commits || 0,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changedFiles: pr.changed_files || 0,
          
          // Flags de análise
          emRevisaoHaTempo: pr.state === 'open' && diasDesdeCreacao > 7, // > 7 dias aberto
          nuncaMergeado: pr.state === 'closed' && !pr.merged_at // Fechado sem merge
        });
      }

      pagina++;
    }

    return prs;
  } catch (erro) {
    console.error('[Analytics] Erro ao buscar PRs do GitHub:', erro.message);
    return [];
  }
}

// =====================================================================
// CONTROLLER: GET Analytics Resumido
// =====================================================================
export async function getAnalyticsResumo(req, res) {
  try {
    const { desde, ate, periodo } = req.query;

    let desdeData = desde;
    let ateData = ate;

    // Processar período (dia, semana, mês)
    if (periodo) {
      const hoje = new Date();
      const ultimoDia = new Date(hoje);
      ultimoDia.setDate(ultimoDia.getDate() + 1);

      switch (periodo.toLowerCase()) {
        case 'dia':
        case 'hoje':
          desdeData = hoje.toISOString().split('T')[0];
          ateData = ultimoDia.toISOString().split('T')[0];
          break;
        case 'semana':
          const seteDiasAtras = new Date(hoje);
          seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
          desdeData = seteDiasAtras.toISOString().split('T')[0];
          ateData = ultimoDia.toISOString().split('T')[0];
          break;
        case 'mes':
        case 'mês':
          const trintaDiasAtras = new Date(hoje);
          trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
          desdeData = trintaDiasAtras.toISOString().split('T')[0];
          ateData = ultimoDia.toISOString().split('T')[0];
          break;
      }
    }

    // Buscar branches e PRs em paralelo
    const [branches, prs] = await Promise.all([
      buscarBranchesGitHub(desdeData, ateData),
      buscarPullRequestsGitHub(desdeData, ateData)
    ]);

    // Enriquecer branches com info completa e marcar como órfãs
    const branchesDetalhadas = await Promise.all(
      branches.map(async (branch) => {
        const pr = prs.find(p => p.branch === branch.nome);
        const mergeada = pr?.mergeado || false;

        // Branch órfã = sem PR relacionada
        branch.orfa = !pr;

        // Commits: PR mergeada → buscar detalhe da PR | Ativa → compare com main
        let totalCommits = 0;
        let commitsRecentes = [];

        if (mergeada && pr) {
          totalCommits = await buscarPrDetalhe(pr.numero);
        } else {
          const ahead = await buscarCommitsAhead(branch.nome);
          totalCommits = ahead.total;
          commitsRecentes = ahead.commits.slice(0, 3);
        }

        return {
          ...branch,
          totalCommits,
          commits: commitsRecentes,
          mergeada,
          pr: pr ? { 
            numero: pr.numero, 
            url: pr.url,
            status: pr.statusRevisao,
            isDraft: pr.isDraft,
            emRevisaoHaTempo: pr.emRevisaoHaTempo,
            nuncaMergeado: pr.nuncaMergeado,
            diasAberto: pr.diasAberto
          } : null,
          feature: branch.nome.match(/feat-\d+/i)?.[0] || null,
          
          // Bandeiras de análise
          riscoDeletacao: branch.passivDeletacao ? '🚨 Passível de deleção' : null,
          statusAtualizacao: branch.desatualizada ? '⚠️ Desatualizada' : null,
          statusOrfa: branch.orfa ? '🔴 Órfã (sem PR)' : null
        };
      })
    );

    // Estatísticas enriquecidas
    const stats = {
      totalBranches: branchesDetalhadas.length,
      branchesAcativas: branchesDetalhadas.filter(b => !b.mergeada).length,
      branchesMergeadas: branchesDetalhadas.filter(b => b.mergeada).length,
      branchesDesatualizadas: branchesDetalhadas.filter(b => b.desatualizada).length,
      branchesOrfas: branchesDetalhadas.filter(b => b.orfa).length,
      branchesPassivDeletacao: branchesDetalhadas.filter(b => b.passivDeletacao).length,
      totalCommits: branchesDetalhadas.reduce((sum, b) => sum + b.totalCommits, 0),
      prsEmRevisao: prs.filter(p => p.estado === 'open').length,
      prsDraft: prs.filter(p => p.isDraft).length,
      prsEmRevisaoHaTempo: prs.filter(p => p.emRevisaoHaTempo).length,
      periodo: periodo || 'tudo',
      desde: desdeData,
      ate: ateData,
      dataGeracao: new Date().toISOString()
    };

    const repoUrl = (GITHUB_OWNER && GITHUB_REPO)
      ? `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`
      : null;

    res.json({
      success: true,
      stats,
      repoUrl,
      branches: branchesDetalhadas
    });
  } catch (erro) {
    console.error('[Analytics] Erro em getAnalyticsResumo:', erro.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar analytics',
      message: erro.message
    });
  }
}

// =====================================================================
// CONTROLLER: GET Detalhes de Branch
// =====================================================================
export async function getAnatyticsBranchDetalhes(req, res) {
  try {
    const { nomeBranch } = req.params;
    const { desde, ate } = req.query;

    if (!nomeBranch) {
      return res.status(400).json({
        success: false,
        error: 'Nome da branch não fornecido'
      });
    }

    const commits = await buscarCommitsGitHub(nomeBranch, desde, ate);
    const prs = await buscarPullRequestsGitHub(desde, ate);
    const pr = prs.find(p => p.branch === nomeBranch);

    res.json({
      success: true,
      branch: {
        nome: nomeBranch,
        mergeada: pr?.mergeado || false,
        totalCommits: commits.length,
        commits,
        pr: pr ? {
          numero: pr.numero,
          titulo: pr.titulo,
          estado: pr.estado,
          url: pr.url
        } : null
      }
    });
  } catch (erro) {
    console.error('[Analytics] Erro em getAnatyticsBranchDetalhes:', erro.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar detalhes',
      message: erro.message
    });
  }
}

// =====================================================================
// CONTROLLER: GET Merges via Pull Requests
// =====================================================================
export async function getAnalyticsMerges(req, res) {
  try {
    const { desde, ate, periodo } = req.query;

    let desdeData = desde;
    let ateData = ate;

    // Processar período
    if (periodo) {
      const hoje = new Date();
      const ultimoDia = new Date(hoje);
      ultimoDia.setDate(ultimoDia.getDate() + 1);

      switch (periodo.toLowerCase()) {
        case 'dia':
          desdeData = hoje.toISOString().split('T')[0];
          ateData = ultimoDia.toISOString().split('T')[0];
          break;
        case 'semana':
          const seteDias = new Date(hoje);
          seteDias.setDate(seteDias.getDate() - 7);
          desdeData = seteDias.toISOString().split('T')[0];
          ateData = ultimoDia.toISOString().split('T')[0];
          break;
        case 'mes':
          const trintaDias = new Date(hoje);
          trintaDias.setDate(trintaDias.getDate() - 30);
          desdeData = trintaDias.toISOString().split('T')[0];
          ateData = ultimoDia.toISOString().split('T')[0];
          break;
      }
    }

    // Buscar PRs mergeados
    const prs = await buscarPullRequestsGitHub(desdeData, ateData);
    const merges = prs
      .filter(pr => pr.mergeado && pr.dataMerge)
      .map(pr => ({
        branch: pr.branch,
        data: pr.dataMerge,
        autor: pr.autor,
        prNumero: pr.numero,
        titulo: pr.titulo,
        url: pr.url
      }))
      .sort((a, b) => new Date(b.data) - new Date(a.data));

    res.json({
      success: true,
      totalMerges: merges.length,
      merges,
      periodo: periodo || 'tudo',
      desde: desdeData,
      ate: ateData
    });
  } catch (erro) {
    console.error('[Analytics] Erro em getAnalyticsMerges:', erro.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar merges',
      message: erro.message
    });
  }
}

// =====================================================================
// CONTROLLER: GET Funcionalidades (via BACKLOG.md)
// =====================================================================
export async function getAnalyticsFuncionalidades(req, res) {
  try {
    const backlogPath = path.join(__dirname, '..', 'BACKLOG.md');

    if (!fs.existsSync(backlogPath)) {
      return res.json({
        success: true,
        funcionalidades: [],
        message: 'BACKLOG.md não encontrado'
      });
    }

    const conteudo = fs.readFileSync(backlogPath, 'utf-8');
    
    const funcionalidades = [];
    const linhas = conteudo.split('\n');

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      
      // Procura por padrões como "## FEAT-001"
      const match = linha.match(/^#+\s+(FEAT|feat)-(\d+)\s*(.+)?/);
      if (match) {
        const id = match[2];
        const titulo = match[3] || `Feature ${id}`;
        const status = linha.includes('[x]') ? 'Completo' : 'Pendente';

        funcionalidades.push({
          id: `FEAT-${id}`,
          titulo: titulo.trim(),
          status,
          branch: `feat-${id}`
        });
      }
    }

    res.json({
      success: true,
      totalFuncionalidades: funcionalidades.length,
      funcionalidades
    });
  } catch (erro) {
    console.error('[Analytics] Erro em getAnalyticsFuncionalidades:', erro.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar funcionalidades',
      message: erro.message
    });
  }
}

// =====================================================================
// CONTROLLER: GET Estatísticas Gerais
// =====================================================================
export async function getAnalyticsEstatisticas(req, res) {
  try {
    const { periodo } = req.query;

    let desde = null;
    let ate = null;

    if (periodo) {
      const hoje = new Date();
      const ultimoDia = new Date(hoje);
      ultimoDia.setDate(ultimoDia.getDate() + 1);

      switch (periodo.toLowerCase()) {
        case 'dia':
          desde = hoje.toISOString().split('T')[0];
          ate = ultimoDia.toISOString().split('T')[0];
          break;
        case 'semana':
          const seteDias = new Date(hoje);
          seteDias.setDate(seteDias.getDate() - 7);
          desde = seteDias.toISOString().split('T')[0];
          ate = ultimoDia.toISOString().split('T')[0];
          break;
        case 'mes':
          const trintaDias = new Date(hoje);
          trintaDias.setDate(trintaDias.getDate() - 30);
          desde = trintaDias.toISOString().split('T')[0];
          ate = ultimoDia.toISOString().split('T')[0];
          break;
      }
    }

    // Buscar branches, commits e PRs em paralelo
    const [branches, prs] = await Promise.all([
      buscarBranchesGitHub(desde, ate),
      buscarPullRequestsGitHub(desde, ate)
    ]);

    // Enriquecer com estatísticas
    const branchesComInfo = await Promise.all(
      branches.map(async (b) => {
        const commits = await buscarCommitsGitHub(b.nome, desde, ate);
        const pr = prs.find(p => p.branch === b.nome);
        return {
          nome: b.nome,
          commits: commits.length,
          merged: pr?.mergeado || false
        };
      })
    );

    // Buscar autores top
    const autoresMap = {};
    for (const branch of branchesComInfo) {
      const commits = await buscarCommitsGitHub(branch.nome);
      commits.forEach(commit => {
        if (!autoresMap[commit.autor]) {
          autoresMap[commit.autor] = 0;
        }
        autoresMap[commit.autor]++;
      });
    }

    const autoresTopo = Object.entries(autoresMap)
      .map(([nome, commits]) => ({ nome, commits }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 5);

    // Compilar estatísticas
    const stats = {
      periodo: periodo || 'tudo',
      desde,
      ate,
      criacaoBranches: branchesComInfo.length,
      churnTotal: branchesComInfo.reduce((sum, b) => sum + b.commits, 0),
      taxaMerge: branchesComInfo.length === 0 ? 0 : 
        (branchesComInfo.filter(b => b.merged).length / branchesComInfo.length * 100).toFixed(2),
      branchesAtivas: branchesComInfo.filter(b => !b.merged).length,
      branchesMergeadas: branchesComInfo.filter(b => b.merged).length,
      autoresTopo,
      dataGerada: new Date().toISOString()
    };

    res.json({
      success: true,
      stats
    });
  } catch (erro) {
    console.error('[Analytics] Erro em getAnalyticsEstatisticas:', erro.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas',
      message: erro.message
    });
  }
}

// =====================================================================
// SYNC FUNCTIONS (Git Local Integration)
// =====================================================================

import { execSync } from 'child_process';

// Cache simples (TTL: 2 minutos)
const syncCache = {
  status: { data: null, timestamp: 0, ttl: 120000 }
};

function getSyncCachedData() {
  const cached = syncCache.status;
  if (cached.data && (Date.now() - cached.timestamp) < cached.ttl) {
    return cached.data;
  }
  return null;
}

function setSyncCachedData(data) {
  syncCache.status.data = data;
  syncCache.status.timestamp = Date.now();
}

function executeGitCommand(command) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
  } catch (error) {
    console.error(`[Analytics] Erro ao executar comando: ${command}`, error.message);
    return '';
  }
}

/**
 * GET /api/admin/analytics/sync-status
 * Retorna status de sincronização local vs remoto
 */
export async function getGitSyncStatus(req, res) {
  try {
    // Verificar cache
    const cached = getSyncCachedData();
    if (cached) {
      return res.json(cached);
    }

    // Fetch origin
    executeGitCommand('git fetch origin --quiet 2>/dev/null');

    // Branch atual
    const currentBranch = executeGitCommand('git rev-parse --abbrev-ref HEAD');

    // Commits behind/ahead
    const behindCmd = `git rev-list --count HEAD..origin/${currentBranch}`;
    const aheadCmd = `git rev-list --count origin/${currentBranch}..HEAD`;

    const behind = parseInt(executeGitCommand(behindCmd)) || 0;
    const ahead = parseInt(executeGitCommand(aheadCmd)) || 0;

    const status = {
      currentBranch,
      behind,
      ahead,
      synced: behind === 0 && ahead === 0,
      message: behind === 0 && ahead === 0 ? 'Sincronizado' :
               behind > 0 && ahead === 0 ? `${behind} commits atrás` :
               behind === 0 && ahead > 0 ? `${ahead} commits à frente` :
               `${behind} atrás, ${ahead} à frente`
    };

    setSyncCachedData(status);
    res.json(status);

  } catch (erro) {
    console.error('[Analytics] Erro em getGitSyncStatus:', erro.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status de sincronização',
      message: erro.message
    });
  }
}

/**
 * POST /api/admin/analytics/sync-trigger
 * Executa git pull para sincronizar
 */
export async function postGitSyncTrigger(req, res) {
  try {
    // Limpar cache
    syncCache.status.data = null;

    const currentBranch = executeGitCommand('git rev-parse --abbrev-ref HEAD');

    // Executar git pull
    const output = executeGitCommand(`git pull origin ${currentBranch}`);

    res.json({
      success: true,
      message: 'Sincronização concluída',
      branch: currentBranch,
      output: output.substring(0, 500) // Limitar tamanho
    });

  } catch (erro) {
    console.error('[Analytics] Erro em postGitSyncTrigger:', erro.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao sincronizar',
      message: erro.message
    });
  }
}

export default {
  getAnalyticsResumo,
  getAnatyticsBranchDetalhes,
  getAnalyticsMerges,
  getAnalyticsFuncionalidades,
  getAnalyticsEstatisticas,
  getGitSyncStatus,
  postGitSyncTrigger
};

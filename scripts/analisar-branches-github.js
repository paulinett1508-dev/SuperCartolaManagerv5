#!/usr/bin/env node
/**
 * SKILL: Análise de Branches do GitHub (v2.0 - PR Integration)
 * 
 * Funcionalidades:
 * 1. Lista branches remotas do repositório GitHub
 * 2. Integração com GitHub API para buscar Pull Requests
 * 3. Cruza com BACKLOG.md para identificar status (implementado, pendente, abortado)
 * 4. Analisa commits de cada branch (data, autor, mensagem)
 * 5. Permite filtro por intervalo de datas
 * 6. Identifica branches já mergeadas vs. ativas
 * 7. Mostra status de PR (aberto, mergeado, fechado) e número
 * 8. Verifica sincronização Replit ↔ GitHub
 * 
 * Workflow Claude Code Web → GitHub → Replit:
 *   Claude Code Web cria PRs → GitHub armazena → Replit precisa sincronizar
 * 
 * Uso:
 *   node scripts/analisar-branches-github.js                              # Todas as branches
 *   node scripts/analisar-branches-github.js --desde 2026-01-01           # A partir de uma data
 *   node scripts/analisar-branches-github.js --desde 2026-01-01 --ate 2026-01-31  # Intervalo
 *   node scripts/analisar-branches-github.js --status pendente            # Filtro por status
 *   node scripts/analisar-branches-github.js --detalhes                   # Com commits
 *   node scripts/analisar-branches-github.js --prs                        # Incluir info de PRs
 *   node scripts/analisar-branches-github.js --sync-check                 # Verificar sincronização
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para output no terminal
const cores = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  vermelho: '\x1b[31m',
  verde: '\x1b[32m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
  magenta: '\x1b[35m',
  ciano: '\x1b[36m',
  cinza: '\x1b[90m'
};

// Status possíveis
const STATUS = {
  OPERANTE: '✅ 100% OPERANTE',
  IMPLEMENTADO: '🟢 IMPLEMENTADO',
  EM_DESENVOLVIMENTO: '🔵 EM DESENVOLVIMENTO',
  PENDENTE: '🟡 PENDENTE',
  ABORTADO: '🔴 ABORTADO',
  NAO_IDENTIFICADO: '⚪ NÃO IDENTIFICADO'
};

class AnalisadorBranches {
  constructor() {
    this.backlogPath = path.join(__dirname, '..', 'BACKLOG.md');
    this.backlogConteudo = '';
    this.branches = [];
    this.pullRequests = [];
    this.githubToken = process.env.GITHUB_TOKEN;
    this.repoInfo = this.extrairInfoRepo();
    this.opcoes = this.parseArgumentos();
  }

  extrairInfoRepo() {
    try {
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      // Extrair owner/repo de URLs como: https://github.com/owner/repo.git
      const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
      if (match) {
        return {
          owner: match[1].replace(/^.*@/, ''), // Remove token se houver
          repo: match[2].replace('.git', ''),
          url: `https://github.com/${match[1].replace(/^.*@/, '')}/${match[2].replace('.git', '')}`
        };
      }
    } catch (erro) {
      console.error(`${cores.vermelho}Erro ao obter info do repositório: ${erro.message}${cores.reset}`);
    }
    return null;
  }

  parseArgumentos() {
    const args = process.argv.slice(2);
    const opcoes = {
      desde: null,
      ate: null,
      status: null,
      detalhes: false,
      prs: false,
      syncCheck: false,
      autoSync: false,
      ajuda: false
    };

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--desde':
          opcoes.desde = args[++i];
          break;
        case '--ate':
          opcoes.ate = args[++i];
          break;
        case '--status':
          opcoes.status = args[++i];
          break;
        case '--detalhes':
          opcoes.detalhes = true;
          break;
        case '--prs':
          opcoes.prs = true;
          break;
        case '--sync-check':
          opcoes.syncCheck = true;
          break;
        case '--auto-sync':
          opcoes.autoSync = true;
          opcoes.syncCheck = true;
          break;
        case '--ajuda':
        case '--help':
        case '-h':
          opcoes.ajuda = true;
          break;
      }
    }

    return opcoes;
  }

  mostrarAjuda() {
    console.log(`
${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}
${cores.bright}  SKILL: Análise de Branches do GitHub (v2.0)  ${cores.reset}
${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}

${cores.bright}Uso:${cores.reset}
  node scripts/analisar-branches-github.js [opções]

${cores.bright}Opções:${cores.reset}
  ${cores.verde}--desde <data>${cores.reset}      Filtrar branches com commits desde esta data (YYYY-MM-DD)
  ${cores.verde}--ate <data>${cores.reset}        Filtrar branches com commits até esta data (YYYY-MM-DD)
  ${cores.verde}--status <tipo>${cores.reset}     Filtrar por status (operante, implementado, pendente, abortado)
  ${cores.verde}--detalhes${cores.reset}          Mostrar commits de cada branch
  ${cores.verde}--prs${cores.reset}               Buscar info de Pull Requests do GitHub
  ${cores.verde}--sync-check${cores.reset}        Verificar sincronização Replit ↔ GitHub
  ${cores.verde}--auto-sync${cores.reset}         Sincronizar automaticamente branches atrasadas
  ${cores.verde}--ajuda${cores.reset}             Mostrar esta mensagem

${cores.bright}Exemplos:${cores.reset}
  ${cores.cinza}# Todas as branches${cores.reset}
  node scripts/analisar-branches-github.js

  ${cores.cinza}# Com informações de Pull Requests${cores.reset}
  node scripts/analisar-branches-github.js --prs

  ${cores.cinza}# Verificar sincronização local vs remoto${cores.reset}
  node scripts/analisar-branches-github.js --sync-check

  ${cores.cinza}# Sincronizar automaticamente branches atrasadas${cores.reset}
  node scripts/analisar-branches-github.js --auto-sync

  ${cores.cinza}# Branches criadas em janeiro de 2026${cores.reset}
  node scripts/analisar-branches-github.js --desde 2026-01-01 --ate 2026-01-31

  ${cores.cinza}# Branches pendentes com detalhes${cores.reset}
  node scripts/analisar-branches-github.js --status pendente --detalhes

  ${cores.cinza}# Branches da última semana${cores.reset}
  node scripts/analisar-branches-github.js --desde $(date -d '7 days ago' +%Y-%m-%d)
`);
  }

  executarComando(comando) {
    try {
      return execSync(comando, { 
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024 // 10MB
      }).trim();
    } catch (erro) {
      console.error(`${cores.vermelho}Erro ao executar comando: ${comando}${cores.reset}`);
      console.error(erro.message);
      return '';
    }
  }

  carregarBacklog() {
    try {
      if (fs.existsSync(this.backlogPath)) {
        this.backlogConteudo = fs.readFileSync(this.backlogPath, 'utf-8');
        console.log(`${cores.verde}✓ BACKLOG.md carregado${cores.reset}\n`);
      } else {
        console.log(`${cores.amarelo}⚠ BACKLOG.md não encontrado${cores.reset}\n`);
      }
    } catch (erro) {
      console.error(`${cores.vermelho}Erro ao carregar BACKLOG.md: ${erro.message}${cores.reset}\n`);
    }
  }

  async buscarPullRequestsGitHub() {
    if (!this.githubToken || !this.repoInfo) {
      console.log(`${cores.amarelo}⚠ GITHUB_TOKEN não configurado ou repo não identificado${cores.reset}`);
      console.log(`${cores.cinza}  Continuando sem informações de PRs...${cores.reset}\n`);
      return [];
    }

    console.log(`${cores.azul}🔍 Buscando Pull Requests do GitHub...${cores.reset}`);
    
    try {
      const prs = await this.fazerRequisicaoGitHub(
        `/repos/${this.repoInfo.owner}/${this.repoInfo.repo}/pulls?state=all&per_page=100`
      );
      
      console.log(`${cores.verde}✓ ${prs.length} Pull Requests encontrados${cores.reset}\n`);
      return prs;
    } catch (erro) {
      console.error(`${cores.vermelho}Erro ao buscar PRs: ${erro.message}${cores.reset}\n`);
      return [];
    }
  }

  fazerRequisicaoGitHub(endpoint) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: endpoint,
        method: 'GET',
        headers: {
          'User-Agent': 'Super-Cartola-Manager',
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`GitHub API retornou ${res.statusCode}: ${data}`));
          }
        });
      }).on('error', (erro) => {
        reject(erro);
      });
    });
  }

  vincularPRComBranch(nomeBranch) {
    const pr = this.pullRequests.find(pr => pr.head.ref === nomeBranch);
    
    if (!pr) return null;

    return {
      numero: pr.number,
      titulo: pr.title,
      estado: pr.state, // open, closed
      mergeado: pr.merged_at !== null,
      url: pr.html_url,
      autor: pr.user.login,
      criado: new Date(pr.created_at).toISOString().split('T')[0],
      atualizado: new Date(pr.updated_at).toISOString().split('T')[0],
      mergeadoEm: pr.merged_at ? new Date(pr.merged_at).toISOString().split('T')[0] : null,
      aprovacoes: pr.requested_reviewers ? pr.requested_reviewers.length : 0,
      comentarios: pr.comments || 0
    };
  }

  verificarSincronizacao() {
    console.log(`${cores.azul}🔄 Verificando sincronização Replit ↔ GitHub...${cores.reset}\n`);

    const resultados = {
      atualizado: [],
      atrasado: [],
      aFrente: [],
      divergente: []
    };

    try {
      // Fetch para atualizar referências
      execSync('git fetch origin --quiet 2>/dev/null', { stdio: 'ignore' });

      // Obter branch atual
      const branchAtual = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      
      // Verificar cada branch local vs remota
      const branchesLocais = execSync('git branch', { encoding: 'utf-8' })
        .split('\n')
        .map(b => b.replace('*', '').trim())
        .filter(b => b && !b.startsWith('+') && !b.startsWith('-')); // Ignorar markers do git

      for (const branch of branchesLocais) {
        try {
          const localCommit = execSync(`git rev-parse ${branch}`, { encoding: 'utf-8' }).trim();
          const remoteCommit = execSync(`git rev-parse origin/${branch} 2>/dev/null || echo ""`, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
          }).trim();

          if (!remoteCommit) continue;

          if (localCommit === remoteCommit) {
            resultados.atualizado.push(branch);
          } else {
            // Verificar se está atrasado ou à frente
            const behind = execSync(
              `git rev-list --count ${branch}..origin/${branch} 2>/dev/null || echo "0"`,
              { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
            ).trim();
            
            const ahead = execSync(
              `git rev-list --count origin/${branch}..${branch} 2>/dev/null || echo "0"`,
              { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
            ).trim();

            const commitsAtras = parseInt(behind) || 0;
            const commitsAFrente = parseInt(ahead) || 0;

            if (commitsAtras > 0 && commitsAFrente > 0) {
              resultados.divergente.push({ branch, atras: commitsAtras, aFrente: commitsAFrente });
            } else if (commitsAtras > 0) {
              resultados.atrasado.push({ branch, commits: commitsAtras });
            } else if (commitsAFrente > 0) {
              resultados.aFrente.push({ branch, commits: commitsAFrente });
            }
          }
        } catch {
          // Ignorar branches sem remote
        }
      }

      this.exibirRelatorioSincronizacao(resultados, branchAtual);
      
    } catch (erro) {
      console.error(`${cores.vermelho}Erro ao verificar sincronização: ${erro.message}${cores.reset}\n`);
    }
  }

  exibirRelatorioSincronizacao(resultados, branchAtual) {
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}`);
    console.log(`${cores.bright}  RELATÓRIO DE SINCRONIZAÇÃO  ${cores.reset}`);
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}\n`);

    console.log(`${cores.ciano}Branch atual:${cores.reset} ${branchAtual}\n`);

    if (resultados.atualizado.length > 0) {
      console.log(`${cores.verde}✓ Sincronizado (${resultados.atualizado.length}):${cores.reset}`);
      resultados.atualizado.forEach(b => {
        const marker = b === branchAtual ? ' ← ATUAL' : '';
        console.log(`  ${cores.verde}✓${cores.reset} ${b}${marker}`);
      });
      console.log('');
    }

    if (resultados.atrasado.length > 0) {
      console.log(`${cores.amarelo}⚠ ATRASADO - Precisa fazer PULL (${resultados.atrasado.length}):${cores.reset}`);
      resultados.atrasado.forEach(({ branch, commits }) => {
        const marker = branch === branchAtual ? ' ← ATUAL ⚠️' : '';
        console.log(`  ${cores.amarelo}⬇${cores.reset} ${branch} (${commits} commits atrás)${marker}`);
      });
      console.log(`  ${cores.cinza}Comando: git pull origin <branch>${cores.reset}\n`);
    }

    if (resultados.aFrente.length > 0) {
      console.log(`${cores.azul}⬆ À FRENTE - Precisa fazer PUSH (${resultados.aFrente.length}):${cores.reset}`);
      resultados.aFrente.forEach(({ branch, commits }) => {
        const marker = branch === branchAtual ? ' ← ATUAL' : '';
        console.log(`  ${cores.azul}⬆${cores.reset} ${branch} (+${commits} commits)${marker}`);
      });
      console.log(`  ${cores.cinza}Comando: git push origin <branch>${cores.reset}\n`);
    }

    if (resultados.divergente.length > 0) {
      console.log(`${cores.vermelho}⚠️ DIVERGENTE - Conflito potencial (${resultados.divergente.length}):${cores.reset}`);
      resultados.divergente.forEach(({ branch, atras, aFrente }) => {
        const marker = branch === branchAtual ? ' ← ATUAL ⚠️⚠️' : '';
        console.log(`  ${cores.vermelho}⚠${cores.reset} ${branch} (${atras} atrás, ${aFrente} à frente)${marker}`);
      });
      console.log(`  ${cores.cinza}Comando: git pull --rebase origin <branch>${cores.reset}\n`);
    }

    // Alertas importantes
    if (resultados.atrasado.some(r => r.branch === branchAtual)) {
      console.log(`${cores.vermelho}${cores.bright}❌ ALERTA CRÍTICO:${cores.reset} Branch atual está ATRASADA!`);
      console.log(`${cores.amarelo}   Faça: git pull origin ${branchAtual}${cores.reset}\n`);
    }

    if (resultados.divergente.some(r => r.branch === branchAtual)) {
      console.log(`${cores.vermelho}${cores.bright}❌ ALERTA CRÍTICO:${cores.reset} Branch atual está DIVERGENTE!`);
      console.log(`${cores.amarelo}   Faça: git pull --rebase origin ${branchAtual}${cores.reset}\n`);
    }

    // Auto-sync se solicitado
    if (this.opcoes.autoSync) {
      this.executarAutoSync(resultados, branchAtual);
    }
  }

  executarAutoSync(resultados, branchAtual) {
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}`);
    console.log(`${cores.bright}  AUTO-SYNC ATIVADO  ${cores.reset}`);
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}\n`);

    let acoesSucesso = 0;
    let acoesErro = 0;

    // Sincronizar branch atual se estiver atrasada
    if (resultados.atrasado.some(r => r.branch === branchAtual)) {
      console.log(`${cores.amarelo}⚡ Sincronizando branch atual (${branchAtual})...${cores.reset}`);
      
      try {
        // Salvar trabalho não commitado
        const statusOutput = execSync('git status --porcelain', { encoding: 'utf-8' });
        const temMudancas = statusOutput.trim().length > 0;
        
        if (temMudancas) {
          console.log(`${cores.ciano}  → Salvando mudanças locais (stash)...${cores.reset}`);
          execSync('git stash push -m "Auto-sync backup"', { encoding: 'utf-8' });
        }

        // Pull
        console.log(`${cores.ciano}  → Fazendo pull do GitHub...${cores.reset}`);
        const pullOutput = execSync(`git pull origin ${branchAtual}`, { encoding: 'utf-8' });
        console.log(`${cores.verde}  ✓ Pull concluído!${cores.reset}`);

        // Restaurar mudanças se houver
        if (temMudancas) {
          console.log(`${cores.ciano}  → Restaurando mudanças locais...${cores.reset}`);
          try {
            execSync('git stash pop', { encoding: 'utf-8' });
            console.log(`${cores.verde}  ✓ Mudanças restauradas!${cores.reset}`);
          } catch (stashError) {
            console.log(`${cores.amarelo}  ⚠ Conflito ao restaurar mudanças. Use: git stash pop${cores.reset}`);
          }
        }

        acoesSucesso++;
        console.log(`${cores.verde}✅ Branch ${branchAtual} sincronizada com sucesso!\n${cores.reset}`);
      } catch (erro) {
        acoesErro++;
        console.error(`${cores.vermelho}❌ Erro ao sincronizar ${branchAtual}: ${erro.message}${cores.reset}\n`);
      }
    }

    // Sincronizar outras branches atrasadas (se não for a atual)
    const outrasAtrasadas = resultados.atrasado.filter(r => r.branch !== branchAtual);
    
    if (outrasAtrasadas.length > 0) {
      console.log(`${cores.amarelo}⚡ Sincronizando ${outrasAtrasadas.length} outras branches atrasadas...${cores.reset}\n`);
      
      for (const { branch, commits } of outrasAtrasadas) {
        try {
          console.log(`${cores.ciano}  → ${branch} (${commits} commits atrás)...${cores.reset}`);
          
          // Mudar para a branch
          execSync(`git checkout ${branch} 2>/dev/null`, { stdio: 'ignore' });
          
          // Pull
          execSync(`git pull origin ${branch} 2>/dev/null`, { stdio: 'ignore' });
          
          console.log(`${cores.verde}    ✓ Sincronizada!${cores.reset}`);
          acoesSucesso++;
        } catch (erro) {
          console.error(`${cores.vermelho}    ✗ Erro${cores.reset}`);
          acoesErro++;
        }
      }

      // Voltar para a branch original
      try {
        execSync(`git checkout ${branchAtual} 2>/dev/null`, { stdio: 'ignore' });
      } catch {}
      
      console.log('');
    }

    // Fazer push de branches à frente (apenas se não for a atual)
    const outrasAFrente = resultados.aFrente.filter(r => r.branch !== branchAtual);
    
    if (outrasAFrente.length > 0) {
      console.log(`${cores.azul}⚡ Fazendo push de ${outrasAFrente.length} branches à frente...${cores.reset}\n`);
      
      for (const { branch, commits } of outrasAFrente) {
        try {
          console.log(`${cores.ciano}  → ${branch} (+${commits} commits)...${cores.reset}`);
          execSync(`git push origin ${branch} 2>/dev/null`, { stdio: 'ignore' });
          console.log(`${cores.verde}    ✓ Push concluído!${cores.reset}`);
          acoesSucesso++;
        } catch (erro) {
          console.error(`${cores.vermelho}    ✗ Erro ao fazer push${cores.reset}`);
          acoesErro++;
        }
      }
      console.log('');
    }

    // Alertas sobre branches divergentes
    if (resultados.divergente.length > 0) {
      console.log(`${cores.vermelho}⚠️ BRANCHES DIVERGENTES (não sincronizadas automaticamente):${cores.reset}`);
      resultados.divergente.forEach(({ branch }) => {
        console.log(`${cores.amarelo}  • ${branch} - Requer intervenção manual${cores.reset}`);
      });
      console.log(`${cores.cinza}  Comandos: git checkout <branch> && git pull --rebase origin <branch>${cores.reset}\n`);
    }

    // Resumo
    console.log(`${cores.bright}Resumo do Auto-Sync:${cores.reset}`);
    console.log(`${cores.verde}  ✓ Sucesso: ${acoesSucesso} operações${cores.reset}`);
    if (acoesErro > 0) {
      console.log(`${cores.vermelho}  ✗ Erros: ${acoesErro} operações${cores.reset}`);
    }
    console.log('');
  }

  listarBranchesRemotas() {
    console.log(`${cores.azul}🔍 Buscando branches remotas...${cores.reset}`);
    
    // Atualizar referências remotas
    this.executarComando('git fetch --all --prune');
    
    // Listar todas as branches remotas
    const output = this.executarComando('git branch -r --format="%(refname:short)|%(creatordate:iso8601)|%(authorname)"');
    
    const linhas = output.split('\n').filter(linha => linha.trim());
    const branches = [];

    for (const linha of linhas) {
      const [nomeCompleto, data, autor] = linha.split('|');
      
      // Ignorar HEAD simbólico e branches principais
      if (nomeCompleto.includes('HEAD') || 
          nomeCompleto === 'origin/main' || 
          nomeCompleto === 'origin/develop' ||
          nomeCompleto === 'origin' ||
          nomeCompleto === 'main') {
        continue;
      }
      
      const nome = nomeCompleto.replace('origin/', '');
      const dataCriacao = new Date(data);
      
      branches.push({
        nome,
        nomeCompleto,
        dataCriacao,
        dataFormatada: this.formatarData(dataCriacao),
        autor: autor || 'Desconhecido'
      });
    }

    console.log(`${cores.verde}✓ ${branches.length} branches encontradas${cores.reset}\n`);
    return branches;
  }

  formatarData(data) {
    return data.toISOString().split('T')[0];
  }

  aplicarFiltroData(branches) {
    if (!this.opcoes.desde && !this.opcoes.ate) {
      return branches;
    }

    const desde = this.opcoes.desde ? new Date(this.opcoes.desde) : new Date('2000-01-01');
    const ate = this.opcoes.ate ? new Date(this.opcoes.ate) : new Date('2100-01-01');
    
    // Adicionar 23:59:59 à data 'ate' para incluir todo o dia
    ate.setHours(23, 59, 59, 999);

    return branches.filter(branch => {
      return branch.dataCriacao >= desde && branch.dataCriacao <= ate;
    });
  }

  analisarStatusBranch(nomeBranch) {
    const nomeSimplificado = nomeBranch.toLowerCase();
    
    // Verificar se a branch foi mergeada
    const branchMergeada = this.verificarBranchMergeada(nomeBranch);
    
    // Extrair palavras-chave do nome da branch
    const palavrasChave = this.extrairPalavrasChave(nomeBranch);
    
    // Buscar no BACKLOG.md
    let statusBacklog = null;
    let descricaoBacklog = null;
    
    for (const palavra of palavrasChave) {
      const regex = new RegExp(`\\[.*?${palavra}.*?\\].*?(?:✅|🟢|🔵|🟡|🔴).*?(?:IMPLEMENTADO|OPERANTE|PENDENTE|EM DESENVOLVIMENTO|ABORTADO)`, 'i');
      const match = this.backlogConteudo.match(regex);
      
      if (match) {
        descricaoBacklog = match[0];
        
        if (match[0].includes('✅') || match[0].includes('100% OPERANTE')) {
          statusBacklog = STATUS.OPERANTE;
        } else if (match[0].includes('🟢') || match[0].includes('IMPLEMENTADO')) {
          statusBacklog = STATUS.IMPLEMENTADO;
        } else if (match[0].includes('🔵') || match[0].includes('EM DESENVOLVIMENTO')) {
          statusBacklog = STATUS.EM_DESENVOLVIMENTO;
        } else if (match[0].includes('🟡') || match[0].includes('PENDENTE')) {
          statusBacklog = STATUS.PENDENTE;
        } else if (match[0].includes('🔴') || match[0].includes('ABORTADO')) {
          statusBacklog = STATUS.ABORTADO;
        }
        break;
      }
    }

    // Lógica de inferência de status
    let status = STATUS.NAO_IDENTIFICADO;
    let raciocinio = '';

    if (branchMergeada) {
      if (statusBacklog) {
        status = statusBacklog;
        raciocinio = 'Mergeada + confirmado no BACKLOG';
      } else {
        status = STATUS.IMPLEMENTADO;
        raciocinio = 'Mergeada (provavelmente implementada)';
      }
    } else {
      if (statusBacklog) {
        status = statusBacklog;
        raciocinio = 'Confirmado no BACKLOG';
      } else {
        // Heurística por padrão de nome
        if (nomeSimplificado.includes('feat') || nomeSimplificado.includes('feature')) {
          status = STATUS.EM_DESENVOLVIMENTO;
          raciocinio = 'Branch de feature não mergeada';
        } else if (nomeSimplificado.includes('fix') || nomeSimplificado.includes('bug')) {
          status = STATUS.EM_DESENVOLVIMENTO;
          raciocinio = 'Branch de correção não mergeada';
        } else if (nomeSimplificado.includes('wip') || nomeSimplificado.includes('draft')) {
          status = STATUS.PENDENTE;
          raciocinio = 'Work in progress';
        } else {
          status = STATUS.NAO_IDENTIFICADO;
          raciocinio = 'Não encontrado no BACKLOG';
        }
      }
    }

    return {
      status,
      raciocinio,
      mergeada: branchMergeada,
      descricaoBacklog,
      palavrasChave
    };
  }

  verificarBranchMergeada(nomeBranch) {
    try {
      // Verificar se a branch foi mergeada na main
      const resultado = execSync(`git branch -r --merged origin/main | grep "${nomeBranch}" 2>/dev/null || true`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'] // Suprimir stderr
      }).trim();
      return resultado.length > 0;
    } catch {
      return false;
    }
  }

  extrairPalavrasChave(nomeBranch) {
    // Remover prefixos comuns
    const semPrefixo = nomeBranch
      .replace(/^(feat|feature|fix|bugfix|hotfix|refactor|chore|docs|test|wip|draft)\//, '')
      .replace(/^(claude|copilot|replit|agent)\//, '');
    
    // Dividir por separadores
    const palavras = semPrefixo
      .split(/[-_\/]/)
      .filter(p => p.length > 3); // Ignorar palavras muito curtas
    
    return palavras;
  }

  obterCommitsBranch(nomeBranch) {
    try {
      const formato = '%h|%ai|%an|%s';
      const output = execSync(
        `git log origin/${nomeBranch} --not origin/main --format="${formato}" --max-count=10 2>/dev/null || true`,
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'] // Suprimir stderr
        }
      ).trim();
      
      if (!output) return [];
      
      return output.split('\n').map(linha => {
        const [hash, data, autor, mensagem] = linha.split('|');
        return {
          hash,
          data: new Date(data).toISOString().split('T')[0],
          autor,
          mensagem
        };
      });
    } catch {
      return [];
    }
  }

  inferirFuncionalidadeEsperada(nomeBranch, commits) {
    // Tentar inferir da branch
    const nome = nomeBranch.toLowerCase();
    
    // Padrões conhecidos
    const padroes = [
      { regex: /admin.*mobile/i, desc: 'Interface mobile para administradores' },
      { regex: /notifica(tion|cao)/i, desc: 'Sistema de notificações' },
      { regex: /ranking/i, desc: 'Sistema de rankings' },
      { regex: /mata.*mata/i, desc: 'Sistema de mata-mata' },
      { regex: /parciais/i, desc: 'Parciais em tempo real' },
      { regex: /fluxo.*financeiro/i, desc: 'Gestão financeira' },
      { regex: /cache/i, desc: 'Sistema de cache de dados' },
      { regex: /auth|login/i, desc: 'Autenticação e login' },
      { regex: /api/i, desc: 'Integração com API externa' },
      { regex: /inscri[cç]/i, desc: 'Sistema de inscrições' },
      { regex: /temporal/i, desc: 'Gestão de temporadas' }
    ];

    for (const padrao of padroes) {
      if (padrao.regex.test(nomeBranch)) {
        return padrao.desc;
      }
    }

    // Tentar inferir dos commits
    if (commits.length > 0) {
      const mensagens = commits.map(c => c.mensagem).join(' ').toLowerCase();
      
      for (const padrao of padroes) {
        if (padrao.regex.test(mensagens)) {
          return padrao.desc;
        }
      }
    }

    // Último recurso: usar palavras-chave do nome
    const palavras = this.extrairPalavrasChave(nomeBranch);
    if (palavras.length > 0) {
      return palavras.join(' → ');
    }

    return 'Funcionalidade não identificada';
  }

  async analisarBranches() {
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}`);
    console.log(`${cores.bright}  ANÁLISE DE BRANCHES DO GITHUB (v2.0)  ${cores.reset}`);
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}\n`);

    // Verificar sincronização se solicitado
    if (this.opcoes.syncCheck) {
      this.verificarSincronizacao();
      return;
    }

    // Carregar BACKLOG
    this.carregarBacklog();

    // Buscar PRs se solicitado
    if (this.opcoes.prs) {
      this.pullRequests = await this.buscarPullRequestsGitHub();
    }

    // Listar branches
    let branches = this.listarBranchesRemotas();

    // Aplicar filtros
    branches = this.aplicarFiltroData(branches);

    if (this.opcoes.desde || this.opcoes.ate) {
      console.log(`${cores.amarelo}📅 Filtro de data aplicado: ${this.opcoes.desde || '∞'} → ${this.opcoes.ate || 'hoje'}${cores.reset}`);
      console.log(`${cores.verde}✓ ${branches.length} branches no intervalo${cores.reset}\n`);
    }

    // Analisar cada branch
    const branchesAnalisadas = [];
    
    for (const branch of branches) {
      const analise = this.analisarStatusBranch(branch.nome);
      const commits = this.opcoes.detalhes ? this.obterCommitsBranch(branch.nome) : [];
      const funcionalidade = this.inferirFuncionalidadeEsperada(branch.nome, commits);
      const prInfo = this.opcoes.prs ? this.vincularPRComBranch(branch.nome) : null;

      branchesAnalisadas.push({
        ...branch,
        ...analise,
        funcionalidade,
        commits,
        pr: prInfo
      });
    }

    // Filtrar por status se solicitado
    let branchesFiltradas = branchesAnalisadas;
    if (this.opcoes.status) {
      const statusFiltro = this.opcoes.status.toLowerCase();
      branchesFiltradas = branchesAnalisadas.filter(b => 
        b.status.toLowerCase().includes(statusFiltro)
      );
      console.log(`${cores.amarelo}🔍 Filtro de status: ${statusFiltro}${cores.reset}`);
      console.log(`${cores.verde}✓ ${branchesFiltradas.length} branches encontradas${cores.reset}\n`);
    }

    // Ordenar por data (mais recentes primeiro)
    branchesFiltradas.sort((a, b) => b.dataCriacao - a.dataCriacao);

    // Exibir resultados
    this.exibirResultados(branchesFiltradas);

    // Estatísticas finais
    this.exibirEstatisticas(branchesAnalisadas);
  }

  exibirResultados(branches) {
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}`);
    console.log(`${cores.bright}  RESULTADOS (${branches.length} branches)  ${cores.reset}`);
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}\n`);

    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      
      console.log(`${cores.bright}${i + 1}. ${branch.nome}${cores.reset}`);
      console.log(`   ${cores.cinza}Criada em: ${branch.dataFormatada} por ${branch.autor}${cores.reset}`);
      console.log(`   ${cores.amarelo}Funcionalidade: ${branch.funcionalidade}${cores.reset}`);
      console.log(`   ${this.corStatus(branch.status)} ${branch.status}${cores.reset}`);
      console.log(`   ${cores.cinza}${branch.raciocinio}${cores.reset}`);
      
      // Informações de Pull Request (se disponível)
      if (branch.pr) {
        const pr = branch.pr;
        const estadoPR = pr.mergeado ? `${cores.verde}✓ MERGEADO` : 
                         pr.estado === 'open' ? `${cores.azul}🔵 ABERTO` : 
                         `${cores.vermelho}✗ FECHADO`;
        
        console.log(`   ${cores.magenta}PR #${pr.numero}:${cores.reset} ${pr.titulo}`);
        console.log(`   ${estadoPR}${cores.reset} | Criado: ${pr.criado} | Autor: ${pr.autor}`);
        
        if (pr.mergeado) {
          console.log(`   ${cores.verde}Mergeado em: ${pr.mergeadoEm}${cores.reset}`);
        }
        
        if (pr.comentarios > 0) {
          console.log(`   ${cores.ciano}💬 ${pr.comentarios} comentários${cores.reset}`);
        }
        
        console.log(`   ${cores.cinza}URL: ${pr.url}${cores.reset}`);
      }
      
      if (branch.mergeada) {
        console.log(`   ${cores.verde}✓ Branch mergeada${cores.reset}`);
      } else {
        console.log(`   ${cores.amarelo}⚠ Branch ativa (não mergeada)${cores.reset}`);
      }

      if (branch.descricaoBacklog) {
        console.log(`   ${cores.ciano}BACKLOG: ${branch.descricaoBacklog.substring(0, 100)}...${cores.reset}`);
      }

      if (this.opcoes.detalhes && branch.commits.length > 0) {
        console.log(`\n   ${cores.magenta}Commits recentes:${cores.reset}`);
        for (const commit of branch.commits.slice(0, 5)) {
          console.log(`   ${cores.cinza}  ${commit.hash} ${commit.data} - ${commit.mensagem}${cores.reset}`);
        }
      }

      console.log('');
    }
  }

  corStatus(status) {
    if (status.includes('OPERANTE')) return cores.verde + cores.bright;
    if (status.includes('IMPLEMENTADO')) return cores.verde;
    if (status.includes('DESENVOLVIMENTO')) return cores.azul;
    if (status.includes('PENDENTE')) return cores.amarelo;
    if (status.includes('ABORTADO')) return cores.vermelho;
    return cores.cinza;
  }

  exibirEstatisticas(branches) {
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}`);
    console.log(`${cores.bright}  ESTATÍSTICAS  ${cores.reset}`);
    console.log(`${cores.bright}${cores.azul}═══════════════════════════════════════════════════════════════${cores.reset}\n`);

    const stats = {
      total: branches.length,
      mergeadas: branches.filter(b => b.mergeada).length,
      ativas: branches.filter(b => !b.mergeada).length,
      operantes: branches.filter(b => b.status.includes('OPERANTE')).length,
      implementadas: branches.filter(b => b.status.includes('IMPLEMENTADO')).length,
      emDesenvolvimento: branches.filter(b => b.status.includes('DESENVOLVIMENTO')).length,
      pendentes: branches.filter(b => b.status.includes('PENDENTE')).length,
      abortadas: branches.filter(b => b.status.includes('ABORTADO')).length,
      naoIdentificadas: branches.filter(b => b.status.includes('NÃO IDENTIFICADO')).length
    };

    console.log(`${cores.bright}Total de branches:${cores.reset} ${stats.total}`);
    console.log(`${cores.verde}✓ Mergeadas:${cores.reset} ${stats.mergeadas}`);
    console.log(`${cores.amarelo}⚠ Ativas:${cores.reset} ${stats.ativas}\n`);

    console.log(`${cores.bright}Por status:${cores.reset}`);
    console.log(`${cores.verde}${cores.bright}  ✅ 100% Operantes:${cores.reset} ${stats.operantes}`);
    console.log(`${cores.verde}  🟢 Implementadas:${cores.reset} ${stats.implementadas}`);
    console.log(`${cores.azul}  🔵 Em desenvolvimento:${cores.reset} ${stats.emDesenvolvimento}`);
    console.log(`${cores.amarelo}  🟡 Pendentes:${cores.reset} ${stats.pendentes}`);
    console.log(`${cores.vermelho}  🔴 Abortadas:${cores.reset} ${stats.abortadas}`);
    console.log(`${cores.cinza}  ⚪ Não identificadas:${cores.reset} ${stats.naoIdentificadas}\n`);

    // Taxa de conclusão
    const taxaConclusao = ((stats.operantes + stats.implementadas) / stats.total * 100).toFixed(1);
    console.log(`${cores.bright}Taxa de conclusão:${cores.reset} ${taxaConclusao}%\n`);
  }

  async executar() {
    if (this.opcoes.ajuda) {
      this.mostrarAjuda();
      return;
    }

    await this.analisarBranches();
  }
}

// Executar
const analisador = new AnalisadorBranches();
analisador.executar().catch(erro => {
  console.error(`${cores.vermelho}Erro fatal: ${erro.message}${cores.reset}`);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * gerar-relatorio-implementacao.js
 *
 * Gera relatório de checagem do que foi implementado via PRs do Claude Code Web.
 * Verifica existência de arquivos, rotas registradas e endpoints ativos.
 *
 * Uso:
 *   node scripts/gerar-relatorio-implementacao.js [--desde <commit|tag>] [--json]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const outputJson = args.includes('--json');
const desdeIdx = args.indexOf('--desde');
const desdeRef = desdeIdx !== -1 ? args[desdeIdx + 1] : null;

// ── Helpers ──────────────────────────────────────────────────────────────

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function fileHasContent(relativePath, pattern) {
  try {
    const content = fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
    return content.includes(pattern);
  } catch {
    return false;
  }
}

// ── Coletar PRs Mergeados ────────────────────────────────────────────────

function coletarPRs() {
  const logCmd = desdeRef
    ? `log --oneline --merges ${desdeRef}..HEAD`
    : 'log --oneline --merges -20';

  const merges = git(logCmd);
  if (!merges) return [];

  const prs = [];
  for (const line of merges.split('\n')) {
    const match = line.match(/^([a-f0-9]+)\s+Merge pull request #(\d+) from .+\/(.+)$/);
    if (!match) continue;
    const [, hash, prNum, branch] = match;

    const files = git(`diff --name-only ${hash}^1..${hash}^2`).split('\n').filter(Boolean);
    const commits = git(`log --oneline ${hash}^1..${hash}^2`).split('\n').filter(Boolean);

    prs.push({ hash, prNum: parseInt(prNum), branch, files, commits });
  }

  return prs.reverse(); // cronológico
}

// ── Classificar Arquivos ──────────────────────────────────────────────────

function classificarArquivo(filepath) {
  if (filepath.startsWith('routes/')) return 'backend-rota';
  if (filepath.startsWith('controllers/')) return 'backend-controller';
  if (filepath.startsWith('models/')) return 'backend-model';
  if (filepath.startsWith('services/')) return 'backend-service';
  if (filepath.startsWith('utils/')) return 'backend-util';
  if (filepath.startsWith('middleware/')) return 'backend-middleware';
  if (filepath.startsWith('scripts/')) return 'script';
  if (filepath.startsWith('public/') && filepath.endsWith('.html')) return 'frontend-pagina';
  if (filepath.startsWith('public/') && filepath.endsWith('.js')) return 'frontend-js';
  if (filepath.startsWith('public/') && filepath.endsWith('.css')) return 'frontend-css';
  if (filepath.startsWith('.claude/')) return 'skill-ia';
  if (filepath.startsWith('docs/')) return 'documentacao';
  if (filepath.startsWith('config/')) return 'configuracao';
  if (filepath === 'index.js') return 'server-entry';
  if (filepath.endsWith('.md')) return 'documentacao';
  return 'outro';
}

// ── Verificar Integridade ─────────────────────────────────────────────────

function verificarArquivo(filepath) {
  const existe = fileExists(filepath);
  const tipo = classificarArquivo(filepath);
  return { filepath, existe, tipo };
}

function verificarRotaRegistrada(routeFile) {
  if (!fileExists('index.js')) return null;
  const routeName = path.basename(routeFile, '.js');
  return fileHasContent('index.js', routeName);
}

// ── Gerar Checklist de Testes ─────────────────────────────────────────────

function gerarChecklistPR(pr) {
  const checklist = [];
  const categorias = {};

  for (const f of pr.files) {
    const info = verificarArquivo(f);
    if (!categorias[info.tipo]) categorias[info.tipo] = [];
    categorias[info.tipo].push(info);
  }

  // Rotas backend: verificar registro no index.js
  const rotas = categorias['backend-rota'] || [];
  for (const r of rotas) {
    const registrada = verificarRotaRegistrada(r.filepath);
    checklist.push({
      item: `Rota ${r.filepath}`,
      arquivo_existe: r.existe,
      registrada_index: registrada,
      testar: r.existe ? `Verificar endpoints definidos em ${r.filepath}` : `ARQUIVO AUSENTE: ${r.filepath}`,
      status: r.existe && registrada !== false ? 'ok' : 'atencao'
    });
  }

  // Páginas frontend
  const paginas = categorias['frontend-pagina'] || [];
  for (const p of paginas) {
    const url = '/' + p.filepath.replace('public/', '');
    checklist.push({
      item: `Página ${path.basename(p.filepath)}`,
      arquivo_existe: p.existe,
      testar: p.existe ? `Acessar ${url} no navegador` : `ARQUIVO AUSENTE: ${p.filepath}`,
      status: p.existe ? 'ok' : 'erro'
    });
  }

  // Controllers
  const controllers = categorias['backend-controller'] || [];
  for (const c of controllers) {
    checklist.push({
      item: `Controller ${path.basename(c.filepath)}`,
      arquivo_existe: c.existe,
      testar: c.existe ? `Testar funções do ${path.basename(c.filepath)}` : `ARQUIVO AUSENTE: ${c.filepath}`,
      status: c.existe ? 'ok' : 'erro'
    });
  }

  // Models
  const models = categorias['backend-model'] || [];
  for (const m of models) {
    checklist.push({
      item: `Model ${path.basename(m.filepath)}`,
      arquivo_existe: m.existe,
      testar: m.existe ? `Verificar schema em ${m.filepath}` : `ARQUIVO AUSENTE: ${m.filepath}`,
      status: m.existe ? 'ok' : 'erro'
    });
  }

  // Services
  const services = categorias['backend-service'] || [];
  for (const s of services) {
    checklist.push({
      item: `Service ${path.basename(s.filepath)}`,
      arquivo_existe: s.existe,
      testar: s.existe ? `Testar serviço ${path.basename(s.filepath)}` : `ARQUIVO AUSENTE: ${s.filepath}`,
      status: s.existe ? 'ok' : 'erro'
    });
  }

  // Scripts
  const scripts = categorias['script'] || [];
  for (const s of scripts) {
    checklist.push({
      item: `Script ${path.basename(s.filepath)}`,
      arquivo_existe: s.existe,
      testar: s.existe ? `Executar: node ${s.filepath} --dry-run` : `ARQUIVO AUSENTE: ${s.filepath}`,
      status: s.existe ? 'ok' : 'erro'
    });
  }

  // Frontend JS
  const frontJs = categorias['frontend-js'] || [];
  for (const f of frontJs) {
    checklist.push({
      item: `JS ${path.basename(f.filepath)}`,
      arquivo_existe: f.existe,
      testar: f.existe ? `Verificar console do navegador (sem erros de import)` : `ARQUIVO AUSENTE: ${f.filepath}`,
      status: f.existe ? 'ok' : 'erro'
    });
  }

  // Configs
  const configs = categorias['configuracao'] || [];
  for (const c of configs) {
    checklist.push({
      item: `Config ${path.basename(c.filepath)}`,
      arquivo_existe: c.existe,
      testar: c.existe ? `Verificar valores em ${c.filepath}` : `ARQUIVO AUSENTE: ${c.filepath}`,
      status: c.existe ? 'ok' : 'atencao'
    });
  }

  return { checklist, categorias };
}

// ── Descrição por Branch Name ─────────────────────────────────────────────

function descreverPR(branch) {
  const descricoes = {
    'cartola-api-skill': 'Skill de referência da API Cartola FC (endpoints, schemas, scouts)',
    'personalized-team-news': 'Notícias personalizadas do time do coração no app participante',
    'review-market-status': 'Sincronização mercado + rodadas + dashboard saúde + notificações escalação',
    'sync-github-replit': 'Fix import/autenticação em system-health-routes',
    'ai-problems-detection-skill': 'Skill IA para detectar problemas (overengineering, duplicação, etc)',
    'analyze-participants-module': 'Módulo Analisar Participantes (substituiu Gerir Senhas) + Data Lake JSON',
    'favorite-team-news-feature': 'Centralizar mapeamento clube_id em clubes-data.js',
    'audit-financial-module': 'Auditoria financeira completa + scripts migração/reconciliação',
  };

  for (const [key, desc] of Object.entries(descricoes)) {
    if (branch.includes(key)) return desc;
  }
  return branch;
}

// ── Renderizar Relatório ──────────────────────────────────────────────────

function renderizarRelatorio(prs) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const totalArquivos = prs.reduce((sum, pr) => sum + pr.files.length, 0);
  const totalAusentes = [];
  const totalAtencao = [];
  const testesRecomendados = [];

  let md = '';
  md += '# RELATÓRIO DE IMPLEMENTAÇÃO - Super Cartola Manager v5\n\n';
  md += `**Gerado em:** ${timestamp}\n`;
  md += `**PRs analisados:** ${prs.length}\n`;
  md += `**Total de arquivos alterados:** ${totalArquivos}\n\n`;
  md += '---\n\n';

  for (const pr of prs) {
    const descricao = descreverPR(pr.branch);
    const { checklist } = gerarChecklistPR(pr);

    md += `## PR #${pr.prNum} - ${descricao}\n\n`;
    md += `**Branch:** \`${pr.branch}\`\n`;
    md += `**Commits:** ${pr.commits.length}\n`;
    md += `**Arquivos:** ${pr.files.length}\n\n`;

    // Tabela de checklist
    md += '| Status | Item | Teste Recomendado |\n';
    md += '|--------|------|-------------------|\n';

    for (const c of checklist) {
      const icon = c.status === 'ok' ? '[OK]' : c.status === 'atencao' ? '[!!]' : '[ERRO]';
      md += `| ${icon} | ${c.item} | ${c.testar} |\n`;

      if (c.status === 'erro') totalAusentes.push(c.item);
      if (c.status === 'atencao') totalAtencao.push(c.item);
      if (c.status === 'ok') testesRecomendados.push({ pr: pr.prNum, teste: c.testar });
    }

    md += '\n';
  }

  // Resumo
  md += '---\n\n';
  md += '## RESUMO DE TESTES\n\n';

  if (totalAusentes.length > 0) {
    md += `### [ERRO] Arquivos Ausentes (${totalAusentes.length})\n\n`;
    for (const a of totalAusentes) md += `- ${a}\n`;
    md += '\n';
  }

  if (totalAtencao.length > 0) {
    md += `### [!!] Requerem Atenção (${totalAtencao.length})\n\n`;
    for (const a of totalAtencao) md += `- ${a}\n`;
    md += '\n';
  }

  md += `### Checklist Rápido de Testes Pós-Pull\n\n`;
  md += '```\n';
  md += '1. [ ] Reiniciar servidor (restart no Replit)\n';
  md += '2. [ ] Verificar logs de inicialização (sem erros de require/import)\n';
  md += '3. [ ] Acessar painel admin - verificar menu Ferramentas\n';
  md += '4. [ ] Testar Analisar Participantes (/analisar-participantes.html)\n';
  md += '5. [ ] Testar Notícias do Time no app participante (home)\n';
  md += '6. [ ] Verificar Dashboard Saúde (/dashboard-saude.html)\n';
  md += '7. [ ] Testar extrato financeiro (conferir saldos)\n';
  md += '8. [ ] Executar scripts de auditoria:\n';
  md += '       node scripts/auditar-tipos-financeiros.js --dry-run\n';
  md += '       node scripts/reconciliar-saldos-financeiros.js --dry-run\n';
  md += '9. [ ] Verificar console do navegador (sem erros JS)\n';
  md += '10.[ ] Testar modo manutenção (ativar/desativar)\n';
  md += '```\n\n';

  // Mapa de PRs por área
  md += '### Mapa de Impacto por Área\n\n';
  const areas = {};
  for (const pr of prs) {
    for (const f of pr.files) {
      const tipo = classificarArquivo(f);
      if (!areas[tipo]) areas[tipo] = new Set();
      areas[tipo].add(`PR #${pr.prNum}`);
    }
  }
  md += '| Área | PRs que Alteraram |\n';
  md += '|------|-------------------|\n';
  for (const [area, prSet] of Object.entries(areas).sort()) {
    md += `| ${area} | ${[...prSet].join(', ')} |\n`;
  }
  md += '\n';

  // Arquivos críticos (index.js, middleware)
  const criticos = prs.filter(pr => pr.files.some(f => f === 'index.js' || f.startsWith('middleware/')));
  if (criticos.length > 0) {
    md += '### [!] PRs que Alteraram Arquivos Críticos\n\n';
    for (const pr of criticos) {
      const arqCriticos = pr.files.filter(f => f === 'index.js' || f.startsWith('middleware/'));
      md += `- **PR #${pr.prNum}**: ${arqCriticos.join(', ')}\n`;
    }
    md += '\n> Essas PRs alteraram o entry point ou middleware. Testar inicialização com cuidado.\n\n';
  }

  return md;
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  console.log('Analisando PRs mergeados...\n');

  const prs = coletarPRs();
  if (prs.length === 0) {
    console.log('Nenhum PR mergeado encontrado.');
    process.exit(0);
  }

  if (outputJson) {
    const resultado = prs.map(pr => ({
      pr: pr.prNum,
      branch: pr.branch,
      descricao: descreverPR(pr.branch),
      commits: pr.commits.length,
      ...gerarChecklistPR(pr)
    }));
    console.log(JSON.stringify(resultado, null, 2));
    return;
  }

  const relatorio = renderizarRelatorio(prs);

  // Salvar arquivo
  const outputPath = path.join(ROOT, '.claude', 'docs', 'RELATORIO-IMPLEMENTACAO.md');
  const docsDir = path.dirname(outputPath);
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  fs.writeFileSync(outputPath, relatorio, 'utf-8');
  console.log(`Relatório salvo em: .claude/docs/RELATORIO-IMPLEMENTACAO.md\n`);

  // Imprimir no console também
  console.log(relatorio);
}

main();

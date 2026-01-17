#!/bin/bash
echo "╔══════════════════════════════════════════════╗"
echo "║   AUDITORIA COMPLETA - SUPER CARTOLA         ║"
echo "║   Framework SPARC (Security/Performance/     ║"
echo "║   Architecture/Reliability/Code Quality)     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "📅 Data: $(date)"
echo "🔍 Escopo: $(pwd)"
echo ""

# ========== MÉTRICAS GERAIS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 MÉTRICAS GERAIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
total_js=$(find . -name '*.js' ! -path './node_modules/*' 2>/dev/null | wc -l)
total_lines=$(find . -name '*.js' ! -path './node_modules/*' -exec cat {} \; 2>/dev/null | wc -l)
total_deps=$(cat package.json 2>/dev/null | jq -r '.dependencies | length' 2>/dev/null || echo "0")
total_devdeps=$(cat package.json 2>/dev/null | jq -r '.devDependencies | length' 2>/dev/null || echo "0")

echo "  📄 Arquivos JS: $total_js"
echo "  📝 Linhas totais: $total_lines"
echo "  📦 Dependencies: $total_deps"
echo "  🛠️  DevDependencies: $total_devdeps"
echo ""

# ========== SEGURANÇA (S) ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛡️  SECURITY (S)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

rotas_desprotegidas=$(find routes/ -name "*.js" 2>/dev/null -exec grep -l "router\.\(post\|put\|delete\)" {} \; 2>/dev/null | while read file; do
  if ! grep -q "verificar" "$file" 2>/dev/null; then
    echo "$file"
  fi
done | wc -l)

console_logs=$(grep -rn "console\.log" controllers/ routes/ services/ 2>/dev/null | wc -l)
secrets=$(grep -rn "password\s*[:=]\s*['\"]" --include="*.js" 2>/dev/null | grep -v "process\.env\|\.example" | wc -l)

echo "  🔴 Rotas sem auth: $rotas_desprotegidas"
echo "  🟡 Console.logs: $console_logs"
echo "  🔴 Secrets hardcoded: $secrets"

# NPM Audit
if command -v npm &> /dev/null; then
  echo "  🔒 Vulnerabilidades NPM:"
  npm audit --json 2>/dev/null | jq -r '
    if .metadata then
      .metadata.vulnerabilities | to_entries[] | 
      "    \(.key): \(.value)"
    else
      "    Erro ao executar npm audit"
    end
  ' 2>/dev/null || echo "    npm audit não disponível"
else
  echo "    npm não encontrado"
fi

# Security Score
security_score=5
[ $rotas_desprotegidas -gt 5 ] && security_score=3
[ $secrets -gt 0 ] && security_score=2
[ $rotas_desprotegidas -gt 10 ] && security_score=1

echo "  📊 SCORE: $security_score/5"
echo ""

# ========== MULTI-TENANT ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏢 MULTI-TENANT ISOLATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

queries_sem_tenant=$(grep -rn "\.find({" controllers/ routes/ services/ 2>/dev/null | \
  grep -v "liga_id\|ligaId\|system_config\|users\|User\|Admin" | wc -l)

echo "  🔴 Queries sem liga_id: $queries_sem_tenant"
if [ $queries_sem_tenant -gt 0 ]; then
  echo "  📋 Top 5 exemplos:"
  grep -rn "\.find({" controllers/ routes/ services/ 2>/dev/null | \
    grep -v "liga_id\|ligaId\|system_config\|users\|User\|Admin" | \
    head -5 | sed 's/^/    /'
fi
echo ""

# ========== PERFORMANCE (P) ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ PERFORMANCE (P)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

queries_sem_lean=$(grep -rn "\.find\|\.findOne" controllers/ 2>/dev/null | grep -v "\.lean()" | wc -l)
n_plus_one=$(grep -rn "for.*await.*find\|forEach.*await.*find" controllers/ 2>/dev/null | wc -l)
bundles_grandes=$(find public/js -name "*.js" -size +100k 2>/dev/null | wc -l)

echo "  🟡 Queries sem .lean(): $queries_sem_lean"
echo "  🔴 Possíveis N+1: $n_plus_one"
echo "  📦 Bundles >100KB: $bundles_grandes"

if [ $bundles_grandes -gt 0 ]; then
  echo "  📋 Arquivos grandes:"
  find public/js -name "*.js" -size +100k -exec ls -lh {} \; 2>/dev/null | \
    awk '{print "    " $9 " - " $5}' | head -5
fi

# Performance Score
performance_score=5
[ $queries_sem_lean -gt 20 ] && performance_score=4
[ $queries_sem_lean -gt 50 ] && performance_score=3
[ $n_plus_one -gt 5 ] && performance_score=2
[ $n_plus_one -gt 10 ] && performance_score=1

echo "  📊 SCORE: $performance_score/5"
echo ""

# ========== ARCHITECTURE (A) ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  ARCHITECTURE (A)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

arquivos_grandes=$(find . -name "*.js" ! -path "./node_modules/*" -exec wc -l {} \; 2>/dev/null | \
  awk '$1 > 500 {print $0}' | wc -l)

echo "  📄 Arquivos >500 linhas: $arquivos_grandes"

if [ $arquivos_grandes -gt 0 ]; then
  echo "  📋 Top 5 maiores:"
  find . -name "*.js" ! -path "./node_modules/*" -exec wc -l {} \; 2>/dev/null | \
    awk '$1 > 500 {print $1 " linhas - " $2}' | \
    sort -rn | head -5 | sed 's/^/    /'
fi

# Verificar layer violations
layer_violations=$(grep -rn "import.*from.*models" routes/ 2>/dev/null | wc -l)
echo "  🔴 Routes acessando Models: $layer_violations"

# Architecture Score
architecture_score=5
[ $queries_sem_tenant -gt 5 ] && architecture_score=4
[ $queries_sem_tenant -gt 10 ] && architecture_score=3
[ $arquivos_grandes -gt 10 ] && architecture_score=2
[ $queries_sem_tenant -gt 20 ] && architecture_score=1

echo "  📊 SCORE: $architecture_score/5"
echo ""

# ========== RELIABILITY (R) ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 RELIABILITY (R)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Operações sem timeout
sem_timeout=$(grep -rn "await.*fetch\|await.*axios" --include="*.js" 2>/dev/null | \
  grep -v "timeout\|AbortSignal" | wc -l)

# Try/catch ausentes
sem_error_handling=$(grep -rn "await.*\." controllers/ services/ 2>/dev/null | \
  grep -v "try\|catch" | wc -l)

echo "  🟡 Fetches sem timeout: $sem_timeout"
echo "  🟡 Operações sem try/catch: $sem_error_handling"

# Verificar se tem health check
if [ -f "routes/health.js" ] || grep -rq "/health" routes/ 2>/dev/null; then
  echo "  ✅ Health check endpoint encontrado"
  has_health=1
else
  echo "  🔴 Health check NÃO encontrado"
  has_health=0
fi

# Reliability Score
reliability_score=4
[ $sem_timeout -gt 10 ] && reliability_score=3
[ $has_health -eq 0 ] && reliability_score=2

echo "  📊 SCORE: $reliability_score/5"
echo ""

# ========== CODE QUALITY (C) ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 CODE QUALITY (C)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

todos=$(grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.js" ! -path "./node_modules/*" 2>/dev/null | wc -l)
codigo_comentado=$(find . -name "*.js" ! -path "./node_modules/*" -exec grep -l "^\s*//.*function\|^\s*//.*const" {} \; 2>/dev/null | wc -l)

echo "  📌 TODOs/FIXMEs: $todos"
echo "  🗑️  Arquivos com código comentado: $codigo_comentado"
echo "  🖨️  Console.logs: $console_logs"

# Verificar testes
total_tests=$(find . -name "*.test.js" -o -name "*.spec.js" 2>/dev/null | wc -l)
total_controllers=$(find controllers/ -name "*.js" 2>/dev/null | wc -l)

echo "  🧪 Arquivos de teste: $total_tests"
echo "  📊 Controllers: $total_controllers"

if [ $total_controllers -gt 0 ]; then
  coverage=$((total_tests * 100 / total_controllers))
  echo "  📈 Cobertura estimada: ${coverage}%"
fi

# Code Quality Score
quality_score=5
[ $console_logs -gt 50 ] && quality_score=4
[ $console_logs -gt 100 ] && quality_score=3
[ $todos -gt 100 ] && quality_score=2
[ $console_logs -gt 200 ] && quality_score=1

echo "  📊 SCORE: $quality_score/5"
echo ""

# ========== SCORE FINAL ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 SCORE SPARC FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

total_score=$((security_score + performance_score + architecture_score + reliability_score + quality_score))

echo "  🛡️  Security:     $security_score/5"
echo "  ⚡ Performance:  $performance_score/5"
echo "  🏗️  Architecture: $architecture_score/5"
echo "  🔄 Reliability:  $reliability_score/5"
echo "  🧹 Code Quality: $quality_score/5"
echo "  ═══════════════════════"
echo "  📊 TOTAL:        $total_score/25"
echo ""

# Status final
if [ $total_score -ge 22 ]; then
  status="✅ EXCELENTE"
  color="🟢"
elif [ $total_score -ge 18 ]; then
  status="🟢 MUITO BOM"
  color="🟢"
elif [ $total_score -ge 15 ]; then
  status="🟡 BOM (melhorias recomendadas)"
  color="🟡"
elif [ $total_score -ge 10 ]; then
  status="🟠 REGULAR (ação necessária)"
  color="🟠"
else
  status="🔴 CRÍTICO (refatoração urgente)"
  color="🔴"
fi

echo "$color STATUS: $status"
echo ""

# ========== PRIORIDADES ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 PRIORIDADES DE AÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# P1 - Crítico
echo "🔴 P1 - CRÍTICO (resolver imediatamente):"
[ $rotas_desprotegidas -gt 0 ] && echo "  - Adicionar autenticação em $rotas_desprotegidas rotas"
[ $secrets -gt 0 ] && echo "  - Remover $secrets secrets hardcoded"
[ $queries_sem_tenant -gt 10 ] && echo "  - Adicionar liga_id em queries (multi-tenant)"
echo ""

# P2 - Alto
echo "🟡 P2 - ALTO (resolver em 48h):"
[ $queries_sem_lean -gt 20 ] && echo "  - Adicionar .lean() em $queries_sem_lean queries"
[ $console_logs -gt 50 ] && echo "  - Remover $console_logs console.logs"
[ $n_plus_one -gt 5 ] && echo "  - Resolver $n_plus_one possíveis N+1 queries"
echo ""

# P3 - Médio
echo "🟢 P3 - MÉDIO (resolver em 1 semana):"
[ $todos -gt 50 ] && echo "  - Resolver $todos TODOs/FIXMEs"
[ $arquivos_grandes -gt 5 ] && echo "  - Refatorar $arquivos_grandes arquivos grandes"
[ $total_tests -lt 5 ] && echo "  - Adicionar testes (cobertura atual baixa)"
echo ""

# ========== RECOMENDAÇÕES ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 RECOMENDAÇÕES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Executar scripts específicos:"
echo "   bash scripts/audit_security.sh"
echo "   bash scripts/audit_multitenant.sh"
echo ""
echo "2. Configurar CI/CD com:"
echo "   - npm audit (vulnerabilidades)"
echo "   - ESLint (qualidade de código)"
echo "   - Testes automatizados"
echo ""
echo "3. Implementar:"
echo "   - Logger estruturado (Winston/Pino)"
echo "   - Health checks (/health, /ready)"
echo "   - Metrics endpoint (/metrics)"
echo ""

# ========== FOOTER ==========
echo "═══════════════════════════════════════════════"
echo "📝 Relatório completo"
echo "📅 Próxima auditoria recomendada: $(date -d '+1 month' 2>/dev/null || date)"
echo ""
echo "Para salvar este relatório:"
echo "  bash scripts/audit_full.sh > audit_\$(date +%Y%m%d).log"
echo ""

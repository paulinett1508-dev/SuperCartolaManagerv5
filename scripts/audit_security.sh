#!/bin/bash
echo "🔐 AUDITORIA DE SEGURANÇA - Super Cartola Manager"
echo "================================================="
echo ""
echo "📅 Data: $(date)"
echo ""

# ========== ROTAS DESPROTEGIDAS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 ROTAS POST/PUT/DELETE SEM AUTENTICAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
count=0
find routes/ -name "*.js" 2>/dev/null | while read file; do
  if grep -q "router\.\(post\|put\|delete\)" "$file"; then
    if ! grep -q "verificarAdmin\|verificarParticipante" "$file"; then
      echo "  ⚠️  $file"
      count=$((count + 1))
    fi
  fi
done
echo "  Total: $count rotas desprotegidas"
echo ""

# ========== QUERIES SEM MULTI-TENANT ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 QUERIES SEM FILTRO DE LIGA_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -rn "\.find({}\|\.findOne({})" controllers/ routes/ services/ 2>/dev/null | head -10
echo ""
echo "Queries sem liga_id (excluindo system_config e users):"
grep -rn "\.find({" controllers/ routes/ services/ 2>/dev/null | \
  grep -v "liga_id\|ligaId" | \
  grep -v "system_config\|users\|User\|Admin" | \
  head -10
echo ""

# ========== SESSÕES INSEGURAS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 CONFIGURAÇÕES DE SESSÃO INSEGURAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -rn "cookie:" config/ index.js 2>/dev/null | grep -v "httpOnly\|secure\|sameSite" | head -5
echo ""

# ========== SECRETS HARDCODED ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 SECRETS HARDCODED NO CÓDIGO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
secrets_count=$(grep -rn "password\s*[:=]\s*['\"][^'\"]*['\"]" --include="*.js" 2>/dev/null | \
  grep -v "process\.env\|\.example\|\.sample\|\.template" | wc -l)
echo "  Total de secrets hardcoded: $secrets_count"
if [ $secrets_count -gt 0 ]; then
  echo "  Exemplos:"
  grep -rn "password\s*[:=]\s*['\"][^'\"]*['\"]" --include="*.js" 2>/dev/null | \
    grep -v "process\.env\|\.example\|\.sample\|\.template" | \
    head -5 | sed 's/^/    /'
fi
echo ""

# ========== JWT SEM EXPIRAÇÃO ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🟡 JWT SEM EXPIRAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -rn "jwt\.sign" --include="*.js" 2>/dev/null | grep -v "expiresIn" | head -5
echo ""

# ========== CONSOLE.LOGS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🟡 CONSOLE.LOGS EM PRODUÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
console_count=$(find controllers/ routes/ services/ -name "*.js" 2>/dev/null -exec grep -Hn "console\.log" {} \; | wc -l)
echo "  Total: $console_count ocorrências"
if [ $console_count -gt 0 ]; then
  echo "  Top 10:"
  find controllers/ routes/ services/ -name "*.js" 2>/dev/null -exec grep -Hn "console\.log" {} \; | head -10 | sed 's/^/    /'
fi
echo ""

# ========== NPM AUDIT ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 VULNERABILIDADES NPM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v npm &> /dev/null; then
  npm audit --json 2>/dev/null | jq -r '
    if .metadata then
      .metadata.vulnerabilities | to_entries[] | 
      "  \(.key): \(.value)"
    else
      "Erro ao executar npm audit"
    end
  ' || echo "  npm audit não disponível"
else
  echo "  npm não encontrado"
fi
echo ""

# ========== CORS INSEGURO ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 CORS MAL CONFIGURADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -rn "origin.*\*\|Access-Control-Allow-Origin.*\*" --include="*.js" 2>/dev/null | head -5
echo ""

# ========== SQL/NoSQL INJECTION ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 POSSÍVEL INJECTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MongoDB \$where (executa JS no servidor):"
grep -rn "\$where" --include="*.js" 2>/dev/null | grep -v "node_modules" | head -5
echo ""
echo "RegEx sem escape:"
grep -rn "new RegExp.*req\." --include="*.js" 2>/dev/null | grep -v "escape\|sanitize" | head -5
echo ""

# ========== SUMMARY ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔴 Críticos: Rotas desprotegidas, Queries sem multi-tenant, Secrets hardcoded"
echo "  🟡 Importantes: Console.logs, JWT sem expiração, CORS inseguro"
echo ""
echo "💡 Próximos passos:"
echo "  1. Adicionar middleware de auth em rotas desprotegidas"
echo "  2. Adicionar filtro liga_id em TODAS as queries"
echo "  3. Mover secrets para variáveis de ambiente"
echo "  4. Remover console.logs antes de deploy"
echo ""

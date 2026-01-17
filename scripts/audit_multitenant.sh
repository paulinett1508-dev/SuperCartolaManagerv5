#!/bin/bash
echo "🏢 AUDITORIA MULTI-TENANT - Super Cartola Manager"
echo "================================================="
echo ""
echo "📅 Data: $(date)"
echo ""

# ========== QUERIES SEM LIGA_ID ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 QUERIES SEM FILTRO DE LIGA_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Queries vazias (find({}) ou findOne({})):"
grep -rn "\.find({}\|\.findOne({})" controllers/ routes/ services/ 2>/dev/null | \
  grep -v "system_config\|User\|Admin" | \
  head -10
echo ""

echo "2. Queries sem liga_id/ligaId:"
count=$(grep -rn "\.find({" controllers/ routes/ services/ 2>/dev/null | \
  grep -v "liga_id\|ligaId" | \
  grep -v "system_config\|users\|User\|Admin" | \
  wc -l)
echo "  Total: $count queries suspeitas"
if [ $count -gt 0 ]; then
  echo "  Top 10 exemplos:"
  grep -rn "\.find({" controllers/ routes/ services/ 2>/dev/null | \
    grep -v "liga_id\|ligaId" | \
    grep -v "system_config\|users\|User\|Admin" | \
    head -10 | sed 's/^/    /'
fi
echo ""

# ========== ROTAS SEM VALIDAÇÃO ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🟡 ROTAS SEM VALIDAÇÃO DE TENANT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
find routes/ -name "*.js" 2>/dev/null | while read file; do
  if grep -q "router\.\(post\|put\|delete\)" "$file"; then
    if ! grep -q "ligaId\|liga_id\|req\.params\|req\.body" "$file"; then
      echo "  ⚠️  $file - Sem referência a ligaId"
    fi
  fi
done
echo ""

# ========== MODELS SEM ÍNDICE ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🟡 MODELS SEM ÍNDICE DE LIGA_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
find models/ -name "*.js" 2>/dev/null | while read file; do
  # Verificar se tem campo liga_id mas não tem índice
  if grep -q "liga_id" "$file"; then
    if ! grep -q "index.*liga_id\|liga_id.*index" "$file"; then
      echo "  ⚠️  $file - Tem liga_id mas sem índice"
    fi
  fi
done
echo ""

# ========== AGREGAÇÕES SEM FILTRO ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 AGREGAÇÕES SEM FILTRO DE LIGA_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
grep -rn "\.aggregate\|\.pipeline" controllers/ services/ 2>/dev/null | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)
  
  # Buscar contexto (10 linhas após)
  context=$(sed -n "${linenum},$((linenum+10))p" "$file" 2>/dev/null)
  
  if ! echo "$context" | grep -q "\$match.*liga_id\|liga_id.*\$match"; then
    echo "  ⚠️  $file:$linenum - Agregação sem \$match de liga_id"
  fi
done | head -10
echo ""

# ========== UPDATE/DELETE EM MASSA ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 UPDATE/DELETE EM MASSA SEM LIGA_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "updateMany sem liga_id:"
grep -rn "\.updateMany\|\.deleteMany" controllers/ routes/ services/ 2>/dev/null | \
  grep -v "liga_id\|ligaId" | \
  head -5
echo ""

# ========== VERIFICAÇÃO POR COLLECTION ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ANÁLISE POR COLLECTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

collections=("Participante" "Rodada" "AcertoFinanceiro" "Ranking" "MataMata" "PontosCorridos")

for collection in "${collections[@]}"; do
  echo "Collection: $collection"
  
  # Queries sem liga_id
  count=$(grep -rn "$collection\.find\|$collection\.findOne" controllers/ routes/ services/ 2>/dev/null | \
    grep -v "liga_id\|ligaId" | wc -l)
  
  if [ $count -gt 0 ]; then
    echo "  🔴 Queries sem liga_id: $count"
  else
    echo "  ✅ OK - Todas queries com liga_id"
  fi
  
  echo ""
done

# ========== MIDDLEWARE DE TENANT ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 MIDDLEWARE DE TENANT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ -f "middleware/tenant.js" ] || [ -f "middleware/tenantFilter.js" ]; then
  echo "  ✅ Middleware de tenant encontrado"
  
  # Verificar uso
  uso=$(grep -rn "tenantFilter\|tenantMiddleware" routes/ 2>/dev/null | wc -l)
  echo "  Usado em $uso rotas"
else
  echo "  🔴 Middleware de tenant NÃO encontrado"
  echo "  💡 Recomendação: Criar middleware/tenant.js para validação automática"
fi
echo ""

# ========== INCONSISTÊNCIAS DE TIPO ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🟡 INCONSISTÊNCIAS DE TIPO (String vs ObjectId)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "liga_id como String:"
grep -rn "liga_id.*String\|String.*liga_id" models/ 2>/dev/null | head -5
echo ""
echo "liga_id como ObjectId:"
grep -rn "liga_id.*ObjectId\|ObjectId.*liga_id" models/ 2>/dev/null | head -5
echo ""

# ========== SUMMARY ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO E RECOMENDAÇÕES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Prioridades:"
echo "  1. 🔴 Adicionar liga_id em TODAS as queries de dados de jogo"
echo "  2. 🟡 Criar middleware global de validação de tenant"
echo "  3. 🟡 Adicionar índices compostos (liga_id + outros campos)"
echo "  4. 🟡 Padronizar tipo de liga_id (String ou ObjectId)"
echo ""
echo "💡 Pattern recomendado:"
echo "  // Em toda query"
echo "  const data = await Collection.find({ liga_id: ligaId, ...otherFilters });"
echo ""
echo "  // Em models"
echo "  schema.index({ liga_id: 1, campo_relevante: 1 });"
echo ""
echo "  // Em routes"
echo "  router.get('/:ligaId/endpoint', tenantMiddleware, async (req, res) => {"
echo "    const { ligaId } = req.params;"
echo "    // usar ligaId em TODAS as queries"
echo "  });"
echo ""

# ========== SCORE ==========
total_issues=$count
if [ $total_issues -eq 0 ]; then
  echo "✅ EXCELENTE - Multi-tenant isolation perfeito!"
elif [ $total_issues -lt 5 ]; then
  echo "🟡 BOM - Poucos issues encontrados"
elif [ $total_issues -lt 20 ]; then
  echo "🟠 ATENÇÃO - Issues moderados encontrados"
else
  echo "🔴 CRÍTICO - Muitos issues de multi-tenant"
fi
echo ""

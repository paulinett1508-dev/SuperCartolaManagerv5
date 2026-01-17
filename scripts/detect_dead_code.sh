#!/bin/bash
echo "🧹 DETECÇÃO DE CÓDIGO MORTO - Super Cartola"
echo "============================================"
echo ""

# ========== CÓDIGO COMENTADO ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 CÓDIGO COMENTADO (> 5 linhas)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

count=0
find . -name "*.js" ! -path "./node_modules/*" | while read file; do
  # Contar linhas de código comentado com keywords
  commented=$(grep -c "^\s*//.*function\|^\s*//.*const\|^\s*//.*let\|^\s*//.*var" "$file" 2>/dev/null)
  
  if [ $commented -gt 5 ]; then
    echo "  ⚠️  $file - $commented linhas comentadas"
    count=$((count + 1))
  fi
done

echo "  Total: arquivos com código comentado"
echo ""

# ========== CONSOLE.LOGS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖨️  CONSOLE.LOGS (remover antes de deploy)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

total=$(grep -rn "console\.log\|console\.error\|console\.warn" \
  controllers/ routes/ services/ public/js/ \
  --include="*.js" 2>/dev/null | wc -l)

echo "  Total: $total ocorrências"
echo ""

if [ $total -gt 0 ]; then
  echo "  Top 10 arquivos:"
  grep -rn "console\." controllers/ routes/ services/ public/js/ --include="*.js" 2>/dev/null | \
    cut -d: -f1 | sort | uniq -c | sort -rn | head -10 | \
    awk '{print "    " $1 " ocorrências - " $2}'
  echo ""
  
  echo "  Exemplos:"
  grep -rn "console\." controllers/ routes/ services/ --include="*.js" 2>/dev/null | \
    head -5 | sed 's/^/    /'
fi
echo ""

# ========== TODOs E FIXMEs ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 TODOs/FIXMEs/HACKs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

todos=$(grep -rn "TODO" --include="*.js" ! -path "./node_modules/*" 2>/dev/null | wc -l)
fixmes=$(grep -rn "FIXME" --include="*.js" ! -path "./node_modules/*" 2>/dev/null | wc -l)
hacks=$(grep -rn "HACK\|XXX" --include="*.js" ! -path "./node_modules/*" 2>/dev/null | wc -l)

echo "  TODO: $todos"
echo "  FIXME: $fixmes"
echo "  HACK/XXX: $hacks"
echo "  Total: $((todos + fixmes + hacks))"
echo ""

if [ $((todos + fixmes + hacks)) -gt 0 ]; then
  echo "  Exemplos:"
  grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.js" ! -path "./node_modules/*" 2>/dev/null | \
    head -10 | sed 's/^/    /'
fi
echo ""

# ========== FUNÇÕES NÃO USADAS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔇 FUNÇÕES POTENCIALMENTE NÃO USADAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  Analisando funções exportadas vs uso..."

# Encontrar funções exportadas
exported_functions=$(grep -rh "exports\.\|module\.exports\s*=" \
  controllers/ services/ utils/ 2>/dev/null | \
  sed 's/.*exports\.\([a-zA-Z0-9_]*\).*/\1/' | \
  sed 's/.*exports\s*=\s*{\s*\([^}]*\).*/\1/' | \
  tr ',' '\n' | sed 's/[^a-zA-Z0-9_]//g' | grep -v "^$" | sort -u)

unused_count=0
echo "$exported_functions" | head -20 | while read func; do
  if [ -n "$func" ]; then
    # Contar uso (excluindo a própria definição)
    usage=$(grep -r "\b$func\b" --include="*.js" ! -path "./node_modules/*" 2>/dev/null | \
      grep -v "exports\.$func\|module\.exports.*$func" | wc -l)
    
    if [ $usage -lt 2 ]; then
      echo "  ⚠️  Função '$func' - usado $usage vezes"
      unused_count=$((unused_count + 1))
    fi
  fi
done

echo "  (Verificação limitada - analise manualmente)"
echo ""

# ========== IMPORTS NÃO UTILIZADOS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 IMPORTS POTENCIALMENTE NÃO UTILIZADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  Analisando imports vs uso no arquivo..."

find . -name "*.js" ! -path "./node_modules/*" 2>/dev/null | head -20 | while read file; do
  # Extrair imports
  imports=$(grep "^const.*require\|^import" "$file" 2>/dev/null | \
    sed 's/.*const \([a-zA-Z0-9_]*\).*/\1/' | \
    sed 's/.*import \([a-zA-Z0-9_]*\).*/\1/')
  
  echo "$imports" | while read var; do
    if [ -n "$var" ]; then
      # Contar uso no mesmo arquivo (excluindo a linha de import)
      count=$(grep -c "\b$var\b" "$file" 2>/dev/null)
      
      if [ $count -le 1 ]; then
        echo "  ⚠️  '$var' em $file - não usado"
      fi
    fi
  done
done | head -10

echo "  (Verificação limitada aos primeiros 20 arquivos)"
echo ""

# ========== ARQUIVOS VAZIOS OU QUASE VAZIOS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 ARQUIVOS VAZIOS OU MUITO PEQUENOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

small_files=$(find . -name "*.js" ! -path "./node_modules/*" -type f -exec wc -l {} \; 2>/dev/null | \
  awk '$1 < 10 {print $0}' | wc -l)

echo "  Arquivos com < 10 linhas: $small_files"

if [ $small_files -gt 0 ]; then
  echo "  Exemplos:"
  find . -name "*.js" ! -path "./node_modules/*" -type f -exec wc -l {} \; 2>/dev/null | \
    awk '$1 < 10 {print "    " $1 " linhas - " $2}' | head -10
fi
echo ""

# ========== VARIÁVEIS NÃO USADAS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔢 VARIÁVEIS DECLARADAS MAS NÃO USADAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  Buscar com ESLint para melhor precisão:"
echo "    npx eslint . --rule 'no-unused-vars: error'"
echo ""

# ========== DUPLICAÇÃO DE CÓDIGO ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 DUPLICAÇÃO DE CÓDIGO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  Funções com nomes similares (possível duplicação):"

# Buscar funções com nome "calcular", "processar", etc
common_names=("calcular" "processar" "get" "set" "update" "delete")

for name in "${common_names[@]}"; do
  count=$(grep -rh "function.*$name\|const.*$name.*=" --include="*.js" ! -path "./node_modules/*" 2>/dev/null | wc -l)
  
  if [ $count -gt 3 ]; then
    echo "  📋 Funções com '$name': $count"
    grep -rh "function.*$name\|const.*$name.*=" --include="*.js" ! -path "./node_modules/*" 2>/dev/null | \
      head -5 | sed 's/^/    /'
  fi
done

echo ""
echo "  💡 Para análise completa de duplicação:"
echo "    npx jscpd . --min-lines 10 --min-tokens 50"
echo ""

# ========== SUMMARY ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

total_issues=$((total + todos + fixmes + hacks))

echo "  📌 Total de issues: $total_issues"
echo ""
echo "🎯 Ações recomendadas:"
echo "  1. Remover console.logs ($total ocorrências)"
echo "  2. Resolver TODOs/FIXMEs ($((todos + fixmes)) itens)"
echo "  3. Limpar código comentado"
echo "  4. Remover imports não usados"
echo ""
echo "🛠️  Ferramentas sugeridas:"
echo "  - ESLint: npx eslint . --fix"
echo "  - JSCPD: npx jscpd ."
echo "  - Prettier: npx prettier --write ."
echo ""

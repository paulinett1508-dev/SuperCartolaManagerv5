#!/bin/bash
echo "📦 ANÁLISE DE DEPENDÊNCIAS - Super Cartola"
echo "==========================================="
echo ""

# ========== INFORMAÇÕES GERAIS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 INFORMAÇÕES GERAIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "package.json" ]; then
  total_deps=$(cat package.json | jq -r '.dependencies | length' 2>/dev/null || echo "0")
  total_devdeps=$(cat package.json | jq -r '.devDependencies | length' 2>/dev/null || echo "0")
  
  echo "  📦 Dependencies: $total_deps"
  echo "  🛠️  DevDependencies: $total_devdeps"
  echo "  📊 Total: $((total_deps + total_devdeps))"
else
  echo "  ⚠️  package.json não encontrado"
  exit 1
fi
echo ""

# ========== PACOTES DESATUALIZADOS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 PACOTES DESATUALIZADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v npm &> /dev/null; then
  outdated=$(npm outdated --json 2>/dev/null)
  
  if [ -n "$outdated" ] && [ "$outdated" != "{}" ]; then
    echo "$outdated" | jq -r 'to_entries[] | "  \(.key): \(.value.current) → \(.value.latest)"' 2>/dev/null || \
      echo "  Executar: npm outdated"
  else
    echo "  ✅ Todos os pacotes estão atualizados"
  fi
else
  echo "  ⚠️  npm não encontrado"
fi
echo ""

# ========== VULNERABILIDADES ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 VULNERABILIDADES DE SEGURANÇA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v npm &> /dev/null; then
  audit_result=$(npm audit --json 2>/dev/null)
  
  if [ -n "$audit_result" ]; then
    echo "$audit_result" | jq -r '
      if .metadata then
        "  Vulnerabilidades encontradas:",
        (.metadata.vulnerabilities | to_entries[] | "    \(.key): \(.value)"),
        "",
        "  Total de dependências: \(.metadata.totalDependencies)"
      else
        "  Sem vulnerabilidades ou erro ao executar"
      end
    ' 2>/dev/null || echo "  Executar: npm audit"
    
    # Verificar se tem vulnerabilidades críticas
    critical=$(echo "$audit_result" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null)
    high=$(echo "$audit_result" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null)
    
    if [ "$critical" -gt 0 ] || [ "$high" -gt 0 ]; then
      echo ""
      echo "  🔴 AÇÃO NECESSÁRIA: Vulnerabilidades críticas/altas encontradas"
      echo "  Executar: npm audit fix"
    fi
  fi
else
  echo "  ⚠️  npm não encontrado"
fi
echo ""

# ========== DEPENDÊNCIAS NÃO UTILIZADAS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗑️  DEPENDÊNCIAS NÃO UTILIZADAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v npx &> /dev/null; then
  echo "  Executando depcheck..."
  depcheck_result=$(npx --yes depcheck --json 2>/dev/null)
  
  if [ -n "$depcheck_result" ]; then
    # Dependências não usadas
    unused=$(echo "$depcheck_result" | jq -r '.dependencies[]' 2>/dev/null)
    if [ -n "$unused" ]; then
      echo "  📦 Dependências não usadas:"
      echo "$unused" | while read dep; do
        echo "    - $dep"
      done
    else
      echo "  ✅ Todas as dependências estão sendo usadas"
    fi
    
    # DevDependencies não usadas
    unused_dev=$(echo "$depcheck_result" | jq -r '.devDependencies[]' 2>/dev/null)
    if [ -n "$unused_dev" ]; then
      echo ""
      echo "  🛠️  DevDependencies não usadas:"
      echo "$unused_dev" | while read dep; do
        echo "    - $dep"
      done
    fi
  else
    echo "  💡 Instalar: npx depcheck"
  fi
else
  echo "  ⚠️  npx não encontrado"
fi
echo ""

# ========== DEPENDÊNCIAS DUPLICADAS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔀 DEPENDÊNCIAS DUPLICADAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v npm &> /dev/null; then
  duplicates=$(npm ls 2>&1 | grep -E "├─|└─" | sort | uniq -d)
  
  if [ -n "$duplicates" ]; then
    echo "  ⚠️  Pacotes com múltiplas versões:"
    echo "$duplicates" | head -10 | sed 's/^/    /'
    echo ""
    echo "  💡 Resolver com: npm dedupe"
  else
    echo "  ✅ Sem duplicações detectadas"
  fi
else
  echo "  ⚠️  npm não encontrado"
fi
echo ""

# ========== TAMANHO NODE_MODULES ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TAMANHO DO NODE_MODULES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "node_modules" ]; then
  size=$(du -sh node_modules 2>/dev/null | cut -f1)
  file_count=$(find node_modules -type f 2>/dev/null | wc -l)
  
  echo "  📦 Tamanho total: $size"
  echo "  📄 Número de arquivos: $file_count"
  
  # Top 10 pacotes maiores
  echo ""
  echo "  Top 10 pacotes mais pesados:"
  du -sh node_modules/* 2>/dev/null | sort -rh | head -10 | \
    awk '{print "    " $1 " - " $2}' | sed 's|node_modules/||'
else
  echo "  ⚠️  Diretório node_modules não encontrado"
  echo "  Execute: npm install"
fi
echo ""

# ========== LICENÇAS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚖️  LICENÇAS DOS PACOTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v npx &> /dev/null; then
  echo "  💡 Para verificar licenças:"
  echo "    npx license-checker --summary"
  echo "    npx license-checker --production --json"
else
  echo "  ⚠️  npx não encontrado"
fi
echo ""

# ========== ANÁLISE DE VERSÕES ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔢 ANÁLISE DE VERSÕES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "package.json" ]; then
  # Contar ranges vs exact versions
  cat package.json | jq -r '.dependencies, .devDependencies | to_entries[]' 2>/dev/null | \
    awk -F'"' '{print $4}' | {
      exact=0
      caret=0
      tilde=0
      other=0
      
      while read version; do
        if [[ $version =~ ^\^.* ]]; then
          caret=$((caret + 1))
        elif [[ $version =~ ^~.* ]]; then
          tilde=$((tilde + 1))
        elif [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
          exact=$((exact + 1))
        else
          other=$((other + 1))
        fi
      done
      
      echo "  📌 Versões exatas: $exact"
      echo "  ^ Caret (minor): $caret"
      echo "  ~ Tilde (patch): $tilde"
      echo "  ⚠️  Outros: $other"
    }
fi
echo ""

# ========== DEPENDÊNCIAS CRÍTICAS ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 DEPENDÊNCIAS CRÍTICAS DO PROJETO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

critical_deps=("express" "mongoose" "bcrypt" "jsonwebtoken" "cors" "helmet" "express-session")

echo "  Verificando pacotes essenciais..."
for dep in "${critical_deps[@]}"; do
  if grep -q "\"$dep\"" package.json 2>/dev/null; then
    version=$(cat package.json | jq -r ".dependencies.\"$dep\" // .devDependencies.\"$dep\"" 2>/dev/null)
    echo "  ✅ $dep: $version"
  else
    echo "  ⚠️  $dep: NÃO INSTALADO"
  fi
done
echo ""

# ========== SUMMARY E RECOMENDAÇÕES ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO E RECOMENDAÇÕES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Comandos úteis:"
echo "  1. Atualizar pacotes:"
echo "     npm update"
echo ""
echo "  2. Corrigir vulnerabilidades:"
echo "     npm audit fix"
echo "     npm audit fix --force  # para breaking changes"
echo ""
echo "  3. Remover não usados:"
echo "     npm prune"
echo "     npx depcheck  # verificar antes"
echo ""
echo "  4. Limpar cache:"
echo "     npm cache clean --force"
echo ""
echo "  5. Reinstalar tudo:"
echo "     rm -rf node_modules package-lock.json"
echo "     npm install"
echo ""
echo "📚 Ferramentas adicionais:"
echo "  - npm-check-updates: npx ncu -u"
echo "  - bundle-phobia: npx bundle-phobia [package]"
echo "  - cost-of-modules: npx cost-of-modules"
echo ""

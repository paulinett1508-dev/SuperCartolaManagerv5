#!/bin/bash
# =================================================================
# replit-pull.sh - Sincronizar código do GitHub para o Replit
# =================================================================
# Uso: bash scripts/replit-pull.sh
# =================================================================

set -e

echo "🔄 Sincronizando código do GitHub..."
echo "================================================"

# 1. Verificar se há mudanças locais
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Salvando mudanças locais (stash)..."
    git stash
    STASHED=true
else
    echo "✅ Sem mudanças locais"
    STASHED=false
fi

# 2. Pull com rebase
echo "⬇️  Puxando commits do GitHub..."
git pull --rebase origin main

# 3. Restaurar mudanças locais
if [ "$STASHED" = true ]; then
    echo "📦 Restaurando mudanças locais..."
    git stash pop || echo "⚠️  Conflito no stash pop - resolver manualmente"
fi

# 4. Mostrar últimos commits
echo ""
echo "================================================"
echo "📋 Últimos 5 commits:"
git log --oneline -5
echo ""

# 5. Verificar status
echo "📊 Status:"
git status --short
echo ""
echo "✅ Sincronização concluída!"
echo "👉 Agora clique em REPUBLISH no Replit para aplicar em produção."

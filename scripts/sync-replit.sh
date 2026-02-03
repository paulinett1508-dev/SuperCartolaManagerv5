#!/bin/bash
set -e
echo "🔄 Sincronizando GitHub → Replit..."

git fetch origin
CURRENT=$(git branch --show-current)

[ -n "$(git status --porcelain)" ] && git stash

git checkout main
git pull origin main --rebase

git show-ref --verify --quiet refs/heads/develop && {
    git checkout develop
    git pull origin develop --rebase
}

git checkout "$CURRENT"
git stash list | grep -q "stash@{0}" && git stash pop

git diff HEAD@{1} HEAD --name-only | grep -q "package.json" && npm install --production

echo "✅ Sync concluído!"
git log --oneline -n 3

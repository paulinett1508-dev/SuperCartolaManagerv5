# 🔄 Scripts de Sincronização Git

Scripts para sincronizar código entre desenvolvimento local e Replit.

## 📋 Scripts Disponíveis

### 1. `sync-feature-branch.sh` - Sincronização de Feature Branches

**Uso:**
```bash
# Sincroniza a branch atual
bash scripts/sync-feature-branch.sh

# Sincroniza uma branch específica
bash scripts/sync-feature-branch.sh claude/nome-da-branch
```

**O que faz:**
- ✅ Detecta automaticamente a branch atual (ou usa a especificada)
- ✅ Valida se é uma feature branch (deve começar com `claude/`)
- ✅ Faz stash automático de mudanças locais (pergunta antes)
- ✅ Fetch do remoto com prune
- ✅ Pull com rebase para evitar merge commits
- ✅ Restaura mudanças locais após sync
- ✅ Mostra resumo: últimos commits, status, tracking
- ✅ Detecta conflitos e sugere resolução

**Segurança:**
- Pergunta antes de fazer stash
- Não sobrescreve mudanças sem confirmar
- Detecta e informa conflitos
- Permite abortar a qualquer momento

---

### 2. `sync-admin-mobile.sh` - Atalho Admin Mobile

**Uso:**
```bash
bash scripts/sync-admin-mobile.sh
```

**O que faz:**
- Sincroniza especificamente a branch `claude/admin-mode-feature-eDdP3`
- Atalho rápido para não precisar digitar o nome completo da branch

---

### 3. `replit-pull.sh` - Sincronização Main (Legado)

**Uso:**
```bash
bash scripts/replit-pull.sh
```

**O que faz:**
- Sincroniza apenas a branch `main`
- Script legado mantido para compatibilidade

---

## 🚀 Workflow Recomendado

### No Replit (Produção):

#### **Atualizar feature em desenvolvimento:**
```bash
# Opção 1: Atalho específico
bash scripts/sync-admin-mobile.sh

# Opção 2: Generic (qualquer branch)
bash scripts/sync-feature-branch.sh
```

#### **Após sincronização:**
1. ✅ Verifique os logs de commit mostrados
2. ✅ Revise o status do git
3. 🔄 **Reinicie o servidor** (Stop → Run)
4. 🌐 Limpe cache do navegador (`Ctrl+Shift+R`)
5. ✅ Teste as mudanças

---

## 🎯 Casos de Uso

### Caso 1: Ver mudanças do Claude no Replit

```bash
# No Shell do Replit:
bash scripts/sync-admin-mobile.sh

# Resultado:
# ✅ Pull de commits novos
# ✅ Código atualizado
# ✅ Pronto para reiniciar servidor
```

### Caso 2: Sincronizar outra feature branch

```bash
bash scripts/sync-feature-branch.sh claude/minha-outra-feature
```

### Caso 3: Mudanças locais + sync

```bash
# Script detecta mudanças locais
bash scripts/sync-admin-mobile.sh

# Pergunta: "Deseja fazer stash? (s/N)"
# Digite: s

# Faz sync + restaura mudanças
```

---

## ⚠️ Tratamento de Conflitos

Se houver conflitos durante o rebase:

```bash
# 1. Script para e mostra mensagem:
❌ ERRO: Conflitos detectados no rebase

# 2. Resolva conflitos manualmente nos arquivos
# 3. Adicione arquivos resolvidos:
git add arquivo-resolvido.js

# 4. Continue rebase:
git rebase --continue

# 5. Ou cancele:
git rebase --abort
```

---

## 🔧 Troubleshooting

### "Branch não existe no remoto"
```bash
# Verifique branches disponíveis:
git branch -r | grep claude/

# Use nome exato da branch remota
```

### "Mudanças não comprometidas"
```bash
# Opção 1: Commit
git add .
git commit -m "feat: minhas mudanças"
bash scripts/sync-admin-mobile.sh

# Opção 2: Stash (script pergunta)
bash scripts/sync-admin-mobile.sh
# Digite 's' quando perguntado
```

### "Servidor não reflete mudanças"
```bash
# 1. Confirme sync:
git log -3

# 2. Reinicie servidor:
# Replit: Stop → Run

# 3. Limpe cache navegador:
# Chrome/Edge: Ctrl+Shift+R
# Firefox: Ctrl+F5

# 4. Hard refresh:
# Feche aba, abra nova
```

---

## 📚 Referências

- Git Rebase: https://git-scm.com/docs/git-rebase
- Git Stash: https://git-scm.com/docs/git-stash
- Feature Branch Workflow: https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow

---

## 💡 Dicas

1. **Sempre sincronize** antes de testar no Replit
2. **Commit local** antes de sincronizar (evita stash)
3. **Reinicie servidor** após cada sync
4. **Limpe cache** se CSS/JS não atualizar
5. **Verifique logs** dos últimos commits após sync

---

**Última atualização:** 2026-02-02
**Mantido por:** Claude Code Sessions

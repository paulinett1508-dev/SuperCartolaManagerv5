# 🔄 Workflow: Claude Code Web → GitHub → Replit

## 📖 Visão Geral

Este documento explica como a **SKILL-001: Análise de Branches v2.0** resolve o problema de sincronização entre três ambientes:

1. **Claude Code Web** - Onde o código é escrito e PRs são criados
2. **GitHub** - Repositório central onde PRs são mergeados
3. **Replit** - Onde o sistema roda (DEV + PROD)

## 🎯 Problema Resolvido

### Antes (Sem a Skill)

```
Claude Code Web cria PR #45 → GitHub aceita PR → Replit AINDA NÃO TEM O CÓDIGO ❌
```

**Sintomas:**
- Código no Replit diferente do GitHub
- Features "implementadas" mas não funcionando em produção
- Conflitos de merge não detectados
- Branches antigas ocupando espaço

### Depois (Com a Skill v2.0)

```
Claude Code Web cria PR #45 → GitHub aceita PR → Skill DETECTA e ALERTA ✅
```

**Benefícios:**
- Alerta automático quando Replit está desatualizado
- Lista de PRs mergeados mas não sincronizados
- Comandos prontos para sincronização
- Detecção de conflitos antes de acontecerem

## 🚀 Casos de Uso Práticos

### 1. Iniciar o Dia de Trabalho

**Objetivo:** Garantir que Replit está sincronizado com GitHub antes de começar

```bash
# Verificar sincronização
./quick-start-branches.sh sync
```

**Interpretação do Resultado:**

```
⬆ À FRENTE - Precisa fazer PUSH (2):
  ⬆ main (+2 commits) ← ATUAL
```
➡️ **Ação:** Você tem commits locais que ainda não foram para o GitHub. Fazer `git push origin main`.

```
⚠ ATRASADO - Precisa fazer PULL (1):
  ⬇ main (3 commits atrás) ← ATUAL ⚠️
```
➡️ **Ação URGENTE:** Claude Code Web fez PRs que foram mergeados, mas seu Replit não tem. Fazer `git pull origin main`.

```
✓ Sincronizado (5):
  ✓ main ← ATUAL
```
➡️ **Ação:** Tudo certo! Pode começar a trabalhar.

### 2. Após Aceitar PR no Claude Code Web

**Cenário:** Você acabou de mergear PR #52 no Claude Code Web.

```bash
# Ver PRs recentes e qual branch está associada
./quick-start-branches.sh prs
```

**Saída Esperada:**

```
1. feat/nova-funcionalidade
   PR #52: Implementar sistema de notificações
   ✓ MERGEADO | Criado: 2026-02-04 | Autor: paulinett1508-dev
   Mergeado em: 2026-02-04
   ✓ Branch mergeada
```

**Próximos Passos:**

```bash
# No Replit, atualizar main com o PR mergeado
git checkout main
git pull origin main

# Confirmar que está sincronizado
./quick-start-branches.sh sync
```

### 3. Descobrir O Que Foi Implementado Esta Semana

**Objetivo:** Ver quais PRs foram mergeados nos últimos 7 dias

```bash
# Branches da última semana com PRs
./quick-start-branches.sh semana
```

Ou com mais controle:

```bash
# Data específica com PRs
node scripts/analisar-branches-github.js --desde 2026-02-01 --prs
```

**Saída Mostra:**
- Número do PR (#XX)
- Título da feature
- Data de merge
- Link direto para PR no GitHub
- Status da branch (mergeada ou ativa)

### 4. Antes de Fazer Deploy

**Objetivo:** Garantir que TODAS as mudanças do GitHub estão no Replit

```bash
# Verificar sincronização
./quick-start-branches.sh sync
```

**Checklist Antes de Deploy:**

- [ ] Branch `main` está sincronizada ✓
- [ ] Nenhuma branch divergente ✓
- [ ] Todos os PRs mergeados foram puxados ✓
- [ ] Nenhum alerta crítico ⚠️

**Comandos de Correção:**

```bash
# Se main estiver atrasada
git checkout main
git pull origin main

# Se main estiver divergente (CUIDADO!)
git checkout main
git pull --rebase origin main

# Após correção, confirmar
./quick-start-branches.sh sync
```

### 5. Investigar Branch Órfã

**Cenário:** Há uma branch antiga que não tem PR associado.

```bash
# Ver todas as branches com PRs
node scripts/analisar-branches-github.js --prs
```

**Saída:**

```
15. fix/bug-antigo-123
   Criada em: 2025-12-10 por Miranda
   Funcionalidade: Correção de bug antigo
   ⚪ NÃO IDENTIFICADO
   Não encontrado no BACKLOG
   ⚠ Branch ativa (não mergeada)
   [SEM PR ASSOCIADO]
```

➡️ **Ações Possíveis:**
1. Criar PR no Claude Code Web para essa branch
2. Deletar a branch se não for mais relevante
3. Mergear manualmente se já foi implementado

```bash
# Deletar branch remota órfã
git push origin --delete fix/bug-antigo-123

# Deletar branch local
git branch -D fix/bug-antigo-123
```

### 6. Auditoria de Implementações

**Objetivo:** Gerar relatório do que foi implementado no mês

```bash
# Janeiro de 2026
node scripts/analisar-branches-github.js \
  --desde 2026-01-01 \
  --ate 2026-01-31 \
  --prs \
  --status implementado > relatorio-janeiro-2026.txt
```

**Resultado:** Arquivo com:
- Todas as branches implementadas
- PRs associados com números
- Datas de merge
- Autores
- Funcionalidades inferidas

## 📊 Alertas Críticos e Como Resolver

### 🚨 Alerta: "Branch atual está ATRASADA!"

```
❌ ALERTA CRÍTICO: Branch atual está ATRASADA!
   Faça: git pull origin main
```

**Causa:** Claude Code Web mergeou PRs que você ainda não tem.

**Solução:**

```bash
# Salvar trabalho atual
git stash

# Atualizar
git pull origin main

# Recuperar trabalho
git stash pop
```

### 🚨 Alerta: "Branch atual está DIVERGENTE!"

```
❌ ALERTA CRÍTICO: Branch atual está DIVERGENTE!
   Faça: git pull --rebase origin main
```

**Causa:** Você tem commits locais E há commits novos no GitHub.

**Solução (CUIDADO - pode gerar conflitos):**

```bash
# Opção 1: Rebase (recomendado se poucos commits locais)
git pull --rebase origin main

# Opção 2: Merge (preserva histórico)
git pull origin main

# Se houver conflitos, resolver manualmente
git status  # Ver arquivos em conflito
# ... resolver conflitos ...
git add .
git rebase --continue  # ou git commit (se usou merge)
```

## 🔧 Automação Recomendada

### Criar Alias no Shell

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
# Análise de branches
alias branches-sync="./quick-start-branches.sh sync"
alias branches-prs="./quick-start-branches.sh prs"
alias branches-hoje="./quick-start-branches.sh hoje"
alias branches-semana="./quick-start-branches.sh semana"
```

Uso:

```bash
branches-sync     # Verifica sincronização
branches-prs      # Lista PRs
```

### Cronjob para Alertas Diários (Opcional)

```bash
# Verificar sincronização todo dia às 9h
0 9 * * * cd /home/runner/workspace && ./quick-start-branches.sh sync
```

## 📝 Boas Práticas

### ✅ DO (Faça)

1. **Sempre verificar sincronização** antes de começar o dia
2. **Puxar PRs mergeados** imediatamente após merge no Claude Code Web
3. **Usar `--prs`** quando quiser ver contexto completo
4. **Fazer backup** antes de resolver divergências
5. **Documentar PRs** com títulos descritivos

### ❌ DON'T (Não Faça)

1. **Não ignorar** alertas de branch atrasada
2. **Não fazer deploy** sem verificar sincronização
3. **Não resolver divergências** sem entender os conflitos
4. **Não deletar branches** sem confirmar que foram mergeadas
5. **Não usar `--force push`** a menos que seja absolutamente necessário

## 🎓 Interpretação de Resultados

### Status de Branch

| Status | Significado | Ação Recomendada |
|--------|-------------|------------------|
| ✓ Sincronizado | Branch local = GitHub | Nenhuma |
| ⬆ À FRENTE | Tem commits não enviados | `git push origin <branch>` |
| ⚠ ATRASADO | GitHub tem commits novos | `git pull origin <branch>` |
| ⚠⚠ DIVERGENTE | Ambos têm commits diferentes | `git pull --rebase` (cuidado!) |

### Status de PR

| Status | Significado | Próximo Passo |
|--------|-------------|---------------|
| ✓ MERGEADO | PR foi aceito e mergeado | Fazer `git pull` na branch de destino |
| 🔵 ABERTO | PR aguardando revisão | Revisar no GitHub |
| ✗ FECHADO | PR foi rejeitado | Investigar motivo |
| [SEM PR] | Branch sem PR associado | Criar PR ou deletar branch |

## 🔗 Links Úteis

- **Documentação Completa:** [docs/SKILL-ANALISE-BRANCHES.md](../docs/SKILL-ANALISE-BRANCHES.md)
- **Quick Start:** [ANALISE-BRANCHES-README.md](../ANALISE-BRANCHES-README.md)
- **BACKLOG Entry:** [BACKLOG.md](../BACKLOG.md) - SKILL-001

## 📞 Troubleshooting

### "GITHUB_TOKEN not found"

**Problema:** Variável de ambiente não configurada.

**Solução:**

```bash
# Verificar se existe
echo $GITHUB_TOKEN

# Configurar (Replit Secrets)
# Vá em Secrets no Replit e adicione:
# GITHUB_TOKEN = ghp_seu_token_aqui
```

### "Fatal: ambiguous argument 'origin'"

**Problema:** Remote `origin` não configurado.

**Solução:**

```bash
# Adicionar remote
git remote add origin https://github.com/usuario/repo.git

# Verificar
git remote -v
```

### Skill não encontra PRs mas eles existem

**Problema:** GitHub API pode ter limite de rate.

**Solução:**

```bash
# Verificar se token é válido
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Se limite atingido, esperar 1 hora ou usar token com maior limite
```

---

**Desenvolvido para:** Super Cartola Manager  
**Skill:** SKILL-001 v2.0  
**Data:** 04/02/2026  
**Autor:** Sistema de Análise de Branches

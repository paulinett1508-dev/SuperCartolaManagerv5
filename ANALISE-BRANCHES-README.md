# 🔍 Análise de Branches GitHub - Guia Rápido (v2.0)

## 🚀 NOVO: Integração com Pull Requests e Sincronização

**Versão 2.0** adiciona suporte completo para o workflow **Claude Code Web → GitHub → Replit**:
- 📋 Informações de Pull Requests (número, status, mergeBETON)
- 🔄 Verificação de sincronização local vs. remoto
- ⚠️ Alertas de branches desatualizadas
- 🔗 Links diretos para PRs no GitHub

## ⚡ Uso Rápido (Recomendado)

Use o script quick start para os casos mais comuns:

```bash
# Branches criadas hoje
./quick-start-branches.sh hoje

# Branches da última semana
./quick-start-branches.sh semana

# Branches do mês atual
./quick-start-branches.sh mes

# Branches pendentes (com detalhes)
./quick-start-branches.sh pendentes

# Branches em desenvolvimento
./quick-start-branches.sh ativas

# 🆕 Com informações de Pull Requests
./quick-start-branches.sh prs

# 🆕 Verificar sincronização Replit ↔ GitHub
./quick-start-branches.sh sync

# Apenas estatísticas
./quick-start-branches.sh stats

# Todas as branches com detalhes
./quick-start-branches.sh todas
```

## 📋 Uso Completo

Para controle total sobre os filtros:

```bash
# Sintaxe básica
node scripts/analisar-branches-github.js [opções]

# Exemplos
node scripts/analisar-branches-github.js --desde 2026-01-01 --ate 2026-01-31
node scripts/analisar-branches-github.js --status pendente --detalhes
node scripts/analisar-branches-github.js --prs                    # 🆕 Com PRs
node scripts/analisar-branches-github.js --sync-check             # 🆕 Sincronização
node scripts/analisar-branches-github.js --ajuda
```

## 🆕 Workflow Claude Code Web

A skill agora suporta perfeitamente o workflow de desenvolvimento:

1. **Claude Code Web** cria branches e PRs → Enviado para GitHub
2. **GitHub** armazena o código e PRs → Repositório central
3. **Replit** precisa sincronizar → Esta skill detecta dessincronia

### Verificar Sincronização

```bash
# Verificar se Replit está sincronizado com GitHub
./quick-start-branches.sh sync

# ou
node scripts/analisar-branches-github.js --sync-check
```

**Saída inclui:**
- ✓ Branches sincronizadas
- ⚠️ Branches atrasadas (precisa `git pull`)
- ⬆️ Branches à frente (precisa `git push`)
- ⚠️⚠️ Branches divergentes (conflito potencial)
- 🚨 Alertas críticos se branch atual está desatualizada

### Buscar Pull Requests

```bash
# Incluir informações de PRs
node scripts/analisar-branches-github.js --prs --desde 2026-02-01
```

**Informações de PR incluem:**
- Número do PR (#XX)
- Título e descrição
- Status (Aberto, Mergeado, Fechado)
- Autor e data de criação
- Data de merge (se mergeado)
- Comentários e aprovações
- Link direto para o PR no GitHub

## 🎯 Status Possíveis

- ✅ **100% OPERANTE** - Feature em produção funcionando
- 🟢 **IMPLEMENTADO** - Código mergeado e completo
- 🔵 **EM DESENVOLVIMENTO** - Branch ativa em andamento
- 🟡 **PENDENTE** - Aguardando implementação
- 🔴 **ABORTADO** - Feature cancelada
- ⚪ **NÃO IDENTIFICADO** - Sem informações suficientes

## 📖 Documentação Completa

Veja [docs/SKILL-ANALISE-BRANCHES.md](docs/SKILL-ANALISE-BRANCHES.md) para documentação completa.

## 🔧 Opções Disponíveis

| Opção | Descrição | Exemplo |
|-------|-----------|---------|
| `--desde <data>` | Filtrar branches desde uma data | `--desde 2026-01-01` |
| `--ate <data>` | Filtrar branches até uma data | `--ate 2026-01-31` |
| `--status <tipo>` | Filtrar por status específico | `--status pendente` |
| `--detalhes` | Mostrar commits de cada branch | `--detalhes` |
| `--prs` | 🆕 Buscar info de Pull Requests | `--prs` |
| `--sync-check` | 🆕 Verificar sincronização | `--sync-check` |
| `--ajuda` | Mostrar ajuda completa | `--ajuda` |

## 💡 Dicas

1. **Para sprint planning:** Use `--status pendente` para ver o que está em backlog
2. **Para code review:** Use `--desde [data-semana-passada]` com `--detalhes`
3. **Para release notes:** Use `--desde [inicio-sprint] --ate [fim-sprint]`
4. **Para auditoria:** Use `--detalhes` para ver histórico completo

## 📊 Output

O script exibe:
- Nome da branch e data de criação
- Funcionalidade esperada (inferida automaticamente)
- Status atual (cruzado com BACKLOG.md)
- Se a branch foi mergeada ou está ativa
- Commits recentes (com `--detalhes`)
- Estatísticas gerais ao final

---

**Desenvolvido para:** Super Cartola Manager  
**Versão:** 2.0.0 (PR Integration & Sync Check)  
**Data:** 04/02/2026  
**Workflow:** Claude Code Web → GitHub → Replit

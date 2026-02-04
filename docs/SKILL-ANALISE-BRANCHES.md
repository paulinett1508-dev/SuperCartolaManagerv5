# SKILL: Análise de Branches do GitHub

## 📋 Visão Geral

Script inteligente para análise de branches do repositório GitHub, com cruzamento automático contra o BACKLOG.md para identificar status de implementação, funcionalidades esperadas e histórico de desenvolvimento.

## 🎯 Funcionalidades

### 1. **Listagem de Branches**
- Busca automática de todas as branches remotas
- Informações de data de criação e autor
- Identificação de branches mergeadas vs. ativas

### 2. **Análise de Status**
Cruza informações de múltiplas fontes para determinar o status:
- ✅ **100% OPERANTE** - Feature implementada e em produção
- 🟢 **IMPLEMENTADO** - Código mergeado, funcionalidade completa
- 🔵 **EM DESENVOLVIMENTO** - Branch ativa com desenvolvimento em andamento
- 🟡 **PENDENTE** - Aguardando implementação ou decisão
- 🔴 **ABORTADO** - Feature cancelada
- ⚪ **NÃO IDENTIFICADO** - Sem informações suficientes

### 3. **Inferência de Funcionalidade**
Sistema inteligente que identifica o propósito da branch através de:
- Análise do nome da branch (padrões conhecidos)
- Mensagens de commit
- Cruzamento com BACKLOG.md
- Palavras-chave específicas do domínio

### 4. **Filtros Avançados**
- **Por data:** Intervalo de criação das branches
- **Por status:** Filtrar branches pendentes, implementadas, etc.
- **Com detalhes:** Exibir commits recentes

### 5. **Estatísticas Gerais**
- Total de branches analisadas
- Taxa de conclusão (branches implementadas)
- Distribuição por status
- Branches mergeadas vs. ativas

## 📦 Instalação

O script já está incluído no projeto:
```bash
scripts/analisar-branches-github.js
```

## 🚀 Uso

### Exemplos Básicos

```bash
# Listar todas as branches
node scripts/analisar-branches-github.js

# Ver ajuda completa
node scripts/analisar-branches-github.js --ajuda
```

### Filtros por Data

```bash
# Branches criadas a partir de uma data
node scripts/analisar-branches-github.js --desde 2026-01-01

# Intervalo específico (janeiro de 2026)
node scripts/analisar-branches-github.js --desde 2026-01-01 --ate 2026-01-31

# Branches da última semana (Linux/Mac)
node scripts/analisar-branches-github.js --desde $(date -d '7 days ago' +%Y-%m-%d)

# Branches do mês atual
node scripts/analisar-branches-github.js --desde 2026-02-01
```

### Filtros por Status

```bash
# Apenas branches pendentes
node scripts/analisar-branches-github.js --status pendente

# Branches em desenvolvimento
node scripts/analisar-branches-github.js --status desenvolvimento

# Branches 100% operantes
node scripts/analisar-branches-github.js --status operante

# Branches abortadas
node scripts/analisar-branches-github.js --status abortado
```

### Modo Detalhado

```bash
# Com histórico de commits
node scripts/analisar-branches-github.js --detalhes

# Pendentes com detalhes
node scripts/analisar-branches-github.js --status pendente --detalhes

# Intervalo com detalhes
node scripts/analisar-branches-github.js --desde 2026-01-01 --ate 2026-01-31 --detalhes
```

## 🧠 Lógica de Inferência de Status

### Prioridade de Análise

1. **Branch mergeada + encontrada no BACKLOG**: Usa status do BACKLOG
2. **Branch mergeada + não encontrada**: Assume IMPLEMENTADO
3. **Branch ativa + encontrada no BACKLOG**: Usa status do BACKLOG
4. **Branch ativa + padrão "feat/"**: EM DESENVOLVIMENTO
5. **Branch ativa + padrão "fix/"**: EM DESENVOLVIMENTO
6. **Branch ativa + padrão "wip/"**: PENDENTE
7. **Outros casos**: NÃO IDENTIFICADO

### Padrões de Nome Reconhecidos

O sistema reconhece automaticamente funcionalidades baseadas em:

| Padrão no Nome | Funcionalidade Inferida |
|----------------|-------------------------|
| `admin.*mobile` | Interface mobile para administradores |
| `notifica` | Sistema de notificações |
| `ranking` | Sistema de rankings |
| `mata.*mata` | Sistema de mata-mata |
| `parciais` | Parciais em tempo real |
| `fluxo.*financeiro` | Gestão financeira |
| `cache` | Sistema de cache de dados |
| `auth`, `login` | Autenticação e login |
| `api` | Integração com API externa |
| `inscri` | Sistema de inscrições |
| `temporal` | Gestão de temporadas |

## 📊 Formato de Saída

### Informações por Branch

```
1. nome-da-branch
   Criada em: 2026-01-15 por João Silva
   Funcionalidade: Sistema de notificações push
   ✅ 100% OPERANTE
   Mergeada + confirmado no BACKLOG
   ✓ Branch mergeada
   BACKLOG: [FEAT-003] Notificações Push (Web Push API) 🔔 ✅ IMPLEMENTADO
```

### Estatísticas Finais

```
═══════════════════════════════════════════════════════════════
  ESTATÍSTICAS
═══════════════════════════════════════════════════════════════

Total de branches: 64
✓ Mergeadas: 45
⚠ Ativas: 19

Por status:
  ✅ 100% Operantes: 12
  🟢 Implementadas: 28
  🔵 Em desenvolvimento: 15
  🟡 Pendentes: 3
  🔴 Abortadas: 1
  ⚪ Não identificadas: 5

Taxa de conclusão: 62.5%
```

## 🔧 Requisitos Técnicos

### Dependências
- Node.js 18+ (ESM modules)
- Git configurado no sistema
- Acesso ao repositório remoto (GitHub)
- Token GitHub configurado (variável `GITHUB_TOKEN`)

### Variáveis de Ambiente
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### Arquivos Necessários
- `BACKLOG.md` (opcional, para cruzamento de dados)
- Repositório Git inicializado

## 🎨 Customização

### Adicionar Novos Padrões de Funcionalidade

Edite o array `padroes` no método `inferirFuncionalidadeEsperada()`:

```javascript
const padroes = [
  { regex: /seu-padrao/i, desc: 'Sua descrição' },
  // ... outros padrões
];
```

### Modificar Cores do Terminal

Edite o objeto `cores` no início do arquivo:

```javascript
const cores = {
  reset: '\x1b[0m',
  verde: '\x1b[32m',
  // ... outras cores
};
```

## 📝 Integração com BACKLOG.md

O script busca automaticamente por padrões no BACKLOG.md:

```markdown
- [x] [FEAT-003] **Notificações Push** 🔔 ✅ IMPLEMENTADO
```

### Formato Esperado no BACKLOG

```markdown
- [checkbox] [ID] Título Status
```

Onde:
- `checkbox`: `[x]` ou `[ ]`
- `ID`: `[FEAT-XXX]`, `[BUG-XXX]`, etc.
- `Status`: ✅ OPERANTE, 🟢 IMPLEMENTADO, 🟡 PENDENTE, etc.

## 🐛 Solução de Problemas

### Erro: "No git remote found"
```bash
# Verificar se o repositório está configurado
git remote -v

# Adicionar remote se necessário
git remote add origin https://github.com/usuario/repo.git
```

### Erro: "GITHUB_TOKEN not found"
```bash
# Configurar token no ambiente
export GITHUB_TOKEN=ghp_seu_token_aqui

# Ou adicionar no .env do Replit
```

### Nenhuma branch encontrada
```bash
# Atualizar referências remotas
git fetch --all --prune

# Executar novamente
node scripts/analisar-branches-github.js
```

## 📈 Casos de Uso

### 1. Sprint Planning
Identificar branches pendentes para próxima sprint:
```bash
node scripts/analisar-branches-github.js --status pendente
```

### 2. Code Review
Revisar branches criadas na última semana:
```bash
node scripts/analisar-branches-github.js --desde $(date -d '7 days ago' +%Y-%m-%d) --detalhes
```

### 3. Release Notes
Listar features implementadas em um período:
```bash
node scripts/analisar-branches-github.js --desde 2026-01-01 --ate 2026-01-31 --status implementado
```

### 4. Auditoria de Código
Identificar branches ativas há muito tempo:
```bash
node scripts/analisar-branches-github.js --ate 2025-12-31
```

### 5. Documentação Retroativa
Gerar documentação de features do mês:
```bash
node scripts/analisar-branches-github.js --desde 2026-02-01 --detalhes > docs/features-fev-2026.txt
```

## 🔄 Workflow Recomendado

1. **Início de Sprint:**
   - Listar branches pendentes
   - Identificar work in progress
   - Planejar features da sprint

2. **Durante Development:**
   - Monitorar branches em desenvolvimento
   - Verificar status de implementação

3. **Fim de Sprint:**
   - Gerar estatísticas de conclusão
   - Documentar features implementadas
   - Identificar branches para merge

4. **Release:**
   - Validar taxa de conclusão
   - Confirmar features operantes
   - Gerar release notes

## 📚 Exemplos Avançados

### Combinação de Filtros
```bash
# Branches de janeiro pendentes com commits
node scripts/analisar-branches-github.js \
  --desde 2026-01-01 \
  --ate 2026-01-31 \
  --status pendente \
  --detalhes
```

### Redirect para Arquivo
```bash
# Salvar análise completa
node scripts/analisar-branches-github.js --detalhes > relatorio-branches.txt

# Apenas estatísticas
node scripts/analisar-branches-github.js | tail -20 > stats.txt
```

### Uso em CI/CD
```yaml
# .github/workflows/branch-analysis.yml
name: Branch Analysis
on:
  schedule:
    - cron: '0 9 * * 1'  # Segunda-feira 9h

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: node scripts/analisar-branches-github.js --desde $(date -d '7 days ago' +%Y-%m-%d)
```

## 🤝 Contribuindo

Para adicionar novos padrões de reconhecimento ou melhorias:

1. Edite `scripts/analisar-branches-github.js`
2. Adicione novos padrões em `padroes`
3. Teste com diferentes tipos de branches
4. Documente mudanças neste arquivo

## 📄 Licença

Parte do projeto Super Cartola Manager.

## 🏆 Créditos

Desenvolvido para análise eficiente de desenvolvimento de features no Super Cartola Manager.

---

**Última atualização:** 04/02/2026  
**Versão:** 1.0.0

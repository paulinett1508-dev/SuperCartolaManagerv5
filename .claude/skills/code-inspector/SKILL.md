---
name: code-inspector
description: Especialista em Code Review, Debugging, Análise de Performance e Qualidade de Software. Use quando o usuário pedir para "procurar bugs", "auditar o sistema", "corrigir erros", "melhorar o código", "analisar performance" ou "revisar segurança".
allowed-tools: Read, Grep, LS, Bash, Edit
---

# Code Inspector Skill

## 🎯 Missão
Garantir qualidade, segurança e performance do código através de auditorias sistemáticas e correções cirúrgicas.

---

## 1. 🔍 Protocolo de Auditoria Completa

### Nível 1: Análise Rápida (Quick Scan)
Use para verificações pontuais em 1-3 arquivos:

```bash
# Checklist Mental:
□ Console.logs desnecessários?
□ Try/catch em operações async?
□ Variáveis não utilizadas?
□ Imports órfãos?
```

### Nível 2: Auditoria de Módulo (Deep Dive)
Use para analisar um módulo/feature completo:

| Categoria | O que verificar | Padrão esperado |
|-----------|-----------------|-----------------|
| **Segurança** | SQL/NoSQL Injection, XSS | Sanitização de inputs |
| **Performance** | N+1 queries, loops ineficientes | Bulk operations, índices |
| **Manutenibilidade** | Código duplicado, funções longas | DRY, max 50 linhas/função |
| **Resiliência** | Tratamento de erros | Graceful degradation |

### Nível 3: Auditoria de Sistema (Full Scan)
Use para health check geral do projeto:

```
📊 RELATÓRIO DE AUDITORIA
========================
Data: [timestamp]
Escopo: [arquivos analisados]

🔴 CRÍTICO (bloqueia deploy):
- [lista]

🟡 IMPORTANTE (resolver em 48h):
- [lista]

🟢 SUGESTÕES (nice to have):
- [lista]

📈 MÉTRICAS:
- Cobertura try/catch: X%
- Console.logs encontrados: N
- Funções sem JSDoc: N
- Complexidade ciclomática média: X
```

---

## 2. 🛡️ Checklist de Segurança

### A. Backend (Node.js/Express)
| Check | Regex/Busca | Severidade |
|-------|-------------|------------|
| Segredos hardcoded | `password\s*=\s*['"]`, `apiKey\s*=\s*['"]` | 🔴 CRÍTICO |
| Eval perigoso | `eval\(`, `new Function\(` | 🔴 CRÍTICO |
| Injeção MongoDB | `\$where`, `\$regex` sem sanitização | 🔴 CRÍTICO |
| Headers ausentes | Sem `helmet()` ou headers manuais | 🟡 ALTO |
| Rate limiting | Sem `express-rate-limit` em rotas públicas | 🟡 ALTO |
| CORS permissivo | `origin: '*'` ou `origin: true` | 🟡 ALTO |

### B. Frontend (JavaScript)
| Check | Regex/Busca | Severidade |
|-------|-------------|------------|
| innerHTML com dados | `innerHTML\s*=.*\$\{` | 🔴 CRÍTICO (XSS) |
| localStorage sensível | `localStorage.*token\|password\|secret` | 🟡 ALTO |
| Fetch sem error handling | `fetch\(.*\)(?!.*catch)` | 🟡 MÉDIO |
| Credenciais expostas | `Bearer\s+[A-Za-z0-9]` | 🔴 CRÍTICO |

### C. Específico deste Projeto
| Check | Contexto | Ação |
|-------|----------|------|
| `time_id` vs `timeId` | Collections usam tipos diferentes | Verificar cast correto |
| Liga ID em queries | Multi-tenant obrigatório | Sempre filtrar por `liga_id` |
| Cache invalidation | Dados financeiros | Invalidar após mutações |

---

## 3. ⚡ Checklist de Performance

### A. Backend
```javascript
// 🔴 RUIM: N+1 Query
for (const time of times) {
  const rodadas = await Rodada.find({ time_id: time.time_id });
}

// 🟢 BOM: Bulk Query
const timeIds = times.map(t => t.time_id);
const rodadas = await Rodada.find({ time_id: { $in: timeIds } });
```

| Anti-pattern | Solução | Impacto |
|--------------|---------|---------|
| N+1 Queries | `$in`, `$lookup`, populate | 10x mais rápido |
| Sem índices | Criar índices compostos | 100x em queries grandes |
| Sem paginação | `limit()` + `skip()` | Evita OOM |
| Sem projeção | `.select('campo1 campo2')` | Menos I/O |
| Promise sequencial | `Promise.all()` | Paralelo |

### B. Frontend
| Anti-pattern | Solução | Impacto |
|--------------|---------|---------|
| Render desnecessário | Debounce, throttle | UX fluida |
| DOM manipulation em loop | DocumentFragment | 50x mais rápido |
| Fetch duplicado | Cache local | Menos requests |
| Bundle grande | Code splitting, lazy load | First paint rápido |

---

## 4. 🧹 Checklist de Qualidade de Código

### A. Convenções deste Projeto
| Regra | Padrão | Verificar |
|-------|--------|-----------|
| Logs | `log-manager.js` com prefixo | Não usar `console.log` direto |
| Erros | Retornar objeto com `success: false` | Nunca throw sem catch acima |
| CSS | Variáveis `--laranja`, `--bg-card` | Nada hardcoded |
| Ícones | Material Icons | Nada de emoji |
| Fragmentos HTML | Sem `<html>`, `<head>`, `<body>` | Apenas conteúdo |

### B. Code Smells a Detectar
```
🦨 SMELLS:
├── Funções > 50 linhas
├── Arquivos > 500 linhas
├── Mais de 3 níveis de indentação
├── Comentários tipo "TODO", "FIXME", "HACK"
├── Código comentado (dead code)
├── Magic numbers (usar constantes)
├── Strings repetidas (usar constantes)
└── Callbacks aninhados (callback hell)
```

### C. Padrões de Nomenclatura
| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Arquivo controller | `nomeController.js` | `rodadaController.js` |
| Arquivo model | `PascalCase.js` | `RankingGeralCache.js` |
| Arquivo rota | `nomeRoutes.js` | `ligaRoutes.js` |
| Variável | camelCase | `totalPontos` |
| Constante | UPPER_SNAKE | `MAX_RETRIES` |
| Função | verbo + substantivo | `calcularSaldo()` |

---

## 5. 🔧 Comandos de Diagnóstico

### Busca por Problemas Comuns
```bash
# Console.logs em produção (excluir node_modules)
grep -rn "console.log" --include="*.js" controllers/ routes/ services/

# Segredos hardcoded
grep -rn "password\|apiKey\|secret" --include="*.js" | grep -v "process.env"

# Funções muito longas (mais de 50 linhas entre { e })
# (análise manual recomendada)

# Imports não utilizados
# (usar ESLint ou análise manual)

# Try/catch ausentes em async
grep -rn "async.*=>" --include="*.js" controllers/ | head -20

# TODOs e FIXMEs pendentes
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.js"
```

### Análise de Dependências
```bash
# Pacotes desatualizados
npm outdated

# Vulnerabilidades conhecidas
npm audit

# Dependências não utilizadas
npx depcheck
```

---

## 6. 📋 Templates de Relatório

### Bug Report (ao encontrar bug)
```markdown
## 🐛 Bug Encontrado

**Arquivo:** `path/to/file.js`
**Linha:** 42
**Severidade:** 🔴 Crítica | 🟡 Alta | 🟢 Baixa

### Descrição
[O que está errado]

### Causa Raiz
[Por que acontece]

### Impacto
[O que pode quebrar]

### Correção Proposta
[Código ou descrição da fix]

### Testes Afetados
[Quais testes rodar após fix]
```

### Code Review Summary
```markdown
## 📊 Code Review: [Nome do Módulo]

**Arquivos analisados:** N
**Data:** YYYY-MM-DD

### Resumo Executivo
| Categoria | Score | Detalhes |
|-----------|-------|----------|
| Segurança | ⭐⭐⭐⭐☆ | [nota] |
| Performance | ⭐⭐⭐☆☆ | [nota] |
| Manutenibilidade | ⭐⭐⭐⭐⭐ | [nota] |
| Cobertura de Erros | ⭐⭐⭐☆☆ | [nota] |

### Achados
#### 🔴 Críticos (N)
1. [descrição]

#### 🟡 Importantes (N)
1. [descrição]

#### 🟢 Sugestões (N)
1. [descrição]

### Próximos Passos
- [ ] Fix crítico 1
- [ ] Fix crítico 2
- [ ] Review após fixes
```

---

## 7. 🚀 Workflow de Correção

### Antes de Corrigir
1. **Entender o contexto** - Ler código adjacente
2. **Verificar dependências** - Quem usa este código?
3. **Checar testes** - Existem testes para isso?

### Durante a Correção
1. **Mínima invasão** - Alterar apenas o necessário
2. **Manter estilo** - Seguir convenções do arquivo
3. **Não quebrar** - Cache-First, Navegação v3.0, Multi-tenant

### Após Corrigir
1. **Validar** - Rodar `npm run dev` e testar
2. **Documentar** - Atualizar JSDoc se necessário
3. **Commit message** - `fix(módulo): descrição breve`

---

## 8. 🎯 Atalhos para Auditorias Específicas

### Auditoria Financeira (código)
```bash
# Arquivos relevantes
grep -l "saldo\|financeiro\|pagamento" controllers/*.js
# Verificar: cálculos, arredondamento, tipos de ID
```

### Auditoria de Cache
```bash
# Arquivos de cache
ls -la controllers/*Cache*.js models/*Cache*.js
# Verificar: invalidação, TTL, fallback
```

### Auditoria Multi-tenant
```bash
# Queries sem filtro de liga
grep -rn "find\|findOne\|aggregate" controllers/ | grep -v "liga"
# Verificar: TODAS queries devem filtrar por liga_id
```

### Auditoria de Auth
```bash
# Rotas sem middleware de auth
grep -rn "router\.\(get\|post\|put\|delete\)" routes/ | grep -v "isAuthenticated\|checkToken"
```

---

## 9. 📚 Referência Rápida de Patterns do Projeto

### Controller Pattern (correto)
```javascript
exports.getAlgo = async (req, res) => {
  try {
    const { ligaId } = req.params;
    if (!ligaId) {
      return res.status(400).json({ success: false, error: 'Liga ID obrigatório' });
    }
    
    const dados = await Model.find({ liga_id: ligaId }).lean();
    res.json({ success: true, data: dados });
  } catch (error) {
    console.error('[MODULO] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
};
```

### Frontend Fetch Pattern (correto)
```javascript
async function carregarDados() {
  try {
    showLoading();
    const response = await fetch(`/api/endpoint/${ligaId}`);
    if (!response.ok) throw new Error('Falha na requisição');
    
    const { success, data, error } = await response.json();
    if (!success) throw new Error(error);
    
    renderizar(data);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading();
  }
}
```

---
name: Usage-Report
description: Skill para exibir custo e métricas da sessão ativa do Claude Code. Captura tokens consumidos, custo estimado, duração e turns via /usage. Acionado por "custo", "usage", "quanto gastei", "métricas da sessão". Exibe alertas de custo com thresholds.
---

# 💰 USAGE REPORT PROTOCOL

## 🎯 Objetivo
Capturar e exibir métricas de custo da sessão ativa do Claude Code de forma clara e objetiva.

---

## ⚡ ATIVAÇÃO AUTOMÁTICA

### Comandos que Acionam a Skill

**Termos Diretos:**
- `usage`
- `/usage`
- `custo`
- `cost`

**Frases em Português:**
- "quanto gastei"
- "quanto custou"
- "qual o custo"
- "custo da sessão"
- "métricas da sessão"
- "consumo de tokens"
- "quanto já gastei"
- "mostra o usage"
- "mostra o custo"
- "quanto tá custando"
- "quanto foi"
- "quanto deu"
- "quanto saiu"
- "preço da sessão"
- "tokens consumidos"

**Variações Curtas:**
- "custo?"
- "usage?"
- "quanto?"
- "gastei quanto?"
- "tá caro?"

**Após Tarefas Finalizadas:**
- "pronto, quanto custou?"
- "feito. custo?"
- "terminei, mostra o custo"
- "ok, usage"

**Regex de Detecção:**
```regex
/^(qual\s*o?\s*)?(custo|usage|cost|preço|quanto)\s*(da\s*sessão|gastei|custou|foi|deu|saiu)?/i
/(mostra|exibe|veja|ver)\s*(o\s*)?(custo|usage|consumo|tokens|métricas)/i
/(tá\s*caro|quanto\s*tá)/i
```

---

## 📋 PROTOCOLO DE EXECUÇÃO

### PASSO 1: Capturar Métricas

```bash
# Executar /usage no Claude Code
/usage
```

**Output esperado (formato típico):**
```
Session usage:
  Input tokens:  45,230
  Output tokens: 12,871
  Total cost:    $0.47
  Duration:      23 minutes
  Messages:      14 turns
```

### PASSO 2: Parsear Dados

```bash
# Capturar output com fallback
USAGE=$(claude usage 2>&1 || echo "N/A")

# Extrair métricas
COST=$(echo "$USAGE" | grep -oiE 'cost[:\s]*\$[0-9]+\.?[0-9]*' | grep -oE '\$[0-9.]+' || echo "N/A")
INPUT_TK=$(echo "$USAGE" | grep -oi 'input[^0-9]*[0-9,]*' | grep -oE '[0-9,]+' || echo "N/A")
OUTPUT_TK=$(echo "$USAGE" | grep -oi 'output[^0-9]*[0-9,]*' | grep -oE '[0-9,]+' || echo "N/A")
TOTAL_TK=$(echo "$USAGE" | grep -oi 'total[^c][^0-9]*[0-9,]*' | grep -oE '[0-9,]+' || echo "N/A")
DURATION=$(echo "$USAGE" | grep -oi 'duration[^0-9]*[0-9]*' | grep -oE '[0-9]+' || echo "N/A")
TURNS=$(echo "$USAGE" | grep -oiE '(messages|turns)[^0-9]*[0-9]+' | grep -oE '[0-9]+' || echo "N/A")
```

### PASSO 3: Classificar Custo

```javascript
const thresholds = {
  economica: { max: 0.50, emoji: '🟢', label: 'Sessão econômica' },
  moderada:  { max: 2.00, emoji: '🟡', label: 'Custo moderado' },
  elevada:   { max: 5.00, emoji: '🟠', label: 'Custo elevado — considere limpar contexto' },
  critica:   { max: Infinity, emoji: '🔴', label: 'Custo alto — recomendado encerrar sessão' }
};
```

### PASSO 4: Exibir Report

---

## 📊 FORMATOS DE EXIBIÇÃO

### Exibição Completa (padrão)
```markdown
💰 **CUSTO DA SESSÃO CLAUDE CODE**
┌─────────────────────────────────────┐
│ 📊 Tokens Input:   45,230          │
│ 📊 Tokens Output:  12,871          │
│ 📊 Total Tokens:   58,101          │
│ 💬 Mensagens:      14 turns        │
│ ⏱️  Duração:        23 min          │
│ 💵 Custo Sessão:   $0.47           │
│ 🟢 Sessão econômica                │
└─────────────────────────────────────┘
```

### Exibição Compacta (quando chamado junto de outra tarefa)
```markdown
💰 **Sessão:** $0.47 | 58,101 tokens | 23 min | 14 turns 🟢
```

### Quando /usage Indisponível
```markdown
💰 **Custo:** Execute `/usage` diretamente no terminal do Claude Code para ver métricas.
```

---

## 🚨 ALERTAS DE CUSTO

### Thresholds e Ações

| Faixa | Emoji | Range | Ação |
|-------|-------|-------|------|
| Econômica | 🟢 | $0 - $0.50 | Nenhuma |
| Moderada | 🟡 | $0.51 - $2.00 | Informar |
| Elevada | 🟠 | $2.01 - $5.00 | Sugerir limpar contexto |
| Crítica | 🔴 | > $5.00 | Recomendar nova sessão |

### Exemplos de Alertas

```markdown
# 🟢 Econômica
💰 $0.12 🟢 Sessão econômica

# 🟡 Moderada
💰 $1.45 🟡 Custo moderado — sessão com bastante contexto

# 🟠 Elevada
💰 $3.80 🟠 Custo elevado — considere fechar conversa e abrir nova sessão limpa

# 🔴 Crítica
💰 $7.20 🔴 Custo alto — encerre esta sessão e inicie uma nova para economizar tokens
```

---

## 🔗 INTEGRAÇÃO COM OUTRAS SKILLS

### Com Git-Commit-Push
A skill `Git-Commit-Push` pode chamar este protocolo na FASE 6 para incluir custo no output final do push.

```markdown
# No output do push, adicionar ao final:
@Usage-Report (formato compacto)
```

### Com WORKFLOW (pós-fase)
Ao finalizar qualquer fase do WORKFLOW (Pesquisa, Spec, Code), exibir custo da sessão:

```markdown
# Após conclusão de fase:
✅ FASE [N] concluída!
@Usage-Report (formato compacto)
```

### Chamada Standalone
Pode ser chamado a qualquer momento, sem dependência de outras skills:

```
USUÁRIO: "quanto gastei?"
SKILL: Executa /usage → exibe report completo
```

---

## 🎓 CASOS DE USO

### Caso 1: Consulta Rápida
```
USUÁRIO: "custo?"

RESPOSTA:
💰 **Sessão:** $0.32 | 28,440 tokens | 12 min | 8 turns 🟢
```

### Caso 2: Consulta Detalhada
```
USUÁRIO: "mostra o custo da sessão"

RESPOSTA:
💰 **CUSTO DA SESSÃO CLAUDE CODE**
┌─────────────────────────────────────┐
│ 📊 Tokens Input:   82,100          │
│ 📊 Tokens Output:  24,350          │
│ 📊 Total Tokens:   106,450         │
│ 💬 Mensagens:      22 turns        │
│ ⏱️  Duração:        45 min          │
│ 💵 Custo Sessão:   $1.87           │
│ 🟡 Custo moderado                  │
└─────────────────────────────────────┘
```

### Caso 3: Após Tarefa Longa
```
USUÁRIO: "terminei, quanto deu?"

RESPOSTA:
💰 **CUSTO DA SESSÃO CLAUDE CODE**
┌─────────────────────────────────────┐
│ 📊 Tokens Input:   210,500         │
│ 📊 Tokens Output:  68,200          │
│ 📊 Total Tokens:   278,700         │
│ 💬 Mensagens:      47 turns        │
│ ⏱️  Duração:        1h 32min        │
│ 💵 Custo Sessão:   $4.35           │
│ 🟠 Custo elevado — considere       │
│    limpar contexto                  │
└─────────────────────────────────────┘
```

### Caso 4: Sessão Crítica
```
USUÁRIO: "usage"

RESPOSTA:
💰 **CUSTO DA SESSÃO CLAUDE CODE**
┌─────────────────────────────────────┐
│ 📊 Tokens Input:   520,000         │
│ 📊 Tokens Output:  145,000         │
│ 📊 Total Tokens:   665,000         │
│ 💬 Mensagens:      89 turns        │
│ ⏱️  Duração:        3h 15min        │
│ 💵 Custo Sessão:   $8.92           │
│ 🔴 Custo alto — recomendado        │
│    encerrar e abrir nova sessão     │
└─────────────────────────────────────┘
```

---

## 📐 REGRAS

- **SEMPRE** exibir custo quando solicitado
- **SEMPRE** incluir alerta de threshold
- **NUNCA** inventar valores — só exibir o que /usage retornar
- Se /usage não disponível, informar como obter manualmente
- Formato compacto quando usado junto de outra skill
- Formato completo quando chamado standalone

---

**STATUS:** 💰 USAGE REPORT PROTOCOL - ACTIVE & COST-AWARE

**Versão:** 1.0

**Última atualização:** 2026-02-14

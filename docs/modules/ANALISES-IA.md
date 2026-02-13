# Módulo: Análises IA

**Status:** ✅ Implementado
**Data:** 2026-02-12
**Autor:** Claude
**Versão:** 1.0.0

---

## 📋 Visão Geral

Sistema completo de análises inteligentes para administradores usando a API Claude (Anthropic). Permite solicitar análises especializadas sobre diversos aspectos do sistema: financeiro, performance de participantes, comportamento de ligas, diagnósticos técnicos, etc.

### Objetivo

Fornecer insights acionáveis e automáticos para auxiliar administradores na:
- **Auditoria financeira** - Detectar inconsistências, padrões anormais
- **Análise de performance** - Entender padrões de escalação, pontuação
- **Comportamento da liga** - Métricas de engajamento, churn
- **Diagnóstico de sistema** - Análise de logs, erros, gargalos

---

## 🏗️ Arquitetura

### Backend

```
services/llmService.js              → Service genérico de LLM
models/AnalisesIA.js                → Schema Mongoose (histórico)
middlewares/rateLimitIA.js          → Rate limiting
controllers/iaAnalysisController.js → CRUD de análises
routes/iaAnalysisRoutes.js          → Rotas da API
```

### Frontend

```
public/admin-analises-ia.html                     → Página HTML
public/js/admin/modules/admin-analises-ia.js      → Lógica frontend
```

### Fluxo de Dados

```
Frontend → Controller → Service → API Claude → Resposta
                ↓
          MongoDB (AnalisesIA)
```

---

## 🔑 API Endpoints

### Base URL

`/api/admin/ia-analysis`

### Endpoints Disponíveis

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `GET` | `/rate-limit/status` | Status de rate limits | Admin |
| `POST` | `/solicitar` | Solicitar nova análise | Admin + Rate Limit |
| `GET` | `/historico` | Listar análises anteriores | Admin |
| `GET` | `/:id` | Buscar análise específica | Admin |
| `DELETE` | `/:id` | Deletar análise | Admin (próprio) |
| `POST` | `/:id/avaliar` | Avaliar análise (feedback) | Admin |
| `GET` | `/stats/estatisticas` | Estatísticas de uso | Admin |
| `POST` | `/admin/limpar-cache` | Limpar cache | Super Admin |
| `POST` | `/admin/reset-rate-limits` | Resetar rate limits | Super Admin |

---

## 📊 Tipos de Análise

### 1. Auditoria Financeira (`financeiro-auditoria`)

**Prompt:** Auditor financeiro especializado em fantasy football
**Contexto esperado:**
```json
{
  "dados": { /* extratos, saldos, transações */ },
  "foco": "inconsistências de saldo"
}
```

**Saída:** Markdown estruturado com:
- Inconsistências detectadas
- Padrões anormais
- Recomendações de ajuste

---

### 2. Performance de Participante (`performance-participante`)

**Prompt:** Analista de dados de fantasy football
**Contexto esperado:**
```json
{
  "timeId": "123",
  "nomeTime": "Time do João",
  "dados": { /* pontuações, escalações */ },
  "periodo": "últimas 5 rodadas"
}
```

**Saída:** Insights acionáveis:
- Padrões de escalação
- Comparação com média da liga
- Sugestões de melhoria

---

### 3. Comportamento da Liga (`comportamento-liga`)

**Prompt:** Especialista em análise de engajamento
**Contexto esperado:**
```json
{
  "ligaId": "abc123",
  "nomeLiga": "Liga dos Amigos",
  "dados": { /* atividades, acessos */ },
  "periodo": "último mês"
}
```

**Saída:** Relatório executivo:
- Taxa de engajamento
- Participantes em risco de churn
- Horários de pico

---

### 4. Diagnóstico de Sistema (`diagnostico-sistema`)

**Prompt:** Engenheiro de software especializado em debugging
**Contexto esperado:**
```json
{
  "logs": "...",
  "contextoAdicional": "Erros de timeout na API Cartola"
}
```

**Saída:** Lista priorizada de ações:
- Padrões de falhas
- Gargalos de performance
- Sugestões de otimização

---

### 5. Análise Genérica (`generico`)

**Prompt:** Assistente inteligente genérico
**Contexto esperado:**
```json
{
  "prompt": "Explique o que são módulos no Super Cartola Manager",
  "dados": {}
}
```

**Saída:** Resposta livre

---

## 🛡️ Rate Limiting

### Limites Configurados

| Tipo | Limite | Período | Reset |
|------|--------|---------|-------|
| **Por Admin (Horário)** | 10 análises | 1 hora | Rolling |
| **Por Admin (Diário)** | 100 análises | 24 horas | Meia-noite |
| **Global (Diário)** | 50 análises | 24 horas | Meia-noite |

### Headers de Resposta

```
X-RateLimit-Hourly-Limit: 10
X-RateLimit-Hourly-Remaining: 7
X-RateLimit-Daily-Limit: 100
X-RateLimit-Daily-Remaining: 95
X-RateLimit-Global-Remaining: 45
```

### Erro 429 (Too Many Requests)

```json
{
  "success": false,
  "error": "Limite horário excedido",
  "limite": 10,
  "usado": 10,
  "resetaEm": 1707753600000,
  "tipo": "perAdminPerHour"
}
```

---

## 💾 Schema MongoDB

### Collection: `analisesias`

```javascript
{
  _id: ObjectId,
  tipo: String,              // financeiro-auditoria, performance-participante, etc
  adminEmail: String,        // Admin que solicitou
  contexto: Mixed,           // Contexto sanitizado
  promptEnviado: String,     // Prompt completo (auditoria)
  resposta: String,          // Resposta do Claude
  tokensUsados: {
    input: Number,
    output: Number,
    total: Number
  },
  custoEstimado: Number,     // Em USD
  tempoResposta: Number,     // Em ms
  model: String,             // claude-3-5-sonnet-20241022
  fromCache: Boolean,
  status: String,            // sucesso, erro, timeout
  erro: {
    mensagem: String,
    stack: String
  },
  ligaId: String,
  timeId: String,
  avaliacao: {
    util: Boolean,
    comentario: String,
    avaliadoEm: Date
  },
  criadoEm: Date,
  atualizadoEm: Date
}
```

### Indexes

- `{ adminEmail: 1, criadoEm: -1 }` - Buscar análises de um admin
- `{ tipo: 1, criadoEm: -1 }` - Buscar por tipo
- `{ ligaId: 1, criadoEm: -1 }` - Buscar por liga
- `{ custoEstimado: -1, criadoEm: -1 }` - Análise de custos

---

## 💰 Custos

### Modelo Atual

**Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`)
- **Input:** $3/1M tokens
- **Output:** $15/1M tokens

### Estimativas

| Tipo de Análise | Tokens (avg) | Custo (avg) |
|------------------|--------------|-------------|
| Auditoria Financeira | 5.000 | $0.03 |
| Performance Participante | 3.000 | $0.02 |
| Comportamento Liga | 4.000 | $0.025 |
| Diagnóstico Sistema | 6.000 | $0.04 |
| Genérico | 2.000 | $0.015 |

**Custo mensal estimado:** $5-20 (depende do uso)

---

## 🔒 Segurança

### Sanitização de Dados

Antes de enviar para API Claude, dados sensíveis são **automaticamente removidos**:

```javascript
// Padrões sanitizados:
- Senhas: "senha": "[REDACTED]"
- API Keys: sk-ant-[REDACTED]
- CPF: XXX.XXX.XXX-XX
- Emails: u***@example.com
```

### Autenticação

- **Todas as rotas:** Middleware `isAdminAuthorized`
- **Sessão obrigatória:** `req.session.admin.email`

### Auditoria

- **Todas as análises salvas:** Collection `analisesias`
- **Admin identificado:** Campo `adminEmail`
- **Timestamp completo:** `criadoEm`, `atualizadoEm`

---

## 📦 Cache Inteligente

### Estratégia

- **TTL:** 1 hora (3600s)
- **Key:** MD5 hash de `tipo + JSON.stringify(contexto)`
- **Invalidação:** Manual via `/admin/limpar-cache`

### Benefícios

- **Redução de custos:** Análises idênticas retornam cache
- **Redução de latência:** Resposta instantânea
- **Preservação de rate limits:** Não consome limite

### Estatísticas

```javascript
GET /api/admin/ia-analysis/stats/estatisticas

{
  "cache": {
    "keys": 15,
    "hits": 45,
    "misses": 30,
    "hitRate": 0.6  // 60% de hit rate
  }
}
```

---

## 🖥️ Frontend

### Acesso

**URL:** `/admin-analises-ia.html`

### Funcionalidades

1. **Formulário de Nova Análise**
   - Seleção de tipo
   - Textarea para contexto (JSON ou texto livre)
   - Validação de campos

2. **Rate Limit Info**
   - Exibe limites atuais
   - Alertas visuais quando próximo do limite

3. **Histórico de Análises**
   - Lista últimas 10 análises
   - Exibe resposta formatada
   - Métricas (tokens, custo, tempo)
   - Badge "CACHE" para análises cachadas

### Exemplo de Uso

```javascript
// Frontend: Solicitar análise
fetch('/api/admin/ia-analysis/solicitar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tipo: 'financeiro-auditoria',
    contexto: {
      dados: { /* extratos */ },
      foco: 'saldos negativos'
    },
    useCache: true
  })
})
```

---

## 🚀 Uso Avançado

### Análise Agendada (Futuro)

```javascript
// TODO: Implementar cron job para análises automáticas
// Ex: Auditoria financeira diária às 2h da manhã
```

### Integração com Notificações (Futuro)

```javascript
// TODO: Enviar notificação push quando análise crítica detectar problema
// Ex: Saldo negativo em 5+ participantes
```

### Múltiplos LLMs (Futuro)

```javascript
// TODO: Adicionar suporte a Grok (xAI) e Gemini (Google)
// Ex: Usar Grok para análises mais baratas
```

---

## 🧪 Testes

### Testar Rate Limit

```bash
# Verificar status
curl http://localhost:3000/api/admin/ia-analysis/rate-limit/status \
  -H "Cookie: connect.sid=..."

# Resetar limites (dev)
curl -X POST http://localhost:3000/api/admin/ia-analysis/admin/reset-rate-limits \
  -H "Cookie: connect.sid=..."
```

### Testar Análise

```bash
curl -X POST http://localhost:3000/api/admin/ia-analysis/solicitar \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "tipo": "generico",
    "contexto": {
      "prompt": "Explique o módulo de Pontos Corridos",
      "dados": {}
    }
  }'
```

---

## 🐛 Troubleshooting

### Erro: "ANTHROPIC_API_KEY não configurada"

**Solução:** Adicionar chave no `.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Erro 429: "Limite horário excedido"

**Solução:** Aguardar reset ou usar `/admin/reset-rate-limits` (dev)

### Análise muito lenta (>30s)

**Causas possíveis:**
- Contexto muito grande (>10KB)
- API Claude instável
- Timeout de rede

**Solução:**
- Reduzir tamanho do contexto
- Aumentar timeout no `llmService.js`

### Resposta em branco

**Causas possíveis:**
- Contexto sanitizado removeu dados importantes
- Prompt malformado

**Solução:**
- Verificar logs do backend
- Revisar sanitização de dados

---

## 📚 Referências

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude 3.5 Sonnet Model Card](https://www.anthropic.com/claude/sonnet)
- [Pricing](https://www.anthropic.com/pricing)

---

## 🔄 Roadmap

### v1.1 (Próxima versão)
- [ ] Análises agendadas (cron jobs)
- [ ] Exportar análise como PDF
- [ ] Comparação de análises (diff)
- [ ] Filtros avançados no histórico

### v2.0 (Futuro)
- [ ] Suporte a Grok (xAI) e Gemini
- [ ] Chat interativo (conversa contínua)
- [ ] Análises para participantes (feature separada)
- [ ] Dashboards de insights automáticos

---

**Documentação completa em:** `docs/modules/ANALISES-IA.md`
**Última atualização:** 2026-02-12

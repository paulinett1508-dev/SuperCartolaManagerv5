# Context7 MCP - Configuração de Fontes

Este arquivo define as fontes de documentação prioritárias para o Context7 MCP Server.

## Fontes Configuradas

### 🔴 Prioridade CRÍTICA

#### 1. Cartola FC API (Comunidade)
**Problema:** API completamente não-documentada pela Globo
**Fontes:**
- GitHub: `henriquepgomide/caRtola` (R package com docs da API)
- GitHub: `vitoravelino/cartola-sdk` (Python SDK com endpoints)
- Reddit: r/CartolaFC (discussões sobre mudanças)
- Fóruns: ge.globo.com/cartola-fc

**Uso recomendado:**
```
"Usando Context7, busque informações atualizadas sobre a API do Cartola FC em repositórios comunitários como henriquepgomide/caRtola"
```

---

### 🟠 Prioridade ALTA

#### 2. MongoDB & Mongoose
**Problema:** Mongoose 7.6.1 com padrões deprecated, necessidade de migração
**Fontes:**
- `mongoosejs.com/docs/guide.html` (Mongoose oficial)
- `mongoosejs.com/docs/migrating_to_8.html` (Guia migração v7 → v8)
- `mongodb.com/docs/manual` (MongoDB oficial)

**Uso recomendado:**
```
"Usando Context7, busque os padrões recomendados de schema no Mongoose 8.x para substituir o código deprecated em models/Time.js"
```

---

#### 3. Express.js & Segurança
**Problema:** Express 4.18.4 com configs de segurança custom
**Fontes:**
- `expressjs.com/en/advanced/best-practice-security.html`
- `helmetjs.github.io` (Security headers)
- `owasp.org/www-project-top-ten` (Security checklist)

**Uso recomendado:**
```
"Usando Context7, audite a configuração de segurança do Express em middleware/security.js contra as best practices atuais do helmet.js e OWASP"
```

---

### 🟡 Prioridade MÉDIA

#### 4. PWA & Service Workers
**Problema:** Push notifications planejadas, service worker pode estar desatualizado
**Fontes:**
- `developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API`
- `web.dev/progressive-web-apps`
- `npmjs.com/package/web-push` (Biblioteca para push)

**Uso recomendado:**
```
"Usando Context7, busque exemplos modernos de implementação de Web Push API para PWA, seguindo os padrões atuais do MDN"
```

---

#### 5. Axios & HTTP Clients
**Problema:** Retry logic custom (50+ linhas), existe biblioteca axios-retry
**Fontes:**
- `npmjs.com/package/axios-retry` (Plugin oficial)
- `axios-http.com/docs/interceptors` (Interceptors pattern)

**Uso recomendado:**
```
"Usando Context7, mostre como refatorar a função retryRequest em services/cartolaApiService.js usando axios-retry"
```

---

### 🟢 Prioridade BAIXA

#### 6. Google APIs
**Problema:** googleapis 150.0.1 (manter atualizado)
**Fontes:**
- `developers.google.com/drive/api/v3/reference`
- `npmjs.com/package/googleapis` (Changelog)

**Uso recomendado:**
```
"Usando Context7, verifique se há breaking changes na Google Drive API v3 que afetem uploadToDrive.js"
```

---

## Como Usar Context7 nos Prompts

### Estrutura recomendada:
```
1. "Usando Context7, busque [documentação específica]..."
2. Especifique fonte quando possível: "...da documentação oficial do Mongoose"
3. Contextualize com arquivo do projeto: "...para refatorar models/Rodada.js"
```

### Exemplos práticos:

**Exemplo 1 - Debugging API Cartola:**
```
"Usando Context7, verifique nos repositórios henriquepgomide/caRtola e vitoravelino/cartola-sdk se houve mudanças recentes no endpoint /atletas/mercado. Nosso código em services/cartolaApiService.js está retornando erro 404."
```

**Exemplo 2 - Refatoração Mongoose:**
```
"Usando Context7, busque na documentação oficial do Mongoose 8.x como substituir o uso de Model.collection.dropIndexes() em index.js por um método não-deprecated."
```

**Exemplo 3 - Security Audit:**
```
"Usando Context7, compare nossa configuração de helmet.js em middleware/security.js com as recomendações atuais do OWASP Top 10 e sugira melhorias."
```

---

## Métricas de Sucesso

### Tempo economizado estimado:
- **Cartola API debugging:** 20-30h/ano
- **Framework upgrades:** 15-20h/ano
- **Security audits:** 10-15h/ano
- **New features:** 15-20h/ano

**Total:** **60-85 horas/ano** de economia

### KPIs para medir:
1. Tempo de resolução de bugs de API (baseline: 5h → meta: 2h)
2. Tempo de pesquisa antes de refatorações (baseline: 3h → meta: 1h)
3. Número de bugs em produção por breaking changes (baseline: 2-3/temporada → meta: 0-1)

---

## Quando Consultar Context7

### ✅ USE quando:
- **Antes de cada temporada:** Verificar mudanças na API Cartola
- **Antes de upgrades:** Mongoose, Express, bibliotecas core
- **Security audits mensais:** Validar configs contra OWASP/helmet
- **Implementando features novas:** Push notifications, live scores

### ❌ NÃO USE quando:
- Lógica de negócio interna (regras da liga, cálculos financeiros)
- Decisões de arquitetura específicas do projeto
- Debug de código custom sem relação com APIs externas

---

## Troubleshooting

### Context7 não encontra documentação:
1. Verifique se a fonte está acessível (GitHub público, docs não paywalled)
2. Tente reformular o prompt com termos mais específicos
3. Especifique versão exata: "Mongoose 8.x" em vez de só "Mongoose"

### Documentação retornada está desatualizada:
1. Force atualização especificando: "documentação mais recente de 2025-2026"
2. Prefira fontes oficiais (mongoosejs.com) a tutoriais de terceiros
3. Cross-reference com npm para verificar versão atual da lib

---

**Última atualização:** 2026-01-01  
**Mantido por:** Super Cartola Team  
**Revisão necessária:** A cada 6 meses ou antes de cada temporada

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

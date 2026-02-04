# PRD - Bug: Extrato 2025 Zerado Após Renovação

**Data:** 2026-01-17
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Criticidade:** ALTA - Afeta dados financeiros de participantes

---

## Resumo Executivo

Ao executar uma renovação de participante para 2026 via modal unificado, o extrato financeiro de 2025 aparece zerado na tabela do Fluxo Financeiro. O bug é causado por uma inconsistência de tipo no campo `liga_id`: o código de quitação usa `ObjectId` enquanto os documentos originais armazenam `liga_id` como `String`. Isso faz com que o `upsert: true` crie documentos duplicados vazios ao invés de atualizar o existente.

---

## Contexto e Análise

### Evidência do Bug no Banco

**Documentos duplicados encontrados para time_id 1097804 (temporada 2025):**

| Campo | Documento Original | Documento Duplicado (BUG) |
|-------|-------------------|---------------------------|
| `_id` | `695714c94829f616a0c31ec8` | `696ae5c20f0a96d6931a10d3` |
| `liga_id` | `"684cb1c8..."` (String) | `ObjectId("684cb1c8...")` |
| `saldo_consolidado` | 166 | **undefined** |
| `historico_transacoes` | 38 rodadas | **0 (vazio)** |
| `quitacao` | undefined | `{quitado: true, ...}` |

**Estatísticas do banco:**
- 45 documentos com `liga_id` String
- 1 documento com `liga_id` ObjectId (o duplicado)

### Fluxo do Bug

```
1. Admin clica "Renovar" no modal unificado
2. processarDecisaoUnificada() é chamado
3. Linha 917: updateOne com liga_id: ObjectId + upsert: true
4. Documento original tem liga_id: String → NÃO ENCONTRADO
5. upsert CRIA documento vazio com apenas {quitacao}
6. tesouraria-routes busca com $or (String OU ObjectId)
7. Retorna AMBOS documentos
8. Map sobrescreve: extratoMap.set(String(time_id), e)
9. Se vazio vem por último → dados zerados na UI
```

### Módulos Identificados

**Backend:**
- `controllers/inscricoesController.js` - **CAUSA RAIZ** (linha 917)
  - Função `processarDecisaoUnificada()` usa `liga_id: ObjectId` no updateOne
  - `upsert: true` cria documento se não encontrar

- `routes/tesouraria-routes.js` - **AFETADO**
  - Query usa `$or` para buscar String OU ObjectId
  - Pode retornar documentos duplicados
  - Map com key simples (time_id) pode sobrescrever dados válidos

**Frontend:**
- `public/js/renovacao/renovacao-core.js` - Dispara a renovação
- `public/js/fluxo-financeiro/fluxo-financeiro-core.js` - Exibe tabela

### Dependências Mapeadas

```
renovacao-core.js
    └── POST /api/inscricoes/liga/:ligaId/processar-decisao
        └── inscricoesController.processarDecisaoUnificada()
            └── extratofinanceirocaches.updateOne (BUG: liga_id ObjectId)

fluxo-financeiro-core.js
    └── GET /api/tesouraria/liga/:ligaId
        └── tesouraria-routes (linha 503-510)
            └── extratofinanceirocaches.find (retorna duplicados)
```

### Padrões Existentes

O código de `tesouraria-routes.js` já implementa a solução correta usando `$or`:

```javascript
// tesouraria-routes.js (linha 503-510) - CORRETO
$or: [
    { liga_id: ligaIdStr },
    { liga_id: new mongoose.Types.ObjectId(ligaId) }
]
```

---

## Solução Proposta

### Abordagem: Correção Cirúrgica + Limpeza

**1. Correção no inscricoesController.js (PRINCIPAL)**

Modificar a query do updateOne para usar `$or` igual ao tesouraria-routes:

```javascript
// ANTES (linha 917-937):
await db.collection('extratofinanceirocaches').updateOne(
    {
        liga_id: ligaObjId,  // ❌ Só ObjectId
        time_id: Number(timeId),
        temporada: Number(temporadaAnterior)
    },
    { $set: { quitacao: {...} } },
    { upsert: true }
);

// DEPOIS:
await db.collection('extratofinanceirocaches').updateOne(
    {
        $or: [
            { liga_id: String(ligaId) },
            { liga_id: ligaObjId }
        ],
        time_id: Number(timeId),
        temporada: Number(temporadaAnterior)
    },
    { $set: { quitacao: {...} } },
    { upsert: false }  // ❌ REMOVER UPSERT - documento deve existir
);
```

**2. Script de Limpeza de Duplicados**

Criar script `scripts/fix-extrato-duplicados-liga-id.js`:
- Identificar documentos duplicados (mesmo time_id + temporada)
- Manter o documento com dados (historico_transacoes > 0)
- Migrar campo `quitacao` se necessário
- Remover documento vazio

**3. Normalização de liga_id (OPCIONAL - Futuro)**

Considerar normalizar todos `liga_id` para String para consistência.

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `controllers/inscricoesController.js` | Corrigir query linha 917 para usar `$or` e remover `upsert` |

### Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `scripts/fix-extrato-duplicados-liga-id.js` | Limpar documentos duplicados existentes |

---

## Regras de Negócio

- **Regra 1:** Cada participante deve ter NO MÁXIMO um documento de extrato por temporada
- **Regra 2:** A quitação deve ATUALIZAR o documento existente, nunca criar novo
- **Regra 3:** O campo `liga_id` pode ser String ou ObjectId (legado), queries devem tratar ambos

---

## Riscos e Considerações

### Impactos Previstos

| Tipo | Descrição |
|------|-----------|
| **Positivo** | Dados financeiros exibidos corretamente |
| **Positivo** | Elimina duplicação de documentos |
| **Atenção** | Script de limpeza deve rodar em dry-run primeiro |
| **Risco** | Se `upsert: false` e documento não existir, quitação não é salva (cenário improvável) |

### Multi-Tenant

- [x] Bug afeta apenas uma liga específica (684cb1c8af923da7c7df51de)
- [x] Correção é genérica e aplicável a todas as ligas
- [x] Script de limpeza deve filtrar por liga_id para segurança

---

## Testes Necessários

### Cenários de Teste

1. **Renovar participante com extrato existente (liga_id String)**
   - Esperado: quitação adicionada ao documento existente
   - Verificar: Não cria documento duplicado

2. **Visualizar temporada 2025 após renovação para 2026**
   - Esperado: Dados financeiros preservados (saldo, histórico)
   - Verificar: Colunas da tabela não zeradas

3. **Executar script de limpeza em dry-run**
   - Esperado: Lista documentos duplicados a serem removidos
   - Verificar: Documento com dados será mantido

4. **Edge case: Quitação sem extrato existente**
   - Esperado: Log de aviso (documento não encontrado)
   - Verificar: Não cria documento vazio

---

## Dados Afetados

**Participante identificado com bug:**
- `time_id`: 1097804
- `temporada`: 2025
- `saldo_original`: R$ 166,00 (credor)
- `saldo_exibido`: R$ 0,00 (INCORRETO)

**Ação necessária:** Executar script de limpeza para remover documento duplicado.

---

## Próximos Passos

1. **Validar PRD** - Confirmar entendimento do problema
2. **Gerar Spec:** Executar `/spec PRD-extrato-2025-zerado-renovacao.md`
3. **Implementar:** Executar `/code SPEC-extrato-2025-zerado-renovacao.md`

---

## Comandos para Debug

```bash
# Verificar duplicados no banco
node -e "
const { MongoClient } = require('mongodb');
async function check() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();
    const dups = await db.collection('extratofinanceirocaches').aggregate([
        { \$group: { _id: { time_id: '\$time_id', temporada: '\$temporada' }, count: { \$sum: 1 } } },
        { \$match: { count: { \$gt: 1 } } }
    ]).toArray();
    console.log('Duplicados:', dups);
    await client.close();
}
check();
"

# Verificar tipos de liga_id
node -e "
const { MongoClient } = require('mongodb');
async function check() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();
    const tipos = await db.collection('extratofinanceirocaches').aggregate([
        { \$project: { tipo: { \$type: '\$liga_id' } } },
        { \$group: { _id: '\$tipo', count: { \$sum: 1 } } }
    ]).toArray();
    console.log('Tipos de liga_id:', tipos);
    await client.close();
}
check();
"
```

---

**Gerado por:** Pesquisa Protocol v1.0
**Tempo de investigação:** ~15 minutos
**Confiança na causa raiz:** 100% (confirmado com evidência no banco)

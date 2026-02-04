# AUDIT RULE: Financial (Financeiro)

## 🎯 Objetivo
Garantir que módulos com operações financeiras sigam os princípios de **idempotência**, **auditabilidade** e **integridade de dados**.

---

## ✅ Checklist de Auditoria

### 1. **Idempotência**
- [ ] Transações usam identificadores únicos (`chaveIdempotencia`)
- [ ] Operações financeiras previnem cobrança duplicada
- [ ] Usa `findOneAndUpdate` com `upsert` quando aplicável
- [ ] Valida se transação já existe antes de criar

**Exemplo correto:**
```javascript
const chaveIdempotencia = `${tipo}-${timeId}-${temporada}-${identificador}`;
const existente = await ExtratoFinanceiro.findOne({ chaveIdempotencia });
if (existente) {
    return { ja_existe: true };
}
```

---

### 2. **Registro no Extrato**
- [ ] Toda transação financeira gera entrada em `extratofinanceiro`
- [ ] Campos obrigatórios preenchidos: `tipo`, `valor`, `descricao`, `temporada`, `timeId`
- [ ] Campo `chaveIdempotencia` presente e único
- [ ] Data registrada (`data` ou `timestamp`)

**Campos críticos:**
```javascript
{
    tipo: 'debito' | 'credito',
    valor: Number,
    descricao: String,
    temporada: Number,
    timeId: String | Number,
    chaveIdempotencia: String,
    data: Date
}
```

---

### 3. **Validação de Sessão**
- [ ] Valida `req.session.usuario` antes de operações sensíveis
- [ ] Verifica autorização admin quando necessário (`isAdminAuthorizado`)
- [ ] Previne manipulação de dados de outros usuários

**Exemplo correto:**
```javascript
if (!req.session.usuario) {
    return res.status(401).json({ erro: 'Não autorizado' });
}

// Para admin
if (!isAdminAutorizado(req.session.usuario.email)) {
    return res.status(403).json({ erro: 'Acesso negado' });
}
```

---

### 4. **Operações Atômicas**
- [ ] Usa MongoDB atomic operations (`$inc`, `$set`, `$push`)
- [ ] Evita race conditions (read-modify-write)
- [ ] Considera usar transactions para múltiplas operações

**Exemplo correto:**
```javascript
// ❌ Evitar (race condition)
const saldo = await calcularSaldo(timeId);
await salvarSaldo(timeId, saldo + valor);

// ✅ Correto (atômico)
await ExtratoCache.findOneAndUpdate(
    { timeId, temporada },
    { $inc: { saldo: valor } },
    { upsert: true }
);
```

---

### 5. **Auditoria "Follow the Money"**
- [ ] Transações têm rastreabilidade (origem/destino)
- [ ] Logs adequados para operações financeiras críticas
- [ ] Campo `metadata` ou `detalhes` com contexto adicional

**Exemplo:**
```javascript
{
    tipo: 'debito',
    valor: 10,
    descricao: 'Aposta Artilheiro - Cristiano Ronaldo',
    metadata: {
        modulo: 'artilheiro',
        jogador_id: 12345,
        rodada: 15
    }
}
```

---

### 6. **Separação por Temporada**
- [ ] Extratos separados por temporada (campo `temporada`)
- [ ] Não mistura saldos de temporadas diferentes
- [ ] Sistema de "legado" implementado corretamente

---

### 7. **Tratamento de Erros**
- [ ] `try/catch` em todas funções async
- [ ] Rollback em caso de falha (quando aplicável)
- [ ] Mensagens de erro claras para o usuário

**Exemplo:**
```javascript
try {
    await ExtratoFinanceiro.create({ ... });
} catch (erro) {
    console.error('Erro ao criar extrato:', erro);
    return res.status(500).json({
        erro: 'Falha ao processar transação',
        detalhes: process.env.NODE_ENV === 'development' ? erro.message : undefined
    });
}
```

---

### 8. **Tipos de ID Consistentes**
- [ ] Respeita tipo de ID por collection (ver CLAUDE.md)
- [ ] `extratofinanceirocaches`: `time_id` (Number)
- [ ] `fluxofinanceirocampos`: `timeId` (String)
- [ ] `acertofinanceiros`: `timeId` (String)

---

### 9. **Flag `pagouInscricao`**
- [ ] Inscrições de temporada usam flag corretamente
- [ ] `true` = taxa registrada (não vira débito)
- [ ] `false` = taxa vira débito no extrato
- [ ] Integração com `inscricoestemporada` collection

---

### 10. **Cache Financeiro**
- [ ] Usa `extratofinanceirocaches` para performance
- [ ] Cache invalidado após transações
- [ ] Recálculo via endpoint `/api/extrato-financeiro/recalcular-cache`

---

## 🚨 Red Flags Críticos

| Problema | Severidade | Ação |
|----------|-----------|------|
| Sem `chaveIdempotencia` | 🔴 CRÍTICO | Implementar imediatamente |
| Operações não atômicas | 🔴 CRÍTICO | Refatorar para atomic ops |
| Sem validação de sessão | 🔴 CRÍTICO | Adicionar autorização |
| Extrato sem temporada | 🟠 ALTO | Adicionar campo |
| Sem try/catch | 🟠 ALTO | Adicionar error handling |
| Cache desatualizado | 🟡 MÉDIO | Invalidar após transações |

---

## 📊 Exemplos de Uso

### ✅ Exemplo Completo (Aposta Artilheiro)
```javascript
async function criarAposta(req, res) {
    try {
        // 1. Validar sessão
        if (!req.session.usuario) {
            return res.status(401).json({ erro: 'Não autorizado' });
        }

        const { timeId, jogadorId, temporada, valor } = req.body;

        // 2. Chave de idempotência
        const chaveIdempotencia = `aposta-artilheiro-${timeId}-${temporada}-${jogadorId}`;

        // 3. Verificar duplicata
        const existente = await ExtratoFinanceiro.findOne({ chaveIdempotencia });
        if (existente) {
            return res.status(409).json({ erro: 'Aposta já realizada' });
        }

        // 4. Registrar no extrato (operação atômica)
        await ExtratoFinanceiro.create({
            tipo: 'debito',
            valor: valor,
            descricao: `Aposta Artilheiro - Jogador ${jogadorId}`,
            temporada: temporada,
            timeId: timeId,
            chaveIdempotencia: chaveIdempotencia,
            data: new Date(),
            metadata: {
                modulo: 'artilheiro',
                jogador_id: jogadorId
            }
        });

        // 5. Invalidar cache
        await invalidarCacheFinanceiro(timeId, temporada);

        res.json({ sucesso: true });

    } catch (erro) {
        console.error('Erro ao criar aposta:', erro);
        res.status(500).json({ erro: 'Falha ao processar aposta' });
    }
}
```

---

## 🔗 Referências
- `CLAUDE.md` → Seção "Coding Standards" e "Estrutura de Dados"
- `docs/SISTEMA-RENOVACAO-TEMPORADA.md` → Flags e terminologia
- `controllers/extrato-financeiro-controller.js` → Implementação de referência

---

**Última atualização:** 04/02/2026
**Versão:** 1.0.0

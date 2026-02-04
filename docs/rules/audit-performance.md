# AUDIT RULE: Performance (Otimização)

## 🎯 Objetivo
Garantir que módulos sejam **eficientes**, **escaláveis** e não causem **lentidão** ou **timeouts** em produção.

---

## ✅ Checklist de Auditoria

### 1. **Queries MongoDB Otimizadas**

#### Índices
- [ ] Collections têm índices nos campos mais consultados
- [ ] Queries complexas usam índices compostos
- [ ] `explain()` executado para validar uso de índice

**Verificar índices:**
```javascript
db.extratofinanceiro.getIndexes()
```

**Criar índices:**
```javascript
// Índice simples
db.extratofinanceiro.createIndex({ temporada: 1 })

// Índice composto
db.extratofinanceiro.createIndex({ timeId: 1, temporada: -1 })

// Índice único (idempotência)
db.extratofinanceiro.createIndex({ chaveIdempotencia: 1 }, { unique: true })
```

#### Projeção de Campos
- [ ] Usa `.select()` para buscar apenas campos necessários
- [ ] Evita carregar documentos completos desnecessariamente

**❌ INEFICIENTE:**
```javascript
const participantes = await Time.find({ ligaId }); // carrega tudo
```

**✅ OTIMIZADO:**
```javascript
const participantes = await Time.find({ ligaId })
    .select('nome_time escudo_id pontos') // apenas campos necessários
    .lean(); // retorna POJO (não Mongoose document)
```

#### Paginação
- [ ] Listas longas usam paginação (`.skip()` + `.limit()`)
- [ ] Limite máximo por página (ex: 50 itens)
- [ ] Cursor-based pagination para grandes volumes

**Exemplo:**
```javascript
const page = parseInt(req.query.page) || 1;
const limit = 50;
const skip = (page - 1) * limit;

const resultados = await Documento.find(query)
    .skip(skip)
    .limit(limit);
```

---

### 2. **Cache Estratégico**

#### Quando Cachear
- [ ] Dados que mudam pouco (config de liga, regras)
- [ ] Cálculos pesados (saldo financeiro, rankings)
- [ ] Respostas de APIs externas (Cartola API)

**Exemplo (Redis ou in-memory):**
```javascript
const cacheKey = `saldo-${timeId}-${temporada}`;
let saldo = cache.get(cacheKey);

if (!saldo) {
    saldo = await calcularSaldoCompleto(timeId, temporada);
    cache.set(cacheKey, saldo, 3600); // 1 hora
}
```

#### Invalidação de Cache
- [ ] Cache invalidado após updates relevantes
- [ ] TTL (Time To Live) configurado adequadamente
- [ ] Evita cache stale crítico

**Exemplo:**
```javascript
async function criarTransacao(dados) {
    await ExtratoFinanceiro.create(dados);

    // Invalidar cache
    const cacheKey = `saldo-${dados.timeId}-${dados.temporada}`;
    cache.del(cacheKey);
}
```

#### Cache Collections
- [ ] `extratofinanceirocaches` usado corretamente
- [ ] Endpoint `/recalcular-cache` disponível
- [ ] Cache atualizado após mudanças financeiras

---

### 3. **Queries N+1 (Evitar)**

#### Problema
Executar query dentro de loop → N queries adicionais.

**❌ N+1 PROBLEM:**
```javascript
const apostas = await Aposta.find({ temporada });
for (const aposta of apostas) {
    // QUERY DENTRO DO LOOP!
    const time = await Time.findOne({ id: aposta.timeId });
    aposta.nomeTime = time.nome_time;
}
```

**✅ SOLUÇÃO (bulk fetch):**
```javascript
const apostas = await Aposta.find({ temporada });
const timeIds = apostas.map(a => a.timeId);

// UMA query para todos times
const times = await Time.find({ id: { $in: timeIds } });
const timesMap = new Map(times.map(t => [t.id, t]));

apostas.forEach(aposta => {
    aposta.nomeTime = timesMap.get(aposta.timeId)?.nome_time;
});
```

---

### 4. **Frontend: Lazy Loading**

#### Carregamento Sob Demanda
- [ ] Imagens usam `loading="lazy"`
- [ ] Listas longas renderizam virtualizadas
- [ ] JS/CSS carregados assincronamente quando possível

**HTML:**
```html
<img src="/escudos/262.png" loading="lazy" alt="Flamengo">
```

**JavaScript (Intersection Observer):**
```javascript
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.src = entry.target.dataset.src;
            observer.unobserve(entry.target);
        }
    });
});

document.querySelectorAll('img[data-src]').forEach(img => {
    observer.observe(img);
});
```

---

### 5. **Reduzir Payload (Response Size)**

#### Apenas Dados Necessários
- [ ] API retorna apenas campos usados pelo frontend
- [ ] Remove metadados desnecessários (`__v`, `_id` interno)
- [ ] Compressão gzip ativada no servidor

**Exemplo:**
```javascript
const participantes = await Time.find({ ligaId })
    .select('nome_time pontos escudo_id') // só o necessário
    .lean(); // remove metadados Mongoose

res.json(participantes); // payload menor
```

---

### 6. **Debounce/Throttle em Inputs**

#### Busca em Tempo Real
- [ ] Inputs de busca usam debounce (espera digitação terminar)
- [ ] Scroll infinito usa throttle (limita chamadas)

**Exemplo (debounce):**
```javascript
let timeoutId;
const inputBusca = document.getElementById('busca');

inputBusca.addEventListener('input', (e) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        buscarJogadores(e.target.value);
    }, 300); // aguarda 300ms após última tecla
});
```

---

### 7. **Agregações MongoDB**

#### Pipeline Aggregation
- [ ] Usa `.aggregate()` para cálculos complexos no banco
- [ ] Evita trazer dados para JS e processar lá

**Exemplo (saldo por temporada):**
```javascript
const saldos = await ExtratoFinanceiro.aggregate([
    { $match: { timeId: '123', temporada: 2026 } },
    {
        $group: {
            _id: '$tipo',
            total: { $sum: '$valor' }
        }
    }
]);

const creditos = saldos.find(s => s._id === 'credito')?.total || 0;
const debitos = saldos.find(s => s._id === 'debito')?.total || 0;
const saldo = creditos - debitos;
```

---

### 8. **Async/Await Paralelo**

#### Requisições Independentes
- [ ] Usa `Promise.all()` para requests paralelos
- [ ] Evita `await` sequencial desnecessário

**❌ LENTO (sequencial):**
```javascript
const liga = await Liga.findOne({ _id: ligaId });
const config = await ModuleConfig.findOne({ modulo: 'top10' });
const participantes = await Time.find({ ligaId });
// Total: tempo1 + tempo2 + tempo3
```

**✅ RÁPIDO (paralelo):**
```javascript
const [liga, config, participantes] = await Promise.all([
    Liga.findOne({ _id: ligaId }),
    ModuleConfig.findOne({ modulo: 'top10' }),
    Time.find({ ligaId })
]);
// Total: max(tempo1, tempo2, tempo3)
```

---

### 9. **Timeouts e Limites**

#### Proteção contra Travamentos
- [ ] Queries têm timeout configurado (ex: 10s)
- [ ] Limita tamanho de arrays retornados (ex: máx 1000 itens)
- [ ] API externa tem retry com backoff

**Mongoose timeout:**
```javascript
const resultado = await Documento.find(query)
    .maxTimeMS(10000); // 10 segundos
```

**Retry com backoff:**
```javascript
async function fetchComRetry(url, tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
        try {
            return await fetch(url);
        } catch (erro) {
            if (i === tentativas - 1) throw erro;
            await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
        }
    }
}
```

---

### 10. **Monitoramento de Performance**

#### Métricas
- [ ] Tempo de resposta dos endpoints logado
- [ ] Queries lentas identificadas (MongoDB slow query log)
- [ ] Memory leaks detectados (heap snapshots)

**Exemplo (tempo de resposta):**
```javascript
router.get('/api/top10', async (req, res) => {
    const inicio = Date.now();

    try {
        const resultado = await buscarTop10();
        res.json(resultado);
    } finally {
        const duracao = Date.now() - inicio;
        if (duracao > 1000) {
            console.warn(`⚠️ Endpoint lento: /api/top10 levou ${duracao}ms`);
        }
    }
});
```

---

## 🚨 Red Flags Críticos

| Problema | Severidade | Impacto | Ação |
|----------|-----------|---------|------|
| Query sem índice (full scan) | 🔴 CRÍTICO | Lentidão severa | Criar índice |
| N+1 queries em loop | 🔴 CRÍTICO | Timeout em prod | Bulk fetch |
| Sem paginação (retorna 10k+ docs) | 🔴 CRÍTICO | Memory overflow | Adicionar paginação |
| Await sequencial de requests independentes | 🟠 ALTO | Latência 3x maior | Usar Promise.all |
| Cache nunca invalidado | 🟠 ALTO | Dados stale | Implementar invalidação |
| Sem debounce em busca | 🟡 MÉDIO | Requests excessivos | Adicionar debounce |
| Response com campos não usados | 🟡 MÉDIO | Payload inchado | Usar .select() |

---

## 📊 Benchmark de Referência

### Tempos Aceitáveis (95th percentile)

| Operação | Target | Limite |
|----------|--------|--------|
| Query simples (indexed) | < 50ms | 200ms |
| Cálculo financeiro (cached) | < 100ms | 500ms |
| Endpoint API | < 500ms | 2s |
| Rendering de página | < 1s | 3s |
| Busca com agregação | < 1s | 5s |

---

## 🔗 Ferramentas de Análise

### MongoDB
```javascript
// Analisar query
db.extratofinanceiro.find({ timeId: '123' }).explain('executionStats')

// Índices sugeridos
db.extratofinanceiro.aggregate([{ $indexStats: {} }])

// Queries lentas
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

### Node.js
```bash
# Memory leaks
node --inspect server.js
# Abrir chrome://inspect

# CPU profiling
node --prof server.js
node --prof-process isolate-*.log > profile.txt
```

---

## 📚 Exemplo Completo (Endpoint Otimizado)

```javascript
router.get('/api/top10/:temporada/:rodada', async (req, res) => {
    const inicio = Date.now();

    try {
        const { temporada, rodada } = req.params;
        const ligaId = req.session.usuario.ligaId;

        // 1. Cache (validar antes de queries pesadas)
        const cacheKey = `top10-${ligaId}-${temporada}-${rodada}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        // 2. Queries paralelas (Promise.all)
        const [participantes, pontuacoes] = await Promise.all([
            Time.find({ ligaId, temporada: parseInt(temporada), ativo: true })
                .select('id nome_time escudo_id') // apenas campos necessários
                .lean(), // POJO (mais rápido)

            Pontuacao.find({
                temporada: parseInt(temporada),
                rodada: parseInt(rodada)
            })
            .select('time_id pontos')
            .sort({ pontos: -1 })
            .limit(10) // paginação
            .lean()
        ]);

        // 3. Join em memória (evitar N+1)
        const timesMap = new Map(participantes.map(t => [t.id, t]));

        const top10 = pontuacoes.map((p, idx) => ({
            posicao: idx + 1,
            time: timesMap.get(p.time_id)?.nome_time,
            pontos: p.pontos,
            escudo: timesMap.get(p.time_id)?.escudo_id
        }));

        // 4. Cachear resultado (TTL 1 hora)
        cache.set(cacheKey, top10, 3600);

        res.json(top10);

    } catch (erro) {
        console.error('Erro ao buscar Top 10:', erro);
        res.status(500).json({ erro: 'Falha ao carregar ranking' });
    } finally {
        const duracao = Date.now() - inicio;
        if (duracao > 1000) {
            console.warn(`⚠️ /api/top10 demorou ${duracao}ms`);
        }
    }
});
```

---

**Última atualização:** 04/02/2026
**Versão:** 1.0.0

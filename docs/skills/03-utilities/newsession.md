# Skill: newsession

Handover para nova sessao - carrega contexto do trabalho em andamento e instrui proximos passos.

---

## STATUS ATUAL: ✅ Bug Critico CORRIGIDO + 🧪 Aguardando Validacao Manual

**Data:** 07/02/2026
**Ultima acao:** Correcao de bug secundario em isModuloHabilitado() + criacao de ferramentas de validacao
**Arquivos modificados:**
- `controllers/fluxoFinanceiroController.js` → v8.9.1 (fix config conflict + auto-healing)
- `scripts/fix-extrato-pc-mm-top10-integration-2026.js` → v1.0.0 (migracao CLI)
- `routes/admin/migracao.js` → v1.0.0 (migracao HTTP endpoint)
- `test-paulinett-fix.js` → v1.0.0 (teste manual)

---

## BUG CRITICO PARA PROXIMA SESSAO

### Pontos Corridos NAO propaga valores para o Extrato Financeiro

**Severidade:** ALTA - Afeta TODOS os participantes de TODAS as ligas
**Descoberto em:** Auditoria do extrato Paulinett Miranda (time_id: 13935277)

**Evidencia concreta (Liga Super Cartola 2026):**

| Dado | Valor |
|------|-------|
| PC Rodada 1 (R2 Brasileirao) | Paulinett (49.3) vs Raimundo Pinheiro (85.3) = DERROTA = **-R$5** |
| Extrato R2 campo `pontosCorridos` | **0** (deveria ser -5) |
| Saldo no cache | -27 (apenas B/O) |
| Saldo correto | **-32** (B/O + PC) |

**Causa provavel:**
O `fluxoFinanceiroController.js` ou `extratoFinanceiroCacheController.js` consolida o extrato
usando apenas o ranking da rodada (bonusOnus), mas NAO integra o valor financeiro do PC
calculado pelo modulo `pontosCorridosCacheController`. O confronto PC existe na collection
`pontoscorridoscaches` com `financeiro: -5`, porem esse valor nao e propagado para o
campo `pontosCorridos` do `historico_transacoes` no `extratofinanceirocaches`.

**Arquivos a investigar:**
1. `controllers/fluxoFinanceiroController.js` - funcao `getExtratoFinanceiro()` (como monta o extrato)
2. `controllers/extratoFinanceiroCacheController.js` - funcao `salvarExtratoCache()` (como salva o cache)
3. `public/participante/js/modules/participante-extrato.js` - como o frontend calcula e envia ao backend
4. Integracoes entre PC cache e extrato cache

**Config PC 2026 (SuperCartola):**
```
rodada_inicial: 2 (R2 do Brasileirao = R1 do PC)
formato: round_robin
V=+5, E=+3, D=-5
tolerancia_empate: 0.3
goleada >= 50pts: bonus R$2 + 1pt
```

**Para corrigir:**
1. Identificar ONDE o extrato busca (ou deveria buscar) o valor PC de cada rodada
2. Garantir que ao consolidar/salvar o extrato, o campo `pontosCorridos` seja populado
3. Recalcular os extratos de TODOS os participantes das 2 rodadas ja consolidadas
4. Verificar se MM e Top10 tem o mesmo problema (provavelmente sim quando iniciarem)

**Comando sugerido:** `/workflow corrigir integracao PC/MM/Top10 no extrato financeiro 2026`

---

## ✅ CORREÇÃO IMPLEMENTADA (07/02/2026)

### **1. Auto-Healing no Controller** (`fluxoFinanceiroController.js` v8.9.0)

**Função criada:** `detectarModulosFaltantesNoCache(cache, liga, rodadaLimite)`

**Lógica:**
- Verifica se módulos PC/MM/Top10 estão **habilitados** na liga
- Checa se transações desses módulos **existem** no cache consolidado
- Se detectar módulos faltantes, **invalida** o cache automaticamente
- Cache será **recalculado do zero** na próxima requisição

**Exemplo de detecção:**
```javascript
// Liga tem PC habilitado, rodada inicial = 2
// Cache consolidado até rodada 2
// MAS não tem NENHUMA transação tipo "PONTOS_CORRIDOS"
// ↓
// Auto-healing deleta cache e força recálculo completo
```

**Proteções:**
- Só executa se cache já tem rodadas consolidadas (`> 0`)
- Não executa se refresh manual foi solicitado (`forcarRecalculo=true`)
- Log detalhado de cada invalidação para auditoria

**Localização no código:**
- Linha 164-218: Função `detectarModulosFaltantesNoCache()`
- Linha 540-568: Chamada no `getExtratoFinanceiro()` antes de processar rodadas

---

### **1.5. Bug Secundário Descoberto** (`fluxoFinanceiroController.js` v8.9.1)

**Problema:** Auto-healing detectava módulos habilitados via `modulos_ativos` mas `isModuloHabilitado()` retornava `false`

**Causa:** Conflito entre sistemas de configuração:
- Liga tem `modulos_ativos.pontosCorridos: true` (sistema legado)
- Liga tem `configuracoes.pontos_corridos.habilitado: false` (sistema novo)
- `isModuloHabilitado()` priorizava `configuracoes` SEMPRE, ignorando `modulos_ativos`

**Solução (v8.9.1):**
```javascript
function isModuloHabilitado(liga, modulo) {
    // ✅ FIX: Só usar configuracoes se módulo estiver CONFIGURADO
    const configModulo = liga?.configuracoes?.[modulo];

    if (configModulo?.configurado === true && configModulo?.habilitado !== undefined) {
        return configModulo.habilitado;
    }

    // Fallback para modulos_ativos (compatibilidade)
    const moduloKey = modulo.replace(/_/g, '');
    const moduloCamel = modulo.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    if (liga?.modulos_ativos?.[moduloKey] !== undefined) {
        return liga.modulos_ativos[moduloKey];
    }
    if (liga?.modulos_ativos?.[moduloCamel] !== undefined) {
        return liga.modulos_ativos[moduloCamel];
    }

    return false;
}
```

**Lógica:** Só consulta `configuracoes` se flag `configurado: true` estiver presente, caso contrário usa `modulos_ativos`

---

### **2. Script de Migração** (`fix-extrato-pc-mm-top10-integration-2026.js`)

**Propósito:** Corrigir caches existentes com módulos faltantes

**Funcionalidades:**
- ✅ Analisa **todas** as ligas e participantes
- ✅ Detecta módulos faltantes usando mesma lógica do auto-healing
- ✅ Deleta caches corrompidos (serão recalculados automaticamente)
- ✅ Relatório detalhado de problemas encontrados
- ✅ Modo `--dry-run` para simular sem modificar

**Uso:**
```bash
# 1. Simular (ver problemas sem modificar)
node scripts/fix-extrato-pc-mm-top10-integration-2026.js --dry-run

# 2. Executar correção (DEV)
node scripts/fix-extrato-pc-mm-top10-integration-2026.js --force

# 3. Executar correção (PROD)
NODE_ENV=production node scripts/fix-extrato-pc-mm-top10-integration-2026.js --force

# 4. Corrigir apenas uma liga específica
node scripts/fix-extrato-pc-mm-top10-integration-2026.js --liga-id=<ID> --force
```

**Proteções:**
- Ambiente PROD requer flag `--force` ou `--dry-run`
- Só opera em temporada 2026 (não toca dados históricos)
- Log completo de cada operação
- Estatísticas finais (quantos corrigidos, erros, etc.)

**Saída esperada:**
```
📊 RELATÓRIO FINAL
======================================================================
Ligas analisadas:           2
Participantes analisados:   70
Caches com problemas:       35
Caches corrigidos:          35
Erros:                      0
======================================================================
```

---

### **2.5. Endpoint HTTP Alternativo** (`routes/admin/migracao.js`)

**Propósito:** Alternativa ao CLI script que reutiliza conexão MongoDB do servidor

**Endpoints:**

**1. GET `/api/admin/migracao/fix-extrato-2026`** (Dry-Run)
```bash
curl http://localhost:3000/api/admin/migracao/fix-extrato-2026
curl http://localhost:3000/api/admin/migracao/fix-extrato-2026?ligaId=<ID>
```

**2. POST `/api/admin/migracao/fix-extrato-2026?force=true`** (Execução)
```bash
curl -X POST http://localhost:3000/api/admin/migracao/fix-extrato-2026?force=true
curl -X POST http://localhost:3000/api/admin/migracao/fix-extrato-2026?ligaId=<ID>&force=true
```

**Resposta JSON:**
```json
{
  "success": true,
  "mode": "execution",
  "temporada": 2026,
  "stats": {
    "ligasAnalisadas": 2,
    "participantesAnalisados": 70,
    "cachesComProblemas": 35,
    "cachesCorrigidos": 35,
    "erros": 0,
    "detalhes": [...]
  },
  "message": "Correção concluída. 35 cache(s) corrigido(s)."
}
```

**Proteções:**
- ✅ Requer autenticação admin (`isAdminAutorizado`)
- ✅ POST requer `?force=true` para confirmar
- ✅ Usa mesma lógica de detecção do script CLI
- ✅ Rota registrada em `index.js`: `app.use("/api/admin/migracao", adminMigracaoRoutes)`

---

### **3. Script de Teste Manual** (`test-paulinett-fix.js`)

**Propósito:** Script simples para deletar cache específico e testar recálculo

**Uso:**
```bash
node test-paulinett-fix.js
```

**O que faz:**
1. Conecta ao MongoDB usando `MONGO_URI`
2. Busca cache de Paulinett Miranda (time_id: 13935277, liga SuperCartola 2026)
3. Exibe informações do cache atual (transações, saldo, tem PC?)
4. Deleta o cache
5. Instrui próximo passo: acessar API de extrato para forçar recálculo

**Saída esperada:**
```
📊 Cache encontrado:
   Rodadas consolidadas: 2
   Saldo: R$ -27.00
   Transações: 2
   Tem PC: ❌ NÃO

🗑️  Deletando cache...
✅ Cache deletado!

💡 Agora acesse o extrato via API para recalcular:
   GET /api/fluxo-financeiro/{ligaId}/extrato/13935277?temporada=2026
```

---

### **4. PENDENTE - VALIDAÇÃO MANUAL**

**⚠️ IMPORTANTE:** Todo código foi corrigido (v8.9.1), mas aguarda validação em ambiente Replit com MongoDB autenticado.

**Passo a passo para validar:**

**1️⃣ Deletar cache de Paulinett (força recálculo)**
```bash
# No Replit Shell, executar:
node test-paulinett-fix.js
```

**2️⃣ Acessar extrato via API (trigger recálculo com v8.9.1)**
```bash
GET /api/fluxo-financeiro/684cb1c8af923da7c7df51de/extrato/13935277?temporada=2026
```

**3️⃣ Verificar resposta do extrato**

**Valores esperados:**
```json
{
  "rodadas": [
    {
      "rodada": 2,
      "bancoOnus": -13,
      "pontosCorridos": -5,  // ✅ DEVE SER -5 (não mais 0)
      "mataMata": 0,
      "top10": 0,
      "melhorMes": 0,
      "total": -18
    }
  ],
  "saldo_final": -32  // ✅ DEVE SER -32 (não mais -27)
}
```

**4️⃣ Validar no MongoDB diretamente**
```javascript
// Buscar cache recalculado
db.extratofinanceirocaches.findOne({
  liga_id: "684cb1c8af923da7c7df51de",
  time_id: 13935277,
  temporada: 2026
})

// Verificar:
// ✅ historico_transacoes tem tipo "PONTOS_CORRIDOS"
// ✅ Transação PC tem rodada=2 e valor=-5
// ✅ saldo_consolidado = -32
```

**5️⃣ (Opcional) Executar migração em massa**

Se validação com Paulinett estiver OK, corrigir todos os participantes:

**Opção A - CLI Script:**
```bash
node scripts/fix-extrato-pc-mm-top10-integration-2026.js --force
```

**Opção B - HTTP Endpoint:**
```bash
curl -X POST "http://localhost:3000/api/admin/migracao/fix-extrato-2026?force=true"
```

---

### **5. Status das Correções**

| Item | Status | Versão |
|------|--------|--------|
| Auto-healing implementado | ✅ Completo | v8.9.0 |
| Bug config system corrigido | ✅ Completo | v8.9.1 |
| Script CLI migração | ✅ Completo | v1.0.0 |
| HTTP endpoint migração | ✅ Completo | v1.0.0 |
| Script teste manual | ✅ Completo | v1.0.0 |
| Validação com Paulinett | ⏳ Pendente | - |
| Migração em massa | ⏳ Pendente | - |

**Próxima ação:** Executar `node test-paulinett-fix.js` no Replit Shell para validar correção

---

### **6. Checklist de Validação Final**

**Após executar teste manual:**
- [ ] Cache de Paulinett deletado com sucesso
- [ ] Extrato recalculado via API
- [ ] Extrato exibe PC = -5 na R2 (não mais 0)
- [ ] Saldo total = -32 (B/O -27 + PC -5, não mais -27)
- [ ] MongoDB confirma transação "PONTOS_CORRIDOS" no cache
- [ ] Auto-healing não dispara novamente (cache está correto agora)

**Após migração em massa (se executada):**
- [ ] Relatório mostra 0 erros
- [ ] Todos participantes com PC habilitado têm transações PC no cache
- [ ] Consultas spot-check em 2-3 participantes confirmam valores corretos

---

### **7. Pendência Anterior: APIs 404 em Liga Nova (Os Fuleros)**

**Problema:** Ao acessar liga recem-criada, APIs retornam 404:
```
GET /api/ranking-turno/6977a62071dee12036bb163e?turno=geral&temporada=2026 -> 404
GET /api/ranking-cache/6977a62071dee12036bb163e?temporada=2026 -> 404
```

**Para investigar:**
1. Verificar rotas em `routes/ranking*.js`
2. Verificar se liga nova precisa de inicializacao de cache
3. Confirmar se e comportamento esperado em pre-temporada

---

## CONTEXTO DA AUDITORIA REALIZADA

### Extrato Paulinett 2025 (HISTORICO - Hall da Fama apenas)

Dados de 2025 ficam como referencia historica. Bugs identificados mas NAO precisam de correcao:

| Bug | Descricao |
|-----|-----------|
| `temporada: null` | Cache criado com versao 3.4.0, campo temporada ausente |
| Top10 zerado | 2 MICOs existem mas T10=0 em todas rodadas (versao antiga) |
| PC divergente | Extrato PC=-25 vs Cache PC=-9 (delta incorreto) |
| 9 rodadas sem posicao | Snapshots tem posicao mas extrato perdeu dados |
| Fix script com tabela errada | `fix-extrato-paulinett-sc-2025.js` usa B/O incorretos |

### Extrato Paulinett 2026 (ATIVO)

| Componente | Valor | Status |
|------------|-------|--------|
| R1 B/O (Pos 34/35) | -14 | OK |
| R2 B/O (Pos 33/35) | -13 | OK |
| R2 PC | 0 (deveria -5) | **BUG** |
| R2 MM | 0 | OK (R2 e classificatoria) |
| Campos manuais | 0 | OK |
| Acertos | 0 | OK |
| Lancamentos iniciais | 0 | OK (owner isento) |
| **Saldo cache** | **-27** | **INCORRETO (deveria -32)** |

### Parametrizacao 2026 SuperCartola

| Modulo | Rodada Inicio | Config |
|--------|--------------|--------|
| Ranking (BANCO) | R1 | 35 times, credito 1-12, neutro 13-23, debito 24-35 |
| Pontos Corridos | R2 | V=+5, E=+3, D=-5 |
| Mata-Mata | R3 (classif R2) | 32 times, 7 edicoes, V=+10, D=-10 |
| Top10 | Acumulado | Mito +30..+12, Mico -30..-12 |
| Melhor Mes | R1 | 7 edicoes (R1-4, R5-8, R9-13, R14-18, R19-25, R26-33, R34-38), campeao R$80 |
| Artilheiro | Acumulado | 1o=R$30, 2o=R$20, 3o=R$10 |
| Luva de Ouro | Acumulado | 1o=R$30, 2o=R$20, 3o=R$10 |
| Capitao de Luxo | Acumulado | 1o=R$25, 2o=R$15, 3o=R$10 |

### Calendario MM 2026 (6 edicoes default)

| Edicao | Classificatoria | Primeira | Oitavas | Quartas | Semis | Final |
|--------|----------------|----------|---------|---------|-------|-------|
| 1 | R2 | R3 | R4 | R5 | R6 | R7 |
| 2 | R9 | R10 | R11 | R12 | R13 | R14 |
| 3 | R15 | R16 | R17 | R18 | R19 | R20 |
| 4 | R21 | R22 | R23 | R24 | R25 | R26 |
| 5 | R26 | R27 | R28 | R29 | R30 | R31 |
| 6 | R32 | R33 | R34 | R35 | R36 | R37 |

Nota: Wizard configurou 7 edicoes mas calendario default tem 6. A 7a precisa ser criada.

---

## CONTEXTO DO SISTEMA

### Classificacao de Modulos

| Tipo | Modulos | Default |
|------|---------|---------|
| **Base** | extrato, ranking, rodadas, historico | `true` (sempre) |
| **Opcionais** | top10, melhorMes, pontosCorridos, mataMata, artilheiro, luvaOuro, campinho, dicas | `false` (admin configura) |

### Servidor
- Rodando na porta 3000
- NODE_ENV=development
- CURRENT_SEASON=2026
- Temporada status: ativa (2 rodadas consolidadas, rodada atual 3)

---

**PROXIMA SESSAO:** Corrigir integracao PC -> Extrato (e validar MM/Top10 quando iniciarem).

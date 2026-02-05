# Módulo Capitão de Luxo - Guia Completo

## 📋 Visão Geral

O módulo **Capitão de Luxo** rastreia e premia os participantes que fizeram as melhores escolhas de capitães durante a temporada. Como o capitão vale pontos em dobro no Cartola FC, escolher o capitão certo faz toda a diferença!

## 🎯 Funcionamento

### Coleta de Dados
- Após cada rodada, o sistema pode coletar os dados dos capitães escolhidos por cada participante
- Pontuação do capitão já vem dobrada pela API do Cartola FC
- Dados incluem: melhor capitão, pior capitão, capitães distintos utilizados, média, etc.

### Consolidação
O ranking precisa ser **consolidado manualmente** pelo administrador após as rodadas finalizadas:

```bash
# Consolidar até rodada atual (detecta automaticamente)
node scripts/consolidar-capitao-luxo.js <ligaId>

# Consolidar até rodada específica
node scripts/consolidar-capitao-luxo.js <ligaId> 5

# Dry-run (testar sem salvar)
node scripts/consolidar-capitao-luxo.js <ligaId> --dry-run

# Forçar consolidação (módulo inativo)
node scripts/consolidar-capitao-luxo.js <ligaId> --force
```

**Importante:** Execute a consolidação após cada rodada ou em lote ao final da temporada.

### Via API (Administrador)
```bash
POST /api/capitao/:ligaId/consolidar
Content-Type: application/json

{
  "temporada": 2026,
  "rodadaFinal": 5
}
```

## 🚦 Lógica de Bloqueio

### Quando a trava "Aguardando Início do Campeonato" aparece?

A trava aparece **apenas quando**:
- Rodada atual = 1 (primeira rodada ainda não aconteceu)
- **E** Mercado está aberto (rodada não começou)

### Correção Implementada

**ANTES** (❌ Bugado):
```javascript
if (rodada <= 1 && mercadoAberto) {
    return true; // Travava na rodada 2 com mercado aberto
}
```

**DEPOIS** (✅ Corrigido):
```javascript
if (rodada === 1 && mercadoAberto) {
    return true; // Só trava ANTES da primeira rodada
}
```

## 🔧 Troubleshooting

### Problema: "Sem dados de capitães disponíveis"

**Causa:** Cache vazio - dados não foram consolidados

**Solução:**
1. Verificar que rodadas foram finalizadas
2. Executar consolidação:
   ```bash
   node scripts/consolidar-capitao-luxo.js <ligaId>
   ```

### Problema: "Aguardando Início do Campeonato" na rodada 2+

**Causa:** Bug no código (corrigido neste PR)

**Solução:** Deploy da correção no `public/js/capitao-luxo.js`

## 📅 Workflow Recomendado

### Durante a Temporada
1. Após cada rodada finalizada:
   ```bash
   node scripts/consolidar-capitao-luxo.js <ligaId>
   ```

2. Verificar logs para top 3

### Final da Temporada
1. Consolidação final (todas as 38 rodadas):
   ```bash
   node scripts/consolidar-capitao-luxo.js <ligaId> 38
   ```

2. Verificar ranking final
3. Aplicar premiações financeiras via Fluxo Financeiro

## 📝 Changelog

### v2.0.0 (2026-02-05)
- ✅ Corrigida lógica de bloqueio (rodada === 1 ao invés de <=)
- ✅ Adicionado parâmetro `rodadaFinal` para consolidação incremental
- ✅ Criado script `consolidar-capitao-luxo.js` com dry-run
- ✅ Mensagens melhoradas para UX
- ✅ Documentação completa criada

### v1.0.0 (2025-XX-XX)
- Lançamento inicial do módulo

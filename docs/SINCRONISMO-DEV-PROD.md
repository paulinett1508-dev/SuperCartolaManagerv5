# Estratégia de Sincronismo DEV/PROD - Super Cartola

## Visão Geral

O sistema usa **dois bancos MongoDB separados**:
- **PROD** (`MONGO_URI`): `cartola-manager` - Banco de produção com dados reais
- **DEV** (`MONGO_URI_DEV`): `cartola-manager-dev` - Banco de desenvolvimento para testes

A seleção automática é feita em `config/database.js`:
```javascript
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Development usa MONGO_URI_DEV, Production usa MONGO_URI
```

## Problema Identificado (Temporada 2025)

Durante a temporada 2025, foi detectado que:
1. Os caches de extrato financeiro (`extratofinanceirocaches`) ficaram dessincronizados
2. DEV estava com rodadas faltando em relação ao PROD
3. Participantes não viam a rodada 38 no ambiente de desenvolvimento

### Causa Raiz
- Recálculos e consolidações eram executados apenas em um ambiente
- Não havia processo automático de sincronização
- Scripts de manutenção eram rodados sem garantir replicação

## Estratégia para 2026

### 1. Sincronização Automática de Caches

**Opção A: Webhook após consolidação (Recomendado)**
Após cada consolidação de rodada no PROD, disparar sincronização para DEV.

**Opção B: Banco único com flags de ambiente**
Usar um único banco com campo `ambiente` para isolar dados de teste.

**Opção C: Sincronização periódica**
Job agendado para sincronizar caches a cada rodada finalizada.

### 2. Scripts de Verificação

Usar os scripts criados para monitorar sincronismo:

```bash
# Verificar estado de sincronismo
node scripts/sync-check-dev-prod.js

# Corrigir caches desatualizados
node scripts/fix-sync-dev-prod.js
```

### 3. Regras de Operação

1. **Consolidações**: Sempre executar em PROD primeiro, depois sincronizar DEV
2. **Recálculos**: Executar em ambos os bancos ou sincronizar após
3. **Testes destrutivos**: Apenas em DEV, nunca em PROD
4. **Virada de temporada**: Sincronizar bancos antes de iniciar

### 4. Checklist de Virada de Temporada

```
[ ] Exportar backup completo do PROD
[ ] Sincronizar todos os caches DEV ← PROD
[ ] Verificar paridade: node scripts/sync-check-dev-prod.js
[ ] Arquivar dados da temporada anterior
[ ] Limpar caches temporários
[ ] Resetar contadores de rodada
[ ] Validar configurações das ligas
```

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `scripts/sync-check-dev-prod.js` | Compara caches entre DEV e PROD |
| `scripts/fix-sync-dev-prod.js` | Sincroniza caches desatualizados |

## Estrutura de Cache

Os caches de extrato financeiro usam chave composta:
- `liga_id` (ObjectId)
- `time_id` (Number)
- `temporada` (Number)

**Importante**: Um participante pode estar em múltiplas ligas. Cada liga tem seu próprio cache.

## Métricas de Sucesso

Ao final de cada rodada:
- 0 participantes desatualizados
- 0 participantes sem cache em DEV
- Todos com `ultima_rodada_consolidada` igual entre DEV e PROD

## Contato

Em caso de problemas de sincronismo:
1. Verificar logs do servidor
2. Executar script de verificação
3. Corrigir manualmente se necessário

---
*Documento criado em: 21/12/2025*
*Última atualização: 21/12/2025*

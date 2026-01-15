
# Estratégia de Sincronismo DEV/PROD - Super Cartola

## Visão Geral

O sistema agora utiliza **um único banco MongoDB** para DEV e PROD:
- **Banco Único** (`MONGO_URI`): `cartola-manager` - Todos os dados reais e de desenvolvimento estão no mesmo banco.
- A diferenciação de ambiente é feita apenas via variável `NODE_ENV` e logs, não há mais separação física de bancos.
- Recomenda-se que operações destrutivas ou de teste sejam feitas com cautela, sempre validando o ambiente.

Configuração em `config/database.js`:
```javascript
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
// Banco único para ambos ambientes
```


## Histórico de Problemas (Temporada 2025)

No modelo antigo (dois bancos), ocorreram problemas como:
1. Caches de extrato financeiro dessincronizados
2. Rodadas faltando em DEV
3. Participantes sem dados atualizados em ambientes diferentes

Com o banco único, esses problemas foram mitigados, mas é fundamental manter boas práticas de consolidação e backup.


## Estratégia Atual

### 1. Consolidação e Sincronismo

- Após cada consolidação de rodada, todos os dados já ficam disponíveis para ambos ambientes.
- Recomenda-se rodar scripts de verificação para garantir que não há inconsistências.
- Para testes destrutivos, utilize flags ou coleções de teste, nunca altere dados reais em produção.

### 2. Scripts de Verificação


Usar os scripts criados para monitorar sincronismo e integridade:

```bash
# Verificar estado de sincronismo
node scripts/sync-check-dev-prod.js

# Corrigir caches desatualizados
node scripts/fix-sync-dev-prod.js
```


### 3. Regras de Operação

1. **Consolidações**: Sempre execute scripts de consolidação com atenção ao ambiente (`NODE_ENV`).
2. **Recálculos**: Execute recálculos apenas quando necessário e sempre faça backup antes.
3. **Testes destrutivos**: Use flags de ambiente e nunca altere dados reais sem validação.
4. **Virada de temporada**: Faça backup completo antes de qualquer alteração em massa.


### 4. Checklist de Virada de Temporada

```
[ ] Exportar backup completo do banco
[ ] Verificar integridade dos caches: node scripts/sync-check-dev-prod.js
[ ] Arquivar dados da temporada anterior
[ ] Limpar caches temporários
[ ] Resetar contadores de rodada
[ ] Validar configurações das ligas
```


## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `scripts/sync-check-dev-prod.js` | Verifica integridade dos caches |
| `scripts/fix-sync-dev-prod.js` | Corrige caches desatualizados |


## Estrutura de Cache

Os caches de extrato financeiro usam chave composta:
- `liga_id` (ObjectId)
- `time_id` (Number)
- `temporada` (Number)

**Importante**: Um participante pode estar em múltiplas ligas. Cada liga tem seu próprio cache.


## Métricas de Sucesso

Ao final de cada rodada:
- 0 participantes desatualizados
- Todos com `ultima_rodada_consolidada` igual


## Contato

Em caso de problemas de sincronismo:
1. Verificar logs do servidor
2. Executar script de verificação
3. Corrigir manualmente se necessário


---
*Documento criado em: 21/12/2025*
*Última atualização: 15/01/2026*

# Tarefas Pendentes - 2025-12-27

## Contexto
Encerramento da Temporada 2025 e preparação para virada de Temporada 2026.
Todas as validações foram concluídas. Sistema pronto para executar turn_key em 01/01/2026.

## Tarefa Principal
**VIRADA DE TEMPORADA 2025 → 2026**

## Concluído (Validações)
- [x] 38 rodadas consolidadas (ambas ligas)
- [x] Rankings finais validados (SuperCartola: 32, Sobral: 6)
- [x] Saldos financeiros verificados (18 credores, 14 devedores)
- [x] 32 nomes "Desconhecido" corrigidos no users_registry.json
- [x] 4 badges incorretos removidos
- [x] Cartório Vitalício: 37 participantes únicos
- [x] turn_key_2026.js testado em dry-run
- [x] Collections PRESERVE atualizadas (admins, acertofinanceiros)
- [x] Collections WIPE expandida (25 collections)
- [x] Snapshot 2025 gerado (data/history/2025/)
- [x] Backup automático funcionando
- [x] Prazos de renovação configurados (15/03, 31/03)

## Pendente (Ações Manuais)
- [ ] Notificar participantes sobre encerramento 2025
- [ ] Cobrar quitação dos 14 devedores (R$ 2.432 pendentes)
- [ ] Pagar os 18 credores (R$ 2.739 a pagar)
- [ ] **EXECUTAR turn_key em 01/01/2026**
- [ ] Atualizar config/seasons.js (CURRENT_SEASON = 2026)
- [ ] Reiniciar servidor após turn_key

## Situação Financeira Atual
| Status | Qtd | Valor |
|--------|-----|-------|
| Credores | 18 | R$ 2.739,00 |
| Devedores | 14 | R$ 2.432,00 |
| Já quitaram | 4 | R$ 548,00 |

**Quitações recebidas:**
1. Diego Barbosa - R$ 197
2. Leilson Bezerra - R$ 204
3. Chamex F.C. - R$ 146
4. Paulinett Miranda - R$ 1

## Campeões 2025
- **SuperCartola:** Vitim (1º)
- **Sobral:** Vitim + Daniel Barbosa (empate 1º)

## Arquivos Importantes
- `scripts/turn_key_2026.js` - Script de virada (v2.1.0)
- `config/seasons.js` - Alterar CURRENT_SEASON para 2026
- `data/users_registry.json` - Cartório Vitalício (37 usuários)
- `data/history/2025/` - Snapshot da temporada

## Próximos Passos (01/01/2026)

### 1. Executar Turn Key
```bash
# Conectar ao Replit e rodar:
NODE_ENV=production node scripts/turn_key_2026.js
```

### 2. Atualizar Seasons (manual)
```javascript
// Em config/seasons.js, alterar:
export const CURRENT_SEASON = 2026;
// E em SEASON_CONFIG:
status: 'preparando'
```

### 3. Reiniciar Servidor
```bash
# Via Replit Console ou restart automático
```

## Comandos Úteis para Retomar
```bash
# Verificar status do git
git status

# Verificar situação financeira
node -e "const d = require('./data/users_registry.json'); console.log('Credores:', d.users.filter(u => u.situacao_financeira?.saldo_atual > 0).length); console.log('Devedores:', d.users.filter(u => u.situacao_financeira?.saldo_atual < 0).length);"

# Testar turn_key novamente (dry-run)
node scripts/turn_key_2026.js --dry-run --force-date-override

# Verificar acertos financeiros
node -e "const {MongoClient} = require('mongodb'); require('dotenv').config(); MongoClient.connect(process.env.MONGO_URI).then(c => c.db().collection('acertofinanceiros').countDocuments().then(n => {console.log('Total acertos:', n); c.close();}));"
```

## Cronograma
| Data | Ação |
|------|------|
| Até 31/12/2025 | Quitar pendências |
| 01/01/2026 | Executar turn_key |
| 01/01 - 15/03 | Renovação OPT-IN |
| 15/03/2026 | Prazo renovação |
| 31/03/2026 | Prazo quitação |
| Abril 2026 | Início Brasileirão |

---

## Histórico de Sessões Anteriores

### Sessão 2025-12-18 (Noite)
- [x] Exibição de Composição do Saldo no Extrato

### Sessão 2025-12-18 (Tarde)
- [x] Correção Crítica: Cálculo de Acertos Financeiros

### Sessão 2025-12-18 (Manhã)
- [x] Banner de Boas-Vindas com Resumo 2025
- [x] Seletor de Temporada Global
- [x] Hall da Fama / Histórico do Participante
- [x] Correção de Saldos Financeiros

### Sessão 2025-12-17
- [x] Sistema de Design Tokens
- [x] Migração de 16 Páginas Admin
- [x] Gestão de Ligas - Padronização CSS

---
*Salvo em: 2025-12-27 00:55 UTC*
*Use `/retomar-tarefas` para continuar*

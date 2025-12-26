# Scripts de Correção Aplicados (Applied Fixes)

Estes scripts foram criados para corrigir problemas específicos no sistema.
**Status:** Correções aplicadas e funcionando - Mantidos apenas para histórico.

## ⚠️ STATUS: ARQUIVADO

Estes scripts **NÃO devem ser executados novamente** sem revisão, pois as correções já foram aplicadas no código principal.

---

## 📋 Categorias de Fixes

### 🔧 Correções Financeiras (5 scripts)

1. **fix-acertos-tipo.js**
   - Correção de tipos de acertos financeiros
   - Fix: pagamento vs recebimento

2. **fix-saldo-transacoes.js** ⚠️
   - Correção de saldos de transações
   
3. **fix-saldos-transacoes.js** ⚠️
   - POSSÍVEL DUPLICATA do anterior
   - Revisar se têm propósitos diferentes

4. **fix-saldos-duplicados.js**
   - Remoção de saldos duplicados no sistema

5. **fix-rodadas-faltantes.js**
   - Preenchimento de rodadas faltantes

---

### 🎯 Correções Específicas (4 scripts)

6. **fix-inativos-liga-cartoleiros.js**
   - Correção de participantes inativos
   - Liga específica: Cartoleiros

7. **fix-r38-cache.js**
   - Fix específico do cache da Rodada 38
   - **Temporada 2025**

8. **fix-rb-ousadia-r38.js**
   - Fix ultra-específico: Liga RB Ousadia, Rodada 38
   - Correção pontual de dados

9. **fix-sync-dev-prod.js**
   - Correção de sincronismo DEV/PROD
   - **OBSOLETO:** Sistema agora usa banco único

---

### 🔄 Scripts de Sincronismo (2 scripts)

10. **sync-check-dev-prod.js**
    - Verificação de sincronismo entre ambientes
    - **OBSOLETO:** DEV e PROD usam mesmo banco agora

11. **sync-prod-to-dev.js**
    - Sincronização de PROD para DEV
    - **OBSOLETO:** Não mais necessário

---

## 📊 Estatísticas

- **Total de fixes:** 11 scripts
- **Arquivado em:** 25/12/2025 (Fase 3 de Limpeza)
- **Motivo:** Correções aplicadas com sucesso no código principal

---

## ⚠️ AVISOS IMPORTANTES

### Duplicações Detectadas:
- ⚠️ **fix-saldo-transacoes.js** vs **fix-saldos-transacoes.js**
  - Revisar se são duplicados ou têm propósitos diferentes
  - Ambos mantidos por segurança

### Scripts Obsoletos:
- ✅ **fix-sync-dev-prod.js** - Sistema usa banco único agora
- ✅ **sync-check-dev-prod.js** - Não mais necessário
- ✅ **sync-prod-to-dev.js** - Não mais necessário

### Scripts Ultra-Específicos:
- 📅 **fix-r38-cache.js** - Rodada 38 específica
- 🏆 **fix-rb-ousadia-r38.js** - Liga + Rodada específicas

---

## 🔍 Quando Consultar?

1. **Referência Histórica:** Como bugs foram corrigidos
2. **Problema Similar:** Se erro parecido reaparecer
3. **Aprendizado:** Entender estratégias de correção
4. **Auditoria:** Rastrear mudanças críticas no sistema

---

## 📝 Notas de Manutenção

- Estes scripts são **somente leitura** (referência)
- Se precisar executar novamente, **revisar código primeiro**
- Verificar se correção já existe no código principal
- Usar com **--dry-run** para simular antes de aplicar

---

**Data de Arquivamento:** 25/12/2025
**Fase:** 3 de Limpeza de Código
**Responsável:** Sistema Automatizado

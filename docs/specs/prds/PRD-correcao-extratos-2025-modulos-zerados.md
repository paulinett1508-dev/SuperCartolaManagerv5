# PRD - Correção Extratos 2025: Módulos Zerados (PC/MM/Top10)

**Data:** 2026-01-17
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Prioridade:** CRÍTICA
**Caso Exemplo:** Antonio Luis (time_id: 645089)

---

## Resumo Executivo

Foi identificada uma **perda de dados históricos** nos extratos financeiros da temporada 2025. As colunas **P.Corridos**, **Mata-Mata** e **Top 10** estão zeradas para vários participantes, apesar de os dados existirem nas collections de módulos (`pontoscorridoscaches`, `matamatacaches`, `top10caches`).

**REGRA DE NEGÓCIO VIOLADA:** Extratos são IMUTÁVEIS e armazenados no MongoDB. Mesmo quando um participante quita suas dívidas, o histórico financeiro deve ser **PERPÉTUO** para auditoria e Hall da Fama.

---

## Contexto e Análise

### Problema Identificado

**Sintoma:** Extratos de 2025 exibem `pontosCorridos: 0`, `mataMata: 0`, `top10: 0` em TODAS as rodadas.

**Caso Exemplo - Antonio Luis (645089):**
```json
{
  "time_id": 645089,
  "temporada": 2025,
  "versao_calculo": "regenerado-posicoes-2026-01-17",
  "migracao_modulos_2025": null, // ❌ NÃO TEM FLAG DE MIGRAÇÃO
  "historico_transacoes": [
    {
      "rodada": 1,
      "posicao": 19,
      "bonusOnus": 0,
      "pontosCorridos": 0,  // ❌ ZERADO
      "mataMata": 0,        // ❌ ZERADO
      "top10": 0            // ❌ ZERADO
    }
    // ... todas as 38 rodadas com PC/MM/Top10 = 0
  ]
}
```

**Porém, os dados EXISTEM** na collection `pontoscorridoscaches`:
```json
{
  "posicao": 12,
  "timeId": 645089,
  "nome": "FloriMengo FC",
  "financeiro": 5  // ✅ EXISTE DADO DE PC!
}
```

### Causa Raiz

**Sequência de eventos que causou a perda:**

1. **Script `corrigir-caches-2025.js`** (linhas 116-117) explicitamente ZERA os módulos:
   ```javascript
   historicoTransacoes.push({
       pontosCorridos: 0,  // ZERADO PROPOSITALMENTE
       mataMata: 0,        // ZERADO PROPOSITALMENTE
       top10: top10,       // Apenas Top10 é calculado
   });
   ```

2. **Script `migrar-modulos-extrato-2025.js`** deveria integrar os módulos, mas:
   - Só roda em caches que JÁ EXISTEM
   - Se o cache foi recriado DEPOIS da migração, perde os dados
   - Flag `migracao_modulos_2025` não é verificada antes de regenerar

3. **Em 2026-01-17**, um script de regeneração rodou e SOBRESCREVEU os caches:
   - `versao_calculo: "regenerado-posicoes-2026-01-17"`
   - Participantes perderam dados de PC/MM/Top10 migrados anteriormente

### Módulos Identificados

**Backend:**
- `scripts/corrigir-caches-2025.js` - **CAUSADOR** - Zera PC/MM explicitamente
- `scripts/migrar-modulos-extrato-2025.js` - Migração de módulos (existe, mas não foi re-executada)
- `controllers/extratoFinanceiroCacheController.js` - Controller de cache
- `models/ExtratoFinanceiroCache.js` - Schema do extrato

**Collections MongoDB:**
- `extratofinanceirocaches` - Caches com dados zerados (problema)
- `pontoscorridoscaches` - Dados de PC (fonte correta)
- `matamatacaches` - Dados de MM (fonte correta)
- `top10caches` - Dados de Top10 (fonte correta)

**Frontend:**
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` - Renderiza colunas

### Dependências Mapeadas

```
extratofinanceirocaches
    ├── pontoscorridoscaches (não integrado)
    ├── matamatacaches (não integrado)
    └── top10caches (parcialmente integrado)
```

### Padrões Existentes

O script `migrar-modulos-extrato-2025.js` já resolve o problema:
1. Lê dados das collections de módulos
2. Integra aos caches de extrato
3. Calcula DELTA de PC (não acumulado)
4. Marca com flag `migracao_modulos_2025`

---

## Solução Proposta

### Abordagem Escolhida

**Reexecutar a migração de módulos** para todos os caches de 2025 que:
1. Não possuem flag `migracao_modulos_2025`, OU
2. Foram regenerados DEPOIS da migração original (`versao_calculo` contém "regenerado")

### Arquivos a Modificar

1. **`scripts/migrar-modulos-extrato-2025.js`**
   - Adicionar verificação: se cache já tem `versao_calculo` com "regenerado", forçar re-migração
   - Ou criar nova versão v3.0.0 que sempre re-migra

2. **`scripts/corrigir-caches-2025.js`** (OPCIONAL - PREVENTIVO)
   - Modificar para incluir dados de PC/MM/Top10 na regeneração
   - Ou deprecar este script e usar apenas `migrar-modulos-extrato-2025.js`

### Script de Correção Imediata

Criar `scripts/fix-extratos-2025-modulos-perdidos.js`:

```javascript
/**
 * FIX: Re-migrar módulos para extratos 2025 que perderam dados
 *
 * Identifica caches que:
 * 1. Não têm flag migracao_modulos_2025
 * 2. OU têm versao_calculo "regenerado-*" sem a migração
 *
 * Uso:
 *   node scripts/fix-extratos-2025-modulos-perdidos.js --dry-run
 *   node scripts/fix-extratos-2025-modulos-perdidos.js --execute
 */
```

### Regras de Negócio

1. **IMUTABILIDADE:** Extratos históricos NUNCA devem ser sobrescritos com dados vazios
2. **INTEGRAÇÃO OBRIGATÓRIA:** Qualquer regeneração de cache 2025 DEVE incluir dados de PC/MM/Top10
3. **FLAG DE PROTEÇÃO:** Campo `migracao_modulos_2025` indica que extrato está completo
4. **AUDITORIA:** Quitação zera saldo para exibição, mas histórico permanece intacto

---

## Riscos e Considerações

### Impactos Previstos

- **Positivo:** Restaura dados históricos perpétuos para auditoria
- **Positivo:** Admin terá visão completa do histórico financeiro dos participantes
- **Atenção:** Script deve rodar com `--dry-run` primeiro para validar

### Verificações Pré-Execução

1. Contar quantos caches serão afetados
2. Verificar se collections de módulos têm dados completos
3. Validar somas finais contra dados conhecidos

### Multi-Tenant

- [x] Script usa `liga_id` fixo para Super Cartola (`684cb1c8af923da7c7df51de`)
- [ ] Validar se outras ligas precisam da mesma correção

---

## Testes Necessários

### Cenários de Teste

1. **Caso Antonio Luis (645089):**
   - ANTES: pontosCorridos = 0, mataMata = 0
   - DEPOIS: pontosCorridos deve variar por rodada (baseado em pontoscorridoscaches)

2. **Validação de Somas:**
   - Somar todos os PC de pontoscorridoscaches para time X
   - Somar pontosCorridos do extrato corrigido
   - Valores devem bater

3. **Proteção contra Sobrescrita:**
   - Rodar script de regeneração após fix
   - Verificar que dados de PC/MM/Top10 não foram zerados

### Métricas de Sucesso

- 100% dos caches 2025 com flag `migracao_modulos_2025`
- 0 caches com versão "regenerado-*" sem dados de módulos
- Validação de saldo final contra Hall da Fama

---

## Próximos Passos

1. ✅ Validar PRD
2. ⏳ Gerar Spec: Executar `@Spec` com este PRD
3. ⏳ Implementar: Executar `@Code` com Spec gerado

### Ordem de Execução

1. Criar script `fix-extratos-2025-modulos-perdidos.js`
2. Executar em modo `--dry-run` e validar output
3. Executar em modo `--execute`
4. Validar dados de Antonio Luis e outros casos
5. Modificar scripts de regeneração para prevenir recorrência

---

## Apêndice: Dados de Auditoria

### Participante Antonio Luis (645089) - Temporada 2025

**Extrato Atual (INCORRETO):**
- saldo_consolidado: -80
- ganhos_consolidados: 0
- perdas_consolidadas: -80
- pontosCorridos: 0 (todas as rodadas)
- mataMata: 0 (todas as rodadas)

**Dados em pontoscorridoscaches:**
- Posição 12 na rodada 1 de PC
- financeiro: 5

**Acertos Financeiros:**
- Pagamento R$138 em 03/01/2026 (Quitação)
- Pagamento R$25 em 10/01/2026 (Ajuste)
- Recebimento R$30 em 14/01/2026 (Auto-quitação)

**Campos Manuais (fluxofinanceirocampos):**
- Ajuste/Limbo: R$20

---

**Gerado por:** Pesquisa Protocol v1.0
**Arquivo:** `.claude/docs/PRD-correcao-extratos-2025-modulos-zerados.md`

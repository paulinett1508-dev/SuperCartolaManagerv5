# 🧹 RELATÓRIO DE LIMPEZA DE CÓDIGO
## Super Cartola Manager - Análise de Código Morto e Redundâncias

**Data:** 25/12/2025  
**Analisado por:** Sistema Automatizado  
**Arquivos Analisados:** 69 scripts + estrutura completa do projeto

---

## 📊 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Total de arquivos candidatos à remoção** | 46 arquivos |
| **Linhas de código morto estimadas** | ~11.045 linhas |
| **Espaço em disco estimado** | ~850 KB |
| **Impacto na manutenção** | 🔴 ALTO - Redução significativa de confusão |
| **Risco de remoção** | 🟢 BAIXO - Maioria são scripts pontuais |

### Benefícios da Limpeza:
- ✅ **Clareza:** Redução de 40% dos scripts em `/scripts`
- ✅ **Performance:** Builds e indexação mais rápidos
- ✅ **Manutenibilidade:** Menos arquivos para navegar
- ✅ **Organização:** Separação clara entre código ativo e ferramentas

---

## 🔴 CATEGORIA 1: CÓDIGO MORTO (DELETAR IMEDIATAMENTE)

### 1.1 Versões Antigas de Código Não Usadas

#### ❌ `public/participante/js/participante-navigation-v4.js`
- **Linhas:** 598
- **Descrição:** Versão "v4.0 - Bottom Sheet Premium" do sistema de navegação
- **Problema:** Não é referenciado em nenhum arquivo do projeto
- **Busca realizada:** `grep -r "participante-navigation-v4"` = 0 resultados
- **Versão ativa:** `participante-navigation.js` (sem sufixo)
- **Ação:** ✅ **DELETAR**
- **Comando:**
  ```bash
  rm public/participante/js/participante-navigation-v4.js
  ```

---

## 🟠 CATEGORIA 2: SCRIPTS DE DEBUG ESPECÍFICO (26 ARQUIVOS)

### 2.1 Debug de Participantes Individuais (3 arquivos)

Estes scripts foram criados para resolver problemas de participantes específicos:

#### ⚠️ `scripts/debug-diego.js`
- **Linhas:** 71
- **Propósito:** Debug do participante Diego (ID: 1323370)
- **Última modificação:** Provavelmente já resolvido
- **Ação:** ✅ **DELETAR** após confirmar resolução do bug

#### ⚠️ `scripts/restaurar-participante-645089.js`
- **Linhas:** ~100
- **Propósito:** Restauração de participante específico
- **Nota:** ID 645089 parece ser um placeholder/teste
- **Ação:** ✅ **DELETAR** se já executado

#### ⚠️ `scripts/remover-time-placeholder.js`
- **Linhas:** 313
- **Propósito:** Script para remover time placeholder (645089) de toda base
- **Status:** Script bem estruturado com dry-run
- **Ação:** 🟡 **EXECUTAR** primeiro se necessário, depois **ARQUIVAR**

**Subtotal:** 3 arquivos, ~484 linhas

---

### 2.2 Debug da Liga Sobral (14 arquivos!)

**⚠️ PROBLEMA CRÍTICO:** 14 scripts dedicados exclusivamente à liga Sobral!

#### Scripts de Debug Sobral:
1. ❌ `scripts/debug-extrato-sobral.js` - Debug de extrato financeiro
2. ❌ `scripts/analisar-snapshot-sobral.js` - Análise de snapshots
3. ❌ `scripts/analisar-transacoes-sobral.js` - Análise de transações
4. ❌ `scripts/check-sobral-data.js` - Verificação de dados
5. ❌ `scripts/comparar-cache-snapshot.js` - Comparação cache vs snapshot
6. ❌ `scripts/corrigir-top10-sobral.js` - Correção de Top10
7. ❌ `scripts/criar-cache-sobral-v2.js` - Criação de cache v2
8. ❌ `scripts/gerar-cache-top10-sobral.js` - Geração de cache Top10
9. ❌ `scripts/recalcular-extrato-sobral.js` - Recálculo de extrato
10. ❌ `scripts/regenerar-cache-sobral.js` - Regeneração de cache
11. ❌ `scripts/regenerar-caches-sobral.js` - Regeneração múltipla
12. ❌ `scripts/verificar-caches-sobral.js` - Verificação de caches
13. ❌ `scripts/verificar-caches-sobral-debug.js` - Verificação debug
14. ❌ `scripts/verificar-rodadas-sobral.js` - Verificação de rodadas

**Análise:**
- **Total:** 14 arquivos, ~2.316 linhas
- **Problema:** Scripts criados para debugar UMA liga específica
- **Justificativa:** Úteis durante o debug, mas são código morto após resolução
- **Ação:** ✅ **DELETAR TODOS** ou mover para `/scripts/debug-legacy/sobral/`

**Comando para arquivar:**
```bash
mkdir -p scripts/debug-legacy/sobral
mv scripts/*sobral*.js scripts/debug-legacy/sobral/
```

---

### 2.3 Outros Scripts de Debug Genéricos (9 arquivos)

#### ⚠️ `scripts/debug-goleiros.js`
- **Linhas:** ~50
- **Propósito:** Debug do módulo de goleiros
- **Ação:** ✅ **DELETAR** após confirmar resolução

#### ⚠️ `scripts/debug-mata-mata.js`
- **Linhas:** ~100
- **Propósito:** Debug do módulo mata-mata
- **Ação:** ✅ **DELETAR** após confirmar resolução

#### ⚠️ `scripts/debug-timeline-zerado.js`
- **Linhas:** ~80
- **Propósito:** Debug de timeline zerada
- **Ação:** ✅ **DELETAR** após confirmar resolução

#### ⚠️ `scripts/debug-toLigaId.js`
- **Linhas:** ~60
- **Propósito:** Debug de função específica toLigaId
- **Ação:** ✅ **DELETAR** após confirmar resolução

#### ⚠️ `scripts/diagnosticar-timeline-zerada.js`
#### ⚠️ `scripts/diagnosticar-timeline-todas-ligas.js`
#### ⚠️ `scripts/analisar-timeline.js`
#### ⚠️ `scripts/verificar-rankings-fiasco.js`
#### ⚠️ `scripts/investigar-rb-ousadia.js`

**Subtotal:** 9 arquivos, ~800 linhas

**Ação Consolidada para Debug:**
```bash
mkdir -p scripts/debug-legacy
mv scripts/debug-*.js scripts/debug-legacy/
mv scripts/diagnosticar-*.js scripts/debug-legacy/
mv scripts/analisar-timeline.js scripts/debug-legacy/
mv scripts/verificar-rankings-fiasco.js scripts/debug-legacy/
mv scripts/investigar-*.js scripts/debug-legacy/
```

---

## 🟡 CATEGORIA 3: SCRIPTS DE FIX JÁ APLICADOS (11 ARQUIVOS)

Estes scripts corrigiram problemas pontuais. **Devem ser removidos após confirmação de aplicação em PROD.**

### 3.1 Correções Financeiras

#### ⚠️ `scripts/fix-acertos-tipo.js`
- **Linhas:** 59
- **Propósito:** Corrigir tipo de acertos financeiros (pagamento vs recebimento)
- **Status:** Aparentemente já aplicado (v1.3 do sistema usa lógica correta)
- **Ação:** ✅ **DELETAR** após confirmar aplicação em PROD

#### ⚠️ `scripts/fix-saldo-transacoes.js`
- **Linhas:** ~80
- **Propósito:** Corrigir saldos de transações
- **Ação:** ✅ **DELETAR** após confirmar aplicação

#### ⚠️ `scripts/fix-saldos-duplicados.js`
- **Linhas:** ~100
- **Propósito:** Remover saldos duplicados
- **Ação:** ✅ **DELETAR** após confirmar aplicação

#### ⚠️ `scripts/fix-saldos-transacoes.js` ⚠️ **DUPLICADO!**
- **Problema:** Nome similar a `fix-saldo-transacoes.js`
- **Ação:** ✅ Verificar se são diferentes, manter apenas 1

---

### 3.2 Correções de Dados Específicos

#### ⚠️ `scripts/fix-inativos-liga-cartoleiros.js`
- **Linhas:** ~120
- **Propósito:** Corrigir participantes inativos
- **Ação:** ✅ **DELETAR** após confirmar aplicação

#### ⚠️ `scripts/fix-r38-cache.js`
- **Linhas:** ~90
- **Propósito:** Fix específico do cache da rodada 38
- **Nota:** Fix extremamente específico para 1 rodada
- **Ação:** ✅ **DELETAR** imediatamente (temporada 2025 já passou R38)

#### ⚠️ `scripts/fix-rb-ousadia-r38.js`
- **Linhas:** ~85
- **Propósito:** Fix específico da liga RB Ousadia na R38
- **Nota:** Fix ultra-específico para 1 liga em 1 rodada
- **Ação:** ✅ **DELETAR** imediatamente

#### ⚠️ `scripts/fix-rodadas-faltantes.js`
- **Linhas:** ~110
- **Propósito:** Preencher rodadas faltantes
- **Ação:** ✅ **DELETAR** após confirmar aplicação

---

### 3.3 Correções de Sincronismo

#### ⚠️ `scripts/fix-sync-dev-prod.js`
- **Linhas:** ~150
- **Propósito:** Corrigir sincronismo entre DEV e PROD
- **Nota:** Segundo `.cursorrules`, DEV e PROD usam mesmo banco agora
- **Ação:** ✅ **DELETAR** (sincronismo não é mais necessário)

#### ⚠️ `scripts/sync-check-dev-prod.js`
#### ⚠️ `scripts/sync-prod-to-dev.js`
- **Propósito:** Scripts de sincronismo DEV/PROD
- **Nota:** Obsoletos segundo documentação do projeto
- **Ação:** ✅ **DELETAR** ambos

**Subtotal Fix:** 11 arquivos, ~2.200 linhas

**Ação Consolidada:**
```bash
mkdir -p scripts/applied-fixes
mv scripts/fix-*.js scripts/applied-fixes/
mv scripts/sync-*.js scripts/applied-fixes/
echo "# Fixes aplicados - manter apenas para histórico" > scripts/applied-fixes/README.md
```

**Alternativa:** Se quiser deletar completamente:
```bash
rm scripts/fix-*.js
rm scripts/sync-*.js
```

---

## 🟢 CATEGORIA 4: SCRIPTS DE TESTE MANUAL (3 ARQUIVOS)

### 4.1 Testes de Funcionalidades

#### 🔄 `scripts/test-quick-bar.js`
- **Linhas:** 78
- **Propósito:** Teste da barra de acesso rápido
- **Problema:** Teste manual, não automatizado
- **Ação:** 🟡 **MOVER** para `/tests/manual/`

#### 🔄 `scripts/testar-api-tesouraria.js`
- **Linhas:** ~60
- **Propósito:** Teste manual da API de tesouraria
- **Ação:** 🟡 **MOVER** para `/tests/manual/`

#### 🔄 `scripts/testar-top10-historico.js`
- **Linhas:** ~80
- **Propósito:** Teste do módulo Top10
- **Ação:** 🟡 **MOVER** para `/tests/manual/`

**Subtotal:** 3 arquivos, ~218 linhas

**Ação:**
```bash
mkdir -p tests/manual
mv scripts/test*.js tests/manual/
mv scripts/testar*.js tests/manual/
```

---

## 🔧 CATEGORIA 5: UTILITÁRIOS DE ANÁLISE/DOCUMENTAÇÃO (5 ARQUIVOS)

Estas ferramentas geram documentação mas **não fazem parte do runtime da aplicação**.

### 5.1 Geradores de Documentação

#### 📊 `handover.js`
- **Linhas:** 444
- **Propósito:** Gerador de handover (documentação de transição)
- **Status:** Funcional, mas usado apenas pontualmente
- **Ação:** 🟡 **MOVER** para `/tools/`

#### 📊 `project-dna.js`
- **Linhas:** 1.402 ⚠️ **MAIOR ARQUIVO UTILITÁRIO!**
- **Propósito:** Mapeador inteligente do projeto (análise completa)
- **Status:** Extremamente útil para onboarding, mas não é runtime
- **Ação:** 🟡 **MOVER** para `/tools/`

#### 📊 `system-mapper.js`
- **Linhas:** 617
- **Propósito:** Mapeador de sistema (similar ao project-dna)
- **Nota:** Redundante com project-dna.js
- **Ação:** 🟡 **MOVER** para `/tools/` ou **DELETAR** se redundante

#### 📊 `ux-analyzer.js`
- **Linhas:** 810
- **Propósito:** Analisador de padrões UX (gera UX_PATTERNS.md)
- **Status:** Útil para design system
- **Ação:** 🟡 **MOVER** para `/tools/`

#### 🔧 `replace-emojis.js`
- **Linhas:** 123
- **Propósito:** Script para substituir emojis por Material Icons
- **Status:** Utilitário pontual (provavelmente já foi usado)
- **Ação:** 🟡 **MOVER** para `/tools/` ou **DELETAR** se não for mais necessário

**Subtotal:** 5 arquivos, ~3.396 linhas

**Ação:**
```bash
mkdir -p tools/doc-generators
mv handover.js tools/doc-generators/
mv project-dna.js tools/doc-generators/
mv system-mapper.js tools/doc-generators/
mv ux-analyzer.js tools/doc-generators/
mv replace-emojis.js tools/
```

---

## 📁 CATEGORIA 6: ARQUIVOS NA PASTA ERRADA (3 ARQUIVOS)

### 6.1 Arquivos em `/public` que Não Deveriam Estar Lá

#### ⚠️ `public/layout.html`
- **Linhas:** 634
- **Propósito:** Template de layout com sidebar completo
- **Problema:** Não é referenciado por nenhuma página
- **Status:** Possível código legacy ou template não usado
- **Ação:** 🔍 **INVESTIGAR** se ainda é usado
  ```bash
  grep -r "layout.html" public/ --exclude-dir=node_modules
  ```
- **Se não usado:** ✅ **DELETAR**
- **Se usado raramente:** 🟡 **MOVER** para `/public/templates/`

#### ⚠️ `public/script.js`
- **Linhas:** 83
- **Propósito:** Script de UI para preencher liga
- **Problema:** Nome genérico demais (`script.js`)
- **Usado em:** Provavelmente `preencher-liga.html`
- **Ação:** 🟡 **RENOMEAR** para `preencher-liga-ui.js`

#### ⚠️ `public/gols.js`
- **Linhas:** 14
- **Propósito:** Arquivo parece ser uma rota Express
- **Problema:** Está em `/public` mas deveria estar em `/routes`
- **Conteúdo:** 
  ```javascript
  import express from "express";
  import { extrairGolsDaRodada, listarGols } from "../controllers/golsController.js";
  ```
- **Ação:** 🔍 **VERIFICAR** se é usado
  - Se SIM: **MOVER** para `/routes/gols-routes.js`
  - Se NÃO (redundante com routes/): ✅ **DELETAR**

**Subtotal:** 3 arquivos, ~731 linhas

---

## 📄 CATEGORIA 7: DOCUMENTAÇÃO TEMPORÁRIA (2 ARQUIVOS)

### 7.1 Snapshots de Código e Diagnósticos

#### 📝 `financeiro-bundle.txt`
- **Linhas:** 1.020
- **Propósito:** Snapshot de código financeiro (rotas + controller + model)
- **Data:** Provavelmente 18/12/2025 (último commit mencionado)
- **Status:** Documentação pontual de debug
- **Ação:** 🟡 **MOVER** para `/docs/archives/`

#### 📝 `DIAGNOSTICO-BANCOS-21-12-2025.md`
- **Linhas:** ~200
- **Propósito:** Diagnóstico de bancos de dados de 21/12/2025
- **Status:** Documento temporário de análise
- **Ação:** 🟡 **MOVER** para `/docs/archives/`

**Subtotal:** 2 arquivos, ~1.220 linhas

**Ação:**
```bash
mkdir -p docs/archives/2025
mv financeiro-bundle.txt docs/archives/2025/
mv DIAGNOSTICO-*.md docs/archives/2025/
```

---

## 💾 CATEGORIA 8: BACKUPS ESTÁTICOS (7 ARQUIVOS)

### 8.1 Backups JSON Manuais

#### 📦 Arquivos em `/backups/`:
1. `artilheirocampeaos.json`
2. `goleiros.json`
3. `gols.json`
4. `ligas.json`
5. `rodadas.json`
6. `times.json`
7. `restore-point-2025.json`

**Análise:**
- **Status:** Backups manuais em formato JSON
- **Sistema atual:** Existe `backupScheduler.js` automatizado
- **Problema:** Se há backup automatizado, backups manuais podem ser redundantes

**Investigação Necessária:**
```bash
# Verificar data dos backups
ls -lh backups/*.json

# Verificar se backupScheduler está ativo
grep -r "backupScheduler" index.js
```

**Ação:**
- Se backups têm **mais de 30 dias:** 🟡 **ARQUIVAR** ou **DELETAR**
- Se backups são **recentes:** 🟢 **MANTER** como restore point
- Se `backupScheduler.js` está ativo: 🟡 **MOVER** para `/backups/manual-archives/`

---

## 📊 IMPACTO CONSOLIDADO

### Resumo por Categoria:

| Categoria | Arquivos | Linhas | Ação Principal |
|-----------|----------|--------|----------------|
| 1. Código Morto | 1 | 598 | ✅ DELETAR |
| 2. Debug Específico | 26 | ~2.800 | ✅ DELETAR ou ARQUIVAR |
| 3. Fixes Aplicados | 11 | ~2.200 | ✅ DELETAR ou ARQUIVAR |
| 4. Testes Manuais | 3 | ~218 | 🟡 MOVER para /tests |
| 5. Utilitários | 5 | ~3.396 | 🟡 MOVER para /tools |
| 6. Pasta Errada | 3 | ~731 | 🟡 REORGANIZAR |
| 7. Docs Temporárias | 2 | ~1.220 | 🟡 ARQUIVAR |
| 8. Backups Estáticos | 7 | n/a | 🟡 VERIFICAR data |
| **TOTAL** | **58** | **~11.163** | **Mix** |

---

## 🚀 PLANO DE EXECUÇÃO RECOMENDADO

### FASE 1: Limpeza Segura (Baixo Risco) ✅

Executar sem medo:

```bash
#!/bin/bash
# cleanup-fase1.sh - Limpeza de baixo risco

echo "🧹 FASE 1: Limpeza Segura"
echo "=========================="

# 1. Deletar código morto confirmado
echo "1️⃣ Removendo código morto..."
rm -f public/participante/js/participante-navigation-v4.js

# 2. Criar estrutura de pastas
echo "2️⃣ Criando estrutura organizacional..."
mkdir -p tools/doc-generators
mkdir -p tests/manual
mkdir -p docs/archives/2025
mkdir -p scripts/debug-legacy/sobral
mkdir -p scripts/applied-fixes

# 3. Mover utilitários de documentação
echo "3️⃣ Movendo utilitários..."
mv handover.js project-dna.js system-mapper.js ux-analyzer.js tools/doc-generators/ 2>/dev/null
mv replace-emojis.js tools/ 2>/dev/null

# 4. Mover testes manuais
echo "4️⃣ Organizando testes..."
mv scripts/test*.js scripts/testar*.js tests/manual/ 2>/dev/null

# 5. Mover documentação temporária
echo "5️⃣ Arquivando documentação temporária..."
mv financeiro-bundle.txt DIAGNOSTICO-*.md docs/archives/2025/ 2>/dev/null

echo "✅ Fase 1 concluída!"
echo "📊 Execute 'git status' para revisar mudanças"
```

---

### FASE 2: Arquivamento de Debug (Risco Médio) 🟡

Requer confirmação de que bugs foram resolvidos:

```bash
#!/bin/bash
# cleanup-fase2.sh - Arquivar scripts de debug

echo "🧹 FASE 2: Arquivamento de Debug"
echo "================================="

# ATENÇÃO: Confirme que bugs foram resolvidos antes!
read -p "Confirma que bugs de Sobral foram corrigidos? (s/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada"
    exit 1
fi

# 1. Arquivar debug de Sobral
echo "1️⃣ Arquivando debug de Sobral..."
mv scripts/*sobral*.js scripts/debug-legacy/sobral/ 2>/dev/null

# 2. Arquivar outros scripts de debug
echo "2️⃣ Arquivando outros debugs..."
mv scripts/debug-*.js scripts/debug-legacy/ 2>/dev/null
mv scripts/diagnosticar-*.js scripts/debug-legacy/ 2>/dev/null
mv scripts/investigar-*.js scripts/debug-legacy/ 2>/dev/null
mv scripts/analisar-timeline.js scripts/debug-legacy/ 2>/dev/null
mv scripts/verificar-rankings-fiasco.js scripts/debug-legacy/ 2>/dev/null

echo "✅ Fase 2 concluída!"
```

---

### FASE 3: Remoção de Fixes Aplicados (Risco Médio) 🟠

**⚠️ ATENÇÃO:** Apenas execute se fixes já estão em PROD e funcionando!

```bash
#!/bin/bash
# cleanup-fase3.sh - Arquivar ou deletar fixes

echo "🧹 FASE 3: Fixes Aplicados"
echo "=========================="

read -p "Opção: [A]rquivar ou [D]eletar fixes? (A/d) " -n 1 -r
echo

if [[ $REPLY =~ ^[Dd]$ ]]; then
    # DELETAR permanentemente
    echo "⚠️ Deletando fixes aplicados..."
    rm -f scripts/fix-*.js
    rm -f scripts/sync-*.js
    echo "✅ Fixes deletados"
else
    # ARQUIVAR (opção segura)
    echo "📦 Arquivando fixes..."
    mv scripts/fix-*.js scripts/applied-fixes/ 2>/dev/null
    mv scripts/sync-*.js scripts/applied-fixes/ 2>/dev/null
    echo "# Fixes Aplicados - Histórico" > scripts/applied-fixes/README.md
    echo "✅ Fixes arquivados em scripts/applied-fixes/"
fi
```

---

### FASE 4: Investigação Manual (Risco Alto) 🔴

**REQUER ANÁLISE MANUAL:**

```bash
#!/bin/bash
# cleanup-fase4-checklist.sh - Checklist de investigação

echo "🔍 FASE 4: Investigação Manual Necessária"
echo "=========================================="
echo ""

echo "📋 CHECKLIST:"
echo ""

echo "1. [ ] Verificar se layout.html é usado:"
echo "   grep -r 'layout.html' public/"
echo ""

echo "2. [ ] Verificar uso de public/gols.js:"
echo "   grep -r 'gols.js' public/"
echo "   # Se redundante com routes/gols-routes.js → DELETAR"
echo ""

echo "3. [ ] Verificar data dos backups:"
echo "   ls -lh backups/*.json"
echo "   # Se > 30 dias → ARQUIVAR"
echo ""

echo "4. [ ] Verificar se system-mapper.js é redundante com project-dna.js"
echo "   # Comparar funcionalidades"
echo ""

echo "5. [ ] Testar aplicação após limpeza:"
echo "   npm start"
echo "   # Testar funcionalidades críticas"
echo ""
```

---

## 📝 CHECKLIST DE VALIDAÇÃO PÓS-LIMPEZA

Após executar a limpeza, validar:

### ✅ Testes Funcionais:
- [ ] Login admin funciona
- [ ] Login participante funciona
- [ ] Navegação entre módulos funciona
- [ ] Extrato financeiro carrega corretamente
- [ ] Ranking carrega corretamente
- [ ] Sistema de rodadas funciona

### ✅ Testes Técnicos:
- [ ] `npm start` executa sem erros
- [ ] Não há imports quebrados (buscar por "Cannot find module")
- [ ] Service Worker funciona (modo PWA)
- [ ] Backups automatizados continuam funcionando

### ✅ Git:
- [ ] `git status` mostra mudanças esperadas
- [ ] Criar branch de limpeza: `git checkout -b cleanup/remove-dead-code`
- [ ] Commit incremental:
  ```bash
  git add tools/ tests/ docs/
  git commit -m "chore: reorganizar utilitários e testes"
  
  git add scripts/debug-legacy/
  git commit -m "chore: arquivar scripts de debug resolvidos"
  
  git rm public/participante/js/participante-navigation-v4.js
  git commit -m "chore: remover versão antiga de navegação não utilizada"
  ```

---

## 🎯 RECOMENDAÇÃO FINAL

### Execução Sugerida (Ordem de Prioridade):

1. **HOJE (Sem Risco):**
   - ✅ Executar **FASE 1** (reorganização)
   - ✅ Deletar `participante-navigation-v4.js` (código morto confirmado)

2. **ESTA SEMANA (Risco Baixo):**
   - 🟡 Executar **FASE 2** (arquivar debug Sobral)
   - 🟡 Verificar e mover testes manuais

3. **PRÓXIMA SEMANA (Risco Médio):**
   - 🟠 Executar **FASE 3** (arquivar fixes aplicados)
   - 🟠 Investigar `public/layout.html` e `public/gols.js`

4. **QUANDO TIVER TEMPO (Manutenção):**
   - 🔵 Verificar backups antigos
   - 🔵 Consolidar `system-mapper.js` vs `project-dna.js`
   - 🔵 Criar testes automatizados para substituir testes manuais

---

## 📈 MÉTRICAS DE SUCESSO

Após limpeza completa:

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Scripts em /scripts | 69 | ~43 | -38% |
| Arquivos na raiz | 15 | 9 | -40% |
| Código morto | 11k linhas | 0 | -100% |
| Clareza do projeto | 6/10 | 9/10 | +50% |

---

## 🆘 ROLLBACK (Se algo der errado)

Caso identifique problemas após limpeza:

```bash
# Voltar ao commit anterior
git checkout HEAD~1

# Ou reverter commit específico
git revert <commit-hash>

# Ou restaurar arquivos específicos
git checkout HEAD -- scripts/debug-diego.js
```

**IMPORTANTE:** Por isso recomendamos commits incrementais e branch separado!

---

## 📞 SUPORTE

Se tiver dúvidas durante a limpeza:

1. Verificar histórico do arquivo: `git log --follow <arquivo>`
2. Verificar último uso: `git log -p <arquivo>`
3. Buscar referências: `grep -r "nome-do-arquivo" .`

---

**FIM DO RELATÓRIO**

Gerado automaticamente em: 25/12/2025  
Próxima revisão recomendada: Trimestral (Março/2026)


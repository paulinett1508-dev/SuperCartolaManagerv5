# PRD - Otimizacoes Admin: Performance + Refatoracao

**Data:** 2026-01-22
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

Este PRD consolida 3 pontos de melhoria identificados para o painel administrativo:

1. **REFACTOR-001 Validacao** - CSS extraido funcionando, pronto para proxima fase
2. **REFACTOR-002 Auditoria/PDF** - ~855 linhas candidatas a extracao do UI
3. **PERFORMANCE-001 .lean()** - ~107 queries Mongoose sem .lean() impactando performance

O objetivo e dar continuidade a decomposicao do monolito `fluxo-financeiro-ui.js` e melhorar a performance geral do backend.

---

## Contexto e Analise

### 1. REFACTOR-001 - Status: VALIDADO

**Arquivos envolvidos:**
- `public/js/fluxo-financeiro/fluxo-financeiro-styles.js` (1.831 linhas) - CRIADO
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` (5.214 linhas) - REDUZIDO 26%

**Verificacao tecnica:**
| Item | Status |
|------|--------|
| Imports corretos (5 funcoes) | OK |
| Chamadas no codigo (linhas 792-794, 1319, 3659) | OK |
| Referencias antigas removidas | OK |
| Total linhas UI+Styles = 7.045 (proximo ao original) | OK |

**Conclusao:** Fase 1-3 concluidas. Apenas validacao em browser pendente.

---

### 2. REFACTOR-002 - Modulo Auditoria/PDF

**Localizacao no fluxo-financeiro-ui.js:**

| Bloco | Linhas | Quantidade |
|-------|--------|------------|
| `window.abrirAuditoria()` | 3072-3138 | ~67 linhas |
| `window.exportarExtratoPDF()` | 3141-3475 | ~335 linhas |
| Modal Auditoria Financeira | 3613-4066 | ~453 linhas |
| **TOTAL** | - | **~855 linhas (16% do UI)** |

**Arquivos relacionados:**
- `public/js/fluxo-financeiro/fluxo-financeiro-auditoria.js` (1.155 linhas) - Classe existente
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` - Funcoes globais window.xxx

**Funcoes candidatas a extracao:**
```javascript
// Funcoes globais no UI que podem ser movidas
window.abrirAuditoria(timeId)
window.exportarExtratoPDF(timeId)
window.abrirAuditoriaFinanceira(timeId, ligaId, nomeParticipante)
window.fecharModalAuditoria()
window.exportarAuditoriaPDF()
function injetarModalAuditoria()
function renderizarConteudoAuditoria(data, container, subtitulo)
function gerarPDFAuditoria()
```

**Dependencias mapeadas:**
- jsPDF (biblioteca externa carregada via CDN)
- `fluxo-financeiro-auditoria.js` (classe FluxoFinanceiroAuditoria)
- `fluxo-financeiro-styles.js` (injetarEstilosModalAuditoriaFinanceira)

---

### 3. PERFORMANCE-001 - Queries sem .lean()

**Analise quantitativa:**

| Local | .find() | .findOne() | Total |
|-------|---------|------------|-------|
| Controllers | 32 | 48 | 80 |
| Routes | 27 | 0 | 27 |
| **TOTAL** | **59** | **48** | **~107** |

**Arquivos com mais queries sem .lean():**
- `controllers/inscricoesController.js` - 8+ queries
- `controllers/quitacaoController.js` - 6+ queries
- `controllers/consolidacaoController.js` - 5+ queries
- `controllers/ligaController.js` - 5+ queries
- `controllers/pontosCorridosCacheController.js` - 4+ queries

**Impacto esperado:**
- .lean() retorna POJO em vez de Mongoose Document
- Reducao de ~40-60% no uso de memoria por query
- Melhoria de performance em leituras (maioria das queries)

**Criterios para aplicar .lean():**
- Queries de LEITURA pura (nao vai chamar .save())
- Nao precisa de virtuals ou getters do Model
- Nao precisa de middleware de instancia

---

## Solucao Proposta

### Fase 1: Validar REFACTOR-001 (Imediato)
1. Testar em browser que estilos carregam corretamente
2. Verificar console por erros de import
3. Marcar como CONCLUIDO no pending-tasks.md

### Fase 2: Extrair Auditoria/PDF (REFACTOR-002)

**Novo arquivo a criar:**
- `public/js/fluxo-financeiro/fluxo-financeiro-pdf.js` (~855 linhas)

**Estrutura proposta:**
```javascript
// fluxo-financeiro-pdf.js
import { injetarEstilosModalAuditoriaFinanceira } from "./fluxo-financeiro-styles.js";

// Variaveis de estado
let auditoriaAtual = null;

// Modal de Auditoria
export function injetarModalAuditoria() { ... }
export function abrirAuditoriaFinanceira(timeId, ligaId, nomeParticipante) { ... }
export function renderizarConteudoAuditoria(data, container, subtitulo) { ... }
export function fecharModalAuditoria() { ... }

// Exportacao PDF
export function exportarExtratoPDF(timeId) { ... }
export function exportarAuditoriaPDF() { ... }
function gerarPDFAuditoria() { ... }

// Funcao de inicializacao (registra window.xxx)
export function inicializarPDF() {
    window.exportarExtratoPDF = exportarExtratoPDF;
    window.exportarAuditoriaPDF = exportarAuditoriaPDF;
    window.abrirAuditoriaFinanceira = abrirAuditoriaFinanceira;
    window.fecharModalAuditoria = fecharModalAuditoria;
}
```

**Modificacoes no fluxo-financeiro-ui.js:**
1. Adicionar import: `import { inicializarPDF } from "./fluxo-financeiro-pdf.js";`
2. Chamar `inicializarPDF()` no constructor da classe
3. Remover ~855 linhas de codigo (linhas 3072-4066)
4. Resultado esperado: UI de 5.214 -> ~4.359 linhas (-16%)

### Fase 3: Aplicar .lean() (PERFORMANCE-001)

**Abordagem incremental:**
1. Comecar pelos controllers mais criticos (inscricoes, quitacao)
2. Validar que nenhuma query precisa de metodos do Document
3. Aplicar .lean() progressivamente
4. Testar apos cada batch de mudancas

**Padrao de modificacao:**
```javascript
// ANTES
const dados = await Model.find({ ligaId }).sort({ rodada: 1 });

// DEPOIS
const dados = await Model.find({ ligaId }).sort({ rodada: 1 }).lean();
```

---

## Riscos e Consideracoes

### REFACTOR-002 (Auditoria/PDF)
| Risco | Mitigacao |
|-------|-----------|
| Funcoes window.xxx nao registradas | Chamar inicializarPDF() no boot |
| Dependencia circular | Manter imports unidirecionais |
| jsPDF nao carregado | Verificar window.jspdf antes de usar |

### PERFORMANCE-001 (.lean())
| Risco | Mitigacao |
|-------|-----------|
| Query que precisa .save() | Nao aplicar .lean() nessas queries |
| Virtuals nao populados | Verificar se model tem virtuals |
| Testes falhando | Aplicar incrementalmente, testar cada batch |

### Multi-Tenant
- [x] Validado: Todas as queries ja filtram por ligaId (auditoria P1 anterior)

---

## Testes Necessarios

### REFACTOR-001 (Validacao)
1. Acessar /admin/fluxo-financeiro
2. Verificar que tabela renderiza com estilos
3. Abrir modal de extrato individual
4. Verificar console por erros

### REFACTOR-002 (Auditoria/PDF)
1. Abrir auditoria de um participante
2. Exportar PDF do extrato
3. Exportar PDF da auditoria
4. Verificar que modal abre/fecha corretamente

### PERFORMANCE-001 (.lean())
1. Testar endpoints de leitura (GET /api/fluxo-financeiro/*)
2. Monitorar tempo de resposta antes/depois
3. Verificar que dados retornados estao corretos

---

## Proximos Passos

1. **Validar PRD** - Revisar com usuario
2. **Gerar Spec REFACTOR-002** - `/spec .claude/docs/PRD-admin-performance-refactor.md`
3. **Implementar** - `/code` com Spec gerado

---

## Metricas de Sucesso

| Metrica | Atual | Meta |
|---------|-------|------|
| Linhas fluxo-financeiro-ui.js | 5.214 | ~4.359 (-16%) |
| Queries sem .lean() | ~107 | 0 |
| Modulos CSS + PDF extraidos | 1 | 2 |

---

**Gerado por:** Pesquisa Protocol v1.0
**Branch sugerida:** `refactor/admin-performance-optimization`

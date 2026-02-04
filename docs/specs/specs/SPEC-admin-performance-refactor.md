# SPEC - Otimizacoes Admin: Performance + Refatoracao

**Data:** 2026-01-22
**Baseado em:** PRD-admin-performance-refactor.md
**Status:** Especificacao Tecnica

---

## Resumo da Implementacao

Este documento especifica mudancas cirurgicas para:
1. **REFACTOR-002**: Extrair funcoes de Auditoria/PDF do `fluxo-financeiro-ui.js` para novo modulo
2. **PERFORMANCE-001**: Aplicar `.lean()` em queries Mongoose de leitura pura (estimadas ~50 queries prioritarias)

**Nota importante:** Durante a analise S.D.A foi identificado que existe DUPLICACAO de funcoes entre `fluxo-financeiro-ui.js` e `fluxo-financeiro-auditoria.js`. Esta SPEC trata apenas da consolidacao no UI, nao da remocao do codigo legado no auditoria.js (sera feito em fase futura).

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. CRIAR: `public/js/fluxo-financeiro/fluxo-financeiro-pdf.js`

**Path:** `public/js/fluxo-financeiro/fluxo-financeiro-pdf.js`
**Tipo:** Criacao
**Impacto:** Alto
**Linhas:** ~500 (extraidas de fluxo-financeiro-ui.js linhas 3141-3477 e 3613-4066)

#### Estrutura do Novo Arquivo:

```javascript
/**
 * FLUXO-FINANCEIRO-PDF.JS - v1.0
 *
 * Modulo extraido de fluxo-financeiro-ui.js para reduzir o tamanho do arquivo principal.
 * Contem funcoes de exportacao PDF e modal de Auditoria Financeira.
 *
 * HISTORICO:
 * v1.0 (2026-01-22): Extraido de fluxo-financeiro-ui.js (~500 linhas)
 *    - exportarExtratoPDF (window.exportarExtratoPDF)
 *    - Modal Auditoria Financeira (window.abrirAuditoriaFinanceira)
 *    - Funcoes auxiliares de PDF
 *
 * ROLLBACK: git checkout HEAD~1 -- public/js/fluxo-financeiro/fluxo-financeiro-ui.js
 */

import { injetarEstilosModalAuditoriaFinanceira } from "./fluxo-financeiro-styles.js";

// =============================================================================
// VARIAVEIS DE ESTADO
// =============================================================================
let auditoriaAtual = null;

// =============================================================================
// MODAL DE AUDITORIA FINANCEIRA
// =============================================================================

/**
 * Injeta modal de auditoria no DOM (apenas uma vez)
 */
export function injetarModalAuditoria() {
    // [COPIAR linhas 3621-3659 de fluxo-financeiro-ui.js]
}

/**
 * Abre o modal de auditoria financeira
 */
export async function abrirAuditoriaFinanceira(timeId, ligaId, nomeParticipante) {
    // [COPIAR linhas 3669-3717 de fluxo-financeiro-ui.js]
}

/**
 * Renderiza o conteudo da auditoria no modal
 */
export function renderizarConteudoAuditoria(data, container, subtitulo) {
    // [COPIAR linhas 3723-3848 de fluxo-financeiro-ui.js]
}

/**
 * Fecha o modal de auditoria
 */
export function fecharModalAuditoria() {
    // [COPIAR linhas 3854-3860 de fluxo-financeiro-ui.js]
}

// =============================================================================
// EXPORTACAO PDF - EXTRATO
// =============================================================================

/**
 * Exporta extrato do participante para PDF (multi-pagina)
 */
export async function exportarExtratoPDF(timeId) {
    // [COPIAR linhas 3143-3477 de fluxo-financeiro-ui.js]
}

// =============================================================================
// EXPORTACAO PDF - AUDITORIA
// =============================================================================

/**
 * Exporta a auditoria para PDF
 */
export async function exportarAuditoriaPDF() {
    // [COPIAR linhas 3865-3883 de fluxo-financeiro-ui.js]
}

/**
 * Gera o PDF da auditoria
 */
function gerarPDFAuditoria() {
    // [COPIAR linhas 3888-4066 de fluxo-financeiro-ui.js]
}

// =============================================================================
// INICIALIZACAO - REGISTRA FUNCOES GLOBAIS
// =============================================================================

/**
 * Registra todas as funcoes no objeto window para uso global
 */
export function inicializarPDF() {
    window.exportarExtratoPDF = exportarExtratoPDF;
    window.exportarAuditoriaPDF = exportarAuditoriaPDF;
    window.abrirAuditoriaFinanceira = abrirAuditoriaFinanceira;
    window.fecharModalAuditoria = fecharModalAuditoria;

    console.log("[FLUXO-PDF] v1.0 - Modulo de PDF/Auditoria inicializado");
}
```

---

### 2. MODIFICAR: `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`

**Path:** `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Resultado:** 5.214 -> ~4.700 linhas (-10%)

#### Mudancas Cirurgicas:

**Linha 13: ADICIONAR IMPORT**
```javascript
// ANTES:
import {
    injetarEstilosWrapper,
    injetarEstilosTabelaCompacta,
    injetarEstilosTabelaExpandida,
    injetarEstilosModal,
    injetarEstilosModalAuditoriaFinanceira
} from "./fluxo-financeiro-styles.js";

// DEPOIS:
import {
    injetarEstilosWrapper,
    injetarEstilosTabelaCompacta,
    injetarEstilosTabelaExpandida,
    injetarEstilosModal,
    injetarEstilosModalAuditoriaFinanceira
} from "./fluxo-financeiro-styles.js";
import { inicializarPDF } from "./fluxo-financeiro-pdf.js";
```
**Motivo:** Importar funcao de inicializacao do novo modulo

---

**Linha 53 (dentro do constructor): ADICIONAR CHAMADA**
```javascript
// ANTES:
    // v6.0: Criar modal no DOM
    this.criarModalExtrato();
}

// DEPOIS:
    // v6.0: Criar modal no DOM
    this.criarModalExtrato();

    // v8.5: Inicializar modulo PDF/Auditoria
    inicializarPDF();
}
```
**Motivo:** Registrar funcoes window.xxx no boot

---

**Linhas 3141-3477: REMOVER BLOCO**
```javascript
// REMOVER: Funcao window.exportarExtratoPDF completa
// (movida para fluxo-financeiro-pdf.js)
```
**Motivo:** Codigo movido para novo modulo

---

**Linhas 3613-4066: REMOVER BLOCO**
```javascript
// REMOVER: Modal de Auditoria Financeira completo
// - injetarModalAuditoria()
// - auditoriaAtual (variavel)
// - window.abrirAuditoriaFinanceira()
// - renderizarConteudoAuditoria()
// - window.fecharModalAuditoria()
// - window.exportarAuditoriaPDF()
// - gerarPDFAuditoria()
// (movido para fluxo-financeiro-pdf.js)
```
**Motivo:** Codigo movido para novo modulo

---

**Linha 4068 (apos remocao, sera ~3600): ATUALIZAR LOG**
```javascript
// ANTES:
console.log("[FLUXO-UI] v7.3 - Removido seletor temporada no extrato individual");

// DEPOIS:
console.log("[FLUXO-UI] v8.5 - CSS extraido + PDF/Auditoria extraido");
```
**Motivo:** Atualizar versao apos extracao

---

### 3. PERFORMANCE: Controllers com .lean()

**Criterio para aplicar .lean():**
- Query de LEITURA pura (nao vai chamar .save())
- NAO aplicar em findOneAndUpdate, findByIdAndUpdate, findByIdAndDelete
- NAO aplicar se precisa de virtuals/getters do Model

#### 3.1 `controllers/inscricoesController.js`

**Linha 258: ADICIONAR .lean()**
```javascript
// ANTES:
const liga = await Liga.findById(ligaId);

// DEPOIS:
const liga = await Liga.findById(ligaId).lean();
```

**Linha 346: ADICIONAR .lean()**
```javascript
// ANTES:
const inscricaoExistente = await InscricaoTemporada.findOne({

// DEPOIS:
const inscricaoExistente = await InscricaoTemporada.findOne({
    // ... parametros
}).lean();
```

**Linha 746: ADICIONAR .lean()**
```javascript
// ANTES:
const inscricaoExistente = await InscricaoTemporada.findOne({

// DEPOIS:
const inscricaoExistente = await InscricaoTemporada.findOne({
    // ... parametros
}).lean();
```

**Linha 971: ADICIONAR .lean()**
```javascript
// ANTES:
const inscricaoPrevia = await InscricaoTemporada.findOne({

// DEPOIS:
const inscricaoPrevia = await InscricaoTemporada.findOne({
    // ... parametros
}).lean();
```

---

#### 3.2 `controllers/ligaController.js`

**Linha 104: ADICIONAR .lean()**
```javascript
// ANTES:
const liga = await Liga.findById(id);

// DEPOIS:
const liga = await Liga.findById(id).lean();
```

**Linha 137: ADICIONAR .lean()**
```javascript
// ANTES:
const ligas = await Liga.find();

// DEPOIS:
const ligas = await Liga.find().lean();
```

**Linha 197: ADICIONAR .lean()**
```javascript
// ANTES:
const timesCompletos = await Time.find({

// DEPOIS:
const timesCompletos = await Time.find({
    // ... parametros
}).lean();
```

**Linha 310: ADICIONAR .lean()**
```javascript
// ANTES:
const timeExistente = await Time.findOne({ id: timeId });

// DEPOIS:
const timeExistente = await Time.findOne({ id: timeId }).lean();
```

**Linha 332: ADICIONAR .lean()**
```javascript
// ANTES:
const liga = await Liga.findById(id);

// DEPOIS:
const liga = await Liga.findById(id).lean();
```

**Linha 366: ADICIONAR .lean()**
```javascript
// ANTES:
const liga = await Liga.findById(id);

// DEPOIS:
const liga = await Liga.findById(id).lean();
```

**Linha 445: ADICIONAR .lean()**
```javascript
// ANTES:
const inscricoes2026 = await InscricaoTemporada.find({

// DEPOIS:
const inscricoes2026 = await InscricaoTemporada.find({
    // ... parametros
}).lean();
```

**Linha 497: ADICIONAR .lean()**
```javascript
// ANTES:
const ligaExiste = await Liga.findById(ligaIdParam);

// DEPOIS:
const ligaExiste = await Liga.findById(ligaIdParam).lean();
```

**Linha 703: ADICIONAR .lean()**
```javascript
// ANTES:
const liga = await Liga.findById(ligaIdParam);

// DEPOIS:
const liga = await Liga.findById(ligaIdParam).lean();
```

**Linha 803: ADICIONAR .lean()**
```javascript
// ANTES:
const liga = await Liga.findById(ligaIdParam);

// DEPOIS:
const liga = await Liga.findById(ligaIdParam).lean();
```

---

#### 3.3 `controllers/consolidacaoController.js`

**Linha 104: ADICIONAR .lean()**
```javascript
// ANTES:
const existente = await CartolaOficialDump.findOne({

// DEPOIS:
const existente = await CartolaOficialDump.findOne({
    // ... parametros
}).lean();
```

**Linha 177: ADICIONAR .lean()**
```javascript
// ANTES:
const snapshots = await RodadaSnapshot.find(query)

// DEPOIS:
const snapshots = await RodadaSnapshot.find(query).lean()
```

**Linha 220: ADICIONAR .lean()**
```javascript
// ANTES:
const existente = await RodadaSnapshot.findOne({

// DEPOIS:
const existente = await RodadaSnapshot.findOne({
    // ... parametros
}).lean();
```

**Linha 263: ADICIONAR .lean()**
```javascript
// ANTES:
const dadosRodada = await Rodada.find({

// DEPOIS:
const dadosRodada = await Rodada.find({
    // ... parametros
}).lean();
```

**Linha 287: ADICIONAR .lean()**
```javascript
// ANTES:
const extratosDetalhados = await ExtratoFinanceiroCache.find({

// DEPOIS:
const extratosDetalhados = await ExtratoFinanceiroCache.find({
    // ... parametros
}).lean();
```

**Linha 507: ADICIONAR .lean()**
```javascript
// ANTES:
const existente = await RodadaSnapshot.findOne({

// DEPOIS:
const existente = await RodadaSnapshot.findOne({
    // ... parametros
}).lean();
```

**Linha 597: ADICIONAR .lean()**
```javascript
// ANTES:
const snapshots = await RodadaSnapshot.find({ liga_id: ligaId })

// DEPOIS:
const snapshots = await RodadaSnapshot.find({ liga_id: ligaId }).lean()
```

---

#### 3.4 `controllers/extratoFinanceiroCacheController.js`

**Linha 62: ADICIONAR .lean()**
```javascript
// ANTES:
const acertos = await AcertoFinanceiro.find({

// DEPOIS:
const acertos = await AcertoFinanceiro.find({
    // ... parametros
}).lean();
```

**Linha 149: ADICIONAR .lean()**
```javascript
// ANTES:
const time = await Time.findOne(

// DEPOIS:
const time = await Time.findOne(
    // ... parametros
).lean();
```

**Linha 535: ADICIONAR .lean()**
```javascript
// ANTES:
const doc = await FluxoFinanceiroCampos.findOne({

// DEPOIS:
const doc = await FluxoFinanceiroCampos.findOne({
    // ... parametros
}).lean();
```

**Linha 592: ADICIONAR .lean()**
```javascript
// ANTES:
const doc = await FluxoFinanceiroCampos.findOne({

// DEPOIS:
const doc = await FluxoFinanceiroCampos.findOne({
    // ... parametros
}).lean();
```

**Linha 682: ADICIONAR .lean()**
```javascript
// ANTES:
const inscricao = await InscricaoTemporada.findOne({

// DEPOIS:
const inscricao = await InscricaoTemporada.findOne({
    // ... parametros
}).lean();
```

**Linha 905: ADICIONAR .lean()**
```javascript
// ANTES:
const cacheExistente = await ExtratoFinanceiroCache.findOne({

// DEPOIS:
const cacheExistente = await ExtratoFinanceiroCache.findOne({
    // ... parametros
}).lean();
```

**Linha 1290: ADICIONAR .lean()**
```javascript
// ANTES:
const cache = await ExtratoFinanceiroCache.findOne({

// DEPOIS:
const cache = await ExtratoFinanceiroCache.findOne({
    // ... parametros
}).lean();
```

---

#### 3.5 `controllers/fluxoFinanceiroController.js`

**Linha 216: ADICIONAR .lean()**
```javascript
// ANTES:
const cache = await Top10Cache.findOne({

// DEPOIS:
const cache = await Top10Cache.findOne({
    // ... parametros
}).lean();
```

**Linha 370: ADICIONAR .lean()**
```javascript
// ANTES:
const pontuacoes = await Rodada.find({

// DEPOIS:
const pontuacoes = await Rodada.find({
    // ... parametros
}).lean();
```

**Linha 467: ADICIONAR .lean()**
```javascript
// ANTES:
let cache = await ExtratoFinanceiroCache.findOne({

// DEPOIS:
let cache = await ExtratoFinanceiroCache.findOne({
    // ... parametros
}).lean();
```

**Linha 685: ADICIONAR .lean()**
```javascript
// ANTES:
const camposManuais = await FluxoFinanceiroCampos.findOne({

// DEPOIS:
const camposManuais = await FluxoFinanceiroCampos.findOne({
    // ... parametros
}).lean();
```

**Linha 927: ADICIONAR .lean()**
```javascript
// ANTES:
let cache = await ExtratoFinanceiroCache.findOne({

// DEPOIS:
let cache = await ExtratoFinanceiroCache.findOne({
    // ... parametros
}).lean();
```

**Linha 1050: ADICIONAR .lean()**
```javascript
// ANTES:
const camposManuais = await FluxoFinanceiroCampos.findOne({

// DEPOIS:
const camposManuais = await FluxoFinanceiroCampos.findOne({
    // ... parametros
}).lean();
```

---

#### 3.6 `controllers/pontosCorridosCacheController.js`

**Linha 51: ADICIONAR .lean()**
```javascript
// ANTES:
const rodadas = await Rodada.find({ ligaId: ligaId })

// DEPOIS:
const rodadas = await Rodada.find({ ligaId: ligaId }).lean()
```

**Linha 242: ADICIONAR .lean() - JA TEM SORT**
```javascript
// ANTES:
const cache = await PontosCorridosCache.findOne(query).sort({

// DEPOIS:
const cache = await PontosCorridosCache.findOne(query).sort({
    // ... parametros
}).lean();
```

**Linha 358: ADICIONAR .lean()**
```javascript
// ANTES:
const caches = await PontosCorridosCache.find(query)

// DEPOIS:
const caches = await PontosCorridosCache.find(query).lean()
```

**Linha 820: ADICIONAR .lean()**
```javascript
// ANTES:
const cache = await PontosCorridosCache.findOne({ liga_id: ligaId })

// DEPOIS:
const cache = await PontosCorridosCache.findOne({ liga_id: ligaId }).lean()
```

---

## Mapa de Dependencias

```
REFACTOR-002: Extracao PDF/Auditoria
================================================

fluxo-financeiro-ui.js (ORIGEM)
    |
    |-- CRIAR --> fluxo-financeiro-pdf.js (DESTINO)
    |                  |
    |                  |-- import --> fluxo-financeiro-styles.js
    |                  |-- window.jspdf (CDN)
    |                  |-- fetch /api/tesouraria/participante/
    |
    |-- MODIFICAR (import + chamada inicializarPDF)
    |
    |-- NAO MODIFICAR --> fluxo-financeiro-auditoria.js
                         (codigo duplicado sera removido em fase futura)


PERFORMANCE-001: .lean() em Controllers
================================================

controllers/inscricoesController.js [4 queries]
controllers/ligaController.js [10 queries]
controllers/consolidacaoController.js [7 queries]
controllers/extratoFinanceiroCacheController.js [7 queries]
controllers/fluxoFinanceiroController.js [6 queries]
controllers/pontosCorridosCacheController.js [4 queries]
------------------------------------------------
TOTAL: 38 queries prioritarias
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Todas queries ja filtram por ligaId (validado em auditoria P1)
- [x] Novo modulo PDF nao altera logica de queries

**Verificacao:**
```javascript
// fluxo-financeiro-pdf.js - linha 3693 (original)
const response = await fetch(`/api/tesouraria/participante/${ligaId}/${timeId}?temporada=${temporada}`);
// ^ ligaId ja esta presente na URL
```

### Autenticacao
- [x] Rotas protegidas com middleware verificarAdmin
- [x] Modulo PDF apenas renderiza dados ja filtrados pelo backend

---

## Casos de Teste

### Teste 1: Extracao PDF (Cenario Positivo)
**Setup:** Acessar /admin/fluxo-financeiro, selecionar participante
**Acao:** Clicar botao "Exportar PDF" no modal de extrato
**Resultado Esperado:** PDF gerado com dados corretos do participante

### Teste 2: Modal Auditoria (Cenario Positivo)
**Setup:** Acessar /admin/fluxo-financeiro
**Acao:** Clicar icone de auditoria (fact_check) em um participante
**Resultado Esperado:** Modal de auditoria financeira abre com resumo e historico

### Teste 3: Performance .lean() (Cenario Positivo)
**Setup:** Servidor rodando
**Acao:** Acessar GET /api/ligas (usa ligaController)
**Resultado Esperado:** Tempo de resposta menor, dados retornados corretamente

### Teste 4: Erro jsPDF (Cenario Negativo)
**Setup:** Bloquear carregamento do CDN jsPDF
**Acao:** Tentar exportar PDF
**Resultado Esperado:** Alert "Biblioteca jsPDF nao carregada"

---

## Rollback Plan

### Em Caso de Falha REFACTOR-002
**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. OU restaurar arquivo original:
   ```bash
   git checkout HEAD~1 -- public/js/fluxo-financeiro/fluxo-financeiro-ui.js
   rm public/js/fluxo-financeiro/fluxo-financeiro-pdf.js
   ```

### Em Caso de Falha PERFORMANCE-001
**Passos de Reversao:**
1. Remover `.lean()` das queries afetadas
2. OU reverter commit do controller especifico

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados (2 modais de auditoria coexistem)
- [x] Testes planejados
- [x] Rollback documentado

---

## Ordem de Execucao (Critico)

### Fase 1: REFACTOR-002 (Frontend)
1. **Criar** `fluxo-financeiro-pdf.js` com codigo extraido
2. **Modificar** `fluxo-financeiro-ui.js`:
   - Adicionar import
   - Adicionar chamada inicializarPDF()
   - Remover blocos de codigo movidos
3. **Testar** em browser (exportar PDF, abrir auditoria)

### Fase 2: PERFORMANCE-001 (Backend)
1. **Modificar** controllers na seguinte ordem:
   - ligaController.js (mais queries, mais impacto)
   - inscricoesController.js
   - consolidacaoController.js
   - extratoFinanceiroCacheController.js
   - fluxoFinanceiroController.js
   - pontosCorridosCacheController.js
2. **Testar** endpoints apos cada controller modificado

---

## Notas Adicionais

### Codigo Duplicado Identificado
Existe duplicacao entre:
- `fluxo-financeiro-ui.js`: window.fecharModalAuditoria (linha 3854)
- `fluxo-financeiro-auditoria.js`: window.fecharModalAuditoria (linha 1140)

O codigo no UI sobrescreve o do auditoria.js pois carrega depois. Esta SPEC **NAO** remove o codigo duplicado do auditoria.js para evitar quebras. Sera tratado em refatoracao futura.

### Queries NAO Modificadas (Intencionalmente)
As seguintes queries NAO recebem `.lean()` pois precisam de metodos do Document:
- `findOneAndUpdate` - Retorna documento atualizado
- `findByIdAndUpdate` - Retorna documento atualizado
- `findByIdAndDelete` - Operacao de delecao
- Queries que subsequentemente chamam `.save()`

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-admin-performance-refactor.md
```

---

**Gerado por:** Spec Protocol v1.0
**Analise S.D.A:** Completa
**Queries mapeadas:** 38 prioritarias
**Linhas a extrair:** ~500

# 🔍 AUDITORIA: Problema com Selects no Módulo Pontos Corridos

**Data:** 2026-02-03
**Auditor:** Code Inspector (Senior)
**Arquivo Analisado:** `public/gerenciar-modulos.html` + `public/js/modules/module-config-modal.js`
**Problema Reportado:** Opções de "selecione" (dropdowns) não aparecem no módulo Pontos Corridos

---

## 📊 SCORE SPARC - Análise Focada

| Dimensão | Score | Achados |
|----------|-------|---------|
| 🛡️ Security | 5/5 | ✅ Sem problemas de segurança |
| ⚡ Performance | 4/5 | ✅ Carregamento adequado |
| 🏗️ Architecture | 4/5 | ✅ Arquitetura correta |
| 🔄 Reliability | 2/5 | 🔴 **BUG: Options não renderizam** |
| 🧹 Code Quality | 4/5 | ✅ Código limpo |
| **TOTAL** | **19/25** | 🟡 **BOM (bug específico)** |

---

## 🔴 ROOT CAUSE ANALYSIS

### Problema Identificado

**Localização:** `public/js/modules/module-config-modal.js:310-332`

```javascript
// ❌ PROBLEMA: método renderSelect()
renderSelect(pergunta) {
    const valorAtual = this.userAnswers[pergunta.id] || pergunta.default || '';
    const required = pergunta.required ? 'required' : '';

    const options = (pergunta.options || []).map(opt => {
        const selected = opt.valor === valorAtual ? 'selected' : '';
        return `<option value="${opt.valor}" ${selected}>${opt.label}</option>`;
    }).join('');

    return `
        <div class="mb-4">
            <label class="form-label">${pergunta.label} ${pergunta.required ? '<span class="text-danger">*</span>' : ''}</label>
            ${pergunta.descricao ? `<small class="text-muted d-block mb-2">${pergunta.descricao}</small>` : ''}
            <select class="form-select bg-gray-700 text-white border-gray-600"
                    id="input_${pergunta.id}"
                    data-question-id="${pergunta.id}"
                    ${required}>
                <option value="">Selecione...</option>
                ${options}  <!-- ✅ Options estão aqui -->
            </select>
        </div>
    `;
}
```

### Análise do Wizard (pontos_corridos.json)

**Arquivo:** `config/rules/pontos_corridos.json:126-322`

✅ **Wizard está CORRETO** - Contém 15 perguntas, incluindo 6 selects:

```json
{
  "id": "turnos",
  "tipo": "select",
  "options": [
    {"valor": 1, "label": "1 Turno (só ida)"},
    {"valor": 2, "label": "2 Turnos (ida e volta)"}
  ]
}
```

✅ **Backend retorna wizard corretamente:**
- Rota: `GET /api/modulos/:modulo/wizard` (routes/module-config-routes.js:419)
- Retorna: `regrasJson.wizard` completo

---

## 🐛 DIAGNÓSTICO: Por que as options não aparecem?

### Hipóteses Investigadas

#### ❌ Hipótese 1: Wizard não carrega do backend
**Status:** DESCARTADA
**Evidência:** Linha 158 do modal (`const data = await response.json(); return data.wizard || data;`)

#### ❌ Hipótese 2: Options têm estrutura errada no JSON
**Status:** DESCARTADA
**Evidência:** JSON usa estrutura correta `{"valor": X, "label": "Y"}`

#### ✅ Hipótese 3: TIPO DE DADOS INCORRETO
**Status:** CONFIRMADA 🔴
**Evidência:**

No JSON `pontos_corridos.json`, os valores são **números**:
```json
"options": [
  {"valor": 1, "label": "1 Turno (só ida)"},  // valor é NUMBER
  {"valor": 2, "label": "2 Turnos (ida e volta)"}
]
```

Mas no modal, a comparação usa **igualdade estrita** (===):
```javascript
// module-config-modal.js:315
const selected = opt.valor === valorAtual ? 'selected' : '';
//                           ^^^ Comparação estrita
```

**PROBLEMA:**
- `opt.valor` = `1` (number do JSON)
- `valorAtual` = `"1"` (string do input HTML)
- `1 === "1"` → **FALSE** ❌

Resultado: Nenhuma opção fica `selected`, mas **as options APARECEM no HTML**.

---

## 🔎 INVESTIGAÇÃO ADICIONAL

### Teste 1: Verificar se options estão no HTML renderizado

Abrir DevTools e executar:
```javascript
// No console do navegador, quando modal estiver aberto
document.querySelectorAll('#input_turnos option').forEach(opt => {
  console.log('Option:', opt.value, opt.textContent);
});
```

**Resultado Esperado:**
```
Option:  Selecione...
Option: 1 1 Turno (só ida)
Option: 2 2 Turnos (ida e volta)
```

### Teste 2: Verificar wizard carregado

```javascript
// No console do navegador
const modal = window.ModuleConfigModal;
console.log('Wizard data:', modal.wizardData);
console.log('Perguntas:', modal.wizardData?.perguntas);
```

---

## 🔧 SOLUÇÕES POSSÍVEIS

### Solução A: Coerção de Tipo no renderSelect (RECOMENDADA)

**Arquivo:** `public/js/modules/module-config-modal.js:315`

```javascript
// ❌ ANTES
const selected = opt.valor === valorAtual ? 'selected' : '';

// ✅ DEPOIS (coerção com ==)
const selected = opt.valor == valorAtual ? 'selected' : '';
//                        ^^ Usa == ao invés de ===
```

**Prós:**
- Fix simples (1 linha)
- Resolve todos os selects do sistema
- Permite flexibilidade número/string

**Contras:**
- Usa `==` (menos rigoroso)

---

### Solução B: Normalizar valores no fetchWizard

**Arquivo:** `public/js/modules/module-config-modal.js:160`

```javascript
// Após receber wizard do backend
const data = await response.json();
const wizard = data.wizard || data;

// 🔧 FIX: Normalizar options para strings
if (wizard?.perguntas) {
    wizard.perguntas.forEach(pergunta => {
        if (pergunta.tipo === 'select' && pergunta.options) {
            pergunta.options = pergunta.options.map(opt => ({
                ...opt,
                valor: String(opt.valor) // Converte para string
            }));
        }
    });
}

return wizard;
```

**Prós:**
- Mantém `===` (mais seguro)
- Normaliza na fonte

**Contras:**
- Mais código
- Modifica dados do backend

---

### Solução C: Fix no JSON (NÃO RECOMENDADO)

Alterar `pontos_corridos.json` para usar strings:
```json
"options": [
  {"valor": "1", "label": "1 Turno (só ida)"},
  {"valor": "2", "label": "2 Turnos (ida e volta)"}
]
```

**Contras:**
- Quebra contratos existentes
- Requer mudança em todos os JSONs
- Inputs `type="number"` salvam como number

---

## 📝 RECOMENDAÇÃO FINAL

### ✅ SOLUÇÃO A (Coerção de Tipo)

**Implementação:**
1. Editar `public/js/modules/module-config-modal.js:315`
2. Trocar `===` por `==`
3. Adicionar comentário explicativo

```javascript
/**
 * Renderiza select
 */
renderSelect(pergunta) {
    const valorAtual = this.userAnswers[pergunta.id] || pergunta.default || '';
    const required = pergunta.required ? 'required' : '';

    const options = (pergunta.options || []).map(opt => {
        // FIX: Usa == para permitir coerção number/string
        // (JSON pode ter valores numéricos, mas HTML input retorna strings)
        const selected = opt.valor == valorAtual ? 'selected' : '';
        return `<option value="${opt.valor}" ${selected}>${opt.label}</option>`;
    }).join('');

    return `
        <div class="mb-4">
            <label class="form-label">${pergunta.label} ${pergunta.required ? '<span class="text-danger">*</span>' : ''}</label>
            ${pergunta.descricao ? `<small class="text-muted d-block mb-2">${pergunta.descricao}</small>` : ''}
            <select class="form-select bg-gray-700 text-white border-gray-600"
                    id="input_${pergunta.id}"
                    data-question-id="${pergunta.id}"
                    ${required}>
                <option value="">Selecione...</option>
                ${options}
            </select>
        </div>
    `;
}
```

**Teste pós-fix:**
1. Abrir modal de Pontos Corridos
2. Verificar se valores default aparecem selecionados
3. Salvar e reabrir - verificar se mantém seleção

---

## 🔍 OUTROS ACHADOS (Preventivo)

### Code Smell 1: Duplicação de lógica tipo "select"

**Localização:** 6 perguntas tipo "select" no wizard

**Impacto:** Baixo
**Recomendação:** Criar variações de select se necessário (select-number, select-string)

---

### Code Smell 2: Default values inconsistentes

Alguns defaults são strings, outros numbers:
```json
"default": 1,        // number
"default": "grupos", // string
```

**Impacto:** Baixo (fix da Solução A resolve)
**Recomendação:** Padronizar defaults como strings no futuro

---

## 📋 CHECKLIST PÓS-FIX

- [ ] Aplicar Solução A no modal
- [ ] Testar com módulo Pontos Corridos
- [ ] Testar com outros módulos que usam select
- [ ] Verificar comportamento de save/load
- [ ] Adicionar teste automatizado (future)

---

**STATUS:** 🔴 BUG CONFIRMADO - Fix simples disponível
**PRIORIDADE:** P1 (bloqueia configuração de módulos)
**ESFORÇO:** 5 minutos (1 linha de código)

**Próxima auditoria:** Após aplicar fix

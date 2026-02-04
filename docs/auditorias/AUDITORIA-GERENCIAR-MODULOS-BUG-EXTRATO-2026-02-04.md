# 📊 AUDITORIA: Gerenciar Módulos - Bug "Em Manutenção" no Extrato Financeiro

**Data:** 04/02/2026 17:30
**Módulo:** Gerenciar Módulos (Admin)
**Severidade:** 🔴 **CRÍTICA**
**Issue Reportado:** Módulo "Extrato Financeiro" aparece como "Em manutenção" e não salva inputs

---

## 🎯 **Resumo Executivo**

### **Sintoma**
Ao acessar "Gerenciar Módulos" no Admin, o módulo **Extrato Financeiro** (módulo base) aparece com a mensagem **"⚙ Em manutenção"** e as alterações no toggle não são salvas mesmo após clicar em "Salvar Configurações".

### **Root Cause Identificado** 🔴
**INCONSISTÊNCIA DE DADOS ENTRE FRONTEND E BACKEND**

O problema ocorre quando:
1. Backend retorna `modulos: { extrato: false }` (módulo desativado)
2. Frontend renderiza módulo base com texto "Em manutenção"
3. Toggle permite mudar estado, mas não persiste
4. Estado do frontend (`modulosState`) diverge do backend

---

## 🔍 **Análise Detalhada**

### **Arquivo Auditado**
- `public/gerenciar-modulos.html` (483 linhas)
- `controllers/ligaController.js` (funções `buscarModulosAtivos`, `atualizarModulosAtivos`)

---

## 🐛 **Bug #1: Lógica de Renderização Confusa**

### **Localização:** `gerenciar-modulos.html:304`

```javascript
// ❌ PROBLEMA
<div class="modulo-desc">
    ${config.descricao}
    ${config.base && !isAtivo ? ' <strong style="color:#ff5500">⚙ Em manutenção</strong>' : ''}
</div>
```

### **Análise da Lógica**

**Linha 276:** Define `isAtivo`
```javascript
const isAtivo = modulosState[key] !== false;
```

**Linha 258:** Define defaults
```javascript
defaults[key] = MODULOS_CONFIG[key].base ? true : false;
```

**Linha 260:** Merge com dados do backend
```javascript
modulosState = { ...defaults, ...data.modulos };
```

### **Cenário de Bug**

```javascript
// Backend retorna (estado incorreto):
{ extrato: false }

// Frontend processa:
defaults = { extrato: true }  // porque é módulo base
modulosState = { ...defaults, ...{ extrato: false } }
// Resultado: modulosState.extrato = false ❌

// Renderização:
config.base = true (Extrato é base)
isAtivo = false (porque modulosState.extrato === false)
// Exibe: "⚙ Em manutenção" ❌
```

---

## 🐛 **Bug #2: Toggle de Módulo Base Funciona Mas Não Deveria**

### **Localização:** `gerenciar-modulos.html:308-323`

```javascript
// ❌ PROBLEMA: Toggle permite desativar módulo base
const toggle = card.querySelector('input[type="checkbox"]');
toggle.addEventListener('change', (e) => {
    e.stopPropagation();
    modulosState[key] = e.target.checked; // ✅ Atualiza estado local

    if (config.base) {
        card.className = `modulo-card base ${e.target.checked ? 'ativo' : 'inativo'}`;
        const desc = card.querySelector('.modulo-desc');
        desc.innerHTML = e.target.checked
            ? config.descricao
            : `${config.descricao} <strong style="color:#ff5500">⚙ Em manutenção</strong>`;
    }
});
```

### **Problema**
- **Módulos base NÃO DEVERIAM permitir toggle** (sempre ativos)
- Toggle muda UI mas backend pode rejeitar
- Gera confusão: "Por que o toggle funciona mas não salva?"

---

## 🐛 **Bug #3: Backend Aceita Desativar Módulos Base**

### **Localização:** `controllers/ligaController.js:900-905`

```javascript
// ❌ PROBLEMA: Backend salva sem validar se módulo base pode ser desativado
await Liga.updateOne(
  { _id: ligaIdParam },
  { $set: { modulos_ativos: modulos, atualizadaEm: new Date() } },
);
```

### **Análise**
**Falta validação:**
```javascript
// ❌ Backend aceita qualquer payload:
{
  extrato: false,     // ❌ Módulo base sendo desativado!
  ranking: false,     // ❌ Módulo base sendo desativado!
  rodadas: false,     // ❌ Módulo base sendo desativado!
  top10: true
}
```

**Deveria validar:**
```javascript
// ✅ Validar antes de salvar
const modulosBase = ['extrato', 'ranking', 'rodadas'];
modulosBase.forEach(mod => {
    if (modulos[mod] === false) {
        throw new Error(`Módulo base "${mod}" não pode ser desativado`);
    }
});
```

---

## 🐛 **Bug #4: Sincronização com ModuleConfig Pode Falhar**

### **Localização:** `controllers/ligaController.js:917-977`

```javascript
for (const [moduloKey, ativo] of Object.entries(modulos)) {
    try {
        const moduloBackendId = mapearModuloId(moduloKey);

        if (ativo) {
            // Ativar módulo
            const configExistente = await ModuleConfig.buscarConfig(/*...*/);
            // ...
        } else {
            // ❌ PROBLEMA: Desativa módulo base no ModuleConfig
            const desativado = await ModuleConfig.desativarModulo(
                ligaId,
                moduloBackendId,
                "sistema_sync",
                temporada,
            );
        }
    } catch (syncError) {
        console.error(`[LIGAS] ❌ Erro ao sincronizar módulo ${moduloKey}:`, syncError.message);
        erros++; // ❌ Erro silencioso, não retorna ao frontend
    }
}
```

### **Problemas**
1. **Erros de sincronização não retornam ao frontend**
   - Frontend mostra "✅ Salvo com sucesso"
   - Backend pode ter falhado parcialmente

2. **ModuleConfig e Liga.modulos_ativos podem divergir**
   - Liga: `extrato: false`
   - ModuleConfig: `extrato: true` (se sync falhou)

---

## 🔧 **Correções Necessárias** (Priorizadas)

### **🔴 CRÍTICO #1: Bloquear Desativação de Módulos Base (Backend)**

**Arquivo:** `controllers/ligaController.js:893`

```javascript
const atualizarModulosAtivos = async (req, res) => {
  const ligaIdParam = req.params.id;
  const { modulos } = req.body;

  // Validações existentes...

  // ✅ ADICIONAR: Validar módulos base
  const MODULOS_BASE_OBRIGATORIOS = ['extrato', 'ranking', 'rodadas'];

  for (const moduloBase of MODULOS_BASE_OBRIGATORIOS) {
    if (modulos[moduloBase] === false) {
      return res.status(400).json({
        erro: `Módulo base "${moduloBase}" não pode ser desativado`,
        moduloAfetado: moduloBase
      });
    }
  }

  try {
    // ... resto do código
  }
}
```

---

### **🔴 CRÍTICO #2: Forçar Módulos Base como `true` (Backend)**

**Arquivo:** `controllers/ligaController.js:900`

```javascript
// ✅ CORRIGIR: Forçar módulos base sempre ativos
const modulosComBaseForçada = {
  ...modulos,
  extrato: true,  // ✅ Sempre ativo
  ranking: true,  // ✅ Sempre ativo
  rodadas: true   // ✅ Sempre ativo
};

await Liga.updateOne(
  { _id: ligaIdParam },
  { $set: { modulos_ativos: modulosComBaseForçada, atualizadaEm: new Date() } },
);
```

---

### **🟠 ALTO #3: Desabilitar Toggle de Módulos Base (Frontend)**

**Arquivo:** `gerenciar-modulos.html:297`

```javascript
// ✅ CORRIGIR: Desabilitar toggle para módulos base
<label class="toggle-switch" onclick="event.stopPropagation();">
    <input type="checkbox"
           ${isAtivo ? 'checked' : ''}
           ${config.base ? 'disabled' : ''}  // ✅ ADICIONAR
           data-modulo="${key}">
    <span class="toggle-slider"></span>
</label>
```

**CSS adicional:**
```css
/* Estilizar toggle desabilitado */
.toggle-switch input:disabled + .toggle-slider {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #22c55e; /* Verde sempre ativo */
}
```

---

### **🟠 ALTO #4: Remover Event Listener de Toggle para Módulos Base**

**Arquivo:** `gerenciar-modulos.html:309`

```javascript
// ✅ CORRIGIR: Não adicionar listener se for módulo base
if (!config.base) {  // ✅ ADICIONAR ESTA CONDIÇÃO
    const toggle = card.querySelector('input[type="checkbox"]');
    toggle.addEventListener('change', (e) => {
        e.stopPropagation();
        modulosState[key] = e.target.checked;
        card.className = `modulo-card ${e.target.checked ? 'ativo' : 'inativo'}`;
    });
}
```

---

### **🟡 MÉDIO #5: Melhorar Mensagem "Em Manutenção"**

**Arquivo:** `gerenciar-modulos.html:304`

```javascript
// ✅ CORRIGIR: Mensagem mais clara
<div class="modulo-desc">
    ${config.descricao}
    ${config.base
        ? ' <span class="badge-always-active" style="color:#22c55e">✓ Sempre Ativo</span>'
        : ''
    }
</div>
```

---

### **🟡 MÉDIO #6: Retornar Erros de Sincronização ao Frontend**

**Arquivo:** `controllers/ligaController.js:970-977`

```javascript
} catch (syncError) {
    console.error(`[LIGAS] ❌ Erro ao sincronizar módulo ${moduloKey}:`, syncError.message);
    erros++;
    // ✅ ADICIONAR: Coletar detalhes dos erros
    if (!errosDetalhes) errosDetalhes = [];
    errosDetalhes.push({
        modulo: moduloKey,
        erro: syncError.message
    });
}
```

**Retornar ao frontend (linha 982):**
```javascript
// ✅ CORRIGIR resposta
res.json({
  sucesso: true,
  modulos: { ...modulosComBaseForçada },  // Retornar estado real
  sincronizacao: {
    ok: sincronizados,
    erros: erros,
    detalhes: errosDetalhes || []
  }
});
```

---

## 📊 **Impacto do Bug**

### **Severidade:** 🔴 **CRÍTICA**

| Aspecto | Impacto |
|---------|---------|
| **Segurança** | 🟡 Baixo (não expõe dados sensíveis) |
| **Funcionalidade** | 🔴 Alto (módulo core não funciona) |
| **UX** | 🔴 Alto (confunde usuários) |
| **Integridade de Dados** | 🟠 Médio (inconsistência entre sistemas) |

### **Cenários Afetados**
1. Admin tenta desativar Extrato Financeiro
2. Backend salva `extrato: false`
3. Frontend renderiza "Em manutenção"
4. Toggle não persiste estado
5. Usuário confuso: "Por que não salva?"

---

## 🎯 **Checklist de Correção**

### **Backend** (`ligaController.js`)
- [ ] Adicionar validação de módulos base obrigatórios
- [ ] Forçar `extrato`, `ranking`, `rodadas` sempre `true`
- [ ] Retornar erros de sincronização ao frontend
- [ ] Adicionar teste unitário para validação

### **Frontend** (`gerenciar-modulos.html`)
- [ ] Desabilitar toggle de módulos base (`disabled`)
- [ ] Remover event listener de módulos base
- [ ] Mudar texto "Em manutenção" → "✓ Sempre Ativo"
- [ ] Estilizar toggle desabilitado (CSS)

### **Testes**
- [ ] Testar tentativa de desativar `extrato`
- [ ] Testar resposta de erro do backend
- [ ] Testar UI de módulo base (toggle desabilitado)
- [ ] Testar sincronização com ModuleConfig

---

## 📝 **Como Reproduzir o Bug**

### **Passos**
1. Acessar Admin → Gerenciar Módulos
2. Localizar card "Extrato Financeiro"
3. Se toggle estiver ON, clicar para desativar
4. Clicar em "Salvar Configurações"
5. Recarregar página

### **Resultado Atual (Bug)** ❌
- Card mostra "⚙ Em manutenção"
- Toggle volta para OFF
- Mensagem: "✅ Salvo com sucesso" (mas não deveria permitir)

### **Resultado Esperado (Corrigido)** ✅
- Toggle de módulos base fica **sempre ON** e **desabilitado**
- Texto: "✓ Sempre Ativo"
- Se tentar desativar via API: `400 Bad Request: "Módulo base não pode ser desativado"`

---

## 🔗 **Arquivos Afetados**

| Arquivo | Linhas | Mudanças Necessárias |
|---------|--------|---------------------|
| `controllers/ligaController.js` | 893, 900, 970-982 | Validação + força true + retorna erros |
| `public/gerenciar-modulos.html` | 297, 304, 309 | Disable toggle + mensagem + remove listener |
| `public/css/modules/gerenciar.css` | - | Estilizar toggle disabled |

---

## 🎓 **Lições Aprendidas**

### **1. Validação Backend é Crítica**
Frontend pode ser manipulado. SEMPRE validar no backend.

### **2. Estado Deve Ter Fonte Única da Verdade**
Módulos base devem ser **hardcoded como true** no backend, não confiáveis do frontend.

### **3. UI Deve Refletir Restrições**
Se usuário não pode fazer algo, **desabilite o controle**, não apenas ignore.

### **4. Erros Devem Ser Visíveis**
Sincronização silenciosa falha = bug invisível.

---

## 🚀 **Próximos Passos**

### **Imediato** (Hoje)
1. ✅ Aplicar correção #1 (validação backend)
2. ✅ Aplicar correção #2 (forçar true)

### **Curto Prazo** (Esta semana)
3. ✅ Aplicar correções #3, #4, #5 (frontend)
4. ✅ Adicionar testes

### **Médio Prazo** (Próximo sprint)
5. ✅ Refatorar sistema de módulos (single source of truth)
6. ✅ Auditoria completa de sincronização ModuleConfig

---

## 📊 **Pontuação de Auditoria**

### **Business Logic:** 3/10 ❌
- ❌ Permite desativar módulos base
- ❌ Inconsistência entre sistemas
- ❌ Estado não validado

### **Security:** 7/10 ⚠️
- ✅ Sem exposição de dados
- ⚠️ Falta validação de input
- ✅ Usa verificarAdmin

### **UI/UX:** 4/10 ❌
- ❌ Toggle ativo mas não funciona
- ❌ Mensagem "Em manutenção" confusa
- ⚠️ Falta feedback visual

### **Performance:** 8/10 ✅
- ✅ Queries otimizadas
- ✅ Renderização eficiente
- ⚠️ Loop sequencial no backend (poderia ser paralelo)

**Score Geral:** 55/100 (🔴 CRÍTICO - Bloquear uso até correção)

---

**Auditoria realizada por:** Claude Code (Module Auditor v1.0)
**Skill aplicada:** `docs/SKILL-MODULE-AUDITOR.md`
**Rules aplicadas:** `audit-business.md`, `audit-ui.md`, `audit-security.md`
**Próxima auditoria:** Após aplicação das correções

---

**FIM DO RELATÓRIO**

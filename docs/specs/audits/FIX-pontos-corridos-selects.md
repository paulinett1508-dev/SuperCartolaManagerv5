# 🔧 FIX: Pontos Corridos - Seleções sem Opções

**Data:** 2026-02-03
**Severidade:** 🟡 MÉDIO
**Status:** ✅ CORRIGIDO

---

## 📋 PROBLEMA REPORTADO

Seleções de configuração do módulo Pontos Corridos não estavam mostrando opções:
- ❌ Quantidade de turnos
- ❌ Formato do torneio
- ❌ Quantidade de grupos
- ❌ Como dividir os times em grupos
- ❌ Confrontos de ida e volta ou jogo único
- ❌ Critério de desempate

---

## 🔍 DIAGNÓSTICO

### ✅ Backend (API)
- **Endpoint:** `GET /api/modulos/pontos_corridos/wizard`
- **Status:** FUNCIONANDO CORRETAMENTE
- **Dados:** Todas as 6 seleções com opções válidas

### ❌ Frontend (JavaScript)
- **Bug #1:** Lógica condicional não implementada
- **Bug #2:** Perguntas condicionais sempre escondidas
- **Bug #3:** Cache do navegador com versão antiga

---

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. **Cache-Busting (v2.0.1)**
**Arquivo:** `public/admin/modulos/pontos-corridos-config.html`

```html
<!-- ANTES -->
<script type="module" src="/admin/js/modulos-wizard.js"></script>

<!-- DEPOIS -->
<script type="module" src="/admin/js/modulos-wizard.js?v=2.0.1"></script>
```

**Impacto:** Força navegador a baixar versão atualizada

---

### 2. **Lógica Condicional Implementada**
**Arquivo:** `public/admin/js/modulos-wizard.js`

**Mudanças:**

#### A. Marcação de Perguntas Condicionais
```javascript
// Adiciona data-attribute para perguntas condicionais
if (pergunta.condicional) {
    div.dataset.condicional = JSON.stringify(pergunta.condicional);
    div.style.display = 'none'; // Esconde inicialmente
}
```

#### B. Sistema de Mostrar/Esconder Dinâmico
```javascript
function setupCondicionalLogic() {
    const container = document.getElementById('questions-container');

    // Estado inicial
    atualizarPerguntasCondicionais();

    // Listener para mudanças
    container.addEventListener('change', (e) => {
        atualizarPerguntasCondicionais();
    });
}
```

#### C. Atualização Automática
```javascript
function atualizarPerguntasCondicionais() {
    const todasPerguntas = container.querySelectorAll('[data-condicional]');

    todasPerguntas.forEach(div => {
        const condicional = JSON.parse(div.dataset.condicional);
        const campoInput = container.querySelector(`[name="${condicional.campo}"]`);

        if (campoInput.value === String(condicional.valor)) {
            div.style.display = 'block'; // Mostra
        } else {
            div.style.display = 'none';  // Esconde
            limparValor(div);             // Limpa valor
        }
    });
}
```

**Impacto:**
- ✅ Perguntas sobre **Grupos** só aparecem quando `formato === "grupos"`
- ✅ Perguntas sobre **Playoffs** só aparecem quando `formato === "grupos"`
- ✅ UX melhorada (menos confusão)

---

### 3. **Logs Detalhados para Debug**
```javascript
console.log('[MODULOS-WIZARD] 📝 Mudança detectada: formato = grupos');
console.log('[MODULOS-WIZARD] ✅ Mostrando: quantidade_grupos');
console.log('[MODULOS-WIZARD] ❌ Escondendo: criterio_divisao');
```

---

## 📦 ARQUIVOS MODIFICADOS

| Arquivo | Mudança | Linhas |
|---------|---------|--------|
| `public/admin/modulos/pontos-corridos-config.html` | Cache-busting v2.0.1 | L153 |
| `public/admin/js/modulos-wizard.js` | Lógica condicional | +65 linhas |
| `scripts/test-pontos-corridos-wizard.js` | Script de teste | NOVO |

---

## 🧪 COMO TESTAR

### **1. Limpar Cache do Navegador**

#### **Opção A: Hard Refresh**
```
Chrome/Firefox/Edge (Windows/Linux): Ctrl + Shift + R
Chrome/Firefox/Edge/Safari (Mac):    Cmd + Shift + R
```

#### **Opção B: DevTools**
1. Abrir DevTools (F12)
2. Botão direito no ícone Reload
3. "Empty Cache and Hard Reload"

#### **Opção C: Console**
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

---

### **2. Acessar Configuração**
```
http://localhost:3000/admin/modulos/pontos-corridos-config.html?ligaId=XXX
```

---

### **3. Verificar Funcionalidade**

**Comportamento Esperado:**

1. **Ao carregar:** Apenas 10 perguntas visíveis
   - Rodada inicial ✅
   - Turnos ✅ (SELECT com 2 opções)
   - Valores financeiros ✅
   - Tolerância empate ✅
   - Limite goleada ✅
   - Bônus goleada ✅
   - Formato ✅ (SELECT com 2 opções)

2. **Ao selecionar "Formato: Todos contra Todos":**
   - Apenas 10 perguntas visíveis

3. **Ao selecionar "Formato: Grupos + Playoffs":**
   - 15 perguntas visíveis (5 novas aparecem):
     - Quantidade de grupos ✅ (SELECT com 2 opções)
     - Como dividir times ✅ (SELECT com 2 opções)
     - Quantos classificam ✅
     - Tipo de playoff ✅ (SELECT com 2 opções)
     - Critério desempate playoff ✅ (SELECT com 2 opções)

---

### **4. Validar no Console (F12)**

```javascript
// Ver quantos selects existem
document.querySelectorAll('select').length;
// Deve retornar: 2 (inicialmente) ou 7 (com grupos ativados)

// Ver opções de um select específico
const selectTurnos = document.querySelector('[name="turnos"]');
console.log(selectTurnos.innerHTML);
// Deve mostrar: <option value="">Selecione...</option>
//               <option value="1">1 Turno (só ida)</option>
//               <option value="2">2 Turnos (ida e volta)</option>

// Ver perguntas condicionais
document.querySelectorAll('[data-condicional]').length;
// Deve retornar: 5
```

---

## 🐛 BUGS CORRIGIDOS

### **BUG-001: Lógica condicional não implementada** 🔴 CRÍTICO
- **Status:** ✅ CORRIGIDO
- **Commit:** v2.0.1

### **BUG-002: Cache impedindo atualização** 🟡 MÉDIO
- **Status:** ✅ CORRIGIDO
- **Solução:** Cache-busting com versão

---

## 🎯 PRÓXIMOS PASSOS (USUÁRIO)

1. ✅ **Hard Refresh:** `Ctrl + Shift + R`
2. ✅ **Verificar Console:** F12 → Console (buscar erros)
3. ✅ **Testar comportamento:** Mudar "Formato" e ver perguntas aparecerem/desaparecerem
4. ✅ **Validar opções:** Clicar em cada SELECT e confirmar que opções aparecem

---

## 📊 TESTE AUTOMATIZADO

Execute para validar estrutura do wizard:

```bash
node scripts/test-pontos-corridos-wizard.js
```

**Output esperado:**
```
✅ TODOS OS SELECTS ESTÃO VÁLIDOS!

🔍 DETALHAMENTO DOS SELECTS:

✅ 1. Quantidade de turnos
   ID: turnos
   Opções: 2
     - 1: "1 Turno (só ida)"
     - 2: "2 Turnos (ida e volta)"

✅ 2. Formato do torneio
   ID: formato
   Opções: 2
     - round_robin: "Todos contra Todos (tradicional)"
     - grupos: "Grupos + Playoffs (eliminatórias)"

... (6 selects no total)
```

---

## 🚨 SE PROBLEMA PERSISTIR

### **Debug Checklist:**

1. **Servidor rodando?**
   ```bash
   curl http://localhost:3000/api/modulos/pontos_corridos/wizard
   ```

2. **Endpoint retorna dados?**
   - Deve retornar JSON com `sucesso: true`

3. **JavaScript carregou?**
   ```javascript
   // No Console (F12)
   typeof setupCondicionalLogic
   // Deve retornar: "function"
   ```

4. **Versão atualizada?**
   ```javascript
   // No Console
   performance.getEntriesByType("resource")
     .find(r => r.name.includes('modulos-wizard.js'))
     .name
   // Deve incluir: ?v=2.0.1
   ```

---

## 📞 SUPORTE

Se após seguir todos os passos o problema persistir:

1. Tirar screenshot do Console (F12)
2. Tirar screenshot da Network tab mostrando request do wizard
3. Abrir issue com os screenshots

---

**Fix aplicado por:** Code Inspector Skill
**Data:** 2026-02-03
**Versão:** v2.0.1

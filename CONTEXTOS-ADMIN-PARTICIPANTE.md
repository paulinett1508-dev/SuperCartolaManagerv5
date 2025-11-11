
# SEPARAÇÃO DE CONTEXTOS: ADMIN vs PARTICIPANTE

## 🎯 Objetivo
Manter **total isolamento** entre as funcionalidades administrativas e as funcionalidades de participantes, evitando vazamento de dados e conflitos de lógica.

---

## 📁 ESTRUTURA DE ARQUIVOS

### ADMIN (Retaguarda)
```
public/js/fluxo-financeiro.js              ← Módulo principal ADMIN (100% ISOLADO)
public/js/fluxo-financeiro/
  ├── fluxo-financeiro-core.js             ← Lógica de cálculo (COMPARTILHADO)
  ├── fluxo-financeiro-ui.js               ← Interface (COMPARTILHADO)
  ├── fluxo-financeiro-cache.js            ← Cache (COMPARTILHADO)
  ├── fluxo-financeiro-api.js              ← API (COMPARTILHADO)
  ├── fluxo-financeiro-campos.js           ← Campos editáveis (COMPARTILHADO)
  └── fluxo-financeiro-utils.js            ← Utilitários (COMPARTILHADO)

public/detalhe-liga.html                   ← Página ADMIN
public/admin.html                          ← Ferramentas ADMIN
public/gerenciar.html                      ← Gerenciar ADMIN
```

### PARTICIPANTE (Frontend)
```
public/js/fluxo-financeiro/
  └── fluxo-financeiro-participante.js     ← Módulo específico PARTICIPANTE

public/participante-dashboard.html          ← Página PARTICIPANTE
public/participante-login.html              ← Login PARTICIPANTE
```

---

## 🔐 CONTROLE DE ACESSO

### Middleware (middleware/auth.js)
```javascript
// Rotas PÚBLICAS
ROTAS_PUBLICAS = [
  '/participante-login.html',
  '/favicon.ico',
  '/escudos/',
  '/css/',
  '/js/'
]

// Rotas ADMIN (sem autenticação)
ROTAS_ADMIN = [
  '/dashboard.html',
  '/detalhe-liga.html',
  '/gerenciar.html'
]

// Rotas PARTICIPANTE (com autenticação)
ROTAS_PARTICIPANTE = [
  '/participante-dashboard.html'
]
```

### Função de Verificação
```javascript
export function verificarAutenticacaoParticipante(req, res, next) {
  if (req.session && req.session.participante) {
    return next();
  }
  res.redirect('/participante-login.html');
}
```

---

## 🔄 FLUXO DE DADOS

### ADMIN
```
URL (?id=XXX) → obterLigaId() → fluxo-financeiro.js
                                      ↓
                          FluxoFinanceiroCore.calcularExtrato()
                                      ↓
                          FluxoFinanceiroUI.renderizar()
```

### PARTICIPANTE
```
Sessão Autenticada → participanteData { timeId, ligaId }
                              ↓
              fluxo-financeiro-participante.js
                              ↓
                  inicializar(participanteData)
                              ↓
                      carregarExtrato()
                              ↓
          FluxoFinanceiroCore.calcularExtrato() ← COMPARTILHADO
                              ↓
          FluxoFinanceiroUI.renderizar() ← COMPARTILHADO
```

---

## 🚀 MÓDULOS COMPARTILHADOS

Os seguintes módulos são **compartilhados** entre Admin e Participante:

1. **fluxo-financeiro-core.js** - Lógica de cálculo (pura)
2. **fluxo-financeiro-ui.js** - Interface de renderização
3. **fluxo-financeiro-cache.js** - Sistema de cache
4. **fluxo-financeiro-api.js** - Comunicação com API
5. **fluxo-financeiro-campos.js** - Campos editáveis
6. **fluxo-financeiro-utils.js** - Funções utilitárias

---

## ✅ REGRAS DE ISOLAMENTO

### Admin PODE:
- ✅ Ver extratos de todos os participantes
- ✅ Editar campos personalizados
- ✅ Gerar relatórios consolidados
- ✅ Acessar qualquer ligaId via URL
- ✅ **CRIAR, MODIFICAR E DELETAR dados**

### Admin NÃO PODE:
- ❌ Acessar sessões de participantes
- ❌ Ver páginas de participantes sem autenticação

### Participante PODE:
- ✅ Ver APENAS seu próprio extrato
- ✅ Ver estatísticas filtradas por seu timeId
- ✅ **APENAS VISUALIZAR dados criados pelo admin**

### Participante NÃO PODE:
- ❌ Ver extratos de outros participantes
- ❌ Editar campos personalizados
- ❌ Acessar páginas ADMIN
- ❌ Mudar ligaId ou timeId
- ❌ **Criar, modificar ou deletar NENHUM dado**
- ❌ **Ter "vida própria" - depende 100% do admin**

---

## 🛠️ INICIALIZAÇÃO

### ADMIN (detalhe-liga.html)
```javascript
import './js/fluxo-financeiro.js';

// Automático ao carregar página
window.inicializarFluxoFinanceiro();
```

### PARTICIPANTE (participante-dashboard.html)
```javascript
import { fluxoFinanceiroParticipante } from './js/fluxo-financeiro/fluxo-financeiro-participante.js';

// Só quando módulo "Extrato" for clicado
await fluxoFinanceiroParticipante.inicializar({
  timeId: participanteData.timeId,
  ligaId: participanteData.ligaId
});

await fluxoFinanceiroParticipante.carregarExtrato();
```

---

## 🔍 DEBUG

### Verificar contexto atual:
```javascript
console.log('Contexto:', window.location.pathname);
// Admin: /detalhe-liga.html
// Participante: /participante-dashboard.html
```

### Verificar módulo carregado:
```javascript
console.log('Módulo Admin:', window.inicializarFluxoFinanceiro ? 'SIM' : 'NÃO');
console.log('Módulo Participante:', window.fluxoFinanceiroParticipante ? 'SIM' : 'NÃO');
```

---

## 📊 BENEFÍCIOS DA SEPARAÇÃO

1. **Segurança** - Isolamento total de dados sensíveis
2. **Manutenibilidade** - Código mais organizado e fácil de debugar
3. **Performance** - Módulos carregados apenas quando necessários
4. **Escalabilidade** - Facilita adição de novos recursos específicos
5. **Testabilidade** - Cada contexto pode ser testado isoladamente

---

---

## 🧹 HIGIENIZAÇÃO DE CÓDIGO

### Separação Completa (2025-01-16)

1. **fluxo-financeiro.js** - 100% ADMIN, sem referências a contexto participante
2. **fluxo-financeiro-participante.js** - 100% PARTICIPANTE, totalmente isolado
3. **Logs específicos** - Todos os logs identificam o contexto ([ADMIN] ou [PARTICIPANTE])
4. **Imports** - Cada contexto importa apenas o que precisa
5. **Globals** - Variáveis globais separadas por contexto

### Regras de Higienização

- ❌ NUNCA misturar lógica de admin em código de participante
- ❌ NUNCA importar fluxo-financeiro.js em participante-dashboard.html
- ✅ SEMPRE usar logs específicos: [FLUXO-ADMIN] ou [FLUXO-PARTICIPANTE]
- ✅ SEMPRE manter módulos compartilhados (core, ui, cache) sem lógica de contexto
- ✅ SEMPRE documentar qual contexto cada função serve

---

---

## 🔒 PRINCÍPIO FUNDAMENTAL

### O Participante NÃO tem "vida própria"

- **100% READ-ONLY**: O módulo participante apenas visualiza dados
- **Dependência Total**: Toda alimentação vem do modo ADMIN
- **Zero Modificações**: Nenhum dado pode ser criado/alterado pelo participante
- **Visualização Filtrada**: Apenas vê seus próprios dados dentro do que o admin configurou

**REGRA DE OURO:** Se o admin não criar/configurar, o participante não vê.

---

**Última atualização:** 2025-01-16 (Reforço: Participante sem vida própria)

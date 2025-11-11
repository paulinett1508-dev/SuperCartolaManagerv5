
# Contextos do Sistema: Admin vs Participante

## 🔴 CONTEXTO ADMIN (Retaguarda)

**Acesso:** Desenvolvedor e administrador do sistema
**Páginas:** `detalhe-liga.html`, `gerenciar.html`, `admin.html`
**Identificação da Liga:** Parâmetro `id` ou `ligaId` na URL
**Exemplo URL:** `detalhe-liga.html?id=684cb1c8af923da7c7df51de`

### Características:
- ✅ Acesso irrestrito a todas as funcionalidades
- ✅ Pode gerenciar múltiplas ligas
- ✅ Pode editar configurações sensíveis
- ✅ Visualiza dados de todos os participantes
- ✅ Pode invalidar cache e forçar recálculos

### Variáveis Globais Esperadas:
```javascript
// Liga vem da URL, NÃO de variáveis globais
const ligaId = new URLSearchParams(window.location.search).get("id");
```

### Módulos com Acesso Total:
- ✅ Fluxo Financeiro (todos os participantes)
- ✅ Rodadas (todas as rodadas)
- ✅ Pontos Corridos
- ✅ Mata-Mata
- ✅ Ranking Geral
- ✅ TOP 10
- ✅ Artilheiro Campeão
- ✅ Luva de Ouro
- ✅ Melhor Mês

---

## 🟢 CONTEXTO PARTICIPANTE (Frontend do Participante)

**Acesso:** Participante autenticado
**Páginas:** `participante-dashboard.html`, `participante-login.html`
**Identificação:** Time ID do participante autenticado
**Exemplo URL:** `participante-dashboard.html` (sem parâmetros na URL)

### Características:
- ✅ Visualiza apenas seus próprios dados
- ✅ Estatísticas filtradas pelo seu Time ID
- ✅ Não pode editar configurações da liga
- ✅ Não pode ver dados sensíveis de outros participantes
- ✅ Interface simplificada e focada

### Variáveis Globais Esperadas:
```javascript
window.ligaIdAtual = "684cb1c8af923da7c7df51de";
window.currentLigaId = "684cb1c8af923da7c7df51de";
window.participanteTimeId = "123456"; // ID do time do participante
window.participanteNome = "Nome do Participante";
```

### Módulos Filtrados por Time:
- ✅ Fluxo Financeiro (apenas seu extrato)
- ✅ Rodadas (suas posições)
- ✅ Pontos Corridos (seus confrontos)
- ✅ Ranking (sua posição)
- ❌ Sem acesso a: gerenciar ligas, editar configurações, ver dados de outros

---

## 🔧 REGRAS DE IMPLEMENTAÇÃO

### ❌ O QUE NUNCA FAZER:
1. **NUNCA** misturar lógicas de admin e participante no mesmo módulo
2. **NUNCA** assumir que `window.ligaIdAtual` existe no contexto admin
3. **NUNCA** assumir que a URL tem `id` no contexto participante
4. **NUNCA** expor dados sensíveis no contexto participante

### ✅ O QUE FAZER:
1. **SEMPRE** verificar o contexto antes de acessar dados
2. **SEMPRE** usar a função `obterLigaId()` que detecta o contexto automaticamente
3. **SEMPRE** filtrar dados por Time ID no contexto participante
4. **SEMPRE** validar permissões antes de executar ações sensíveis

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Para Módulos que devem funcionar em AMBOS os contextos:

```javascript
// ✅ CORRETO: Detectar contexto automaticamente
function obterLigaId() {
    // ADMIN: URL tem parâmetro id
    const urlParams = new URLSearchParams(window.location.search);
    const ligaIdFromUrl = urlParams.get("id") || urlParams.get("ligaId");
    if (ligaIdFromUrl) return ligaIdFromUrl;

    // PARTICIPANTE: Variáveis globais
    if (window.ligaIdAtual) return window.ligaIdAtual;
    if (window.currentLigaId) return window.currentLigaId;

    // FALLBACK: localStorage
    return localStorage.getItem("ligaIdSelecionada");
}

// ✅ CORRETO: Filtrar por contexto
function obterDados() {
    const ligaId = obterLigaId();
    
    // Se for participante, filtrar por Time ID
    if (window.participanteTimeId) {
        return buscarDadosDoTime(ligaId, window.participanteTimeId);
    }
    
    // Se for admin, retornar tudo
    return buscarTodosDados(ligaId);
}
```

### ❌ INCORRETO:

```javascript
// ❌ NUNCA faça isso (assume que ligaIdAtual sempre existe)
const ligaId = window.ligaIdAtual;

// ❌ NUNCA faça isso (assume que URL sempre tem id)
const ligaId = new URLSearchParams(window.location.search).get("id");
```

---

## 🎯 MÓDULOS AFETADOS

### ✅ Já corrigidos:
- `fluxo-financeiro.js` - função `obterLigaId()` atualizada

### ⚠️ Precisam verificação:
- `pontos-corridos-utils.js`
- `mata-mata-financeiro.js`
- `ranking.js`
- `rodadas.js`
- `top10.js`
- `luva-de-ouro.js`
- `artilheiro-campeao.js`
- `melhor-mes.js`

---

## 🔍 COMO TESTAR

### Teste Admin:
1. Acesse `detalhe-liga.html?id=684cb1c8af923da7c7df51de`
2. Navegue para Fluxo Financeiro
3. Verifique se os dados são carregados corretamente
4. Console deve mostrar: `[ADMIN] Liga ID da URL: 684cb1c8af923da7c7df51de`

### Teste Participante:
1. Acesse `participante-login.html`
2. Faça login com credenciais de participante
3. Dashboard deve carregar com dados filtrados
4. Console deve mostrar: `[PARTICIPANTE] Usando ligaIdAtual global: ...`

---

## 📚 REFERÊNCIAS

- **Admin:** `detalhe-liga-orquestrador.js`
- **Participante:** `participante-dashboard.html` (a ser criado/atualizado)
- **Autenticação:** `routes/participante-auth.js`
- **Middleware:** `middleware/auth.js`

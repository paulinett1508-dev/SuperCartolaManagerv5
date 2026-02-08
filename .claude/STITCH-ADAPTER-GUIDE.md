# 🚀 Guia Rápido: Stitch Adapter Skill

> Como usar a skill de adaptação automática de código do Google Stitch

---

## 📋 O que a skill faz?

A **stitch-adapter** recebe código HTML gerado pelo Google Stitch e automaticamente:

1. ✅ **Separa** HTML, CSS e JavaScript em arquivos distintos
2. ✅ **Converte** cores hardcoded (#FF5500) para variáveis CSS (var(--color-primary))
3. ✅ **Adapta** espaçamentos e border-radius para padrão do projeto
4. ✅ **Transforma** JS em ES6 Module com try/catch
5. ✅ **Sugere** onde colocar cada arquivo (admin vs app, página vs fragmento)
6. ✅ **Valida** compatibilidade com a stack (detecta React, Vue, etc.)
7. ✅ **Gera** relatório completo com instruções de integração

---

## 🎯 Como usar

### Método 1: Keywords Naturais (Recomendado)

Basta falar naturalmente com a IA:

```
Recebi este código do Google Stitch, adapte para o projeto:

[COLAR CÓDIGO HTML AQUI]
```

**A skill será ativada automaticamente** pelas keywords:
- "código do stitch"
- "google stitch"
- "html do stitch"
- "adaptar código"

### Método 2: Chamada Direta (Opcional)

```
/stitch-adapter

[COLAR CÓDIGO HTML AQUI]

Tipo: Admin
Nome: dashboard-card
```

---

## 📦 Exemplos Práticos

### Exemplo 1: Card Admin Simples

**INPUT (Stitch):**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .card {
            background: #1a1a1a;
            color: #FF5500;
            padding: 20px;
            border-radius: 12px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>Dashboard</h2>
        <p>Total de participantes: 50</p>
    </div>
</body>
</html>
```

**PROMPT:**
```
Adapte este código do Google Stitch para o admin do projeto:

[CÓDIGO ACIMA]

Nome: dashboard-stats
```

**OUTPUT:**
A skill vai gerar:
- ✅ `public/admin-dashboard-stats.html` (página completa)
- ✅ `public/css/admin-dashboard-stats.css` (com variáveis CSS)
- ✅ Relatório de adaptação com instruções

### Exemplo 2: Componente Mobile (App Participante)

**INPUT (Stitch):**
```html
<div style="background: #1a1a1a; padding: 16px;">
    <h2 style="color: #FF5500;">Ranking</h2>
    <div id="ranking-list"></div>
</div>
<script>
    fetch('/api/ranking')
        .then(r => r.json())
        .then(data => {
            document.getElementById('ranking-list').innerHTML =
                data.map(item => `<div>${item.nome}</div>`).join('');
        });
</script>
```

**PROMPT:**
```
Recebi este código do Stitch para o app mobile, adapte:

[CÓDIGO ACIMA]

Tipo: App Participante
Nome: ranking
```

**OUTPUT:**
A skill vai gerar:
- ✅ `public/participante/fronts/ranking.html` (fragmento limpo)
- ✅ `public/participante/modules/ranking/ranking.css`
- ✅ `public/participante/modules/ranking/ranking.js` (ES6 Module com try/catch)
- ✅ Instruções de integração no navigation.js

---

## 🔄 Conversões Automáticas

### Cores
| Stitch (hardcoded) | Projeto (variável CSS) |
|--------------------|------------------------|
| `#FF5500` ou `#FF4500` | `var(--color-primary)` |
| `#1a1a1a` | `var(--surface-card)` |
| `#121212` | `var(--surface-bg)` |
| `#22c55e` | `var(--module-artilheiro-primary)` |
| `#8b5cf6` | `var(--module-capitao-primary)` |
| `#ffd700` | `var(--module-luva-primary)` |

### Espaçamento
| Stitch | Projeto |
|--------|---------|
| `padding: 4px` | `padding: var(--space-1)` |
| `padding: 8px` | `padding: var(--space-2)` |
| `padding: 16px` | `padding: var(--space-4)` |
| `padding: 24px` | `padding: var(--space-6)` |

### Border Radius
| Stitch | Projeto |
|--------|---------|
| `border-radius: 4px` | `border-radius: var(--radius-sm)` |
| `border-radius: 8px` | `border-radius: var(--radius-md)` |
| `border-radius: 12px` | `border-radius: var(--radius-lg)` |
| `border-radius: 50%` | `border-radius: var(--radius-full)` |

---

## ⚠️ Incompatibilidades Detectadas

A skill **automaticamente detecta e avisa** sobre:

### Críticas (Bloqueiam)
- ❌ **React/Vue/Angular** → Sugere reescrita em Vanilla JS
- ❌ **npm packages frontend** → Sugere alternativas CDN

### Moderadas (Avisam)
- ⚠️ **Font Awesome** → Converte para Material Icons
- ⚠️ **Cores hardcoded** → Converte para variáveis CSS
- ⚠️ **Light mode** → Adapta para dark mode
- ⚠️ **Bootstrap/Material-UI** → Remove e usa TailwindCSS + CSS custom

---

## 📊 Relatório Gerado

Após processar, a skill gera um relatório completo:

```markdown
# RELATÓRIO DE ADAPTAÇÃO - GOOGLE STITCH → SUPER CARTOLA

## 📁 ARQUIVOS GERADOS
- HTML: public/admin-dashboard.html (234 linhas)
- CSS: public/css/admin-dashboard.css (156 linhas)
- JS: public/js/admin-dashboard.js (89 linhas)

## 🔄 ADAPTAÇÕES REALIZADAS
- 12 cores convertidas para variáveis CSS
- 8 valores de espaçamento padronizados
- 3 border-radius adaptados
- JavaScript convertido para ES6 Module

## ⚠️ INCOMPATIBILIDADES
- Font Awesome → Material Icons (4 ícones convertidos)
- 2 cores hardcoded restantes (revisar)

## 📝 INSTRUÇÕES DE INTEGRAÇÃO
[passo a passo para integrar o código]

## 🎯 PRÓXIMOS PASSOS
[ ] Revisar código gerado
[ ] Testar em local
[ ] Commitar e push
```

---

## 🎨 Exemplo Completo: Do Stitch ao Projeto

### 1. Gerar no Google Stitch

Use o prompt padrão de `.claude/STITCH-DESIGN-PROMPT.md` no Stitch:

```
Você é designer do Super Cartola Manager.

STACK: HTML5 + TailwindCSS CDN + Vanilla JS ES6+
DARK MODE: bg-gray-900 (#121212), cards bg-gray-800 (#1a1a1a)
FONTS: Russo One (títulos), Inter (texto), JetBrains Mono (números)
CORES: Laranja #FF5500, Verde #22c55e, Roxo #8b5cf6

TAREFA: Criar card de estatísticas do ranking com posição,
nome do time, pontos e última rodada. Design mobile-first.
```

### 2. Copiar código gerado pelo Stitch

O Stitch vai gerar algo como:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <style>
        .ranking-card {
            background: #1a1a1a;
            padding: 20px;
            border-radius: 12px;
        }
        .position { color: #FF5500; font-size: 32px; }
        .team-name { color: #ffffff; font-size: 18px; }
    </style>
</head>
<body>
    <div class="ranking-card">
        <div class="position">1º</div>
        <div class="team-name">Time Exemplo</div>
        <div class="points">450 pts</div>
    </div>
</body>
</html>
```

### 3. Adaptar no Claude Code

```
Recebi este código do Google Stitch, adapte para o app mobile:

[COLAR CÓDIGO ACIMA]

Nome: ranking-card
```

### 4. Arquivos gerados automaticamente

A skill vai criar:

**public/participante/fronts/ranking-card.html:**
```html
<!-- Fragmento limpo, sem DOCTYPE -->
<div id="ranking-card-container" class="card-container">
    <div class="position font-brand">1º</div>
    <div class="team-name">Time Exemplo</div>
    <div class="points font-mono">450 pts</div>
</div>
```

**public/participante/modules/ranking-card/ranking-card.css:**
```css
.card-container {
    background: var(--surface-card);
    padding: var(--space-5);
    border-radius: var(--radius-lg);
}

.position {
    color: var(--color-primary);
    font-size: var(--font-size-hero);
    font-family: var(--font-family-brand);
}

.team-name {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
}

.points {
    font-family: var(--font-family-mono);
}
```

### 5. Integrar no projeto

A skill já fornece as instruções:

```javascript
// Em participante-navigation.js
case 'ranking-card':
    await loadFragment('ranking-card');
    break;
```

---

## 💡 Dicas Pro

### ✅ Faça
- Use o prompt padrão do Stitch (`STITCH-DESIGN-PROMPT.md`)
- Especifique se é Admin ou App
- Dê um nome descritivo ao componente
- Revise o código gerado antes de integrar

### ❌ Evite
- Colar código com React/Vue
- Código com dependências npm
- Omitir informações sobre destino (admin/app)
- Integrar sem testar localmente

---

## 🔗 Links Úteis

- **Prompt Stitch:** `.claude/STITCH-DESIGN-PROMPT.md`
- **Skill Completa:** `docs/skills/03-utilities/stitch-adapter.md`
- **Design System:** `public/css/_admin-tokens.css`
- **Frontend Crafter:** `docs/skills/02-specialists/frontend-crafter.md`

---

## 🆘 Problemas Comuns

### "A skill não foi ativada"

Use keywords explícitas:
```
Adaptar código do Google Stitch para o projeto
```

### "Código não foi separado corretamente"

Especifique o tipo:
```
Tipo: App Participante (fragmento)
Nome: meu-componente
```

### "Cores não foram convertidas"

A skill converte automaticamente. Se não converteu, pode ser:
- Cor não está no mapeamento (será mantida e avisada no relatório)
- CSS está em formato não reconhecido (inline style complexo)

### "JavaScript não virou ES6 Module"

Verifique se o código tinha `<script>` tags. A skill processa automaticamente.

---

**Versão:** 1.0
**Última atualização:** 2026-02-08
**Mantido por:** Equipe Super Cartola Manager

# 🎨 PROMPT PADRÃO PARA STITCH - SUPER CARTOLA MANAGER

> Use este prompt ao solicitar designs/códigos no Google Stitch para garantir consistência visual e tecnológica com o projeto.

---

## 📋 CONTEXTO DO PROJETO

Você é um designer/desenvolvedor especializado no **Super Cartola Manager**, uma aplicação web de gestão de ligas de fantasia de futebol. Sua missão é criar interfaces e componentes que sejam:
- Visualmente consistentes com o design system existente
- Tecnologicamente compatíveis com a stack do projeto
- Otimizados para performance e acessibilidade

---

## 🛠️ STACK TECNOLÓGICA (IMUTÁVEL)

### Frontend
- **HTML5** semântico e acessível
- **CSS3** moderno (Flexbox, Grid, Custom Properties)
- **JavaScript ES6+** (Vanilla JS, sem frameworks)
- **TailwindCSS 3.x** via CDN (classes utilitárias apenas)
- **Módulos ES6** (`type="module"` para scripts)

### Backend (Contexto)
- **Node.js** com Express.js
- **MongoDB** (Native Driver)
- **Arquitetura MVC** (Models, Controllers, Views)

### Assets
- **Fontes:** Google Fonts (Russo One, Inter, JetBrains Mono)
- **Ícones:** FontAwesome 6.x (via CDN)
- **Escudos:** PNG locais em `/public/escudos/{clube_id}.png`

---

## 🎨 DESIGN SYSTEM OFICIAL

### 1. PALETA DE CORES (Dark Mode Obrigatório)

#### Cores Brand
```css
--color-primary: #FF5500;           /* Laranja principal */
--color-primary-dark: #e8472b;      /* Hover/Active */
--color-primary-light: #ff6b35;     /* Destaques */
--gradient-primary: linear-gradient(135deg, #FF5500 0%, #e8472b 100%);
```

#### Cores de Superfície
```css
--surface-bg: #121212;              /* Background página */
--surface-card: #1a1a1a;            /* Cards/containers */
--surface-card-elevated: #2a2a2a;   /* Cards com elevação */
--surface-card-hover: #333333;      /* Hover states */
```

#### Cores de Status
```css
--color-success: #10b981;           /* Verde */
--color-danger: #ef4444;            /* Vermelho */
--color-warning: #eab308;           /* Amarelo */
--color-info: #3b82f6;              /* Azul */
```

#### Cores de Texto
```css
--text-primary: #ffffff;            /* Texto principal */
--text-secondary: #e0e0e0;          /* Texto secundário */
--text-muted: #a0a0a0;              /* Texto esmaecido */
--text-disabled: #666666;           /* Texto desabilitado */
```

### 2. CORES DOS MÓDULOS (Identidade Visual)

Cada módulo tem sua paleta própria. **SEMPRE use variáveis CSS:**

| Módulo | Cor Primária | Variável CSS | Simbolismo |
|--------|--------------|--------------|------------|
| **Artilheiro Campeão** | Verde `#22c55e` | `var(--module-artilheiro-primary)` | Gols/Vitória |
| **Capitão de Luxo** | Roxo `#8b5cf6` | `var(--module-capitao-primary)` | Liderança |
| **Luva de Ouro** | Dourado `#ffd700` | `var(--module-luva-primary)` | Goleiros |
| **Dashboard Saúde** | Verde `#10b981` | `var(--module-saude-primary)` | Monitoramento |

**Padrão de uso:**
```css
/* Header de módulo */
.modulo-header {
    background: var(--gradient-artilheiro);
    border: 1px solid var(--module-artilheiro-border);
}

/* Card com tema do módulo */
.modulo-card {
    background: var(--module-artilheiro-muted);
    color: var(--module-artilheiro-primary);
}
```

### 3. TIPOGRAFIA

#### Famílias de Fonte
```css
--font-family-brand: 'Russo One', sans-serif;      /* Títulos, CTAs, Stats */
--font-family-base: 'Inter', sans-serif;           /* Corpo de texto */
--font-family-mono: 'JetBrains Mono', monospace;   /* Valores numéricos */
```

#### Quando usar cada fonte
- **Russo One:** Headers, badges, números de destaque (pontos, gols), botões primários
- **Inter:** Parágrafos, labels, texto corrido, UI elements
- **JetBrains Mono:** Valores financeiros, IDs, timestamps, dados tabulares

#### Tamanhos
```css
--font-size-xs: 10px;
--font-size-sm: 12px;
--font-size-base: 13px;     /* Default */
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
--font-size-hero: 32px;
```

### 4. ESPAÇAMENTO
```css
--space-1: 4px;     /* Padding mínimo */
--space-2: 8px;     /* Gap pequeno */
--space-3: 12px;    /* Spacing interno */
--space-4: 16px;    /* Padding padrão */
--space-6: 24px;    /* Margens entre seções */
--space-8: 32px;    /* Separação grande */
```

### 5. BORDER RADIUS
```css
--radius-sm: 4px;       /* Inputs, small badges */
--radius-md: 8px;       /* Botões */
--radius-lg: 12px;      /* Cards */
--radius-xl: 16px;      /* Containers grandes */
--radius-full: 9999px;  /* Círculos, pills */
```

### 6. SOMBRAS
```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);      /* Elevação leve */
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);     /* Cards */
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);     /* Modais */
--shadow-primary: 0 4px 15px rgba(255, 85, 0, 0.4);  /* Glow laranja */
```

---

## 📐 COMPONENTES PADRÃO

### Card Base
```html
<div class="bg-gray-800 rounded-lg shadow-lg p-4">
    <h3 class="font-brand text-xl text-white mb-2">Título do Card</h3>
    <p class="text-gray-400 text-sm">Conteúdo do card...</p>
</div>
```

**CSS Customizado:**
```css
.card-padrao {
    background: var(--surface-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    padding: var(--space-4);
}
```

### Botão Primário
```html
<button class="bg-orange-500 hover:bg-orange-600 text-white font-brand px-6 py-3 rounded-lg transition-all">
    CONFIRMAR
</button>
```

**CSS Customizado:**
```css
.btn-primary {
    background: var(--color-primary);
    color: var(--text-primary);
    font-family: var(--font-family-brand);
    padding: var(--btn-padding-md);
    border-radius: var(--radius-md);
    transition: var(--transition-normal);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.btn-primary:hover {
    background: var(--color-primary-dark);
    box-shadow: var(--shadow-primary);
    transform: translateY(-1px);
}
```

### Input Field
```html
<input type="text"
       class="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
       placeholder="Digite aqui...">
```

**CSS Customizado:**
```css
.input-padrao {
    background: var(--input-bg);
    border: var(--input-border);
    color: var(--text-primary);
    padding: 12px 16px;
    border-radius: var(--radius-md);
    width: 100%;
    font-family: var(--font-family-base);
    font-size: var(--font-size-base);
}

.input-padrao:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-muted);
}
```

### Badge/Tag
```html
<span class="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-brand">
    ATIVO
</span>
```

### Tabela Responsiva
```html
<div class="overflow-x-auto">
    <table class="w-full">
        <thead class="bg-gradient-to-r from-orange-600 to-orange-700">
            <tr>
                <th class="text-left py-3 px-4 font-brand text-sm">Coluna 1</th>
                <th class="text-left py-3 px-4 font-brand text-sm">Coluna 2</th>
            </tr>
        </thead>
        <tbody class="bg-gray-800">
            <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                <td class="py-3 px-4 text-sm">Dado 1</td>
                <td class="py-3 px-4 text-sm">Dado 2</td>
            </tr>
        </tbody>
    </table>
</div>
```

---

## 🚫 RESTRIÇÕES ABSOLUTAS

### ❌ NUNCA FAÇA ISSO:
1. **Cores hardcoded:** Não use `#22c55e` diretamente → Use `var(--module-artilheiro-primary)`
2. **Light mode:** Não crie versões claras → Dark mode é obrigatório
3. **Frameworks JS:** Não use React/Vue/Angular → Apenas Vanilla JS
4. **Dependências npm frontend:** Não instale bibliotecas → Use CDN quando necessário
5. **!important:** Evite ao máximo → Prefira especificidade CSS correta
6. **IDs para estilo:** Use classes → IDs apenas para JavaScript
7. **Inline styles:** Evite `style=""` → Use classes CSS
8. **TailwindCSS customizado:** Não configure tailwind.config.js → Use CDN padrão + CSS custom

### ✅ SEMPRE FAÇA ISSO:
1. **Variáveis CSS:** Use `var(--nome-da-variavel)` para cores/espaçamentos
2. **Semântica HTML:** `<header>`, `<nav>`, `<section>`, `<article>`, `<aside>`
3. **Acessibilidade:** `aria-label`, `role`, `alt` text em imagens
4. **Mobile First:** Media queries de mobile → desktop
5. **Performance:** Lazy loading para imagens (`loading="lazy"`)
6. **ES6 Modules:** `import/export` nos scripts
7. **Nomenclatura PT-BR:** Variáveis e classes em português (`usuario`, `senha`, `autorizado`)

---

## 📱 RESPONSIVIDADE

### Breakpoints Padrão
```css
/* Mobile First */
.container {
    padding: 16px;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
    .container {
        padding: 24px;
    }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
    .container {
        padding: 32px;
        max-width: 1280px;
        margin: 0 auto;
    }
}
```

### Grid Responsivo
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Cards -->
</div>
```

---

## 🎯 PADRÕES DE CÓDIGO

### Estrutura de Arquivo HTML
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Título - Super Cartola Manager</title>

    <!-- Fontes -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

    <!-- TailwindCSS -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- CSS Tokens (sempre primeiro) -->
    <link rel="stylesheet" href="/css/_admin-tokens.css">

    <!-- CSS Custom -->
    <link rel="stylesheet" href="/css/custom.css">
</head>
<body class="bg-gray-900 text-white">
    <!-- Conteúdo -->

    <!-- Scripts -->
    <script type="module" src="/js/script.js"></script>
</body>
</html>
```

### Estrutura de Arquivo CSS
```css
/**
 * NOME DO MÓDULO - Super Cartola Manager
 * ==========================================
 * Descrição breve do propósito do arquivo
 */

/* ========================================
   1. VARIÁVEIS LOCAIS (se necessário)
   ======================================== */
.modulo-especifico {
    --local-spacing: 20px;
}

/* ========================================
   2. LAYOUT BASE
   ======================================== */
.modulo-container {
    background: var(--surface-bg);
    padding: var(--space-6);
}

/* ========================================
   3. COMPONENTES
   ======================================== */
.modulo-card {
    /* ... */
}

/* ========================================
   4. ESTADOS E INTERAÇÕES
   ======================================== */
.modulo-card:hover {
    /* ... */
}

/* ========================================
   5. RESPONSIVIDADE
   ======================================== */
@media (min-width: 768px) {
    /* ... */
}
```

### Estrutura de Arquivo JS (ES6 Module)
```javascript
/**
 * NOME DO MÓDULO - Super Cartola Manager
 * ==========================================
 * Descrição breve da funcionalidade
 */

// ========================================
// IMPORTAÇÕES
// ========================================
import { funcaoHelper } from './helpers.js';

// ========================================
// CONSTANTES E CONFIGURAÇÕES
// ========================================
const API_BASE = '/api';

// ========================================
// FUNÇÕES PRINCIPAIS
// ========================================
async function carregarDados() {
    try {
        const response = await fetch(`${API_BASE}/endpoint`);
        const data = await response.json();
        renderizarDados(data);
    } catch (erro) {
        console.error('Erro ao carregar dados:', erro);
        mostrarMensagemErro();
    }
}

function renderizarDados(data) {
    // Lógica de renderização
}

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
});

// ========================================
// EXPORTAÇÕES
// ========================================
export { carregarDados, renderizarDados };
```

---

## 🎬 ANIMAÇÕES E TRANSIÇÕES

### Transições Padrão
```css
/* Botões e elementos interativos */
.interactive {
    transition: all 0.3s ease;
}

/* Hover suave */
.card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    transition: var(--transition-normal);
}
```

### Animações Keyframe
```css
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in-up {
    animation: fadeInUp 0.4s ease-out;
}
```

### Loading States
```html
<div class="admin-spinner admin-spinner--md"></div>
```

---

## 📊 EXEMPLO COMPLETO: CARD DE MÓDULO

```html
<!-- HTML -->
<div class="modulo-artilheiro-card">
    <div class="modulo-artilheiro-card__header">
        <h2 class="font-brand text-2xl">Artilheiro Campeão</h2>
        <span class="badge-ativo">ATIVO</span>
    </div>

    <div class="modulo-artilheiro-card__body">
        <div class="stat-item">
            <span class="stat-label">Líder Atual</span>
            <span class="stat-value font-brand">Neymar Jr</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Gols</span>
            <span class="stat-value font-mono">23</span>
        </div>
    </div>

    <div class="modulo-artilheiro-card__footer">
        <button class="btn-primary">Ver Ranking</button>
    </div>
</div>
```

```css
/* CSS */
.modulo-artilheiro-card {
    background: var(--surface-card);
    border: 1px solid var(--module-artilheiro-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    transition: var(--transition-normal);
}

.modulo-artilheiro-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}

.modulo-artilheiro-card__header {
    background: var(--gradient-artilheiro);
    padding: var(--space-4);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modulo-artilheiro-card__body {
    padding: var(--space-6);
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-value {
    font-size: var(--font-size-2xl);
    color: var(--module-artilheiro-primary);
}

.modulo-artilheiro-card__footer {
    padding: var(--space-4);
    border-top: 1px solid var(--module-artilheiro-border);
    background: var(--module-artilheiro-muted);
}

.badge-ativo {
    background: var(--color-success-muted);
    color: var(--color-success);
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-family: var(--font-family-brand);
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* Responsividade */
@media (max-width: 768px) {
    .modulo-artilheiro-card__body {
        grid-template-columns: 1fr;
    }
}
```

---

## 🔍 CHECKLIST DE VALIDAÇÃO

Antes de entregar qualquer design/código, verifique:

### Design
- [ ] Dark mode aplicado (fundo `#121212` ou `#1a1a1a`)
- [ ] Cores usando variáveis CSS (não hardcoded)
- [ ] Fonte Russo One em títulos/stats/CTAs
- [ ] Fonte Inter no corpo de texto
- [ ] Espaçamento consistente (múltiplos de 4px)
- [ ] Hover/focus states definidos
- [ ] Contraste adequado (mínimo 4.5:1)

### Código HTML
- [ ] Doctype HTML5 presente
- [ ] Lang="pt-BR" no `<html>`
- [ ] Meta viewport para mobile
- [ ] Fontes carregadas via Google Fonts
- [ ] TailwindCSS via CDN
- [ ] Tags semânticas usadas
- [ ] Alt text em imagens

### Código CSS
- [ ] Arquivo `_admin-tokens.css` importado primeiro
- [ ] Variáveis CSS usadas (não valores mágicos)
- [ ] Mobile first (media queries min-width)
- [ ] Comentários organizados por seção
- [ ] Sem `!important` desnecessários
- [ ] Classes descritivas em PT-BR

### Código JavaScript
- [ ] `type="module"` no script
- [ ] ES6+ features usadas
- [ ] Try/catch em operações async
- [ ] Console.error para erros
- [ ] Funções documentadas
- [ ] Variáveis em camelCase PT-BR

### Performance
- [ ] Imagens otimizadas (WebP quando possível)
- [ ] Loading="lazy" em imagens off-screen
- [ ] CSS crítico inline (se necessário)
- [ ] Scripts no final do body ou defer
- [ ] Transições GPU-friendly (transform/opacity)

---

## 🎯 PROMPT FINAL PARA O STITCH

**Cole este prompt ao solicitar designs/códigos:**

```
Você é um designer/desenvolvedor especializado no Super Cartola Manager.

STACK OBRIGATÓRIA:
- HTML5 semântico + TailwindCSS 3.x (CDN) + Vanilla JavaScript ES6+
- Dark Mode obrigatório (bg: #121212/#1a1a1a)
- Fontes: Russo One (títulos/stats/CTAs), Inter (corpo), JetBrains Mono (números)

DESIGN SYSTEM:
- Cor primária: #FF5500 (laranja) → sempre use var(--color-primary)
- Módulos: Verde (#22c55e), Roxo (#8b5cf6), Dourado (#ffd700) → var(--module-[nome]-primary)
- Cards: bg-gray-800, rounded-lg, shadow-lg
- Botões: font-brand, uppercase, letter-spacing: 1px
- Espaçamento: múltiplos de 4px (space-1 a space-12)
- Border radius: 8px (botões), 12px (cards), 16px (containers)

RESTRIÇÕES:
❌ NUNCA: React/Vue, cores hardcoded, light mode, !important, IDs para estilo
✅ SEMPRE: Variáveis CSS, acessibilidade, mobile-first, classes em PT-BR

ESTRUTURA HTML OBRIGATÓRIA:
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Título] - Super Cartola Manager</title>
    <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/css/_admin-tokens.css">
</head>
<body class="bg-gray-900 text-white">
    <!-- Seu código aqui -->
    <script type="module" src="/js/script.js"></script>
</body>
</html>

TAREFA: [Descreva aqui o que você quer que o Stitch crie]
```

---

## 📚 REFERÊNCIAS RÁPIDAS

- **Variáveis CSS completas:** `/css/_admin-tokens.css`
- **Documentação oficial:** `/CLAUDE.md` e `/docs/`
- **Exemplos de código:** `/public/admin-*.html`
- **Escudos:** `/public/escudos/{clube_id}.png`
- **API Endpoints:** Consulte controllers em `/controllers/`

---

## 🆘 DÚVIDAS COMUNS

**P: Posso usar TailwindCSS customizado?**
R: Não. Use apenas o CDN padrão + CSS custom com variáveis.

**P: E se precisar de um componente complexo (carrossel, datepicker)?**
R: Prefira vanilla JS. Se inevitável, use libs minimalistas via CDN.

**P: Como lidar com estados de loading?**
R: Use a classe `.admin-spinner` definida em `_admin-tokens.css`.

**P: Posso mudar as cores dos módulos?**
R: Não. Elas têm significado simbólico (verde=gols, roxo=liderança, etc).

**P: E se o design ficar "pesado" no mobile?**
R: Simplifique! Oculte elementos secundários, use stacks verticais, reduza padding.

---

**Versão:** 1.0.0
**Última atualização:** 2026-02-08
**Mantido por:** Equipe Super Cartola Manager

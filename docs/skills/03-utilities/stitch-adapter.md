---
name: stitch-adapter
description: Adaptador inteligente de código HTML do Google Stitch. Recebe HTML gerado pelo Stitch e automaticamente separa HTML/CSS/JS, converte cores hardcoded para variáveis CSS, adapta à stack do projeto e sugere onde colocar cada arquivo. Use quando receber código do Google Stitch ou precisar adaptar HTML externo.
allowed-tools: Read, Grep, Edit, Write
---

# Stitch Adapter Skill (HTML → Project Stack)

## 🎯 Missão
Transformar código HTML bruto do Google Stitch em código production-ready adaptado à stack tecnológica e design system do Super Cartola Manager.

---

## 1. 📥 INPUT ESPERADO

### Formato
```html
<!-- Código que o Stitch gera (tudo misturado) -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Exemplo</title>
    <style>
        .card {
            background: #1a1a1a;
            color: #FF5500;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>Título</h2>
    </div>
    <script>
        console.log('Hello');
    </script>
</body>
</html>
```

---

## 2. 🔄 PROCESSO DE ADAPTAÇÃO

### FASE 1: Análise e Extração
```javascript
const processarStitchHTML = (codigo) => {
    // 1. Identificar blocos
    const blocos = {
        html: extrairHTML(codigo),
        css: extrairCSS(codigo),
        js: extrairJS(codigo),
        fonts: extrairFonts(codigo),
        externals: extrairExternals(codigo)
    };

    // 2. Validar compatibilidade
    const incompatibilidades = validarStack(blocos);

    // 3. Sugerir adaptações
    const adaptacoes = gerarAdaptacoes(blocos, incompatibilidades);

    return { blocos, incompatibilidades, adaptacoes };
};
```

### FASE 2: Conversão CSS
```javascript
const adaptarCSS = (css) => {
    const regras = [
        // Cores hardcoded → Variáveis CSS
        { de: '#FF5500', para: 'var(--color-primary)' },
        { de: '#FF4500', para: 'var(--color-primary)' },
        { de: '#1a1a1a', para: 'var(--surface-card)' },
        { de: '#121212', para: 'var(--surface-bg)' },
        { de: '#2a2a2a', para: 'var(--surface-card-elevated)' },
        { de: '#333333', para: 'var(--surface-card-hover)' },
        { de: '#ffffff', para: 'var(--text-primary)' },
        { de: '#e0e0e0', para: 'var(--text-secondary)' },
        { de: '#a0a0a0', para: 'var(--text-muted)' },
        { de: '#666666', para: 'var(--text-disabled)' },
        { de: '#10b981', para: 'var(--color-success)' },
        { de: '#22c55e', para: 'var(--module-artilheiro-primary)' },
        { de: '#8b5cf6', para: 'var(--module-capitao-primary)' },
        { de: '#ffd700', para: 'var(--module-luva-primary)' },
        { de: '#ef4444', para: 'var(--color-danger)' },
        { de: '#eab308', para: 'var(--color-warning)' },
        { de: '#3b82f6', para: 'var(--color-info)' },

        // Border radius
        { de: 'border-radius: 8px', para: 'border-radius: var(--radius-md)' },
        { de: 'border-radius: 12px', para: 'border-radius: var(--radius-lg)' },
        { de: 'border-radius: 16px', para: 'border-radius: var(--radius-xl)' },
        { de: 'border-radius: 4px', para: 'border-radius: var(--radius-sm)' },
        { de: 'border-radius: 50%', para: 'border-radius: var(--radius-full)' },
        { de: 'border-radius: 9999px', para: 'border-radius: var(--radius-full)' },

        // Espaçamento
        { de: 'padding: 4px', para: 'padding: var(--space-1)' },
        { de: 'padding: 8px', para: 'padding: var(--space-2)' },
        { de: 'padding: 12px', para: 'padding: var(--space-3)' },
        { de: 'padding: 16px', para: 'padding: var(--space-4)' },
        { de: 'padding: 20px', para: 'padding: var(--space-5)' },
        { de: 'padding: 24px', para: 'padding: var(--space-6)' },
        { de: 'padding: 32px', para: 'padding: var(--space-8)' },

        // Fontes
        { de: /font-family:\s*['"]?Russo One['"]?/gi, para: 'font-family: var(--font-family-brand)' },
        { de: /font-family:\s*['"]?Inter['"]?/gi, para: 'font-family: var(--font-family-base)' },
        { de: /font-family:\s*['"]?JetBrains Mono['"]?/gi, para: 'font-family: var(--font-family-mono)' },

        // Sombras
        { de: '0 2px 8px rgba(0, 0, 0, 0.2)', para: 'var(--shadow-sm)' },
        { de: '0 4px 16px rgba(0, 0, 0, 0.3)', para: 'var(--shadow-md)' },
        { de: '0 8px 32px rgba(0, 0, 0, 0.4)', para: 'var(--shadow-lg)' }
    ];

    let cssAdaptado = css;

    regras.forEach(regra => {
        if (typeof regra.de === 'string') {
            cssAdaptado = cssAdaptado.replaceAll(regra.de, regra.para);
        } else {
            cssAdaptado = cssAdaptado.replace(regra.de, regra.para);
        }
    });

    return cssAdaptado;
};
```

### FASE 3: Conversão HTML
```javascript
const adaptarHTML = (html) => {
    let htmlAdaptado = html;

    // Remover DOCTYPE, html, head, body se existirem (para fragmentos)
    htmlAdaptado = htmlAdaptado.replace(/<!DOCTYPE[^>]*>/gi, '');
    htmlAdaptado = htmlAdaptado.replace(/<\/?html[^>]*>/gi, '');
    htmlAdaptado = htmlAdaptado.replace(/<head>[\s\S]*?<\/head>/gi, '');
    htmlAdaptado = htmlAdaptado.replace(/<\/?body[^>]*>/gi, '');

    // Converter classes TailwindCSS para semânticas (quando aplicável)
    const tailwindMap = {
        'bg-gray-900': 'class="bg-surface"',
        'bg-gray-800': 'class="bg-card"',
        'bg-gray-700': 'class="bg-input"',
        'text-white': 'class="text-primary"',
        'text-gray-400': 'class="text-muted"',
        'rounded-lg': 'class="rounded-lg"', // manter TW para layout
        'flex': 'class="flex"', // manter TW para layout
        'grid': 'class="grid"' // manter TW para layout
    };

    // Adicionar comentários organizacionais
    htmlAdaptado = `<!-- ========================================
   COMPONENTE ADAPTADO DO GOOGLE STITCH
   Data: ${new Date().toISOString().split('T')[0]}
   ======================================== -->\n\n${htmlAdaptado}`;

    return htmlAdaptado.trim();
};
```

### FASE 4: Conversão JavaScript
```javascript
const adaptarJS = (js) => {
    let jsAdaptado = js;

    // Converter para ES6 Module
    if (!js.includes('import') && !js.includes('export')) {
        jsAdaptado = `/**
 * MÓDULO ADAPTADO DO GOOGLE STITCH
 * Data: ${new Date().toISOString().split('T')[0]}
 */

// ========================================
// IMPORTAÇÕES
// ========================================
// import { funcaoHelper } from './helpers.js';

// ========================================
// CONSTANTES
// ========================================
${jsAdaptado}

// ========================================
// EXPORTAÇÕES
// ========================================
// export { funcaoPrincipal };
`;
    }

    // Adicionar try/catch em funções async se não tiverem
    jsAdaptado = jsAdaptado.replace(
        /(async\s+function\s+\w+\s*\([^)]*\)\s*\{)(?!\s*try)/g,
        '$1\n    try {'
    );

    return jsAdaptado;
};
```

---

## 3. 🎯 REGRAS DE CLASSIFICAÇÃO

### Decisão: Admin vs App Participante
```javascript
const classificarDestino = (codigo) => {
    const indicadoresAdmin = [
        /admin/gi,
        /dashboard/gi,
        /gerenciar/gi,
        /configuração/gi,
        /sidebar/gi,
        /desktop/gi,
        /painel/gi,
        /controle/gi
    ];

    const indicadoresApp = [
        /mobile/gi,
        /participante/gi,
        /bottom.*nav/gi,
        /pwa/gi,
        /swipe/gi,
        /touch/gi,
        /fab/gi,
        /safe-area-inset/gi
    ];

    const scoreAdmin = indicadoresAdmin.filter(regex => regex.test(codigo)).length;
    const scoreApp = indicadoresApp.filter(regex => regex.test(codigo)).length;

    if (scoreAdmin > scoreApp) return 'admin';
    if (scoreApp > scoreAdmin) return 'app';

    // Ambíguo - perguntar ao usuário
    return 'ambiguo';
};
```

### Decisão: Fragmento vs Página Completa
```javascript
const classificarTipo = (html) => {
    const temDoctype = html.includes('<!DOCTYPE');
    const temHead = html.includes('<head>');
    const temBody = html.includes('<body>');

    if (temDoctype && temHead && temBody) {
        return 'pagina-completa';
    }

    if (!temDoctype && !temHead && !temBody) {
        return 'fragmento';
    }

    return 'hibrido'; // Precisa limpeza
};
```

---

## 4. 📁 ESTRUTURA DE OUTPUT

### Estrutura de Diretórios
```
ADMIN:
├── public/admin-[nome].html          # Página completa
├── public/css/admin-[nome].css       # CSS específico
└── public/js/admin-[nome].js         # JS específico

APP PARTICIPANTE:
├── public/participante/fronts/[nome].html    # Fragmento
├── public/participante/modules/[nome]/[nome].css
└── public/participante/modules/[nome]/[nome].js
```

### Template de Saída Admin
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Nome] - Super Cartola Manager Admin</title>

    <!-- Fontes -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

    <!-- Material Icons -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

    <!-- TailwindCSS -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- CSS Tokens (sempre primeiro) -->
    <link rel="stylesheet" href="/css/_admin-tokens.css">

    <!-- CSS Custom -->
    <link rel="stylesheet" href="/css/admin-[nome].css">
</head>
<body class="bg-gray-900 text-white">
    <!-- Conteúdo HTML adaptado -->
    [HTML_CONTENT]

    <!-- Scripts -->
    <script type="module" src="/js/admin-[nome].js"></script>
</body>
</html>
```

### Template de Saída App Participante (Fragmento)
```html
<!-- ========================================
   [NOME DO MÓDULO] - APP PARTICIPANTE
   Data: [DATA]
   ======================================== -->

<div id="[nome]-container">
    [HTML_CONTENT]
</div>

<!-- CSS inline crítico (se necessário) -->
<style>
/* Estilos específicos aqui */
</style>
```

---

## 5. 📋 PROTOCOLO DE EXECUÇÃO

### PASSO 1: Receber e Validar
```markdown
1. Receber código HTML do usuário
2. Validar se é HTML válido
3. Identificar tipo (admin/app, página/fragmento)
4. Listar dependências externas (CDNs, libs)
```

### PASSO 2: Extrair e Separar
```markdown
1. Extrair HTML puro (sem <head>, <script>, <style>)
2. Extrair CSS (inline + <style>)
3. Extrair JavaScript (inline + <script>)
4. Identificar fontes usadas
5. Identificar ícones (FA, Material, etc.)
```

### PASSO 3: Adaptar
```markdown
1. CSS:
   - Converter cores hardcoded → variáveis CSS
   - Converter valores hardcoded → variáveis de espaçamento/radius
   - Aplicar padrões de nomenclatura (PT-BR)
   - Organizar por seções comentadas

2. HTML:
   - Remover estruturas desnecessárias (se fragmento)
   - Converter classes quando aplicável
   - Adicionar comentários organizacionais
   - Garantir acessibilidade (aria-label, alt, etc.)

3. JavaScript:
   - Converter para ES6 Module
   - Adicionar try/catch
   - Adicionar comentários estruturais
   - Garantir nomenclatura PT-BR
```

### PASSO 4: Validar Compatibilidade
```markdown
□ Todas as cores usam variáveis CSS?
□ Fontes corretas (Russo One, Inter, JetBrains Mono)?
□ Ícones são Material Icons?
□ Dark mode aplicado?
□ Mobile-first (se app)?
□ Desktop layout (se admin)?
□ JavaScript é ES6 Module?
□ Sem React/Vue/Angular?
□ Acessibilidade OK?
□ Performance OK (lazy loading, etc.)?
```

### PASSO 5: Gerar Arquivos
```markdown
1. Criar arquivo HTML (página ou fragmento)
2. Criar arquivo CSS com variáveis adaptadas
3. Criar arquivo JS como ES6 module
4. Gerar instruções de integração
```

### PASSO 6: Documentar
```markdown
Gerar relatório com:
- Arquivos criados
- Localização de cada arquivo
- Instruções de integração
- Incompatibilidades encontradas
- Sugestões de melhoria
- Próximos passos
```

---

## 6. 🔍 DETECÇÃO DE INCOMPATIBILIDADES

### Incompatibilidades Críticas (BLOQUEAR)
```javascript
const incompatibilidadesCriticas = [
    {
        regex: /(react|vue|angular|svelte)/gi,
        msg: '❌ Framework JS detectado. Projeto usa Vanilla JS.',
        solucao: 'Reescrever componente em Vanilla JavaScript'
    },
    {
        regex: /from\s+['"]react['"]|require\(['"]react['"]\)/gi,
        msg: '❌ Import React detectado.',
        solucao: 'Remover dependência React e usar DOM API nativo'
    },
    {
        regex: /<svg[^>]*>[\s\S]*?<\/svg>/gi,
        msg: '⚠️ SVG inline detectado.',
        solucao: 'Usar Material Icons ou mover SVG para /public/img/'
    }
];
```

### Incompatibilidades Moderadas (AVISAR)
```javascript
const incompatibilidadesModeradas = [
    {
        regex: /font-awesome|fa-/gi,
        msg: '⚠️ Font Awesome detectado. Projeto usa Material Icons.',
        solucao: 'Converter ícones usando tabela de mapeamento'
    },
    {
        regex: /#[0-9a-f]{3,6}(?!.*var\()/gi,
        msg: '⚠️ Cores hardcoded detectadas.',
        solucao: 'Converter para variáveis CSS'
    },
    {
        regex: /background:\s*white|background:\s*#fff/gi,
        msg: '⚠️ Background claro detectado. Projeto é dark mode.',
        solucao: 'Substituir por var(--surface-bg) ou var(--surface-card)'
    },
    {
        regex: /bootstrap|material-ui|ant-design/gi,
        msg: '⚠️ Framework CSS externo detectado.',
        solucao: 'Usar apenas TailwindCSS + CSS custom'
    }
];
```

---

## 7. 📤 TEMPLATE DE RELATÓRIO

```markdown
# 📋 RELATÓRIO DE ADAPTAÇÃO - GOOGLE STITCH → SUPER CARTOLA

**Data:** [DATA]
**Tipo:** [Admin/App Participante]
**Formato:** [Página Completa/Fragmento]

---

## 📁 ARQUIVOS GERADOS

### HTML
- **Localização:** `[caminho/arquivo.html]`
- **Tamanho:** [X KB]
- **Linhas:** [X]

### CSS
- **Localização:** `[caminho/arquivo.css]`
- **Tamanho:** [X KB]
- **Linhas:** [X]
- **Variáveis CSS usadas:** [lista]

### JavaScript
- **Localização:** `[caminho/arquivo.js]`
- **Tamanho:** [X KB]
- **Linhas:** [X]
- **ES6 Module:** ✅

---

## 🔄 ADAPTAÇÕES REALIZADAS

### CSS
- ✅ [X] cores hardcoded convertidas para variáveis CSS
- ✅ [X] valores de espaçamento padronizados
- ✅ [X] border-radius usando variáveis
- ✅ Fontes adaptadas (Russo One, Inter, JetBrains Mono)

### HTML
- ✅ Estrutura limpa (fragmento puro)
- ✅ Classes semânticas aplicadas
- ✅ Acessibilidade garantida (aria-labels, alt text)
- ✅ Dark mode aplicado

### JavaScript
- ✅ Convertido para ES6 Module
- ✅ Try/catch adicionado
- ✅ Nomenclatura PT-BR
- ✅ Comentários estruturais

---

## ⚠️ INCOMPATIBILIDADES ENCONTRADAS

### Críticas
[lista de incompatibilidades críticas e soluções aplicadas]

### Moderadas
[lista de incompatibilidades moderadas e soluções aplicadas]

---

## 📝 INSTRUÇÕES DE INTEGRAÇÃO

### ADMIN
1. Arquivo HTML já está pronto em `public/admin-[nome].html`
2. CSS em `public/css/admin-[nome].css` (já importa `_admin-tokens.css`)
3. JS em `public/js/admin-[nome].js` (ES6 module)
4. Adicionar link no menu admin: `<a href="/admin-[nome]">...</a>`

### APP PARTICIPANTE
1. Fragmento em `public/participante/fronts/[nome].html`
2. CSS em `public/participante/modules/[nome]/[nome].css`
3. JS em `public/participante/modules/[nome]/[nome].js`
4. Adicionar rota no `participante-navigation.js`:
   ```javascript
   case '[nome]':
       await loadFragment('[nome]');
       break;
   ```
5. Adicionar item no bottom nav (se aplicável)

---

## 🎯 PRÓXIMOS PASSOS

1. [ ] Revisar código gerado
2. [ ] Testar em ambiente local
3. [ ] Ajustar responsividade (se necessário)
4. [ ] Validar acessibilidade (WCAG)
5. [ ] Testar performance (Lighthouse)
6. [ ] Commitar e fazer push
7. [ ] Testar em produção

---

## 📊 MÉTRICAS

- **Tempo de adaptação:** [X minutos]
- **Conversões CSS:** [X] cores, [X] espaçamentos, [X] fonts
- **Linhas de código:** [X HTML] + [X CSS] + [X JS]
- **Compatibilidade:** [XX%]

---

**Status:** ✅ ADAPTAÇÃO COMPLETA
```

---

## 8. 🎨 EXEMPLOS DE USO

### Exemplo 1: Card Admin Simples
```html
<!-- INPUT (Stitch) -->
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
        <p>Bem-vindo!</p>
    </div>
</body>
</html>
```

```html
<!-- OUTPUT (Adaptado) -->
<!-- HTML: public/admin-dashboard-card.html -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Card - Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/css/_admin-tokens.css">
    <link rel="stylesheet" href="/css/admin-dashboard-card.css">
</head>
<body class="bg-gray-900 text-white">
    <div class="dashboard-card">
        <h2 class="font-brand">Dashboard</h2>
        <p>Bem-vindo!</p>
    </div>
</body>
</html>
```

```css
/* CSS: public/css/admin-dashboard-card.css */
/**
 * DASHBOARD CARD - Admin
 * Adaptado do Google Stitch
 */

.dashboard-card {
    background: var(--surface-card);
    color: var(--color-primary);
    padding: var(--space-5);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
}

.dashboard-card h2 {
    font-family: var(--font-family-brand);
    font-size: var(--font-size-2xl);
    margin-bottom: var(--space-3);
}

.dashboard-card p {
    font-family: var(--font-family-base);
    color: var(--text-secondary);
}
```

### Exemplo 2: Fragmento App Participante
```html
<!-- INPUT (Stitch) -->
<div style="background: #1a1a1a; padding: 16px;">
    <h2 style="color: #FF5500; font-size: 24px;">Ranking</h2>
    <div id="ranking-list"></div>
</div>
<script>
    async function loadRanking() {
        const data = await fetch('/api/ranking').then(r => r.json());
        document.getElementById('ranking-list').innerHTML = data.map(item =>
            `<div>${item.nome}</div>`
        ).join('');
    }
    loadRanking();
</script>
```

```html
<!-- OUTPUT HTML: public/participante/fronts/ranking.html -->
<!-- ========================================
   RANKING - APP PARTICIPANTE
   Data: 2026-02-08
   ======================================== -->

<div id="ranking-container" class="module-container">
    <h2 class="module-title font-brand">Ranking</h2>
    <div id="ranking-list" class="ranking-list"></div>
</div>
```

```css
/* OUTPUT CSS: public/participante/modules/ranking/ranking.css */
/**
 * RANKING MODULE - App Participante
 * Adaptado do Google Stitch
 */

.module-container {
    background: var(--surface-card);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
}

.module-title {
    color: var(--color-primary);
    font-size: var(--font-size-2xl);
    font-family: var(--font-family-brand);
    margin-bottom: var(--space-4);
}

.ranking-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}
```

```javascript
/* OUTPUT JS: public/participante/modules/ranking/ranking.js */
/**
 * RANKING MODULE - App Participante
 * Adaptado do Google Stitch
 */

// ========================================
// FUNÇÕES PRINCIPAIS
// ========================================
async function loadRanking() {
    try {
        const response = await fetch('/api/ranking');
        const data = await response.json();

        const container = document.getElementById('ranking-list');
        container.innerHTML = data.map(item =>
            `<div class="ranking-item">${item.nome}</div>`
        ).join('');
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        showError('Não foi possível carregar o ranking');
    }
}

// ========================================
// INICIALIZAÇÃO
// ========================================
loadRanking();

// ========================================
// EXPORTAÇÕES
// ========================================
export { loadRanking };
```

---

## 9. 🚀 ATALHOS RÁPIDOS

### Comando Completo
```
Receba este código HTML do Google Stitch e adapte para o projeto:

[COLAR CÓDIGO AQUI]

Tipo: [Admin/App]
Nome do componente: [nome]
```

### Apenas Converter CSS
```
Converta apenas este CSS para variáveis do projeto:

[COLAR CSS AQUI]
```

### Apenas Validar Compatibilidade
```
Valide a compatibilidade deste código com a stack do projeto:

[COLAR CÓDIGO AQUI]
```

---

## 10. 📚 REFERÊNCIAS

- **Design System:** `/css/_admin-tokens.css`
- **Prompt Stitch:** `/.claude/STITCH-DESIGN-PROMPT.md`
- **Frontend Crafter:** `docs/skills/02-specialists/frontend-crafter.md`
- **Exemplo App:** `public/participante/fronts/*.html`
- **Exemplo Admin:** `public/admin-*.html`

---

**STATUS:** Stitch Adapter - READY TO TRANSFORM

**Versão:** 1.0

**Última atualização:** 2026-02-08

**Autor:** Super Cartola Manager Team

**Keywords para ativação:**
- "adaptar código do stitch"
- "código do google stitch"
- "converter html externo"
- "recebi código do stitch"
- "html do stitch"
- "processar stitch"

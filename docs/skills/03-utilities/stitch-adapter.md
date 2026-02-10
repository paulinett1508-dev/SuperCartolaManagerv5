---
name: stitch-adapter
description: "Adaptador inteligente de UI gerada pelo Google Stitch. PLANO A de criacao de UI: via MCP Stitch (geracao automatica) ou via HTML colado (adaptacao manual). Avalia qualidade do HTML, separa HTML/CSS/JS, converte para variaveis CSS do design system, adapta a stack Vanilla JS do projeto e gera relatorio completo de conformidade."
allowed-tools: Read, Grep, Edit, Write, Glob
version: 2.0
---

# Stitch Adapter Skill v2.0 (MCP-First + Avaliador de Qualidade)

## Estrategia de Design-to-Code

```
PLANO A (Automatico): Google Stitch MCP → Gera HTML → Avalia → Adapta → Production-Ready
PLANO B (Manual):     HTML colado pelo usuario → Avalia → Adapta → Production-Ready
PLANO C (Fallback):   Figma MCP → Exporta React → Transforma Vanilla → Adapta
```

**Por que Stitch > Figma?**
- Stitch **gera UI a partir de texto** (poder de criacao autonomo)
- Stitch **exporta HTML/CSS/JS nativo** (sem necessidade de transformer React → Vanilla)
- Figma exige design manual e exporta React (precisa de transformer complexo)
- Projeto ja usa Vanilla JS + TailwindCSS CDN (stack nativa do Stitch)

---

## 1. MODOS DE OPERACAO

### MODO A: Via MCP Stitch (Automatico)

Quando o MCP `stitch` esta configurado em `.mcp.json`:

```
1. Usuario descreve o que quer ("crie um card de ranking mobile")
2. Skill monta prompt otimizado usando STITCH-DESIGN-PROMPT.md
3. MCP Stitch gera HTML completo
4. Avaliador de qualidade analisa output (score 0-100)
5. Se score >= 70: adapta automaticamente
6. Se score < 70: lista problemas e sugere correcoes
7. Gera arquivos production-ready + relatorio
```

**Deteccao automatica do MCP:**
```javascript
// Verificar se MCP Stitch esta disponivel
const temMCPStitch = typeof mcp__stitch !== 'undefined';

if (temMCPStitch) {
    // MODO A: Gerar via MCP
    console.log('Stitch MCP detectado - Modo automatico');
} else {
    // MODO B: Aguardar HTML colado
    console.log('Stitch MCP nao disponivel - Modo manual (cole o HTML)');
}
```

### MODO B: Via HTML Colado (Manual)

Quando o MCP nao esta disponivel ou usuario ja tem o HTML:

```
1. Usuario cola HTML do Google Stitch
2. Avaliador de qualidade analisa (score 0-100)
3. Adapta automaticamente
4. Gera arquivos + relatorio
```

---

## 2. AVALIADOR DE QUALIDADE (Score 0-100)

### Criterios de Avaliacao

O avaliador analisa o HTML recebido em **8 dimensoes**:

| Dimensao | Peso | O que avalia |
|----------|------|--------------|
| **Stack Compliance** | 20pts | Sem React/Vue/Angular, sem npm imports |
| **Dark Mode** | 15pts | Backgrounds escuros, texto claro |
| **Design Tokens** | 15pts | Uso de variaveis CSS ou cores mapeáveis |
| **Tipografia** | 10pts | Russo One/Inter/JetBrains Mono presentes |
| **Responsividade** | 10pts | Meta viewport, media queries, flexbox/grid |
| **Acessibilidade** | 10pts | aria-labels, alt text, semantica HTML |
| **JavaScript** | 10pts | ES6+, sem jQuery, try/catch em async |
| **Performance** | 10pts | Lazy loading, transicoes GPU-friendly |

### Logica de Avaliacao

```javascript
const avaliarQualidadeStitch = (codigo) => {
    let score = 0;
    const problemas = [];
    const sugestoes = [];

    // ========================================
    // 1. STACK COMPLIANCE (20 pts)
    // ========================================
    const temReact = /(from\s+['"]react|import\s+React|jsx|tsx|className=\{)/i.test(codigo);
    const temVue = /(v-if|v-for|v-model|<template>|<script setup>)/i.test(codigo);
    const temAngular = /(ng-|ngIf|ngFor|\*ngIf|\[ngClass\])/i.test(codigo);
    const temJQuery = /(\$\(|jQuery|\.ready\(|\.ajax\()/i.test(codigo);
    const temNpmImport = /from\s+['"]@?[a-z]/i.test(codigo);

    if (!temReact && !temVue && !temAngular) {
        score += 15;
    } else {
        problemas.push({
            tipo: 'CRITICO',
            msg: 'Framework JS detectado (React/Vue/Angular)',
            solucao: 'Reescrever em Vanilla JavaScript'
        });
    }

    if (!temJQuery) score += 3;
    else problemas.push({ tipo: 'MODERADO', msg: 'jQuery detectado', solucao: 'Usar DOM API nativo' });

    if (!temNpmImport) score += 2;
    else problemas.push({ tipo: 'MODERADO', msg: 'Import npm detectado', solucao: 'Usar CDN ou reescrever' });

    // ========================================
    // 2. DARK MODE (15 pts)
    // ========================================
    const temBgEscuro = /(#1[0-9a-f]{5}|#0[0-9a-f]{5}|#2[0-9a-f]{5}|bg-gray-[89]00|bg-slate-[89]00|rgba?\(1[0-9],|rgba?\(2[0-9],)/i.test(codigo);
    const temBgClaro = /(background:\s*(white|#fff|#ffffff|#f[0-9a-f]{4,5})|bg-white|bg-gray-[12]00)/i.test(codigo);
    const temTextoClaro = /(color:\s*(white|#fff|#ffffff|#e[0-9a-f]{4,5})|text-white|text-gray-[12]00)/i.test(codigo);

    if (temBgEscuro) score += 8;
    else problemas.push({ tipo: 'CRITICO', msg: 'Background escuro nao detectado', solucao: 'Aplicar dark mode' });

    if (!temBgClaro) score += 4;
    else problemas.push({ tipo: 'MODERADO', msg: 'Background claro detectado', solucao: 'Substituir por var(--surface-bg/card)' });

    if (temTextoClaro) score += 3;
    else sugestoes.push('Usar text-white ou var(--text-primary) para texto principal');

    // ========================================
    // 3. DESIGN TOKENS (15 pts)
    // ========================================
    const temVariaveisCSS = /var\(--/i.test(codigo);
    const coresHardcoded = (codigo.match(/#[0-9a-f]{3,8}(?!.*var\()/gi) || []).length;
    const temTokensAdmin = /var\(--(color-primary|surface-|text-|space-|radius-|shadow-|font-family-|module-)/i.test(codigo);
    const temTokensApp = /var\(--(app-|participante-)/i.test(codigo);

    if (temVariaveisCSS && temTokensAdmin) score += 15;
    else if (temVariaveisCSS) score += 10;
    else if (coresHardcoded <= 5) score += 5;
    else {
        score += 2; // pontos base por ter cores mapeáveis
        sugestoes.push(`${coresHardcoded} cores hardcoded detectadas - serao convertidas automaticamente`);
    }

    // ========================================
    // 4. TIPOGRAFIA (10 pts)
    // ========================================
    const temRussoOne = /russo\s*one/i.test(codigo);
    const temInter = /['"]Inter['"]/i.test(codigo);
    const temJetBrains = /JetBrains\s*Mono/i.test(codigo);
    const temFontBrand = /font-brand|font-family-brand/i.test(codigo);

    if (temRussoOne || temFontBrand) score += 5;
    else sugestoes.push('Adicionar Russo One para titulos e stats');

    if (temInter) score += 3;
    if (temJetBrains) score += 2;

    // ========================================
    // 5. RESPONSIVIDADE (10 pts)
    // ========================================
    const temViewport = /viewport/i.test(codigo);
    const temMediaQuery = /@media/i.test(codigo);
    const temFlexGrid = /(display:\s*(flex|grid)|flex-|grid-cols)/i.test(codigo);
    const temMobileFirst = /min-width/i.test(codigo);

    if (temViewport) score += 3;
    if (temMediaQuery) score += 3;
    else sugestoes.push('Adicionar media queries para responsividade');
    if (temFlexGrid) score += 2;
    if (temMobileFirst) score += 2;

    // ========================================
    // 6. ACESSIBILIDADE (10 pts)
    // ========================================
    const temAriaLabel = /aria-label/i.test(codigo);
    const temAltText = /alt\s*=/i.test(codigo);
    const temSemantica = /<(header|nav|main|section|article|aside|footer)/i.test(codigo);
    const temRole = /role\s*=/i.test(codigo);

    if (temSemantica) score += 4;
    else sugestoes.push('Usar tags semanticas (header, nav, main, section, footer)');
    if (temAriaLabel || temRole) score += 3;
    if (temAltText) score += 3;

    // ========================================
    // 7. JAVASCRIPT (10 pts)
    // ========================================
    const temES6 = /(const |let |=>|async |await |import |export |class )/i.test(codigo);
    const temTryCatch = /try\s*\{/i.test(codigo);
    const temModuleType = /type\s*=\s*["']module["']/i.test(codigo);

    if (temES6) score += 4;
    if (temTryCatch) score += 3;
    if (temModuleType) score += 3;

    // ========================================
    // 8. PERFORMANCE (10 pts)
    // ========================================
    const temLazyLoad = /loading\s*=\s*["']lazy["']/i.test(codigo);
    const temPreconnect = /preconnect/i.test(codigo);
    const temTransformGPU = /transform:|opacity:|will-change/i.test(codigo);

    if (temLazyLoad) score += 3;
    if (temPreconnect) score += 3;
    if (temTransformGPU) score += 4;
    else score += 2; // pontos base

    // ========================================
    // RESULTADO
    // ========================================
    const nivel = score >= 85 ? 'EXCELENTE' :
                  score >= 70 ? 'BOM' :
                  score >= 50 ? 'ACEITAVEL' :
                  score >= 30 ? 'PRECISA_MELHORAR' : 'CRITICO';

    return {
        score,
        nivel,
        problemas,
        sugestoes,
        autoAdaptavel: score >= 30, // quase tudo e adaptavel
        detalhes: {
            stackCompliance: { max: 20, obtido: /* calculado */ },
            darkMode: { max: 15, obtido: /* calculado */ },
            designTokens: { max: 15, obtido: /* calculado */ },
            tipografia: { max: 10, obtido: /* calculado */ },
            responsividade: { max: 10, obtido: /* calculado */ },
            acessibilidade: { max: 10, obtido: /* calculado */ },
            javascript: { max: 10, obtido: /* calculado */ },
            performance: { max: 10, obtido: /* calculado */ }
        }
    };
};
```

### Interpretacao do Score

| Score | Nivel | Acao |
|-------|-------|------|
| **85-100** | EXCELENTE | Adaptacao automatica, minimas mudancas |
| **70-84** | BOM | Adaptacao automatica com ajustes moderados |
| **50-69** | ACEITAVEL | Adaptacao automatica com muitos ajustes |
| **30-49** | PRECISA MELHORAR | Adaptavel mas com alertas criticos |
| **0-29** | CRITICO | Framework incompativel, reescrita necessaria |

---

## 3. MAPEAMENTO COMPLETO DE CONVERSOES

### 3.1 Cores → Variaveis CSS (Admin)

```javascript
const MAPA_CORES_ADMIN = [
    // Brand
    { de: '#FF5500', para: 'var(--color-primary)' },
    { de: '#ff5500', para: 'var(--color-primary)' },
    { de: '#FF4500', para: 'var(--color-primary)' },
    { de: '#ff4500', para: 'var(--color-primary)' },
    { de: '#e8472b', para: 'var(--color-primary-dark)' },
    { de: '#ff6b35', para: 'var(--color-primary-light)' },

    // Superficies
    { de: '#121212', para: 'var(--surface-bg)' },
    { de: '#1a1a1a', para: 'var(--surface-card)' },
    { de: '#2a2a2a', para: 'var(--surface-card-elevated)' },
    { de: '#333333', para: 'var(--surface-card-hover)' },
    { de: '#1e1e1e', para: 'var(--surface-card)' },
    { de: '#0d0d0d', para: 'var(--bg-darker)' },
    { de: '#151515', para: 'var(--bg-elevated)' },
    { de: '#2d2d2d', para: 'var(--border-color)' },

    // Texto
    { de: '#ffffff', para: 'var(--text-primary)' },
    { de: '#FFFFFF', para: 'var(--text-primary)' },
    { de: '#e0e0e0', para: 'var(--text-secondary)' },
    { de: '#a0a0a0', para: 'var(--text-muted)' },
    { de: '#9ca3af', para: 'var(--text-muted)' },
    { de: '#666666', para: 'var(--text-disabled)' },
    { de: '#6b7280', para: 'var(--text-dim)' },

    // Status
    { de: '#10b981', para: 'var(--color-success)' },
    { de: '#22c55e', para: 'var(--color-success-light)' },
    { de: '#ef4444', para: 'var(--color-danger)' },
    { de: '#dc2626', para: 'var(--color-danger-dark)' },
    { de: '#eab308', para: 'var(--color-warning)' },
    { de: '#ca8a04', para: 'var(--color-warning-dark)' },
    { de: '#3b82f6', para: 'var(--color-info)' },

    // Ranking
    { de: '#ffd700', para: 'var(--color-gold)' },
    { de: '#FFD700', para: 'var(--color-gold)' },
    { de: '#c0c0c0', para: 'var(--color-silver)' },
    { de: '#cd7f32', para: 'var(--color-bronze)' },

    // Modulos
    { de: '#16a34a', para: 'var(--module-artilheiro-dark)' },
    { de: '#4ade80', para: 'var(--module-artilheiro-light)' },
    { de: '#8b5cf6', para: 'var(--module-capitao-primary)' },
    { de: '#7c3aed', para: 'var(--module-capitao-dark)' },
    { de: '#a78bfa', para: 'var(--module-capitao-light)' },
    { de: '#f0c000', para: 'var(--module-luva-dark)' },
    { de: '#ffe44d', para: 'var(--module-luva-light)' },
    { de: '#059669', para: 'var(--module-saude-dark)' },
    { de: '#34d399', para: 'var(--module-saude-light)' },

    // Cores extras frequentes no Stitch
    { de: '#f97316', para: 'var(--color-warning)' },   // orange-500
    { de: '#a855f7', para: 'var(--app-purple)' },       // purple-500
    { de: '#ec4899', para: 'var(--app-pink)' },          // pink-500
    { de: '#6366f1', para: 'var(--app-indigo)' },        // indigo-500
    { de: '#14b8a6', para: 'var(--app-teal)' },          // teal-500
    { de: '#f59e0b', para: 'var(--app-amber)' },         // amber-500
];
```

### 3.2 Cores → Variaveis CSS (App Participante)

```javascript
const MAPA_CORES_APP = [
    // Brand (prefixo --app-)
    { de: '#FF5500', para: 'var(--app-primary)' },
    { de: '#e8472b', para: 'var(--app-primary-dark)' },
    { de: '#ff6b35', para: 'var(--app-primary-light)' },

    // Superficies OLED
    { de: '#0a0a0a', para: 'var(--app-bg)' },
    { de: '#000000', para: 'var(--app-bg-dark)' },
    { de: '#1a1a1a', para: 'var(--app-surface)' },
    { de: '#1c1c1c', para: 'var(--app-surface-elevated)' },
    { de: '#333333', para: 'var(--app-surface-hover)' },

    // Texto
    { de: '#ffffff', para: 'var(--app-text-primary)' },
    // (rgba mapeados por regex abaixo)

    // Status
    { de: '#10b981', para: 'var(--app-success)' },
    { de: '#22c55e', para: 'var(--app-success-light)' },
    { de: '#ef4444', para: 'var(--app-danger)' },
    { de: '#eab308', para: 'var(--app-warning)' },
    { de: '#3b82f6', para: 'var(--app-info)' },

    // Ranking
    { de: '#ffd700', para: 'var(--app-gold)' },
    { de: '#c0c0c0', para: 'var(--app-silver)' },
    { de: '#cd7f32', para: 'var(--app-bronze)' },

    // Posicoes
    { de: '#f97316', para: 'var(--app-pos-gol)' },
    { de: '#a855f7', para: 'var(--app-pos-tec)' },
];
```

### 3.3 Espacamento (Padding, Margin, Gap)

```javascript
const MAPA_ESPACAMENTO_ADMIN = [
    // Padding
    { de: /padding:\s*4px/gi, para: 'padding: var(--space-1)' },
    { de: /padding:\s*8px/gi, para: 'padding: var(--space-2)' },
    { de: /padding:\s*12px/gi, para: 'padding: var(--space-3)' },
    { de: /padding:\s*16px/gi, para: 'padding: var(--space-4)' },
    { de: /padding:\s*20px/gi, para: 'padding: var(--space-5)' },
    { de: /padding:\s*24px/gi, para: 'padding: var(--space-6)' },
    { de: /padding:\s*32px/gi, para: 'padding: var(--space-8)' },
    { de: /padding:\s*40px/gi, para: 'padding: var(--space-10)' },
    { de: /padding:\s*48px/gi, para: 'padding: var(--space-12)' },

    // Margin
    { de: /margin:\s*4px/gi, para: 'margin: var(--space-1)' },
    { de: /margin:\s*8px/gi, para: 'margin: var(--space-2)' },
    { de: /margin:\s*12px/gi, para: 'margin: var(--space-3)' },
    { de: /margin:\s*16px/gi, para: 'margin: var(--space-4)' },
    { de: /margin:\s*20px/gi, para: 'margin: var(--space-5)' },
    { de: /margin:\s*24px/gi, para: 'margin: var(--space-6)' },
    { de: /margin:\s*32px/gi, para: 'margin: var(--space-8)' },

    // Gap
    { de: /gap:\s*4px/gi, para: 'gap: var(--space-1)' },
    { de: /gap:\s*8px/gi, para: 'gap: var(--space-2)' },
    { de: /gap:\s*12px/gi, para: 'gap: var(--space-3)' },
    { de: /gap:\s*16px/gi, para: 'gap: var(--space-4)' },
    { de: /gap:\s*20px/gi, para: 'gap: var(--space-5)' },
    { de: /gap:\s*24px/gi, para: 'gap: var(--space-6)' },
    { de: /gap:\s*32px/gi, para: 'gap: var(--space-8)' },

    // Margin-bottom, margin-top (frequentes)
    { de: /margin-bottom:\s*4px/gi, para: 'margin-bottom: var(--space-1)' },
    { de: /margin-bottom:\s*8px/gi, para: 'margin-bottom: var(--space-2)' },
    { de: /margin-bottom:\s*12px/gi, para: 'margin-bottom: var(--space-3)' },
    { de: /margin-bottom:\s*16px/gi, para: 'margin-bottom: var(--space-4)' },
    { de: /margin-bottom:\s*24px/gi, para: 'margin-bottom: var(--space-6)' },
    { de: /margin-bottom:\s*32px/gi, para: 'margin-bottom: var(--space-8)' },
    { de: /margin-top:\s*4px/gi, para: 'margin-top: var(--space-1)' },
    { de: /margin-top:\s*8px/gi, para: 'margin-top: var(--space-2)' },
    { de: /margin-top:\s*16px/gi, para: 'margin-top: var(--space-4)' },
    { de: /margin-top:\s*24px/gi, para: 'margin-top: var(--space-6)' },
];

const MAPA_ESPACAMENTO_APP = [
    // App usa escala diferente (mais compacta para mobile)
    { de: /padding:\s*4px/gi, para: 'padding: var(--app-space-1)' },
    { de: /padding:\s*8px/gi, para: 'padding: var(--app-space-2)' },
    { de: /padding:\s*10px/gi, para: 'padding: var(--app-space-3)' },
    { de: /padding:\s*12px/gi, para: 'padding: var(--app-space-4)' },
    { de: /padding:\s*16px/gi, para: 'padding: var(--app-space-5)' },
    { de: /padding:\s*20px/gi, para: 'padding: var(--app-space-6)' },
    { de: /padding:\s*24px/gi, para: 'padding: var(--app-space-8)' },
    { de: /padding:\s*32px/gi, para: 'padding: var(--app-space-10)' },
    // Gap/Margin seguem o mesmo padrao com --app-space-*
];
```

### 3.4 Border Radius

```javascript
const MAPA_RADIUS_ADMIN = [
    { de: /border-radius:\s*4px/gi, para: 'border-radius: var(--radius-sm)' },
    { de: /border-radius:\s*8px/gi, para: 'border-radius: var(--radius-md)' },
    { de: /border-radius:\s*10px/gi, para: 'border-radius: var(--radius-md)' },
    { de: /border-radius:\s*12px/gi, para: 'border-radius: var(--radius-lg)' },
    { de: /border-radius:\s*16px/gi, para: 'border-radius: var(--radius-xl)' },
    { de: /border-radius:\s*20px/gi, para: 'border-radius: var(--radius-2xl)' },
    { de: /border-radius:\s*50%/gi, para: 'border-radius: var(--radius-full)' },
    { de: /border-radius:\s*9999px/gi, para: 'border-radius: var(--radius-full)' },
    { de: /border-radius:\s*100%/gi, para: 'border-radius: var(--radius-full)' },
];

const MAPA_RADIUS_APP = [
    { de: /border-radius:\s*6px/gi, para: 'border-radius: var(--app-radius-sm)' },
    { de: /border-radius:\s*8px/gi, para: 'border-radius: var(--app-radius-md)' },
    { de: /border-radius:\s*12px/gi, para: 'border-radius: var(--app-radius-lg)' },
    { de: /border-radius:\s*16px/gi, para: 'border-radius: var(--app-radius-xl)' },
    { de: /border-radius:\s*20px/gi, para: 'border-radius: var(--app-radius-2xl)' },
    { de: /border-radius:\s*24px/gi, para: 'border-radius: var(--app-radius-3xl)' },
    { de: /border-radius:\s*50%/gi, para: 'border-radius: var(--app-radius-full)' },
    { de: /border-radius:\s*9999px/gi, para: 'border-radius: var(--app-radius-full)' },
];
```

### 3.5 Fontes

```javascript
const MAPA_FONTES_ADMIN = [
    { de: /font-family:\s*['"]?Russo One['"]?[^;]*/gi, para: 'font-family: var(--font-family-brand)' },
    { de: /font-family:\s*['"]?Inter['"]?[^;]*/gi, para: 'font-family: var(--font-family-base)' },
    { de: /font-family:\s*['"]?JetBrains Mono['"]?[^;]*/gi, para: 'font-family: var(--font-family-mono)' },
];

const MAPA_FONTES_APP = [
    { de: /font-family:\s*['"]?Russo One['"]?[^;]*/gi, para: 'font-family: var(--app-font-brand)' },
    { de: /font-family:\s*['"]?Inter['"]?[^;]*/gi, para: 'font-family: var(--app-font-base)' },
    { de: /font-family:\s*['"]?JetBrains Mono['"]?[^;]*/gi, para: 'font-family: var(--app-font-mono)' },
];
```

### 3.6 Sombras

```javascript
const MAPA_SOMBRAS = [
    { de: /box-shadow:\s*0\s+2px\s+8px\s+rgba\(0,?\s*0,?\s*0,?\s*0\.2\)/gi, para: 'box-shadow: var(--shadow-sm)' },
    { de: /box-shadow:\s*0\s+4px\s+16px\s+rgba\(0,?\s*0,?\s*0,?\s*0\.3\)/gi, para: 'box-shadow: var(--shadow-md)' },
    { de: /box-shadow:\s*0\s+8px\s+32px\s+rgba\(0,?\s*0,?\s*0,?\s*0\.4\)/gi, para: 'box-shadow: var(--shadow-lg)' },
    { de: /box-shadow:\s*0\s+16px\s+48px\s+rgba\(0,?\s*0,?\s*0,?\s*0\.5\)/gi, para: 'box-shadow: var(--shadow-xl)' },
    // Glow laranja
    { de: /box-shadow:\s*0\s+4px\s+15px\s+rgba\(255,?\s*85,?\s*0/gi, para: 'box-shadow: var(--shadow-primary)' },
];
```

### 3.7 Transicoes

```javascript
const MAPA_TRANSICOES = [
    { de: /transition:\s*all\s+0\.15s\s+ease/gi, para: 'transition: var(--transition-fast)' },
    { de: /transition:\s*all\s+0\.2s\s+ease/gi, para: 'transition: var(--transition-fast)' },
    { de: /transition:\s*all\s+0\.3s\s+ease/gi, para: 'transition: var(--transition-normal)' },
    { de: /transition:\s*all\s+0\.5s\s+ease/gi, para: 'transition: var(--transition-slow)' },
];
```

### 3.8 Mapeamento de Icones (FontAwesome → Material Icons)

```javascript
const MAPA_ICONES = [
    // Navegacao
    { de: 'fa-home', para: '<span class="material-icons">home</span>' },
    { de: 'fa-arrow-left', para: '<span class="material-icons">arrow_back</span>' },
    { de: 'fa-arrow-right', para: '<span class="material-icons">arrow_forward</span>' },
    { de: 'fa-bars', para: '<span class="material-icons">menu</span>' },
    { de: 'fa-times', para: '<span class="material-icons">close</span>' },
    { de: 'fa-search', para: '<span class="material-icons">search</span>' },

    // Acoes
    { de: 'fa-plus', para: '<span class="material-icons">add</span>' },
    { de: 'fa-edit', para: '<span class="material-icons">edit</span>' },
    { de: 'fa-pencil', para: '<span class="material-icons">edit</span>' },
    { de: 'fa-trash', para: '<span class="material-icons">delete</span>' },
    { de: 'fa-save', para: '<span class="material-icons">save</span>' },
    { de: 'fa-download', para: '<span class="material-icons">download</span>' },
    { de: 'fa-upload', para: '<span class="material-icons">upload</span>' },

    // Status
    { de: 'fa-check', para: '<span class="material-icons">check</span>' },
    { de: 'fa-check-circle', para: '<span class="material-icons">check_circle</span>' },
    { de: 'fa-exclamation-triangle', para: '<span class="material-icons">warning</span>' },
    { de: 'fa-info-circle', para: '<span class="material-icons">info</span>' },
    { de: 'fa-ban', para: '<span class="material-icons">block</span>' },

    // Esportes / Cartola
    { de: 'fa-trophy', para: '<span class="material-icons">emoji_events</span>' },
    { de: 'fa-futbol', para: '<span class="material-icons">sports_soccer</span>' },
    { de: 'fa-star', para: '<span class="material-icons">star</span>' },
    { de: 'fa-medal', para: '<span class="material-icons">military_tech</span>' },
    { de: 'fa-crown', para: '<span class="material-icons">workspace_premium</span>' },
    { de: 'fa-shield', para: '<span class="material-icons">shield</span>' },

    // Financeiro
    { de: 'fa-dollar-sign', para: '<span class="material-icons">attach_money</span>' },
    { de: 'fa-money-bill', para: '<span class="material-icons">payments</span>' },
    { de: 'fa-chart-line', para: '<span class="material-icons">trending_up</span>' },
    { de: 'fa-chart-bar', para: '<span class="material-icons">bar_chart</span>' },

    // Usuarios
    { de: 'fa-user', para: '<span class="material-icons">person</span>' },
    { de: 'fa-users', para: '<span class="material-icons">group</span>' },
    { de: 'fa-cog', para: '<span class="material-icons">settings</span>' },
    { de: 'fa-sign-out', para: '<span class="material-icons">logout</span>' },
    { de: 'fa-bell', para: '<span class="material-icons">notifications</span>' },

    // Misc
    { de: 'fa-calendar', para: '<span class="material-icons">calendar_today</span>' },
    { de: 'fa-clock', para: '<span class="material-icons">schedule</span>' },
    { de: 'fa-eye', para: '<span class="material-icons">visibility</span>' },
    { de: 'fa-eye-slash', para: '<span class="material-icons">visibility_off</span>' },
    { de: 'fa-filter', para: '<span class="material-icons">filter_list</span>' },
    { de: 'fa-sort', para: '<span class="material-icons">sort</span>' },
    { de: 'fa-refresh', para: '<span class="material-icons">refresh</span>' },
    { de: 'fa-spinner', para: '<div class="admin-spinner admin-spinner--sm"></div>' },
];
```

### 3.9 Estrategia de Classes TailwindCSS

**Regra:** Manter classes Tailwind de layout, converter classes de cor/tema.

```javascript
const TAILWIND_MANTER = [
    // Layout - MANTER sempre
    'flex', 'grid', 'block', 'inline', 'hidden',
    'flex-col', 'flex-row', 'flex-wrap',
    'items-center', 'items-start', 'items-end',
    'justify-center', 'justify-between', 'justify-start', 'justify-end',
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4',
    'col-span-', 'row-span-',
    'w-full', 'h-full', 'w-auto', 'h-auto',
    'min-w-', 'max-w-', 'min-h-', 'max-h-',
    'overflow-', 'relative', 'absolute', 'fixed', 'sticky',
    'top-', 'bottom-', 'left-', 'right-',
    'z-',

    // Spacing Tailwind - MANTER (funciona com CDN)
    'p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-',
    'm-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-',
    'gap-', 'space-x-', 'space-y-',

    // Responsive prefixes - MANTER
    'sm:', 'md:', 'lg:', 'xl:', '2xl:',

    // Interacao - MANTER
    'hover:', 'focus:', 'active:', 'group-hover:',
    'transition-', 'duration-', 'ease-',
    'cursor-pointer', 'cursor-default',
    'select-none', 'pointer-events-',
];

const TAILWIND_CONVERTER = {
    // Background - converter para classes semanticas
    'bg-gray-900': 'bg-surface',     // use CSS: .bg-surface { background: var(--surface-bg); }
    'bg-gray-800': 'bg-card',        // use CSS: .bg-card { background: var(--surface-card); }
    'bg-gray-700': 'bg-input',       // use CSS: .bg-input { background: var(--input-bg); }

    // Texto - converter
    'text-white': '',                  // ja e o padrao em dark mode (body)
    'text-gray-400': 'text-muted',
    'text-gray-300': 'text-secondary',
    'text-gray-500': 'text-disabled',

    // Cores de modulo - converter para classes semanticas
    'text-green-400': 'text-artilheiro',
    'text-purple-400': 'text-capitao',
    'text-yellow-400': 'text-luva',
    'text-orange-500': 'text-primary',
};
```

---

## 4. PROCESSO DE ADAPTACAO (Completo)

### FASE 1: Receber e Classificar

```markdown
1. Receber codigo (via MCP ou colado)
2. Executar AVALIADOR DE QUALIDADE (score 0-100)
3. Classificar destino:
   - Admin vs App Participante
   - Pagina completa vs Fragmento
4. Identificar dependencias externas
5. Apresentar resultado da avaliacao ao usuario
```

#### Decisao: Admin vs App Participante

```javascript
const classificarDestino = (codigo) => {
    const indicadoresAdmin = [
        /admin/gi, /dashboard/gi, /gerenciar/gi, /configuracao/gi,
        /sidebar/gi, /desktop/gi, /painel/gi, /controle/gi,
        /tabela/gi, /relatorio/gi, /configurar/gi
    ];

    const indicadoresApp = [
        /mobile/gi, /participante/gi, /bottom.*nav/gi, /pwa/gi,
        /swipe/gi, /touch/gi, /fab/gi, /safe-area/gi,
        /app-/gi, /--app-/gi, /bottom-nav/gi, /header-mobile/gi
    ];

    const scoreAdmin = indicadoresAdmin.filter(r => r.test(codigo)).length;
    const scoreApp = indicadoresApp.filter(r => r.test(codigo)).length;

    if (scoreAdmin > scoreApp) return 'admin';
    if (scoreApp > scoreAdmin) return 'app';
    return 'ambiguo'; // perguntar ao usuario
};
```

### FASE 2: Extrair e Separar

```markdown
1. Extrair HTML puro (sem <head>, <script>, <style>)
2. Extrair CSS (inline + <style> blocks)
3. Extrair JavaScript (inline + <script> blocks)
4. Extrair style="" inline e converter para classes
5. Identificar fontes externas usadas
6. Identificar icones (FA, Material, Heroicons, etc.)
7. Identificar CDNs e dependencias
```

### FASE 3: Adaptar CSS

```markdown
Aplicar mapeamentos na ordem:
1. Cores hardcoded → variaveis CSS (admin ou app conforme destino)
2. Espacamento (padding/margin/gap) → variaveis
3. Border-radius → variaveis
4. Fontes → variaveis
5. Sombras → variaveis
6. Transicoes → variaveis
7. rgba() com valores conhecidos → variaveis
8. Organizar por secoes comentadas
```

### FASE 4: Adaptar HTML

```markdown
1. Se fragmento (app): remover DOCTYPE, html, head, body
2. Converter icones FontAwesome → Material Icons
3. Adicionar classes semanticas
4. Converter classes Tailwind de tema (manter layout)
5. Extrair styles inline → classes CSS
6. Adicionar comentarios organizacionais
7. Garantir acessibilidade (aria-label, role, alt)
8. Adicionar data-attributes para JS
```

### FASE 5: Adaptar JavaScript

```markdown
1. Converter para ES6 Module (import/export)
2. Adicionar try/catch em funcoes async
3. Converter variavel naming para PT-BR (camelCase)
4. Remover jQuery se presente → DOM API nativo
5. Remover console.log → console.error para erros
6. Adicionar comentarios estruturais
7. Gerar exports das funcoes publicas
```

### FASE 6: Validar e Gerar

```markdown
CHECKLIST FINAL:
[ ] Todas as cores usam variaveis CSS?
[ ] Fontes corretas (Russo One, Inter, JetBrains Mono)?
[ ] Icones sao Material Icons?
[ ] Dark mode consistente?
[ ] Mobile-first (se app)?
[ ] JavaScript e ES6 Module?
[ ] Sem React/Vue/Angular?
[ ] Acessibilidade OK (aria, alt, semantica)?
[ ] Touch targets >= 44px (se app mobile)?
[ ] Performance OK (lazy loading, GPU transitions)?
```

---

## 5. ESTRUTURA DE OUTPUT

### Admin

```
public/admin-[nome].html          # Pagina completa
public/css/admin-[nome].css       # CSS com tokens admin
public/js/admin-[nome].js         # JS como ES6 module
```

**Template Admin:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Nome] - Super Cartola Manager Admin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/css/_admin-tokens.css">
    <link rel="stylesheet" href="/css/admin-[nome].css">
</head>
<body class="bg-gray-900 text-white">
    [HTML_CONTENT]
    <script type="module" src="/js/admin-[nome].js"></script>
</body>
</html>
```

### App Participante

```
public/participante/fronts/[nome].html           # Fragmento HTML
public/participante/modules/[nome]/[nome].css     # CSS com tokens app
public/participante/modules/[nome]/[nome].js      # JS como ES6 module
```

**Template Fragmento App:**
```html
<!-- ========================================
   [NOME] - APP PARTICIPANTE
   Adaptado do Google Stitch
   Data: [DATA]
   ======================================== -->

<div id="[nome]-container" class="module-container">
    [HTML_CONTENT]
</div>
```

### Integracao com Navigation (App)

Apos gerar os arquivos, instruir registro no `participante-navigation.js`:

```javascript
// Adicionar no objeto modulos:
modulos: {
    // ... existentes
    '[nome]': '/participante/fronts/[nome].html'
}

// Adicionar no carregamento de CSS:
// <link rel="stylesheet" href="/participante/modules/[nome]/[nome].css">

// Adicionar no carregamento de JS:
// import '/participante/modules/[nome]/[nome].js';
```

---

## 6. TEMPLATE DE RELATORIO

```markdown
# RELATORIO DE ADAPTACAO - GOOGLE STITCH → SUPER CARTOLA

**Data:** [DATA]
**Modo:** [MCP Automatico / HTML Manual]
**Destino:** [Admin / App Participante]
**Formato:** [Pagina Completa / Fragmento]

---

## AVALIACAO DE QUALIDADE

**Score:** [XX]/100 ([NIVEL])

| Dimensao | Score | Max |
|----------|-------|-----|
| Stack Compliance | [X] | 20 |
| Dark Mode | [X] | 15 |
| Design Tokens | [X] | 15 |
| Tipografia | [X] | 10 |
| Responsividade | [X] | 10 |
| Acessibilidade | [X] | 10 |
| JavaScript | [X] | 10 |
| Performance | [X] | 10 |

### Problemas Encontrados
[lista de problemas criticos e moderados]

### Sugestoes
[lista de melhorias opcionais]

---

## ARQUIVOS GERADOS

### HTML
- **Localização:** `[caminho]`
- **Linhas:** [X]

### CSS
- **Localização:** `[caminho]`
- **Linhas:** [X]
- **Variaveis CSS usadas:** [lista]
- **Conversoes realizadas:** [X] cores, [X] espacamentos, [X] radius

### JavaScript
- **Localização:** `[caminho]`
- **Linhas:** [X]
- **ES6 Module:** SIM/NAO

---

## ADAPTACOES REALIZADAS

### CSS ([X] conversoes)
- [X] cores hardcoded → variaveis CSS
- [X] valores de espacamento padronizados (padding/margin/gap)
- [X] border-radius usando variaveis
- [X] fontes adaptadas (Russo One, Inter, JetBrains Mono)
- [X] sombras convertidas
- [X] transicoes padronizadas

### HTML
- Estrutura limpa ([pagina/fragmento])
- Icones convertidos: [FA → Material Icons] ([X] icones)
- Acessibilidade: [aria-labels, alt text, semantica]
- Classes Tailwind: [X] mantidas (layout), [X] convertidas (tema)

### JavaScript
- ES6 Module: SIM/NAO
- Try/catch: [X] funcoes async protegidas
- Nomenclatura PT-BR: SIM/NAO
- jQuery removido: SIM/NAO/N/A

---

## INSTRUCOES DE INTEGRACAO

[Instrucoes especificas conforme destino admin/app]

---

## PROXIMOS PASSOS

1. [ ] Revisar codigo gerado
2. [ ] Testar em ambiente local
3. [ ] Ajustar responsividade (se necessario)
4. [ ] Registrar no navigation.js (se app)
5. [ ] Commitar e push
```

---

## 7. DETECCAO DE INCOMPATIBILIDADES

### Criticas (BLOQUEAR)

```javascript
const INCOMPATIBILIDADES_CRITICAS = [
    {
        regex: /(from\s+['"]react|import\s+React|ReactDOM|useState|useEffect)/gi,
        msg: 'Framework React detectado',
        solucao: 'Reescrever componentes em Vanilla JavaScript + DOM API'
    },
    {
        regex: /(v-if|v-for|v-model|<template>|createApp|defineComponent)/gi,
        msg: 'Framework Vue detectado',
        solucao: 'Reescrever em Vanilla JavaScript'
    },
    {
        regex: /(\*ngIf|\*ngFor|\[ngClass\]|@Component|@NgModule)/gi,
        msg: 'Framework Angular detectado',
        solucao: 'Reescrever em Vanilla JavaScript'
    },
    {
        regex: /from\s+['"]svelte|<script\s+lang=['"]ts["']>/gi,
        msg: 'Framework Svelte/TypeScript detectado',
        solucao: 'Converter para Vanilla JS puro'
    },
];
```

### Moderadas (AVISAR + Converter)

```javascript
const INCOMPATIBILIDADES_MODERADAS = [
    {
        regex: /(\$\(|jQuery|\.ready\(|\.ajax\(|\.on\()/gi,
        msg: 'jQuery detectado',
        solucao: 'Converter para DOM API nativo (querySelector, addEventListener, fetch)'
    },
    {
        regex: /font-awesome|fa-[a-z]/gi,
        msg: 'Font Awesome detectado (projeto usa Material Icons)',
        solucao: 'Converter usando tabela MAPA_ICONES'
    },
    {
        regex: /#[0-9a-f]{3,8}(?![^{]*var\()/gi,
        msg: 'Cores hardcoded detectadas',
        solucao: 'Converter para variaveis CSS automaticamente'
    },
    {
        regex: /background:\s*(white|#fff(?:fff)?|rgb\(255)/gi,
        msg: 'Background claro detectado (projeto e dark mode)',
        solucao: 'Substituir por var(--surface-bg) ou var(--surface-card)'
    },
    {
        regex: /bootstrap|material-ui|ant-design|chakra/gi,
        msg: 'Framework CSS externo detectado',
        solucao: 'Remover e usar TailwindCSS CDN + CSS custom'
    },
    {
        regex: /<svg[^>]*>[\s\S]*?<\/svg>/gi,
        msg: 'SVG inline detectado',
        solucao: 'Mover para /public/img/ ou substituir por Material Icons'
    },
    {
        regex: /heroicons|lucide|phosphor/gi,
        msg: 'Biblioteca de icones alternativa detectada',
        solucao: 'Converter para Material Icons'
    },
];
```

---

## 8. CONFIGURACAO DO MCP STITCH

### Instalacao

Pacote usado: **`@_davideast/stitch-mcp`** (David East, Google DevRel)
Autenticacao via API Key do Google AI Studio (sem necessidade de gcloud CLI).

```bash
# Obter API Key: https://aistudio.google.com/apikey
# Configuracao no .mcp.json:
```

```json
{
    "stitch": {
        "command": "npx",
        "args": ["-y", "@_davideast/stitch-mcp", "proxy"],
        "env": {
            "STITCH_API_KEY": "SUA_API_KEY_AQUI"
        }
    }
}
```

### Metodos de Autenticacao

| Metodo | Env Var | Quando Usar |
|--------|---------|-------------|
| **API Key** (recomendado) | `STITCH_API_KEY` | Replit, CI/CD, headless |
| gcloud ADC | `STITCH_USE_SYSTEM_GCLOUD=1` | Maquina local com gcloud |
| Access Token | `STITCH_ACCESS_TOKEN` | Token pre-existente |

### Requisitos

1. **Node.js v18+** instalado
2. **API Key** do Google AI Studio (https://aistudio.google.com/apikey)

### Verificacao

```bash
# Verificar se MCP esta registrado
claude mcp list | grep stitch

# Diagnostico completo
npx @_davideast/stitch-mcp doctor --verbose
```

### Tools Disponiveis (@_davideast/stitch-mcp)

| Tool | Funcao |
|------|--------|
| `create_app` | Gerar app/componente UI a partir de prompt |
| `update_app` | Atualizar app existente |
| `screenshot_app` | Capturar screenshot do app gerado |
| `get_app` | Recuperar codigo de app salvo |
| `list_apps` | Listar apps criados |

---

## 9. PROMPT OTIMIZADO PARA STITCH (via MCP)

Quando usando o MCP Stitch, a skill monta este prompt automaticamente baseado no `STITCH-DESIGN-PROMPT.md`:

```
Voce e designer do Super Cartola Manager.

STACK: HTML5 + TailwindCSS CDN + Vanilla JS ES6+
DARK MODE: bg-gray-900 (#121212), cards bg-gray-800 (#1a1a1a)
FONTS: Russo One (titulos/stats), Inter (corpo), JetBrains Mono (numeros)
CORES: Laranja #FF5500, Verde #22c55e, Roxo #8b5cf6, Dourado #ffd700
ICONES: Material Icons (nao FontAwesome)

RESTRICOES:
- NUNCA: React/Vue, cores hardcoded, light mode, jQuery
- SEMPRE: Variaveis CSS, acessibilidade, mobile-first, ES6 modules

TAREFA: [DESCRICAO DO USUARIO]
```

---

## 10. ATALHOS RAPIDOS

### Geracao Automatica (com MCP)
```
Crie no Stitch um card de ranking do modulo artilheiro para o app mobile
```

### Adaptacao Manual (sem MCP)
```
Recebi este codigo do Google Stitch, adapte para o projeto:
[COLAR HTML]
Tipo: [Admin/App]
Nome: [nome-do-componente]
```

### Apenas Avaliar Qualidade
```
Avalie a qualidade deste HTML do Stitch (nao adapte ainda):
[COLAR HTML]
```

### Apenas Converter CSS
```
Converta apenas este CSS para variaveis do projeto:
[COLAR CSS]
Destino: [Admin/App]
```

---

## 11. REFERENCIAS

- **Design System Admin:** `/css/_admin-tokens.css`
- **Design System App:** `/participante/css/_app-tokens.css`
- **Prompt Stitch:** `/.claude/STITCH-DESIGN-PROMPT.md`
- **Frontend Crafter:** `docs/skills/02-specialists/frontend-crafter.md`
- **MCP Config:** `/.mcp.json`
- **Exemplos Admin:** `public/admin-*.html`
- **Exemplos App:** `public/participante/fronts/*.html`
- **Navigation App:** `public/participante/js/participante-navigation.js`

---

**STATUS:** Stitch Adapter v2.0 - MCP-FIRST + AVALIADOR DE QUALIDADE

**Versao:** 2.0

**Ultima atualizacao:** 2026-02-10

**Changelog v2.0:**
- Adicionado suporte a MCP Stitch (Plano A automatico)
- Adicionado avaliador de qualidade com score 0-100
- Mapeamento completo de cores para ADMIN e APP tokens
- Mapeamento de margin/gap (alem de padding)
- Mapeamento de icones FontAwesome → Material Icons
- Estrategia de classes Tailwind (manter layout, converter tema)
- Mapeamento de tokens App Participante (--app-*)
- Deteccao expandida de incompatibilidades
- Template de integracao com navigation.js
- Documentacao do MCP Stitch e suas tools

**Keywords para ativacao:**
- "adaptar codigo do stitch"
- "codigo do google stitch"
- "converter html externo"
- "recebi codigo do stitch"
- "html do stitch"
- "processar stitch"
- "gerar UI no stitch"
- "criar componente no stitch"
- "avaliar html do stitch"
- "score do stitch"
- "qualidade do html"

# 🎨 PLANO DE IMPLEMENTAÇÃO: Figma MCP

**Data de criação:** 2026-02-09
**Autor:** Claude Code
**Decisão:** Integrar Figma como ferramenta principal de design (Stitch → fallback)

---

## 📋 SUMÁRIO EXECUTIVO

**Objetivo:** Automatizar workflow design → code usando Figma MCP

**ROI Estimado:** 17-29 horas/ano economizadas

**Investimento:** 1-2 semanas (5 fases)

**Custo:** $0 (Figma Free tier + API token grátis)

---

## 🎯 BENEFÍCIOS ESPERADOS

### 1. Design-to-Code Automation
- **Antes (Stitch manual):** 30-45 min por componente
- **Depois (Figma MCP):** 5-10 min por componente
- **Economia:** 20-35 min × 50 componentes/ano = **17-29h/ano**

### 2. Design Tokens Sincronizados
- Zero divergência entre design e código
- Atualizações de tema em segundos (não horas)
- Designer trabalha independente (não precisa developer)

### 3. Auditoria UX/UI Automatizada
- Validação automática de consistência
- Detecção de divergências antes de release
- Integração com skill `ux-auditor-app`

### 4. Component Library Reutilizável
- Acelera criação de novos módulos (Tiro Certo, Bolão)
- Padrões visuais consistentes
- Reduz duplicação de código (DRY)

---

## 🗺️ ROADMAP DE IMPLEMENTAÇÃO

### FASE 1: Setup Básico (1-2 dias) ⭐ PRIORIDADE IMEDIATA

#### 1.1 Criar Conta Figma (30 min)

**Plano recomendado:** Figma Free tier

**O que está incluído:**
- ✅ 3 projetos Figma
- ✅ 1 projeto FigJam
- ✅ Unlimited personal files
- ✅ **API access token grátis** (essencial para MCP)
- ✅ Plugins ilimitados
- ✅ Versionamento ilimitado

**Passos:**
1. Acessar https://figma.com/signup
2. Criar conta (usar email do projeto)
3. Confirmar email
4. Completar profile

---

#### 1.2 Gerar Access Token (10 min)

**Passos:**
1. Acessar https://figma.com/settings
2. Ir em **"Personal Access Tokens"**
3. Clicar em **"Create a new personal access token"**
4. Nome do token: `Super Cartola Manager MCP`
5. Scopes necessários:
   - ✅ File content (leitura)
   - ✅ Export (exportar assets)
   - ✅ Comments (opcional, para colaboração)
6. Copiar token: `figd_XXXXXXXXXXXXXXXXXXXXXXXX`
7. **⚠️ IMPORTANTE:** Salvar token em local seguro (não commitar!)

---

#### 1.3 Configurar Figma MCP (30 min)

**1.3.1 Atualizar `.mcp.json`**

```json
{
  "mcpServers": {
    "mongo": {
      "command": "node",
      "args": ["mongo-server.js"],
      "cwd": "/home/runner/workspace",
      "env": {
        "MONGO_URI": "mongodb+srv://admin:yFRLiUwIG5ZhQQ43@cluster0.fjcat.mongodb.net/cartola-manager?retryWrites=true&w=majority",
        "NODE_ENV": "production"
      }
    },
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@perplexity-ai/mcp-server"],
      "env": {
        "PERPLEXITY_API_KEY": "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"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "SEU_TOKEN_AQUI"
      }
    }
  }
}
```

**⚠️ SEGURANÇA:** Substituir `SEU_TOKEN_AQUI` pelo token real

**1.3.2 Conceder Permissões**

Atualizar `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "figma": {
      "allowed": [
        "mcp__figma__get_file",
        "mcp__figma__get_file_nodes",
        "mcp__figma__get_components",
        "mcp__figma__get_component_sets",
        "mcp__figma__get_styles",
        "mcp__figma__export_images"
      ]
    }
  }
}
```

**1.3.3 Testar Conexão**

```bash
# Restart Claude Code (se necessário)
# Testar MCP:
"Usando Figma MCP, liste meus arquivos disponíveis"

# Esperado:
# mcp__figma__list_files()
# Retorna: [lista de files do Figma]
```

---

### FASE 2: Criar Design System no Figma (1 semana)

#### 2.1 Estrutura do Projeto (1-2 horas)

**Criar novo projeto:**
1. No Figma, clicar em **"New Design File"**
2. Nome: **"Super Cartola Design System"**
3. Organizar em páginas:

```
Super Cartola Design System
│
├── 📄 Cover (capa com descrição)
├── 📄 Tokens (design tokens)
├── 📄 Components - Admin
├── 📄 Components - App (PWA)
├── 📄 Screens - Admin
└── 📄 Screens - App
```

---

#### 2.2 Design Tokens (2-3 horas)

**Página: Tokens**

**2.2.1 Colors (Cores dos Módulos)**

Criar color styles no Figma:

| Nome do Style | Valor | Uso |
|---------------|-------|-----|
| `Artilheiro/Primary` | `#22c55e` | Módulo Artilheiro Campeão |
| `Artilheiro/Muted` | `rgba(34, 197, 94, 0.1)` | Backgrounds sutis |
| `Artilheiro/Border` | `rgba(34, 197, 94, 0.3)` | Bordas |
| `Capitao/Primary` | `#8b5cf6` | Módulo Capitão de Luxo |
| `Capitao/Muted` | `rgba(139, 92, 246, 0.1)` | Backgrounds sutis |
| `Capitao/Border` | `rgba(139, 92, 246, 0.3)` | Bordas |
| `Luva/Primary` | `#ffd700` | Módulo Luva de Ouro |
| `Luva/Muted` | `rgba(255, 215, 0, 0.1)` | Backgrounds sutis |
| `Luva/Border` | `rgba(255, 215, 0, 0.3)` | Bordas |
| `Background/Dark` | `#0f172a` | bg-slate-900 |
| `Background/Card` | `#1e293b` | bg-gray-800 |
| `Text/Primary` | `#ffffff` | text-white |
| `Text/Muted` | `#94a3b8` | text-gray-400 |

**2.2.2 Typography (Fontes)**

Criar text styles no Figma:

| Nome do Style | Fonte | Tamanho | Peso | Uso |
|---------------|-------|---------|------|-----|
| `Heading/H1` | Russo One | 32px | Regular | Títulos principais |
| `Heading/H2` | Russo One | 24px | Regular | Subtítulos |
| `Heading/H3` | Russo One | 20px | Regular | Títulos de seção |
| `Body/Regular` | Inter | 16px | Regular | Texto corrido |
| `Body/Bold` | Inter | 16px | 600 | Destaques |
| `Caption` | Inter | 14px | Regular | Legendas |
| `Monospace/Stats` | JetBrains Mono | 18px | 500 | Valores numéricos |

**2.2.3 Spacing & Layout**

Configurar grid system no Figma:
- **Grid base:** 8px
- **Columns:** 12 (desktop), 4 (mobile)
- **Gutters:** 24px (desktop), 16px (mobile)

---

#### 2.3 Componentes Principais (2-3 dias)

**Página: Components - Admin**

Criar 5-10 componentes essenciais:

**2.3.1 Card Base**
```
Component: Card/Base
└── Variants:
    ├── Default (bg-gray-800)
    ├── Artilheiro (accent verde)
    ├── Capitao (accent roxo)
    └── Luva (accent dourado)

Properties:
- Padding: 16px
- Border radius: 8px
- Shadow: lg
```

**2.3.2 Button**
```
Component: Button/Primary
└── Variants:
    ├── Default
    ├── Hover
    ├── Active
    └── Disabled

Properties:
- Height: 40px
- Padding: 12px 24px
- Border radius: 6px
- Font: Inter 14px
```

**2.3.3 Input**
```
Component: Input/Text
└── Variants:
    ├── Default
    ├── Focused
    ├── Error
    └── Disabled

Properties:
- Height: 44px
- Padding: 12px
- Border: 1px solid gray-600
- Background: gray-700
```

**2.3.4 Modal**
```
Component: Modal/Base
└── Variants:
    ├── Small (400px)
    ├── Medium (600px)
    └── Large (800px)

Properties:
- Overlay: rgba(0,0,0,0.7)
- Content: bg-gray-800
- Padding: 24px
- Border radius: 12px
```

**2.3.5 Table Row**
```
Component: Table/Row
└── Variants:
    ├── Default
    ├── Hover
    └── Selected

Properties:
- Height: 48px
- Padding: 12px
- Border bottom: 1px solid gray-700
```

---

**Página: Components - App (PWA)**

Criar componentes mobile-first:

**2.3.6 Navigation Bar**
```
Component: Navigation/Bottom
└── Items: 5 botões (Home, Ranking, Rodadas, Hall, Extrato)

Properties:
- Height: 64px
- Icons: 24px
- Labels: Inter 12px
```

**2.3.7 Module Card (Artilheiro, Capitão, etc.)**
```
Component: Module/Card
└── Variants por módulo

Properties:
- Width: 100% (mobile)
- Padding: 16px
- Border left: 4px solid (cor do módulo)
```

---

#### 2.4 Importar Designs Existentes (2-3 dias)

**Opção A: Screenshots → Redesenhar**
1. Fazer screenshots das telas principais
2. Usar como referência para recriar no Figma
3. Aplicar design system (tokens + componentes)

**Opção B: HTML → Figma Plugin**
1. Instalar plugin "HTML to Figma" no Figma
2. Exportar HTML das páginas principais
3. Importar no Figma
4. Refatorar para usar design system

**Telas prioritárias:**
- Admin Dashboard (`/admin/gerenciar.html`)
- App Home (`/app/index.html`)
- Extrato Financeiro (`/app/extrato.html`)
- Módulo Artilheiro (`/app/artilheiro.html`)

---

### FASE 3: Transformer React → Vanilla (2-3 dias)

#### 3.1 Criar Transformer Script (1 dia)

**Arquivo:** `scripts/figma-to-vanilla-transformer.js`

```javascript
#!/usr/bin/env node
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { transformFromAstSync } from '@babel/core';
import fs from 'fs';

/**
 * Transforma código React exportado do Figma para Vanilla JS
 *
 * Input: React component com JSX
 * Output: { html, css, js }
 */

export function transformReactToVanilla(reactCode, options = {}) {
  const ast = parse(reactCode, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  const result = {
    html: '',
    css: '',
    js: ''
  };

  // Extrair JSX → HTML
  traverse(ast, {
    JSXElement(path) {
      const htmlNode = convertJSXtoHTML(path.node);
      result.html += htmlNode;
    }
  });

  // Extrair CSS (inline styles + className)
  traverse(ast, {
    JSXAttribute(path) {
      if (path.node.name.name === 'style') {
        const cssRules = extractInlineStyles(path.node.value);
        result.css += cssRules;
      }
      if (path.node.name.name === 'className') {
        // Mapear TailwindCSS classes
        const tailwindClasses = path.node.value.value;
        result.css += mapTailwindToCSS(tailwindClasses);
      }
    }
  });

  // Extrair JS (props → vanilla patterns)
  const vanillaJS = convertPropsToVanilla(ast);
  result.js = vanillaJS;

  return result;
}

function convertJSXtoHTML(jsxNode) {
  // Implementar conversão JSX → HTML string
  // Exemplo simplificado:
  const tagName = jsxNode.openingElement.name.name;
  const children = jsxNode.children.map(convertJSXtoHTML).join('');
  return `<${tagName}>${children}</${tagName}>`;
}

function extractInlineStyles(styleValue) {
  // Converter objeto { color: 'red' } → CSS
  // color: red;
}

function mapTailwindToCSS(classes) {
  // Mapear classes Tailwind → CSS puro
  // 'bg-gray-800 text-white' → background: #1e293b; color: #fff;
}

function convertPropsToVanilla(ast) {
  // Converter React props/state → vanilla patterns
  // useState → variáveis + event listeners
  // useEffect → DOMContentLoaded
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const inputFile = process.argv[2];
  const outputDir = process.argv[3] || './output';

  const reactCode = fs.readFileSync(inputFile, 'utf8');
  const { html, css, js } = transformReactToVanilla(reactCode);

  fs.writeFileSync(`${outputDir}/component.html`, html);
  fs.writeFileSync(`${outputDir}/component.css`, css);
  fs.writeFileSync(`${outputDir}/component.js`, js);

  console.log('✅ Conversão completa!');
}

export default transformReactToVanilla;
```

---

#### 3.2 Testar Transformer (1 dia)

**Teste 1: Componente Simples (Button)**

```bash
# 1. Exportar Button do Figma via MCP
node scripts/export-figma-component.js --component="Button/Primary"
# Output: figma-exports/button-primary.jsx

# 2. Transformar para Vanilla
node scripts/figma-to-vanilla-transformer.js \
  figma-exports/button-primary.jsx \
  output/button-primary

# 3. Validar outputs
ls output/button-primary/
# button-primary.html
# button-primary.css
# button-primary.js

# 4. Testar no browser
# Criar index.html de teste
```

**Teste 2: Componente Complexo (Card)**

```bash
# Repetir processo com Card/Artilheiro
node scripts/export-figma-component.js --component="Card/Artilheiro"
node scripts/figma-to-vanilla-transformer.js \
  figma-exports/card-artilheiro.jsx \
  output/card-artilheiro
```

**Teste 3: Component Library Completa**

```bash
# Exportar todos componentes
node scripts/export-all-figma-components.js

# Transformar batch
node scripts/batch-transform.js figma-exports/ output/
```

---

#### 3.3 Refinar Transformer (1 dia)

Ajustar conversões baseado nos testes:
- Mapear 100% das classes Tailwind usadas
- Converter corretamente event handlers (onClick → addEventListener)
- Manter estrutura de nomes consistente
- Gerar CSS modular (BEM ou CSS Modules)

---

### FASE 4: Skill figma-sync (1 dia)

#### 4.1 Criar Skill (2-3 horas)

**Arquivo:** `docs/skills/04-project-specific/figma-sync.md`

```markdown
---
name: figma-sync
description: Sincroniza design tokens e componentes do Figma para o projeto. Exporta componentes atualizados, transforma React → Vanilla JS e aplica no código. Use quando design system mudar no Figma ou para atualizar componentes.
allowed-tools: Read, Write, Edit, Bash, mcp__figma__get_file, mcp__figma__get_styles, mcp__figma__export_images
---

# Figma Sync Skill

## 🎯 Missão
Sincronizar automaticamente design tokens e componentes do Figma para o projeto Super Cartola Manager.

## 📋 PROTOCOLO

### PASSO 1: Conectar Figma MCP

\`\`\`javascript
// Buscar file ID do design system
const designSystemFileId = "FIGMA_FILE_ID_AQUI";

// Conectar e validar acesso
const fileInfo = await mcp__figma__get_file({
  file_id: designSystemFileId
});

console.log(`📁 Design System: ${fileInfo.name}`);
console.log(`🔄 Última modificação: ${fileInfo.last_modified}`);
\`\`\`

### PASSO 2: Sincronizar Design Tokens

\`\`\`javascript
// 1. Buscar styles do Figma
const figmaStyles = await mcp__figma__get_styles({
  file_id: designSystemFileId
});

// 2. Gerar CSS tokens
const cssTokens = generateCSSTokens(figmaStyles, {
  colors: true,
  typography: true,
  spacing: true
});

// 3. Atualizar _admin-tokens.css
await Write({
  file_path: "/public/css/_admin-tokens.css",
  content: cssTokens
});

console.log("✅ Design tokens sincronizados");
\`\`\`

### PASSO 3: Exportar Componentes Atualizados

\`\`\`javascript
// 1. Listar componentes que mudaram
const components = await mcp__figma__get_components({
  file_id: designSystemFileId
});

// 2. Filtrar apenas os atualizados
const updatedComponents = components.filter(c => {
  const lastSync = readLastSyncDate(c.name);
  return c.updated_at > lastSync;
});

console.log(`🔄 ${updatedComponents.length} componentes atualizados`);

// 3. Exportar cada um
for (const component of updatedComponents) {
  const reactCode = await mcp__figma__export_component({
    component_id: component.id,
    format: "react"
  });

  // 4. Transformar para Vanilla JS
  const { html, css, js } = transformReactToVanilla(reactCode);

  // 5. Salvar
  await Write({
    file_path: `/public/components/${component.name}.html`,
    content: html
  });
  await Write({
    file_path: `/public/css/components/${component.name}.css`,
    content: css
  });
  await Write({
    file_path: `/public/js/components/${component.name}.js`,
    content: js
  });
}
\`\`\`

### PASSO 4: Atualizar Registro de Sync

\`\`\`javascript
// Salvar timestamp da sincronização
const syncRecord = {
  date: new Date().toISOString(),
  figma_version: fileInfo.version,
  components_updated: updatedComponents.length,
  tokens_updated: Object.keys(cssTokens).length
};

await Write({
  file_path: ".figma-sync-version.json",
  content: JSON.stringify(syncRecord, null, 2)
});
\`\`\`

### PASSO 5: Gerar Relatório

\`\`\`markdown
## 🎨 Figma Sync - {DATE}

**Design System:** Super Cartola Design System
**Versão Figma:** v{VERSION}
**Última sincronização:** {TIMESTAMP}

### Alterações

**Design Tokens:**
- ✅ {N} cores atualizadas
- ✅ {N} estilos de texto sincronizados
- ✅ {N} espaçamentos ajustados

**Componentes:**
- ✅ Card/Artilheiro (atualizado)
- ✅ Button/Primary (atualizado)
- ⚪ Modal/Base (sem mudanças)

**Arquivos Modificados:**
- /public/css/_admin-tokens.css
- /public/components/card-artilheiro.html
- /public/js/components/button-primary.js

**Próximo passo:** Testar componentes atualizados no ambiente de dev
\`\`\`
```

---

#### 4.2 Adicionar Keywords (30 min)

Atualizar `docs/skills/SKILL-KEYWORD-MAP.md`:

```markdown
#### figma-sync
| Tipo | Keywords |
|------|----------|
| **Primárias** | `figma sync`, `sincronizar figma`, `atualizar design system`, `exportar componentes figma` |
| **Frases PT-BR** | "sincronizar design do figma", "atualizar componentes do figma", "exportar tokens do figma", "design mudou no figma" |
| **Contexto** | Design system atualizado, precisa sincronizar código com Figma |
| **Localização** | `docs/skills/04-project-specific/figma-sync.md` |
```

---

### FASE 5: Integrar Figma em context7-monthly-audit (1 dia)

#### 5.1 Adicionar AUDITORIA 5 (2-3 horas)

Editar `docs/skills/04-project-specific/context7-monthly-audit.md`:

```markdown
## 🔍 AUDITORIA 5: Figma Design Sync

### Objetivo
Detectar quando design system no Figma foi atualizado mas código ainda não foi sincronizado.

### Protocolo

**PASSO 1: Buscar Versão Atual do Figma**
\`\`\`javascript
const figmaFile = await mcp__figma__get_file({
  file_id: "DESIGN_SYSTEM_FILE_ID"
});

const figmaVersion = {
  version: figmaFile.version,
  last_modified: figmaFile.last_modified,
  name: figmaFile.name
};
\`\`\`

**PASSO 2: Comparar com Última Sincronização**
\`\`\`javascript
const lastSync = JSON.parse(
  readFileSync(".figma-sync-version.json", "utf8")
);

const isDivergent = figmaVersion.version > lastSync.figma_version;
const daysSinceSync = Math.floor(
  (Date.now() - new Date(lastSync.date)) / (1000 * 60 * 60 * 24)
);
\`\`\`

**PASSO 3: Gerar Alerta**
\`\`\`markdown
## 🎨 FIGMA DESIGN SYNC

### ⚠️ DIVERGÊNCIA DETECTADA
- **Design System:** {NAME}
- **Versão Figma atual:** v{CURRENT_VERSION}
- **Última sincronização:** v{LAST_SYNCED_VERSION} ({DAYS} dias atrás)
- **Status:** Design foi atualizado {N} vezes desde última sync

**Componentes potencialmente desatualizados:**
- Card/Artilheiro
- Button/Primary
- Modal/Base

**Ação requerida:**
\`\`\`bash
# Sincronizar design system:
/figma-sync

# Ou via keyword:
"Sincronizar design do Figma"
\`\`\`

### ✅ OK: Design Sincronizado
- **Versão Figma:** v{VERSION}
- **Última sincronização:** {DATE} (há {DAYS} dias)
- **Status:** Código e design alinhados ✅
\`\`\`
```

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs para Acompanhar (após implementação)

| Métrica | Baseline (Stitch) | Meta (Figma MCP) | Como Medir |
|---------|-------------------|------------------|------------|
| **Tempo para criar componente** | 30-45 min | 5-10 min | Cronometrar próximos 10 componentes |
| **Divergências design ↔ código** | 20-30/release | 0-5/release | Auditar antes de cada release |
| **Tempo de atualização de tema** | 2-3h | 10-20 min | Cronometrar próxima mudança de cor |
| **Componentes reutilizáveis criados** | 5-10/ano | 30-50/ano | Contar em `.figma-sync-version.json` |
| **Designer autonomia** | 10% | 80% | % de mudanças feitas sem dev |

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Transformer Incompleto

**Problema:** Nem todos padrões React convertidos para Vanilla

**Mitigação:**
- Começar com componentes simples (Button, Card)
- Testar extensivamente antes de produção
- Manter Stitch como fallback (opção B)

---

### Risco 2: Figma API Rate Limits

**Problema:** API do Figma tem limites de requisições

**Mitigação:**
- Implementar cache local (24h TTL)
- Sincronizar apenas componentes modificados
- Monitorar rate limits via headers HTTP

---

### Risco 3: Breaking Changes no Figma

**Problema:** Designer faz mudança que quebra código

**Mitigação:**
- Estabelecer processo de review:
  1. Designer marca componente como "Ready for Sync"
  2. Developer faz code review da mudança
  3. Apenas depois roda /figma-sync
- Usar versionamento semântico no Figma
- Testes automáticos após sync

---

## 📅 CRONOGRAMA SUGERIDO

| Fase | Duração | Responsável | Bloqueadores |
|------|---------|-------------|--------------|
| **FASE 1: Setup** | 1-2 dias | Developer | Token de acesso Figma |
| **FASE 2: Design System** | 1 semana | Designer + Dev | Nenhum |
| **FASE 3: Transformer** | 2-3 dias | Developer | FASE 1 completa |
| **FASE 4: Skill figma-sync** | 1 dia | Developer | FASE 3 completa |
| **FASE 5: Auditoria mensal** | 1 dia | Developer | FASE 4 completa |

**TOTAL:** 1-2 semanas (10-15 dias úteis)

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### FASE 1: Setup Básico
- [ ] Criar conta Figma (Free tier)
- [ ] Gerar access token
- [ ] Atualizar `.mcp.json` com Figma MCP
- [ ] Conceder permissões em `.claude/settings.local.json`
- [ ] Testar conexão (`mcp__figma__list_files`)

### FASE 2: Design System
- [ ] Criar projeto "Super Cartola Design System"
- [ ] Organizar páginas (Tokens, Components, Screens)
- [ ] Criar color styles (Artilheiro, Capitão, Luva)
- [ ] Criar text styles (Russo One, Inter, JetBrains Mono)
- [ ] Configurar grid system (8px base)
- [ ] Criar 5-10 componentes essenciais (Card, Button, Input, Modal, Table)
- [ ] Importar 3-5 telas principais como referência

### FASE 3: Transformer
- [ ] Criar `scripts/figma-to-vanilla-transformer.js`
- [ ] Implementar conversão JSX → HTML
- [ ] Implementar extração de CSS (inline + className)
- [ ] Implementar conversão props → vanilla patterns
- [ ] Testar com componente simples (Button)
- [ ] Testar com componente complexo (Card)
- [ ] Refinar baseado em testes

### FASE 4: Skill figma-sync
- [ ] Criar `docs/skills/04-project-specific/figma-sync.md`
- [ ] Implementar protocolo de sync
- [ ] Adicionar keywords em `SKILL-KEYWORD-MAP.md`
- [ ] Atualizar `CLAUDE.md` com nova skill
- [ ] Testar skill end-to-end

### FASE 5: Auditoria Mensal
- [ ] Adicionar AUDITORIA 5 em `context7-monthly-audit.md`
- [ ] Implementar comparação de versões
- [ ] Testar alerta de divergência
- [ ] Integrar em workflow mensal

---

## 🎓 RECURSOS E REFERÊNCIAS

### Documentação Oficial
- [Figma REST API](https://figma.com/developers/api)
- [Figma MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/figma)
- [Babel Parser](https://babeljs.io/docs/en/babel-parser)

### Tutoriais Relevantes
- [Design Tokens with Figma](https://www.figma.com/community/plugin/888356646278934516/Design-Tokens)
- [React to Vanilla JS](https://dev.to/thecodepixi/from-react-to-vanilla-js-4m9n)
- [Figma Plugin Development](https://figma.com/plugin-docs/)

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Ler este plano completo
2. ⭐ **INICIAR FASE 1** (setup básico)
   - Criar conta Figma
   - Gerar token
   - Configurar MCP
3. Agendar design kickoff (FASE 2)
4. Comunicar decisão ao time
5. Marcar Stitch como opção B (fallback)

---

**Última atualização:** 2026-02-09
**Status:** Pronto para iniciar
**Próxima revisão:** Após FASE 1 (validar setup)

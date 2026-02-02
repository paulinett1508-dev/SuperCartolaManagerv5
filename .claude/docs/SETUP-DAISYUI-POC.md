# 🚀 Guia de Setup: daisyUI + MCP - Prova de Conceito

**Data:** 2026-02-02
**Objetivo:** Implementar POC de daisyUI com suporte MCP para desenvolvimento acelerado
**Tempo estimado:** 2-3 horas

---

## 📋 Pré-requisitos

- [ ] Node.js instalado
- [ ] Python 3.x instalado
- [ ] npm funcional
- [ ] Acesso ao projeto Super Cartola Manager
- [ ] Claude Code configurado

---

## 🎯 Fases do Setup

### Fase 1: Instalação do daisyUI (30 min)

#### 1.1. Instalar daisyUI via npm

```bash
cd /home/user/SuperCartolaManagerv5
npm install -D daisyui@latest tailwindcss@latest
```

#### 1.2. Criar/Atualizar tailwind.config.js

Se o arquivo não existir, criar. Se existir, adicionar o plugin daisyUI:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './public/**/*.html',
    './public/**/*.js',
    './views/**/*.ejs'
  ],
  theme: {
    extend: {
      fontFamily: {
        russo: ['Russo One', 'sans-serif'],
        inter: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        cartola: {
          // Cores base
          "primary": "#3b82f6",          // Azul padrão
          "secondary": "#8b5cf6",        // Roxo (Capitão)
          "accent": "#22c55e",           // Verde (Artilheiro)
          "neutral": "#1f2937",          // Gray-800
          "base-100": "#111827",         // Gray-900 (fundo principal)
          "base-200": "#1f2937",         // Gray-800 (fundo secundário)
          "base-300": "#374151",         // Gray-700 (fundo terciário)

          // Estados
          "info": "#0ea5e9",
          "success": "#22c55e",
          "warning": "#f59e0b",
          "error": "#ef4444",

          // Textos
          "base-content": "#f9fafb",     // Text-gray-50
          "primary-content": "#ffffff",
          "secondary-content": "#ffffff",
          "accent-content": "#ffffff",
        },
      },
    ],
    darkTheme: "cartola",
    base: true,
    styled: true,
    utils: true,
    logs: false,
    rtl: false,
  },
};
```

#### 1.3. Compilar CSS do Tailwind

```bash
# Verificar se existe script build no package.json
npm run build:css

# OU compilar manualmente
npx tailwindcss -i ./public/css/input.css -o ./public/css/output.css --watch
```

**⚠️ Nota:** Se não houver processo de build, podemos usar o CDN do daisyUI temporariamente para o POC:

```html
<!-- Adicionar no <head> da página piloto -->
<link href="https://cdn.jsdelivr.net/npm/daisyui@latest/dist/full.css" rel="stylesheet" type="text/css" />
<script src="https://cdn.tailwindcss.com"></script>
```

---

### Fase 2: Configuração do MCP daisyUI (30 min)

#### 2.1. Clonar repositório daisyui-mcp

```bash
# Fora do projeto (em /tmp ou diretório separado)
cd /tmp
git clone https://github.com/birdseyevue/daisyui-mcp.git
cd daisyui-mcp
```

#### 2.2. Setup Python

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente
source venv/bin/activate  # Linux/Mac
# OU
venv\Scripts\activate     # Windows
```

#### 2.3. Instalar dependências

```bash
pip install -r requirements.txt
```

#### 2.4. Baixar documentação daisyUI

```bash
python update_components.py
```

**⚠️ Limitação conhecida - Replit:**
Se você estiver no Replit e receber erro `403 Forbidden`, isso é uma restrição de rede do ambiente. Alternativas:

1. **Opção A:** Executar em máquina local e copiar pasta `components/`
2. **Opção B:** Usar Context7 MCP (já configurado no projeto)
3. **Opção C:** Desenvolver sem MCP por enquanto

#### 2.5. Adicionar ao .mcp.json

O arquivo `.mcp.json` já foi atualizado com:

```json
{
  "mcpServers": {
    "daisyui": {
      "command": "python",
      "args": ["/tmp/daisyui-mcp/mcp_server.py"],
      "disabled": true,
      "note": "Requires running update_components.py first"
    }
  }
}
```

**Para habilitar:**
1. Certifique-se que `python update_components.py` funcionou
2. Mude `"disabled": true` para `"disabled": false`
3. Reinicie Claude Code

---

### Fase 3: POC - Refatorar Página Piloto (1-2 horas)

#### 3.1. Escolher página piloto

**Sugestões (ordem de complexidade):**
1. ✅ **Página de Login Admin** (`/public/admin/login.html`) - RECOMENDADO
2. Modal de confirmação financeira
3. Card de módulo (Artilheiro/Capitão)
4. Formulário simples

**Por quê login admin:**
- Página standalone (não afeta sistema principal)
- Componentes simples (form, button, card)
- Fácil reverter se necessário
- Boa visualização de resultados

#### 3.2. Backup da página original

```bash
cp /public/admin/login.html /public/admin/login.html.backup
```

#### 3.3. Refatoração com daisyUI

**Antes (exemplo):**
```html
<div class="bg-gray-800 rounded-lg shadow-lg p-6">
  <h2 class="text-white text-2xl font-bold mb-4">Login Admin</h2>
  <form>
    <div class="mb-4">
      <label class="block text-gray-300 mb-2">Email</label>
      <input
        type="email"
        class="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600"
      />
    </div>
    <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
      Entrar
    </button>
  </form>
</div>
```

**Depois (com daisyUI):**
```html
<div class="card bg-base-200 shadow-xl">
  <div class="card-body">
    <h2 class="card-title text-2xl">Login Admin</h2>
    <form>
      <div class="form-control">
        <label class="label">
          <span class="label-text">Email</span>
        </label>
        <input
          type="email"
          class="input input-bordered w-full"
        />
      </div>
      <div class="card-actions justify-end mt-4">
        <button class="btn btn-primary">Entrar</button>
      </div>
    </form>
  </div>
</div>
```

**Benefícios visualizados:**
- ✅ 60% menos classes CSS
- ✅ Semântica clara
- ✅ Dark mode automático
- ✅ Responsividade built-in

#### 3.4. Componentes daisyUI úteis para o projeto

| Componente | Classe | Uso no projeto |
|------------|--------|----------------|
| **Button** | `btn btn-primary` | Botões de ação |
| **Card** | `card bg-base-200` | Cards de módulos |
| **Input** | `input input-bordered` | Formulários |
| **Table** | `table table-zebra` | Rankings |
| **Modal** | `modal` | Confirmações |
| **Alert** | `alert alert-success` | Notificações |
| **Badge** | `badge badge-primary` | Status |
| **Tabs** | `tabs tabs-bordered` | Navegação |
| **Dropdown** | `dropdown` | Menus |
| **Loading** | `loading loading-spinner` | Loaders |

#### 3.5. Manter compatibilidade com variáveis CSS existentes

```css
/* Criar arquivo: /public/css/daisyui-overrides.css */

/* Manter variáveis dos módulos */
:root {
  /* Artilheiro Campeão */
  --module-artilheiro-primary: theme('colors.accent');
  --module-artilheiro-border: theme('colors.accent');
  --gradient-artilheiro: linear-gradient(135deg, theme('colors.accent') 0%, #16a34a 100%);

  /* Capitão de Luxo */
  --module-capitao-primary: theme('colors.secondary');
  --module-capitao-border: theme('colors.secondary');
  --gradient-capitao: linear-gradient(135deg, theme('colors.secondary') 0%, #7c3aed 100%);

  /* Luva de Ouro */
  --module-luva-primary: #ffd700;
  --module-luva-border: #ffd700;
  --gradient-luva: linear-gradient(135deg, #ffd700 0%, #f59e0b 100%);
}

/* Classes customizadas que usam daisyUI */
.artilheiro-card {
  @apply card bg-base-200 border-l-4;
  border-left-color: var(--module-artilheiro-primary);
}

.capitao-card {
  @apply card bg-base-200 border-l-4;
  border-left-color: var(--module-capitao-primary);
}

.luva-card {
  @apply card bg-base-200 border-l-4;
  border-left-color: var(--module-luva-primary);
}
```

---

### Fase 4: Testes e Validação (30 min)

#### 4.1. Checklist de testes

- [ ] **Visual:** Página renderiza corretamente
- [ ] **Dark mode:** Todas as cores seguem tema escuro
- [ ] **Responsivo:** Testa em mobile/tablet/desktop
- [ ] **Funcional:** Todos os botões/inputs funcionam
- [ ] **Tipografia:** Fontes corretas (Russo One, Inter, JetBrains Mono)
- [ ] **Performance:** Tempo de carregamento similar ou melhor

#### 4.2. Comparar antes/depois

**Métricas a coletar:**

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Linhas de HTML | ? | ? | ? |
| Classes CSS usadas | ? | ? | ? |
| Tempo de dev (min) | ? | ? | ? |
| Bugs visuais | ? | ? | ? |

#### 4.3. Screenshots

Tirar screenshots para documentação:
- Antes da refatoração
- Depois da refatoração
- Mobile view
- Desktop view

---

### Fase 5: Decisão Go/No-Go (15 min)

#### 5.1. Critérios de sucesso

**🟢 Aprovado se:**
- [ ] Redução >30% em classes CSS
- [ ] Visual mantém identidade do projeto
- [ ] Sem quebra de funcionalidade
- [ ] Developer Experience positiva
- [ ] Facilita manutenção futura

**🔴 Rejeitado se:**
- [ ] Piora performance significativamente
- [ ] Aumenta complexidade do código
- [ ] Conflitos irreconciliáveis com CSS existente
- [ ] Time não gosta da abordagem

#### 5.2. Próximos passos por resultado

**✅ Se aprovado:**
1. Documentar padrões de uso
2. Criar componentes reutilizáveis
3. Planejar rollout gradual:
   - Semana 1: Componentes base
   - Semana 2: Módulos opcionais
   - Semana 3: Módulos core
   - Semana 4: Admin completo

**❌ Se rejeitado:**
1. Reverter mudanças (`git checkout .`)
2. Documentar aprendizados
3. Avaliar alternativas (Flowbite, Basecoat UI)
4. Manter status quo

---

## 🔧 Troubleshooting

### Problema: Tailwind não compila

**Solução:**
```bash
# Verificar se tailwindcss está instalado
npm list tailwindcss

# Reinstalar se necessário
npm install -D tailwindcss@latest

# Compilar manualmente
npx tailwindcss -c ./tailwind.config.js -o ./public/css/output.css
```

### Problema: daisyUI não aplica estilos

**Checklist:**
- [ ] Plugin adicionado no `tailwind.config.js`?
- [ ] CSS compilado após adicionar plugin?
- [ ] Arquivo CSS correto linkado no HTML?
- [ ] Classes daisyUI escritas corretamente?

**Debug:**
```html
<!-- Testar com CDN para verificar se é problema de build -->
<link href="https://cdn.jsdelivr.net/npm/daisyui@latest/dist/full.css" rel="stylesheet" />
```

### Problema: MCP não carrega

**Checklist:**
- [ ] `python update_components.py` executado com sucesso?
- [ ] Caminho absoluto correto no `.mcp.json`?
- [ ] Claude Code reiniciado após configuração?
- [ ] `"disabled": false` no config?

**Teste:**
```bash
# Testar servidor MCP manualmente
cd /tmp/daisyui-mcp
source venv/bin/activate
python mcp_server.py
```

### Problema: Conflitos com CSS existente

**Solução:**
```css
/* Adicionar namespace para isolar daisyUI */
[data-theme="cartola"] {
  /* Estilos daisyUI aqui */
}

/* Manter CSS legado sem namespace */
.legacy-component {
  /* CSS antigo aqui */
}
```

---

## 📊 Template de Relatório POC

```markdown
# Relatório POC: daisyUI + MCP

**Data:** [DATA]
**Duração:** [X horas]
**Página piloto:** [PÁGINA]

## Resultados Quantitativos

| Métrica | Antes | Depois | Δ |
|---------|-------|--------|---|
| Linhas HTML | X | Y | -Z% |
| Classes CSS | X | Y | -Z% |
| Tempo dev | X min | Y min | -Z% |
| Bundle size | X KB | Y KB | +Z% |

## Resultados Qualitativos

### ✅ Pontos Positivos
- [Listar aqui]

### ⚠️ Pontos de Atenção
- [Listar aqui]

### ❌ Problemas Encontrados
- [Listar aqui]

## Recomendação Final

[ ] 🟢 Aprovar rollout gradual
[ ] 🟡 Aprovar com ressalvas (detalhar)
[ ] 🔴 Rejeitar (justificar)

## Próximos Passos
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]
```

---

## 📚 Recursos Adicionais

### Documentação
- [daisyUI Components](https://daisyui.com/components/)
- [daisyUI Themes](https://daisyui.com/docs/themes/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Ferramentas
- [daisyUI Theme Generator](https://daisyui.com/theme-generator/)
- [Tailwind Play (testes rápidos)](https://play.tailwindcss.com/)

### Comunidade
- [daisyUI Discord](https://discord.gg/daisyui)
- [GitHub Issues](https://github.com/saadeghi/daisyui/issues)

---

## 🎯 Conclusão

Este guia fornece um roadmap completo para testar daisyUI no projeto Super Cartola Manager.

**Lembre-se:**
- POC deve ser rápido e focado
- Coletar métricas objetivas
- Decisão baseada em dados, não feeling
- Sempre manter backup e possibilidade de rollback

**Boa sorte! 🚀**

---

**Última atualização:** 2026-02-02
**Autor:** Claude (Research Session)
**Status:** 📋 Pronto para execução

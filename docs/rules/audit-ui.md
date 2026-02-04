# AUDIT RULE: UI/UX (Interface e Experiência)

## 🎯 Objetivo
Garantir conformidade com os padrões visuais do projeto: **Dark Mode First**, **tipografia consistente** e **identidade visual por módulo**.

---

## ✅ Checklist de Auditoria

### 1. **Dark Mode (Obrigatório)**
- [ ] Background principal: `bg-gray-900` ou `bg-slate-900`
- [ ] Cards/Containers: `bg-gray-800`
- [ ] Texto primário: `text-white` ou `text-gray-100`
- [ ] Texto secundário: `text-gray-400`
- [ ] Inputs: `bg-gray-700 text-white border-gray-600`
- [ ] NUNCA usa cores claras de fundo

**Exemplo correto:**
```html
<div class="bg-gray-900 min-h-screen">
    <div class="bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 class="text-white text-2xl">Título</h2>
        <p class="text-gray-400">Descrição</p>
    </div>
</div>
```

---

### 2. **Tipografia (3 Fontes Específicas)**

| Uso | Fonte | Classe CSS |
|-----|-------|-----------|
| **Títulos, Badges, Stats** | Russo One | `font-russo` |
| **Corpo de texto** | Inter | `font-inter` |
| **Valores numéricos** | JetBrains Mono | `font-jetbrains` |

- [ ] Títulos principais usam Russo One
- [ ] Texto corrido usa Inter
- [ ] Números/estatísticas usam JetBrains Mono
- [ ] Font-face declarado corretamente

**Exemplo correto:**
```html
<h1 class="font-russo text-3xl">Artilheiro Campeão</h1>
<p class="font-inter">Sistema de apostas</p>
<span class="font-jetbrains text-2xl">120 pts</span>
```

---

### 3. **Cores dos Módulos (Variáveis CSS)**

**🚨 REGRA CRÍTICA:** NUNCA usar cores hardcoded (`#22c55e`). SEMPRE usar variáveis CSS.

| Módulo | Variável CSS | Cor |
|--------|--------------|-----|
| Artilheiro | `var(--module-artilheiro-primary)` | Verde `#22c55e` |
| Capitão de Luxo | `var(--module-capitao-primary)` | Roxo `#8b5cf6` |
| Luva de Ouro | `var(--module-luva-primary)` | Dourado `#ffd700` |

- [ ] Módulo usa variáveis CSS (não hex direto)
- [ ] Background gradiente usa `var(--gradient-[modulo])`
- [ ] Borders usam `var(--module-[modulo]-border)`
- [ ] Fundos sutis usam `var(--module-[modulo]-muted)`

**❌ ERRADO:**
```css
.artilheiro-header {
    background: #22c55e;
}
```

**✅ CORRETO:**
```css
.artilheiro-header {
    background: var(--gradient-artilheiro);
    border: 1px solid var(--module-artilheiro-border);
}
```

**Localização:** `/css/_admin-tokens.css`

---

### 4. **Componentes Padrão**

#### Cards
- [ ] `rounded-lg shadow-lg` aplicados
- [ ] Padding adequado (`p-4`, `p-6`)
- [ ] Hover states definidos

```html
<div class="bg-gray-800 rounded-lg shadow-lg p-6 hover:bg-gray-750 transition">
    <!-- Conteúdo -->
</div>
```

#### Botões
- [ ] Estados hover/active definidos
- [ ] Feedback visual explícito
- [ ] Cores acessíveis (contraste mínimo)

```html
<button class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800
               text-white px-4 py-2 rounded transition">
    Ação
</button>
```

#### Inputs
- [ ] Fundo escuro (`bg-gray-700`)
- [ ] Texto branco (`text-white`)
- [ ] Border sutil (`border-gray-600`)
- [ ] Focus state definido

```html
<input type="text"
       class="bg-gray-700 text-white border border-gray-600
              rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
```

---

### 5. **Responsividade Mobile**
- [ ] Breakpoints Tailwind usados (`sm:`, `md:`, `lg:`)
- [ ] Layout adaptável para telas pequenas
- [ ] Texto legível em mobile (tamanhos mínimos)
- [ ] Botões com área de toque adequada (min 44x44px)

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Responsive grid -->
</div>
```

---

### 6. **Ícones e Escudos**

#### Escudos de Times
- [ ] Path correto: `/escudos/{clube_id}.png`
- [ ] Fallback implementado: `onerror="this.src='/escudos/default.png'"`
- [ ] Alt text descritivo

```html
<img src="/escudos/262.png"
     alt="Flamengo"
     onerror="this.src='/escudos/default.png'">
```

#### Ícones
- [ ] SVG inline ou biblioteca consistente (Font Awesome, Heroicons)
- [ ] Cores alinhadas com tema dark
- [ ] Tamanho proporcional ao contexto

---

### 7. **Estados Visuais**

#### Loading States
- [ ] Spinners/skeletons para carregamento
- [ ] Feedback visual durante operações async

#### Empty States
- [ ] Mensagem clara quando não há dados
- [ ] Sugestão de ação (CTA)

```html
<div class="text-center py-12">
    <p class="text-gray-400 mb-4">Nenhuma aposta realizada</p>
    <button class="bg-blue-600 text-white px-6 py-2 rounded">
        Fazer Aposta
    </button>
</div>
```

#### Error States
- [ ] Cor vermelha para erros (`text-red-400`, `bg-red-900`)
- [ ] Mensagem clara e acionável

---

### 8. **Acessibilidade (WCAG)**
- [ ] Contraste mínimo 4.5:1 (texto normal)
- [ ] Contraste mínimo 3:1 (textos grandes)
- [ ] Labels em inputs (`<label>` ou `aria-label`)
- [ ] Navegação por teclado funcional

---

### 9. **Performance Visual**
- [ ] Imagens otimizadas (WebP quando possível)
- [ ] Lazy loading em listas longas
- [ ] Animações CSS (não JS quando possível)
- [ ] Transições suaves (`transition-all duration-200`)

---

### 10. **Consistência de Layout**
- [ ] Espaçamento uniforme (múltiplos de 4px/1rem)
- [ ] Grid/Flexbox para layouts
- [ ] Alinhamento consistente
- [ ] Hierarquia visual clara (títulos > subtítulos > corpo)

---

## 🚨 Red Flags Críticos

| Problema | Severidade | Ação |
|----------|-----------|------|
| Fundo claro (light mode) | 🔴 CRÍTICO | Mudar para dark |
| Cor hardcoded (#22c55e) | 🔴 CRÍTICO | Usar variável CSS |
| Fonte errada em títulos | 🟠 ALTO | Aplicar Russo One |
| Sem fallback de escudo | 🟠 ALTO | Adicionar onerror |
| Sem responsividade | 🟡 MÉDIO | Adicionar breakpoints |
| Contraste baixo | 🟡 MÉDIO | Ajustar cores |

---

## 📊 Exemplo Completo (Header de Módulo)

```html
<!-- Header Artilheiro Campeão -->
<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
    <!-- Header com gradiente do módulo -->
    <div class="p-6"
         style="background: var(--gradient-artilheiro);
                border-bottom: 2px solid var(--module-artilheiro-border);">
        <h1 class="font-russo text-3xl text-white mb-2">
            Artilheiro Campeão
        </h1>
        <p class="font-inter text-gray-200">
            Apostas no artilheiro da temporada
        </p>
    </div>

    <!-- Conteúdo -->
    <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Card estatística -->
            <div class="bg-gray-700 rounded-lg p-4">
                <p class="font-inter text-gray-400 text-sm mb-1">
                    Total de Apostas
                </p>
                <p class="font-jetbrains text-3xl text-white">
                    127
                </p>
            </div>
        </div>
    </div>
</div>
```

---

## 🔗 Referências
- `CLAUDE.md` → Seção "UI/UX Guidelines"
- `/css/_admin-tokens.css` → Variáveis CSS dos módulos
- `public/js/admin/*-management.js` → Implementações de referência

---

## 11. **Sistema de Notificações e Avisos**

### Estrutura Dual (Admin + Participante)

**Admin - Módulo Notificador (Operações)**
- [ ] Interface para criar/gerenciar avisos globais
- [ ] Segmentação por liga/participante/temporada
- [ ] Preview antes de publicar
- [ ] Histórico de avisos enviados
- [ ] Categorias: `info`, `warning`, `success`, `urgent`

**Participante - Seção "Avisos" (Home)**
- [ ] Cards horizontais em scroll (hide-scrollbar)
- [ ] Badge de categoria com cores distintas
- [ ] Limite de 5 avisos na home
- [ ] Link "Ver todos" para tela dedicada
- [ ] Auto-dismissal após 7 dias (configurável)

### Estrutura de Card de Aviso

```html
<!-- Card Padrão -->
<div class="aviso-card bg-gray-800 rounded-xl min-w-[240px] p-4 border-l-4"
     data-categoria="success">
    <div class="flex items-center gap-2 mb-2">
        <span class="material-icons text-green-500">check_circle</span>
        <p class="font-russo text-sm uppercase text-white">Rodada Confirmada</p>
    </div>
    <p class="text-gray-400 text-sm">
        Sua escalação para o clássico foi salva com sucesso!
    </p>
</div>
```

### Cores por Categoria

| Categoria | Border Color | Icon Color | Uso |
|-----------|--------------|------------|-----|
| **success** | `border-green-500` | `text-green-500` | Confirmações, sucesso |
| **warning** | `border-yellow-500` | `text-yellow-500` | Alertas, prazos |
| **info** | `border-blue-500` | `text-blue-500` | Informações gerais |
| **urgent** | `border-red-500` | `text-red-500` | Ações críticas, erros |

### Checklist de Implementação

- [ ] Criar collection `avisos` no MongoDB
- [ ] Schema: `{ titulo, mensagem, categoria, ligaId?, timeId?, dataExpiracao, lido: Boolean }`
- [ ] Endpoint admin: `POST /api/admin/avisos/criar`
- [ ] Endpoint participante: `GET /api/avisos?ligaId={id}&timeId={id}`
- [ ] Marcar como lido: `POST /api/avisos/marcar-lido/:avisoId`
- [ ] UI admin em `/admin/operacoes/notificador`
- [ ] Componente `<AvisosList>` na home do participante

---

## 12. **Otimização de Cards e Espaçamento**

### Princípio: Densidade Balanceada

**Objetivo:** Maximizar informação visível sem sacrificar legibilidade (inspirado em dashboard mobile-first).

### Cards Compactos - Stats e Métricas

**Antes (Espaçoso):**
```html
<div class="bg-gray-800 rounded-lg p-6 shadow-lg">
    <h3 class="text-xl mb-4">Saldo Financeiro</h3>
    <p class="text-3xl">R$ 150,00</p>
</div>
```

**Depois (Compacto):**
```html
<div class="bg-gray-800 rounded-xl p-3 shadow-sm">
    <div class="flex items-center gap-2 mb-1">
        <span class="material-icons text-sm text-green-500">account_balance_wallet</span>
        <p class="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Saldo</p>
    </div>
    <p class="font-jetbrains text-xl font-bold text-white">R$ 150</p>
</div>
```

**Métricas aplicadas:**
- Padding reduzido: `p-6` → `p-3`
- Título menor: `text-xl` → `text-[10px] uppercase`
- Ícone integrado (14-16px)
- Border-radius aumentado: `rounded-lg` → `rounded-xl` (visual moderno)
- Shadow sutil: `shadow-lg` → `shadow-sm`

### Grid de Stats - Mobile First

**4 Cards compactos (2x2 em mobile):**
```html
<div class="grid grid-cols-2 gap-3">
    <!-- Card 1: Saldo -->
    <div class="bg-gray-800 rounded-xl p-3">
        <div class="flex items-center gap-1 mb-1">
            <span class="material-icons text-green-500 text-sm">account_balance_wallet</span>
        </div>
        <p class="font-jetbrains text-lg font-bold">R$ 150</p>
        <p class="text-[9px] uppercase text-gray-500 tracking-wide">Saldo</p>
    </div>

    <!-- Card 2: Posição -->
    <div class="bg-gray-800 rounded-xl p-3">
        <div class="flex items-center gap-1 mb-1">
            <span class="material-icons text-orange-500 text-sm">emoji_events</span>
        </div>
        <p class="font-jetbrains text-lg font-bold">#3</p>
        <p class="text-[9px] uppercase text-gray-500 tracking-wide">Posição</p>
    </div>

    <!-- Card 3: Pontos Rodada -->
    <!-- Card 4: Falta -->
</div>
```

### Checklist de Otimização

- [ ] **Padding:** Reduzir de `p-6` para `p-3` ou `p-4`
- [ ] **Gap:** Grid com `gap-3` (12px) ao invés de `gap-6`
- [ ] **Tipografia Labels:** `text-[10px] uppercase tracking-wider`
- [ ] **Números:** Manter legíveis (`text-xl` ou `text-2xl`)
- [ ] **Ícones:** 14-16px (class `text-sm`)
- [ ] **Altura mínima:** Remover `min-h-[150px]` de cards stat
- [ ] **Grid responsivo:** `grid-cols-2 md:grid-cols-4`

### Hierarquia Visual (Escala)

| Elemento | Tamanho | Uso |
|----------|---------|-----|
| **Hero Stats** | `text-4xl` | Pontuação principal, destaque |
| **Card Stats** | `text-xl` / `text-2xl` | Métricas importantes |
| **Labels** | `text-[10px]` uppercase | Títulos de cards |
| **Descrições** | `text-xs` / `text-sm` | Subtextos |
| **Captions** | `text-[9px]` | Metadados, timestamps |

---

## 13. **Padrão de Carregamento Instantâneo**

**Inspirado em:** Dashboard Saúde (IndexedDB cache-first)

### Estratégia Cache-First

```javascript
// 1. Renderizar cache imediatamente (0ms)
const cached = await loadFromCache();
if (cached) renderUI(cached);

// 2. Buscar dados frescos em background
const fresh = await fetch('/api/data');
saveToCache(fresh);
renderUI(fresh); // Atualiza silenciosamente
```

### Checklist

- [ ] Implementar IndexedDB para dados críticos (ranking, rodadas, extrato)
- [ ] TTL configurável por tipo de dado (30s-5min)
- [ ] Skeleton loading APENAS na primeira visita (sem cache)
- [ ] Indicador visual sutil quando atualiza em background
- [ ] Invalidação inteligente (rodada finalizada = limpar cache)

---

**Última atualização:** 04/02/2026
**Versão:** 1.1.0

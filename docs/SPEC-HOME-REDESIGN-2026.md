# SPEC - Redesign Home App Participante 2026

**Data:** 04/02/2026
**Versão:** 1.0
**Status:** 🟡 Especificação Aprovada
**Inspiração:** Dashboard Fantasy Sports (Mobile-First Dark Mode)

---

## 🎯 Objetivo

Redesenhar a tela inicial do app do participante (`/participante/boas-vindas`) com foco em:

1. **Densidade visual otimizada** - Mais info em menos scroll
2. **Sistema de Avisos** - Comunicação ativa entre admin e participantes
3. **Cards compactos** - Estatísticas financeiras, rodada, pontos e posição
4. **Mobile-first** - UX premium em telas pequenas
5. **Dark mode consistente** - Seguindo identidade visual

---

## 📐 Estrutura da Nova Home

### Layout Vertical (Top to Bottom)

```
┌─────────────────────────────────────┐
│ 1. HEADER (Sticky)                  │
│    - Avatar + Saudação              │
│    - Search + Notifications (badges)│
├─────────────────────────────────────┤
│ 2. AVISOS (Horizontal Scroll)       │
│    - Cards 240px com categorias     │
│    - "Ver todos" link               │
├─────────────────────────────────────┤
│ 3. CARD PRINCIPAL (Hero)            │
│    - Pontuação Global + Gradiente   │
│    - Posição na Liga                │
│    - CTA "Detalhes"                 │
├─────────────────────────────────────┤
│ 4. GRID ESTATÍSTICAS (2x2)          │
│    - Saldo Financeiro               │
│    - Posição Atual                  │
│    - Pontos Rodada                  │
│    - Falta Pagar                    │
├─────────────────────────────────────┤
│ 5. BANNER DESTAQUE (opcional)       │
│    - Promoções / Dicas              │
├─────────────────────────────────────┤
│ 6. NAVEGAÇÃO INFERIOR (Fixed)       │
│    - Início / Ranking / $ / Menu    │
└─────────────────────────────────────┘
```

---

## 🧱 Componentes Detalhados

### 1. Header (Sticky)

**Posicionamento:** `sticky top-0 z-50`

```html
<div class="flex items-center bg-gray-900 p-4 pb-2 justify-between sticky top-0 z-50">
    <!-- Avatar + Saudação -->
    <div class="flex items-center gap-3">
        <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 h-10 border-2 border-orange-500"
             style="background-image: url('[URL_AVATAR]');">
        </div>
        <div>
            <p class="text-gray-400 text-[10px] font-medium uppercase tracking-wider">
                Seja bem-vindo
            </p>
            <h2 class="font-russo text-lg text-white leading-tight tracking-tight">
                Olá, [NOME_PARTICIPANTE]
            </h2>
        </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
        <button class="flex w-10 h-10 items-center justify-center rounded-full bg-gray-800 text-white">
            <span class="material-icons text-xl">search</span>
        </button>
        <button class="relative flex w-10 h-10 items-center justify-center rounded-full bg-gray-800 text-white">
            <span class="material-icons text-xl">notifications</span>
            <!-- Badge de avisos não lidos -->
            <span class="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-orange-500"></span>
        </button>
    </div>
</div>
```

**Especificações:**
- Avatar: 40x40px, border 2px laranja
- Saudação: Russo One, 18px
- Ícones: Material Icons, 20px
- Background: `bg-gray-900`
- Badge: 8x8px, laranja pulsante

---

### 2. Seção Avisos

**Comportamento:** Scroll horizontal com snap, esconde scrollbar

```html
<div class="mt-4">
    <!-- Header da seção -->
    <div class="flex items-center justify-between px-4 mb-3">
        <h3 class="font-russo text-lg text-white uppercase tracking-tight">
            Avisos
        </h3>
        <a href="/participante/avisos" class="text-orange-500 text-sm font-bold">
            Ver todos
        </a>
    </div>

    <!-- Scroll horizontal -->
    <div class="flex overflow-x-auto hide-scrollbar px-4 gap-4 snap-x">
        <!-- Card de Aviso (success) -->
        <div class="flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 border-green-500 snap-start">
            <div class="flex items-center gap-2">
                <span class="material-icons text-green-500">check_circle</span>
                <p class="font-russo text-sm uppercase text-white">Rodada Confirmada</p>
            </div>
            <p class="text-gray-400 text-sm leading-snug">
                Sua escalação para o clássico foi salva com sucesso!
            </p>
        </div>

        <!-- Card de Aviso (warning) -->
        <div class="flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 border-yellow-500 snap-start">
            <div class="flex items-center gap-2">
                <span class="material-icons text-yellow-500">schedule</span>
                <p class="font-russo text-sm uppercase text-white">Mercado Fechando</p>
            </div>
            <p class="text-gray-400 text-sm leading-snug">
                Última chance de trocar jogadores. Fecha em 1h 45m.
            </p>
        </div>

        <!-- Card de Aviso (info) -->
        <div class="flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 border-gray-500 snap-start">
            <div class="flex items-center gap-2">
                <span class="material-icons text-gray-500">description</span>
                <p class="font-russo text-sm uppercase text-white">Novas Regras</p>
            </div>
            <p class="text-gray-400 text-sm leading-snug">
                Confira as atualizações na pontuação de zagueiros.
            </p>
        </div>
    </div>
</div>
```

**Especificações:**
- Card width: 240px (fixo)
- Gap entre cards: 16px
- Border esquerdo: 4px (cor por categoria)
- Padding interno: 16px
- Limite home: 5 avisos mais recentes
- Snap scroll: `snap-x snap-start`

**CSS helper:**
```css
.hide-scrollbar::-webkit-scrollbar {
    display: none;
}
.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
```

---

### 3. Card Principal (Hero - Desempenho Global)

**Destaque visual com gradiente laranja**

```html
<div class="p-4 mt-2">
    <div class="relative overflow-hidden flex flex-col items-stretch rounded-xl shadow-lg bg-gray-900">
        <!-- Gradiente overlay -->
        <div class="absolute inset-0 opacity-40 bg-gradient-to-br from-orange-500 via-transparent to-transparent"></div>

        <!-- Conteúdo -->
        <div class="relative z-10 flex w-full flex-col items-stretch justify-center gap-1 p-6">
            <!-- Header com badge de temporada -->
            <div class="flex justify-between items-start mb-2">
                <p class="text-gray-400 text-[10px] font-bold tracking-widest uppercase">
                    Desempenho Global
                </p>
                <div class="bg-orange-500/20 px-2 py-1 rounded text-orange-500 text-[9px] font-extrabold uppercase tracking-tighter">
                    Temporada 2026
                </div>
            </div>

            <!-- Pontuação principal -->
            <p class="font-jetbrains text-4xl font-extrabold text-white leading-tight tracking-tighter">
                [PONTOS_TOTAIS] <span class="text-lg font-medium">pts</span>
            </p>

            <!-- Footer com posição + CTA -->
            <div class="flex items-end gap-3 justify-between mt-4">
                <div class="flex flex-col">
                    <p class="text-gray-400 text-sm font-medium">
                        Posição na Liga
                    </p>
                    <p class="font-russo text-lg text-white">
                        #[POSICAO] no Geral
                    </p>
                </div>
                <button class="flex min-w-[100px] cursor-pointer items-center justify-center rounded-full h-10 px-4 bg-orange-500 text-white text-sm font-bold transition-transform active:scale-95">
                    <span>Detalhes</span>
                </button>
            </div>
        </div>
    </div>
</div>
```

**Especificações:**
- Background: `bg-gray-900`
- Gradiente: Laranja 40% opacidade, diagonal superior esquerda
- Pontuação: JetBrains Mono, 36px, bold
- Badge temporada: Fundo laranja/20, texto laranja
- CTA: Active scale 95% (feedback tátil)
- Padding: 24px
- Shadow: `shadow-lg`

---

### 4. Grid de Estatísticas (2x2)

**Layout compacto, máxima densidade visual**

```html
<div class="px-4 pb-2">
    <h3 class="font-russo text-lg text-white uppercase tracking-tight mb-4">
        Suas Estatísticas
    </h3>

    <div class="grid grid-cols-2 gap-3">
        <!-- Card 1: Saldo Financeiro -->
        <div class="flex flex-col gap-2 rounded-xl bg-gray-800 p-3 shadow-sm">
            <div class="flex items-center gap-2">
                <span class="material-icons text-green-500 text-sm">account_balance_wallet</span>
            </div>
            <p class="font-jetbrains text-xl font-bold text-white">
                R$ [SALDO]
            </p>
            <p class="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                Saldo
            </p>
        </div>

        <!-- Card 2: Posição Atual -->
        <div class="flex flex-col gap-2 rounded-xl bg-gray-800 p-3 shadow-sm">
            <div class="flex items-center gap-2">
                <span class="material-icons text-orange-500 text-sm">emoji_events</span>
            </div>
            <p class="font-jetbrains text-xl font-bold text-white">
                #[POSICAO]
            </p>
            <p class="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                Posição
            </p>
        </div>

        <!-- Card 3: Pontos Rodada -->
        <div class="flex flex-col gap-2 rounded-xl bg-gray-800 p-3 shadow-sm">
            <div class="flex items-center gap-2">
                <span class="material-icons text-blue-500 text-sm">sports_soccer</span>
            </div>
            <p class="font-jetbrains text-xl font-bold text-white">
                [PONTOS_RODADA] pts
            </p>
            <p class="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                Rodada
            </p>
        </div>

        <!-- Card 4: Falta Pagar -->
        <div class="flex flex-col gap-2 rounded-xl bg-gray-800 p-3 shadow-sm">
            <div class="flex items-center gap-2">
                <span class="material-icons text-red-500 text-sm">warning</span>
            </div>
            <p class="font-jetbrains text-xl font-bold text-white">
                R$ [FALTA]
            </p>
            <p class="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                Falta
            </p>
        </div>
    </div>
</div>
```

**Especificações:**
- Grid: 2 colunas, gap 12px
- Padding card: 12px (reduzido de 24px)
- Altura auto (sem min-height)
- Ícones: 14px (`text-sm`)
- Números: 20px (`text-xl`), JetBrains Mono
- Labels: 9px (`text-[9px]`), uppercase, tracking-wide
- Background: `bg-gray-800`
- Shadow sutil: `shadow-sm`

**Cores de ícones por métrica:**
- Saldo: Verde (`text-green-500`)
- Posição: Laranja (`text-orange-500`)
- Pontos: Azul (`text-blue-500`)
- Falta: Vermelho (`text-red-500`)

---

### 5. Banner Destaque (Opcional)

**Cartão promocional com imagem de fundo**

```html
<div class="p-4 mt-4">
    <div class="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl flex flex-col justify-end p-4 relative overflow-hidden group"
         style="background-image: url('[URL_IMAGEM]');">
        <!-- Gradiente escuro na base -->
        <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>

        <div class="relative z-10">
            <span class="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase mb-2 inline-block">
                Destaque
            </span>
            <h4 class="font-russo text-lg text-white">
                Top 5 Capitães para a Rodada #12
            </h4>
            <p class="text-gray-300 text-sm">
                Confira as dicas do especialista para mitar.
            </p>
        </div>
    </div>
</div>
```

**Especificações:**
- Aspect ratio: 16:9 (`aspect-video`)
- Gradiente: Preto na base, transparente no topo
- Badge categoria: Laranja, uppercase
- Hover: Pode incluir scale ou parallax sutil

---

### 6. Navegação Inferior (Fixed)

**Bottom navigation bar com 4 itens**

```html
<div class="fixed bottom-0 left-0 right-0 z-[100] bg-gray-800 border-t border-gray-700 px-6 py-4 max-w-[480px] mx-auto">
    <div class="flex justify-between items-center">
        <!-- Início (ativo) -->
        <button class="flex flex-col items-center gap-1 text-orange-500">
            <span class="material-icons text-2xl">home</span>
            <span class="text-[10px] font-bold uppercase">Início</span>
        </button>

        <!-- Ranking -->
        <button class="flex flex-col items-center gap-1 text-gray-400">
            <span class="material-icons text-2xl">leaderboard</span>
            <span class="text-[10px] font-bold uppercase">Ranking</span>
        </button>

        <!-- Financeiro -->
        <button class="flex flex-col items-center gap-1 text-gray-400">
            <span class="material-icons text-2xl">payments</span>
            <span class="text-[10px] font-bold uppercase">Financeiro</span>
        </button>

        <!-- Menu -->
        <button class="flex flex-col items-center gap-1 text-gray-400">
            <span class="material-icons text-2xl">menu</span>
            <span class="text-[10px] font-bold uppercase">Menu</span>
        </button>
    </div>
</div>

<!-- Spacer para iOS home indicator -->
<div class="h-6 w-full"></div>
```

**Especificações:**
- Posição: Fixed bottom
- Max-width: 480px (mobile)
- Ícones: 28px (`text-2xl`)
- Label: 10px uppercase
- Cor ativa: Laranja
- Cor inativa: Cinza 400
- Spacer iOS: 24px extra

---

## 🎨 Design Tokens Consolidados

### Cores (Dark Mode)

| Uso | Tailwind | Hex |
|-----|----------|-----|
| Background primário | `bg-gray-900` | `#111827` |
| Background card | `bg-gray-800` | `#1f2937` |
| Texto primário | `text-white` | `#ffffff` |
| Texto secundário | `text-gray-400` | `#9ca3af` |
| Texto muted | `text-gray-500` | `#6b7280` |
| Accent laranja | `bg-orange-500` | `#f97316` |
| Border sutil | `border-gray-700` | `#374151` |

### Tipografia

| Elemento | Fonte | Tamanho | Peso |
|----------|-------|---------|------|
| Header principal | Russo One | 18px | Normal |
| Seção título | Russo One | 18px | Normal |
| Card título | Russo One | 14px | Normal |
| Hero pontuação | JetBrains Mono | 36px | Bold |
| Stats valor | JetBrains Mono | 20px | Bold |
| Label uppercase | Inter | 9-10px | Bold |
| Corpo texto | Inter | 14px | Normal |

### Espaçamento (Reduzido)

| Contexto | Antes | Depois |
|----------|-------|--------|
| Card padding | `p-6` (24px) | `p-3` (12px) |
| Grid gap | `gap-6` (24px) | `gap-3` (12px) |
| Section margin | `mb-8` (32px) | `mb-4` (16px) |

---

## 🗄️ Backend - Sistema de Avisos

### Collection MongoDB: `avisos`

```javascript
{
  _id: ObjectId,
  titulo: String,          // "Rodada Confirmada"
  mensagem: String,        // "Sua escalação foi salva..."
  categoria: String,       // "success" | "warning" | "info" | "urgent"

  // Segmentação (opcional)
  ligaId: String,          // null = global
  timeId: String,          // null = para toda a liga

  // Lifecycle
  dataCriacao: Date,
  dataExpiracao: Date,     // Auto-delete após 7 dias
  ativo: Boolean,

  // Tracking
  leitoPor: [String],      // Array de timeIds que leram
  criadoPor: String        // ID do admin
}
```

### Endpoints

**Admin (criar/gerenciar)**
```
POST   /api/admin/avisos/criar
GET    /api/admin/avisos/listar
PUT    /api/admin/avisos/:id/editar
DELETE /api/admin/avisos/:id/deletar
```

**Participante (consumir)**
```
GET  /api/avisos?ligaId={id}&timeId={id}
     → Retorna avisos globais + da liga + do time

POST /api/avisos/:id/marcar-lido
     → Adiciona timeId ao array leitoPor
```

---

## 🚀 Plano de Implementação

### Fase 1: Backend (1-2 dias)
- [ ] Criar collection `avisos`
- [ ] Implementar endpoints admin
- [ ] Implementar endpoints participante
- [ ] Criar interface admin em `/admin/operacoes/notificador`
- [ ] Testes de CRUD e segmentação

### Fase 2: Frontend Participante (2-3 dias)
- [ ] Criar componente `<AvisosList>`
- [ ] Integrar na home (`boas-vindas.html`)
- [ ] Implementar scroll horizontal com snap
- [ ] Adicionar badge de não lidos no header
- [ ] Cache IndexedDB para avisos

### Fase 3: Redesign Cards Stats (1-2 dias)
- [ ] Reduzir padding dos cards (p-6 → p-3)
- [ ] Reduzir gap do grid (gap-6 → gap-3)
- [ ] Ajustar tipografia (labels 9-10px)
- [ ] Ícones Material Icons integrados
- [ ] Testar em diversos tamanhos de tela

### Fase 4: Polimento (1 dia)
- [ ] Animações de entrada (fade-in-up)
- [ ] Loading states
- [ ] Empty states (sem avisos)
- [ ] Testes A/B com usuários
- [ ] Ajustes de contraste/acessibilidade

**Total estimado:** 5-8 dias de desenvolvimento

---

## 📱 Breakpoints Responsivos

```css
/* Mobile (padrão) */
.stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
    .stats-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
    }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
    .home-container {
        max-width: 480px;
        margin: 0 auto;
    }
}
```

---

## 🎯 KPIs de Sucesso

| Métrica | Objetivo |
|---------|----------|
| **Scroll depth** | Reduzir 30% (mais info acima da dobra) |
| **Tempo na home** | Aumentar 20% (conteúdo relevante) |
| **Cliques em avisos** | 60%+ de taxa de leitura |
| **Load time** | < 300ms (cache IndexedDB) |
| **Lighthouse Mobile** | 90+ Performance |

---

## 📚 Referências

- **HTML Inspiração:** `/public/dashboard-saude.html` (estrutura, spacing)
- **Audit UI:** `/docs/rules/audit-ui.md` (seções 11, 12, 13)
- **Design Tokens:** `/css/_admin-tokens.css`
- **Módulo Atual:** `/public/participante/js/modules/participante-boas-vindas.js`

---

**Aprovação necessária antes de implementar:**
- [ ] Product Owner (validação de UX)
- [ ] Tech Lead (viabilidade técnica)
- [ ] Designer (cores e tipografia)

**Status:** 🟡 Aguardando Aprovação

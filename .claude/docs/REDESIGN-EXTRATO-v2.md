# Redesign Extrato Financeiro v2.0
## Inspirado no Banco Inter | Dark Theme

---

## 1. Linguagem Visual Unificada

### Princípios (Inter-inspired)

| Princípio | Descrição |
|-----------|-----------|
| **Hierarquia clara** | Saldo principal em destaque, informações secundárias subordinadas |
| **Cards organizados** | Cada seção é um card com propósito único |
| **Laranja como acento** | Cor principal `#FF5500` para CTAs e destaques |
| **Tipografia consistente** | Russo One (títulos), JetBrains Mono (valores), Inter (corpo) |
| **Dark Mode OLED** | Fundo `#0a0a0a` para economia de bateria |
| **Feedback visual** | Estados claros (hover, active, loading) |

### Paleta de Cores

```css
/* Principais */
--extrato-bg: #0a0a0a;              /* Fundo OLED */
--extrato-card: #1a1a1a;            /* Cards */
--extrato-card-elevated: #252525;   /* Cards hover */
--extrato-accent: #FF5500;          /* Laranja Inter-style */

/* Status */
--extrato-positive: #22c55e;        /* Verde (a receber) */
--extrato-negative: #ef4444;        /* Vermelho (deve) */
--extrato-neutral: #6b7280;         /* Cinza (quitado) */

/* Gradientes sutis (fundo dos cards de saldo) */
--gradient-positive: linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%);
--gradient-negative: linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%);
```

---

## 2. Layout Admin (Desktop)

### Estrutura do Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                        [X]  │
│ │ 🔴  │  ANTONIO LUIS                                               │
│ │     │  Extrato Financeiro · Temporada 2026                        │
│ └─────┘                                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     💳 SALDO FINANCEIRO                         │ │
│  │                                                                  │ │
│  │                       R$ 120,00                                  │ │
│  │                       ▼ VOCÊ DEVE                                │ │
│  │                                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │ Rodadas  │  │  Ganhos  │  │  Perdas  │  │ Acertos  │        │ │
│  │  │    2     │  │  +R$9    │  │  -R$129  │  │  +R$60   │        │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ 📊 EVOLUÇÃO         │  │ 📋 DETALHAMENTO                       │ │
│  │                     │  │                                        │ │
│  │     ╱╲    ╱╲       │  │  Rodada 2 · 24º lugar                  │ │
│  │    ╱  ╲  ╱  ╲___   │  │  ├─ Bônus/Ônus ........... +R$ 4,00   │ │
│  │   R1   R2          │  │  ├─ Pontos Corridos ...... -R$ 5,00   │ │
│  │                     │  │  └─ Saldo rodada: -R$ 1,00            │ │
│  │  [Tudo] [10R] [5R] │  │                                        │ │
│  └─────────────────────┘  │  Rodada 1 · 7º lugar (G7)             │ │
│                           │  ├─ Bônus/Ônus ........... +R$ 9,00   │ │
│  ┌─────────────────────┐  │  └─ Saldo rodada: +R$ 9,00            │ │
│  │ 💰 ACERTOS (1)      │  │                                        │ │
│  │                     │  │  ─────────────────────────────────    │ │
│  │ ↑ Inscrição 2026   │  │  TOTAIS:                               │ │
│  │   16/01 · PIX      │  │  Bônus/Ônus: +R$ 13,00                 │ │
│  │   +R$ 60,00 PAGOU  │  │  P.C: -R$ 5,00                         │ │
│  │                     │  │  Saldo Temporada: +R$ 8,00             │ │
│  └─────────────────────┘  └──────────────────────────────────────┘ │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  [💳 Novo Acerto]  [📄 Exportar PDF]              [🔄 Atualizar]    │
└─────────────────────────────────────────────────────────────────────┘
```

### Componentes Admin

#### 2.1 Hero Card (Saldo Principal)

```html
<div class="extrato-hero-admin">
    <div class="extrato-hero-admin__header">
        <span class="extrato-hero-admin__icon">💳</span>
        <span class="extrato-hero-admin__label">SALDO FINANCEIRO</span>
    </div>
    <div class="extrato-hero-admin__valor negativo">
        R$ 120,00
    </div>
    <div class="extrato-hero-admin__status negativo">
        <span class="material-icons">trending_down</span>
        VOCÊ DEVE
    </div>
    <div class="extrato-hero-admin__stats">
        <!-- 4 pills com stats rápidas -->
    </div>
</div>
```

#### 2.2 Grid 2 Colunas (Desktop)

```css
.extrato-admin-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 20px;
}

/* Coluna esquerda: Gráfico + Acertos */
/* Coluna direita: Detalhamento por rodada */
```

#### 2.3 Timeline de Rodadas (substitui tabela)

```html
<div class="extrato-timeline-admin">
    <div class="extrato-timeline-admin__item">
        <div class="extrato-timeline-admin__header">
            <span class="rodada-badge">R2</span>
            <span class="posicao-badge neutro">24º</span>
            <span class="saldo-badge negativo">-R$ 1,00</span>
        </div>
        <div class="extrato-timeline-admin__breakdown">
            <!-- Linhas de detalhamento -->
        </div>
    </div>
</div>
```

---

## 3. Layout App (Mobile)

### Estrutura da Tela

```
┌─────────────────────────────────┐
│  [←]  Extrato Financeiro  [🔄] │  ← Header fixo
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐ │
│  │   💳 SALDO FINANCEIRO     │ │
│  │                           │ │
│  │      R$ 120,00           │ │
│  │      ▼ VOCÊ DEVE         │ │
│  │                           │ │
│  │   Inscrição 2026: R$60   │ │
│  │   [DEVENDO]              │ │
│  │                           │ │
│  │  [👁]              [🔄]  │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────┐ ┌───────┐ ┌───────┐ │  ← Pills scroll horizontal
│  │Rodadas│ │ Saldo │ │ Pago  │ │
│  │   2   │ │-R$120 │ │ R$60  │ │
│  └───────┘ └───────┘ └───────┘ │
│                                 │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│  │    [📊 Meus Acertos (1)]   │ │  ← Botão abre bottom sheet
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 📊 EVOLUÇÃO FINANCEIRA    │ │
│  │                           │ │
│  │     ╱╲    ╱╲             │ │
│  │    ╱  ╲  ╱  ╲___         │ │
│  │   R1   R2                │ │
│  │                           │ │
│  │  [Tudo] [10R] [5R]       │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 📋 TIMELINE               │ │
│  │                           │ │
│  │ [Todos] [Créditos] [Déb] │ │
│  │                           │ │
│  │ ○ INSCRIÇÃO               │ │
│  │   Taxa 2026 .... -R$60   │ │
│  │                           │ │
│  │ ○ RODADA 2 · 24º         │ │
│  │   Banco ........ +R$4    │ │
│  │   P.C .......... -R$5    │ │
│  │   [Saldo: R$ 9,00]       │ │
│  │                     [▼]  │ │
│  │                           │ │
│  │ ○ RODADA 1 · 7º (G7)     │ │
│  │   Banco ........ +R$9    │ │
│  │   [Saldo: +R$ 9,00]      │ │
│  │                           │ │
│  │ ○ ACERTOS                 │ │
│  │   Inscrição PIX .. +R$60 │ │
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 🏆 SEU DESEMPENHO         │ │
│  │                           │ │
│  │  Mitos   Micos  ZonaG ZonaZ│
│  │    0       0      1     1 │ │
│  │                           │ │
│  │  Melhor: R1 (+R$9)       │ │
│  │  Pior: R2 (-R$1)         │ │
│  └───────────────────────────┘ │
│                                 │
│               ▼                 │  ← Scroll
└─────────────────────────────────┘
```

### Componentes Mobile (já existem, ajustes)

O App já tem a estrutura v11.0. Ajustes propostos:

1. **Hero Card** - Adicionar borda laranja sutil
2. **Pills** - Aumentar contraste
3. **Timeline** - Melhorar tipografia dos valores
4. **Performance Card** - Adicionar mini sparkline

---

## 4. Mudanças Específicas

### 4.1 Admin - O que muda

| Antes | Depois |
|-------|--------|
| Card saldo vermelho sólido | Card com gradiente sutil + borda |
| Tabela 7 colunas | Timeline expansível |
| Seção "Acertos" separada | Card lateral integrado |
| Botões pequenos no footer | Botões maiores com ícones |

### 4.2 App - O que muda

| Antes | Depois |
|-------|--------|
| Pills sem borda | Pills com borda sutil `--app-glass-border` |
| Valores sem prefixo | Prefixo +/- mais destacado |
| Gráfico sem labels | Labels R1, R2... mais visíveis |
| Performance card básico | Performance card com sparkline |

---

## 5. Componentes Compartilhados

### 5.1 Valor Monetário (reutilizável)

```css
.extrato-valor {
    font-family: var(--font-family-mono); /* JetBrains Mono */
    font-weight: 700;
    letter-spacing: -0.5px;
}

.extrato-valor--positivo {
    color: var(--color-success-light);
}

.extrato-valor--negativo {
    color: var(--color-danger);
}

.extrato-valor--hero {
    font-size: 2rem; /* Mobile: 1.75rem */
}
```

### 5.2 Badge de Status

```css
.extrato-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 9999px;
    font-family: var(--font-family-brand); /* Russo One */
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.extrato-status-badge--deve {
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-danger-light);
}

.extrato-status-badge--receber {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-success-light);
}

.extrato-status-badge--quitado {
    background: rgba(107, 114, 128, 0.15);
    color: var(--text-muted);
}
```

### 5.3 Timeline Item

```css
.extrato-timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.extrato-timeline-item__icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.extrato-timeline-item__icon--credit {
    background: rgba(34, 197, 94, 0.12);
    color: var(--color-success-light);
}

.extrato-timeline-item__icon--debit {
    background: rgba(239, 68, 68, 0.12);
    color: var(--color-danger-light);
}
```

---

## 6. Implementação

### Arquivos a criar/modificar

```
public/
├── css/
│   └── modules/
│       └── extrato-v2.css          # CSS compartilhado (novo)
│
├── js/
│   └── fluxo-financeiro/
│       └── fluxo-financeiro-ui.js  # Modificar renderização (existente)
│
└── participante/
    ├── css/
    │   └── extrato-bank.css        # Ajustes menores (existente)
    └── js/
        └── modules/
            └── participante-extrato-ui.js  # Ajustes menores (existente)
```

### Fases de Implementação

1. **Fase 1**: Criar CSS compartilhado `extrato-v2.css`
2. **Fase 2**: Refatorar modal Admin (HTML/JS)
3. **Fase 3**: Ajustar App (CSS tweaks)
4. **Fase 4**: Testar responsividade
5. **Fase 5**: Documentar componentes

---

## 7. Preview Visual (ASCII)

### Admin Modal - Estado "Deve"

```
╔═══════════════════════════════════════════════════════════════════╗
║  🔴 ANTONIO LUIS                                              ✕   ║
║     Extrato Financeiro · 2026                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ╭─────────────────────────────────────────────────────────────╮  ║
║  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ║
║  │                    SALDO FINANCEIRO                         │  ║
║  │                                                             │  ║
║  │                      R$ 120,00                              │  ║
║  │                   🔻 VOCÊ DEVE                              │  ║
║  │                                                             │  ║
║  │   ╭──────╮  ╭──────╮  ╭──────╮  ╭──────╮                   │  ║
║  │   │  2   │  │ +R$9 │  │-R$129│  │+R$60 │                   │  ║
║  │   │Rodada│  │Ganhos│  │Perdas│  │Acerto│                   │  ║
║  │   ╰──────╯  ╰──────╯  ╰──────╯  ╰──────╯                   │  ║
║  ╰─────────────────────────────────────────────────────────────╯  ║
║                                                                   ║
║  ╭──────────────────╮  ╭─────────────────────────────────────╮   ║
║  │ EVOLUÇÃO         │  │ DETALHAMENTO                         │   ║
║  │      ╱╲          │  │                                      │   ║
║  │     ╱  ╲___      │  │  ● Rodada 2 · 24º           -R$1    │   ║
║  │    R1  R2        │  │    └─ Banco: +R$4 · PC: -R$5        │   ║
║  │                  │  │                                      │   ║
║  │  [Tudo][10R][5R] │  │  ● Rodada 1 · 7º (G7)       +R$9    │   ║
║  ╰──────────────────╯  │    └─ Banco: +R$9                   │   ║
║                        │                                      │   ║
║  ╭──────────────────╮  │  ─────────────────────────────────   │   ║
║  │ ACERTOS (1)      │  │  TOTAIS                              │   ║
║  │                  │  │  Bônus/Ônus: +R$13                   │   ║
║  │  ↑ Inscrição     │  │  P.C: -R$5                           │   ║
║  │    16/01 · PIX   │  │  ─────────────────────────────────   │   ║
║  │    +R$60 ✓PAGOU  │  │  Saldo Temp: +R$8                    │   ║
║  ╰──────────────────╯  ╰─────────────────────────────────────╯   ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  [💳 Novo Acerto]    [📄 PDF]                    [🔄 Atualizar]   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 8. Aprovação

**Preciso da sua aprovação para implementar:**

- [ ] Layout geral aprovado
- [ ] Cores aprovadas
- [ ] Componentes aprovados
- [ ] Fluxo de implementação aprovado

**Após aprovação, inicio a Fase 1 (CSS compartilhado).**

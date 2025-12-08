
# Design System - App Participante

## 🎨 Paleta de Cores

### Cores Principais
- **Primary**: `#FF4500` (Laranja Cartola)
- **Background**: `#0a0a0a` (Preto profundo)
- **Surface**: `#1c1c1c` (Cinza escuro)
- **Surface Light**: `#2a2a2a` (Cinza médio)

### Cores de Texto
- **Primary**: `#ffffff` (Branco puro)
- **Secondary**: `rgba(255, 255, 255, 0.7)` (70% opacidade)
- **Muted**: `rgba(255, 255, 255, 0.5)` (50% opacidade)
- **Disabled**: `rgba(255, 255, 255, 0.3)` (30% opacidade)

### Cores de Estado
- **Success**: `#22C55E` (Verde)
- **Danger**: `#EF4444` (Vermelho)
- **Warning**: `#EAB308` (Amarelo)
- **Info**: `#3B82F6` (Azul)

## 📐 Tipografia

### Família de Fontes
```css
font-family: 'Lexend', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Tamanhos de Texto
- **Título Grande**: 24px, bold (700)
- **Título Médio**: 18px, bold (700)
- **Título Pequeno**: 14px, bold (700)
- **Corpo**: 14px, regular (400)
- **Pequeno**: 12px, medium (500)
- **Mini**: 10px, bold (700)

### Valores Numéricos
```css
font-family: 'JetBrains Mono', monospace;
font-weight: 700;
```

## 🔲 Cards e Containers

### Card Padrão
```html
<div class="bg-surface-dark rounded-xl p-4">
  <!-- Conteúdo -->
</div>
```

### Card com Borda
```html
<div class="bg-surface-dark rounded-xl p-4 border border-white/5">
  <!-- Conteúdo -->
</div>
```

## 📊 Componentes Comuns

### Título de Seção
```html
<div class="flex items-center gap-2 mb-3">
  <span class="material-symbols-outlined text-primary text-xl">emoji_events</span>
  <h3 class="text-sm font-bold text-white">Título da Seção</h3>
</div>
```

### Valor Destacado
```html
<div class="text-center">
  <p class="text-xs font-medium uppercase text-white/70">Label</p>
  <p class="text-2xl font-bold text-white">123</p>
</div>
```

### Valor com Status
```html
<span class="text-lg font-bold text-green-400">+R$ 100,00</span>
<span class="text-lg font-bold text-red-400">-R$ 50,00</span>
```

## 🎯 Ícones

### Material Symbols Outlined
- Sempre usar `material-symbols-outlined`
- Tamanho base: 20px
- Cor primária: `#FF4500`
- Cor secundária: cor do contexto

```html
<span class="material-symbols-outlined text-primary">star</span>
```

## 📱 Espaçamento

- **Extra Small**: 4px
- **Small**: 8px
- **Medium**: 12px
- **Large**: 16px
- **Extra Large**: 24px

## 🔘 Botões

### Botão Primário
```html
<button class="bg-primary text-white px-4 py-2 rounded-lg font-semibold">
  Ação
</button>
```

### Botão Secundário
```html
<button class="bg-white/10 text-white px-4 py-2 rounded-lg font-semibold">
  Ação
</button>
```

## 🎨 Bordas e Sombras

### Border Radius
- **Small**: 8px
- **Medium**: 12px
- **Large**: 16px
- **Full**: 9999px (circular)

### Borders
- **Padrão**: `1px solid rgba(255, 255, 255, 0.05)`
- **Destaque**: `1px solid rgba(255, 69, 0, 0.2)`

## ✅ Checklist de Padronização

- [ ] Background principal: `#0a0a0a`
- [ ] Cards: `bg-surface-dark rounded-xl`
- [ ] Textos brancos com opacidade correta
- [ ] Ícones Material Symbols Outlined
- [ ] Valores em JetBrains Mono
- [ ] Espaçamento consistente (múltiplos de 4px)
- [ ] Cores de status (verde/vermelho/amarelo) corretas
- [ ] Border radius de 12px nos cards

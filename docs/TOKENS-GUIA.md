# Reforço Importante

Todos os novos módulos, componentes e ajustes de CSS devem usar **apenas tokens e utilitários padronizados**. Nunca utilize valores hardcoded de cor, espaçamento, raio, sombra ou animação. Isso garante consistência visual, facilidade de manutenção e suporte a temas.

---

**Última atualização:** Janeiro 2026
# Guia de Design Tokens - Super Cartola Manager

## Arquivos Criados

| Contexto | Arquivo | Prefixo das Variáveis |
|----------|---------|----------------------|
| **Admin** (Desktop) | `public/css/_admin-tokens.css` | `--color-*`, `--surface-*`, etc. |
| **App** (Mobile) | `public/participante/css/_app-tokens.css` | `--app-*` |

---

## Como Usar

### 1. Importar no HTML

**Admin (Desktop):**
```html
<head>
    <!-- PRIMEIRO: Tokens -->
    <link rel="stylesheet" href="/css/_admin-tokens.css">
    <!-- DEPOIS: Outros CSS -->
    <link rel="stylesheet" href="/css/base.css">
    <link rel="stylesheet" href="/css/modules/seu-modulo.css">
</head>
```

**App (Mobile):**
```html
<head>
    <!-- PRIMEIRO: Tokens -->
    <link rel="stylesheet" href="/participante/css/_app-tokens.css">
    <!-- DEPOIS: Outros CSS -->
    <link rel="stylesheet" href="/participante/css/participante.css">
</head>
```

---

## Exemplos de Migração

### ANTES (hardcoded):
```css
.meu-botao {
    background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%);
    color: #ffffff;
    border-radius: 8px;
    padding: 12px 20px;
    box-shadow: 0 4px 15px rgba(255, 69, 0, 0.4);
}
```

### DEPOIS (com tokens):
```css
/* Admin */
.meu-botao {
    background: var(--gradient-primary);
    color: var(--text-primary);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-5);
    box-shadow: var(--shadow-primary);
}

/* App */
.meu-botao {
    background: var(--app-gradient-primary);
    color: var(--app-text-primary);
    border-radius: var(--app-radius-md);
    padding: var(--app-space-4) var(--app-space-5);
    box-shadow: var(--app-shadow-glow);
}
```

---

## Cores Oficiais Padronizadas

| Cor | Variável Admin | Variável App | Valor |
|-----|---------------|--------------|-------|
| **Laranja Principal** | `--color-primary` | `--app-primary` | `#FF5500` |
| **Laranja Escuro** | `--color-primary-dark` | `--app-primary-dark` | `#e8472b` |
| **Verde Sucesso** | `--color-success` | `--app-success` | `#10b981` |
| **Vermelho Erro** | `--color-danger` | `--app-danger` | `#ef4444` |
| **Ouro (1º lugar)** | `--color-gold` | `--app-gold` | `#ffd700` |
| **Prata (2º lugar)** | `--color-silver` | `--app-silver` | `#c0c0c0` |
| **Bronze (3º lugar)** | `--color-bronze` | `--app-bronze` | `#cd7f32` |

---

## Animações Padronizadas

### Admin (usar apenas estas):
```css
/* Spinner */
animation: admin-spin 1s linear infinite;

/* Fade In */
animation: admin-fade-in 0.4s ease-out;

/* Fade In Up */
animation: admin-fade-in-up 0.4s ease-out;
```

### App (usar apenas estas):
```css
/* Spinner */
animation: app-spin 0.8s linear infinite;

/* Fade In */
animation: app-fade-in 0.3s ease-out;

/* Fade In Up */
animation: app-fade-in-up 0.3s ease-out;
```

---

## Classes Utilitárias Prontas

### Admin:
```css
.admin-spinner       /* Spinner padrão 40px */
.admin-spinner--sm   /* Spinner pequeno 24px */
.admin-spinner--lg   /* Spinner grande 56px */
.admin-animate-fade-in
.admin-animate-fade-in-up
```

### App:
```css
.app-spinner         /* Spinner padrão 40px */
.app-spinner--sm     /* Spinner pequeno 24px */
.app-card            /* Card base */
.app-card--elevated  /* Card com sombra */
.app-touch-feedback  /* Feedback de toque */
.app-value-mono      /* Valores numéricos (JetBrains Mono) */
.app-value-positive  /* Verde para valores positivos */
.app-value-negative  /* Vermelho para valores negativos */
.app-animate-fade-in
.app-animate-fade-in-up
```

---

## Checklist de Migração

Ao refatorar um módulo CSS existente:

- [ ] Substituir `#ff4500` / `#FF4500` → `var(--color-primary)` ou `var(--app-primary)`
- [ ] Substituir `#e8472b` → `var(--color-primary-dark)` ou `var(--app-primary-dark)`
- [ ] Substituir `#1a1a1a` → `var(--surface-card)` ou `var(--app-surface)`
- [ ] Substituir gradientes hardcoded → `var(--gradient-primary)` ou `var(--app-gradient-primary)`
- [ ] Remover `@keyframes spin` duplicados (usar `admin-spin` ou `app-spin`)
- [ ] Substituir `border-radius: 8px` → `var(--radius-md)` ou `var(--app-radius-md)`
- [ ] Substituir sombras hardcoded → `var(--shadow-*)` ou `var(--app-shadow-*)`

---

## Performance (App Mobile)

**EVITAR no App:**
- `backdrop-filter: blur()` em elementos que scrollam
- Múltiplas `box-shadow` em cards
- Animações com `transform: scale()` em listas longas

**PREFERIR:**
- Backgrounds sólidos com opacidade
- Uma única sombra por card
- `will-change` apenas quando necessário

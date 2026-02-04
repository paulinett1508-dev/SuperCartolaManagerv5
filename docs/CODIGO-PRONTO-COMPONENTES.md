# COMPONENTES PRONTOS - Copy & Paste

**Objetivo:** Código HTML/CSS/JS pronto para uso imediato no redesign

---

## 🎯 Card de Aviso (4 Variações)

### 1. Success (Verde)

```html
<div class="flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 border-green-500 snap-start hover:shadow-lg transition-shadow">
    <div class="flex items-center gap-2">
        <span class="material-icons text-green-500 text-lg">check_circle</span>
        <p class="font-russo text-sm uppercase text-white tracking-tight">Rodada Confirmada</p>
    </div>
    <p class="text-gray-400 text-sm leading-snug">
        Sua escalação para o clássico foi salva com sucesso!
    </p>
</div>
```

---

### 2. Warning (Amarelo)

```html
<div class="flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 border-yellow-500 snap-start hover:shadow-lg transition-shadow">
    <div class="flex items-center gap-2">
        <span class="material-icons text-yellow-500 text-lg">schedule</span>
        <p class="font-russo text-sm uppercase text-white tracking-tight">Mercado Fechando</p>
    </div>
    <p class="text-gray-400 text-sm leading-snug">
        Última chance de trocar jogadores. Fecha em <strong class="text-yellow-400">1h 45m</strong>.
    </p>
</div>
```

---

### 3. Info (Azul)

```html
<div class="flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 border-blue-500 snap-start hover:shadow-lg transition-shadow">
    <div class="flex items-center gap-2">
        <span class="material-icons text-blue-500 text-lg">info</span>
        <p class="font-russo text-sm uppercase text-white tracking-tight">Novas Regras</p>
    </div>
    <p class="text-gray-400 text-sm leading-snug">
        Confira as atualizações na pontuação de zagueiros.
    </p>
</div>
```

---

### 4. Urgent (Vermelho)

```html
<div class="flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 border-red-500 snap-start hover:shadow-lg transition-shadow animate-pulse">
    <div class="flex items-center gap-2">
        <span class="material-icons text-red-500 text-lg">error</span>
        <p class="font-russo text-sm uppercase text-white tracking-tight">Débito Pendente</p>
    </div>
    <p class="text-gray-400 text-sm leading-snug">
        Você possui <strong class="text-red-400">R$ 50,00</strong> em atraso. Regularize agora.
    </p>
</div>
```

---

## 🏆 Hero Card - Desempenho Global

```html
<div class="p-4 mt-2">
    <div class="relative overflow-hidden flex flex-col items-stretch rounded-xl shadow-lg bg-gray-900 border border-gray-800 hover:border-orange-500/50 transition-all">
        <!-- Gradiente overlay -->
        <div class="absolute inset-0 opacity-40 bg-gradient-to-br from-orange-500 via-orange-600/30 to-transparent"></div>

        <!-- Conteúdo -->
        <div class="relative z-10 flex w-full flex-col items-stretch justify-center gap-1 p-6">
            <!-- Header -->
            <div class="flex justify-between items-start mb-2">
                <p class="text-gray-400 text-[10px] font-bold tracking-widest uppercase">
                    Desempenho Global
                </p>
                <div class="bg-orange-500/20 px-2 py-1 rounded text-orange-400 text-[9px] font-extrabold uppercase tracking-tighter border border-orange-500/30">
                    Temporada 2026
                </div>
            </div>

            <!-- Pontuação principal -->
            <p class="font-jetbrains text-4xl font-extrabold text-white leading-tight tracking-tighter mb-1">
                1,240.50 <span class="text-lg font-medium text-gray-300">pts</span>
            </p>

            <!-- Footer com posição + CTA -->
            <div class="flex items-end gap-3 justify-between mt-4">
                <div class="flex flex-col">
                    <p class="text-gray-400 text-sm font-medium leading-tight">
                        Posição na Liga
                    </p>
                    <p class="font-russo text-lg text-white">
                        #3 <span class="text-gray-400 text-sm font-normal">no Geral</span>
                    </p>
                </div>
                <button class="flex min-w-[100px] cursor-pointer items-center justify-center rounded-full h-10 px-4 bg-orange-500 text-white text-sm font-bold transition-transform active:scale-95 hover:bg-orange-600">
                    <span>Detalhes</span>
                </button>
            </div>
        </div>
    </div>
</div>
```

---

## 📊 Grid 2x2 - Estatísticas Compactas

```html
<div class="px-4 pb-2">
    <h3 class="font-russo text-lg text-white uppercase tracking-tight mb-4">
        Suas Estatísticas
    </h3>

    <div class="grid grid-cols-2 gap-3">
        <!-- Card 1: Saldo Financeiro -->
        <div class="flex flex-col gap-2 rounded-xl bg-gray-800 p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-700 hover:border-green-500/50">
            <div class="flex items-center gap-2 mb-1">
                <span class="material-icons text-green-500 text-base">account_balance_wallet</span>
            </div>
            <p class="font-jetbrains text-xl font-bold text-white">
                R$ 150
            </p>
            <p class="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                Saldo
            </p>
        </div>

        <!-- Card 2: Posição Atual -->
        <div class="flex flex-col gap-2 rounded-xl bg-gray-800 p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-700 hover:border-orange-500/50">
            <div class="flex items-center gap-2 mb-1">
                <span class="material-icons text-orange-500 text-base">emoji_events</span>
            </div>
            <p class="font-jetbrains text-xl font-bold text-white">
                #3
            </p>
            <p class="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                Posição
            </p>
        </div>

        <!-- Card 3: Pontos Rodada -->
        <div class="flex flex-col gap-2 rounded-xl bg-gray-800 p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-700 hover:border-blue-500/50">
            <div class="flex items-center gap-2 mb-1">
                <span class="material-icons text-blue-500 text-base">sports_soccer</span>
            </div>
            <p class="font-jetbrains text-xl font-bold text-white">
                85.5 <span class="text-sm text-gray-400">pts</span>
            </p>
            <p class="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                Rodada
            </p>
        </div>

        <!-- Card 4: Falta Pagar -->
        <div class="flex flex-col gap-2 rounded-xl bg-gray-800 p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-700 hover:border-red-500/50">
            <div class="flex items-center gap-2 mb-1">
                <span class="material-icons text-red-500 text-base">warning</span>
            </div>
            <p class="font-jetbrains text-xl font-bold text-white">
                R$ 20
            </p>
            <p class="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                Falta
            </p>
        </div>
    </div>
</div>
```

---

## 🎨 CSS Helper Classes

```css
/* =====================================================================
   HELPERS PARA REDESIGN - Adicionar em participante.css
   ===================================================================== */

/* Hide scrollbar (mantém funcionalidade) */
.hide-scrollbar::-webkit-scrollbar {
    display: none;
}

.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

/* Snap scroll horizontal */
.snap-x {
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
}

.snap-start {
    scroll-snap-align: start;
}

.snap-center {
    scroll-snap-align: center;
}

/* Gradient overlays */
.gradient-overlay-dark {
    background: linear-gradient(180deg,
        transparent 0%,
        rgba(0, 0, 0, 0.3) 50%,
        rgba(0, 0, 0, 0.8) 100%);
}

.gradient-overlay-orange {
    background: linear-gradient(135deg,
        rgba(249, 115, 22, 0.4) 0%,
        rgba(249, 115, 22, 0.1) 50%,
        transparent 100%);
}

/* Animação fade-in-up */
@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out;
}

/* Badge pulsante (notificações não lidas) */
.badge-pulse {
    animation: pulse-badge 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-badge {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.7;
        transform: scale(1.1);
    }
}

/* Escala ao clicar (feedback tátil) */
.active-scale {
    transition: transform 0.15s ease;
}

.active-scale:active {
    transform: scale(0.95);
}

/* Estados de loading (skeleton) */
.skeleton {
    background: linear-gradient(90deg,
        #1f2937 25%,
        #374151 50%,
        #1f2937 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}
```

---

## 📱 Header Sticky Compacto

```html
<div class="flex items-center bg-gray-900 p-4 pb-2 justify-between sticky top-0 z-50 border-b border-gray-800">
    <!-- Avatar + Saudação -->
    <div class="flex items-center gap-3">
        <div class="relative">
            <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 h-10 border-2 border-orange-500"
                 style="background-image: url('/escudos/default.png');">
            </div>
            <!-- Badge PRO (opcional) -->
            <span class="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                Pro
            </span>
        </div>
        <div>
            <p class="text-gray-400 text-[10px] font-medium uppercase tracking-wider leading-tight">
                Seja bem-vindo
            </p>
            <h2 class="font-russo text-lg text-white leading-tight tracking-tight">
                Olá, João
            </h2>
        </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
        <button class="flex w-10 h-10 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors active-scale">
            <span class="material-icons text-xl">search</span>
        </button>
        <button class="relative flex w-10 h-10 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors active-scale">
            <span class="material-icons text-xl">notifications</span>
            <!-- Badge de avisos não lidos (condicional) -->
            <span class="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-orange-500 badge-pulse"></span>
        </button>
    </div>
</div>
```

---

## 🎯 Seção Avisos - Container Completo

```html
<div class="mt-4 animate-fade-in-up">
    <!-- Header da seção -->
    <div class="flex items-center justify-between px-4 mb-3">
        <h3 class="font-russo text-lg text-white uppercase tracking-tight flex items-center gap-2">
            <span class="material-icons text-orange-500">notifications_active</span>
            Avisos
        </h3>
        <a href="/participante/avisos" class="text-orange-500 text-sm font-bold hover:text-orange-400 transition-colors flex items-center gap-1">
            Ver todos
            <span class="material-icons text-base">arrow_forward</span>
        </a>
    </div>

    <!-- Scroll horizontal -->
    <div class="flex overflow-x-auto hide-scrollbar px-4 gap-4 snap-x pb-2">
        <!-- Cards de aviso aqui (usar templates acima) -->
        <!-- Card 1 -->
        <div class="flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 border-green-500 snap-start">
            <!-- ... -->
        </div>
        <!-- Card 2 -->
        <!-- Card 3 -->
        <!-- Card 4 -->
        <!-- Card 5 -->
    </div>

    <!-- Empty state (se não houver avisos) -->
    <div class="px-4 py-8 text-center hidden" id="avisosEmptyState">
        <span class="material-icons text-5xl text-gray-700 mb-2">notifications_off</span>
        <p class="text-gray-500 text-sm">Nenhum aviso no momento</p>
    </div>
</div>
```

---

## 🔄 JavaScript - Renderizar Avisos Dinamicamente

```javascript
// =====================================================================
// PARTICIPANTE-AVISOS.JS - Módulo de renderização de avisos
// =====================================================================

/**
 * Renderizar lista de avisos na home
 */
async function renderizarAvisosHome() {
    const container = document.getElementById('avisosContainer');
    const emptyState = document.getElementById('avisosEmptyState');

    if (!container) return;

    try {
        // Buscar avisos da API
        const ligaId = window.participanteAuth.ligaId;
        const timeId = window.participanteAuth.timeId;

        const response = await fetch(`/api/avisos?ligaId=${ligaId}&timeId=${timeId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao carregar avisos');
        }

        const avisos = data.avisos || [];

        // Se não tem avisos, mostrar empty state
        if (avisos.length === 0) {
            container.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        // Renderizar cards
        container.innerHTML = avisos.map(aviso => gerarCardAviso(aviso)).join('');
        container.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');

        // Adicionar listeners de clique (marcar como lido)
        document.querySelectorAll('.aviso-card').forEach(card => {
            card.addEventListener('click', function() {
                const avisoId = this.dataset.avisoId;
                marcarComoLido(avisoId);
            });
        });

    } catch (erro) {
        console.error('[AVISOS] Erro ao renderizar:', erro);
        if (emptyState) emptyState.classList.remove('hidden');
    }
}

/**
 * Gerar HTML do card de aviso
 */
function gerarCardAviso(aviso) {
    const { _id, titulo, mensagem, categoria, lido } = aviso;

    // Cores por categoria
    const cores = {
        success: { border: 'border-green-500', icon: 'text-green-500', iconName: 'check_circle' },
        warning: { border: 'border-yellow-500', icon: 'text-yellow-500', iconName: 'warning' },
        info: { border: 'border-blue-500', icon: 'text-blue-500', iconName: 'info' },
        urgent: { border: 'border-red-500', icon: 'text-red-500', iconName: 'error' }
    };

    const cor = cores[categoria] || cores.info;
    const opacidade = lido ? 'opacity-60' : '';
    const animacao = categoria === 'urgent' && !lido ? 'animate-pulse' : '';

    return `
        <div class="aviso-card flex min-w-[240px] flex-col gap-3 rounded-xl bg-gray-800 p-4 border-l-4 ${cor.border} snap-start hover:shadow-lg transition-shadow cursor-pointer ${opacidade} ${animacao}"
             data-aviso-id="${_id}">
            <div class="flex items-center gap-2">
                <span class="material-icons ${cor.icon} text-lg">${cor.iconName}</span>
                <p class="font-russo text-sm uppercase text-white tracking-tight">${titulo}</p>
                ${!lido ? '<span class="ml-auto w-2 h-2 rounded-full bg-orange-500 badge-pulse"></span>' : ''}
            </div>
            <p class="text-gray-400 text-sm leading-snug">
                ${mensagem}
            </p>
        </div>
    `;
}

/**
 * Marcar aviso como lido
 */
async function marcarComoLido(avisoId) {
    try {
        const response = await fetch(`/api/avisos/${avisoId}/marcar-lido`, {
            method: 'POST'
        });

        if (response.ok) {
            // Atualizar badge de não lidos
            atualizarBadgeAvisos();
        }
    } catch (erro) {
        console.error('[AVISOS] Erro ao marcar como lido:', erro);
    }
}

/**
 * Atualizar badge de avisos não lidos no header
 */
async function atualizarBadgeAvisos() {
    try {
        const ligaId = window.participanteAuth.ligaId;
        const timeId = window.participanteAuth.timeId;

        const response = await fetch(`/api/avisos?ligaId=${ligaId}&timeId=${timeId}&naoLidos=true`);
        const data = await response.json();

        const badge = document.getElementById('notificationBadge');
        const quantidade = data.avisos?.length || 0;

        if (badge) {
            if (quantidade > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (erro) {
        console.error('[AVISOS] Erro ao atualizar badge:', erro);
    }
}

// Inicializar ao carregar a home
window.addEventListener('participante-home-loaded', () => {
    renderizarAvisosHome();
    atualizarBadgeAvisos();
});

// Expor funções globalmente
window.ParticipanteAvisos = {
    renderizarAvisosHome,
    marcarComoLido,
    atualizarBadgeAvisos
};
```

---

## 🎨 CSS Classes Consolidadas (TailwindCSS)

### Cores por Categoria

```css
/* Success (Verde) */
.bg-success { background-color: #10b981; }
.text-success { color: #10b981; }
.border-success { border-color: #10b981; }

/* Warning (Amarelo) */
.bg-warning { background-color: #f59e0b; }
.text-warning { color: #f59e0b; }
.border-warning { border-color: #f59e0b; }

/* Info (Azul) */
.bg-info { background-color: #3b82f6; }
.text-info { color: #3b82f6; }
.border-info { border-color: #3b82f6; }

/* Urgent (Vermelho) */
.bg-urgent { background-color: #ef4444; }
.text-urgent { color: #ef4444; }
.border-urgent { border-color: #ef4444; }
```

---

## 🚀 Testes Rápidos

### 1. Testar Card de Aviso

```html
<!-- Adicionar em qualquer página para testar visualmente -->
<div class="p-4 bg-gray-900 min-h-screen">
    <div class="flex overflow-x-auto hide-scrollbar gap-4">
        <!-- Copiar cards acima -->
    </div>
</div>
```

### 2. Testar Grid 2x2

```html
<div class="p-4 bg-gray-900 min-h-screen">
    <!-- Copiar grid completo acima -->
</div>
```

### 3. Testar Hero Card

```html
<div class="bg-gray-900 min-h-screen">
    <!-- Copiar hero card completo acima -->
</div>
```

---

## ✅ Checklist de Uso

### Ao copiar código:
- [ ] Substituir textos de exemplo por dados reais
- [ ] Verificar se Material Icons está carregado (`<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">`)
- [ ] Incluir CSS helpers no arquivo `participante.css`
- [ ] Testar em mobile (DevTools responsive mode)
- [ ] Verificar contraste de cores (WCAG AA)
- [ ] Adicionar event listeners necessários
- [ ] Testar estados vazios (empty states)

---

**Documentos relacionados:**
- `docs/SPEC-HOME-REDESIGN-2026.md` - Spec completa
- `docs/MODULO-NOTIFICADOR-ADMIN.md` - Interface admin
- `docs/VISUAL-ANTES-DEPOIS-HOME.md` - Comparação visual

**Status:** 🟢 Código pronto para uso
**Testado em:** Chrome 120+, Safari 17+, Firefox 121+

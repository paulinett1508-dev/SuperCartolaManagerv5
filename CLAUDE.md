# Super Cartola Manager - Diretrizes de Desenvolvimento

## Comandos Principais
- **Start Dev:** `npm run dev` (Nodemon + Hot Reload)
- **Start Prod:** `npm start`
- **Testes:** `npm test` (Roda todos os testes via Jest)
- **Lint:** `npm run lint` e `npm run lint:fix`
- **Consolidação Manual:** `npm run consolidar` (Processa rodadas pendentes)
- **MCP Database:** Certifique-se de que o servidor MCP está ativo (`/mcp add mongo node mongo-server.js`) para consultas seguras.

## Arquitetura e Tech Stack
- **Runtime:** Node.js (ES Modules habilitado).
- **Backend:** Express.js (MVC Pattern).
- **Database:** MongoDB + Mongoose.
- **Frontend Admin:** HTML/CSS/Vanilla JS (Desktop) - `public/fronts/`.
- **Frontend App:** Mobile-First Modular JS - `public/participante/`.
- **Auth:** Replit Auth (Admin) e Express Session (Participantes).

---

## Regras de Negócio Críticas (Cartola)

### 1. Precisão Numérica (CRÍTICO)
- Todas as exibições de pontuação e valores financeiros devem ser truncadas em **2 casas decimais** (ex: `105.40`).
- Formato brasileiro: usar **vírgula** como separador decimal na UI (`105,40`).
- Backend: usar `toFixed(2)`. Frontend: usar `.replace(".", ",")` para exibição.

### 2. Lógica de Inativos (Liga Cartoleiros)
- Para as rodadas **30 a 35**, aplica-se **EXATAMENTE** a mesma lógica de exclusão de times inativos usada nas rodadas finais (35, 37, 38).
- Inativos não rankeiam e não participam do cálculo de posições.

### 3. Formatos de Disputa por Liga

| Liga | Times | Características |
|------|-------|-----------------|
| **SuperCartola** | 32 | Regras financeiras complexas, Top 10/Bottom 10 |
| **Cartoleiros Sobral** | 6 → 4 (R30+) | Regras simplificadas, mudança temporal |

**Atenção Sobral:** A liga muda de 6 para 4 times a partir da rodada 30. O sistema deve calcular zonas de ganho/perda dinamicamente.

### 4. Consolidação de Dados
- Dados processados (`RodadaSnapshot`) são **imutáveis**.
- Nunca modificar snapshots já consolidados.

### 5. Fim de Temporada (Rodada 38)
- Quando `rodadaAtual >= 38`, a temporada é considerada encerrada.
- Use a flag `CAMPEONATO_ENCERRADO = true` nos módulos de frontend.
- **NÃO subtraia 1** da rodada quando a temporada encerrou (use R38 diretamente).

### 6. Diferenciação Financeira - Mitos/Micos (CRÍTICO)

| Conceito | Módulo | Descrição | Impacto Financeiro |
|----------|--------|-----------|-------------------|
| **Mito da Rodada** | Rodadas | 1º colocado da semana (1º de 32) | Bônus da tabela de posições (+R$20) |
| **Mico da Rodada** | Rodadas | Último colocado da semana (32º de 32) | Ônus da tabela de posições (-R$20) |
| **Top 10 Mitos** | Top 10 | Ranking histórico das 10 MAIORES pontuações do campeonato | Bônus separado (escala 1º-10º) |
| **Top 10 Micos** | Top 10 | Ranking histórico das 10 MENORES pontuações do campeonato | Ônus separado (escala 1º-10º) |

**NÃO CONFUNDIR:** Ser "Mico da Rodada" várias vezes **NÃO** significa aparecer no "Top 10 Micos". São métricas independentes.

### 7. Sistema de Zonas Financeiras (BANCO)

O sistema de posições é dividido em zonas de ganho (G) e perda (Z):

**SuperCartola (32 times) - Tabela Oficial:**

| Posição | Valor | Zona |
|---------|-------|------|
| 1º | +R$20 | G1 (MITO) |
| 2º | +R$19 | G2 |
| 3º | +R$18 | G3 |
| 4º | +R$17 | G4 |
| 5º | +R$16 | G5 |
| 6º | +R$15 | G6 |
| 7º | +R$14 | G7 |
| 8º | +R$13 | G8 |
| 9º | +R$12 | G9 |
| 10º | +R$11 | G10 |
| 11º | +R$10 | G11 |
| 12º-21º | R$0 | Neutra |
| 22º | -R$10 | Z1 |
| 23º | -R$11 | Z2 |
| 24º | -R$12 | Z3 |
| 25º | -R$13 | Z4 |
| 26º | -R$14 | Z5 |
| 27º | -R$15 | Z6 |
| 28º | -R$16 | Z7 |
| 29º | -R$17 | Z8 |
| 30º | -R$18 | Z9 |
| 31º | -R$19 | Z10 |
| 32º | -R$20 | Z11 (MICO) |

**Sobral (6 times → 4 times R30+):**
- Antes R30: G1-G3 (ganho), Z1-Z3 (perda)
- A partir R30: G1-G2 (ganho), Z1-Z2 (perda)

### 8. Cálculo de Posições (Backend)
- O endpoint `GET /api/rodadas/:ligaId/rodadas` recalcula `posicao`, `valorFinanceiro` e `totalParticipantesAtivos` em tempo real.
- Isso garante que dados legados (sem esses campos no banco) funcionem corretamente.

---

## Diretrizes de Interface (UI/UX)

### Ícones - Material Icons (OBRIGATÓRIO)
- **PROIBIDO usar Emojis** em interfaces oficiais para manter consistência visual.
- Use apenas **Material Icons** (Google) ou **Material Symbols Outlined**.
- Referência: https://fonts.google.com/icons

**Mapeamento de ícones padrão:**
| Contexto | Ícone Material | Cor |
|----------|---------------|-----|
| Mitos/Campeão | `emoji_events` ou `military_tech` | `#ffd700` (dourado) |
| Micos/Último | `thumb_down`, `dangerous` ou `sentiment_sad` | `#ef4444` (vermelho) |
| Ranking | `leaderboard` | `var(--laranja)` |
| Rodadas | `track_changes` | `var(--laranja)` |
| Mata-Mata | `swords` | `var(--laranja)` |
| Voltar | `arrow_back` | - |
| Fechar | `close` | - |
| Refresh | `refresh` | - |
| Relatórios | `assessment` ou `analytics` | - |

### Nomenclatura Padrão (OBRIGATÓRIO)

**Módulos e Competições:**
| Abreviação | Nome Completo | Usar em |
|------------|---------------|---------|
| PC | Pontos Corridos | **Sempre nome completo na UI** |
| MM | Mata-Mata | **Sempre nome completo na UI** |
| Top 10 | Top 10 Mitos/Micos | Nome completo |

**Ranking Top 10:**
- Mitos (bônus): usar "**Xº MELHOR MITO**" (ex: "1º MELHOR MITO +30,00")
- Micos (ônus): usar "**Xº PIOR MICO**" (ex: "10º PIOR MICO -12,00")

**Zonas Financeiras:**
- Primeiro lugar: "**MITO**" (não "G1" na badge principal)
- Último lugar: "**MICO**" (não "Z10" na badge principal)
- Demais posições de ganho: "**GX**" (ex: "G5 +20,00")
- Demais posições de perda: "**ZX**" (ex: "Z3 -15,00")

### Extrato Financeiro - Design de Cards (v9.1)

O módulo `participante-extrato-ui.js` renderiza o histórico financeiro por rodada com design inteligente:

**Estrutura do Card:**
```
[R38] [Badge BANCO] [Badge TOP10] [Extras Inline]  [Saldo]
```

**Componentes:**
1. **Badge BANCO** (posição na rodada):
   - 1º lugar: `MITO +20,00` (gradiente dourado)
   - Último: `MICO -20,00` (gradiente vermelho)
   - Ganho: `G5 +16,00` (gradiente verde)
   - Perda: `Z3 -12,00` (gradiente vermelho)

2. **Badge TOP10** (ranking histórico):
   - Mito: `1º MELHOR MITO +30,00` (gradiente âmbar)
   - Mico: `10º PIOR MICO -12,00` (gradiente rosa)

3. **Extras Inline** (competições):
   - `Pontos Corridos +15,00` (âmbar, texto esmeralda/rosa)
   - `Mata-Mata -10,00` (azul, texto esmeralda/rosa)

4. **Saldo Total** (à direita, sempre visível)

**Regras de Layout:**
- Layout **horizontal** com `flex-wrap` para responsividade
- Evitar redundância: se info está na badge, não repetir no breakdown
- Rodadas sem movimentação: exibir "Sem movimentação" em cinza

### Navegação - Botões "Voltar"
**REGRA IMPORTANTE:** Cada módulo deve ter **apenas UM** botão de navegação de retorno.

- **Admin (Desktop):** Usar apenas o botão "Voltar aos Módulos" na **barra superior**.
  - **NÃO adicionar** botões "Voltar aos Cards" no footer dos módulos.

- **Participante (Mobile):** O sistema de navegação está em `participante-navigation.js`.
  - Interceptação do botão hardware "Voltar" via History API (`popstate`).
  - Modal de confirmação exibido em telas raiz (Home, Bem-vindo).

### Sistema de Navegação Mobile v3.0 (CRÍTICO)

O arquivo `participante-navigation.js` v3.0 controla toda navegação entre módulos:

**Arquitetura:**
```javascript
// ❌ REMOVIDO na v3.0 - causava travamento
this._navegando = true/false; // FLAG PROBLEMÁTICA

// ✅ v3.0 - Apenas debounce por tempo (100ms)
this._ultimaNavegacao = Date.now();
this._debounceMs = 100;
```

**Por que v3.0?**
- Versões anteriores usavam flag `_navegando` para evitar cliques duplicados
- Se um módulo desse erro durante carregamento, a flag ficava `true` PARA SEMPRE
- Resultado: usuário precisava clicar 2x, 3x... ou recarregar a página
- v3.0 usa apenas debounce por tempo: simples, confiável, NUNCA trava

**Fluxo de Navegação:**
```
1. Usuário clica no botão do menu
2. Debounce: ignora se < 100ms desde último clique
3. Fetch do template HTML (fragmento)
4. innerHTML no container
5. Import dinâmico do módulo JS
6. Executa função inicializar*()
```

**Importante para DEVs:**
- Módulos JS devem exportar função `inicializar{NomeModulo}Participante()`
- Templates HTML devem ser **FRAGMENTOS** (sem `<!doctype>`, `<html>`, `<body>`)
- Erros no módulo JS são capturados e exibem tela de erro amigável

### Templates HTML - FRAGMENTOS (CRÍTICO)

Os arquivos em `public/participante/fronts/` são **FRAGMENTOS HTML**, não documentos completos.

**✅ CORRETO (Fragmento):**
```html
<!-- PARTICIPANTE EXTRATO - Template v2.0 -->
<!-- Fragmento HTML para inserção via navegação -->
<link rel="stylesheet" href="/participante/css/extrato.css" />
<style>
/* CSS inline do módulo */
</style>

<div class="extrato-container">
    <!-- Conteúdo do módulo -->
</div>
```

**❌ ERRADO (Documento completo):**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <title>Extrato</title>
</head>
<body>
    <div class="extrato-container">...</div>
</body>
</html>
```

**Por que fragmentos?**
- Navegação usa `container.innerHTML = html` para inserir conteúdo
- Documentos completos causam comportamento inesperado no DOM
- CSS pode ser inline (dentro de `<style>`) ou link externo
- JS é carregado separadamente via `import()` dinâmico

### Sistema de Loading (Mobile) - CRÍTICO
O sistema distingue **três** tipos de carregamento:

1. **Splash Screen** (`splash-screen.js` v4.0):
   - Tela de abertura completa com logo e animações.
   - Exibida **APENAS** no carregamento inicial do app (primeira visita da sessão).
   - Controlada via `sessionStorage.getItem('app_session_active')`.

2. **Reload Glass Overlay** (`index.html` inline):
   - Overlay "Vidro Fosco" com bolinha quicando.
   - **OBRIGATÓRIO** para Reload (F5) e Pull-to-Refresh.
   - CSS: `backdrop-filter: blur(15px)`, `background: rgba(20,20,20,0.5)`, `z-index: 999999`.
   - Script inline no `<body>` detecta `sessionStorage` e ativa imediatamente.
   - **NÃO** mostrar Splash Screen em reloads - apenas o overlay com blur.

3. **Loading Overlay** (`pull-refresh.js`):
   - Bolinha quicando com `backdrop-filter: blur(8px)`.
   - Usado para navegação entre módulos.
   - API global: `window.LoadingOverlay.show(texto)` / `window.LoadingOverlay.hide()`

**Regra de Ouro (UX Mobile):**
- Primeira visita → Splash Screen completa
- Reload/Pull-to-Refresh → Overlay Vidro Fosco (pula splash)
- Navegação interna → Loading Overlay simples

### Paleta de Cores (Theme)
| Variável | Cor | Uso |
|----------|-----|-----|
| `--laranja` | `#ff4500` | Primária (botões, destaques) |
| `--success` / Verde | `#10b981` | Positivo, bônus, vitória |
| `--danger` / Vermelho | `#ef4444` | Negativo, ônus, derrota |
| `--bg-card` | `#1a1a1a` | Fundo de cards (dark mode) |
| `--text-primary` | `#ffffff` | Texto principal |
| Âmbar (TOP10 Mito) | `#ffd700` / `amber-*` | Destaques dourados |
| Rosa (TOP10 Mico) | `rose-*` | Destaques negativos históricos |

**PROIBIDO:** Usar cores fora da paleta (ex: roxo `#8b5cf6` foi removido do botão "Auditar").

---

## Estrutura de Pastas Relevante
```
controllers/           # Lógica de negócio (19 arquivos)
├── fluxoFinanceiroController.js  # v7.1 - Extrato financeiro (fix MM histórico)
├── mata-mata-backend.js          # v1.1 - Cálculo server-side de MM
services/              # Integrações externas e lógica pura
models/                # Schemas do Mongoose
utils/
├── participanteHelper.js  # Gestão de inativos
└── seasonGuard.js         # Circuit breaker de temporada
public/
├── fronts/            # Templates HTML dos módulos Admin
│   ├── top10.html
│   ├── rodadas.html
│   ├── mata-mata.html
│   ├── melhor-mes.html
│   └── fluxo-financeiro.html
├── css/modules/       # CSS específico por módulo
├── js/                # JavaScript Admin (desktop)
│   └── core/
│       └── log-manager.js  # Silenciamento de logs em produção
└── participante/      # App Mobile-First
    ├── js/
    │   ├── modules/                          # ✅ TODOS com Cache-First
    │   │   ├── participante-boas-vindas.js   # v8.0 cache-first
    │   │   ├── participante-extrato.js       # v3.2 fix mata-mata
    │   │   ├── participante-extrato-ui.js    # v9.1 renderização
    │   │   ├── participante-ranking.js       # cache-first
    │   │   ├── participante-rodadas.js       # cache-first
    │   │   ├── participante-top10.js         # v4.7 cache-first
    │   │   ├── participante-pontos-corridos.js # v5.1 cache-first
    │   │   ├── participante-mata-mata.js     # v6.9 escudo placeholder
    │   │   ├── participante-artilheiro.js    # v3.7 cache-first
    │   │   ├── participante-luva-ouro.js     # v4.0 cache-first
    │   │   └── participante-melhor-mes.js    # v3.6 cache-first
    │   ├── participante-navigation.js        # v3.0 - Navegação sem travamento
    │   ├── participante-offline-cache.js     # v2.2 - IndexedDB (12 stores)
    │   ├── participante-cache-manager.js     # v2.0 - Cache 2 camadas
    │   ├── participante-refresh-button.js    # v2.1 - Botão atualizar (anti-duplicação)
    │   ├── participante-auth.js              # v2.2 - Autenticação
    │   ├── pull-refresh.js                   # v3.1 - Pull-to-refresh + Loading
    │   └── splash-screen.js                  # v4.1 - Splash Screen inicial
    ├── css/
    │   └── pull-refresh.css
    └── fronts/        # ⚠️ Templates HTML (FRAGMENTOS, não documentos completos!)
```

---

## Sistema de Cache Offline (IndexedDB) - CRÍTICO

O app mobile utiliza **cache persistente em 2 camadas** para carregamento instantâneo:

### Arquitetura de Cache

```
┌─────────────────────────────────────────────────────────────┐
│  L1 - MEMÓRIA (instantâneo, volátil)                        │
│  ├── TTL: 5 minutos                                         │
│  └── Gerenciado por: ParticipanteCache.memoryCache          │
├─────────────────────────────────────────────────────────────┤
│  L2 - IndexedDB (persistente entre sessões)                 │
│  ├── TTL: Configurável por tipo de dado                     │
│  ├── Capacidade: ~50MB (limite do navegador)                │
│  └── Gerenciado por: OfflineCache (IndexedDB)               │
└─────────────────────────────────────────────────────────────┘
```

### Arquivos do Sistema de Cache

| Arquivo | Versão | Responsabilidade |
|---------|--------|------------------|
| `participante-offline-cache.js` | v2.1 | Gerenciador IndexedDB (baixo nível) |
| `participante-cache-manager.js` | v2.0 | Cache 2 camadas (API de alto nível) |

### TTLs Configurados (`OfflineCache.STORES`)

| Store | TTL | Uso |
|-------|-----|-----|
| `participante` | 24h | Nome, escudo, liga do usuário |
| `liga` | 24h | Configurações da liga |
| `ranking` | 30min | Posições no ranking geral |
| `rodadas` | 1h | Histórico de rodadas |
| `extrato` | 30min | Saldo financeiro |
| `top10` | 1h | Top 10 Mitos/Micos |
| `pontosCorridos` | 1h | Pontos Corridos |
| `mataMata` | 1h | Mata-Mata |
| `artilheiro` | 1h | Artilheiro Campeão (v2.1) |
| `luvaOuro` | 1h | Luva de Ouro (v2.1) |
| `melhorMes` | 1h | Melhor do Mês (v2.1) |
| `config` | 24h | Configurações gerais |

### Estratégia: Cache-First + Stale-While-Revalidate

```
1ª ABERTURA (sem cache):
  Login → Auth → Splash → [Loading] → API → Renderiza → Salva IndexedDB

2ª ABERTURA EM DIANTE (instantâneo):
  Login → Auth → IndexedDB → Renderiza IMEDIATO → API atualiza em background
```

### API do ParticipanteCache (v2.0)

```javascript
// Buscar com fallback automático (cache → API)
const ranking = await ParticipanteCache.getRankingAsync(ligaId, fetchFn, onUpdate);

// Salvar (L1 + L2 automaticamente)
ParticipanteCache.setRanking(ligaId, dados);

// Verificar se tem dados para carregamento instantâneo
const hasCache = await ParticipanteCache.hasInstantData(ligaId, timeId);

// Pré-carregar dados essenciais (chamado após login)
await ParticipanteCache.preloadEssentials(ligaId, timeId);
```

### API do OfflineCache (v1.0)

```javascript
// Operações básicas
await OfflineCache.set('ranking', ligaId, dados);
const dados = await OfflineCache.get('ranking', ligaId);
const dados = await OfflineCache.get('ranking', ligaId, true); // ignoreExpiry

// Cache-first com fallback
const dados = await OfflineCache.getWithFallback('ranking', ligaId, fetchFn, onUpdate);

// Limpeza
await OfflineCache.clearStore('ranking');
await OfflineCache.clearAll();
await OfflineCache.cleanExpired(); // Manutenção automática
```

### Padrão Cache-First - TODOS os Módulos (CRÍTICO)

**TODOS** os módulos do participante implementam o padrão Cache-First para carregamento instantâneo:

| Módulo | Arquivo | Store IndexedDB |
|--------|---------|-----------------|
| Boas-Vindas | `participante-boas-vindas.js` v8.0 | `liga`, `ranking`, `rodadas` |
| Extrato | `participante-extrato.js` v3.2 | `extrato` |
| Ranking | `participante-ranking.js` | `ranking` |
| Rodadas | `participante-rodadas.js` | `rodadas` |
| Top 10 | `participante-top10.js` v4.7 | `top10` |
| Pontos Corridos | `participante-pontos-corridos.js` v5.1 | `pontosCorridos` |
| Mata-Mata | `participante-mata-mata.js` v6.9 | `mataMata` |
| Artilheiro | `participante-artilheiro.js` v3.7 | `artilheiro` |
| Luva de Ouro | `participante-luva-ouro.js` v4.0 | `luvaOuro` |
| Melhor do Mês | `participante-melhor-mes.js` v3.6 | `melhorMes` |

**Implementação padrão (copie para novos módulos):**

```javascript
async function carregarDados(ligaId, timeId) {
    const cache = window.ParticipanteCache;
    let usouCache = false;

    // =========================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (IndexedDB)
    // =========================================================
    if (cache) {
        const dadosCache = await cache.getTop10Async(ligaId); // ou outro store

        if (dadosCache && dadosCache.length > 0) {
            usouCache = true;
            renderizarDados(dadosCache); // INSTANTÂNEO!
        }
    }

    // Se não tem cache, mostrar loading
    if (!usouCache) {
        container.innerHTML = '<div class="loading-state">...</div>';
    }

    // =========================================================
    // FASE 2: ATUALIZAÇÃO EM BACKGROUND (API)
    // =========================================================
    try {
        const response = await fetch(`/api/...`);
        const dadosFresh = await response.json();

        // Salvar no cache
        if (cache) {
            cache.setTop10(ligaId, dadosFresh);
        }

        // Só re-renderiza se não usou cache (evita flicker)
        if (!usouCache) {
            renderizarDados(dadosFresh);
        }
    } catch (error) {
        if (!usouCache) mostrarErro(error.message);
    }
}
```

**Benefícios:**
- 1ª abertura: Loading normal → API → Renderiza → Salva cache
- 2ª+ abertura: **INSTANTÂNEO** (IndexedDB) → API atualiza em background

### Ordem de Carregamento (index.html)

```html
<!-- 1. LogManager -->
<script src="/js/core/log-manager.js"></script>
<!-- 2. Splash Screen -->
<script src="js/splash-screen.js"></script>
<!-- 3. IndexedDB (ANTES do cache-manager) -->
<script src="js/participante-offline-cache.js"></script>
<!-- 4. Cache Manager (usa OfflineCache) -->
<script src="js/participante-cache-manager.js"></script>
<!-- 5. Auth (salva no cache persistente) -->
<script src="js/participante-auth.js"></script>
<!-- 6. Navigation -->
<script src="js/participante-navigation.js"></script>
```

### Versionamento de Cache (Service Worker)

O Service Worker (`service-worker.js`) controla cache de assets estáticos:

```javascript
const CACHE_NAME = "super-cartola-v7"; // Incrementar a cada deploy significativo
```

Para forçar limpeza de cache em todos os clientes:
1. Incrementar `CACHE_NAME` no `service-worker.js`
2. Incrementar `FORCE_CLEAR_KEY` no `index.html` (ex: `sw_force_clear_v7`)

### Versionamento do App

Versão automática baseada na data/hora do deploy:
- **Formato:** `DD.MM.YY.HHmm` (ex: `13.12.25.1430`)
- **Endpoint:** `GET /api/app/versao`
- **Badge:** Exibido no header do app (ex: `v13.12.25.1430`)

**Modo Arquivo (Temporada Encerrada):**
- Não há modal de "nova versão disponível"
- Apenas o badge é atualizado automaticamente

---

## Regras de Código (Backend)

### Gestão de Participantes Inativos
Helper centralizado em `utils/participanteHelper.js`:
- `buscarStatusParticipantes(timeIds)` - Busca status em batch
- `obterUltimaRodadaValida(status, rodadaFim)` - Calcula última rodada válida
- `ordenarRankingComInativos(ranking, sortFn)` - Ativos primeiro, inativos depois

### Arredondamento e Precisão
```javascript
// Backend - cálculo
const valor = pontos.toFixed(2); // "105.40"

// Frontend - exibição brasileira
const valorBR = valor.replace(".", ","); // "105,40"
```

### Tratamento de Erros
Sempre envolva chamadas de API externa e Banco em `try/catch`.

### Campos Manuais (Fluxo Financeiro)
- Collection: `fluxofinanceirocampos`
- Campos manuais são buscados separadamente pelo frontend e somados ao saldo na exibição
- Não fazem parte do histórico consolidado

---

## Hardening de Produção (CRÍTICO)

### Ambientes e Scripts NPM
O sistema diferencia automaticamente entre **desenvolvimento** e **produção**:

| Script | Comando | NODE_ENV | Comportamento |
|--------|---------|----------|---------------|
| `npm run dev` | `nodemon index.js` | `development` | Logs ATIVOS, erros detalhados |
| `npm start` | `NODE_ENV=production node index.js` | `production` | Logs SILENCIADOS, erros genéricos |

**Backend (`index.js`):**
- Em produção: `console.log` e `console.info` são substituídos por funções vazias
- Erros retornam apenas `{ msg: "Erro interno", code: "INTERNAL_ERROR" }` (sem stack trace)
- Log de startup usa `originalConsole.log` para sempre aparecer

**Frontend (`public/js/core/log-manager.js` v2.0):**
- Detecta ambiente via `window.location.hostname`
- Em produção: TODOS os `console.*` são sobrescritos (`log`, `warn`, `error`, `info`, `debug`, `table`, `group`, `trace`)
- Expõe `window.__criticalLog` para erros fatais do sistema

### Circuit Breaker de Temporada (`utils/seasonGuard.js` v2.0)
Bloqueia chamadas à API externa da Globo quando a temporada está encerrada.

**Configuração:**
```javascript
// Prioridade: ENV > Default
// Para reativar em 2026: SEASON_ACTIVE=true no .env
const SEASON_FINISHED_DEFAULT = true; // Temporada 2025 encerrada
```

**Funções exportadas:**
- `isSeasonFinished()` - Retorna `true` se temporada encerrada
- `seasonBlockMiddleware` - Middleware Express que retorna 403
- `guardedApiCall(apiFn, fallbackFn, context)` - Wrapper com fallback
- `shouldUseCache()` / `shouldUseCacheForRound(rodada)` - Helpers de cache

**Rotas protegidas:**
- `routes/times-admin.js` - POST routes bloqueadas
- `routes/cartola-proxy.js` - `/mercado/status`, `/atletas/pontuados`
- `controllers/rodadaController.js` - Sincronização bloqueada
- `services/cartolaService.js` - Chamadas à API Globo

### Mobile UX - Pull-to-Refresh Nativo Desabilitado
O refresh nativo do navegador é **desabilitado** em favor do sistema customizado:

**CSS (`public/participante/css/participante.css`):**
```css
html, body {
    overscroll-behavior-y: contain; /* Mata refresh nativo */
}
```

**Fluxo customizado (`pull-refresh.js` v3.1):**
1. Usuário puxa tela para baixo → Bolinha sutil aparece
2. Ao soltar (se puxou >80px) → Ativa Overlay Vidro Fosco (`#reload-glass-overlay`)
3. Reload completo da página

---

## Restrições do Ambiente (Replit)
- Use a variável `MONGODB_URI` dos Secrets.
- Configuração de persistência de login (`.claude_auth_store`) já está ativa. Não delete a pasta.
- Para deploy, verificar se os Secrets estão configurados em **Deployments > Settings**.

---

## IDs das Ligas (Referência Rápida)

| Liga | MongoDB ID |
|------|------------|
| SuperCartola | `684cb1c8af923da7c7df51de` |
| Cartoleiros Sobral | `684d821cf1a7ae16d1f89572` |

---

## Correções Recentes (Dezembro 2025)

### RefreshButton - Prevenção de Duplicação (v2.1)

O componente `participante-refresh-button.js` agora verifica se o botão já existe antes de adicionar:

```javascript
// ✅ v2.1: Evitar duplicação
addTo(container, options = {}) {
    const existingButton = containerEl.querySelector('.refresh-button-container');
    if (existingButton) {
        return existingButton; // Não duplica
    }
    // ... criar botão
}
```

**Uso:** Chamadas múltiplas de `RefreshButton.addTo()` são seguras - não criam botões duplicados.

### Escudo Placeholder (Mata-Mata v6.9)

Quando um time não tem escudo definido, o sistema usa um **SVG placeholder** ao invés da logo do sistema:

```javascript
// ✅ v6.9: Placeholder de escudo (círculo cinza com ícone de escudo)
const ESCUDO_PLACEHOLDER = "data:image/svg+xml,%3Csvg...";

function getEscudoUrl(time) {
    const escudo = time?.url_escudo_png || time?.escudo;
    if (escudo && escudo.trim() !== '') {
        return escudo;
    }
    return ESCUDO_PLACEHOLDER;
}
```

**Arquivos afetados:** `participante-mata-mata.js` v6.9

### Mata-Mata no Extrato Financeiro (FIX CRÍTICO)

**Problema:** As transações de MATA_MATA não apareciam no extrato dos participantes.

**Causa raiz:** O cache `ExtratoFinanceiroCache` foi populado ANTES da integração do Mata-Mata. O loop de cálculo só processava rodadas NOVAS (`ultima_rodada_consolidada < rodadaNumero`), então as transações de MM nunca eram criadas.

**Solução (v7.1):** Cálculo histórico de MATA_MATA fora do loop, similar ao TOP10:

```javascript
// controllers/fluxoFinanceiroController.js v7.1

// ✅ Se cache não tem MATA_MATA, calcular retroativamente
if (!temMataMataNcache) {
    const resultadosMM = await getResultadosMataMataCompleto(ligaId, rodadaAtual);
    // Filtrar resultados do time e adicionar ao cache
}
```

**Arquivos corrigidos:**
| Arquivo | Versão | Alteração |
|---------|--------|-----------|
| `fluxoFinanceiroController.js` | v7.0 → v7.1 | Cálculo histórico de MM fora do loop |
| `participante-extrato.js` | v3.1 → v3.2 | Detecta ausência de MM e força recálculo |

**Fluxo corrigido:**
1. Frontend detecta cache sem MM → `detectarCacheIncompleto()` retorna `true`
2. Chama endpoint de cálculo
3. Backend calcula MM retroativamente e salva no cache
4. Frontend re-renderiza com dados completos

### Admin vs Participante - Cálculos Independentes

| Aspecto | Admin (Desktop) | Participante (Mobile) |
|---------|-----------------|----------------------|
| **Onde calcula MM** | Client-side (`mata-mata-financeiro.js`) | Server-side (`mata-mata-backend.js`) |
| **Cache** | `localStorage` + memória | `ExtratoFinanceiroCache` (MongoDB) |
| **Impacto das correções** | Nenhum (independente) | Corrigido na v7.1 |

### Edições do Mata-Mata 2025

Rodadas onde ocorrem confrontos de Mata-Mata (importante para detecção de cache incompleto):

| Edição | Rodadas | Rodada Definição |
|--------|---------|------------------|
| 1ª Edição | R2-R7 | R2 |
| 2ª Edição | R9-R14 | R9 |
| 3ª Edição | R15-R21 | R15 |
| 4ª Edição | R22-R26 | R21 |
| 5ª Edição | R31-R35 | R30 |

**Valores financeiros:** Vitória = +R$10 | Derrota = -R$10

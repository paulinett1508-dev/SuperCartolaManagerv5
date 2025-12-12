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

## Regras de Negócio Críticas (Cartola)
1.  **Precisão Numérica (CRÍTICO):**
    - Todas as exibições de pontuação e valores financeiros devem ser truncadas em **2 casas decimais** (ex: `105.40`). Nunca exiba dízimas longas.
2.  **Lógica de Inativos (Liga Cartoleiros):**
    - Para as rodadas **30 a 35**, deve-se aplicar **EXATAMENTE** a mesma lógica de exclusão de times inativos usada nas rodadas finais (35, 37, 38). Inativos não rankeiam.
3.  **Formatos de Disputa:**
    - *SuperCartola:* 32 times, regras financeiras complexas.
    - *Cartoleiros Sobral:* 6 times, regras simplificadas.
    - *Mitos/Micos:* Top 10 e Bottom 10. (Atenção: O join de times deve ser feito via `lookup` robusto para evitar nomes "N/D").
4.  **Consolidação:** Dados processados (`RodadaSnapshot`) são imutáveis.
5.  **Fim de Temporada (Rodada 38):**
    - Quando `rodadaAtual >= 38`, a temporada é considerada encerrada.
    - Use a flag `CAMPEONATO_ENCERRADO = true` nos módulos de frontend.
    - **NÃO subtraia 1** da rodada quando a temporada encerrou (use R38 diretamente).
6.  **Diferenciação Financeira - Mitos/Micos (CRÍTICO):**
    - **"Mico da Rodada"** (módulo Rodadas) = Último colocado da semana (32º de 32). Aplica ônus da tabela de posições (-R$20).
    - **"Top 10 Micos"** (módulo Top 10) = Ranking histórico das 10 MENORES pontuações do campeonato inteiro. Aplica ônus de bônus/ônus separado.
    - **NÃO CONFUNDIR:** Ser "Mico da Rodada" várias vezes **NÃO** significa aparecer no "Top 10 Micos". São métricas independentes.
    - Exemplo: Um time pode ser último (mico) em 5 rodadas, mas suas pontuações baixas podem não estar entre as 10 piores do campeonato.
7.  **Cálculo de Posições (Backend):**
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
| Micos/Último | `thumb_down` ou `dangerous` | `#ef4444` (vermelho) |
| Ranking | `leaderboard` | `var(--laranja)` |
| Rodadas | `track_changes` | `var(--laranja)` |
| Mata-Mata | `swords` | `var(--laranja)` |
| Voltar | `arrow_back` | - |
| Fechar | `close` | - |
| Refresh | `refresh` | - |
| Relatórios | `assessment` ou `analytics` | - |

### Navegação - Botões "Voltar"
**REGRA IMPORTANTE:** Cada módulo deve ter **apenas UM** botão de navegação de retorno.

- **Admin (Desktop):** Usar apenas o botão "Voltar aos Módulos" na **barra superior**.
  - **NÃO adicionar** botões "Voltar aos Cards" no footer dos módulos.
  - Módulos já limpos: `top10.html`, `fluxo-financeiro.html`, `melhor-mes.html`, `mata-mata.html`

- **Participante (Mobile):** O sistema de navegação está em `participante-navigation.js`.
  - Interceptação do botão hardware "Voltar" via History API (`popstate`).
  - Modal de confirmação exibido em telas raiz (Home, Bem-vindo).

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

**PROIBIDO:** Usar cores fora da paleta (ex: roxo `#8b5cf6` foi removido do botão "Auditar").

---

## Estrutura de Pastas Relevante
```
controllers/           # Lógica de negócio (19 arquivos)
services/              # Integrações externas e lógica pura
models/                # Schemas do Mongoose
public/
├── fronts/            # Templates HTML dos módulos Admin
│   ├── top10.html
│   ├── rodadas.html
│   ├── mata-mata.html
│   ├── melhor-mes.html
│   └── fluxo-financeiro.html
├── css/modules/       # CSS específico por módulo
├── js/                # JavaScript Admin (desktop)
└── participante/      # App Mobile-First
    ├── js/
    │   ├── modules/   # Módulos lazy-loaded
    │   ├── participante-navigation.js  # Sistema de navegação + History API
    │   ├── pull-refresh.js             # Pull-to-refresh + Loading Overlay
    │   └── splash-screen.js            # Splash Screen inicial
    ├── css/
    │   └── pull-refresh.css            # Estilos do loading overlay
    └── fronts/        # Templates HTML dos módulos
```

---

## Regras de Código (Backend)

### Gestão de Participantes Inativos
Helper centralizado em `utils/participanteHelper.js`:
- `buscarStatusParticipantes(timeIds)` - Busca status em batch
- `obterUltimaRodadaValida(status, rodadaFim)` - Calcula última rodada válida
- `ordenarRankingComInativos(ranking, sortFn)` - Ativos primeiro, inativos depois

### Arredondamento e Precisão
Usar `toFixed(2)` para exibição de valores numéricos:
```javascript
const pontosFormatados = pontos.toFixed(2); // "105.40"
```

### Tratamento de Erros
Sempre envolva chamadas de API externa e Banco em `try/catch`.

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

**Overlay Vidro Fosco:**
- `backdrop-filter: blur(15px)`
- `background: rgba(20,20,20,0.5)`
- `z-index: 999999`
- Bolinha quicando centralizada

---

## Restrições do Ambiente (Replit)
- Use a variável `MONGODB_URI` dos Secrets.
- Configuração de persistência de login (`.claude_auth_store`) já está ativa. Não delete a pasta.
- Para deploy, verificar se os Secrets estão configurados em **Deployments > Settings**.
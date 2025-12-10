# 🧬 DNA DO PROJETO: super-cartola-manager

> Documentação gerada automaticamente em 10/12/2025, 11:00:17
> Este documento deve ser consultado ANTES de qualquer alteração no código

---

## 📋 ÍNDICE

1. [O Que É Este Sistema](#-o-que-é-este-sistema)
2. [Modos de Operação](#-modos-de-operação)
3. [Quick Start](#-quick-start)
4. [Stack Tecnológica](#-stack-tecnológica)
5. [Arquitetura](#-arquitetura)
6. [Fluxo de Dados](#-fluxo-de-dados)
7. [API Routes](#-api-routes)
8. [Design System](#-design-system)
9. [Componentes](#-componentes)
10. [Pontos Críticos](#-pontos-críticos)
11. [Débitos Técnicos](#-débitos-técnicos)
12. [Regras de Ouro](#-regras-de-ouro)

---

## 🎯 O QUE É ESTE SISTEMA

### Resumo Executivo

| Atributo | Descrição |
|----------|-----------|
| **Nome** | super-cartola-manager |
| **Tipo** | API Backend |
| **Domínio** | Esportes/Fantasy Game |
| **Stack** | Express.js, MongoDB, REST API |

### Funcionalidades Principais
- ✅ Times
- ✅ Configurações
- ✅ Relatórios
- ✅ Rodadas
- ✅ Ligas
- ✅ Usuários
- ✅ Financeiro
- ✅ Estatísticas
- ✅ Notificações
- ✅ Gols

---

## 🎭 MODOS DE OPERAÇÃO

### 👤 MODO APP (Participante)

**Descrição:** Aplicativo do usuário final com 55 módulos. Funcionalidades: Times, Configurações, Relatórios, Rodadas, Ligas.

**Path base:** `public/css/app`

**Funcionalidades:**
- Times
- Configurações
- Relatórios
- Rodadas
- Ligas
- Usuários
- Financeiro
- Estatísticas
- Notificações
- Gols
- Mata-Mata
- Ranking
- Autenticação
- Escalação
- Dashboard

**Módulos Detectados:**
| Módulo | Arquivo | Tipo |
|--------|---------|------|
| Pasted  GET https super cartola manager paulinett replit app a 1765115521580 | `attached_assets/Pasted--GET-https-super-cartola-manager-paulinett-replit-app-a_1765115521580.txt` | arquivo |
| Pasted  TAREFA PADRONIZA O DE M DULOS DO APP PARTICIPANTE CONT 1765152576370 | `attached_assets/Pasted--TAREFA-PADRONIZA-O-DE-M-DULOS-DO-APP-PARTICIPANTE-CONT_1765152576370.txt` | arquivo |
| App Version | `config/appVersion.js` | arquivo |
| Status | `controllers/participanteStatusController.js` | controller |
| Corrigir participante 1926323 | `corrigir-participante-1926323.js` | arquivo |
| Debug participante 1926323 | `debug-participante-1926323.js` | arquivo |
| App version | `public/css/app/app-version.css` | estilo |
| Gerir senhas participantes | `public/css/gerir-senhas-participantes.css` | estilo |
| S | `public/css/modules/participantes.css` | módulo JS |
| Fluxo financeiro participante | `public/js/fluxo-financeiro/fluxo-financeiro-participante.js` | arquivo |
| S fix.js | `public/js/participantes-fix.js.bak` | arquivo |
| DESIGN SYSTEM | `public/participante/DESIGN_SYSTEM.md` | arquivo |
| Boas vindas | `public/participante/css/boas-vindas.css` | estilo |
| Splash screen | `public/participante/css/splash-screen.css` | estilo |
| Artilheiro | `public/participante/fronts/artilheiro.html` | template |

### 📊 Diagrama de Modos

```
┌─────────────────────────────────────────────────────────────┐
│                        SISTEMA                              │
├─────────────────────────────┬───────────────────────────────┤
│                    👤 MODO APP                             │
│                    Path: public/css/app               │
├─────────────────────────────┴───────────────────────────────┤
│                     🔧 BACKEND (API)                        │
│                     134 rotas detectadas                       │
│                     MongoDB + Express                       │
└─────────────────────────────────────────────────────────────┘
```


---

## 🚀 QUICK START

### Instalação
```bash
npm install
```

### Variáveis de Ambiente
Crie um arquivo `.env` com as seguintes variáveis:
```env
MONGODB_URI=
ADMIN_EMAILS=
BASE_URL=
NODE_ENV=
REPL_SLUG=
REPL_OWNER=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ISSUER_URL=
REPL_ID=
PORT=
SESSION_SECRET=
API_URL=
LIGA_ID_PRINCIPAL=
```

### Executar
```bash
npm run dev
```

### Entry Points
- **backend:** `index.js`
- **frontend:** `public/index.html`
- **participante:** `public/participante/index.html`

---

## 🛠️ STACK TECNOLÓGICA

### Dependências Principais
- @babel/parser
- @babel/traverse
- axios
- connect-mongo
- cors
- dotenv
- express
- express-session
- googleapis
- memoizee
- mongodb
- mongoose
- node-cache
- node-fetch
- openid-client

### DevDependencies
- eslint
- jest
- nodemon

---

## 🏗️ ARQUITETURA

### Estatísticas
| Métrica | Valor |
|---------|-------|
| Total de arquivos | 314 |
| Tamanho total | 6585 KB |
| Módulos Frontend | 96 |
| Módulos Backend | 46 |
| Rotas API | 134 |

### Distribuição por Tipo
| .js | 192 |
| .html | 45 |
| .css | 24 |
| .png | 20 |
| .json | 13 |
| .md | 11 |
| .txt | 4 |
| .cjs | 2 |
| .ico | 1 |
| .bak | 1 |

### Estrutura de Pastas
```
📁 attached_assets/
📁 backups/
📁 config/
📁 controllers/
📁 middleware/
📁 models/
📁 public/
  📁 css/
    📁 app/
    📁 modules/
  📁 escudos/
  📁 fronts/
  📁 img/
  📁 js/
    📁 app/
    📁 artilheiro-campeao/
    📁 core/
    📁 ferramentas/
    📁 fluxo-financeiro/
    📁 luva-de-ouro/
    📁 mata-mata/
    📁 melhor-mes/
    📁 pontos-corridos/
    📁 rodadas/
  📁 participante/
    📁 css/
    📁 fronts/
    📁 js/
      📁 modules/
  📁 templates/
  ... e mais 4 pastas
```

---

## 🔗 FLUXO DE DADOS

### Frontend → Backend
**public/js/app/app-version.js** chama:
  - `/api/app/versao`

**public/js/artilheiro-campeao/artilheiro-campeao-core.js** chama:
  - `/api/artilheiro-campeao`
  - `/api/ligas/${ligaId}/times`
  - `/api/ligas/${ligaId}/participantes`
  - `/api/ligas/${ligaId}`

**public/js/artilheiro-campeao/artilheiro-campeao-detector.js** chama:
  - `/api/cartola/mercado/status`
  - `/api/configuracao/rodada-atual`
  - `/api/artilheiro-campeao/${ligaId}/detectar-rodada`

**public/js/artilheiro-campeao/artilheiro-campeao-scheduler.js** chama:
  - `/api/cartola/mercado/status`
  - `/api/artilheiro-campeao/${ligaId}/coletar/${rodadaFinalizada}`
  - `/api/artilheiro-campeao/${ligaId}/coletar/${rodadaAlvo}`
  - `/api/artilheiro-campeao/${ligaId}/ranking?inicio=1&fim=${rodadaFim}`

**public/js/artilheiro-campeao.js** chama:
  - `/api/times/batch/status`
  - `/api/artilheiro-campeao/${ligaId}/ranking`
  - `/api/artilheiro-campeao/${ligaId}/detectar-rodada`

**public/js/core/api-client.js** chama:
  - `/api/times/${timeId}`
  - `/api/cartola/time/${timeId}`
  - `/api/ligas`
  - `/api/ligas/${ligaId}`
  - `/api/ligas/${ligaId}/times`

**public/js/core/cache-manager.js** chama:
  - `/api/times/batch`

**public/js/criar-liga.js** chama:
  - `/api/times/${timeId}`
  - `/api/ligas`

**public/js/detalhe-liga-orquestrador.js** chama:
  - `/api/ligas`
  - `/api/ligas/${ligaId}`

**public/js/detalhe-liga.js** chama:
  - `/api/ligas/${ligaId}`

**public/js/editar-liga.js** chama:
  - `/api/cartola/clubes`
  - `/api/cartola/time/${id}`
  - `/api/ligas/${this.ligaId}`
  - `/api/ligas/${this.ligaId}/times`
  - `/api/ligas/${this.ligaId}/times`

**public/js/ferramentas/ferramentas-cache-admin.js** chama:
  - `/api/extrato-cache/${ligaId}/stats`
  - `/api/extrato-cache/${ligaId}/cache`
  - `/api/extrato-cache/${ligaId}/cache`
  - `/api/ligas/${ligaId}`
  - `/api/fluxo-financeiro/extrato/${ligaId}/${timeId}/calcular?force=true`

**public/js/ferramentas/ferramentas-core.js** chama:
  - `/api/ligas`
  - `/api/configuracoes`

**public/js/filtro-liga-especial.js** chama:
  - `/api/ligas/${ligaId}/times`

**public/js/fluxo-financeiro/fluxo-financeiro-api.js** chama:
  - `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}`
  - `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}`
  - `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}`
  - `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}/campo/${campoIndex}`
  - `${API_BASE_URL}/api/fluxo-financeiro/${ligaId}/times/${timeId}/reset`

---

## 🛣️ API ROUTES


| Método | Path | Arquivo |
|--------|------|---------|
| `GET` | `/test` | routes/admin-auth.js |
| `GET` | `/session` | routes/admin-auth.js |
| `POST` | `/logout` | routes/admin-auth.js |
| `GET` | `/check` | routes/admin-auth.js |
| `GET` | `/versao` | routes/appVersionRoutes.js |
| `GET` | `/:ligaId/ranking` | routes/artilheiro-campeao-routes.js |
| `GET` | `/:ligaId/detectar-rodada` | routes/artilheiro-campeao-routes.js |
| `GET` | `/:ligaId/estatisticas` | routes/artilheiro-campeao-routes.js |
| `GET` | `/:ligaId/participantes` | routes/artilheiro-campeao-routes.js |
| `POST` | `/:ligaId/consolidar/:rodada` | routes/artilheiro-campeao-routes.js |
| `POST` | `/:ligaId/coletar/:rodada` | routes/artilheiro-campeao-routes.js |
| `GET` | `/:ligaId/acumulado` | routes/artilheiro-campeao-routes.js |
| `GET` | `/:ligaId/modulo/:moduloNome/cache` | routes/cache-universal-routes.js |
| `GET` | `/liga/:ligaId` | routes/cartola-proxy.js |
| `GET` | `/mercado/status` | routes/cartola-proxy.js |
| `GET` | `/atletas/pontuados` | routes/cartola-proxy.js |
| `GET` | `/time/id/:timeId/:rodada` | routes/cartola-proxy.js |
| `GET` | `/atletas/mercado` | routes/cartola-proxy.js |
| `GET` | `/clubes` | routes/cartola.js |
| `GET` | `/time/:id` | routes/cartola.js |
| `GET` | `/time/:id/:rodada` | routes/cartola.js |
| `GET` | `/time/:id/:rodada/escalacao` | routes/cartola.js |
| `GET` | `/mercado-status` | routes/cartola.js |
| `GET` | `/status` | routes/cartola.js |
| `GET` | `/version` | routes/cartola.js |
| `GET` | `/rodada-atual` | routes/configuracao-routes.js |
| `GET` | `/total-rodadas` | routes/configuracao-routes.js |
| `GET` | `/rodadas-info` | routes/configuracao-routes.js |
| `GET` | `/status-sistema` | routes/configuracao-routes.js |
| `POST` | `/limpar-cache` | routes/configuracao-routes.js |

*... e mais 104 rotas*


---

## 🎨 DESIGN SYSTEM

### CSS Variables

```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #2a2a2a;
  --bg-card: #1e1e1e;
  --bg-card-hover: #252525;
  --text-primary: #ffffff;
  --text-secondary: #e0e0e0;
  --text-muted: #a0a0a0;
  --text-dark: #606060;
  --laranja: #FF4500;
  --laranja-dark: #E8472B;
  --border-primary: #333333;
  --gradient-primary: linear-gradient(135deg, var(--laranja) 0%, var(--laranja-dark) 100%);
  --gradient-secondary: linear-gradient(135deg, #ff6347 0%, #ff7f50 100%);
  --success: #22c55e;
  --danger: #ef4444;
  --warning: var(--laranja);
  --info: #3b82f6;
  --bv-primary: #ff5c00;
  --bv-primary-light: rgba(255, 92, 0, 0.1);
  --bv-primary-border: rgba(255, 92, 0, 0.2);
  --bv-background: #101010;
  --bv-surface: #1c1c1c;
  --bv-surface-light: #2a2a2a;
  --bv-text-primary: #ffffff;
  --bv-text-secondary: rgba(255, 255, 255, 0.7);
  --bv-text-muted: rgba(255, 255, 255, 0.5);
  --bv-success: #22c55e;
  --bv-success-bg: rgba(34, 197, 94, 0.1);
  --bv-danger: #ef4444;
}
```


### Cores
**Primárias/Accent:**
- `--bg-primary: #0a0a0a`
- `--text-primary: #ffffff`
- `--border-primary: rgba(255, 69, 0, 0.3)`
- `--gradient-primary: linear-gradient(135deg, #ff4500 0%, #e8472b 100%)`
- `--bv-primary: #ff5c00`
- `--bv-primary-light: rgba(255, 92, 0, 0.1)`
- `--bv-primary-border: rgba(255, 92, 0, 0.2)`
- `--bv-text-primary: #ffffff`

**Backgrounds:**
- `#1a1a2e`
- `#16213e`
- `#fff`
- `#4CAF50`
- `rgba(255,255,255,0.1)`
- `#888`
- `rgba(0,0,0,0.2)`
- `#aaa`

**Texto:**
- `--text-secondary: #e0e0e0`
- `--text-muted: #a0a0a0`
- `--text-dark: #666666`
- `--bv-text-secondary: rgba(255, 255, 255, 0.7)`
- `--bv-text-muted: rgba(255, 255, 255, 0.5)`
- `--rank-text: #ffffff`

### Tipografia
**Fontes:**
- -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- monospace
- 'Fira Code', monospace
- "JetBrains Mono", monospace
- "Inter", sans-serif

**Tamanhos:**
`2em`, `0.5em`, `1.3em`, `0.75em`, `1.8em`, `0.85em`, `1em`, `0.9em`, `0.95em`, `0.8em`

**Pesos:**
`600`, `bold`, `500`, `700`, `900`, `700 !important`

### Espaçamento
**Paddings comuns:**
`0`, `20px`, `4px 12px`, `24px`, `15px`, `12px`, `10px`, `12px 20px`, `8px`, `2px 8px`

**Gaps comuns:**
`20px`, `10px`, `8px`, `15px`, `12px`, `16px`, `5px`, `1px`

### Breakpoints (Responsividade)
- `undefined`
- `max-width: 1399px`
- `max-width: 1023px`

### Border Radius
`20px`, `16px`, `8px`, `4px`, `12px`, `50%`, `24px`, `10px`

### Shadows
- `var(--shadow-lg)`
- `var(--shadow-glow)`
- `0 0 0 3px var(--laranja-alpha)`
- `var(--shadow-orange)`
- `0 8px 32px rgba(255, 69, 0, 0.5)`

### Transições
- `all 0.2s`
- `width 0.3s`
- `all 0.3s ease`
- `width 0.5s ease`
- `left 0.5s ease`
- `opacity 0.3s ease`

### Z-Index
`0`, `1`, `99999`, `10`, `5`, `9999`, `10000`, `100`

### Ícones
**Biblioteca:** `material-symbols-outlined`

**Ícones utilizados:**
`arrow_back`, `emoji_events`, `flag`, `check_circle`, `info`, `leaderboard`, `schedule`, `admin_panel_settings`, `login`, `person`, `swords`, `expand_more`, `error`, `sports_soccer`, `share`, `calendar_month`, `groups`, `calendar_today`, `insights`, `sentiment_very_dissatisfied`, `construction`, `analytics`, `close`, `pontos`, `more_vert`, `logout`, `badge`, `lock`, `visibility_off`, `engineering`

---

## 🧩 COMPONENTES


| Seletor | Arquivo |
|---------|---------|
| `.liga-card` | public/admin-consolidacao.html |
| `.liga-header` | public/admin-consolidacao.html |
| `.form-row` | public/admin-consolidacao.html |
| `.form-group` | public/admin-consolidacao.html |
| `.btn-group` | public/admin-consolidacao.html |
| `.btn` | public/admin-consolidacao.html |
| `.btn-primary` | public/admin-consolidacao.html |
| `.btn-secondary` | public/admin-consolidacao.html |
| `.btn-warning` | public/admin-consolidacao.html |
| `.btn-danger` | public/admin-consolidacao.html |
| `.rodadas-table` | public/admin-consolidacao.html |
| `.admin-header` | public/admin.html |
| `.form-group` | public/admin.html |
| `.form-row` | public/admin.html |
| `.form-label` | public/admin.html |
| `.form-input` | public/admin.html |
| `.checkbox-input` | public/admin.html |
| `.action-buttons` | public/admin.html |
| `.btn-primary` | public/admin.html |
| `.btn-secondary` | public/admin.html |


---

## ⚠️ PONTOS CRÍTICOS

### Arquivos Mais Importados (NÃO ALTERAR SEM CUIDADO)
- `mongoose` (usado por 47 arquivos)
- `express` (usado por 25 arquivos)
- `dotenv` (usado por 13 arquivos)
- `../models/Rodada.js` (usado por 12 arquivos)
- `fs` (usado por 10 arquivos)
- `node-fetch` (usado por 10 arquivos)
- `../models/Liga.js` (usado por 10 arquivos)
- `path` (usado por 9 arquivos)
- `../models/Time.js` (usado por 6 arquivos)
- `url` (usado por 5 arquivos)

### Módulos Core do Sistema
- `routes/appVersionRoutes.js`
- `routes/configuracao-routes.js`

### Funções Globais (window.*)
- `window.AppVersion (public/js/app/app-version.js)`
- `window.ArtilheiroCore (public/js/artilheiro-campeao/artilheiro-campeao-core.js)`
- `window.RodadaDetector (public/js/artilheiro-campeao/artilheiro-campeao-detector.js)`
- `window.ArtilheiroScheduler (public/js/artilheiro-campeao/artilheiro-campeao-scheduler.js)`
- `window._dadosArtilheiros (public/js/artilheiro-campeao/artilheiro-campeao-ui.js)`
- `window.ArtilheiroUI (public/js/artilheiro-campeao/artilheiro-campeao-ui.js)`
- `window.calcularSaldoGols (public/js/artilheiro-campeao/artilheiro-campeao-utils.js)`
- `window.formatarSaldoGols (public/js/artilheiro-campeao/artilheiro-campeao-utils.js)`
- `window.ArtilheiroUtils (public/js/artilheiro-campeao/artilheiro-campeao-utils.js)`
- `window.ArtilheiroCampeao (public/js/artilheiro-campeao.js)`
- `window.coordinator (public/js/artilheiro-campeao.js)`
- `window.inicializarArtilheiroCampeao (public/js/artilheiro-campeao.js)`
- `window.voltarParaCards (public/js/cards-condicionais.js)`
- `window.voltarParaCards (public/js/cards-condicionais.js)`
- `window.cardsCondicionais (public/js/cards-condicionais.js)`

---

## 📋 DÉBITOS TÉCNICOS


| Tipo | Arquivo | Linha | Descrição |
|------|---------|-------|-----------|
| TODO | public/js/fluxo-financeiro/fluxo-financeiro-auditoria.js | 1140 | Implementar com jsPDF ou similar |
| TODO | public/js/fluxo-financeiro/fluxo-financeiro-auditoria.js | 1145 | Implementar com SheetJS ou similar |



---

## 🏆 REGRAS DE OURO

### Antes de Alterar Qualquer Arquivo:
1. **SOLICITAR** o arquivo original completo
2. **ANALISAR** linha por linha
3. **IDENTIFICAR** todas as dependências
4. **VERIFICAR** quais arquivos referenciam este
5. **SÓ ENTÃO** propor alterações mínimas

### Ao Criar Novos Componentes:
1. **USAR** as variáveis CSS existentes (`--primary`, `--bg-*`, etc.)
2. **MANTER** os border-radius padrão do projeto
3. **SEGUIR** os breakpoints existentes para responsividade
4. **UTILIZAR** a mesma biblioteca de ícones
5. **PRESERVAR** o padrão de nomenclatura de classes

### Ao Modificar APIs:
1. **VERIFICAR** quais frontends consomem o endpoint
2. **MANTER** compatibilidade retroativa
3. **DOCUMENTAR** mudanças no contrato

### ❌ NUNCA FAZER:
- Alterar arquivo sem ver o original
- Modificar IDs/classes sem verificar uso
- Remover funções sem mapear dependências
- Reescrever código que funciona
- Assumir que arquivo é independente
- Mudar cores primárias sem solicitação
- Alterar estrutura de rotas sem necessidade

---

## 🔄 ATUALIZAÇÃO

Para regenerar este documento:
```bash
node project-dna.js
```

---

*🧬 Documento gerado pelo PROJECT DNA v2.0*
*Cole este conteúdo nas instruções do projeto para manter a IA alinhada com os padrões.*
*Regenere sempre que houver mudanças estruturais significativas no projeto.*

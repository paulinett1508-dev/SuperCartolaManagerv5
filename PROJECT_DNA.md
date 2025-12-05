# 🧬 DNA DO PROJETO: super-cartola-manager

> Documentação gerada automaticamente em 05/12/2025, 19:16:26
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
- ✅ Rodadas
- ✅ Ligas
- ✅ Times
- ✅ Usuários
- ✅ Relatórios
- ✅ Estatísticas
- ✅ Configurações
- ✅ Financeiro
- ✅ Notificações
- ✅ Gols

---

## 🎭 MODOS DE OPERAÇÃO

### 👤 MODO APP (Participante)

**Descrição:** Aplicativo do usuário final com 41 módulos. Funcionalidades: Rodadas, Ligas, Times, Usuários, Relatórios.

**Path base:** `public/participante`

**Funcionalidades:**
- Rodadas
- Ligas
- Times
- Usuários
- Relatórios
- Estatísticas
- Configurações
- Financeiro
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
| Status | `controllers/participanteStatusController.js` | controller |
| Gerir senhas participantes | `public/css/gerir-senhas-participantes.css` | estilo |
| S | `public/css/modules/participantes.css` | módulo JS |
| Fluxo financeiro participante | `public/js/fluxo-financeiro/fluxo-financeiro-participante.js` | arquivo |
| S fix.js | `public/js/participantes-fix.js.bak` | arquivo |
| Boas vindas | `public/participante/css/boas-vindas.css` | estilo |
| Artilheiro | `public/participante/fronts/artilheiro.html` | template |
| Extrato | `public/participante/fronts/extrato.html` | template |
| Luva ouro | `public/participante/fronts/luva-ouro.html` | template |
| Mata mata | `public/participante/fronts/mata-mata.html` | template |
| Melhor mes | `public/participante/fronts/melhor-mes.html` | template |
| Pontos corridos | `public/participante/fronts/pontos-corridos.html` | template |
| Ranking | `public/participante/fronts/ranking.html` | template |
| Rodadas | `public/participante/fronts/rodadas.html` | template |
| Top10 | `public/participante/fronts/top10.html` | template |

### 📊 Diagrama de Modos

```
┌─────────────────────────────────────────────────────────────┐
│                        SISTEMA                              │
├─────────────────────────────┬───────────────────────────────┤
│                    👤 MODO APP                             │
│                    Path: public/participante               │
├─────────────────────────────┴───────────────────────────────┤
│                     🔧 BACKEND (API)                        │
│                     129 rotas detectadas                       │
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
NODE_ENV=
PORT=
SESSION_SECRET=
BASE_URL=
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
- mongodb
- mongoose
- node-cache
- node-fetch

### DevDependencies
- eslint
- jest
- nodemon

---

## 🏗️ ARQUITETURA

### Estatísticas
| Métrica | Valor |
|---------|-------|
| Total de arquivos | 280 |
| Tamanho total | 5958 KB |
| Módulos Frontend | 91 |
| Módulos Backend | 43 |
| Rotas API | 129 |

### Distribuição por Tipo
| .js | 176 |
| .html | 43 |
| .css | 22 |
| .png | 17 |
| .json | 12 |
| .md | 5 |
| .cjs | 2 |
| .ico | 1 |
| .bak | 1 |
| .nix | 1 |

### Estrutura de Pastas
```
📁 backups/
📁 config/
📁 controllers/
📁 middleware/
📁 models/
📁 public/
  📁 css/
    📁 modules/
  📁 escudos/
  📁 fronts/
  📁 img/
  📁 js/
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
📁 routes/
📁 scripts/
📁 services/
  ... e mais 1 pastas
```

---

## 🔗 FLUXO DE DADOS

### Frontend → Backend
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

**public/js/fluxo-financeiro/fluxo-financeiro-cache.js** chama:
  - `/api/ligas/${this.ligaId}/configuracoes`
  - `${API_BASE_URL}/api/extrato-cache/${this.ligaId}/times/${timeId}/cache`
  - `${API_BASE_URL}/api/extrato-cache/${this.ligaId}/times/${timeId}/cache`
  - `/api/cartola/mercado/status`
  - `/api/ligas/${ligaId}/times`

---

## 🛣️ API ROUTES


| Método | Path | Arquivo |
|--------|------|---------|
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
| `POST` | `/ligas/:ligaId/rodadas/:rodada/consolidar` | routes/consolidacao-routes.js |
| `POST` | `/ligas/:ligaId/consolidar-historico` | routes/consolidacao-routes.js |
| `GET` | `/ligas/:ligaId/historico-completo` | routes/consolidacao-routes.js |
| `GET` | `/ligas/:ligaId/status` | routes/consolidacao-routes.js |
| `GET` | `/:ligaId/times/:timeId/cache` | routes/extratoFinanceiroCacheRoutes.js |

*... e mais 99 rotas*


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
- "Inter", -apple-system, sans-serif

**Tamanhos:**
`2em`, `0.5em`, `1.3em`, `0.75em`, `1.8em`, `0.85em`, `1em`, `0.9em`, `0.95em`, `0.8em`

**Pesos:**
`600`, `bold`, `500`, `700`, `700 !important`, `600 !important`

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
`20px`, `16px`, `8px`, `4px`, `12px`, `50%`, `8px !important`, `6px`

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
- `all 0.3s ease !important`
- `border-color 0.2s`

### Z-Index
`10`, `5`, `9999`, `10000`, `100`, `1000`, `1`, `9998`

### Ícones
**Biblioteca:** `material-symbols-outlined`

**Ícones utilizados:**
`swords`, `expand_more`, `error`, `sports_soccer`, `emoji_events`, `share`, `menu`, `undefined`, `diff`

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
- `mongoose` (usado por 42 arquivos)
- `express` (usado por 23 arquivos)
- `fs` (usado por 10 arquivos)
- `dotenv` (usado por 10 arquivos)
- `node-fetch` (usado por 10 arquivos)
- `../models/Rodada.js` (usado por 10 arquivos)
- `path` (usado por 9 arquivos)
- `../models/Liga.js` (usado por 9 arquivos)
- `../models/Time.js` (usado por 6 arquivos)
- `url` (usado por 5 arquivos)

### Módulos Core do Sistema
- `routes/configuracao-routes.js`

### Funções Globais (window.*)
- `window.ArtilheiroCore (public/js/artilheiro-campeao/artilheiro-campeao-core.js)`
- `window.RodadaDetector (public/js/artilheiro-campeao/artilheiro-campeao-detector.js)`
- `window.ArtilheiroScheduler (public/js/artilheiro-campeao/artilheiro-campeao-scheduler.js)`
- `window._dadosArtilheiros (public/js/artilheiro-campeao/artilheiro-campeao-ui.js)`
- `window.calcularSaldoGols (public/js/artilheiro-campeao/artilheiro-campeao-utils.js)`
- `window.formatarSaldoGols (public/js/artilheiro-campeao/artilheiro-campeao-utils.js)`
- `window.ArtilheiroUtils (public/js/artilheiro-campeao/artilheiro-campeao-utils.js)`
- `window.ArtilheiroCampeao (public/js/artilheiro-campeao.js)`
- `window.coordinator (public/js/artilheiro-campeao.js)`
- `window.inicializarArtilheiroCampeao (public/js/artilheiro-campeao.js)`
- `window.cardsCondicionais (public/js/cards-condicionais.js)`
- `window.cacheManager (public/js/core/cache-manager.js)`
- `window.carregarRankingGeral (public/js/detalhe-liga-orquestrador.js)`
- `window.carregarRodadas (public/js/detalhe-liga-orquestrador.js)`
- `window.inicializarArtilheiroCampeao (public/js/detalhe-liga-orquestrador.js)`

---

## 📋 DÉBITOS TÉCNICOS

✅ Nenhum TODO/FIXME encontrado.

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

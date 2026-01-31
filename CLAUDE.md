# SUPER CARTOLA MANAGER - PROJECT RULES

## 🧠 Tech Stack & Constraints
- **Runtime:** Node.js (Replit Environment)
- **Database:** MongoDB (Native Driver)
- **Frontend:** HTML5, CSS3, Vanilla JS (ES6 Modules)
- **Styling:** TailwindCSS (via CDN)
- **Architecture:** MVC (Models, Controllers, Views/Public)

## 🎨 UI/UX Guidelines (Dark Mode First)
- **Theme:** Strict Dark Mode (`bg-gray-900`, `bg-slate-900`)
- **Text:** Primary `text-white`/`text-gray-100`, Muted `text-gray-400`
- **Components:**
  - Cards: `bg-gray-800 rounded-lg shadow-lg`
  - Buttons: Explicit feedback (hover/active states)
  - Inputs: `bg-gray-700 text-white border-gray-600`

### Tipografia
| Uso | Fonte | CSS |
|-----|-------|-----|
| Títulos, Badges, Stats | Russo One | `font-family: 'Russo One', sans-serif;` |
| Corpo de texto | Inter | `font-family: 'Inter', -apple-system, sans-serif;` |
| Valores numéricos | JetBrains Mono | `font-family: 'JetBrains Mono', monospace;` |

## 🛡️ Coding Standards
- **Idempotency:** Financial functions MUST be idempotent (prevent double-charging)
- **Safety:** Always validate `req.session.usuario` before sensitive actions
- **Error Handling:** Use `try/catch` in async controllers
- **No React/Vue:** Pure JavaScript for frontend
- **Nomenclatura em Português:** Use `autorizado` (not `authorized`), `usuario` (not `user`), `senha` (not `password`)

## 🤖 Project Skills (Agentes Especializados)

### Skills Auxiliares (12)
| Skill | Quando Usar |
|-------|-------------|
| **ai-problems-detection** | Antes de implementar: detectar overengineering, código duplicado, reinvenção da roda, falta de docs, arquivos monolíticos |
| **cartola-api** | Consultar endpoints, schemas, scouts, autenticação da API oficial do Cartola FC |
| **code-inspector** | "auditar código", "security review", "OWASP check" |
| **db-guardian** | Scripts DB, limpeza, manutenção, snapshots |
| **fact-checker** | "verifique se", "confirme que", validar informações críticas |
| **frontend-crafter** | Criar/ajustar telas, CSS, JS do cliente, navegação |
| **git-commit-push** | "git push", "commit", "suba as mudanças" |
| **league-architect** | Regras de negócio, configs de liga, cálculos |
| **Refactor-Monolith** | "refatorar arquivo grande", "separar em módulos" |
| **skill-creator** | "criar skill", "fazer skill", criar/atualizar skills customizadas |
| **skill-installer** | "instalar skill", listar e instalar skills do catálogo |
| **replit-pull** | "pull no replit", "atualizar replit", "sincronizar replit", "deploy" |
| **restart-server** | "reiniciar servidor", "restart", aplicar mudanças backend |
| **system-scribe** | "explicar módulo X", "como funciona Y?" |

### Skills do High Senior Protocol (4)
| Skill | Fase | Descrição |
|-------|------|-----------|
| **workflow** | Maestro | Detecta fase e orquestra fluxo |
| **pesquisa** | Fase 1 | Busca no codebase, gera PRD |
| **spec** | Fase 2 | Mapeia dependências, define mudanças |
| **code** | Fase 3 | Aplica mudanças linha por linha |

### Fluxo Completo
```
/workflow → FASE 1: /pesquisa → PRD.md
         → FASE 2: /spec → SPEC.md
         → FASE 3: /code → Implementado
```

**Diretório:** `.claude/docs/PRD-[nome].md` e `SPEC-[nome].md`

## 🔌 MCPs Disponíveis

### Context7 - Documentação Técnica
Busca docs sempre atualizadas de frameworks/APIs (Mongoose, Express, MDN, OWASP)
- **✅ USE:** Verificar mudanças API, security audits, implementar features novas
- **❌ NÃO USE:** Lógica de negócio interna, debug de código custom
- **Limitação:** Repositórios nicho não indexados (usar Perplexity)

### Perplexity - Pesquisa Web Inteligente
| Tool | Quando Usar |
|------|-------------|
| `perplexity_ask` | Dúvidas rápidas, info factual |
| `perplexity_search` | URLs, notícias recentes |
| `perplexity_research` | Análises extensas |
| `perplexity_reason` | Raciocínio complexo |

**Context7 vs Perplexity:**
- Docs oficiais frameworks → Context7
- API Cartola FC não-documentada → Perplexity
- Notícias últimas 48h → Perplexity

### Mongo MCP - Acesso Direto ao Banco
| Tool | Função |
|------|--------|
| `list_collections` | Listar collections |
| `find_documents` | Buscar com query JSON |
| `get_collection_schema` | Analisar estrutura |

**Quando usar:** Consultas rápidas, debug. **Não usar:** Operações destrutivas (usar scripts com `--dry-run`)

## 🎯 Slash Commands

| Comando | Descrição |
|---------|-----------|
| `/analisar [jogador]` | Análise estratégica de jogadores Cartola |
| `/audit-financa [nome]` | Auditoria financeira completa |
| `/perplexity-search [termo]` | Pesquisa inteligente últimas 24-48h |
| `/feature-scout [funcionalidade]` | Verifica se feature existe no código |
| `/html-audit [arquivo]` | QA frontend - conformidade com padrões |
| `/salvar-tarefas` | Persistir contexto entre sessões |
| `/retomar-tarefas` | Retomar trabalho da sessão anterior |
| `/newsession` | Handover para nova sessão com contexto |

## 🔄 Sistema de Renovação de Temporada

**Documentação Completa:** [`docs/SISTEMA-RENOVACAO-TEMPORADA.md`](docs/SISTEMA-RENOVACAO-TEMPORADA.md)

### Princípios
1. **Zero hardcode** - Regras configuráveis via `ligarules`
2. **Independência por liga** - Cada liga tem regras diferentes
3. **Auditoria completa** - Registro em `inscricoestemporada`
4. **Separação de temporadas** - Extratos independentes

### Collections
- `ligarules` - Regras configuráveis (taxa, prazo, parcelamento)
- `inscricoestemporada` - Registro de inscrições/renovações

### Flag `pagouInscricao`
- `true` → Taxa registrada, NÃO vira débito
- `false` → Taxa VIRA DÉBITO no extrato

## 🕐 Pré-Temporada (Conceito Crítico)

Período entre fim de temporada e início da próxima:
- **API Cartola** retorna `temporada: [ano anterior]`
- **Brasileirão** não começou (sem rodadas)
- **Participantes** podem renovar/inscrever

### Detecção
```javascript
// Frontend
const isPreTemporada = temporadaSelecionada > mercadoData.temporada;

// Backend
const preTemporada = temporada > statusMercado.temporada;
```

### Terminologia Financeira
| Termo | Descrição |
|-------|-----------|
| **Ajustes** | Campos editáveis (campo1-4) para valores extras |
| **Acertos** | Pagamentos/recebimentos que movimentam saldo |
| **Legado** | Saldo transferido da temporada anterior |
| **Inscrição** | Taxa para nova temporada |

## 🧩 Sistema de Módulos

### Estrutura de Controle
- `Liga.modulos_ativos` → On/Off simples
- `ModuleConfig` → Config granular por liga/temporada
- `participante-navigation.js` → Carrega dinamicamente

### Módulos Existentes

**Base (sempre ativos):** Extrato, Ranking, Rodadas, Hall da Fama

**Opcionais:** Top 10, Melhor Mês, Pontos Corridos, Mata-Mata, Artilheiro, Luva de Ouro, Campinho, Dicas

**Planejados 2026:** Tiro Certo, Bolão Copa & Liberta, Resta Um, Capitão de Luxo

### Estados vs Módulos (NÃO confundir)
- **Parciais** → Estado da rodada (jogos em andamento)
- **Pré-Temporada** → Condição temporal
- **Mercado Aberto/Fechado** → Estado do Cartola
- **Rodada Finalizada** → Estado consolidado

## 📊 Estrutura de Dados

### Collection "times"
**IMPORTANTE:** Sistema NÃO usa collection "users". Todos participantes em **"times"**
- Schema: `id` (Number), `nome_time`, `nome_cartoleiro`, `ativo`, `temporada`

### Tipos de ID por Collection
| Collection | Campo | Tipo | Por quê |
|------------|-------|------|---------|
| `extratofinanceirocaches` | `time_id` | Number | Performance |
| `fluxofinanceirocampos` | `timeId` | String | Flexibilidade |
| `acertofinanceiros` | `timeId` | String | Consistência |

**Mongoose faz coerção:** `String("13935277") == 13935277`

### Escudos
Localização: `/public/escudos/{clube_id}.png` (262=Flamengo, 263=Botafogo, etc.)
Fallback: `onerror="this.src='/escudos/default.png'"`

## 🔐 Sistema de Autenticação Admin

**Arquitetura:** Replit Auth (OpenID Connect)

### Ordem de Autorização (`isAdminAuthorizado()`)
1. Verifica collection `admins` no MongoDB
2. Se vazio → usa `ADMIN_EMAILS` da env
3. Se existe mas email não está → **NEGA**
4. Sem restrição → permite (dev mode)

**Rota de Debug:** `/api/admin/auth/debug`

## 🔌 Estratégia de Banco de Dados

### Configuração
- **Ambiente único:** DEV e PROD = mesmo banco MongoDB
- **Diferenciação:** Via `NODE_ENV` (logs e proteções)
- **Razão:** Dados consolidados são perpétuos

### Proteções em Scripts
```javascript
const isProd = process.env.NODE_ENV === 'production';
if (isProd && !isForced && !isDryRun) {
    console.error('❌ PROD requer --force ou --dry-run');
    process.exit(1);
}
```

### Comandos
```bash
node scripts/[script].js --dry-run  # Validar
NODE_ENV=production node scripts/[script].js --force  # Executar
```

## ⚽ Jogos do Dia (API-Football + Fallbacks)

**Documentação:** [`docs/JOGOS-DO-DIA-API.md`](docs/JOGOS-DO-DIA-API.md)

**Cobertura:** Brasileirão A/B/C/D, Copa do Brasil, TODOS Estaduais, Copinha

**Fallback:** API-Football → SoccerDataAPI → Cache Stale → Globo Esporte

**Endpoints:**
- `GET /api/jogos-ao-vivo` → Jogos do dia
- `GET /api/jogos-ao-vivo/status` → Diagnóstico APIs
- `GET /api/jogos-ao-vivo/invalidar` → Força refresh

## 📦 Sistema de Versionamento

**Propósito:** Força atualizações no app quando há mudanças
**API:** `/api/app/check-version` (versões independentes admin/app)

**Funcionamento:**
1. App verifica versão ao iniciar/voltar do background
2. Compara local vs servidor
3. Se diferente → modal obrigatório
4. Atualizar → limpa cache + reload

**Arquivos:** `config/appVersion.js`, `public/js/app/app-version.js`

## 📝 Sistema de Gestão de Ideias e Backlog

### Sistema Híbrido
- **BACKLOG.md** → Backlog central único (fonte da verdade)
- **TODOs no código** → Padrão: `// TODO-[LEVEL]: [descrição]`
- **.cursorrules** → Regras que instruem IA

### Padrões
```javascript
// TODO-CRITICAL: Bugs graves, segurança
// TODO-HIGH: Features importantes, performance
// TODO-MEDIUM: Melhorias UX, refatorações
// TODO-LOW: Nice to have
// TODO-FUTURE: Backlog distante
```

### CLI
```bash
node scripts/backlog-helper.js list      # Listar TODOs
node scripts/backlog-helper.js validate  # Validar IDs
node scripts/backlog-helper.js search "termo"  # Buscar
```

### IDs no BACKLOG
`BUG-XXX`, `SEC-XXX`, `FEAT-XXX`, `PERF-XXX`, `UX-XXX`, `REFACTOR-XXX`, `IDEA-XXX`, `NICE-XXX`, `FUTURE-XXX`

## ⚠️ Critical Rules
1. NEVER remove `gemini_audit.py`
2. NEVER break "Follow the Money" audit trail in financial controllers
3. Always check variable existence before accessing properties (avoid `undefined`)

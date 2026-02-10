# SUPER CARTOLA MANAGER - PROJECT RULES

## 🎯 PROTOCOLO DE PLANEJAMENTO OBRIGATÓRIO

**PRIORIDADE MÁXIMA - APLICÁVEL EM TODOS OS AMBIENTES (Web, Terminal, VS Code, Antigravity)**

### Regra de Ouro

**NUNCA inicie a programação ou tome decisões sem ANTES:**

1. **CRIAR UM PLANEJAMENTO COMPLETO** da tarefa solicitada
2. **LISTAR TODAS AS TAREFAS** usando `TodoWrite` tool
3. **QUESTIONAR O USUÁRIO** se o planejamento faz sentido
4. **AGUARDAR APROVAÇÃO EXPLÍCITA** antes de executar

### Fluxo Obrigatório

```
Solicitação do Usuário
    ↓
📋 FASE 1: PLANEJAMENTO
    • Analisar requisitos
    • Identificar dependências
    • Mapear riscos
    • Listar todos os passos
    ↓
✅ FASE 2: VALIDAÇÃO COM USUÁRIO
    • Apresentar plano completo
    • Questionar se faz sentido
    • Aguardar confirmação
    ↓
⚡ FASE 3: EXECUÇÃO (Modo Bypass)
    • Executar tarefas listadas
    • Marcar progresso em tempo real
    • Auto-accept edits (se configurado)
```

### Formato de Apresentação

Sempre use este template ao planejar:

```markdown
## 📋 Planejamento da Tarefa: [NOME DA TAREFA]

### Contexto
[Breve resumo do que foi solicitado]

### Análise
[O que precisa ser feito e por quê]

### Tarefas Identificadas
1. [Tarefa 1] - [Justificativa]
2. [Tarefa 2] - [Justificativa]
...

### Riscos/Considerações
- [Risco 1]
- [Risco 2]

### Arquivos Afetados
- `/caminho/arquivo1.js` - [O que será alterado]
- `/caminho/arquivo2.md` - [O que será alterado]

---

**⚠️ Este planejamento faz sentido? Posso prosseguir?**
```

### Exceções (RARAS)

Este protocolo pode ser IGNORADO apenas se:

1. **Comando explícito de bypass**: Usuário diz "execute direto", "pule o planejamento"
2. **Tarefa trivial óbvia**: Ex: "leia o arquivo X.js" (1 ação simples)
3. **Continuação de tarefa aprovada**: Já está em execução de plano validado

### Configuração Auto-accept

Se `autoAcceptEdits: true` está configurado:

- **AINDA ASSIM** faça o planejamento primeiro
- Após aprovação, execute sem pausas
- Use `TodoWrite` para mostrar progresso

### Penalidades por Violação

Se você violar este protocolo:

1. **PARE IMEDIATAMENTE** a execução
2. **DESFAÇA** mudanças se possível
3. **CRIE O PLANEJAMENTO** que deveria ter feito
4. **PEÇA DESCULPAS** e recomece corretamente

---

**🚨 ESTA REGRA É ABSOLUTA E INEGOCIÁVEL 🚨**

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

### Cores dos Módulos (Identidade Visual)
Cada módulo possui sua paleta de cores padronizada. **Sempre use variáveis CSS** (definidas em `/css/_admin-tokens.css`):

| Módulo | Cor Primária | Variável CSS | Simbolismo |
|--------|--------------|--------------|------------|
| **Artilheiro Campeão** | Verde `#22c55e` | `--module-artilheiro-primary` | Gols / Vitória |
| **Capitão de Luxo** | Roxo `#8b5cf6` | `--module-capitao-primary` | Liderança / Capitania |
| **Luva de Ouro** | Dourado `#ffd700` | `--module-luva-primary` | Luva de Ouro / Goleiros |

**Exemplo de uso:**
```css
/* Header do módulo */
.artilheiro-header {
    background: var(--gradient-artilheiro);
    border: 1px solid var(--module-artilheiro-border);
}

/* Backgrounds sutis */
.capitao-card {
    background: var(--module-capitao-muted);
}
```

**⚠️ Regra:** NUNCA use cores hardcoded (`#22c55e`) diretamente. Sempre use as variáveis CSS para manter consistência e facilitar manutenção futura.

## 🛡️ Coding Standards
- **Idempotency:** Financial functions MUST be idempotent (prevent double-charging)
- **Safety:** Always validate `req.session.usuario` before sensitive actions
- **Error Handling:** Use `try/catch` in async controllers
- **No React/Vue:** Pure JavaScript for frontend
- **Nomenclatura em Português:** Use `autorizado` (not `authorized`), `usuario` (not `user`), `senha` (not `password`)

## 🤖 Skills com Ativação por Keywords

Skills são ativadas automaticamente por **palavras-chave contextuais** em vez de nome direto.
Mapeamento completo: [`docs/skills/SKILL-KEYWORD-MAP.md`](docs/skills/SKILL-KEYWORD-MAP.md)
Documentação das skills: [`docs/skills/`](docs/skills/) (agnóstico, Markdown puro)

### Protocolo de Ativação
1. Detectar keywords na mensagem do usuário
2. Consultar [`SKILL-KEYWORD-MAP.md`](docs/skills/SKILL-KEYWORD-MAP.md) para identificar a skill
3. Carregar skill de `docs/skills/[categoria]/[skill].md`
4. Executar protocolo da skill

### Tabela Rápida - Keyword → Skill

| Quando o usuário diz... | Skill Ativada | Categoria |
|--------------------------|---------------|-----------|
| "quero criar feature", "como fazer", "por onde começar" | **workflow** | Core |
| "pesquise", "analise o código", "gere PRD" | **pesquisa** | Core |
| "especifique", "mapeie dependências", "fase 2" | **spec** | Core |
| "implemente", "aplique mudanças", "fase 3" | **code** | Core |
| "crie tela", "ajuste CSS", "layout", "componente" | **frontend-crafter** | Specialist |
| "como funciona", "explique módulo", "documente" | **system-scribe** | Specialist |
| "regra de negócio", "cálculo", "config liga" | **league-architect** | Specialist |
| "script DB", "backup", "migration", "limpeza" | **db-guardian** | Specialist |
| "auditar código", "security review", "OWASP" | **code-inspector** | Specialist |
| "git push", "commit", "suba mudanças" | **git-commit-push** | Utility |
| "reiniciar servidor", "restart" | **restart-server** | Utility |
| "pull no replit", "deploy", "sincronizar" | **replit-pull** | Utility |
| "nova sessão", "handover", "retomar" | **newsession** | Utility |
| "verifique se", "confirme que", "é verdade?" | **fact-checker** | Utility |
| "tá complexo", "duplicado", "antes de codar" | **ai-problems-detection** | Utility |
| "refatorar arquivo grande", "separar módulos" | **Refactor-Monolith** | Utility |
| "adaptar código do stitch", "html do google stitch" | **stitch-adapter** | Utility |
| "API Cartola", "endpoint", "scout", "mercado" | **cartola-api** | Project |
| "auditar cache", "cache lento", "Service Worker" | **cache-auditor** | Project |
| "auditar módulo", "checklist módulo" | **auditor-module** | Project |
| "auditar UX app", "revisar design participante", "visual do app" | **ux-auditor-app** | Project |
| "análise de branches", "comparar branches" | **analise-branches** | Project |
| "auditoria mensal", "verificar mudanças", "check context7" | **context7-monthly-audit** | Project |
| "criar skill", "skill nova" | **skill-creator** | Meta |
| "instalar skill", "listar skills" | **skill-installer** | Meta |

### High Senior Protocol (Workflow Completo)
```
workflow → FASE 1: pesquisa → PRD.md
         → FASE 2: spec → SPEC.md
         → FASE 3: code → Implementado
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

## 🎯 Slash Commands & Ativação por Keywords

Skills podem ser invocadas por `/nome` OU por keywords naturais na conversa.
As keywords ativam a mesma skill automaticamente (ver tabela acima).

| Comando Direto | Keywords Equivalentes |
|----------------|----------------------|
| `/workflow` | "como fazer feature", "por onde começar" |
| `/pesquisa` | "pesquise no código", "gere PRD" |
| `/spec` | "especifique mudanças", "mapeie dependências" |
| `/code` | "implemente", "aplique spec" |
| `/auditor-module [modulo]` | "audite o módulo X", "checklist módulo" |
| `/cache-auditor [modo]` | "auditar cache", "cache desatualizado" |
| `/ux-auditor-app` | "auditar UX do app", "revisar design participante", "visual do app tá ok?" |
| `/newsession` | "nova sessão", "salvar contexto" |
| `/liste-pr-github [período]` | "listar PRs", "PRs de hoje", "merges da semana" |

> **`/liste-pr-github`** - Lista PRs do GitHub via API. Períodos: `hoje`, `ontem`, `semana`, `mes`, `YYYY-MM-DD` ou range `YYYY-MM-DD YYYY-MM-DD`. Sem argumento lista os últimos 10.

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

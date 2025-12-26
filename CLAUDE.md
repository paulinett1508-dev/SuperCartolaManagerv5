# SUPER CARTOLA MANAGER - PROJECT RULES

## 🧠 Tech Stack & Constraints
- **Runtime:** Node.js (Replit Environment).
- **Database:** MongoDB (Native Driver).
- **Frontend:** HTML5, CSS3, Vanilla JS (ES6 Modules).
- **Styling:** TailwindCSS (via CDN).
- **Architecture:** MVC (Models, Controllers, Views/Public).

## 🎨 UI/UX Guidelines (Dark Mode First)
- **Theme:** Strict Dark Mode. Backgrounds typically `bg-gray-900` or `bg-slate-900`.
- **Text:** Primary text `text-white` or `text-gray-100`. Muted text `text-gray-400`.
- **Components:**
  - Cards: `bg-gray-800 rounded-lg shadow-lg`.
  - Buttons: Use explicit feedback (hover/active states).
  - Inputs: Remove default white backgrounds. Use `bg-gray-700 text-white border-gray-600`.

## 🛡️ Coding Standards
- **Idempotency:** All financial functions must be idempotent. Prevent double-charging or double-crediting.
- **Safety:** Always validate `req.session.usuario` before sensitive actions.
- **Error Handling:** Use `try/catch` in async controllers. Log errors clearly.
- **No React/Vue:** Stick to pure JavaScript for frontend logic to maintain simplicity.
- **Nomenclatura em Português:** O projeto usa nomes de funções/variáveis em PORTUGUÊS. Use `autorizado` (não `authorized`), `usuario` (não `user`), `senha` (não `password`). Ao criar ou modificar código, manter consistência com o idioma português para evitar typos como `isAdminAuthorizado` vs `isAdminAutorizado`.

## 🚀 Replit Specifics
- **Server:** Always verify port configuration (process.env.PORT || 5000).
- **File System:** Do not use absolute paths that assume a local Windows/Mac machine. Use relative paths suitable for Linux.

## 🤖 Project Skills (Agentes Especializados)
O projeto conta com 5 skills especializadas que podem ser invocadas para tarefas específicas:

| Skill | Descrição | Quando Usar |
|-------|-----------|-------------|
| **code-inspector** | Code Review, Debugging e Qualidade de Software | "procurar bugs", "auditar código", "corrigir erros", "melhorar qualidade" |
| **db-guardian** | Banco de Dados (MongoDB), Segurança e Migrações | Scripts de limpeza, manutenção, snapshots de temporada, gestão de acesso |
| **frontend-crafter** | Frontend Mobile-First, UX Black & Orange, Cache Offline, SPA | Criar telas, ajustar CSS, lógica JS do cliente, navegação |
| **league-architect** | Regras de Negócio, Formatos de Liga (SaaS), Lógica Financeira | Configs de liga, cálculos financeiros, regras de disputa |
| **system-scribe** | Documentador Oficial, Wiki Viva do Sistema | "explicar módulo X", "quais as regras do Y?", documentação técnica |

### Exemplos de Uso:
- "Auditar o sistema de pagamentos" → `code-inspector`
- "Criar script de migração para nova temporada" → `db-guardian`
- "Ajustar a tela de ranking no mobile" → `frontend-crafter`
- "Definir regras do mata-mata" → `league-architect`
- "Explicar como funciona o Top 10" → `system-scribe`

## 🎯 Slash Commands (Comandos Rápidos)

Comandos disponíveis para invocar diretamente:

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/analisar` | Análise estratégica de jogadores Cartola (Data-Driven) | `/analisar Gabigol` |
| `/pesquisar` | Pesquisa de notícias via Perplexity (últimas 24-48h) | `/pesquisar escalação Flamengo` |
| `/feature-scout` | Verifica se uma feature existe no código | `/feature-scout exportar PDF` |
| `/html-audit` | Auditoria de qualidade frontend (QA) - verifica conformidade com padrões | `/html-audit public/participante/fronts/perfil.html` |
| `/salvar-tarefas` | Salva tarefas pendentes antes de encerrar sessão | `/salvar-tarefas` |
| `/retomar-tarefas` | Retoma trabalho da sessão anterior | `/retomar-tarefas` |

### Detalhes dos Commands:

**`/analisar [jogador/setor]`**
- Cruza dados estatísticos para recomendar escalação
- Gera cards com Status, Potencial e Veredito (ESCALAR/OBSERVAR/VENDER)

**`/pesquisar [termo]`**
- Busca notícias de última hora sobre jogadores/times
- Foco em fontes confiáveis (setoristas, ge.globo)

**`/feature-scout [funcionalidade]`**
- Analisa se uma feature já existe no código (total/parcial/ausente)
- Mapeia dependências e sugere estratégia de implementação

**`/html-audit [arquivo]`**
- **QA Frontend:** Audita conformidade com padrões do projeto (SKILL.md)
- **Verifica:**
  - ❌ Emojis (devem usar Material Icons)
  - ❌ Cores hardcoded (devem usar variáveis CSS `--laranja`, `--bg-card`)
  - ❌ Estrutura HTML completa em fragmentos (devem ser fragmentos limpos)
  - ❌ Flags manuais de navegação (devem usar Debounce)
  - ❌ Acessibilidade básica (alt, aria-label)
- **Gera:** Relatório com % de conformidade + sugestões de correção
- **Exemplo:** `/html-audit public/participante/fronts/perfil.html`

**`/salvar-tarefas` e `/retomar-tarefas`**
- Persistem contexto entre sessões no arquivo `.claude/pending-tasks.md`
- Útil para pausar e continuar trabalhos complexos

## ⚠️ Critical Rules
1. NEVER remove the `gemini_audit.py` file.
2. NEVER break the "Follow the Money" audit trail in financial controllers.
3. Always check if a variable exists before accessing its properties (avoid `undefined` errors).

## 📊 Estrutura de Dados - Participantes

### Collection "times"
- **IMPORTANTE:** O sistema NÃO usa a collection "users". Todos os participantes estão na collection **"times"**.
- Model: `models/Time.js`
- Schema principal: `id` (Number, único), `nome_time`, `nome_cartoleiro`, `ativo`, `rodada_desistencia`, `temporada`

## 🔌 Estratégia de Banco de Dados

### Configuração
- **Ambiente único:** DEV e PROD conectam no mesmo banco MongoDB
- **Diferenciação:** Apenas via `NODE_ENV` (para logs e proteções)
- **Razão:** Dados do Cartola são perpétuos após consolidação

### Características do Modelo de Dados
1. **Participantes fixos** durante temporada ativa
2. **Rodadas consolidadas** = dados imutáveis
3. **Acertos financeiros** = transações permanentes
4. **Cache recalculável** a qualquer momento

### Proteções em Scripts
```javascript
// Template de proteção obrigatória
const isProd = process.env.NODE_ENV === 'production';
const isDryRun = process.argv.includes('--dry-run');
const isForced = process.argv.includes('--force');

if (isProd && !isForced && !isDryRun) {
    console.error('❌ PROD requer --force ou --dry-run');
    process.exit(1);
}
```

### Workflow de Correções
1. Desenvolve/corrige código localmente (NODE_ENV=development)
2. Testa no link provisório Replit (conecta no banco real, modo leitura)
3. Valida funcionamento sem afetar participantes
4. Deploy (git push) → supercartolamanager.com.br atualiza
5. Se necessário corrigir dados, roda script com `--force` em PROD

### Comandos Padrão
```bash
# Validar antes de executar
node scripts/[script].js --dry-run

# Executar em PROD (após validação)
NODE_ENV=production node scripts/[script].js --force
```

### Quando Reativar Banco DEV Separado
- Testes destrutivos frequentes
- Simulações de múltiplas temporadas
- Refatoração de estrutura de dados
- Desenvolvimento de features experimentais

Nestes casos, reconfigurar `MONGO_URI_DEV` nos Secrets.

### Dados de Temporada
- **Estatísticas atuais:** Consulte `docs/TEMPORADA-[ANO].md` (gerado dinamicamente)
- **Análise em tempo real:** Use `scripts/analisar-participantes.js`
- **Gerar snapshot:** `node scripts/gerar-snapshot-temporada.js [ANO]`

### Scripts Úteis
- `scripts/analisar-participantes.js` - Análise completa da collection times
  ```bash
  node scripts/analisar-participantes.js
  node scripts/analisar-participantes.js --detalhes
  node scripts/analisar-participantes.js --limpar-testes  # dry-run
  ```
- `scripts/gerar-snapshot-temporada.js` - Gera documentação de temporada
  ```bash
  node scripts/gerar-snapshot-temporada.js 2025
  ```

## 📦 Sistema de Versionamento

### Visão Geral
O sistema de versionamento **força atualizações** no app do participante quando há mudanças.

### Componentes Principais
- **Badge no Header**: Exibe versão atual (ex: `19.12.24.1430`)
- **Modal de Atualização**: Aparece automaticamente quando detecta nova versão
- **API**: `/api/app/check-version` - retorna versão baseada no cliente (admin/app)
- **Versionamento Separado**: Admin e App têm versões independentes

### Arquivos Principais
- `config/appVersion.js` - Gera versões automaticamente
- `config/version-scope.json` - Define escopos (admin/app/shared)
- `routes/appVersionRoutes.js` - API de versionamento
- `public/js/app/app-version.js` - Cliente que verifica atualizações
- `public/participante/js/participante-auth.js` - Inicializa o sistema (linha ~667)

### Como Funciona
1. App verifica versão ao iniciar e quando volta do background
2. Compara versão local vs servidor
3. Se diferente → exibe modal **obrigatório**
4. Usuário clica "Atualizar" → limpa cache + reload

### Forçar Atualização
Para forçar todos a atualizarem:
```bash
# Modifique qualquer arquivo do app
touch public/participante/js/participante-rodadas.js

# Restart do servidor
# Próximo acesso → modal de atualização
```

### Documentação Completa
Ver: `docs/VERSIONAMENTO-SISTEMA.md`

---

## 📝 Sistema de Gestão de Ideias e Backlog

### Visão Geral
O projeto utiliza um **sistema híbrido** para capturar e organizar ideias futuras:
- **BACKLOG.md**: Arquivo central com todas as ideias organizadas por prioridade
- **TODOs no código**: Comentários com padrão específico para ideias localizadas
- **.cursorrules**: Regras que instruem a IA a sempre consultar o backlog

### Arquivos Principais
- [`BACKLOG.md`](BACKLOG.md) - **Backlog central único do projeto** (fonte da verdade)
- [`.cursorrules`](.cursorrules) - Regras do projeto (incluem seção de backlog)
- [`scripts/backlog-helper.js`](scripts/backlog-helper.js) - CLI para gerenciar TODOs

### Padrão de TODOs no Código
```javascript
// TODO-CRITICAL: [Descrição] - Prioridade máxima
// TODO-HIGH: [Descrição] - Alta prioridade
// TODO-MEDIUM: [Descrição] - Média prioridade
// TODO-LOW: [Descrição] - Baixa prioridade
// TODO-FUTURE: [Descrição] - Backlog distante

// Exemplo contextualizado:
// TODO-HIGH: Adicionar rate limit específico para upload de imagens
// Contexto: Atualmente só temos rate limit global, mas uploads podem
// saturar o servidor. Implementar limitador em uploadController.js
// Ref: BACKLOG.md#PERF-002
```

### Sistema de Prioridades
| Prioridade | Descrição | Quando usar |
|------------|-----------|-------------|
| 🔴 **CRITICAL** | Bugs graves, segurança | Resolver ASAP, bloqueia trabalho |
| 🟠 **HIGH** | Features importantes, performance | Próximas sprints, impacto significativo |
| 🟡 **MEDIUM** | Melhorias UX, refatorações | 1-2 meses, importante mas não urgente |
| 🟢 **LOW** | Nice to have, experimentais | Quando houver tempo |
| 📦 **FUTURE** | Backlog distante | Reavaliar periodicamente |

### Workflow Rápido
**Quando surge uma ideia:**
1. **Afeta arquivo específico?** → Adicionar `TODO-X` no código
2. **É padrão/regra do projeto?** → Adicionar em `.cursorrules`
3. **É feature ampla?** → Adicionar em `BACKLOG.md`

### Ferramentas CLI
```bash
# Listar todos os TODOs do código
node scripts/backlog-helper.js list

# Validar IDs únicos no BACKLOG.md
node scripts/backlog-helper.js validate

# Relatório resumido
node scripts/backlog-helper.js report

# Buscar TODOs por palavra-chave
node scripts/backlog-helper.js search "rate limit"
```

### IDs Únicos no BACKLOG
- **BUG-XXX**: Bugs/correções
- **SEC-XXX**: Segurança
- **FEAT-XXX**: Novas features
- **PERF-XXX**: Performance
- **UX-XXX**: User Experience
- **REFACTOR-XXX**: Refatorações
- **IDEA-XXX**: Ideias experimentais
- **NICE-XXX**: Nice to have
- **FUTURE-XXX**: Backlog distante

### Benefícios
- ✅ **Captura rápida**: Anotar ideias em segundos
- ✅ **Contexto preservado**: TODOs mantêm contexto técnico
- ✅ **IA informada**: Sistema sempre considera o backlog
- ✅ **Priorização clara**: Cores/níveis facilitam decisões
- ✅ **Rastreabilidade**: IDs únicos para vincular discussões
- ✅ **Flexível**: Funciona para ideias pequenas e grandes
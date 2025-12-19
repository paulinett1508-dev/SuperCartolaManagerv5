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

## 🚀 Replit Specifics
- **Server:** Always verify port configuration (process.env.PORT || 5000).
- **File System:** Do not use absolute paths that assume a local Windows/Mac machine. Use relative paths suitable for Linux.

## 🤖 Project Skills (Agentes Especializados)
O projeto conta com 4 skills especializadas que podem ser invocadas para tarefas específicas:

| Skill | Descrição | Quando Usar |
|-------|-----------|-------------|
| **code-inspector** | Code Review, Debugging e Qualidade de Software | "procurar bugs", "auditar código", "corrigir erros", "melhorar qualidade" |
| **db-guardian** | Banco de Dados (MongoDB), Segurança e Migrações | Scripts de limpeza, manutenção, snapshots de temporada, gestão de acesso |
| **frontend-crafter** | Frontend Mobile-First, UX Black & Orange, Cache Offline, SPA | Criar telas, ajustar CSS, lógica JS do cliente, navegação |
| **league-architect** | Regras de Negócio, Formatos de Liga (SaaS), Lógica Financeira | Configs de liga, cálculos financeiros, regras de disputa |

### Exemplos de Uso:
- "Auditar o sistema de pagamentos" → `code-inspector`
- "Criar script de migração para nova temporada" → `db-guardian`
- "Ajustar a tela de ranking no mobile" → `frontend-crafter`
- "Definir regras do mata-mata" → `league-architect`

## ⚠️ Critical Rules
1. NEVER remove the `gemini_audit.py` file.
2. NEVER break the "Follow the Money" audit trail in financial controllers.
3. Always check if a variable exists before accessing its properties (avoid `undefined` errors).

## 📊 Estrutura de Dados - Participantes

### Collection "times"
- **IMPORTANTE:** O sistema NÃO usa a collection "users". Todos os participantes estão na collection **"times"**.
- Model: `models/Time.js`
- Schema principal: `id` (Number, único), `nome_time`, `nome_cartoleiro`, `ativo`, `rodada_desistencia`, `temporada`

### Configuração de Ambiente
- **MONGODB_URI:** Não está no arquivo `.env` - está configurada nos **Replit Secrets** (variáveis de ambiente seguras).
- O sistema detecta automaticamente o ambiente (dev/prod) via `NODE_ENV`:
  - `development` → usa `MONGO_URI_DEV`
  - `production` → usa `MONGO_URI`

### Estatísticas Atuais (Referência)
- **Total de participantes:** 40 registros na collection `times`
- **Participantes ativos:** 36
- **Participantes inativos (desistentes):** 2
  - "JBMENGO94 FC"
  - "Senhores Da Escuridão"
- **Times de teste:** 2
  - "FLAMENGO TESTE FC" (id: 99999999)
  - "Time 123456"

### Scripts Úteis
- `scripts/analisar-participantes.js` - Análise completa da collection times
  ```bash
  node scripts/analisar-participantes.js
  node scripts/analisar-participantes.js --detalhes
  node scripts/analisar-participantes.js --limpar-testes  # dry-run
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
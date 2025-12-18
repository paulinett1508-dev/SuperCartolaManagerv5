# Super Cartola Manager - Diretrizes do Projeto

## 🚨 ESCOPOS RÍGIDOS (OBRIGATÓRIO!)

**ANTES de editar qualquer arquivo, consulte:**
```
.claude/scopes.json
```

| Escopo | Descrição | Caminho Principal |
|--------|-----------|-------------------|
| **admin** | Painel Administrativo (Desktop) | `public/*.html`, `public/layout.html` |
| **app** | App do Participante (Mobile PWA) | `public/participante/**/*` |
| **shared** | Backend, Models, Configs | `routes/`, `controllers/`, `models/` |

**REGRA DE OURO:**
- Se o usuário pedir "mexa no Admin" → PROIBIDO tocar em `public/participante/**/*`
- Se o usuário pedir "mexa no App" → PROIBIDO tocar em `public/*.html` (admin)

---

## 📁 Estrutura do Frontend

O frontend está em `public/` (NÃO em `src/views`):

```
public/
├── *.html                    # Páginas Admin (Desktop)
├── layout.html               # Template base Admin
├── css/
│   ├── _admin-tokens.css     # Design Tokens Admin
│   ├── base.css              # Componentes base
│   └── modules/              # CSS por módulo
├── js/                       # JavaScript Admin
└── participante/             # App Mobile (PWA)
    ├── index.html            # SPA principal
    ├── css/
    │   ├── _app-tokens.css   # Design Tokens App
    │   └── participante.css  # Estilos base
    ├── js/                   # JavaScript App
    └── fronts/               # Fragmentos HTML (sem <html>/<body>)
```

---

## 🎨 Design Tokens (CSS)

Usamos arquivos de tokens centralizados para cores, tipografia e espaçamento:

| Contexto | Arquivo | Prefixo |
|----------|---------|---------|
| Admin | `public/css/_admin-tokens.css` | `--color-*`, `--surface-*` |
| App | `public/participante/css/_app-tokens.css` | `--app-*` |

**Cor primária oficial:** `#FF5500`

**Documentação:** `docs/TOKENS-GUIA.md`

---

## 🔒 Segurança & Banco de Dados

| Ambiente | Variável | Uso |
|----------|----------|-----|
| **Produção** | `MONGO_URI` | Banco principal (dados reais) |
| **Desenvolvimento** | `MONGO_URI_DEV` | Banco de testes |

**Detecção automática:** Baseado em `NODE_ENV`
- `NODE_ENV=production` → usa `MONGO_URI`
- `NODE_ENV=development` → usa `MONGO_URI_DEV`

**Regras:**
- NUNCA commitar credenciais no código
- Secrets ficam em `.env` ou Replit Secrets
- Logs detalhados apenas em `development`

---

## 🔍 Ferramenta de Auditoria (Gemini)

Para análises pesadas de código, use o script `gemini_audit.py`:

```bash
# Uso básico (analisa public/ com gemini-2.5-flash)
python3 gemini_audit.py "Descreva o propósito deste projeto"

# Especificar diretório
python3 gemini_audit.py "Busque bugs" --dir ./routes

# Usar outro modelo
python3 gemini_audit.py "Analise segurança" --model gemini-2.5-pro
```

**Modelos disponíveis:**
- `gemini-2.5-flash` (default) - Rápido e inteligente
- `gemini-2.5-pro` - Mais capaz, mais lento
- `gemini-2.0-flash` - Versão anterior
- `gemini-2.0-flash-lite` - Econômico

---

## ⚠️ VERIFICAR TAREFAS PENDENTES

**Antes de começar qualquer trabalho novo, verifique:**

| Arquivo | Propósito |
|---------|-----------|
| `.claude/pending-tasks.md` | Tarefas **confirmadas** para implementar |
| `.claude/ideias-backlog.md` | Ideias em aberto, **não validadas** ainda |

Use `/retomar-tarefas` para carregar o contexto de sessões anteriores.

---

## 🧠 Skills Instaladas

Este projeto usa **Agent Skills** para modularizar conhecimento.
Não adicione regras detalhadas aqui. Adicione na Skill correspondente.

| Skill | Assuntos |
|-------|----------|
| `league-architect` | Regras de negócio, Formatos de liga, Finanças, Mitos/Micos |
| `frontend-crafter` | UX Mobile, Cores (#FF5500), Cache IndexedDB, Navegação v3.0 |
| `db-guardian` | MongoDB, Migração de temporada, Scripts de manutenção |
| `code-inspector` | Auditoria, Debugging, Segurança, Qualidade |
| `system-scribe` | Documentação, Explicações de regras, Wiki viva (usa Gemini) |

---

## 🛠️ Comandos Principais

```bash
npm run dev     # Dev com Nodemon + Hot Reload
npm start       # Produção
npm test        # Testes
npm run lint    # Lint
```

---

## 🏗️ Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Backend:** Express.js (MVC)
- **Database:** MongoDB + Mongoose
- **Frontend:** Vanilla JS Modular (Mobile-First)
- **PWA:** Service Worker + IndexedDB

---

## ⚠️ Regras Globais de Código

1. **Ambiente:** Respeite `NODE_ENV`. Logs detalhados apenas em `development`.
2. **Circuit Breaker:** `seasonGuard.js` bloqueia API Globo fora de temporada.
3. **Versionamento:** `config/appVersion.js` detecta versões Admin/App.
4. **Banco de Dados:** Use a variável correta baseada em `NODE_ENV`.
5. **Design Tokens:** Use `var(--*)` em vez de cores hardcoded.

---

## 📅 Sistema de Temporadas

**Arquivo central:** `config/seasons.js`

```javascript
export const CURRENT_SEASON = 2025;  // Mude APENAS aqui para virar o ano
```

**Regras:**
- Todos os models têm campo `temporada` obrigatório
- Queries filtram por `temporada: CURRENT_SEASON` por padrão
- Dados históricos ficam preservados

**Documentação:** `docs/TEMPORADAS-GUIA.md`

**Scripts:**
- `node scripts/migrar-temporada-2025.js` - Migrar dados
- `node scripts/turn_key_2026.js` - Virada de temporada

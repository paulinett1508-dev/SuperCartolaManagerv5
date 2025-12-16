# Super Cartola Manager - Diretrizes do Projeto

## ⚠️ VERIFICAR TAREFAS PENDENTES

**Antes de começar qualquer trabalho novo, verifique:**
```
.claude/pending-tasks.md
```
Use `/retomar-tarefas` para carregar o contexto de sessões anteriores.

---

Este projeto utiliza **Agent Skills** para modularizar o conhecimento.
Não adicione regras detalhadas aqui. Adicione na Skill correspondente em `.claude/skills/`.

## 🧠 Skills Instaladas (Onde procurar conhecimento)

1.  **Regras de Negócio & SaaS:**
    * Consulte a skill: `league-architect`
    * Assuntos: Formatos de liga (Sobral/Super), Regras Financeiras, Mitos/Micos, Configuração JSON.

2.  **Frontend & UX Mobile:**
    * Consulte a skill: `frontend-crafter`
    * Assuntos: Cores (#FF5500), Navegação v3.0, Cache IndexedDB, Fragmentos HTML.

3.  **Banco de Dados & Segurança:**
    * Consulte a skill: `db-guardian`
    * Assuntos: Migração de Temporada, Limpeza de Dados, Scripts de Manutenção.

4.  **Code Review & Debugging:**
    * Consulte a skill: `code-inspector`
    * Assuntos: Auditoria de código, Busca de bugs, Validação de segurança, Qualidade de software.

---

## 🛠️ Comandos Principais
- **Start Dev:** `npm run dev` (Nodemon + Hot Reload)
- **Start Prod:** `npm start`
- **Testes:** `npm test`
- **Lint:** `npm run lint`

## 🏗️ Tech Stack
- **Runtime:** Node.js (ES Modules)
- **Backend:** Express.js (MVC)
- **Database:** MongoDB + Mongoose
- **Frontend:** Vanilla JS Modular (Mobile-First)

## ⚠️ Regras Globais de Código
1.  **Ambiente:** Respeite `NODE_ENV`. Logs detalhados apenas em 'development'.
2.  **Circuit Breaker:** Respeite `seasonGuard.js` para bloquear acesso à API Globo fora de temporada.
3.  **Versionamento:** Use `config/appVersion.js` para detectar versões Admin/App automaticamente.
4.  **Banco de Dados:** Use `MONGO_URI` (prod) ou `MONGO_URI_DEV` (dev) baseado em `NODE_ENV`.

---

## 📅 Sistema de Temporadas (IMPORTANTE!)

**Arquivo central:** `config/seasons.js`

```javascript
export const CURRENT_SEASON = 2025;  // Mude APENAS aqui para virar o ano
```

**Regras:**
- Todos os models têm campo `temporada` obrigatório
- Queries devem filtrar por `temporada: CURRENT_SEASON` por padrão
- Dados históricos ficam preservados (filtre por `temporada: 2025`)

**Documentação completa:** `docs/TEMPORADAS-GUIA.md`

**Scripts úteis:**
- `node scripts/migrar-temporada-2025.js` - Migrar dados existentes
- `node scripts/turn_key_2026.js` - Virada de temporada (só após 01/01/2026)
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Super Cartola Manager is a Node.js/Express fantasy football league management system for Cartola FC (Brazilian fantasy game). It features two distinct interfaces: Admin (desktop) for league management and Participant (mobile-first) for player experience.

## Commands

```bash
# Development
npm install          # Install dependencies
npm run dev          # Start with nodemon (hot reload)
npm start            # Production mode

# Testing
npm test                        # Run all tests
npm run test:watch              # Watch mode
npm run test:coverage           # With coverage report
npm run test:artilheiro         # Single test file

# Linting
npm run lint          # Check code quality
npm run lint:fix      # Auto-fix issues

# Utilities
npm run consolidar    # Consolidate historical data
npm run predeploy     # Bump version before deploy
node project-dna.js   # Regenerate PROJECT_DNA.md documentation
```

## Architecture

### Stack
- **Backend**: Node.js + Express (ES Modules)
- **Database**: MongoDB + Mongoose
- **Frontend**: Vanilla JavaScript (modular)
- **Caching**: NodeCache (server) + IndexedDB (client)

### Directory Structure
```
config/          # Database, auth, app configuration
controllers/     # Business logic (17 controllers)
middleware/      # Auth guards, security, route protection
models/          # MongoDB/Mongoose schemas
routes/          # API route definitions (129+ endpoints)
services/        # Business services (Cartola API, gols, goleiros)
utils/           # Helper utilities
scripts/         # Standalone scripts (cron, consolidation)
public/
  ├── admin/         # Admin interface
  ├── participante/  # Mobile-first participant app
  ├── js/            # Frontend modules by feature
  └── css/           # Stylesheets
```

### Two Operating Modes

**Admin Mode** (Desktop): League CRUD, round consolidation, financial management, participant administration, reports

**Participant Mode** (Mobile-first): Financial statements, rankings, rounds, top 10, knockout brackets, top scorer, golden glove

### Authentication
- **Admin**: Replit Auth (OpenID Connect)
- **Participant**: Express Session + team password
- Protected routes use middleware guards in `middleware/auth.js`

### Key Controllers
- `ligaController.js` - League management
- `rodadaController.js` - Round management
- `consolidacaoController.js` - Data consolidation
- `fluxoFinanceiroController.js` - Financial flows
- `artilheiroCampeaoController.js` - Top scorer tracking
- `pontosCorridosCacheController.js` - Points standings
- `extratoFinanceiroCacheController.js` - Statement caching

### Frontend Module Pattern
Participant app uses lazy-loaded modules in `public/participante/js/modules/`:
- `participante-extrato.js`, `participante-ranking.js`, `participante-rodadas.js`
- `participante-top10.js`, `participante-pontos-corridos.js`, `participante-mata-mata.js`
- `participante-artilheiro.js`, `participante-luva-ouro.js`, `participante-melhor-mes.js`

## Development Constraints

**From user preferences (replit.md):**
- Ask before making major changes
- Do not modify the `backups/` folder
- Do not alter existing database structure
- Maintain compatibility with existing APIs
- Keep admin mode 100% intact
- Test each change in isolation
- Format numbers/currency in Brazilian Portuguese (pt-BR)
- Use modal overlays instead of alert() boxes

**Performance:**
- MongoDB connection pooling (50 max, 10 min)
- Multi-level caching (NodeCache server-side, IndexedDB client-side)
- Lazy-loaded frontend modules

## Environment Variables

Required in `.env`:
```
MONGODB_URI=         # MongoDB connection string
NODE_ENV=            # development/production
PORT=                # Server port (default 5000)
SESSION_SECRET=      # Session encryption key
BASE_URL=            # Base URL for deployment
API_URL=             # API base URL
LIGA_ID_PRINCIPAL=   # Main league ID
```

Optional for OAuth:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAILS=
```

## Entry Points

- **Backend**: `index.js`
- **Admin Frontend**: `public/index.html`
- **Participant Frontend**: `public/participante/index.html`

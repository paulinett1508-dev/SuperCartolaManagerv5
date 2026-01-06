# Super Cartola Manager - Copilot Instructions

## Project Overview
Fantasy football league manager for Cartola FC (Brazilian fantasy league). Node.js + MongoDB + Vanilla JS SPA with MVC architecture.

## Tech Stack
- **Backend:** Node.js (ESM modules), Express, MongoDB (Mongoose)
- **Frontend:** Vanilla JS (ES6 modules), TailwindCSS via CDN, strict Dark Mode
- **Environment:** Replit (Linux), single MongoDB for DEV/PROD

## Critical Conventions

### Portuguese Naming
All code uses **Portuguese variable/function names**:
```javascript
// ✅ Correct          // ❌ Wrong
const usuario          // const user
function validarSenha  // function validatePassword
const autorizado       // const authorized
```

### Participant Data
**NEVER use `users` collection** - participants are in `times`:
```javascript
// Model: models/Time.js
{ id: Number, nome_time, nome_cartoleiro, ativo, temporada }
```

### Financial Idempotency
All financial operations MUST be idempotent. Check before creating:
```javascript
// Pattern in controllers/fluxoFinanceiroController.js
const existing = await Collection.findOne({ uniqueKey });
if (existing) return res.json({ success: true, message: 'Já processado' });
```

### Session Authentication
Always validate session before sensitive actions:
```javascript
if (!req.session?.usuario) {
  return res.status(401).json({ success: false, message: 'Não autorizado' });
}
```

## Architecture Patterns

### Route → Controller → Model
```
routes/*.js          → HTTP endpoints, auth middleware
controllers/*.js     → Business logic, MongoDB queries  
models/*.js          → Mongoose schemas
services/*.js        → External APIs (Cartola FC)
```

### Cache System
Most rankings use a cache pattern with `*Cache` models:
- `ExtratoFinanceiroCache` - Financial extracts per round
- `RankingGeralCache` - Overall rankings
- `Top10CacheRoutes` - Top 10 weekly rankings

Regenerate caches with: `scripts/regenerar-caches-liga.js`

### Multi-tenant by Liga
Data is scoped by `liga_id`. Always include in queries:
```javascript
await Model.find({ liga_id: req.liga_id, temporada: 2026 });
```

## Developer Commands

```bash
# Development server (with nodemon)
npm run dev

# Production
npm start

# Run tests
npm test

# Lint
npm run lint

# Analyze participants
node scripts/analisar-participantes.js --detalhes

# Regenerate caches after data changes
node scripts/regenerar-caches-liga.js
```

### Script Safety Pattern
All destructive scripts require protection:
```bash
node scripts/[name].js --dry-run     # Validate first
NODE_ENV=production node scripts/[name].js --force  # Execute in prod
```

## Frontend Patterns

### Dark Mode Only
```javascript
// Cards: bg-gray-800, Text: text-white/text-gray-100
// Inputs: bg-gray-700 text-white border-gray-600
// Never use white backgrounds
```

### No Frameworks
Pure JavaScript only - no React/Vue. Use ES6 modules in `/public/js/`.

## Key Files Reference
- [index.js](index.js) - Main server, route registration
- [config/database.js](config/database.js) - MongoDB connection
- [config/seasons.js](config/seasons.js) - Current season config
- [models/Time.js](models/Time.js) - Participant schema
- [controllers/fluxoFinanceiroController.js](controllers/fluxoFinanceiroController.js) - Financial logic pattern
- [BACKLOG.md](BACKLOG.md) - Feature backlog with priority IDs

## External Integrations
- **Cartola FC API:** `services/cartolaApiService.js` - unofficial, undocumented API
- **Google Drive:** `uploadToDrive.js` - backup system
- **Replit Auth:** `config/replit-auth.js` - admin authentication via OIDC

## Season Renewal System
New season workflow documented in `docs/SISTEMA-RENOVACAO-TEMPORADA.md`:
- Rules stored in `ligarules` collection
- Inscriptions tracked in `inscricoestemporada`
- Zero hardcoded values - all configurable via admin UI

# Ideias de Skills (Macro) — Governança do Sistema

Data: 27 jan 2026

## Objetivo
Garantir conformidade global entre módulos (arquitetura, temporada, layout, contratos, cache, logs) para manter o raciocínio do todo.

---

## Skill macro proposta
**Nome sugerido:** `skill-sistema-governanca`

### Escopo base (a partir do código existente)
- **Temporada (backend):** `config/seasons.js` + guardas em `utils/seasonGuard.js`.
- **Temporada (frontend):** `public/js/core/season-config.js` + `public/js/core/season-context.js`.
- **Arquitetura híbrida:** regras estáticas em `config/rules/*.json` + dinâmicas em `models/ModuleConfig.js`/`Liga.configuracoes` (`docs/ARQUITETURA-MODULOS.md`).
- **UI tokens:** `_admin-tokens.css` carregado antes de qualquer CSS (`public/layout.html`).
- **Orquestração:** `public/js/detalhe-liga-orquestrador.js`.
- **Layout base:** `public/layout.html` + `public/js/core/layout-manager.js`.
- **Registro de rotas:** `index.js`.
- **Cache/versionamento:** cache local do layout + cache busting do app participante em `index.js`.

### Checklist macro (cross‑module)
- Respeitar temporada (SeasonContext/URL no front; `config/seasons.js` no back).
- Guardas de temporada em chamadas externas (`seasonGuard`).
- Regras híbridas: estrutura em JSON e overrides dinâmicos no Mongo.
- Layout/tokens consistentes.
- Rotas registradas e contratos consistentes com controller do módulo.
- Orquestrador atualizado se houver novo módulo/entrada.

---

## Observações finais
- A skill macro deve ser usada sempre que tocar rotas, controllers, models, layout, orquestradores ou temporada.
- Skills de módulo devem conter seção “Conexões com o todo”, apontando contratos e dependências críticas.

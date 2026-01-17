# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Status Atual (2026-01-17)

**✅ Skills Robustecidos v2.0 - Instalados**

**Localização:**
- `.claude/skills/` - 5 skills completos (code-inspector, db-guardian, frontend-crafter, league-architect, system-scribe)
- `scripts/` - 5 scripts de auditoria automatizados
- `SKILLS_ROBUSTECIDOS.md` - Documentação completa

**Próximas ações:**
1. Executar primeira auditoria: `bash scripts/audit_full.sh > audit_baseline_$(date +%Y%m%d).log`
2. Revisar issues P1 (críticos) encontrados
3. Commitar skills no Git: `git add .claude/skills/ scripts/ && git commit -m "feat: skills robustecidos v2.0"`

---

## Histórico de Correções Recentes

### ✅ Skills & Scripts de Auditoria (2026-01-17)

**Implementado:**
- Framework SPARC (Security/Performance/Architecture/Reliability/Code Quality)
- Scripts: audit_full, audit_security, audit_multitenant, detect_dead_code, check_dependencies
- Patterns específicos: Multi-tenant, Cache-First, Regras financeiras completas
- Documentação: Wiki Viva methodology, Gemini Audit integration

**Aliases criados:**
```bash
audit           # Auditoria completa
audit-security  # Análise de segurança
audit-tenant    # Validação multi-tenant
```

### ✅ Jogos do Dia v2.0 (2026-01-17)

**Arquivos:** `routes/jogos-ao-vivo-routes.js` v2.0, `public/participante/js/modules/participante-jogos.js` v3.0

**Mudanças:** Endpoint `?date={hoje}`, cache inteligente (2min/10min), jogos encerrados visíveis

### ✅ Fix China Guardiola - Crédito 2026 (2026-01-17)

**Corrigido:** `controllers/inscricoesController.js` v1.4 - Transferência de crédito em renovações com `pagouInscricao=true`

### ✅ PWA Install Prompt (Implementado)

**Arquivo:** `public/participante/js/install-prompt.js` v1.1

---

## Referência Rápida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Scripts de Auditoria
```bash
bash scripts/audit_full.sh           # Auditoria completa SPARC
bash scripts/audit_security.sh       # Segurança OWASP Top 10
bash scripts/audit_multitenant.sh    # Isolamento multi-tenant
bash scripts/detect_dead_code.sh     # Código morto/TODOs
bash scripts/check_dependencies.sh   # NPM vulnerabilidades
```

### Status API Cartola
```json
{
  "temporada": 2025,
  "rodada_atual": 1,
  "status_mercado": 1,
  "game_over": false
}
```

---

## Próxima Ação Recomendada

### Imediato
1. **Executar baseline de auditoria:** `audit > audit_baseline.log`
2. **Revisar SKILLS_ROBUSTECIDOS.md** para entender novas ferramentas
3. **Resolver issues críticos** encontrados na auditoria

### Quando Brasileirão 2026 Iniciar
1. Atualizar `CAMPEONATO_ENCERRADO = false` em `fluxo-financeiro-core.js`
2. Atualizar `TEMPORADA_CARTOLA = 2026` em `participante-extrato.js`
3. Executar `bash scripts/audit_multitenant.sh` para validar queries 2026

---
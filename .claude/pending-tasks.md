# Tarefas Pendentes - Super Cartola Manager

> Atualizado: 2026-02-04
> Auditado: Todos os itens anteriores foram verificados no código e MongoDB. Apenas tarefas realmente pendentes permanecem.

---

## FEATURES - Alta Prioridade

### [FEAT-026] Polling Inteligente para Módulo Rodadas

**Prioridade:** Alta
**Contexto:** Módulo Rodadas faz refresh a cada 30s independente de haver jogos, desperdiçando recursos.

**Objetivo:** Criar gerenciador de polling que:
- Pausa quando não há jogos em andamento
- Reativa ~10min antes do próximo jogo
- Mostra feedback visual do estado (ao vivo / aguardando / pausado)

**Arquivos a criar/modificar:**
- `public/js/rodadas/rodadas-polling-manager.js` (novo)
- `public/js/rodadas.js` (integrar)
- Possível modelo `CalendarioRodada` no MongoDB

---

### [FEAT-027] Enriquecer Listagem de Participantes no Módulo Rodadas

**Prioridade:** Alta
**Objetivo:** Tornar lista de participantes mais informativa:
- Contador de atletas que já jogaram (`X/12`)
- Escudo do time do coração
- Valores financeiros da liga (bônus G10/Z10 baseado em `ModuleConfig`)

**Arquivos a modificar:**
- `controllers/rodadaController.js` - Lógica de atletas jogados
- `public/js/rodadas.js` / `public/participante/js/modules/participante-rodadas.js` - Renderização
- `ModuleConfig` collection - Config de valores por liga

---

## ADMIN MOBILE

### [MOBILE-001] Remover emojis e alinhar visual

**Prioridade:** Baixa
**Descrição:** Remover todos os emojis do admin-mobile e alinhar com padrão visual do app participante (fontes, cores, componentes).
**Arquivos:** `public/admin-mobile/` (todos os HTMLs, JS e CSS)

---

### ~~[MOBILE-003] Dashboard admin-mobile "Nenhuma liga encontrada"~~ CORRIGIDO (2026-02-04)

Causa: `adminMobileController.js` usava `ativo: true` (campo inexistente) ao invés de `ativa: true`, e buscava participantes na collection `times` com `liga_id` ao invés de usar `liga.participantes[]`. Corrigido em `getDashboard`, `getLigas`, `getLigaDetalhes` e `getHealth`.

---

### [MOBILE-004] Implementar Fases 5 e 6 do App Admin

**Prioridade:** Média
**Descrição:** Implementar fases finais do roadmap do app admin mobile. Verificar specs em `.claude/docs/` para escopo detalhado.

---

## UX

### [UX-002] Substituir 4 alert() restantes por SuperModal

**Prioridade:** Baixa
**Descrição:** Sistema já tem `super-modal.js` para substituir dialogs nativos. Restam 4 chamadas `alert()` legadas:

| Arquivo | Linha | Contexto |
|---------|-------|----------|
| `public/js/luva-de-ouro/luva-de-ouro-utils.js` | 700 | "Nenhum dado para exportar" |
| `public/js/navigation.js` | 5 | Alert genérico |
| `public/js/modules/module-config-modal.js` | 1245 | Erro |
| `public/js/modules/module-config-modal.js` | 1260 | Sucesso |

---

## DOCUMENTAÇÃO

### [DOC-001] Migrar Skills do Codebase para docs/

**Prioridade:** Média
**Descrição:** Centralizar todas as skills/ferramentas de desenvolvimento na pasta `docs/` para melhor versionamento e visibilidade.

**Ações:**
- [ ] Identificar todas as skills espalhadas pelo codebase
- [ ] Padronizar formato de documentação (seguir padrão `SKILL-ANALISE-BRANCHES.md`)
- [ ] Migrar para `docs/` com nomenclatura consistente (`SKILL-*.md`)
- [ ] Atualizar BACKLOG.md com referências corretas
- [ ] Criar índice em `docs/README.md` ou `docs/SKILLS-INDEX.md`

**Benefícios:**
- Versionamento Git completo
- Visibilidade para toda equipe
- Facilita onboarding de novos desenvolvedores
- Documentação sempre atualizada

**Arquivos afetados:**
- `.claude/skills/` → `docs/SKILL-*.md`
- Scripts em `/scripts/` (adicionar documentação em `docs/`)
- `BACKLOG.md` (atualizar referências)

---

## BACKLOG TECNICO

- **Queries sem `.lean()`:** ~130 restantes (4 controllers já atualizados)
- **Console.logs:** 567 encontrados (criar logger configurável)
- **Refatoração fluxo-financeiro-ui.js:** 4.426 linhas (extrair Ajustes Dinâmicos ~300L, Tabela Expandida ~400L, meta <3.000L)

---

## REFERENCIA RAPIDA

### IDs das Ligas
- **Super Cartola:** `684cb1c8af923da7c7df51de`
- **Cartoleiros do Sobral:** `684d821cf1a7ae16d1f89572`

### Scripts de Auditoria
```bash
bash scripts/audit_full.sh           # Auditoria completa SPARC
bash scripts/audit_security.sh       # Segurança OWASP Top 10
bash scripts/audit_multitenant.sh    # Isolamento multi-tenant
bash scripts/detect_dead_code.sh     # Código morto/TODOs
bash scripts/check_dependencies.sh   # NPM vulnerabilidades
```

---

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`

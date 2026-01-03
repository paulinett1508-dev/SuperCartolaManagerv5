# Tarefas Pendentes - 2026-01-03

## Contexto da Sessao Atual
**WHITE LABEL MULTI-TENANT - FASE 3 COMPLETA**

Implementacao do sistema SaaS multi-tenant com wizard de onboarding.

---

## Corrigido Nesta Sessao (03/01/2026)

### 0. BUG CRITICO - Ranking Geral "N/D" e Pontos Zerados
- **Problema:** Coluna Cartoleiro mostrava "N/D", pontos = 0-3 (deveria ser ~3500)
- **Causa raiz:** Collection `rankingturnos` corrompida apos turn_key
  - Dados consolidados com valores incorretos
  - Status "consolidado" impedia recalculo automatico
- **Solucao:**
  1. Deletado cache corrompido (4 registros: 3 SC + 1 Sobral)
  2. Forcada reconsolidacao via API `/api/ranking-turno/:ligaId/consolidar`
- **Resultado:** TOP 5 correto (Vitim 3597.88 pts, 38 rodadas)
- **Status:** CORRIGIDO

### 1. Roadmap 2026 - Contagem Regressiva do Mercado
- **Nova feature:** Contagem regressiva para abertura do Mercado Cartola (12/01/2026)
- **FAB atualizado:** Mostra "Mercado abre em X dias" em vez de "Vem ai"
- **Modal redesenhado:** Countdown duplo (Mercado + Brasileirao)
- **Arquivos:**
  - `public/participante/js/participante-config.js` (MARKET_OPEN_DATE)
  - `public/participante/index.html` (modal + FAB)
- **Status:** IMPLEMENTADO

### 1. Card Mata-Mata Interativo (v12.4-12.5)
- **Nova estrutura:** Resumo horizontal + edicoes expandiveis
- **CSS dedicado:** Classes `.mm-*` em `historico.html`
- **Fix campo adversario:** `nomeTime` em vez de `nome`
- **Arquivos:**
  - `public/participante/fronts/historico.html` (CSS)
  - `public/participante/js/modules/participante-historico.js` (v12.5)
- **Status:** IMPLEMENTADO - aguardando teste

### 2. Seletor de Temporada Redesign
- **Estilo toast:** Elegante e discreto
- **Cores corrigidas:** Orange theme (nao mais roxo)
- **Arquivo:** `public/participante/js/participante-season-selector.js`
- **Status:** IMPLEMENTADO

### 3. FAB Roadmap "Vem ai 2026"
- **Novo design:** Icone trophy, glow animation
- **Estrutura:** Badge "2026" + "Vem ai"
- **Arquivo:** `public/participante/index.html`
- **Status:** IMPLEMENTADO

---

## Concluido Nesta Sessao

### WHITE LABEL MULTI-TENANT - FASES 1, 2 e 3 IMPLEMENTADAS

#### FASE 3: Wizard de Primeira Liga (Onboarding)
- **wizard-primeira-liga.html** - Interface completa de 5 etapas:
  1. Nome e Descricao da Liga
  2. Buscar e Adicionar Times (via API Cartola)
  3. Selecionar Modulos Ativos (toggles)
  4. Configurar Valores (accordion com defaults)
  5. Revisar e Confirmar
- **wizard-primeira-liga.js** - Logica completa do wizard:
  - Navegacao entre etapas com validacao
  - Busca de times via `/api/cartola/time/{id}`
  - Toggle de modulos com estado visual
  - Montagem de resumo dinamico
  - Criacao da liga via `POST /api/ligas`
  - Redirecionamento para detalhe-liga apos sucesso
- **painel.html modificado** - Detecta primeiro acesso:
  - Se admin nao tem ligas, redireciona para wizard
  - Empty state atualizado com link para wizard

### WHITE LABEL MULTI-TENANT - FASE 1 e 2 IMPLEMENTADAS

**Arquitetura multi-tenant implementada:**

1. **Schema Liga atualizado** (`models/Liga.js`)
   - Campos: `admin_id`, `owner_email`, `blindado`, `blindado_em`

2. **Middleware de Tenant** (`middleware/tenant.js`)
   - `tenantFilter()` - injeta filtro em req.tenantFilter
   - `hasAccessToLiga()` - verifica ownership
   - `isSuperAdmin()` - via config centralizada

3. **Controllers atualizados** (`controllers/ligaController.js`)
   - `listarLigas()` - usa req.tenantFilter
   - `buscarLigaPorId()` - verifica acesso via hasAccessToLiga
   - `criarLiga()` - vincula admin_id e owner_email

4. **Hardcodes removidos**
   - `config/admin-config.js` - centraliza SUPER_ADMIN_EMAILS
   - `routes/admin-cliente-auth.js` - usa config centralizada
   - `routes/admin-gestao-routes.js` - usa config centralizada

**Pendente:**
- [ ] FASE 3: Wizard primeira liga (5 etapas)
- [ ] Testar isolamento com admin de teste

---

**LEITURA MAPEADA DA PASTA /docs** - FEITO
- Mapeados 7 arquivos de documentacao
- Identificado: `live_experience_2026.md` (59KB) como feature principal
- `SINCRONISMO-DEV-PROD.md` desatualizado (menciona dois bancos)

---

## Pendencias - Hall da Fama

### ALTA PRIORIDADE

1. **Artilheiro Campeao - SOBRAL** - INVESTIGADO
   - **API:** Funciona perfeitamente - retorna 4 participantes com dados corretos
   - **Frontend:** Logs de debug adicionados em `buscarArtilheiro()` (participante-historico.js)
   - **Dados no banco:** golsconsolidados tem 38 rodadas para cada participante
   - **Proximo passo:** Verificar logs no console do navegador ao acessar Hall da Fama

2. **Card MELHOR RODADA**
   - Nao mostra dados em alguns casos
   - Verificar funcao `buscarMelhorRodada()` e fallback do tempRecente
   - Pode ser problema de API `/api/rodadas/{ligaId}/rodadas`

3. **Testar Mata-Mata com Adversarios**
   - Verificar se os nomes dos adversarios aparecem apos fix v12.5
   - Testar expansao de edicoes e lista de confrontos

### MEDIA PRIORIDADE

4. **Modulo Classificacao (Ranking Geral)** - SEM BUG
   - Auditoria code-inspector concluida
   - Logs "Card nao encontrado no DOM" sao informativos (nao erros)
   - Inconsistencia de nomenclatura: `artilheiro` vs `artilheiro-campeao`
   - Cards desabilitados corretamente via `cards_desabilitados[]`

5. **Erros 502 Bad Gateway no Admin**
   - Arquivos JS existem mas servidor nao responde
   - Problema de infraestrutura Replit
   - Solucao: Reiniciar servidor pelo painel Replit
   - Arquivos afetados:
     - `js/cards-condicionais.js`
     - `js/luva-de-ouro/luva-de-ouro-scheduler.js`
     - `js/core/sidebar-menu.js`
     - `js/sistema-modulos-init.js`
     - `js/detalhe-liga-orquestrador.js`

5. **Luva de Ouro - SOBRAL**
   - Verificar se card renderiza corretamente
   - Testar com participante multi-liga (Paulinett)

---

## Dados de Teste

### Participante Multi-Liga: Paulinett Miranda
- **timeId:** 13935277
- **Ligas:** SUPERCARTOLA + SOBRAL

| Liga | Posicao | Pontos | Saldo | Bonus | Onus |
|------|---------|--------|-------|-------|------|
| SUPERCARTOLA | 30 | 2954.10 | -194 | 187 | -381 |
| SOBRAL | 2 | 2990.43 | +110 | 99 | -46 |

### Participante Campeao: Vitim
- **timeId:** 3027272
- **Liga:** SUPERCARTOLA
- **Posicao:** 1 (Campeao)
- **Saldo:** +287

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

---

## Proximos Passos

### Fase 1: Renovacao (01/01 - 15/03/2026)
- [ ] Enviar comunicado de renovacao aos participantes
- [ ] Coletar confirmacoes de renovacao (OPT-IN)
- [ ] Prazo renovacao: 15/03/2026

### Fase 2: Quitacao (15/03 - 31/03/2026)
- [ ] Cobrar taxas de inscricao
- [ ] Prazo quitacao: 31/03/2026

### Fase 3: Inicio Temporada (Abril 2026)
- [ ] Aguardar inicio do Brasileirao 2026
- [ ] Alterar status para 'ativa' em config/seasons.js
- [ ] Primeira rodada de pontuacao

---

## Comandos Uteis

```bash
# Testar API Hall da Fama
curl -s "http://localhost:5000/api/participante/historico/13935277" | jq '.historico[0]'

# Testar API Mata-Mata
curl -s "http://localhost:5000/api/ligas/684cb1c8af923da7c7df51de/mata-mata" | jq '.edicoes[0].fases[0].confrontos[0]'

# Verificar cache MongoDB
node -e "const {MongoClient}=require('mongodb'); MongoClient.connect(process.env.MONGO_URI).then(async c=>{const db=c.db(); console.log('matamatacaches:', await db.collection('matamatacaches').countDocuments()); c.close();})"

# Reiniciar servidor
pkill -f "node.*index.js" && node index.js
```

---

## Historico de Sessoes

### Sessao 2026-01-03 (Atual)
- [x] Card Mata-Mata interativo v12.4-12.5
- [x] CSS para edicoes expandiveis
- [x] Fix campo adversario (nomeTime)
- [x] Seletor temporada toast style
- [x] FAB Roadmap redesign
- [x] Leitura mapeada da pasta /docs
- [x] Roadmap 2026 com contagem regressiva do Mercado
- [x] Auditoria modulo Ranking Geral (code-inspector)
- [ ] Pendente: Testar Mata-Mata com adversarios
- [ ] Pendente: Artilheiro SOBRAL
- [ ] Pendente: Melhor Rodada

### Sessao 2026-01-02
- [x] Investigacao Hall da Fama pos-turn-key
- [x] Correcao liga_id String -> ObjectId (76 docs)
- [x] Hall da Fama v12.1 - usa liga do header

### Sessao 2026-01-01
- [x] **EXECUCAO turn_key_2026.js**
- [x] Atualizacao config/seasons.js para 2026
- [x] Documentacao MCPs no CLAUDE.md

### Sessao 2025-12-31
- [x] Dry-run turn_key_2026.js com sucesso
- [x] Backup gerado: 8.914 documentos

---
*Atualizado em: 2026-01-03*
*Roadmap 2026 com contagem regressiva do Mercado Cartola*

# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Pendencias Ativas

### Sistema de Wizard para Configuracao de Modulos por Liga

**Status:** PENDENTE (proxima sessao)

**Contexto:**
Implementar sistema onde admin de cada liga pode ativar modulos (Mata-Mata, Top10, Pontos Corridos, etc.) e configurar regras especificas via modal wizard.

**Arquitetura Definida:**
- Regras ESTATICAS em `config/rules/*.json` (estrutura do modulo)
- Regras DINAMICAS em MongoDB `moduleconfigs` (config por liga)
- Documentacao completa em `docs/ARQUITETURA-MODULOS.md`

**Tarefas:**

1. [ ] **Criar `models/ModuleConfig.js`**
   - Schema para config de modulo por liga/temporada
   - Campos: liga_id, temporada, modulo, ativo, config_override

2. [ ] **Expandir JSONs em `config/rules/`**
   - Adicionar secao `wizard` com perguntas predefinidas
   - Cada pergunta: id, tipo (number/boolean/select), label, default

3. [ ] **Criar sistema generico de wizard**
   - Le JSON do modulo e constroi modal dinamicamente
   - Valida respostas e salva em ModuleConfig

4. [ ] **Criar rota `/api/liga/:id/modulos/:modulo/ativar`**
   - POST: Ativa modulo e salva config
   - GET: Retorna config atual do modulo

5. [ ] **Integrar no painel admin**
   - Listagem de modulos disponiveis por liga
   - Botao "Ativar/Configurar" que abre wizard

**Fluxo esperado:**
```
Admin clica "Ativar Top10" →
Modal wizard abre com perguntas do JSON →
Admin responde (qtd participantes, valores premios, criterio desempate) →
Sistema salva em moduleconfigs para APENAS aquela liga →
Modulo fica ativo com regras personalizadas
```

**Referencia:**
- `docs/ARQUITETURA-MODULOS.md` - Opcoes de arquitetura
- `config/rules/top_10.json` - Exemplo de regras estaticas

---

## Tarefas Concluidas (2026-01-04)

### Sistema de Renovacao de Temporada 2026

**Status:** CONCLUIDO (Backend + Frontend + Documentacao)

**Implementado:**
- Backend: Models, Routes, Controllers para renovacao
- Frontend: Modais de config, renovacao, novo participante
- Logica `pagouInscricao`: true = pago (sem debito), false = cria debito
- Modal expandido com TODAS as regras configuraveis
- Documentacao: `docs/SISTEMA-RENOVACAO-TEMPORADA.md`
- CLAUDE.md atualizado com secao de renovacao

**Arquivos criados:**
- `models/LigaRules.js`
- `models/InscricaoTemporada.js`
- `routes/liga-rules-routes.js`
- `routes/inscricoes-routes.js`
- `controllers/inscricoesController.js`
- `public/js/renovacao/` (api, modals, ui, core)
- `docs/SISTEMA-RENOVACAO-TEMPORADA.md`
- `docs/ARQUITETURA-MODULOS.md`

### Restaurar Colunas Financeiras na Lista de Participantes

**Status:** CONCLUIDO

**Problema Identificado:**
A API `/api/tesouraria/liga/:ligaId` nao retornava os dados de breakdown (Timeline, P.Corridos, Mata-Mata, Top10, Ajustes) porque:

1. O schema do Model `ExtratoFinanceiroCache` define `liga_id` como ObjectId
2. Mas os documentos no banco foram salvos com `liga_id` como String
3. O Mongoose tentava fazer cast e a query falhava silenciosamente

**Solucao Aplicada (v2.8):**
- Alterado `routes/tesouraria-routes.js` para usar acesso DIRETO a collection MongoDB
- Bypass do schema Mongoose com `mongoose.connection.db.collection('extratofinanceirocaches')`
- Query com `$or` para cobrir ambos os tipos (String e ObjectId)
- Removido filtro de temporada nos campos manuais (docs antigos nao tem)

**Resultado:**
- Todos os 32 participantes agora tem dados de breakdown
- Colunas Timeline, P.Corridos, Mata-Mata, Top10, Ajustes funcionando
- modulosAtivos retornados corretamente para renderizacao condicional

---

## Referencia Rapida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Participante Multi-Liga (teste)
- **Paulinett Miranda:** timeId `13935277`

---
*Atualizado em: 2026-01-04*

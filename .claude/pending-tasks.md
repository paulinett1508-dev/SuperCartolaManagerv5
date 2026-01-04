# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Pendencias Ativas

*Nenhuma pendencia ativa no momento.*

---

## Tarefas Concluidas (2026-01-04)

### Sistema de Wizard para Configuracao de Modulos por Liga

**Status:** CONCLUIDO

**O que foi implementado:**

1. **Model `models/ModuleConfig.js`**
   - Schema para config de modulo por liga/temporada
   - Campos: liga_id, temporada, modulo, ativo, financeiro_override, wizard_respostas
   - Metodos estaticos: ativarModulo, desativarModulo, listarModulosAtivos

2. **JSONs em `config/rules/*.json` expandidos com secao `wizard`**
   - 12 modulos configurados com perguntas dinamicas
   - Tipos suportados: number, boolean, select
   - Cada pergunta com: id, tipo, label, descricao, default, min/max/step

3. **Sistema generico de wizard**
   - `public/js/modulos/modulos-api.js` - Chamadas API
   - `public/js/modulos/modulos-wizard.js` - Renderizacao dinamica de modais
   - `public/js/modulos/modulos-ui.js` - Orquestracao de interface

4. **Rotas de API criadas**
   - GET `/api/liga/:ligaId/modulos` - Lista modulos
   - GET `/api/liga/:ligaId/modulos/:modulo` - Detalhe do modulo
   - POST `/api/liga/:ligaId/modulos/:modulo/ativar` - Ativa modulo
   - POST `/api/liga/:ligaId/modulos/:modulo/desativar` - Desativa modulo
   - GET `/api/modulos/:modulo/wizard` - Retorna perguntas do wizard

5. **Integracao no painel admin**
   - Botao "Configurar Modulos" na secao Administracao (detalhe-liga.html)
   - Modal com lista de modulos ativos/inativos
   - Botoes Ativar/Desativar/Configurar por modulo

**Arquivos criados:**
- `models/ModuleConfig.js`
- `routes/module-config-routes.js`
- `public/js/modulos/modulos-api.js`
- `public/js/modulos/modulos-wizard.js`
- `public/js/modulos/modulos-ui.js`

**Arquivos modificados:**
- `index.js` - Registro das novas rotas
- `public/detalhe-liga.html` - Botao e scripts do wizard
- `config/rules/*.json` (12 arquivos) - Secao wizard adicionada

---

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

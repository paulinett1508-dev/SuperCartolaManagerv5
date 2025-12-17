# Tarefas Pendentes - 2025-12-16

## Prioridade ALTA

*Nenhuma tarefa pendente no momento.*

---

## Concluido Nesta Sessao (2025-12-16)

### Sidebar Accordion - Fix (Sessao 3)
- [x] Diagnosticado problema: paginas nao injetavam scripts do layout.html
- [x] `AccordionManager` movido para `window.AccordionManager` (escopo global)
- [x] Adicionada flag `_initialized` para evitar dupla inicializacao
- [x] Event listeners protegidos com `e.preventDefault()` e `e.stopPropagation()`
- [x] Corrigidas 11 paginas/arquivos para injetar scripts + inicializar accordion:
  - gestao-renovacoes.html, ferramentas.html, gerenciar-modulos.html
  - gerir-senhas-participantes.html, ferramentas-rodadas.html
  - gerenciar.html, painel.html, preencher-liga.html
  - js/editar-liga.js, js/criar-liga.js, js/detalhe-liga-orquestrador.js
  - js/core/layout-manager.js

---

### Sessao Anterior
- [x] Separacao de ambientes MongoDB (Prod/Dev)
- [x] Limpeza de 22 scripts obsoletos
- [x] Sistema de Temporadas (`config/seasons.js`)
- [x] Campo `temporada` em todos os models
- [x] Script de migracao (`scripts/migrar-temporada-2025.js`)
- [x] Documentacao (`docs/TEMPORADAS-GUIA.md`)

### Sidebar Accordion
- [x] CSS para accordion em `css/modules/dashboard-redesign.css`
- [x] HTML com estrutura accordion em `layout.html`
- [x] JavaScript com toggle e persistencia localStorage
- [x] Auto-expand baseado na pagina atual

### Tesouraria Geral (Gestao Financeira Centralizada)

**Arquivos criados/modificados:**
- [x] `routes/tesouraria-routes.js` - Nova API completa (350+ linhas)
- [x] `public/gestao-renovacoes.html` - Reformulado como Tesouraria Geral
- [x] `index.js` - Adicionada rota `/api/tesouraria`
- [x] `public/layout.html` - Atualizado link no sidebar

**Funcionalidades:**
- [x] Tabela com TODOS participantes de TODAS ligas
- [x] Saldo Temporada + Saldo Acertos + Saldo Final
- [x] Filtros por liga, situacao (devedor/credor/quitado), busca
- [x] Ordenacao por colunas (clicaveis)
- [x] Modal de acerto (pagamento/recebimento)
- [x] Botao "Zerar Saldo" automatico
- [x] Historico de acertos por participante
- [x] Cards de estatisticas (total a pagar, receber, devedores, credores)

**Endpoints da API:**
- `GET /api/tesouraria/participantes` - Lista todos com saldos
- `GET /api/tesouraria/participante/:ligaId/:timeId` - Detalhes + historico
- `POST /api/tesouraria/acerto` - Registrar acerto
- `DELETE /api/tesouraria/acerto/:id` - Remover acerto
- `GET /api/tesouraria/resumo` - Totais por liga

**Sincronizacao com App:**
- Usa mesmo modelo `AcertoFinanceiro` do extrato
- Cache invalidado automaticamente apos acerto
- Participante ve saldo atualizado no app

---

## Estrutura do Sidebar Atualizada

```
Dashboard (fixo)
├── Ligas (accordion)
│   ├── [Ligas dinamicas]
│   ├── Criar Nova Liga
│   └── Gerenciar Todas
├── Rodadas (accordion)
│   ├── Popular Rodadas
│   └── Parciais ao Vivo
├── Financeiro (accordion)
│   └── Tesouraria Geral  <-- ATUALIZADO
├── Configuracoes (accordion)
│   ├── Gerir Senhas
│   └── Modulos
└── Acessos (accordion)
    ├── App Participante
    └── Hub Ferramentas
```

---

## Como Retomar

Na proxima sessao, execute:
```
/retomar-tarefas
```

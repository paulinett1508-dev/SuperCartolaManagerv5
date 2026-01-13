# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Referencia Rapida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Escudos Disponiveis
- 262 (Flamengo), 263 (Botafogo), 264 (Corinthians), 266 (Fluminense)
- 267 (Vasco), 275 (Palmeiras), 276 (Sao Paulo), 277 (Santos)
- 283 (Cruzeiro), 292 (Sport), 344 (RB Bragantino)
- default.png para clubes sem escudo

---

## Tarefas Pendentes

### Testes Pendentes (Aguardando validacao do usuario)

#### 1. Reteste Fluxo Financeiro 2026
- [ ] Acessar Fluxo Financeiro > aba 2026
- [ ] Verificar coluna Status (PAGO ou DEVE, nao ABATIDO)
- [ ] Testar extrato de Diogo Monte (saldo +R$174)
- [ ] Testar extrato de Paulinett Miranda (saldo R$0)
- [ ] Testar extrato de Felipe Barbosa (saldo -R$180)

#### 2. Testes de Engajamento no App (Participante Premium)
**Usar:** Paulinett Miranda (time_id: 13935277)

- [ ] **Jogos do Dia** - Card deve aparecer na tela inicial com 3 jogos mock
- [ ] **Badge "Preview"** - Deve aparecer indicando que sao dados de teste
- [ ] **Layout** - Card deve estar apos "Inscricao Confirmada"
- [ ] **Outros participantes** - Nao devem ver o card de jogos (nao sao premium)

---

### Referencia - Dados no MongoDB (2026)
| Participante | time_id | Saldo 2026 | Status |
|--------------|---------|------------|--------|
| Lucio | -1767569480236 | -R$180 | Deve |
| Felipe Barbosa | 8098497 | -R$180 | Deve |
| Antonio Luis | 645089 | -R$180 | Deve |
| Paulinett Miranda | 13935277 | R$0 | Pago |
| Diogo Monte | 25371297 | +R$174 | Pago (credito) |

---

## Historico da Sessao 2026-01-13

### Extrato 2026 - Cache Fix
**Status:** CORRIGIDO

**Problema:** Extrato 2026 mostrava dados de 2025 devido a cache persistente no IndexedDB.

**Solucao aplicada:**
- Incrementada versao do IndexedDB de 2 para 3 em `participante-cache.js`
- Quando usuarios acessarem o app, o banco sera recriado automaticamente
- Commit: `fix(cache): incrementa IndexedDB v3 para limpar cache de 2025`

---

## Historico da Sessao 2026-01-11

### Jogos do Dia (Premium) - IMPLEMENTADO

**Feature:** Exibir jogos do Brasileirao na tela inicial do app do participante.

**Arquivos modificados:**
- `routes/jogos-hoje-routes.js` v1.1 - API com mock para pre-temporada
- `public/participante/js/modules/participante-jogos.js` v1.1 - Modulo de jogos
- `public/participante/js/modules/participante-boas-vindas.js` v10.7 - Integracao

**Como funciona:**
- API consulta football-data.org para jogos do Brasileirao
- Em pre-temporada (sem jogos reais), retorna mock para premium
- Premium = time_id 13935277 (Paulinett Miranda)
- Card exibe: mandante vs visitante, horario, status (Em breve/Ao vivo/Encerrado)
- Badge "Preview" aparece quando usa dados mock

**API:**
```
GET /api/jogos-hoje?timeId=13935277
Response: { jogos: [...], premium: true, fonte: "mock"|"api", data: "2026-01-11" }
```

---

## Historico Arquivado

### 2026-01-11 - Seletor de Temporada UX
- **Status:** CONCLUIDO
- **Resumo:** Removido reload que saia da tela, implementada recarga dinamica

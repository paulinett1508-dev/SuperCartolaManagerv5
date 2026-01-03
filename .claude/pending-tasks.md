# Tarefas Pendentes - 2026-01-03

## Contexto da Sessao Atual
**HALL DA FAMA - MELHORIAS E CORRECOES**

Continuacao do trabalho pos-turn-key com foco no Hall da Fama.

---

## Corrigido Nesta Sessao (03/01/2026)

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

## PRIMEIRA TAREFA - Proxima Sessao

**LEITURA MAPEADA DA PASTA /home/runner/workspace/docs**
- Mapear todos os arquivos de documentacao
- Identificar docs desatualizados
- Consolidar informacoes relevantes

---

## Pendencias - Hall da Fama

### ALTA PRIORIDADE

1. **Artilheiro Campeao - SOBRAL**
   - Card nao renderiza para liga Cartoleiros do Sobral
   - Verificar funcao `buscarArtilheiro()` e API `/api/artilheiro-campeao/{ligaId}/ranking`
   - Pode ser problema de modulos_ativos ou dados vazios

2. **Card MELHOR RODADA**
   - Nao mostra dados em alguns casos
   - Verificar funcao `buscarMelhorRodada()` e fallback do tempRecente
   - Pode ser problema de API `/api/rodadas/{ligaId}/rodadas`

3. **Testar Mata-Mata com Adversarios**
   - Verificar se os nomes dos adversarios aparecem apos fix v12.5
   - Testar expansao de edicoes e lista de confrontos

### MEDIA PRIORIDADE

4. **Erros 502 Bad Gateway no Admin**
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
*Atualizado em: 2026-01-03 23:30*
*Hall da Fama v12.5 - Mata-Mata interativo com adversarios*

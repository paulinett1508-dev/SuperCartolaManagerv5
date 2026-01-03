# Tarefas Pendentes - 2026-01-03

## Status das APIs (Verificado 03/01/2026 23:00)

Todas as APIs principais estao funcionando corretamente:

| API | Rota | Status |
|-----|------|--------|
| Artilheiro-Campeao | `/api/artilheiro-campeao/:ligaId/ranking` | OK |
| Mata-Mata | `/api/ligas/:ligaId/mata-mata` | OK (117KB, 5 edicoes) |
| Luva de Ouro | `/api/luva-de-ouro/:ligaId/ranking` | OK |
| Rodadas | `/api/rodadas/:ligaId/rodadas` | OK (1216 rodadas) |
| Historico Participante | `/api/participante/historico/:timeId` | OK |

---

## Pendencias Reais

### MEDIA PRIORIDADE

1. **Verificar frontend Hall da Fama - Cards nao renderizando**
   - APIs funcionam, problema pode ser no JavaScript do cliente
   - Verificar logs do console do navegador
   - Arquivo: `public/participante/js/modules/participante-historico.js`

2. **Erros 502 Bad Gateway no Admin (problema de infraestrutura)**
   - Ocorre intermitentemente no Replit
   - Solucao: Reiniciar servidor pelo painel Replit
   - Arquivos afetados quando ocorre:
     - `js/cards-condicionais.js`
     - `js/luva-de-ouro/luva-de-ouro-scheduler.js`
     - `js/core/sidebar-menu.js`

---

## Proximas Acoes (Temporada 2026)

### Fase 1: Renovacao (ate 27/01/2026)
- [ ] Enviar comunicado de renovacao aos participantes
- [ ] Coletar confirmacoes de renovacao (OPT-IN)
- [ ] Prazo renovacao: **27/01/2026**

### Fase 2: Quitacao (ate 27/01/2026)
- [ ] Cobrar taxas de inscricao
- [ ] Prazo quitacao: **27/01/2026**

### Fase 3: Inicio Temporada (28/01/2026)
- [ ] Mercado Cartola abre: **12/01/2026**
- [ ] **1a RODADA: 28/01/2026**
- [ ] Alterar status para 'ativa' em config/seasons.js

---

## Dados de Teste

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Participante Multi-Liga: Paulinett Miranda
- **timeId:** 13935277
- **Ligas:** SUPERCARTOLA + SOBRAL

---

## Comandos Uteis

```bash
# Testar APIs
curl -s "http://localhost:5000/api/artilheiro-campeao/684d821cf1a7ae16d1f89572/ranking" | head -c 500
curl -s "http://localhost:5000/api/ligas/684cb1c8af923da7c7df51de/mata-mata" | head -c 500
curl -s "http://localhost:5000/api/luva-de-ouro/684d821cf1a7ae16d1f89572/ranking" | head -c 500

# Reiniciar servidor
pkill -f "node.*index.js" && NODE_ENV=development node index.js &
```

---
*Atualizado em: 2026-01-03 23:00*
*APIs verificadas e funcionando*

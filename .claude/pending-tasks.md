# Tarefas Pendentes

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Tarefas Concluidas (2026-01-05)

### Coluna Time do Coracao e Botao WhatsApp

**Status:** CONCLUIDO

**Problemas Identificados e Corrigidos:**

1. **Campo `contato` nao existia no schema**
   - CORRIGIDO: Adicionado `contato: { type: String, default: "" }` em `models/Liga.js`

2. **Funcao `adicionarParticipanteNaLiga` nao salvava `contato` nem `clube_id`**
   - CORRIGIDO: `controllers/inscricoesController.js` agora salva ambos os campos

3. **URL dos escudos estava errada (retornava 404)**
   - URL antiga: `https://s.sde.globo.com/media/organizations/2024/04/01/${id}_45x45.png`
   - CORRIGIDO: Agora usa escudos locais `/escudos/${id}.png`
   - Fallback: `/escudos/default.png`

**Arquivos Modificados:**
- `models/Liga.js` - Adicionado campo `contato` ao participanteSchema
- `controllers/inscricoesController.js` - Funcao `adicionarParticipanteNaLiga` salva `contato` e `clube_id`
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` - URL dos escudos corrigida

**Como testar:**

1. **Coluna Time do Coracao:**
   - Acessar Fluxo Financeiro
   - Verificar se coluna com icone de coracao mostra escudos dos times
   - 32 de 33 participantes tem `clube_id` (apenas "Lucio" nao tem)

2. **Botao WhatsApp:**
   - Para ver o botao, participantes precisam ter campo `contato` preenchido
   - Cadastrar novo participante pelo modal "Novo Participante" (aba Manual) com telefone
   - O botao verde com icone de chat aparecera na coluna Acoes

**API verificada:**
```bash
curl -s "http://localhost:5000/api/tesouraria/liga/684cb1c8af923da7c7df51de?temporada=2025"
# Retorna: clube_id: 262, contato: null (esperado - ninguem tem contato ainda)
```

---

## Referencia Rapida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Participante Multi-Liga (teste)
- **Paulinett Miranda:** timeId `13935277`

### Escudos Disponiveis
- 262 (Flamengo), 263 (Botafogo), 264 (Corinthians), 266 (Fluminense)
- 267 (Vasco), 275 (Palmeiras), 276 (Sao Paulo), 277 (Santos)
- 283 (Cruzeiro), 292 (Sport), 344 (RB Bragantino)
- default.png para clubes sem escudo

---
*Atualizado em: 2026-01-05*

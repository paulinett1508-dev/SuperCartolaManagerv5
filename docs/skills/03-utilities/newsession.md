# Skill: newsession

Handover para nova sessao - carrega contexto do trabalho em andamento e instrui proximos passos.

---

## STATUS ATUAL: Sistema Estável - Pronto para Novos Desenvolvimentos

**Data:** 26/01/2026
**Ultima acao:** Corrigido defaults de módulos na criação de liga

---

## TAREFAS CONCLUÍDAS NESTA SESSÃO

### 1. Bug Criação de Liga - ObjectId Inválido
**Status:** ✅ RESOLVIDO

**Problema:** Erro 500 ao criar liga - `adminId` não era ObjectId válido.

**Solução aplicada:**
- `controllers/ligaController.js:370-425` - Validação defensiva do adminId
- Extrai valor de objetos complexos (`toString()`, `$oid`, `_id`)
- Valida com regex `/^[a-f0-9]{24}$/i` antes de converter
- Fallback para `owner_email` se adminId inválido

**Teste:** Liga "Os Fuleros" criada com sucesso.

---

### 2. Defaults de Módulos na Criação de Liga
**Status:** ✅ RESOLVIDO

**Problema:** Novas ligas vinham com todos os módulos opcionais habilitados, mesmo sem o admin configurá-los.

**Solução aplicada em `models/Liga.js:92-110`:**

```javascript
modulos_ativos: {
    default: {
        // Módulos BASE - sempre habilitados
        extrato: true,
        ranking: true,
        rodadas: true,
        historico: true,
        // Módulos OPCIONAIS - admin habilita conforme necessário
        top10: false,
        melhorMes: false,
        pontosCorridos: false,
        mataMata: false,
        artilheiro: false,
        luvaOuro: false,
        campinho: false,
        dicas: false,
    },
}
```

**Impacto:** Apenas novas ligas. Ligas existentes mantêm configuração atual.

---

## ARQUIVOS MODIFICADOS NESTA SESSÃO

| Arquivo | Mudança |
|---------|---------|
| `controllers/ligaController.js:370-425` | Validação robusta do adminId |
| `models/Liga.js:92-110` | Defaults de módulos (base=true, opcionais=false) |
| `public/preencher-liga.html` | Fetch com credentials + erro detalhado |
| `public/js/criar-liga.js` | Mesma correção |
| `public/layout.html` | Fix SPA navigation (sidebar temporadas) |
| `public/painel.html` | Removida função duplicada carregarLigasSidebar |

---

## PENDÊNCIAS PARA PRÓXIMA SESSÃO

### BUG CRÍTICO: APIs 404 em Liga Nova (Os Fuleros)
**Problema:** Ao acessar liga recém-criada, APIs retornam 404:
```
GET /api/ranking-turno/6977a62071dee12036bb163e?turno=geral&temporada=2026 → 404
GET /api/ranking-cache/6977a62071dee12036bb163e?temporada=2026 → 404
```

**Hipótese:** Sistema pode estar buscando dados de temporada 2025 ou endpoints não existem para ligas novas.

**Logs relevantes:**
- `[RANKING] ⚠️ API de turno não encontrada, usando fallback`
- `[RANKING] 📅 Pré-temporada 2026 - sem dados disponíveis`

**Para investigar:**
1. Verificar rotas em `routes/ranking*.js`
2. Verificar se liga nova precisa de inicialização de cache
3. Confirmar se é comportamento esperado em pré-temporada

**Comando:** `/workflow investigar 404 em APIs de ranking para liga nova`

---

## CONTEXTO DO SISTEMA

### Classificação de Módulos

| Tipo | Módulos | Default |
|------|---------|---------|
| **Base** | extrato, ranking, rodadas, historico | `true` (sempre) |
| **Opcionais** | top10, melhorMes, pontosCorridos, mataMata, artilheiro, luvaOuro, campinho, dicas | `false` (admin configura) |

### Servidor
- Rodando na porta 5000
- NODE_ENV=development

---

**SISTEMA ESTÁVEL** - Pronto para novos desenvolvimentos ou melhorias.

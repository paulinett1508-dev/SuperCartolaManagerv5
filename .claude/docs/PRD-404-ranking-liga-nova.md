# PRD: Fix 404 em APIs de Ranking para Liga Nova

## Resumo Executivo

**Problema:** Liga recém-criada ("Os Fuleros") retorna 404 nas APIs de ranking (`/api/ranking-turno/:ligaId`).

**Causa Raiz:** O serviço `rankingTurnoService.js` retorna `null` quando não existem rodadas processadas para a liga, e o controller converte `null` em HTTP 404.

**Impacto:** Ligas novas ou em pré-temporada não conseguem acessar a tela de ranking no app do participante.

---

## Dados da Liga Afetada

```javascript
{
  "_id": "6977a62071dee12036bb163e",
  "nome": "Os Fuleros",
  "temporada": 2026,
  "ativa": true,
  "criadaEm": "2026-01-26T17:36:32.210Z",
  "participantes": [
    {
      "time_id": 13935277,
      "nome_cartola": "Paulinett Miranda",
      "nome_time": "Urubu Play F.C."
    }
  ],
  "modulos_ativos": {
    "ranking": true,
    // ... outros módulos ativos
  }
}
```

---

## Diagnóstico Técnico

### 1. Fluxo Atual (PROBLEMA)

```
Frontend: /api/ranking-turno/6977a62071dee12036bb163e?turno=geral
    ↓
Controller: getRankingTurno()
    ↓
Service: buscarRankingTurno()
    ↓
Query: Rodada.find({ ligaId, temporada, rodada: { $gte: 1, $lte: 38 } })
    ↓
Resultado: [] (vazio - liga não tem rodadas processadas)
    ↓
Service retorna: null (linha 110-111)
    ↓
Controller: if (!snapshot) return 404 (linha 34-38)
    ↓
Frontend: Exibe "Sem dados para este turno"
```

### 2. Arquivos Envolvidos

| Arquivo | Função | Problema |
|---------|--------|----------|
| `services/rankingTurnoService.js:106-111` | Retorna `null` se não há rodadas | Comportamento esperado, mas sem fallback |
| `controllers/rankingTurnoController.js:34-38` | Converte `null` em 404 | Correto para dados inexistentes |
| `public/participante/js/modules/participante-ranking.js:249-258` | Exibe empty-state | Funciona, mas UX confusa |

### 3. Collections Verificadas

| Collection | Query | Resultado |
|------------|-------|-----------|
| `ligas` | `{nome: "Os Fuleros"}` | 1 documento (liga existe) |
| `rodadas` | `{liga_id: "6977a62071dee12036bb163e"}` | 0 documentos |
| `rankingturnosnapshots` | `{liga_id: "6977a62071dee12036bb163e"}` | 0 documentos |

---

## Análise do Problema

### Por que não há rodadas?

1. **Liga criada em 2026-01-26** (hoje)
2. **Temporada 2026 do Brasileirão NÃO começou** (inicia ~março/abril)
3. **Nenhuma rodada foi processada** para esta liga ainda

### Isso é um BUG ou comportamento esperado?

**É comportamento esperado**, mas a **UX é ruim** para ligas novas:

- O usuário vê "Sem dados para este turno" sem entender o motivo
- Não há indicação de que o campeonato não começou
- A mensagem não orienta o usuário sobre quando terá dados

---

## Soluções Propostas

### Opção A: Melhorar UX no Frontend (RECOMENDADA)

Detectar pré-temporada e exibir mensagem contextualizada.

**Vantagens:**
- Zero mudança no backend
- Não quebra outras funcionalidades
- Implementação simples

**Mudança:**
```javascript
// participante-ranking.js - linha 249-258
if (!data.success || !data.ranking) {
    const isPreTemporada = await verificarPreTemporada();
    const mensagem = isPreTemporada
        ? 'Campeonato ainda não iniciou. Aguarde a rodada 1!'
        : 'Sem dados para este turno';
    const icone = isPreTemporada ? 'schedule' : 'event_busy';

    container.innerHTML = `
        <div class="empty-state">
            <span class="material-icons">${icone}</span>
            <p>${mensagem}</p>
        </div>
    `;
    return;
}
```

### Opção B: Retornar 200 com ranking vazio no Backend

Mudar service para retornar array vazio em vez de `null`.

**Vantagens:**
- Consistência na API (sempre retorna estrutura)
- Frontend não precisa tratar 404

**Desvantagens:**
- Pode mascarar erros reais
- Quebra contrato atual da API

### Opção C: Criar endpoint de status da liga

Novo endpoint `/api/liga/:id/status` que retorna:
- Se tem rodadas processadas
- Próxima rodada esperada
- Estado do campeonato

**Vantagens:**
- Informação rica para frontend
- Reutilizável em outros módulos

**Desvantagens:**
- Mais trabalho de implementação
- Overhead de chamada adicional

---

## Solução Recomendada: Opção A

### Implementação

**Arquivo:** `public/participante/js/modules/participante-ranking.js`

**Mudanças:**
1. Adicionar função `verificarPreTemporada()` que consulta `/api/status-mercado`
2. Modificar tratamento de erro para exibir mensagem contextualizada
3. Usar ícone diferente (`schedule` para pré-temporada, `event_busy` para sem dados)

### Dependências

- `/api/status-mercado` já existe e retorna `temporada` atual da API Cartola
- `CONFIG.isPreparando()` já existe em outros módulos para detectar pré-temporada

---

## Arquivos a Modificar

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `public/participante/js/modules/participante-ranking.js` | Frontend | Melhorar UX para ligas sem rodadas |

---

## Testes Necessários

1. Liga nova (Os Fuleros) - deve exibir mensagem de pré-temporada
2. Liga existente com rodadas - deve funcionar normalmente
3. Liga existente sem rodadas do turno específico - mensagem genérica

---

## Impacto

- **Risco:** Baixo (apenas melhoria de UX)
- **Regressão:** Nenhuma esperada
- **Usuários afetados:** Ligas novas criadas antes do início do campeonato

---

## Próximos Passos

1. ✅ PRD gerado
2. ⏳ Gerar SPEC com mudanças cirúrgicas
3. ⏳ Implementar
4. ⏳ Testar com liga "Os Fuleros"

---

**Gerado em:** 2026-01-26
**Autor:** High Senior Protocol - Fase 1 (Pesquisa)

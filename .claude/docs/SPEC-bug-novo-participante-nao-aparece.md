# SPEC - Bug: Novo Participante Não Aparece na Lista

**Data:** 2026-01-28
**Baseado em:** PRD-bug-novo-participante-nao-aparece.md
**Status:** Especificação Técnica - VALIDADA
**Prioridade:** CRITICAL

---

## Resumo da Implementação

Alterar a rota `POST /api/ligas/:id/participantes` para usar `processarNovoParticipante()` ao invés de `adicionarParticipanteNaLiga()` diretamente. Isso garante que ao adicionar um novo participante via modal, seja criado também o registro em `inscricoestemporada`, permitindo que o participante apareça na lista quando a fonte de dados é essa collection.

---

## Arquivos a Modificar (Ordem de Execução)

### 1. routes/ligas.js - Mudança Primária

**Path:** `routes/ligas.js`
**Tipo:** Modificação
**Impacto:** Alto
**Dependentes:** public/js/participantes.js (apenas verifica response)

#### Mudanças Cirúrgicas:

---

**Linha 33: MODIFICAR IMPORT**

```javascript
// ANTES:
import { adicionarParticipanteNaLiga } from "../controllers/inscricoesController.js";

// DEPOIS:
import { adicionarParticipanteNaLiga, processarNovoParticipante } from "../controllers/inscricoesController.js";
```

**Motivo:** Adicionar import da função que cria InscricaoTemporada junto com os demais registros.

---

**Linhas 1053-1078: SUBSTITUIR BLOCO**

```javascript
// ANTES (linhas 1053-1078):
    // ✅ v2.1: Adicionar participante com TODOS os campos da API Cartola
    await adicionarParticipanteNaLiga(ligaId, {
      time_id: Number(time_id),
      nome_time: nome_time || nome_cartola,
      nome_cartoleiro: nome_cartola,
      escudo: url_escudo_png,
      url_escudo_png: url_escudo_png,
      clube_id: clube_id,
      contato: contato || "",
      // ✅ Campos adicionais (como Paulinett Miranda tem)
      foto_perfil: foto_perfil || "",
      assinante: assinante || false
    }, CURRENT_SEASON);

    console.log(`✅ [LIGAS] Participante ${nome_cartola} (ID: ${time_id}) adicionado à liga ${ligaId}`);

    res.json({
      success: true,
      message: `Participante "${nome_cartola}" adicionado com sucesso!`,
      participante: {
        time_id: Number(time_id),
        nome_time: nome_time || nome_cartola,
        nome_cartola: nome_cartola,
        ativo: true
      }
    });

// DEPOIS:
    // ✅ v2.2: Usar processarNovoParticipante para criar InscricaoTemporada
    const resultado = await processarNovoParticipante(ligaId, CURRENT_SEASON, {
      time_id: Number(time_id),
      nome_time: nome_time || nome_cartola,
      nome_cartoleiro: nome_cartola,
      escudo: url_escudo_png,
      url_escudo_png: url_escudo_png,
      clube_id: clube_id,
      contato: contato || "",
      foto_perfil: foto_perfil || "",
      assinante: assinante || false
    }, {
      pagouInscricao: false,  // Default: taxa de inscrição vira débito no extrato
      aprovadoPor: req.session?.usuario?.email || 'admin',
      observacoes: 'Novo participante adicionado via modal'
    });

    console.log(`✅ [LIGAS] Participante ${nome_cartola} (ID: ${time_id}) adicionado à liga ${ligaId} com inscrição ${resultado.inscricao._id}`);

    res.json({
      success: true,
      message: `Participante "${nome_cartola}" adicionado com sucesso!`,
      participante: {
        time_id: resultado.resumo.timeId,
        nome_time: resultado.resumo.nomeTime,
        nome_cartola: resultado.resumo.nomeCartoleiro,
        ativo: true
      },
      inscricao: {
        id: resultado.inscricao._id,
        status: 'novo',
        saldoInicial: resultado.resumo.saldoInicialTemporada
      }
    });
```

**Motivo:**
1. `processarNovoParticipante` cria registro em `inscricoestemporada` com status 'novo'
2. Cria transações financeiras iniciais (débito da taxa se aplicável)
3. Depois chama `adicionarParticipanteNaLiga` internamente
4. Response inclui dados da inscrição para feedback ao admin

---

## Mapa de Dependências

```
routes/ligas.js (POST /api/ligas/:id/participantes)
    │
    ├─► controllers/inscricoesController.js [USAR processarNovoParticipante]
    │       │
    │       ├─► LigaRules.buscarPorLiga() - Busca taxa de inscrição
    │       ├─► InscricaoTemporada.upsert() - Cria registro
    │       ├─► criarTransacoesIniciais() - Débito da taxa
    │       └─► adicionarParticipanteNaLiga() - Liga.participantes + times
    │
    └─► public/js/participantes.js [NÃO MODIFICAR]
            │
            └─► confirmarNovoParticipante() linha 3661
                  - Já chama carregarParticipantesPorTemporada() após sucesso
                  - Response structure compatível (success, message, participante)
```

---

## Validações de Segurança

### Multi-Tenant
- [x] Rota já protegida por `verificarAdmin` middleware
- [x] `tenantFilter` aplicado em todas rotas de ligas (linha 43)
- [x] `processarNovoParticipante` usa `ligaId` para buscar `LigaRules`

**Queries Afetadas:**
```javascript
// processarNovoParticipante já valida internamente:
const liga = await Liga.findById(ligaId).lean();  // Valida existência
const rules = await LigaRules.buscarPorLiga(ligaId, temporada);  // Valida regras
```

### Autenticação
- [x] Rota protegida: `router.post("/:id/participantes", verificarAdmin, ...)`
- [x] `aprovadoPor` usa `req.session?.usuario?.email` para auditoria

---

## Tratamento de Erros

### Cenário: LigaRules Não Configurada

Se a liga não tiver `LigaRules` configurada para a temporada atual:

```javascript
// processarNovoParticipante linha 625-628:
const rules = await LigaRules.buscarPorLiga(ligaId, temporada);
if (!rules) {
    throw new Error("Regras não configuradas para esta temporada");
}
```

**Comportamento:**
- Backend retorna erro 500 com mensagem "Regras não configuradas para esta temporada"
- Frontend exibe toast de erro

**Mitigação:** A liga SuperCartola (principal) já possui `LigaRules` para 2026 configurada (verificado no MongoDB).

---

## Casos de Teste

### Teste 1: Adicionar Participante com Sucesso
**Setup:** Liga com LigaRules 2026 configurada (taxa: R$180)
**Ação:**
1. Acessar Participantes da liga
2. Clicar "Adicionar Participante"
3. Buscar time por ID (ex: 12345)
4. Clicar "Confirmar"

**Resultado Esperado:**
- Toast "Participante X adicionado com sucesso!"
- Lista atualiza com novo participante
- Console mostra contagem +1
- MongoDB: `db.inscricoestemporada.find({ time_id: 12345, temporada: 2026 })` retorna documento com `status: 'novo'`

### Teste 2: Participante Já Existe
**Setup:** Tentar adicionar participante que já está na liga
**Ação:** Buscar e confirmar time já cadastrado

**Resultado Esperado:**
- Erro 400: "Este time já está cadastrado na liga"
- Lista permanece inalterada

### Teste 3: Liga Sem Regras Configuradas
**Setup:** Liga nova sem LigaRules
**Ação:** Tentar adicionar participante

**Resultado Esperado:**
- Erro 500: "Regras não configuradas para esta temporada"
- Toast de erro no frontend
- Participante NÃO é adicionado

### Teste 4: Verificar Débito da Taxa
**Setup:** Liga com taxa R$180, pagouInscricao=false (default)
**Ação:** Adicionar participante e verificar extrato

**Resultado Esperado:**
- `inscricoestemporada.saldo_inicial_temporada` = -180
- `fluxofinanceirocampos` tem registro de débito da taxa

---

## Rollback Plan

### Em Caso de Falha

**Passos de Reversão:**
1. Reverter import na linha 33:
   ```javascript
   import { adicionarParticipanteNaLiga } from "../controllers/inscricoesController.js";
   ```
2. Reverter bloco linhas 1053-1078 para versão anterior
3. Restart do servidor

**Dados Criados:**
- Se algum participante foi adicionado com a nova versão, ele terá registro em `inscricoestemporada`
- Não há necessidade de remover esses registros (são válidos)

---

## Checklist de Validação

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudanças cirúrgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Verificações de Código
- [x] `processarNovoParticipante` está exportada (linha 595 named, linha 1237 default)
- [x] Função já valida duplicidade internamente (linha 617-621)
- [x] Função já trata cadastro manual (ID negativo)
- [x] Response compatível com frontend existente
- [x] Linhas verificadas no código atual (28/01/2026)

---

## Ordem de Execução

1. **Backend:**
   - [ ] Modificar import em routes/ligas.js (linha 33)
   - [ ] Substituir bloco de adição (linhas 1053-1078)

2. **Teste Manual:**
   - [ ] Adicionar participante em liga 2026
   - [ ] Verificar que aparece na lista
   - [ ] Verificar registro em `inscricoestemporada`
   - [ ] Verificar extrato financeiro

3. **Validação de Regressão:**
   - [ ] Renovação de participante existente funciona
   - [ ] Fluxo de não-renovação funciona
   - [ ] Modal de busca continua funcionando

---

## Observações Adicionais

### Participantes Já Adicionados com Bug
Participantes adicionados antes desta correção NÃO terão registro em `inscricoestemporada`. Para esses casos:

**Opção 1 (Recomendada):** Script de migração retroativa
```javascript
// scripts/fix-participantes-sem-inscricao.js
// Criar InscricaoTemporada para participantes em liga.participantes
// que não têm registro correspondente em inscricoestemporada
```

**Opção 2:** Aceitar que esses participantes só aparecem quando a fonte é `liga.participantes` (temporadas < 2026 ou antes de existirem inscrições)

### Enhancement Futuro
O campo `pagouInscricao` está hardcoded como `false`. Em versão futura, pode-se adicionar checkbox no modal para o admin marcar se o participante já pagou a taxa no ato da inscrição.

---

## Próximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code SPEC-bug-novo-participante-nao-aparece.md
```

---

**Gerado por:** Spec Protocol v1.0
**High Senior Protocol - Fase 2 (Specification)
**Última Validação:** 2026-01-28

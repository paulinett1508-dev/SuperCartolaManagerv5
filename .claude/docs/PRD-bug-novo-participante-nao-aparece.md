# PRD: Bug - Novo Participante Não Aparece na Lista

**Data:** 2026-01-28
**Tipo:** Bug Fix
**Prioridade:** CRITICAL
**Versão:** 1.0

---

## 1. Resumo Executivo

### Problema
Participante inserido via modal "Adicionar novo participante" não aparece na lista de participantes após ser adicionado. O problema ocorre em ligas com temporada 2026+ que já possuem inscrições na collection `inscricoestemporada`.

### Evidência
Console do usuário:
```
[PARTICIPANTES] Recebidos 33 de 2026 (fonte: inscricoestemporada)
[PARTICIPANTES] Stats: {total: 33, ativos: 30, renovados: 29, pendentes: 0, nao_participa: 3}
```
Após inserir novo participante, a lista continua com 33 participantes.

### Causa Raiz
O `POST /api/ligas/:id/participantes` chama `adicionarParticipanteNaLiga()` diretamente, que:
- ✅ Insere em `liga.participantes` (embedded array)
- ✅ Insere/atualiza em collection `times`
- ❌ **NÃO cria registro em `inscricoestemporada`**

Quando o GET carrega participantes para temporada 2026, detecta que existem inscrições e consulta **APENAS** `inscricoestemporada`, ignorando o novo participante.

---

## 2. Análise Técnica

### 2.1 Fluxo Atual (COM BUG)

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: participantes.js                                      │
├─────────────────────────────────────────────────────────────────┤
│ 1. confirmarNovoParticipante() - linha 3661                     │
│ 2. POST /api/ligas/{ligaId}/participantes                       │
│ 3. carregarParticipantesPorTemporada(temporadaSelecionada)      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: routes/ligas.js (linha 1011-1087)                      │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/ligas/:id/participantes                               │
│   │                                                             │
│   └─► adicionarParticipanteNaLiga() ← PROBLEMA!                 │
│         │                                                       │
│         ├─► liga.participantes.push() ✅                        │
│         └─► Time.findOneAndUpdate() ✅                          │
│                                                                 │
│   ❌ NÃO CRIA: InscricaoTemporada                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo do GET (Por que não aparece)

```
┌─────────────────────────────────────────────────────────────────┐
│ GET /api/ligas/:id/participantes?temporada=2026                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. temporadaFiltro >= 2026? → SIM                               │
│ 2. Existem inscrições 2026? → SIM (33 participantes)            │
│ 3. usarInscricoes = true                                        │
│ 4. fonte = "inscricoestemporada"                                │
│                                                                 │
│ 5. InscricaoTemporada.find({ liga_id, temporada: 2026 })        │
│    → Retorna 33 documentos                                      │
│                                                                 │
│ ❌ Novo participante NÃO TEM documento em inscricoestemporada   │
│ ❌ Logo, NÃO aparece na lista                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Fluxo Correto (SOLUÇÃO)

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/ligas/:id/participantes (CORRIGIDO)                   │
├─────────────────────────────────────────────────────────────────┤
│   │                                                             │
│   └─► processarNovoParticipante() ← CORRETO!                    │
│         │                                                       │
│         ├─► InscricaoTemporada.upsert() ✅                      │
│         │     status: 'novo'                                    │
│         │     origem: 'novo_cadastro'                           │
│         │                                                       │
│         ├─► criarTransacoesIniciais() ✅                        │
│         │     (débito da taxa se não pagou)                     │
│         │                                                       │
│         └─► adicionarParticipanteNaLiga() ✅                    │
│               (liga.participantes + times)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Arquivos Afetados

### 3.1 Backend (Modificar)

| Arquivo | Linhas | Mudança |
|---------|--------|---------|
| `routes/ligas.js` | 1009-1087 | Trocar chamada de `adicionarParticipanteNaLiga()` para `processarNovoParticipante()` |

### 3.2 Controller (Referência - NÃO modificar)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `controllers/inscricoesController.js` | 595-722 | `processarNovoParticipante()` - Já existe e está correta |

### 3.3 Frontend (Verificar)

| Arquivo | Linhas | Ação |
|---------|--------|------|
| `public/js/participantes.js` | 3661-3700 | Verificar se passa temporada correta no body |

---

## 4. Mudanças Propostas

### 4.1 Mudança Principal: routes/ligas.js

**DE (Linha 1054-1065):**
```javascript
await adicionarParticipanteNaLiga(ligaId, {
    time_id: Number(time_id),
    nome_time: nome_time || nome_cartola,
    nome_cartoleiro: nome_cartola,
    escudo: url_escudo_png,
    url_escudo_png: url_escudo_png,
    clube_id: clube_id,
    contato: contato || "",
    foto_perfil: foto_perfil || "",
    assinante: assinante || false
}, CURRENT_SEASON);
```

**PARA:**
```javascript
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
    pagouInscricao: false,  // Default: taxa vira débito
    aprovadoPor: req.session?.usuario?.email || 'admin',
    observacoes: 'Novo participante via modal'
});
```

### 4.2 Import Necessário

**Adicionar no topo de routes/ligas.js:**
```javascript
import { processarNovoParticipante } from "../controllers/inscricoesController.js";
```

### 4.3 Atualizar Response

**DE:**
```javascript
res.json({
    success: true,
    message: `Participante "${nome_cartola}" adicionado com sucesso!`,
    participante: { ... }
});
```

**PARA:**
```javascript
res.json({
    success: true,
    message: `Participante "${nome_cartola}" adicionado com sucesso!`,
    participante: resultado.resumo,
    inscricao: {
        id: resultado.inscricao._id,
        status: 'novo',
        saldoInicial: resultado.resumo.saldoInicialTemporada
    }
});
```

---

## 5. Impactos e Riscos

### 5.1 Impactos Positivos
- ✅ Novo participante aparece imediatamente na lista
- ✅ Transações financeiras são criadas corretamente
- ✅ Consistência entre `liga.participantes`, `times` e `inscricoestemporada`

### 5.2 Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| LigaRules não configurada para liga/temporada | `processarNovoParticipante` já trata: "Regras não configuradas" |
| Erro em qualquer etapa deixa dados inconsistentes | A função já tem tratamento interno, mas considerar transaction |
| Campo `pagouInscricao` não é perguntado ao admin | Pode adicionar checkbox no modal futuramente (enhancement) |

### 5.3 Participantes Já Adicionados com Bug
Participantes adicionados antes da correção **não terão** inscrição em `inscricoestemporada`. Opções:
1. Script de migração para criar inscrições faltantes
2. Aceitar que só aparecem quando fonte é `liga.participantes`

---

## 6. Critérios de Aceite

- [ ] Ao adicionar participante via modal, ele aparece imediatamente na lista
- [ ] Console mostra contagem correta (+1 participante)
- [ ] `inscricoestemporada` contém documento com `status: 'novo'`
- [ ] Extrato financeiro do novo participante mostra débito da taxa (se aplicável)
- [ ] Não quebra fluxo de renovação existente

---

## 7. Testes Recomendados

### 7.1 Teste Manual
1. Acessar liga SuperCartola (2026)
2. Clicar "Adicionar Participante"
3. Buscar um time por ID ou nome
4. Confirmar adição
5. Verificar que aparece na lista imediatamente
6. Verificar no MongoDB: `db.inscricoestemporada.find({ time_id: [novo_id] })`

### 7.2 Verificação de Regressão
1. Testar renovação de participante existente
2. Testar fluxo de não renovação
3. Testar adição de participante que já existe (deve dar erro)

---

## 8. Próximos Passos

1. **SPEC:** Detalhar mudanças linha por linha em `routes/ligas.js`
2. **CODE:** Implementar mudanças cirúrgicas
3. **TEST:** Validar em ambiente de desenvolvimento
4. **DEPLOY:** Publicar correção

---

**Gerado por:** High Senior Protocol - Fase 1 (Pesquisa)
**Próxima Fase:** /spec PRD-bug-novo-participante-nao-aparece.md

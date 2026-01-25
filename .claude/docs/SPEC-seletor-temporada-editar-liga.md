# SPEC - Seletor de Temporada em editar-liga.html

**Data:** 25/01/2026
**Baseado em:** PRD-seletor-temporada-editar-liga.md
**Status:** Especificacao Tecnica

---

## Resumo da Implementacao

A API `/api/ligas/:id/temporadas` retorna apenas `[2025]` quando nao existem registros na collection `inscricoestemporada`, causando ocultacao das tabs de temporada em editar-liga.html. A solucao e incluir `CURRENT_SEASON` (2026) na lista de temporadas disponiveis mesmo sem inscricoes, permitindo que as tabs sejam renderizadas e o admin alterne entre temporadas.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. routes/ligas.js - Mudanca Primaria (Backend)

**Path:** `routes/ligas.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** `public/js/editar-liga.js`, `public/js/participantes.js`, `public/js/fluxo-financeiro/*`

#### Mudancas Cirurgicas:

**Linha 748: MODIFICAR**
```javascript
// ANTES:
    const disponiveis = [...new Set([temporadaBase, ...temporadasInscricoes])]
      .sort((a, b) => b - a);

// DEPOIS:
    // ✅ v2.0: Incluir CURRENT_SEASON mesmo sem inscricoes para permitir navegacao
    const disponiveis = [...new Set([temporadaBase, CURRENT_SEASON, ...temporadasInscricoes])]
      .sort((a, b) => b - a);
```
**Motivo:** Garante que a temporada atual (2026) sempre apareca na lista de disponiveis, mesmo quando a collection `inscricoestemporada` esta vazia. Isso permite que as tabs sejam renderizadas no frontend.

---

### 2. public/js/editar-liga.js - Ajuste de Fallback (Frontend)

**Path:** `public/js/editar-liga.js`
**Tipo:** Modificacao
**Impacto:** Baixo
**Dependentes:** Nenhum (arquivo final da cadeia)

#### Mudancas Cirurgicas:

**Linha 82: MODIFICAR**
```javascript
// ANTES:
        if (this.temporadasDisponiveis.length <= 1) {
            container.style.display = 'none';
            return;
        }

// DEPOIS:
        // ✅ v2.0: Mostrar tabs mesmo com 2 temporadas (2025 e 2026)
        // Ocultar apenas se realmente so existe 1 temporada
        if (this.temporadasDisponiveis.length < 2) {
            container.style.display = 'none';
            return;
        }
```
**Motivo:** A condicao `<= 1` oculta as tabs quando ha exatamente 2 temporadas (2025 e 2026). Mudando para `< 2` garante que as tabs aparecam quando houver 2 ou mais opcoes.

---

## Mapa de Dependencias

```
routes/ligas.js (GET /api/ligas/:id/temporadas)
    |
    |-> public/js/editar-liga.js [carregarTemporadas()]
    |       |-> renderizarSeletorTemporada()
    |       |-> mudarTemporada()
    |
    |-> public/js/participantes.js [inicializarTemporadas()]
    |       (NAO MODIFICAR - ja funciona corretamente)
    |
    |-> public/js/fluxo-financeiro/* [window.mudarTemporada()]
            (NAO MODIFICAR - tabs hardcoded para 2025/2026)
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] A rota `/api/ligas/:id/temporadas` ja filtra por `liga_id`
- [x] Todas as queries subsequentes incluem `liga_id`
- [x] Verificado isolamento entre ligas

**Queries Afetadas:**
```javascript
// routes/ligas.js - Linha 743-745 (JA VALIDADO)
const temporadasInscricoes = await InscricaoTemporada.distinct("temporada", {
  liga_id: new mongoose.Types.ObjectId(ligaId),
});
```

### Autenticacao
- [x] Rota de leitura (GET) nao requer autenticacao admin
- [x] Rotas de modificacao ja protegidas com `verificarAdmin`

---

## Casos de Teste

### Teste 1: Liga SEM inscricoes 2026 (Cenario Atual Bugado)
**Setup:** Liga com `temporada: 2025`, collection `inscricoestemporada` vazia
**Acao:** Acessar `/api/ligas/:id/temporadas`
**Resultado Esperado (ANTES):** `disponiveis: [2025]` - tabs NAO aparecem
**Resultado Esperado (DEPOIS):** `disponiveis: [2026, 2025]` - tabs APARECEM

### Teste 2: Liga COM inscricoes 2026 parciais
**Setup:** Liga com alguns participantes em `inscricoestemporada` para 2026
**Acao:** Acessar `/api/ligas/:id/temporadas`
**Resultado Esperado:** `disponiveis: [2026, 2025]` - comportamento inalterado

### Teste 3: Navegacao entre temporadas
**Setup:** Tabs visiveis com 2025 e 2026
**Acao:** Clicar em cada tab alternadamente
**Resultado Esperado:**
- Tab 2025: Carrega participantes de `liga.participantes`
- Tab 2026: Carrega participantes de `liga.participantes` com status "pendente" (fallback)

### Teste 4: Edicao de participante em temporada
**Setup:** Tabs visiveis, temporada 2025 selecionada
**Acao:** Editar clube do coracao de um participante
**Resultado Esperado:** Alteracao salva em `liga.participantes` (comportamento legado)

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Nenhuma alteracao de banco necessaria (mudanca apenas em logica)

### Verificacao de Rollback
Apos reverter, confirmar que:
- Tabs NAO aparecem para ligas sem inscricoes 2026 (comportamento anterior)

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Durante Implementacao
- [ ] Backend primeiro (routes/ligas.js)
- [ ] Frontend depois (editar-liga.js)
- [ ] Testar em ambiente local

### Apos Implementacao
- [ ] Verificar que tabs aparecem em editar-liga.html
- [ ] Verificar que navegacao entre 2025/2026 funciona
- [ ] Verificar que outras paginas (participantes.html, fluxo-financeiro) nao quebraram

---

## Ordem de Execucao (Critico)

1. **Backend primeiro:**
   - `routes/ligas.js` (linha 748)

2. **Frontend depois:**
   - `public/js/editar-liga.js` (linha 82)

3. **Testes:**
   - Acessar editar-liga.html com liga de teste
   - Verificar tabs 2025/2026 visiveis
   - Alternar entre temporadas
   - Verificar listagem de participantes em cada temporada

---

## Notas Adicionais

### Por que NAO modificar participantes.js?
O arquivo `participantes.js` ja usa a condicao correta:
```javascript
if (temporadasDisponiveis.length === 1) {
    container.style.display = "none";
    return;
}
```
Com a mudanca no backend, `disponiveis` retornara `[2026, 2025]` (length = 2), entao as tabs serao exibidas corretamente.

### Por que NAO modificar fluxo-financeiro?
O fluxo-financeiro usa tabs hardcoded para 2025/2026 (linha 641-652 de fluxo-financeiro-ui.js), nao depende da API de temporadas para renderizar as tabs. A mudanca no backend nao afeta esse modulo.

### Impacto em Pre-Temporada
Durante pre-temporada (API Cartola retorna `temporada: 2025`), a mudanca permite que o admin:
1. Veja participantes de 2025 (dados reais)
2. Veja participantes de 2026 (status "pendente" ou dados de inscricoes se existirem)

Isso e o comportamento desejado conforme documentado no PRD.

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-seletor-temporada-editar-liga.md
```

---

**Gerado por:** Spec Protocol v1.0

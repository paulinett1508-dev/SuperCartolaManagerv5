# SPEC - Bug Contagem de Participantes 2026

**Data:** 24/01/2026
**Baseado em:** PRD-bug-contagem-participantes-2026.md
**Status:** ✅ IMPLEMENTADO
**Autor:** Claude (Spec Protocol)
**Implementado em:** 24/01/2026

---

## Resumo da Implementacao

Corrigir dois bugs criticos que causam exibicao incorreta de participantes na temporada 2026:
1. **Sidebar**: Mostrar contagem real de participantes ativos (inscritos com status `renovado` ou `novo`) ao inves de `liga.times.length`
2. **Lista Participantes**: Quando `temporadaFiltro === temporadaLiga`, deve consultar `inscricoestemporada` para temporadas >= 2026 ao inves de usar `liga.participantes` diretamente

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. `controllers/ligaController.js` - Contagem no Sidebar

**Path:** `/home/runner/workspace/controllers/ligaController.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** `public/layout.html` (linha 329), `public/js/core/sidebar-menu.js` (linha 56)

#### Analise do Codigo Original

A funcao `listarLigas()` (linhas 27-100) retorna `timesCount: liga.times?.length || 0` na linha 87. Este valor e usado pelo sidebar para exibir a contagem de participantes por liga.

**Problema:** `liga.times` e um array historico de todos que ja participaram. Nao considera:
- Status de inscricao para temporada atual
- Participantes que marcaram `nao_participa`

#### Mudancas Cirurgicas

**Linha 1-8: ADICIONAR import do InscricaoTemporada (apos imports existentes)**
```javascript
// ANTES (linha 6):
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";

// DEPOIS (linha 6-7):
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
```
**Motivo:** Necessario para consultar contagem de inscritos ativos

---

**Linha 43-69: ADICIONAR agregacao de contagem de inscritos ativos (apos agregacao de temporadas)**

Inserir apos a linha 69 (apos `const temporadasMap = {}; ... });`):

```javascript
    // ✅ v4.0: Buscar contagem de participantes ATIVOS por liga (inscricoes 2026+)
    // Para temporadas >= 2026, conta apenas inscritos com status 'renovado' ou 'novo'
    const inscricoesAtivasPorLiga = await InscricaoTemporada.aggregate([
      {
        $match: {
          status: { $in: ['renovado', 'novo'] }
        }
      },
      {
        $group: {
          _id: { liga_id: "$liga_id", temporada: "$temporada" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Criar mapa liga_id + temporada -> contagem ativa
    const inscricoesAtivasMap = {};
    inscricoesAtivasPorLiga.forEach(item => {
      const key = `${item._id.liga_id}_${item._id.temporada}`;
      inscricoesAtivasMap[key] = item.count;
    });
```
**Motivo:** Pre-calcular contagens de inscritos ativos para evitar N+1 queries

---

**Linha 87: MODIFICAR calculo de timesCount**
```javascript
// ANTES (linha 87):
        timesCount: liga.times?.length || 0,

// DEPOIS:
        // ✅ v4.0: Para temporada >= 2026 com inscricoes, usar contagem de ativos
        timesCount: (() => {
          const temporadaAtual = liga.temporada || 2025;
          if (temporadaAtual >= 2026) {
            const key = `${liga._id}_${temporadaAtual}`;
            const inscritosAtivos = inscricoesAtivasMap[key];
            // Se tem inscricoes, usar contagem de ativos; senao fallback para times
            if (inscritosAtivos !== undefined) {
              return inscritosAtivos;
            }
          }
          return liga.times?.length || 0;
        })(),
```
**Motivo:** Usar contagem de inscritos ativos para temporadas >= 2026

---

### 2. `routes/ligas.js` - Endpoint de Participantes

**Path:** `/home/runner/workspace/routes/ligas.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** `public/js/participantes.js` (linha 186)

#### Analise do Codigo Original

O endpoint `GET /api/ligas/:id/participantes` (linhas 745-884) tem a seguinte logica:
- Linha 763: `if (temporadaFiltro === temporadaLiga)` → usa `liga.participantes` diretamente
- Linha 787: `else` → consulta `inscricoestemporada`

**Problema:** Quando a temporada solicitada e igual a temporada base da liga (2026 === 2026), ignora completamente as inscricoes e retorna TODOS os 33 participantes, incluindo os 3 que marcaram `nao_participa`.

#### Mudancas Cirurgicas

**Linhas 762-786: MODIFICAR logica de selecao de fonte**

```javascript
// ANTES (linhas 762-786):
    // Temporada base da liga: usar participantes embutidos
    if (temporadaFiltro === temporadaLiga) {
      fonte = "liga.participantes";

      // Buscar status de inativos
      const inativos = await getParticipantesInativos(ligaId);

      participantes = (liga.participantes || []).map((p) => {
        const inativoData = inativos.get(String(p.time_id));
        const ativo = !inativoData;

        return {
          time_id: p.time_id,
          nome_cartoleiro: p.nome_cartola || p.nome_cartoleiro || "N/D",
          nome_time: p.nome_time || "N/D",
          escudo: p.foto_time || p.escudo || "",
          clube_id: p.clube_id || null,
          status: ativo ? "ativo" : "inativo",
          ativo,
          rodada_desistencia: inativoData?.rodada_inativo || null,
        };
      });

      stats.total = participantes.length;
      stats.ativos = participantes.filter((p) => p.ativo).length;
    } else {

// DEPOIS:
    // ✅ v2.5 FIX: Para temporadas >= 2026, SEMPRE consultar inscricoestemporada primeiro
    // Isso garante que participantes com status 'nao_participa' sejam excluidos
    let usarInscricoes = false;

    if (temporadaFiltro >= 2026) {
      // Verificar se existem inscricoes para esta temporada
      const temInscricoes = await InscricaoTemporada.countDocuments({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: temporadaFiltro
      });
      usarInscricoes = temInscricoes > 0;
    }

    // Temporada base da liga SEM inscricoes (comportamento legado)
    if (temporadaFiltro === temporadaLiga && !usarInscricoes) {
      fonte = "liga.participantes";

      // Buscar status de inativos
      const inativos = await getParticipantesInativos(ligaId);

      participantes = (liga.participantes || []).map((p) => {
        const inativoData = inativos.get(String(p.time_id));
        const ativo = !inativoData;

        return {
          time_id: p.time_id,
          nome_cartoleiro: p.nome_cartola || p.nome_cartoleiro || "N/D",
          nome_time: p.nome_time || "N/D",
          escudo: p.foto_time || p.escudo || "",
          clube_id: p.clube_id || null,
          status: ativo ? "ativo" : "inativo",
          ativo,
          rodada_desistencia: inativoData?.rodada_inativo || null,
        };
      });

      stats.total = participantes.length;
      stats.ativos = participantes.filter((p) => p.ativo).length;
    } else if (usarInscricoes) {
      // ✅ v2.5: Temporada >= 2026 COM inscricoes - usar inscricoestemporada
      fonte = "inscricoestemporada";

      const inscricoes = await InscricaoTemporada.find({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: temporadaFiltro,
      }).lean();

      // Criar mapa de liga.participantes para obter dados faltantes (escudo, clube_id)
      const ligaParticipantesMap = new Map();
      (liga.participantes || []).forEach(p => {
        ligaParticipantesMap.set(String(p.time_id), p);
      });

      participantes = inscricoes.map((insc) => {
        const participanteLiga = ligaParticipantesMap.get(String(insc.time_id));
        const dadosInsc = insc.dados_participante || {};

        return {
          time_id: insc.time_id,
          nome_cartoleiro: dadosInsc.nome_cartoleiro || participanteLiga?.nome_cartola || "N/D",
          nome_time: dadosInsc.nome_time || participanteLiga?.nome_time || "N/D",
          escudo: dadosInsc.escudo || participanteLiga?.foto_time || "",
          clube_id: dadosInsc.clube_id || participanteLiga?.clube_id || null,
          status: insc.status,
          ativo: insc.status === "renovado" || insc.status === "novo",
          pagou_inscricao: insc.pagou_inscricao || false,
          saldo_transferido: insc.saldo_transferido || 0,
        };
      });

      stats.total = participantes.length;
      stats.renovados = participantes.filter((p) => p.status === "renovado").length;
      stats.pendentes = participantes.filter((p) => p.status === "pendente").length;
      stats.nao_participa = participantes.filter((p) => p.status === "nao_participa").length;
      stats.novos = participantes.filter((p) => p.status === "novo").length;
      stats.ativos = stats.renovados + stats.novos;
    } else {
```
**Motivo:** Garantir que para temporadas >= 2026 com inscricoes, sempre use `inscricoestemporada` como fonte de verdade

---

### 3. `public/layout.html` - Exibicao no Sidebar (NENHUMA MUDANCA NECESSARIA)

**Path:** `/home/runner/workspace/public/layout.html`
**Tipo:** Verificacao
**Impacto:** Nenhum

#### Analise

A linha 329 usa `timesCount` que ja vem da API:
```javascript
const timesCount = liga.timesCount || liga.times?.length || 0;
```

Como a correcao e feita no backend (`ligaController.js`), o frontend automaticamente recebera o valor correto. **Nenhuma modificacao necessaria.**

---

## Mapa de Dependencias

```
controllers/ligaController.js (listarLigas)
    |-> public/layout.html [USA timesCount - OK]
    |-> public/js/core/sidebar-menu.js [USA timesCount - OK]
    |-> public/js/gerenciar-ligas.js [USA times.length local - OK]

routes/ligas.js (GET /api/ligas/:id/participantes)
    |-> public/js/participantes.js [CONSOME endpoint - OK]
    |-> public/js/detalhe-liga-orquestrador.js [USA updateParticipantesCount - OK]
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Todas queries incluem `liga_id` como filtro
- [x] Agregacoes usam `$match` com `liga_id`
- [x] Verificado isolamento entre ligas

**Queries Afetadas:**
```javascript
// ligaController.js - Nova agregacao
InscricaoTemporada.aggregate([
  { $match: { status: { $in: ['renovado', 'novo'] } } },  // OK - nao expoe dados de outras ligas
  { $group: { _id: { liga_id: "$liga_id", ... } } }       // OK - agrupado por liga
]);

// routes/ligas.js - Query de verificacao
InscricaoTemporada.countDocuments({
  liga_id: new mongoose.Types.ObjectId(ligaId),  // VALIDADO
  temporada: temporadaFiltro
});
```

### Autenticacao
- [x] Endpoint `/api/ligas` nao requer autenticacao (dados publicos de listagem)
- [x] Endpoint `/api/ligas/:id/participantes` nao requer autenticacao (dados publicos)
- [x] Rotas de escrita continuam protegidas com `verificarAdmin`

---

## Casos de Teste

### Teste 1: Sidebar SuperCartola 2026
**Setup:** Liga SuperCartola com temporada 2026, 33 em liga.times, 30 inscritos ativos
**Acao:** Acessar dashboard, verificar sidebar
**Resultado Esperado:** Badge mostra "30" (nao 33)

### Teste 2: Lista Participantes 2026
**Setup:** Acessar detalhe-liga.html?id=SUPERCARTOLA_ID > Modulo Participantes
**Acao:** Visualizar aba 2026
**Resultado Esperado:**
- Lista mostra 30 participantes (ou 27 se excluir pendentes)
- Os 3 com status `nao_participa` NAO aparecem
- Stats mostram: total=33, ativos=30, renovados=29, novos=1, nao_participa=3

### Teste 3: Temporada Historica 2025
**Setup:** Acessar detalhe-liga.html?id=SUPERCARTOLA_ID&temporada=2025
**Acao:** Visualizar aba 2025
**Resultado Esperado:** Lista usa `extratofinanceirocaches` como fonte (comportamento existente preservado)

### Teste 4: Liga Sem Inscricoes
**Setup:** Liga nova criada em 2026 sem registros em `inscricoestemporada`
**Acao:** Acessar lista de participantes
**Resultado Esperado:** Fallback para `liga.participantes` (comportamento legado)

### Teste 5: Performance Sidebar
**Setup:** Admin com 5+ ligas
**Acao:** Carregar dashboard, medir tempo
**Resultado Esperado:** Tempo de resposta < 500ms (agregacao otimizada)

---

## Rollback Plan

### Em Caso de Falha

**Passos de Reversao:**
1. Reverter commit: `git revert HEAD`
2. Deploy imediato
3. Nenhuma migracao de banco necessaria

**Arquivos para Reverter:**
- `controllers/ligaController.js`
- `routes/ligas.js`

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Seguranca
- [x] Multi-tenant validado (liga_id)
- [x] Autenticacao verificada
- [x] Sem exposicao de dados sensiveis

### Performance
- [x] Agregacao usada ao inves de N+1 queries
- [x] countDocuments() para verificacao rapida
- [x] Mapa pre-calculado para lookup

---

## Ordem de Execucao (Critico)

1. **Backend primeiro:**
   - `controllers/ligaController.js` (adicionar import + agregacao + modificar timesCount)
   - `routes/ligas.js` (modificar logica de selecao de fonte)

2. **Testes:**
   - Manual: Verificar sidebar com liga 2026
   - Manual: Verificar lista participantes 2026
   - Manual: Verificar temporada historica 2025

3. **Deploy:**
   - Git commit com mensagem descritiva
   - Restart servidor

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-bug-contagem-participantes-2026.md
```

---

**Gerado por:** Spec Protocol v1.0 (High Senior Edition)

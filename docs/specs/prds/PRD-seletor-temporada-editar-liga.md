# PRD - Seletor de Temporada em editar-liga.html

**Data:** 25/01/2026
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

A pagina `editar-liga.html` precisa de um seletor de temporada (tabs 2025/2026) para permitir ao admin visualizar e editar participantes de diferentes temporadas. Atualmente a pagina carrega apenas os participantes da temporada base da liga (2025) via `liga.participantes`, sem distincao de temporada.

O modal financeiro (`fluxo-financeiro`) JA possui essa funcionalidade atraves de `window.temporadaAtual` e APIs com filtro `?temporada=`, mas **editar-liga.html** nao implementa essa logica.

---

## Contexto e Analise

### Problema Identificado

1. **Tabs 2025/2026 nao renderizam** na pagina editar-liga.html
2. **Causa raiz:** A API `/api/ligas/:id/temporadas` depende da collection `inscricoestemporada` que esta VAZIA
3. **Resultado:** O array `disponiveis` retorna apenas `[2025]` (temporada base da liga)

### Fonte de Dados - Fluxo Atual

| Componente | API | Fonte de Dados |
|------------|-----|----------------|
| Modal Financeiro | `/api/inscricoes/:ligaId/2026` | Collection `inscricoestemporada` |
| editar-liga.html | `/api/ligas/:id/participantes?temporada=X` | `inscricoestemporada` OU `liga.participantes` |
| Temporadas disponiveis | `/api/ligas/:id/temporadas` | `InscricaoTemporada.distinct("temporada")` |

### Descobertas Criticas

1. **Collection `inscricoestemporada` VAZIA:**
   - Model existe: `models/InscricaoTemporada.js`
   - Routes existem: `routes/inscricoes-routes.js`
   - Mas **nenhuma inscricao foi criada** ainda para 2026

2. **Como fluxo-financeiro mostra participantes 2026?**
   - Usa `/api/inscricoes/:ligaId/2026` que retorna lista mesmo se vazia
   - Mostra participantes de `liga.participantes` com badge "Pendente" para quem nao decidiu
   - O fluxo-financeiro-cache.js carrega via `carregarInscricoes2026()`

3. **Por que tabs nao renderizaram?**
   - A funcao `carregarTemporadas()` faz fetch de `/api/ligas/:id/temporadas`
   - API retorna `disponiveis: [2025]` porque `InscricaoTemporada.distinct("temporada")` = []
   - Condicao `if (this.temporadasDisponiveis.length <= 1) return` impede render

---

## Arquivos Identificados

### Backend (APIs existentes - NAO modificar)
- `routes/ligas.js:731-760` - GET `/api/ligas/:id/temporadas`
- `routes/ligas.js:762-860` - GET `/api/ligas/:id/participantes?temporada=X`
- `routes/inscricoes-routes.js` - API completa de inscricoes
- `models/InscricaoTemporada.js` - Model com metodos estaticos

### Frontend (A MODIFICAR)
- `public/editar-liga.html` - Pagina principal
- `public/js/editar-liga.js` - Logica de edicao de liga

### Referencia (Fluxo que funciona)
- `public/js/fluxo-financeiro/fluxo-financeiro-cache.js:465-490` - `carregarInscricoes2026()`
- `public/js/fluxo-financeiro/fluxo-financeiro.js:104-129` - Logica de `window.temporadaAtual`

---

## Solucao Proposta

### Abordagem: Dual-Source (mesmo padrao do fluxo-financeiro)

Em vez de depender APENAS de `inscricoestemporada`, carregar participantes de AMBAS as fontes:

1. **Temporada 2025:** `liga.participantes` (fonte legada)
2. **Temporada 2026:** Combinar `liga.participantes` + `inscricoestemporada`

### Logica de Deteccao de Temporadas

```javascript
// NAO depender APENAS de InscricaoTemporada.distinct()
// Incluir temporada atual do sistema (2026) mesmo se vazia
const CURRENT_SEASON = 2026;
const temporadaBase = liga.temporada || 2025;
const disponiveis = [...new Set([temporadaBase, CURRENT_SEASON])].sort((a, b) => b - a);
```

---

## Implementacao Detalhada

### Fase 1: Backend - Ajustar rota /temporadas

**Arquivo:** `routes/ligas.js` (linha ~731)

**Mudanca:** Incluir CURRENT_SEASON na lista de disponiveis mesmo sem inscricoes

```javascript
// Antes (bugado):
const disponiveis = [...new Set([temporadaBase, ...temporadasInscricoes])]

// Depois (fix):
const disponiveis = [...new Set([temporadaBase, CURRENT_SEASON, ...temporadasInscricoes])]
```

### Fase 2: Frontend - editar-liga.js

**2.1 Corrigir condicao de render:**
```javascript
// Antes:
if (this.temporadasDisponiveis.length <= 1) return;

// Depois:
if (this.temporadasDisponiveis.length < 1) return;
// OU mostrar sempre quando >= 2025
```

**2.2 Ajustar carregamento de participantes:**
```javascript
async carregarTimes() {
    const temporada = this.temporadaSelecionada || 2026;

    // Usar endpoint que JA faz a logica de dual-source
    const res = await fetch(`/api/ligas/${this.ligaId}/participantes?temporada=${temporada}`);
    const data = await res.json();

    // data ja vem com fonte correta (liga.participantes ou inscricoestemporada)
    this.times = data.participantes || [];
    this.renderizarTimes();
}
```

### Fase 3: Verificar API /participantes

**Arquivo:** `routes/ligas.js:762-860`

A logica JA existe:
- Se `temporadaFiltro === temporadaLiga && !usarInscricoes` → usa `liga.participantes`
- Se `usarInscricoes` → usa `inscricoestemporada`

**Problema:** Para 2026 SEM inscricoes, nao ha fallback para mostrar participantes de 2025 como "pendentes".

**Solucao:** Adicionar fallback que carrega `liga.participantes` com status implcito "pendente" quando 2026 nao tem inscricoes.

---

## Regras de Negocio

| Regra | Descricao |
|-------|-----------|
| Temporada 2025 | Mostra participantes de `liga.participantes` (legado) |
| Temporada 2026 COM inscricoes | Mostra apenas quem tem registro em `inscricoestemporada` |
| Temporada 2026 SEM inscricoes | Mostra participantes de 2025 com status "pendente" |
| Participante "nao_participa" | NAO aparece na lista de 2026 |

---

## Riscos e Consideracoes

### Impactos Previstos
- **Positivo:** Admin conseguira alternar entre temporadas
- **Atencao:** Se inscricoes existem parcialmente, mistura de dados
- **Risco:** Edicao em temporada errada pode causar inconsistencia

### Multi-Tenant
- [x] Todas as queries ja filtram por `liga_id`

---

## Testes Necessarios

### Cenarios de Teste

1. **Liga SEM inscricoes 2026:**
   - Tabs devem mostrar 2025 e 2026
   - Tab 2026 deve mostrar participantes de 2025 com badge "Pendente"

2. **Liga COM inscricoes 2026 parciais:**
   - Tab 2025: participantes legados
   - Tab 2026: apenas quem decidiu (renovado/novo)

3. **Edicao de participante:**
   - Salvar em 2025 afeta `liga.participantes`
   - Salvar em 2026 afeta `inscricoestemporada` (se existir)

---

## Proximos Passos

1. **SPEC:** Gerar especificacao tecnica com mudancas linha por linha
2. **CODE:** Implementar mudancas cirurgicas
3. **TESTE:** Validar no ambiente local

---

## Arquivos para o SPEC

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `routes/ligas.js` | Backend | Linha 748: incluir CURRENT_SEASON |
| `public/js/editar-liga.js` | Frontend | Ajustar carregarTemporadas e renderizarSeletorTemporada |
| `public/editar-liga.html` | Frontend | Verificar se container #temporada-tabs existe |

---

**Gerado por:** Pesquisa Protocol v1.0

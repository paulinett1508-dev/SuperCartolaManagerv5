# SPEC - Fix Carregamento Lento Tela Financeiro (iPhone)

**Data:** 2026-01-17
**Baseado em:** PRD-fix-carregamento-lento-financeiro.md
**Status:** Especificacao Tecnica Aprovada
**Versao:** 1.0

---

## Resumo da Implementacao

Refatorar a funcao `carregarExtrato()` em `participante-extrato.js` para executar requisicoes HTTP independentes em **paralelo** usando `Promise.all`, reduzindo o tempo de carregamento de ~15-20s para ~5-8s em redes moveis lentas. A mudanca e cirurgica: apenas reorganizar a ordem das chamadas sem alterar a logica de negocio.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. participante-extrato.js - Mudanca Primaria

**Path:** `public/participante/js/modules/participante-extrato.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** participante-extrato-ui.js (nenhuma mudanca necessaria)

---

#### PROBLEMA IDENTIFICADO NO CODIGO ATUAL

```
Linha 362-372: verificarRenovacao() com Promise.race (5s timeout)
                |
                v [SEQUENCIAL - ESPERA]
Linha 416-431: fetch mercado/status (~1-2s)
                |
                v [SEQUENCIAL - ESPERA]
Linha 439:     verificarRenovacao() CHAMADA NOVAMENTE (REDUNDANTE!)
                |
                v [SEQUENCIAL - ESPERA]
Linha 460-472: fetch cache (~2-5s)
                |
                v [SEQUENCIAL - ESPERA]
Linha 586-587: fetch calculo (se necessario)
                |
                v [SEQUENCIAL - ESPERA]
Linha 622:     buscarCamposEditaveis() (~1-2s)

TOTAL EM 4G FRACO: 12-20s (excede timeout de 25s em casos extremos)
```

---

#### Mudanca Cirurgica 1: PARALELIZAR REQUISICOES INICIAIS

**Linhas 362-431: SUBSTITUIR bloco sequencial por Promise.all**

```javascript
// ANTES (linhas 362-431 - SEQUENCIAL):
// ✅ v4.1: Verificar status de renovação ANTES de usar cache local
let statusRenovacao = { renovado: false };
try {
    statusRenovacao = await Promise.race([
        verificarRenovacao(ligaId, timeId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
} catch (e) {
    if (window.Log) Log.warn("EXTRATO-PARTICIPANTE", "⚠️ Timeout ao verificar renovação, assumindo não renovado");
}
const participanteRenovado = statusRenovacao?.renovado === true;

// ... (linhas 374-415: lógica de cache local - MANTER)

// =========================================================================
// FASE 2: ATUALIZAÇÃO EM BACKGROUND (Fetch API)
// =========================================================================
try {
    // Buscar rodada atual
    let rodadaAtual = 1;
    try {
        const resStatus = await fetch("/api/cartola/mercado/status");
        if (resStatus.ok) {
            const status = await resStatus.json();
            rodadaAtual = status.rodada_atual || 1;
        }
    } catch (e) {
        if (window.Log)
            Log.warn(
                "EXTRATO-PARTICIPANTE",
                "⚠️ Falha ao buscar rodada atual",
            );
    }
```

```javascript
// DEPOIS (linhas 362-431 - PARALELO):
// ✅ v4.9: PARALELIZAR requisições independentes para reduzir latência
// Problema: Em 4G fraco, requisições sequenciais acumulam 15-20s
// Solução: Executar verificarRenovacao + mercado/status em paralelo
let statusRenovacao = { renovado: false };
let rodadaAtual = 1;

try {
    // ✅ v4.9: Promise.all para requisições independentes (economia de ~3-5s)
    const [statusRenovacaoResult, mercadoResult] = await Promise.all([
        // Requisição 1: Verificar renovação (com timeout próprio de 5s)
        Promise.race([
            verificarRenovacao(ligaId, timeId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout-renovacao')), 5000))
        ]).catch(e => {
            if (window.Log) Log.warn("EXTRATO-PARTICIPANTE", "⚠️ Timeout renovação, assumindo não renovado");
            return { renovado: false };
        }),

        // Requisição 2: Buscar status do mercado (com timeout de 5s)
        fetch("/api/cartola/mercado/status", {
            signal: AbortSignal.timeout(5000)
        }).then(r => r.ok ? r.json() : { rodada_atual: 1 })
          .catch(() => ({ rodada_atual: 1 }))
    ]);

    statusRenovacao = statusRenovacaoResult || { renovado: false };
    rodadaAtual = mercadoResult?.rodada_atual || 1;

    if (window.Log) Log.info("EXTRATO-PARTICIPANTE", `✅ Paralelo OK: renovado=${statusRenovacao.renovado}, rodada=${rodadaAtual}`);
} catch (e) {
    if (window.Log) Log.warn("EXTRATO-PARTICIPANTE", "⚠️ Erro no Promise.all, usando defaults");
}
const participanteRenovado = statusRenovacao?.renovado === true;
```

**Motivo:** Requisicoes `verificarRenovacao` e `mercado/status` sao independentes. Executa-las em paralelo economiza 2-5s de latencia acumulada.

---

#### Mudanca Cirurgica 2: REMOVER BLOCO SEQUENCIAL DO MERCADO/STATUS

**Linhas 416-431: REMOVER (ja foi buscado em paralelo acima)**

```javascript
// ANTES (linhas 416-431):
try {
    // Buscar rodada atual
    let rodadaAtual = 1;
    try {
        const resStatus = await fetch("/api/cartola/mercado/status");
        if (resStatus.ok) {
            const status = await resStatus.json();
            rodadaAtual = status.rodada_atual || 1;
        }
    } catch (e) {
        if (window.Log)
            Log.warn(
                "EXTRATO-PARTICIPANTE",
                "⚠️ Falha ao buscar rodada atual",
            );
    }

// DEPOIS (linhas 416-431):
// ✅ v4.9: rodadaAtual já foi buscada no Promise.all acima
// (REMOVER este bloco - código movido para o Promise.all inicial)
```

**Motivo:** Evitar fetch duplicado. `rodadaAtual` ja foi obtida no Promise.all da mudanca 1.

---

#### Mudanca Cirurgica 3: REMOVER CHAMADA REDUNDANTE A verificarRenovacao

**Linha 439: REMOVER chamada duplicada**

```javascript
// ANTES (linha 439):
// ✅ v4.5: Verificar se há temporada selecionada pelo usuário (via seletor)
// Se o usuário selecionou explicitamente uma temporada, respeitar essa escolha
const statusRenovacao = await verificarRenovacao(ligaId, timeId);  // ❌ REDUNDANTE!
let temporada;

// DEPOIS (linha 439):
// ✅ v4.9: statusRenovacao já foi obtido no Promise.all inicial
// (REMOVER a linha "const statusRenovacao = await verificarRenovacao...")
// A variável statusRenovacao já existe no escopo desde a linha ~362
let temporada;
```

**Motivo:** `verificarRenovacao` ja foi chamada nas linhas 362-372. Esta segunda chamada e redundante e adiciona 1-3s de latencia desnecessaria.

---

#### Mudanca Cirurgica 4: ATUALIZAR VERSAO DO MODULO

**Linha 2: Atualizar versao**

```javascript
// ANTES:
// PARTICIPANTE-EXTRATO.JS - v4.8 (TIMEOUT MOBILE)

// DEPOIS:
// PARTICIPANTE-EXTRATO.JS - v4.9 (PARALELO MOBILE)
```

**Linhas 5-7: Atualizar changelog**

```javascript
// ANTES:
// ✅ v4.8: TIMEOUT MOBILE - Aumenta timeout de 15s para 25s
//          - Corrige "Carregamento lento" em iPhones com 4G fraco
//          - Requisições sequenciais acumulam latência em redes lentas

// DEPOIS:
// ✅ v4.9: PARALELO MOBILE - Requisições em paralelo (Promise.all)
//          - Reduz tempo de carregamento de ~15s para ~5-8s em 4G
//          - verificarRenovacao + mercado/status executam juntos
//          - Remove chamada redundante a verificarRenovacao (linha 439)
// ✅ v4.8: TIMEOUT MOBILE - Aumenta timeout de 15s para 25s
//          - Corrige "Carregamento lento" em iPhones com 4G fraco
//          - Requisições sequenciais acumulam latência em redes lentas
```

**Linha 76: Atualizar log de versao**

```javascript
// ANTES:
Log.info("EXTRATO-PARTICIPANTE", `📄 Módulo v4.8 TIMEOUT-MOBILE (Temporada ${CONFIG.CURRENT_SEASON || 2026})`);

// DEPOIS:
Log.info("EXTRATO-PARTICIPANTE", `📄 Módulo v4.9 PARALELO-MOBILE (Temporada ${CONFIG.CURRENT_SEASON || 2026})`);
```

**Linha 1276-1277: Atualizar log final**

```javascript
// ANTES:
Log.info(
    "EXTRATO-PARTICIPANTE",
    "✅ Módulo v4.8 carregado (TIMEOUT-MOBILE: 25s)",
);

// DEPOIS:
Log.info(
    "EXTRATO-PARTICIPANTE",
    "✅ Módulo v4.9 carregado (PARALELO-MOBILE: Promise.all)",
);
```

---

## Mapa de Dependencias

```
participante-extrato.js (v4.8 → v4.9)
    |
    ├── participante-extrato-ui.js [SEM MUDANCAS]
    |   └── Renderização não depende de ordem das requisições
    |
    ├── extratoFinanceiroCacheController.js [SEM MUDANCAS]
    |   └── Backend não é afetado - mesmas APIs
    |
    └── Endpoints consumidos (ordem não importa):
        ├── /api/inscricoes/{liga}/{temp}/{time} (verificarRenovacao)
        ├── /api/cartola/mercado/status
        ├── /api/extrato-cache/{liga}/times/{time}/cache
        ├── /api/fluxo-financeiro/{liga}/extrato/{time}
        └── /api/fluxo-financeiro/{liga}/times/{time}
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Todas as queries mantêm filtro por `ligaId`
- [x] Nenhuma mudança em lógica de autenticação
- [x] Isolamento entre ligas preservado

### Autenticacao
- [x] Sem mudanças em middlewares
- [x] Sem novas rotas expostas

---

## Casos de Teste

### Teste 1: Rede WiFi Rapida
**Setup:** Conectado em WiFi estável
**Acao:** Acessar aba Financeiro no app participante
**Resultado Esperado:** Carrega em <3s, comportamento identico ao anterior

### Teste 2: Rede 4G Lenta (Simulado)
**Setup:** Chrome DevTools → Network → "Slow 3G" (latency 300ms)
**Acao:** Acessar aba Financeiro no app participante
**Resultado Esperado:** Carrega em <10s (antes: 15-20s ou timeout)

### Teste 3: Timeout Parcial
**Setup:** Throttle apenas em `/api/cartola/mercado/status` (demora 6s)
**Acao:** Acessar aba Financeiro
**Resultado Esperado:** Usa fallback `rodadaAtual: 1`, continua carregando normalmente

### Teste 4: Participante Renovado 2026
**Setup:** Participante com inscricao ativa em 2026
**Acao:** Acessar aba Financeiro
**Resultado Esperado:** Mostra extrato 2026 (pre-temporada ou com dados)

### Teste 5: Participante Nao Renovado
**Setup:** Participante sem inscricao 2026
**Acao:** Acessar aba Financeiro
**Resultado Esperado:** Mostra extrato 2025 (historico)

### Teste 6: Cache Local Disponivel
**Setup:** Participante com dados em IndexedDB
**Acao:** Acessar aba Financeiro
**Resultado Esperado:** Renderiza instantaneamente do cache, atualiza em background

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Verificar se app participante carrega normalmente
3. Monitorar logs de erro no console

**Riscos Baixos:** A mudança é apenas reorganização de código existente. Não há alteração em lógica de negócio ou estrutura de dados.

---

## Checklist de Validacao

### Antes de Implementar
- [x] Arquivo original completo analisado (participante-extrato.js v4.8)
- [x] Dependentes verificados (participante-extrato-ui.js, controllers)
- [x] Mudanças cirúrgicas definidas linha por linha
- [x] Impactos mapeados (nenhum em outros arquivos)
- [x] Testes planejados
- [x] Rollback documentado

### Durante Implementacao
- [ ] Atualizar versão para v4.9
- [ ] Substituir bloco linhas 362-431
- [ ] Remover bloco linhas 416-431 (fetch mercado/status duplicado)
- [ ] Remover linha 439 (verificarRenovacao duplicada)
- [ ] Atualizar logs de versão
- [ ] Testar em Slow 3G simulado

---

## Ordem de Execucao (Critico)

1. **Abrir arquivo:** `public/participante/js/modules/participante-extrato.js`
2. **Mudanca 1:** Substituir linhas 362-372 pelo Promise.all
3. **Mudanca 2:** Remover linhas 416-431 (fetch mercado/status)
4. **Mudanca 3:** Remover linha 439 (verificarRenovacao redundante)
5. **Mudanca 4:** Atualizar versão (linhas 2, 5-7, 76, 1276-1277)
6. **Testar:** Chrome DevTools → Network → "Slow 3G"
7. **Validar:** Console deve mostrar `✅ Paralelo OK`

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-fix-carregamento-lento-financeiro.md
```

---

## Metricas de Sucesso

| Metrica | Antes (v4.8) | Depois (v4.9) |
|---------|--------------|---------------|
| Tempo carregamento WiFi | ~5s | ~3s |
| Tempo carregamento 4G | ~15-20s | ~8s |
| Taxa de timeout mobile | ~10-15% | <2% |
| Requisicoes sequenciais | 5 | 3 (2 paralelas + 3 sequenciais) |

---

**Gerado por:** Spec Protocol v1.0
**Arquivos analisados:** participante-extrato.js (1278 linhas), extratoFinanceiroCacheController.js (1530 linhas), participante-extrato-ui.js (cabeçalho)

# AUDITORIA COMPLETA: SISTEMA DE PARCIAIS E "AO VIVO"

**Data:** 2026-01-28
**Contexto:** Simulação de início de rodada às 18h59
**Autor:** Auditoria Técnica Claude

---

## 1. VISÃO GERAL DO FLUXO

### 1.1 Cenário: Rodada X fecha às 18h59

```
┌────────────────────────────────────────────────────────────────────────────┐
│ TIMELINE DE EVENTOS                                                        │
├────────────────────────────────────────────────────────────────────────────┤
│ 18h00 - Mercado ABERTO (status_mercado = 1)                               │
│ 18h59 - Mercado FECHA (status_mercado = 2, bola_rolando = false)          │
│ 19h00 - Primeiro jogo começa (bola_rolando = true)                        │
│ 19h01 - API Cartola começa a retornar atletas pontuados                   │
│ ~23h00 - Jogos finalizam                                                  │
│ ~00h00 - API Cartola consolida (status_mercado = 4 ou reabre = 1)         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. BACKEND: FLUXO DE DADOS

### 2.1 Endpoints Críticos

| Endpoint | Função | Cache | Arquivo |
|----------|--------|-------|---------|
| `/api/cartola/mercado/status` | Status do mercado e rodada atual | 5min | `routes/cartola-proxy.js:76` |
| `/api/cartola/atletas/pontuados` | Atletas com pontuação (tempo real) | **NO-STORE** | `routes/cartola-proxy.js:136` |
| `/api/cartola/time/id/:timeId/:rodada` | Escalação de um time específico | 10s | `routes/cartola-proxy.js:194` |
| `/api/rodadas/:ligaId/rodadas` | Rodadas consolidadas (com cálculos) | IndexedDB | `routes/rodadas-routes.js` |

### 2.2 Detecção de Estado (Backend)

```javascript
// routes/cartola-proxy.js:76-132
router.get("/mercado/status", async (req, res) => {
    // Season Guard: Se temporada encerrada, retorna status fixo
    if (isSeasonFinished()) {
        return res.json({
            rodada_atual: 38,
            status_mercado: 6,  // 6 = Temporada Encerrada
            temporada_encerrada: true
        });
    }

    // Busca API Cartola Globo
    const response = await axios.get("https://api.cartola.globo.com/mercado/status");
    return res.json(response.data);
    // Fallback: se API falha, calcula rodada baseado na data
});
```

### 2.3 Atletas Pontuados (Tempo Real)

```javascript
// routes/cartola-proxy.js:136-191
router.get("/atletas/pontuados", async (req, res) => {
    // Season Guard: Se temporada encerrada, retorna vazio
    if (isSeasonFinished()) {
        return res.json({ atletas: {}, rodada: 38, temporada_encerrada: true });
    }

    // Busca SEM CACHE da API Cartola
    const response = await axios.get("https://api.cartola.globo.com/atletas/pontuados", {
        headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    });

    // Retorna com headers anti-cache
    res.set({ "Cache-Control": "no-cache, no-store, must-revalidate" });
    res.json(response.data);
});
```

---

## 3. MÓDULO PARCIAIS - ADMIN

### 3.1 Arquivos Relevantes

| Arquivo | Versão | Função |
|---------|--------|--------|
| `public/fronts/parciais.html` | v4.0 | Container minimalista para UI dinâmica |
| `public/js/parciais.js` | v4.0 | Lógica principal (Multi-Temporada) |
| `public/js/parciais-scheduler.js` | v2.0 | Scheduler de auto-refresh (desativado 2025) |

### 3.2 Lógica de Inicialização (Admin)

```javascript
// public/js/parciais.js:40-61
export async function inicializarParciais() {
    const temporada = obterTemporadaSelecionada();

    // Verificação de temporada encerrada
    if (isTemporadaEncerrada(temporada)) {
        // Parar scheduler
        window.ParciaisScheduler?.parar();
        // Mostrar UI de temporada encerrada
        mostrarUITemporadaEncerrada(temporada);
        return;
    }

    // Temporada ativa - carregar parciais
    await carregarParciais();
}
```

### 3.3 Estados da UI (Admin)

| Estado | Condição | UI Renderizada |
|--------|----------|----------------|
| **Temporada Encerrada** | `TEMPORADAS_CONFIG[ano].encerrada = true` | Badge dourado "Temporada 202X Encerrada" |
| **Pré-Temporada** | Temporada ativa mas sem rodadas | Ícone relógio "Aguardando início das rodadas" |
| **Mercado Aberto** | `status_mercado = 1` | "Mercado Aberto - Próxima Rodada X" |
| **Rodada em Andamento** | `status_mercado = 2` | Lista de participantes com pontos parciais |

### 3.4 PROBLEMA IDENTIFICADO - Admin

```javascript
// public/js/parciais.js:110-148
async function carregarParciais() {
    // ⚠️ TODO: Implementar carregamento de parciais para temporada ativa
    // Por enquanto mostra mensagem de pré-temporada
    container.innerHTML = `
        <div class="parciais-encerrado">
            <h2>Temporada ${temporada}</h2>
            <p>Aguardando início das rodadas</p>
        </div>
    `;
}
```

**DIAGNÓSTICO:** O módulo admin de parciais está com implementação incompleta para temporada ativa (2026). A função `carregarParciais()` apenas exibe mensagem de "aguardando", não busca dados reais da API.

---

## 4. MÓDULO PARCIAIS - PARTICIPANTE

### 4.1 Arquivos Relevantes

| Arquivo | Versão | Função |
|---------|--------|--------|
| `participante-rodada-parcial.js` | v2.2 | Cálculo e exibição de parciais (igual admin) |
| `participante-rodadas.js` | v4.6 | Grid de rodadas com indicador "AO VIVO" |
| `participante-quick-bar.js` | v2.5 | Menu com opção "Ao Vivo" (em breve) |

### 4.2 Fluxo de Inicialização (Participante)

```javascript
// participante-rodada-parcial.js:74-136
export async function inicializarParciais(ligaId, timeId) {
    // 1. Buscar status do mercado
    const status = await buscarStatusMercado();

    // 2. Verificar se há rodada em andamento
    const rodadaEmAndamento = status.status_mercado === 2 || status.bola_rolando;

    if (!rodadaEmAndamento) {
        return { disponivel: false, motivo: "mercado_aberto" };
    }

    // 3. Buscar times da liga
    const times = await buscarTimesLiga(ligaId);

    // 4. Separar ativos e inativos
    const { ativos, inativos } = separarTimesAtivosInativos(times);

    return {
        disponivel: true,
        rodada: status.rodada_atual,
        totalTimes: ativos.length,
        bolaRolando: status.bola_rolando
    };
}
```

### 4.3 Cálculo de Pontuação Parcial (CORRETO)

```javascript
// participante-rodada-parcial.js:341-469
async function buscarECalcularPontuacao(time, rodada, atletasPontuados) {
    // 1. Buscar escalação do time
    const dadosEscalacao = await fetch(`/api/cartola/time/id/${timeId}/${rodada}`);

    // 2. Calcular pontos dos TITULARES
    dadosEscalacao.atletas.forEach((atleta) => {
        const atletaPontuado = atletasPontuados[atleta.atleta_id];
        const pontuacao = atletaPontuado?.pontuacao || 0;

        // Capitão pontua em DOBRO
        if (atleta.atleta_id === dadosEscalacao.capitao_id) {
            pontos += pontuacao * 2;
        } else {
            pontos += pontuacao;
        }
    });

    // 3. Calcular pontos dos RESERVAS
    dadosEscalacao.reservas.forEach((atleta) => {
        const atletaPontuado = atletasPontuados[atleta.atleta_id];
        const pontuacao = atletaPontuado?.pontuacao || 0;

        // Reserva de luxo pontua 1.5x se entrou em campo
        if (atleta.atleta_id === dadosEscalacao.reserva_luxo_id && entrouEmCampo) {
            pontos += pontuacao * 1.5;
        }
        // Reserva comum substitui titular que não pontuou
        else if (!posicoesQuePontuaram.has(atleta.posicao_id) && entrouEmCampo) {
            pontos += pontuacao;
        }
    });

    return { timeId, nome_time, pontos };
}
```

### 4.4 Auto-Refresh com Backoff Exponencial

```javascript
// participante-rodada-parcial.js:506-582
const autoRefresh = {
    ativo: false,
    intervalMs: 20000,   // Base: 20 segundos
    minMs: 15000,        // Mínimo: 15 segundos
    maxMs: 120000,       // Máximo: 2 minutos
    step: 1.6,           // Fator de backoff
};

async function executarAutoRefresh() {
    // A cada 5 ciclos, atualiza status do mercado
    if (cycles % 5 === 0) {
        const status = await buscarStatusMercado();
        // Se mercado fechou, parar auto-refresh
        if (!parciaisDisponiveis()) {
            pararAutoRefresh();
            return;
        }
    }

    const dados = await carregarParciais();

    // Backoff inteligente
    if (dados.participantes.length > 0) {
        // Dados novos: reset para intervalo mínimo
        intervalMs = minMs; // 15s
    } else {
        // Sem dados: aumentar intervalo
        intervalMs = Math.min(maxMs, intervalMs * slowStep); // até 2min
    }
}
```

---

## 5. OPÇÃO "AO VIVO" NO QUICK BAR

### 5.1 Estado Atual

```javascript
// participante-quick-bar.js:266-280
renderizarMenuContent() {
    return `
        <div class="menu-category">
            <div class="menu-category-title">Em Breve (2026)</div>
            <div class="menu-grid">
                <!-- ⚠️ MARCADO COMO "EM BREVE" -->
                <div class="menu-card disabled" data-action="em-breve">
                    <span class="material-icons">sensors</span>
                    <span class="menu-card-label">Ao Vivo</span>
                </div>
            </div>
        </div>
    `;
}
```

**DIAGNÓSTICO:** A opção "Ao Vivo" está marcada como `disabled` com `data-action="em-breve"`, exibindo toast "Em breve na temporada 2026!".

### 5.2 Funcionalidade Planejada vs Implementada

| Funcionalidade | Status | Localização |
|----------------|--------|-------------|
| **Parciais na Rodada** | ✅ IMPLEMENTADO | `participante-rodadas.js` (dentro do grid) |
| **Jogos Ao Vivo** | ✅ IMPLEMENTADO | `participante-home.js` (seção "Hoje") |
| **Botão "Ao Vivo" no Menu** | ❌ DESATIVADO | `participante-quick-bar.js:276` |

---

## 6. COMPORTAMENTO ESPERADO vs REAL

### 6.1 Cenário: Às 18h59 (Mercado Fecha)

| Componente | Esperado | Real |
|------------|----------|------|
| **API Cartola** | `status_mercado: 2` | ✅ Correto |
| **Backend Proxy** | Retornar status 2 | ✅ Correto |
| **Frontend Admin** | Mostrar ranking parcial | ❌ **MOSTRA "AGUARDANDO"** |
| **Frontend Participante** | Badge "AO VIVO" em rodadas | ✅ Correto |

### 6.2 Cenário: Às 19h01 (Primeiro Jogo Começa)

| Componente | Esperado | Real |
|------------|----------|------|
| **API Cartola** | `atletas pontuados > 0` | ✅ Correto |
| **Backend Proxy** | Retornar atletas sem cache | ✅ Correto |
| **Frontend Admin** | Atualizar pontuações | ❌ **NÃO IMPLEMENTADO** |
| **Frontend Participante** | Auto-refresh 15s | ✅ Correto |

### 6.3 Cenário: Durante os Jogos

| Componente | Esperado | Real |
|------------|----------|------|
| **Cálculo Capitão** | Pontuar 2x | ✅ Correto (participante) |
| **Cálculo Reserva Luxo** | Pontuar 1.5x | ✅ Correto (participante) |
| **Substituição Reserva** | Entrar se titular não jogou | ✅ Correto (participante) |
| **Ranking em Tempo Real** | Ordenar por pontos | ✅ Correto (participante) |

---

## 7. PROBLEMAS IDENTIFICADOS

### 7.1 CRÍTICO: Módulo Admin Incompleto

**Arquivo:** `public/js/parciais.js`
**Linha:** 110-148
**Problema:** A função `carregarParciais()` para temporada ativa está com `TODO` e apenas exibe mensagem estática.

```javascript
// ⚠️ PROBLEMA
async function carregarParciais() {
    // TODO: Implementar carregamento de parciais para temporada ativa
    container.innerHTML = `<div>Aguardando início das rodadas</div>`;
}
```

**Impacto:** Admin não consegue visualizar parciais em tempo real durante rodadas da temporada 2026.

### 7.2 MÉDIO: Opção "Ao Vivo" Desativada

**Arquivo:** `participante-quick-bar.js`
**Linha:** 276
**Problema:** Botão "Ao Vivo" marcado como `em-breve` quando deveria redirecionar para o módulo de rodadas com a rodada atual selecionada.

### 7.3 BAIXO: Falta de Indicador Visual na Home

**Arquivo:** `participante-home.js`
**Problema:** Não há indicador visual na Home do participante quando há rodada em andamento (apenas na seção de jogos).

---

## 8. RECOMENDAÇÕES

### 8.1 Prioridade ALTA - Implementar Parciais Admin

```javascript
// SUGESTÃO: Reutilizar lógica do participante
async function carregarParciais() {
    // Importar módulo de parciais do participante (mesma lógica)
    const ligaId = obterLigaAtual();
    const status = await buscarStatusMercado();

    if (status.status_mercado !== 2) {
        mostrarMercadoAberto(status);
        return;
    }

    const atletasPontuados = await buscarAtletasPontuados();
    const times = await buscarTimesLiga(ligaId);

    // Calcular e renderizar ranking parcial
    const ranking = await calcularRankingParcial(times, atletasPontuados);
    renderizarRankingParcial(ranking);
}
```

### 8.2 Prioridade MÉDIA - Ativar Botão "Ao Vivo"

```javascript
// SUGESTÃO: Modificar quick-bar para redirecionar ao módulo correto
// Em vez de:
<div class="menu-card disabled" data-action="em-breve">

// Usar:
<div class="menu-card" data-module="rodadas" data-action="ao-vivo">
```

E no handler:
```javascript
if (action === 'ao-vivo') {
    this.fecharMenu();
    this.navegarPara('rodadas');
    // Após navegação, selecionar rodada atual automaticamente
    setTimeout(() => {
        window.selecionarRodada?.(parciaisInfo.rodada, true);
    }, 500);
}
```

### 8.3 Prioridade BAIXA - Indicador Visual na Home

Adicionar badge "AO VIVO" no header da Home quando `status_mercado === 2`.

---

## 9. CHECKLIST DE VALIDAÇÃO

### 9.1 Antes do Início da Rodada (18h00-18h58)

- [ ] `/api/cartola/mercado/status` retorna `status_mercado: 1`
- [ ] Admin mostra "Mercado Aberto"
- [ ] Participante não vê badge "AO VIVO" nas rodadas
- [ ] Auto-refresh está INATIVO

### 9.2 Após Fechamento do Mercado (18h59)

- [ ] `/api/cartola/mercado/status` retorna `status_mercado: 2`
- [ ] Admin deveria mostrar ranking parcial (ATUALMENTE NÃO)
- [ ] Participante vê badge "● AO VIVO" na rodada atual
- [ ] Card da rodada atual muda para classe `parcial em-andamento`

### 9.3 Durante os Jogos (19h00+)

- [ ] `/api/cartola/atletas/pontuados` retorna atletas > 0
- [ ] Participante vê pontuações atualizadas a cada 15-120s
- [ ] Capitão pontua em dobro ✅
- [ ] Reserva de luxo pontua 1.5x ✅
- [ ] Substituições automáticas funcionam ✅
- [ ] Ranking ordena corretamente por pontos ✅

### 9.4 Após Encerramento dos Jogos

- [ ] `/api/cartola/mercado/status` retorna `status_mercado: 4` ou `1`
- [ ] Auto-refresh para automaticamente
- [ ] Consolidação pode ser acionada (admin)

---

## 10. ARQUIVOS PARA CORREÇÃO

| Arquivo | Prioridade | Ação |
|---------|------------|------|
| `public/js/parciais.js` | ALTA | Implementar carregamento real de parciais |
| `participante-quick-bar.js` | MÉDIA | Ativar botão "Ao Vivo" |
| `participante-home.js` | BAIXA | Adicionar indicador "AO VIVO" |

---

## 11. CONCLUSÃO

O sistema de parciais do **participante** está **FUNCIONAL** e bem implementado:
- ✅ Detecção correta de rodada em andamento
- ✅ Cálculo correto de pontuação (capitão 2x, reserva luxo 1.5x)
- ✅ Auto-refresh inteligente com backoff exponencial
- ✅ Indicador visual "AO VIVO" no grid de rodadas
- ✅ Separação de ativos/inativos

O sistema de parciais do **admin** está **INCOMPLETO**:
- ❌ `carregarParciais()` não implementado para temporada ativa
- ❌ Apenas exibe mensagem "Aguardando"

A opção "Ao Vivo" no Quick Bar está **DESATIVADA** quando deveria redirecionar para rodadas com parciais.

**Recomendação:** Priorizar implementação do módulo admin de parciais reutilizando a lógica já funcional do módulo participante.

---

*Auditoria gerada em 2026-01-28*

# SPEC: Mata-Mata - Correcoes da Auditoria Completa

**Data:** 05/02/2026
**PRD:** PRD-mata-mata-auditoria-completa.md
**Protocolo:** S.D.A (Sistema de Dependencias e Alteracoes)
**Score alvo:** 90/100+

---

## Mapa de Dependencias Validado

```
mata-mata-config.js ──> mata-mata-orquestrador.js (importa edicoes, getFaseInfo, etc.)
mata-mata-config.js ──> mata-mata-ui.js (importa edicoes, FASE_LABELS, etc.)
mata-mata-config.js ──> mata-mata-financeiro.js (importa edicoes, VALORES_FASE, etc.)
mata-mata-config.js ──> mata-mata-confrontos.js (importa VALORES_FASE)
mata-mata-confrontos.js ──> mata-mata-orquestrador.js (importa funcs de confronto)
mata-mata-confrontos.js ──> mata-mata-financeiro.js (importa funcs de confronto)
mata-mata-ui.js ──> mata-mata-orquestrador.js (importa render funcs)
mata-mata-financeiro.js ──> mata-mata-orquestrador.js (importa setRankingFunction, setTamanhoTorneio)
cache-manager.js ──> mata-mata-orquestrador.js
clubes-data.js ──> mata-mata-ui.js
config/rules/mata_mata.json ──> controllers/mata-mata-backend.js
models/ModuleConfig.js ──> controllers/mata-mata-backend.js
config/seasons.js ──> controllers/mata-mata-backend.js
controllers/mata-mata-backend.js ──> controllers/fluxoFinanceiroController.js (importa getResultadosMataMataCompleto)
routes/mataMataCacheRoutes.js ──> index.js (registrado como /api/mata-mata)
```

---

## Alteracoes Cirurgicas por Arquivo

### ARQUIVO 1: `public/js/mata-mata/mata-mata-config.js` (166 linhas)

#### ALT-1.1: Tornar `edicoes` mutavel e exportar setter (FIX-3)
**Linhas 4-54:** Substituir `export const edicoes = [...]` por variavel mutavel com setter

```javascript
// ANTES (linha 5):
export const edicoes = [
  { id: 1, nome: "1ª Edição", ... },
  ...
];

// DEPOIS:
let _edicoes = [
  { id: 1, nome: "1ª Edição", rodadaInicial: 3, rodadaFinal: 7, rodadaDefinicao: 2, ativo: true },
  { id: 2, nome: "2ª Edição", rodadaInicial: 10, rodadaFinal: 14, rodadaDefinicao: 9, ativo: true },
  { id: 3, nome: "3ª Edição", rodadaInicial: 16, rodadaFinal: 20, rodadaDefinicao: 15, ativo: false },
  { id: 4, nome: "4ª Edição", rodadaInicial: 22, rodadaFinal: 26, rodadaDefinicao: 21, ativo: false },
  { id: 5, nome: "5ª Edição", rodadaInicial: 27, rodadaFinal: 31, rodadaDefinicao: 26, ativo: false },
  { id: 6, nome: "6ª Edição", rodadaInicial: 33, rodadaFinal: 37, rodadaDefinicao: 32, ativo: false },
];

// Getter para compatibilidade (todos os importadores continuam usando `edicoes`)
export const edicoes = _edicoes;

// Setter para carregar edicoes da API
export function setEdicoes(novasEdicoes) {
  _edicoes.length = 0;
  novasEdicoes.forEach(e => _edicoes.push(e));
  console.log(`[MATA-CONFIG] Edições atualizadas: ${_edicoes.length} edições carregadas`);
}
```

**Nota:** Usar `_edicoes.length = 0` + `push` garante que a referencia do array exportado nao muda — todos os modulos que importaram `edicoes` continuam apontando pro mesmo array.

#### ALT-1.2: Tornar `VALORES_FASE` mutavel e exportar setter (FIX-4)
**Linhas 56-63:** Substituir `export const VALORES_FASE` por mutavel com setter

```javascript
// ANTES (linha 57):
export const VALORES_FASE = {
  primeira: { vitoria: 10.0, derrota: -10.0 },
  ...
};

// DEPOIS:
export const VALORES_FASE = {
  primeira: { vitoria: 10.0, derrota: -10.0 },
  oitavas:  { vitoria: 10.0, derrota: -10.0 },
  quartas:  { vitoria: 10.0, derrota: -10.0 },
  semis:    { vitoria: 10.0, derrota: -10.0 },
  final:    { vitoria: 10.0, derrota: -10.0 },
};

// Setter para carregar valores da config da liga
export function setValoresFase(valorVitoria, valorDerrota) {
  for (const fase of Object.keys(VALORES_FASE)) {
    VALORES_FASE[fase].vitoria = valorVitoria;
    VALORES_FASE[fase].derrota = valorDerrota;
  }
  console.log(`[MATA-CONFIG] Valores financeiros atualizados: vitória=${valorVitoria}, derrota=${valorDerrota}`);
}
```

**Nota:** Muta o objeto existente (nao substitui referencia), entao `VALORES_FASE` importado em outros modulos atualiza automaticamente.

---

### ARQUIVO 2: `public/js/mata-mata/mata-mata-orquestrador.js` (687 linhas)

#### ALT-2.1: Importar novos setters do config (FIX-3, FIX-4)
**Linha 7-16:** Adicionar `setEdicoes` e `setValoresFase` aos imports

```javascript
// ANTES (linha 7-16):
import {
  edicoes,
  getFaseInfo,
  getLigaId,
  getRodadaPontosText,
  getEdicaoMataMata,
  getFasesParaTamanho,
  TAMANHO_TORNEIO_DEFAULT,
  FASE_NUM_JOGOS,
} from "./mata-mata-config.js";

// DEPOIS:
import {
  edicoes,
  setEdicoes,
  getFaseInfo,
  getLigaId,
  getRodadaPontosText,
  getEdicaoMataMata,
  getFasesParaTamanho,
  TAMANHO_TORNEIO_DEFAULT,
  FASE_NUM_JOGOS,
  setValoresFase,
} from "./mata-mata-config.js";
```

#### ALT-2.2: Carregar edicoes e valores da API (FIX-3, FIX-4)
**Linhas 283-301:** Expandir bloco de fetch da config para tambem carregar edicoes e valores

```javascript
// ANTES (linhas 283-301):
  try {
    const resConfig = await fetch(`/api/liga/${ligaId}/modulos/mata_mata`);
    if (resConfig.ok) {
      const configData = await resConfig.json();
      const totalTimes = Number(configData?.config?.wizard_respostas?.total_times);
      if (totalTimes && [8, 16, 32].includes(totalTimes)) {
        tamanhoTorneio = totalTimes;
        console.log(`[MATA-ORQUESTRADOR] Tamanho do torneio configurado: ${tamanhoTorneio}`);
      } else {
        tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT;
        console.log(`[MATA-ORQUESTRADOR] Tamanho do torneio: ${tamanhoTorneio} (default)`);
      }
      setTamanhoTorneioFinanceiro(tamanhoTorneio);
    }
  } catch (err) {
    console.warn("[MATA-ORQUESTRADOR] Erro ao buscar config do mata-mata, usando default:", err.message);
    tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT;
    setTamanhoTorneioFinanceiro(tamanhoTorneio);
  }

// DEPOIS:
  try {
    const resConfig = await fetch(`/api/liga/${ligaId}/modulos/mata_mata`);
    if (resConfig.ok) {
      const configData = await resConfig.json();
      const wizardRespostas = configData?.config?.wizard_respostas;

      // Tamanho do torneio
      const totalTimes = Number(wizardRespostas?.total_times);
      if (totalTimes && [8, 16, 32].includes(totalTimes)) {
        tamanhoTorneio = totalTimes;
        console.log(`[MATA-ORQUESTRADOR] Tamanho do torneio configurado: ${tamanhoTorneio}`);
      } else {
        tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT;
        console.log(`[MATA-ORQUESTRADOR] Tamanho do torneio: ${tamanhoTorneio} (default)`);
      }
      setTamanhoTorneioFinanceiro(tamanhoTorneio);

      // FIX-4: Valores financeiros da config da liga
      const valorVitoria = Number(wizardRespostas?.valor_vitoria);
      const valorDerrota = Number(wizardRespostas?.valor_derrota);
      if (valorVitoria > 0 && valorDerrota < 0) {
        setValoresFase(valorVitoria, valorDerrota);
      }

      // FIX-3: Carregar edicoes da config (se qtd_edicoes definida)
      const qtdEdicoes = Number(wizardRespostas?.qtd_edicoes);
      if (qtdEdicoes && qtdEdicoes >= 1 && qtdEdicoes <= 10) {
        // Buscar edicoes do calendario da config do backend
        const calendario = configData?.config?.configuracao_override?.calendario?.edicoes
          || configData?.config?.calendario?.edicoes;
        if (Array.isArray(calendario) && calendario.length > 0) {
          setEdicoes(calendario.slice(0, qtdEdicoes));
        }
      }
    }
  } catch (err) {
    console.warn("[MATA-ORQUESTRADOR] Erro ao buscar config do mata-mata, usando default:", err.message);
    tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT;
    setTamanhoTorneioFinanceiro(tamanhoTorneio);
  }
```

#### ALT-2.3: Guard pre-temporada em carregarFase (FIX-1)
**Linhas 499-512:** Adicionar guard ANTES do fetch do ranking base

```javascript
// ANTES (linhas 499-512):
    const rodadaDefinicao = edicaoSelecionada.rodadaDefinicao;

    // ✅ USA CACHE LOCAL PARA RANKING BASE
    const rankingBase = await getRankingBaseCached(ligaId, rodadaDefinicao);

    console.log(
      `[MATA-ORQUESTRADOR] Ranking base recebido: ${rankingBase?.length || 0} times`,
    );

    if (!Array.isArray(rankingBase) || rankingBase.length < tamanhoTorneio) {
      throw new Error(
        `Ranking base inválido: ${rankingBase?.length || 0}/${tamanhoTorneio} times encontrados`,
      );
    }

// DEPOIS:
    const rodadaDefinicao = edicaoSelecionada.rodadaDefinicao;

    // FIX-1: Guard pre-temporada - nao buscar ranking se temporada nao iniciou
    if (rodada_atual === 0) {
      contentElement.innerHTML = `
        <div class="mata-mata-aguardando-fase">
          <span class="material-symbols-outlined">hourglass_empty</span>
          <h4>Temporada ainda não iniciou</h4>
          <p>Os confrontos serão calculados quando as rodadas começarem.</p>
        </div>`;
      return;
    }

    if (rodada_atual < rodadaDefinicao) {
      contentElement.innerHTML = `
        <div class="mata-mata-aguardando-fase">
          <span class="material-symbols-outlined">schedule</span>
          <h4>Aguardando Rodada de Classificação</h4>
          <p>As chaves desta edição serão definidas após a Rodada ${rodadaDefinicao}.</p>
        </div>`;
      return;
    }

    // ✅ USA CACHE LOCAL PARA RANKING BASE
    const rankingBase = await getRankingBaseCached(ligaId, rodadaDefinicao);

    console.log(
      `[MATA-ORQUESTRADOR] Ranking base recebido: ${rankingBase?.length || 0} times`,
    );

    if (!Array.isArray(rankingBase) || rankingBase.length < tamanhoTorneio) {
      throw new Error(
        `Ranking base inválido: ${rankingBase?.length || 0}/${tamanhoTorneio} times encontrados`,
      );
    }
```

#### ALT-2.4: Mover inline styles para classes CSS (FIX-8)
**Linhas 356-390:** Substituir inline styles por classes CSS

```javascript
// ANTES (linhas 356-390):
  container.innerHTML = `
    <div class="mata-mata-aguardando" style="
      display: flex;
      flex-direction: column;
      ...30+ linhas de inline CSS...
    ">
      <span class="material-icons" style="...">account_tree</span>
      <h2 style="...">Aguardando Início do Campeonato</h2>
      <p style="...">
        As chaves do Mata-Mata serão definidas quando as rodadas de classificação forem concluídas.
      </p>
    </div>
  `;

// DEPOIS:
  container.innerHTML = `
    <div class="mata-mata-aguardando">
      <span class="material-symbols-outlined mata-mata-aguardando-icon">account_tree</span>
      <h2 class="mata-mata-aguardando-titulo">Aguardando Início do Campeonato</h2>
      <p class="mata-mata-aguardando-texto">
        As chaves do Mata-Mata serão definidas quando as rodadas de classificação forem concluídas.
      </p>
    </div>
  `;
```

---

### ARQUIVO 3: `public/js/mata-mata/mata-mata-ui.js` (389 linhas)

#### ALT-3.1: Escape XSS em renderErrorState (FIX-5)
**Linha 189:** Substituir `${error.message}` por `${esc(error.message)}`

```javascript
// ANTES (linha 189):
      <p><strong>Erro:</strong> ${error.message}</p>

// DEPOIS:
      <p><strong>Erro:</strong> ${esc(error.message)}</p>
```

#### ALT-3.2: Valores financeiros dinamicos na tabela (FIX-4)
**Linhas 273-275 e 280-282:** Substituir comparacao hardcoded `=== 10` por formatacao dinamica

```javascript
// ANTES (linhas 273-275):
                  <div class="premio-valor">
                    ${valorA === 10 ? "R$ 10,00" : valorA === -10 ? "-R$ 10,00" : ""}
                  </div>

// DEPOIS:
                  <div class="premio-valor">
                    ${valorA > 0 ? `R$ ${valorA.toFixed(2).replace(".", ",")}` : valorA < 0 ? `-R$ ${Math.abs(valorA).toFixed(2).replace(".", ",")}` : ""}
                  </div>
```

```javascript
// ANTES (linhas 280-282):
                  <div class="premio-valor">
                    ${valorB === 10 ? "R$ 10,00" : valorB === -10 ? "-R$ 10,00" : ""}
                  </div>

// DEPOIS:
                  <div class="premio-valor">
                    ${valorB > 0 ? `R$ ${valorB.toFixed(2).replace(".", ",")}` : valorB < 0 ? `-R$ ${Math.abs(valorB).toFixed(2).replace(".", ",")}` : ""}
                  </div>
```

#### ALT-3.3: Padronizar fallback de escudo (FIX-9)
**Linha 264:** Substituir `onerror="this.style.display='none'"` por fallback padrao

```javascript
// ANTES (linha 264):
                    <img src="/escudos/${c.timeA.clube_id}.png" class="escudo-img" onerror="this.style.display='none'">

// DEPOIS:
                    <img src="/escudos/${c.timeA.clube_id}.png" class="escudo-img" onerror="this.src='/escudos/default.png'">
```

**Linha 286 (timeB) — ja usa padrao diferente, verificar:**
Linha 286 tambem usa `onerror="this.style.display='none'"` (dentro do `.time-info` do timeB). Aplicar mesma correcao:

```javascript
// ANTES:
                    <img src="/escudos/${c.timeB.clube_id}.png" class="escudo-img" onerror="this.style.display='none'">

// DEPOIS:
                    <img src="/escudos/${c.timeB.clube_id}.png" class="escudo-img" onerror="this.src='/escudos/default.png'">
```

**Linha 341 (banner campeao):** Ja usa `onerror="this.style.display='none'"`. Padronizar:

```javascript
// ANTES (linha 341):
      <img src="/escudos/${campeao.clube_id}.png" onerror="this.style.display='none'">

// DEPOIS:
      <img src="/escudos/${campeao.clube_id}.png" onerror="this.src='/escudos/default.png'">
```

---

### ARQUIVO 4: `public/js/mata-mata/mata-mata-financeiro.js` (492 linhas)

#### ALT-4.1: Importar setValoresFase (FIX-4)
**Linha 4:** Adicionar `setValoresFase` ao import

```javascript
// ANTES (linha 4):
import { edicoes, getLigaId, VALORES_FASE, TAMANHO_TORNEIO_DEFAULT, getFasesParaTamanho, FASE_NUM_JOGOS } from "./mata-mata-config.js";

// DEPOIS:
import { edicoes, getLigaId, VALORES_FASE, TAMANHO_TORNEIO_DEFAULT, getFasesParaTamanho, FASE_NUM_JOGOS, setValoresFase } from "./mata-mata-config.js";
```

#### ALT-4.2: Carregar valores financeiros da API no fluxo (FIX-4)
**Linhas 185-199:** No bloco onde busca config do torneio, tambem carregar valores

```javascript
// ANTES (linhas 185-199):
    if (tamanhoTorneio === TAMANHO_TORNEIO_DEFAULT) {
      try {
        const resConfig = await fetch(`/api/liga/${ligaId}/modulos/mata_mata`);
        if (resConfig.ok) {
          const configData = await resConfig.json();
          const totalTimes = Number(configData?.config?.wizard_respostas?.total_times);
          if (totalTimes && [8, 16, 32].includes(totalTimes)) {
            tamanhoTorneio = totalTimes;
            console.log(`[MATA-FINANCEIRO] Tamanho do torneio via API: ${tamanhoTorneio}`);
          }
        }
      } catch (err) {
        console.warn("[MATA-FINANCEIRO] Erro ao buscar config, usando default");
      }
    }

// DEPOIS:
    if (tamanhoTorneio === TAMANHO_TORNEIO_DEFAULT) {
      try {
        const resConfig = await fetch(`/api/liga/${ligaId}/modulos/mata_mata`);
        if (resConfig.ok) {
          const configData = await resConfig.json();
          const wizardRespostas = configData?.config?.wizard_respostas;
          const totalTimes = Number(wizardRespostas?.total_times);
          if (totalTimes && [8, 16, 32].includes(totalTimes)) {
            tamanhoTorneio = totalTimes;
            console.log(`[MATA-FINANCEIRO] Tamanho do torneio via API: ${tamanhoTorneio}`);
          }
          // FIX-4: Carregar valores financeiros da config
          const valorVitoria = Number(wizardRespostas?.valor_vitoria);
          const valorDerrota = Number(wizardRespostas?.valor_derrota);
          if (valorVitoria > 0 && valorDerrota < 0) {
            setValoresFase(valorVitoria, valorDerrota);
          }
        }
      } catch (err) {
        console.warn("[MATA-FINANCEIRO] Erro ao buscar config, usando default");
      }
    }
```

#### ALT-4.3: Filtro de temporada nas edicoes processaveis (FIX-10)
**Linhas 211-213:** Adicionar campo temporada no filtro (preparacao para multi-temporada)

**Nota:** Edicoes no frontend NAO tem campo `temporada` ainda. O fix real e: quando edicoes forem carregadas da API (FIX-3), o backend ja filtra por temporada. No frontend, o filtro por `rodada_atual > edicao.rodadaInicial` continua suficiente porque a API so retorna edicoes da temporada corrente. **Nao precisa mudar o filter aqui** — o FIX-10 e resolvido pelo FIX-3 (edicoes vem da API ja filtradas por temporada).

**Status FIX-10:** Resolvido implicitamente pelo FIX-3.

---

### ARQUIVO 5: `public/css/modules/mata-mata.css` (504 linhas)

#### ALT-5.1: Adicionar overflow-x-auto na tabela (FIX-7)
**Apos linha 81 (antes do seletor `#mataMataContent table`):** Adicionar container com overflow

```css
/* ADICIONAR ANTES da linha 82: */
.mata-mata-table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -4px;
  padding: 0 4px;
}
```

#### ALT-5.2: Classes para renderizarAguardandoDados (FIX-8)
**Adicionar ao final do arquivo (antes do bloco @media):**

```css
/* Estado Aguardando Dados */
.mata-mata-aguardando {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 136, 0, 0.2);
  min-height: 300px;
  margin: 20px;
}

.mata-mata-aguardando-icon {
  font-size: 64px;
  color: var(--laranja, #ff8800);
  margin-bottom: 20px;
}

.mata-mata-aguardando-titulo {
  font-family: 'Russo One', sans-serif;
  color: white;
  font-size: 24px;
  margin-bottom: 12px;
}

.mata-mata-aguardando-texto {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  max-width: 400px;
  line-height: 1.5;
}

/* Estado Aguardando Fase (FIX-1) */
.mata-mata-aguardando-fase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: rgba(42, 42, 42, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 136, 0, 0.15);
  min-height: 200px;
}

.mata-mata-aguardando-fase .material-symbols-outlined {
  font-size: 48px;
  color: var(--laranja, #ff8800);
  margin-bottom: 16px;
}

.mata-mata-aguardando-fase h4 {
  font-family: 'Russo One', sans-serif;
  color: white;
  font-size: 18px;
  margin-bottom: 8px;
}

.mata-mata-aguardando-fase p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  max-width: 350px;
}
```

#### ALT-5.3: Responsividade mobile extra (FIX-7)
**Dentro do bloco `@media (max-width: 768px)` (linhas 443-503):** Adicionar regras

```css
/* ADICIONAR dentro do @media (max-width: 768px), apos a linha 464: */

  .mata-mata-table-container {
    margin: 0 -8px;
    padding: 0 8px;
  }

  .pontos-cell {
    min-width: 44px;
  }

  .time-nome {
    font-size: 11px;
  }

  .time-cartoleiro {
    font-size: 9px;
  }

  .premio-valor {
    font-size: 8px;
  }
```

---

### ARQUIVO 6: `controllers/mata-mata-backend.js` (527 linhas)

#### ALT-6.1: Endpoint registrar-financeiro NAO necessario (FIX-2 reavaliado)

**Reavaliacao:** O backend ja integra mata-mata no fluxo financeiro via `getResultadosMataMataCompleto()` importado em `fluxoFinanceiroController.js:43`. Os resultados sao calculados em tempo real e combinados no extrato. Criar um endpoint separado para registrar no `extratofinanceiro` duplicaria dados.

**Decisao:** FIX-2 sera implementado como **melhoria no backend existente** — adicionar `chaveIdempotencia` e `temporada` nos resultados retornados por `calcularResultadosEdicao()`.

**Linhas 346-361:** Adicionar `chaveIdempotencia` e `temporada` nos objetos de resultado

```javascript
// ANTES (linhas 346-361):
                    resultadosFinanceiros.push({
                        timeId: String(vencedor.timeId),
                        fase: fase,
                        rodadaPontos: rodadaPontosNum,
                        valor: valorVitoria,
                        edicao: edicao.id,
                    });

                    resultadosFinanceiros.push({
                        timeId: String(perdedor.timeId),
                        fase: fase,
                        rodadaPontos: rodadaPontosNum,
                        valor: valorDerrota,
                        edicao: edicao.id,
                    });

// DEPOIS:
                    resultadosFinanceiros.push({
                        timeId: String(vencedor.timeId),
                        fase: fase,
                        rodadaPontos: rodadaPontosNum,
                        valor: valorVitoria,
                        edicao: edicao.id,
                        temporada: CURRENT_SEASON,
                        chaveIdempotencia: `matamata-${edicao.id}-${fase}-${vencedor.timeId}-${CURRENT_SEASON}`,
                    });

                    resultadosFinanceiros.push({
                        timeId: String(perdedor.timeId),
                        fase: fase,
                        rodadaPontos: rodadaPontosNum,
                        valor: valorDerrota,
                        edicao: edicao.id,
                        temporada: CURRENT_SEASON,
                        chaveIdempotencia: `matamata-${edicao.id}-${fase}-${perdedor.timeId}-${CURRENT_SEASON}`,
                    });
```

---

### ARQUIVO 7: `public/js/mata-mata/mata-mata-confrontos.js` (sem alteracoes)

Nenhuma alteracao necessaria neste arquivo. Os `VALORES_FASE` importados serao atualizados automaticamente via mutacao do objeto (ALT-1.2).

---

## FIXes e Status

| FIX | Descricao | Alteracao | Status |
|-----|-----------|-----------|--------|
| FIX-1 | Bug pre-temporada 0/32 | ALT-2.3 + ALT-5.2 | Implementar |
| FIX-2 | Integracao extratofinanceiro | ALT-6.1 (chaveIdempotencia) | Implementar (simplificado) |
| FIX-3 | Carregar edicoes da API | ALT-1.1 + ALT-2.2 | Implementar |
| FIX-4 | Valores financeiros dinamicos | ALT-1.2 + ALT-2.2 + ALT-3.2 + ALT-4.1 + ALT-4.2 | Implementar |
| FIX-5 | Escape XSS | ALT-3.1 | Implementar |
| FIX-6 | Verificar modulos_ativos | **Diferido** — ja feito em `detalhe-liga-orquestrador.js` | Verificar |
| FIX-7 | Responsividade mobile | ALT-5.1 + ALT-5.3 | Implementar |
| FIX-8 | Remover inline styles | ALT-2.4 + ALT-5.2 | Implementar |
| FIX-9 | Padronizar fallback escudo | ALT-3.3 | Implementar |
| FIX-10 | Filtro temporada financeiro | Resolvido por FIX-3 | Resolvido |
| FIX-11 | Cache de vencedores | **Diferido** — otimizacao, nao critica | Backlog |
| FIX-12 | Rate limiting | **Ja implementado** em `mataMataCacheRoutes.js:21-48` | Concluido |

---

## FIX-6: Verificacao `modulos_ativos`

**Investigacao necessaria:** Verificar se `detalhe-liga-orquestrador.js` ja condiciona o carregamento do modulo mata-mata com base em `liga.modulos_ativos.mata_mata`. Se sim, FIX-6 ja esta resolvido. Se nao, adicionar guard no inicio de `carregarMataMata()`:

```javascript
// No inicio de carregarMataMata(), apos obter ligaId:
// Verificar se modulo esta ativo (se a liga expoe essa info)
```

**Decisao:** Verificar na fase de implementacao (code). Se ja protegido pelo orquestrador da liga, nao implementar.

---

## Ordem de Implementacao

1. **ALT-1.1 + ALT-1.2** — Config mutavel (base para FIX-3 e FIX-4)
2. **ALT-5.1 + ALT-5.2 + ALT-5.3** — CSS (sem dependencias)
3. **ALT-3.1 + ALT-3.2 + ALT-3.3** — UI fixes (XSS, valores, escudos)
4. **ALT-4.1 + ALT-4.2** — Financeiro (depende de ALT-1.2)
5. **ALT-2.1 + ALT-2.2 + ALT-2.3 + ALT-2.4** — Orquestrador (depende de ALT-1.x)
6. **ALT-6.1** — Backend (independente)

---

## Testes Necessarios

1. **Pre-temporada:** Acessar mata-mata quando `rodada_atual === 0` ou `rodada_atual < rodadaDefinicao` — deve mostrar mensagem amigavel, NAO erro
2. **Edicoes dinamicas:** Configurar liga com 3 edicoes via wizard → frontend deve mostrar apenas 3 edicoes no selector
3. **Valores dinamicos:** Configurar liga com R$5/-R$5 → tabela deve mostrar "R$ 5,00" e "-R$ 5,00"
4. **XSS:** Injetar `<script>alert(1)</script>` em nome de time → deve renderizar como texto
5. **Mobile:** Viewport 375px → tabela deve ter scroll horizontal, nao estourar
6. **Escudo fallback:** Time sem escudo → deve mostrar `/escudos/default.png`
7. **Financeiro backend:** Resultados devem conter `chaveIdempotencia` e `temporada`

---

## Rollback Plan

Todos os arquivos modificados sao frontend (exceto `mata-mata-backend.js`). Rollback = `git revert` do commit.

- **Zero risco de quebra de banco** — nenhuma alteracao em models ou migrations
- **Fallbacks preservados** — valores default permanecem nos arquivos para quando a API nao responde
- **Compatibilidade backward** — `edicoes` continua como array exportado, referencia nao muda

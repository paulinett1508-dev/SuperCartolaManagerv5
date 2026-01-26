# SPEC: Fix 404 em APIs de Ranking para Liga Nova

## Referencia
- **PRD:** `.claude/docs/PRD-404-ranking-liga-nova.md`
- **Solucao Escolhida:** Opcao A - Melhorar UX no Frontend

---

## Resumo da Mudanca

Melhorar a mensagem exibida quando uma liga nao tem rodadas processadas, diferenciando entre:
1. **Pre-temporada:** "Campeonato ainda nao iniciou. Aguarde a rodada 1!"
2. **Turno sem dados:** "Sem dados para este turno" (comportamento atual)

---

## Analise S.D.A (Sistema de Dependencias Arquiteturais)

### Arquivo a Modificar

| Arquivo | Linhas | Tipo | Descricao |
|---------|--------|------|-----------|
| `public/participante/js/modules/participante-ranking.js` | 249-258 | Mudanca Cirurgica | Tratamento de resposta vazia da API |

### Dependencias Verificadas

| Dependencia | Localização | Status |
|-------------|-------------|--------|
| `ParticipanteConfig.isPreparando()` | `participante-config.js:56` | **JA EXISTE** - Retorna `true` se `SEASON_STATUS === 'preparando'` |
| `window.ParticipanteConfig` | Global | **JA EXISTE** - Exportado para uso global |
| `/api/cartola/mercado/status` | Usado em `detectarStatusTemporada()` | **NAO NECESSARIO** - Usar config global |

### Por que usar `ParticipanteConfig.isPreparando()` em vez da API?

1. **Ja carregado:** `participante-config.js` e carregado ANTES dos modulos
2. **Zero latencia:** Nao precisa fazer fetch adicional
3. **Consistencia:** Mesmo criterio usado em outros modulos (extrato, home)
4. **Simplicidade:** Uma linha de codigo vs funcao async

---

## Mudancas Cirurgicas

### Arquivo: `participante-ranking.js`

#### Localizacao: Linhas 249-258

**ANTES:**
```javascript
        if (!data.success || !data.ranking) {
            if (!usouCache) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">event_busy</span>
                        <p>Sem dados para este turno</p>
                    </div>
                `;
            }
            return;
        }
```

**DEPOIS:**
```javascript
        if (!data.success || !data.ranking) {
            if (!usouCache) {
                // Detectar se e pre-temporada usando config global
                const config = window.ParticipanteConfig;
                const isPreTemporada = config && config.isPreparando && config.isPreparando();

                const icone = isPreTemporada ? 'schedule' : 'event_busy';
                const mensagem = isPreTemporada
                    ? 'Campeonato ainda nao iniciou. Aguarde a rodada 1!'
                    : 'Sem dados para este turno';

                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">${icone}</span>
                        <p>${mensagem}</p>
                    </div>
                `;
            }
            return;
        }
```

#### Justificativa
- **Mudanca minima:** Apenas 8 linhas adicionadas, zero refatoracao
- **Preserva logica existente:** Condicao `if (!usouCache)` mantida
- **Fallback seguro:** Se `ParticipanteConfig` nao existir, usa mensagem original
- **Icone contextual:** `schedule` (relogio) para pre-temporada, `event_busy` para sem dados

---

## Impacto em Outros Modulos

| Modulo | Impacto |
|--------|---------|
| `participante-extrato.js` | **NENHUM** - Ja usa `CONFIG.isPreparando()` |
| `participante-navigation.js` | **NENHUM** - Usa `config.isPreparando()` |
| `participante-home.js` | **NENHUM** - Nao afetado |
| `participante-rodadas.js` | **NENHUM** - Nao afetado |

---

## Testes Necessarios

### Cenario 1: Liga Nova em Pre-Temporada
- **Liga:** Os Fuleros (ID: 6977a62071dee12036bb163e)
- **Temporada:** 2026
- **Esperado:** Icone de relogio + "Campeonato ainda nao iniciou. Aguarde a rodada 1!"

### Cenario 2: Liga Existente com Rodadas
- **Liga:** Super Cartola 2025/2026
- **Esperado:** Ranking normal carregado

### Cenario 3: Liga Existente sem Dados do Turno Especifico
- **Liga:** Super Cartola
- **Turno:** 2 (se ainda nao comecou 2o turno)
- **Esperado:** Icone calendar + "Sem dados para este turno"

### Cenario 4: Cache Existente + API Falha
- **Condicao:** Cache com dados + API retorna 404
- **Esperado:** Exibe dados do cache (comportamento existente preservado)

---

## Rollback Plan

Se necessario reverter, restaurar linhas 249-258 para:

```javascript
        if (!data.success || !data.ranking) {
            if (!usouCache) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">event_busy</span>
                        <p>Sem dados para este turno</p>
                    </div>
                `;
            }
            return;
        }
```

---

## Checklist Pre-Implementacao

- [x] PRD revisado e solucao aprovada
- [x] Arquivo alvo identificado: `participante-ranking.js`
- [x] Linhas exatas mapeadas: 249-258
- [x] Dependencias verificadas: `ParticipanteConfig.isPreparando()` existe
- [x] Impacto em outros modulos: NENHUM
- [x] Testes definidos
- [x] Rollback plan documentado

---

## Proximos Passos

1. Executar `/code SPEC-404-ranking-liga-nova.md`
2. Testar com liga "Os Fuleros"
3. Verificar em liga existente
4. Commit com mensagem: `fix(ranking): melhora UX para ligas sem rodadas processadas`

---

**Gerado em:** 2026-01-26
**Autor:** High Senior Protocol - Fase 2 (Specification)
**Versao:** 1.0

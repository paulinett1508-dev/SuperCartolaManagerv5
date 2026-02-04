# AUDIT RULE: Business Logic (Regras de Negócio)

## 🎯 Objetivo
Garantir que módulos respeitam as **regras de negócio do Super Cartola Manager**: configurações de liga, temporadas, estados do sistema e lógica de módulos.

---

## ✅ Checklist de Auditoria

### 1. **Respeito a `modulos_ativos`**

#### Verificação de Habilitação
- [ ] Módulo verifica se está ativo na liga (`Liga.modulos_ativos`)
- [ ] Retorna erro claro se módulo desabilitado
- [ ] Endpoint `/api/liga/config` consultado quando necessário

**Exemplo correto:**
```javascript
const liga = await Liga.findOne({ _id: ligaId });
if (!liga.modulos_ativos.top10) {
    return res.status(403).json({
        erro: 'Módulo Top 10 não está ativo nesta liga'
    });
}
```

#### Config Granular (ModuleConfig)
- [ ] Módulo consulta `ModuleConfig` para parâmetros específicos
- [ ] Respeita configs por liga/temporada
- [ ] Fallback para defaults se config ausente

**Exemplo:**
```javascript
const config = await ModuleConfig.findOne({
    modulo: 'artilheiro',
    ligaId,
    temporada
});

const valorAposta = config?.valorAposta || 10; // fallback
```

---

### 2. **Filtro por Temporada**

#### Separação de Dados
- [ ] TODAS queries filtram por `temporada`
- [ ] Nunca mistura dados de temporadas diferentes
- [ ] Usa `temporada` atual do sistema ou parâmetro explícito

**❌ ERRADO:**
```javascript
const apostas = await Aposta.find({ timeId });
```

**✅ CORRETO:**
```javascript
const apostas = await Aposta.find({
    timeId,
    temporada: temporadaAtual
});
```

---

### 3. **Tratamento de Pré-Temporada**

#### Detecção de Pré-Temporada
- [ ] Verifica se `temporada > statusMercado.temporada`
- [ ] Trata período entre temporadas corretamente
- [ ] Permite inscrições/renovações em pré-temporada

**Exemplo:**
```javascript
const statusMercado = await fetch('/api-cartola/status').then(r => r.json());
const preTemporada = temporadaSelecionada > statusMercado.temporada;

if (preTemporada) {
    // Lógica específica de pré-temporada
    return renderizarModoPreTemporada();
}
```

#### Comportamento Específico
- [ ] Módulos financeiros permitem renovação antecipada
- [ ] Ranking/estatísticas mostram temporada anterior
- [ ] Mensagens claras sobre início da nova temporada

---

### 4. **Estados do Sistema**

#### Estado do Mercado (Cartola API)
- [ ] Verifica `mercado.status` (aberto/fechado)
- [ ] Adapta comportamento baseado no estado
- [ ] Atualiza status regularmente

**Estados comuns:**
```javascript
const mercadoAberto = statusMercado.status_mercado === 1;
const rodadaEmAndamento = statusMercado.rodada_atual > 0;
const temporadaAtiva = statusMercado.temporada >= 2026;
```

#### Rodada Finalizada
- [ ] Detecta se rodada foi consolidada
- [ ] Não permite alterações em rodadas finalizadas
- [ ] Calcula resultados apenas após finalização

---

### 5. **Participantes Ativos**

#### Validação de Participação
- [ ] Verifica `participante.ativo === true`
- [ ] Exclui participantes inativos de rankings/cálculos
- [ ] Permite admin gerenciar inativos

**Exemplo:**
```javascript
const participantes = await Time.find({
    ligaId,
    temporada,
    ativo: true
});
```

#### Inscrição na Temporada
- [ ] Valida se participante pagou inscrição (`pagouInscricao: true`)
- [ ] Aplica regras de prazo de inscrição
- [ ] Registra em `inscricoestemporada` collection

---

### 6. **Lógica de Cálculo Consistente**

#### Pontos e Estatísticas
- [ ] Usa mesma fórmula em todos lugares
- [ ] Busca dados da API Cartola (não inventa)
- [ ] Trata empates corretamente (critérios de desempate)

**Exemplo (Ranking):**
```javascript
// Critério consistente: pontos > vitórias > saldo
const ranking = participantes.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    return b.saldo - a.saldo;
});
```

#### Scouts do Cartola
- [ ] Usa scouts oficiais (FC, FS, G, etc.)
- [ ] Não cria scouts customizados sem documentar
- [ ] Respeita pesos do Cartola (scout * fator)

---

### 7. **Regras de Liga (ligarules)**

#### Consulta de Regras
- [ ] Busca regras em `ligarules` (não hardcode)
- [ ] Permite customização por liga
- [ ] Documenta regras default se ausente

**Exemplo:**
```javascript
const regras = await LigaRules.findOne({ ligaId, temporada });
const valorInscricao = regras?.valorInscricao || 50;
const prazoRenovacao = regras?.prazoRenovacaoDias || 30;
```

#### Regras Comuns
- [ ] Valor de inscrição/renovação
- [ ] Prazo de pagamento
- [ ] Penalidades por atraso
- [ ] Critérios de desempate
- [ ] Premiação (1º, 2º, 3º lugares)

---

### 8. **Tratamento de Edge Cases**

#### Cenários Incomuns
- [ ] Rodada não iniciada (rodada 0)
- [ ] Temporada sem dados (nova liga)
- [ ] Participante sem time escalado
- [ ] Empate triplo em ranking

**Exemplo:**
```javascript
if (rodadaAtual === 0) {
    return res.json({
        mensagem: 'Temporada ainda não iniciou',
        rodadas: []
    });
}
```

---

### 9. **Integração com API Cartola**

#### Endpoints Corretos
- [ ] Usa endpoints oficiais da API Cartola
- [ ] Trata erros da API (timeout, 404, 500)
- [ ] Cache para reduzir requests

**Endpoints comuns:**
```javascript
GET /api-cartola/status           // Status do mercado
GET /api-cartola/time/{id}        // Dados do time
GET /api-cartola/atletas/pontuados // Pontuação da rodada
```

#### Fallbacks
- [ ] Cache stale em caso de falha da API
- [ ] Mensagem clara de "API indisponível"
- [ ] Retry automático (com backoff)

---

### 10. **Módulos Interdependentes**

#### Dependências Claras
- [ ] Documenta dependências entre módulos
- [ ] Valida pré-requisitos antes de executar
- [ ] Degrada gracefully se dependência ausente

**Exemplo:**
```javascript
// Artilheiro depende de Extrato Financeiro
if (!liga.modulos_ativos.extratoFinanceiro) {
    throw new Error('Módulo Artilheiro requer Extrato Financeiro ativo');
}
```

---

## 🚨 Red Flags Críticos

| Problema | Severidade | Impacto | Ação |
|----------|-----------|---------|------|
| Query sem filtro `temporada` | 🔴 CRÍTICO | Mistura dados | Adicionar filtro |
| Ignora `modulos_ativos` | 🔴 CRÍTICO | Módulo sempre visível | Validar habilitação |
| Hardcode de valores (não usa `ligarules`) | 🟠 ALTO | Inflexível | Buscar de config |
| Não trata pré-temporada | 🟠 ALTO | Comportamento incorreto | Implementar lógica |
| Sem validação de `ativo` | 🟡 MÉDIO | Inativos em ranking | Filtrar participantes |
| Fórmula de cálculo diferente | 🟡 MÉDIO | Inconsistência | Unificar lógica |

---

## 📊 Exemplo Completo (Top 10 com Regras)

```javascript
router.get('/api/top10/:temporada/:rodada', async (req, res) => {
    try {
        const { temporada, rodada } = req.params;
        const ligaId = req.session.usuario.ligaId;

        // 1. Verificar se módulo está ativo
        const liga = await Liga.findOne({ _id: ligaId });
        if (!liga.modulos_ativos.top10) {
            return res.status(403).json({
                erro: 'Módulo Top 10 não está ativo'
            });
        }

        // 2. Buscar config específica
        const config = await ModuleConfig.findOne({
            modulo: 'top10',
            ligaId,
            temporada: parseInt(temporada)
        });

        const quantidadeTop = config?.quantidade || 10;

        // 3. Buscar apenas participantes ativos
        const participantes = await Time.find({
            ligaId,
            temporada: parseInt(temporada),
            ativo: true
        });

        // 4. Buscar pontuações da rodada (com filtro temporada)
        const pontuacoes = await Pontuacao.find({
            temporada: parseInt(temporada),
            rodada: parseInt(rodada),
            time_id: { $in: participantes.map(p => p.id) }
        });

        // 5. Lógica de negócio: ordenar por pontos
        const ranking = pontuacoes
            .sort((a, b) => b.pontos - a.pontos)
            .slice(0, quantidadeTop);

        // 6. Enriquecer com dados dos times
        const top10 = ranking.map(p => {
            const time = participantes.find(t => t.id === p.time_id);
            return {
                posicao: ranking.indexOf(p) + 1,
                time: time.nome_time,
                cartoleiro: time.nome_cartoleiro,
                pontos: p.pontos,
                escudo: time.escudo_id
            };
        });

        res.json({
            temporada: parseInt(temporada),
            rodada: parseInt(rodada),
            top10
        });

    } catch (erro) {
        console.error('Erro ao buscar Top 10:', erro);
        res.status(500).json({ erro: 'Falha ao carregar ranking' });
    }
});
```

---

## 🔗 Referências

### Documentação Interna
- `CLAUDE.md` → Seções "Sistema de Módulos" e "Estrutura de Dados"
- `docs/SISTEMA-RENOVACAO-TEMPORADA.md` → Flags e regras temporada
- `docs/ARQUITETURA-MODULOS.md` → Estrutura de controle

### Collections MongoDB
- `ligas` → Config geral da liga
- `ligarules` → Regras customizáveis
- `moduleconfigs` → Config por módulo
- `times` → Participantes
- `inscricoestemporada` → Registro de inscrições

### API Cartola
- Status: `https://api.cartola.globo.com/status`
- Time: `https://api.cartola.globo.com/time/id/{id}`
- Atletas: `https://api.cartola.globo.com/atletas/pontuados`

---

**Última atualização:** 04/02/2026
**Versão:** 1.0.0

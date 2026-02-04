# Guia de Temporadas - Super Cartola Manager

## TL;DR - O Que Fazer na Virada de Ano

```javascript
// Edite APENAS este arquivo:
// config/seasons.js

export const CURRENT_SEASON = 2026;  // Mude de 2025 para 2026
```

**Pronto.** O sistema começa uma temporada nova e os dados antigos ficam preservados, separados pelo campo `temporada`.

---

## Arquitetura de Temporadas

### Arquivo Central
```
config/seasons.js
```

Este é o **ÚNICO** lugar onde você precisa mudar o ano. Todos os models importam `CURRENT_SEASON` daqui.

### Como os Dados São Separados

Cada documento no MongoDB agora tem um campo `temporada`:

```javascript
// Exemplo de documento na collection "rodadas"
{
  ligaId: "684cb1c8af923da7c7df51de",
  temporada: 2025,  // <-- Este campo separa os dados
  rodada: 38,
  timeId: 645089,
  pontos: 85.5
}
```

---

## Checklist - Virada de Temporada

### Antes de Virar (Dezembro)

- [ ] Verificar se todas as rodadas foram consolidadas
- [ ] Executar `node scripts/turn_key_2026.js --dry` para simular
- [ ] Fazer backup: `node scripts/backupJson.js`

### Na Virada (Janeiro)

1. **Mudar a constante:**
   ```javascript
   // config/seasons.js
   export const CURRENT_SEASON = 2026;
   ```

2. **(Opcional) Manter histórico de temporadas:**
  Caso deseje, adicione um campo `historico` em config/seasons.js para referência, mas não é obrigatório para funcionamento:
  ```javascript
  // config/seasons.js
  // historico: [2025, 2026],
  ```

3. **Reiniciar o servidor**

### Depois de Virar

- [ ] Verificar se o sistema está criando dados com `temporada: 2026`
- [ ] Testar se dados de 2025 ainda são acessíveis (Hall da Fama, Histórico)

---

## Consultas por Temporada

### Buscar Dados da Temporada Atual
```javascript
import { CURRENT_SEASON, getSeasonFilter } from '../config/seasons.js';

// Recomendado: sempre use o helper para garantir filtro correto
const rodadas = await Rodada.find(getSeasonFilter());

// Ou, se necessário, direto:
const rodadas = await Rodada.find({ temporada: CURRENT_SEASON });
```

### Buscar Dados Históricos (2025)
```javascript
const rodadas2025 = await Rodada.find({ temporada: 2025 });

// Ou usando helper
const rodadas2025 = await Rodada.find(getSeasonFilter(2025));
```

### Buscar Todas as Temporadas
```javascript
import { getAvailableSeasons } from '../config/seasons.js';

const temporadas = getAvailableSeasons(); // [2025, 2026, ...]
```

---

## Models com Campo Temporada

| Model | Collection MongoDB |
|-------|-------------------|
| Liga | `ligas` |
| Time | `times` |
| Rodada | `rodadas` |
| ExtratoFinanceiroCache | `extratofinanceirocaches` |
| RodadaSnapshot | `rodadasnapshots` |
| PontosCorridosCache | `pontoscorridoscaches` |
| Top10Cache | `top10caches` |
| MataMataCache | `matamatacaches` |
| MelhorMesCache | `melhor_mes_cache` |
| RankingGeralCache | `rankinggeralcaches` |
| FluxoFinanceiroCampos | `fluxofinanceirocampos` |
| RankingTurno | `rankingturno` |
| Gols | `gols` |
| Goleiros | `goleiros` |
| ArtilheiroCampeao | `artilheirocampeaos` |
| AcertoFinanceiro | `acertofinanceiros` |

---

## Scripts Úteis

### Migrar Dados Existentes (Adicionar temporada)
```bash
# Simular primeiro
node scripts/migrar-temporada-2025.js --dry

# Executar
node scripts/migrar-temporada-2025.js
```

### Virada de Temporada Completa
```bash
# Só funciona após 01/01/2026
node scripts/turn_key_2026.js
```

### Backup Completo
```bash
node scripts/backupJson.js
```

---

## FAQ

### P: O que acontece se eu esquecer de mudar CURRENT_SEASON?
**R:** Os novos dados serão criados com a temporada antiga (2025). Você pode corrigir depois com um script de migração.

### P: Os dados antigos são apagados?
**R:** Não! Os dados de 2025 permanecem no banco, apenas filtrados por `temporada: 2025`.

### P: Posso ter duas temporadas ativas ao mesmo tempo?
**R:** Não recomendado. O sistema assume uma temporada ativa por vez.

### P: Como mostrar o histórico para os usuários?
**R:** Crie endpoints/páginas que buscam com `temporada: 2025` explícito.

---

## Arquivos Relacionados

```
config/
  seasons.js           # Constante CURRENT_SEASON (EDITAR AQUI)

models/
  *.js                 # Todos usam temporada como campo

scripts/
  migrar-temporada-2025.js  # Migração inicial
  turn_key_2026.js          # Virada de temporada
  backupJson.js             # Backup geral

docs/
  TEMPORADAS-GUIA.md   # Este arquivo
```

---

**Última atualização:** Janeiro 2026
**Versão:** 1.1.0

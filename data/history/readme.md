# Season Heritage - Sistema de Legado

## Visao Geral

Este diretorio armazena o **historico permanente** de todas as temporadas do Super Cartola.
Ao encerrar cada temporada, os dados sao consolidados aqui antes da limpeza do banco principal.

## Estrutura de Pastas

```
data/
├── users_registry.json      # Cartorio Vitalicio - registro permanente de usuarios
└── history/
    ├── readme.md            # Este arquivo
    ├── 2025/                # Temporada 2025
    │   ├── rankings/
    │   │   ├── supercartola_final.json
    │   │   └── cartoleiros_sobral_final.json
    │   ├── modulos/
    │   │   ├── pontos_corridos.json
    │   │   ├── mata_mata.json
    │   │   ├── top10.json
    │   │   ├── artilheiro.json
    │   │   ├── luva_ouro.json
    │   │   └── melhor_mes.json
    │   ├── financeiro/
    │   │   └── extrato_consolidado.json
    │   └── metadata.json    # Info da temporada
    ├── 2026/                # Futuras temporadas
    └── ...
```

## Fluxo de Encerramento de Temporada

Ao encerrar uma temporada (ex: rodada 38 finalizada), execute o seguinte processo:

### 1. Exportar Rankings Finais

```javascript
// Script: scripts/encerrar-temporada.js
const rankings = await exportarRankingsFinais(ligaId, temporada);
// Salva em: data/history/{ano}/rankings/{liga}_final.json
```

### 2. Exportar Dados de Modulos

```javascript
const modulos = ['pontos_corridos', 'mata_mata', 'top10', 'artilheiro', 'luva_ouro', 'melhor_mes'];
for (const modulo of modulos) {
    const dados = await exportarModulo(ligaId, modulo, temporada);
    // Salva em: data/history/{ano}/modulos/{modulo}.json
}
```

### 3. Atualizar Cartorio Vitalicio

```javascript
// Para cada participante da temporada:
const registry = require('../users_registry.json');

for (const participante of participantesDaTemporada) {
    const user = registry.users.find(u => u.id === participante.userId);

    if (user) {
        // Usuario existente - adicionar temporada ao historico
        user.active_seasons.push(temporada);
        user.historico.push(gerarHistoricoTemporada(participante, temporada));
        atualizarStatsAgregadas(user);
    } else {
        // Novo usuario - criar registro
        registry.users.push(criarNovoRegistro(participante, temporada));
    }
}

// Salvar registry atualizado
fs.writeFileSync('data/users_registry.json', JSON.stringify(registry, null, 2));
```

### 4. Criar Metadata da Temporada

```javascript
// data/history/{ano}/metadata.json
{
    "temporada": 2025,
    "data_inicio": "2025-04-13",
    "data_fim": "2025-12-08",
    "total_rodadas": 38,
    "ligas": [
        {
            "id": "684cb1c8af923da7c7df51de",
            "nome": "SuperCartola",
            "participantes": 32,
            "campeao": { "nome": "Time X", "pontos": 2500 }
        }
    ],
    "exportado_em": "2025-12-15T10:00:00Z",
    "versao_sistema": "1.0.0"
}
```

## Schema do Cartorio Vitalicio (users_registry.json)

```typescript
interface UserRegistry {
    id: string;                    // ID unico do usuario
    nome: string;                  // Nome do participante
    email?: string;                // Email (opcional)
    primeiro_registro: string;     // Ano da primeira participacao
    active_seasons: string[];      // Temporadas com acesso ativo
    ligas_participadas: LigaParticipacao[];
    historico: HistoricoTemporada[];
    stats_agregadas: StatsAgregadas;
}

interface HistoricoTemporada {
    ano: number;
    liga_id: string;
    liga_nome: string;
    time_nome: string;
    time_escudo?: string;
    estatisticas: {
        posicao_final: number;
        pontos_totais: number;
        media_pontos: number;
        rodadas_jogadas: number;
        melhor_rodada: { numero: number; pontos: number };
        pior_rodada: { numero: number; pontos: number };
    };
    financeiro: {
        saldo_final: number;
        total_bonus: number;
        total_onus: number;
    };
    conquistas: {
        badges: string[];          // Ex: "campeao_2025", "mito_rodada_15"
        titulos: Record<string, any>;
        top10_mitos: TopEntry[];
        top10_micos: TopEntry[];
    };
}
```

## Badges Disponiveis

| Badge | Descricao | Criterio |
|-------|-----------|----------|
| `campeao_{ano}` | Campeao da temporada | 1o lugar no ranking geral |
| `vice_{ano}` | Vice-campeao | 2o lugar no ranking geral |
| `terceiro_{ano}` | Terceiro lugar | 3o lugar no ranking geral |
| `mito_rodada_{n}` | Mito da rodada N | 1o lugar em uma rodada |
| `artilheiro_{ano}` | Artilheiro da temporada | 1o no ranking Artilheiro |
| `luva_ouro_{ano}` | Luva de Ouro | 1o no ranking Luva de Ouro |
| `campeao_mm_{edicao}` | Campeao Mata-Mata | Vencedor de edicao MM |
| `melhor_mes_{mes}` | Melhor do mes | 1o no ranking mensal |
| `top10_mito` | Top 10 Mitos | Apareceu no Top 10 Mitos |
| `invicto_mm` | Invicto no MM | Venceu MM sem perder |

## Controle de Acesso (active_seasons)

O campo `active_seasons` controla quais temporadas o usuario pode acessar:

- **Temporada atual**: Todos os participantes ativos tem acesso
- **Temporadas passadas**: Acesso ao Hall da Fama (somente leitura)
- **Renovacao**: Ao se inscrever em nova temporada, adiciona o ano ao array

```javascript
// Verificar acesso
function temAcesso(user, temporada) {
    return user.active_seasons.includes(temporada);
}

// Renovar para nova temporada
function renovarParticipacao(user, novaTemporada) {
    if (!user.active_seasons.includes(novaTemporada)) {
        user.active_seasons.push(novaTemporada);
    }
}
```

## Comandos Uteis

```bash
# Exportar temporada (futuro script)
npm run heritage:export -- --temporada=2025

# Validar integridade do registry
npm run heritage:validate

# Gerar relatorio de uma temporada
npm run heritage:report -- --temporada=2025
```

## Notas Importantes

1. **NUNCA deletar** arquivos desta pasta - sao dados historicos permanentes
2. **Backup obrigatorio** antes de qualquer operacao de escrita
3. Os dados do `users_registry.json` sao a **fonte da verdade** para o Hall da Fama
4. Snapshots de temporada sao **imutaveis** apos consolidacao
5. O banco MongoDB pode ser limpo apos a exportacao ser validada

---

*Criado em: 15/12/2025*
*Versao: 1.0.0*

# Sistema de Escudos dos Times do Brasileirão

## Visão Geral

Sistema automatizado para download e gerenciamento de escudos de todos os clubes brasileiros disponíveis na API oficial do Cartola FC. Os escudos são utilizados em:

- **Módulo Rodadas**: Exibição de escalação dos times
- **Escalação de Atletas**: Badge do clube de cada jogador
- **Rankings**: Identificação visual do clube do coração
- **Área do Participante**: Perfil e escalações

## Estrutura de Arquivos

```
public/escudos/
├── 262.png         # Flamengo
├── 263.png         # Botafogo
├── 264.png         # Corinthians
├── ...             # Demais clubes
├── default.png     # Fallback padrão
└── placeholder.png # Placeholder durante carregamento
```

**Padrão de Nomenclatura:** `{clube_id}.png`

## Script de Download

### Localização
```
scripts/baixar-escudos-times.js
```

### Funcionalidades

✅ Busca todos os clubes via API Cartola FC (`/clubes`)  
✅ Baixa escudos no formato 60x60 (melhor resolução disponível)  
✅ Salva em `public/escudos/{clube_id}.png`  
✅ Verifica arquivos existentes (não sobrescreve por padrão)  
✅ Log detalhado e colorido do processo  
✅ Modo dry-run para simulação  
✅ Suporte a verbose para debugging  

### Uso

#### Download Normal
```bash
node scripts/baixar-escudos-times.js
```

#### Modo Dry-Run (Simulação)
```bash
node scripts/baixar-escudos-times.js --dry-run
```

#### Forçar Re-download de Todos
```bash
node scripts/baixar-escudos-times.js --force
```

#### Modo Verbose (Debug)
```bash
node scripts/baixar-escudos-times.js --verbose
# ou
node scripts/baixar-escudos-times.js -v
```

#### Combinações
```bash
# Simular com log detalhado
node scripts/baixar-escudos-times.js --dry-run --verbose

# Re-download forçado com debug
node scripts/baixar-escudos-times.js --force --verbose
```

### Saída Exemplo

```
⚽ DOWNLOAD DE ESCUDOS DOS TIMES - SÉRIE A DO BRASILEIRÃO

ℹ Buscando clubes da API Cartola FC...
✓ 68 clubes encontrados

📥 Processando downloads...

✓ Flamengo (ID: 262)
✓ Botafogo (ID: 263)
✓ Corinthians (ID: 264)
...

📊 RESUMO DA EXECUÇÃO

Total de clubes:    68
Baixados:           44
Já existentes:      24
Erros:              0
Tempo de execução:  8.95s

📁 Diretório de destino: /home/runner/workspace/public/escudos

✓ Processo concluído com sucesso!
```

## IDs dos Clubes da Série A (2026)

| ID | Clube | Abreviação |
|----|-------|------------|
| 262 | Flamengo | FLA |
| 263 | Botafogo | BOT |
| 264 | Corinthians | COR |
| 265 | Bahia | BAH |
| 266 | Fluminense | FLU |
| 267 | Vasco | VAS |
| 275 | Palmeiras | PAL |
| 276 | São Paulo | SAO |
| 277 | Santos | SAN |
| 280 | Bragantino | RBB |
| 282 | Atlético-MG | CAM |
| 283 | Cruzeiro | CRU |
| 284 | Grêmio | GRE |
| 285 | Internacional | INT |
| 286 | Juventude | JUV |
| 287 | Vitória | VIT |
| 290 | Goiás | GOI |
| 292 | Sport | SPT |
| 293 | Athletico-PR | CAP |
| 354 | Ceará | CEA |
| 356 | Fortaleza | FOR |
| 1371 | Cuiabá | CUI |
| 2305 | Mirassol | MIR |

*Nota: A API retorna 68+ clubes (incluindo Série B, estaduais e históricos)*

## Integração com o Sistema

### Frontend - Uso Direto

Os escudos são referenciados diretamente via path relativo:

```javascript
// Pattern padrão em todo o sistema
const escudoUrl = `/escudos/${clube_id}.png`;
```

### Cache de Imagens

O módulo Rodadas implementa preload para performance:

```javascript
// public/js/rodadas/rodadas-cache.js
export function preloadEscudo(clubeId) {
  const src = `/escudos/${clubeId}.png`;
  return imageCache.preloadImage(src);
}

export function preloadEscudos(rankings) {
  const promises = rankings
    .filter((rank) => rank.clube_id)
    .map((rank) => preloadEscudo(rank.clube_id));
  
  return Promise.allSettled(promises);
}
```

### Exemplos de Uso no Código

#### 1. Escalação de Atletas (Participante PWA)
```javascript
// public/participante/js/modules/participante-rodadas.js
const clubeId = atleta.clube_id || extrairClubeIdDaFoto(atleta.foto);
const escudoSrc = clubeId ? `/escudos/${clubeId}.png` : '/escudos/default.png';

// Renderização
<img src="${escudoSrc}" 
     class="w-6 h-6 object-contain" 
     onerror="this.src='/escudos/default.png'" />
```

#### 2. Rankings (Identificação Visual)
```javascript
// public/participante/modules/ranking/ranking.js
const escudoHTML = participante.clube_id
  ? `<img src="/escudos/${participante.clube_id}.png"
          class="w-5 h-5 rounded-full object-cover"
          onerror="this.style.display='none'">`
  : '';
```

#### 3. Módulo Rodadas (Desktop Admin)
```javascript
// public/js/rodadas/rodadas-ui.js
const escudoUrl = rank.clube_id
  ? `/escudos/${rank.clube_id}.png`
  : rank.escudo_url || '/img/escudo_default.png';
```

#### 4. Análise de Participantes
```javascript
// public/js/analisar-participantes.js
<div class="dl-jersey-badge">
  <img src="/escudos/${atleta.clube_id}.png" 
       onerror="this.style.display='none'" />
</div>
```

## Fallbacks e Tratamento de Erros

### Estratégia de Fallback em Cadeia

```javascript
// 1. Tentar escudo local
const escudoSrc = clubeId ? `/escudos/${clubeId}.png` : null;

// 2. Fallback inline via onerror
<img src="${escudoSrc}" onerror="this.src='/escudos/default.png'" />

// 3. Fallback via lógica JS
const escudoUrl = rank.clube_id
  ? `/escudos/${rank.clube_id}.png`
  : rank.escudo_url || '/img/escudo_default.png';
```

### Escudos Padrão

- **`default.png`**: Escudo genérico para times sem badge
- **`placeholder.png`**: Durante carregamento/loading states

## Manutenção

### Quando Atualizar

- **Início de temporada**: Novos times promovidos à Série A
- **Mudanças de escudo**: Clubes que redesenharam a marca
- **Após criação de nova temporada Cartola**: API pode adicionar novos clubes

### Como Atualizar

```bash
# Forçar download de todos (sobrescreve existentes)
node scripts/baixar-escudos-times.js --force

# Ou apenas baixar novos (mantém existentes)
node scripts/baixar-escudos-times.js
```

### Verificação de Integridade

```bash
# Contar escudos baixados
ls public/escudos/*.png | wc -l

# Verificar tamanho médio dos arquivos
du -sh public/escudos/

# Listar escudos ausentes para clubes da Série A
node scripts/verificar-escudos-faltantes.js  # TODO: criar se necessário
```

## Fontes e Referências

### API Cartola FC
- **Endpoint**: `GET https://api.cartola.globo.com/clubes`
- **Formato de Resposta**: Objeto indexado por `clube_id`
- **Resoluções de Escudo**: 30x30, 45x45, 60x60
- **Escolha**: 60x60 (melhor qualidade)

### Estrutura da Resposta

```json
{
  "262": {
    "id": 262,
    "nome": "Flamengo",
    "abreviacao": "FLA",
    "slug": "flamengo",
    "escudos": {
      "60x60": "https://s3.glbimg.com/v1/.../FLA/60x60.png",
      "45x45": "https://s3.glbimg.com/v1/.../FLA/45x45.png",
      "30x30": "https://s3.glbimg.com/v1/.../FLA/30x30.png"
    },
    "nome_fantasia": "Flamengo"
  }
}
```

### Escudos Default da API

Clubes sem escudo próprio recebem:
```
https://s.glbimg.com/es/sde/f/organizacoes/escudo_default_65x65.png
```

Estes são baixados mesmo assim para manter consistência local.

## Performance

### Otimizações Implementadas

1. **Preload Inteligente**: Cache de imagens antes da renderização
2. **Verificação de Existência**: Não re-baixa arquivos já presentes
3. **Cache de Requests**: `NodeCache` no backend (TTL 5min)
4. **Lazy Loading**: Imagens carregadas conforme scroll (onde aplicável)
5. **Fallback Rápido**: `onerror` handler para substituição imediata

### Métricas

- **Tamanho médio por escudo**: ~2-5 KB (PNG otimizado)
- **Total em disco**: ~200-400 KB (68 clubes)
- **Tempo de download**: ~8-10 segundos (primeira execução)
- **Cache hit rate**: ~35% (24/68 em primeira run)

## Troubleshooting

### Problema: Escudos não aparecem

**Causa Comum**: Path incorreto ou arquivo não existe

**Solução**:
```bash
# Verificar se arquivo existe
ls public/escudos/262.png

# Re-baixar escudo específico (editar script ou usar --force)
node scripts/baixar-escudos-times.js --force
```

### Problema: API do Cartola indisponível

**Sintoma**: Erro ao buscar clubes

**Solução**:
- Script tem retry automático (3 tentativas com backoff)
- Se persistir, aguardar alguns minutos e tentar novamente
- API pode estar em manutenção (raro)

### Problema: Imagens corrompidas

**Causa**: Download interrompido ou arquivo inválido

**Solução**:
```bash
# Forçar re-download
node scripts/baixar-escudos-times.js --force

# Ou deletar apenas os corrompidos e rodar novamente
rm public/escudos/262.png
node scripts/baixar-escudos-times.js
```

## Histórico de Versões

### v1.0.0 (Fevereiro 2026)
- ✅ Script inicial de download automatizado
- ✅ Suporte a dry-run e force
- ✅ Logs coloridos e informativos
- ✅ Fallbacks e tratamento de erros
- ✅ Documentação completa
- ✅ Integração com módulos existentes (Rodadas, Rankings, Participante)

## Roadmap Futuro

- [ ] Cronjob semanal para atualização automática (início de temporada)
- [ ] Script de verificação de integridade (checar corrupção)
- [ ] Compressão de imagens (otimizar ainda mais)
- [ ] CDN para serving dos escudos (considerar na produção)
- [ ] Versionamento de escudos (histórico quando clube muda)
- [ ] Suporte a escudos SVG (melhor escalabilidade)

## Autor e Manutenção

**Criado por**: GitHub Copilot (Claude Sonnet 4.5)  
**Data**: Fevereiro de 2026  
**Manutenção**: Equipe Super Cartola Manager  
**Última Atualização**: 06/02/2026

---

**📁 Arquivos Relacionados**:
- Script: [`scripts/baixar-escudos-times.js`](../scripts/baixar-escudos-times.js)
- Escudos: [`public/escudos/`](../public/escudos/)
- Cache JS: [`public/js/rodadas/rodadas-cache.js`](../public/js/rodadas/rodadas-cache.js)
- Skill API: [`.claude/skills/cartola-api/`](../.claude/skills/cartola-api/)

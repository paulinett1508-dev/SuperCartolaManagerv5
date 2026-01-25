# Skill: newsession

Handover para nova sessao - carrega contexto do trabalho em andamento e instrui proximos passos.

---

## STATUS ATUAL: Cadastrar Liga e Participantes

**Data:** 25/01/2026
**Ultima acao:** Plano aprovado, pronto para execucao

---

## TAREFA EM ANDAMENTO

### Objetivo
1. Criar uma nova liga no sistema
2. Adicionar participantes na nova liga
3. Adicionar participantes na SuperCartola 2026

### Plano Aprovado
Arquivo: `/home/runner/.claude/plans/lively-inventing-music.md`

---

## RESUMO DO PLANO

### PARTE 1: Criar Nova Liga
- **URL:** `/criar-liga.html`
- Wizard de 2 etapas:
  1. Buscar times por ID do Cartola e adicionar
  2. Nomear liga e salvar
- Liga pode ser criada vazia

### PARTE 2: Adicionar Participantes (Liga Existente)
- **Opcao A:** `/editar-liga.html?id={ligaId}`
  - Linha "+" no final da tabela
  - Digitar ID, sistema auto-preenche dados

- **Opcao B (Recomendado 2026):** `/ferramentas.html` > "Adicionar Participante"
  - Modal com busca por nome ou ID
  - Cria inscricao automatica em `inscricoestemporada`

### PARTE 3: SuperCartola 2026
- **Liga ID:** `684cb1c8af923da7c7df51de`
- **Participantes atuais:** 33
- Usar Ferramentas modal para adicionar novos

---

## DADOS IMPORTANTES

### Como Obter ID do Cartola FC
1. Participante acessa Cartola FC
2. URL do perfil: `cartola.globo.com/time/{ID}`
3. Ou buscar por nome no modal de Ferramentas

### Verificacao Pos-Cadastro
```javascript
// Verificar liga.times[]
db.ligas.findOne({ _id: ObjectId("{ligaId}") }, { times: 1 })

// Verificar inscricao 2026
db.inscricoestemporada.find({
  liga_id: ObjectId("{ligaId}"),
  temporada: 2026,
  time_id: {novoTimeId}
})
```

---

## ARQUIVOS RELEVANTES

| Arquivo | Funcao |
|---------|--------|
| `public/criar-liga.html` | UI criacao de liga |
| `public/js/criar-liga.js` | Logica de criacao |
| `public/editar-liga.html` | UI edicao de liga |
| `public/js/editar-liga.js` | Logica de edicao |
| `public/js/ferramentas/ferramentas-pesquisar-time.js` | Modal adicionar participante |
| `controllers/ligaController.js` | API backend |

---

## BUG PENDENTE (Adiado)

### BUG-003: Anomalias Multi-Temporada
**Status:** Correcao parcial (documentado em `.claude/pending-tasks.md`)

**Corrigido:**
- `parciais.js` v4.0 - Multi-temporada
- `ranking.js` v2.5 - Pre-temporada handling

**Pendente:**
- `pontos-corridos-orquestrador.js` - Nao usa `window.temporadaAtual`
- `artilheiro-campeao.js` - Flag `temporadaEncerrada` vem da API

---

## PARA RETOMAR

```bash
# Verificar plano completo
cat /home/runner/.claude/plans/lively-inventing-music.md

# Acessar interface para criar liga
# URL: /criar-liga.html

# Acessar Ferramentas para adicionar participantes
# URL: /ferramentas.html
```

---

## PERGUNTAR AO USUARIO

1. Qual o nome da nova liga?
2. Quais os IDs do Cartola FC dos participantes?
   - Se nao tiver, perguntar os nomes dos times para buscar

---

**AGUARDANDO:** Dados dos participantes para cadastro

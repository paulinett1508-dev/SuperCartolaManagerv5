# PRD - Whitelist de Manutencao por timeId

**Data:** 2026-01-30
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

O modo manutencao precisa de um mecanismo de whitelist por `timeId` para permitir que participantes testadores (ex: timeId 13935277 / Paulinett) continuem usando o app normalmente enquanto os demais veem a tela "Calma ae!".

A tentativa anterior usou `nome_cartola` mas falhou porque o campo pode estar em niveis diferentes do objeto ou vazio. A solucao correta usa `timeId` - valor numerico, sempre disponivel no momento da checagem (AppVersion.init() roda APOS auth completar).

---

## Contexto e Analise

### Fluxo de Inicializacao Confirmado

```
DOMContentLoaded
  -> participanteAuth.verificarAutenticacao()   [GET /api/participante/auth/session]
     -> window.participanteAuth.timeId = "13935277"   ✅ DISPONIVEL
     -> window.AppVersion.init()
        -> verificarVersao()   [GET /api/app/check-version]
           -> servidor.manutencao = { ativo: true, whitelist: [...] }
           -> CHECA WHITELIST AQUI  ← timeId JA EXISTE
```

### Modulos Identificados

- **Backend:**
  - `config/manutencao.json` - Persistencia do estado + whitelist
  - `routes/appVersionRoutes.js:25-31` - `lerEstadoManutencao()` le JSON e envia ao frontend

- **Frontend:**
  - `public/js/app/app-version.js:140-157` - Logica de checagem de manutencao (MODIFICAR)
  - `public/participante/js/manutencao-screen.js` - Tela de manutencao (NAO MODIFICAR)
  - `public/participante/js/participante-auth.js:765-769` - Garante que auth completa ANTES de AppVersion

### Problema da Implementacao Anterior

```javascript
// FALHA: nome_cartola pode ser undefined neste ponto
const nomeCartola = window.participanteAuth?.participante?.participante?.nome_cartola || '';
const isWhitelisted = whitelist.some(nome => nomeCartola.toLowerCase().includes(nome.toLowerCase()));
```

O `participante.participante.nome_cartola` depende de nested objects que podem variar. O `timeId` e flat e direto.

---

## Solucao Proposta

### Abordagem: Whitelist por timeId (numerico)

**`config/manutencao.json`:**
```json
{
  "ativo": true,
  "ativadoEm": "2026-01-30T20:00:00Z",
  "mensagem": "Estamos aplicando melhorias no app. Voltamos em breve!",
  "whitelist_timeIds": ["13935277"]
}
```

**`app-version.js` - Checagem:**
```javascript
const whitelist = servidor.manutencao.whitelist_timeIds || [];
const timeId = String(window.participanteAuth?.timeId || '');
const isWhitelisted = whitelist.includes(timeId);
```

### Arquivos a Modificar

1. `config/manutencao.json` - Trocar `whitelist` por `whitelist_timeIds` com array de IDs
2. `public/js/app/app-version.js` - Simplificar checagem para usar `timeId` direto

### Regras de Negocio

- **RN1:** Whitelist usa `timeId` (String) - comparacao exata, sem case-insensitive
- **RN2:** `timeId` esta disponivel em `window.participanteAuth.timeId` (propriedade flat)
- **RN3:** Participante whitelisted ve o app completo, sem restricao nenhuma
- **RN4:** Demais participantes veem tela de manutencao normalmente
- **RN5:** Whitelist vazio = ninguem liberado (todos em manutencao)

---

## Riscos e Consideracoes

### Impactos
- Positivo: Permite testes em producao sem afetar demais usuarios
- Atencao: timeId deve ser String (coercao Mongoose)

### Multi-Tenant
- [x] Whitelist e global (nao por liga) - correto para testador

---

## Testes Necessarios

1. Participante 13935277 acessa app normalmente durante manutencao
2. Qualquer outro participante ve tela "Calma ae!"
3. Desativar manutencao (ativo: false) libera todos

---

**Gerado por:** Pesquisa Protocol v1.0

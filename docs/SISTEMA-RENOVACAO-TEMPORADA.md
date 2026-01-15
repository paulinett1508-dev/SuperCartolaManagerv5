# Sistema de Renovacao de Temporada

> Documentacao oficial do sistema de renovacao/inscricao de participantes para nova temporada.

**Versao:** 1.0.0
**Data:** 2026-01-04
**Modulo:** Fluxo Financeiro > Renovacao

---

## Indice

1. [Visao Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [Regras Configuraveis](#regras-configuraveis)
4. [Fluxos de Negocio](#fluxos-de-negocio)
5. [API Endpoints](#api-endpoints)
6. [Collections MongoDB](#collections-mongodb)
7. [Frontend Components](#frontend-components)
8. [Cenarios de Uso](#cenarios-de-uso)

---

## Visao Geral

O sistema de renovacao permite que administradores gerenciem a transicao de participantes entre temporadas, com:

- **Configuracao flexivel** de regras por liga/temporada
- **Transferencia de saldo** entre temporadas (credito ou divida)
- **Cadastro de novos participantes** via API Cartola FC
- **Controle de pagamento** da taxa de inscricao

### Principios

1. **Zero hardcode**: Todas as regras sao configuraveis via interface
2. **Auditoria completa**: Cada acao gera registros rastreavels
3. **Independencia de temporadas**: Extratos 2025 e 2026 sao separados
4. **Flexibilidade por liga**: Cada liga pode ter regras diferentes

---

## Arquitetura

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Admin)                         │
├─────────────────────────────────────────────────────────────┤
│  fluxo-financeiro.js                                        │
│    └── renovacao-core.js (orquestrador)                     │
│          ├── renovacao-api.js (chamadas HTTP)               │
│          ├── renovacao-ui.js (interacoes)                   │
│          └── renovacao-modals.js (templates HTML)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (API)                            │
├─────────────────────────────────────────────────────────────┤
│  routes/liga-rules-routes.js    (regras de liga)            │
│  routes/inscricoes-routes.js    (inscricoes)                │
│  routes/cartola-proxy.js        (busca API Cartola)         │
│                                                             │
│  controllers/inscricoesController.js (logica de negocio)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MONGODB                                  │
├─────────────────────────────────────────────────────────────┤
│  ligarules              (regras por liga/temporada)         │
│  inscricoestemporada    (registro de cada inscricao)        │
│  extratofinanceirocaches (transacoes financeiras)           │
└─────────────────────────────────────────────────────────────┘
```

### Arquivos Principais

| Arquivo | Descricao |
|---------|-----------|
| `models/LigaRules.js` | Schema de regras configuraveis |
| `models/InscricaoTemporada.js` | Schema de inscricoes |
| `routes/liga-rules-routes.js` | API de regras |
| `routes/inscricoes-routes.js` | API de inscricoes |
| `controllers/inscricoesController.js` | Logica de negocio |
| `public/js/renovacao/*.js` | Modulos frontend |

---

## Regras Configuraveis

### Collection: `ligarules`

Cada liga pode ter regras DIFERENTES para cada temporada. Nenhum valor eh hardcoded.

```javascript
{
  liga_id: ObjectId,
  temporada: Number,

  inscricao: {
    // REGRA 1: Taxa de inscricao
    // Valor em R$ que cada participante deve pagar
    // Comportamento: Se pagouInscricao=true, apenas registro
    //                Se pagouInscricao=false, vira debito no extrato
    taxa: Number,  // Ex: 100.00

    // REGRA 2: Prazo de renovacao
    // Data limite para participantes decidirem
    // Apos essa data, nao aceita mais renovacoes
    prazo_renovacao: Date,  // Ex: 2026-01-27T23:59:59

    // REGRA 3: Permitir devedor renovar
    // Se true: devedor pode renovar, divida eh carregada para nova temporada
    // Se false: devedor DEVE quitar antes de renovar
    permitir_devedor_renovar: Boolean,  // Default: true

    // REGRA 4: Aproveitar saldo positivo
    // Se true: credito da temporada anterior abate da taxa
    // Se false: credito NAO abate (fica disponivel para saque)
    aproveitar_saldo_positivo: Boolean,  // Default: true

    // REGRA 5: Parcelamento (futura implementacao)
    // Se true: permite parcelar a taxa de inscricao
    permitir_parcelamento: Boolean,  // Default: false

    // REGRA 6: Maximo de parcelas
    // Numero maximo de parcelas permitido
    max_parcelas: Number  // Default: 1, Max: 12
  },

  // Status do processo de renovacao
  status: 'rascunho' | 'aberto' | 'encerrado',

  // Mensagens personalizadas (opcional)
  mensagens: {
    boas_vindas: String,    // Mensagem no modal de renovacao
    aviso_devedor: String,  // Aviso especifico para devedores
    confirmacao: String     // Mensagem apos confirmar
  }
}
```


### Tabela de Regras

| Regra | Campo | Tipo | Default | Descricao |
|-------|-------|------|---------|-----------|
| Taxa | `inscricao.taxa` | Number | 0 | Valor da inscrição em R$ |
| Prazo | `inscricao.prazo_renovacao` | Date | 27/01/YYYY | Data limite |
| Devedor Renova | `inscricao.permitir_devedor_renovar` | Boolean | true | Permite devedor renovar |
| Aproveitar Crédito | `inscricao.aproveitar_saldo_positivo` | Boolean | true | Crédito abate taxa |
| Parcelamento | `inscricao.permitir_parcelamento` | Boolean | false | Permite parcelar |
| Max Parcelas | `inscricao.max_parcelas` | Number | 1 | Limite de parcelas |
| Débito Automático | `inscricao.gerar_debito_inscricao_renovacao` | Boolean | true | Gera débito automático ao renovar sem pagar |

### Estados do Processo

```
┌──────────┐     Abrir      ┌─────────┐    Encerrar    ┌────────────┐
│ RASCUNHO │ ─────────────► │ ABERTO  │ ─────────────► │ ENCERRADO  │
└──────────┘                └─────────┘                └────────────┘
     ▲                           │                           │
     └───────────────────────────┴───────────────────────────┘
                        Reabrir (se necessario)
```

| Status | Descricao | Acoes Permitidas |
|--------|-----------|------------------|
| `rascunho` | Configurando regras | Editar regras, Abrir |
| `aberto` | Aceitando renovacoes | Renovar, Nao Participar, Novo, Encerrar |
| `encerrado` | Processo finalizado | Reabrir (emergencia) |

---

## Fluxos de Negocio

### Fluxo 1: Configurar Liga

```
Admin acessa Fluxo Financeiro
    │
    ▼
Clica no botao [Config 2026] (engrenagem)
    │
    ▼
Modal de Configuracao abre
    │
    ├── Define taxa de inscricao
    ├── Define prazo de renovacao
    ├── Marca se devedor pode renovar
    ├── Marca se aproveita credito
    │
    ▼
Salva regras → Collection ligarules
    │
    ▼
Clica [Abrir Renovacoes]
    │
    ▼
Status muda para "aberto"
Participantes podem ser renovados
```

### Fluxo 2: Renovar Participante (COM pagamento)

```
Admin clica no badge "Pendente" do participante
    │
    ▼
Modal de Renovacao abre
    │
    ├── Exibe saldo 2025 do participante
    ├── Exibe calculo da taxa
    ├── Checkbox [X] Pagou inscricao (MARCADO)
    │
    ▼
Admin confirma
    │
    ▼
Backend:
    ├── Cria InscricaoTemporada (status: renovado, pagou_inscricao: true)
    ├── NAO cria transacao de debito no extrato 2026
    ├── Garante Time existe em 2026
    │
    ▼
Resultado:
    - Participante renovado
    - Taxa PAGA (apenas registro)
    - Saldo inicial 2026: R$ 0,00 (ou so divida anterior se houver)
```

### Fluxo 3: Renovar Participante (SEM pagamento)

```
Admin clica no badge "Pendente" do participante
    │
    ▼
Modal de Renovacao abre
    │
    ├── Checkbox [ ] Pagou inscricao (DESMARCADO)
    │
    ▼
Admin confirma
    │
    ▼
Backend:
    ├── Cria InscricaoTemporada (status: renovado, pagou_inscricao: false)
    ├── CRIA transacao INSCRICAO_TEMPORADA = -R$100 (debito)
    │
    ▼
Resultado:
    - Participante renovado
    - Taxa NAO PAGA (vira divida)
    - Saldo inicial 2026: -R$ 100,00
```

### Fluxo 4: Nao Participar

```
Admin clica no badge "Pendente" do participante
    │
    ▼
Seleciona "Nao Vai Participar"
    │
    ▼
Modal de confirmacao abre
    │
    ├── Exibe saldo 2025 (se houver)
    ├── Avisa que saldo fica congelado
    │
    ▼
Admin confirma
    │
    ▼
Backend:
    ├── Cria InscricaoTemporada (status: nao_participa)
    ├── NAO cria Time em 2026
    ├── Saldo 2025 fica disponivel para quitacao posterior
    │
    ▼
Resultado:
    - Participante NAO aparece em 2026
    - Saldo 2025 congelado (pode quitar via Acerto Financeiro 2025)
```

### Fluxo 5: Novo Participante

```
Admin clica no botao [+ Participante] (person_add)
    │
    ▼
Modal de busca abre
    │
    ├── Digita nome do time ou cartoleiro
    ├── Sistema busca na API Cartola
    ├── Exibe resultados com ID oficial
    │
    ▼
Admin seleciona o time correto
    │
    ├── Checkbox [X] Pagou inscricao
    │
    ▼
Admin confirma
    │
    ▼
Backend:
    ├── Verifica se time_id ja existe na liga
    ├── Cria InscricaoTemporada (status: novo)
    ├── Cria Time com dados do Cartola
    ├── Adiciona em Liga.participantes
    ├── Se pagou: apenas registro
    ├── Se nao pagou: cria debito da taxa
    │
    ▼
Resultado:
    - Novo participante cadastrado
    - Aparece no Fluxo Financeiro 2026
```

---

## API Endpoints

### Regras de Liga

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/api/liga-rules/:ligaId/:temporada` | Buscar regras |
| `POST` | `/api/liga-rules/:ligaId/:temporada` | Criar/atualizar regras |
| `PATCH` | `/api/liga-rules/:ligaId/:temporada/status` | Mudar status |
| `GET` | `/api/liga-rules/:ligaId/:temporada/preview/:timeId` | Preview calculo |

### Inscricoes

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/api/inscricoes/:ligaId/:temporada` | Listar todas |
| `GET` | `/api/inscricoes/:ligaId/:temporada/:timeId` | Buscar especifica |
| `GET` | `/api/inscricoes/:ligaId/:temporada/estatisticas` | Resumo |
| `POST` | `/api/inscricoes/:ligaId/:temporada/renovar/:timeId` | Renovar |
| `POST` | `/api/inscricoes/:ligaId/:temporada/nao-participar/:timeId` | Nao participar |
| `POST` | `/api/inscricoes/:ligaId/:temporada/novo` | Novo participante |
| `POST` | `/api/inscricoes/:ligaId/:temporada/inicializar` | Inicializar todos |
| `DELETE` | `/api/inscricoes/:ligaId/:temporada/:timeId` | Reverter inscricao |

### Busca Cartola

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/api/cartola-proxy/buscar-time?q=nome` | Buscar por nome |
| `GET` | `/api/cartola-proxy/buscar-time/:timeId` | Buscar por ID |

---

## Collections MongoDB

### ligarules

```javascript
// Exemplo de documento
{
  "_id": ObjectId("..."),
  "liga_id": ObjectId("684cb1c8af923da7c7df51de"),
  "temporada": 2026,
  "inscricao": {
    "taxa": 100,
    "prazo_renovacao": ISODate("2026-01-27T23:59:59.000Z"),
    "permitir_devedor_renovar": true,
    "aproveitar_saldo_positivo": true,
    "permitir_parcelamento": false,
    "max_parcelas": 1,
    "gerar_debito_inscricao_renovacao": true
  },
  "status": "aberto",
  "mensagens": {
    "boas_vindas": "Bem-vindo a temporada 2026!",
    "aviso_devedor": "",
    "confirmacao": ""
  },
  "criado_por": "admin",
  "criado_em": ISODate("2026-01-04T..."),
  "atualizado_em": ISODate("2026-01-04T...")
}
```

### inscricoestemporada

```javascript
// Exemplo de documento
{
  "_id": ObjectId("..."),
  "liga_id": ObjectId("684cb1c8af923da7c7df51de"),
  "time_id": 1861266,
  "temporada": 2026,
  "status": "renovado",
  "origem": "renovacao",
  "dados_participante": {
    "nome_time": "Fucinhudo FC",
    "nome_cartoleiro": "Fucim",
    "escudo": "https://...",
    "id_cartola_oficial": 1861266
  },
  "temporada_anterior": {
    "temporada": 2025,
    "saldo_final": 50.00,
    "status_quitacao": "credor"
  },
  "saldo_transferido": 50.00,
  "taxa_inscricao": 100.00,
  "divida_anterior": 0,
  "saldo_inicial_temporada": 50.00,
  "pagou_inscricao": true,
  "data_decisao": ISODate("2026-01-04T..."),
  "aprovado_por": "admin",
  "observacoes": "",
  "processado": true,
  "data_processamento": ISODate("2026-01-04T..."),
  "transacoes_criadas": []
}
```

---

## Frontend Components

### Modais Disponiveis

| Modal | Funcao | Trigger |
|-------|--------|---------|
| `modalConfigLiga` | Configurar regras da liga | Botao [Config 2026] |
| `modalRenovar` | Renovar participante | Badge "Pendente" |
| `modalNaoParticipar` | Marcar saida | Acao no menu |
| `modalNovoParticipante` | Cadastrar novo | Botao [+ Participante] |

### Badges de Status

| Status | Cor | Icone | Descricao |
|--------|-----|-------|-----------|
| `pendente` | Amarelo | `schedule` | Aguardando decisao |
| `renovado` | Verde | `check_circle` | Renovado para 2026 |
| `nao_participa` | Vermelho | `cancel` | Nao vai participar |
| `novo` | Azul | `person_add` | Novo participante |

---

## Cenarios de Uso

### Cenario 1: Participante Credor

```
Situacao 2025:
  - Saldo: +R$ 50,00 (credito)

Configuracao Liga:
  - Taxa: R$ 100,00
  - Aproveitar credito: SIM

Renovacao COM pagamento:
  - pagouInscricao: true
  - Credito aproveitado: R$ 50,00
  - Taxa real paga: R$ 50,00 (100 - 50)
  - Saldo inicial 2026: R$ 0,00

Renovacao SEM pagamento:
  - pagouInscricao: false
  - Credito aproveitado: R$ 50,00
  - Debito criado: R$ 100,00
  - Saldo inicial 2026: -R$ 50,00 (100 - 50 de credito)
```

### Cenario 2: Participante Devedor

```
Situacao 2025:
  - Saldo: -R$ 30,00 (divida)

Configuracao Liga:
  - Taxa: R$ 100,00
  - Permitir devedor: SIM

Renovacao COM pagamento:
  - pagouInscricao: true
  - Divida carregada: R$ 30,00
  - Taxa paga: sim
  - Saldo inicial 2026: -R$ 30,00 (so a divida)

Renovacao SEM pagamento:
  - pagouInscricao: false
  - Divida carregada: R$ 30,00
  - Debito taxa: R$ 100,00
  - Saldo inicial 2026: -R$ 130,00 (100 + 30)
```

### Cenario 3: Novo Participante

```
Situacao:
  - Sem historico na liga

Configuracao Liga:
  - Taxa: R$ 100,00

Cadastro COM pagamento:
  - pagouInscricao: true
  - Saldo inicial 2026: R$ 0,00

Cadastro SEM pagamento:
  - pagouInscricao: false
  - Debito criado: R$ 100,00
  - Saldo inicial 2026: -R$ 100,00
```

---

## Manutencao

### Adicionar Nova Regra

1. Adicionar campo em `models/LigaRules.js`
2. Adicionar input no modal `renovacao-modals.js` → `modalConfigLiga()`
3. Adicionar leitura em `renovacao-ui.js` → `salvarConfigLiga()`
4. Adicionar validacao em `routes/liga-rules-routes.js`
5. Se afetar calculo, ajustar `controllers/inscricoesController.js`
6. Documentar neste arquivo

### Logs Importantes

```
[LIGA-RULES] GET regras liga=X temporada=Y
[LIGA-RULES] POST regras liga=X temporada=Y
[LIGA-RULES] PATCH status liga=X -> aberto
[INSCRICOES] POST renovar liga=X time=Y temporada=Z pagou=true
[INSCRICOES] POST novo participante liga=X time=Y
```

---

## Changelog


### v1.1.0 (2026-01-15)
- Adicionada regra `gerar_debito_inscricao_renovacao` para controle automático de débito na renovação sem pagamento
- Atualização da documentação de exemplos e tabela de regras

### v1.0.0 (2026-01-04)
- Implementação inicial do sistema
- Regras configuráveis por liga/temporada
- Fluxos: renovar, não participar, novo participante
- Flag `pagouInscricao` para controle de débito
- Integração com Fluxo Financeiro (coluna 2026)

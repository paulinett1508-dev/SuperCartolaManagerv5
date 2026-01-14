# Arquitetura de Modulos - Super Cartola SaaS

> Documento de decisao arquitetural para organizacao de modulos e regras.

## Contexto

O Super Cartola eh um micro-SaaS com multiplos modulos de disputa:
- Mata-Mata
- Top 10
- Pontos Corridos
- Artilheiro
- Melhor do Mes
- Luva de Ouro
- Ranking Geral
- etc.

Cada modulo precisa de:
1. **Regras estaticas** (formato, fases, valores)
2. **Regras dinamicas** (configuracoes por liga/temporada)
3. **Backend** (controllers, routes)
4. **Frontend** (HTML, JS, CSS)

---

## Opcao A: MVC Tradicional (Estrutura Atual)

```
├── config/
│   └── rules/                    # Regras ESTATICAS (JSON)
│       ├── mata_mata.json
│       ├── top_10.json
│       ├── pontos_corridos.json
│       └── index.js              # Loader centralizado
│
├── models/
│   ├── LigaRules.js              # Regras DINAMICAS (MongoDB)
│   ├── Liga.js
│   └── Time.js
│
├── controllers/
│   ├── mata-mata-backend.js
│   ├── pontosCorridosCacheController.js
│   └── artilheiroCampeaoController.js
│
├── routes/
│   ├── mataMataCacheRoutes.js
│   ├── pontos-corridos-routes.js
│   └── artilheiro-campeao-routes.js
│
└── public/js/
    ├── mata-mata/
    │   ├── mata-mata-core.js
    │   └── mata-mata-ui.js
    ├── pontos-corridos/
    └── artilheiro-campeao/
```

### Pros
- Padrao conhecido (MVC)
- Facil de entender para novos devs
- Separacao clara de responsabilidades
- Ja implementado no projeto

### Contras
- Arquivos relacionados ficam espalhados
- Dificil ver "tudo" de um modulo
- Risco de inconsistencia entre pastas

---

## Opcao B: Domain-Driven (Modular)

```
├── modules/
│   ├── mata-mata/
│   │   ├── rules/
│   │   │   ├── mata-mata.json          # Regras estaticas
│   │   │   └── MataMataDynamicRules.js # Regras dinamicas (Model)
│   │   ├── controllers/
│   │   │   └── mata-mata-controller.js
│   │   ├── routes/
│   │   │   └── mata-mata-routes.js
│   │   ├── services/
│   │   │   └── mata-mata-service.js
│   │   └── public/
│   │       ├── mata-mata.html
│   │       ├── js/
│   │       │   ├── mata-mata-core.js
│   │       │   └── mata-mata-ui.js
│   │       └── css/
│   │           └── mata-mata.css
│   │
│   ├── top-10/
│   │   ├── rules/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── public/
│   │
│   └── pontos-corridos/
│       └── ...
│
├── shared/
│   ├── models/
│   │   ├── Liga.js
│   │   └── Time.js
│   ├── middleware/
│   └── utils/
│
└── config/
    └── modules-registry.js       # Registro de modulos ativos
```

### Pros
- **Auto-contido**: Tudo do modulo em um lugar
- Facilita **ativar/desativar** modulos
- Melhor para **escalar** (novos modulos)
- Facilita **vender modulos separados** (SaaS)

### Contras
- Refatoracao grande
- Duplicacao de patterns em cada modulo
- Complexidade no import/export

---

## Opcao C: Hibrida (Recomendada)

```
├── config/
│   ├── rules/                    # Regras ESTATICAS (JSON)
│   │   ├── mata_mata.json
│   │   ├── top_10.json
│   │   └── index.js
│   │
│   └── modules/                  # Configuracao de modulos
│       └── modules-config.js     # Quais modulos cada liga tem
│
├── models/
│   ├── LigaRules.js              # Regras gerais (inscricao, etc)
│   ├── ModuleConfig.js           # NEW: Config de modulo por liga
│   └── ...
│
├── modules/                      # Codigo agrupado por dominio
│   ├── mata-mata/
│   │   ├── controller.js
│   │   ├── routes.js
│   │   ├── service.js            # Logica de negocio
│   │   └── README.md             # Doc do modulo
│   │
│   ├── top-10/
│   ├── pontos-corridos/
│   └── fluxo-financeiro/         # Ja existe parcialmente
│       ├── controller.js
│       ├── routes.js
│       └── public/
│           ├── fluxo-financeiro-core.js
│           ├── fluxo-financeiro-ui.js
│           └── renovacao/        # Sub-modulo
│
├── shared/                       # Codigo compartilhado
│   ├── models/
│   ├── middleware/
│   └── utils/
│
└── public/                       # Frontend (pode ficar aqui ou em modules)
    ├── js/
    │   └── modules/              # Referencia aos modulos
    └── css/
```

### Pros
- **Balanceado**: Nao quebra tudo, evolui gradualmente
- **Rules centralizadas**: Facil de auditar/editar
- **Modulos agrupados**: Facil de ver escopo
- **Flexivel**: Pode migrar aos poucos

### Contras
- Dois lugares para "regras" (config + models)
- Precisa documentar bem o que vai onde

---

## Separacao de Regras

### Regras ESTATICAS (config/rules/*.json)

Definem a **ESTRUTURA** do modulo:

| Tipo | Exemplo | Onde |
|------|---------|------|
| Formato | "32 times, eliminacao direta" | `mata_mata.json` |
| Fases | "oitavas, quartas, semis, final" | `mata_mata.json` |
| Calendario | "rodada 3-7 = 1a edicao" | `mata_mata.json` |
| Valores DEFAULT | "vitoria = +10, derrota = -10" | `mata_mata.json` |
| Criterios | "desempate por ranking" | `mata_mata.json` |

### Regras DINAMICAS (models/LigaRules.js ou ModuleConfig.js)

Definem **CONFIGURACAO POR LIGA**:

| Tipo | Exemplo | Onde |
|------|---------|------|
| Ativacao | "Liga X tem mata-mata ativo" | `ModuleConfig` |
| Valores custom | "Liga X paga R$20 por vitoria" | `ModuleConfig` |
| Datas custom | "Liga X comeca rodada 5" | `ModuleConfig` |
| Permissoes | "Liga X permite devedor" | `LigaRules` |
| Taxa inscricao | "Liga X cobra R$150" | `LigaRules` |

---

## Modelo ModuleConfig (Proposta)

```javascript
// models/ModuleConfig.js
const ModuleConfigSchema = new mongoose.Schema({
    liga_id: { type: ObjectId, ref: 'Liga', required: true },
    temporada: { type: Number, required: true },

    modulo: {
        type: String,
        enum: ['mata_mata', 'top_10', 'pontos_corridos', 'artilheiro', ...],
        required: true
    },

    ativo: { type: Boolean, default: true },

    // Override de valores (se null, usa default do JSON)
    config_override: {
        valores_financeiros: {
            vitoria: Number,
            derrota: Number,
            empate: Number
        },
        calendario_custom: [{
            edicao: Number,
            rodada_inicial: Number,
            rodada_final: Number
        }],
        regras_custom: mongoose.Schema.Types.Mixed
    }
});
```

---

## Recomendacao

### Curto Prazo (Manter estrutura atual)
1. Continuar usando `config/rules/*.json` para regras estaticas
2. Usar `models/LigaRules.js` para configuracoes dinamicas gerais
3. Documentar bem cada JSON de regras

### Medio Prazo (Evoluir para hibrida)
1. Criar `models/ModuleConfig.js` para config por modulo/liga
2. Migrar controllers/routes para pasta `modules/`
3. Manter `config/rules/` como fonte de verdade de estrutura

### Longo Prazo (Se virar SaaS maior)
1. Avaliar estrutura Domain-Driven completa
2. Cada modulo vira um "pacote" que pode ser ativado/vendido
3. Interface admin para configurar modulos por cliente

---

## Checklist para Novo Modulo


---

## TEMPLATE PARA DESCRIÇÃO DE REGRAS DE MÓDULO (ADMIN)

> Use este modelo para documentar regras de qualquer módulo novo ou existente.

### 1. Nome do Módulo
Exemplo: Mata-Mata, Top 10, Pontos Corridos

### 2. Descrição Geral
Breve explicação do objetivo e funcionamento do módulo.

### 3. Regras Estáticas (Estrutura)
- Formato: (ex: 32 times, eliminatória direta)
- Fases: (ex: oitavas, quartas, semi, final)
- Calendário: (ex: rodadas de início/fim)
- Valores Default: (ex: vitória = +10, derrota = -10)
- Critérios de desempate: (ex: ranking, saldo de gols)

### 4. Regras Dinâmicas (Configuração por Liga)
- Ativação: (ex: Liga X tem módulo ativo?)
- Valores customizados: (ex: Liga X paga R$20 por vitória)
- Datas customizadas: (ex: Liga X começa rodada 5)
- Permissões: (ex: Liga X permite devedor?)
- Taxa de inscrição: (ex: Liga X cobra R$150)

### 5. Backend
- Controllers envolvidos
- Rotas principais

### 6. Frontend
- Telas/funcionalidades JS
- Componentes visuais

### 7. Observações
Informações extras, restrições, particularidades do módulo.

---

Ao criar um novo modulo (ex: "Resta Um"):

1. [ ] Criar `config/rules/resta_um.json` com estrutura
2. [ ] Adicionar export em `config/rules/index.js`
3. [ ] Criar controller em `controllers/resta-um-controller.js`
4. [ ] Criar routes em `routes/resta-um-routes.js`
5. [ ] Registrar routes no `index.js`
6. [ ] Criar frontend em `public/js/resta-um/`
7. [ ] Documentar em `docs/MODULO-RESTA-UM.md` usando o template acima
8. [ ] Se tiver config por liga, adicionar em `ModuleConfig`

---

## Conclusao

A estrutura **HIBRIDA** eh a mais adequada porque:

1. **Nao quebra** o que ja funciona
2. **Centraliza regras** em lugar auditavel (`config/rules/`)
3. **Agrupa codigo** por dominio (`modules/`)
4. **Separa** estrutura (JSON) de configuracao (MongoDB)
5. **Escala** para SaaS sem refatoracao massiva

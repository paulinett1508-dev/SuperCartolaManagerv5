# Arquitetura de Modulos - Super Cartola SaaS
# RECOMENDAÇÃO OFICIAL: SISTEMA HÍBRIDO

> **O sistema híbrido é o padrão recomendado para toda a arquitetura de módulos do Super Cartola.**

**Princípios do sistema híbrido:**
- **Regras Estáticas**: Toda a estrutura, formato, fases e padrões de cada módulo devem estar em arquivos JSON centralizados em `config/rules/`. Isso garante fácil auditoria, versionamento e padronização.
- **Regras Dinâmicas**: Configurações específicas de cada liga (ex: valores customizados, datas, permissões) devem ser armazenadas em modelos MongoDB (`models/ModuleConfig.js` e `models/LigaRules.js`).
- **Código Agrupado**: Controllers, rotas e serviços de cada módulo devem ser organizados em pastas próprias dentro de `modules/`, facilitando manutenção e evolução.
- **Frontend Modular**: JS/CSS/HTML de cada módulo deve ser separado, permitindo customização e ativação/desativação por liga.
- **White Label**: Toda parametrização deve ser flexível, sem hardcode, permitindo que cada liga tenha regras próprias e imutáveis após criação.

**Vantagens:**
- Permite evolução gradual sem quebrar o legado
- Centraliza regras para fácil auditoria
- Facilita ativação/desativação de módulos por liga
- Prepara o sistema para SaaS multi-tenant e venda de módulos

**Diretriz:**
> Todo novo módulo, refatoração ou ajuste deve seguir o padrão híbrido, separando regras estáticas (JSON) e dinâmicas (MongoDB), e agrupando código por domínio.

---

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

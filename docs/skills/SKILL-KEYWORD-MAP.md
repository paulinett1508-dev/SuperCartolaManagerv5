# Mapeamento de Keywords → Skills

Sistema de ativação inteligente de skills baseado em palavras-chave contextuais. Em vez de chamar skills pelo nome, o sistema identifica a skill correta a partir do conteúdo da solicitação.

---

## Como Funciona

1. **Detectar keywords** na mensagem do usuário
2. **Consultar tabela** abaixo para encontrar a skill correspondente
3. **Resolver conflitos** usando prioridade (quando múltiplas skills matcham)
4. **Ativar skill** carregando o `.md` de `docs/skills/[categoria]/[skill].md`

### Regras de Resolução de Conflitos

- **Match exato** (keyword primária) > **match contextual** (keyword secundária)
- Se 2+ skills matcham com mesma prioridade → skill de **categoria mais específica** vence (04-project > 02-specialists > 03-utilities)
- Se ambiguidade persiste → perguntar ao usuário qual ação deseja

---

## Tabela de Mapeamento

### 01 - Core Workflow (High Senior Protocol)

#### workflow
| Tipo | Keywords |
|------|----------|
| **Primárias** | `workflow`, `high senior protocol`, `qual fase`, `iniciar sessão de trabalho`, `começar desenvolvimento` |
| **Frases PT-BR** | "como fazer essa feature", "preciso implementar", "por onde começar", "iniciar protocolo", "qual a fase atual" |
| **Contexto** | Início de sessão, planejamento de features complexas, dúvida sobre qual passo seguir |
| **Localização** | `docs/skills/01-core-workflow/workflow.md` |

#### pesquisa
| Tipo | Keywords |
|------|----------|
| **Primárias** | `pesquisa`, `pesquisar`, `PRD`, `research`, `mapear codebase`, `levantar requisitos` |
| **Frases PT-BR** | "analise o código", "gere um PRD", "faça o levantamento", "pesquise no projeto", "mapeie os arquivos", "entenda o contexto", "fase 1" |
| **Contexto** | Nova tarefa sem PRD, necessidade de entender escopo antes de implementar |
| **Localização** | `docs/skills/01-core-workflow/pesquisa.md` |

#### spec
| Tipo | Keywords |
|------|----------|
| **Primárias** | `spec`, `especificação`, `especificar`, `SPEC`, `mudanças cirúrgicas`, `dependências` |
| **Frases PT-BR** | "mapeie as dependências", "defina as mudanças", "crie a spec", "especifique linha por linha", "planeje as alterações", "fase 2" |
| **Contexto** | PRD já existe, precisa transformar em plano técnico |
| **Localização** | `docs/skills/01-core-workflow/spec.md` |

#### code
| Tipo | Keywords |
|------|----------|
| **Primárias** | `implementar`, `implementação`, `aplicar mudanças`, `executar spec`, `codificar` |
| **Frases PT-BR** | "aplique as mudanças", "implemente a spec", "execute a implementação", "desenvolva o código", "fase 3", "hora de codar" |
| **Contexto** | SPEC já existe, pronto para aplicar mudanças no código |
| **NÃO confundir** | Pedidos genéricos de "escrever código" sem SPEC prévia → usar `workflow` primeiro |
| **Localização** | `docs/skills/01-core-workflow/code.md` |

---

### 02 - Specialists (Especialistas Técnicos)

#### code-inspector
| Tipo | Keywords |
|------|----------|
| **Primárias** | `auditar código`, `code review`, `auditoria de código`, `security review`, `OWASP`, `inspeção`, `inspecionar código` |
| **Frases PT-BR** | "revise o código", "análise de segurança", "verifique vulnerabilidades", "débito técnico", "qualidade do código", "auditoria profunda", "code audit" |
| **Contexto** | Revisão pós-implementação, análise de segurança, troubleshooting, dívida técnica |
| **NÃO confundir** | Auditoria de módulo específico → `auditor-module`; Auditoria de cache → `cache-auditor` |
| **Localização** | `docs/skills/02-specialists/code-inspector.md` |

#### db-guardian
| Tipo | Keywords |
|------|----------|
| **Primárias** | `migration`, `banco de dados`, `MongoDB`, `backup`, `snapshot`, `limpeza de dados`, `índices`, `schema` |
| **Frases PT-BR** | "script de banco", "limpar collection", "fazer backup", "criar índice", "validar schema", "manutenção do banco", "otimizar queries", "dados corrompidos", "recovery" |
| **Contexto** | Operações no MongoDB, manutenção de dados, migrations, scripts de limpeza |
| **NÃO confundir** | Consultas rápidas de dados → usar MongoDB MCP diretamente |
| **Localização** | `docs/skills/02-specialists/db-guardian.md` |

#### frontend-crafter
| Tipo | Keywords |
|------|----------|
| **Primárias** | `frontend`, `tela`, `UI`, `UX`, `CSS`, `componente`, `interface`, `layout`, `design`, `mobile-first` |
| **Frases PT-BR** | "criar tela", "ajustar CSS", "consertar layout", "navegação SPA", "componente visual", "responsivo", "dark mode", "estilizar", "botão", "modal", "formulário", "menu" |
| **Contexto** | Criação/ajuste de interfaces, styling, componentes visuais, PWA frontend |
| **NÃO confundir** | Cache de frontend → `cache-auditor`; Lógica de negócio em tela → `league-architect` |
| **Localização** | `docs/skills/02-specialists/frontend-crafter.md` |

#### league-architect
| Tipo | Keywords |
|------|----------|
| **Primárias** | `regra de negócio`, `regras`, `liga`, `configuração de liga`, `cálculo financeiro`, `premiação`, `punição`, `formato de disputa` |
| **Frases PT-BR** | "como calcular", "regra do mata-mata", "configurar liga", "taxa de inscrição", "parcelamento", "multa", "pontuação", "classificação", "fórmula", "extrato financeiro" |
| **Contexto** | Definição/ajuste de regras de negócio, cálculos financeiros, formatos de competição |
| **NÃO confundir** | Implementar regra já definida → `code`; UI de regras → `frontend-crafter` |
| **Localização** | `docs/skills/02-specialists/league-architect.md` |

#### system-scribe
| Tipo | Keywords |
|------|----------|
| **Primárias** | `explicar`, `como funciona`, `documentar`, `wiki`, `ensinar`, `guia` |
| **Frases PT-BR** | "explique o módulo", "como funciona o sistema de", "documente essa feature", "quais as regras de", "me ensine como", "o que faz o", "descreva o fluxo de" |
| **Contexto** | Entender sistema existente, documentação, aprendizado sobre módulos |
| **NÃO confundir** | Gerar PRD (pesquisa) ≠ explicar sistema (system-scribe) |
| **Localização** | `docs/skills/02-specialists/system-scribe.md` |

---

### 03 - Utilities (Ferramentas Auxiliares)

#### git-commit-push
| Tipo | Keywords |
|------|----------|
| **Primárias** | `git push`, `git commit`, `push`, `commit`, `versionar`, `commitar` |
| **Frases PT-BR** | "faça um push", "commite tudo", "suba as mudanças", "versione isso", "manda pro GitHub", "git e push", "salve no repositório" |
| **Contexto** | Após terminar implementação, salvar trabalho no Git |
| **Localização** | `docs/skills/03-utilities/git-commit-push.md` |

#### restart-server
| Tipo | Keywords |
|------|----------|
| **Primárias** | `reiniciar servidor`, `restart`, `restartar`, `servidor caiu`, `servidor travou` |
| **Frases PT-BR** | "reinicie o server", "aplique as mudanças no backend", "servidor não responde", "npm run dev", "reboot do servidor", "subir servidor" |
| **Contexto** | Após mudanças backend, servidor não respondendo |
| **Localização** | `docs/skills/03-utilities/restart-server.md` |

#### replit-pull
| Tipo | Keywords |
|------|----------|
| **Primárias** | `replit pull`, `replit`, `deploy`, `sincronizar replit`, `produção` |
| **Frases PT-BR** | "pull no replit", "atualizar replit", "puxa no replit", "sincroniza o replit", "manda pro replit", "deploy replit", "publicar", "subir pra produção" |
| **Contexto** | Enviar código do GitHub para ambiente Replit (produção) |
| **NÃO confundir** | Git push (GitHub) ≠ Replit pull (deploy para produção) |
| **Localização** | `docs/skills/03-utilities/replit-pull.md` |

#### newsession
| Tipo | Keywords |
|------|----------|
| **Primárias** | `nova sessão`, `handover`, `contexto`, `retomar trabalho`, `continuar` |
| **Frases PT-BR** | "transferir contexto", "encerrar sessão", "salvar progresso", "resumo da sessão", "o que foi feito", "retomar de onde parei" |
| **Contexto** | Fim de sessão, transferência para novo contexto, resumo de trabalho |
| **Localização** | `docs/skills/03-utilities/newsession.md` |

#### fact-checker
| Tipo | Keywords |
|------|----------|
| **Primárias** | `verificar`, `confirmar`, `validar informação`, `é verdade que`, `checar fato`, `anti-alucinação` |
| **Frases PT-BR** | "isso é verdade?", "confirme que existe", "verifique no código", "tem certeza?", "valide essa informação", "confere se", "não invente" |
| **Contexto** | Dúvida sobre veracidade, dados críticos que precisam ser 100% corretos |
| **NÃO confundir** | Pesquisa exploratória → `pesquisa`; Auditoria de código → `code-inspector` |
| **Localização** | `docs/skills/03-utilities/fact-checker.md` |

#### ai-problems-detection
| Tipo | Keywords |
|------|----------|
| **Primárias** | `overengineering`, `código duplicado`, `reinventando a roda`, `arquivo monolítico`, `pré-implementação` |
| **Frases PT-BR** | "tá muito complexo", "já existe isso?", "tem mais simples?", "tá duplicado", "esse código já existe", "deveria separar", "antes de implementar", "vamos verificar antes" |
| **Contexto** | Antes de escrever código novo, revisão de abordagem, sanity check |
| **Ativação automática** | Deve rodar ANTES de qualquer implementação significativa |
| **Localização** | `docs/skills/03-utilities/ai-problems-detection.md` |

#### Refactor-Monolith
| Tipo | Keywords |
|------|----------|
| **Primárias** | `refatorar`, `monolito`, `decomposição`, `arquivo grande`, `separar módulos`, `extrair funções` |
| **Frases PT-BR** | "refatorar arquivo grande", "separar em módulos", "esse arquivo tá enorme", "extrair funções", "decompor monolito", "quebrar arquivo", "arquivo com muitas linhas" |
| **Contexto** | Arquivos com +500 linhas, necessidade de modularização |
| **NÃO confundir** | Refactoring pontual → `code`; Refactoring de lógica de negócio → `league-architect` primeiro |
| **Localização** | `docs/skills/03-utilities/Refactor-Monolith.md` |

---

### 04 - Project-Specific (Específicas do Super Cartola)

#### cartola-api
| Tipo | Keywords |
|------|----------|
| **Primárias** | `API Cartola`, `endpoint cartola`, `scout`, `X-GLB-Token`, `mercado cartola`, `atleta`, `rodada cartola` |
| **Frases PT-BR** | "endpoint da API", "como autenticar no cartola", "estrutura do response", "scouts do jogador", "status do mercado", "dados do cartola", "posições dos jogadores", "clubes do brasileirão" |
| **Contexto** | Integração com API oficial do Cartola FC, consulta de dados de jogadores/times |
| **Localização** | `docs/skills/04-project-specific/cartola-api.md` |
| **Referências** | `docs/skills/04-project-specific/cartola-api-references/` |

#### cache-auditor
| Tipo | Keywords |
|------|----------|
| **Primárias** | `cache`, `auditoria de cache`, `Service Worker`, `IndexedDB`, `TTL`, `cache stale`, `cache morto` |
| **Frases PT-BR** | "auditar cache", "cache desatualizado", "limpar cache", "velocidade do app", "performance de cache", "CACHE-APP", "CACHE-WEB", "cache offline" |
| **Modos** | `CACHE-APP --participante`, `CACHE-WEB --admin`, `CACHE-APP --admin` |
| **Contexto** | Problemas de cache, performance, dados desatualizados nos apps |
| **NÃO confundir** | Cache de backend/MongoDB → `db-guardian`; Otimizar JS/CSS → `frontend-crafter` |
| **Localização** | `docs/skills/04-project-specific/cache-auditor.md` |

#### auditor-module
| Tipo | Keywords |
|------|----------|
| **Primárias** | `auditar módulo`, `auditoria de módulo`, `validar módulo`, `conformidade`, `checklist módulo` |
| **Frases PT-BR** | "audite o módulo", "validar implementação do módulo", "checklist do módulo", "módulo tá correto?", "revisar módulo", "auditoria completa do módulo" |
| **Dimensões** | segurança, UI/UX, financeiro, performance, regras de negócio |
| **Contexto** | Validação completa de um módulo específico (Top 10, Mata-Mata, etc.) |
| **NÃO confundir** | Auditoria de código genérica → `code-inspector`; Auditoria de cache → `cache-auditor` |
| **Localização** | `docs/skills/04-project-specific/AUDITOR-MODULE.md` |

#### analise-branches
| Tipo | Keywords |
|------|----------|
| **Primárias** | `branch`, `análise de branch`, `merge`, `comparar branches`, `branches remotas` |
| **Frases PT-BR** | "analise as branches", "quais branches existem", "status das branches", "branch pode mergear", "risco do merge", "branches ativas" |
| **Contexto** | Antes de merge, inventário de branches, análise de risco |
| **NÃO confundir** | Git push/commit → `git-commit-push` |
| **Localização** | `docs/skills/04-project-specific/SKILL-ANALISE-BRANCHES.md` |

---

### 05 - Meta (Skills sobre Skills)

#### skill-creator
| Tipo | Keywords |
|------|----------|
| **Primárias** | `criar skill`, `nova skill`, `skill customizada`, `desenvolver skill` |
| **Frases PT-BR** | "quero criar uma skill", "fazer skill nova", "desenvolver um agente", "skill personalizada" |
| **Contexto** | Necessidade de nova capacidade especializada |
| **Localização** | `docs/skills/05-meta/skill-creator.md` |

#### skill-installer
| Tipo | Keywords |
|------|----------|
| **Primárias** | `instalar skill`, `catálogo de skills`, `listar skills`, `adicionar skill` |
| **Frases PT-BR** | "instalar uma skill", "quais skills disponíveis", "adicionar skill do GitHub" |
| **Contexto** | Ampliar capacidades com skills externas |
| **Localização** | `docs/skills/05-meta/skill-installer.md` |

---

## Tabela Rápida de Resolução

Consulta rápida: "o usuário disse X → qual skill usar?"

| Usuário disse... | Skill | Motivo |
|-------------------|-------|--------|
| "quero criar uma feature nova" | `workflow` | Início de ciclo completo |
| "pesquise como funciona o extrato" | `pesquisa` | Levantamento exploratório |
| "especifique as mudanças" | `spec` | Planejamento técnico |
| "implemente isso" | `code` | Execução de mudanças |
| "crie uma tela de ranking" | `frontend-crafter` | Criação de UI |
| "como funciona o mata-mata?" | `system-scribe` | Explicação do sistema |
| "qual a regra de desempate?" | `league-architect` | Regra de negócio |
| "limpe os dados antigos" | `db-guardian` | Operação no banco |
| "revise esse controller" | `code-inspector` | Code review |
| "faça um push" | `git-commit-push` | Versionamento |
| "reinicie o servidor" | `restart-server` | Operação de infra |
| "atualize o replit" | `replit-pull` | Deploy |
| "salve o contexto" | `newsession` | Handover de sessão |
| "tem certeza disso?" | `fact-checker` | Validação de fatos |
| "antes de codar, verifique" | `ai-problems-detection` | Pré-check |
| "esse arquivo tá enorme" | `Refactor-Monolith` | Decomposição |
| "endpoint do cartola" | `cartola-api` | API externa |
| "cache tá lento" | `cache-auditor` | Performance de cache |
| "audite o módulo top 10" | `auditor-module` | Auditoria de módulo |
| "quais branches existem" | `analise-branches` | Análise git |
| "criar uma skill nova" | `skill-creator` | Meta |
| "instalar skill X" | `skill-installer` | Meta |

---

## Combinações de Skills (Workflows Comuns)

| Cenário | Sequência de Skills |
|---------|---------------------|
| Feature nova completa | `workflow` → `pesquisa` → `spec` → `ai-problems-detection` → `code` → `git-commit-push` |
| Bug report | `fact-checker` → `code-inspector` → `code` → `git-commit-push` |
| Refatoração | `Refactor-Monolith` → `code-inspector` → `git-commit-push` |
| Deploy completo | `git-commit-push` → `replit-pull` → `restart-server` |
| Auditoria de módulo | `auditor-module` → `code-inspector` → `cache-auditor` |
| Documentação | `system-scribe` |
| Consulta API Cartola | `cartola-api` → `fact-checker` |

---

## Notas Técnicas

- **Localização canônica:** Todas as skills residem em `docs/skills/[categoria]/`
- **Formato:** Markdown puro, agnóstico de IA (Claude, GPT, Gemini, etc.)
- **Manutenção:** Ao criar nova skill, adicionar entrada neste mapa E no `README.md`
- **Prioridade de match:** Keyword primária > frase PT-BR > contexto implícito

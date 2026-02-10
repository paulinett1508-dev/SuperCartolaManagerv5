# 🎯 CONFIGURAÇÃO: MODO DE PLANEJAMENTO OBRIGATÓRIO

**Versão:** 2.0
**Última atualização:** 2026-02-10
**Ambientes:** Web, Terminal, VS Code, Antigravity
**Status:** ⚠️ **OBRIGATÓRIO E INEGOCIÁVEL** ⚠️

---

## 📜 Propósito

Este arquivo contém as instruções ABSOLUTAS que o Claude Code deve seguir em TODOS os ambientes (Web, Terminal, VS Code, Antigravity) para garantir que:

1. **NUNCA** comece a programar sem planejamento
2. **SEMPRE** liste tarefas usando `TodoWrite`
3. **SEMPRE** questione o usuário antes de executar
4. **SÓ EXECUTE** após aprovação explícita

---

## 🚨 REGRA CARDINAL

```
┌──────────────────────────────────────────────────────────┐
│  NENHUM CÓDIGO PODE SER ESCRITO ANTES DE:               │
│  1. Criar planejamento completo                          │
│  2. Listar tarefas com TodoWrite                         │
│  3. Questionar usuário                                   │
│  4. Receber aprovação explícita                          │
└──────────────────────────────────────────────────────────┘
```

### Violação = PARE IMEDIATAMENTE

Se você perceber que começou a programar sem seguir o protocolo:

1. **PARE** toda execução
2. **DESFAÇA** mudanças (se possível via `git reset` ou similar)
3. **CRIE O PLANEJAMENTO** que deveria ter criado
4. **PEÇA DESCULPAS** ao usuário
5. **RECOMECE CORRETAMENTE**

---

## 📋 FLUXO OBRIGATÓRIO (3 FASES)

### FASE 1: PLANEJAMENTO 🧠

**Objetivo:** Entender completamente a solicitação antes de agir

**Passos:**
1. Ler e analisar a solicitação do usuário
2. Identificar todos os arquivos envolvidos
3. Mapear dependências entre tarefas
4. Listar riscos e considerações
5. Criar lista de tarefas atômicas

**Ferramentas:**
- `Read` - Para entender código existente
- `Glob` / `Grep` - Para buscar padrões
- `Task(Explore)` - Para explorar codebase
- **NUNCA** `Edit`, `Write`, `Bash` com mudanças

**Output Esperado:**
```markdown
## 📋 Planejamento da Tarefa: [NOME]

### Contexto
[Resumo do que foi pedido]

### Análise
[O que precisa ser feito e por quê]

### Tarefas Identificadas
1. [Tarefa 1] - [Justificativa]
2. [Tarefa 2] - [Justificativa]
...

### Riscos/Considerações
- [Risco 1]
- [Risco 2]

### Arquivos Afetados
- `/caminho/arquivo1.js` - [O que será alterado]
- `/caminho/arquivo2.md` - [O que será alterado]
```

---

### FASE 2: VALIDAÇÃO ✅

**Objetivo:** Confirmar com usuário ANTES de executar

**Passos:**
1. Usar `TodoWrite` para criar lista de tarefas
2. Apresentar plano completo ao usuário
3. **PERGUNTAR EXPLICITAMENTE:** "Este planejamento faz sentido? Posso prosseguir?"
4. **AGUARDAR RESPOSTA** - NUNCA assuma aprovação

**Formato da Pergunta:**
```markdown
---

**⚠️ VALIDAÇÃO NECESSÁRIA ⚠️**

Criei o planejamento acima com [X] tarefas identificadas.

**Este planejamento faz sentido para você?**

Opções:
- ✅ "Sim, prossiga" → Executo o plano
- ⚠️ "Ajuste X" → Modifico o plano
- ❌ "Não faça isso" → Cancelo tudo

**Aguardando sua confirmação...**
```

**Respostas Aceitas para PROSSEGUIR:**
- "Sim"
- "Pode prosseguir"
- "Ok"
- "Execute"
- "Faça"
- "Correto"
- "Perfeito"

**Se usuário pedir ajustes:** Volte para FASE 1, ajuste e valide novamente

---

### FASE 3: EXECUÇÃO ⚡

**Objetivo:** Executar plano aprovado com transparência total

**Passos:**
1. Marcar primeira tarefa como `in_progress`
2. Executar tarefa
3. Marcar como `completed` IMEDIATAMENTE após conclusão
4. Passar para próxima tarefa
5. Repetir até finalizar

**Ferramentas Liberadas:**
- `Edit`, `Write` - Modificar código
- `Bash` - Executar comandos
- `TodoWrite` - Atualizar progresso

**Modo Auto-accept:**
- Se configurado `autoAcceptEdits: true`
- Execute sem pausas, mas SEMPRE mostrando progresso

**Output Esperado:**
```
✅ Tarefa 1: Concluída
🔄 Tarefa 2: Em andamento...
   → Editando /path/to/file.js
   → Adicionando função X
✅ Tarefa 2: Concluída
...
```

---

## 🎯 TEMPLATE DE PLANEJAMENTO (COPIAR E USAR)

```markdown
## 📋 Planejamento da Tarefa: [NOME DA TAREFA]

### 1. Contexto
**Solicitação do usuário:**
> [Copiar exatamente o que o usuário pediu]

**Entendimento:**
[Explicar com suas palavras o que vai fazer]

---

### 2. Análise Técnica

**O que precisa ser feito:**
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

**Por quê precisa ser feito:**
[Justificativa técnica]

**Como será feito:**
[Abordagem geral]

---

### 3. Tarefas Detalhadas

Vou usar `TodoWrite` para criar as seguintes tarefas:

| # | Tarefa | Arquivo(s) Afetado(s) | Risco |
|---|--------|------------------------|-------|
| 1 | [Descrição curta] | `/path/file.js` | 🟢 Baixo |
| 2 | [Descrição curta] | `/path/file.js` | 🟡 Médio |
| 3 | [Descrição curta] | `/path/file.js` | 🔴 Alto |

---

### 4. Riscos e Considerações

**Riscos identificados:**
- ⚠️ [Risco 1] - Mitigação: [Como resolver]
- ⚠️ [Risco 2] - Mitigação: [Como resolver]

**Dependências:**
- 📦 [Biblioteca X] - Versão Y
- 🔗 [Sistema externo Z]

**Impacto:**
- 👥 Usuários afetados: [Quem]
- 💾 Dados afetados: [Quais collections]
- 🔧 Serviços afetados: [Quais]

---

### 5. Arquivos Afetados

```
📁 /caminho/para/arquivo1.js
   └─ O que será alterado: [Descrição]
   └─ Linhas aproximadas: [100-150]

📁 /caminho/para/arquivo2.md
   └─ O que será alterado: [Descrição]
   └─ Tipo de mudança: [Criação/Edição/Deleção]
```

---

### 6. Checklist de Validação

Antes de executar, confirme:

- [ ] Li e entendi a solicitação completamente
- [ ] Identifiquei todos os arquivos envolvidos
- [ ] Mapeei dependências entre tarefas
- [ ] Listei riscos e considerações
- [ ] Criei tarefas atômicas e sequenciais
- [ ] Apresentei plano ao usuário
- [ ] **RECEBI APROVAÇÃO EXPLÍCITA** ← **CRÍTICO**

---

## ⚠️ VALIDAÇÃO NECESSÁRIA ⚠️

Este planejamento faz sentido para você?

**Aguardando sua confirmação para prosseguir...**
```

---

## 🚫 EXCEÇÕES (RARAS)

Este protocolo pode ser PULADO **APENAS** se:

### 1. Comando Explícito de Bypass
Usuário diz:
- "Execute direto"
- "Pule o planejamento"
- "Já sei o que fazer, apenas faça"
- "Modo rápido"

### 2. Tarefa Trivial Óbvia
Exemplos:
- "Leia o arquivo X.js"
- "Liste as collections do MongoDB"
- "Mostre o conteúdo de Y.md"

**Critério:** 1 ação simples sem decisões

### 3. Continuação de Tarefa Aprovada
- Já está executando plano validado
- Usuário pediu para continuar de onde parou
- Tarefas já estão listadas no `TodoWrite`

---

## ⚙️ CONFIGURAÇÕES SUPORTADAS

### Auto-accept Edits

Se `autoAcceptEdits: true` está configurado:

**AINDA ASSIM:**
1. ✅ Crie o planejamento completo
2. ✅ Liste tarefas com `TodoWrite`
3. ✅ Questione o usuário
4. ⚡ Após aprovação, execute SEM PAUSAS

**Exemplo:**
```
[Planejamento completo]

Usuário: "Ok, prossiga"

Claude: ✅ Aprovado! Executando em modo auto-accept...
        🔄 Tarefa 1/5: Em andamento...
        ✅ Tarefa 1/5: Concluída
        🔄 Tarefa 2/5: Em andamento...
        ...
```

---

## 📊 MÉTRICAS DE SUCESSO

Você está seguindo corretamente este protocolo se:

✅ 100% das solicitações começam com planejamento
✅ 0% de código escrito sem aprovação
✅ Usuário sempre entende o que será feito ANTES de ser feito
✅ Riscos são identificados e comunicados previamente
✅ Não há surpresas durante execução

---

## 🔍 EXEMPLOS PRÁTICOS

### ❌ ERRADO (Violação do Protocolo)

```
Usuário: "Crie uma feature de notificações"

Claude: Vou criar a feature de notificações!
        *Começa a escrever código direto*
        *Cria arquivos*
        *Faz commits*
```

**Por quê está errado:**
- Não criou planejamento
- Não listou tarefas
- Não questionou usuário
- Começou a executar direto

---

### ✅ CORRETO (Seguindo o Protocolo)

```
Usuário: "Crie uma feature de notificações"

Claude: Vou planejar a implementação da feature de notificações.

## 📋 Planejamento da Tarefa: Feature de Notificações

### Contexto
Usuário solicitou criação de sistema de notificações...

### Análise
Preciso criar backend (API), frontend (UI) e integração...

### Tarefas Identificadas
1. Criar model Notificacao (MongoDB)
2. Criar controller notificacaoController.js
3. Criar rotas /api/notificacoes
4. Criar UI no frontend
5. Testar integração

### Riscos
- Performance: muitas notificações podem sobrecarregar
- UX: notificações em excesso podem incomodar

### Arquivos Afetados
- /models/Notificacao.js (criar)
- /controllers/notificacaoController.js (criar)
- /routes/notificacoes.js (criar)
- /public/js/notificacoes.js (criar)

---

**⚠️ Este planejamento faz sentido? Posso prosseguir?**

Usuário: "Sim, mas adicione também notificações por email"

Claude: Perfeito! Vou ajustar o planejamento para incluir email...

[Atualiza planejamento]

**⚠️ Este planejamento atualizado faz sentido? Posso prosseguir?**

Usuário: "Perfeito, pode executar"

Claude: ✅ Aprovado! Iniciando execução...

        *Usa TodoWrite para criar 6 tarefas*

        🔄 Tarefa 1/6: Criando model Notificacao...
        ✅ Tarefa 1/6: Concluída
        🔄 Tarefa 2/6: Criando controller...
        ...
```

---

## 🔧 TROUBLESHOOTING

### Problema: "Claude começou a programar sem planejamento"

**Solução:**
1. Usuário deve dizer: "PARE! Você violou o protocolo de planejamento"
2. Claude deve:
   - Parar imediatamente
   - Desfazer mudanças (se possível)
   - Criar o planejamento correto
   - Pedir desculpas
   - Recomeçar do zero

### Problema: "Claude está fazendo planejamento demais para tarefas simples"

**Solução:**
- Usuário pode dizer: "Execute direto" (exceção #1)
- OU configurar tarefas triviais no CLAUDE.md

### Problema: "Claude não está usando TodoWrite"

**Solução:**
- Verificar se `autoUseTodoWrite: true` está em `.vscode/settings.json`
- Usuário deve lembrar: "Use TodoWrite para listar as tarefas"

---

## 📚 REFERÊNCIAS

- **CLAUDE.md** - Seção "🎯 PROTOCOLO DE PLANEJAMENTO OBRIGATÓRIO"
- **`.vscode/settings.json`** - Configurações `claudeCode.planningMode`
- **`TodoWrite` Tool** - Ferramenta para gerenciar tarefas

---

## 🏆 COMPROMISSO

**Eu, Claude Code, me comprometo a:**

1. ✅ **SEMPRE** criar planejamento completo antes de programar
2. ✅ **SEMPRE** usar `TodoWrite` para listar tarefas
3. ✅ **SEMPRE** questionar o usuário antes de executar
4. ✅ **NUNCA** assumir que tenho aprovação sem perguntar
5. ✅ **NUNCA** começar a programar sem validação explícita

**Este protocolo é ABSOLUTO, INEGOCIÁVEL e APLICÁVEL EM TODOS OS AMBIENTES.**

---

**Última revisão:** 2026-02-10
**Status:** ⚠️ **ATIVO E OBRIGATÓRIO** ⚠️

---
name: WORKFLOW
description: Maestro do High Senior Protocol - Detecta fase automaticamente, aplica checklists e guia workflow Pesquisa -> Spec -> Code com contexto enxuto. Invoque com /workflow no inicio de cada sessao.
---

# HIGH SENIOR PROTOCOL - WORKFLOW MASTER

## DETECCAO AUTOMATICA DE FASE

```bash
# Logica de deteccao
existePRD=$(ls .claude/docs/PRD-*.md 2>/dev/null | head -1)
existeSpec=$(ls .claude/docs/SPEC-*.md 2>/dev/null | head -1)

if [ -z "$existePRD" ]; then
  echo "FASE_1_PESQUISA"
elif [ -z "$existeSpec" ]; then
  echo "FASE_2_SPEC"
else
  echo "FASE_3_CODE"
fi
```

---

## FASE 1: PESQUISA

### Checklist Pre-Execucao
- [ ] Qual funcionalidade precisa implementar?
- [ ] Entendi os requisitos de negocio?
- [ ] Sei em qual modulo isso se encaixa?

### Protocolo S.A.I.S (Solicitar + Analisar)
1. **SOLICITAR contexto:**
   - Buscar no codebase arquivos relacionados
   - Consultar principios do projeto (CLAUDE.md)
   - Verificar patterns existentes

2. **ANALISAR arquitetura:**
   - Identificar modulos afetados
   - Mapear dependencias iniciais
   - Verificar regras de negocio

### Executar Skill
```
/pesquisa [descricao da tarefa]
```

### Output Esperado
- Arquivo: `.claude/docs/PRD-[nome-tarefa].md`
- Conteudo:
  - Resumo executivo
  - Arquivos identificados (controllers, models, frontend)
  - Dependencias mapeadas
  - Solucao proposta
  - Impactos previstos

### Proxima Acao
```
PRD gerado com sucesso!

LIMPAR CONTEXTO:
1. Feche esta conversa
2. Abra nova conversa
3. Execute: /workflow ler PRD-[nome].md e gerar Spec
```

---

## FASE 2: SPECIFICATION

### Checklist Pre-Execucao
- [ ] PRD completo e revisado?
- [ ] Entendi a solucao proposta?
- [ ] Sei exatamente quais arquivos modificar?

### Protocolo S.D.A (Sistema de Dependencias)
1. **MAPEAR arquivos:**
   - Solicitar arquivos listados no PRD
   - Analisar linha por linha
   - Identificar funcoes/classes/IDs

2. **VERIFICAR dependencias:**
   - Quem importa esses arquivos?
   - Quais IDs/classes CSS sao usados?
   - Ha formularios que submitam para rotas?
   - Breadcrumbs e navegacao afetados?

### Executar Skill
```
/spec [path/to/PRD-nome.md]
```

### Output Esperado
- Arquivo: `.claude/docs/SPEC-[nome-tarefa].md`
- Conteudo:
  - Lista precisa de arquivos a modificar
  - Mudancas cirurgicas por arquivo
  - Dependencias validadas
  - Testes necessarios
  - Rollback plan

### Proxima Acao
```
Spec gerado com sucesso!

LIMPAR CONTEXTO:
1. Feche esta conversa
2. Abra nova conversa
3. Execute: /workflow ler SPEC-[nome].md e implementar
```

---

## FASE 3: IMPLEMENTATION

### Checklist Pre-Execucao
- [ ] Spec validado?
- [ ] Arquivos listados identificados?
- [ ] Entendo as mudancas cirurgicas necessarias?

### Protocolo Antipattern (Preserve Intent)
1. **SOLICITAR arquivos originais:**
   - Ver arquivo completo antes de modificar
   - Preservar logica existente
   - Mudancas minimas e focadas

2. **VALIDAR impacto:**
   - Garantir zero regressoes
   - Testar dependencias
   - Verificar multi-tenant (liga_id)

### Executar Skill
```
/code [path/to/SPEC-nome.md]
```

### Output Esperado
- Arquivos modificados/criados
- Commits granulares
- Testes executados
- Documentacao atualizada (se aplicavel)

### Tarefa Concluida
```
Implementacao finalizada!

Atualizar pending-tasks.md:
- [x] [Nome da tarefa]
  STATUS: Concluido
  Arquivos modificados: [lista]
  Commits: [hashes]
```

---

## REGRAS CRITICAS (Non-Negotiable)

### Autonomia Total
**NUNCA pergunte:**
- "Onde esta o arquivo X?"
- "Em qual pasta fica Y?"
- "Pode me mostrar a estrutura?"

**SEMPRE busque:**
- `ls -la /home/runner/workspace` -> mapear estrutura
- `grep -r "pattern" .` -> encontrar codigo
- `find . -name "*Controller.js"` -> localizar arquivos

### Perguntas Validas (Negocio)
**Exemplos:**
- "Quais regras de desempate voce quer?"
- "Isso se aplica a todas as ligas?"
- "Qual prioridade: confronto direto ou saldo?"

### Aplicar Principios
**Em cada fase:**
- Fase 1: S.A.I.S (Solicitar + Analisar)
- Fase 2: S.D.A (Mapear + Verificar) + S.A.I.S (Identificar)
- Fase 3: Antipattern (Preserve) + S.A.I.S (Alterar)

### Contexto Enxuto
**Sempre limpar:**
- Apos gerar PRD -> Fechar conversa
- Apos gerar Spec -> Fechar conversa
- Cada fase comeca LIMPA

---

## EXEMPLOS DE USO

### Exemplo 1: Nova Feature
```
VOCE: /workflow preciso implementar notificacoes push no app

WORKFLOW detecta: Sem PRD -> FASE 1

WORKFLOW executa:
1. Busca service workers no projeto
2. Consulta MCP Perplexity sobre Firebase
3. Mapeia arquivos PWA existentes
4. Gera PRD-notificacoes-push.md
5. Instrui limpar contexto
```

### Exemplo 2: Continuar de PRD
```
VOCE: /workflow ler PRD-notificacoes-push.md e gerar Spec

WORKFLOW detecta: PRD existe, sem Spec -> FASE 2

WORKFLOW executa:
1. Le PRD completo
2. Solicita notificationService.js
3. Solicita sw.js
4. Mapeia dependencias S.D.A
5. Gera SPEC-notificacoes-push.md
6. Instrui limpar contexto
```

### Exemplo 3: Implementar
```
VOCE: /workflow ler SPEC-notificacoes-push.md e implementar

WORKFLOW detecta: Spec existe -> FASE 3

WORKFLOW executa:
1. Le Spec completo
2. Solicita arquivos listados
3. Aplica mudancas cirurgicas
4. Valida multi-tenant
5. Testa funcionalidade
6. Marca tarefa como concluida
```

---

## FLUXO COMPLETO VISUALIZADO

```
INICIO: Voce descreve o que precisa
              |
              v
/WORKFLOW detecta fase automaticamente
- Sem PRD? -> FASE 1
- Com PRD, sem Spec? -> FASE 2
- Com Spec? -> FASE 3
              |
              v
FASE 1: PESQUISA (/pesquisa)
- Busca no codebase
- Consulta MCP (Perplexity/Context7)
- Mapeia arquivos
OUTPUT: PRD.md
              |
       LIMPAR CONTEXTO
              |
              v
FASE 2: SPECIFICATION (/spec)
- Le PRD.md
- Analisa arquivos linha por linha
- Mapeia dependencias (S.D.A)
OUTPUT: Spec.md
              |
       LIMPAR CONTEXTO
              |
              v
FASE 3: IMPLEMENTATION (/code)
- Le Spec.md
- Solicita arquivos originais
- Aplica mudancas cirurgicas
OUTPUT: Codigo implementado
              |
              v
FIM: Tarefa concluida, pending-tasks atualizado
```

---

## TEMPLATE pending-tasks.md

```markdown
# Tarefas Pendentes

## Em andamento
- [ ] Implementar notificacoes push
  - FASE 1: PRD.md gerado (.claude/docs/PRD-push.md)
  - FASE 2: Spec.md gerado (.claude/docs/SPEC-push.md)
  - FASE 3: Aguardando implementacao
  - RETOMAR: /workflow ler SPEC-push.md e implementar

## Aguardando
- [ ] Corrigir export mobile mata-mata
  - STATUS: Nao iniciado
  - PRIORIDADE: Alta

## Concluidas
- [x] Implementar PWA install prompt
  - Concluido: 2026-01-17
  - Arquivos: install-prompt.js v1.1
```

---

## DICAS DE USO

### Quando Usar /workflow
- Inicio de cada sessao de desenvolvimento
- Ao retomar tarefa pausada
- Quando nao sabe por onde comecar
- Para validar em qual fase esta

### Quando NAO Usar
- Perguntas simples de negocio
- Duvidas sobre codigo existente (use /system-scribe)
- Debugging pontual
- Code review (use /code-inspector)

---

## VERIFICAR ESTADO ATUAL

### Comando para ver docs existentes
```bash
ls -la .claude/docs/
```

### Listar PRDs
```bash
ls .claude/docs/PRD-*.md 2>/dev/null || echo "Nenhum PRD encontrado"
```

### Listar SPECs
```bash
ls .claude/docs/SPEC-*.md 2>/dev/null || echo "Nenhum SPEC encontrado"
```

---

**STATUS:** WORKFLOW MASTER - ARMED & ORCHESTRATING
**Versao:** 1.0 (High Senior Protocol)

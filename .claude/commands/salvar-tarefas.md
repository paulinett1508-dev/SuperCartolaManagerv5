# Salvar Tarefas Pendentes

O usuário está encerrando a sessão. Antes de sair:

1. **Analise o contexto atual** da conversa e identifique:
   - Qual era a tarefa principal em andamento?
   - Quais subtarefas foram concluídas?
   - Quais subtarefas ainda estão pendentes?
   - Há algum arquivo sendo editado que não foi commitado?

2. **Salve um resumo** no arquivo `.claude/pending-tasks.md` com o formato:

```markdown
# Tarefas Pendentes - [DATA]

## Contexto
[Breve descrição do que estava sendo feito]

## Tarefa Principal
[Descrição da tarefa]

## Concluído
- [x] Item 1
- [x] Item 2

## Pendente
- [ ] Item 3
- [ ] Item 4

## Arquivos Modificados (não commitados)
- path/to/file.js

## Próximos Passos
1. Passo 1
2. Passo 2

## Comandos Úteis para Retomar
```bash
# Exemplo de comandos que ajudam a retomar
git status
```
```

3. **Confirme** ao usuário que as tarefas foram salvas e ele pode sair com segurança.

4. **Sugira** usar `/retomar-tarefas` na próxima sessão.

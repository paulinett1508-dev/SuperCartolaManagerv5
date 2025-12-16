---
name: code-inspector
description: Especialista em Code Review, Debugging e Qualidade de Software. Use quando o usuário pedir para "procurar bugs", "auditar o sistema", "corrigir erros" ou "melhorar o código".
allowed-tools: Read, Grep, LS
---

# Code Inspector Skill

## 1. Protocolo de Auditoria (Checklist)
Ao analisar arquivos em busca de bugs, verifique sempre:

### A. Segurança & Limpeza
* **Logs em Produção:** Procure por `console.log` esquecidos em arquivos críticos (Controller/Service). Sugira usar o `log-manager.js`.
* **Segredos:** Verifique se há chaves de API ou senhas hardcoded (devem estar em `process.env`).

### B. Integridade do Frontend (Mobile)
* **Fragmentos:** Garanta que arquivos em `public/participante/fronts/` NÃO tenham tags `<html>`, `<head>` ou `<body>`.
* **Imports:** Verifique se os módulos JS importados no HTML realmente existem no caminho especificado.

### C. Consistência do Backend
* **Tratamento de Erro:** Todo `await` em Controller deve estar envolto em `try/catch`.
* **Validação:** Verifique se os dados de entrada (req.body) estão sendo validados antes de ir pro banco.

## 2. Comandos de Diagnóstico
Se precisar varrer o projeto, use estas estratégias:
* **Lint:** Sugira rodar `npm run lint` para erros de sintaxe.
* **Testes:** Sugira rodar `npm test` se houver arquivos de teste afetados.

## 3. Postura de Fix
Ao propor uma correção:
1. Explique a **Causa Raiz** (por que quebrou?).
2. Aplique a correção mantendo o estilo de código existente.
3. Verifique se a correção não quebra o "Cache-First" ou a "Navegação v3.0".

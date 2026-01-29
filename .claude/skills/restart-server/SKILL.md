# /restart-server - Reiniciar Servidor de Desenvolvimento

Skill para reiniciar o servidor Node.js no ambiente Replit.

## Quando Usar
- Após fazer alterações em arquivos backend (controllers, routes, services)
- Quando o servidor travar ou parar de responder
- Para aplicar mudanças em configurações

## Execução

### Passo 1: Parar o servidor
```bash
pkill -f "node.*index.js" 2>/dev/null || pkill -f "node.*server" 2>/dev/null || true
```

### Passo 2: Aguardar e verificar
```bash
sleep 3 && curl -s "http://localhost:3000/api/cartola/mercado/status" 2>/dev/null | head -50 || echo "Aguardando servidor reiniciar..."
```

### Passo 3: Se não reiniciar automaticamente
Informar o usuário:
> O servidor foi parado. No Replit, clique no botão **"Run"** (ou **"Stop" e depois "Run"**) no topo da página para reiniciar.

### Passo 4: Verificação final
```bash
sleep 5 && curl -s "http://localhost:3000/api/cartola/mercado/status" 2>/dev/null && echo "✅ Servidor reiniciado com sucesso!" || echo "⚠️ Servidor ainda não respondeu - verifique o Replit"
```

## Notas
- Exit code 144 é esperado ao matar o processo (signal)
- O Replit geralmente reinicia automaticamente após o processo ser morto
- Se não reiniciar, o usuário precisa clicar em "Run" manualmente
- Após reiniciar, sugerir Ctrl+Shift+R no navegador para limpar cache

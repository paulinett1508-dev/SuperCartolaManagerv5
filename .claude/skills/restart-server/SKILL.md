# /restart-server - Reiniciar Servidor de Desenvolvimento

Skill para reiniciar o servidor Node.js no ambiente Replit usando `npm run dev`.

## Quando Usar
- Após fazer alterações em arquivos backend (controllers, routes, services)
- Quando o servidor travar ou parar de responder
- Para aplicar mudanças em configurações
- Após mudanças significativas no frontend que precisam de servidor limpo

## Execução

### Passo 1: Parar todos os processos Node.js
```bash
pkill -f "node.*index.js" 2>/dev/null || pkill -f "node.*server" 2>/dev/null || pkill -f "npm run dev" 2>/dev/null || true
sleep 2
```

### Passo 2: Iniciar servidor em modo dev (background)
```bash
cd /home/runner/workspace && npm run dev > /tmp/server.log 2>&1 &
echo "🚀 Servidor iniciando em background (PID: $!)..."
```

### Passo 3: Aguardar inicialização (15s)
```bash
echo "⏳ Aguardando servidor inicializar..."
for i in {1..15}; do
  sleep 1
  curl -s "http://localhost:3000/api/cartola/mercado/status" 2>/dev/null > /dev/null && break
done
```

### Passo 4: Verificar status
```bash
if curl -s "http://localhost:3000/api/cartola/mercado/status" 2>/dev/null > /dev/null; then
  echo "✅ Servidor reiniciado com sucesso!"
  echo "📊 Status: $(curl -s "http://localhost:3000/api/cartola/mercado/status" | head -50)"
else
  echo "⚠️ Servidor não respondeu após 15s"
  echo "📋 Últimas linhas do log:"
  tail -20 /tmp/server.log 2>/dev/null || echo "Log não disponível"
  echo ""
  echo "💡 Verifique o Replit ou execute manualmente: npm run dev"
fi
```

### Passo 5 (Opcional): Ver logs em tempo real
Se o servidor não subir, oferecer ao usuário:
```bash
tail -f /tmp/server.log
```

## Notas
- Exit code 144 é esperado ao matar processos (SIGTERM)
- O servidor é iniciado via `npm run dev` em background
- Logs salvos em `/tmp/server.log` para debug
- Aguarda até 15s para o servidor responder
- Após reiniciar, sugerir **Ctrl+Shift+R** no navegador para limpar cache
- Se falhar, o usuário pode executar manualmente: `npm run dev`

## Troubleshooting

### Servidor não sobe
```bash
# Ver logs completos
cat /tmp/server.log

# Ver processos Node ativos
ps aux | grep node

# Porta 3000 ocupada?
lsof -i :3000

# Matar tudo e tentar novamente
pkill -9 node && npm run dev
```

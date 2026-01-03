#!/bin/bash

# Context7 MCP - Script de Teste
# Este script testa a configuração do Context7 MCP Server

echo "🧪 Testando Context7 MCP Server..."
echo ""

# Verificar instalação
echo "1️⃣ Verificando instalação do Context7..."
if npx -y @upstash/context7-mcp@latest --version &>/dev/null; then
  echo "✅ Context7 MCP acessível via npx"
else
  echo "❌ Erro ao acessar Context7 MCP"
  exit 1
fi

echo ""

# Verificar arquivo de configuração
echo "2️⃣ Verificando arquivo de configuração..."
CONFIG_FILE="$HOME/.config/Code/User/mcp_settings.json"

if [ -f "$CONFIG_FILE" ]; then
  echo "✅ Arquivo de configuração encontrado:"
  echo "   $CONFIG_FILE"
  echo ""
  echo "Conteúdo:"
  cat "$CONFIG_FILE" | jq '.' 2>/dev/null || cat "$CONFIG_FILE"
else
  echo "❌ Arquivo de configuração não encontrado"
  exit 1
fi

echo ""
echo "3️⃣ Verificando documentação..."
if [ -f "docs/CONTEXT7-MCP-SETUP.md" ]; then
  echo "✅ Documentação encontrada: docs/CONTEXT7-MCP-SETUP.md"
else
  echo "⚠️  Documentação não encontrada"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Context7 MCP configurado com sucesso!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📖 Próximos passos:"
echo ""
echo "1. Reinicie o VS Code para carregar a configuração MCP"
echo ""
echo "2. Teste com prompts como:"
echo "   'Usando Context7, busque na documentação oficial do Mongoose 8.x"
echo "    como substituir padrões deprecated em models/Time.js'"
echo ""
echo "3. Para APIs do Cartola FC:"
echo "   'Usando Context7, verifique no repo henriquepgomide/caRtola"
echo "    se houve mudanças no endpoint /atletas/mercado'"
echo ""
echo "4. Consulte a documentação completa:"
echo "   📄 docs/CONTEXT7-MCP-SETUP.md"
echo "   📄 CLAUDE.md (seção 'Context7 MCP')"
echo ""
echo "═══════════════════════════════════════════════════════"

#!/bin/bash
# Script para instalar Claude Code automaticamente

echo "Verificando Claude Code..."

if ! command -v claude &> /dev/null; then
    echo "Claude Code não encontrado. Instalando..."
    npm install -g @anthropic-ai/claude-code
    echo "✅ Claude Code instalado com sucesso!"
else
    echo "✅ Claude Code já está instalado"
fi

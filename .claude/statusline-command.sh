#!/bin/bash

# Super Cartola Manager - Claude Code Status Line v3.0
# Colorful status line with icons and cost calculation
# Colors: Cyan (model), Blue (dir), Green (git), Yellow (context), Magenta (cost)

INPUT=$(cat)

# Cores ANSI
CYAN='\033[96m'
BLUE='\033[94m'
GREEN='\033[92m'
YELLOW='\033[93m'
MAGENTA='\033[95m'
RESET='\033[0m'

# Extrair dados usando grep/sed (sem jq se não disponível)
if command -v jq &> /dev/null; then
    # Usar jq se disponível (mais confiável)
    MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "Claude"')
    DIR=$(echo "$INPUT" | jq -r '.workspace.current_dir // .cwd // "~"')
    TOTAL_INPUT=$(echo "$INPUT" | jq -r '.context_window.total_input_tokens // 0')
    TOTAL_OUTPUT=$(echo "$INPUT" | jq -r '.context_window.total_output_tokens // 0')
    CONTEXT_SIZE=$(echo "$INPUT" | jq -r '.context_window.context_window_size // 200000')
else
    # Fallback sem jq
    MODEL=$(echo "$INPUT" | grep -o '"display_name":"[^"]*"' | head -1 | sed 's/"display_name":"//;s/"//')
    DIR=$(echo "$INPUT" | grep -o '"current_dir":"[^"]*"' | head -1 | sed 's/"current_dir":"//;s/"//')
    [ -z "$DIR" ] && DIR=$(echo "$INPUT" | grep -o '"cwd":"[^"]*"' | head -1 | sed 's/"cwd":"//;s/"//')
    TOTAL_INPUT=$(echo "$INPUT" | grep -o '"total_input_tokens":[0-9]*' | head -1 | sed 's/"total_input_tokens"://')
    TOTAL_OUTPUT=$(echo "$INPUT" | grep -o '"total_output_tokens":[0-9]*' | head -1 | sed 's/"total_output_tokens"://')
    CONTEXT_SIZE=$(echo "$INPUT" | grep -o '"context_window_size":[0-9]*' | head -1 | sed 's/"context_window_size"://')
fi

# Defaults
[ -z "$MODEL" ] && MODEL="Claude"
[ -z "$DIR" ] && DIR=$(pwd)
[ -z "$TOTAL_INPUT" ] && TOTAL_INPUT=0
[ -z "$TOTAL_OUTPUT" ] && TOTAL_OUTPUT=0
[ -z "$CONTEXT_SIZE" ] && CONTEXT_SIZE=200000

# Basename do diretório
DIR_NAME=$(basename "$DIR")

# Detectar branch Git
if [ -d "$DIR" ]; then
    BRANCH=$(cd "$DIR" 2>/dev/null && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
else
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
fi

# Calcular % de contexto usado
TOTAL_TOKENS=$((TOTAL_INPUT + TOTAL_OUTPUT))
if [ "$CONTEXT_SIZE" -gt 0 ]; then
    CONTEXT_PCT=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_TOKENS / $CONTEXT_SIZE) * 100}")
else
    CONTEXT_PCT="0.0"
fi

# Formatar tokens (ex: 50000 -> 50K, 1500000 -> 1.5M)
format_tokens() {
    local num=$1
    if [ "$num" -ge 1000000 ]; then
        awk "BEGIN {printf \"%.1fM\", $num / 1000000}"
    elif [ "$num" -ge 1000 ]; then
        awk "BEGIN {printf \"%.0fK\", $num / 1000}"
    else
        echo "$num"
    fi
}

# Calcular tokens restantes
TOKENS_RESTANTES=$((CONTEXT_SIZE - TOTAL_TOKENS))
[ "$TOKENS_RESTANTES" -lt 0 ] && TOKENS_RESTANTES=0

# Calcular percentual restante
PCT_RESTANTE=$(awk "BEGIN {printf \"%.1f\", 100 - $CONTEXT_PCT}")

# Formatar para exibição
USADO_FMT=$(format_tokens $TOTAL_TOKENS)
RESTANTE_FMT=$(format_tokens $TOKENS_RESTANTES)
TOTAL_FMT=$(format_tokens $CONTEXT_SIZE)

# Montar status line compacto (sem custo - usuário usa Claude Max $100/mês)
printf "${CYAN}🤖 %s${RESET} | ${BLUE}📁 %s${RESET}" "$MODEL" "$DIR_NAME"

if [ -n "$BRANCH" ]; then
    printf " | ${GREEN}🌿 %s${RESET}" "$BRANCH"
fi

# Tokens: usado / restante (percentuais)
printf " | ${YELLOW}📊 %s usados${RESET} | ${GREEN}🔋 %s livres (%s%%)${RESET}\n" "$USADO_FMT" "$RESTANTE_FMT" "$PCT_RESTANTE"

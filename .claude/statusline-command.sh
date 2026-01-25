#!/bin/bash

# Super Cartola Manager - Developer-Focused Status Line v5.0
# Format: 📁 Project | 🤖 Model | 🧠 Context | Session ID

INPUT=$(cat)

# ANSI Colors (dimmed for status line)
CYAN='\033[36m'
BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
RESET='\033[0m'

# Extract JSON data (prefer jq, fallback to grep/sed)
if command -v jq &> /dev/null; then
    MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "Claude"')
    DIR=$(echo "$INPUT" | jq -r '.workspace.current_dir // .cwd // "~"')
    USED_PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0')
    SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""')
else
    MODEL=$(echo "$INPUT" | grep -o '"display_name":"[^"]*"' | head -1 | sed 's/"display_name":"//;s/"//')
    DIR=$(echo "$INPUT" | grep -o '"current_dir":"[^"]*"' | head -1 | sed 's/"current_dir":"//;s/"//')
    SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | sed 's/"session_id":"//;s/"//')
    TOTAL_IN=$(echo "$INPUT" | grep -o '"total_input_tokens":[0-9]*' | sed 's/[^0-9]//g')
    TOTAL_OUT=$(echo "$INPUT" | grep -o '"total_output_tokens":[0-9]*' | sed 's/[^0-9]//g')
    CTX_SIZE=$(echo "$INPUT" | grep -o '"context_window_size":[0-9]*' | sed 's/[^0-9]//g')
    [ -n "$TOTAL_IN" ] && [ -n "$CTX_SIZE" ] && USED_PCT=$(awk "BEGIN {printf \"%.0f\", (($TOTAL_IN + $TOTAL_OUT) / $CTX_SIZE) * 100}")
fi

# Defaults
[ -z "$MODEL" ] && MODEL="Claude"
[ -z "$DIR" ] && DIR=$(pwd)
[ -z "$USED_PCT" ] && USED_PCT=0

# Short directory name (project root or basename)
DIR_NAME=$(basename "$DIR")

# Build developer-focused status line with icons
printf "📁 ${BLUE}%s${RESET}" "$DIR_NAME"
printf " | 🤖 ${CYAN}%s${RESET}" "$MODEL"
printf " | 🧠 ${YELLOW}%s%% ctx${RESET}" "$USED_PCT"

if [ -n "$SESSION_ID" ]; then
    printf " | 🔗 ${GREEN}%s${RESET}" "$SESSION_ID"
fi

printf "\n"

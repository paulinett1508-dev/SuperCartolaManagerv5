#!/bin/bash
# Quick Start - Análise de Branches GitHub
# Atalhos para uso comum do script de análise

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SKILL: Análise de Branches - Quick Start  ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Função para executar com descrição
run_analysis() {
    echo -e "${YELLOW}$1${NC}"
    echo -e "${GREEN}Comando: $2${NC}\n"
    eval "$2"
    echo ""
}

# Verificar argumentos
case "$1" in
    "ontem")
        DATA_ONTEM=$(date -d 'yesterday' +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
        run_analysis "📅 Branches criadas ontem" \
            "node scripts/analisar-branches-github.js --desde $DATA_ONTEM --ate $DATA_ONTEM"
        ;;
    
    "hoje")
        DATA=$(date +%Y-%m-%d)
        run_analysis "📅 Branches criadas hoje" \
            "node scripts/analisar-branches-github.js --desde $DATA"
        ;;
    
    "semana")
        DATA_INICIO=$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)
        run_analysis "📅 Branches da última semana" \
            "node scripts/analisar-branches-github.js --desde $DATA_INICIO"
        ;;
    
    "mes")
        DATA_INICIO=$(date +%Y-%m-01)
        run_analysis "📅 Branches do mês atual" \
            "node scripts/analisar-branches-github.js --desde $DATA_INICIO"
        ;;
    
    "pendentes")
        run_analysis "🟡 Branches pendentes" \
            "node scripts/analisar-branches-github.js --status pendente --detalhes"
        ;;
    
    "ativas")
        run_analysis "⚡ Branches em desenvolvimento (não mergeadas)" \
            "node scripts/analisar-branches-github.js --status desenvolvimento --detalhes"
        ;;
    
    "sem-merge")
        run_analysis "⚠️  Branches sem merge (não mergeadas)" \
            "node scripts/analisar-branches-github.js --sem-merge"
        ;;
    
    "stats")
        run_analysis "📊 Estatísticas gerais" \
            "node scripts/analisar-branches-github.js | tail -20"
        ;;
    
    "prs")
        run_analysis "📋 Branches com Pull Requests" \
            "node scripts/analisar-branches-github.js --prs"
        ;;
    
    "sync")
        run_analysis "🔄 Verificar sincronização Replit ↔ GitHub" \
            "node scripts/analisar-branches-github.js --sync-check"
        ;;
    
    "auto-sync")
        run_analysis "⚡ Auto-sincronizar branches atrasadas" \
            "node scripts/analisar-branches-github.js --auto-sync"
        ;;
    
    "todas")
        run_analysis "🌐 Todas as branches com detalhes" \
            "node scripts/analisar-branches-github.js --detalhes"
        ;;
    
    *)
        echo -e "${YELLOW}Uso:${NC} ./quick-start-branches.sh [opção]"
        echo ""
        echo -e "${YELLOW}Opções disponíveis:${NC}"
        echo "  ontem      - Branches criadas ontem"
        echo "  hoje       - Branches criadas hoje"
        echo "  semana     - Branches da última semana"
        echo "  mes        - Branches do mês atual"
        echo "  pendentes  - Branches pendentes (com detalhes)"
        echo "  ativas     - Branches em desenvolvimento"
        echo "  sem-merge  - Branches sem merge (não mergeadas)"
        echo "  prs        - Incluir informações de Pull Requests"
        echo "  sync       - Verificar sincronização Replit ↔ GitHub"
        echo "  auto-sync  - Sincronizar automaticamente branches atrasadas"
        echo "  stats      - Apenas estatísticas"
        echo "  todas      - Todas as branches com detalhes"
        echo ""
        echo -e "${YELLOW}Exemplos:${NC}"
        echo "  ./quick-start-branches.sh ontem"
        echo "  ./quick-start-branches.sh hoje"
        echo "  ./quick-start-branches.sh semana"
        echo "  ./quick-start-branches.sh sem-merge"
        echo "  ./quick-start-branches.sh prs"
        echo "  ./quick-start-branches.sh sync"
        echo "  ./quick-start-branches.sh auto-sync"
        echo ""
        echo -e "${BLUE}Para ajuda completa:${NC}"
        echo "  node scripts/analisar-branches-github.js --ajuda"
        ;;
esac

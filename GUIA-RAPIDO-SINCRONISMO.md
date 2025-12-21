# 🚀 Guia Rápido - Sincronismo de Bancos DEV/PROD

## ⚡ Comandos Essenciais

```bash
# Verificar sincronismo atual
node scripts/sync-check-dev-prod.js

# Corrigir desincronizações
node scripts/fix-sync-dev-prod.js

# Diagnóstico rápido
node scripts/diagnostico-bancos.js
```

## 🎯 Quando Usar

### Verificação Regular
Execute `sync-check-dev-prod.js` ao:
- ✅ Início de cada rodada
- ✅ Após consolidações
- ✅ Antes de testes importantes
- ✅ Semanalmente (mínimo)

### Correção Necessária
Execute `fix-sync-dev-prod.js` quando:
- ❌ Verificação apontar desincronizações
- ❌ Participantes reportarem dados diferentes
- ❌ Após scripts de manutenção

## 🔐 Ambientes

| Variável NODE_ENV | Banco Usado | Uso |
|-------------------|-------------|-----|
| (vazio) | DEV | 🧪 Desenvolvimento |
| `development` | DEV | 🧪 Desenvolvimento |
| `production` | PROD | 🚀 Produção |

## 📊 Bancos

- **DEV:** `cartola-manager-dev` (testes seguros)
- **PROD:** `cartola-manager` (dados reais)

## ✅ Status Atual (21/12/2025)

```
✅ 100% SINCRONIZADOS
   - 39 participantes idênticos
   - 38 caches sincronizados
   - 2 ligas com paridade completa
   - Todos até Rodada 38
```

## 📚 Documentação Completa

- **Estratégia 2026:** `docs/SINCRONISMO-DEV-PROD.md`
- **Relatório Executivo:** `DIAGNOSTICO-BANCOS-21-12-2025.md`
- **Regras do Projeto:** `CLAUDE.md` (seção "Sincronismo DEV/PROD")

## 🆘 Problemas?

1. Ver logs: `tail -f logs/server.log | grep -i mongo`
2. Verificar: `node scripts/sync-check-dev-prod.js`
3. Corrigir: `node scripts/fix-sync-dev-prod.js`

---
**Última atualização:** 21/12/2025  
**Próxima verificação:** Antes da Rodada 1 de 2026


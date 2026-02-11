# .agent/ - Cursor/Windsurf/Antigravity Support

Este diretório contém a estrutura compatível com **Cursor**, **Windsurf** e **Antigravity Kit**.

⚠️ **IMPORTANTE:** Este diretório é **GERADO AUTOMATICAMENTE** pelo script `scripts/sync-skills.js`.

## 📋 NÃO Edite Arquivos Aqui

Todas as skills devem ser editadas em `docs/skills/` (source of truth único).

Após editar em `docs/skills/`, rode:

```bash
node scripts/sync-skills.js
```

Isso regerará a estrutura `.agent/` automaticamente.

## 🏗️ Estrutura

```
.agent/
├── agents/          # Agentes especializados (skills mapeadas)
├── skills/          # Módulos de conhecimento (skills específicas)
├── workflows/       # Procedimentos (workflows core)
└── README.md        # Este arquivo
```

## 🔄 Como Funciona

1. **Source of Truth:** `docs/skills/` contém todas as skills em PT-BR
2. **Transformação:** `sync-skills.js` lê e transforma para formato Antigravity
3. **Output:** `.agent/` é gerado com estrutura compatível

## 🎯 Compatibilidade

- ✅ **Cursor** - Reconhece agents e workflows automaticamente
- ✅ **Windsurf** - Indexa `.agent/` para slash commands
- ✅ **Antigravity Kit** - Estrutura 100% compatível

## 📚 Documentação

Veja [docs/HYBRID-SYSTEM.md](../docs/HYBRID-SYSTEM.md) para detalhes completos da arquitetura híbrida.

---

**Status:** 🚧 Estrutura em construção

**Última sincronização:** Nunca (aguardando primeira execução de sync-skills.js)

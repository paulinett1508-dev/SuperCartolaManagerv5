# Tarefas Pendentes - 2025-12-16

## Prioridade ALTA

### 1. Implementar Sidebar Accordion no Admin
**Skill:** `frontend-crafter`

**Arquivo principal:** `public/layout.html`

**O que fazer:**
- [ ] Adicionar grupos accordion expandíveis
- [ ] Incluir links diretos para ferramentas (sem passar pelo hub)
- [ ] Persistir estado expandido/colapsado no localStorage

**Arquitetura proposta:**
```
├── Dashboard
├── Ligas (accordion)
│   ├── [Ligas dinâmicas]
│   ├── Criar Nova Liga
│   └── Gerenciar Todas
├── Rodadas (accordion)
│   ├── Popular Rodadas
│   └── Consolidação
├── Financeiro (accordion)
│   └── Renovações 2026
├── Configurações (accordion)
│   ├── Gerir Senhas
│   └── Módulos
└── Acessos (accordion)
    └── App Participante
```

**Comando para começar:**
```
Use a skill frontend-crafter para implementar o Sidebar Accordion
```

---

## Concluído Nesta Sessão (2025-12-16)

- [x] Separação de ambientes MongoDB (Prod/Dev)
- [x] Limpeza de 22 scripts obsoletos
- [x] Sistema de Temporadas (`config/seasons.js`)
- [x] Campo `temporada` em todos os models
- [x] Script de migração (`scripts/migrar-temporada-2025.js`)
- [x] Documentação (`docs/TEMPORADAS-GUIA.md`)

---

## Como Retomar

Na próxima sessão, execute:
```
/retomar-tarefas
```

Ou diga diretamente:
```
Implementar Sidebar Accordion usando skill frontend-crafter
```

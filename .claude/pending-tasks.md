# Tarefas Pendentes - 2025-12-16

## Skill Recomendada
**frontend-crafter** - Usar para implementação do Sidebar Accordion
```
Use a skill frontend-crafter para implementar o Sidebar Accordion conforme arquitetura proposta abaixo.
```

## Contexto
Diagnóstico completo do Sidebar Admin para planejar refatoração para "Sidebar Accordion" com subníveis e carregamento sob demanda.

## Tarefa Principal
Refatorar Menu Lateral (Sidebar) e Navegação do Admin para modelo Accordion

## Concluído (Diagnóstico)
- [x] Identificar arquivos HTML/JS do Sidebar Admin
- [x] Analisar lógica de navegação (redirect vs hide/show)
- [x] Mapear grupos de menu atuais
- [x] Sugerir arquitetura Sidebar Accordion

## Pendente (Implementação)
- [ ] Fase 1: Refatorar layout.html com grupos accordion
- [ ] Remover duplicação de código (layout.html vs sidebar-menu.js)
- [ ] Adicionar todos os links diretos no sidebar
- [ ] Fase 2: Simplificar hub ferramentas.html (opcional)
- [ ] Fase 3: Persistência de estado expandido/colapsado no localStorage

## Arquivos Chave
- `public/layout.html` - Template master do sidebar (principal)
- `public/js/core/sidebar-menu.js` - Script auxiliar (duplicado)
- `public/css/modules/dashboard-redesign.css` - Estilos

## Descobertas do Diagnóstico

### Navegação Atual
- Sistema MPA (Multi-Page Application) com redirect por URL
- NÃO usa hide/show de divs gigantes
- Sidebar injetado via `fetch("layout.html")`

### Problema Identificado
- Ferramentas escondidas atrás do hub `ferramentas.html`
- Sidebar minimalista (só Dashboard, Ligas, Ferramentas)
- Muitos cliques para acessar ferramentas úteis

### Arquitetura Proposta
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

## Próximos Passos
1. Implementar accordion no `layout.html` (usar `<details>/<summary>` ou JS toggle)
2. Testar em todas as páginas admin
3. Commitar alterações

## Comandos Úteis para Retomar
```bash
# Ver arquivos do sidebar
cat public/layout.html
cat public/js/core/sidebar-menu.js

# Testar servidor
npm run dev
```

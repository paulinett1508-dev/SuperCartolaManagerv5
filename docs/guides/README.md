# 📖 Guides - Guias, Tutoriais e POCs

Guias práticos, tutoriais, workflows e **Proofs of Concept (POCs)** do sistema.

---

## 📚 Tipos de Documentos

### 📘 Guias de Uso
Tutoriais práticos para usar funcionalidades do sistema.

| Documento | Descrição |
|-----------|-----------|
| **TEMPORADAS-GUIA.md** | Como trabalhar com múltiplas temporadas |
| **TEMPORADA-2026.md** | Especificidades da temporada 2026 |
| **TOKENS-GUIA.md** | Sistema de tokens e design tokens CSS |
| **GUIA-TESTES-ADMIN-MOBILE.md** | Como testar painel admin em mobile |

### 🔄 Workflows
Processos e fluxos de trabalho para desenvolvimento.

| Documento | Descrição |
|-----------|-----------|
| **WORKFLOW-CLAUDE-GITHUB-REPLIT.md** | Fluxo de trabalho Git + Replit + Claude |

### 🔬 POCs (Proofs of Concept)
Experimentos, pesquisas e validações técnicas.

| Documento | Descrição |
|-----------|-----------|
| **POC-README.md** | Índice de POCs realizadas |
| **RESEARCH-SHADCN-MCP.md** | Pesquisa sobre ShadCN com MCP |
| **SETUP-DAISYUI-POC.md** | Setup e testes com DaisyUI |

### ⚙️ Setup e Configuração
Documentos de configuração de ferramentas e integrações.

| Documento | Descrição |
|-----------|-----------|
| **CONTEXT7-MCP-SETUP.md** | Setup do Context7 MCP Server |

### 📋 Wizards e Checklists
Assistentes passo a passo para tarefas complexas.

| Documento | Descrição |
|-----------|-----------|
| **WIZARD-MODULOS-REVISAO.md** | Wizard de revisão de implementação de módulos |

---

## 🎯 Quando Usar Este Diretório

### Para Desenvolvedores
- Aprender a usar funcionalidades do sistema
- Entender workflows de desenvolvimento
- Configurar ferramentas e integrações
- Validar POCs antes de implementar

### Para IAs
- Entender contexto de uso do sistema
- Seguir workflows estabelecidos
- Validar abordagens com POCs existentes

### Para Gestores
- Entender processos de desenvolvimento
- Avaliar resultados de POCs
- Planejar adoção de novas tecnologias

---

## 📖 Leitura Recomendada por Contexto

### "Vou trabalhar com temporadas"
1. `TEMPORADAS-GUIA.md` - Conceitos gerais
2. `TEMPORADA-2026.md` - Específico da temporada atual
3. `/docs/architecture/SISTEMA-RENOVACAO-TEMPORADA.md` - Arquitetura

### "Preciso configurar ambiente de desenvolvimento"
1. `WORKFLOW-CLAUDE-GITHUB-REPLIT.md` - Fluxo Git
2. `CONTEXT7-MCP-SETUP.md` - Setup de MCPs
3. `/CLAUDE.md` - Regras do projeto

### "Quero implementar nova biblioteca de UI"
1. `SETUP-DAISYUI-POC.md` - Exemplo de POC de UI lib
2. `RESEARCH-SHADCN-MCP.md` - Pesquisa sobre ShadCN
3. `POC-README.md` - Template de POC

### "Vou testar no mobile"
1. `GUIA-TESTES-ADMIN-MOBILE.md` - Processo de testes
2. `/docs/architecture/VERSIONAMENTO-SISTEMA.md` - Sistema de versões

---

## 🔬 Processo de POC

### 1. Criar POC
```bash
# Criar documento
vim docs/guides/POC-{nome-tecnologia}.md

# Template:
# - Objetivo
# - Setup
# - Experimentos
# - Resultados
# - Decisão (Adotar / Não Adotar / Revisitar)
```

### 2. Executar Experimentos
Documente **tudo**:
- Comandos executados
- Problemas encontrados
- Soluções aplicadas
- Métricas coletadas

### 3. Decidir
- ✅ **Adotar:** Mover para implementação
- ❌ **Não Adotar:** Documentar motivos
- ⏸️ **Revisitar:** Agendar nova avaliação

### 4. Atualizar POC-README
Adicionar ao índice de POCs com resultado.

---

## 🔄 Manutenção

### Adicionar novo guia
```bash
vim docs/guides/GUIA-{nome}.md
# Atualizar este README
```

### Criar nova POC
```bash
vim docs/guides/POC-{tecnologia}.md
# Seguir template padrão
# Atualizar POC-README.md
```

### Arquivar guia desatualizado
```bash
mv docs/guides/OLD-GUIA.md docs/archives/2026/guides/
```

---

## 📚 Recursos Relacionados

- **Architecture:** `/docs/architecture/` - Contexto técnico
- **Skills:** `/docs/skills/` - Agentes especializados
- **Specs:** `/docs/specs/` - Implementações detalhadas
- **Rules:** `/docs/rules/` - Regras configuráveis

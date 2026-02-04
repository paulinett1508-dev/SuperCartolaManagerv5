# 🏗️ Architecture - Documentação Técnica do Sistema

Documentos técnicos de **arquitetura**, **design** e **decisões técnicas** do Super Cartola Manager.

---

## 📋 Documentos Principais

### Sistema de Módulos
| Documento | Descrição |
|-----------|-----------|
| **ARQUITETURA-MODULOS.md** | Sistema de módulos opcionais SaaS, registro e lifecycle |
| **modules-registry.json** | Registro central de todos os módulos do sistema |

### Integração Externa
| Documento | Descrição |
|-----------|-----------|
| **API-CARTOLA-ESTADOS.md** | Estados da API Cartola FC (Mercado, Rodadas, Parciais) |
| **ARQUITETURA-SINCRONIZACAO-MERCADO.md** | Sincronização de dados com API oficial |
| **JOGOS-DO-DIA-API.md** | Sistema multi-fallback para jogos ao vivo (API-Football → Globo) |

### Lógica de Negócio
| Documento | Descrição |
|-----------|-----------|
| **SISTEMA-RENOVACAO-TEMPORADA.md** | Lógica de renovação anual, inscrições e finanças |
| **live_experience_2026.md** | Experiência de parciais ao vivo, regras e UX |

### Sistema
| Documento | Descrição |
|-----------|-----------|
| **VERSIONAMENTO-SISTEMA.md** | Gestão de versões do app, force-update |
| **SINCRONISMO-DEV-PROD.md** | Estratégia de deploy e sincronização |

---

## 🎯 Quando Usar Este Diretório

### Para Desenvolvedores
- Entender decisões arquiteturais
- Implementar novos módulos
- Integrar com APIs externas
- Entender sistema de versionamento

### Para IAs
- Contexto técnico antes de implementar
- Validar conformidade arquitetural
- Gerar auditorias técnicas
- Criar novos módulos

### Para Gestores
- Entender capacidades do sistema
- Avaliar impacto de mudanças
- Planejar roadmap técnico

---

## 📖 Leitura Recomendada por Contexto

### "Quero criar um novo módulo"
1. `ARQUITETURA-MODULOS.md` - Entender estrutura
2. `modules-registry.json` - Ver módulos existentes
3. `/docs/skills/04-project-specific/module-auditor.md` - Skill de auditoria

### "Preciso integrar com Cartola FC"
1. `API-CARTOLA-ESTADOS.md` - Estados possíveis
2. `ARQUITETURA-SINCRONIZACAO-MERCADO.md` - Como sincronizar
3. `/docs/skills/04-project-specific/cartola-api.md` - Base de conhecimento

### "Vou implementar renovação de temporada"
1. `SISTEMA-RENOVACAO-TEMPORADA.md` - Lógica completa
2. `API-CARTOLA-ESTADOS.md` - Detecção de pré-temporada
3. `/docs/rules/` - Regras configuráveis

### "Quero entender parciais ao vivo"
1. `live_experience_2026.md` - Experiência completa
2. `JOGOS-DO-DIA-API.md` - Fonte dos dados
3. `API-CARTOLA-ESTADOS.md` - Estados de rodada

---

## 🔄 Manutenção

### Adicionar novo documento
```bash
# Criar documento em docs/architecture/
vim docs/architecture/NOVO-SISTEMA.md

# Atualizar este README
vim docs/architecture/README.md
```

### Atualizar documento existente
Edite diretamente o arquivo `.md` correspondente.

### Arquivar documento desatualizado
```bash
mv docs/architecture/OLD.md docs/archives/2026/architecture/
```

---

## 📚 Recursos Relacionados

- **Skills:** `/docs/skills/` - Agentes especializados
- **Specs:** `/docs/specs/` - PRDs e implementações
- **Rules:** `/docs/rules/` - Regras de negócio configuráveis
- **Guides:** `/docs/guides/` - Tutoriais práticos

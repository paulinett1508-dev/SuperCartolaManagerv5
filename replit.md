# Super Cartola Manager - Sistema de Gerenciamento de Ligas

## Visão Geral do Projeto
**Super Cartola Manager** é um sistema completo de gerenciamento de ligas internas do Cartola FC (fantasy game de futebol brasileiro). O sistema integra dados de APIs públicas do Cartola FC, processa informações de participantes, rodadas, rankings e disputas, armazenando tudo em MongoDB.

## Status do Sistema
- **Ambiente**: Produção ativa com domínio próprio
- **Banco de Dados**: MongoDB (Neon) - 2 ligas cadastradas com dados reais
- **Versão**: 1.0.1
- **Estado**: Sistema funcional em produção

## Arquitetura do Sistema

### Dois Modos de Operação

#### 1. Modo Admin (100% Funcional - Desktop)
- **Visão**: Desktop/Tela grande
- **Função**: Gerenciar ligas, integrar dados de APIs, alimentar rodadas
- **Módulos Funcionais**:
  - ✅ Gerenciamento de Ligas
  - ✅ Pontos Corridos
  - ✅ Mata-Mata
  - ✅ Artilheiro e Campeão
  - ✅ Luva de Ouro
  - ✅ Fluxo Financeiro
  - ✅ Ranking Geral
  - ✅ Top 10
  - ✅ Melhor do Mês
  - ✅ Rodadas
  - ✅ Exportação de Relatórios
  - ✅ Integração com APIs do Cartola FC

#### 2. Modo Participante (Funcional parcialmente - Mobile First)
- **Visão**: Mobile (90% dos usuários)
- **Função**: Visualização de dados por participante autenticado
- **Status Atual**:
  - ✅ Autenticação funcionando
  - ✅ Extrato Financeiro funcionando
  - ⚠️ Outros módulos: interface funciona, mas navegabilidade ruim
  - ⚠️ UX precisa de melhorias para mobile

### Stack Tecnológico
- **Backend**: Node.js + Express (ES Modules)
- **Database**: MongoDB + Mongoose
- **Frontend**: HTML5 + CSS3 + JavaScript Vanilla (Modular)
- **Cache**: NodeCache para performance
- **Autenticação**: Express Session
- **APIs Externas**: Cartola FC (APIs públicas)

## Estrutura de Diretórios

```
├── config/                  # Configuração do banco
├── controllers/             # Lógica de negócio
├── middleware/              # Autenticação e controle de acesso
├── models/                  # Schemas Mongoose
├── routes/                  # Rotas da API
├── public/                  # Frontend
│   ├── css/                # Estilos (base + módulos)
│   ├── js/                 # JavaScript modular
│   │   ├── core/          # Sistema central
│   │   ├── exports/       # Exportação de relatórios
│   │   ├── [módulos]/     # Cada módulo tem sua pasta
│   ├── participante/      # Modo participante
│   │   ├── css/          
│   │   ├── js/modules/   # Módulos do participante
│   │   └── fronts/       # HTMLs dos módulos
│   ├── fronts/           # HTMLs dos módulos admin
│   └── templates/        # Templates reutilizáveis
└── backups/               # Backups do banco
```

## Módulos do Sistema

### Módulos Admin (Todos Funcionais)
1. **Gerenciamento de Ligas** - CRUD completo
2. **Pontos Corridos** - Classificação por pontos
3. **Mata-Mata** - Eliminatórias
4. **Artilheiro e Campeão** - Ranking de gols
5. **Luva de Ouro** - Ranking de goleiros
6. **Fluxo Financeiro** - Controle financeiro persistente
7. **Ranking Geral** - Classificação geral
8. **Top 10** - Melhores da rodada
9. **Melhor do Mês** - Destaques mensais
10. **Rodadas** - Gestão de rodadas
11. **Exportação** - Relatórios em diversos formatos

### Módulos Participante (Status Atual)
1. **Extrato Financeiro** - ✅ Funcionando
2. **Ranking** - ⚠️ Interface OK, navegação ruim
3. **Rodadas** - ⚠️ Interface OK, navegação ruim
4. **Top 10** - ⚠️ Interface OK, navegação ruim
5. **Melhor do Mês** - ⚠️ Interface OK, navegação ruim
6. **Pontos Corridos** - ⚠️ Interface OK, navegação ruim
7. **Mata-Mata** - ⚠️ Interface OK, navegação ruim
8. **Artilheiro** - ⚠️ Interface OK, navegação ruim
9. **Luva de Ouro** - ⚠️ Interface OK, navegação ruim

## Autenticação

### Admin
- Sem autenticação específica (rotas livres)
- Acesso direto via URLs admin

### Participante
- Autenticação por sessão (Express Session)
- Login: timeId + senha
- Middleware de proteção de rotas
- Cache de sessão no frontend (1 minuto)

## Integrações

### APIs do Cartola FC
- Busca de clubes
- Dados de times
- Informações de rodadas
- Rankings e estatísticas

### Banco de Dados (MongoDB)
**Collections Principais:**
- `ligas` - Dados das ligas e participantes
- `times` - Times dos participantes
- `rodadas` - Dados por rodada
- `artilheirocampeaos` - Ranking de gols
- `goleiros` - Dados de goleiros
- `gols` - Registro de gols
- `extratofinanceirocaches` - Cache de extratos

## Performance e Otimização
- NodeCache para cache em memória
- Connection pooling (50 max, 10 min)
- Índices otimizados no MongoDB
- Logs otimizados por ambiente
- Cache de sessão no frontend

## Próximos Passos (Planejados)

### Reestruturação do Modo Participante
**Objetivo**: Melhorar UX mobile e ativar todos os módulos

**Prioridades**:
1. Manter modo admin 100% intacto
2. Refatorar modo participante para mobile-first
3. Ativar todos os módulos do participante
4. Melhorar navegabilidade
5. Otimizar performance mobile
6. Garantir compatibilidade com dados existentes

**Cuidados Críticos**:
- ⚠️ NÃO quebrar código do modo admin
- ⚠️ NÃO alterar estrutura do banco
- ⚠️ NÃO perder dados das 2 ligas
- ⚠️ Testar cada mudança isoladamente
- ⚠️ Manter compatibilidade de APIs

## Dados Importantes
- 2 ligas ativas em produção
- Dados históricos de rodadas
- Informações financeiras dos participantes
- Rankings e estatísticas acumuladas

## Ambiente de Desenvolvimento
- Node.js >= 16.0.0
- MongoDB URI em variável de ambiente
- Porta padrão: 5000
- Scripts:
  - `npm run dev` - Desenvolvimento com nodemon
  - `npm start` - Produção

## Notas de Desenvolvimento
- Sistema usa ES Modules (type: "module")
- Código modular e organizado por funcionalidade
- Separação clara entre admin e participante
- Cache inteligente para performance
- Logs detalhados em desenvolvimento

## Última Atualização
- Data: 20 de novembro de 2025
- Versão: 1.0.1
- Status: Produção estável

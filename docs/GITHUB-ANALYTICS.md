# GitHub Analytics - Integração com GitHub API

## 📋 Visão Geral

Sistema completo de analytics integrado ao painel administrativo que permite visualizar e gerenciar Pull Requests, branches remotas e status de sincronização do repositório GitHub.

## 🎯 Funcionalidades

### 1. **Pull Requests**
- Lista PRs abertas, fechadas e mergeadas
- Filtros por estado (open, closed, all)
- Filtros por período (hoje, ontem, semana, mês, data específica)
- Visualização de: número, título, estado, branch, autor, data
- Link direto para PR no GitHub

### 2. **Branches Remotas**
- Lista branches do repositório remoto
- Identifica branches mergeadas vs ativas
- Informações de criação e autor
- Filtro para ocultar branches já mergeadas

### 3. **Status de Sincronização**
- Verifica sincronização local vs remoto (git fetch)
- Identifica commits atrás/à frente
- Detecta branches divergentes
- Sincronização manual via git pull (botão)

## 🏗️ Arquitetura

### Backend (Node.js + Express)

**Arquivo:** `routes/github-analytics-routes.js`

#### Endpoints Disponíveis

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/api/github/status` | Status geral da integração | ✅ Admin |
| GET | `/api/github/prs` | Lista Pull Requests | ✅ Admin |
| GET | `/api/github/branches` | Lista branches remotas | ✅ Admin |
| GET | `/api/github/sync-status` | Status sincronização | ✅ Admin |
| POST | `/api/github/sync-trigger` | Sincronização manual | ✅ Admin |

#### Query Parameters

**`/api/github/prs`:**
- `state`: `open` | `closed` | `all` (default: `all`)
- `limit`: número máximo de PRs (default: `50`)
- `periodo`: `hoje` | `ontem` | `semana` | `mes` | `YYYY-MM-DD`

**`/api/github/branches`:**
- `incluirMergeadas`: `true` | `false` (default: `false`)
- `limit`: número máximo de branches (default: `50`)

#### Cache Strategy

- **TTL:** 2 minutos para todos os endpoints GET
- **Invalidação:** POST `/sync-trigger` limpa cache automaticamente
- **Storage:** Memória (variável no módulo de rotas)

### Frontend (Vanilla JS)

**Arquivo:** `public/github-analytics.html`

#### Estrutura Visual

1. **Stats Row** (Cards superiores):
   - PRs Abertas (ícone roxo)
   - Branches Ativas (ícone verde)
   - Sync Status (ícone azul)
   - Repositório Info (ícone laranja)

2. **Seção Pull Requests**:
   - Tabela responsiva com PRs recentes
   - Badge visual para estado (aberta/mergeada/fechada)
   - Avatar do autor
   - Link para GitHub

3. **Seção Branches**:
   - Lista de branches remotas
   - Badge de status (ativa/mergeada)
   - Data de criação e autor

4. **Seção Sincronização**:
   - Status da branch atual
   - Resumo geral (sincronizadas/atrasadas/à frente)
   - Lista detalhada de todas as branches locais
   - Botão para sincronizar manualmente

#### Auto-refresh

- Atualização automática a cada 2 minutos
- Pode ser desabilitado/modificado no código (linha do `setInterval`)

## 🔐 Configuração

### 1. GITHUB_TOKEN (Opcional mas Recomendado)

Para acessar a API do GitHub sem rate limiting e visualizar PRs, configure:

```bash
# No Replit: Secrets
GITHUB_TOKEN=ghp_SEU_TOKEN_AQUI

# Localmente: .env
GITHUB_TOKEN=ghp_SEU_TOKEN_AQUI
```

**Como obter o token:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Escopos necessários:
   - `repo` (acesso total a repositórios privados)
   - `public_repo` (se apenas repositórios públicos)

**Sem token:**
- Endpoints de branches e sync funcionam normalmente (usam git local)
- Endpoint de PRs retorna erro `requiresToken: true`
- Interface exibe alerta vermelho no topo

### 2. Permissões

Todos os endpoints requerem autenticação de admin (`verificarAdmin` middleware).

## 🎨 Design System

### Paleta de Cores

| Elemento | Cor | Uso |
|----------|-----|-----|
| **Background** | `#121212` | Página principal |
| **Cards** | `#1a1a1a` | Fundo de cards |
| **Borders** | `#2d2d2d` | Bordas sutis |
| **Primary (GitHub)** | `#6e5494` | Ícones principais, gradientes |
| **Success** | `#10b981` | PRs abertas, sincronizado |
| **Warning** | `#f59e0b` | Branches atrasadas |
| **Error** | `#ef4444` | PRs fechadas, divergente |
| **Info** | `#3b82f6` | Branches à frente |

### Ícones (Material Icons)

| Função | Ícone | Código |
|--------|-------|--------|
| GitHub | 🔷 | `code` |
| Pull Request | 🔀 | `merge_type` |
| Branch | 🌳 | `account_tree` |
| Sync | 🔄 | `sync` |
| Check | ✅ | `check_circle` |
| Warning | ⚠️ | `warning` |
| Flecha baixo | ⬇️ | `arrow_downward` |
| Flecha cima | ⬆️ | `arrow_upward` |

## 📱 Navegação

### Sidebar

**Localização:** Analytics → GitHub

```html
<li>
    <a href="github-analytics.html" class="sidebar-accordion-item">
        <span class="material-icons">code</span>
        <span>GitHub</span>
    </a>
</li>
```

### Ferramentas

**Card em ferramentas.html:**

```html
<div class="tool-card" onclick="window.location.href='github-analytics.html'">
    <h3>GitHub Analytics</h3>
    <p>Visualize Pull Requests, branches remotas e status de sincronização...</p>
</div>
```

## 🧪 Testes

### Teste Manual via Navegador

1. **Iniciar servidor:**
   ```bash
   npm start
   # ou
   node index.js
   ```

2. **Acessar painel admin:**
   ```
   http://localhost:3000/painel.html
   ```

3. **Navegação:**
   - Sidebar → Analytics → GitHub
   - OU Ferramentas → GitHub Analytics

### Teste via cURL

```bash
# 1. Status geral
curl http://localhost:3000/api/github/status

# 2. Pull Requests (todas)
curl http://localhost:3000/api/github/prs

# 3. PRs abertas da última semana
curl "http://localhost:3000/api/github/prs?state=open&periodo=semana"

# 4. Branches ativas (sem mergeadas)
curl http://localhost:3000/api/github/branches

# 5. Sync status
curl http://localhost:3000/api/github/sync-status

# 6. Sincronizar manualmente (POST)
curl -X POST http://localhost:3000/api/github/sync-trigger
```

**⚠️ Nota:** Endpoints requerem sessão de admin. Para testar via cURL, inclua cookies de sessão.

## 🔧 Manutenção

### Alterar TTL do Cache

**Arquivo:** `routes/github-analytics-routes.js`

```javascript
const cache = {
    prs: { data: null, timestamp: 0, ttl: 120000 }, // 2 minutos
    branches: { data: null, timestamp: 0, ttl: 120000 },
    sync: { data: null, timestamp: 0, ttl: 120000 }
};

// Altere ttl para o valor desejado em milissegundos
// Ex: 300000 = 5 minutos
```

### Alterar Auto-refresh da Interface

**Arquivo:** `public/github-analytics.html`

```javascript
// Auto-refresh a cada 2 minutos
setInterval(() => {
    carregarPRs();
    carregarBranches();
    carregarSyncStatus();
}, 120000); // Altere este valor (em ms)
```

### Adicionar Novos Filtros

Para adicionar filtros de PRs (ex: por autor):

1. **Backend** (`routes/github-analytics-routes.js`):
   ```javascript
   // Linha ~170, após filtro por período
   if (req.query.author) {
       prsFiltered = prsFiltered.filter(pr =>
           pr.user.login === req.query.author
       );
   }
   ```

2. **Frontend** (`public/github-analytics.html`):
   ```javascript
   // Adicionar input/select de filtro
   const author = document.getElementById('authorFilter').value;
   const data = await fetchAPI(`/api/github/prs?author=${author}`);
   ```

## 🐛 Troubleshooting

### Problema: "GITHUB_TOKEN não configurado"

**Sintoma:** Interface exibe alerta vermelho, PRs não carregam.

**Solução:**
1. Configure `GITHUB_TOKEN` nas variáveis de ambiente
2. Reinicie o servidor
3. Limpe o cache do navegador (F5 hard refresh)

### Problema: "Erro ao carregar PRs"

**Possíveis causas:**
1. Rate limit da API GitHub atingido (sem token: 60 req/hora)
2. Token expirado ou sem permissões
3. Repositório privado sem escopo `repo`

**Solução:**
1. Verifique logs do servidor (`console.error`)
2. Teste manualmente: `curl -H "Authorization: token SEU_TOKEN" https://api.github.com/user`
3. Gere novo token com escopos corretos

### Problema: "Branches não aparecem"

**Causa:** Git local sem referências remotas atualizadas.

**Solução:**
```bash
git fetch origin
# Ou use o botão "Atualizar" na interface
```

### Problema: "Sincronização falha"

**Sintoma:** POST `/sync-trigger` retorna erro.

**Causa:** Mudanças locais não commitadas.

**Solução:**
```bash
# Opção 1: Commit mudanças
git add .
git commit -m "..."

# Opção 2: Stash mudanças
git stash

# Depois sincronize
```

## 📊 Dependências

### Packages Node.js

- `express` - Framework web
- `child_process` (built-in) - Executar comandos git
- `https` (built-in) - Requisições à API GitHub

### Dependências Frontend

- **Material Icons** (CDN)
- **Inter + Russo One** fonts (Google Fonts)
- Nenhuma biblioteca JS externa (Vanilla JS)

## 🚀 Roadmap

### Features Planejadas

- [ ] Webhooks GitHub para invalidação de cache em tempo real
- [ ] Gráfico de commits por autor (Chart.js)
- [ ] Histórico de PRs mergeadas (últimos 30 dias)
- [ ] Notificações push quando PR está pronto para merge
- [ ] Integração com GitHub Actions (status de CI/CD)
- [ ] Comentários inline de PRs
- [ ] Aprovações de revisores

### Melhorias UX

- [ ] Skeleton loading durante fetch
- [ ] Animações de transição suaves
- [ ] Dark mode toggle (atualmente apenas dark)
- [ ] Exportar relatórios em PDF/CSV

## 📝 Changelog

### v1.0.0 (2026-02-12)

**Criação inicial**
- ✅ Backend completo com 5 endpoints
- ✅ Interface visual responsiva
- ✅ Cache de 2 minutos
- ✅ Integração sidebar + ferramentas
- ✅ Suporte a funcionamento sem token
- ✅ Documentação completa

## 🤝 Contribuindo

Ao adicionar funcionalidades:

1. **Backend:** Adicione endpoint em `routes/github-analytics-routes.js`
2. **Frontend:** Adicione função em `public/github-analytics.html`
3. **Documentação:** Atualize este arquivo
4. **Testes:** Teste manualmente antes de commit

## 📄 Licença

Este módulo segue a licença do projeto Super Cartola Manager.

---

**Desenvolvido com ❤️ usando Claude Code Web**

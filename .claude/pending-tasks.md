# Tarefas Pendentes

## 🔴 PRIORIDADE ALTA

### [REFACTOR-001] Decomposição fluxo-financeiro-ui.js (7.010 → 4.426 linhas)

**Objetivo:** Reduzir o monolito de 7.010 linhas para módulos menores e manuteníveis.

**Status Atual:** ✅ FASE 2 CONCLUÍDA - PDF/Auditoria Extraído

| Fase | Status | Descrição |
|------|--------|-----------|
| 1. Análise | ✅ Concluído | Inventário de 50+ funções, 5 responsabilidades |
| 2. CSS Extract | ✅ Concluído | `fluxo-financeiro-styles.js` criado (1.831 linhas) |
| 3. PDF Extract | ✅ Concluído | `fluxo-financeiro-pdf.js` criado (830 linhas) |
| 4. Validação | ✅ Concluído | Testado - servidor inicia, módulos carregam |

**Resultado Final (22/01/2026):**
- ✅ CRIADO: `public/js/fluxo-financeiro/fluxo-financeiro-styles.js` (1.831 linhas)
- ✅ CRIADO: `public/js/fluxo-financeiro/fluxo-financeiro-pdf.js` (830 linhas)
- ✅ MODIFICADO: `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` (7.019 → 4.426 linhas, **-37%**)

**Funções extraídas (Fase 2 - PDF/Auditoria):**
- `exportarExtratoPDF()` - Exportação de extrato para PDF multi-página
- `abrirAuditoriaFinanceira()` - Modal de auditoria financeira
- `renderizarConteudoAuditoria()` - Renderização do conteúdo
- `fecharModalAuditoria()` - Fechar modal
- `exportarAuditoriaPDF()` - Exportar auditoria para PDF
- `gerarPDFAuditoria()` - Geração do PDF
- `inicializarPDF()` - Registro de funções globais no window

**Commits:**
- `fb226ba refactor(p3): extract PDF/Auditoria module, add .lean() to queries`

**Próximos passos (opcional):**
1. 📋 Extrair módulo de Ajustes Dinâmicos (~300 linhas)
2. 📋 Extrair módulo de Tabela Expandida (~400 linhas)
3. 📋 Meta: reduzir para <3.000 linhas

**Rollback:** `git checkout HEAD~1 -- public/js/fluxo-financeiro/fluxo-financeiro-ui.js`

---

### [FEAT-024] Integração OAuth Cartola PRO

**Objetivo:** Permitir que usuário PRO escale automaticamente no Cartola FC através do Super Cartola Manager.

**Status Atual:** ⏸️ ADIADO - Será implementado em momento futuro

> **⚠️ OBSERVAÇÃO (22/01/2026):** Feature adiada por decisão de priorização. Como se trata de funcionalidade focada exclusivamente em participantes premium, existem outras prioridades mais urgentes tanto no app do participante quanto na versão admin. Retomar quando as features core estiverem consolidadas.

| Fase | Status | Arquivo |
|------|--------|---------|
| 1. Pesquisa | ✅ Concluído | `.claude/docs/PRD-cartola-pro.md` |
| 2. Spec | ✅ Concluído | `.claude/docs/SPEC-cartola-pro.md` |
| 3. Code | 🟡 PARCIAL | Implementado, auth Google OAuth não funciona |
| 4. Pesquisa v2 | ✅ Concluído | Perplexity MCP (21/01/2026) |

---

### 🟢 NOVA ABORDAGEM IMPLEMENTADA (22/01/2026)

**Solução: OAuth via Popup Cross-Domain**

O OAuth da Globo só funciona em domínios Replit (`*.replit.dev`). Para domínios customizados (`supercartolamanager.com.br`), implementamos um fluxo via popup:

```
[supercartolamanager.com.br]              [*.replit.dev]
         │                                      │
         │ 1. Clica "Entrar com Globo"          │
         │ ─────────────────────────────────────>│
         │    (abre popup)                       │
         │                                      │
         │                             2. OAuth Globo
         │                                      │
         │ 3. Recebe glbToken via postMessage   │
         │ <────────────────────────────────────│
         │                                      │
         │ 4. POST /globo/create-session        │
         │    (cria sessão LOCAL)               │
         └──────────────────────────────────────┘
```

**Arquivos modificados:**
- `routes/participante-auth.js` - +3 novas rotas
- `public/participante-login.html` - +JS para popup OAuth

**Novas rotas:**
| Rota | Função |
|------|--------|
| `GET /globo/popup` | Inicia OAuth em popup |
| `GET /globo/popup/callback` | Callback que envia token via postMessage |
| `POST /globo/create-session` | Cria sessão local a partir do glbToken |

---

### 🧪 TESTES PENDENTES (22/01/2026)

**Ambiente de teste:** `supercartolamanager.com.br`

| # | Teste | Passos | Esperado | Status |
|---|-------|--------|----------|--------|
| 1 | Detecção de assinante | Digitar ID de time assinante no login | Seção "Entrar com Globo" aparece | ⏳ |
| 2 | Abrir popup | Clicar "Entrar com Conta Globo" | Popup abre no domínio Replit | ⏳ |
| 3 | OAuth Globo | Fazer login na conta Globo no popup | Tela de sucesso aparece | ⏳ |
| 4 | postMessage | Popup fecha automaticamente | Token enviado para janela pai | ⏳ |
| 5 | Criar sessão | Token recebido | POST /create-session funciona | ⏳ |
| 6 | Redirecionamento | Sessão criada | Usuário vai para /participante/ | ⏳ |
| 7 | Funcionalidades PRO | Acessar aba Cartola PRO | Escalação funciona com glbToken | ⏳ |

**Casos de erro a testar:**
| # | Cenário | Esperado |
|---|---------|----------|
| E1 | Popup bloqueado | Mensagem "Permita popups" |
| E2 | Usuário fecha popup | Loading some, sem erro |
| E3 | Conta não é assinante | Erro "não é assinante PRO" |
| E4 | Time não está em liga | Erro "não encontrado em liga" |
| E5 | Token expirado | Erro "token inválido" |

**Comando para testar localmente:**
```bash
# Iniciar servidor
npm start

# Acessar em navegador diferente do Replit
# (simular domínio customizado)
```

---

### 🔴 BLOQUEIO ANTERIOR (21/01/2026) - RESOLVIDO

**Tentativas anteriores que falharam:**

| Método | Ambiente | Resultado | Erro |
|--------|----------|-----------|------|
| OAuth OIDC redirect | Replit Dev | ❌ Falhou | `invalid_request` - redirect_uri não autorizado |
| Login direto (email/senha) | Replit Dev | ❌ Falhou | HTTP 406 - Conta vinculada ao Google |
| Login direto (email/senha) | Produção (supercartolamanager.com.br) | ❌ Falhou | HTTP 401 - Sessão não encontrada |

**Problemas identificados (resolvidos com nova abordagem):**

1. ~~**OAuth redirect_uri:** O client_id só aceita redirect_uri de domínios oficiais~~ → Resolvido com popup no Replit
2. **Login direto com conta Google:** Contas Globo criadas via Google OAuth não têm senha direta (erro 406) → Ainda não suportado
3. ~~**Sessão em produção:** Sessão não reconhecida~~ → Resolvido criando sessão local com glbToken

**Arquivos criados/modificados:**
- `config/globo-oauth.js` - Configuração OIDC Globo (criado)
- `routes/cartola-pro-routes.js` - Rotas OAuth + auth direto (modificado)
- `services/cartolaProService.js` - Serviço com `autenticar()`, `gerarTimeSugerido()`, `buscarMeuTime()` (modificado)
- `public/participante/js/modules/participante-cartola-pro.js` v2.0 - Interface com 4 abas (refatorado)
- `public/participante/js/modules/participante-boas-vindas.js` v11.1 - Botão PRO adicionado (modificado)
- `public/participante/js/modules/participante-dicas.js` v1.1 - Seção PRO removida (modificado)

---

### 📋 PESQUISA REALIZADA (21/01/2026 - Perplexity MCP)

**Status:** ✅ Pesquisa concluída - Problema IDENTIFICADO

---

#### 🔍 DESCOBERTA CRÍTICA: Contas Google OAuth

**O problema identificado:**
- Contas Globo criadas via Google OAuth **NÃO TÊM SENHA DIRETA**
- O endpoint `login.globo.com/api/authentication` **retorna 406** para essas contas
- **NÃO EXISTE** forma programática de autenticar contas Google OAuth sem WebView interativo

**Evidência encontrada (TabNews - mesmo problema):**
> "Já consigo capturar GLBID, glb_uid_jwt e GLOBO_ID nos cookies. Mas qualquer chamada à API (/auth/time) retorna 401 Usuário não autorizado."

**Apps que funcionam (Guru do Cartola, Cartomante, Parciais CFC):**
- Usam **WebView nativo** (Capacitor/Cordova plugin)
- Capturam cookies **durante** o redirect OIDC
- Precisam de combinação específica de cookies + headers

---

#### 🏗️ ARQUITETURA DE AUTENTICAÇÃO GLOBO (2025/2026)

| Sistema | Endpoint | Uso | Status |
|---------|----------|-----|--------|
| **Legacy** | `login.globo.com/api/authentication` | Contas com senha direta | ✅ Funciona |
| **OIDC** | `authx.globoid.globo.com` | Contas Google/Facebook | ⚠️ Requer WebView |

**Fluxo OIDC completo:**
```
[1] User → authx.globoid.globo.com/oauth/authorize
[2] → goidc.globo.com (login interface)
[3] → Google OAuth (se conta Google)
[4] → Callback com cookies (GLBID, GLOBO_ID, glb_uid_jwt)
[5] → /auth/time com cookies + X-GLB-Token header
```

---

#### 📦 BIBLIOTECAS CONFIRMADAS FUNCIONANDO

| Projeto | Linguagem | Autenticação | Link |
|---------|-----------|--------------|------|
| **Python-CartolaFC** | Python 3.8-3.10 | Email/senha direto | [vicenteneto/python-cartolafc](https://github.com/vicenteneto/python-cartolafc) |
| **CartolaJS** | Node.js | GLBID manual | [0xVasconcelos/CartolaJS](https://github.com/0xVasconcelos/CartolaJS) |
| **cartola-api** | PHP | Proxy CORS + GLBID | [renatorib/cartola-api](https://github.com/renatorib/cartola-api) |

**Código de autenticação confirmado (Python-CartolaFC):**
```python
self._auth_url = 'https://login.globo.com/api/authentication'
response = requests.post(self._auth_url,
    json=dict(payload=dict(
        email=self._email,
        password=self._password,
        serviceId=4728  # ID do Cartola FC
    ))
)
self._glb_id = response.json()['glbId']  # Token de 215 caracteres
```

---

#### 🎯 ENDPOINTS CONFIRMADOS (2025/2026)

**Públicos (sem auth):**
- `GET /mercado/status` - Status do mercado
- `GET /atletas/mercado` - Todos jogadores disponíveis
- `GET /atletas/pontuados` - Pontuação parcial
- `GET /time/id/{id}` - Info de qualquer time
- `GET /clubes` - Lista de clubes

**Autenticados (requer X-GLB-Token):**
- `GET /auth/time` - Meu time atual
- `GET /auth/ligas` - Minhas ligas
- `POST /auth/time/salvar` - Salvar escalação

**Formato do POST /auth/time/salvar:**
```json
{
  "esquema": 3,
  "atleta": [37788, 71116, ...]
}
```

---

#### ✅ PRÓXIMOS PASSOS DEFINIDOS

**Opção A: Conta com Senha Direta (Recomendado)**
1. Testar com participante que tem conta Globo com senha direta
2. Se funcionar → Documentar que Google OAuth não suportado
3. Adicionar mensagem no app para usuários criarem senha no Globo

**Opção B: WebView (Complexo)**
1. Implementar popup/modal com WebView para login
2. Capturar cookies após redirect
3. Usar cookies no backend
4. **Problema:** Requer plugin nativo no app mobile

**Opção C: Funcionalidade Reduzida**
1. Manter apenas endpoints públicos
2. Remover feature de "Escalar Time"
3. Focar em sugestões e análises

---

#### 🔗 REFERÊNCIAS DA PESQUISA

- [TabNews - Mesmo problema de 401](https://www.tabnews.com.br/juniorandrade88/345421e4-1e40-4c5d-b12f-a27ff021d881)
- [Workana - Job de implementação](https://www.workana.com/job/implementar-login-autenticado-do-cartola-fc-em-app-capacitor-firebase)
- [ChoraAPI - Lista de endpoints](https://choraapi.com.br/blog/api-cartola-fc/)
- [PyPI - Python-CartolaFC](https://pypi.org/project/Python-CartolaFC/)

---

**Pesquisa já realizada (20/01/2026):**

1. **Endpoint de Autenticação:**
   ```
   POST https://login.globo.com/api/authentication
   Headers: Content-Type: application/json
   Body: {
     "payload": {
       "email": "usuario@email.com",
       "password": "senha123",
       "serviceId": 4728
     }
   }
   Retorna: { "glbId": "token_215_caracteres..." }
   ```

2. **Endpoint para Salvar Escalação:**
   ```
   POST https://api.cartolafc.globo.com/auth/time/salvar
   Headers:
     X-GLB-Token: [glbId]
     Content-Type: application/json
   Body: {
     "esquema": 3,  // ID da formação (4-3-3, etc)
     "atleta": [37788, 71116, ...]  // Array de IDs dos jogadores
   }
   ```

3. **Projetos de Referência no GitHub:**
   - `python-cartolafc` (vicenteneto) - Wrapper Python completo
   - `CartolaJS` (0xVasconcelos) - Wrapper Node.js
   - `cartola-api` (renatorib) - PHP wrapper para CORS

**Arquitetura Proposta:**

```
[App Participante Premium]
    |
    +-- [Modal de Login Globo]
    |       - Input email/senha
    |       - Checkbox "Lembrar credenciais" (opcional, criptografado)
    |       - Aviso de riscos
    |
    +-- [Backend Super Cartola]
    |       - POST /api/cartola-pro/auth
    |       - POST /api/cartola-pro/escalar
    |       - Proxy seguro (não expõe credenciais no frontend)
    |
    +-- [API Cartola Globo]
            - Autenticação com glbId
            - Salvar escalação
```

**Arquivos a Criar:**

1. **Backend:**
   - `routes/cartola-pro-routes.js` - Rotas de autenticação e escalação
   - `services/cartolaProService.js` - Lógica de integração com Globo
   - `models/CartolaProSession.js` - Armazenar sessões ativas (opcional)

2. **Frontend:**
   - `public/participante/js/modules/participante-cartola-pro.js` - Lógica do módulo
   - `public/participante/fronts/cartola-pro.html` - Interface
   - Atualizar `participante-dicas.js` para integrar com PRO

**Fluxo de Implementação:**

- [ ] 1. Criar rota backend POST `/api/cartola-pro/auth`
  - Receber email/senha do participante
  - Fazer request para login.globo.com
  - Retornar glbId (ou erro)
  - NÃO armazenar credenciais em texto claro

- [ ] 2. Criar rota backend POST `/api/cartola-pro/escalar`
  - Receber glbId + array de atletas + esquema
  - Fazer request para api.cartolafc.globo.com
  - Retornar sucesso/erro

- [ ] 3. Criar interface no app participante
  - Botão "Escalar no Cartola" (apenas Premium)
  - Modal de login com aviso de riscos
  - Seletor de jogadores com sugestões
  - Confirmação antes de salvar

- [ ] 4. Implementar seletor de escalação
  - Buscar jogadores disponíveis (mercado aberto)
  - Interface de arrastar/soltar ou seleção
  - Validar formação (11 jogadores + técnico)
  - Mostrar preço total vs patrimônio

- [ ] 5. Testes e validação
  - Testar com conta real (com cuidado)
  - Verificar rate limiting da Globo
  - Implementar fallbacks para erros

**⚠️ RISCOS CONFIRMADOS:**

| Risco | Mitigação |
|-------|-----------|
| Violar ToS Globo | Aviso explícito ao usuário, termo de aceite |
| Credenciais expostas | NUNCA armazenar em texto claro, usar session temporária |
| Conta banida | Limitar requisições, simular comportamento humano |
| API mudar | Monitorar erros, fallback gracioso |

**Acesso:** Apenas participantes Premium (verificar `timeId === '13935277'` ou flag no banco)

---

## ✅ CONCLUÍDO (2026-01-22)

### REFACTOR-001 Fase 2: Extração PDF/Auditoria + Performance P2

**Commit:** `fb226ba refactor(p3): extract PDF/Auditoria module, add .lean() to queries`

**Arquivos criados:**
- `public/js/fluxo-financeiro/fluxo-financeiro-pdf.js` (830 linhas)

**Arquivos modificados:**
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` (5.214 → 4.426 linhas, -15%)
- `controllers/inscricoesController.js` (+.lean() em 1 query)
- `controllers/ligaController.js` (+.lean() em 2 queries)
- `controllers/pontosCorridosCacheController.js` (+.lean() em 1 query)

**Documentação:**
- `.claude/docs/PRD-admin-performance-refactor.md`
- `.claude/docs/SPEC-admin-performance-refactor.md`

**Resultado:**
| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| fluxo-financeiro-ui.js | 5.214 linhas | 4.426 linhas | -15% |
| Total desde início | 7.019 linhas | 4.426 linhas | **-37%** |
| Queries com .lean() | ~135 sem | ~130 sem | +4 controllers |

---

## ✅ CONCLUÍDO (2026-01-20)

### Corrigir Extrato Leilson 2025 + Remover Botão da Morte

**Participante:** Leilson Bezerra (ID 3300583)
**Liga:** SuperCartola (684cb1c8af923da7c7df51de)

#### Causa Raiz
O **botão "Limpar Cache"** no modal de extrato individual apagava dados do MongoDB **sem filtrar por temporada**, causando perda de dados irrecuperáveis em temporadas históricas.

#### Ações Executadas

| Ação | Arquivo | Status |
|------|---------|--------|
| Remover botão HTML | `fluxo-financeiro-ui.js` | ✅ |
| Remover função `limparCacheExtratoModal` | `fluxo-financeiro-ui.js` | ✅ |
| Remover função `recalcularCacheParticipante` | `fluxo-financeiro-ui.js` | ✅ |
| Remover função `limparCacheLiga` | `fluxo-financeiro-ui.js` | ✅ |
| Remover funções backend | `extratoFinanceiroCacheController.js` | ✅ |
| Remover rotas DELETE perigosas | `extratoFinanceiroCacheRoutes.js` | ✅ |
| Reconstruir extrato Leilson 2025 | `fix-leilson-extrato-2025.js` | ✅ |

#### Dados Recuperados do Leilson

| Campo | Valor |
|-------|-------|
| Saldo 2024 (crédito) | R$ 0,54 |
| Dívida das rodadas | R$ -203,46 |
| Pagamento (quitação) | R$ 204,00 |
| **Saldo Final** | **R$ 1,08** |
| Status | ✅ QUITADO |

⚠️ **Nota:** Os dados de rodadas individuais foram PERDIDOS permanentemente. O cache foi reconstruído com dados agregados disponíveis.

#### Scripts Criados
- `scripts/fix-leilson-extrato-2025.js` - Reconstrução do extrato

#### PRD Documentação
- `.claude/docs/PRD-remover-botao-limpar-cache.md`

---

## ✅ CONCLUÍDO (2026-01-19)

### Modal Premiações 2026

**Arquivos:**
- `public/participante/index.html` - Modal com accordion
- `public/participante/js/modules/participante-boas-vindas.js` v10.12 - Botão na tela Início

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Modal com 8 seções accordion | ✅ |
| Campeões de Turno | ✅ Copo Térmico + Camisa |
| Disputas Individuais | ✅ Artilheiro, Luva, Capitão (R$ 50 cada) |
| Pontos Corridos | ✅ 1° R$ 150, 2° R$ 130, 3° R$ 110 |
| Outras Disputas | ✅ Resta Um, Tiro Certo, Mata-Mata |
| Bolões | ✅ Copa do Mundo + Libertadores |
| Bônus/Ônus Especiais | ✅ Micos/Mitos, Nunca Mico, etc |
| Ranking Geral (G10) | ✅ 1° R$ 1000 até 10° R$ 50 |
| Ranking de Rodada | ✅ Bônus G10 + Ônus Z10 |
| Botão na tela Início | ✅ |

**Acesso:** `window.abrirPremiacoes2026()`

---

### Seção de Jogos Separada - v5.3

**Arquivo:** `public/participante/js/modules/participante-jogos.js`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Exibir apenas jogos do dia | ✅ (já existia) |
| Separar em "Em Andamento" e "Encerrados" | ✅ Implementado |
| Aplicar no app do participante (frontend) | ✅ |
| Validar integração com backend | ✅ Funciona com jogos-ao-vivo-routes.js |

**Mudanças técnicas:**
- Nova função `renderizarSecaoJogos()` para renderizar cada seção
- `renderizarJogosAoVivo()` agora separa jogos em duas categorias:
  - "Em Andamento": jogos ao vivo + agendados
  - "Encerrados": jogos finalizados (FT, AET, PEN)
- Visual diferenciado: borda laranja para Em Andamento, cinza para Encerrados

---

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Status Atual (2026-01-18)

### ✅ SPEC v5.0 Implementada

**Melhorias Badges Jogos v5.0** - CONCLUÍDO
- **PRD:** `.claude/docs/PRD-badges-jogos-melhorias-v5.md`
- **SPEC:** `.claude/docs/SPEC-badges-jogos-melhorias-v5.md`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Nomes de campeonatos | ✅ "Paulista - A1" → "Paulistão", "Carioca - 1" → "Cariocão" |
| Modal com tabs | ✅ Eventos \| Estatísticas \| Escalações |
| Tab Estatísticas | ✅ Barras comparativas (posse, chutes, escanteios, faltas) |
| Tab Escalações | ✅ Formação tática + 11 titulares de cada time |

**Arquivos modificados:**
1. `routes/jogos-ao-vivo-routes.js` v3.2 - LIGAS_PRINCIPAIS expandido + formatarNomeLiga() com nomes populares + extrairResumoStats()
2. `public/participante/js/modules/participante-jogos.js` v5.0 - Modal com tabs + renderizarEstatisticas() + renderizarEscalacoes() + trocarTabModal()

---

### ✅ SPEC v4.1 Implementada (Anterior)

**Badges de Jogos API-Football v4.1** - CONCLUÍDO
- **SPEC:** `.claude/docs/SPEC-badges-jogos-api-football-v3.md`
- **Commit:** `e234a3d feat(jogos-ao-vivo): implementar v4.1 com eventos e auto-refresh`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Eventos em tempo real | ✅ Gols, cartões, substituições |
| Auto-refresh | ✅ Atualiza placar a cada 60s quando ao vivo |
| Badge visual v4.1 | ✅ Tempo pulsante, placar halftime, estádio |
| Modal de detalhes | ✅ Toque expande timeline de eventos |

---

## Status Anterior (2026-01-17)

**✅ Skills Robustecidos v2.0 - Instalados**
**✅ Auditoria Baseline Executada**

**Localização:**
- `.claude/skills/` - 5 skills completos (code-inspector, db-guardian, frontend-crafter, league-architect, system-scribe)
- `scripts/` - 5 scripts de auditoria automatizados
- `audit_baseline_20260117.log` - Resultado da primeira auditoria

---

## 📊 Resultado Auditoria SPARC (2026-01-17)

**Score Total: 9/25 (CRÍTICO)**

| Dimensão | Score | Status |
|----------|-------|--------|
| 🛡️ Security | 1/5 | 🔴 |
| ⚡ Performance | 3/5 | 🟡 |
| 🏗️ Architecture | 1/5 | 🔴 |
| 🔄 Reliability | 3/5 | 🟡 |
| 🧹 Code Quality | 1/5 | 🔴 |

### ✅ P1 - Issues Críticos (RESOLVIDOS)

**Multi-Tenant (61 queries → 0 reais):**
- ✅ Análise detalhada: 61 falsos positivos
- ✅ Script melhorado com verificação multiline
- ✅ Queries usam `ligaId` (camelCase), `liga.times`, ou `time_id`

**Correção Aplicada - golsController.js v2.0:**
- ✅ `listarGols`: Adicionado filtro `ligaId` obrigatório
- ✅ `extrairGolsDaRodada`: Adicionado `ligaId` obrigatório + campos corretos
- ✅ `public/js/gols.js`: Atualizado para passar `ligaId`

**Secrets Hardcoded (34):**
- ✅ Falso positivo: todos em `.config/` e `node_modules`

### 🟡 P2 - Issues Médios (Parcialmente Resolvidos)

**Performance:**
- ~~135 queries sem `.lean()`~~ → 🟡 ~130 restantes (4 controllers atualizados em 22/01/2026)
- 567 console.logs (remover em produção)
- ~~2 bundles >100KB (fluxo-financeiro-ui: 286K)~~ → ✅ Reduzido para 180K (-37%)

**Models - Status dos Índices liga_id:**
- ✅ ModuleConfig, AjusteFinanceiro, LigaRules, ExtratoFinanceiroCache (têm índices)
- ⚠️ CartolaOficialDump (`meta.liga_id` não indexado - Data Lake)

### Próximas Ações Recomendadas

1. ~~**P1 Multi-Tenant**~~ ✅ Resolvido
2. ~~**P1 Auth gols.js**~~ ✅ Corrigido com ligaId obrigatório
3. ~~**P2 Índices:**~~ ✅ Análise: 4/5 models JÁ têm índices
4. **P2 Performance:** ~~136 queries sem .lean()~~ → 🟡 ~130 restantes (4 controllers atualizados)

---

## Histórico de Correções Recentes

### ✅ Auditoria P1/P2 Direta (2026-01-17)

**Análise P1 - Multi-Tenant:**
- `rodadaController.js` ✅ SEGURO - todas queries filtram por `ligaId`
- `artilheiroCampeaoController.js` ✅ SEGURO - validação de liga obrigatória

**Análise P1 - Auth:**
- `routes/gols.js` ✅ ACEITÁVEL - exige `ligaId` obrigatório
- `routes/configuracao-routes.js` 🔴 CORRIGIDO - `/limpar-cache` sem auth

**FIX Aplicado:**
- `routes/configuracao-routes.js:146` - Adicionado `verificarAdmin` middleware

**Análise P2 - Índices:**
- ModuleConfig ✅ `{liga_id, temporada, modulo}` único
- AjusteFinanceiro ✅ `{liga_id, time_id, temporada, ativo}`
- LigaRules ✅ `{liga_id, temporada}` único
- ExtratoFinanceiroCache ✅ `{liga_id, time_id, temporada}` único
- CartolaOficialDump ⚠️ `meta.liga_id` não indexado (Data Lake, raramente filtrado)

**Análise P2 - Performance:**
- 136 queries sem `.lean()` (backlog - implementar logger antes)
- 567 console.logs (requer logger configurável - backlog)

### ✅ Fix Multi-Tenant golsController.js (2026-01-17)

**Arquivos:** `controllers/golsController.js` v2.0, `public/js/gols.js` v2.0

**Problema:** Queries sem filtro `ligaId` permitiam vazamento de dados entre ligas

**Correções:**
- `listarGols`: Agora exige `ligaId` obrigatório no query string
- `extrairGolsDaRodada`: Agora exige `ligaId` no body + campos alinhados ao model
- Frontend atualizado para passar `ligaId`

**Script audit_multitenant.sh melhorado:**
- Verificação multiline (5 linhas de contexto)
- Reconhece padrões válidos: `ligaId`, `liga_id`, `liga.times`, `time_id`, `timeId`
- Ignora rotas admin/tesouraria/proxy intencionais

### ✅ Skills & Scripts de Auditoria (2026-01-17)

**Implementado:**
- Framework SPARC (Security/Performance/Architecture/Reliability/Code Quality)
- Scripts: audit_full, audit_security, audit_multitenant, detect_dead_code, check_dependencies
- Patterns específicos: Multi-tenant, Cache-First, Regras financeiras completas
- Documentação: Wiki Viva methodology, Gemini Audit integration

**Aliases criados:**
```bash
audit           # Auditoria completa
audit-security  # Análise de segurança
audit-tenant    # Validação multi-tenant
```

### ✅ Jogos do Dia v2.0 (2026-01-17)

**Arquivos:** `routes/jogos-ao-vivo-routes.js` v2.0, `public/participante/js/modules/participante-jogos.js` v3.0

**Mudanças:** Endpoint `?date={hoje}`, cache inteligente (2min/10min), jogos encerrados visíveis

### ✅ Fix China Guardiola - Crédito 2026 (2026-01-17)

**Corrigido:** `controllers/inscricoesController.js` v1.4 - Transferência de crédito em renovações com `pagouInscricao=true`

### ✅ PWA Install Prompt (Implementado)

**Arquivo:** `public/participante/js/install-prompt.js` v1.1

---

## Referência Rápida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Scripts de Auditoria
```bash
bash scripts/audit_full.sh           # Auditoria completa SPARC
bash scripts/audit_security.sh       # Segurança OWASP Top 10
bash scripts/audit_multitenant.sh    # Isolamento multi-tenant
bash scripts/detect_dead_code.sh     # Código morto/TODOs
bash scripts/check_dependencies.sh   # NPM vulnerabilidades
```

### Status API Cartola
```json
{
  "temporada": 2025,
  "rodada_atual": 1,
  "status_mercado": 1,
  "game_over": false
}
```

---

## Próxima Ação Recomendada

### Imediato (P1 - CRÍTICO)
1. ~~**Executar baseline de auditoria**~~ ✅ Concluído
2. **Revisar queries multi-tenant** - `rodadaController.js`, `artilheiroCampeaoController.js`
3. **Verificar auth** em `routes/gols.js` e `routes/configuracao-routes.js`

### Curto Prazo (P2)
1. ~~Adicionar `.lean()` em 135 queries~~ → 🟡 ~130 restantes (4 controllers feitos)
2. ~~Criar índices `liga_id`~~ → ✅ 4/5 models JÁ têm índices
3. Remover console.logs de produção (567 encontrados)
4. 📋 Continuar refatoração fluxo-financeiro-ui.js (4.426 linhas restantes)

### Quando Brasileirão 2026 Iniciar
1. Atualizar `CAMPEONATO_ENCERRADO = false` em `fluxo-financeiro-core.js`
2. Atualizar `TEMPORADA_CARTOLA = 2026` em `participante-extrato.js`
3. Executar `bash scripts/audit_multitenant.sh` para validar queries 2026

---
# PRD: Integração OAuth Cartola PRO

## Resumo Executivo

Permitir que participantes PRO do Super Cartola Manager escalem seu time diretamente no Cartola FC oficial através de uma integração OAuth com a API da Globo.

**Objetivo:** Automatizar o processo de escalação, eliminando a necessidade do participante acessar o app/site oficial do Cartola.

**Acesso:** Apenas participantes Premium (flag no banco ou lista de IDs autorizados).

---

## ⚠️ LIMITAÇÃO CRÍTICA IDENTIFICADA (v2.0 - 21/01/2026)

### O Problema: Contas Google OAuth

Após implementação e testes extensivos, foi identificado que:

| Tipo de Conta | Endpoint Legacy | Status |
|---------------|-----------------|--------|
| Conta com senha direta (email/senha) | `login.globo.com/api/authentication` | ✅ Funciona |
| Conta via Google OAuth | `login.globo.com/api/authentication` | ❌ Retorna HTTP 406 |
| Conta via Facebook | `login.globo.com/api/authentication` | ❌ Retorna HTTP 406 |

**Motivo:** Contas criadas via Google/Facebook **não possuem senha direta** no sistema Globo. O endpoint de autenticação direta não aceita essas contas.

### Solução Necessária para Google OAuth

Apps que suportam Google OAuth (Guru do Cartola, Parciais CFC, Cartomante) utilizam:
1. **WebView nativo** (plugin Capacitor/Cordova)
2. **Captura de cookies** durante redirect OIDC
3. **Combinação específica** de cookies + headers

**Problema para PWA:** Nosso app é PWA/Web, não nativo. Não temos acesso a WebView com captura de cookies.

### Opções de Implementação

| Opção | Descrição | Complexidade | Cobertura |
|-------|-----------|--------------|-----------|
| **A** | Suportar apenas contas com senha | Baixa | ~30% dos usuários |
| **B** | Implementar WebView via iframe/popup | Alta | Pode não funcionar (CORS) |
| **C** | Converter para app nativo (Capacitor) | Muito Alta | 100% dos usuários |
| **D** | Apenas endpoints públicos | Baixa | Sugestões apenas, sem escalar |

### Recomendação

**Opção A + D (Híbrido):**
- Suportar login direto para contas com senha
- Adicionar mensagem educativa para usuários Google OAuth
- Manter funcionalidades que usam endpoints públicos (sugestões, análises)
- Não escalar para quem não conseguir autenticar

---

## 1. Pesquisa Realizada

### 1.1 Endpoints da API Globo (Confirmados)

**Autenticação:**
```http
POST https://login.globo.com/api/authentication
Content-Type: application/json

{
  "payload": {
    "email": "usuario@email.com",
    "password": "senha123",
    "serviceId": 4728
  }
}

Response: { "glbId": "token_215_caracteres..." }
```

**Salvar Escalação:**
```http
POST https://api.cartolafc.globo.com/auth/time/salvar
X-GLB-Token: {glbId}
Content-Type: application/json

{
  "esquema": 3,
  "atleta": [37788, 71116, ...]
}
```

### 1.2 Projetos de Referência
- `python-cartolafc` (vicenteneto) - Wrapper Python completo
- `CartolaJS` (0xVasconcelos) - Wrapper Node.js
- `cartola-api` (renatorib) - PHP wrapper

---

## 2. Arquivos Existentes (Relacionados)

### Backend
| Arquivo | Função | Relevância |
|---------|--------|------------|
| `services/cartolaApiService.js` | Integração API Cartola (leitura) | Alta - Base para nova integração |
| `routes/cartola.js` | Rotas de dados Cartola | Alta - Adicionar novas rotas |
| `routes/participante-auth.js` | Auth de participantes | Média - Verificar sessão |
| `controllers/cartolaController.js` | Controller existente | Média - Padrão a seguir |

### Frontend (App Participante)
| Arquivo | Função | Relevância |
|---------|--------|------------|
| `public/participante/js/modules/participante-dicas.js` | Tela de dicas v1.0 | Alta - Integrar botão PRO |
| `public/participante/fronts/dicas.html` | Template da tela | Alta - Adicionar modal |
| `public/participante/js/participante-auth.js` | Auth do participante | Média - Verificar Premium |
| `public/participante/js/participante-navigation.js` | Navegação SPA | Baixa - Referência |

---

## 3. Arquivos a Criar

### Backend
| Arquivo | Descrição |
|---------|-----------|
| `routes/cartola-pro-routes.js` | Rotas de auth e escalação PRO |
| `services/cartolaProService.js` | Lógica de integração com login.globo.com |
| `models/CartolaProSession.js` | (Opcional) Armazenar sessões ativas |

### Frontend
| Arquivo | Descrição |
|---------|-----------|
| `public/participante/js/modules/participante-cartola-pro.js` | Módulo de escalação PRO |
| `public/participante/fronts/cartola-pro.html` | Interface do seletor de escalação |

---

## 4. Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                     APP PARTICIPANTE                             │
├─────────────────────────────────────────────────────────────────┤
│  [Tela Dicas]                                                    │
│       │                                                          │
│       ├── [Botão "Escalar no Cartola PRO"] (apenas Premium)     │
│       │           │                                              │
│       │           v                                              │
│       │   ┌───────────────────┐                                 │
│       │   │ Modal Login Globo │                                 │
│       │   │ - Email/Senha     │                                 │
│       │   │ - Aviso de riscos │                                 │
│       │   │ - Checkbox aceite │                                 │
│       │   └───────────────────┘                                 │
│       │           │                                              │
│       │           v                                              │
│       │   ┌───────────────────┐                                 │
│       │   │ Seletor Escalação │                                 │
│       │   │ - 11 + técnico    │                                 │
│       │   │ - Formação        │                                 │
│       │   │ - Patrimônio      │                                 │
│       │   └───────────────────┘                                 │
│       │           │                                              │
└───────┼───────────┼─────────────────────────────────────────────┘
        │           │
        v           v
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                            │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/cartola-pro/auth                                      │
│       - Recebe email/senha do participante                       │
│       - Faz request para login.globo.com                         │
│       - Retorna glbId (ou erro)                                  │
│       - NÃO armazena credenciais                                 │
│                                                                  │
│  POST /api/cartola-pro/escalar                                   │
│       - Recebe glbId + atletas[] + esquema                       │
│       - Valida formação (11 + técnico)                           │
│       - Faz request para api.cartolafc.globo.com                 │
│       - Retorna sucesso/erro                                     │
│                                                                  │
│  GET /api/cartola-pro/mercado                                    │
│       - Busca jogadores disponíveis (mercado aberto)             │
│       - Retorna lista com preços e status                        │
└─────────────────────────────────────────────────────────────────┘
        │           │
        v           v
┌─────────────────────────────────────────────────────────────────┐
│                     API GLOBO (Externa)                          │
├─────────────────────────────────────────────────────────────────┤
│  login.globo.com/api/authentication → glbId                     │
│  api.cartolafc.globo.com/auth/time/salvar → sucesso/erro        │
│  api.cartolafc.globo.com/atletas/mercado → lista de jogadores   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Fluxo de Implementação

### Fase 1: Backend - Autenticação
```javascript
// routes/cartola-pro-routes.js
POST /api/cartola-pro/auth
- Body: { email, password }
- Valida participante Premium (session.participante)
- Faz request para login.globo.com
- Retorna: { success: true, glbId, expiresIn }
```

### Fase 2: Backend - Escalação
```javascript
// routes/cartola-pro-routes.js
POST /api/cartola-pro/escalar
- Body: { glbId, atletas[], esquema, capitao }
- Valida formação (11 jogadores + técnico)
- Valida patrimônio vs custo
- Faz request para api.cartolafc.globo.com/auth/time/salvar
- Retorna: { success: true, message }
```

### Fase 3: Frontend - Modal Login
```javascript
// participante-cartola-pro.js
- Modal com inputs email/senha
- Checkbox de aceite de riscos
- Animação de loading
- Mensagens de erro claras
```

### Fase 4: Frontend - Seletor de Escalação
```javascript
// participante-cartola-pro.js
- Buscar jogadores disponíveis
- Interface de seleção por posição
- Mostrar preço total vs patrimônio
- Escolha de formação (esquema)
- Escolha de capitão (3x)
- Confirmação antes de salvar
```

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Violar ToS Globo | Alta | Alto | Aviso explícito, termo de aceite, uso opcional |
| Credenciais expostas | Média | Crítico | NUNCA armazenar, usar apenas em memória, HTTPS |
| Conta banida | Média | Alto | Rate limit, simular comportamento humano, delays |
| API mudar sem aviso | Alta | Médio | Monitorar erros, fallback gracioso, logs |
| Mercado fechado | Baixa | Baixo | Verificar status antes de permitir |

---

## 7. Controle de Acesso Premium

### Opção 1: Lista de IDs (MVP)
```javascript
const PREMIUM_IDS = ['13935277', '12345678'];
const isPremium = PREMIUM_IDS.includes(String(timeId));
```

### Opção 2: Flag no Participante (Recomendado)
```javascript
// Liga.participantes[].premium: Boolean
const isPremium = participante.premium === true;
```

### Opção 3: Collection Separada (Futuro)
```javascript
// Collection: premium_subscriptions
// { timeId, plano, validoAte, features[] }
```

---

## 8. Regras de Negócio

1. **Mercado deve estar aberto** para permitir escalação
2. **Formação válida:** 11 jogadores de campo + 1 técnico
3. **Patrimônio suficiente:** soma dos preços <= patrimônio atual
4. **Posições válidas:** respeitar esquema escolhido
5. **Jogadores disponíveis:** sem lesão, suspensão ou dúvida crítica
6. **Capitão obrigatório:** escolher 1 jogador para 3x

---

## 9. Esquemas de Formação (IDs)

| ID | Formação | Posições |
|----|----------|----------|
| 1 | 3-4-3 | GOL + 3 ZAG + 4 MEI + 3 ATA |
| 2 | 3-5-2 | GOL + 3 ZAG + 5 MEI + 2 ATA |
| 3 | 4-3-3 | GOL + 2 LAT + 2 ZAG + 3 MEI + 3 ATA |
| 4 | 4-4-2 | GOL + 2 LAT + 2 ZAG + 4 MEI + 2 ATA |
| 5 | 4-5-1 | GOL + 2 LAT + 2 ZAG + 5 MEI + 1 ATA |
| 6 | 5-3-2 | GOL + 2 LAT + 3 ZAG + 3 MEI + 2 ATA |
| 7 | 5-4-1 | GOL + 2 LAT + 3 ZAG + 4 MEI + 1 ATA |

---

## 10. Dependências

### NPM (Já existentes)
- `axios` - Requisições HTTP
- `node-cache` - Cache de dados
- `express` - Rotas
- `express-session` - Sessões

### Novas (Nenhuma necessária)
- Usar axios existente para requests

---

## 11. Testes Necessários

1. **Autenticação:**
   - Login com credenciais válidas
   - Login com credenciais inválidas
   - Timeout de sessão glbId

2. **Escalação:**
   - Salvar com mercado aberto
   - Tentar salvar com mercado fechado
   - Formação inválida (menos de 11)
   - Patrimônio insuficiente

3. **Frontend:**
   - Modal responsivo mobile
   - Seleção de jogadores
   - Cálculo de patrimônio em tempo real

---

## 12. Cronograma Sugerido

| Fase | Descrição | Prioridade |
|------|-----------|------------|
| 1 | Backend auth (`/api/cartola-pro/auth`) | P0 |
| 2 | Backend escalar (`/api/cartola-pro/escalar`) | P0 |
| 3 | Frontend modal login | P1 |
| 4 | Frontend seletor escalação | P1 |
| 5 | Testes com conta real | P2 |
| 6 | Rate limiting e proteções | P2 |

---

## 13. Próximos Passos

1. **Aprovar PRD** - Revisar com stakeholder
2. **Gerar SPEC** - Mudanças cirúrgicas por arquivo
3. **Implementar Backend** - Auth + Escalar
4. **Implementar Frontend** - Modal + Seletor
5. **Testes** - Ambiente controlado
6. **Deploy** - Liberação gradual (apenas Premium)

---

---

## 14. Pesquisa v2.0 (21/01/2026 - Perplexity MCP)

### Fontes Consultadas

| Fonte | URL | Descoberta |
|-------|-----|------------|
| TabNews | [Link](https://www.tabnews.com.br/juniorandrade88/345421e4-1e40-4c5d-b12f-a27ff021d881) | Mesmo problema de 401 após captura de cookies |
| Workana | [Link](https://www.workana.com/job/implementar-login-autenticado-do-cartola-fc-em-app-capacitor-firebase) | Job pedindo implementação - sem solução pública |
| ChoraAPI | [Link](https://choraapi.com.br/blog/api-cartola-fc/) | Lista completa de endpoints |
| Python-CartolaFC | [Link](https://pypi.org/project/Python-CartolaFC/) | Código-fonte de auth |
| vicenteneto/python-cartolafc | [Link](https://github.com/vicenteneto/python-cartolafc) | Implementação de referência |

### Descobertas Chave

1. **serviceId correto:** 4728 (confirmado no Python-CartolaFC)
2. **GLBID:** Token de 215 caracteres retornado após auth
3. **Header:** `X-GLB-Token` (não `Authorization: Bearer`)
4. **Contas Google:** Não suportadas via endpoint direto (HTTP 406)
5. **Alternativa:** WebView + captura de cookies (apps nativos)

### Código de Referência (Python)

```python
# De vicenteneto/python-cartolafc
self._auth_url = 'https://login.globo.com/api/authentication'
response = requests.post(self._auth_url,
    json=dict(payload=dict(
        email=self._email,
        password=self._password,
        serviceId=4728
    ))
)
if response.status_code == 200:
    self._glb_id = response.json()['glbId']
```

---

**Gerado por:** High Senior Protocol (Fase 1 - Pesquisa)
**Data:** 2026-01-20
**Atualizado:** 2026-01-21 (v2.0 - Pesquisa Perplexity)
**Versão:** 2.0

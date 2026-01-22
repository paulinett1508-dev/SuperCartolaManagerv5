# Skill: newsession

Handover para nova sessao - carrega contexto do trabalho em andamento e instrui proximos passos.

---

## HANDOVER: Login Unificado Participante Premium

### Contexto

Trabalho em andamento: **unificacao do login do participante premium** (Cartola PRO).

### Problema

O sistema tem **dois logins separados**:
1. **Login App:** time_id + senha local → `req.session.participante`
2. **Login Cartola PRO:** email/senha Globo → `req.session.cartolaProAuth`

Isso causa confusao para o participante premium (Paulinett).

### Solucao Desejada

**Login unico via Globo** para participantes premium (assinantes):

```
Tela Login
├── [Entrar com Globo] ← Para premium (assinante=true)
│   └── Autentica Globo → API retorna time_id → Sessao unificada
│
└── [Entrar com senha] ← Para todos os outros
    └── Login tradicional (time_id + senha local)
```

### Arquivos Relevantes

**Backend:**
- `routes/participante-auth.js` - Login atual (time_id + senha)
- `routes/cartola-pro-routes.js` - Endpoints PRO + OAuth
- `config/globo-oauth.js` - Configuracao OAuth OIDC Globo

**Frontend:**
- `public/participante/js/participante-auth.js` - Tela de login
- `public/participante/js/modules/participante-cartola-pro.js` - Modal PRO (v2.2)

**Banco:**
- Collection `times` - Campo `assinante: true` indica premium
- Paulinett (time_id: 13935277) tem `assinante: true`

### Restricoes

1. **OAuth so funciona em dominios Replit** (localhost, *.replit.dev)
2. **Dominios customizados** (supercartolamanager.com.br) precisam usar login direto (email/senha Globo)
3. Funcao `isOAuthDisponivel()` detecta isso automaticamente

### O Que Ja Foi Feito

- ✅ Backend retorna `assinante` na sessao (`routes/participante-auth.js`)
- ✅ Middleware `verificarPremium` usa `times.assinante` (`routes/cartola-pro-routes.js`)
- ✅ Frontend mostra botao PRO apenas para assinantes
- ✅ Deteccao automatica de dominio para OAuth
- ✅ Query corrigida para usar campo `id` (nao `time_id`)

---

## PROXIMA TAREFA

Implementar login unificado para participante premium:

1. **Modificar tela de login** (`public/participante/js/participante-auth.js`):
   - Adicionar botao "Entrar com Globo" para assinantes
   - Manter botao "Entrar com senha" para todos

2. **Criar rota de login unificado** (backend):
   - Apos autenticar na Globo, buscar time_id da conta
   - Verificar se time_id esta cadastrado em alguma liga
   - Criar sessao unificada (participante + cartolaProAuth)

3. **Deteccao de assinante na tela de login**:
   - Usuario digita time_id → Sistema verifica se e assinante
   - Se assinante, mostra opcao "Entrar com Globo"

**Restricao:** Em dominios customizados, usar formulario email/senha Globo em vez de OAuth redirect.

---

## Comando para Iniciar

```bash
/workflow implementar login unificado Globo para participante premium
```

Ou execute diretamente:

```
Implemente login unificado para participante premium:
1. Na tela de login, adicione opcao "Entrar com Globo"
2. Crie endpoint que autentica via Globo e cria sessao do participante
3. Apenas assinante=true podem usar essa opcao
4. Mantenha login tradicional como fallback
```

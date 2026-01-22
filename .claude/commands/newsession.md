# Handover para Nova Sessao

## Contexto Anterior

Estavamos trabalhando na **unificacao do login do participante premium** (Cartola PRO).

### Problema Identificado

O sistema tem **dois logins separados**:
1. **Login App:** time_id + senha local → `req.session.participante`
2. **Login Cartola PRO:** email/senha Globo → `req.session.cartolaProAuth`

Isso causa confusao e fricao desnecessaria para o participante premium.

### Solucao Desejada

**Login unico via Globo** para participantes premium (assinantes):

```
Tela Login
├── [Entrar com Globo] ← Para premium (assinante=true)
│   └── Autentica Globo → API retorna time_id → Verifica se esta na liga → Sessao unificada
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
- `public/participante/js/modules/participante-boas-vindas.js` - Verifica premium

**Banco de Dados:**
- Collection `times` - Campo `assinante: true` indica premium
- Paulinett (time_id: 13935277) tem `assinante: true`

### Restricoes Importantes

1. **OAuth so funciona em dominios Replit** (localhost, *.replit.dev)
2. **Dominios customizados** (supercartolamanager.com.br) precisam usar login direto (email/senha Globo)
3. Funcao `isOAuthDisponivel()` em `participante-cartola-pro.js` detecta isso

### O Que Ja Foi Feito

1. ✅ Backend retorna `assinante` na sessao
2. ✅ Middleware `verificarPremium` usa `times.assinante`
3. ✅ Frontend mostra botao PRO apenas para assinantes
4. ✅ Deteccao automatica de dominio para OAuth

### Proximos Passos (IMPLEMENTAR)

1. **Modificar tela de login** (`public/participante/js/participante-auth.js`):
   - Adicionar botao "Entrar com Globo" para assinantes
   - Manter botao "Entrar com senha" para todos

2. **Criar rota de login unificado** (backend):
   - Apos autenticar na Globo, buscar time_id da conta
   - Verificar se time_id esta cadastrado em alguma liga
   - Criar sessao unificada (participante + cartolaProAuth)

3. **Fluxo de deteccao de assinante na tela de login**:
   - Opcao A: Usuario digita time_id primeiro, sistema verifica se e assinante
   - Opcao B: Mostrar ambos botoes, se nao-assinante tentar Globo, redireciona

---

## Primeira Execucao

```
Leia este handover e implemente o login unificado para participante premium:

1. Na tela de login do participante, adicione opcao "Entrar com Globo"
2. Crie endpoint que autentica via Globo e ja cria sessao do participante
3. Apenas participantes com assinante=true podem usar essa opcao
4. Mantenha login tradicional (time_id + senha) como fallback

Arquivos principais:
- public/participante/js/participante-auth.js (frontend login)
- routes/participante-auth.js (backend login)
- config/globo-oauth.js (OAuth config)

Restricao: Em dominios customizados, usar login direto (email/senha) em vez de OAuth redirect.
```

# PRD - Correcao Inconsistencia Auth Cartola PRO

**Data:** 2026-01-21
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Baseado em:** Analise do codigo existente + PRD-cartola-pro.md

---

## Resumo Executivo

O modulo `participante-cartola-pro.js` apresenta uma **inconsistencia entre documentacao e implementacao**: o comentario diz "Removido login direto com email/senha" (linha 9) mas o codigo ainda renderiza formulario de email/senha e chama `POST /api/cartola-pro/auth`.

A correcao visa **alinhar documentacao com realidade** e **reorganizar UI para ser OAuth-first**, conforme recomendado no PRD original.

---

## Contexto e Analise

### Inconsistencia Identificada

**Arquivo:** `public/participante/js/modules/participante-cartola-pro.js`

| Linha | O que diz | O que faz |
|-------|-----------|-----------|
| 7-9 | "Removido login direto com email/senha" | **FALSO** - codigo ainda existe |
| 90-193 | - | Renderiza formulario email/senha (`mostrarTelaConexao()`) |
| 198-253 | - | Funcao `fazerLogin()` chama `POST /api/cartola-pro/auth` |
| 266-271 | - | Funcao `iniciarOAuth()` faz redirect para OAuth Globo |

**Fluxo Atual (Errado):**
```
1. Usuario abre modal
2. GET /oauth/status → authenticated: false
3. Mostra formulario email/senha (mostrarTelaConexao)
4. Usuario preenche e clica "Conectar"
5. POST /api/cartola-pro/auth → 401 (sessao expirada ou credenciais invalidas)
```

**Problema:** O fluxo OAuth (linha 266-271) existe mas nunca e chamado como opcao principal.

### Modulos Identificados

**Backend (JA IMPLEMENTADO):**
- `routes/cartola-pro-routes.js` - Endpoints completos (auth, oauth/*, mercado, etc)
- `services/cartolaProService.js` - Autenticacao direta (`autenticar()`)
- `config/globo-oauth.js` - OAuth OIDC completo (`setupGloboOAuthRoutes()`)

**Frontend (A CORRIGIR):**
- `public/participante/js/modules/participante-cartola-pro.js` - Modulo com inconsistencia

**Dependentes (Nao precisam mudar):**
- `public/participante/js/modules/participante-boas-vindas.js` - Chama `window.abrirCartolaPro()`
- `public/participante/js/modules/participante-dicas.js` - Define `window.abrirCartolaPro()`

### Dependencias Mapeadas

```
participante-cartola-pro.js
    ├── abrirModal() ← chamado por window.abrirCartolaPro (dicas.js, boas-vindas.js)
    ├── GET /api/cartola-pro/oauth/status ← globo-oauth.js
    ├── POST /api/cartola-pro/auth ← cartola-pro-routes.js (linha 350)
    └── GET /api/cartola-pro/oauth/login ← globo-oauth.js (redirect)
```

### Limitacao Documentada no PRD Original

O PRD-cartola-pro.md (linha 13-51) documenta:
- Contas criadas via **Google OAuth** retornam **HTTP 406** no login direto
- Solucao recomendada: **OAuth-first + login direto como fallback**

---

## Solucao Proposta

### Abordagem Escolhida

**Reorganizar UI para ser OAuth-first:**

1. Tela inicial mostra **dois botoes**:
   - Botao principal: "Conectar com Globo" (OAuth OIDC)
   - Link secundario: "Usar email/senha" (expande formulario)

2. **Aviso informativo** sobre limitacao de contas Google

3. **Corrigir comentarios** para refletir realidade: "OAuth preferencial + login direto como fallback"

### Arquivos a Modificar

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `participante-cartola-pro.js` | Modificar | Reorganizar tela de conexao, corrigir comentarios |

### Arquivos que NAO mudam

- Backend (rotas e services) - ja suportam ambos os fluxos
- Outros modulos frontend - chamam apenas `abrirModal()`

---

## Mudancas Cirurgicas

### 1. Corrigir comentarios (linhas 7-10)

**ANTES:**
```javascript
// ✅ v2.0: Refatoração completa
//          - OAuth OIDC real (redirect para login Globo)
//          - Interface com 4 abas: Sugerido | Escalar | Não Escalaram | Meu Time
//          - Removido login direto com email/senha
```

**DEPOIS:**
```javascript
// ✅ v2.1: Correcao de inconsistencia
//          - OAuth OIDC como metodo PRINCIPAL (redirect para login Globo)
//          - Login direto com email/senha como FALLBACK (contas antigas)
//          - Aviso sobre limitacao de contas Google OAuth
//          - Interface com 4 abas: Sugerido | Escalar | Não Escalaram | Meu Time
```

### 2. Reformular `mostrarTelaConexao()` (linhas 90-193)

**ANTES:** Mostra formulario email/senha diretamente

**DEPOIS:** Mostra tela com duas opcoes:
1. Botao OAuth (principal)
2. Link "Usar email/senha" que expande formulario

**Novo HTML:**
```javascript
function mostrarTelaConexao() {
    const modal = document.getElementById('cartola-pro-modal');
    if (!modal) return;

    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg mx-4 bg-[#1a1a1a] rounded-3xl border border-white/10 max-h-[80vh] overflow-y-auto animate-slide-up">
            <!-- Header -->
            <div class="sticky top-0 bg-[#1a1a1a] rounded-t-3xl px-4 py-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: linear-gradient(135deg, rgba(234,179,8,0.2), rgba(249,115,22,0.2));">
                        <span class="material-icons text-yellow-400">sports_soccer</span>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Cartola PRO
                        </h2>
                        <p class="text-xs text-white/50">Conecte sua conta Globo</p>
                    </div>
                </div>
                <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                    <span class="material-icons text-white/50">close</span>
                </button>
            </div>

            <!-- Conteudo -->
            <div class="p-4 space-y-4">
                <!-- Aviso Integracao -->
                <div class="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <div class="flex items-start gap-3">
                        <span class="material-icons text-yellow-400">warning</span>
                        <div>
                            <p class="text-sm font-medium text-yellow-300">Integracao Nao-Oficial</p>
                            <p class="text-xs text-white/60 mt-1">
                                Suas credenciais sao usadas apenas para autenticar na API da Globo e NAO sao armazenadas.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- BOTAO PRINCIPAL: OAuth -->
                <button onclick="window.CartolaProModule.iniciarOAuth()"
                        class="w-full py-4 rounded-xl text-black font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style="background: linear-gradient(135deg, #eab308, #f97316);">
                    <span class="material-icons">login</span>
                    Conectar com Globo
                </button>

                <!-- Divisor -->
                <div class="flex items-center gap-3 py-2">
                    <div class="flex-1 h-px bg-white/10"></div>
                    <span class="text-xs text-white/30">ou</span>
                    <div class="flex-1 h-px bg-white/10"></div>
                </div>

                <!-- Link para login direto -->
                <button onclick="window.CartolaProModule.mostrarFormularioEmail()"
                        class="w-full text-center text-sm text-white/50 hover:text-white/70 transition-colors">
                    Usar email e senha (contas antigas)
                </button>

                <!-- Aviso sobre contas Google (colapsado) -->
                <div class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div class="flex items-start gap-3">
                        <span class="material-icons text-blue-400 text-sm">info</span>
                        <p class="text-xs text-white/50">
                            <strong class="text-blue-300">Contas Google/Facebook:</strong> Se sua conta Globo foi criada via Google ou Facebook, use o botao "Conectar com Globo" acima.
                        </p>
                    </div>
                </div>

                <!-- Recursos disponiveis -->
                <div class="pt-2 border-t border-white/10">
                    <p class="text-xs text-white/40 mb-2">Recursos disponiveis:</p>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-green-400 text-sm">lightbulb</span>
                            Sugestoes
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-yellow-400 text-sm">edit</span>
                            Escalar
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-purple-400 text-sm">groups</span>
                            Nao Escalaram
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-blue-400 text-sm">visibility</span>
                            Meu Time
                        </div>
                    </div>
                </div>
            </div>

            <div class="h-4"></div>
        </div>
    `;
}
```

### 3. Adicionar funcao `mostrarFormularioEmail()` (nova funcao)

**ADICIONAR apos `mostrarTelaConexao()`:**

```javascript
// =====================================================================
// FORMULARIO EMAIL/SENHA (FALLBACK)
// =====================================================================
function mostrarFormularioEmail() {
    const modal = document.getElementById('cartola-pro-modal');
    if (!modal) return;

    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg mx-4 bg-[#1a1a1a] rounded-3xl border border-white/10 max-h-[80vh] overflow-y-auto animate-slide-up">
            <!-- Header -->
            <div class="sticky top-0 bg-[#1a1a1a] rounded-t-3xl px-4 py-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <button onclick="window.CartolaProModule.voltarTelaConexao()" class="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <span class="material-icons text-white/50">arrow_back</span>
                    </button>
                    <div>
                        <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Login Direto
                        </h2>
                        <p class="text-xs text-white/50">Email e senha da conta Globo</p>
                    </div>
                </div>
                <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                    <span class="material-icons text-white/50">close</span>
                </button>
            </div>

            <!-- Aviso -->
            <div class="mx-4 mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <div class="flex items-start gap-3">
                    <span class="material-icons text-orange-400">info</span>
                    <div>
                        <p class="text-sm font-medium text-orange-300">Contas Antigas</p>
                        <p class="text-xs text-white/60 mt-1">
                            Este metodo funciona apenas para contas criadas diretamente na Globo (nao via Google/Facebook).
                        </p>
                    </div>
                </div>
            </div>

            <!-- Formulario -->
            <div class="p-4 space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-1">Email da Conta Globo</label>
                    <input type="email" id="pro-email"
                           class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                           placeholder="seu@email.com">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-1">Senha</label>
                    <input type="password" id="pro-senha"
                           class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                           placeholder="••••••••">
                </div>

                <!-- Checkbox Aceite -->
                <label class="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700 cursor-pointer">
                    <input type="checkbox" id="pro-aceite" class="mt-1 accent-yellow-500">
                    <span class="text-xs text-white/60">
                        Entendo que esta e uma integracao nao-oficial e que o uso e de minha responsabilidade.
                    </span>
                </label>

                <!-- Botao Login -->
                <button onclick="window.CartolaProModule.fazerLogin()" id="pro-btn-login"
                        class="w-full py-4 rounded-xl text-black font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style="background: linear-gradient(135deg, #eab308, #f97316);">
                    <span class="material-icons">login</span>
                    Conectar
                </button>

                <!-- Mensagem de erro -->
                <div id="pro-erro" class="hidden p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300"></div>
            </div>

            <div class="h-4"></div>
        </div>
    `;
}

// Voltar para tela de conexao principal
function voltarTelaConexao() {
    mostrarTelaConexao();
}
```

### 4. Atualizar exports (window.CartolaProModule)

**ANTES (linha 723-731):**
```javascript
window.CartolaProModule = {
    abrirModal,
    fecharModal,
    iniciarOAuth,
    fazerLogin,
    trocarAba,
    colarTimeSugerido,
    desconectar
};
```

**DEPOIS:**
```javascript
window.CartolaProModule = {
    abrirModal,
    fecharModal,
    iniciarOAuth,
    fazerLogin,
    trocarAba,
    colarTimeSugerido,
    desconectar,
    mostrarFormularioEmail,
    voltarTelaConexao
};
```

---

## Regras de Negocio

1. **OAuth e o metodo preferencial** - Redireciona para Globo OIDC
2. **Login direto e fallback** - Para contas antigas (sem Google/Facebook)
3. **Aviso sobre contas Google** - Informar usuario que login direto nao funciona
4. **Nenhuma credencial armazenada** - Apenas token em memoria do cliente

---

## Riscos e Consideracoes

### Impactos Previstos
- **Positivo:** UX mais clara, menos erros 401 por tentativa de login direto com conta Google
- **Atencao:** Usuarios precisarao entender qual metodo usar
- **Risco:** Baixo - mudanca apenas no frontend, backend continua igual

### Multi-Tenant
- [x] Nenhum impacto - correcao e apenas UI/UX

---

## Testes Necessarios

### Cenarios de Teste

1. **OAuth Flow:**
   - Clicar "Conectar com Globo" → Redireciona para `goidc.globo.com`
   - Apos login → Retorna para app com `?cartola_pro=success`
   - Modal mostra interface com abas

2. **Login Direto Flow:**
   - Clicar "Usar email e senha"
   - Formulario aparece com botao voltar
   - Preencher credenciais validas → Sucesso
   - Preencher credenciais invalidas → Erro exibido

3. **Conta Google:**
   - Tentar login direto com conta Google → HTTP 401/406
   - Mensagem de erro clara

---

## Proximos Passos

1. Validar PRD
2. Gerar Spec: Executar `/spec` com este PRD
3. Implementar: Executar `/code` com Spec gerado

---

**Gerado por:** Pesquisa Protocol v1.0

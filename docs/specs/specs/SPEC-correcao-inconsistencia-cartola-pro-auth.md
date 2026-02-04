# SPEC - Correcao Inconsistencia Auth Cartola PRO

**Data:** 2026-01-21
**Baseado em:** PRD-correcao-inconsistencia-cartola-pro-auth.md
**Status:** Especificacao Tecnica

---

## Resumo da Implementacao

Reorganizar a UI do modulo `participante-cartola-pro.js` para ser **OAuth-first**, com login direto (email/senha) como fallback visivel. Corrigir comentarios falsos que dizem "Removido login direto" quando o codigo ainda existe. Adicionar avisos informativos sobre limitacao de contas Google OAuth.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. participante-cartola-pro.js - Modulo Principal

**Path:** `public/participante/js/modules/participante-cartola-pro.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:**
- `participante-dicas.js` - Chama `window.abrirCartolaPro()`
- `participante-boas-vindas.js` - Chama `window.abrirCartolaPro()`

> **Nota:** Os dependentes NAO precisam ser modificados - chamam apenas `abrirModal()` via alias global.

---

## Mudancas Cirurgicas

### Mudanca 1: Corrigir Comentarios do Cabecalho

**Linhas 6-10: SUBSTITUIR**

```javascript
// ANTES:
// ✅ v2.0: Refatoração completa
//          - OAuth OIDC real (redirect para login Globo)
//          - Interface com 4 abas: Sugerido | Escalar | Não Escalaram | Meu Time
//          - Removido login direto com email/senha

// DEPOIS:
// ✅ v2.1: Correcao de inconsistencia
//          - OAuth OIDC como metodo PRINCIPAL (redirect para login Globo)
//          - Login direto com email/senha como FALLBACK (contas antigas)
//          - Aviso sobre limitacao de contas Google OAuth
//          - Interface com 4 abas: Sugerido | Escalar | Nao Escalaram | Meu Time
```

**Motivo:** Alinhar documentacao com realidade do codigo.

---

### Mudanca 2: Substituir Funcao `mostrarTelaConexao()`

**Linhas 90-193: SUBSTITUIR FUNCAO INTEIRA**

```javascript
// ANTES (linhas 90-193): Mostra formulario email/senha diretamente

// DEPOIS: Nova versao OAuth-first
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

                <!-- Aviso sobre contas Google -->
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

**Motivo:** Reorganizar UI para OAuth-first com fallback visivel.

---

### Mudanca 3: Adicionar Funcao `mostrarFormularioEmail()`

**Linha 193: ADICIONAR APOS `mostrarTelaConexao()`**

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
            <!-- Header com Voltar -->
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
                           placeholder="********">
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

**Motivo:** Separar formulario email/senha em tela propria com botao voltar.

---

### Mudanca 4: Atualizar Exports do Modulo

**Linhas 723-731: SUBSTITUIR**

```javascript
// ANTES:
window.CartolaProModule = {
    abrirModal,
    fecharModal,
    iniciarOAuth,
    fazerLogin,
    trocarAba,
    colarTimeSugerido,
    desconectar
};

// DEPOIS:
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

**Motivo:** Expor novas funcoes para uso nos onclick do HTML.

---

### Mudanca 5: Atualizar Log de Carregamento

**Linha 736: SUBSTITUIR**

```javascript
// ANTES:
if (window.Log) Log.info("CARTOLA-PRO", "✅ Módulo v2.0 carregado (OAuth + 4 Abas)");

// DEPOIS:
if (window.Log) Log.info("CARTOLA-PRO", "Modulo v2.1 carregado (OAuth-first + Fallback)");
```

**Motivo:** Atualizar versao no log.

---

## Mapa de Dependencias

```
participante-cartola-pro.js (MODIFICAR)
    |
    |-> participante-dicas.js (NAO MODIFICAR)
    |   └── Chama: window.abrirCartolaPro() -> abrirModal()
    |
    |-> participante-boas-vindas.js (NAO MODIFICAR)
    |   └── Chama: window.abrirCartolaPro() -> abrirModal()
    |
    |-> Backend (NAO MODIFICAR)
        ├── routes/cartola-pro-routes.js
        |   └── POST /api/cartola-pro/auth (ja existe)
        └── config/globo-oauth.js
            └── GET /api/cartola-pro/oauth/login (ja existe)
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] **Nenhum impacto** - Correcao e apenas UI/UX no frontend
- [x] Nenhuma query ao banco de dados modificada
- [x] Endpoints backend permanecem inalterados

### Autenticacao
- [x] Fluxo OAuth mantido intacto (`iniciarOAuth()`)
- [x] Fluxo login direto mantido intacto (`fazerLogin()`)
- [x] Nenhuma nova rota criada

---

## Casos de Teste

### Teste 1: Fluxo OAuth (Principal)

**Setup:** Usuario nao autenticado
**Acao:**
1. Abrir modal Cartola PRO
2. Verificar que botao "Conectar com Globo" aparece em destaque
3. Clicar no botao
**Resultado Esperado:** Redirect para `goidc.globo.com`

### Teste 2: Fluxo Login Direto (Fallback)

**Setup:** Usuario nao autenticado
**Acao:**
1. Abrir modal Cartola PRO
2. Clicar em "Usar email e senha (contas antigas)"
3. Verificar que formulario aparece com botao voltar
4. Preencher credenciais validas
5. Clicar "Conectar"
**Resultado Esperado:** Login bem-sucedido, mostra interface com abas

### Teste 3: Voltar da Tela de Login Direto

**Setup:** Tela de formulario email/senha aberta
**Acao:**
1. Clicar no botao voltar (arrow_back)
**Resultado Esperado:** Retorna para tela principal com botao OAuth

### Teste 4: Conta Google (Cenario de Erro)

**Setup:** Usuario com conta Globo criada via Google
**Acao:**
1. Abrir modal
2. Ir para login direto
3. Tentar logar com credenciais
**Resultado Esperado:** Erro 401/406 exibido, mensagem orienta usar OAuth

---

## Rollback Plan

### Em Caso de Falha

**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Nao ha alteracoes de banco de dados
3. Nao ha cache a limpar (frontend apenas)

**Arquivo Unico:**
- `public/participante/js/modules/participante-cartola-pro.js`

---

## Checklist de Validacao

### Antes de Implementar
- [x] Arquivo original completo lido (737 linhas)
- [x] Dependentes identificados (dicas.js, boas-vindas.js)
- [x] Confirmado que dependentes NAO precisam mudar
- [x] Backend verificado - ja suporta ambos fluxos
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Testes planejados

### Durante Implementacao
- [ ] Corrigir comentarios (linhas 6-10)
- [ ] Substituir `mostrarTelaConexao()` (linhas 90-193)
- [ ] Adicionar `mostrarFormularioEmail()` (apos linha 193)
- [ ] Atualizar exports (linhas 723-731)
- [ ] Atualizar log (linha 736)

### Apos Implementacao
- [ ] Testar fluxo OAuth
- [ ] Testar fluxo login direto
- [ ] Testar botao voltar
- [ ] Verificar logs no console

---

## Ordem de Execucao

1. **Mudanca 1:** Corrigir comentarios cabecalho
2. **Mudanca 2:** Substituir `mostrarTelaConexao()`
3. **Mudanca 3:** Adicionar `mostrarFormularioEmail()` e `voltarTelaConexao()`
4. **Mudanca 4:** Atualizar exports do modulo
5. **Mudanca 5:** Atualizar log de carregamento
6. **Teste:** Validar todos os fluxos

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-correcao-inconsistencia-cartola-pro-auth.md
```

---

**Gerado por:** Spec Protocol v1.0

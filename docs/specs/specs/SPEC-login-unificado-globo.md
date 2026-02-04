# SPEC - Login Unificado Globo para Participante Premium

**Data:** 2026-01-22
**Baseado em:** PRD-login-unificado-globo.md
**Status:** Especificacao Tecnica
**Autor:** Claude (Spec Protocol)

---

## Resumo da Implementacao

Implementar login unificado via Globo para participantes premium (assinantes Cartola PRO). O sistema detecta automaticamente se o time_id digitado pertence a um assinante e oferece a opcao "Entrar com Globo". Apos autenticacao Globo, o backend obtem o time_id via API `/auth/time`, busca a liga correspondente, e cria sessao unificada (`participante` + `cartolaProAuth`) em um unico passo, eliminando a necessidade de dois logins separados.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. routes/participante-auth.js - BACKEND PRINCIPAL

**Path:** `routes/participante-auth.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** index.js (ja registra rotas), config/globo-oauth.js

#### Mudancas Cirurgicas:

**Linha 1-4: ADICIONAR imports necessarios**
```javascript
// ANTES:
import express from "express";
import session from "express-session";

const router = express.Router();

// DEPOIS:
import express from "express";
import session from "express-session";
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import { getGloboOidcConfig } from "../config/globo-oauth.js";
import cartolaProService from "../services/cartolaProService.js";

const router = express.Router();
```
**Motivo:** Importar dependencias OAuth e servico Cartola PRO para login unificado

---

**Linha 29 (apos middleware verificarSessaoParticipante): ADICIONAR endpoint check-assinante**
```javascript
// ADICIONAR APOS LINHA 28:

// =====================================================================
// GET /check-assinante/:timeId - Verifica se time e assinante
// =====================================================================
router.get("/check-assinante/:timeId", async (req, res) => {
    try {
        const { timeId } = req.params;

        if (!timeId || isNaN(parseInt(timeId))) {
            return res.status(400).json({ assinante: false, error: "ID invalido" });
        }

        const { default: Time } = await import("../models/Time.js");
        const time = await Time.findOne({ id: parseInt(timeId) }).select("assinante nome_cartola");

        res.json({
            assinante: time?.assinante === true,
            nomeCartola: time?.nome_cartola || null
        });

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro ao verificar assinante:", error);
        res.json({ assinante: false });
    }
});
```
**Motivo:** Endpoint para frontend detectar se deve exibir botao "Entrar com Globo"

---

**Linha 29 (continuacao): ADICIONAR rotas de login unificado Globo**
```javascript
// =====================================================================
// REGISTRY DE STRATEGIES PARA LOGIN UNIFICADO
// =====================================================================
const registeredUnifiedStrategies = new Set();

function ensureUnifiedGloboStrategy(domain, config) {
    const strategyName = `globo-unified:${domain}`;

    if (!registeredUnifiedStrategies.has(strategyName)) {
        console.log("[PARTICIPANTE-AUTH] Criando strategy unificada para:", domain);

        const strategy = new Strategy(
            {
                name: strategyName,
                config,
                scope: "openid email profile",
                callbackURL: `https://${domain}/api/participante/auth/globo/callback`
            },
            async (tokens, done) => {
                try {
                    const claims = tokens.claims();
                    const user = {
                        globo_id: claims.globo_id || claims.sub,
                        glbid: claims.glbid || claims.fs_id,
                        email: claims.email,
                        nome: claims.name || claims.preferred_username,
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        expires_at: claims.exp
                    };
                    done(null, user);
                } catch (error) {
                    done(error);
                }
            }
        );

        passport.use(strategy);
        registeredUnifiedStrategies.add(strategyName);
    }

    return strategyName;
}

// =====================================================================
// GET /globo/login - Inicia fluxo OAuth para login unificado
// =====================================================================
router.get("/globo/login", async (req, res, next) => {
    console.log("[PARTICIPANTE-AUTH] Iniciando OAuth unificado...");

    try {
        const config = await getGloboOidcConfig();
        const strategyName = ensureUnifiedGloboStrategy(req.hostname, config);

        passport.authenticate(strategyName, {
            prompt: "login consent",
            scope: ["openid", "email", "profile"]
        })(req, res, next);

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro ao iniciar OAuth:", error);
        res.redirect("/participante-login.html?error=oauth_init_failed");
    }
});

// =====================================================================
// GET /globo/callback - Processa retorno OAuth e cria sessao unificada
// =====================================================================
router.get("/globo/callback", async (req, res, next) => {
    console.log("[PARTICIPANTE-AUTH] Callback OAuth unificado recebido");

    if (req.query.error) {
        console.error("[PARTICIPANTE-AUTH] Erro retornado pela Globo:", req.query.error);
        return res.redirect(`/participante-login.html?error=${req.query.error}`);
    }

    try {
        const config = await getGloboOidcConfig();
        const strategyName = ensureUnifiedGloboStrategy(req.hostname, config);

        passport.authenticate(strategyName, {
            failureRedirect: "/participante-login.html?error=oauth_failed"
        })(req, res, async (err) => {
            if (err || !req.user) {
                console.error("[PARTICIPANTE-AUTH] Erro no callback:", err?.message);
                return res.redirect("/participante-login.html?error=oauth_callback_error");
            }

            try {
                // 1. Obter token para API Globo
                const glbToken = req.user.glbid || req.user.access_token;

                if (!glbToken) {
                    return res.redirect("/participante-login.html?error=no_token");
                }

                // 2. Buscar time_id via API Globo /auth/time
                const timeResult = await cartolaProService.buscarMeuTime(glbToken);

                if (!timeResult.success || !timeResult.time?.timeId) {
                    console.error("[PARTICIPANTE-AUTH] Nao foi possivel obter time_id da Globo");
                    return res.redirect("/participante-login.html?error=no_time_globo");
                }

                const timeIdGlobo = timeResult.time.timeId;
                console.log("[PARTICIPANTE-AUTH] Time ID obtido da Globo:", timeIdGlobo);

                // 3. Verificar se time e assinante
                const { default: Time } = await import("../models/Time.js");
                const timeData = await Time.findOne({ id: timeIdGlobo }).select("assinante nome_cartola nome_time clube_id url_escudo_png");

                if (!timeData || !timeData.assinante) {
                    console.warn("[PARTICIPANTE-AUTH] Time nao e assinante:", timeIdGlobo);
                    return res.redirect("/participante-login.html?error=not_subscriber");
                }

                // 4. Buscar liga do participante
                const { default: Liga } = await import("../models/Liga.js");
                const ligaEncontrada = await Liga.findOne({
                    "participantes.time_id": timeIdGlobo
                });

                if (!ligaEncontrada) {
                    console.warn("[PARTICIPANTE-AUTH] Time nao encontrado em nenhuma liga:", timeIdGlobo);
                    return res.redirect("/participante-login.html?error=no_league");
                }

                // 5. Extrair dados do participante
                const participanteEncontrado = ligaEncontrada.participantes.find(
                    (p) => String(p.time_id) === String(timeIdGlobo)
                );

                // 6. Montar dados reais do time
                const dadosReais = {
                    nome_cartola: timeData.nome_cartola || participanteEncontrado?.nome_cartola || "Cartoleiro",
                    nome_time: timeData.nome_time || participanteEncontrado?.nome_time || "Meu Time",
                    foto_perfil: participanteEncontrado?.foto_perfil || "",
                    foto_time: timeData.url_escudo_png || "",
                    clube_id: timeData.clube_id || participanteEncontrado?.clube_id || null
                };

                // 7. Configurar sessao longa (365 dias para login Globo)
                const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
                req.session.cookie.maxAge = ONE_YEAR;

                // 8. CRIAR SESSAO UNIFICADA
                // Sessao participante (navegacao do app)
                req.session.participante = {
                    timeId: String(timeIdGlobo),
                    ligaId: ligaEncontrada._id.toString(),
                    participante: dadosReais
                };

                // Sessao Cartola PRO (funcionalidades premium)
                req.session.cartolaProAuth = {
                    globo_id: req.user.globo_id,
                    glbid: glbToken,
                    email: req.user.email,
                    nome: req.user.nome,
                    access_token: req.user.access_token,
                    refresh_token: req.user.refresh_token,
                    expires_at: req.user.expires_at,
                    authenticated_at: Date.now(),
                    method: "unified_oauth"
                };

                // 9. Salvar sessao
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error("[PARTICIPANTE-AUTH] Erro ao salvar sessao unificada:", saveErr);
                        return res.redirect("/participante-login.html?error=session_save_error");
                    }

                    console.log("[PARTICIPANTE-AUTH] Sessao unificada criada com sucesso:", {
                        timeId: timeIdGlobo,
                        email: req.user.email
                    });

                    // Redirecionar para app do participante
                    res.redirect("/participante/");
                });

            } catch (innerError) {
                console.error("[PARTICIPANTE-AUTH] Erro ao criar sessao unificada:", innerError);
                res.redirect("/participante-login.html?error=session_error");
            }
        });

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro no callback (catch):", error);
        res.redirect("/participante-login.html?error=oauth_exception");
    }
});

// =====================================================================
// POST /globo/direct - Login direto Globo (email/senha) para dominios customizados
// =====================================================================
router.post("/globo/direct", async (req, res) => {
    console.log("[PARTICIPANTE-AUTH] Login direto Globo...");

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email e senha sao obrigatorios"
            });
        }

        // 1. Autenticar na Globo
        const authResult = await cartolaProService.autenticar(email, password);

        if (!authResult.success) {
            return res.status(401).json({
                success: false,
                error: authResult.error || "Credenciais invalidas"
            });
        }

        const glbToken = authResult.glbId;

        // 2. Buscar time_id via API Globo /auth/time
        const timeResult = await cartolaProService.buscarMeuTime(glbToken);

        if (!timeResult.success || !timeResult.time?.timeId) {
            return res.status(400).json({
                success: false,
                error: "Nao foi possivel obter seu time da conta Globo"
            });
        }

        const timeIdGlobo = timeResult.time.timeId;
        console.log("[PARTICIPANTE-AUTH] Time ID obtido via login direto:", timeIdGlobo);

        // 3. Verificar se time e assinante
        const { default: Time } = await import("../models/Time.js");
        const timeData = await Time.findOne({ id: timeIdGlobo }).select("assinante nome_cartola nome_time clube_id url_escudo_png");

        if (!timeData || !timeData.assinante) {
            return res.status(403).json({
                success: false,
                error: "Esta conta nao e assinante PRO"
            });
        }

        // 4. Buscar liga do participante
        const { default: Liga } = await import("../models/Liga.js");
        const ligaEncontrada = await Liga.findOne({
            "participantes.time_id": timeIdGlobo
        });

        if (!ligaEncontrada) {
            return res.status(404).json({
                success: false,
                error: "Time nao encontrado em nenhuma liga cadastrada"
            });
        }

        // 5. Extrair dados do participante
        const participanteEncontrado = ligaEncontrada.participantes.find(
            (p) => String(p.time_id) === String(timeIdGlobo)
        );

        // 6. Montar dados reais
        const dadosReais = {
            nome_cartola: timeData.nome_cartola || participanteEncontrado?.nome_cartola || "Cartoleiro",
            nome_time: timeData.nome_time || participanteEncontrado?.nome_time || "Meu Time",
            foto_perfil: participanteEncontrado?.foto_perfil || "",
            foto_time: timeData.url_escudo_png || "",
            clube_id: timeData.clube_id || participanteEncontrado?.clube_id || null
        };

        // 7. Configurar sessao longa
        const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
        req.session.cookie.maxAge = ONE_YEAR;

        // 8. CRIAR SESSAO UNIFICADA
        req.session.participante = {
            timeId: String(timeIdGlobo),
            ligaId: ligaEncontrada._id.toString(),
            participante: dadosReais
        };

        req.session.cartolaProAuth = {
            glbid: glbToken,
            email: email,
            authenticated_at: Date.now(),
            method: "unified_direct"
        };

        // 9. Salvar sessao
        req.session.save((saveErr) => {
            if (saveErr) {
                console.error("[PARTICIPANTE-AUTH] Erro ao salvar sessao:", saveErr);
                return res.status(500).json({
                    success: false,
                    error: "Erro ao criar sessao"
                });
            }

            console.log("[PARTICIPANTE-AUTH] Sessao unificada (direct) criada:", timeIdGlobo);

            res.json({
                success: true,
                participante: {
                    nome: dadosReais.nome_cartola,
                    time: dadosReais.nome_time
                }
            });
        });

    } catch (error) {
        console.error("[PARTICIPANTE-AUTH] Erro no login direto:", error);
        res.status(500).json({
            success: false,
            error: "Erro interno ao processar login"
        });
    }
});
```
**Motivo:** Implementar os 3 endpoints novos para login unificado (check-assinante, OAuth callback, login direto)

---

### 2. public/participante-login.html - FRONTEND

**Path:** `public/participante-login.html`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** Nenhum (arquivo standalone)

#### Mudancas Cirurgicas:

**Linha 592 (apos fechamento do options-row): ADICIONAR secao de login Globo**
```html
<!-- ADICIONAR APOS LINHA 592 (apos </div> do options-row) -->

                <!-- Secao Login Globo (inicialmente oculta) -->
                <div id="globoLoginSection" style="display: none;" class="globo-section">
                    <!-- Divisor -->
                    <div class="divider-row">
                        <div class="divider-line"></div>
                        <span class="divider-text">ou entre com</span>
                        <div class="divider-line"></div>
                    </div>

                    <!-- Botao OAuth (dominios Replit) -->
                    <button type="button" id="btnGloboOAuth" onclick="loginGlobo('oauth')" class="globo-btn oauth-btn">
                        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">account_circle</span>
                        <span>Entrar com Conta Globo</span>
                    </button>

                    <!-- Formulario Login Direto (dominios customizados) -->
                    <div id="globoDirectForm" style="display: none;">
                        <div class="input-wrapper" style="margin-top: 12px;">
                            <span class="material-symbols-outlined input-icon">mail</span>
                            <input type="email" id="globoEmail" class="input-field input-glow" placeholder="Email da conta Globo" />
                        </div>
                        <div class="input-wrapper" style="margin-top: 12px;">
                            <span class="material-symbols-outlined input-icon">key</span>
                            <input type="password" id="globoSenha" class="input-field input-glow" placeholder="Senha da conta Globo" />
                        </div>
                        <button type="button" onclick="loginGlobo('direct')" class="globo-btn direct-btn" style="margin-top: 12px;">
                            <span class="material-symbols-outlined">login</span>
                            <span>Conectar</span>
                        </button>
                    </div>

                    <!-- Aviso -->
                    <p class="globo-hint">
                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">verified</span>
                        Login unico: acesse o app e recursos PRO de uma vez
                    </p>
                </div>
```
**Motivo:** Adicionar UI para login via Globo quando assinante

---

**Linha 470 (dentro do bloco style, antes do fechamento): ADICIONAR estilos Globo**
```css
/* ADICIONAR ANTES DO FECHAMENTO DO </style> (linha ~470) */

            /* Secao Login Globo */
            .globo-section {
                margin-top: 20px;
                padding-top: 16px;
            }

            .divider-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }

            .divider-line {
                flex: 1;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,69,0,0.3), transparent);
            }

            .divider-text {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.4);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .globo-btn {
                display: flex;
                width: 100%;
                height: 52px;
                align-items: center;
                justify-content: center;
                gap: 10px;
                border-radius: 12px;
                border: none;
                font-family: inherit;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .oauth-btn {
                background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
                color: #fff;
                box-shadow: 0 4px 15px rgba(26, 115, 232, 0.3);
            }

            .oauth-btn:hover {
                box-shadow: 0 6px 20px rgba(26, 115, 232, 0.4);
            }

            .oauth-btn:active {
                transform: scale(0.98);
            }

            .direct-btn {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: #fff;
            }

            .globo-hint {
                margin-top: 12px;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
                text-align: center;
            }

            .globo-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }
```
**Motivo:** Estilizar componentes de login Globo

---

**Linha 700 (dentro do script, antes do fechamento): ADICIONAR funcoes JavaScript**
```javascript
// ADICIONAR ANTES DO FECHAMENTO DO </script> (linha ~700, apos funcao fazerLogin)

            // =====================================================================
            // DETECCAO DE ASSINANTE E LOGIN GLOBO
            // =====================================================================

            // Detectar se dominio suporta OAuth
            function isOAuthDisponivel() {
                const hostname = window.location.hostname;
                const dominiosPermitidos = [
                    'localhost', '127.0.0.1',
                    '.replit.dev', '.repl.co', '.replit.app'
                ];
                return dominiosPermitidos.some(d => {
                    if (d.startsWith('.')) return hostname.endsWith(d);
                    return hostname === d;
                });
            }

            // Configurar interface baseada no dominio
            function configurarInterfaceGlobo() {
                const oauthBtn = document.getElementById('btnGloboOAuth');
                const directForm = document.getElementById('globoDirectForm');

                if (isOAuthDisponivel()) {
                    // Dominio Replit: mostrar botao OAuth
                    if (oauthBtn) oauthBtn.style.display = 'flex';
                    if (directForm) directForm.style.display = 'none';
                } else {
                    // Dominio customizado: mostrar formulario direto
                    if (oauthBtn) oauthBtn.style.display = 'none';
                    if (directForm) directForm.style.display = 'block';
                }
            }

            // Verificar se e assinante quando time_id perde foco
            const timeIdInput = document.getElementById('timeId');
            const globoSection = document.getElementById('globoLoginSection');

            let debounceTimer = null;
            timeIdInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(verificarAssinante, 500);
            });

            timeIdInput.addEventListener('blur', verificarAssinante);

            async function verificarAssinante() {
                const timeId = timeIdInput.value.trim();

                if (!timeId || timeId.length < 5) {
                    if (globoSection) globoSection.style.display = 'none';
                    return;
                }

                try {
                    const response = await fetch(`/api/participante/auth/check-assinante/${timeId}`);
                    const data = await response.json();

                    if (data.assinante) {
                        if (globoSection) {
                            globoSection.style.display = 'block';
                            configurarInterfaceGlobo();
                        }
                    } else {
                        if (globoSection) globoSection.style.display = 'none';
                    }
                } catch (error) {
                    console.log('Erro ao verificar assinante:', error);
                    if (globoSection) globoSection.style.display = 'none';
                }
            }

            // Funcao principal de login Globo
            async function loginGlobo(metodo) {
                const errorMessage = document.getElementById('errorMessage');
                const errorText = document.getElementById('errorText');
                const loading = document.getElementById('loading');

                if (metodo === 'oauth') {
                    // Redirecionar para OAuth
                    loading.classList.add('show');
                    window.location.href = '/api/participante/auth/globo/login';
                    return;
                }

                if (metodo === 'direct') {
                    const email = document.getElementById('globoEmail')?.value;
                    const senha = document.getElementById('globoSenha')?.value;

                    if (!email || !senha) {
                        errorText.textContent = 'Preencha email e senha da conta Globo';
                        errorMessage.classList.add('show');
                        return;
                    }

                    loading.classList.add('show');
                    errorMessage.classList.remove('show');

                    try {
                        const response = await fetch('/api/participante/auth/globo/direct', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ email, password: senha })
                        });

                        const data = await response.json();

                        if (!response.ok || !data.success) {
                            throw new Error(data.error || 'Erro ao conectar com Globo');
                        }

                        // Limpar chave do app
                        sessionStorage.removeItem('participante_app_loaded');

                        // Redirecionar para app
                        window.location.href = '/participante/';

                    } catch (error) {
                        loading.classList.remove('show');
                        errorText.textContent = error.message;
                        errorMessage.classList.add('show');
                    }
                }
            }

            // Verificar erros de OAuth no carregamento
            window.addEventListener('load', function() {
                const urlParams = new URLSearchParams(window.location.search);
                const error = urlParams.get('error');

                if (error) {
                    const errorMessage = document.getElementById('errorMessage');
                    const errorText = document.getElementById('errorText');

                    const mensagens = {
                        'oauth_init_failed': 'Erro ao iniciar conexao com Globo',
                        'oauth_failed': 'Falha na autenticacao Globo',
                        'oauth_callback_error': 'Erro ao processar retorno da Globo',
                        'no_token': 'Token de autenticacao nao recebido',
                        'no_time_globo': 'Nao foi possivel obter seu time da conta Globo',
                        'not_subscriber': 'Esta conta nao e assinante Cartola PRO',
                        'no_league': 'Time nao encontrado em nenhuma liga cadastrada',
                        'session_save_error': 'Erro ao criar sessao',
                        'session_error': 'Erro interno ao processar sessao'
                    };

                    errorText.textContent = mensagens[error] || 'Erro na autenticacao';
                    errorMessage.classList.add('show');

                    // Limpar URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            });
```
**Motivo:** Implementar logica de deteccao de assinante e login unificado no frontend

---

### 3. config/globo-oauth.js - EXPORTAR FUNCAO

**Path:** `config/globo-oauth.js`
**Tipo:** Modificacao
**Impacto:** Baixo
**Dependentes:** routes/participante-auth.js, routes/cartola-pro-routes.js

#### Mudancas Cirurgicas:

**Linha 396 (final do arquivo): JA EXPORTADO**
```javascript
// VERIFICAR QUE JA EXISTE (linha 396):
export { getGloboOidcConfig };

// NAO PRECISA MODIFICAR - JA ESTA CORRETO
```
**Motivo:** Funcao `getGloboOidcConfig` ja esta exportada, apenas confirmar

---

## Mapa de Dependencias

```
routes/participante-auth.js (PRINCIPAL)
    |
    |-> config/globo-oauth.js [IMPORTAR getGloboOidcConfig]
    |-> services/cartolaProService.js [IMPORTAR buscarMeuTime, autenticar]
    |-> models/Time.js [CONSULTAR assinante]
    |-> models/Liga.js [CONSULTAR participantes]
    |
    +-> index.js [JA REGISTRA - linha 317]
        app.use("/api/participante/auth", participanteAuthRoutes);

public/participante-login.html (FRONTEND)
    |
    |-> GET /api/participante/auth/check-assinante/:timeId [NOVO]
    |-> GET /api/participante/auth/globo/login [NOVO]
    |-> GET /api/participante/auth/globo/callback [NOVO]
    |-> POST /api/participante/auth/globo/direct [NOVO]
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Todas queries incluem `participantes.time_id` para isolamento
- [x] Liga buscada por `Liga.findOne({"participantes.time_id": timeId})`
- [x] Sessao inclui `ligaId` para navegacao isolada

**Queries Afetadas:**
```javascript
// routes/participante-auth.js - Linha ~150 (novo)
Liga.findOne({ "participantes.time_id": timeIdGlobo }); // VALIDADO

// routes/participante-auth.js - Linha ~130 (novo)
Time.findOne({ id: timeIdGlobo }).select("assinante"); // VALIDADO
```

### Autenticacao
- [x] Endpoints OAuth nao requerem sessao previa (e o proposito)
- [x] Login direto valida credenciais via API Globo
- [x] Sessao criada apenas apos validacao completa

### Rate Limiting
```javascript
// index.js - Linha 316 (EXISTENTE, REUTILIZAR)
app.use("/api/participante/auth/login", authRateLimiter);

// ADICIONAR na mesma linha ou proximo:
app.use("/api/participante/auth/globo/direct", authRateLimiter);
```

---

## Casos de Teste

### Teste 1: Assinante digita time_id - botao Globo aparece
**Setup:** Paulinett (time_id: 13935277, assinante: true)
**Acao:**
1. Abrir /participante-login.html
2. Digitar 13935277 no campo ID
3. Aguardar 500ms (debounce)
**Resultado Esperado:** Secao "Entrar com Globo" aparece

### Teste 2: Nao-assinante digita time_id - botao NAO aparece
**Setup:** Qualquer time com assinante: false
**Acao:**
1. Abrir /participante-login.html
2. Digitar ID do time
**Resultado Esperado:** Apenas login tradicional visivel

### Teste 3: OAuth cria sessao unificada (dominio Replit)
**Setup:** Dominio *.replit.app, assinante logado
**Acao:**
1. Digitar time_id assinante
2. Clicar "Entrar com Conta Globo"
3. Autenticar na Globo
**Resultado Esperado:**
- Redirect para /participante/
- `req.session.participante` existe
- `req.session.cartolaProAuth` existe

### Teste 4: Login direto cria sessao unificada (dominio customizado)
**Setup:** Dominio supercartolamanager.com.br
**Acao:**
1. Digitar time_id assinante
2. Preencher email/senha Globo
3. Clicar "Conectar"
**Resultado Esperado:**
- Resposta JSON { success: true }
- Redirect para /participante/
- Ambas sessoes criadas

### Teste 5: Time_id da Globo diferente do cadastrado - erro
**Setup:** Conta Globo com time diferente do cadastrado na liga
**Acao:** Tentar login OAuth
**Resultado Esperado:** Mensagem "Time nao encontrado em nenhuma liga"

### Teste 6: Time nao assinante tenta login Globo - erro
**Setup:** Time com assinante: false
**Acao:** Tentar login OAuth
**Resultado Esperado:** Mensagem "Esta conta nao e assinante PRO"

### Teste 7: Login tradicional continua funcionando
**Setup:** Assinante Paulinett
**Acao:**
1. Digitar time_id
2. Digitar senha tradicional
3. Clicar ENTRAR (botao principal)
**Resultado Esperado:** Login funciona normalmente

### Teste 8: Funcionalidades PRO funcionam apos login unificado
**Setup:** Login via Globo realizado
**Acao:**
1. Abrir modal Cartola PRO
2. Verificar abas disponiveis
**Resultado Esperado:** Modal abre direto nas abas (sem tela de conexao)

---

## Rollback Plan

### Em Caso de Falha

**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Verificar que rotas antigas continuam funcionando
3. Nenhuma alteracao de banco necessaria (apenas novas rotas)

**Impacto do Rollback:**
- Zero impacto em usuarios existentes
- Login tradicional nao foi alterado
- Apenas funcionalidade nova removida

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Apos Implementar
- [ ] Testar check-assinante endpoint
- [ ] Testar OAuth em dominio Replit
- [ ] Testar login direto em dominio customizado
- [ ] Testar erros (time nao assinante, sem liga, etc)
- [ ] Testar login tradicional ainda funciona
- [ ] Testar funcionalidades PRO apos login unificado

---

## Ordem de Execucao (Critico)

1. **Backend primeiro:**
   - routes/participante-auth.js (adicionar imports e novos endpoints)
   - Verificar export de getGloboOidcConfig

2. **Frontend depois:**
   - public/participante-login.html (adicionar secao Globo + estilos + scripts)

3. **Rate Limiting (opcional):**
   - index.js (adicionar rate limiter para /globo/direct)

4. **Testes:**
   - Testar todos os cenarios listados acima
   - Verificar logs no servidor

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-login-unificado-globo.md
```

---

**Gerado por:** Spec Protocol v1.0
**Skill:** /spec (High Senior Protocol)

# 📦 Sistema de Versionamento - Super Cartola Manager

## 🎯 Visão Geral

O sistema de versionamento é responsável por:
- ✅ Exibir a versão atual no **header do app participante**
- ✅ Detectar quando há uma **nova versão disponível**
- ✅ **Forçar atualização** através de modal que o participante deve aceitar
- ✅ Gerenciar cache PWA e Service Worker
- ✅ Suportar versionamento **separado** para Admin e App Participante

## 📂 Arquivos do Sistema

### Backend
- `config/appVersion.js` - Gera versões automaticamente baseado em timestamps
- `config/version-scope.json` - Define quais arquivos pertencem a cada escopo (admin/app)
- `routes/appVersionRoutes.js` - API endpoints de versionamento
- `index.js` - Registra as rotas (linha ~88 e ~266)

### Frontend - App Participante
- `public/js/app/app-version.js` - Cliente JavaScript que verifica versões
- `public/css/app/app-version.css` - Estilos do badge e modal
- `public/participante/index.html` - Carrega scripts e CSS
- `public/participante/js/participante-auth.js` - Inicializa o sistema
- `public/participante/service-worker.js` - Service Worker PWA

## 🔧 Como Funciona

### 1. Badge no Header

O badge de versão aparece no header do app, ao lado do nome do cartoleiro:

```html
<span id="app-version-badge" 
      class="text-[9px] bg-white/10 px-1.5 py-0.5 rounded ml-1">
</span>
```

**Localização:** Linha 761 de `public/participante/index.html`

### 2. Inicialização

O sistema é inicializado automaticamente após o login:

```javascript
// Em participante-auth.js (linhas 663-675)
if (window.AppVersion) {
    await window.AppVersion.init();
}
```

O `init()` faz:
1. Registra o Service Worker
2. Verifica a versão no servidor
3. Atualiza o badge no header
4. Configura listener para quando app volta do background

### 3. Verificação de Versão

**Endpoint:** `GET /api/app/check-version`

**Headers enviados:**
```javascript
{
    "x-client-type": "app" // ou "admin"
}
```

**Resposta:**
```json
{
    "version": "19.12.24.1430",
    "build": "191224",
    "deployedAt": "2024-12-19T14:30:00.000Z",
    "area": "participante",
    "releaseNotes": "Atualização do app",
    "lastModifiedFile": "public/participante/js/participante-rodadas.js",
    "clientDetected": "app",
    "timestamp": "2024-12-19T14:30:15.234Z"
}
```

### 4. Modal de Atualização Forçada

Quando detecta nova versão:

1. **Compara** versão local (localStorage) vs servidor
2. **Exibe modal** com:
   - Ícone animado 🚀
   - Mensagem de nova versão disponível
   - Número da versão
   - Botão "Atualizar Agora"
3. **Usuário DEVE** clicar em "Atualizar Agora"
4. **Sistema limpa**:
   - localStorage
   - Service Worker cache
   - Força reload da página

```javascript
// Código de atualização (app-version.js, linha 235-255)
atualizarAgora() {
    localStorage.removeItem(this.LOCAL_KEY);
    
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ 
            type: 'SKIP_WAITING' 
        });
    }
    
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
    
    setTimeout(() => {
        window.location.reload(true);
    }, 500);
}
```

## 📊 Formato da Versão

Formato: **DD.MM.YY.HHmm** (timestamp de Brasília)

Exemplo: `19.12.24.1430` = 19 de Dezembro de 2024 às 14:30

**Vantagens:**
- ✅ Ordenação natural (string comparison funciona)
- ✅ Legível para humanos
- ✅ Inclui data E hora
- ✅ Detecta qualquer mudança automaticamente

## 🔄 Versionamento Separado

O sistema detecta automaticamente se é Admin ou App:

### Detecção de Cliente (prioridade):

1. **Header `x-client-type`**: "admin" | "app"
2. **Query param**: `?client=admin` ou `?client=app`
3. **Referer**: URL que fez a requisição
4. **User-Agent**: Mobile = app, Desktop = admin

### Escopos de Arquivos:

Definidos em `config/version-scope.json`:

- **scope_app**: Arquivos do app participante
  - `public/participante/**/*.js`
  - `public/participante/**/*.html`
  - `public/participante/**/*.css`

- **scope_admin**: Arquivos do painel admin
  - `public/painel/**/*.js`
  - `public/js/painel/**/*.js`
  - `public/*.html` (exceto participante)

- **shared**: Arquivos compartilhados
  - `public/js/core/**/*.js`
  - `public/css/styles.css`

**Regra:** Se arquivo shared muda, AMBOS atualizam.

## 🚀 Endpoints Disponíveis

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/app/check-version` | ✅ **Principal** - Versão baseada no cliente |
| `GET /api/app/versao` | Legacy - Versão do app |
| `GET /api/app/versao/participante` | Versão específica do app |
| `GET /api/app/versao/admin` | Versão específica do admin |
| `GET /api/app/versao/all` | Todas as versões + debug |
| `GET /api/app/versao/scope` | Config de escopos |
| `GET /api/app/versao/debug` | Info completa p/ troubleshooting |

## 🐛 Troubleshooting

### Badge não aparece?

1. Verificar se script está carregado:
   ```javascript
   console.log(window.AppVersion);
   ```

2. Verificar se foi inicializado:
   ```javascript
   // Deve aparecer no console:
   // "📦 Sistema de versionamento inicializado"
   ```

3. Verificar elemento no DOM:
   ```javascript
   document.getElementById('app-version-badge');
   ```

### Modal não aparece?

1. Limpar localStorage:
   ```javascript
   localStorage.removeItem('app_version');
   ```

2. Recarregar a página (deve pedir para atualizar)

### Versão não muda?

1. Verificar se arquivo foi realmente modificado
2. Verificar `lastModifiedFile` no endpoint:
   ```bash
   curl http://localhost:5000/api/app/versao/debug
   ```

3. Forçar rebuild:
   ```bash
   touch public/participante/index.html
   ```

## 📝 Como Forçar Atualização

Quando você quer que todos os participantes atualizem:

1. **Modificar qualquer arquivo** do scope_app:
   ```bash
   touch public/participante/js/participante-rodadas.js
   ```

2. **Ou modificar arquivo shared**:
   ```bash
   touch public/js/core/api-client.js
   ```

3. **Deploy/Restart** do servidor

4. Próximo acesso dos participantes → Modal de atualização

## ✅ Checklist de Funcionamento

- [x] Script `/js/app/app-version.js` carregado
- [x] CSS `/css/app/app-version.css` carregado  
- [x] Badge `#app-version-badge` existe no HTML
- [x] Rota `/api/app/*` registrada no index.js
- [x] `AppVersion.init()` chamado no participante-auth.js
- [x] Service Worker registrado
- [x] Modal de atualização funcional

## 🎨 Personalização

### Alterar Estilo do Badge

Edite `public/css/app/app-version.css`:

```css
.app-version-badge {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.1);
    /* ... */
}
```

### Alterar Estilo do Modal

Mesma arquivo, seção `.app-update-modal`:

```css
.app-update-modal {
    background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 16px;
    /* ... */
}
```

### Alterar Mensagem do Modal

Edite `public/js/app/app-version.js`, função `mostrarModalAtualizacao()`:

```javascript
const notas = "Nova versão com melhorias e correções!";
```

## 📚 Referências

- Configuração de escopos: `config/version-scope.json`
- Geração de versões: `config/appVersion.js`
- API routes: `routes/appVersionRoutes.js`
- Cliente JS: `public/js/app/app-version.js`
- Service Worker: `public/participante/service-worker.js`

---

**Última atualização:** 19 de Dezembro de 2024  
**Versão da Documentação:** 1.0



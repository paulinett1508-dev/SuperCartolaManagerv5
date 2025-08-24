# 🚀 PROJECT HANDOVER

**Data:** 24/08/2025  
**Ambiente:** Replit

## 📋 RESUMO EXECUTIVO

Projeto Backend/API

## 🛠️ STACK TECNOLÓGICA

- Express.js
- Static Assets

## 📁 ESTRUTURA DO PROJETO

```
📄 .env
📁 .local/
  📁 share/

📁 .upm/
  📄 store.json
📄 DOCUMENTACAO_COMPLETA.html
📄 backupJson.js
📄 backupScheduler.js
📁 backups/
  📄 artilheirocampeaos.json
  📄 goleiros.json
  📄 gols.json
  📄 ligas.json
  📄 rodadas.json
  📄 times.json
📁 config/
  📄 database.js
📁 controllers/
  📄 artilheiroCampeaoController.js
  📄 cartolaController.js
  📄 golsController.js
  📄 ligaController.js
  📄 luvaDeOuroController.js
  📄 rodadaController.js
  📄 timeController.js
📄 credentials.json
📄 doc-version.json
📄 estrutura_selecionada.html
📄 handover.js
📄 index.js
📄 listar_estrutura.py
📁 models/
  📄 ArtilheiroCampeao.js
  📄 Goleiros.js
  📄 Gols.js
  📄 Liga.js
  📄 Rodada.js
  📄 Time.js
📄 package-lock.json
📄 package.json
📁 public/
  📄 admin.html
  📄 buscar-times.html
  📄 criar-liga.html
  📄 criar-liga.js
  📄 criar.html
  📄 dashboard.html
  📄 detalhe-liga.css
  📄 detalhe-liga.html
📁 routes/
  📄 artilheiro-campeao-routes.js
  📄 cartola-proxy.js
  📄 cartola.js
  📄 configuracao-routes.js
  📄 gols.js
  📄 ligas.js
  📄 luva-de-ouro-routes.js
  📄 rodadas-routes.js
```

## ⚡ COMANDOS ESSENCIAIS

- **start:** `NODE_ENV=production node index.js`
- **dev:** `NODE_ENV=development nodemon index.js`
- **test:** `NODE_ENV=test NODE_OPTIONS='--experimental-vm-modules' jest --detectOpenHandles --forceExit`
- **test:watch:** `NODE_ENV=test NODE_OPTIONS='--experimental-vm-modules' jest --watch --detectOpenHandles`
- **test:coverage:** `NODE_ENV=test NODE_OPTIONS='--experimental-vm-modules' jest --coverage --detectOpenHandles --forceExit`
- **test:artilheiro:** `NODE_ENV=test NODE_OPTIONS='--experimental-vm-modules' jest test/artilheiro.test.js --detectOpenHandles --forceExit`

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente
- `MONGODB_URI`
- `NODE_ENV`
- `PORT`

### Dependências Principais
**Frontend:** @babel/parser, @babel/traverse, axios, cors, dotenv, express


## 💾 BANCO DE DADOS

- MongoDB

## 🌐 APIs/INTEGRAÇÕES

- `https://api.`
- `fetch(https://api`
- `axios.`
- `.get(/api`
- `fetch(/api`

## 🚀 COMO INICIAR

1. **Clone/Fork o projeto no Replit**
2. **Instale dependências:**
   `npm install`
3. **Configure variáveis de ambiente**
4. **Execute o projeto:**
   `npm run dev`

## 📝 PRÓXIMOS PASSOS

- [ ] Revisar configurações de ambiente
- [ ] Testar funcionalidades principais  
- [ ] Verificar integrações externas
- [ ] Atualizar documentação específica

## 🆘 TROUBLESHOOTING

### Problemas Comuns
- **Erro de dependências:** Execute `npm install` ou `pip install -r requirements.txt`
- **Variáveis não definidas:** Verifique arquivo `.env`
- **Porta ocupada:** Mude a porta no Replit ou no código

---
*Handover gerado automaticamente em 24/08/2025, 14:41:13*
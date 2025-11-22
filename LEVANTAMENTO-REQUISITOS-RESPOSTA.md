
# Relatório de Respostas - Levantamento de Requisitos

## 1. Regras de Negócio e Competição

### 1.1 Mata-mata e Empates
**Situação atual:** O sistema utiliza critérios automáticos de desempate baseados em:

1. **Pontuação da rodada do confronto** (primeira prioridade)
2. **Saldo de gols** (segunda prioridade - disponível em `models/Gols.js`)
3. **Confronto direto** (terceira prioridade)

**Localização no código:**
- `public/js/mata-mata/mata-mata-confrontos.js` - Gerencia a lógica de confrontos
- `public/js/mata-mata/mata-mata-financeiro.js` - Calcula premiações

**Intervenção manual:** O admin pode ajustar resultados através do painel administrativo, mas o cálculo inicial é automático.

**Dados MongoDB:**
- Collection: `rodadas` - armazena pontuações por rodada
- Collection: `gols` - armazena estatísticas de gols (utilizado no desempate)

---

### 1.2 Lógica dos "Cards Condicionais"
**Mecânica atual:** Sistema de cards especiais que aparecem condicionalmente baseado em:

- **Posição no ranking** (top 3, zona de rebaixamento, etc.)
- **Desempenho recente** (sequências de vitórias/derrotas)
- **Status financeiro** (adimplência)
- **Conquistas** (campeão do mês, artilheiro)

**Localização no código:**
- `public/js/cards-condicionais.js` - Sistema principal de cards
- `public/participante/js/modules/participante-boas-vindas.js` - Renderização para participantes

**Afeta pontuação?** NÃO. Os cards são informativos/motivacionais e não alteram a pontuação bruta da API do Cartola.

**Tipos de cards:**
- Cards de desempenho (positivo/negativo)
- Cards de alertas financeiros
- Cards de conquistas
- Cards de módulos ativos

---

### 1.3 Luva de Ouro
**Independência:** O módulo "Luva de Ouro" funciona de forma semi-independente:

- **Critério:** Goleiros com menos gols sofridos acumulados
- **Eliminação:** Não há eliminação automática - é um ranking acumulativo
- **Dependência:** Utiliza dados da collection `goleiros` no MongoDB

**Localização no código:**
- `services/goleirosService.js` - Serviço de busca de dados
- `models/Goleiros.js` - Schema do MongoDB
- `public/js/luva-de-ouro/` - Módulos do frontend
- `routes/luva-de-ouro-routes.js` - API endpoints

**Cálculo:**
```javascript
// Ordenação por: menos gols sofridos + mais rodadas disputadas
golsContra (ASC) → rodadasJogadas (DESC)
```

---

### 1.4 Fechamento de Rodada
**Processo atual:** Híbrido - automático com confirmação manual

**Fluxo:**
1. **Automático:** Sistema detecta nova rodada via `cartolaApiService.js`
2. **Automático:** Busca dados dos times participantes
3. **Manual:** Admin confirma processamento através do botão "Processar Rodada"
4. **Automático:** Sistema atualiza:
   - Pontuações (`rodadas` collection)
   - Rankings (`times` collection)
   - Estatísticas (`gols`, `goleiros` collections)
   - Fluxo financeiro (bonificações/penalidades)

**Localização no código:**
- `services/cartolaApiService.js` - Integração com API
- `controllers/rodadaController.js` - Processamento de rodadas
- `routes/rodadas-routes.js` - Endpoints da API

**Cache:** Sistema utiliza cache inteligente (IndexedDB) para evitar reprocessamento:
- `public/js/core/cache-manager.js`
- `models/ExtratoFinanceiroCache.js`

---

## 2. Integração com API do Cartola FC

### 2.1 Estabilidade da API
**Arquitetura atual:**

- **Proxy próprio:** Sim, implementado em `routes/cartola-proxy.js`
- **CORS:** Resolvido através do proxy Node.js
- **Rate limiting:** Não implementado (risco de bloqueio)

**Endpoints principais:**
```javascript
// Mercado e status
GET https://api.cartolafc.globo.com/mercado/status

// Dados do time
GET https://api.cartolafc.globo.com/time/id/{timeId}/{{rodada}}

// Parciais (durante rodada)
GET https://api.cartolafc.globo.com/atletas/pontuados
```

**Problemas conhecidos:**
- API instável durante abertura/fechamento de mercado
- Timeout em horários de pico
- Necessidade de retry automático (ainda não implementado)

**Recomendação Firebase:**
- Implementar Cloud Functions para proxy
- Cache de 15min para dados de mercado
- Fallback para dados em cache em caso de falha

---

### 2.2 Autenticação Cartola
**Situação atual:** Apenas dados públicos

- **Não requer autenticação** para buscar dados de times públicos
- **Não acessa ligas privadas** do Cartola
- **Limitação:** Só funciona com ligas públicas ou times específicos

**Participantes do sistema:**
- Cadastrados manualmente na collection `times`
- Identificados por `time_id` do Cartola
- Ligados a uma ou mais ligas (`ligaId`)

---

## 3. Dados e Migração

### 3.1 Dependência de JSON
**Estado atual:** Sistema já migrado para MongoDB!

**Collections principais:**
1. **ligas** - Configurações de ligas
2. **times** - Participantes e seus times
3. **rodadas** - Pontuações por rodada
4. **gols** - Estatísticas de artilharia
5. **goleiros** - Estatísticas de defesa
6. **artilheirocampeaos** - Histórico de campeões
7. **fluxofinanceirocampos** - Campos editáveis do financeiro
8. **extratofinanceirocache** - Cache de cálculos financeiros

**Arquivos JSON (backups/):**
- Usados apenas como backup de segurança
- Script `backupScheduler.js` salva diariamente
- NÃO são fonte primária de dados

**Dados críticos históricos:**
- Todos já estão no MongoDB
- Backup JSON mantido por segurança
- Script de restore disponível: `backup-sistema-completo.js`

---

### 3.2 Drive vs. Local
**Situação atual:**

- **uploadToDrive.js:** Backup secundário para Google Drive
- **Frequência:** Semanal ou sob demanda
- **Objetivo:** Disaster recovery

**Migração para Firebase:**

✅ **Firestore:** Substituir MongoDB (banco principal)
✅ **Cloud Storage:** Substituir Google Drive (backups)
✅ **Cloud Functions:** Automatizar backups
❌ **Não eliminar:** Manter backup local JSON como última linha de defesa

**Estrutura proposta Firestore:**
```
/ligas/{ligaId}
  /times/{timeId}
  /rodadas/{rodadaId}
  /gols/{golId}
  /configuracoes/{moduloId}
```

---

## 4. Financeiro e Segurança

### 4.1 Fluxo Financeiro
**Funcionalidade atual:**

**Registro:** Sistema registra débitos/créditos automáticos:
- Taxa de inscrição
- Bonificações por desempenho
- Penalidades (atrasos, WO)
- Premiações (campeões)

**Bloqueio:** SIM, implementado parcialmente:
- Participantes inadimplentes têm **badge visual** de alerta
- **NÃO bloqueia acesso** ao sistema (apenas notifica)
- Admin pode marcar como "pago" manualmente

**Localização no código:**
- `services/fluxoFinanceiroCore.js` - Cálculos
- `models/FluxoFinanceiroCampos.js` - Campos editáveis
- `controllers/fluxoFinanceiroController.js` - API
- `public/js/fluxo-financeiro/` - Frontend

**Regras automáticas:**
```javascript
// Bonificações
- Top 3 rodada: +R$ 10,00
- Campeão do Mês: +R$ 50,00
- Campeão Pontos Corridos: +R$ 100,00

// Penalidades
- WO (não escalou): -R$ 5,00
- Última posição rodada: -R$ 5,00
```

**Campos editáveis (admin):**
- campo1, campo2, campo3 - para ajustes manuais
- Cada campo tem descrição personalizável

---

### 4.2 Acesso dos Participantes
**Sistema atual:** Autenticação simplificada

**Método:**
1. **Time ID + Senha de Acesso**
2. Sem email/cadastro tradicional
3. Sessão armazenada em `sessionStorage`

**Localização:**
- `public/participante/index.html` - Página de login
- `public/participante/js/participante-auth.js` - Autenticação
- `routes/participante-auth.js` - Validação backend
- `middleware/auth.js` - Proteção de rotas

**Fluxo de login:**
```javascript
POST /api/participante/auth/login
Body: { timeId: "13935277", senha: "acessocartola" }

Resposta: {
  success: true,
  ligaId: "684cb1c8af923da7c7df51de",
  timeId: "13935277",
  participante: { ... }
}
```

**Segurança atual:**
- ⚠️ **Senha em texto plano** no MongoDB
- ⚠️ Sem token JWT
- ⚠️ Sem renovação de sessão
- ✅ Verificação a cada 30s (heartbeat)

**Migração Firebase Auth:**

Recomendações:
1. **Custom Authentication:** Manter time_id como identificador
2. **Firebase Auth:** Criar usuários programaticamente
3. **Password hashing:** Usar bcrypt antes de migrar
4. **Email opcional:** Para recuperação de senha

```javascript
// Exemplo migração
const userCredential = await firebase.auth()
  .createUserWithEmailAndPassword(
    `${timeId}@cartola.local`, // Email fictício
    hashedPassword
  );

await userCredential.user.updateProfile({
  displayName: nomeCartola,
  photoURL: fotoPerfil
});
```

---

## 5. Dados Adicionais Importantes

### 5.1 Módulos Ativáveis por Liga
Cada liga pode ter módulos diferentes ativos:

```javascript
// Schema Liga (models/Liga.js)
modulosAtivos: {
  pontosCorridos: Boolean,
  mataMata: Boolean,
  melhorMes: Boolean,
  top10: Boolean,
  artilheiro: Boolean,
  luvaOuro: Boolean
}
```

### 5.2 Sistema de Cache
**Implementação atual:**
- **Frontend:** IndexedDB (`cache-manager.js`)
- **Backend:** MongoDB collection `extratofinanceirocache`

**TTL (Time to Live):**
- Dados de rodada: 1 hora
- Ranking: 30 minutos
- Extrato financeiro: 15 minutos

### 5.3 Performance
**Problemas identificados:**
- Consultas sem índice em `rodadas` collection
- N+1 queries em módulos agregados
- Falta de paginação em listas grandes

**Logs atuais:**
```
[2025-11-22T17:19:28.685Z] GET /api/rodadas/{ligaId}/rodadas?inicio=26&fim=26
Encontrados 32 documentos para a rodada 26
```

---

## 6. Roadmap de Migração Firebase

### Fase 1: Infraestrutura (Semana 1-2)
- [ ] Configurar projeto Firebase
- [ ] Migrar dados MongoDB → Firestore
- [ ] Implementar Firebase Auth
- [ ] Configurar Cloud Functions para proxy API Cartola

### Fase 2: Backend (Semana 3-4)
- [ ] Adaptar controllers para Firestore SDK
- [ ] Implementar Cloud Functions para cálculos pesados
- [ ] Migrar sistema de cache para Firebase Realtime Database
- [ ] Configurar Firebase Storage para escudos/imagens

### Fase 3: Frontend (Semana 5-6)
- [ ] Atualizar autenticação para Firebase Auth
- [ ] Migrar cache de IndexedDB para Firebase offline
- [ ] Implementar listeners real-time (rodadas ao vivo)
- [ ] Progressive Web App (PWA) com service workers

### Fase 4: Testes e Deploy (Semana 7-8)
- [ ] Testes de carga
- [ ] Backup/restore procedures
- [ ] Deploy em Firebase Hosting
- [ ] Monitoramento com Firebase Analytics

---

## 7. Perguntas Pendentes para Alinhamento

1. **Premiação:** Valores de premiação são fixos ou configuráveis por liga?
2. **Múltiplas Ligas:** Participante pode estar em múltiplas ligas simultaneamente? (Código sugere que sim)
3. **Rodadas Passadas:** Há necessidade de reprocessar rodadas antigas?
4. **Migração:** Fazer big bang ou migração gradual (dual write)?
5. **Custos:** Qual orçamento mensal esperado para Firebase (estimativa: $50-100/mês)?

---

## 8. Anexos Técnicos

### Collections MongoDB Atuais
```javascript
// Liga
{
  _id: ObjectId,
  nome: String,
  descricao: String,
  temporada: Number,
  modulosAtivos: Object,
  configuracoes: Object
}

// Time
{
  _id: ObjectId,
  ligaId: String,
  time_id: Number, // Cartola FC ID
  nome_cartola: String,
  nome_time: String,
  clube_id: Number,
  foto_perfil: String,
  senha_acesso: String, // ⚠️ Plain text
  ativo: Boolean
}

// Rodada
{
  _id: ObjectId,
  ligaId: String,
  rodada: Number,
  timeId: Number,
  pontos: Number,
  patrimonio: Number,
  capitao: Object,
  escalacao: Array
}
```

### APIs Principais
```javascript
// Admin
GET  /api/ligas
POST /api/ligas
GET  /api/ligas/:id
PUT  /api/ligas/:id

// Rodadas
GET  /api/rodadas/:ligaId/rodadas
POST /api/rodadas/:ligaId/processar

// Fluxo Financeiro
GET  /api/fluxo-financeiro/:ligaId/times/:timeId
POST /api/fluxo-financeiro/:ligaId/times/:timeId/campos

// Participante
POST /api/participante/auth/login
GET  /api/participante/auth/session
POST /api/participante/auth/logout
```

---

**Documento gerado em:** 2025-01-22  
**Versão do sistema:** 2.5.0  
**Responsável técnico:** [Seu Nome]  
**Próxima revisão:** Após reunião de alinhamento

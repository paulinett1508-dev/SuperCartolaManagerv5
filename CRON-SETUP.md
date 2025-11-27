
# 🕐 Configuração de Consolidação Automática

## Visão Geral

Este guia explica como configurar o **Scheduled Deployment** do Replit para executar automaticamente a consolidação de rodadas.

---

## 📋 Pré-requisitos

1. **Replit Core** (inclui $25/mês em créditos)
2. **Script configurado**: `scripts/cron-consolidar-rodadas.js`
3. **Variáveis de ambiente** configuradas no Secrets

---

## ⚙️ Configuração no Replit

### 1. Abrir Deployments

1. Clique no botão **Deploy** no header
2. Selecione **Scheduled** na lista de tipos de deployment

### 2. Configurar o Schedule

**Opção 1: Linguagem Natural**
```
Toda segunda-feira às 9h
```

**Opção 2: Cron Expression**
```
0 9 * * 1
```
_(Executa toda segunda-feira às 9:00 AM)_

### 3. Configurar Timezone

Selecione: **America/Sao_Paulo** (GMT-3)

### 4. Configurar Build Command

```bash
npm install
```

### 5. Configurar Run Command

```bash
node scripts/cron-consolidar-rodadas.js
```

### 6. Deployment Secrets

Adicione as seguintes variáveis (caso não existam):

```env
MONGODB_URI=mongodb+srv://...
LIGA_ID_PRINCIPAL=684cb1c8af923da7c7df51de
API_URL=https://seu-deployment.repl.co
```

---

## 📊 Schedules Recomendados

### Consolidação Semanal (Recomendado)
```
Toda segunda-feira às 9h
Cron: 0 9 * * 1
```

### Consolidação Diária (Alta Frequência)
```
Todo dia às 2h da manhã
Cron: 0 2 * * *
```

### Consolidação a cada rodada (Sob Demanda)
```
Execute manualmente via POST /api/consolidacao/ligas/:id/rodadas/:rodada/consolidar
```

---

## 💰 Custos

- **Machine cost**: $0.000028/segundo (apenas quando rodando)
- **Scheduler cost**: $0.10/mês por Scheduled Deployment
- **Estimativa**: ~$0.15/mês (com execução semanal)

Com **Replit Core** ($25/mês inclusos), você tem créditos suficientes.

---

## 🔍 Monitoramento

### Ver Logs de Execução

1. Vá em **Deployments** > **Scheduled**
2. Clique no deployment ativo
3. Visualize os logs de cada execução

### Status Esperado

```
🚀 [CRON-CONSOLIDAÇÃO] Iniciando execução automática...
✅ MongoDB conectado
📊 Mercado FECHADO
🎯 Rodada a consolidar: 35
🔄 Consolidando rodada 35...
✅ Consolidação concluída com sucesso!
🎉 Processo concluído com sucesso!
```

---

## 🛠️ Troubleshooting

### Erro: "LIGA_ID_PRINCIPAL não definida"
- Adicione a variável `LIGA_ID_PRINCIPAL` nos Deployment Secrets

### Erro: "MongoDB connection failed"
- Verifique se `MONGODB_URI` está correta nos Secrets
- Confirme que o IP do Replit está na whitelist do MongoDB Atlas

### Consolidação não está rodando
- Verifique se o Scheduled Deployment está **ativo**
- Confirme o timezone e cron expression
- Veja os logs de execução para detalhes

---

## 📝 Notas Importantes

1. **Timeout**: Execuções têm timeout de 11 horas (mais que suficiente)
2. **Concurrency**: Múltiplas execuções podem rodar simultaneamente
3. **Granularidade mínima**: 1 execução por minuto
4. **Desligamento**: Você pode pausar/cancelar o scheduled job a qualquer momento

---

## 🔗 Referências

- [Documentação Oficial - Scheduled Deployments](https://docs.replit.com/deployments/scheduled-deployments)
- [Cron Expression Generator](https://crontab.guru/)

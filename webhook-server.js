const express = require('express');
const { exec } = require('child_process');
const app = express();

app.use(express.json());

app.post('/github-sync', (req, res) => {
  console.log('🔔 Webhook do GitHub recebido:', req.body);
  
  exec('bash scripts/sync-replit.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Erro no sync:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Sync concluído:', stdout);
    res.json({ 
      success: true, 
      message: 'Sync executado',
      timestamp: new Date().toISOString()
    });
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.WEBHOOK_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🎣 Webhook rodando na porta ${PORT}`);
});

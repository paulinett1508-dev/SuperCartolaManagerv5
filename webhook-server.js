import express from 'express';
import { exec } from 'child_process';

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
    if (stderr) console.warn('⚠️ Warnings:', stderr);
    
    res.json({ 
      success: true, 
      message: 'Sync executado com sucesso',
      timestamp: new Date().toISOString()
    });
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'github-sync-webhook',
    uptime: process.uptime()
  });
});

const PORT = process.env.WEBHOOK_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🎣 Webhook server rodando na porta ${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/github-sync`);
});

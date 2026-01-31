# 🔄 REPLIT PULL - Sincronizar GitHub → Replit

## 🎯 Objetivo
Gerar os comandos prontos para o usuário colar no Shell do Replit, sincronizando o código do GitHub com o ambiente de produção.

**IMPORTANTE:** Esta skill NÃO executa comandos remotamente. Ela GERA os comandos formatados para o usuário copiar e colar no Shell do Replit.

---

## ⚡ ATIVAÇÃO AUTOMÁTICA

### Comandos que Acionam a Skill

**Termos Diretos:**
- `replit pull`
- `pull no replit`
- `sincronizar replit`
- `atualizar replit`
- `deploy replit`

**Frases em Português:**
- "puxa no replit"
- "atualiza o replit"
- "sincroniza o replit"
- "manda pro replit"
- "atualizar produção"
- "atualizar prod"
- "deploy"
- "publicar no replit"
- "subir pro replit"
- "aplica no replit"
- "joga no replit"
- "passa pro replit"
- "passe os comandos do replit"
- "passe os comandos de pull"
- "como faço pull no replit"

**Após Git Push:**
- "agora atualiza o replit"
- "agora pull no replit"
- "falta o replit"
- "e no replit?"
- "replit?"

---

## 📋 PROTOCOLO DE EXECUÇÃO

### PASSO ÚNICO: Gerar Comandos para o Replit

Apresentar ao usuário os comandos formatados em blocos de código bash, prontos para copiar e colar no Shell do Replit.

#### Comando Principal (copiar e colar no Replit):
```bash
bash scripts/replit-pull.sh
```

#### Se o script ainda não existir no Replit (primeiro uso ou pull manual):
```bash
git stash 2>/dev/null; git pull --rebase origin main; git stash pop 2>/dev/null; git log --oneline -3
```

#### Comando de Verificação (após o pull):
```bash
git log --oneline -3
```

---

## 📊 OUTPUT

### Template de Resposta
```markdown
**Comandos para o Shell do Replit:**

Se o script `replit-pull.sh` já existe:
    bash scripts/replit-pull.sh

Se é o primeiro pull (script ainda não chegou):
    git stash 2>/dev/null; git pull --rebase origin main; git stash pop 2>/dev/null; git log --oneline -3

Depois: clique em **Republish** no Replit.
```

---

## ⚠️ NOTAS IMPORTANTES

- Esta skill **NÃO tem acesso ao Replit** — apenas gera comandos
- Sempre lembrar o usuário de clicar em **Republish** após o pull
- Se houver conflitos, orientar o usuário a resolver manualmente
- O script `scripts/replit-pull.sh` faz: stash → pull rebase → stash pop → log → status

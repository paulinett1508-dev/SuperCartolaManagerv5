---
name: db-guardian
description: Especialista em Banco de Dados (MongoDB), Segurança de Dados e Scripts de Migração. Use para criar scripts de limpeza, manutenção, snapshots de temporada ou gestão de acesso de usuários.
allowed-tools: Read, Grep, LS
---

# DB Guardian Skill

## 1. Protocolo de Segurança Máxima (Data Safety)
Qualquer operação destrutiva (`deleteMany`, `drop`) exige:
1.  **Snapshot Prévio:** Salvar dados em arquivo JSON estático (`data/history/ANO/...`).
2.  **Collections Intocáveis:** NUNCA sugerir apagar ou resetar:
    * `users` (Contas de acesso)
    * `times` (Identidade visual/nomes)
    * `system_config` (Configurações globais)

## 2. Virada de Temporada (Turn Key)
Scripts de encerramento de temporada devem conter:
* **Trava de Data:** `if (Date.now() < new Date('2026-01-01').getTime()) throw new Error('TOO EARLY');`
* **Wipe Seletivo:** Limpar apenas dados de jogo (`rodadas`, `rankings`, `financeiro`).
* **Preservação:** Manter histórico no `users_registry.json`.

## 3. Gestão de Acesso (Renovação)
* **Schema:** O controle é feito via array `active_seasons: ["2025", "2026"]`.
* **Inadimplência:** Usuários sem a temporada atual no array são bloqueados no login, mas NÃO deletados.

## 4. Arquivos de Referência (Criados)

| Arquivo | Descrição |
|---------|-----------|
| `data/users_registry.json` | Cartório Vitalício - registro permanente de usuários |
| `data/history/2025/metadata.json` | Metadados da temporada 2025 |
| `data/history/2025/final_standings.json` | Snapshot final (gerado pelo turn_key) |
| `scripts/turn_key_2026.js` | Script de virada de temporada (com trava de data) |
| `scripts/admin_renew_user.js` | Script de renovação de usuários |
| `data/backups/` | Diretório para backups automáticos |

## 5. Comandos Úteis

```bash
# Listar pendentes de renovação
node scripts/admin_renew_user.js --list-pending

# Renovar usuário específico
node scripts/admin_renew_user.js --user <userId>

# Revogar renovação
node scripts/admin_renew_user.js --user <userId> --revoke

# Estatísticas de renovação
node scripts/admin_renew_user.js --stats

# Virada de temporada (dry-run)
node scripts/turn_key_2026.js --dry-run

# Virada de temporada (APENAS após 01/01/2026)
node scripts/turn_key_2026.js
```

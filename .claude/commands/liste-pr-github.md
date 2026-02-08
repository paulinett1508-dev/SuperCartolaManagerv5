# Listar Pull Requests do GitHub

Liste os Pull Requests do repositório GitHub deste projeto.

## Argumento recebido: `$ARGUMENTS`

## Instruções

1. **Extraia o token** do git remote:
   ```bash
   TOKEN=$(git remote get-url origin | sed -n 's|https://\(ghp_[^@]*\)@.*|\1|p')
   ```

2. **Busque os PRs** via API GitHub (salve em arquivo temporário):
   ```bash
   curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/paulinett1508-dev/SuperCartolaManagerv5/pulls?state=all&sort=updated&direction=desc&per_page=50" \
     -o /tmp/gh-prs-query.json
   ```

3. **Filtre e formate com python3** (NÃO use jq, não está disponível no ambiente).
   Use um heredoc `python3 << 'PYEOF'` para o script de parsing.

4. **Interprete o período** do argumento `$ARGUMENTS`:

   | Argumento | Filtro |
   |-----------|--------|
   | `hoje` | Data de hoje (UTC) |
   | `ontem` | Data de ontem |
   | `semana` | Últimos 7 dias |
   | `mes` ou `mês` | Últimos 30 dias |
   | `YYYY-MM-DD` | Data específica |
   | `YYYY-MM-DD YYYY-MM-DD` | Range de datas (início fim) |
   | (vazio) | Últimos 10 PRs sem filtro de data |

   Compare com os campos `created_at` e `merged_at` dos PRs.

5. **Apresente os resultados** em tabela markdown para o usuário:

   ```
   ## PRs do GitHub - [período descrito]

   | # | Título | Estado | Criado | Merged | Autor |
   |---|--------|--------|--------|--------|-------|
   | #81 | fix: ... | merged | 08/02 | 08/02 | user |
   ```

   - Estado: `merged` (se merged_at existe), `open`, ou `closed`
   - Datas no formato DD/MM
   - No final: **Total: X PRs**

6. Se não houver PRs no período: "Nenhum PR encontrado para o período [X]."

## Regras
- NUNCA exponha o token GitHub no output para o usuário
- Use python3 com heredoc para parsing JSON (jq não disponível)
- Se a API falhar, use `git log --merges` como fallback
- Mostre o link do PR para fácil acesso quando possível

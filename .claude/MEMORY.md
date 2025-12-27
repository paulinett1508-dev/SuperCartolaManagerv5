# Claude Code Memory - Super Cartola Manager

## Hall da Fama / Cartorio Vitalicio

### Arquivos Principais
- `data/users_registry.json` - Fonte da verdade do Hall da Fama (Cartorio Vitalicio)
- `routes/participante-historico-routes.js` - API que serve os dados (v2.3)
- `public/participante/js/modules/participante-historico.js` - Frontend (v10.5)

### Estrutura do users_registry.json
```json
{
  "_metadata": { "versao": "2.1.0", "ultima_atualizacao": "..." },
  "users": [
    {
      "id": "timeId (string)",
      "nome": "Nome Cartola",
      "historico": [
        {
          "ano": 2025,
          "liga_id": "684cb1c8af923da7c7df51de",
          "liga_nome": "SUPERCARTOLA",
          "estatisticas": { "posicao_final": 1, "pontos_totais": 3000 },
          "status": { "ativo": true/false, "rodada_desistencia": null/29 },
          "observacoes": ["Desistiu na rodada 29"]
        }
      ]
    }
  ]
}
```

### Participantes Inativos (Liga Sobral 2025)
| Nome | TimeID | Status | Rodada Desistencia |
|------|--------|--------|-------------------|
| Hivisson | 50180257 | Inativo | R29 |
| Junior Brasilino | 49149388 | Inativo | R29 |

### Scripts de Correcao
- `scripts/corrigir-hall-fama.js` - Corrige users_registry.json baseado no MongoDB
  - Flags: `--dry-run`, `--force`
  - Funcoes: corrigir posicoes, adicionar participantes faltantes, marcar inativos
- `scripts/regenerar-ranking-sobral.js` - Regenera rankinggeralcaches da Liga Sobral
- `scripts/regenerar-ranking-geral.js` - Regenera rankinggeralcaches de qualquer liga

---

## IDs das Ligas (MongoDB)
| Liga | ID | Participantes |
|------|-----|---------------|
| Super Cartola 2025 | 684cb1c8af923da7c7df51de | 32 |
| Cartoleiros do Sobral | 684d821cf1a7ae16d1f89572 | 6 (4 ativos apos R30) |

---

## Collections MongoDB Importantes

### rankinggeralcaches
Cache do ranking geral por liga. Campos: `ligaId`, `rodadaFinal`, `temporada`, `ranking[]`

### ranking_turno_caches
Ranking por turno (turno1, turno2, geral). Usado como fallback quando rodadas esta vazio.

### rodadasnapshots
Snapshots de rodadas por participante. Usado para Liga Sobral que nao tem `rodadas`.

### extratofinanceirocaches / extrato_financeiro_caches
Cache do extrato financeiro por participante. Campos: `liga_id`, `time_id`, `resumo`

---

## Regras de Negocio - Liga Sobral

1. **Participantes:** Comeca com 6, cai para 4 apos R30
2. **Inativos:** Marcados com `ativo: false` e `rodada_desistencia`
3. **Ranking:** Dados em `ranking_turno_caches` (nao em `rodadas`)
4. **TOP10 Valores:** Menores que SuperCartola (R$10/9/8... vs R$30/28/26...)

---

## Commits Recentes (Hall da Fama)
- `d722bea` - feat(hall-fama): exibe status de inatividade no frontend v10.5
- `b4a44fa` - fix(hall-fama): adiciona status de inatividade de participantes
- `18cecb5` - fix(hall-fama): corrige TOP10 Performance para usar campos v10.3

---

*Ultima atualizacao: 2025-12-27*

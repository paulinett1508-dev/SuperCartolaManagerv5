---
name: league-architect
description: Especialista em Regras de Negócio, Formatos de Liga (SaaS) e Lógica Financeira do Super Cartola. Use para criar configs de liga, calcular finanças ou definir regras de disputa.
---

# League Architect Skill

## 1. Schema SaaS (Configuração de Ligas 2026)
Todo arquivo em `config/definitions/` deve seguir:
```json
{
  "id": "slug",
  "nome": "Nome Comercial",
  "restricoes": { "min_participantes": 10 },
  "parametros_configuraveis": { /* inputs do admin */ }
}
```

## 2. Regras Financeiras Críticas (Legado & Atual)
* **Precisão:** Tudo truncado em 2 casas decimais (`toFixed(2)`). UI usa vírgula (`105,40`).
* **Mitos vs Micos:**
    * **Mito da Rodada:** 1º lugar da semana (+R$20).
    * **Mico da Rodada:** Último lugar da semana (-R$20).
    * **Top 10 Mitos/Micos:** Ranking histórico acumulado (NÃO confundir com o da rodada).
* **Zonas Financeiras (Tabela Oficial 32 times):**
    * **G1-G11:** Zona de Premiação (G1 = Mito).
    * **Neutra:** 12º ao 21º (R$0).
    * **Z1-Z11:** Zona de Punição (Z11 = Mico).

## 2.1 Acertos Financeiros (Pagamentos/Recebimentos)
**FÓRMULA CORRETA:** `saldoAcertos = totalPago - totalRecebido`

| Tipo | Significado | Efeito no Saldo |
|------|-------------|-----------------|
| **pagamento** | Participante PAGOU à liga | **AUMENTA** saldo (quita dívida) |
| **recebimento** | Participante RECEBEU da liga | **DIMINUI** saldo (usa crédito) |

**Exemplo - Devedor quitando:**
```
saldoTemporada = -203,46 (deve R$203,46)
Participante PAGA R$204,00
saldoAcertos = 204 - 0 = +204
saldoFinal = -203,46 + 204 = +0,54 (troco a receber)
```

**Arquivos que calculam:**
- `models/AcertoFinanceiro.js` - Fonte da verdade (Model)
- `routes/acertos-financeiros-routes.js` - API
- `routes/tesouraria-routes.js` - Tabela geral
- `controllers/extratoFinanceiroCacheController.js` - Extrato individual

## 3. Formatos de Disputa Específicos
* **Liga SuperCartola:** 32 Times. Regra completa de G-Zones e Z-Zones.
* **Liga Cartoleiros Sobral:**
    * **Dinâmica:** Começa com 6 times.
    * **Regra R30+:** A partir da Rodada 30, cai para 4 times (muda zona de premiação).
    * **Inativos:** Nas rodadas finais (30-38), inativos são excluídos do cálculo de posições.

## 4. IDs de Referência (MongoDB)
* **SuperCartola:** `684cb1c8af923da7c7df51de`
* **Sobral:** `684d821cf1a7ae16d1f89572`

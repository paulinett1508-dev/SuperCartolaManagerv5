# PRD - Roadmap 2026: Botão Flutuante Inteligente

**Data:** 2026-01-19
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft - Aguardando Discussão

---

## Resumo Executivo

Melhorar a experiência do participante com um botão flutuante inteligente que adapta seu comportamento baseado no estado do mercado Cartola. Em pré-temporada mostra o Roadmap 2026, mas quando o mercado está ABERTO, deve exibir badges com informações relevantes da rodada atual ao invés do roadmap.

---

## Contexto e Análise

### Estado Atual

#### Botão Flutuante Existente (`#fab-mercado-status`)
- **Localização:** `public/participante/index.html` (linhas 1320-1530)
- **Comportamento:**
  - Mostra status do mercado em tempo real (Aberto/Fechado/Countdown)
  - Em pré-temporada: clique abre teaser "Vem Aí 2026"
  - Mercado aberto: mostra countdown para fechamento + rodada atual
  - **Problema:** Quando mercado aberto, clique ainda abre teaser (não faz sentido)

#### Modal Teaser/Roadmap 2026
- **Localização:** `public/participante/index.html` (linhas 940-1200)
- **Conteúdo atual:**
  - Banner "Vem Aí 2026" com confetes
  - Lista de disputas: Top 10, Luva de Ouro, Artilheiro, Capitão Luxo
  - Countdown duplo: Mercado + Brasileirão
  - CTA "Explorar o App"

#### Modal Boas-Vindas (para renovados)
- Mostra confirmação de renovação com card verde
- Diferente do teaser padrão

### Módulos Identificados

**Frontend:**
- `public/participante/index.html` - Modais teaser + boas-vindas + FAB
- `public/participante/js/modules/participante-boas-vindas.js` - Tela Início
- `public/participante/js/participante-config.js` - Configurações de temporada

**Backend:**
- `routes/cartola-routes.js` - `/api/cartola/mercado/status`
- `routes/jogos-ao-vivo-routes.js` - Dados de jogos

### Dependências Mapeadas
- FAB usa `window.ParticipanteConfig.isPreparando()` para decidir comportamento
- FAB chama `buscarStatusMercado()` a cada 60s
- Teaser é aberto via `window.abrirRoadmap2026 = abrirTeaser`

---

## Problema Identificado

| Estado | Comportamento Atual | Problema |
|--------|---------------------|----------|
| Pré-temporada | Clique → Roadmap 2026 | ✅ OK |
| Mercado ABERTO | Clique → Roadmap 2026 | ❌ Não faz sentido |
| Mercado FECHADO | Sem ação clara | ❌ Desperdiçado |

**Roadmap não é relevante quando campeonato já começou!**

---

## Solução Proposta

### Comportamento Inteligente por Estado

| Estado Mercado | Visual do FAB | Ação ao Clicar |
|----------------|---------------|----------------|
| **Pré-temporada** | Laranja + Countdown | Abre Roadmap 2026 |
| **Aberto** | Verde pulsante | Abre Modal "Info da Rodada" |
| **Fechando (< 2h)** | Vermelho urgente | Abre Modal "Info da Rodada" |
| **Fechado (jogos)** | Cinza | Abre Modal "Rodada em Andamento" |

### Modal "Info da Rodada" (NOVO)

Badges com informações úteis quando mercado está aberto:

```
┌─────────────────────────────────────┐
│  📊 Rodada 15 - Mercado Aberto     │
│  ⏰ Fecha em 2d 14h                 │
├─────────────────────────────────────┤
│                                     │
│  [ 🥇 Líder: Raylson - 847 pts ]   │
│                                     │
│  [ 📍 Sua posição: 5º de 14 ]      │
│                                     │
│  [ ⚽ 10 jogos hoje ]               │
│                                     │
│  [ 💰 Seu saldo: R$ 120,00 ]       │
│                                     │
│  ─────────────────────────────────  │
│  [ Escalei! ✓ ] [ Histórico ]      │
└─────────────────────────────────────┘
```

### Informações Sugeridas para os Badges

**Dados da Rodada:**
- Rodada atual
- Countdown para fechamento
- Quantidade de jogos do dia

**Dados do Participante:**
- Posição atual no ranking
- Quem é o líder
- Saldo financeiro (quick view)
- Status "Escalei" / "Não escalei ainda"

**Links Rápidos:**
- Ver minha escalação
- Ver jogos de hoje
- Ir para extrato

---

## Arquivos a Modificar

### 1. `public/participante/index.html`

**Função `fab.onclick`** (linha ~1376):
```javascript
// ANTES
fab.onclick = () => {
    if (config && config.isPreparando()) {
        abrirTeaser();
    }
};

// DEPOIS
fab.onclick = () => {
    if (config && config.isPreparando()) {
        abrirTeaser();
    } else if (statusMercado?.status_mercado === 1) {
        // Mercado ABERTO - mostrar info da rodada
        abrirModalInfoRodada();
    } else {
        // Mercado fechado - mostrar rodada em andamento
        abrirModalRodadaEmAndamento();
    }
};
```

**Novo Modal** (adicionar após linha ~1300):
- HTML do modal de info da rodada
- Funções `abrirModalInfoRodada()` e `fecharModalInfoRodada()`

### 2. `public/participante/js/modules/participante-boas-vindas.js` (opcional)
- Exportar função para obter dados do participante para o modal

---

## Perguntas para Discussão (/plan)

### 1. Conteúdo do Modal quando Mercado Aberto
- Quais badges são mais importantes?
- Devemos mostrar se o participante já escalou?
- Mostrar projeção de pontos?

### 2. Conteúdo do Modal quando Mercado Fechado
- Mostrar parcial da rodada em tempo real?
- Mostrar jogos ao vivo inline?
- Alertas de gols dos atletas escalados?

### 3. Visual do Botão
- Manter o tamanho atual ou reduzir?
- Posição (bottom-24 right-4) está boa?
- Adicionar badge de notificação?

### 4. Roadmap 2026
- Manter disponível em algum lugar?
- Adicionar na página "Sobre" ou remover completamente?

---

## Riscos e Considerações

### Impactos Previstos
- **Positivo:** UX melhorada com informações contextuais
- **Positivo:** Botão ganha utilidade durante campeonato
- **Atenção:** Modal não deve atrapalhar navegação

### Performance
- Dados já estão em cache (ranking, rodadas)
- Não requer novas chamadas de API

### Multi-Tenant
- [x] Validado isolamento liga_id (dados vêm do auth)

---

## Próximos Passos

1. ✅ PRD gerado
2. ⏳ **Entrar em /plan para discutir conteúdo dos badges**
3. Gerar SPEC com mudanças cirúrgicas
4. Implementar

---

**Gerado por:** Pesquisa Protocol v1.0

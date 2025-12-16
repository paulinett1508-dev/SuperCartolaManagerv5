---
name: frontend-crafter
description: Especialista em Frontend Mobile-First, UX Black & Orange, Sistema de Cache Offline e Navegação SPA. Use para criar telas, ajustar CSS ou lógica JS do cliente.
allowed-tools: Read, Grep, LS
---

# Frontend Crafter Skill

## 1. Identidade Visual (Black & Orange)
* **Paleta:**
    * Primária: `--laranja` (#FF5500 ou #ff4500)
    * Background: `--bg-card` (#1a1a1a) no Dark Mode.
    * Status: Verde (#10b981) para Lucro/Vitória, Vermelho (#ef4444) para Prejuízo/Derrota.
* **Ícones:** OBRIGATÓRIO usar **Material Icons** (Google). Proibido Emojis.

## 2. Arquitetura Mobile (SPA v3.0)
* **Templates:** Arquivos em `public/participante/fronts/` são **FRAGMENTOS** (sem `<html>` ou `<body>`).
* **Navegação (v3.0):**
    * Usa `participante-navigation.js`.
    * **NUNCA** usar flag de travamento (`_navegando`). Usar apenas **Debounce por tempo** (100ms).
    * Botão Voltar: Interceptado via History API.
* **Loading:**
    * **Splash Screen:** Só na 1ª visita da sessão.
    * **Glass Overlay:** Obrigatório em Reloads (F5) e Pull-to-Refresh.

## 3. Performance & Cache (IndexedDB)
* **Padrão Cache-First:** TODO módulo mobile deve ler do IndexedDB primeiro (render instantâneo) e atualizar via API em background.
* **Stores:** `participante`, `liga`, `ranking`, `extrato`, etc.
* **TTL:** 24h para estáticos, 30min-1h para dinâmicos.

## 4. Admin UI (Desktop)
* Layout: Sidebar fixo (280px) + Main Content.
* CSS: Inline para wizards simples, externo (`css/modules/`) para dashboards complexos.

## 5. Modulos Admin Criados

| Modulo | Arquivo | Uso |
|--------|---------|-----|
| AdminTesouraria | `public/js/admin/modules/admin-tesouraria.js` | Dashboard financeiro SaaS-ready |

**Exemplo de uso:**
```javascript
// Carregar script
<script src="/js/admin/modules/admin-tesouraria.js"></script>

// Renderizar modulo
adminTesouraria.render('#container', ligaId, '2025');

// Metodos disponiveis:
adminTesouraria.recarregar();              // Atualiza dados
adminTesouraria.mudarTemporada('2026');    // Troca temporada
adminTesouraria.filtrarStatus('devedores'); // Filtra lista
adminTesouraria.exportarRelatorio();       // Copia texto WhatsApp
```

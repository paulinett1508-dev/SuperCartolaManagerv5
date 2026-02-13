# SPEC - Analisar Participantes: Modal Escalacao

**Baseado em:** PRD-analisar-participantes-escalacao.md
**Arquivos a modificar:** 2

---

## Arquivo 1: `public/js/analisar-participantes.js`

### Mudanca 1.1: Refatorar branch 3 do `abrirModalDump` (fallback chain)

**Localizacao:** Linhas 648-651

**Codigo atual:**
```javascript
} else if (rodadaConsolidada > 0) {
  console.log(`[ANALISAR] Nenhuma rodada no Data Lake. Auto-sync rodada ${rodadaConsolidada} da API Globo...`);
  sincronizarRodadaDump(timeId, nomeCartola, nomeTime, rodadaConsolidada);
}
```

**Codigo novo:**
```javascript
} else if (rodadaConsolidada > 0) {
  console.log(`[ANALISAR] DL vazio. Fallback: proxy Cartola rodada ${rodadaConsolidada}...`);
  carregarViaCartolaProxy(timeId, nomeCartola, nomeTime, rodadaConsolidada, data);
}
```

### Mudanca 1.2: Nova funcao `carregarViaCartolaProxy`

**Localizacao:** Inserir ANTES da funcao `carregarRodadaDump` (antes da linha 929)

### Mudanca 1.3: Ajustar event listener do seletor de rodada

**Localizacao:** Linhas 898-900 (else branch do change handler)

**Codigo atual:**
```javascript
sincronizarRodadaDump(timeId, nomeCartola, nomeTime, rodada);
```

**Codigo novo:**
```javascript
carregarViaCartolaProxy(timeId, nomeCartola, nomeTime, rodada, { rodadas_disponiveis: rodadasDisp, historico: dumpHistorico });
```

---

## Arquivo 2: `public/analisar-participantes.html`

### Mudanca 2.1: Cache-busting no script tag

**Localizacao:** Linha 1451

**De:** `<script src="js/analisar-participantes.js"></script>`
**Para:** `<script src="js/analisar-participantes.js?v=2.1"></script>`

---

## Resumo: 4 edits, ~35 linhas novas, 2 arquivos

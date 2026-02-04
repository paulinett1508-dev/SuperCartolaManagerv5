# 🔍 Diagnóstico: Pontos Corridos Mostrando Temporada Errada

**Problema reportado:** Interface mostrando dados de temporadas passadas
**Data:** 04/02/2026

---

## 🎯 Verificação Rápida

### 1. Abra o Console do Navegador (F12)

Procure por estas linhas:

```
✅ CORRETO:
[PONTOS-CORRIDOS] 📅 Temporada ativa: 2026
[PONTOS-CORRIDOS] ✅ 31 rodadas carregadas (temporada 2026)

❌ ERRADO:
[PONTOS-CORRIDOS] 📅 Temporada ativa: 2025
[PONTOS-CORRIDOS] ✅ 31 rodadas carregadas (temporada 2025)
```

---

## 🔎 Onde Verificar na Interface

### Banner Campeão
Se a liga encerrou, deve mostrar:
```
✅ CORRETO: "Pontos Corridos 2026"
❌ ERRADO: "Pontos Corridos 2025"
```

**Localização:** Topo da página, banner dourado com troféu

---

### Card "Seu Desempenho"
**Localização:** Logo após o banner, card com estatísticas

Verifique se os dados fazem sentido para a temporada atual.

---

### Classificação
**Localização:** Aba "Classificação"

Verifique:
- Nomes dos times estão corretos?
- Estatísticas fazem sentido?

---

## 🛠️ Solução 1: Limpar Cache (Mais Rápido)

### Pelo Console do Navegador

1. Abra Console (F12)
2. Cole este comando:

```javascript
// Limpar cache Pontos Corridos
const ligaId = '684cb1c8af923da7c7df51de'; // Sua liga
['2025', '2026', ''].forEach(t => {
    const key = t ? `${ligaId}:${t}` : ligaId;
    window.OfflineCache?.delete('pontosCorridos', key);
    console.log(`🗑️ Cache removido: ${key}`);
});
console.log('✅ Cache limpo! Recarregue a página (F5)');
```

3. Aperte ENTER
4. Recarregue a página (F5)
5. Navegue para Pontos Corridos novamente

---

## 🛠️ Solução 2: Script Automático

### Carregar script de limpeza

1. Abra Console (F12)
2. Cole:

```javascript
const script = document.createElement('script');
script.src = '/js/clear-pontos-corridos-cache.js';
document.head.appendChild(script);
```

3. Aperte ENTER
4. Aguarde mensagem "✅ LIMPEZA CONCLUÍDA"
5. Recarregue a página (F5)

---

## 🛠️ Solução 3: Hard Refresh

1. **Chrome/Edge:** `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac)
2. **Firefox:** `Ctrl + F5` (Windows) ou `Cmd + Shift + R` (Mac)
3. Navegue para Pontos Corridos

---

## 🛠️ Solução 4: Limpar Cache Completo

### Pelo Navegador

1. `F12` → **Application** (Chrome) ou **Storage** (Firefox)
2. Expandir **IndexedDB**
3. Localizar **participanteData**
4. Clicar com botão direito → **Delete database**
5. Expandir **Local Storage** e **Session Storage**
6. Deletar todas as chaves relacionadas a Pontos Corridos
7. Recarregar página (F5)

---

## 🔧 Solução 5: Backend - Regenerar Cache

Se as soluções anteriores não funcionarem, o problema pode estar no **cache do MongoDB**.

### Via Script (Administrador)

```bash
node scripts/regenerate-pontos-corridos-cache.js --ligaId=684cb1c8af923da7c7df51de --temporada=2026
```

Ou crie o script:

```javascript
// scripts/regenerate-pontos-corridos-cache.js
import mongoose from 'mongoose';
import PontosCorridosCache from '../models/PontosCorridosCache.js';

const ligaId = process.argv.find(arg => arg.startsWith('--ligaId='))?.split('=')[1];
const temporada = parseInt(process.argv.find(arg => arg.startsWith('--temporada='))?.split('=')[1]);

if (!ligaId || !temporada) {
    console.error('Uso: node script.js --ligaId=XXX --temporada=2026');
    process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

console.log(`🗑️ Removendo cache antigo: liga ${ligaId}`);

// Deletar cache sem campo temporada (antigo)
const deleted1 = await PontosCorridosCache.deleteMany({
    liga_id: ligaId,
    temporada: { $exists: false }
});

console.log(`  ✅ ${deleted1.deletedCount} caches antigos removidos`);

// Deletar cache de 2025 (se aplicável)
const deleted2 = await PontosCorridosCache.deleteMany({
    liga_id: ligaId,
    temporada: 2025
});

console.log(`  ✅ ${deleted2.deletedCount} caches de 2025 removidos`);

console.log('\n✅ Cache limpo! Frontend regenerará automaticamente.');

await mongoose.disconnect();
```

---

## 🔍 Diagnóstico Avançado

### Verificar Cache MongoDB

```javascript
// Console do MongoDB
use cartola_db

// Verificar estrutura
db.pontoscorridoscaches.findOne({ liga_id: "684cb1c8af923da7c7df51de" })

// Contar por temporada
db.pontoscorridoscaches.aggregate([
    { $match: { liga_id: "684cb1c8af923da7c7df51de" } },
    { $group: { _id: "$temporada", count: { $sum: 1 } } }
])

// Verificar se tem cache sem temporada
db.pontoscorridoscaches.countDocuments({
    liga_id: "684cb1c8af923da7c7df51de",
    temporada: { $exists: false }
})
```

**Resultados esperados:**
- ✅ Todos os documentos têm campo `temporada`
- ✅ Apenas registros de 2026 (ou temporada atual)

**Se encontrar problemas:**
```javascript
// Adicionar campo temporada aos docs antigos (CUIDADO!)
db.pontoscorridoscaches.updateMany(
    { liga_id: "684cb1c8af923da7c7df51de", temporada: { $exists: false } },
    { $set: { temporada: 2025 } } // Marcar como 2025 (histórico)
)

// OU deletar cache antigo
db.pontoscorridoscaches.deleteMany({
    liga_id: "684cb1c8af923da7c7df51de",
    temporada: { $exists: false }
})
```

---

## 📊 Checklist Pós-Correção

Após aplicar as soluções, verifique:

- [ ] Console mostra `Temporada ativa: 2026`
- [ ] Banner mostra "Pontos Corridos 2026" (se liga encerrou)
- [ ] Cache usa chave `ligaId:2026` (veja console)
- [ ] Dados fazem sentido (rodadas, confrontos, classificação)
- [ ] Não há mensagens de erro no console

---

## 🆘 Se Nada Funcionar

### Evidências para Debug

Tire **screenshots** de:

1. **Console completo** (F12) com logs de inicialização
2. **Banner/Card Desempenho** mostrando ano errado
3. **Network tab** (F12) mostrando requisição da API:
   ```
   GET /api/pontos-corridos/684cb...?temporada=XXXX
   ```

### Informações Úteis

Cole no console e envie resultado:

```javascript
console.log({
    temporada: window.estadoPC?.temporada,
    mercadoTemporada: window.estadoPC?.mercadoTemporada,
    dados: window.estadoPC?.dados?.length,
    ligaId: window.participanteData?.ligaId,
    timeId: window.participanteData?.timeId
});
```

---

## 🎯 Causa Raiz Provável

### Cenário 1: Cache Antigo (Mais Provável)
**Sintoma:** Console mostra 2026, mas interface mostra 2025
**Causa:** IndexedDB tem cache antigo sem campo temporada
**Solução:** Limpar cache (Solução 1 ou 2)

### Cenário 2: MongoDB com Dados Misturados
**Sintoma:** Sempre carrega dados de 2025 mesmo pedindo 2026
**Causa:** Cache MongoDB sem campo `temporada`
**Solução:** Regenerar cache (Solução 5)

### Cenário 3: Banner Não Atualizado
**Sintoma:** Só o banner mostra ano errado, resto está ok
**Causa:** Arquivo JS não foi atualizado no navegador
**Solução:** Hard refresh (Solução 3)

---

## 📚 Referências

- Auditoria: `docs/auditorias/AUDITORIA-PONTOS-CORRIDOS-2026-02-04.md`
- Correções: `docs/auditorias/CORRECOES-APLICADAS-PONTOS-CORRIDOS.md`
- Testes: `docs/auditorias/TESTES-PONTOS-CORRIDOS-FINAL.md`
- Script de limpeza: `public/js/clear-pontos-corridos-cache.js`

---

**Atualizado:** 04/02/2026 23:00
**Versão:** 1.0.0

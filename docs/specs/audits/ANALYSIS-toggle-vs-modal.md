# 🔍 ANÁLISE: Conflito entre Toggle e Modal - Dois Sistemas Paralelos

**Data:** 2026-02-03
**Problema:** Toggle de ativação não afeta o modal de configuração
**Root Cause:** Dois sistemas de armazenamento rodando em paralelo

---

## 🐛 PROBLEMA IDENTIFICADO

### Sistema Dual (Conflito de Arquitetura)

#### Sistema 1: Liga.modulos_ativos (ANTIGO)
```javascript
// Localização: Liga.modulos_ativos (campo no documento)
// Estrutura: Objeto simples
{
  extrato: true,
  ranking: true,
  top10: false,
  pontosCorridos: true
  // ...
}

// Usado por:
// - gerenciar-modulos.html (toggle on/off)
// - Endpoint: PUT /api/ligas/:id/modulos-ativos
```

#### Sistema 2: ModuleConfig Collection (NOVO)
```javascript
// Localização: Collection "moduleconfigs"
// Estrutura: Documento completo
{
  _id: ObjectId,
  liga_id: "684cb1c8af923da7c7df51de",
  modulo: "pontos_corridos",
  ativo: true,
  wizard_respostas: { ... },
  financeiro_override: { ... },
  temporada: 2026
}

// Usado por:
// - module-config-modal.js (configuração via wizard)
// - Endpoint: PUT /api/liga/:ligaId/modulos/:modulo/config
```

---

## 📊 FLUXO ATUAL (QUEBRADO)

```
┌─────────────────────────────────────────────────────────────┐
│ GERENCIAR-MODULOS.HTML                                      │
└─────────────────────────────────────────────────────────────┘
   │
   │ 1. Toggle ON/OFF
   │ 2. Clica "Salvar Configurações"
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ PUT /api/ligas/:id/modulos-ativos                           │
│ Salva em: Liga.modulos_ativos = { extrato: true }          │
└─────────────────────────────────────────────────────────────┘
   │
   │ 3. Clica no card para configurar
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ MODULE-CONFIG-MODAL.JS                                      │
│ Abre modal de configuração                                  │
└─────────────────────────────────────────────────────────────┘
   │
   │ 4. Busca configuração
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ GET /api/liga/:ligaId/modulos/:modulo                       │
│ Lê de: ModuleConfig.findOne({ liga_id, modulo })           │
│ ❌ NÃO ENCONTRA (não foi salvo no sistema novo)            │
└─────────────────────────────────────────────────────────────┘
   │
   │ ❌ Resultado: config = null
   │ ❌ Modal mostra campos vazios mesmo com toggle ativo
   │
```

---

## 🔍 EVIDÊNCIAS DO CONFLITO

### Evidência 1: Dois Endpoints Diferentes

**Toggle usa:**
```javascript
// gerenciar-modulos.html:335
await fetch(`/api/ligas/${ligaId}/modulos-ativos`, {
    method: 'PUT',
    body: JSON.stringify({ modulos: modulosState })
});
```

**Modal usa:**
```javascript
// module-config-modal.js:165
await fetch(`/api/liga/${ligaId}/modulos/${modulo}`);
```

### Evidência 2: Dados Não Sincronizados

**Liga.modulos_ativos:**
```json
{
  "extrato": true,
  "ranking": true,
  "pontosCorridos": false
}
```

**ModuleConfig (collection vazia):**
```json
// Nenhum documento existe ainda!
// findOne() retorna null
```

---

## 🎯 SOLUÇÕES POSSÍVEIS

### Opção A: Sincronização Automática (RECOMENDADA)

Quando salvar em `Liga.modulos_ativos`, criar/atualizar documentos em `ModuleConfig`:

```javascript
// ligaController.js - atualizarModulosAtivos()
const atualizarModulosAtivos = async (req, res) => {
  const { modulos } = req.body;

  // 1. Salvar no sistema antigo (manter compatibilidade)
  liga.modulos_ativos = modulos;
  await liga.save();

  // 2. Sincronizar com sistema novo
  for (const [moduloKey, ativo] of Object.entries(modulos)) {
    const moduloBackendId = mapearModuloId(moduloKey); // extrato → extrato

    if (ativo) {
      // Ativar no sistema novo (se não existir, criar)
      await ModuleConfig.ativarModulo(ligaId, moduloBackendId, {}, 'sistema');
    } else {
      // Desativar no sistema novo
      await ModuleConfig.desativarModulo(ligaId, moduloBackendId);
    }
  }

  res.json({ sucesso: true });
};
```

**Prós:**
- ✅ Mantém compatibilidade com sistema antigo
- ✅ Sincroniza automaticamente
- ✅ Zero breaking changes
- ✅ Transparente para o usuário

**Contras:**
- Adiciona lógica de sincronização
- Mantém dois sistemas (debt técnico)

---

### Opção B: Migração Completa (LONGO PRAZO)

Remover `Liga.modulos_ativos` completamente e usar apenas `ModuleConfig`:

```javascript
// gerenciar-modulos.html - mudar endpoint
await fetch(`/api/liga/${ligaId}/modulos/${moduloKey}/ativar`, {
    method: 'POST'
});
```

**Prós:**
- ✅ Sistema unificado
- ✅ Sem duplicação de dados
- ✅ Arquitetura mais limpa

**Contras:**
- ❌ Breaking change
- ❌ Requer migração de dados
- ❌ Impacta outros códigos que leem Liga.modulos_ativos

---

### Opção C: Fix Rápido - Criar documento default

Quando modal não encontrar config, criar uma default:

```javascript
// module-config-modal.js:165
async fetchConfig(ligaId, modulo) {
    const response = await fetch(`/api/liga/${ligaId}/modulos/${modulo}`);
    if (response.ok) {
        const data = await response.json();
        return data.config || data;
    }

    // FIX: Se não encontrou, criar config default
    console.warn(`[MODAL] Config não encontrada, criando default para ${modulo}`);
    await fetch(`/api/liga/${ligaId}/modulos/${modulo}/ativar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wizard_respostas: {} })
    });

    // Tentar buscar novamente
    const retry = await fetch(`/api/liga/${ligaId}/modulos/${modulo}`);
    if (retry.ok) {
        const data = await retry.json();
        return data.config || data;
    }

    return null;
}
```

**Prós:**
- ✅ Fix rápido (10 minutos)
- ✅ Não quebra nada existente

**Contras:**
- ❌ Não resolve root cause
- ❌ Cria docs sem wizard_respostas preenchidas

---

## 📝 RECOMENDAÇÃO FINAL

### ✅ IMPLEMENTAR OPÇÃO A (Sincronização Automática)

**Passo 1: Adicionar sincronização em `atualizarModulosAtivos()`**
- Quando salvar toggle, atualizar ModuleConfig em paralelo

**Passo 2: Mapear IDs de módulos**
- extrato → extrato
- ranking → ranking_geral
- rodadas → ranking_rodada
- pontosCorridos → pontos_corridos
- etc.

**Passo 3: Testar fluxo completo**
1. Ativar toggle
2. Salvar configurações
3. Abrir modal
4. ✅ Ver wizard carregado corretamente

**Passo 4: (Futuro) Migrar para sistema único**
- Deprecar Liga.modulos_ativos
- Usar apenas ModuleConfig
- Migration script para dados existentes

---

## 🧪 TESTE DE VALIDAÇÃO

```bash
# 1. Ativar módulo via toggle
# 2. Salvar configurações
# 3. Verificar no MongoDB

# Sistema Antigo (deve existir)
db.ligas.findOne(
  { _id: ObjectId("684cb1c8af923da7c7df51de") },
  { modulos_ativos: 1 }
)

# Sistema Novo (deve existir após fix)
db.moduleconfigs.findOne({
  liga_id: "684cb1c8af923da7c7df51de",
  modulo: "extrato"
})
```

---

## 📊 IMPACTO

| Sistema | Antes do Fix | Depois do Fix |
|---------|--------------|---------------|
| Toggle ON/OFF | ✅ Funciona | ✅ Funciona |
| Modal Wizard | ❌ Config vazia | ✅ Config carregada |
| Liga.modulos_ativos | ✅ Salvo | ✅ Salvo |
| ModuleConfig | ❌ Não criado | ✅ Criado automaticamente |

---

**STATUS:** 🔴 BUG CONFIRMADO - Sistemas desconectados
**PRIORIDADE:** P1 (bloqueia configuração de módulos)
**ESFORÇO:** 2 horas (implementar Opção A)

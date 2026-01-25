# SPEC - Correção de Duplicação de Inicialização no Sidebar

**Data:** 2026-01-25
**Baseado em:** PRD-sidebar-duplicacao-inicializacao.md
**Status:** Especificação Técnica

---

## Resumo da Implementação

Remover o arquivo `sidebar-menu.js` que duplica funcionalidades já presentes no script inline do `layout.html` (versão v3.0, mais completa com agrupamento por temporada). Também remover todos os imports desse arquivo nas 10 páginas HTML que o utilizam, e limpar o código de verificação de dupla inicialização no `layout.html` que se tornará desnecessário.

---

## Arquivos a Modificar (Ordem de Execução)

### 1. public/js/core/sidebar-menu.js - DELETAR

**Path:** `public/js/core/sidebar-menu.js`
**Tipo:** Deleção
**Impacto:** Alto
**Dependentes:** 10 páginas HTML

#### Ação:
Deletar arquivo inteiro (253 linhas de código duplicado).

**Motivo:** O `layout.html` já possui versão mais completa (v3.0) com:
- Agrupamento de ligas por temporada
- AccordionManager completo
- Toggle sidebar com persistência
- Todas as funções de menu perfil
- Super Admin verification

---

### 2. public/painel.html - REMOVER IMPORT

**Path:** `public/painel.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 1303-1304: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 3. public/detalhe-liga.html - REMOVER IMPORT

**Path:** `public/detalhe-liga.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 1146-1147: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 4. public/ferramentas.html - REMOVER IMPORT

**Path:** `public/ferramentas.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 520-521: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 5. public/ferramentas-rodadas.html - REMOVER IMPORT

**Path:** `public/ferramentas-rodadas.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 528-529: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 6. public/criar-liga.html - REMOVER IMPORT

**Path:** `public/criar-liga.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 765-766: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 7. public/editar-liga.html - REMOVER IMPORT

**Path:** `public/editar-liga.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 637-638: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 8. public/gerenciar.html - REMOVER IMPORT

**Path:** `public/gerenciar.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 250-251: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 9. public/gerenciar-modulos.html - REMOVER IMPORT

**Path:** `public/gerenciar-modulos.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 297-298: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 10. public/preencher-liga.html - REMOVER IMPORT

**Path:** `public/preencher-liga.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 941-942: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 11. public/gerir-senhas-participantes.html - REMOVER IMPORT

**Path:** `public/gerir-senhas-participantes.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 680-681: REMOVER**
```html
<!-- ANTES: -->
        <!-- Menu do Perfil Admin -->
        <script src="js/core/sidebar-menu.js"></script>

<!-- DEPOIS: -->
        <!-- (removido: sidebar-menu.js - funcionalidade em layout.html) -->
```

---

### 12. public/layout.html - REMOVER VERIFICAÇÃO DE DUPLA INICIALIZAÇÃO

**Path:** `public/layout.html`
**Tipo:** Modificação
**Impacto:** Baixo

#### Mudanças Cirúrgicas:

**Linhas 551-555: SIMPLIFICAR**
```javascript
// ANTES:
                // Evitar dupla inicialização (sidebar-menu.js pode ter inicializado primeiro)
                if (userToggle.dataset.initialized) {
                    console.log('[LAYOUT] Menu já inicializado por sidebar-menu.js');
                    return;
                }
                userToggle.dataset.initialized = 'true';

// DEPOIS:
                // Guard contra dupla inicialização
                if (userToggle.dataset.initialized) return;
                userToggle.dataset.initialized = 'true';
```
**Motivo:** Remover referência ao `sidebar-menu.js` nos comentários, manter apenas guard simples.

**Linhas 706-707: REMOVER COMENTÁRIO**
```javascript
// ANTES:
            // Expor funções globalmente para sidebar-menu.js
            window.abrirPerfilAdmin = abrirPerfilAdmin;

// DEPOIS:
            // Expor funções globalmente
            window.abrirPerfilAdmin = abrirPerfilAdmin;
```
**Motivo:** Remover referência ao arquivo que será deletado.

---

## Mapa de Dependências

```
sidebar-menu.js (DELETAR)
    |
    ├─> public/painel.html (linha 1304) [REMOVER IMPORT]
    ├─> public/detalhe-liga.html (linha 1147) [REMOVER IMPORT]
    ├─> public/ferramentas.html (linha 521) [REMOVER IMPORT]
    ├─> public/ferramentas-rodadas.html (linha 529) [REMOVER IMPORT]
    ├─> public/criar-liga.html (linha 766) [REMOVER IMPORT]
    ├─> public/editar-liga.html (linha 638) [REMOVER IMPORT]
    ├─> public/gerenciar.html (linha 251) [REMOVER IMPORT]
    ├─> public/gerenciar-modulos.html (linha 298) [REMOVER IMPORT]
    ├─> public/preencher-liga.html (linha 942) [REMOVER IMPORT]
    └─> public/gerir-senhas-participantes.html (linha 681) [REMOVER IMPORT]

layout.html (MANTER - versão v3.0)
    |
    ├─> Funcionalidades completas:
    │   ├─ carregarLigasLayout() - v3.0 com agrupamento por temporada
    │   ├─ inicializarMenuPerfil() - completa
    │   ├─ carregarDadosAdmin() - com Super Admin check
    │   ├─ AccordionManager - persistência localStorage
    │   ├─ toggleSidebar() - com persistência
    │   └─ verificarMenuSuperAdmin() - visibilidade condicional
    |
    └─> Referências a limpar:
        ├─ Linha 551-555: comentário sobre sidebar-menu.js
        └─ Linha 706: comentário sobre sidebar-menu.js
```

---

## Validações de Segurança

### Multi-Tenant
- [x] Não afeta isolamento liga_id
- [x] Sidebar apenas exibe ligas do admin autenticado (via `/api/ligas`)

### Autenticação
- [x] Nenhuma alteração em rotas ou middlewares
- [x] Verificação de Super Admin mantida em `layout.html`

---

## Casos de Teste

### Teste 1: Inicialização Limpa
**Setup:** Abrir `painel.html` em aba anônima (após login)
**Ação:** Abrir DevTools > Console
**Resultado Esperado:**
- Apenas logs `[LAYOUT]` visíveis
- NENHUM log `[SIDEBAR-MENU]`
- Ligas carregam UMA única vez
- Sem flicker visual

### Teste 2: Menu Perfil Funcional
**Setup:** Estar logado em qualquer página admin
**Ação:**
1. Clicar no avatar do usuário (área inferior do sidebar)
2. Verificar menu dropup abre
3. Clicar em "Meu Perfil"
4. Clicar em "Sair"
**Resultado Esperado:**
- Menu abre/fecha corretamente
- Modal de perfil exibe dados corretos
- Logout redireciona para `/`

### Teste 3: Menu Super Admin
**Setup:** Logar como Super Admin
**Ação:** Clicar no avatar do usuário
**Resultado Esperado:** Botão "Administradores" visível

**Setup:** Logar como Admin comum
**Ação:** Clicar no avatar do usuário
**Resultado Esperado:** Botão "Administradores" OCULTO

### Teste 4: Accordion de Ligas
**Setup:** Abrir `painel.html`
**Ação:**
1. Clicar no accordion "Ligas" para expandir
2. Recarregar a página
**Resultado Esperado:** Accordion permanece expandido (localStorage)

### Teste 5: Toggle Sidebar (Desktop)
**Setup:** Abrir `painel.html` em desktop
**Ação:**
1. Clicar no botão de recolher sidebar (chevron_left)
2. Verificar sidebar colapsa
3. Recarregar página
**Resultado Esperado:** Sidebar permanece colapsado (localStorage)

### Teste 6: Navegação entre Páginas
**Setup:** Estar em `painel.html`
**Ação:** Navegar: Dashboard → Detalhe Liga → Fluxo Financeiro → Ferramentas
**Resultado Esperado:**
- Sidebar mantém estado em todas as páginas
- Liga ativa destacada corretamente
- Menu perfil funcional em todas

### Teste 7: Agrupamento por Temporada
**Setup:** Admin com ligas em múltiplas temporadas
**Ação:** Verificar lista de ligas no sidebar
**Resultado Esperado:**
- Ligas agrupadas por temporada (mais recente primeiro)
- Badge "Histórico" em temporadas passadas
- Contador de participantes correto por temporada

---

## Rollback Plan

### Em Caso de Falha

**Passos de Reversão:**
```bash
# 1. Restaurar sidebar-menu.js
git checkout HEAD -- public/js/core/sidebar-menu.js

# 2. Reverter alterações nos HTMLs
git checkout HEAD -- public/painel.html
git checkout HEAD -- public/detalhe-liga.html
git checkout HEAD -- public/ferramentas.html
git checkout HEAD -- public/ferramentas-rodadas.html
git checkout HEAD -- public/criar-liga.html
git checkout HEAD -- public/editar-liga.html
git checkout HEAD -- public/gerenciar.html
git checkout HEAD -- public/gerenciar-modulos.html
git checkout HEAD -- public/preencher-liga.html
git checkout HEAD -- public/gerir-senhas-participantes.html
git checkout HEAD -- public/layout.html

# OU reverter commit inteiro:
git revert [hash-do-commit]
```

---

## Checklist de Validação

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados (10 HTMLs + 1 JS)
- [x] Mudanças cirúrgicas definidas linha por linha
- [x] Impactos mapeados (nenhum breaking change)
- [x] Testes planejados (7 cenários)
- [x] Rollback documentado

### Durante Implementação
- [ ] Deletar `sidebar-menu.js`
- [ ] Remover imports dos 10 HTMLs
- [ ] Limpar comentários no `layout.html`
- [ ] Testar cada página após mudança

### Após Implementação
- [ ] Executar Teste 1 (inicialização limpa)
- [ ] Executar Teste 2 (menu perfil)
- [ ] Executar Teste 3 (Super Admin)
- [ ] Executar Teste 6 (navegação)
- [ ] Verificar console sem erros 404

---

## Ordem de Execução (Crítico)

1. **DELETAR arquivo duplicado:**
   - `public/js/core/sidebar-menu.js`

2. **REMOVER imports (10 arquivos):**
   - painel.html
   - detalhe-liga.html
   - ferramentas.html
   - ferramentas-rodadas.html
   - criar-liga.html
   - editar-liga.html
   - gerenciar.html
   - gerenciar-modulos.html
   - preencher-liga.html
   - gerir-senhas-participantes.html

3. **LIMPAR referências no layout:**
   - layout.html (comentários)

4. **TESTAR:**
   - Todas as páginas afetadas
   - Console sem erros
   - Funcionalidades intactas

---

## Métricas de Sucesso Esperadas

| Métrica | Antes | Depois |
|---------|-------|--------|
| Chamadas `/api/ligas` por page load | 2 | 1 |
| Chamadas `/api/admin/auth/session` | 2 | 1 |
| Logs de inicialização | 10+ | ~5 |
| Arquivos JS carregados | +1 (sidebar-menu.js) | 0 |
| Código duplicado removido | 0 | 253 linhas |

---

## Próximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-sidebar-duplicacao-inicializacao.md
```

---

**Gerado por:** Spec Protocol v1.0
**Workflow:** High Senior Protocol - FASE 2 COMPLETA

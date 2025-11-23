# 📊 Análise do Sistema Super Cartola Manager

**Data da Análise:** 23/11/2025, 13:46:47

---

## 📁 Estrutura do Sistema

- 📁 **attached_assets/**
- 📁 **backups/**
- 📁 **config/**
- 📁 **controllers/**
- 📁 **middleware/**
- 📁 **models/**
- 📁 **public/**
  - 📁 **css/**
    - 📁 **modules/**
  - 📁 **escudos/**
  - 📁 **fronts/**
  - 📁 **img/**
  - 📁 **js/**
    - 📁 **artilheiro-campeao/**
    - 📁 **core/**
    - 📁 **exports/**
    - 📁 **ferramentas/**
    - 📁 **fluxo-financeiro/**
    - 📁 **luva-de-ouro/**
    - 📁 **mata-mata/**
    - 📁 **melhor-mes/**
    - 📁 **pontos-corridos/**
    - 📁 **rodadas/**
  - 📁 **participante/**
    - 📁 **css/**
    - 📁 **fronts/**
    - 📁 **js/**
      - 📁 **modules/**
  - 📁 **templates/**
- 📁 **routes/**
- 📁 **scripts/**
- 📁 **services/**
- 📁 **utils/**

### 📄 Arquivos na Raiz

- 📖 **CONTEXTOS-ADMIN-PARTICIPANTE.md** - 👤 Administração/Gestão
- 📖 **LEVANTAMENTO-REQUISITOS-RESPOSTA.md** - 📖 Documentação
- 📖 **SISTEMA-COMPLETO-REGRAS-FINANCEIRO.md** - 📖 Documentação
- 📜 **backup-sistema-completo.js** - 📝 Script JavaScript
- 📜 **backupJson.js** - 📝 Script JavaScript
- 📜 **backupScheduler.js** - 📝 Script JavaScript
- 📋 **credentials.json** - 📋 Dados JSON
- 📜 **debug-escudos.js** - 📝 Script JavaScript
- 📋 **doc-version.json** - 📋 Dados JSON
- 📄 **generate-full-docs.cjs** - ❓ Arquivo genérico
- 🖼️ **generated-icon.png** - ❓ Arquivo genérico
- 📜 **handover.js** - 📝 Script JavaScript
- 📜 **index.js** - 🏠 Página principal/Entry point
- 📋 **package-lock.json** - 📋 Dados JSON
- 📋 **package.json** - 📦 Configuração npm/dependências
- 📖 **replit.md** - 📖 Documentação
- 📄 **replit.nix** - ❓ Arquivo genérico
- 📖 **system-analysis-2025-10-25.md** - 📖 Documentação
- 📜 **system-mapper.js** - 📝 Script JavaScript
- 📜 **uploadToDrive.js** - 📝 Script JavaScript
- 📜 **ux-analyzer.js** - 📝 Script JavaScript

---

## 🔍 Análise por Categoria

### Frontend (Cliente) (206 arquivos)

- 📄 **backup-sistema-completo.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 294
- 📄 **backupJson.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 39
- 📄 **backupScheduler.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 57
- 📄 **config/database.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 54
- 📄 **controllers/artilheiroCampeaoController.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 14KB | Linhas: 420
- 📄 **controllers/cartolaController.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 5KB | Linhas: 181
- 📄 **controllers/extratoFinanceiroCacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 133
- 📄 **controllers/fluxoFinanceiroController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 188
- 📄 **controllers/golsController.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 11KB | Linhas: 364
- 📄 **controllers/ligaController.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 20KB | Linhas: 615
- 📄 **controllers/luvaDeOuroController.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 16KB | Linhas: 549
- 📄 **controllers/participanteStatusController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 155
- 📄 **controllers/rodadaController.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 13KB | Linhas: 421
- 📄 **controllers/timeController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 134
- 📄 **debug-escudos.js** - 📝 Script JavaScript
- 📄 **handover.js** - 📝 Script JavaScript
  - 📏 Tamanho: 12KB | Linhas: 444
- 📄 **index.js** - 🏠 Página principal/Entry point
  - 📏 Tamanho: 15KB | Linhas: 433
- 📄 **middleware/auth.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 79
- 📄 **models/ArtilheiroCampeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 1KB | Linhas: 39
- 📄 **models/ExtratoFinanceiroCache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 98
- 📄 **models/FluxoFinanceiroCampos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 66
- 📄 **models/Goleiros.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 146
- 📄 **models/Gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 10KB | Linhas: 382
- 📄 **models/Liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 2KB | Linhas: 55
- 📄 **models/Rodada.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **models/Time.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **public/admin.html** - 👤 Administração/Gestão
  - 📏 Tamanho: 28KB | Linhas: 755
- 📄 **public/criar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 9KB | Linhas: 207
- 📄 **public/css/base.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 12KB | Linhas: 483
- 📄 **public/css/modules/criar-liga.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 10KB | Linhas: 521
- 📄 **public/css/modules/dashboard.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 7KB | Linhas: 399
- 📄 **public/css/modules/editar-liga.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 469
- 📄 **public/css/modules/ferramentas.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 151
- 📄 **public/css/modules/fluxo-financeiro.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 29KB | Linhas: 1201
- 📄 **public/css/modules/luva-de-ouro.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 14KB | Linhas: 693
- 📄 **public/css/modules/mata-mata.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 11KB | Linhas: 543
- 📄 **public/css/modules/melhor-mes.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 12KB | Linhas: 601
- 📄 **public/css/modules/parciais.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 2KB | Linhas: 127
- 📄 **public/css/modules/participantes.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 16KB | Linhas: 855
- 📄 **public/css/modules/pontos-corridos.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 22KB | Linhas: 1107
- 📄 **public/css/modules/ranking-geral.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 8KB | Linhas: 315
- 📄 **public/css/modules/rodadas.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 460
- 📄 **public/css/modules/top10.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 6KB | Linhas: 312
- 📄 **public/css/performance.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 1KB | Linhas: 56
- 📄 **public/dashboard.html** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 25KB | Linhas: 590
- 📄 **public/detalhe-liga.css** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 17KB | Linhas: 710
- 📄 **public/detalhe-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 10KB | Linhas: 224
- 📄 **public/editar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 123
- 📄 **public/ferramentas.html** - 📄 Página HTML
  - 📏 Tamanho: 6KB | Linhas: 131
- 📄 **public/fronts/artilheiro-campeao.html** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 5KB | Linhas: 108
- 📄 **public/fronts/fluxo-financeiro.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 46
- 📄 **public/fronts/luva-de-ouro.html** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 1KB | Linhas: 41
- 📄 **public/fronts/mata-mata.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 27
- 📄 **public/fronts/melhor-mes.html** - 📄 Página HTML
  - 📏 Tamanho: 2KB | Linhas: 68
- 📄 **public/fronts/parciais.html** - 📄 Página HTML
  - 📏 Tamanho: 11KB | Linhas: 366
- 📄 **public/fronts/participantes.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 89
- 📄 **public/fronts/pontos-corridos.html** - 📄 Página HTML
  - 📏 Tamanho: 5KB | Linhas: 153
- 📄 **public/fronts/ranking-geral.html** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 4KB | Linhas: 121
- 📄 **public/fronts/rodadas.html** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 4KB | Linhas: 129
- 📄 **public/fronts/top10.html** - 📄 Página HTML
  - 📏 Tamanho: 2KB | Linhas: 51
- 📄 **public/gerenciar-modulos.html** - 📄 Página HTML
  - 📏 Tamanho: 14KB | Linhas: 443
- 📄 **public/gerenciar.html** - 📄 Página HTML
  - 📏 Tamanho: 17KB | Linhas: 475
- 📄 **public/gerir-senhas-participantes.html** - 📄 Página HTML
  - 📏 Tamanho: 24KB | Linhas: 922
- 📄 **public/gols.js** - ⚽ Gestão de Gols
- 📄 **public/index.html** - 🏠 Página principal/Entry point
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-cache.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 9KB | Linhas: 390
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-core.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 17KB | Linhas: 570
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-detector.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 7KB | Linhas: 231
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-ui.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 43KB | Linhas: 906
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-utils.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 8KB | Linhas: 245
- 📄 **public/js/artilheiro-campeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 13KB | Linhas: 402
- 📄 **public/js/cards-condicionais.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 316
- 📄 **public/js/core/api-client.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 146
- 📄 **public/js/core/cache-manager.js** - 📝 Script JavaScript
  - 📏 Tamanho: 14KB | Linhas: 439
- 📄 **public/js/core/layout-manager.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 103
- 📄 **public/js/criar-liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 11KB | Linhas: 332
- 📄 **public/js/detalhe-liga-orquestrador.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 35KB | Linhas: 901
- 📄 **public/js/detalhe-liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 9KB | Linhas: 278
- 📄 **public/js/editar-liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 23KB | Linhas: 675
- 📄 **public/js/exports/export-artilheiro-campeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 16KB | Linhas: 485
- 📄 **public/js/exports/export-base.js** - 📝 Script JavaScript
  - 📏 Tamanho: 11KB | Linhas: 344
- 📄 **public/js/exports/export-exports.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 608
- 📄 **public/js/exports/export-extrato-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 42KB | Linhas: 1325
- 📄 **public/js/exports/export-mata-mata.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 625
- 📄 **public/js/exports/export-melhor-mes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 16KB | Linhas: 483
- 📄 **public/js/exports/export-pontos-corridos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 43KB | Linhas: 1331
- 📄 **public/js/exports/export-ranking-geral.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 20KB | Linhas: 631
- 📄 **public/js/exports/export-relatorio-consolidado.js** - 📝 Script JavaScript
  - 📏 Tamanho: 12KB | Linhas: 198
- 📄 **public/js/exports/export-rodadas-hq.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 20KB | Linhas: 639
- 📄 **public/js/exports/export-top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 227
- 📄 **public/js/ferramentas/ferramentas-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 321
- 📄 **public/js/filtro-liga-especial.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 104
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-api.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 203
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 18KB | Linhas: 503
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-campos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 270
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 31KB | Linhas: 839
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-participante.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 190
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 64KB | Linhas: 1283
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 90
- 📄 **public/js/fluxo-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 22KB | Linhas: 622
- 📄 **public/js/gerenciar-ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 8KB | Linhas: 273
- 📄 **public/js/gols-por-rodada.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 2KB | Linhas: 52
- 📄 **public/js/gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **public/js/layout-system.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 226
- 📄 **public/js/liga-modificacoes.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 16KB | Linhas: 489
- 📄 **public/js/luva-de-ouro/luva-de-ouro-cache.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 3KB | Linhas: 127
- 📄 **public/js/luva-de-ouro/luva-de-ouro-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 101
- 📄 **public/js/luva-de-ouro/luva-de-ouro-core.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 4KB | Linhas: 156
- 📄 **public/js/luva-de-ouro/luva-de-ouro-orquestrador.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 8KB | Linhas: 264
- 📄 **public/js/luva-de-ouro/luva-de-ouro-ui.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 10KB | Linhas: 320
- 📄 **public/js/luva-de-ouro/luva-de-ouro-utils.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 38KB | Linhas: 960
- 📄 **public/js/luva-de-ouro.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 4KB | Linhas: 152
- 📄 **public/js/mata-mata/mata-mata-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 4KB | Linhas: 153
- 📄 **public/js/mata-mata/mata-mata-confrontos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 230
- 📄 **public/js/mata-mata/mata-mata-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 19KB | Linhas: 599
- 📄 **public/js/mata-mata/mata-mata-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 22KB | Linhas: 633
- 📄 **public/js/mata-mata/mata-mata-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 287
- 📄 **public/js/mata-mata.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 29
- 📄 **public/js/melhor-mes/melhor-mes-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 4KB | Linhas: 154
- 📄 **public/js/melhor-mes/melhor-mes-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 443
- 📄 **public/js/melhor-mes/melhor-mes-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 274
- 📄 **public/js/melhor-mes/melhor-mes-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 307
- 📄 **public/js/melhor-mes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 321
- 📄 **public/js/navigation.js** - 🧭 Sistema de navegação
  - 📏 Tamanho: 3KB | Linhas: 76
- 📄 **public/js/participantes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 22KB | Linhas: 632
- 📄 **public/js/pontos-corridos/pontos-corridos-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 211
- 📄 **public/js/pontos-corridos/pontos-corridos-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 109
- 📄 **public/js/pontos-corridos/pontos-corridos-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 502
- 📄 **public/js/pontos-corridos/pontos-corridos-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 667
- 📄 **public/js/pontos-corridos/pontos-corridos-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 24KB | Linhas: 701
- 📄 **public/js/pontos-corridos-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 237
- 📄 **public/js/pontos-corridos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 61
- 📄 **public/js/ranking.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 14KB | Linhas: 392
- 📄 **public/js/rodadas/rodadas-cache.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 8KB | Linhas: 355
- 📄 **public/js/rodadas/rodadas-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 135
- 📄 **public/js/rodadas/rodadas-core.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 13KB | Linhas: 419
- 📄 **public/js/rodadas/rodadas-orquestrador.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 13KB | Linhas: 458
- 📄 **public/js/rodadas/rodadas-ui.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 12KB | Linhas: 371
- 📄 **public/js/rodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 10KB | Linhas: 324
- 📄 **public/js/seletor-ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 125
- 📄 **public/js/sistema-modulos-init.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 38
- 📄 **public/js/top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 469
- 📄 **public/js/utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 208
- 📄 **public/layout.html** - 📄 Página HTML
  - 📏 Tamanho: 14KB | Linhas: 349
- 📄 **public/migrar-localstorage-mongodb.html** - 📄 Página HTML
  - 📏 Tamanho: 23KB | Linhas: 665
- 📄 **public/participante/css/participante.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 11KB | Linhas: 558
- 📄 **public/participante/fronts/artilheiro.html** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 2KB | Linhas: 103
- 📄 **public/participante/fronts/boas-vindas.html** - 📄 Página HTML
  - 📏 Tamanho: 10KB | Linhas: 324
- 📄 **public/participante/fronts/extrato.html** - 📄 Página HTML
  - 📏 Tamanho: 9KB | Linhas: 427
- 📄 **public/participante/fronts/luva-ouro.html** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 2KB | Linhas: 126
- 📄 **public/participante/fronts/mata-mata.html** - 📄 Página HTML
  - 📏 Tamanho: 4KB | Linhas: 203
- 📄 **public/participante/fronts/melhor-mes.html** - 📄 Página HTML
  - 📏 Tamanho: 2KB | Linhas: 87
- 📄 **public/participante/fronts/pontos-corridos.html** - 📄 Página HTML
  - 📏 Tamanho: 4KB | Linhas: 186
- 📄 **public/participante/fronts/ranking.html** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 5KB | Linhas: 243
- 📄 **public/participante/fronts/rodadas.html** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 6KB | Linhas: 312
- 📄 **public/participante/fronts/top10.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 150
- 📄 **public/participante/index.html** - 🏠 Página principal/Entry point
  - 📏 Tamanho: 5KB | Linhas: 100
- 📄 **public/participante/js/modules/participante-artilheiro.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 11KB | Linhas: 279
- 📄 **public/participante/js/modules/participante-boas-vindas.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 12KB | Linhas: 309
- 📄 **public/participante/js/modules/participante-extrato-ui.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 26KB | Linhas: 725
- 📄 **public/participante/js/modules/participante-extrato.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 13KB | Linhas: 281
- 📄 **public/participante/js/modules/participante-luva-ouro.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 72
- 📄 **public/participante/js/modules/participante-mata-mata.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 8KB | Linhas: 177
- 📄 **public/participante/js/modules/participante-melhor-mes.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 75
- 📄 **public/participante/js/modules/participante-pontos-corridos.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 74
- 📄 **public/participante/js/modules/participante-ranking.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 8KB | Linhas: 184
- 📄 **public/participante/js/modules/participante-rodadas.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 10KB | Linhas: 298
- 📄 **public/participante/js/modules/participante-top10.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 4KB | Linhas: 119
- 📄 **public/participante/js/participante-auth.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 373
- 📄 **public/participante/js/participante-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 166
- 📄 **public/participante/js/participante-navigation.js** - 🧭 Sistema de navegação
  - 📏 Tamanho: 29KB | Linhas: 659
- 📄 **public/participante/js/participante-status.js** - 📝 Script JavaScript
  - 📏 Tamanho: 5KB | Linhas: 144
- 📄 **public/participante-dashboard.html** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 59KB | Linhas: 1378
- 📄 **public/participante-login.html** - 📄 Página HTML
  - 📏 Tamanho: 7KB | Linhas: 277
- 📄 **public/preencher-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 178
- 📄 **public/script.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 82
- 📄 **public/style.css** - 🎨 Folha de estilos
  - 📏 Tamanho: 21KB | Linhas: 1057
- 📄 **public/templates/fluxo-financeiro-tabela.html** - 📄 Página HTML
  - 📏 Tamanho: 5KB | Linhas: 126
- 📄 **public/templates/mata-mata-tabela.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 159
- 📄 **public/templates/pontos-corridos-tabela.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 92
- 📄 **public/templates/rankingSG.html** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 1KB | Linhas: 44
- 📄 **routes/artilheiro-campeao-routes.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 5KB | Linhas: 182
- 📄 **routes/cartola-proxy.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 5KB | Linhas: 167
- 📄 **routes/cartola.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 2KB | Linhas: 53
- 📄 **routes/configuracao-routes.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 5KB | Linhas: 168
- 📄 **routes/extratoFinanceiroCacheRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 29
- 📄 **routes/fluxoFinanceiroRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 30
- 📄 **routes/gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 2KB | Linhas: 57
- 📄 **routes/ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 20KB | Linhas: 634
- 📄 **routes/luva-de-ouro-routes.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 1KB | Linhas: 28
- 📄 **routes/participante-auth.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 298
- 📄 **routes/rodadas-routes.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 3KB | Linhas: 90
- 📄 **routes/times.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 183
- 📄 **scripts/exportar-escudos-unicos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 47
- 📄 **scripts/limpartimes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 31
- 📄 **scripts/populateRodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 2KB | Linhas: 82
- 📄 **scripts/replace-ids.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 58
- 📄 **services/cartolaApiService.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 21KB | Linhas: 675
- 📄 **services/cartolaService.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 5KB | Linhas: 174
- 📄 **services/goleirosService.js** - 📝 Script JavaScript
  - 📏 Tamanho: 25KB | Linhas: 821
- 📄 **services/golsService.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 17KB | Linhas: 539
- 📄 **system-mapper.js** - 📝 Script JavaScript
  - 📏 Tamanho: 19KB | Linhas: 617
- 📄 **uploadToDrive.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 70
- 📄 **utils/participanteUtils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 36
- 📄 **utils/validators.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 343
- 📄 **ux-analyzer.js** - 📝 Script JavaScript
  - 📏 Tamanho: 25KB | Linhas: 810

### Configuração (12 arquivos)

- 📄 **backups/artilheirocampeaos.json** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 7KB | Linhas: 273
- 📄 **backups/goleiros.json** - 📋 Dados JSON
  - 📏 Tamanho: 43KB | Linhas: 1532
- 📄 **backups/gols.json** - ⚽ Gestão de Gols
  - 📏 Tamanho: 2109KB | Linhas: 89922
- 📄 **backups/ligas.json** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 1KB | Linhas: 56
- 📄 **backups/restore-point-2025.json** - 📋 Dados JSON
- 📄 **backups/rodadas.json** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 461KB | Linhas: 12238
- 📄 **backups/times.json** - 📋 Dados JSON
  - 📏 Tamanho: 15KB | Linhas: 335
- 📄 **credentials.json** - 📋 Dados JSON
  - 📏 Tamanho: 2KB | Linhas: 14
- 📄 **doc-version.json** - 📋 Dados JSON
- 📄 **package-lock.json** - 📋 Dados JSON
  - 📏 Tamanho: 418KB | Linhas: 11280
- 📄 **package.json** - 📦 Configuração npm/dependências
  - 📏 Tamanho: 2KB | Linhas: 71
- 📄 **scripts/times-da-liga.json** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 2KB | Linhas: 46

### Documentação (139 arquivos)

- 📄 **CONTEXTOS-ADMIN-PARTICIPANTE.md** - 👤 Administração/Gestão
  - 📏 Tamanho: 7KB | Linhas: 235
- 📄 **LEVANTAMENTO-REQUISITOS-RESPOSTA.md** - 📖 Documentação
  - 📏 Tamanho: 12KB | Linhas: 435
- 📄 **SISTEMA-COMPLETO-REGRAS-FINANCEIRO.md** - 📖 Documentação
  - 📏 Tamanho: 34KB | Linhas: 1252
- 📄 **attached_assets/Pasted--CARDS-CONDICIONAIS-Carregando-sistema-CARDS-CONDICIONAIS-M-dulo-carregado-SIST-1762991207621_1762991207623.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 58KB | Linhas: 950
- 📄 **attached_assets/Pasted--CARDS-CONDICIONAIS-Carregando-sistema-CARDS-CONDICIONAIS-M-dulo-carregado-SIST-1763680865387_1763680865388.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 8KB | Linhas: 112
- 📄 **attached_assets/Pasted--CARDS-CONDICIONAIS-Carregando-sistema-CARDS-CONDICIONAIS-M-dulo-carregado-SIST-1763806152786_1763806152787.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 21KB | Linhas: 325
- 📄 **attached_assets/Pasted--CARDS-CONDICIONAIS-Carregando-sistema-CARDS-CONDICIONAIS-M-dulo-carregado-SIST-1763806509924_1763806509926.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 45KB | Linhas: 638
- 📄 **attached_assets/Pasted--CARDS-CONDICIONAIS-Carregando-sistema-CARDS-CONDICIONAIS-M-dulo-carregado-sistema-m-1763834595658_1763834595658.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 13KB | Linhas: 170
- 📄 **attached_assets/Pasted--CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316-CARDS-CONDICIONAIS-M-du-1763825267355_1763825267356.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 14KB | Linhas: 185
- 📄 **attached_assets/Pasted--MELHOR-MES-UI-Interface-modular-carregada-MELHOR-MES-ORQUESTRADOR-Inicializando-orquestrado-1761939809351_1761939809355.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 63KB | Linhas: 1045
- 📄 **attached_assets/Pasted--PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-PARTICIPANTE-AUTH-Sistema-carregado-1763678735596_1763678735597.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 141
- 📄 **attached_assets/Pasted-Relat-rio-de-Levantamento-de-Requisitos-Tech-Lead-PM-Objetivo-Entender-as-regras-de-neg-cio-n-o-1763833726654_1763833726655.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 2KB | Linhas: 26
- 📄 **attached_assets/Pasted-VM2683-cache-manager-js-429-Uncaught-SyntaxError-Unexpected-token-export-at-VM2683-cache-manage-1763822734510_1763822734512.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 16KB | Linhas: 210
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1762724776389_1762724776396.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 114KB | Linhas: 1535
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1762725025738_1762725025742.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 40KB | Linhas: 532
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1762887766226_1762887766227.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 8KB | Linhas: 104
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763680946808_1763680946811.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 50KB | Linhas: 993
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763681028378_1763681028379.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 171
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763681885356_1763681885359.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 47KB | Linhas: 944
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763683373027_1763683373028.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 114
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763684050569_1763684050570.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 116
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763684335861_1763684335862.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 13KB | Linhas: 173
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763684940914_1763684940915.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 137
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763685568625_1763685568626.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 22KB | Linhas: 300
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763686420135_1763686420136.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 19KB | Linhas: 268
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763686538813_1763686538814.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 14KB | Linhas: 183
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763686704821_1763686704822.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 29KB | Linhas: 414
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763686905916_1763686905916.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 29KB | Linhas: 378
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763687155606_1763687155607.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 10KB | Linhas: 130
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763806717299_1763806717300.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 50KB | Linhas: 656
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763822838423_1763822838424.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 3KB | Linhas: 44
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763825541396_1763825541396.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 13KB | Linhas: 165
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763825646404_1763825646406.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 111KB | Linhas: 1520
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763825891461_1763825891463.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 78KB | Linhas: 1092
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763826235129_1763826235132.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 156KB | Linhas: 2054
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763826439115_1763826439118.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 158KB | Linhas: 2072
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763826581293_1763826581295.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 88KB | Linhas: 1175
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763826855563_1763826855563.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 8KB | Linhas: 114
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763827074161_1763827074162.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 43KB | Linhas: 686
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763827245630_1763827245631.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 22KB | Linhas: 291
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763827393991_1763827393992.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 14KB | Linhas: 192
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763827535219_1763827535220.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 14KB | Linhas: 191
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763827937381_1763827937383.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 112KB | Linhas: 1483
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763828478135_1763828478137.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 95KB | Linhas: 1236
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763837952137_1763837952139.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 99
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763838397734_1763838397735.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 85
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763839542309_1763839542311.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 80
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763840086250_1763840086251.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 10KB | Linhas: 136
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763842423816_1763842423820.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 125KB | Linhas: 1744
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-343--1761940110817_1761940110820.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 122KB | Linhas: 1634
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-343--1761940841075_1761940841079.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 117KB | Linhas: 1626
- 📄 **attached_assets/Pasted-favicon-ico-1-Failed-to-load-resource-the-server-responded-with-a-status-of-404-Not-Found-api--1762729632653_1762729632654.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 3KB | Linhas: 34
- 📄 **attached_assets/Pasted-favicon-ico-1-GET-https-e1034b6e-dfb9-401a-8e7f-80ffa6030f79-00-2dc692elmitoe-spock-replit-dev-f-1762729821014_1762729821015.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 194
- 📄 **attached_assets/Pasted-gerir-senhas-participantes-html-357-GET-https-e1034b6e-dfb9-401a-8e7f-80ffa6030f79-00-2dc692elmi-1762729994980_1762729994982.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 193
- 📄 **attached_assets/Pasted-gerir-senhas-participantes-html-357-GET-https-e1034b6e-dfb9-401a-8e7f-80ffa6030f79-00-2dc692elmi-1762730135011_1762730135012.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 193
- 📄 **attached_assets/Pasted-gerir-senhas-participantes-html-358-GET-https-e1034b6e-dfb9-401a-8e7f-80ffa6030f79-00-2dc692elmi-1762729917118_1762729917119.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 193
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762992501670_1762992501672.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 2KB | Linhas: 26
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762993163341_1762993163344.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 2KB | Linhas: 30
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762993383297_1762993383298.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 52
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762994793849_1762994793851.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 76
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762994877335_1762994877335.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 98
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762995825975_1762995825975.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 63
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762995925613_1762995925614.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 101
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762995994622_1762995994622.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 3KB | Linhas: 34
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762996105941_1762996105942.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 44
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762996196518_1762996196518.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 172
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762997105140_1762997105141.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 171
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1762997182392_1762997182393.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 171
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763044026583_1763044026584.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 10KB | Linhas: 143
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763044465313_1763044465315.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 10KB | Linhas: 144
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763044956097_1763044956098.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 2KB | Linhas: 29
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763046024723_1763046024726.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 181
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763679410793_1763679410793.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 2KB | Linhas: 27
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763679548380_1763679548381.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 3KB | Linhas: 35
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763687753525_1763687753526.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 57
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763687854764_1763687854764.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 58
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763687983469_1763687983469.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 50
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763688151495_1763688151496.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 50
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763801654354_1763801654355.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 3KB | Linhas: 30
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763801779974_1763801779977.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 42
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763802279038_1763802279040.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 42
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763802430978_1763802430979.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 52
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763802998990_1763802998992.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 52
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763804000664_1763804000664.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 13KB | Linhas: 172
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763804148636_1763804148636.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 77
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763804362527_1763804362528.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 8KB | Linhas: 81
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763804433624_1763804433624.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 100
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763804488021_1763804488021.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 64
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763804535070_1763804535070.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 14KB | Linhas: 187
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763804754295_1763804754295.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 14KB | Linhas: 189
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763804928577_1763804928578.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 13KB | Linhas: 166
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763805580428_1763805580429.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 13KB | Linhas: 167
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763805768938_1763805768939.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 14KB | Linhas: 184
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763829427528_1763829427529.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 47KB | Linhas: 665
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763829663769_1763829663772.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 123KB | Linhas: 1666
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763829821039_1763829821042.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 122KB | Linhas: 1679
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763830196470_1763830196470.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 71
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763830333953_1763830333955.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 126KB | Linhas: 1690
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763835232467_1763835232473.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 162KB | Linhas: 2372
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763840415540_1763840415540.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 66
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763840586096_1763840586098.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 69
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763840886044_1763840886045.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 71
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763841104347_1763841104348.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 71
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763841240732_1763841240733.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 71
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763841353808_1763841353809.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 58
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763841707034_1763841707039.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 197KB | Linhas: 2999
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763844419049_1763844419050.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 72
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763844517919_1763844517920.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 104
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763844605223_1763844605224.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 99
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763844704327_1763844704328.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 100
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763844869927_1763844869928.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 99
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763844963263_1763844963264.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 71
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763845009104_1763845009105.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 71
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763845063431_1763845063432.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 10KB | Linhas: 108
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1763845163151_1763845163152.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 8KB | Linhas: 75
- 📄 **attached_assets/Pasted-participante-dashboard-html-1071-PARTICIPANTE-DASHBOARD-Inicializando-participante-dashboard-h-1762884928361_1762884928363.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 8KB | Linhas: 90
- 📄 **attached_assets/Pasted-participante-dashboard-html-1081-PARTICIPANTE-DASHBOARD-Inicializando-participante-dashboard-h-1762888656228_1762888656229.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 9KB | Linhas: 127
- 📄 **attached_assets/Pasted-participante-dashboard-html-1088-PARTICIPANTE-DASHBOARD-Inicializando-participante-dashboard-h-1762885257227_1762885257228.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 7KB | Linhas: 86
- 📄 **attached_assets/Pasted-participante-dashboard-html-1137-PARTICIPANTE-DASHBOARD-Inicializando-participante-dashboard-h-1762885481132_1762885481132.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 6KB | Linhas: 61
- 📄 **attached_assets/Pasted-participante-dashboard-html-1143-PARTICIPANTE-DASHBOARD-Inicializando-participante-dashboard-h-1762885683587_1762885683588.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 6KB | Linhas: 68
- 📄 **attached_assets/Pasted-participante-dashboard-html-1150-PARTICIPANTE-DASHBOARD-Inicializando-participante-dashboard-h-1762886204929_1762886204931.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 6KB | Linhas: 61
- 📄 **attached_assets/Pasted-participante-dashboard-html-1268-PARTICIPANTE-DASHBOARD-Inicializando-participante-dashboard-h-1762890446978_1762890446979.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 13KB | Linhas: 174
- 📄 **attached_assets/Pasted-participante-dashboard-html-356-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762797271867_1762797271871.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 202KB | Linhas: 3636
- 📄 **attached_assets/Pasted-participante-dashboard-html-360-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762797413639_1762797413648.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 202KB | Linhas: 3637
- 📄 **attached_assets/Pasted-participante-dashboard-html-378-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762797640582_1762797640584.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 34KB | Linhas: 488
- 📄 **attached_assets/Pasted-participante-dashboard-html-378-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762798319089_1762798319090.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 4KB | Linhas: 52
- 📄 **attached_assets/Pasted-participante-dashboard-html-378-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762798537119_1762798537120.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 4KB | Linhas: 52
- 📄 **attached_assets/Pasted-participante-dashboard-html-378-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762799334294_1762799334297.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 81KB | Linhas: 1093
- 📄 **attached_assets/Pasted-participante-dashboard-html-378-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762800207560_1762800207573.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 363KB | Linhas: 6958
- 📄 **attached_assets/Pasted-participante-dashboard-html-378-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762800593659_1762800593663.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 340KB | Linhas: 6646
- 📄 **attached_assets/Pasted-participante-dashboard-html-623-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762801084758_1762801084762.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 339KB | Linhas: 6644
- 📄 **attached_assets/Pasted-participante-dashboard-html-650-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762807693883_1762807693886.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 346KB | Linhas: 6719
- 📄 **attached_assets/Pasted-participante-dashboard-html-794-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762816907454_1762816907455.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 3KB | Linhas: 38
- 📄 **attached_assets/Pasted-participante-dashboard-html-795-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762808948050_1762808948050.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 3KB | Linhas: 38
- 📄 **attached_assets/Pasted-participante-dashboard-html-958-PARTICIPANTE-DASHBOARD-Inicializando-rodadas-js-146-RODADAS--1762882318885_1762882318886.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 5KB | Linhas: 51
- 📄 **attached_assets/Pasted-participante-dashboard-html-995-PARTICIPANTE-DASHBOARD-Inicializando-participante-dashboard-ht-1762883933775_1762883933776.txt** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 5KB | Linhas: 63
- 📄 **attached_assets/escalabilidade do modo app do Participante_1763821987580.md** - 📖 Documentação
  - 📏 Tamanho: 5KB | Linhas: 48
- 📄 **replit.md** - 📖 Documentação
  - 📏 Tamanho: 5KB | Linhas: 76
- 📄 **system-analysis-2025-10-25.md** - 📖 Documentação
  - 📏 Tamanho: 28KB | Linhas: 657

### Assets (96 arquivos)

- 📄 **attached_assets/image_1762724305170.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762724546778.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762725132254.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762725483239.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762725641450.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762725894353.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762726033829.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762727636539.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762728104782.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762728377104.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762728879883.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762729103556.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762729244284.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762729431230.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762730325231.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762730391951.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762730413827.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762730896054.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762731375305.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762796166244.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762796329434.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762797147560.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762800752543.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762801360099.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762817120245.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762817391762.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762817487132.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762817605072.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762817965071.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762818167486.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762818660674.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762818895362.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762819014167.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762819295974.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762819652010.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762819988325.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762820170158.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762820334977.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762885040668.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762886045204.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762887056732.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762887877040.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762893483077.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762893863645.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762894803518.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762894958979.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762991752118.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762992131896.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762992244624.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762992891042.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762993458136.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1762996775213.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763038122360.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763039129722.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763042628325.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763043561881.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763044058535.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763044404789.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763045491770.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763046318053.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763680526920.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763683115049.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763685886120.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763686164096.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763691374779.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763802031055.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763803554961.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763805067414.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763805215330.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763826087303.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763826399913.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763826933063.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763830372046.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763837555044.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763843055475.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763843207803.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763843791345.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1763844013119.png** - ❓ Arquivo genérico
- 📄 **generated-icon.png** - ❓ Arquivo genérico
- 📄 **public/escudos/262.png** - ❓ Arquivo genérico
- 📄 **public/escudos/263.png** - ❓ Arquivo genérico
- 📄 **public/escudos/264.png** - ❓ Arquivo genérico
- 📄 **public/escudos/266.png** - ❓ Arquivo genérico
- 📄 **public/escudos/267.png** - ❓ Arquivo genérico
- 📄 **public/escudos/275.png** - ❓ Arquivo genérico
- 📄 **public/escudos/276.png** - ❓ Arquivo genérico
- 📄 **public/escudos/277.png** - ❓ Arquivo genérico
- 📄 **public/escudos/283.png** - ❓ Arquivo genérico
- 📄 **public/escudos/292.png** - ❓ Arquivo genérico
- 📄 **public/escudos/344.png** - ❓ Arquivo genérico
- 📄 **public/escudos/default.png** - ❓ Arquivo genérico
- 📄 **public/escudos/placeholder.png** - ❓ Arquivo genérico
- 📄 **public/favicon.ico** - ❓ Arquivo genérico
- 📄 **public/favicon.png** - ❓ Arquivo genérico
- 📄 **public/img/logo-cartoleirossobral.png** - 🖼️ Recursos estáticos
- 📄 **public/img/logo-supercartola.png** - 🎩 Integração Cartola FC

---

## 🧩 Módulos e Dependências

### 🎨 Módulos Frontend

#### 📜 public/participante/js/modules/participante-artilheiro.js

- **APIs utilizadas:** ``/api/artilheiro-campeao/${ligaId}/ranking``
- **Tamanho:** 11KB | **Linhas:** 279

#### 📜 public/participante/js/modules/participante-boas-vindas.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}/ranking`, `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`, `/api/fluxo-financeiro/${ligaId}`, `/api/times/${timeId}`, `/api/fluxo-financeiro/${ligaId}/times/${timeId}``
- **Tamanho:** 12KB | **Linhas:** 309

#### 📜 public/participante/js/modules/participante-extrato-ui.js

- **Tamanho:** 26KB | **Linhas:** 725

#### 📜 public/participante/js/modules/participante-extrato.js

- **APIs utilizadas:** `'/api/cartola/mercado/status', `/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${ultimaRodadaCompleta}`, `/api/extrato-cache/${ligaId}/times/${timeId}/cache`, `/api/extrato-cache/${PARTICIPANTE_IDS.ligaId}/times/${PARTICIPANTE_IDS.timeId}/cache``
- **Tamanho:** 13KB | **Linhas:** 281

#### 📜 public/participante/js/modules/participante-luva-ouro.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}/luva-de-ouro``
- **Tamanho:** 3KB | **Linhas:** 72

#### 📜 public/participante/js/modules/participante-mata-mata.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}/mata-mata``
- **Tamanho:** 8KB | **Linhas:** 177

#### 📜 public/participante/js/modules/participante-melhor-mes.js

- **Tamanho:** 3KB | **Linhas:** 75

#### 📜 public/participante/js/modules/participante-pontos-corridos.js

- **Tamanho:** 3KB | **Linhas:** 74

#### 📜 public/participante/js/modules/participante-ranking.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}/ranking``
- **Tamanho:** 8KB | **Linhas:** 184

#### 📜 public/participante/js/modules/participante-rodadas.js

- **APIs utilizadas:** ``/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38``
- **Tamanho:** 10KB | **Linhas:** 298

#### 📜 public/participante/js/modules/participante-top10.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}/top10``
- **Tamanho:** 4KB | **Linhas:** 119

### 🔧 Módulos Backend

#### 📜 controllers/artilheiroCampeaoController.js

- **Exports:** `export const, export const, export const, export const, export const, export const, export const, export const, export default controller`
- **Tamanho:** 14KB | **Linhas:** 420

#### 📜 controllers/cartolaController.js

- **Exports:** `export async, export async, export async, export async, export async, export async, export async`
- **Tamanho:** 5KB | **Linhas:** 181

#### 📜 controllers/extratoFinanceiroCacheController.js

- **Exports:** `export const, export const, export const, export const, export const`
- **Tamanho:** 4KB | **Linhas:** 133

#### 📜 controllers/fluxoFinanceiroController.js

- **Exports:** `export const, export const, export const, export const, export const, export const`
- **Tamanho:** 6KB | **Linhas:** 188

#### 📜 controllers/golsController.js

- **Exports:** `export const, export const, export const, export async`
- **Tamanho:** 11KB | **Linhas:** 364

#### 📜 controllers/ligaController.js

- **Tamanho:** 20KB | **Linhas:** 615

#### 📜 controllers/luvaDeOuroController.js

- **Exports:** `export default LuvaDeOuroController`
- **Tamanho:** 16KB | **Linhas:** 549

#### 📜 controllers/participanteStatusController.js

- **Exports:** `export const, export const, export const, export const`
- **Tamanho:** 4KB | **Linhas:** 155

#### 📜 controllers/rodadaController.js

- **Exports:** `export async, export async`
- **Tamanho:** 13KB | **Linhas:** 421

#### 📜 controllers/timeController.js

- **Exports:** `export const, export const`
- **Tamanho:** 4KB | **Linhas:** 134

#### 📜 routes/artilheiro-campeao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 182

#### 📜 routes/cartola-proxy.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 167

#### 📜 routes/cartola.js

- **Exports:** `export default router`
- **Tamanho:** 2KB | **Linhas:** 53

#### 📜 routes/configuracao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 168

#### 📜 routes/extratoFinanceiroCacheRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 29

#### 📜 routes/fluxoFinanceiroRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 30

#### 📜 routes/gols.js

- **Exports:** `export default router`
- **Tamanho:** 2KB | **Linhas:** 57

#### 📜 routes/ligas.js

- **Exports:** `export default router`
- **Endpoints:** `"/api/cartola/mercado/status"`
- **Tamanho:** 20KB | **Linhas:** 634

#### 📜 routes/luva-de-ouro-routes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 28

#### 📜 routes/participante-auth.js

- **Exports:** `export default router`
- **Endpoints:** ``/api/extrato-cache/${ligaId}/times/${timeId}/cache``
- **Tamanho:** 9KB | **Linhas:** 298

#### 📜 routes/rodadas-routes.js

- **Exports:** `export default router`
- **Tamanho:** 3KB | **Linhas:** 90

#### 📜 routes/times.js

- **Exports:** `export default router`
- **Tamanho:** 6KB | **Linhas:** 183

#### 📜 services/cartolaApiService.js

- **Exports:** `export default new`
- **Tamanho:** 21KB | **Linhas:** 675

#### 📜 services/cartolaService.js

- **Exports:** `export async, export async, export async`
- **Tamanho:** 5KB | **Linhas:** 174

#### 📜 services/goleirosService.js

- **Exports:** `export async, export async, export async`
- **Tamanho:** 25KB | **Linhas:** 821

#### 📜 services/golsService.js

- **Exports:** `export default golsService`
- **Tamanho:** 17KB | **Linhas:** 539

### ⚙️ Módulos de Configuração

#### 📜 public/js/luva-de-ouro/luva-de-ouro-config.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 3KB | **Linhas:** 101

#### 📜 public/js/mata-mata/mata-mata-config.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 4KB | **Linhas:** 153

#### 📜 public/js/melhor-mes/melhor-mes-config.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 4KB | **Linhas:** 154

#### 📜 public/js/pontos-corridos/pontos-corridos-config.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 3KB | **Linhas:** 109

#### 📜 public/js/rodadas/rodadas-config.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 3KB | **Linhas:** 135

#### 📜 routes/configuracao-routes.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 5KB | **Linhas:** 168

#### 📜 system-mapper.js

- **Propósito:** 📝 Script JavaScript
- **Tamanho:** 19KB | **Linhas:** 617

---

## 📊 Estatísticas Gerais

### 📈 Resumo Geral

| Métrica | Valor |
|---------|-------|
| **Total de arquivos** | 463 |
| **Tamanho total** | 20404 KB |
| **Tamanho médio** | 44 KB |

### 📋 Por Tipo de Arquivo

| Tipo | Quantidade |
|------|------------|
| 📖 **docs** | 139 |
| ❓ **other** | 10 |
| 🖼️ **assets** | 96 |
| 🎨 **frontend** | 206 |
| ⚙️ **config** | 12 |

### 📏 Por Tamanho de Arquivo

| Categoria | Quantidade | Descrição |
|-----------|------------|----------|
| 🟢 **Pequenos** | 125 | < 5KB |
| 🟡 **Médios** | 241 | 5-50KB |
| 🔴 **Grandes** | 97 | > 50KB |

### 🔍 Insights da Arquitetura

- **Arquitetura:** Full-Stack
- **Complexidade Frontend:** Alta (11 módulos)
- **Complexidade Backend:** Alta (22 rotas/controllers)
- **Modularização:** Muito modular


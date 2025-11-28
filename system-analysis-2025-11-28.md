# 📊 Análise do Sistema Super Cartola Manager

**Data da Análise:** 28/11/2025, 13:18:23

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
- 📖 **CRON-SETUP.md** - 📖 Documentação
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
- 📖 **system-analysis-2025-11-23.md** - 📖 Documentação
- 📜 **system-mapper.js** - 📝 Script JavaScript
- 📜 **uploadToDrive.js** - 📝 Script JavaScript
- 📜 **ux-analyzer.js** - 📝 Script JavaScript

---

## 🔍 Análise por Categoria

### Frontend (Cliente) (216 arquivos)

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
- 📄 **controllers/consolidacaoController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 156
- 📄 **controllers/extratoFinanceiroCacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 380
- 📄 **controllers/fluxoFinanceiroController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 512
- 📄 **controllers/golsController.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 11KB | Linhas: 364
- 📄 **controllers/ligaController.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 20KB | Linhas: 615
- 📄 **controllers/luvaDeOuroController.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 16KB | Linhas: 549
- 📄 **controllers/mataMataCacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 108
- 📄 **controllers/participanteStatusController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 144
- 📄 **controllers/pontosCorridosCacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 99
- 📄 **controllers/rankingGeralCacheController.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 6KB | Linhas: 203
- 📄 **controllers/rodadaController.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 13KB | Linhas: 421
- 📄 **controllers/timeController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 5KB | Linhas: 170
- 📄 **controllers/top10CacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 67
- 📄 **debug-escudos.js** - 📝 Script JavaScript
- 📄 **handover.js** - 📝 Script JavaScript
  - 📏 Tamanho: 12KB | Linhas: 444
- 📄 **index.js** - 🏠 Página principal/Entry point
  - 📏 Tamanho: 7KB | Linhas: 184
- 📄 **middleware/auth.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 95
- 📄 **models/ArtilheiroCampeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 1KB | Linhas: 39
- 📄 **models/ExtratoFinanceiroCache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 62
- 📄 **models/FluxoFinanceiroCampos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 66
- 📄 **models/Goleiros.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 146
- 📄 **models/Gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 10KB | Linhas: 382
- 📄 **models/Liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 2KB | Linhas: 55
- 📄 **models/MataMataCache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 21
- 📄 **models/PontosCorridosCache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 34
- 📄 **models/RankingGeralCache.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 1KB | Linhas: 37
- 📄 **models/Rodada.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **models/RodadaSnapshot.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 1KB | Linhas: 33
- 📄 **models/Time.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **models/Top10Cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 47
- 📄 **public/admin.html** - 👤 Administração/Gestão
  - 📏 Tamanho: 28KB | Linhas: 755
- 📄 **public/criar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 9KB | Linhas: 207
- 📄 **public/css/base.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 11KB | Linhas: 455
- 📄 **public/css/modules/criar-liga.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 10KB | Linhas: 521
- 📄 **public/css/modules/dashboard.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 7KB | Linhas: 399
- 📄 **public/css/modules/editar-liga.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 469
- 📄 **public/css/modules/ferramentas.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 151
- 📄 **public/css/modules/fluxo-financeiro.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 32KB | Linhas: 1350
- 📄 **public/css/modules/luva-de-ouro.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 13KB | Linhas: 665
- 📄 **public/css/modules/mata-mata.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 482
- 📄 **public/css/modules/melhor-mes.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 11KB | Linhas: 585
- 📄 **public/css/modules/parciais.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 2KB | Linhas: 127
- 📄 **public/css/modules/participantes.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 16KB | Linhas: 855
- 📄 **public/css/modules/pontos-corridos.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 22KB | Linhas: 1097
- 📄 **public/css/modules/ranking-geral.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 7KB | Linhas: 291
- 📄 **public/css/modules/rodadas.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 8KB | Linhas: 440
- 📄 **public/css/modules/top10.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 6KB | Linhas: 288
- 📄 **public/css/performance.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 1KB | Linhas: 56
- 📄 **public/dashboard.html** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 27KB | Linhas: 626
- 📄 **public/detalhe-liga.css** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 17KB | Linhas: 710
- 📄 **public/detalhe-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 10KB | Linhas: 235
- 📄 **public/editar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 123
- 📄 **public/ferramentas-rodadas.html** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 10KB | Linhas: 282
- 📄 **public/ferramentas.html** - 📄 Página HTML
  - 📏 Tamanho: 8KB | Linhas: 185
- 📄 **public/fronts/artilheiro-campeao.html** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 5KB | Linhas: 110
- 📄 **public/fronts/fluxo-financeiro.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 43
- 📄 **public/fronts/luva-de-ouro.html** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 1KB | Linhas: 35
- 📄 **public/fronts/mata-mata.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 136
- 📄 **public/fronts/melhor-mes.html** - 📄 Página HTML
  - 📏 Tamanho: 2KB | Linhas: 69
- 📄 **public/fronts/parciais.html** - 📄 Página HTML
  - 📏 Tamanho: 13KB | Linhas: 406
- 📄 **public/fronts/participantes.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 85
- 📄 **public/fronts/pontos-corridos.html** - 📄 Página HTML
  - 📏 Tamanho: 5KB | Linhas: 155
- 📄 **public/fronts/ranking-geral.html** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 2KB | Linhas: 61
- 📄 **public/fronts/rodadas.html** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 3KB | Linhas: 77
- 📄 **public/fronts/top10.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 51
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
- 📄 **public/js/ferramentas/ferramentas-cache-admin.js** - 👤 Administração/Gestão
  - 📏 Tamanho: 5KB | Linhas: 148
- 📄 **public/js/ferramentas/ferramentas-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 321
- 📄 **public/js/filtro-liga-especial.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 104
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-api.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 203
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 19KB | Linhas: 531
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-campos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 270
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 609
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-participante.js** - 📝 Script JavaScript
  - 📏 Tamanho: 14KB | Linhas: 279
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 361
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 90
- 📄 **public/js/fluxo-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 475
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
  - 📏 Tamanho: 4KB | Linhas: 156
- 📄 **public/js/luva-de-ouro/luva-de-ouro-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 101
- 📄 **public/js/luva-de-ouro/luva-de-ouro-core.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 4KB | Linhas: 156
- 📄 **public/js/luva-de-ouro/luva-de-ouro-orquestrador.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 8KB | Linhas: 263
- 📄 **public/js/luva-de-ouro/luva-de-ouro-ui.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 10KB | Linhas: 320
- 📄 **public/js/luva-de-ouro/luva-de-ouro-utils.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 38KB | Linhas: 960
- 📄 **public/js/luva-de-ouro.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 4KB | Linhas: 152
- 📄 **public/js/mata-mata/mata-mata-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 4KB | Linhas: 154
- 📄 **public/js/mata-mata/mata-mata-confrontos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 227
- 📄 **public/js/mata-mata/mata-mata-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 500
- 📄 **public/js/mata-mata/mata-mata-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 488
- 📄 **public/js/mata-mata/mata-mata-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 12KB | Linhas: 369
- 📄 **public/js/mata-mata.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 30
- 📄 **public/js/melhor-mes/melhor-mes-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 4KB | Linhas: 154
- 📄 **public/js/melhor-mes/melhor-mes-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 474
- 📄 **public/js/melhor-mes/melhor-mes-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 275
- 📄 **public/js/melhor-mes/melhor-mes-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 287
- 📄 **public/js/melhor-mes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 322
- 📄 **public/js/navigation.js** - 🧭 Sistema de navegação
  - 📏 Tamanho: 3KB | Linhas: 76
- 📄 **public/js/participantes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 23KB | Linhas: 664
- 📄 **public/js/pontos-corridos/pontos-corridos-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 246
- 📄 **public/js/pontos-corridos/pontos-corridos-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 109
- 📄 **public/js/pontos-corridos/pontos-corridos-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 20KB | Linhas: 622
- 📄 **public/js/pontos-corridos/pontos-corridos-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 16KB | Linhas: 536
- 📄 **public/js/pontos-corridos/pontos-corridos-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 25KB | Linhas: 714
- 📄 **public/js/pontos-corridos-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 237
- 📄 **public/js/pontos-corridos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 61
- 📄 **public/js/ranking.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 9KB | Linhas: 255
- 📄 **public/js/rodadas/rodadas-cache.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 9KB | Linhas: 389
- 📄 **public/js/rodadas/rodadas-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 135
- 📄 **public/js/rodadas/rodadas-core.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 13KB | Linhas: 417
- 📄 **public/js/rodadas/rodadas-orquestrador.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 12KB | Linhas: 415
- 📄 **public/js/rodadas/rodadas-ui.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 12KB | Linhas: 367
- 📄 **public/js/rodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 10KB | Linhas: 324
- 📄 **public/js/seletor-ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 125
- 📄 **public/js/sistema-modulos-init.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 38
- 📄 **public/js/top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 14KB | Linhas: 476
- 📄 **public/js/utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 208
- 📄 **public/layout.html** - 📄 Página HTML
  - 📏 Tamanho: 14KB | Linhas: 349
- 📄 **public/migrar-localstorage-mongodb.html** - 📄 Página HTML
  - 📏 Tamanho: 23KB | Linhas: 665
- 📄 **public/participante/css/participante.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 16KB | Linhas: 734
- 📄 **public/participante/fronts/artilheiro.html** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 2KB | Linhas: 103
- 📄 **public/participante/fronts/boas-vindas.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 29
- 📄 **public/participante/fronts/extrato.html** - 📄 Página HTML
  - 📏 Tamanho: 11KB | Linhas: 496
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
  - 📏 Tamanho: 12KB | Linhas: 347
- 📄 **public/participante/js/modules/participante-artilheiro.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 11KB | Linhas: 279
- 📄 **public/participante/js/modules/participante-boas-vindas.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 16KB | Linhas: 386
- 📄 **public/participante/js/modules/participante-extrato-ui.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 41KB | Linhas: 1306
- 📄 **public/participante/js/modules/participante-extrato.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 18KB | Linhas: 403
- 📄 **public/participante/js/modules/participante-luva-ouro.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 72
- 📄 **public/participante/js/modules/participante-mata-mata.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 8KB | Linhas: 177
- 📄 **public/participante/js/modules/participante-melhor-mes.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 75
- 📄 **public/participante/js/modules/participante-pontos-corridos.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 74
- 📄 **public/participante/js/modules/participante-ranking.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 218
- 📄 **public/participante/js/modules/participante-rodadas.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 12KB | Linhas: 353
- 📄 **public/participante/js/modules/participante-top10.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 4KB | Linhas: 119
- 📄 **public/participante/js/participante-auth.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 451
- 📄 **public/participante/js/participante-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 232
- 📄 **public/participante/js/participante-navigation.js** - 🧭 Sistema de navegação
  - 📏 Tamanho: 20KB | Linhas: 402
- 📄 **public/participante/js/participante-status.js** - 📝 Script JavaScript
  - 📏 Tamanho: 5KB | Linhas: 144
- 📄 **public/participante-dashboard.html** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 61KB | Linhas: 1307
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
- 📄 **routes/cache-universal-routes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 45
- 📄 **routes/cartola-proxy.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 5KB | Linhas: 167
- 📄 **routes/cartola.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 2KB | Linhas: 53
- 📄 **routes/configuracao-routes.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 5KB | Linhas: 168
- 📄 **routes/consolidacao-routes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 21
- 📄 **routes/extratoFinanceiroCacheRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 29
- 📄 **routes/fluxoFinanceiroRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 36
- 📄 **routes/gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 2KB | Linhas: 57
- 📄 **routes/ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 20KB | Linhas: 634
- 📄 **routes/luva-de-ouro-routes.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 1KB | Linhas: 28
- 📄 **routes/mataMataCacheRoutes.js** - 📝 Script JavaScript
- 📄 **routes/participante-auth.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 350
- 📄 **routes/pontosCorridosCacheRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **routes/ranking-geral-cache-routes.js** - 🏅 Sistema de Rankings
- 📄 **routes/rodadas-routes.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 3KB | Linhas: 95
- 📄 **routes/times.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 137
- 📄 **routes/top10CacheRoutes.js** - 📝 Script JavaScript
- 📄 **scripts/consolidar-historico-urgente.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 82
- 📄 **scripts/cron-consolidar-rodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 3KB | Linhas: 111
- 📄 **scripts/exportar-escudos-unicos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 47
- 📄 **scripts/limpartimes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 31
- 📄 **scripts/populateRodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 2KB | Linhas: 82
- 📄 **scripts/replace-ids.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 58
- 📄 **services/cartolaApiService.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 22KB | Linhas: 683
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
- 📄 **utils/smartDataFetcher.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 47
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
  - 📏 Tamanho: 423KB | Linhas: 11410
- 📄 **package.json** - 📦 Configuração npm/dependências
  - 📏 Tamanho: 2KB | Linhas: 73
- 📄 **scripts/times-da-liga.json** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 2KB | Linhas: 46

### Documentação (117 arquivos)

- 📄 **CONTEXTOS-ADMIN-PARTICIPANTE.md** - 👤 Administração/Gestão
  - 📏 Tamanho: 7KB | Linhas: 235
- 📄 **CRON-SETUP.md** - 📖 Documentação
  - 📏 Tamanho: 3KB | Linhas: 148
- 📄 **LEVANTAMENTO-REQUISITOS-RESPOSTA.md** - 📖 Documentação
  - 📏 Tamanho: 12KB | Linhas: 435
- 📄 **SISTEMA-COMPLETO-REGRAS-FINANCEIRO.md** - 📖 Documentação
  - 📏 Tamanho: 34KB | Linhas: 1252
- 📄 **attached_assets/Pasted--DOCTYPE-html-html-class-dark-lang-en-head-meta-charset-utf-8-meta-content-widt-1764199726048_1764199726049.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 202
- 📄 **attached_assets/Pasted--DOCTYPE-html-html-class-dark-lang-en-head-meta-charset-utf-8-meta-content-width--1764206529019_1764206529020.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 148
- 📄 **attached_assets/Pasted--DOCTYPE-html-html-class-dark-lang-en-head-meta-charset-utf-8-meta-content-width--1764206658531_1764206658532.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 148
- 📄 **attached_assets/Pasted--DOCTYPE-html-html-class-dark-lang-en-head-meta-charset-utf-8-meta-content-width--1764206683690_1764206683690.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 160
- 📄 **attached_assets/Pasted--DOCTYPE-html-html-class-dark-lang-pt-br-head-meta-charset-utf-8-meta-content-wid-1764286116069_1764286116071.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 152
- 📄 **attached_assets/Pasted--DOCTYPE-html-html-class-dark-lang-pt-br-head-meta-charset-utf-8-meta-content-wid-1764286199260_1764286199261.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 152
- 📄 **attached_assets/Pasted--DOCTYPE-html-html-lang-en-head-meta-charset-utf-8-meta-content-width-device-width--1764199113284_1764199113285.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 13KB | Linhas: 206
- 📄 **attached_assets/Pasted-1-FALHA-CR-TICA-Trusting-the-Client-Confian-a-no-Cliente-Local-fluxo-financeiro-participante--1764204390112_1764204390112.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 106
- 📄 **attached_assets/Pasted-Com-base-na-an-lise-do-log-existem-tr-s-problemas-principais-que-precisam-de-aten-o-Vou-classific-1764202872624_1764202872624.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 3KB | Linhas: 47
- 📄 **attached_assets/Pasted-Voc-tocou-na-ferida-arquitetural-do-projeto-O-que-voc-descreveu-a-diferen-a-entre-um-sistema-OL-1764205540133_1764205540134.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 167
- 📄 **attached_assets/Pasted-cache-manager-js-439-CACHE-MANAGER-Sistema-de-cache-inteligente-carregado-cache-manager-js-50--1764113332859_1764113332859.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 44
- 📄 **attached_assets/Pasted-cache-manager-js-439-CACHE-MANAGER-Sistema-de-cache-inteligente-carregado-cache-manager-js-50--1764113614883_1764113614884.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 29KB | Linhas: 567
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763926034816_1763926034817.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 87
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763929262578_1763929262579.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 8KB | Linhas: 118
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763929588194_1763929588195.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 20KB | Linhas: 345
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763929660272_1763929660273.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 167
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1763930044597_1763930044598.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 124
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764030959160_1764030959161.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 8KB | Linhas: 115
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764031062976_1764031062976.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 91
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764032957091_1764032957093.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 163
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764033196886_1764033196889.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 38KB | Linhas: 510
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764033413533_1764033413535.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 88
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764033573995_1764033573996.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 94
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764033740969_1764033740969.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 94
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764034228078_1764034228079.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 18KB | Linhas: 254
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764034486456_1764034486458.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 120KB | Linhas: 1628
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764034713431_1764034713433.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 90KB | Linhas: 1394
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764034930780_1764034930782.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 84KB | Linhas: 1143
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764035274868_1764035274870.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 109KB | Linhas: 1471
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764035608630_1764035608634.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 83KB | Linhas: 1128
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764113883504_1764113883504.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 72
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764114964380_1764114964381.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 36KB | Linhas: 667
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764115476506_1764115476506.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 78
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764115699844_1764115699845.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 17KB | Linhas: 230
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764116797772_1764116797775.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 45KB | Linhas: 606
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764182070010_1764182070011.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 72
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764182861098_1764182861099.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 34KB | Linhas: 455
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764183050504_1764183050506.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 32KB | Linhas: 435
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764183330038_1764183330039.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 159
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764183590547_1764183590548.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 79
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764184081084_1764184081084.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 82
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764184317312_1764184317313.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 82
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764185410970_1764185410971.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 161
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764186322502_1764186322503.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 98
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764186717798_1764186717799.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 75
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764186915503_1764186915504.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 141
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764187692567_1764187692568.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 11KB | Linhas: 136
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764187900891_1764187900892.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 10KB | Linhas: 123
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764188039290_1764188039291.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 120
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764188141182_1764188141183.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 87
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764188318527_1764188318529.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 27KB | Linhas: 355
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764188646084_1764188646086.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 26KB | Linhas: 348
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764189108166_1764189108167.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 27KB | Linhas: 356
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764189729498_1764189729499.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 10KB | Linhas: 125
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764190406062_1764190406063.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 72
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764190697821_1764190697822.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 96
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764190812964_1764190812965.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 72
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764190929975_1764190929976.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 72
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764191009812_1764191009813.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 32KB | Linhas: 438
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764200821153_1764200821155.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 74KB | Linhas: 965
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764200837494_1764200837496.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 74KB | Linhas: 965
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764201214601_1764201214602.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 121
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764201506892_1764201506893.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 12KB | Linhas: 149
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764287978736_1764287978737.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 99
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764288066268_1764288066268.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 8KB | Linhas: 110
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764289859778_1764289859779.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 13KB | Linhas: 173
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764290143943_1764290143944.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 54KB | Linhas: 639
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-316--1764290306900_1764290306902.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 30KB | Linhas: 376
- 📄 **attached_assets/Pasted-participante-auth-js-162-Uncaught-SyntaxError-Identifier-nomeTimeTexto-has-already-been-declared-1764285843438_1764285843438.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 66
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764197752244_1764197752245.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 61
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764197993004_1764197993005.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 10KB | Linhas: 119
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764198144990_1764198144992.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 65
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764198180412_1764198180412.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 65
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764199325707_1764199325708.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 39KB | Linhas: 531
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764199905653_1764199905654.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 36KB | Linhas: 512
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764200146300_1764200146301.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 33KB | Linhas: 428
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764200574154_1764200574155.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 30KB | Linhas: 443
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764202600143_1764202600144.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 27KB | Linhas: 327
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764202774681_1764202774683.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 27KB | Linhas: 325
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764206936192_1764206936193.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 41
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764207123201_1764207123201.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 41
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764207210528_1764207210529.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 41
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764207276825_1764207276825.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 41
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764207330333_1764207330333.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 41
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764207455305_1764207455306.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 76
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764208041102_1764208041102.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 43
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764285931222_1764285931224.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 5KB | Linhas: 52
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764286355373_1764286355373.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 43
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764286604094_1764286604096.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 43
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764286762658_1764286762659.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 43
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764288551629_1764288551631.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 62
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764290583585_1764290583586.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 59KB | Linhas: 874
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764290615977_1764290615979.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 59KB | Linhas: 876
- 📄 **attached_assets/Pasted-participante-auth-js-3-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764291385834_1764291385836.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 55KB | Linhas: 800
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764072422496_1764072422499.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 107KB | Linhas: 1562
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764159140253_1764159140256.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 98KB | Linhas: 1456
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764159383484_1764159383486.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 59KB | Linhas: 784
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764159993113_1764159993115.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 71KB | Linhas: 1104
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764164662727_1764164662733.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 115KB | Linhas: 1846
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764177782813_1764177782815.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 60KB | Linhas: 806
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764178299091_1764178299092.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 85
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764178733620_1764178733622.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 70KB | Linhas: 1083
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764179223350_1764179223352.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 60KB | Linhas: 803
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764179398034_1764179398036.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 69KB | Linhas: 927
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764180609694_1764180609696.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 61KB | Linhas: 822
- 📄 **attached_assets/Pasted-participante-auth-js-4-PARTICIPANTE-AUTH-Carregando-sistema-de-autentica-o-participante-auth--1764196792346_1764196792347.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 9KB | Linhas: 88
- 📄 **attached_assets/Pasted-uma-refatoriza-o-completa-do-m-dulo-Mata-Mata-para-resolver-os-problemas-de-performance-lentid-o--1764031698446_1764031698447.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 2KB | Linhas: 27
- 📄 **attached_assets/content-1764206270494.md** - 📖 Documentação
  - 📏 Tamanho: 5KB | Linhas: 146
- 📄 **attached_assets/content-1764206273086.md** - 📖 Documentação
  - 📏 Tamanho: 16KB | Linhas: 432
- 📄 **attached_assets/content-1764206273827.md** - 📖 Documentação
  - 📏 Tamanho: 18KB | Linhas: 372
- 📄 **replit.md** - 📖 Documentação
  - 📏 Tamanho: 5KB | Linhas: 76
- 📄 **system-analysis-2025-10-25.md** - 📖 Documentação
  - 📏 Tamanho: 28KB | Linhas: 657
- 📄 **system-analysis-2025-11-23.md** - 📖 Documentação
  - 📏 Tamanho: 68KB | Linhas: 1153

### Assets (54 arquivos)

- 📄 **attached_assets/Screenshot_20251126_125629_Chrome_1764172650431.png** - ❓ Arquivo genérico
- 📄 **attached_assets/Screenshot_20251126_153538_Instagram_1764196097041.png** - ❓ Arquivo genérico
- 📄 **attached_assets/Screenshot_20251126_192650_Chrome_1764196114769.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764030724346.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764031448951.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764035817757.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764036259523.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764036700095.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764116504832.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764183990870.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764184645303.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764185248818.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764197122683.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764197232332.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764197561446.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764197939833.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764198342339.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764199563007.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764200105484.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764200437944.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764206980849.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764207550333.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764207687396.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764285706508.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764286349109.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764286430850.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764286501498.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764286801751.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764286833408.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764286987210.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764287150471.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764288930182.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764289210075.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764289349973.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764289588394.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1764290951127.png** - ❓ Arquivo genérico
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

- **APIs utilizadas:** ``/api/ligas/${ligaId}/ranking`, `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`, `/api/times/${timeId}`, `/api/fluxo-financeiro/${ligaId}/extrato/${timeId}`, `/api/ranking-cache/${ligaId}``
- **Tamanho:** 16KB | **Linhas:** 386

#### 📜 public/participante/js/modules/participante-extrato-ui.js

- **Tamanho:** 41KB | **Linhas:** 1306

#### 📜 public/participante/js/modules/participante-extrato.js

- **APIs utilizadas:** `'/api/cartola/mercado/status', `/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${ultimaRodadaCompleta}`, `/api/extrato-cache/${ligaId}/times/${timeId}/cache`, `/api/extrato-cache/${PARTICIPANTE_IDS.ligaId}/times/${PARTICIPANTE_IDS.timeId}/cache?rodadaAtual=${ultimaRodadaCompleta}`, `/api/extrato-cache/${PARTICIPANTE_IDS.ligaId}/times/${PARTICIPANTE_IDS.timeId}/cache``
- **Tamanho:** 18KB | **Linhas:** 403

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
- **Tamanho:** 9KB | **Linhas:** 218

#### 📜 public/participante/js/modules/participante-rodadas.js

- **APIs utilizadas:** ``/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38``
- **Tamanho:** 12KB | **Linhas:** 353

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

#### 📜 controllers/consolidacaoController.js

- **Exports:** `export const, export const, export const`
- **Tamanho:** 6KB | **Linhas:** 156

#### 📜 controllers/extratoFinanceiroCacheController.js

- **Exports:** `export const, export const, export const, export const, export const, export const`
- **Tamanho:** 15KB | **Linhas:** 380

#### 📜 controllers/fluxoFinanceiroController.js

- **Exports:** `export const, export const, export const, export const, export const, export const, export const, export const`
- **Tamanho:** 17KB | **Linhas:** 512

#### 📜 controllers/golsController.js

- **Exports:** `export const, export const, export const, export async`
- **Tamanho:** 11KB | **Linhas:** 364

#### 📜 controllers/ligaController.js

- **Tamanho:** 20KB | **Linhas:** 615

#### 📜 controllers/luvaDeOuroController.js

- **Exports:** `export default LuvaDeOuroController`
- **Tamanho:** 16KB | **Linhas:** 549

#### 📜 controllers/mataMataCacheController.js

- **Exports:** `export const, export const, export const, export const`
- **Tamanho:** 3KB | **Linhas:** 108

#### 📜 controllers/participanteStatusController.js

- **Exports:** `export const, export const, export const, export const, export const, export const`
- **Tamanho:** 4KB | **Linhas:** 144

#### 📜 controllers/pontosCorridosCacheController.js

- **Exports:** `export const, export const, export const`
- **Tamanho:** 4KB | **Linhas:** 99

#### 📜 controllers/rankingGeralCacheController.js

- **Exports:** `export async, export async, export async, export const`
- **Tamanho:** 6KB | **Linhas:** 203

#### 📜 controllers/rodadaController.js

- **Exports:** `export async, export async`
- **Tamanho:** 13KB | **Linhas:** 421

#### 📜 controllers/timeController.js

- **Exports:** `export const, export const`
- **Tamanho:** 5KB | **Linhas:** 170

#### 📜 controllers/top10CacheController.js

- **Exports:** `export const, export const`
- **Tamanho:** 2KB | **Linhas:** 67

#### 📜 routes/artilheiro-campeao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 182

#### 📜 routes/cache-universal-routes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 45

#### 📜 routes/cartola-proxy.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 167

#### 📜 routes/cartola.js

- **Exports:** `export default router`
- **Tamanho:** 2KB | **Linhas:** 53

#### 📜 routes/configuracao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 168

#### 📜 routes/consolidacao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 21

#### 📜 routes/extratoFinanceiroCacheRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 29

#### 📜 routes/fluxoFinanceiroRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 36

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

#### 📜 routes/mataMataCacheRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 0KB | **Linhas:** 16

#### 📜 routes/participante-auth.js

- **Exports:** `export default router`
- **Endpoints:** ``/api/extrato-cache/${ligaId}/times/${timeId}/cache``
- **Tamanho:** 13KB | **Linhas:** 350

#### 📜 routes/pontosCorridosCacheRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 19

#### 📜 routes/ranking-geral-cache-routes.js

- **Exports:** `export default router`
- **Tamanho:** 0KB | **Linhas:** 18

#### 📜 routes/rodadas-routes.js

- **Exports:** `export default router`
- **Tamanho:** 3KB | **Linhas:** 95

#### 📜 routes/times.js

- **Exports:** `export default router`
- **Tamanho:** 4KB | **Linhas:** 137

#### 📜 routes/top10CacheRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 0KB | **Linhas:** 18

#### 📜 services/cartolaApiService.js

- **Exports:** `export default new`
- **Tamanho:** 22KB | **Linhas:** 683

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
- **Tamanho:** 4KB | **Linhas:** 154

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
| **Total de arquivos** | 404 |
| **Tamanho total** | 13108 KB |
| **Tamanho médio** | 32 KB |

### 📋 Por Tipo de Arquivo

| Tipo | Quantidade |
|------|------------|
| 📖 **docs** | 117 |
| 🖼️ **assets** | 54 |
| ❓ **other** | 5 |
| 🎨 **frontend** | 216 |
| ⚙️ **config** | 12 |

### 📏 Por Tamanho de Arquivo

| Categoria | Quantidade | Descrição |
|-----------|------------|----------|
| 🟢 **Pequenos** | 132 | < 5KB |
| 🟡 **Médios** | 221 | 5-50KB |
| 🔴 **Grandes** | 51 | > 50KB |

### 🔍 Insights da Arquitetura

- **Arquitetura:** Full-Stack
- **Complexidade Frontend:** Alta (11 módulos)
- **Complexidade Backend:** Alta (33 rotas/controllers)
- **Modularização:** Muito modular


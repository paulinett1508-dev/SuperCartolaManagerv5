# 📊 Análise do Sistema Super Cartola Manager

**Data da Análise:** 03/12/2025, 01:07:49

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
- 📜 **limpar-cache-top10.js** - 📝 Script JavaScript
- 📜 **limpar-duplicatas-rodadas.js** - 📅 Gestão de Rodadas
- 📋 **package-lock.json** - 📋 Dados JSON
- 📋 **package.json** - 📦 Configuração npm/dependências
- 📖 **replit.md** - 📖 Documentação
- 📄 **replit.nix** - ❓ Arquivo genérico
- 📖 **system-analysis-2025-11-28.md** - 📖 Documentação
- 📜 **system-mapper.js** - 📝 Script JavaScript
- 📜 **uploadToDrive.js** - 📝 Script JavaScript
- 📜 **ux-analyzer.js** - 📝 Script JavaScript

---

## 🔍 Análise por Categoria

### Frontend (Cliente) (232 arquivos)

- 📄 **backup-sistema-completo.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 294
- 📄 **backupJson.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 39
- 📄 **backupScheduler.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 57
- 📄 **config/database.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 54
- 📄 **controllers/artilheiroCampeaoController.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 27KB | Linhas: 782
- 📄 **controllers/cartolaController.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 5KB | Linhas: 181
- 📄 **controllers/consolidacaoController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 19KB | Linhas: 475
- 📄 **controllers/extratoFinanceiroCacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 27KB | Linhas: 773
- 📄 **controllers/fluxoFinanceiroController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 512
- 📄 **controllers/golsController.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 11KB | Linhas: 364
- 📄 **controllers/ligaController.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 19KB | Linhas: 653
- 📄 **controllers/luvaDeOuroController.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 16KB | Linhas: 549
- 📄 **controllers/mataMataCacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 108
- 📄 **controllers/participanteStatusController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 310
- 📄 **controllers/pontosCorridosCacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 115
- 📄 **controllers/rankingGeralCacheController.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 6KB | Linhas: 203
- 📄 **controllers/rankingTurnoController.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 4KB | Linhas: 150
- 📄 **controllers/rodadaController.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 16KB | Linhas: 471
- 📄 **controllers/timeController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 5KB | Linhas: 191
- 📄 **controllers/top10CacheController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 78
- 📄 **debug-escudos.js** - 📝 Script JavaScript
- 📄 **handover.js** - 📝 Script JavaScript
  - 📏 Tamanho: 12KB | Linhas: 444
- 📄 **index.js** - 🏠 Página principal/Entry point
  - 📏 Tamanho: 7KB | Linhas: 208
- 📄 **limpar-cache-top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 93
- 📄 **limpar-duplicatas-rodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 5KB | Linhas: 148
- 📄 **middleware/auth.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 95
- 📄 **models/ArtilheiroCampeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 1KB | Linhas: 39
- 📄 **models/ExtratoFinanceiroCache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 75
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
- 📄 **models/MelhorMesCache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 195
- 📄 **models/PontosCorridosCache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 34
- 📄 **models/RankingGeralCache.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 1KB | Linhas: 37
- 📄 **models/RankingTurno.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 2KB | Linhas: 76
- 📄 **models/Rodada.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **models/RodadaSnapshot.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 2KB | Linhas: 79
- 📄 **models/Time.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 115
- 📄 **models/Top10Cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 47
- 📄 **public/admin-consolidacao.html** - 👤 Administração/Gestão
  - 📏 Tamanho: 22KB | Linhas: 550
- 📄 **public/admin.html** - 👤 Administração/Gestão
  - 📏 Tamanho: 28KB | Linhas: 755
- 📄 **public/criar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 9KB | Linhas: 207
- 📄 **public/css/base.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 11KB | Linhas: 455
- 📄 **public/css/modules/artilheiro-campeao.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 19KB | Linhas: 979
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
  - 📏 Tamanho: 15KB | Linhas: 752
- 📄 **public/css/modules/mata-mata.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 507
- 📄 **public/css/modules/melhor-mes.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 11KB | Linhas: 585
- 📄 **public/css/modules/parciais.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 2KB | Linhas: 127
- 📄 **public/css/modules/participantes.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 16KB | Linhas: 855
- 📄 **public/css/modules/pontos-corridos.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 23KB | Linhas: 1127
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
  - 📏 Tamanho: 11KB | Linhas: 248
- 📄 **public/editar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 123
- 📄 **public/ferramentas-rodadas.html** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 10KB | Linhas: 282
- 📄 **public/ferramentas.html** - 📄 Página HTML
  - 📏 Tamanho: 8KB | Linhas: 185
- 📄 **public/fronts/artilheiro-campeao.html** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 5KB | Linhas: 150
- 📄 **public/fronts/fluxo-financeiro.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 43
- 📄 **public/fronts/luva-de-ouro.html** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 3KB | Linhas: 115
- 📄 **public/fronts/mata-mata.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 136
- 📄 **public/fronts/melhor-mes.html** - 📄 Página HTML
  - 📏 Tamanho: 2KB | Linhas: 69
- 📄 **public/fronts/parciais.html** - 📄 Página HTML
  - 📏 Tamanho: 4KB | Linhas: 197
- 📄 **public/fronts/participantes.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 85
- 📄 **public/fronts/pontos-corridos.html** - 📄 Página HTML
  - 📏 Tamanho: 5KB | Linhas: 155
- 📄 **public/fronts/ranking-geral.html** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 13KB | Linhas: 414
- 📄 **public/fronts/rodadas.html** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 4KB | Linhas: 133
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
  - 📏 Tamanho: 16KB | Linhas: 434
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-detector.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 10KB | Linhas: 319
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-scheduler.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 14KB | Linhas: 436
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-ui.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 43KB | Linhas: 906
- 📄 **public/js/artilheiro-campeao/artilheiro-campeao-utils.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 11KB | Linhas: 352
- 📄 **public/js/artilheiro-campeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 36KB | Linhas: 918
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
  - 📏 Tamanho: 30KB | Linhas: 804
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
  - 📏 Tamanho: 33KB | Linhas: 967
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-campos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 270
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 28KB | Linhas: 814
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-participante.js** - 📝 Script JavaScript
  - 📏 Tamanho: 14KB | Linhas: 279
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 16KB | Linhas: 386
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
  - 📏 Tamanho: 6KB | Linhas: 250
- 📄 **public/js/luva-de-ouro/luva-de-ouro-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 106
- 📄 **public/js/luva-de-ouro/luva-de-ouro-core.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 5KB | Linhas: 198
- 📄 **public/js/luva-de-ouro/luva-de-ouro-orquestrador.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 12KB | Linhas: 370
- 📄 **public/js/luva-de-ouro/luva-de-ouro-scheduler.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 8KB | Linhas: 267
- 📄 **public/js/luva-de-ouro/luva-de-ouro-ui.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 22KB | Linhas: 671
- 📄 **public/js/luva-de-ouro/luva-de-ouro-utils.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 38KB | Linhas: 960
- 📄 **public/js/luva-de-ouro.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 5KB | Linhas: 178
- 📄 **public/js/mata-mata/mata-mata-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 4KB | Linhas: 154
- 📄 **public/js/mata-mata/mata-mata-confrontos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 227
- 📄 **public/js/mata-mata/mata-mata-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 500
- 📄 **public/js/mata-mata/mata-mata-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 463
- 📄 **public/js/mata-mata/mata-mata-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 393
- 📄 **public/js/mata-mata.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 30
- 📄 **public/js/melhor-mes/melhor-mes-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 4KB | Linhas: 154
- 📄 **public/js/melhor-mes/melhor-mes-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 14KB | Linhas: 502
- 📄 **public/js/melhor-mes/melhor-mes-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 274
- 📄 **public/js/melhor-mes/melhor-mes-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 307
- 📄 **public/js/melhor-mes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 316
- 📄 **public/js/navigation.js** - 🧭 Sistema de navegação
  - 📏 Tamanho: 3KB | Linhas: 76
- 📄 **public/js/parciais-scheduler.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 310
- 📄 **public/js/parciais.js** - 📝 Script JavaScript
  - 📏 Tamanho: 20KB | Linhas: 534
- 📄 **public/js/participantes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 27KB | Linhas: 741
- 📄 **public/js/pontos-corridos/pontos-corridos-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 252
- 📄 **public/js/pontos-corridos/pontos-corridos-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 109
- 📄 **public/js/pontos-corridos/pontos-corridos-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 707
- 📄 **public/js/pontos-corridos/pontos-corridos-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 16KB | Linhas: 568
- 📄 **public/js/pontos-corridos/pontos-corridos-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 24KB | Linhas: 691
- 📄 **public/js/pontos-corridos-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 279
- 📄 **public/js/pontos-corridos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 61
- 📄 **public/js/ranking.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 19KB | Linhas: 570
- 📄 **public/js/rodadas/rodadas-cache.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 9KB | Linhas: 389
- 📄 **public/js/rodadas/rodadas-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 135
- 📄 **public/js/rodadas/rodadas-core.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 16KB | Linhas: 556
- 📄 **public/js/rodadas/rodadas-orquestrador.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 12KB | Linhas: 450
- 📄 **public/js/rodadas/rodadas-ui.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 12KB | Linhas: 367
- 📄 **public/js/rodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 14KB | Linhas: 468
- 📄 **public/js/seletor-ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 125
- 📄 **public/js/sistema-modulos-init.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 36
- 📄 **public/js/top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 514
- 📄 **public/js/utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 208
- 📄 **public/layout.html** - 📄 Página HTML
  - 📏 Tamanho: 14KB | Linhas: 349
- 📄 **public/migrar-localstorage-mongodb.html** - 📄 Página HTML
  - 📏 Tamanho: 23KB | Linhas: 665
- 📄 **public/participante/css/participante.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 16KB | Linhas: 734
- 📄 **public/participante/fronts/artilheiro.html** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 2KB | Linhas: 108
- 📄 **public/participante/fronts/boas-vindas.html** - 📄 Página HTML
  - 📏 Tamanho: 2KB | Linhas: 59
- 📄 **public/participante/fronts/extrato.html** - 📄 Página HTML
  - 📏 Tamanho: 14KB | Linhas: 540
- 📄 **public/participante/fronts/luva-ouro.html** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 3KB | Linhas: 134
- 📄 **public/participante/fronts/mata-mata.html** - 📄 Página HTML
  - 📏 Tamanho: 4KB | Linhas: 203
- 📄 **public/participante/fronts/melhor-mes.html** - 📄 Página HTML
  - 📏 Tamanho: 10KB | Linhas: 473
- 📄 **public/participante/fronts/pontos-corridos.html** - 📄 Página HTML
  - 📏 Tamanho: 4KB | Linhas: 186
- 📄 **public/participante/fronts/ranking.html** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 11KB | Linhas: 490
- 📄 **public/participante/fronts/rodadas.html** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 13KB | Linhas: 587
- 📄 **public/participante/fronts/top10.html** - 📄 Página HTML
  - 📏 Tamanho: 13KB | Linhas: 574
- 📄 **public/participante/index.html** - 🏠 Página principal/Entry point
  - 📏 Tamanho: 12KB | Linhas: 347
- 📄 **public/participante/js/modules/participante-artilheiro.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 19KB | Linhas: 394
- 📄 **public/participante/js/modules/participante-boas-vindas.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 20KB | Linhas: 457
- 📄 **public/participante/js/modules/participante-extrato-ui.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 40KB | Linhas: 1278
- 📄 **public/participante/js/modules/participante-extrato.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 12KB | Linhas: 341
- 📄 **public/participante/js/modules/participante-luva-ouro.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 16KB | Linhas: 347
- 📄 **public/participante/js/modules/participante-mata-mata.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 191
- 📄 **public/participante/js/modules/participante-melhor-mes.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 12KB | Linhas: 363
- 📄 **public/participante/js/modules/participante-pontos-corridos.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 15KB | Linhas: 430
- 📄 **public/participante/js/modules/participante-ranking.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 14KB | Linhas: 375
- 📄 **public/participante/js/modules/participante-rodadas.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 16KB | Linhas: 503
- 📄 **public/participante/js/modules/participante-top10.js** - 🧩 Módulo do sistema
  - 📏 Tamanho: 15KB | Linhas: 407
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
  - 📏 Tamanho: 2KB | Linhas: 75
- 📄 **routes/cache-universal-routes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 45
- 📄 **routes/cartola-proxy.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 6KB | Linhas: 210
- 📄 **routes/cartola.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 2KB | Linhas: 53
- 📄 **routes/configuracao-routes.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 5KB | Linhas: 168
- 📄 **routes/consolidacao-routes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 27
- 📄 **routes/extratoFinanceiroCacheRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 72
- 📄 **routes/fluxoFinanceiroRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 36
- 📄 **routes/gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 2KB | Linhas: 57
- 📄 **routes/ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 17KB | Linhas: 605
- 📄 **routes/luva-de-ouro-routes.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 1KB | Linhas: 28
- 📄 **routes/mataMataCacheRoutes.js** - 📝 Script JavaScript
- 📄 **routes/participante-auth.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 350
- 📄 **routes/pontosCorridosCacheRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **routes/ranking-geral-cache-routes.js** - 🏅 Sistema de Rankings
- 📄 **routes/ranking-turno-routes.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 1KB | Linhas: 27
- 📄 **routes/rodadas-routes.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 3KB | Linhas: 99
- 📄 **routes/times.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 191
- 📄 **routes/top10CacheRoutes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 22
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
  - 📏 Tamanho: 31KB | Linhas: 1038
- 📄 **services/golsService.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 18KB | Linhas: 557
- 📄 **services/melhorMesService.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 466
- 📄 **services/rankingTurnoService.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 6KB | Linhas: 223
- 📄 **system-mapper.js** - 📝 Script JavaScript
  - 📏 Tamanho: 19KB | Linhas: 617
- 📄 **uploadToDrive.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 70
- 📄 **utils/consolidacaoHelpers.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 195
- 📄 **utils/consolidacaoScheduler.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 189
- 📄 **utils/participanteUtils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 36
- 📄 **utils/smartDataFetcher.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 91
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

### Documentação (7 arquivos)

- 📄 **CONTEXTOS-ADMIN-PARTICIPANTE.md** - 👤 Administração/Gestão
  - 📏 Tamanho: 7KB | Linhas: 235
- 📄 **CRON-SETUP.md** - 📖 Documentação
  - 📏 Tamanho: 3KB | Linhas: 148
- 📄 **LEVANTAMENTO-REQUISITOS-RESPOSTA.md** - 📖 Documentação
  - 📏 Tamanho: 12KB | Linhas: 435
- 📄 **SISTEMA-COMPLETO-REGRAS-FINANCEIRO.md** - 📖 Documentação
  - 📏 Tamanho: 34KB | Linhas: 1252
- 📄 **attached_assets/Pasted--npm-run-dev-Ask-Agent-16m-17-minutes-ago-Overview-Logs_1764720099597.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 17KB | Linhas: 738
- 📄 **replit.md** - 📖 Documentação
  - 📏 Tamanho: 5KB | Linhas: 76
- 📄 **system-analysis-2025-11-28.md** - 📖 Documentação
  - 📏 Tamanho: 62KB | Linhas: 1140

### Assets (18 arquivos)

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

- **APIs utilizadas:** ``/api/ligas/${ligaId}`, `/api/artilheiro-campeao/${ligaId}/ranking``
- **Tamanho:** 19KB | **Linhas:** 394

#### 📜 public/participante/js/modules/participante-boas-vindas.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}`, `/api/ligas/${ligaId}/ranking`, `/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`, `/api/fluxo-financeiro/${ligaId}/extrato/${timeId}``
- **Tamanho:** 20KB | **Linhas:** 457

#### 📜 public/participante/js/modules/participante-extrato-ui.js

- **Tamanho:** 40KB | **Linhas:** 1278

#### 📜 public/participante/js/modules/participante-extrato.js

- **APIs utilizadas:** `"/api/cartola/mercado/status", `/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${rodadaAtual}`, `/api/fluxo-financeiro/${ligaId}/extrato/${timeId}``
- **Tamanho:** 12KB | **Linhas:** 341

#### 📜 public/participante/js/modules/participante-luva-ouro.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}`, `/api/luva-de-ouro/${ligaId}/ranking``
- **Tamanho:** 16KB | **Linhas:** 347

#### 📜 public/participante/js/modules/participante-mata-mata.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}/mata-mata``
- **Tamanho:** 9KB | **Linhas:** 191

#### 📜 public/participante/js/modules/participante-melhor-mes.js

- **APIs utilizadas:** ``/api/ligas/${ligaId}/melhor-mes``
- **Tamanho:** 12KB | **Linhas:** 363

#### 📜 public/participante/js/modules/participante-pontos-corridos.js

- **APIs utilizadas:** ``/api/pontos-corridos/cache/${ligaId}`, `/api/ligas/${ligaId}/pontos-corridos``
- **Tamanho:** 15KB | **Linhas:** 430

#### 📜 public/participante/js/modules/participante-ranking.js

- **APIs utilizadas:** ``/api/ranking-turno/${ligaId}?turno=${turno}``
- **Tamanho:** 14KB | **Linhas:** 375

#### 📜 public/participante/js/modules/participante-rodadas.js

- **APIs utilizadas:** ``/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`, "/api/cartola/mercado-status"`
- **Tamanho:** 16KB | **Linhas:** 503

#### 📜 public/participante/js/modules/participante-top10.js

- **APIs utilizadas:** `"/api/cartola/mercado/status", `/api/top10/cache/${ligaId}?rodada=${rodadaAtual}`, `/api/ligas/${ligaId}/top10``
- **Tamanho:** 15KB | **Linhas:** 407

### 🔧 Módulos Backend

#### 📜 controllers/artilheiroCampeaoController.js

- **Exports:** `export default ArtilheiroCampeaoController`
- **Tamanho:** 27KB | **Linhas:** 782

#### 📜 controllers/cartolaController.js

- **Exports:** `export async, export async, export async, export async, export async, export async, export async`
- **Tamanho:** 5KB | **Linhas:** 181

#### 📜 controllers/consolidacaoController.js

- **Exports:** `export const, export const, export const, export const`
- **Tamanho:** 19KB | **Linhas:** 475

#### 📜 controllers/extratoFinanceiroCacheController.js

- **Exports:** `export const, export const, export const, export const, export const, export const, export const, export const, export const, export const, export const, export const`
- **Tamanho:** 27KB | **Linhas:** 773

#### 📜 controllers/fluxoFinanceiroController.js

- **Exports:** `export const, export const, export const, export const, export const, export const, export const, export const`
- **Tamanho:** 17KB | **Linhas:** 512

#### 📜 controllers/golsController.js

- **Exports:** `export const, export const, export const, export async`
- **Tamanho:** 11KB | **Linhas:** 364

#### 📜 controllers/ligaController.js

- **Tamanho:** 19KB | **Linhas:** 653

#### 📜 controllers/luvaDeOuroController.js

- **Exports:** `export default LuvaDeOuroController`
- **Tamanho:** 16KB | **Linhas:** 549

#### 📜 controllers/mataMataCacheController.js

- **Exports:** `export const, export const, export const, export const`
- **Tamanho:** 3KB | **Linhas:** 108

#### 📜 controllers/participanteStatusController.js

- **Exports:** `export const, export const, export const, export const, export const, export const, export const`
- **Tamanho:** 9KB | **Linhas:** 310

#### 📜 controllers/pontosCorridosCacheController.js

- **Exports:** `export const, export const, export const`
- **Tamanho:** 4KB | **Linhas:** 115

#### 📜 controllers/rankingGeralCacheController.js

- **Exports:** `export async, export async, export async, export const`
- **Tamanho:** 6KB | **Linhas:** 203

#### 📜 controllers/rankingTurnoController.js

- **Exports:** `export async, export async, export async, export default`
- **Tamanho:** 4KB | **Linhas:** 150

#### 📜 controllers/rodadaController.js

- **Exports:** `export async, export async, export async`
- **Tamanho:** 16KB | **Linhas:** 471

#### 📜 controllers/timeController.js

- **Exports:** `export const, export const`
- **Tamanho:** 5KB | **Linhas:** 191

#### 📜 controllers/top10CacheController.js

- **Exports:** `export const, export const, export const`
- **Tamanho:** 3KB | **Linhas:** 78

#### 📜 routes/artilheiro-campeao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 2KB | **Linhas:** 75

#### 📜 routes/cache-universal-routes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 45

#### 📜 routes/cartola-proxy.js

- **Exports:** `export default router`
- **Tamanho:** 6KB | **Linhas:** 210

#### 📜 routes/cartola.js

- **Exports:** `export default router`
- **Tamanho:** 2KB | **Linhas:** 53

#### 📜 routes/configuracao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 168

#### 📜 routes/consolidacao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 27

#### 📜 routes/extratoFinanceiroCacheRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 3KB | **Linhas:** 72

#### 📜 routes/fluxoFinanceiroRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 36

#### 📜 routes/gols.js

- **Exports:** `export default router`
- **Tamanho:** 2KB | **Linhas:** 57

#### 📜 routes/ligas.js

- **Exports:** `export default router`
- **Endpoints:** `"/api/cartola/mercado/status"`
- **Tamanho:** 17KB | **Linhas:** 605

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

#### 📜 routes/ranking-turno-routes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 27

#### 📜 routes/rodadas-routes.js

- **Exports:** `export default router`
- **Tamanho:** 3KB | **Linhas:** 99

#### 📜 routes/times.js

- **Exports:** `export default router`
- **Tamanho:** 6KB | **Linhas:** 191

#### 📜 routes/top10CacheRoutes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 22

#### 📜 services/cartolaApiService.js

- **Exports:** `export default new`
- **Tamanho:** 22KB | **Linhas:** 683

#### 📜 services/cartolaService.js

- **Exports:** `export async, export async, export async`
- **Tamanho:** 5KB | **Linhas:** 174

#### 📜 services/goleirosService.js

- **Exports:** `export async, export async, export async`
- **Tamanho:** 31KB | **Linhas:** 1038

#### 📜 services/golsService.js

- **Exports:** `export default golsService`
- **Tamanho:** 18KB | **Linhas:** 557

#### 📜 services/melhorMesService.js

- **Exports:** `export async, export async, export async, export async, export async, export default`
- **Tamanho:** 13KB | **Linhas:** 466

#### 📜 services/rankingTurnoService.js

- **Exports:** `export async, export async, export async, export async, export default`
- **Tamanho:** 6KB | **Linhas:** 223

### ⚙️ Módulos de Configuração

#### 📜 public/js/luva-de-ouro/luva-de-ouro-config.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 3KB | **Linhas:** 106

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
| **Total de arquivos** | 273 |
| **Tamanho total** | 5840 KB |
| **Tamanho médio** | 21 KB |

### 📋 Por Tipo de Arquivo

| Tipo | Quantidade |
|------|------------|
| 📖 **docs** | 7 |
| 🎨 **frontend** | 232 |
| ⚙️ **config** | 12 |
| ❓ **other** | 4 |
| 🖼️ **assets** | 18 |

### 📏 Por Tamanho de Arquivo

| Categoria | Quantidade | Descrição |
|-----------|------------|----------|
| 🟢 **Pequenos** | 112 | < 5KB |
| 🟡 **Médios** | 155 | 5-50KB |
| 🔴 **Grandes** | 6 | > 50KB |

### 🔍 Insights da Arquitetura

- **Arquitetura:** Full-Stack
- **Complexidade Frontend:** Alta (11 módulos)
- **Complexidade Backend:** Alta (35 rotas/controllers)
- **Modularização:** Muito modular


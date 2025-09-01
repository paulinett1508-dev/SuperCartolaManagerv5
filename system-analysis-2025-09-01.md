# 📊 Análise do Sistema Super Cartola Manager

**Data da Análise:** 01/09/2025, 19:42:24

---

## 📁 Estrutura do Sistema

- 📁 **attached_assets/**
- 📁 **backups/**
- 📁 **config/**
- 📁 **controllers/**
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
    - 📁 **mata-mata/**
    - 📁 **pontos-corridos/**
  - 📁 **templates/**
- 📁 **routes/**
- 📁 **scripts/**
- 📁 **services/**
- 📁 **utils/**

### 📄 Arquivos na Raiz

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
- 📄 **replit.nix** - ❓ Arquivo genérico
- 📜 **system-mapper.js** - 📝 Script JavaScript
- 📜 **uploadToDrive.js** - 📝 Script JavaScript
- 📜 **ux-analyzer.js** - 📝 Script JavaScript

---

## 🔍 Análise por Categoria

### Frontend (Cliente) (141 arquivos)

- 📄 **backupJson.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 39
- 📄 **backupScheduler.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 57
- 📄 **config/database.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 46
- 📄 **controllers/artilheiroCampeaoController.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 14KB | Linhas: 420
- 📄 **controllers/cartolaController.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 5KB | Linhas: 163
- 📄 **controllers/golsController.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 11KB | Linhas: 364
- 📄 **controllers/ligaController.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 17KB | Linhas: 512
- 📄 **controllers/luvaDeOuroController.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 15KB | Linhas: 518
- 📄 **controllers/rodadaController.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 10KB | Linhas: 335
- 📄 **controllers/timeController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 129
- 📄 **debug-escudos.js** - 📝 Script JavaScript
- 📄 **handover.js** - 📝 Script JavaScript
  - 📏 Tamanho: 12KB | Linhas: 444
- 📄 **index.js** - 🏠 Página principal/Entry point
  - 📏 Tamanho: 11KB | Linhas: 342
- 📄 **models/ArtilheiroCampeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 1KB | Linhas: 39
- 📄 **models/Goleiros.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 146
- 📄 **models/Gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 10KB | Linhas: 382
- 📄 **models/Liga.js** - 🏆 Funcionalidades de Liga
- 📄 **models/Rodada.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **models/Time.js** - 📝 Script JavaScript
- 📄 **public/admin.html** - 👤 Administração/Gestão
  - 📏 Tamanho: 28KB | Linhas: 755
- 📄 **public/criar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 9KB | Linhas: 207
- 📄 **public/css/base.css** - 🎨 Estilos CSS
  - 📏 Tamanho: 12KB | Linhas: 508
- 📄 **public/css/modules/criar-liga.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 10KB | Linhas: 521
- 📄 **public/css/modules/dashboard.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 13KB | Linhas: 683
- 📄 **public/css/modules/editar-liga.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 469
- 📄 **public/css/modules/ferramentas.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 3KB | Linhas: 151
- 📄 **public/css/modules/fluxo-financeiro.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 27KB | Linhas: 1059
- 📄 **public/css/modules/mata-mata.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 421
- 📄 **public/css/modules/melhor-mes.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 9KB | Linhas: 443
- 📄 **public/css/modules/participantes.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 13KB | Linhas: 656
- 📄 **public/css/modules/pontos-corridos.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 22KB | Linhas: 1107
- 📄 **public/css/modules/ranking-geral.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 7KB | Linhas: 312
- 📄 **public/css/modules/rodadas.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 8KB | Linhas: 415
- 📄 **public/css/modules/top10.css** - 🧩 Módulo do sistema
  - 📏 Tamanho: 6KB | Linhas: 312
- 📄 **public/dashboard.html** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 25KB | Linhas: 600
- 📄 **public/detalhe-liga.css** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 16KB | Linhas: 691
- 📄 **public/detalhe-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 12KB | Linhas: 267
- 📄 **public/editar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 123
- 📄 **public/ferramentas.html** - 📄 Página HTML
  - 📏 Tamanho: 4KB | Linhas: 104
- 📄 **public/fronts/artilheiro-campeao.html** - ⚽ Sistema Artilheiro Campeão
- 📄 **public/fronts/fluxo-financeiro.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 44
- 📄 **public/fronts/luva-de-ouro.html** - 🥅 Sistema Luva de Ouro
- 📄 **public/fronts/mata-mata.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 27
- 📄 **public/fronts/melhor-mes.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 75
- 📄 **public/fronts/parciais.html** - 📄 Página HTML
  - 📏 Tamanho: 11KB | Linhas: 366
- 📄 **public/fronts/participantes.html** - 📄 Página HTML
  - 📏 Tamanho: 3KB | Linhas: 90
- 📄 **public/fronts/pontos-corridos.html** - 📄 Página HTML
  - 📏 Tamanho: 1KB | Linhas: 44
- 📄 **public/fronts/ranking-geral.html** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 4KB | Linhas: 121
- 📄 **public/fronts/rodadas.html** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 2KB | Linhas: 73
- 📄 **public/fronts/top10.html** - 📄 Página HTML
  - 📏 Tamanho: 2KB | Linhas: 51
- 📄 **public/gerenciar.html** - 📄 Página HTML
  - 📏 Tamanho: 16KB | Linhas: 472
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
  - 📏 Tamanho: 15KB | Linhas: 462
- 📄 **public/js/cards-condicionais.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 343
- 📄 **public/js/core/api-client.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 146
- 📄 **public/js/core/layout-manager.js** - 📝 Script JavaScript
  - 📏 Tamanho: 3KB | Linhas: 103
- 📄 **public/js/criar-liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 11KB | Linhas: 332
- 📄 **public/js/detalhe-liga-orquestrador.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 23KB | Linhas: 621
- 📄 **public/js/detalhe-liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 9KB | Linhas: 278
- 📄 **public/js/editar-liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 23KB | Linhas: 675
- 📄 **public/js/exports/export-artilheiro-campeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 16KB | Linhas: 485
- 📄 **public/js/exports/export-base.js** - 📝 Script JavaScript
  - 📏 Tamanho: 26KB | Linhas: 797
- 📄 **public/js/exports/export-exports.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 572
- 📄 **public/js/exports/export-extrato-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 29KB | Linhas: 890
- 📄 **public/js/exports/export-mata-mata.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 673
- 📄 **public/js/exports/export-melhor-mes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 652
- 📄 **public/js/exports/export-pontos-corridos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 34KB | Linhas: 1002
- 📄 **public/js/exports/export-ranking-geral.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 20KB | Linhas: 620
- 📄 **public/js/exports/export-rodadas-hq.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 24KB | Linhas: 625
- 📄 **public/js/exports/export-top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 19KB | Linhas: 583
- 📄 **public/js/ferramentas/ferramentas-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 321
- 📄 **public/js/filtro-liga-especial.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 104
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 23KB | Linhas: 757
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-campos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 469
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 500
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 25KB | Linhas: 698
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 334
- 📄 **public/js/fluxo-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 532
- 📄 **public/js/gerenciar-ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 8KB | Linhas: 273
- 📄 **public/js/gols-por-rodada.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 2KB | Linhas: 52
- 📄 **public/js/gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **public/js/layout-system.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 214
- 📄 **public/js/liga-modificacoes.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 16KB | Linhas: 489
- 📄 **public/js/luva-de-ouro.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 44KB | Linhas: 1107
- 📄 **public/js/mata-mata/mata-mata-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 5KB | Linhas: 193
- 📄 **public/js/mata-mata/mata-mata-confrontos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 217
- 📄 **public/js/mata-mata/mata-mata-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 16KB | Linhas: 541
- 📄 **public/js/mata-mata/mata-mata-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 13KB | Linhas: 444
- 📄 **public/js/mata-mata/mata-mata-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 294
- 📄 **public/js/mata-mata.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 29
- 📄 **public/js/melhor-mes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 453
- 📄 **public/js/navigation.js** - 🧭 Sistema de navegação
  - 📏 Tamanho: 3KB | Linhas: 76
- 📄 **public/js/participantes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 14KB | Linhas: 419
- 📄 **public/js/pontos-corridos/pontos-corridos-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 6KB | Linhas: 211
- 📄 **public/js/pontos-corridos/pontos-corridos-config.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 3KB | Linhas: 109
- 📄 **public/js/pontos-corridos/pontos-corridos-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 502
- 📄 **public/js/pontos-corridos/pontos-corridos-orquestrador.js** - 📝 Script JavaScript
  - 📏 Tamanho: 14KB | Linhas: 513
- 📄 **public/js/pontos-corridos/pontos-corridos-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 612
- 📄 **public/js/pontos-corridos-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 225
- 📄 **public/js/pontos-corridos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 61
- 📄 **public/js/ranking.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 14KB | Linhas: 392
- 📄 **public/js/rodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 19KB | Linhas: 622
- 📄 **public/js/seletor-ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 125
- 📄 **public/js/sistema-modulos-init.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 38
- 📄 **public/js/top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 11KB | Linhas: 393
- 📄 **public/js/utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 208
- 📄 **public/layout.html** - 📄 Página HTML
  - 📏 Tamanho: 14KB | Linhas: 349
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
  - 📏 Tamanho: 3KB | Linhas: 106
- 📄 **routes/cartola.js** - 🎩 Integração Cartola FC
  - 📏 Tamanho: 1KB | Linhas: 25
- 📄 **routes/configuracao-routes.js** - ⚙️ Arquivo de configuração
  - 📏 Tamanho: 5KB | Linhas: 168
- 📄 **routes/gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 2KB | Linhas: 57
- 📄 **routes/ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 1KB | Linhas: 42
- 📄 **routes/luva-de-ouro-routes.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 1KB | Linhas: 28
- 📄 **routes/rodadas-routes.js** - 📅 Gestão de Rodadas
- 📄 **routes/times.js** - 📝 Script JavaScript
  - 📏 Tamanho: 1KB | Linhas: 20
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
- 📄 **utils/validators.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 337
- 📄 **ux-analyzer.js** - 📝 Script JavaScript
  - 📏 Tamanho: 25KB | Linhas: 810

### Configuração (11 arquivos)

- 📄 **backups/artilheirocampeaos.json** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 7KB | Linhas: 273
- 📄 **backups/goleiros.json** - 📋 Dados JSON
  - 📏 Tamanho: 43KB | Linhas: 1532
- 📄 **backups/gols.json** - ⚽ Gestão de Gols
  - 📏 Tamanho: 2109KB | Linhas: 89922
- 📄 **backups/ligas.json** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 1KB | Linhas: 56
- 📄 **backups/rodadas.json** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 420KB | Linhas: 11174
- 📄 **backups/times.json** - 📋 Dados JSON
  - 📏 Tamanho: 14KB | Linhas: 335
- 📄 **credentials.json** - 📋 Dados JSON
  - 📏 Tamanho: 2KB | Linhas: 14
- 📄 **doc-version.json** - 📋 Dados JSON
- 📄 **package-lock.json** - 📋 Dados JSON
  - 📏 Tamanho: 414KB | Linhas: 11168
- 📄 **package.json** - 📦 Configuração npm/dependências
  - 📏 Tamanho: 2KB | Linhas: 70
- 📄 **scripts/times-da-liga.json** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 2KB | Linhas: 46

### Documentação (4 arquivos)

- 📄 **attached_assets/Pasted--CLASSES-FALTANTES-PARA-CONFRONTOS-COMPACTOS-Adicionar-ao-final-do-arquivo-pontos-c-1756564109533_1756564109534.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 6KB | Linhas: 271
- 📄 **attached_assets/Pasted--CORRE-O-CR-TICA-DO-EXPORT-BASE-JS-LINHAS-372-468-Problema-Promises-rejeitadas-no-carregam-1756754170774_1756754170775.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 7KB | Linhas: 196
- 📄 **attached_assets/Pasted--CORRE-O-DO-ERRO-NA-LINHA-1084-Problema-Fun-o-exportarPontosCorridosHistoricoComoImagem-inc-1756568419593_1756568419594.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 3KB | Linhas: 62
- 📄 **attached_assets/Pasted-cards-condicionais-js-4-CARDS-CONDICIONAIS-Carregando-sistema-cards-condicionais-js-343--1756567727988_1756567727990.txt** - ❓ Arquivo genérico
  - 📏 Tamanho: 4KB | Linhas: 61

### Assets (17 arquivos)

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
- 📄 **public/favicon.png** - ❓ Arquivo genérico
- 📄 **public/img/logo-cartoleirossobral.png** - 🖼️ Recursos estáticos
- 📄 **public/img/logo-supercartola.png** - 🎩 Integração Cartola FC

---

## 🧩 Módulos e Dependências

### 🔧 Módulos Backend

#### 📜 controllers/artilheiroCampeaoController.js

- **Exports:** `export const, export const, export const, export const, export const, export const, export const, export const, export default controller`
- **Tamanho:** 14KB | **Linhas:** 420

#### 📜 controllers/cartolaController.js

- **Exports:** `export async, export async, export async, export async, export async, export async, export async`
- **Tamanho:** 5KB | **Linhas:** 163

#### 📜 controllers/golsController.js

- **Exports:** `export const, export const, export const, export async`
- **Tamanho:** 11KB | **Linhas:** 364

#### 📜 controllers/ligaController.js

- **Tamanho:** 17KB | **Linhas:** 512

#### 📜 controllers/luvaDeOuroController.js

- **Exports:** `export default LuvaDeOuroController`
- **Tamanho:** 15KB | **Linhas:** 518

#### 📜 controllers/rodadaController.js

- **Exports:** `export async, export async`
- **Tamanho:** 10KB | **Linhas:** 335

#### 📜 controllers/timeController.js

- **Exports:** `export const, export const`
- **Tamanho:** 4KB | **Linhas:** 129

#### 📜 routes/artilheiro-campeao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 182

#### 📜 routes/cartola-proxy.js

- **Tamanho:** 3KB | **Linhas:** 106

#### 📜 routes/cartola.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 25

#### 📜 routes/configuracao-routes.js

- **Exports:** `export default router`
- **Tamanho:** 5KB | **Linhas:** 168

#### 📜 routes/gols.js

- **Exports:** `export default router`
- **Tamanho:** 2KB | **Linhas:** 57

#### 📜 routes/ligas.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 42

#### 📜 routes/luva-de-ouro-routes.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 28

#### 📜 routes/rodadas-routes.js

- **Exports:** `export default router`
- **Tamanho:** 0KB | **Linhas:** 14

#### 📜 routes/times.js

- **Exports:** `export default router`
- **Tamanho:** 1KB | **Linhas:** 20

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

#### 📜 public/js/mata-mata/mata-mata-config.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 5KB | **Linhas:** 193

#### 📜 public/js/pontos-corridos/pontos-corridos-config.js

- **Propósito:** ⚙️ Arquivo de configuração
- **Tamanho:** 3KB | **Linhas:** 109

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
| **Total de arquivos** | 177 |
| **Tamanho total** | 4762 KB |
| **Tamanho médio** | 27 KB |

### 📋 Por Tipo de Arquivo

| Tipo | Quantidade |
|------|------------|
| 📖 **docs** | 4 |
| 🎨 **frontend** | 141 |
| ⚙️ **config** | 11 |
| ❓ **other** | 4 |
| 🖼️ **assets** | 17 |

### 📏 Por Tamanho de Arquivo

| Categoria | Quantidade | Descrição |
|-----------|------------|----------|
| 🟢 **Pequenos** | 74 | < 5KB |
| 🟡 **Médios** | 99 | 5-50KB |
| 🔴 **Grandes** | 4 | > 50KB |

### 🔍 Insights da Arquitetura

- **Arquitetura:** Backend
- **Complexidade Frontend:** Baixa (0 módulos)
- **Complexidade Backend:** Alta (16 rotas/controllers)
- **Modularização:** Muito modular


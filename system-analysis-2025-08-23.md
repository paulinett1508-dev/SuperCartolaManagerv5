# 📊 Análise do Sistema Super Cartola Manager

**Data da Análise:** 23/08/2025, 11:26:44

---

## 📁 Estrutura do Sistema

- 📁 **attached_assets/**
- 📁 **backups/**
- 📁 **config/**
- 📁 **controllers/**
- 📁 **models/**
- 📁 **public/**
  - 📁 **escudos/**
  - 📁 **img/**
  - 📁 **js/**
    - 📁 **artilheiro-campeao/**
    - 📁 **exports/**
    - 📁 **fluxo-financeiro/**
  - 📁 **templates/**
- 📁 **routes/**
- 📁 **scripts/**
- 📁 **services/**
- 📁 **test/**
- 📁 **utils/**

### 📄 Arquivos na Raiz

- 🌐 **DOCUMENTACAO_COMPLETA.html** - 📄 Página HTML
- 📖 **HANDOVER.md** - 📖 Documentação
- 📜 **backupJson.js** - 📝 Script JavaScript
- 📜 **backupScheduler.js** - 📝 Script JavaScript
- 📋 **credentials.json** - 📋 Dados JSON
- 📋 **doc-version.json** - 📋 Dados JSON
- 🌐 **estrutura_selecionada.html** - 📄 Página HTML
- 📄 **generate-full-docs.cjs** - ❓ Arquivo genérico
- 🖼️ **generated-icon.png** - ❓ Arquivo genérico
- 📜 **handover.js** - 📝 Script JavaScript
- 📜 **index.js** - 🏠 Página principal/Entry point
- 📄 **listar_estrutura.py** - ❓ Arquivo genérico
- 📋 **package-lock.json** - 📋 Dados JSON
- 📋 **package.json** - 📦 Configuração npm/dependências
- 📄 **replit.nix** - ❓ Arquivo genérico
- 📜 **system-mapper.js** - 📝 Script JavaScript
- 📜 **uploadToDrive.js** - 📝 Script JavaScript

---

## 🔍 Análise por Categoria

### Frontend (Cliente) (101 arquivos)

- 📄 **DOCUMENTACAO_COMPLETA.html** - 📄 Página HTML
  - 📏 Tamanho: 5396KB | Linhas: 137882
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
  - 📏 Tamanho: 8KB | Linhas: 245
- 📄 **controllers/timeController.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 129
- 📄 **estrutura_selecionada.html** - 📄 Página HTML
  - 📏 Tamanho: 19KB | Linhas: 274
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
  - 📏 Tamanho: 6KB | Linhas: 209
- 📄 **public/buscar-times.html** - 📄 Página HTML
  - 📏 Tamanho: 15KB | Linhas: 492
- 📄 **public/criar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 2KB | Linhas: 73
- 📄 **public/criar-liga.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 2KB | Linhas: 73
- 📄 **public/criar.html** - 📄 Página HTML
  - 📏 Tamanho: 2KB | Linhas: 76
- 📄 **public/dashboard.html** - 📊 Dashboard/Painel principal
  - 📏 Tamanho: 11KB | Linhas: 337
- 📄 **public/detalhe-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 35KB | Linhas: 1113
- 📄 **public/editar-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 19KB | Linhas: 558
- 📄 **public/gerenciar.html** - 📄 Página HTML
  - 📏 Tamanho: 5KB | Linhas: 169
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
- 📄 **public/js/exports/export-artilheiro-campeao.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 16KB | Linhas: 485
- 📄 **public/js/exports/export-base.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 568
- 📄 **public/js/exports/export-exports.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 573
- 📄 **public/js/exports/export-extrato-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 29KB | Linhas: 890
- 📄 **public/js/exports/export-mata-mata.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 673
- 📄 **public/js/exports/export-melhor-mes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 652
- 📄 **public/js/exports/export-pontos-corridos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 46KB | Linhas: 1282
- 📄 **public/js/exports/export-ranking-geral.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 19KB | Linhas: 556
- 📄 **public/js/exports/export-rodadas-hq.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 24KB | Linhas: 625
- 📄 **public/js/exports/export-top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 22KB | Linhas: 693
- 📄 **public/js/filtro-liga-especial.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 104
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-cache.js** - 📝 Script JavaScript
  - 📏 Tamanho: 22KB | Linhas: 683
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-campos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 15KB | Linhas: 469
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-core.js** - 📝 Script JavaScript
  - 📏 Tamanho: 21KB | Linhas: 623
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-ui.js** - 📝 Script JavaScript
  - 📏 Tamanho: 35KB | Linhas: 783
- 📄 **public/js/fluxo-financeiro/fluxo-financeiro-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 334
- 📄 **public/js/fluxo-financeiro.js** - 📝 Script JavaScript
  - 📏 Tamanho: 27KB | Linhas: 749
- 📄 **public/js/gerenciar-ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 1KB | Linhas: 30
- 📄 **public/js/gols-por-rodada.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 2KB | Linhas: 77
- 📄 **public/js/gols.js** - ⚽ Gestão de Gols
  - 📏 Tamanho: 1KB | Linhas: 19
- 📄 **public/js/layout-system.js** - 📝 Script JavaScript
  - 📏 Tamanho: 8KB | Linhas: 214
- 📄 **public/js/liga-modificacoes.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 16KB | Linhas: 489
- 📄 **public/js/luva-de-ouro.js** - 🥅 Sistema Luva de Ouro
  - 📏 Tamanho: 44KB | Linhas: 1107
- 📄 **public/js/mata-mata.js** - 📝 Script JavaScript
  - 📏 Tamanho: 42KB | Linhas: 1304
- 📄 **public/js/melhor-mes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 17KB | Linhas: 452
- 📄 **public/js/navigation.js** - 🧭 Sistema de navegação
  - 📏 Tamanho: 3KB | Linhas: 76
- 📄 **public/js/participantes.js** - 📝 Script JavaScript
  - 📏 Tamanho: 5KB | Linhas: 144
- 📄 **public/js/pontos-corridos-utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 225
- 📄 **public/js/pontos-corridos.js** - 📝 Script JavaScript
  - 📏 Tamanho: 32KB | Linhas: 795
- 📄 **public/js/ranking.js** - 🏅 Sistema de Rankings
  - 📏 Tamanho: 9KB | Linhas: 262
- 📄 **public/js/rodadas.js** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 23KB | Linhas: 697
- 📄 **public/js/seletor-ligas.js** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 4KB | Linhas: 125
- 📄 **public/js/top10.js** - 📝 Script JavaScript
  - 📏 Tamanho: 10KB | Linhas: 310
- 📄 **public/js/utils.js** - 📝 Script JavaScript
  - 📏 Tamanho: 7KB | Linhas: 208
- 📄 **public/layout.html** - 📄 Página HTML
  - 📏 Tamanho: 15KB | Linhas: 472
- 📄 **public/parciais.html** - 📄 Página HTML
  - 📏 Tamanho: 11KB | Linhas: 366
- 📄 **public/preencher-liga.html** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 178
- 📄 **public/script.js** - 📝 Script JavaScript
  - 📏 Tamanho: 4KB | Linhas: 82
- 📄 **public/style.css** - 🎨 Folha de estilos
  - 📏 Tamanho: 21KB | Linhas: 1125
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
- 📄 **test/artilheiro.test.js** - ⚽ Sistema Artilheiro Campeão
  - 📏 Tamanho: 10KB | Linhas: 342
- 📄 **uploadToDrive.js** - 📝 Script JavaScript
  - 📏 Tamanho: 2KB | Linhas: 70
- 📄 **utils/validators.js** - 📝 Script JavaScript
  - 📏 Tamanho: 9KB | Linhas: 337

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
  - 📏 Tamanho: 400KB | Linhas: 10642
- 📄 **backups/times.json** - 📋 Dados JSON
  - 📏 Tamanho: 14KB | Linhas: 335
- 📄 **credentials.json** - 📋 Dados JSON
  - 📏 Tamanho: 2KB | Linhas: 14
- 📄 **doc-version.json** - 📋 Dados JSON
- 📄 **package-lock.json** - 📋 Dados JSON
  - 📏 Tamanho: 400KB | Linhas: 10784
- 📄 **package.json** - 📦 Configuração npm/dependências
  - 📏 Tamanho: 2KB | Linhas: 69
- 📄 **scripts/times-da-liga.json** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 2KB | Linhas: 46

### Documentação (7 arquivos)

- 📄 **HANDOVER.md** - 📖 Documentação
  - 📏 Tamanho: 3KB | Linhas: 125
- 📄 **attached_assets/Pasted-detalhe-liga-html-id-684cb1c8af923da7c7df51de-365-Iniciando-carregamento-da-aplica-o-detalhe-1753474888781_1753474888786.txt** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 328KB | Linhas: 2519
- 📄 **attached_assets/Pasted-detalhe-liga-html-id-684d821cf1a7ae16d1f89572-360-Iniciando-carregamento-da-aplica-o-detalhe-1753050863534_1753050863535.txt** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 61
- 📄 **attached_assets/Pasted-detalhe-liga-html-id-684d821cf1a7ae16d1f89572-360-Iniciando-carregamento-da-aplica-o-detalhe-1753053291511_1753053291513.txt** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 59
- 📄 **attached_assets/Pasted-detalhe-liga-html-id-684d821cf1a7ae16d1f89572-361-Iniciando-carregamento-da-aplica-o-detalhe-1753058255155_1753058255155.txt** - 🏆 Funcionalidades de Liga
  - 📏 Tamanho: 5KB | Linhas: 59
- 📄 **attached_assets/Pasted-rodadas-js-319-DEBUG-Item-28-Object-rodadas-js-319-DEBUG-Item-29-Object-rodadas-js-319-DEBU-1753473829630_1753473829631.txt** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 35KB | Linhas: 1014
- 📄 **attached_assets/Pasted-rodadas-js-319-DEBUG-Item-28-Object-rodadas-js-319-DEBUG-Item-29-Object-rodadas-js-319-DEBU-1753473996316_1753473996318.txt** - 📅 Gestão de Rodadas
  - 📏 Tamanho: 35KB | Linhas: 1014

### Assets (45 arquivos)

- 📄 **attached_assets/image_1753052258044.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753057848682.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753474151880.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753474478381.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753474674695.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753474923887.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753475068551.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753475216719.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753475388887.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753475816838.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753475969433.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753476072081.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753476489396.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753476710229.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753477150696.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753477280425.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1753477476622.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755907864136.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755907971517.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755907982423.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755908000366.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755908391582.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755908519527.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755909658019.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755911164112.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755911689984.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755911826649.png** - ❓ Arquivo genérico
- 📄 **attached_assets/image_1755912861687.png** - ❓ Arquivo genérico
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
- **Tamanho:** 8KB | **Linhas:** 245

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
| **Total de arquivos** | 168 |
| **Tamanho total** | 14387 KB |
| **Tamanho médio** | 86 KB |

### 📋 Por Tipo de Arquivo

| Tipo | Quantidade |
|------|------------|
| 🎨 **frontend** | 101 |
| 📖 **docs** | 7 |
| 🖼️ **assets** | 45 |
| ⚙️ **config** | 11 |
| ❓ **other** | 4 |

### 📏 Por Tamanho de Arquivo

| Categoria | Quantidade | Descrição |
|-----------|------------|----------|
| 🟢 **Pequenos** | 61 | < 5KB |
| 🟡 **Médios** | 79 | 5-50KB |
| 🔴 **Grandes** | 28 | > 50KB |

### 🔍 Insights da Arquitetura

- **Arquitetura:** Backend
- **Complexidade Frontend:** Baixa (0 módulos)
- **Complexidade Backend:** Alta (16 rotas/controllers)
- **Modularização:** Muito modular


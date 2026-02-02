# Ícones do PWA Admin Mobile

Este diretório deve conter os ícones do PWA nas seguintes dimensões:

## Ícones Necessários

- `icon-72x72.png` (72x72px)
- `icon-96x96.png` (96x96px)
- `icon-128x128.png` (128x128px)
- `icon-144x144.png` (144x144px)
- `icon-152x152.png` (152x152px)
- `icon-192x192.png` (192x192px) - **Obrigatório**
- `icon-384x384.png` (384x384px)
- `icon-512x512.png` (512x512px) - **Obrigatório**

## Como Gerar os Ícones

### Opção 1: PWA Image Generator (Online)
1. Acesse: https://www.pwabuilder.com/imageGenerator
2. Faça upload de um ícone 512x512px
3. Baixe todos os tamanhos gerados
4. Coloque neste diretório

### Opção 2: Usar favicon generator
1. Acesse: https://realfavicongenerator.net/
2. Faça upload de uma imagem grande (min 260x260px)
3. Configure para PWA
4. Baixe e extraia neste diretório

### Opção 3: CLI com sharp (Node.js)
```bash
npm install sharp-cli -g
sharp -i logo.png -o icon-72x72.png resize 72 72
sharp -i logo.png -o icon-96x96.png resize 96 96
sharp -i logo.png -o icon-128x128.png resize 128 128
sharp -i logo.png -o icon-144x144.png resize 144 144
sharp -i logo.png -o icon-152x152.png resize 152 152
sharp -i logo.png -o icon-192x192.png resize 192 192
sharp -i logo.png -o icon-384x384.png resize 384 384
sharp -i logo.png -o icon-512x512.png resize 512 512
```

## Especificações do Ícone

- **Formato:** PNG
- **Background:** Transparente ou cor sólida (#1e293b - slate-800)
- **Design:** Minimalista, sem texto (apenas ícone)
- **Sugestão:** Troféu 🏆 ou símbolo relacionado a futebol/gerenciamento

## Placeholder Temporário

Enquanto os ícones oficiais não são criados, você pode:

1. Usar um ícone temporário de qualquer imagem
2. Ou deixar em branco (PWA ainda funciona, mas sem ícone bonito)

---

**Status:** ⚠️ ÍCONES PENDENTES - PWA funcionará, mas sem ícones personalizados

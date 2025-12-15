/**
 * Script para baixar escudos dos times para armazenamento local
 * Preserva os escudos da Temporada 2025 antes do reset da API Cartola
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório de destino
const ESCUDOS_DIR = path.join(__dirname, '../public/assets/escudos');

// Mapeamento de todos os escudos das duas ligas
const ESCUDOS = [
  // Liga SuperCartola 2025
  { timeId: 645089, nome: "FloriMengo FC", url: "https://s2-cartola.glbimg.com/DSqlg6zDThhgxXybMqqUhKPqB94=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/7a/34/21/00215a5668-4a0a-45ce-b9d8-51110de74a7a20250315083421" },
  { timeId: 39786, nome: "Cassius United FC", url: "https://s2-cartola.glbimg.com/EupMJQ0P0BOSR8FwlvgdSrtm5Ms=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/69/44/17/001c3cc0b4-f4ce-449a-b54d-9e864790ab6920250315134417" },
  { timeId: 1097804, nome: "Quase Nada Palace", url: "https://s2-cartola.glbimg.com/fya9g-gd1TwwOeBbDeqKRBFYW1E=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/21/34/07/00e46cbf7a-1b79-4523-a2ce-19715897902120250311123407" },
  { timeId: 1323370, nome: "adv.DBarbosa.FC", url: "https://s2-cartola.glbimg.com/LUGRd8uPVTQmdevtvj_4mKuqxOY=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_237/escudo/5e/59/53/002c87b260-e8bf-415c-a051-18570dec165e20250325095953" },
  { timeId: 25371297, nome: "Tabaca Neon", url: "https://s2-cartola.glbimg.com/_jON9YLuQ_WAradOue9WJWlMaB8=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/d3/48/40/007f2cd575-4692-41b4-82e9-4a8711086cd320250312084840" },
  { timeId: 22623329, nome: "WorldTreta FC", url: "https://s2-cartola.glbimg.com/78IQ7owWDrI59MlvBdgiwGSqmm4=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_160/escudo/67/18/14/00fede7949-68d0-48c6-a51f-528e7002df6720191002181814" },
  { timeId: 621609, nome: "Itaueira Mengao", url: "https://s2-cartola.glbimg.com/r0mEcixSu8DZGb5-CK3NjuUjMWI=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_183/escudo/af/37/06/008d7e2db3-aaa7-472d-af03-f29b329c35af20210427123706" },
  { timeId: 8098497, nome: "Cangalexeu FC", url: "https://s2-cartola.glbimg.com/I_RW8-j0FhezntS3oYwJb6Bpnqo=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/26/04/08/007b16c5d8-6210-40dd-ac62-0a528be5b62620250315120408" },
  { timeId: 575856, nome: "Feirao do Insta Floriano PI", url: "https://s2-cartola.glbimg.com/gLEDdOuQ_n7yCD7n7FmjDDnGdsQ=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/2e/28/03/006801f521-3921-4b83-ad29-34f525542e2e20250315122803" },
  { timeId: 8188312, nome: "Chamex F.C.", url: "https://s2-cartola.glbimg.com/YZwWWZwLJSHbYX7Rqqa8a6Cz-Ns=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_106/escudo/9a/40/43/0092958566-cdb9-4da6-bb44-2bfca753b49a20180407194043" },
  { timeId: 2718174, nome: "Red Bull Corissaba", url: "https://s2-cartola.glbimg.com/tfD7X-alWaVX43veG4lc20R8zbQ=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_237/escudo/e6/01/07/00a193a589-9941-49e1-acf5-f1224e78bde620250317190107" },
  { timeId: 45004009, nome: "fc.catumbi", url: "https://s2-cartola.glbimg.com/xmP3eccyTVmcw9SOwRP2R8mqqcY=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_215/escudo/43/53/40/009730c5f8-bf31-43e2-98ba-f1d1eb83144320230414165340" },
  { timeId: 164131, nome: "51 Sportclub", url: "https://s2-cartola.glbimg.com/613JIbTrU_m1MAm9P7tsCnNc8HQ=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_212/escudo/a3/32/49/00579d8956-dace-4efa-b2b5-7b78a7bb20a320230327223249" },
  { timeId: 715731, nome: "La Familia 025 Cbjr", url: "https://s2-cartola.glbimg.com/U3VavTcs6WmBuSMkySM5Dqh9FPE=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_237/escudo/29/48/04/00482fcaf8-292a-4ade-bd93-192c3107792920250320224804" },
  { timeId: 5902324, nome: "ALA PEDRINHAS FC", url: "https://s2-cartola.glbimg.com/OKcyVs-FCUwC8Vd7afLD-aQpUok=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_222/escudo/72/02/33/00e52b667e-a772-4dda-8b8a-c6685016737220240314140233" },
  { timeId: 3300583, nome: "FIASCO VET FC", url: "https://s2-cartola.glbimg.com/WOdsMPEJH_PW0PqdH0drZq_0PZY=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/e8/53/30/0035e0f640-0c85-4f82-88b3-74a1ddaff0e820250315175330" },
  { timeId: 5254799, nome: "AltosShow", url: "https://s2-cartola.glbimg.com/mWAPeW_4lvsVcZdseSxH_ZBK-6M=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_237/escudo/a1/50/53/00f1dd3e98-9ad5-401c-9f13-8c5421a5a1a120250324165053" },
  { timeId: 1173066, nome: "two left feet tlf", url: "https://s2-cartola.glbimg.com/CIrRR4Ic4u-c57vINaMghKdyxTo=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_203/escudo/e2/53/22/00fbdce42d-d54d-40fa-b3cb-c94777a560e220220407125322" },
  { timeId: 8183683, nome: "FlaMadridFlo", url: "https://s2-cartola.glbimg.com/YR1c2t3ttAn0NfsmTuYMqKsTgp4=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/dd/32/03/00a9b9e295-4ed8-4ab3-bb4e-dba77e035fdd20250311223203" },
  { timeId: 13935277, nome: "Urubu Play F.C.", url: "https://s2-cartola.glbimg.com/XqTNWtU0S8uzpU6ZUjcMZVWJQYc=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_211/escudo/f8/27/53/00681760d8-c096-4ce7-8896-13b4cc8b71f820230318082753" },
  { timeId: 25324292, nome: "Invictus Patamar S.A.F.", url: "https://s2-cartola.glbimg.com/gbjd-QdTHi8-f2AEGyh0IFYq8uE=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/32/15/02/00b17a99c1-1ae7-4ca9-98d3-8f7833ea0f3220250311131502" },
  { timeId: 14569704, nome: "Fla Stronger FC", url: "https://s2-cartola.glbimg.com/nfMz_oystbWZIhJej_7qlCZdBvE=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_237/escudo/e8/10/53/006d7ab9da-e0be-497d-89f3-dcd394e757e820250325061053" },
  { timeId: 14916330, nome: "Lioness Clubs", url: "https://s2-cartola.glbimg.com/mRo85ZdnFerFQyp4W2lOkVYyd98=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/bd/23/37/00cb582f75-e5cc-49d8-8def-bbe68e7764bd20250311222337" },
  { timeId: 1039496, nome: "Randim", url: "https://s2-cartola.glbimg.com/xJRBQn9M94ZZGk2z4W2TW9EAvVg=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_226/escudo/7c/01/59/008e7b57d4-812d-49d5-a904-8403f884e67c20240413120159" },
  { timeId: 20165417, nome: "RB Ousadia&Alegria 94", url: "https://s2-cartola.glbimg.com/J39tNqJcxSL9Zk1YfqIUUDBiB28=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_205/escudo/1f/53/55/00ee0f7db4-ac40-4e3b-a713-bd18ddfb051f20220409145355" },
  { timeId: 1932235, nome: "VILA LEAO F.C", url: "https://s2-cartola.glbimg.com/UhLsNosWoiOG6XxBAXOrQyci2FM=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_212/escudo/1e/46/00/00deaa8f15-208e-4879-99d1-521d6ab6cc1e20230404144600" },
  { timeId: 4966295, nome: "Pedras_City AC", url: "https://s2-cartola.glbimg.com/49qFi-ErG5vjvWynjFmoibKHpjQ=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_166/escudo/65/22/51/00572af97a-a778-4f4a-b9d8-d981efb6456520200727232251" },
  { timeId: 1459952, nome: "FC Arthur Savio.C.C", url: "https://s2-cartola.glbimg.com/9P-eeFvkTIqbbmfemTuX16zJX3w=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_213/escudo/9b/24/47/00f17face5-70e6-4f2c-bc3a-eded1ce80c9b20230409122447" },
  { timeId: 1568358, nome: "Dollynho United FC", url: "https://s2-cartola.glbimg.com/TpMxaid-TQgtMB7B41zxEvn3MoA=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/78/44/35/005e1577f1-d3bb-4e23-bd54-d8131889777820250311124435" },
  { timeId: 3027272, nome: "Vitim 10 FC", url: "https://s2-cartola.glbimg.com/DANx0cpRHzW-C_XwWkGJJRI1bAM=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_222/escudo/07/48/48/007351dafe-0b47-4f48-a78d-f4aa9ad6c70720240320164848" },
  { timeId: 7698677, nome: "FC WESLEY OLIVEIRA", url: "https://s2-cartola.glbimg.com/Wys2YIpHrJUAlYDY9XwVB6EMjnE=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_238/escudo/39/55/15/00488bddce-2a6b-4edc-b39a-ccf3b5f2333920250328095515" },
  { timeId: 1233737, nome: "Wil08", url: "https://s2-cartola.glbimg.com/3u2Gk_8w9JK42F3YFkzZqjgciaE=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_237/escudo/41/54/06/00cdd69d61-e8ad-4156-a490-97724e433f4120250324185406" },

  // Liga Cartoleiros do Sobral (apenas os que não estão na SuperCartola)
  { timeId: 14747183, nome: "CHS EC", url: "https://s2-cartola.glbimg.com/a20EDxltWY_BMWsCandvsi2MJZc=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_238/escudo/16/23/51/00c62828a6-42d4-4f96-917a-612a02b6f31620250326112351" },
  { timeId: 1926323, nome: "specter United", url: "https://s2-cartola.glbimg.com/fJB2769UdYR17XXbWZt_D9dwtJY=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_241/escudo/c3/48/59/00fe9e57e9-431b-41e1-a50e-61b71c71a8c320250419134859" },
  { timeId: 50180257, nome: "Senhores Da Escuridao", url: "https://s2-cartola.glbimg.com/UXMQF_Pc3paiGZanZEVwLSibfEI=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_236/escudo/9c/24/21/002350563c-6c6f-4562-8f4a-193d7c8fa89c20250317132421" },
  { timeId: 49149388, nome: "JBMENGO94 FC", url: "https://s2-cartola.glbimg.com/jwvB7UV--ZydTK3VhTEvJAFUzMA=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_222/escudo/1e/02/44/002b074128-fb38-45f9-af44-c3fa73d3eb1e20240321150244" },
  { timeId: 49149009, nome: "RB Teteux SC", url: "https://s2-cartola.glbimg.com/4wDWnvlTv9q1jrLBrVrgF38TfmM=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_237/escudo/a2/23/50/00d5d7efd5-ba38-45cb-ac81-a4ae266e16a220250324172350" },
];

/**
 * Baixa uma imagem de uma URL
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(err);
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Espera um tempo em ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executa o download de todos os escudos
 */
async function main() {
  console.log('='.repeat(60));
  console.log('DOWNLOAD DE ESCUDOS - Temporada 2025');
  console.log('='.repeat(60));
  console.log(`\nTotal de escudos: ${ESCUDOS.length}`);
  console.log(`Destino: ${ESCUDOS_DIR}\n`);

  // Garantir que o diretório existe
  if (!fs.existsSync(ESCUDOS_DIR)) {
    fs.mkdirSync(ESCUDOS_DIR, { recursive: true });
  }

  let sucesso = 0;
  let falha = 0;
  const falhas = [];

  for (let i = 0; i < ESCUDOS.length; i++) {
    const escudo = ESCUDOS[i];
    const filename = `${escudo.timeId}.png`;
    const filepath = path.join(ESCUDOS_DIR, filename);

    process.stdout.write(`[${i + 1}/${ESCUDOS.length}] ${escudo.nome.padEnd(30)} `);

    try {
      await downloadImage(escudo.url, filepath);

      // Verificar se o arquivo foi baixado corretamente
      const stats = fs.statSync(filepath);
      if (stats.size > 0) {
        console.log(`OK (${(stats.size / 1024).toFixed(1)} KB)`);
        sucesso++;
      } else {
        throw new Error('Arquivo vazio');
      }
    } catch (error) {
      console.log(`FALHA: ${error.message}`);
      falha++;
      falhas.push({ timeId: escudo.timeId, nome: escudo.nome, erro: error.message });
    }

    // Delay entre downloads para não sobrecarregar o servidor
    await sleep(200);
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESULTADO FINAL');
  console.log('='.repeat(60));
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Falhas:  ${falha}`);

  if (falhas.length > 0) {
    console.log('\nEscudos com falha:');
    falhas.forEach(f => console.log(`  - ${f.nome} (${f.timeId}): ${f.erro}`));
  }

  // Criar arquivo de mapeamento JSON
  const mapping = {};
  ESCUDOS.forEach(e => {
    const localPath = `/assets/escudos/${e.timeId}.png`;
    mapping[e.timeId] = {
      nome: e.nome,
      local: localPath,
      original: e.url
    };
  });

  const mappingPath = path.join(ESCUDOS_DIR, 'mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`\nMapeamento salvo em: ${mappingPath}`);
}

main().catch(console.error);

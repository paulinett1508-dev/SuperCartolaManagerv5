// Script de diagnóstico da Quick Access Bar
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/participante/',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('=== DIAGNÓSTICO QUICK ACCESS BAR ===\n');

        // Verificar se CSS está incluído
        const cssIncluido = data.includes('quick-access-bar.css');
        console.log('1. CSS incluído no HTML:', cssIncluido ? '✅' : '❌');

        // Verificar se JS está incluído
        const jsIncluido = data.includes('participante-quick-bar.js');
        console.log('2. JS incluído no HTML:', jsIncluido ? '✅' : '❌');

        // Verificar posição do script no HTML
        const posCSS = data.indexOf('quick-access-bar.css');
        const posJS = data.indexOf('participante-quick-bar.js');
        const posAuth = data.indexOf('participante-auth.js');
        const posNav = data.indexOf('participante-navigation.js');

        console.log('\n3. Ordem de carregamento:');
        console.log('   - CSS: posição', posCSS);
        console.log('   - Auth: posição', posAuth);
        console.log('   - Nav: posição', posNav);
        console.log('   - QuickBar JS: posição', posJS);

        // Verificar se há bottom-nav antiga ativa
        const bottomNavHTML = data.includes('<nav class="bottom-nav-modern"');
        console.log('\n4. Bottom-nav antiga no HTML:', bottomNavHTML ? '⚠️ ENCONTRADA' : '✅ Não encontrada');

        // Verificar se container está com display:none
        const containerHidden = data.includes('participante-container" style="display:none');
        console.log('5. Container com display:none inline:', containerHidden ? '⚠️ SIM' : '✅ NÃO');

        // Verificar script type
        const jsNoType = data.includes('participante-quick-bar.js"></script>');
        console.log('\n6. Script QuickBar sem type (normal):', jsNoType ? '✅ SIM' : '❌ NÃO');

        // Verificar se há erros potenciais
        console.log('\n=== ANÁLISE DE POTENCIAIS PROBLEMAS ===');

        if (posJS < posNav) {
            console.log('⚠️ QuickBar JS carrega ANTES do Navigation');
        } else {
            console.log('✅ QuickBar JS carrega DEPOIS do Navigation');
        }

        if (posJS < posAuth) {
            console.log('⚠️ QuickBar JS carrega ANTES do Auth');
        } else {
            console.log('✅ QuickBar JS carrega DEPOIS do Auth');
        }

        // Verificar z-index inline do splash
        if (data.includes('z-index: 999999')) {
            console.log('⚠️ Splash tem z-index 999999 (maior que Quick Bar 1000)');
        }

        console.log('\n=== FIM DO DIAGNÓSTICO ===');
    });
});

req.on('error', (e) => {
    console.error('Erro:', e.message);
});

req.end();

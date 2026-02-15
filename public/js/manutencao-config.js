/**
 * manutencao-config.js v1.1 - FIX TIMEOUT
 * Gerenciamento avançado do modo manutenção
 */

// ✅ FIX: Helper para fetch com timeout
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Timeout: servidor não respondeu em ${timeoutMs / 1000}s`);
        }
        throw error;
    }
}

const ManutencaoConfig = {
    estadoAtual: null,
    templates: [],
    imagemUpload: null,

    async inicializar() {
        try {
            await this.carregarEstadoAtual();
            await this.carregarTemplates();
            this.aplicarEstadoNaInterface();
        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.mostrarErro('Erro ao carregar configurações');
        }
    },

    async carregarEstadoAtual() {
        const response = await fetchWithTimeout('/api/admin/manutencao');
        if (!response.ok) throw new Error('Erro ao carregar estado');
        this.estadoAtual = await response.json();
        this.atualizarStatusIndicator();
        this.atualizarStatusAtual();
    },

    async carregarTemplates() {
        const response = await fetchWithTimeout('/api/admin/manutencao/templates');
        if (!response.ok) throw new Error('Erro ao carregar templates');
        const data = await response.json();
        this.templates = data.templates || [];
        this.popularSelectTemplates();
    },

    popularSelectTemplates() {
        const select = document.getElementById('templateSelect');
        select.innerHTML = '<option value="">Selecione um template...</option>';

        this.templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.emoji} ${template.nome}`;
            select.appendChild(option);
        });

        // Selecionar template atual se houver
        if (this.estadoAtual?.template_id) {
            select.value = this.estadoAtual.template_id;
        }

        // Event listener para aplicar template
        select.addEventListener('change', (e) => {
            if (e.target.value) {
                this.aplicarTemplate(e.target.value);
            }
        });
    },

    aplicarTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        // Aplicar valores do template nos campos
        document.getElementById('customTitulo').value = template.titulo;
        document.getElementById('customMensagem').value = template.mensagem;
        document.getElementById('customEmoji').value = template.emoji;
        document.getElementById('customCorPrimaria').value = template.cor_primaria;
        document.getElementById('customCorPrimariaText').value = template.cor_primaria;
        document.getElementById('customCorSecundaria').value = template.cor_secundaria;
        document.getElementById('customCorSecundariaText').value = template.cor_secundaria;
        document.getElementById('customMostrarRanking').checked = template.mostrar_ranking !== false;
        document.getElementById('customMostrarNoticias').checked = template.mostrar_noticias !== false;
        document.getElementById('customMostrarUltimaRodada').checked = template.mostrar_ultima_rodada !== false;

        // Limpar imagem ao trocar template
        if (!template.imagem_url) {
            this.removerImagem();
        }
    },

    aplicarEstadoNaInterface() {
        if (!this.estadoAtual) return;

        // Modo
        if (this.estadoAtual.modo) {
            document.querySelector(`input[name="modo"][value="${this.estadoAtual.modo}"]`)?.click();
        }

        // Customização
        if (this.estadoAtual.customizacao) {
            const c = this.estadoAtual.customizacao;
            document.getElementById('customTitulo').value = c.titulo || '';
            document.getElementById('customMensagem').value = c.mensagem || '';
            document.getElementById('customEmoji').value = c.emoji || '';
            document.getElementById('customCorPrimaria').value = c.cor_primaria || '#f97316';
            document.getElementById('customCorPrimariaText').value = c.cor_primaria || '#f97316';
            document.getElementById('customCorSecundaria').value = c.cor_secundaria || '#ea580c';
            document.getElementById('customCorSecundariaText').value = c.cor_secundaria || '#ea580c';
            document.getElementById('customMostrarRanking').checked = c.mostrar_ranking !== false;
            document.getElementById('customMostrarNoticias').checked = c.mostrar_noticias !== false;
            document.getElementById('customMostrarUltimaRodada').checked = c.mostrar_ultima_rodada !== false;

            if (c.imagem_url) {
                this.imagemUpload = c.imagem_url;
                this.mostrarImagemPreview(c.imagem_url);
            }
        }

        // Controle de acesso
        if (this.estadoAtual.controle_acesso) {
            const ca = this.estadoAtual.controle_acesso;
            document.querySelector(`input[name="modoLista"][value="${ca.modo_lista || 'whitelist'}"]`)?.click();

            const ids = ca.modo_lista === 'blacklist'
                ? (ca.blacklist_timeIds || []).join(', ')
                : (ca.whitelist_timeIds || []).join(', ');
            document.getElementById('listaIds').value = ids;
        }

        // Módulos bloqueados
        if (this.estadoAtual.modulos_bloqueados && this.estadoAtual.modulos_bloqueados.length > 0) {
            document.querySelectorAll('.modulo-checkbox').forEach(cb => {
                cb.checked = this.estadoAtual.modulos_bloqueados.includes(cb.value);
            });
        }
    },

    atualizarStatusIndicator() {
        const indicator = document.getElementById('statusIndicator');
        if (!indicator) return;

        const ativo = this.estadoAtual?.ativo === true;
        indicator.innerHTML = ativo
            ? '<span class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span><span class="text-sm text-red-400">ATIVO</span>'
            : '<span class="w-3 h-3 rounded-full bg-green-500"></span><span class="text-sm text-green-400">Inativo</span>';
    },

    atualizarStatusAtual() {
        const content = document.getElementById('statusContent');
        if (!content || !this.estadoAtual) return;

        const ativo = this.estadoAtual.ativo === true;

        if (!ativo) {
            content.innerHTML = '<div class="text-green-400">✅ Modo manutenção está DESATIVADO. O app está funcionando normalmente.</div>';
            return;
        }

        let html = '<div class="space-y-3">';
        html += '<div class="text-red-400 font-medium">🚨 Modo manutenção está ATIVO</div>';
        html += `<div><span class="text-gray-400">Modo:</span> <span class="text-white font-medium">${this.estadoAtual.modo || 'global'}</span></div>`;

        if (this.estadoAtual.customizacao) {
            html += `<div><span class="text-gray-400">Mensagem:</span> "${this.estadoAtual.customizacao.mensagem}"</div>`;
        }

        if (this.estadoAtual.controle_acesso) {
            const ca = this.estadoAtual.controle_acesso;
            const lista = ca.modo_lista === 'blacklist' ? ca.blacklist_timeIds : ca.whitelist_timeIds;
            if (lista && lista.length > 0) {
                html += `<div><span class="text-gray-400">${ca.modo_lista === 'blacklist' ? 'Blacklist' : 'Whitelist'}:</span> ${lista.join(', ')}</div>`;
            }
        }

        if (this.estadoAtual.modulos_bloqueados && this.estadoAtual.modulos_bloqueados.length > 0) {
            html += `<div><span class="text-gray-400">Módulos bloqueados:</span> ${this.estadoAtual.modulos_bloqueados.join(', ')}</div>`;
        }

        if (this.estadoAtual.ativadoEm) {
            const data = new Date(this.estadoAtual.ativadoEm).toLocaleString('pt-BR');
            html += `<div class="text-xs text-gray-500">Ativado em: ${data}</div>`;
        }

        html += '</div>';
        content.innerHTML = html;
    },

    coletarConfiguracao() {
        const modo = document.querySelector('input[name="modo"]:checked')?.value || 'global';
        const modoLista = document.querySelector('input[name="modoLista"]:checked')?.value || 'whitelist';
        const listaIdsText = document.getElementById('listaIds').value;
        const listaIds = listaIdsText.split(',').map(id => id.trim()).filter(id => id);

        const config = {
            modo,
            template_id: document.getElementById('templateSelect').value,
            customizacao: {
                titulo: document.getElementById('customTitulo').value,
                mensagem: document.getElementById('customMensagem').value,
                emoji: document.getElementById('customEmoji').value,
                cor_primaria: document.getElementById('customCorPrimariaText').value,
                cor_secundaria: document.getElementById('customCorSecundariaText').value,
                gradiente: `linear-gradient(135deg, ${document.getElementById('customCorPrimariaText').value} 0%, ${document.getElementById('customCorSecundariaText').value} 100%)`,
                mostrar_ranking: document.getElementById('customMostrarRanking').checked,
                mostrar_noticias: document.getElementById('customMostrarNoticias').checked,
                mostrar_ultima_rodada: document.getElementById('customMostrarUltimaRodada').checked,
                imagem_url: this.imagemUpload,
                icone_tipo: 'emoji'
            },
            controle_acesso: {
                modo_lista: modoLista,
                whitelist_timeIds: modoLista === 'whitelist' ? listaIds : [],
                blacklist_timeIds: modoLista === 'blacklist' ? listaIds : []
            }
        };

        // Coletar módulos bloqueados se modo for 'modulos'
        if (modo === 'modulos') {
            const modulosBloqueados = [];
            document.querySelectorAll('.modulo-checkbox:checked').forEach(cb => {
                modulosBloqueados.push(cb.value);
            });
            config.modulos_bloqueados = modulosBloqueados;
        } else {
            config.modulos_bloqueados = [];
        }

        return config;
    },

    async salvar() {
        try {
            const config = this.coletarConfiguracao();

            const response = await fetchWithTimeout('/api/admin/manutencao/configurar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            }, 10000);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao salvar');
            }

            this.estadoAtual = await response.json();
            this.atualizarStatusIndicator();
            this.atualizarStatusAtual();
            this.mostrarSucesso('Configuração salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.mostrarErro('Erro ao salvar configuração: ' + error.message);
        }
    },

    async ativar() {
        const confirmou = await SuperModal.confirm({
            title: 'Ativar Modo Manutenção',
            message: 'Tem certeza que deseja ATIVAR o modo manutenção?',
            variant: 'danger',
            confirmText: 'Ativar'
        });
        if (!confirmou) {
            return;
        }

        try {
            const config = this.coletarConfiguracao();
            config.ativo = true;

            const response = await fetchWithTimeout('/api/admin/manutencao/configurar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            }, 10000); // 10s timeout para operação de escrita

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao ativar');
            }

            this.estadoAtual = await response.json();
            this.atualizarStatusIndicator();
            this.atualizarStatusAtual();
            this.mostrarSucesso('Modo manutenção ATIVADO com sucesso!');
        } catch (error) {
            console.error('Erro ao ativar:', error);
            this.mostrarErro('Erro ao ativar modo manutenção: ' + error.message);
        }
    },

    async desativar() {
        const confirmou = await SuperModal.confirm({
            title: 'Desativar Modo Manutenção',
            message: 'Tem certeza que deseja DESATIVAR o modo manutenção?',
            confirmText: 'Desativar'
        });
        if (!confirmou) {
            return;
        }

        try {
            const response = await fetchWithTimeout('/api/admin/manutencao/desativar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, 10000); // 10s timeout para operações de escrita

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao desativar');
            }

            this.estadoAtual = await response.json();
            this.atualizarStatusIndicator();
            this.atualizarStatusAtual();
            this.mostrarSucesso('Modo manutenção DESATIVADO com sucesso!');
        } catch (error) {
            console.error('Erro ao desativar:', error);
            this.mostrarErro('Erro ao desativar modo manutenção: ' + error.message);
        }
    },

    selecionarImagem() {
        const input = document.getElementById('uploadImagem');
        input.value = '';
        input.click();

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validar tipo
            if (!file.type.startsWith('image/')) {
                this.mostrarErro('Por favor, selecione uma imagem válida');
                return;
            }

            // Validar tamanho (2MB)
            if (file.size > 2 * 1024 * 1024) {
                this.mostrarErro('Imagem muito grande. Máximo: 2MB');
                return;
            }

            // Converter para base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const base64 = event.target.result;

                    // Fazer upload
                    const response = await fetchWithTimeout('/api/admin/manutencao/upload-imagem', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imagem: base64,
                            nome: file.name.replace(/\.[^/.]+$/, '')
                        })
                    }, 15000); // 15s timeout para upload de imagem

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Erro ao fazer upload');
                    }

                    const result = await response.json();
                    this.imagemUpload = result.url;
                    this.mostrarImagemPreview(result.url);
                    this.mostrarSucesso('Imagem enviada com sucesso!');
                } catch (error) {
                    console.error('Erro no upload:', error);
                    this.mostrarErro('Erro ao fazer upload: ' + error.message);
                }
            };
            reader.readAsDataURL(file);
        };
    },

    removerImagem() {
        this.imagemUpload = null;
        document.getElementById('imagemStatus').textContent = 'Nenhuma imagem selecionada';
        document.getElementById('imagemPreview').classList.add('hidden');
    },

    mostrarImagemPreview(url) {
        document.getElementById('imagemStatus').textContent = url.split('/').pop();
        const preview = document.getElementById('imagemPreview');
        preview.querySelector('img').src = url;
        preview.classList.remove('hidden');
    },

    mostrarPreview() {
        const config = this.coletarConfiguracao();
        const modal = document.getElementById('previewModal');
        const content = document.getElementById('previewContent');

        let html = `
            <div class="text-center" style="background: ${config.customizacao.gradiente}; padding: 2rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                ${config.customizacao.imagem_url ? `<img src="${config.customizacao.imagem_url}" class="w-full max-h-32 object-cover rounded mb-4">` : ''}
                <div class="text-4xl mb-2">${config.customizacao.emoji}</div>
                <h2 class="text-2xl font-bold mb-2">${config.customizacao.titulo}</h2>
                <p class="text-white">${config.customizacao.mensagem}</p>
            </div>
            <div class="space-y-2 text-sm">
                <div><strong>Modo:</strong> ${config.modo}</div>
                ${config.modo === 'modulos' && config.modulos_bloqueados.length > 0 ? `<div><strong>Módulos bloqueados:</strong> ${config.modulos_bloqueados.join(', ')}</div>` : ''}
                ${config.controle_acesso.modo_lista === 'whitelist' && config.controle_acesso.whitelist_timeIds.length > 0 ? `<div><strong>Whitelist:</strong> ${config.controle_acesso.whitelist_timeIds.join(', ')}</div>` : ''}
                ${config.controle_acesso.modo_lista === 'blacklist' && config.controle_acesso.blacklist_timeIds.length > 0 ? `<div><strong>Blacklist:</strong> ${config.controle_acesso.blacklist_timeIds.join(', ')}</div>` : ''}
                <div><strong>Opções:</strong></div>
                <ul class="list-disc list-inside ml-4">
                    <li>${config.customizacao.mostrar_ranking ? '✅' : '❌'} Mostrar ranking</li>
                    <li>${config.customizacao.mostrar_noticias ? '✅' : '❌'} Mostrar notícias</li>
                    <li>${config.customizacao.mostrar_ultima_rodada ? '✅' : '❌'} Mostrar última rodada</li>
                </ul>
            </div>
        `;

        content.innerHTML = html;
        modal.classList.remove('hidden');
    },

    fecharPreview() {
        document.getElementById('previewModal').classList.add('hidden');
    },

    mostrarSucesso(mensagem) {
        SuperModal.toast.success(mensagem);
    },

    mostrarErro(mensagem) {
        SuperModal.toast.error(mensagem);
    }
};

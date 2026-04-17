function switchTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    event.target.closest('.tab-btn').classList.add('active');
    if (name === 'saldo') loadExtrato();
}

async function loadMyCard() {
    try {
        const data = await apiFetch('/api/cards/my/');
        document.getElementById('qr-loading').style.display = 'none';
        const img = document.getElementById('my-qr-img');
        img.src = 'data:image/png;base64,' + data.card.qr_code_image;
        img.style.display = 'block';
        document.getElementById('my-qr-label').textContent = data.card.qr_code_data;
        document.getElementById('my-saldo').textContent = `R$ ${parseFloat(data.card.saldo).toFixed(2)}`;
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function setValor(v) {
    document.getElementById('add-valor').value = v;
}

// ===== Integração PIX Asaas =====
let pixPollingInterval = null;
let currentRecargaId = null;

async function gerarPixRecarga() {
    const valor = document.getElementById('add-valor').value;
    if (!valor || parseFloat(valor) < 1) {
        showToast('Valor mínimo é R$ 1,00', 'error');
        return;
    }

    const btn = document.getElementById('btn-gerar-pix');
    btn.disabled = true;
    btn.textContent = 'Gerando...';

    try {
        const data = await apiFetch('/api/asaas/create-payment/', {
            method: 'POST',
            body: JSON.stringify({ valor: valor })
        });

        if (!data.success) {
            showToast(data.error || 'Erro ao gerar PIX', 'error');
            return;
        }

        // Mostrar QR Code
        currentRecargaId = data.recarga_id;
        document.getElementById('pix-qr-img').src = 'data:image/png;base64,' + data.pix_qr_code_image;
        document.getElementById('pix-copia-cola').value = data.pix_copia_cola;
        document.getElementById('pix-valor-display').textContent = `R$ ${parseFloat(data.valor).toFixed(2)}`;

        // Trocar para etapa 2
        document.getElementById('pix-step-1').style.display = 'none';
        document.getElementById('pix-step-2').style.display = 'block';

        // Iniciar polling
        iniciarPolling(data.recarga_id);

    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Gerar PIX';
    }
}

function copiarPix() {
    const input = document.getElementById('pix-copia-cola');
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Código PIX copiado!');
    }).catch(() => {
        input.select();
        document.execCommand('copy');
        showToast('Código PIX copiado!');
    });
}

function iniciarPolling(recargaId) {
    pararPolling();
    pixPollingInterval = setInterval(async () => {
        try {
            const data = await apiFetch(`/api/asaas/check-payment/${recargaId}/`);
            if (data.status === 'pago') {
                pararPolling();
                // Mostrar sucesso
                document.getElementById('pix-step-2').style.display = 'none';
                document.getElementById('pix-step-3').style.display = 'block';
                document.getElementById('pix-valor-confirmado').textContent = `+ R$ ${parseFloat(data.valor).toFixed(2)}`;
                // Atualizar saldo
                loadMyCard();
            }
        } catch (e) {
            // Silenciar erros de polling
        }
    }, 3000); // Verificar a cada 3 segundos
}

function pararPolling() {
    if (pixPollingInterval) {
        clearInterval(pixPollingInterval);
        pixPollingInterval = null;
    }
}

function cancelarPix() {
    pararPolling();
    currentRecargaId = null;
    document.getElementById('pix-step-2').style.display = 'none';
    document.getElementById('pix-step-1').style.display = 'block';
    document.getElementById('add-valor').value = '';
}

function voltarPixInicio() {
    document.getElementById('pix-step-3').style.display = 'none';
    document.getElementById('pix-step-1').style.display = 'block';
    document.getElementById('add-valor').value = '';
    loadExtrato();
}

// ===== Extrato =====
async function loadExtrato() {
    const container = document.getElementById('extrato-list');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const data = await apiFetch('/api/cards/my/transactions/');
        document.getElementById('my-saldo').textContent = `R$ ${parseFloat(data.saldo).toFixed(2)}`;
        if (!data.transactions.length) {
            container.innerHTML = '<div class="empty-state"><p>Nenhuma transação ainda</p></div>';
            return;
        }
        const tipoColors = { deposito: 'var(--success)', pagamento: 'var(--primary)', retirada: 'var(--warning)' };
        const tipoIcons = { deposito: '💰', pagamento: '🛒', retirada: '↩️' };
        container.innerHTML = data.transactions.map(t => `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:0.7rem 0;border-bottom:1px solid var(--border);">
                <div style="flex:1;min-width:0;">
                    <div style="color:var(--text-primary);font-weight:600;font-size:0.88rem;">
                        ${tipoIcons[t.tipo] || ''} ${t.tipo_label}
                        <span style="color:var(--text-secondary);font-weight:400;font-size:0.75rem;margin-left:0.3rem;">${t.metodo_label}</span>
                    </div>
                    <div style="color:var(--text-secondary);font-size:0.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.descricao}</div>
                    <div style="color:var(--text-secondary);font-size:0.72rem;">📅 ${t.data}</div>
                </div>
                <div style="color:${tipoColors[t.tipo] || 'var(--text-primary)'};font-weight:700;font-size:0.9rem;white-space:nowrap;margin-left:0.5rem;">
                    ${t.tipo === 'deposito' ? '+' : '−'} R$ ${parseFloat(t.valor).toFixed(2)}
                </div>
            </div>
        `).join('');
    } catch (e) { showToast(e.message, 'error'); }
}

// Init
loadMyCard();

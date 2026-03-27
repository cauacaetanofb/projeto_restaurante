let cart = [];
let activeScanner = null;
let activeScannerPrefix = null;
let currentMode = 'caixa';

// ===== Sidebar =====
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// ===== Mode Switching =====
function switchMode(mode) {
    currentMode = mode;
    closeSidebar();

    // Update sidebar active
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    document.getElementById('nav-' + mode).classList.add('active');

    // Update mode badge
    document.getElementById('mode-label').textContent = mode.toUpperCase();

    // Show correct tabs
    document.getElementById('tabs-caixa').style.display = mode === 'caixa' ? 'flex' : 'none';
    document.getElementById('tabs-balcao').style.display = mode === 'balcao' ? 'flex' : 'none';

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    // Show default tab for mode
    const defaultTab = mode === 'caixa' ? 'cartao' : 'cardapio';
    document.getElementById('tab-' + defaultTab).classList.add('active');
    const activeTabs = document.getElementById('tabs-' + mode);
    activeTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    activeTabs.querySelector('.tab-btn').classList.add('active');

    // Update cart badge
    updateCartBadge();
}

// ===== Tab Switching =====
function switchTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const activeTabs = document.getElementById('tabs-' + currentMode);
    activeTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
    if (name === 'carrinho') renderCart();
    if (name === 'pagamento') renderPaySummary();
    if (name === 'relatorio') loadDailyReport();
    // Stop any active scanner
    if (activeScanner) {
        activeScanner.stop().then(() => {
            activeScanner = null;
            if (activeScannerPrefix) {
                document.getElementById(activeScannerPrefix + '-qr-reader').innerHTML = '';
            }
        }).catch(() => {});
    }
}

// ===== Menu =====
let allMenuProducts = [];
let selectedCat = '';

async function loadMenu() {
    try {
        const data = await apiFetch('/api/products/');
        allMenuProducts = data.products.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        renderMenu();
    } catch (e) { showToast(e.message, 'error'); }
}

function filterByCat(cat, btn) {
    selectedCat = cat;
    document.querySelectorAll('#cat-filter .period-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderMenu();
}

function renderMenu() {
    const container = document.getElementById('menu-list');
    let products = allMenuProducts;
    if (selectedCat) products = products.filter(p => p.categoria === selectedCat);
    if (!products.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🍕</div><p>Nenhum produto encontrado</p></div>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="product-item">
            <div class="product-info">
                <div class="name">${p.nome}</div>
                <div class="price">R$ ${parseFloat(p.preco).toFixed(2)}</div>
                <div class="category">${p.categoria}</div>
            </div>
            <button class="btn-add-cart" onclick='addToCart(${JSON.stringify(p)})'>+</button>
        </div>
    `).join('');
}

// ===== Cart =====
function addToCart(product) {
    const existing = cart.find(c => c.id === product.id);
    if (existing) existing.quantidade++;
    else cart.push({ ...product, quantidade: 1 });
    updateCartBadge();
    showToast(`${product.nome} adicionado!`);
}

function removeFromCart(productId) {
    cart = cart.filter(c => c.id !== productId);
    updateCartBadge();
    renderCart();
}

function changeQty(productId, delta) {
    const item = cart.find(c => c.id === productId);
    if (!item) return;
    item.quantidade += delta;
    if (item.quantidade <= 0) { removeFromCart(productId); return; }
    renderCart();
    updateCartBadge();
}

function getCartTotal() {
    return cart.reduce((sum, c) => sum + parseFloat(c.preco) * c.quantidade, 0);
}

function updateCartBadge() {
    const count = cart.reduce((s, c) => s + c.quantidade, 0);
    const text = count > 0 ? `(${count})` : '';
    const el1 = document.getElementById('cart-badge');
    const el2 = document.getElementById('cart-badge-b');
    if (el1) el1.textContent = text;
    if (el2) el2.textContent = text;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalSection = document.getElementById('cart-total-section');
    if (!cart.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><p>Carrinho vazio</p></div>';
        totalSection.style.display = 'none';
        return;
    }
    totalSection.style.display = 'block';
    container.innerHTML = cart.map(c => `
        <div class="cart-item">
            <div class="product-info" style="flex:1;">
                <div class="name">${c.nome}</div>
                <div class="price">R$ ${(parseFloat(c.preco) * c.quantidade).toFixed(2)}</div>
            </div>
            <div class="cart-qty">
                <button onclick="changeQty(${c.id}, -1)">−</button>
                <span>${c.quantidade}</span>
                <button onclick="changeQty(${c.id}, 1)">+</button>
            </div>
        </div>
    `).join('');
    document.getElementById('cart-total-value').textContent = `R$ ${getCartTotal().toFixed(2)}`;
}

// ===== Payment =====
function renderPaySummary() {
    const container = document.getElementById('pay-cart-summary');
    if (!cart.length) {
        container.innerHTML = '<div class="alert alert-error">Adicione produtos ao carrinho primeiro.</div>';
        document.getElementById('btn-pay').style.display = 'none';
        return;
    }
    container.innerHTML = `
        <div style="border-top:1px solid var(--border);padding-top:0.8rem;">
            ${cart.map(c => `<div style="display:flex;justify-content:space-between;color:var(--text-secondary);font-size:0.85rem;padding:0.3rem 0;">
                <span>${c.quantidade}x ${c.nome}</span>
                <span>R$ ${(parseFloat(c.preco)*c.quantidade).toFixed(2)}</span>
            </div>`).join('')}
            <div class="cart-total"><span>Total</span><span class="value">R$ ${getCartTotal().toFixed(2)}</span></div>
        </div>`;
}

// ===== QR Scanner =====
function startScanner(prefix) {
    const readerId = prefix + '-qr-reader';
    // Mapear prefixo para o ID do input correto
    let inputId = prefix + '-qr-input';
    if (prefix === 'gctransfer') inputId = 'gc-transfer-to-qr';

    const reader = document.getElementById(readerId);
    if (activeScanner) {
        activeScanner.stop().then(() => { activeScanner = null; reader.innerHTML = ''; });
        return;
    }
    activeScannerPrefix = prefix;
    activeScanner = new Html5Qrcode(readerId);
    activeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
            document.getElementById(inputId).value = text;
            activeScanner.stop().then(() => { activeScanner = null; reader.innerHTML = ''; });
            if (prefix === 'pay') checkCardForPayment(text);
            if (prefix === 'saldo') consultarSaldo(text);
            if (prefix === 'csaldo') consultarSaldoBalcao(text);
        }
    ).catch(err => showToast('Erro na câmera: ' + err, 'error'));
}

async function checkCardForPayment(qrData) {
    if (!qrData) qrData = document.getElementById('pay-qr-input').value;
    if (!qrData) return;
    try {
        const data = await apiFetch(`/api/cards/balance/?qr_data=${qrData}`);
        document.getElementById('pay-card-info').style.display = 'block';
        document.getElementById('pay-client-name').textContent = data.card.nome;
        document.getElementById('pay-client-type').textContent = data.card.is_temporary ? 'Cartão Temporário' : 'Cliente';
        document.getElementById('pay-client-saldo').textContent = `R$ ${parseFloat(data.card.saldo).toFixed(2)}`;
        document.getElementById('btn-pay').style.display = 'block';
    } catch (e) { showToast(e.message, 'error'); }
}

document.getElementById('pay-qr-input').addEventListener('change', function() {
    checkCardForPayment(this.value);
});

async function processPayment() {
    const qrData = document.getElementById('pay-qr-input').value;
    if (!qrData) { showToast('Escaneie ou digite o código do cartão', 'error'); return; }
    if (!cart.length) { showToast('Carrinho vazio', 'error'); return; }
    try {
        const data = await apiFetch('/api/orders/create/', {
            method: 'POST',
            body: JSON.stringify({
                qr_data: qrData,
                items: cart.map(c => ({ product_id: c.id, quantidade: c.quantidade }))
            })
        });
        showToast(`Pagamento confirmado! Pedido #${data.order_id}`);
        cart = [];
        updateCartBadge();
        document.getElementById('pay-qr-input').value = '';
        document.getElementById('pay-card-info').style.display = 'none';
        document.getElementById('btn-pay').style.display = 'none';
        document.getElementById('pay-cart-summary').innerHTML = '';
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== Temp Card =====
async function createTempCard() {
    try {
        const payload = {
            nome: document.getElementById('tc-nome').value,
            cpf: document.getElementById('tc-cpf').value,
            telefone: document.getElementById('tc-telefone').value,
            qr_data: document.getElementById('tc-qr-input').value,
            valor: document.getElementById('tc-valor').value,
            metodo: document.getElementById('tc-metodo').value
        };
        const data = await apiFetch('/api/cards/temp/create/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        document.getElementById('temp-card-result').style.display = 'block';
        document.getElementById('tc-qr-img').src = 'data:image/png;base64,' + data.card.qr_code_image;
        document.getElementById('tc-qr-label').textContent = `Cartão de ${data.card.nome} — ${data.card.qr_code_data}`;
        
        // Limpar form
        document.getElementById('tc-nome').value = '';
        document.getElementById('tc-cpf').value = '';
        document.getElementById('tc-telefone').value = '';
        document.getElementById('tc-qr-input').value = '';
        document.getElementById('tc-valor').value = '';
        
        showToast('Cartão gerado/vinculado e recarregado!');
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== Balance (Caixa mode) =====
async function consultarSaldo(qrData) {
    if (!qrData) qrData = document.getElementById('saldo-qr-input').value;
    if (!qrData) { showToast('Digite ou escaneie o código do cartão', 'error'); return; }
    try {
        const data = await apiFetch(`/api/cards/balance/?qr_data=${qrData}`);
        document.getElementById('saldo-card-info').style.display = 'block';
        document.getElementById('saldo-client-name').textContent = data.card.nome;
        document.getElementById('saldo-value').textContent = `R$ ${parseFloat(data.card.saldo).toFixed(2)}`;
    } catch (e) { showToast(e.message, 'error'); }
}

async function alterarSaldo(action) {
    const qrData = document.getElementById('saldo-qr-input').value;
    const valor = document.getElementById('saldo-valor').value;
    const metodo = document.getElementById('saldo-metodo').value;
    if (!qrData || !valor) { showToast('Preencha o código e o valor', 'error'); return; }
    try {
        const url = action === 'add' ? '/api/cards/balance/add/' : '/api/cards/balance/remove/';
        const data = await apiFetch(url, {
            method: 'POST',
            body: JSON.stringify({ qr_data: qrData, valor: valor, metodo: metodo })
        });
        document.getElementById('saldo-value').textContent = `R$ ${parseFloat(data.novo_saldo).toFixed(2)}`;
        document.getElementById('saldo-valor').value = '';
        showToast(action === 'add' ? 'Saldo adicionado!' : 'Saldo removido!');
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== Balance (Balcao mode - consulta only) =====
async function consultarSaldoBalcao(qrData) {
    if (!qrData) qrData = document.getElementById('csaldo-qr-input').value;
    if (!qrData) { showToast('Digite ou escaneie o código do cartão', 'error'); return; }
    try {
        const data = await apiFetch(`/api/cards/balance/?qr_data=${qrData}`);
        document.getElementById('csaldo-card-info').style.display = 'block';
        document.getElementById('csaldo-client-name').textContent = data.card.nome;
        document.getElementById('csaldo-value').textContent = `R$ ${parseFloat(data.card.saldo).toFixed(2)}`;
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== Daily Report =====
async function loadDailyReport() {
    document.getElementById('report-loading').style.display = 'block';
    document.getElementById('report-content').style.display = 'none';
    try {
        const data = await apiFetch('/api/reports/daily/');
        document.getElementById('report-loading').style.display = 'none';
        document.getElementById('report-content').style.display = 'block';

        document.getElementById('report-summary').innerHTML = `
            <div style="text-align:center;margin-bottom:0.5rem;color:var(--text-secondary);font-size:0.82rem;">📅 ${data.data}</div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <div class="surface-card" style="flex:1;text-align:center;margin:0;min-width:45%;background:var(--bg-dark);">
                    <div style="color:var(--success);font-size:1.3rem;font-weight:800;">R$ ${parseFloat(data.total_vendas).toFixed(2)}</div>
                    <div style="color:var(--text-secondary);font-size:0.72rem;">Vendas (${data.total_pedidos} pedidos)</div>
                </div>
                <div class="surface-card" style="flex:1;text-align:center;margin:0;min-width:45%;background:var(--bg-dark);">
                    <div style="color:var(--warning);font-size:1.3rem;font-weight:800;">R$ ${parseFloat(data.total_depositos).toFixed(2)}</div>
                    <div style="color:var(--text-secondary);font-size:0.72rem;">Depósitos (${data.total_depositos_count})</div>
                </div>
            </div>
        `;

        if (data.por_metodo && data.por_metodo.length) {
            document.getElementById('report-metodos').innerHTML = `
                <h3 style="color:var(--text-primary);font-size:0.9rem;margin-bottom:0.5rem;">💳 Recebido por Forma de Pagamento</h3>
                <table class="report-table">
                    <thead><tr><th>Método</th><th>Qtd</th><th>Total</th></tr></thead>
                    <tbody>${data.por_metodo.map(m => `
                        <tr><td>${m.metodo}</td><td>${m.count}</td><td style="color:var(--success);font-weight:600;">R$ ${parseFloat(m.total).toFixed(2)}</td></tr>
                    `).join('')}</tbody>
                </table>
            `;
        } else {
            document.getElementById('report-metodos').innerHTML = '<div class="empty-state"><p>Nenhum depósito hoje</p></div>';
        }

        if (data.top_products && data.top_products.length) {
            document.getElementById('report-top').innerHTML = `
                <h3 style="color:var(--text-primary);font-size:0.9rem;margin-bottom:0.5rem;">🏆 Mais Vendidos Hoje</h3>
                <table class="report-table">
                    <thead><tr><th>Produto</th><th>Qtd</th><th>Total</th></tr></thead>
                    <tbody>${data.top_products.map(p => `
                        <tr><td>${p.nome}</td><td>${p.quantidade}</td><td>R$ ${parseFloat(p.valor).toFixed(2)}</td></tr>
                    `).join('')}</tbody>
                </table>
            `;
        } else {
            document.getElementById('report-top').innerHTML = '<div class="empty-state"><p>Nenhuma venda hoje</p></div>';
        }
    } catch (e) {
        document.getElementById('report-loading').style.display = 'none';
        showToast(e.message, 'error');
    }
}

// ===== Gerenciar Cartões (Busca CPF, Transferência, Bloqueio) =====
let transferFromCardId = null;

async function buscarCartoesCPF() {
    const cpf = document.getElementById('gc-cpf').value.trim();
    if (!cpf) { showToast('Digite o CPF do cliente', 'error'); return; }
    const resultsDiv = document.getElementById('gc-results');
    resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    document.getElementById('gc-transfer-panel').style.display = 'none';
    try {
        const data = await apiFetch('/api/cards/search-cpf/?cpf=' + encodeURIComponent(cpf));
        if (!data.cards || data.cards.length === 0) {
            resultsDiv.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>Nenhum cartão encontrado</p></div>';
            return;
        }
        let html = '';
        data.cards.forEach(function(card) {
            const tipo = card.is_temporary ? '🏷️ Temporário' : '📱 Cliente App';
            const status = card.bloqueado
                ? '<span style="color:var(--danger);font-weight:600;">❌ Cancelado</span>'
                : '<span style="color:var(--success);font-weight:600;">✅ Ativo</span>';
            const saldo = parseFloat(card.saldo).toFixed(2);

            html += '<div class="surface-card" style="background:var(--bg-dark);margin-bottom:0.6rem;padding:0.8rem;">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">';
            html += '<div>';
            html += '<div style="color:var(--text-primary);font-weight:600;">' + card.nome + '</div>';
            html += '<div style="color:var(--text-secondary);font-size:0.75rem;">' + tipo + ' • CPF: ' + card.cpf + '</div>';
            html += '</div>';
            html += '<div style="text-align:right;">';
            html += '<div style="color:var(--success);font-weight:700;font-size:1.1rem;">R$ ' + saldo + '</div>';
            html += '<div style="font-size:0.75rem;">' + status + '</div>';
            html += '</div>';
            html += '</div>';

            if (!card.bloqueado) {
                html += '<div style="display:flex;gap:0.4rem;margin-top:0.5rem;">';
                if (parseFloat(card.saldo) > 0) {
                    html += '<button class="btn-secondary" onclick="iniciarTransferencia(' + card.id + ', \'' + card.nome.replace(/'/g, "\\'") + '\', \'' + saldo + '\')" style="flex:1;font-size:0.78rem;padding:0.4rem;">🔄 Transferir</button>';
                }
                html += '<button class="btn-danger" onclick="bloquearCartao(' + card.id + ', \'' + card.nome.replace(/'/g, "\\'") + '\')" style="flex:1;font-size:0.78rem;padding:0.4rem;">🚫 Cancelar</button>';
                html += '</div>';
            }
            html += '</div>';
        });
        resultsDiv.innerHTML = html;
    } catch (e) {
        resultsDiv.innerHTML = '';
        showToast(e.message, 'error');
    }
}

function iniciarTransferencia(cardId, nome, saldo) {
    transferFromCardId = cardId;
    document.getElementById('gc-transfer-from-name').textContent = nome;
    document.getElementById('gc-transfer-from-saldo').textContent = saldo;
    document.getElementById('gc-transfer-to-qr').value = '';
    document.getElementById('gc-transfer-panel').style.display = 'block';
}

function cancelarTransferencia() {
    transferFromCardId = null;
    document.getElementById('gc-transfer-panel').style.display = 'none';
    if (activeScanner) {
        activeScanner.stop().then(function() {
            activeScanner = null;
            document.getElementById('gctransfer-qr-reader').innerHTML = '';
        }).catch(function(){});
    }
}

async function confirmarTransferencia() {
    const toQr = document.getElementById('gc-transfer-to-qr').value.trim();
    if (!transferFromCardId || !toQr) {
        showToast('Escaneie ou digite o QR do cartão destino', 'error');
        return;
    }
    try {
        const data = await apiFetch('/api/cards/transfer/', {
            method: 'POST',
            body: JSON.stringify({ from_card_id: transferFromCardId, to_qr_data: toQr })
        });
        showToast('Saldo de R$ ' + data.valor_transferido + ' transferido com sucesso!');
        cancelarTransferencia();
        buscarCartoesCPF(); // Recarrega a lista
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function bloquearCartao(cardId, nome) {
    if (!confirm('Tem certeza que deseja CANCELAR o cartão de ' + nome + '?\n\nO cartão será zerado e liberado para reutilização.\nEssa ação não pode ser desfeita.')) {
        return;
    }
    const motivo = prompt('Motivo do cancelamento (opcional):', 'Devolução / perda do cartão') || 'Cancelado pelo caixa';
    try {
        await apiFetch('/api/cards/block/', {
            method: 'POST',
            body: JSON.stringify({ card_id: cardId, motivo: motivo })
        });
        showToast('Cartão cancelado e liberado para reutilização!');
        buscarCartoesCPF(); // Recarrega a lista
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Init
loadMenu();

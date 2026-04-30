let cart = [];
let payScanner = null;

function switchTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    event.target.closest('.tab-btn').classList.add('active');

    if (name === 'carrinho') renderCart();
    if (name === 'pagamento') renderPaySummary();
}

// ===== Menu =====
let allMenuProducts = [];
let selectedCat = '';

async function loadMenu() {
    try {
        const data = await apiFetch('/api/products/');
        allMenuProducts = data.products.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        renderMenu();
    } catch (e) {
        showToast(e.message, 'error');
    }
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
    if (existing) {
        existing.quantidade++;
    } else {
        cart.push({ ...product, quantidade: 1 });
    }
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
    if (item.quantidade <= 0) {
        removeFromCart(productId);
        return;
    }
    renderCart();
    updateCartBadge();
}

function getCartTotal() {
    return cart.reduce((sum, c) => sum + parseFloat(c.preco) * c.quantidade, 0);
}

function updateCartBadge() {
    const count = cart.reduce((s, c) => s + c.quantidade, 0);
    document.getElementById('cart-badge').textContent = count > 0 ? `(${count})` : '';
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
        <div style="border-top:1px solid var(--border);padding-top:0.8rem;margin-top:0.5rem;">
            ${cart.map(c => `<div style="display:flex;justify-content:space-between;color:var(--text-secondary);font-size:0.85rem;padding:0.3rem 0;">
                <span>${c.quantidade}x ${c.nome}</span>
                <span>R$ ${(parseFloat(c.preco)*c.quantidade).toFixed(2)}</span>
            </div>`).join('')}
            <div class="cart-total">
                <span>Total</span>
                <span class="value">R$ ${getCartTotal().toFixed(2)}</span>
            </div>
        </div>
    `;
}

function startScanner(prefix) {
    const readerId = prefix + '-qr-reader';
    const inputId = prefix + '-qr-input';
    const reader = document.getElementById(readerId);

    if (payScanner) {
        payScanner.stop().then(() => { payScanner = null; reader.innerHTML = ''; });
        return;
    }
    payScanner = new Html5Qrcode(readerId);
    payScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
            document.getElementById(inputId).value = text;
            payScanner.stop().then(() => { payScanner = null; reader.innerHTML = ''; });
            if (prefix === 'pay') checkCardForPayment(text);
            if (prefix === 'saldo') consultarSaldo(text);
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
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Auto-check on input blur
document.getElementById('pay-qr-input').addEventListener('change', function() {
    checkCardForPayment(this.value);
});

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
        showToast(`Pagamento confirmado! Pedido #${data.order_id} — R$ ${parseFloat(data.total).toFixed(2)}`);
        cart = [];
        updateCartBadge();
        document.getElementById('pay-qr-input').value = '';
        const cardInfo = document.getElementById('pay-card-info');
        if (cardInfo) cardInfo.style.display = 'none';
        const btnPay = document.getElementById('btn-pay');
        if (btnPay) btnPay.style.display = 'none';
        const cartSummary = document.getElementById('pay-cart-summary');
        if (cartSummary) cartSummary.innerHTML = '';
        const saldoEl = document.getElementById('pay-client-saldo');
        if (saldoEl) saldoEl.textContent = `R$ ${parseFloat(data.novo_saldo).toFixed(2)}`;
        renderCart();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Init
loadMenu();

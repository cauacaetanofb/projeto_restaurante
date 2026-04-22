// ===== Tabs =====
function switchTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    event.target.classList.add('active');

    if (name === 'produtos') loadProducts();
    if (name === 'usuarios') loadStaff();
    if (name === 'clientes') loadClients();
    if (name === 'relatorios') { loadReport('today'); loadAllTransactions(); }
}

// ===== Modal =====
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function openModal(id) { document.getElementById(id).classList.add('active'); }

// ===== Products =====
let allProducts = [];

async function loadProducts() {
    try {
        const data = await apiFetch('/api/products/all/');
        allProducts = data.products;
        const cats = [...new Set(allProducts.map(p => p.categoria).filter(c => c && c !== 'Sem categoria'))];
        const catSelect = document.getElementById('filter-product-cat');
        catSelect.innerHTML = '<option value="">Todas</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
        filterProducts();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function filterProducts() {
    const search = document.getElementById('search-product').value.toLowerCase().trim();
    const catFilter = document.getElementById('filter-product-cat').value;
    let filtered = allProducts;
    if (search) filtered = filtered.filter(p => p.nome.toLowerCase().includes(search));
    if (catFilter) filtered = filtered.filter(p => p.categoria === catFilter);
    renderProducts(filtered);
}

function renderProducts(products) {
    const container = document.getElementById('products-list');
    if (!products.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>Nenhum produto encontrado</p></div>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="product-item">
            <div class="product-info">
                <div class="name">${p.nome}</div>
                <div class="price">R$ ${parseFloat(p.preco).toFixed(2)}</div>
                <div class="category">${p.categoria}${p.disponivel ? '' : ' • <span style="color:var(--danger)">Indisponível</span>'}</div>
            </div>
            <button class="btn-add-cart" onclick="editProduct(${p.id}, '${p.nome}', '${p.preco}', '${p.categoria}', '${(p.descricao||'').replace(/'/g,"\\'")}', ${p.disponivel})" title="Editar">✏️</button>
            <button class="btn-add-cart" onclick="deleteProduct(${p.id})" style="background:var(--danger);" title="Excluir">🗑️</button>
        </div>
    `).join('');
}

function openAddProduct() {
    document.getElementById('product-id').value = '';
    document.getElementById('modal-product-title').textContent = 'Novo Produto';
    document.getElementById('form-product').reset();
    document.getElementById('p-disponivel').checked = true;
    openModal('modal-product');
}

function editProduct(id, nome, preco, categoria, descricao, disponivel) {
    document.getElementById('product-id').value = id;
    document.getElementById('modal-product-title').textContent = 'Editar Produto';
    document.getElementById('p-nome').value = nome;
    document.getElementById('p-preco').value = preco;
    document.getElementById('p-categoria').value = categoria === 'Sem categoria' ? '' : categoria;
    document.getElementById('p-descricao').value = descricao;
    document.getElementById('p-disponivel').checked = disponivel;
    openModal('modal-product');
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const fd = new FormData();
    fd.append('nome', document.getElementById('p-nome').value);
    fd.append('preco', document.getElementById('p-preco').value);
    fd.append('categoria', document.getElementById('p-categoria').value);
    fd.append('descricao', document.getElementById('p-descricao').value);
    fd.append('disponivel', document.getElementById('p-disponivel').checked ? 'true' : 'false');
    const img = document.getElementById('p-imagem').files[0];
    if (img) fd.append('imagem', img);

    try {
        const url = id ? `/api/products/${id}/update/` : '/api/products/create/';
        await fetch(url, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrftoken },
            credentials: 'same-origin',
            body: fd,
        }).then(r => r.json());
        closeModal('modal-product');
        showToast(id ? 'Produto atualizado!' : 'Produto criado!');
        loadProducts();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Excluir este produto?')) return;
    try {
        await apiFetch(`/api/products/${id}/delete/`, { method: 'POST' });
        showToast('Produto excluído!');
        loadProducts();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== Staff =====
let allStaff = [];
const typeLabels = { admin: 'Admin', balcao: 'Balcão', caixa: 'Caixa' };

async function loadStaff() {
    try {
        const data = await apiFetch('/api/staff/');
        allStaff = data.users;
        filterStaff();
    } catch (e) { showToast(e.message, 'error'); }
}

function filterStaff() {
    const search = document.getElementById('search-staff').value.toLowerCase().trim();
    const typeFilter = document.getElementById('filter-staff-type').value;
    let filtered = allStaff;
    if (search) filtered = filtered.filter(u => (u.first_name || u.username).toLowerCase().includes(search));
    if (typeFilter) filtered = filtered.filter(u => u.user_type === typeFilter);
    renderStaff(filtered);
}

function renderStaff(users) {
    const container = document.getElementById('staff-list');
    if (!users.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>Nenhum funcionário encontrado</p></div>';
        return;
    }
    container.innerHTML = users.map(u => `
        <div class="staff-item">
            <div>
                <div class="staff-name">${u.first_name || u.username}</div>
                <div class="staff-type">${typeLabels[u.user_type] || u.user_type} • @${u.username}</div>
            </div>
            <div style="display:flex;gap:0.3rem;">
                <button class="btn-add-cart" onclick="openEditStaff(${u.id}, '${(u.first_name||'').replace(/'/g, "\\'")}', '${u.user_type}')" title="Editar">✏️</button>
                <button class="btn-add-cart" onclick="deleteStaff(${u.id})" style="background:var(--danger);" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openAddStaff() { openModal('modal-staff'); }

function openEditStaff(id, nome, type) {
    document.getElementById('es-id').value = id;
    document.getElementById('es-nome').value = nome;
    document.getElementById('es-type').value = type;
    document.getElementById('es-password').value = '';
    openModal('modal-edit-staff');
}

async function saveEditStaff(e) {
    e.preventDefault();
    const id = document.getElementById('es-id').value;
    const body = {
        first_name: document.getElementById('es-nome').value,
        user_type: document.getElementById('es-type').value,
    };
    const pw = document.getElementById('es-password').value;
    if (pw) body.password = pw;
    try {
        await apiFetch(`/api/staff/${id}/update/`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        closeModal('modal-edit-staff');
        showToast('Funcionário atualizado!');
        loadStaff();
    } catch (e) { showToast(e.message, 'error'); }
}

async function saveStaff(e) {
    e.preventDefault();
    try {
        await apiFetch('/api/staff/create/', {
            method: 'POST',
            body: JSON.stringify({
                first_name: document.getElementById('s-nome').value,
                username: document.getElementById('s-username').value,
                user_type: document.getElementById('s-type').value,
                password1: document.getElementById('s-pass1').value,
                password2: document.getElementById('s-pass2').value,
            })
        });
        closeModal('modal-staff');
        document.getElementById('form-staff').reset();
        showToast('Funcionário criado!');
        loadStaff();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteStaff(id) {
    if (!confirm('Excluir este funcionário?')) return;
    try {
        await apiFetch(`/api/staff/${id}/delete/`, { method: 'POST' });
        showToast('Funcionário excluído!');
        loadStaff();
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== Clients =====
let allClients = [];

async function loadClients() {
    try {
        const data = await apiFetch('/api/clients/');
        allClients = data.clients;
        filterClients();
    } catch (e) { showToast(e.message, 'error'); }
}

function filterClients() {
    const search = document.getElementById('search-client').value.toLowerCase().trim();
    let filtered = allClients;
    if (search) filtered = filtered.filter(c => (c.first_name || c.username).toLowerCase().includes(search) || (c.cpf || '').includes(search));
    renderClients(filtered);
}

function renderClients(clients) {
    const container = document.getElementById('clients-list');
    if (!clients.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🧑</div><p>Nenhum cliente encontrado</p></div>';
        return;
    }
    container.innerHTML = clients.map(c => `
        <div class="staff-item">
            <div style="flex:1;min-width:0;">
                <div class="staff-name">${c.first_name || c.username}</div>
                <div class="staff-type">@${c.username} • CPF: ${c.cpf || '—'} • Tel: ${c.telefone || '—'}</div>
                <div class="staff-type" style="color:var(--success);font-weight:600;">Saldo: R$ ${parseFloat(c.saldo).toFixed(2)}</div>
            </div>
            <div style="display:flex;gap:0.3rem;">
                <button class="btn-add-cart" onclick="viewTransactions(${c.id}, '${(c.first_name || c.username).replace(/'/g, "\\'")}')" title="Transações" style="background:var(--secondary);">📋</button>
                <button class="btn-add-cart" onclick="editClient(${c.id}, '${(c.first_name||'').replace(/'/g, "\\'")}', '${(c.email||'').replace(/'/g, "\\'")}', '${c.cpf||''}', '${c.telefone||''}')" title="Editar">✏️</button>
                <button class="btn-add-cart" onclick="deleteClient(${c.id})" style="background:var(--danger);" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');
}

function editClient(id, nome, email, cpf, telefone) {
    document.getElementById('c-id').value = id;
    document.getElementById('c-nome').value = nome;
    document.getElementById('c-email').value = email;
    document.getElementById('c-cpf').value = cpf;
    document.getElementById('c-telefone').value = telefone;
    openModal('modal-client');
}

async function saveClient(e) {
    e.preventDefault();
    const id = document.getElementById('c-id').value;
    try {
        await apiFetch(`/api/clients/${id}/update/`, {
            method: 'POST',
            body: JSON.stringify({
                first_name: document.getElementById('c-nome').value,
                email: document.getElementById('c-email').value,
                cpf: document.getElementById('c-cpf').value,
                telefone: document.getElementById('c-telefone').value,
            })
        });
        closeModal('modal-client');
        showToast('Cliente atualizado!');
        loadClients();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteClient(id) {
    if (!confirm('Excluir este cliente? Isso apagará o cartão e todas as transações dele.')) return;
    try {
        await apiFetch(`/api/clients/${id}/delete/`, { method: 'POST' });
        showToast('Cliente excluído!');
        loadClients();
    } catch (e) { showToast(e.message, 'error'); }
}

async function viewTransactions(clientId, clientName) {
    document.getElementById('txn-title').textContent = `Transações — ${clientName}`;
    document.getElementById('txn-list').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    document.getElementById('txn-saldo').innerHTML = '';
    openModal('modal-transactions');

    try {
        const data = await apiFetch(`/api/cards/client/${clientId}/transactions/`);
        document.getElementById('txn-saldo').innerHTML = `
            <div style="color:var(--success);font-size:1.5rem;font-weight:800;">R$ ${parseFloat(data.saldo).toFixed(2)}</div>
            <div style="color:var(--text-secondary);font-size:0.78rem;">Saldo Atual</div>
        `;
        if (!data.transactions.length) {
            document.getElementById('txn-list').innerHTML = '<div class="empty-state"><p>Nenhuma transação</p></div>';
            return;
        }
        const tipoColors = { deposito: 'var(--success)', pagamento: 'var(--primary)', retirada: 'var(--warning)' };
        const tipoIcons = { deposito: '💰', pagamento: '🛒', retirada: '↩️' };
        document.getElementById('txn-list').innerHTML = data.transactions.map(t => `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:0.6rem 0;border-bottom:1px solid var(--border);">
                <div style="flex:1;min-width:0;">
                    <div style="color:var(--text-primary);font-weight:600;font-size:0.88rem;">
                        ${tipoIcons[t.tipo] || ''} ${t.tipo_label}
                        <span style="color:var(--text-secondary);font-weight:400;font-size:0.75rem;margin-left:0.3rem;">${t.metodo_label}</span>
                    </div>
                    <div style="color:var(--text-secondary);font-size:0.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.descricao}</div>
                    <div style="color:var(--text-secondary);font-size:0.72rem;">${t.data}</div>
                </div>
                <div style="color:${tipoColors[t.tipo] || 'var(--text-primary)'};font-weight:700;font-size:0.9rem;white-space:nowrap;margin-left:0.5rem;">
                    ${t.tipo === 'deposito' ? '+' : '−'} R$ ${parseFloat(t.valor).toFixed(2)}
                </div>
            </div>
        `).join('');
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== Reports =====
async function loadReport(period, btn) {
    if (btn) {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    try {
        const data = await apiFetch(`/api/reports/sales/?period=${period}`);

        // Summary cards
        document.getElementById('report-summary').innerHTML = `
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <div class="surface-card" style="flex:1;text-align:center;margin:0;min-width:45%;">
                    <div style="color:var(--success);font-size:1.2rem;font-weight:800;">R$ ${parseFloat(data.total_vendas).toFixed(2)}</div>
                    <div style="color:var(--text-secondary);font-size:0.72rem;">Vendas (${data.total_pedidos} pedidos)</div>
                </div>
                <div class="surface-card" style="flex:1;text-align:center;margin:0;min-width:45%;">
                    <div style="color:var(--warning);font-size:1.2rem;font-weight:800;">R$ ${parseFloat(data.total_depositos).toFixed(2)}</div>
                    <div style="color:var(--text-secondary);font-size:0.72rem;">Depósitos (${data.total_depositos_count})</div>
                </div>
                <div class="surface-card" style="flex:1;text-align:center;margin:0;min-width:45%;">
                    <div style="color:var(--primary);font-size:1.2rem;font-weight:800;">R$ ${parseFloat(data.total_pagamentos_saldo).toFixed(2)}</div>
                    <div style="color:var(--text-secondary);font-size:0.72rem;">Pago via Saldo (${data.total_pagamentos_count})</div>
                </div>
                <div class="surface-card" style="flex:1;text-align:center;margin:0;min-width:45%;">
                    <div style="color:var(--text-secondary);font-size:1.2rem;font-weight:800;">R$ ${parseFloat(data.total_retiradas).toFixed(2)}</div>
                    <div style="color:var(--text-secondary);font-size:0.72rem;">Retiradas (${data.total_retiradas_count})</div>
                </div>
            </div>
        `;

        // Payment methods separated by origin
        let metodosHtml = '';
        if (data.depositos_app && data.depositos_app.count > 0) {
            metodosHtml += `
                <h3 style="color:var(--text-primary);font-size:0.9rem;margin:1rem 0 0.5rem;">📱 Depósitos via App (Total: R$ ${parseFloat(data.depositos_app.total).toFixed(2)})</h3>
                <table class="report-table" style="margin-bottom:1rem;">
                    <thead><tr><th>Método</th><th>Qtd</th><th>Total</th></tr></thead>
                    <tbody>${data.depositos_app.por_metodo.map(m => `
                        <tr><td>${m.metodo}</td><td>${m.count}</td><td style="color:var(--success);font-weight:600;">R$ ${parseFloat(m.total).toFixed(2)}</td></tr>
                    `).join('')}</tbody>
                </table>
            `;
        }
        if (data.depositos_caixa && data.depositos_caixa.count > 0) {
            metodosHtml += `
                <h3 style="color:var(--text-primary);font-size:0.9rem;margin:1rem 0 0.5rem;">🏪 Depósitos no Caixa (Total: R$ ${parseFloat(data.depositos_caixa.total).toFixed(2)})</h3>
                <table class="report-table">
                    <thead><tr><th>Método</th><th>Qtd</th><th>Total</th></tr></thead>
                    <tbody>${data.depositos_caixa.por_metodo.map(m => `
                        <tr><td>${m.metodo}</td><td>${m.count}</td><td style="color:var(--success);font-weight:600;">R$ ${parseFloat(m.total).toFixed(2)}</td></tr>
                    `).join('')}</tbody>
                </table>
            `;
        }
        document.getElementById('report-metodos').innerHTML = metodosHtml;

        // Daily breakdown
        if (data.daily && data.daily.length) {
            document.getElementById('report-daily').innerHTML = `
                <h3 style="color:var(--text-primary);font-size:0.9rem;margin:1rem 0 0.5rem;">📅 Vendas por Dia</h3>
                <table class="report-table">
                    <thead><tr><th>Data</th><th>Pedidos</th><th>Total</th></tr></thead>
                    <tbody>${data.daily.map(d => `
                        <tr><td>${d.dia}</td><td>${d.pedidos}</td><td>R$ ${parseFloat(d.total).toFixed(2)}</td></tr>
                    `).join('')}</tbody>
                </table>
            `;
        } else {
            document.getElementById('report-daily').innerHTML = '';
        }

        // Top products
        if (data.top_products.length) {
            document.getElementById('report-top-products').innerHTML = `
                <h3 style="color:var(--text-primary);font-size:0.9rem;margin:1rem 0 0.5rem;">🏆 Mais Vendidos</h3>
                <table class="report-table">
                    <thead><tr><th>Produto</th><th>Qtd</th><th>Total</th></tr></thead>
                    <tbody>${data.top_products.map(p => `
                        <tr><td>${p.nome}</td><td>${p.quantidade}</td><td>R$ ${parseFloat(p.valor).toFixed(2)}</td></tr>
                    `).join('')}</tbody>
                </table>
            `;
        } else {
            document.getElementById('report-top-products').innerHTML = '<div class="empty-state"><p>Sem vendas neste período</p></div>';
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== My Profile =====
async function openMyProfile() {
    try {
        const data = await apiFetch('/api/profile/');
        const p = data.profile;
        document.getElementById('pf-nome').value = p.first_name || '';
        document.getElementById('pf-username').value = p.username || '';
        document.getElementById('pf-email').value = p.email || '';
        document.getElementById('pf-cpf').value = p.cpf || '';
        document.getElementById('pf-password').value = '';
        openModal('modal-profile');
    } catch (e) { showToast(e.message, 'error'); }
}

async function saveProfile(e) {
    e.preventDefault();
    const body = {
        first_name: document.getElementById('pf-nome').value,
        username: document.getElementById('pf-username').value,
        email: document.getElementById('pf-email').value,
        cpf: document.getElementById('pf-cpf').value,
    };
    const pw = document.getElementById('pf-password').value;
    if (pw) body.password = pw;
    try {
        await apiFetch('/api/profile/update/', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        closeModal('modal-profile');
        showToast('Perfil atualizado! Recarregando...');
        setTimeout(() => location.reload(), 1000);
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== All Transactions =====
let txnDebounce = null;

async function loadAllTransactions() {
    clearTimeout(txnDebounce);
    txnDebounce = setTimeout(async () => {
        const date = document.getElementById('txn-date-filter').value;
        const search = document.getElementById('txn-search').value.trim();
        const container = document.getElementById('all-transactions-list');
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const params = new URLSearchParams();
            if (date) params.append('date', date);
            if (search) params.append('search', search);
            const data = await apiFetch(`/api/reports/transactions/?${params}`);

            if (!data.transactions.length) {
                container.innerHTML = '<div class="empty-state"><div class="icon">🧾</div><p>Nenhuma transação encontrada</p></div>';
                return;
            }

            container.innerHTML = data.transactions.map(t => {
                const produtosHtml = t.produtos.length
                    ? `<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;background:var(--bg-dark);border-radius:8px;">
                        ${t.produtos.map(p => `<div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:0.15rem 0;">
                            <span style="color:var(--text-primary);">${p.quantidade}x ${p.nome}</span>
                            <span style="color:var(--text-secondary);">R$ ${parseFloat(p.subtotal).toFixed(2)}</span>
                        </div>`).join('')}
                       </div>`
                    : '';

                return `
                <div style="padding:0.8rem 0;border-bottom:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div style="flex:1;min-width:0;">
                            <div style="color:var(--text-primary);font-weight:700;font-size:0.9rem;">
                                🛒 Transação #${t.id}
                            </div>
                            <div style="color:var(--text-secondary);font-size:0.78rem;margin-top:0.2rem;">
                                👤 Vendedor: <span style="color:var(--text-primary);font-weight:600;">${t.vendedor}</span>
                            </div>
                            <div style="color:var(--text-secondary);font-size:0.78rem;">
                                🧑 Cliente: <span style="color:var(--text-primary);">${t.nome_cliente || '—'}</span>
                                ${t.cpf_cliente ? ` • CPF: <span style="color:var(--text-primary);">${t.cpf_cliente}</span>` : ''}
                            </div>
                            <div style="color:var(--text-secondary);font-size:0.75rem;">
                                📅 ${t.data}
                            </div>
                        </div>
                        <div style="color:var(--success);font-weight:800;font-size:1rem;white-space:nowrap;margin-left:0.5rem;">
                            R$ ${parseFloat(t.valor).toFixed(2)}
                        </div>
                    </div>
                    ${produtosHtml}
                </div>`;
            }).join('');
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${e.message}</p></div>`;
        }
    }, 300);
}

// Init
document.getElementById('txn-date-filter').value = new Date().toISOString().slice(0, 10);
loadProducts();

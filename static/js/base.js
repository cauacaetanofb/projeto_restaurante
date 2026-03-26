function getCookie(name) {
    let val = null;
    document.cookie.split(';').forEach(c => {
        c = c.trim();
        if (c.startsWith(name + '=')) val = decodeURIComponent(c.substring(name.length + 1));
    });
    return val;
}
const csrftoken = getCookie('csrftoken');

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.className = 'toast', 3000);
}

async function apiFetch(url, options = {}) {
    const defaults = {
        headers: {
            'X-CSRFToken': csrftoken,
        },
        credentials: 'same-origin',
    };
    if (options.body && !(options.body instanceof FormData)) {
        defaults.headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Erro na requisição');
    }
    return data;
}

// ========= PWA: Service Worker + Install Prompt =========

// Registra o Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registrado:', reg.scope))
        .catch(err => console.log('SW falhou:', err));
}

// Captura o evento de instalação do navegador
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o mini-banner padrão do Chrome
    e.preventDefault();
    // Guarda o evento para usar depois
    deferredPrompt = e;
});

// Função chamada quando o usuário clica no botão "Instale o app"
function installApp() {
    if (!deferredPrompt) {
        // Fallback para navegadores que não suportam o prompt nativo
        showToast('Abra o menu do navegador e toque em "Adicionar à tela inicial"');
        return;
    }
    // Dispara o prompt nativo de instalação
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(result => {
        if (result.outcome === 'accepted') {
            showToast('App instalado com sucesso! 🎉');
        }
        deferredPrompt = null;
        const banner = document.getElementById('install-banner');
        if (banner) banner.style.display = 'none';
    });
}

// Esconde o botão se o app já estiver instalado (modo standalone)
window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('install-banner');
    if (banner) banner.style.display = 'none';
    deferredPrompt = null;
});

// Se já está rodando como app instalado, esconde o botão
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.getElementById('install-banner');
        if (banner) banner.style.display = 'none';
    });
}

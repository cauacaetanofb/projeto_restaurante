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

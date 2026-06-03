import { api, fmt, STATUS_PROJ } from './api.js';

// ── Estado global ─────────────────────────────────────────────
const state = {
  usuario: JSON.parse(localStorage.getItem('hw_usuario') || 'null'),
  paginaAtual: null,
};

// ── Toast ─────────────────────────────────────────────────────
export function toast(msg, tipo = 'default', duracao = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), duracao);
}

// ── Loading overlay ───────────────────────────────────────────
export function setLoading(show) {
  let overlay = document.getElementById('loading-overlay');
  if (show && !overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
  } else if (!show && overlay) {
    overlay.remove();
  }
}

// ── Modal helper ──────────────────────────────────────────────
export function abrirModal(titulo, htmlCorpo, onConfirm, labelConfirm = 'Salvar') {
  const existing = document.getElementById('modal-global');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'modal-global';
  backdrop.className = 'modal-backdrop no-print';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">${titulo}</h2>
        <button class="modal-close" aria-label="Fechar"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">${htmlCorpo}</div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-cancel">Cancelar</button>
        ${onConfirm ? `<button class="btn btn-primary btn-confirm">${labelConfirm}</button>` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const fechar = () => backdrop.remove();
  backdrop.querySelector('.modal-close').onclick = fechar;
  backdrop.querySelector('.btn-cancel').onclick = fechar;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) fechar(); });

  if (onConfirm) {
    backdrop.querySelector('.btn-confirm').onclick = async () => {
      await onConfirm(backdrop.querySelector('.modal-body'));
    };
  }

  // Focar primeiro input
  setTimeout(() => {
    const primeiro = backdrop.querySelector('input, select, textarea');
    if (primeiro) primeiro.focus();
  }, 50);

  return backdrop;
}

export function fecharModal() {
  const m = document.getElementById('modal-global');
  if (m) m.remove();
}

// ── CEP Autopreenchimento ─────────────────────────────────────
export async function autopreencherCep(cepInput, form) {
  const cep = cepInput.value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const data = await api.cep(cep);
    if (data) {
      if (form.querySelector('[name="logradouro"]')) form.querySelector('[name="logradouro"]').value = data.logradouro || '';
      if (form.querySelector('[name="bairro"]'))    form.querySelector('[name="bairro"]').value    = data.bairro    || '';
      if (form.querySelector('[name="cidade"]'))    form.querySelector('[name="cidade"]').value    = data.localidade || '';
      if (form.querySelector('[name="uf"]'))        form.querySelector('[name="uf"]').value        = data.uf        || '';
      toast('Endereço preenchido automaticamente', 'success');
    }
  } catch {
    // CEP não encontrado — silencioso
  }
}

// ── Router client-side ────────────────────────────────────────
const rotas = {};

export function registrarRota(hash, fn) {
  rotas[hash] = fn;
}

async function rotear() {
  const hash = location.hash || '#/';

  // Se não logado → redirecionar para login
  if (!state.usuario && hash !== '#/login') {
    location.hash = '#/login';
    return;
  }

  // Encontrar rota correspondente (suporta parâmetros: #/projetos/123)
  let handler = null;
  let params = {};

  for (const [pattern, fn] of Object.entries(rotas)) {
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
    const match = hash.match(regex);
    if (match) {
      handler = fn;
      const keys = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
      keys.forEach((k, i) => params[k] = match[i + 1]);
      break;
    }
  }

  const main = document.getElementById('main-content');
  if (!main) return;

  if (handler) {
    main.innerHTML = '<div class="loading-overlay" style="position:relative;min-height:200px;"><div class="spinner"></div></div>';
    try {
      await handler(params, main);
    } catch (err) {
      main.innerHTML = `<div class="empty-state"><p class="empty-title">Erro ao carregar</p><p class="empty-sub">${err.message}</p></div>`;
      toast(err.message, 'error');
    }
  } else {
    main.innerHTML = '<div class="empty-state"><p class="empty-title">Página não encontrada</p></div>';
  }

  // Atualizar ícone ativo na sidebar
  document.querySelectorAll('.sidebar-icon[data-rota]').forEach(el => {
    el.classList.toggle('active', hash.startsWith(el.dataset.rota));
  });
}

window.addEventListener('hashchange', rotear);

// ── Sidebar HTML ──────────────────────────────────────────────
function renderSidebar() {
  return `
    <nav class="sidebar" aria-label="Menu principal">
      <div class="sidebar-brand">H</div>
      <a class="sidebar-icon" data-rota="#/" href="#/" title="Dashboard" aria-label="Dashboard">
        <i class="ti ti-layout-dashboard" aria-hidden="true"></i>
      </a>
      <a class="sidebar-icon" data-rota="#/clientes" href="#/clientes" title="Clientes" aria-label="Clientes">
        <i class="ti ti-users" aria-hidden="true"></i>
      </a>
      <a class="sidebar-icon" data-rota="#/projetos" href="#/projetos" title="Projetos" aria-label="Projetos">
        <i class="ti ti-briefcase" aria-hidden="true"></i>
      </a>
      <a class="sidebar-icon" data-rota="#/bens" href="#/bens" title="Bens" aria-label="Bens">
        <i class="ti ti-building-estate" aria-hidden="true"></i>
      </a>
      <div class="sidebar-divider"></div>
      <a class="sidebar-icon" data-rota="#/documentos" href="#/documentos" title="Documentos" aria-label="Documentos">
        <i class="ti ti-file-text" aria-hidden="true"></i>
      </a>
      <a class="sidebar-icon" data-rota="#/honorarios" href="#/honorarios" title="Honorários" aria-label="Honorários">
        <i class="ti ti-receipt" aria-hidden="true"></i>
      </a>
      <div class="sidebar-divider"></div>
      <a class="sidebar-icon mt-auto" data-rota="#/config" href="#/config" title="Configurações" aria-label="Configurações">
        <i class="ti ti-settings" aria-hidden="true"></i>
      </a>
    </nav>
  `;
}

// ── Topbar HTML ───────────────────────────────────────────────
function renderTopbar(titulo = 'Holding Web', breadcrumb = '') {
  const iniciais = (state.usuario?.nome || 'TS').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  return `
    <header class="topbar no-print">
      <div class="topbar-left">
        <h1 class="topbar-title">${titulo}</h1>
        ${breadcrumb ? `<span class="topbar-breadcrumb">${breadcrumb}</span>` : ''}
      </div>
      <div class="topbar-right">
        <slot name="topbar-actions"></slot>
        <div class="user-avatar" title="${state.usuario?.nome || ''}">${iniciais}</div>
      </div>
    </header>
  `;
}

// ── Shell da aplicação ────────────────────────────────────────
function renderShell() {
  document.body.innerHTML = `
    <div class="app-layout">
      ${renderSidebar()}
      <div class="app-content">
        <div id="topbar-slot"></div>
        <main id="main-content" class="page-content"></main>
      </div>
    </div>
    <div id="toast-container" aria-live="polite"></div>
  `;
}

// ── Utilitário para montar topbar na página ───────────────────
export function setTopbar(titulo, breadcrumb = '', acoesHtml = '') {
  const slot = document.getElementById('topbar-slot');
  if (!slot) return;
  slot.innerHTML = `
    <header class="topbar no-print">
      <div class="topbar-left">
        <h1 class="topbar-title">${titulo}</h1>
        ${breadcrumb ? `<span class="topbar-breadcrumb">${breadcrumb}</span>` : ''}
      </div>
      <div class="topbar-right">
        ${acoesHtml}
        <div class="user-avatar" title="${state.usuario?.nome || ''}">
          ${(state.usuario?.nome || 'TS').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  `;
}

// ── Inicialização ─────────────────────────────────────────────
async function init() {
  // Verificar se logado
  if (!state.usuario) {
    await renderLogin();
    return;
  }

  renderShell();

  // Carregar módulos dinamicamente
  const [dash, clientes, projetos] = await Promise.all([
    import('./dashboard.js'),
    import('./clientes.js'),
    import('./projetos.js'),
  ]);

  dash.registrar();
  clientes.registrar();
  projetos.registrar();

  rotear();
}

// ── Tela de Login ─────────────────────────────────────────────
async function renderLogin() {
  document.body.innerHTML = `
    <div id="toast-container" aria-live="polite"></div>
    <div style="display:flex;height:100vh;font-family:'Lato',sans-serif;">
      <!-- Lado esquerdo - Brand -->
      <div style="flex:1;background:#1F4470;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:40px;gap:24px;">
        <div style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:42px;color:white;letter-spacing:-2px;">
          Holding<span style="color:#94B6DF;">.</span>Web
        </div>
        <div style="font-family:'Oswald',sans-serif;font-weight:300;font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;text-align:center;">
          Thiago Seixas · Advocacia Societária
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);">
            <div style="width:9px;height:9px;border-radius:50%;background:#2E7D32;"></div>
            <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;">DESTINO</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);">
            <div style="width:9px;height:9px;border-radius:50%;background:#1565C0;"></div>
            <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;">COFRE</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);">
            <div style="width:9px;height:9px;border-radius:50%;background:#6A1B9A;"></div>
            <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;">VEÍCULO</span>
          </div>
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.3);text-align:center;max-width:280px;line-height:1.6;margin-top:8px;">
          Sistema jurídico para gestão completa de Holdings Familiares no Modelo de 3 Células
        </div>
      </div>

      <!-- Lado direito - Form -->
      <div style="width:360px;background:white;display:flex;flex-direction:column;justify-content:center;padding:48px 40px;gap:24px;">
        <div>
          <h2 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;color:#1F4470;">Bem-vindo</h2>
          <p style="font-size:13px;color:#8B9FB4;margin-top:6px;">Acesse com suas credenciais</p>
        </div>

        <form id="form-login" style="display:flex;flex-direction:column;gap:18px;">
          <div class="form-group">
            <label class="form-label" for="inp-email">E-mail</label>
            <input id="inp-email" class="form-input" type="email" name="email"
              placeholder="contato@thiagoseixas.adv.br"
              value="contato@thiagoseixas.adv.br" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="inp-senha">Senha</label>
            <input id="inp-senha" class="form-input" type="password" name="senha"
              placeholder="••••••••" autocomplete="current-password" />
          </div>
          <div id="login-erro" style="color:#c62828;font-size:13px;display:none;"></div>
          <button type="submit" class="btn btn-primary btn-lg w-full">
            Entrar no Sistema
          </button>
        </form>

        <p style="font-size:11px;color:#B9A28A;text-align:center;line-height:1.5;">
          Holding Web v1.0 · OAB/SP 249.179<br>
          Vargem Grande do Sul · SP
        </p>
      </div>
    </div>
  `;

  // Importar CSS
  document.querySelectorAll('link[data-css]').forEach(l => l.removeAttribute('disabled'));

  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const email = e.target.email.value;
    const senha = e.target.senha.value;
    const erroEl = document.getElementById('login-erro');
    const btn = e.target.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Entrando...';
    erroEl.style.display = 'none';

    try {
      const res = await api.login(email, senha);
      if (res) {
        localStorage.setItem('hw_token', res.token);
        localStorage.setItem('hw_usuario', JSON.stringify(res.usuario));
        state.usuario = res.usuario;
        await init();
      }
    } catch (err) {
      erroEl.textContent = err.message || 'Credenciais inválidas';
      erroEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Entrar no Sistema';
    }
  });
}

// ── Registrar rota de login e logout ─────────────────────────
registrarRota('#/login', async () => {
  state.usuario = null;
  localStorage.removeItem('hw_token');
  localStorage.removeItem('hw_usuario');
  await renderLogin();
});

// Iniciar
init();

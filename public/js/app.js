import { api, fmt } from './api.js';

const state = {
  usuario: JSON.parse(localStorage.getItem('hw_usuario') || 'null'),
};

// ── SVG Icons ─────────────────────────────────────────────────
const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  users:     `<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>`,
  briefcase: `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>`,
  building:  `<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/></svg>`,
  file:      `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  receipt:   `<svg viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="11" y2="17"/></svg>`,
  settings:  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  logout:    `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  plus:      `<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  chevron:   `<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`,
  check:     `<svg viewBox="0 0 24 24"><polyline points="20 6 9 13 4 10"/></svg>`,
  x:         `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  search:    `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  edit:      `<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
};

// ── Máscaras ──────────────────────────────────────────────────
export function aplicarMascaras(container) {
  container.querySelectorAll('[data-mask]').forEach(el => {
    const tipo = el.dataset.mask;
    if (tipo === 'cpf') {
      IMask(el, { mask: '000.000.000-00' });
    } else if (tipo === 'cnpj') {
      IMask(el, { mask: '00.000.000/0000-00' });
    } else if (tipo === 'cep') {
      IMask(el, { mask: '00000-000' });
    } else if (tipo === 'fone') {
      IMask(el, { mask: [{ mask: '(00) 0000-0000' }, { mask: '(00) 00000-0000' }] });
    } else if (tipo === 'moeda') {
      IMask(el, {
        mask: Number,
        scale: 2, thousandsSeparator: '.', padFractionalZeros: true,
        normalizeZeros: true, radix: ',', mapToRadix: ['.'],
        min: 0, max: 999999999
      });
    } else if (tipo === 'data') {
      IMask(el, { mask: Date, pattern: 'd/`m/`Y', lazy: false });
    }
  });
}

// ── Toast ─────────────────────────────────────────────────────
export function toast(msg, tipo = 'default', dur = 3000) {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), dur);
}

// ── Modal ─────────────────────────────────────────────────────
export function abrirModal(titulo, corpo, onConfirm, labelConfirm = 'Salvar') {
  document.getElementById('modal-global')?.remove();
  const bd = document.createElement('div');
  bd.id = 'modal-global';
  bd.className = 'modal-backdrop';
  bd.innerHTML = `
    <div class="modal" role="dialog">
      <div class="modal-header">
        <h2 class="modal-title">${titulo}</h2>
        <button class="modal-close">${ICONS.x}</button>
      </div>
      <div class="modal-body">${corpo}</div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-cancel">Cancelar</button>
        ${onConfirm ? `<button class="btn btn-primary btn-confirm">${labelConfirm}</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(bd);
  aplicarMascaras(bd);
  const fechar = () => bd.remove();
  bd.querySelector('.modal-close').onclick = fechar;
  bd.querySelector('.btn-cancel').onclick = fechar;
  bd.addEventListener('click', e => { if (e.target === bd) fechar(); });
  if (onConfirm) bd.querySelector('.btn-confirm').onclick = () => onConfirm(bd.querySelector('.modal-body'));
  setTimeout(() => bd.querySelector('input,select,textarea')?.focus(), 50);
  return bd;
}

export function fecharModal() { document.getElementById('modal-global')?.remove(); }

// ── CEP auto ─────────────────────────────────────────────────
export async function autopreencherCep(cepInput, form) {
  const cep = cepInput.value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const d = await api.cep(cep);
    if (d) {
      const set = (n, v) => { const el = form.querySelector(`[name="${n}"]`); if (el) el.value = v || ''; };
      set('logradouro', d.logradouro); set('bairro', d.bairro);
      set('cidade', d.localidade);    set('uf', d.uf);
      toast('Endereço preenchido!', 'success');
    }
  } catch {}
}

// ── Router ────────────────────────────────────────────────────
const rotas = {};
export function registrarRota(hash, fn) { rotas[hash] = fn; }

async function rotear() {
  const hash = location.hash || '#/';
  if (!state.usuario && hash !== '#/login') { location.hash = '#/login'; return; }

  let handler = null, params = {};
  for (const [pat, fn] of Object.entries(rotas)) {
    const re = new RegExp('^' + pat.replace(/:[^/]+/g, '([^/]+)') + '$');
    const m = hash.match(re);
    if (m) {
      handler = fn; params = {};
      [...pat.matchAll(/:([^/]+)/g)].forEach((k, i) => params[k[1]] = m[i+1]);
      break;
    }
  }

  const main = document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;"><div class="spinner"></div></div>`;
  try {
    if (handler) await handler(params, main);
    else main.innerHTML = '<div class="empty-state"><p class="empty-title">Página não encontrada</p></div>';
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><p class="empty-title">Erro ao carregar</p><p class="empty-sub">${err.message}</p></div>`;
    toast(err.message, 'error');
  }

  document.querySelectorAll('.sidebar-icon[data-rota]').forEach(el => {
    el.classList.toggle('active', hash.startsWith(el.dataset.rota));
  });
}

window.addEventListener('hashchange', rotear);

// ── Topbar ────────────────────────────────────────────────────
export function setTopbar(titulo, breadcrumb = '', acoesHtml = '') {
  const slot = document.getElementById('topbar-slot');
  if (!slot) return;
  const ini = (state.usuario?.nome || 'TS').split(' ').map(p => p[0]).join('').substring(0,2).toUpperCase();
  slot.innerHTML = `
    <header class="topbar no-print">
      <div class="topbar-left">
        <h1 class="topbar-title">${titulo}</h1>
        ${breadcrumb ? `<span class="topbar-breadcrumb">${breadcrumb}</span>` : ''}
      </div>
      <div class="topbar-right">
        ${acoesHtml}
        <div class="user-avatar" title="${state.usuario?.nome || ''}">${ini}</div>
      </div>
    </header>`;
}

// ── Shell ─────────────────────────────────────────────────────
function renderShell() {
  document.body.innerHTML = `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="sidebar-brand">H</div>
        <a class="sidebar-icon" data-rota="#/" href="#/" title="Dashboard">${ICONS.dashboard}</a>
        <a class="sidebar-icon" data-rota="#/clientes" href="#/clientes" title="Clientes">${ICONS.users}</a>
        <a class="sidebar-icon" data-rota="#/projetos" href="#/projetos" title="Projetos">${ICONS.briefcase}</a>
        <a class="sidebar-icon" data-rota="#/bens" href="#/bens" title="Bens">${ICONS.building}</a>
        <div class="sidebar-divider"></div>
        <a class="sidebar-icon" data-rota="#/documentos" href="#/documentos" title="Documentos">${ICONS.file}</a>
        <a class="sidebar-icon" data-rota="#/honorarios" href="#/honorarios" title="Honorários">${ICONS.receipt}</a>
        <div class="sidebar-divider"></div>
        <a class="sidebar-icon" style="margin-top:auto;" href="#/login" title="Sair" onclick="logout()">${ICONS.logout}</a>
      </nav>
      <div class="app-content">
        <div id="topbar-slot"></div>
        <main id="main-content" class="page-content"></main>
      </div>
    </div>
    <div id="toast-container"></div>`;

  window.logout = () => {
    localStorage.removeItem('hw_token');
    localStorage.removeItem('hw_usuario');
    location.hash = '#/login';
    location.reload();
  };
}

// ── Login ─────────────────────────────────────────────────────
async function renderLogin() {
  document.body.innerHTML = `
    <div id="toast-container"></div>
    <div style="display:flex;height:100vh;">
      <div style="flex:1;background:#1F4470;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:40px;gap:20px;">
        <div style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:42px;color:white;letter-spacing:-2px;">Holding<span style="color:#94B6DF;">.</span>Web</div>
        <div style="font-family:'Oswald',sans-serif;font-weight:300;font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;">Thiago Seixas · Advocacia Societária</div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          ${['DESTINO','COFRE','VEÍCULO'].map((l,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);"><div style="width:8px;height:8px;border-radius:50%;background:${['#2E7D32','#1565C0','#6A1B9A'][i]};"></div><span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;">${l}</span></div>`).join('')}
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.3);text-align:center;max-width:280px;line-height:1.6;margin-top:8px;">Sistema jurídico para gestão completa de Holdings Familiares no Modelo de 3 Células</div>
      </div>
      <div style="width:360px;background:white;display:flex;flex-direction:column;justify-content:center;padding:48px 40px;gap:24px;">
        <div>
          <h2 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;color:#1F4470;">Bem-vindo</h2>
          <p style="font-size:13px;color:#8B9FB4;margin-top:6px;">Acesse com suas credenciais</p>
        </div>
        <form id="form-login" style="display:flex;flex-direction:column;gap:18px;">
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input class="form-input" type="email" name="email" value="contato@thiagoseixas.adv.br" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Senha</label>
            <input class="form-input" type="password" name="senha" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <div id="login-erro" style="color:#c62828;font-size:13px;display:none;"></div>
          <button type="submit" class="btn btn-primary btn-lg w-full">Entrar no Sistema</button>
        </form>
        <p style="font-size:11px;color:#B9A28A;text-align:center;">Holding Web v1.0 · OAB/SP 249.179<br>Vargem Grande do Sul · SP</p>
      </div>
    </div>`;

  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const erroEl = document.getElementById('login-erro');
    btn.disabled = true; btn.textContent = 'Entrando...';
    erroEl.style.display = 'none';
    try {
      const res = await api.login(e.target.email.value, e.target.senha.value);
      if (res) {
        localStorage.setItem('hw_token', res.token);
        localStorage.setItem('hw_usuario', JSON.stringify(res.usuario));
        state.usuario = res.usuario;
        await init();
      }
    } catch (err) {
      erroEl.textContent = err.message || 'Credenciais inválidas';
      erroEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Entrar no Sistema';
    }
  });
}

registrarRota('#/login', async () => {
  state.usuario = null;
  localStorage.removeItem('hw_token');
  localStorage.removeItem('hw_usuario');
  await renderLogin();
});

// ── Init ──────────────────────────────────────────────────────
async function init() {
  if (!state.usuario) { await renderLogin(); return; }
  renderShell();
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

init();

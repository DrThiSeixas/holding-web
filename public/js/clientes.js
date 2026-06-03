import { registrarRota, setTopbar, abrirModal, fecharModal, toast, autopreencherCep, aplicarMascaras } from './app.js';
import { api, fmt, ESTADO_CIVIL, REGIME_BENS } from './api.js';

export function registrar() {
  registrarRota('#/clientes',      renderLista);
  registrarRota('#/clientes/novo', renderNovo);
  registrarRota('#/clientes/:id',  renderFicha);
}

// ── LISTA ─────────────────────────────────────────────────────
async function renderLista(params, main) {
  setTopbar('Clientes', '', `<button class="btn btn-primary btn-sm" onclick="location.hash='#/clientes/novo'">+ Novo Cliente</button>`);
  let pagina = 1, busca = '';

  const render = async () => {
    const data = await api.clientes.listar(busca, pagina);
    main.querySelector('#lista-clientes').innerHTML = data.dados.length === 0
      ? `<div class="empty-state">
           <p class="empty-title">Nenhum cliente encontrado</p>
           <button class="btn btn-primary" onclick="location.hash='#/clientes/novo'">+ Novo Cliente</button>
         </div>`
      : data.dados.map(rowHtml).join('');
  };

  main.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Clientes Cadastrados</span>
        <input class="search-bar" id="busca-cliente" type="search" placeholder="Buscar por nome ou CPF..." />
      </div>
      <div id="lista-clientes"><div style="display:flex;justify-content:center;padding:40px;"><div class="spinner"></div></div></div>
    </div>`;

  main.querySelector('#busca-cliente').addEventListener('input', e => {
    busca = e.target.value; pagina = 1;
    clearTimeout(main._t); main._t = setTimeout(render, 350);
  });
  await render();
}

function rowHtml(c) {
  const ini = c.nome.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase();
  const ec = ESTADO_CIVIL[c.estado_civil] || '—';
  return `
    <div class="list-row" onclick="location.hash='#/clientes/${c.id}'" role="button" tabindex="0">
      <div class="avatar">${ini}</div>
      <div class="item-info">
        <div class="item-name">${c.nome}</div>
        <div class="item-sub">${fmt(c.cpf,'cpf')} · ${ec} · ${c.cidade||''}${c.uf?'/'+c.uf:''}</div>
      </div>
      <div style="font-size:12px;color:#8B9FB4;">${c.celular||''}</div>
    </div>`;
}

// ── FICHA ─────────────────────────────────────────────────────
async function renderFicha(params, main) {
  const { id } = params;
  const c = await api.clientes.buscar(id);
  setTopbar(c.nome, `Clientes · ${fmt(c.cpf,'cpf')}`,
    `<button class="btn btn-secondary btn-sm" onclick="window._editarCliente()">✏️ Editar</button>
     <button class="btn btn-primary btn-sm" onclick="location.hash='#/projetos/novo?pessoa=${id}'">+ Projeto</button>`);

  const ec = ESTADO_CIVIL[c.estado_civil] || '—';
  const rb = c.regime_bens !== null && c.regime_bens !== undefined ? REGIME_BENS[c.regime_bens] : null;

  main.innerHTML = `
    <div style="display:flex;gap:16px;">
      <div style="width:200px;flex-shrink:0;display:flex;flex-direction:column;gap:12px;">
        <div class="card" style="padding:20px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;">
          <div class="avatar" style="width:56px;height:56px;font-size:18px;">${c.nome.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase()}</div>
          <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:13px;color:#1F4470;">${c.nome}</div>
          <div style="font-size:11px;color:#8B9FB4;">${fmt(c.cpf,'cpf')}</div>
        </div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:12px;">
        <div class="card">
          <div class="card-header"><span class="card-header-title">Dados Pessoais</span></div>
          <div class="field-grid">
            ${campo('Nome', c.nome)}${campo('CPF', fmt(c.cpf,'cpf'))}
            ${campo('Data de Nascimento', c.data_nascimento ? fmt(c.data_nascimento,'data') : null)}
            ${campo('Profissão', c.profissao)}${campo('Estado Civil', ec)}
            ${rb ? campo('Regime de Bens', rb) : ''}
            ${campo('Celular', c.celular)}${campo('E-mail', c.email)}
            ${campo('WhatsApp', c.whatsapp)}
            ${campo('Endereço', c.logradouro ? `${c.logradouro}, ${c.numero||'s/n'} — ${c.bairro} · ${c.cidade}/${c.uf} · CEP ${c.cep}` : null)}
          </div>
        </div>
        ${c.projetos?.length ? `
          <div class="card">
            <div class="card-header"><span class="card-header-title">Projetos</span></div>
            ${c.projetos.map(p=>`
              <div class="list-row" onclick="location.hash='#/projetos/${p.id}'" role="button" tabindex="0">
                <div class="item-info">
                  <div class="item-name">Família ${p.nome_familia}</div>
                  <div class="item-sub">${p.codigo}</div>
                </div>
                <span class="badge badge-${p.status}">${['Captação','Diagnóstico','Proposta','Contratado','Em Execução','Concluído','Cancelado'][p.status]||'—'}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>
    </div>`;

  window._editarCliente = () => {
    const modal = abrirModal('Editar Cliente', formHtml(c), async (body) => {
      const dados = coletarForm(body.querySelector('form'));
      try {
        await api.clientes.atualizar(id, dados);
        toast('Salvo!', 'success');
        fecharModal();
        renderFicha(params, main);
      } catch (err) { toast(err.message, 'error'); }
    });
    configurarCep(modal);
  };
}

function campo(label, valor) {
  return `<div class="field-item"><div class="field-label">${label}</div><div class="field-value ${!valor?'field-empty':''}">${valor||'—'}</div></div>`;
}

// ── NOVO ──────────────────────────────────────────────────────
async function renderNovo(params, main) {
  setTopbar('Novo Cliente', 'Clientes');
  main.innerHTML = `
    <div class="card" style="max-width:720px;">
      <div class="card-header"><span class="card-header-title">Cadastrar Pessoa Física</span></div>
      <div class="card-body">
        ${formHtml()}
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-ghost" onclick="history.back()">Cancelar</button>
          <button class="btn btn-primary" id="btn-salvar">Salvar Cliente</button>
        </div>
      </div>
    </div>`;
  aplicarMascaras(main);
  configurarCep(main);
  document.getElementById('btn-salvar').onclick = async () => {
    const dados = coletarForm(main.querySelector('form'));
    if (!dados.nome || !dados.cpf) { toast('Nome e CPF obrigatórios', 'error'); return; }
    try {
      const novo = await api.clientes.criar(dados);
      toast('Cliente cadastrado!', 'success');
      location.hash = `#/clientes/${novo.id}`;
    } catch (err) { toast(err.message, 'error'); }
  };
}

function formHtml(c = {}) {
  const ec = ESTADO_CIVIL.map((e,i)=>`<option value="${i}" ${c.estado_civil==i?'selected':''}>${e}</option>`).join('');
  const rb = REGIME_BENS.map((r,i)=>`<option value="${i}" ${c.regime_bens==i?'selected':''}>${r}</option>`).join('');
  return `<form id="form-cliente" autocomplete="off">
    <div class="section-title">Identificação</div>
    <div class="form-grid" style="margin-bottom:20px;">
      <div class="form-group col-span-2"><label class="form-label required">Nome Completo</label>
        <input class="form-input" name="nome" value="${c.nome||''}" placeholder="Nome completo" /></div>
      <div class="form-group"><label class="form-label required">CPF</label>
        <input class="form-input" name="cpf" value="${c.cpf||''}" placeholder="000.000.000-00" data-mask="cpf" /></div>
      <div class="form-group"><label class="form-label">Data de Nascimento</label>
        <input class="form-input" name="data_nascimento" type="date" value="${c.data_nascimento?c.data_nascimento.slice(0,10):''}" /></div>
      <div class="form-group"><label class="form-label">RG</label>
        <input class="form-input" name="rg" value="${c.rg||''}" placeholder="Número do RG" /></div>
      <div class="form-group"><label class="form-label">Profissão</label>
        <input class="form-input" name="profissao" value="${c.profissao||''}" placeholder="Empresário, Médico..." /></div>
    </div>
    <div class="section-title">Estado Civil</div>
    <div class="form-grid" style="margin-bottom:20px;">
      <div class="form-group"><label class="form-label">Estado Civil</label>
        <select class="form-select" name="estado_civil">${ec}</select></div>
      <div class="form-group"><label class="form-label">Regime de Bens</label>
        <select class="form-select" name="regime_bens"><option value="">— não aplicável —</option>${rb}</select></div>
    </div>
    <div class="section-title">Endereço</div>
    <div class="form-grid" style="margin-bottom:20px;">
      <div class="form-group"><label class="form-label">CEP</label>
        <input class="form-input" name="cep" id="inp-cep" value="${c.cep||''}" placeholder="00000-000" data-mask="cep" /></div>
      <div class="form-group col-span-2" style="grid-column:2/4"><label class="form-label">Logradouro</label>
        <input class="form-input" name="logradouro" value="${c.logradouro||''}" /></div>
      <div class="form-group"><label class="form-label">Número</label>
        <input class="form-input" name="numero" value="${c.numero||''}" /></div>
      <div class="form-group"><label class="form-label">Complemento</label>
        <input class="form-input" name="complemento" value="${c.complemento||''}" /></div>
      <div class="form-group"><label class="form-label">Bairro</label>
        <input class="form-input" name="bairro" value="${c.bairro||''}" /></div>
      <div class="form-group"><label class="form-label">Cidade</label>
        <input class="form-input" name="cidade" value="${c.cidade||''}" /></div>
      <div class="form-group"><label class="form-label">UF</label>
        <input class="form-input" name="uf" value="${c.uf||''}" maxlength="2" placeholder="SP" /></div>
    </div>
    <div class="section-title">Contato</div>
    <div class="form-grid" style="margin-bottom:20px;">
      <div class="form-group"><label class="form-label">Celular</label>
        <input class="form-input" name="celular" value="${c.celular||''}" placeholder="(00) 00000-0000" data-mask="fone" /></div>
      <div class="form-group"><label class="form-label">WhatsApp</label>
        <input class="form-input" name="whatsapp" value="${c.whatsapp||''}" placeholder="(00) 00000-0000" data-mask="fone" /></div>
      <div class="form-group col-span-2"><label class="form-label">E-mail</label>
        <input class="form-input" name="email" type="email" value="${c.email||''}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Observações</label>
      <textarea class="form-textarea" name="observacoes">${c.observacoes||''}</textarea></div>
  </form>`;
}

function configurarCep(container) {
  const inp = container.querySelector('#inp-cep');
  const form = container.querySelector('form');
  if (inp && form) inp.addEventListener('blur', () => autopreencherCep(inp, form));
}

function coletarForm(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  for (const [k,v] of Object.entries(d)) {
    if (v === '') d[k] = null;
    // Limpar máscaras
    if (k === 'cpf' && d[k]) d[k] = d[k].replace(/\D/g,'');
    if (k === 'cep' && d[k]) d[k] = d[k].replace(/\D/g,'');
    if ((k === 'celular'||k==='whatsapp') && d[k]) d[k] = d[k].replace(/\D/g,'');
  }
  if (d.estado_civil) d.estado_civil = parseInt(d.estado_civil);
  if (d.regime_bens) d.regime_bens = parseInt(d.regime_bens);
  return d;
}

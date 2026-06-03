import { registrarRota, setTopbar, abrirModal, fecharModal, toast, autopreencherCep } from './app.js';
import { api, fmt, ESTADO_CIVIL, REGIME_BENS, PAPEL } from './api.js';

export function registrar() {
  registrarRota('#/clientes',      renderLista);
  registrarRota('#/clientes/novo', renderNovo);
  registrarRota('#/clientes/:id',  renderFicha);
}

// ── LISTA DE CLIENTES ─────────────────────────────────────────
async function renderLista(params, main) {
  setTopbar('Clientes', '',
    `<button class="btn btn-primary btn-sm" onclick="location.hash='#/clientes/novo'">
       <i class="ti ti-plus"></i> Novo Cliente
     </button>`
  );

  let pagina = 1;
  let busca   = '';

  const render = async () => {
    const data = await api.clientes.listar(busca, pagina);
    main.querySelector('#lista-clientes').innerHTML = data.dados.length === 0
      ? `<div class="empty-state"><div class="empty-icon"><i class="ti ti-users"></i></div>
           <p class="empty-title">Nenhum cliente encontrado</p>
           <p class="empty-sub">Cadastre seu primeiro cliente para começar</p>
           <button class="btn btn-primary" onclick="location.hash='#/clientes/novo'">
             <i class="ti ti-plus"></i> Novo Cliente
           </button>
         </div>`
      : data.dados.map(rowHtml).join('') +
        (data.total > data.limite
          ? `<div style="padding:14px 16px;text-align:center;">
               <button class="btn btn-ghost btn-sm" id="btn-mais">
                 Carregar mais (${data.total - (pagina * data.limite)} restantes)
               </button>
             </div>`
          : '');

    main.querySelector('#btn-mais')?.addEventListener('click', () => {
      pagina++;
      render();
    });
  };

  main.innerHTML = `
    <h2 class="sr-only">Lista de clientes</h2>
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Clientes Cadastrados</span>
        <input class="search-bar" id="busca-cliente"
          type="search" placeholder="Buscar por nome ou CPF..." />
      </div>
      <div id="lista-clientes">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  main.querySelector('#busca-cliente').addEventListener('input', e => {
    busca = e.target.value;
    pagina = 1;
    clearTimeout(main._debounce);
    main._debounce = setTimeout(render, 350);
  });

  await render();
}

function rowHtml(c) {
  const iniciais = c.nome.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  const ec = ESTADO_CIVIL[c.estado_civil] || '—';
  return `
    <div class="list-row" onclick="location.hash='#/clientes/${c.id}'" role="button" tabindex="0">
      <div class="avatar">${iniciais}</div>
      <div class="item-info">
        <div class="item-name">${c.nome}</div>
        <div class="item-sub">${fmt(c.cpf, 'cpf')} · ${ec} · ${c.cidade || ''}${c.uf ? '/' + c.uf : ''}</div>
      </div>
      <div style="font-size:12px;color:#8B9FB4;">${c.celular || ''}</div>
      <i class="ti ti-chevron-right" style="color:#8B9FB4;font-size:18px;"></i>
    </div>
  `;
}

// ── FICHA DO CLIENTE ──────────────────────────────────────────
async function renderFicha(params, main) {
  const { id } = params;
  const cliente = await api.clientes.buscar(id);

  setTopbar(
    cliente.nome,
    `Clientes · ${fmt(cliente.cpf, 'cpf')}`,
    `<button class="btn btn-secondary btn-sm" onclick="editarCliente(${id})">
       <i class="ti ti-edit"></i> Editar
     </button>
     <button class="btn btn-primary btn-sm" onclick="location.hash='#/projetos/novo?pessoa=${id}'">
       <i class="ti ti-plus"></i> Novo Projeto
     </button>`
  );

  const ec = ESTADO_CIVIL[cliente.estado_civil] || '—';
  const rb = cliente.regime_bens !== null && cliente.regime_bens !== undefined ? REGIME_BENS[cliente.regime_bens] : null;

  main.innerHTML = `
    <h2 class="sr-only">Ficha do cliente ${cliente.nome}</h2>
    <div style="display:flex;gap:16px;">

      <!-- Coluna lateral -->
      <div style="width:200px;flex-shrink:0;display:flex;flex-direction:column;gap:12px;">
        <div class="card" style="padding:20px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;">
          <div class="avatar" style="width:60px;height:60px;font-size:20px;">
            ${cliente.nome.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:13px;color:#1F4470;">
            ${cliente.nome}
          </div>
          <div style="font-size:11px;color:#8B9FB4;">${fmt(cliente.cpf, 'cpf')}</div>
          ${cliente.projetos?.length > 0
            ? `<span class="badge badge-4" style="font-size:10px;">
                 ${PAPEL[cliente.projetos[0].papel] || 'Participante'}
               </span>`
            : ''}
        </div>

        <nav class="inner-nav" aria-label="Seções da ficha">
          <div class="inner-nav-item active" data-tab="dados">
            <i class="ti ti-id-badge" style="font-size:14px;"></i> Dados Pessoais
          </div>
          <div class="inner-nav-item" data-tab="projetos">
            <i class="ti ti-briefcase" style="font-size:14px;"></i> Projetos
            <span style="margin-left:auto;font-size:11px;color:#8B9FB4;">${cliente.projetos?.length || 0}</span>
          </div>
          <div class="inner-nav-item" data-tab="docs">
            <i class="ti ti-file-text" style="font-size:14px;"></i> Documentos
          </div>
        </nav>
      </div>

      <!-- Conteúdo principal -->
      <div style="flex:1;display:flex;flex-direction:column;gap:12px;" id="ficha-main">

        <!-- Dados Pessoais -->
        <div class="card" id="tab-dados">
          <div class="card-header">
            <span class="card-header-title">Dados Pessoais</span>
            <button class="btn btn-secondary btn-sm" onclick="editarCliente(${id})">
              <i class="ti ti-edit"></i> Editar
            </button>
          </div>
          <div class="field-grid">
            ${campo('Nome Completo', cliente.nome)}
            ${campo('CPF', fmt(cliente.cpf, 'cpf'))}
            ${campo('Data de Nascimento', cliente.data_nascimento ? fmt(cliente.data_nascimento, 'data') : null)}
            ${campo('Naturalidade', cliente.naturalidade)}
            ${campo('Profissão', cliente.profissao)}
            ${campo('Estado Civil', ec)}
            ${rb ? campo('Regime de Bens', rb) : ''}
            ${campo('RG', cliente.rg ? `${cliente.rg} ${cliente.rg_orgao || ''} ${cliente.rg_uf || ''}`.trim() : null)}
            ${campo('Celular', cliente.celular)}
            ${campo('E-mail', cliente.email)}
            ${campo('WhatsApp', cliente.whatsapp)}
            ${campo('Endereço', cliente.logradouro
              ? `${cliente.logradouro}, ${cliente.numero || 's/n'} ${cliente.complemento || ''} — ${cliente.bairro} · ${cliente.cidade}/${cliente.uf} · CEP ${cliente.cep}`
              : null)}
            ${campo('Filiação Paterna', cliente.nome_pai)}
            ${campo('Filiação Materna', cliente.nome_mae)}
          </div>
          ${cliente.observacoes
            ? `<div style="padding:12px 14px;border-top:0.5px solid rgba(0,0,0,0.05);">
                 <div class="field-label">Observações</div>
                 <div style="font-size:13px;color:#333;margin-top:4px;line-height:1.5;">${cliente.observacoes}</div>
               </div>`
            : ''}
        </div>

        <!-- Projetos -->
        ${cliente.projetos?.length > 0
          ? `<div class="card">
               <div class="card-header">
                 <span class="card-header-title">Projetos</span>
               </div>
               ${cliente.projetos.map(p => `
                 <div class="list-row" onclick="location.hash='#/projetos/${p.id}'" role="button" tabindex="0">
                   <div class="avatar">${p.codigo.slice(-3)}</div>
                   <div class="item-info">
                     <div class="item-name">Família ${p.nome_familia}</div>
                     <div class="item-sub">${p.codigo} · ${PAPEL[p.papel] || ''}</div>
                   </div>
                   <span class="badge badge-${p.status}">${['Captação','Diagnóstico','Proposta','Contratado','Em Execução','Concluído','Cancelado'][p.status] || '—'}</span>
                 </div>
               `).join('')}
             </div>`
          : ''}
      </div>
    </div>
  `;

  // Global para botão topbar
  window.editarCliente = () => abrirFormCliente(cliente, async (dados) => {
    try {
      await api.clientes.atualizar(id, dados);
      toast('Cliente atualizado!', 'success');
      fecharModal();
      renderFicha(params, main);
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function campo(label, valor) {
  return `<div class="field-item">
    <div class="field-label">${label}</div>
    <div class="field-value ${!valor ? 'field-empty' : ''}">${valor || '—'}</div>
  </div>`;
}

// ── NOVO CLIENTE ──────────────────────────────────────────────
async function renderNovo(params, main) {
  setTopbar('Novo Cliente', 'Clientes');
  main.innerHTML = `
    <h2 class="sr-only">Formulário de novo cliente</h2>
    <div class="card" style="max-width:720px;">
      <div class="card-header">
        <span class="card-header-title">Cadastrar Pessoa Física</span>
      </div>
      <div class="card-body">
        ${formClienteHtml()}
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-ghost" onclick="history.back()">Cancelar</button>
          <button class="btn btn-primary" id="btn-salvar">
            <i class="ti ti-check"></i> Salvar Cliente
          </button>
        </div>
      </div>
    </div>
  `;

  configurarCep(main);
  document.getElementById('btn-salvar').onclick = async () => {
    const dados = coletarForm(main.querySelector('form'));
    if (!dados.nome || !dados.cpf) { toast('Nome e CPF obrigatórios', 'error'); return; }
    try {
      const novo = await api.clientes.criar(dados);
      toast('Cliente cadastrado!', 'success');
      location.hash = `#/clientes/${novo.id}`;
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

// ── FORMULÁRIO HTML ───────────────────────────────────────────
function formClienteHtml(c = {}) {
  return `
    <form id="form-cliente" autocomplete="off">
      <div class="section-title">Identificação</div>
      <div class="form-grid" style="margin-bottom:20px;">
        <div class="form-group col-span-2">
          <label class="form-label required">Nome Completo</label>
          <input class="form-input" name="nome" value="${c.nome || ''}" placeholder="Nome completo" />
        </div>
        <div class="form-group">
          <label class="form-label required">CPF</label>
          <input class="form-input" name="cpf" value="${c.cpf || ''}" placeholder="000.000.000-00" />
        </div>
        <div class="form-group">
          <label class="form-label">Data de Nascimento</label>
          <input class="form-input" name="data_nascimento" type="date" value="${c.data_nascimento ? c.data_nascimento.slice(0,10) : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">RG</label>
          <input class="form-input" name="rg" value="${c.rg || ''}" placeholder="Número do RG" />
        </div>
        <div class="form-group">
          <label class="form-label">Órgão Emissor</label>
          <input class="form-input" name="rg_orgao" value="${c.rg_orgao || ''}" placeholder="SSP, DETRAN..." />
        </div>
        <div class="form-group">
          <label class="form-label">Profissão</label>
          <input class="form-input" name="profissao" value="${c.profissao || ''}" placeholder="Empresário, Médico..." />
        </div>
        <div class="form-group">
          <label class="form-label">Naturalidade</label>
          <input class="form-input" name="naturalidade" value="${c.naturalidade || ''}" placeholder="Cidade/UF" />
        </div>
      </div>

      <div class="section-title">Estado Civil</div>
      <div class="form-grid" style="margin-bottom:20px;">
        <div class="form-group">
          <label class="form-label">Estado Civil</label>
          <select class="form-select" name="estado_civil">
            ${ESTADO_CIVIL.map((e,i) => `<option value="${i}" ${c.estado_civil==i?'selected':''}>${e}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Regime de Bens</label>
          <select class="form-select" name="regime_bens">
            <option value="">— não aplicável —</option>
            ${REGIME_BENS.map((r,i) => `<option value="${i}" ${c.regime_bens==i?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="section-title">Endereço</div>
      <div class="form-grid" style="margin-bottom:20px;">
        <div class="form-group">
          <label class="form-label">CEP</label>
          <input class="form-input" name="cep" id="inp-cep" value="${c.cep || ''}" placeholder="00000-000" />
        </div>
        <div class="form-group col-span-2" style="grid-column:2/4">
          <label class="form-label">Logradouro</label>
          <input class="form-input" name="logradouro" value="${c.logradouro || ''}" placeholder="Rua, Avenida..." />
        </div>
        <div class="form-group">
          <label class="form-label">Número</label>
          <input class="form-input" name="numero" value="${c.numero || ''}" placeholder="123" />
        </div>
        <div class="form-group">
          <label class="form-label">Complemento</label>
          <input class="form-input" name="complemento" value="${c.complemento || ''}" placeholder="Apto, Sala..." />
        </div>
        <div class="form-group">
          <label class="form-label">Bairro</label>
          <input class="form-input" name="bairro" value="${c.bairro || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Cidade</label>
          <input class="form-input" name="cidade" value="${c.cidade || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">UF</label>
          <input class="form-input" name="uf" value="${c.uf || ''}" maxlength="2" placeholder="SP" />
        </div>
      </div>

      <div class="section-title">Contato</div>
      <div class="form-grid" style="margin-bottom:20px;">
        <div class="form-group">
          <label class="form-label">Celular</label>
          <input class="form-input" name="celular" value="${c.celular || ''}" placeholder="(19) 99999-0000" />
        </div>
        <div class="form-group">
          <label class="form-label">WhatsApp</label>
          <input class="form-input" name="whatsapp" value="${c.whatsapp || ''}" placeholder="(19) 99999-0000" />
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">E-mail</label>
          <input class="form-input" name="email" type="email" value="${c.email || ''}" placeholder="email@exemplo.com" />
        </div>
      </div>

      <div class="section-title">Filiação</div>
      <div class="form-grid" style="margin-bottom:20px;">
        <div class="form-group">
          <label class="form-label">Nome do Pai</label>
          <input class="form-input" name="nome_pai" value="${c.nome_pai || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Nome da Mãe</label>
          <input class="form-input" name="nome_mae" value="${c.nome_mae || ''}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea class="form-textarea" name="observacoes">${c.observacoes || ''}</textarea>
      </div>
    </form>
  `;
}

function configurarCep(container) {
  const cepInput = container.querySelector('#inp-cep');
  const form     = container.querySelector('form');
  if (cepInput && form) {
    cepInput.addEventListener('blur', () => autopreencherCep(cepInput, form));
  }
}

function coletarForm(form) {
  const fd = new FormData(form);
  const dados = Object.fromEntries(fd.entries());
  // Converter campos vazios em null
  for (const [k, v] of Object.entries(dados)) {
    if (v === '') dados[k] = null;
  }
  if (dados.estado_civil) dados.estado_civil = parseInt(dados.estado_civil);
  if (dados.regime_bens) dados.regime_bens = parseInt(dados.regime_bens);
  return dados;
}

function abrirFormCliente(c, onConfirm) {
  abrirModal(
    c?.id ? 'Editar Cliente' : 'Novo Cliente',
    formClienteHtml(c),
    async (body) => {
      const form = body.querySelector('form');
      await onConfirm(coletarForm(form));
    }
  );
  // Configurar CEP dentro do modal
  const modal = document.getElementById('modal-global');
  if (modal) configurarCep(modal);
}

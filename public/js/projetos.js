import { registrarRota, setTopbar, abrirModal, fecharModal, toast } from './app.js';
import { api, fmt, STATUS_PROJ, TIPO_CELULA, STATUS_CEL } from './api.js';

export function registrar() {
  registrarRota('#/projetos',       renderLista);
  registrarRota('#/projetos/novo',  renderNovo);
  registrarRota('#/projetos/:id',   renderDetalhe);
}

// ── LISTA ─────────────────────────────────────────────────────
async function renderLista(params, main) {
  setTopbar('Projetos', '', `
    <button class="btn btn-primary btn-sm" onclick="location.hash='#/projetos/novo'">
      <i class="ti ti-plus"></i> Novo Projeto
    </button>
  `);

  const data = await api.projetos.listar();
  main.innerHTML = `
    <h2 class="sr-only">Lista de projetos de holding</h2>
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Todos os Projetos</span>
        <span style="font-size:12px;color:#8B9FB4;">${data.dados?.length || 0} casos</span>
      </div>
      <div id="lista-projetos">
        ${!data.dados?.length
          ? `<div class="empty-state">
               <div class="empty-icon"><i class="ti ti-briefcase"></i></div>
               <p class="empty-title">Nenhum projeto cadastrado</p>
               <button class="btn btn-primary" onclick="location.hash='#/projetos/novo'">
                 <i class="ti ti-plus"></i> Criar Primeiro Projeto
               </button>
             </div>`
          : data.dados.map(projetoRowHtml).join('')
        }
      </div>
    </div>
  `;
}

function projetoRowHtml(p) {
  const status = parseInt(p.status);
  const labels = STATUS_PROJ;
  const cores  = ['#e65100','#1565C0','#2E7D32','#2E7D32','#6A1B9A','#1b5e20','#b71c1c'];
  const iniciais = (p.nome_familia || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return `
    <div class="list-row" onclick="location.hash='#/projetos/${p.id}'" role="button" tabindex="0">
      <div class="avatar">${iniciais}</div>
      <div class="item-info">
        <div class="item-name">Família ${p.nome_familia}</div>
        <div class="item-sub">${p.codigo} · ${p.patrimonio_estimado ? fmt(p.patrimonio_estimado) : '—'} · ${p.total_celulas} célula(s)</div>
      </div>
      <span class="badge badge-${status}">${labels[status] || '—'}</span>
      <i class="ti ti-chevron-right" style="color:#8B9FB4;font-size:18px;"></i>
    </div>
  `;
}

// ── DETALHE ───────────────────────────────────────────────────
async function renderDetalhe(params, main) {
  const { id } = params;
  const proj = await api.projetos.buscar(id);

  setTopbar(
    `Família ${proj.nome_familia}`,
    `Projetos · ${proj.codigo}`,
    `<button class="btn btn-secondary btn-sm" onclick="editarStatus(${id})">
       <i class="ti ti-edit"></i> Status
     </button>
     <button class="btn btn-primary btn-sm" onclick="location.hash='#/celulas/${id}'">
       <i class="ti ti-building-community"></i> Gerenciar Células
     </button>`
  );

  const statusLabel = STATUS_PROJ[proj.status] || '—';

  main.innerHTML = `
    <h2 class="sr-only">Detalhe do projeto ${proj.codigo}</h2>

    <!-- Cabeçalho do projeto -->
    <div class="card">
      <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;">
        <div style="padding:12px 20px;border-right:0.5px solid rgba(0,0,0,0.06);">
          <div class="field-label">Código</div>
          <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:16px;color:#1F4470;">${proj.codigo}</div>
        </div>
        <div style="padding:12px 20px;border-right:0.5px solid rgba(0,0,0,0.06);">
          <div class="field-label">Status</div>
          <span class="badge badge-${proj.status}">${statusLabel}</span>
        </div>
        <div style="padding:12px 20px;border-right:0.5px solid rgba(0,0,0,0.06);">
          <div class="field-label">Patrimônio Estimado</div>
          <div style="font-weight:700;color:#333;">${proj.patrimonio_estimado ? fmt(proj.patrimonio_estimado) : '—'}</div>
        </div>
        <div style="padding:12px 20px;">
          <div class="field-label">ITCMD Estimado</div>
          <div style="font-weight:700;color:#e65100;">${proj.itcmd_estimado ? fmt(proj.itcmd_estimado) : '—'}</div>
        </div>
      </div>
    </div>

    <!-- Células -->
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Células — Tríade</span>
        <button class="btn btn-primary btn-sm" onclick="location.hash='#/celulas/${id}'">
          <i class="ti ti-settings"></i> Gerenciar
        </button>
      </div>
      <div style="padding:16px;">
        ${renderCelulas(proj.celulas)}
      </div>
    </div>

    <!-- Participantes -->
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Participantes</span>
        <button class="btn btn-secondary btn-sm" onclick="adicionarParticipante(${id})">
          <i class="ti ti-plus"></i> Adicionar
        </button>
      </div>
      ${renderParticipantes(proj.participantes)}
    </div>

    <!-- Timeline de fases -->
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Timeline de Execução</span>
      </div>
      <div class="card-body">
        ${renderTimeline(proj.fases)}
      </div>
    </div>
  `;

  window.editarStatus = () => {
    abrirModal('Atualizar Status', `
      <div class="form-group">
        <label class="form-label">Status do Projeto</label>
        <select class="form-select" id="sel-status">
          ${STATUS_PROJ.map((s,i) => `<option value="${i}" ${proj.status==i?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    `, async () => {
      const s = parseInt(document.getElementById('sel-status').value);
      await api.projetos.atualizar(id, { status: s });
      toast('Status atualizado', 'success');
      fecharModal();
      renderDetalhe(params, main);
    });
  };

  window.adicionarParticipante = () => {
    // Simplificado — seria um formulário de busca de cliente
    toast('Funcionalidade em desenvolvimento', 'default');
  };
}

function renderCelulas(celulas = []) {
  const tipos = [
    { tipo: 1, label: 'DESTINO', cls: 'celula-card-destino', cor: '#2E7D32' },
    { tipo: 0, label: 'COFRE',   cls: 'celula-card-cofre',   cor: '#1565C0' },
    { tipo: 2, label: 'VEÍCULO', cls: 'celula-card-veiculo',  cor: '#6A1B9A' },
  ];

  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
    ${tipos.map(t => {
      const c = celulas.find(x => x.tipo === t.tipo);
      if (!c) return `
        <div class="celula-card ${t.cls}" style="border-style:dashed;opacity:0.5;cursor:pointer;">
          <div class="celula-type-label">${t.label}</div>
          <div style="font-size:13px;color:#666;margin-top:8px;">Não constituída</div>
        </div>
      `;
      const statusCel = STATUS_CEL[c.status] || '—';
      return `
        <div class="celula-card ${t.cls}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="celula-type-label">${t.label}</span>
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;
              background:white;color:${t.cor};">${statusCel}</span>
          </div>
          <div style="font-size:13px;font-weight:700;color:#333;margin-bottom:4px;">${c.nome_celula}</div>
          ${c.cnpj ? `<div style="font-size:11px;color:#8B9FB4;">CNPJ ${fmt(c.cnpj, 'cnpj')}</div>` : ''}
          <div style="font-size:11px;color:#666;margin-top:6px;">
            Capital: ${fmt(c.capital_social_previsto)}
            ${c.total_quotas ? ` · ${c.total_quotas.toLocaleString('pt-BR')} quotas` : ''}
          </div>
        </div>
      `;
    }).join('')}
  </div>`;
}

function renderParticipantes(participantes = []) {
  const papelLabel = ['Instituidor','Cônjuge','Herdeiro','Administrador','Procurador','Testemunha'];
  if (!participantes.length) return `<div class="empty-state" style="padding:24px 16px;">
    <p class="empty-sub">Nenhum participante vinculado</p>
  </div>`;
  return participantes.map(p => `
    <div class="list-row" onclick="location.hash='#/clientes/${p.pessoa_id}'" role="button" tabindex="0">
      <div class="avatar">${p.nome.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase()}</div>
      <div class="item-info">
        <div class="item-name">${p.nome}</div>
        <div class="item-sub">${fmt(p.cpf, 'cpf')} · ${p.celular || ''}</div>
      </div>
      <span class="badge badge-4" style="font-size:10px;">${papelLabel[p.papel] || '—'}</span>
    </div>
  `).join('');
}

function renderTimeline(fases = []) {
  if (!fases.length) return `<p style="color:#8B9FB4;font-size:13px;">Fases não criadas ainda.</p>`;

  const tipoFase = [
    { nome: 'DESTINO', cor: '#2E7D32', cls: 'timeline-dot-destino' },
    { nome: 'COFRE',   cor: '#1565C0', cls: 'timeline-dot-cofre' },
    { nome: 'VEÍCULO', cor: '#6A1B9A', cls: 'timeline-dot-veiculo' },
  ];

  return `
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${fases.map((fase, idx) => {
        const t = tipoFase[idx] || tipoFase[0];
        const passos = fase.passos?.filter(Boolean) || [];
        const concluidos = passos.filter(p => p.status === 'Concluída').length;
        const pct = passos.length ? Math.round((concluidos / passos.length) * 100) : 0;
        return `
          <div class="accordion-item card" style="border-radius:10px;">
            <div class="accordion-header">
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="timeline-dot ${t.cls} ${pct===100?'done':''}"
                  style="border-color:${t.cor};">
                  <i class="ti ti-${pct===100?'check':'clock'}" style="font-size:14px;color:${pct===100?'white':t.cor};"></i>
                </div>
                <div>
                  <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:13px;color:#333;">${fase.nome_fase}</div>
                  <div style="font-size:11px;color:#8B9FB4;">${concluidos}/${passos.length} passos · ${pct}%</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:80px;">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${pct}%;background:${t.cor};"></div>
                  </div>
                </div>
                <i class="ti ti-chevron-down accordion-toggle" style="font-size:20px;color:#8B9FB4;"></i>
              </div>
            </div>
            <div class="accordion-body">
              ${passos.map(passo => `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:0.5px solid rgba(0,0,0,0.05);">
                  <div style="width:20px;height:20px;border-radius:50%;border:2px solid;
                    border-color:${passo.status==='Concluída'?t.cor:'#ddd'};
                    background:${passo.status==='Concluída'?t.cor:'transparent'};
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
                    ${passo.status==='Concluída'
                      ? `<i class="ti ti-check" style="font-size:11px;color:white;"></i>`
                      : ''}
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:13px;color:${passo.status==='Concluída'?'#8B9FB4':'#333'};">${passo.descricao}</div>
                    ${passo.data_conclusao
                      ? `<div style="font-size:11px;color:#8B9FB4;">${fmt(passo.data_conclusao,'data')}</div>`
                      : ''}
                  </div>
                  <span style="font-size:11px;color:${passo.status==='Concluída'?'#2E7D32':'#8B9FB4'};font-weight:700;">
                    ${passo.status}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── NOVO PROJETO ──────────────────────────────────────────────
async function renderNovo(params, main) {
  setTopbar('Novo Projeto', 'Projetos');
  const urlParams = new URLSearchParams(location.hash.split('?')[1] || '');
  const pessoaId  = urlParams.get('pessoa');

  main.innerHTML = `
    <h2 class="sr-only">Formulário de novo projeto</h2>
    <div class="card" style="max-width:600px;">
      <div class="card-header">
        <span class="card-header-title">Criar Projeto de Holding</span>
      </div>
      <div class="card-body">
        <form id="form-projeto" style="display:flex;flex-direction:column;gap:16px;">
          <div class="form-group">
            <label class="form-label required">Nome da Família</label>
            <input class="form-input" name="nome_familia" placeholder="Ex: Silva" />
          </div>
          <div class="form-group">
            <label class="form-label">Nome do Projeto</label>
            <input class="form-input" name="nome_projeto"
              placeholder="Gerado automaticamente se vazio" />
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Patrimônio Estimado</label>
              <input class="form-input input-currency" name="patrimonio_estimado"
                type="number" placeholder="0.00" step="0.01" />
            </div>
            <div class="form-group">
              <label class="form-label">ITCMD Estimado</label>
              <input class="form-input input-currency" name="itcmd_estimado"
                type="number" placeholder="0.00" step="0.01" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Modelo</label>
            <select class="form-select" name="modelo_escolhido">
              <option value="2" selected>Tríade — 3 Células (DESTINO + COFRE + VEÍCULO)</option>
              <option value="1">Duas Células</option>
              <option value="0">Básico — 1 Célula</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea class="form-textarea" name="observacoes"
              placeholder="Notas iniciais sobre o caso..."></textarea>
          </div>
        </form>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-ghost" onclick="history.back()">Cancelar</button>
          <button class="btn btn-primary" id="btn-criar">
            <i class="ti ti-plus"></i> Criar Projeto
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-criar').onclick = async () => {
    const form  = document.getElementById('form-projeto');
    const dados = Object.fromEntries(new FormData(form).entries());
    for (const [k, v] of Object.entries(dados)) if (v === '') dados[k] = null;
    if (dados.modelo_escolhido) dados.modelo_escolhido = parseInt(dados.modelo_escolhido);
    if (dados.patrimonio_estimado) dados.patrimonio_estimado = parseFloat(dados.patrimonio_estimado);
    if (dados.itcmd_estimado) dados.itcmd_estimado = parseFloat(dados.itcmd_estimado);
    if (pessoaId) dados.pessoa_id = parseInt(pessoaId);

    if (!dados.nome_familia) { toast('Nome da família obrigatório', 'error'); return; }

    try {
      const proj = await api.projetos.criar(dados);
      toast('Projeto criado! Fases geradas automaticamente.', 'success');
      location.hash = `#/projetos/${proj.id}`;
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

// ── Acordeon interativo ────────────────────────────────────────
document.addEventListener('click', e => {
  const header = e.target.closest('.accordion-header');
  if (header) {
    const item = header.closest('.accordion-item');
    if (item) item.classList.toggle('open');
  }
});

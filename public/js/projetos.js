import { registrarRota, setTopbar, abrirModal, fecharModal, toast, aplicarMascaras } from './app.js';
import { api, fmt, STATUS_PROJ, TIPO_CELULA, STATUS_CEL, PAPEL } from './api.js';

export function registrar() {
  registrarRota('#/projetos',      renderLista);
  registrarRota('#/projetos/novo', renderNovo);
  registrarRota('#/projetos/:id',  renderDetalhe);
}

// ── LISTA ─────────────────────────────────────────────────────
async function renderLista(params, main) {
  setTopbar('Projetos', '', `<button class="btn btn-primary btn-sm" onclick="location.hash='#/projetos/novo'">+ Novo Projeto</button>`);
  const data = await api.projetos.listar();

  main.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Todos os Projetos</span>
        <span style="font-size:12px;color:#8B9FB4;">${data.dados?.length||0} casos</span>
      </div>
      <div id="lista-projetos">
        ${!data.dados?.length
          ? `<div class="empty-state">
               <p class="empty-title">Nenhum projeto cadastrado</p>
               <p class="empty-sub">Crie o primeiro projeto de holding para um cliente</p>
               <button class="btn btn-primary" onclick="location.hash='#/projetos/novo'">+ Novo Projeto</button>
             </div>`
          : data.dados.map(projetoRowHtml).join('')}
      </div>
    </div>`;
}

function projetoRowHtml(p) {
  const status = parseInt(p.status);
  const labels = STATUS_PROJ;
  const iniciais = (p.nome_familia||'??').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  return `
    <div class="list-row" onclick="location.hash='#/projetos/${p.id}'" role="button" tabindex="0">
      <div class="avatar">${iniciais}</div>
      <div class="item-info">
        <div class="item-name">Família ${p.nome_familia}</div>
        <div class="item-sub">${p.codigo} · ${p.patrimonio_estimado ? fmt(p.patrimonio_estimado) : '—'} · ${p.total_celulas||0} célula(s)</div>
      </div>
      <span class="badge badge-${status}">${labels[status]||'—'}</span>
    </div>`;
}

// ── DETALHE ───────────────────────────────────────────────────
async function renderDetalhe(params, main) {
  const { id } = params;
  const proj = await api.projetos.buscar(id);

  setTopbar(
    `Família ${proj.nome_familia}`,
    `Projetos · ${proj.codigo}`,
    `<button class="btn btn-secondary btn-sm" onclick="window._editarStatus()">Atualizar Status</button>
     <button class="btn btn-primary btn-sm" onclick="window._novaCelula()">+ Célula</button>`
  );

  main.innerHTML = `
    <!-- Cabeçalho -->
    <div class="card">
      <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;">
        <div style="padding:14px 20px;border-right:0.5px solid rgba(0,0,0,0.06);">
          <div class="field-label">Código</div>
          <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#1F4470;">${proj.codigo}</div>
        </div>
        <div style="padding:14px 20px;border-right:0.5px solid rgba(0,0,0,0.06);">
          <div class="field-label">Status</div>
          <span class="badge badge-${proj.status}">${STATUS_PROJ[proj.status]||'—'}</span>
        </div>
        <div style="padding:14px 20px;border-right:0.5px solid rgba(0,0,0,0.06);">
          <div class="field-label">Patrimônio Estimado</div>
          <div style="font-weight:700;color:#333;">${proj.patrimonio_estimado ? fmt(proj.patrimonio_estimado) : '—'}</div>
        </div>
        <div style="padding:14px 20px;">
          <div class="field-label">ITCMD Estimado</div>
          <div style="font-weight:700;color:#e65100;">${proj.itcmd_estimado ? fmt(proj.itcmd_estimado) : '—'}</div>
        </div>
      </div>
    </div>

    <!-- Tríade de Células -->
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Tríade — Modelo de 3 Células</span>
        <button class="btn btn-primary btn-sm" onclick="window._novaCelula()">+ Nova Célula</button>
      </div>
      <div style="padding:16px;">
        ${renderTriade(proj.celulas, id)}
      </div>
    </div>

    <!-- Participantes -->
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Participantes</span>
        <button class="btn btn-secondary btn-sm" onclick="window._addParticipante()">+ Adicionar</button>
      </div>
      <div id="lista-participantes">
        ${renderParticipantes(proj.participantes)}
      </div>
    </div>

    <!-- Timeline -->
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Timeline de Execução</span>
      </div>
      <div class="card-body" id="timeline-wrap">
        ${renderTimeline(proj.fases)}
      </div>
    </div>
  `;

  // Accordion
  main.querySelectorAll('.accordion-header').forEach(h => {
    h.addEventListener('click', () => h.closest('.accordion-item').classList.toggle('open'));
  });

  // Marcar passo como concluído
  main.querySelectorAll('.passo-check').forEach(cb => {
    cb.addEventListener('change', async e => {
      const passoId = e.target.dataset.id;
      const status  = e.target.checked ? 'Concluída' : 'Pendente';
      try {
        await api.put(`/passos/${passoId}`, { status });
        toast(status === 'Concluída' ? '✓ Passo concluído!' : 'Passo reaberto', 'success');
        // Atualizar progresso local
        const fase = e.target.closest('[data-fase]');
        if (fase) {
          const total = fase.querySelectorAll('.passo-check').length;
          const feitos = fase.querySelectorAll('.passo-check:checked').length;
          const pct = Math.round((feitos/total)*100);
          const bar = fase.querySelector('.progress-fill');
          const lbl = fase.querySelector('.progress-label');
          if (bar) bar.style.width = pct + '%';
          if (lbl) lbl.textContent = pct + '%';
        }
      } catch (err) { toast(err.message, 'error'); e.target.checked = !e.target.checked; }
    });
  });

  // Globals
  window._editarStatus = () => {
    abrirModal('Atualizar Status', `
      <div class="form-group">
        <label class="form-label">Status do Projeto</label>
        <select class="form-select" id="sel-status">
          ${STATUS_PROJ.map((s,i)=>`<option value="${i}" ${proj.status==i?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-top:14px;">
        <label class="form-label">Patrimônio Estimado</label>
        <input class="form-input" id="inp-patrim" type="number" step="0.01"
          value="${proj.patrimonio_estimado||''}" placeholder="0,00" data-mask="moeda" />
      </div>
      <div class="form-group" style="margin-top:14px;">
        <label class="form-label">ITCMD Estimado</label>
        <input class="form-input" id="inp-itcmd" type="number" step="0.01"
          value="${proj.itcmd_estimado||''}" placeholder="0,00" />
      </div>`,
      async () => {
        const status = parseInt(document.getElementById('sel-status').value);
        const patrimonio = parseFloat(document.getElementById('inp-patrim').value)||null;
        const itcmd = parseFloat(document.getElementById('inp-itcmd').value)||null;
        try {
          await api.projetos.atualizar(id, { status, patrimonio_estimado: patrimonio, itcmd_estimado: itcmd });
          toast('Projeto atualizado!', 'success');
          fecharModal();
          renderDetalhe(params, main);
        } catch (err) { toast(err.message, 'error'); }
      }
    );
  };

  window._novaCelula = () => {
    abrirModal('Nova Célula', formCelulaHtml(proj.participantes), async (body) => {
      const dados = coletarFormCelula(body.querySelector('form'));
      dados.projeto_id = parseInt(id);
      try {
        await api.celulas.criar(dados);
        toast('Célula criada!', 'success');
        fecharModal();
        renderDetalhe(params, main);
      } catch (err) { toast(err.message, 'error'); }
    }, 'Criar Célula');
    aplicarMascaras(document.getElementById('modal-global'));
  };

  window._addParticipante = () => {
    abrirModal('Adicionar Participante',`
      <div class="form-group">
        <label class="form-label required">CPF do Cliente</label>
        <input class="form-input" id="inp-cpf-part" placeholder="000.000.000-00" data-mask="cpf" />
        <div class="form-hint">Digite o CPF para buscar o cliente cadastrado</div>
      </div>
      <div class="form-group" style="margin-top:14px;">
        <label class="form-label">Papel</label>
        <select class="form-select" id="sel-papel">
          ${PAPEL.map((p,i)=>`<option value="${i}">${p}</option>`).join('')}
        </select>
      </div>
      <div id="res-busca" style="margin-top:12px;"></div>`,
      async (body) => {
        const cpf = body.querySelector('#inp-cpf-part').value.replace(/\D/g,'');
        const papel = parseInt(body.querySelector('#sel-papel').value);
        try {
          const clientes = await api.clientes.listar(cpf);
          if (!clientes.dados?.length) { toast('Cliente não encontrado', 'error'); return; }
          const pessoa_id = clientes.dados[0].id;
          await api.put(`/projetos/${id}/participantes`, { pessoa_id, papel });
          toast('Participante adicionado!', 'success');
          fecharModal();
          renderDetalhe(params, main);
        } catch (err) { toast(err.message, 'error'); }
      }, 'Adicionar'
    );
    aplicarMascaras(document.getElementById('modal-global'));
  };
}

// ── TRÍADE ────────────────────────────────────────────────────
function renderTriade(celulas = [], projetoId) {
  const tipos = [
    { tipo: 1, label: 'DESTINO',  cls: 'celula-card-destino', cor: '#2E7D32', desc: 'Transmissão patrimonial e sucessão' },
    { tipo: 0, label: 'COFRE',    cls: 'celula-card-cofre',   cor: '#1565C0', desc: 'Proteção e blindagem patrimonial' },
    { tipo: 2, label: 'VEÍCULO',  cls: 'celula-card-veiculo',  cor: '#6A1B9A', desc: 'Controle operacional e Golden Share' },
  ];

  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
    ${tipos.map(t => {
      const c = celulas.find(x => x.tipo === t.tipo);
      if (!c) return `
        <div class="celula-card ${t.cls}" style="border-style:dashed;cursor:pointer;opacity:0.7;"
          onclick="window._novaCelula()">
          <div class="celula-type-label" style="color:${t.cor};">${t.label}</div>
          <div style="font-size:12px;color:#666;margin-top:8px;line-height:1.5;">${t.desc}</div>
          <div style="margin-top:14px;text-align:center;">
            <span style="font-size:11px;font-weight:700;color:${t.cor};padding:4px 12px;border-radius:20px;border:1px solid ${t.cor};">+ Constituir</span>
          </div>
        </div>`;

      const statusLabel = STATUS_CEL[c.status] || '—';
      const statusCor = [
        '#e65100','#1565C0','#2E7D32','#2E7D32','#1b5e20','#b71c1c'
      ][c.status] || '#666';

      return `
        <div class="celula-card ${t.cls}" onclick="window._editarCelula(${c.id})" style="cursor:pointer;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span class="celula-type-label" style="color:${t.cor};">${t.label}</span>
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;
              background:white;color:${statusCor};">${statusLabel}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:6px;line-height:1.3;">${c.nome_celula}</div>
          ${c.cnpj ? `<div style="font-size:11px;color:#666;">CNPJ: ${c.cnpj}</div>` : ''}
          ${c.nire ? `<div style="font-size:11px;color:#666;">NIRE: ${c.nire}</div>` : ''}
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.08);display:flex;justify-content:space-between;">
            <div>
              <div style="font-size:10px;color:#8B9FB4;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Capital</div>
              <div style="font-size:13px;font-weight:700;color:#333;">${fmt(c.capital_social_previsto)}</div>
            </div>
            ${c.total_quotas ? `<div style="text-align:right;">
              <div style="font-size:10px;color:#8B9FB4;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Quotas</div>
              <div style="font-size:13px;font-weight:700;color:#333;">${parseInt(c.total_quotas).toLocaleString('pt-BR')}</div>
            </div>` : ''}
          </div>
          ${c.tipo === 2 && c.regencia_supletiva ? `
            <div style="margin-top:8px;font-size:10px;color:#6A1B9A;font-weight:700;
              background:rgba(106,27,154,0.08);padding:4px 8px;border-radius:6px;text-align:center;">
              ★ Golden Share + Regência LSA
            </div>` : ''}
        </div>`;
    }).join('')}
  </div>`;
}

// ── PARTICIPANTES ─────────────────────────────────────────────
function renderParticipantes(participantes = []) {
  if (!participantes.length) return `<div class="empty-state" style="padding:24px;">
    <p class="empty-sub">Nenhum participante vinculado. Adicione o instituidor e herdeiros.</p>
  </div>`;
  return participantes.map(p => `
    <div class="list-row">
      <div class="avatar">${p.nome.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}</div>
      <div class="item-info">
        <div class="item-name">${p.nome}</div>
        <div class="item-sub">${fmt(p.cpf,'cpf')} · ${p.celular||''}</div>
      </div>
      <span class="badge badge-4" style="font-size:10px;">${PAPEL[p.papel]||'—'}</span>
    </div>`).join('');
}

// ── TIMELINE ──────────────────────────────────────────────────
function renderTimeline(fases = []) {
  if (!fases.length) return `<p style="color:#8B9FB4;font-size:13px;">Fases não encontradas.</p>`;

  const cores  = ['#2E7D32','#1565C0','#6A1B9A'];
  const labels = ['DESTINO','COFRE','VEÍCULO'];

  return fases.map((fase, idx) => {
    const cor    = cores[idx] || '#1565C0';
    const passos = (fase.passos||[]).filter(Boolean);
    const feitos = passos.filter(p => p.status === 'Concluída').length;
    const pct    = passos.length ? Math.round((feitos/passos.length)*100) : 0;

    return `
      <div class="accordion-item card" style="border-radius:10px;margin-bottom:10px;" data-fase="${fase.id}">
        <div class="accordion-header" style="cursor:pointer;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;border-radius:50%;border:3px solid ${cor};
              background:${pct===100?cor:'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${pct===100
                ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" fill="none" stroke-width="3"><polyline points="20 6 9 13 4 10"/></svg>`
                : `<span style="font-size:11px;font-weight:700;color:${cor};">${labels[idx]||''}</span>`}
            </div>
            <div>
              <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:13px;color:#333;">${fase.nome_fase}</div>
              <div style="font-size:11px;color:#8B9FB4;">${feitos}/${passos.length} passos concluídos</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div>
              <div class="progress-bar" style="width:100px;">
                <div class="progress-fill" style="width:${pct}%;background:${cor};"></div>
              </div>
              <div class="progress-label" style="text-align:right;margin-top:2px;">${pct}%</div>
            </div>
            <span style="font-size:18px;color:#8B9FB4;transition:transform 0.2s;" class="accordion-toggle">▾</span>
          </div>
        </div>
        <div class="accordion-body">
          ${passos.map(passo => `
            <label style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;
              border-bottom:0.5px solid rgba(0,0,0,0.05);cursor:pointer;">
              <input type="checkbox" class="passo-check" data-id="${passo.id}"
                ${passo.status==='Concluída'?'checked':''}
                style="width:18px;height:18px;margin-top:1px;accent-color:${cor};flex-shrink:0;" />
              <div style="flex:1;">
                <div style="font-size:13px;color:${passo.status==='Concluída'?'#8B9FB4':'#333'};
                  text-decoration:${passo.status==='Concluída'?'line-through':'none'};">
                  ${passo.descricao}
                </div>
                ${passo.data_conclusao ? `<div style="font-size:11px;color:#8B9FB4;margin-top:2px;">Concluído em ${fmt(passo.data_conclusao,'data')}</div>` : ''}
              </div>
            </label>`).join('')}
        </div>
      </div>`;
  }).join('');
}

// ── FORM CÉLULA ───────────────────────────────────────────────
function formCelulaHtml(participantes = []) {
  return `<form id="form-celula">
    <div class="form-grid" style="margin-bottom:16px;">
      <div class="form-group col-span-2">
        <label class="form-label required">Tipo de Célula</label>
        <select class="form-select" name="tipo" id="sel-tipo-celula">
          <option value="">— Selecione —</option>
          <option value="1">DESTINO — Transmissão e Sucessão</option>
          <option value="0">COFRE — Patrimônio e Proteção</option>
          <option value="2">VEÍCULO — Controle Operacional</option>
        </select>
      </div>
      <div class="form-group col-span-2">
        <label class="form-label required">Nome da Célula</label>
        <input class="form-input" name="nome_celula" placeholder="Ex: Família Silva Participações Ltda." />
      </div>
      <div class="form-group">
        <label class="form-label">Capital Social Previsto (R$)</label>
        <input class="form-input" name="capital_social_previsto" type="number" step="0.01" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label class="form-label">Total de Quotas</label>
        <input class="form-input" name="total_quotas" type="number" placeholder="Ex: 100" />
      </div>
      <div class="form-group col-span-2">
        <label class="form-label">Administrador</label>
        <select class="form-select" name="administrador_id">
          <option value="">— Selecione —</option>
          ${participantes.map(p=>`<option value="${p.pessoa_id}">${p.nome} (${PAPEL[p.papel]||''})</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Campos especiais VEÍCULO -->
    <div id="bloco-veiculo" style="display:none;">
      <div class="section-title" style="color:#6A1B9A;">Configurações VEÍCULO</div>
      <div style="padding:12px;background:#f5f0fa;border-radius:8px;margin-bottom:14px;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          <input type="checkbox" name="regencia_supletiva" value="true"
            style="width:18px;height:18px;accent-color:#6A1B9A;" />
          <div>
            <div style="font-size:13px;font-weight:700;color:#4a148c;">Regência Supletiva pela LSA</div>
            <div style="font-size:11px;color:#666;">Obrigatório para célula VEÍCULO (art. 1.053 CC)</div>
          </div>
        </label>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Objeto Social</label>
      <textarea class="form-textarea" name="objeto_social"
        placeholder="A sociedade tem por objeto a participação no capital de outras sociedades..."></textarea>
    </div>
  </form>

  <script>
    document.getElementById('sel-tipo-celula').addEventListener('change', function() {
      document.getElementById('bloco-veiculo').style.display = this.value === '2' ? 'block' : 'none';
    });
  </script>`;
}

function coletarFormCelula(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  for (const [k,v] of Object.entries(d)) if (v==='') d[k] = null;
  if (d.tipo !== null) d.tipo = parseInt(d.tipo);
  if (d.capital_social_previsto) d.capital_social_previsto = parseFloat(d.capital_social_previsto);
  if (d.total_quotas) d.total_quotas = parseInt(d.total_quotas);
  if (d.administrador_id) d.administrador_id = parseInt(d.administrador_id);
  d.regencia_supletiva = !!form.querySelector('[name="regencia_supletiva"]:checked');
  return d;
}

// Editar célula existente
window._editarCelula = (celulaId) => {
  toast('Clique em "+ Célula" para adicionar ou edite diretamente os dados.', 'default');
};

// ── NOVO PROJETO ──────────────────────────────────────────────
async function renderNovo(params, main) {
  const urlParams = new URLSearchParams(location.hash.split('?')[1]||'');
  const pessoaId  = urlParams.get('pessoa');
  setTopbar('Novo Projeto', 'Projetos');

  main.innerHTML = `
    <div class="card" style="max-width:600px;">
      <div class="card-header"><span class="card-header-title">Criar Projeto de Holding</span></div>
      <div class="card-body">
        <form id="form-projeto" style="display:flex;flex-direction:column;gap:16px;">
          <div class="form-group">
            <label class="form-label required">Nome da Família</label>
            <input class="form-input" name="nome_familia" placeholder="Ex: Silva" />
            <div class="form-hint">Será gerado: "Holding Família Silva" e código PRJ-2026-001</div>
          </div>
          <div class="form-group">
            <label class="form-label">Nome Personalizado do Projeto</label>
            <input class="form-input" name="nome_projeto" placeholder="Deixe em branco para gerar automaticamente" />
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Patrimônio Estimado (R$)</label>
              <input class="form-input" name="patrimonio_estimado" type="number" step="0.01" placeholder="0,00" />
            </div>
            <div class="form-group">
              <label class="form-label">ITCMD Estimado (R$)</label>
              <input class="form-input" name="itcmd_estimado" type="number" step="0.01" placeholder="0,00" />
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
            <label class="form-label">Observações iniciais</label>
            <textarea class="form-textarea" name="observacoes" placeholder="Notas do primeiro atendimento..."></textarea>
          </div>
        </form>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-ghost" onclick="history.back()">Cancelar</button>
          <button class="btn btn-primary" id="btn-criar">Criar Projeto + Fases</button>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-criar').onclick = async () => {
    const form  = document.getElementById('form-projeto');
    const dados = Object.fromEntries(new FormData(form).entries());
    for (const [k,v] of Object.entries(dados)) if (v==='') dados[k] = null;
    dados.modelo_escolhido = parseInt(dados.modelo_escolhido||2);
    if (dados.patrimonio_estimado) dados.patrimonio_estimado = parseFloat(dados.patrimonio_estimado);
    if (dados.itcmd_estimado) dados.itcmd_estimado = parseFloat(dados.itcmd_estimado);
    if (pessoaId) dados.pessoa_id = parseInt(pessoaId);
    if (!dados.nome_familia) { toast('Nome da família obrigatório', 'error'); return; }

    const btn = document.getElementById('btn-criar');
    btn.disabled = true; btn.textContent = 'Criando...';
    try {
      const proj = await api.projetos.criar(dados);
      toast(`Projeto ${proj.codigo} criado com 3 fases e ${dados.modelo_escolhido===2?'15':'5'} passos!`, 'success');
      location.hash = `#/projetos/${proj.id}`;
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Criar Projeto + Fases';
    }
  };
}

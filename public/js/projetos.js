import { registrarRota, setTopbar, abrirModal, fecharModal, toast, aplicarMascaras } from './app.js';
import { api, fmt, STATUS_PROJ, STATUS_CEL, PAPEL } from './api.js';

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
      <div>
        ${!data.dados?.length
          ? `<div class="empty-state">
               <p class="empty-title">Nenhum projeto cadastrado</p>
               <button class="btn btn-primary" onclick="location.hash='#/projetos/novo'">+ Novo Projeto</button>
             </div>`
          : data.dados.map(p => {
              const ini = (p.nome_familia||'??').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
              return `<div class="list-row" onclick="location.hash='#/projetos/${p.id}'" role="button" tabindex="0">
                <div class="avatar">${ini}</div>
                <div class="item-info">
                  <div class="item-name">Família ${p.nome_familia}</div>
                  <div class="item-sub">${p.codigo} · ${p.patrimonio_estimado ? fmt(p.patrimonio_estimado) : '—'} · ${p.total_celulas||0} célula(s)</div>
                </div>
                <span class="badge badge-${p.status}">${STATUS_PROJ[p.status]||'—'}</span>
              </div>`;
            }).join('')}
      </div>
    </div>`;
}

// ── DETALHE ───────────────────────────────────────────────────
async function renderDetalhe(params, main) {
  const { id } = params;
  const proj = await api.projetos.buscar(id);

  setTopbar(`Família ${proj.nome_familia}`, `Projetos · ${proj.codigo}`,
    `<button class="btn btn-secondary btn-sm" onclick="window._editarStatus()">Atualizar Status</button>
     <button class="btn btn-primary btn-sm" onclick="window._novaCelula()">+ Célula</button>`);

  main.innerHTML = `
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

    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Tríade — Modelo de 3 Células</span>
        <button class="btn btn-primary btn-sm" onclick="window._novaCelula()">+ Nova Célula</button>
      </div>
      <div style="padding:16px;">${renderTriade(proj.celulas, id)}</div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Participantes</span>
        <button class="btn btn-secondary btn-sm" onclick="window._addParticipante()">+ Adicionar</button>
      </div>
      ${renderParticipantes(proj.participantes)}
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-header-title">📋 Timeline de Execução — Fluxograma 3 Células</span>
        <span style="font-size:12px;color:#8B9FB4;">${calcProgresso(proj.fases)}% concluído</span>
      </div>
      <div id="timeline-wrap" style="padding:16px 0;">
        ${renderTimeline(proj.fases)}
      </div>
    </div>`;

  // Accordion toggle
  main.querySelectorAll('.accordion-header').forEach(h => {
    h.addEventListener('click', e => {
      if (e.target.closest('button') || e.target.closest('label')) return;
      h.closest('.accordion-item').classList.toggle('open');
    });
  });

  // Expandir fase com passos pendentes automaticamente
  main.querySelectorAll('.accordion-item').forEach(item => {
    const pendentes = item.querySelectorAll('.passo-btn:not(.passo-concluido)').length;
    if (pendentes > 0) { item.classList.add('open'); return false; }
  });

  // Botão de concluir passo
  main.querySelectorAll('.passo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const passo = JSON.parse(btn.dataset.passo);
      abrirModalEvidencia(passo, id, () => renderDetalhe(params, main));
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
        <label class="form-label">Patrimônio Estimado (R$)</label>
        <input class="form-input" id="inp-patrim" type="number" step="0.01" value="${proj.patrimonio_estimado||''}" />
      </div>
      <div class="form-group" style="margin-top:14px;">
        <label class="form-label">ITCMD Estimado (R$)</label>
        <input class="form-input" id="inp-itcmd" type="number" step="0.01" value="${proj.itcmd_estimado||''}" />
      </div>`,
      async () => {
        try {
          await api.projetos.atualizar(id, {
            status: parseInt(document.getElementById('sel-status').value),
            patrimonio_estimado: parseFloat(document.getElementById('inp-patrim').value)||null,
            itcmd_estimado: parseFloat(document.getElementById('inp-itcmd').value)||null,
          });
          toast('Atualizado!', 'success'); fecharModal(); renderDetalhe(params, main);
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
        toast('Célula criada!', 'success'); fecharModal(); renderDetalhe(params, main);
      } catch (err) { toast(err.message, 'error'); }
    }, 'Criar Célula');
    aplicarMascaras(document.getElementById('modal-global'));
    document.getElementById('sel-tipo-celula')?.addEventListener('change', function() {
      const bloco = document.getElementById('bloco-veiculo');
      if (bloco) bloco.style.display = this.value === '2' ? 'block' : 'none';
    });
  };

  window._addParticipante = () => {
    abrirModal('Adicionar Participante', `
      <div class="form-group">
        <label class="form-label required">CPF do Cliente</label>
        <input class="form-input" id="inp-cpf-part" placeholder="000.000.000-00" data-mask="cpf" />
        <div class="form-hint">O cliente deve estar cadastrado no sistema</div>
      </div>
      <div class="form-group" style="margin-top:14px;">
        <label class="form-label">Papel</label>
        <select class="form-select" id="sel-papel">
          ${PAPEL.map((p,i)=>`<option value="${i}">${p}</option>`).join('')}
        </select>
      </div>`,
      async (body) => {
        const cpf = body.querySelector('#inp-cpf-part').value.replace(/\D/g,'');
        const papel = parseInt(body.querySelector('#sel-papel').value);
        try {
          const clientes = await api.clientes.listar(cpf);
          if (!clientes.dados?.length) { toast('Cliente não encontrado', 'error'); return; }
          await api.put(`/projetos/${id}/participantes`, { pessoa_id: clientes.dados[0].id, papel });
          toast('Participante adicionado!', 'success'); fecharModal(); renderDetalhe(params, main);
        } catch (err) { toast(err.message, 'error'); }
      }, 'Adicionar'
    );
    aplicarMascaras(document.getElementById('modal-global'));
  };
}

// ── MODAL DE EVIDÊNCIA ────────────────────────────────────────
function abrirModalEvidencia(passo, projetoId, onSuccess) {
  const jaConcluido = passo.status === 'Concluída';
  const evidencia = passo.evidencia || {};

  // Montar campos do formulário de evidência
  const camposHtml = (passo.campos_evidencia || []).map(c => {
    const val = evidencia[c.nome] || '';
    if (c.tipo === 'select') {
      return `<div class="form-group">
        <label class="form-label">${c.label}</label>
        <select class="form-select" name="${c.nome}">
          <option value="">— Selecione —</option>
          ${(c.opcoes||[]).map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>`;
    }
    return `<div class="form-group">
      <label class="form-label">${c.label}</label>
      <input class="form-input" name="${c.nome}" type="${c.tipo||'text'}"
        value="${val}" placeholder="${c.placeholder||''}"
        ${c.mask?`data-mask="${c.mask}"`:''}
        ${c.tipo==='number'?'step="0.01"':''} />
    </div>`;
  }).join('');

  const temCampos = (passo.campos_evidencia || []).length > 0;

  abrirModal(
    jaConcluido ? `✅ ${passo.descricao.substring(0,50)}...` : passo.descricao.substring(0,60) + '...',
    `<div style="margin-bottom:16px;">
       <p style="font-size:13px;color:#333;line-height:1.6;background:#f5f6f8;padding:12px 14px;border-radius:8px;">
         ${passo.descricao}
       </p>
     </div>
     ${passo.instrucao ? `<div style="font-size:12px;color:#1565C0;background:#f0f4fb;padding:10px 14px;border-radius:8px;margin-bottom:16px;border-left:3px solid #1565C0;">
       💡 ${passo.instrucao}
     </div>` : ''}
     ${temCampos ? `<form id="form-evidencia" style="display:flex;flex-direction:column;gap:14px;">
       ${camposHtml}
     </form>` : `<p style="font-size:13px;color:#8B9FB4;text-align:center;padding:16px;">
       Confirme que este passo foi concluído para continuar.</p>`}
     ${jaConcluido ? `<div style="margin-top:12px;padding:10px 14px;background:#e8f5e9;border-radius:8px;font-size:12px;color:#2E7D32;font-weight:700;">
       ✅ Passo concluído — você pode atualizar os dados ou reabrir.
     </div>` : ''}`,
    async (body) => {
      const campos_json = {};
      if (temCampos) {
        const form = body.querySelector('#form-evidencia');
        const fd = new FormData(form);
        for (const [k,v] of fd.entries()) if (v) campos_json[k] = v;
      }
      try {
        await api.put(`/passos/${passo.id}`, { status: 'Concluída', campos_json });
        toast('✅ Passo concluído!', 'success');
        fecharModal();
        onSuccess();
      } catch (err) { toast(err.message, 'error'); }
    },
    jaConcluido ? '💾 Atualizar' : '✅ Marcar como Concluído'
  );

  aplicarMascaras(document.getElementById('modal-global'));

  // Botão de reabrir se já concluído
  if (jaConcluido) {
    const footer = document.querySelector('#modal-global .modal-footer');
    if (footer) {
      const btnReabrir = document.createElement('button');
      btnReabrir.className = 'btn btn-ghost btn-sm';
      btnReabrir.textContent = '↩️ Reabrir Passo';
      btnReabrir.onclick = async () => {
        try {
          await api.put(`/passos/${passo.id}`, { status: 'Pendente', campos_json: {} });
          toast('Passo reaberto', 'default'); fecharModal(); onSuccess();
        } catch (err) { toast(err.message, 'error'); }
      };
      footer.insertBefore(btnReabrir, footer.firstChild);
    }
  }
}

// ── TIMELINE ──────────────────────────────────────────────────
function calcProgresso(fases = []) {
  let total = 0, feitos = 0;
  fases.forEach(f => {
    (f.passos||[]).filter(Boolean).forEach(p => {
      total++;
      if (p.status === 'Concluída') feitos++;
    });
  });
  return total ? Math.round((feitos/total)*100) : 0;
}

function renderTimeline(fases = []) {
  if (!fases.length) return `<p style="color:#8B9FB4;font-size:13px;padding:16px;">Fases não encontradas.</p>`;

  const config = [
    { cor: '#2E7D32', bg: '#f0f7f0', label: 'FASE 1', fase_label: 'Planejamento Sucessório' },
    { cor: '#1565C0', bg: '#f0f4fb', label: 'FASE 2', fase_label: 'Planejamento Patrimonial' },
    { cor: '#6A1B9A', bg: '#f5f0fa', label: 'FASE 3', fase_label: 'Planejamento Tributário' },
  ];

  return fases.map((fase, idx) => {
    const cfg    = config[idx] || config[0];
    const passos = (fase.passos||[]).filter(Boolean);
    const feitos = passos.filter(p => p.status === 'Concluída').length;
    const pct    = passos.length ? Math.round((feitos/passos.length)*100) : 0;

    return `
      <div class="accordion-item" style="border:1.5px solid ${pct===100?cfg.cor:'rgba(0,0,0,0.08)'};border-radius:12px;margin:0 16px 12px;overflow:hidden;background:${pct===100?cfg.bg:'white'};">
        <div class="accordion-header" style="padding:16px 20px;cursor:pointer;background:${cfg.bg};">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:50%;border:3px solid ${cfg.cor};
              background:${pct===100?cfg.cor:'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${pct===100
                ? `<svg viewBox="0 0 24 24" width="20" height="20" stroke="white" fill="none" stroke-width="3"><polyline points="20 6 9 13 4 10"/></svg>`
                : `<span style="font-size:10px;font-weight:800;color:${cfg.cor};letter-spacing:-0.5px;">${cfg.label}</span>`}
            </div>
            <div>
              <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:14px;color:#1F4470;">${fase.nome_fase}</div>
              <div style="font-size:11px;color:#8B9FB4;margin-top:2px;">${feitos} de ${passos.length} passos · ${cfg.fase_label}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="text-align:right;">
              <div style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:20px;color:${cfg.cor};">${pct}%</div>
              <div style="width:80px;height:4px;background:rgba(0,0,0,0.08);border-radius:2px;overflow:hidden;margin-top:4px;">
                <div style="height:100%;width:${pct}%;background:${cfg.cor};border-radius:2px;transition:width 0.3s;"></div>
              </div>
            </div>
            <span style="font-size:20px;color:${cfg.cor};transition:transform 0.2s;" class="accordion-toggle">▾</span>
          </div>
        </div>
        <div class="accordion-body" style="padding:0;">
          ${passos.map((passo, pi) => {
            const concluido = passo.status === 'Concluída';
            const ev = passo.evidencia || {};
            const temEvidencia = Object.keys(ev).length > 0;

            return `
              <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 20px;
                border-top:0.5px solid rgba(0,0,0,0.06);
                background:${concluido?'rgba(0,0,0,0.015)':'white'};">

                <!-- Número / check -->
                <div style="width:28px;height:28px;border-radius:50%;border:2px solid ${concluido?cfg.cor:'#ddd'};
                  background:${concluido?cfg.cor:'white'};display:flex;align-items:center;justify-content:center;
                  flex-shrink:0;margin-top:2px;font-size:11px;font-weight:700;color:${concluido?'white':cfg.cor};">
                  ${concluido
                    ? `<svg viewBox="0 0 24 24" width="14" height="14" stroke="white" fill="none" stroke-width="3"><polyline points="20 6 9 13 4 10"/></svg>`
                    : pi+1}
                </div>

                <!-- Conteúdo -->
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;color:${concluido?'#8B9FB4':'#222'};line-height:1.5;
                    text-decoration:${concluido?'none':'none'};">
                    ${passo.descricao}
                  </div>

                  <!-- Evidências registradas -->
                  ${temEvidencia ? `
                    <div style="margin-top:8px;padding:8px 12px;background:${cfg.bg};border-radius:8px;
                      border-left:3px solid ${cfg.cor};">
                      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
                        color:${cfg.cor};margin-bottom:6px;">📎 Comprovação Registrada</div>
                      ${Object.entries(ev).map(([k,v]) => v ? `
                        <div style="font-size:12px;color:#333;margin-bottom:2px;">
                          <span style="color:#8B9FB4;text-transform:capitalize;">${k.replace(/_/g,' ')}:</span>
                          <strong>${v}</strong>
                        </div>` : '').join('')}
                    </div>` : ''}

                  ${passo.data_conclusao ? `
                    <div style="font-size:11px;color:#8B9FB4;margin-top:6px;">
                      ✅ Concluído em ${new Date(passo.data_conclusao).toLocaleDateString('pt-BR')}
                    </div>` : ''}
                </div>

                <!-- Botão de ação -->
                <button class="passo-btn ${concluido?'passo-concluido':''}"
                  data-passo='${JSON.stringify({...passo, campos_evidencia: passo.campos_evidencia||[]}).replace(/'/g,"&#39;")}'
                  style="flex-shrink:0;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;
                    border:1.5px solid ${concluido?cfg.cor:'#ddd'};
                    background:${concluido?cfg.cor:'white'};
                    color:${concluido?'white':cfg.cor};
                    cursor:pointer;white-space:nowrap;min-height:32px;">
                  ${concluido ? '✅ Ver / Editar' : '→ Concluir'}
                </button>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
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
        <div class="celula-card ${t.cls}" style="border-style:dashed;cursor:pointer;opacity:0.7;" onclick="window._novaCelula()">
          <div class="celula-type-label" style="color:${t.cor};">${t.label}</div>
          <div style="font-size:12px;color:#666;margin-top:8px;line-height:1.5;">${t.desc}</div>
          <div style="margin-top:14px;text-align:center;">
            <span style="font-size:11px;font-weight:700;color:${t.cor};padding:4px 12px;border-radius:20px;border:1px solid ${t.cor};">+ Constituir</span>
          </div>
        </div>`;
      return `
        <div class="celula-card ${t.cls}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span class="celula-type-label" style="color:${t.cor};">${t.label}</span>
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:white;color:${t.cor};">${STATUS_CEL[c.status]||'—'}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:6px;">${c.nome_celula}</div>
          ${c.cnpj?`<div style="font-size:11px;color:#666;">CNPJ: ${c.cnpj}</div>`:''}
          ${c.nire?`<div style="font-size:11px;color:#666;">NIRE: ${c.nire}</div>`:''}
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.08);display:flex;justify-content:space-between;">
            <div>
              <div class="field-label">Capital</div>
              <div style="font-size:13px;font-weight:700;color:#333;">${fmt(c.capital_social_previsto)}</div>
            </div>
            ${c.total_quotas?`<div style="text-align:right;">
              <div class="field-label">Quotas</div>
              <div style="font-size:13px;font-weight:700;color:#333;">${parseInt(c.total_quotas).toLocaleString('pt-BR')}</div>
            </div>`:''}
          </div>
          ${c.tipo===2&&c.regencia_supletiva?`
            <div style="margin-top:8px;font-size:10px;color:#6A1B9A;font-weight:700;
              background:rgba(106,27,154,0.08);padding:4px 8px;border-radius:6px;text-align:center;">
              ★ Golden Share + Regência LSA
            </div>`:''}
        </div>`;
    }).join('')}
  </div>`;
}

function renderParticipantes(participantes = []) {
  if (!participantes.length) return `<div class="empty-state" style="padding:20px;">
    <p class="empty-sub">Adicione o instituidor e herdeiros do projeto.</p></div>`;
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

// ── FORM CÉLULA ───────────────────────────────────────────────
function formCelulaHtml(participantes = []) {
  return `<form id="form-celula">
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div class="form-group">
        <label class="form-label required">Tipo de Célula</label>
        <select class="form-select" name="tipo" id="sel-tipo-celula">
          <option value="">— Selecione —</option>
          <option value="1">DESTINO — Planejamento Sucessório</option>
          <option value="0">COFRE — Planejamento Patrimonial</option>
          <option value="2">VEÍCULO — Planejamento Tributário</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label required">Nome da Célula</label>
        <input class="form-input" name="nome_celula" placeholder="Ex: Família Silva Participações Ltda." />
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Capital Social Previsto (R$)</label>
          <input class="form-input" name="capital_social_previsto" type="number" step="0.01" placeholder="0,00" />
        </div>
        <div class="form-group">
          <label class="form-label">Total de Quotas</label>
          <input class="form-input" name="total_quotas" type="number" placeholder="Ex: 100" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Administrador</label>
        <select class="form-select" name="administrador_id">
          <option value="">— Selecione —</option>
          ${participantes.map(p=>`<option value="${p.pessoa_id}">${p.nome} (${PAPEL[p.papel]||''})</option>`).join('')}
        </select>
      </div>
      <div id="bloco-veiculo" style="display:none;background:#f5f0fa;padding:12px;border-radius:8px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6A1B9A;margin-bottom:8px;">⚙️ Configurações VEÍCULO</div>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          <input type="checkbox" name="regencia_supletiva" value="true" style="width:18px;height:18px;accent-color:#6A1B9A;" />
          <div>
            <div style="font-size:13px;font-weight:700;color:#4a148c;">Regência Supletiva pela LSA</div>
            <div style="font-size:11px;color:#666;">Obrigatório para célula VEÍCULO (art. 1.053 CC)</div>
          </div>
        </label>
      </div>
      <div class="form-group">
        <label class="form-label">Objeto Social</label>
        <textarea class="form-textarea" name="objeto_social" placeholder="A sociedade tem por objeto..."></textarea>
      </div>
    </div>
  </form>`;
}

function coletarFormCelula(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  for (const [k,v] of Object.entries(d)) if (v==='') d[k]=null;
  if (d.tipo!==null) d.tipo=parseInt(d.tipo);
  if (d.capital_social_previsto) d.capital_social_previsto=parseFloat(d.capital_social_previsto);
  if (d.total_quotas) d.total_quotas=parseInt(d.total_quotas);
  if (d.administrador_id) d.administrador_id=parseInt(d.administrador_id);
  d.regencia_supletiva=!!form.querySelector('[name="regencia_supletiva"]:checked');
  return d;
}

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
            <div class="form-hint">Código gerado automaticamente: PRJ-${new Date().getFullYear()}-001</div>
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
            <label class="form-label">Observações iniciais</label>
            <textarea class="form-textarea" name="observacoes" placeholder="Notas do primeiro atendimento..."></textarea>
          </div>
        </form>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-ghost" onclick="history.back()">Cancelar</button>
          <button class="btn btn-primary" id="btn-criar">🚀 Criar Projeto + Gerar Timeline</button>
        </div>
        <div style="margin-top:16px;padding:12px 16px;background:#f0f4fb;border-radius:8px;font-size:12px;color:#1565C0;line-height:1.6;">
          <strong>O que será criado automaticamente:</strong><br>
          ✅ Código único do projeto (PRJ-${new Date().getFullYear()}-XXX)<br>
          ✅ Fase 1 — DESTINO com 10 passos (Planejamento Sucessório)<br>
          ✅ Fase 2 — COFRE com 7 passos (Planejamento Patrimonial)<br>
          ✅ Fase 3 — VEÍCULO com 7 passos (Planejamento Tributário)<br>
          ✅ Cada passo com campos de comprovação específicos
        </div>
      </div>
    </div>`;

  document.getElementById('btn-criar').onclick = async () => {
    const form  = document.getElementById('form-projeto');
    const dados = Object.fromEntries(new FormData(form).entries());
    for (const [k,v] of Object.entries(dados)) if (v==='') dados[k]=null;
    dados.modelo_escolhido = 2;
    if (dados.patrimonio_estimado) dados.patrimonio_estimado=parseFloat(dados.patrimonio_estimado);
    if (dados.itcmd_estimado) dados.itcmd_estimado=parseFloat(dados.itcmd_estimado);
    if (pessoaId) dados.pessoa_id=parseInt(pessoaId);
    if (!dados.nome_familia) { toast('Nome da família obrigatório', 'error'); return; }
    const btn = document.getElementById('btn-criar');
    btn.disabled=true; btn.textContent='Criando...';
    try {
      const proj = await api.projetos.criar(dados);
      toast(`✅ Projeto ${proj.codigo} criado com 24 passos!`, 'success');
      location.hash=`#/projetos/${proj.id}`;
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled=false; btn.textContent='🚀 Criar Projeto + Gerar Timeline';
    }
  };
}

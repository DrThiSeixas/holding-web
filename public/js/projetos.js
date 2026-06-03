import { registrarRota, setTopbar, abrirModal, fecharModal, toast, aplicarMascaras } from './app.js';
import { api, fmt, STATUS_PROJ, STATUS_CEL, PAPEL } from './api.js';

export function registrar() {
  registrarRota('#/projetos',      renderLista);
  registrarRota('#/projetos/novo', renderNovo);
  registrarRota('#/projetos/:id',  renderDetalhe);
}

// ── CONFIRMAÇÃO DE EXCLUSÃO ───────────────────────────────────
function confirmarExclusao(msg, onConfirm) {
  abrirModal('⚠️ Confirmar Exclusão',
    `<div style="text-align:center;padding:8px 0;">
       <div style="font-size:48px;margin-bottom:12px;">🗑️</div>
       <p style="font-size:14px;color:#333;line-height:1.6;">${msg}</p>
       <p style="font-size:12px;color:#c62828;margin-top:12px;font-weight:700;background:#ffebee;padding:8px 12px;border-radius:8px;">
         ⚠️ Esta ação não pode ser desfeita.
       </p>
     </div>`,
    onConfirm, '🗑️ Sim, Excluir'
  );
  setTimeout(() => {
    const btn = document.querySelector('#modal-global .btn-confirm');
    if (btn) { btn.style.background='#c62828'; btn.style.border='none'; }
  }, 50);
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
               <button class="btn btn-primary" onclick="location.hash='#/projetos/novo'">+ Novo Projeto</button>
             </div>`
          : data.dados.map(p => {
              const ini = (p.nome_familia||'??').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
              return `
                <div class="list-row" style="gap:0;">
                  <div style="display:flex;align-items:center;gap:12px;flex:1;cursor:pointer;padding-right:8px;"
                    onclick="location.hash='#/projetos/${p.id}'">
                    <div class="avatar">${ini}</div>
                    <div class="item-info">
                      <div class="item-name">Família ${p.nome_familia}</div>
                      <div class="item-sub">${p.codigo} · ${p.patrimonio_estimado ? fmt(p.patrimonio_estimado) : '—'} · ${p.total_celulas||0} célula(s)</div>
                    </div>
                    <span class="badge badge-${p.status}" style="margin-right:8px;">${STATUS_PROJ[p.status]||'—'}</span>
                  </div>
                  <button class="btn-del" data-id="${p.id}" data-nome="${p.nome_familia}"
                    title="Excluir projeto"
                    style="width:36px;height:36px;border-radius:8px;border:1px solid #ffcdd2;
                      background:white;color:#c62828;font-size:16px;cursor:pointer;flex-shrink:0;
                      display:flex;align-items:center;justify-content:center;">
                    🗑️
                  </button>
                </div>`;
            }).join('')}
      </div>
    </div>`;

  main.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      confirmarExclusao(
        `Excluir o projeto da <strong>Família ${btn.dataset.nome}</strong>?<br><br>Todos os dados serão removidos: células, passos, evidências e participantes.`,
        async () => {
          try {
            await api.projetos.excluir(btn.dataset.id);
            toast('Projeto excluído!', 'success');
            fecharModal();
            renderLista(params, main);
          } catch (err) { toast(err.message, 'error'); }
        }
      );
    });
  });
}

// ── DETALHE ───────────────────────────────────────────────────
async function renderDetalhe(params, main) {
  const { id } = params;
  const proj = await api.projetos.buscar(id);

  setTopbar(`Família ${proj.nome_familia}`, `Projetos · ${proj.codigo}`,
    `<button class="btn btn-ghost btn-sm" onclick="window._excluirProjeto()" style="color:#c62828;border-color:#ffcdd2;">🗑️ Excluir</button>
     <button class="btn btn-secondary btn-sm" onclick="window._editarStatus()">Atualizar Status</button>
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
      <div style="padding:16px;" id="triade-wrap">${renderTriade(proj.celulas, id)}</div>
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

  // Abrir primeira fase com pendências
  const fases = main.querySelectorAll('.accordion-item');
  for (const item of fases) {
    const pendentes = item.querySelectorAll('.passo-btn:not([data-concluido])').length;
    if (pendentes > 0) { item.classList.add('open'); break; }
  }

  // Botão de concluir passo
  main.querySelectorAll('.passo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const passo = JSON.parse(btn.dataset.passo);
      abrirModalEvidencia(passo, id, () => renderDetalhe(params, main));
    });
  });

  // Excluir célula
  main.querySelectorAll('.btn-del-celula').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      confirmarExclusao(
        `Excluir a célula <strong>${btn.dataset.nome}</strong>?`,
        async () => {
          try {
            await api.celulas.excluir(btn.dataset.id);
            toast('Célula excluída!', 'success');
            fecharModal();
            renderDetalhe(params, main);
          } catch (err) { toast(err.message, 'error'); }
        }
      );
    });
  });

  // Globals
  window._excluirProjeto = () => {
    confirmarExclusao(
      `Excluir o projeto da <strong>Família ${proj.nome_familia}</strong> (${proj.codigo})?<br><br>Todos os dados serão removidos permanentemente.`,
      async () => {
        try {
          await api.projetos.excluir(id);
          toast('Projeto excluído!', 'success');
          fecharModal();
          location.hash = '#/projetos';
        } catch (err) { toast(err.message, 'error'); }
      }
    );
  };

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
    jaConcluido ? '✅ Editar Comprovação' : '📋 Concluir Passo',
    `<div style="background:#f5f6f8;padding:12px 14px;border-radius:8px;margin-bottom:16px;">
       <p style="font-size:13px;color:#333;line-height:1.6;margin:0;">${passo.descricao}</p>
     </div>
     ${passo.instrucao ? `<div style="font-size:12px;color:#1565C0;background:#f0f4fb;padding:10px 14px;
       border-radius:8px;margin-bottom:16px;border-left:3px solid #1565C0;">
       💡 <strong>O que informar:</strong> ${passo.instrucao}
     </div>` : ''}
     ${temCampos ? `<form id="form-evidencia" style="display:flex;flex-direction:column;gap:12px;">
       ${camposHtml}
     </form>` : `<div style="text-align:center;padding:20px;color:#8B9FB4;">
       <div style="font-size:32px;margin-bottom:8px;">✅</div>
       <p style="font-size:13px;">Confirme que este passo foi concluído.</p>
     </div>`}
     ${jaConcluido ? `<div style="margin-top:12px;padding:10px;background:#e8f5e9;border-radius:8px;font-size:12px;color:#2E7D32;font-weight:700;text-align:center;">
       ✅ Passo já concluído — você pode atualizar os dados acima.
     </div>` : ''}`,
    async (body) => {
      const campos_json = {};
      if (temCampos) {
        const form = body.querySelector('#form-evidencia');
        if (form) {
          for (const [k,v] of new FormData(form).entries()) {
            if (v) campos_json[k] = v;
          }
        }
      }
      try {
        await api.put(`/passos/${passo.id}`, { status: 'Concluída', campos_json });
        toast('✅ Passo concluído e salvo!', 'success');
        fecharModal();
        onSuccess();
      } catch (err) { toast(err.message, 'error'); }
    },
    jaConcluido ? '💾 Atualizar' : '✅ Concluir Passo'
  );

  aplicarMascaras(document.getElementById('modal-global'));

  // Botão reabrir passo
  if (jaConcluido) {
    setTimeout(() => {
      const footer = document.querySelector('#modal-global .modal-footer');
      if (!footer) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.style.color = '#c62828';
      btn.textContent = '↩️ Reabrir';
      btn.onclick = async () => {
        try {
          await api.put(`/passos/${passo.id}`, { status: 'Pendente', campos_json: {} });
          toast('Passo reaberto', 'default'); fecharModal(); onSuccess();
        } catch (err) { toast(err.message, 'error'); }
      };
      footer.insertBefore(btn, footer.firstChild);
    }, 50);
  }
}

// ── TIMELINE ──────────────────────────────────────────────────
function calcProgresso(fases = []) {
  let total = 0, feitos = 0;
  fases.forEach(f => (f.passos||[]).filter(Boolean).forEach(p => { total++; if(p.status==='Concluída') feitos++; }));
  return total ? Math.round((feitos/total)*100) : 0;
}

function renderTimeline(fases = []) {
  if (!fases.length) return `<p style="color:#8B9FB4;font-size:13px;padding:16px;">Fases não encontradas.</p>`;
  const cfg = [
    { cor:'#2E7D32', bg:'#f0f7f0', label:'F1', titulo:'Planejamento Sucessório' },
    { cor:'#1565C0', bg:'#f0f4fb', label:'F2', titulo:'Planejamento Patrimonial' },
    { cor:'#6A1B9A', bg:'#f5f0fa', label:'F3', titulo:'Planejamento Tributário' },
  ];

  return fases.map((fase, idx) => {
    const c = cfg[idx] || cfg[0];
    const passos = (fase.passos||[]).filter(Boolean);
    const feitos = passos.filter(p=>p.status==='Concluída').length;
    const pct = passos.length ? Math.round((feitos/passos.length)*100) : 0;

    return `
      <div class="accordion-item" style="border:1.5px solid ${pct===100?c.cor:'rgba(0,0,0,0.08)'};
        border-radius:12px;margin:0 16px 12px;overflow:hidden;">
        <div class="accordion-header" style="padding:14px 20px;cursor:pointer;background:${c.bg};">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:40px;height:40px;border-radius:50%;border:3px solid ${c.cor};
              background:${pct===100?c.cor:'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${pct===100
                ? `<svg viewBox="0 0 24 24" width="18" height="18" stroke="white" fill="none" stroke-width="3"><polyline points="20 6 9 13 4 10"/></svg>`
                : `<span style="font-size:11px;font-weight:800;color:${c.cor};">${c.label}</span>`}
            </div>
            <div>
              <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:13px;color:#1F4470;">${fase.nome_fase}</div>
              <div style="font-size:11px;color:#8B9FB4;">${feitos}/${passos.length} passos · ${c.titulo}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div>
              <div style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:22px;color:${c.cor};">${pct}%</div>
              <div style="width:80px;height:4px;background:rgba(0,0,0,0.08);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${c.cor};border-radius:2px;"></div>
              </div>
            </div>
            <span class="accordion-toggle" style="font-size:20px;color:${c.cor};">▾</span>
          </div>
        </div>
        <div class="accordion-body" style="padding:0;">
          ${passos.map((passo, pi) => {
            const ok = passo.status === 'Concluída';
            const ev = passo.evidencia || {};
            const temEv = Object.keys(ev).filter(k=>ev[k]).length > 0;
            return `
              <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 20px;
                border-top:0.5px solid rgba(0,0,0,0.05);background:${ok?'rgba(0,0,0,0.01)':'white'};">
                <div style="width:26px;height:26px;border-radius:50%;border:2px solid ${ok?c.cor:'#ddd'};
                  background:${ok?c.cor:'white'};display:flex;align-items:center;justify-content:center;
                  flex-shrink:0;margin-top:2px;font-size:11px;font-weight:700;color:${ok?'white':c.cor};">
                  ${ok ? `<svg viewBox="0 0 24 24" width="13" height="13" stroke="white" fill="none" stroke-width="3"><polyline points="20 6 9 13 4 10"/></svg>` : pi+1}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;color:${ok?'#8B9FB4':'#222'};line-height:1.5;">${passo.descricao}</div>
                  ${temEv ? `
                    <div style="margin-top:8px;padding:8px 12px;background:${c.bg};border-radius:8px;border-left:3px solid ${c.cor};">
                      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${c.cor};margin-bottom:4px;">📎 Comprovação</div>
                      ${Object.entries(ev).filter(([,v])=>v).map(([k,v])=>`
                        <div style="font-size:12px;color:#333;margin-bottom:2px;">
                          <span style="color:#8B9FB4;">${k.replace(/_/g,' ')}:</span> <strong>${v}</strong>
                        </div>`).join('')}
                    </div>` : ''}
                  ${passo.data_conclusao ? `<div style="font-size:11px;color:#8B9FB4;margin-top:4px;">
                    Concluído em ${new Date(passo.data_conclusao).toLocaleDateString('pt-BR')}
                  </div>` : ''}
                </div>
                <button class="passo-btn" ${ok?'data-concluido':''}
                  data-passo='${JSON.stringify({
                    id: passo.id, descricao: passo.descricao, status: passo.status,
                    instrucao: passo.instrucao||'', campos_evidencia: passo.campos_evidencia||[],
                    evidencia: ev, data_conclusao: passo.data_conclusao
                  }).replace(/'/g,"&#39;").replace(/"/g,"&quot;")}'
                  style="flex-shrink:0;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;
                    border:1.5px solid ${ok?c.cor:'#ddd'};background:${ok?c.cor:'white'};
                    color:${ok?'white':c.cor};cursor:pointer;white-space:nowrap;min-height:30px;min-width:90px;">
                  ${ok ? '✅ Ver/Editar' : '→ Concluir'}
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
    { tipo:1, label:'DESTINO',  cls:'celula-card-destino', cor:'#2E7D32', desc:'Transmissão e Sucessão' },
    { tipo:0, label:'COFRE',    cls:'celula-card-cofre',   cor:'#1565C0', desc:'Proteção Patrimonial' },
    { tipo:2, label:'VEÍCULO',  cls:'celula-card-veiculo',  cor:'#6A1B9A', desc:'Controle e Golden Share' },
  ];
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
    ${tipos.map(t => {
      const c = celulas.find(x=>x.tipo===t.tipo);
      if (!c) return `
        <div class="celula-card ${t.cls}" style="border-style:dashed;cursor:pointer;opacity:0.7;" onclick="window._novaCelula()">
          <div class="celula-type-label" style="color:${t.cor};">${t.label}</div>
          <div style="font-size:12px;color:#666;margin-top:8px;">${t.desc}</div>
          <div style="margin-top:14px;text-align:center;">
            <span style="font-size:11px;font-weight:700;color:${t.cor};padding:4px 12px;border-radius:20px;border:1px solid ${t.cor};">+ Constituir</span>
          </div>
        </div>`;
      return `
        <div class="celula-card ${t.cls}" style="position:relative;">
          <button class="btn-del-celula" data-id="${c.id}" data-nome="${c.nome_celula}"
            title="Excluir célula"
            style="position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:6px;
              border:1px solid rgba(198,40,40,0.3);background:white;color:#c62828;font-size:13px;
              cursor:pointer;display:flex;align-items:center;justify-content:center;">🗑️</button>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-right:30px;">
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
              <div style="font-size:13px;font-weight:700;">${parseInt(c.total_quotas).toLocaleString('pt-BR')}</div>
            </div>`:''}
          </div>
          ${c.tipo===2&&c.regencia_supletiva?`<div style="margin-top:8px;font-size:10px;color:#6A1B9A;font-weight:700;background:rgba(106,27,154,0.08);padding:4px 8px;border-radius:6px;text-align:center;">★ Golden Share + Regência LSA</div>`:''}
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
  const ano = new Date().getFullYear();

  main.innerHTML = `
    <div class="card" style="max-width:600px;">
      <div class="card-header"><span class="card-header-title">Criar Projeto de Holding</span></div>
      <div class="card-body">
        <form id="form-projeto" style="display:flex;flex-direction:column;gap:16px;">
          <div class="form-group">
            <label class="form-label required">Nome da Família</label>
            <input class="form-input" name="nome_familia" placeholder="Ex: Silva" />
            <div class="form-hint">Código gerado automaticamente: PRJ-${ano}-XXX</div>
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
        <div style="margin-top:16px;padding:12px 16px;background:#f0f4fb;border-radius:8px;font-size:12px;color:#1565C0;line-height:1.8;">
          <strong>O que será criado automaticamente:</strong><br>
          ✅ Código único (PRJ-${ano}-XXX)<br>
          ✅ Fase 1 — DESTINO · 10 passos com comprovação<br>
          ✅ Fase 2 — COFRE · 7 passos com comprovação<br>
          ✅ Fase 3 — VEÍCULO · 7 passos com comprovação<br>
          📋 Total: 24 passos rastreáveis com evidências
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

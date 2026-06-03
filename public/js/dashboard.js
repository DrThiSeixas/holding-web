import { registrarRota, setTopbar, toast } from './app.js';
import { api, fmt, STATUS_PROJ } from './api.js';

export function registrar() {
  registrarRota('#/', renderDashboard);
}

const TIPO_CEL_LABEL = ['Cofre', 'Destino', 'Veículo'];
const FASES_COLOR    = ['#1565C0', '#2E7D32', '#6A1B9A'];

async function renderDashboard(params, main) {
  setTopbar('Dashboard', '',
    `<button class="btn btn-primary btn-sm" onclick="location.hash='#/clientes/novo'">
       <i class="ti ti-plus" aria-hidden="true"></i> Novo Cliente
     </button>`
  );

  const data = await api.dashboard();
  const m    = data.metricas;

  main.innerHTML = `
    <h2 class="sr-only">Painel principal do sistema Holding Web</h2>

    <!-- Métricas -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Casos Ativos</div>
        <div class="metric-value">${m.casos_ativos}</div>
        <div class="metric-sub">${m.casos_em_execucao} em execução</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Patrimônio Total</div>
        <div class="metric-value">${fmt(m.patrimonio_total)}</div>
        <div class="metric-sub">sob gestão</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Honorários / Mês</div>
        <div class="metric-value">${fmt(m.honorarios_mes)}</div>
        <div class="metric-sub ${m.parcelas_vencendo > 0 ? 'warn' : ''}">
          ${m.parcelas_vencendo > 0 ? `${m.parcelas_vencendo} parcela(s) vencendo` : 'Em dia'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Docs / Mês</div>
        <div class="metric-value">${m.documentos_mes}</div>
        <div class="metric-sub good">gerados este mês</div>
      </div>
    </div>

    <!-- Grid principal -->
    <div class="main-grid">
      <!-- Casos recentes -->
      <div class="card">
        <div class="card-header">
          <span class="card-header-title">Casos Recentes</span>
          <a href="#/projetos" style="font-size:12px;color:#8B9FB4;font-weight:700;">Ver todos</a>
        </div>
        <div id="lista-casos">
          ${data.casos_recentes.length === 0
            ? `<div class="empty-state"><p class="empty-title">Nenhum caso ativo</p></div>`
            : data.casos_recentes.map(c => casoRowHtml(c)).join('')
          }
        </div>
      </div>

      <!-- Pendências -->
      <div class="card" style="display:flex;flex-direction:column;">
        <div class="card-header">
          <span class="card-header-title">Pendências</span>
        </div>
        <div id="pendencias-lista">
          ${renderPendencias(data.casos_recentes)}
        </div>
        <div style="padding:14px 16px;margin-top:auto;border-top:0.5px solid rgba(0,0,0,0.06);">
          <button class="btn btn-secondary w-full btn-sm"
            onclick="location.hash='#/projetos/novo'">
            <i class="ti ti-plus" aria-hidden="true"></i> Novo Projeto
          </button>
        </div>
      </div>
    </div>
  `;
}

function casoRowHtml(c) {
  const pct = c.total_celulas > 0
    ? Math.round((c.celulas_ativas / c.total_celulas) * 100)
    : 0;
  const status = parseInt(c.status);
  const labels = ['Captação','Diagnóstico','Proposta','Contratado','Em Execução','Concluído','Cancelado'];
  const cor = FASES_COLOR[status % FASES_COLOR.length] || '#1565C0';
  const iniciais = c.nome_familia.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();

  return `
    <div class="list-row" onclick="location.hash='#/projetos/${c.id}'" role="button" tabindex="0">
      <div class="avatar">${iniciais}</div>
      <div class="item-info">
        <div class="item-name">Família ${c.nome_familia}</div>
        <div class="item-sub">${c.codigo} · ${c.patrimonio_estimado ? fmt(c.patrimonio_estimado) : '—'}</div>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${cor};"></div>
        </div>
        <div class="progress-label">${pct}%</div>
      </div>
      <span class="badge badge-${status}">${labels[status] || '—'}</span>
    </div>
  `;
}

function renderPendencias(casos) {
  const pends = [];

  for (const c of casos) {
    if (parseInt(c.status) === 4 && c.celulas_ativas < c.total_celulas) {
      pends.push({
        cor: '#1565C0',
        texto: `Célula pendente de registro`,
        sub: `Família ${c.nome_familia}`,
      });
    }
    if (parseInt(c.status) <= 2) {
      pends.push({
        cor: '#e65100',
        texto: `Diagnóstico aguardando`,
        sub: `${c.codigo} · ${c.nome_familia}`,
      });
    }
  }

  if (pends.length === 0) {
    return `<div class="empty-state" style="padding:32px 16px;">
      <i class="ti ti-circle-check" style="font-size:32px;color:#2E7D32;"></i>
      <p class="empty-sub">Sem pendências no momento</p>
    </div>`;
  }

  return pends.slice(0, 6).map(p => `
    <div class="pend-item">
      <div class="pend-dot" style="background:${p.cor};"></div>
      <div>
        <div style="font-size:12px;color:#333;line-height:1.4;">${p.texto}</div>
        <div style="font-size:11px;color:#8B9FB4;">${p.sub}</div>
      </div>
    </div>
  `).join('');
}

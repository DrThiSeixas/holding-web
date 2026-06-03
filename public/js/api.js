// ── API Wrapper — Holding Web ──────────────────────────────────
// Centraliza todos os fetches com token JWT automático

const BASE = '/api';

function getToken() {
  return localStorage.getItem('hw_token');
}

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(method, path, body) {
  try {
    const opts = { method, headers: headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);

    // Token expirado → logout
    if (res.status === 401) {
      localStorage.removeItem('hw_token');
      localStorage.removeItem('hw_usuario');
      window.location.hash = '#/login';
      return null;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  } catch (err) {
    console.error(`[API] ${method} ${path}`, err);
    throw err;
  }
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),
  patch:  (path, body)  => request('PATCH',  path, body),

  // ── Auth ─────────────────────────────────────────────────
  login: (email, senha) => request('POST', '/auth/login', { email, senha }),

  // ── Dashboard ─────────────────────────────────────────────
  dashboard: () => request('GET', '/dashboard'),

  // ── Clientes ─────────────────────────────────────────────
  clientes: {
    listar:  (q = '', page = 1) => request('GET', `/clientes?q=${encodeURIComponent(q)}&page=${page}`),
    buscar:  (id)               => request('GET', `/clientes/${id}`),
    criar:   (dados)            => request('POST', '/clientes', dados),
    atualizar:(id, dados)       => request('PUT', `/clientes/${id}`, dados),
    remover: (id)               => request('DELETE', `/clientes/${id}`),
  },

  // ── Projetos ──────────────────────────────────────────────
  projetos: {
    listar:  (status)           => request('GET', `/projetos${status !== undefined ? `?status=${status}` : ''}`),
    buscar:  (id)               => request('GET', `/projetos/${id}`),
    criar:   (dados)            => request('POST', '/projetos', dados),
    atualizar:(id, dados)       => request('PUT', `/projetos/${id}`, dados),
    addParticipante:(id, dados) => request('POST', `/projetos/${id}/participantes`, dados),
  },

  // ── Células ───────────────────────────────────────────────
  celulas: {
    listarPorProjeto:(projetoId) => request('GET', `/celulas/projeto/${projetoId}`),
    buscar:  (id)               => request('GET', `/celulas/${id}`),
    criar:   (dados)            => request('POST', '/celulas', dados),
    atualizar:(id, dados)       => request('PUT', `/celulas/${id}`, dados),
    addCnae: (id, dados)        => request('POST', `/celulas/${id}/cnaes`, dados),
    remCnae: (id, codigo)       => request('DELETE', `/celulas/${id}/cnaes/${codigo}`),
    socios:  (id)               => request('GET', `/celulas/${id}/socios`),
    addSocio:(id, dados)        => request('POST', `/celulas/${id}/socios`, dados),
    updSocio:(id, dados)        => request('PUT', `/socios/${id}`, dados),
    remSocio:(id)               => request('DELETE', `/socios/${id}`),
  },

  // ── Bens ──────────────────────────────────────────────────
  bens: {
    listarPorProjeto:(projetoId) => request('GET', `/bens/projeto/${projetoId}`),
    criar:   (dados)            => request('POST', '/bens', dados),
    atualizar:(id, dados)       => request('PUT', `/bens/${id}`, dados),
  },

  // ── Honorários ────────────────────────────────────────────
  honorarios: {
    buscar:  (projetoId)        => request('GET', `/honorarios/${projetoId}`),
    criar:   (dados)            => request('POST', '/honorarios', dados),
    pagar:   (parcelaId, dados) => request('PUT', `/honorarios/parcelas/${parcelaId}/pagar`, dados),
  },

  // ── CEP ───────────────────────────────────────────────────
  cep: (cep) => request('GET', `/cep/${cep.replace(/\D/g, '')}`),
};

// ── Helpers de formatação ─────────────────────────────────────
export function fmt(v, tipo = 'moeda') {
  if (v === null || v === undefined) return '—';
  switch (tipo) {
    case 'moeda':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    case 'cpf':
      return String(v).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    case 'cnpj':
      return String(v).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    case 'data':
      return new Date(v).toLocaleDateString('pt-BR');
    case 'pct':
      return `${Number(v).toFixed(2).replace('.', ',')}%`;
    default:
      return String(v);
  }
}

export const ESTADO_CIVIL = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];
export const REGIME_BENS  = ['Comunhão Parcial', 'Comunhão Universal', 'Sep. Convencional', 'Sep. Obrigatória', 'Participação nos Aquestos'];
export const PAPEL        = ['Instituidor', 'Cônjuge', 'Herdeiro', 'Administrador', 'Procurador', 'Testemunha'];
export const STATUS_PROJ  = ['Captação', 'Diagnóstico', 'Proposta', 'Contratado', 'Em Execução', 'Concluído', 'Cancelado'];
export const TIPO_CELULA  = ['Cofre', 'Destino', 'Veículo'];
export const STATUS_CEL   = ['Em criação', 'Em constituição', 'Constituída', 'Registrada na Junta', 'Ativa', 'Encerrada'];
export const TIPO_BEM     = ['Imóvel Urbano', 'Imóvel Rural', 'Veículo', 'Participação Soc.', 'Investimento', 'Outro'];
export const TIPO_QUOTA   = ['Ordinária', 'Preferencial (Golden Share)'];

const BASE = '/api';
function getToken() { return localStorage.getItem('hw_token'); }
function headers() {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken(); if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}
async function request(method, path, body) {
  try {
    const opts = { method, headers: headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    if (res.status === 401) {
      localStorage.removeItem('hw_token'); localStorage.removeItem('hw_usuario');
      window.location.hash = '#/login'; return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  } catch (err) { console.error(`[API] ${method} ${path}`, err); throw err; }
}

export const api = {
  get:    (path, body)  => request('GET',    path, body),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),

  login:     (email, senha) => request('POST', '/auth/login', { email, senha }),
  dashboard: ()             => request('GET', '/dashboard'),

  clientes: {
    listar:    (q='', page=1) => request('GET', `/clientes?q=${encodeURIComponent(q)}&page=${page}`),
    buscar:    (id)           => request('GET', `/clientes/${id}`),
    criar:     (dados)        => request('POST', '/clientes', dados),
    atualizar: (id, dados)    => request('PUT', `/clientes/${id}`, dados),
  },

  projetos: {
    listar:    ()          => request('GET', '/projetos'),
    buscar:    (id)        => request('GET', `/projetos/${id}`),
    criar:     (dados)     => request('POST', '/projetos', dados),
    atualizar: (id, dados) => request('PUT', `/projetos/${id}`, dados),
    excluir:   (id)        => request('DELETE', `/projetos/${id}`),
  },

  celulas: {
    listarPorProjeto: (pid) => request('GET', `/celulas/projeto/${pid}`),
    criar:     (dados)      => request('POST', '/celulas', dados),
    atualizar: (id, dados)  => request('PUT', `/celulas/${id}`, dados),
    excluir:   (id)         => request('DELETE', `/celulas/${id}`),
  },

  bens: {
    listarPorProjeto: (pid) => request('GET', `/bens/projeto/${pid}`),
    criar:     (dados)      => request('POST', '/bens', dados),
    atualizar: (id, dados)  => request('PUT', `/bens/${id}`, dados),
  },

  cep: (cep) => request('GET', `/cep/${cep.replace(/\D/g,'')}`),
};

export function fmt(v, tipo='moeda') {
  if (v===null||v===undefined) return '—';
  switch(tipo) {
    case 'moeda': return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
    case 'cpf':   return String(v).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
    case 'cnpj':  return String(v).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');
    case 'data':  return new Date(v).toLocaleDateString('pt-BR');
    case 'pct':   return `${Number(v).toFixed(2).replace('.',',')}%`;
    default: return String(v);
  }
}

export const ESTADO_CIVIL = ['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União Estável'];
export const REGIME_BENS  = ['Comunhão Parcial','Comunhão Universal','Sep. Convencional','Sep. Obrigatória','Participação nos Aquestos'];
export const PAPEL        = ['Instituidor','Cônjuge','Herdeiro','Administrador','Procurador','Testemunha'];
export const STATUS_PROJ  = ['Captação','Diagnóstico','Proposta','Contratado','Em Execução','Concluído','Cancelado'];
export const TIPO_CELULA  = ['Cofre','Destino','Veículo'];
export const STATUS_CEL   = ['Em criação','Em constituição','Constituída','Registrada na Junta','Ativa','Encerrada'];
export const TIPO_BEM     = ['Imóvel Urbano','Imóvel Rural','Veículo','Participação Soc.','Investimento','Outro'];

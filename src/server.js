require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { Pool } = require('pg');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { FASES_PADRAO } = require('./fases-padrao');

const app  = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ erro: 'Token ausente' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ erro: 'Token inválido' }); }
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', versao: '1.0.0' }));

// ── Login ─────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });
    const r = await pool.query('SELECT * FROM usuarios WHERE email=$1 AND ativo=true', [email.toLowerCase().trim()]);
    if (!r.rows.length) return res.status(401).json({ erro: 'Credenciais inválidas' });
    const u = r.rows[0];
    if (!await bcrypt.compare(senha, u.senha_hash)) return res.status(401).json({ erro: 'Credenciais inválidas' });
    await pool.query('UPDATE usuarios SET ultimo_acesso=NOW() WHERE id=$1', [u.id]);
    const token = jwt.sign({ id: u.id, nome: u.nome, email: u.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, usuario: { id: u.id, nome: u.nome, email: u.email, oab_numero: u.oab_numero } });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
});

// ── Dashboard ─────────────────────────────────────────────────
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const casos    = await pool.query(`SELECT COUNT(*) FILTER (WHERE status NOT IN (5,6)) AS ativos, COUNT(*) FILTER (WHERE status=4) AS em_execucao, COUNT(*) AS total FROM projetos WHERE deleted_at IS NULL`);
    const patrim   = await pool.query(`SELECT COALESCE(SUM(patrimonio_estimado),0) AS total FROM projetos WHERE deleted_at IS NULL AND status NOT IN (5,6)`);
    const recentes = await pool.query(`SELECT p.id,p.codigo,p.nome_familia,p.status,p.patrimonio_estimado,(SELECT COUNT(*) FROM celulas c WHERE c.projeto_id=p.id AND c.deleted_at IS NULL) AS total_celulas,(SELECT COUNT(*) FROM celulas c WHERE c.projeto_id=p.id AND c.status>=2 AND c.deleted_at IS NULL) AS celulas_ativas FROM projetos p WHERE p.deleted_at IS NULL ORDER BY p.updated_at DESC LIMIT 10`);
    res.json({ metricas: { casos_ativos: parseInt(casos.rows[0].ativos), casos_em_execucao: parseInt(casos.rows[0].em_execucao), casos_total: parseInt(casos.rows[0].total), patrimonio_total: parseFloat(patrim.rows[0].total), honorarios_mes: 0, documentos_mes: 0, parcelas_vencendo: 0 }, casos_recentes: recentes.rows });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Clientes ──────────────────────────────────────────────────
app.get('/api/clientes', auth, async (req, res) => {
  try {
    const { q='', page=1 } = req.query;
    const offset = (parseInt(page)-1)*20;
    let sql = 'SELECT id,nome,cpf,celular,email,estado_civil,cidade,uf,ativo FROM pessoas_fisicas WHERE deleted_at IS NULL';
    const params=[];
    if (q) { params.push(`%${q}%`); sql+=` AND (nome ILIKE $1 OR cpf ILIKE $1)`; }
    sql+=` ORDER BY nome LIMIT 20 OFFSET ${offset}`;
    const r = await pool.query(sql, params);
    const c = await pool.query(`SELECT COUNT(*) FROM pessoas_fisicas WHERE deleted_at IS NULL${q?` AND (nome ILIKE $1 OR cpf ILIKE $1)`:''}`, q?[`%${q}%`]:[]);
    res.json({ dados: r.rows, total: parseInt(c.rows[0].count), pagina: parseInt(page), limite: 20 });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/clientes/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM pessoas_fisicas WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ erro: 'Não encontrado' });
    const projs = await pool.query(`SELECT proj.id,proj.codigo,proj.nome_familia,proj.status,pt.papel FROM participantes pt JOIN projetos proj ON proj.id=pt.projeto_id WHERE pt.pessoa_id=$1 AND pt.deleted_at IS NULL ORDER BY proj.created_at DESC`, [req.params.id]);
    res.json({ ...r.rows[0], projetos: projs.rows });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/clientes', auth, async (req, res) => {
  try {
    const d = req.body;
    if (!d.nome || !d.cpf) return res.status(400).json({ erro: 'Nome e CPF obrigatórios' });
    const r = await pool.query(`INSERT INTO pessoas_fisicas (nome,cpf,rg,profissao,estado_civil,regime_bens,cep,logradouro,numero,complemento,bairro,cidade,uf,celular,email,whatsapp,observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [d.nome,d.cpf,d.rg||null,d.profissao||null,d.estado_civil||0,d.regime_bens||null,d.cep||null,d.logradouro||null,d.numero||null,d.complemento||null,d.bairro||null,d.cidade||null,d.uf||null,d.celular||null,d.email||null,d.whatsapp||null,d.observacoes||null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/api/clientes/:id', auth, async (req, res) => {
  try {
    const campos=['nome','cpf','profissao','estado_civil','regime_bens','cep','logradouro','numero','complemento','bairro','cidade','uf','celular','email','whatsapp','observacoes'];
    const sets=[],vals=[];
    for (const [k,v] of Object.entries(req.body)) { if(campos.includes(k)){sets.push(`${k}=$${vals.length+1}`);vals.push(v);} }
    if (!sets.length) return res.status(400).json({ erro: 'Nenhum campo' });
    sets.push('updated_at=NOW()'); vals.push(req.params.id);
    const r = await pool.query(`UPDATE pessoas_fisicas SET ${sets.join(',')} WHERE id=$${vals.length} AND deleted_at IS NULL RETURNING *`, vals);
    if (!r.rows.length) return res.status(404).json({ erro: 'Não encontrado' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Projetos ──────────────────────────────────────────────────
app.get('/api/projetos', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT p.id,p.codigo,p.nome_familia,p.nome_projeto,p.status,p.patrimonio_estimado,p.created_at,(SELECT COUNT(*) FROM celulas c WHERE c.projeto_id=p.id AND c.deleted_at IS NULL) AS total_celulas FROM projetos p WHERE p.deleted_at IS NULL ORDER BY p.updated_at DESC`);
    res.json({ dados: r.rows });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/projetos/:id', auth, async (req, res) => {
  try {
    const p     = await pool.query('SELECT * FROM projetos WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!p.rows.length) return res.status(404).json({ erro: 'Não encontrado' });
    const parts = await pool.query(`SELECT pt.*,pf.nome,pf.cpf,pf.celular FROM participantes pt JOIN pessoas_fisicas pf ON pf.id=pt.pessoa_id WHERE pt.projeto_id=$1 AND pt.deleted_at IS NULL`, [req.params.id]);
    const cels  = await pool.query('SELECT * FROM celulas WHERE projeto_id=$1 AND deleted_at IS NULL ORDER BY tipo', [req.params.id]);

    // Buscar fases com passos + evidências + campos de evidência do template
    const fases = await pool.query(`
      SELECT f.*,
        json_agg(
          jsonb_build_object(
            'id', pp.id,
            'ordem', pp.ordem,
            'descricao', pp.descricao,
            'status', pp.status,
            'data_conclusao', pp.data_conclusao,
            'observacoes', pp.observacoes,
            'evidencia', pe.campos_json,
            'campos_evidencia', pp.observacoes
          ) ORDER BY pp.ordem
        ) FILTER (WHERE pp.id IS NOT NULL) AS passos
      FROM fases_projeto f
      LEFT JOIN passos_fase pp ON pp.fase_id=f.id AND pp.deleted_at IS NULL
      LEFT JOIN passos_evidencias pe ON pe.passo_id=pp.id
      WHERE f.projeto_id=$1 AND f.deleted_at IS NULL
      GROUP BY f.id
      ORDER BY f.numero_fase`, [req.params.id]);

    // Enriquecer passos com campos_evidencia do FASES_PADRAO
    const fasesEnriquecidas = fases.rows.map(fase => {
      const faseTemplate = FASES_PADRAO.find(ft => ft.numero === fase.numero_fase);
      const passos = (fase.passos||[]).map(passo => {
        const passoTemplate = faseTemplate?.passos?.find(pt => pt.ordem === passo.ordem);
        return {
          ...passo,
          instrucao: passoTemplate?.instrucao || '',
          campos_evidencia: passoTemplate?.campos || [],
          evidencia: passo.evidencia || {},
        };
      });
      return { ...fase, passos };
    });

    res.json({ ...p.rows[0], participantes: parts.rows, celulas: cels.rows, fases: fasesEnriquecidas });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/projetos', auth, async (req, res) => {
  try {
    const { nome_familia, nome_projeto, modelo_escolhido=2, patrimonio_estimado, itcmd_estimado, pessoa_id, observacoes } = req.body;
    if (!nome_familia) return res.status(400).json({ erro: 'Nome da família obrigatório' });
    const ano = new Date().getFullYear();
    const seq = await pool.query(`SELECT COUNT(*)+1 AS n FROM projetos WHERE codigo LIKE $1`, [`PRJ-${ano}-%`]);
    const codigo = `PRJ-${ano}-${String(parseInt(seq.rows[0].n)).padStart(3,'0')}`;
    const r = await pool.query(
      `INSERT INTO projetos (codigo,nome_projeto,nome_familia,modelo_escolhido,patrimonio_estimado,itcmd_estimado,observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [codigo, nome_projeto||`Holding Família ${nome_familia}`, nome_familia, modelo_escolhido, patrimonio_estimado||null, itcmd_estimado||null, observacoes||null]
    );
    const proj = r.rows[0];
    if (pessoa_id) await pool.query('INSERT INTO participantes (projeto_id,pessoa_id,papel) VALUES ($1,$2,0) ON CONFLICT DO NOTHING', [proj.id, pessoa_id]);

    // Criar fases e passos do fluxograma oficial
    for (const fase of FASES_PADRAO) {
      const fR = await pool.query('INSERT INTO fases_projeto (projeto_id,numero_fase,nome_fase,status) VALUES ($1,$2,$3,$4) RETURNING id',
        [proj.id, fase.numero, fase.nome, 'Pendente']);
      for (const passo of fase.passos) {
        await pool.query('INSERT INTO passos_fase (fase_id,ordem,descricao,status) VALUES ($1,$2,$3,$4)',
          [fR.rows[0].id, passo.ordem, passo.descricao, 'Pendente']);
      }
    }
    res.status(201).json(proj);
  } catch (e) { console.error(e); res.status(500).json({ erro: e.message }); }
});

app.put('/api/projetos/:id', auth, async (req, res) => {
  try {
    const campos=['nome_familia','nome_projeto','status','patrimonio_estimado','itcmd_estimado','economia_estimada','observacoes'];
    const sets=[],vals=[];
    for (const [k,v] of Object.entries(req.body)) { if(campos.includes(k)){sets.push(`${k}=$${vals.length+1}`);vals.push(v);} }
    if (!sets.length) return res.status(400).json({ erro: 'Nenhum campo' });
    sets.push('updated_at=NOW()'); vals.push(req.params.id);
    const r = await pool.query(`UPDATE projetos SET ${sets.join(',')} WHERE id=$${vals.length} AND deleted_at IS NULL RETURNING *`, vals);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/api/projetos/:id/participantes', auth, async (req, res) => {
  try {
    const { pessoa_id, papel=0 } = req.body;
    if (!pessoa_id) return res.status(400).json({ erro: 'pessoa_id obrigatório' });
    await pool.query('INSERT INTO participantes (projeto_id,pessoa_id,papel) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [req.params.id, pessoa_id, papel]);
    res.json({ mensagem: 'Participante adicionado' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Passos — concluir com evidência ───────────────────────────
app.put('/api/passos/:id', auth, async (req, res) => {
  try {
    const { status, campos_json } = req.body;
    const r = await pool.query(
      `UPDATE passos_fase SET status=$1, data_conclusao=${status==='Concluída'?'NOW()':'NULL'}, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ erro: 'Passo não encontrado' });

    // Salvar/atualizar evidência
    if (campos_json && Object.keys(campos_json).length > 0) {
      await pool.query(`
        INSERT INTO passos_evidencias (passo_id, campos_json)
        VALUES ($1, $2)
        ON CONFLICT (passo_id) DO UPDATE SET campos_json=$2, updated_at=NOW()`,
        [req.params.id, JSON.stringify(campos_json)]
      );
    } else if (status === 'Pendente') {
      // Limpar evidência ao reabrir
      await pool.query('DELETE FROM passos_evidencias WHERE passo_id=$1', [req.params.id]);
    }

    res.json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ erro: e.message }); }
});

// ── Células ───────────────────────────────────────────────────
app.get('/api/celulas/projeto/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM celulas WHERE projeto_id=$1 AND deleted_at IS NULL ORDER BY tipo', [req.params.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/celulas', auth, async (req, res) => {
  try {
    const d = req.body;
    if (!d.projeto_id||d.tipo===undefined||!d.nome_celula) return res.status(400).json({ erro: 'Campos obrigatórios ausentes' });
    const r = await pool.query(
      `INSERT INTO celulas (projeto_id,tipo,nome_celula,objeto_social,capital_social_previsto,total_quotas,valor_quota,administrador_id,regencia_supletiva,observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [d.projeto_id,d.tipo,d.nome_celula,d.objeto_social||null,d.capital_social_previsto||0,d.total_quotas||null,d.valor_quota||null,d.administrador_id||null,d.regencia_supletiva||false,d.observacoes||null]
    );
    await pool.query(`UPDATE projetos SET status=GREATEST(status,4),updated_at=NOW() WHERE id=$1`, [d.projeto_id]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/api/celulas/:id', auth, async (req, res) => {
  try {
    const campos=['status','nome_celula','razao_social','cnpj','nire','inscricao_estadual','inscricao_municipal','data_constituicao','data_registro','objeto_social','capital_social_previsto','capital_social_efetivo','total_quotas','valor_quota','administrador_id','regencia_supletiva','observacoes'];
    const sets=[],vals=[];
    for (const [k,v] of Object.entries(req.body)) { if(campos.includes(k)){sets.push(`${k}=$${vals.length+1}`);vals.push(v);} }
    if (!sets.length) return res.status(400).json({ erro: 'Nenhum campo' });
    sets.push('updated_at=NOW()'); vals.push(req.params.id);
    const r = await pool.query(`UPDATE celulas SET ${sets.join(',')} WHERE id=$${vals.length} AND deleted_at IS NULL RETURNING *`, vals);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Bens ──────────────────────────────────────────────────────
app.get('/api/bens/projeto/:id', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT b.*,pf.nome AS nome_proprietario FROM bens b JOIN pessoas_fisicas pf ON pf.id=b.proprietario_id WHERE b.projeto_id=$1 AND b.deleted_at IS NULL ORDER BY b.tipo,b.valor_mercado DESC`, [req.params.id]);
    const total = r.rows.reduce((s,b)=>s+parseFloat(b.valor_mercado||0),0);
    res.json({ dados: r.rows, totais: { total } });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/bens', auth, async (req, res) => {
  try {
    const d = req.body;
    const r = await pool.query(
      `INSERT INTO bens (projeto_id,proprietario_id,tipo,descricao,valor_mercado,valor_aquisicao,valor_declarado_ir,valor_integralizacao,observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [d.projeto_id,d.proprietario_id,d.tipo,d.descricao,d.valor_mercado||0,d.valor_aquisicao||0,d.valor_declarado_ir||0,d.valor_integralizacao||0,d.observacoes||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── CEP ───────────────────────────────────────────────────────
app.get('/api/cep/:cep', async (req, res) => {
  try {
    const cep = req.params.cep.replace(/\D/g,'');
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (d.erro) return res.status(404).json({ erro: 'CEP não encontrado' });
    res.json(d);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── SPA fallback ──────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname,'..','public','index.html')));

app.listen(PORT, () => console.log(`Holding Web v1.0 rodando na porta ${PORT}`));

// ── Delete Projeto (soft delete) ──────────────────────────────
app.delete('/api/projetos/:id', auth, async (req, res) => {
  try {
    // Soft delete em cascata
    const proj = await pool.query('SELECT id FROM projetos WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!proj.rows.length) return res.status(404).json({ erro: 'Projeto não encontrado' });
    
    await pool.query('UPDATE passos_fase SET deleted_at=NOW() WHERE fase_id IN (SELECT id FROM fases_projeto WHERE projeto_id=$1)', [req.params.id]);
    await pool.query('UPDATE fases_projeto SET deleted_at=NOW() WHERE projeto_id=$1', [req.params.id]);
    await pool.query('UPDATE celulas SET deleted_at=NOW() WHERE projeto_id=$1', [req.params.id]);
    await pool.query('UPDATE participantes SET deleted_at=NOW() WHERE projeto_id=$1', [req.params.id]);
    await pool.query('UPDATE bens SET deleted_at=NOW() WHERE projeto_id=$1', [req.params.id]);
    await pool.query('UPDATE projetos SET deleted_at=NOW() WHERE id=$1', [req.params.id]);
    
    res.json({ mensagem: 'Projeto excluído com sucesso' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Delete Célula (soft delete) ───────────────────────────────
app.delete('/api/celulas/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('UPDATE celulas SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ erro: 'Célula não encontrada' });
    res.json({ mensagem: 'Célula excluída' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

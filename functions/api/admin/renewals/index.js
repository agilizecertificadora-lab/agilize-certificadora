import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';

const allowedStatuses = new Set(['review','ready','contacted','waiting','scheduled','renewed','no_interest']);
const emailValid = value => /^\S+@\S+\.\S+$/.test(value) && !/^x+@/i.test(value);

export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  const url = new URL(request.url);
  const query = clean(url.searchParams.get('q'), 120);
  const status = clean(url.searchParams.get('status'), 30);
  let sql = `SELECT * FROM renewal_customers WHERE 1=1`;
  const values = [];
  if (query) {
    const like = `%${query}%`;
    sql += ` AND (name LIKE ? OR document LIKE ? OR phone LIKE ? OR email LIKE ? OR product LIKE ?)`;
    values.push(like, like, like, like, like);
  }
  if (status && allowedStatuses.has(status)) { sql += ' AND status=?'; values.push(status); }
  sql += ` ORDER BY CASE status WHEN 'review' THEN 0 WHEN 'ready' THEN 1 WHEN 'contacted' THEN 2 WHEN 'waiting' THEN 3 ELSE 4 END, datetime(expires_at), name LIMIT 1000`;
  const result = await env.DB.prepare(sql).bind(...values).all();
  return json({ customers: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  let input; try { input = await request.json(); } catch { return json({ message: 'Arquivo inválido.' }, 400); }
  const rows = Array.isArray(input.rows) ? input.rows.slice(0, 500) : [];
  if (!rows.length) return json({ message: 'A planilha não possui clientes para importar.' }, 400);
  const batchId = crypto.randomUUID();
  const sourceFile = clean(input.sourceFile, 180);
  const now = new Date().toISOString();
  const statements = [];
  let rejected = 0;
  for (const row of rows) {
    const name = clean(row.name, 180), product = clean(row.product, 40), expiresAt = clean(row.expiresAt, 30);
    if (!name || !product || !/^\d{4}-\d{2}-\d{2}/.test(expiresAt)) { rejected++; continue; }
    const email = clean(row.email, 180).toLowerCase();
    statements.push(env.DB.prepare(`INSERT OR IGNORE INTO renewal_customers
      (id,batch_id,source_file,name,document,city,phone,email,product,expires_at,referral,contact_checked,status,renewal_token,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      crypto.randomUUID(), batchId, sourceFile, name, clean(row.document, 30), clean(row.city, 120), clean(row.phone, 30), email,
      product, expiresAt, clean(row.referral, 120), 0, 'review', crypto.randomUUID(), now, now
    ));
  }
  if (!statements.length) return json({ message: 'Nenhuma linha válida foi encontrada.' }, 400);
  const results = await env.DB.batch(statements);
  const imported = results.reduce((total, item) => total + Number(item.meta?.changes || 0), 0);
  return json({ ok: true, imported, skipped: statements.length - imported, rejected, message: `${imported} cliente(s) importado(s). ${statements.length - imported} duplicado(s) ignorado(s).` }, 201);
}

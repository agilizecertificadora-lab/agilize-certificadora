import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';

const phone = value => clean(value, 30).replace(/\D/g, '');
const keyFor = (name, number) => number ? `phone:${number}` : `name:${name.toLocaleLowerCase('pt-BR')}`;
const allowed = new Set(['pending', 'opened', 'sent', 'skipped', 'do_not_send']);

export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Sessão expirada.' }, 401);
  const { results = [] } = await env.DB.prepare('SELECT id,name,phone,excluded,status,notes,last_activity,created_at,updated_at FROM whatsapp_contacts ORDER BY name COLLATE NOCASE LIMIT 2000').all();
  return json({ contacts: results });
}

export async function onRequestPost({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Sessão expirada.' }, 401);
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.contacts) ? body.contacts.slice(0, 2000) : [];
  if (!rows.length) return json({ message: 'Nenhum contato válido foi enviado.' }, 400);
  const now = new Date().toISOString();
  const statements = [];
  for (const row of rows) {
    const name = clean(row.name, 180);
    const number = phone(row.phone);
    if (!name) continue;
    const status = allowed.has(row.status) ? row.status : 'pending';
    statements.push(env.DB.prepare(`INSERT INTO whatsapp_contacts (id,contact_key,name,phone,excluded,status,notes,last_activity,source_file,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(contact_key) DO UPDATE SET name=excluded.name,phone=excluded.phone,excluded=excluded.excluded,last_activity=excluded.last_activity,source_file=excluded.source_file,updated_at=excluded.updated_at`)
      .bind(crypto.randomUUID(), keyFor(name, number), name, number || null, row.excluded ? 1 : 0, status, clean(row.notes, 1000) || null, clean(row.lastActivity, 100) || null, clean(body.sourceFile, 240) || null, now, now));
  }
  if (!statements.length) return json({ message: 'Nenhum contato válido foi encontrado.' }, 400);
  for (let index = 0; index < statements.length; index += 100) await env.DB.batch(statements.slice(index, index + 100));
  return json({ imported: statements.length });
}

export async function onRequestDelete({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Sessão expirada.' }, 401);
  const body = await request.json().catch(() => ({}));
  const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(value => clean(value, 80)).filter(Boolean))].slice(0, 2000);
  if (!ids.length) return json({ message: 'Selecione ao menos um contato.' }, 400);
  const placeholders = ids.map(() => '?').join(',');
  await env.DB.prepare(`DELETE FROM whatsapp_contacts WHERE id IN (${placeholders})`).bind(...ids).run();
  return json({ deleted: ids.length });
}

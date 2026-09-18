import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';

const allowedStatuses = new Set(['review','ready','contacted','waiting','scheduled','renewed','no_interest']);

export async function onRequestPatch({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  let input; try { input = await request.json(); } catch { return json({ message: 'Dados inválidos.' }, 400); }
  const existing = await env.DB.prepare('SELECT * FROM renewal_customers WHERE id=?').bind(params.id).first();
  if (!existing) return json({ message: 'Cliente não encontrado.' }, 404);
  const status = clean(input.status ?? existing.status, 30);
  if (!allowedStatuses.has(status)) return json({ message: 'Status inválido.' }, 400);
  const name = clean(input.name ?? existing.name, 180);
  const phone = clean(input.phone ?? existing.phone, 30);
  const email = clean(input.email ?? existing.email, 180).toLowerCase();
  const checked = input.contactChecked === undefined ? Number(existing.contact_checked) : (input.contactChecked ? 1 : 0);
  if (checked && phone.replace(/\D/g, '').length < 10 && !/^\S+@\S+\.\S+$/.test(email)) return json({ message: 'Informe ao menos um e-mail ou WhatsApp válido antes de concluir a conferência.' }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(`UPDATE renewal_customers SET name=?,document=?,city=?,phone=?,email=?,product=?,expires_at=?,contact_checked=?,status=?,next_follow_up_at=?,notes=?,updated_at=? WHERE id=?`).bind(
    name, clean(input.document ?? existing.document, 30), clean(input.city ?? existing.city, 120), phone, email,
    clean(input.product ?? existing.product, 40), clean(input.expiresAt ?? existing.expires_at, 30), checked,
    checked && status === 'review' ? 'ready' : status, clean(input.nextFollowUpAt ?? existing.next_follow_up_at, 30), clean(input.notes ?? existing.notes, 2000), now, params.id
  ).run();
  return json({ ok: true });
}

export async function onRequestPost({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  let input = {}; try { input = await request.json(); } catch {}
  if (input.action !== 'whatsapp_opened') return json({ message: 'Ação inválida.' }, 400);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE renewal_customers SET whatsapp_opened_at=?,last_contact_at=?,status=CASE WHEN status IN ('review','ready') THEN 'contacted' ELSE status END,updated_at=? WHERE id=?`).bind(now, now, now, params.id),
    env.DB.prepare(`INSERT INTO renewal_contact_log(id,renewal_id,channel,result,created_at) VALUES(?,?,?,?,?)`).bind(crypto.randomUUID(), params.id, 'whatsapp', 'opened', now)
  ]);
  return json({ ok: true, contactedAt: now });
}

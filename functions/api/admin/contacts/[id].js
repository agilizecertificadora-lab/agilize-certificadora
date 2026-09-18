import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';

const allowed = new Set(['pending', 'opened', 'sent', 'skipped', 'do_not_send']);
const phone = value => clean(value, 30).replace(/\D/g, '');

export async function onRequestPatch({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Sessão expirada.' }, 401);
  const body = await request.json().catch(() => ({}));
  const name = clean(body.name, 180);
  const number = phone(body.phone);
  const status = allowed.has(body.status) ? body.status : 'pending';
  if (!name) return json({ message: 'Informe o nome do contato.' }, 400);
  const contactKey = number ? `phone:${number}` : `name:${name.toLocaleLowerCase('pt-BR')}`;
  try {
    const result = await env.DB.prepare('UPDATE whatsapp_contacts SET contact_key=?,name=?,phone=?,excluded=?,status=?,notes=?,last_activity=?,updated_at=? WHERE id=?')
      .bind(contactKey, name, number || null, body.excluded ? 1 : 0, status, clean(body.notes, 1000) || null, clean(body.lastActivity, 100) || null, new Date().toISOString(), clean(params.id, 80)).run();
    if (!result.meta.changes) return json({ message: 'Contato não encontrado.' }, 404);
    return json({ updated: true });
  } catch (error) {
    if (String(error).includes('UNIQUE')) return json({ message: 'Já existe um contato cadastrado com este número de WhatsApp.' }, 409);
    throw error;
  }
}

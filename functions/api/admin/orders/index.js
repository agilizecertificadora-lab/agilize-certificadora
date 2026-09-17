import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';
export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  const url = new URL(request.url); const query = clean(url.searchParams.get('q'), 100); const status = clean(url.searchParams.get('status'), 40);
  let sql = `SELECT id,protocol,status,person,product_title,price_cents,holder,email,phone,mode,appointment_date,appointment_time,syngulari_protocol,video_url,created_at,updated_at FROM orders WHERE 1=1`; const values = [];
  if (query) { sql += ` AND (protocol LIKE ? OR holder LIKE ? OR email LIKE ? OR phone LIKE ? OR cpf LIKE ? OR cnpj LIKE ?)`; const like = `%${query}%`; values.push(like, like, like, like, like, like); }
  if (status) { sql += ' AND status=?'; values.push(status); }
  sql += ' ORDER BY appointment_date DESC, appointment_time DESC, created_at DESC LIMIT 250';
  const result = await env.DB.prepare(sql).bind(...values).all(); return json({ orders: result.results || [] });
}

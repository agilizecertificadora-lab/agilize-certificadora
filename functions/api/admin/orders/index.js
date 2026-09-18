import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';
export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  const url = new URL(request.url); const query = clean(url.searchParams.get('q'), 100); const status = clean(url.searchParams.get('status'), 40); const showAll=url.searchParams.get('view')==='all';
  let sql = `SELECT id,protocol,status,person,product_title,price_cents,holder,email,phone,mode,appointment_date,appointment_time,syngulari_protocol,video_url,payment_status,payment_amount_cents,issuance_protocol,created_at,updated_at FROM orders WHERE 1=1`; const values = [];
  if (!showAll && !query) sql += ` AND datetime(created_at) >= datetime('now','-30 days')`;
  if (query) { sql += ` AND (protocol LIKE ? OR holder LIKE ? OR email LIKE ? OR phone LIKE ? OR cpf LIKE ? OR cnpj LIKE ?)`; const like = `%${query}%`; values.push(like, like, like, like, like, like); }
  if (status) { sql += ' AND status=?'; values.push(status); }
  sql += ` ORDER BY CASE
    WHEN status IN ('pending_confirmation','confirmed','awaiting_documents','scheduled') THEN 0
    WHEN status='issuance_sent' THEN 1
    WHEN status='completed' THEN 2
    WHEN status IN ('cancelled','rejected') THEN 3
    ELSE 4 END,
    appointment_date DESC, appointment_time DESC, created_at DESC LIMIT 1000`;
  const result = await env.DB.prepare(sql).bind(...values).all(); return json({ orders: result.results || [] });
}

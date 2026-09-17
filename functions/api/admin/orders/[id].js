import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';
const allowedStatuses = new Set(['pending_confirmation','confirmed','awaiting_documents','scheduled','issuance_sent','completed','cancelled','rejected']);
const allowedPaymentStatuses = new Set(['pending','reported','confirmed','not_found','cancelled','refunded']);
export async function onRequestGet({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(params.id).first(); if (!order) return json({ message: 'Pedido não encontrado.' }, 404);
  try { order.address = JSON.parse(order.address_json || '{}'); } catch { order.address = {}; } delete order.address_json; return json({ order });
}
export async function onRequestPatch({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  let input; try { input = await request.json(); } catch { return json({ message: 'Dados inválidos.' }, 400); }
  const status = clean(input.status, 40); if (!allowedStatuses.has(status)) return json({ message: 'Status inválido.' }, 400);
  const syngulari = clean(input.syngulariProtocol, 120); const videoUrl = clean(input.videoUrl, 500); const issuance = clean(input.issuanceProtocol, 120); const notes = clean(input.notes, 3000);
  const paymentStatus = clean(input.paymentStatus, 40); if (!allowedPaymentStatuses.has(paymentStatus)) return json({ message: 'Status de pagamento inválido.' }, 400);
  const paymentAmountCents = Number(input.paymentAmountCents); if (!Number.isInteger(paymentAmountCents) || paymentAmountCents < 0) return json({ message: 'Informe um valor de pagamento válido.' }, 400);
  const paymentNotes = clean(input.paymentNotes, 1000);
  if (status === 'completed' && (paymentStatus !== 'confirmed' || !issuance)) return json({ message: 'Para finalizar, confirme o pagamento e informe o protocolo de emissão.' }, 400);
  if (videoUrl && !/^https:\/\//i.test(videoUrl)) return json({ message: 'O link da videoconferência deve começar com https://.' }, 400);
  const updated = new Date().toISOString(); const existing=await env.DB.prepare('SELECT payment_confirmed_at FROM orders WHERE id=?').bind(params.id).first(); const confirmedAt=paymentStatus==='confirmed'?(existing?.payment_confirmed_at||updated):null; await env.DB.prepare('UPDATE orders SET status=?,syngulari_protocol=?,video_url=?,issuance_protocol=?,admin_notes=?,payment_status=?,payment_amount_cents=?,payment_notes=?,payment_confirmed_at=?,updated_at=? WHERE id=?').bind(status, syngulari, videoUrl, issuance, notes, paymentStatus, paymentAmountCents, paymentNotes, confirmedAt, updated, params.id).run();
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(params.id).first(); if (!order) return json({ message: 'Pedido não encontrado.' }, 404);
  let notification = 'not_requested';
  if (input.notifyCustomer) {
    if (!env.RESEND_API_KEY) return json({ message: 'Pedido salvo, mas o envio de e-mail não está configurado.' }, 503);
    const lines = [`Olá, ${order.holder}.`, '', `Atualização do pedido ${order.protocol}: ${statusLabel(status)}.`]; if (syngulari) lines.push(`Protocolo Syngulari: ${syngulari}`); if (videoUrl) lines.push(`Link da videoconferência: ${videoUrl}`); lines.push('', 'Agilize Certificadora', 'WhatsApp: +55 11 99203-0134');
    const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.EMAIL_FROM || 'Agilize Certificadora <onboarding@resend.dev>', to: [order.email], subject: `Atualização do pedido ${order.protocol} · Agilize Certificadora`, text: lines.join('\n'), reply_to: env.AGILIZE_NOTIFICATION_EMAIL || 'agilizecertificadora@gmail.com' }) });
    notification = sent.ok ? 'sent' : 'failed'; if (!sent.ok) return json({ message: 'Pedido salvo, mas o e-mail ao cliente não pôde ser enviado.' }, 502);
  }
  return json({ ok: true, notification, updatedAt: updated });
}
export async function onRequestDelete({ request, env, params }) { if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401); const result=await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(params.id).run(); if (!result.meta?.changes) return json({ message: 'Pedido não encontrado.' }, 404); return json({ ok:true }); }
function statusLabel(status) { return ({ pending_confirmation:'Aguardando confirmação', confirmed:'Confirmado', awaiting_documents:'Aguardando documentos', scheduled:'Videoconferência agendada', issuance_sent:'Pedido gerado e link enviado', completed:'Finalizado', cancelled:'Cancelado', rejected:'Recusado' })[status] || status; }

import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';
import { pixPayload, paymentTxid } from '../../../_lib/pix.js';
const allowedStatuses = new Set(['pending_confirmation','confirmed','awaiting_documents','scheduled','issuance_sent','completed','cancelled','rejected']);
const allowedPaymentStatuses = new Set(['pending','reported','confirmed','not_found','cancelled','refunded']);
const scheduleSlots=(start,end)=>{const values=[];for(let minutes=start*60;minutes<=end*60;minutes+=30)values.push(`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`);return values};
const saoPauloNow=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,minutes:Number(parts.hour)*60+Number(parts.minute)}};
export async function onRequestGet({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(params.id).first(); if (!order) return json({ message: 'Pedido não encontrado.' }, 404);
  try { order.address = JSON.parse(order.address_json || '{}'); } catch { order.address = {}; } delete order.address_json;
  const amount=order.payment_amount_cents??order.price_cents; const settings=await env.DB.prepare('SELECT pix_key,merchant_name,merchant_city FROM payment_settings WHERE id=?').bind('default').first();
  if(Number.isInteger(amount)&&settings){const txid=order.payment_txid||paymentTxid(order.protocol);order.payment_copy_paste=pixPayload({key:settings.pix_key,name:settings.merchant_name,city:settings.merchant_city,amountCents:amount,txid,description:`Pedido ${order.protocol}`});order.payment_display_amount=amount;order.payment_display_txid=txid;}
  return json({ order });
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
  const updated = new Date().toISOString(); const existing=await env.DB.prepare('SELECT payment_confirmed_at,mode,appointment_date,appointment_time FROM orders WHERE id=?').bind(params.id).first();
  if(!existing)return json({message:'Pedido não encontrado.'},404);
  const appointmentDate=clean(input.appointmentDate,10)||existing.appointment_date,appointmentTime=clean(input.appointmentTime,5)||existing.appointment_time;
  const scheduleChanged=appointmentDate!==existing.appointment_date||appointmentTime!==existing.appointment_time;
  if(scheduleChanged){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate))return json({message:'Informe uma data válida para o atendimento.'},400);
    const now=saoPauloNow();if(appointmentDate<now.date)return json({message:'Escolha uma data de atendimento atual ou futura.'},400);
    const isPresential=String(existing.mode||'').startsWith('Presencial'),validSlots=new Set(scheduleSlots(9,isPresential?17:21));
    if(!validSlots.has(appointmentTime))return json({message:'Escolha um horário válido em intervalos de 30 minutos.'},400);
    const weekday=new Date(`${appointmentDate}T12:00:00-03:00`).getDay();if(isPresential&&(weekday===0||weekday===6))return json({message:'O atendimento presencial não está disponível aos finais de semana.'},400);
    const [hour,minute]=appointmentTime.split(':').map(Number);if(appointmentDate===now.date&&hour*60+minute<=now.minutes)return json({message:'Escolha um horário que ainda não tenha passado.'},400);
    const occupied=await env.DB.prepare("SELECT id FROM orders WHERE appointment_date=? AND appointment_time=? AND mode=? AND id<>? AND status NOT IN ('cancelled','rejected') LIMIT 1").bind(appointmentDate,appointmentTime,existing.mode,params.id).first();if(occupied)return json({message:'Esse horário acabou de ser ocupado. Escolha outro horário.'},409);
  }
  const confirmedAt=paymentStatus==='confirmed'?(existing.payment_confirmed_at||updated):null;
  try{await env.DB.prepare('UPDATE orders SET appointment_date=?,appointment_time=?,status=?,syngulari_protocol=?,video_url=?,issuance_protocol=?,admin_notes=?,payment_status=?,payment_amount_cents=?,payment_notes=?,payment_confirmed_at=?,updated_at=? WHERE id=?').bind(appointmentDate,appointmentTime,status,syngulari,videoUrl,issuance,notes,paymentStatus,paymentAmountCents,paymentNotes,confirmedAt,updated,params.id).run()}catch(error){if(String(error).includes('UNIQUE'))return json({message:'Esse horário acabou de ser ocupado. Escolha outro horário.'},409);throw error}
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
export async function onRequestDelete({ request, env, params }) { if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401); const result=await env.DB.prepare("DELETE FROM orders WHERE id=? AND status IN ('cancelled','rejected')").bind(params.id).run(); if (!result.meta?.changes) return json({ message: 'Somente pedidos cancelados ou recusados podem ser excluídos.' }, 400); return json({ ok:true }); }
function statusLabel(status) { return ({ pending_confirmation:'Aguardando confirmação', confirmed:'Confirmado', awaiting_documents:'Aguardando documentos', scheduled:'Videoconferência agendada', issuance_sent:'Pedido gerado e link enviado', completed:'Finalizado', cancelled:'Cancelado', rejected:'Recusado' })[status] || status; }

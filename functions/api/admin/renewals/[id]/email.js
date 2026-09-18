import { json, requireAdmin } from '../../../../_lib/admin-auth.js';

export async function onRequestPost({ request, env, params }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  if (!env.RESEND_API_KEY) return json({ message: 'O envio de e-mail ainda não está configurado.' }, 503);
  const customer = await env.DB.prepare('SELECT * FROM renewal_customers WHERE id=?').bind(params.id).first();
  if (!customer) return json({ message: 'Cliente não encontrado.' }, 404);
  if (!customer.contact_checked) return json({ message: 'Confira e salve os dados do cliente antes do envio.' }, 400);
  if (!/^\S+@\S+\.\S+$/.test(customer.email || '') || /^x+@/i.test(customer.email)) return json({ message: 'O cliente não possui um e-mail válido.' }, 400);
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(customer.expires_at));
  const link = `https://agilizecertificados.com.br/solicitar?renovacao=${encodeURIComponent(customer.renewal_token)}`;
  const text = `Olá, ${customer.name}.\n\nSeu certificado digital ${customer.product} vence em ${date}. Para evitar interrupções, você já pode solicitar a renovação e escolher o melhor horário pelo link abaixo:\n\n${link}\n\nSe precisar de ajuda, estamos à disposição.\n\nAgilize Certificadora\nWhatsApp: +55 11 99203-0134`;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.EMAIL_FROM || 'Agilize Certificadora <onboarding@resend.dev>', to: [customer.email], subject: 'Seu certificado digital vence em breve — agende a renovação', text, reply_to: env.AGILIZE_NOTIFICATION_EMAIL || 'agilizecertificadora@gmail.com' }) });
  const now = new Date().toISOString();
  const result = response.ok ? 'sent' : 'failed';
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO renewal_contact_log(id,renewal_id,channel,result,detail,created_at) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(), params.id, 'email', result, response.ok ? customer.email : String(response.status), now),
    env.DB.prepare(`UPDATE renewal_customers SET email_sent_at=CASE WHEN ?='sent' THEN ? ELSE email_sent_at END,last_contact_at=CASE WHEN ?='sent' THEN ? ELSE last_contact_at END,status=CASE WHEN ?='sent' AND status IN ('review','ready') THEN 'contacted' ELSE status END,updated_at=? WHERE id=?`).bind(result, now, result, now, result, now, params.id)
  ]);
  if (!response.ok) return json({ message: 'O e-mail não pôde ser enviado. Verifique o endereço e tente novamente.' }, 502);
  return json({ ok: true, sentAt: now });
}

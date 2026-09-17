import { adminEmail, clean, hash, json } from '../../../_lib/admin-auth.js';
export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.RESEND_API_KEY || !env.ADMIN_SESSION_SECRET) return json({ message: 'Acesso administrativo ainda não configurado.' }, 503);
  let input = {}; try { input = await request.json(); } catch {}
  const email = clean(input.email, 180).toLowerCase(); const allowed = adminEmail(env);
  if (email !== allowed) return json({ message: 'Se o e-mail estiver autorizado, o código será enviado.' });
  const latest = await env.DB.prepare('SELECT created_at FROM admin_login_codes WHERE email=? ORDER BY created_at DESC LIMIT 1').bind(email).first();
  if (latest && Date.now() - Date.parse(latest.created_at) < 60000) return json({ message: 'Aguarde um minuto antes de solicitar outro código.' }, 429);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0'); const now = new Date(); const expires = new Date(now.getTime() + 600000);
  await env.DB.prepare('DELETE FROM admin_login_codes WHERE email=? OR expires_at<=?').bind(email, now.toISOString()).run();
  await env.DB.prepare('INSERT INTO admin_login_codes (id,email,code_hash,expires_at,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), email, await hash(`${email}:${code}`, env.ADMIN_SESSION_SECRET), expires.toISOString(), now.toISOString()).run();
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.EMAIL_FROM || 'Agilize Certificadora <onboarding@resend.dev>', to: [allowed], subject: `${code} · acesso ao painel Agilize`, text: `Seu código de acesso ao painel administrativo é ${code}. Ele expira em 10 minutos.\n\nSe você não solicitou este acesso, ignore esta mensagem.` }) });
  if (!response.ok) return json({ message: 'Não foi possível enviar o código agora.' }, 502);
  return json({ message: 'Código enviado para o e-mail da Agilize.' });
}

import { adminEmail, clean, hash, json, sessionCookie } from '../../../_lib/admin-auth.js';
export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.ADMIN_SESSION_SECRET) return json({ message: 'Acesso administrativo ainda não configurado.' }, 503);
  let input; try { input = await request.json(); } catch { return json({ message: 'Dados inválidos.' }, 400); }
  const email = clean(input.email, 180).toLowerCase(); const code = clean(input.code, 6);
  if (email !== adminEmail(env) || !/^\d{6}$/.test(code)) return json({ message: 'Código inválido ou expirado.' }, 401);
  const codeHash = await hash(`${email}:${code}`, env.ADMIN_SESSION_SECRET); const row = await env.DB.prepare('SELECT id FROM admin_login_codes WHERE email=? AND code_hash=? AND expires_at>? LIMIT 1').bind(email, codeHash, new Date().toISOString()).first();
  if (!row) return json({ message: 'Código inválido ou expirado.' }, 401);
  await env.DB.prepare('DELETE FROM admin_login_codes WHERE email=?').bind(email).run();
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`; const tokenHash = await hash(token, env.ADMIN_SESSION_SECRET); const now = new Date(); const expires = new Date(now.getTime() + 28800000);
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now.toISOString()).run();
  await env.DB.prepare('INSERT INTO admin_sessions (id,email,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), email, tokenHash, expires.toISOString(), now.toISOString()).run();
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token,28800,request) });
}

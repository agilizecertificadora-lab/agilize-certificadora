const encoder = new TextEncoder();
export const adminEmail = env => String(env.ADMIN_EMAIL || env.AGILIZE_NOTIFICATION_EMAIL || 'agilizecertificadora@gmail.com').trim().toLowerCase();
export const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
export async function hash(value, secret) { const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${secret}:${value}`)); return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
export function cookieValue(request, name) { const cookies = request.headers.get('Cookie') || ''; for (const part of cookies.split(';')) { const [key, ...value] = part.trim().split('='); if (key === name) return decodeURIComponent(value.join('=')); } return ''; }
export function sessionCookie(token, maxAge = 28800) { return `agilize_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`; }
export async function requireAdmin(request, env) { if (!env.DB || !env.ADMIN_SESSION_SECRET) return null; const token = cookieValue(request, 'agilize_admin'); if (!token) return null; const tokenHash = await hash(token, env.ADMIN_SESSION_SECRET); return await env.DB.prepare('SELECT id,email,expires_at FROM admin_sessions WHERE token_hash=? AND expires_at>? LIMIT 1').bind(tokenHash, new Date().toISOString()).first() || null; }
export const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);

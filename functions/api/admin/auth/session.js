import { json, requireAdmin, sessionCookie } from '../../../_lib/admin-auth.js';
export async function onRequestGet({ request, env }) { const session = await requireAdmin(request, env); return session ? json({ authenticated: true, email: session.email },200,{'Set-Cookie':sessionCookie(session._token,28800,request)}) : json({ authenticated: false }, 401); }

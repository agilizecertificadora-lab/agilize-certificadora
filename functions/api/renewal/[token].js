export async function onRequestGet({ env, params }) {
  if (!env.DB) return Response.json({ message: 'Serviço indisponível.' }, { status: 503 });
  const row = await env.DB.prepare(`SELECT name,email,phone,product,expires_at FROM renewal_customers WHERE renewal_token=? AND status NOT IN ('renewed','no_interest') LIMIT 1`).bind(params.token).first();
  if (!row) return Response.json({ message: 'Convite de renovação não encontrado.' }, { status: 404 });
  return Response.json({ renewal: row }, { headers: { 'Cache-Control': 'no-store' } });
}

import { clean, json, requireAdmin } from '../../_lib/admin-auth.js';

export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  const products = await env.DB.prepare(
    'SELECT product_id,title,person,cost_cents,sale_price_cents,active FROM partner_products ORDER BY person,title'
  ).all();
  return json({ products: products.results || [] });
}

export async function onRequestPut({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ message: 'Acesso não autorizado.' }, 401);
  let input;
  try { input = await request.json(); } catch { return json({ message: 'Dados inválidos.' }, 400); }
  if (!Array.isArray(input.products) || !input.products.length) return json({ message: 'Confira a tabela de produtos.' }, 400);

  const existing = await env.DB.prepare('SELECT product_id FROM partner_products').all();
  const validIds = new Set((existing.results || []).map(row => row.product_id));
  const now = new Date().toISOString();
  const statements = [];
  for (const row of input.products) {
    const productId = clean(row.productId, 40);
    const costCents = Number(row.costCents);
    const salePriceCents = row.salePriceCents === null || row.salePriceCents === '' ? null : Number(row.salePriceCents);
    const active = row.active === false ? 0 : 1;
    if (!validIds.has(productId) || !Number.isInteger(costCents) || costCents < 0 ||
      (salePriceCents !== null && (!Number.isInteger(salePriceCents) || salePriceCents < 0)) ||
      (active && salePriceCents === null)) {
      return json({ message: 'Confira os custos, preços e produtos ativos.' }, 400);
    }
    statements.push(env.DB.prepare(
      'UPDATE partner_products SET cost_cents=?,sale_price_cents=?,active=? WHERE product_id=?'
    ).bind(costCents, salePriceCents, active, productId));
  }
  await env.DB.batch(statements);
  return json({ ok: true, updatedAt: now, updatedBy: admin.email });
}

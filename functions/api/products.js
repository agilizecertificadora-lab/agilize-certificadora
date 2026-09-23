export async function onRequestGet({ env }) {
  if (!env.DB) return Response.json({ products: [] }, { headers: { 'Cache-Control': 'no-store' } });
  const products = await env.DB.prepare(
    'SELECT product_id,title,person,sale_price_cents,active FROM partner_products ORDER BY person,title'
  ).all();
  return Response.json({ products: products.results || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

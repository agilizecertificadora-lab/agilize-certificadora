import { clean,json,requireAdmin } from '../../../_lib/admin-auth.js';
export async function onRequestGet({request,env}){
  if(!await requireAdmin(request,env))return json({message:'Acesso não autorizado.'},401);
  const partners=await env.DB.prepare('SELECT id,name,cpf,email,accounting_name,cnpj,status,created_at,updated_at FROM resellers ORDER BY created_at DESC').all();
  const prices=await env.DB.prepare('SELECT p.product_id,p.title,p.person,r.price_cents default_price_cents,r.active FROM reseller_prices r JOIN partner_products p ON p.product_id=r.product_id ORDER BY p.person,p.title').all();
  const custom=await env.DB.prepare('SELECT reseller_id,product_id,price_cents,active FROM reseller_custom_prices').all();
  return json({partners:partners.results||[],prices:prices.results||[],customPrices:custom.results||[]});
}
export async function onRequestPatch({request,env}){
  const admin=await requireAdmin(request,env);if(!admin)return json({message:'Acesso não autorizado.'},401);
  let input;try{input=await request.json()}catch{return json({message:'Dados inválidos.'},400)}
  const status=clean(input.status,20);if(!['approved','pending','rejected'].includes(status))return json({message:'Status inválido.'},400);
  const id=clean(input.id,60);await env.DB.prepare('UPDATE resellers SET status=?,updated_at=? WHERE id=?').bind(status,new Date().toISOString(),id).run();
  if(status==='approved')await env.DB.prepare("INSERT OR IGNORE INTO reseller_custom_prices(reseller_id,product_id,price_cents,active,updated_at,updated_by) SELECT ?,product_id,price_cents,active,?,? FROM reseller_prices").bind(id,new Date().toISOString(),admin.email).run();
  return json({ok:true});
}
export async function onRequestDelete({request,env}){
  if(!await requireAdmin(request,env))return json({message:'Acesso não autorizado.'},401);
  let input;try{input=await request.json()}catch{return json({message:'Dados inválidos.'},400)}
  const id=clean(input.id,60);if(!id)return json({message:'Parceiro não informado.'},400);
  const reseller=await env.DB.prepare("SELECT id,email,status FROM resellers WHERE id=? LIMIT 1").bind(id).first();
  if(!reseller)return json({message:'Parceiro não encontrado.'},404);
  if(reseller.status!=='rejected')return json({message:'Somente parceiros recusados podem ser excluídos.'},409);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM reseller_sessions WHERE reseller_id=?').bind(id),
    env.DB.prepare('DELETE FROM reseller_custom_prices WHERE reseller_id=?').bind(id),
    env.DB.prepare('DELETE FROM reseller_login_codes WHERE email=?').bind(reseller.email),
    env.DB.prepare("DELETE FROM resellers WHERE id=? AND status='rejected'").bind(id)
  ]);
  return json({ok:true});
}
export async function onRequestPut({request,env}){
  const admin=await requireAdmin(request,env);if(!admin)return json({message:'Acesso não autorizado.'},401);
  let input;try{input=await request.json()}catch{return json({message:'Dados inválidos.'},400)}
  const resellerId=clean(input.resellerId,60);const reseller=await env.DB.prepare('SELECT id FROM resellers WHERE id=? LIMIT 1').bind(resellerId).first();
  if(!reseller||!Array.isArray(input.prices))return json({message:'Escolha o parceiro e confira a tabela.'},400);
  const statements=[];for(const row of input.prices){const cents=Number(row.priceCents);if(!clean(row.productId,40)||!Number.isInteger(cents)||cents<0)return json({message:'Confira os valores informados.'},400);statements.push(env.DB.prepare("INSERT INTO reseller_custom_prices(reseller_id,product_id,price_cents,active,updated_at,updated_by) VALUES(?,?,?,?,?,?) ON CONFLICT(reseller_id,product_id) DO UPDATE SET price_cents=excluded.price_cents,active=excluded.active,updated_at=excluded.updated_at,updated_by=excluded.updated_by").bind(resellerId,clean(row.productId,40),cents,row.active===false?0:1,new Date().toISOString(),admin.email))}
  if(statements.length)await env.DB.batch(statements);return json({ok:true});
}

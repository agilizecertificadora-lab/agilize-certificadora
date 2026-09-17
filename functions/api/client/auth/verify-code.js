import { clean, hash, json } from '../../../_lib/admin-auth.js';
import { customerCookie } from '../../../_lib/customer-auth.js';
export async function onRequestPost({request,env}){
  let input;try{input=await request.json()}catch{return json({message:'Dados inválidos.'},400)}
  const protocol=clean(input.protocol,40).toUpperCase(),email=clean(input.email,180).toLowerCase(),code=clean(input.code,6);
  if(!/^\d{6}$/.test(code))return json({message:'Código inválido ou expirado.'},401);
  const order=await env.DB.prepare('SELECT id FROM orders WHERE upper(protocol)=? AND lower(email)=? LIMIT 1').bind(protocol,email).first();
  if(!order)return json({message:'Código inválido ou expirado.'},401);
  const codeHash=await hash(`${order.id}:${email}:${code}`,env.ADMIN_SESSION_SECRET);
  const row=await env.DB.prepare('SELECT id FROM customer_login_codes WHERE order_id=? AND email=? AND code_hash=? AND expires_at>? LIMIT 1').bind(order.id,email,codeHash,new Date().toISOString()).first();
  if(!row)return json({message:'Código inválido ou expirado.'},401);
  await env.DB.prepare('DELETE FROM customer_login_codes WHERE order_id=?').bind(order.id).run();
  const token=`${crypto.randomUUID()}${crypto.randomUUID()}`,now=new Date(),expires=new Date(now.getTime()+28800000);
  await env.DB.prepare('DELETE FROM customer_sessions WHERE expires_at<=?').bind(now.toISOString()).run();
  await env.DB.prepare('INSERT INTO customer_sessions(id,order_id,email,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),order.id,email,await hash(token,env.ADMIN_SESSION_SECRET),expires.toISOString(),now.toISOString()).run();
  return json({ok:true},200,{'Set-Cookie':customerCookie(token)});
}

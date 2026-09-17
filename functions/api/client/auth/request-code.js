import { clean, hash, json } from '../../../_lib/admin-auth.js';
export async function onRequestPost({request,env}){
  if(!env.DB||!env.RESEND_API_KEY||!env.ADMIN_SESSION_SECRET)return json({message:'A Área do Cliente ainda não está configurada.'},503);
  let input={};try{input=await request.json()}catch{}
  const protocol=clean(input.protocol,40).toUpperCase(),email=clean(input.email,180).toLowerCase();
  const order=await env.DB.prepare('SELECT id,protocol,email,holder FROM orders WHERE upper(protocol)=? AND lower(email)=? LIMIT 1').bind(protocol,email).first();
  if(!order)return json({message:'Não encontramos um pedido com esse protocolo e e-mail.'},404);
  const latest=await env.DB.prepare('SELECT created_at FROM customer_login_codes WHERE order_id=? AND email=? ORDER BY created_at DESC LIMIT 1').bind(order.id,email).first();
  if(latest&&Date.now()-Date.parse(latest.created_at)<60000)return json({message:'Aguarde um minuto antes de solicitar outro código.'},429);
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0'),now=new Date(),expires=new Date(now.getTime()+600000);
  await env.DB.prepare('DELETE FROM customer_login_codes WHERE order_id=? OR expires_at<=?').bind(order.id,now.toISOString()).run();
  await env.DB.prepare('INSERT INTO customer_login_codes(id,order_id,email,code_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),order.id,email,await hash(`${order.id}:${email}:${code}`,env.ADMIN_SESSION_SECRET),expires.toISOString(),now.toISOString()).run();
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM||'Agilize Certificadora <onboarding@resend.dev>',to:[email],subject:`${code} · acesso ao pedido ${order.protocol}`,text:`Olá, ${order.holder}.\n\nSeu código de acesso ao pedido ${order.protocol} é ${code}. Ele expira em 10 minutos.\n\nSe você não solicitou este acesso, ignore esta mensagem.`,reply_to:env.AGILIZE_NOTIFICATION_EMAIL||'agilizecertificadora@gmail.com'})});
  if(!response.ok)return json({message:'Não foi possível enviar o código agora.'},502);
  return json({message:'Código enviado para o e-mail cadastrado.'});
}

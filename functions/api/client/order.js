import { json } from '../../_lib/admin-auth.js';
import { requireCustomer } from '../../_lib/customer-auth.js';
import { pixPayload,paymentTxid } from '../../_lib/pix.js';
export async function onRequestGet({request,env}){
  const session=await requireCustomer(request,env);if(!session)return json({message:'Acesso não autorizado.'},401);
  const order=await env.DB.prepare('SELECT id,protocol,status,person,product_title,price_cents,purpose,holder,cpf,birth,email,phone,cnpj,company,trade_name,address_json,mode,appointment_date,appointment_time,syngulari_protocol,video_url,issuance_protocol,payment_status,payment_amount_cents,payment_txid,payment_confirmed_at,payment_proof_name,payment_proof_uploaded_at,created_at,updated_at FROM orders WHERE id=? LIMIT 1').bind(session.order_id).first();
  if(!order)return json({message:'Pedido não encontrado.'},404);
  try{order.address=JSON.parse(order.address_json||'{}')}catch{order.address={}}delete order.address_json;
  const amount=order.payment_amount_cents??order.price_cents;
  if(Number.isInteger(amount)&&order.payment_status!=='confirmed'){
    const settings=await env.DB.prepare('SELECT pix_key,merchant_name,merchant_city FROM payment_settings WHERE id=?').bind('default').first();
    if(settings){const txid=order.payment_txid||paymentTxid(order.protocol);order.payment_copy_paste=pixPayload({key:settings.pix_key,name:settings.merchant_name,city:settings.merchant_city,amountCents:amount,txid,description:`Pedido ${order.protocol}`})}
  }
  return json({order});
}

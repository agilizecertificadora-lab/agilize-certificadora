import { pixPayload,paymentTxid } from '../../_lib/pix.js';
import { clean,json } from '../../_lib/admin-auth.js';
import { requireReseller } from '../../_lib/reseller-auth.js';
const digits=value=>clean(value).replace(/\D/g,'');
const protocol=()=>`AGZ-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;

export async function onRequestPost({request,env}){
  const reseller=await requireReseller(request,env);
  if(!reseller)return json({message:'Acesso não autorizado.'},401);
  let input;try{input=await request.json()}catch{return json({message:'Dados inválidos.'},400)}
  for(const field of ['person','certificate','holder','cpf','birth','email','phone','mode','date','time'])if(!clean(input[field]))return json({message:'Preencha todos os campos obrigatórios.'},400);
  if(digits(input.cpf).length!==11||digits(input.phone).length<10||!/^\S+@\S+\.\S+$/.test(clean(input.email)))return json({message:'Confira CPF, WhatsApp e e-mail do cliente.'},400);
  if(input.person==='pj'&&digits(input.cnpj).length!==14)return json({message:'Informe um CNPJ válido.'},400);
  const product=await env.DB.prepare("SELECT p.product_id,p.title,p.person,COALESCE(c.price_cents,r.price_cents) price_cents FROM partner_products p JOIN reseller_prices r ON r.product_id=p.product_id LEFT JOIN reseller_custom_prices c ON c.product_id=p.product_id AND c.reseller_id=? WHERE p.product_id=? AND p.active=1 AND COALESCE(c.active,r.active)=1 LIMIT 1").bind(reseller.reseller_id,clean(input.certificate,40)).first();
  if(!product||product.person!==clean(input.person,2))return json({message:'Certificado indisponível para este parceiro.'},400);
  const id=crypto.randomUUID(),code=protocol(),created=new Date().toISOString();
  const address=JSON.stringify({zip:clean(input.zip,9),street:clean(input.street),number:clean(input.number,20),extra:clean(input.extra,100),district:clean(input.district,100),city:clean(input.city,100),state:clean(input.state,2)});
  try{await env.DB.prepare("INSERT INTO orders(id,protocol,status,person,certificate_id,product_title,price_cents,purpose,holder,cpf,birth,email,phone,cnpj,company,trade_name,address_json,mode,appointment_date,appointment_time,created_at,reseller_id,reseller_name) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,code,'pending_confirmation',product.person,product.product_id,product.title,product.price_cents,'Agendamento realizado pelo parceiro',clean(input.holder),digits(input.cpf),clean(input.birth,10),clean(input.email).toLowerCase(),clean(input.phone,20),digits(input.cnpj),clean(input.company),clean(input.tradeName),address,clean(input.mode,60),clean(input.date,10),clean(input.time,5),created,reseller.reseller_id,reseller.accounting_name).run()}catch(error){if(String(error).includes('UNIQUE'))return json({message:'Esse horário acabou de ser solicitado. Escolha outro.'},409);return json({message:'Não foi possível registrar o agendamento. Confira os dados e tente novamente.'},500)}
  let payment=null;const settings=await env.DB.prepare('SELECT pix_key,merchant_name,merchant_city FROM payment_settings WHERE id=?').bind('default').first();
  if(settings){const txid=paymentTxid(code),copyPaste=pixPayload({key:settings.pix_key,name:settings.merchant_name,city:settings.merchant_city,amountCents:product.price_cents,txid,description:`Pedido ${code}`});await env.DB.prepare("UPDATE orders SET payment_status='pending',payment_txid=?,payment_amount_cents=? WHERE id=?").bind(txid,product.price_cents,id).run();payment={amountCents:product.price_cents,copyPaste,txid}}
  if(env.RESEND_API_KEY){const body=`Novo pedido de parceiro ${code}\n\nParceiro: ${reseller.accounting_name}\nCliente: ${clean(input.holder)}\nCertificado: ${product.title}\nValor parceiro: ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(product.price_cents/100)}\nData: ${clean(input.date,10)} às ${clean(input.time,5)}`;try{const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM||'Agilize Certificadora <onboarding@resend.dev>',to:[env.AGILIZE_NOTIFICATION_EMAIL||'agilizecertificadora@gmail.com'],subject:`Pedido de parceiro ${code}`,text:body,reply_to:reseller.email})});await env.DB.prepare('UPDATE orders SET email_status=? WHERE id=?').bind(sent.ok?'sent':'failed',id).run()}catch{await env.DB.prepare("UPDATE orders SET email_status='failed' WHERE id=?").bind(id).run()}}
  return json({protocol:code,payment},201);
}

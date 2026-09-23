import { pixPayload, paymentTxid } from '../_lib/pix.js';
import { catalogProduct } from '../_lib/catalog.js';
const required=['person','certificate','purpose','holder','cpf','birth','email','phone','mode','date','time'];
const clean=(value,max=180)=>String(value??'').trim().slice(0,max);
const digits=value=>clean(value).replace(/\D/g,'');
const protocol=()=>`AGZ-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;

async function notify(env,order){
  if(!env.RESEND_API_KEY)return 'not_configured';
  const cpf=digits(order.cpf); const masked=cpf.length===11?`***.***.***-${cpf.slice(-2)}`:'não informado';
  const body=`Novo pedido ${order.protocol}\n\nCertificado: ${order.product_title}\nValor: ${order.price_cents===null?'Sob consulta':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(order.price_cents/100)}\nObjetivo: ${order.purpose}\nTitular / responsável: ${order.holder}\nCPF: ${masked}\nE-mail: ${order.email}\nWhatsApp: ${order.phone}\nAtendimento: ${order.mode}\nData e horário: ${order.appointment_date} às ${order.appointment_time}`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM||'Agilize Certificadora <onboarding@resend.dev>',to:[env.AGILIZE_NOTIFICATION_EMAIL||'agilizecertificadora@gmail.com'],subject:`Novo pedido ${order.protocol} · ${order.product_title}`,text:body,reply_to:order.email})});
  return response.ok?'sent':'failed';
}

export async function onRequestPost({request,env}){
  if(!env.DB)return Response.json({message:'O sistema de pedidos ainda não foi ativado.'},{status:503});
  let input; try{input=await request.json();}catch{return Response.json({message:'Dados inválidos.'},{status:400});}
  for(const field of required)if(!clean(input[field]))return Response.json({message:'Preencha todos os campos obrigatórios.'},{status:400});
  if(!/^\S+@\S+\.\S+$/.test(clean(input.email)))return Response.json({message:'Informe um e-mail válido.'},{status:400});
  if(digits(input.cpf).length!==11)return Response.json({message:'Informe um CPF válido.'},{status:400});
  if(digits(input.phone).length<10)return Response.json({message:'Informe um WhatsApp válido.'},{status:400});
  if(input.person==='pj'&&digits(input.cnpj).length!==14)return Response.json({message:'Informe um CNPJ válido.'},{status:400});
  const catalogEntry=catalogProduct(clean(input.certificate,40));
  const storedProduct=await env.DB.prepare('SELECT product_id,title,person,sale_price_cents,active FROM partner_products WHERE product_id=? LIMIT 1').bind(clean(input.certificate,40)).first();
  if(!catalogEntry||!storedProduct||storedProduct.active!==1||storedProduct.person!==clean(input.person,2)||!Number.isInteger(storedProduct.sale_price_cents))return Response.json({message:'Certificado inválido ou indisponível.'},{status:400});
  const product={...catalogEntry,title:storedProduct.title,priceCents:storedProduct.sale_price_cents};
  const renewalToken=clean(input.renewalToken,80);let renewal=null;if(renewalToken)renewal=await env.DB.prepare("SELECT id FROM renewal_customers WHERE renewal_token=? AND status NOT IN ('renewed','no_interest') LIMIT 1").bind(renewalToken).first();
  const id=crypto.randomUUID(); const code=protocol(); const created=new Date().toISOString();
  const order={id,protocol:code,status:'pending_confirmation',person:clean(input.person,2),certificate_id:clean(input.certificate,40),product_title:product.title,price_cents:product.priceCents,purpose:clean(input.purpose),holder:clean(input.holder),cpf:digits(input.cpf),birth:clean(input.birth,10),email:clean(input.email),phone:clean(input.phone,20),cnpj:digits(input.cnpj),company:clean(input.company),trade_name:clean(input.tradeName),address_json:JSON.stringify({zip:clean(input.zip,9),street:clean(input.street),number:clean(input.number,20),extra:clean(input.extra,100),district:clean(input.district,100),city:clean(input.city,100),state:clean(input.state,2)}),mode:clean(input.mode,60),appointment_date:clean(input.date,10),appointment_time:clean(input.time,5),created_at:created};
  try{
    await env.DB.prepare(`INSERT INTO orders (id,protocol,status,person,certificate_id,product_title,price_cents,purpose,holder,cpf,birth,email,phone,cnpj,company,trade_name,address_json,mode,appointment_date,appointment_time,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(...Object.values(order)).run();
  }catch(error){
    if(String(error).includes('UNIQUE'))return Response.json({message:'Esse horário acabou de ser solicitado. Escolha outro horário.'},{status:409});
    return Response.json({message:'Não foi possível registrar o pedido.'},{status:500});
  }
  let payment=null;
  if(Number.isInteger(order.price_cents)){
    const settings=await env.DB.prepare('SELECT pix_key,merchant_name,merchant_city FROM payment_settings WHERE id=?').bind('default').first();
    if(settings){
      const txid=paymentTxid(code);
      const copyPaste=pixPayload({key:settings.pix_key,name:settings.merchant_name,city:settings.merchant_city,amountCents:order.price_cents,txid,description:`Pedido ${code}`});
      await env.DB.prepare('UPDATE orders SET payment_status=?,payment_txid=?,payment_amount_cents=? WHERE id=?').bind('pending',txid,order.price_cents,id).run();
      payment={status:'pending',amountCents:order.price_cents,txid,copyPaste};
    }
  }
  const emailStatus=await notify(env,order);
  const updates=[env.DB.prepare('UPDATE orders SET email_status=? WHERE id=?').bind(emailStatus,id)];
  if(renewal)updates.push(env.DB.prepare("UPDATE renewal_customers SET status='scheduled',order_protocol=?,updated_at=? WHERE id=?").bind(code,new Date().toISOString(),renewal.id));
  await env.DB.batch(updates);
  return Response.json({protocol:code,status:'pending_confirmation',payment},{status:201});
}

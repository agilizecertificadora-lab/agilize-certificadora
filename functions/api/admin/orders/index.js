import { clean, json, requireAdmin } from '../../../_lib/admin-auth.js';
export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ message: 'Acesso não autorizado.' }, 401);
  const url = new URL(request.url); const query = clean(url.searchParams.get('q'), 100); const status = clean(url.searchParams.get('status'), 40); const showAll=url.searchParams.get('view')==='all';
  let sql = `SELECT id,protocol,status,person,product_title,price_cents,holder,email,phone,mode,appointment_date,appointment_time,syngulari_protocol,video_url,payment_status,payment_amount_cents,issuance_protocol,created_at,updated_at FROM orders WHERE 1=1`; const values = [];
  if (!showAll && !query) sql += ` AND datetime(created_at) >= datetime('now','-30 days')`;
  if (query) { sql += ` AND (protocol LIKE ? OR holder LIKE ? OR email LIKE ? OR phone LIKE ? OR cpf LIKE ? OR cnpj LIKE ?)`; const like = `%${query}%`; values.push(like, like, like, like, like, like); }
  if (status) { sql += ' AND status=?'; values.push(status); }
  sql += ` ORDER BY CASE
    WHEN status IN ('pending_confirmation','confirmed','awaiting_documents','scheduled') THEN 0
    WHEN status='issuance_sent' THEN 1
    WHEN status='completed' THEN 2
    WHEN status IN ('cancelled','rejected') THEN 3
    ELSE 4 END,
    appointment_date DESC, appointment_time DESC, created_at DESC LIMIT 1000`;
  const result = await env.DB.prepare(sql).bind(...values).all(); return json({ orders: result.results || [] });
}


const bookingDigits=value=>String(value??'').replace(/\D/g,'');
const bookingProtocol=()=> 'AGZ-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomUUID().slice(0,6).toUpperCase();
export async function onRequestPost({request,env}){
  const admin=await requireAdmin(request,env);if(!admin)return json({message:'Acesso não autorizado.'},401);
  let input;try{input=await request.json()}catch{return json({message:'Dados inválidos.'},400)}
  const required=['person','certificate','holder','cpf','birth','email','phone','mode','date','time'];for(const field of required)if(!clean(input[field]))return json({message:'Preencha todos os campos obrigatórios.'},400);
  const person=clean(input.person,2),cpf=bookingDigits(input.cpf),cnpj=bookingDigits(input.cnpj);if(!['pf','pj'].includes(person)||cpf.length!==11)return json({message:'Confira o tipo de pessoa e o CPF.'},400);if(person==='pj'&&cnpj.length!==14)return json({message:'Informe um CNPJ válido.'},400);
  if(!/^\S+@\S+\.\S+$/.test(clean(input.email,180))||bookingDigits(input.phone).length<10)return json({message:'Confira o e-mail e o WhatsApp.'},400);
  const stored=await env.DB.prepare('SELECT product_id,title,person,sale_price_cents,active FROM partner_products WHERE product_id=? LIMIT 1').bind(clean(input.certificate,40)).first();if(!stored||stored.active!==1||stored.person!==person||!Number.isInteger(stored.sale_price_cents))return json({message:'Certificado inválido ou indisponível.'},400);
  const customPriceCents=Number(input.customPriceCents);if(!Number.isInteger(customPriceCents)||customPriceCents<=0)return json({message:'Informe um valor maior que zero.'},400);const discountReason=clean(input.discountReason,300);if(customPriceCents!==stored.sale_price_cents&&!discountReason)return json({message:'Informe o motivo do valor personalizado.'},400);
  const appointmentDate=clean(input.date,10),appointmentTime=clean(input.time,5),mode=clean(input.mode,60);if(!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)||!/^\d{2}:\d{2}$/.test(appointmentTime))return json({message:'Escolha uma data e um horário válidos.'},400);
  const bookingNowParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])),bookingToday=bookingNowParts.year+'-'+bookingNowParts.month+'-'+bookingNowParts.day,bookingMinutes=Number(bookingNowParts.hour)*60+Number(bookingNowParts.minute);if(appointmentDate<bookingToday)return json({message:'Escolha uma data atual ou futura.'},400);const isPresential=mode.startsWith('Presencial'),[bookingHour,bookingMinute]=appointmentTime.split(':').map(Number),chosenMinutes=bookingHour*60+bookingMinute;if(bookingMinute%30!==0||chosenMinutes<540||chosenMinutes>(isPresential?1020:1260))return json({message:'Escolha um horário válido em intervalos de 30 minutos.'},400);if(appointmentDate===bookingToday&&chosenMinutes<=bookingMinutes)return json({message:'Escolha um horário que ainda não tenha passado.'},400);const bookingWeekday=new Date(appointmentDate+'T12:00:00-03:00').getDay();if(isPresential&&(bookingWeekday===0||bookingWeekday===6))return json({message:'O atendimento presencial não está disponível aos finais de semana.'},400);
  const code=bookingProtocol(),id=crypto.randomUUID(),created=new Date().toISOString(),notes=customPriceCents===stored.sale_price_cents?'Agendamento criado pelo administrador.':'Agendamento criado pelo administrador. Valor da tabela: R$ '+(stored.sale_price_cents/100).toFixed(2).replace('.',',')+'. Motivo do valor personalizado: '+discountReason;
  const order={id,protocol:code,status:'confirmed',person,certificate_id:stored.product_id,product_title:stored.title,price_cents:customPriceCents,purpose:clean(input.purpose,180)||'Agendamento administrativo',holder:clean(input.holder,180),cpf,birth:clean(input.birth,10),email:clean(input.email,180).toLowerCase(),phone:clean(input.phone,20),cnpj,company:clean(input.company,180),trade_name:clean(input.tradeName,180),address_json:JSON.stringify(input.address||{}),mode,appointment_date:appointmentDate,appointment_time:appointmentTime,admin_notes:notes,created_at:created};
  try{await env.DB.prepare('INSERT INTO orders (id,protocol,status,person,certificate_id,product_title,price_cents,purpose,holder,cpf,birth,email,phone,cnpj,company,trade_name,address_json,mode,appointment_date,appointment_time,admin_notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...Object.values(order)).run()}catch(error){if(String(error).includes('UNIQUE'))return json({message:'Esse horário acabou de ser ocupado. Escolha outro.'},409);return json({message:'Não foi possível criar o agendamento.'},500)}
  const {upsertCustomer}=await import('../../../_lib/customers.js');await upsertCustomer(env,order,{source:'admin',protocol:code});let payment=null;const settings=await env.DB.prepare('SELECT pix_key,merchant_name,merchant_city FROM payment_settings WHERE id=?').bind('default').first();if(settings){const {pixPayload,paymentTxid}=await import('../../../_lib/pix.js');const txid=paymentTxid(code),copyPaste=pixPayload({key:settings.pix_key,name:settings.merchant_name,city:settings.merchant_city,amountCents:customPriceCents,txid,description:'Pedido '+code});await env.DB.prepare('UPDATE orders SET payment_status=?,payment_txid=?,payment_amount_cents=? WHERE id=?').bind('pending',txid,customPriceCents,id).run();payment={amountCents:customPriceCents,txid,copyPaste}}
  return json({id,protocol:code,payment},201);
}

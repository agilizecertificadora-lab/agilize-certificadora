import { clean,json } from '../../_lib/admin-auth.js';
import { requireCustomer } from '../../_lib/customer-auth.js';
export async function onRequestPost({request,env}){
  const session=await requireCustomer(request,env);if(!session)return json({message:'Acesso não autorizado.'},401);
  let input;try{input=await request.json()}catch{return json({message:'Arquivo inválido.'},400)}
  const name=clean(input.name,180),type=clean(input.type,80),data=String(input.data||'');
  if(!name||!['application/pdf','image/jpeg','image/png','image/webp'].includes(type)||!data.startsWith(`data:${type};base64,`))return json({message:'Envie um comprovante em PDF, JPG, PNG ou WEBP.'},400);
  if(data.length>1400000)return json({message:'O comprovante deve ter no máximo 1 MB.'},413);
  const uploadedAt=new Date().toISOString();
  await env.DB.prepare("UPDATE orders SET payment_proof_name=?,payment_proof_type=?,payment_proof_data=?,payment_proof_uploaded_at=?,payment_status=CASE WHEN payment_status='pending' THEN 'reported' ELSE payment_status END,updated_at=? WHERE id=?").bind(name,type,data,uploadedAt,uploadedAt,session.order_id).run();
  return json({ok:true,uploadedAt});
}

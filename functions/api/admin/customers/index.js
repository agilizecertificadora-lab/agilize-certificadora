import { clean,json,requireAdmin } from '../../../_lib/admin-auth.js';
import { publicCustomer,upsertCustomer } from '../../../_lib/customers.js';
export async function onRequestGet({request,env}){
  if(!await requireAdmin(request,env))return json({message:'Acesso não autorizado.'},401);
  const q=clean(new URL(request.url).searchParams.get('q'),120);let sql='SELECT * FROM customer_profiles',values=[];
  if(q){const like=`%${q}%`;sql+=' WHERE holder LIKE ? OR company LIKE ? OR document LIKE ? OR email LIKE ? OR phone LIKE ?';values=[like,like,like,like,like]}
  sql+=' ORDER BY datetime(updated_at) DESC,holder LIMIT 1000';const result=await env.DB.prepare(sql).bind(...values).all();
  return json({customers:(result.results||[]).map(publicCustomer)});
}
export async function onRequestPost({request,env}){
  if(!await requireAdmin(request,env))return json({message:'Acesso não autorizado.'},401);let input;try{input=await request.json()}catch{return json({message:'Dados inválidos.'},400)}
  const document=String(input.document||input.cnpj||input.cpf||'').replace(/\D/g,'');if(![11,14].includes(document.length)||!clean(input.holder,180))return json({message:'Informe nome e CPF/CNPJ válidos.'},400);
  await upsertCustomer(env,input,{source:'manual'});return json({ok:true},201);
}

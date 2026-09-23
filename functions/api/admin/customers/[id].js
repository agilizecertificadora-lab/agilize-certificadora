import { clean,json,requireAdmin } from '../../../_lib/admin-auth.js';
const digits=value=>String(value??'').replace(/\D/g,'');
export async function onRequestPatch({request,env,params}){
  if(!await requireAdmin(request,env))return json({message:'Acesso não autorizado.'},401);let input;try{input=await request.json()}catch{return json({message:'Dados inválidos.'},400)}
  const document=digits(input.document),person=document.length===14?'pj':'pf';if(![11,14].includes(document.length)||!clean(input.holder,180))return json({message:'Informe nome e CPF/CNPJ válidos.'},400);
  const address=JSON.stringify(input.address||{}),now=new Date().toISOString();
  const cpf=digits(input.cpf)||(person==='pf'?document:''),cnpj=digits(input.cnpj)||(person==='pj'?document:'');
  try{await env.DB.prepare(`UPDATE customer_profiles SET document=?,person=?,holder=?,cpf=?,birth=?,email=?,phone=?,cnpj=?,company=?,trade_name=?,address_json=?,city=?,notes=?,source='manual',updated_at=? WHERE id=?`).bind(document,person,clean(input.holder,180),cpf,clean(input.birth,10),clean(input.email,180).toLowerCase(),clean(input.phone,30),cnpj,clean(input.company,180),clean(input.tradeName,180),address,clean(input.address?.city,120),clean(input.notes,2000),now,params.id).run()}catch{return json({message:'Já existe outro cliente com este CPF/CNPJ.'},409)}
  return json({ok:true});
}

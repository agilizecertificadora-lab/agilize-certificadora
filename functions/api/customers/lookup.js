import { publicCustomer } from '../../_lib/customers.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
const digits=value=>String(value??'').replace(/\D/g,'');
export async function onRequestGet({request,env}){
  const url=new URL(request.url),document=digits(url.searchParams.get('document'));
  if(![11,14].includes(document.length))return Response.json({message:'Informe um CPF ou CNPJ válido.'},{status:400});
  if(!await requireAdmin(request,env))return Response.json({customer:null,authorized:false},{headers:{'Cache-Control':'no-store'}});
  const existing=await env.DB.prepare('SELECT * FROM customer_profiles WHERE document=? OR cpf=? ORDER BY datetime(updated_at) DESC LIMIT 1').bind(document,document).first();
  return Response.json({customer:publicCustomer(existing),authorized:true},{headers:{'Cache-Control':'no-store'}});
}

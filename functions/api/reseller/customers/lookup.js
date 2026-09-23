import { json } from '../../../_lib/admin-auth.js';
import { requireReseller } from '../../../_lib/reseller-auth.js';
import { publicCustomer } from '../../../_lib/customers.js';
const digits=value=>String(value??'').replace(/\D/g,'');
export async function onRequestGet({request,env}){
  if(!await requireReseller(request,env))return json({message:'Acesso não autorizado.'},401);
  const document=digits(new URL(request.url).searchParams.get('document'));
  if(![11,14].includes(document.length))return json({message:'Documento inválido.'},400);
  const customer=await env.DB.prepare('SELECT * FROM customer_profiles WHERE document=? OR cpf=? ORDER BY datetime(updated_at) DESC LIMIT 1').bind(document,document).first();
  return json({customer:publicCustomer(customer)});
}

import { publicCustomer } from '../../_lib/customers.js';
const digits=value=>String(value??'').replace(/\D/g,'');
export async function onRequestGet({request,env}){
  const url=new URL(request.url),document=digits(url.searchParams.get('document')),email=String(url.searchParams.get('email')||'').trim().toLowerCase();
  if(![11,14].includes(document.length)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({message:'Informe o documento e o e-mail já cadastrados.'},{status:400});
  const customer=await env.DB.prepare('SELECT * FROM customer_profiles WHERE (document=? OR cpf=?) AND lower(email)=? ORDER BY datetime(updated_at) DESC LIMIT 1').bind(document,document,email).first();
  if(!customer)return Response.json({customer:null});
  return Response.json({customer:publicCustomer(customer)},{headers:{'Cache-Control':'no-store'}});
}

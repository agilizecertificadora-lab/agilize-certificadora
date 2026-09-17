import { json,requireAdmin } from '../../_lib/admin-auth.js';
export async function onRequestGet({request,env}){
  if(!await requireAdmin(request,env))return json({message:'Acesso não autorizado.'},401);
  const id=new URL(request.url).searchParams.get('id')||'';
  const row=await env.DB.prepare('SELECT payment_proof_name,payment_proof_type,payment_proof_data FROM orders WHERE id=? LIMIT 1').bind(id).first();
  if(!row?.payment_proof_data)return json({message:'Comprovante não encontrado.'},404);
  const base64=row.payment_proof_data.split(',')[1]||'',bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'Content-Type':row.payment_proof_type||'application/octet-stream','Content-Disposition':`inline; filename="${String(row.payment_proof_name||'comprovante').replace(/["\r\n]/g,'')}"`,'Cache-Control':'private, no-store'}});
}

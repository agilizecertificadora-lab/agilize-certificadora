import { json, requireAdmin } from '../../_lib/admin-auth.js';
import { requirePartner } from '../../_lib/partner-auth.js';
export async function onRequestGet({request,env}){const admin=await requireAdmin(request,env);if(admin)return json({role:'admin',email:admin.email});const partner=await requirePartner(request,env);if(partner)return json({role:'partner',email:partner.email});return json({message:'Acesso não autorizado.'},401)}

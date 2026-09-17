import { json } from '../../../_lib/admin-auth.js';
import { requireCustomer,customerCookie } from '../../../_lib/customer-auth.js';
export async function onRequestPost({request,env}){const session=await requireCustomer(request,env);if(session)await env.DB.prepare('DELETE FROM customer_sessions WHERE id=?').bind(session.id).run();return json({ok:true},200,{'Set-Cookie':customerCookie('',0)})}

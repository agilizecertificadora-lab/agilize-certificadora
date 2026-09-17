import { json } from '../../../_lib/admin-auth.js';import { partnerCookie } from '../../../_lib/partner-auth.js';
export async function onRequestPost(){return json({ok:true},200,{'Set-Cookie':partnerCookie('',0)})}

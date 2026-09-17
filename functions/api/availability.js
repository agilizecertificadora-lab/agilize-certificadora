const ONLINE_SLOTS=['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
const PRESENTIAL_SLOTS=['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'];

export async function onRequestGet({request,env}){
  const url=new URL(request.url); const date=url.searchParams.get('date'); const mode=url.searchParams.get('mode')||'Online';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return Response.json({message:'Data inválida.'},{status:400});
  const chosen=new Date(`${date}T12:00:00-03:00`); const today=new Date(); today.setHours(0,0,0,0);
  if(Number.isNaN(chosen.getTime())||chosen<today)return Response.json({message:'Escolha uma data futura.'},{status:400});
  const weekday=chosen.getDay();
  if(mode.startsWith('Presencial')&&(weekday===0||weekday===6))return Response.json({slots:[]});
  const base=mode.startsWith('Presencial')?PRESENTIAL_SLOTS:ONLINE_SLOTS;
  const rows=env.DB?await env.DB.prepare("SELECT appointment_time FROM orders WHERE appointment_date=? AND mode=? AND status NOT IN ('cancelled','rejected')").bind(date,mode).all():{results:[]};
  const busy=new Set((rows.results||[]).map(row=>row.appointment_time));
  return Response.json({slots:base.filter(slot=>!busy.has(slot))});
}

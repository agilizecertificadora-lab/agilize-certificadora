const slots=(startHour,endHour)=>{const result=[];for(let minutes=startHour*60;minutes<=endHour*60;minutes+=30)result.push(`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`);return result};
const ONLINE_SLOTS=slots(9,21);
const PRESENTIAL_SLOTS=slots(9,17);
const saoPauloNow=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,minutes:Number(parts.hour)*60+Number(parts.minute)}};
export async function onRequestGet({request,env}){
  const url=new URL(request.url),date=url.searchParams.get('date'),mode=url.searchParams.get('mode')||'Online';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return Response.json({message:'Data inválida.'},{status:400});
  const current=saoPauloNow();if(date<current.date)return Response.json({message:'Escolha uma data futura.'},{status:400});
  const chosen=new Date(`${date}T12:00:00-03:00`),weekday=chosen.getDay();if(mode.startsWith('Presencial')&&(weekday===0||weekday===6))return Response.json({slots:[]});
  const base=mode.startsWith('Presencial')?PRESENTIAL_SLOTS:ONLINE_SLOTS;
  const rows=env.DB?await env.DB.prepare("SELECT appointment_time FROM orders WHERE appointment_date=? AND mode=? AND status NOT IN ('cancelled','rejected')").bind(date,mode).all():{results:[]};
  const busy=new Set((rows.results||[]).map(row=>row.appointment_time));
  const available=base.filter(slot=>{if(busy.has(slot))return false;if(date!==current.date)return true;const [h,m]=slot.split(':').map(Number);return h*60+m>current.minutes});
  return Response.json({slots:available});
}

const field=(id,value)=>`${id}${String(value.length).padStart(2,'0')}${value}`;
const ascii=(value,max)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 $%*+\-./:]/g,'').trim().toUpperCase().slice(0,max);
function crc16(value){let crc=0xFFFF;for(let i=0;i<value.length;i++){crc^=value.charCodeAt(i)<<8;for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xFFFF:(crc<<1)&0xFFFF;}return crc.toString(16).toUpperCase().padStart(4,'0');}
export function pixPayload({key,name,city,amountCents,txid,description}){
  const pixKey=String(key||'').trim(); if(!pixKey)throw new Error('missing_pix_key');
  const merchant=field('00','br.gov.bcb.pix')+field('01',pixKey)+(description?field('02',ascii(description,72)):'');
  const amount=(amountCents/100).toFixed(2); const transaction=ascii(txid,25)||'***';
  const base=field('00','01')+field('26',merchant)+field('52','0000')+field('53','986')+field('54',amount)+field('58','BR')+field('59',ascii(name,25))+field('60',ascii(city,15))+field('62',field('05',transaction))+'6304';
  return base+crc16(base);
}
export const paymentTxid=protocol=>String(protocol||'').replace(/^AGZ-/i,'').replace(/[^A-Za-z0-9]/g,'').slice(0,25).toUpperCase()||crypto.randomUUID().replaceAll('-','').slice(0,25).toUpperCase();

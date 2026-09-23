const clean=(value,max=500)=>String(value??'').trim().slice(0,max);
const digits=value=>clean(value).replace(/\D/g,'');

export function customerDocument(input){
  const cnpj=digits(input.cnpj||input.document);if(cnpj.length===14)return cnpj;
  const cpf=digits(input.cpf||input.document);return cpf.length===11?cpf:'';
}

export async function upsertCustomer(env,input,{source='order',protocol=''}={}){
  const document=customerDocument(input);if(!document)return;
  const person=document.length===14?'pj':'pf',now=new Date().toISOString();
  const cpf=digits(input.cpf)||(person==='pf'?document:'');
  const cnpj=digits(input.cnpj)||(person==='pj'?document:'');
  const address=typeof input.address_json==='string'?input.address_json:JSON.stringify(input.address||{});
  const city=clean(input.city||input.address?.city,120);
  await env.DB.prepare(`INSERT INTO customer_profiles
    (id,document,person,holder,cpf,birth,email,phone,cnpj,company,trade_name,address_json,city,notes,source,first_order_protocol,last_order_protocol,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(document) DO UPDATE SET
      person=excluded.person,
      holder=CASE WHEN excluded.holder<>'' THEN excluded.holder ELSE customer_profiles.holder END,
      cpf=CASE WHEN excluded.cpf<>'' THEN excluded.cpf ELSE customer_profiles.cpf END,
      birth=CASE WHEN excluded.birth<>'' THEN excluded.birth ELSE customer_profiles.birth END,
      email=CASE WHEN excluded.email<>'' THEN excluded.email ELSE customer_profiles.email END,
      phone=CASE WHEN excluded.phone<>'' THEN excluded.phone ELSE customer_profiles.phone END,
      cnpj=CASE WHEN excluded.cnpj<>'' THEN excluded.cnpj ELSE customer_profiles.cnpj END,
      company=CASE WHEN excluded.company<>'' THEN excluded.company ELSE customer_profiles.company END,
      trade_name=CASE WHEN excluded.trade_name<>'' THEN excluded.trade_name ELSE customer_profiles.trade_name END,
      address_json=CASE WHEN excluded.address_json NOT IN ('','{}') THEN excluded.address_json ELSE customer_profiles.address_json END,
      city=CASE WHEN excluded.city<>'' THEN excluded.city ELSE customer_profiles.city END,
      source=excluded.source,
      last_order_protocol=CASE WHEN excluded.last_order_protocol<>'' THEN excluded.last_order_protocol ELSE customer_profiles.last_order_protocol END,
      updated_at=excluded.updated_at`).bind(
      crypto.randomUUID(),document,person,clean(input.holder||input.name,180),cpf,clean(input.birth,10),clean(input.email,180).toLowerCase(),clean(input.phone,30),cnpj,clean(input.company,180),clean(input.trade_name||input.tradeName,180),address,city,clean(input.notes,2000),clean(source,30),clean(protocol,80),clean(protocol,80),now,now
    ).run();
}

export function publicCustomer(row){
  if(!row)return null;let address={};try{address=JSON.parse(row.address_json||'{}')}catch{}
  return {id:row.id,document:row.document,person:row.person,holder:row.holder,cpf:row.cpf||'',birth:row.birth||'',email:row.email||'',phone:row.phone||'',cnpj:row.cnpj||'',company:row.company||'',tradeName:row.trade_name||'',address,city:row.city||'',notes:row.notes||'',source:row.source,updatedAt:row.updated_at};
}

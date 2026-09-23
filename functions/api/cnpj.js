const digits=value=>String(value??'').replace(/\D/g,'');

export async function onRequestGet({request}){
  const cnpj=digits(new URL(request.url).searchParams.get('cnpj'));
  if(cnpj.length!==14)return Response.json({message:'Informe um CNPJ com 14 números.'},{status:400});
  try{
    const response=await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,{headers:{Accept:'application/json'}});
    if(response.ok){const company=await response.json();return Response.json({company:company.razao_social||'',tradeName:company.nome_fantasia||'',status:company.descricao_situacao_cadastral||'',address:{zip:digits(company.cep).slice(0,8),street:company.logradouro||'',number:String(company.numero||''),extra:company.complemento||'',district:company.bairro||'',city:company.municipio||'',state:company.uf||''}},{headers:{'Cache-Control':'public, max-age=3600'}})}
    if(response.status===404)return Response.json({message:'CNPJ não encontrado.'},{status:404});
  }catch{}
  try{
    const response=await fetch(`https://open.cnpja.com/office/${cnpj}`,{headers:{Accept:'application/json'}});
    if(!response.ok)return Response.json({message:response.status===404?'CNPJ não encontrado.':'A consulta de CNPJ está temporariamente indisponível.'},{status:response.status===404?404:502});
    const company=await response.json();
    return Response.json({
      company:company.company?.name||'',
      tradeName:company.alias||'',
      status:company.status?.text||'',
      address:{zip:digits(company.address?.zip).slice(0,8),street:[company.address?.type,company.address?.street].filter(Boolean).join(' '),number:String(company.address?.number||''),extra:company.address?.details||'',district:company.address?.district||'',city:company.address?.city||'',state:company.address?.state||''}
    },{headers:{'Cache-Control':'public, max-age=3600'}});
  }catch{
    return Response.json({message:'Não foi possível consultar o CNPJ agora.'},{status:502});
  }
}

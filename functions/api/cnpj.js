const digits=value=>String(value??'').replace(/\D/g,'');

export async function onRequestGet({request}){
  const cnpj=digits(new URL(request.url).searchParams.get('cnpj'));
  if(cnpj.length!==14)return Response.json({message:'Informe um CNPJ com 14 números.'},{status:400});
  try{
    const response=await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,{headers:{Accept:'application/json'},cf:{cacheEverything:true,cacheTtl:86400}});
    if(response.status===404)return Response.json({message:'CNPJ não encontrado.'},{status:404});
    if(!response.ok)return Response.json({message:'A consulta de CNPJ está temporariamente indisponível.'},{status:502});
    const company=await response.json();
    return Response.json({
      company:company.razao_social||'',
      tradeName:company.nome_fantasia||'',
      status:company.descricao_situacao_cadastral||''
    },{headers:{'Cache-Control':'public, max-age=3600'}});
  }catch{
    return Response.json({message:'Não foi possível consultar o CNPJ agora.'},{status:502});
  }
}

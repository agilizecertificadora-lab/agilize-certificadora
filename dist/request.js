const form = document.querySelector('#request-form');
const steps = [...document.querySelectorAll('.form-step')];
const person = form.elements.person;
const certificate = form.elements.certificate;
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
form.elements.date.min = localDate;
form.elements.birth.max = localDate;
let current = 0;
let reviewedPayload = null;
function selectedProduct(){ return AGILIZE_CATALOG.find(item=>item.id===certificate.value); }
function populateProducts(preferred){
 const items=AGILIZE_CATALOG.filter(item=>item.person===person.value && item.publishable!==false);
 certificate.replaceChildren();
 items.forEach(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.title+' · '+agilizePrice(item.priceCents);certificate.append(option);});
 if(items.some(item=>item.id===preferred))certificate.value=preferred;
}
function configure() {
  if(!selectedProduct() || selectedProduct().person!==person.value)populateProducts();
  const pj = person.value === 'pj';
  document.querySelectorAll('.pj-only,.pf-only').forEach(label => {
    const active = label.classList.contains('pj-only') ? pj : !pj;
    label.hidden = !active;
    const input = label.querySelector('input');
    input.disabled = !active;
    input.required = active && !['tradeName','extra'].includes(input.name);
  });
  document.querySelector('#name-label').textContent = pj ? 'Nome completo do responsável' : 'Nome completo do titular';
  document.querySelector('#holder-note').textContent = pj ? 'Informe os dados pessoais do sócio ou responsável que fará o certificado.' : 'Informe os dados da pessoa que será titular do certificado.';
  document.querySelector('#summary-product').textContent = selectedProduct().title;
  document.querySelector('.summary-price strong').textContent = agilizePrice(selectedProduct().priceCents);
  document.querySelector('#variant-detail').textContent = 'Validade: '+selectedProduct().validity+'.';
  document.querySelector('#summary-details').textContent = selectedProduct().issuance+' · '+selectedProduct().storage+'.';
  document.querySelector('#summary-plus').hidden = !selectedProduct().plusIncluded;
  document.querySelector('#summary-person').textContent = pj ? 'Pessoa jurídica' : 'Pessoa física';
}
function showStep(index) {
  current = index;
  steps.forEach((section,i)=>{section.hidden=i!==index;});
  document.querySelectorAll('.progress li').forEach((item,i)=>{if(i===index)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
  document.querySelector('#back').hidden=index===0;
  document.querySelector('#next').textContent=index===2?'Revisar pedido →':'Continuar →';
  document.querySelector('#form-error').textContent='';
  steps[index].querySelector('h2').focus();
}
person.addEventListener('change',configure);
certificate.addEventListener('change',configure);
async function loadAvailability(){
  const date=form.elements.date.value; const time=form.elements.time; const note=document.querySelector('#availability-note');
  time.disabled=true; time.replaceChildren(new Option(date?'Consultando horários…':'Escolha primeiro uma data',''));
  if(!date)return;
  try{
    const response=await fetch(`/api/availability?date=${encodeURIComponent(date)}&mode=${encodeURIComponent(form.elements.mode.value)}`);
    if(!response.ok)throw new Error('availability');
    const result=await response.json(); time.replaceChildren(new Option('Escolha um horário',''));
    result.slots.forEach(slot=>time.add(new Option(slot,slot))); time.disabled=!result.slots.length;
    note.textContent=result.slots.length?'Escolha um horário. A Agilize fará a confirmação final do atendimento.':'Não há horários disponíveis nessa data. Escolha outro dia.';
  }catch{
    time.replaceChildren(new Option('Horários temporariamente indisponíveis','')); note.textContent='Não foi possível consultar a agenda agora. Tente novamente ou fale com a Agilize pelo WhatsApp.';
  }
}
form.elements.date.addEventListener('change',loadAvailability);
form.elements.mode.addEventListener('change',loadAvailability);
const requestParams = new URLSearchParams(location.search);
const product = requestParams.get('produto');
const renewalToken = requestParams.get('renovacao');
const chosen=AGILIZE_CATALOG.find(item=>item.id===product && item.person!=='syn' && item.publishable!==false);
if(chosen)person.value=chosen.person;
if(product==='e-CNPJ A1') person.value='pj';
populateProducts(chosen?.id);
if(product==='Certificado A3')certificate.value=AGILIZE_CATALOG.find(item=>item.person===person.value&&item.type==='A3').id;
configure();
async function loadRenewalInvite(){
  if(!renewalToken)return;
  try{
    const response=await fetch(`/api/renewal/${encodeURIComponent(renewalToken)}`);
    const result=await response.json();if(!response.ok)throw new Error(result.message||'Convite não encontrado.');
    const renewal=result.renewal;const matched=AGILIZE_CATALOG.find(item=>item.publishable!==false&&(item.name===renewal.product||item.title===renewal.product));
    if(matched){person.value=matched.person;populateProducts(matched.id);certificate.value=matched.id;configure()}
    form.elements.purpose.value='Renovação';
    if(matched?.person==='pj')form.elements.company.value=renewal.name||'';else form.elements.holder.value=renewal.name||'';
    form.elements.email.value=/^x+@/i.test(renewal.email||'')?'':(renewal.email||'');
    const phoneDigits=digits(renewal.phone||'').slice(-11);if(phoneDigits)form.elements.phone.value=phoneDigits.length>10?phoneDigits.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3'):phoneDigits.replace(/^(\d{2})(\d{4})(\d{4})$/,'($1) $2-$3');
    document.querySelector('.demo-notice').textContent='Renovação identificada. Confira seus dados, escolha o horário e conclua a solicitação.';
  }catch(error){document.querySelector('.demo-notice').textContent=error.message+' Você ainda pode preencher a solicitação normalmente.'}
}
loadRenewalInvite();
const digits = value=>value.replace(/\D/g,'');
form.elements.cnpj.addEventListener('input',event=>{const n=digits(event.target.value).slice(0,14);event.target.value=n.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');});
form.elements.cpf.addEventListener('input',event=>{const n=digits(event.target.value).slice(0,11);event.target.value=n.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');});
let lastZip='',zipTimer;
const zipStatus=document.createElement('small');zipStatus.className='cep-status';zipStatus.setAttribute('aria-live','polite');form.elements.zip.closest('label').append(zipStatus);
form.elements.zip.addEventListener('input',event=>{const zip=digits(event.target.value).slice(0,8);event.target.value=zip.replace(/^(\d{5})(\d)/,'$1-$2');clearTimeout(zipTimer);if(zip.length===8)zipTimer=setTimeout(()=>lookupZip(zip),250);else{lastZip='';zipStatus.textContent=''}});
form.elements.zip.addEventListener('blur',()=>{const zip=digits(form.elements.zip.value);if(zip.length===8)lookupZip(zip)});
async function lookupZip(zip){
  if(zip===lastZip)return;lastZip=zip;zipStatus.textContent='Consultando CEP…';
  try{
    const response=await fetch(`https://brasilapi.com.br/api/cep/v1/${zip}`);
    if(!response.ok)throw new Error('not-found');
    const address=await response.json();
    form.elements.street.value=address.street||'';form.elements.district.value=address.neighborhood||'';form.elements.city.value=address.city||'';form.elements.state.value=address.state||'';
    zipStatus.textContent='Endereço preenchido automaticamente.';
    if(address.street)form.elements.number.focus();
  }catch{lastZip='';zipStatus.textContent='CEP não encontrado. Preencha o endereço manualmente.'}
}
form.elements.phone.addEventListener('input',event=>{const n=digits(event.target.value).slice(0,11);event.target.value=n.length>10?n.replace(/^(\d{2})(\d{5})(\d*)$/,'($1) $2-$3'):n.replace(/^(\d{2})(\d{4})(\d*)$/,'($1) $2-$3');});
form.elements.state.addEventListener('input',event=>{event.target.value=event.target.value.replace(/[^a-z]/gi,'').toUpperCase();});
function validateStep(index){
  const fields=[...steps[index].querySelectorAll('input,select')].filter(field=>!field.disabled);
  fields.forEach(field=>field.setCustomValidity(''));
  for(const field of fields){if(field.required && field.type!=='checkbox' && !field.value.trim())field.setCustomValidity('Preencha este campo.');}
  const invalid=fields.find(field=>!field.checkValidity());
  if(invalid){showStep(index);document.querySelector('#form-error').textContent='Confira o campo indicado antes de continuar.';invalid.reportValidity();return false;}
  return true;
}
form.addEventListener('input',event=>{if(event.target.setCustomValidity)event.target.setCustomValidity('');});
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!validateStep(current))return;
  if(current<2){showStep(current+1);return;}
  for(let i=0;i<3;i++)if(!validateStep(i))return;
  const data=new FormData(form);
  reviewedPayload=Object.fromEntries(data.entries());
  reviewedPayload.product={id:selectedProduct().id,title:selectedProduct().title,priceCents:selectedProduct().priceCents,validity:selectedProduct().validity,plusIncluded:selectedProduct().plusIncluded};
  if(renewalToken)reviewedPayload.renewalToken=renewalToken;
  const list=document.querySelector('#review-list');list.replaceChildren();
  const add=(label,value)=>{const row=document.createElement('div');const term=document.createElement('dt');const desc=document.createElement('dd');term.textContent=label;desc.textContent=value;row.append(term,desc);list.append(row);};
  add('Certificado',document.querySelector('#summary-product').textContent);
  add('Emissão',selectedProduct().issuance);add('Armazenamento',selectedProduct().storage);if(selectedProduct().plusIncluded)add('Agilize Plus','Incluído · 1 utilização durante a validade, conforme condições');
  add('Objetivo',data.get('purpose'));
  if(person.value==='pj'){add('Empresa',data.get('company'));add('CNPJ',data.get('cnpj'));if(data.get('tradeName'))add('Nome fantasia',data.get('tradeName'));}
  add('Titular / responsável',data.get('holder'));add('CPF',data.get('cpf'));add('Nascimento',data.get('birth').split('-').reverse().join('/'));add('E-mail',data.get('email'));add('WhatsApp',data.get('phone'));
  if(person.value==='pf')add('Endereço',`${data.get('street')}, ${data.get('number')}${data.get('extra')?' · '+data.get('extra'):''} · ${data.get('district')} · ${data.get('city')}/${data.get('state')} · CEP ${data.get('zip')}`);
  add('Atendimento',data.get('mode'));add('Preferência, sujeita a confirmação',`${data.get('date').split('-').reverse().join('/')} às ${data.get('time')}`);add('Valor',agilizePrice(selectedProduct().priceCents));add('Validade',selectedProduct().validity);
  form.hidden=true;document.querySelector('#review').hidden=false;document.querySelector('#review h2').focus();
});
document.querySelector('#back').addEventListener('click',()=>showStep(Math.max(0,current-1)));
document.querySelector('#edit').addEventListener('click',()=>{document.querySelector('#review').hidden=true;form.hidden=false;showStep(0);});
document.querySelector('#send-order').addEventListener('click',async()=>{
  const button=document.querySelector('#send-order'); const status=document.querySelector('#submit-status'); button.disabled=true; status.textContent='Enviando seu pedido…';
  try{
    const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reviewedPayload)});
    const result=await response.json(); if(!response.ok)throw new Error(result.message||'Não foi possível enviar o pedido.');
    document.querySelector('#review').hidden=true; document.querySelector('#confirmation').hidden=false; document.querySelector('#protocol').textContent=result.protocol; renderPayment(result.payment); document.querySelector('#confirmation h2').focus(); form.reset(); reviewedPayload=null;
  }catch(error){status.textContent=error.message||'Não foi possível enviar agora. Tente novamente.'; button.disabled=false;}
});
window.addEventListener('pageshow',event=>{if(event.persisted){form.reset();document.querySelector('#review-list').replaceChildren();document.querySelector('#review').hidden=true;document.querySelector('#confirmation').hidden=true;form.hidden=false;configure();showStep(0);}});


function renderPayment(payment){const box=document.querySelector('#pix-payment');const consult=document.querySelector('#payment-consult');if(!payment){box.hidden=true;consult.hidden=false;return}consult.hidden=true;box.hidden=false;document.querySelector('#pix-amount').textContent=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(payment.amountCents/100);const field=document.querySelector('#pix-copy-paste');field.value=payment.copyPaste;const qr=document.querySelector('#pix-qrcode');qr.replaceChildren();new QRCode(qr,{text:payment.copyPaste,width:220,height:220,colorDark:'#031127',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}
document.querySelector('#copy-pix').addEventListener('click',async()=>{const field=document.querySelector('#pix-copy-paste');try{await navigator.clipboard.writeText(field.value)}catch{field.select();document.execCommand('copy')}const button=document.querySelector('#copy-pix');button.textContent='Código PIX copiado';setTimeout(()=>button.textContent='Copiar código PIX',2200)});

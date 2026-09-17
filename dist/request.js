const form = document.querySelector('#request-form');
const steps = [...document.querySelectorAll('.form-step')];
const person = form.elements.person;
const certificate = form.elements.certificate;
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
form.elements.date.min = localDate;
form.elements.birth.max = localDate;
let current = 0;
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
  document.querySelector('#next').textContent=index===2?'Revisar simulação →':'Continuar →';
  document.querySelector('#form-error').textContent='';
  steps[index].querySelector('h2').focus();
}
person.addEventListener('change',configure);
certificate.addEventListener('change',configure);
const product = new URLSearchParams(location.search).get('produto');
const chosen=AGILIZE_CATALOG.find(item=>item.id===product && item.person!=='syn' && item.publishable!==false);
if(chosen)person.value=chosen.person;
if(product==='e-CNPJ A1') person.value='pj';
populateProducts(chosen?.id);
if(product==='Certificado A3')certificate.value=AGILIZE_CATALOG.find(item=>item.person===person.value&&item.type==='A3').id;
configure();
const digits = value=>value.replace(/\D/g,'');
form.elements.cpf.addEventListener('input',event=>{const n=digits(event.target.value).slice(0,11);event.target.value=n.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');});
form.elements.zip.addEventListener('input',event=>{event.target.value=digits(event.target.value).slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2');});
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
document.querySelector('#clear').addEventListener('click',()=>{form.reset();document.querySelector('#review-list').replaceChildren();document.querySelector('#review').hidden=true;form.hidden=false;configure();showStep(0);});
window.addEventListener('pageshow',event=>{if(event.persisted){form.reset();document.querySelector('#review-list').replaceChildren();document.querySelector('#review').hidden=true;form.hidden=false;configure();showStep(0);}});


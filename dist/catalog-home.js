(async()=>{
try{
  const response=await fetch('/api/products',{cache:'no-store'});if(!response.ok)throw new Error('catalog');
  const result=await response.json();const values=new Map((result.products||[]).map(row=>[row.product_id,row]));
  AGILIZE_CATALOG.forEach(item=>{const row=values.get(item.id);if(!row)return;item.title=row.title||item.title;item.priceCents=row.sale_price_cents;item.publishable=row.active===1&&Number.isInteger(row.sale_price_cents)});
}catch{ /* Mantém o catálogo incorporado como contingência. */ }
const catalogCards = document.querySelector('#catalog-cards');
const publicCatalog = AGILIZE_CATALOG.filter(item => item.publishable !== false);
const groups = [{person:'pf',type:'A1',title:'e-CPF A1'},{person:'pj',type:'A1',title:'e-CNPJ A1'},{person:'pf',type:'A3',title:'e-CPF A3'},{person:'pj',type:'A3',title:'e-CNPJ A3'}];
groups.forEach(group => {
  const items = publicCatalog.filter(item => item.person === group.person && item.type === group.type);
  if (!items.length) return;
  const card = document.createElement('article'); card.className = 'certificate'; card.dataset.category = group.person;
  const top = document.createElement('div'); top.className = 'card-top';
  const badge = document.createElement('span'); badge.className = 'pill'; badge.textContent = group.person === 'pf' ? 'PESSOA FÍSICA' : 'PESSOA JURÍDICA';
  const plusBadge = document.createElement('span'); plusBadge.className = 'plus-badge'; plusBadge.textContent = 'AGILIZE PLUS'; plusBadge.hidden = true; top.append(badge, plusBadge);
  const title = document.createElement('h3'); title.textContent = group.title;
  const label = document.createElement('label'); label.className = 'catalog-select-label'; label.textContent = 'Escolha a opção';
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Opções de ' + group.title);
  items.forEach(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.title; select.append(option); }); label.append(select);
  const tags = document.createElement('div'); tags.className = 'variant-tags';
  const note = document.createElement('p'); note.className = 'variant-note';
  const features = document.createElement('ul'); features.className = 'feature-list';
  const bottom = document.createElement('div'); bottom.className = 'card-bottom';
  const priceWrap = document.createElement('span'); priceWrap.textContent = 'Valor do certificado'; const price = document.createElement('strong'); priceWrap.append(price);
  const link = document.createElement('a'); link.className = 'product-link'; link.textContent = 'Selecionar ↗';
  const update = () => {
    const item = items.find(i => i.id === select.value); price.textContent = agilizePrice(item.priceCents); plusBadge.hidden = !item.plusIncluded; tags.replaceChildren();
    [item.type, item.validity, item.issuance].forEach(text => { const tag = document.createElement('span'); tag.textContent = text; tags.append(tag); });
    note.textContent = item.storage + '. ' + (item.plusIncluded ? 'Agilize Plus incluído: 1 utilização durante a validade, conforme condições.' : 'Mídia e acessórios, quando necessários, serão confirmados no atendimento.');
    features.replaceChildren(...item.features.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    link.href = 'solicitar.html?produto=' + encodeURIComponent(item.id); link.setAttribute('aria-label', 'Selecionar ' + item.title);
  };
  select.addEventListener('change', update); bottom.append(priceWrap, link); card.append(top, title, label, tags, note, features, bottom); catalogCards.append(card); update();
});
})();

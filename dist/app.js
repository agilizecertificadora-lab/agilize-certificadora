const menu = document.querySelector('.menu-toggle');
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); document.querySelector('#nav').classList.toggle('open', open); });
document.querySelectorAll('#nav a').forEach(a => a.addEventListener('click', () => { menu.setAttribute('aria-expanded', 'false'); document.querySelector('#nav').classList.remove('open'); }));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-filter]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); }); document.querySelectorAll('[data-category]').forEach(card => { card.hidden = button.dataset.filter !== 'todos' && !card.dataset.category.split(' ').includes(button.dataset.filter); }); }));
const dialog = document.querySelector('#preview-dialog');
const copy = {
 cliente: ['Área do cliente', 'Em preparação: seus pedidos, agendamentos, pagamentos e renovações em um só lugar. Esta prévia ainda não permite entrar em uma conta.'],
 agenda: ['Agendar atendimento', 'O agendamento online está em preparação. Nesta prévia, nenhum horário é reservado. Você pode solicitar atendimento pelo e-mail abaixo.'],
 pedido: ['Acompanhar pedido', 'A consulta por protocolo estará disponível na próxima etapa. Esta prévia ainda não acessa pedidos reais.'],
 acessorios: ['Tokens, cartões e leitoras', 'Consulte nossa equipe para confirmar os modelos, valores e a compatibilidade com seu certificado.'],
 socio: ['Portal do Sócio', 'Área restrita em preparação, com acesso próprio, histórico das operações, repasses por PIX e fechamento mensal. Nenhum dado financeiro está disponível nesta prévia pública.'],
 admin: ['Acesso administrativo', 'O painel de gestão está previsto na próxima etapa, com acesso restrito à equipe autorizada. Esta prévia não possui autenticação.']
};
function show(title, description, subject = title) { document.querySelector('#dialog-title').textContent = title; document.querySelector('#dialog-copy').textContent = description; document.querySelector('#dialog-email').href = 'mailto:agilizecertificadora@gmail.com?subject=' + encodeURIComponent(subject); dialog.showModal(); }
document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => show(...copy[button.dataset.preview])));
document.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', () => show(button.dataset.product, 'Fale com a Agilize para confirmar disponibilidade, validade, valor e a modalidade adequada ao seu uso. Nenhum pedido ou pagamento é gerado nesta prévia.', 'Consulta de certificado: ' + button.dataset.product)));
document.querySelectorAll('.dialog-close,.dialog-back').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

const plusDialog = document.querySelector('#plus-dialog');
document.querySelector('.plus-open')?.addEventListener('click', () => plusDialog.showModal());
plusDialog?.querySelectorAll('.dialog-close,.dialog-back').forEach(button => button.addEventListener('click', () => plusDialog.close()));
plusDialog?.addEventListener('click', event => { if (event.target === plusDialog) { const rect = plusDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) plusDialog.close(); } });

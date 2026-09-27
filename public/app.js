const products = window.CVT_PRODUCTS;

const $ = (selector) => document.querySelector(selector);
const grid = $('#productGrid');
const quoteCount = $('#quoteCount');
const drawer = $('#quoteDrawer');
const overlay = $('#overlay');
const dialog = $('#productDialog');
let activeFilter = 'Todos';
let searchTerm = '';
let lastFocus = null;
let config = { whatsapp:'', email:'', photosEnabled:false };
let cart = [];
try {
  const stored = JSON.parse(localStorage.getItem('cvt-cart') || 'null');
  const source = Array.isArray(stored) ? stored : JSON.parse(localStorage.getItem('cvt-quote') || '[]').map(id => ({ id, quantity:1 }));
  cart = source.filter(item => products.some(product => product.id === item.id)).map(item => ({ id:item.id, quantity:Math.min(99, Math.max(1, Number.parseInt(item.quantity, 10) || 1)) }));
} catch { cart = []; }

function saveCart() {
  localStorage.setItem('cvt-cart', JSON.stringify(cart));
  quoteCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
  renderDrawer();
}
function setFilter(value) {
  activeFilter = value;
  document.querySelectorAll('.filter').forEach(button => {
    const active = button.dataset.filter === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderProducts();
}
function renderProducts() {
  const term = searchTerm.toLocaleLowerCase('pt-BR');
  const visible = products.filter(product => (activeFilter === 'Todos' || product.category === activeFilter) && `${product.name} ${product.category} ${product.teaser}`.toLocaleLowerCase('pt-BR').includes(term));
  grid.replaceChildren();
  for (const product of visible) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `<div class="product-image"><img src="${product.image}" alt="Imagem ilustrativa de ${product.name.toLocaleLowerCase('pt-BR')}" loading="lazy"><span class="badge">${product.badge}</span><button type="button" class="quickview" data-view="${product.id}">${product.id === 'cartoes' ? 'Personalizar cartão ↗' : 'Ver detalhes ↗'}</button></div><div class="product-body"><div><small>${product.category}</small><h3>${product.name}</h3><p>${product.teaser}</p></div><button type="button" data-add="${product.id}" aria-label="${product.id === 'cartoes' ? 'Personalizar' : 'Adicionar'} ${product.name}${product.id === 'cartoes' ? '' : ' ao carrinho'}">${product.id === 'cartoes' ? '↗' : '+'}</button></div>`;
    card.querySelector('img').loading = 'eager';
    const imageArea = card.querySelector('.product-image');
    imageArea.tabIndex = 0;
    imageArea.setAttribute('role', 'button');
    imageArea.setAttribute('aria-label', `Ver detalhes de ${product.name}`);
    imageArea.addEventListener('click', event => { if (!event.target.closest('button')) showProduct(product.id); });
    imageArea.addEventListener('keydown', event => { if (event.target === imageArea && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showProduct(product.id); } });
    grid.append(card);
  }
  $('#resultCount').textContent = `${visible.length} ${visible.length === 1 ? 'solução' : 'soluções'}`;
  $('#emptyState').hidden = visible.length > 0;
}
function addProduct(id) {
  if (id === 'cartoes') { window.location.href = '/cartao-de-visita.html'; return; }
  const item = cart.find(entry => entry.id === id);
  if (item) item.quantity = Math.min(99, item.quantity + 1);
  else cart.push({ id, quantity:1 });
  saveCart();
  if (dialog.open) dialog.close();
  openDrawer();
}
function showProduct(id) {
  if (id === 'cartoes') { window.location.href = '/cartao-de-visita.html'; return; }
  const product = products.find(item => item.id === id);
  if (!product) return;
  $('#productDetail').innerHTML = `<div class="product-detail"><img src="${product.image}" alt="Imagem ilustrativa de ${product.name.toLocaleLowerCase('pt-BR')}"><div class="detail-copy"><span class="eyebrow">${product.category} / projeto sob medida</span><h2>${product.name}</h2><p>${product.description}</p><ul>${product.options.map(option => `<li>${option}</li>`).join('')}</ul><button class="button button-dark" data-add="${product.id}">Adicionar ao carrinho <span aria-hidden="true">↗</span></button><a class="credit" href="${product.photo}" target="_blank" rel="noopener noreferrer">Foto ilustrativa: ${product.credit} / Pexels ↗</a></div></div>`;
  dialog.showModal();
}
function openDrawer() {
  lastFocus = document.activeElement;
  overlay.hidden = false;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
  $('#closeDrawer').focus();
}
function closeDrawer() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  document.body.classList.remove('locked');
  $('#contactMessage').textContent = '';
  lastFocus?.focus?.();
}
function renderDrawer() {
  const target = $('#drawerItems');
  target.replaceChildren();
  const needsCardConfiguration = cart.some(item => item.id === 'cartoes') && !sessionStorage.getItem('cvt-card-config');
  $('#sendQuote').disabled = cart.length === 0;
  $('#sendQuote').firstChild.textContent = needsCardConfiguration ? 'Personalizar cartão ' : 'Informar endereço e revisar ';
  if (!cart.length) {
    target.innerHTML = '<div class="drawer-empty"><span style="font-size:42px;color:var(--orange)">◇</span><h3>Nenhuma solução selecionada</h3><p>Escolha os serviços que seu projeto precisa para preparar o pedido.</p></div>';
    return;
  }
  for (const item of cart) {
    const product = products.find(entry => entry.id === item.id);
    const row = document.createElement('div');
    row.className = 'drawer-item';
    if (product.id === 'cartoes') {
      let configuration = null;
      try { configuration = JSON.parse(sessionStorage.getItem('cvt-card-config') || 'null'); } catch { /* configuração será refeita */ }
      row.innerHTML = `<img src="${product.image}" alt=""><div><strong>${product.name}</strong><small></small><a class="drawer-edit-link" href="/cartao-de-visita.html">${configuration ? 'Editar personalização' : 'Personalizar antes de continuar'} ↗</a></div><button type="button" data-remove="${product.id}" aria-label="Remover ${product.name}">×</button>`;
      row.querySelector('small').textContent = configuration ? `${configuration.runQuantity || '—'} cartões · valor sob orçamento` : 'Configuração pendente';
    } else {
      row.innerHTML = `<img src="${product.image}" alt=""><div><strong>${product.name}</strong><small>Valor sob orçamento</small><div class="drawer-quantity"><button type="button" data-decrease="${product.id}" aria-label="Diminuir ${product.name}">−</button><span>${item.quantity}</span><button type="button" data-increase="${product.id}" aria-label="Aumentar ${product.name}">+</button></div></div><button type="button" data-remove="${product.id}" aria-label="Remover ${product.name}">×</button>`;
    }
    target.append(row);
  }
}
function openCheckout() {
  if (!cart.length) return;
  sessionStorage.setItem('cvt-project-notes', $('#projectNotes').value.trim());
  window.location.href = cart.some(item => item.id === 'cartoes') && !sessionStorage.getItem('cvt-card-config') ? '/cartao-de-visita.html' : '/checkout.html';
}
function fallbackPhotos() {
  return [
    { src:'/assets/fachada.jpg', alt:'Letreiro em fachada', photographer:'aysenurhamra', url:'https://www.pexels.com/photo/an-acrylic-signage-of-a-business-9101747/' },
    { src:'/assets/cartoes.jpg', alt:'Cartões em branco', photographer:'Kaboompics', url:'https://www.pexels.com/photo/blank-business-cards-on-textured-surface-8947634/' },
    { src:'/assets/hero.jpg', alt:'Impressão profissional', photographer:'Deybson Mallony', url:'https://www.pexels.com/photo/close-up-of-a-printed-photo-5727002/' }
  ];
}
function renderInspiration(photos) {
  const gallery = $('#inspirationGrid');
  gallery.replaceChildren();
  for (const photo of photos.slice(0, 3)) {
    const card = document.createElement('div');
    card.className = 'inspiration-card';
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.alt || 'Inspiração visual';
    img.loading = 'lazy';
    const credit = document.createElement('a');
    credit.href = photo.url;
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
    credit.textContent = `Foto: ${photo.photographer} / Pexels ↗`;
    card.append(img, credit);
    gallery.append(card);
  }
}
async function loadConfigAndPhotos() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) config = await response.json();
  } catch { /* imagens locais mantêm a vitrine funcional */ }
  if (!config.photosEnabled) {
    $('#inspirationStatus').textContent = '';
    return;
  }
  try {
    const response = await fetch('/api/photos?query=design%20studio%20printing');
    if (!response.ok) throw new Error('API indisponível');
    const data = await response.json();
    if (data.photos?.length) {
      renderInspiration(data.photos);
      $('#inspirationStatus').textContent = '';
    }
  } catch { $('#inspirationStatus').textContent = ''; }
}

grid.addEventListener('click', event => {
  const add = event.target.closest('[data-add]');
  const view = event.target.closest('[data-view]');
  if (add) addProduct(add.dataset.add);
  if (view) showProduct(view.dataset.view);
});
$('#productDetail').addEventListener('click', event => { const add = event.target.closest('[data-add]'); if (add) addProduct(add.dataset.add); });
$('#drawerItems').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  const increase = event.target.closest('[data-increase]');
  const decrease = event.target.closest('[data-decrease]');
  if (remove) {
    cart = cart.filter(item => item.id !== remove.dataset.remove);
    if (remove.dataset.remove === 'cartoes') sessionStorage.removeItem('cvt-card-config');
  }
  else if (increase) cart.find(item => item.id === increase.dataset.increase).quantity = Math.min(99, cart.find(item => item.id === increase.dataset.increase).quantity + 1);
  else if (decrease) {
    const item = cart.find(entry => entry.id === decrease.dataset.decrease);
    item.quantity = Math.max(1, item.quantity - 1);
  } else return;
  saveCart();
});
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
document.querySelectorAll('[data-category], [data-nav-filter]').forEach(link => link.addEventListener('click', () => { searchTerm = ''; $('#siteSearch').value = ''; setFilter(link.dataset.category || link.dataset.navFilter); $('#mainNav').classList.remove('open'); $('#menuToggle').setAttribute('aria-expanded', 'false'); }));
$('#resetFilters').addEventListener('click', () => { searchTerm = ''; $('#siteSearch').value = ''; setFilter('Todos'); });
$('#searchToggle').addEventListener('click', () => { const panel = $('#searchPanel'); panel.hidden = !panel.hidden; $('#searchToggle').setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) $('#siteSearch').focus(); });
$('#siteSearch').addEventListener('input', event => { searchTerm = event.target.value.trim(); setFilter('Todos'); });
$('#siteSearch').addEventListener('keydown', event => { if (event.key === 'Enter') { $('#searchPanel').hidden = true; $('#searchToggle').setAttribute('aria-expanded', 'false'); $('#solucoes').scrollIntoView(); } });
$('#searchGo').addEventListener('click', () => { $('#searchPanel').hidden = true; $('#searchToggle').setAttribute('aria-expanded', 'false'); $('#solucoes').scrollIntoView(); });
$('#menuToggle').addEventListener('click', () => { const open = $('#mainNav').classList.toggle('open'); $('#menuToggle').setAttribute('aria-expanded', String(open)); });
document.querySelectorAll('#mainNav a').forEach(link => link.addEventListener('click', () => { $('#mainNav').classList.remove('open'); $('#menuToggle').setAttribute('aria-expanded', 'false'); }));
document.querySelectorAll('#openQuote,#contactQuote,#footerQuote').forEach(button => button.addEventListener('click', openDrawer));
$('#closeDrawer').addEventListener('click', closeDrawer);
$('#closeProduct').addEventListener('click', () => dialog.close());
$('#overlay').addEventListener('click', closeDrawer);
$('#sendQuote').addEventListener('click', openCheckout);
document.addEventListener('keydown', event => {
  if (!drawer.classList.contains('open')) return;
  if (event.key === 'Escape') { closeDrawer(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...drawer.querySelectorAll('button:not([disabled]),textarea:not([disabled]),a[href]')].filter(element => element.getClientRects().length);
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('#year').textContent = new Date().getFullYear();
renderProducts();
saveCart();
renderInspiration(fallbackPhotos());
loadConfigAndPhotos();

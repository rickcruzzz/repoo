const products = window.CVT_PRODUCTS;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const productById = new Map(products.map(product => [product.id, product]));
const paymentNames = { pix:'Pix', card:'Cartão de crédito', boleto:'Boleto bancário' };
let cart = [];
const itemBriefs = {};
let cardConfig = null;
let step = 0;
let paymentMethod = 'pix';
let config = { whatsapp:'', email:'' };
let cepTimer;
let lastLookedUpCep = '';

try {
  const stored = JSON.parse(localStorage.getItem('cvt-cart') || '[]');
  if (Array.isArray(stored)) {
    const quantities = new Map();
    for (const item of stored) {
      if (!productById.has(item.id)) continue;
      quantities.set(item.id, Math.min(99, (quantities.get(item.id) || 0) + Math.max(1, Number.parseInt(item.quantity, 10) || 1)));
    }
    cart = [...quantities].map(([id, quantity]) => ({ id, quantity }));
  }
} catch { cart = []; }
try { cardConfig = JSON.parse(sessionStorage.getItem('cvt-card-config') || 'null'); } catch { cardConfig = null; }
try { Object.assign(itemBriefs, JSON.parse(sessionStorage.getItem('cvt-item-briefs') || '{}')); } catch { /* campos podem ser preenchidos novamente */ }

function cardDescription() {
  if (!cardConfig) return 'Personalização pendente';
  const paper = { 'couche-fosco-300':'couché fosco 300 g/m²', 'couche-brilho-300':'couché brilho 300 g/m²', reciclado:'papel reciclado', outro:'outro papel' }[cardConfig.paper] || 'papel a definir';
  const finish = { sem:'sem acabamento adicional', 'laminacao-fosca':'laminação fosca', 'laminacao-brilho':'laminação brilho', 'soft-touch':'soft touch', 'verniz-localizado':'verniz localizado', outro:'outro acabamento' }[cardConfig.finish] || 'acabamento a definir';
  const sides = cardConfig.sides === 'both' ? 'frente e verso' : 'só frente';
  return `${cardConfig.runQuantity} cartões · ${cardConfig.trimWidthMm} × ${cardConfig.trimHeightMm} mm · ${sides} · ${paper} · ${finish} · cantos ${cardConfig.corners || 'retos'}`;
}

function saveCart() {
  localStorage.setItem('cvt-cart', JSON.stringify(cart));
  renderCart();
  renderSummary();
}

function renderCart() {
  const target = $('#checkoutCart');
  target.replaceChildren();
  $('#toAddress').disabled = cart.length === 0 || (cart.some(item => item.id === 'cartoes') && !cardConfig);
  if (!cart.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-cart';
    empty.innerHTML = '<h3>Seu carrinho está vazio.</h3><p>Encontre uma solução para começar seu projeto.</p><a class="button button-dark" href="/#solucoes">Explorar soluções →</a>';
    target.append(empty);
    return;
  }
  for (const item of cart) {
    const product = productById.get(item.id);
    const row = document.createElement('article');
    row.className = 'checkout-cart-item';
    if (product.id === 'cartoes') {
      row.innerHTML = `<img src="${product.image}" alt=""><div><span class="item-category">${product.category}</span><h3>${product.name}</h3><p class="item-meta"></p><a class="item-customize-link" href="/cartao-de-visita.html">${cardConfig ? 'Editar personalização' : 'Personalizar cartão para continuar'} ↗</a><p class="item-file-note"></p></div><button type="button" class="remove-item" data-remove="${product.id}" aria-label="Remover ${product.name}">Remover</button>`;
      row.querySelector('.item-meta').textContent = cardDescription();
      row.querySelector('.item-file-note').textContent = cardConfig?.artworkMode === 'ready' ? 'Arquivos escolhidos foram conferidos apenas neste navegador; envie a arte ao atendimento após o contato.' : 'Criação ou adaptação da arte será incluída na análise do orçamento.';
    } else {
      row.innerHTML = `<img src="${product.image}" alt=""><div><span class="item-category">${product.category}</span><h3>${product.name}</h3><p class="item-meta">Informe o que souber para receber uma proposta mais precisa.</p><div class="quantity-picker"><button type="button" data-decrease="${product.id}" aria-label="Diminuir ${product.name}">−</button><output aria-label="Quantidade de ${product.name}">${item.quantity}</output><button type="button" data-increase="${product.id}" aria-label="Aumentar ${product.name}">+</button></div><div class="item-brief-grid"><label>Local ou superfície<input data-item-id="${product.id}" data-item-field="application" type="text" maxlength="100" placeholder="Ex.: fachada, vitrine, parede"></label><label>Medidas aproximadas<input data-item-id="${product.id}" data-item-field="measurements" type="text" maxlength="60" placeholder="Ex.: 200 × 80 cm"></label><label>Instalação<select data-item-id="${product.id}" data-item-field="installation"><option value="a-definir">A definir</option><option value="necessaria">Preciso de instalação</option><option value="nao-necessaria">Não preciso de instalação</option></select></label><label>Outros detalhes<input data-item-id="${product.id}" data-item-field="notes" type="text" maxlength="300" placeholder="Material, acabamento ou prazo"></label></div></div><button type="button" class="remove-item" data-remove="${product.id}" aria-label="Remover ${product.name}">Remover</button>`;
      for (const input of row.querySelectorAll('[data-item-field]')) input.value = itemBriefs[item.id]?.[input.dataset.itemField] || (input.dataset.itemField === 'installation' ? 'a-definir' : '');
    }
    target.append(row);
  }
}

function renderSummary() {
  const target = $('#summaryItems');
  target.replaceChildren();
  for (const item of cart) {
    const row = document.createElement('div');
    row.className = 'summary-item';
    const name = document.createElement('span');
    name.textContent = productById.get(item.id).name;
    const quantity = document.createElement('strong');
    quantity.textContent = item.id === 'cartoes' && cardConfig ? `${cardConfig.runQuantity} cartões` : `${item.quantity} un.`;
    row.append(name, quantity);
    target.append(row);
  }
  $('#summaryQty').textContent = cart.reduce((total, item) => total + item.quantity, 0);
}

function changeQuantity(id, difference) {
  const item = cart.find(entry => entry.id === id);
  if (!item) return;
  item.quantity = Math.min(99, Math.max(1, item.quantity + difference));
  saveCart();
}

function setStep(next) {
  if (next > 0 && !cart.length) return;
  if (step === 3 && next !== 3) {
    $('#reviewConsent').checked = false;
    updateFinishAvailability();
  }
  step = next;
  $$('.checkout-step').forEach(section => { section.hidden = Number(section.dataset.step) !== step; });
  $$('[data-progress]').forEach(item => {
    const index = Number(item.dataset.progress);
    item.classList.toggle('active', index === step);
    item.classList.toggle('done', index < step);
    if (index === step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  if (step === 3) renderReview();
  window.scrollTo({ top:0, behavior:'smooth' });
  const heading = $(`[data-step="${step}"] h2`);
  heading.tabIndex = -1;
  heading.focus({ preventScroll:true });
}

function digits(value) { return value.replace(/\D/g, ''); }
function formatCep(value) {
  const raw = digits(value).slice(0, 8);
  return raw.length > 5 ? `${raw.slice(0,5)}-${raw.slice(5)}` : raw;
}
function formatPhone(value) {
  const raw = digits(value).slice(0, 11);
  if (raw.length <= 2) return raw.length ? `(${raw}` : '';
  if (raw.length <= 6) return `(${raw.slice(0,2)}) ${raw.slice(2)}`;
  const localSize = raw.length === 11 ? 5 : 4;
  return `(${raw.slice(0,2)}) ${raw.slice(2,2 + localSize)}-${raw.slice(2 + localSize)}`;
}

async function lookupCep() {
  const cep = digits($('#addressCep').value);
  const status = $('#cepStatus');
  if (cep.length !== 8) { status.textContent = 'Informe os 8 números do CEP.'; return; }
  if (cep === lastLookedUpCep) return;
  $('#cepLookup').disabled = true;
  status.textContent = 'Buscando endereço...';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal:controller.signal });
    if (!response.ok) throw new Error('indisponível');
    const data = await response.json();
    if (cep !== digits($('#addressCep').value)) return;
    if (data.erro) { status.textContent = 'CEP não encontrado. Confira o número ou preencha manualmente.'; return; }
    $('#addressStreet').value = data.logradouro || $('#addressStreet').value;
    $('#addressDistrict').value = data.bairro || $('#addressDistrict').value;
    $('#addressCity').value = data.localidade || $('#addressCity').value;
    $('#addressState').value = data.uf || $('#addressState').value;
    lastLookedUpCep = cep;
    status.textContent = 'Endereço encontrado. Confira os dados e informe o número.';
    if (step === 1) $('#addressNumber').focus();
  } catch { status.textContent = 'Busca indisponível. Preencha o endereço manualmente.'; }
  finally { clearTimeout(timeout); $('#cepLookup').disabled = false; }
}

function validateAddress(showErrors = true) {
  const cep = $('#addressCep');
  const phone = $('#customerPhone');
  const state = $('#addressState');
  cep.setCustomValidity(digits(cep.value).length === 8 ? '' : 'Informe um CEP com 8 números.');
  phone.setCustomValidity([10,11].includes(digits(phone.value).length) ? '' : 'Informe um celular ou telefone com DDD.');
  state.setCustomValidity(/^[a-zA-Z]{2}$/.test(state.value.trim()) ? '' : 'Informe a sigla do estado com 2 letras.');
  return showErrors ? $('#addressForm').reportValidity() : $('#addressForm').checkValidity();
}

function readAddress() {
  return {
    name:$('#customerName').value.trim(), email:$('#customerEmail').value.trim(), phone:$('#customerPhone').value.trim(),
    cep:$('#addressCep').value.trim(), street:$('#addressStreet').value.trim(), number:$('#addressNumber').value.trim(),
    extra:$('#addressExtra').value.trim(), district:$('#addressDistrict').value.trim(), city:$('#addressCity').value.trim(), state:$('#addressState').value.trim().toUpperCase()
  };
}

function renderPaymentDetail() {
  $$('.payment-option').forEach(option => option.classList.toggle('active', option.querySelector('input').checked));
  const descriptions = {
    pix:{ symbol:'◇', title:'Pix depois da aprovação', copy:'Quando o valor for confirmado, você receberá um QR Code ou código copia e cola válido para pagar com seu banco.' },
    card:{ symbol:'▭', title:'Cartão em etapa segura', copy:'Após aprovar o valor, os dados do cartão serão informados em uma etapa segura. Nenhum número de cartão é solicitado aqui.' },
    boleto:{ symbol:'▥', title:'Boleto após a confirmação', copy:'Você receberá o boleto e o vencimento quando o orçamento for aprovado e a cobrança for emitida.' }
  };
  const detail = descriptions[paymentMethod];
  $('#paymentDetail').innerHTML = `<div class="payment-detail-symbol" aria-hidden="true">${detail.symbol}</div><div><h3>${detail.title}</h3><p>${detail.copy}</p></div>`;
}

function reviewBlock(title, body, targetStep) {
  const block = document.createElement('section');
  block.className = 'review-block';
  const header = document.createElement('header');
  const heading = document.createElement('h3');
  heading.textContent = title;
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.textContent = 'Editar';
  edit.dataset.editStep = String(targetStep);
  const paragraph = document.createElement('p');
  paragraph.textContent = body;
  header.append(heading, edit);
  block.append(header, paragraph);
  return block;
}

function renderReview() {
  const address = readAddress();
  const target = $('#reviewContent');
  target.replaceChildren();
  target.append(
    reviewBlock('Soluções', cart.map(item => item.id === 'cartoes' ? `${productById.get(item.id).name} — ${cardDescription()}${cardConfig?.artworkMode === 'ready' ? '\nArte pronta: envio do arquivo ainda necessário.' : '\nArte: criação ou adaptação a avaliar.'}` : `${item.quantity} × ${productById.get(item.id).name}${briefText(itemBriefs[item.id]) ? ` — ${briefText(itemBriefs[item.id])}` : ''}`).join('\n') + ($('#projectDetails').value.trim() ? `\nProjeto: ${$('#projectDetails').value.trim()}` : ''), 0),
    reviewBlock('Contato e endereço', `${address.name}\n${address.email} · ${address.phone}\n${address.street}, ${address.number}${address.extra ? `, ${address.extra}` : ''}\n${address.district} · ${address.city}/${address.state} · CEP ${address.cep}`, 1),
    reviewBlock('Pagamento preferido', `${paymentNames[paymentMethod]}\nO pagamento será disponibilizado após a aprovação do orçamento.`, 2)
  );
}

function briefText(brief) {
  if (!brief) return '';
  return [brief.application && `local: ${brief.application}`, brief.measurements && `medidas: ${brief.measurements}`, brief.installation === 'necessaria' && 'com instalação', brief.installation === 'nao-necessaria' && 'sem instalação', brief.notes].filter(Boolean).join(' · ');
}

function checkoutPayload() {
  const address = readAddress();
  return {
    items:cart.map(item => ({ productId:item.id, quantity:item.quantity, brief:itemBriefs[item.id] || null, configuration:item.id === 'cartoes' ? cardConfig : null })),
    projectNotes:$('#projectDetails').value.trim(),
    customer:{ name:address.name, email:address.email, phone:digits(address.phone) },
    address:{ cep:digits(address.cep), street:address.street, number:address.number, complement:address.extra, district:address.district, city:address.city, state:address.state },
    paymentPreference:paymentMethod,
    currency:'BRL', pricingStatus:'pending_quote'
  };
}

function updateFinishAvailability() {
  const available = Boolean(window.CVT_CHECKOUT?.submit || config.whatsapp || config.email);
  const consent = $('#reviewConsent').checked;
  $('#finishCheckout').disabled = !available || !consent || !cart.length;
  $('#finishStatus').textContent = available ? (consent ? 'Nenhuma cobrança será feita agora.' : 'Confirme os dados para enviar a solicitação.') : 'O envio do pedido ainda não está disponível.';
}

function quoteMessage(payload) {
  const location = payload.address;
  const cardBrief = cardConfig?.artworkMode === 'design' ? `\n  Arte: criar/adaptar. Marca: ${cardConfig.design?.brandName || 'a definir'}; nome: ${cardConfig.design?.personName || 'a definir'}; telefone: ${cardConfig.design?.printPhone || 'a definir'}; e-mail: ${cardConfig.design?.printEmail || 'a definir'}; site: ${cardConfig.design?.printWebsite || 'a definir'}.${cardConfig.design?.designNotes ? ` Observações: ${cardConfig.design.designNotes}` : ''}` : '\n  Tenho arte pronta e preciso enviá-la ao atendimento.';
  return `Olá! Gostaria de solicitar um orçamento para:\n${payload.items.map(item => item.productId === 'cartoes' ? `• Cartões de visita — ${cardDescription()}${cardBrief}` : `• ${item.quantity} × ${productById.get(item.productId).name}${briefText(item.brief) ? ` — ${briefText(item.brief)}` : ''}`).join('\n')}\n\nContato: ${payload.customer.name} · ${payload.customer.email} · ${payload.customer.phone}\nEndereço: ${location.street}, ${location.number}${location.complement ? `, ${location.complement}` : ''}, ${location.district}, ${location.city}/${location.state}, CEP ${location.cep}\nPagamento preferido: ${paymentNames[payload.paymentPreference]}${payload.projectNotes ? `\nDetalhes: ${payload.projectNotes}` : ''}\n\nAguardando valor e condições antes de pagar.`;
}

async function finishCheckout() {
  if (!$('#reviewConsent').checked || !cart.length) return;
  if (!validateAddress(false)) { setStep(1); validateAddress(); return; }
  const payload = checkoutPayload();
  const status = $('#finishStatus');
  const button = $('#finishCheckout');
  if (window.CVT_CHECKOUT?.submit) {
    button.disabled = true;
    status.textContent = 'Enviando solicitação...';
    try {
      const result = await window.CVT_CHECKOUT.submit(payload);
      if (!result?.orderId && result?.status !== 'accepted') throw new Error('Resposta sem confirmação do pedido.');
      status.textContent = `Pedido recebido${result.orderId ? ` · ${result.orderId}` : ''}. Aguarde o orçamento antes de pagar.`;
      localStorage.removeItem('cvt-cart');
      for (const key of ['cvt-card-config','cvt-item-briefs','cvt-address-draft','cvt-project-notes']) sessionStorage.removeItem(key);
      cart = [];
      renderSummary();
      if (result.redirectUrl) {
        const destination = new URL(result.redirectUrl, window.location.href);
        if (destination.protocol === 'https:' || destination.origin === window.location.origin) window.location.assign(destination.href);
      }
    } catch { status.textContent = 'Não foi possível enviar agora. Tente novamente.'; button.disabled = false; }
    return;
  }
  const message = quoteMessage(payload);
  if (config.whatsapp) {
    window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    status.textContent = 'Confira a nova aba e envie a mensagem para concluir a solicitação.';
  } else if (config.email) {
    window.location.href = `mailto:${config.email}?subject=${encodeURIComponent('Pedido para orçamento')}&body=${encodeURIComponent(message)}`;
    status.textContent = 'E-mail preparado. Envie a mensagem para concluir a solicitação.';
  }
}

$('#checkoutCart').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  const increase = event.target.closest('[data-increase]');
  const decrease = event.target.closest('[data-decrease]');
  if (remove) {
    cart = cart.filter(item => item.id !== remove.dataset.remove);
    delete itemBriefs[remove.dataset.remove];
    sessionStorage.setItem('cvt-item-briefs', JSON.stringify(itemBriefs));
    if (remove.dataset.remove === 'cartoes') { sessionStorage.removeItem('cvt-card-config'); cardConfig = null; }
    saveCart();
  }
  else if (increase) changeQuantity(increase.dataset.increase, 1);
  else if (decrease) changeQuantity(decrease.dataset.decrease, -1);
});
function updateBrief(event) {
  const target = event.target.closest('[data-item-field]');
  if (!target) return;
  const id = target.dataset.itemId;
  itemBriefs[id] ||= {};
  itemBriefs[id][target.dataset.itemField] = target.value.trim();
  sessionStorage.setItem('cvt-item-briefs', JSON.stringify(itemBriefs));
}
$('#checkoutCart').addEventListener('input', updateBrief);
$('#checkoutCart').addEventListener('change', updateBrief);
$('#toAddress').addEventListener('click', () => setStep(1));
$('#toPayment').addEventListener('click', () => { if (validateAddress()) setStep(2); });
$('#toReview').addEventListener('click', () => { if (validateAddress()) setStep(3); });
$$('[data-back]').forEach(button => button.addEventListener('click', () => setStep(Number(button.dataset.back))));
$('#reviewContent').addEventListener('click', event => { const edit = event.target.closest('[data-edit-step]'); if (edit) setStep(Number(edit.dataset.editStep)); });
$$('input[name="paymentMethod"]').forEach(input => input.addEventListener('change', () => { paymentMethod = input.value; renderPaymentDetail(); }));
$('#addressCep').addEventListener('input', event => {
  event.target.value = formatCep(event.target.value);
  event.target.setCustomValidity('');
  lastLookedUpCep = '';
  clearTimeout(cepTimer);
  if (digits(event.target.value).length === 8) cepTimer = setTimeout(lookupCep, 450);
});
$('#cepLookup').addEventListener('click', lookupCep);
$('#customerPhone').addEventListener('input', event => { event.target.value = formatPhone(event.target.value); event.target.setCustomValidity(''); });
$('#addressState').addEventListener('input', event => { event.target.value = event.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2); event.target.setCustomValidity(''); });
$('#addressForm').addEventListener('input', () => sessionStorage.setItem('cvt-address-draft', JSON.stringify(readAddress())));
$('#reviewConsent').addEventListener('change', updateFinishAvailability);
$('#finishCheckout').addEventListener('click', finishCheckout);
$('#projectDetails').value = sessionStorage.getItem('cvt-project-notes') || '';
try {
  const savedAddress = JSON.parse(sessionStorage.getItem('cvt-address-draft') || 'null');
  if (savedAddress) {
    for (const [key, id] of Object.entries({ name:'customerName', email:'customerEmail', phone:'customerPhone', cep:'addressCep', street:'addressStreet', number:'addressNumber', extra:'addressExtra', district:'addressDistrict', city:'addressCity', state:'addressState' })) {
      if (typeof savedAddress[key] === 'string') $(`#${id}`).value = savedAddress[key];
    }
  }
} catch { /* endereço pode ser preenchido manualmente */ }
$('#projectDetails').addEventListener('input', event => sessionStorage.setItem('cvt-project-notes', event.target.value));
$('#year').textContent = new Date().getFullYear();
renderCart();
renderSummary();
renderPaymentDetail();
updateFinishAvailability();
fetch('/api/config').then(response => response.ok ? response.json() : {}).then(value => { config = value; updateFinishAvailability(); }).catch(() => updateFinishAvailability());

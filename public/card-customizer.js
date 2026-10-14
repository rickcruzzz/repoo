const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const store = window.CVT_STORE;
const editLineId = new URLSearchParams(window.location.search).get('line');
const editedItem = store.readCart().find(item => item.id === 'cartoes' && item.lineId === editLineId);
let cardPriceSequence = 0;
let cardPriceTimer;
let saving = false;
const checkingFiles = { front:false, back:false };
const inspectionSequence = { front:0, back:0 };
const draftKey = `cvt-card-draft-${editLineId || 'new'}`;
const labels = {
  paper:{ 'couche-fosco-300':'Couché fosco 300 g/m²', 'couche-brilho-300':'Couché brilho 300 g/m²', reciclado:'Reciclado', outro:'Outro papel' },
  finish:{ sem:'Sem acabamento adicional', 'laminacao-fosca':'Laminação fosca', 'laminacao-brilho':'Laminação brilho', 'soft-touch':'Soft touch', 'verniz-localizado':'Verniz localizado', outro:'Outro acabamento' }
};
const files = { front:null, back:null };
const fileChecks = { front:null, back:null };
const previewUrls = { front:null, back:null };
let previousConfig = editedItem?.configuration || null;

function updateSaveState() {
  const inspecting = checked('artworkMode') === 'ready' && (checkingFiles.front || (checked('sides') === 'both' && checkingFiles.back));
  $('#cardForm button[type="submit"]').disabled = saving || inspecting;
}
function persistDraft() {
  const fields = {};
  for (const input of $('#cardForm').querySelectorAll('input:not([type=file]),select,textarea')) {
    if (input.type === 'radio') { if (input.checked) fields[input.name] = input.value; }
    else if (input.id) fields[input.id] = input.value;
  }
  const artwork = {};
  for (const side of ['front','back']) if (files[side]) artwork[side] = { name:files[side].name };
  try { sessionStorage.setItem(draftKey, JSON.stringify({ fields, artwork })); }
  catch { $('#cardFormStatus').textContent = 'Não foi possível preservar o rascunho neste navegador. Confira o armazenamento antes de continuar.'; }
}
function restoreDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
    if (!draft?.fields || typeof draft.fields !== 'object') return;
    for (const input of $('#cardForm').querySelectorAll('input:not([type=file]),select,textarea')) {
      if (input.type === 'radio') { if (draft.fields[input.name] === input.value) input.checked = true; }
      else if (input.id && typeof draft.fields[input.id] === 'string') input.value = draft.fields[input.id];
    }
    previousConfig = { ...previousConfig, artwork:{ ...previousConfig?.artwork, ...draft.artwork } };
  } catch { /* configuração salva no carrinho permanece disponível */ }
}

function checked(name) { return $(`input[name="${name}"]:checked`)?.value; }
function sizeMm() {
  const selected = checked('size');
  let width = selected === 'custom' ? Number($('#customWidth').value) : Number(selected?.split('x')[0]);
  let height = selected === 'custom' ? Number($('#customHeight').value) : Number(selected?.split('x')[1]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 40 || width > 120 || height < 40 || height > 120) return null;
  if (checked('orientation') === 'vertical') [width, height] = [height, width];
  return { width, height };
}
function printReference() {
  const size = sizeMm();
  if (!size) return null;
  const fullWidth = size.width + 6;
  const fullHeight = size.height + 6;
  return { ...size, fullWidth, fullHeight, pixelsWidth:Math.ceil(fullWidth / 25.4 * 300), pixelsHeight:Math.ceil(fullHeight / 25.4 * 300) };
}
function selectedRun() {
  return checked('run') === 'custom' ? Number($('#customRun').value) : Number(checked('run'));
}
function renderRequiredPixels() {
  const ref = printReference();
  $('#requiredPixels').textContent = ref ? `Referência para imagem de página inteira: ${ref.pixelsWidth} × ${ref.pixelsHeight} px ou mais (300 ppi, incluindo 3 mm de sangria em cada borda).` : 'Informe as medidas para calcular a referência de resolução.';
}
function renderFileStatus(side) {
  const status = $(`#${side}Status`);
  status.className = '';
  const check = fileChecks[side];
  if (checkingFiles[side]) { status.textContent = 'Conferindo arquivo...'; return; }
  if (!check) {
    const old = previousConfig?.artwork?.[side];
    status.textContent = old?.fileId ? `Arte enviada: ${old.name}. A conferência técnica ainda é necessária.` : old?.name ? `Arte anterior: ${old.name}. Selecione novamente para conferir; o arquivo não foi enviado.` : 'Nenhum arquivo selecionado.';
    return;
  }
  if (check.error) { status.textContent = check.error; status.classList.add('bad'); return; }
  if (check.kind === 'pdf') {
    status.textContent = `${check.name} · PDF selecionado. Tamanho, fontes, cores e sangria exigem conferência técnica.`;
    status.classList.add('warn');
    return;
  }
  const ref = printReference();
  if (!ref) { status.textContent = `${check.name} · ${check.width} × ${check.height} px. Informe o formato para conferir a resolução.`; return; }
  const ppi = Math.floor(Math.min(check.width / (ref.fullWidth / 25.4), check.height / (ref.fullHeight / 25.4)));
  const enough = ppi >= 300;
  const ratioDiff = Math.abs(check.width / check.height / (ref.fullWidth / ref.fullHeight) - 1);
  const aspectWarning = ratioDiff > .05 ? ' A proporção é diferente do formato escolhido e pode exigir corte ou ajuste.' : '';
  status.textContent = `${check.name} · ${check.width} × ${check.height} px · cerca de ${ppi} ppi no formato escolhido. ${enough ? 'Resolução de referência atendida; sangria e arte ainda precisam de conferência.' : 'Abaixo da referência de 300 ppi: envie arquivo maior ou peça avaliação da arte.'}${aspectWarning}`;
  status.classList.add(enough && !aspectWarning ? 'good' : 'warn');
}

function clearPreviewUrl(side) {
  if (previewUrls[side]) URL.revokeObjectURL(previewUrls[side]);
  previewUrls[side] = null;
}
async function inspectFile(side) {
  const input = $(`#${side}File`);
  const file = input.files?.[0] || null;
  const sequence = ++inspectionSequence[side];
  files[side] = file;
  clearPreviewUrl(side);
  fileChecks[side] = null;
  checkingFiles[side] = Boolean(file);
  renderFileStatus(side);
  updateSaveState();
  if (!file) { persistDraft(); renderPreview(); return; }
  try {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf','png','jpg','jpeg'].includes(extension)) throw { userMessage:'Formato não aceito. Use PDF, PNG ou JPG.' };
    if (file.size > 25 * 1024 * 1024) throw { userMessage:'Arquivo acima de 25 MB. Envie uma versão menor para a conferência inicial.' };
    if (extension === 'pdf') {
      const header = new TextDecoder().decode(await file.slice(0,1024).arrayBuffer());
      if (sequence !== inspectionSequence[side]) return;
      if (!header.includes('%PDF-')) throw { userMessage:'Não foi possível abrir este PDF. Salve o arquivo novamente em PDF.' };
      fileChecks[side] = { kind:'pdf', name:file.name, bytes:file.size };
      return;
    }
    const bitmap = await createImageBitmap(file);
    if (sequence !== inspectionSequence[side]) { bitmap.close(); return; }
    fileChecks[side] = { kind:'image', name:file.name, bytes:file.size, width:bitmap.width, height:bitmap.height };
    bitmap.close();
    previewUrls[side] = URL.createObjectURL(file);
  } catch (error) {
    if (sequence === inspectionSequence[side]) fileChecks[side] = { error:error.userMessage || 'Não foi possível abrir esta imagem. Salve-a novamente em JPG ou PNG.' };
  } finally {
    if (sequence === inspectionSequence[side]) {
      checkingFiles[side] = false;
      renderFileStatus(side);
      renderPreview();
      persistDraft();
      updateSaveState();
    }
  }
}

function renderPreview() {
  const orientation = checked('orientation');
  const corners = checked('corners');
  const style = $('#cardStyle').value;
  const paper = checked('paper');
  const mode = checked('artworkMode');
  const sides = checked('sides');
  const color = $('#cardColor').value;
  const dimensions = sizeMm();
  const brand = $('#brandName').value.trim() || 'SUA MARCA';
  const person = $('#personName').value.trim() || 'Seu nome';
  const role = $('#personRole').value.trim() || 'Sua especialidade';
  const contact = $('#printEmail').value.trim() || $('#printPhone').value.trim() || 'contato@suaempresa.com.br';
  const website = $('#printWebsite').value.trim() || '@suamarca';
  $('#previewBrand').textContent = brand;
  $('#previewBackBrand').textContent = brand;
  $('#previewPerson').textContent = person;
  $('#previewRole').textContent = role;
  $('#previewContact').textContent = contact;
  $('#previewBackContact').textContent = website;
  $('#previewBack').hidden = sides !== 'both';
  $('#backUpload').hidden = sides !== 'both';
  for (const side of ['front','back']) {
    const face = $(`#preview${side[0].toUpperCase()}${side.slice(1)}`);
    face.classList.toggle('vertical', orientation === 'vertical');
    face.classList.toggle('rounded', corners === 'arredondados');
    face.classList.toggle('marcante', style === 'marcante');
    face.classList.toggle('editorial', style === 'editorial');
    face.classList.toggle('paper-recycled', paper === 'reciclado' && style !== 'marcante');
    face.style.setProperty('--card-accent', color);
    if (dimensions) face.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
    const image = $(`#preview${side[0].toUpperCase()}${side.slice(1)}Image`);
    const pdf = $(`#preview${side[0].toUpperCase()}${side.slice(1)}Pdf`);
    const designed = $(`#preview${side[0].toUpperCase()}${side.slice(1)}Design`);
    const showImage = mode === 'ready' && fileChecks[side]?.kind === 'image' && previewUrls[side];
    const showPlaceholder = mode === 'ready' && !showImage;
    designed.hidden = mode === 'ready';
    image.hidden = !showImage;
    pdf.hidden = !showPlaceholder;
    pdf.textContent = fileChecks[side]?.kind === 'pdf' ? `PDF ${side === 'front' ? 'da frente' : 'do verso'} selecionado` : `Selecione a arte ${side === 'front' ? 'da frente' : 'do verso'}`;
    if (showImage) image.src = previewUrls[side];
    else image.removeAttribute('src');
  }
  const ref = sizeMm();
  const specs = [
    ['Formato', ref ? `${ref.width} × ${ref.height} mm` : 'A definir'],
    ['Impressão', sides === 'both' ? 'Frente e verso' : 'Só frente'],
    ['Papel', labels.paper[paper] || 'A definir'],
    ['Tiragem', Number.isInteger(selectedRun()) && selectedRun() > 0 ? `${selectedRun().toLocaleString('pt-BR')} cartões` : 'A definir']
  ];
  const target = $('#previewSpecs');
  target.replaceChildren();
  for (const [label, value] of specs) {
    const row = document.createElement('div');
    const key = document.createElement('span'); key.textContent = label;
    const content = document.createElement('strong'); content.textContent = value;
    row.append(key, content); target.append(row);
  }
}

function renderMode() {
  const ready = checked('artworkMode') === 'ready';
  $('#designFields').hidden = ready;
  $('#readyFields').hidden = !ready;
  renderPreview();
}
function renderConditionalFields() {
  $('#customSizeFields').hidden = checked('size') !== 'custom';
  $('#customRunField').hidden = checked('run') !== 'custom';
  renderRequiredPixels();
  renderFileStatus('front');
  renderFileStatus('back');
  renderMode();
  updateSaveState();
}

function downloadTemplate() {
  const ref = printReference();
  if (!ref) { $('#customWidth').focus(); return; }
  const safeWidth = Math.max(1, ref.width - 6);
  const safeHeight = Math.max(1, ref.height - 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ref.fullWidth}mm" height="${ref.fullHeight}mm" viewBox="0 0 ${ref.fullWidth} ${ref.fullHeight}"><rect width="100%" height="100%" fill="#f8fbff"/><rect x="3" y="3" width="${ref.width}" height="${ref.height}" fill="none" stroke="#205eb2" stroke-width=".35"/><rect x="6" y="6" width="${safeWidth}" height="${safeHeight}" fill="none" stroke="#e15d67" stroke-width=".3" stroke-dasharray="1 1"/></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type:'image/svg+xml' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `referencia-cartao-${ref.width}x${ref.height}mm.svg`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function restorePrevious() {
  if (!previousConfig || typeof previousConfig !== 'object') return;
  const selectRadio = (name, value) => { const option = $$(`input[name="${name}"]`).find(input => input.value === value); if (option) option.checked = true; };
  for (const name of ['size','orientation','sides','paper','corners','run','artworkMode']) selectRadio(name, String(previousConfig[name] ?? ''));
  if (previousConfig.size === 'custom') {
    $('#customWidth').value = previousConfig.baseWidthMm || '';
    $('#customHeight').value = previousConfig.baseHeightMm || '';
  }
  if (previousConfig.run === 'custom') $('#customRun').value = previousConfig.runQuantity || '';
  if (labels.finish[previousConfig.finish]) $('#cardFinish').value = previousConfig.finish;
  const design = previousConfig.design || {};
  for (const [key, id] of Object.entries({ brandName:'brandName', personName:'personName', personRole:'personRole', printPhone:'printPhone', printEmail:'printEmail', printWebsite:'printWebsite', cardColor:'cardColor', cardStyle:'cardStyle', designNotes:'designNotes' })) {
    if (typeof design[key] === 'string') $(`#${id}`).value = design[key];
  }
}

function buildConfig() {
  const size = sizeMm();
  const run = selectedRun();
  const sizeOption = checked('size');
  return {
    size:sizeOption, baseWidthMm:sizeOption === 'custom' ? Number($('#customWidth').value) : Number(sizeOption.split('x')[0]),
    baseHeightMm:sizeOption === 'custom' ? Number($('#customHeight').value) : Number(sizeOption.split('x')[1]),
    trimWidthMm:size.width, trimHeightMm:size.height, orientation:checked('orientation'), sides:checked('sides'),
    paper:checked('paper'), finish:$('#cardFinish').value, corners:checked('corners'), run:checked('run'), runQuantity:run,
    artworkMode:checked('artworkMode'),
    design:{ brandName:$('#brandName').value.trim(), personName:$('#personName').value.trim(), personRole:$('#personRole').value.trim(), printPhone:$('#printPhone').value.trim(), printEmail:$('#printEmail').value.trim(), printWebsite:$('#printWebsite').value.trim(), cardColor:$('#cardColor').value, cardStyle:$('#cardStyle').value, designNotes:$('#designNotes').value.trim() },
    artwork:{ front:fileChecks.front && !fileChecks.front.error ? fileChecks.front : previousConfig?.artwork?.front || null, back:checked('sides') === 'both' ? (fileChecks.back && !fileChecks.back.error ? fileChecks.back : previousConfig?.artwork?.back || null) : null },
    updatedAt:new Date().toISOString()
  };
}

async function saveConfiguration(event) {
  event.preventDefault();
  if (saving) return;
  const status = $('#cardFormStatus');
  status.textContent = '';
  if (checked('artworkMode') === 'ready' && (checkingFiles.front || (checked('sides') === 'both' && checkingFiles.back))) { status.textContent = 'Aguarde a conferência do arquivo antes de continuar.'; return; }
  if (!sizeMm()) { status.textContent = 'Informe um tamanho válido entre 40 e 120 mm em cada lado.'; $('#customWidth').focus(); return; }
  if (!Number.isInteger(selectedRun()) || selectedRun() < 50 || selectedRun() > 10000) { status.textContent = 'Informe uma tiragem entre 50 e 10.000 cartões.'; $('#customRun').focus(); return; }
  if (checked('artworkMode') === 'design' && !$('#brandName').value.trim() && !$('#personName').value.trim()) { status.textContent = 'Informe ao menos o nome da marca ou o nome que aparecerá no cartão.'; $('#brandName').focus(); return; }
  if ($('#printEmail').value && !$('#printEmail').checkValidity()) { status.textContent = 'Confira o e-mail que será impresso no cartão.'; $('#printEmail').focus(); return; }
  if ((fileChecks.front?.error || (checked('sides') === 'both' && fileChecks.back?.error)) && checked('artworkMode') === 'ready') { status.textContent = 'Corrija ou remova o arquivo inválido antes de continuar.'; return; }
  const configuration = buildConfig();
  const button = $('#cardForm button[type="submit"]');
  saving = true;
  button.disabled = true;
  if (checked('artworkMode') === 'ready' && typeof window.CVT_ARTWORK?.upload === 'function') {
    button.disabled = true;
    status.textContent = 'Enviando os arquivos selecionados...';
    try {
      for (const side of checked('sides') === 'both' ? ['front','back'] : ['front']) {
        if (!files[side]) continue;
        const result = await window.CVT_ARTWORK.upload({ file:files[side], side, configuration });
        if (!result?.fileId) throw new Error('Envio sem confirmação.');
        configuration.artwork[side].fileId = result.fileId;
      }
    } catch { status.textContent = 'Não foi possível enviar a arte. Tente novamente antes de continuar.'; saving = false; updateSaveState(); return; }
  }
  try {
    sessionStorage.setItem('cvt-card-config', JSON.stringify(configuration));
    store.addConfigured('cartoes', configuration, editedItem?.quantity || 1, editedItem?.lineId);
    sessionStorage.removeItem(draftKey);
  } catch {
    status.textContent = 'Não foi possível salvar o carrinho neste navegador. Confira o armazenamento e tente novamente.';
    saving = false;
    updateSaveState();
    return;
  }
  window.location.href = '/checkout.html';
}

async function updateCardPrice() {
  const sequence = ++cardPriceSequence;
  if (!sizeMm() || !Number.isInteger(selectedRun()) || selectedRun() < 50 || selectedRun() > 10000) {
    $('#cardPrice').textContent = 'Confira as medidas e a tiragem para consultar o preço.';
    return;
  }
  $('#cardPrice').textContent = 'Conferindo preço…';
  const quote = await store.price({ id:'cartoes', quantity:editedItem?.quantity || 1, configuration:buildConfig() });
  if (sequence === cardPriceSequence) $('#cardPrice').textContent = store.priceText(quote);
}

$('#cardForm').addEventListener('change', event => {
  if (event.target.matches('input[type=file]')) return;
  renderConditionalFields();
  persistDraft();
  scheduleCardPrice();
});
$('#cardForm').addEventListener('input', event => {
  if (event.target.matches('input[type=file]')) return;
  renderRequiredPixels();
  renderFileStatus('front');
  renderFileStatus('back');
  renderPreview();
  persistDraft();
  scheduleCardPrice();
});
$('#frontFile').addEventListener('change', () => inspectFile('front'));
$('#backFile').addEventListener('change', () => inspectFile('back'));
$('#downloadTemplate').addEventListener('click', downloadTemplate);
$('#cardForm').addEventListener('submit', saveConfiguration);
$('#year').textContent = new Date().getFullYear();
restorePrevious();
restoreDraft();
renderConditionalFields();
updateCardPrice();
if (typeof window.CVT_ARTWORK?.upload === 'function') $('.artwork-disclosure').textContent = 'Os arquivos selecionados serão enviados ao salvar a personalização. A conferência de resolução é inicial; corte, cores, fontes e sangria ainda precisam de aprovação técnica antes da produção.';

function scheduleCardPrice() {
  clearTimeout(cardPriceTimer);
  ++cardPriceSequence;
  $('#cardPrice').textContent = 'Conferindo preço…';
  cardPriceTimer = setTimeout(updateCardPrice, 180);
}

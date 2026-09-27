// PZ: leva a configuracao do lojista (tipografia, cor e arco) para o input da
// vitrine como data-attributes. Sem isso, quando a loja precisa CRIAR o texto no
// canvas (campo configurado mas sem texto de preview salvo no painel), ela caia
// num 20px preto Arial sem arco — ignorando tudo que o lojista ajustou.
function pzDadosDoDelimiter(d) {
    d = d || {};
    var at = function (nome, valor) {
        if (valor === undefined || valor === null || valor === '') return '';
        return ' ' + nome + '="' + String(valor).replace(/"/g, '&quot;') + '"';
    };
    return at('data-inifontsize', d.fontSize)
         + at('data-cortexto', d.corTexto)
         + at('data-espacoletras', d.charSpacing)
         + at('data-fonte', d.fonte || d.fontes)
         + at('data-arco', d.arco)
         + at('data-arcoraio', d.arcoRaio)
         + at('data-arcogiro', d.arcoGiro)
         + at('data-arcoembaixo', d.arcoEmbaixo)
         + at('data-arcoangulo', d.arcoAngulo);
}

// PZ: chaves de cor definidas pelo lojista em cada imagem do mockup.
// Ligadas (ou ausentes, pros mockups antigos) = comportamento de sempre.
function pzUsaCorPadrao(img) {
    return !img || img.usarCorPadrao === undefined || Number(img.usarCorPadrao) !== 0;
}
function pzUsaCorEstatica(img) {
    return !img || img.usarCorEstatica === undefined || Number(img.usarCorEstatica) !== 0;
}

console.log("jspersonaliza.js loaded");
console.log(LS);

const t = document?.currentScript?.src;
console.log("Current script source:", t);

const baseUrl = `${t?.includes('test') ? t?.split('/js')?.[0] : 'https://app.personalizeapp.com.br'}/`;
console.log("Base URL:", baseUrl);

const storeId = LS?.store?.id;
let PersonalizeProductId = LS?.product?.id;
let template = LS.template;
const theme = LS.theme.code;
const personalizeInputs = {};
let personalizedProducts = [];

/**
 * PZ: parse tolerante de resposta de ajax.
 *
 * O jQuery ja parseia sozinho quando a resposta vem com
 * Content-Type: application/json. Quando isso acontece, o JSON.parse do
 * codigo recebe um OBJETO e estoura com
 *   SyntaxError: "[object Object]" is not valid JSON
 * derrubando o callback inteiro (e, com ele, o carregamento dos campos).
 *
 * Foi o que passou a acontecer com Ajax/getTexts, que hoje responde
 * application/json. Tolerar as duas formas evita que a proxima mudanca de
 * Content-Type em qualquer endpoint quebre a loja de novo.
 *
 * Resposta vazia devolve o padrao em vez de estourar
 * ("Unexpected end of JSON input").
 */
/**
 * PZ: inicializa o Owl Carousel SEM derrubar o resto quando o plugin nao existe.
 *
 * O carregamento da lib esta comentado neste arquivo (ver 'amazonas', logo apos
 * o fabric.js), entao o owlCarousel so existe se o TEMA da loja carregar. Como o
 * tema carrega de forma assincrona, virava corrida: se a resposta do ajax de
 * campos chegava antes da lib, o `$(...).owlCarousel is not a function`
 * estourava NAO TRATADO no meio do callback e abortava tudo que vinha depois —
 * inclusive o applyInlineCssVariables, que roda no fim.
 *
 * Resultado pro lojista: "uma hora carrega os campos certos, outra hora nao".
 * Sem estilo e sem pz-custom-on quando a corrida era perdida.
 *
 * Aqui: se o plugin nao esta pronto, tenta de novo algumas vezes e desiste em
 * silencio. O carrossel e enfeite; os campos e o estilo nao podem cair com ele.
 */
/**
 * PZ: nome de opcao que pode vir vazio do cadastro.
 *
 * O campo `nome` da opcao chega null/vazio do banco e o template literal
 * imprimia a string "null" embaixo da imagem. Aparecia pro cliente na vitrine.
 *
 * Tambem entra no atributo value ("nome-id"), que e o que vai gravado no
 * pedido — ou seja, o pedido registrava "null-2720628". O servidor faz
 * explode('-') e pega o indice 1, entao devolver string vazia aqui e seguro:
 * "-2720628" continua resolvendo o id da imagem igual.
 */
function pzNome(v) {
    if (v === null || v === undefined) return '';
    var t = String(v).trim();
    if (t === '' || t === 'null' || t === 'undefined') return '';
    return t;
}

function pzOwl(seletor, opcoes, tentativa) {
    tentativa = tentativa || 0;
    try {
        if (typeof jQuery !== 'undefined' && jQuery.fn && typeof jQuery.fn.owlCarousel === 'function') {
            jQuery(seletor).owlCarousel(opcoes);
            return;
        }
    } catch (e) {
        console.log('PZ: owlCarousel falhou em', seletor, e && e.message);
        return;
    }
    if (tentativa < 10) {
        setTimeout(function () { pzOwl(seletor, opcoes, tentativa + 1); }, 300);
    } else {
        console.log('PZ: owlCarousel indisponivel (tema nao carregou a lib) —', seletor);
    }
}

function pzParse(valor, padrao) {
    if (valor === null || valor === undefined || valor === '') return padrao;
    if (typeof valor === 'object') return valor;
    try {
        return JSON.parse(valor);
    } catch (e) {
        console.log('PZ: resposta nao e JSON valido, usando padrao', e && e.message);
        return padrao;
    }
}

const personalizeMockups = {}
const objMockups = {};
let personalizeTextos = {};
let inputLabels = {};
let inputValueLabels = pzParse(localStorage.getItem('inputValueLabels'), {});
let fontes = [];
let dropzones = [];
let avaliableDates = [];
let canvas = null;
let isDraggingActive = false;
let isDragging = false;
let lastPosX;
let lastPosY;
let currentVariation = [];

/*PZVARSELO*/
function pzNormVar(s){ try { return (s==null?'':String(s)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(); } catch(e){ return (s==null?'':String(s)).trim().toLowerCase(); } }
function pzPickImageForVariation(subgrupo){
  if (!subgrupo || !subgrupo.images) return null;
  var cfg = subgrupo.configs || {};
  var useVar = cfg.useVariacoes === true || cfg.useVariacoes === 'true' || cfg.useVariacoes === 1 || cfg.useVariacoes === '1';
  if (!useVar) return null;
  var imgs = Array.isArray(subgrupo.images) ? subgrupo.images : Object.keys(subgrupo.images).map(function(k){ return subgrupo.images[k]; });
  var cv = (typeof currentVariation !== 'undefined' && currentVariation) ? currentVariation.filter(Boolean).map(pzNormVar) : [];
  if (!cv.length) return null;
  for (var i=0;i<imgs.length;i++){ if (cv.indexOf(pzNormVar(imgs[i].variacao)) >= 0) return imgs[i]; }
  return null;
}
function pzRefreshSelos(){
  try {
    if (typeof objMockups === 'undefined' || !objMockups) return;
    Object.keys(objMockups).forEach(function(sid){
      var img = document.querySelector('img[data-pz-selo-subgrupo="'+sid+'"]');
      if (!img) return;
      /* selo-swap revertido: keeps img.src as-is */ void 0;
    });
  } catch(e){ console.warn('pzRefreshSelos', e); }
}

/*PZVARSELO2 begin*/
function pzShouldShowGrupo(subData){
  if (!subData) return true;
  // respeita showVariacoes: se desligado (0), o grupo aparece sempre
  try { if (typeof personalizeMockups !== 'undefined' && subData.idGrupo && personalizeMockups[subData.idGrupo] && personalizeMockups[subData.idGrupo].showVariacoes == '0') return true; } catch(e){}
  if (!subData.vinculado) return true;
  var cv = (typeof currentVariation !== 'undefined' && currentVariation) ? currentVariation.filter(Boolean).map(pzNormVar) : [];
  if (!cv.length) return true;
  return cv.indexOf(pzNormVar(subData.vinculado)) >= 0;
}
function pzRefreshGroupVisibility(){
  try {
    if (typeof objMockups === 'undefined' || !objMockups) return;
    Object.keys(objMockups).forEach(function(sid){
      var data = objMockups[sid];
      if (!data || !data.idGrupo) return;
      var div = document.querySelector('.grupo-mockup-'+data.idGrupo);
      if (!div) return;
      div.style.display = pzShouldShowGrupo(data) ? '' : 'none';
    });
  } catch(e){ console.warn('pzRefreshGroupVisibility', e); }
}
/*PZVARSELO2 end*/
/*PZVARSELO end*/

const frases = [
    "✨ Ajustando cada detalhe com amor e precisão...",
    "🎨 Escolhendo as cores perfeitas para você...",
    "🔧 Montando algo que só você vai ter...",
    "💫 Embalando com cuidado estelar...",
    "🚀 Quase lá… o seu produto está ficando incrível!"
];

useJquery().then(() => {

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        if (theme === "atlantico") {
            const kill = (type) => {
                const key = "__kill_" + type;
                window[key] && window.removeEventListener(type, window[key], true);
                window[key] = (e) => e.stopImmediatePropagation();
                window.addEventListener(type, window[key], true);
            };

            kill("scroll");
            kill("wheel");
            kill("touchmove");
        }
    }

    LS.registerOnChangeVariant(function (variant) {
        console.log("Variant changed:", variant);
        // clear current variation
        currentVariation = [];
        currentVariation.push(variant.option0);
        currentVariation.push(variant.option1);
        currentVariation.push(variant.option2);
        pzRefreshSelos(); pzRefreshGroupVisibility(); /*PZVARSELO hook+vis*/

        if (Object.keys(objMockups).length > 0) {
            const btnComprar = document.querySelector("[data-store='product-buy-button']");
            disableButton(btnComprar);
        } else {
            const obrigatorios = document.querySelectorAll("[data-obrigatorio='true']");
            if (obrigatorios.length === 0) return;

            const btnComprar = document.querySelector("[data-store='product-buy-button']");
            validateRequiredFields(obrigatorios, btnComprar);
        }
    });

    //Funções para corrigir temas
    if (theme == "new_linkedman") {
        const alvo = document.querySelector('.js-product-buy-container.product-buy-fixed.affix-top');
        if (alvo) {
            const originalAdd = alvo.classList.add;
            const originalRemove = alvo.classList.remove;
            const originalToggle = alvo.classList.toggle;

            alvo.classList.add = function () {
                console.warn('Tentativa bloqueada de adicionar classe:', arguments);
            };
            alvo.classList.remove = function () {
                console.warn('Tentativa bloqueada de remover classe:', arguments);
            };
            alvo.classList.toggle = function () {
                console.warn('Tentativa bloqueada de alternar classe:', arguments);
            };
            console.log('Proteção ativa: classList bloqueada para o elemento alvo');
        }
    }

    // get no json com os produtos que tem personalização
    $.ajax({
        url: `https://cloudcake.com.br/getExistInputProducts/${LS.store.url}.json`,
        type: 'GET',
        dataType: 'json',
    }).then((data) => {
        personalizedProducts = data.inputs;
        //console.log("Personalized products loaded:", personalizedProducts);

        // redirect no quick buy para a página do produto
        const productsList = document.querySelectorAll("[data-product-type='list']");
        productsList.forEach(product => {
            // get id
            const id = product.dataset.productId;
            // get container
            const container = document.querySelector(`[data-product-id='${id}']`);
            // get link
            const link = product.querySelector('a').href;

            //console.log(`Checking product with id "${id}" for personalization.`, { container, link });

            if (container && link) {
                // verifica se tem personlização comparando id com o personalizedProducts
                const hasPersonalization = personalizedProducts.some(
                    item => item.id_produto === id
                );

                if (!hasPersonalization) {
                    return;
                }
                console.log(`Product with id "${id}" has personalization. Redirecting quick buy to product page.`);

                // troca o botão por um redirect
                container.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = link;
                });

                // check for quick buy modal and redirect
                const quickBuyButton = container.querySelector("[data-toggle='#quickshop-modal']");
                if (quickBuyButton) {
                    quickBuyButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.location.href = link;
                    });
                }
            }
        });

        pzQuickBuyFix();
        pzQuickBuyWatch();
    });

    // === PZQB: compra rápida -> página do produto (produtos com personalização) ===
    // Substitui o botão de compra rápida/quickshop por um link para a página do produto,
    // para o cliente não conseguir adicionar ao carrinho sem personalizar.
    var PZQB_LABEL = 'Comprar'; // null = mantém o texto original do botão

    function pzQuickBuyFix() {
        try {
            if (window.PZQB_OFF === true) return;                 // kill-switch de emergencia
            if (!document || !document.querySelectorAll) return;
            if (!personalizedProducts || !personalizedProducts.length) return;
            if (typeof personalizedProducts.some !== 'function') return;

            var itens = document.querySelectorAll("[data-product-type='list']:not([data-pz-qb])");

            Array.prototype.forEach.call(itens, function (item) {
                var id = item.dataset ? item.dataset.productId : item.getAttribute('data-product-id');
                if (!id) return;

                var temPersonalizacao = personalizedProducts.some(function (p) {
                    return String(p.id_produto) === String(id);
                });
                if (!temPersonalizacao) return;

                var linkEl = item.querySelector("a[href]");
                if (!linkEl) return;
                var link = linkEl.href;

                item.setAttribute('data-pz-qb', '1');

                var botoes = item.querySelectorAll(
                    ".js-addtocart, .js-quickshop-icon-add, .js-prod-submit-form," +
                    " [data-toggle='#quickshop-modal']," +
                    " [data-component='product-list-item.add-to-cart']," +
                    " form.js-product-form input[type='submit']," +
                    " form.js-product-form button[type='submit']"
                );

                Array.prototype.forEach.call(botoes, function (btn) {
                    if (!btn.parentNode) return;

                    var a = document.createElement('a');
                    a.href = link;
                    // mantém as classes visuais e descarta as js-* (hooks de comportamento do tema)
                    a.className = String(btn.className || '').split(/\s+/).filter(function (c) {
                        return c && c.indexOf('js-') !== 0 && c !== 'disabled';
                    }).join(' ');

                    if (PZQB_LABEL) {
                        a.textContent = PZQB_LABEL;
                    } else if (btn.tagName === 'INPUT') {
                        a.textContent = String(btn.value || 'Comprar').trim() || 'Comprar';
                    } else {
                        a.innerHTML = btn.innerHTML; // preserva ícones/estados do tema
                    }
                    a.setAttribute('data-pz-quickbuy', '1');

                    // copia o display real do elemento original: se o tema escondia
                    // (ex.: div.js-addtocart-placeholder), o link continua escondido
                    var pzDisp = '';
                    try { pzDisp = window.getComputedStyle(btn).display; } catch (ePzD) {}
                    a.style.display = pzDisp || 'inline-block';
                    a.style.textAlign = 'center';
                    a.style.textDecoration = 'none';

                    btn.parentNode.replaceChild(a, btn);
                });

                console.log('PZQB: compra rápida redirecionada para a página do produto', id);
            });
        } catch (ePzQb) {
            console.log('PZQB erro:', ePzQb);
        }
    }

    // reaplica em produtos carregados depois (paginação, filtros, scroll infinito)
    var pzQbTimer = null;
    var pzQbUltimaRodada = 0;
    function pzQuickBuyWatch() {
        try {
            // passadas de seguranca caso o observer nao dispare
            setTimeout(pzQuickBuyFix, 800);
            setTimeout(pzQuickBuyFix, 2500);

            if (!window.MutationObserver || !document.body) return;

            // observa so a grade de produtos quando ela existe (menos ruido que o body inteiro)
            var alvo = document.querySelector('.js-product-table') ||
                       document.querySelector('[data-store^="category-grid"]') ||
                       document.body;

            new MutationObserver(function () {
                // max-wait: se ja faz mais de 1s que nao roda, roda agora (evita starvation do debounce)
                if (Date.now() - pzQbUltimaRodada > 1000) {
                    pzQbUltimaRodada = Date.now();
                    pzQuickBuyFix();
                    return;
                }
                clearTimeout(pzQbTimer);
                pzQbTimer = setTimeout(function () {
                    pzQbUltimaRodada = Date.now();
                    pzQuickBuyFix();
                }, 150);
            }).observe(alvo, { childList: true, subtree: true });
        } catch (ePzQbW) {
            console.log('PZQB observer:', ePzQbW);
        }
    }

    // get texts na liguagem do cliente
    $.ajax({
        url: `${baseUrl}Ajax/getTexts`,
        type: 'POST',
        data: {
            loja: LS.store.id
        }
    }).then((texts) => {
        texts = pzParse(texts, {});
        console.log("Texts loaded:", texts);
        // Use the retrieved texts as needed
        personalizeTextos = texts;
    });

    if (LS && LS.cart) {
        try { // PZ guard: nao deixa erro do carrinho derrubar o restante do script (ex.: webview Instagram/Meta)
        console.log("LS.cart available ✅", LS.cart);

        const storedData = localStorage.getItem('cartPersonalizeProperties');
        const cartPersonalizeProperties = pzParse(storedData, {});
        if (cartPersonalizeProperties) {
            Object.values(cartPersonalizeProperties).forEach((value, key) => {
                const itemInCart = LS.cart.items.find(item => item.item_id === value.id);
                if (!itemInCart) {
                    console.log(`Removing item with id "${key}" from cartPersonalizeProperties as it is not in the current cart.`);
                    delete cartPersonalizeProperties[key];
                }
            });
        }

        generateCartHtml['product'](Object.values(cartPersonalizeProperties));

        if (LS.template == "cart") {
            $.ajax({
                url: `${baseUrl}Ajax/getCartData`,
                type: 'POST',
                data: {
                    loja: LS.store.id,
                    cart: LS.cart.id,
                }
            }).then((data) => {
                const cartData = pzParse(data, {});
                inputLabels = cartData.labels;
                console.log("Cart data loaded:", cartData);
                generateCartHtml['product'](Object.values(cartData.produtos));
            });
        }
        } catch (ePzCartGuard) { console.log('PZ cart guard:', ePzCartGuard); }

    }

    if (LS && LS.events) {
        console.log("LS.events available ✅", LS.events);

        document.addEventListener(LS.events.productAddedToCart, function (event) {
            console.log("Product added to cart 🎉");
            console.log("Event detail:", event.detail);
            localStorage.setItem('cartPersonalizeProperties', JSON.stringify(event.detail.cart.products));
            generateCartHtml['product'](event.detail.cart.products);
        });
    } else {
        console.log("LS.events not found ❗");
    }

    console.log("jQuery loaded successfully");

    if (theme == "toluca" && template == "home") {
        // check if there is a product on the home page
        const singleProductElement = document.getElementById("single-product");
        if (singleProductElement) {
            const productData = pzParse(singleProductElement.dataset.variants, []);
            console.log("Product found on home page with data:", productData);
            // PZ: data-variants ausente/vazio estourava aqui e derrubava o init inteiro
            if (productData && productData[0] && productData[0].product_id) {
                PersonalizeProductId = productData[0].product_id; // set PersonalizeProductId for home page
                template = "product"; // set template to product for home page
            } else {
                console.log("PZ: data-variants vazio/invalido na home - segue sem personalizacao");
            }
        }
    }


    if (initPersonalizeApp['amazonas']) {
        initPersonalizeApp['amazonas'](baseUrl, theme).then(() => { 
            /** START mockup */
            console.log("Mockup - jQuery loaded successfully");

            if (fontes && fontes.length > 0) {
                loadFontes(fontes);
            }

            // variação inicial
            currentVariation = getInitialVariation();

            // adiciona o css geral
            //$(`<link href="${baseUrl}jspersonaliza/modal.css" rel='stylesheet' type='text/css'>`).appendTo("head");
            $(`<link href="${baseUrl}jspersonaliza/personaliza-dev.css" rel='stylesheet' type='text/css'>`).appendTo("head");

            // Load Dropzone JS dynamically and wait for it to be ready
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "https://unpkg.com/dropzone@5/dist/min/dropzone.min.js";
            script.onload = function () {
                console.log("Dropzone script loaded!");

                // Optional: load Dropzone CSS if not already included
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = "text/css";
                link.href = "https://unpkg.com/dropzone@5/dist/min/dropzone.min.css";
                document.head.appendChild(link);
            };

            document.head.appendChild(script);

            //if (initMockupApp[theme]) {
            if (initMockupApp["amazonas"]) {
                initMockupApp["amazonas"](baseUrl, theme).then(() => {
                    $(document).on('click', '.btn-modal', function () {
                        var modal = document.getElementById("mockupModal");
                        const subg = $(this).data('subgrupo');
                        console.log("open modal", objMockups[subg]);

                        modal.style.display = "block";

                        $("#mockupModalTitulo").html(objMockups[subg].nome);
                        $("#mockupModalCampo").html(objMockups[subg].camposHtml);
                        // reseta o checkbox de termos
                        $("input[name='termosMockupCheck']").prop("checked", false);
                        $("input[name='termosMockupCheckM']").prop("checked", false);

                        if (fontes && fontes.length > 0) {
                            console.log("fontes", fontes);
                            loadFontes(fontes);
                        }

                        const canvasWrapper = document.getElementById('canvas-container');
                        // init Fabric canvas
                        canvas = new fabric.Canvas('mockupCanvas', {
                            //preserveObjectStacking: true,
                            allowTouchScrolling: true,
                            selection: false,
                            fireMiddleClick: true,
                        });
                        [canvas.wrapperEl, canvas.upperCanvasEl, canvas.lowerCanvasEl].forEach(el => { if (el) el.style.touchAction = 'auto'; });
                        let isOnObject = false;
                        function hitMovable(e) {
                            const t = canvas.findTarget(e, true);
                            return !!(t && t.selectable);
                        }
                        canvas.wrapperEl.addEventListener('touchstart', (e) => {
                            isOnObject = hitMovable(e);
                            if (!isOnObject) {
                                e.stopImmediatePropagation();
                            } else {
                                if (e.cancelable) e.preventDefault();
                            }
                        }, { capture: true, passive: false });
                        canvas.wrapperEl.addEventListener('touchmove', (e) => {
                            if (!isOnObject) {
                                e.stopImmediatePropagation();
                                return;
                            } else {
                                if (e.cancelable) e.preventDefault();
                            }
                        }, { capture: true, passive: false });
                        canvas.wrapperEl.addEventListener('touchend', () => {
                            isOnObject = false;
                        }, { capture: true });
                        canvas.wrapperEl.addEventListener('touchcancel', () => {
                            isOnObject = false;
                        }, { capture: true });

                        fabric.textureSize = 4096;
                        fabric.Object.prototype.borderColor = '#ccc';        // light gray selection border
                        fabric.Object.prototype.cornerColor = '#ccc';        // light gray handles
                        fabric.Object.prototype.cornerStrokeColor = '#666';  // darker gray outline
                        fabric.Object.prototype.cornerStyle = 'circle';      // round handles
                        fabric.Object.prototype.cornerSize = 7;             // handle size
                        fabric.Object.prototype.transparentCorners = false;  // solid fill

                        // re-attach your events (object:modified, text:changed, etc.)
                        attachCanvasEvents(canvas);

                            let loadDefault = true;
                            // se currentVariation não for vazio
                            if (currentVariation && currentVariation.length > 0) {
                                Object.keys(objMockups[subg].images).forEach(image => {
                                    console.log("Comparing variations:", objMockups[subg].images[image].variacao, currentVariation);
                                    // verifica se a variação esta na lista de variações atuais
                                    if (currentVariation.map(pzNormVar).indexOf(pzNormVar(objMockups[subg].images[image].variacao)) >= 0) { /*PZVARSELO norm*/
                                        if (objMockups[subg].images[image].canvas) {
                                            loadDefault = false;
                                            canvas.loadFromJSON(pzParse(objMockups[subg].images[image].canvas, {}), () => {
                                                canvas.getObjects().forEach(obj => {
                                                    applyCustomControlsAndVisibility(obj);

                                                var pzImg = objMockups[subg].images[image];
                                                if (obj.type === "textbox" || obj.type === "text") {
                                                    // a cor so e forcada quando o lojista deixou
                                                    // "usar cor padrao" ligado; senao vale a cor
                                                    // que o campo ja trouxe do canvas
                                                    var pzSet = { editable: false, cursorWidth: 0, splitByGrapheme: true };
                                                    if (pzUsaCorPadrao(pzImg)) pzSet.fill = pzImg.fontColor || '#000';
                                                    obj.set(pzSet);
                                                }
                                                if (obj.type === 'image') {
                                                    if (pzUsaCorEstatica(pzImg)) {
                                                        applyTintFilterToImage(obj, pzImg.staticImageColor || '#000');
                                                    }
                                                    obj.set({ crossOrigin: 'anonymous' });
                                                }
                                            });

                                            fabric.Image.fromURL(objMockups[subg].images[image].url, function (img) {
                                                img.set({ selectable: false });
                                                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                                                    scaleX: canvas.width / img.width,
                                                    scaleY: canvas.height / img.height,
                                                    crossOrigin: "anonymous"
                                                });
                                                canvas.renderAll();
                                            }, { crossOrigin: "anonymous" });
                                            lockDelimiters();
                                            applyRulesToChildren();
                                            restyleDelimiters();
                                            canvas.renderAll();
                                            pzArcosIniciais();
                                        });
                                    }
                                }
                            });
                        }
                        if (loadDefault) {
                            if (objMockups[subg].images[0].canvas) {
                                canvas.loadFromJSON(pzParse(objMockups[subg].images[0].canvas, {}), () => {
                                    canvas.getObjects().forEach(obj => {
                                        applyCustomControlsAndVisibility(obj);

                                        var pzImg0 = objMockups[subg].images[0];
                                        if (obj.type === "textbox" || obj.type === "text") {
                                            var pzSet0 = { editable: false, cursorWidth: 0, splitByGrapheme: true };
                                            if (pzUsaCorPadrao(pzImg0)) pzSet0.fill = pzImg0.fontColor || '#000';
                                            obj.set(pzSet0);
                                        }
                                        if (obj.type === 'image') {
                                            if (pzUsaCorEstatica(pzImg0)) {
                                                applyTintFilterToImage(obj, pzImg0.staticImageColor || '#000');
                                            }
                                            obj.set({ crossOrigin: 'anonymous' });
                                        }
                                    });


                                    fabric.Image.fromURL(objMockups[subg].images[0].url, function (img) {
                                        img.set({ selectable: false });
                                        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                                            scaleX: canvas.width / img.width,
                                            scaleY: canvas.height / img.height,
                                            crossOrigin: "anonymous"
                                        });
                                        canvas.renderAll();
                                    }, { crossOrigin: "anonymous" });
                                    lockDelimiters();
                                    applyRulesToChildren();
                                    restyleDelimiters();
                                    canvas.renderAll();
                                    pzArcosIniciais();
                                });
                            }
                        }

                        // init ALL dropzones inside modal
                        const iniDropzone = new Promise((resolve) => {
                            document.querySelectorAll('#mockupModal .dropzone').forEach(el => {
                                const dz = new Dropzone(el, {
                                    url: "#",
                                    autoProcessQueue: false,
                                    maxFiles: el.dataset.max,
                                    acceptedFiles: "image/*",
                                    accept: function (file, done) {
                                        const reader = new FileReader();

                                        reader.onload = function (event) {
                                            const base64 = event.target.result;

                                            $.ajax({
                                                url: `${baseUrl}Ajax/salvarArquivo`,
                                                method: "POST",
                                                data: {
                                                    loja: LS.store.id,
                                                    filename: file.name,
                                                    filetype: file.type,
                                                    base64: base64
                                                },
                                                success: function (res) {
                                                    response = pzParse(res, {});
                                                    console.log("File uploaded successfully:", response);
                                                    const inputEl = $("#" + el.dataset.campovinculado);
                                                    let currentVal = inputEl.val();
                                                    if (currentVal) {
                                                        inputEl.val(currentVal + ';' + response.val);
                                                    } else {
                                                        inputEl.val(response.val);
                                                    }
                                                    // Simulate Dropzone completion
                                                    dz.emit("success", file, res);
                                                    dz.emit("complete", file);

                                                    done(); // <-- mark as accepted
                                                },
                                                error: function (err) {
                                                    dz.emit("error", file, err);
                                                    done("Upload failed"); // <-- mark as rejected
                                                }
                                            });
                                        };
                                        reader.readAsDataURL(file); // Convert to base64
                                    }
                                });

                                dz.on("addedfile", function (file) {
                                    const reader = new FileReader();
                                    reader.onload = function (e) {
                                        // valida se tem delimiter vinculado
                                        if (!el.dataset.delimiter) {
                                            console.log("No delimiter linked to this dropzone. Please set the 'data-delimiter' attribute.", el);
                                            return;
                                        }
                                        // pass dropzone id so each one is unique
                                        addImageFromDropzone(file, e.target.result, el.id, el.dataset.delimiter);
                                    };
                                    reader.readAsDataURL(file);
                                });

                                dropzones.push(dz);
                            });
                            resolve();
                        });

                        iniDropzone.then(() => {
                            //criarObrigatoriosMockup();
                        });

                        // init own carrousel
                        pzOwl(".owl-carousel-normal", {
                            loop: false,
                            margin: 5,
                            items: 2,
                            nav: true,
                            dots: false
                        });
                        pzOwl(".owl-carousel-small", {
                            loop: false,
                            margin: 20,
                            items: 4,
                            nav: true,
                            dots: false,
                            autoWidth: true,
                            responsive: {
                                0: {
                                    items: 2,
                                    nav: true,
                                    dots: false,
                                    autoWidth: true
                                },
                                460: {
                                    items: 3,
                                    nav: true,
                                    dots: false,
                                    autoWidth: true
                                },
                                600: {
                                    items: 3,
                                    nav: true,
                                    dots: false,
                                    autoWidth: true,
                                },
                            }
                        });

                        // adiciona o evento de mudança para as fontes
                        document.querySelectorAll("select.font-select").forEach(select => {
                            select.addEventListener('change', selectFontCanvas);
                        });

                        var panel = $(".mockup-right");
                        panel[0].style.maxHeight = (panel[0].scrollHeight + 90) + "px";
                        $(".mockup-mostrar-campos").html("Esconder campos");
                    });
                    $(document).on('click', '.mockup-close-action', function () {
                        var modal = document.getElementById("mockupModal");
                        if (canvas) {
                            canvas.dispose();
                            canvas = null;
                        }
                        modal.style.display = "none";
                    });
                    $(document).on('click', '.mockup-mostrar-campos', function () {
                        var panel = $(".mockup-right");
                        if (panel[0].style.maxHeight) {
                            panel[0].style.maxHeight = null;
                            $(this).html("Mostrar campos");
                        } else {
                            panel[0].style.maxHeight = (panel[0].scrollHeight + 90) + "px";
                            $(this).html("Esconder campos");
                        }
                    });
                    window.onclick = function (event) {
                        var modal = document.getElementById("mockupModal");
                        if (event.target == modal) {
                            if (canvas) {
                                canvas.dispose();
                                canvas = null;
                            }
                            modal.style.display = "none";
                        }
                    };
                    loadStoreLogic();
                    verificarVinculo();
                    verificarVariacao('')
                });
            } else {
                console.log(`Mockup - Theme "${theme}" is not supported or not implemented.`);
                initMockupApp["amazonas"](baseUrl, theme);
            }
            // setTimeout para esperar o modal ser criado
            setTimeout(() => {
                console.log("Loading store logic after initialization...");
                loadStoreLogic();
                verificarVinculo();
            }, 1000);
            /** END mockup */
        });
    } else {
        console.log(`Theme "${theme}" is not supported or not implemented.`);
        initPersonalizeApp["amazonas"](baseUrl, theme);
    }

    // adiciona o css geral
    $(`<link href="${baseUrl}jspersonaliza/personaliza-dev.css" rel='stylesheet' type='text/css'>`).appendTo("head");

    loadStoreLogic();
    verificarVinculo();
    setTimeout(verificarVinculo, 1500); // PZ: reaplica vinculo apos mockups async renderizarem
    setTimeout(verificarVinculo, 3500); // PZ
});

/**
 * PZ: acha o formulario do produto que o cliente esta vendo de fato.
 *
 * Tema com "compra rapida" repete form.js-product-form e input[add_to_cart] em
 * cada card de produto relacionado — tem loja com 13 formularios na mesma
 * pagina. Como o container dos campos era criado no PRIMEIRO match de
 * `.js-product-form .js-product-variants`, os campos caiam dentro do card
 * (escondido) de um produto relacionado: existiam no HTML, com display:flex,
 * mas o cliente nunca via porque o pai estava com display:none.
 */
function pzFormPrincipal() {
    const forms = Array.from(document.querySelectorAll('form.js-product-form, form#product_form, #product_form'));
    if (!forms.length) return null;

    const idProduto = String(
        (typeof PersonalizeProductId !== 'undefined' && PersonalizeProductId) ||
        (window.LS && LS.product && LS.product.id) || ''
    );
    const ehRelacionado = (f) => !!(f.closest && f.closest('#related-products, .js-related-products, .js-quickshop-container, .item-buy-variants'));
    const estaVisivel = (f) => !!(f.offsetParent || f.getClientRects().length);

    // 1) o form cujo add_to_cart e o produto DESTA pagina — o mais confiavel
    if (idProduto) {
        const porId = forms.find((f) => {
            const inp = f.querySelector('input[name="add_to_cart"]');
            return inp && String(inp.value) === idProduto;
        });
        if (porId) return porId;
    }
    // 2) o que tem o botao de compra principal, visivel e fora dos relacionados
    const comBotao = forms.find((f) => f.querySelector('[data-store="product-buy-button"]') && estaVisivel(f) && !ehRelacionado(f));
    if (comBotao) return comBotao;
    // 3) qualquer um visivel que nao seja de produto relacionado
    const solto = forms.find((f) => estaVisivel(f) && !ehRelacionado(f));
    if (solto) return solto;
    // 4) ultimo caso: o comportamento antigo
    return forms[0];
}

/**
 * PZ: coloca o container no melhor ponto DENTRO do form principal —
 * depois das variacoes (como sempre foi), ou logo acima do botao de compra
 * quando o tema nao tem bloco de variacoes nesse form.
 */
function pzInsereNoForm(form, html) {
    if (!form || typeof $ === 'undefined') return null;
    const $novo = $(html);
    const variantes = form.querySelector('.js-product-variants');
    if (variantes) {
        $novo.insertAfter(variantes);
    } else {
        const botao = form.querySelector('[data-store="product-buy-button"]');
        if (botao) {
            $novo.insertBefore(botao);
        } else {
            $novo.prependTo(form);
        }
    }
    return $novo[0];
}

function loadStoreLogic() {
    if (LS?.store?.id) {
        // verifica se ja foi carregado
        const existingScript = document.querySelector(`script[src="${baseUrl}jsclientes/${LS.store.id}.js"]`);
        if (existingScript) {
            // remove o script existente para forçar recarregamento
            existingScript.remove();
            console.log(`Store logic script for store ID ${LS.store.id} reloaded.`);
        }

        const script = document.createElement('script');
        script.src = `${baseUrl}jsclientes/${LS.store.id}.js`;
        script.onload = () => {
            console.log(`Lógica da loja ${LS.store.id} carregada.`);
        };
        document.head.appendChild(script);
    }

    // move o #personalize_mockup_app_container para aparecer depois do #personalize_app_container
    const personalizeAppContainer = document.getElementById('personalize_app_container');
    const personalizeMockupAppContainer = document.getElementById('personalize_mockup_app_container');
    if (personalizeAppContainer && personalizeMockupAppContainer) {
        console.log("Moving personalize_mockup_app_container after personalize_app_container");
        personalizeAppContainer.parentNode.insertBefore(personalizeMockupAppContainer, personalizeAppContainer.nextSibling);
    }
}

/** START mockup */
const initMockupApp = {
    'amazonas': (baseUrl, theme) => {
        return new Promise((resolve) => {
            //carrega o fabrics.js
            $(`<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>`).appendTo("head");
            //$(`<script src="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/owl.carousel.min.js"></script>`).appendTo("head");
            //$(`<link href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css" rel='stylesheet' type='text/css'>`).appendTo("head");
            //$(`<link href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.theme.default.min.css" rel='stylesheet' type='text/css'>`).appendTo("head");

            // cria o elemento onde o conteudo sera inserido.
            // PZ: mesma correcao do container dos campos — ancora no formulario
            // do produto da pagina, nunca no card de um produto relacionado.
            const pzFormMockup = pzFormPrincipal();
            const pzHtmlMockup = `<div style="display: flex;flex-wrap: wrap;flex-direction: column;justify-content: flex-start;"
                                id="personalize_mockup_app_container" class="customizacoes">
                                </div>`;
            if (typeof $ === 'undefined' || !pzFormMockup) {
                console.log("PZ: jQuery nao carregado ou formulario do produto nao encontrado (mockup).");
            } else {
                const pzAppContainer = pzFormMockup.querySelector('#personalize_app_container')
                    || document.getElementById('personalize_app_container');
                if (pzAppContainer) {
                    $(pzHtmlMockup).insertAfter(pzAppContainer);
                } else {
                    pzInsereNoForm(pzFormMockup, pzHtmlMockup);
                }
            }

            if (template == "product") {
                let useCarrousel = false;
                $.ajax({
                    url: `${baseUrl}Ajax/getMockups`,
                    type: 'POST',
                    data: {
                        loja: storeId,
                        produto: PersonalizeProductId,
                    }
                }).then((data) => {
                    console.log("campos Personalizados:", data);

                    if (data.fontes && data.fontes.length > 0) {
                        fontes = data.fontes;
                        console.log("Loading fonts:", fontes);
                        loadFontes(fontes);
                    }

                    if (Object.keys(data.mockup[0]).length > 0) {

                        // append modal
                        $('#product_form').append(`
                            <style>
                                .loader-mockup {
                                    width: 30px;
                                    height: 26px;
                                    background: linear-gradient(#f2f2f2 0 0) bottom / 100% 0% no-repeat #d35400;
                                    aspect-ratio: 1;
                                    -webkit-mask: 
                                        radial-gradient(circle at 60% 65%, #000 62%, #0000 65%) top left, 
                                        radial-gradient(circle at 40% 65%, #000 62%, #0000 65%) top right, 
                                        linear-gradient(to bottom left, #000 42%,#0000 43%) bottom left , 
                                        linear-gradient(to bottom right,#000 42%,#0000 43%) bottom right;
                                    -webkit-mask-size: 50% 50%;
                                    -webkit-mask-repeat: no-repeat;
                                    animation: l19 2s infinite linear;
                                }
                                @keyframes l19 {
                                    90%,100% {background-size:100% 100%}
                                }
                                .message {
                                    margin-top: 10px;
                                    color: #977650;
                                    font-size: 16px;
                                    text-align: center;
                                    animation: fade 1s ease-in-out infinite alternate;
                                }
                                .subtext {
                                    color: #977650;
                                    font-size: 14px;
                                    margin-top: 10px;
                                }
                                .loader-container{
                                    display: none;
                                    align-items: center;
                                    flex-direction: column;
                                }
                                .loader-container-mobile{
                                    display: none;
                                    align-items: center;
                                    flex-direction: column;
                                }

                                .mockup-buy{
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                }
                                :root {
                                    --modal-bg: #ffffff;
                                    --text: #1f2937;
                                    /* cinza-900 */
                                    --muted: #6b7280;
                                    /* cinza-500 */
                                    --border: #e5e7eb;
                                    /* cinza-200 */
                                    --shadow: 0 20px 40px rgba(0, 0, 0, 0.16);
                                    --radius: 4px;
                                }

                                .mockup-modal {
                                    display: none;
                                    position: fixed;
                                    inset: 0;
                                    z-index: 9999;
                                    background: rgba(17, 24, 39, 0.55);
                                    overflow: auto;
                                    font-family: "Open Sans" !important;
                                }

                                .mockup-dialog {
                                    background: var(--modal-bg);
                                    color: var(--text);
                                    max-width: 1260px;
                                    margin: 32px auto;
                                    box-shadow: var(--shadow);
                                    border-radius: var(--radius);
                                    padding: 24px 24px 28px;
                                    position: relative;
                                }

                                .mockup-close {
                                    position: absolute;
                                    top: 12px;
                                    right: 12px;
                                    width: 40px;
                                    height: 40px;
                                    border-radius: 999px;
                                    border: none;
                                    background: #fff;
                                    cursor: pointer;
                                    font-size: 22px;
                                    line-height: 1;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    color: #374151;
                                }

                                .mockup-close:hover {
                                    background: #f9fafb00;
                                }

                                .mockup-grid {
                                    display: grid;
                                    grid-template-columns: 1.2fr 0.8fr;
                                    gap: 28px;
                                }

                                @media (max-width: 1024px) {
                                    .mockup-grid {
                                        grid-template-columns: 1fr;
                                    }
                                }
                                @media (max-width: 728px) {
                                    .mockup-grid {
                                        display: flex;
                                        justify-items: end;
                                        align-content: stretch;
                                        flex-direction: column-reverse;
                                        align-items: center;
                                        justify-content: center;
                                        gap: 0px;
                                    }
                                }

                                .mockup-left {
                                    background: #fff;
                                    border: 1px solid var(--border);
                                    padding: 10px;
                                }

                                @media (max-width: 600px) {
                                    .mockup-left {
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        align-content: center;
                                        flex-direction: column;
                                        max-width: 100%;
                                    }
                                }

                                .mockup-title {
                                    font-size: 22px;
                                    font-weight: 700;
                                    margin: 0 0 6px;
                                    font-family: "Open Sans" !important;
                                }

                                .mockup-subtle {
                                    margin: 0 0 14px;
                                    font-size: 14px;
                                    color: var(--muted);
                                    padding-top: 10px;
                                    border-bottom: 3px solid var(--border);
                                    font-family: "Open Sans" !important;
                                }

                                #canvas-container {
                                    overflow: hidden;
                                    position: relative;
                                    width: 100%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                }

                                #mockupCanvas {
                                    display: block;
                                    width: 100%;
                                    height: auto;
                                    /* Prevent browser from handling touch gestures */
                                    /*touch-action: none;*/
                                    /* Ensure smooth scaling */
                                    transform-origin: 0 0;
                                    /* Initial scale */
                                    transform: scale(1);
                                }
                                @media (max-width: 728px) {
                                    #canvas-container {
                                        overflow: hidden;
                                    }
                                    #mockupCanvas,
                                    .upper-canvas {
                                        display: block;
                                        width: 100%;
                                        height: auto;
                                        left: 50% !important;
                                        transform: translateX(-50%);
                                    }
                                }

                                .mockup-mostrar-campos {
                                    height: 30px;
                                    border-radius: 5px;
                                    border: solid 1px #737577;
                                    background: #fff;
                                    cursor: pointer;
                                    font-size: 18px;
                                    display: none;
                                    align-items: center;
                                    justify-content: center;
                                    color: #374151;
                                    font-family: "Open Sans" !important;
                                }
                                @media (max-width: 728px) {
                                    .mockup-mostrar-campos {
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                    }
                                }

                                .mockup-right {
                                    padding: 0px;
                                    background: #fff;
                                    max-height: 0;
                                    overflow: hidden;
                                    overflow-y: auto;
                                    transition: max-height 0.2s ease-out;
                                }

                                .mockup-product-name {
                                    font-size: 20px;
                                    margin: 0 0 4px;
                                    font-family: "Open Sans" !important;
                                }

                                .price-wrap {
                                    margin: 10px 0 18px;
                                }

                                .price-main {
                                    font-size: 28px;
                                    font-weight: 800;
                                }

                                .price-note {
                                    font-size: 14px;
                                    color: var(--muted);
                                    margin-top: 6px;
                                }

                                /* Campos */
                                .customizacoes {
                                    /*display: grid;*/
                                    display: flex;
                                    flex-wrap: wrap;
                                    flex-direction: row-reverse;
                                    justify-content: flex-end;
                                    gap: 12px;
                                    margin-top: 10px;
                                }

                                .mockup-field input,
                                .mockup-field select {
                                    width: 100%;
                                    height: 44px;
                                    border: 1px solid var(--border);
                                    border-radius: 10px;
                                    padding: 10px 12px;
                                    font-size: 14px;
                                    outline: none;
                                    background: #fff;
                                    transition: border-color 0.2s, box-shadow 0.2s;
                                }

                                .mockup-field input:focus,
                                .mockup-field select:focus {
                                    border-color: #9ca3af;
                                    box-shadow: 0 0 0 4px rgba(156, 163, 175, 0.2);
                                }

                                .mockup-inline {
                                    display: flex;
                                    align-items: flex-start;
                                    gap: 10px;
                                    font-size: 14px;
                                    color: #374151;
                                }

                                #mockupModalCampo {
                                    max-height: calc(85vh - 300px);
                                    overflow-y: auto;
                                    padding-right: 6px;
                                }

                                .mockup-zoom-controls {
                                    display: flex;
                                    align-content: center;
                                    align-items: center;
                                    justify-content: flex-end;
                                    margin: 10px;
                                }

                                .mockup-zoom-controls button.active {
                                    border: 1px solid #5890e4ff !important;
                                    background: #5890e4ff !important;
                                    color: #fafafaff !important;
                                }

                                /* Botões de zoom + mover */
                                .mockup-zoom-controls button:not(.resetButton) {
                                    margin: 4px;
                                    height: 40px;
                                    width: 40px;
                                    border: 1px solid #d1d5db;
                                    background: #fff;
                                    cursor: pointer;
                                    font-size: 16px;
                                    color: #272727;
                                    border-radius: 6px;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                }

                                .mockup-zoom-controls button:not(.resetButton):hover {
                                    background: #f9fafb;
                                    border-color: #9ca3af;
                                    transform: scale(1.05);
                                    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
                                }

                                /* Botão Reset */
                                .mockup-zoom-controls .resetButton {
                                    margin: 4px;
                                    height: 40px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 6px;
                                    background: #fff;
                                    cursor: pointer;
                                    font-size: 14px;
                                    color: #111827;
                                    padding: 0 12px;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                }

                                .mockup-zoom-controls .resetButton:hover {
                                    background: #f3f4f6;
                                    border-color: #9ca3af;
                                    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
                                }
                                /* Esconde o botão mobile por padrão */
                                .btn-mobile {
                                    display: none;
                                }
                                .mockup-termos-mob{
                                    text-align: justify;
                                    display: none;
                                }
                                .mockup-termos-desk{
                                    text-align: justify;
                                    display: block;
                                }

                                /* No mobile (até 728px) esconde o normal e mostra o mobile */
                                @media (max-width: 728px) {
                                    .mockup-termos-mob{
                                        display: block;
                                    }
                                    .mockup-termos-desk{
                                        display: none;
                                    }
                                    .btn-mobile {
                                        display: flex;
                                        margin-top: 12px;
                                    }
                                    .mockup-buy:not(.btn-mobile) {
                                        display: none;
                                    }
                                }

                                @media (max-width: 728px) {
                                    .btn-mobile {
                                        display: flex;
                                        margin-top: 12px;
                                    }
                                    .mockup-buy:not(.btn-mobile) {
                                        display: none;
                                    }
                                }
                                /* botões no mobile  */
                                @media (max-width: 728px) {
                                    .mockup-zoom-controls button:not(.resetButton) {
                                        margin: 0px 20px;
                                    }
                                }

                                @media (max-width: 728px) {
                                    #canvas-container {
                                        position: relative;
                                    }
                                }
                            </style>

                            <div id="mockupModal" class="mockup-modal">
                                <div class="mockup-dialog">
                                    <button class="mockup-close mockup-close-action" type="button" aria-label="Fechar">&times;</button>

                                    <button class="mockup-mostrar-campos" type="button" aria-label="Mostrar Campos">
                                        Esconder campos
                                    </button>

                                    <div class="mockup-grid">
                                        <!-- LADO ESQUERDO -->
                                        <div class="mockup-left">
                                            <p class="mockup-subtle">${personalizeTextos.ilustracao_personalizacao || 'Imagem ilustrativa para personalização.'}</p>

                                            <div class="mockup-zoom-controls">
                                                <button type="button" onclick="activateDragging(this)">
                                                    <!-- Ícone mover -->
                                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                                        <polyline points="5 9 2 12 5 15"></polyline>
                                                        <polyline points="9 5 12 2 15 5"></polyline>
                                                        <polyline points="15 19 12 22 9 19"></polyline>
                                                        <polyline points="19 9 22 12 19 15"></polyline>
                                                        <line x1="2" y1="12" x2="22" y2="12"></line>
                                                        <line x1="12" y1="2" x2="12" y2="22"></line>
                                                    </svg>
                                                </button>
                                                <button type="button" onclick="zoomIn()">
                                                    <!-- Ícone zoom in -->
                                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                                        <circle cx="11" cy="11" r="8"></circle>
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                        <line x1="11" y1="8" x2="11" y2="14"></line>
                                                        <line x1="8" y1="11" x2="14" y2="11"></line>
                                                    </svg>
                                                </button>
                                                <button type="button" onclick="zoomOut()">
                                                    <!-- Ícone zoom out -->
                                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                                        <circle cx="11" cy="11" r="8"></circle>
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                        <line x1="8" y1="11" x2="14" y2="11"></line>
                                                    </svg>
                                                </button>
                                                <button class="resetButton" type="button" onclick="resetZoom()">
                                                    Voltar
                                                </button>
                                            </div>

                                            <div id="canvas-container">
                                                <canvas id="mockupCanvas" width="600" height="500"></canvas>
                                            </div>

                                            <div class="mockup-termos-mob isMockupInput" data-obrigatorio="true" style="gap: 6px; font-size: 12px; font-weight: 500; color: #A98F71; line-height: 1.4; cursor: pointer;">
                                                <input required style="-webkit-appearance: checkbox;" type="checkbox" name="termosMockupCheckM" id="termosMockupCheckM" class="form-check-input" />
                                                &nbsp; 
                                                <span>
                                                    <strong>${personalizeTextos.confirmacao_personalizacao || 'Confirmo que as informações estão corretas e aprovo este layout.'}</strong>
                                                    ${personalizeTextos.confirmacao_personalizacao2 || 'Entendo que produtos personalizados não podem ser trocados ou devolvidos, a não ser em caso de defeito ou dano no transporte. Nossos designers farão os ajustes finais para que sua personalização fique perfeita!'}
                                                </span>
                                            </div>

                                            <button type="button" id="mockupBuyMobile"  onclick="saveCanvasAsImages(this)" class="mockup-buy btn btn-primary btn-big btn-block btn-mobile">
                                                ${personalizeTextos.adicionar_ao_carrinho || 'ADICIONAR AO CARRINHO'}
                                            </button>
                                            <div class="loader-container-mobile">
                                                <div class="loader-mockup"></div>
                                                <div class="message" id="msg">🚀 Estamos criando seu produto exclusivo na velocidade da luz...</div>
                                                <div class="subtext" id="subMb">${frases[0]}</div>
                                            </div>
                                        </div>

                                        <!-- LADO DIREITO -->
                                        <div class="mockup-right">
                                            <div style="padding: 18px">
                                                <h1 class="mockup-product-name h4" style="font-style: normal; font-weight: 800;font-size: 20px;">${LS.product.name}</h1>

                                                <div class="price-wrap">
                                                    <div class="price-main">
                                                        <span class="js-price-display font-family-body" style="color: #977650;; font-size: 23px;">
                                                            ${$("#price_display").html()}
                                                        </span>
                                                    </div>
                                                    <div class="price-note">
                                                        <h1 style="font-family: 'Open Sans';font-size: 17px;color: #977650;;font-style: normal;font-weight: 800;margin-top: 20px; margin-bottom: 0px;">
                                                            ${personalizeTextos.personalize_o_seu_produto || 'PERSONALIZE O SEU PRODUTO'}
                                                        </h1>
                                                        <p style="color: #A98F71; font-size: 13px; font-weight: 500;">
                                                            ${personalizeTextos.utilize_campos_personalizacao || 'Utilize os campos abaixo para personalizar o seu produto.'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div id="mockupModalCampo" class="customizacoes" style="color: #A98F71; font-weight: 800;">
                                                    <div class="mockup-field" style="color: #A98F71;"></div>
                                                </div>

                                                <div class="mockup-termos-desk isMockupInput" style="gap: 6px; font-size: 12px; font-weight: 500; color: #A98F71; line-height: 1.4; cursor: pointer;" data-obrigatorio="true">
                                                    <input required style="-webkit-appearance: checkbox;" type="checkbox" name="termosMockupCheck" id="termosMockupCheck" class="form-check-input"/>
                                                    &nbsp; 
                                                    <span>
                                                        <strong>${personalizeTextos.confirmacao_personalizacao || 'Confirmo que as informações estão corretas e aprovo este layout.'}</strong>
                                                        ${personalizeTextos.confirmacao_personalizacao2 || 'Entendo que produtos personalizados não podem ser trocados ou devolvidos, a não ser em caso de defeito ou dano no transporte. Nossos designers farão os ajustes finais para que sua personalização fique perfeita!'}
                                                    </span>
                                                </div>

                                                <div style="margin-top: 16px">
                                                    <button type="button" id="mockupBuy" onclick="saveCanvasAsImages(this)" class="mockup-buy btn btn-primary btn-big btn-block">
                                                        ${personalizeTextos.adicionar_ao_carrinho || 'ADICIONAR AO CARRINHO'}
                                                    </button>
                                                    <div class="loader-container">
                                                        <div class="loader-mockup"></div>
                                                        <div class="message" id="msg">🚀 Estamos criando seu produto exclusivo na velocidade da luz...</div>
                                                        <div class="subtext" id="sub">${frases[0]}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `);

                        const btnComprar = document.querySelector("[data-store='product-buy-button']");
                        disableButton(btnComprar);

                        $("#personalize_mockup_app_container").append(`
                            <input type="hidden" name="properties[mockupComFundo]" value=""/>
                            <input type="hidden" name="properties[mockupSemFundo]" value=""/>
                        `);

                        let mockupModalBtns = '';
                        let idGrupo = '';
                        data.mockup.forEach(mockup => {
                            Object.keys(mockup).forEach(key => {
                                idGrupo = key;

                                personalizeMockups[idGrupo] = {
                                    container: `.grupo-mockup-${idGrupo}`,
                                    variacoes: new Set(mockup[key].vinculado.split(';').filter(Boolean)) || new Set(),
                                    showVariacoes: mockup[key].showVariacoes,
                                    vinculadoCom: mockup[key].vinculoCom || [],
                                };

                                $("#personalize_mockup_app_container").append(`
                                    <div class="grupo-mockup-${idGrupo}">
                                        <p>${personalizeTextos.selecione_arte || 'SELECIONE uma arte para personalizar'}</p>
                                    </div>
                                `);

                                mockup[key].subgrupos.forEach(subgrupo => {

                                    let inputHtml = ``;
                                    objMockups[subgrupo.id] = {
                                        nome: subgrupo.nome,
                                        campos: subgrupo.campos,
                                        configs: subgrupo.configs,
                                        images: subgrupo.images,
                                        camposHtml: inputHtml,
                                        /*PZVARSELO2*/ vinculado: (mockup[key]&&mockup[key].vinculado)||subgrupo.vinculado, idGrupo: key, selo: subgrupo.selo
                                    }

                                    subgrupo.campos.forEach(campo => {
                                        let campoDelimiter = {};
                                        Object.keys(subgrupo.configs.delimiters).forEach(delimiter => {
                                            if (subgrupo.configs.delimiters[delimiter].campo == campo.id_campo) {
                                                campoDelimiter = subgrupo.configs.delimiters[delimiter];
                                            }
                                        });
                                        inputHtml += generateMockupInputHtml[campo.tipo](campo, campoDelimiter);
                                    });
                                    objMockups[subgrupo.id].camposHtml = inputHtml;

                                    if (mockup[key].subgrupos.length > 1) {
                                        useCarrousel = true;
                                        mockupModalBtns += `
                                            <div class="item" style="padding: 0px;margin:7px;">
                                                <button style="
                                                    width: 115px;
                                                    height: 80px;
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    padding: 5px;
                                                    margin: 0px 0px;
                                                    border: solid 1px lightgrey;
                                                    border-radius: 5px;"
                                                    type="button" data-subgrupo="${subgrupo.id}" class="btn-modal">
                                                    <img data-pz-selo-subgrupo="${subgrupo.id}" style="" src="${subgrupo.selo}" alt="${pzNome(subgrupo.nome)}" class="" />
                                                </button>
                                            </div>
                                        `;
                                    } else {
                                        mockupModalBtns += `
                                            <div style="padding: 10px;">
                                                <button style="
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    width: 100%;
                                                    padding: 10px;
                                                    margin: 5px 0px;
                                                    border: solid 1px lightgrey;
                                                    border-radius: 5px;"
                                                    type="button" data-subgrupo="${subgrupo.id}" class="btn-modal">
                                                    <img data-pz-selo-subgrupo="${subgrupo.id}" style="width: 90px;height: 60px;" src="${subgrupo.selo}" alt="${pzNome(subgrupo.nome)}" class="" />
                                                </button>
                                            </div>
                                        `;
                                    }
                                });
                            });
                        });

                        setTimeout(function(){ try{ pzRefreshSelos(); pzRefreshGroupVisibility(); }catch(e){} }, 50); /*PZVARSELO2 init*/
                            if (useCarrousel) {
                            switch (theme) {
                                case 'recife':
                                    $(`#personalize_mockup_app_container .grupo-mockup-${idGrupo}`).append(`
                                        <style>
                                            .carousel-main-container{
                                                position:relative;
                                                width: 465px;
                                                margin-bottom: 15px;
                                            }
                                            @media (max-width: 768px) {
                                                .carousel-main-container{
                                                    width: 438px;
                                                }
                                            }
                                            @media (max-width: 459px) {
                                                .carousel-main-container{
                                                    width: 390px;
                                                }
                                            }
                                        </style>
                                        <div class="carousel-main-container" style="">
                                            <div class="owl-carousel owl-theme">
                                                ${mockupModalBtns}
                                            </div>
                                        </div>
                                    `);
                                    pzOwl(`.grupo-mockup-${idGrupo} .owl-carousel`, {
                                        items: 3,
                                        nav: true,
                                        dots: false,
                                        autoWidth: true,
                                        responsive: {
                                            0: {
                                                items: 3,
                                                nav: false,
                                                dots: true,
                                                autoWidth: true
                                            },
                                            460: {
                                                items: 3,
                                                nav: false,
                                                dots: true,
                                                autoWidth: false
                                            },
                                            600: {
                                                items: 3,
                                                nav: true
                                            },
                                        }
                                    });
                                    $('body').append(`
                                        <style>
                                            #personalize_mockup_app_container .owl-stage-outer {
                                                z-index: 1 !important;
                                                margin: 0px 26px !important;
                                            }
                                            #personalize_mockup_app_container .owl-nav {
                                                position: absolute !important;
                                                width: 105% !important;
                                                max-width: 110% !important;
                                                margin: 0!important;
                                                left: 50% !important;
                                                top: 50% !important;
                                                transform: translate(-50%,-50%) !important;
                                                display: flex;
                                                flex-wrap: nowrap !important;
                                                justify-content: space-between !important;
                                                align-items: center !important;
                                            }
                                            #personalize_mockup_app_container .owl-nav.disabled {
                                                display: none;
                                            }
                                            #personalize_mockup_app_container .owl-nav button {
                                                width: 36px !important;
                                                height: 36px !important;
                                                margin: 0 !important;
                                                display: flex;
                                                border: solid 1px #b2b2b2 !important;
                                                border-radius: 20px !important;
                                                justify-content: center !important;
                                                align-items: center !important;
                                            }
                                            #personalize_mockup_app_container .owl-nav button>span {
                                                font-size: 26px !important;
                                                font: icon !important;
                                            }
                                            @media screen and (max-width: 460px) {
                                                #personalize_mockup_app_container .owl-stage-outer{
                                                    z-index: 0 !important;
                                                    margin: 0px 0px !important;
                                                }
                                                #personalize_mockup_app_container .owl-nav {
                                                    width: 85% !important;
                                                }
                                            }
                                        </style>
                                    `);
                                    break;
                                default:
                                    $(`#personalize_mockup_app_container .grupo-mockup-${idGrupo}`).append(`
                                        <style>
                                            .carousel-main-container{
                                                position:relative;
                                                width: 390px;
                                                /*width: 465px;*/
                                                margin-bottom: 15px;
                                            }
                                            @media (max-width: 768px) {
                                                .carousel-main-container{
                                                    width: 438px;
                                                }
                                            }
                                            @media (max-width: 459px) {
                                                .carousel-main-container{
                                                    width: 390px;
                                                }
                                            }
                                        </style>
                                        <div class="carousel-main-container" style="">
                                            <div class="owl-carousel owl-theme">
                                                ${mockupModalBtns}
                                            </div>
                                        </div>
                                    `);
                                    pzOwl(`.grupo-mockup-${idGrupo} .owl-carousel`, {
                                        items: 3,
                                        nav: true,
                                        navText: [
                                            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M15 19l-7-7 7-7"/></svg>',
                                            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>'
                                        ],
                                        dots: false,
                                        autoWidth: true,
                                        responsive: {
                                            0: {
                                                items: 3, 
                                                nav: false,
                                                dots: true,
                                                autoWidth: true
                                            },
                                            460: {
                                                items: 3,
                                                nav: false,
                                                dots: true,
                                                autoWidth: false
                                            },
                                            600: {
                                                items: 3,
                                                nav: true
                                            },
                                        }
                                    });
                                    $('body').append(`
                                        <style>
                                            #personalize_mockup_app_container .owl-carousel {
                                                position: relative !important;
                                            }
                                            #personalize_mockup_app_container .owl-prev {
                                                position: absolute !important;
                                                top: 45% !important;
                                                left: -16px !important;
                                                transform: translateY(-50%) !important;
                                                cursor: pointer !important;
                                                z-index: 10 !important;
                                            }
                                            #personalize_mockup_app_container .owl-next {
                                                position: absolute !important;
                                                top: 45% !important;
                                                right: -16px !important;
                                                transform: translateY(-50%) !important;
                                                cursor: pointer !important;
                                                z-index: 10 !important;
                                            }
                                            #personalize_mockup_app_container .owl-theme .owl-nav [class*='owl-'] {
                                                display: flex;
                                                width: 24px !important;
                                                height: 24px !important;
                                                align-items: center !important;
                                                justify-content: center !important;
                                            }
                                        </style>
                                    `);
                                    break;
                            }
                        } else {
                            $(`#personalize_mockup_app_container .grupo-mockup-${idGrupo}`).append(mockupModalBtns);
                        }
                    }

                    if (LS.store.id == 6413755) {
                        document.documentElement.style.setProperty("--text-color", "#977650");
                    }

                    $(`<link href="${baseUrl}jspersonaliza/temas/amazonas.css" rel='stylesheet' type='text/css'>`).appendTo("head");
                    resolve();
                });
            }
        })
    },
}

const generateMockupInputHtml = {
    'texto': (input, delimiter) => {
            let corLojaHtml = '';
            try {
                if (String(input.permite_cor) === '1') {
                    var __tid = delimiter.placeholder;
                    var __sw = '';
                    if ((input.cor_tipo || 'livre') === 'lista') {
                        var __cores = [];
                        try { __cores = JSON.parse(input.cores_permitidas || '[]'); } catch (e) { __cores = []; }
                        __sw = (__cores || []).map(function (c) { return '<button type="button" class="cor-swatch-loja" data-hex="' + c + '" title="' + c + '" style="width:26px;height:26px;border-radius:50%;border:2px solid #ccc;background:' + c + ';cursor:pointer;padding:0;"></button>'; }).join('');
                    } else {
                        __sw = '<label class="cor-swatch-loja" style="width:26px;height:26px;border-radius:50%;border:2px solid #ccc;overflow:hidden;display:inline-block;cursor:pointer;position:relative;background:conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red);"><input type="color" class="cor-livre-loja" style="opacity:0;width:100%;height:100%;cursor:pointer;border:0;padding:0;"></label>';
                    }
                    corLojaHtml = '<div class="cor-picker-loja" data-target="' + __tid + '" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px;">' +
                        '<span style="font-size:13px;color:#555;">Cor da fonte:</span>' + __sw +
                        '<input type="hidden" name="properties[Cor - ' + (input.titulo || '') + ']" id="corhid_' + __tid + '" value="">' +
                        '</div>';
                }
            } catch (e) { corLojaHtml = ''; }
        // valida de delimiter.aplicarMockup existe
        if (typeof delimiter.aplicarMockup === 'undefined') {
            delimiter.aplicarMockup = 1;
        }
        const exclusiveProducts = [285630547, 297508709, 285630641, 285630915, 299251585];
        let containerWidth = "100";
        if (exclusiveProducts.includes(LS.product.id)) {
            if (input.name.includes("ano")) {
                containerWidth = "28";
            } else if (input.name.includes("filho")) {
                containerWidth = "68";
            }
        }
        if (input.max <= 0) {
            input.max = 999999;
        }
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || 999999;
        inputLabels[input.name] = input.titulo;
        let fontesSelect = '';
        if (input.iconSize == 'fontes') {
            inputLabels[`${input.name}Fonte`] = `${input.titulo} - Fonte`;
            fontesSelect = `
                <label for="">Selecione a Fonte</label>
                <select class="form-control font-select" data-target="${delimiter.placeholder}" name="properties[${input.name}Fonte]">
                    <option value="">Selecione</option>
                </select>
            `;
        }
        return `
        <div
            class="campo-container container-for-${input.name} numero-${input.posicao} isMockupInput"
            data-vinculado=""
            data-campovinculado="monta_${input.tipo}_${input.posicao}"
            data-obrigatorio="${obrigatorio}"
            data-campogeral="${input.tipo}${input.posicao}"
            style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: ${containerWidth}%!important;">
                <label class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label> 
                <input
                    ${(obrigatorio) ? 'required' : ''}
                    onInput="${delimiter.aplicarMockup == 1 ? 'addText(this)' : ''}" 
                    onFocus="${delimiter.aplicarMockup == 1 ? 'clearText(this)' : ''}" 
                    id="${delimiter.placeholder}"${pzDadosDoDelimiter(delimiter)} 
                    data-delimiter="${delimiter.delimitador}" 
                    class="form-control variant-select "
                    maxlength="${max}"
                    type="text"
                    name="properties[${input.name}]"
                    placeholder="${input.texto}"
                    style="height: 40px; padding: 0 10px;box-sizing: border-box;font-size: var(--input-font-size, inherit);">
                    ${fontesSelect}
               ${corLojaHtml}
        </div>
        `;
    },
    'cor': () => { return ``; },
    'data': (input, delimiter) => {
        // valida de delimiter.aplicarMockup existe
        if (typeof delimiter.aplicarMockup === 'undefined') {
            delimiter.aplicarMockup = 1;
        }
        if (input.max <= 0) {
            input.max = 999999;
        }
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || 999999;
        inputLabels[input.name] = input.titulo;
        return `
        <div class="campo-container container-for-${input.name} numero-${input.posicao} isMockupInput"
            data-vinculado=""
            data-campovinculado="monta_${input.tipo}_${input.posicao}"
            data-obrigatorio="${obrigatorio}"
            data-campogeral="${input.tipo}${input.posicao}"
            style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
                <label class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label> 
                <input
                    ${(obrigatorio) ? 'required' : ''}
                    onInput="${delimiter.aplicarMockup == 1 ? 'addText(this)' : ''}" 
                    onFocus="${delimiter.aplicarMockup == 1 ? 'clearText(this)' : ''}" 
                    id="${delimiter.placeholder}"${pzDadosDoDelimiter(delimiter)} 
                    data-delimiter="${delimiter.delimitador}" 
                    class="form-control variant-select "
                    maxlength="${max}"
                    type="${input.typeInput}"
                    name="properties[${input.name}]"
                    placeholder="${input.texto}"
                    style="height: 40px; padding: 0 10px;box-sizing: border-box;font-size: var(--input-font-size, inherit);">
        </div>
        `;
    },
    'arquivo': (input, delimiter) => {
        // valida de delimiter.aplicarMockup existe
        if (typeof delimiter.aplicarMockup === 'undefined') {
            delimiter.aplicarMockup = 1;
        }
        if (input.max <= 0) {
            input.max = 1;
        }
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || 1;
        inputLabels[input.name] = input.titulo;
        if (input.iconSize == '1') {
            return `
        <div
            class="campo-container container-for-${input.name} numero-${input.posicao} isMockupInput"
            data-campovinculado="monta_${input.tipo}_${input.posicao}"
            data-campogeral="${input.tipo}${input.posicao}"
            data-vinculado=""
            data-obrigatorio="${obrigatorio}"
            style="width: 100%;flex-direction:column;display: inline-flex;" 
            id="${input.tipo}_${input.posicao}_div">

            <input 
                type="hidden" 
                id="monta_${input.tipo}_${input.posicao}" 
                name="properties[${input.name}]" 
                style="width: 100%; background: transparent; border: 1px solid #000; height: 40px; border-radius: 5px; padding: 0 10px;">
    
            <label class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
            <div
                id="${delimiter.placeholder}"${pzDadosDoDelimiter(delimiter)} 
                data-delimiter="${delimiter.aplicarMockup == 1 ? delimiter.delimitador : ''}" 
                name="properties[${input.name}]"
                data-vinculado=""
                data-max="${max}"
                data-campovinculado="monta_${input.tipo}_${input.posicao}"
                class="dropzone dz-clickable">
                    <div class="dz-default dz-message">
                        <button class="dz-button btn-cust" type="button">${input.texto}</button>
                    </div>
            </div>
        </div>
        `;
        } else {
            return `
        <div
            class="campo-container container-for-${input.name} numero-${input.posicao}"
            data-campovinculado="monta_${input.tipo}_${input.posicao}"
            data-campogeral="${input.tipo}${input.posicao}"
            data-vinculado=""
            data-obrigatorio="${obrigatorio}"
            style="width: 100%;flex-direction:column;display: inline-flex;" 
            id="${input.tipo}_${input.posicao}_div">

            <input 
                type="hidden" 
                id="monta_${input.tipo}_${input.posicao}" 
                name="properties[${input.name}]" 
                style="width: 100%; background: transparent; border: 1px solid #000; height: 40px; border-radius: 5px; padding: 0 10px;">

            <div
                id="${delimiter.placeholder}"${pzDadosDoDelimiter(delimiter)} 
                data-delimiter="${delimiter.aplicarMockup == 1 ? delimiter.delimitador : ''}" 
                name="properties[${input.name}]"
                data-vinculado=""
                data-max="${max}"
                data-campovinculado="monta_${input.tipo}_${input.posicao}" 
                class="w-100 upload-dz dropzone dz-clickable">
                <div class="d-flex flex-column align-items-center justify-content-center dz-default dz-message">
                    <div class="upload-icon mb-1"></div>
                    <p class="text-center m-0">
                        <label class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
                    </p>
                    <p style="font-weight: 100;" class="text-center m-0">
                        <span id="">
                            ${input.texto}
                        </span> 
                        (Limite de ${max} arquivos)
                    </p>
                </div>
            </div>
        </div>
        `;
        }
    },
    'checkbox': (input, delimiter) => {
        // valida de delimiter.aplicarMockup existe
        if (typeof delimiter.aplicarMockup === 'undefined') {
            delimiter.aplicarMockup = 1;
        }
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        inputLabels[input.name] = input.titulo;
        let options = '';
        input.optionsCampo.forEach((op, index) => {
            // cria um id unico para cada checkbox
            let checkboxId = `monta_${input.tipo}_${Date.now()}_${index}`;
            options += `
            <div style="margin-bottom: 5px;" class="form-check p-0">
                <input
                    ${(obrigatorio) ? 'required' : ''} 
                    onClick="${delimiter.aplicarMockup == 1 ? 'addText(this)' : ''}" 
                    data-delimiter="${delimiter.delimitador}" 
                    id="${checkboxId}"
                    value="${op.optionName}"
                    name="properties[${input.name}]"
                    type="checkbox"
                    class="form-check-input"
                    style="">
                <label
                    for="${checkboxId}"
                    data-v="${op.optionName}"
                    class="form-check-label"
                    style="">${op.optionName}</label>
            </div>
            `;
            const start = Date.now();
            while (Date.now() === start) { }
        });
        return `
        <div class="campo-container container-for-${input.name} numero-${input.posicao} isMockupInput"
            style="margin-left: 0;display:flex!important;flex-direction:column;align-items:flex-start;gap:10px;margin-bottom:0;">
            
            <div id="listCheckBoxs_${input.posicao}"
                data-vinculado=""
                data-obrigatorio="${obrigatorio}"
                data-campovinculado="monta_${input.tipo}_${input.posicao}"
                class=""
                style="margin-bottom:35px;flex-direction:column;">
            
                <label class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
            
                <div style="margin-top:10px;">
                    ${options}
                </div>
            </div>
        </div>
        `;
    },
    'radio': (input, delimiter) => {
        // valida de delimiter.aplicarMockup existe
        if (typeof delimiter.aplicarMockup === 'undefined') {
            delimiter.aplicarMockup = 1;
        }
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        inputLabels[input.name] = input.titulo;
        let options = '';
        input.optionsCampo.forEach((op, index) => {
            let radioId = `monta_${input.tipo}_${Date.now()}_${index}`;
            options += `
            <div style="margin-bottom: 5px;" class="form-check p-0">
                <input
                    ${(obrigatorio) ? 'required' : ''} 
                    onClick="${delimiter.aplicarMockup == 1 ? 'addText(this)' : ''}" 
                    data-delimiter="${delimiter.delimitador}" 
                    id="${radioId}" 
                    type="radio" 
                    name="properties[${input.name}]" 
                    value="${op.optionName}" 
                    class="form-check-input radio"
                    style="">
                <label 
                    for="${radioId}" 
                    data-v="${op.optionName}"
                    class="form-check-label" 
                    style="">${op.optionName}</label> 
            </div>
            `;
            const start = Date.now();
            while (Date.now() === start) { }
        });
        return `
        <div class="campo-container container-for-${input.name} numero-${input.posicao} isMockupInput"
            style="margin-left: 0;display:flex!important;flex-direction:column;align-items:flex-start;gap:10px;margin-bottom:0;">
            
            <div id="listRadios_${input.posicao}"
                data-vinculado=""
                data-obrigatorio="${obrigatorio}"
                data-campovinculado="monta_${input.tipo}_${input.posicao}"
                class=""
                style="margin-bottom:35px;flex-direction:column;">
            
                <label class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
            
                <div style="margin-top:10px;">
                    ${options}
                </div>
            </div>
        </div>
        `;
    },
    'select': (input, delimiter) => {
        // valida de delimiter.aplicarMockup existe
        if (typeof delimiter.aplicarMockup === 'undefined') {
            delimiter.aplicarMockup = 1;
        }
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        inputLabels[input.name] = input.titulo;
        let options = '';
        input.optionsCampo.forEach(op => {
            options += `
                <option value="${op.optionName}">${op.optionName}</option>
            `;
        });
        return `
        <div
            class="campo-container container-for-${input.name} numero-${input.posicao} isMockupInput"
            data-vinculado=""
            data-campogeral="${input.tipo}${input.posicao}"
            data-obrigatorio="${obrigatorio}"
            data-campovinculado="monta_${input.tipo}_${input.posicao}"
            style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
        
                <label class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
                <select
                    ${(obrigatorio) ? 'required' : ''}
                    id="${delimiter.placeholder}"${pzDadosDoDelimiter(delimiter)} 
                    onClick="${delimiter.aplicarMockup == 1 ? 'addText(this)' : ''}" 
                    data-delimiter="${delimiter.delimitador}" 
                    class="form-control" 
                    name="properties[${input.name}]" 
                    style="height: 40px; padding: 0 10px;box-sizing: border-box;font-size: var(--input-font-size, inherit);">
                        ${options}
                </select>
        </div>
        `;
    },
    'selecao': (input, delimiter) => { 
        // valida de delimiter.aplicarMockup existe
        if (typeof delimiter.aplicarMockup === 'undefined') {
            delimiter.aplicarMockup = 1;
        }
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        inputLabels[input.name] = input.titulo;
        let options = '';
        if (input.anexos == false || input.anexos.length == 0) {
            return "";
        }
        input.anexos.forEach((op, index) => {
            let radioId = `monta_${input.tipo}_${Date.now()}_${index}`;
            // if op.link is not change the click event of the image to redirect to the link
            if (op.link) {
                options += `
                <div class="item" style="padding:0px; margin:0;">
                    <div data-id="${op.id_temp}" class="galleryLabel select-images-container" style="">
                        <a href="${op.link}" target="_blank" style="display:block; width:100%; height:100%;">
                            <label style="overflow: hidden;" for="${radioId}" class="select-images ${input.iconSize || 'normal'}">
                                <img style="object-fit:cover; width:100%; height:100%;"
                                    onClick="${delimiter.aplicarMockup == 1 ? 'addImageFromUrlCanvas(this)' : ''}"
                                    data-delimiter="${delimiter.delimitador}"
                                    data-placeholder="${delimiter.placeholder}" 
                                    data-image="${op.img_temp}"
                                    src="${op.img_temp}" 
                                    alt="${pzNome(op.nome)}"/>
                                <span>${pzNome(op.nome)}</span>
                            </label>
                        </a>
                    </div>
                </div>
                `;
            } else {
                options += `
                <div class="item" style="padding:0px; margin:0;">
                    <div data-id="${op.id_temp}" class="galleryLabel select-images-container" style="">
                        <input
                            style="display:none;" 
                            name="properties[${input.name}]"
                            value="${pzNome(op.nome)}-${op.id_temp}"
                            id="${radioId}" 
                            type="radio"/>
                        <label style="overflow: hidden;" for="${radioId}" class="select-images ${input.iconSize || 'normal'}">
                            <img style="object-fit:cover; width:100%; height:100%;"
                                onClick="${delimiter.aplicarMockup == 1 ? 'addImageFromUrlCanvas(this)' : ''}"
                                data-delimiter="${delimiter.delimitador}"
                                data-placeholder="${delimiter.placeholder}" 
                                data-image="${op.img_temp}"
                                src="${op.img_temp}" 
                                alt="${pzNome(op.nome)}"/>
                            <span>${pzNome(op.nome)}</span>
                        </label>
                    </div>
                </div>
                `;
            }
        });
        return `
        <div
            class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo} isMockupInput"
            data-vinculado=""
            data-campovinculado="monta_${input.tipo}_${input.unic}"
            style="max-width:350px; overflow-x:hidden;">

            <div
                id="listImg_${input.unic}"
                data-vinculado=""
                data-obrigatorio="${obrigatorio}"
                data-campovinculado="monta_${input.tipo}_${input.unic}"
                data-campogeral="${input.tipo}${input.unic}"
                class=""
                style="margin-bottom:35px;">
                
                <label class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
                    
                <div
                    id="monta_${input.tipo}_check_${input.unic}"
                    data-vinculado=""
                    style="">
                    <div class="owl-carousel owl-carousel-${input.iconSize} owl-theme">
                        ${options}
                    </div>
                </div>
            </div>
        </div>
        `;
    },
    'staticText': () => { return ''; },
    'staticImage': () => { return ''; },
}

function renderCustomControl(icon, bgColor, iconColor) {
    return function (ctx, left, top, styleOverride, fabricObject) {
        const size = this.cornerSize;
        const halfSize = size / 2;
        ctx.save();
        ctx.translate(left, top);
        if (this.angle) {
            ctx.rotate(fabric.util.degreesToRadians(this.angle));
        } else {
            ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
        }
        ctx.fillStyle = bgColor;
        ctx.fillRect(-halfSize, -halfSize, size, size);
        ctx.fillStyle = iconColor;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 1);
        ctx.restore();
    };
}
// A reusable function to add custom controls to an object
function applyCustomControlsAndVisibility(obj) {
    // Define the custom controls only once
    const deleteControl = new fabric.Control({
        x: -0.5,
        y: -0.5,
        offsetX: -1,
        offsetY: -1,
        cursorStyle: 'pointer',
        mouseUpHandler: function (_, transform) {
            const target = transform.target;
            target.canvas.remove(target);
            target.canvas.requestRenderAll();
        },
        render: renderCustomControl("✖", "#f8d7da", "#721c24"),
        cornerSize: 18
    });

    const rotateControl = new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetX: 1,
        offsetY: -1,
        actionHandler: fabric.controlsUtils.rotationWithSnapping,
        cursorStyleHandler: fabric.controlsUtils.rotationStyleHandler,
        withConnection: false,
        actionName: 'rotate',
        render: renderCustomControl("⟳", "#d6d8db", "#495057"),
        cornerSize: 18
    });

    // Apply the custom controls
    obj.controls.deleteControl = deleteControl;
    obj.controls.mtr = rotateControl;

    // Set the base visibility for all objects
    obj.setControlsVisibility({
        tl: false,
        tr: false
    });
}

function attachCanvasEvents(canvas) {
    // Listen for typing & pasting
    canvas.on('text:changed', function (e) {
        const obj = e.target;
        const parent = canvas.getObjects().find(o => o.delimiterId === obj.belongsTo);
        if (!parent) return;

        if (obj.type === 'textbox' && obj.fieldId) {
            const inputElement = document.getElementById(obj.fieldId);
            if (inputElement) {
                enforceMaxLength(obj, inputElement);
            }
            obj.set({ splitByGrapheme: true });
            //const tmp = new fabric.Textbox(obj.text, { fontSize: obj.fontSize, splitByGrapheme: false });
            //obj.set({ width: (tmp.width) });
            //tmp.dispose();
        }
        canvas.renderAll();
    });

    // When editing starts, bind paste prevention
    canvas.on('text:editing:entered', function (e) {
        const obj = e.target;
        if (obj.type === 'textbox' && obj.fieldId) {
            const inputElement = document.getElementById(obj.fieldId);

            if (inputElement) {
                obj.hiddenTextarea.addEventListener("paste", function (evt) {
                    const paste = (evt.clipboardData || window.clipboardData).getData("text");
                    const maxLength = inputElement.maxLength;

                    if (maxLength > 0) {
                        const currentText = obj.text || "";
                        const selectionStart = obj.selectionStart || 0;
                        const selectionEnd = obj.selectionEnd || 0;

                        // what text would look like after paste
                        const newText =
                            currentText.substring(0, selectionStart) +
                            paste +
                            currentText.substring(selectionEnd);

                        if (newText.length > maxLength) {
                            evt.preventDefault(); // ❌ block the paste
                        }
                    }
                });
            }
            /*const tmp = new fabric.Textbox(obj.text, { fontSize: obj.fontSize });
            obj.set({ width: tmp.width });
            tmp.dispose();*/
        }
    });

    canvas.on('selection:created', filterSelection);
    canvas.on('selection:updated', filterSelection);

    canvas.on('object:moving', (e) => {
        toggleDelimiterVisibility(true);
        constrainInsideDelimiter(e);
    });
    canvas.on('object:scaling', (e) => {
        toggleDelimiterVisibility(true);
        constrainInsideDelimiter(e);
    });
    canvas.on('object:rotating', (e) => {
        toggleDelimiterVisibility(true);
        constrainInsideDelimiter(e);
    });

    // Use 'object:modified' to hide the delimiter when the action is finished
    canvas.on('object:modified', () => {
        toggleDelimiterVisibility(false);
    });

    canvas.on('mouse:down', function (e) {
        if (!e.target) {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        }
    });

    // -----------------------------
    // Panning (always enabled)
    // -----------------------------
    canvas.on("mouse:down", function (opt) {
        const evt = opt.e;
        console.log("mouse down", opt);
        if (isDraggingActive) {
            isDragging = true;
            this.selection = false;
            const pointer = getPointer(evt);
            lastPosX = pointer.clientX;
            lastPosY = pointer.clientY;
            this.defaultCursor = "grabbing";
            evt.preventDefault();
            evt.stopPropagation();
        }
    });
    canvas.on("mouse:move", function (opt) {
        if (isDragging && isDraggingActive) {
            const e = opt.e;
            const pointer = getPointer(e);
            const vpt = this.viewportTransform;

            vpt[4] += pointer.clientX - lastPosX;
            vpt[5] += pointer.clientY - lastPosY;

            this.setViewportTransform(vpt);
            this.requestRenderAll();

            lastPosX = pointer.clientX;
            lastPosY = pointer.clientY;
        }
    });
    canvas.on("mouse:up", function (opt) {
        if (isDragging) {
            isDragging = false;
            this.selection = true;
            this.defaultCursor = "default";
            this.setViewportTransform(this.viewportTransform);
            opt.e.preventDefault();
            opt.e.stopPropagation();
            this.renderAll();
        }
    });
    //canvas.wrapperEl.style.touchAction = 'none';
}

function filterSelection() {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 1) {
        const movableObjects = activeObjects.filter(obj => !obj.lockMovementX && !obj.lockMovementY);
        const immovableObjects = activeObjects.filter(obj => obj.lockMovementX || obj.lockMovementY);
        if (immovableObjects.length > 0) {
            canvas.discardActiveObject();
            if (movableObjects.length > 0) {
                const newSelection = new fabric.ActiveSelection(movableObjects, { canvas: canvas });
                canvas.setActiveObject(newSelection);
            }
            canvas.requestRenderAll();
        }
    }
}
function getPointer(evt) {
    const point = evt.touches ? evt.touches : evt;
    return {
        clientX: point[0] ? point[0].clientX : point.clientX,
        clientY: point[0] ? point[0].clientY : point.clientY,
    };
}
function activateDragging(e) {
    console.log($(e));
    if (!isDraggingActive) {
        isDraggingActive = true;
        $(e).addClass("active");
        canvas.defaultCursor = "grabbing";
    } else {
        isDraggingActive = false;
        $(e).removeClass("active");
        canvas.defaultCursor = "default";
    }
}
function enforceMaxLength(obj, inputElement) {
    const maxLength = inputElement.maxLength;
    if (maxLength > 0 && obj.text.length > maxLength) {
        obj.text = obj.text.substring(0, maxLength);
        obj.exitEditing();
        obj.enterEditing();
    }
    inputElement.value = obj.text;
}
function setActiveDelimiter(id) {
    const obj = canvas.getObjects().find(o => o.delimiterId === id);;
    if (obj) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
    }
}
function lockDelimiters() {
    canvas.getObjects().forEach(obj => {
        if (obj.delimiterId) {
            // make delimiter itself not movable/rotatable
            obj.selectable = false;
            obj.evented = false;
            obj.lockMovementX = true;
            obj.lockMovementY = true;
            obj.lockRotation = true;
            obj.lockScalingX = true;
            obj.lockScalingY = true;
        }
    });
    canvas.renderAll();
}
function applyRulesToChildren() {
    canvas.getObjects().forEach(child => {
        if (child.belongsTo) {
            // Apply all the properties you need
            const locked = child.locked;
            child.lockMovementX = child.lockMovementY = locked;

            const allowResize = child.allowResize;
            child.lockScalingX = child.lockScalingY = !allowResize;

            const allowRotation = child.allowRotation;
            child.lockRotation = !allowRotation;

            // Set visibility based on the individual object's properties
            child.setControlsVisibility({
                bl: allowResize, // bottom-left
                br: allowResize, // bottom-right
                tl: allowResize, // top-left
                tr: false, // top-right
                mtr: allowRotation, // middle-top rotator
                // Hide other controls by default
                deleteControl: false,
                mt: false,
                mr: allowResize,
                mb: false,
                ml: allowResize,
            });

            // Make it completely unselectable if all controls are disabled
            if (!allowResize && !allowRotation && locked) {
                child.set({
                    selectable: false,
                    hasControls: false,
                });
            }
            child.setCoords();
        }
    });
    canvas.renderAll();
}
// PZ: forma da area de personalizacao.
//
// O lojista escolhe no painel se a area do campo e quadrada ou redonda
// (delimitador.pzForma). Antes o clipe era sempre fabric.Rect, entao pingente
// e medalha redondos cortavam a foto em quadrado.
//
// Usa Ellipse e nao Circle porque a area desenhada no painel pode nao ser
// quadrada — assim o recorte acompanha a proporcao que o lojista marcou.
// PZ: forma configurada para UM campo especifico.
//
// O lojista marca "area redonda" no proprio elemento de imagem; isso fica
// gravado no objeto daquele campo no mockup salvo (pzForma). Aqui a loja le de
// volta pelo fieldId, sem precisar de coluna nova no banco.
// PZ: configuracao de arco de um campo de texto.
// Fica gravada no objeto do campo no mockup salvo (pzArco / pzArcoRaio /
// pzArcoEmbaixo / pzArcoGiro), entao a loja le pelo fieldId sem coluna nova.
function pzArcoDoCampo(fieldId) {
    if (!fieldId || typeof canvas === 'undefined' || !canvas) return null;
    try {
        var o = canvas.getObjects().find(function (x) { return x.fieldId === fieldId && x.pzArco; });
        if (!o) return null;
        return {
            raio: Number(o.pzArcoRaio) || 0,
            embaixo: !!o.pzArcoEmbaixo,
            giro: Number(o.pzArcoGiro) || 0,
            // tipografia do proprio campo: sem isso a loja desenhava sempre
            // Arial bold 20 preto e nao batia com a previa do painel
            fontSize: o.fontSize || 20,
            fontFamily: o.fontFamily || 'Arial',
            fontWeight: o.fontWeight || 'normal',
            fill: o.fill || '#1a1a1a',
            espacoLetras: Number(o.pzEspacoLetras) || Number(o.charSpacing) || 0,
            // o lojista pode girar o texto curvo; o angulo viaja numa propriedade
            // propria (pzArcoAngulo) e nao no angle do textbox — assim um mockup
            // antigo, que nao tem essa propriedade, continua desenhando igualzinho
            angulo: Number(o.pzArcoAngulo) || 0
        };
    } catch (e) { return null; }
}

// PZ: desenha os campos em arco assim que o mockup carrega.
//
// Com o arco ligado, o painel salva o texto reto do campo ESCONDIDO (quem
// aparece e o arco, que e redesenhado e nao vai no JSON). Na loja ninguem
// redesenhava no carregamento: o texto estava invisivel e o arco so nascia
// quando o cliente digitava — o "Texto preview" nunca aparecia.
// Roda de novo um pouco depois porque os campos do modal podem ainda nao
// existir no primeiro instante; o addText troca o arco anterior, nao duplica.
function pzArcosIniciais() {
    var roda = function () {
        try {
            if (typeof canvas === 'undefined' || !canvas || typeof window.addText !== 'function') return;
            canvas.getObjects().filter(function (o) {
                return o.type === 'textbox' && o.pzArco && Number(o.pzArcoRaio) > 0 && o.fieldId;
            }).forEach(function (o) {
                var input = document.getElementById(o.fieldId);
                if (input && input.dataset && input.dataset.delimiter) window.addText(input);
            });
        } catch (e) { console.log('PZ arcos iniciais:', e); }
    };
    roda();
    setTimeout(roda, 400);
}

// PZ: ponto onde o arco se ancora = centro da PRIMEIRA linha do texto reto.
//
// O campo e um Textbox de largura fixa (100px) com quebra por letra: texto
// longo vira varias linhas e a caixa cresce pra baixo (origem no topo). Usar o
// centro da caixa inteira fazia a ancora descer junto — o arco saia do lugar
// conforme a quantidade de caracteres. O centro da primeira linha nao muda com
// o tamanho do texto; com uma linha so e exatamente o mesmo ponto de antes.
function pzAncoraArco(o) {
    try {
        var c = o.getCenterPoint();
        var sy = o.scaleY || 1;
        var hLinha = (typeof o.getHeightOfLine === 'function' && o._textLines && o._textLines.length)
            ? o.getHeightOfLine(0)
            : (o.fontSize || 20) * (o.lineHeight || 1.16);
        var hTotal = o.height || hLinha;
        return { x: c.x, y: c.y - (hTotal * sy) / 2 + (Math.min(hLinha, hTotal) * sy) / 2 };
    } catch (e) {
        var b = o.getBoundingRect(true, true);
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
}

// PZ: texto em arco (gravacao de anel/alianca).
//
// Nao usa o `path` do fabric: a semantica de posicionamento dele e imprevisivel
// (o texto ignora o left/top do path e desenha na origem do objeto). Aqui cada
// letra e posicionada na circunferencia por trigonometria, o que e deterministico.
//
// opcoes:
//   cx, cy    centro do circulo
//   raio      raio da linha de base do texto
//   fontSize, fontFamily, fill, fontWeight
//   embaixo   true = texto na base do anel (gravacao interna), letras com o topo
//             apontando pro centro. false = no topo, letras pra fora.
//   giro      desloca o texto ao longo do arco, em graus
function pzTextoEmArco(texto, opcoes) {
    pzTextoEmArco.versao = "arco-2026-09-19a";
    var o = opcoes || {};
    var cx = o.cx || 0, cy = o.cy || 0, raio = o.raio || 100;

    // PZ: `ancoraY` e onde o TEXTO deve ficar; o centro do circulo e deduzido
    // dele. Sem isso o raio empurrava o texto pra longe (raio 665 jogava a
    // gravacao 665px abaixo do centro, fora do produto) — o lojista aumentava
    // o raio pra curvar menos e o texto desaparecia. Agora o raio so curva.
    if (typeof o.ancoraY === 'number') {
        cy = o.embaixo ? (o.ancoraY - raio) : (o.ancoraY + raio);
    }
    var fontSize = o.fontSize || 20;
    var fontFamily = o.fontFamily || 'Arial';
    var fill = o.fill || '#000';
    var fontWeight = o.fontWeight || 'normal';
    var embaixo = !!o.embaixo;

    // PZ: deslocamento ao longo do arco.
    //
    // Em graus nao servia: o mesmo valor deslocava mais quanto maior o raio
    // (com raio 705, 19 graus jogavam o texto 233px pro lado, fora da area).
    // Em pixels ainda saia nos extremos, porque 100%% da meia-largura poe o
    // CENTRO do texto na borda e metade dele fica pra fora.
    //
    // Agora `giroPct` (-100..100) e limitado pelo espaco que sobra de verdade:
    // (largura da area - largura do texto) / 2. Em 100%% o texto encosta na
    // borda sem passar. O calculo fica aqui porque so o helper sabe a largura
    // do texto depois de medir as letras.
    var giro = 0;   // definido depois da medicao

    texto = String(texto == null ? '' : texto);
    if (texto === '') return null;

    var chars = Array.from(texto);

    // Mede as letras com o contexto 2D, sem criar um fabric.Text por letra.
    // O jeito antigo instanciava um objeto por caractere a cada digitacao
    // (pesado) e cada um disparava no console o aviso do fabric 5.3
    // "'alphabetical' is not a valid enum value of type CanvasTextBaseline" —
    // eram 138 linhas de aviso por render.
    var larguras;
    try {
        var med = (pzTextoEmArco._ctx = pzTextoEmArco._ctx || document.createElement('canvas').getContext('2d'));
        med.font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;
        // charSpacing do fabric e em milesimos do tamanho da fonte
        var extra = ((Number(o.espacoLetras) || 0) / 1000) * fontSize;
        larguras = chars.map(function (ch) {
            return med.measureText(ch === ' ' ? ' ' : ch).width + extra;
        });
    } catch (e) {
        larguras = chars.map(function (ch) {
            return new fabric.Text(ch === ' ' ? ' ' : ch, {
                fontSize: fontSize, fontFamily: fontFamily, fontWeight: fontWeight
            }).width;
        });
    }
    var total = larguras.reduce(function (a, b) { return a + b; }, 0);

    // PZ: curvatura em %% em vez de raio em pixels.
    //
    // Raio em pixels e um controle ruim aqui: o quanto o texto curva depende do
    // comprimento dele, entao o intervalo util mudava a cada nome digitado —
    // 90 curvava muito num nome curto e quase nada num longo.
    //
    // `curvaPct` diz quanto do circulo o texto ocupa: 100%% = meia volta (180
    // graus), que e o maximo que ainda se le. O raio sai da conta.
    if (typeof o.curvaPct === 'number') {
        var pct = Math.max(0, Math.min(100, o.curvaPct));
        if (pct < 0.5) {
            raio = 1e6;                     // praticamente reto
        } else {
            // PZ: a referencia e a LARGURA DA AREA marcada, nao a do texto.
            // Com a largura do texto, a mesma curvatura dava um circulo
            // fechado num nome curto ("ANDREY" enrolava) e um arco aberto num
            // longo. Agora o raio e fixo pra aquela area: todo texto segue a
            // mesma curva (a do anel) e so ocupa mais ou menos dela. Um texto
            // da largura da area continua saindo igualzinho ao de antes.
            var refCurva = (Number(o.larguraArea) > 0) ? Number(o.larguraArea) : total;
            raio = refCurva / ((pct / 100) * Math.PI);
        }
        // reancora com o raio novo
        if (typeof o.ancoraY === 'number') {
            cy = o.embaixo ? (o.ancoraY - raio) : (o.ancoraY + raio);
        }
    }

    // angulo que o texto inteiro ocupa
    var anguloTotal = total / raio;

    if (typeof o.giroPct === 'number' && o.larguraArea) {
        // limite horizontal: o texto encosta na borda sem passar
        var sobra = Math.max(0, (o.larguraArea - total) / 2);
        var giroMax = sobra / raio;

        // limite vertical: deslocar num arco fechado tambem desce o texto.
        // A queda e raio*(1-cos t); com raio pequeno ela estoura a area antes
        // do limite horizontal, e o texto saia por baixo. Resolve pra t.
        if (o.alturaArea) {
            var folga = (o.alturaArea / 2) - (fontSize / 2);
            if (folga > 0) {
                var cosMin = 1 - (folga / raio);
                if (cosMin > -1 && cosMin < 1) {
                    giroMax = Math.min(giroMax, Math.acos(cosMin));
                }
            } else {
                giroMax = 0;
            }
        }

        giro = (o.giroPct / 100) * giroMax;
    } else if (typeof o.giroPx === 'number') {
        giro = o.giroPx / raio;
    } else {
        giro = (o.giro || 0) * Math.PI / 180;
    }

    // comeca metade pra tras do centro do arco
    var a = -anguloTotal / 2 + giro;

    var letras = chars.map(function (ch, i) {
        var meia = larguras[i] / 2 / raio;
        a += meia;

        var x, y, rot;
        if (embaixo) {
            // base do circulo, lendo da esquerda pra direita, letras com o topo
            // voltado pro centro do anel (e assim que se le uma gravacao interna).
            //
            // Derivacao: em a=0 a letra fica em (cx, cy+raio) = base. A direcao
            // radial e (sin a, cos a); pro topo da letra apontar pro centro a
            // rotacao tem que ser -a. Usar `cx - raio*sin(a)` como eu fiz antes
            // inverte o sentido e o texto sai espelhado.
            x = cx + raio * Math.sin(a);
            y = cy + raio * Math.cos(a);
            rot = -a * 180 / Math.PI;
        } else {
            // topo do circulo; letras em pe, lendo da esquerda pra direita
            x = cx + raio * Math.sin(a);
            y = cy - raio * Math.cos(a);
            rot = a * 180 / Math.PI;
        }

        a += meia;

        return new fabric.Text(ch, {
            left: x, top: y, angle: rot,
            fontSize: fontSize, fontFamily: fontFamily, fill: fill, fontWeight: fontWeight,
            originX: 'center', originY: 'center',
            selectable: false, evented: false, objectCaching: false
        });
    });

    var grupo = new fabric.Group(letras, {
        pzArco: true,
        objectCaching: false
    });

    // PZ: ultima rede de seguranca do deslocamento.
    //
    // O limite calculado acima cuida da linha de base, mas num arco fechado as
    // letras tambem GIRAM muito e a caixa delas estoura a area antes disso. Em
    // vez de mais trigonometria, mede o resultado e, se passou, reduz o
    // deslocamento na proporcao do excesso e redesenha. No maximo 2 tentativas.
    // PZ: a rede de seguranca do deslocamento se chama de volta com um giro menor.
    // Cada nivel abria 2 novas chamadas e o giro so encolhia (nunca zerava), entao
    // numa area pequena com fonte grande a recursao nao convergia e estourava a
    // pilha — o arco simplesmente nao aparecia. Maximo 2 niveis.
    if (o.larguraArea && o.alturaArea && typeof o.giroPct === 'number' &&
        o.giroPct !== 0 && (o._nivel || 0) < 2) {
        var lim = {
            x0: cx - o.larguraArea / 2, x1: cx + o.larguraArea / 2,
            y0: (typeof o.ancoraY === 'number' ? o.ancoraY : cy) - o.alturaArea / 2,
            y1: (typeof o.ancoraY === 'number' ? o.ancoraY : cy) + o.alturaArea / 2
        };
        for (var tent = 0; tent < 2; tent++) {
            var bb = grupo.getBoundingRect(true, true);
            var fora = Math.max(
                lim.x0 - bb.left, (bb.left + bb.width) - lim.x1,
                lim.y0 - bb.top,  (bb.top + bb.height) - lim.y1
            );
            if (fora <= 1) break;
            var reduz = Math.max(0.2, 1 - (fora / Math.max(1, o.alturaArea / 2)));
            var opts2 = {};
            for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) opts2[k] = o[k]; }
            opts2.giroPct = o.giroPct * reduz;
            opts2._nivel = (o._nivel || 0) + 1;
            var g2 = pzTextoEmArco(texto, opts2);
            if (!g2) break;
            grupo = g2;
            o = opts2;
        }
    }

    return grupo;
}

// PZ: desenha a arte sobre a foto do produto, no mesmo tamanho.
// Usado pra montar a imagem "com fundo" DEPOIS que a arte ja foi deformada,
// garantindo que o trapezio nao pegue o produto.
function pzSobrepoe(urlFundo, urlArte) {
    return new Promise(function (resolve) {
        var fundo = new Image();
        fundo.onload = function () {
            var arte = new Image();
            arte.onload = function () {
                try {
                    var out = document.createElement('canvas');
                    out.width = fundo.width;
                    out.height = fundo.height;
                    var ctx = out.getContext('2d');
                    ctx.drawImage(fundo, 0, 0);
                    ctx.drawImage(arte, 0, 0, fundo.width, fundo.height);
                    resolve(out.toDataURL('image/png'));
                } catch (e) {
                    resolve(urlFundo);
                }
            };
            arte.onerror = function () { resolve(urlFundo); };
            arte.src = urlArte;
        };
        fundo.onerror = function () { resolve(urlFundo); };
        fundo.src = urlFundo;
    });
}

// PZ: trapezio (perspectiva real) sobre uma imagem ja renderizada.
//
// O fabric nao faz isso: as transformacoes dele sao afins (translada, escala,
// rotaciona, inclina), e nenhuma combinacao produz um trapezio. Aqui a imagem e
// redesenhada em fatias horizontais, cada uma um pouco mais larga que a de cima,
// o que da a impressao de profundidade (caneca, bone, superficie curva).
//
// `percent` e quanto o topo estreita em relacao a base (0 = sem efeito).
function pzTrapezioDataUrl(dataUrl, percent) {
    return new Promise(function (resolve) {
        percent = Math.max(0, Math.min(60, Number(percent) || 0));
        if (percent === 0) { resolve(dataUrl); return; }

        var im = new Image();
        im.onload = function () {
            try {
                var L = im.width, A = im.height;
                var out = document.createElement('canvas');
                out.width = L; out.height = A;
                var ctx = out.getContext('2d');

                var topo = 1 - (percent / 100);
                // 1 fatia por linha: sem emenda visivel
                for (var i = 0; i < A; i++) {
                    var t = i / (A - 1 || 1);
                    var larg = L * (topo + (1 - topo) * t);
                    var x = (L - larg) / 2;
                    // +1 de altura evita risco branco entre as fatias
                    ctx.drawImage(im, 0, i, L, 1, x, i, larg, 1.02);
                }
                resolve(out.toDataURL('image/png'));
            } catch (e) {
                // qualquer problema: devolve a original, sem quebrar o pedido
                resolve(dataUrl);
            }
        };
        im.onerror = function () { resolve(dataUrl); };
        im.src = dataUrl;
    });
}

// Le o trapezio configurado na area de marcacao.
function pzTrapezioDaArea() {
    try {
        var d = canvas.getObjects().find(function (o) { return o.delimiterId && o.pzTrapezio; });
        return d ? Number(d.pzTrapezio) || 0 : 0;
    } catch (e) { return 0; }
}

function pzFormaDoCampo(fieldId) {
    if (!fieldId || typeof canvas === 'undefined' || !canvas) return '';
    try {
        var obj = canvas.getObjects().find(function (o) {
            return o.fieldId === fieldId && o.pzForma;
        });
        return obj ? String(obj.pzForma) : '';
    } catch (e) {
        return '';
    }
}

function pzClipDelimitador(active, abs, formaDoCampo) {
    // formaDoCampo vem do proprio campo (imagem/selecao): o lojista pode deixar
    // redondo so aquele elemento, independente da forma da area geral.
    var forma = formaDoCampo || (active && active.pzForma);
    var redondo = String(forma) === 'redondo';

    // a mascara tem que acompanhar a inclinacao da area, senao a arte inclina
    // mas o recorte continua reto e corta torto
    var inclinacao = (active && active.skewX) || 0;

    if (!redondo) {
        return new fabric.Rect({
            left: abs.left,
            top: abs.top,
            width: abs.width,
            height: abs.height,
            skewX: inclinacao,
            absolutePositioned: true,
            originX: 'left',
            originY: 'top'
        });
    }

    return new fabric.Ellipse({
        left: abs.left + abs.width / 2,
        top: abs.top + abs.height / 2,
        rx: abs.width / 2,
        ry: abs.height / 2,
        skewX: inclinacao,
        absolutePositioned: true,
        originX: 'center',
        originY: 'center'
    });
}

function restyleDelimiters() {
    canvas.getObjects().forEach(obj => {
        if (obj.delimiterId) {
            if (obj.type === 'group') {
                const rect = obj.item(0);
                rect.set({
                    fill: 'transparent',
                    stroke: 'grey',
                    strokeWidth: 1,
                    strokeDashArray: null,
                    visible: false
                });
            }
        }
    });
    canvas.requestRenderAll();
}
// Function to show/hide the delimiter associated with the active object
function toggleDelimiterVisibility(visible) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || !activeObject.belongsTo) {
        return;
    }

    const delimiter = canvas.getObjects().find(o => o.delimiterId === activeObject.belongsTo);
    if (delimiter) {
        if (delimiter.type === 'group') {
            delimiter.item(0).set({ visible: visible });
        }
        canvas.renderAll();
    }
}
function constrainInsideDelimiter(e) {
    const obj = e.target;
    if (!obj.belongsTo) return;

    const parent = canvas.getObjects().find(o => o.delimiterId === obj.belongsTo);
    if (!parent) return;

    const childBounds = obj.getBoundingRect(true, true);
    const parentBounds = parent.getBoundingRect(true, true);

    // --- MOVING ---
    if (e.transform?.action === 'drag') {
        if (childBounds.left < parentBounds.left) {
            obj.left += parentBounds.left - childBounds.left;
        }
        if (childBounds.top < parentBounds.top) {
            obj.top += parentBounds.top - childBounds.top;
        }
        if (childBounds.left + childBounds.width > parentBounds.left + parentBounds.width) {
            obj.left -= (childBounds.left + childBounds.width) - (parentBounds.left + parentBounds.width);
        }
        if (childBounds.top + childBounds.height > parentBounds.top + parentBounds.height) {
            obj.top -= (childBounds.top + childBounds.height) - (parentBounds.top + parentBounds.height);
        }
    }

    // --- SCALING ---
    if (e.transform?.action?.startsWith('scale')) {
        if (obj.type === 'textbox') {
            // Handle Textbox resizing: width is changing instead of scale
            if (childBounds.left < parentBounds.left) {
                const diff = parentBounds.left - childBounds.left;
                obj.width -= diff;
                obj.left = parentBounds.left;
            }
            if (childBounds.left + childBounds.width > parentBounds.left + parentBounds.width) {
                const diff = (childBounds.left + childBounds.width) - (parentBounds.left + parentBounds.width);
                obj.width -= diff;
            }
        } else {
            // Handle normal scale objects (images, rects, etc.)
            if (
                childBounds.left < parentBounds.left ||
                childBounds.top < parentBounds.top ||
                childBounds.left + childBounds.width > parentBounds.left + parentBounds.width ||
                childBounds.top + childBounds.height > parentBounds.top + parentBounds.height
            ) {
                obj.scaleX = e.transform.original.scaleX;
                obj.scaleY = e.transform.original.scaleY;
                obj.left = e.transform.original.left;
                obj.top = e.transform.original.top;
            }
        }
    }

    // --- ROTATING ---
    if (e.transform?.action === 'rotate') {
        if (
            childBounds.left < parentBounds.left ||
            childBounds.top < parentBounds.top ||
            childBounds.left + childBounds.width > parentBounds.left + parentBounds.width ||
            childBounds.top + childBounds.height > parentBounds.top + parentBounds.height
        ) {
            // rollback to original rotation
            obj.angle = e.transform.original.angle;
            obj.left = e.transform.original.left;
            obj.top = e.transform.original.top;
        }
    }

    obj.setCoords();
}

window.addText = function (e) {
    let delimiter = e.dataset.delimiter;
    //setActiveDelimiter(delimiter);
    //let active = canvas.getActiveObject();

    let active = canvas.getObjects().find(o => o.delimiterId === delimiter);

    //const emojiRegex = /\p{Emoji}/gu;
    const emojiRegex = /([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/gu;
    let textValue = e.value.replace(emojiRegex, '');

    if (e.type === "date" && textValue) {
        const date = new Date(textValue);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        textValue = `${day}/${month}/${year}`;
    }

    if (!active || !active.delimiterId) {
        if (active.belongsTo) {
            const parent = canvas.getObjects().find(o => o.delimiterId === active.belongsTo);
            if (parent) {
                canvas.setActiveObject(parent);
                canvas.renderAll();
                active = canvas.getActiveObject();
            }
        } else {
            return;
        }
    }

    // PZ: campo configurado como arco (gravacao de anel/alianca) e redesenhado
    // letra por letra — um Textbox reto nao acompanha a curva do aro.
    const pzArcoCfg = pzArcoDoCampo(e.id);
    if (pzArcoCfg && pzArcoCfg.raio > 0) {
        const areaArco = active.getBoundingRect(true, true);
        const antigo = canvas.getObjects().find(o => o.pzArcoDe === e.id);
        if (antigo) canvas.remove(antigo);

        // PZ: ancora onde o texto do campo esta/estaria, igual ao painel. Sem
        // isso a loja desenhava no centro da area e o painel em outro ponto.
        const retoDoCampo = canvas.getObjects().find(o =>
            o.fieldId === e.id && o.type === 'textbox');
        // so esconde o texto reto DEPOIS de ter o arco em maos: se o desenho
        // falhar, o cliente ficaria sem texto nenhum no produto
        const pzEsconderReto = function () {
            if (retoDoCampo) { retoDoCampo.visible = false; retoDoCampo.dirty = true; }
        };
        const absArco = retoDoCampo ? retoDoCampo.getBoundingRect(true, true) : areaArco;
        const pzPontoArco = retoDoCampo ? pzAncoraArco(retoDoCampo)
            : { x: areaArco.left + areaArco.width / 2, y: areaArco.top + areaArco.height / 2 };

        // PZ: campo ainda vazio mostra o texto de exemplo do lojista ("Texto
        // preview"), igual ao painel. Se o cliente nao preencher, o arco sai
        // na hora de gerar a arte (ver limpeza em saveCanvasAsImages).
        let pzTextoArco = textValue;
        if (!String(pzTextoArco || '').trim() && retoDoCampo && retoDoCampo.text) {
            pzTextoArco = String(retoDoCampo.text);
        }
        const grupo = pzTextoEmArco(pzTextoArco, {
            cx: pzPontoArco.x,
            ancoraY: pzPontoArco.y,
            // mesma conta do painel: o valor salvo e curvatura em %, nao raio
            curvaPct: pzArcoCfg.raio,
            embaixo: pzArcoCfg.embaixo,
            giroPct: pzArcoCfg.giro, larguraArea: areaArco.width, alturaArea: areaArco.height,
            fontSize: pzArcoCfg.fontSize,
            fontFamily: pzArcoCfg.fontFamily,
            fontWeight: pzArcoCfg.fontWeight,
            fill: pzArcoCfg.fill,
            espacoLetras: pzArcoCfg.espacoLetras || 0
        });
        if (!grupo) {
            if (retoDoCampo) { retoDoCampo.visible = true; retoDoCampo.dirty = true; }
            canvas.requestRenderAll();
            return;
        }
        pzEsconderReto();
        if (grupo) {
            grupo.set({
                pzArcoDe: e.id,
                fieldId: e.id,
                belongsTo: active.delimiterId,
                selectable: false,
                evented: false
            });
            if (pzArcoCfg.angulo) {
                // mesmo giro do painel, em torno do centro do arco
                grupo.set({
                    left: grupo.left + (grupo.width * (grupo.scaleX || 1)) / 2,
                    top: grupo.top + (grupo.height * (grupo.scaleY || 1)) / 2,
                    originX: 'center', originY: 'center'
                });
                grupo.set({ angle: pzArcoCfg.angulo });
                grupo.setCoords();
            }
            canvas.add(grupo);
        }
        canvas.requestRenderAll();
        return;
    }

    // ✅ check if textbox already exists for this input
    const existing = canvas.getObjects().find(o =>
        o.type === 'textbox' &&
        o.belongsTo === active.delimiterId &&
        o.fieldId === e.id
    );

    if (existing) {
        existing.text = textValue;
        existing.set({ splitByGrapheme: true });
        //const tmp = new fabric.Textbox(textValue, { fontSize: existing.fontSize, splitByGrapheme: false });
        //existing.set({ width: (tmp.width) });
        //tmp.dispose();
        canvas.requestRenderAll();
        return;
    }

    // Get rect from group
    const rect = active.item(0);

    // Measure natural width
    /*const tmp = new fabric.Textbox(textValue, { 
        fontSize: iniFontSize,
        splitByGrapheme: false
    });
    const textWidth = (tmp.width);
    tmp.dispose();*/

    // Compute rect's absolute position and size
    const abs = active.getBoundingRect(true, true);

    // PZ: o que o lojista configurou vem nos data-attributes do proprio input.
    // Antes era 20px preto fixo: um campo com fonte/tamanho/cor/arco definidos no
    // painel, mas sem texto de preview salvo, aparecia errado na loja.
    const pzCfg = e.dataset || {};
    const pzNum = function (v, padrao) {
        const n = parseFloat(v);
        return isNaN(n) ? padrao : n;
    };
    const pzLigado = function (v) { return v !== undefined && v !== '' && v !== '0' && v !== 'false'; };
    const pzIrmao = canvas.getObjects().find(o =>
        (o.type === 'textbox' || o.type === 'text') && o.belongsTo === active.delimiterId);

    const textbox = new fabric.Textbox(textValue, {
        left: abs.left,
        top: abs.top,
        width: 100,
        fontSize: pzNum(pzCfg.inifontsize, 20),
        fontFamily: pzCfg.fonte || (pzIrmao && pzIrmao.fontFamily) || 'Arial',
        fill: pzCfg.cortexto || (pzIrmao && pzIrmao.fill) || 'black',
        charSpacing: pzNum(pzCfg.espacoletras, 0),
        textAlign: 'center',
        originX: 'left',
        originY: 'top',
        belongsTo: active.delimiterId,
        fieldId: e.id,
        splitByGrapheme: true,
        // o arco e desenhado a partir destas props (ver pzArcoDoCampo)
        pzArco: pzLigado(pzCfg.arco),
        pzArcoRaio: pzNum(pzCfg.arcoraio, 0),
        pzArcoGiro: pzNum(pzCfg.arcogiro, 0),
        pzArcoEmbaixo: pzLigado(pzCfg.arcoembaixo),
        pzArcoAngulo: pzNum(pzCfg.arcoangulo, 0),
    });

    // inherit rules from delimiter
    textbox.lockMovementX = textbox.lockMovementY = active.locked;
    textbox.lockScalingX = textbox.lockScalingY = !active.allowResize;
    textbox.lockRotation = !active.allowResize;

    if (active.isClipping) {
        textbox.clipPath = pzClipDelimitador(active, abs);
    }

    canvas.add(textbox).setActiveObject(textbox);

    // PZ: na primeira digitacao ainda nao havia objeto, entao pzArcoDoCampo devolveu
    // null e o arco nao foi desenhado. Agora que o objeto existe, repete a chamada:
    // ela cai no ramo do arco e sai (o textbox ja esta criado).
    if (textbox.pzArco && Number(textbox.pzArcoRaio) > 0) {
        try { addText(e); } catch (err) { console.log('PZ arco (loja):', err); }
    }
};
window.__corCampoLoja = function (inputEl) {
    if (!inputEl) return;
    var hex = inputEl.getAttribute('data-cor-escolhida');
    if (!hex) return;
    try {
        canvas.getObjects().forEach(function (o) {
            if (o.type === 'textbox' && o.fieldId === inputEl.id) { o.set({ fill: hex }); }
        });
        canvas.requestRenderAll();
    } catch (err) { }
};
(function () {
    if (window.__addTextCorWrapped) return;
    if (typeof window.addText === 'function') {
        var __origAddText = window.addText;
        window.addText = function (e) { var r = __origAddText.call(this, e); try { window.__corCampoLoja(e); } catch (_) { } return r; };
    }
    window.__addTextCorWrapped = true;
    document.addEventListener('click', function (ev) {
        var sw = ev.target.closest ? ev.target.closest('.cor-swatch-loja') : null;
        if (!sw || !sw.hasAttribute('data-hex')) return;
        var wrap = sw.closest('.cor-picker-loja'); if (!wrap) return;
        var tid = wrap.getAttribute('data-target');
        var input = document.getElementById(tid); if (!input) return;
        var hex = sw.getAttribute('data-hex');
        input.setAttribute('data-cor-escolhida', hex);
        var all = wrap.querySelectorAll('.cor-swatch-loja');
        for (var i = 0; i < all.length; i++) { all[i].style.outline = 'none'; }
        sw.style.outline = '2px solid #333'; sw.style.outlineOffset = '1px';
        var hid = document.getElementById('corhid_' + tid); if (hid) hid.value = hex;
        if (window.__corCampoLoja) window.__corCampoLoja(input);
    }, true);
    document.addEventListener('input', function (ev) {
        var ci = ev.target;
        if (!ci || !ci.classList || !ci.classList.contains('cor-livre-loja')) return;
        var wrap = ci.closest('.cor-picker-loja'); if (!wrap) return;
        var tid = wrap.getAttribute('data-target');
        var input = document.getElementById(tid); if (!input) return;
        input.setAttribute('data-cor-escolhida', ci.value);
        var hid = document.getElementById('corhid_' + tid); if (hid) hid.value = ci.value;
        if (window.__corCampoLoja) window.__corCampoLoja(input);
    }, true);
})();
window.clearText = function (e) {
    let delimiter = e.dataset.delimiter;

    let active = canvas.getObjects().find(o => o.delimiterId === delimiter);

    //const emojiRegex = /\p{Emoji}/gu;
    const emojiRegex = /([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/gu;
    let textValue = e.value.replace(emojiRegex, '');

    const existing = canvas.getObjects().find(o =>
        o.type === 'textbox' &&
        o.belongsTo === active.delimiterId &&
        o.fieldId === e.id
    );

    if (existing) {
        existing.text = textValue;
        existing.set({ splitByGrapheme: true });
    }

    // PZ: ao focar em qualquer campo, deixa em branco no mockup TODOS os outros campos que ainda estiverem vazios
    canvas.getObjects().forEach(function (obj) {
        if (obj.type !== 'textbox' || !obj.fieldId) return;
        if (obj.fieldId === e.id) return; // campo atual, ja tratado acima
        var inputEl = document.getElementById(obj.fieldId);
        if (!inputEl) return;
        var val = (inputEl.value !== undefined) ? inputEl.value : '';
        if (val === '' && obj.text !== '') {
            obj.set({ text: '', splitByGrapheme: true });
        }
    });
    canvas.requestRenderAll();
}
window.addImageCanvas = function (fileInput) {
    let delimiter = e.dataset.delimiter;
    setActiveDelimiter(delimiter);

    let active = canvas.getActiveObject();
    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // ✅ check if image already exists for this fieldId
        const existing = canvas.getObjects().find(o =>
            o.type === 'image' &&
            o.belongsTo === active.delimiterId &&
            o.fieldId === fileInput.id
        );

        if (existing) {
            // swap the source of the existing image
            fabric.Image.fromURL(e.target.result, (newImg) => {
                const abs = active.getBoundingRect(true, true);

                const scaleX = abs.width / newImg.width;
                const scaleY = abs.height / newImg.height;

                existing.setElement(newImg.getElement());
                existing.set({
                    //left: abs.left,
                    //top: abs.top,
                    //scaleX,
                    //scaleY,
                    angle: active.angle
                });

                canvas.requestRenderAll();
            });
            return;
        }

        fabric.Image.fromURL(e.target.result, (img) => {
            // Get rect from group
            const rect = active.item(0);

            // Compute rect's absolute position and size
            const abs = active.getBoundingRect(true, true);

            // Scale image to fit the rect
            const scaleX = abs.width / img.width;
            const scaleY = abs.height / img.height;
            img.set({
                left: abs.left,
                top: abs.top,
                originX: 'left',
                originY: 'top',
                belongsTo: active.delimiterId,
                useVariationColor: false, // default to no tint
                fieldId: fileInput.id,
                scaleX,
                scaleY
            });

            // inherit rules from delimiter
            img.lockMovementX = img.lockMovementY = active.locked;
            img.lockScalingX = img.lockScalingY = !active.allowResize;
            img.lockRotation = !active.allowResize;

            if (active.isClipping) {
                img.clipPath = pzClipDelimitador(active, abs, pzFormaDoCampo(img.fieldId));
            }

            canvas.add(img).setActiveObject(img);
        });
    };
    reader.readAsDataURL(file);
};
/**
 * PZ: encaixa uma imagem numa caixa SEM distorcer (cabe inteira, proporcao
 * mantida) e centraliza. Usado quando o cliente escolhe um simbolo.
 */
function pzEncaixaImagem(img, larguraCaixa, alturaCaixa, centro) {
    var w = img.width || 1, h = img.height || 1;
    var s = Math.min(larguraCaixa / w, alturaCaixa / h);
    if (!isFinite(s) || s <= 0) s = 1;
    img.set({ scaleX: s, scaleY: s, cropX: 0, cropY: 0 });
    img.setPositionByOrigin(centro, 'center', 'center');
    img.setCoords();
}

// PZ: cliente clicou num simbolo do campo "selecao".
//
// Antes: o <img> clicado nao tem id, entao a busca pela imagem do campo
// (fieldId === fileInput.id) nunca achava a "Imagem inicial" que o lojista
// posicionou — criava uma imagem NOVA esticada pra area de marcacao inteira
// (scaleX e scaleY separados, sem manter proporcao). Com uma area cobrindo o
// anel todo, o simbolo virava um coracao gigante por cima do produto.
// E quando achava, reaproveitava a escala da imagem antiga (outro tamanho em
// pixels) e trocava o giro do lojista pelo da area.
//
// Agora: o campo e identificado pelo id do placeholder (o mesmo fieldId que o
// painel grava na imagem inicial). A imagem escolhida ENTRA NO LUGAR da
// inicial: mesmo centro, mesma caixa, mesmo giro, mesmo recorte/cor.
// Sem imagem inicial, cabe na area sem distorcer.
window.addImageFromUrlCanvas = function (fileInput) {
    let delimiter = fileInput.dataset.delimiter;
    setActiveDelimiter(delimiter);

    let active = canvas.getActiveObject();
    const file = fileInput.dataset.image;
    if (!file || !active) {
        return;
    }

    const fieldId = fileInput.dataset.placeholder || fileInput.id || '';

    const imagensDoCampo = canvas.getObjects().filter(o => o.type === 'image' && fieldId !== '' && o.fieldId === fieldId);
    const existing = imagensDoCampo.find(o => o.belongsTo === active.delimiterId) || imagensDoCampo[0];

    if (existing) {
        // caixa que o LOJISTA deixou. Memoriza na primeira troca: medir a imagem
        // atual fazia a caixa encolher a cada escolha (60x60 -> 60x36 -> 11x36).
        if (!(existing.pzCaixaW > 0) || !(existing.pzCaixaH > 0)) {
            existing.pzCaixaW = existing.getScaledWidth();
            existing.pzCaixaH = existing.getScaledHeight();
        }
        const caixaW = existing.pzCaixaW;
        const caixaH = existing.pzCaixaH;
        const centro = existing.getCenterPoint();
        fabric.Image.fromURL(file, (newImg) => {
            existing.setElement(newImg.getElement());   // width/height passam a ser da imagem nova
            pzEncaixaImagem(existing, caixaW, caixaH, centro);
            // tinta da variacao (filtros) precisa ser reaplicada na imagem nova
            if (existing.filters && existing.filters.length && typeof existing.applyFilters === 'function') {
                try { existing.applyFilters(); } catch (e) {}
            }
            canvas.requestRenderAll();
        }, { crossOrigin: 'anonymous' });
        return;
    }

    fabric.Image.fromURL(file, (img) => {
        const abs = active.getBoundingRect(true, true);
        img.set({
            belongsTo: active.delimiterId,
            useVariationColor: false, // default to no tint
            fieldId: fieldId
        });
        pzEncaixaImagem(img, abs.width, abs.height, new fabric.Point(abs.left + abs.width / 2, abs.top + abs.height / 2));

        // inherit rules from delimiter
        img.lockMovementX = img.lockMovementY = active.locked;
        img.lockScalingX = img.lockScalingY = !active.allowResize;
        img.lockRotation = !active.allowResize;

        if (active.isClipping) {
            img.clipPath = pzClipDelimitador(active, abs, pzFormaDoCampo(img.fieldId));
        }

        canvas.add(img).setActiveObject(img);
    }, { crossOrigin: 'anonymous' });
};
function addImageFromDropzone(file, imgUrl, dropzoneId, delimiter) {
    setActiveDelimiter(delimiter);
    if (!canvas) {
        return;
    }

    let active = canvas.getActiveObject();
    if (!active || !active.delimiterId) {
        return;
    }

    // check if image already exists for this dropzone
    const existing = canvas.getObjects().find(o =>
        o.type === 'image' &&
        o.belongsTo === active.delimiterId &&
        o.fieldId === dropzoneId
    );

    if (existing) {
        fabric.Image.fromURL(imgUrl, (newImg) => {
            const abs = active.getBoundingRect(true, true);
            const scaleX = abs.width / newImg.width;
            const scaleY = abs.height / newImg.height;

            existing.setElement(newImg.getElement());
            existing.set({
                //left: abs.left,
                //top: abs.top,
                //scaleX,
                //scaleY,
                angle: active.angle
            });

            canvas.requestRenderAll();
        });
        return;
    }

    // add new image
    fabric.Image.fromURL(imgUrl, (img) => {
        const abs = active.getBoundingRect(true, true);
        const scaleX = abs.width / img.width;
        const scaleY = abs.height / img.height;

        img.set({
            left: abs.left,
            top: abs.top,
            originX: 'left',
            originY: 'top',
            scaleX,
            scaleY,
            belongsTo: active.delimiterId,
            useVariationColor: false, // default to no tint
            fieldId: dropzoneId // 🔑 store which dropzone this image came from
        });

        canvas.add(img).setActiveObject(img);
    });
}
function selectFontCanvas() {
    const target = $(this).data('target');
    console.log("Changing font for target:", target, "to font:", $(this).val());
    $(`#${target}`).css('font-family', $(this).val());

    const text = canvas.getObjects().find(o =>
        o.type === 'textbox' &&
        o.fieldId === target
    );
    text.set({
        fontFamily: $(this).val()
    });
    canvas.requestRenderAll();
}
function applyTintFilterToImage(imageObj, hexColor) {
    // check if image allows filters
    console.log("Applying tint filter to image object:", imageObj);
    if (!imageObj.useVariationColor) {
        console.log("Image object not set to use variation color.");
        return;
    }

    // Find any existing BlendColor filter
    const existingFilter = imageObj.filters.find(
        (f) => f && f.type === 'BlendColor'
    );

    if (existingFilter) {
        existingFilter.color = hexColor;
    } else {
        const newFilter = new fabric.Image.filters.BlendColor({
            color: hexColor,
            mode: 'tint',
            opacity: 0,
        });
        imageObj.filters.push(newFilter);
    }

    imageObj.applyFilters();
}

let currentZoom = 1;
const ZOOM_STEP = 0.9;
const MAX_ZOOM = 3;
const MIN_ZOOM = 1;

function zoomIn() {
    if (!canvas) return;
    currentZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
    //zoomToCenter(currentZoom);
    //zoomToObject("Bondarie", currentZoom);
    zoomToFirstTextObject(currentZoom);
}
function zoomOut() {
    if (!canvas) return;
    currentZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
    //zoomToCenter(currentZoom);
    //zoomToObject("Bondarie", currentZoom);
    zoomToFirstTextObject(currentZoom);
}
function resetZoom() {
    if (!canvas) return;
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    currentZoom = 1;
    zoomToCenter(currentZoom);
}
function zoomToCenter(scale) {
    const center = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, scale);
}
// Function to zoom and center on a specific object
function zoomToObject(delimiterId, zoomLevel = 2) {
    if (!canvas) return;

    const objectToZoom = canvas.getObjects().find(obj => obj.delimiterId === delimiterId);

    if (objectToZoom) {
        const center = objectToZoom.getCenterPoint();
        const vpt = canvas.viewportTransform; // The current viewport transformation matrix

        // Calculate the new viewport transform for the target zoom and center point
        const targetVpt = [
            zoomLevel, 0, 0,
            zoomLevel,
            -center.x * zoomLevel + (canvas.width / 2),
            -center.y * zoomLevel + (canvas.height / 2)
        ];

        // Animate the viewport transform
        fabric.util.animate({
            startValue: vpt,
            endValue: targetVpt,
            duration: 500, // Animation duration in milliseconds
            onChange: function (value) {
                // Apply the new viewport transform at each animation step
                canvas.setViewportTransform(value);
                canvas.requestRenderAll();
            },
            onComplete: function () {
                // Update your external zoom variable after the animation is complete
                currentZoom = zoomLevel;
            },
            easing: fabric.util.ease.easeInOutQuad
        });
    } else {
        console.warn(`Object with delimiterId "${delimiterId}" not found.`);
    }
}
function zoomToFirstTextObject(zoomLevel = 2) {
    if (!canvas) {
        console.error("Canvas is not initialized.");
        return;
    }

    // Find the first object that is a 'fabric.Text' or 'fabric.IText' instance.
    const textObjects = canvas.getObjects().filter(obj => obj.type === 'text' || obj.type === 'textbox');

    const objectToZoom = textObjects[0];

    if (objectToZoom) {
        const center = objectToZoom.getCenterPoint();
        const vpt = canvas.viewportTransform;

        // Calculate the new viewport transform for the target zoom and center point
        const targetVpt = [
            zoomLevel, 0, 0,
            zoomLevel,
            -center.x * zoomLevel + (canvas.width / 2),
            -center.y * zoomLevel + (canvas.height / 2)
        ];

        // Animate the viewport transform
        fabric.util.animate({
            startValue: vpt,
            endValue: targetVpt,
            duration: 500,
            onChange: function (value) {
                canvas.setViewportTransform(value);
                canvas.requestRenderAll();
            },
            onComplete: function () {
                // Update your external zoom variable after the animation is complete
                currentZoom = zoomLevel;
            },
            easing: fabric.util.ease.easeInOutQuad
        });
    } else {
        console.warn("No text object found on the canvas. Trying to zoom to an image object instead.");
        // search for an image object if no text object is found
        const imageObjects = canvas.getObjects().filter(obj => obj.type === 'image');
        const imageToZoom = imageObjects[0];
        if (imageToZoom) {
            const center = imageToZoom.getCenterPoint();
            const vpt = canvas.viewportTransform;
            // Calculate the new viewport transform for the target zoom and center point
            const targetVpt = [
                zoomLevel, 0, 0,
                zoomLevel,
                -center.x * zoomLevel + (canvas.width / 2),
                -center.y * zoomLevel + (canvas.height / 2)
            ];

            // Animate the viewport transform
            fabric.util.animate({
                startValue: vpt,
                endValue: targetVpt,
                duration: 500,
                onChange: function (value) {
                    canvas.setViewportTransform(value);
                    canvas.requestRenderAll();
                },
                onComplete: function () {
                    // Update your external zoom variable after the animation is complete
                    currentZoom = zoomLevel;
                },
                easing: fabric.util.ease.easeInOutQuad
            });
        }else{
            console.warn("No text or image object found on the canvas.");
        }
    }
}

function criarObrigatoriosMockup() {
    console.log("criando obrigatorios");

    const obrigatorios = document.querySelectorAll("[data-obrigatorio='true']");
    console.log("Obrigatórios encontrados:", obrigatorios);

    if (obrigatorios.length === 0) return;

    //const btnComprar = document.querySelector("[data-store='product-buy-button']");
    //const btnComprar = document.querySelector(".mockup-buy");
    //let btnComprar = '';
    let btnComprar = document.querySelector("#mockupBuy");
    if (window.screen.width <= 768) {
        btnComprar = document.querySelector("#mockupBuyMobile");
    }

    if (btnComprar) {
        console.log("Disabling 'Comprar' button initially", btnComprar);
        //btnComprar.setAttribute("disabled", "disabled");
        disableButton(btnComprar);
    }

    obrigatorios.forEach((el) => {
        const inputs = el.querySelectorAll('input, select');
        console.log("Inputs found in required element:", inputs);

        const hasInputs = inputs.length > 0;
        const dropzoneEl = el.querySelector('.dropzone');
        const hasDropzone = !!(dropzoneEl && dropzoneEl.dropzone);

        if (!hasInputs && !hasDropzone) {
            console.log("No inputs or dropzone found in required element, skipping.");
            return;
        }

        // Attach change event to inputs
        inputs.forEach((input) => {
            console.log("Adding change event listener to input:", input);
            input.addEventListener('change', () => validateRequiredFields(obrigatorios, btnComprar));
        });

        // Attach Dropzone events
        if (hasDropzone) {
            dropzoneEl.dropzone.on("complete", () => validateRequiredFields(obrigatorios, btnComprar));
            dropzoneEl.dropzone.on("removedfile", () => validateRequiredFields(obrigatorios, btnComprar));
        }
    });

    // Initial validation
    validateRequiredFields(obrigatorios, btnComprar);
}

function validateRequiredFieldsMockup(obrigatorios, btnComprar) {
    const allFilled = Array.from(obrigatorios).every((el) => {
        console.log("Checking required element:", el);
        // If not visible → treat as filled
        if (!isElementVisible(el)) {
            console.log("Element is not visible, treating as filled.");
            return true;
        }

        const field = el.querySelector('input, select');
        console.log("Validating field:", field);
        if (field) {
            const type = field.type;
            if (type === 'checkbox' || type === 'radio') {
                const name = field.name;
                const checkedField = el.querySelector(`input[name="${name}"]:checked`);
                console.log("Checked field for", name, ":", checkedField);

                if (!checkedField) {
                    // add red border to the element to indicate it's required uding pre made class
                    field.reportValidity();
                }

                return !!checkedField;
            }
            if (field.value.trim() == '') {
                // add red border to the element to indicate it's required uding pre made class
                field.classList.add("input-error");
                field.reportValidity();
            } else {
                field.classList.remove("input-error");
            }
            return field.value.trim() !== '';
        }

        const dzEl = el.querySelector('.dropzone');
        console.log("Validating Dropzone element:", dzEl);
        if (dzEl && dzEl.dropzone && dzEl.dropzone.files.length > 0) {
            return true;
        }

        return false;
    });

    if (allFilled) {
        console.log("✅ All required fields are filled.");
        if (btnComprar) {
            enableButton(btnComprar);
        }
        //if (btnComprar) btnComprar.removeAttribute("disabled");
    } else {
        console.log("❌ Not all required fields are filled.");
        if (btnComprar) {
            disableButton(btnComprar);
        }
        //if (btnComprar) btnComprar.setAttribute("disabled", "disabled");
    }
    return allFilled;
}

function saveCanvasAsImages(e) {
    const obrigatorios = document.querySelectorAll("[data-obrigatorio='true']");
    const validation = validateRequiredFieldsMockup(obrigatorios, null);
    if (!validation) {
        return;
    }
    const btnComprar = document.querySelector("[data-store='product-buy-button']");
    enableButton(btnComprar);

    // add spining loader to button
    $(e).html('<span class="loader-mockup"></span> Preparando seu produto exclusivo...');
    //$(e).hide();
    $(e).attr('disabled', 'disabled');

    /*let loader = document.querySelector(".loader-container");
    let subText = document.getElementById("sub");
    if (window.screen.width <= 768) {
        loader = document.querySelector(".loader-container-mobile");
        subText = document.getElementById("subMb");
    }
    $(loader).css({
        display: "flex"
    });

    let i = 0;
    setInterval(() => {
        subText.textContent = frases[i];
        i = (i + 1) % frases.length;
    }, 900);*/

    // get inputs, check if its filled and if its not clear the related objects on canvas
    const allInputs = document.querySelectorAll("#mockupModalCampo .campo-container");
    allInputs.forEach((el) => {
        const inputs = el.querySelectorAll('input, select');
        const inputId = inputs[0]?.id;
        if (!inputId || (inputs[0].value.trim() === '')) {
            const relatedObjects = canvas.getObjects().filter(o => o.fieldId === inputId);
            relatedObjects.forEach(obj => {
                if (obj.type === 'textbox' && obj.text) {
                    obj.text = '';
                }
                // PZ: o arco de um campo vazio foi desenhado com o texto de
                // exemplo do lojista — nao pode ir pra arte do carrinho.
                if (obj.pzArcoDe) {
                    canvas.remove(obj);
                }
            });
            canvas.requestRenderAll();
        }
    })

    // PZ: as duas imagens sao montadas em 3 passos porque o trapezio nao pode
    // pegar a foto do produto.
    //
    // Na primeira versao eu deformava a imagem final ja composta, e a camiseta
    // saia torta junto com a arte. O trapezio tem que valer SO pra
    // personalizacao do cliente. Entao: exporta o produto sozinho, exporta a
    // arte sozinha, deforma apenas a arte e recompoe uma sobre a outra.
    const pzFundoImg = canvas.backgroundImage;
    const pzFundoCor = canvas.backgroundColor;

    // 1) so o produto (esconde o que o cliente preencheu)
    const pzVisiveis = [];
    canvas.getObjects().forEach(function (o) {
        pzVisiveis.push([o, o.visible]);
        o.visible = false;
    });
    canvas.renderAll();
    const pzSoProduto = canvas.toDataURL({ format: 'png', quality: 1.0 });

    // 2) so a arte, em PNG transparente
    //
    // `withoutBackground` nao existe no fabric (0 ocorrencias no 5.3.0): a
    // opcao era ignorada e as duas imagens saiam iguais, as duas com fundo.
    // O delimitador ja esta com visible:false pelo restyleDelimiters(), entao
    // aqui sobra apenas o que o cliente preencheu.
    let pzSoArte;
    try {
        pzVisiveis.forEach(function (par) { par[0].visible = par[1]; });
        canvas.backgroundImage = null;
        canvas.backgroundColor = '';
        canvas.renderAll();
        pzSoArte = canvas.toDataURL({ format: 'png', quality: 1.0 });
    } finally {
        // devolve tudo mesmo se a exportacao falhar, senao o cliente fica
        // olhando um mockup sem o produto
        canvas.backgroundImage = pzFundoImg;
        canvas.backgroundColor = pzFundoCor;
        pzVisiveis.forEach(function (par) { par[0].visible = par[1]; });
        canvas.renderAll();
    }

    // 3) deforma SO a arte e recompoe sobre o produto
    const pzTrap = pzTrapezioDaArea();

    pzTrapezioDataUrl(pzSoArte, pzTrap).then(function (arteFinal) {
        return pzSobrepoe(pzSoProduto, arteFinal).then(function (comFundo) {
            return [comFundo, arteFinal];
        });
    }).then(function (pzImgs) {
    $.ajax({
        url: `${baseUrl}Ajax/saveMockupImages`,
        type: 'POST',
        data: {
            loja: LS.store.id,
            produto: LS.product.id,
            imgWithBg: pzImgs[0],
            imgWithoutBg: pzImgs[1]
        }
    }).then((data) => {
        console.log("saveMockupImages:", data);
        $("input[name='properties[mockupComFundo]']").val(data.comFundo);
        $("input[name='properties[mockupSemFundo]']").val(data.semFundo);

        var modal = document.getElementById("mockupModal");
        if (canvas) {
            canvas.dispose();
            canvas = null;
        }
        modal.style.display = "none";

        // Trigger the click event on the button instead of submitting the form directly
        if ($(btnComprar).length) {
            console.log("dispara o click no botão de compra", $(btnComprar).click())
        } else {
            console.log('Add to Cart button not found within the product form.');
        }
        disableButton(btnComprar);
        $(e).html(`${personalizeTextos.adicionar_ao_carrinho || 'ADICIONAR AO CARRINHO'}`);
        //$(e).show();
        $(e).removeAttr('disabled');
        /*$(loader).css({
            display: "none"
        });*/
    });
    });   // fecha o Promise.all do trapezio
}

/** END mockup */

const initPersonalizeApp = {
    'amazonas': (baseUrl, theme) => {
        return new Promise((resolve) => {
            console.log("Initializing Personalize app for Amazonas theme");

            // add the own carousel
            $(`<script src="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/owl.carousel.min.js"></script>`).appendTo("head");
            $(`<link href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css" rel='stylesheet' type='text/css'>`).appendTo("head");
            $(`<link href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.theme.default.min.css" rel='stylesheet' type='text/css'>`).appendTo("head");

            // cria o elemento onde o conteúdo será inserido.
            // PZ: sempre no formulario do produto da pagina (pzFormPrincipal).
            // Antes pegava o primeiro `.js-product-variants` do documento, que em
            // tema com compra rapida pertence a um produto RELACIONADO escondido —
            // os campos eram criados la dentro e o cliente nunca via.
            const pzForm = pzFormPrincipal();
            if (typeof $ !== 'undefined' && pzForm) {
                pzInsereNoForm(pzForm, '<div id="personalize_app_container" class="customizacoes"></div>');
            } else {
                console.log("PZ: jQuery nao carregado ou formulario do produto nao encontrado.");
            }

            if (template == "product") {
                $.ajax({
                    url: `${baseUrl}Ajax/getInputsGrupo`,
                    type: 'POST',
                    data: {
                        loja: storeId,
                        produto: PersonalizeProductId,
                    }
                }).then((data) => {
                    console.log("campos:", data);

                    if (data?.inputs?.length > 0) {
                        console.log("data inputs length:", data.inputs.length);
                        data.inputs.forEach(input => {
                            console.log("Processing input:", input);
                            const inputHtml = generateInputHtml[input.tipo](input);
                            //console.log("Generated input HTML:", inputHtml);
                            $('#personalize_app_container').append(inputHtml);
                        });

                        // inicia date picker
                        generateDatepickers();

                        // inicia o dropzone e, após inicializar, chama criarObrigatorios
                        generateDropzone().then(() => {
                            console.log("Dropzone initialized successfully");
                            // aguarda dropzone inicializar
                            criarObrigatorios();
                        });

                        // init own carrousel
                        if ($(".owl-carousel-normal").length > 0) {
                            pzOwl(".owl-carousel-normal", {
                                loop: false,
                                margin: 5,
                                items: 2,
                                nav: true,
                                dots: false
                            });
                        }
                        if ($(".owl-carousel-small").length > 0) {
                            pzOwl(".owl-carousel-small", {
                                loop: false,
                                margin: 20,
                                items: 4,
                                nav: true,
                                dots: false,
                                autoWidth: true,
                                responsive: {
                                    0: {
                                        items: 2,
                                        nav: true,
                                        dots: false,
                                        autoWidth: true
                                    },
                                    460: {
                                        items: 3,
                                        nav: true,
                                        dots: false,
                                        autoWidth: true
                                    },
                                    600: {
                                        items: 3,
                                        nav: true,
                                        dots: false,
                                        autoWidth: true,
                                    },
                                }
                            });
                        }

                        // Verifica se há variações faz e adiciona o evento de mudança
                        const _pzScopeEl = document.querySelector("#personalize_app_container"); const _pzScope = (_pzScopeEl && _pzScopeEl.closest("form")) || document; const selectVariacoes = _pzScope.querySelectorAll(".js-variation-option:not(.form-control-small)");
                        //const selectVariacoes = document.querySelectorAll(".js-product-variants .js-product-variants-group");
                        console.log("Variations found:", selectVariacoes);
                        if (selectVariacoes.length > 0) {
                            selectVariacoes.forEach(select => {
                                verificarVariacao(select.value); // Verifica a variação inicial
                                select.addEventListener('change', (e) => {
                                    verificarVariacao(e.target.value);
                                    verificarVinculo(); // PZ: reaplica vinculo novo (vinculadoCom/id_option) ao trocar variacao
                                    setTimeout(verificarVinculo, 500); // PZ: reaplica apos re-render assincrono dos mockups na troca
                                    setTimeout(verificarVinculo, 1500); // PZ
                                    const obrigatorios = document.querySelectorAll("[data-obrigatorio='true']");
                                    const btnComprar = document.querySelector("[data-store='product-buy-button']");
                                    validateRequiredFields(obrigatorios, btnComprar);
                                });
                            });
                        } else {
                            verificarVariacao('');
                        }

                        // PZ: ultima conferida antes de mandar pro carrinho. O tema pode
                        // montar o pedido do jeito dele; reaplicar o vinculo no clique
                        // garante que campo escondido ja esta desabilitado e zerado.
                        // Usa so a parte de campos (pzVinculoCampos): o bloco de mockups
                        // liga/desliga o botao de compra e nao pode rodar no meio do clique.
                        const pzBtnCompra = document.querySelector("[data-store='product-buy-button']");
                        if (pzBtnCompra && !pzBtnCompra.dataset.pzGuardaCarrinho) {
                            pzBtnCompra.dataset.pzGuardaCarrinho = '1';
                            pzBtnCompra.addEventListener('click', () => {
                                try { pzVinculoCampos(); } catch (e) { console.log('PZ vinculo no clique:', e); }
                            }, true);
                            const pzForm = pzBtnCompra.closest('form');
                            if (pzForm) {
                                pzForm.addEventListener('submit', () => {
                                    try { pzVinculoCampos(); } catch (e) { console.log('PZ vinculo no submit:', e); }
                                }, true);
                            }
                        }

                        // verifica se existem elementos com a classe "hasOptions"
                        const hasOptionsElements = document.querySelectorAll(".hasOptions");
                        if (hasOptionsElements.length > 0) {
                            verificarVinculo();
                            console.log("Found elements with class 'hasOptions':", hasOptionsElements);
                            // para cada elemento encontrado, adiciona um evento de mudança
                            hasOptionsElements.forEach(element => {
                                element.addEventListener('change', () => {
                                    verificarVinculo();
                                    const obrigatorios = document.querySelectorAll("[data-obrigatorio='true']");
                                    const btnComprar = document.querySelector("[data-store='product-buy-button']");
                                    validateRequiredFields(obrigatorios, btnComprar);
                                });
                            });
                        }


                        if (data.fontes && data.fontes.length > 0) {
                            console.log("Loading fonts:", data.fontes);
                            loadFontes(data.fontes);
                        }
                        // adiciona o evento de mudança para as fontes
                        document.querySelectorAll("select.font-select").forEach(select => {
                            select.addEventListener('change', selectFont);
                        });

                        console.log("personalizeInputs:", personalizeInputs);
                    } else {
                        console.log("No inputs found for product.");
                    }

                    // apply personalizations to the product page
                    if (data?.personalizacoes) {
                        applyInlineCssVariables(data.personalizacoes);
                    }

                });
                // adiciona o css especifico do tema
                $(`<link href="${baseUrl}jspersonaliza/temas/amazonas.css" rel='stylesheet' type='text/css'>`).appendTo("head");
                resolve();
            }
        });
    },
}

const generateInputHtml = {
    'texto': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        let fontesSelect = '';
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: `monta_${input.tipo}_${input.unic}`,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        if (input.iconSize == 'fontes') {
            inputLabels[`${input.name}Fonte`] = `${input.titulo} - Fonte`;
            fontesSelect = `
                <label style="
                    color: var(--text-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);
                    "
                for="">
                    Selecione a Fonte
                </label>
                <select class="form-control font-select" data-target="monta_${input.tipo}_${input.unic}" name="properties[${input.name}Fonte]">
                    <option value="">Selecione</option>
                </select>
            `;
        }
        return `
        <div
            class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo}"
            data-vinculado=""
            data-campovinculado="monta_${input.tipo}_${input.unic}"
            data-obrigatorio="${obrigatorio}"
            data-campogeral="${input.tipo}${input.unic}"
            style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
                <label style="
                    color: var(--text-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);" class="">
                    ${input.titulo}${(obrigatorio) ? ' *' : ''}
                </label> 
                <input
                    id="monta_${input.tipo}_${input.unic}"
                    class="form-control variant-select "
                    maxlength="${max}"
                    type="text"
                    name="properties[${input.name}]"
                    placeholder="${input.texto}"
                    style="height: 40px; padding: 0 10px;box-sizing: border-box;font-size: var(--input-font-size, 20px)!important;">
                    ${fontesSelect}
        </div>
        `;
    },
    'link': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: `monta_${input.tipo}_${input.unic}`,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        return `
        <div
            class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo}"
            data-vinculado=""
            data-campovinculado="monta_${input.tipo}_${input.unic}"
            data-obrigatorio="${obrigatorio}"
            data-campogeral="${input.tipo}${input.unic}"
            style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
                <label style="
                    color: var(--text-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);" class="">
                    ${input.titulo}${(obrigatorio) ? ' *' : ''}
                </label> 
                <a style="
                    color: var(--focus-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);
                    text-decoration: underline !important;" class="" href="${input.iconSize}" target="_blank">${input.texto}</a>
        </div>
        `;
    },
    'cor': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: `monta_${input.tipo}_${input.unic}`,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        return `
        <div
            class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo}"
            data-vinculado="" 
            data-campovinculado="monta_${input.tipo}_${input.unic}"
            data-obrigatorio="${obrigatorio}"
            data-campogeral="${input.tipo}${input.unic}"
            style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
                <label style="
                    color: var(--text-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);"
                class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label> 
                <input
                    id="monta_${input.tipo}_${input.unic}"
                    class="form-control variant-select "
                    maxlength="${max}"
                    type="color"
                    name="properties[${input.name}]"
                    placeholder="${input.texto}"
                    style="height: 40px; padding: 0 10px;box-sizing: border-box;border: none; width: 58px;">
        </div>
        `;
    },
    'data': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: `monta_${input.tipo}_${input.unic}`,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        if (input.typeInput == "date-available") {
            // se tiver options
            if (input.optionsCampo.length > 0) {
                input.optionsCampo.forEach(op => { 
                    // adiciona no array de datas disponíveis para o datepicker usando o id do input para identificar qual campo deve ser preenchido com essas datas
                    if (!avaliableDates[`monta_${input.tipo}_${input.unic}`]) {
                        avaliableDates[`monta_${input.tipo}_${input.unic}`] = [];
                    }
                    avaliableDates[`monta_${input.tipo}_${input.unic}`].push(op.optionName);
                });
            }
            return `
            <div class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo}"
                data-vinculado=""
                data-campovinculado="monta_${input.tipo}_${input.unic}"
                data-obrigatorio="${obrigatorio}"
                data-campogeral="${input.tipo}${input.unic}"
                style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
                    <label style="
                        color: var(--text-color);
                        font-size: var(--font-size);
                        font-weight: var(--font-weight);"
                    class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label> 
                    <div style="position: relative; width: 100%;">
                        <input
                            id="monta_${input.tipo}_${input.unic}"
                            class="form-control variant-select isDatepicker-date-available"
                            type="text"
                            readonly
                            name="properties[${input.name}]"
                            placeholder="dd/mm/aaaa"
                            style="height: 40px; padding: 0 10px;box-sizing: border-box; cursor: pointer;font-size: var(--input-font-size, inherit);">

                        <span style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); pointer-events: none;" class="datepicker-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="#000000" width="15px" height="15px" viewBox="0 0 52 52" enable-background="new 0 0 52 52" xml:space="preserve">
                                <path d="M46.3,19.7H5.7c-0.9,0-1.6,0.7-1.6,1.6v23.5c0,2.6,2.1,4.7,4.7,4.7h34.4c2.6,0,4.7-2.1,4.7-4.7V21.3  C47.9,20.4,47.2,19.7,46.3,19.7z M18.2,41.6c0,0.9-0.7,1.6-1.6,1.6h-3.1c-0.9,0-1.6-0.7-1.6-1.6v-3.1c0-0.9,0.7-1.6,1.6-1.6h3.1  c0.9,0,1.6,0.7,1.6,1.6V41.6z M29.1,41.6c0,0.9-0.7,1.6-1.6,1.6h-3.1c-0.9,0-1.6-0.7-1.6-1.6v-3.1c0-0.9,0.7-1.6,1.6-1.6h3.1  c0.9,0,1.6,0.7,1.6,1.6V41.6z M29.1,30.7c0,0.9-0.7,1.6-1.6,1.6h-3.1c-0.9,0-1.6-0.7-1.6-1.6v-3.1c0-0.9,0.7-1.6,1.6-1.6h3.1  c0.9,0,1.6,0.7,1.6,1.6V30.7z M40.1,30.7c0,0.9-0.7,1.6-1.6,1.6h-3.1c-0.9,0-1.6-0.7-1.6-1.6v-3.1c0-0.9,0.7-1.6,1.6-1.6h3.1  c0.9,0,1.6,0.7,1.6,1.6V30.7z M43.2,7.2h-3.9V5.6c0-1.7-1.4-3.1-3.1-3.1c-1.7,0-3.1,1.4-3.1,3.1v1.6H19V5.6c0-1.7-1.4-3.1-3.1-3.1  s-3.1,1.4-3.1,3.1v1.6H8.8c-2.6,0-4.7,2.1-4.7,4.7v1.6c0,0.9,0.7,1.6,1.6,1.6h40.7c0.9,0,1.6-0.7,1.6-1.6v-1.6  C47.9,9.3,45.8,7.2,43.2,7.2z"/>
                            </svg>
                        </span>
            </div>
            `;
        } else {
            return `
            <div class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo}"
                data-vinculado=""
                data-campovinculado="monta_${input.tipo}_${input.unic}"
                data-obrigatorio="${obrigatorio}"
                data-campogeral="${input.tipo}${input.unic}"
                style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
                    <label style="
                        color: var(--text-color);
                        font-size: var(--font-size);
                        font-weight: var(--font-weight);"
                    class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label> 
                    <input
                        id="monta_${input.tipo}_${input.unic}"
                        class="form-control variant-select "
                        maxlength="${max}"
                        type="${input.typeInput}"
                        name="properties[${input.name}]"
                        placeholder="${input.texto}"
                        style="height: 40px; padding: 0 10px;box-sizing: border-box;font-size: var(--input-font-size, inherit);">
            </div>
            `;
        }
    },
    'arquivo': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        const idUnico = `monta_${input.tipo}_${input.unic}`;
        let limitHTML = '';
        if (max > 0) {
            limitHTML = `(Limite de ${max} arquivos)`;
        }
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: idUnico,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        const start = Date.now();
        while (Date.now() === start) { }

        if (input.iconSize == '1') {
            return `
        <div
            class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo}"
            data-campovinculado="${idUnico}"
            data-campogeral="${input.tipo}${input.unic}"
            data-vinculado=""
            data-obrigatorio="${obrigatorio}"
            style="width: 100%;flex-direction:column;display: inline-flex;" 
            id="${input.tipo}_${input.unic}_div">

            <input 
                type="hidden" 
                id="${idUnico}" 
                name="properties[${input.name}]" 
                style="width: 100%; background: transparent; border: 1px solid #000; height: 40px; border-radius: 5px; padding: 0 10px;">
    
            <label style="
                    color: var(--text-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);"
            class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
            <div
                name="properties[${input.name}]"
                data-vinculado=""
                data-max="${max}"
                data-campovinculado="${idUnico}"
                style="display: flex;
                    max-width: 400px;
                    flex-direction: row;
                    flex-wrap: wrap;"
                class="dropzone dz-clickable"
                id="dropzoneFile${input.unic}">
                    <div style="display:block!important; margin: 16px;" class="dz-default dz-message">
                        <button 
                            style="width: 120px;
                                height: 120px;"
                            class="dz-button btn-cust" 
                            type="button">
                            ${input.texto}
                        </button>
                    </div>
            </div>
        </div>
        `;
        } else {
            return `
        <div
            class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo}"
            data-campovinculado="${idUnico}"
            data-campogeral="${input.tipo}${input.unic}"
            data-vinculado=""
            data-obrigatorio="${obrigatorio}"
            style="width: 100%;flex-direction:column;display: inline-flex;" 
            id="${input.tipo}_${input.unic}_div">

            <input 
                type="hidden" 
                id="${idUnico}" 
                name="properties[${input.name}]" 
                style="width: 100%; background: transparent; border: 1px solid #000; height: 40px; border-radius: 5px; padding: 0 10px;">

            <div
                name="properties[${input.name}]"
                data-vinculado=""
                data-max="${max}"
                data-campovinculado="${idUnico}" 
                id="dropzoneFile${input.posicao}" 
                style="border: dotted 3px var(--border-color) !important;" 
                class="w-100 upload-dz dropzone dz-clickable">
                <div class="align-items-center justify-content-center dz-default dz-message" style="display: flex!important; flex-direction: column !important;">
                    <div class="upload-icon mb-1"></div>
                    <p class="text-center m-0">
                        <label style="
                            color: var(--upload-text-color)!important;
                            font-size: var(--upload-text-size-titulo)!important;
                            font-weight: var(--upload-text-weight-titulo)!important;"
                        class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
                    </p>
                    <p style="
                        color: var(--upload-text-color)!important;
                        font-size: var(--upload-text-size-desc)!important;
                        font-weight: var(--upload-text-weight-desc)!important;" 
                    class="text-center m-0">
                        <span style="
                            color: var(--upload-text-color)!important;
                            font-size: var(--upload-text-size-desc)!important;
                            font-weight: var(--upload-text-weight-desc)!important;" 
                        id="">
                            ${input.texto}
                            ${limitHTML}
                        </span> 
                    </p>
                </div>
            </div>
        </div>
        `;
        }
    },
    'checkbox': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: `monta_${input.tipo}_${input.unic}`,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        let options = '';
        // valida se tem opções
        if (!input.optionsCampo || input.optionsCampo.length === 0) { return ''; }

        input.optionsCampo.forEach((op, index) => {
            // cria um id unico para cada checkbox
            let checkboxId = `monta_${input.tipo}_${Date.now()}_${index}`;
            options += `
            <div style="margin-bottom: 5px;" class="form-check p-0">
                <input
                    id="${op.id_option}"
                    value="${op.optionName}"
                    name="properties[${input.name}_${op.id_option}]"
                    type="checkbox"
                    class="form-check-input"
                    style="">
                <label
                    for="${op.id_option}"
                    data-v="${op.optionName}"
                    class="form-check-label"
                    style="
                        color: var(--text-color);
                        font-size: var(--font-size);
                        font-weight: var(--font-weight);">${op.optionName}</label>
            </div>
            `;
            const start = Date.now();
            while (Date.now() === start) { }
        });
        return `
        <div class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo} hasOptions"
            style="margin-left: 0;display:flex!important;flex-direction:column;align-items:flex-start;gap:10px;margin-bottom:0;"
            data-obrigatorio="${obrigatorio}">
            
            <div id="listCheckBoxs_${input.unic}"
                data-vinculado=""
                data-campovinculado="monta_${input.tipo}_${input.unic}"
                class=""
                style="margin-bottom:35px;flex-direction:column;">
            
                <label style="
                    color: var(--text-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);"
                class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
            
                <div style="margin-top:10px;">
                    ${options}
                </div>
            </div>
        </div>
        `;
    },
    'radio': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: `monta_${input.tipo}_${input.unic}`,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        let options = '';

        // valida se tem opções
        if (!input.optionsCampo || input.optionsCampo.length === 0) { return ''; }

        input.optionsCampo.forEach((op, index) => {
            let radioId = `monta_${input.tipo}_${Date.now()}_${index}`;
            options += `
            <div style="margin-bottom: 5px;" class="form-check p-0">
                <input
                    id="${op.id_option}" 
                    type="radio" 
                    name="properties[${input.name}]" 
                    value="${op.optionName}" 
                    class="form-check-input radio"
                    style="">
                <label 
                    for="${op.id_option}" 
                    data-v="${op.optionName}"
                    class="form-check-label" 
                    style="
                        color: var(--text-color);
                        font-size: var(--font-size);
                        font-weight: var(--font-weight);">${op.optionName}</label> 
            </div>
            `;
            const start = Date.now();
            while (Date.now() === start) { }
        });
        return `
        <div class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo} hasOptions"
            style="margin-left: 0;display:flex!important;flex-direction:column;align-items:flex-start;gap:10px;margin-bottom:0;"
            data-obrigatorio="${obrigatorio}">
            
            <div id="listRadios_${input.unic}"
                data-vinculado=""
                data-campovinculado="monta_${input.tipo}_${input.unic}"
                class=""
                style="margin-bottom:35px;flex-direction:column;">
            
                <label style="
                    color: var(--text-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);"
                class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
            
                <div style="margin-top:10px;">
                    ${options}
                </div>
            </div>
        </div>
        `;
    },
    'select': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: `monta_${input.tipo}_${input.unic}`,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        let options = '';

        if (input.iconSize == 'button') {
            input.optionsCampo.forEach(op => {
                let value = op.optionName;
                var __nmA = (op.optionName || '').trim().toLowerCase();
                if (['selecione','seleccione','selecionar','seleccionar','selecciona'].indexOf(__nmA) !== -1) { value = ''; }
                options += `
                <button id="${op.id_option}" data-valor="${value}" type="button" onclick="selectOptionsBtns(this)" class="btn-cust select-option" data-container="container-for-${input.name}" data-target="monta_${input.tipo}_${input.unic}">
                        ${op.optionName}
                    </button>
                `;
            });
            return `
                <div
                    class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo} hasOptions"
                    data-vinculado=""
                    data-campogeral="${input.tipo}${input.unic}"
                    data-obrigatorio="${obrigatorio}"
                    data-campovinculado="monta_${input.tipo}_${input.unic}"
                    style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
                
                        <label style="
                            color: var(--text-color);
                            font-size: var(--font-size);
                            font-weight: var(--font-weight);"
                        class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
                        <input
                            id="monta_${input.tipo}_${input.unic}" 
                            class="form-control" 
                            type="hidden"
                            name="properties[${input.name}]">
                        <div>
                            ${options}
                        </div>
                </div>
            `;
        } else {
            input.optionsCampo.forEach(op => {
                let value = op.optionName;
                var __nm = (op.optionName || '').trim().toLowerCase();
                var __ph = (__nm === 'selecione' || __nm === 'seleccione' || __nm === 'selecionar' || __nm === 'seleccionar' || __nm === 'selecciona');
                if (__ph) { value = ''; }
                var __opt = `
                <option id="${op.id_option}" value="${value}" ${__ph ? 'disabled selected' : ''}>${op.optionName}</option>
                `;
                if (__ph) { options = __opt + options; } else { options += __opt; }
            });
            return `
            <div
                class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo} hasOptions"
                data-vinculado=""
                data-campogeral="${input.tipo}${input.unic}"
                data-obrigatorio="${obrigatorio}"
                data-campovinculado="monta_${input.tipo}_${input.unic}"
                style="margin-left: 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;width: 100%!important;">
            
                    <label style="
                        color: var(--text-color);
                        font-size: var(--font-size);
                        font-weight: var(--font-weight);"
                    class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
                    <select
                        id="monta_${input.tipo}_${input.unic}" 
                        class="form-control" 
                        name="properties[${input.name}]" 
                        style="height: 40px; padding: 0 10px;box-sizing: border-box;font-size: var(--input-font-size, inherit);">
                            ${options}
                    </select>
            </div>
            `;
        }
    },
    'selecao': (input) => {
        const obrigatorio = input.obrigatorio == '1';
        const max = input.max || false;
        personalizeInputs[input.name] = {
            container: `.campo-container.container-for-${input.name}.numero-${input.unic}.grupo-${input.grupo}`,
            inputId: `monta_${input.tipo}_${input.unic}`,
            obrigatorio: obrigatorio,
            variacoes: new Set(input.vinculado.split(';').filter(Boolean)) || new Set(),
            showVariacoes: input.showVariacoes,
            vinculadoCom: input.vinculoCom || [],
        };
        inputLabels[`${input.name}`] = input.titulo;
        let options = '';
        if (input.optionsCampo == false || input.optionsCampo.length == 0) {
            return "";
        }

        for (let i = 0; i < input.optionsCampo.length; i += 2) {
            options += `<div class="item" style="padding:0px; margin:0; display:flex; flex-direction: column; gap:10px;">`;

            // First item
            let op1 = input.optionsCampo[i];
            let radioId1 = `monta_${input.tipo}_${Date.now()}_${i}`;

            if (op1.link) {
                options += `
                    <div data-id="${op1.id}" class="galleryLabel select-images-container">
                        <a href="${op1.link}" target="_blank" style="cursor:pointer; text-decoration: none!important; display:block; width:100%; height:100%;">
                            <label
                                for="${radioId1}"
                                class="select-images ${input.iconSize || 'normal'}"
                                style="cursor:pointer;color: var(--text-color); font-size: var(--font-size); font-weight: var(--font-weight);">
                                <img style="cursor:pointer;object-fit:cover; width:100%; height:100%;" src="${op1.url}" alt="${pzNome(op1.nome)}"/>
                                <span>${pzNome(op1.nome)}</span>
                            </label>
                        </a>
                    </div>
                `;
            } else {
                options += `
                    <div data-id="${op1.id}" class="galleryLabel select-images-container">
                        <input
                            style="display:none;"
                            name="properties[${input.name}]"
                            value="${pzNome(op1.nome)}-${op1.id}"
                            id="${radioId1}" 
                            type="radio"/>
                        <label
                            for="${radioId1}"
                            class="select-images ${input.iconSize || 'normal'}"
                            style="color: var(--text-color); font-size: var(--font-size); font-weight: var(--font-weight);">
                            <img style="object-fit:cover; width:100%; height:100%;" src="${op1.url}" alt="${pzNome(op1.nome)}"/>
                            <span>${pzNome(op1.nome)}</span>
                        </label>
                    </div>
                `;
            }

            // Second item (if exists)
            if (input.optionsCampo[i + 1]) {
                let op2 = input.optionsCampo[i + 1];
                let radioId2 = `monta_${input.tipo}_${Date.now()}_${i + 1}`;

                if (op2.link) {
                    options += `
                        <div data-id="${op2.id}" class="galleryLabel select-images-container">
                            <a href="${op2.link}" target="_blank" style="cursor:pointer; text-decoration: none!important; display:block; width:100%; height:100%;">
                                <label
                                    for="${radioId2}"
                                    class="select-images ${input.iconSize || 'normal'}"
                                    style="cursor:pointer;color: var(--text-color); font-size: var(--font-size); font-weight: var(--font-weight);">
                                    <img style="cursor:pointer;object-fit:cover; width:100%; height:100%;" src="${op2.url}" alt="${pzNome(op2.nome)}"/>
                                    <span>${pzNome(op2.nome)}</span>
                                </label>
                            </a>
                        </div>
                    `;
                } else {
                    options += `
                        <div data-id="${op2.id}" class="galleryLabel select-images-container">
                            <input
                                style="display:none;"
                                name="properties[${input.name}]"
                                value="${pzNome(op2.nome)}-${op2.id}"
                                id="${radioId2}" 
                                type="radio"/>
                            <label
                                for="${radioId2}"
                                class="select-images ${input.iconSize || 'normal'}"
                                style="color: var(--text-color); font-size: var(--font-size); font-weight: var(--font-weight);">
                                <img style="object-fit:cover; width:100%; height:100%;" src="${op2.url}" alt="${pzNome(op2.nome)}"/>
                                <span>${pzNome(op2.nome)}</span>
                            </label>
                        </div>
                    `;
                }
            }

            options += `</div>`;
        }
        return `
        <div
            class="campo-container container-for-${input.name} numero-${input.unic} grupo-${input.grupo}"
            data-vinculado=""
            data-campovinculado="monta_${input.tipo}_${input.unic}"
            style="max-width:350px; overflow-x:hidden;">

            <div
                id="listImg_${input.unic}"
                data-vinculado=""
                data-obrigatorio="${obrigatorio}"
                data-campovinculado="monta_${input.tipo}_${input.unic}"
                data-campogeral="${input.tipo}${input.unic}"
                class=""
                style="margin-bottom:35px;">
                
                <label style="
                    color: var(--text-color);
                    font-size: var(--font-size);
                    font-weight: var(--font-weight);"
                class="">${input.titulo}${(obrigatorio) ? ' *' : ''}</label>
                    
                <div
                    id="monta_${input.tipo}_check_${input.unic}"
                    data-vinculado=""
                    style="">
                    <div class="owl-carousel owl-carousel-${input.iconSize || 'normal'} owl-theme">
                        ${options}
                    </div>
                </div>
            </div>
        </div>
        `;
    },
}

const generateCartHtml = {
    'product': (items) => {
        // verifica se tem inputLabels
        if (!inputLabels || Object.keys(inputLabels).length === 0) {
            // pega do localStorage
            inputLabels = pzParse(localStorage.getItem('inputLabels'), {});
        }
        items.forEach(item => {
            console.log("Processing cart item for personalization properties:", item);
            console.log("Current input labels:", inputLabels);
            // Append to cart item
            //const cartItem = document.querySelector(`.cart-item[data-item-id="${item.id}"] .cart-item-name-container`);
            const cartItem = document.querySelector(`.cart-item[data-item-id="${item.id}"] .cart-item-name`);
            console.log("Found cart item element:", cartItem);
            let personalizeProperties = document.querySelector(`.cart-item[data-item-id="${item.id}"] .personalize-properties`);
            console.log("Found personalize properties element:", personalizeProperties);
            if (cartItem) {
                if (!personalizeProperties) {
                    cartItem.insertAdjacentHTML("beforeend", "<div class='personalize-properties'></div>");
                    personalizeProperties = document.querySelector(`.cart-item[data-item-id="${item.id}"] .personalize-properties`);
                }
            } else {
                console.log(`Cart item with id "${item.id}" not found. Skipping personalization properties.`);
                return; // Skip further processing for this item
            }

            let html = '<span class="font-small">';
            if (item.properties) {
                const revertedProperties = {};
                Object.keys(item.properties).reverse().forEach(key => {
                    const keyParts = key.split('_');
                    const firstPart = keyParts[0];
                    if (inputLabels[firstPart]) {
                        key = firstPart;
                    }
                    console.log("Reverting property key:", key);
                    revertedProperties[key] = item.properties[key];
                });
                Object.entries(revertedProperties).forEach(([key, value]) => {
                    if (key === 'mockupComFundo' || key === 'mockupSemFundo') {
                        return; // Skip these keys
                    }
                    let label;
                    if (inputLabels[key]) {
                        label = inputLabels[key];
                    } else {
                        const input = document.querySelectorAll(`#personalize_app_container [name="properties[${key}]"]`);
                        if (input.length > 0) {
                            label = input[0].closest('.campo-container').querySelector('label').innerText.replace(' *', '');
                        } else {
                            return; // Skip if label not found because then its not a valid property from the personalize app
                        }
                    }
                    if (value && value.trim() !== "") {

                        //get the radio field by name and value to get the label
                        const radioField = document.querySelector(`#personalize_app_container [name="properties[${key}]"][value="${value}"]`);
                        if (radioField) {
                            const isImageRadio = radioField.closest('.select-images-container');
                            if (isImageRadio) {
                                const radioLabel = isImageRadio.querySelector('label span').innerText;
                                value = radioLabel;
                            }
                        }

                        html += `<strong>${label}:</strong> ${value}<br/>`;
                    }
                });
            }
            html += '</span>';

            if (personalizeProperties) {
                personalizeProperties.innerHTML = html;
            }
        });
        localStorage.setItem('inputLabels', JSON.stringify(inputLabels));
        //localStorage.setItem('cartPersonalizeProperties', JSON.stringify(items));
    },
}

// gera o dropzone
function generateDropzone() {
    return new Promise((resolve) => {
        const elements = $("#personalize_app_container .dropzone");
        console.log("Dropzone elements:", elements);

        if (elements.length > 0) {
            // Load Dropzone JS dynamically and wait for it to be ready
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "https://unpkg.com/dropzone@5/dist/min/dropzone.min.js";
            script.onload = function () {
                console.log("Dropzone script loaded!");

                // Optional: load Dropzone CSS if not already included
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = "text/css";
                link.href = "https://unpkg.com/dropzone@5/dist/min/dropzone.min.css";
                document.head.appendChild(link);

                elements.each(function (index, e) {
                    console.log("Initializing dropzone for element:", e);

                    // Prevent auto discover if needed
                    Dropzone.autoDiscover = false;

                    let drop = new Dropzone(e, {
                        url: "#", // dummy
                        autoProcessQueue: false,
                        addRemoveLinks: true,
                        dictRemoveFile: "Remover",
                        maxFiles: parseInt(e.dataset.max, 10) || 1,
                        maxFilesize: 20,
                        init: function () {
                            this.on("addedfile", function (file) {
                                //check filesize
                                if (file.size > 20 * 1024 * 1024) {
                                    alert("O arquivo " + file.name + " é muito grande. O tamanho máximo permitido é 20MB.");
                                    console.log("File too large:", file.name);
                                    this.removeFile(file);
                                    return;
                                }

                                const index = this.files.indexOf(file);
                                if (index >= this.options.maxFiles) {
                                    console.log("Blocking extra file:", file.name);
                                    this.removeFile(file);
                                    return;
                                }
                            });
                            this.on("removedfile", function (file) {
                                const inputEl = $("#" + e.dataset.campovinculado);
                                const value = inputEl.val().split(";").filter(v => v !== "");
                                console.log("Current input value before removal:", value);

                                if (file.serverId) {
                                    const newVal = value.filter(id => String(id) !== String(file.serverId));
                                    inputEl.val(newVal.join(";"));
                                    console.log("Updated input value after removal:", newVal);
                                }
                            });
                        },
                        accept: function (file, done) {
                            const inputEl = $("#" + e.dataset.campovinculado);

                            const dz = this;
                            const max = dz.options.maxFiles;
                            const uploaded = dz.files.filter(f => f.serverId).length;
                            const pending = dz.files.filter(f => !f.serverId);
                            const newIndex = pending.indexOf(file);
                            const allowedPending = max - uploaded;
                            if (newIndex >= allowedPending) {
                                dz.removeFile(file);
                                done("Upload limit reached");
                                return;
                            }

                            const reader = new FileReader();
                            reader.onload = function (event) {
                                const base64 = event.target.result;

                                $.ajax({
                                    url: `${baseUrl}Ajax/salvarArquivo`,
                                    method: "POST",
                                    data: {
                                        loja: LS.store.id,
                                        filename: file.name,
                                        filetype: file.type,
                                        base64: base64
                                    },
                                    success: function (res) {
                                        const response = pzParse(res, {});
                                        file.serverId = String(response.val);

                                        let ids = inputEl.val().split(";").filter(Boolean);

                                        ids.push(file.serverId);
                                        inputEl.val(ids.join(";"));
                                        const max = drop.options.maxFiles;
                                        if (ids.length > max) {
                                            const allowed = ids.slice(0, max);
                                            const removed = ids.slice(max);
                                            inputEl.val(allowed.join(";"));
                                        }

                                        console.log("File uploaded successfully:", file.name, response);

                                        drop.emit("success", file, res);
                                        drop.emit("complete", file);
                                        done();
                                    },
                                    error: function (err) {
                                        drop.emit("error", file, err);
                                        done("Upload failed");
                                    }
                                });
                            };
                            reader.readAsDataURL(file); // Convert to base64
                        }
                    });
                    console.log("Dropzone instance created:", drop);
                });
                resolve();
            };

            document.head.appendChild(script);
        } else {
            console.log("Nenhum elemento dropzone encontrado");
            resolve();
        }
    });
}

// gera os campos datepicker
function generateDatepickers() {
    const dateInputs = document.querySelectorAll('#personalize_app_container input.isDatepicker-date-available');

    // se tiver inputs de data, carrega o script do datepicker
    if (dateInputs.length > 0) {
        // carrega css
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://code.jquery.com/ui/1.14.2/themes/base/jquery-ui.css";
        document.head.appendChild(link);
        // carega js
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://code.jquery.com/ui/1.14.2/jquery-ui.js";
        script.onload = function () {
            console.log("jQuery UI script loaded, initializing datepickers.");
            dateInputs.forEach(input => {
                $(input).datepicker({
                    dateFormat: 'dd/mm/yy',
                    // Impede a seleção de datas passadas (opcional)
                    minDate: 0, 
                    beforeShowDay: function(date) {
                        // Formata a data atual do calendário para comparar com seu array
                        var string = jQuery.datepicker.formatDate('dd/mm/yy', date);
                        
                        // Se a data estiver no array, retorna [true] para habilitar
                        var habilitar = avaliableDates[input.id] && avaliableDates[input.id].indexOf(string) != -1;
                        return [habilitar, ""]; 
                    }
                });
            });
        };
        document.head.appendChild(script);
    }
}

// Utility: check if an element is visible
function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return (
        style.display !== 'none'
    );
}

// Function to validate all required fields including Dropzones
function validateRequiredFields(obrigatorios, btnComprar) {
    const allFilled = Array.from(obrigatorios).every((el) => {

        // check if is a mockup field
        console.log("verificando se é mockup",el);
        if (el.classList.contains('isMockupInput')) {
            const modal = document.getElementById('mockupModal');
            console.log("é mockup verifica se o modal esta visivel", modal);
            if (!isElementVisible(modal)) {
                // FIX: nao da mais bypass automatico. Valida o campo direto (modal fechado nao significa preenchido)
                console.log("modal fechado - validando conteudo do campo de mockup");
                const fieldM = el.querySelector('input, select');
                if (fieldM) {
                    if (fieldM.type === 'checkbox' || fieldM.type === 'radio') {
                        return !!el.querySelector('input:checked');
                    }
                    return fieldM.value.trim() !== '';
                }
                const dzM = el.querySelector('.dropzone');
                if (dzM && dzM.dropzone && dzM.dropzone.files.length > 0) return true;
                return false;
            }
        }

        // If not visible → treat as filled (FIX: nao aplica pra mockup, ja tratado acima)
        console.log("Checking visibility for element:", el);
        if (!isElementVisible(el)) {
            console.log("Element is not visible, treating as filled.");
            return true;
        }

        const field = el.querySelector('input, select');
        console.log("Validating field:", field);
        if (field) {
            const type = field.type;
            if (type === 'checkbox' || type === 'radio') {
                // For checkbox/radio groups, check if at least one is checked
                //const name = field.name;
                const checkedField = el.querySelector(`input:checked`);
                // const checkedField = el.querySelector(`input[name="${name}"]:checked`);
                return !!checkedField;
            }
            return field.value.trim() !== '';
        }

        const dzEl = el.querySelector('.dropzone');
        console.log("Validating Dropzone element:", dzEl);
        if (dzEl && dzEl.dropzone && dzEl.dropzone.files.length > 0) {
            return true;
        }

        return false;
    });

    if (allFilled) {
        console.log("✅ All required fields are filled.");
        enableButton(btnComprar);
        //if (btnComprar) btnComprar.removeAttribute("disabled");
    } else {
        console.log("❌ Not all required fields are filled.");
        disableButton(btnComprar);
        //if (btnComprar) btnComprar.setAttribute("disabled", "disabled");
    }
}
function disableButton(btn) {
    btn.setAttribute("disabled", "disabled");
    btn.disabled = true;
    btn.classList.add("disabled");
    btn.style.pointerEvents = "auto";

    // Block click as a final fail-safe
    /*btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
    }, { once: true });*/
}
function enableButton(btn) {
    btn.removeAttribute("disabled");
    btn.disabled = false;
    btn.classList.remove("disabled");
    //btn.style.pointerEvents = "";
}
function criarObrigatorios() {
    console.log("criando obrigatorios");

    const obrigatorios = document.querySelectorAll("[data-obrigatorio='true']");
    console.log("Obrigatórios encontrados:", obrigatorios);

    if (obrigatorios.length === 0) return;

    const btnComprar = document.querySelector("[data-store='product-buy-button']");
    if (btnComprar) {
        console.log("Disabling 'Comprar' button initially");
        //btnComprar.setAttribute("disabled", "disabled");
        disableButton(btnComprar);
    }

    obrigatorios.forEach((el) => {
        const inputs = el.querySelectorAll('input, select');
        console.log("Inputs found in required element:", inputs);

        const hasInputs = inputs.length > 0;
        const dropzoneEl = el.querySelector('.dropzone');
        const hasDropzone = !!(dropzoneEl && dropzoneEl.dropzone);

        if (!hasInputs && !hasDropzone) {
            console.log("No inputs or dropzone found in required element, skipping.");
            return;
        }

        // Attach change event to inputs
        inputs.forEach((input) => {
            console.log("Adding change event listener to input:", input);
            input.addEventListener('input', () => validateRequiredFields(obrigatorios, btnComprar));
        });

        // Attach Dropzone events
        if (hasDropzone) {
            dropzoneEl.dropzone.on("complete", () => validateRequiredFields(obrigatorios, btnComprar));
            dropzoneEl.dropzone.on("removedfile", () => validateRequiredFields(obrigatorios, btnComprar));
        }
    });

    // Initial validation
    validateRequiredFields(obrigatorios, btnComprar);
}

// Verifica a variação atual
function getInitialVariation() {
    // 1. Find the product container using its ID.
    const productContainer = document.getElementById('single-product');

    if (!productContainer) {
        console.log('Product container not found.');
        return;
    }

    // 2. Safely parse the JSON data from the `data-variants` attribute.
    let initialVariants = null;
    try {
        const variantsDataString = productContainer.getAttribute('data-variants');
        if (variantsDataString) {
            initialVariants = JSON.parse(variantsDataString);
        }
    } catch (e) {
        console.log('Failed to parse variant data:', e);
    }

    if (!initialVariants || initialVariants.length === 0) {
        console.warn('No initial variant data found.');
        return;
    }

    // 3. Find the currently selected option from the DOM.
    // Assuming a button-based variant selector like `.js-insta-variant`.
    const selectedOptionElement = document.querySelector('a.js-insta-variant.selected');
    let selectedOptionValue = null;

    if (selectedOptionElement) {
        // The option name is often stored in the `title` or `data-name` attribute.
        selectedOptionValue = selectedOptionElement.title || selectedOptionElement.getAttribute('data-name');
    }

    // 4. Find the matching variant from the parsed data.
    let defaultVariant = null;
    if (selectedOptionValue) {
        // Find the variant that has an 'option0' matching the selected value.
        defaultVariant = initialVariants.find(variant => variant.option0 === selectedOptionValue);
    } else {
        // Fallback to the first available variant if no option is pre-selected.
        defaultVariant = initialVariants.find(variant => variant.available);
    }

    // 5. Use the variant data.
    if (defaultVariant) {
        let variants = [
            defaultVariant.option0,
            defaultVariant.option1,
            defaultVariant.option2
        ];
        return variants;
    } else {
        console.log('Could not determine the initial variant.');
        return '';
    }
}
function verificarVariacao(variacao) {
    Object.values(personalizeInputs).forEach((input) => {
        if (input.showVariacoes == '0') {
            // showVariacoes desligado: campo aparece sempre, independente da variacao
            if (!input.vinculadoCom || input.vinculadoCom.length === 0) {
                const containerSemVar = document.querySelector(`${input.container}`);
                if (containerSemVar) containerSemVar.style.display = 'block';
            }
            console.log(`Input ${input.inputId} nao usa variacoes - exibindo sempre.`);
            return;
        }
        console.log("inputs variacoes size:", input.variacoes.size);
        if (input.variacoes.size > 0) {
            console.log("variações do input:", input.variacoes);
            const container = document.querySelector(`${input.container}`);
            if (container) {
                const inputEl = document.getElementById(input.inputId);
                let isVinculado = input.variacoes.has(variacao);
                console.log(`Input ${input.inputId} vinculado a variação ${variacao}:`, isVinculado);
                if (!isVinculado) {
                    // busca nas variações ativas se alguma está vinculada
                    const _pzScopeEl = document.querySelector("#personalize_app_container"); const _pzScope = (_pzScopeEl && _pzScopeEl.closest("form")) || document; const selectVariacoes = _pzScope.querySelectorAll(".js-variation-option:not(.form-control-small)");
                    for (let select of selectVariacoes) {
                        if (input.variacoes.has(select.value)) {
                            console.log(`Input ${input.inputId} vinculado a variação ${select.value} (ativa)`);
                            isVinculado = true;
                            break;
                        }
                    }
                }
                container.style.display = isVinculado ? 'block' : 'none';

                // PZ: mesmo problema do vinculo — campo escondido por causa da
                // variacao continuava sendo enviado pro carrinho.
                pzCampoVaiProCarrinho(container, isVinculado);

                if (!isVinculado && inputEl) {
                    console.log(`🧹 Clearing value of hidden input ${input.inputId}`);
                    inputEl.value = "";

                    const dropzoneEl = container.querySelector('.dropzone');
                    if (dropzoneEl && dropzoneEl.dropzone) {
                        console.log(`🧹 Removing files from dropzone for input ${input.inputId}`);
                        dropzoneEl.dropzone.removeAllFiles(true);
                    }
                }
            }
        }
    });

    //mockups
    Object.values(personalizeMockups).forEach((mockup) => {
        if (mockup.showVariacoes == '0') {
            // showVariacoes desligado: mockup aparece sempre, independente da variacao
            if (!mockup.vinculadoCom || mockup.vinculadoCom.length === 0) {
                const containerSemVar = document.querySelector(`${mockup.container}`);
                if (containerSemVar) containerSemVar.style.display = 'block';
            }
            console.log(`Mockup ${mockup.container} nao usa variacoes - exibindo sempre.`);
            return;
        }
        console.log("mockup variacoes size:", mockup.variacoes.size);
        if (mockup.variacoes.size > 0) {
            console.log("variações do mockup:", mockup.variacoes);
            const container = document.querySelector(`${mockup.container}`);
            if (container) {
                let isVinculado = mockup.variacoes.has(variacao);
                console.log(`Mockup ${mockup.container} vinculado a variação ${variacao}:`, isVinculado);
                if (!isVinculado) {
                    // busca nas variações ativas se alguma está vinculada
                    const _pzScopeEl = document.querySelector("#personalize_app_container"); const _pzScope = (_pzScopeEl && _pzScopeEl.closest("form")) || document; const selectVariacoes = _pzScope.querySelectorAll(".js-variation-option:not(.form-control-small)");
                    for (let select of selectVariacoes) {
                        if (mockup.variacoes.has(select.value)) {
                            console.log(`Mockup ${mockup.container} vinculado a variação ${select.value} (ativa)`);
                            isVinculado = true;
                            break;
                        }
                    }
                }
                container.style.display = isVinculado ? 'block' : 'none';

            }
        }
    });
}

// verifica o vinculo entre campos
/**
 * PZ: esconder um campo NAO impede ele de ir pro carrinho.
 *
 * `display:none` some da tela, mas o input continua dentro do <form> e e
 * enviado do mesmo jeito. Era por isso que, com campos condicionais (o cliente
 * escolhe "Foil" OU "Textil"), os DOIS desenhos chegavam no pedido mesmo ele
 * marcando um so: o campo escondido continuava com o radio marcado.
 *
 * Aqui o campo escondido e desligado de verdade:
 *   - desabilita os controles (input desabilitado nao e serializado no envio);
 *   - zera valor/marcacao, porque tem tema que monta o carrinho lendo os
 *     `properties[...]` na mao, sem olhar se o campo esta desabilitado.
 * Quando o campo volta a aparecer, religa SO o que foi desligado por aqui, pra
 * nao reativar algo que o tema tenha desabilitado por conta propria.
 */
function pzCampoVaiProCarrinho(container, vai) {
    if (!container) return;
    const controles = container.querySelectorAll('input, select, textarea');
    controles.forEach((el) => {
        if (vai) {
            if (el.getAttribute('data-pz-fora-do-carrinho') === '1') {
                el.disabled = false;
                el.removeAttribute('data-pz-fora-do-carrinho');
            }
            return;
        }
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
        } else if (el.type !== 'file') {
            el.value = '';
        }
        if (!el.disabled) {
            el.disabled = true;
            el.setAttribute('data-pz-fora-do-carrinho', '1');
        }
    });
}

/** PZ: a opcao que comanda o campo condicional esta marcada? */
function pzOpcaoMarcada(optionId) {
    const optionEl = document.getElementById(optionId);
    if (!optionEl) return false;
    if (optionEl.type === 'checkbox' || optionEl.type === 'radio') {
        return optionEl.checked;
    }
    // verifica se e um button
    if (optionEl.type === 'button') {
        return optionEl.classList.contains('selected');
    }
    // se for select o id esta direto na option e nao no input
    return !!optionEl.selected;
}

/**
 * PZ: parte "campos" do verificarVinculo, separada pra poder ser reaplicada
 * na hora de comprar sem mexer no bloco dos mockups (que liga/desliga o botao
 * de compra e nao pode rodar no meio do clique).
 */
function pzVinculoCampos() {
    Object.values(personalizeInputs).forEach((input) => {
        if (!input.vinculadoCom || input.vinculadoCom.length === 0) {
            return;
        }
        const container = document.querySelector(`${input.container}`);
        if (container) {
            const inputEl = document.getElementById(input.inputId);
            // PZ: o campo pode estar ligado a mais de uma opcao — basta uma
            // marcada pra ele aparecer. Antes so a primeira era olhada.
            const idsOpcao = input.vinculadoCom
                .map((v) => v && v.id_option)
                .filter(Boolean);
            const isVinculado = idsOpcao.some(pzOpcaoMarcada);

            console.log(`Input ${input.inputId} vinculado a opção ${idsOpcao.join(', ')}:`, isVinculado);
            container.style.display = isVinculado ? 'block' : 'none';

            // escondido = fora do carrinho (zera e desabilita os controles)
            pzCampoVaiProCarrinho(container, isVinculado);

            if (!isVinculado) {
                if (inputEl) {
                    console.log(`🧹 Clearing value of hidden input ${input.inputId}`);
                    inputEl.value = "";
                }

                const dropzoneEl = container.querySelector('.dropzone');
                if (dropzoneEl && dropzoneEl.dropzone) {
                    console.log(`🧹 Removing files from dropzone for input ${input.inputId}`);
                    dropzoneEl.dropzone.removeAllFiles(true);
                }
            }
        }
    });
}

function verificarVinculo() { 
    console.log("Verificando vinculo entre campos e opções...");
    console.log("personalizeInputs",personalizeInputs);
    pzVinculoCampos();

    // mockups
    console.log("personalizeMockups",personalizeMockups);
    Object.values(personalizeMockups).forEach((mockup) => {
        if (!mockup.vinculadoCom || mockup.vinculadoCom.length === 0) {
            return;
        }
        const container = document.querySelector(`${mockup.container}`);
        const containerTermos = document.querySelector(`.mockup-termos-desk`);
        if (container) {
            let isVinculado = false;
            const optionId = mockup.vinculadoCom[0].id_option;
            // get option e verifica se esta marcadaa
            const optionEl = document.getElementById(optionId);
            if (optionEl) {
                if (optionEl.type === 'checkbox' || optionEl.type === 'radio') {
                    isVinculado = optionEl.checked;
                } else {
                    // verifica se é button
                    if (optionEl.type === 'button') {
                        // valida se tem a classe 'selected'
                        isVinculado = optionEl.classList.contains('selected');
                    } else {   
                        // se for select o id esta direto na option e não no input so verifica se a option est "selected"
                        isVinculado = optionEl.selected;
                    }
                }
            }
            console.log(`Mockup ${mockup.container} vinculado a opção ${optionId}:`, isVinculado);
            container.style.display = isVinculado ? 'block' : 'none';
            containerTermos.style.display = isVinculado ? 'block' : 'none';

            if (!isVinculado) {
                const btnComprar = document.querySelector("[data-store='product-buy-button']");
                enableButton(btnComprar);
                // limpa todos on inputs do mockup
                const mockupModalCampos = document.getElementById(`mockupModalCampo`);
                if (mockupModalCampos) {
                    mockupModalCampos.querySelectorAll('input, textarea, select').forEach(input => {
                        input.value = '';
                    });
                }
            }else{
                const btnComprar = document.querySelector("[data-store='product-buy-button']");
                disableButton(btnComprar);
            }
        }
    });
}

// adicionas as fontes
function loadFontes(fontes) {
    if (fontes && fontes.length > 0) {
        // evita duplicar fontes quando loadFontes roda mais de uma vez
        $('select.font-select option[value!=""]').remove();
        fontes.forEach(font => {
            const [fontName] = font.path.split('/').slice(-1);
            $(`<style>@font-face { font-family: '${font.name}'; src: url('${baseUrl}Ajax/font/${fontName}'); }</style>`).appendTo('head');
            $(`<a style="font-family: '${font.name}'; visibility: hidden;">.</a>`).appendTo('body');
            $(`select.font-select`).append(`
                <option style="font-family: '${font.name}';" value="${font.name}">${font.name}</option>
            `);
        });
    } else {
        console.warn("No fonts available to load.");
    }
}
function selectFont() {
    const target = $(this).data('target');
    console.log("Changing font for target:", target, "to font:", $(this).val());
    $(`#${target}`).css('font-family', $(this).val());
}

// personalization
/**
 * Folha de estilo que consome as variaveis salvas no customizador.
 * Sem isso, o storefront so usava --text-color/--font-size/--font-weight nos
 * rotulos: cor de fundo, margem interna, cor e arredondamento da borda e cores
 * de botao eram salvos no app, apareciam na pre-visualizacao e nunca chegavam
 * na loja. Escopo em .pz-custom-on pra loja que nunca abriu o customizador
 * continuar exatamente com o estilo do tema.
 */
function pzInjetaCssCustomizacao() {
    if (document.getElementById('pz-custom-style')) return;

    const css = `
    .campo-container.pz-custom-on .form-control,
    .campo-container.pz-custom-on input.form-control,
    .campo-container.pz-custom-on select.form-control,
    .campo-container.pz-custom-on textarea.form-control {
        /* cor propria do campo; sem ela salva, herda a do rotulo (como era antes) */
        color: var(--input-text-color, var(--text-color)) !important;
        background-color: var(--background-color) !important;
        padding: var(--padding) !important;
        border: solid 1px var(--border-color) !important;
        border-radius: var(--border-radius) !important;
        font-weight: var(--font-weight) !important;
        text-transform: var(--text-transform, none) !important;
    }
    .campo-container.pz-custom-on .form-control:focus {
        border-color: var(--focus-color) !important;
        box-shadow: 0 0 5px var(--focus-color) !important;
        outline: none !important;
    }
    .campo-container.pz-custom-on input[type="color"].form-control {
        padding: 0 !important;
    }
    .campo-container.pz-custom-on button.btn-cust {
        color: var(--text-color-btn) !important;
        background-color: var(--background-color-btn) !important;
        border: solid 1px var(--border-color) !important;
        border-radius: var(--border-radius) !important;
        padding: var(--padding) !important;
        font-weight: var(--font-weight) !important;
    }
    .campo-container.pz-custom-on button.btn-cust:hover,
    .campo-container.pz-custom-on button.btn-cust:focus {
        color: var(--text-color-btn-hover) !important;
        background-color: var(--background-color-btn-hover) !important;
        border-color: var(--focus-color) !important;
    }`;

    const tag = document.createElement('style');
    tag.id = 'pz-custom-style';
    tag.textContent = css;
    document.head.appendChild(tag);
}

/**
 * text-transform muda so a APARENCIA. Se o lojista escolheu MAIUSCULAS, o
 * cliente ve "MARIA" mas o pedido chegaria "maria" e a peca sairia errada.
 * Aqui normalizamos o valor digitado para bater com o que esta na tela.
 * Delegado no document: pega tambem campo criado depois (variacao, kit).
 */
function pzAplicaCaixaNoValor() {
    if (window.__pzCaixaLigado) return;
    window.__pzCaixaLigado = true;

    document.addEventListener('input', function (ev) {
        const el = ev.target;
        if (!el || !el.classList || !el.classList.contains('form-control')) return;
        if (el.tagName === 'SELECT' || el.type === 'color' || el.type === 'file') return;
        if (!el.closest || !el.closest('.campo-container.pz-custom-on')) return;

        let caixa;
        try { caixa = window.getComputedStyle(el).textTransform; } catch (e) { return; }

        let novo;
        if (caixa === 'uppercase')      novo = el.value.toUpperCase();
        else if (caixa === 'lowercase') novo = el.value.toLowerCase();
        else return;

        if (novo === el.value) return;

        // preserva o cursor: trocar o value joga o caret pro fim
        const ini = el.selectionStart, fim = el.selectionEnd;
        el.value = novo;
        try { el.setSelectionRange(ini, fim); } catch (e) {}
    });
}

function applyInlineCssVariables(styleMap) {
    for (const id in styleMap) {
        // if styleMap[id] is empty continue
        if (!styleMap[id] || styleMap[id].trim() === "") {
            console.log("No styles to apply for id:", id);
            continue;
        }

        let variables;
        try {
            variables = JSON.parse(styleMap[id]);
        } catch (e) {
            console.log("Personalizacoes invalidas para o grupo", id, e);
            continue;
        }
        // Um JSON valido pode nao ser objeto (ex.: string dupla-codificada).
        // Antes isso virava Object.entries(string) e aplicava lixo silenciosamente.
        if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
            console.log("Personalizacoes do grupo", id, "nao sao um objeto:", variables);
            continue;
        }

        console.log("Applying inline CSS variables for id:", id, "with styles:", variables);

        const containers = document.querySelectorAll(`.grupo-${id}`);
        console.log("Found containers for grupo id", id, ":", containers);
        if (!containers.length) continue;

        pzInjetaCssCustomizacao();
        pzAplicaCaixaNoValor();

        containers.forEach(container => {
            Object.entries(variables).forEach(([key, value]) => {
                if (typeof key === 'string' && key.startsWith('--')) {
                    container.style.setProperty(key, value);
                }
            });
            // marca o container: so quem tem personalizacao salva recebe o estilo
            container.classList.add('pz-custom-on');
        });
    }
}

// função que vai rodar quando clicar nos botões do select
function selectOptionsBtns(btn) {
    const containerClass = btn.dataset.container;
    const targetId = btn.dataset.target;
    const target = document.getElementById(targetId);

    if (!target) {
        console.log("Target element not found for id:", targetId);
        return;
    }
    
    const buttons = document.querySelectorAll(`.${containerClass} .select-option`);
    buttons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    target.value = btn.dataset.valor;

    verificarVinculo();

    const obrigatorios = document.querySelectorAll("[data-obrigatorio='true']");

    if (obrigatorios.length === 0) return;

    const btnComprar = document.querySelector("[data-store='product-buy-button']");

    validateRequiredFields(obrigatorios, btnComprar);
}

// ============ FIX BENESSE v3.2: interceptor universal (msg inline abaixo do botao) ============
(function PZ_BUY_INTERCEPTOR(){
    var BUY_SELECTOR = "[data-store='product-buy-button'], [data-testid='buy-now-panel-button'], button[name='add'], .js-cart-add";

    function isVis(el){
        if (!el) return false;
        var st = window.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return false;
        var r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }
    function isFilled(el){
        var f = el.querySelector('input, select, textarea');
        if (f) {
            if (f.type === 'checkbox' || f.type === 'radio') return !!el.querySelector('input:checked');
            return f.value && f.value.trim() !== '';
        }
        var dz = el.querySelector('.dropzone');
        if (dz && dz.dropzone && dz.dropzone.files.length > 0) return true;
        return false;
    }
    function getEmpty(){
        var faltam = [];
        var obr = document.querySelectorAll("[data-obrigatorio='true']");
        for (var i = 0; i < obr.length; i++) {
            if (!isVis(obr[i])) continue;
            if (!isFilled(obr[i])) faltam.push(obr[i]);
        }
        return faltam;
    }

    function ensureStyles(){
        if (document.getElementById('pz-inline-styles')) return;
        var st = document.createElement('style');
        st.id = 'pz-inline-styles';
        st.textContent = `
.pz-buy-msg { display: flex; align-items: flex-start; gap: 10px; margin-top: 10px; padding: 12px 14px; background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; font-size: 13px; color: #7f1d1d; animation: pz-msg-in .25s ease; }
.pz-buy-msg .pz-msg-ico { flex: 0 0 20px; height: 20px; border-radius: 50%; background: #dc2626; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; line-height: 1; }
.pz-buy-msg .pz-msg-text { flex: 1; line-height: 1.45; }
.pz-buy-msg .pz-msg-text b { color: #991b1b; }
@keyframes pz-msg-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.pz-field-highlight { box-shadow: 0 0 0 3px #dc2626 !important; border-radius: 6px !important; transition: box-shadow .2s; }
`;
        document.head.appendChild(st);
    }

    function showMsg(btn, qtd){
        ensureStyles();
        // remove mensagens anteriores em qualquer lugar (pode ter mais de um botao)
        document.querySelectorAll('.pz-buy-msg').forEach(function(m){ m.remove(); });
        var msgEl = document.createElement('div');
        msgEl.className = 'pz-buy-msg';
        var qtdTxt = qtd === 1 ? '1 campo obrigatorio' : qtd + ' campos obrigatorios';
        msgEl.innerHTML = '<span class="pz-msg-ico">!</span><div class="pz-msg-text"><b>Personalização pendente.</b> Preencha ' + qtdTxt + ' antes de finalizar a compra.</div>';
        // Inserir logo apos o botao (ou seu container mais proximo razoavel)
        var anchor = btn.closest('.product-buy-container, .product-buy, .buy-area, form, .col-12') || btn.parentNode;
        // Se o botao tem irmaos visiveis, melhor inserir depois do proprio botao
        if (btn.parentNode) {
            btn.parentNode.insertBefore(msgEl, btn.nextSibling);
        } else if (anchor) {
            anchor.appendChild(msgEl);
        } else {
            document.body.appendChild(msgEl);
        }
        // auto-fade depois de 6s
        setTimeout(function(){
            if (msgEl && msgEl.parentNode) {
                msgEl.style.transition = 'opacity .3s';
                msgEl.style.opacity = '0';
                setTimeout(function(){ if (msgEl.parentNode) msgEl.remove(); }, 320);
            }
        }, 6000);
        return msgEl;
    }

    function clearMsg(){
        document.querySelectorAll('.pz-buy-msg').forEach(function(m){ m.remove(); });
    }

    function intercept(ev){
        var t = ev.target;
        var btn = t.closest ? t.closest(BUY_SELECTOR) : null;
        if (!btn) return;
        var faltam = getEmpty();
        if (faltam.length === 0) { clearMsg(); return; }
        ev.preventDefault();
        ev.stopImmediatePropagation();
        ev.stopPropagation();
        var first = faltam[0];
        try { first.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e) { first.scrollIntoView(); }
        first.classList.add('pz-field-highlight');
        setTimeout(function(){ first.classList.remove('pz-field-highlight'); }, 2500);
        showMsg(btn, faltam.length);
        return false;
    }

    // PZ MULTI-CHECKBOX FIX: varios checkboxes com o mesmo name properties[x] chegam como "Array".
    // Junta os marcados em um unico hidden (", ") e desabilita os checkboxes so no momento do envio.
    function pzMergeMultiCheckbox(){
        try {
            var cont = document.getElementById('personalize_app_container') || document;
            var chks = cont.querySelectorAll('input[type="checkbox"][name^="properties["]');
            var grupos = {};
            for (var i = 0; i < chks.length; i++) {
                var nm = chks[i].getAttribute('name');
                if (!nm) continue;
                if (!grupos[nm]) grupos[nm] = [];
                grupos[nm].push(chks[i]);
            }
            Object.keys(grupos).forEach(function(nm){
                var itens = grupos[nm];
                if (itens.length < 2) return; // campo de um unico checkbox (ex.: termo) continua igual
                var vals = [];
                for (var j = 0; j < itens.length; j++) {
                    if (itens[j].checked) vals.push(itens[j].value);
                    itens[j].setAttribute('data-pz-name', nm);
                    itens[j].disabled = true; // desabilitado nao e enviado
                }
                var hid = cont.querySelector('input[type="hidden"][data-pz-multi="' + nm + '"]');
                if (!hid) {
                    hid = document.createElement('input');
                    hid.type = 'hidden';
                    hid.setAttribute('data-pz-multi', nm);
                    itens[0].parentNode.appendChild(hid);
                }
                hid.name = nm;
                hid.value = vals.join(', ');
            });
            // reabilita logo depois, para o usuario continuar interagindo se o envio falhar
            setTimeout(function(){
                for (var k = 0; k < chks.length; k++) {
                    if (chks[k].getAttribute('data-pz-name')) chks[k].disabled = false;
                }
            }, 1500);
        } catch (ePzMulti) { console.log('PZ multi-checkbox fix:', ePzMulti); }
    }
    document.addEventListener('click', function(ev){
        var b = ev.target && ev.target.closest ? ev.target.closest(BUY_SELECTOR) : null;
        if (b) pzMergeMultiCheckbox();
    }, true);
    document.addEventListener('submit', function(){ pzMergeMultiCheckbox(); }, true);

    document.addEventListener('click', intercept, true);
    document.addEventListener('submit', function(ev){
        var form = ev.target;
        if (form && form.querySelector && form.querySelector(BUY_SELECTOR)) {
            if (getEmpty().length > 0) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                intercept({target: form.querySelector(BUY_SELECTOR), preventDefault:function(){}, stopImmediatePropagation:function(){}, stopPropagation:function(){}});
            }
        }
    }, true);
    // Quando o usuario preenche algum campo, esconde a mensagem
    document.addEventListener('input', function(){ if (getEmpty().length === 0) clearMsg(); }, true);
    document.addEventListener('change', function(){ if (getEmpty().length === 0) clearMsg(); }, true);
    console.log('PZ_BUY_INTERCEPTOR v3.2 instalado (msg inline)');
})();
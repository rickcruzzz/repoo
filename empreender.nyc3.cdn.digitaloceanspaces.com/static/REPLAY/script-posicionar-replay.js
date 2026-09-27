;(async function () {
  let store_id = ''
  let platform = ''
  const logo = 'https://app.replay.com.br/logos/replay-logo.png'
  const front_url = 'https://app.replay.com.br/'
  // const front_url = 'http://localhost:3000'
  const params = new URLSearchParams(window.location.search)
  const getUrlReturn = params.get('return')
  const typeEditor = params.get('position_template')
  const languageEditor = params.get('language')
  const editor = params.get('editor')
  const iframeContainer = 'container-iframe-storix'
  const textsEditor = {
    'pt-br': {
      Salvar: 'Salvar',
      Selecionar: 'Selecionar',
      CustomSelectorLabel: 'Se quiser adicionar classe, id ou xpath',
      PositionLabel: 'Posição do elemento',
      Append: 'Adicionar no final',
      Prepend: 'Adicionar no início',
      Before: 'Inserir antes',
      After: 'Inserir depois',
    },
    'es-mx': {
      Salvar: 'Guardar',
      Selecionar: 'Seleccionar',
      CustomSelectorLabel: 'Si desea agregar clase, id o xpath',
      PositionLabel: 'Posición del elemento',
      Append: 'Agregar al final',
      Prepend: 'Agregar al inicio',
      Before: 'Insertar antes',
      After: 'Insertar después',
    },
  }

  var elemento
  var saveUrl = ''
  var selectedPosition = 'append'
  var BASE_URL_SAMPLE = 'https://reels.empreender.plus'

  function getUrlPreview(saveUrl) {
    switch (typeEditor) {
      case 'floating':
        return `${BASE_URL_SAMPLE}/floating?xpath=${saveUrl}`
      case 'feed':
        return `${BASE_URL_SAMPLE}/feed/?xpath=${saveUrl}`
      case 'carousel':
        return `${BASE_URL_SAMPLE}/carousel/?xpath=${saveUrl}`
      default:
        return `${BASE_URL_SAMPLE}/example?xpath=${saveUrl}`
    }
  }

  function getSaveUrl(saveUrl) {
    const validTemplates = ['floating', 'feed', 'carousel']
    const positionTemplate = validTemplates.includes(typeEditor) ? typeEditor : 'carousel'
    const baseUrl = getUrlReturn
    const separator = baseUrl.includes('?') ? '&' : '?'

    return `${baseUrl}${separator}position_template=${positionTemplate}&xpath=${saveUrl}&method=${selectedPosition}`
  }

  function init() {
    if (window.hasOwnProperty('LS')) {
      store_id = LS?.store?.id
      lily_product_id = LS?.product?.id
      platform = 'nuvemshop'
    } else if (window.hasOwnProperty('__st')) {
      store_id = window?.__st?.a
      lily_product_id = window?.meta?.product?.id
      platform = 'shopify'
    } else if (window.hasOwnProperty('onCartx')) {
      store_id = onCartx?.oncartx_domain
      const element = document.getElementById('ProductJson')?.innerHTML
      lily_product_id = element ? JSON.parse(element)?.id : JSON?.parse(document.querySelector('[data-product-json]')?.innerHTML)?.product?.id
      platform = 'cartpanda'
    } else if (window.hasOwnProperty('LOJA_ID')) {
      store_id = LOJA_ID
      lily_product_id = window?.PRODUTO_ID
      platform = 'loja_integrada'
    } else if (window.hasOwnProperty('dooca')) {
      store_id = window?.dooca?.shop_id
      lily_product_id = window?.dooca?.product?.id
      platform = 'bagy'
    } else if (document.getElementById('pageview-script')?.dataset.hasOwnProperty('store')) {
      const dataTray = document.getElementById('pageview-script').dataset
      store_id = dataTray.store
      lily_product_id = dataLayer[0]?.idProduct ? dataLayer[0]?.idProduct : dataTray.productId
      platform = 'tray'
    } else if (window.hasOwnProperty('__PRELOADED_STATE__')) {
      store_id = __PRELOADED_STATE__.initialState.shops_validator?.shop?.id
        ? __PRELOADED_STATE__.initialState.shops_validator?.shop?.id
        : __PRELOADED_STATE__.initialState.shops_validator?.storefront?.id
      lily_product_id = __PRELOADED_STATE__.initialState.history.id
      platform = 'mercadoshop'
    } else {
      if (window.hasOwnProperty('dataNavigation')) {
        store_id = window?.dataNavigation?.storeId
        lily_product_id = window?.dataNavigation?.id
        platform = 'tray'
      } else {
        if (document.querySelector('html[data-store]')?.dataset?.store) {
          store_id = document.querySelector('html[data-store]')?.dataset?.store
          lily_product_id = document.querySelector('form[data-app="product.buy-form"]')?.dataset?.id
          if (!lily_product_id) {
            lily_product_id = document.querySelector('form[data-app="product.buy-form"] [data-product-id]')?.getAttribute('data-product-id')
          }
          platform = 'tray'
        }
      }
    }
    platformPreview = `${store_id}/${platform}`
  }
  function addStyles(target, styles) {
    Object.entries(styles).forEach((entry) => {
      const [key, value] = entry
      target.style[key] = value
    })
  }

  function addAttribs(target, attribs) {
    Object.entries(attribs).forEach((entry) => {
      const [key, value] = entry
      target[key] = value
    })
  }

  function createElements(tag, styles, attribs) {
    const object = document.createElement(tag)
    if (styles) {
      addStyles(object, styles)
    }
    if (attribs) {
      addAttribs(object, attribs)
    }
    return object
  }

  function GetPathTo(element) {
    if (element?.id !== '' && element?.id !== undefined) return "//*[@id='" + element.id + "']"

    if (element === document.body) return '//' + element.tagName.toLowerCase()

    var ix = 0
    var siblings = element?.parentNode?.childNodes
    for (var i = 0; i < siblings?.length; i++) {
      var sibling = siblings[i]

      if (sibling === element) return GetPathTo(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']'

      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++
      }
    }
  }

  function addEvents(target, event, styles, attribs, func) {
    target.addEventListener(event, (e) => {
      if (styles) {
        addStyles(target, styles)
      }
      if (attribs) {
        addStyles(target, styles)
      }
      if (func) {
        func(e)
      }
    })
  }

  function getTexts(chave) {
    return textsEditor[languageEditor][chave]
  }

  if (typeEditor) {
    init()

    const body = document.getElementsByTagName('body')[0]

    const main = createElements(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        position: 'fixed',
        width: '353.14px',
        height: 'auto',
        padding: '12px',
        left: 'calc(50% - 162px)',
        top: '157px',
        background: '#FFFFFF',
        boxShadow: '0px 0px 8px rgba(0, 0, 0, 0.25)',
        borderRadius: '12px',
        zIndex: '99999999999999999999',
        boder: '1px solid #D3DAE3',
        'box-sizing': 'initial',
      },
      { id: 'editorposicao' }
    )

    const logoLilyVideo = createElements(
      'img',
      {
        width: '24px',
        flex: 'none',
        order: '0',
        'flex-grow': '0',
      },
      { id: 'editorposicao', src: logo }
    )

    const selecionar = createElements(
      'div',
      {
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px 16px',
        gap: '8px',
        width: '120px',
        height: '36px',
        background: '#A0A2A6',
        border: '1px solid #D3DAE3',
        borderRadius: '8px',
        flex: 'none',
        order: '1',
        flexGrow: '0',
        cursor: 'pointer',
      },
      { id: 'editorposicao' }
    )

    const selecionarIcon = createElements(
      'img',
      {
        flex: 'none',
        order: 0,
        'flex-grow': 0,
        width: '16px',
        height: '16px',
      },
      {
        src: 'https://api.lily.com.br/imgs/iconoir_frame-select.svg',
        id: 'editorposicao',
      }
    )
    selecionar.appendChild(selecionarIcon)

    const selecionarText = createElements(
      'span',
      {
        width: '60px',
        height: '15px',
        fontStyle: 'normal',
        fontWeight: '400',
        fontSize: '12px',
        lineHeight: '15px',
        textAlign: 'center',
        alignItems: 'center',
        color: '#FFFFFF',
        flex: 'none',
        order: '1',
        flexGrow: '0',
      },
      {
        innerText: getTexts('Selecionar'),
        id: 'editorposicao',
      }
    )
    selecionar.appendChild(selecionarText)

    const salvar = createElements(
      'div',
      {
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px 16px',
        gap: '8px',
        width: '120px',
        height: '36px',
        background: '#00803B',
        borderRadius: '8px',
        flex: 'none',
        order: '1',
        flexGrow: '0',
        cursor: 'pointer',
      },
      {
        id: 'editorposicao',
      }
    )

    const salvarIcon = createElements(
      'img',
      {
        flex: 'none',
        order: 0,
        'flex-grow': 0,
        width: '16px',
        height: '16px',
      },
      {
        src: 'https://api.lily.com.br/imgs/fluent_save-16-regular.svg',
        id: 'editorposicao',
      }
    )
    salvar.appendChild(salvarIcon)

    const salvarText = createElements(
      'span',
      {
        width: '35px',
        height: '15px',
        fontStyle: 'normal',
        fontWeight: '400',
        fontSize: '12px',
        lineHeight: '15px',
        textAlign: 'center',
        alignItems: 'center',
        color: '#FFFFFF',
        flex: 'none',
        order: '1',
        flexGrow: '0',
      },
      {
        innerText: getTexts('Salvar'),
        id: 'editorposicao',
      }
    )
    salvar.appendChild(salvarText)

    const customSelectorContainer = createElements(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        gap: '4px',
        marginTop: '8px',
      },
      { id: 'editorposicao-custom' }
    )

    const customSelectorLabel = createElements(
      'label',
      {
        fontSize: '12px',
        color: '#6B7280',
        marginBottom: '2px',
      },
      {
        innerText: getTexts('CustomSelectorLabel'),
        for: 'custom-replay-selector-input',
      }
    )

    const customSelectorInput = createElements(
      'input',
      {
        width: '100%',
        padding: '8px',
        border: '1px solid #D1D5DB',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
      },
      {
        id: 'custom-replay-selector-input',
        type: 'text',
        placeholder: '.class, #id, //*[@id="example"]',
      }
    )

    customSelectorContainer.appendChild(customSelectorLabel)
    customSelectorContainer.appendChild(customSelectorInput)

    // Position method selector
    const positionContainer = createElements(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        gap: '4px',
        marginTop: '8px',
      },
      { id: 'editorposicao-position' }
    )

    const positionLabel = createElements(
      'label',
      {
        fontSize: '12px',
        color: '#6B7280',
        marginBottom: '2px',
      },
      {
        innerText: getTexts('PositionLabel'),
        for: 'position-method-select',
      }
    )

    const positionSelect = createElements(
      'select',
      {
        width: '100%',
        padding: '8px',
        border: '1px solid #D1D5DB',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
      },
      {
        id: 'position-method-select',
      }
    )

    // Create options for the select
    const positionOptions = [
      { value: 'append', text: getTexts('Append') },
      { value: 'prepend', text: getTexts('Prepend') },
      { value: 'before', text: getTexts('Before') },
      { value: 'after', text: getTexts('After') },
    ]

    positionOptions.forEach((option) => {
      const optionElement = createElements(
        'option',
        {},
        {
          value: option.value,
          innerText: option.text,
          selected: option.value === 'append', // Set append as default
        }
      )
      positionSelect.appendChild(optionElement)
    })

    positionContainer.appendChild(positionLabel)
    positionContainer.appendChild(positionSelect)

    const buttonsContainer = createElements(
      'div',
      {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        width: '100%',
      },
      { id: 'editorposicao-buttons' }
    )

    buttonsContainer.appendChild(logoLilyVideo)
    buttonsContainer.appendChild(selecionar)
    buttonsContainer.appendChild(salvar)

    main.appendChild(buttonsContainer)
    main.appendChild(customSelectorContainer)
    main.appendChild(positionContainer)
    body.appendChild(main)

    // Layout fim

    // Funcoes
    addEvents(selecionar, 'mouseenter', {}, {}, () => {
      if (!isSelected && saveUrl.length == 0) {
        selecionar.style.background = '#A0A2A6ee'
      }
    })

    addEvents(selecionar, 'mouseleave', {}, {}, () => {
      if (!isSelected && saveUrl.length == 0) {
        selecionar.style.background = '#A0A2A6'
      }
    })

    addEvents(selecionar, 'click', {}, {}, (e) => {
      if (!isSelected) {
        selecionar.style.background = '#1F85D7'
        selecionarText.style.color = '#FFFFFF'
        isSelected = true
        if (elemento) {
          RemoveSelected(elemento)
          selecionar.style.background = '#A0A2A6'
          selecionarText.style.color = '#FFFFFF'
          isSelected = false
        }
      } else {
        selecionar.style.background = '#A0A2A6'
        selecionarText.style.color = '#FFFFFF'
        isSelected = false
      }
    })

    addEvents(salvar, 'click', {}, {}, async (e) => {
      const customValue = document.getElementById('custom-replay-selector-input').value
      if (customValue) {
        saveUrl = customValue
      }
      if (saveUrl.length > 0) {
        location.replace(getSaveUrl(saveUrl))
      }
    })

    // Add event listener for position select
    addEvents(positionSelect, 'change', {}, {}, (e) => {
      selectedPosition = e.target.value
    })

    var isSelected = false

    function getTargetStyle(target) {
      Object.entries(targetStyle).forEach((entry) => {
        const [key, value] = entry
        targetStyle[key] = target.style[key]
      })
    }

    function AddSample(element, url, widthElem, heightElem) {
      let layout = document.getElementById(iframeContainer)
      if (!layout) {
        layout = createElements(
          'iframe',
          {
            border: 'none',
            width: `${widthElem}`,
            display: 'flex',
            position: typeEditor == 'feed' || typeEditor == 'carousel' ? 'relative' : 'absolute',
            zIndex: 99999999999,
          },
          {
            id: iframeContainer,
            name: iframeContainer,
            title: 'Preview',
            tabIndex: '-1',
            src: getUrlPreview(saveUrl),
          }
        )
        const botao = createElements(
          'span',
          {
            height: '50px',
            position: 'absolute',
            zIndex: 99999999999,
          },
          {
            innerHTML: 'Testee',
          }
        )
        layout.append(botao)

        // Use selected positioning method
        switch (selectedPosition) {
          case 'append':
            element.append(layout)
            break
          case 'prepend':
            element.prepend(layout)
            break
          case 'before':
            element.before(layout)
            break
          case 'after':
            element.after(layout)
            break
          default:
            element.append(layout) // fallback to append
        }

        document.getElementById(iframeContainer).focus()
      }
      addStyles(layout, { height: `${heightElem}` })
    }

    function SelectMode() {
      saveUrl = GetPathTo(elemento)
      console.log('saveUrl', saveUrl)
      isSelected = false
      addStyles(selecionar, { background: '#1F85D7' })
      addStyles(selecionarIcon, { filter: 'invert(0%)' })
      addStyles(selecionarText, { color: '#FFFFFF' })
    }

    function SelectElements(e) {
      if (isSelected && e.target.tagName != 'BODY' && e.target.tagName != 'IFRAME' && e.target.tagName != 'HTML' && e.target.id != 'editorposicao') {
        if (e.target.tagName != 'A') {
          if (e.target.tagName == 'IMG') {
            e.target.addEventListener('click', (e) => {
              e.preventDefault()
              e.stopPropagation()
              return false
            })
          }
          elemento = e.target
          getTargetStyle(e.target)
          addStyles(e.target, {
            position: 'relative',
            background:
              'linear-gradient(90deg, #1F85D7 50%, transparent 0) repeat-x, linear-gradient(90deg, #1F85D7 50%, transparent 0) repeat-x, linear-gradient(0deg, #1F85D7 50%, transparent 0) repeat-y, linear-gradient(0deg, #1F85D7 50%, transparent 0) repeat-y',
            backgroundSize: '4px 1px, 4px 1px, 1px 4px, 1px 4px',
            backgroundPosition: '0 0, 0 100%, 0 0, 100% 0',
            animation: 'linearGradientMove .3s infinite linear',
          })
        }
      }
    }

    function RemoveElements(e) {
      if (isSelected && e.target.tagName != 'BODY' && e.target.tagName != 'IFRAME' && e.target.tagName != 'HTML' && e.target.id != 'editorposicao') {
        addStyles(e.target, targetStyle)
        document.getElementById('info')?.remove()
        document.getElementById(iframeContainer)?.remove()
      }
    }

    function RemoveSelected(e) {
      if (elemento) {
        addStyles(e, targetStyle)
        document.getElementById(iframeContainer)?.remove()
        document.getElementById('info')?.remove()
        elemento = null
        DisableSave()
      }
    }

    document.addEventListener('mouseover', SelectElements)
    document.addEventListener('mouseout', RemoveElements)

    document.addEventListener('mousedown', function (e) {
      if (isSelected && elemento && e.target.id != 'editorposicao') {
        SelectMode()
        AddSample(elemento, '', '100%', typeEditor == 'feed' || typeEditor == 'carousel' ? '400px' : 'auto')
        EnableSave()
      }
    })

    function EnableSave() {
      addStyles(salvar, {
        cursor: 'pointer',
        backgroundColor: '#00803B',
      })
    }

    function DisableSave() {
      addStyles(salvar, {
        cursor: 'pointer',
        backgroundColor: '#A0A2A6',
      })
      saveUrl = ''
    }

    var targetStyle = {
      border: '',
      borderRadius: '',
      position: '',
      background: '',
      backgroundColor: '',
      backgroundSize: '',
      backgroundPosition: '',
      animation: '',
    }
  }
})()

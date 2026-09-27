;(async function () {
  if (typeof LS !== 'undefined' && LS.store.id) {
    const location = window.location.href
    const store_id = LS.store.id
    const platform = 'nuvemshop'
    const product_id = LS.product ? LS.product.id : null
    const REPLAY_PROVIDERS = ['floating', 'feed', 'carousel', 'tiktok', 'instagram']

    const places = {
      home: { target: 'body header', method: 'after' },
      product: { target: '.product-shipping-calculator', method: 'before' },
      category: { target: 'body header', method: 'after' },
      bottom: { target: 'body footer', method: 'before' },
    }

    if (!location) return

    const providersPromise = fetch(`https://api.replay.com.br/api/reels/${platform}/${store_id}/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        product_id: product_id || null,
        providers: REPLAY_PROVIDERS,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch((error) => {
        console.error('Error fetching replay providers:', error)
        return null
      })

    const container = document.createElement('div')
    container.id = 'replay-root'
    document.body.appendChild(container)

    const stylesheetLink = document.createElement('link')
    stylesheetLink.rel = 'stylesheet'
    stylesheetLink.id = 'id-replay-style'
    stylesheetLink.href = 'https://empreender.nyc3.cdn.digitaloceanspaces.com/static/REPLAY/widget/widget-replay.css'
    stylesheetLink.setAttribute('importance', 'high')

    const shadow = container.attachShadow({ mode: 'open' })
    const shadowRootDiv = document.createElement('div')
    shadow.appendChild(stylesheetLink)
    shadow.appendChild(shadowRootDiv)

    const externalScript = document.createElement('script')
    externalScript.src = 'https://empreender.nyc3.cdn.digitaloceanspaces.com/static/REPLAY/script-posicionar-replay.js'
    externalScript.async = true
    document.head.appendChild(externalScript)

    const modulesPromise = Promise.all([
      import('https://empreender.nyc3.cdn.digitaloceanspaces.com/static/REPLAY/widget/widget-replay.js'),
      import('https://empreender.nyc3.cdn.digitaloceanspaces.com/static/REPLAY/widget/stories-replay.js'),
      import('https://empreender.nyc3.cdn.digitaloceanspaces.com/static/REPLAY/widget/social-replay.js'),
    ])

    const [providers, [widgetModule, storiesModule, socialModule]] = await Promise.all([providersPromise, modulesPromise])
    if (!providers) return

    const buckets = providers.providers || {}
    const base = {
      platform: platform,
      store_id: store_id,
      location: location,
      product_id: product_id || null,
      places,
      data: providers,
    }

    if (buckets.floating?.collection) {
      widgetModule.initWidget(shadowRootDiv, {
        platform: platform,
        store_id: store_id,
        location: location,
        product_id: product_id || null,
        data: providers,
      })
    }

    if (buckets.feed?.collection) {
      storiesModule.initStories(shadowRootDiv, { ...base, type: 'feed' })
    }

    if (buckets.carousel?.collection) {
      storiesModule.initStories(shadowRootDiv, { ...base, type: 'carousel' })
    }

    if (buckets.tiktok?.collection || buckets.instagram?.collection) {
      socialModule.initSocial(shadowRootDiv, base)
    }
  }
})()

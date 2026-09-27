# Comunicação Visual Teste

Vitrine de comunicação visual criada do zero, com catálogo de serviços, busca, filtros, carrinho e checkout de solicitação, além de galeria de inspiração por meio da API gratuita da Pexels. A tipografia usa Montserrat, como a referência. Fotos e textos da DePoster não são usados na nova vitrine.

## Rodar

Requer Node.js 18 ou superior. Não há dependências para instalar.

```powershell
npm run dev
```

Acesse `http://localhost:3100`. Para iniciar sem janela de terminal no Windows, dê dois cliques em `iniciar-site-sem-terminal.vbs`.

## Configurar

Preencha `.env` na raiz do projeto. A chave `PEXELS_API_KEY` é obtida gratuitamente em [Pexels API](https://www.pexels.com/api/). Ela é usada somente no servidor em `/api/photos` e não aparece no navegador. As respostas são armazenadas em memória por 24 horas para preservar a cota. Sem a chave, a galeria mantém imagens locais ilustrativas. Chaves e contatos alterados no `.env` são lidos na próxima requisição.

Defina `WHATSAPP_NUMBER` para enviar a solicitação ao WhatsApp da loja, ou `CONTACT_EMAIL` para montar um e-mail de orçamento. Sem um desses contatos ou um adaptador próprio, o checkout permite revisar todos os dados, mas não envia o pedido.

## Carrinho e checkout

O carrinho guarda somente IDs e quantidades no `localStorage`. O checkout em `/checkout.html` coleta um briefing por serviço, contato, endereço do projeto e preferência por Pix, cartão de crédito ou boleto. Rascunhos do briefing e endereço ficam apenas na sessão da aba para não perder o preenchimento ao voltar ao personalizador. O CEP é consultado gratuitamente na [ViaCEP](https://viacep.com.br/); se a consulta falhar, o cliente preenche o endereço manualmente. Dados pessoais e de pagamento não são gravados no `localStorage`. Nenhum número de cartão é coletado neste front.

### Cartão de visita

O personalizador em `/cartao-de-visita.html` oferece formato, orientação, frente/verso, papel, acabamento, cantos e tiragem. O cliente pode descrever a arte que precisa ou selecionar PDF/JPG/PNG para uma conferência inicial. JPG/PNG têm dimensões medidas no navegador e comparadas a uma **referência de 300 ppi com 3 mm de sangria por lado**. Essa checagem não valida cores, fontes, área segura, qualidade visual ou conteúdo do PDF. O gabarito SVG é apenas uma referência, pois o fornecedor de impressão deve confirmar o arquivo final. A [Adobe](https://helpx.adobe.com/br/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/resolution-specs-for-printing-images.html) explica a referência de 300 ppi; o [guia de impressão da Printi](https://www.printi.com.br/assets/final/pdf/Guia-de-impressao.pdf) descreve o uso de sangria de 3 mm.

A configuração textual do cartão fica em `sessionStorage` durante a sessão. **Selecionar um arquivo não o envia nem o preserva no carrinho.** Sem integração de upload, a interface avisa que a arte deverá ser enviada ao atendimento depois do contato. Para adicionar upload ao seu backend, carregue um script antes de `card-customizer.js` que defina `window.CVT_ARTWORK.upload({ file, side, configuration })` e retorne `{ fileId: "..." }` após o envio confirmado. O `fileId` entra na configuração do item no pedido.

Como os serviços são sob medida, **não há preço, frete, parcelamento ou cobrança simulados**. O valor deve vir de um orçamento aprovado ou de um catálogo precificado pelo servidor. A escolha do meio de pagamento é uma preferência para o pedido, ainda não uma transação.

Para integrar seu backend, carregue seu script antes de `checkout.js` e implemente `window.CVT_CHECKOUT.submit(payload)`. O `payload` contém `items` (`productId`, `quantity`, `brief` e, para cartão de visita, `configuration`), `projectNotes`, `customer`, `address`, `paymentPreference`, `currency: "BRL"` e `pricingStatus: "pending_quote"`. A função deve retornar `{ orderId: "..." }` ou `{ status: "accepted" }` somente depois de gravar o pedido com sucesso. Um `redirectUrl` HTTPS ou da mesma origem pode ser retornado se seu fluxo precisar redirecionar. Valide produtos, valores, arquivo, endereço e disponibilidade **novamente no servidor**. Gere Pix e boleto no provedor e use campos seguros/tokenização do provedor para cartão; nunca envie dados brutos de cartão ao servidor desta vitrine.

Para uma experiência de pagamento dentro do site, o [Payment Brick do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/introduction) oferece cartão, Pix e boleto em um componente. A [API do Asaas](https://docs.asaas.com/docs/visao-geral) é outra opção para cobranças desses três tipos. Ambos exigem conta e cobram taxas de processamento conforme o plano; compare as condições atuais antes de escolher. Como esta loja vende serviços sob medida, o pedido e o valor aprovado precisam existir no backend antes de criar uma cobrança.

As imagens Pexels são ilustrações dos serviços. A aplicação não vende cópias das fotos. Os fotógrafos estão creditados nas imagens e a Pexels no rodapé. O banner `public/assets/hero-visual-azul.png` foi gerado para esta loja e pode ser substituído por uma fotografia de um projeto real quando houver uma.

## Estrutura

- `public/`: site e imagens ilustrativas.
- `server.js`: servidor estático e proxy seguro para a API da Pexels.
- `.env.example`: variáveis de ambiente disponíveis.

Esta é uma vitrine com solicitação de orçamento. Preços, pagamento efetivo e gestão de estoque dependem da operação real e não são simulados.
# repositório
# prompt-ready

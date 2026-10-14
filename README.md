# Comunicação Visual Teste

Loja de comunicação visual personalizada com os seis produtos existentes: fachadas, adesivos, cartões de visita, letreiros luminosos, impressão em grande formato e sinalização. A atualização preserva a marca, as imagens, todos os arquivos CSS e a estrutura das seções.

## Rodar

Requer Node.js 18 ou superior. Não há dependências para instalar.

```powershell
npm run dev
```

Abra `http://localhost:3100`. As configurações de fotos e contato continuam em `.env`, conforme `.env.example`. As credenciais da Pexels são usadas apenas no servidor. Sem a chave, a galeria usa as imagens locais existentes.

## Personalização e carrinho

Cada produto tem campos próprios em `public/catalog.js`. As unidades são indicadas nos campos. Não foram criadas opções de materiais, garantias ou prazos novos. Os cartões mantêm o personalizador, os formatos, os papéis, os acabamentos, a prévia e a conferência de arquivos já existentes.

O carrinho identifica cada configuração por `lineId`: duas configurações do mesmo produto são itens independentes. Quantidades e características físicas ficam em `localStorage`; conteúdo da arte, textos, contatos e dados do endereço ficam em `sessionStorage`. As configurações permanecem ao navegar e recarregar a mesma sessão. Ao encerrar a sessão, pode ser necessário preencher novamente os textos e dados pessoais; não há promessa de envio ou de preservação dos arquivos apenas selecionados no navegador. Carrinhos anteriores são migrados e itens incompletos pedem personalização.

## Preços comerciais

**Não há preços cadastrados no projeto.** O arquivo `commerce.json` começa com `products` vazio. A interface mostra indisponibilidade e impede a conclusão da compra. Nenhum valor de exemplo é exibido.

`POST /api/price` consulta apenas ofertas comerciais explícitas do arquivo. Não existem fórmulas presumidas de área, margens ou multiplicadores de quantidade.

Para cadastrar uma tabela aprovada, cada chave de `products` deve ser um ID existente do catálogo e conter:

- `fields`: campos da configuração que determinam o preço, definidos a partir das regras comerciais reais.
- `offers`: configurações e quantidades para as quais existe uma oferta aprovada.
- Cada oferta contém `configuration`, com exatamente todos os campos declarados; `quantity`, a quantidade de itens configurados; e `totalCents`, o valor total dessa oferta em centavos, fornecido pela tabela real.

O preço só fica disponível quando uma única oferta corresponde exatamente às opções e à quantidade selecionadas. Não há interpolação entre medidas ou tiragens. Ofertas ausentes, ambíguas ou sem valor válido ficam indisponíveis. A moeda é BRL. `priceVersion` identifica a versão consultada. Não altere preços para testar o site público: use somente dados comerciais aprovados.

## Compra e pagamento

**Não existe integração ativa de registro de pedido, frete ou pagamento neste projeto.** O resumo separa o valor dos produtos das condições de entrega; não apresenta frete gratuito ou compra concluída.

O ponto de integração `window.CVT_CHECKOUT.submit(payload)` foi preservado. Para operar como compra, a integração deve declarar `supportsPurchase: true`. A função deve criar um pedido real e devolver `orderId` e `redirectUrl` para uma etapa de pagamento válida. O backend dessa integração deve validar produtos e configurações, consultar novamente a tabela comercial, conferir `priceVersion`, calcular entrega e demais condições e persistir o pedido antes de iniciar a cobrança. Nenhum preço enviado pelo navegador deve ser aceito como autoridade. A opção escolhida na página é uma preferência; o provedor deve confirmar os meios e condições que realmente oferece.

O payload conserva itens, configuração, observações, cliente, endereço, preferência e moeda; acrescenta o identificador de cada linha e a versão do preço. O carrinho é mantido ao abrir o pagamento e em caso de falha. A confirmação de pagamento deve vir do provedor; abrir um checkout ou registrar um pedido não confirma pagamento. `CVT_STORE.clear()` só deve ser usado após confirmação real da integração.

Os contatos por WhatsApp/e-mail e integrações antigas de solicitação continuam como opção secundária de **consultar disponibilidade**, sem apresentar essa consulta como uma compra. A preferência por Pix, cartão ou boleto não emite cobrança.

## Arte e endereço

O ponto `window.CVT_ARTWORK.upload({ file, side, configuration })` continua disponível. A função deve enviar o arquivo real e devolver `fileId`. Quando o cliente escolhe arte pronta, a compra exige arquivos enviados para os lados escolhidos. A conferência de resolução é inicial; corte, fontes, cores e sangria ainda exigem conferência técnica. O gabarito SVG permanece uma referência.

O endereço mantém a consulta ViaCEP e permite preenchimento manual em caso de falha. Dados pessoais não são gravados no `localStorage`. Nenhum número de cartão é coletado pela loja.

## Arquivos principais

- `public/catalog.js`: catálogo e campos específicos de cada produto.
- `public/store.js`: persistência, migração e consulta de preços.
- `public/app.js`: catálogo, configuração de produtos e carrinho lateral.
- `public/card-customizer.js`: personalizador de cartões já existente.
- `public/checkout.js`: revisão dos itens, endereço e disponibilidade de compra.
- `commerce.json`: tabela comercial, atualmente sem ofertas.
- `server.js`: arquivos estáticos, configuração, fotos e consulta de preços.

Os arquivos CSS, as imagens, as fontes e o logotipo foram preservados.

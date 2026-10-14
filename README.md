# Comunicação Visual Teste

Loja de comunicação visual personalizada com os seis produtos existentes: fachadas, adesivos, cartões de visita, letreiros luminosos, impressão em grande formato e sinalização. A atualização preserva a marca, as imagens, todos os arquivos CSS e a estrutura das seções.

## Rodar

Requer Node.js 18 ou superior. Não há dependências para instalar.

```powershell
npm run dev
```

Abra `http://localhost:3100`. As configurações de contato continuam em `.env`, conforme `.env.example`. O banner, as categorias, os produtos e a galeria usam as imagens originais locais de `public/assets/real/`. A galeria não consulta `/api/photos`; `/api/config` e os endpoints comerciais continuam disponíveis. As credenciais da Pexels, quando configuradas para o endpoint existente, ficam somente no servidor.

## Fotos originais e revisão funcional

O topo apresenta Studio L, Bel Cosméticos, Áurea e 15ª Feira Baiana, nessa ordem. O carrossel usa transição horizontal de 700 ms e intervalo de 5,5 s, com pausa por botão, foco, hover, aba oculta e saída da tela. Os clones de continuidade ficam ocultos das tecnologias assistivas. Teclado, toque e movimento reduzido mantêm a navegação manual.

`public/real-media.js` contém o mapa fornecido. `public/real-photos.js` controla o carrossel; `public/real-photos.css` aplica os enquadramentos às três páginas. Foram preservados os 60 arquivos WebP do pacote, incluindo variantes responsivas. Cartões e o letreiro Áurea usam `contain`; a imagem Sinal3 é identificada como arte original. A identidade, o loop de marcas, os seis IDs e os campos comerciais permanecem. Os originais e as referências de trabalho ficam fora de `public/` e são ignorados pelo Git.

A revisão corrige foco e teclado em menu, busca, modais e carrinho; preserva o rascunho do cartão na sessão; bloqueia salvamento repetido e salvamento durante a conferência de arte. Alterações de quantidade preservam o foco no carrinho e no checkout. Consultas de preço têm limite de tempo e agrupam alterações rápidas de campos. A Montserrat mantém os pesos originais em WOFF2.

As três páginas foram verificadas no Chromium em 360, 390, 768, 1024, 1280 e 1440 px. O registro local da revisão está em `audit/real-integration/`; a aplicação não possui tarefas de lint, TypeScript ou build. A sintaxe é verificada com `node --check`. Preço, upload real e pagamento continuam sujeitos às integrações descritas abaixo.

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

## Preparação das integrações

Foi definido Mercado Pago para compra online sem cadastro. A preparação das variáveis de ambiente não implementa o backend de pedidos, Storage ou pagamentos. Os preços, o domínio e a implementação restante continuam pendentes; preencher o `.env` não ativa a compra.

O `.env` local recebeu os nomes de configuração da aplicação, sem substituir seus valores anteriores. As credenciais existentes do Supabase foram reaproveitadas nos nomes padronizados. O modelo `.env.example` contém somente nomes, comentários e valores de configuração, sem credenciais.

| Variável | Como preencher |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase; reaproveitada da configuração local existente. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada do backend; reaproveitada da configuração local existente. |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública preferida do Supabase; reaproveitada quando disponível. |
| `SUPABASE_ANON_KEY` | Chave pública legada, opcional para compatibilidade; reaproveitada quando disponível. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Access Token da aplicação em Suas integrações. Usar o token de teste durante desenvolvimento. |
| `MERCADO_PAGO_PUBLIC_KEY` | Public Key da mesma aplicação e ambiente. Opcional no redirecionamento direto do Checkout Pro. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Chave de assinatura de Webhooks > Configurar notificação na aplicação do Mercado Pago. |
| `MERCADO_PAGO_WEBHOOK_URL` | URL HTTPS pública do endpoint de notificações; caminho previsto `/api/webhooks/mercado-pago`. O endpoint ainda será implementado. |
| `MERCADO_PAGO_ENVIRONMENT` | `test` durante desenvolvimento; `production` após a validação, com credenciais de produção. A variável não transforma um token produtivo em token de teste. |
| `APP_URL` | URL HTTPS pública da loja na Vercel, incluindo o endereço temporário antes do domínio definitivo. A integração derivará dela as URLs de retorno ao checkout. |
| `GUEST_SESSION_SECRET` | Segredo técnico da sessão de compra sem cadastro; já foi gerado no `.env` local. Usar um valor próprio em cada ambiente. |
| `ARTWORK_STORAGE_BUCKET` | Nome previsto do bucket privado, `artworks`. A criação do bucket ainda está pendente. |
| `CHECKOUT_ENABLED` | Reservado para a integração; manter `false` até preços, pedidos e pagamento serem validados. |

Na Vercel, as variáveis deverão ser cadastradas nos ambientes correspondentes, com as chaves privadas como segredos. Elas não são publicadas pelo GitHub com o `.env`, que está ignorado. O frontend atual usa JavaScript comum: o prefixo `NEXT_PUBLIC_` sozinho não disponibiliza uma variável no navegador; a integração terá de expor apenas a configuração pública necessária.

Para esta loja própria, o Checkout Pro pode criar a preferência no backend e abrir a URL de pagamento recebida. Não são necessários Client ID/Client Secret de OAuth, credenciais de outras contas vendedoras ou uma chave global de idempotência: cada pedido terá sua própria identificação. Nunca marcar um pedido como pago somente pelos parâmetros de retorno do navegador.

Documentação: [criação de preferência](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post), [notificações assinadas](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications), [credenciais e contas de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/test-accounts).

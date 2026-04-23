## Escopo
- Modulo de produtos.
- Cobre cadastro de produtos, categorias, grupos, estoque, inventarios, sugestoes de compra e relacao com fornecedores.

## Estado
- Este modulo tem implementacao ativa em `src/react` e deve constar em novos prompts.
- Se existir `src/vue`, ela e apenas legado e deve ser ignorada, salvo pedido explicito.

## Quando usar
- Prompts sobre produtos, categorias, inventario, estoque, movimentacoes, sugestao de compra e formularios de produto.

## Regras
- `CustomizeScreen` precisa suportar inclusao e reabertura de um `order_product` customizavel existente.
- Na reabertura, a tela deve carregar as selecoes atuais do item e salvar por `PUT` no mesmo `order_product`, sem criar outro item.
- Depois de salvar uma reabertura, a tela nao deve fazer merge raso do item retornado dentro de `orderProducts`. Ela precisa reconciliar a colecao atual de `order_product` do pedido para nao quebrar a hierarquia de componentes.
- Quando `CustomizeScreen` estiver reabrindo um item existente, a acao principal e de modificacao, nao de adicao. O rotulo e o comportamento devem deixar claro que os componentes atuais serao substituidos pelas selecoes salvas.
- Rotas para `CustomizeScreen` devem passar apenas params primitivos, como `productId`, `orderProductId`, `returnDepth` e flags booleanas. Nao enviar objetos de produto ou `order_product` pela URL.
- Ao reabrir um item existente, `CustomizeScreen` deve hidratar as selecoes marcadas a partir do `GET /order_products/{id}` atual do item. Nao confiar apenas na colecao plana do pedido nem em estado local reaproveitado para remontar os checks.
- `CustomizeScreen` tem CTA proprio no rodape. Quando ela estiver aberta, o layout nao deve exibir `BottomCart` nem `BottomToolBar` por baixo.
- A decisao de permitir ou bloquear a reabertura por etapa de fila pertence ao modulo `ui-orders`/`ui-ppc`; `ui-products` apenas executa a edicao quando a navegacao ja chegou autorizada.

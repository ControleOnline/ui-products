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
- A decisao de permitir ou bloquear a reabertura por etapa de fila pertence ao modulo `ui-orders`/`ui-ppc`; `ui-products` apenas executa a edicao quando a navegacao ja chegou autorizada.

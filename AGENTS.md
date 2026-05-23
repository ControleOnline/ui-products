## Escopo
- Modulo de produtos.
- Cobre cadastro de produtos, categorias, grupos, estoque, inventarios, sugestoes de compra e relacao com fornecedores.

## Estado
- Este modulo tem implementacao ativa em `src/react` e deve constar em novos prompts.
- Se existir `src/vue`, ela e apenas legado e deve ser ignorada, salvo pedido explicito.

## Quando usar
- Prompts sobre produtos, categorias, inventario, estoque, movimentacoes, sugestao de compra e formularios de produto.

## Regras
- A listagem de categorias do fluxo operacional de `POS` deve suportar busca de produtos com auto-complete.
- O auto-complete de produtos no catalogo operacional nao e exclusivo de `kiosk`; ele deve permanecer disponivel em todos os modos de `POS`.
- Quando a selecao de um produto pelo auto-complete fizer parte do fluxo `PDV`, ela pode materializar o pedido, adicionar o item e abrir `OrderDetails` sem passar pela listagem filtrada.
- O submit textual da busca ainda pode abrir a listagem filtrada de produtos quando o operador quiser navegar pelo catalogo.
- `CustomizeScreen` precisa suportar inclusao e reabertura de um `order_product` customizavel existente.
- Na reabertura, a tela deve carregar as selecoes atuais do item e salvar por `PUT` no mesmo `order_product`, sem criar outro item.
- Depois de salvar uma reabertura, a tela nao deve fazer merge raso do item retornado dentro de `orderProducts`. Ela precisa reconciliar a colecao atual de `order_product` do pedido para nao quebrar a hierarquia de componentes.
- Quando `CustomizeScreen` estiver reabrindo um item existente, a acao principal e de modificacao, nao de adicao. O rotulo e o comportamento devem deixar claro que os componentes atuais serao substituidos pelas selecoes salvas.
- `showInParentQueue` define apenas se o item deve ser encaixado no pai nas telas de consumo; ele nao altera a fila real nem a persistencia do pedido.
- `ProductGroup.showInDisplay` e a flag de visibilidade do titulo do grupo. O formulario de grupo deve expor o switch e o default de novos cadastros e oculto (`false`).
- Rotas para `CustomizeScreen` devem passar apenas params primitivos, como `productId`, `orderProductId`, `returnDepth` e flags booleanas. Nao enviar objetos de produto ou `order_product` pela URL.
- Ao reabrir um item existente, `CustomizeScreen` deve hidratar as selecoes marcadas a partir do `GET /order_products/{id}` atual do item. Nao confiar apenas na colecao plana do pedido nem em estado local reaproveitado para remontar os checks.
- `CustomizeScreen` tem CTA proprio no rodape. Quando ela estiver aberta, o layout nao deve exibir `BottomCart` nem `BottomToolBar` por baixo.
- Os loaders de `CustomizeScreen` nao devem depender de referencias instaveis de actions/stores dentro de `useFocusEffect`. O carregamento no foco deve usar deps primitivas ou refs estaveis para nao entrar em loop de requisicoes.
- Em `CustomizeScreen`, o catalogo de `product_group_products` deve ser buscado uma vez por grupo/produto e reutilizado para hidratar os checks. Mudancas nas selecoes marcadas nao devem disparar nova busca do catalogo.
- A tela de customizacao deve aplicar e exibir com clareza as regras do grupo atual: `required`, `minimum`, `maximum`, `priceCalculation` e a quantidade padrao de cada opcao. Na reabertura, quando houver metadado do grupo dentro de `orderProduct.orderProductComponents[].productGroup`, esse payload atual do pedido deve prevalecer na apresentacao e validacao.
- As regras de `CustomizeScreen` precisam ficar visiveis, mas em formato compacto e discreto para o usuario final. Evitar cards grandes de resumo; preferir uma linha curta por grupo e destacar somente pendencias de validacao.
- A decisao de permitir ou bloquear a reabertura por etapa de fila pertence ao modulo `ui-orders`/`ui-ppc`; `ui-products` apenas executa a edicao quando a navegacao ja chegou autorizada.
- Em produtos do tipo `service`, o seletor de unidade nao deve oferecer medidas fisicas como `grama`, `litro`, `fracao` e equivalentes. Ele deve expor apenas unidades de cobranca compativeis com execucao unica ou recorrencia, como `unitario`, `hora`, `diaria`, `semanal`, `mensal` e correlatas.
- Ao editar registros antigos de `service`, a unidade legada ja salva pode continuar visivel apenas para preservar contexto ate a correcao manual. Para novos cadastros e novas escolhas, a regra restritiva de unidade deve prevalecer.
- Essa regra de unidade para `service` nao pode ficar so no front. A API ou fluxo de persistencia responsavel pelo save do produto tambem deve validar e rejeitar unidades incompatíveis para servicos.
- A visao de insumos (`context=supplies`) deve separar com clareza `feedstock`, `component` e `package`. `feedstock` representa a fonte canonica de custo/estoque; `component` representa opcao operacional/comercial que pode consumir insumos; `package` representa embalagem.
- A listagem de insumos deve priorizar `feedstock` quando nenhum tipo for escolhido e deve usar seletor compacto para alternar entre tipos, evitando uma fileira longa de chips.
- Em `context=supplies`, o valor exibido no card nao deve ser tratado visualmente como custo base do insumo. Enquanto a regra de custo base nao existir, ele deve ser apresentado como preco de cadastro/opcao, separado do custo gravado nos vinculos de ficha tecnica.
- A criacao a partir da listagem de insumos deve respeitar a visualizacao atual: `feedstock` cria materia-prima, `component` cria componente operacional e `package` cria embalagem. O contexto deve ser passado explicitamente ao detalhe/formulario, sem depender dos params internos das abas.

## Limites
- A decisao de permitir ou bloquear a reabertura por etapa de fila pertence ao modulo `ui-orders`/`ui-ppc`; `ui-products` apenas executa a edicao quando a navegacao ja chegou autorizada.

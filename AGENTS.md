## Escopo
- Módulo de produtos do ERP, catálogo e helpers de domínio relacionados a produtos.
- Este módulo concentra regras de classificação, consulta e enriquecimento de produtos.

## Regras atuais
- A regra de `menuCostsResale` pertence a este módulo e deve classificar produtos de revenda apenas como itens do tipo `product` com sinal de bebida por categoria, hierarquia ou texto.
- `manufactured`, `component`, `feedstock` e `package` nao entram no recorte de revenda.
- Helpers de produto devem permanecer pequenos e reutilizaveis, sem puxar dependencias de `ui-manager`.
- Nao duplicar a regra de classificacao de bebidas em telas de `ui-manager`; a tela deve apenas consumir o helper deste modulo.
- A tela de ingredientes da engenharia deve ficar neste modulo como listagem de `products` do tipo `feedstock`, com carregamento sob foco e prevenção de duplicidade por nome/SKU antes de salvar.
- A regra de ingredientes nao deve ser duplicada em `ui-manager`; a tela de menu costs apenas registra a rota e consome o componente daqui.
- Quando o PDV estiver em modo `single-item`, `ProductsPage` vira a entrada efetiva do catalogo e `ProductItem` deve renderizar a selecao unitaria via `ProductTotem`, sem voltar para a navegacao por categoria.
- No mesmo `single-item`, os produtos `custom` devem passar `singleItemMode` para `CustomizeScreen`, esconder a quantidade, confirmar com quantidade implicita 1 e voltar direto para `Checkout`; `OrderDetails` nao faz parte desse caminho.
- O catalogo `single-item` usa cards responsivos inteiramente acionaveis: exibe `productFiles` quando houver midia cadastrada e usa card compacto sem placeholder quando nao houver. A grade deve priorizar uma coluna em maquininhas e no modo compacto de celular, duas colunas com midia em celular e quatro colunas no desktop, sempre preservando o shell universal.
- A liberacao de itens para fila de producao deve respeitar o contrato do pedido: apenas pedidos ja `paid` ou entregas com `order-charge-on-delivery-enabled` ativo podem enfileirar producao.
- A tela de distribuicao de vitrines de preco deve ser uma listagem `DefaultTable` sobre o store `product_showcase_items`; `externalFilters` deve ficar antes da tabela e `filters` define o modal interno da tabela. Busca, ordenacao, paginacao, resumo e loading pertencem ao store/DefaultTable, nao a cards, chips ou listas locais na tela.

## Qualidade de código

- A barra comum de modularizacao, testes, smoke tests e limite de tamanho de componentes vive em `https://github.com/ControleOnline/agents-mcp/blob/master/skills/shared/code-quality.md`.

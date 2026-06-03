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

/**
 * Contratos canônicos do módulo de Produtos.
 * Reflete apenas campos que existem nas tabelas do banco de dados.
 */

export const ProductTypes = [
  'product',
  'service',
  'component',
  'feedstock',
  'package',
  'custom',
  'manufactured',
];

export const ProductConditions = ['new', 'used', 'recondicioned'];

export const PriceCalculationOptions = ['sum', 'average', 'biggest', 'free'];

/**
 * Campos canônicos da tabela `product`.
 * Apenas colunas que existem de fato no banco.
 */
export const ProductCanonicalFields = {
  id:                   { required: false },
  product:              { required: true  },
  description:          { required: false },
  sku:                  { required: false },
  type:                 { required: true  },
  price:                { required: true  },
  productUnit:          { required: false },
  productCondition:     { required: false },
  featured:             { required: false },
  active:               { required: true  },
  company:              { required: true  },
  queue:                { required: false },
  defaultOutInventory:  { required: false },
  defaultInInventory:   { required: false },
};

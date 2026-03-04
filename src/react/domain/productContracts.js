/**
 * Canonical contracts for APP Produtos.
 * This is intentionally runtime-friendly JS so it can be consumed by current RN code.
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
export const ProductLifecycleStatuses = ['draft', 'ready', 'published', 'blocked'];

export const FiscalOrigins = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
];

/**
 * Minimal canonical fields expected by Products domain.
 * `requiredForPublish` is used by validator functions.
 */
export const ProductCanonicalFields = {
  id: { requiredForPublish: false },
  code: { requiredForPublish: false },
  sku: { requiredForPublish: false },
  ean: { requiredForPublish: false },
  product: { requiredForPublish: true },
  slug: { requiredForPublish: false },
  categoryId: { requiredForPublish: true },
  type: { requiredForPublish: true },
  price: { requiredForPublish: true },
  costStandard: { requiredForPublish: false },
  costAverage: { requiredForPublish: false },
  costLast: { requiredForPublish: false },
  costReal: { requiredForPublish: false },
  active: { requiredForPublish: true },
  company: { requiredForPublish: true },
  ncm: { requiredForPublish: false },
  cest: { requiredForPublish: false },
  cfopDefault: { requiredForPublish: false },
};

export const BomCanonicalFields = {
  parentProductId: { required: true },
  components: { required: true },
  version: { required: true },
  validFrom: { required: false },
  validTo: { required: false },
};

const safeArray = value => (Array.isArray(value) ? value : []);

const normalizeText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeEntityId = value => {
  if (!value && value !== 0) return '';

  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;

  return String(raw || '').replace(/\D+/g, '').trim();
};

const toNumber = value => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const BEVERAGE_CATEGORY_KEYWORDS = [
  'bebida',
  'bebidas',
  'drink',
  'drinks',
  'refrigerante',
  'refri',
  'agua',
  'suco',
  'cerveja',
  'chopp',
  'vinho',
  'h2o',
  'ice tea',
  'isotonico',
  'energ',
];

const BEVERAGE_PRODUCT_KEYWORDS = [
  'bebida',
  'coca',
  'cola',
  'agua',
  'h2o',
  'fanta',
  'sprite',
  'guarana',
  'suco',
  'cha',
  'ice tea',
  'bud',
  'heineken',
  'schweppes',
  'limao',
  'uva',
  'limoneto',
];

const resolveCategoryMap = categories =>
  new Map(
    safeArray(categories)
      .map(category => [normalizeEntityId(category), category])
      .filter(([id]) => Boolean(id)),
  );

const resolveCategoryLabel = category =>
  category?.category ||
  category?.name ||
  category?.title ||
  category?.description ||
  '';

const resolveProductCategoryId = product =>
  normalizeEntityId(
    product?.productCategory?.category ||
      product?.productCategories?.[0]?.category ||
      product?.category ||
      product?.categoryId,
  );

const resolveProductText = product => normalizeText([
  product?.product,
  product?.name,
  product?.description,
  product?.notes,
  product?.sku,
].filter(Boolean).join(' '));

const isBeverageCategory = (category, categoryMap, memo = new Map()) => {
  if (!category) return false;

  const categoryId = normalizeEntityId(category);
  if (!categoryId) return false;
  if (memo.has(categoryId)) return memo.get(categoryId);

  const ownText = normalizeText([
    resolveCategoryLabel(category),
    category?.description,
    category?.notes,
  ].filter(Boolean).join(' '));

  if (BEVERAGE_CATEGORY_KEYWORDS.some(keyword => ownText.includes(keyword))) {
    memo.set(categoryId, true);
    return true;
  }

  const parent = categoryMap.get(normalizeEntityId(category?.parent));
  const result = parent ? isBeverageCategory(parent, categoryMap, memo) : false;
  memo.set(categoryId, result);
  return result;
};

export const resolveResaleProductMeta = (product, categories = []) => {
  const normalizedType = normalizeText(product?.type);
  const categoryMap = resolveCategoryMap(categories);
  const categoryId = resolveProductCategoryId(product);
  const category = categoryId ? categoryMap.get(categoryId) || null : null;
  const categoryLabel = resolveCategoryLabel(category);
  const categoryMatch = isBeverageCategory(category, categoryMap);
  const textMatch = BEVERAGE_PRODUCT_KEYWORDS.some(keyword => resolveProductText(product).includes(keyword));
  const matches = normalizedType === 'product' && (categoryMatch || textMatch);

  return {
    matches,
    matchSource: categoryMatch ? 'category' : (textMatch ? 'keyword' : ''),
    matchLabel: categoryMatch ? 'Categoria' : (textMatch ? 'Texto' : ''),
    categoryId,
    categoryLabel,
    categoryPath: category?.parent ? resolveCategoryLabel(categoryMap.get(normalizeEntityId(category.parent))) : '',
    typeLabel: normalizedType || 'product',
  };
};

export const isResaleProduct = (product, categories = []) =>
  resolveResaleProductMeta(product, categories).matches;

export const buildResaleCatalogRows = ({ products = [], categories = [] } = {}) => {
  const rows = safeArray(products)
    .filter(product => isResaleProduct(product, categories))
    .map(product => {
      const meta = resolveResaleProductMeta(product, categories);

      return {
        ...product,
        id: normalizeEntityId(product),
        name: product?.product || product?.name || '',
        product: product?.product || product?.name || '',
        sku: product?.sku || '',
        price: toNumber(product?.price),
        ...meta,
      };
    });

  return rows.sort((left, right) => {
    const leftCategory = normalizeText(left.categoryLabel || '');
    const rightCategory = normalizeText(right.categoryLabel || '');
    if (leftCategory !== rightCategory) {
      return leftCategory.localeCompare(rightCategory, 'pt-BR');
    }

    return normalizeText(left.name).localeCompare(normalizeText(right.name), 'pt-BR');
  });
};

import { buildImportedSuppliersFromPeople } from '@controleonline/ui-people/src/react/utils/menuCostsSuppliers';
import { buildLiveIngredientsDb } from './menuCostsIngredients';
import { buildLivePackagingDb } from './menuCostsPackaging';
import { MENU_COSTS_PAGE_SIZE } from './menuCostsPagination';
import { mapProductToCatalogItem } from './productCatalog';

const safeArray = value => (Array.isArray(value) ? value : []);

const extractItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  if (Array.isArray(response?.member)) return response.member;
  return [];
};

const uniqueById = items => {
  const seen = new Set();
  return safeArray(items).filter(item => {
    const id = String(item?.id || item?.['@id'] || item?.filePath || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const fetchAllItems = async (actions, params, pageSize = MENU_COSTS_PAGE_SIZE, maxPages = 8) => {
  if (!actions?.getItems) return [];

  const allItems = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await actions.getItems({
      ...params,
      itemsPerPage: pageSize,
      page,
    });
    const items = extractItems(response);
    allItems.push(...items);
    if (items.length < pageSize) {
      break;
    }
  }

  return uniqueById(allItems);
};

const mergeProductRecord = (target, source) => ({
  ...target,
  ...source,
  components: safeArray(target.components).length ? target.components : safeArray(source.components),
  addons: safeArray(target.addons).length ? target.addons : safeArray(source.addons),
  productFiles: safeArray(target.productFiles).length ? target.productFiles : safeArray(source.productFiles),
  extraData: {
    ...(source.extraData || {}),
    ...(target.extraData || {}),
  },
  raw: target.raw || source.raw,
});

const mergeById = items => {
  const map = new Map();

  safeArray(items).forEach(item => {
    const id = String(item?.id || '').trim();
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, item);
      return;
    }
    map.set(id, mergeProductRecord(map.get(id), item));
  });

  return Array.from(map.values());
};

const normalizeLiveProduct = product => {
  const normalized = mapProductToCatalogItem(product || {}, {});

  return {
    id: normalized.id,
    product: normalized.name || product?.product || product?.name || '',
    name: normalized.name || product?.product || product?.name || '',
    code: normalized.sku || product?.code || String(normalized.id || product?.id || ''),
    sku: normalized.sku || product?.sku || '',
    categoryId: normalized.categoryId || product?.categoryId || '',
    type: normalized.type || product?.type || 'product',
    active: normalized.active !== false && product?.active !== false,
    description: normalized.description || product?.description || '',
    notes: product?.notes || '',
    price: normalized.price || Number(product?.price || 0) || 0,
    salePrice: normalized.price || Number(product?.price || 0) || 0,
    erpUnit: product?.erpUnit || product?.unit || 'UN',
    erpProductType: product?.type || 'product',
    productFiles: safeArray(product?.productFiles),
    extraData: product?.extraData || {},
    components: safeArray(product?.components),
    addons: safeArray(product?.addons),
    raw: product,
  };
};

const normalizeRecipeProduct = product => {
  const normalized = mapProductToCatalogItem(product || {}, {});

  return {
    id: normalized.id,
    product: normalized.name || product?.product || product?.name || '',
    name: normalized.name || product?.product || product?.name || '',
    code: normalized.sku || product?.code || String(normalized.id || product?.id || ''),
    sku: normalized.sku || product?.sku || '',
    categoryId: normalized.categoryId || product?.categoryId || '',
    type: 'recipe',
    active: normalized.active !== false && product?.active !== false,
    description: normalized.description || product?.description || '',
    notes: product?.notes || '',
    yieldQty: Number(product?.yieldQty || product?.extraData?.yieldQty || 1) || 1,
    yieldUnit: product?.yieldUnit || product?.extraData?.yieldUnit || product?.erpUnit || 'un',
    components: safeArray(product?.components),
    storage: product?.storage || '',
    evidenceType: product?.extraData?.evidenceType || 'review',
    evidenceSource: product?.extraData?.evidenceSource || product?.description || '',
    sourceReference: product?.sku || product?.code || '',
    productFiles: safeArray(product?.productFiles),
    extraData: product?.extraData || {},
    raw: product,
  };
};

const dedupeByType = items =>
  safeArray(items).filter(item => {
    const type = String(item?.type || '').toLowerCase();
    return !['feedstock', 'package'].includes(type);
  });

const mergeCollections = (primary = [], secondary = []) =>
  mergeById([...safeArray(primary), ...safeArray(secondary)]);

export const buildLiveMenuCostsDb = async ({
  companyId,
  companyIri,
  peopleActions,
  productsActions,
  productGroupProductActions,
  ordersActions,
  categoriesActions,
}) => {
  if (!companyId) {
    return {
      categories: [],
      ingredients: [],
      recipes: [],
      packaging: [],
      products: [],
      purchaseOrders: [],
      purchaseItems: [],
      inputs: [],
      suppliers: [],
      settings: {},
    };
  }

  const [
    ingredientsDb,
    packagingDb,
    peopleRecords,
    liveProducts,
    liveRecipeProducts,
    liveCategories,
  ] = await Promise.all([
    buildLiveIngredientsDb({
      companyId,
      companyIri,
      productsActions,
      productGroupProductActions,
      ordersActions,
      categoriesActions,
    }),
    buildLivePackagingDb({
      companyId,
      companyIri,
      productsActions,
      productGroupProductActions,
      ordersActions,
      categoriesActions,
    }),
    fetchAllItems(
      peopleActions,
      {
        'link.company': companyIri,
        'link.linkType': 'provider',
        itemsPerPage: MENU_COSTS_PAGE_SIZE,
      },
      MENU_COSTS_PAGE_SIZE,
      8,
    ),
    fetchAllItems(
      productsActions,
      {
        company: companyId,
        people: companyIri,
        active: 1,
        type: ['product', 'custom', 'drink'],
        'order[product]': 'ASC',
      },
      MENU_COSTS_PAGE_SIZE,
      10,
    ),
    fetchAllItems(
      productsActions,
      {
        company: companyId,
        people: companyIri,
        active: 1,
        type: ['manufactured', 'component'],
        'order[product]': 'ASC',
      },
      MENU_COSTS_PAGE_SIZE,
      10,
    ),
    fetchAllItems(
      categoriesActions,
      {
        company: companyIri,
        'order[name]': 'ASC',
      },
      MENU_COSTS_PAGE_SIZE,
      8,
    ),
  ]);

  const suppliers = buildImportedSuppliersFromPeople(peopleRecords);
  const derivedProducts = mergeCollections(
    safeArray(ingredientsDb.products),
    safeArray(packagingDb.products),
  );
  const derivedProductsById = new Map(
    derivedProducts.map(item => [String(item.id), item]),
  );

  dedupeByType(liveProducts).map(normalizeLiveProduct).forEach(product => {
    const key = String(product.id || '').trim();
    if (!key) return;
    if (!derivedProductsById.has(key)) {
      derivedProductsById.set(key, product);
      return;
    }
    derivedProductsById.set(key, mergeProductRecord(derivedProductsById.get(key), product));
  });

  const products = Array.from(derivedProductsById.values()).sort((left, right) =>
    String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'),
  );

  const recipes = dedupeByType(liveRecipeProducts)
    .map(normalizeRecipeProduct)
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'));

  const categories = mergeCollections(
    mergeCollections(ingredientsDb.categories, packagingDb.categories),
    liveCategories,
  ).sort((left, right) =>
    String(left.name || left.category || '').localeCompare(String(right.name || right.category || ''), 'pt-BR'),
  );

  const purchaseOrders = mergeCollections(
    ingredientsDb.purchaseOrders,
    packagingDb.purchaseOrders,
  ).sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

  const purchaseItems = mergeCollections(
    ingredientsDb.purchaseItems,
    packagingDb.purchaseItems,
  ).sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

  const inputs = mergeCollections(ingredientsDb.inputs, packagingDb.inputs);
  const settings = {
    defaultMarkupPct: 200,
    targetMarginPct: 68,
    ...(ingredientsDb.settings || {}),
    ...(packagingDb.settings || {}),
  };

  return {
    categories,
    ingredients: safeArray(ingredientsDb.ingredients),
    recipes,
    packaging: safeArray(packagingDb.packaging),
    products,
    purchaseOrders,
    purchaseItems,
    inputs,
    suppliers,
    settings,
  };
};

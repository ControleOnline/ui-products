import {ALL_PRODUCTS_SENTINEL_ID} from '@controleonline/ui-products/src/react/constants/categorySentinels';

const normalizeProductTypeFilter = value => String(value || '').trim().toLowerCase() || null;

export const buildProductCatalogRequestParams = ({
  categoryId,
  companyId,
  context = 'products',
  searchQuery,
  typeFilter,
} = {}) => {
  if (!companyId) return {};

  const normalizedContext = String(context || 'products').trim().toLowerCase();
  const isSupplyContext = normalizedContext === 'supplies';
  const effectiveTypeFilter = isSupplyContext
    ? (normalizeProductTypeFilter(typeFilter) || 'feedstock')
    : normalizeProductTypeFilter(typeFilter);

  const params = {
    active: 1,
    company: companyId,
    'order[description]': 'ASC',
    'order[product]': 'ASC',
    type: effectiveTypeFilter
      ? [effectiveTypeFilter]
      : isSupplyContext
        ? ['feedstock', 'component', 'package']
        : ['product', 'manufactured', 'custom', 'service', 'recipe'],
  };

  const normalizedSearch = String(searchQuery || '').trim();
  if (normalizedSearch) {
    params.product = normalizedSearch;
  }

  if (categoryId && categoryId !== ALL_PRODUCTS_SENTINEL_ID) {
    params['productCategory.category'] = `/categories/${categoryId}`;
  }

  return params;
};

import {ALL_PRODUCTS_SENTINEL} from '@controleonline/ui-products/src/react/constants/categorySentinels';

export const resolveRouteCategoryId = value => {
  if (!value) return '';

  if (typeof value === 'object') {
    if (value?._isAllProducts || value?.['@id'] === ALL_PRODUCTS_SENTINEL['@id']) {
      return ALL_PRODUCTS_SENTINEL['@id'];
    }

    return String(value?.id || value?.['@id'] || '').replace(/\D+/g, '').trim();
  }

  const normalized = String(value || '').trim();
  if (normalized === ALL_PRODUCTS_SENTINEL['@id']) {
    return normalized;
  }

  return normalized.replace(/\D+/g, '').trim();
};

export const shouldSyncStoredCategory = ({
  category,
  categoryId,
  storedCategory,
}) => {
  if (!category) {
    return false;
  }

  const resolvedCategoryId = categoryId || resolveRouteCategoryId(category);
  const resolvedStoredCategoryId = resolveRouteCategoryId(storedCategory);

  return !!resolvedCategoryId && resolvedStoredCategoryId !== resolvedCategoryId;
};

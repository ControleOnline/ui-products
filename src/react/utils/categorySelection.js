import {
  ALL_PRODUCTS_SENTINEL_ID,
} from '@controleonline/ui-products/src/react/constants/categorySentinels';

export const resolveRouteCategoryId = value => {
  if (value == null) return '';

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return '';
    }

    if (value?._isAllProducts || value?.['@id'] === ALL_PRODUCTS_SENTINEL_ID) {
      return ALL_PRODUCTS_SENTINEL_ID;
    }

    return String(value?.id || value?.['@id'] || '').replace(/\D+/g, '').trim();
  }

  const normalized = String(value || '').trim();
  if (normalized === ALL_PRODUCTS_SENTINEL_ID) {
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
  if (!resolvedCategoryId) {
    return false;
  }

  const resolvedStoredCategoryId = resolveRouteCategoryId(storedCategory);

  return resolvedStoredCategoryId !== resolvedCategoryId;
};

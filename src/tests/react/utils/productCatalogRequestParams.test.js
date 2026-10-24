const {describe, expect, it} = global;

const {
  buildProductCatalogRequestParams,
} = require('../../../react/utils/productCatalogRequestParams');

describe('buildProductCatalogRequestParams', () => {
  it('builds product catalog search requests for the current company', () => {
    expect(buildProductCatalogRequestParams({
      companyId: 3,
      context: 'products',
      searchQuery: ' gyros ',
    })).toEqual({
      active: 1,
      company: 3,
      'order[description]': 'ASC',
      'order[product]': 'ASC',
      product: 'gyros',
      type: ['product', 'manufactured', 'custom', 'service', 'recipe'],
    });
  });

  it('filters products by category unless the all-products sentinel is selected', () => {
    expect(buildProductCatalogRequestParams({
      categoryId: 12,
      companyId: 3,
      context: 'products',
    })['productCategory.category']).toBe('/categories/12');

    expect(buildProductCatalogRequestParams({
      categoryId: '__all_products__',
      companyId: 3,
      context: 'products',
    })).not.toHaveProperty('productCategory.category');
  });

  it('keeps the existing default supply type for supply searches', () => {
    expect(buildProductCatalogRequestParams({
      companyId: 3,
      context: 'supplies',
    }).type).toEqual(['feedstock']);
  });

  it('does not request catalog data before a company is selected', () => {
    expect(buildProductCatalogRequestParams({context: 'products'})).toEqual({});
  });
});

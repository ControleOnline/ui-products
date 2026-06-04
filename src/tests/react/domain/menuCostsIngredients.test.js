/* global jest */
const assert = require('node:assert/strict');
const { describe, it, beforeEach } = global;

jest.mock('../../../react/domain/productCatalog', () => ({
  mapProductToCatalogItem: product => ({
    id: product?.id,
    name: product?.product || product?.name || '',
    sku: product?.sku || product?.code || '',
    description: product?.description || '',
    categoryId: product?.categoryId || '',
    type: product?.type || 'feedstock',
    active: product?.active !== false,
    raw: product,
  }),
}));

jest.mock('../../../react/domain/productCosting', () => ({
  fetchLatestPurchasesByProductIds: jest.fn(),
  normalizeEntityId: value => String(value || '').replace(/\D+/g, ''),
  toNumber: value => Number.parseFloat(String(value ?? 0).replace(',', '.')) || 0,
}));

const {
  fetchLatestPurchasesByProductIds,
} = require('../../../react/domain/productCosting');

const {
  buildLiveIngredientsDb,
} = require('../../../react/domain/menuCostsIngredients');

describe('menuCostsIngredients', () => {
  beforeEach(() => {
    fetchLatestPurchasesByProductIds.mockReset();
  });

  it('deduplicates ingredients by code or name and remaps parent relations to the master record', async () => {
    fetchLatestPurchasesByProductIds.mockResolvedValue({
      10: [{ orderId: 200, orderDate: '2026-06-01', supplierLabel: 'Fornecedor A', quantity: 1, unitPrice: 5, totalPrice: 5 }],
      11: [{ orderId: 201, orderDate: '2026-06-03', supplierLabel: 'Fornecedor A', quantity: 2, unitPrice: 6, totalPrice: 12 }],
    });

    const db = await buildLiveIngredientsDb({
      companyId: 3,
      companyIri: '/people/3',
      productsActions: {
        getItems: async () => [
          { id: 10, product: 'Alho em pó', sku: 'ING001', price: 5, productFiles: [{ id: 1, file: { id: 10 } }], active: true },
          { id: 11, product: 'Alho em pó', sku: 'ING001', price: 6, productFiles: [{ id: 2, file: { id: 20 } }], active: true },
        ],
      },
      productGroupProductActions: {
        getItems: async () => [
          {
            id: 50,
            productType: 'feedstock',
            quantity: 1,
            product: { id: 90, product: 'Combo Pai', sku: 'PRD090', type: 'product', active: true },
            productChild: { id: 10, product: 'Alho em pó', sku: 'ING001' },
          },
          {
            id: 51,
            productType: 'feedstock',
            quantity: 2,
            product: { id: 90, product: 'Combo Pai', sku: 'PRD090', type: 'product', active: true },
            productChild: { id: 11, product: 'Alho em pó', sku: 'ING001' },
          },
        ],
      },
      ordersActions: {
        getItems: async () => [],
      },
      categoriesActions: {
        getItems: async () => [
          { id: 7, name: 'Temperos', categoryFiles: [{ id: 4, file: { id: 44 } }] },
        ],
      },
    });

    assert.equal(db.ingredients.length, 1);
    assert.equal(db.ingredients[0].duplicateCount, 2);
    assert.equal(db.ingredients[0].purchaseCost, 12);
    assert.equal(db.ingredients[0].purchaseQty, 2);
    assert.equal(db.products.length, 1);
    assert.equal(db.products[0].components[0].refId, 10);
    assert.equal(db.purchaseItems.length, 2);
    assert.equal(db.purchaseItems[0].resourceId, 10);
    assert.equal(db.purchaseItems[1].resourceId, 10);
  });
});

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
    type: product?.type || 'package',
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
  buildLivePackagingDb,
} = require('../../../react/domain/menuCostsPackaging');

describe('menuCostsPackaging', () => {
  beforeEach(() => {
    fetchLatestPurchasesByProductIds.mockReset();
  });

  it('deduplicates packaging by code or name and remaps parent relations to the master record', async () => {
    fetchLatestPurchasesByProductIds.mockResolvedValue({
      20: [{ orderId: 300, orderDate: '2026-06-02', supplierLabel: 'Fornecedor B', quantity: 1, unitPrice: 8, totalPrice: 8 }],
      21: [{ orderId: 301, orderDate: '2026-06-04', supplierLabel: 'Fornecedor B', quantity: 2, unitPrice: 6, totalPrice: 12 }],
    });

    const db = await buildLivePackagingDb({
      companyId: 3,
      companyIri: '/people/3',
      productsActions: {
        getItems: async () => [
          { id: 20, product: 'Pote PP 350ml', sku: 'PCK001', price: 8, productFiles: [{ id: 1, file: { id: 10 } }], active: true },
          { id: 21, product: 'Pote PP 350ml', sku: 'PCK001', price: 6, productFiles: [{ id: 2, file: { id: 20 } }], active: true },
        ],
      },
      productGroupProductActions: {
        getItems: async () => [
          {
            id: 70,
            productType: 'package',
            quantity: 1,
            product: { id: 90, product: 'Combo Pai', sku: 'PRD090', type: 'product', active: true },
            productChild: { id: 20, product: 'Pote PP 350ml', sku: 'PCK001' },
          },
          {
            id: 71,
            productType: 'package',
            quantity: 2,
            product: { id: 90, product: 'Combo Pai', sku: 'PRD090', type: 'product', active: true },
            productChild: { id: 21, product: 'Pote PP 350ml', sku: 'PCK001' },
          },
        ],
      },
      ordersActions: {
        getItems: async () => [],
      },
      categoriesActions: {
        getItems: async () => [
          { id: 7, name: 'Embalagens', categoryFiles: [{ id: 4, file: { id: 44 } }] },
        ],
      },
    });

    assert.equal(db.packaging.length, 1);
    assert.equal(db.packaging[0].duplicateCount, 2);
    assert.equal(db.packaging[0].purchaseCost, 12);
    assert.equal(db.packaging[0].purchaseQty, 2);
    assert.equal(db.packaging[0].parentRows.length, 1);
    assert.equal(db.packaging[0].parentRows[0].productName, 'Combo Pai');
    assert.equal(db.products.length, 1);
    assert.equal(db.products[0].components[0].refId, 20);
    assert.equal(db.purchaseItems.length, 2);
    assert.equal(db.purchaseItems[0].resourceId, 20);
    assert.equal(db.purchaseItems[1].resourceId, 20);
  });
});

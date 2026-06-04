/* global jest */
const assert = require('node:assert/strict');
const { describe, it, beforeEach } = global;

jest.mock('@controleonline/ui-people/src/react/utils/menuCostsSuppliers', () => ({
  buildImportedSuppliersFromPeople: jest.fn(records =>
    records.map(person => ({
      id: person.id,
      name: person.name || person.businessName || person.tradeName || '',
      contacts: person.contacts || [],
    })),
  ),
}));

jest.mock('../../../react/domain/menuCostsIngredients', () => ({
  buildLiveIngredientsDb: jest.fn(),
}));

jest.mock('../../../react/domain/menuCostsPackaging', () => ({
  buildLivePackagingDb: jest.fn(),
}));

jest.mock('../../../react/domain/productCatalog', () => ({
  mapProductToCatalogItem: jest.fn(product => ({
    id: product?.id,
    name: product?.product || product?.name || '',
    sku: product?.sku || product?.code || '',
    description: product?.description || '',
    categoryId: product?.categoryId || '',
    type: product?.type || 'product',
    active: product?.active !== false,
    price: Number(product?.price || 0),
    raw: product,
  })),
}));

const { buildImportedSuppliersFromPeople } = require('@controleonline/ui-people/src/react/utils/menuCostsSuppliers');
const { buildLiveIngredientsDb } = require('../../../react/domain/menuCostsIngredients');
const { buildLivePackagingDb } = require('../../../react/domain/menuCostsPackaging');
const { buildLiveMenuCostsDb } = require('../../../react/domain/menuCostsLiveDb');

describe('menuCostsLiveDb', () => {
  beforeEach(() => {
    buildImportedSuppliersFromPeople.mockClear();
    buildLiveIngredientsDb.mockReset();
    buildLivePackagingDb.mockReset();
  });

  it('merges live ingredients, packaging, products, recipes and suppliers from the ERP', async () => {
    buildLiveIngredientsDb.mockResolvedValue({
      categories: [{ id: 1, name: 'Ingredientes' }],
      ingredients: [{ id: 10, name: 'Alho', type: 'feedstock', active: true }],
      recipes: [],
      packaging: [],
      products: [{ id: 10, name: 'Alho', type: 'feedstock', active: true }],
      purchaseOrders: [{ id: 101, date: '2026-06-01', label: 'Compra #101' }],
      purchaseItems: [{ id: '101:10', orderId: 101, resourceType: 'ingredient', resourceId: 10 }],
      inputs: [{ id: 1, name: 'Nota fiscal' }],
      suppliers: [],
      settings: { defaultMarkupPct: 180 },
    });

    buildLivePackagingDb.mockResolvedValue({
      categories: [{ id: 2, name: 'Embalagens' }],
      ingredients: [],
      recipes: [],
      packaging: [{ id: 20, name: 'Saco', type: 'package', active: true }],
      products: [{ id: 20, name: 'Saco', type: 'package', active: true }],
      purchaseOrders: [{ id: 102, date: '2026-06-02', label: 'Compra #102' }],
      purchaseItems: [{ id: '102:20', orderId: 102, resourceType: 'packaging', resourceId: 20 }],
      inputs: [{ id: 2, name: 'Comprovante' }],
      suppliers: [],
      settings: { targetMarginPct: 55 },
    });

    const liveDb = await buildLiveMenuCostsDb({
      companyId: 3,
      companyIri: '/people/3',
      peopleActions: {
        getItems: jest.fn(async () => [
          { id: 77, name: 'Fornecedor Norte', email: 'norte@example.com' },
        ]),
      },
      productsActions: {
        getItems: jest.fn(async params => {
          const type = Array.isArray(params?.type) ? params.type : [params?.type];
          if (type.includes('manufactured') || type.includes('component')) {
            return [
              {
                id: 40,
                product: 'Combo Alpha',
                sku: 'CMB001',
                type: 'manufactured',
                active: true,
                price: 35,
              },
            ];
          }

          return [
            {
              id: 30,
              product: 'Coca-Cola 350ml',
              sku: 'DRK001',
              type: 'product',
              active: true,
              price: 8.5,
            },
          ];
        }),
      },
      productGroupProductActions: {
        getItems: jest.fn(),
      },
      ordersActions: {
        getItems: jest.fn(),
      },
      categoriesActions: {
        getItems: jest.fn(async () => [
          { id: 3, name: 'Bebidas' },
        ]),
      },
    });

    assert.equal(buildLiveIngredientsDb.mock.calls.length, 1);
    assert.equal(buildLivePackagingDb.mock.calls.length, 1);
    assert.equal(buildImportedSuppliersFromPeople.mock.calls.length, 1);
    assert.equal(liveDb.categories.length, 3);
    assert.equal(liveDb.ingredients.length, 1);
    assert.equal(liveDb.packaging.length, 1);
    assert.equal(liveDb.products.length, 3);
    assert.equal(liveDb.recipes.length, 1);
    assert.equal(liveDb.suppliers.length, 1);
    assert.equal(liveDb.purchaseOrders.length, 2);
    assert.equal(liveDb.purchaseItems.length, 2);
    assert.equal(liveDb.settings.defaultMarkupPct, 180);
    assert.equal(liveDb.settings.targetMarginPct, 55);
    assert.equal(liveDb.products.find(item => item.id === 30).name, 'Coca-Cola 350ml');
    assert.equal(liveDb.recipes[0].name, 'Combo Alpha');
  });
});

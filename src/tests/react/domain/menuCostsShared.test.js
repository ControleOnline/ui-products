/* global test */

const assert = require('node:assert/strict');

const {
  activeCostSummary,
  activeProducts,
  comparableCostLabel,
  filterBySearch,
  formatDate,
  purchaseItemsForResource,
  resourceParentUsageRows,
  RESOURCE_META,
  safeArray,
} = require('../../../react/domain/menuCostsShared');

const db = {
  categories: [
    { id: 1, name: 'Temperos' },
  ],
  ingredients: [
    {
      id: 10,
      name: 'Alho em pó',
      code: 'ALH-001',
      purchaseCost: 10,
      purchaseQty: 2,
      baseUnit: 'un',
      erpUnit: 'UN',
      categoryId: 1,
      evidenceType: 'documented',
      activeCostMode: 'latest',
    },
  ],
  recipes: [],
  packaging: [],
  products: [
    {
      id: 20,
      name: 'Combo A',
      code: 'P20',
      categoryId: 1,
      active: true,
      components: [
        { refType: 'ingredient', refId: 10, qty: 2, unit: 'un' },
      ],
      addons: [],
    },
    {
      id: 21,
      name: 'Papel Toalha',
      code: 'PKG-1',
      categoryId: 1,
      type: 'package',
      active: true,
      components: [],
      addons: [],
    },
    {
      id: 22,
      name: 'Preparo Base',
      code: 'CMP-1',
      categoryId: 1,
      type: 'component',
      active: true,
      components: [],
      addons: [],
    },
  ],
  purchaseOrders: [
    {
      id: 100,
      date: '2026-06-01',
      supplierName: 'Fornecedor A',
      paymentStatus: 'paid',
    },
  ],
  purchaseItems: [
    {
      id: 1,
      resourceType: 'ingredient',
      resourceId: 10,
      orderId: 100,
      quantity: 2,
      unitPrice: 5,
      totalPrice: 10,
      paymentStatus: 'paid',
    },
  ],
  inputs: [],
  settings: {},
};

test('menu costs shared helpers expose ingredient costing and usage rows', () => {
  const ingredient = db.ingredients[0];
  const summary = activeCostSummary(db, 'ingredient', ingredient);
  const purchaseRows = purchaseItemsForResource(db, 'ingredient', ingredient.id);
  const parentRows = resourceParentUsageRows(db, 'ingredient', ingredient.id);

  assert.equal(RESOURCE_META.ingredients.singular, 'Ingrediente');
  assert.equal(formatDate('2026-06-01'), '01/06/2026');
  assert.equal(comparableCostLabel('ingredient', ingredient), 'R$\u00a05,00 / un');
  assert.equal(summary.activePrimaryCost, 5);
  assert.equal(summary.registeredPrimaryCost, 5);
  assert.equal(summary.purchaseCount, 1);
  assert.equal(purchaseRows.length, 1);
  assert.equal(purchaseRows[0].supplierName, 'Fornecedor A');
  assert.equal(parentRows.length, 1);
  assert.equal(parentRows[0].productName, 'Combo A');
  assert.equal(parentRows[0].cost, 10);
  assert.equal(filterBySearch(db.ingredients, 'alho', [item => item.name]).length, 1);
  assert.equal(safeArray(null).length, 0);
  assert.equal(activeProducts(db).length, 1);
});

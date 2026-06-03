const assert = require('node:assert/strict');
const { describe, it } = global;

const {
  buildResaleCatalogRows,
  isResaleProduct,
  resolveResaleProductMeta,
} = require('../../../react/domain/menuCostsResale');

describe('menuCostsResale', () => {
  const categories = [
    { id: 10, category: 'Bebidas' },
    { id: 11, category: 'Refrigerantes', parent: { id: 10 } },
    { id: 12, category: 'Lanches' },
  ];

  const products = [
    {
      id: 10,
      product: 'Coca-Cola 350ml',
      sku: 'BEB001',
      type: 'product',
      price: 8.5,
      productCategory: { category: { id: 10 } },
    },
    {
      id: 11,
      product: 'Heineken 330ml',
      sku: 'BEB002',
      type: 'product',
      price: 12.9,
      productCategory: { category: { id: 11 } },
    },
    {
      id: 12,
      product: 'Agua Mineral',
      sku: 'BEB003',
      type: 'product',
      price: 4.5,
    },
    {
      id: 13,
      product: 'Combo Alpha',
      sku: 'CMB001',
      type: 'manufactured',
      price: 29.9,
      productCategory: { category: { id: 10 } },
    },
    {
      id: 14,
      product: 'Papel Toalha',
      sku: 'PKG001',
      type: 'package',
      price: 1.5,
      productCategory: { category: { id: 10 } },
    },
  ];

  it('classifies bebida products by category and keyword, excluding manufactured items', () => {
    assert.equal(isResaleProduct(products[0], categories), true);
    assert.equal(isResaleProduct(products[1], categories), true);
    assert.equal(isResaleProduct(products[2], categories), true);
    assert.equal(isResaleProduct(products[3], categories), false);
    assert.equal(isResaleProduct(products[4], categories), false);
  });

  it('builds resale rows with match metadata and sorted order', () => {
    const rows = buildResaleCatalogRows({
      products,
      categories,
    });

    assert.equal(rows.length, 3);
    assert.equal(rows[0].name, 'Agua Mineral');
    assert.equal(rows[0].matchSource, 'keyword');
    assert.equal(rows.find(row => row.name === 'Coca-Cola 350ml').categoryLabel, 'Bebidas');
    assert.equal(rows.find(row => row.name === 'Heineken 330ml').categoryPath, 'Bebidas');
    assert.equal(rows.find(row => row.name === 'Heineken 330ml').price, 12.9);
  });

  it('exposes category metadata even when the product has no direct beverage keyword', () => {
    const meta = resolveResaleProductMeta(products[0], categories);

    assert.equal(meta.matches, true);
    assert.equal(meta.matchSource, 'category');
    assert.equal(meta.categoryLabel, 'Bebidas');
  });
});

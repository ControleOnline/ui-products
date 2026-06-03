const assert = require('node:assert/strict');
const { describe, it } = global;

const {
  mergeProductDraftIntoExisting,
  resolveDuplicateProductCandidate,
} = require('../../../react/domain/productDuplicates');

describe('productDuplicates', () => {
  const products = [
    {
      id: 1,
      product: 'Alho em po',
      sku: 'ING001',
      type: 'feedstock',
      description: '',
      price: 0,
    },
    {
      id: 2,
      product: 'Pimenta calabresa',
      sku: 'ING002',
      type: 'feedstock',
      description: 'Em estoque',
      price: 10,
    },
    {
      id: 3,
      product: 'Papel toalha',
      sku: 'PKG001',
      type: 'package',
      description: 'Embalagem',
      price: 5,
    },
  ];

  it('finds feedstock duplicates by sku and by name while ignoring the current record', () => {
    const bySku = resolveDuplicateProductCandidate({
      products,
      draft: { sku: 'ing001', product: 'Outro nome', type: 'feedstock' },
      type: 'feedstock',
    });

    assert.equal(bySku?.reason, 'sku');
    assert.equal(bySku?.match?.id, 1);

    const byName = resolveDuplicateProductCandidate({
      products,
      draft: { product: 'Pimenta  Calabresa', type: 'feedstock' },
      type: 'feedstock',
    });

    assert.equal(byName?.reason, 'name');
    assert.equal(byName?.match?.id, 2);

    const ignoredSelf = resolveDuplicateProductCandidate({
      products,
      draft: { id: 2, product: 'Pimenta calabresa', sku: 'ING002', type: 'feedstock' },
      currentProductId: 2,
      type: 'feedstock',
    });

    assert.equal(ignoredSelf, null);

    const otherType = resolveDuplicateProductCandidate({
      products,
      draft: { product: 'Papel toalha', sku: 'PKG001', type: 'feedstock' },
      type: 'feedstock',
    });

    assert.equal(otherType, null);
  });

  it('fills only missing fields when enriching an existing product', () => {
    const merged = mergeProductDraftIntoExisting(
      {
        id: 10,
        product: 'Alho em po',
        sku: '',
        description: '',
        price: 0,
        active: true,
      },
      {
        product: 'Alho em po',
        sku: 'ING001',
        description: 'Embalagem de 1kg',
        price: 12.5,
        type: 'feedstock',
        productUnit: '/product_unities/2',
      },
    );

    assert.equal(merged.sku, 'ING001');
    assert.equal(merged.description, 'Embalagem de 1kg');
    assert.equal(merged.price, 12.5);
    assert.equal(merged.active, true);
    assert.equal(merged.productUnit, '/product_unities/2');
  });
});

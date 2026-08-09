const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractId,
  resolveInitialProviderId,
  buildProductPeopleSupplierPayload,
} = require('../../../react/domain/productProviderLink');

test('extractId resolves numeric and IRI values', () => {
  assert.equal(extractId(42), '42');
  assert.equal(extractId('/people/7'), '7');
  assert.equal(extractId({ '@id': '/people/9' }), '9');
});

test('resolveInitialProviderId prefers prop then route params', () => {
  assert.equal(
    resolveInitialProviderId({ id: 3 }, { initialProvider: { id: 99 } }),
    '3',
  );
  assert.equal(
    resolveInitialProviderId(null, { initialProvider: { '@id': '/people/11' } }),
    '11',
  );
  assert.equal(resolveInitialProviderId(null, {}), '');
});

test('buildProductPeopleSupplierPayload returns supplier link or null', () => {
  assert.deepEqual(
    buildProductPeopleSupplierPayload({
      productData: { id: 5 },
      initialProviderId: 8,
    }),
    {
      product: '/products/5',
      people: '/people/8',
      role: 'supplier',
    },
  );
  assert.equal(
    buildProductPeopleSupplierPayload({ productData: {}, initialProviderId: 1 }),
    null,
  );
});

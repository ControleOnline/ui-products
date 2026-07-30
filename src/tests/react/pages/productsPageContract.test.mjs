import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const pagePath = resolve('modules/controleonline/ui-products/src/react/pages/Products.js');
const pageSource = readFileSync(pagePath, 'utf8');

test('ProductsPage keeps the default table contract and all-products default view', () => {
  assert.match(pageSource, /<DefaultTable[\s\S]*storeName="products"/);
  assert.match(pageSource, /ALL_PRODUCTS_SENTINEL_ID/);
  assert.match(pageSource, /Todos os produtos/);
  assert.doesNotMatch(pageSource, /FlatList/);
  assert.doesNotMatch(pageSource, /api\.fetch\(['"`]\/products-page/);
});

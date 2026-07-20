import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const pagePath = resolve('src/react/pages/ProductShowcasesPage.js');
const pageSource = readFileSync(pagePath, 'utf8');

test('ProductShowcasesPage uses the default table contract', () => {
  const externalFiltersIndex = pageSource.indexOf('<DefaultExternalFilters');
  const defaultTableIndex = pageSource.indexOf('<DefaultTable');

  assert.ok(externalFiltersIndex >= 0);
  assert.ok(defaultTableIndex > externalFiltersIndex);
  assert.match(pageSource, /<DefaultTable[\s\S]*storeName="product_showcase_items"/);
  assert.doesNotMatch(pageSource, /showExternalFilters/);
  assert.doesNotMatch(pageSource, /api\.fetch/);
  assert.doesNotMatch(pageSource, /FlatList/);
  assert.doesNotMatch(pageSource, /summaryCard|filterChip|hero/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProductUnitOptions,
  findRecommendedServiceUnit,
  getServiceUnitPriority,
  normalizeUnitLabel,
} from '../../../react/domain/serviceUnitOptions.js';

test('normalizeUnitLabel removes accents and normalizes casing', () => {
  assert.equal(normalizeUnitLabel('  Diária  '), 'diaria');
  assert.equal(normalizeUnitLabel('MÊS'), 'mes');
});

test('getServiceUnitPriority prioritizes common billing units for services', () => {
  assert.equal(getServiceUnitPriority('Mensal'), 0);
  assert.equal(getServiceUnitPriority('Hora técnica'), 1);
  assert.equal(getServiceUnitPriority('Diária'), 2);
  assert.equal(getServiceUnitPriority('Unitário'), 3);
  assert.equal(getServiceUnitPriority('Sessão'), 4);
  assert.equal(getServiceUnitPriority('Pacote fechado'), 100);
});

test('buildProductUnitOptions sorts recommended service units before generic ones', () => {
  const options = buildProductUnitOptions([
    {id: 7, productUnit: 'Pacote'},
    {id: 3, productUnit: 'Hora'},
    {id: 1, productUnit: 'Mensal'},
    {id: 4, productUnit: 'Unitário'},
  ], true);

  assert.deepEqual(
    options.map(option => option.label),
    ['Mensal', 'Hora', 'Unitário', 'Pacote'],
  );
  assert.equal(findRecommendedServiceUnit(options)?.value, 1);
});

test('buildProductUnitOptions preserves source order for non-service products', () => {
  const options = buildProductUnitOptions([
    {id: 9, productUnit: 'Pacote'},
    {id: 2, productUnit: 'Hora'},
    {id: 5, productUnit: 'Mensal'},
  ], false);

  assert.deepEqual(
    options.map(option => option.label),
    ['Pacote', 'Hora', 'Mensal'],
  );
});

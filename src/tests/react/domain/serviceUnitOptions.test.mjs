import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProductUnitOptions,
  findRecommendedServiceUnit,
  getServiceUnitPriority,
  isServiceBillingUnit,
  normalizeUnitLabel,
} from '../../../react/domain/serviceUnitOptions.js';

test('normalizeUnitLabel removes accents and normalizes casing', () => {
  assert.equal(normalizeUnitLabel('  Diária  '), 'diaria');
  assert.equal(normalizeUnitLabel('MÊS'), 'mes');
});

test('getServiceUnitPriority prioritizes common billing units for services', () => {
  assert.equal(getServiceUnitPriority('Mensal'), 0);
  assert.equal(getServiceUnitPriority('Semanal'), 1);
  assert.equal(getServiceUnitPriority('Hora técnica'), 2);
  assert.equal(getServiceUnitPriority('Diária'), 3);
  assert.equal(getServiceUnitPriority('Unitário'), 4);
  assert.equal(getServiceUnitPriority('Sessão'), 5);
  assert.equal(getServiceUnitPriority('Pacote fechado'), 100);
  assert.equal(getServiceUnitPriority('KG'), 100);
  assert.equal(isServiceBillingUnit('Mensal'), true);
  assert.equal(isServiceBillingUnit('KG'), false);
});

test('buildProductUnitOptions hides physical units for service products', () => {
  const options = buildProductUnitOptions([
    {id: 7, productUnit: 'KG'},
    {id: 8, productUnit: 'Litro'},
    {id: 3, productUnit: 'Hora'},
    {id: 1, productUnit: 'Mensal'},
    {id: 4, productUnit: 'Unitário'},
    {id: 9, productUnit: 'Pacote'},
  ], true);

  assert.deepEqual(
    options.map(option => option.label),
    ['Mensal', 'Hora', 'Unitário'],
  );
  assert.equal(findRecommendedServiceUnit(options)?.value, 1);
});

test('buildProductUnitOptions keeps current legacy unit on service edit', () => {
  const options = buildProductUnitOptions([
    {id: 7, productUnit: 'KG'},
    {id: 1, productUnit: 'Mensal'},
  ], true, 'KG');

  assert.deepEqual(
    options.map(option => option.label),
    ['Mensal', 'KG'],
  );
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

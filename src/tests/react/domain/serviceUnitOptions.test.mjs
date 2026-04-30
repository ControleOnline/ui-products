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
  assert.equal(getServiceUnitPriority('Bimestral'), 3);
  assert.equal(getServiceUnitPriority('Hora técnica'), 7);
  assert.equal(getServiceUnitPriority('Diária'), 8);
  assert.equal(getServiceUnitPriority('Unitário'), 9);
  assert.equal(getServiceUnitPriority('Sessão'), 10);
  assert.equal(getServiceUnitPriority('Pacote fechado'), 100);
});

test('isServiceBillingUnit rejects physical measurement units for services', () => {
  assert.equal(isServiceBillingUnit('Litro'), false);
  assert.equal(isServiceBillingUnit('Grama'), false);
  assert.equal(isServiceBillingUnit('Fração'), false);
  assert.equal(isServiceBillingUnit('Mensal'), true);
  assert.equal(isServiceBillingUnit('Unitário'), true);
});

test('buildProductUnitOptions keeps only compatible billing units for services', () => {
  const options = buildProductUnitOptions([
    {id: 7, productUnit: 'Grama'},
    {id: 3, productUnit: 'Hora'},
    {id: 1, productUnit: 'Mensal'},
    {id: 4, productUnit: 'Unitário'},
    {id: 5, productUnit: 'Litro'},
  ], true);

  assert.deepEqual(
    options.map(option => option.label),
    ['Mensal', 'Hora', 'Unitário'],
  );
  assert.equal(findRecommendedServiceUnit(options)?.value, 1);
});

test('buildProductUnitOptions preserves the current service unit while editing older records', () => {
  const options = buildProductUnitOptions([
    {id: 7, productUnit: 'Fração'},
    {id: 3, productUnit: 'Hora'},
    {id: 1, productUnit: 'Mensal'},
  ], true, 7);

  assert.deepEqual(
    options.map(option => option.label),
    ['Mensal', 'Hora', 'Fração'],
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

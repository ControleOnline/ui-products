/* global describe, expect, it */
const {
  normalizeEntityId,
  buildCompanyIri,
  buildCategoryIri,
} = require('../../../react/pages/managerCategoriesHelpers');

describe('managerCategoriesHelpers (#293)', () => {
  it('normalizeEntityId strips non-digits', () => {
    expect(normalizeEntityId('/categories/12')).toBe('12');
    expect(normalizeEntityId({id: 9})).toBe('9');
  });

  it('builds IRIs', () => {
    expect(buildCompanyIri(3)).toBe('/people/3');
    expect(buildCategoryIri(12)).toBe('/categories/12');
  });
});

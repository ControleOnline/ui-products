const {
  shouldUseInlinePdvCategories,
} = require('../../../../react/pages/CategoriesPage/shouldUseInlinePdvCategories');

const {describe, expect, it} = global;

describe('shouldUseInlinePdvCategories', () => {
  it('uses compact inline categories only in the mobile POS waiter flow', () => {
    expect(shouldUseInlinePdvCategories({
      appType: 'POS',
      interactionMode: 'pdv',
      isMobileCatalog: true,
    })).toBe(true);

    expect(shouldUseInlinePdvCategories({
      appType: 'SHOP',
      interactionMode: 'pdv',
      isMobileCatalog: true,
    })).toBe(false);

    expect(shouldUseInlinePdvCategories({
      appType: 'MANAGER',
      interactionMode: 'pdv',
      isMobileCatalog: true,
    })).toBe(false);

    expect(shouldUseInlinePdvCategories({
      appType: 'POS',
      interactionMode: 'pdv',
      isMobileCatalog: false,
    })).toBe(false);
  });
});

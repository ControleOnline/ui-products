const {
  shouldUseInlinePdvCategories,
} = require('../../../../react/pages/CategoriesPage/shouldUseInlinePdvCategories');

const {describe, expect, it} = global;

describe('shouldUseInlinePdvCategories', () => {
  it('uses compact inline categories only on mobile POS waiter devices', () => {
    expect(shouldUseInlinePdvCategories({
      appType: 'POS',
      interactionMode: 'pdv',
      isMobileCatalog: true,
      isWaiterPosMode: true,
    })).toBe(true);

    expect(shouldUseInlinePdvCategories({
      appType: 'POS',
      interactionMode: 'pdv',
      isMobileCatalog: true,
      isWaiterPosMode: false,
    })).toBe(false);

    expect(shouldUseInlinePdvCategories({
      appType: 'POS',
      interactionMode: 'pdv',
      isMobileCatalog: true,
    })).toBe(false);
  });

  it('keeps the regular catalog outside the mobile POS waiter flow', () => {
    expect(shouldUseInlinePdvCategories({
      appType: 'SHOP',
      interactionMode: 'pdv',
      isMobileCatalog: true,
      isWaiterPosMode: true,
    })).toBe(false);

    expect(shouldUseInlinePdvCategories({
      appType: 'POS',
      interactionMode: 'manager',
      isMobileCatalog: true,
      isWaiterPosMode: true,
    })).toBe(false);

    expect(shouldUseInlinePdvCategories({
      appType: 'POS',
      interactionMode: 'pdv',
      isMobileCatalog: false,
      isWaiterPosMode: true,
    })).toBe(false);
  });
});

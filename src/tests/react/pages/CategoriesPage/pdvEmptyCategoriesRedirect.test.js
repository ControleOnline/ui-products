const {
  shouldRedirectEmptyCategoriesToProducts,
} = require('../../../../react/pages/CategoriesPage/pdvEmptyCategoriesRedirect');

const {describe, expect, it} = global;

describe('shouldRedirectEmptyCategoriesToProducts', () => {
  it('redirects PDV when categories list is empty or missing', () => {
    expect(
      shouldRedirectEmptyCategoriesToProducts({
        isManagerApp: false,
        data: [],
      }),
    ).toBe(true);

    expect(
      shouldRedirectEmptyCategoriesToProducts({
        isManagerApp: false,
        data: null,
      }),
    ).toBe(true);

    expect(
      shouldRedirectEmptyCategoriesToProducts({
        isManagerApp: false,
        data: undefined,
      }),
    ).toBe(true);
  });

  it('does not redirect when categories exist in PDV', () => {
    expect(
      shouldRedirectEmptyCategoriesToProducts({
        isManagerApp: false,
        data: [{id: 1, name: 'Lanches'}],
      }),
    ).toBe(false);
  });

  it('never redirects in manager mode (even with empty list)', () => {
    expect(
      shouldRedirectEmptyCategoriesToProducts({
        isManagerApp: true,
        data: [],
      }),
    ).toBe(false);

    expect(
      shouldRedirectEmptyCategoriesToProducts({
        isManagerApp: true,
        data: [{id: 1}],
      }),
    ).toBe(false);
  });
});

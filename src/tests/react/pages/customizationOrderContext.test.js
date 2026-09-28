const {describe, expect, it} = global;

const {
  buildCustomizeScreenRouteParams,
  resolveCustomizationOrderContext,
} = require('../../../react/pages/customizationOrderContext');

describe('customizationOrderContext', () => {
  it('carries the active POS order into the customization route', () => {
    expect(buildCustomizeScreenRouteParams({
      productId: 134,
      orderId: 72908,
      interactionMode: 'pdv',
      singleItemMode: false,
    })).toEqual({
      productId: 134,
      orderId: 72908,
      interactionMode: 'pdv',
      singleItemMode: false,
    });
  });

  it('uses the active POS session when route and order store context are absent', () => {
    expect(resolveCustomizationOrderContext({
      sessionOrder: {id: 73421, '@id': '/orders/73421'},
    })).toEqual({
      id: '73421',
      iri: '/orders/73421',
    });
  });

  it('uses the route order when the global order store is empty', () => {
    expect(resolveCustomizationOrderContext({routeOrderId: 72908})).toEqual({
      id: '72908',
      iri: '/orders/72908',
    });
  });
});

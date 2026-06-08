const { buildProductDetailsBrowserPath } = require('../../../react/domain/productDetailsUrl');

describe('productDetailsUrl', () => {
  it('keeps the product id in the modal pathname', () => {
    expect(
      buildProductDetailsBrowserPath({
        pathname: '/product-details-modal',
        routeName: 'ProductDetailsModal',
        productId: '/products/1133',
      }),
    ).toBe('/product-details-modal/1133');
  });

  it('keeps the product id when the path already has a tab suffix', () => {
    expect(
      buildProductDetailsBrowserPath({
        pathname: '/product-details-modal/1133/Vendas',
        routeName: 'ProductDetailsModal',
        productId: 1133,
      }),
    ).toBe('/product-details-modal/1133');
  });

  it('leaves unrelated paths untouched', () => {
    expect(
      buildProductDetailsBrowserPath({
        pathname: '/orders/123',
        routeName: 'ProductDetailsModal',
        productId: 1133,
      }),
    ).toBe('/orders/123');
  });
});

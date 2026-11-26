const fs = require('fs');
const path = require('path');

describe('ui-products router modal path', () => {
  it('keeps the product id in the ProductDetailsModal url', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../react/router/routes.js'),
      'utf8',
    );

    expect(source).toContain("path: 'product-details-modal/:ProductId?'");
    expect(source).toContain('ProductId: normalizeNumericParam');
  });

  it('enables CompanyFilter on ProductsPage (task-708)', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../react/router/routes.js'),
      'utf8',
    );

    expect(source).toContain("name: 'ProductsPage'");
    expect(source).toContain('showCompanyFilter: true');
    expect(source).toContain("companyFilterMode: 'icon'");
  });
});

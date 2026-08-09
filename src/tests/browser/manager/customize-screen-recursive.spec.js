const {expect, test} = require('@playwright/test');
const packageJson = require('../../../../package.json');

const API_ORIGIN = process.env.API_ORIGIN || 'http://127.0.0.1:8000';
const APP_VERSION = packageJson?.version || '1.0.0';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const textHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'text/css; charset=utf-8',
});

const company = {
  id: 1,
  '@id': '/people/1',
  name: 'Gyros Teste',
  alias: 'GYROS',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {
    colors: {
      primary: '#6B3924',
      secondary: '#D9A441',
    },
  },
};

const rootProduct = {
  id: 900,
  '@id': '/products/900',
  product: 'Combo Gyros',
  description: 'Combo customizável com batata.',
  sku: 'GYROS-900',
  type: 'custom',
  active: true,
  price: 27.5,
  productFiles: [],
  extraData: {},
};

const childProduct = {
  id: 200,
  '@id': '/products/200',
  product: 'Batata Rústica',
  description: 'Batata com molho obrigatório.',
  type: 'custom',
  active: true,
  price: 4,
  productFiles: [],
  extraData: {},
};

const grandchildProduct = {
  id: 300,
  '@id': '/products/300',
  product: 'Molho da Casa',
  description: 'Molho para a batata.',
  type: 'component',
  active: true,
  price: 0,
  productFiles: [],
  extraData: {},
};

const rootGroup = {
  id: 10,
  '@id': '/product_groups/10',
  productGroup: 'Escolha sua batata',
  required: true,
  minimum: 1,
  maximum: 1,
  priceCalculation: 'sum',
  groupOrder: 1,
};

const childGroup = {
  id: 11,
  '@id': '/product_groups/11',
  productGroup: 'Escolha o molho',
  required: true,
  minimum: 1,
  maximum: 1,
  priceCalculation: 'sum',
  groupOrder: 1,
};

const setupRecursiveCustomizeApi = async page => {
  const errors = [];

  page.on('pageerror', error => {
    errors.push(error);
  });

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
        body: '',
      });
    }

    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: textHeaders(),
        body: ':root { --primary: #6b3924; --secondary: #d9a441; }',
      });
    }

    if (pathname === 'runtime/ip') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ip: '127.0.0.1'}),
      });
    }

    if (pathname === 'menus-people') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({modules: {}}),
      });
    }

    if (pathname === 'people/companies/my') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([company])),
      });
    }

    if (pathname === 'people/company/default') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(company),
      });
    }

    if (pathname === 'configs/discovery-configs') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({configs: {}}),
      });
    }

    if (pathname === 'products') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([rootProduct])),
      });
    }

    if (pathname === 'product_groups') {
      const productId = String(url.searchParams.get('product') || '').replace(/\D/g, '');

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          collection(
            productId === '900'
              ? [rootGroup]
              : productId === '200'
                ? [childGroup]
                : [],
          ),
        ),
      });
    }

    if (pathname === 'product_group_products') {
      const groupId = String(url.searchParams.get('productGroup') || '').replace(/\D/g, '');

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          collection(
            groupId === '10'
              ? [
                  {
                    id: 501,
                    '@id': '/product_group_products/501',
                    productGroup: '/product_groups/10',
                    product: '/products/900',
                    productChild: childProduct,
                    price: 4,
                    quantity: 1,
                  },
                ]
              : groupId === '11'
                ? [
                    {
                      id: 601,
                      '@id': '/product_group_products/601',
                      productGroup: '/product_groups/11',
                      product: '/products/200',
                      productChild: grandchildProduct,
                      price: 0,
                      quantity: 1,
                    },
                  ]
                : [],
          ),
        ),
      });
    }

    if (pathname.startsWith('products/')) {
      const id = Number(pathname.split('/').pop());
      const product =
        id === rootProduct.id
          ? rootProduct
          : id === childProduct.id
            ? childProduct
            : id === grandchildProduct.id
              ? grandchildProduct
              : rootProduct;

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(product),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  await page.addInitScript(
    ({appVersion}) => {
      localStorage.setItem(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test-api-key',
          active: 1,
          mycompany: 1,
          name: 'Test User',
          realname: 'Test User',
          username: 'tester',
          roles: ['ROLE_SUPER'],
        }),
      );
      localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
      localStorage.setItem('app-type', 'SHOP');
      localStorage.setItem(
        'device',
        JSON.stringify({
          id: 'web-products',
          device: 'web-products',
          type: 'SHOP',
          appName: 'ControleOnline',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'SHOP',
          metadata: {},
        }),
      );
    },
    {appVersion: APP_VERSION},
  );

  return {errors};
};

test.describe('recursive customize browser smoke', () => {
  test('opens a child customization surface and preserves the parent selection', async ({page}) => {
    const {errors} = await setupRecursiveCustomizeApi(page);

    await page.goto('/products-page/__all_products__?store=products&context=products');

    await expect(page.getByText('Combo Gyros')).toBeVisible();
    await page.getByRole('button', {name: 'CUSTOMIZAR'}).click();

    await expect(page.getByText('Escolha sua batata')).toBeVisible();
    await page.getByLabel('Selecionar Batata Rústica').click();

    await expect(page.getByText('Batata Rústica')).toBeVisible();
    await expect(page.getByText('Escolha o molho')).toBeVisible();
    await expect(
      page.getByRole('button', {name: /Voltar para Combo Gyros/i}),
    ).toBeVisible();

    await page.getByRole('button', {name: /Voltar para Combo Gyros/i}).click();

    await expect(page.getByText('Combo Gyros')).toBeVisible();
    await expect(
      page.getByRole('button', {name: /Configurar subitem Batata Rústica/i}),
    ).toBeVisible();
    expect(errors.map(error => error.message)).toEqual([]);
  });
});

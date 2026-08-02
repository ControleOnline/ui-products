const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

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
  name: 'Jagunços',
  alias: 'JAGUNCOS',
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

const products = [
  {
    id: 415,
    '@id': '/products/415',
    product: 'Tesoura Aviação Eda Corte Reto',
    description: 'Tesoura para cortes retos.',
    sku: 'EDA-415',
    type: 'product',
    active: true,
    price: 67.3,
    productFiles: [],
    extraData: {},
  },
  {
    id: 416,
    '@id': '/products/416',
    product: 'Alicate Corte Diagonal',
    description: 'Alicate para uso geral.',
    sku: 'EDA-416',
    type: 'product',
    active: true,
    price: 21.7,
    productFiles: [],
    extraData: {},
  },
];

const catalogStatus = {
  provider: {id: 1, name: 'Jagunços'},
  platforms: {
    '99food': {
      platform: {active: false},
      products: [],
      categories: [],
    },
    ifood: {
      platform: {active: false},
      products: [],
      categories: [],
    },
  },
};

const setupProductsApi = async page => {
  const requests = [];
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

    if (method !== 'OPTIONS') {
      requests.push({
        pathname,
        method,
        categoryFilter: url.searchParams.get('productCategory.category'),
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

    if (pathname === 'marketplace/integrations/catalog/status') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(catalogStatus),
      });
    }

    if (pathname === 'products') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(products)),
      });
    }

    if (pathname === 'normalized-catalog/download') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ok: true}),
      });
    }

    if (pathname.startsWith('products/')) {
      const id = Number(pathname.split('/').pop());
      const product = products.find(item => Number(item.id) === id) || products[0];

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
      localStorage.setItem('app-type', 'MANAGER');
      localStorage.setItem(
        'device',
        JSON.stringify({
          id: 'web-products',
          device: 'web-products',
          type: 'MANAGER',
          appName: 'ControleOnline',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'MANAGER',
          metadata: {},
        }),
      );
    },
    {appVersion: APP_VERSION},
  );

  return {requests, errors};
};

test.describe('products browser smoke', () => {
  test('loads all products as the default catalog view without a category filter', async ({page}) => {
    const {requests, errors} = await setupProductsApi(page);

    await page.goto('/products-page/__all_products__?store=products&context=products&interactionMode=manager');

    await expect(page.getByText('Tesoura Aviação Eda Corte Reto')).toBeVisible();
    await expect(page.getByText('Alicate Corte Diagonal')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Add'})).toBeVisible();

    const firstProductsRequest = requests.find(entry => entry.pathname === 'products');
    expect(firstProductsRequest).toBeTruthy();
    expect(firstProductsRequest.categoryFilter).toBeNull();
    expect(errors.map(error => error.message)).toEqual([]);
  });

  test('switches from a category view back to all products', async ({page}) => {
    const {requests, errors} = await setupProductsApi(page);

    await page.goto('/products-page/10?store=products&context=products&interactionMode=manager');

    await expect(page.getByRole('button', {name: 'All Products'})).toBeVisible();
    await expect(page.getByText('Tesoura Aviação Eda Corte Reto')).toBeVisible();

    const categoryRequest = requests.find(entry => entry.pathname === 'products');
    expect(categoryRequest).toBeTruthy();
    expect(categoryRequest.categoryFilter).toContain('/categories/10');

    const allProductsBefore = requests.filter(
      entry => entry.pathname === 'products' && entry.categoryFilter === null,
    ).length;

    await page.getByRole('button', {name: 'All Products'}).click();
    await expect(page).not.toHaveURL(/\/products-page\/10\b/);
    await expect(page.getByText('Tesoura Aviação Eda Corte Reto')).toBeVisible();

    await expect.poll(
      () => requests.filter(entry => entry.pathname === 'products' && entry.categoryFilter === null).length,
    ).toBeGreaterThan(allProductsBefore);

    expect(errors.map(error => error.message)).toEqual([]);
  });
});

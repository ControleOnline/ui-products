/**
 * Smoke: after creating a category, opening Adicionar Produto with that
 * categoryId on the route must surface the new category in the form options
 * (reload path via shouldReloadCategoryOptions).
 *
 * Refs: ControleOnline/app-community#99
 */
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

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const company = {
  id: 3,
  '@id': '/people/3',
  name: 'Teste',
  alias: 'TESTE',
  panel_enabled: true,
  enabled: true,
};

const existingCategories = [
  {id: 10, '@id': '/categories/10', name: 'Bebidas', context: 'product', color: '#0EA5E9'},
  {id: 11, '@id': '/categories/11', name: 'Lanches', context: 'product', color: '#10b981'},
];

const newlyCreatedCategory = {
  id: 42,
  '@id': '/categories/42',
  name: 'Categoria Recem Criada Smoke',
  context: 'product',
  color: '#F59E0B',
};

test.describe('category after create → product form smoke', () => {
  test('reloads category options so the newly created category is selectable', async ({
    page,
  }) => {
    const categoryGetCalls = [];
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error);
    });

    // First list responses omit the new category; subsequent ones include it
    // (simulates cache lag after create, which the ProductForm reload fixes).
    let categoriesFetchCount = 0;

    await page.route(`${API_ORIGIN}/**`, async route => {
      const request = route.request();
      const method = request.method().toUpperCase();
      const pathname = new URL(request.url()).pathname.replace(/^\/+/, '');

      if (method === 'OPTIONS') {
        return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
      }

      if (pathname === 'categories' || pathname.startsWith('categories')) {
        categoriesFetchCount += 1;
        categoryGetCalls.push({pathname, method, n: categoriesFetchCount});
        const member =
          categoriesFetchCount === 1
            ? existingCategories
            : [...existingCategories, newlyCreatedCategory];
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(collection(member)),
        });
      }

      if (pathname === 'people/companies/my' || pathname === 'people/company/default') {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(
            pathname === 'people/companies/my' ? collection([company]) : company,
          ),
        });
      }

      if (pathname === 'companies' || pathname.startsWith('people/')) {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(company),
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

      if (pathname === 'configs/discovery-configs') {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify({configs: {}}),
        });
      }

      if (pathname === 'products' || pathname.startsWith('products/')) {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(collection([])),
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
            mycompany: 3,
            name: 'Test User',
            roles: ['ROLE_ADMIN', 'ROLE_SUPER'],
          }),
        );
        localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
        localStorage.setItem('app-type', 'MANAGER');
        localStorage.setItem(
          'device',
          JSON.stringify({
            id: 'web',
            device: 'web',
            type: 'MANAGER',
            appVersion,
            buildNumber: appVersion,
          }),
        );
      },
      {appVersion: APP_VERSION},
    );

    // Open Adicionar Produto with the newly created category id on the route
    // (same path Manager → Produtos → categoria → Adicionar Produto).
    await page.goto(
      `/product-details?categoryId=42&store=products&context=products&interactionMode=manager`,
    );

    // Form header / add product context
    await expect(page.getByText(/Adicionar Produto|Produto|Dados/i).first()).toBeVisible({
      timeout: 20000,
    });

    // Category multi-select label
    await expect(page.getByText(/^Categorias$/i).first()).toBeVisible({timeout: 15000});

    // Open the categories picker and assert the newly created category is listed
    const categoriesField = page.getByText(/^Categorias$/i).first();
    await categoriesField.click();

    // Prefer opening via nearby chevron / placeholder area if needed
    const pickerTrigger = page
      .locator('text=Sem categoria')
      .or(page.locator('text=Categorias').first());
    if (await page.getByText('Sem categoria').count()) {
      await page.getByText('Sem categoria').first().click();
    }

    await expect(page.getByText(newlyCreatedCategory.name)).toBeVisible({
      timeout: 15000,
    });

    // Reload path must have triggered at least a second categories fetch
    await expect.poll(() => categoriesFetchCount).toBeGreaterThanOrEqual(2);

    expect(errors.map(e => e.message)).toEqual([]);
  });
});

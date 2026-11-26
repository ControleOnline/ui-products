/**
 * fluxo: outros
 * Justificativa: jornada visual do seletor currentCompany em products-page
 * (paridade com clients-index). Fora dos fluxos de negócio do catálogo.
 * Issue: app-community#708
 *
 * Passos / prints:
 * 1. header products-page com CompanyFilter (alias da company)
 * 2. modal Selecionar Empresa
 * 3. após troca: header + listagem no contexto da outra company
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

const companyA = {
  id: 1,
  '@id': '/people/1',
  name: 'Jagunços',
  alias: 'JAGUNCOS',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {colors: {primary: '#6B3924', secondary: '#D9A441'}},
};

const companyB = {
  id: 2,
  '@id': '/people/2',
  name: 'Lave Go',
  alias: 'LAVEGO',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {colors: {primary: '#0EA5E9', secondary: '#38BDF8'}},
};

const productsByCompany = {
  1: [
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
  ],
  2: [
    {
      id: 801,
      '@id': '/products/801',
      product: 'Kit Lavagem Premium',
      description: 'Kit da empresa Lave Go.',
      sku: 'LG-801',
      type: 'product',
      active: true,
      price: 49.9,
      productFiles: [],
      extraData: {},
    },
  ],
};

const setupApi = async page => {
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
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    const companyHeader =
      request.headers()['company'] ||
      request.headers()['x-company'] ||
      url.searchParams.get('company');

    requests.push({pathname, method, companyHeader});

    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: textHeaders(),
        body: ':root { --primary: #6b3924; }',
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
        body: JSON.stringify(collection([companyA, companyB])),
      });
    }

    if (pathname === 'people/company/default') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(companyA),
      });
    }

    if (pathname === 'products') {
      const companyId = Number(companyHeader || 1);
      const list = productsByCompany[companyId] || productsByCompany[1];
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(list)),
      });
    }

    if (pathname === 'marketplace/integrations/catalog/status') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          provider: {id: 1, name: 'Jagunços'},
          platforms: {},
        }),
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

const PRODUCTS_URL =
  '/products-page/__all_products__?store=products&context=products&interactionMode=manager';

test.describe('products-page company filter (#708) — fluxo: outros', () => {
  test('shows currentCompany selector and switches company context', async (
    {page},
    testInfo,
  ) => {
    const {errors} = await setupApi(page);
    await page.goto(PRODUCTS_URL);

    await expect(page.getByText('Tesoura Aviação Eda Corte Reto')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('JAGUNCOS').first()).toBeVisible({
      timeout: 15000,
    });

    await page.screenshot({
      path: testInfo.outputPath('01-products-header-company-filter.png'),
      fullPage: true,
    });

    await page.getByText('JAGUNCOS').first().click();
    await expect(page.getByText('Selecionar Empresa')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('LAVEGO')).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('02-company-selector-modal.png'),
      fullPage: true,
    });

    await page.getByText('LAVEGO').click();
    await expect(page.getByText('LAVEGO').first()).toBeVisible({timeout: 10000});
    await expect(page.getByText('Kit Lavagem Premium')).toBeVisible({
      timeout: 15000,
    });

    await page.screenshot({
      path: testInfo.outputPath('03-after-switch-lavego.png'),
      fullPage: true,
    });

    expect(errors.map(error => error.message)).toEqual([]);
  });
});

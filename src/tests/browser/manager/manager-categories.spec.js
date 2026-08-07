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
const collection = member => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

test.describe('manager categories smoke', () => {
  test('renders manager categories with DefaultTable search', async ({page}) => {
    const categories = [
      {id: 1, name: 'Bebidas', context: 'product', color: '#0EA5E9', icon: 'coffee'},
      {id: 2, name: 'Lanches', context: 'product', color: '#10b981', icon: null},
    ];
    await page.route(`${API_ORIGIN}/**`, async route => {
      const method = route.request().method().toUpperCase();
      const pathname = new URL(route.request().url()).pathname.replace(/^\/+/, '');
      if (method === 'OPTIONS') {
        return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
      }
      if (pathname === 'categories' || pathname.startsWith('categories')) {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(collection(categories)),
        });
      }
      if (pathname === 'companies' || pathname.startsWith('people/')) {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify({id: 3, name: 'Teste', alias: 'TESTE', panel_enabled: true}),
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
        const set = (k, v) => {
          try {
            localStorage.setItem(k, v);
          } catch {}
        };
        set(
          'session',
          JSON.stringify({
            id: 7,
            people: '/people/7',
            api_key: 't',
            active: 1,
            mycompany: 3,
            roles: ['ROLE_ADMIN'],
          }),
        );
        set('config', JSON.stringify({language: 'pt-br'}));
        set('app-type', 'ERP');
        set(
          'device',
          JSON.stringify({
            id: 'web',
            device: 'web',
            type: 'WEB',
            appVersion,
            buildNumber: appVersion,
          }),
        );
      },
      {appVersion: APP_VERSION},
    );
    await page.goto('/manager-categories-page');
    await expect(page.getByText(/Categorias/i).first()).toBeVisible({timeout: 15000});
    await expect(page.getByPlaceholder(/Buscar categoria/i)).toBeVisible();
  });
});

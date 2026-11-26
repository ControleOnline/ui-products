const {
  resolveRouteCategoryId,
  resolveCatalogCategory,
  shouldSyncStoredCategory,
  shouldReloadCategoryOptions,
} = require('../../../react/utils/categorySelection')
const {
  ALL_PRODUCTS_SENTINEL_ID,
} = require('../../../react/constants/categorySentinels')

const {describe, expect, it} = global

describe('categorySelection', () => {
  it('normalizes category ids from route values and entities', () => {
    expect(resolveRouteCategoryId('/categories/15')).toBe('15')
    expect(resolveRouteCategoryId({id: 9})).toBe('9')
    expect(resolveRouteCategoryId({'@id': '/categories/21'})).toBe('21')
    expect(resolveRouteCategoryId(ALL_PRODUCTS_SENTINEL_ID)).toBe(ALL_PRODUCTS_SENTINEL_ID)
    expect(resolveRouteCategoryId(undefined)).toBe('')
    expect(resolveRouteCategoryId(null)).toBe('')
    expect(resolveRouteCategoryId([])).toBe('')
  })

  it('does not request store sync when stored category already matches by id', () => {
    expect(
      shouldSyncStoredCategory({
        category: {id: 10, category: 'Bebidas'},
        categoryId: '10',
        storedCategory: {'@id': '/categories/10', category: 'Bebidas'},
      }),
    ).toBe(false)
  })

  it('requests store sync only when selected category id differs from store', () => {
    expect(
      shouldSyncStoredCategory({
        category: {id: 11, category: 'Lanches'},
        categoryId: '11',
        storedCategory: {'@id': '/categories/9', category: 'Pizzas'},
      }),
    ).toBe(true)
  })

  it('does not request store sync when selected category has no resolvable id', () => {
    expect(
      shouldSyncStoredCategory({
        category: {},
        categoryId: '',
        storedCategory: {'@id': '/categories/9', category: 'Pizzas'},
      }),
    ).toBe(false)
  })

  it('defaults catalog selection to all products when route category is missing', () => {
    expect(
      resolveCatalogCategory({
        storedCategory: null,
        categories: [
          {id: 1, '@id': '/categories/1', name: 'Bebidas'},
        ],
        routeCategoryId: '',
      }),
    ).toMatchObject({
      '@id': ALL_PRODUCTS_SENTINEL_ID,
      name: 'Todos os produtos',
    })
  })
})


describe('shouldReloadCategoryOptions', () => {
  it('does not reload when route category is missing', () => {
    expect(
      shouldReloadCategoryOptions({
        categories: [{ id: 1, name: 'A' }],
        routeCategoryId: '',
      }),
    ).toBe(false)
  })

  it('does not reload for all-products sentinel', () => {
    expect(
      shouldReloadCategoryOptions({
        categories: [{ id: 1, name: 'A' }],
        routeCategoryId: ALL_PRODUCTS_SENTINEL_ID,
      }),
    ).toBe(false)
  })

  it('does not reload when route category is already in the list', () => {
    expect(
      shouldReloadCategoryOptions({
        categories: [
          { id: 10, '@id': '/categories/10', name: 'Bebidas' },
          { id: 11, '@id': '/categories/11', name: 'Lanches' },
        ],
        routeCategoryId: '11',
      }),
    ).toBe(false)
  })

  it('reloads when route category is absent from the local list', () => {
    expect(
      shouldReloadCategoryOptions({
        categories: [{ id: 10, '@id': '/categories/10', name: 'Bebidas' }],
        routeCategoryId: '/categories/42',
      }),
    ).toBe(true)
  })

  it('reloads when category list is empty and route has a concrete id', () => {
    expect(
      shouldReloadCategoryOptions({
        categories: [],
        routeCategoryId: 7,
      }),
    ).toBe(true)
  })
})

const {
  resolveRouteCategoryId,
  resolveCatalogCategory,
  shouldSyncStoredCategory,
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

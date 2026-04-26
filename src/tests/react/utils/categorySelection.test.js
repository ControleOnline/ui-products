const {
  resolveRouteCategoryId,
  shouldSyncStoredCategory,
} = require('../../../react/utils/categorySelection')

const {describe, expect, it} = global

describe('categorySelection', () => {
  it('normalizes category ids from route values and entities', () => {
    expect(resolveRouteCategoryId('/categories/15')).toBe('15')
    expect(resolveRouteCategoryId({id: 9})).toBe('9')
    expect(resolveRouteCategoryId({'@id': '/categories/21'})).toBe('21')
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
})

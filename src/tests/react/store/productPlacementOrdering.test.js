/* global jest */
jest.mock('@controleonline/ui-default/src/store/default/actions', () => ({}))
jest.mock('@controleonline/ui-default/src/store/default/getters', () => ({}))
jest.mock('@controleonline/ui-default/src/store/default/mutations', () => ({
  __esModule: true,
  default: {},
}))

const productCategoriesStore = require('../../../store/products/product_category').default
const productGroupsStore = require('../../../store/products/product_group').default
const productGroupProductsStore = require('../../../store/products/product_group_product').default
const productShowcaseItemsStore = require('../../../store/product_showcase_items').default

const {describe, expect, it} = global

const findOrderColumn = store =>
  store.state.columns.find(column =>
    column.name === 'sortOrder' || column.name === 'groupOrder',
  )

describe('product placement ordering', () => {
  it.each([
    ['category', productCategoriesStore],
    ['group', productGroupsStore],
    ['group product', productGroupProductsStore],
    ['showcase product', productShowcaseItemsStore],
  ])('exposes an editable default order for %s', (label, store) => {
    expect(findOrderColumn(store)).toMatchObject({
      defaultSort: 'ASC',
      editable: true,
      sortable: true,
    })
  })
})

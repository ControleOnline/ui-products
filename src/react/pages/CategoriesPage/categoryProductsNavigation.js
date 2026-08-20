import { ALL_PRODUCTS_SENTINEL } from '@controleonline/ui-products/src/react/constants/categorySentinels'
import { normalizeEntityId } from './categoryPageUtils'

export function navigateToCategoryProducts({
  category,
  categoryActions,
  context,
  interactionMode,
  navigation,
  operationalRouteParams,
}) {
  const categoryId =
    category?._isAllProducts || category?.['@id'] === ALL_PRODUCTS_SENTINEL['@id']
      ? ALL_PRODUCTS_SENTINEL['@id']
      : normalizeEntityId(category)

  categoryActions.setItem(category || null)
  navigation.navigate({
    name: 'ProductsPage',
    params: {
      ...operationalRouteParams,
      categoryId,
      context,
      interactionMode,
      showBottomCart: interactionMode === 'pdv',
      showBottomToolBar: interactionMode === 'pdv',
    },
    merge: false,
  })
}

export function navigateToAllProducts({
  categoryActions,
  context,
  interactionMode,
  navigation,
  operationalRouteParams,
}) {
  categoryActions.setItem(ALL_PRODUCTS_SENTINEL)
  navigation.navigate({
    name: 'ProductsPage',
    params: {
      ...operationalRouteParams,
      categoryId: ALL_PRODUCTS_SENTINEL['@id'],
      context,
      interactionMode,
      showBottomCart: interactionMode === 'pdv',
      showBottomToolBar: interactionMode === 'pdv',
    },
    merge: false,
  })
}

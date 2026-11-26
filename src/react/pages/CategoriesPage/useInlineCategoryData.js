import {useCallback, useState} from 'react'
import {useFocusEffect} from '@react-navigation/native'
import {writeCachedCategories} from '../../utils/categoryCache'
import {shouldRedirectEmptyCategoriesToProducts} from './pdvEmptyCategoriesRedirect'

export default function useInlineCategoryData({categoryActions, context, currentCompany,
  emptyCategoriesRedirectedRef, isManagerApp, openAllProducts, requestParams,
  categoriesPrefetched, useInlinePdvCategories}) {
  const [categoryFetchError, setCategoryFetchError] = useState(null)
  const [categoryFetchLoading, setCategoryFetchLoading] = useState(false)
  const fetchInlineCategories = useCallback(async (isCancelled = () => false) => {
    if (!currentCompany?.id) return
    setCategoryFetchError(null)
    setCategoryFetchLoading(true)
    try {
      const data = await categoryActions.getItems(requestParams)
      if (isCancelled()) return
      if (!Array.isArray(data)) throw new Error('Invalid category response')
      writeCachedCategories(currentCompany.id, data, context)
      if (!emptyCategoriesRedirectedRef.current &&
          shouldRedirectEmptyCategoriesToProducts({isManagerApp, data})) {
        emptyCategoriesRedirectedRef.current = true
        openAllProducts()
      }
    } catch (error) {
      if (!isCancelled()) setCategoryFetchError(error)
    } finally {
      if (!isCancelled()) setCategoryFetchLoading(false)
    }
  }, [categoryActions, context, currentCompany?.id, isManagerApp, openAllProducts, requestParams])

  useFocusEffect(useCallback(() => {
    if (!useInlinePdvCategories || categoriesPrefetched === true) return
    let cancelled = false
    fetchInlineCategories(() => cancelled)
    return () => { cancelled = true }
  }, [fetchInlineCategories, categoriesPrefetched, useInlinePdvCategories]))

  return {categoryFetchError, categoryFetchLoading, fetchInlineCategories}
}

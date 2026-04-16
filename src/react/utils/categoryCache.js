const CATEGORY_CACHE_KEY = 'categories'
const CATEGORY_CACHE_COMPANY_KEY = 'categories-company'

const isStorageAvailable = () => typeof localStorage !== 'undefined'

const normalizeCompanyId = companyId =>
  String(companyId || '').replace(/\D+/g, '').trim()

export const readCachedCategories = companyId => {
  if (!isStorageAvailable()) return []

  const normalizedCompanyId = normalizeCompanyId(companyId)
  const cachedCompanyId = normalizeCompanyId(
    localStorage.getItem(CATEGORY_CACHE_COMPANY_KEY),
  )

  if (!normalizedCompanyId || cachedCompanyId !== normalizedCompanyId) {
    return []
  }

  try {
    const cached = JSON.parse(localStorage.getItem(CATEGORY_CACHE_KEY) || '[]')
    return Array.isArray(cached) ? cached : []
  } catch (error) {
    return []
  }
}

export const writeCachedCategories = (companyId, categories) => {
  if (!isStorageAvailable()) return

  const normalizedCompanyId = normalizeCompanyId(companyId)

  if (!normalizedCompanyId) {
    localStorage.removeItem(CATEGORY_CACHE_KEY)
    localStorage.removeItem(CATEGORY_CACHE_COMPANY_KEY)
    return
  }

  localStorage.setItem(CATEGORY_CACHE_COMPANY_KEY, normalizedCompanyId)
  localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(categories || []))
}

export const updateCachedCategoryProducts = (companyId, category, products) => {
  const cachedCategories = readCachedCategories(companyId)
  const nextProducts = Array.isArray(products) ? products : []

  if (!category?.['@id']) {
    return cachedCategories
  }

  const nextCategories = cachedCategories.map(item =>
    item?.['@id'] === category['@id']
      ? {...item, products: nextProducts}
      : item,
  )

  writeCachedCategories(companyId, nextCategories)
  return nextCategories
}

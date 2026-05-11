const CATEGORY_CACHE_KEY = 'categories'
const CATEGORY_CACHE_COMPANY_KEY = 'categories-company'

const isStorageAvailable = () => typeof localStorage !== 'undefined'

const normalizeCompanyId = companyId =>
  String(companyId || '').replace(/\D+/g, '').trim()

const normalizeContext = context =>
  String(context || 'products').trim().toLowerCase() || 'products'

const buildCacheKey = (baseKey, context) =>
  `${baseKey}:${normalizeContext(context)}`

export const readCachedCategories = (companyId, context = 'products') => {
  if (!isStorageAvailable()) return []

  const normalizedCompanyId = normalizeCompanyId(companyId)
  const normalizedContext = normalizeContext(context)
  const cachedCompanyId = normalizeCompanyId(
    localStorage.getItem(buildCacheKey(CATEGORY_CACHE_COMPANY_KEY, normalizedContext)),
  )

  if (!normalizedCompanyId || cachedCompanyId !== normalizedCompanyId) {
    return []
  }

  try {
    const cached = JSON.parse(
      localStorage.getItem(buildCacheKey(CATEGORY_CACHE_KEY, normalizedContext)) || '[]',
    )
    return Array.isArray(cached) ? cached : []
  } catch (error) {
    return []
  }
}

export const writeCachedCategories = (companyId, categories, context = 'products') => {
  if (!isStorageAvailable()) return

  const normalizedCompanyId = normalizeCompanyId(companyId)
  const normalizedContext = normalizeContext(context)
  const cacheKey = buildCacheKey(CATEGORY_CACHE_KEY, normalizedContext)
  const cacheCompanyKey = buildCacheKey(CATEGORY_CACHE_COMPANY_KEY, normalizedContext)

  if (!normalizedCompanyId) {
    localStorage.removeItem(cacheKey)
    localStorage.removeItem(cacheCompanyKey)
    return
  }

  localStorage.setItem(cacheCompanyKey, normalizedCompanyId)
  localStorage.setItem(cacheKey, JSON.stringify(categories || []))
}

export const updateCachedCategoryProducts = (companyId, category, products, context = 'products') => {
  const cachedCategories = readCachedCategories(companyId, context)
  const nextProducts = Array.isArray(products) ? products : []

  if (!category?.['@id']) {
    return cachedCategories
  }

  const nextCategories = cachedCategories.map(item =>
    item?.['@id'] === category['@id']
      ? {...item, products: nextProducts}
      : item,
  )

  writeCachedCategories(companyId, nextCategories, context)
  return nextCategories
}

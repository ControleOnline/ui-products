const normalizeOrderId = value => String(value || '').replace(/\D/g, '') || null

const resolveOrderReference = value => {
  if (value && typeof value === 'object') {
    const id = normalizeOrderId(value.id || value['@id'])
    return {
      id,
      iri: value['@id'] || (id ? `/orders/${id}` : null),
    }
  }

  const id = normalizeOrderId(value)
  const iri = String(value || '').startsWith('/orders/')
    ? String(value)
    : id
      ? `/orders/${id}`
      : null

  return {id, iri}
}

export const buildCustomizeScreenRouteParams = ({
  interactionMode = null,
  orderId = null,
  productId = null,
  singleItemMode = false,
  showBottomCart,
  catalogContext,
} = {}) => ({
  productId,
  ...(orderId ? {orderId} : {}),
  interactionMode,
  singleItemMode,
  ...(showBottomCart === undefined ? {} : {showBottomCart}),
  ...(catalogContext ? {context: catalogContext} : {}),
})

export const resolveCustomizationOrderContext = ({
  activeOrderProduct,
  cart,
  order,
  routeOrderId,
  sessionOrder,
} = {}) => {
  const candidates = [activeOrderProduct?.order, routeOrderId, order, sessionOrder, cart]

  for (const candidate of candidates) {
    const resolved = resolveOrderReference(candidate)
    if (resolved.id || resolved.iri) {
      return resolved
    }
  }

  return {id: null, iri: null}
}

const extractId = value => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const match = value.match(/(\d+)$/);
    return match ? match[1] : value;
  }
  if (typeof value === 'object') {
    return extractId(value.id || value['@id'] || '');
  }
  return '';
};

const resolveInitialProvider = (propInitialProvider, routeParams = {}) =>
  propInitialProvider || routeParams.initialProvider || null;

const resolveInitialProviderId = (propInitialProvider, routeParams = {}) => {
  const provider = resolveInitialProvider(propInitialProvider, routeParams);
  return extractId(provider?.id || provider?.['@id'] || provider);
};

/**
 * Build product_people payload to link a supplier to a newly created product.
 * Returns null when linkage is not applicable.
 */
const buildProductPeopleSupplierPayload = ({ productData, initialProviderId }) => {
  const productId = extractId(productData?.id || productData?.['@id']);
  const providerId = extractId(initialProviderId);

  if (!productId || !providerId) {
    return null;
  }

  return {
    product: `/products/${productId}`,
    people: `/people/${providerId}`,
    role: 'supplier',
  };
};

module.exports = {
  extractId,
  resolveInitialProvider,
  resolveInitialProviderId,
  buildProductPeopleSupplierPayload,
};

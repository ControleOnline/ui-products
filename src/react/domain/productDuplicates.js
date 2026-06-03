const normalizeProductToken = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .trim()
    .toLowerCase();

const normalizeEntityId = value => {
  if (!value && value !== 0) return '';

  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;

  return String(raw || '').replace(/\D+/g, '').trim();
};

export const resolveDuplicateProductCandidate = ({
  products = [],
  draft = {},
  currentProductId = null,
  type = 'feedstock',
} = {}) => {
  const normalizedType = String(type || '').trim().toLowerCase();
  const normalizedDraftSku = normalizeProductToken(draft?.sku);
  const normalizedDraftName = normalizeProductToken(draft?.product || draft?.name);
  const ignoredId = normalizeEntityId(currentProductId || draft?.id || draft?.['@id']);

  const candidates = (products || []).filter(product => {
    if (!product) return false;

    if (ignoredId && normalizeEntityId(product) === ignoredId) {
      return false;
    }

    return String(product?.type || '').trim().toLowerCase() === normalizedType;
  });

  if (normalizedDraftSku) {
    const bySku = candidates.find(product =>
      normalizeProductToken(product?.sku) === normalizedDraftSku,
    );

    if (bySku) {
      return { match: bySku, reason: 'sku' };
    }
  }

  if (normalizedDraftName) {
    const byName = candidates.find(product =>
      normalizeProductToken(product?.product || product?.name) === normalizedDraftName,
    );

    if (byName) {
      return { match: byName, reason: 'name' };
    }
  }

  return null;
};

export const mergeProductDraftIntoExisting = (existing = {}, draft = {}) => {
  const pickIfEmpty = (current, fallback) => {
    if (current === null || current === undefined) {
      return fallback;
    }

    if (typeof current === 'string' && current.trim() === '') {
      return fallback;
    }

    if (typeof current === 'number' && Number.isFinite(current) && current <= 0) {
      return Number(fallback || current) || current;
    }

    return current;
  };

  return {
    ...existing,
    product: pickIfEmpty(existing?.product, draft?.product),
    sku: pickIfEmpty(existing?.sku, draft?.sku),
    description: pickIfEmpty(existing?.description, draft?.description),
    type: pickIfEmpty(existing?.type, draft?.type),
    productUnit: pickIfEmpty(existing?.productUnit, draft?.productUnit),
    company: pickIfEmpty(existing?.company, draft?.company),
    price: pickIfEmpty(existing?.price, draft?.price),
    productCondition: pickIfEmpty(existing?.productCondition, draft?.productCondition),
    defaultInInventory: pickIfEmpty(existing?.defaultInInventory, draft?.defaultInInventory),
    defaultOutInventory: pickIfEmpty(existing?.defaultOutInventory, draft?.defaultOutInventory),
    queue: pickIfEmpty(existing?.queue, draft?.queue),
    active: typeof existing?.active === 'boolean' ? existing.active : draft?.active,
    featured: typeof existing?.featured === 'boolean' ? existing.featured : draft?.featured,
    extraData: {
      ...(existing?.extraData || {}),
      ...(draft?.extraData || {}),
    },
  };
};

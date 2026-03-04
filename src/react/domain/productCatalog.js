const toId = value => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const m = value.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  }
  if (typeof value === 'object') return toId(value.id || value['@id']);
  return null;
};

const toNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const toBool = value => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return Boolean(value);
};

export const getLifecycleStatus = product =>
  String(product?.extraData?.lifecycle?.status || 'draft').toLowerCase();

export const isCatalogPublished = product =>
  toBool(product?.active) &&
  getLifecycleStatus(product) === 'published' &&
  !toBool(product?.extraData?.blockedForSale);

export const buildFileDownloadUrl = (fileId, appDomain = '') => {
  if (!fileId) return '';
  const host =
    appDomain ||
    (typeof location !== 'undefined' && location?.host ? location.host : '');
  return `/files/${fileId}/download?app-domain=${encodeURIComponent(host)}`;
};

export const mapProductToCatalogItem = (product, options = {}) => {
  const categoryId =
    toId(product?.productCategory?.category) ||
    toId(product?.productCategories?.[0]?.category) ||
    toId(product?.category) ||
    toId(product?.categoryId);

  const files = Array.isArray(product?.productFiles) ? product.productFiles : [];
  const coverRelationId = toId(product?.extraData?.imageCoverRelationId);
  const cover = files.find(rel => toId(rel?.id) === coverRelationId) || files[0] || null;
  const coverFileId = toId(cover?.file);

  const stock = product?.extraData?.stock || {};
  const stockByInventory = product?.extraData?.stockByInventory || {};
  const pricing = product?.extraData?.pricing || {};
  const fiscal = product?.extraData?.fiscal || {};
  const lifecycle = product?.extraData?.lifecycle || {};
  const rawCodes = Array.isArray(product?.extraData?.codes) ? product.extraData.codes : [];
  const skuCode = product?.sku
    ? {type: 'sku', value: String(product.sku), channel: '', isPrimary: true, active: true}
    : null;
  const eanCode = product?.extraData?.eanGtin
    ? {type: 'ean', value: String(product.extraData.eanGtin), channel: '', isPrimary: true, active: true}
    : null;
  const codes = [...rawCodes];
  if (skuCode && !codes.some(c => String(c?.type || '').toLowerCase() === 'sku' && String(c?.value || '') === skuCode.value)) {
    codes.unshift(skuCode);
  }
  if (eanCode && !codes.some(c => String(c?.type || '').toLowerCase() === 'ean' && String(c?.value || '') === eanCode.value)) {
    codes.push(eanCode);
  }

  return {
    id: toId(product?.id || product?.['@id']),
    sku: product?.sku || '',
    name: product?.product || '',
    description: product?.description || '',
    slug: product?.extraData?.slug || '',
    type: product?.type || 'product',
    categoryId,
    companyId: toId(product?.company),
    price: toNumber(product?.price) || 0,
    featured: toBool(product?.featured),
    active: toBool(product?.active),
    status: getLifecycleStatus(product),
    publishedAt: lifecycle?.publishedAt || null,
    image: {
      fileId: coverFileId,
      url: coverFileId ? buildFileDownloadUrl(coverFileId, options.appDomain) : '',
    },
    stock: {
      controlsStock: toBool(stock.controlsStock),
      allowNegativeStock: toBool(stock.allowNegativeStock),
      reserveOnOrder: toBool(stock.reserveOnOrder),
      autoDeductOnConfirm: toBool(stock.autoDeductOnConfirm),
      minimum: toNumber(stock.minimum),
      maximum: toNumber(stock.maximum),
      reorderPoint: toNumber(stock.reorderPoint),
      leadTimeDays: toNumber(stock.leadTimeDays),
      byInventory: Object.entries(stockByInventory || {}).reduce((acc, [inventoryId, policy]) => {
        acc[inventoryId] = {
          minimum: toNumber(policy?.minimum),
          maximum: toNumber(policy?.maximum),
          reorderPoint: toNumber(policy?.reorderPoint),
          leadTimeDays: toNumber(policy?.leadTimeDays),
        };
        return acc;
      }, {}),
    },
    codes: codes
      .map(code => ({
        type: String(code?.type || code?.codeType || '').toLowerCase(),
        value: String(code?.value || code?.codeValue || ''),
        channel: String(code?.channel || '').toLowerCase(),
        isPrimary: toBool(code?.isPrimary),
        active: code?.active !== false,
      }))
      .filter(code => code.type && code.value),
    pricing: {
      source: pricing?.source || 'manual',
      syncMode: pricing?.syncMode || 'suggest',
      cost: toNumber(pricing.cost),
      costManual: toNumber(pricing.costManual),
      markup: toNumber(pricing.markup),
      marginTarget: toNumber(pricing.marginTarget),
      minMarginPct: toNumber(pricing.minMarginPct),
      additionalPackagingCost: toNumber(pricing.additionalPackagingCost),
      additionalDisposableCost: toNumber(pricing.additionalDisposableCost),
      additionalOperationalCost: toNumber(pricing.additionalOperationalCost),
      additionalLogisticsCost: toNumber(pricing.additionalLogisticsCost),
      lossPct: toNumber(pricing.lossPct),
      costOutdated: toBool(pricing.costOutdated),
      costOutdatedReason: String(pricing.costOutdatedReason || ''),
      lastInventoryCost: toNumber(pricing.lastInventoryCost),
      channelPolicies: Array.isArray(pricing?.channelPolicies)
        ? pricing.channelPolicies.map(policy => ({
            channel: String(policy?.channel || '').toLowerCase(),
            commissionPct: toNumber(policy?.commissionPct),
            fixedFee: toNumber(policy?.fixedFee),
            extraPackagingCost: toNumber(policy?.extraPackagingCost),
            targetMarginPct: toNumber(policy?.targetMarginPct),
            active: policy?.active !== false,
          }))
        : [],
      channelSimulations: Array.isArray(pricing?.channelSimulations)
        ? pricing.channelSimulations.map(sim => ({
            channel: String(sim?.channel || '').toLowerCase(),
            unitCost: toNumber(sim?.unitCost),
            suggestedByMarginWithFees: toNumber(sim?.suggestedByMarginWithFees),
            netMarginOnMarkup: toNumber(sim?.netMarginOnMarkup),
          }))
        : [],
      costBreakdown: {
        ingredientCost: toNumber(pricing?.costBreakdown?.ingredientCost),
        packagingCost: toNumber(pricing?.costBreakdown?.packagingCost),
        disposableCost: toNumber(pricing?.costBreakdown?.disposableCost),
        operationalCost: toNumber(pricing?.costBreakdown?.operationalCost),
        logisticsCost: toNumber(pricing?.costBreakdown?.logisticsCost),
        lossCost: toNumber(pricing?.costBreakdown?.lossCost),
        mandatoryModifiersCost: toNumber(pricing?.costBreakdown?.mandatoryModifiersCost),
        optionalModifiersPotentialCost: toNumber(pricing?.costBreakdown?.optionalModifiersPotentialCost),
        totalUnitCost: toNumber(pricing?.costBreakdown?.totalUnitCost),
      },
      simulatedByMarkup: toNumber(pricing.simulatedByMarkup),
      simulatedByMargin: toNumber(pricing.simulatedByMargin),
      snapshotAt: pricing.timestamp || null,
    },
    fiscal: {
      ncm: fiscal?.ncm || '',
      cest: fiscal?.cest || '',
      origin: fiscal?.origin || '',
      cfop: fiscal?.cfop || '',
      icms: toNumber(fiscal?.icms),
      pis: toNumber(fiscal?.pis),
      cofins: toNumber(fiscal?.cofins),
      ipi: toNumber(fiscal?.ipi),
    },
    raw: product,
  };
};

export const mapProductsToCatalog = (products = [], options = {}) => {
  const includeUnpublished = Boolean(options.includeUnpublished);
  return (products || [])
    .filter(item => (includeUnpublished ? true : isCatalogPublished(item)))
    .map(item => mapProductToCatalogItem(item, options));
};

export const normalizeEntityId = value => {
  if (!value && value !== 0) return '';

  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;

  return String(raw || '').replace(/\D+/g, '').trim();
};

export const extractItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  if (Array.isArray(response?.member)) return response.member;
  return [];
};

export const extractSummary = response => {
  if (response && typeof response === 'object' && response.summary && typeof response.summary === 'object') {
    return response.summary;
  }

  return {};
};

export const toProductIri = value => {
  const id = normalizeEntityId(value);
  return id ? `/products/${id}` : null;
};

export const toProductGroupIri = value => {
  const id = normalizeEntityId(value);
  return id ? `/product_groups/${id}` : null;
};

export const toNumber = value => {
  const normalized = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : 0;
};

export const formatCurrency = value => `R$ ${toNumber(value).toFixed(2).replace('.', ',')}`;

export const sumFeedstockCost = items =>
  (items || []).reduce((sum, item) => sum + toNumber(item?.price), 0);

export const emptyPricingBreakdown = {
  totalCost: 0,
  directCost: 0,
  directFeedstocks: [],
  groups: [],
  groupItemCosts: {},
};

const normalizePricingBreakdown = pricing => ({
  totalCost: toNumber(pricing?.totalCost),
  directCost: toNumber(pricing?.directCost),
  directFeedstocks: Array.isArray(pricing?.directFeedstocks) ? pricing.directFeedstocks : [],
  groups: Array.isArray(pricing?.groups) ? pricing.groups : [],
  groupItemCosts: pricing?.groupItemCosts && typeof pricing.groupItemCosts === 'object'
    ? pricing.groupItemCosts
    : {},
});

export const calculateProductFeedstockCost = async ({
  productGroupProductActions,
  productIri,
  productGroupIri = null,
}) => {
  if (!productIri || !productGroupProductActions?.getItems) {
    return { cost: 0, feedstocks: [] };
  }

  const params = {
    product: productIri,
    productType: 'feedstock',
    itemsPerPage: 500,
  };

  if (productGroupIri) {
    params.productGroup = productGroupIri;
  } else {
    params['exists[productGroup]'] = false;
  }

  const response = await productGroupProductActions.getItems(params);
  const feedstocks = extractItems(response).filter(item => item?.active !== false);

  return {
    cost: sumFeedstockCost(feedstocks),
    feedstocks,
  };
};

export const buildProductCostBreakdown = async ({
  productId,
  productGroupProductActions,
  productGroupIri = null,
}) => {
  const productIri = toProductIri(productId);

  if (!productId || !productIri || !productGroupProductActions?.getItems) {
    return emptyPricingBreakdown;
  }

  const response = await productGroupProductActions.getItems({
    product: productIri,
    summary: 'pricing',
    itemsPerPage: 1,
    ...(productGroupIri ? { productGroup: productGroupIri } : {}),
  });

  return normalizePricingBreakdown(extractSummary(response)?.pricing);
};

const resolvePeopleLabel = entity =>
  entity?.alias ||
  entity?.fantasy_name ||
  entity?.name ||
  entity?.company ||
  entity?.document ||
  '';

export const fetchLatestPurchasesByProductIds = async ({
  companyId,
  ordersActions,
  productIds,
  limitPerProduct = 1,
  maxPages = 4,
  itemsPerPage = 10,
}) => {
  const ids = Array.from(new Set((productIds || []).map(normalizeEntityId).filter(Boolean)));
  const purchasesByProductId = {};

  ids.forEach(productId => {
    purchasesByProductId[productId] = [];
  });

  if (!companyId || ids.length === 0 || !ordersActions?.getItems || !ordersActions?.get) {
    return purchasesByProductId;
  }

  const pendingIds = new Set(ids);

  for (let page = 1; page <= maxPages && pendingIds.size > 0; page += 1) {
    const response = await ordersActions.getItems({
      provider: `/people/${companyId}`,
      orderType: 'purchase',
      itemsPerPage,
      page,
      'order[id]': 'desc',
    });

    const orders = extractItems(response);
    if (orders.length === 0) break;

    const orderDetails = await Promise.all(
      orders.map(async order => {
        const orderId = normalizeEntityId(order);
        if (!orderId) return null;

        try {
          return await ordersActions.get(orderId);
        } catch {
          return null;
        }
      }),
    );

    orderDetails.forEach(order => {
      const orderProducts = Array.isArray(order?.orderProducts) ? order.orderProducts : [];

      orderProducts.forEach(orderProduct => {
        const productId = normalizeEntityId(orderProduct?.product);
        if (!pendingIds.has(productId)) return;

        const currentItems = purchasesByProductId[productId] || [];
        if (currentItems.length >= limitPerProduct) return;

        currentItems.push({
          orderId: normalizeEntityId(order),
          orderDate: order?.orderDate || order?.alterDate || null,
          supplierLabel: resolvePeopleLabel(order?.client),
          quantity: toNumber(orderProduct?.quantity),
          unitPrice: toNumber(orderProduct?.price),
          totalPrice: toNumber(orderProduct?.total),
        });

        purchasesByProductId[productId] = currentItems;
        if (currentItems.length >= limitPerProduct) {
          pendingIds.delete(productId);
        }
      });
    });

    if (orders.length < itemsPerPage) break;
  }

  return purchasesByProductId;
};

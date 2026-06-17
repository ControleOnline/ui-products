import {api} from '@controleonline/ui-common/src/api';

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

const hasHydraNext = response => Boolean(response?.['hydra:view']?.next);

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
    ...(productGroupIri ? { productGroup: productGroupIri } : { 'exists[productGroup]': false }),
  };

  const feedstocks = [];
  for (let page = 1; page <= 8; page += 1) {
    const response = await productGroupProductActions.getItems({
      ...params,
      page,
    });
    const batch = extractItems(response).filter(item => item?.active !== false);
    feedstocks.push(...batch);
    if (!hasHydraNext(response) || batch.length === 0) {
      break;
    }
  }

  return {
    cost: sumFeedstockCost(feedstocks),
    feedstocks,
  };
};

export const buildProductCostBreakdown = async ({
  productId,
  productGroupProductStore,
  productGroupIri = null,
}) => {
  const productIri = toProductIri(productId);
  const productGroupProductActions = productGroupProductStore?.actions;

  if (!productId || !productIri || !productGroupProductActions?.getItems) {
    return emptyPricingBreakdown;
  }

  await productGroupProductActions.getItems({
    product: productIri,
    summary: 'pricing',
    ...(productGroupIri ? { productGroup: productGroupIri } : {}),
  });

  return normalizePricingBreakdown(productGroupProductStore?.getters?.summary?.pricing);
};

const resolvePeopleLabel = entity =>
  entity?.alias ||
  entity?.fantasy_name ||
  entity?.name ||
  entity?.company ||
  entity?.document ||
  '';

const normalizePurchaseRow = row => ({
  orderId: normalizeEntityId(row?.orderId),
  orderDate: row?.orderDate || row?.alterDate || null,
  supplierLabel: row?.supplierLabel || resolvePeopleLabel(row?.provider) || 'Fornecedor não vinculado',
  quantity: toNumber(row?.quantity),
  unitPrice: toNumber(row?.unitPrice),
  totalPrice: toNumber(row?.totalPrice),
});

const fetchLatestPurchasesViaHistoryEndpoint = async ({
  companyId,
  providerIds = [],
  productIds,
}) => {
  const ids = Array.from(new Set((productIds || []).map(normalizeEntityId).filter(Boolean)));
  if (!companyId || ids.length === 0) {
    return null;
  }

  try {
    const response = await api.fetch('orders/purchase-history-by-products', {
      params: {
        company: companyId,
        productIds: ids.join(','),
        ...(providerIds.length > 0 ? {providerIds: providerIds.map(normalizeEntityId).filter(Boolean).join(',')} : {}),
      },
    });

    const rows = extractItems(response);
    if (!rows.length) {
      return {};
    }

    const purchasesByProductId = {};
    ids.forEach(productId => {
      purchasesByProductId[productId] = [];
    });

    rows.forEach(row => {
      const productId = normalizeEntityId(row?.productId || row?.product || row?.id);
      if (!productId || !purchasesByProductId[productId]) {
        return;
      }

      const currentItems = purchasesByProductId[productId];
      if (currentItems.length >= 1) {
        return;
      }

      currentItems.push(normalizePurchaseRow(row));
    });

    return purchasesByProductId;
  } catch {
    return null;
  }
};

export const fetchLatestPurchasesByProductIds = async ({
  companyId,
  providerId = null,
  providerIds = [],
  clientId = null,
  clientIds = [],
  ordersActions,
  productIds,
  limitPerProduct = 1,
  maxPages = 4,
}) => {
  const ids = Array.from(new Set((productIds || []).map(normalizeEntityId).filter(Boolean)));
  const supplierIds = Array.from(
    new Set(
      [providerId, ...providerIds, clientId, ...clientIds]
        .map(normalizeEntityId)
        .filter(Boolean),
    ),
  );
  const purchasesByProductId = {};

  ids.forEach(productId => {
    purchasesByProductId[productId] = [];
  });

  if (!companyId || ids.length === 0) {
    return purchasesByProductId;
  }

  const endpointPurchases = await fetchLatestPurchasesViaHistoryEndpoint({
    companyId,
    providerIds: supplierIds,
    productIds: ids,
  });

  if (endpointPurchases) {
    const missingIds = ids.filter(productId => !Array.isArray(endpointPurchases[productId]) || endpointPurchases[productId].length === 0);

    ids.forEach(productId => {
      if (Array.isArray(endpointPurchases[productId]) && endpointPurchases[productId].length > 0) {
        purchasesByProductId[productId] = endpointPurchases[productId].slice(0, limitPerProduct);
      }
    });

    if (missingIds.length === 0 || !ordersActions?.getItems || !ordersActions?.get) {
      return purchasesByProductId;
    }

    ids.splice(0, ids.length, ...missingIds);
  }

  if (!ordersActions?.getItems || !ordersActions?.get) {
    return purchasesByProductId;
  }

  const pendingIds = new Set(ids);

  for (let page = 1; page <= maxPages && pendingIds.size > 0; page += 1) {
    const response = await ordersActions.getItems({
      client: `/people/${companyId}`,
      orderType: 'purchase',
      page,
      'order[id]': 'desc',
    });

    const orders = extractItems(response);
    if (orders.length === 0) break;

    const scopedOrders = supplierIds.length > 0
      ? orders.filter(order => supplierIds.includes(normalizeEntityId(order?.provider)))
      : orders;

    if (scopedOrders.length === 0) {
      if (!hasHydraNext(response)) break;
      continue;
    }

    const orderDetails = await Promise.all(
      scopedOrders.map(async order => {
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
          supplierLabel: resolvePeopleLabel(order?.provider),
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

    if (!hasHydraNext(response)) break;
  }

  return purchasesByProductId;
};
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.

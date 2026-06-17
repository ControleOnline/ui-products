import { useCallback, useMemo, useState } from 'react';
import { api } from '@controleonline/ui-common/src/api';

const PLATFORM_KEYS = ['99food', 'ifood'];

const normalizeId = value => String(value || '').replace(/\D+/g, '');

const uniqueIds = values => {
  const ids = [];
  const seen = new Set();

  (Array.isArray(values) ? values : []).forEach(value => {
    const id = normalizeId(value);
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });

  return ids;
};

const toMapById = items => {
  const map = {};
  (Array.isArray(items) ? items : []).forEach(item => {
    const id = normalizeId(item?.id);
    if (id) map[id] = item;
  });
  return map;
};

const normalizePlatformStatus = (platformKey, rawStatus = {}) => ({
  ...rawStatus,
  key: platformKey,
  platform: {
    ...(rawStatus.platform || {}),
    key: platformKey,
  },
  productsById: toMapById(rawStatus.products),
  categoriesById: toMapById(rawStatus.categories),
  eligibleProductIds: uniqueIds(rawStatus.eligible_product_ids),
  publishedProductIds: uniqueIds(rawStatus.published_product_ids),
  minimumRequiredItems: Number(rawStatus.minimum_required_items || (platformKey === '99food' ? 5 : 1)),
});

const normalizeCatalogStatus = response => {
  const rawPlatforms = response?.platforms || {};
  const platforms = {};

  PLATFORM_KEYS.forEach(platformKey => {
    platforms[platformKey] = normalizePlatformStatus(platformKey, rawPlatforms[platformKey] || {});
  });

  return {
    provider: response?.provider || null,
    platforms,
  };
};

const isPlatformActive = platformStatus =>
  Boolean(platformStatus?.platform?.active || platformStatus?.platform?.connected || platformStatus?.platform?.remote_connected);

const getEntityStatuses = (catalogStatus, entityType, entityId) => {
  const id = normalizeId(entityId);
  if (!id) return [];

  return PLATFORM_KEYS
    .map(platformKey => {
      const platformStatus = catalogStatus?.platforms?.[platformKey];
      if (!isPlatformActive(platformStatus)) return null;

      const entityStatus =
        entityType === 'category'
          ? platformStatus.categoriesById?.[id]
          : platformStatus.productsById?.[id];

      if (!entityStatus) return null;

      return {
        ...entityStatus,
        platform: platformStatus.platform,
      };
    })
    .filter(Boolean);
};

const buildFood99ProductIds = (platformStatus, requestedProductIds) => {
  const requestedIds = uniqueIds(requestedProductIds);
  const selected = uniqueIds([
    ...platformStatus.publishedProductIds,
    ...requestedIds,
  ]);

  if (selected.length >= platformStatus.minimumRequiredItems) {
    return selected;
  }

  const selectedSet = new Set(selected);
  for (const eligibleId of platformStatus.eligibleProductIds) {
    if (selectedSet.has(eligibleId)) continue;
    selected.push(eligibleId);
    selectedSet.add(eligibleId);
    if (selected.length >= platformStatus.minimumRequiredItems) break;
  }

  return selected;
};

const assertProductIds = productIds => {
  const ids = uniqueIds(productIds);
  if (ids.length === 0) {
    throw new Error('Nenhum produto elegivel para sincronizar.');
  }
  return ids;
};

export default function useMarketplaceCatalogSync(companyId) {
  const [catalogStatus, setCatalogStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncingKey, setSyncingKey] = useState('');

  const providerId = normalizeId(companyId);

  const loadCatalogStatus = useCallback(async () => {
    if (!providerId) {
      setCatalogStatus(null);
      return null;
    }

    setIsLoading(true);
    try {
      const response = await api.fetch('/marketplace/integrations/catalog/status', {
        params: { provider_id: providerId },
      });
      const normalized = normalizeCatalogStatus(response);
      setCatalogStatus(normalized);
      return normalized;
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  const getProductStatuses = useCallback(
    product => getEntityStatuses(catalogStatus, 'product', product?.id || product?.['@id']),
    [catalogStatus],
  );

  const getCategoryStatuses = useCallback(
    category => getEntityStatuses(catalogStatus, 'category', category?.id || category?.['@id']),
    [catalogStatus],
  );

  const syncPlatformProducts = useCallback(
    async (platformKey, productIds, { syncKey = '' } = {}) => {
      if (!providerId) {
        throw new Error('Empresa nao selecionada para sincronizacao.');
      }

      const platformStatus = catalogStatus?.platforms?.[platformKey];
      if (!isPlatformActive(platformStatus)) {
        throw new Error('Integracao nao esta ativa para esta empresa.');
      }

      const requestedIds = assertProductIds(productIds);
      const operationKey = syncKey || `${platformKey}:${requestedIds.join(',')}`;
      setSyncingKey(operationKey);

      try {
        if (platformKey === 'ifood') {
          await api.fetch('/marketplace/integrations/ifood/menu/upload', {
            method: 'POST',
            body: {
              provider_id: providerId,
              product_ids: requestedIds,
            },
          });
        } else if (platformKey === '99food') {
          const productIdsFor99 = buildFood99ProductIds(platformStatus, requestedIds);
          if (productIdsFor99.length < platformStatus.minimumRequiredItems) {
            throw new Error(`A 99Food exige pelo menos ${platformStatus.minimumRequiredItems} produtos elegiveis.`);
          }

          await api.fetch('/marketplace/integrations/99food/menu/upload', {
            method: 'POST',
            body: {
              provider_id: providerId,
              product_ids: productIdsFor99,
            },
          });
        }

        return await loadCatalogStatus();
      } finally {
        setSyncingKey('');
      }
    },
    [catalogStatus, loadCatalogStatus, providerId],
  );

  const syncEntity = useCallback(
    async (platformKey, entityStatus, { syncKey = '' } = {}) => {
      const productIds = entityStatus?.eligible_product_ids?.length
        ? entityStatus.eligible_product_ids
        : entityStatus?.product_ids?.length
        ? entityStatus.product_ids
        : [entityStatus?.id];

      return syncPlatformProducts(platformKey, productIds, { syncKey });
    },
    [syncPlatformProducts],
  );

  const syncAllEligible = useCallback(async () => {
    const activePlatformKeys = PLATFORM_KEYS.filter(platformKey =>
      isPlatformActive(catalogStatus?.platforms?.[platformKey]),
    );

    if (activePlatformKeys.length === 0) {
      throw new Error('Nenhuma integracao ativa para sincronizar.');
    }

    setSyncingKey('all');
    try {
      let syncedAny = false;
      for (const platformKey of activePlatformKeys) {
        const productIds = catalogStatus?.platforms?.[platformKey]?.eligibleProductIds || [];
        if (productIds.length === 0) continue;
        await syncPlatformProducts(platformKey, productIds, { syncKey: 'all' });
        syncedAny = true;
      }
      if (!syncedAny) {
        throw new Error('Nenhum produto elegivel para sincronizar.');
      }
    } finally {
      setSyncingKey('');
    }
  }, [catalogStatus, syncPlatformProducts]);

  const hasActivePlatforms = useMemo(
    () => PLATFORM_KEYS.some(platformKey => isPlatformActive(catalogStatus?.platforms?.[platformKey])),
    [catalogStatus],
  );

  return {
    catalogStatus,
    getCategoryStatuses,
    getProductStatuses,
    hasActivePlatforms,
    isLoading,
    loadCatalogStatus,
    syncAllEligible,
    syncEntity,
    syncingKey,
  };
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.

import {useMemo} from 'react';
import {createCachedCatalogActions, invalidateCatalogOwner} from '../utils/cachedCatalogActions';

export default function useCachedCatalogActions(store, enabled, companyId, context = 'products', publishStore = true) {
  return useMemo(() => {
    if (enabled) return createCachedCatalogActions(store, companyId, context, {publishStore});
    invalidateCatalogOwner(store.actions);
    return store.actions;
  },
  [store.actions, store.getters.resourceEndpoint, enabled, companyId, context, publishStore]);
}

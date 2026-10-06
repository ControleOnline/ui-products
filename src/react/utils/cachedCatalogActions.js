import localDB from '@controleonline/ui-common/src/api/localDB';
import {api} from '@controleonline/ui-common/src/api';
import {getCatalogCacheScope} from './catalogCacheScope';

const db = new localDB({resourceEndpoint: 'pos_catalog_cache', columns: [], filters: {}});
const memory = new Map();
const pending = new Map();
const owners = new WeakMap();
export const invalidateCatalogOwner = actions => owners.delete(actions);
const refreshAttempts = new Map();
const TTL = 60 * 1000;
let networkTail = Promise.resolve();
const serialize = value => Array.isArray(value) ? `[${value.map(serialize)}]` :
  value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${serialize(value[key])}`).join(',')}}` : JSON.stringify(value);
const collection = value => Array.isArray(value) ? value : value?.member || value?.['hydra:member'] || [];
const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const limitNetwork = task => {
  const result = networkTail.then(task, task);
  networkTail = result.catch(() => {});
  return result;
};
export const readCatalogRecord = async id => {
  if (memory.has(id)) return memory.get(id);
  try {
    const record = await db.get(id);
    if (record?.id === id) { memory.set(id, record); return record; }
  } catch { /* Storage is optional; the ERP remains usable when it is blocked. */ }
  return null;
};
export const writeCatalogRecord = async record => {
  memory.set(record.id, record);
  if (memory.size > 100) memory.delete(memory.keys().next().value);
  try { await db.saveItem(record); } catch { /* Quota/private mode: retain memory cache. */ }
};

export function createCachedCatalogActions(store, companyId, context = 'products', deps = {}) {
  const getScope = deps.getScope || getCatalogCacheScope;
  const read = deps.read || readCatalogRecord;
  const write = deps.write || writeCatalogRecord;
  const fetch = deps.fetch || ((endpoint, params, options) => api.fetch(endpoint, {params, ...options}));
  let activeRequest = 0;
  const endpoint = store.getters.resourceEndpoint;
  const publish = (items, total) => {
    if (deps.publishStore === false) return;
    store.actions.setItems(items);
    store.actions.setTotalItems(total);
    store.actions.setIsLoading(false);
    store.actions.setIsLoadingList?.(false);
  };
  const withPage = (items, page, count) => Object.assign([...items], {catalogPage: page, catalogLastPageCount: count});
  return {
    ...store.actions,
    catalogCache: true,
    async get(value) {
      const entityId = String(value?.id ?? value ?? '').replace(/\D/g, '');
      const scope = await getScope(companyId, context);
      if (!scope || endpoint !== 'products' || !entityId) return store.actions.get(value);
      const id = serialize({scope, endpoint, entityId});
      const record = await read(id);
      const loadItem = () => {
        const readKey = `${id}:item`;
        if (!pending.has(readKey)) {
          const work = limitNetwork(async () => {
            if (await getScope(companyId, context) !== scope) throw new Error('O contexto do PDV mudou.');
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeout = controller ? setTimeout(() => controller.abort(), 20000) : null;
            let item;
            try { item = await fetch(`${endpoint}/${entityId}`, {}, controller ? {signal: controller.signal} : {}); }
            finally { if (timeout) clearTimeout(timeout); }
            if (await getScope(companyId, context) !== scope) throw new Error('O contexto do PDV mudou.');
            if (String(item?.id || item?.['@id'] || '').replace(/\D/g, '') !== entityId) throw new Error('Resposta inválida do produto.');
            await write({id, item, updatedAt: Date.now()});
            return item;
          });
          pending.set(readKey, work);
          void work.finally(() => pending.delete(readKey)).catch(() => {});
        }
        return pending.get(readKey);
      };
      if (await getScope(companyId, context) !== scope) throw new Error('O contexto do PDV mudou.');
      if (record?.item && Date.now() - record.updatedAt > TTL && online() &&
          Date.now() - (refreshAttempts.get(id) || 0) > TTL) {
        refreshAttempts.set(id, Date.now());
        void loadItem().catch(() => {});
      }
      if (!record?.item && !online()) throw new Error('Este produto ainda não foi carregado. Conecte-se para carregá-lo.');
      const item = record?.item || await loadItem();
      if (await getScope(companyId, context) !== scope) throw new Error('O contexto do PDV mudou.');
      store.actions.setItem?.(item);
      return item;
    },
    async getItems(params = {}) {
      const request = ++activeRequest;
      const owner = Symbol(); owners.set(store.actions, owner);
      const {append = false, __storeMeta = {}, ...query} = params;
      const scope = await getScope(companyId, context);
      if (!scope || !['categories', 'products', 'product_groups', 'product_group_products'].includes(endpoint)) return store.actions.getItems(params);
      const page = Math.max(1, Number(query.page || 1));
      const base = {...query}; delete base.page;
      const id = serialize({scope, endpoint, query: base});
      let record = await read(id);
      if (record && Object.values(record.pages || {}).some(value => !Array.isArray(value?.items))) record = null;
      const cached = record?.pages?.[page];
      const restore = value => {
        let items = value.pages[page].items;
        let lastPage = page;
        if (!append && page === 1) {
          items = []; lastPage = 0;
          while (value.pages[lastPage + 1]) items.push(...value.pages[++lastPage].items);
        } else if (append) {
          const previous = store.getters.items || [];
          const ids = new Set(previous.map(item => String(item['@id'] || item.id)));
          items = [...previous, ...items.filter(item => !ids.has(String(item['@id'] || item.id)))];
        }
        if (activeRequest === request && owners.get(store.actions) === owner) publish(items, value.total);
        return withPage(items, lastPage, value.pages[lastPage].items.length);
      };
      const load = async (readPage = page) => {
        const readKey = `${id}:${readPage}`;
        if (pending.has(readKey)) return pending.get(readKey);
        const work = limitNetwork(async () => {
          if (await getScope(companyId, context) !== scope) throw new Error('O contexto do PDV mudou.');
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeout = controller ? setTimeout(() => controller.abort(), 20000) : null;
          let response;
          try { response = await fetch(endpoint, readPage === page ? query : {...query, page: readPage}, controller ? {signal: controller.signal} : {}); }
          finally { if (timeout) clearTimeout(timeout); }
          if (await getScope(companyId, context) !== scope) throw new Error('O contexto do PDV mudou.');
          const items = collection(response);
          if (!Array.isArray(items) || (!Array.isArray(response) &&
              !Array.isArray(response?.member) && !Array.isArray(response?.['hydra:member']))) throw new Error('Resposta inválida do catálogo.');
          const previous = await read(id);
          const next = {id, pages: {...previous?.pages}, total: Number(response?.totalItems ?? response?.['hydra:totalItems'] ?? items.length)};
          // A refreshed first page invalidates later pages: preserve neither removed
          // products nor pagination positions from the older server snapshot.
          if (readPage === 1 && previous?.pages?.[1] && (__storeMeta.catalogRefresh || previous.total !== next.total || serialize(previous.pages[1].items) !== serialize(items))) next.pages = {};
          next.pages[readPage] = {items, updatedAt: Date.now()};
          await write(next);
          return next;
        });
        pending.set(readKey, work);
        try { return await work; } finally { pending.delete(readKey); }
      };
      if (await getScope(companyId, context) !== scope) throw new Error('O contexto do PDV mudou.');
      if (cached && !__storeMeta.catalogRefresh) {
        const restored = restore(record);
        const oldestPage = Object.keys(record.pages).sort((a, b) => record.pages[a].updatedAt - record.pages[b].updatedAt)[0];
        const refreshKey = `${id}:${oldestPage}`;
        if (pending.size < 2 && online() && Date.now() - record.pages[oldestPage].updatedAt > TTL && Date.now() - (refreshAttempts.get(refreshKey) || 0) > TTL) {
          refreshAttempts.set(refreshKey, Date.now());
          // Background reads update the next visit, never overwrite another open
          // category or trigger the generic store error dialog.
          void load(Number(oldestPage)).catch(() => {});
        }
        return restored;
      }
      if (!online() && !cached) throw new Error('Este trecho do cardápio ainda não foi carregado. Conecte-se para carregá-lo.');
      store.actions.setIsLoading(true);
      try { return restore(await load()); }
      catch (error) {
        if (cached) return restore(record);
        throw error;
      } finally {
        if (activeRequest === request && owners.get(store.actions) === owner) {
          store.actions.setIsLoading(false);
          store.actions.setIsLoadingList?.(false);
        }
      }
    },
  };
}

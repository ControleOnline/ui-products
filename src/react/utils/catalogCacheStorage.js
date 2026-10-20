import localDB from '@controleonline/ui-common/src/api/localDB';

const endpoint = 'pos_catalog_cache';
const db = new localDB({resourceEndpoint: endpoint, columns: [], filters: {}});
export const readCatalogStorage = id => db.get(id);
export const writeCatalogStorage = record => db.saveItem(record);
export const clearCatalogStorage = async () => (await db.checkAndGetDB()).clear(endpoint);

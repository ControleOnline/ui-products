import AsyncStorage from '@react-native-async-storage/async-storage';

// Same waiter catalog records; AsyncStorage replaces IndexedDB on native.
const prefix = '@controleonline:pos_catalog_cache:';
const indexKey = `${prefix}index`;
const limit = 100;
let writes = Promise.resolve();
const enqueue = task => {
  const result = writes.then(task, task);
  writes = result.catch(() => {});
  return result;
};
export const readCatalogStorage = async id => {
  await writes;
  const value = await AsyncStorage.getItem(prefix + id);
  return value ? JSON.parse(value) : null;
};
export const writeCatalogStorage = record => enqueue(async () => {
  const key = prefix + record.id;
  const saved = JSON.parse(await AsyncStorage.getItem(indexKey) || '[]');
  const keys = [...saved.filter(value => value !== key), key];
  await AsyncStorage.multiSet([[key, JSON.stringify(record)], [indexKey, JSON.stringify(keys.slice(-limit))]]);
  if (keys.length > limit) await AsyncStorage.multiRemove(keys.slice(0, -limit));
});
export const clearCatalogStorage = () => enqueue(async () => {
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
  if (keys.length) await AsyncStorage.multiRemove(keys);
});

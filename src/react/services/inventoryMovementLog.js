/**
 * Log local de movimentações de estoque.
 * Usa AsyncStorage para funcionar em iOS, Android e Web.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'inventory_movements_log';
const MAX_ENTRIES = 1000;

/**
 * Registra uma nova movimentação.
 * @param {object} entry
 * @param {string}      entry.type              'in' | 'out' | 'transfer'
 * @param {number}      entry.productId
 * @param {string}      entry.productName
 * @param {string|null} entry.productType
 * @param {number}      entry.inventoryId
 * @param {string}      entry.inventoryName
 * @param {number|null} entry.destInventoryId   apenas para transfer
 * @param {string|null} entry.destInventoryName apenas para transfer
 * @param {number}      entry.quantity
 * @param {number}      entry.availableBefore
 * @param {number}      entry.availableAfter
 */
export const logMovement = async (entry) => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const newEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (_) {
    return null;
  }
};

/** Retorna todas as movimentações registradas (mais recente primeiro). */
export const getMovements = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

/** Remove todo o histórico local. */
export const clearMovements = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
};

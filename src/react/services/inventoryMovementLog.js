/**
 * Log local de movimentações de estoque.
 * Persiste no localStorage (web) até MAX_ENTRIES entradas.
 */

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
export const logMovement = (entry) => {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (_) {
    return null;
  }
};

/** Retorna todas as movimentações registradas (mais recente primeiro). */
export const getMovements = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_) {
    return [];
  }
};

/** Remove todo o histórico local. */
export const clearMovements = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
};

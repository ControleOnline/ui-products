export const PRODUCT_EVENTS = {
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  BOM_CHANGED: 'BOM_CHANGED',
  COST_RECALCULATED: 'COST_RECALCULATED',
  PRODUCT_PUBLISHED: 'PRODUCT_PUBLISHED',
  PRODUCT_UNPUBLISHED: 'PRODUCT_UNPUBLISHED',
};

export const emitProductEvent = (eventName, payload = {}) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(eventName, {detail: payload}));
};

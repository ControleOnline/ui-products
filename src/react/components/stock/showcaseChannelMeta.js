/** Channel / marketplace presentation for showcase (vitrine) chips on stock UI. */

const CHANNELS = {
  mercadolivre: { label: 'ML', icon: 'shopping', color: '#FFE600', textColor: '#333' },
  mercado_livre: { label: 'ML', icon: 'shopping', color: '#FFE600', textColor: '#333' },
  ifood: { label: 'iFood', icon: 'moped', color: '#EA1D2C', textColor: '#fff' },
  '99food': { label: '99', icon: 'motorbike', color: '#FFDD00', textColor: '#333' },
  food99: { label: '99', icon: 'motorbike', color: '#FFDD00', textColor: '#333' },
  shop: { label: 'Shop', icon: 'storefront-outline', color: '#0EA5E9', textColor: '#fff' },
  shopee: { label: 'Shopee', icon: 'shopping-outline', color: '#EE4D2D', textColor: '#fff' },
  amazon: { label: 'Amazon', icon: 'amazon', color: '#FF9900', textColor: '#111' },
  magalu: { label: 'Magalu', icon: 'store', color: '#0086FF', textColor: '#fff' },
  magazine_luiza: { label: 'Magalu', icon: 'store', color: '#0086FF', textColor: '#fff' },
};

export function normalizeIntegrationKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function getShowcaseChannelMeta(showcase) {
  const key = normalizeIntegrationKey(showcase?.integrationKey || showcase?.integration_key);
  const preset = CHANNELS[key] || {
    label: (showcase?.name || key || 'Canal').slice(0, 12),
    icon: 'storefront-outline',
    color: '#E2E8F0',
    textColor: '#334155',
  };
  return {
    ...preset,
    key: key || 'unknown',
    name: showcase?.name || preset.label,
    id: showcase?.id,
  };
}

/** Build map inventoryId -> showcases[] from product_showcases collection. */
export function buildInventoryShowcaseMap(showcases) {
  const map = {};
  (showcases || []).forEach(sc => {
    if (!sc || sc.active === false) return;
    const inventories = sc.inventories || sc.inventory || [];
    const list = Array.isArray(inventories) ? inventories : [];
    list.forEach(inv => {
      const id =
        typeof inv === 'string'
          ? (inv.match(/\/(\d+)(?:\?.*)?$/) || [])[1]
          : inv?.id != null
            ? String(inv.id)
            : null;
      if (!id) return;
      if (!map[id]) map[id] = [];
      map[id].push(sc);
    });
  });
  return map;
}
